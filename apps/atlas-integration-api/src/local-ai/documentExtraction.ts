/**
 * Safe local document extraction + OCR (Phase 4B-1).
 * Never executes macros/scripts/external links. OCR via local tesseract CLI.
 */

import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import {
  DEFAULT_MAX_OCR_PAGES,
  DEFAULT_MAX_IMAGE_PIXELS,
  OCR_ENGINE_NAME,
  classifyOcrConfidence,
  type ExtractionSummary,
  type OcrRunSummary,
  type PageTextBlock,
} from '@hvcg/atlas-integration-core';

const require = createRequire(import.meta.url);

export interface ExtractOptions {
  maxOcrPages?: number;
  ocrTimeoutMs?: number;
  signal?: AbortSignal;
  forceOcr?: boolean;
}

function runCmd(
  cmd: string,
  args: string[],
  opts?: { timeoutMs?: number; signal?: AbortSignal },
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer =
      opts?.timeoutMs && opts.timeoutMs > 0
        ? setTimeout(() => {
            child.kill('SIGKILL');
            reject(Object.assign(new Error(`${cmd} timed out`), { code: 'timeout' }));
          }, opts.timeoutMs)
        : null;
    const onAbort = () => {
      child.kill('SIGKILL');
      reject(Object.assign(new Error(`${cmd} cancelled`), { code: 'cancelled' }));
    };
    opts?.signal?.addEventListener('abort', onAbort);
    child.stdout.on('data', (d) => {
      stdout += String(d);
    });
    child.stderr.on('data', (d) => {
      stderr += String(d);
    });
    child.on('error', (err) => {
      if (timer) clearTimeout(timer);
      opts?.signal?.removeEventListener('abort', onAbort);
      reject(err);
    });
    child.on('close', (code) => {
      if (timer) clearTimeout(timer);
      opts?.signal?.removeEventListener('abort', onAbort);
      resolve({ stdout, stderr, code: code ?? 1 });
    });
  });
}

export async function getTesseractVersion(): Promise<string> {
  try {
    const r = await runCmd('tesseract', ['--version'], { timeoutMs: 5_000 });
    const line = (r.stderr || r.stdout).split('\n')[0] || 'tesseract unknown';
    return line.trim();
  } catch {
    return 'tesseract unavailable';
  }
}

async function detectOrientationDegrees(imagePath: string, opts?: ExtractOptions): Promise<number> {
  try {
    const r = await runCmd('tesseract', [imagePath, 'stdout', '--psm', '0'], {
      timeoutMs: 30_000,
      signal: opts?.signal,
    });
    const m = (r.stdout || r.stderr).match(/Rotate:\s*(\d+)/i);
    return m ? Number(m[1]) : 0;
  } catch {
    return 0;
  }
}

async function preprocessImageForOcr(
  imagePath: string,
  opts?: ExtractOptions,
): Promise<{ path: string; preprocessing: string[]; original: { width: number; height: number } | null; processed: { width: number; height: number } | null; tmpDir: string }> {
  const preprocessing: string[] = [];
  const tmpDir = mkdtempSync(join(tmpdir(), 'ocr-prep-'));
  let current = imagePath;
  let original: { width: number; height: number } | null = null;
  let processed: { width: number; height: number } | null = null;

  // Dimensions via sips
  try {
    const dim = await runCmd('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', current], {
      timeoutMs: 10_000,
      signal: opts?.signal,
    });
    const w = Number((dim.stdout.match(/pixelWidth:\s*(\d+)/) || [])[1] || 0);
    const h = Number((dim.stdout.match(/pixelHeight:\s*(\d+)/) || [])[1] || 0);
    if (w && h) original = { width: w, height: h };
  } catch {
    /* ignore */
  }

  const rotate = await detectOrientationDegrees(current, opts);
  if (rotate && rotate !== 0) {
    const rotated = join(tmpDir, 'rotated.png');
    await runCmd('sips', ['--rotate', String(rotate), current, '--out', rotated], {
      timeoutMs: 30_000,
      signal: opts?.signal,
    });
    current = rotated;
    preprocessing.push(`rotate_${rotate}`);
  }

  // Grayscale + normalize contrast via sips
  const gray = join(tmpDir, 'gray.png');
  try {
    await runCmd('sips', ['-s', 'format', 'png', '-s', 'formatOptions', 'default', current, '--out', gray], {
      timeoutMs: 30_000,
      signal: opts?.signal,
    });
    // macOS sips doesn't do true deskew; mark as grayscale/normalize attempt
    await runCmd('sips', ['--matchTo', '/System/Library/ColorSync/Profiles/Generic Gray Profile.icc', gray, '--out', gray], {
      timeoutMs: 30_000,
      signal: opts?.signal,
    }).catch(() => undefined);
    current = gray;
    preprocessing.push('grayscale', 'contrast_normalize_attempt', 'deskew_unavailable_sips');
  } catch {
    preprocessing.push('preprocess_skipped');
  }

  // Resolution normalize: if very large, downsample
  if (original && original.width * original.height > 8_000_000) {
    const scaled = join(tmpDir, 'scaled.png');
    await runCmd('sips', ['--resampleWidth', '2000', current, '--out', scaled], {
      timeoutMs: 30_000,
      signal: opts?.signal,
    });
    current = scaled;
    preprocessing.push('resolution_normalize');
  }

  try {
    const dim2 = await runCmd('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', current], {
      timeoutMs: 10_000,
      signal: opts?.signal,
    });
    const w = Number((dim2.stdout.match(/pixelWidth:\s*(\d+)/) || [])[1] || 0);
    const h = Number((dim2.stdout.match(/pixelHeight:\s*(\d+)/) || [])[1] || 0);
    if (w && h) processed = { width: w, height: h };
  } catch {
    /* ignore */
  }

  return { path: current, preprocessing, original, processed, tmpDir };
}

function parseTsvConfidence(tsv: string): { avg: number | null; lowRegions: string[] } {
  const lines = tsv.split(/\r?\n/).slice(1);
  const confs: number[] = [];
  const lowRegions: string[] = [];
  for (const line of lines) {
    const cols = line.split('\t');
    if (cols.length < 12) continue;
    const conf = Number(cols[10]);
    const text = cols[11] || '';
    if (!Number.isFinite(conf) || conf < 0) continue;
    if (!text.trim()) continue;
    confs.push(conf / 100);
    if (conf < 50) lowRegions.push(text.slice(0, 40));
  }
  if (!confs.length) return { avg: null, lowRegions };
  return { avg: confs.reduce((a, b) => a + b, 0) / confs.length, lowRegions: lowRegions.slice(0, 20) };
}

async function ocrImageFile(
  imagePath: string,
  opts?: ExtractOptions,
): Promise<{
  text: string;
  confidence: number | null;
  preprocessing: string[];
  originalDimensions: { width: number; height: number } | null;
  processedDimensions: { width: number; height: number } | null;
  retryCount: number;
  failedRegions: string[];
  wordLevelConfidenceAvailable: boolean;
}> {
  const prep = await preprocessImageForOcr(imagePath, opts);
  const outBase = join(mkdtempSync(join(tmpdir(), 'ocr-out-')), 'out');
  let retryCount = 0;
  try {
    let r = await runCmd(
      'tesseract',
      [prep.path, outBase, '-l', 'eng', '--psm', '3', 'tsv'],
      { timeoutMs: opts?.ocrTimeoutMs || 120_000, signal: opts?.signal },
    );
    if (r.code !== 0) {
      retryCount = 1;
      r = await runCmd(
        'tesseract',
        [prep.path, outBase, '-l', 'eng', '--psm', '6'],
        { timeoutMs: opts?.ocrTimeoutMs || 120_000, signal: opts?.signal },
      );
      if (r.code !== 0) {
        throw Object.assign(new Error(`tesseract failed: ${r.stderr}`), { code: 'ocr_failed' });
      }
    }
    const textPath = existsSync(`${outBase}.txt`) ? `${outBase}.txt` : null;
    const tsvPath = existsSync(`${outBase}.tsv`) ? `${outBase}.tsv` : null;
    // tesseract tsv mode writes .tsv; also try reading tsv as primary
    let text = textPath ? readFileSync(textPath, 'utf8') : '';
    let confidence: number | null = null;
    let failedRegions: string[] = [];
    let wordLevel = false;
    if (tsvPath) {
      const tsv = readFileSync(tsvPath, 'utf8');
      const parsed = parseTsvConfidence(tsv);
      confidence = parsed.avg;
      failedRegions = parsed.lowRegions;
      wordLevel = parsed.avg != null;
      if (!text.trim()) {
        // reconstruct from tsv words
        text = tsv
          .split(/\r?\n/)
          .slice(1)
          .map((l) => l.split('\t')[11] || '')
          .filter(Boolean)
          .join(' ');
      }
    }
    if (confidence == null) {
      confidence = text.trim() ? 0.55 : 0.15;
    }
    // Low confidence retry with PSM 4
    if (confidence < 0.45 && retryCount === 0) {
      retryCount = 1;
      const retryBase = join(mkdtempSync(join(tmpdir(), 'ocr-retry-')), 'out');
      const rr = await runCmd(
        'tesseract',
        [prep.path, retryBase, '-l', 'eng', '--psm', '4', 'tsv'],
        { timeoutMs: opts?.ocrTimeoutMs || 120_000, signal: opts?.signal },
      );
      if (rr.code === 0 && existsSync(`${retryBase}.tsv`)) {
        const parsed = parseTsvConfidence(readFileSync(`${retryBase}.tsv`, 'utf8'));
        if ((parsed.avg || 0) > (confidence || 0)) {
          confidence = parsed.avg;
          failedRegions = parsed.lowRegions;
          wordLevel = true;
          if (existsSync(`${retryBase}.txt`)) text = readFileSync(`${retryBase}.txt`, 'utf8');
        }
      }
      try {
        rmSync(join(retryBase, '..'), { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
    return {
      text,
      confidence,
      preprocessing: prep.preprocessing,
      originalDimensions: prep.original,
      processedDimensions: prep.processed,
      retryCount,
      failedRegions,
      wordLevelConfidenceAvailable: wordLevel,
    };
  } finally {
    try {
      rmSync(join(outBase, '..'), { recursive: true, force: true });
    } catch {
      /* ignore */
    }
    try {
      rmSync(prep.tmpDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

async function pdfToPngPages(
  pdfPath: string,
  maxPages: number,
  signal?: AbortSignal,
): Promise<string[]> {
  const dir = mkdtempSync(join(tmpdir(), 'pdf-pages-'));
  await runCmd(
    'pdftoppm',
    ['-png', '-f', '1', '-l', String(maxPages), '-r', '150', pdfPath, join(dir, 'page')],
    { timeoutMs: 180_000, signal },
  );
  return readdirSync(dir)
    .filter((n) => n.endsWith('.png'))
    .sort()
    .map((n) => join(dir, n));
}

async function extractPdfEmbeddedAsync(buf: Buffer): Promise<{ text: string; numpages: number }> {
  // pdf-parse v2: class-based API (no default function export)
  const { PDFParse } = require('pdf-parse') as {
    PDFParse: new (opts: { data: Uint8Array | Buffer }) => {
      getText: () => Promise<{ text?: string; total?: number; pages?: unknown[] }>;
      destroy: () => Promise<void>;
    };
  };
  const parser = new PDFParse({ data: buf });
  try {
    const data = await parser.getText();
    const text = (data.text || '')
      .replace(/\n-- \d+ of \d+ --\n/g, '\n')
      .trim();
    return { text, numpages: data.total || data.pages?.length || 0 };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/password|encrypt/i.test(msg)) {
      throw Object.assign(new Error('Password-protected PDF'), {
        status: 400,
        code: 'encrypted_pdf',
      });
    }
    throw err;
  } finally {
    try {
      await parser.destroy();
    } catch {
      /* ignore */
    }
  }
}

function extractDocx(buf: Buffer): Promise<{ text: string }> {
  const mammoth = require('mammoth') as {
    extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }>;
  };
  return mammoth.extractRawText({ buffer: buf }).then((r) => ({ text: r.value || '' }));
}

function extractXlsx(buf: Buffer): { text: string; warnings: string[] } {
  const XLSX = require('xlsx') as {
    read: (data: Buffer, opts: Record<string, unknown>) => {
      SheetNames: string[];
      Sheets: Record<string, unknown>;
    };
    utils: {
      sheet_to_csv: (sheet: unknown) => string;
    };
  };
  const warnings: string[] = [];
  const wb = XLSX.read(buf, {
    type: 'buffer',
    cellFormula: true,
    cellHTML: false,
    bookVBA: false,
    password: undefined,
  });
  warnings.push('Macros/VBA not executed; formulas exported as text only; workbook not altered');
  const parts: string[] = [`Sheets: ${wb.SheetNames.join(', ')}`];
  for (const name of wb.SheetNames.slice(0, 20)) {
    const sheet = wb.Sheets[name];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    parts.push(`--- sheet:${name} ---\n${csv.slice(0, 50_000)}`);
  }
  return { text: parts.join('\n'), warnings };
}

function extractTextLike(buf: Buffer, kind: 'csv' | 'txt'): { text: string; warnings: string[] } {
  const warnings: string[] = [];
  let text = buf.toString('utf8');
  if (text.includes('\uFFFD')) {
    text = buf.toString('latin1');
    warnings.push('Fell back to latin1 encoding');
  }
  if (kind === 'csv' && text.split(/\r?\n/).some((line) => /^[=+\-@]/.test(line.trim()))) {
    warnings.push('CSV cells beginning with =/+/-/@ treated as text only — no formula execution');
  }
  // neutralize formula-looking lines for safety display
  text = text
    .split(/\r?\n/)
    .map((line) => (/^[=+\-@]/.test(line) ? `'${line}` : line))
    .join('\n');
  return { text, warnings };
}

export async function extractDocument(opts: {
  extension: string;
  bytes: Buffer;
  absolutePath?: string;
  extractOpts?: ExtractOptions;
}): Promise<ExtractionSummary> {
  const ext = opts.extension.toLowerCase();
  const warnings: string[] = [];
  const pages: PageTextBlock[] = [];
  let method = 'unknown';
  let embeddedText = '';
  let ocrText = '';
  let pageCount: number | null = null;
  let encrypted = false;
  let ocrSummary: OcrRunSummary | null = null;
  const maxPages = opts.extractOpts?.maxOcrPages ?? DEFAULT_MAX_OCR_PAGES;

  if (opts.extractOpts?.signal?.aborted) {
    throw Object.assign(new Error('Extraction cancelled'), { code: 'cancelled', status: 409 });
  }

  if (ext === 'pdf') {
    method = 'pdf-parse+optional-tesseract';
    const embedded = await extractPdfEmbeddedAsync(opts.bytes);
    embeddedText = embedded.text;
    pageCount = embedded.numpages || null;
    const usable = embeddedText.replace(/\s+/g, ' ').trim().length;
    pages.push({
      page: 1,
      text: embeddedText.slice(0, 100_000),
      sourceKind: 'embedded',
      confidence: usable > 40 ? 0.85 : 0.2,
    });
    const needsOcr = opts.extractOpts?.forceOcr || usable < 40;
    if (needsOcr && opts.absolutePath) {
      const started = Date.now();
      const failedPages: number[] = [];
      let processed = 0;
      let skipped = 0;
      let confSum = 0;
      let cancelled = false;
      let timedOut = false;
      let preprocessingApplied: string[] = [];
      let wordLevel = false;
      try {
        const images = await pdfToPngPages(opts.absolutePath, maxPages, opts.extractOpts?.signal);
        skipped = Math.max(0, (pageCount || images.length) - images.length);
        const ocrParts: string[] = [];
        for (let i = 0; i < images.length; i++) {
          if (opts.extractOpts?.signal?.aborted) {
            cancelled = true;
            break;
          }
          try {
            const ocr = await ocrImageFile(images[i], opts.extractOpts);
            processed += 1;
            confSum += ocr.confidence || 0;
            ocrParts.push(ocr.text);
            preprocessingApplied = [...new Set([...preprocessingApplied, ...ocr.preprocessing])];
            wordLevel = wordLevel || ocr.wordLevelConfidenceAvailable;
            // Do not replace strong embedded text with weaker OCR on same page
            const embConf = pages.find((p) => p.page === i + 1 && p.sourceKind === 'embedded')?.confidence;
            if (embConf != null && embConf >= 0.7 && (ocr.confidence || 0) < embConf) {
              warnings.push(
                `Page ${i + 1}: kept embedded text over lower-confidence OCR (${ocr.confidence})`,
              );
            } else {
              pages.push({
                page: i + 1,
                text: ocr.text,
                sourceKind: 'ocr',
                confidence: ocr.confidence,
                confidenceBand: classifyOcrConfidence(ocr.confidence),
                preprocessing: ocr.preprocessing,
                originalDimensions: ocr.originalDimensions,
                processedDimensions: ocr.processedDimensions,
                retryCount: ocr.retryCount,
                failedRegions: ocr.failedRegions,
              });
            }
          } catch (err) {
            const code = (err as { code?: string }).code;
            if (code === 'cancelled') cancelled = true;
            if (code === 'timeout') timedOut = true;
            failedPages.push(i + 1);
          }
        }
        ocrText = ocrParts.join('\n\n');
        if (images[0]) {
          try {
            rmSync(join(images[0], '..'), { recursive: true, force: true });
          } catch {
            /* ignore */
          }
        }
      } catch (err) {
        warnings.push(`OCR pipeline error: ${err instanceof Error ? err.message : String(err)}`);
      }
      const avg = processed ? confSum / processed : null;
      ocrSummary = {
        engine: OCR_ENGINE_NAME,
        version: await getTesseractVersion(),
        pagesProcessed: processed,
        pagesSkipped: skipped,
        averageConfidence: avg,
        confidenceBand: classifyOcrConfidence(avg),
        failedPages,
        durationMs: Date.now() - started,
        cancelled,
        timedOut,
        preprocessingApplied,
        wordLevelConfidenceAvailable: wordLevel,
        disclaimer: 'OCR-derived text is not guaranteed accurate',
      };
    } else if (needsOcr) {
      warnings.push('OCR needed but absolute path unavailable for pdftoppm');
    }
  } else if (ext === 'docx') {
    method = 'mammoth-raw-text';
    const { text } = await extractDocx(opts.bytes);
    embeddedText = text;
    pageCount = 1;
    pages.push({ page: 1, text, sourceKind: 'embedded', confidence: 0.9 });
    warnings.push('Embedded objects/scripts not executed');
  } else if (ext === 'xlsx') {
    method = 'xlsx-sheet-csv-export';
    const { text, warnings: w } = extractXlsx(opts.bytes);
    embeddedText = text;
    warnings.push(...w);
    pageCount = 1;
    pages.push({ page: 1, text, sourceKind: 'embedded', confidence: 0.85 });
  } else if (ext === 'csv' || ext === 'txt') {
    method = ext === 'csv' ? 'csv-safe-parse' : 'txt-utf8';
    const { text, warnings: w } = extractTextLike(opts.bytes, ext);
    embeddedText = text;
    warnings.push(...w);
    pageCount = 1;
    pages.push({ page: 1, text, sourceKind: 'embedded', confidence: 0.95 });
  } else if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') {
    method = 'tesseract-image-ocr';
    if (opts.bytes.length > DEFAULT_MAX_IMAGE_PIXELS) {
      // size guard by bytes as proxy when pixels unknown
      warnings.push('Large image — OCR may be slow; size guardrail applied by file bytes');
    }
    const tmp = join(mkdtempSync(join(tmpdir(), 'img-')), `image.${ext}`);
    writeFileSync(tmp, opts.bytes);
    const started = Date.now();
    try {
      const ocr = await ocrImageFile(tmp, opts.extractOpts);
      ocrText = ocr.text;
      pageCount = 1;
      pages.push({
        page: 1,
        text: ocr.text,
        sourceKind: 'ocr',
        confidence: ocr.confidence,
        confidenceBand: classifyOcrConfidence(ocr.confidence),
        preprocessing: ocr.preprocessing,
        originalDimensions: ocr.originalDimensions,
        processedDimensions: ocr.processedDimensions,
        retryCount: ocr.retryCount,
        failedRegions: ocr.failedRegions,
      });
      ocrSummary = {
        engine: OCR_ENGINE_NAME,
        version: await getTesseractVersion(),
        pagesProcessed: 1,
        pagesSkipped: 0,
        averageConfidence: ocr.confidence,
        confidenceBand: classifyOcrConfidence(ocr.confidence),
        failedPages: [],
        durationMs: Date.now() - started,
        cancelled: false,
        timedOut: false,
        preprocessingApplied: ocr.preprocessing,
        wordLevelConfidenceAvailable: ocr.wordLevelConfidenceAvailable,
        disclaimer: 'OCR-derived text is not guaranteed accurate',
      };
    } finally {
      try {
        rmSync(join(tmp, '..'), { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  } else {
    throw Object.assign(new Error(`No extractor for .${ext}`), {
      status: 400,
      code: 'unsupported_file_type',
    });
  }

  return {
    method,
    embeddedTextChars: embeddedText.length,
    ocrTextChars: ocrText.length,
    pageCount,
    encryptedOrPasswordProtected: encrypted,
    warnings,
    pages,
    ocr: ocrSummary,
  };
}

export function combinedExtractedText(summary: ExtractionSummary): string {
  return summary.pages.map((p) => p.text).join('\n\n');
}

export function tesseractAvailableSync(): boolean {
  return existsSync('/opt/homebrew/bin/tesseract') || existsSync('/usr/local/bin/tesseract');
}
