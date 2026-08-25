/**
 * Current-client business memory: enumeration, identity map, reconciliation,
 * and backfill orchestration over existing M365 fabric + entitled Hub MI.
 */

import type { AtlasPrincipal } from '../../middleware/auth.ts';
import { canAccessOperatorDesk, entitledClientCodes } from '../sharepoint/authz.ts';
import { inspectFabricSyncHealth } from '../sharepoint/fabric/status.ts';
import { runFabricSync } from '../sharepoint/fabric/sync.ts';
import type { FabricGraphClient } from '../sharepoint/fabric/graph.ts';
import type { SharePointPmService } from '../sharepoint/repository.ts';
import { searchSharePointPm } from '../sharepoint/search.ts';
import {
  entityBoundaryFor,
  isSyntheticQaClient,
} from '../sharepoint/knowledgeClassification.ts';
import { hvsConfirmedClientFolders } from '../sharepoint/hvsRecoveryInventory.ts';
import type { OperatorOperatingPicture } from './types.ts';
import { composeMailThreadRecords } from './mailThreadContext.ts';
import {
  withAgentActivityWriteLock,
  readAgentActivityOverlay,
  writeAgentActivityOverlay,
} from './activityLedger.ts';
import { resolveAgentActivityOverlayDir } from './activityLedger.ts';
import type { AgentActivityLedgerEntry } from './types.ts';
import {
  BUSINESS_MEMORY_MISSION_KEY,
  type BusinessMemoryOverlay,
  type ClientIdentityRecord,
  type ClientOperatingRecordOverlay,
  type IdentityConfidence,
  type M365ReadProofs,
  readBusinessMemoryOverlay,
  recomputeProgress,
  resolveBusinessMemoryDir,
  upsertOperatingRecord,
  writeBusinessMemoryOverlay,
} from './businessMemoryState.ts';

const CONTRACT_SOW_RE = /\b(sow|scope of work|statement of work|contract|agreement|engagement letter|addendum)\b/i;

function stableId(prefix: string, parts: string[]): string {
  const body = parts.join('|').slice(0, 120);
  return `${prefix}-${body.replace(/\s+/g, '_').toLowerCase()}`;
}

export function buildM365ReadProofs(
  dataDir: string,
  hvsDataAccess: 'AVAILABLE' | 'PARTIAL' | 'BLOCKED',
  opts?: { sweepEnabled?: boolean },
): M365ReadProofs {
  const health = inspectFabricSyncHealth(dataDir, {
    scheduledSweepEnabled: opts?.sweepEnabled ?? false,
  });
  const notes: string[] = [...health.notes].slice(0, 12);
  const cumulativeMail = health.cumulative.mailThreads;
  const cumulativeFiles = health.cumulative.files;
  const cumulativeAttachments = health.cumulative.attachmentsIndexed;
  const hvcgMail: M365ReadProofs['hvcgMail'] =
    cumulativeMail > 0 && health.mailMode !== 'none'
      ? 'LIVE'
      : health.lastRunAt
        ? 'PARTIAL'
        : 'NOT_PROVED';
  const hvcgFiles: M365ReadProofs['hvcgFiles'] =
    cumulativeFiles > 0 ? 'LIVE' : health.lastRunAt ? 'PARTIAL' : 'NOT_PROVED';
  const hvsFiles: M365ReadProofs['hvsFiles'] =
    hvsDataAccess === 'BLOCKED'
      ? 'BLOCKED'
      : cumulativeFiles > 0
        ? 'LIVE'
        : hvsDataAccess === 'AVAILABLE'
          ? 'PARTIAL'
          : 'NOT_PROVED';
  const hvsMail: M365ReadProofs['hvsMail'] =
    hvsDataAccess === 'BLOCKED'
      ? 'BLOCKED'
      : cumulativeMail > 0
        ? 'LIVE'
        : hvsDataAccess === 'AVAILABLE'
          ? 'PARTIAL'
          : 'NOT_PROVED';
  const deltaCheckpoints: M365ReadProofs['deltaCheckpoints'] =
    health.mailDeltaReady || health.mailSkipPresent || health.lastRunAt ? 'LIVE' : 'NOT_PROVED';
  const syncRecovery: M365ReadProofs['syncRecovery'] =
    health.scheduledSweepEnabled || health.changeNotifications.status === 'ready'
      ? 'LIVE'
      : health.lastRunAt
        ? 'PARTIAL'
        : 'NOT_PROVED';
  if (cumulativeAttachments > 0) {
    notes.push(`Indexed attachment metadata count: ${cumulativeAttachments}`);
  }
  return {
    hvcgMail,
    hvsMail,
    hvcgFiles,
    hvsFiles,
    deltaCheckpoints,
    syncRecovery,
    hvsReadOnly: true,
    mailSendAdded: false,
    notes,
    verifiedAt: new Date().toISOString(),
  };
}

export async function enumerateAuthoritativeCurrentClients(
  principal: AtlasPrincipal,
  service: SharePointPmService,
): Promise<
  Array<{
    clientCode: string;
    displayName: string;
    dba?: string;
    sharePointLibraryUrl?: string;
  }>
> {
  if (!canAccessOperatorDesk(principal)) return [];
  const clients = await service.listAuthorizedClients(principal);
  return clients
    .filter((c) => c.clientCode && !isSyntheticQaClient(c.clientCode))
    .map((c) => ({
      clientCode: c.clientCode,
      displayName: c.displayName || c.clientCode,
      ...(c.dba ? { dba: c.dba } : {}),
      ...(c.sharePointLibraryUrl ? { sharePointLibraryUrl: c.sharePointLibraryUrl } : {}),
    }));
}

export function buildIdentityMapFromClients(
  clients: Array<{ clientCode: string; displayName: string; dba?: string }>,
  picture: OperatorOperatingPicture,
): ClientIdentityRecord[] {
  const hvsFolders = picture.hvsDataAccess !== 'BLOCKED' ? hvsConfirmedClientFolders() : [];
  const now = new Date().toISOString();
  return clients.map((client) => {
    const boundary = entityBoundaryFor(client.clientCode);
    const aliases: ClientIdentityRecord['aliases'] = [];
    if (client.displayName) {
      aliases.push({
        value: client.displayName,
        kind: 'legal_name',
        confidence: 'CONFIRMED',
        provenance: 'HVCG_Clients.displayName',
      });
    }
    if (client.dba) {
      aliases.push({
        value: client.dba,
        kind: 'dba',
        confidence: 'CONFIRMED',
        provenance: 'HVCG_Clients.dba',
      });
    }
    if (boundary?.legalName && boundary.legalName !== client.displayName) {
      aliases.push({
        value: boundary.legalName,
        kind: 'legal_name',
        confidence: 'CONFIRMED',
        provenance: 'entity_boundary',
      });
    }
    const hvsFolder = hvsFolders.find(
      (f) => f.clientCode === client.clientCode || f.client === client.displayName,
    );
    if (hvsFolder) {
      aliases.push({
        value: hvsFolder.client,
        kind: 'hvs_folder',
        confidence: 'LIKELY',
        provenance: 'hvs_recovery_inventory',
      });
    }
    const hubOperationalized = picture.realClientsOperationalized.includes(client.clientCode);
    return {
      clientCode: client.clientCode,
      legalName: boundary?.legalName || client.displayName,
      operatingName: client.dba || client.displayName,
      aliases,
      contactEmails: [],
      emailDomains: [],
      historicalHvsRelationship: Boolean(hvsFolder),
      authoritativeSource: hubOperationalized ? 'ENTITLED_HUB_MI' : 'HVCG_Clients',
      currentClient: true,
      updatedAt: now,
    };
  });
}

function extractCommitmentsFromPreview(
  preview: string,
  source: string,
): ClientOperatingRecordOverlay['commitments'] {
  const out: ClientOperatingRecordOverlay['commitments'] = [];
  const spans = preview.split(/(?<=[.?!])\s+/).map((s) => s.trim()).filter(Boolean);
  const confirmed = /\b(?:i will|i shall|we will|we shall|i'll|we'll)\b/i;
  const likely = /\b(?:follow(?:ing)? up|waiting (?:on|for)|i can|we can)\b/i;
  for (const span of spans) {
    let confidence: IdentityConfidence | null = null;
    if (confirmed.test(span)) confidence = 'CONFIRMED';
    else if (likely.test(span)) confidence = 'LIKELY';
    if (!confidence) continue;
    if (/\b(?:by|due)\s+\d{1,2}[/-]\d{1,2}/i.test(span)) {
      /* due dates only when explicit in span — stored in commitment text, not invented */
    }
    out.push({
      id: stableId('cmt', [source, span]),
      who: 'evidence_only',
      toWhom: 'evidence_only',
      commitment: span.slice(0, 280),
      source,
      status: 'OPEN',
      confidence,
    });
  }
  return out;
}

function extractDecisionsFromRecord(
  picture: OperatorOperatingPicture,
  clientCode: string,
): ClientOperatingRecordOverlay['decisions'] {
  const record = picture.hvsRecoveredClientRecords.find((r) => r.clientCode === clientCode);
  const out: ClientOperatingRecordOverlay['decisions'] = [];
  if (record?.decisions) {
    for (const d of record.decisions) {
      out.push({
        id: stableId('dec', [clientCode, d.title || d.evidence || 'decision']),
        decision: d.title || d.evidence || 'Decision from recovered knowledge',
        source: d.evidence || 'hvs_recovered_client_record',
        confidence: (d.classification as IdentityConfidence) || 'LIKELY',
      });
    }
  }
  return out;
}

function extractWaitingFromRecord(
  picture: OperatorOperatingPicture,
  clientCode: string,
): ClientOperatingRecordOverlay['waiting'] {
  const record = picture.hvsRecoveredClientRecords.find((r) => r.clientCode === clientCode);
  const knowledge = picture.hvsActionableClientKnowledge.find((r) => r.clientCode === clientCode);
  const out: ClientOperatingRecordOverlay['waiting'] = [];
  const sources = [
    ...(record?.waitingItems || []),
    ...(knowledge?.waitingItems || []),
  ];
  for (const w of sources) {
    const summary = w.title || w.evidence || 'Waiting item from recovered evidence';
    let state: ClientOperatingRecordOverlay['waiting'][0]['state'] = 'WAITING_ON_CLIENT';
    if (/hvcg|we\b/i.test(summary) && /waiting/i.test(summary)) state = 'WAITING_ON_HVCG';
    if (/vendor/i.test(summary)) state = 'WAITING_ON_VENDOR';
    if (/owner|manny/i.test(summary)) state = 'WAITING_ON_OWNER';
    if (/blocked/i.test(summary)) state = 'BLOCKED';
    out.push({
      id: stableId('wait', [clientCode, summary]),
      state,
      summary: summary.slice(0, 280),
      source: w.evidence || 'recovered_knowledge',
      confidence: (w.classification as IdentityConfidence) || 'LIKELY',
    });
  }
  return out;
}

export async function reconcileClientOperatingRecord(opts: {
  clientCode: string;
  clientName?: string;
  picture: OperatorOperatingPicture;
  principal: AtlasPrincipal;
  pmSearch: { results: import('../sharepoint/search.ts').PmSearchHit[] };
}): Promise<ClientOperatingRecordOverlay> {
  const { clientCode, picture, pmSearch } = opts;
  const hits = pmSearch.results
    .filter((h) => h.clientCode === clientCode)
    .map((h) => ({
      kind: h.kind || 'document',
      id: h.id,
      title: h.title,
      ...(h.href ? { href: h.href } : {}),
      ...(h.clientCode ? { clientCode: h.clientCode } : {}),
      ...(h.source ? { source: h.source } : {}),
      ...(h.webUrl ? { webUrl: h.webUrl } : {}),
      ...(h.modifiedAt ? { modifiedAt: h.modifiedAt } : {}),
      ...(h.preview ? { preview: h.preview } : {}),
      ...(h.conversationId ? { conversationId: h.conversationId } : {}),
      ...(h.direction ? { direction: h.direction } : {}),
      why: 'business_memory_reconciliation',
      basedOn: 'searchSharePointPm entitled retrieval',
      provenance: 'LIKELY' as const,
      classification: 'LIKELY' as const,
    }));

  const threads = composeMailThreadRecords(hits);
  const mailHits = hits.filter((h) => h.kind === 'communication');
  const fileHits = hits.filter((h) => h.kind === 'document' || h.kind === 'file');
  const projectHits = hits.filter((h) => h.kind === 'project');
  const contractHits = fileHits.filter((h) => CONTRACT_SOW_RE.test(h.title));

  const commitments: ClientOperatingRecordOverlay['commitments'] = [];
  for (const thread of threads.items) {
    for (const c of thread.commitments) {
      commitments.push({
        id: stableId('cmt', [thread.conversationId, c.text]),
        who: 'thread_evidence',
        toWhom: 'thread_evidence',
        commitment: c.text,
        source: `thread:${thread.conversationId}`,
        status: 'OPEN',
        confidence: c.classification as IdentityConfidence,
      });
    }
  }
  for (const hit of mailHits) {
    if (hit.preview) commitments.push(...extractCommitmentsFromPreview(hit.preview, `mail:${hit.id}`));
  }

  const decisions = extractDecisionsFromRecord(picture, clientCode);
  const waiting = extractWaitingFromRecord(picture, clientCode);

  const hvsRecord = picture.hvsRecoveredClientRecords.find((r) => r.clientCode === clientCode);
  const projectsFromPicture = picture.hvsRecoveredProjects.filter(
    (p) => p.clientCode === clientCode || p.client === opts.clientName,
  );

  const whatWeAreWorkingOn = [
    ...projectHits.map((p) => p.title),
    ...projectsFromPicture.map((p) => p.title),
    ...hvsRecord?.projectTitles || [],
  ].filter(Boolean);
  const whatWeDelivered = fileHits
    .filter((h) => /\b(deliverable|final|completed)\b/i.test(h.title))
    .map((h) => h.title);
  const documentsThatMatter = [
    ...contractHits.map((h) => h.title),
    ...(hvsRecord?.capitalPacketNames || []),
    ...(hvsRecord?.invoiceFilenames || []),
  ];
  const whatIsOpen = [
    ...(hvsRecord?.nextActions || []),
    ...(hvsRecord?.decisionsRequired || []),
  ];
  const waitingOnUs = waiting
    .filter((w) => w.state === 'WAITING_ON_HVCG')
    .map((w) => w.summary);
  const waitingOnThem = waiting
    .filter((w) => w.state === 'WAITING_ON_CLIENT')
    .map((w) => w.summary);
  const needsOwnerAttention = [
    ...waiting.filter((w) => w.state === 'WAITING_ON_OWNER').map((w) => w.summary),
    ...(hvsRecord?.decisionsRequired || []),
  ];

  const hubMi = picture.realClientsOperationalized.includes(clientCode);
  const hasEvidence =
    hits.length > 0 ||
    Boolean(hvsRecord) ||
    projectsFromPicture.length > 0 ||
    commitments.length > 0;

  let phase: ClientOperatingRecordOverlay['phase'] = 'NOT_STARTED';
  if (!hasEvidence) phase = hubMi ? 'PARTIAL' : 'BLOCKED';
  else if (threads.items.length > 0 && (projectHits.length > 0 || projectsFromPicture.length > 0)) {
    phase = 'BACKFILLED';
  } else phase = 'PARTIAL';

  const classification = hubMi ? 'CONFIRMED' : hasEvidence ? 'LIKELY' : 'HONEST_EMPTY';

  return {
    clientCode,
    clientName: opts.clientName || hvsRecord?.client,
    phase,
    whoIsTheClient: opts.clientName || hvsRecord?.client || clientCode,
    whatWeAreWorkingOn: whatWeAreWorkingOn.length ? whatWeAreWorkingOn : undefined,
    whatWeDelivered: whatWeDelivered.length ? whatWeDelivered : undefined,
    whatIsOpen: whatIsOpen.length ? whatIsOpen : undefined,
    waitingOnUs: waitingOnUs.length ? waitingOnUs : undefined,
    waitingOnThem: waitingOnThem.length ? waitingOnThem : undefined,
    decisionsMade: decisions.map((d) => d.decision),
    documentsThatMatter: documentsThatMatter.length ? documentsThatMatter : undefined,
    needsOwnerAttention: needsOwnerAttention.length ? needsOwnerAttention : undefined,
    nextAction: hvsRecord?.nextAction || whatIsOpen[0],
    commitments,
    decisions,
    waiting,
    mailMessagesReconciled: mailHits.length,
    threadsReconstructed: threads.items.length,
    attachmentsReconciled: hits.filter((h) => h.kind === 'attachment').length,
    filesReconciled: fileHits.length,
    projectsReconstructed: projectHits.length + projectsFromPicture.length,
    contractsSowReconciled: contractHits.length,
    capitalHistoryPresent: Boolean(
      hvsRecord?.capitalPacketNames?.length ||
        picture.hvsRecoveredCapitalPackets.some((p) => p.clientCode === clientCode),
    ),
    classification,
    provenance: hubMi
      ? 'entitled_hub_mi_plus_indexed_evidence'
      : 'indexed_and_recovered_evidence_only',
    lastBackfillAt: new Date().toISOString(),
    ...(phase === 'BLOCKED' && !hasEvidence
      ? { blockers: ['No entitled indexed or recovered evidence for this client code'] }
      : {}),
  };
}

async function appendBusinessMemoryBatchActivity(opts: {
  dataDir: string;
  principal: AtlasPrincipal;
  summary: string;
  clientCodes: string[];
}): Promise<void> {
  const dir = resolveAgentActivityOverlayDir(opts.dataDir);
  const entry: AgentActivityLedgerEntry = {
    agent: 'atlas_business_memory',
    missionKey: BUSINESS_MEMORY_MISSION_KEY,
    trigger: 'scheduled_sweep',
    timestamp: new Date().toISOString(),
    tools: ['business_memory_backfill'],
    classification: 'CONFIRMED',
    confidence: 'CONFIRMED',
    result: 'answered',
    readWriteStatus: 'READ_AUTO',
    policyDecision: 'answered',
    writerUserId: opts.principal.userId,
    affected: opts.clientCodes.map((clientCode) => ({ clientCode, classification: 'CONFIRMED' })),
  };
  await withAgentActivityWriteLock(dir, () => {
    const overlay = readAgentActivityOverlay(dir);
    overlay.entries.push(entry);
    writeAgentActivityOverlay(dir, overlay);
  });
}

export async function runCurrentClientBackfill(opts: {
  dataDir: string;
  principal: AtlasPrincipal;
  picture: OperatorOperatingPicture;
  service: SharePointPmService;
  fabric?: FabricGraphClient;
  clientCode?: string;
  maxPages?: number;
  sweepEnabled?: boolean;
}): Promise<BusinessMemoryOverlay> {
  const memDir = resolveBusinessMemoryDir(opts.dataDir);
  let overlay = readBusinessMemoryOverlay(memDir);

  if (opts.fabric) {
    await runFabricSync({
      principal: opts.principal,
      service: opts.service,
      fabric: opts.fabric,
      dataDir: opts.dataDir,
      maxPages: opts.maxPages,
    });
  }

  overlay.readProofs = buildM365ReadProofs(opts.dataDir, opts.picture.hvsDataAccess, {
    sweepEnabled: opts.sweepEnabled,
  });

  const clients = await enumerateAuthoritativeCurrentClients(opts.principal, opts.service);
  overlay.identityMap = buildIdentityMapFromClients(clients, opts.picture);

  const targetCodes = opts.clientCode
    ? clients.filter((c) => c.clientCode === opts.clientCode).map((c) => c.clientCode)
    : clients.map((c) => c.clientCode);

  const reconciled: string[] = [];
  for (const client of clients) {
    if (!targetCodes.includes(client.clientCode)) continue;
    const pmSearch = await searchSharePointPm(opts.service, opts.principal, client.clientCode);
    const record = await reconcileClientOperatingRecord({
      clientCode: client.clientCode,
      clientName: client.displayName,
      picture: opts.picture,
      principal: opts.principal,
      pmSearch,
    });
    upsertOperatingRecord(overlay, record);
    reconciled.push(client.clientCode);
  }

  overlay.progress = {
    ...recomputeProgress(overlay),
    lastRunAt: new Date().toISOString(),
  };
  writeBusinessMemoryOverlay(memDir, overlay);

  if (reconciled.length) {
    await appendBusinessMemoryBatchActivity({
      dataDir: opts.dataDir,
      principal: opts.principal,
      summary: `CLIENT_BACKFILL batch: ${reconciled.length} client(s) reconciled`,
      clientCodes: reconciled,
    });
  }

  return overlay;
}

export function getOperatingRecordForClient(
  overlay: BusinessMemoryOverlay,
  clientCode: string,
): ClientOperatingRecordOverlay | undefined {
  return overlay.operatingRecords.find((r) => r.clientCode === clientCode);
}

export function buildBusinessMemoryStatusPayload(
  dataDir: string,
  picture: OperatorOperatingPicture,
  overlay: BusinessMemoryOverlay,
): {
  kind: 'business_memory_status_v1';
  missionKey: typeof BUSINESS_MEMORY_MISSION_KEY;
  invented: false;
  identityMapLive: boolean;
  progress: BusinessMemoryOverlay['progress'];
  readProofs: M365ReadProofs;
  operatingRecords: ClientOperatingRecordOverlay[];
  identityMap: ClientIdentityRecord[];
} {
  return {
    kind: 'business_memory_status_v1',
    missionKey: BUSINESS_MEMORY_MISSION_KEY,
    invented: false,
    identityMapLive: overlay.identityMap.length > 0,
    progress: overlay.progress,
    readProofs: overlay.readProofs,
    operatingRecords: overlay.operatingRecords,
    identityMap: overlay.identityMap,
  };
}

export function clientBusinessMemoryPayloadFromRecord(
  record: ClientOperatingRecordOverlay,
): import('./types.ts').ClientBusinessMemoryPayload {
  return {
    kind: 'client_business_memory_v1',
    missionKey: BUSINESS_MEMORY_MISSION_KEY,
    invented: false,
    phase: record.phase,
    whoIsTheClient: record.whoIsTheClient,
    whatWeAreWorkingOn: record.whatWeAreWorkingOn,
    whatWeDelivered: record.whatWeDelivered,
    whatIsOpen: record.whatIsOpen,
    waitingOnUs: record.waitingOnUs,
    waitingOnThem: record.waitingOnThem,
    decisionsMade: record.decisionsMade,
    documentsThatMatter: record.documentsThatMatter,
    needsOwnerAttention: record.needsOwnerAttention,
    nextAction: record.nextAction,
    mailMessagesReconciled: record.mailMessagesReconciled,
    threadsReconstructed: record.threadsReconstructed,
    attachmentsReconciled: record.attachmentsReconciled,
    filesReconciled: record.filesReconciled,
    projectsReconstructed: record.projectsReconstructed,
    contractsSowReconciled: record.contractsSowReconciled,
    capitalHistoryPresent: record.capitalHistoryPresent,
    classification: record.classification === 'HONEST_EMPTY' ? 'HONEST_EMPTY' : record.classification,
    provenance: record.provenance,
  };
}

export function mapsToBusinessMemoryIntent(question: string): boolean {
  const q = question.toLowerCase();
  return (
    /\bwhat are we working on\b/.test(q) ||
    /\bwhat did .+ ask\b/.test(q) ||
    /\bwaiting on\b/.test(q) ||
    /\bcommitments?\b/.test(q) ||
    /\bwhat documents are missing\b/.test(q) ||
    /\bwhat happened with\b.*\bcapital\b/.test(q) ||
    /\bwhat changed this week\b/.test(q) ||
    /\bhistory of this project\b/.test(q) ||
    /\bwhat did we decide\b/.test(q) ||
    /\bclients? (are )?waiting on us\b/.test(q) ||
    /\bwhat do i owe clients\b/.test(q) ||
    /\bbusiness memory\b/.test(q) ||
    /\bbackfill\b/.test(q)
  );
}

export function answerBusinessMemoryQuestion(opts: {
  question: string;
  overlay: BusinessMemoryOverlay;
  clientCode?: string;
}): { answer: string; honestEmpty: boolean; classification: IdentityConfidence | 'HONEST_EMPTY' } {
  const code = opts.clientCode?.trim();
  const record = code ? getOperatingRecordForClient(opts.overlay, code) : undefined;
  if (!record) {
    return {
      answer: 'No reconciled business memory is available for that client from authoritative current-client evidence.',
      honestEmpty: true,
      classification: 'HONEST_EMPTY',
    };
  }
  const parts: string[] = [`Client ${record.clientCode}: ${record.whoIsTheClient || record.clientCode}.`];
  if (record.whatWeAreWorkingOn?.length) {
    parts.push(`Working on: ${record.whatWeAreWorkingOn.slice(0, 5).join('; ')}`);
  }
  if (record.waitingOnThem?.length) {
    parts.push(`Waiting on client: ${record.waitingOnThem.slice(0, 3).join('; ')}`);
  }
  if (record.waitingOnUs?.length) {
    parts.push(`Waiting on HVCG: ${record.waitingOnUs.slice(0, 3).join('; ')}`);
  }
  if (record.commitments.length) {
    parts.push(`Commitments (${record.commitments.length}): ${record.commitments
      .slice(0, 3)
      .map((c) => c.commitment)
      .join('; ')}`);
  }
  if (record.nextAction) parts.push(`Next action: ${record.nextAction}`);
  return {
    answer: parts.join(' '),
    honestEmpty: false,
    classification: record.classification === 'HONEST_EMPTY' ? 'LIKELY' : record.classification,
  };
}
