/**
 * Native governed onboarding agent from already-entitled Atlas/index
 * intake evidence.
 *
 * Inspects existing HVCG_Clients / HVCG_Leads / titled onboarding
 * projects and tasks only. Does not invent ClientCodes or Hub-MI.
 * Activation, completion, welcome send, and live GTM stay OWNER-GATED.
 */

import {
  ASK_ATLAS_ONBOARDING_AGENT_MISSION_KEY,
  ONBOARDING_AGENT_ACTIVATE,
  ONBOARDING_AGENT_EXECUTE,
  ONBOARDING_AGENT_HUB_MI,
  ONBOARDING_AGENT_LIVE_GTM_OUTBOUND,
  ONBOARDING_AGENT_OWNER_GATED,
  ONBOARDING_AGENT_POLICY_CLASS,
  ONBOARDING_AGENT_SEND,
  type AskAtlasClassification,
  type AtlasAuthorizedSearchHit,
  type OnboardingAgentPayload,
  type OnboardingAgentRecord,
  type OnboardingEvidenceKind,
  type OnboardingOwnerDecision,
} from './types.ts';

export { ASK_ATLAS_ONBOARDING_AGENT_MISSION_KEY };

const ONBOARDING_TITLE =
  /\b(?:onboard(?:ing)?|kickoff|engagement letter|kyc|welcome|intake|activation)\b/i;

const INVENTED_FACTS =
  /\b(?:ltv\s*[:=]?\s*\d|dscr\s*[:=]?\s*\d|credit box|best[_ ]?fit|term sheet approved|committed funded)\b/i;

const OWNER_NEXT_ACTION =
  'Owner review of this entitled intake. Activation, onboarding completion, and live GTM outbound remain owner-gated.';

const OWNER_DECISIONS: OnboardingOwnerDecision[] = [
  { decision: 'Activate ClientStage to Active Client', status: 'escalated', execute: false },
  { decision: 'Complete onboarding / close the onboarding checklist', status: 'escalated', execute: false },
  { decision: 'Send welcome or live GTM outbound', status: 'escalated', execute: false },
  { decision: 'Create an operational client row or invent a ClientCode', status: 'escalated', execute: false },
];

function neverPromote(value: string | undefined): AskAtlasClassification {
  if (value === 'CONFIRMED' || value === 'LIKELY' || value === 'PROPOSED') return value;
  return 'PROPOSED';
}

function evidenceKind(hit: AtlasAuthorizedSearchHit): OnboardingEvidenceKind | null {
  if (hit.kind === 'client' && hit.source === 'HVCG_Clients') return 'client';
  if (hit.kind === 'lead' && hit.source === 'HVCG_Leads') return 'lead';
  if (hit.kind === 'project' && hit.source === 'HVCG_Projects' && titledOnboarding(hit)) return 'project';
  if (hit.kind === 'task' && hit.source === 'HVCG_Tasks' && titledOnboarding(hit)) return 'task';
  if (hit.kind === 'opportunity' && hit.source === 'HVCG_Opportunities' && titledOnboarding(hit)) {
    return 'opportunity';
  }
  if (hit.kind === 'recovered_client' || hit.kind === 'recovered_client_record') return 'recovered_client';
  return null;
}

function titledOnboarding(hit: AtlasAuthorizedSearchHit): boolean {
  return ONBOARDING_TITLE.test(hit.title) || ONBOARDING_TITLE.test(hit.objective || '');
}

function copiedStage(hit: AtlasAuthorizedSearchHit): string | undefined {
  const stage = hit.clientStage?.trim();
  return stage || undefined;
}

function missingRequirements(hit: AtlasAuthorizedSearchHit, kind: OnboardingEvidenceKind): string[] {
  const missing = [
    'Owner must review and decide activation / onboarding completion. Agent does not activate, complete, or send.',
    'Do not invent ClientCodes or operational client rows. Live GTM outbound stays off.',
  ];
  if (kind === 'recovered_client') {
    missing.push(
      'Recovered folder/filename only. Do not create an operational client row. Owner must decide whether to operationalize.',
    );
  }
  if (kind === 'client') {
    const stage = copiedStage(hit);
    if (!stage) {
      missing.push('ClientStage was not copied from entitled HVCG_Clients. Owner must confirm stage.');
    } else if (stage !== 'Active Client') {
      missing.push(`Copied ClientStage is ${stage}. Activation remains owner-gated.`);
    } else {
      missing.push('Copied ClientStage is Active Client. Completing onboarding remains owner-gated.');
    }
  }
  if (kind === 'lead') {
    missing.push('Entitled HVCG_Leads intake title copied. Conversion and activation remain owner-gated.');
  }
  if (kind === 'project' || kind === 'task') {
    missing.push('Entitled onboarding title copied. Checklist completion remains owner-gated.');
  }
  if (kind === 'opportunity') {
    missing.push('Entitled opportunity title copied. Win/activation remains owner-gated.');
  }
  return missing;
}

function evidenceRef(hit: AtlasAuthorizedSearchHit): OnboardingAgentRecord['evidence'][number] {
  const classification = neverPromote(hit.classification);
  return {
    kind: hit.kind,
    id: hit.id,
    title: hit.title,
    ...(hit.source ? { source: hit.source } : {}),
    classification,
  };
}

export function emptyOnboardingPayload(): OnboardingAgentPayload {
  return {
    kind: 'onboarding_agent_v1',
    policyClass: ONBOARDING_AGENT_POLICY_CLASS,
    invented: false,
    execute: ONBOARDING_AGENT_EXECUTE,
    activate: ONBOARDING_AGENT_ACTIVATE,
    send: ONBOARDING_AGENT_SEND,
    liveGtmOutbound: ONBOARDING_AGENT_LIVE_GTM_OUTBOUND,
    ownerGated: ONBOARDING_AGENT_OWNER_GATED,
    hubMi: ONBOARDING_AGENT_HUB_MI,
    items: [],
  };
}

export function composeOnboardingAgent(hits: AtlasAuthorizedSearchHit[]): OnboardingAgentPayload {
  const items: OnboardingAgentRecord[] = [];
  const seen = new Set<string>();

  for (const hit of hits) {
    const kind = evidenceKind(hit);
    if (!kind) continue;
    if (seen.has(hit.id)) continue;
    seen.add(hit.id);
    const classification = neverPromote(hit.classification);
    const clientCode = hit.clientCode?.trim() || undefined;
    const clientStage = copiedStage(hit);
    items.push({
      id: hit.id,
      title: hit.title,
      ...(clientCode ? { clientCode } : {}),
      ...(clientStage ? { clientStage } : {}),
      evidenceKind: kind,
      classification,
      provenance: classification,
      invented: false,
      hubMiRow: false,
      execute: false,
      activate: false,
      send: false,
      liveGtmOutbound: false,
      evidence: [evidenceRef(hit)],
      missingRequirements: missingRequirements(hit, kind),
      ownerDecisions: OWNER_DECISIONS.map((row) => ({ ...row })),
      nextAction: OWNER_NEXT_ACTION,
    });
  }

  return {
    kind: 'onboarding_agent_v1',
    policyClass: ONBOARDING_AGENT_POLICY_CLASS,
    invented: false,
    execute: ONBOARDING_AGENT_EXECUTE,
    activate: ONBOARDING_AGENT_ACTIVATE,
    send: ONBOARDING_AGENT_SEND,
    liveGtmOutbound: ONBOARDING_AGENT_LIVE_GTM_OUTBOUND,
    ownerGated: ONBOARDING_AGENT_OWNER_GATED,
    hubMi: ONBOARDING_AGENT_HUB_MI,
    items,
  };
}

export function onboardingPayloadHasInventedFacts(payload: OnboardingAgentPayload): boolean {
  if (payload.invented) return true;
  if (payload.execute || payload.activate || payload.send || payload.liveGtmOutbound) return true;
  if (payload.hubMi) return true;
  if (!payload.ownerGated) return true;
  if (payload.policyClass !== ONBOARDING_AGENT_POLICY_CLASS) return true;
  for (const row of payload.items) {
    if (row.invented || row.hubMiRow || row.execute || row.activate || row.send || row.liveGtmOutbound) {
      return true;
    }
    if (INVENTED_FACTS.test(row.title) || INVENTED_FACTS.test(row.nextAction)) return true;
    for (const note of row.missingRequirements) {
      if (INVENTED_FACTS.test(note)) return true;
    }
    for (const decision of row.ownerDecisions) {
      if (decision.execute || decision.status !== 'escalated') return true;
    }
    for (const cap of row.relatedCapital || []) {
      if (cap.invented || cap.lenderCriteriaInvented) return true;
      if (INVENTED_FACTS.test(cap.title)) return true;
    }
  }
  return false;
}
