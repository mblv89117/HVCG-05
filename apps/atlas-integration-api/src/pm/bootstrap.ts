/**
 * Bootstrap known initiatives + extract actionable work from Microsoft / Client 360.
 */

import type { IntegrationRepository } from '../store/repository.ts';
import type { PmRepository } from './repository.ts';
import type {
  CommitmentRecord,
  DecisionRecord,
  InboxItemRecord,
  MilestoneRecord,
  ProjectRecord,
  ProjectType,
  RiskIssueRecord,
  TaskPriority,
  TaskRecord,
  WaitingItemRecord,
} from './types.ts';

const MANNY = {
  id: 'person-manny',
  name: 'Manny Barela',
};

const KNOWN_PROJECTS: Array<{
  name: string;
  clientName: string;
  businessEntity: string;
  projectType: ProjectType;
  priority: TaskPriority;
  objective: string;
  searchKeys: string[];
}> = [
  {
    name: 'ACCG Inc. Engagement',
    clientName: 'ACCG Inc.',
    businessEntity: 'HVS',
    projectType: 'fractional_cfo',
    priority: 'high',
    objective: 'Fractional CFO / cash-flow advisory for ACCG',
    searchKeys: ['accg', 'accg-inc'],
  },
  {
    name: 'Prodigy Games LLC',
    clientName: 'Prodigy Games LLC',
    businessEntity: 'HVS',
    projectType: 'client_engagement',
    priority: 'high',
    objective: 'Client engagement and advisory for Prodigy Games',
    searchKeys: ['prodigy'],
  },
  {
    name: "That's Kava LLC",
    clientName: "That's Kava LLC",
    businessEntity: 'HVS',
    projectType: 'client_engagement',
    priority: 'normal',
    objective: 'Client engagement for That’s Kava',
    searchKeys: ['kava'],
  },
  {
    name: "Christie's Place LLC",
    clientName: "Christie's Place LLC",
    businessEntity: 'HVS',
    projectType: 'client_engagement',
    priority: 'normal',
    objective: 'Client engagement for Christie’s Place',
    searchKeys: ['christie'],
  },
  {
    name: 'Falk PHL Hardship & Cash Surrender',
    clientName: 'Falk',
    businessEntity: 'HVS',
    projectType: 'client_engagement',
    priority: 'critical',
    objective: 'Hardship and cash-surrender matter for Falk PHL',
    searchKeys: ['falk'],
  },
  {
    name: 'Hart Family Dental',
    clientName: 'Hart Family Dental',
    businessEntity: 'HVS',
    projectType: 'capital_advisory',
    priority: 'high',
    objective: 'Capital advisory for Hart Family Dental',
    searchKeys: ['hart', 'dental'],
  },
  {
    name: 'Colorado Beef SBA Express',
    clientName: 'Colorado Craft Beef',
    businessEntity: 'HVCG',
    projectType: 'funding_request',
    priority: 'critical',
    objective: 'SBA Express funding request for Colorado Beef',
    searchKeys: ['colorado', 'beef', 'ccb', 'sba'],
  },
  {
    name: 'Project Atlas',
    clientName: 'High Value Capital Group',
    businessEntity: 'HVCG',
    projectType: 'strategic_initiative',
    priority: 'critical',
    objective: 'Build Atlas as the HVCG/HVS operating system and PM platform',
    searchKeys: ['atlas', 'project atlas'],
  },
  {
    name: 'Growth Command Center',
    clientName: 'High Value Capital Group',
    businessEntity: 'HVCG',
    projectType: 'strategic_initiative',
    priority: 'high',
    objective: 'Growth Command Center for pipeline and client acquisition',
    searchKeys: ['growth command'],
  },
  {
    name: 'Enterprise Value Assessment',
    clientName: 'High Value Capital Group',
    businessEntity: 'HVCG',
    projectType: 'strategic_initiative',
    priority: 'high',
    objective: 'Enterprise value assessment offering and tooling',
    searchKeys: ['enterprise value'],
  },
  {
    name: 'Agent Copilot',
    clientName: 'High Value Capital Group',
    businessEntity: 'HVCG',
    projectType: 'ai_implementation',
    priority: 'high',
    objective: 'Agent Copilot for HVCG operations',
    searchKeys: ['copilot', 'agent'],
  },
  {
    name: 'HVCG Website',
    clientName: 'High Value Capital Group',
    businessEntity: 'HVCG',
    projectType: 'website',
    priority: 'normal',
    objective: 'HVCG public website',
    searchKeys: ['website', 'hvcg site'],
  },
  {
    name: 'HVCG Autonomous Marketing',
    clientName: 'High Value Capital Group',
    businessEntity: 'HVCG',
    projectType: 'marketing',
    priority: 'normal',
    objective: 'Autonomous marketing systems for HVCG',
    searchKeys: ['marketing', 'autonomous'],
  },
  {
    name: 'Personal Gmail Archive',
    clientName: 'Personal',
    businessEntity: 'personal_business',
    projectType: 'personal_owner_task',
    priority: 'low',
    objective: 'Archive and organize personal Gmail',
    searchKeys: ['gmail archive'],
  },
  {
    name: 'Comics Identification App',
    clientName: 'Personal',
    businessEntity: 'personal_business',
    projectType: 'product_development',
    priority: 'someday',
    objective: 'Comics identification product',
    searchKeys: ['comics'],
  },
  {
    name: 'HVCG Internal Operations',
    clientName: 'High Value Capital Group',
    businessEntity: 'HVCG',
    projectType: 'internal_operations',
    priority: 'high',
    objective: 'Internal operating cadence, SOPs, and tooling',
    searchKeys: ['internal operations', 'ops'],
  },
  {
    name: 'HVCG Client Acquisition',
    clientName: 'High Value Capital Group',
    businessEntity: 'HVCG',
    projectType: 'sales',
    priority: 'high',
    objective: 'Client acquisition pipeline and conversion',
    searchKeys: ['acquisition', 'pipeline'],
  },
  {
    name: 'HVCG AI Implementation Services',
    clientName: 'High Value Capital Group',
    businessEntity: 'HVCG',
    projectType: 'ai_implementation',
    priority: 'high',
    objective: 'Package and deliver AI implementation services',
    searchKeys: ['ai implementation', 'ai services'],
  },
  {
    name: 'Lien Partners Engagement',
    clientName: 'Lienpartners',
    businessEntity: 'HVS',
    projectType: 'client_engagement',
    priority: 'high',
    objective: 'Active engagement — high email/meeting volume in Client 360',
    searchKeys: ['lienpartner', 'lien partners'],
  },
  {
    name: 'Gnieski Engagement',
    clientName: 'Gnieski',
    businessEntity: 'HVS',
    projectType: 'client_engagement',
    priority: 'high',
    objective: 'Active engagement from Microsoft communications',
    searchKeys: ['gnieski'],
  },
  {
    name: 'LoanSpark Engagement',
    clientName: 'Loanspark',
    businessEntity: 'HVS',
    projectType: 'capital_advisory',
    priority: 'normal',
    objective: 'Capital / lending related engagement',
    searchKeys: ['loanspark'],
  },
];

function nowIso() {
  return new Date().toISOString();
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function matchClientId(
  clientName: string,
  clients: Array<{ id: string; displayName: string; domains: string[] }>,
): string | undefined {
  const n = clientName.toLowerCase();
  const hit = clients.find(
    (c) =>
      c.displayName.toLowerCase().includes(n) ||
      n.includes(c.displayName.toLowerCase()) ||
      c.domains.some((d) => n.includes(d.split('.')[0])),
  );
  return hit?.id;
}

export function bootstrapKnownProjects(
  pm: PmRepository,
  clients: Array<{ id: string; displayName: string; domains: string[]; completenessScore?: number }>,
): { created: number; updated: number } {
  let created = 0;
  let updated = 0;
  const now = nowIso();

  for (const kp of KNOWN_PROJECTS) {
    const existing = pm.findProjectByName(kp.name);
    const clientId = matchClientId(kp.clientName, clients);
    if (existing) {
      pm.upsertProject({
        ...existing,
        clientId: existing.clientId || clientId,
        clientName: existing.clientName || kp.clientName,
        updatedAt: now,
        lastActivityAt: now,
      });
      updated++;
      continue;
    }
    const id = crypto.randomUUID();
    const project: ProjectRecord = {
      id,
      name: kp.name,
      clientId,
      clientName: kp.clientName,
      businessEntity: kp.businessEntity,
      projectType: kp.projectType,
      description: kp.objective,
      objective: kp.objective,
      ownerId: MANNY.id,
      ownerName: MANNY.name,
      teamMemberIds: [MANNY.id],
      startDate: addDays(-30),
      targetCompletionDate: addDays(60),
      currentPhase: 'Active',
      status: 'active',
      priority: kp.priority,
      health: kp.priority === 'critical' ? 'watch' : 'healthy',
      progressPercent: 15,
      nextAction: `Review status and set next milestone for ${kp.name}`,
      sourceLinks: [],
      tags: kp.searchKeys,
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
    };
    pm.upsertProject(project);

    const milestones: MilestoneRecord[] = [
      {
        id: crypto.randomUUID(),
        projectId: id,
        title: 'Scope confirmed',
        dueDate: addDays(7),
        status: 'pending',
        order: 1,
      },
      {
        id: crypto.randomUUID(),
        projectId: id,
        title: 'Next deliverable',
        dueDate: addDays(21),
        status: 'pending',
        order: 2,
      },
    ];
    for (const m of milestones) pm.upsertMilestone(m);

    // Seed an owner next-action task per project
    const task: TaskRecord = {
      id: crypto.randomUUID(),
      title: `Define next action — ${kp.name}`,
      description: `Confirm current phase, blockers, and the single next action for ${kp.name}.`,
      projectId: id,
      clientId,
      clientName: kp.clientName,
      assigneeKind: 'person',
      assigneeId: MANNY.id,
      assigneeName: MANNY.name,
      creatorId: 'agent-atlas',
      creatorName: 'Atlas OS Agent',
      source: 'bootstrap',
      sourceLinks: [],
      status: 'ready',
      priority: kp.priority,
      dueDate: addDays(2),
      dependencyTaskIds: [],
      requiresApproval: false,
      checklist: [],
      nextAction: 'Open project and set milestone owners',
      confidence: 0.9,
      autoGenerated: true,
      businessEntity: kp.businessEntity,
      createdAt: now,
      updatedAt: now,
      activity: [
        {
          id: crypto.randomUUID(),
          at: now,
          actor: 'Atlas OS Agent',
          action: 'created',
          detail: 'Seeded from known initiatives list',
        },
      ],
    };
    pm.upsertTask(task);
    created++;
  }

  // Owner OS meta-tasks
  const metaTasks = [
    {
      title: 'Run Atlas Daily Command Center every morning',
      priority: 'critical' as TaskPriority,
      dueDate: addDays(0),
    },
    {
      title: 'Clear owner approvals queue',
      priority: 'high' as TaskPriority,
      dueDate: addDays(1),
    },
    {
      title: 'Review clients needing follow-up from Client 360',
      priority: 'high' as TaskPriority,
      dueDate: addDays(1),
    },
  ];
  for (const mt of metaTasks) {
    if (pm.listTasks().some((t) => t.title === mt.title && t.status !== 'completed')) continue;
    pm.upsertTask({
      id: crypto.randomUUID(),
      title: mt.title,
      projectId: pm.findProjectByName('Project Atlas')?.id,
      clientName: 'High Value Capital Group',
      assigneeKind: 'person',
      assigneeId: MANNY.id,
      assigneeName: MANNY.name,
      creatorId: 'agent-atlas',
      creatorName: 'Atlas OS Agent',
      source: 'bootstrap',
      sourceLinks: [],
      status: 'ready',
      priority: mt.priority,
      dueDate: mt.dueDate,
      dependencyTaskIds: [],
      requiresApproval: false,
      checklist: [],
      confidence: 1,
      autoGenerated: true,
      businessEntity: 'HVCG',
      createdAt: now,
      updatedAt: now,
      activity: [],
    });
  }

  pm.patch((d) => {
    d.lastBootstrapAt = now;
  });
  pm.appendActivity('bootstrap_known_projects', 'Atlas OS Agent', `${created} created, ${updated} updated`);
  return { created, updated };
}

const DUE_PATTERNS = [
  /\bby\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  /\bby\s+friday\b/i,
  /\bdue\s+(on\s+)?(\d{1,2}\/\d{1,2}|\d{4}-\d{2}-\d{2})\b/i,
  /\bplease\s+(send|provide|review|confirm|sign|complete)\b/i,
  /\bneed(s)?\s+(this|you)\s+to\b/i,
  /\bfollow\s*up\b/i,
  /\bwaiting\s+(on|for)\b/i,
  /\bcan you\b/i,
  /\blet me know\b/i,
  /\basap\b/i,
  /\burgent\b/i,
];

const COMMITMENT_PATTERNS = [
  /\bi co(mmit|nfirm)\b/i,
  /\bi will\s+(send|provide|deliver|call|review)\b/i,
  /\bwe will\s+(send|provide|deliver)\b/i,
  /\bi'?ll\s+(send|get|provide|follow)\b/i,
  /\bpromised?\b/i,
];

const WAITING_PATTERNS = [
  /\bplease\s+send\b/i,
  /\bwaiting\s+(on|for)\b/i,
  /\bwhen you (can|have)\b/i,
  /\bneed(ed)?\s+from you\b/i,
  /\bsend (me |us )?(the |your )?/i,
];

function parseDueHint(text: string): string | undefined {
  const lower = text.toLowerCase();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < days.length; i++) {
    if (lower.includes(`by ${days[i]}`) || lower.includes(`due ${days[i]}`)) {
      const today = new Date().getDay();
      let delta = i - today;
      if (delta <= 0) delta += 7;
      return addDays(delta);
    }
  }
  if (/\basap\b|\burgent\b|\btoday\b/i.test(text)) return addDays(0);
  if (/\btomorrow\b/i.test(text)) return addDays(1);
  if (/\bthis week\b/i.test(text)) return addDays(5);
  return undefined;
}

export function extractWorkFromSources(
  pm: PmRepository,
  integration: IntegrationRepository,
): {
  tasksCreated: number;
  commitmentsCreated: number;
  waitingCreated: number;
  inboxCreated: number;
  decisionsCreated: number;
  risksCreated: number;
} {
  const now = nowIso();
  const clients = integration.listClient360().map((c) => ({
    id: c.id,
    displayName: c.displayName,
    domains: c.domains || [],
    completenessScore: c.completenessScore,
  }));
  const projects = pm.listProjects();
  const records = integration.listAllSourceRecords(50_000);

  let tasksCreated = 0;
  let commitmentsCreated = 0;
  let waitingCreated = 0;
  let inboxCreated = 0;
  let decisionsCreated = 0;
  let risksCreated = 0;

  const emailRecords = records.filter((r) => r.kind === 'Email').slice(0, 4000);
  const meetingRecords = records.filter((r) => r.kind === 'Meeting').slice(0, 500);

  const findProjectForText = (text: string, clientName?: string) => {
    const hay = `${text} ${clientName || ''}`.toLowerCase();
    for (const p of projects) {
      if (p.tags?.some((t) => hay.includes(t.toLowerCase()))) return p;
      if (p.clientName && hay.includes(p.clientName.toLowerCase())) return p;
      if (hay.includes(p.name.toLowerCase().slice(0, 12))) return p;
    }
    return undefined;
  };

  const findClientForText = (text: string) => {
    const hay = text.toLowerCase();
    return clients.find(
      (c) =>
        hay.includes(c.displayName.toLowerCase()) ||
        c.domains.some((d) => hay.includes(d) || hay.includes(d.split('.')[0])),
    );
  };

  for (const r of emailRecords) {
    const title = r.title || '';
    const summary = r.summary || '';
    const text = `${title} ${summary}`;
    if (text.length < 12) continue;
    if (pm.findTaskBySource(r.provenance.sourceRecordId)) continue;

    const actionable = DUE_PATTERNS.some((p) => p.test(text));
    const isCommitment = COMMITMENT_PATTERNS.some((p) => p.test(text));
    const isWaiting = WAITING_PATTERNS.some((p) => p.test(text));
    if (!actionable && !isCommitment && !isWaiting) continue;

    const client = findClientForText(text);
    const project = findProjectForText(text, client?.displayName);
    const dueDate = parseDueHint(text);
    const sourceLink = {
      provider: r.provenance.provider,
      connectionId: String(r.fields.connectionId || r.provenance.sourceAccount),
      sourceRecordId: r.provenance.sourceRecordId,
      sourceUrl: r.provenance.sourceUrl,
      kind: r.kind,
      title: r.title,
    };

    const confidence = actionable && dueDate ? 0.85 : actionable ? 0.7 : 0.55;

    if (confidence >= 0.7 && actionable) {
      const priority: TaskPriority = /\burgent|asap|critical\b/i.test(text)
        ? 'critical'
        : /\bplease|need|by friday\b/i.test(text)
          ? 'high'
          : 'normal';
      const task: TaskRecord = {
        id: crypto.randomUUID(),
        title: title.slice(0, 140) || 'Follow up from email',
        description: summary.slice(0, 500),
        projectId: project?.id,
        clientId: client?.id || project?.clientId,
        clientName: client?.displayName || project?.clientName,
        assigneeKind: 'person',
        assigneeId: MANNY.id,
        assigneeName: MANNY.name,
        creatorId: 'agent-work-extractor',
        creatorName: 'Work Extraction Agent',
        source: 'microsoft_email',
        sourceLinks: [sourceLink],
        status: 'inbox',
        priority,
        dueDate: dueDate || addDays(3),
        dependencyTaskIds: [],
        requiresApproval: false,
        checklist: [],
        nextAction: 'Review email and confirm action',
        confidence,
        autoGenerated: true,
        businessEntity: project?.businessEntity || String(r.fields.businessEntity || 'unknown'),
        createdAt: now,
        updatedAt: now,
        activity: [
          {
            id: crypto.randomUUID(),
            at: now,
            actor: 'Work Extraction Agent',
            action: 'extracted',
            detail: 'Auto-created from Outlook email',
          },
        ],
      };
      pm.upsertTask(task);
      tasksCreated++;
    } else if (actionable || isWaiting || isCommitment) {
      const inbox: InboxItemRecord = {
        id: crypto.randomUUID(),
        title: title.slice(0, 140),
        summary: summary.slice(0, 300),
        classification: isCommitment ? 'decision' : isWaiting ? 'waiting_item' : 'task',
        confidence,
        status: 'pending',
        clientId: client?.id,
        clientName: client?.displayName,
        projectId: project?.id,
        sourceLinks: [sourceLink],
        suggestedAction: isWaiting
          ? 'Create waiting item and follow-up'
          : isCommitment
            ? 'Log commitment'
            : 'Create task',
        createdAt: now,
        updatedAt: now,
      };
      pm.upsertInbox(inbox);
      inboxCreated++;
    }

    if (isCommitment && confidence >= 0.55) {
      const commitment: CommitmentRecord = {
        id: crypto.randomUUID(),
        description: title.slice(0, 200),
        madeById: MANNY.id,
        madeByName: MANNY.name,
        madeToName: client?.displayName || 'Client',
        dateMade: (r.fields.occurredAt as string) || now.slice(0, 10),
        dueDate: dueDate || addDays(7),
        clientId: client?.id,
        clientName: client?.displayName,
        projectId: project?.id,
        sourceLinks: [sourceLink],
        status: 'open',
        ownerId: MANNY.id,
        ownerName: MANNY.name,
        riskIfMissed: 'Client trust / delivery risk',
        createdAt: now,
        updatedAt: now,
      };
      // Deduplicate by description+client
      const exists = pm
        .listCommitments()
        .some(
          (c) =>
            c.description === commitment.description && c.clientName === commitment.clientName,
        );
      if (!exists) {
        pm.upsertCommitment(commitment);
        commitmentsCreated++;
      }
    }

    if (isWaiting && confidence >= 0.55) {
      const waiting: WaitingItemRecord = {
        id: crypto.randomUUID(),
        whatIsNeeded: title.slice(0, 200),
        owedByName: client?.displayName || 'External party',
        dateRequested: now.slice(0, 10),
        dueDate: dueDate || addDays(5),
        nextFollowUpDate: addDays(2),
        clientId: client?.id,
        clientName: client?.displayName,
        projectId: project?.id,
        escalationLevel: 0,
        sourceLinks: [sourceLink],
        status: 'open',
        createdAt: now,
        updatedAt: now,
      };
      const exists = pm
        .listWaiting()
        .some((w) => w.whatIsNeeded === waiting.whatIsNeeded && w.clientName === waiting.clientName);
      if (!exists) {
        pm.upsertWaiting(waiting);
        waitingCreated++;
      }
    }
  }

  // Meeting prep + follow-up tasks
  for (const m of meetingRecords) {
    if (pm.findTaskBySource(`${m.provenance.sourceRecordId}::followup`)) continue;
    const start = typeof m.fields.start === 'string' ? m.fields.start : m.fields.occurredAt;
    const client = findClientForText(`${m.title} ${m.summary || ''}`);
    const project = findProjectForText(`${m.title}`, client?.displayName);
    const sourceLink = {
      provider: m.provenance.provider,
      connectionId: String(m.fields.connectionId || m.provenance.sourceAccount),
      sourceRecordId: `${m.provenance.sourceRecordId}::followup`,
      sourceUrl: m.provenance.sourceUrl,
      kind: m.kind,
      title: m.title,
    };
    const startMs = start ? Date.parse(String(start)) : NaN;
    const upcoming = !Number.isNaN(startMs) && startMs > Date.now();
    pm.upsertTask({
      id: crypto.randomUUID(),
      title: upcoming ? `Prepare for meeting: ${m.title}` : `Follow up: ${m.title}`,
      description: m.summary?.slice(0, 400),
      projectId: project?.id,
      clientId: client?.id,
      clientName: client?.displayName || project?.clientName,
      assigneeKind: 'person',
      assigneeId: MANNY.id,
      assigneeName: MANNY.name,
      creatorId: 'agent-work-extractor',
      creatorName: 'Work Extraction Agent',
      source: 'microsoft_calendar',
      sourceLinks: [sourceLink],
      status: upcoming ? 'scheduled' : 'inbox',
      priority: 'high',
      dueDate: upcoming
        ? new Date(startMs - 86400000).toISOString().slice(0, 10)
        : addDays(1),
      dependencyTaskIds: [],
      requiresApproval: false,
      checklist: upcoming
        ? [
            { id: '1', text: 'Review Client 360', done: false },
            { id: '2', text: 'Prepare agenda', done: false },
          ]
        : [
            { id: '1', text: 'Capture commitments', done: false },
            { id: '2', text: 'Send follow-up notes', done: false },
          ],
      confidence: 0.8,
      autoGenerated: true,
      createdAt: now,
      updatedAt: now,
      activity: [],
    });
    tasksCreated++;
  }

  // Client 360 completeness → follow-up / missing docs
  for (const c of clients) {
    if ((c.completenessScore || 0) >= 50) continue;
    const project = projects.find(
      (p) =>
        p.clientId === c.id ||
        (p.clientName && c.displayName.toLowerCase().includes(p.clientName.toLowerCase())),
    );
    const title = `Improve Client 360 completeness — ${c.displayName}`;
    if (pm.listTasks().some((t) => t.title === title && t.status !== 'completed')) continue;
    pm.upsertTask({
      id: crypto.randomUUID(),
      title,
      description: `Completeness ${c.completenessScore ?? 0}%. Fill missing contacts, documents, and agreements.`,
      projectId: project?.id,
      clientId: c.id,
      clientName: c.displayName,
      assigneeKind: 'person',
      assigneeId: MANNY.id,
      assigneeName: MANNY.name,
      creatorId: 'agent-client360',
      creatorName: 'Client 360 Ingestion Agent',
      source: 'client360',
      sourceLinks: [],
      status: 'ready',
      priority: 'normal',
      dueDate: addDays(7),
      dependencyTaskIds: [],
      requiresApproval: false,
      checklist: [],
      confidence: 0.75,
      autoGenerated: true,
      createdAt: now,
      updatedAt: now,
      activity: [],
    });
    tasksCreated++;
  }

  // Projects with no next action → risk
  for (const p of projects.filter((x) => x.status === 'active' && !x.nextAction)) {
    const exists = pm
      .listRisksIssues('blocker')
      .some((r) => r.projectId === p.id && r.description.includes('no next action'));
    if (exists) continue;
    const risk: RiskIssueRecord = {
      id: crypto.randomUUID(),
      kind: 'blocker',
      description: `${p.name} has no next action defined`,
      severity: 'medium',
      ownerId: MANNY.id,
      ownerName: MANNY.name,
      projectId: p.id,
      clientId: p.clientId,
      clientName: p.clientName,
      status: 'open',
      ownerDecisionRequired: true,
      mitigationPlan: 'Owner defines the single next action',
      createdAt: now,
      updatedAt: now,
    };
    pm.upsertRiskIssue(risk);
    risksCreated++;
  }

  // Open owner decisions from incomplete critical projects
  for (const p of projects.filter((x) => x.priority === 'critical' && x.status === 'active')) {
    const title = `Owner decision: priority path for ${p.name}`;
    if (pm.listDecisions().some((d) => d.title === title && d.status === 'open')) continue;
    const decision: DecisionRecord = {
      id: crypto.randomUUID(),
      title,
      decision: 'Pending',
      date: now.slice(0, 10),
      ownerId: MANNY.id,
      ownerName: MANNY.name,
      context: p.objective || p.description,
      clientId: p.clientId,
      clientName: p.clientName,
      projectId: p.id,
      sourceLinks: [],
      status: 'open',
      followUpAction: 'Choose next milestone and assignee',
      createdAt: now,
      updatedAt: now,
    };
    pm.upsertDecision(decision);
    decisionsCreated++;
  }

  // Update agent activity
  pm.upsertAgent({
    id: 'agent-work-work-extractor',
    agentId: 'agent-work-extractor',
    agentName: 'Work Extraction Agent',
    role: 'Automation Agent',
    mission: 'Extract tasks, commitments, waiting items from Microsoft',
    status: 'completed',
    lastActivityAt: now,
    output: `tasks=${tasksCreated} commitments=${commitmentsCreated} waiting=${waitingCreated} inbox=${inboxCreated}`,
    approvalNeeded: false,
    nextPlannedAction: 'Incremental extract on next sync',
    updatedAt: now,
  });

  pm.patch((d) => {
    d.lastExtractionAt = now;
  });
  pm.appendActivity(
    'extract_work',
    'Work Extraction Agent',
    `tasks=${tasksCreated} commitments=${commitmentsCreated} waiting=${waitingCreated}`,
  );

  return {
    tasksCreated,
    commitmentsCreated,
    waitingCreated,
    inboxCreated,
    decisionsCreated,
    risksCreated,
  };
}
