import type { BriefSection, DecisionItem, ExceptionItem, ExecutiveBriefDocument, EvidenceKind, Insight, MeetingDeadline, SourceRecord } from '../types/intelligence'
import type { Role } from '../types'
import { GENERATED_AT, atlasSources, coloradoCraftBeefVerified, portfolioMockSources } from '../data/verifiedSources'
import { topOpenInsights } from './prioritize'

function section(
  id: string,
  title: string,
  evidenceKind: BriefSection['evidenceKind'],
  bullets: string[],
  sourceIds: string[],
): BriefSection {
  return { id, title, evidenceKind, bullets, sourceIds }
}

function uniqueSources(...lists: SourceRecord[][]): SourceRecord[] {
  const map = new Map<string, SourceRecord>()
  for (const list of lists) for (const item of list) map.set(item.id, item)
  return [...map.values()]
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)]
}

function verificationOf(sections: BriefSection[]): ExecutiveBriefDocument['verificationStatus'] {
  const kinds = new Set(sections.map((s) => s.evidenceKind))
  if (kinds.size === 1 && kinds.has('Verified')) return 'Verified'
  if ([...kinds].every((k) => k === 'Pending verification')) return 'Pending verification'
  return 'Mixed'
}

function hasAi(sections: BriefSection[], insights: Insight[]): boolean {
  return sections.some((s) => s.evidenceKind === 'AI interpretation') || insights.some((i) => i.evidenceKind === 'AI interpretation')
}

export function buildDailyHvgcBrief(
  insights: Insight[],
  decisions: DecisionItem[],
  exceptions: ExceptionItem[],
  meetings: MeetingDeadline[],
  role: Role,
): ExecutiveBriefDocument {
  const ranked = topOpenInsights(insights, role, 6)
  const pendingDecisions = decisions.filter((d) => d.status === 'Pending')
  const sources = uniqueSources(
    atlasSources,
    portfolioMockSources,
    ...ranked.map((i) => i.sources),
    ...pendingDecisions.map((d) => d.sources),
  )

  const sections: BriefSection[] = [
    section(
      'summary',
      '1. Executive summary',
      'Verified',
      [
        'Track 1 Production remains FROZEN (LIVE—INTERNAL). Revenue Sprint 4 Phase 1, Client Portal Sprint 1, and ECC Sprint 1 are COMPLETE on isolated branches.',
        'Highest meeting risk today: Colorado Craft Beef Blueprint — verified relationship only; financial package still pending.',
        'HVCG portfolio dollar KPIs remain Awaiting verified source until Finance Intelligence / Revenue OS bind.',
      ],
      ['src-atlas-current-state', 'src-ccb-opportunity', 'src-mock-finance'],
    ),
    section(
      'changes',
      '2. Material changes',
      'Verified',
      [
        'ECC Sprint 1 COMPLETE (commit 5bb42c2).',
        'CCB opportunity recorded at Blueprint stage with Generational Group referral continuity.',
        'Revenue Activation Framework remains Dev/Staging-only (no Production activation).',
        'Executive Intelligence prepared for merge into Elite UI Executive Home.',
      ],
      ['src-ecc-tip', 'src-ccb-opportunity', 'src-revenue-tip'],
    ),
    section(
      'alerts',
      '3. Critical alerts',
      (ranked[0]?.evidenceKind ?? 'Verified') as EvidenceKind,
      ranked.slice(0, 4).map((i) => `[${i.evidenceKind}] ${i.title}`),
      uniqueIds(ranked.slice(0, 4).flatMap((i) => i.sources.map((s) => s.id))),
    ),
    section(
      'revenue',
      '4. Revenue outlook',
      'Pending verification',
      [
        'Portfolio pipeline dollars: Awaiting verified source.',
        'Verified system status: Revenue Sprint 4 Phase 1 COMPLETE in Dev/Staging; Soft UAT separately gated.',
        'CCB Blueprint fee amounts: Awaiting verified source — not forecasted.',
      ],
      ['src-revenue-tip', 'src-mock-pipeline', 'src-ccb-finance-gap'],
    ),
    section(
      'clients',
      '5. Client health',
      'Verified',
      [
        'CCB: Transitioning to HVCG; capital readiness incomplete pending financial package.',
        'Other portfolio clients: Awaiting verified source (not listed until CRM bind).',
      ],
      ['src-ccb-relationship', 'src-mock-pipeline'],
    ),
    section(
      'projects',
      '6. Project health',
      'Verified',
      [
        'RC-1 locked; Track 1 freeze intact.',
        'Website/DNS and pilot client import: NOT STARTED / blocked by freeze gates.',
        'Canvas publish: NOT DONE (D-002).',
      ],
      ['src-atlas-current-state', 'src-atlas-rc1'],
    ),
    section(
      'finance',
      '7. Financial indicators',
      'Pending verification',
      [
        'HVCG Command Center finance tiles: Awaiting verified source (Finance Intelligence bind).',
        'CCB financial KPIs: Awaiting verified source (intentionally blank).',
        ...exceptions.filter((e) => e.domain === 'Finance').map((e) => e.title),
      ],
      ['src-mock-finance', 'src-ccb-finance-gap'],
    ),
    section(
      'capital',
      '8. Capital activity',
      'Verified',
      [
        'CCB capital objectives: growth capital + additional real estate; non-dilutive / agricultural themes.',
        'Blueprint status: Presented. Lender package and facility sizing: Awaiting verified source.',
      ],
      ['src-ccb-objectives', 'src-ccb-opportunity'],
    ),
    section(
      'decisions',
      '9. Decisions required',
      'Verified',
      pendingDecisions.map((d) => `${d.title} · due ${d.due} · ${d.owner}`),
      uniqueIds(pendingDecisions.flatMap((d) => d.sources.map((s) => s.id))),
    ),
    section(
      'actions',
      '10. Recommended next actions',
      'AI interpretation',
      [
        ...ranked.slice(0, 3).map((i) => i.recommendedAction),
        ...meetings
          .filter((m) => m.type === 'Meeting')
          .slice(0, 2)
          .map((m) => `Attend: ${m.title}`),
      ],
      uniqueIds(ranked.slice(0, 3).flatMap((i) => i.sources.map((s) => s.id))),
    ),
  ]

  return {
    id: 'brief-hvcg-daily',
    kind: 'daily',
    title: 'HVCG Daily Executive Brief',
    subject: 'High Value Capital Group',
    generatedAt: GENERATED_AT,
    audience: ['Owner', 'Executive'],
    summary: sections[0].bullets[0],
    sections,
    criticalInsightIds: ranked.filter((i) => i.impact === 'Critical' || i.impact === 'High').map((i) => i.id),
    decisionIds: pendingDecisions.map((d) => d.id),
    sources,
    verificationStatus: verificationOf(sections),
    aiGenerated: hasAi(sections, ranked),
  }
}

export function buildWeeklyHvgcBrief(
  insights: Insight[],
  decisions: DecisionItem[],
  role: Role,
): ExecutiveBriefDocument {
  const daily = buildDailyHvgcBrief(insights, decisions, [], [], role)
  return {
    ...daily,
    id: 'brief-hvcg-weekly',
    kind: 'weekly',
    title: 'HVCG Weekly Executive Briefing',
    summary:
      'Week focus: protect Track 1 freeze, advance CCB Blueprint on verified facts only, keep portfolio KPIs labeled Awaiting verified source, and complete Elite UI merge sequencing.',
    sections: daily.sections.map((s) =>
      s.id === 'summary'
        ? {
            ...s,
            bullets: [
              'Weekly posture: freeze Production Track 1; operate from verified Atlas tips.',
              'Client meeting priority: Colorado Craft Beef Blueprint without invented financial findings.',
              'Integration priority: merge Executive Intelligence into Elite UI Executive Home with Finance/Analytics binds gated.',
            ],
          }
        : s,
    ),
  }
}

export function buildCcbMeetingBrief(): ExecutiveBriefDocument {
  const ccb = coloradoCraftBeefVerified
  const sections: BriefSection[] = [
    section(
      'summary',
      '1. Executive summary',
      'Verified',
      [
        `${ccb.legalName} is transitioning to HVCG under capital advisory.`,
        `Pipeline stage: ${ccb.pipelineStage}. Blueprint status: ${ccb.blueprintStatus}.`,
        'No verified financial findings are available — do not present dollar amounts in this meeting.',
      ],
      ccb.sources.map((s) => s.id),
    ),
    section('changes', '2. Material changes', 'Verified', [
      'Relationship moved from HVS referral to current HVCG opportunity.',
      'Referral continuity locked: Randy Kamin — Generational Group.',
      'Opportunity recorded at Blueprint presentation stage.',
    ], ['src-ccb-relationship', 'src-ccb-referral', 'src-ccb-opportunity']),
    section('alerts', '3. Critical alerts', 'Pending verification', [
      'Financial package not yet verified.',
      'Contact channels for Jeff Smith pending.',
      'Fee / success-fee / facility sizing intentionally withheld.',
    ], ['src-ccb-finance-gap', 'src-ccb-contact']),
    section('revenue', '4. Revenue outlook', 'Pending verification', [
      'Estimated fee: Awaiting verified source.',
      'Recurring revenue: Awaiting verified source.',
      'Success-fee potential exists for capital path; amount Awaiting verified source.',
    ], ['src-ccb-opportunity', 'src-ccb-finance-gap']),
    section('clients', '5. Client health', 'Verified', [
      `Engagement status: ${ccb.engagementStatus}.`,
      `Industry: ${ccb.industry}.`,
      `Relationship owner: ${ccb.relationshipOwner}. Primary contact: ${ccb.primaryContact}.`,
      ...ccb.relationshipHistory,
    ], ['src-ccb-relationship', 'src-ccb-contact']),
    section('projects', '6. Project health', 'Verified', [
      ...ccb.strategicContext,
      `Blueprint status: ${ccb.blueprintStatus}.`,
    ], ['src-ccb-opportunity', 'src-ccb-objectives']),
    section('finance', '7. Financial indicators', 'Pending verification', [
      'Revenue / GP / EBITDA / Cash / AR / Working capital: Awaiting verified source.',
      'Do not invent financial findings.',
    ], ['src-ccb-finance-gap']),
    section('capital', '8. Capital activity', 'Verified', [
      `Capital objectives: ${ccb.capitalObjectives.join('; ')}.`,
      `Real estate objectives: ${ccb.realEstateObjectives.join('; ')}.`,
      'Prior themes: non-dilutive financing and agricultural financing.',
    ], ['src-ccb-objectives']),
    section('decisions', '9. Decisions required', 'AI interpretation', [
      'Approve meeting agenda that excludes unverified dollar amounts.',
      'Confirm document request list for financial package intake.',
      'Confirm next follow-up date after Blueprint discussion.',
    ], ['src-ccb-opportunity', 'src-ccb-finance-gap']),
    section('actions', '10. Recommended next actions', 'Verified', [
      ...ccb.knownNextActions,
      `Missing / pending: ${ccb.missingOrPending.slice(0, 3).join('; ')}.`,
    ], ccb.sources.map((s) => s.id)),
  ]

  return {
    id: 'brief-ccb-meeting',
    kind: 'client-meeting',
    title: 'Colorado Craft Beef — Meeting Executive Briefing',
    subject: ccb.legalName,
    generatedAt: GENERATED_AT,
    audience: ['Owner', 'Executive', 'Advisor'],
    summary: sections[0].bullets[0],
    sections,
    criticalInsightIds: ['INS-002', 'INS-004'],
    decisionIds: ['DEC-002'],
    sources: ccb.sources,
    verificationStatus: verificationOf(sections),
    aiGenerated: hasAi(sections, []),
    clientScope: 'CCB',
  }
}
