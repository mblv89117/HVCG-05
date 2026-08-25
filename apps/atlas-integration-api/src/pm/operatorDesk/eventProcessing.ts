/**
 * Deterministic Hub event processing. No new LLM, Azure job, or product.
 *
 * EVENT → POLICY (READ_AUTO) → atlas-hub-runtime → get_attention_items
 * → recommendation or honest-empty → Agent Activity Ledger.
 *
 * Authorization happens before retrieval. Unknown / owner-gated events
 * stay honest-empty and do not invent urgency, amounts, LTV, or Hub-MI.
 */

import type { AtlasPrincipal } from '../../middleware/auth.ts';
import { canAccessOperatorDesk, entitledClientCodes } from '../sharepoint/authz.ts';
import { runAtlasHubRuntime } from './agentRuntime.ts';
import {
  ASK_ATLAS_EVENT_MISSION_KEY,
  ASK_ATLAS_QUESTION,
  ASK_ATLAS_RANKING,
  ASK_ATLAS_RUNTIME_AGENT,
  ASK_ATLAS_RUNTIME_MISSION_KEY,
  GET_ATTENTION_ITEMS_TOOL,
  type AskAtlasAnswer,
  type AskAtlasAttentionState,
  type AskAtlasClassification,
  type AskAtlasTrigger,
  type OperatorOperatingPicture,
} from './types.ts';

export const ATLAS_HUB_EVENT_MISSION_KEY = ASK_ATLAS_EVENT_MISSION_KEY;
export const ATLAS_HUB_EVENT_POLICY_CLASS = 'READ_AUTO' as const;

export const ATTENTION_EVENT_CLASSES = [
  'task_overdue',
  'project_blocked',
  'decision_required',
  'attention_stale',
  'attention_at_risk',
  'scheduled_sweep',
] as const;

export type AttentionEventClass = (typeof ATTENTION_EVENT_CLASSES)[number];

export const OWNER_GATED_EVENT_CLASSES = [
  'money_move',
  'lender_outreach',
  'contract_send',
  'ad_spend',
  'outbound_message',
] as const;

export type OwnerGatedEventClass = (typeof OWNER_GATED_EVENT_CLASSES)[number];

export type EventPolicyReason = 'attention' | 'unknown' | 'owner_gated' | 'unauthorized';

export interface EventPolicyDecision {
  policyClass: typeof ATLAS_HUB_EVENT_POLICY_CLASS;
  allowed: boolean;
  reason: EventPolicyReason;
  eventClass: string;
}

export interface AtlasEventProcessing {
  agent: typeof ASK_ATLAS_RUNTIME_AGENT;
  missionKey: typeof ASK_ATLAS_EVENT_MISSION_KEY;
  policyClass: typeof ATLAS_HUB_EVENT_POLICY_CLASS;
  trigger: AskAtlasTrigger;
  eventClass: string;
  outcome: 'recommendation' | 'honest_empty' | 'hvs_blocked';
  invented: false;
  honestEmpty: boolean;
}

export interface AtlasEventProcessingResult {
  eventProcessing: AtlasEventProcessing;
  askAtlas: AskAtlasAnswer;
  runtime: {
    agent: typeof ASK_ATLAS_RUNTIME_AGENT;
    toolsInvoked: string[];
    policyClass: typeof ATLAS_HUB_EVENT_POLICY_CLASS;
    missionKey: typeof ASK_ATLAS_RUNTIME_MISSION_KEY;
  };
}

const ATTENTION_EVENT_SET = new Set<string>(ATTENTION_EVENT_CLASSES);
const OWNER_GATED_EVENT_SET = new Set<string>(OWNER_GATED_EVENT_CLASSES);

const EVENT_STATE: Record<Exclude<AttentionEventClass, 'scheduled_sweep'>, AskAtlasAttentionState> = {
  task_overdue: 'Overdue',
  project_blocked: 'Blocked',
  decision_required: 'Decision Required',
  attention_stale: 'At Risk',
  attention_at_risk: 'At Risk',
};

const SWEEP_STATES = new Set<AskAtlasAttentionState>([
  'At Risk',
  'Overdue',
  'Decision Required',
  'Blocked',
]);

const EVENT_ALIASES: Record<string, AttentionEventClass | OwnerGatedEventClass> = {
  task_overdue: 'task_overdue',
  overdue: 'task_overdue',
  overdue_task: 'task_overdue',
  project_blocked: 'project_blocked',
  blocked: 'project_blocked',
  blocked_project: 'project_blocked',
  decision_required: 'decision_required',
  decision: 'decision_required',
  attention_stale: 'attention_stale',
  stale: 'attention_stale',
  stale_attention: 'attention_stale',
  attention_at_risk: 'attention_at_risk',
  at_risk: 'attention_at_risk',
  attention_atrisk: 'attention_at_risk',
  scheduled_sweep: 'scheduled_sweep',
  sweep: 'scheduled_sweep',
  money_move: 'money_move',
  lender_outreach: 'lender_outreach',
  contract_send: 'contract_send',
  ad_spend: 'ad_spend',
  outbound_message: 'outbound_message',
  outbound: 'outbound_message',
};

export function normalizeEventClass(raw: string | undefined | null): string {
  return (raw || '').trim().replace(/[\s-]+/g, '_').replace(/[?!.]+$/g, '').toLowerCase();
}

export function resolveEventClass(raw: string | undefined | null): string {
  const normalized = normalizeEventClass(raw);
  return EVENT_ALIASES[normalized] || normalized;
}

export function classifyEventPolicy(raw: string | undefined | null, principal?: AtlasPrincipal): EventPolicyDecision {
  const eventClass = resolveEventClass(raw);
  if (principal && !canAccessOperatorDesk(principal)) {
    return { policyClass: ATLAS_HUB_EVENT_POLICY_CLASS, allowed: false, reason: 'unauthorized', eventClass };
  }
  if (OWNER_GATED_EVENT_SET.has(eventClass)) {
    return { policyClass: ATLAS_HUB_EVENT_POLICY_CLASS, allowed: false, reason: 'owner_gated', eventClass };
  }
  if (ATTENTION_EVENT_SET.has(eventClass)) {
    return { policyClass: ATLAS_HUB_EVENT_POLICY_CLASS, allowed: true, reason: 'attention', eventClass };
  }
  return { policyClass: ATLAS_HUB_EVENT_POLICY_CLASS, allowed: false, reason: 'unknown', eventClass };
}

function neverPromote(value: AskAtlasClassification | 'HONEST_EMPTY'): AskAtlasClassification | 'HONEST_EMPTY' {
  if (value === 'CONFIRMED' || value === 'LIKELY' || value === 'PROPOSED' || value === 'HONEST_EMPTY') {
    return value;
  }
  return 'HONEST_EMPTY';
}

function honestEmptyAnswer(opts: {
  now?: string;
  trigger: AskAtlasTrigger;
  tools?: string[];
  result?: 'honest_empty' | 'hvs_blocked';
}): AskAtlasAnswer {
  const result = opts.result || 'honest_empty';
  return {
    kind: 'ask_atlas_attention_v1',
    question: ASK_ATLAS_QUESTION,
    invented: false,
    honestEmpty: true,
    ranking: [...ASK_ATLAS_RANKING],
    items: [],
    activity: {
      agent: ASK_ATLAS_RUNTIME_AGENT,
      missionKey: ASK_ATLAS_EVENT_MISSION_KEY,
      trigger: opts.trigger,
      timestamp: opts.now || new Date().toISOString(),
      tools: opts.tools ? [...opts.tools] : [],
      classification: 'HONEST_EMPTY',
      result,
      readWriteStatus: 'READ_AUTO',
      policyDecision: result,
    },
  };
}

function runtimeEnvelope(toolsInvoked: string[]) {
  return {
    agent: ASK_ATLAS_RUNTIME_AGENT,
    toolsInvoked: [...toolsInvoked],
    policyClass: ATLAS_HUB_EVENT_POLICY_CLASS,
    missionKey: ASK_ATLAS_RUNTIME_MISSION_KEY,
  };
}

function eventEnvelope(opts: {
  trigger: AskAtlasTrigger;
  eventClass: string;
  outcome: AtlasEventProcessing['outcome'];
  honestEmpty: boolean;
}): AtlasEventProcessing {
  return {
    agent: ASK_ATLAS_RUNTIME_AGENT,
    missionKey: ASK_ATLAS_EVENT_MISSION_KEY,
    policyClass: ATLAS_HUB_EVENT_POLICY_CLASS,
    trigger: opts.trigger,
    eventClass: opts.eventClass,
    outcome: opts.outcome,
    invented: false,
    honestEmpty: opts.honestEmpty,
  };
}

function filterAttentionItems(answer: AskAtlasAnswer, eventClass: string): AskAtlasAnswer['items'] {
  if (eventClass === 'scheduled_sweep') {
    return answer.items.filter((item) => SWEEP_STATES.has(item.state));
  }
  const state = EVENT_STATE[eventClass as Exclude<AttentionEventClass, 'scheduled_sweep'>];
  if (!state) return [];
  return answer.items.filter((item) => item.state === state);
}

function stampEventAnswer(
  answer: AskAtlasAnswer,
  opts: { trigger: AskAtlasTrigger; tools: string[]; now?: string },
): AskAtlasAnswer {
  return {
    ...answer,
    invented: false,
    activity: {
      ...answer.activity,
      agent: ASK_ATLAS_RUNTIME_AGENT,
      missionKey: ASK_ATLAS_EVENT_MISSION_KEY,
      trigger: opts.trigger,
      timestamp: opts.now || answer.activity.timestamp,
      tools: [...opts.tools],
      classification: neverPromote(answer.activity.classification),
      readWriteStatus: 'READ_AUTO',
    },
  };
}

export function processAtlasEvent(opts: {
  principal: AtlasPrincipal;
  picture: OperatorOperatingPicture;
  eventClass?: string;
  trigger?: AskAtlasTrigger;
  now?: string;
}): AtlasEventProcessingResult {
  const trigger: AskAtlasTrigger =
    opts.trigger ||
    (resolveEventClass(opts.eventClass) === 'scheduled_sweep' ? 'scheduled_sweep' : 'authorized_internal_event');
  const policy = classifyEventPolicy(opts.eventClass, opts.principal);
  if (!policy.allowed) {
    const empty = honestEmptyAnswer({ now: opts.now, trigger });
    return {
      eventProcessing: eventEnvelope({
        trigger,
        eventClass: policy.eventClass || 'unknown',
        outcome: 'honest_empty',
        honestEmpty: true,
      }),
      askAtlas: empty,
      runtime: runtimeEnvelope([]),
    };
  }

  entitledClientCodes(opts.principal);
  const invoked = runAtlasHubRuntime({
    principal: opts.principal,
    picture: opts.picture,
    question: ASK_ATLAS_QUESTION,
    now: opts.now,
  });
  const tools = invoked.askAtlas.activity.tools.includes(GET_ATTENTION_ITEMS_TOOL)
    ? [...invoked.askAtlas.activity.tools]
    : [...invoked.askAtlas.activity.tools, GET_ATTENTION_ITEMS_TOOL];

  if (invoked.askAtlas.activity.result === 'hvs_blocked') {
    const blocked = stampEventAnswer(
      {
        ...invoked.askAtlas,
        honestEmpty: true,
        items: [],
        activity: {
          ...invoked.askAtlas.activity,
          classification: 'HONEST_EMPTY',
          result: 'hvs_blocked',
          policyDecision: 'hvs_blocked',
        },
      },
      { trigger, tools, now: opts.now },
    );
    return {
      eventProcessing: eventEnvelope({
        trigger,
        eventClass: policy.eventClass,
        outcome: 'hvs_blocked',
        honestEmpty: true,
      }),
      askAtlas: blocked,
      runtime: runtimeEnvelope([GET_ATTENTION_ITEMS_TOOL]),
    };
  }

  const items = filterAttentionItems(invoked.askAtlas, policy.eventClass);
  const honestEmpty = items.length === 0;
  const classification = honestEmpty ? 'HONEST_EMPTY' : neverPromote(items[0]!.classification);
  const result = honestEmpty ? 'honest_empty' : 'answered';
  const askAtlas = stampEventAnswer(
    {
      ...invoked.askAtlas,
      honestEmpty,
      items,
      activity: {
        ...invoked.askAtlas.activity,
        classification,
        result,
        policyDecision: result,
      },
    },
    { trigger, tools, now: opts.now },
  );
  return {
    eventProcessing: eventEnvelope({
      trigger,
      eventClass: policy.eventClass,
      outcome: honestEmpty ? 'honest_empty' : 'recommendation',
      honestEmpty,
    }),
    askAtlas,
    runtime: runtimeEnvelope([GET_ATTENTION_ITEMS_TOOL]),
  };
}

/** Invoked only when called. Not an always-running Azure job. */
export function sweepAttentionEvents(opts: {
  principal: AtlasPrincipal;
  picture: OperatorOperatingPicture;
  now?: string;
}): AtlasEventProcessingResult {
  return processAtlasEvent({
    ...opts,
    eventClass: 'scheduled_sweep',
    trigger: 'scheduled_sweep',
  });
}
