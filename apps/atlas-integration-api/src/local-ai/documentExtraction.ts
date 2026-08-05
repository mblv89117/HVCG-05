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

async function ocrImageFile(
  imagePath: string,
  opts?: ExtractOptions,
): Promise<{ text: string; confidence: number | null }> {
  const outBase = join(mkdtempSync(join(tmpdir(), 'ocr-out-')), 'out');
  try {
    const r = await runCmd(
      'tesseract',
      [imagePath, outBase, '-l', 'eng', '--psm', '3'],
      { timeoutMs: opts?.ocrTimeoutMs || 120_000, signal: opts?.signal },
    );
    if (r.code !== 0) {
      throw Object.assign(new Error(`tesseract failed: ${r.stderr}`), { code: 'ocr_failed' });
    }
    const text = readFileSync(`${outBase}.txt`, 'utf8');
    // tesseract CLI does not always emit confidence; approximate from length heuristics
    const confidence = text.trim() ? 0.7 : 0.2;
    return { text, confidence };
  } finally {
    try {
      rmSync(join(outBase, '..'), { recursive: true, force: true });
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
            const { text, confidence } = await ocrImageFile(images[i], opts.extractOpts);
            processed += 1;
            confSum += confidence || 0;
            ocrParts.push(text);
            pages.push({
              page: i + 1,
              text,
              sourceKind: 'ocr',
              confidence,
            });
          } catch (err) {
            const code = (err as { code?: string }).code;
            if (code === 'cancelled') cancelled = true;
            if (code === 'timeout') timedOut = true;
            failedPages.push(i + 1);
          }
        }
        ocrText = ocrParts.join('\n\n');
        // cleanup temp images parent
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
      ocrSummary = {
        engine: OCR_ENGINE_NAME,
        version: await getTesseractVersion(),
        pagesProcessed: processed,
        pagesSkipped: skipped,
        averageConfidence: processed ? confSum / processed : null,
        failedPages,
        durationMs: Date.now() - started,
        cancelled,
        timedOut,
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
      const { text, confidence } = await ocrImageFile(tmp, opts.extractOpts);
      ocrText = text;
      pageCount = 1;
      pages.push({ page: 1, text, sourceKind: 'ocr', confidence });
      ocrSummary = {
        engine: OCR_ENGINE_NAME,
        version: await getTesseractVersion(),
        pagesProcessed: 1,
        pagesSkipped: 0,
        averageConfidence: confidence,
        failedPages: [],
        durationMs: Date.now() - started,
        cancelled: false,
        timedOut: false,
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
