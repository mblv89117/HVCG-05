import type { PmRepository } from './repository.ts';
import type { TaskPriority, TaskRecord, WaitingItemRecord } from './types.ts';

const MANNY = { id: 'person-manny', name: 'Manny Barela' };

function addDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function parseDue(text: string): string | undefined {
  const t = text.toLowerCase();
  if (/\btoday\b/.test(t)) return addDays(0);
  if (/\btomorrow\b/.test(t)) return addDays(1);
  if (/\bnext week\b/.test(t)) return addDays(7);
  if (/\bthis week\b/.test(t)) return addDays(5);
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < days.length; i++) {
    if (t.includes(days[i])) {
      const today = new Date().getDay();
      let delta = i - today;
      if (delta <= 0) delta += 7;
      return addDays(delta);
    }
  }
  return undefined;
}

function findAssignee(text: string, pm: PmRepository): { id: string; name: string } | undefined {
  const lower = text.toLowerCase();
  for (const member of pm.listTeam()) {
    if (lower.includes(member.name.toLowerCase().split(' ')[0])) {
      return { id: member.id, name: member.name };
    }
  }
  return undefined;
}

function findProject(text: string, pm: PmRepository) {
  const lower = text.toLowerCase();
  return pm.listProjects().find(
    (p) =>
      lower.includes(p.name.toLowerCase()) ||
      (p.clientName && lower.includes(p.clientName.toLowerCase())) ||
      p.tags.some((tag) => lower.includes(tag.toLowerCase())),
  );
}

export interface QuickCaptureResult {
  kind: 'task' | 'waiting' | 'note' | 'project_hint' | 'delegation';
  created: Record<string, unknown>;
  message: string;
}

/**
 * Interpret free-text / dictation into structured work.
 * Asks nothing unless essential fields are truly missing.
 */
export function quickCapture(pm: PmRepository, text: string, actorId = MANNY.id): QuickCaptureResult {
  const raw = text.trim();
  if (!raw) {
    return { kind: 'note', created: {}, message: 'Empty capture ignored' };
  }
  const now = new Date().toISOString();
  const lower = raw.toLowerCase();
  const project = findProject(raw, pm);
  const dueDate = parseDue(raw);
  const assignee = findAssignee(raw, pm);

  // Waiting / follow-up
  if (/\bfollow\s*up\b|\bwaiting\b|\bneed .* from\b|\bask .* to\b/i.test(raw)) {
    const waiting: WaitingItemRecord = {
      id: crypto.randomUUID(),
      whatIsNeeded: raw,
      owedByName: assignee?.name || extractPersonHint(raw) || 'External party',
      dateRequested: now.slice(0, 10),
      dueDate: dueDate || addDays(3),
      nextFollowUpDate: dueDate || addDays(2),
      clientId: project?.clientId,
      clientName: project?.clientName,
      projectId: project?.id,
      escalationLevel: 0,
      sourceLinks: [],
      status: 'open',
      createdAt: now,
      updatedAt: now,
    };
    pm.upsertWaiting(waiting);
    // Also create follow-up task
    const task = makeTask(pm, {
      title: `Follow up: ${raw.slice(0, 100)}`,
      projectId: project?.id,
      clientId: project?.clientId,
      clientName: project?.clientName,
      dueDate: waiting.nextFollowUpDate,
      assigneeId: MANNY.id,
      assigneeName: MANNY.name,
      priority: 'high',
      source: 'quick_capture',
      status: 'ready',
    });
    waiting.followUpTaskId = task.id;
    pm.upsertWaiting(waiting);
    pm.appendActivity('quick_capture', actorId, `waiting: ${raw.slice(0, 80)}`);
    return {
      kind: 'waiting',
      created: { waiting, task },
      message: 'Created waiting item + follow-up task',
    };
  }

  // Delegation
  if (/\bask\s+\w+\s+to\b|\bassign\b|\bdelegate\b/i.test(raw) && assignee) {
    const task = makeTask(pm, {
      title: raw.replace(/^ask\s+\w+\s+to\s+/i, '').slice(0, 160) || raw.slice(0, 160),
      projectId: project?.id,
      clientId: project?.clientId,
      clientName: project?.clientName,
      dueDate: dueDate || addDays(3),
      assigneeId: assignee.id,
      assigneeName: assignee.name,
      priority: 'high',
      source: 'quick_capture',
      status: 'ready',
    });
    pm.appendActivity('quick_capture', actorId, `delegated to ${assignee.name}`);
    return {
      kind: 'delegation',
      created: { task },
      message: `Delegated to ${assignee.name}`,
    };
  }

  // Project hint
  if (/\b(create|start|new)\s+project\b|\bbuild the\b/i.test(raw)) {
    return {
      kind: 'project_hint',
      created: { suggestedName: raw, projectId: project?.id },
      message: project
        ? `Matched existing project “${project.name}”. Create a task instead?`
        : 'Capture looks like a new project — open Projects to create from template.',
    };
  }

  // Default → task
  const priority: TaskPriority = /\burgent|asap|critical\b/i.test(lower)
    ? 'critical'
    : /\bhigh\b/i.test(lower)
      ? 'high'
      : 'normal';

  const task = makeTask(pm, {
    title: raw.slice(0, 160),
    projectId: project?.id,
    clientId: project?.clientId,
    clientName: project?.clientName,
    dueDate: dueDate || addDays(2),
    assigneeId: assignee?.id || MANNY.id,
    assigneeName: assignee?.name || MANNY.name,
    priority,
    source: 'quick_capture',
    status: 'inbox',
  });
  pm.appendActivity('quick_capture', actorId, `task: ${task.title}`);
  return {
    kind: 'task',
    created: { task },
    message: `Created task${project ? ` on ${project.name}` : ''}${dueDate ? ` due ${dueDate}` : ''}`,
  };
}

function extractPersonHint(text: string): string | undefined {
  const m = text.match(/\b(?:with|from|ask)\s+([A-Z][a-z]+)\b/);
  return m?.[1];
}

function makeTask(
  pm: PmRepository,
  input: {
    title: string;
    projectId?: string;
    clientId?: string;
    clientName?: string;
    dueDate?: string;
    assigneeId: string;
    assigneeName: string;
    priority: TaskPriority;
    source: string;
    status: TaskRecord['status'];
  },
): TaskRecord {
  const now = new Date().toISOString();
  const task: TaskRecord = {
    id: crypto.randomUUID(),
    title: input.title,
    projectId: input.projectId,
    clientId: input.clientId,
    clientName: input.clientName,
    assigneeKind: input.assigneeId.startsWith('agent') ? 'agent' : 'person',
    assigneeId: input.assigneeId,
    assigneeName: input.assigneeName,
    creatorId: MANNY.id,
    creatorName: MANNY.name,
    source: input.source,
    sourceLinks: [],
    status: input.status,
    priority: input.priority,
    dueDate: input.dueDate,
    dependencyTaskIds: [],
    requiresApproval: false,
    checklist: [],
    confidence: 1,
    autoGenerated: false,
    createdAt: now,
    updatedAt: now,
    activity: [
      {
        id: crypto.randomUUID(),
        at: now,
        actor: MANNY.name,
        action: 'created',
        detail: 'Quick Capture',
      },
    ],
  };
  pm.upsertTask(task);
  return task;
}
