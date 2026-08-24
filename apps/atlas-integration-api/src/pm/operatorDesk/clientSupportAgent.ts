/**
 * Native governed client support / routing agent from already-entitled
 * Atlas/index evidence.
 *
 * Inspects existing HVCG_Communications, titled support work, copied
 * operator queues, and recovered folder/filename clients only. Does not
 * invent ClientCodes or Hub-MI. Reply, reassign, close, and send stay
 * OWNER-GATED. Send remains draft-only. Optional relatedMeetings /
 * researchRelationship / relatedDocuments / relatedProjects /
 * relatedThreads are attached later from authorizedSearch.meetings /
 * .researchIntelligence / .documents / hits kind=document / .projects /
 * .threads / sameRelatedScope (fail-closed when ClientCode is missing /
 * non-canonical). relatedDocuments reuses relatedDocumentsForMeeting —
 * no document.clientSupportRelationship field. relatedProjects reuses
 * relatedProjects() / RelatedDocumentProjectRef — inverse of
 * document.relatedProject. relatedThreads reuses relatedEmails() /
 * RelatedDocumentEmailRef — inverse of document.relatedEmail. No
 * preview body / suggestedDraft / send / downloadUrl on the thread
 * refs. hubMiRow is copied as composed, never invented.
 */

import {
  ASK_ATLAS_CLIENT_SUPPORT_AGENT_MISSION_KEY,
  CLIENT_SUPPORT_AGENT_AUTO_RESPOND,
  CLIENT_SUPPORT_AGENT_DRAFT_ONLY,
  CLIENT_SUPPORT_AGENT_EXECUTE,
  CLIENT_SUPPORT_AGENT_HUB_MI,
  CLIENT_SUPPORT_AGENT_OWNER_GATED,
  CLIENT_SUPPORT_AGENT_POLICY_CLASS,
  CLIENT_SUPPORT_AGENT_SEND,
  type AskAtlasClassification,
  type AtlasAuthorizedSearchHit,
  type ClientSupportAgentPayload,
  type ClientSupportAgentRecord,
  type ClientSupportEvidenceKind,
  type ClientSupportOwnerDecision,
} from './types.ts';

export { ASK_ATLAS_CLIENT_SUPPORT_AGENT_MISSION_KEY };

const SUPPORT_TITLE =
  /\b(?:support|help desk|helpdesk|follow(?:[- ]?up)?|question|escalat(?:e|ion)|ticket|check[- ]?in|issue|blocker|needs? (?:action|review|decision|reply)|waiting (?:on|for)|please (?:confirm|advise|review|reply)|respond|client request)\b/i;

const INVENTED_FACTS =
  /\b(?:ltv\s*[:=]?\s*\d|dscr\s*[:=]?\s*\d|credit box|best[_ ]?fit|term sheet approved|committed funded)\b/i;

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

const OWNER_NEXT_ACTION =
  'Owner review of this entitled support item. Reply, reassign, close, and send remain owner-gated. Suggested replies stay draft-only.';

const OWNER_DECISIONS: ClientSupportOwnerDecision[] = [
  { decision: 'Reply or send to the client', status: 'escalated', execute: false },
  { decision: 'Change routing / reassign the queue', status: 'escalated', execute: false },
  { decision: 'Close or resolve the support item', status: 'escalated', execute: false },
  { decision: 'Create an operational client row or invent a ClientCode', status: 'escalated', execute: false },
];

function neverPromote(value: string | undefined): AskAtlasClassification {
  if (value === 'CONFIRMED' || value === 'LIKELY' || value === 'PROPOSED') return value;
  return 'PROPOSED';
}

function titledSupport(hit: AtlasAuthorizedSearchHit): boolean {
  return SUPPORT_TITLE.test(hit.title) || SUPPORT_TITLE.test(hit.objective || '');
}

function copiedRoute(hit: AtlasAuthorizedSearchHit): string | undefined {
  const queue = hit.queue?.trim();
  if (queue && COPIED_ROUTES.has(queue)) return queue;
  return undefined;
}

function isCapitalLane(hit: AtlasAuthorizedSearchHit): boolean {
  if (hit.queue === 'Capital') return true;
  if (hit.kind === 'hvs_actionable_capital' || hit.kind === 'recovered_capital_packet') return true;
  if (hit.kind === 'capital_opportunity' || hit.source === 'HVCG_CapitalOpportunities') return true;
  return false;
}

function evidenceKind(hit: AtlasAuthorizedSearchHit): ClientSupportEvidenceKind | null {
  if (isCapitalLane(hit)) return null;
  if (hit.kind === 'communication' && hit.source === 'HVCG_Communications') return 'communication';
  if (hit.kind === 'recovered_client' || hit.kind === 'recovered_client_record') return 'recovered_client';
  if (hit.kind === 'task' && hit.source === 'HVCG_Tasks' && titledSupport(hit)) return 'task';
  if (hit.kind === 'meeting' && hit.source === 'HVCG_Meetings' && titledSupport(hit)) return 'meeting';
  if (hit.kind === 'decision' && hit.source === 'HVCG_Decisions' && titledSupport(hit)) return 'decision';
  if (hit.kind === 'deliverable' && hit.source === 'HVCG_Deliverables' && titledSupport(hit)) {
    return 'deliverable';
  }
  if (copiedRoute(hit) && hit.source === 'operator_operating_picture') return 'queue_item';
  if (titledSupport(hit) && hit.source === 'operator_operating_picture') return 'queue_item';
  return null;
}

function suggestedRoute(hit: AtlasAuthorizedSearchHit): string {
  return copiedRoute(hit) || OWNER_REVIEW_ROUTE;
}

function missingRequirements(
  hit: AtlasAuthorizedSearchHit,
  kind: ClientSupportEvidenceKind,
  route: string,
): string[] {
  const missing = [
    'Owner must review and decide reply, reassign, or close. Agent does not send, auto-respond, or execute routing.',
    'Do not invent ClientCodes or operational client rows. Suggested replies stay draft-only.',
  ];
  if (kind === 'recovered_client') {
    missing.push(
      'Recovered folder/filename only. Do not create an operational client row. Owner must decide whether to operationalize.',
    );
  }
  if (kind === 'communication') {
    missing.push('Entitled HVCG_Communications preview copied. Send remains draft-only and owner-gated.');
  }
  if (kind === 'task' || kind === 'meeting' || kind === 'decision' || kind === 'deliverable') {
    missing.push('Entitled support title copied. Completion and outbound reply remain owner-gated.');
  }
  if (kind === 'queue_item') {
    missing.push(
      route === OWNER_REVIEW_ROUTE
        ? 'Entitled operator picture item copied. Routing destination was not invented.'
        : `Copied existing queue is ${route}. Changing that route remains owner-gated.`,
    );
  }
  return missing;
}

function evidenceRef(hit: AtlasAuthorizedSearchHit): ClientSupportAgentRecord['evidence'][number] {
  const classification = neverPromote(hit.classification);
  return {
    kind: hit.kind,
    id: hit.id,
    title: hit.title,
    ...(hit.source ? { source: hit.source } : {}),
    classification,
  };
}

export function emptyClientSupportPayload(): ClientSupportAgentPayload {
  return {
    kind: 'client_support_agent_v1',
    policyClass: CLIENT_SUPPORT_AGENT_POLICY_CLASS,
    invented: false,
    execute: CLIENT_SUPPORT_AGENT_EXECUTE,
    send: CLIENT_SUPPORT_AGENT_SEND,
    autoRespond: CLIENT_SUPPORT_AGENT_AUTO_RESPOND,
    draftOnly: CLIENT_SUPPORT_AGENT_DRAFT_ONLY,
    ownerGated: CLIENT_SUPPORT_AGENT_OWNER_GATED,
    hubMi: CLIENT_SUPPORT_AGENT_HUB_MI,
    items: [],
  };
}

export function composeClientSupportAgent(hits: AtlasAuthorizedSearchHit[]): ClientSupportAgentPayload {
  const items: ClientSupportAgentRecord[] = [];
  const seen = new Set<string>();

  for (const hit of hits) {
    const kind = evidenceKind(hit);
    if (!kind) continue;
    if (seen.has(hit.id)) continue;
    seen.add(hit.id);
    const classification = neverPromote(hit.classification);
    const clientCode = hit.clientCode?.trim() || undefined;
    const route = suggestedRoute(hit);
    items.push({
      id: hit.id,
      title: hit.title,
      ...(clientCode ? { clientCode } : {}),
      evidenceKind: kind,
      suggestedRoute: route,
      classification,
      provenance: classification,
      invented: false,
      hubMiRow: false,
      execute: false,
      send: false,
      autoRespond: false,
      draftOnly: true,
      evidence: [evidenceRef(hit)],
      missingRequirements: missingRequirements(hit, kind, route),
      ownerDecisions: OWNER_DECISIONS.map((row) => ({ ...row })),
      nextAction: OWNER_NEXT_ACTION,
    });
  }

  return {
    kind: 'client_support_agent_v1',
    policyClass: CLIENT_SUPPORT_AGENT_POLICY_CLASS,
    invented: false,
    execute: CLIENT_SUPPORT_AGENT_EXECUTE,
    send: CLIENT_SUPPORT_AGENT_SEND,
    autoRespond: CLIENT_SUPPORT_AGENT_AUTO_RESPOND,
    draftOnly: CLIENT_SUPPORT_AGENT_DRAFT_ONLY,
    ownerGated: CLIENT_SUPPORT_AGENT_OWNER_GATED,
    hubMi: CLIENT_SUPPORT_AGENT_HUB_MI,
    items,
  };
}

export function clientSupportPayloadHasInventedFacts(payload: ClientSupportAgentPayload): boolean {
  if (payload.invented) return true;
  if (payload.execute || payload.send || payload.autoRespond) return true;
  if (!payload.draftOnly) return true;
  if (payload.hubMi) return true;
  if (!payload.ownerGated) return true;
  if (payload.policyClass !== CLIENT_SUPPORT_AGENT_POLICY_CLASS) return true;
  for (const row of payload.items) {
    if (row.invented || row.hubMiRow || row.execute || row.send || row.autoRespond || !row.draftOnly) {
      return true;
    }
    if (row.suggestedRoute !== OWNER_REVIEW_ROUTE && !COPIED_ROUTES.has(row.suggestedRoute)) {
      return true;
    }
    if (INVENTED_FACTS.test(row.title) || INVENTED_FACTS.test(row.nextAction)) return true;
    for (const note of row.missingRequirements) {
      if (INVENTED_FACTS.test(note)) return true;
    }
    for (const decision of row.ownerDecisions) {
      if (decision.execute || decision.status !== 'escalated') return true;
    }
  }
  return false;
}
