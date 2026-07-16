/**
 * Engineering Workflow Engine — explicit lifecycle stages.
 */
(function (root) {
  'use strict';

  var EOS = root.EOS || require('./eos-core.js');

  var DEFAULT_STAGES = [
    'owner_request', 'impact_analysis', 'change_request', 'assignment',
    'development', 'testing', 'qa', 'owner_approval', 'commit', 'push',
    'release', 'deployment', 'atlas_update', 'close_sprint'
  ];

  function WorkflowEngine(options) {
    options = options || {};
    this.stages = (options.stages && options.stages.map(function (s) {
      return typeof s === 'string' ? s : s.id;
    })) || DEFAULT_STAGES.slice();
    this.items = {};
  }

  WorkflowEngine.prototype.createItem = function (input) {
    var id = input.id || EOS.uid('WF');
    var item = {
      id: id,
      title: input.title || 'Untitled',
      trackId: input.trackId || null,
      sprintId: input.sprintId || null,
      stage: 'owner_request',
      history: [{ stage: 'owner_request', at: EOS.nowIso(), note: 'Created' }],
      blocked: false,
      blockReason: null,
      metadata: input.metadata || {}
    };
    this.items[id] = item;
    return EOS.deepClone(item);
  };

  WorkflowEngine.prototype.getItem = function (id) {
    return this.items[id] ? EOS.deepClone(this.items[id]) : null;
  };

  WorkflowEngine.prototype.stageIndex = function (stage) {
    return this.stages.indexOf(stage);
  };

  WorkflowEngine.prototype.advance = function (id, note) {
    var item = this.items[id];
    if (!item) throw new Error('Unknown workflow item: ' + id);
    if (item.blocked) throw new Error('Item blocked: ' + (item.blockReason || id));
    var idx = this.stageIndex(item.stage);
    if (idx < 0 || idx >= this.stages.length - 1) {
      throw new Error('Cannot advance from stage: ' + item.stage);
    }
    var next = this.stages[idx + 1];
    item.stage = next;
    item.history.push({ stage: next, at: EOS.nowIso(), note: note || 'Advanced' });
    return EOS.deepClone(item);
  };

  WorkflowEngine.prototype.setStage = function (id, stage, note) {
    var item = this.items[id];
    if (!item) throw new Error('Unknown workflow item: ' + id);
    if (this.stageIndex(stage) < 0) throw new Error('Unknown stage: ' + stage);
    item.stage = stage;
    item.history.push({ stage: stage, at: EOS.nowIso(), note: note || 'Set stage' });
    return EOS.deepClone(item);
  };

  WorkflowEngine.prototype.block = function (id, reason) {
    var item = this.items[id];
    if (!item) throw new Error('Unknown workflow item: ' + id);
    item.blocked = true;
    item.blockReason = reason || 'Blocked';
    return EOS.deepClone(item);
  };

  WorkflowEngine.prototype.unblock = function (id) {
    var item = this.items[id];
    if (!item) throw new Error('Unknown workflow item: ' + id);
    item.blocked = false;
    item.blockReason = null;
    return EOS.deepClone(item);
  };

  WorkflowEngine.prototype.listByStage = function () {
    var out = {};
    this.stages.forEach(function (s) { out[s] = []; });
    Object.keys(this.items).forEach(function (id) {
      var item = this.items[id];
      if (!out[item.stage]) out[item.stage] = [];
      out[item.stage].push(EOS.deepClone(item));
    }.bind(this));
    return out;
  };

  WorkflowEngine.prototype.progressPercent = function (id) {
    var item = this.items[id];
    if (!item) return 0;
    var idx = this.stageIndex(item.stage);
    if (idx < 0) return 0;
    return Math.round((idx / (this.stages.length - 1)) * 100);
  };

  root.WorkflowEngine = WorkflowEngine;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkflowEngine;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
