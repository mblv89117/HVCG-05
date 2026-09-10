/**
 * Hub-only Ask Atlas honesty for Approval Center / pending approval /
 * waiting-on-me questions. Surfaces already-entitled owner-approval tasks
 * and existing overlay rows only. Never invents approval rows, clients,
 * amounts, lender criteria, or approval or funded state. AUTO_RESPOND stays
 * false. Communications stay DRAFT_ONLY. Owner-gated execution stays
 * owner-gated. Does not auto-approve or execute.
 */

import {
  ENTITLED_CANONICAL_CLIENT_CODES,
  resolveEntitledClientCodeFromQuestion,
  type EntitledClientCodeMatch,
} from './clientOnboardingAutomation.ts';
import {
  ASK_ATLAS_APPROVAL_CENTER_HONESTY_MISSION_KEY,
  COMMUNICATIONS_AUTO_RESPOND,
} from './types.ts';

export const APPROVAL_CENTER_HONESTY_KIND = 'approval_center_honesty_v1' as const;
export const APPROVAL_CENTER_HONESTY_MISSION_KEY =
  ASK_ATLAS_APPROVAL_CENTER_HONESTY_MISSION_KEY;

export const APPROVAL_CENTER_AUTO_APPROVE = false as const;
export const APPROVAL_CENTER_HONESTY_SEND = false as const;
export const APPROVAL_CENTER_HONESTY_EXECUTE = false as const;
export const APPROVAL_CENTER_HONESTY_OWNER_GATED = true as const;

export type ApprovalHonestyClassification =
  | 'CONFIRMED'
  | 'LIKELY'
  | 'PROPOSED'
  | 'STALE_OR_UNCERTAIN';

export type ApprovalCenterHonestyEntitledItem = {
  approvalId: string;
  title: string;
  clientCode?: string;
  requestedAction?: string;
  source?: string;
  evidenceStatus?: string;
  fromOwnerApprovalTask?: boolean;
  fromExistingOverlay?: boolean;
};

export type ApprovalCenterHonestyItem = {
  approvalId: string;
  title: string;
  clientCode?: string;
  requestedAction: string;
  source: 'task' | 'overlay' | 'other';
  classification: ApprovalHonestyClassification;
  liveEvidence: boolean;
  approved: false;
  funded: false;
};

export type ApprovalCenterHonesty = {
  kind: typeof APPROVAL_CENTER_HONESTY_KIND;
  status: 'NOT_READY' | 'CLEAR' | 'OPEN' | 'BLOCKED';
  ready: boolean;
  clientCode?: string;
  entitledCodes: string[];
  pendingItems: ApprovalCenterHonestyItem[];
  pendingCount: number;
  liveEvidence: boolean;
  snapshotEmpty: boolean;
  snapshotUnsigned: boolean;
  honestyNotes: string[];
  items: string[];
  communicationPolicy: 'DRAFT_ONLY';
  autoRespond: typeof COMMUNICATIONS_AUTO_RESPOND;
  autoApprove: typeof APPROVAL_CENTER_AUTO_APPROVE;
  execute: typeof APPROVAL_CENTER_HONESTY_EXECUTE;
  ownerGated: typeof APPROVAL_CENTER_HONESTY_OWNER_GATED;
  nextOwnerAction: string;
  send: false;
  outbound: false;
  liveGtmOutbound: false;
  capitalSubmit: false;
  invented: false;
};

const FOREIGN_CODE = /(?:^|[^A-Z0-9])(PDG01|ACCG01|CCB01|HFD01|KAVA01|CPL01|LIEN01)(?:[^A-Z0-9]|$)/g;
const ACCG_TOKEN = /(?:^|[^A-Z0-9])ACCG(?:[^A-Z0-9]|$)/;
const INVENTED_CRITERIA =
  /(?:\bltv\s*[:=]?\s*\d|\bdscr\s*[:=]?\s*\d|\bcredit box\b|\bmin(?:imum)? credit\b|\bmax(?:imum)? ltv\b|\bbest[_ ]?fit\b|\bterm sheet approved\b|\bcommitted funded\b)/i;
const INVENTED_AMOUNT = /\$[\d,]+|\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b/;
const INVENTED_FUNDED = /(?:\bCOMPLETE\b|\bapproved\/funded\b|\bfunded\b)/i;

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
  return INVENTED_CRITERIA.test(blob) || INVENTED_AMOUNT.test(blob) || INVENTED_FUNDED.test(blob);
}

function classify(item: ApprovalCenterHonestyEntitledItem, live: boolean): ApprovalHonestyClassification {
  const raw = (item.evidenceStatus || '').trim().toUpperCase();
  if (raw === 'COMPLETE' || raw === 'APPROVED' || raw === 'FUNDED') return 'STALE_OR_UNCERTAIN';
  if (raw === 'CONFIRMED' || raw === 'LIKELY' || raw === 'PROPOSED' || raw === 'STALE_OR_UNCERTAIN') {
    if (raw === 'CONFIRMED' && !live) return 'STALE_OR_UNCERTAIN';
    return raw;
  }
  return live ? 'PROPOSED' : 'STALE_OR_UNCERTAIN';
}

function itemLiveEligible(item: ApprovalCenterHonestyEntitledItem): boolean {
  return Boolean(item.fromOwnerApprovalTask || item.fromExistingOverlay || item.source === 'task');
}

export function mapsToApprovalCenterHonestyIntent(question: string): boolean {
  const q = question.toLowerCase();
  if (q.includes('capital submission') || q.includes('submission package')) return false;
  if (q.includes('prepare capital') || q.includes('submit to lender') || q.includes('lender package')) return false;
  if (q.includes('research intelligence') || q.includes('what do we know from research')) return false;
  if (q.includes('sourced lender')) return false;
  if (q.includes('documents realtime') || q.includes('are documents realtime')) return false;
  if (q.includes('start onboarding')) return false;
  if (q.includes('pending approval')) return true;
  if (q.includes('waiting on me')) return true;
  if (q.includes('what needs my approval')) return true;
  if (q.includes('approval')) return true;
  if (q.includes('approve') && (q.includes('waiting') || q.includes('pending') || q.includes('need'))) return true;
  return false;
}

export function composeApprovalCenterHonesty(opts: {
  question?: string;
  match?: EntitledClientCodeMatch;
  entitledCodes?: readonly string[];
  entitledItems?: ApprovalCenterHonestyEntitledItem[];
  overlayApprovalIds?: readonly string[];
}): ApprovalCenterHonesty {
  const entitled = rosterEntitled(opts.entitledCodes ?? ENTITLED_CANONICAL_CLIENT_CODES);
  const match = opts.match
    ?? (opts.question
      ? resolveEntitledClientCodeFromQuestion(opts.question, entitled)
      : { kind: 'none' as const, candidates: [] });
  const scoped = match.kind === 'exact' || match.kind === 'unique_prefix' ? match.clientCode : undefined;
  const askedOutside = Boolean(
    match.kind === 'none'
    && opts.question
    && /\b(SYN01|NORTH01|ZZZ99)\b/i.test(opts.question),
  );
  const overlayIds = new Set(opts.overlayApprovalIds ?? []);

  const pendingItems: ApprovalCenterHonestyItem[] = [];
  for (const row of opts.entitledItems ?? []) {
    const fromOverlay = Boolean(row.fromExistingOverlay || overlayIds.has(row.approvalId));
    const fromTask = Boolean(row.fromOwnerApprovalTask || row.source === 'task');
    const live = fromTask || fromOverlay;
    if (hasInventedFacts([row.title, row.requestedAction, row.clientCode, row.evidenceStatus])) continue;
    const code = entitledCodeOf(row.clientCode, entitled);
    if (row.clientCode && !code) continue;
    if (scoped && code && code !== scoped) continue;
    if (scoped && !code) continue;
    if (scoped && foreignCodesIn(blobOf([row.title, row.requestedAction, row.clientCode, row.approvalId]), scoped).length) {
      continue;
    }
    const source: ApprovalCenterHonestyItem['source'] = fromTask ? 'task' : fromOverlay ? 'overlay' : 'other';
    pendingItems.push({
      approvalId: row.approvalId,
      title: row.title,
      ...(code ? { clientCode: code } : {}),
      requestedAction: row.requestedAction || 'Review entitled pending approval. Do not invent approval or funded state.',
      source,
      classification: classify(row, live),
      liveEvidence: live,
      approved: false,
      funded: false,
    });
  }

  const snapshotEmpty = pendingItems.length === 0;
  const snapshotUnsigned = !(opts.entitledItems ?? []).some((row) =>
    row.fromExistingOverlay || overlayIds.has(row.approvalId),
  );
  const liveEvidence = pendingItems.some((row) => row.liveEvidence);

  const honestyNotes = [
    'already-entitled owner-approval tasks / existing overlay only',
    'amounts not invented',
    'approval or funded state not invented',
    'communications DRAFT_ONLY',
    'auto-respond stays disabled',
    'owner-gated execution remains owner-gated',
  ];
  if (snapshotEmpty) honestyNotes.push('snapshot empty');
  if (snapshotUnsigned) honestyNotes.push('unsigned');
  if (!pendingItems.length) honestyNotes.push('no pending items');
  if (!liveEvidence) honestyNotes.push('LIVE evidence not claimed');

  const items: string[] = [];
  if (match.kind === 'ambiguous') {
    items.push(`Multiple entitled ClientCodes match (${match.candidates.join(', ')}). Atlas does not guess.`);
  }
  if (askedOutside) {
    items.push('Asked ClientCode is outside the entitled roster. Atlas does not invent a sixth client.');
  }
  if (snapshotEmpty && match.kind !== 'ambiguous') {
    items.push(scoped
      ? `No entitled pending approval items are visible for ${scoped}`
      : 'No entitled pending approval items are visible');
  }

  const nextOwnerAction =
    match.kind === 'ambiguous'
      ? 'Name one entitled ClientCode. Atlas does not invent or guess.'
      : scoped
        ? `Review entitled pending approvals for ${scoped}. Owner-gated execution remains owner-gated. Do not invent clients, amounts, lender criteria, or approval or funded state.`
        : 'Review entitled pending approvals. Owner-gated execution remains owner-gated. Do not invent clients, amounts, lender criteria, or approval or funded state.';

  const flags = {
    kind: APPROVAL_CENTER_HONESTY_KIND,
    entitledCodes: entitled,
    pendingItems,
    pendingCount: pendingItems.length,
    liveEvidence,
    snapshotEmpty,
    snapshotUnsigned,
    honestyNotes,
    items,
    communicationPolicy: 'DRAFT_ONLY' as const,
    autoRespond: COMMUNICATIONS_AUTO_RESPOND,
    autoApprove: APPROVAL_CENTER_AUTO_APPROVE,
    execute: APPROVAL_CENTER_HONESTY_EXECUTE,
    ownerGated: APPROVAL_CENTER_HONESTY_OWNER_GATED,
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

export function formatApprovalCenterHonesty(
  pack: ApprovalCenterHonesty,
  scope = pack.clientCode ?? 'Hub',
): string {
  return [
    `Approval Center for ${scope}: ${pack.status}`,
    `kind: ${pack.kind}`,
    pack.clientCode ? `ClientCode: ${pack.clientCode}` : `Entitled roster: ${pack.entitledCodes.join(', ')}`,
    pack.pendingItems.length
      ? `Pending (already-entitled): ${pack.pendingItems.map((row) => `${row.title} (${row.classification})`).join('; ')}`
      : 'No entitled pending approval items are visible.',
    pack.liveEvidence
      ? 'Live Atlas runtime evidence available for entitled owner-approval tasks / existing overlay.'
      : 'LIVE evidence: false. Snapshot is not a live Approval Center claim.',
    pack.snapshotEmpty ? 'Snapshot: empty' : '',
    pack.snapshotUnsigned ? 'Snapshot: unsigned' : '',
    pack.honestyNotes.length ? `Honesty: ${pack.honestyNotes.join('; ')}` : '',
    pack.items.length ? `Open: ${pack.items.join('; ')}` : 'No open approval-center honesty items.',
    `Communication policy: ${pack.communicationPolicy}`,
    'AUTO_APPROVE: false',
    'Execute: false',
    `Next owner action: ${pack.nextOwnerAction}`,
    'Atlas did not invent clients, amounts, lender criteria, or approval or funded state.',
    'Atlas did not auto-approve, send mail, or execute.',
  ]
    .filter(Boolean)
    .join('\n');
}

export function answerApprovalCenterHonesty(
  question: string,
  extras?: {
    entitledCodes?: readonly string[];
    entitledItems?: ApprovalCenterHonestyEntitledItem[];
    overlayApprovalIds?: readonly string[];
  },
): string {
  const pack = composeApprovalCenterHonesty({
    question,
    entitledCodes: extras?.entitledCodes,
    entitledItems: extras?.entitledItems,
    overlayApprovalIds: extras?.overlayApprovalIds,
  });
  return formatApprovalCenterHonesty(pack, pack.clientCode ?? 'Hub');
}
