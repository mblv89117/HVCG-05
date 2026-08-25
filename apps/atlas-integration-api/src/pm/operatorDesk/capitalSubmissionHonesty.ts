/**
 * Hub-only Ask Atlas honesty for capital submission / prepare package /
 * lender submit readiness. Surfaces already-entitled prepare records and
 * catalog titles via composeCapitalSubmissionPrepare. Never invents clients,
 * amounts, lender criteria, fit, financing status, or approval. PREPARE_ONLY.
 * Does not submit to lenders/investors.
 */

import {
  ENTITLED_CANONICAL_CLIENT_CODES,
  resolveEntitledClientCodeFromQuestion,
  type EntitledClientCodeMatch,
} from './clientOnboardingAutomation.ts';
import {
  capitalSubmissionPayloadHasInventedFacts,
  composeCapitalSubmissionPrepare,
  emptyCapitalSubmissionPayload,
} from './capitalSubmissionPrepare.ts';
import {
  ASK_ATLAS_CAPITAL_SUBMISSION_HONESTY_MISSION_KEY,
  CAPITAL_SUBMISSION_EXTERNAL_SUBMIT,
  CAPITAL_SUBMISSION_FINANCING_STATUS,
  CAPITAL_SUBMISSION_FIT,
  CAPITAL_SUBMISSION_OWNER_GATED,
  CAPITAL_SUBMISSION_POLICY_CLASS,
  CAPITAL_SUBMISSION_SEND,
  COMMUNICATIONS_AUTO_RESPOND,
  type AtlasAuthorizedSearchHit,
  type CapitalSubmissionCatalogCopy,
  type CapitalSubmissionPreparePayload,
  type CapitalSubmissionPrepareRecord,
} from './types.ts';

export const CAPITAL_SUBMISSION_HONESTY_KIND = 'capital_submission_honesty_v1' as const;
export const CAPITAL_SUBMISSION_HONESTY_MISSION_KEY =
  ASK_ATLAS_CAPITAL_SUBMISSION_HONESTY_MISSION_KEY;

const FOREIGN_CODE = /(?:^|[^A-Z0-9])(PDG01|ACCG01|CCB01|HFD01|LIEN01)(?:[^A-Z0-9]|$)/g;
const ACCG_TOKEN = /(?:^|[^A-Z0-9])ACCG(?:[^A-Z0-9]|$)/;
const INVENTED_CRITERIA =
  /(?:\bltv\s*[:=]?\s*\d|\bdscr\s*[:=]?\s*\d|\bcredit box\b|\bmin(?:imum)? credit\b|\bmax(?:imum)? ltv\b|\bbest[_ ]?fit\b|\bterm sheet approved\b|\bcommitted funded\b)/i;
const INVENTED_AMOUNT = /\$[\d,]+|\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b/;

export type CapitalSubmissionHonesty = {
  kind: typeof CAPITAL_SUBMISSION_HONESTY_KIND;
  status: 'NOT_READY' | 'CLEAR' | 'OPEN' | 'BLOCKED';
  ready: boolean;
  clientCode?: string;
  entitledCodes: string[];
  prepare: CapitalSubmissionPreparePayload;
  prepareCount: number;
  catalogCopies: CapitalSubmissionCatalogCopy[];
  catalogCopyCount: number;
  honestyNotes: string[];
  items: string[];
  communicationPolicy: 'DRAFT_ONLY';
  autoRespond: typeof COMMUNICATIONS_AUTO_RESPOND;
  policyClass: typeof CAPITAL_SUBMISSION_POLICY_CLASS;
  financingStatus: typeof CAPITAL_SUBMISSION_FINANCING_STATUS;
  fit: typeof CAPITAL_SUBMISSION_FIT;
  ownerGated: typeof CAPITAL_SUBMISSION_OWNER_GATED;
  externalSubmit: typeof CAPITAL_SUBMISSION_EXTERNAL_SUBMIT;
  lenderCriteriaInvented: false;
  approval: false;
  nextOwnerAction: string;
  send: false;
  outbound: false;
  liveGtmOutbound: false;
  capitalSubmit: false;
  invented: false;
};

function rosterEntitled(entitledCodes: readonly string[]): string[] {
  return entitledCodes.filter((code) =>
    (ENTITLED_CANONICAL_CLIENT_CODES as readonly string[]).includes(code),
  );
}

function entitledCodeOf(code: string | undefined, entitled: readonly string[]): string | undefined {
  const normalized = (code || '').trim().toUpperCase();
  if (!normalized) return undefined;
  return entitled.includes(normalized) ? normalized : undefined;
}

function blobOf(parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(' ').toUpperCase();
}

function foreignCodesIn(blob: string, scoped?: string): string[] {
  const found = new Set<string>();
  FOREIGN_CODE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = FOREIGN_CODE.exec(blob))) {
    const code = match[1];
    if (code && code !== scoped) found.add(code);
  }
  if (scoped === 'LIEN01' && ACCG_TOKEN.test(blob) && !found.has('ACCG01')) {
    found.add('ACCG01');
  }
  return [...found];
}

function hasInventedFacts(parts: Array<string | undefined>): boolean {
  const blob = parts.filter(Boolean).join(' ');
  return INVENTED_CRITERIA.test(blob) || INVENTED_AMOUNT.test(blob);
}

function hitHasInventedFacts(hit: AtlasAuthorizedSearchHit): boolean {
  return hasInventedFacts([hit.title, hit.evidence, hit.why, hit.basedOn, hit.nextAction]);
}

function itemHasInventedFacts(row: CapitalSubmissionPrepareRecord): boolean {
  if (row.invented || row.lenderCriteriaInvented) return true;
  if (row.financingStatus !== CAPITAL_SUBMISSION_FINANCING_STATUS) return true;
  if (row.financingStatusClassification !== 'HONEST_EMPTY') return true;
  if (hasInventedFacts([row.title, row.nextAction, ...row.missingRequirements])) return true;
  return row.evidence.some((ref) => hasInventedFacts([ref.title]));
}

function copyHasInventedFacts(copy: CapitalSubmissionCatalogCopy): boolean {
  if (copy.invented || copy.criteriaInvented) return true;
  if (copy.fit !== CAPITAL_SUBMISSION_FIT) return true;
  return hasInventedFacts([copy.lenderName, copy.evidence]);
}

function hitInScope(
  hit: AtlasAuthorizedSearchHit,
  entitled: readonly string[],
  scoped?: string,
): boolean {
  if (hitHasInventedFacts(hit)) return false;
  const code = entitledCodeOf(hit.clientCode, entitled);
  if (foreignCodesIn(blobOf([hit.title, hit.evidence, hit.clientCode, hit.source, hit.why]), scoped).length) {
    return false;
  }
  if (hit.kind === 'lender') {
    if (hit.clientCode && !code) return false;
    if (scoped && hit.clientCode && hit.clientCode !== scoped) return false;
    return true;
  }
  if (!code) return false;
  if (scoped && code !== scoped) return false;
  return true;
}

function sanitizePayload(
  payload: CapitalSubmissionPreparePayload,
  entitled: readonly string[],
  scoped?: string,
): CapitalSubmissionPreparePayload {
  if (
    payload.invented
    || payload.send
    || payload.externalSubmit
    || !payload.ownerGated
    || payload.policyClass !== CAPITAL_SUBMISSION_POLICY_CLASS
  ) {
    return emptyCapitalSubmissionPayload();
  }

  const items: CapitalSubmissionPrepareRecord[] = [];
  for (const row of payload.items) {
    if (itemHasInventedFacts(row)) continue;
    const code = entitledCodeOf(row.clientCode, entitled);
    if (row.clientCode && !code) continue;
    if (scoped && code && code !== scoped) continue;
    if (scoped && !code) continue;
    if (foreignCodesIn(blobOf([row.title, row.clientCode, ...row.missingRequirements]), scoped).length) {
      continue;
    }
    items.push({
      ...row,
      ...(code ? { clientCode: code } : {}),
      invented: false,
      lenderCriteriaInvented: false,
      financingStatus: CAPITAL_SUBMISSION_FINANCING_STATUS,
      financingStatusClassification: 'HONEST_EMPTY',
    });
  }

  const catalogCopies: CapitalSubmissionCatalogCopy[] = [];
  for (const copy of payload.catalogCopies) {
    if (copyHasInventedFacts(copy)) continue;
    if (foreignCodesIn(blobOf([copy.lenderName, copy.evidence, copy.lenderId]), scoped).length) {
      continue;
    }
    catalogCopies.push({
      ...copy,
      fit: CAPITAL_SUBMISSION_FIT,
      criteriaInvented: false,
      invented: false,
    });
  }

  const next = {
    kind: 'capital_submission_request_v1' as const,
    policyClass: CAPITAL_SUBMISSION_POLICY_CLASS,
    invented: false as const,
    send: CAPITAL_SUBMISSION_SEND,
    externalSubmit: CAPITAL_SUBMISSION_EXTERNAL_SUBMIT,
    ownerGated: CAPITAL_SUBMISSION_OWNER_GATED,
    catalogCopies,
    items,
  };
  if (capitalSubmissionPayloadHasInventedFacts(next)) return emptyCapitalSubmissionPayload();
  return next;
}

export function mapsToCapitalSubmissionHonestyIntent(question: string): boolean {
  const q = question.toLowerCase();
  if (q.includes('capital submission')) return true;
  if (q.includes('submission package')) return true;
  if (q.includes('prepare capital')) return true;
  if (q.includes('submit to lender')) return true;
  if (q.includes('lender package')) return true;
  return false;
}

export function composeCapitalSubmissionHonesty(opts: {
  question?: string;
  match?: EntitledClientCodeMatch;
  entitledCodes?: readonly string[];
  entitledHits?: AtlasAuthorizedSearchHit[];
  capitalSubmissions?: CapitalSubmissionPreparePayload;
}): CapitalSubmissionHonesty {
  const entitled = rosterEntitled(opts.entitledCodes ?? ENTITLED_CANONICAL_CLIENT_CODES);
  const match = opts.match
    ?? (opts.question
      ? resolveEntitledClientCodeFromQuestion(opts.question, entitled)
      : { kind: 'none' as const, candidates: [] });
  const scoped = match.kind === 'exact' || match.kind === 'unique_prefix' ? match.clientCode : undefined;
  const askedOutside = Boolean(
    match.kind === 'none'
    && opts.question
    && /\b(CPL01|SYN01|NORTH01)\b/i.test(opts.question),
  );

  const fromHits = (opts.entitledHits ?? []).filter((hit) => hitInScope(hit, entitled, scoped));
  const prepared = opts.entitledHits
    ? composeCapitalSubmissionPrepare(fromHits)
    : (opts.capitalSubmissions ?? emptyCapitalSubmissionPayload());
  const prepare = sanitizePayload(prepared, entitled, scoped);

  const honestyNotes = [
    'already-entitled prepare records and catalog titles only',
    'lender criteria not invented',
    'financing status UNKNOWN',
    'fit NOT_EVALUATED',
    'PREPARE_ONLY',
    'external submit owner-gated',
    'no lender submit',
  ];

  const items: string[] = [];
  if (match.kind === 'ambiguous') {
    items.push(`Multiple entitled ClientCodes match (${match.candidates.join(', ')}). Atlas does not guess.`);
  }
  if (askedOutside) {
    items.push('Asked ClientCode is outside the entitled roster. Atlas does not invent a sixth client.');
  }
  if (!prepare.items.length && !prepare.catalogCopies.length && match.kind !== 'ambiguous') {
    items.push(scoped
      ? `No entitled capital submission prepare records are visible for ${scoped}`
      : 'No entitled capital submission prepare records are visible');
  }

  const nextOwnerAction =
    match.kind === 'ambiguous'
      ? 'Name one entitled ClientCode. Atlas does not invent or guess.'
      : scoped
        ? `Review the PREPARE-only capital submission package for ${scoped}. External lender/investor submission remains owner-gated. Do not invent clients, amounts, lender criteria, or approval.`
        : 'Review the PREPARE-only capital submission package. External lender/investor submission remains owner-gated. Do not invent clients, amounts, lender criteria, or approval.';

  const flags = {
    kind: CAPITAL_SUBMISSION_HONESTY_KIND,
    entitledCodes: entitled,
    prepare,
    prepareCount: prepare.items.length,
    catalogCopies: prepare.catalogCopies,
    catalogCopyCount: prepare.catalogCopies.length,
    honestyNotes,
    items,
    communicationPolicy: 'DRAFT_ONLY' as const,
    autoRespond: COMMUNICATIONS_AUTO_RESPOND,
    policyClass: CAPITAL_SUBMISSION_POLICY_CLASS,
    financingStatus: CAPITAL_SUBMISSION_FINANCING_STATUS,
    fit: CAPITAL_SUBMISSION_FIT,
    ownerGated: CAPITAL_SUBMISSION_OWNER_GATED,
    externalSubmit: CAPITAL_SUBMISSION_EXTERNAL_SUBMIT,
    lenderCriteriaInvented: false as const,
    approval: false as const,
    nextOwnerAction,
    send: false as const,
    outbound: false as const,
    liveGtmOutbound: false as const,
    capitalSubmit: false as const,
    invented: false as const,
  };

  if (match.kind === 'ambiguous') {
    return {
      status: 'NOT_READY',
      ready: false,
      ...flags,
    };
  }

  const status = items.length ? 'OPEN' : 'CLEAR';
  return {
    status,
    ready: status === 'CLEAR',
    ...(scoped ? { clientCode: scoped } : {}),
    ...flags,
  };
}

export function formatCapitalSubmissionHonesty(
  pack: CapitalSubmissionHonesty,
  scope = pack.clientCode ?? 'Hub',
): string {
  return [
    `Capital submission for ${scope}: ${pack.status}`,
    `kind: ${pack.kind}`,
    pack.clientCode ? `ClientCode: ${pack.clientCode}` : `Entitled roster: ${pack.entitledCodes.join(', ')}`,
    pack.prepare.items.length
      ? `Prepare records (already-entitled): ${pack.prepare.items.map((row) => row.title).join('; ')}`
      : 'No entitled capital submission prepare records are visible.',
    pack.catalogCopies.length
      ? `Catalog titles (already-entitled): ${pack.catalogCopies.map((row) => row.lenderName).join('; ')}`
      : 'No entitled lender catalog titles are assigned in this scope.',
    `Policy class: ${pack.policyClass}`,
    `Financing status: ${pack.financingStatus}`,
    `Fit: ${pack.fit}`,
    'Lender criteria invented: false',
    'Approval: false',
    'External submit: false',
    pack.honestyNotes.length ? `Honesty: ${pack.honestyNotes.join('; ')}` : '',
    pack.items.length ? `Open: ${pack.items.join('; ')}` : 'No open capital submission items.',
    `Communication policy: ${pack.communicationPolicy}`,
    `Next owner action: ${pack.nextOwnerAction}`,
    'Atlas did not invent clients, amounts, lender criteria, or approval.',
    'Atlas did not send mail, launch GTM, or submit capital.',
  ]
    .filter(Boolean)
    .join('\n');
}

export function answerCapitalSubmissionHonesty(
  question: string,
  extras?: {
    entitledCodes?: readonly string[];
    entitledHits?: AtlasAuthorizedSearchHit[];
    capitalSubmissions?: CapitalSubmissionPreparePayload;
  },
): string {
  const pack = composeCapitalSubmissionHonesty({
    question,
    entitledCodes: extras?.entitledCodes,
    entitledHits: extras?.entitledHits,
    capitalSubmissions: extras?.capitalSubmissions,
  });
  return formatCapitalSubmissionHonesty(pack, pack.clientCode ?? 'Hub');
}
