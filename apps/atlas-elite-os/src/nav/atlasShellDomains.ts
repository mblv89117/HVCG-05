/**
 * Wave 6 — unified Atlas shell domain map.
 * Commercial module names remain labels; this is the operator IA.
 */
export const ATLAS_SHELL_DOMAINS = [
  { id: 'executive_home', label: 'Executive Home' },
  { id: 'client_360', label: 'Client 360' },
  { id: 'projects', label: 'Projects' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'documents', label: 'Documents' },
  { id: 'communications', label: 'Communications' },
  { id: 'approvals', label: 'Approvals' },
  { id: 'financial_intelligence', label: 'Financial Intelligence', moduleLabel: 'GCC' },
  { id: 'ai_cfo', label: 'AI CFO' },
  { id: 'business_mri', label: 'Business MRI', moduleLabel: 'Copilot' },
  { id: 'opportunity_map', label: 'Opportunity Map' },
  { id: 'growth', label: 'Growth', moduleLabel: '360' },
  { id: 'campaigns', label: 'Campaigns', moduleLabel: '360' },
  { id: 'leads', label: 'Leads' },
  { id: 'capital', label: 'Capital' },
  { id: 'research', label: 'Research' },
  { id: 'workflows', label: 'Workflows' },
  { id: 'agent_activity', label: 'Agent Activity' },
  { id: 'ask_atlas', label: 'Ask Atlas' },
  { id: 'admin', label: 'Admin' },
  { id: 'entitlements', label: 'Entitlements' },
  { id: 'reporting', label: 'Reporting' },
] as const;

export const COMMERCIAL_NAME_POLICY = {
  competingPlatformsForbidden: true,
  preserveSeoEquity: [
    'growthcommandcenter.com',
    'getagentcopilot.com',
    '360growthsolution.com',
    'highvaluecapitalgroup.com',
  ],
} as const;
