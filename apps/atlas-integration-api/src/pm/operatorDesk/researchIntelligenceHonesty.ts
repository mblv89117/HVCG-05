/**
 * Hub-only Ask Atlas honesty for research intelligence / sourced lenders.
 * Surfaces already-known entitled researchIntelligence rows and catalog
 * SOURCED_LENDERS titles. Never invents clients, amounts, lender criteria,
 * fit, financing status, or approval. Does not rebuild research, scrape,
 * or submit to lenders.
 */

import {
  ENTITLED_CANONICAL_CLIENT_CODES,
  resolveEntitledClientCodeFromQuestion,
  type EntitledClientCodeMatch,
} from './clientOnboardingAutomation.ts';
import {
  researchIntelligenceHasInventedFacts,
  sourcedLenderTitleRecords,
} from './researchIntelligence.ts';
import {
  ASK_ATLAS_RESEARCH_INTELLIGENCE_HONESTY_MISSION_KEY,
  COMMUNICATIONS_AUTO_RESPOND,
  RESEARCH_INTELLIGENCE_FINANCING_STATUS,
  RESEARCH_INTELLIGENCE_FIT,
  RESEARCH_INTELLIGENCE_OUTBOUND_REFRESH,
  RESEARCH_INTELLIGENCE_POLICY_CLASS,
  type ResearchIntelligenceRecord,
} from './types.ts';

export const RESEARCH_INTELLIGENCE_HONESTY_KIND = 'research_intelligence_honesty_v1' as const;
export const RESEARCH_INTELLIGENCE_HONESTY_MISSION_KEY =
  ASK_ATLAS_RESEARCH_INTELLIGENCE_HONESTY_MISSION_KEY;

const FOREIGN_CODE = /(?:^|[^A-Z0-9])(PDG01|ACCG01|CCB01|HFD01|LIEN01)(?:[^A-Z0-9]|$)/g;
const ACCG_TOKEN = /(?:^|[^A-Z0-9])ACCG(?:[^A-Z0-9]|$)/;
const INVENTED_CRITERIA =
  /\b(?:ltv\s*[:=]?\s*\d|dscr\s*[:=]?\s*\d|credit box|min(?:imum)? credit|max(?:imum)? ltv|best[_ ]?fit|term sheet approved|committed funded)\b/i;
const INVENTED_AMOUNT = /\$[\d,]+|\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b/;

export type ResearchIntelligenceHonesty = {
  kind: typeof RESEARCH_INTELLIGENCE_HONESTY_KIND;
  status: 'NOT_READY' | 'CLEAR' | 'OPEN' | 'BLOCKED';
  ready: boolean;
  clientCode?: string;
  entitledCodes: string[];
  relatedResearch: ResearchIntelligenceRecord[];
  sourcedLenders: ResearchIntelligenceRecord[];
  relatedResearchCount: number;
  sourcedLenderCount: number;
  honestyNotes: string[];
  items: string[];
  communicationPolicy: 'DRAFT_ONLY';
  autoRespond: typeof COMMUNICATIONS_AUTO_RESPOND;
  policyClass: typeof RESEARCH_INTELLIGENCE_POLICY_CLASS;
  financingStatus: typeof RESEARCH_INTELLIGENCE_FINANCING_STATUS;
  fit: typeof RESEARCH_INTELLIGENCE_FIT;
  outboundRefresh: typeof RESEARCH_INTELLIGENCE_OUTBOUND_REFRESH;
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

function rowHasInventedFacts(row: ResearchIntelligenceRecord): boolean {
  if (row.invented || row.lenderCriteriaInvented) return true;
  if (row.financingStatus !== RESEARCH_INTELLIGENCE_FINANCING_STATUS) return true;
  if (row.fit !== RESEARCH_INTELLIGENCE_FIT) return true;
  if (INVENTED_CRITERIA.test(row.title) || INVENTED_CRITERIA.test(row.evidence)) return true;
  if (INVENTED_AMOUNT.test(row.title) || INVENTED_AMOUNT.test(row.evidence)) return true;
  return researchIntelligenceHasInventedFacts({
    kind: 'research_intelligence_v1',
    policyClass: RESEARCH_INTELLIGENCE_POLICY_CLASS,
    invented: false,
    outboundRefresh: RESEARCH_INTELLIGENCE_OUTBOUND_REFRESH,
    financingStatus: RESEARCH_INTELLIGENCE_FINANCING_STATUS,
    lenderCriteriaInvented: false,
    retrievedAt: row.retrievalDate,
    items: [row],
  });
}

function asksSourcedLenders(question: string): boolean {
  const q = question.toLowerCase();
  return q.includes('sourced lender') || q.includes('sourced-lenders');
}

export function mapsToResearchIntelligenceHonestyIntent(question: string): boolean {
  const q = question.toLowerCase();
  if (q.includes('research intelligence') || q.includes('research-intelligence')) return true;
  if (q.includes('what do we know from research')) return true;
  if (asksSourcedLenders(question)) return true;
  return false;
}

export function composeResearchIntelligenceHonesty(opts: {
  question?: string;
  match?: EntitledClientCodeMatch;
  entitledCodes?: readonly string[];
  researchIntelligence?: ResearchIntelligenceRecord[];
}): ResearchIntelligenceHonesty {
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
  const wantCatalog = !scoped && !askedOutside && match.kind !== 'ambiguous';

  const relatedResearch: ResearchIntelligenceRecord[] = [];
  for (const row of opts.researchIntelligence ?? []) {
    if (rowHasInventedFacts(row)) continue;
    const code = entitledCodeOf(row.clientCode, entitled);
    if (!code) continue;
    if (scoped && code !== scoped) continue;
    if (foreignCodesIn(blobOf([row.title, row.evidence, row.clientCode, row.source]), scoped).length) {
      continue;
    }
    relatedResearch.push({
      ...row,
      clientCode: code,
      invented: false,
      lenderCriteriaInvented: false,
      financingStatus: RESEARCH_INTELLIGENCE_FINANCING_STATUS,
      fit: RESEARCH_INTELLIGENCE_FIT,
    });
  }

  const sourcedLenders = wantCatalog && !scoped
    ? sourcedLenderTitleRecords().filter((row) => !rowHasInventedFacts(row))
    : relatedResearch.filter((row) => row.subjectKind === 'lender');

  const honestyNotes = [
    'already-known entitled researchIntelligence rows only',
    'sourced lenders are catalog titles only',
    'lender criteria not invented',
    'financing status UNKNOWN',
    'fit NOT_EVALUATED',
    'no lender submit',
  ];

  const items: string[] = [];
  if (match.kind === 'ambiguous') {
    items.push(`Multiple entitled ClientCodes match (${match.candidates.join(', ')}). Atlas does not guess.`);
  }
  if (askedOutside) {
    items.push('Asked ClientCode is outside the entitled roster. Atlas does not invent a sixth client.');
  }
  if (!relatedResearch.length && !(wantCatalog && !scoped && sourcedLenders.length)) {
    items.push(scoped
      ? `No entitled researchIntelligence rows are visible for ${scoped}`
      : 'No entitled researchIntelligence rows are visible');
  }
  if (scoped && asksSourcedLenders(opts.question || '')) {
    items.push(`Catalog SOURCED_LENDERS titles are not assigned to ${scoped}. Atlas does not invent lender fit.`);
  }

  const nextOwnerAction =
    match.kind === 'ambiguous'
      ? 'Name one entitled ClientCode. Atlas does not invent or guess.'
      : scoped
        ? `Review already-known entitled researchIntelligence rows for ${scoped}. Do not invent clients, amounts, lender criteria, or approval.`
        : 'Review already-known entitled researchIntelligence rows and catalog lender titles. Do not invent clients, amounts, lender criteria, or approval.';

  const flags = {
    kind: RESEARCH_INTELLIGENCE_HONESTY_KIND,
    entitledCodes: entitled,
    relatedResearch,
    sourcedLenders,
    relatedResearchCount: relatedResearch.length,
    sourcedLenderCount: sourcedLenders.length,
    honestyNotes,
    items,
    communicationPolicy: 'DRAFT_ONLY' as const,
    autoRespond: COMMUNICATIONS_AUTO_RESPOND,
    policyClass: RESEARCH_INTELLIGENCE_POLICY_CLASS,
    financingStatus: RESEARCH_INTELLIGENCE_FINANCING_STATUS,
    fit: RESEARCH_INTELLIGENCE_FIT,
    outboundRefresh: RESEARCH_INTELLIGENCE_OUTBOUND_REFRESH,
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

export function formatResearchIntelligenceHonesty(
  pack: ResearchIntelligenceHonesty,
  scope = pack.clientCode ?? 'Hub',
): string {
  return [
    `Research intelligence for ${scope}: ${pack.status}`,
    `kind: ${pack.kind}`,
    pack.clientCode ? `ClientCode: ${pack.clientCode}` : `Entitled roster: ${pack.entitledCodes.join(', ')}`,
    pack.relatedResearch.length
      ? `Related research (already-known entitled rows): ${pack.relatedResearch.map((row) => row.title).join('; ')}`
      : 'No entitled researchIntelligence rows are visible.',
    pack.sourcedLenders.length
      ? `Sourced lenders (catalog titles only): ${pack.sourcedLenders.map((row) => row.title).join('; ')}`
      : 'No sourced lender catalog titles are assigned in this scope.',
    `Financing status: ${pack.financingStatus}`,
    `Fit: ${pack.fit}`,
    'Lender criteria invented: false',
    'Approval: false',
    pack.honestyNotes.length ? `Honesty: ${pack.honestyNotes.join('; ')}` : '',
    pack.items.length ? `Open: ${pack.items.join('; ')}` : 'No open research items.',
    `Communication policy: ${pack.communicationPolicy}`,
    `Next owner action: ${pack.nextOwnerAction}`,
    'Atlas did not invent clients, amounts, lender criteria, or approval.',
    'Atlas did not send mail, launch GTM, or submit capital.',
  ]
    .filter(Boolean)
    .join('\n');
}

export function answerResearchIntelligenceHonesty(
  question: string,
  extras?: {
    entitledCodes?: readonly string[];
    researchIntelligence?: ResearchIntelligenceRecord[];
  },
): string {
  const pack = composeResearchIntelligenceHonesty({
    question,
    entitledCodes: extras?.entitledCodes,
    researchIntelligence: extras?.researchIntelligence,
  });
  return formatResearchIntelligenceHonesty(pack, pack.clientCode ?? 'Hub');
}
