/** Atlas Administration — typed settings model (sample-backed v1). No secrets. */

export type UserStatus = 'Invited' | 'Active' | 'Disabled';

export type PermissionKey =
  | 'admin.access'
  | 'users.manage'
  | 'roles.assign'
  | 'clients.access.manage'
  | 'reference.edit'
  | 'settings.app'
  | 'settings.financial'
  | 'settings.capital'
  | 'settings.eva'
  | 'settings.ai'
  | 'feature.flags'
  | 'integrations.view'
  | 'audit.view'
  | 'notifications.configure'
  | 'workflow.configure';

/** Catalog only — UI cannot invent new keys. */
export const PERMISSION_CATALOG: Record<
  PermissionKey,
  { label: string; description: string; elevating?: boolean }
> = {
  'admin.access': {
    label: 'Open Administration',
    description: 'View the administration hub and non-sensitive settings.',
    elevating: true,
  },
  'users.manage': {
    label: 'Manage users',
    description: 'Invite, activate, and disable users.',
    elevating: true,
  },
  'roles.assign': {
    label: 'Assign roles',
    description: 'Assign roles within the approved catalog.',
    elevating: true,
  },
  'clients.access.manage': {
    label: 'Manage client access',
    description: 'Grant or revoke client workspace access for staff.',
  },
  'reference.edit': {
    label: 'Edit reference data',
    description: 'Maintain statuses, categories, and pick-list values.',
  },
  'settings.app': {
    label: 'Application settings',
    description: 'Nontechnical product preferences (locale, naming, defaults).',
  },
  'settings.financial': {
    label: 'Financial settings',
    description: 'Currency, fee display, and finance defaults.',
  },
  'settings.capital': {
    label: 'Capital-advisory settings',
    description: 'Capital desk defaults and advisory preferences.',
  },
  'settings.eva': {
    label: 'Enterprise-value assumptions',
    description: 'Default EVA multipliers and assumption labels.',
  },
  'settings.ai': {
    label: 'AI settings',
    description: 'AI queue and insight preferences (no model keys).',
  },
  'feature.flags': {
    label: 'Feature flags',
    description: 'Enable or disable approved product features.',
    elevating: true,
  },
  'integrations.view': {
    label: 'Review integrations',
    description: 'View integration health and failed runs (no credentials).',
  },
  'audit.view': {
    label: 'View audit history',
    description: 'Read administrative change history.',
  },
  'notifications.configure': {
    label: 'Notification preferences',
    description: 'Configure reminder and alert preferences.',
  },
  'workflow.configure': {
    label: 'Workflow settings',
    description: 'Escalation and automation preference toggles.',
  },
};

export const ALL_PERMISSION_KEYS = Object.keys(PERMISSION_CATALOG) as PermissionKey[];

export interface Organization {
  id: string;
  name: string;
  code: string;
  active: boolean;
}

export interface BusinessUnit {
  id: string;
  organizationId: string;
  name: string;
  active: boolean;
}

export interface Team {
  id: string;
  name: string;
  businessUnitId: string;
  memberUserIds: string[];
}

export interface Role {
  id: string;
  name: string;
  entraGroup: string;
  description: string;
  permissionKeys: PermissionKey[];
  /** Only Owner may assign this role */
  ownerOnlyAssign?: boolean;
}

export interface AdminUser {
  id: string;
  displayName: string;
  email: string;
  status: UserStatus;
  roleIds: string[];
  organizationIds: string[];
  clientCodes: string[];
  teamIds: string[];
}

export interface ClientAccessGrant {
  id: string;
  clientCode: string;
  clientName: string;
  userId: string;
  accessLevel: 'Read' | 'Contribute' | 'Manage';
}

export interface ReferenceItem {
  id: string;
  label: string;
  code: string;
  sortOrder: number;
  active: boolean;
  /** Optional group for statuses (e.g. client / project) */
  group?: string;
}

export interface FeatureFlagDef {
  key: string;
  label: string;
  description: string;
  /** Enabling requires danger confirmation */
  highImpact: boolean;
  impactSummary: string;
  value: boolean;
  safeDefault: boolean;
}

export interface NotificationPreferences {
  renewalReminderDays: number[];
  documentReminderBusinessDays: number[];
  emailDigestEnabled: boolean;
  executiveEscalationAlerts: boolean;
  teamsNotifyEnabled: boolean;
}

export interface WorkflowSettings {
  autoCreateRenewalTasks: boolean;
  requireExecutiveClearForAttention: boolean;
  blockLiveClientComms: boolean;
  escalationRuleKeys: string[];
}

export interface FinancialSettings {
  currency: string;
  showSuccessFeesToNonFinance: boolean;
  invoiceDueDaysDefault: number;
  retainersVisibleToOps: boolean;
}

export interface CapitalAdvisorySettings {
  deskEnabled: boolean;
  defaultPackageType: string;
  requireOwnerForLenderOutreach: boolean;
}

export interface EvaAssumptions {
  defaultRevenueMultiple: number;
  defaultEbitdaMultiple: number;
  discountRatePercent: number;
  assumptionNotes: string;
}

export interface AiSettings {
  queuesEnabled: boolean;
  allowPromptLibraryEdit: boolean;
  showCostTrackingToOps: boolean;
  /** Never store API keys here */
  notes: string;
}

export interface ApplicationSettings {
  productName: string;
  companyShortName: string;
  timeZone: string;
  locale: string;
  namingPrefix: string;
}

export interface IntegrationStatus {
  id: string;
  name: string;
  status: 'Healthy' | 'Degraded' | 'Failed' | 'Disabled';
  lastCheckedAt: string;
  lastFailureMessage?: string;
  failedRunCount: number;
  /** Credentials never exposed */
  secretsConfigured: boolean;
}

export interface AuditEvent {
  id: string;
  at: string;
  actor: string;
  areaId: string;
  action: string;
  summary: string;
  before?: string;
  after?: string;
  highImpact: boolean;
}

export interface AdminState {
  organizations: Organization[];
  businessUnits: BusinessUnit[];
  teams: Team[];
  roles: Role[];
  users: AdminUser[];
  clientAccess: ClientAccessGrant[];
  statuses: ReferenceItem[];
  categories: ReferenceItem[];
  referralSources: ReferenceItem[];
  serviceTypes: ReferenceItem[];
  engagementTypes: ReferenceItem[];
  documentCategories: ReferenceItem[];
  featureFlags: FeatureFlagDef[];
  notifications: NotificationPreferences;
  workflow: WorkflowSettings;
  financial: FinancialSettings;
  capital: CapitalAdvisorySettings;
  eva: EvaAssumptions;
  ai: AiSettings;
  application: ApplicationSettings;
  integrations: IntegrationStatus[];
  audit: AuditEvent[];
}

export type AdminAreaId =
  | 'organizations'
  | 'clients'
  | 'users'
  | 'roles'
  | 'permissions'
  | 'teams'
  | 'business-units'
  | 'status-values'
  | 'categories'
  | 'referral-sources'
  | 'service-types'
  | 'engagement-types'
  | 'notification-preferences'
  | 'workflow-settings'
  | 'document-categories'
  | 'financial-settings'
  | 'capital-advisory-settings'
  | 'enterprise-value-assumptions'
  | 'ai-settings'
  | 'integrations'
  | 'feature-flags'
  | 'audit-history'
  | 'application-settings';

export type AdminAreaGroup =
  | 'People & access'
  | 'Reference data'
  | 'Configuration'
  | 'Operations'
  | 'System';

export interface AdminAreaMeta {
  id: AdminAreaId;
  title: string;
  description: string;
  impact: string;
  group: AdminAreaGroup;
  systemConfig: boolean;
  keywords: string[];
}
