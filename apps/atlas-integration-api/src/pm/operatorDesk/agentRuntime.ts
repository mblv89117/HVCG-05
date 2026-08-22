/**
 * Deterministic Hub agent runtime. No new LLM or model spend.
 *
 * Maps a signed operator question (default ASK_ATLAS_QUESTION) onto the
 * READ_AUTO get_attention_items gateway, client-specific questions onto
 * get_client_context, and search questions onto search_authorized_knowledge.
 * Unknown / owner-gated questions stay honest-empty / fail-closed and do
 * not invent an answer or invoke a READ_AUTO tool.
 */

import type { AtlasPrincipal } from '../../middleware/auth.ts';
import type { PmSearchHit } from '../sharepoint/search.ts';
import {
  getClientContext,
  invokeReadAutoTool,
  searchAuthorizedKnowledge,
  searchAuthorizedKnowledgeSync,
  type ToolGatewayContext,
} from './toolGateway.ts';
import {
  ASK_ATLAS_CLIENTCTX_MISSION_KEY,
  ASK_ATLAS_QUESTION,
  ASK_ATLAS_RANKING,
  ASK_ATLAS_RUNTIME_AGENT,
  ASK_ATLAS_RUNTIME_MISSION_KEY,
  ASK_ATLAS_SEARCH_MISSION_KEY,
  GET_ATTENTION_ITEMS_TOOL,
  GET_CLIENT_CONTEXT_TOOL,
  GET_SEARCH_AUTHORIZED_KNOWLEDGE_TOOL,
  type AskAtlasAnswer,
  type AskAtlasMissionKey,
  type AtlasAuthorizedSearch,
  type AtlasClientContext,
  type OperatorOperatingPicture,
  type OperatorSearchHit,
} from './types.ts';

export const ATLAS_HUB_RUNTIME_AGENT = ASK_ATLAS_RUNTIME_AGENT;
export const ATLAS_HUB_RUNTIME_MISSION_KEY = ASK_ATLAS_RUNTIME_MISSION_KEY;
export const ATLAS_HUB_CLIENTCTX_MISSION_KEY = ASK_ATLAS_CLIENTCTX_MISSION_KEY;
export const ATLAS_HUB_SEARCH_MISSION_KEY = ASK_ATLAS_SEARCH_MISSION_KEY;
export const ATLAS_HUB_RUNTIME_POLICY_CLASS = 'READ_AUTO' as const;

export interface AtlasHubRuntime {
  agent: typeof ASK_ATLAS_RUNTIME_AGENT;
  toolsInvoked: string[];
  policyClass: typeof ATLAS_HUB_RUNTIME_POLICY_CLASS;
  missionKey:
    | typeof ASK_ATLAS_RUNTIME_MISSION_KEY
    | typeof ASK_ATLAS_CLIENTCTX_MISSION_KEY
    | typeof ASK_ATLAS_SEARCH_MISSION_KEY;
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
  return ATTENTION_QUESTIONS.has(normalizeQuestion(question));
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
    if (token) return token;
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
  return {
    askAtlas: stampRuntimeAnswer(invoked.askAtlas, toolsInvoked, ASK_ATLAS_SEARCH_MISSION_KEY),
    runtime: runtimeEnvelope([GET_SEARCH_AUTHORIZED_KNOWLEDGE_TOOL], ASK_ATLAS_SEARCH_MISSION_KEY),
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
}): ToolGatewayContext {
  return {
    principal: opts.principal,
    picture: opts.picture,
    now: opts.now,
    searchQuery:
      opts.searchQuery || extractSearchAuthorizedQuery(opts.question) || '',
    deskSearch: opts.deskSearch,
    entitledSearch: opts.entitledSearch,
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
    });
    const toolsInvoked = invoked.askAtlas.activity.tools.includes(GET_CLIENT_CONTEXT_TOOL)
      ? [...invoked.askAtlas.activity.tools]
      : [...invoked.askAtlas.activity.tools, GET_CLIENT_CONTEXT_TOOL];
    return {
      askAtlas: stampRuntimeAnswer(invoked.askAtlas, toolsInvoked, ASK_ATLAS_CLIENTCTX_MISSION_KEY),
      runtime: runtimeEnvelope([GET_CLIENT_CONTEXT_TOOL], ASK_ATLAS_CLIENTCTX_MISSION_KEY),
      clientContext: invoked.clientContext,
    };
  }

  const answer = invokeReadAutoTool(GET_ATTENTION_ITEMS_TOOL, {
    principal: opts.principal,
    picture: opts.picture,
    now: opts.now,
  });
  const toolsInvoked = answer.activity.tools.includes(GET_ATTENTION_ITEMS_TOOL)
    ? [...answer.activity.tools]
    : [...answer.activity.tools, GET_ATTENTION_ITEMS_TOOL];
  return {
    askAtlas: stampRuntimeAnswer(answer, toolsInvoked, ASK_ATLAS_RUNTIME_MISSION_KEY),
    runtime: runtimeEnvelope([GET_ATTENTION_ITEMS_TOOL]),
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
    }),
  );
  return finishSearchRuntime(invoked);
}
