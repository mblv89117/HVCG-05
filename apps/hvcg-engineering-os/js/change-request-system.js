/**
 * Change Request System — structured CRs with approvals.
 */
(function (root) {
  'use strict';

  var EOS = root.EOS || require('./eos-core.js');

  var STATUSES = [
    'draft', 'submitted', 'impact_reviewed', 'owner_pending',
    'approved', 'rejected', 'in_development', 'qa', 'ready_to_release', 'closed'
  ];

  function ChangeRequestSystem() {
    this.requests = {};
  }

  ChangeRequestSystem.prototype.create = function (input) {
    var id = input.id || EOS.uid('CR');
    var cr = {
      id: id,
      title: input.title || 'Untitled change',
      businessReason: input.businessReason || '',
      impactAnalysis: input.impactAnalysis || '',
      riskAnalysis: input.riskAnalysis || '',
      dependencies: input.dependencies || [],
      testingPlan: input.testingPlan || '',
      rollbackPlan: input.rollbackPlan || '',
      affectedTracks: input.affectedTracks || [],
      affectedModules: input.affectedModules || [],
      ownerApproval: input.ownerApproval || { status: 'pending', by: null, at: null },
      qaApproval: input.qaApproval || { status: 'pending', by: null, at: null },
      deploymentApproval: input.deploymentApproval || { status: 'pending', by: null, at: null },
      status: 'draft',
      createdAt: EOS.nowIso(),
      updatedAt: EOS.nowIso()
    };
    this.requests[id] = cr;
    return EOS.deepClone(cr);
  };

  ChangeRequestSystem.prototype.get = function (id) {
    return this.requests[id] ? EOS.deepClone(this.requests[id]) : null;
  };

  ChangeRequestSystem.prototype.listOpen = function () {
    return Object.keys(this.requests).map(function (id) {
      return EOS.deepClone(this.requests[id]);
    }.bind(this)).filter(function (cr) {
      return cr.status !== 'closed' && cr.status !== 'rejected';
    });
  };

  ChangeRequestSystem.prototype.setStatus = function (id, status) {
    if (STATUSES.indexOf(status) < 0) throw new Error('Invalid CR status: ' + status);
    var cr = this.requests[id];
    if (!cr) throw new Error('Unknown CR: ' + id);
    cr.status = status;
    cr.updatedAt = EOS.nowIso();
    return EOS.deepClone(cr);
  };

  ChangeRequestSystem.prototype.approve = function (id, gate, by) {
    var cr = this.requests[id];
    if (!cr) throw new Error('Unknown CR: ' + id);
    var key = gate + 'Approval';
    if (!cr[key]) throw new Error('Unknown approval gate: ' + gate);
    cr[key] = { status: 'approved', by: by || 'owner', at: EOS.nowIso() };
    cr.updatedAt = EOS.nowIso();
    if (
      cr.ownerApproval.status === 'approved' &&
      cr.qaApproval.status === 'approved' &&
      cr.deploymentApproval.status === 'approved'
    ) {
      cr.status = 'ready_to_release';
    }
    return EOS.deepClone(cr);
  };

  ChangeRequestSystem.prototype.isReleaseReady = function (id) {
    var cr = this.requests[id];
    if (!cr) return false;
    return (
      cr.ownerApproval.status === 'approved' &&
      cr.qaApproval.status === 'approved' &&
      cr.deploymentApproval.status === 'approved' &&
      !!cr.testingPlan &&
      !!cr.rollbackPlan
    );
  };

  root.ChangeRequestSystem = ChangeRequestSystem;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChangeRequestSystem;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
