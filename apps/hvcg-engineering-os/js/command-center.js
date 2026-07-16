/**
 * Engineering Command Center — render dashboard panels from snapshot + engines.
 */
(function (root) {
  'use strict';

  var EOS = root.EOS;

  function CommandCenter(deps) {
    this.snapshot = deps.snapshot;
    this.analytics = deps.analytics;
    this.masterPm = deps.masterPm;
    this.workflow = deps.workflow;
    this.crs = deps.crs;
    this.bus = deps.bus;
  }

  CommandCenter.prototype.buildViewModel = function () {
    var s = this.snapshot;
    var kpi = this.analytics.compute(s);
    var briefing = this.masterPm.generateOwnerBriefing();
    var sprintSummary = (s.activeSprints || []).map(function (sp) {
      return this.masterPm.generateSprintSummary(sp.id);
    }.bind(this));

    return {
      title: 'Engineering Command Center',
      version: EOS.VERSION,
      generatedAt: EOS.nowIso(),
      activeTracks: s.activeTracks || [],
      activeSprints: s.activeSprints || [],
      activeBranches: s.activeBranches || [],
      activeWorktrees: s.activeWorktrees || [],
      assignedAgents: s.assignedAgents || [],
      sprintProgress: sprintSummary,
      blockedItems: s.blockedItems || [],
      qaStatus: s.qaStatus || {},
      deploymentReadiness: s.deploymentReadiness || {},
      technicalDebt: s.technicalDebt || [],
      openChangeRequests: this.crs.listOpen(),
      atlasSynchronizationStatus: s.atlasSyncStatus || 'unknown',
      releaseCandidates: s.releaseCandidates || [],
      ownerApprovals: s.ownerApprovals || [],
      kpis: kpi.kpis,
      briefingHighlights: {
        overall: briefing.overallProjectHealth,
        engineering: briefing.engineeringHealth,
        pendingDecisions: briefing.pendingDecisions
      },
      workflowBoard: this.workflow.listByStage(),
      recentBusMessages: this.bus.list().slice(-10).reverse()
    };
  };

  root.CommandCenter = CommandCenter;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CommandCenter;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
