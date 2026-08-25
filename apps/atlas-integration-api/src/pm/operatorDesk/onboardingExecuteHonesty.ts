/**
 * Hub-only Ask Atlas honesty for onboarding status vs execute questions.
 * Status questions never claim LIVE execution and never call execute.
 * Execute answers never invent ClientCodes, workspaces, projects, or Hub-MI.
 * Execute stays entitled-only (PDG01, ACCG01, CCB01, HFD01, LIEN01).
 * Empty/unsigned snapshots are not LIVE. Client A never receives Client B.
 * Capital, approval, communication-policy, and client-support honesty win first.
 * Reuses askAtlasOnboardingExecute / clientOnboardingAutomation / onboardingAgent.
 * Does not rebuild onboarding.
 */

import { mapsToApprovalCenterHonestyIntent } from './approvalCenterHonesty.ts';
import { mapsToCapitalSubmissionHonestyIntent } from './capitalSubmissionHonesty.ts';
import { mapsToClientSupportHonestyIntent } from './clientSupportHonesty.ts';
import { mapsToCommunicationPolicyHonestyIntent } from './communicationPolicyHonesty.ts';
import {
  ENTITLED_CANONICAL_CLIENT_CODES,
  classifyOnboardingAskAtlasIntent,
  mapsToRealtimeDocumentsHonestyIntent,
  resolveEntitledClientCodeFromQuestion,
  type EntitledClientCodeMatch,
} from './clientOnboardingAutomation.ts';
import {
  ASK_ATLAS_ONBOARDING_EXECUTE_HONESTY_MISSION_KEY,
  COMMUNICATIONS_AUTO_RESPOND,
  ONBOARDING_AGENT_ACTIVATE,
  ONBOARDING_AGENT_EXECUTE,
  ONBOARDING_AGENT_HUB_MI,
  ONBOARDING_AGENT_LIVE_GTM_OUTBOUND,
  ONBOARDING_AGENT_OWNER_GATED,
  ONBOARDING_AGENT_POLICY_CLASS,
  ONBOARDING_AGENT_SEND,
} from './types.ts';

export const ONBOARDING_EXECUTE_HONESTY_KIND = 'onboarding_execute_honesty_v1' as const;
export const ONBOARDING_EXECUTE_HONESTY_MISSION_KEY =
  ASK_ATLAS_ONBOARDING_EXECUTE_HONESTY_MISSION_KEY;

export const ONBOARDING_EXECUTE_HONESTY_SEND = ONBOARDING_AGENT_SEND;
export const ONBOARDING_EXECUTE_HONESTY_AUTO_RESPOND = COMMUNICATIONS_AUTO_RESPOND;
export const ONBOARDING_EXECUTE_HONESTY_EXECUTE = ONBOARDING_AGENT_EXECUTE;
export const ONBOARDING_EXECUTE_HONESTY_ACTIVATE = ONBOARDING_AGENT_ACTIVATE;
export const ONBOARDING_EXECUTE_HONESTY_HUB_MI = ONBOARDING_AGENT_HUB_MI;
export const ONBOARDING_EXECUTE_HONESTY_OWNER_GATED = ONBOARDING_AGENT_OWNER_GATED;
export const ONBOARDING_EXECUTE_HONESTY_LIVE_GTM_OUTBOUND = ONBOARDING_AGENT_LIVE_GTM_OUTBOUND;

export type OnboardingExecuteHonestyIntent = 'status' | 'execute';

export type OnboardingExecuteHonestyClassification =
  | 'CONFIRMED'
  | 'LIKELY'
  | 'PROPOSED'
  | 'STALE_OR_UNCERTAIN';

export type OnboardingExecuteHonestyEntitledItem = {
  runId: string;
  title: string;
  clientCode?: string;
  workspace?: string;
  projectName?: string;
  status?: string;
  fromExistingOverlay?: boolean;
  fromExistingRun?: boolean;
};

export type OnboardingExecuteHonestyItem = {
  runId: string;
  title: string;
  clientCode?: string;
  workspace?: string;
  projectName?: string;
  classification: OnboardingExecuteHonestyClassification;
  liveEvidence: boolean;
  liveExecution: false;
  hubMiRow: false;
  send: false;
  execute: false;
  autoRespond: false;
};

export type OnboardingExecuteHonesty = {
  kind: typeof ONBOARDING_EXECUTE_HONESTY_KIND;
  intent: OnboardingExecuteHonestyIntent;
  status: 'NOT_READY' | 'CLEAR' | 'OPEN' | 'BLOCKED';
  ready: boolean;
  clientCode?: string;
  entitledCodes: string[];
  recordedItems: OnboardingExecuteHonestyItem[];
  recordedCount: number;
  liveEvidence: boolean;
  liveExecution: false;
  mayExecute: boolean;
  snapshotEmpty: boolean;
  snapshotUnsigned: boolean;
  honestyNotes: string[];
  items: string[];
  policyClass: typeof ONBOARDING_AGENT_POLICY_CLASS;
  communicationPolicy: 'DRAFT_ONLY';
  autoRespond: typeof COMMUNICATIONS_AUTO_RESPOND;
  execute: typeof ONBOARDING_AGENT_EXECUTE;
  activate: typeof ONBOARDING_AGENT_ACTIVATE;
  send: typeof ONBOARDING_AGENT_SEND;
  ownerGated: typeof ONBOARDING_AGENT_OWNER_GATED;
  hubMi: typeof ONBOARDING_AGENT_HUB_MI;
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
const INVENTED_WORKSPACE =
  /(?:\binvented workspace\b|\bfake workspace\b|\bcreated workspace\b|\bnew workspace for\b)/i;
const INVENTED_PROJECT =
  /(?:\binvented project\b|\bfake project\b|\bcreated project\b|\bnew project for\b)/i;
const INVENTED_AMOUNT = /\$[\d,]+|\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b/;

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
    || INVENTED_WORKSPACE.test(blob)
    || INVENTED_PROJECT.test(blob)
    || INVENTED_AMOUNT.test(blob)
  );
}

export function mapsToOnboardingExecuteHonestyIntent(question: string): boolean {
  if (mapsToCapitalSubmissionHonestyIntent(question)) return false;
  if (mapsToApprovalCenterHonestyIntent(question)) return false;
  if (mapsToCommunicationPolicyHonestyIntent(question)) return false;
  if (mapsToClientSupportHonestyIntent(question)) return false;
  if (mapsToRealtimeDocumentsHonestyIntent(question)) return false;
  return classifyOnboardingAskAtlasIntent(question) !== null;
}

export function classifyOnboardingExecuteHonestyIntent(
  question: string,
): OnboardingExecuteHonestyIntent | null {
  if (!mapsToOnboardingExecuteHonestyIntent(question)) return null;
  return classifyOnboardingAskAtlasIntent(question);
}

export function mapsToOnboardingStatusHonestyIntent(question: string): boolean {
  return classifyOnboardingExecuteHonestyIntent(question) === 'status';
}

export function mapsToOnboardingExecuteHonestyExecuteIntent(question: string): boolean {
  return classifyOnboardingExecuteHonestyIntent(question) === 'execute';
}

export function onboardingHonestyShouldCallExecute(pack: OnboardingExecuteHonesty): boolean {
  return pack.intent === 'execute' && pack.mayExecute;
}

export function composeOnboardingExecuteHonesty(opts: {
  question?: string;
  match?: EntitledClientCodeMatch;
  entitledCodes?: readonly string[];
  entitledItems?: OnboardingExecuteHonestyEntitledItem[];
  overlayRunIds?: readonly string[];
}): OnboardingExecuteHonesty {
  const entitled = rosterEntitled(opts.entitledCodes ?? ENTITLED_CANONICAL_CLIENT_CODES);
  const question = opts.question ?? '';
  const intent: OnboardingExecuteHonestyIntent =
    classifyOnboardingAskAtlasIntent(question) === 'execute' ? 'execute' : 'status';
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
  const overlayIds = new Set(opts.overlayRunIds ?? []);

  const recordedItems: OnboardingExecuteHonestyItem[] = [];
  for (const row of opts.entitledItems ?? []) {
    const fromOverlay = Boolean(row.fromExistingOverlay || overlayIds.has(row.runId));
    const fromRun = Boolean(row.fromExistingRun);
    const live = fromOverlay || fromRun;
    if (hasInventedFacts([
      row.runId,
      row.title,
      row.clientCode,
      row.workspace,
      row.projectName,
      row.status,
    ])) {
      continue;
    }
    const code = entitledCodeOf(row.clientCode, entitled);
    if (row.clientCode && !code) continue;
    if (scoped && code && code !== scoped) continue;
    if (scoped && !code) continue;
    if (scoped && foreignCodesIn(blobOf([
      row.title,
      row.workspace,
      row.projectName,
      row.clientCode,
      row.runId,
    ]), scoped).length) {
      continue;
    }
    const workspace = row.workspace?.trim();
    const projectName = row.projectName?.trim();
    recordedItems.push({
      runId: row.runId,
      title: row.title,
      ...(code ? { clientCode: code } : {}),
      ...(workspace && live ? { workspace } : {}),
      ...(projectName && live ? { projectName } : {}),
      classification: live ? 'PROPOSED' : 'STALE_OR_UNCERTAIN',
      liveEvidence: live,
      liveExecution: false,
      hubMiRow: false,
      send: false,
      execute: false,
      autoRespond: false,
    });
  }

  const snapshotEmpty = recordedItems.length === 0;
  const snapshotUnsigned = !(opts.entitledItems ?? []).some((row) =>
    row.fromExistingOverlay || row.fromExistingRun || overlayIds.has(row.runId),
  );
  const liveEvidence = !snapshotEmpty && !snapshotUnsigned && recordedItems.some((row) => row.liveEvidence);
  const mayExecute = intent === 'execute' && Boolean(scoped) && match.kind !== 'ambiguous';

  const honestyNotes = [
    intent === 'status'
      ? 'status questions do not execute onboarding'
      : 'execute remains entitled-only',
    'already-entitled onboarding overlay rows only',
    'ClientCodes not invented',
    'workspaces not invented',
    'projects not invented',
    'Hub-MI rows not invented',
    'send receipts not invented',
    'communications DRAFT_ONLY',
    'auto-respond stays disabled',
    'owner-gated activation remains owner-gated',
  ];
  if (snapshotEmpty) honestyNotes.push('snapshot empty');
  if (snapshotUnsigned) honestyNotes.push('unsigned');
  if (!recordedItems.length) honestyNotes.push('no recorded onboarding runs');
  if (!liveEvidence) honestyNotes.push('LIVE evidence not claimed');
  honestyNotes.push('LIVE execution not claimed');

  const items: string[] = [];
  if (match.kind === 'ambiguous') {
    items.push(`Multiple entitled ClientCodes match (${match.candidates.join(', ')}). Atlas does not guess.`);
  }
  if (askedOutside) {
    items.push('Asked ClientCode is outside the entitled roster. Atlas does not invent a sixth client.');
  }
  if (snapshotEmpty && match.kind !== 'ambiguous') {
    items.push(scoped
      ? `No entitled onboarding run is visible for ${scoped}`
      : 'No entitled onboarding run is visible');
  }
  if (intent === 'execute' && !mayExecute && match.kind !== 'ambiguous' && !askedOutside) {
    items.push('Execute stays entitled-only. Name one entitled ClientCode. Atlas does not invent or execute.');
  }

  const nextOwnerAction =
    match.kind === 'ambiguous'
      ? 'Name one entitled ClientCode. Atlas does not invent or guess.'
      : intent === 'execute' && !mayExecute
        ? 'Name one entitled ClientCode from the roster. Atlas does not invent ClientCodes, workspaces, projects, or Hub-MI, and does not execute.'
        : scoped
          ? intent === 'status'
            ? `Review entitled onboarding status for ${scoped}. Status is not LIVE execution. Do not invent ClientCodes, workspaces, projects, or Hub-MI.`
            : `Review entitled onboarding execute for ${scoped}. Execute stays entitled-only. Do not invent ClientCodes, workspaces, projects, or Hub-MI.`
          : 'Review entitled onboarding. Status is not LIVE execution. Execute stays entitled-only. Do not invent ClientCodes, workspaces, projects, or Hub-MI.';

  const flags = {
    kind: ONBOARDING_EXECUTE_HONESTY_KIND,
    intent,
    entitledCodes: entitled,
    recordedItems,
    recordedCount: recordedItems.length,
    liveEvidence,
    liveExecution: false as const,
    mayExecute,
    snapshotEmpty,
    snapshotUnsigned,
    honestyNotes,
    items,
    policyClass: ONBOARDING_AGENT_POLICY_CLASS,
    communicationPolicy: 'DRAFT_ONLY' as const,
    autoRespond: COMMUNICATIONS_AUTO_RESPOND,
    execute: ONBOARDING_AGENT_EXECUTE,
    activate: ONBOARDING_AGENT_ACTIVATE,
    send: ONBOARDING_AGENT_SEND,
    ownerGated: ONBOARDING_AGENT_OWNER_GATED,
    hubMi: ONBOARDING_AGENT_HUB_MI,
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

export function formatOnboardingExecuteHonesty(
  pack: OnboardingExecuteHonesty,
  scope = pack.clientCode ?? 'Hub',
): string {
  const heading = pack.intent === 'execute'
    ? `Onboarding execute for ${scope}: ${pack.status}`
    : `Onboarding status for ${scope}: ${pack.status}`;
  return [
    heading,
    `kind: ${pack.kind}`,
    `intent: ${pack.intent}`,
    pack.clientCode ? `ClientCode: ${pack.clientCode}` : `Entitled roster: ${pack.entitledCodes.join(', ')}`,
    pack.recordedItems.length
      ? `Recorded (already-entitled): ${pack.recordedItems.map((row) => {
          const label = row.clientCode || row.projectName || row.runId;
          return `${label}: ${row.title}`;
        }).join('; ')}`
      : 'No entitled onboarding run is visible.',
    pack.liveEvidence
      ? 'Live Atlas runtime evidence available for entitled recorded overlay rows.'
      : 'LIVE evidence: false. Snapshot is not a live onboarding claim.',
    'LIVE execution: false',
    pack.intent === 'status' ? 'Status questions do not execute onboarding.' : '',
    pack.intent === 'execute'
      ? pack.mayExecute
        ? 'Execute allowed for one entitled ClientCode only.'
        : 'Execute not allowed. Atlas does not invent or execute.'
      : '',
    pack.snapshotEmpty ? 'Snapshot: empty' : '',
    pack.snapshotUnsigned ? 'Snapshot: unsigned' : '',
    pack.honestyNotes.length ? `Honesty: ${pack.honestyNotes.join('; ')}` : '',
    pack.items.length ? `Open: ${pack.items.join('; ')}` : 'No open onboarding-execute honesty items.',
    `Policy class: ${pack.policyClass}`,
    `Communication policy: ${pack.communicationPolicy}`,
    'AUTO_RESPOND: false',
    'Execute: false',
    'Hub-MI: false',
    `Next owner action: ${pack.nextOwnerAction}`,
    'Atlas did not invent ClientCodes, workspaces, projects, or Hub-MI.',
    pack.intent === 'status'
      ? 'Atlas did not execute onboarding, send mail, auto-respond, or claim LIVE execution.'
      : 'Atlas did not invent a sixth client, send mail, auto-respond, or claim LIVE execution.',
  ]
    .filter(Boolean)
    .join('\n');
}

export function answerOnboardingExecuteHonesty(
  question: string,
  extras?: {
    entitledCodes?: readonly string[];
    entitledItems?: OnboardingExecuteHonestyEntitledItem[];
    overlayRunIds?: readonly string[];
  },
): string {
  const pack = composeOnboardingExecuteHonesty({
    question,
    entitledCodes: extras?.entitledCodes,
    entitledItems: extras?.entitledItems,
    overlayRunIds: extras?.overlayRunIds,
  });
  return formatOnboardingExecuteHonesty(pack, pack.clientCode ?? 'Hub');
}
