/**
 * Agent Communication Bus 2.0 — persistence + standardized messaging.
 */
(function (root) {
  'use strict';

  var EOS = root.EOS || require('./eos-core.js');

  var REQUIRED = [
    'messageId', 'timestamp', 'sourceAgent', 'destinationAgent',
    'priority', 'status', 'correlationId', 'relatedSprint', 'relatedTrack', 'type', 'body'
  ];

  var TYPES = [
    'assignment', 'status_update', 'progress_report', 'question', 'blocker',
    'qa_request', 'release_request', 'atlas_update', 'engineering_handoff'
  ];

  function AgentBusV2(options) {
    options = options || {};
    this.messages = [];
    this.types = options.types || TYPES.slice();
    this.storePath = options.storePath || null;
    this._fs = options.fs || null;
    if (this.storePath && this._fs) {
      this.load();
    }
  }

  AgentBusV2.prototype.validate = function (msg) {
    var missing = [];
    REQUIRED.forEach(function (f) {
      if (msg[f] === undefined || msg[f] === null || msg[f] === '') missing.push(f);
    });
    if (missing.length) {
      return { ok: false, errors: ['Missing fields: ' + missing.join(', ')] };
    }
    if (this.types.indexOf(msg.type) < 0) {
      return { ok: false, errors: ['Unknown type: ' + msg.type] };
    }
    return { ok: true, errors: [] };
  };

  AgentBusV2.prototype.send = function (partial) {
    var msg = {
      messageId: partial.messageId || EOS.uid('MSG'),
      timestamp: partial.timestamp || EOS.nowIso(),
      sourceAgent: partial.sourceAgent,
      destinationAgent: partial.destinationAgent,
      priority: partial.priority || 'P2',
      status: partial.status || 'sent',
      correlationId: partial.correlationId || EOS.uid('CORR'),
      relatedSprint: partial.relatedSprint,
      relatedTrack: partial.relatedTrack,
      type: partial.type,
      body: partial.body || {},
      schemaVersion: '2.0.0'
    };
    var v = this.validate(msg);
    if (!v.ok) throw new Error(v.errors.join('; '));
    this.messages.push(msg);
    this.persist();
    return EOS.deepClone(msg);
  };

  AgentBusV2.prototype.list = function (filter) {
    filter = filter || {};
    return this.messages.filter(function (m) {
      if (filter.type && m.type !== filter.type) return false;
      if (filter.relatedTrack && m.relatedTrack !== filter.relatedTrack) return false;
      if (filter.relatedSprint && m.relatedSprint !== filter.relatedSprint) return false;
      if (filter.destinationAgent && m.destinationAgent !== filter.destinationAgent) return false;
      if (filter.status && m.status !== filter.status) return false;
      return true;
    }).map(EOS.deepClone);
  };

  AgentBusV2.prototype.updateStatus = function (messageId, status) {
    var msg = this.messages.find(function (m) { return m.messageId === messageId; });
    if (!msg) throw new Error('Unknown message: ' + messageId);
    msg.status = status;
    this.persist();
    return EOS.deepClone(msg);
  };

  AgentBusV2.prototype.persist = function () {
    if (!this.storePath || !this._fs) return { persisted: false };
    var payload = {
      version: '2.0.0',
      updatedAt: EOS.nowIso(),
      messages: this.messages
    };
    this._fs.writeFileSync(this.storePath, JSON.stringify(payload, null, 2));
    return { persisted: true, path: this.storePath, count: this.messages.length };
  };

  AgentBusV2.prototype.load = function () {
    if (!this.storePath || !this._fs) return { loaded: false };
    if (!this._fs.existsSync(this.storePath)) {
      this.messages = [];
      return { loaded: false, empty: true };
    }
    var raw = JSON.parse(this._fs.readFileSync(this.storePath, 'utf8'));
    this.messages = raw.messages || [];
    return { loaded: true, count: this.messages.length };
  };

  root.AgentBusV2 = AgentBusV2;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AgentBusV2;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
