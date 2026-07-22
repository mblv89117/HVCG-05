import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_TEAM, PROJECT_TEMPLATES } from './templates.ts';
import type {
  AgentWorkRecord,
  CommitmentRecord,
  DecisionRecord,
  DeliverableRecord,
  InboxItemRecord,
  MilestoneRecord,
  NoteRecord,
  OwnerReviewItem,
  PmStoreSnapshot,
  ProjectRecord,
  RiskIssueRecord,
  TaskRecord,
  WaitingItemRecord,
} from './types.ts';

function empty(): PmStoreSnapshot {
  return {
    version: 1,
    projects: [],
    tasks: [],
    milestones: [],
    decisions: [],
    commitments: [],
    waitingItems: [],
    risksIssues: [],
    deliverables: [],
    inbox: [],
    team: [...DEFAULT_TEAM],
    agents: DEFAULT_TEAM.filter((t) => t.kind === 'agent').map(
      (t): AgentWorkRecord => ({
        id: `agent-work-${t.id}`,
        agentId: t.id,
        agentName: t.name,
        role: t.role,
        status: 'idle',
        approvalNeeded: false,
        updatedAt: new Date().toISOString(),
      }),
    ),
    templates: [...PROJECT_TEMPLATES],
    activity: [],
    notes: [],
    ownerReviewQueue: [],
  };
}

export class PmRepository {
  private data: PmStoreSnapshot;
  private path: string;

  constructor(dataDir: string) {
    mkdirSync(dataDir, { recursive: true });
    this.path = join(dataDir, 'pm-store.json');
    if (existsSync(this.path)) {
      const raw = JSON.parse(readFileSync(this.path, 'utf8')) as PmStoreSnapshot;
      this.data = {
        ...empty(),
        ...raw,
        team: raw.team?.length ? raw.team : DEFAULT_TEAM,
        templates: raw.templates?.length ? raw.templates : PROJECT_TEMPLATES,
        agents: raw.agents?.length ? raw.agents : empty().agents,
        notes: raw.notes || [],
        ownerReviewQueue: raw.ownerReviewQueue || [],
      };
    } else {
      this.data = empty();
      this.persist();
    }
  }

  private persist() {
    writeFileSync(this.path, JSON.stringify(this.data, null, 2), { mode: 0o600 });
  }

  snapshot(): PmStoreSnapshot {
    return this.data;
  }

  /** Replace entire snapshot (bootstrap / extraction). */
  replaceAll(next: PmStoreSnapshot) {
    this.data = next;
    this.persist();
  }

  patch(mutator: (data: PmStoreSnapshot) => void) {
    mutator(this.data);
    this.persist();
  }

  listProjects(filter?: { status?: string; clientId?: string; businessEntity?: string }) {
    return this.data.projects.filter((p) => {
      if (filter?.status) {
        if (p.status !== filter.status) return false;
      } else if (p.status === 'archived' || p.archivedAt) {
        return false;
      }
      if (filter?.clientId && p.clientId !== filter.clientId) return false;
      if (filter?.businessEntity && p.businessEntity !== filter.businessEntity) return false;
      return true;
    });
  }

  getProject(id: string) {
    return this.data.projects.find((p) => p.id === id);
  }

  upsertProject(project: ProjectRecord) {
    const i = this.data.projects.findIndex((p) => p.id === project.id);
    if (i >= 0) this.data.projects[i] = project;
    else this.data.projects.push(project);
    this.persist();
  }

  listTasks(filter?: {
    assigneeId?: string;
    projectId?: string;
    clientId?: string;
    status?: string;
    openOnly?: boolean;
  }) {
    const closed = new Set(['completed', 'cancelled']);
    return this.data.tasks.filter((t) => {
      if (filter?.assigneeId && t.assigneeId !== filter.assigneeId) return false;
      if (filter?.projectId && t.projectId !== filter.projectId) return false;
      if (filter?.clientId && t.clientId !== filter.clientId) return false;
      if (filter?.status && t.status !== filter.status) return false;
      if (filter?.openOnly && closed.has(t.status)) return false;
      return true;
    });
  }

  getTask(id: string) {
    return this.data.tasks.find((t) => t.id === id);
  }

  upsertTask(task: TaskRecord) {
    const i = this.data.tasks.findIndex((t) => t.id === task.id);
    if (i >= 0) this.data.tasks[i] = task;
    else this.data.tasks.push(task);
    this.persist();
  }

  listMilestones(projectId?: string) {
    return this.data.milestones.filter((m) => !projectId || m.projectId === projectId);
  }

  upsertMilestone(m: MilestoneRecord) {
    const i = this.data.milestones.findIndex((x) => x.id === m.id);
    if (i >= 0) this.data.milestones[i] = m;
    else this.data.milestones.push(m);
    this.persist();
  }

  listDecisions() {
    return this.data.decisions;
  }
  upsertDecision(d: DecisionRecord) {
    const i = this.data.decisions.findIndex((x) => x.id === d.id);
    if (i >= 0) this.data.decisions[i] = d;
    else this.data.decisions.push(d);
    this.persist();
  }

  listCommitments(openOnly = false) {
    return this.data.commitments.filter((c) => !openOnly || c.status === 'open');
  }
  upsertCommitment(c: CommitmentRecord) {
    const i = this.data.commitments.findIndex((x) => x.id === c.id);
    if (i >= 0) this.data.commitments[i] = c;
    else this.data.commitments.push(c);
    this.persist();
  }

  listWaiting(openOnly = false) {
    return this.data.waitingItems.filter((w) => !openOnly || w.status === 'open');
  }
  upsertWaiting(w: WaitingItemRecord) {
    const i = this.data.waitingItems.findIndex((x) => x.id === w.id);
    if (i >= 0) this.data.waitingItems[i] = w;
    else this.data.waitingItems.push(w);
    this.persist();
  }

  listRisksIssues(kind?: 'risk' | 'issue' | 'blocker') {
    return this.data.risksIssues.filter((r) => !kind || r.kind === kind);
  }
  upsertRiskIssue(r: RiskIssueRecord) {
    const i = this.data.risksIssues.findIndex((x) => x.id === r.id);
    if (i >= 0) this.data.risksIssues[i] = r;
    else this.data.risksIssues.push(r);
    this.persist();
  }

  listDeliverables(projectId?: string) {
    return this.data.deliverables.filter((d) => !projectId || d.projectId === projectId);
  }
  upsertDeliverable(d: DeliverableRecord) {
    const i = this.data.deliverables.findIndex((x) => x.id === d.id);
    if (i >= 0) this.data.deliverables[i] = d;
    else this.data.deliverables.push(d);
    this.persist();
  }

  listInbox(status?: string) {
    return this.data.inbox.filter((i) => !status || i.status === status);
  }
  upsertInbox(item: InboxItemRecord) {
    const i = this.data.inbox.findIndex((x) => x.id === item.id);
    if (i >= 0) this.data.inbox[i] = item;
    else this.data.inbox.push(item);
    this.persist();
  }

  listTeam() {
    return this.data.team;
  }
  listAgents() {
    return this.data.agents;
  }
  upsertAgent(a: AgentWorkRecord) {
    const i = this.data.agents.findIndex((x) => x.id === a.id);
    if (i >= 0) this.data.agents[i] = a;
    else this.data.agents.push(a);
    this.persist();
  }

  listTemplates() {
    return this.data.templates;
  }

  findProjectByName(name: string) {
    const n = name.toLowerCase().trim();
    return this.data.projects.find((p) => p.name.toLowerCase() === n);
  }

  findTaskBySource(sourceRecordId: string) {
    return this.data.tasks.find((t) =>
      t.sourceLinks.some((s) => s.sourceRecordId === sourceRecordId),
    );
  }

  appendActivity(action: string, actor: string, detail?: string) {
    this.data.activity.unshift({
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      actor,
      action,
      detail,
    });
    this.data.activity = this.data.activity.slice(0, 2000);
    this.persist();
  }

  listNotes(filter?: { projectId?: string; clientId?: string }) {
    return this.data.notes.filter((n) => {
      if (filter?.projectId && n.projectId !== filter.projectId) return false;
      if (filter?.clientId && n.clientId !== filter.clientId) return false;
      return true;
    });
  }

  upsertNote(note: NoteRecord) {
    const i = this.data.notes.findIndex((n) => n.id === note.id);
    if (i >= 0) this.data.notes[i] = note;
    else this.data.notes.push(note);
    this.persist();
  }

  listOwnerReview(status: OwnerReviewItem['status'] = 'pending') {
    return this.data.ownerReviewQueue.filter((r) => r.status === status);
  }

  upsertOwnerReview(item: OwnerReviewItem) {
    const i = this.data.ownerReviewQueue.findIndex((x) => x.id === item.id);
    if (i >= 0) this.data.ownerReviewQueue[i] = item;
    else this.data.ownerReviewQueue.push(item);
    this.persist();
  }

  listActivity(limit = 100) {
    return this.data.activity.slice(0, limit);
  }
}
