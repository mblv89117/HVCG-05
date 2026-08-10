/**
 * Document review pack schema — draft extraction structure (Phase 3).
 */

import type { SensitivityLevel } from './contentPack.ts';

export interface DocumentReviewPack {
  schemaVersion: '1.0.0-phase3';
  sourceDocumentTitle: string;
  documentType: string;
  client: string;
  project: string;
  sensitivityLevel: SensitivityLevel;
  extractedTextPreview: string;
  redactedTextPreview: string;
  detectedDates: string[];
  detectedAmounts: string[];
  detectedObligations: string[];
  detectedDeadlines: string[];
  missingSignatures: string[];
  missingPages: string[];
  duplicationIndicators: string[];
  injectionWarnings: string[];
  requestedAiOperation: string;
  draftOnly: true;
}

const DATE_RE =
  /\b(?:\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})\b/gi;
const AMOUNT_RE = /\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\b\d+(?:\.\d+)?\s*(?:USD|million|billion)\b/gi;
const OBLIGATION_RE =
  /\b(shall|must|agree(?:s|d)? to|obligat(?:e|ion)|deliver(?:y|ables)?|due upon)\b/gi;
const DEADLINE_RE = /\b(deadline|due date|by\s+\d{1,2}[\/\-]\d{1,2}|expires?\s+on)\b/gi;
const SIGNATURE_RE = /\b(signature|signed by|\/s\/|witness)\b/gi;
const PAGE_RE = /\b(page\s+\d+\s+of\s+\d+|missing page|page intentionally left blank)\b/gi;

function uniq(items: string[], limit = 20): string[] {
  return [...new Set(items.map((s) => s.trim()).filter(Boolean))].slice(0, limit);
}

export function buildDocumentReviewPackDraft(input: {
  title: string;
  documentType: string;
  client: string;
  project: string;
  sensitivity: SensitivityLevel;
  extractedText: string;
  redactedText: string;
  injectionWarnings: string[];
  requestedOperation: string;
}): DocumentReviewPack {
  const text = input.extractedText;
  return {
    schemaVersion: '1.0.0-phase3',
    sourceDocumentTitle: input.title,
    documentType: input.documentType,
    client: input.client,
    project: input.project,
    sensitivityLevel: input.sensitivity,
    extractedTextPreview: text.slice(0, 2000),
    redactedTextPreview: input.redactedText.slice(0, 2000),
    detectedDates: uniq(text.match(DATE_RE) || []),
    detectedAmounts: uniq(text.match(AMOUNT_RE) || []),
    detectedObligations: uniq(
      [...text.matchAll(OBLIGATION_RE)].map((m) => m[0]),
    ),
    detectedDeadlines: uniq(
      [...text.matchAll(DEADLINE_RE)].map((m) => m[0]),
    ),
    missingSignatures: /signature/i.test(text) && !/signed\b/i.test(text)
      ? ['Possible missing signature block']
      : SIGNATURE_RE.test(text)
        ? []
        : ['No signature indicators detected'],
    missingPages: uniq([...text.matchAll(PAGE_RE)].map((m) => m[0])),
    duplicationIndicators: /\b(duplicate|already provided|same as prior)\b/i.test(text)
      ? ['Possible duplication language detected']
      : [],
    injectionWarnings: input.injectionWarnings,
    requestedAiOperation: input.requestedOperation,
    draftOnly: true,
  };
}
