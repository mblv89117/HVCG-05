/**
 * Deterministic Hub agent runtime. No new LLM or model spend.
 *
 * Maps a signed operator question (default ASK_ATLAS_QUESTION) onto the
 * READ_AUTO get_attention_items gateway. Unknown questions stay honest-empty
 * / fail-closed and do not invent an answer.
 */

import type { AtlasPrincipal } from '../../middleware/auth.ts';
import { invokeReadAutoTool } from './toolGateway.ts';
import {
  ASK_ATLAS_QUESTION,
  ASK_ATLAS_RANKING,
  ASK_ATLAS_RUNTIME_AGENT,
  ASK_ATLAS_RUNTIME_MISSION_KEY,
  GET_ATTENTION_ITEMS_TOOL,
  type AskAtlasAnswer,
  type OperatorOperatingPicture,
} from './types.ts';

export const ATLAS_HUB_RUNTIME_AGENT = ASK_ATLAS_RUNTIME_AGENT;
export const ATLAS_HUB_RUNTIME_MISSION_KEY = ASK_ATLAS_RUNTIME_MISSION_KEY;
export const ATLAS_HUB_RUNTIME_POLICY_CLASS = 'READ_AUTO' as const;

export interface AtlasHubRuntime {
  agent: typeof ASK_ATLAS_RUNTIME_AGENT;
  toolsInvoked: string[];
  policyClass: typeof ATLAS_HUB_RUNTIME_POLICY_CLASS;
  missionKey: typeof ASK_ATLAS_RUNTIME_MISSION_KEY;
}

export interface AtlasHubRuntimeResult {
  askAtlas: AskAtlasAnswer;
  runtime: AtlasHubRuntime;
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

export function mapsToGetAttentionItems(question: string): boolean {
  return ATTENTION_QUESTIONS.has(normalizeQuestion(question));
}

function stampRuntimeAnswer(answer: AskAtlasAnswer, toolsInvoked: string[]): AskAtlasAnswer {
  return {
    ...answer,
    question: ASK_ATLAS_QUESTION,
    invented: false,
    activity: {
      ...answer.activity,
      agent: ASK_ATLAS_RUNTIME_AGENT,
      missionKey: ASK_ATLAS_RUNTIME_MISSION_KEY,
      trigger: 'signed_operator_question',
      tools: [...toolsInvoked],
    },
  };
}

function runtimeEnvelope(toolsInvoked: string[]): AtlasHubRuntime {
  return {
    agent: ASK_ATLAS_RUNTIME_AGENT,
    toolsInvoked: [...toolsInvoked],
    policyClass: ATLAS_HUB_RUNTIME_POLICY_CLASS,
    missionKey: ASK_ATLAS_RUNTIME_MISSION_KEY,
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
  );
}

export function runAtlasHubRuntime(opts: {
  principal: AtlasPrincipal;
  picture: OperatorOperatingPicture;
  question?: string;
  now?: string;
}): AtlasHubRuntimeResult {
  const question = (opts.question || ASK_ATLAS_QUESTION).trim() || ASK_ATLAS_QUESTION;
  if (!mapsToGetAttentionItems(question)) {
    return {
      askAtlas: unknownQuestionAnswer(opts.now),
      runtime: runtimeEnvelope([]),
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
    askAtlas: stampRuntimeAnswer(answer, toolsInvoked),
    runtime: runtimeEnvelope([GET_ATTENTION_ITEMS_TOOL]),
  };
}
