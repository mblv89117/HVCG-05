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

  function boot(snapshot, kpiDefs) {
    var stagesCfg = window.__EOS_WORKFLOW_STAGES__ || { stages: [], transitionGates: {} };
    var workflow = new WorkflowEngine({
      stages: stagesCfg.stages,
      transitionGates: stagesCfg.transitionGates || {}
    });
    var wf = workflow.createItem({
      title: 'EOS Sprint 2 delivery',
      trackId: 'track9',
      sprintId: 'eos-sprint-2',
      approvals: { testingComplete: true }
    });
    workflow.setStage(wf.id, 'impact_analysis', 'Sprint 2 start');
    // advance through ungated stages to testing, then qa with gate
    ['change_request', 'assignment', 'development', 'testing'].forEach(function () {
      workflow.advance(wf.id);
    });
    workflow.advance(wf.id, 'QA gate satisfied');

    var crs = new ChangeRequestSystem();
    crs.create({
      id: 'CR-EOS-S2-001',
      title: 'EOS Sprint 2 — harden gates, KPIs, XSS, snapshot, bus',
      businessReason: 'Resolve DEF-EOS-001 through DEF-EOS-005',
      impactAnalysis: 'Additive hardening on Track 9 EOS only',
      riskAnalysis: 'Low — Dev only; live bridge disabled',
      dependencies: ['EOS Sprint 1', 'agent-comms v1 template'],
      testingPlan: 'tests/eos/run_eos_sprint2_tests.js',
      rollbackPlan: 'Revert to track9-eos-sprint1 tip',
      affectedTracks: ['track9'],
      affectedModules: [
        'workflow-engine', 'kpi-config', 'ui-escape',
        'live-snapshot', 'agent-bus-v2', 'agent-bus-bridge'
      ]
    });
    crs.setStatus('CR-EOS-S2-001', 'submitted');

    var bus = new AgentBusV2();
    bus.send({
      sourceAgent: 'master-pm',
      destinationAgent: 'qa-agent',
      priority: 'P1',
      status: 'sent',
      relatedSprint: 'eos-sprint-2',
      relatedTrack: 'track9',
      type: 'qa_request',
      body: { subject: 'EOS Sprint 2 QA review requested' }
    });

    var masterPm = new MasterPmAutomation(snapshot);
    var analytics = new EngineeringAnalytics(kpiDefs);

    var cc = new CommandCenter({
      snapshot: snapshot,
      analytics: analytics,
      masterPm: masterPm,
      workflow: workflow,
      crs: crs,
      bus: bus
    });
    var vm = cc.buildViewModel();

    document.getElementById('meta').textContent =
      'v' + vm.version + ' · ' + vm.generatedAt + '\nAtlas: ' + vm.atlasSynchronizationStatus;

    var root = document.getElementById('root');
    root.appendChild(panel('Active Tracks', listHtml(vm.activeTracks, function (t) {
      return '<li><strong>' + escape(t.name) + '</strong> <span class="tag">' + escape(t.status) + '</span></li>';
    }), 'wide'));
    root.appendChild(panel('Active Sprints', listHtml(vm.activeSprints, function (s) {
      return '<li><strong>' + escape(s.name) + '</strong> — ' + escape(s.progressPercent) + '% <span class="tag">' + escape(s.status) + '</span></li>';
    }), 'wide'));
    root.appendChild(panel('Assigned Agents', listHtml(vm.assignedAgents, function (a) {
      return '<li><strong>' + escape(a.id) + '</strong> — ' + escape(a.assignment) + ' <span class="tag">' + escape(a.status) + '</span></li>';
    })));
    root.appendChild(panel('Active Branches', listHtml(vm.activeBranches, function (b) {
      return '<li><code>' + escape(b.name) + '</code> · ' + escape(b.owner) + '</li>';
    }), 'wide'));
    root.appendChild(panel('Active Worktrees', listHtml(vm.activeWorktrees, function (w) {
      return '<li><code>' + escape(w.path) + '</code><br/><span class="muted">' + escape(w.branch) + '</span></li>';
    }), 'wide'));
    root.appendChild(panel('Sprint Progress', listHtml(vm.sprintProgress, function (s) {
      return '<li>' + escape(s.name) + ': ' + escape(s.progressPercent) + '% (' + escape(s.status) + ')</li>';
    })));
    root.appendChild(panel('Blocked Items', listHtml(vm.blockedItems, function (b) {
      return '<li>' + escape(b.title || JSON.stringify(b)) + '</li>';
    })));
    root.appendChild(panel('QA Status',
      '<p class="stat">' + escape(vm.qaStatus.latestVerdict || '—') + '</p>' +
      '<p class="muted">Queue depth: ' + escape(vm.qaStatus.queueDepth || 0) +
      ' · Pass rate: ' + escape(vm.qaStatus.passRatePercent || 0) + '%</p>'));
    root.appendChild(panel('Deployment Readiness',
      '<p class="stat">' + escape(vm.deploymentReadiness.ready ? 'READY' : 'NOT READY') + '</p>' +
      '<p class="muted">' + escape(vm.deploymentReadiness.reason || '') + '</p>'));
    root.appendChild(panel('Technical Debt', listHtml(vm.technicalDebt, function (d) {
      return '<li><strong>' + escape(d.id) + '</strong> — ' + escape(d.title) + ' <span class="tag warn">' + escape(d.severity) + '</span></li>';
    }), 'wide'));
    root.appendChild(panel('Open Change Requests', listHtml(vm.openChangeRequests, function (c) {
      return '<li><strong>' + escape(c.id) + '</strong> — ' + escape(c.title) + ' <span class="tag">' + escape(c.status) + '</span></li>';
    }), 'wide'));
    root.appendChild(panel('Atlas Synchronization',
      '<p class="stat">' + escape(vm.atlasSynchronizationStatus) + '</p>'));
    root.appendChild(panel('Release Candidates', listHtml(vm.releaseCandidates, function (r) {
      return '<li>' + escape(r.name || r.id || JSON.stringify(r)) + '</li>';
    })));
    root.appendChild(panel('Owner Approvals', listHtml(vm.ownerApprovals, function (a) {
      return '<li>' + escape(a.item) + ' <span class="tag warn">' + escape(a.status) + '</span></li>';
    }), 'wide'));
    root.appendChild(panel('Engineering KPIs', vm.kpis.map(function (k) {
      return '<div class="kpi-row"><span>' + escape(k.label) + '</span><strong>' + escape(k.value) + ' ' + escape(k.unit) + '</strong></div>';
    }).join(''), 'full'));
    root.appendChild(panel('Agent Bus 2.0 (recent)', listHtml(vm.recentBusMessages, function (m) {
      return '<li><span class="tag">' + escape(m.type) + '</span> ' + escape(m.sourceAgent) + ' → ' + escape(m.destinationAgent) +
        '<br/><span class="muted">' + escape(m.messageId) + ' · ' + escape(m.correlationId) + '</span></li>';
    }), 'full'));
  }

  Promise.all([
    fetch('data/sample-snapshot.json').then(function (r) { return r.json(); }),
    fetch('config/kpi-definitions.json').then(function (r) { return r.json(); }),
    fetch('config/workflow-stages.json').then(function (r) { return r.json(); })
  ]).then(function (results) {
    window.__EOS_WORKFLOW_STAGES__ = results[2];
    boot(results[0], results[1]);
  }).catch(function (err) {
    document.getElementById('root').innerHTML =
      '<section class="panel full"><h2>Load error</h2><p>' + EOS.escapeHtml(err.message) +
      '</p><p class="muted">Serve this folder over HTTP (file:// may block fetch).</p></section>';
  });
})();
