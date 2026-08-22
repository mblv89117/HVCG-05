/**
 * Elite client for signed Hub Ask Atlas attention.
 * Consumes GET /operator.json operatorDesk.askAtlas. Does not invent items.
 */

import type { AtlasHubAuthHeaders } from './api';
import { HubHttpError, hubFetchJson } from './hubFetch';

export const ASK_ATLAS_QUESTION =
  'WHAT ARE THE MOST IMPORTANT THINGS I NEED TO ADDRESS ACROSS HVCG RIGHT NOW, WHY, AND WHAT IS EACH BASED ON?' as const;

export const ASK_ATLAS_KIND = 'ask_atlas_attention_v1' as const;

export type AskAtlasAttentionState =
  | 'At Risk'
  | 'Overdue'
  | 'Decision Required'
  | 'Capital'
  | 'Waiting'
  | 'Blocked';

export type AskAtlasClassification = 'CONFIRMED' | 'LIKELY' | 'PROPOSED';

export interface AskAtlasAttentionItem {
  id: string;
  state: AskAtlasAttentionState | string;
  why: string;
  basedOn: string;
  evidence?: string;
  provenance: AskAtlasClassification | string;
  classification: AskAtlasClassification | string;
  client?: string;
  clientCode?: string;
  kind?: string;
}

export interface AskAtlasActivity {
  agent?: string;
  missionKey?: string;
  trigger?: string;
  timestamp?: string;
  tools?: string[];
  classification?: string;
  result?: string;
}

export interface AskAtlasAnswer {
  kind: typeof ASK_ATLAS_KIND;
  question: string;
  invented: false;
  honestEmpty: boolean;
  ranking: Array<AskAtlasAttentionState | string>;
  items: AskAtlasAttentionItem[];
  activity?: AskAtlasActivity;
}

export interface OperatorJsonResponse {
  operatorDesk?: {
    askAtlas?: AskAtlasAnswer;
  };
  askAtlas?: unknown;
  error?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isAskAtlasAnswer(value: unknown): value is AskAtlasAnswer {
  if (!isRecord(value)) return false;
  if (value.kind !== ASK_ATLAS_KIND) return false;
  if (typeof value.question !== 'string') return false;
  if (value.invented !== false) return false;
  if (typeof value.honestEmpty !== 'boolean') return false;
  if (!Array.isArray(value.ranking) || !Array.isArray(value.items)) return false;
  return true;
}

/** Pull askAtlas only from the signed operator desk envelope. Never from a leaked top-level field. */
export function extractAskAtlasFromOperatorJson(body: unknown): AskAtlasAnswer | null {
  if (!isRecord(body)) return null;
  if (!isRecord(body.operatorDesk)) return null;
  return isAskAtlasAnswer(body.operatorDesk.askAtlas) ? body.operatorDesk.askAtlas : null;
}

export async function fetchOperatorAskAtlas(auth: AtlasHubAuthHeaders): Promise<AskAtlasAnswer> {
  if (!auth.accessToken) {
    throw new HubHttpError(
      401,
      'Microsoft sign-in required (Bearer token missing)',
      { error: 'missing_bearer' },
      'missing_bearer',
    );
  }
  const data = await hubFetchJson<OperatorJsonResponse>(auth, '/operator.json');
  const answer = extractAskAtlasFromOperatorJson(data);
  if (!answer) {
    throw new HubHttpError(
      502,
      'Ask Atlas payload missing from operator desk',
      data,
      'ask_atlas_missing',
    );
  }
  return answer;
}
