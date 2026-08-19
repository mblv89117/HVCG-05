/**
 * Read-only compatibility adapter for Revenue Sprint 4's
 * window.HVCG_EVA_EXEC_REVENUE model. It performs no storage or network IO.
 */
export interface RevenueDashboardModel {
  generated_at: string
  environment_intent: string
  kpis: {
    leads: number
    evas_started: number
    evas_completed: number
    qualified_leads: number
    proposals_sent: number
    deals_won: number
    mrr: number
    revenue_forecast: number
    pipeline_value: number
    owner_tasks: number
    outstanding_approvals: number
  }
  owner_task_queue: unknown[]
  outstanding_approval_queue: unknown[]
  source: string
}

const numericKeys = [
  'leads', 'evas_started', 'evas_completed', 'qualified_leads', 'proposals_sent',
  'deals_won', 'mrr', 'revenue_forecast', 'pipeline_value', 'owner_tasks',
  'outstanding_approvals',
] as const

export function validateRevenueModel(value: unknown): value is RevenueDashboardModel {
  if (!value || typeof value !== 'object') return false
  const model = value as Partial<RevenueDashboardModel>
  if (model.environment_intent !== 'Development' || !model.kpis || typeof model.kpis !== 'object') return false
  const kpis = model.kpis
  return numericKeys.every((key) => Number.isFinite(kpis[key]))
}

export function readRevenueModel(value: unknown): RevenueDashboardModel | null {
  return validateRevenueModel(value) ? structuredClone(value) : null
}
