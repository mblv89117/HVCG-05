(function () {
  'use strict';

  function escape(value) {
    return EOS.escapeHtml(value);
  }

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }

  function panel(title, bodyHtml, wideClass) {
    var p = el('section', 'panel ' + (wideClass || ''));
    p.appendChild(el('h2', null, escape(title)));
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
    return '<p class="stat">' + escape(h.score != null ? h.score : '—') + '</p>' +
      '<p class="muted">' + escape(h.status || '') + '</p>';
  }

  function boot(snapshot, kpiDefs) {
    var masterPm = new MasterPmAutomation(snapshot);
    var analytics = new EngineeringAnalytics(kpiDefs);
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
      return '<li><strong>' + escape(r.id) + '</strong> — ' + escape(r.title) +
        ' <span class="tag warn">' + escape(r.severity) + '</span></li>';
    }), 'wide'));
    root.appendChild(panel('Blocked Sprints', listHtml(vm.blockedSprints, function (s) {
      return '<li>' + escape(s.name) + '</li>';
    })));
    root.appendChild(panel('Upcoming Releases', listHtml(vm.upcomingReleases, function (r) {
      return '<li>' + escape(r.name || r.id) + '</li>';
    })));
    root.appendChild(panel('Deployment Status',
      '<p class="stat">' + escape(vm.deploymentStatus.ready ? 'READY' : 'GATED') + '</p>' +
      '<p class="muted">' + escape(vm.deploymentStatus.reason || '') + '</p>'));
    root.appendChild(panel('QA Queue',
      '<p class="stat">' + escape(vm.qaQueue.queueDepth != null ? vm.qaQueue.queueDepth : '—') + '</p>' +
      '<p class="muted">' + escape(vm.qaQueue.latestVerdict || '') + '</p>'));
    root.appendChild(panel('Critical Technical Debt', listHtml(vm.criticalTechnicalDebt, function (d) {
      return '<li>' + escape(d.id) + ' — ' + escape(d.title) + '</li>';
    }), 'wide'));
    root.appendChild(panel('Pending Decisions', listHtml(vm.pendingDecisions, function (d) {
      return '<li><strong>' + escape(d.id) + '</strong> — ' + escape(d.title) + ' <span class="tag warn">owner: ' + escape(d.owner) + '</span></li>';
    }), 'wide'));
    root.appendChild(panel('Top Engineering KPIs', vm.topKpis.map(function (k) {
      return '<div class="kpi-row"><span>' + escape(k.label) + '</span><strong>' + escape(k.value) + '</strong></div>';
    }).join(''), 'full'));
    root.appendChild(panel('Constraints', listHtml(vm.constraints, function (c) {
      return '<li>' + escape(c) + '</li>';
    }), 'full'));
  }

  Promise.all([
    fetch('data/sample-snapshot.json').then(function (r) { return r.json(); }),
    fetch('config/kpi-definitions.json').then(function (r) { return r.json(); })
  ]).then(function (results) {
    boot(results[0], results[1]);
  }).catch(function (err) {
    document.getElementById('root').innerHTML =
      '<section class="panel full"><h2>Load error</h2><p>' + EOS.escapeHtml(err.message) + '</p></section>';
  });
})();
