/**
 * Deterministic Hub agent runtime. No new LLM or model spend.
 *
 * Maps a signed operator question (default ASK_ATLAS_QUESTION) onto the
 * READ_AUTO get_attention_items gateway, client-specific questions onto
 * get_client_context, and search questions onto search_authorized_knowledge
 * (SEARCH-001 PM reuse plus SEARCH-002 entitled picture composition
 * plus SEARCH-ACTIONABILITY-001 existing-queue attach and rank).
 * Owner-facing operating-state questions (overdue / waiting / blocked /
 * decisions / Capital / at risk / next / changed today) alias the same
 * get_attention_items engine (ATTENTION-NL-001). Reserved operating-state
 * tokens are never treated as client names. Unknown / owner-gated
 * questions stay honest-empty / fail-closed and do not invent an answer
 * or invoke a READ_AUTO tool.
 */

import type { AtlasPrincipal } from '../../middleware/auth.ts';
import type { PmSearchHit } from '../sharepoint/search.ts';
import {
  getClientContext,
  loadClientContext,
  invokeReadAutoTool,
  searchAuthorizedKnowledge,
  searchAuthorizedKnowledgeSync,
  type ToolGatewayContext,
} from './toolGateway.ts';
import {
  ASK_ATLAS_ATTENTION_NL_MISSION_KEY,
  ASK_ATLAS_CLIENTCTX_MISSION_KEY,
  ASK_ATLAS_QUESTION,
  ASK_ATLAS_RANKING,
  ASK_ATLAS_RECOVERED_MISSION_KEY,
  ASK_ATLAS_RUNTIME_AGENT,
  ASK_ATLAS_RUNTIME_MISSION_KEY,
  ASK_ATLAS_SEARCH_002_MISSION_KEY,
  ASK_ATLAS_AI_COMMUNICATIONS_MISSION_KEY,
  ASK_ATLAS_SEARCH_ACTIONABILITY_MISSION_KEY,
  ASK_ATLAS_SEARCH_MISSION_KEY,
  GET_ATTENTION_ITEMS_TOOL,
  GET_CLIENT_CONTEXT_TOOL,
  GET_SEARCH_AUTHORIZED_KNOWLEDGE_TOOL,
  clientContextMissionKey,
  isReservedOperatingStateToken,
  type AskAtlasAnswer,
  type AskAtlasAttentionState,
  type AskAtlasClassification,
  type AskAtlasMissionKey,
  type AtlasAuthorizedSearch,
  type AtlasClientContext,
  type OperatorOperatingPicture,
  type OperatorSearchHit,
} from './types.ts';

export const ATLAS_HUB_RUNTIME_AGENT = ASK_ATLAS_RUNTIME_AGENT;
export const ATLAS_HUB_RUNTIME_MISSION_KEY = ASK_ATLAS_RUNTIME_MISSION_KEY;
export const ATLAS_HUB_CLIENTCTX_MISSION_KEY = ASK_ATLAS_CLIENTCTX_MISSION_KEY;
export const ATLAS_HUB_RECOVERED_MISSION_KEY = ASK_ATLAS_RECOVERED_MISSION_KEY;
export const ATLAS_HUB_SEARCH_MISSION_KEY = ASK_ATLAS_SEARCH_MISSION_KEY;
export const ATLAS_HUB_SEARCH_002_MISSION_KEY = ASK_ATLAS_SEARCH_002_MISSION_KEY;
export const ATLAS_HUB_SEARCH_ACTIONABILITY_MISSION_KEY = ASK_ATLAS_SEARCH_ACTIONABILITY_MISSION_KEY;
export const ATLAS_HUB_ATTENTION_NL_MISSION_KEY = ASK_ATLAS_ATTENTION_NL_MISSION_KEY;
export const ATLAS_HUB_AI_COMMUNICATIONS_MISSION_KEY = ASK_ATLAS_AI_COMMUNICATIONS_MISSION_KEY;
export const ATLAS_HUB_RUNTIME_POLICY_CLASS = 'READ_AUTO' as const;

export interface AtlasHubRuntime {
  agent: typeof ASK_ATLAS_RUNTIME_AGENT;
  toolsInvoked: string[];
  policyClass: typeof ATLAS_HUB_RUNTIME_POLICY_CLASS;
  missionKey:
    | typeof ASK_ATLAS_RUNTIME_MISSION_KEY
    | typeof ASK_ATLAS_CLIENTCTX_MISSION_KEY
    | typeof ASK_ATLAS_RECOVERED_MISSION_KEY
    | typeof ASK_ATLAS_SEARCH_MISSION_KEY
    | typeof ASK_ATLAS_SEARCH_002_MISSION_KEY
    | typeof ASK_ATLAS_SEARCH_ACTIONABILITY_MISSION_KEY
    | typeof ASK_ATLAS_ATTENTION_NL_MISSION_KEY
    | typeof ASK_ATLAS_AI_COMMUNICATIONS_MISSION_KEY;
}

export interface AtlasHubRuntimeResult {
  askAtlas: AskAtlasAnswer;
  runtime: AtlasHubRuntime;
  clientContext?: AtlasClientContext;
  authorizedSearch?: AtlasAuthorizedSearch;
}

function normalizeQuestion(question: string): string {
  return question.trim().replace(/\s+/g, ' ').replace(/[?!.]+$/g, '').toUpperCase();
}

const ATTENTION_QUESTIONS = new Set(
  [
    ASK_ATLAS_QUESTION,
    'WHAT NEEDS MY ATTENTION',
    'WHAT DO I NEED TO ADDRESS',
    'WHAT ARE THE MOST IMPORTANT THINGS I NEED TO ADDRESS',
    'WHAT ARE THE MOST IMPORTANT THINGS I NEED TO ADDRESS ACROSS HVCG RIGHT NOW',
    'WHAT ARE THE MOST IMPORTANT THINGS I NEED TO ADDRESS ACROSS HVCG RIGHT NOW, WHY, AND WHAT IS EACH BASED ON',
  ].map(normalizeQuestion),
);

export interface AttentionQuestionIntent {
  filterState?: AskAtlasAttentionState;
  missionKey: typeof ASK_ATLAS_RUNTIME_MISSION_KEY | typeof ASK_ATLAS_ATTENTION_NL_MISSION_KEY;
}

function reservedTokenToAttentionState(
  token: string,
): AskAtlasAttentionState | 'ALL' | undefined {
  const normalized = normalizeQuestion(token);
  if (normalized === 'CAPITAL') return 'Capital';
  if (normalized === 'OVERDUE') return 'Overdue';
  if (normalized === 'WAITING') return 'Waiting';
  if (normalized === 'BLOCKED') return 'Blocked';
  if (normalized === 'AT RISK') return 'At Risk';
  if (normalized === 'DECISION' || normalized === 'DECISIONS') return 'Decision Required';
  if (normalized === 'ATTENTION') return 'ALL';
  return undefined;
}

/**
 * State-intent matcher for owner-facing operating-state questions.
 * Used BEFORE extractClientContextQuery so "Summarize Capital" is attention,
 * not a recovered-folder client bind.
 */
function matchAttentionState(
  normalized: string,
  raw: string,
): AskAtlasAttentionState | 'ALL' | undefined {
  if (
    normalized === 'WHAT SHOULD I WORK ON NEXT' ||
    normalized === 'WHAT SHOULD I DO NEXT' ||
    normalized === 'WHAT CHANGED TODAY' ||
    normalized === 'WHAT CHANGED'
  ) {
    return 'ALL';
  }
  if (
    normalized === 'WHAT IS OVERDUE' ||
    normalized === 'WHAT ARE OVERDUE' ||
    normalized === "WHAT'S OVERDUE" ||
    normalized === 'WHICH ITEMS ARE OVERDUE' ||
    normalized === 'OVERDUE'
  ) {
    return 'Overdue';
  }
  if (
    normalized === 'WHAT IS WAITING' ||
    normalized === 'WHAT ARE WE WAITING ON' ||
    normalized === 'WHAT ARE WE WAITING FOR' ||
    normalized === 'WAITING'
  ) {
    return 'Waiting';
  }
  if (
    normalized === 'WHAT IS BLOCKED' ||
    normalized === 'WHAT IS BLOCKED RIGHT NOW' ||
    normalized === 'BLOCKED'
  ) {
    return 'Blocked';
  }
  const whyBlocked = raw.trim().replace(/[?!.]+$/g, '').trim().match(/^why is\s+(.+?)\s+blocked$/i);
  if (whyBlocked && isReservedOperatingStateToken(whyBlocked[1] || '')) {
    return 'Blocked';
  }
  if (
    normalized === 'WHAT DECISIONS DO I NEED TO MAKE' ||
    normalized === 'WHAT DECISIONS NEED TO BE MADE' ||
    normalized === 'WHAT DECISION IS REQUIRED' ||
    normalized === 'WHAT DECISIONS ARE REQUIRED' ||
    normalized === 'DECISION REQUIRED' ||
    normalized === 'WHAT DECISIONS'
  ) {
    return 'Decision Required';
  }
  if (
    normalized === 'SUMMARIZE CAPITAL' ||
    normalized === 'WHAT CAPITAL MATTERS NEED ATTENTION' ||
    normalized === 'WHAT CAPITAL NEEDS ATTENTION' ||
    normalized === 'WHAT CAPITAL' ||
    normalized === 'CAPITAL'
  ) {
    return 'Capital';
  }
  if (
    normalized === 'WHICH CLIENTS ARE AT RISK' ||
    normalized === 'WHAT IS AT RISK' ||
    normalized === 'WHO IS AT RISK' ||
    normalized === 'AT RISK'
  ) {
    return 'At Risk';
  }
  const summarize = raw.trim().replace(/[?!.]+$/g, '').trim().match(/^summarize\s+(.+)$/i);
  if (summarize && isReservedOperatingStateToken(summarize[1] || '')) {
    return reservedTokenToAttentionState(summarize[1] || '');
  }
  return undefined;
}

export function extractAttentionIntent(question: string): AttentionQuestionIntent | null {
  const normalized = normalizeQuestion(question);
  if (ATTENTION_QUESTIONS.has(normalized)) {
    return { missionKey: ASK_ATLAS_RUNTIME_MISSION_KEY };
  }
  const state = matchAttentionState(normalized, question);
  if (state === undefined) return null;
  return {
    ...(state !== 'ALL' ? { filterState: state } : {}),
    missionKey: ASK_ATLAS_ATTENTION_NL_MISSION_KEY,
  };
}

const OWNER_GATED_QUESTION_MARKERS = [
  'LTV',
  'HUB-MI',
  'HUB MI',
  'MONEY MOVE',
  'MONEY MOVEMENT',
  'MOVE MONEY',
  'WIRE FUNDS',
  'TRANSFER FUNDS',
  'LENDER SUBMIT',
  'LENDER OUTREACH',
  'TO THE LENDER',
  'SIGNATURE',
  'CONTRACT SEND',
  'PAID ADS',
  'AD SPEND',
  'LIVE OUTBOUND',
  'OUTBOUND MESSAGE',
  'INVENT AN LTV',
  'INVENT A HUB-MI',
];

export function mapsToGetAttentionItems(question: string): boolean {
  return extractAttentionIntent(question) !== null;
}

export function isOwnerGatedQuestion(question: string): boolean {
  const normalized = normalizeQuestion(question);
  return OWNER_GATED_QUESTION_MARKERS.some((marker) => normalized.includes(marker));
}

export function extractClientContextQuery(question: string): string | null {
  const raw = question.trim().replace(/[?!.]+$/g, '').trim();
  const patterns = [
    /^summarize\s+(.+)$/i,
    /^what are we doing for\s+(.+)$/i,
    /^why is\s+(.+?)\s+blocked$/i,
    /^client context(?:\s+for)?\s+(.+)$/i,
  ];
  for (const pattern of patterns) {
    const match = raw.match(pattern);
    const token = match?.[1]?.trim();
    if (token && !isReservedOperatingStateToken(token)) return token;
  }
  return null;
}

export function mapsToGetClientContext(question: string): boolean {
  if (isOwnerGatedQuestion(question)) return false;
  if (mapsToGetAttentionItems(question)) return false;
  return extractClientContextQuery(question) !== null;
}

export function extractSearchAuthorizedQuery(question: string): string | null {
  const raw = question.trim().replace(/[?!.]+$/g, '').trim();
  const patterns = [
    /^search authorized knowledge(?:\s+for)?\s+(.+)$/i,
    /^what documents do we have(?:\s+for)?\s+(.+)$/i,
    /^find documents(?:\s+for)?\s+(.+)$/i,
    /^search overdue\s+(.+)$/i,
    /^find overdue\s+(.+)$/i,
    /^search\s+(.+)$/i,
  ];
  for (const pattern of patterns) {
    const match = raw.match(pattern);
    const token = match?.[1]?.trim();
    if (token) return token;
  }
  return null;
}

export function mapsToSearchAuthorizedKnowledge(question: string): boolean {
  if (isOwnerGatedQuestion(question)) return false;
  if (mapsToGetAttentionItems(question)) return false;
  if (mapsToGetClientContext(question)) return false;
  return extractSearchAuthorizedQuery(question) !== null;
}

function neverPromoteClassification(
  value: AskAtlasClassification | 'HONEST_EMPTY' | string | undefined,
): AskAtlasClassification | 'HONEST_EMPTY' {
  if (value === 'CONFIRMED' || value === 'LIKELY' || value === 'PROPOSED' || value === 'HONEST_EMPTY') {
    return value;
  }
  return 'HONEST_EMPTY';
}

/**
 * Local composition of already-built entitled attention items. Not a second
 * exception engine: get_attention_items still builds the set; this only
 * filters by the asked operating state. Empty filter → honest-empty.
 */
function composeAttentionAnswer(
  answer: AskAtlasAnswer,
  filterState: AskAtlasAttentionState | undefined,
  toolsInvoked: string[],
  missionKey: AskAtlasMissionKey,
): AskAtlasAnswer {
  const items = filterState ? answer.items.filter((item) => item.state === filterState) : answer.items;
  const honestEmpty = items.length === 0;
  const blocked = answer.activity.result === 'hvs_blocked';
  const result = blocked && honestEmpty ? 'hvs_blocked' : honestEmpty ? 'honest_empty' : 'answered';
  return stampRuntimeAnswer(
    {
      ...answer,
      invented: false,
      honestEmpty,
      items,
      activity: {
        ...answer.activity,
        classification: honestEmpty
          ? 'HONEST_EMPTY'
          : neverPromoteClassification(items[0]?.classification),
        result,
        policyDecision: result,
      },
    },
    toolsInvoked,
    missionKey,
  );
}

function stampRuntimeAnswer(
  answer: AskAtlasAnswer,
  toolsInvoked: string[],
  missionKey: AskAtlasMissionKey,
): AskAtlasAnswer {
  return {
    ...answer,
    question: ASK_ATLAS_QUESTION,
    invented: false,
    activity: {
      ...answer.activity,
      agent: ASK_ATLAS_RUNTIME_AGENT,
      missionKey,
      trigger: 'signed_operator_question',
      tools: [...toolsInvoked],
    },
  };
}

function runtimeEnvelope(
  toolsInvoked: string[],
  missionKey: AtlasHubRuntime['missionKey'] = ASK_ATLAS_RUNTIME_MISSION_KEY,
): AtlasHubRuntime {
  return {
    agent: ASK_ATLAS_RUNTIME_AGENT,
    toolsInvoked: [...toolsInvoked],
    policyClass: ATLAS_HUB_RUNTIME_POLICY_CLASS,
    missionKey,
  };
}

function unknownQuestionAnswer(now?: string): AskAtlasAnswer {
  return stampRuntimeAnswer(
    {
      kind: 'ask_atlas_attention_v1',
      question: ASK_ATLAS_QUESTION,
      invented: false,
      honestEmpty: true,
      ranking: [...ASK_ATLAS_RANKING],
      items: [],
      activity: {
        agent: ASK_ATLAS_RUNTIME_AGENT,
        missionKey: ASK_ATLAS_RUNTIME_MISSION_KEY,
        trigger: 'signed_operator_question',
        timestamp: now || new Date().toISOString(),
        tools: [],
        classification: 'HONEST_EMPTY',
        result: 'honest_empty',
        readWriteStatus: 'READ_AUTO',
        policyDecision: 'honest_empty',
      },
    },
    [],
    ASK_ATLAS_RUNTIME_MISSION_KEY,
  );
}

function finishSearchRuntime(invoked: {
  askAtlas: AskAtlasAnswer;
  authorizedSearch: AtlasAuthorizedSearch;
}): AtlasHubRuntimeResult {
  const toolsInvoked = invoked.askAtlas.activity.tools.includes(GET_SEARCH_AUTHORIZED_KNOWLEDGE_TOOL)
    ? [...invoked.askAtlas.activity.tools]
    : [...invoked.askAtlas.activity.tools, GET_SEARCH_AUTHORIZED_KNOWLEDGE_TOOL];
  const missionKey = invoked.authorizedSearch.actionabilityApplied
    ? ASK_ATLAS_SEARCH_ACTIONABILITY_MISSION_KEY
    : invoked.authorizedSearch.pictureComposed
      ? ASK_ATLAS_SEARCH_002_MISSION_KEY
      : ASK_ATLAS_SEARCH_MISSION_KEY;
  return {
    askAtlas: stampRuntimeAnswer(invoked.askAtlas, toolsInvoked, missionKey),
    runtime: runtimeEnvelope([GET_SEARCH_AUTHORIZED_KNOWLEDGE_TOOL], missionKey),
    authorizedSearch: invoked.authorizedSearch,
  };
}

function searchToolContext(opts: {
  principal: AtlasPrincipal;
  picture: OperatorOperatingPicture;
  question: string;
  now?: string;
  searchQuery?: string;
  deskSearch?: ToolGatewayContext['deskSearch'];
  entitledSearch?: (query: string) => Promise<{ query: string; results: PmSearchHit[] }>;
  requestDocumentPreview?: ToolGatewayContext['requestDocumentPreview'];
  requestDocumentVersions?: ToolGatewayContext['requestDocumentVersions'];
}): ToolGatewayContext {
  return {
    principal: opts.principal,
    picture: opts.picture,
    now: opts.now,
    searchQuery:
      opts.searchQuery || extractSearchAuthorizedQuery(opts.question) || '',
    deskSearch: opts.deskSearch,
    entitledSearch: opts.entitledSearch,
    ...(opts.requestDocumentPreview ? { requestDocumentPreview: opts.requestDocumentPreview } : {}),
    ...(opts.requestDocumentVersions ? { requestDocumentVersions: opts.requestDocumentVersions } : {}),
  };
}

export function runAtlasHubRuntime(opts: {
  principal: AtlasPrincipal;
  picture: OperatorOperatingPicture;
  question?: string;
  now?: string;
  searchQuery?: string;
  deskSearch?: {
    q: string;
    hitCount: number;
    hits: Array<OperatorSearchHit & { source?: string }>;
    ran: boolean;
  };
  entitledIndexHits?: ToolGatewayContext['entitledIndexHits'];
}): AtlasHubRuntimeResult {
  const question = (opts.question || ASK_ATLAS_QUESTION).trim() || ASK_ATLAS_QUESTION;
  if (
    isOwnerGatedQuestion(question) ||
    (!mapsToGetAttentionItems(question) &&
      !mapsToGetClientContext(question) &&
      !mapsToSearchAuthorizedKnowledge(question))
  ) {
    return {
      askAtlas: unknownQuestionAnswer(opts.now),
      runtime: runtimeEnvelope([]),
    };
  }

  if (mapsToSearchAuthorizedKnowledge(question)) {
    return finishSearchRuntime(
      searchAuthorizedKnowledgeSync(
        searchToolContext({
          principal: opts.principal,
          picture: opts.picture,
          question,
          now: opts.now,
          searchQuery: opts.searchQuery,
          deskSearch: opts.deskSearch,
        }),
      ),
    );
  }

  if (mapsToGetClientContext(question)) {
    const invoked = getClientContext({
      principal: opts.principal,
      picture: opts.picture,
      now: opts.now,
      clientQuery: extractClientContextQuery(question) || '',
      deskSearch: opts.deskSearch,
      entitledIndexHits: opts.entitledIndexHits,
    });
    const toolsInvoked = invoked.askAtlas.activity.tools.includes(GET_CLIENT_CONTEXT_TOOL)
      ? [...invoked.askAtlas.activity.tools]
      : [...invoked.askAtlas.activity.tools, GET_CLIENT_CONTEXT_TOOL];
    const missionKey = clientContextMissionKey(invoked.clientContext);
    return {
      askAtlas: stampRuntimeAnswer(invoked.askAtlas, toolsInvoked, missionKey),
      runtime: runtimeEnvelope([GET_CLIENT_CONTEXT_TOOL], missionKey),
      clientContext: invoked.clientContext,
    };
  }

  const intent = extractAttentionIntent(question) || {
    missionKey: ASK_ATLAS_RUNTIME_MISSION_KEY,
  };
  const answer = invokeReadAutoTool(GET_ATTENTION_ITEMS_TOOL, {
    principal: opts.principal,
    picture: opts.picture,
    now: opts.now,
  });
  const toolsInvoked = answer.activity.tools.includes(GET_ATTENTION_ITEMS_TOOL)
    ? [...answer.activity.tools]
    : [...answer.activity.tools, GET_ATTENTION_ITEMS_TOOL];
  const missionKey = intent.missionKey;
  return {
    askAtlas: composeAttentionAnswer(answer, intent.filterState, toolsInvoked, missionKey),
    runtime: runtimeEnvelope([GET_ATTENTION_ITEMS_TOOL], missionKey),
  };
}

/**
 * Same get_client_context mapping as runAtlasHubRuntime, then attach the
 * already-loaded entitled project operating records for a bound current
 * entitled client. Used by signed /operator/runtime.json and
 * /operator/client-context.json.
 */
export async function runAtlasClientContextRuntime(opts: {
  principal: AtlasPrincipal;
  picture: OperatorOperatingPicture;
  question?: string;
  now?: string;
  clientCode?: string;
  clientQuery?: string;
  deskSearch?: ToolGatewayContext['deskSearch'];
  entitledSearch?: (query: string) => Promise<{ query: string; results: PmSearchHit[] }>;
  entitledIndexHits?: ToolGatewayContext['entitledIndexHits'];
}): Promise<AtlasHubRuntimeResult> {
  const question = (opts.question || '').trim();
  if (question && isOwnerGatedQuestion(question)) {
    return {
      askAtlas: unknownQuestionAnswer(opts.now),
      runtime: runtimeEnvelope([]),
    };
  }
  const invoked = await loadClientContext({
    principal: opts.principal,
    picture: opts.picture,
    now: opts.now,
    clientCode: opts.clientCode,
    clientQuery: opts.clientQuery || (question ? extractClientContextQuery(question) || '' : ''),
    deskSearch: opts.deskSearch,
    entitledSearch: opts.entitledSearch,
    entitledIndexHits: opts.entitledIndexHits,
  });
  const toolsInvoked = invoked.askAtlas.activity.tools.includes(GET_CLIENT_CONTEXT_TOOL)
    ? [...invoked.askAtlas.activity.tools]
    : [...invoked.askAtlas.activity.tools, GET_CLIENT_CONTEXT_TOOL];
  const missionKey = clientContextMissionKey(invoked.clientContext);
  return {
    askAtlas: stampRuntimeAnswer(invoked.askAtlas, toolsInvoked, missionKey),
    runtime: runtimeEnvelope([GET_CLIENT_CONTEXT_TOOL], missionKey),
    clientContext: invoked.clientContext,
  };
}

/**
 * Same mapping as runAtlasHubRuntime, but retrieves through the existing
 * entitled search (searchSharePointPm) after authorization. Used by signed
 * /operator/runtime.json and /operator/search.json.
 */
export async function runAtlasSearchRuntime(opts: {
  principal: AtlasPrincipal;
  picture: OperatorOperatingPicture;
  question?: string;
  now?: string;
  searchQuery?: string;
  deskSearch?: ToolGatewayContext['deskSearch'];
  entitledSearch?: (query: string) => Promise<{ query: string; results: PmSearchHit[] }>;
  requestDocumentPreview?: ToolGatewayContext['requestDocumentPreview'];
  requestDocumentVersions?: ToolGatewayContext['requestDocumentVersions'];
}): Promise<AtlasHubRuntimeResult> {
  const question = (opts.question || '').trim();
  if (question && isOwnerGatedQuestion(question)) {
    return {
      askAtlas: unknownQuestionAnswer(opts.now),
      runtime: runtimeEnvelope([]),
    };
  }
  if (question && !mapsToSearchAuthorizedKnowledge(question)) {
    return {
      askAtlas: unknownQuestionAnswer(opts.now),
      runtime: runtimeEnvelope([]),
    };
  }
  const invoked = await searchAuthorizedKnowledge(
    searchToolContext({
      principal: opts.principal,
      picture: opts.picture,
      question,
      now: opts.now,
      searchQuery: opts.searchQuery,
      deskSearch: opts.deskSearch,
      entitledSearch: opts.entitledSearch,
      requestDocumentPreview: opts.requestDocumentPreview,
      requestDocumentVersions: opts.requestDocumentVersions,
    }),
  );
  return finishSearchRuntime(invoked);
}
