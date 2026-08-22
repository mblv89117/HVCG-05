/**
 * Governed Ask Atlas attention answer.
 *
 * Derives only from the entitled operator operating picture already on Hub.
 * Does not invent amounts, lenders, Hub-MI rows, or extra queue items.
 */

import { isHvsRecoveredKind } from '../sharepoint/hvsRecoveredDocuments.ts';
import {
  ASK_ATLAS_MISSION_KEY,
  ASK_ATLAS_QUESTION,
  ASK_ATLAS_RANKING,
  type AskAtlasAnswer,
  type AskAtlasAttentionItem,
  type AskAtlasAttentionState,
  type AskAtlasClassification,
  type OperatorOperatingItem,
  type OperatorOperatingPicture,
} from './types.ts';

const CLASSIFICATIONS = new Set<AskAtlasClassification>(['CONFIRMED', 'LIKELY', 'PROPOSED']);

const RANK_INDEX: Record<AskAtlasAttentionState, number> = {
  'At Risk': 0,
  Overdue: 1,
  'Decision Required': 2,
  Capital: 3,
  Waiting: 4,
  Blocked: 5,
};

function isClassification(value: string): value is AskAtlasClassification {
  return CLASSIFICATIONS.has(value as AskAtlasClassification);
}

function attentionState(row: OperatorOperatingItem): AskAtlasAttentionState | null {
  if (row.kind === 'hvs_actionable_capital') return 'Capital';
  if (row.queue === 'At Risk') return 'At Risk';
  if (row.queue === 'Overdue') return 'Overdue';
  if (row.queue === 'Decision Required') return 'Decision Required';
  if (row.queue === 'Waiting') return 'Waiting';
  if (row.queue === 'Blocked') return 'Blocked';
  return null;
}

function lookupEvidence(picture: OperatorOperatingPicture, row: OperatorOperatingItem): string {
  if (row.evidence?.trim()) return row.evidence.trim();
  for (const rec of picture.hvsActionableClientKnowledge) {
    const hit =
      rec.waitingItems.find((item) => item.id === row.id) ||
      rec.overdueItems.find((item) => item.id === row.id) ||
      rec.decisions.find((item) => item.id === row.id);
    if (hit?.evidence) return hit.evidence;
  }
  const packet = picture.hvsRecoveredCapitalPackets.find((item) => row.title.includes(item.name));
  if (packet) {
    return `CONFIRMED filename ${packet.name}. ${packet.nextAction}`;
  }
  return row.title;
}

function lookupClient(picture: OperatorOperatingPicture, clientCode: string): string | undefined {
  if (!clientCode) return undefined;
  const fromKnowledge = picture.hvsActionableClientKnowledge.find((row) => row.clientCode === clientCode);
  if (fromKnowledge?.client) return fromKnowledge.client;
  const fromRecord = picture.hvsRecoveredClientRecords.find((row) => row.clientCode === clientCode);
  if (fromRecord?.client) return fromRecord.client;
  const fromFolder = picture.hvsRecoveredClients.find((row) => row.clientCode === clientCode);
  if (fromFolder?.client) return fromFolder.client;
  return undefined;
}

function whyFor(state: AskAtlasAttentionState, title: string): string {
  if (/^\d+\s+documents?\b/i.test(title.trim())) {
    switch (state) {
      case 'At Risk':
        return 'Review recovered past-due invoice filenames together with capital-packet filenames. Amounts, payment status, and funding status were not extracted.';
      case 'Overdue':
        return 'Review recovered past-due invoice filename. Payment status and amounts were not extracted.';
      case 'Capital':
        return 'Review recovered capital-packet filename. Amounts, lender criteria, and funding status were not extracted.';
      case 'Decision Required':
        return 'A recovered filename requires an operator decision. Do not invent Hub MI rows.';
      case 'Waiting':
        return 'Waiting on recovered filename evidence. Do not invent missing documents or amounts.';
      case 'Blocked':
        return 'Blocked entitled work needs an operator unblock. Do not invent a workaround row.';
    }
  }
  return title;
}

export function buildAskAtlasAnswer(
  picture: OperatorOperatingPicture,
  opts?: { now?: string },
): AskAtlasAnswer {
  const blocked = picture.hvsDataAccess === 'BLOCKED';
  const queues = picture.queues;
  const candidates: OperatorOperatingItem[] = [
    ...queues.atRisk,
    ...queues.overdue,
    ...queues.blocked,
    ...queues.decisionRequired,
    ...queues.needsAction,
    ...queues.waiting,
  ];

  const seen = new Set<string>();
  const items: AskAtlasAttentionItem[] = [];
  for (const row of candidates) {
    if (blocked && isHvsRecoveredKind(row.kind)) continue;
    const state = attentionState(row);
    if (!state) continue;
    if (!isClassification(row.provenance)) continue;
    const id = row.id || `${state}:${row.clientCode}:${row.title}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const clientCode = row.clientCode?.trim() || undefined;
    const client = clientCode ? lookupClient(picture, clientCode) : undefined;
    const evidence = lookupEvidence(picture, row);
    items.push({
      id,
      state,
      why: whyFor(state, row.title),
      basedOn: evidence,
      evidence,
      provenance: row.provenance,
      classification: row.provenance,
      ...(client ? { client } : {}),
      ...(clientCode ? { clientCode } : {}),
      kind: row.kind,
    });
  }

  items.sort((a, b) => {
    const rank = RANK_INDEX[a.state] - RANK_INDEX[b.state];
    if (rank !== 0) return rank;
    return a.id.localeCompare(b.id);
  });

  const honestEmpty = items.length === 0;
  const result = blocked && honestEmpty ? 'hvs_blocked' : honestEmpty ? 'honest_empty' : 'answered';

  return {
    kind: 'ask_atlas_attention_v1',
    question: ASK_ATLAS_QUESTION,
    invented: false,
    honestEmpty,
    ranking: [...ASK_ATLAS_RANKING],
    items,
    activity: {
      agent: 'atlas-hub-operator',
      missionKey: ASK_ATLAS_MISSION_KEY,
      trigger: 'operator_operating_picture',
      timestamp: opts?.now || new Date().toISOString(),
      tools: ['operator_operating_picture', 'hvs_actionable_queues'],
      classification: honestEmpty ? 'HONEST_EMPTY' : items[0]!.classification,
      result,
    },
  };
}
