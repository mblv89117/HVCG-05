#!/usr/bin/env node
/**
 * EOS Sprint 1 — automated tests (Development only).
 */
'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '../..');
var APP = path.join(ROOT, 'apps/hvcg-engineering-os');

var EOS = require(path.join(APP, 'js/eos-core.js'));
var WorkflowEngine = require(path.join(APP, 'js/workflow-engine.js'));
var ChangeRequestSystem = require(path.join(APP, 'js/change-request-system.js'));
var AgentBusV2 = require(path.join(APP, 'js/agent-bus-v2.js'));
var MasterPmAutomation = require(path.join(APP, 'js/master-pm-automation.js'));
var EngineeringAnalytics = require(path.join(APP, 'js/engineering-analytics.js'));
var CommandCenter = require(path.join(APP, 'js/command-center.js'));
var ExecutiveEngineeringDashboard = require(path.join(APP, 'js/executive-dashboard.js'));

var passed = 0;
var failed = 0;

function assert(cond, name) {
  if (cond) {
    passed += 1;
    console.log('  PASS  ' + name);
  } else {
    failed += 1;
    console.log('  FAIL  ' + name);
  }
}

function loadJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(APP, rel), 'utf8'));
}

console.log('EOS Sprint 1 tests\n');

var snapshot = loadJson('data/sample-snapshot.json');
var stages = loadJson('config/workflow-stages.json');
var kpis = loadJson('config/kpi-definitions.json');
var msgTypes = loadJson('config/message-types-v2.json');

assert(stages.stages.length === 14, 'workflow has 14 stages');
assert(msgTypes.requiredFields.indexOf('correlationId') >= 0, 'bus v2 requires correlationId');
assert(kpis.kpis.length === 10, '10 KPI definitions');

var wf = new WorkflowEngine({ stages: stages.stages });
var item = wf.createItem({ title: 'Test item', trackId: 'track9', sprintId: 'eos-sprint-1' });
assert(item.stage === 'owner_request', 'workflow starts at owner_request');
wf.advance(item.id);
assert(wf.getItem(item.id).stage === 'impact_analysis', 'advance to impact_analysis');
for (var i = 0; i < 12; i++) wf.advance(item.id);
assert(wf.getItem(item.id).stage === 'close_sprint', 'can reach close_sprint');
assert(wf.progressPercent(item.id) === 100, 'progress 100 at close');

var crs = new ChangeRequestSystem();
var cr = crs.create({
  title: 'Test CR',
  businessReason: 'test',
  impactAnalysis: 'none',
  riskAnalysis: 'low',
  testingPlan: 'unit',
  rollbackPlan: 'revert',
  affectedTracks: ['track9'],
  affectedModules: ['eos']
});
assert(cr.status === 'draft', 'CR starts draft');
crs.approve(cr.id, 'owner', 'Manny');
crs.approve(cr.id, 'qa', 'qa-agent');
crs.approve(cr.id, 'deployment', 'deployment-manager');
assert(crs.isReleaseReady(cr.id), 'CR release ready after triple approval');

var bus = new AgentBusV2({ types: msgTypes.types });
var msg = bus.send({
  sourceAgent: 'master-pm',
  destinationAgent: 'qa-agent',
  priority: 'P1',
  relatedSprint: 'eos-sprint-1',
  relatedTrack: 'track9',
  type: 'qa_request',
  body: { note: 'please review' }
});
assert(!!msg.messageId && !!msg.correlationId && !!msg.timestamp, 'bus message has id/ts/correlation');
assert(bus.list({ type: 'qa_request' }).length === 1, 'bus filter by type');

var pm = new MasterPmAutomation(snapshot);
pm.trackAgent({ id: 'dev-1', role: 'dev', assignment: 'EOS', status: 'active' });
pm.trackWorktree({ path: '.worktrees/x', branch: 'cursor/x', owner: 'dev-1' });
pm.trackSprintAssignment('eos-sprint-1', 'master-pm');
pm.trackBranchOwnership('cursor/track9-eos-sprint1', 'master-pm');
pm.trackQaRequest({ id: 'QA-1', status: 'open' });
assert(pm.generateSprintSummary('eos-sprint-1').type === 'sprint_summary', 'sprint summary');
assert(pm.generateReleaseSummary().type === 'release_summary', 'release summary');
assert(pm.generateOwnerBriefing().type === 'owner_briefing', 'owner briefing');
assert(pm.trackReleaseReadiness().ready === false, 'deployment gated');

var analytics = new EngineeringAnalytics(kpis);
var metrics = analytics.compute(snapshot);
assert(metrics.values.qa_pass_rate === 100, 'qa pass rate 100');
assert(metrics.values.atlas_health === 100, 'atlas health 100');
assert(metrics.kpis.length === 10, 'analytics returns 10 kpis');

var cc = new CommandCenter({
  snapshot: snapshot,
  analytics: analytics,
  masterPm: pm,
  workflow: wf,
  crs: crs,
  bus: bus
});
var ccVm = cc.buildViewModel();
assert(ccVm.activeTracks.length >= 3, 'command center tracks');
assert(ccVm.atlasSynchronizationStatus === 'healthy', 'atlas sync surfaced');
assert(Array.isArray(ccVm.openChangeRequests), 'open CRs array');

var exec = new ExecutiveEngineeringDashboard({
  snapshot: snapshot,
  analytics: analytics,
  masterPm: pm
});
var exVm = exec.buildViewModel();
assert(exVm.overallProjectHealth.score >= 80, 'exec overall health');
assert(exVm.pendingDecisions.length >= 1, 'pending decisions present');
assert(exVm.constraints.length >= 3, 'constraints listed');

// Regression guards: do not ship Production activation flags
var indexHtml = fs.readFileSync(path.join(APP, 'index.html'), 'utf8');
assert(indexHtml.indexOf('Development only') >= 0, 'UI marked Development only');
assert(!fs.existsSync(path.join(ROOT, 'apps/hvcg-revenue')), 'no revenue app mutation in EOS tree check');

console.log('\nResult: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
