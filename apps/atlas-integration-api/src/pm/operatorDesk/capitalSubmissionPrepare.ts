/**
 * PREPARE-only capital submission request from already-entitled Atlas/index
 * evidence.
 *
 * Copies existing capital_opportunity / recovered packet / lender catalog
 * titles only. Does not invent lender criteria, financing status, amounts,
 * or a fit band. External lender/investor submission stays OWNER-GATED.
 */

import {
  ASK_ATLAS_CAPITAL_SUBMISSION_PREPARE_MISSION_KEY,
  CAPITAL_SUBMISSION_EXTERNAL_SUBMIT,
  CAPITAL_SUBMISSION_FINANCING_STATUS,
  CAPITAL_SUBMISSION_FIT,
  CAPITAL_SUBMISSION_OWNER_GATED,
  CAPITAL_SUBMISSION_POLICY_CLASS,
  CAPITAL_SUBMISSION_SEND,
  type AskAtlasClassification,
  type AtlasAuthorizedSearchHit,
  type CapitalSubmissionCatalogCopy,
  type CapitalSubmissionEvidenceClass,
  type CapitalSubmissionPreparePayload,
  type CapitalSubmissionPrepareRecord,
} from './types.ts';

export { ASK_ATLAS_CAPITAL_SUBMISSION_PREPARE_MISSION_KEY };

const CAPITAL_EVIDENCE_KINDS = new Set([
  'capital_opportunity',
  'recovered_capital_packet',
  'hvs_actionable_capital',
]);

const INVENTED_CRITERIA =
  /\b(?:ltv|dscr|credit box|min(?:imum)? credit|max(?:imum)? ltv|funding status|best[_ ]?fit|term sheet approved|committed funded)\b/i;

const OWNER_NEXT_ACTION =
  'Owner review of this PREPARE-only package. External lender/investor submission remains owner-gated.';

function neverPromoteHitClassification(
  value: string | undefined,
): AskAtlasClassification {
  if (value === 'CONFIRMED' || value === 'LIKELY' || value === 'PROPOSED') return value;
  return 'PROPOSED';
}

function recordClassification(hit: AtlasAuthorizedSearchHit): CapitalSubmissionEvidenceClass {
  if (hit.kind === 'capital_opportunity' && hit.source === 'HVCG_CapitalOpportunities') {
    return 'CONFIRMED';
  }
  if (hit.kind === 'recovered_capital_packet' || hit.kind === 'hvs_actionable_capital') {
    return neverPromoteHitClassification(hit.classification);
  }
  return neverPromoteHitClassification(hit.classification);
}

function missingRequirements(hit: AtlasAuthorizedSearchHit): string[] {
  const missing = [
    'Owner must review and approve before any external lender/investor submission.',
  ];
  if (hit.kind === 'recovered_capital_packet' || hit.kind === 'hvs_actionable_capital') {
    missing.push(
      'Filename-only recovered capital packet. Amounts, lender criteria, and funding status were not extracted.',
    );
  }
  if (hit.kind === 'capital_opportunity') {
    missing.push(
      'Entitled HVCG_CapitalOpportunities title copied. Financing status and lender criteria were not invented.',
    );
  }
  return missing;
}

function catalogCopy(hit: AtlasAuthorizedSearchHit): CapitalSubmissionCatalogCopy | null {
  if (hit.kind !== 'lender') return null;
  if (hit.source && hit.source !== 'HVCG_Lenders') return null;
  const lenderName = hit.title.trim();
  if (!lenderName) return null;
  return {
    lenderId: hit.id,
    lenderName,
    classification: 'CONFIRMED',
    fit: CAPITAL_SUBMISSION_FIT,
    criteriaInvented: false,
    invented: false,
    evidence:
      'Copied entitled HVCG_Lenders title. Lender criteria and financing fit were not invented.',
  };
}

function evidenceRef(hit: AtlasAuthorizedSearchHit): CapitalSubmissionPrepareRecord['evidence'][number] {
  const classification = neverPromoteHitClassification(hit.classification);
  return {
    kind: hit.kind,
    id: hit.id,
    title: hit.title,
    ...(hit.source ? { source: hit.source } : {}),
    classification,
    ...(hit.webUrl ? { webUrl: hit.webUrl } : {}),
  };
}

export function emptyCapitalSubmissionPayload(): CapitalSubmissionPreparePayload {
  return {
    kind: 'capital_submission_request_v1',
    policyClass: CAPITAL_SUBMISSION_POLICY_CLASS,
    invented: false,
    send: CAPITAL_SUBMISSION_SEND,
    externalSubmit: CAPITAL_SUBMISSION_EXTERNAL_SUBMIT,
    ownerGated: CAPITAL_SUBMISSION_OWNER_GATED,
    catalogCopies: [],
    items: [],
  };
}

export function composeCapitalSubmissionPrepare(
  hits: AtlasAuthorizedSearchHit[],
): CapitalSubmissionPreparePayload {
  const items: CapitalSubmissionPrepareRecord[] = [];
  const catalogCopies: CapitalSubmissionCatalogCopy[] = [];
  const seenItems = new Set<string>();
  const seenLenders = new Set<string>();

  for (const hit of hits) {
    const copy = catalogCopy(hit);
    if (copy && !seenLenders.has(copy.lenderId)) {
      seenLenders.add(copy.lenderId);
      catalogCopies.push(copy);
    }
  }

  for (const hit of hits) {
    if (!CAPITAL_EVIDENCE_KINDS.has(hit.kind)) continue;
    if (seenItems.has(hit.id)) continue;
    seenItems.add(hit.id);
    const classification = recordClassification(hit);
    const clientCode = hit.clientCode?.trim() || undefined;
    const missing = missingRequirements(hit);
    if (!catalogCopies.length) {
      missing.push('No entitled HVCG_Lenders row in this entitled hit set.');
    }
    items.push({
      id: hit.id,
      title: hit.title,
      ...(clientCode ? { clientCode } : {}),
      classification,
      provenance: classification,
      invented: false,
      financingStatus: CAPITAL_SUBMISSION_FINANCING_STATUS,
      financingStatusClassification: 'HONEST_EMPTY',
      lenderCriteriaInvented: false,
      evidence: [evidenceRef(hit)],
      missingRequirements: missing,
      nextAction: OWNER_NEXT_ACTION,
    });
  }

  return {
    kind: 'capital_submission_request_v1',
    policyClass: CAPITAL_SUBMISSION_POLICY_CLASS,
    invented: false,
    send: CAPITAL_SUBMISSION_SEND,
    externalSubmit: CAPITAL_SUBMISSION_EXTERNAL_SUBMIT,
    ownerGated: CAPITAL_SUBMISSION_OWNER_GATED,
    catalogCopies,
    items,
  };
}

export function capitalSubmissionPayloadHasInventedFacts(
  payload: CapitalSubmissionPreparePayload,
): boolean {
  if (payload.invented) return true;
  if (payload.send || payload.externalSubmit) return true;
  if (!payload.ownerGated) return true;
  if (payload.policyClass !== CAPITAL_SUBMISSION_POLICY_CLASS) return true;
  for (const copy of payload.catalogCopies) {
    if (copy.invented || copy.criteriaInvented) return true;
    if (copy.fit !== CAPITAL_SUBMISSION_FIT) return true;
    if (INVENTED_CRITERIA.test(copy.lenderName) || INVENTED_CRITERIA.test(copy.evidence)) return true;
  }
  for (const row of payload.items) {
    if (row.invented || row.lenderCriteriaInvented) return true;
    if (row.financingStatus !== CAPITAL_SUBMISSION_FINANCING_STATUS) return true;
    if (row.financingStatusClassification !== 'HONEST_EMPTY') return true;
    if (INVENTED_CRITERIA.test(row.nextAction)) return true;
    for (const note of row.missingRequirements) {
      if (INVENTED_CRITERIA.test(note)) return true;
    }
  }
  return false;
}
