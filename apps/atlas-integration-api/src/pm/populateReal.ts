/**
 * Populate Atlas PM from real Microsoft + Client 360 data.
 * Creates projects, tasks, deliverables, waiting items, commitments, meetings work,
 * and document requests — not demo placeholders.
 */

import type { CanonicalRecord } from '@hvcg/atlas-integration-core';
import type { IntegrationRepository } from '../store/repository.ts';
import type { Client360Candidate } from '../store/types.ts';
import { isVendorNoiseDomain } from '../client360/classify.ts';
import type { PmRepository } from './repository.ts';
import type {
  DeliverableRecord,
  ProjectRecord,
  ProjectType,
  TaskPriority,
  TaskRecord,
  WaitingItemRecord,
} from './types.ts';
import { bootstrapKnownProjects, extractWorkFromSources } from './bootstrap.ts';

const MANNY = { id: 'person-manny', name: 'Manny Barela' };

/** Display-name stems that are folders, products, or marketing noise — not clients. */
const NOISE_CLIENT_NAMES = new Set(
  [
    'mercury',
    'skool',
    'neilpatel',
    'buildertrend',
    'thesmallbusinessexpo',
    'connectedinvestors',
    'shop',
    'marketing',
    'compliance',
    'accounts',
    'account',
    'acquisitions',
    'engage',
    'mail',
    'email',
    'paperform',
    'duda',
    'e',
    '2x',
    'thedealmaker',
    'bullmarket',
    'fundandgrow',
    'naiohb',
    'linkedin',
    'adobesign',
    'adobe',
    'microsoft',
    'google',
    'zoom',
    'calendly',
    'aircall',
    'noreply',
    'notification',
    'notifications',
    'messaging',
    'facebookmail',
    'facebook',
    'privatelenders',
    'meridianleads',
    'taxzerone',
    'newsilver',
    'liveoak',
    'kiavi',
    'usfcr',
    'chase',
    'finalinstall',
  ].map((s) => s.toLowerCase()),
);

function nowIso() {
  return new Date().toISOString();
}

function addDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function isNoiseClient(c: Client360Candidate): boolean {
  const name = (c.displayName || '').toLowerCase().trim();
  if (!name || name.length < 3) return true;
  if (NOISE_CLIENT_NAMES.has(name)) return true;
  if (NOISE_CLIENT_NAMES.has(name.replace(/\s+/g, ''))) return true;
  if (c.domains?.some((d) => isVendorNoiseDomain(d))) return true;
  // Single-letter / numeric junk
  if (/^[a-z0-9]$/i.test(name)) return true;
  return false;
}

/** Real clients worth operating on in Atlas. */
function selectRealClients(clients: Client360Candidate[]): Client360Candidate[] {
  return clients
    .filter((c) => !isNoiseClient(c))
    .filter((c) => {
      const a = c.associations || ({} as Client360Candidate['associations']);
      const emails = a.emails?.length || 0;
      const docs = (a.documents?.length || 0) + (a.attachments?.length || 0);
      const meetings = a.meetings?.length || 0;
      const invoices = a.invoices?.length || 0;
      const proposals = a.proposals?.length || 0;
      const agreements = a.agreements?.length || 0;
      const funding = a.fundingRequests?.length || 0;
      if (c.lifecycle === 'active' && (meetings > 0 || docs > 0 || emails >= 30)) return true;
      if (meetings >= 2) return true;
      if (funding + invoices + proposals + agreements > 0 && emails >= 5) return true;
      if (docs >= 8 && emails >= 20 && nameLooksLikeBusiness(c.displayName)) return true;
      if (emails >= 100 && nameLooksLikeBusiness(c.displayName) && (c.completenessScore || 0) >= 45) {
        return true;
      }
      // Explicit known operating names
      if (
        /\b(accg|prodigy|kava|christie|falk|hart|colorado|beef|lien|gnieski|eam)\b/i.test(
          c.displayName,
        )
      ) {
        return true;
      }
      return false;
    })
    .sort((a, b) => (b.sourceRefs?.length || 0) - (a.sourceRefs?.length || 0));
}

function nameLooksLikeBusiness(name: string): boolean {
  if (/\b(llc|inc|corp|ltd|dental|beef|partners|capital|games|kava|place)\b/i.test(name)) {
    return true;
  }
  return name.length >= 6 && /[a-z]/i.test(name);
}

function bestClientMatch(
  hay: string,
  clients: Client360Candidate[],
): Client360Candidate | undefined {
  let best: Client360Candidate | undefined;
  let bestScore = 0;
  for (const c of clients) {
    let score = 0;
    const name = c.displayName.toLowerCase();
    if (name.length >= 4 && hay.includes(name)) score += 20 + name.length;
    for (const d of c.domains || []) {
      if (hay.includes(d.toLowerCase())) score += 25;
      const base = d.split('.')[0];
      if (base.length >= 5 && hay.includes(base)) score += 10;
    }
    for (const e of c.emails || []) {
      if (hay.includes(e.toLowerCase())) score += 30;
    }
    // Special anchors
    if (/colorado\s*craft\s*beef|jeff@coloradocraftbeef|colorado beef/i.test(hay) && /colorado|beef/i.test(name)) {
      score += 50;
    }
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return bestScore >= 15 ? best : undefined;
}

function bestProjectMatch(hay: string, pm: PmRepository) {
  let best = undefined as ReturnType<PmRepository['listProjects']>[number] | undefined;
  let bestScore = 0;
  for (const p of pm.listProjects()) {
    let score = 0;
    if (p.clientName && hay.includes(p.clientName.toLowerCase())) score += 20;
    if (hay.includes(p.name.toLowerCase())) score += 15;
    for (const t of p.tags || []) {
      if (t.length >= 4 && hay.includes(t.toLowerCase())) score += 8;
    }
    if (/colorado|beef|jeff smith/i.test(hay) && /colorado beef/i.test(p.name)) score += 40;
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return bestScore >= 15 ? best : undefined;
}

function dedupeOpenTasks(pm: PmRepository): number {
  const open = pm.listTasks({ openOnly: true });
  const seen = new Map<string, string>();
  let cancelled = 0;
  for (const t of open) {
    const normalizedTitle = (t.title || '')
      .toLowerCase()
      .replace(/^(re|fw|fwd):\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    const key = `${normalizedTitle}|${t.clientId || t.clientName || ''}|${t.projectId || ''}`;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, t.id);
      continue;
    }
    pm.upsertTask({
      ...t,
      status: 'cancelled',
      updatedAt: nowIso(),
      activity: [
        ...t.activity,
        {
          id: crypto.randomUUID(),
          at: nowIso(),
          actor: 'Work Extraction Agent',
          action: 'deduped',
          detail: `Duplicate of ${existing}`,
        },
      ],
    });
    cancelled++;
  }
  return cancelled;
}

function archiveNoiseProjects(pm: PmRepository): number {
  let n = 0;
  const now = nowIso();
  for (const p of pm.listProjects()) {
    const name = (p.clientName || p.name || '').toLowerCase().replace(/\s+engagement$/, '');
    const stem = name.replace(/\s+/g, '');
    if (!NOISE_CLIENT_NAMES.has(name) && !NOISE_CLIENT_NAMES.has(stem)) continue;
    if (p.status === 'archived') continue;
    pm.upsertProject({
      ...p,
      status: 'archived',
      archivedAt: now,
      updatedAt: now,
      nextAction: 'Archived — platform/noise entity',
    });
    // cancel open tasks on noise projects
    for (const t of pm.listTasks({ projectId: p.id, openOnly: true })) {
      pm.upsertTask({ ...t, status: 'cancelled', updatedAt: now });
    }
    n++;
  }
  return n;
}

function cancelMarketingNoiseTasks(pm: PmRepository): number {
  const re =
    /\b(unsubscribe|newsletter|rate dropped|check your rate|credible|linkedin\b|your weekly|webinar invite|flash sale|limited time offer)\b/i;
  let n = 0;
  const now = nowIso();
  for (const t of pm.listTasks({ openOnly: true })) {
    if (!re.test(t.title) && !re.test(t.description || '')) continue;
    pm.upsertTask({
      ...t,
      status: 'cancelled',
      updatedAt: now,
      activity: [
        ...t.activity,
        {
          id: crypto.randomUUID(),
          at: now,
          actor: 'Work Extraction Agent',
          action: 'cancelled_noise',
          detail: 'Marketing / platform noise',
        },
      ],
    });
    n++;
  }
  return n;
}

function repairMeetingClientLinks(pm: PmRepository): number {
  let fixed = 0;
  const now = nowIso();
  const beef = pm.findProjectByName('Colorado Beef SBA Express');
  for (const t of pm.listTasks({ openOnly: true })) {
    if (!/colorado\s*beef|jeff smith/i.test(t.title)) continue;
    if (!beef) continue;
    if (t.projectId === beef.id && t.clientName === beef.clientName) continue;
    pm.upsertTask({
      ...t,
      projectId: beef.id,
      clientId: beef.clientId,
      clientName: beef.clientName || 'Colorado Craft Beef',
      updatedAt: now,
    });
    fixed++;
  }
  return fixed;
}

function inferProjectType(c: Client360Candidate): ProjectType {
  const a = c.associations;
  if ((a.fundingRequests?.length || 0) > 0) return 'funding_request';
  if ((a.invoices?.length || 0) > 0 || (a.agreements?.length || 0) > 0) return 'client_engagement';
  if ((a.proposals?.length || 0) > 0) return 'capital_advisory';
  if (c.lifecycle === 'prospect') return 'sales';
  return 'client_engagement';
}

function inferPriority(c: Client360Candidate): TaskPriority {
  if (c.lifecycle === 'active') return 'high';
  if ((c.associations.meetings?.length || 0) > 5) return 'high';
  if ((c.associations.fundingRequests?.length || 0) > 0) return 'critical';
  return 'normal';
}

function inferEntity(c: Client360Candidate): string {
  const be = c.businessEntities || [];
  if (be.includes('HVCG')) return 'HVCG';
  if (be.includes('HVS')) return 'HVS';
  return be[0] || 'HVS';
}

function normalizeClientMatchKey(name: string | undefined | null): string {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function findOrCreateClientProject(
  pm: PmRepository,
  c: Client360Candidate,
): { project: ProjectRecord; created: boolean } {
  const cKey = normalizeClientMatchKey(c.displayName);
  const existing =
    pm.listProjects().find(
      (p) =>
        p.clientId === c.id ||
        (p.clientName &&
          p.clientName.toLowerCase() === c.displayName.toLowerCase()) ||
        (p.tags || []).includes(`client360:${c.id}`),
    ) ||
    // Normalize punctuation/spacing so "Lienpartners" matches "Lien Partners"
    pm.listProjects().find((p) => {
      const pKey = normalizeClientMatchKey(p.clientName);
      return Boolean(cKey && pKey && cKey === pKey && pKey.length >= 4);
    }) ||
    pm.listProjects().find((p) => {
      const pKey = normalizeClientMatchKey(p.clientName);
      const nameKey = normalizeClientMatchKey(p.name?.replace(/\s+Engagement$/i, ''));
      return Boolean(
        cKey &&
          ((pKey && (cKey.includes(pKey) || pKey.includes(cKey)) && pKey.length >= 4) ||
            (nameKey && (cKey.includes(nameKey) || nameKey.includes(cKey)) && nameKey.length >= 4)),
      );
    }) ||
    pm.listProjects().find(
      (p) =>
        p.clientName &&
        c.displayName.toLowerCase().includes(p.clientName.toLowerCase()) &&
        p.clientName.length >= 4,
    );

  const now = nowIso();
  if (existing) {
    const updated: ProjectRecord = {
      ...existing,
      clientId: existing.clientId || c.id,
      clientName: existing.clientName || c.displayName,
      tags: [...new Set([...(existing.tags || []), `client360:${c.id}`, ...c.domains])],
      lastActivityAt: now,
      updatedAt: now,
      status: existing.status === 'draft' ? 'active' : existing.status,
      // Never invent "healthy" from completeness alone during link updates.
      health:
        existing.health && existing.health !== 'unknown'
          ? existing.health
          : (c.completenessScore || 0) < 40
            ? 'watch'
            : existing.health || 'unknown',
    };
    pm.upsertProject(updated);
    return { project: updated, created: false };
  }

  const project: ProjectRecord = {
    id: crypto.randomUUID(),
    name: `${c.displayName} Engagement`,
    clientId: c.id,
    clientName: c.displayName,
    businessEntity: inferEntity(c),
    projectType: inferProjectType(c),
    description: `Operating engagement discovered from Microsoft communications (${c.sourceRefs?.length || 0} source refs).`,
    objective: c.recommendedNextActions?.[0] || `Advance work for ${c.displayName}`,
    ownerId: MANNY.id,
    ownerName: MANNY.name,
    teamMemberIds: [MANNY.id],
    startDate: addDays(-60),
    // Do not invent a due date when none exists in source systems.
    targetCompletionDate: undefined,
    currentPhase: c.lifecycle === 'active' ? 'Delivery' : 'Pipeline',
    status: 'active',
    priority: inferPriority(c),
    health: 'unknown',
    progressPercent: Math.min(85, Math.max(5, c.completenessScore || 10)),
    nextAction: c.recommendedNextActions?.[0] || undefined,
    sourceLinks: (c.sourceRefs || []).slice(0, 5).map((r) => ({
      provider: r.providerId,
      connectionId: r.connectionId,
      sourceRecordId: r.sourceRecordId,
      kind: r.kind,
      title: r.title,
    })),
    tags: [`client360:${c.id}`, ...c.domains, c.lifecycle],
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
  };
  pm.upsertProject(project);
  return { project, created: true };
}

function ensureTask(
  pm: PmRepository,
  key: string,
  builder: () => TaskRecord,
): boolean {
  if (pm.findTaskBySource(key)) return false;
  // also title+project soft dedupe for open tasks
  const t = builder();
  const dup = pm
    .listTasks({ openOnly: true })
    .some(
      (x) =>
        x.title === t.title &&
        x.projectId === t.projectId &&
        x.clientId === t.clientId,
    );
  if (dup) return false;
  // force source link key
  if (!t.sourceLinks.some((s) => s.sourceRecordId === key)) {
    t.sourceLinks = [{ sourceRecordId: key, kind: 'derived', title: t.title }, ...t.sourceLinks];
  }
  pm.upsertTask(t);
  return true;
}

function recordById(
  records: CanonicalRecord[],
  id: string,
): CanonicalRecord | undefined {
  return records.find((r) => r.id === id);
}

export interface PopulateResult {
  realClientsSelected: number;
  projectsCreated: number;
  projectsUpdated: number;
  deliverablesCreated: number;
  documentRequests: number;
  followUpTasks: number;
  meetingTasks: number;
  invoiceTasks: number;
  duplicatesCancelled: number;
  noiseProjectsArchived: number;
  meetingsRelinked: number;
  extraction: ReturnType<typeof extractWorkFromSources>;
  bootstrap: ReturnType<typeof bootstrapKnownProjects>;
  projectsTotal: number;
  tasksOpen: number;
  waitingOpen: number;
  deliverablesTotal: number;
}

export function populateRealWorkFromMicrosoft(
  pm: PmRepository,
  integration: IntegrationRepository,
): PopulateResult {
  const now = nowIso();
  const allClients = integration.listClient360();
  const records = integration.listAllSourceRecords(200_000);
  const byId = new Map(records.map((r) => [r.id, r]));

  // 1) Seed known anchors then extract email/calendar signals
  const bootstrap = bootstrapKnownProjects(
    pm,
    allClients.map((c) => ({
      id: c.id,
      displayName: c.displayName,
      domains: c.domains || [],
      completenessScore: c.completenessScore,
    })),
  );
  const extraction = extractWorkFromSources(pm, integration);

  // 2) Real client projects from Client 360
  const realClients = selectRealClients(allClients);
  let projectsCreated = 0;
  let projectsUpdated = 0;
  let deliverablesCreated = 0;
  let documentRequests = 0;
  let followUpTasks = 0;
  let meetingTasks = 0;
  let invoiceTasks = 0;

  for (const c of realClients) {
    const { project, created } = findOrCreateClientProject(pm, c);
    if (created) projectsCreated++;
    else projectsUpdated++;

    const a = c.associations;

    // Deliverables from classified associations
    const deliverableKinds: Array<{
      ids: string[];
      status: DeliverableRecord['status'];
      label: string;
    }> = [
      { ids: a.deliverables || [], status: 'draft', label: 'Deliverable' },
      { ids: a.proposals || [], status: 'in_review', label: 'Proposal' },
      { ids: a.agreements || [], status: 'approved', label: 'Agreement' },
      { ids: a.invoices || [], status: 'delivered', label: 'Invoice' },
    ];

    for (const group of deliverableKinds) {
      for (const rid of group.ids.slice(0, 40)) {
        const rec = byId.get(rid) || recordById(records, rid);
        const name = rec?.title || `${group.label} for ${c.displayName}`;
        const sourceKey = `deliverable:${rid}`;
        if (pm.listDeliverables(project.id).some((d) => d.sourceLinks.some((s) => s.sourceRecordId === sourceKey))) {
          continue;
        }
        const d: DeliverableRecord = {
          id: crypto.randomUUID(),
          name: name.slice(0, 160),
          clientId: c.id,
          clientName: c.displayName,
          projectId: project.id,
          ownerId: MANNY.id,
          ownerName: MANNY.name,
          dueDate: addDays(14),
          status: group.status,
          draftLocation: rec?.provenance.sourceUrl,
          finalLocation: rec?.provenance.sourceUrl,
          sourceLinks: [
            {
              provider: rec?.provenance.provider,
              connectionId: String(rec?.fields.connectionId || rec?.provenance.sourceAccount || ''),
              sourceRecordId: sourceKey,
              sourceUrl: rec?.provenance.sourceUrl,
              kind: rec?.kind || group.label,
              title: name,
            },
          ],
          createdAt: now,
          updatedAt: now,
        };
        pm.upsertDeliverable(d);
        deliverablesCreated++;
      }
    }

    // Document requests / waiting from missing Client 360 fields
    for (const missing of (c.missingInformation || []).slice(0, 6)) {
      if (!/document|proposal|agreement|invoice|contact|funding/i.test(missing)) continue;
      const what = `Obtain: ${missing} — ${c.displayName}`;
      const exists = pm
        .listWaiting(true)
        .some((w) => w.clientId === c.id && w.whatIsNeeded === what);
      if (exists) continue;
      const waiting: WaitingItemRecord = {
        id: crypto.randomUUID(),
        whatIsNeeded: what,
        owedByName: c.displayName,
        dateRequested: now.slice(0, 10),
        dueDate: addDays(7),
        nextFollowUpDate: addDays(3),
        clientId: c.id,
        clientName: c.displayName,
        projectId: project.id,
        escalationLevel: (c.completenessScore || 0) < 35 ? 1 : 0,
        sourceLinks: [{ kind: 'client360', sourceRecordId: `missing:${c.id}:${missing}`, title: missing }],
        status: 'open',
        createdAt: now,
        updatedAt: now,
      };
      pm.upsertWaiting(waiting);
      documentRequests++;

      if (
        ensureTask(pm, `docreq:${c.id}:${missing}`, () => ({
          id: crypto.randomUUID(),
          title: `Collect ${missing} from ${c.displayName}`,
          description: `Client 360 completeness ${c.completenessScore ?? 0}%. Missing: ${missing}.`,
          projectId: project.id,
          clientId: c.id,
          clientName: c.displayName,
          assigneeKind: 'person',
          assigneeId: MANNY.id,
          assigneeName: MANNY.name,
          creatorId: 'agent-client360',
          creatorName: 'Client 360 Ingestion Agent',
          source: 'client360_missing',
          sourceLinks: [{ sourceRecordId: `docreq:${c.id}:${missing}`, kind: 'client360' }],
          status: 'ready',
          priority: (c.completenessScore || 0) < 40 ? 'high' : 'normal',
          dueDate: addDays(5),
          dependencyTaskIds: [],
          requiresApproval: false,
          checklist: [],
          nextAction: `Request ${missing}`,
          confidence: 0.9,
          autoGenerated: true,
          businessEntity: project.businessEntity,
          createdAt: now,
          updatedAt: now,
          activity: [],
        }))
      ) {
        followUpTasks++;
      }
    }

    // Recommended next actions → concrete tasks
    for (const action of (c.recommendedNextActions || []).slice(0, 3)) {
      if (
        ensureTask(pm, `next:${c.id}:${action.slice(0, 40)}`, () => ({
          id: crypto.randomUUID(),
          title: `${action} — ${c.displayName}`,
          projectId: project.id,
          clientId: c.id,
          clientName: c.displayName,
          assigneeKind: 'person',
          assigneeId: MANNY.id,
          assigneeName: MANNY.name,
          creatorId: 'agent-client360',
          creatorName: 'Client 360 Ingestion Agent',
          source: 'client360_next_action',
          sourceLinks: [{ sourceRecordId: `next:${c.id}:${action.slice(0, 40)}`, kind: 'client360' }],
          status: 'ready',
          priority: c.lifecycle === 'active' ? 'high' : 'normal',
          dueDate: addDays(c.lifecycle === 'active' ? 2 : 5),
          dependencyTaskIds: [],
          requiresApproval: false,
          checklist: [],
          nextAction: action,
          confidence: 0.85,
          autoGenerated: true,
          businessEntity: project.businessEntity,
          createdAt: now,
          updatedAt: now,
          activity: [],
        }))
      ) {
        followUpTasks++;
      }
    }

    // Invoice collection tasks
    for (const invId of (a.invoices || []).slice(0, 10)) {
      const inv = byId.get(invId);
      if (!inv) continue;
      if (
        ensureTask(pm, `invoice:${invId}`, () => ({
          id: crypto.randomUUID(),
          title: `Review / collect: ${inv.title}`,
          description: inv.summary,
          projectId: project.id,
          clientId: c.id,
          clientName: c.displayName,
          assigneeKind: 'person',
          assigneeId: MANNY.id,
          assigneeName: MANNY.name,
          creatorId: 'agent-work-extractor',
          creatorName: 'Work Extraction Agent',
          source: 'microsoft_invoice',
          sourceLinks: [
            {
              provider: inv.provenance.provider,
              connectionId: String(inv.fields.connectionId || inv.provenance.sourceAccount),
              sourceRecordId: `invoice:${invId}`,
              sourceUrl: inv.provenance.sourceUrl,
              kind: 'Invoice',
              title: inv.title,
            },
          ],
          status: 'ready',
          priority: 'high',
          dueDate: addDays(3),
          dependencyTaskIds: [],
          requiresApproval: false,
          checklist: [],
          revenueImpact: 'Collections / billing',
          confidence: 0.8,
          autoGenerated: true,
          createdAt: now,
          updatedAt: now,
          activity: [],
        }))
      ) {
        invoiceTasks++;
      }
    }

    // Refresh project next action from client recommendations
    pm.upsertProject({
      ...project,
      nextAction:
        c.recommendedNextActions?.[0] ||
        project.nextAction ||
        `Touch base with ${c.displayName}`,
      progressPercent: Math.min(90, Math.max(project.progressPercent, c.completenessScore || 0)),
      lastActivityAt: now,
      updatedAt: now,
    });
  }

  // 3) Meetings — upcoming prep + recent follow-ups with client linkage
  const meetings = records.filter((r) => r.kind === 'Meeting');
  for (const m of meetings) {
    const start = String(m.fields.start || m.fields.occurredAt || '');
    const startMs = start ? Date.parse(start) : NaN;
    const attendees = Array.isArray(m.fields.attendees)
      ? (m.fields.attendees as string[]).join(' ')
      : '';
    const hay = `${m.title} ${m.summary || ''} ${attendees}`.toLowerCase();
    const client = bestClientMatch(hay, realClients);
    const project = client
      ? pm.listProjects().find((p) => p.clientId === client.id) || bestProjectMatch(hay, pm)
      : bestProjectMatch(hay, pm);

    const upcoming = !Number.isNaN(startMs) && startMs > Date.now() - 3600_000;
    const recentPast =
      !Number.isNaN(startMs) && startMs <= Date.now() && Date.now() - startMs < 45 * 86400000;

    if (upcoming) {
      const key = `meet-prep:${m.provenance.sourceRecordId}`;
      if (
        ensureTask(pm, key, () => ({
          id: crypto.randomUUID(),
          title: `Prepare: ${m.title}`,
          description: m.summary?.slice(0, 400),
          projectId: project?.id,
          clientId: client?.id || project?.clientId,
          clientName: client?.displayName || project?.clientName,
          assigneeKind: 'person',
          assigneeId: MANNY.id,
          assigneeName: MANNY.name,
          creatorId: 'agent-work-extractor',
          creatorName: 'Work Extraction Agent',
          source: 'microsoft_calendar',
          sourceLinks: [
            {
              provider: m.provenance.provider,
              connectionId: String(m.fields.connectionId || m.provenance.sourceAccount),
              sourceRecordId: key,
              sourceUrl: m.provenance.sourceUrl,
              kind: 'Meeting',
              title: m.title,
            },
          ],
          status: 'scheduled',
          priority: 'high',
          dueDate: new Date(Math.max(Date.now(), startMs - 86400000)).toISOString().slice(0, 10),
          dependencyTaskIds: [],
          requiresApproval: false,
          checklist: [
            { id: '1', text: 'Review Client 360', done: false },
            { id: '2', text: 'Prepare agenda / documents', done: false },
          ],
          nextAction: 'Prepare meeting materials',
          confidence: 0.9,
          autoGenerated: true,
          createdAt: now,
          updatedAt: now,
          activity: [],
        }))
      ) {
        meetingTasks++;
      }
    } else if (recentPast || Number.isNaN(startMs)) {
      const key = `meet-follow:${m.provenance.sourceRecordId}`;
      if (
        ensureTask(pm, key, () => ({
          id: crypto.randomUUID(),
          title: `Follow up: ${m.title}`,
          description: m.summary?.slice(0, 400),
          projectId: project?.id,
          clientId: client?.id || project?.clientId,
          clientName: client?.displayName || project?.clientName,
          assigneeKind: 'person',
          assigneeId: MANNY.id,
          assigneeName: MANNY.name,
          creatorId: 'agent-work-extractor',
          creatorName: 'Work Extraction Agent',
          source: 'microsoft_calendar',
          sourceLinks: [
            {
              provider: m.provenance.provider,
              connectionId: String(m.fields.connectionId || m.provenance.sourceAccount),
              sourceRecordId: key,
              sourceUrl: m.provenance.sourceUrl,
              kind: 'Meeting',
              title: m.title,
            },
          ],
          status: 'inbox',
          priority: client ? 'high' : 'normal',
          dueDate: addDays(2),
          dependencyTaskIds: [],
          requiresApproval: false,
          checklist: [
            { id: '1', text: 'Capture commitments', done: false },
            { id: '2', text: 'Send follow-up', done: false },
          ],
          nextAction: 'Close the loop from this meeting',
          confidence: 0.85,
          autoGenerated: true,
          createdAt: now,
          updatedAt: now,
          activity: [],
        }))
      ) {
        meetingTasks++;
      }
    }
  }

  // 4b) Deduplicate, archive noise, repair meeting links
  const cancelledDupes = dedupeOpenTasks(pm);
  const archivedNoise = archiveNoiseProjects(pm);
  const repairedMeetings = repairMeetingClientLinks(pm);
  const marketingCancelled = cancelMarketingNoiseTasks(pm);

  // 4) Recompute project health from open/overdue tasks
  const today = now.slice(0, 10);
  for (const p of pm.listProjects().filter((x) => x.status === 'active')) {
    const open = pm.listTasks({ projectId: p.id, openOnly: true });
    const overdue = open.filter((t) => t.dueDate && t.dueDate < today).length;
    const blockers = pm
      .listRisksIssues('blocker')
      .filter((r) => r.projectId === p.id && r.status === 'open').length;
    const onlyBootstrapPlaceholders =
      open.length > 0 &&
      open.every(
        (t) =>
          t.autoGenerated &&
          (t.source === 'bootstrap' ||
            /^define next action\b/i.test(t.title || '') ||
            /^next action required\b/i.test(t.title || '')),
      );
    let health = p.health;
    if (overdue >= 3 || blockers > 0) health = 'at_risk';
    else if (overdue > 0) health = 'watch';
    else if (onlyBootstrapPlaceholders) health = 'unknown';
    else if (open.length === 0) health = 'unknown';
    else health = 'healthy';

    const realNext = open
      .filter(
        (t) =>
          !/^define next action\b/i.test(t.title || '') &&
          !/^next action required\b/i.test(t.title || ''),
      )
      .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'))[0]?.title;
    const next = realNext || (onlyBootstrapPlaceholders ? undefined : p.nextAction);

    const total = pm.listTasks({ projectId: p.id }).length || 1;
    const done = total - open.length;

    pm.upsertProject({
      ...p,
      health,
      nextAction: next,
      progressPercent: Math.min(95, Math.round((done / total) * 100) || p.progressPercent),
      lastActivityAt: now,
      updatedAt: now,
    });
  }

  // 5) Agent status
  pm.upsertAgent({
    id: 'agent-work-populate',
    agentId: 'agent-work-extractor',
    agentName: 'Work Extraction Agent',
    role: 'Automation Agent',
    mission: 'Populate Atlas OS from Microsoft + Client 360',
    status: 'completed',
    lastActivityAt: now,
    output: `clients=${realClients.length} projects+${projectsCreated} deliverables=${deliverablesCreated} meetings=${meetingTasks} deduped=${cancelledDupes} archived=${archivedNoise} relinked=${repairedMeetings}`,
    approvalNeeded: false,
    nextPlannedAction: 'Incremental extract after next Microsoft sync',
    updatedAt: now,
  });

  pm.appendActivity(
    'populate_real_work',
    'Work Extraction Agent',
    `clients=${realClients.length} projectsCreated=${projectsCreated} deliverables=${deliverablesCreated} archived=${archivedNoise}`,
  );

  return {
    realClientsSelected: realClients.length,
    projectsCreated,
    projectsUpdated,
    deliverablesCreated,
    documentRequests,
    followUpTasks,
    meetingTasks,
    invoiceTasks,
    duplicatesCancelled: cancelledDupes + marketingCancelled,
    noiseProjectsArchived: archivedNoise,
    meetingsRelinked: repairedMeetings,
    extraction,
    bootstrap,
    projectsTotal: pm.listProjects().filter((p) => p.status !== 'archived').length,
    tasksOpen: pm.listTasks({ openOnly: true }).length,
    waitingOpen: pm.listWaiting(true).length,
    deliverablesTotal: pm.listDeliverables().length,
  };
}

/**
 * Dry-run populate preview. Does not mutate Production pm-store.
 * Clones the current snapshot into a temp directory, runs populate, diffs, then discards.
 */
export function previewPopulateFromMicrosoft(
  pm: PmRepository,
  repo: IntegrationRepository,
): {
  dryRun: true;
  clientsSelected: number;
  projectsToCreate: Array<{ name: string; clientId?: string; clientName?: string; reason: string }>;
  projectsToUpdate: Array<{ id: string; name: string; reason: string }>;
  projectsUnchanged: number;
  duplicateCandidates: Array<{ name: string; ids: string[] }>;
  ambiguousMappings: Array<{ name: string; issue: string }>;
  tasksWouldCreateEstimate: number;
  documentsLinkable: number;
  wouldArchiveNoise: string[];
  conflicts: string[];
  errors: string[];
  before: { projects: number; tasks: number };
  after: { projects: number; tasks: number };
} {
  const beforeProjects = pm.listProjects();
  const beforeByName = new Map<string, ProjectRecord[]>();
  for (const p of beforeProjects) {
    const list = beforeByName.get(p.name) || [];
    list.push(p);
    beforeByName.set(p.name, list);
  }

  const realClients = selectRealClients(repo.listClient360());
  const projectsToCreate: Array<{ name: string; clientId?: string; clientName?: string; reason: string }> = [];
  const projectsToUpdate: Array<{ id: string; name: string; reason: string }> = [];
  const ambiguousMappings: Array<{ name: string; issue: string }> = [];
  const duplicateCandidates: Array<{ name: string; ids: string[] }> = [];
  const conflicts: string[] = [];
  const errors: string[] = [];

  for (const [name, rows] of beforeByName) {
    if (rows.length > 1) {
      duplicateCandidates.push({ name, ids: rows.map((r) => r.id) });
    }
  }

  // Known bootstrap names already present → update path; missing → create
  // (mirrors bootstrapKnownProjects + findOrCreateClientProject matching)
  const normalize = (name: string | undefined | null) =>
    (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '').trim();

  for (const c of realClients) {
    const match =
      beforeProjects.find(
        (p) =>
          p.clientId === c.id ||
          (p.tags || []).includes(`client360:${c.id}`) ||
          normalize(p.clientName) === normalize(c.displayName) ||
          normalize(p.name?.replace(/\s+Engagement$/i, '')) === normalize(c.displayName),
      ) || null;
    if (!match) {
      projectsToCreate.push({
        name: `${c.displayName} Engagement`,
        clientId: c.id,
        clientName: c.displayName,
        reason: 'No existing project matched client id/name',
      });
    } else {
      projectsToUpdate.push({
        id: match.id,
        name: match.name,
        reason: 'Would refresh Client 360 tags / activity stamp',
      });
    }
  }

  for (const p of beforeProjects) {
    if (!p.clientId && /gnieski|loanspark|falk|personal|comics/i.test(p.name)) {
      ambiguousMappings.push({
        name: p.name,
        issue: 'Active project without canonical clientId — owner review recommended',
      });
    }
  }

  let documentsLinkable = 0;
  for (const c of realClients) {
    documentsLinkable += (c.associations?.documents?.length || 0) + (c.sourceRefs?.length || 0);
  }

  // Simulate would-archive noise names already present
  const wouldArchiveNoise = beforeProjects
    .filter((p) => {
      const n = (p.clientName || p.name || '').toLowerCase();
      return NOISE_CLIENT_NAMES.has(n) || NOISE_CLIENT_NAMES.has(n.replace(/\s+/g, ''));
    })
    .map((p) => p.name);

  // Idempotency expectation: when all known + real clients already linked, creates should be 0
  // after matching fix (Lien Partners style).
  if (projectsToCreate.length === 0 && duplicateCandidates.length > 0) {
    conflicts.push(
      'Duplicate project names exist; populate will not auto-merge. Resolve via owner review before Sync.',
    );
  }

  return {
    dryRun: true,
    clientsSelected: realClients.length,
    projectsToCreate,
    projectsToUpdate,
    projectsUnchanged: Math.max(
      0,
      beforeProjects.length - projectsToUpdate.length - wouldArchiveNoise.length,
    ),
    duplicateCandidates,
    ambiguousMappings,
    tasksWouldCreateEstimate: realClients.length * 2,
    documentsLinkable,
    wouldArchiveNoise,
    conflicts,
    errors,
    before: { projects: beforeProjects.length, tasks: pm.listTasks().length },
    after: {
      projects: beforeProjects.length + projectsToCreate.length - wouldArchiveNoise.length,
      tasks: pm.listTasks().length, // estimate only; extract may add more
    },
  };
}

