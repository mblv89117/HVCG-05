/**
 * Governed READ_AUTO tool gateway for the existing Atlas operator desk.
 *
 * Exposes get_attention_items and get_client_context (READ_AUTO) and
 * create_engineering_mission (PROPOSE_AUTO / SAFE_INTERNAL_WRITE only).
 * Wraps buildAskAtlasAnswer / the entitled operator picture already built
 * by handleOperatorDesk. Does not re-query raw admin Graph. No OWNER_GATED
 * tools. create_engineering_mission does not dispatch V4, deploy, merge,
 * or execute code changes.
 */

import type { AtlasPrincipal } from '../../middleware/auth.ts';
import { isCanonicalClientCode } from '../../entitlements/clientCode.ts';
import { canAccessOperatorDesk, entitledClientCodes } from '../sharepoint/authz.ts';
import { buildAskAtlasAnswer } from './askAtlas.ts';
import {
  ASK_ATLAS_MISSION_KEY,
  ASK_ATLAS_OPERATOR_AGENT,
  ASK_ATLAS_PII_MISSION_KEY,
  ASK_ATLAS_QUESTION,
  ASK_ATLAS_RANKING,
  ASK_ATLAS_RUNTIME_AGENT,
  CREATE_ENGINEERING_MISSION_TOOL,
  GET_ATTENTION_ITEMS_TOOL,
  GET_CLIENT_CONTEXT_TOOL,
  type AskAtlasAnswer,
  type AskAtlasClassification,
  type AtlasClientContext,
  type ClientContextEvidenceClass,
  type OperatorOperatingPicture,
  type ProductImprovementEvidenceClass,
  type ProposedEngineeringMission,
} from './types.ts';

export const READ_AUTO_TOOL_NAMES = [GET_ATTENTION_ITEMS_TOOL, GET_CLIENT_CONTEXT_TOOL] as const;
export type ReadAutoToolName = (typeof READ_AUTO_TOOL_NAMES)[number];
export const TOOL_GATEWAY_POLICY_CLASS = 'READ_AUTO' as const;
export const PROPOSE_AUTO_TOOL_NAMES = [CREATE_ENGINEERING_MISSION_TOOL] as const;
export type ProposeAutoToolName = (typeof PROPOSE_AUTO_TOOL_NAMES)[number];
export const TOOL_GATEWAY_PROPOSE_POLICY_CLASS = 'PROPOSE_AUTO' as const;

export interface ToolGatewayContext {
  principal: AtlasPrincipal;
  picture: OperatorOperatingPicture;
  now?: string;
  clientCode?: string;
  clientQuery?: string;
}

export interface ClientContextToolResult {
  askAtlas: AskAtlasAnswer;
  clientContext: AtlasClientContext;
}

function honestEmptyAnswer(opts?: { now?: string; tools?: string[] }): AskAtlasAnswer {
  return {
    kind: 'ask_atlas_attention_v1',
    question: ASK_ATLAS_QUESTION,
    invented: false,
    honestEmpty: true,
    ranking: [...ASK_ATLAS_RANKING],
    items: [],
    activity: {
      agent: ASK_ATLAS_OPERATOR_AGENT,
      missionKey: ASK_ATLAS_MISSION_KEY,
      trigger: 'operator_operating_picture',
      timestamp: opts?.now || new Date().toISOString(),
      tools: opts?.tools ? [...opts.tools] : [],
      classification: 'HONEST_EMPTY',
      result: 'honest_empty',
      readWriteStatus: 'READ_AUTO',
      policyDecision: 'honest_empty',
    },
  };
}

/**
 * READ_AUTO tool. Authorization (desk principal + entitledClientCodes) is
 * resolved before buildAskAtlasAnswer runs. The picture must already be the
 * entitled operator operating picture from the existing desk loaders.
 */
export function getAttentionItems(ctx: ToolGatewayContext): AskAtlasAnswer {
  if (!canAccessOperatorDesk(ctx.principal)) {
    return honestEmptyAnswer({ now: ctx.now, tools: [GET_ATTENTION_ITEMS_TOOL] });
  }
  entitledClientCodes(ctx.principal);
  const answer = buildAskAtlasAnswer(ctx.picture, { now: ctx.now });
  return {
    ...answer,
    activity: {
      ...answer.activity,
      tools: [...answer.activity.tools, GET_ATTENTION_ITEMS_TOOL],
    },
  };
}

function neverPromoteClassification(
  value: AskAtlasClassification | 'HONEST_EMPTY' | string | undefined,
): AskAtlasClassification | 'HONEST_EMPTY' {
  if (value === 'CONFIRMED' || value === 'LIKELY' || value === 'PROPOSED' || value === 'HONEST_EMPTY') {
    return value;
  }
  return 'HONEST_EMPTY';
}

function normalizeClientToken(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

interface PictureClientBinding {
  client: string;
  clientCode: string;
}

function clientsAlreadyOnPicture(picture: OperatorOperatingPicture): PictureClientBinding[] {
  const out: PictureClientBinding[] = [];
  const seen = new Set<string>();
  const push = (client?: string, clientCode?: string) => {
    const name = (client || '').trim();
    const code = (clientCode || '').trim();
    if (!name && !code) return;
    const key = `${code}::${name}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ client: name, clientCode: code });
  };
  for (const row of picture.hvsRecoveredClients) push(row.client, row.clientCode);
  for (const row of picture.hvsRecoveredClientRecords) push(row.client, row.clientCode);
  for (const row of picture.hvsActionableClientKnowledge) push(row.client, row.clientCode);
  for (const row of picture.hvsRecoveredProjects) push(row.client, row.clientCode);
  for (const row of picture.hvsRecoveredCapitalPackets) push(row.client, row.clientCode);
  for (const row of picture.hvsRecoveredDocuments) push(row.client, row.clientCode);
  for (const queue of Object.values(picture.queues)) {
    for (const row of queue) push(undefined, row.clientCode);
  }
  for (const code of picture.recoveredClientsKnowledgeOperationalized) push(undefined, code);
  for (const code of picture.realClientsOperationalized) push(undefined, code);
  return out;
}

function tokenMatchesBinding(token: string, binding: PictureClientBinding): boolean {
  const raw = token.trim();
  if (!raw) return false;
  const asCode = raw.toUpperCase();
  if (binding.clientCode && asCode === binding.clientCode) return true;
  const q = normalizeClientToken(raw);
  if (!q) return false;
  const name = normalizeClientToken(binding.client);
  if (name && q === name) return true;
  if (name && q.length >= 4 && (name.startsWith(q) || name.split(' ').includes(q))) return true;
  return false;
}

function collapseBindings(hits: PictureClientBinding[]): PictureClientBinding[] {
  const byCode = new Map<string, PictureClientBinding>();
  const unnamed: PictureClientBinding[] = [];
  for (const hit of hits) {
    if (!hit.clientCode) {
      if (hit.client) unnamed.push(hit);
      continue;
    }
    const prev = byCode.get(hit.clientCode);
    if (!prev || hit.client.length > prev.client.length) {
      byCode.set(hit.clientCode, {
        client: hit.client || prev?.client || '',
        clientCode: hit.clientCode,
      });
    }
  }
  return [...byCode.values(), ...unnamed];
}

function emptyClientBinding(): AtlasClientContext['client'] {
  return { entitled: false, hubMiOperationalized: false };
}

function emptyClientContext(opts?: { now?: string }): AtlasClientContext {
  return {
    kind: 'atlas_client_context_v1',
    invented: false,
    honestEmpty: true,
    client: emptyClientBinding(),
    why: 'No entitled recovered or Hub operating evidence is available for the requested client.',
    basedOn: 'Authorization failed closed before retrieval. No client payload was composed.',
    provenance: 'HONEST_EMPTY',
    classification: 'HONEST_EMPTY',
    evidenceClass: 'honest_empty',
    realClientsOperationalized: [],
    recoveredKnowledgeOperationalized: false,
  };
}

function honestEmptyClientResult(opts?: {
  now?: string;
  result?: 'honest_empty' | 'hvs_blocked';
}): ClientContextToolResult {
  const result = opts?.result || 'honest_empty';
  return {
    askAtlas: honestEmptyAnswer({
      now: opts?.now,
      tools: [GET_CLIENT_CONTEXT_TOOL],
    }),
    clientContext: emptyClientContext({ now: opts?.now }),
  };
}

/**
 * Resolve a requested client against entitledClientCodes and clients already
 * present on the entitled operator picture. Does not consult a global catalog
 * or raw admin Graph. Unknown / foreign tokens stay unresolved.
 */
function resolveAuthorizedClient(
  principal: AtlasPrincipal,
  picture: OperatorOperatingPicture,
  requested: string,
): PictureClientBinding | null {
  const token = requested.trim();
  if (!token) return null;
  const entitled = new Set(entitledClientCodes(principal));
  const onPicture = clientsAlreadyOnPicture(picture);
  const asCode = token.toUpperCase();
  if (isCanonicalClientCode(asCode)) {
    if (entitled.has(asCode)) {
      const hit = onPicture.find((row) => row.clientCode === asCode);
      return hit || { client: '', clientCode: asCode };
    }
    const recovered = onPicture.find((row) => row.clientCode === asCode);
    if (recovered) return recovered;
  }
  const entitledHits = collapseBindings(
    onPicture.filter((row) => row.clientCode && entitled.has(row.clientCode) && tokenMatchesBinding(token, row)),
  );
  if (entitledHits.length === 1) return entitledHits[0]!;
  const pictureHits = collapseBindings(onPicture.filter((row) => tokenMatchesBinding(token, row)));
  if (pictureHits.length === 1) return pictureHits[0]!;
  return null;
}

function composeClientContext(
  picture: OperatorOperatingPicture,
  binding: PictureClientBinding,
  items: AskAtlasAnswer['items'],
): AtlasClientContext {
  const code = binding.clientCode;
  const record = picture.hvsRecoveredClientRecords.find((row) =>
    code ? row.clientCode === code : row.client === binding.client,
  );
  const recoveredClient = picture.hvsRecoveredClients.find((row) =>
    code ? row.clientCode === code : row.client === binding.client,
  );
  const knowledge = picture.hvsActionableClientKnowledge.find((row) =>
    code ? row.clientCode === code : row.client === binding.client,
  );
  const clientName = record?.client || recoveredClient?.client || knowledge?.client || binding.client;
  const clientCode = record?.clientCode || recoveredClient?.clientCode || knowledge?.clientCode || binding.clientCode;
  const hubMiOperationalized = picture.realClientsOperationalized.includes(clientCode);
  const recoveredKnowledgeOperationalized = picture.recoveredClientsKnowledgeOperationalized.includes(clientCode);
  const realClientsOperationalized = picture.realClientsOperationalized.filter((row) => row === clientCode);

  const basedOnParts: string[] = [];
  if (record?.nextAction) basedOnParts.push(record.nextAction);
  if (record?.capitalPacketNames.length) {
    basedOnParts.push(`CONFIRMED-as-filename capital packets: ${record.capitalPacketNames.join(', ')}`);
  }
  if (record?.invoiceFilenames.length) {
    basedOnParts.push(`CONFIRMED-as-filename invoices: ${record.invoiceFilenames.join(', ')}`);
  }
  if (record?.projectTitles.length) {
    basedOnParts.push(`Recovered project titles: ${record.projectTitles.join(', ')}`);
  }
  for (const item of items.slice(0, 5)) {
    if (item.basedOn) basedOnParts.push(item.basedOn);
  }
  if (recoveredClient?.nextAction && !basedOnParts.includes(recoveredClient.nextAction)) {
    basedOnParts.push(recoveredClient.nextAction);
  }

  const why =
    items[0]?.why ||
    record?.nextAction ||
    recoveredClient?.nextAction ||
    'No entitled recovered or Hub operating evidence is available for this client.';
  const basedOn =
    basedOnParts[0] ||
    'Entitled operator picture contained no recovered or Hub-MI evidence for this client.';

  let evidenceClass: ClientContextEvidenceClass = 'honest_empty';
  let classification: AskAtlasClassification | 'HONEST_EMPTY' = 'HONEST_EMPTY';
  if (hubMiOperationalized) {
    evidenceClass = 'hub_mi_row';
    classification = 'CONFIRMED';
  } else if (items.length) {
    evidenceClass = 'attention_item';
    classification = neverPromoteClassification(items[0]!.classification);
  } else if (recoveredKnowledgeOperationalized || record?.knowledgeOperationalized) {
    evidenceClass = 'recovered_knowledge';
    classification = neverPromoteClassification(record?.provenance || recoveredClient?.provenance);
  } else if (record || recoveredClient) {
    evidenceClass = 'recovered_folder_filename';
    classification = neverPromoteClassification(record?.provenance || recoveredClient?.provenance);
  }

  const honestEmpty =
    items.length === 0 &&
    !record?.knowledgeOperationalized &&
    !recoveredKnowledgeOperationalized &&
    !hubMiOperationalized &&
    !record &&
    !recoveredClient;

  return {
    kind: 'atlas_client_context_v1',
    invented: false,
    honestEmpty,
    client: {
      ...(clientName ? { client: clientName } : {}),
      ...(clientCode ? { clientCode } : {}),
      entitled: true,
      hubMiOperationalized,
    },
    why,
    basedOn,
    provenance: classification,
    classification,
    evidenceClass,
    realClientsOperationalized,
    recoveredKnowledgeOperationalized,
  };
}

/**
 * READ_AUTO tool. Authorization (desk principal, then entitledClientCodes /
 * clients already on the entitled picture) happens before any client payload
 * is composed. Missing, unknown, and foreign codes fail closed honest-empty
 * without loading other clients. Recovered folder/filename knowledge is never
 * promoted to a Hub-MI CONFIRMED operational client.
 */
export function getClientContext(ctx: ToolGatewayContext): ClientContextToolResult {
  if (!canAccessOperatorDesk(ctx.principal)) {
    return honestEmptyClientResult({ now: ctx.now });
  }
  const requested = (ctx.clientCode || ctx.clientQuery || '').trim();
  if (!requested) {
    return honestEmptyClientResult({ now: ctx.now });
  }
  if (ctx.picture.hvsDataAccess === 'BLOCKED') {
    const blocked = honestEmptyClientResult({ now: ctx.now, result: 'hvs_blocked' });
    return {
      askAtlas: {
        ...blocked.askAtlas,
        activity: {
          ...blocked.askAtlas.activity,
          result: 'hvs_blocked',
          policyDecision: 'hvs_blocked',
        },
      },
      clientContext: blocked.clientContext,
    };
  }

  entitledClientCodes(ctx.principal);
  const binding = resolveAuthorizedClient(ctx.principal, ctx.picture, requested);
  if (!binding) {
    return honestEmptyClientResult({ now: ctx.now });
  }

  const full = buildAskAtlasAnswer(ctx.picture, { now: ctx.now });
  const items = full.items.filter((item) => {
    if (binding.clientCode && item.clientCode === binding.clientCode) return true;
    if (binding.client && item.client === binding.client) return true;
    return false;
  });
  const clientContext = composeClientContext(ctx.picture, binding, items);
  const honestEmpty = clientContext.honestEmpty && items.length === 0;
  const result = honestEmpty ? 'honest_empty' : 'answered';
  return {
    askAtlas: {
      kind: 'ask_atlas_attention_v1',
      question: ASK_ATLAS_QUESTION,
      invented: false,
      honestEmpty,
      ranking: [...ASK_ATLAS_RANKING],
      items,
      activity: {
        agent: ASK_ATLAS_OPERATOR_AGENT,
        missionKey: ASK_ATLAS_MISSION_KEY,
        trigger: 'operator_operating_picture',
        timestamp: ctx.now || new Date().toISOString(),
        tools: [...full.activity.tools, GET_CLIENT_CONTEXT_TOOL],
        classification: neverPromoteClassification(clientContext.classification),
        result,
        readWriteStatus: 'READ_AUTO',
        policyDecision: result,
      },
    },
    clientContext,
  };
}

export function invokeReadAutoTool(tool: string, ctx: ToolGatewayContext): AskAtlasAnswer {
  if (tool === GET_ATTENTION_ITEMS_TOOL) {
    return getAttentionItems(ctx);
  }
  if (tool === GET_CLIENT_CONTEXT_TOOL) {
    return getClientContext(ctx).askAtlas;
  }
  return honestEmptyAnswer({ now: ctx.now, tools: [] });
}

function neverPromote(value: AskAtlasClassification): AskAtlasClassification {
  if (value === 'CONFIRMED' || value === 'LIKELY' || value === 'PROPOSED') {
    return value;
  }
  return 'PROPOSED';
}

/**
 * PROPOSE_AUTO / SAFE_INTERNAL_WRITE only. Builds a visibly non-authoritative
 * proposed engineering mission from already-detected entitled evidence.
 * Does not dispatch V4, deploy, merge, execute code changes, or reach
 * OWNER_GATED actions.
 */
export function createEngineeringMission(opts: {
  why: string;
  basedOn: string;
  evidenceClass: ProductImprovementEvidenceClass;
  classification: AskAtlasClassification;
}): ProposedEngineeringMission {
  return {
    kind: 'proposed_engineering_mission_v1',
    authoritative: false,
    invented: false,
    status: 'PROPOSED',
    policyClass: 'PROPOSE_AUTO',
    readWriteStatus: 'SAFE_INTERNAL_WRITE',
    agent: ASK_ATLAS_RUNTIME_AGENT,
    missionKey: ASK_ATLAS_PII_MISSION_KEY,
    why: opts.why,
    basedOn: opts.basedOn,
    evidenceClass: opts.evidenceClass,
    classification: neverPromote(opts.classification),
    dispatchesV4: false,
    deploys: false,
    merges: false,
    executesCodeChanges: false,
    ownerGated: false,
  };
}
