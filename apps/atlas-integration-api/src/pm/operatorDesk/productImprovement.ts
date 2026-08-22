/**
 * Governed Product Improvement Intelligence. No new LLM, CRM, Atlas, or SWA.
 *
 * INSPECT → POLICY (READ_AUTO) → entitled evidence (ledger/search/health)
 * → create_engineering_mission (PROPOSE_AUTO / SAFE_INTERNAL_WRITE) or honest-empty
 * → Agent Activity Ledger.
 *
 * Authorization happens before retrieval. Unknown / owner-gated inspect
 * classes stay honest-empty and do not invent issues, clients, amounts,
 * LTV, or Hub-MI. Proposed missions are visibly non-authoritative.
 */

import type { AtlasPrincipal } from '../../middleware/auth.ts';
import { canAccessOperatorDesk, entitledClientCodes } from '../sharepoint/authz.ts';
import { createEngineeringMission } from './toolGateway.ts';
import type { AgentActivityLedgerEntry } from './types.ts';
import {
  ASK_ATLAS_EVENT_MISSION_KEY,
  ASK_ATLAS_PII_MISSION_KEY,
  ASK_ATLAS_QUESTION,
  ASK_ATLAS_RANKING,
  ASK_ATLAS_RUNTIME_AGENT,
  ASK_ATLAS_RUNTIME_MISSION_KEY,
  CREATE_ENGINEERING_MISSION_TOOL,
  type AskAtlasAnswer,
  type AskAtlasClassification,
  type AskAtlasTrigger,
  type OperatorOperatingPicture,
  type ProductImprovementEvidenceClass,
  type ProposedEngineeringMission,
} from './types.ts';

export const ATLAS_HUB_PII_MISSION_KEY = ASK_ATLAS_PII_MISSION_KEY;
export const ATLAS_HUB_PII_DETECT_POLICY_CLASS = 'READ_AUTO' as const;
export const ATLAS_HUB_PII_PROPOSE_POLICY_CLASS = 'PROPOSE_AUTO' as const;

export const EVIDENCE_INSPECT_CLASSES = [
  'inspect',
  'detect',
  'failed_agent_action',
  'event_processing_failure',
  'entitled_search_failure',
  'production_health_degradation',
  'repeated_failed_workflow',
] as const;

export type EvidenceInspectClass = (typeof EVIDENCE_INSPECT_CLASSES)[number];

export const OWNER_GATED_INSPECT_CLASSES = [
  'money_move',
  'lender_outreach',
  'contract_send',
  'ad_spend',
  'outbound_message',
] as const;

export type OwnerGatedInspectClass = (typeof OWNER_GATED_INSPECT_CLASSES)[number];

export type ImprovementPolicyReason = 'evidence' | 'unknown' | 'owner_gated' | 'unauthorized';

export interface ImprovementPolicyDecision {
  policyClass: typeof ATLAS_HUB_PII_DETECT_POLICY_CLASS;
  allowed: boolean;
  reason: ImprovementPolicyReason;
  inspectClass: string;
}

export interface ProductImprovementInspectSearch {
  ran?: boolean;
  failed?: boolean;
  failureEvidence?: string;
  classification?: AskAtlasClassification;
}

export interface ProductImprovementInspectHealth {
  authRequired: boolean;
  insecureDevAuth: boolean;
}

export interface AtlasProductImprovement {
  agent: typeof ASK_ATLAS_RUNTIME_AGENT;
  missionKey: typeof ASK_ATLAS_PII_MISSION_KEY;
  policyClass: typeof ATLAS_HUB_PII_DETECT_POLICY_CLASS | typeof ATLAS_HUB_PII_PROPOSE_POLICY_CLASS;
  trigger: AskAtlasTrigger;
  inspectClass: string;
  outcome: 'proposed_mission' | 'honest_empty' | 'hvs_blocked';
  invented: false;
  honestEmpty: boolean;
  proposedMissions: ProposedEngineeringMission[];
}

export interface AtlasProductImprovementResult {
  productImprovement: AtlasProductImprovement;
  askAtlas: AskAtlasAnswer;
  runtime: {
    agent: typeof ASK_ATLAS_RUNTIME_AGENT;
    toolsInvoked: string[];
    policyClass: typeof ATLAS_HUB_PII_DETECT_POLICY_CLASS;
    missionKey: typeof ASK_ATLAS_RUNTIME_MISSION_KEY;
  };
}

export interface DetectedImprovementEvidence {
  evidenceClass: ProductImprovementEvidenceClass;
  classification: AskAtlasClassification;
  why: string;
  basedOn: string;
}

const EVIDENCE_INSPECT_SET = new Set<string>(EVIDENCE_INSPECT_CLASSES);
const OWNER_GATED_INSPECT_SET = new Set<string>(OWNER_GATED_INSPECT_CLASSES);
const SCAN_ALL = new Set(['inspect', 'detect', '']);

const INSPECT_ALIASES: Record<string, EvidenceInspectClass | OwnerGatedInspectClass> = {
  inspect: 'inspect',
  detect: 'detect',
  failed_agent_action: 'failed_agent_action',
  agent_action_failed: 'failed_agent_action',
  failed_action: 'failed_agent_action',
  event_processing_failure: 'event_processing_failure',
  event_failure: 'event_processing_failure',
  entitled_search_failure: 'entitled_search_failure',
  search_failure: 'entitled_search_failure',
  production_health_degradation: 'production_health_degradation',
  health_degradation: 'production_health_degradation',
  repeated_failed_workflow: 'repeated_failed_workflow',
  repeated_failure: 'repeated_failed_workflow',
  money_move: 'money_move',
  lender_outreach: 'lender_outreach',
  contract_send: 'contract_send',
  ad_spend: 'ad_spend',
  outbound_message: 'outbound_message',
  outbound: 'outbound_message',
};

export function normalizeInspectClass(raw: string | undefined | null): string {
  return (raw || '').trim().replace(/[\s-]+/g, '_').replace(/[?!.]+$/g, '').toLowerCase();
}

export function resolveInspectClass(raw: string | undefined | null): string {
  const normalized = normalizeInspectClass(raw);
  if (!normalized) return 'inspect';
  return INSPECT_ALIASES[normalized] || normalized;
}

export function classifyImprovementPolicy(
  raw: string | undefined | null,
  principal?: AtlasPrincipal,
): ImprovementPolicyDecision {
  const inspectClass = resolveInspectClass(raw);
  if (principal && !canAccessOperatorDesk(principal)) {
    return {
      policyClass: ATLAS_HUB_PII_DETECT_POLICY_CLASS,
      allowed: false,
      reason: 'unauthorized',
      inspectClass,
    };
  }
  if (OWNER_GATED_INSPECT_SET.has(inspectClass)) {
    return {
      policyClass: ATLAS_HUB_PII_DETECT_POLICY_CLASS,
      allowed: false,
      reason: 'owner_gated',
      inspectClass,
    };
  }
  if (EVIDENCE_INSPECT_SET.has(inspectClass)) {
    return {
      policyClass: ATLAS_HUB_PII_DETECT_POLICY_CLASS,
      allowed: true,
      reason: 'evidence',
      inspectClass,
    };
  }
  return {
    policyClass: ATLAS_HUB_PII_DETECT_POLICY_CLASS,
    allowed: false,
    reason: 'unknown',
    inspectClass,
  };
}

function neverPromote(value: AskAtlasClassification | 'HONEST_EMPTY'): AskAtlasClassification | 'HONEST_EMPTY' {
  if (value === 'CONFIRMED' || value === 'LIKELY' || value === 'PROPOSED' || value === 'HONEST_EMPTY') {
    return value;
  }
  return 'HONEST_EMPTY';
}

function neverPromoteClass(value: AskAtlasClassification | string | undefined): AskAtlasClassification {
  if (value === 'CONFIRMED' || value === 'LIKELY' || value === 'PROPOSED') {
    return value;
  }
  return 'PROPOSED';
}

function honestEmptyAnswer(opts: {
  now?: string;
  trigger: AskAtlasTrigger;
  tools?: string[];
  result?: 'honest_empty' | 'hvs_blocked';
  readWriteStatus?: AskAtlasAnswer['activity']['readWriteStatus'];
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
      missionKey: ASK_ATLAS_PII_MISSION_KEY,
      trigger: opts.trigger,
      timestamp: opts.now || new Date().toISOString(),
      tools: opts.tools ? [...opts.tools] : [],
      classification: 'HONEST_EMPTY',
      result,
      readWriteStatus: opts.readWriteStatus || 'READ_AUTO',
      policyDecision: result,
    },
  };
}

function runtimeEnvelope(toolsInvoked: string[]) {
  return {
    agent: ASK_ATLAS_RUNTIME_AGENT,
    toolsInvoked: [...toolsInvoked],
    policyClass: ATLAS_HUB_PII_DETECT_POLICY_CLASS,
    missionKey: ASK_ATLAS_RUNTIME_MISSION_KEY,
  };
}

function improvementEnvelope(opts: {
  trigger: AskAtlasTrigger;
  inspectClass: string;
  outcome: AtlasProductImprovement['outcome'];
  honestEmpty: boolean;
  proposedMissions: ProposedEngineeringMission[];
}): AtlasProductImprovement {
  return {
    agent: ASK_ATLAS_RUNTIME_AGENT,
    missionKey: ASK_ATLAS_PII_MISSION_KEY,
    policyClass: opts.proposedMissions.length
      ? ATLAS_HUB_PII_PROPOSE_POLICY_CLASS
      : ATLAS_HUB_PII_DETECT_POLICY_CLASS,
    trigger: opts.trigger,
    inspectClass: opts.inspectClass,
    outcome: opts.outcome,
    invented: false,
    honestEmpty: opts.honestEmpty,
    proposedMissions: opts.proposedMissions,
  };
}

function wantsClass(
  inspectClass: string,
  evidenceClass: ProductImprovementEvidenceClass,
): boolean {
  if (SCAN_ALL.has(inspectClass)) return true;
  return inspectClass === evidenceClass;
}

function failedEntries(ledger: AgentActivityLedgerEntry[]): AgentActivityLedgerEntry[] {
  return ledger.filter((entry) => entry.result === 'fail_closed' || entry.policyDecision === 'fail_closed');
}

function detectFailedAgentActions(ledger: AgentActivityLedgerEntry[]): DetectedImprovementEvidence[] {
  const out: DetectedImprovementEvidence[] = [];
  for (const entry of failedEntries(ledger)) {
    if (entry.missionKey === ASK_ATLAS_EVENT_MISSION_KEY) continue;
    out.push({
      evidenceClass: 'failed_agent_action',
      classification: neverPromoteClass(entry.classification),
      why: 'A recorded agent action already failed closed. This proposed mission does not execute a code change, deploy, or merge.',
      basedOn: `Agent Activity Ledger recorded result=fail_closed missionKey=${entry.missionKey} classification=${entry.classification} at ${entry.timestamp}`,
    });
  }
  return out;
}

function detectEventProcessingFailures(ledger: AgentActivityLedgerEntry[]): DetectedImprovementEvidence[] {
  const out: DetectedImprovementEvidence[] = [];
  for (const entry of failedEntries(ledger)) {
    if (entry.missionKey !== ASK_ATLAS_EVENT_MISSION_KEY) continue;
    out.push({
      evidenceClass: 'event_processing_failure',
      classification: neverPromoteClass(entry.classification),
      why: 'A recorded event-processing run already failed closed. This proposed mission does not rerun the event or dispatch V4.',
      basedOn: `Agent Activity Ledger recorded event-processing result=fail_closed missionKey=${entry.missionKey} classification=${entry.classification} at ${entry.timestamp}`,
    });
  }
  return out;
}

function detectRepeatedFailedWorkflows(ledger: AgentActivityLedgerEntry[]): DetectedImprovementEvidence[] {
  const counts = new Map<string, { count: number; classification: AskAtlasClassification; sample: AgentActivityLedgerEntry }>();
  for (const entry of failedEntries(ledger)) {
    const key = `${entry.missionKey}::${entry.trigger}`;
    const prev = counts.get(key);
    if (prev) {
      prev.count += 1;
    } else {
      counts.set(key, {
        count: 1,
        classification: neverPromoteClass(entry.classification),
        sample: entry,
      });
    }
  }
  const out: DetectedImprovementEvidence[] = [];
  for (const row of counts.values()) {
    if (row.count < 2) continue;
    out.push({
      evidenceClass: 'repeated_failed_workflow',
      classification: row.classification,
      why: 'The same entitled workflow already failed more than once. This proposed mission does not rerun the workflow or change production.',
      basedOn: `Agent Activity Ledger recorded repeated fail_closed count=${row.count} missionKey=${row.sample.missionKey} trigger=${row.sample.trigger}`,
    });
  }
  return out;
}

function detectSearchFailure(
  search?: ProductImprovementInspectSearch,
  ledger: AgentActivityLedgerEntry[] = [],
): DetectedImprovementEvidence[] {
  const out: DetectedImprovementEvidence[] = [];
  if (search?.failed) {
    const evidence = (search.failureEvidence || '').trim();
    out.push({
      evidenceClass: 'entitled_search_failure',
      classification: neverPromoteClass(search.classification),
      why: 'An entitled Search failure is already recorded. This proposed mission does not invent a client, query, or result row.',
      basedOn: evidence || 'Entitled operator search recorded failed=true',
    });
  }
  for (const entry of failedEntries(ledger)) {
    const tools = entry.tools.join(' ').toLowerCase();
    if (!tools.includes('search')) continue;
    out.push({
      evidenceClass: 'entitled_search_failure',
      classification: neverPromoteClass(entry.classification),
      why: 'An entitled Search failure is already recorded. This proposed mission does not invent a client, query, or result row.',
      basedOn: `Agent Activity Ledger recorded search result=fail_closed missionKey=${entry.missionKey} classification=${entry.classification} at ${entry.timestamp}`,
    });
  }
  return out;
}

function detectHealthDegradation(health?: ProductImprovementInspectHealth): DetectedImprovementEvidence[] {
  if (!health) return [];
  const signals: string[] = [];
  if (health.authRequired === false) signals.push('authRequired=false');
  if (health.insecureDevAuth === true) signals.push('insecureDevAuth=true');
  if (!signals.length) return [];
  return [
    {
      evidenceClass: 'production_health_degradation',
      classification: 'CONFIRMED',
      why: 'Production Hub health already shows a fail-open or insecure-dev condition. This proposed mission does not weaken auth or deploy a change.',
      basedOn: `Entitled Hub health signal ${signals.join(' ')}`,
    },
  ];
}

function collectEvidence(opts: {
  inspectClass: string;
  ledger: AgentActivityLedgerEntry[];
  search?: ProductImprovementInspectSearch;
  health?: ProductImprovementInspectHealth;
}): DetectedImprovementEvidence[] {
  const collected: DetectedImprovementEvidence[] = [];
  if (wantsClass(opts.inspectClass, 'failed_agent_action')) {
    collected.push(...detectFailedAgentActions(opts.ledger));
  }
  if (wantsClass(opts.inspectClass, 'event_processing_failure')) {
    collected.push(...detectEventProcessingFailures(opts.ledger));
  }
  if (wantsClass(opts.inspectClass, 'repeated_failed_workflow')) {
    collected.push(...detectRepeatedFailedWorkflows(opts.ledger));
  }
  if (wantsClass(opts.inspectClass, 'entitled_search_failure')) {
    collected.push(...detectSearchFailure(opts.search, opts.ledger));
  }
  if (wantsClass(opts.inspectClass, 'production_health_degradation')) {
    collected.push(...detectHealthDegradation(opts.health));
  }
  const seen = new Set<string>();
  const out: DetectedImprovementEvidence[] = [];
  for (const row of collected) {
    const key = `${row.evidenceClass}:${row.basedOn}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
    if (out.length >= 5) break;
  }
  return out;
}

function stampProposedAnswer(opts: {
  missions: ProposedEngineeringMission[];
  trigger: AskAtlasTrigger;
  now?: string;
}): AskAtlasAnswer {
  const classification = neverPromote(opts.missions[0]!.classification);
  return {
    kind: 'ask_atlas_attention_v1',
    question: ASK_ATLAS_QUESTION,
    invented: false,
    honestEmpty: false,
    ranking: [...ASK_ATLAS_RANKING],
    items: [],
    activity: {
      agent: ASK_ATLAS_RUNTIME_AGENT,
      missionKey: ASK_ATLAS_PII_MISSION_KEY,
      trigger: opts.trigger,
      timestamp: opts.now || new Date().toISOString(),
      tools: [CREATE_ENGINEERING_MISSION_TOOL],
      classification,
      result: 'answered',
      readWriteStatus: 'SAFE_INTERNAL_WRITE',
      policyDecision: 'answered',
    },
  };
}

export function inspectProductImprovements(opts: {
  principal: AtlasPrincipal;
  picture: OperatorOperatingPicture;
  ledger?: AgentActivityLedgerEntry[];
  search?: ProductImprovementInspectSearch;
  health?: ProductImprovementInspectHealth;
  inspectClass?: string;
  trigger?: AskAtlasTrigger;
  now?: string;
}): AtlasProductImprovementResult {
  const trigger: AskAtlasTrigger = opts.trigger || 'signed_operator_inspect';
  const policy = classifyImprovementPolicy(opts.inspectClass, opts.principal);
  if (!policy.allowed) {
    const empty = honestEmptyAnswer({ now: opts.now, trigger });
    return {
      productImprovement: improvementEnvelope({
        trigger,
        inspectClass: policy.inspectClass || 'unknown',
        outcome: 'honest_empty',
        honestEmpty: true,
        proposedMissions: [],
      }),
      askAtlas: empty,
      runtime: runtimeEnvelope([]),
    };
  }

  if (opts.picture.hvsDataAccess === 'BLOCKED') {
    const blocked = honestEmptyAnswer({ now: opts.now, trigger, result: 'hvs_blocked' });
    return {
      productImprovement: improvementEnvelope({
        trigger,
        inspectClass: policy.inspectClass,
        outcome: 'hvs_blocked',
        honestEmpty: true,
        proposedMissions: [],
      }),
      askAtlas: blocked,
      runtime: runtimeEnvelope([]),
    };
  }

  entitledClientCodes(opts.principal);
  const evidence = collectEvidence({
    inspectClass: policy.inspectClass,
    ledger: opts.ledger || [],
    search: opts.search,
    health: opts.health,
  });
  if (!evidence.length) {
    const empty = honestEmptyAnswer({ now: opts.now, trigger });
    return {
      productImprovement: improvementEnvelope({
        trigger,
        inspectClass: policy.inspectClass,
        outcome: 'honest_empty',
        honestEmpty: true,
        proposedMissions: [],
      }),
      askAtlas: empty,
      runtime: runtimeEnvelope([]),
    };
  }

  const proposedMissions = evidence.map((row) =>
    createEngineeringMission({
      why: row.why,
      basedOn: row.basedOn,
      evidenceClass: row.evidenceClass,
      classification: row.classification,
    }),
  );
  return {
    productImprovement: improvementEnvelope({
      trigger,
      inspectClass: policy.inspectClass,
      outcome: 'proposed_mission',
      honestEmpty: false,
      proposedMissions,
    }),
    askAtlas: stampProposedAnswer({ missions: proposedMissions, trigger, now: opts.now }),
    runtime: runtimeEnvelope([CREATE_ENGINEERING_MISSION_TOOL]),
  };
}
