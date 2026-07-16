(function () {
  'use strict';

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }

  function panel(title, bodyHtml, wideClass) {
    var p = el('section', 'panel ' + (wideClass || ''));
    p.appendChild(el('h2', null, title));
    var body = el('div');
    body.innerHTML = bodyHtml;
    p.appendChild(body);
    return p;
  }

  function listHtml(items, formatter) {
    if (!items || !items.length) return '<p class="muted">None</p>';
    return '<ul class="list">' + items.map(formatter).join('') + '</ul>';
  }

  function healthHtml(h) {
    return '<p class="stat">' + (h.score != null ? h.score : '—') + '</p>' +
      '<p class="muted">' + (h.status || '') + '</p>';
  }

  function boot(snapshot) {
    var masterPm = new MasterPmAutomation(snapshot);
    var analytics = new EngineeringAnalytics({ kpis: [
      { id: 'sprint_velocity', label: 'Sprint Velocity', unit: 'percent', direction: 'higher_better' },
      { id: 'avg_cycle_time', label: 'Average Cycle Time', unit: 'days', direction: 'lower_better' },
      { id: 'lead_time', label: 'Lead Time', unit: 'days', direction: 'lower_better' },
      { id: 'qa_pass_rate', label: 'QA Pass Rate', unit: 'percent', direction: 'higher_better' },
      { id: 'regression_rate', label: 'Regression Rate', unit: 'percent', direction: 'lower_better' },
      { id: 'open_technical_debt', label: 'Open Technical Debt', unit: 'items', direction: 'lower_better' }
    ]});
    var dash = new ExecutiveEngineeringDashboard({
      snapshot: snapshot,
      analytics: analytics,
      masterPm: masterPm
    });
    var vm = dash.buildViewModel();

    document.getElementById('meta').textContent =
      'Audience: ' + vm.audience + '\n' + vm.generatedAt;

    var root = document.getElementById('root');
    root.appendChild(panel('Overall Project Health', healthHtml(vm.overallProjectHealth)));
    root.appendChild(panel('Engineering Health', healthHtml(vm.engineeringHealth)));
    root.appendChild(panel('Revenue Health', healthHtml(vm.revenueHealth)));
    root.appendChild(panel('Open Risks', listHtml(vm.openRisks, function (r) {
      return '<li><strong>' + r.id + '</strong> — ' + r.title +
        ' <span class="tag warn">' + r.severity + '</span></li>';
    }), 'wide'));
    root.appendChild(panel('Blocked Sprints', listHtml(vm.blockedSprints, function (s) {
      return '<li>' + s.name + '</li>';
    })));
    root.appendChild(panel('Upcoming Releases', listHtml(vm.upcomingReleases, function (r) {
      return '<li>' + (r.name || r.id) + '</li>';
    })));
    root.appendChild(panel('Deployment Status',
      '<p class="stat">' + (vm.deploymentStatus.ready ? 'READY' : 'GATED') + '</p>' +
      '<p class="muted">' + (vm.deploymentStatus.reason || '') + '</p>'));
    root.appendChild(panel('QA Queue',
      '<p class="stat">' + (vm.qaQueue.queueDepth != null ? vm.qaQueue.queueDepth : '—') + '</p>' +
      '<p class="muted">' + (vm.qaQueue.latestVerdict || '') + '</p>'));
    root.appendChild(panel('Critical Technical Debt', listHtml(vm.criticalTechnicalDebt, function (d) {
      return '<li>' + d.id + ' — ' + d.title + '</li>';
    }), 'wide'));
    root.appendChild(panel('Pending Decisions', listHtml(vm.pendingDecisions, function (d) {
      return '<li><strong>' + d.id + '</strong> — ' + d.title + ' <span class="tag warn">owner: ' + d.owner + '</span></li>';
    }), 'wide'));
    root.appendChild(panel('Top Engineering KPIs', vm.topKpis.map(function (k) {
      return '<div class="kpi-row"><span>' + k.label + '</span><strong>' + k.value + '</strong></div>';
    }).join(''), 'full'));
    root.appendChild(panel('Constraints', listHtml(vm.constraints, function (c) {
      return '<li>' + c + '</li>';
    }), 'full'));
  }

  fetch('data/sample-snapshot.json')
    .then(function (r) { return r.json(); })
    .then(boot)
    .catch(function (err) {
      document.getElementById('root').innerHTML =
        '<section class="panel full"><h2>Load error</h2><p>' + err.message + '</p></section>';
    });
})();
