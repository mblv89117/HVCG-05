/**
 * W2M tasks list honesty for State → Related Work.
 * Renders the Hub open HVCG_Tasks payload only. Sentences match Hub clientTruth.
 * Completed, cancelled, and foreign-coded rows are not this list.
 */

export const TASKS_LIST_SLICE = 6;

export const TASKS_MISSING_SENTENCE =
  'No entitled open HVCG_Tasks rows. tasks=MISSING. Atlas does not invent tasks, assignees, due dates, notes, or next actions.';

export function tasksNotQueriedSentence(reason?: string): string {
  const detail = (reason || '').replace(/\s+/g, ' ').trim();
  const base = 'HVCG_Tasks was not queried. Atlas does not treat that as an empty task list.';
  return detail ? `${base} ${detail}` : base;
}

export function tasksSourceUnavailableSentence(reason?: string): string {
  const detail = (reason || '').replace(/\s+/g, ' ').trim();
  return [
    'Atlas cannot read the entitled HVCG_Tasks slice.',
    'tasks=SOURCE_UNAVAILABLE.',
    detail || 'HVCG_Tasks list walk did not complete.',
    'Partial rows are not the task list.',
    'Atlas does not invent tasks, assignees, due dates, notes, or next actions.',
  ].join(' ');
}

function taskDueLabel(value?: string): string | undefined {
  const raw = (value || '').trim();
  if (!raw) return undefined;
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] || raw.replace(/\s+/g, ' ');
}

export function taskListLabel(row: { title: string; status?: string; dueDate?: string }): string {
  const status = (row.status || '').trim();
  const due = taskDueLabel(row.dueDate);
  if (status && due) return `${row.title} (${status}, due ${due})`;
  if (status) return `${row.title} (${status})`;
  if (due) return `${row.title} (due ${due})`;
  return row.title;
}

export function tasksIndexedSentence(rows: Array<{ title: string; status?: string; dueDate?: string }>): string {
  const labels = rows.slice(0, TASKS_LIST_SLICE).map((row) => taskListLabel(row));
  const extra = rows.length - labels.length;
  const more = extra > 0 ? ` +${extra} more.` : '';
  return `${rows.length} entitled open HVCG_Tasks row(s). tasks=INDEXED. ${labels.join('; ')}.${more}`;
}

export type TasksListRow = {
  id: string;
  title: string;
  status?: string;
  dueDate?: string;
  projectId?: string;
};

export type TasksListHonesty =
  | { kind: 'indexed'; count: number; slice: TasksListRow[]; sentence: string }
  | { kind: 'missing'; sentence: string }
  | { kind: 'source_unavailable'; sentence: string }
  | { kind: 'not_queried'; sentence: string };

type TaskItem = {
  id?: string;
  title?: string;
  status?: string;
  dueDate?: string;
  clientCode?: string;
  projectId?: string;
};

type TasksInput = {
  tasks?: TaskItem[];
  availability?: { status?: string; queried?: boolean; reason?: string };
};

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * One list from the Hub open-task payload. Foreign-coded rows are dropped.
 * A truncated walk contributes no titles. Status and due are copied only when present.
 */
export function tasksListHonesty(input: TasksInput | undefined, clientCode: string): TasksListHonesty {
  const scoped = (clientCode || '').trim().toUpperCase();
  const availability = input?.availability;
  if (availability?.status === 'SOURCE_UNAVAILABLE') {
    return {
      kind: 'source_unavailable',
      sentence: tasksSourceUnavailableSentence(availability.reason),
    };
  }
  const finished =
    Boolean(input) &&
    (availability ? availability.queried !== false : input?.tasks !== undefined);
  if (!finished) {
    return {
      kind: 'not_queried',
      sentence: tasksNotQueriedSentence(availability?.reason),
    };
  }
  const rows: TasksListRow[] = [];
  for (const [index, item] of (input?.tasks || []).entries()) {
    const code = asText(item.clientCode).toUpperCase();
    if (code && code !== scoped) continue;
    const statusRaw = asText(item.status);
    const statusKey = statusRaw.toLowerCase();
    if (statusKey === 'completed' || statusKey === 'cancelled') continue;
    const title = asText(item.title).replace(/\s+/g, ' ');
    if (!title) continue;
    const due = taskDueLabel(item.dueDate);
    const projectId = asText(item.projectId);
    rows.push({
      id: asText(item.id) || `task-${index}`,
      title,
      ...(statusRaw ? { status: statusRaw } : {}),
      ...(due ? { dueDate: due } : {}),
      ...(projectId ? { projectId } : {}),
    });
  }
  if (!rows.length) {
    return { kind: 'missing', sentence: TASKS_MISSING_SENTENCE };
  }
  return {
    kind: 'indexed',
    count: rows.length,
    slice: rows.slice(0, TASKS_LIST_SLICE),
    sentence: tasksIndexedSentence(rows),
  };
}
