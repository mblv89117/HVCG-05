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

  function boot(snapshot) {
    var workflow = new WorkflowEngine();
    var wf = workflow.createItem({
      title: 'EOS Sprint 1 delivery',
      trackId: 'track9',
      sprintId: 'eos-sprint-1'
    });
    workflow.setStage(wf.id, 'qa', 'Sprint 1 QA packet');

    var crs = new ChangeRequestSystem();
    crs.create({
      id: 'CR-EOS-S1-001',
      title: 'Introduce Engineering Operating System Sprint 1',
      businessReason: 'Reduce owner coordination and automate engineering management',
      impactAnalysis: 'Additive Dev-only apps and Atlas Track 9 docs',
      riskAnalysis: 'Low — isolated worktree, no Production writes',
      dependencies: ['Project Atlas', 'agent-comms v1', 'worktree model'],
      testingPlan: 'Node unit/integration tests in tests/eos',
      rollbackPlan: 'Remove EOS app + Track 9 docs from branch',
      affectedTracks: ['track9'],
      affectedModules: [
        'command-center', 'master-pm-automation', 'workflow-engine',
        'agent-bus-v2', 'change-request', 'analytics', 'executive-dashboard'
      ]
    });
    crs.setStatus('CR-EOS-S1-001', 'submitted');

    var bus = new AgentBusV2();
    bus.send({
      sourceAgent: 'master-pm',
      destinationAgent: 'qa-agent',
      priority: 'P1',
      status: 'sent',
      relatedSprint: 'eos-sprint-1',
      relatedTrack: 'track9',
      type: 'qa_request',
      body: { subject: 'EOS Sprint 1 QA review requested' }
    });

    var masterPm = new MasterPmAutomation(snapshot);
    var analytics = new EngineeringAnalytics({ kpis: [
      { id: 'sprint_velocity', label: 'Sprint Velocity', unit: 'percent', direction: 'higher_better' },
      { id: 'avg_cycle_time', label: 'Average Cycle Time', unit: 'days', direction: 'lower_better' },
      { id: 'lead_time', label: 'Lead Time', unit: 'days', direction: 'lower_better' },
      { id: 'qa_pass_rate', label: 'QA Pass Rate', unit: 'percent', direction: 'higher_better' },
      { id: 'regression_rate', label: 'Regression Rate', unit: 'percent', direction: 'lower_better' },
      { id: 'open_technical_debt', label: 'Open Technical Debt', unit: 'items', direction: 'lower_better' },
      { id: 'agent_throughput', label: 'Agent Throughput', unit: 'items/sprint', direction: 'higher_better' },
      { id: 'deployment_frequency', label: 'Deployment Frequency', unit: 'deploys/month', direction: 'context' },
      { id: 'documentation_coverage', label: 'Documentation Coverage', unit: 'percent', direction: 'higher_better' },
      { id: 'atlas_health', label: 'Atlas Health', unit: 'score', direction: 'higher_better' }
    ]});

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
      return '<li><strong>' + t.name + '</strong> <span class="tag">' + t.status + '</span></li>';
    }), 'wide'));
    root.appendChild(panel('Active Sprints', listHtml(vm.activeSprints, function (s) {
      return '<li><strong>' + s.name + '</strong> — ' + s.progressPercent + '% <span class="tag">' + s.status + '</span></li>';
    }), 'wide'));
    root.appendChild(panel('Assigned Agents', listHtml(vm.assignedAgents, function (a) {
      return '<li><strong>' + a.id + '</strong> — ' + a.assignment + ' <span class="tag">' + a.status + '</span></li>';
    })));
    root.appendChild(panel('Active Branches', listHtml(vm.activeBranches, function (b) {
      return '<li><code>' + b.name + '</code> · ' + b.owner + '</li>';
    }), 'wide'));
    root.appendChild(panel('Active Worktrees', listHtml(vm.activeWorktrees, function (w) {
      return '<li><code>' + w.path + '</code><br/><span class="muted">' + w.branch + '</span></li>';
    }), 'wide'));
    root.appendChild(panel('Sprint Progress', listHtml(vm.sprintProgress, function (s) {
      return '<li>' + s.name + ': ' + s.progressPercent + '% (' + s.status + ')</li>';
    })));
    root.appendChild(panel('Blocked Items', listHtml(vm.blockedItems, function (b) {
      return '<li>' + (b.title || JSON.stringify(b)) + '</li>';
    })));
    root.appendChild(panel('QA Status',
      '<p class="stat">' + (vm.qaStatus.latestVerdict || '—') + '</p>' +
      '<p class="muted">Queue depth: ' + (vm.qaStatus.queueDepth || 0) +
      ' · Pass rate: ' + (vm.qaStatus.passRatePercent || 0) + '%</p>'));
    root.appendChild(panel('Deployment Readiness',
      '<p class="stat">' + (vm.deploymentReadiness.ready ? 'READY' : 'NOT READY') + '</p>' +
      '<p class="muted">' + (vm.deploymentReadiness.reason || '') + '</p>'));
    root.appendChild(panel('Technical Debt', listHtml(vm.technicalDebt, function (d) {
      return '<li><strong>' + d.id + '</strong> — ' + d.title + ' <span class="tag warn">' + d.severity + '</span></li>';
    }), 'wide'));
    root.appendChild(panel('Open Change Requests', listHtml(vm.openChangeRequests, function (c) {
      return '<li><strong>' + c.id + '</strong> — ' + c.title + ' <span class="tag">' + c.status + '</span></li>';
    }), 'wide'));
    root.appendChild(panel('Atlas Synchronization',
      '<p class="stat">' + vm.atlasSynchronizationStatus + '</p>'));
    root.appendChild(panel('Release Candidates', listHtml(vm.releaseCandidates, function (r) {
      return '<li>' + (r.name || r.id || JSON.stringify(r)) + '</li>';
    })));
    root.appendChild(panel('Owner Approvals', listHtml(vm.ownerApprovals, function (a) {
      return '<li>' + a.item + ' <span class="tag warn">' + a.status + '</span></li>';
    }), 'wide'));
    root.appendChild(panel('Engineering KPIs', vm.kpis.map(function (k) {
      return '<div class="kpi-row"><span>' + k.label + '</span><strong>' + k.value + ' ' + k.unit + '</strong></div>';
    }).join(''), 'full'));
    root.appendChild(panel('Agent Bus 2.0 (recent)', listHtml(vm.recentBusMessages, function (m) {
      return '<li><span class="tag">' + m.type + '</span> ' + m.sourceAgent + ' → ' + m.destinationAgent +
        '<br/><span class="muted">' + m.messageId + ' · ' + m.correlationId + '</span></li>';
    }), 'full'));
  }

  fetch('data/sample-snapshot.json')
    .then(function (r) { return r.json(); })
    .then(boot)
    .catch(function (err) {
      document.getElementById('root').innerHTML =
        '<section class="panel full"><h2>Load error</h2><p>' + err.message +
        '</p><p class="muted">Serve this folder over HTTP (file:// may block fetch).</p></section>';
    });
})();
