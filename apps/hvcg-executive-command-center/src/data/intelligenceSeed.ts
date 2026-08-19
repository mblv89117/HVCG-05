import type {
  DecisionItem,
  ExceptionItem,
  Insight,
  MeetingDeadline,
  SourceRecord,
} from '../types/intelligence'
import {
  GENERATED_AT,
  atlasSources,
  ccbSources,
  coloradoCraftBeefVerified,
  portfolioMockSources,
} from './verifiedSources'

const leadership: Insight['allowedRoles'] = ['Owner', 'Executive']
const revenueRoles: Insight['allowedRoles'] = ['Owner', 'Executive', 'Advisor', 'Finance']
const opsRoles: Insight['allowedRoles'] = ['Owner', 'Executive', 'Operations', 'Assistant']
const financeRoles: Insight['allowedRoles'] = ['Owner', 'Executive', 'Finance']
const allLead: Insight['allowedRoles'] = ['Owner', 'Executive', 'Advisor', 'Operations', 'Finance']

function src(...ids: string[]): SourceRecord[] {
  const catalog = [...atlasSources, ...ccbSources, ...portfolioMockSources]
  return ids.map((id) => {
    const found = catalog.find((item) => item.id === id)
    if (!found) throw new Error(`Missing source ${id}`)
    return found
  })
}

/** Insights grounded in Atlas/CCB verified facts or explicitly pending portfolio binds — no invented dollars. */
export const seedInsights: Insight[] = [
  {
    id: 'INS-001',
    title: 'Track 1 Production remains frozen',
    summary:
      'Atlas records Track 1 as FROZEN — LIVE—INTERNAL. Soft UAT, website/DNS, and pilot import remain separately gated. Do not modify the frozen Production slice without new owner approval.',
    domain: 'Risk',
    impact: 'Critical',
    priorityScore: 100,
    status: 'Open',
    evidenceKind: 'Verified',
    sources: src('src-atlas-current-state', 'src-atlas-rc1'),
    generatedAt: GENERATED_AT,
    recommendedAction: 'Confirm leadership continues freeze posture; route any Production change request to Owner.',
    decisionPrompt: 'Reaffirm Track 1 freeze until explicit owner unlock?',
    taskTitle: 'Confirm Track 1 freeze posture with Owner',
    allowedRoles: leadership,
  },
  {
    id: 'INS-002',
    title: 'Colorado Craft Beef Blueprint requires verified financial package',
    summary:
      'CCB is at Blueprint stage with growth capital and real estate objectives. Fee amounts and KPIs are pending verification — do not invent financial findings for the meeting.',
    domain: 'Capital readiness',
    impact: 'Critical',
    priorityScore: 96,
    status: 'Open',
    evidenceKind: 'Verified',
    sources: src('src-ccb-opportunity', 'src-ccb-objectives', 'src-ccb-finance-gap'),
    generatedAt: GENERATED_AT,
    recommendedAction: 'Collect verified financial package before facility sizing or valuation discussion.',
    decisionPrompt: 'Approve meeting agenda that excludes unverified dollar amounts?',
    taskTitle: 'Request verified CCB financial package',
    allowedRoles: allLead,
    clientCode: coloradoCraftBeefVerified.clientCode,
  },
  {
    id: 'INS-003',
    title: 'Portfolio revenue and finance KPIs unbound',
    summary:
      'Command Center portfolio dollar tiles are labeled Awaiting verified source until Finance Intelligence / Revenue OS live feeds bind. Do not treat unbound tiles as production figures.',
    domain: 'Finance',
    impact: 'High',
    priorityScore: 88,
    status: 'Open',
    evidenceKind: 'Pending verification',
    sources: src('src-mock-finance', 'src-mock-pipeline'),
    generatedAt: GENERATED_AT,
    recommendedAction: 'Coordinate Finance Intelligence + Analytics bind; keep Awaiting verified source labels until promotion.',
    decisionPrompt: 'Accept unbound KPI posture for Executive Dashboard merge?',
    taskTitle: 'Track Finance Intelligence KPI bind for Executive Home',
    allowedRoles: financeRoles,
  },
  {
    id: 'INS-004',
    title: 'CCB contact channels still unverified',
    summary:
      'Jeff Smith is named as primary contact; email and phone remain pending verified source. Meeting logistics may be blocked.',
    domain: 'Client',
    impact: 'Medium',
    priorityScore: 72,
    status: 'Open',
    evidenceKind: 'Verified',
    sources: src('src-ccb-contact'),
    generatedAt: GENERATED_AT,
    recommendedAction: 'Capture verified contact channels into CRM before follow-up cadence.',
    decisionPrompt: 'Assign owner to verify Jeff Smith contact channels?',
    taskTitle: 'Verify Jeff Smith contact channels',
    allowedRoles: allLead,
    clientCode: 'CCB',
  },
  {
    id: 'INS-005',
    title: 'Revenue Sprint 4 Phase 1 complete — no Production activation',
    summary:
      'Verified Atlas/Revenue authority: Activation Framework complete in Dev/Staging at tip 7fd8bf2. Production activation is not authorized.',
    domain: 'Project',
    impact: 'Medium',
    priorityScore: 70,
    status: 'Open',
    evidenceKind: 'Verified',
    sources: src('src-revenue-tip', 'src-atlas-current-state'),
    generatedAt: GENERATED_AT,
    recommendedAction: 'Preserve Revenue branch; schedule Soft UAT only if Owner gates open.',
    taskTitle: 'Log Soft UAT gate status for Revenue Phase 1',
    allowedRoles: opsRoles,
  },
  {
    id: 'INS-006',
    title: 'Executive Intelligence ready to merge into Elite UI Executive Home',
    summary:
      'AI interpretation of integration posture: portable brief contract, RBAC gates, and CCB isolation are prepared for Elite UI merge sequencing.',
    domain: 'Opportunity',
    impact: 'High',
    priorityScore: 80,
    status: 'Open',
    evidenceKind: 'AI interpretation',
    sources: src('src-ecc-tip', 'src-atlas-current-state'),
    generatedAt: GENERATED_AT,
    recommendedAction: 'Hand off integration readiness report to Master PM and Elite UI.',
    decisionPrompt: 'Authorize Elite UI merge sequencing for Executive Intelligence?',
    taskTitle: 'Schedule Elite UI Executive Home merge for Intelligence module',
    allowedRoles: leadership,
  },
  {
    id: 'INS-007',
    title: 'CCB referral continuity must remain visible in meeting brief',
    summary:
      'Verified: Randy Kamin — Generational Group remains the referral source. Present continuity in the CCB briefing without disclosing unbound financials.',
    domain: 'Revenue',
    impact: 'Medium',
    priorityScore: 66,
    status: 'Open',
    evidenceKind: 'Verified',
    sources: src('src-ccb-referral', 'src-ccb-relationship'),
    generatedAt: GENERATED_AT,
    recommendedAction: 'Keep Generational Group attribution on CCB Executive Brief and Elite UI client workspace.',
    taskTitle: 'Confirm CCB referral attribution on Executive Home + CCB workspace',
    allowedRoles: revenueRoles,
    clientCode: 'CCB',
  },
]

export const seedDecisions: DecisionItem[] = [
  {
    id: 'DEC-001',
    title: 'Reaffirm Track 1 Production freeze',
    context: 'Atlas CURRENT_STATE marks Track 1 FROZEN. Any unlock requires Owner.',
    due: '2026-07-20',
    owner: 'Manny Barela',
    impact: 'Critical',
    status: 'Pending',
    sourceInsightId: 'INS-001',
    sources: src('src-atlas-current-state'),
    createdAt: GENERATED_AT,
  },
  {
    id: 'DEC-002',
    title: 'Approve CCB meeting agenda (no unverified dollars)',
    context: 'Blueprint meeting must use verified facts only; financial KPIs pending.',
    due: '2026-07-19',
    owner: 'Manny Barela',
    impact: 'Critical',
    status: 'Pending',
    sourceInsightId: 'INS-002',
    sources: src('src-ccb-opportunity', 'src-ccb-finance-gap'),
    createdAt: GENERATED_AT,
  },
  {
    id: 'DEC-003',
    title: 'Authorize Executive Intelligence → Elite UI merge sequence',
    context: 'Integration readiness package prepared; coordinate Elite UI, Finance, Analytics, Ops, Portal, QA, Architect.',
    due: '2026-07-20',
    owner: 'Master PM',
    impact: 'High',
    status: 'Pending',
    sourceInsightId: 'INS-006',
    sources: src('src-ecc-tip'),
    createdAt: GENERATED_AT,
  },
]

export const seedExceptions: ExceptionItem[] = [
  {
    id: 'EX-PR-01',
    domain: 'Project',
    title: 'Website / DNS and pilot import not started',
    detail: 'Atlas: blocked by Track 1 freeze gates.',
    impact: 'Medium',
    evidenceKind: 'Verified',
    sources: src('src-atlas-current-state'),
  },
  {
    id: 'EX-CL-01',
    domain: 'Client',
    title: 'CCB financial package missing',
    detail: 'Verified relationship only — no dollar KPIs until package received.',
    impact: 'Critical',
    evidenceKind: 'Verified',
    sources: src('src-ccb-finance-gap'),
    relatedInsightId: 'INS-002',
  },
  {
    id: 'EX-CAP-01',
    domain: 'Capital readiness',
    title: 'CCB capital readiness incomplete',
    detail: 'Blueprint presented; lender package and underwriting gaps pending verification.',
    impact: 'Critical',
    evidenceKind: 'Verified',
    sources: src('src-ccb-opportunity', 'src-ccb-finance-gap'),
    relatedInsightId: 'INS-002',
  },
  {
    id: 'EX-FN-01',
    domain: 'Finance',
    title: 'HVCG portfolio financial KPIs unbound',
    detail: 'Awaiting verified source — Finance Intelligence bind required.',
    impact: 'High',
    evidenceKind: 'Pending verification',
    sources: src('src-mock-finance'),
    relatedInsightId: 'INS-003',
  },
  {
    id: 'EX-RV-01',
    domain: 'Revenue',
    title: 'Pipeline dollar rollup unbound',
    detail: 'Awaiting verified source — Revenue OS live feed required for Executive Home.',
    impact: 'High',
    evidenceKind: 'Pending verification',
    sources: src('src-mock-pipeline'),
    relatedInsightId: 'INS-003',
  },
  {
    id: 'EX-OD-01',
    domain: 'Overdue',
    title: 'CCB financial package intake overdue relative to Blueprint presentation',
    detail: 'Verified stage Presented; package still pending verification.',
    impact: 'High',
    evidenceKind: 'Verified',
    sources: src('src-ccb-opportunity', 'src-ccb-finance-gap'),
    relatedInsightId: 'INS-002',
  },
]

export const seedMeetings: MeetingDeadline[] = [
  {
    id: 'MTG-001',
    when: '2026-07-19T14:00:00-07:00',
    title: 'Colorado Craft Beef — Blueprint briefing',
    type: 'Meeting',
    parties: 'Manny Barela · Jeff Smith',
    impact: 'Critical',
    sources: src('src-ccb-opportunity'),
  },
  {
    id: 'DL-001',
    when: '2026-07-20T17:00:00-07:00',
    title: 'Track 1 freeze reaffirmation',
    type: 'Deadline',
    parties: 'Owner',
    impact: 'Critical',
    sources: src('src-atlas-current-state'),
  },
  {
    id: 'DL-002',
    when: '2026-07-26T17:00:00-07:00',
    title: 'CCB next-action follow-up (financial package)',
    type: 'Deadline',
    parties: 'Capital Advisory',
    impact: 'High',
    sources: src('src-ccb-opportunity'),
  },
  {
    id: 'DL-003',
    when: '2026-07-21T17:00:00-07:00',
    title: 'Elite UI merge coordination checkpoint',
    type: 'Deadline',
    parties: 'Master PM · Elite UI · Executive',
    impact: 'High',
    sources: src('src-ecc-tip'),
  },
]
