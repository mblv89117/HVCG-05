/**
 * Hub-only Ask Atlas honesty for client support / routing questions.
 * Surfaces already-entitled client-support agent rows only. Never invents
 * clients, tickets, Hub-MI rows, or send receipts. AUTO_RESPOND stays
 * false. Reply, reassign, close, and send stay OWNER-GATED / draft-only.
 * Empty/unsigned snapshots are not LIVE. Does not send or execute.
 * Does not rebuild a support product.
 */

import {
  ENTITLED_CANONICAL_CLIENT_CODES,
  resolveEntitledClientCodeFromQuestion,
  type EntitledClientCodeMatch,
} from './clientOnboardingAutomation.ts';
import {
  ASK_ATLAS_CLIENT_SUPPORT_HONESTY_MISSION_KEY,
  CLIENT_SUPPORT_AGENT_AUTO_RESPOND,
  CLIENT_SUPPORT_AGENT_DRAFT_ONLY,
  CLIENT_SUPPORT_AGENT_EXECUTE,
  CLIENT_SUPPORT_AGENT_HUB_MI,
  CLIENT_SUPPORT_AGENT_OWNER_GATED,
  CLIENT_SUPPORT_AGENT_POLICY_CLASS,
  CLIENT_SUPPORT_AGENT_SEND,
  type ClientSupportEvidenceKind,
} from './types.ts';

export const CLIENT_SUPPORT_HONESTY_KIND = 'client_support_honesty_v1' as const;
export const CLIENT_SUPPORT_HONESTY_MISSION_KEY = ASK_ATLAS_CLIENT_SUPPORT_HONESTY_MISSION_KEY;

export const CLIENT_SUPPORT_HONESTY_SEND = CLIENT_SUPPORT_AGENT_SEND;
export const CLIENT_SUPPORT_HONESTY_AUTO_RESPOND = CLIENT_SUPPORT_AGENT_AUTO_RESPOND;
export const CLIENT_SUPPORT_HONESTY_EXECUTE = CLIENT_SUPPORT_AGENT_EXECUTE;
export const CLIENT_SUPPORT_HONESTY_HUB_MI = CLIENT_SUPPORT_AGENT_HUB_MI;
export const CLIENT_SUPPORT_HONESTY_OWNER_GATED = CLIENT_SUPPORT_AGENT_OWNER_GATED;
export const CLIENT_SUPPORT_HONESTY_DRAFT_ONLY = CLIENT_SUPPORT_AGENT_DRAFT_ONLY;

export type ClientSupportHonestyClassification =
  | 'CONFIRMED'
  | 'LIKELY'
  | 'PROPOSED'
  | 'STALE_OR_UNCERTAIN';

export type ClientSupportHonestyEntitledItem = {
  supportId: string;
  title: string;
  clientCode?: string;
  evidenceKind?: string;
  suggestedRoute?: string;
  fromExistingSupport?: boolean;
  fromExistingOverlay?: boolean;
};

export type ClientSupportHonestyItem = {
  supportId: string;
  title: string;
  clientCode?: string;
  evidenceKind: ClientSupportEvidenceKind;
  suggestedRoute: string;
  classification: ClientSupportHonestyClassification;
  liveEvidence: boolean;
  hubMiRow: false;
  send: false;
  execute: false;
  autoRespond: false;
};

export type ClientSupportHonesty = {
  kind: typeof CLIENT_SUPPORT_HONESTY_KIND;
  status: 'NOT_READY' | 'CLEAR' | 'OPEN' | 'BLOCKED';
  ready: boolean;
  clientCode?: string;
  entitledCodes: string[];
  recordedItems: ClientSupportHonestyItem[];
  recordedCount: number;
  liveEvidence: boolean;
  snapshotEmpty: boolean;
  snapshotUnsigned: boolean;
  honestyNotes: string[];
  items: string[];
  policyClass: typeof CLIENT_SUPPORT_AGENT_POLICY_CLASS;
  communicationPolicy: 'DRAFT_ONLY';
  autoRespond: typeof CLIENT_SUPPORT_AGENT_AUTO_RESPOND;
  execute: typeof CLIENT_SUPPORT_AGENT_EXECUTE;
  send: typeof CLIENT_SUPPORT_AGENT_SEND;
  ownerGated: typeof CLIENT_SUPPORT_AGENT_OWNER_GATED;
  hubMi: typeof CLIENT_SUPPORT_AGENT_HUB_MI;
  draftOnly: typeof CLIENT_SUPPORT_AGENT_DRAFT_ONLY;
  nextOwnerAction: string;
  outbound: false;
  liveGtmOutbound: false;
  capitalSubmit: false;
  invented: false;
};

const FOREIGN_CODE = /(?:^|[^A-Z0-9])(PDG01|ACCG01|CCB01|HFD01|LIEN01)(?:[^A-Z0-9]|$)/g;
const ACCG_TOKEN = /(?:^|[^A-Z0-9])ACCG(?:[^A-Z0-9]|$)/;
const INVENTED_SEND_RECEIPT =
  /(?:\bsent mail\b|\bauto-send complete\b|\bdelivery receipt\b|\bmessage-id\b|\boutbound sent\b|\bsend receipt\b)/i;
const INVENTED_HUB_MI = /(?:\bhub[-\s]?mi(?:\s+row)?\b)/i;
const INVENTED_TICKET = /(?:\binvented ticket\b|\bticket\s*#\s*\d+\b|\bJIRA-[A-Z0-9]+\b)/i;
const INVENTED_EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const INVENTED_AMOUNT = /\$[\d,]+|\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b/;
const ALLOWED_KINDS = new Set<ClientSupportEvidenceKind>([
  'communication',
  'task',
  'meeting',
  'decision',
  'deliverable',
  'queue_item',
  'recovered_client',
]);
const COPIED_ROUTES = new Set([
  'Overdue',
  'Blocked',
  'Decision Required',
  'Needs Action',
  'At Risk',
  'Waiting',
  'Ready',
]);
const OWNER_REVIEW_ROUTE = 'Owner review';

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
  return (
    INVENTED_SEND_RECEIPT.test(blob)
    || INVENTED_HUB_MI.test(blob)
    || INVENTED_TICKET.test(blob)
    || INVENTED_AMOUNT.test(blob)
  );
}

function normalizeKind(kind: string | undefined): ClientSupportEvidenceKind | undefined {
  const raw = (kind || '').trim();
  return ALLOWED_KINDS.has(raw as ClientSupportEvidenceKind)
    ? (raw as ClientSupportEvidenceKind)
    : undefined;
}

function copiedRoute(route: string | undefined): string {
  const raw = (route || '').trim();
  if (raw && COPIED_ROUTES.has(raw)) return raw;
  return OWNER_REVIEW_ROUTE;
}

export function mapsToClientSupportHonestyIntent(question: string): boolean {
  const q = question.toLowerCase();
  if (q.includes('capital submission') || q.includes('submission package')) return false;
  if (q.includes('prepare capital') || q.includes('submit to lender') || q.includes('lender package')) return false;
  if (q.includes('research intelligence') || q.includes('what do we know from research')) return false;
  if (q.includes('sourced lender')) return false;
  if (q.includes('documents realtime') || q.includes('are documents realtime')) return false;
  if (q.includes('start onboarding')) return false;
  if (q.includes('communication policy') || q.includes('comms policy')) return false;
  if (q.includes('auto-respond') || q.includes('auto respond')) return false;
  if (q.includes('pending approval') || q.includes('waiting on me') || q.includes('what needs my approval')) {
    return false;
  }
  if (q.includes('approval')) return false;
  if (q.includes('client support')) return true;
  if (q.includes('support ticket') || q.includes('support tickets')) return true;
  if (q.includes('help desk') || q.includes('helpdesk')) return true;
  if (q.includes('support routing') || q.includes('ticket routing') || q.includes('client routing')) return true;
  if (q.includes('open tickets') || q.includes('open support')) return true;
  if (q.includes('support item')) return true;
  if (q.includes('who should handle') && (q.includes('support') || q.includes('ticket'))) return true;
  return false;
}

export function composeClientSupportHonesty(opts: {
  question?: string;
  match?: EntitledClientCodeMatch;
  entitledCodes?: readonly string[];
  entitledItems?: ClientSupportHonestyEntitledItem[];
  overlaySupportIds?: readonly string[];
}): ClientSupportHonesty {
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
  const overlayIds = new Set(opts.overlaySupportIds ?? []);

  const recordedItems: ClientSupportHonestyItem[] = [];
  for (const row of opts.entitledItems ?? []) {
    const fromOverlay = Boolean(row.fromExistingOverlay || overlayIds.has(row.supportId));
    const fromSupport = Boolean(row.fromExistingSupport);
    const live = fromSupport || fromOverlay;
    const kind = normalizeKind(row.evidenceKind);
    if (!kind) continue;
    if (hasInventedFacts([row.supportId, row.title, row.clientCode, row.suggestedRoute, row.evidenceKind])) {
      continue;
    }
    if (INVENTED_EMAIL.test(row.title) && !fromSupport && !fromOverlay) continue;
    const code = entitledCodeOf(row.clientCode, entitled);
    if (row.clientCode && !code) continue;
    if (scoped && code && code !== scoped) continue;
    if (scoped && !code) continue;
    if (scoped && foreignCodesIn(blobOf([row.title, row.suggestedRoute, row.clientCode, row.supportId]), scoped).length) {
      continue;
    }
    recordedItems.push({
      supportId: row.supportId,
      title: row.title,
      ...(code ? { clientCode: code } : {}),
      evidenceKind: kind,
      suggestedRoute: copiedRoute(row.suggestedRoute),
      classification: live ? 'PROPOSED' : 'STALE_OR_UNCERTAIN',
      liveEvidence: live,
      hubMiRow: false,
      send: false,
      execute: false,
      autoRespond: false,
    });
  }

  const snapshotEmpty = recordedItems.length === 0;
  const snapshotUnsigned = !(opts.entitledItems ?? []).some((row) =>
    row.fromExistingSupport || row.fromExistingOverlay || overlayIds.has(row.supportId),
  );
  const liveEvidence = !snapshotEmpty && !snapshotUnsigned && recordedItems.some((row) => row.liveEvidence);

  const honestyNotes = [
    'already-entitled client support / routing rows only',
    'clients not invented',
    'tickets not invented',
    'Hub-MI rows not invented',
    'send receipts not invented',
    'communications DRAFT_ONLY',
    'auto-respond stays disabled',
    'owner-gated execution remains owner-gated',
  ];
  if (snapshotEmpty) honestyNotes.push('snapshot empty');
  if (snapshotUnsigned) honestyNotes.push('unsigned');
  if (!recordedItems.length) honestyNotes.push('no recorded support items');
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
      ? `No entitled client support items are visible for ${scoped}`
      : 'No entitled client support items are visible');
  }

  const nextOwnerAction =
    match.kind === 'ambiguous'
      ? 'Name one entitled ClientCode. Atlas does not invent or guess.'
      : scoped
        ? `Review entitled client support / routing for ${scoped}. Reply, reassign, close, and send remain owner-gated. Do not invent clients, tickets, Hub-MI rows, or send receipts.`
        : 'Review entitled client support / routing. Reply, reassign, close, and send remain owner-gated. Do not invent clients, tickets, Hub-MI rows, or send receipts.';

  const flags = {
    kind: CLIENT_SUPPORT_HONESTY_KIND,
    entitledCodes: entitled,
    recordedItems,
    recordedCount: recordedItems.length,
    liveEvidence,
    snapshotEmpty,
    snapshotUnsigned,
    honestyNotes,
    items,
    policyClass: CLIENT_SUPPORT_AGENT_POLICY_CLASS,
    communicationPolicy: 'DRAFT_ONLY' as const,
    autoRespond: CLIENT_SUPPORT_AGENT_AUTO_RESPOND,
    execute: CLIENT_SUPPORT_AGENT_EXECUTE,
    send: CLIENT_SUPPORT_AGENT_SEND,
    ownerGated: CLIENT_SUPPORT_AGENT_OWNER_GATED,
    hubMi: CLIENT_SUPPORT_AGENT_HUB_MI,
    draftOnly: CLIENT_SUPPORT_AGENT_DRAFT_ONLY,
    nextOwnerAction,
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

export function formatClientSupportHonesty(
  pack: ClientSupportHonesty,
  scope = pack.clientCode ?? 'Hub',
): string {
  return [
    `Client support for ${scope}: ${pack.status}`,
    `kind: ${pack.kind}`,
    pack.clientCode ? `ClientCode: ${pack.clientCode}` : `Entitled roster: ${pack.entitledCodes.join(', ')}`,
    pack.recordedItems.length
      ? `Recorded (already-entitled): ${pack.recordedItems.map((row) => {
          const label = row.clientCode || row.evidenceKind;
          return `${label}: ${row.title}`;
        }).join('; ')}`
      : 'No entitled client support items are visible.',
    pack.liveEvidence
      ? 'Live Atlas runtime evidence available for entitled recorded support items.'
      : 'LIVE evidence: false. Snapshot is not a live client support claim.',
    pack.snapshotEmpty ? 'Snapshot: empty' : '',
    pack.snapshotUnsigned ? 'Snapshot: unsigned' : '',
    pack.honestyNotes.length ? `Honesty: ${pack.honestyNotes.join('; ')}` : '',
    pack.items.length ? `Open: ${pack.items.join('; ')}` : 'No open client-support honesty items.',
    `Policy class: ${pack.policyClass}`,
    `Communication policy: ${pack.communicationPolicy}`,
    'AUTO_RESPOND: false',
    'Execute: false',
    'Hub-MI: false',
    `Next owner action: ${pack.nextOwnerAction}`,
    'Atlas did not invent clients, tickets, Hub-MI rows, or send receipts.',
    'Atlas did not send mail, auto-respond, or execute routing.',
  ]
    .filter(Boolean)
    .join('\n');
}

export function answerClientSupportHonesty(
  question: string,
  extras?: {
    entitledCodes?: readonly string[];
    entitledItems?: ClientSupportHonestyEntitledItem[];
    overlaySupportIds?: readonly string[];
  },
): string {
  const pack = composeClientSupportHonesty({
    question,
    entitledCodes: extras?.entitledCodes,
    entitledItems: extras?.entitledItems,
    overlaySupportIds: extras?.overlaySupportIds,
  });
  return formatClientSupportHonesty(pack, pack.clientCode ?? 'Hub');
}
