#!/usr/bin/env node
/**
 * EOS Sprint 2 — gates, KPI SoT, XSS, snapshot, bus persist/bridge, freeze tests.
 */
'use strict';

var fs = require('fs');
var path = require('path');
var os = require('os');
var { execSync } = require('child_process');

var ROOT = path.resolve(__dirname, '../..');
var APP = path.join(ROOT, 'apps/hvcg-engineering-os');

var EOS = require(path.join(APP, 'js/eos-core.js'));
var WorkflowEngine = require(path.join(APP, 'js/workflow-engine.js'));
var AgentBusV2 = require(path.join(APP, 'js/agent-bus-v2.js'));
var AgentBusBridge = require(path.join(APP, 'js/agent-bus-bridge.js'));
var LiveSnapshotCollector = require(path.join(APP, 'js/live-snapshot-collector.js'));
var EngineeringAnalytics = require(path.join(APP, 'js/engineering-analytics.js'));

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

function throws(fn, match, name) {
  var ok = false;
  var msg = '';
  try {
    fn();
  } catch (err) {
    ok = true;
    msg = String(err.message || err);
  }
  assert(ok && (!match || msg.indexOf(match) >= 0), name + (ok ? '' : ' (no throw)'));
}

console.log('EOS Sprint 2 tests\n');

var stages = loadJson('config/workflow-stages.json');
var kpis = loadJson('config/kpi-definitions.json');
var msgTypes = loadJson('config/message-types-v2.json');

// --- Config validation ---
assert(stages.version === 'eos-2.0.0', 'workflow config version eos-2.0.0');
assert(!!stages.transitionGates && !!stages.transitionGates.deployment, 'transitionGates present');
assert(kpis.sourceOfTruth === true, 'KPI config marked sourceOfTruth');
assert(kpis.kpis.length === 10, 'KPI SoT has 10 definitions');
assert(msgTypes.requiredFields.indexOf('relatedTrack') >= 0, 'bus config validates relatedTrack');

// --- DEF-EOS-001 workflow gates ---
var wf = new WorkflowEngine({
  stages: stages.stages,
  transitionGates: stages.transitionGates
});
var item = wf.createItem({ title: 'Gated item', sprintId: 'eos-sprint-2', trackId: 'track9' });
['impact_analysis', 'change_request', 'assignment', 'development', 'testing'].forEach(function () {
  wf.advance(item.id);
});
throws(function () { wf.advance(item.id); }, 'Gate blocked for qa', 'qa blocked without testingComplete');
wf.setApproval(item.id, 'testingComplete', true);
wf.advance(item.id);
assert(wf.getItem(item.id).stage === 'qa', 'qa allowed after testingComplete');
throws(function () { wf.setStage(item.id, 'deployment', 'jump'); }, 'Illegal stage jump', 'rejects non-sequential setStage');
throws(function () { wf.advance(item.id); }, 'Gate blocked for owner_approval', 'owner_approval blocked without qaApproved');

var blocked = wf.createItem({ title: 'Blocked' });
wf.block(blocked.id, 'owner hold');
throws(function () { wf.advance(blocked.id); }, 'Item blocked', 'blocked item cannot advance');

// --- DEF-EOS-002 KPI SoT ---
var appCc = fs.readFileSync(path.join(APP, 'js/app-command-center.js'), 'utf8');
var appEx = fs.readFileSync(path.join(APP, 'js/app-executive.js'), 'utf8');
assert(appCc.indexOf('kpi-definitions.json') >= 0, 'command center loads KPI config');
assert(appEx.indexOf('kpi-definitions.json') >= 0, 'executive loads KPI config');
assert(appEx.indexOf('EOS Sprint 2 Release') >= 0, 'executive shows Sprint 2 release');
assert(appCc.indexOf("id: 'sprint_velocity'") < 0, 'command center has no embedded KPI array');
assert(appEx.indexOf("id: 'sprint_velocity'") < 0, 'executive has no embedded KPI array');
var analytics = new EngineeringAnalytics(kpis);
var metrics = analytics.compute(loadJson('data/sample-snapshot.json'));
assert(metrics.kpis[0].id === kpis.kpis[0].id, 'analytics uses SoT ids');
assert(metrics.values.open_technical_debt === 0, 'EOS dashboard debt is closed');

// --- DEF-EOS-003 XSS escape ---
assert(EOS.escapeHtml('<script>alert(1)</script>') === '&lt;script&gt;alert(1)&lt;/script&gt;', 'escapeHtml encodes script tags');
assert(EOS.escapeHtml('"x" & \'y\'') === '&quot;x&quot; &amp; &#39;y&#39;', 'escapeHtml encodes quotes and amp');
assert(appCc.indexOf('EOS.escapeHtml') >= 0 || appCc.indexOf('escape(') >= 0, 'command center escapes output');
assert(appEx.indexOf('EOS.escapeHtml') >= 0 || appEx.indexOf('escape(') >= 0, 'executive escapes output');

// --- DEF-EOS-004 live snapshot (read-only) ---
var collector = new LiveSnapshotCollector({
  repoRoot: ROOT,
  fs: fs,
  path: path,
  execSync: execSync,
  registryPath: path.join(ROOT, '.agent-comms/registry.json'),
  atlasCurrentStatePath: path.join(ROOT, 'PROJECT_ATLAS/CURRENT_STATE.md')
});
var live = collector.collect();
assert(live.mode === 'live-readonly', 'snapshot mode live-readonly');
assert(Array.isArray(live.activeWorktrees), 'snapshot worktrees array');
assert(live.deploymentReadiness.ready === false, 'snapshot keeps deploy gated');
assert((live.constraints || []).join(' ').indexOf('Read-only') >= 0, 'snapshot constraints include read-only');

var tmpSnap = path.join(os.tmpdir(), 'eos-live-snapshot-test.json');
collector.writeSnapshot(tmpSnap, live);
assert(fs.existsSync(tmpSnap), 'snapshot write helper works');
fs.unlinkSync(tmpSnap);

// --- DEF-EOS-005 persistence + bridge ---
var storePath = path.join(os.tmpdir(), 'eos-bus-test-' + Date.now() + '.json');
var outbox = path.join(os.tmpdir(), 'eos-bridge-outbox-' + Date.now());
var bus = new AgentBusV2({
  types: msgTypes.types,
  storePath: storePath,
  fs: fs
});
var sent = bus.send({
  sourceAgent: 'master-pm',
  destinationAgent: 'qa-agent',
  priority: 'P1',
  relatedSprint: 'eos-sprint-2',
  relatedTrack: 'track9',
  type: 'status_update',
  body: { subject: 'persist me', note: 'offline' }
});
assert(fs.existsSync(storePath), 'bus persist writes store file');
var bus2 = new AgentBusV2({ types: msgTypes.types, storePath: storePath, fs: fs });
assert(bus2.list().length === 1, 'bus load restores messages');
assert(bus2.list()[0].messageId === sent.messageId, 'persisted message id matches');

var bridge = new AgentBusBridge({ outboxDir: outbox, fs: fs, path: path, live: false });
var bridged = bridge.bridge(sent);
assert(bridged.live === false, 'bridge is offline');
assert(bridged.persisted === true, 'bridge wrote draft outbox');
assert(bridged.message.from === 'master-pm', 'bridge maps sourceAgent→from');
assert(bridged.message.to[0] === 'qa-agent', 'bridge maps destinationAgent→to');
assert(bridged.message.threadId === sent.correlationId, 'bridge maps correlationId→threadId');
throws(function () {
  new AgentBusBridge({ live: true }).bridge(sent);
}, 'Live agent-comms send is disabled', 'live bridge throws');

fs.unlinkSync(storePath);
fs.rmSync(outbox, { recursive: true, force: true });

// --- Freeze / boundary ---
var status = execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf8' });
assert(!/apps\/hvcg-revenue|Track1_Production\.md|deployment-engineer\/releases\/Track-1/.test(status), 'no Revenue/Track1 freeze path edits in status');
assert(!fs.existsSync(path.join(ROOT, 'apps/hvcg-revenue')), 'no revenue app tree');
var indexHtml = fs.readFileSync(path.join(APP, 'index.html'), 'utf8');
assert(indexHtml.indexOf('Development only') >= 0, 'UI remains Development only');

// --- Negative path: invalid bus ---
throws(function () {
  new AgentBusV2({ types: msgTypes.types }).send({
    sourceAgent: 'a',
    destinationAgent: 'b',
    type: 'not_a_type',
    relatedSprint: 's',
    relatedTrack: 't',
    body: {}
  });
}, 'Unknown type', 'bus rejects unknown type');

console.log('\nResult: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
