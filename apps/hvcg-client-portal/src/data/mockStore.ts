/**
 * Portal mock store — Colorado Craft Beef is the primary reusable template.
 * ACCG remains as a secondary workspace for cross-client isolation tests only.
 */

import type {
  ActivityEvent,
  Advisor,
  AiInsight,
  ApprovalItem,
  CapitalRoadmapItem,
  Client,
  Contact,
  DataRoomDocument,
  DecisionItem,
  DeliverableItem,
  DocumentRequest,
  Engagement,
  FundingRequest,
  Invoice,
  KpiField,
  Meeting,
  Message,
  MessageThread,
  Milestone,
  NoteItem,
  NotificationItem,
  PipelineParty,
  PortalUser,
  Project,
  SecureFile,
  TaskItem,
  TimelineEvent,
} from '../types'
import { createClientWorkspaceShell } from './workspaceTemplate'
import {
  ccbActivity,
  ccbAdvisor,
  ccbApprovals,
  ccbClient,
  ccbContacts,
  ccbDataRoomDocs,
  ccbDecisions,
  ccbDeliverables,
  ccbDocRequests,
  ccbEngagement,
  ccbFunding,
  ccbInsights,
  ccbKpis,
  ccbMeetings,
  ccbMilestones,
  ccbNotes,
  ccbNotifications,
  ccbPipeline,
  ccbPortalUser,
  ccbProjects,
  ccbRoadmap,
  ccbTasks,
  ccbTimeline,
  CCB_CLIENT_ID,
} from './coloradoCraftBeef'

const isolationAdvisor: Advisor = {
  id: 'adv-isolation',
  name: 'Jordan Hale',
  title: 'Capital Advisor',
  email: 'jordan.hale@hvcg.example',
  phone: '702.555.0142',
  initials: 'JH',
}

/** Secondary mock client — isolation / multi-tenant switcher only. */
const isolationClient: Client = createClientWorkspaceShell({
  id: 'cli-accg',
  code: 'ACCG',
  name: 'ACCG Holdings',
  advisorId: isolationAdvisor.id,
  overrides: {
    industry: 'Professional Services',
    engagementStatus: 'Active',
    health: 'On Track',
    referralSource: 'Internal demo',
    originalRelationship: 'Demo',
    currentRelationship: 'HVCG',
    originalObjectives: ['Demo isolation'],
    financingThemes: [],
    services: ['Demo'],
    relationshipHistory: ['Isolation test workspace — not a production client profile.'],
    documentReadiness: 'Demo',
    capitalReadiness: 'Demo',
    blueprintStage: 'Active Engagement',
    notes: 'Secondary workspace for Client A / Client B isolation tests.',
    internalNotes: 'INTERNAL isolation fixture.',
  },
})

export const advisors: Advisor[] = [ccbAdvisor, isolationAdvisor]

export const clients: Client[] = [ccbClient, isolationClient]

export const currentUser: PortalUser = {
  ...ccbPortalUser,
  // Demo switcher: can see CCB + ACCG to prove filtering; production users get one org.
  clientIds: [CCB_CLIENT_ID, isolationClient.id],
}

export const contacts: Contact[] = [
  ...ccbContacts,
  {
    id: 'ct-accg-1',
    clientId: isolationClient.id,
    name: 'ACCG Contact',
    title: 'Demo',
    organization: 'ACCG Holdings',
    email: 'demo@accg.example',
    role: 'Client',
    visibility: 'ClientVisible',
  },
]

export const engagements: Engagement[] = [
  ccbEngagement,
  {
    id: 'eng-accg',
    clientId: isolationClient.id,
    title: 'Isolation Demo Engagement',
    type: 'Demo',
    status: 'Active',
    startDate: '2026-01-01',
    progressPct: 50,
    nextMilestone: 'Isolation check',
    availability: 'Repository-derived',
  },
]

export const projects: Project[] = [
  ...ccbProjects,
  {
    id: 'prj-accg',
    clientId: isolationClient.id,
    name: 'ACCG Isolation Project',
    sponsor: 'Demo',
    pm: 'Demo',
    health: 'On Track',
    nextMilestone: 'N/A',
    availability: 'Repository-derived',
  },
]

export const fundingRequests: FundingRequest[] = [
  ccbFunding,
  {
    id: 'fr-accg',
    clientId: isolationClient.id,
    stage: 'Lender Matching',
    amountTarget: null,
    amountCommitted: null,
    lenderInterest: null,
    themes: [],
    updatedAt: '2026-07-14T16:00:00Z',
    availability: 'Awaiting verified data',
  },
]

export const capitalRoadmap: CapitalRoadmapItem[] = [...ccbRoadmap]

export const pipelineParties: PipelineParty[] = [...ccbPipeline]

export const kpis: KpiField[] = [
  ...ccbKpis,
  {
    id: 'kpi-accg-1',
    clientId: isolationClient.id,
    label: 'Revenue',
    value: 'Isolation fixture — not verified',
    availability: 'Awaiting verified data',
  },
]

export const documentRequests: DocumentRequest[] = [
  ...ccbDocRequests,
  {
    id: 'dr-accg-1',
    clientId: isolationClient.id,
    folder: 'Corporate',
    title: 'ACCG isolation doc request',
    status: 'Requested',
    dueDate: 'N/A',
    owner: 'Client',
    approvalStatus: 'Not Required',
  },
]

export const dataRoomDocuments: DataRoomDocument[] = [
  ...ccbDataRoomDocs,
  {
    id: 'drdoc-accg-1',
    clientId: isolationClient.id,
    category: 'Corporate',
    name: 'ACCG_ONLY_SECRET.pdf',
    version: '1.0',
    sizeKb: 10,
    uploadedAt: '2026-07-01T00:00:00Z',
    owner: 'ACCG',
    approvalStatus: 'Approved',
    sensitivity: 'ClientVisible',
    downloadAllowed: true,
    auditSummary: 'Isolation fixture — must never appear in CCB workspace',
  },
]

export const secureFiles: SecureFile[] = dataRoomDocuments
  .filter((d) => d.sizeKb > 0)
  .map((d) => ({
    id: `sf-${d.id}`,
    clientId: d.clientId,
    folder: d.category,
    name: d.name,
    sizeKb: d.sizeKb,
    updatedAt: d.uploadedAt || '2026-07-19T00:00:00Z',
    sensitivity: d.sensitivity,
  }))

export const threads: MessageThread[] = [
  {
    id: 'th-ccb-1',
    clientId: CCB_CLIENT_ID,
    subject: 'Financial package intake',
    unread: 1,
    updatedAt: '2026-07-19T12:00:00Z',
  },
]

export const messages: Message[] = [
  {
    id: 'msg-ccb-1',
    threadId: 'th-ccb-1',
    sender: 'Manny Barela',
    direction: 'HVCGToClient',
    body: 'Please upload your verified financial package to the Financial data-room category. We will not display dollar figures until sources are verified.',
    sentAt: '2026-07-19T12:00:00Z',
  },
]

export const tasks: TaskItem[] = [
  ...ccbTasks,
  {
    id: 'tk-accg-1',
    clientId: isolationClient.id,
    title: 'ACCG-only task (isolation)',
    ownerType: 'Client',
    dueDate: 'N/A',
    status: 'Open',
    weight: 1,
  },
]

export const approvals: ApprovalItem[] = [...ccbApprovals]

export const meetings: Meeting[] = [...ccbMeetings]

export const notes: NoteItem[] = [...ccbNotes]

export const decisions: DecisionItem[] = [...ccbDecisions]

export const deliverables: DeliverableItem[] = [...ccbDeliverables]

export const aiInsights: AiInsight[] = [...ccbInsights]

export const activityEvents: ActivityEvent[] = [...ccbActivity]

export const notifications: NotificationItem[] = [
  ...ccbNotifications,
  {
    id: 'n-accg-1',
    clientId: isolationClient.id,
    title: 'ACCG-only notification',
    body: 'Must not appear when CCB workspace is active.',
    createdAt: '2026-07-19T00:00:00Z',
    read: false,
    channel: 'InApp',
  },
]

export const timelineEvents: TimelineEvent[] = [...ccbTimeline]

export const milestones: Milestone[] = [...ccbMilestones]

export const invoices: Invoice[] = [
  {
    id: 'inv-ccb-pending',
    clientId: CCB_CLIENT_ID,
    invoiceNumber: 'PENDING',
    description: 'No client invoices until verified billing sources connect.',
    issuedDate: '—',
    dueDate: '—',
    amount: null,
    status: 'PendingVerification',
    availability: 'Awaiting verified data',
  },
]
