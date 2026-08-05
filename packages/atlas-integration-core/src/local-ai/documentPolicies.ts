/**
 * Deterministic draft classification, naming, folder, and field heuristics (Phase 4B-1).
 * Model may refine later; rules never treat values as authoritative.
 */

import {
  DOCUMENT_CLASSIFICATIONS,
  type DocumentClassification,
  type DocumentClassificationResult,
  type DuplicateDetectionResult,
  type ExtractedField,
  type FolderRecommendation,
  type NamingRecommendation,
  type PageTextBlock,
} from './documentIntake.ts';

const DATE_RE =
  /\b(?:\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}|\d{4}-\d{2}-\d{2})\b/gi;
const AMOUNT_RE =
  /\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\b\d+(?:\.\d+)?\s*(?:USD|million|billion)\b/gi;
const OBLIGATION_RE =
  /\b(shall|must|agree(?:s|d)? to|obligat(?:e|ion)|deliver(?:y|ables)?|due upon|payment due)\b/gi;

function uniq(items: string[], limit = 30): string[] {
  return [...new Set(items.map((s) => s.trim()).filter(Boolean))].slice(0, limit);
}

function scoreType(text: string, type: DocumentClassification, patterns: RegExp[]): number {
  let hits = 0;
  for (const re of patterns) {
    if (re.test(text)) hits += 1;
  }
  return Math.min(0.95, hits * 0.22);
}

export function classifyDocumentDraft(text: string): DocumentClassificationResult {
  const lower = text.toLowerCase();
  const scores: Array<{ type: DocumentClassification; confidence: number }> = [];
  const rules: Array<[DocumentClassification, RegExp[]]> = [
    ['invoice', [/\binvoice\b/i, /\bamount due\b/i, /\binvoice number\b/i]],
    ['bank_statement', [/\bbank statement\b/i, /\bending balance\b/i, /\baccount ending\b/i]],
    ['tax_document', [/\bform 1040\b/i, /\bw-?2\b/i, /\btax return\b/i]],
    ['lease', [/\blease agreement\b/i, /\blessor\b/i, /\blessee\b/i]],
    ['purchase_agreement', [/\bpurchase agreement\b/i, /\bbuyer\b/i, /\bseller\b/i]],
    ['agreement', [/\bagreement\b/i, /\bparty a\b/i, /\bgoverning law\b/i]],
    ['proposal', [/\bproposal\b/i, /\bscope of work\b/i]],
    ['lender_request', [/\blender\b/i, /\bcommitment letter\b/i, /\bloan request\b/i]],
    ['meeting_notes', [/\bmeeting notes\b/i, /\bagenda\b/i, /\baction items\b/i]],
    ['financial_statement', [/\bbalance sheet\b/i, /\bincome statement\b/i]],
    ['insurance_document', [/\binsurance\b/i, /\bpolicy number\b/i]],
    ['identification_document', [/\bdriver.?s? license\b/i, /\bpassport\b/i]],
    ['client_intake', [/\bclient intake\b/i, /\bintake form\b/i]],
    ['correspondence', [/\bdear\b/i, /\bsincerely\b/i]],
    ['marketing_asset', [/\bbrochure\b/i, /\bmarketing\b/i]],
    ['operating_document', [/\boperating agreement\b/i, /\bSOP\b/]],
  ];
  for (const [type, patterns] of rules) {
    const confidence = scoreType(lower, type, patterns);
    if (confidence > 0) scores.push({ type, confidence });
  }
  scores.sort((a, b) => b.confidence - a.confidence);
  const top = scores[0] || { type: 'unknown' as const, confidence: 0.2 };
  return {
    proposedType: top.type,
    confidence: top.confidence,
    alternatives: scores.slice(1, 4),
    evidence: scores.slice(0, 3).map((s) => `${s.type}:${s.confidence.toFixed(2)}`),
    mannyReviewRequired: true,
  };
}

export function extractStructuredFieldsDraft(text: string, pages: PageTextBlock[]): ExtractedField[] {
  const dates = uniq(text.match(DATE_RE) || []);
  const amounts = uniq(text.match(AMOUNT_RE) || []);
  const obligations = uniq([...text.matchAll(OBLIGATION_RE)].map((m) => m[0]));
  const fields: ExtractedField[] = [];
  const push = (key: string, value: string | null, page: number | null, kind: 'embedded' | 'ocr') => {
    if (value == null || value === '') return;
    fields.push({
      key,
      value,
      confidence: kind === 'ocr' ? 0.55 : 0.7,
      sourcePage: page,
      sourceKind: kind,
      notes: 'Draft extraction — not authoritative',
    });
  };
  dates.slice(0, 8).forEach((d, i) => push(`date_${i + 1}`, d, pages[0]?.page ?? 1, pages[0]?.sourceKind === 'ocr' ? 'ocr' : 'embedded'));
  amounts.slice(0, 8).forEach((a, i) => push(`amount_${i + 1}`, a, pages[0]?.page ?? 1, 'embedded'));
  obligations.slice(0, 8).forEach((o, i) => push(`obligation_${i + 1}`, o, pages[0]?.page ?? 1, 'embedded'));
  push(
    'signatures_present',
    /\b(signature|signed by|\/s\/)\b/i.test(text) ? 'true' : 'false',
    null,
    'embedded',
  );
  push(
    'page_count',
    pages.length ? String(Math.max(...pages.map((p) => p.page))) : null,
    null,
    'embedded',
  );
  return fields;
}

export function recommendFilename(opts: {
  originalFilename: string;
  clientLabel: string;
  documentType: DocumentClassification;
  documentDate?: string | null;
  counterparty?: string | null;
  project?: string | null;
  version?: string | null;
  status?: string | null;
}): NamingRecommendation {
  const missing: string[] = [];
  const client = slug(opts.clientLabel) || (missing.push('client'), 'UnknownClient');
  const type = opts.documentType || (missing.push('document_type'), 'unknown');
  const date = opts.documentDate || (missing.push('document_date'), 'Undated');
  const parts = [client, date, type];
  if (opts.counterparty) parts.push(slug(opts.counterparty));
  if (opts.project) parts.push(slug(opts.project));
  if (opts.version) parts.push(`v${slug(opts.version)}`);
  if (opts.status) parts.push(slug(opts.status));
  const ext = opts.originalFilename.includes('.')
    ? opts.originalFilename.slice(opts.originalFilename.lastIndexOf('.'))
    : '';
  const proposed = `${parts.join('_')}${ext}`;
  return {
    originalFilename: opts.originalFilename,
    proposedFilename: proposed,
    reason: 'HVCG draft naming policy: Client_Date_Type[_Counterparty][_Project][_Version][_Status]',
    missingNamingElements: missing,
    collisionOrDuplicateWarning: null,
    fileRenamed: false,
  };
}

export function recommendFolder(opts: {
  clientLabel: string;
  documentType: DocumentClassification;
  project?: string | null;
}): FolderRecommendation {
  const client = opts.clientLabel || 'Unknown Client';
  const workspace = 'HVCG Client Files';
  const typeFolder = folderForType(opts.documentType);
  const project = opts.project ? `/${opts.project}` : '';
  const path = `${workspace}/${client}${project}/${typeFolder}`;
  const missing: string[] = [];
  if (!opts.clientLabel) missing.push('client');
  if (!opts.project) missing.push('project');
  return {
    proposedClient: client,
    proposedWorkspace: workspace,
    proposedFolderPath: path,
    confidence: opts.clientLabel ? 0.7 : 0.35,
    alternativePaths: [`${workspace}/${client}/Inbox`, `${workspace}/_Unsorted`],
    reason: 'Draft filing recommendation from HVCG folder standard — file not moved',
    missingContext: missing,
    fileMoved: false,
  };
}

export function detectDuplicateDraft(opts: {
  checksum: string;
  originalFilename: string;
  text: string;
  pageCount: number | null;
  prior: Array<{
    stagedFileId: string;
    checksumSha256: string;
    originalFilename: string;
    textSample: string;
    pageCount: number | null;
  }>;
}): DuplicateDetectionResult {
  for (const p of opts.prior) {
    if (p.checksumSha256 === opts.checksum) {
      return {
        status: 'exact_duplicate',
        matchedStagedFileId: p.stagedFileId,
        matchedChecksum: p.checksumSha256,
        reasons: ['Identical SHA-256 checksum'],
        fileDeleted: false,
      };
    }
  }
  const norm = normalizeName(opts.originalFilename);
  for (const p of opts.prior) {
    if (normalizeName(p.originalFilename) === norm) {
      return {
        status: 'probable_duplicate',
        matchedStagedFileId: p.stagedFileId,
        matchedChecksum: p.checksumSha256,
        reasons: ['Normalized filename match'],
        fileDeleted: false,
      };
    }
    if (
      opts.pageCount &&
      p.pageCount &&
      opts.pageCount === p.pageCount &&
      similar(opts.text.slice(0, 800), p.textSample.slice(0, 800))
    ) {
      return {
        status: 'prior_version',
        matchedStagedFileId: p.stagedFileId,
        matchedChecksum: p.checksumSha256,
        reasons: ['Similar extracted text and matching page count'],
        fileDeleted: false,
      };
    }
  }
  return {
    status: opts.prior.length ? 'unique' : 'unable_to_determine',
    matchedStagedFileId: null,
    matchedChecksum: null,
    reasons: opts.prior.length ? ['No checksum/filename/text collision found'] : ['No prior staged corpus'],
    fileDeleted: false,
  };
}

export function listDatesAmountsDeadlinesObligations(text: string) {
  return {
    dates: uniq(text.match(DATE_RE) || []),
    amounts: uniq(text.match(AMOUNT_RE) || []),
    deadlines: uniq(
      [...text.matchAll(/\b(deadline|due date|expires?\s+on|maturity)\b[^\n.]{0,40}/gi)].map(
        (m) => m[0],
      ),
    ),
    obligations: uniq([...text.matchAll(OBLIGATION_RE)].map((m) => m[0])),
  };
}

export function isDeepDocumentType(type: DocumentClassification): boolean {
  return (
    type === 'agreement' ||
    type === 'lease' ||
    type === 'purchase_agreement' ||
    type === 'lender_request' ||
    type === 'financial_statement' ||
    type === 'tax_document'
  );
}

function slug(s: string): string {
  return s
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

function folderForType(type: DocumentClassification): string {
  switch (type) {
    case 'invoice':
      return '01_Financial/Invoices';
    case 'bank_statement':
      return '01_Financial/Bank Statements';
    case 'agreement':
    case 'lease':
    case 'purchase_agreement':
      return '02_Legal/Agreements';
    case 'meeting_notes':
      return '03_Meetings/Notes';
    case 'lender_request':
      return '01_Financial/Lender';
    default:
      return '00_Inbox/Unclassified';
  }
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, '');
}

function similar(a: string, b: string): boolean {
  if (!a || !b) return false;
  const na = a.toLowerCase().replace(/\s+/g, ' ').slice(0, 400);
  const nb = b.toLowerCase().replace(/\s+/g, ' ').slice(0, 400);
  if (na === nb) return true;
  let shared = 0;
  const words = new Set(na.split(' '));
  for (const w of nb.split(' ')) if (words.has(w)) shared += 1;
  return shared / Math.max(words.size, 1) > 0.7;
}

export { DOCUMENT_CLASSIFICATIONS };
