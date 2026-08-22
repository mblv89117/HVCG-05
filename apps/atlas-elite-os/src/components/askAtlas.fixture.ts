import {
  ASK_ATLAS_QUESTION,
  type AskAtlasAnswer,
  type AtlasAuthorizedSearch,
  type AtlasClientContext,
  type OperatorRuntimeEnvelope,
} from '../integrations/hub/askAtlas';

/** Signed Hub picture for Elite tests. No amounts, LTV, or invented At Risk on Colorado Beef. */
export const SIGNED_ASK_ATLAS_FIXTURE: AskAtlasAnswer = {
  kind: 'ask_atlas_attention_v1',
  question: ASK_ATLAS_QUESTION,
  invented: false,
  honestEmpty: false,
  ranking: ['At Risk', 'Overdue', 'Decision Required', 'Capital', 'Waiting', 'Blocked'],
  items: [
    {
      id: 'at-risk-pdg01',
      state: 'At Risk',
      why: 'Review recovered past-due invoice filenames together with capital-packet filenames. Amounts, payment status, and funding status were not extracted.',
      basedOn: 'Filename-derived Past Due Invoice and Capital_Acquisition packet for Prodigy Games.',
      evidence: 'Filename-derived Past Due Invoice and Capital_Acquisition packet for Prodigy Games.',
      provenance: 'LIKELY',
      classification: 'LIKELY',
      client: 'Prodigy Games',
      clientCode: 'PDG01',
      kind: 'hvs_actionable_at_risk',
    },
    {
      id: 'overdue-pdg01',
      state: 'Overdue',
      why: 'Review recovered past-due invoice filename. Payment status and amounts were not extracted.',
      basedOn: 'Past Due Invoice filename.',
      evidence: 'Past Due Invoice filename.',
      provenance: 'LIKELY',
      classification: 'LIKELY',
      client: 'Prodigy Games',
      clientCode: 'PDG01',
      kind: 'hvs_actionable_overdue',
    },
    {
      id: 'decision-ccb01',
      state: 'Decision Required',
      why: 'A recovered filename requires an operator decision. Do not invent Hub MI rows.',
      basedOn: 'SBA Express next-step filename. Lender-criteria strings are honesty denials, not invented criteria.',
      evidence: 'SBA Express next-step filename. Lender-criteria strings are honesty denials, not invented criteria.',
      provenance: 'PROPOSED',
      classification: 'PROPOSED',
      client: 'Colorado Beef',
      clientCode: 'CCB01',
      kind: 'hvs_actionable_decision',
    },
    {
      id: 'capital-ccb01',
      state: 'Capital',
      why: 'Review recovered capital-packet filename. Amounts, lender criteria, and funding status were not extracted.',
      basedOn: 'CONFIRMED filename Capital_Acquisition packet.',
      evidence: 'CONFIRMED filename Capital_Acquisition packet.',
      provenance: 'CONFIRMED',
      classification: 'CONFIRMED',
      client: 'Colorado Beef',
      clientCode: 'CCB01',
      kind: 'hvs_actionable_capital',
    },
    {
      id: 'waiting-ccb01',
      state: 'Waiting',
      why: 'Waiting on recovered filename evidence. Do not invent missing documents or amounts.',
      basedOn: 'Waiting filename evidence.',
      evidence: 'Waiting filename evidence.',
      provenance: 'PROPOSED',
      classification: 'PROPOSED',
      client: 'Colorado Beef',
      clientCode: 'CCB01',
      kind: 'hvs_actionable_waiting',
    },
  ],
  activity: {
    agent: 'atlas-hub-operator',
    missionKey: 'ATLAS-AGENTIC-OPS-ASK-ATTENTION-001',
    trigger: 'operator_operating_picture',
    timestamp: '2026-08-22T17:00:00.000Z',
    tools: ['operator_operating_picture', 'hvs_actionable_queues'],
    classification: 'LIKELY',
    result: 'answered',
  },
};

export const HONEST_EMPTY_ASK_ATLAS_FIXTURE: AskAtlasAnswer = {
  kind: 'ask_atlas_attention_v1',
  question: ASK_ATLAS_QUESTION,
  invented: false,
  honestEmpty: true,
  ranking: ['At Risk', 'Overdue', 'Decision Required', 'Capital', 'Waiting', 'Blocked'],
  items: [],
  activity: {
    agent: 'atlas-hub-operator',
    missionKey: 'ATLAS-AGENTIC-OPS-ASK-ATTENTION-001',
    trigger: 'operator_operating_picture',
    timestamp: '2026-08-22T17:00:00.000Z',
    tools: ['operator_operating_picture', 'hvs_actionable_queues'],
    classification: 'HONEST_EMPTY',
    result: 'honest_empty',
  },
};

const OVERDUE_RANKING = ['At Risk', 'Overdue', 'Decision Required', 'Capital', 'Waiting', 'Blocked'];

/** Signed runtime picture for "What is overdue?" — two Hub Overdue items, no amounts. */
export const OVERDUE_ASK_ATLAS_FIXTURE: AskAtlasAnswer = {
  kind: 'ask_atlas_attention_v1',
  question: ASK_ATLAS_QUESTION,
  invented: false,
  honestEmpty: false,
  ranking: OVERDUE_RANKING,
  items: [
    SIGNED_ASK_ATLAS_FIXTURE.items[1],
    {
      id: 'overdue-ccb01',
      state: 'Overdue',
      why: 'Review recovered filename marked overdue. Payment status and amounts were not extracted.',
      basedOn: 'Overdue filename evidence.',
      evidence: 'Overdue filename evidence.',
      provenance: 'LIKELY',
      classification: 'LIKELY',
      client: 'Colorado Beef',
      clientCode: 'CCB01',
      kind: 'hvs_actionable_overdue',
    },
  ],
  activity: {
    agent: 'atlas-hub-runtime',
    missionKey: 'ATLAS-AGENTIC-OPS-ATTENTION-NL-001',
    trigger: 'signed_operator_question',
    timestamp: '2026-08-22T23:05:00.000Z',
    tools: ['get_attention_items'],
    classification: 'LIKELY',
    result: 'answered',
  },
};

export const HART_CLIENT_CONTEXT_FIXTURE: AtlasClientContext = {
  kind: 'atlas_client_context_v1',
  invented: false,
  honestEmpty: false,
  client: {
    client: 'Hart Family Dental',
    clientCode: 'HFD01',
    entitled: true,
    hubMiOperationalized: false,
  },
  why: 'Recovered folder filename evidence for Hart Family Dental. Amounts and Hub-MI rows were not extracted.',
  basedOn: 'Recovery ledger filename. Not an operational client row.',
  provenance: 'LIKELY',
  classification: 'LIKELY',
  evidenceClass: 'recovered_folder_filename',
  realClientsOperationalized: [],
  recoveredKnowledgeOperationalized: false,
};

export const SEARCH_PRODIGY_AUTHORIZED_SEARCH_FIXTURE: AtlasAuthorizedSearch = {
  kind: 'atlas_authorized_search_v1',
  invented: false,
  honestEmpty: false,
  query: 'Prodigy',
  hitCount: 1,
  hits: [
    {
      kind: 'document',
      id: 'doc-pdg-1',
      title: 'Prodigy engagement note',
      href: '/clients/PDG01',
      source: 'HVCG_Communications',
      clientCode: 'PDG01',
      why: 'Entitled recovered filename matched the authorized search query.',
      basedOn: 'Authorized SharePoint hit for Prodigy Games.',
      provenance: 'LIKELY',
      classification: 'LIKELY',
    },
  ],
  classification: 'LIKELY',
  why: 'Authorized search returned entitled Prodigy hits. Amounts were not extracted.',
  basedOn: 'search_authorized_knowledge entitled picture.',
  entitled: true,
  ran: true,
  pictureComposed: true,
};

export const OWNER_GATED_ASK_ATLAS_FIXTURE: AskAtlasAnswer = {
  ...HONEST_EMPTY_ASK_ATLAS_FIXTURE,
  activity: {
    agent: 'atlas-hub-runtime',
    missionKey: 'ATLAS-AGENTIC-OPS-RUNTIME-001',
    trigger: 'signed_operator_question',
    timestamp: '2026-08-22T23:32:00.000Z',
    tools: [],
    classification: 'HONEST_EMPTY',
    result: 'honest_empty',
  },
};

export function runtimeEnvelope(partial: {
  askedQuestion: string;
  askAtlas?: AskAtlasAnswer | null;
  clientContext?: AtlasClientContext | null;
  authorizedSearch?: AtlasAuthorizedSearch | null;
  toolsInvoked?: string[];
}): OperatorRuntimeEnvelope {
  return {
    askAtlas: partial.askAtlas ?? null,
    clientContext: partial.clientContext ?? null,
    authorizedSearch: partial.authorizedSearch ?? null,
    runtime: {
      agent: 'atlas-hub-runtime',
      toolsInvoked: partial.toolsInvoked ?? [],
      policyClass: 'READ_AUTO',
    },
    askedQuestion: partial.askedQuestion,
  };
}

export const OVERDUE_RUNTIME_ENVELOPE = runtimeEnvelope({
  askedQuestion: 'What is overdue?',
  askAtlas: OVERDUE_ASK_ATLAS_FIXTURE,
  toolsInvoked: ['get_attention_items'],
});

export const HART_RUNTIME_ENVELOPE = runtimeEnvelope({
  askedQuestion: 'What are we doing for Hart?',
  askAtlas: {
    ...HONEST_EMPTY_ASK_ATLAS_FIXTURE,
    activity: {
      agent: 'atlas-hub-runtime',
      missionKey: 'ATLAS-AGENTIC-OPS-RECOVERED-001',
      trigger: 'signed_operator_question',
      timestamp: '2026-08-22T22:40:00.000Z',
      tools: ['get_client_context'],
      classification: 'LIKELY',
      result: 'answered',
    },
  },
  clientContext: HART_CLIENT_CONTEXT_FIXTURE,
  toolsInvoked: ['get_client_context'],
});

export const SEARCH_PRODIGY_RUNTIME_ENVELOPE = runtimeEnvelope({
  askedQuestion: 'Search Prodigy',
  askAtlas: HONEST_EMPTY_ASK_ATLAS_FIXTURE,
  authorizedSearch: SEARCH_PRODIGY_AUTHORIZED_SEARCH_FIXTURE,
  toolsInvoked: ['search_authorized_knowledge'],
});

export const OWNER_GATED_RUNTIME_ENVELOPE = runtimeEnvelope({
  askedQuestion: 'Submit this to the lender',
  askAtlas: OWNER_GATED_ASK_ATLAS_FIXTURE,
  toolsInvoked: [],
});

export const UNKNOWN_RUNTIME_ENVELOPE = runtimeEnvelope({
  askedQuestion: 'what is the weather in Denver',
  askAtlas: OWNER_GATED_ASK_ATLAS_FIXTURE,
  toolsInvoked: [],
});
