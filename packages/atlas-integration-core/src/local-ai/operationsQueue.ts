/**
 * Operations Queue — role-neutral work queue (no named employees).
 */

import type { ConfigurableOwner } from './ownership.ts';
import { DEFAULT_OWNER, assertConfigurableOwner } from './ownership.ts';
import type { WorkValueTier } from './workValue.ts';

export const OPERATIONS_QUEUE_STATUSES = [
  'Open',
  'Assigned',
  'In Progress',
  'Blocked',
  'Waiting on Manny',
  'Completed',
  'Cancelled',
] as const;
export type OperationsQueueStatus = (typeof OPERATIONS_QUEUE_STATUSES)[number];

export const OPERATIONS_PRIORITIES = ['Critical', 'High', 'Medium', 'Low'] as const;
export type OperationsPriority = (typeof OPERATIONS_PRIORITIES)[number];

export interface OperationsQueueItem {
  id: string;
  title: string;
  description: string;
  assignee: ConfigurableOwner;
  priority: OperationsPriority;
  deadline: string | null;
  workValueTier: WorkValueTier;
  status: OperationsQueueStatus;
  escalationReason: string;
  dependencyIds: string[];
  sourceRecordType: string;
  sourceRecordId: string;
  requiresMannyApproval: boolean;
  createdAt: string;
  updatedAt: string;
  syntheticBanner: 'TEST — DO NOT CONTACT';
}

export interface CreateOperationsQueueItemRequest {
  title: string;
  description?: string;
  assignee?: ConfigurableOwner;
  priority?: OperationsPriority;
  deadline?: string | null;
  workValueTier?: WorkValueTier;
  escalationReason?: string;
  dependencyIds?: string[];
  sourceRecordType: string;
  sourceRecordId: string;
  requiresMannyApproval?: boolean;
}

export function normalizeAssignee(value?: string): ConfigurableOwner {
  if (!value) return DEFAULT_OWNER;
  return assertConfigurableOwner(value);
}
