// Seed Development-safe sample data into the Project Atlas Command Center tables.
// Idempotent per table: skips a table if it already has rows. No Production data.
import { dv } from './dv.js';
import { PREFIX, TABLES } from './schema.js';

const log = (...a) => console.log(...a);

// Build a lookup of attribute metadata by table.field so we can convert
// human-readable choice labels into the numeric option values we generated.
const attrIndex = {};
for (const t of TABLES) {
  for (const a of t.attributes) {
    attrIndex[`${t.schema}.${a.SchemaName}`.toLowerCase()] = a;
  }
}
// entity set (plural logical) is logicalname + 's' unless custom; Dataverse pluralizes.
// For our simple names, collection = schema lowercased + 'es'? Safer to fetch EntitySetName.
const entitySetCache = {};
async function entitySet(schema) {
  const logical = schema.toLowerCase();
  if (entitySetCache[logical]) return entitySetCache[logical];
  const r = await dv.get(`EntityDefinitions(LogicalName='${logical}')?$select=EntitySetName`);
  entitySetCache[logical] = r.EntitySetName;
  return r.EntitySetName;
}

function optionValue(attr, labelText) {
  const opt = attr.OptionSet?.Options?.find(
    (o) => o.Label?.LocalizedLabels?.[0]?.Label === labelText,
  );
  if (!opt) throw new Error(`Option '${labelText}' not found for ${attr.SchemaName}`);
  return opt.Value;
}

function buildPayload(tableSchema, rec) {
  const out = {};
  for (const [k, v] of Object.entries(rec)) {
    const field = `${PREFIX}_${k}`.toLowerCase();
    const attr = attrIndex[`${tableSchema}.${field}`.toLowerCase()];
    if (!attr) { out[field] = v; continue; }
    if (attr['@odata.type'] === 'Microsoft.Dynamics.CRM.PicklistAttributeMetadata' && typeof v === 'string') {
      out[field] = optionValue(attr, v);
    } else {
      out[field] = v;
    }
  }
  return out;
}

async function seedTable(schema, records) {
  const set = await entitySet(schema);
  const existing = await dv.get(`${set}?$select=${PREFIX}_name&$top=1`);
  if (existing.value?.length) { log(`  ${schema}: already has data, skipping`); return; }
  for (const rec of records) {
    const payload = buildPayload(schema, rec);
    await dv.post(set, payload);
  }
  log(`  ${schema}: seeded ${records.length}`);
}

const SAMPLE = 'Development sample';
const REPO = 'Repository-derived';

const DATA = {
  [`${PREFIX}_atlastrack`]: [
    { name: 'Track 1 — Internal CRM (Frozen)', tracknumber: 1, status: 'Frozen', currentsprint: 'None', owner: 'Manny', assignedagent: 'None', environment: 'Production', qastatus: 'N/A (frozen)', deploymentstatus: 'Live (frozen)', blockers: 'None', nextaction: 'No changes — protected/frozen baseline.', health: 'Green', datasource: REPO },
    { name: 'Track 2 — Public Website', tracknumber: 2, status: 'Gated', currentsprint: 'Website Launch Prep', owner: 'Manny', assignedagent: 'Deployment Engineer', environment: 'Staging', qastatus: 'Passed (staging)', deploymentstatus: 'Awaiting owner go-live', blockers: 'DNS + owner approval gate', nextaction: 'Owner approval required before publish.', health: 'Yellow', datasource: REPO },
    { name: 'Track 4 — Revenue Engine', tracknumber: 4, status: 'Active Development', currentsprint: 'Revenue Sprint 4', owner: 'Manny', assignedagent: 'Revenue Agent', environment: 'Development', qastatus: 'In progress', deploymentstatus: 'Dev only', blockers: 'None', nextaction: 'Complete EVA revenue model wiring.', health: 'Green', datasource: REPO },
    { name: 'Track 7 — Internal Operations', tracknumber: 7, status: 'Waiting for Owner', currentsprint: 'Executive Command Center Sprint 2', owner: 'Manny', assignedagent: 'Master PM', environment: 'Development/UAT', qastatus: 'Passed (automated)', deploymentstatus: 'Dev/UAT app live', blockers: 'None', nextaction: 'Owner UAT of Atlas Command Center.', health: 'Green', datasource: REPO },
    { name: 'Track 9 — Engineering Operating System', tracknumber: 9, status: 'Active Development', currentsprint: 'EOS Sprint 2', owner: 'Manny', assignedagent: 'QA Engineer', environment: 'Development', qastatus: 'Passed (Sprint 1)', deploymentstatus: 'Dev only', blockers: 'None', nextaction: 'Continue EOS Sprint 2 modules.', health: 'Green', datasource: REPO },
    { name: 'Track 5 — Client Portal', tracknumber: 5, status: 'Not Started', currentsprint: 'None', owner: 'Manny', assignedagent: 'None', environment: 'None', qastatus: 'N/A', deploymentstatus: 'Not started', blockers: 'Awaiting portfolio priority', nextaction: 'Schedule discovery once Revenue stabilizes.', health: 'Yellow', datasource: SAMPLE },
    { name: 'Track 6 — Proposal Automation', tracknumber: 6, status: 'In Development', currentsprint: 'Proposal Draft Engine', owner: 'Manny', assignedagent: 'Revenue Agent', environment: 'Development', qastatus: 'Not started', deploymentstatus: 'Dev only', blockers: 'None', nextaction: 'Draft proposal template model.', health: 'Yellow', datasource: SAMPLE },
    { name: 'Track 8 — Analytics & Reporting', tracknumber: 8, status: 'In Development', currentsprint: 'Executive Analytics', owner: 'Manny', assignedagent: 'QA Engineer', environment: 'Development', qastatus: 'In progress', deploymentstatus: 'Dev only', blockers: 'None', nextaction: 'Wire engineering analytics dashboard.', health: 'Green', datasource: SAMPLE },
  ],
  [`${PREFIX}_atlassprint`]: [
    { name: 'Executive Command Center Sprint 2', track: 'Track 7', stage: 'Waiting for Owner', objective: 'Ship a usable Atlas CEO Command Center for owner UAT.', deliverables: 'Model-driven app, 13 Dataverse tables, sample data, owner guide.', branch: 'feature/atlas-powerapps-uat', worktree: 'atlas-powerapps-uat', tests: 'Automated QA + adapters', qaresult: 'Passed', risks: 'None material (Dev/UAT only).', technicaldebt: 'Canvas polish deferred to later layer.', releasereadiness: 'Awaiting owner UAT sign-off', health: 'Green', datasource: REPO },
    { name: 'EOS Sprint 2', track: 'Track 9', stage: 'In Progress', objective: 'Expand Engineering Operating System modules.', deliverables: 'Command Center, Workflow Engine, Agent Bus 2.0.', branch: 'feature/track9-eos-sprint2', worktree: 'track9-eos-sprint2', tests: 'Unit + integration', qaresult: 'Sprint 1 passed', risks: 'Scope creep on analytics.', technicaldebt: 'Refactor comms bus adapters.', releasereadiness: 'In progress', health: 'Green', datasource: REPO },
    { name: 'Revenue Sprint 4', track: 'Track 4', stage: 'In Progress', objective: 'Finalize EVA executive revenue model.', deliverables: 'Revenue model, KPI feed, exec summary.', branch: 'feature/revenue-sprint4', worktree: 'revenue-sprint4', tests: 'Model validation', qaresult: 'In progress', risks: 'Data freshness dependencies.', technicaldebt: 'None tracked.', releasereadiness: 'Not ready', health: 'Green', datasource: REPO },
    { name: 'Website Launch Prep', track: 'Track 2', stage: 'Waiting for Owner', objective: 'Prepare public website for go-live.', deliverables: 'Final content, SEO, deploy pipeline.', branch: 'feature/website-launch', worktree: 'website-launch', tests: 'Staging smoke tests', qaresult: 'Passed (staging)', risks: 'DNS cutover coordination.', technicaldebt: 'None.', releasereadiness: 'Blocked on owner approval', health: 'Yellow', datasource: SAMPLE },
    { name: 'Proposal Draft Engine', track: 'Track 6', stage: 'Assigned', objective: 'Automate first-draft proposals.', deliverables: 'Template model + generation flow.', branch: 'feature/proposal-engine', worktree: 'proposal-engine', tests: 'Not started', qaresult: 'N/A', risks: 'Template accuracy.', technicaldebt: 'None yet.', releasereadiness: 'Not ready', health: 'Yellow', datasource: SAMPLE },
    { name: 'Executive Analytics', track: 'Track 8', stage: 'In Progress', objective: 'Engineering + executive analytics dashboards.', deliverables: 'Analytics dashboard, KPI rollups.', branch: 'feature/exec-analytics', worktree: 'exec-analytics', tests: 'In progress', qaresult: 'In progress', risks: 'Metric definition alignment.', technicaldebt: 'Consolidate query layer.', releasereadiness: 'Not ready', health: 'Green', datasource: SAMPLE },
  ],
  [`${PREFIX}_atlasagent`]: [
    { name: 'Master PM', role: 'Master Project Manager', track: 'Track 7', sprint: 'Executive Command Center Sprint 2', assignment: 'Deliver Atlas CEO Command Center UAT app.', status: 'Waiting for Owner', lastupdate: new Date().toISOString(), blocker: 'None', branch: 'feature/atlas-powerapps-uat', worktree: 'atlas-powerapps-uat', qastate: 'Passed', owneraction: 'UAT review requested', datasource: REPO },
    { name: 'QA Engineer', role: 'Quality Assurance', track: 'Track 9', sprint: 'EOS Sprint 2', assignment: 'Validate EOS modules + command center.', status: 'Working', lastupdate: new Date().toISOString(), blocker: 'None', branch: 'feature/track9-eos-sprint2', worktree: 'track9-eos-sprint2', qastate: 'In progress', owneraction: 'None', datasource: REPO },
    { name: 'Revenue Agent', role: 'Revenue Engineering', track: 'Track 4', sprint: 'Revenue Sprint 4', assignment: 'Finalize EVA revenue model.', status: 'Working', lastupdate: new Date().toISOString(), blocker: 'None', branch: 'feature/revenue-sprint4', worktree: 'revenue-sprint4', qastate: 'In progress', owneraction: 'None', datasource: REPO },
    { name: 'Deployment Engineer', role: 'Release & Deployment', track: 'Track 2', sprint: 'Website Launch Prep', assignment: 'Prepare website go-live pipeline.', status: 'Waiting for Owner', lastupdate: new Date().toISOString(), blocker: 'Owner go-live approval', branch: 'feature/website-launch', worktree: 'website-launch', qastate: 'Passed (staging)', owneraction: 'Approve go-live', datasource: SAMPLE },
    { name: 'Analytics Agent', role: 'Analytics & Reporting', track: 'Track 8', sprint: 'Executive Analytics', assignment: 'Build engineering analytics dashboard.', status: 'Working', lastupdate: new Date().toISOString(), blocker: 'None', branch: 'feature/exec-analytics', worktree: 'exec-analytics', qastate: 'In progress', owneraction: 'None', datasource: SAMPLE },
    { name: 'Proposal Agent', role: 'Proposal Automation', track: 'Track 6', sprint: 'Proposal Draft Engine', assignment: 'Draft proposal template model.', status: 'Assigned', lastupdate: new Date().toISOString(), blocker: 'None', branch: 'feature/proposal-engine', worktree: 'proposal-engine', qastate: 'Not started', owneraction: 'None', datasource: SAMPLE },
  ],
  [`${PREFIX}_atlasapproval`]: [
    { name: 'Approve Atlas Command Center UAT sign-off', approvaltype: 'QA acceptance', businessreason: 'Confirm the Dev/UAT command center meets owner needs.', requestedaction: 'Review app and accept UAT.', requester: 'Master PM', risk: 'Low', impact: 'Unblocks Track 7 command center adoption.', track: 'Track 7', environment: 'Development/UAT', qastatus: 'Passed (automated)', recommendation: 'Approve after hands-on review.', decision: 'Pending', ownernotes: '', datasource: REPO },
    { name: 'Approve website go-live', approvaltype: 'Deployment', businessreason: 'Public website is ready on staging.', requestedaction: 'Authorize production publish + DNS cutover.', requester: 'Deployment Engineer', risk: 'Medium', impact: 'Public brand launch; client-facing.', track: 'Track 2', environment: 'Staging', qastatus: 'Passed (staging)', recommendation: 'Hold until owner is ready for public launch.', decision: 'Pending', ownernotes: '', datasource: SAMPLE },
    { name: 'Approve Revenue Sprint 4 commit + push', approvaltype: 'Commit and push', businessreason: 'Revenue model changes ready for feature branch.', requestedaction: 'Authorize commit/push to feature branch.', requester: 'Revenue Agent', risk: 'Low', impact: 'Development only; no production impact.', track: 'Track 4', environment: 'Development', qastatus: 'In progress', recommendation: 'Approve once QA passes.', decision: 'Pending', ownernotes: '', datasource: REPO },
    { name: 'Approve EOS Sprint 2 scope', approvaltype: 'Sprint start', businessreason: 'Confirm module scope for EOS Sprint 2.', requestedaction: 'Approve sprint scope + start.', requester: 'QA Engineer', risk: 'Low', impact: 'Guides engineering effort for the sprint.', track: 'Track 9', environment: 'Development', qastatus: 'N/A', recommendation: 'Approve.', decision: 'Approved', ownernotes: 'Approved — proceed.', datasource: REPO },
    { name: 'Approve proposal automation pricing model', approvaltype: 'Pricing', businessreason: 'Proposal engine needs pricing rules.', requestedaction: 'Review draft pricing logic (no client exposure).', requester: 'Proposal Agent', risk: 'Medium', impact: 'Affects future proposals; Dev only for now.', track: 'Track 6', environment: 'Development', qastatus: 'Not started', recommendation: 'Defer until draft is ready.', decision: 'Pending', ownernotes: '', datasource: SAMPLE },
  ],
  [`${PREFIX}_atlaschangerequest`]: [
    { name: 'Add Teams tab for Command Center', businessreason: 'Owner wants one-click access from Teams.', requestedoutcome: 'Command Center pinned as a Teams tab/app.', priority: 'Medium', affectedtrack: 'Track 7', affectedmodule: 'Command Center', risk: 'Low', desireddate: '2026-07-31', notes: 'Dev/UAT only; internal channel.', status: 'Submitted', datasource: SAMPLE },
    { name: 'Add revenue trend chart to home', businessreason: 'Owner wants a quick revenue trend on the home screen.', requestedoutcome: 'Small revenue trend visual on Executive Home.', priority: 'Low', affectedtrack: 'Track 4', affectedmodule: 'Revenue Summary', risk: 'Low', desireddate: '2026-08-15', notes: 'Depends on Revenue Sprint 4 feed.', status: 'Draft', datasource: SAMPLE },
    { name: 'Daily brief email at 7am', businessreason: 'Owner wants the brief delivered proactively.', requestedoutcome: 'Automated daily executive brief email.', priority: 'Medium', affectedtrack: 'Track 7', affectedmodule: 'Executive Brief', risk: 'Low', desireddate: '2026-08-01', notes: 'Dev-only flow first.', status: 'In Review', datasource: SAMPLE },
  ],
  [`${PREFIX}_atlasrisk`]: [
    { name: 'Website DNS cutover coordination', track: 'Track 2', severity: 'Medium', status: 'Open', mitigation: 'Pre-stage DNS; owner-scheduled cutover window.', datasource: SAMPLE },
    { name: 'Revenue data freshness dependency', track: 'Track 4', severity: 'Medium', status: 'Mitigating', mitigation: 'Label source + last-updated; snapshot fallback.', datasource: REPO },
    { name: 'Analytics metric definition drift', track: 'Track 8', severity: 'Low', status: 'Open', mitigation: 'Central metric dictionary.', datasource: SAMPLE },
    { name: 'Proposal template accuracy', track: 'Track 6', severity: 'Medium', status: 'Open', mitigation: 'Owner review before any client use.', datasource: SAMPLE },
  ],
  [`${PREFIX}_atlasblocker`]: [
    { name: 'Website go-live awaiting owner approval', track: 'Track 2', severity: 'High', status: 'Open', resolution: 'Owner to authorize publish + DNS.', datasource: SAMPLE },
    { name: 'Proposal pricing rules undefined', track: 'Track 6', severity: 'Medium', status: 'Open', resolution: 'Draft pricing model for owner review.', datasource: SAMPLE },
    { name: 'Analytics query layer consolidation', track: 'Track 8', severity: 'Low', status: 'In Progress', resolution: 'Refactor to shared query service.', datasource: SAMPLE },
  ],
  [`${PREFIX}_atlastechnicaldebt`]: [
    { name: 'Canvas UI polish deferred', track: 'Track 7', severity: 'Low', status: 'Accepted', details: 'Model-driven app first; Canvas polish later.', datasource: REPO },
    { name: 'Agent comms bus adapter refactor', track: 'Track 9', severity: 'Medium', status: 'Open', details: 'Consolidate adapters in Agent Bus 2.0.', datasource: REPO },
    { name: 'Analytics shared query service', track: 'Track 8', severity: 'Medium', status: 'Open', details: 'Multiple ad-hoc queries need consolidation.', datasource: SAMPLE },
  ],
  [`${PREFIX}_atlasrelease`]: [
    { name: 'Atlas Command Center Dev/UAT v1', track: 'Track 7', status: 'Released', environment: 'Development/UAT', commit: 'feature/atlas-powerapps-uat', qaresult: 'Passed (automated)', deploymentgate: 'Owner UAT', rollbackavailable: true, releasedate: '2026-07-17', datasource: REPO },
    { name: 'EOS Sprint 1 release', track: 'Track 9', status: 'Deployed', environment: 'Development', commit: 'feature/track9-eos-sprint1', qaresult: 'Passed', deploymentgate: 'Passed', rollbackavailable: true, releasedate: '2026-07-10', datasource: REPO },
    { name: 'Website staging candidate', track: 'Track 2', status: 'Candidate', environment: 'Staging', commit: 'feature/website-launch', qaresult: 'Passed (staging)', deploymentgate: 'Owner go-live', rollbackavailable: true, releasedate: '2026-07-15', datasource: SAMPLE },
    { name: 'Revenue Sprint 4 draft', track: 'Track 4', status: 'Draft', environment: 'Development', commit: 'feature/revenue-sprint4', qaresult: 'In progress', deploymentgate: 'QA', rollbackavailable: false, releasedate: null, datasource: REPO },
  ],
  [`${PREFIX}_atlasuatfeedback`]: [
    { name: 'Sample: Home screen loads clearly', screen: 'Executive Home', feedbacktype: 'Praise', severity: 'Low', expectedbehavior: 'Home shows portfolio at a glance.', actualbehavior: 'Loads with clear source labels.', suggestion: 'Consider a revenue trend widget.', status: 'New', datasource: SAMPLE },
    { name: 'Sample: Add filter to approvals', screen: 'Owner Approval Inbox', feedbacktype: 'Enhancement', severity: 'Low', expectedbehavior: 'Filter approvals by risk.', actualbehavior: 'All approvals listed together.', suggestion: 'Add a risk filter view.', status: 'New', datasource: SAMPLE },
  ],
  [`${PREFIX}_atlasbrief`]: [
    { name: `Executive Brief — ${new Date().toISOString().slice(0, 10)}`, briefdate: new Date().toISOString().slice(0, 10), whatchanged: 'Atlas Command Center Dev/UAT app published with 13 tables + sample data.', needsdecision: 'UAT sign-off for Track 7 command center; website go-live approval.', blocked: 'Website go-live awaiting owner approval.', atrisk: 'Website DNS cutover; revenue data freshness.', readyforqa: 'Revenue Sprint 4 (in progress).', readyforrelease: 'Atlas Command Center Dev/UAT v1.', topactions: '1) UAT the command center. 2) Decide on website go-live. 3) Review revenue commit.', datasource: REPO },
  ],
  [`${PREFIX}_atlasrevenuekpi`]: [
    { name: 'Pipeline Value', value: '1,250,000', unit: 'USD', trend: 'Up', period: 'Q3 2026', notes: 'Sample figure for UAT — not live.', datasource: SAMPLE },
    { name: 'New Leads (30d)', value: '42', unit: 'count', trend: 'Up', period: 'Last 30 days', notes: 'Sample figure for UAT — not live.', datasource: SAMPLE },
    { name: 'EVA Engagements Started', value: '7', unit: 'count', trend: 'Flat', period: 'Q3 2026', notes: 'Sample figure for UAT — not live.', datasource: SAMPLE },
    { name: 'Proposals Sent', value: '11', unit: 'count', trend: 'Up', period: 'Q3 2026', notes: 'Sample figure for UAT — not live.', datasource: SAMPLE },
    { name: 'Close Rate', value: '28', unit: '%', trend: 'Flat', period: 'Q3 2026', notes: 'Sample figure for UAT — not live.', datasource: SAMPLE },
    { name: 'Live Revenue Feed', value: 'Unavailable', unit: '', trend: '', period: 'N/A', notes: 'Live revenue not connected in Dev/UAT.', datasource: 'Unavailable' },
  ],
  [`${PREFIX}_atlasdatasource`]: [
    { name: 'Project Atlas Repository', sourcetype: 'Repository-derived', lastupdated: new Date().toISOString(), freshness: 'Fresh', environment: 'Development', details: 'Track/sprint/agent state derived from the Atlas repo docs.' },
    { name: 'EOS Snapshot (Track 9)', sourcetype: 'Repository-derived', lastupdated: new Date().toISOString(), freshness: 'Fresh', environment: 'Development', details: 'Engineering Operating System Sprint 2 snapshot.' },
    { name: 'Revenue Model (EVA)', sourcetype: 'Development sample', lastupdated: new Date().toISOString(), freshness: 'Aging', environment: 'Development', details: 'Revenue KPIs are sample figures for UAT, not live.' },
    { name: 'Live Revenue System', sourcetype: 'Unavailable', lastupdated: null, freshness: 'Unknown', environment: 'None', details: 'Not connected in Development/UAT.' },
    { name: 'Owner UAT Feedback', sourcetype: 'Development sample', lastupdated: new Date().toISOString(), freshness: 'Fresh', environment: 'Development/UAT', details: 'Feedback captured directly in this app.' },
    { name: 'Website Staging', sourcetype: 'Development sample', lastupdated: new Date().toISOString(), freshness: 'Fresh', environment: 'Staging', details: 'Staging status for the public website track.' },
  ],
};

async function main() {
  log('Seeding Development-safe sample data...');
  const failures = [];
  for (const [schema, records] of Object.entries(DATA)) {
    try {
      await seedTable(schema, records);
    } catch (e) {
      log(`  ! ${schema} failed: ${e.message.slice(0, 200)}`);
      failures.push(`${schema}: ${e.message}`);
    }
  }
  if (failures.length) { log(`\n${failures.length} issue(s):`); failures.forEach((f) => log(' - ' + f)); process.exitCode = 2; }
  else log('\nSeed complete.');
}

main().catch((e) => { console.error('SEED_FAIL', e.message); process.exit(1); });
