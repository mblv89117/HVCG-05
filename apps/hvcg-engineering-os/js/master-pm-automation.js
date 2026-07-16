/**
 * Master PM Automation — tracking + automatic summaries / briefings.
 */
(function (root) {
  'use strict';

  var EOS = root.EOS || require('./eos-core.js');

  function MasterPmAutomation(snapshot) {
    this.snapshot = snapshot || {};
    this.agents = {};
    this.worktrees = {};
    this.sprints = {};
    this.branches = {};
    this.qaRequests = [];
    this.docStatus = {};
    this.deploymentApprovals = [];
    this._ingestSnapshot(this.snapshot);
  }

  MasterPmAutomation.prototype._ingestSnapshot = function (s) {
    (s.assignedAgents || []).forEach(function (a) {
      this.agents[a.id] = EOS.deepClone(a);
    }.bind(this));
    (s.activeWorktrees || []).forEach(function (w) {
      this.worktrees[w.path] = EOS.deepClone(w);
    }.bind(this));
    (s.activeSprints || []).forEach(function (sp) {
      this.sprints[sp.id] = EOS.deepClone(sp);
    }.bind(this));
    (s.activeBranches || []).forEach(function (b) {
      this.branches[b.name] = EOS.deepClone(b);
    }.bind(this));
    this.qaRequests = EOS.deepClone(s.qaStatus ? [{ id: 'qa-queue', status: s.qaStatus.latestVerdict, depth: s.qaStatus.queueDepth }] : []);
    this.deploymentApprovals = EOS.deepClone(s.ownerApprovals || []);
    this.docStatus = {
      atlasSyncStatus: s.atlasSyncStatus || 'unknown',
      coverageHint: 'See analytics documentation_coverage'
    };
  };

  MasterPmAutomation.prototype.trackAgent = function (agent) {
    this.agents[agent.id] = EOS.deepClone(agent);
    return this.agents[agent.id];
  };

  MasterPmAutomation.prototype.trackWorktree = function (wt) {
    this.worktrees[wt.path] = EOS.deepClone(wt);
    return this.worktrees[wt.path];
  };

  MasterPmAutomation.prototype.trackSprintAssignment = function (sprintId, agentId) {
    if (!this.sprints[sprintId]) this.sprints[sprintId] = { id: sprintId };
    this.sprints[sprintId].assignedAgent = agentId;
    return EOS.deepClone(this.sprints[sprintId]);
  };

  MasterPmAutomation.prototype.trackBranchOwnership = function (branch, owner) {
    this.branches[branch] = Object.assign({}, this.branches[branch] || { name: branch }, { owner: owner });
    return EOS.deepClone(this.branches[branch]);
  };

  MasterPmAutomation.prototype.trackQaRequest = function (req) {
    this.qaRequests.push(EOS.deepClone(req));
    return req;
  };

  MasterPmAutomation.prototype.trackReleaseReadiness = function () {
    var ready = !!(this.snapshot.deploymentReadiness && this.snapshot.deploymentReadiness.ready);
    return {
      ready: ready,
      reason: (this.snapshot.deploymentReadiness && this.snapshot.deploymentReadiness.reason) || 'Unknown',
      openCrs: (this.snapshot.openChangeRequests || []).length,
      pendingOwnerApprovals: (this.snapshot.ownerApprovals || []).filter(function (a) {
        return a.status === 'pending';
      }).length
    };
  };

  MasterPmAutomation.prototype.trackDocumentationStatus = function () {
    return EOS.deepClone(this.docStatus);
  };

  MasterPmAutomation.prototype.trackDeploymentApprovals = function () {
    return EOS.deepClone(this.deploymentApprovals);
  };

  MasterPmAutomation.prototype.generateSprintSummary = function (sprintId) {
    var sprint = this.sprints[sprintId] || (this.snapshot.activeSprints || []).find(function (s) {
      return s.id === sprintId;
    }) || {};
    return {
      type: 'sprint_summary',
      generatedAt: EOS.nowIso(),
      sprintId: sprintId,
      name: sprint.name || sprintId,
      progressPercent: sprint.progressPercent || 0,
      status: sprint.status || 'unknown',
      blocked: !!sprint.blocked,
      agents: Object.keys(this.agents).length,
      worktrees: Object.keys(this.worktrees).length,
      branches: Object.keys(this.branches).length
    };
  };

  MasterPmAutomation.prototype.generateReleaseSummary = function () {
    var readiness = this.trackReleaseReadiness();
    return {
      type: 'release_summary',
      generatedAt: EOS.nowIso(),
      candidates: this.snapshot.releaseCandidates || [],
      readiness: readiness,
      qa: this.snapshot.qaStatus || {},
      environment: this.snapshot.environment || 'Development'
    };
  };

  MasterPmAutomation.prototype.generateOwnerBriefing = function () {
    return {
      type: 'owner_briefing',
      generatedAt: EOS.nowIso(),
      overallProjectHealth: this.snapshot.overallProjectHealth || {},
      engineeringHealth: this.snapshot.engineeringHealth || {},
      revenueHealth: this.snapshot.revenueHealth || {},
      openRisks: this.snapshot.openRisks || [],
      blockedItems: this.snapshot.blockedItems || [],
      pendingDecisions: this.snapshot.pendingDecisions || [],
      atlasSyncStatus: this.snapshot.atlasSyncStatus || 'unknown',
      constraints: [
        'No Production mutation',
        'No Track 1 mutation',
        'No Revenue Sprint 4 mutation',
        'Commit/push gated on owner authorization'
      ]
    };
  };

  root.MasterPmAutomation = MasterPmAutomation;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MasterPmAutomation;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
