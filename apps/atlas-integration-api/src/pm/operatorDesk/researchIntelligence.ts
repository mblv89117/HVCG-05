/**
 * Source-backed research intelligence for lenders / investors / vendors /
 * clients / industries. Copies already-entitled Atlas/index titles and the
 * existing sourced lender catalog titles only.
 *
 * Stores source, retrieval date, confidence, and superseded state.
 * Does not invent lender criteria or financing status. Does not scrape or
 * send live GTM outbound. Refresh = re-read entitled sources and mark older
 * same-key records superseded.
 */

import { CATALOG_VERIFIED_AT, SOURCED_LENDERS } from '@hvcg/atlas-capital-core';
import {
  ASK_ATLAS_RESEARCH_INTELLIGENCE_MISSION_KEY,
  RESEARCH_INTELLIGENCE_FINANCING_STATUS,
  RESEARCH_INTELLIGENCE_FIT,
  RESEARCH_INTELLIGENCE_OUTBOUND_REFRESH,
  RESEARCH_INTELLIGENCE_POLICY_CLASS,
  type AskAtlasClassification,
  type AtlasAuthorizedSearchHit,
  type ResearchIntelligencePayload,
  type ResearchIntelligenceRecord,
  type ResearchSubjectKind,
} from './types.ts';

export { ASK_ATLAS_RESEARCH_INTELLIGENCE_MISSION_KEY };

const SUBJECT_KIND_BY_HIT: Record<string, ResearchSubjectKind> = {
  lender: 'lender',
  investor: 'investor',
  vendor: 'vendor',
  client: 'client',
};

const SUBJECT_SOURCES: Record<ResearchSubjectKind, readonly string[]> = {
  lender: ['HVCG_Lenders', 'atlas-catalog-official'],
  investor: ['HVCG_Lenders', 'HVCG_CapitalSources', 'atlas-catalog-official'],
  vendor: ['HVCG_Vendors'],
  client: ['HVCG_Clients'],
  industry: ['HVCG_Clients'],
};

const INVENTED_CRITERIA =
  /\b(?:ltv\s*[:=]?\s*\d|dscr\s*[:=]?\s*\d|credit box|min(?:imum)? credit|max(?:imum)? ltv|best[_ ]?fit|term sheet approved|committed funded)\b/i;

function neverPromote(value: string | undefined): AskAtlasClassification {
  if (value === 'CONFIRMED' || value === 'LIKELY' || value === 'PROPOSED') return value;
  return 'PROPOSED';
}

function sourceAllowed(kind: ResearchSubjectKind, source: string | undefined): boolean {
  if (!source) return false;
  return SUBJECT_SOURCES[kind].includes(source);
}

function subjectKey(kind: ResearchSubjectKind, title: string, clientCode?: string): string {
  const code = clientCode?.trim().toUpperCase() || '';
  return `${kind}:${code}:${title.trim().toLowerCase()}`;
}

function catalogTitleMatch(title: string): (typeof SOURCED_LENDERS)[number] | undefined {
  const needle = title.trim().toLowerCase();
  if (!needle) return undefined;
  return SOURCED_LENDERS.find((lender) => lender.name.trim().toLowerCase() === needle);
}

function recordFromHit(
  hit: AtlasAuthorizedSearchHit,
  kind: ResearchSubjectKind,
  title: string,
  retrievedAt: string,
  source: string,
): ResearchIntelligenceRecord {
  const classification = neverPromote(hit.classification);
  const retrievalDate = hit.modifiedAt?.trim() || retrievedAt;
  const clientCode = hit.clientCode?.trim() || undefined;
  return {
    id: `${kind}:${hit.id}:${title.trim().toLowerCase()}`,
    subjectKind: kind,
    title: title.trim(),
    source,
    retrievalDate,
    confidence: classification,
    superseded: false,
    ...(clientCode ? { clientCode } : {}),
    classification,
    invented: false,
    lenderCriteriaInvented: false,
    financingStatus: RESEARCH_INTELLIGENCE_FINANCING_STATUS,
    fit: RESEARCH_INTELLIGENCE_FIT,
    evidence: `Copied entitled ${source} title. Lender criteria and financing status were not invented.`,
  };
}

function catalogRecord(lender: (typeof SOURCED_LENDERS)[number]): ResearchIntelligenceRecord {
  const source = lender.verificationSource || lender.website || 'atlas-catalog-official';
  return {
    id: `lender:${lender.id}`,
    subjectKind: 'lender',
    title: lender.name,
    source,
    retrievalDate: lender.lastVerifiedAt || CATALOG_VERIFIED_AT,
    confidence: 'CONFIRMED',
    superseded: false,
    classification: 'CONFIRMED',
    invented: false,
    lenderCriteriaInvented: false,
    financingStatus: RESEARCH_INTELLIGENCE_FINANCING_STATUS,
    fit: RESEARCH_INTELLIGENCE_FIT,
    evidence:
      'Copied existing sourced lender catalog title. Official website / SBA envelope only. Criteria values were not re-stated or invented.',
  };
}

/**
 * Catalog-constant lender titles only. Does not restate min/max, LTV, DSCR,
 * FICO, or invent client assignment / approval / fit.
 */
export function sourcedLenderTitleRecords(): ResearchIntelligenceRecord[] {
  return SOURCED_LENDERS.map(catalogRecord);
}

export function emptyResearchIntelligencePayload(retrievedAt = new Date().toISOString()): ResearchIntelligencePayload {
  return {
    kind: 'research_intelligence_v1',
    policyClass: RESEARCH_INTELLIGENCE_POLICY_CLASS,
    invented: false,
    outboundRefresh: RESEARCH_INTELLIGENCE_OUTBOUND_REFRESH,
    financingStatus: RESEARCH_INTELLIGENCE_FINANCING_STATUS,
    lenderCriteriaInvented: false,
    retrievedAt,
    items: [],
  };
}

/**
 * Re-read entitled sources. Same subject key with a newer retrievalDate
 * supersedes the older row. Does not scrape and does not invent criteria.
 */
export function refreshResearchIntelligence(
  previous: ResearchIntelligenceRecord[],
  next: ResearchIntelligenceRecord[],
): ResearchIntelligenceRecord[] {
  const latest = new Map<string, ResearchIntelligenceRecord>();
  const superseded: ResearchIntelligenceRecord[] = [];
  const consider = (row: ResearchIntelligenceRecord) => {
    const key = subjectKey(row.subjectKind, row.title, row.clientCode);
    const current = latest.get(key);
    if (!current) {
      latest.set(key, { ...row, superseded: false, supersededBy: undefined });
      return;
    }
    const incomingNewer = Date.parse(row.retrievalDate) >= Date.parse(current.retrievalDate);
    const newer = incomingNewer ? row : current;
    const older = incomingNewer ? current : row;
    latest.set(key, { ...newer, superseded: false, supersededBy: undefined });
    superseded.push({ ...older, superseded: true, supersededBy: newer.id });
  };
  for (const row of previous) consider(row);
  for (const row of next) consider(row);
  return [...latest.values(), ...superseded];
}

export function composeResearchIntelligence(
  hits: AtlasAuthorizedSearchHit[],
  retrievedAt = new Date().toISOString(),
): ResearchIntelligencePayload {
  const drafted: ResearchIntelligenceRecord[] = [];
  const seenCatalog = new Set<string>();

  for (const hit of hits) {
    const kind = SUBJECT_KIND_BY_HIT[hit.kind];
    if (kind && sourceAllowed(kind, hit.source) && hit.title.trim()) {
      drafted.push(recordFromHit(hit, kind, hit.title, retrievedAt, hit.source as string));
    }
    const industry = hit.industry?.trim();
    if (industry && hit.kind === 'client' && hit.source === 'HVCG_Clients') {
      drafted.push(recordFromHit(hit, 'industry', industry, retrievedAt, 'HVCG_Clients'));
    }
    if (hit.kind === 'lender' && hit.source === 'HVCG_Lenders') {
      const catalog = catalogTitleMatch(hit.title);
      if (catalog && !seenCatalog.has(catalog.id)) {
        seenCatalog.add(catalog.id);
        drafted.push(catalogRecord(catalog));
      }
    }
  }

  return {
    kind: 'research_intelligence_v1',
    policyClass: RESEARCH_INTELLIGENCE_POLICY_CLASS,
    invented: false,
    outboundRefresh: RESEARCH_INTELLIGENCE_OUTBOUND_REFRESH,
    financingStatus: RESEARCH_INTELLIGENCE_FINANCING_STATUS,
    lenderCriteriaInvented: false,
    retrievedAt,
    items: refreshResearchIntelligence([], drafted),
  };
}

export function researchIntelligenceHasInventedFacts(payload: ResearchIntelligencePayload): boolean {
  if (payload.invented) return true;
  if (payload.outboundRefresh) return true;
  if (payload.lenderCriteriaInvented) return true;
  if (payload.financingStatus !== RESEARCH_INTELLIGENCE_FINANCING_STATUS) return true;
  if (payload.policyClass !== RESEARCH_INTELLIGENCE_POLICY_CLASS) return true;
  for (const row of payload.items) {
    if (row.invented || row.lenderCriteriaInvented) return true;
    if (row.financingStatus !== RESEARCH_INTELLIGENCE_FINANCING_STATUS) return true;
    if (row.fit !== RESEARCH_INTELLIGENCE_FIT) return true;
    if (INVENTED_CRITERIA.test(row.title) || INVENTED_CRITERIA.test(row.evidence)) return true;
  }
  return false;
}
