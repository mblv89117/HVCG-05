import type { IntegrationRepository } from '../store/repository.ts';
import type { PmRepository } from './repository.ts';
import type {
  CommandCenterPayload,
  MyWorkPayload,
  TaskRecord,
  WeeklyCeoReview,
} from './types.ts';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function startOfWeek() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

function endOfWeek() {
  const d = new Date(startOfWeek());
  d.setDate(d.getDate() + 6);
  return d.toISOString().slice(0, 10);
}

function isOpen(t: TaskRecord) {
  return !['completed', 'cancelled'].includes(t.status);
}

function priorityRank(p: string) {
  return { critical: 0, high: 1, normal: 2, low: 3, someday: 4 }[p] ?? 5;
}

export function buildCommandCenter(
  pm: PmRepository,
  integration: IntegrationRepository,
): CommandCenterPayload {
  const today = todayStr();
  const tasks = pm.listTasks();
  const openTasks = tasks.filter(isOpen);
  const overdue = openTasks.filter((t) => t.dueDate && t.dueDate < today);
  const dueToday = openTasks.filter(
    (t) =>
      t.dueDate === today &&
      !/security remediation|unsubscribe|newsletter|marketing tip/i.test(t.title),
  );
  const projects = pm.listProjects().filter((p) => p.status === 'active');
  const atRiskProjects = projects.filter(
    (p) => p.health === 'at_risk' || p.health === 'critical' || p.health === 'watch',
  );
  const waiting = pm.listWaiting(true);
  const commitments = pm.listCommitments(true);
  const decisions = pm.listDecisions().filter((d) => d.status === 'open');
  const clients = integration.listClient360();
  const meetings = integration
    .listAllSourceRecords(20_000)
    .filter((r) => r.kind === 'Meeting')
    .map((r) => ({
      id: r.id,
      title: r.title,
      at: String(r.fields.start || r.fields.occurredAt || ''),
      clientName: undefined as string | undefined,
    }))
    .filter((m) => m.at && Date.parse(m.at) >= Date.now() - 86400000)
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(0, 12);

  const ownerApprovals = openTasks
    .filter((t) => t.status === 'needs_owner_approval' || t.requiresApproval)
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));

  const topPriorities = [...openTasks]
    .filter((t) => t.assigneeId === 'person-manny' || !t.assigneeId)
    .filter((t) => !/^Run Atlas Daily Command Center/i.test(t.title))
    .sort((a, b) => {
      // Prefer client-linked operating work over generic inbox noise
      const score = (t: TaskRecord) => {
        let s = 0;
        if (t.clientId || t.clientName) s += 10;
        if (t.projectId) s += 5;
        if (t.priority === 'critical') s += 20;
        if (t.priority === 'high') s += 10;
        if (t.dueDate && t.dueDate <= today) s += 15;
        if (t.source === 'client360_next_action' || t.source === 'client360_missing') s += 8;
        if (t.source === 'microsoft_calendar') s += 6;
        if (/security remediation|unsubscribe|newsletter/i.test(t.title)) s -= 20;
        return s;
      };
      const diff = score(b) - score(a);
      if (diff !== 0) return diff;
      const pr = priorityRank(a.priority) - priorityRank(b.priority);
      if (pr !== 0) return pr;
      return (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
    })
    .slice(0, 3);

  const criticalAlerts = [
    ...overdue.slice(0, 5).map((t) => ({
      id: t.id,
      severity: 'critical',
      title: `Overdue: ${t.title}`,
      href: `/my-work`,
    })),
    ...atRiskProjects.slice(0, 5).map((p) => ({
      id: p.id,
      severity: p.health === 'critical' ? 'critical' : 'high',
      title: `Project ${p.health}: ${p.name}`,
      href: `/projects/${p.id}`,
    })),
    ...pm
      .listRisksIssues()
      .filter((r) => r.status === 'open' && (r.severity === 'critical' || r.severity === 'high'))
      .slice(0, 5)
      .map((r) => ({
        id: r.id,
        severity: r.severity,
        title: `${r.kind}: ${r.description}`,
        href: '/portfolio',
      })),
  ];

  const team = pm.listTeam().filter((t) => t.kind === 'person' && t.active);
  const teamWorkload = team.map((member) => {
    const mine = openTasks.filter((t) => t.assigneeId === member.id);
    return {
      id: member.id,
      name: member.name,
      openTasks: mine.length,
      overdue: mine.filter((t) => t.dueDate && t.dueDate < today).length,
      blocked: mine.filter((t) => t.status === 'blocked').length,
    };
  });

  const clientAttention = {
    atRisk: clients
      .filter((c) => (c.completenessScore || 0) < 40 || c.confidence === 'review')
      .slice(0, 10)
      .map((c) => ({
        id: c.id,
        name: c.displayName,
        reason:
          c.confidence === 'review'
            ? 'Needs entity-resolution review'
            : `Completeness ${c.completenessScore ?? 0}%`,
      })),
    waitingOnUs: waiting.filter((w) => /hvcg|hvs|manny|we\b/i.test(w.owedByName)).slice(0, 10),
    waitingOnClient: waiting
      .filter((w) => !/hvcg|hvs|manny|we\b/i.test(w.owedByName))
      .slice(0, 10),
    upcomingDeadlines: openTasks
      .filter((t) => t.dueDate && t.dueDate >= today && t.dueDate <= endOfWeek())
      .slice(0, 15),
    outstandingDeliverables: pm
      .listDeliverables()
      .filter((d) => !['delivered', 'accepted'].includes(d.status))
      .slice(0, 10),
    opportunities: clients
      .filter((c) => c.lifecycle === 'prospect')
      .slice(0, 8)
      .map((c) => ({
        id: c.id,
        name: c.displayName,
        detail: c.recommendedNextActions?.[0] || 'Prospect — recommend next contact',
      })),
  };

  const lackingNextAction = projects.filter((p) => !p.nextAction);
  const noRecent = projects.filter((p) => {
    if (!p.lastActivityAt) return true;
    return Date.now() - Date.parse(p.lastActivityAt) > 14 * 86400000;
  });

  return {
    generatedAt: new Date().toISOString(),
    date: today,
    businessHealth: {
      activeProjects: projects.length,
      atRiskProjects: atRiskProjects.length,
      openTasks: openTasks.length,
      overdueTasks: overdue.length,
      waitingItems: waiting.length,
      openCommitments: commitments.length,
      decisionsNeeded: decisions.length,
      clientsNeedingAttention: clientAttention.atRisk.length,
      avgClientCompleteness:
        clients.length === 0
          ? undefined
          : Math.round(
              clients.reduce((s, c) => s + (c.completenessScore || 0), 0) / clients.length,
            ),
    },
    criticalAlerts: criticalAlerts.slice(0, 12),
    ownerApprovals,
    topPriorities,
    myDay: {
      meetings,
      criticalTasks: openTasks.filter((t) => t.priority === 'critical').slice(0, 10),
      dueToday,
      overdue,
      waitingFollowUps: waiting
        .filter((w) => w.nextFollowUpDate && w.nextFollowUpDate <= today)
        .slice(0, 10),
      decisionsNeeded: decisions.slice(0, 10),
    },
    clientAttention,
    teamAndAgents: {
      teamWorkload,
      agentActivity: pm.listAgents(),
      lateTasks: overdue.slice(0, 15),
      approvalRequests: ownerApprovals,
    },
    projects: {
      atRisk: atRiskProjects.slice(0, 10),
      upcomingMilestones: pm
        .listMilestones()
        .filter((m) => m.status !== 'completed' && m.dueDate)
        .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
        .slice(0, 10),
      noRecentActivity: noRecent.slice(0, 10),
      lackingNextAction: lackingNextAction.slice(0, 10),
    },
    weeklyCeoReview: buildWeeklyCeoReview(pm, integration),
  };
}

export function buildMyWork(pm: PmRepository, ownerId = 'person-manny'): MyWorkPayload {
  const today = todayStr();
  const weekEnd = endOfWeek();
  const tasks = pm.listTasks().filter((t) => !t.assigneeId || t.assigneeId === ownerId);
  const open = tasks.filter(isOpen);
  const sortDue = (a: TaskRecord, b: TaskRecord) =>
    (a.dueDate || '9999').localeCompare(b.dueDate || '9999');

  return {
    today: open.filter((t) => t.dueDate === today).sort(sortDue),
    overdue: open.filter((t) => t.dueDate && t.dueDate < today).sort(sortDue),
    dueThisWeek: open
      .filter((t) => t.dueDate && t.dueDate > today && t.dueDate <= weekEnd)
      .sort(sortDue),
    upcoming: open.filter((t) => t.dueDate && t.dueDate > weekEnd).sort(sortDue).slice(0, 30),
    waitingOnOthers: open.filter((t) => t.status === 'waiting'),
    needsOwnerDecision: open.filter(
      (t) => t.status === 'needs_owner_approval' || t.requiresApproval,
    ),
    highValueOpportunities: open.filter(
      (t) => /opportunit|pipeline|proposal|funding/i.test(t.title) || t.priority === 'critical',
    ),
    clientEmergencies: open.filter(
      (t) => t.priority === 'critical' || /emergency|urgent|asap/i.test(t.title),
    ),
    followUps: pm.listWaiting(true).slice(0, 40),
    recentlyCompleted: tasks
      .filter((t) => t.status === 'completed')
      .sort((a, b) => (b.completedAt || b.updatedAt).localeCompare(a.completedAt || a.updatedAt))
      .slice(0, 20),
    suggestedNextActions: [
      ...open
        .filter((t) => t.nextAction)
        .slice(0, 5)
        .map((t) => t.nextAction!),
      ...pm
        .listProjects()
        .filter((p) => p.nextAction)
        .slice(0, 5)
        .map((p) => p.nextAction!),
    ].slice(0, 10),
    autoGenerated: open.filter((t) => t.autoGenerated),
    delegatedToAgents: pm
      .listTasks({ openOnly: true })
      .filter((t) => t.assigneeKind === 'agent'),
    delegatedToTeam: pm
      .listTasks({ openOnly: true })
      .filter((t) => t.assigneeKind === 'person' && t.assigneeId && t.assigneeId !== ownerId),
    requiringApproval: open.filter((t) => t.requiresApproval || t.status === 'needs_owner_approval'),
  };
}

export function buildWeeklyCeoReview(
  pm: PmRepository,
  integration: IntegrationRepository,
): WeeklyCeoReview {
  const today = todayStr();
  const completed = pm
    .listTasks()
    .filter((t) => t.status === 'completed')
    .slice(0, 10);
  const overdue = pm.listTasks({ openOnly: true }).filter((t) => t.dueDate && t.dueDate < today);
  const broken = pm.listCommitments().filter((c) => c.status === 'broken' || (c.status === 'open' && c.dueDate && c.dueDate < today));
  const clients = integration.listClient360();

  return {
    generatedAt: new Date().toISOString(),
    wins: completed.map((t) => t.title),
    missedCommitments: broken.map((c) => c.description),
    overdueWork: overdue.slice(0, 15).map((t) => t.title),
    clientRisks: clients
      .filter((c) => (c.completenessScore || 0) < 35)
      .slice(0, 10)
      .map((c) => `${c.displayName} (${c.completenessScore ?? 0}% complete)`),
    majorDecisions: pm
      .listDecisions()
      .filter((d) => d.status === 'decided')
      .slice(0, 10)
      .map((d) => d.title),
    projectHealth: pm
      .listProjects()
      .filter((p) => p.status === 'active')
      .slice(0, 15)
      .map((p) => `${p.name}: ${p.health} (${p.progressPercent}%)`),
    strategicPriorities: pm
      .listProjects()
      .filter((p) => p.projectType === 'strategic_initiative' && p.status === 'active')
      .map((p) => p.name),
    nextWeekOutcomes: pm
      .listMilestones()
      .filter((m) => m.dueDate && m.dueDate >= today && m.dueDate <= endOfWeek())
      .map((m) => m.title),
    teamNotes: pm
      .listTeam()
      .filter((t) => t.kind === 'person')
      .map((t) => {
        const open = pm.listTasks({ assigneeId: t.id, openOnly: true }).length;
        return `${t.name}: ${open} open tasks`;
      }),
    agentNotes: pm.listAgents().map((a) => `${a.agentName}: ${a.status} — ${a.output || a.nextPlannedAction || ''}`),
  };
}

export function buildPortfolio(pm: PmRepository) {
  const today = todayStr();
  const nameCounts = new Map<string, number>();
  for (const p of pm.listProjects()) {
    nameCounts.set(p.name, (nameCounts.get(p.name) || 0) + 1);
  }
  return pm.listProjects().map((p) => {
    const tasks = pm.listTasks({ projectId: p.id, openOnly: true });
    const overdue = tasks.filter((t) => t.dueDate && t.dueDate < today).length;
    const blockers = pm.listRisksIssues('blocker').filter((r) => r.projectId === p.id && r.status === 'open').length;
    const nextMilestone = pm
      .listMilestones(p.id)
      .filter((m) => m.status !== 'completed')
      .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))[0];
    const bootstrapNext =
      !p.nextAction ||
      /^define next action\b/i.test(p.nextAction) ||
      /^next action required\b/i.test(p.nextAction);
    const bootstrapMilestone =
      !nextMilestone?.title || /^scope confirmed$/i.test(nextMilestone.title);
    const duplicateCandidate = (nameCounts.get(p.name) || 0) > 1;
    const needsOwnerReview =
      duplicateCandidate ||
      (!p.clientId && /engagement|falk|gnieski|loanspark|personal|comics/i.test(p.name));
    return {
      ...p,
      overdueTaskCount: overdue,
      blockerCount: blockers,
      openTaskCount: tasks.length,
      nextMilestone: nextMilestone?.title,
      nextMilestoneDue: nextMilestone?.dueDate,
      dataQuality: {
        healthAssessed: Boolean(p.health && p.health !== 'unknown' && !(p.health === 'healthy' && bootstrapNext)),
        milestoneEstablished: !bootstrapMilestone,
        nextActionSet: !bootstrapNext,
        dueDateSet: Boolean(p.targetCompletionDate),
        duplicateCandidate,
        needsOwnerReview,
        missingClientId: !p.clientId,
      },
    };
  });
}

export function buildClientWorkspace(pm: PmRepository, integration: IntegrationRepository, clientId: string) {
  const client = integration.listClient360().find((c) => c.id === clientId);
  const projects = pm.listProjects({ clientId });
  const tasks = pm.listTasks({ clientId, openOnly: true });
  const waiting = pm.listWaiting(true).filter((w) => w.clientId === clientId);
  const commitments = pm.listCommitments(true).filter((c) => c.clientId === clientId);
  const decisions = pm.listDecisions().filter((d) => d.clientId === clientId && d.status === 'open');
  const deliverables = pm.listDeliverables().filter((d) => d.clientId === clientId);
  const risks = pm.listRisksIssues().filter((r) => r.clientId === clientId && r.status === 'open');
  return {
    client,
    projects,
    openTasks: tasks,
    waitingItems: waiting,
    ownerDecisions: decisions,
    commitments,
    upcomingDeadlines: tasks
      .filter((t) => t.dueDate)
      .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
      .slice(0, 20),
    deliverables,
    risks,
    recommendedNextAction:
      client?.recommendedNextActions?.[0] ||
      projects[0]?.nextAction ||
      tasks[0]?.nextAction ||
      'Review client communications and set next action',
    timeline: client?.timeline || [],
  };
}
