/**
 * Read-only live snapshot collector for Engineering OS.
 * Sources: git worktree list, agent registry, optional Atlas status file.
 */
(function (root) {
  'use strict';

  var EOS = root.EOS || require('./eos-core.js');

  function LiveSnapshotCollector(options) {
    options = options || {};
    this.repoRoot = options.repoRoot;
    this.fs = options.fs;
    this.path = options.path;
    this.execSync = options.execSync;
    this.registryPath = options.registryPath;
    this.atlasCurrentStatePath = options.atlasCurrentStatePath;
  }

  LiveSnapshotCollector.prototype._readRegistry = function () {
    if (!this.fs || !this.registryPath || !this.fs.existsSync(this.registryPath)) {
      return { agents: [], available: false };
    }
    var raw = JSON.parse(this.fs.readFileSync(this.registryPath, 'utf8'));
    var agents = [];
    if (Array.isArray(raw)) {
      agents = raw;
    } else if (raw.agents) {
      if (Array.isArray(raw.agents)) agents = raw.agents;
      else {
        Object.keys(raw.agents).forEach(function (id) {
          agents.push(Object.assign({ id: id }, raw.agents[id]));
        });
      }
    }
    return { agents: agents, available: true };
  };

  LiveSnapshotCollector.prototype._readWorktrees = function () {
    if (!this.execSync || !this.repoRoot) {
      return { worktrees: [], available: false, error: 'exec unavailable' };
    }
    try {
      var out = this.execSync('git worktree list --porcelain', {
        cwd: this.repoRoot,
        encoding: 'utf8'
      });
      var blocks = out.split('\n\n').filter(Boolean);
      var worktrees = blocks.map(function (block) {
        var lines = block.split('\n');
        var wt = { path: '', branch: '', bare: false };
        lines.forEach(function (line) {
          if (line.indexOf('worktree ') === 0) wt.path = line.slice(9);
          if (line.indexOf('branch ') === 0) wt.branch = line.slice(7).replace('refs/heads/', '');
          if (line === 'bare') wt.bare = true;
        });
        return wt;
      }).filter(function (w) { return !!w.path; });
      return { worktrees: worktrees, available: true };
    } catch (err) {
      return { worktrees: [], available: false, error: String(err.message || err) };
    }
  };

  LiveSnapshotCollector.prototype._atlasHint = function () {
    if (!this.fs || !this.atlasCurrentStatePath || !this.fs.existsSync(this.atlasCurrentStatePath)) {
      return { available: false };
    }
    var text = this.fs.readFileSync(this.atlasCurrentStatePath, 'utf8');
    return {
      available: true,
      path: this.atlasCurrentStatePath,
      hasTrack1: /Track 1/i.test(text),
      hasTrack9: /Track 9|EOS/i.test(text),
      hasRevenue: /Revenue|Track 2/i.test(text)
    };
  };

  LiveSnapshotCollector.prototype.collect = function () {
    var wt = this._readWorktrees();
    var reg = this._readRegistry();
    var atlas = this._atlasHint();
    var branches = {};
    (wt.worktrees || []).forEach(function (w) {
      if (w.branch) branches[w.branch] = true;
    });

    return {
      generatedAt: EOS.nowIso(),
      environment: 'Development',
      mode: 'live-readonly',
      atlasSyncStatus: atlas.available ? 'observed' : 'unknown',
      activeWorktrees: (wt.worktrees || []).map(function (w) {
        return {
          path: w.path,
          branch: w.branch || '(detached)',
          owner: 'observed'
        };
      }),
      activeBranches: Object.keys(branches).map(function (name) {
        return { name: name, owner: 'observed', track: 'observed' };
      }),
      assignedAgents: (reg.agents || []).slice(0, 50).map(function (a) {
        return {
          id: a.id || a.name || 'unknown',
          role: a.role || a.title || 'agent',
          assignment: a.assignment || a.status || 'registered',
          status: a.status || 'registered'
        };
      }),
      sources: {
        worktrees: wt.available,
        registry: reg.available,
        atlas: atlas.available,
        worktreeError: wt.error || null,
        atlasHints: atlas
      },
      deploymentReadiness: {
        ready: false,
        reason: 'Live snapshot is read-only; commit/push/deploy remain owner-gated'
      },
      constraints: [
        'Read-only collector',
        'No Production mutation',
        'No Track 1 mutation',
        'No Revenue mutation',
        'No live communications enabled'
      ]
    };
  };

  LiveSnapshotCollector.prototype.writeSnapshot = function (targetPath, snapshot) {
    if (!this.fs || !targetPath) throw new Error('fs and targetPath required');
    this.fs.writeFileSync(targetPath, JSON.stringify(snapshot || this.collect(), null, 2));
    return targetPath;
  };

  root.LiveSnapshotCollector = LiveSnapshotCollector;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = LiveSnapshotCollector;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
