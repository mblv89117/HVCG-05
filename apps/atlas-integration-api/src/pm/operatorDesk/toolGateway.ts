/**
 * Governed READ_AUTO tool gateway for the existing Atlas operator desk.
 *
 * Exposes get_attention_items, get_client_context, and
 * search_authorized_knowledge (READ_AUTO) and create_engineering_mission
 * (PROPOSE_AUTO / SAFE_INTERNAL_WRITE only). Search reuses
 * searchSharePointPm / GET /api/pm/search / operatorDesk.search and, after
 * an entitled binding is resolved, composes additive hits from the already-
 * authorized OperatorOperatingPicture. Does not re-query raw admin Graph or
 * invent a second index. No OWNER_GATED tools.
 * create_engineering_mission does not dispatch V4, deploy, merge, or
 * execute code changes.
 */

import type { AtlasPrincipal } from '../../middleware/auth.ts';
import { isCanonicalClientCode } from '../../entitlements/clientCode.ts';
import { canAccessOperatorDesk, entitledClientCodes } from '../sharepoint/authz.ts';
import { isMannyPrincipal } from '../sharepoint/manny.ts';
import { authoritativeSourceUrl } from '../sharepoint/fabric/fileIndex.ts';
import {
  DOCUMENT_PREVIEW_BASED_ON,
  DOCUMENT_PREVIEW_PAGE_SIZE,
  type DocumentPreviewFields,
} from '../sharepoint/fabric/documentPreview.ts';
import {
  DOCUMENT_VERSION_BASED_ON,
  DOCUMENT_VERSION_PAGE_SIZE,
  type DocumentVersionFields,
} from '../sharepoint/fabric/documentVersion.ts';
import type { PmSearchHit } from '../sharepoint/search.ts';
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
  GET_SEARCH_AUTHORIZED_KNOWLEDGE_TOOL,
  isReservedOperatingStateToken,
  type AskAtlasAnswer,
  type AskAtlasClassification,
  type AtlasAuthorizedSearch,
  type AtlasAuthorizedSearchHit,
  type DocumentOperatingRecord,
  type AtlasClientContext,
  type ClientContextEvidenceClass,
  type OperatorOperatingItem,
  type OperatorOperatingPicture,
  type OperatorSearchHit,
  type ProductImprovementEvidenceClass,
  type ProjectOperatingClassification,
  type ProjectOperatingEvidenceRef,
  type ProjectOperatingRecord,
  type ProposedEngineeringMission,
} from './types.ts';
import {
  composeCapitalSubmissionPrepare,
  emptyCapitalSubmissionPayload,
} from './capitalSubmissionPrepare.ts';
import { composeMailThreadRecords, emptyMailThreadPayload } from './mailThreadContext.ts';
import {
  composeMeetingOperatingRecords,
  emptyMeetingOperatingPayload,
} from './meetingOperatingRecord.ts';
import {
  composeResearchIntelligence,
  emptyResearchIntelligencePayload,
} from './researchIntelligence.ts';
import { composeOnboardingAgent, emptyOnboardingPayload } from './onboardingAgent.ts';
import { composeClientSupportAgent, emptyClientSupportPayload } from './clientSupportAgent.ts';
import { attachRelatedContextToDocuments } from './documentRelatedContext.ts';

export const SEARCH_QUEUE_URGENCY = [
  'Overdue',
  'Blocked',
  'Decision Required',
  'Needs Action',
  'At Risk',
  'Waiting',
  'Capital',
  'Ready',
] as const;
export type SearchQueueUrgency = (typeof SEARCH_QUEUE_URGENCY)[number];

const SEARCH_QUEUE_RANK: Record<SearchQueueUrgency | 'none', number> = {
  Overdue: 0,
  Blocked: 1,
  'Decision Required': 2,
  'Needs Action': 3,
  'At Risk': 4,
  Waiting: 5,
  Capital: 6,
  Ready: 7,
  none: 8,
};

const SEARCH_CLASS_RANK = {
  CONFIRMED: 0,
  LIKELY: 1,
  PROPOSED: 2,
  HONEST_EMPTY: 3,
} as const;

const GENERIC_SEARCH_HIT_WHY = 'Entitled desk search returned this hit for the requested query.';
const GENERIC_QUEUE_HIT_WHY = 'Entitled operator picture queue item already on the desk.';

export const READ_AUTO_TOOL_NAMES = [
  GET_ATTENTION_ITEMS_TOOL,
  GET_CLIENT_CONTEXT_TOOL,
  GET_SEARCH_AUTHORIZED_KNOWLEDGE_TOOL,
] as const;
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
  searchQuery?: string;
  deskSearch?: {
    q: string;
    hitCount: number;
    hits: Array<OperatorSearchHit & { source?: string }>;
    ran: boolean;
  };
  /**
   * Existing entitled desk search. Must be searchSharePointPm (or a test
   * double of that function). Do not pass a second index or raw Graph.
   */
  entitledSearch?: (query: string) => Promise<{ query: string; results: PmSearchHit[] }>;
  /**
   * Already-loaded entitled index rows (searchSharePointPm / desk search).
   * get_client_context copies project_operating_record_v1 from these only.
   * Do not pass HVS folder copies or invented ClientCodes.
   */
  entitledIndexHits?: PmSearchHit[];
  /**
   * Optional Graph driveItem preview for a small page of already-authorized
   * document hits. Authorization happens before this runs. Does not invent ids.
   */
  requestDocumentPreview?: (ref: { driveId: string; itemId: string }) => Promise<DocumentPreviewFields>;
  /**
   * Optional Graph driveItem versions for a small page of already-authorized
   * document hits. Authorization happens before this runs. Metadata only.
   */
  requestDocumentVersions?: (ref: { driveId: string; itemId: string }) => Promise<DocumentVersionFields>;
}

export interface ClientContextToolResult {
  askAtlas: AskAtlasAnswer;
  clientContext: AtlasClientContext;
}

export interface AuthorizedSearchToolResult {
  askAtlas: AskAtlasAnswer;
  authorizedSearch: AtlasAuthorizedSearch;
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
  for (const row of picture.recoveryLedger) {
    const code = (row.clientCode || '').trim();
    if (!isCanonicalClientCode(code)) continue;
    push(row.client, code);
  }
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
    projects: emptyProjectOperatingPayload(),
    threads: emptyMailThreadPayload(),
    meetings: emptyMeetingOperatingPayload(),
    capitalSubmissions: emptyCapitalSubmissionPayload(),
    researchIntelligence: emptyResearchIntelligencePayload(opts?.now),
    onboarding: emptyOnboardingPayload(),
    clientSupport: emptyClientSupportPayload(),
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
  if (isReservedOperatingStateToken(token)) return null;
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

function presentRows<T>(rows: T[] | undefined): T[] | undefined {
  return rows && rows.length ? rows : undefined;
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
  const ledger = picture.recoveryLedger.find((row) =>
    code
      ? row.clientCode === code
      : Boolean(row.client && binding.client && row.client === binding.client),
  );
  const clientName =
    record?.client || recoveredClient?.client || knowledge?.client || ledger?.client || binding.client;
  const clientCode =
    record?.clientCode ||
    recoveredClient?.clientCode ||
    knowledge?.clientCode ||
    ledger?.clientCode ||
    binding.clientCode;
  const hubMiOperationalized = picture.realClientsOperationalized.includes(clientCode);
  const recoveredKnowledgeOperationalized = picture.recoveredClientsKnowledgeOperationalized.includes(clientCode);
  const realClientsOperationalized = picture.realClientsOperationalized.filter((row) => row === clientCode);
  const ledgerEvidence = Boolean(ledger?.clientCode || ledger?.client);

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
  if (
    ledgerEvidence &&
    !record &&
    !recoveredClient &&
    !knowledge &&
    ledger?.dataType
  ) {
    basedOnParts.push(
      `Authorized recovery ledger ${ledger.dataType} (${ledger.provenance}). Not an operational client row.`,
    );
  }

  const why =
    items[0]?.why ||
    record?.nextAction ||
    recoveredClient?.nextAction ||
    (ledgerEvidence
      ? ledger?.blocker ||
        'Recovered inventory lists this client on the entitled operator picture. No operational client row exists.'
      : 'No entitled recovered or Hub operating evidence is available for this client.');
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
  } else if (ledgerEvidence) {
    evidenceClass = 'recovered_folder_filename';
    classification = 'LIKELY';
  }

  const honestEmpty =
    items.length === 0 &&
    !record?.knowledgeOperationalized &&
    !recoveredKnowledgeOperationalized &&
    !hubMiOperationalized &&
    !record &&
    !recoveredClient &&
    !ledgerEvidence;

  const waitingItems = presentRows(record?.waitingItems || knowledge?.waitingItems);
  const missingDocuments = presentRows(record?.missingDocuments || knowledge?.missingDocuments);
  const hvcgResponsibilities = presentRows(record?.hvcgResponsibilities || knowledge?.hvcgResponsibilities);
  const clientResponsibilities = presentRows(record?.clientResponsibilities || knowledge?.clientResponsibilities);
  const decisions = presentRows(record?.decisions || knowledge?.decisions);
  const nextActions = presentRows(record?.nextActions);
  const nextAction = record?.nextAction || recoveredClient?.nextAction;

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
    ...(waitingItems ? { waitingItems } : {}),
    ...(missingDocuments ? { missingDocuments } : {}),
    ...(hvcgResponsibilities ? { hvcgResponsibilities } : {}),
    ...(clientResponsibilities ? { clientResponsibilities } : {}),
    ...(decisions ? { decisions } : {}),
    ...(nextActions ? { nextActions } : {}),
    ...(nextAction ? { nextAction } : {}),
    projects: emptyProjectOperatingPayload(),
    threads: emptyMailThreadPayload(),
    meetings: emptyMeetingOperatingPayload(),
    capitalSubmissions: emptyCapitalSubmissionPayload(),
    researchIntelligence: emptyResearchIntelligencePayload(),
    onboarding: emptyOnboardingPayload(),
    clientSupport: emptyClientSupportPayload(),
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
  const clientContext = {
    ...composeClientContext(ctx.picture, binding, items),
    projects: composeBoundClientProjects(ctx, binding),
    threads: composeBoundClientThreads(ctx, binding),
    meetings: composeBoundClientMeetings(ctx, binding),
    capitalSubmissions: composeBoundClientCapitalSubmissions(ctx, binding),
    researchIntelligence: composeBoundClientResearchIntelligence(ctx, binding),
    onboarding: composeBoundClientOnboarding(ctx, binding),
    clientSupport: composeBoundClientSupport(ctx, binding),
  };
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

const GENERIC_SEARCH_STOPWORDS = new Set([
  'document',
  'documents',
  'file',
  'files',
  'knowledge',
  'authorized',
  'invoice',
  'invoices',
  'packet',
  'packets',
  'project',
  'projects',
  'task',
  'tasks',
  'meeting',
  'meetings',
  'all',
  'everything',
]);

export function normalizeAuthorizedSearchQuery(raw: string): string {
  return raw.trim().slice(0, 120);
}

function sameSearchQuery(a: string, b: string): boolean {
  return normalizeAuthorizedSearchQuery(a).toLowerCase() === normalizeAuthorizedSearchQuery(b).toLowerCase();
}

function preservedSearchProvenance(
  row: PmSearchHit | (OperatorSearchHit & { source?: string }),
): AskAtlasClassification {
  if (row.provenance === 'CONFIRMED' || row.provenance === 'LIKELY' || row.provenance === 'PROPOSED') {
    return row.provenance;
  }
  if ('source' in row && row.source === 'HVCG_Communications/file-index') return 'CONFIRMED';
  return 'LIKELY';
}

function copiedOptional(row: object, key: string): string | undefined {
  if (!(key in row)) return undefined;
  const value = (row as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function toAuthorizedSearchHit(
  row: PmSearchHit | (OperatorSearchHit & { source?: string }),
): AtlasAuthorizedSearchHit {
  const sourceUrl = authoritativeSourceUrl('webUrl' in row ? row.webUrl : undefined);
  const modifiedAt =
    'modifiedAt' in row && typeof row.modifiedAt === 'string' && row.modifiedAt.trim()
      ? row.modifiedAt
      : undefined;
  const classification = preservedSearchProvenance(row);
  const nextAction = copiedOptional(row, 'nextAction');
  const objective = copiedOptional(row, 'objective');
  const ownerName = copiedOptional(row, 'ownerName');
  const startDate = copiedOptional(row, 'startDate');
  const targetCompletionDate = copiedOptional(row, 'targetCompletionDate');
  const status = copiedOptional(row, 'status');
  const preview = copiedOptional(row, 'preview');
  const industry = copiedOptional(row, 'industry');
  const clientStage = copiedOptional(row, 'clientStage');
  const conversationId = copiedOptional(row, 'conversationId');
  const directionRaw = copiedOptional(row, 'direction');
  const direction =
    directionRaw === 'Inbound' || directionRaw === 'Outbound' || directionRaw === 'Internal'
      ? directionRaw
      : undefined;
  return {
    kind: row.kind || 'document',
    id: row.id,
    title: row.title,
    ...(row.href ? { href: row.href } : {}),
    ...('source' in row && row.source ? { source: String(row.source) } : { source: 'pm_search' }),
    ...(row.clientCode ? { clientCode: row.clientCode } : {}),
    ...(sourceUrl ? { webUrl: sourceUrl } : {}),
    ...(modifiedAt ? { modifiedAt } : {}),
    ...(nextAction ? { nextAction } : {}),
    ...(objective ? { objective } : {}),
    ...(ownerName ? { ownerName } : {}),
    ...(startDate ? { startDate } : {}),
    ...(targetCompletionDate ? { targetCompletionDate } : {}),
    ...(status ? { status } : {}),
    ...(preview ? { preview } : {}),
    ...(industry ? { industry } : {}),
    ...(clientStage ? { clientStage } : {}),
    ...(conversationId ? { conversationId } : {}),
    ...(direction ? { direction } : {}),
    ...('driveId' in row && typeof row.driveId === 'string' && row.driveId.trim()
      ? { driveId: row.driveId.trim() }
      : {}),
    ...('itemId' in row && typeof row.itemId === 'string' && row.itemId.trim()
      ? { itemId: row.itemId.trim() }
      : {}),
    ...('parentMessageId' in row && typeof row.parentMessageId === 'string' && row.parentMessageId.trim()
      ? { parentMessageId: row.parentMessageId.trim() }
      : {}),
    ...('attachmentId' in row && typeof row.attachmentId === 'string' && row.attachmentId.trim()
      ? { attachmentId: row.attachmentId.trim() }
      : {}),
    ...('contentType' in row && typeof row.contentType === 'string' && row.contentType.trim()
      ? { contentType: row.contentType.trim() }
      : {}),
    ...('size' in row && typeof row.size === 'number' && Number.isFinite(row.size)
      ? { size: row.size }
      : {}),
    ...('sourceEventId' in row && typeof row.sourceEventId === 'string' && row.sourceEventId.trim()
      ? { sourceEventId: row.sourceEventId.trim() }
      : {}),
    why: GENERIC_SEARCH_HIT_WHY,
    basedOn: 'searchSharePointPm / GET /api/pm/search / operatorDesk.search entitled retrieval. Classification is not promoted.',
    provenance: classification,
    classification,
  };
}

function emptyDocumentOperatingPayload(): AtlasAuthorizedSearch['documents'] {
  return {
    kind: 'document_operating_record_v1',
    policyClass: 'READ_AUTO',
    binariesInAtlas: false,
    items: [],
  };
}

function emptyProjectOperatingPayload(): AtlasAuthorizedSearch['projects'] {
  return {
    kind: 'project_operating_record_v1',
    policyClass: 'READ_AUTO',
    invented: false,
    currentClientsFirst: true,
    items: [],
  };
}

function neverPromoteProjectClassification(
  value: string | undefined,
): ProjectOperatingClassification | 'HONEST_EMPTY' {
  if (
    value === 'CONFIRMED' ||
    value === 'LIKELY' ||
    value === 'PROPOSED' ||
    value === 'STALE_OR_UNCERTAIN' ||
    value === 'COMPLETE'
  ) {
    return value;
  }
  return 'HONEST_EMPTY';
}

const CONTRACT_SOW_RE = /\b(sow|scope of work|statement of work|contract|agreement|engagement letter)\b/i;

function relatedProjectEvidence(
  hits: AtlasAuthorizedSearchHit[],
  clientCode: string | undefined,
): {
  timeline: NonNullable<ProjectOperatingRecord['timeline']>;
  deliverables: string[];
  evidenceRefs: ProjectOperatingEvidenceRef[];
  scopeTitle?: string;
} {
  const timeline: NonNullable<ProjectOperatingRecord['timeline']> = [];
  const deliverables: string[] = [];
  const evidenceRefs: ProjectOperatingEvidenceRef[] = [];
  let scopeTitle: string | undefined;
  if (!clientCode) {
    return { timeline, deliverables, evidenceRefs };
  }
  const seen = new Set<string>();
  for (const hit of hits) {
    if (hit.clientCode !== clientCode) continue;
    if (
      hit.kind !== 'document' &&
      hit.kind !== 'communication' &&
      hit.kind !== 'meeting' &&
      hit.kind !== 'deliverable' &&
      hit.kind !== 'task'
    ) {
      continue;
    }
    if (seen.has(hit.id)) continue;
    seen.add(hit.id);
    const sourceUrl = authoritativeSourceUrl(hit.webUrl);
    evidenceRefs.push({
      kind: hit.kind,
      id: hit.id,
      title: hit.title,
      ...(hit.source ? { source: hit.source } : {}),
      ...(hit.modifiedAt ? { modifiedAt: hit.modifiedAt } : {}),
      ...(sourceUrl ? { webUrl: sourceUrl } : {}),
    });
    if ((hit.kind === 'meeting' || hit.kind === 'communication') && hit.modifiedAt) {
      timeline.push({ at: hit.modifiedAt, title: hit.title, source: hit.source || hit.kind });
    }
    if (hit.kind === 'deliverable') deliverables.push(hit.title);
    if (!scopeTitle && hit.kind === 'document' && CONTRACT_SOW_RE.test(hit.title)) {
      scopeTitle = hit.title;
    }
  }
  timeline.sort((a, b) => a.at.localeCompare(b.at));
  return { timeline, deliverables, evidenceRefs, ...(scopeTitle ? { scopeTitle } : {}) };
}

function projectRecordFromCurrentHit(
  hit: AtlasAuthorizedSearchHit,
  related: ReturnType<typeof relatedProjectEvidence>,
): ProjectOperatingRecord | null {
  const clientCode =
    hit.clientCode && isCanonicalClientCode(hit.clientCode) ? hit.clientCode : undefined;
  const fromStatus = hit.status === 'completed' ? 'COMPLETE' : undefined;
  const copied = neverPromoteProjectClassification(fromStatus || hit.classification);
  if (copied === 'HONEST_EMPTY') return null;
  const objective = hit.objective?.trim();
  const nextAction = hit.nextAction?.trim();
  const ownerName = hit.ownerName?.trim();
  const timeline: NonNullable<ProjectOperatingRecord['timeline']> = [];
  if (hit.startDate) timeline.push({ at: hit.startDate, title: `Start: ${hit.title}`, source: hit.source || 'HVCG_Projects' });
  if (hit.targetCompletionDate) {
    timeline.push({
      at: hit.targetCompletionDate,
      title: `Target: ${hit.title}`,
      source: hit.source || 'HVCG_Projects',
    });
  }
  if (hit.modifiedAt) {
    timeline.push({ at: hit.modifiedAt, title: `Updated: ${hit.title}`, source: hit.source || 'HVCG_Projects' });
  }
  timeline.push(...related.timeline);
  timeline.sort((a, b) => a.at.localeCompare(b.at));
  return {
    id: hit.id,
    title: hit.title,
    ...(clientCode ? { clientCode } : {}),
    classification: copied,
    source: hit.source || 'HVCG_Projects',
    historicalHvs: false,
    hubMiRow: true,
    invented: false,
    operationalized: Boolean(clientCode),
    ...(objective ? { objective } : {}),
    ...(related.scopeTitle ? { scope: related.scopeTitle } : {}),
    ...(ownerName ? { participants: [ownerName] } : {}),
    ...(timeline.length ? { timeline } : {}),
    ...(related.deliverables.length ? { deliverables: related.deliverables } : {}),
    ...(nextAction ? { nextAction } : {}),
    ...(related.evidenceRefs.length ? { evidenceRefs: related.evidenceRefs } : {}),
  };
}

function projectRecordFromRecoveredHit(
  hit: AtlasAuthorizedSearchHit,
): ProjectOperatingRecord | null {
  const copied = neverPromoteProjectClassification(hit.classification);
  if (copied === 'HONEST_EMPTY') return null;
  const clientCode =
    hit.clientCode && isCanonicalClientCode(hit.clientCode) ? hit.clientCode : undefined;
  const nextAction = hit.nextAction?.trim() || hit.why.trim();
  const evidence = hit.evidence?.trim() || hit.basedOn.trim();
  return {
    id: hit.id,
    title: hit.title,
    ...(clientCode ? { clientCode } : {}),
    classification: copied,
    source: hit.source || 'operator_operating_picture',
    historicalHvs: true,
    hubMiRow: false,
    invented: false,
    operationalized: false,
    ...(nextAction ? { nextAction } : {}),
    ...(evidence ? { evidence } : {}),
  };
}

function projectOperatingRecords(
  hits: AtlasAuthorizedSearchHit[],
  picture: OperatorOperatingPicture,
  binding: PictureClientBinding | null,
): ProjectOperatingRecord[] {
  const items: ProjectOperatingRecord[] = [];
  const seen = new Set<string>();
  const push = (row: ProjectOperatingRecord | null) => {
    if (!row || seen.has(row.id)) return;
    seen.add(row.id);
    items.push(row);
  };

  for (const hit of hits) {
    if (hit.kind !== 'project') continue;
    const related = relatedProjectEvidence(hits, hit.clientCode);
    push(projectRecordFromCurrentHit(hit, related));
  }

  for (const hit of hits) {
    if (hit.kind !== 'recovered_project') continue;
    push(projectRecordFromRecoveredHit(hit));
  }

  if (binding && picture.hvsDataAccess !== 'BLOCKED') {
    for (const row of picture.hvsRecoveredProjects) {
      if (!rowMatchesAuthorizedBinding(row, binding)) continue;
      const classification = neverPromoteProjectClassification(row.provenance);
      if (classification === 'HONEST_EMPTY') continue;
      const clientCode =
        row.clientCode && isCanonicalClientCode(row.clientCode) ? row.clientCode : undefined;
      push({
        id: `picture:project:${row.clientCode || row.client}:${row.title}`,
        title: row.title,
        ...(clientCode ? { clientCode } : {}),
        classification,
        source: 'operator_operating_picture',
        historicalHvs: true,
        hubMiRow: false,
        invented: false,
        operationalized: false,
        nextAction: row.nextAction,
        evidence: row.evidence,
      });
    }
  }

  items.sort((a, b) => {
    if (a.historicalHvs !== b.historicalHvs) return a.historicalHvs ? 1 : -1;
    return a.id.localeCompare(b.id);
  });
  return items;
}

function isCurrentEntitledBinding(
  principal: AtlasPrincipal,
  binding: PictureClientBinding,
): boolean {
  return Boolean(binding.clientCode && entitledClientCodes(principal).includes(binding.clientCode));
}

/**
 * Same project_operating_record_v1 composer as authorizedSearch.projects.
 * Current entitled clients only. Already-loaded entitled index rows only.
 * Historical HVS recovered projects stay read-only. No invented ClientCodes.
 */
function composeBoundClientProjects(
  ctx: ToolGatewayContext,
  binding: PictureClientBinding,
): AtlasClientContext['projects'] {
  if (!isCurrentEntitledBinding(ctx.principal, binding)) {
    return emptyProjectOperatingPayload();
  }
  const fromIndex = (ctx.entitledIndexHits || []).map(toAuthorizedSearchHit);
  const fromDesk = (ctx.deskSearch?.hits || []).map(toAuthorizedSearchHit);
  const pmHits = filterHitsToBinding(mergeAuthorizedHits(fromIndex, fromDesk), binding);
  return composeBoundAuthorizedSearch(
    ctx,
    binding.clientCode,
    binding,
    pmHits,
    pmHits.length > 0,
  ).authorizedSearch.projects;
}

/**
 * Same mail_thread_operating_record_v1 composer as authorizedSearch.threads.
 * Current entitled clients only. Already-loaded entitled index rows only.
 * Indexed preview only. Suggested draft stays DRAFT_ONLY.
 */
function composeBoundClientThreads(
  ctx: ToolGatewayContext,
  binding: PictureClientBinding,
): AtlasClientContext['threads'] {
  if (!isCurrentEntitledBinding(ctx.principal, binding)) {
    return emptyMailThreadPayload();
  }
  const fromIndex = (ctx.entitledIndexHits || []).map(toAuthorizedSearchHit);
  const fromDesk = (ctx.deskSearch?.hits || []).map(toAuthorizedSearchHit);
  const pmHits = filterHitsToBinding(mergeAuthorizedHits(fromIndex, fromDesk), binding);
  return composeBoundAuthorizedSearch(
    ctx,
    binding.clientCode,
    binding,
    pmHits,
    pmHits.length > 0,
  ).authorizedSearch.threads;
}

/**
 * Same meeting_operating_record_v1 composer as authorizedSearch.meetings.
 * Current entitled clients only. Already-loaded entitled HVCG_Meetings /
 * extras.meetings / search kind=meeting rows only. No Graph calendar query.
 */
function composeBoundClientMeetings(
  ctx: ToolGatewayContext,
  binding: PictureClientBinding,
): AtlasClientContext['meetings'] {
  if (!isCurrentEntitledBinding(ctx.principal, binding)) {
    return emptyMeetingOperatingPayload();
  }
  const fromIndex = (ctx.entitledIndexHits || []).map(toAuthorizedSearchHit);
  const fromDesk = (ctx.deskSearch?.hits || []).map(toAuthorizedSearchHit);
  const pmHits = filterHitsToBinding(mergeAuthorizedHits(fromIndex, fromDesk), binding);
  return composeBoundAuthorizedSearch(
    ctx,
    binding.clientCode,
    binding,
    pmHits,
    pmHits.length > 0,
  ).authorizedSearch.meetings;
}

/**
 * Same capital_submission_request_v1 composer as authorizedSearch.capitalSubmissions.
 * Current entitled clients only. Already-loaded entitled index rows only.
 * PREPARE_ONLY. External submit stays OWNER-GATED.
 */
function composeBoundClientCapitalSubmissions(
  ctx: ToolGatewayContext,
  binding: PictureClientBinding,
): AtlasClientContext['capitalSubmissions'] {
  if (!isCurrentEntitledBinding(ctx.principal, binding)) {
    return emptyCapitalSubmissionPayload();
  }
  const fromIndex = (ctx.entitledIndexHits || []).map(toAuthorizedSearchHit);
  const fromDesk = (ctx.deskSearch?.hits || []).map(toAuthorizedSearchHit);
  const pmHits = filterHitsToBinding(mergeAuthorizedHits(fromIndex, fromDesk), binding);
  return composeBoundAuthorizedSearch(
    ctx,
    binding.clientCode,
    binding,
    pmHits,
    pmHits.length > 0,
  ).authorizedSearch.capitalSubmissions;
}

/**
 * Same research_intelligence_v1 composer as authorizedSearch.researchIntelligence.
 * Current entitled clients only. Already-loaded entitled index rows only.
 * SOURCE_BACKED_ONLY. No live scrape. Lender criteria stay uninvented.
 */
function composeBoundClientResearchIntelligence(
  ctx: ToolGatewayContext,
  binding: PictureClientBinding,
): AtlasClientContext['researchIntelligence'] {
  if (!isCurrentEntitledBinding(ctx.principal, binding)) {
    return emptyResearchIntelligencePayload(ctx.now);
  }
  const fromIndex = (ctx.entitledIndexHits || []).map(toAuthorizedSearchHit);
  const fromDesk = (ctx.deskSearch?.hits || []).map(toAuthorizedSearchHit);
  const pmHits = filterHitsToBinding(mergeAuthorizedHits(fromIndex, fromDesk), binding);
  return composeBoundAuthorizedSearch(
    ctx,
    binding.clientCode,
    binding,
    pmHits,
    pmHits.length > 0,
  ).authorizedSearch.researchIntelligence;
}

/**
 * Same onboarding_agent_v1 composer as authorizedSearch.onboarding.
 * Current entitled clients only. Already-loaded entitled index rows only.
 * OWNER_ESCALATE. Activation / send / Hub-MI stay owner-gated.
 */
function composeBoundClientOnboarding(
  ctx: ToolGatewayContext,
  binding: PictureClientBinding,
): AtlasClientContext['onboarding'] {
  if (!isCurrentEntitledBinding(ctx.principal, binding)) {
    return emptyOnboardingPayload();
  }
  const fromIndex = (ctx.entitledIndexHits || []).map(toAuthorizedSearchHit);
  const fromDesk = (ctx.deskSearch?.hits || []).map(toAuthorizedSearchHit);
  const pmHits = filterHitsToBinding(mergeAuthorizedHits(fromIndex, fromDesk), binding);
  return composeBoundAuthorizedSearch(
    ctx,
    binding.clientCode,
    binding,
    pmHits,
    pmHits.length > 0,
  ).authorizedSearch.onboarding;
}

/**
 * Same client_support_agent_v1 composer as authorizedSearch.clientSupport.
 * Current entitled clients only. Already-loaded entitled index rows only.
 * OWNER_ESCALATE. Reply / reassign / send stay owner-gated and draft-only.
 */
function composeBoundClientSupport(
  ctx: ToolGatewayContext,
  binding: PictureClientBinding,
): AtlasClientContext['clientSupport'] {
  if (!isCurrentEntitledBinding(ctx.principal, binding)) {
    return emptyClientSupportPayload();
  }
  const fromIndex = (ctx.entitledIndexHits || []).map(toAuthorizedSearchHit);
  const fromDesk = (ctx.deskSearch?.hits || []).map(toAuthorizedSearchHit);
  const pmHits = filterHitsToBinding(mergeAuthorizedHits(fromIndex, fromDesk), binding);
  return composeBoundAuthorizedSearch(
    ctx,
    binding.clientCode,
    binding,
    pmHits,
    pmHits.length > 0,
  ).authorizedSearch.clientSupport;
}

/**
 * After a current entitled binding is resolved, load the same entitled
 * index rows search_authorized_knowledge already uses. Does not invent a
 * second CRM or copy HVS folders.
 */
export async function loadClientContext(ctx: ToolGatewayContext): Promise<ClientContextToolResult> {
  if (!canAccessOperatorDesk(ctx.principal)) {
    return getClientContext(ctx);
  }
  if (ctx.entitledIndexHits || !ctx.entitledSearch) {
    return getClientContext(ctx);
  }
  const requested = (ctx.clientCode || ctx.clientQuery || '').trim();
  if (!requested || ctx.picture.hvsDataAccess === 'BLOCKED') {
    return getClientContext(ctx);
  }
  entitledClientCodes(ctx.principal);
  const binding = resolveAuthorizedClient(ctx.principal, ctx.picture, requested);
  if (!binding || !isCurrentEntitledBinding(ctx.principal, binding)) {
    return getClientContext(ctx);
  }
  const found = await ctx.entitledSearch(binding.clientCode);
  return getClientContext({ ...ctx, entitledIndexHits: found.results });
}

function documentOperatingRecords(hits: AtlasAuthorizedSearchHit[]): DocumentOperatingRecord[] {
  const items: DocumentOperatingRecord[] = [];
  for (const hit of hits) {
    if (hit.kind !== 'document') continue;
    const webUrl = authoritativeSourceUrl(hit.webUrl);
    if (!webUrl) continue;
    const clientCode =
      hit.clientCode && isCanonicalClientCode(hit.clientCode) ? hit.clientCode : undefined;
    const provenance =
      hit.provenance === 'CONFIRMED' || hit.provenance === 'LIKELY' || hit.provenance === 'PROPOSED'
        ? hit.provenance
        : 'PROPOSED';
    items.push({
      id: hit.id,
      title: hit.title,
      webUrl,
      ...(hit.modifiedAt ? { modifiedAt: hit.modifiedAt } : {}),
      ...(clientCode ? { clientCode } : {}),
      provenance,
      source: hit.source || 'HVCG_Communications/file-index',
      ...(hit.parentMessageId ? { parentMessageId: hit.parentMessageId } : {}),
      ...(hit.attachmentId ? { attachmentId: hit.attachmentId } : {}),
      ...(hit.contentType ? { contentType: hit.contentType } : {}),
      ...(typeof hit.size === 'number' && Number.isFinite(hit.size) ? { size: hit.size } : {}),
    });
  }
  return items;
}

function mayPreviewDocumentClient(principal: AtlasPrincipal, clientCode?: string): boolean {
  if (!clientCode) return isMannyPrincipal(principal);
  return entitledClientCodes(principal).includes(clientCode);
}

function previewFieldsWithoutUrls(preview: DocumentPreviewFields): DocumentPreviewFields {
  return {
    previewStatus: preview.previewStatus === 'ready' ? 'skipped' : preview.previewStatus,
    previewSkipReason:
      preview.previewStatus === 'ready'
        ? 'Graph preview URL was dropped because it is not a short-lived embed'
        : preview.previewSkipReason,
    basedOn: DOCUMENT_PREVIEW_BASED_ON,
  };
}

function applyPreviewFields(
  item: DocumentOperatingRecord,
  preview: DocumentPreviewFields,
): DocumentOperatingRecord {
  const safe =
    preview.previewStatus === 'ready' && (preview.previewGetUrl || preview.previewPostUrl)
      ? preview
      : previewFieldsWithoutUrls(preview);
  return {
    ...item,
    previewStatus: safe.previewStatus,
    ...(safe.previewExpiresAt && safe.previewStatus === 'ready' ? { previewExpiresAt: safe.previewExpiresAt } : {}),
    ...(safe.previewGetUrl && safe.previewStatus === 'ready' ? { previewGetUrl: safe.previewGetUrl } : {}),
    ...(safe.previewPostUrl && safe.previewStatus === 'ready' ? { previewPostUrl: safe.previewPostUrl } : {}),
    ...(safe.previewSkipReason && safe.previewStatus !== 'ready' ? { previewSkipReason: safe.previewSkipReason } : {}),
    basedOn: DOCUMENT_PREVIEW_BASED_ON,
  };
}

async function attachDocumentPreviews(
  ctx: ToolGatewayContext,
  items: DocumentOperatingRecord[],
  hits: AtlasAuthorizedSearchHit[],
): Promise<DocumentOperatingRecord[]> {
  if (!ctx.requestDocumentPreview || items.length === 0) return items;
  const byId = new Map(hits.map((hit) => [hit.id, hit]));
  const page = items.slice(0, DOCUMENT_PREVIEW_PAGE_SIZE);
  const rest = items.slice(DOCUMENT_PREVIEW_PAGE_SIZE);
  const previewed = await Promise.all(
    page.map(async (item) => {
      if (!mayPreviewDocumentClient(ctx.principal, item.clientCode)) {
        return applyPreviewFields(item, {
          previewStatus: 'skipped',
          previewSkipReason: 'client isolation: document is outside the entitled ClientCode set',
          basedOn: DOCUMENT_PREVIEW_BASED_ON,
        });
      }
      const hit = byId.get(item.id);
      const driveId = hit?.driveId?.trim() || '';
      const itemId = hit?.itemId?.trim() || '';
      if (!driveId || !itemId) {
        return applyPreviewFields(item, {
          previewStatus: 'skipped',
          previewSkipReason: 'no proven drive/item id from the existing indexer',
          basedOn: DOCUMENT_PREVIEW_BASED_ON,
        });
      }
      try {
        const preview = await ctx.requestDocumentPreview!({ driveId, itemId });
        return applyPreviewFields(item, preview);
      } catch {
        return applyPreviewFields(item, {
          previewStatus: 'error',
          previewSkipReason: 'Graph preview request failed before an HTTP response',
          basedOn: DOCUMENT_PREVIEW_BASED_ON,
        });
      }
    }),
  );
  return [...previewed, ...rest];
}

async function withDocumentPreviews(
  ctx: ToolGatewayContext,
  result: AuthorizedSearchToolResult,
): Promise<AuthorizedSearchToolResult> {
  if (!ctx.requestDocumentPreview) return result;
  const items = await attachDocumentPreviews(
    ctx,
    result.authorizedSearch.documents.items,
    result.authorizedSearch.hits,
  );
  return {
    ...result,
    authorizedSearch: {
      ...result.authorizedSearch,
      documents: {
        ...result.authorizedSearch.documents,
        binariesInAtlas: false,
        items,
      },
    },
  };
}

function applyVersionFields(
  item: DocumentOperatingRecord,
  version: DocumentVersionFields,
): DocumentOperatingRecord {
  return {
    ...item,
    versionStatus: version.versionStatus,
    ...(version.versionSkipReason && version.versionStatus !== 'ready'
      ? { versionSkipReason: version.versionSkipReason }
      : {}),
    ...(version.currentVersionId && version.versionStatus === 'ready'
      ? { currentVersionId: version.currentVersionId }
      : {}),
    ...(typeof version.versionCount === 'number' && version.versionStatus === 'ready'
      ? { versionCount: version.versionCount }
      : {}),
    ...(version.versions && version.versionStatus === 'ready' ? { versions: version.versions } : {}),
    versionBasedOn: DOCUMENT_VERSION_BASED_ON,
  };
}

async function attachDocumentVersions(
  ctx: ToolGatewayContext,
  items: DocumentOperatingRecord[],
  hits: AtlasAuthorizedSearchHit[],
): Promise<DocumentOperatingRecord[]> {
  if (!ctx.requestDocumentVersions || items.length === 0) return items;
  const byId = new Map(hits.map((hit) => [hit.id, hit]));
  const page = items.slice(0, DOCUMENT_VERSION_PAGE_SIZE);
  const rest = items.slice(DOCUMENT_VERSION_PAGE_SIZE);
  const versioned = await Promise.all(
    page.map(async (item) => {
      if (!mayPreviewDocumentClient(ctx.principal, item.clientCode)) {
        return applyVersionFields(item, {
          versionStatus: 'skipped',
          versionSkipReason: 'client isolation: document is outside the entitled ClientCode set',
          versionBasedOn: DOCUMENT_VERSION_BASED_ON,
        });
      }
      if (item.attachmentId && !byId.get(item.id)?.driveId) {
        return applyVersionFields(item, {
          versionStatus: 'skipped',
          versionSkipReason: 'outlook-mail-attachment items have no Graph driveItem versions',
          versionBasedOn: DOCUMENT_VERSION_BASED_ON,
        });
      }
      const hit = byId.get(item.id);
      const driveId = hit?.driveId?.trim() || '';
      const itemId = hit?.itemId?.trim() || '';
      if (!driveId || !itemId) {
        return applyVersionFields(item, {
          versionStatus: 'skipped',
          versionSkipReason: 'no proven drive/item id from the existing indexer',
          versionBasedOn: DOCUMENT_VERSION_BASED_ON,
        });
      }
      try {
        const version = await ctx.requestDocumentVersions!({ driveId, itemId });
        return applyVersionFields(item, version);
      } catch {
        return applyVersionFields(item, {
          versionStatus: 'error',
          versionSkipReason: 'Graph versions request failed before an HTTP response',
          versionBasedOn: DOCUMENT_VERSION_BASED_ON,
        });
      }
    }),
  );
  return [...versioned, ...rest];
}

async function withDocumentVersions(
  ctx: ToolGatewayContext,
  result: AuthorizedSearchToolResult,
): Promise<AuthorizedSearchToolResult> {
  if (!ctx.requestDocumentVersions) return result;
  const items = await attachDocumentVersions(
    ctx,
    result.authorizedSearch.documents.items,
    result.authorizedSearch.hits,
  );
  return {
    ...result,
    authorizedSearch: {
      ...result.authorizedSearch,
      documents: {
        ...result.authorizedSearch.documents,
        binariesInAtlas: false,
        items,
      },
    },
  };
}

/**
 * Copy already-authorized email / project / contract / capital / indexed
 * outlook-mail-attachment / HVCG_Meetings metadata onto entitled documents.
 * Runs after authorization and after secure preview attach. Does not invent
 * ClientCodes, Hub-MI, lender criteria, financing status, binaries, or
 * anonymous URLs. Does not issue a new Graph calendar query.
 */
function withDocumentRelatedContext(
  ctx: ToolGatewayContext,
  result: AuthorizedSearchToolResult,
): AuthorizedSearchToolResult {
  const items = attachRelatedContextToDocuments(
    ctx.principal,
    result.authorizedSearch.documents.items,
    result.authorizedSearch,
  );
  return {
    ...result,
    authorizedSearch: {
      ...result.authorizedSearch,
      documents: {
        ...result.authorizedSearch.documents,
        binariesInAtlas: false,
        items,
      },
    },
  };
}

async function finalizeAuthorizedDocuments(
  ctx: ToolGatewayContext,
  result: AuthorizedSearchToolResult,
): Promise<AuthorizedSearchToolResult> {
  return withDocumentRelatedContext(
    ctx,
    await withDocumentVersions(ctx, await withDocumentPreviews(ctx, result)),
  );
}

function resolveQueueUrgency(row: OperatorOperatingItem): SearchQueueUrgency | null {
  if (row.kind === 'hvs_actionable_capital') return 'Capital';
  if (row.queue === 'Overdue') return 'Overdue';
  if (row.queue === 'Blocked') return 'Blocked';
  if (row.queue === 'Decision Required') return 'Decision Required';
  if (row.queue === 'Needs Action') return 'Needs Action';
  if (row.queue === 'At Risk') return 'At Risk';
  if (row.queue === 'Waiting') return 'Waiting';
  if (row.queue === 'Ready') return 'Ready';
  if (row.queue === 'Capital') return 'Capital';
  return null;
}

function existingClientNextAction(
  picture: OperatorOperatingPicture,
  clientCode?: string,
): string | undefined {
  if (!clientCode) return undefined;
  const record = picture.hvsRecoveredClientRecords.find((row) => row.clientCode === clientCode);
  if (record?.nextAction?.trim()) return record.nextAction.trim();
  const recovered = picture.hvsRecoveredClients.find((row) => row.clientCode === clientCode);
  if (recovered?.nextAction?.trim()) return recovered.nextAction.trim();
  return undefined;
}

function strongestQueueMembership(
  picture: OperatorOperatingPicture,
  clientCode?: string,
): { row: OperatorOperatingItem; queue: SearchQueueUrgency } | null {
  if (!clientCode) return null;
  let best: { row: OperatorOperatingItem; queue: SearchQueueUrgency } | null = null;
  for (const rows of Object.values(picture.queues)) {
    for (const row of rows) {
      if (row.clientCode !== clientCode) continue;
      const queue = resolveQueueUrgency(row);
      if (!queue) continue;
      if (!best || SEARCH_QUEUE_RANK[queue] < SEARCH_QUEUE_RANK[best.queue]) {
        best = { row, queue };
      }
    }
  }
  return best;
}

/**
 * Copy already-known queue kind/state / why / evidence / nextAction onto an
 * entitled hit. Does not invent urgency, amounts, lenders, or Hub-MI rows,
 * and never promotes classification.
 */
function attachExistingQueueActionability(
  hit: AtlasAuthorizedSearchHit,
  picture: OperatorOperatingPicture,
): AtlasAuthorizedSearchHit {
  if (hit.queue) return hit;
  const found = strongestQueueMembership(picture, hit.clientCode);
  if (!found) return hit;
  const nextAction = existingClientNextAction(picture, hit.clientCode);
  const evidence = found.row.evidence?.trim() || undefined;
  const why = evidence || nextAction || hit.why || GENERIC_SEARCH_HIT_WHY;
  return {
    ...hit,
    why,
    ...(evidence
      ? {
          basedOn: evidence,
          evidence,
        }
      : {}),
    ...(nextAction ? { nextAction } : {}),
    queue: found.queue,
  };
}

function searchHitQueueRank(hit: AtlasAuthorizedSearchHit): number {
  const queue = hit.queue;
  if (queue && Object.prototype.hasOwnProperty.call(SEARCH_QUEUE_RANK, queue)) {
    return SEARCH_QUEUE_RANK[queue as SearchQueueUrgency | 'none'];
  }
  return SEARCH_QUEUE_RANK.none;
}

function rankAuthorizedHits(hits: AtlasAuthorizedSearchHit[]): AtlasAuthorizedSearchHit[] {
  return [...hits].sort((a, b) => {
    const queue = searchHitQueueRank(a) - searchHitQueueRank(b);
    if (queue !== 0) return queue;
    const classRank =
      SEARCH_CLASS_RANK[neverPromoteClassification(a.classification)] -
      SEARCH_CLASS_RANK[neverPromoteClassification(b.classification)];
    if (classRank !== 0) return classRank;
    return a.id.localeCompare(b.id);
  });
}

function rowMatchesAuthorizedBinding(
  row: { client?: string; clientCode?: string },
  binding: PictureClientBinding,
): boolean {
  if (binding.clientCode && row.clientCode) return row.clientCode === binding.clientCode;
  if (binding.client && row.client) return row.client === binding.client;
  return false;
}

const PICTURE_DOCUMENT_LIMIT = 8;
const PICTURE_PROJECT_LIMIT = 4;
const PICTURE_CAPITAL_LIMIT = 4;
const PICTURE_QUEUE_LIMIT = 8;

/**
 * Compose entitled hits from the already-authorized operator picture for one
 * resolved binding only. Must not be called for unknown/foreign tokens.
 * Does not invent clients, amounts, lenders, Hub-MI rows, or completion.
 */
function composeEntitledPictureHits(
  picture: OperatorOperatingPicture,
  binding: PictureClientBinding,
): AtlasAuthorizedSearchHit[] {
  if (picture.hvsDataAccess === 'BLOCKED') return [];
  const hits: AtlasAuthorizedSearchHit[] = [];
  const seen = new Set<string>();
  const push = (hit: AtlasAuthorizedSearchHit) => {
    if (seen.has(hit.id)) return;
    if (hit.clientCode && binding.clientCode && hit.clientCode !== binding.clientCode) return;
    if (
      hit.classification !== 'CONFIRMED' &&
      hit.classification !== 'LIKELY' &&
      hit.classification !== 'PROPOSED'
    ) {
      return;
    }
    seen.add(hit.id);
    hits.push(hit);
  };

  for (const row of picture.hvsRecoveredClients) {
    if (!rowMatchesAuthorizedBinding(row, binding)) continue;
    const classification = neverPromoteClassification(row.provenance);
    push({
      kind: 'recovered_client',
      id: `picture:recovered-client:${row.clientCode || row.client}`,
      title: row.client,
      source: 'operator_operating_picture',
      ...(row.clientCode ? { clientCode: row.clientCode } : {}),
      why: row.nextAction,
      basedOn: 'Recovered HVS client folder already on the entitled operator operating picture. Not an operational client row.',
      provenance: classification,
      classification,
    });
  }

  for (const row of picture.hvsRecoveredClientRecords) {
    if (!rowMatchesAuthorizedBinding(row, binding)) continue;
    const classification = neverPromoteClassification(row.provenance);
    const basedOn = row.capitalPacketNames.length
      ? `CONFIRMED-as-filename capital packets: ${row.capitalPacketNames.join(', ')}. Classification is not promoted.`
      : 'Recovered client record already on the entitled operator picture. No operational client row was invented.';
    push({
      kind: 'recovered_client_record',
      id: `picture:recovered-record:${row.clientCode || row.client}`,
      title: row.client,
      source: 'operator_operating_picture',
      ...(row.clientCode ? { clientCode: row.clientCode } : {}),
      why: row.nextAction,
      basedOn,
      provenance: classification,
      classification,
    });
  }

  for (const row of picture.hvsActionableClientKnowledge) {
    if (!rowMatchesAuthorizedBinding(row, binding)) continue;
    const classification = neverPromoteClassification(row.provenance);
    push({
      kind: 'actionable_knowledge',
      id: `picture:actionable:${row.clientCode || row.client}`,
      title: `${row.client} recovered actionable knowledge`,
      source: 'operator_operating_picture',
      ...(row.clientCode ? { clientCode: row.clientCode } : {}),
      why: 'Recovered actionable knowledge already classified on the entitled operator picture.',
      basedOn: 'hvsActionableClientKnowledge on OperatorOperatingPicture. Classification is not promoted.',
      provenance: classification,
      classification,
    });
  }

  let documents = 0;
  for (const row of picture.hvsRecoveredDocuments) {
    if (!rowMatchesAuthorizedBinding(row, binding)) continue;
    if (row.kind !== 'file') continue;
    if (documents >= PICTURE_DOCUMENT_LIMIT) break;
    documents += 1;
    const classification = neverPromoteClassification(row.provenance);
    push({
      kind: 'recovered_document',
      id: `picture:document:${row.clientCode}:${row.name}`,
      title: row.name,
      source: 'operator_operating_picture',
      ...(row.clientCode ? { clientCode: row.clientCode } : {}),
      why: 'Recovered filename already present on the entitled operator picture. Amounts were not extracted.',
      basedOn: `CONFIRMED-as-filename ${row.name}. Classification is not promoted.`,
      provenance: classification,
      classification,
    });
  }

  let projects = 0;
  for (const row of picture.hvsRecoveredProjects) {
    if (!rowMatchesAuthorizedBinding(row, binding)) continue;
    if (projects >= PICTURE_PROJECT_LIMIT) break;
    projects += 1;
    const classification = neverPromoteClassification(row.provenance);
    push({
      kind: 'recovered_project',
      id: `picture:project:${row.clientCode}:${row.title}`,
      title: row.title,
      source: 'operator_operating_picture',
      ...(row.clientCode ? { clientCode: row.clientCode } : {}),
      why: row.nextAction,
      basedOn: row.evidence,
      provenance: classification,
      classification,
    });
  }

  let packets = 0;
  for (const row of picture.hvsRecoveredCapitalPackets) {
    if (!rowMatchesAuthorizedBinding(row, binding)) continue;
    if (packets >= PICTURE_CAPITAL_LIMIT) break;
    packets += 1;
    const classification = neverPromoteClassification(row.provenance);
    push({
      kind: 'recovered_capital_packet',
      id: `picture:capital:${row.clientCode}:${row.name}`,
      title: row.name,
      source: 'operator_operating_picture',
      ...(row.clientCode ? { clientCode: row.clientCode } : {}),
      why: row.nextAction,
      basedOn: `CONFIRMED-as-filename ${row.name}. Amounts were not extracted. Classification is not promoted.`,
      provenance: classification,
      classification,
    });
  }

  let queued = 0;
  for (const rows of Object.values(picture.queues)) {
    for (const row of rows) {
      if (!rowMatchesAuthorizedBinding(row, binding)) continue;
      if (queued >= PICTURE_QUEUE_LIMIT) break;
      queued += 1;
      const classification = neverPromoteClassification(row.provenance);
      const queue = resolveQueueUrgency(row);
      const evidence = row.evidence?.trim() || undefined;
      const nextAction = existingClientNextAction(picture, row.clientCode);
      push({
        kind: row.kind || 'attention_item',
        id: row.id || `picture:queue:${row.clientCode}:${row.title}`,
        title: row.title,
        source: 'operator_operating_picture',
        ...(row.href ? { href: row.href } : {}),
        ...(row.clientCode ? { clientCode: row.clientCode } : {}),
        why: evidence || nextAction || GENERIC_QUEUE_HIT_WHY,
        basedOn: evidence || 'Entitled operator picture queue item. Classification is not promoted.',
        provenance: classification,
        classification,
        ...(queue ? { queue } : {}),
        ...(evidence ? { evidence } : {}),
        ...(nextAction ? { nextAction } : {}),
      });
    }
    if (queued >= PICTURE_QUEUE_LIMIT) break;
  }

  return hits;
}

function strongestHitClassification(
  hits: AtlasAuthorizedSearchHit[],
): AskAtlasClassification | 'HONEST_EMPTY' {
  let best: AskAtlasClassification | 'HONEST_EMPTY' = 'HONEST_EMPTY';
  const rank = { HONEST_EMPTY: 0, PROPOSED: 1, LIKELY: 2, CONFIRMED: 3 } as const;
  for (const hit of hits) {
    const next = neverPromoteClassification(hit.classification);
    if (rank[next] > rank[best]) best = next;
  }
  return best;
}

function mergeAuthorizedHits(
  pmHits: AtlasAuthorizedSearchHit[],
  pictureHits: AtlasAuthorizedSearchHit[],
): AtlasAuthorizedSearchHit[] {
  const out: AtlasAuthorizedSearchHit[] = [];
  const seen = new Set<string>();
  for (const hit of [...pmHits, ...pictureHits]) {
    if (seen.has(hit.id)) continue;
    seen.add(hit.id);
    out.push(hit);
  }
  return out;
}

function filterHitsToBinding(
  hits: AtlasAuthorizedSearchHit[],
  binding: PictureClientBinding | null,
): AtlasAuthorizedSearchHit[] {
  if (!binding) return hits;
  return hits.filter((hit) => {
    if (binding.clientCode && hit.clientCode) return hit.clientCode === binding.clientCode;
    if (binding.clientCode && !hit.clientCode) return false;
    if (binding.client && hit.title) {
      return normalizeClientToken(hit.title).includes(normalizeClientToken(binding.client));
    }
    return false;
  });
}

function classifyClientSearchToken(
  token: string,
  principal: AtlasPrincipal,
  picture: OperatorOperatingPicture,
): { scope: 'bound' | 'unknown' | 'generic'; binding: PictureClientBinding | null } {
  if (isReservedOperatingStateToken(token)) return { scope: 'generic', binding: null };
  const binding = resolveAuthorizedClient(principal, picture, token);
  if (binding) return { scope: 'bound', binding };
  const asCode = token.trim().toUpperCase();
  if (isCanonicalClientCode(asCode)) return { scope: 'unknown', binding: null };
  const words = normalizeClientToken(token).split(' ').filter(Boolean);
  if (words.length === 1 && words[0]!.length >= 3 && !GENERIC_SEARCH_STOPWORDS.has(words[0]!)) {
    return { scope: 'unknown', binding: null };
  }
  return { scope: 'generic', binding: null };
}

function emptyAuthorizedSearch(opts?: {
  query?: string;
  entitled?: boolean;
  ran?: boolean;
}): AtlasAuthorizedSearch {
  return {
    kind: 'atlas_authorized_search_v1',
    invented: false,
    honestEmpty: true,
    query: opts?.query || '',
    hitCount: 0,
    hits: [],
    classification: 'HONEST_EMPTY',
    why:
      opts?.entitled === false
        ? 'No entitled authorized knowledge is available for the requested search.'
        : 'No entitled search hits are available for this query.',
    basedOn:
      opts?.entitled === false
        ? 'Authorization failed closed before retrieval. Search was not executed across the tenant.'
        : 'Entitled desk search returned no hits. No operational client rows, amounts, or clients were invented.',
    entitled: opts?.entitled === true,
    ran: opts?.ran === true,
    pictureComposed: false,
    actionabilityApplied: false,
    documents: emptyDocumentOperatingPayload(),
    projects: emptyProjectOperatingPayload(),
    threads: emptyMailThreadPayload(),
    meetings: emptyMeetingOperatingPayload(),
    capitalSubmissions: emptyCapitalSubmissionPayload(),
    researchIntelligence: emptyResearchIntelligencePayload(),
    onboarding: emptyOnboardingPayload(),
    clientSupport: emptyClientSupportPayload(),
  };
}

function searchActivityAnswer(
  ctx: ToolGatewayContext,
  search: AtlasAuthorizedSearch,
): AskAtlasAnswer {
  const result = search.honestEmpty ? 'honest_empty' : 'answered';
  return {
    kind: 'ask_atlas_attention_v1',
    question: ASK_ATLAS_QUESTION,
    invented: false,
    honestEmpty: search.honestEmpty,
    ranking: [...ASK_ATLAS_RANKING],
    items: [],
    activity: {
      agent: ASK_ATLAS_OPERATOR_AGENT,
      missionKey: ASK_ATLAS_MISSION_KEY,
      trigger: 'operator_operating_picture',
      timestamp: ctx.now || new Date().toISOString(),
      tools: [GET_SEARCH_AUTHORIZED_KNOWLEDGE_TOOL],
      classification: neverPromoteClassification(search.classification),
      result,
      readWriteStatus: 'READ_AUTO',
      policyDecision: result,
      ran: search.ran,
    },
  };
}

function composeAuthorizedSearch(
  ctx: ToolGatewayContext,
  query: string,
  pmHits: AtlasAuthorizedSearchHit[],
  pictureHits: AtlasAuthorizedSearchHit[],
  opts: { entitled: boolean; ran: boolean; binding?: PictureClientBinding | null },
): AuthorizedSearchToolResult {
  const merged = mergeAuthorizedHits(pmHits, pictureHits).map((hit) =>
    attachExistingQueueActionability(hit, ctx.picture),
  );
  const hits = rankAuthorizedHits(merged);
  const pictureComposed = pictureHits.length > 0;
  const actionabilityApplied = hits.some((hit) => Boolean(hit.queue));
  const classification = hits.length ? strongestHitClassification(hits) : ('HONEST_EMPTY' as const);
  let why = 'No entitled search hits are available for this query.';
  let basedOn =
    'Entitled desk search returned no hits. No operational client rows, amounts, or clients were invented.';
  if (hits.length && pictureComposed && pmHits.length) {
    why = `Entitled picture and desk search returned ${hits.length} hit(s) for the requested query.`;
    basedOn =
      'OperatorOperatingPicture recovered/attention/project/capital/document context plus searchSharePointPm / GET /api/pm/search / operatorDesk.search. Classification is not promoted. No operational client rows were invented.';
  } else if (hits.length && pictureComposed) {
    why = `Entitled operator picture returned ${hits.length} hit(s) for the requested query.`;
    basedOn =
      'Already-authorized OperatorOperatingPicture recovered clients, actionable knowledge, queues, projects, capital packets, documents, and attention items. Classification is not promoted. No operational client rows were invented.';
  } else if (hits.length) {
    why = `Entitled desk search returned ${hits.length} hit(s) for the requested query.`;
    basedOn =
      'searchSharePointPm / GET /api/pm/search / operatorDesk.search entitled retrieval. Classification is not promoted.';
  }
  const authorizedSearch: AtlasAuthorizedSearch = {
    kind: 'atlas_authorized_search_v1',
    invented: false,
    honestEmpty: hits.length === 0,
    query,
    hitCount: hits.length,
    hits,
    classification: neverPromoteClassification(classification),
    why,
    basedOn,
    entitled: opts.entitled,
    ran: opts.ran || pictureComposed,
    pictureComposed,
    actionabilityApplied,
    documents: {
      kind: 'document_operating_record_v1',
      policyClass: 'READ_AUTO',
      binariesInAtlas: false,
      items: documentOperatingRecords(hits),
    },
    projects: {
      kind: 'project_operating_record_v1',
      policyClass: 'READ_AUTO',
      invented: false,
      currentClientsFirst: true,
      items: projectOperatingRecords(hits, ctx.picture, opts.binding || null),
    },
    threads: composeMailThreadRecords(hits),
    meetings: composeMeetingOperatingRecords(hits, entitledClientCodes(ctx.principal)),
    capitalSubmissions: composeCapitalSubmissionPrepare(hits),
    researchIntelligence: composeResearchIntelligence(hits, ctx.now),
    onboarding: composeOnboardingAgent(hits),
    clientSupport: composeClientSupportAgent(hits),
  };
  return {
    askAtlas: searchActivityAnswer(ctx, authorizedSearch),
    authorizedSearch,
  };
}

function composeBoundAuthorizedSearch(
  ctx: ToolGatewayContext,
  query: string,
  binding: PictureClientBinding | null,
  pmHits: AtlasAuthorizedSearchHit[],
  ran: boolean,
): AuthorizedSearchToolResult {
  const pictureHits = binding ? composeEntitledPictureHits(ctx.picture, binding) : [];
  return composeAuthorizedSearch(ctx, query, pmHits, pictureHits, {
    entitled: true,
    ran: ran || pictureHits.length > 0,
    binding,
  });
}

function reuseDeskSearchHits(
  ctx: ToolGatewayContext,
  query: string,
): { hits: AtlasAuthorizedSearchHit[]; ran: boolean } | null {
  const desk = ctx.deskSearch;
  if (!desk?.ran) return null;
  if (!sameSearchQuery(desk.q, query)) return null;
  return { hits: desk.hits.map(toAuthorizedSearchHit), ran: true };
}

/**
 * READ_AUTO tool. Authorization (desk principal, then entitledClientCodes,
 * then optional client binding) happens before any search retrieval or
 * picture walk. Reuses searchSharePointPm / already-loaded
 * operatorDesk.search hits and, when a binding is entitled, composes
 * additive hits from the already-authorized OperatorOperatingPicture.
 * Unknown / foreign clients fail closed without searching the tenant or
 * walking another client's picture. Classification is never promoted.
 * Owner-gated questions must not reach this function.
 */
export function searchAuthorizedKnowledgeSync(ctx: ToolGatewayContext): AuthorizedSearchToolResult {
  if (!canAccessOperatorDesk(ctx.principal)) {
    const authorizedSearch = emptyAuthorizedSearch({ entitled: false, ran: false });
    return {
      askAtlas: searchActivityAnswer(ctx, authorizedSearch),
      authorizedSearch,
    };
  }

  entitledClientCodes(ctx.principal);
  const query = normalizeAuthorizedSearchQuery(ctx.searchQuery || ctx.clientQuery || '');
  if (query.length < 2) {
    const authorizedSearch = emptyAuthorizedSearch({
      query,
      entitled: true,
      ran: false,
    });
    authorizedSearch.why = 'Search query is empty or too short.';
    authorizedSearch.basedOn = 'Query must be at least 2 characters after trim. Search was not executed.';
    return {
      askAtlas: searchActivityAnswer(ctx, authorizedSearch),
      authorizedSearch,
    };
  }

  const scoped = classifyClientSearchToken(query, ctx.principal, ctx.picture);
  if (scoped.scope === 'unknown') {
    const authorizedSearch = emptyAuthorizedSearch({ query: '', entitled: false, ran: false });
    return {
      askAtlas: searchActivityAnswer(ctx, authorizedSearch),
      authorizedSearch,
    };
  }

  const reused = reuseDeskSearchHits(ctx, query);
  const pmHits = filterHitsToBinding(reused?.hits || [], scoped.binding);
  return withDocumentRelatedContext(
    ctx,
    composeBoundAuthorizedSearch(ctx, query, scoped.binding, pmHits, reused?.ran === true),
  );
}

export async function searchAuthorizedKnowledge(ctx: ToolGatewayContext): Promise<AuthorizedSearchToolResult> {
  const prepared = searchAuthorizedKnowledgeSync({
    ...ctx,
    entitledSearch: undefined,
    deskSearch: ctx.deskSearch,
  });
  if (!canAccessOperatorDesk(ctx.principal)) return prepared;
  const query = normalizeAuthorizedSearchQuery(ctx.searchQuery || ctx.clientQuery || '');
  if (query.length < 2) return prepared;
  const scoped = classifyClientSearchToken(query, ctx.principal, ctx.picture);
  if (scoped.scope === 'unknown') return prepared;

  const reused = reuseDeskSearchHits(ctx, query);
  if (reused) {
    const pmHits = filterHitsToBinding(reused.hits, scoped.binding);
    return finalizeAuthorizedDocuments(
      ctx,
      composeBoundAuthorizedSearch(ctx, query, scoped.binding, pmHits, true),
    );
  }

  if (!ctx.entitledSearch) {
    return finalizeAuthorizedDocuments(
      ctx,
      composeBoundAuthorizedSearch(ctx, query, scoped.binding, [], false),
    );
  }

  const found = await ctx.entitledSearch(query);
  const pmHits = filterHitsToBinding(found.results.map(toAuthorizedSearchHit), scoped.binding);
  return finalizeAuthorizedDocuments(
    ctx,
    composeBoundAuthorizedSearch(ctx, query, scoped.binding, pmHits, true),
  );
}

export function invokeReadAutoTool(tool: string, ctx: ToolGatewayContext): AskAtlasAnswer {
  if (tool === GET_ATTENTION_ITEMS_TOOL) {
    return getAttentionItems(ctx);
  }
  if (tool === GET_CLIENT_CONTEXT_TOOL) {
    return getClientContext(ctx).askAtlas;
  }
  if (tool === GET_SEARCH_AUTHORIZED_KNOWLEDGE_TOOL) {
    return searchAuthorizedKnowledgeSync(ctx).askAtlas;
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
