import type { CommandCenterData, DashboardId, Role } from '../types'
import { GENERATED_AT, atlasSources } from './verifiedSources'

export const roleDashboardAccess: Record<Role, DashboardId[]> = {
  Owner: ['overview', 'revenue', 'clients', 'operations', 'financial', 'ai', 'intelligence', 'notifications'],
  Executive: ['overview', 'revenue', 'clients', 'operations', 'financial', 'ai', 'intelligence', 'notifications'],
  Advisor: ['overview', 'revenue', 'clients', 'ai', 'intelligence', 'notifications'],
  Operations: ['overview', 'clients', 'operations', 'ai', 'intelligence', 'notifications'],
  Finance: ['overview', 'revenue', 'financial', 'ai', 'intelligence', 'notifications'],
  Assistant: ['overview', 'clients', 'operations', 'notifications'],
}

const leadershipRoles: Role[] = ['Owner', 'Executive']
const financeRoles: Role[] = ['Owner', 'Executive', 'Finance']
const awaiting = 'Awaiting verified source'

/**
 * Portfolio metrics: Atlas-verified operating posture where available;
 * financial/pipeline dollars remain unbound until Finance Intelligence / Dataverse bind.
 */
export const mockData: CommandCenterData = {
  generatedAt: GENERATED_AT,
  tenantId: 'hvcg-internal',
  tenantName: 'High Value Capital Group',
  overviewMetrics: [
    { id: 'pipeline', label: 'Revenue pipeline', value: awaiting, detail: 'Unbound until Revenue OS live feed', tone: 'warning' },
    { id: 'qualified', label: 'Qualified prospects', value: awaiting, detail: 'CRM count pending verified bind', tone: 'warning' },
    { id: 'clients', label: 'Active clients', value: '1+', detail: 'CCB verified in portfolio · others pending bind', trend: 'Verified relationship present', trendDirection: 'flat', tone: 'positive' },
    { id: 'engagements', label: 'Active engagements', value: awaiting, detail: 'Engagement rollup pending verified source', tone: 'warning' },
    { id: 'funding', label: 'Funding pipeline', value: awaiting, detail: 'Capital amounts pending verification', tone: 'warning' },
    { id: 'cash', label: 'Cash collected', value: awaiting, detail: 'Finance Intelligence unbound', tone: 'warning', allowedRoles: financeRoles },
    { id: 'invoices', label: 'Outstanding invoices', value: awaiting, detail: 'AR aging pending verified source', tone: 'warning', allowedRoles: financeRoles },
    { id: 'tasks', label: 'Tasks due today', value: awaiting, detail: 'Task system bind pending', tone: 'warning' },
    { id: 'meetings', label: 'Meetings today', value: '1+', detail: 'CCB Blueprint briefing scheduled (verified agenda)', trend: 'CCB meeting-ready', trendDirection: 'flat', tone: 'accent' },
  ],
  revenueMetrics: [
    { id: 'pipeline-value', label: 'Pipeline value', value: awaiting, detail: 'No live opportunity dollars bound', tone: 'warning' },
    { id: 'weighted-forecast', label: 'Weighted forecast', value: awaiting, detail: 'Forecast engine pending verified fees', tone: 'warning' },
    { id: 'assessment', label: 'Assessment completion', value: awaiting, detail: 'Assessment rollup pending', tone: 'warning' },
    { id: 'conversion', label: 'Conversion rate', value: awaiting, detail: 'Conversion metrics pending verified source', tone: 'warning' },
  ],
  financialMetrics: [
    { id: 'monthly-revenue', label: 'Monthly revenue', value: awaiting, detail: 'Finance Intelligence: not live-bound', tone: 'warning' },
    { id: 'mrr', label: 'MRR', value: awaiting, detail: 'Recurring revenue pending verified source', tone: 'warning' },
    { id: 'arr', label: 'ARR', value: awaiting, detail: 'Annualized run rate pending', tone: 'warning' },
    { id: 'retainers', label: 'Retainers', value: awaiting, detail: 'Retainer billing pending verified source', tone: 'warning' },
    { id: 'success-fees', label: 'Success fees', value: awaiting, detail: 'Success-fee amounts pending owner verification', tone: 'warning' },
    { id: 'ar', label: 'Outstanding AR', value: awaiting, detail: 'AR pending verified source', tone: 'warning' },
    { id: 'expenses', label: 'Expenses', value: awaiting, detail: 'OpEx pending verified source', tone: 'warning' },
    { id: 'cash-position', label: 'Cash position', value: awaiting, detail: 'Treasury pending verified source', tone: 'warning' },
  ],
  opportunities: [
    {
      id: 'OPP-CCB',
      company: 'Colorado Craft Beef',
      service: 'Capital Advisory',
      stage: 'Blueprint',
      value: 0,
      weighted: 0,
      probability: 40,
      source: 'Randy Kamin — Generational Group',
      owner: 'Manny Barela',
      nextAction: 'Collect verified financial package',
      risk: 'Medium',
    },
  ],
  clients: [
    {
      id: 'CL-CCB',
      code: 'CCB',
      name: 'Colorado Craft Beef',
      engagement: 'Capital Advisory',
      engagementStatus: 'Transitioning to HVCG',
      health: 'Green',
      documentsOutstanding: 0,
      fundingProgress: 0,
      advisor: 'Manny Barela',
      openTasks: 4,
      nextMeeting: 'Blueprint briefing',
      recentActivity: 'Blueprint presented · financial package pending verification',
    },
  ],
  notifications: [
    {
      id: 'N-001',
      domain: 'Approvals',
      title: 'Track 1 Production freeze remains in force',
      detail: `Verified Atlas · ${atlasSources[0].recordId}`,
      timestamp: 'Just now',
      severity: 'Critical',
      read: false,
      allowedRoles: leadershipRoles,
    },
    {
      id: 'N-002',
      domain: 'Revenue',
      title: 'CCB opportunity at Blueprint stage',
      detail: 'Fee amounts awaiting verified source — do not invent dollars',
      timestamp: 'Today',
      severity: 'Action',
      read: false,
      allowedRoles: ['Owner', 'Executive', 'Advisor', 'Finance'],
    },
    {
      id: 'N-003',
      domain: 'Finance',
      title: 'Portfolio financial KPIs unbound',
      detail: 'Finance Intelligence: HVCG/CCB dollars awaiting verified source',
      timestamp: 'Today',
      severity: 'Info',
      read: false,
      allowedRoles: financeRoles,
    },
    {
      id: 'N-004',
      domain: 'Operations',
      title: 'Executive Intelligence ready for dashboard merge',
      detail: 'Integration readiness package prepared for Elite UI Executive Home',
      timestamp: 'Today',
      severity: 'Info',
      read: true,
      allowedRoles: ['Owner', 'Executive', 'Operations', 'Assistant'],
    },
    {
      id: 'N-005',
      domain: 'CRM',
      title: 'CCB contact channels pending verification',
      detail: 'Jeff Smith named; email/phone awaiting verified source',
      timestamp: 'Today',
      severity: 'Action',
      read: false,
      allowedRoles: ['Owner', 'Executive', 'Advisor', 'Assistant'],
    },
    {
      id: 'N-006',
      domain: 'Portal',
      title: 'Client Portal Sprint 1 complete (isolated)',
      detail: 'Verified tip 8c8806b — not merged or deployed',
      timestamp: 'Prior',
      severity: 'Info',
      read: true,
      allowedRoles: ['Owner', 'Executive', 'Advisor', 'Operations', 'Assistant'],
    },
  ],
  activities: [
    { id: 'A-1', actor: 'Manny Barela', action: 'prepared', subject: 'CCB Blueprint meeting brief', timestamp: 'Today', domain: 'Client' },
    { id: 'A-2', actor: 'Atlas', action: 'confirmed', subject: 'Track 1 freeze posture', timestamp: 'Today', domain: 'System' },
    { id: 'A-3', actor: 'Executive Intelligence', action: 'labeled', subject: 'portfolio KPIs as awaiting verified source', timestamp: 'Today', domain: 'AI' },
    { id: 'A-4', actor: 'Revenue Systems', action: 'closed', subject: 'Sprint 4 Phase 1 (Dev/Staging)', timestamp: 'Prior', domain: 'Revenue' },
    { id: 'A-5', actor: 'System', action: 'refreshed', subject: 'executive intelligence source register', timestamp: 'Today', domain: 'System' },
  ],
  pipelineByStage: [
    { label: 'Blueprint (CCB)', value: 0, displayValue: awaiting },
  ],
  revenueForecast: [
    { label: 'Jul', value: 0, displayValue: awaiting },
    { label: 'Aug', value: 0, displayValue: awaiting },
    { label: 'Sep', value: 0, displayValue: awaiting },
  ],
  monthlyRevenue: [
    { label: 'May', value: 0, displayValue: awaiting },
    { label: 'Jun', value: 0, displayValue: awaiting },
    { label: 'Jul', value: 0, displayValue: awaiting },
  ],
  leadSources: [
    { label: 'Generational Group (CCB)', value: 1 },
    { label: 'Other sources', value: 0, displayValue: awaiting },
  ],
  fundingPipeline: [
    { label: 'CCB capital readiness', value: 0, displayValue: awaiting },
  ],
  expenses: [
    { label: 'Operating expenses', value: 0, displayValue: awaiting },
  ],
  agentStatuses: [
    { name: 'Master PM', workstream: 'Project Atlas', status: 'Ready', heartbeat: 'Active' },
    { name: 'Elite UI', workstream: 'Executive Dashboard', status: 'In progress', heartbeat: 'Merge target' },
    { name: 'Finance Intelligence', workstream: 'KPI bind', status: 'In progress', heartbeat: 'Awaiting verified source' },
    { name: 'Executive Intelligence', workstream: 'Integration readiness', status: 'Ready', heartbeat: 'Just now' },
    { name: 'Revenue Systems', workstream: 'Phase 1 Sprints 1–4', status: 'Frozen', heartbeat: 'Complete' },
  ],
}
