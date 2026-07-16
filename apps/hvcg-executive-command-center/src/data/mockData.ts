import type { CommandCenterData, DashboardId, Role } from '../types'

export const roleDashboardAccess: Record<Role, DashboardId[]> = {
  Owner: ['overview', 'revenue', 'clients', 'operations', 'financial', 'ai', 'notifications'],
  Executive: ['overview', 'revenue', 'clients', 'operations', 'financial', 'ai', 'notifications'],
  Advisor: ['overview', 'revenue', 'clients', 'ai', 'notifications'],
  Operations: ['overview', 'clients', 'operations', 'ai', 'notifications'],
  Finance: ['overview', 'revenue', 'financial', 'ai', 'notifications'],
  Assistant: ['overview', 'clients', 'operations', 'notifications'],
}

const leadershipRoles: Role[] = ['Owner', 'Executive']
const financeRoles: Role[] = ['Owner', 'Executive', 'Finance']
const allInternalRoles: Role[] = ['Owner', 'Executive', 'Advisor', 'Operations', 'Finance', 'Assistant']

export const mockData: CommandCenterData = {
  generatedAt: '2026-07-16T12:30:00-07:00',
  tenantId: 'hvcg-internal',
  tenantName: 'High Value Capital Group',
  overviewMetrics: [
    { id: 'pipeline', label: 'Revenue pipeline', value: '$2.48M', detail: '14 open opportunities', trend: '+12.4%', trendDirection: 'up', tone: 'positive' },
    { id: 'qualified', label: 'Qualified prospects', value: '18', detail: '6 need owner action', trend: '+3 this week', trendDirection: 'up', tone: 'accent' },
    { id: 'clients', label: 'Active clients', value: '24', detail: '21 healthy · 3 watch', trend: '87.5% green', trendDirection: 'flat', tone: 'positive' },
    { id: 'engagements', label: 'Active engagements', value: '31', detail: '8 milestones this week', trend: '2 at risk', trendDirection: 'flat', tone: 'warning' },
    { id: 'funding', label: 'Funding pipeline', value: '$8.9M', detail: '7 active raises', trend: '+$1.2M', trendDirection: 'up', tone: 'positive' },
    { id: 'cash', label: 'Cash collected', value: '$184K', detail: 'Month to date', trend: '91% of plan', trendDirection: 'up', tone: 'positive', allowedRoles: financeRoles },
    { id: 'invoices', label: 'Outstanding invoices', value: '$72.4K', detail: '9 invoices · 3 past due', trend: '$18K past due', trendDirection: 'down', tone: 'critical', allowedRoles: financeRoles },
    { id: 'tasks', label: 'Tasks due today', value: '17', detail: '5 assigned to leadership', trend: '4 overdue', trendDirection: 'down', tone: 'warning' },
    { id: 'meetings', label: 'Meetings today', value: '8', detail: '3 external · 5 internal', trend: 'Next at 1:30 PM', trendDirection: 'flat' },
  ],
  revenueMetrics: [
    { id: 'pipeline-value', label: 'Pipeline value', value: '$2.48M', detail: 'Open opportunity value', trend: '+12.4%', trendDirection: 'up', tone: 'positive' },
    { id: 'weighted-forecast', label: 'Weighted forecast', value: '$1.36M', detail: 'Probability adjusted', trend: '+8.2%', trendDirection: 'up', tone: 'positive' },
    { id: 'assessment', label: 'Assessment completion', value: '74%', detail: '28 of 38 qualified', trend: '+6 pts', trendDirection: 'up', tone: 'accent' },
    { id: 'conversion', label: 'Conversion rate', value: '31.8%', detail: 'Qualified to won · 90d', trend: '+2.7 pts', trendDirection: 'up', tone: 'positive' },
  ],
  financialMetrics: [
    { id: 'monthly-revenue', label: 'Monthly revenue', value: '$226K', detail: 'Recognized this month', trend: '+9.1%', trendDirection: 'up', tone: 'positive' },
    { id: 'mrr', label: 'MRR', value: '$148K', detail: 'Recurring retainers', trend: '+$11K', trendDirection: 'up', tone: 'positive' },
    { id: 'arr', label: 'ARR', value: '$1.78M', detail: 'Annualized run rate', trend: '+7.8%', trendDirection: 'up', tone: 'positive' },
    { id: 'retainers', label: 'Retainers', value: '$162K', detail: 'Billed this month', trend: '96% collected', trendDirection: 'up', tone: 'accent' },
    { id: 'success-fees', label: 'Success fees', value: '$78K', detail: 'Expected next 90 days', trend: '$24K committed', trendDirection: 'flat', tone: 'accent' },
    { id: 'ar', label: 'Outstanding AR', value: '$72.4K', detail: '3 past-due invoices', trend: '-$9.8K', trendDirection: 'up', tone: 'warning' },
    { id: 'expenses', label: 'Expenses', value: '$64.2K', detail: 'Month to date', trend: '72% of budget', trendDirection: 'flat' },
    { id: 'cash-position', label: 'Cash position', value: '$412K', detail: 'Mock operating cash', trend: '1.8 months runway', trendDirection: 'flat', tone: 'positive' },
  ],
  opportunities: [
    { id: 'OPP-2041', company: 'Summit Infrastructure', service: 'Capital Raise', stage: 'Negotiation', value: 620000, weighted: 496000, probability: 80, source: 'Referral Partner', owner: 'Manny Barela', nextAction: 'Finalize term structure', risk: 'Low' },
    { id: 'OPP-2037', company: 'Apex Medical Group', service: 'Fractional CFO', stage: 'Proposal', value: 360000, weighted: 234000, probability: 65, source: 'Executive Network', owner: 'Elena Ruiz', nextAction: 'Decision meeting Friday', risk: 'Medium' },
    { id: 'OPP-2052', company: 'Northstar Logistics', service: 'M&A Advisory', stage: 'Assessment', value: 510000, weighted: 229500, probability: 45, source: 'Website Assessment', owner: 'Manny Barela', nextAction: 'Complete valuation inputs', risk: 'High' },
    { id: 'OPP-2048', company: 'Cobalt Consumer', service: 'Growth Advisory', stage: 'Proposal', value: 285000, weighted: 171000, probability: 60, source: 'Client Referral', owner: 'Sarah Kim', nextAction: 'Resolve scope question', risk: 'Medium' },
    { id: 'OPP-2031', company: 'Redwood Manufacturing', service: 'Capital Readiness', stage: 'Discovery', value: 420000, weighted: 105000, probability: 25, source: 'Event', owner: 'Darius Cole', nextAction: 'Schedule owner interview', risk: 'Low' },
  ],
  clients: [
    { id: 'CL-101', code: 'SUM01', name: 'Summit Infrastructure', engagement: 'Capital Advisory', engagementStatus: 'In execution', health: 'Green', documentsOutstanding: 2, fundingProgress: 72, advisor: 'Elena Ruiz', openTasks: 4, nextMeeting: 'Today · 2:00 PM', recentActivity: 'Lender package advanced to final review' },
    { id: 'CL-102', code: 'APX02', name: 'Apex Medical Group', engagement: 'Fractional CFO', engagementStatus: 'On track', health: 'Green', documentsOutstanding: 0, fundingProgress: 0, advisor: 'Darius Cole', openTasks: 3, nextMeeting: 'Jul 17 · 10:30 AM', recentActivity: 'June board package delivered' },
    { id: 'CL-103', code: 'NTH03', name: 'Northstar Logistics', engagement: 'Exit Readiness', engagementStatus: 'Needs attention', health: 'Red', documentsOutstanding: 7, fundingProgress: 38, advisor: 'Sarah Kim', openTasks: 9, nextMeeting: 'Today · 4:00 PM', recentActivity: 'Financial model blocked on missing statements' },
    { id: 'CL-104', code: 'COB04', name: 'Cobalt Consumer', engagement: 'Growth Advisory', engagementStatus: 'At risk', health: 'Yellow', documentsOutstanding: 4, fundingProgress: 54, advisor: 'Elena Ruiz', openTasks: 6, nextMeeting: 'Jul 18 · 9:00 AM', recentActivity: 'Scope change submitted for approval' },
    { id: 'CL-105', code: 'RED05', name: 'Redwood Manufacturing', engagement: 'Capital Readiness', engagementStatus: 'On track', health: 'Green', documentsOutstanding: 1, fundingProgress: 61, advisor: 'Darius Cole', openTasks: 2, nextMeeting: 'Jul 21 · 1:00 PM', recentActivity: 'Data room completeness reached 84%' },
  ],
  notifications: [
    { id: 'N-001', domain: 'Approvals', title: 'Pricing exception requires owner approval', detail: 'Northstar Logistics · $18K variance from approved floor', timestamp: '12 min ago', severity: 'Critical', read: false, allowedRoles: leadershipRoles },
    { id: 'N-002', domain: 'Revenue', title: 'Summit moved to negotiation', detail: '$620K capital advisory opportunity', timestamp: '28 min ago', severity: 'Action', read: false, allowedRoles: ['Owner', 'Executive', 'Advisor', 'Finance'] },
    { id: 'N-003', domain: 'Finance', title: 'Invoice is 14 days past due', detail: 'Cobalt Consumer · $12,800 outstanding', timestamp: '47 min ago', severity: 'Action', read: false, allowedRoles: financeRoles },
    { id: 'N-004', domain: 'Operations', title: 'Sprint QA completed', detail: 'Executive Command Center mock release candidate', timestamp: '1 hr ago', severity: 'Info', read: true, allowedRoles: ['Owner', 'Executive', 'Operations', 'Assistant'] },
    { id: 'N-005', domain: 'CRM', title: 'Assessment follow-up overdue', detail: 'Northstar Logistics · owner response needed', timestamp: '2 hrs ago', severity: 'Action', read: false, allowedRoles: ['Owner', 'Executive', 'Advisor', 'Assistant'] },
    { id: 'N-006', domain: 'Portal', title: 'Seven documents uploaded', detail: 'Summit Infrastructure secure workspace', timestamp: '3 hrs ago', severity: 'Info', read: true, allowedRoles: ['Owner', 'Executive', 'Advisor', 'Operations', 'Assistant'] },
  ],
  activities: [
    { id: 'A-1', actor: 'Elena Ruiz', action: 'advanced', subject: 'Summit lender package', timestamp: '11:42 AM', domain: 'Client' },
    { id: 'A-2', actor: 'Finance Ops', action: 'recorded', subject: '$24,500 retainer payment', timestamp: '10:16 AM', domain: 'Finance' },
    { id: 'A-3', actor: 'EVA', action: 'qualified', subject: 'Apex Medical Group assessment', timestamp: '9:34 AM', domain: 'AI' },
    { id: 'A-4', actor: 'Sarah Kim', action: 'submitted', subject: 'Cobalt scope change', timestamp: '8:52 AM', domain: 'Operations' },
    { id: 'A-5', actor: 'System', action: 'completed', subject: 'nightly dashboard refresh', timestamp: '6:00 AM', domain: 'System' },
  ],
  pipelineByStage: [
    { label: 'Discovery', value: 420000, displayValue: '$420K' },
    { label: 'Assessment', value: 510000, displayValue: '$510K' },
    { label: 'Proposal', value: 645000, displayValue: '$645K' },
    { label: 'Negotiation', value: 620000, displayValue: '$620K' },
    { label: 'Verbal commit', value: 285000, displayValue: '$285K' },
  ],
  revenueForecast: [
    { label: 'Jul', value: 226000, displayValue: '$226K', secondary: 210000 },
    { label: 'Aug', value: 248000, displayValue: '$248K', secondary: 230000 },
    { label: 'Sep', value: 281000, displayValue: '$281K', secondary: 255000 },
    { label: 'Oct', value: 305000, displayValue: '$305K', secondary: 278000 },
    { label: 'Nov', value: 322000, displayValue: '$322K', secondary: 295000 },
    { label: 'Dec', value: 348000, displayValue: '$348K', secondary: 318000 },
  ],
  monthlyRevenue: [
    { label: 'Feb', value: 164000, displayValue: '$164K' },
    { label: 'Mar', value: 179000, displayValue: '$179K' },
    { label: 'Apr', value: 188000, displayValue: '$188K' },
    { label: 'May', value: 205000, displayValue: '$205K' },
    { label: 'Jun', value: 214000, displayValue: '$214K' },
    { label: 'Jul', value: 226000, displayValue: '$226K' },
  ],
  leadSources: [
    { label: 'Referral partners', value: 38 },
    { label: 'Executive network', value: 24 },
    { label: 'Website assessment', value: 18 },
    { label: 'Client referral', value: 13 },
    { label: 'Events', value: 7 },
  ],
  fundingPipeline: [
    { label: 'Readiness', value: 1700000, displayValue: '$1.7M' },
    { label: 'Lender outreach', value: 2400000, displayValue: '$2.4M' },
    { label: 'Diligence', value: 2100000, displayValue: '$2.1M' },
    { label: 'Term sheet', value: 1600000, displayValue: '$1.6M' },
    { label: 'Closing', value: 1100000, displayValue: '$1.1M' },
  ],
  expenses: [
    { label: 'Contractors', value: 24200, displayValue: '$24.2K' },
    { label: 'Payroll', value: 18500, displayValue: '$18.5K' },
    { label: 'Software', value: 9100, displayValue: '$9.1K' },
    { label: 'Marketing', value: 7400, displayValue: '$7.4K' },
    { label: 'Other', value: 5000, displayValue: '$5.0K' },
  ],
  agentStatuses: [
    { name: 'Master PM', workstream: 'Project Atlas', status: 'Ready', heartbeat: '2 min ago' },
    { name: 'Revenue Systems', workstream: 'Phase 1 Sprints 1–4', status: 'Frozen', heartbeat: 'Complete' },
    { name: 'Client Portal', workstream: 'Sprint 1', status: 'Ready', heartbeat: 'Complete' },
    { name: 'Executive Engineer', workstream: 'Command Center Sprint 1', status: 'In progress', heartbeat: 'Just now' },
    { name: 'QA Release', workstream: 'RC-1', status: 'Frozen', heartbeat: 'Locked' },
  ],
}
