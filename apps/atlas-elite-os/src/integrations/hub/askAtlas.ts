/**
 * Elite client for signed Hub Ask Atlas runtime.
 * Consumes GET /operator/runtime.json?question= . Does not invent items.
 */

import type { AtlasHubAuthHeaders } from './api';
import { HubHttpError, hubFetchJson } from './hubFetch';

export const ASK_ATLAS_QUESTION =
  'WHAT ARE THE MOST IMPORTANT THINGS I NEED TO ADDRESS ACROSS HVCG RIGHT NOW, WHY, AND WHAT IS EACH BASED ON?' as const;

export const ASK_ATLAS_KIND = 'ask_atlas_attention_v1' as const;
export const ASK_ATLAS_CLIENT_CONTEXT_KIND = 'atlas_client_context_v1' as const;
export const ASK_ATLAS_AUTHORIZED_SEARCH_KIND = 'atlas_authorized_search_v1' as const;

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

export type ClientContextEvidenceClass =
  | 'recovered_folder_filename'
  | 'recovered_knowledge'
  | 'attention_item'
  | 'hub_mi_row'
  | 'honest_empty'
  | string;

export interface AtlasClientContextBinding {
  client?: string;
  clientCode?: string;
  entitled: boolean;
  hubMiOperationalized: boolean;
}

export interface AtlasClientContext {
  kind: typeof ASK_ATLAS_CLIENT_CONTEXT_KIND;
  invented: false;
  honestEmpty: boolean;
  client: AtlasClientContextBinding;
  why: string;
  basedOn: string;
  provenance: AskAtlasClassification | 'HONEST_EMPTY' | string;
  classification: AskAtlasClassification | 'HONEST_EMPTY' | string;
  evidenceClass: ClientContextEvidenceClass;
  realClientsOperationalized: string[];
  recoveredKnowledgeOperationalized: boolean;
}

export interface AtlasAuthorizedSearchHit {
  kind: string;
  id: string;
  title: string;
  href?: string;
  source?: string;
  clientCode?: string;
  why: string;
  basedOn: string;
  provenance: AskAtlasClassification | 'HONEST_EMPTY' | string;
  classification: AskAtlasClassification | 'HONEST_EMPTY' | string;
}

export interface AtlasAuthorizedSearch {
  kind: typeof ASK_ATLAS_AUTHORIZED_SEARCH_KIND;
  invented: false;
  honestEmpty: boolean;
  query: string;
  hitCount: number;
  hits: AtlasAuthorizedSearchHit[];
  classification: AskAtlasClassification | 'HONEST_EMPTY' | string;
  why: string;
  basedOn: string;
  entitled: boolean;
  ran: boolean;
  pictureComposed: boolean;
}

export interface AtlasHubRuntimeMeta {
  agent?: string;
  toolsInvoked: string[];
  policyClass?: string;
  missionKey?: string;
}

export interface OperatorRuntimeEnvelope {
  askAtlas: AskAtlasAnswer | null;
  clientContext: AtlasClientContext | null;
  authorizedSearch: AtlasAuthorizedSearch | null;
  runtime: AtlasHubRuntimeMeta | null;
  askedQuestion: string;
}

export interface OperatorJsonResponse {
  operatorDesk?: {
    askAtlas?: AskAtlasAnswer;
  };
  askAtlas?: unknown;
  clientContext?: unknown;
  authorizedSearch?: unknown;
  runtime?: unknown;
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

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is string => typeof row === 'string');
}

function isClientContext(value: unknown): value is AtlasClientContext {
  if (!isRecord(value)) return false;
  if (value.kind !== ASK_ATLAS_CLIENT_CONTEXT_KIND) return false;
  if (value.invented !== false) return false;
  if (typeof value.honestEmpty !== 'boolean') return false;
  if (!isRecord(value.client)) return false;
  if (typeof value.client.entitled !== 'boolean') return false;
  if (typeof value.client.hubMiOperationalized !== 'boolean') return false;
  if (typeof value.why !== 'string' || typeof value.basedOn !== 'string') return false;
  if (typeof value.classification !== 'string' || typeof value.evidenceClass !== 'string') return false;
  if (!Array.isArray(value.realClientsOperationalized)) return false;
  if (typeof value.recoveredKnowledgeOperationalized !== 'boolean') return false;
  return true;
}

function isAuthorizedSearchHit(value: unknown): value is AtlasAuthorizedSearchHit {
  if (!isRecord(value)) return false;
  if (typeof value.id !== 'string' || typeof value.title !== 'string') return false;
  if (typeof value.why !== 'string' || typeof value.basedOn !== 'string') return false;
  if (typeof value.classification !== 'string' || typeof value.provenance !== 'string') return false;
  return true;
}

function isAuthorizedSearch(value: unknown): value is AtlasAuthorizedSearch {
  if (!isRecord(value)) return false;
  if (value.kind !== ASK_ATLAS_AUTHORIZED_SEARCH_KIND) return false;
  if (value.invented !== false) return false;
  if (typeof value.honestEmpty !== 'boolean') return false;
  if (typeof value.query !== 'string' || typeof value.hitCount !== 'number') return false;
  if (!Array.isArray(value.hits) || !value.hits.every(isAuthorizedSearchHit)) return false;
  if (typeof value.classification !== 'string') return false;
  if (typeof value.why !== 'string' || typeof value.basedOn !== 'string') return false;
  if (typeof value.entitled !== 'boolean' || typeof value.ran !== 'boolean') return false;
  if (typeof value.pictureComposed !== 'boolean') return false;
  return true;
}

function isRuntimeMeta(value: unknown): value is AtlasHubRuntimeMeta {
  if (!isRecord(value)) return false;
  if (!Array.isArray(value.toolsInvoked)) return false;
  return value.toolsInvoked.every((row) => typeof row === 'string');
}

export function normalizeAskAtlasQuestion(question?: string | null): string {
  const trimmed = String(question || '').trim();
  return trimmed || ASK_ATLAS_QUESTION;
}

/** Signed Hub runtime path. Never called without a Hub Bearer. */
export function operatorRuntimePath(question?: string | null): string {
  return `/operator/runtime.json?question=${encodeURIComponent(normalizeAskAtlasQuestion(question))}`;
}

/** Pull askAtlas only from the signed operator desk envelope. Never from a leaked top-level field. */
export function extractAskAtlasFromOperatorJson(body: unknown): AskAtlasAnswer | null {
  if (!isRecord(body)) return null;
  if (!isRecord(body.operatorDesk)) return null;
  return isAskAtlasAnswer(body.operatorDesk.askAtlas) ? body.operatorDesk.askAtlas : null;
}

/** Pull clientContext only from the signed runtime envelope. Do not invent Hub-MI. */
export function extractClientContextFromRuntime(body: unknown): AtlasClientContext | null {
  if (!isRecord(body)) return null;
  if (!isClientContext(body.clientContext)) return null;
  const ctx = body.clientContext;
  return {
    ...ctx,
    invented: false,
    realClientsOperationalized: asStringArray(ctx.realClientsOperationalized),
    client: {
      entitled: ctx.client.entitled === true,
      hubMiOperationalized: ctx.client.hubMiOperationalized === true,
      ...(typeof ctx.client.client === 'string' && ctx.client.client.trim()
        ? { client: ctx.client.client.trim() }
        : {}),
      ...(typeof ctx.client.clientCode === 'string' && ctx.client.clientCode.trim()
        ? { clientCode: ctx.client.clientCode.trim() }
        : {}),
    },
  };
}

/** Pull authorizedSearch only from the signed runtime envelope. Do not invent hits. */
export function extractAuthorizedSearchFromRuntime(body: unknown): AtlasAuthorizedSearch | null {
  if (!isRecord(body)) return null;
  return isAuthorizedSearch(body.authorizedSearch) ? body.authorizedSearch : null;
}

export function extractRuntimeMeta(body: unknown): AtlasHubRuntimeMeta | null {
  if (!isRecord(body)) return null;
  if (!isRuntimeMeta(body.runtime)) return null;
  return body.runtime;
}

export function extractOperatorRuntimeEnvelope(
  body: unknown,
  askedQuestion: string,
): OperatorRuntimeEnvelope {
  return {
    askAtlas: extractAskAtlasFromOperatorJson(body),
    clientContext: extractClientContextFromRuntime(body),
    authorizedSearch: extractAuthorizedSearchFromRuntime(body),
    runtime: extractRuntimeMeta(body),
    askedQuestion: normalizeAskAtlasQuestion(askedQuestion),
  };
}

function requireBearer(auth: AtlasHubAuthHeaders): string {
  const token = String(auth.accessToken || '').trim();
  if (!token) {
    throw new HubHttpError(
      401,
      'Microsoft sign-in required (Bearer token missing)',
      { error: 'missing_bearer' },
      'missing_bearer',
    );
  }
  return token;
}

export async function fetchOperatorRuntime(
  auth: AtlasHubAuthHeaders,
  question?: string | null,
): Promise<OperatorRuntimeEnvelope> {
  requireBearer(auth);
  const askedQuestion = normalizeAskAtlasQuestion(question);
  const data = await hubFetchJson<OperatorJsonResponse>(auth, operatorRuntimePath(askedQuestion));
  const envelope = extractOperatorRuntimeEnvelope(data, askedQuestion);
  if (!envelope.askAtlas && !envelope.clientContext && !envelope.authorizedSearch) {
    throw new HubHttpError(
      502,
      'Ask Atlas runtime payload missing from operator desk',
      data,
      'ask_atlas_missing',
    );
  }
  return envelope;
}

export async function fetchOperatorAskAtlas(
  auth: AtlasHubAuthHeaders,
  question?: string | null,
): Promise<AskAtlasAnswer> {
  const envelope = await fetchOperatorRuntime(auth, question);
  if (!envelope.askAtlas) {
    throw new HubHttpError(
      502,
      'Ask Atlas payload missing from operator desk',
      envelope,
      'ask_atlas_missing',
    );
  }
  return envelope.askAtlas;
}
