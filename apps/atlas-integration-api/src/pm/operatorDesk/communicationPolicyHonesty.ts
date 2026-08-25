/**
 * Hub-only Ask Atlas honesty for Communication Policy Center /
 * comms policy / auto-respond questions. Surfaces already-recorded
 * entitled overlay rows only. Never invents emails, contacts, clients,
 * or send receipts. AUTO_RESPOND stays globally false. Communications
 * stay DRAFT_ONLY. Empty/unsigned snapshots are not LIVE. Does not send.
 */

import {
  ENTITLED_CANONICAL_CLIENT_CODES,
  resolveEntitledClientCodeFromQuestion,
  type EntitledClientCodeMatch,
} from './clientOnboardingAutomation.ts';
import { mapsToCommunicationPolicyIntent } from './communicationPolicyCenter.ts';
import {
  ASK_ATLAS_COMMUNICATION_POLICY_HONESTY_MISSION_KEY,
  COMMUNICATIONS_AUTO_RESPOND,
  COMMUNICATIONS_POLICY_CLASS,
  COMMUNICATIONS_SEND,
} from './types.ts';

export const COMMUNICATION_POLICY_HONESTY_KIND = 'communication_policy_honesty_v1' as const;
export const COMMUNICATION_POLICY_HONESTY_MISSION_KEY =
  ASK_ATLAS_COMMUNICATION_POLICY_HONESTY_MISSION_KEY;

export const COMMUNICATION_POLICY_HONESTY_SEND = COMMUNICATIONS_SEND;
export const COMMUNICATION_POLICY_HONESTY_AUTO_RESPOND = COMMUNICATIONS_AUTO_RESPOND;
export const COMMUNICATION_POLICY_HONESTY_LIVE_GTM_OUTBOUND = false as const;

export type CommunicationPolicyHonestyClassification =
  | 'CONFIRMED'
  | 'LIKELY'
  | 'PROPOSED'
  | 'STALE_OR_UNCERTAIN';

export type CommunicationPolicyHonestyScopeKind = 'org' | 'client' | 'domain' | 'contact';
export type CommunicationPolicyHonestyMode = 'DRAFT_ONLY' | 'REQUIRE_APPROVAL' | 'AUTO_RESPOND';

export type CommunicationPolicyHonestyEntitledItem = {
  policyId: string;
  scopeKind: CommunicationPolicyHonestyScopeKind;
  mode?: string;
  clientCode?: string;
  domain?: string;
  contact?: string;
  fromExistingOverlay?: boolean;
};

export type CommunicationPolicyHonestyItem = {
  policyId: string;
  scopeKind: CommunicationPolicyHonestyScopeKind;
  mode: CommunicationPolicyHonestyMode;
  clientCode?: string;
  domain?: string;
  contact?: string;
  classification: CommunicationPolicyHonestyClassification;
  liveEvidence: boolean;
  send: false;
};

export type CommunicationPolicyHonesty = {
  kind: typeof COMMUNICATION_POLICY_HONESTY_KIND;
  status: 'NOT_READY' | 'CLEAR' | 'OPEN' | 'BLOCKED';
  ready: boolean;
  clientCode?: string;
  entitledCodes: string[];
  recordedPolicies: CommunicationPolicyHonestyItem[];
  recordedCount: number;
  liveEvidence: boolean;
  snapshotEmpty: boolean;
  snapshotUnsigned: boolean;
  honestyNotes: string[];
  items: string[];
  communicationPolicy: typeof COMMUNICATIONS_POLICY_CLASS;
  autoRespond: typeof COMMUNICATIONS_AUTO_RESPOND;
  nextOwnerAction: string;
  send: false;
  outbound: false;
  liveGtmOutbound: false;
  capitalSubmit: false;
  invented: false;
};

const FOREIGN_CODE = /(?:^|[^A-Z0-9])(PDG01|ACCG01|CCB01|HFD01|LIEN01)(?:[^A-Z0-9]|$)/g;
const ACCG_TOKEN = /(?:^|[^A-Z0-9])ACCG(?:[^A-Z0-9]|$)/;
const INVENTED_EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const INVENTED_SEND_RECEIPT =
  /(?:\bsent mail\b|\bauto-send complete\b|\bdelivery receipt\b|\bmessage-id\b|\boutbound sent\b|\bsend receipt\b)/i;
const INVENTED_AMOUNT = /\$[\d,]+|\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b/;
const ALLOWED_MODES = new Set<CommunicationPolicyHonestyMode>([
  'DRAFT_ONLY',
  'REQUIRE_APPROVAL',
  'AUTO_RESPOND',
]);

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
  return INVENTED_SEND_RECEIPT.test(blob) || INVENTED_AMOUNT.test(blob);
}

function normalizeMode(mode: string | undefined): CommunicationPolicyHonestyMode | undefined {
  const raw = (mode || '').trim().toUpperCase();
  return ALLOWED_MODES.has(raw as CommunicationPolicyHonestyMode)
    ? (raw as CommunicationPolicyHonestyMode)
    : undefined;
}

function itemLiveEligible(item: CommunicationPolicyHonestyEntitledItem): boolean {
  return Boolean(item.fromExistingOverlay);
}

export function mapsToCommunicationPolicyHonestyIntent(question: string): boolean {
  const q = question.toLowerCase();
  if (q.includes('capital submission') || q.includes('submission package')) return false;
  if (q.includes('prepare capital') || q.includes('submit to lender') || q.includes('lender package')) return false;
  if (q.includes('research intelligence') || q.includes('what do we know from research')) return false;
  if (q.includes('sourced lender')) return false;
  if (q.includes('documents realtime') || q.includes('are documents realtime')) return false;
  if (q.includes('start onboarding')) return false;
  if (q.includes('pending approval') || q.includes('waiting on me') || q.includes('what needs my approval')) {
    return false;
  }
  if (q.includes('approval') && !q.includes('communication policy') && !q.includes('comms policy')) {
    return false;
  }
  return mapsToCommunicationPolicyIntent(question);
}

export function composeCommunicationPolicyHonesty(opts: {
  question?: string;
  match?: EntitledClientCodeMatch;
  entitledCodes?: readonly string[];
  entitledRecords?: CommunicationPolicyHonestyEntitledItem[];
  overlayPolicyIds?: readonly string[];
}): CommunicationPolicyHonesty {
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
  const overlayIds = new Set(opts.overlayPolicyIds ?? []);

  const recordedPolicies: CommunicationPolicyHonestyItem[] = [];
  for (const row of opts.entitledRecords ?? []) {
    const fromOverlay = Boolean(row.fromExistingOverlay || overlayIds.has(row.policyId));
    const live = fromOverlay && itemLiveEligible({ ...row, fromExistingOverlay: fromOverlay });
    const mode = normalizeMode(row.mode);
    if (!mode) continue;
    if (hasInventedFacts([row.policyId, row.domain, row.contact, row.clientCode, row.mode])) continue;
    if (INVENTED_EMAIL.test(`${row.domain || ''} ${row.contact || ''}`) && !fromOverlay) continue;
    const code = entitledCodeOf(row.clientCode, entitled);
    if (row.clientCode && !code) continue;
    if (scoped && row.scopeKind === 'org') continue;
    if (scoped && code && code !== scoped) continue;
    if (scoped && row.scopeKind !== 'org' && !code) continue;
    if (scoped && foreignCodesIn(blobOf([row.policyId, row.domain, row.contact, row.clientCode]), scoped).length) {
      continue;
    }
    recordedPolicies.push({
      policyId: row.policyId,
      scopeKind: row.scopeKind,
      mode,
      ...(code ? { clientCode: code } : {}),
      ...(row.domain && fromOverlay ? { domain: row.domain } : {}),
      ...(row.contact && fromOverlay ? { contact: row.contact } : {}),
      classification: live ? 'PROPOSED' : 'STALE_OR_UNCERTAIN',
      liveEvidence: live,
      send: false,
    });
  }

  const snapshotEmpty = recordedPolicies.length === 0;
  const snapshotUnsigned = !(opts.entitledRecords ?? []).some((row) =>
    row.fromExistingOverlay || overlayIds.has(row.policyId),
  );
  const liveEvidence = !snapshotEmpty && !snapshotUnsigned && recordedPolicies.some((row) => row.liveEvidence);

  const honestyNotes = [
    'already-recorded entitled communication policies only',
    'emails not invented',
    'contacts not invented',
    'clients not invented',
    'send receipts not invented',
    'communications DRAFT_ONLY',
    'auto-respond stays disabled',
  ];
  if (snapshotEmpty) honestyNotes.push('snapshot empty');
  if (snapshotUnsigned) honestyNotes.push('unsigned');
  if (!recordedPolicies.length) honestyNotes.push('no recorded policies');
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
      ? `No recorded communication policy is visible for ${scoped}`
      : 'No recorded communication policy is visible');
  }

  const nextOwnerAction =
    match.kind === 'ambiguous'
      ? 'Name one entitled ClientCode. Atlas does not invent or guess.'
      : scoped
        ? `Review recorded communication policy for ${scoped}. Organization default remains DRAFT_ONLY. AUTO_RESPOND is not globally enabled. Do not invent emails, contacts, clients, or send receipts.`
        : 'Review recorded communication policy. Organization default remains DRAFT_ONLY. AUTO_RESPOND is not globally enabled. Do not invent emails, contacts, clients, or send receipts.';

  const flags = {
    kind: COMMUNICATION_POLICY_HONESTY_KIND,
    entitledCodes: entitled,
    recordedPolicies,
    recordedCount: recordedPolicies.length,
    liveEvidence,
    snapshotEmpty,
    snapshotUnsigned,
    honestyNotes,
    items,
    communicationPolicy: COMMUNICATIONS_POLICY_CLASS,
    autoRespond: COMMUNICATIONS_AUTO_RESPOND,
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

export function formatCommunicationPolicyHonesty(
  pack: CommunicationPolicyHonesty,
  scope = pack.clientCode ?? 'Hub',
): string {
  return [
    `Communication policy for ${scope}: ${pack.status}`,
    `kind: ${pack.kind}`,
    pack.clientCode ? `ClientCode: ${pack.clientCode}` : `Entitled roster: ${pack.entitledCodes.join(', ')}`,
    pack.recordedPolicies.length
      ? `Recorded (already-entitled): ${pack.recordedPolicies.map((row) => {
          const label = row.clientCode || row.domain || row.contact || row.scopeKind;
          return `${label}: ${row.mode}`;
        }).join('; ')}`
      : 'No recorded communication policy is visible.',
    pack.liveEvidence
      ? 'Live Atlas runtime evidence available for entitled recorded overlay rows.'
      : 'LIVE evidence: false. Snapshot is not a live Communication Policy Center claim.',
    pack.snapshotEmpty ? 'Snapshot: empty' : '',
    pack.snapshotUnsigned ? 'Snapshot: unsigned' : '',
    pack.honestyNotes.length ? `Honesty: ${pack.honestyNotes.join('; ')}` : '',
    pack.items.length ? `Open: ${pack.items.join('; ')}` : 'No open communication-policy honesty items.',
    `Communication policy: ${pack.communicationPolicy}`,
    'AUTO_RESPOND: false',
    `Next owner action: ${pack.nextOwnerAction}`,
    'Atlas did not invent emails, contacts, clients, or send receipts.',
    'Atlas did not send mail, auto-respond, or launch GTM.',
  ]
    .filter(Boolean)
    .join('\n');
}

export function answerCommunicationPolicyHonesty(
  question: string,
  extras?: {
    entitledCodes?: readonly string[];
    entitledRecords?: CommunicationPolicyHonestyEntitledItem[];
    overlayPolicyIds?: readonly string[];
  },
): string {
  const pack = composeCommunicationPolicyHonesty({
    question,
    entitledCodes: extras?.entitledCodes,
    entitledRecords: extras?.entitledRecords,
    overlayPolicyIds: extras?.overlayPolicyIds,
  });
  return formatCommunicationPolicyHonesty(pack, pack.clientCode ?? 'Hub');
}
