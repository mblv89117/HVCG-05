/** Atlas Control Center — area catalog (consolidates existing admin; no new business features). */

import type { AtlasProductRole } from '../../security/rbac';
import type { AdminAreaMeta, ControlCenterAreaId, ControlCenterGroup } from './types';

export type { ControlCenterAreaId, ControlCenterGroup };

/** Primary Control Center areas — unified navigation. */
export const CONTROL_CENTER_AREAS: AdminAreaMeta[] = [
  {
    id: 'organizations',
    title: 'Organizations',
    description: 'Firm organizations and business units.',
    impact: 'Affects how users and teams are grouped.',
    group: 'Identity & access',
    systemConfig: true,
    keywords: ['org', 'entity', 'business unit', 'firm'],
    visibility: 'admin',
  },
  {
    id: 'users',
    title: 'Users',
    description: 'Invite, activate, and disable Atlas users.',
    impact: 'Controls who can sign in and hold roles.',
    group: 'Identity & access',
    systemConfig: true,
    keywords: ['user', 'invite', 'disable', 'staff'],
    visibility: 'admin',
  },
  {
    id: 'teams',
    title: 'Teams',
    description: 'Working groups inside business units.',
    impact: 'Team membership can drive assignments and filters.',
    group: 'Identity & access',
    systemConfig: false,
    keywords: ['team', 'group', 'members'],
    visibility: 'admin',
  },
  {
    id: 'roles-permissions',
    title: 'Roles & Permissions',
    description: 'Entra-mapped roles and the approved permission catalog.',
    impact: 'Changes what people can do across Atlas. No unrestricted grants.',
    group: 'Identity & access',
    systemConfig: true,
    keywords: ['role', 'permission', 'rbac', 'entra', 'capability'],
    visibility: 'admin',
  },
  {
    id: 'clients',
    title: 'Clients',
    description: 'Client workspace access grants and client stage reference values.',
    impact: 'Controls which staff can open client workspaces.',
    group: 'Delivery',
    systemConfig: true,
    keywords: ['client', 'workspace', 'access', 'stage', 'referral'],
    visibility: 'admin',
  },
  {
    id: 'projects',
    title: 'Projects',
    description: 'Project health rules and delivery reference values already defined for Atlas.',
    impact: 'Does not create projects — surfaces existing project administration settings.',
    group: 'Delivery',
    systemConfig: false,
    keywords: ['project', 'health', 'engagement', 'service', 'category'],
    visibility: 'admin',
  },
  {
    id: 'ai-agents',
    title: 'AI Agents',
    description: 'AI queue and agent-related feature toggles already approved for Atlas.',
    impact: 'Controls visibility of AI queues and Copilot Studio — no new agents invented here.',
    group: 'Intelligence',
    systemConfig: true,
    keywords: ['ai', 'agent', 'queue', 'copilot'],
    visibility: 'admin',
  },
  {
    id: 'automation-registry',
    title: 'Automation Registry',
    description: 'Workflow preferences and Power Automate connection health.',
    impact: 'Consolidates existing workflow settings and automation integration status.',
    group: 'Intelligence',
    systemConfig: true,
    keywords: ['automation', 'workflow', 'power automate', 'flow'],
    visibility: 'admin',
  },
  {
    id: 'knowledge-platform',
    title: 'Knowledge Platform',
    description: 'Document categories and knowledge library administration entry points.',
    impact: 'Does not rename SharePoint folders automatically.',
    group: 'Intelligence',
    systemConfig: false,
    keywords: ['knowledge', 'document', 'sop', 'folder', 'category'],
    visibility: 'admin',
  },
  {
    id: 'integrations',
    title: 'Integrations',
    description: 'Health of connected Microsoft services. Credentials never shown.',
    impact: 'Review failures; rotate secrets in Entra or Key Vault.',
    group: 'Platform',
    systemConfig: true,
    keywords: ['integration', 'connector', 'failed', 'graph'],
    visibility: 'admin',
  },
  {
    id: 'azure-resources',
    title: 'Azure Resources',
    description: 'Public Azure / hosting configuration already used by Elite OS.',
    impact: 'Read-only consolidation of environment URLs and public IDs — no secret fields.',
    group: 'Platform',
    systemConfig: true,
    keywords: ['azure', 'swa', 'hosting', 'subscription', 'environment'],
    visibility: 'admin',
  },
  {
    id: 'dataverse',
    title: 'Dataverse',
    description: 'Dataverse environment URL and model-driven Command Center entry.',
    impact: 'Advanced table grids stay in the model-driven app — not duplicated here.',
    group: 'Platform',
    systemConfig: true,
    keywords: ['dataverse', 'model-driven', 'command center', 'crm'],
    visibility: 'admin',
  },
  {
    id: 'sharepoint',
    title: 'SharePoint',
    description: 'SharePoint site URL used by Atlas documents.',
    impact: 'Read-only site configuration from existing Elite OS environment settings.',
    group: 'Platform',
    systemConfig: true,
    keywords: ['sharepoint', 'site', 'library', 'documents'],
    visibility: 'admin',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Firm notification preferences and link to the executive notification inbox.',
    impact: 'Consolidates admin preferences with the existing notifications module.',
    group: 'Experience',
    systemConfig: false,
    keywords: ['notification', 'alert', 'reminder', 'digest'],
    visibility: 'admin',
  },
  {
    id: 'branding',
    title: 'Branding',
    description: 'Product name, company short name, locale, and naming prefix.',
    impact: 'Affects display labels across Atlas — same application settings as before.',
    group: 'Experience',
    systemConfig: true,
    keywords: ['brand', 'logo', 'name', 'locale', 'timezone', 'prefix'],
    visibility: 'admin',
  },
  {
    id: 'licensing',
    title: 'Licensing',
    description: 'Premium connector and portal-related feature flags that affect licensing posture.',
    impact: 'Surfaces existing feature flags only — does not invent SKUs or billing.',
    group: 'Experience',
    systemConfig: true,
    keywords: ['license', 'premium', 'power pages', 'connector', 'flag'],
    visibility: 'admin',
  },
  {
    id: 'security-center',
    title: 'Security Center',
    description: 'Permission catalog, live-comms safety block, and admin access posture.',
    impact: 'Consolidates existing security controls — does not weaken Entra authentication.',
    group: 'Governance',
    systemConfig: true,
    keywords: ['security', 'rbac', 'permission', 'comms block', 'least privilege'],
    visibility: 'admin',
  },
  {
    id: 'ai-governance',
    title: 'AI Governance',
    description: 'AI settings and governance-related toggles (queues, prompts, cost visibility).',
    impact: 'API keys are never managed here. Aligns with AI Governance specialist scope.',
    group: 'Governance',
    systemConfig: true,
    keywords: ['ai governance', 'prompt', 'cost', 'policy', 'queue'],
    visibility: 'admin',
  },
  {
    id: 'audit-center',
    title: 'Audit Center',
    description: 'Read-only administrative change history.',
    impact: 'View only. Complete trail of Control Center mutations in this session.',
    group: 'Governance',
    systemConfig: true,
    keywords: ['audit', 'log', 'history', 'trail'],
    visibility: 'admin',
  },
  {
    id: 'release-center',
    title: 'Release Center',
    description: 'Environment banner, production gates, and live-comms release posture.',
    impact: 'Read-only consolidation of existing environment gates — no self-release.',
    group: 'Operations',
    systemConfig: true,
    keywords: ['release', 'production', 'gate', 'staging', 'owner'],
    visibility: 'admin',
  },
  {
    id: 'system-health',
    title: 'System Health',
    description: 'Environment status, Entra configuration presence, and integration health.',
    impact: 'Operational dashboard over existing signals — no new monitoring product.',
    group: 'Operations',
    systemConfig: true,
    keywords: ['health', 'status', 'monitor', 'entra', 'uptime'],
    visibility: 'admin',
  },
];

/**
 * Legacy area IDs → Control Center area (no duplicated hubs).
 * Keeps bookmarks working without maintaining parallel config UIs.
 */
export const AREA_ALIASES: Record<string, ControlCenterAreaId> = {
  organizations: 'organizations',
  users: 'users',
  teams: 'teams',
  roles: 'roles-permissions',
  permissions: 'roles-permissions',
  'roles-permissions': 'roles-permissions',
  clients: 'clients',
  projects: 'projects',
  'business-units': 'organizations',
  'status-values': 'clients',
  categories: 'projects',
  'referral-sources': 'clients',
  'service-types': 'projects',
  'engagement-types': 'projects',
  'document-categories': 'knowledge-platform',
  'notification-preferences': 'notifications',
  notifications: 'notifications',
  'workflow-settings': 'automation-registry',
  'automation-registry': 'automation-registry',
  'financial-settings': 'security-center',
  'capital-advisory-settings': 'security-center',
  'enterprise-value-assumptions': 'security-center',
  'ai-settings': 'ai-governance',
  'ai-agents': 'ai-agents',
  'ai-governance': 'ai-governance',
  integrations: 'integrations',
  'azure-resources': 'azure-resources',
  dataverse: 'dataverse',
  sharepoint: 'sharepoint',
  branding: 'branding',
  'application-settings': 'branding',
  'feature-flags': 'licensing',
  licensing: 'licensing',
  'security-center': 'security-center',
  'audit-history': 'audit-center',
  'audit-center': 'audit-center',
  'release-center': 'release-center',
  'system-health': 'system-health',
  'knowledge-platform': 'knowledge-platform',
};

export const GROUP_ORDER: ControlCenterGroup[] = [
  'Identity & access',
  'Delivery',
  'Intelligence',
  'Platform',
  'Experience',
  'Governance',
  'Operations',
];

/** @deprecated Use CONTROL_CENTER_AREAS */
export const ADMIN_AREAS = CONTROL_CENTER_AREAS;

export function resolveAreaId(raw: string): ControlCenterAreaId | undefined {
  return AREA_ALIASES[raw];
}

export function getArea(id: string): AdminAreaMeta | undefined {
  const resolved = resolveAreaId(id);
  if (!resolved) return undefined;
  return CONTROL_CENTER_AREAS.find((a) => a.id === resolved);
}

export function searchAreas(query: string, visibleOnly?: AdminAreaMeta[]): AdminAreaMeta[] {
  const source = visibleOnly || CONTROL_CENTER_AREAS;
  const q = query.trim().toLowerCase();
  if (!q) return source;
  return source.filter(
    (a) =>
      a.title.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.keywords.some((k) => k.includes(q)) ||
      a.group.toLowerCase().includes(q),
  );
}

export function areasForRole(productRole: AtlasProductRole): AdminAreaMeta[] {
  // Control Center itself is admin-gated; all listed areas use visibility: admin today.
  // Hook retained for future per-area refinement without duplicating config.
  return CONTROL_CENTER_AREAS.filter((a) => {
    if (a.visibility === 'admin') {
      return productRole === 'HVCG Owner' || productRole === 'Administrator';
    }
    return true;
  });
}
