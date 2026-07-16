/**
 * Executive Engineering Dashboard — owner one-page health view.
 */
(function (root) {
  'use strict';

  var EOS = root.EOS;

  function ExecutiveEngineeringDashboard(deps) {
    this.snapshot = deps.snapshot;
    this.analytics = deps.analytics;
    this.masterPm = deps.masterPm;
  }

  ExecutiveEngineeringDashboard.prototype.buildViewModel = function () {
    var s = this.snapshot;
    var kpi = this.analytics.compute(s);
    var briefing = this.masterPm.generateOwnerBriefing();
    var release = this.masterPm.generateReleaseSummary();

    return {
      title: 'Executive Engineering Dashboard',
      audience: 'Manny',
      generatedAt: EOS.nowIso(),
      overallProjectHealth: s.overallProjectHealth || {},
      engineeringHealth: s.engineeringHealth || {},
      revenueHealth: s.revenueHealth || {},
      openRisks: s.openRisks || [],
      blockedSprints: (s.activeSprints || []).filter(function (sp) { return sp.blocked; }),
      upcomingReleases: s.upcomingReleases || [],
      deploymentStatus: s.deploymentReadiness || {},
      qaQueue: s.qaStatus || {},
      criticalTechnicalDebt: (s.technicalDebt || []).filter(function (d) {
        return d.severity === 'high' || d.severity === 'critical';
      }),
      pendingDecisions: s.pendingDecisions || [],
      topKpis: kpi.kpis.slice(0, 6),
      ownerBriefing: briefing,
      releaseSummary: release,
      constraints: [
        'Development only',
        'No Production / Track 1 / Revenue Sprint 4 mutation',
        'Awaiting owner review before commit or push'
      ]
    };
  };

  root.ExecutiveEngineeringDashboard = ExecutiveEngineeringDashboard;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExecutiveEngineeringDashboard;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
