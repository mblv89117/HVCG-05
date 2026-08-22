/**
 * Deterministic Hub ↔ SharePoint choice transformers.
 * Unknown client input → validation error.
 * Unknown SharePoint value → unsupported (caller fails closed).
 * Do not invent SharePoint choice values.
 */

import type { ProjectHealth, ProjectStatus, TaskPriority, TaskStatus } from '../types.ts';
import { PmHttpError } from './errors.ts';

export type MilestoneHubStatus = 'pending' | 'in_progress' | 'completed' | 'missed';

const PROJECT_STATUS_TO_SP: Record<Exclude<ProjectStatus, 'archived'>, string> = {
  draft: 'Not Started',
  active: 'In Progress',
  on_hold: 'On Hold',
  blocked: 'Blocked',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const PROJECT_STATUS_FROM_SP: Record<string, Exclude<ProjectStatus, 'archived'>> = {
  'Not Started': 'draft',
  'In Progress': 'active',
  'On Hold': 'on_hold',
  Blocked: 'blocked',
  Completed: 'completed',
  Cancelled: 'cancelled',
};

const HEALTH_TO_SP: Record<Exclude<ProjectHealth, 'unknown'>, string> = {
  healthy: 'Green',
  watch: 'Yellow',
  at_risk: 'Red',
  critical: 'Red',
};

const HEALTH_FROM_SP: Record<string, ProjectHealth> = {
  Green: 'healthy',
  Yellow: 'watch',
  Red: 'at_risk',
};

const PRIORITY_TO_SP: Partial<Record<TaskPriority, string>> = {
  critical: 'Critical',
  high: 'High',
  normal: 'Medium',
  low: 'Low',
};

const PRIORITY_FROM_SP: Record<string, TaskPriority> = {
  Critical: 'critical',
  High: 'high',
  Medium: 'normal',
  Low: 'low',
};

const TASK_STATUS_TO_SP: Partial<Record<TaskStatus, string>> = {
  inbox: 'Not Started',
  ready: 'Not Started',
  scheduled: 'Not Started',
  in_progress: 'In Progress',
  waiting: 'Waiting on Internal',
  blocked: 'Blocked',
  needs_review: 'In Review',
  needs_owner_approval: 'In Review',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const TASK_STATUS_FROM_SP: Record<string, TaskStatus> = {
  'Not Started': 'ready',
  'In Progress': 'in_progress',
  'Waiting on Client': 'waiting',
  'Waiting on Internal': 'waiting',
  Blocked: 'blocked',
  'In Review': 'needs_review',
  Completed: 'completed',
  Cancelled: 'cancelled',
};

const MILESTONE_TO_SP: Partial<Record<MilestoneHubStatus, string>> = {
  pending: 'Pending',
  in_progress: 'Pending',
  completed: 'Achieved',
  missed: 'Missed',
};

const MILESTONE_FROM_SP: Record<string, MilestoneHubStatus> = {
  Pending: 'pending',
  Achieved: 'completed',
  Missed: 'missed',
};

function badInput(field: string, value: string): never {
  throw new PmHttpError(400, 'invalid_input', `Unsupported ${field} value.`);
}

export function projectStatusToSharePoint(status: ProjectStatus): string {
  if (status === 'archived') badInput('status', status);
  const mapped = PROJECT_STATUS_TO_SP[status];
  if (!mapped) badInput('status', String(status));
  return mapped;
}

export function projectStatusFromSharePoint(raw: string | null | undefined): Exclude<ProjectStatus, 'archived'> | null {
  if (!raw) return null;
  return PROJECT_STATUS_FROM_SP[raw] ?? null;
}

export function healthToSharePoint(health: ProjectHealth): string {
  if (health === 'unknown') badInput('health', health);
  const mapped = HEALTH_TO_SP[health];
  if (!mapped) badInput('health', String(health));
  return mapped;
}

export function healthFromSharePoint(raw: string | null | undefined): ProjectHealth | null {
  if (!raw) return 'unknown';
  return HEALTH_FROM_SP[raw] ?? null;
}

export function priorityToSharePoint(priority: TaskPriority): string {
  const mapped = PRIORITY_TO_SP[priority];
  if (!mapped) badInput('priority', String(priority));
  return mapped;
}

export function priorityFromSharePoint(raw: string | null | undefined): TaskPriority | null {
  if (!raw) return 'normal';
  return PRIORITY_FROM_SP[raw] ?? null;
}

export function taskStatusToSharePoint(status: TaskStatus): string {
  const mapped = TASK_STATUS_TO_SP[status];
  if (!mapped) badInput('status', String(status));
  return mapped;
}

export function taskStatusFromSharePoint(raw: string | null | undefined): TaskStatus | null {
  if (!raw) return null;
  return TASK_STATUS_FROM_SP[raw] ?? null;
}

export function milestoneStatusToSharePoint(status: MilestoneHubStatus): string {
  const mapped = MILESTONE_TO_SP[status];
  if (!mapped) badInput('status', String(status));
  return mapped;
}

export function milestoneStatusFromSharePoint(raw: string | null | undefined): MilestoneHubStatus | null {
  if (!raw) return 'pending';
  if (raw === 'Cancelled') return null;
  return MILESTONE_FROM_SP[raw] ?? null;
}

export const MAPPING_TABLES = {
  projectStatus: { toSharePoint: PROJECT_STATUS_TO_SP, fromSharePoint: PROJECT_STATUS_FROM_SP },
  projectHealth: {
    toSharePoint: HEALTH_TO_SP,
    fromSharePoint: HEALTH_FROM_SP,
    note: 'Hub at_risk and critical both write SharePoint Red. Red reads as at_risk.',
  },
  priority: {
    toSharePoint: PRIORITY_TO_SP,
    fromSharePoint: PRIORITY_FROM_SP,
    note: 'Hub someday has no SharePoint choice and is rejected on write.',
  },
  taskStatus: {
    toSharePoint: TASK_STATUS_TO_SP,
    fromSharePoint: TASK_STATUS_FROM_SP,
    note: 'Hub waiting writes Waiting on Internal. Hub deferred is rejected on write.',
  },
  milestoneStatus: {
    toSharePoint: MILESTONE_TO_SP,
    fromSharePoint: MILESTONE_FROM_SP,
    note: 'SharePoint Cancelled milestones are unsupported in the Hub milestone union.',
  },
} as const;
