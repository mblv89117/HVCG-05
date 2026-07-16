/**
 * Engineering Analytics — KPI computation from snapshot seed metrics.
 */
(function (root) {
  'use strict';

  var EOS = root.EOS || require('./eos-core.js');

  function EngineeringAnalytics(kpiDefs) {
    this.kpiDefs = kpiDefs || { kpis: [] };
  }

  EngineeringAnalytics.prototype.compute = function (snapshot) {
    var m = (snapshot && snapshot.metricsSeed) || {};
    var debt = (snapshot && snapshot.technicalDebt) || [];
    var velocity = m.plannedPoints ? EOS.pct(m.completedPoints || 0, m.plannedPoints) : 0;
    var avgCycle = Math.round((EOS.avg(m.cycleTimesDays || []) || 0) * 10) / 10;
    var lead = Math.round((EOS.avg(m.leadTimesDays || []) || 0) * 10) / 10;
    var qaTotal = (m.qaPassed || 0) + (m.qaFailed || 0);
    var qaPass = qaTotal ? EOS.pct(m.qaPassed || 0, qaTotal) : 100;
    var regression = qaTotal ? EOS.pct(m.regressions || 0, qaTotal) : 0;
    var docs = EOS.pct(m.docsPresent || 0, m.docsExpected || 1);
    var atlasHealth = m.atlasTotalLinks
      ? Math.round(100 - EOS.pct(m.atlasBrokenLinks || 0, m.atlasTotalLinks))
      : 0;

    var values = {
      sprint_velocity: velocity,
      avg_cycle_time: avgCycle,
      lead_time: lead,
      qa_pass_rate: qaPass,
      regression_rate: regression,
      open_technical_debt: debt.length,
      agent_throughput: m.agentCompletedItems || 0,
      deployment_frequency: m.deploysLast30Days || 0,
      documentation_coverage: docs,
      atlas_health: atlasHealth
    };

    var kpis = (this.kpiDefs.kpis || []).map(function (def) {
      return {
        id: def.id,
        label: def.label,
        unit: def.unit,
        direction: def.direction,
        value: values[def.id] !== undefined ? values[def.id] : null
      };
    });

    return {
      computedAt: EOS.nowIso(),
      kpis: kpis,
      values: values
    };
  };

  root.EngineeringAnalytics = EngineeringAnalytics;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = EngineeringAnalytics;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
