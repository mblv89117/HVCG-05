/**
 * Colorado Craft Beef — verified relationship facts only.
 * Source: Atlas Elite OS workspaces.ts (Owner directive).
 * Do not invent financial values, unverified contacts, or lender names.
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
  KpiField,
  Meeting,
  Milestone,
  NoteItem,
  NotificationItem,
  PipelineParty,
  PortalUser,
  Project,
  TaskItem,
  TimelineEvent,
} from '../types'
import { createEmptyDataRoomSkeleton } from './workspaceTemplate'

export const CCB_CLIENT_ID = 'cli-ccb'
export const CCB_CODE = 'CCB'

export const ccbAdvisor: Advisor = {
  id: 'adv-manny',
  name: 'Manny Barela',
  title: 'Relationship Owner · Capital Advisory',
  email: 'manny@hvcg.example',
  phone: 'Pending verified contact',
  initials: 'MB',
}

export const ccbClient: Client = {
  id: CCB_CLIENT_ID,
  code: CCB_CODE,
  name: 'Colorado Craft Beef',
  industry: 'Agriculture / Food Production',
  engagementStatus: 'Transitioning to HVCG',
  advisorId: ccbAdvisor.id,
  health: 'On Track',
  referralSource: 'Randy Kamin — Generational Group',
  originalRelationship: 'HVS referral',
  currentRelationship: 'HVCG',
  originalObjectives: ['Growth capital', 'Additional real estate'],
  financingThemes: ['Non-dilutive financing', 'Agricultural financing'],
  services: ['Growth capital advisory', 'Real estate financing exploration'],
  relationshipHistory: [
    'Original HVS referral',
    'Transitioning to HVCG',
    'Original need involved growth capital and additional real estate',
    'Prior financing discussion included non-dilutive and agricultural financing options',
  ],
  documentReadiness: 'In Progress — financial package intake pending verified sources',
  capitalReadiness: 'Assessment / Blueprint presentation — amounts not yet verified',
  blueprintStage: 'Blueprint',
  notes:
    'Demo client workspace. Financial KPIs remain pending until verified Atlas data sources are connected.',
  internalNotes:
    'INTERNAL ONLY: Do not surface fee, margin, or unapproved strategy notes to client portal roles.',
}

export const ccbPortalUser: PortalUser = {
  id: 'user-ccb',
  name: 'CCB Workspace User',
  email: 'workspace@ccb.example',
  role: 'Client Contributor',
  clientIds: [CCB_CLIENT_ID],
}

export const ccbContacts: Contact[] = [
  {
    id: 'ct-ccb-ref',
    clientId: CCB_CLIENT_ID,
    name: 'Randy Kamin',
    title: 'Referral Source',
    organization: 'Generational Group',
    email: 'Pending verified contact',
    role: 'Referral',
    visibility: 'ClientVisible',
  },
  {
    id: 'ct-ccb-owner',
    clientId: CCB_CLIENT_ID,
    name: 'Manny Barela',
    title: 'Relationship Owner',
    organization: 'High Value Capital Group',
    email: 'manny@hvcg.example',
    role: 'HVCG',
    visibility: 'ClientVisible',
  },
]

export const ccbEngagement: Engagement = {
  id: 'eng-ccb-1',
  clientId: CCB_CLIENT_ID,
  title: 'Growth Capital & Real Estate Financing Advisory',
  type: 'Capital Advisory',
  status: 'Transitioning to HVCG',
  startDate: 'Pending verified start date',
  progressPct: null,
  nextMilestone: 'Verified financial package intake',
  availability: 'Repository-derived',
}

export const ccbProjects: Project[] = [
  {
    id: 'prj-ccb-capital',
    clientId: CCB_CLIENT_ID,
    name: 'Colorado Craft Beef — Capital Advisory',
    sponsor: 'Manny Barela',
    pm: 'Capital Advisory',
    health: 'On Track',
    nextMilestone: 'Verified financial package intake',
    availability: 'Repository-derived',
  },
  {
    id: 'prj-ccb-blueprint',
    clientId: CCB_CLIENT_ID,
    name: 'Blueprint Presentation Workspace',
    sponsor: 'Manny Barela',
    pm: 'Capital Advisory',
    health: 'In Progress',
    nextMilestone: 'Complete Blueprint presentation with verified package',
    availability: 'Repository-derived',
  },
]

export const ccbFunding: FundingRequest = {
  id: 'fr-ccb-1',
  clientId: CCB_CLIENT_ID,
  stage: 'Assessment',
  amountTarget: null,
  amountCommitted: null,
  lenderInterest: null,
  themes: ['Non-dilutive financing', 'Agricultural financing'],
  updatedAt: '2026-07-19T00:00:00Z',
  availability: 'Awaiting verified data',
}

export const ccbRoadmap: CapitalRoadmapItem[] = [
  {
    id: 'cr-ccb-1',
    clientId: CCB_CLIENT_ID,
    title: 'Relationship transition HVS → HVCG',
    theme: 'Engagement',
    status: 'In Progress',
    notes: 'Current relationship: HVCG. Original: HVS referral.',
    availability: 'Verified',
  },
  {
    id: 'cr-ccb-2',
    clientId: CCB_CLIENT_ID,
    title: 'Growth capital exploration',
    theme: 'Non-dilutive financing',
    status: 'On Track',
    notes: 'Original objective — no target amount displayed until verified.',
    availability: 'Verified',
  },
  {
    id: 'cr-ccb-3',
    clientId: CCB_CLIENT_ID,
    title: 'Additional real estate financing',
    theme: 'Agricultural financing',
    status: 'On Track',
    notes: 'Original objective — structure pending verified underwriting package.',
    availability: 'Verified',
  },
  {
    id: 'cr-ccb-4',
    clientId: CCB_CLIENT_ID,
    title: 'Blueprint presentation',
    theme: 'Capital strategy',
    status: 'In Progress',
    notes: 'Dedicated Blueprint presentation workspace for advisory session.',
    availability: 'Repository-derived',
  },
]

export const ccbPipeline: PipelineParty[] = [
  {
    id: 'pp-ccb-placeholder',
    clientId: CCB_CLIENT_ID,
    name: 'Lender / investor matches',
    type: 'Lender',
    stage: 'Not started',
    status: 'Awaiting verified financial package',
    notes:
      'No named lenders or investors until packaging is verified. Themes: non-dilutive and agricultural financing.',
    availability: 'Awaiting verified data',
  },
]

export const ccbKpis: KpiField[] = [
  { id: 'kpi-ccb-rev', clientId: CCB_CLIENT_ID, label: 'Revenue', value: 'Awaiting verified data', availability: 'Awaiting verified data' },
  { id: 'kpi-ccb-gp', clientId: CCB_CLIENT_ID, label: 'Gross Profit', value: 'Not yet calculated', availability: 'Not yet calculated' },
  { id: 'kpi-ccb-ebitda', clientId: CCB_CLIENT_ID, label: 'EBITDA', value: 'Awaiting verified data', availability: 'Awaiting verified data' },
  { id: 'kpi-ccb-cash', clientId: CCB_CLIENT_ID, label: 'Cash', value: 'Awaiting verified data', availability: 'Awaiting verified data' },
  { id: 'kpi-ccb-ar', clientId: CCB_CLIENT_ID, label: 'Accounts Receivable', value: 'Pending verification', availability: 'Pending verification' },
  { id: 'kpi-ccb-wc', clientId: CCB_CLIENT_ID, label: 'Working Capital', value: 'Not yet calculated', availability: 'Not yet calculated' },
  { id: 'kpi-ccb-pipe', clientId: CCB_CLIENT_ID, label: 'Active Pipeline', value: 'Pending verification', availability: 'Pending verification' },
  { id: 'kpi-ccb-ev', clientId: CCB_CLIENT_ID, label: 'Enterprise Value Estimate', value: 'Not yet calculated', availability: 'Not yet calculated' },
]

export const ccbMilestones: Milestone[] = [
  {
    id: 'ms-ccb-1',
    clientId: CCB_CLIENT_ID,
    title: 'HVCG relationship transition',
    dueDate: 'In progress',
    owner: 'Joint',
    status: 'In Progress',
    progressPct: null,
  },
  {
    id: 'ms-ccb-2',
    clientId: CCB_CLIENT_ID,
    title: 'Verified financial package intake',
    dueDate: 'Before figures demo',
    owner: 'Client',
    status: 'Upcoming',
    progressPct: null,
  },
  {
    id: 'ms-ccb-3',
    clientId: CCB_CLIENT_ID,
    title: 'Blueprint presentation',
    dueDate: 'After package intake',
    owner: 'Advisor',
    status: 'Upcoming',
    progressPct: null,
  },
]

export const ccbTasks: TaskItem[] = [
  {
    id: 'tk-ccb-1',
    clientId: CCB_CLIENT_ID,
    title: 'Collect verified CCB financial package (no dollar display until received)',
    ownerType: 'Client',
    dueDate: 'Before client demo with figures',
    status: 'Open',
    weight: 5,
    nextAction: true,
  },
  {
    id: 'tk-ccb-2',
    clientId: CCB_CLIENT_ID,
    title: 'Confirm document checklist for Corporate, Financial, Tax, and Real Estate',
    ownerType: 'Client',
    dueDate: 'This engagement phase',
    status: 'In Progress',
    weight: 3,
    nextAction: true,
  },
  {
    id: 'tk-ccb-3',
    clientId: CCB_CLIENT_ID,
    title: 'Prepare Blueprint presentation workspace materials (structure only)',
    ownerType: 'Advisor',
    dueDate: 'After package intake',
    status: 'Open',
    weight: 4,
    nextAction: true,
  },
]

export const ccbApprovals: ApprovalItem[] = [
  {
    id: 'ap-ccb-1',
    clientId: CCB_CLIENT_ID,
    title: 'External data-room sharing',
    requestedBy: 'System default',
    status: 'Rejected',
    dueDate: 'N/A',
    notes: 'Anonymous sharing is forbidden. External invites remain gated until owner unlock.',
    visibility: 'ClientVisible',
  },
  {
    id: 'ap-ccb-2',
    clientId: CCB_CLIENT_ID,
    title: 'Publish Blueprint presentation to client workspace',
    requestedBy: 'Capital Advisory',
    status: 'Pending',
    dueDate: 'After package intake',
    notes: 'Client-visible deliverable approval — no financial figures until verified.',
    visibility: 'ClientVisible',
  },
]

export const ccbDocRequests: DocumentRequest[] = [
  {
    id: 'dr-ccb-corp',
    clientId: CCB_CLIENT_ID,
    folder: 'Corporate',
    title: 'Corporate organization overview',
    status: 'Requested',
    dueDate: 'Open',
    owner: 'Client',
    approvalStatus: 'Not Required',
    notes: 'Structure request — no figures required yet.',
  },
  {
    id: 'dr-ccb-fin',
    clientId: CCB_CLIENT_ID,
    folder: 'Financial',
    title: 'Verified financial package',
    status: 'Requested',
    dueDate: 'Before figures demo',
    owner: 'Client',
    approvalStatus: 'Pending',
    notes: 'P0 next action. Do not display dollar values until received and verified.',
  },
  {
    id: 'dr-ccb-tax',
    clientId: CCB_CLIENT_ID,
    folder: 'Tax',
    title: 'Tax returns (years TBD after intake)',
    status: 'Requested',
    dueDate: 'Open',
    owner: 'Client',
    approvalStatus: 'Not Required',
  },
  {
    id: 'dr-ccb-re',
    clientId: CCB_CLIENT_ID,
    folder: 'Real Estate',
    title: 'Real estate schedules supporting additional property objective',
    status: 'Requested',
    dueDate: 'Open',
    owner: 'Client',
    approvalStatus: 'Not Required',
  },
  {
    id: 'dr-ccb-cap',
    clientId: CCB_CLIENT_ID,
    folder: 'Capital',
    title: 'Prior financing discussion notes (non-dilutive / agricultural themes)',
    status: 'Requested',
    dueDate: 'Open',
    owner: 'Joint',
    approvalStatus: 'Not Required',
  },
  {
    id: 'dr-ccb-eng',
    clientId: CCB_CLIENT_ID,
    folder: 'Engagement',
    title: 'Engagement kickoff / Blueprint agenda',
    status: 'In Review',
    dueDate: 'Open',
    owner: 'Advisor',
    approvalStatus: 'Pending',
    receivedDate: 'Workspace seeded',
  },
]

export const ccbDataRoomDocs: DataRoomDocument[] = [
  ...createEmptyDataRoomSkeleton(CCB_CLIENT_ID).map((d, i) => ({
    ...d,
    id: `drdoc-ccb-skel-${i}`,
  })),
  {
    id: 'drdoc-ccb-eng-1',
    clientId: CCB_CLIENT_ID,
    category: 'Engagement',
    name: 'CCB_Relationship_Profile_Verified.pdf',
    version: '1.0',
    sizeKb: 48,
    uploadedAt: '2026-07-19T00:00:00Z',
    receivedDate: '2026-07-19',
    owner: 'HVCG',
    approvalStatus: 'Approved',
    notes: 'Verified relationship facts only (referral, objectives, financing themes).',
    sensitivity: 'ClientVisible',
    downloadAllowed: true,
    auditSummary: 'Uploaded by HVCG · ClientVisible · Approved download',
  },
  {
    id: 'drdoc-ccb-internal',
    clientId: CCB_CLIENT_ID,
    category: 'Engagement',
    name: 'INTERNAL_CCB_Strategy_Draft.docx',
    version: '0.1',
    sizeKb: 32,
    uploadedAt: '2026-07-18T00:00:00Z',
    owner: 'HVCG',
    approvalStatus: 'Not Required',
    notes: 'Internal strategy draft — not client visible.',
    sensitivity: 'Internal',
    downloadAllowed: false,
    auditSummary: 'Internal only · hidden from Client Executive / Client Contributor / Read-Only Advisor',
  },
]

export const ccbMeetings: Meeting[] = [
  {
    id: 'mt-ccb-1',
    clientId: CCB_CLIENT_ID,
    title: 'Blueprint presentation workspace — planning',
    startsAt: '2026-07-28T17:00:00Z',
    location: 'Teams (mock) · HVCG',
  },
]

export const ccbNotes: NoteItem[] = [
  {
    id: 'nt-ccb-1',
    clientId: CCB_CLIENT_ID,
    title: 'Verified relationship summary',
    body: 'Referral: Randy Kamin — Generational Group. Original HVS referral. Now HVCG. Objectives: growth capital and additional real estate. Themes: non-dilutive and agricultural financing.',
    author: 'Manny Barela',
    createdAt: '2026-07-19T00:00:00Z',
    visibility: 'ClientVisible',
  },
  {
    id: 'nt-ccb-internal',
    clientId: CCB_CLIENT_ID,
    title: 'Internal pricing discussion',
    body: 'INTERNAL — fee discussion placeholder. Must never appear for client roles.',
    author: 'HVCG Internal',
    createdAt: '2026-07-18T00:00:00Z',
    visibility: 'Internal',
  },
]

export const ccbDecisions: DecisionItem[] = [
  {
    id: 'dec-ccb-1',
    clientId: CCB_CLIENT_ID,
    title: 'Financial display policy',
    decision: 'No financial KPI or capital amount figures until verified Atlas sources are connected.',
    decidedBy: 'Owner directive (Atlas)',
    decidedAt: '2026-07-19',
    status: 'Active',
    visibility: 'ClientVisible',
  },
  {
    id: 'dec-ccb-2',
    clientId: CCB_CLIENT_ID,
    title: 'Anonymous sharing',
    decision: 'Anonymous sharing disabled for all confidential data-room content.',
    decidedBy: 'Security model',
    decidedAt: '2026-07-19',
    status: 'Active',
    visibility: 'ClientVisible',
  },
]

export const ccbDeliverables: DeliverableItem[] = [
  {
    id: 'dl-ccb-1',
    clientId: CCB_CLIENT_ID,
    title: 'Blueprint presentation package',
    status: 'In Progress',
    dueDate: 'After verified financial package',
    owner: 'Capital Advisory',
    category: 'Deliverables',
  },
  {
    id: 'dl-ccb-2',
    clientId: CCB_CLIENT_ID,
    title: 'Capital readiness assessment (structure)',
    status: 'Not Started',
    dueDate: 'After package intake',
    owner: 'Capital Advisory',
    category: 'Capital',
  },
]

export const ccbInsights: AiInsight[] = [
  {
    id: 'ai-ccb-1',
    clientId: CCB_CLIENT_ID,
    title: 'Executive briefing (structure only)',
    summary:
      'Colorado Craft Beef is transitioning from an HVS referral relationship to HVCG. Priority themes are growth capital and additional real estate using non-dilutive and agricultural financing options. Next action: collect a verified financial package before any figure-based demo. Blueprint presentation workspace is the current advisory focal point.',
    generatedAt: '2026-07-19T12:00:00Z',
    availability: 'Repository-derived',
    visibility: 'ClientVisible',
  },
]

export const ccbActivity: ActivityEvent[] = [
  {
    id: 'act-ccb-1',
    clientId: CCB_CLIENT_ID,
    title: 'Workspace seeded',
    description: 'Colorado Craft Beef client workspace created from verified Atlas relationship facts.',
    at: '2026-07-19T00:00:00Z',
    actor: 'System',
    category: 'System',
  },
  {
    id: 'act-ccb-2',
    clientId: CCB_CLIENT_ID,
    title: 'Document request opened',
    description: 'Verified financial package requested (Financial category).',
    at: '2026-07-19T00:05:00Z',
    actor: 'HVCG',
    category: 'Document',
  },
  {
    id: 'act-ccb-3',
    clientId: CCB_CLIENT_ID,
    title: 'Next action assigned',
    description: 'Collect verified CCB financial package (no dollar display until received).',
    at: '2026-07-19T00:10:00Z',
    actor: 'Capital Advisory',
    category: 'Task',
  },
]

export const ccbNotifications: NotificationItem[] = [
  {
    id: 'n-ccb-1',
    clientId: CCB_CLIENT_ID,
    title: 'Financial package requested',
    body: 'Please upload a verified financial package to the Financial data-room category. Figures will not display until verified.',
    createdAt: '2026-07-19T00:05:00Z',
    read: false,
    channel: 'InApp',
  },
  {
    id: 'n-ccb-2',
    clientId: CCB_CLIENT_ID,
    title: 'Blueprint planning meeting scheduled',
    body: 'Mock meeting added for Blueprint presentation workspace planning. Email/SMS outbound remain disabled.',
    createdAt: '2026-07-19T00:15:00Z',
    read: false,
    channel: 'InApp',
  },
  {
    id: 'n-ccb-3',
    clientId: CCB_CLIENT_ID,
    title: 'Email notification blocked',
    body: 'Client email notifications are disabled until BL-C1 / owner approval. In-app only.',
    createdAt: '2026-07-19T00:16:00Z',
    read: true,
    channel: 'EmailDisabled',
  },
]

export const ccbTimeline: TimelineEvent[] = [
  {
    id: 'tl-ccb-1',
    clientId: CCB_CLIENT_ID,
    title: 'HVS referral established',
    description: 'Original relationship: HVS referral via Randy Kamin — Generational Group.',
    date: 'Historical',
    type: 'Engagement',
    status: 'Complete',
  },
  {
    id: 'tl-ccb-2',
    clientId: CCB_CLIENT_ID,
    title: 'Transitioning to HVCG',
    description: 'Current relationship: HVCG. Engagement status: Transitioning to HVCG.',
    date: 'Current',
    type: 'Engagement',
    status: 'Current',
  },
  {
    id: 'tl-ccb-3',
    clientId: CCB_CLIENT_ID,
    title: 'Blueprint presentation',
    description: 'Advisory focal stage for capital strategy presentation (no verified figures yet).',
    date: 'Upcoming',
    type: 'Funding',
    status: 'Upcoming',
  },
]
