/**
 * Workspace catalog for Executive Dashboard.
 * Financial fields must never invent numbers — use pending labels only.
 */

export type DataAvailability =
  | 'Verified'
  | 'Repository-derived'
  | 'Awaiting verified source'
  | 'Data connection pending'
  | 'Not yet calculated';

export type WorkspaceKind = 'internal' | 'client';

export interface WorkspaceSummary {
  id: string;
  name: string;
  kind: WorkspaceKind;
  engagementStatus: string;
  relationshipOwner: string;
  health: string;
  referralSource?: string;
  relationshipHistory: string[];
  services: string[];
  notes: string;
}

export interface PendingField {
  label: string;
  value: string;
  availability: DataAvailability;
}

/** HVCG internal operating workspace */
export const hvcgInternalWorkspace: WorkspaceSummary = {
  id: 'ws-hvcg',
  name: 'High Value Capital Group',
  kind: 'internal',
  engagementStatus: 'Internal',
  relationshipOwner: 'Manny Barela',
  health: 'On Track',
  services: ['Capital Advisory', 'Enterprise Value', 'Operations'],
  relationshipHistory: [
    'HVCG internal command center for leadership, clients, and capital advisory.',
  ],
  notes: 'Primary internal workspace for daily executive use.',
};

/**
 * Colorado Craft Beef — relationship facts only from Owner directive.
 * No financial values invented.
 */
export const coloradoCraftBeefWorkspace: WorkspaceSummary = {
  id: 'ws-ccb',
  name: 'Colorado Craft Beef',
  kind: 'client',
  engagementStatus: 'Transitioning to HVCG',
  relationshipOwner: 'Manny Barela',
  health: 'On Track',
  referralSource: 'Randy Kamin — Generational Group',
  relationshipHistory: [
    'Original HVS referral via Generational Group (Randy Kamin)',
    'Primary contact: Jeff Smith',
    'Transitioning to HVCG',
    'Prior HVS discussions: growth capital and additional real estate',
    'Prior financing discussion included non-dilutive and agricultural financing options',
    'Current HVCG meeting + Blueprint presentation (relationship facts only)',
  ],
  services: ['Growth capital advisory', 'Real estate financing exploration'],
  notes:
    'Demo client workspace. Financial KPIs remain pending until verified Atlas data sources are connected.',
};

export const workspaceCatalog: WorkspaceSummary[] = [
  hvcgInternalWorkspace,
  coloradoCraftBeefWorkspace,
];

export function getWorkspace(id: string): WorkspaceSummary | undefined {
  return workspaceCatalog.find((w) => w.id === id);
}

/** Standard pending KPI set for Executive Home when Dataverse has no verified values */
export const pendingExecutiveKpis: PendingField[] = [
  { label: 'Revenue', value: 'Awaiting verified data', availability: 'Awaiting verified source' },
  { label: 'Gross Profit', value: 'Not yet calculated', availability: 'Not yet calculated' },
  { label: 'EBITDA', value: 'Awaiting verified data', availability: 'Awaiting verified source' },
  { label: 'Cash', value: 'Awaiting verified data', availability: 'Awaiting verified source' },
  { label: 'Accounts Receivable', value: 'Pending verification', availability: 'Data connection pending' },
  { label: 'Working Capital', value: 'Not yet calculated', availability: 'Not yet calculated' },
  { label: 'Active Pipeline', value: 'Pending verification', availability: 'Data connection pending' },
  {
    label: 'Enterprise Value Estimate',
    value: 'Not yet calculated',
    availability: 'Not yet calculated',
  },
];

export const pipelineStages = [
  'New Lead',
  'Qualified',
  'Discovery',
  'Assessment',
  'Blueprint',
  'Proposal',
  'Negotiation',
  'Won',
  'Onboarding',
  'Active Engagement',
  'Closed',
  'Lost',
] as const;

export const documentCategories = [
  'Corporate',
  'Financial',
  'Tax',
  'Legal',
  'Insurance',
  'Ownership',
  'Debt',
  'Real Estate',
  'Operations',
  'Capital',
  'Compliance',
  'Engagement',
  'Client Deliverables',
] as const;

export const statusVocabulary = [
  'Not Started',
  'In Progress',
  'On Track',
  'At Risk',
  'Blocked',
  'Awaiting Approval',
  'Completed',
  'Archived',
] as const;

export const fundingTypes = [
  'SBA 7(a)',
  'SBA 504',
  'USDA B&I',
  'Commercial Real Estate',
  'Equipment Financing',
  'Asset-Based Lending',
  'Working Capital',
  'Private Credit',
  'Equity',
  'Mezzanine',
  'Sale-Leaseback',
  'Strategic Capital',
] as const;

/** Repository-derived portfolio initiatives — structure only, no invented finance */
export interface PortfolioProject {
  id: string;
  name: string;
  workspaceId: string;
  sponsor: string;
  pm: string;
  health: (typeof statusVocabulary)[number];
  nextMilestone: string;
  availability: DataAvailability;
}

export const portfolioProjects: PortfolioProject[] = [
  {
    id: 'prj-exec-dashboard',
    name: 'Executive Dashboard Release',
    workspaceId: 'ws-hvcg',
    sponsor: 'Manny Barela',
    pm: 'Master PM',
    health: 'In Progress',
    nextMilestone: 'Owner UAT on Dev SWA',
    availability: 'Repository-derived',
  },
  {
    id: 'prj-ccb-capital',
    name: 'Colorado Craft Beef — Capital Advisory',
    workspaceId: 'ws-ccb',
    sponsor: 'Manny Barela',
    pm: 'Capital Advisory',
    health: 'On Track',
    nextMilestone: 'Verified financial package intake',
    availability: 'Repository-derived',
  },
  {
    id: 'prj-atlas-dataverse',
    name: 'Atlas Dataverse Command Center (Dev)',
    workspaceId: 'ws-hvcg',
    sponsor: 'Manny Barela',
    pm: 'Power Platform',
    health: 'On Track',
    nextMilestone: 'Keep model-driven admin as SoR',
    availability: 'Repository-derived',
  },
];

export interface ActionItem {
  id: string;
  title: string;
  queue: 'Assigned' | 'Approvals' | 'Owner decisions' | 'Blocked' | 'Overdue';
  related: string;
  due: string;
  priority: 'P0' | 'P1' | 'P2';
  availability: DataAvailability;
}

export const actionCenterItems: ActionItem[] = [
  {
    id: 'act-uat-swa',
    title: 'Complete Owner UAT of Executive Dashboard on Dev SWA',
    queue: 'Owner decisions',
    related: 'Executive Dashboard',
    due: 'This week',
    priority: 'P0',
    availability: 'Repository-derived',
  },
  {
    id: 'act-ccb-docs',
    title: 'Collect verified CCB financial package (no dollar display until received)',
    queue: 'Assigned',
    related: 'Colorado Craft Beef',
    due: 'Before client demo with figures',
    priority: 'P0',
    availability: 'Repository-derived',
  },
  {
    id: 'act-cors-qa',
    title: 'Confirm Dataverse CORS for SWA signed-in dashboard',
    queue: 'Approvals',
    related: 'Microsoft Integration',
    due: 'Sprint 13/14 gate',
    priority: 'P1',
    availability: 'Repository-derived',
  },
];
