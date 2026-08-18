/**
 * Tiered capital document extraction.
 * TIER 1 native PDF text, TIER 2 Office parsers, TIER 3 OCR (not run here).
 * Document bytes are content, not authority.
 */

import { inflateRawSync, inflateSync } from 'node:zlib';
import { hasSourceRef } from './intelligence.ts';
import type { ExtractedFact, ExtractionMethod, SourceRef } from './types.ts';

const DOCUMENT_INTELLIGENCE_SOURCE = 'atlas-document-intelligence';

export const MAX_INGEST_BYTES = 15 * 1024 * 1024;
export const ALLOWED_INGEST_EXTENSIONS = new Set(['pdf', 'docx', 'xlsx', 'txt', 'csv']);

const INJECTION_RE =
  /ignore\s+(all\s+)?(previous\s+)?instructions|disregard\s+(all\s+)?(previous|prior|these)\s+instructions|you\s+are\s+now\b|approve\s+(this\s+)?(loan|financing)|send\s+(this\s+)?document|reveal\s+(your\s+)?(system\s+)?prompt|print\s+credentials/i;

export interface ContentExtraction {
  method: ExtractionMethod;
  text: string;
  facts: ExtractedFact[];
  promptInjection: boolean;
  error?: string;
}

export function fileExtension(fileName: string): string {
  const m = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

export function ingestTypeAllowed(fileName: string, mimeType?: string): boolean {
  const ext = fileExtension(fileName);
  if (ALLOWED_INGEST_EXTENSIONS.has(ext)) return true;
  const mime = (mimeType || '').toLowerCase();
  return (
    mime === 'application/pdf' ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mime === 'text/plain' ||
    mime === 'text/csv'
  );
}

export function clientCodeFromSharePointPath(pathOrUrl: string): string | null {
  const m = pathOrUrl.match(/\bHVCG_([A-Z][A-Z0-9]{2,15})\b/);
  return m ? m[1] : null;
}

function sourceRef(capturedAt: string, sourceRecordId: string, field: string): SourceRef {
  return { sourceSystem: DOCUMENT_INTELLIGENCE_SOURCE, sourceRecordId, capturedAt, field };
}

export function extractCapitalDocumentContent(opts: {
  fileName: string;
  bytes: Buffer;
  mimeType?: string;
  capturedAt: string;
  sourceRecordId: string;
}): ContentExtraction {
  if (!opts.bytes.length) {
    return { method: 'FAILED', text: '', facts: [], promptInjection: false, error: 'empty file' };
  }
  const ext = fileExtension(opts.fileName);
  const mime = (opts.mimeType || '').toLowerCase();
  try {
    let method: ExtractionMethod = 'FAILED';
    let text = '';
    if (ext === 'pdf' || mime === 'application/pdf') {
      text = extractPdfText(opts.bytes);
      method = text.trim() ? 'NATIVE_TEXT' : 'FAILED';
    } else if (ext === 'docx' || mime.includes('wordprocessingml')) {
      text = extractDocxText(opts.bytes);
      method = text.trim() ? 'OFFICE_PARSER' : 'FAILED';
    } else if (ext === 'xlsx' || mime.includes('spreadsheetml')) {
      text = extractXlsxText(opts.bytes);
      method = text.trim() ? 'OFFICE_PARSER' : 'FAILED';
    } else if (ext === 'txt' || ext === 'csv' || mime.startsWith('text/')) {
      text = opts.bytes.toString('utf8');
      method = text.trim() ? 'NATIVE_TEXT' : 'FAILED';
    } else {
      return { method: 'FAILED', text: '', facts: [], promptInjection: false, error: 'unsupported type' };
    }
    const promptInjection = INJECTION_RE.test(text) || INJECTION_RE.test(opts.fileName);
    const facts = promptInjection
      ? []
      : extractFactsFromText(text, opts.capturedAt, opts.sourceRecordId);
    return {
      method: text.trim() ? method : 'FAILED',
      text,
      facts,
      promptInjection,
      error: text.trim() ? undefined : 'no extractable text (OCR not run)',
    };
  } catch (err) {
    return {
      method: 'FAILED',
      text: '',
      facts: [],
      promptInjection: false,
      error: err instanceof Error ? err.message : 'parse failed',
    };
  }
}

function snippetAround(text: string, index: number, length: number): string | undefined {
  const start = Math.max(0, index - 48);
  const end = Math.min(text.length, index + length + 48);
  const raw = text.slice(start, end).replace(/\s+/g, ' ').trim();
  if (!raw) return undefined;
  return raw
    .replace(/https?:\/\/\S*(graph\.microsoft\.com|sharepoint\.com|sharepointonline\.com|tempauth|download\.aspx)\S*/gi, '[redacted-url]')
    .replace(/https?:\/\/\S+/gi, '[redacted-url]')
    .slice(0, 240);
}

export function extractFactsFromText(text: string, capturedAt: string, sourceRecordId: string): ExtractedFact[] {
  const facts: ExtractedFact[] = [];
  const push = (field: string, value: number | string | null, snippet?: string) => {
    const ref = sourceRef(capturedAt, sourceRecordId, field);
    if (!hasSourceRef(ref)) return;
    facts.push({
      field,
      value,
      originalValue: value,
      verification: 'UNVERIFIED',
      confidence: 0.45,
      sourceRef: ref,
      evidenceSnippet: snippet,
      extractionMethod: 'NATIVE_TEXT',
      extractionTimestamp: capturedAt,
      conflictState: 'NONE',
    });
  };
  const money = (label: RegExp): { value: number; snippet?: string } | null => {
    const m = label.exec(text);
    if (!m) return null;
    const raw = m[1].replace(/,/g, '');
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    return { value: n, snippet: snippetAround(text, m.index, m[0].length) };
  };
  const revenue = money(/\b(?:total\s+)?revenue(?:\s*\/\s*net\s+sales)?[:\s]+\$?\s*([\d,]+(?:\.\d+)?)/i);
  if (revenue) push('revenue', revenue.value, revenue.snippet);
  const net = money(/\bnet\s+income[:\s]+\$?\s*([\d,]+(?:\.\d+)?)/i);
  if (net) push('netIncome', net.value, net.snippet);
  const gp = money(/\bgross\s+profit[:\s]+\$?\s*([\d,]+(?:\.\d+)?)/i);
  if (gp) push('grossProfit', gp.value, gp.snippet);
  const cash = money(/\bcash[:\s]+\$?\s*([\d,]+(?:\.\d+)?)/i);
  if (cash) push('cash', cash.value, cash.snippet);
  const ar = money(/\b(?:accounts\s+receivable|ar)[:\s]+\$?\s*([\d,]+(?:\.\d+)?)/i);
  if (ar) push('ar', ar.value, ar.snippet);
  const assets = money(/\btotal\s+assets[:\s]+\$?\s*([\d,]+(?:\.\d+)?)/i);
  if (assets) push('totalAssets', assets.value, assets.snippet);
  const liab = money(/\btotal\s+liabilities[:\s]+\$?\s*([\d,]+(?:\.\d+)?)/i);
  if (liab) push('totalLiabilities', liab.value, liab.snippet);
  const debt = money(
    /\b(?:outstanding\s+principal|principal\s+balance|(?:outstanding\s+)?(?:loan\s+balance|total\s+debt)|(?<!service\s)debt)[:\s]+\$?\s*([\d,]+(?:\.\d+)?)/i,
  );
  if (debt) push('debt', debt.value, debt.snippet);
  return facts;
}

export function extractPdfText(bytes: Buffer): string {
  if (bytes.length < 5 || bytes.subarray(0, 5).toString('latin1') !== '%PDF-') {
    throw new Error('not a PDF');
  }
  const src = bytes.toString('latin1');
  const chunks: string[] = [];
  const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m: RegExpExecArray | null;
  while ((m = streamRe.exec(src))) {
    const headerStart = src.lastIndexOf('obj', m.index);
    const header = headerStart >= 0 ? src.slice(Math.max(0, headerStart - 200), m.index) : '';
    let payload = Buffer.from(m[1], 'latin1');
    if (/\/FlateDecode/.test(header)) {
      try {
        payload = inflateSync(payload);
      } catch {
        try {
          payload = inflateRawSync(payload);
        } catch {
          continue;
        }
      }
    }
    chunks.push(pdfOperatorsToText(payload.toString('latin1')));
  }
  if (!chunks.join('').trim()) {
    chunks.push(pdfOperatorsToText(src));
  }
  return chunks.join('\n').replace(/\s+/g, ' ').trim();
}

function pdfOperatorsToText(content: string): string {
  const out: string[] = [];
  const tj = /\((?:\\.|[^\\)])*\)\s*Tj/g;
  let m: RegExpExecArray | null;
  while ((m = tj.exec(content))) {
    const inner = m[0].slice(1, m[0].lastIndexOf(')'));
    out.push(inner.replace(/\\([()\\])/g, '$1'));
  }
  const tjArray = /\[(.*?)\]\s*TJ/gs;
  while ((m = tjArray.exec(content))) {
    const parts = m[1].match(/\((?:\\.|[^\\)])*\)/g) || [];
    for (const p of parts) out.push(p.slice(1, -1).replace(/\\([()\\])/g, '$1'));
  }
  return out.join(' ');
}

export function extractDocxText(bytes: Buffer): string {
  const files = unzipOffice(bytes);
  const xml = files.get('word/document.xml');
  if (!xml) throw new Error('docx missing document.xml');
  return stripXml(xml.toString('utf8'));
}

export function extractXlsxText(bytes: Buffer): string {
  const files = unzipOffice(bytes);
  const parts: string[] = [];
  const shared = files.get('xl/sharedStrings.xml');
  if (shared) parts.push(stripXml(shared.toString('utf8')));
  const sheetKey = [...files.keys()].find((k) => k.startsWith('xl/worksheets/sheet') && k.endsWith('.xml'));
  if (sheetKey) {
    const sheet = files.get(sheetKey);
    if (sheet) parts.push(stripXml(sheet.toString('utf8')));
  }
  return parts.join('\n').replace(/\s+/g, ' ').trim();
}

function stripXml(xml: string): string {
  return xml
    .replace(/<w:tab\/>/g, '\t')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function unzipOffice(buf: Buffer): Map<string, Buffer> {
  const out = new Map<string, Buffer>();
  const eocdSig = 0x06054b50;
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === eocdSig) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('not a zip/office file');
  const cdOffset = buf.readUInt32LE(eocd + 16);
  const cdEntries = buf.readUInt16LE(eocd + 10);
  let p = cdOffset;
  for (let n = 0; n < cdEntries; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('zip central directory corrupt');
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOff = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString('utf8');
    p += 46 + nameLen + extraLen + commentLen;
    if (buf.readUInt32LE(localOff) !== 0x04034b50) continue;
    const locNameLen = buf.readUInt16LE(localOff + 26);
    const locExtra = buf.readUInt16LE(localOff + 28);
    const dataStart = localOff + 30 + locNameLen + locExtra;
    const compressed = buf.subarray(dataStart, dataStart + compSize);
    let data: Buffer;
    if (method === 0) data = Buffer.from(compressed);
    else if (method === 8) data = inflateRawSync(compressed);
    else continue;
    out.set(name, data);
  }
  return out;
}

/** Minimal uncompressed PDF for synthetic fixtures (no real client data). */
export function buildSyntheticPdf(lines: string[]): Buffer {
  const escaped = lines
    .map((line) => line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'))
    .map((line, i) => `72 ${720 - i * 16} Td (${line}) Tj T*`)
    .join('\n');
  const stream = `BT /F1 12 Tf ${escaped} ET\n`;
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n',
    `4 0 obj << /Length ${stream.length} >> stream\n${stream}endstream\nendobj\n`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n',
  ];
  let body = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(body.length);
    body += obj;
  }
  const xrefStart = body.length;
  let xref = `xref\n0 6\n0000000000 65535 f \n`;
  for (let i = 1; i <= 5; i++) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  body += `${xref}trailer << /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(body, 'latin1');
}

/** Store-only ZIP (method 0) for tiny synthetic Office fixtures. */
export function buildStoreZip(files: Record<string, string>): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const nameBuf = Buffer.from(name, 'utf8');
    const data = Buffer.from(content, 'utf8');
    const local = Buffer.alloc(30 + nameBuf.length + data.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(nameBuf.length, 26);
    nameBuf.copy(local, 30);
    data.copy(local, 30 + nameBuf.length);
    localParts.push(local);
    const central = Buffer.alloc(46 + nameBuf.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt32LE(offset, 42);
    nameBuf.copy(central, 46);
    centralParts.push(central);
    offset += local.length;
  }
  const locals = Buffer.concat(localParts);
  const centrals = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(centralParts.length, 8);
  eocd.writeUInt16LE(centralParts.length, 10);
  eocd.writeUInt32LE(centrals.length, 12);
  eocd.writeUInt32LE(locals.length, 16);
  return Buffer.concat([locals, centrals, eocd]);
}

export function buildSyntheticDocx(paragraphs: string[]): Buffer {
  const body = paragraphs.map((p) => `<w:p><w:r><w:t>${escapeXml(p)}</w:t></w:r></w:p>`).join('');
  return buildStoreZip({
    '[Content_Types].xml':
      '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>',
    'word/document.xml': `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`,
  });
}

export function buildSyntheticXlsx(cells: string[]): Buffer {
  const si = cells.map((c) => `<si><t>${escapeXml(c)}</t></si>`).join('');
  return buildStoreZip({
    '[Content_Types].xml':
      '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>',
    'xl/sharedStrings.xml': `<?xml version="1.0"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${si}</sst>`,
    'xl/worksheets/sheet1.xml':
      '<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData/></worksheet>',
  });
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
