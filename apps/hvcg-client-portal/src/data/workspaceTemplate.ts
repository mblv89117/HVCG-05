/**
 * Reusable client-workspace factory.
 * New HVCG clients clone this structure; seed verified facts per client.
 */

import type { Client, DataRoomDocument } from '../types'
import { DATA_ROOM_CATEGORIES } from '../types'

export interface WorkspaceBlueprint {
  client: Omit<Client, 'id' | 'code' | 'name'> & { id?: string; code?: string; name?: string }
}

export const DEFAULT_CLIENT_WORKSPACE_FIELDS: Omit<
  Client,
  'id' | 'code' | 'name' | 'advisorId'
> = {
  industry: 'Pending verified industry',
  engagementStatus: 'Onboarding',
  health: 'On Track',
  referralSource: 'Pending verified referral',
  originalRelationship: 'Pending',
  currentRelationship: 'HVCG',
  originalObjectives: [],
  financingThemes: [],
  services: [],
  relationshipHistory: [],
  documentReadiness: 'Not Started',
  capitalReadiness: 'Not Started',
  blueprintStage: 'Assessment',
  notes: 'Template workspace — replace with verified client facts only.',
}

/** Empty category placeholders for a new secure data room (no invented files). */
export function createEmptyDataRoomSkeleton(clientId: string): DataRoomDocument[] {
  return DATA_ROOM_CATEGORIES.map((category) => ({
    id: `skel-${clientId}-${category}`,
    clientId,
    category,
    name: `${category} — awaiting documents`,
    version: '—',
    sizeKb: 0,
    uploadedAt: '',
    owner: 'Unassigned',
    approvalStatus: 'Not Required' as const,
    notes: 'Category ready. Upload via document request or contributor upload workflow.',
    sensitivity: 'ClientVisible' as const,
    downloadAllowed: false,
    auditSummary: 'Category initialized · no file versions yet',
  }))
}

export function createClientWorkspaceShell(input: {
  id: string
  code: string
  name: string
  advisorId: string
  overrides?: Partial<Client>
}): Client {
  return {
    id: input.id,
    code: input.code,
    name: input.name,
    advisorId: input.advisorId,
    ...DEFAULT_CLIENT_WORKSPACE_FIELDS,
    ...input.overrides,
  }
}
