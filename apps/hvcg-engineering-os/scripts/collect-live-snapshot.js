#!/usr/bin/env node
/**
 * Read-only live snapshot collector CLI (Development only).
 * Does not mutate Production, Track 1, Revenue, or agent-comms live bus.
 */
'use strict';

var fs = require('fs');
var path = require('path');
var { execSync } = require('child_process');
var LiveSnapshotCollector = require('../js/live-snapshot-collector.js');

var APP = path.resolve(__dirname, '..');
var WT_ROOT = path.resolve(APP, '../..');
var REPO_ROOT = path.resolve(WT_ROOT, '../..');
if (!fs.existsSync(path.join(REPO_ROOT, '.git')) && fs.existsSync(path.join(WT_ROOT, '.git'))) {
  REPO_ROOT = WT_ROOT;
}

var outPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(APP, 'data/live-snapshot.json');

var collector = new LiveSnapshotCollector({
  repoRoot: REPO_ROOT,
  fs: fs,
  path: path,
  execSync: execSync,
  registryPath: path.join(REPO_ROOT, '.agent-comms/registry.json'),
  atlasCurrentStatePath: path.join(WT_ROOT, 'PROJECT_ATLAS/CURRENT_STATE.md')
});

var snapshot = collector.collect();
fs.mkdirSync(path.dirname(outPath), { recursive: true });
collector.writeSnapshot(outPath, snapshot);
console.log(JSON.stringify({
  ok: true,
  path: outPath,
  worktrees: (snapshot.activeWorktrees || []).length,
  agents: (snapshot.assignedAgents || []).length,
  sources: snapshot.sources
}, null, 2));
