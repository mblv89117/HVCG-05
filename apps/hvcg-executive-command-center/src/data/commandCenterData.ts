import type { CommandCenterData, Evidence, Metric } from '../types'
import { readEosSummary } from '../adapters/eosAdapter'

const eos = readEosSummary()

export const atlasSource: Evidence = {
  kind: 'Repository-derived',
  label: 'Project Atlas',
  path: 'PROJECT_ATLAS/CURRENT_STATE.md',
  asOf: '2026-07-17 01:21 UTC',
}

export const eosSource: Evidence = {
  kind: 'Repository-derived',
  label: 'Track 9 EOS Sprint 2 snapshot',
  path: 'apps/hvcg-engineering-os/data/sample-snapshot.json',
  asOf: '2026-07-17 01:21 UTC',
}

export const revenueSource: Evidence = {
  kind: 'Repository-derived',
  label: 'Revenue Sprint 4 data contract',
  path: 'docs/business-launch/website/staging/assessments/eva/js/executive-revenue-dashboard.js',
  asOf: '2026-07-16',
}

export const unavailableSource: Evidence = {
  kind: 'Unavailable',
  label: 'No approved live data connection',
}

export const sampleSource: Evidence = {
  kind: 'Development sample',
  label: 'Fictional UAT fixture',
  asOf: '2026-07-17',
}

const unavailableMetric = (id: string, label: string, detail: string): Metric => ({
  id,
  label,
  value: 'Unavailable',
  detail,
  tone: 'neutral',
  source: unavailableSource,
})

export const commandCenterData: CommandCenterData = {
  generatedAt: '2026-07-17T01:21:00Z',
  environment: 'Development / UAT — read-only aggregation',
  tenantName: 'High Value Capital Group',
  sources: [atlasSource, eosSource, revenueSource, sampleSource, unavailableSource],
  health: [
    { id: 'company', label: 'Overall Company Health', health: 'YELLOW', summary: 'Operating-system evidence is healthy; live finance and client-delivery telemetry is unavailable.', source: atlasSource },
    { id: 'revenue', label: 'Revenue Health', health: 'YELLOW', summary: 'Revenue OS Sprints 1–4 are complete in Development/Staging; current pipeline values are unavailable.', source: revenueSource },
    { id: 'operations', label: 'Operations Health', health: 'GREEN', summary: 'Track 7 executive command sprint is active in isolated Development.', source: atlasSource },
    { id: 'clients', label: 'Client Delivery Health', health: 'YELLOW', summary: 'Client portal workstream exists; no approved live portfolio feed is connected.', source: unavailableSource },
    { id: 'engineering', label: 'Engineering Health', health: 'GREEN', summary: 'Track 9 EOS Sprints 1–2 are complete and QA approved.', source: eosSource },
    { id: 'production', label: 'Production Status', health: 'GREEN', summary: 'Track 1 remains LIVE—INTERNAL and FROZEN; no changes authorized.', source: atlasSource },
    { id: 'cash', label: 'Cash and Revenue Indicators', health: 'YELLOW', summary: 'Cash, collections, and live revenue values are unavailable in this Development build.', source: unavailableSource },
  ],
  risks: [
    { id: 'risk-1', text: 'Track 1 Production must remain frozen.', source: atlasSource },
    { id: 'risk-2', text: 'Public website, outbound client communication, and Production flows remain gated.', source: atlasSource },
    { id: 'risk-3', text: 'CEO financial and client-delivery telemetry is incomplete without an approved read-only connector.', source: unavailableSource },
  ],
  blockers: [
    { id: 'block-1', text: 'Live financial indicators are blocked by the absence of an approved read-only finance source.', source: unavailableSource },
    { id: 'block-2', text: 'Live client portfolio status is blocked by the no-Production/no-client-data sprint boundary.', source: unavailableSource },
  ],
  actions: [
    { id: 'action-1', text: 'Review this CEO Command Center Development/UAT sprint when QA is complete.', source: atlasSource },
    { id: 'action-2', text: 'Resolve open owner pricing-card decisions before any Revenue expansion.', source: atlasSource },
    { id: 'action-3', text: 'Preserve Track 1 freeze and require separate approval for every live integration.', source: atlasSource },
  ],
  approvals: [
    {
      id: 'OA-CEO-UAT',
      title: 'CEO Command Center QA and release review',
      category: 'Sprint approval',
      businessReason: 'Confirm the owner interface is accurate, simple, and safe before commit or push.',
      requestedAction: 'Approve, reject, or request changes after QA handoff.',
      requester: 'Master PM / Track 7',
      risk: 'Low',
      impact: 'Authorizes feature-branch commit/push only if explicitly granted.',
      track: 'Track 7',
      environment: 'Development / UAT',
      qaStatus: 'Pending',
      recommendation: 'Wait for completed automated and owner UAT evidence.',
      state: 'Pending',
      source: atlasSource,
    },
    {
      id: 'OA-PRICE-CARDS',
      title: 'FCFO / Exit / Acquisition / Model price cards',
      category: 'Pricing approval',
      businessReason: 'Full SKU pricing remains owner-controlled.',
      requestedAction: 'Approve or revise canonical price cards.',
      requester: 'Revenue OS',
      risk: 'High',
      impact: 'Controls future proposal and conversion pricing.',
      track: 'Track 2',
      environment: 'Development / Staging',
      qaStatus: 'Not applicable',
      recommendation: 'Review pricing outside this dashboard before activation.',
      state: 'Pending',
      source: { ...atlasSource, path: 'PROJECT_ATLAS/NEXT_ACTIONS.md' },
    },
    {
      id: 'BL-C1',
      title: 'Client communications and portal invitations',
      category: 'Client communication approval',
      businessReason: 'Protect clients from unauthorized automated contact.',
      requestedAction: 'Explicitly authorize a defined outbound action.',
      requester: 'Portal / Revenue / Operations',
      risk: 'Critical',
      impact: 'Could contact or invite clients if later implemented.',
      track: 'Tracks 2 / 4 / 5 / 7',
      environment: 'Production',
      qaStatus: 'Blocked by standing gate',
      recommendation: 'Keep blocked in this sprint.',
      state: 'Pending',
      source: { ...atlasSource, path: 'PROJECT_ATLAS/DECISIONS.md' },
    },
  ],
  agents: [
    { id: 'master-pm', name: 'Master PM', role: 'Sprint coordinator', track: 'Track 7', sprint: 'CEO Command Center Sprint 2', status: 'Working', branch: 'cursor/track7-ceo-command-center-sprint2', worktree: '.worktrees/ceo-command-center-sprint2', lastUpdate: '2026-07-17', blocker: 'None', qaStatus: 'In progress', ownerDecision: 'Required after QA', nextAction: 'Complete implementation and QA handoff', source: atlasSource },
    { id: 'qa', name: 'QA Engineer', role: 'Quality gate', track: 'Track 7', sprint: 'CEO Command Center Sprint 2', status: 'Assigned', branch: 'Not assigned', worktree: 'Not assigned', lastUpdate: '2026-07-17', blocker: 'Implementation not complete', qaStatus: 'Pending', ownerDecision: 'No', nextAction: 'Review QA package', source: atlasSource },
    { id: 'engineering', name: 'Engineering OS', role: 'Engineering data provider', track: 'Track 9', sprint: 'EOS Sprint 2', status: 'Complete', branch: 'cursor/track9-eos-sprint2', worktree: '.worktrees/track9-eos-sprint2', lastUpdate: '2026-07-17 01:21 UTC', blocker: 'None', qaStatus: 'Approved', ownerDecision: 'No', nextAction: 'Remain preserved; no EOS Sprint 3', source: eosSource },
    { id: 'revenue', name: 'Revenue Systems', role: 'Revenue data provider', track: 'Track 2', sprint: 'Revenue Sprint 4', status: 'Complete', branch: 'cursor/revenue-sprint4-activation', worktree: '.worktrees/revenue-sprint4', lastUpdate: '2026-07-16', blocker: 'Live feed not connected', qaStatus: 'Complete', ownerDecision: 'Price cards pending', nextAction: 'Preserve completed release', source: revenueSource },
    { id: 'deployment', name: 'Deployment Engineer', role: 'Production freeze owner', track: 'Track 1', sprint: 'None', status: 'Idle', branch: 'deployment-manager lineage', worktree: '.worktrees/deployment-engineer', lastUpdate: '2026-07-17', blocker: 'No deployment authorization', qaStatus: 'Not requested', ownerDecision: 'Required for any Production change', nextAction: 'Maintain freeze', source: atlasSource },
  ],
  tracks: [
    { number: 1, name: 'Production', owner: 'Deployment Engineer', sprint: 'Track 1 Live—Internal', status: 'FROZEN — LIVE—INTERNAL', environment: 'Production', branch: 'Track-1-Live-Internal tag', qa: 'Frozen baseline', deployment: 'Live internal; frozen', risks: 'Unauthorized change', blockers: 'Owner gate', nextAction: 'Preserve freeze', technicalDebt: 'Unavailable', pendingDecisions: 'Any further Production write', source: atlasSource },
    { number: 2, name: 'Revenue OS', owner: 'Revenue Systems Engineer', sprint: 'Sprints 1–4 complete', status: 'COMPLETE', environment: 'Development / Staging', branch: 'cursor/revenue-sprint4-activation @ 7e4eb10', qa: 'Complete', deployment: 'No Production deploy', risks: 'Pricing gates', blockers: 'Owner price-card decisions', nextAction: 'Preserve; optional soft UAT', technicalDebt: 'See Revenue QA debt register', pendingDecisions: 'Price cards', source: atlasSource },
    { number: 3, name: 'Website', owner: 'Website Engineer', sprint: 'Staging preview', status: 'IN PROGRESS', environment: 'Staging', branch: 'Website worktree lineage', qa: 'Not consolidated', deployment: 'DNS gated', risks: 'Accidental publish', blockers: 'BL-PUBLISH-1', nextAction: 'Hosted preview only when authorized', technicalDebt: 'Unavailable', pendingDecisions: 'Public publish', source: atlasSource },
    { number: 4, name: 'Client Portal', owner: 'Portal workstream', sprint: 'Sprint 1', status: 'Development workstream', environment: 'Development', branch: 'client-portal-sprint1 lineage', qa: 'Repository package exists', deployment: 'Invites gated', risks: 'Client data/contact', blockers: 'BL-C1', nextAction: 'No invitations', technicalDebt: 'Unavailable', pendingDecisions: 'Portal invitations', source: atlasSource },
    { number: 5, name: 'Client Onboarding', owner: 'Operations / CRM', sprint: 'Specs / automation', status: 'GATED', environment: 'Development', branch: 'Onboarding lineage', qa: 'Not active', deployment: 'Not deployed', risks: 'Outbound automation', blockers: 'D-002 / BL-C1', nextAction: 'Hold', technicalDebt: 'Unavailable', pendingDecisions: 'Activation', source: atlasSource },
    { number: 6, name: 'AI', owner: 'AI Governance', sprint: 'Parallel worktree', status: 'IN DEVELOPMENT', environment: 'Development', branch: 'ai-governance lineage', qa: 'Workstream-specific', deployment: 'No autonomous execution', risks: 'Uncontrolled actions', blockers: 'Owner governance gates', nextAction: 'Preserve governed placeholders', technicalDebt: 'Unavailable', pendingDecisions: 'Future execution controls', source: atlasSource },
    { number: 7, name: 'Internal Operations', owner: 'Master PM / Operations', sprint: 'CEO Command Center Sprint 2', status: 'ACTIVE DEVELOPMENT', environment: 'Development / UAT', branch: 'cursor/track7-ceo-command-center-sprint2', qa: 'In progress', deployment: 'Not authorized', risks: 'Source confusion', blockers: 'None', nextAction: 'Complete QA handoff', technicalDebt: 'None accepted yet', pendingDecisions: 'Sprint approval after QA', source: atlasSource },
    { number: 8, name: 'Enterprise', owner: 'Future assignment', sprint: 'Future horizon', status: 'NOT STARTED', environment: 'None', branch: 'None', qa: 'Not applicable', deployment: 'Not applicable', risks: 'None active', blockers: 'Later roadmap', nextAction: 'No action', technicalDebt: 'Not applicable', pendingDecisions: 'None', source: atlasSource },
    { number: 9, name: 'Engineering OS', owner: 'Master PM', sprint: 'EOS Sprint 2', status: 'COMPLETE AND PUSHED', environment: 'Development', branch: 'cursor/track9-eos-sprint2 @ e7bb1a3', qa: 'Approved', deployment: 'Not deployed', risks: 'Deployment unauthorized', blockers: 'Owner gate for merge/deploy', nextAction: 'Preserve; do not start Sprint 3', technicalDebt: 'DEF-EOS-001–005 closed', pendingDecisions: 'None', source: eosSource },
  ],
  revenueMetrics: [
    unavailableMetric('leads', 'New leads', 'Revenue adapter contract exists; no approved current browser source.'),
    unavailableMetric('evas-started', 'EVAs started', 'Current Development localStorage is not imported into this app.'),
    unavailableMetric('evas-completed', 'EVAs completed', 'Current Development localStorage is not imported into this app.'),
    unavailableMetric('qualified', 'Qualified prospects', 'No safe current snapshot supplied.'),
    unavailableMetric('opportunities', 'Open opportunities', 'No safe current snapshot supplied.'),
    unavailableMetric('pipeline', 'Pipeline value', 'No live or exported Development pipeline snapshot supplied.'),
    unavailableMetric('proposals', 'Proposals', 'No safe current snapshot supplied.'),
    unavailableMetric('won', 'Deals won', 'No safe current snapshot supplied.'),
    unavailableMetric('mrr', 'Estimated MRR', 'No approved finance source.'),
    unavailableMetric('forecast', 'Revenue forecast', 'No approved live revenue/finance source.'),
  ],
  clients: [
    { id: 'UAT-CLIENT-1', name: 'Fictional Client Alpha', project: 'Capital readiness sample', status: 'On track', health: 'GREEN', missingDocuments: 1, nextAction: 'Review sample document checklist', source: sampleSource },
    { id: 'UAT-CLIENT-2', name: 'Fictional Client Beta', project: 'Fractional CFO sample', status: 'Needs attention', health: 'YELLOW', missingDocuments: 3, nextAction: 'Resolve sample missing documents', source: sampleSource },
  ],
  engineering: [
    { label: 'Active sprints', value: '1', detail: 'Track 7 CEO Command Center Sprint 2', source: atlasSource },
    { label: 'Branches', value: '3 authoritative references', detail: 'CEO sprint, EOS Sprint 2, Revenue Sprint 4', source: atlasSource },
    { label: 'Worktrees', value: 'Isolated', detail: '.worktrees/ceo-command-center-sprint2', source: atlasSource },
    { label: 'QA queue', value: '1', detail: 'CEO Command Center QA pending', source: atlasSource },
    { label: 'Release readiness', value: 'Not ready', detail: 'Implementation and QA incomplete; commit/push prohibited', source: atlasSource },
    { label: 'Open Change Requests', value: String(eos.openChangeRequests), detail: 'Open EOS change requests in the Sprint 2 snapshot', source: eosSource },
    { label: 'Technical debt', value: `${eos.openTechnicalDebt} open EOS items`, detail: 'DEF-EOS-001–005 closed; current sprint debt not yet assessed', source: eosSource },
    { label: 'Tests', value: '66 EOS assertions', detail: 'Final EOS dashboard/Atlas closure baseline', source: eosSource },
    { label: 'Atlas synchronization', value: eos.atlasSyncStatus === 'healthy' ? 'Healthy at base' : eos.atlasSyncStatus, detail: 'New sprint updates pending until implementation completes', source: eosSource },
    { label: 'Production freeze', value: eos.productionFrozen ? 'ENFORCED' : 'VERIFY', detail: 'Track 1 remains frozen', source: atlasSource },
    { label: 'Deployment gates', value: 'Closed', detail: 'No merge or deployment authorization', source: atlasSource },
    { label: 'Recent release', value: 'EOS Sprint 2 Dev', detail: 'Committed/pushed @ e7bb1a3; not deployed', source: eosSource },
    { label: 'Rollback', value: 'Available', detail: 'Discard uncommitted worktree or return to base d778f23', source: atlasSource },
  ],
  recentChanges: [
    { id: 'change-1', text: 'Track 9 EOS Sprint 2 was QA/owner approved, committed, and pushed; no deployment.', source: { ...atlasSource, path: 'PROJECT_ATLAS/CHANGELOG.md' } },
    { id: 'change-2', text: 'DEF-EOS-001–005 were closed and QA confirmed.', source: { ...atlasSource, path: 'PROJECT_ATLAS/TECHNICAL_DEBT.md' } },
    { id: 'change-3', text: 'Track 7 CEO Command Center Sprint 2 began in an isolated Development worktree.', source: atlasSource },
  ],
}
