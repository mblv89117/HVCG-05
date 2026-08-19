/** Finance Intelligence domain types — every KPI carries provenance and comparison. */

export type Role = 'Owner' | 'Executive' | 'Finance' | 'Advisor' | 'Assistant'

export type OrganizationId = 'HVCG' | 'CCB' | 'CLIENT_WORKSPACE'

export type DataQuality =
  | 'Verified'
  | 'Repository-derived'
  | 'Mock demo'
  | 'Awaiting verified data'
  | 'Data connection pending'
  | 'Not yet calculated'

export type MetricStatus = 'Actual' | 'Budget' | 'Forecast' | 'Scenario' | 'Indicative' | 'Incomplete'

export type TrendDirection = 'up' | 'down' | 'flat' | 'unknown'

export type EvidenceKind = 'Verified' | 'AI interpretation' | 'Repository-derived' | 'Pending verification' | 'Mock demo'

export type AlertSeverity = 'Critical' | 'High' | 'Medium' | 'Low'

export type AlertKind =
  | 'Cash risk'
  | 'Receivables'
  | 'Margin'
  | 'Budget variance'
  | 'Forecast change'
  | 'Debt'
  | 'Concentration'
  | 'Data quality'

export interface SourceRecord {
  id: string
  system: string
  entity: string
  recordId: string
  label: string
  evidenceKind: EvidenceKind
  asOf: string
}

export interface FinanceKpi {
  id: string
  label: string
  /** Numeric when available; null when incomplete. */
  currentValue: number | null
  /** Display string — never invent dollars for incomplete orgs. */
  displayValue: string
  unit: 'USD' | 'percent' | 'months' | 'ratio' | 'count' | 'text'
  reportingPeriod: string
  priorPeriodValue: number | null
  priorPeriodComparison: string
  trend: TrendDirection
  trendLabel: string
  source: string
  sourceIds: string[]
  lastRefresh: string
  status: MetricStatus
  drillDownPath: string
  dataQuality: DataQuality
  organizationId: OrganizationId
  allowedRoles: Role[]
}

export interface AgingBucket {
  label: string
  amount: number | null
  displayAmount: string
  dataQuality: DataQuality
}

export interface AgingSchedule {
  id: string
  title: string
  organizationId: OrganizationId
  asOf: string
  buckets: AgingBucket[]
  totalDisplay: string
  dataQuality: DataQuality
  source: string
}

export interface DebtObligation {
  id: string
  name: string
  principalDisplay: string
  rateDisplay: string
  maturity: string
  nextPayment: string
  covenantNote: string
  status: MetricStatus
  dataQuality: DataQuality
  organizationId: OrganizationId
}

export interface BudgetLine {
  id: string
  category: string
  budget: number | null
  actual: number | null
  varianceDisplay: string
  variancePctDisplay: string
  status: MetricStatus
  dataQuality: DataQuality
  organizationId: OrganizationId
  reportingPeriod: string
}

export interface ForecastPoint {
  period: string
  actual: number | null
  budget: number | null
  forecast: number | null
  scenarioBase: number | null
  scenarioUpside: number | null
  scenarioDownside: number | null
  displayNote: string
  dataQuality: DataQuality
}

export interface ScenarioModel {
  id: string
  name: string
  organizationId: OrganizationId
  horizon: string
  assumptions: string[]
  revenueImpactDisplay: string
  ebitdaImpactDisplay: string
  cashImpactDisplay: string
  status: MetricStatus
  dataQuality: DataQuality
  evidenceKind: EvidenceKind
}

export interface EnterpriseValueModel {
  organizationId: OrganizationId
  currentEstimateDisplay: string
  valuationRangeDisplay: string
  ebitdaMultipleDisplay: string
  revenueMultipleDisplay: string
  assumptions: string[]
  valueDrivers: string[]
  valueDetractors: string[]
  riskAdjustments: string[]
  improvementInitiatives: string[]
  targetValueDisplay: string
  scenarioComparison: string[]
  /** Always true unless formally validated by owner/valuation professional. */
  indicativeOnly: boolean
  validationLabel: string
  dataQuality: DataQuality
  lastRefresh: string
  sourceIds: string[]
}

export interface FinanceAlert {
  id: string
  kind: AlertKind
  severity: AlertSeverity
  title: string
  detail: string
  organizationId: OrganizationId
  evidenceKind: EvidenceKind
  sourceIds: string[]
  recommendedAction: string
  status: 'Open' | 'Acknowledged' | 'Resolved'
  createdAt: string
  allowedRoles: Role[]
}

export interface AiObservation {
  id: string
  title: string
  summary: string
  /** Always AI interpretation — never verified accounting. */
  evidenceKind: 'AI interpretation'
  organizationId: OrganizationId
  relatedKpiIds: string[]
  sourceIds: string[]
  generatedAt: string
  reviewStatus: 'Pending human review' | 'Accepted' | 'Dismissed'
  disclaimer: string
  allowedRoles: Role[]
  /** 0–100 illustrative confidence in the observation framing, not in dollar accuracy. */
  confidence: number
  verificationStatus: VerificationStatus
  /** Explicitly not a recommendation. */
  kind: 'observation'
}

export type VerificationStatus =
  | 'Verified'
  | 'Mock demo — not verified accounting'
  | 'Pending verification'
  | 'Incomplete — awaiting verified data'

export type RecommendationStatus = 'Proposed' | 'Accepted' | 'Deferred' | 'Rejected' | 'Superseded'

export type RecommendationKind =
  | 'Cash runway'
  | 'Collections'
  | 'Forecast'
  | 'Capital readiness'
  | 'Enterprise value'
  | 'Revenue risk'
  | 'Data quality'
  | 'Scenario'

export interface SupportingCitation {
  sourceId: string
  kpiId?: string
  claim: string
  dataQuality: DataQuality
}

export interface ExecutiveRecommendation {
  id: string
  title: string
  /** Actionable recommendation — distinct from observation. */
  kind: 'recommendation'
  recommendationKind: RecommendationKind
  summary: string
  rationale: string
  highestImpact: boolean
  impactScore: number
  confidence: number
  verificationStatus: VerificationStatus
  organizationId: OrganizationId
  citations: SupportingCitation[]
  sourceIds: string[]
  relatedObservationIds: string[]
  status: RecommendationStatus
  createdAt: string
  updatedAt: string
  allowedRoles: Role[]
  ownerActionPrompt: string
}

export interface RecommendationAcceptanceEvent {
  id: string
  recommendationId: string
  action: 'Accepted' | 'Deferred' | 'Rejected' | 'Reopened'
  actor: string
  role: Role
  note: string
  at: string
}

export interface DecisionHistoryItem {
  id: string
  title: string
  decision: string
  outcome: string
  organizationId: OrganizationId
  relatedRecommendationId?: string
  sourceIds: string[]
  verificationStatus: VerificationStatus
  decidedAt: string
  decidedBy: string
  role: Role
}

export interface DailyChangeItem {
  id: string
  label: string
  previousDisplay: string
  currentDisplay: string
  deltaDisplay: string
  organizationId: OrganizationId
  sourceIds: string[]
  dataQuality: DataQuality
  verificationStatus: VerificationStatus
  asOfPrevious: string
  asOfCurrent: string
  /** True when change is structural/status only (no invented dollars). */
  structuralOnly: boolean
}

export interface ScorecardMetric {
  id: string
  label: string
  /** null when incomplete — never invent. */
  score: number | null
  displayScore: string
  band: 'Strong' | 'Watch' | 'Elevated' | 'Critical' | 'Incomplete'
  drivers: string[]
  organizationId: OrganizationId
  sourceIds: string[]
  confidence: number | null
  verificationStatus: VerificationStatus
  dataQuality: DataQuality
  methodologyNote: string
}

export interface ForecastConfidence {
  organizationId: OrganizationId
  /** null when unbound. */
  score: number | null
  displayScore: string
  horizon: string
  factors: string[]
  verificationStatus: VerificationStatus
  dataQuality: DataQuality
  sourceIds: string[]
  lastRefresh: string
}

export interface RunwayOptimizationLever {
  id: string
  title: string
  effectDisplay: string
  effort: 'Low' | 'Medium' | 'High'
  organizationId: OrganizationId
  citations: SupportingCitation[]
  verificationStatus: VerificationStatus
  dataQuality: DataQuality
  status: 'Available' | 'Blocked — incomplete data'
}

export interface ScenarioComparisonRow {
  id: string
  metric: string
  baseDisplay: string
  upsideDisplay: string
  downsideDisplay: string
  organizationId: OrganizationId
  dataQuality: DataQuality
  verificationStatus: VerificationStatus
  sourceIds: string[]
}

export interface ManagementCommentary {
  id: string
  period: string
  organizationId: OrganizationId
  author: string
  body: string
  evidenceKind: EvidenceKind
  lastRefresh: string
}

export interface AuditEvent {
  id: string
  at: string
  actor: string
  role: Role
  action: string
  entity: string
  detail: string
}

export interface WorkspaceProfile {
  id: OrganizationId
  name: string
  code: string
  kind: 'Internal' | 'Client' | 'Capital advisory'
  relationshipSummary: string
  financialDataState: DataQuality
  objectives: string[]
  verifiedFacts: string[]
  pendingFinancialAreas: string[]
  sourceIds: string[]
}

export type RouteKey =
  | 'overview'
  | 'decisions'
  | 'changes'
  | 'scores'
  | 'trends'
  | 'cash'
  | 'working-capital'
  | 'budget'
  | 'forecast'
  | 'enterprise-value'
  | 'workspaces'
  | 'capital'
  | 'alerts'
  | 'ai'
  | 'governance'

const fullRoutes: RouteKey[] = [
  'overview',
  'decisions',
  'changes',
  'scores',
  'trends',
  'cash',
  'working-capital',
  'budget',
  'forecast',
  'enterprise-value',
  'workspaces',
  'capital',
  'alerts',
  'ai',
  'governance',
]

export const roleAccess: Record<Role, RouteKey[]> = {
  Owner: fullRoutes,
  Executive: fullRoutes,
  Finance: fullRoutes,
  Advisor: [
    'overview',
    'decisions',
    'changes',
    'scores',
    'trends',
    'workspaces',
    'capital',
    'enterprise-value',
    'alerts',
    'ai',
  ],
  Assistant: ['overview', 'changes', 'workspaces', 'alerts'],
}
