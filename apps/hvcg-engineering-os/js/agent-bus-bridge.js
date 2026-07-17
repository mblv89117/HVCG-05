/**
 * Additive Agent Bus 2.0 → agent-comms v1 bridge.
 * Default: offline draft write to EOS store only. Never live-send unless explicitly forced
 * (still does not invoke Production/email/Teams; live mode remains Development-gated and off by default).
 */
(function (root) {
  'use strict';

  var EOS = root.EOS || require('./eos-core.js');

  var PRIORITY_MAP = { P0: 'CRITICAL', P1: 'HIGH', P2: 'NORMAL', P3: 'LOW' };
  var TYPE_MAP = {
    assignment: 'TASK',
    status_update: 'STATUS',
    progress_report: 'STATUS',
    question: 'QUESTION',
    blocker: 'BLOCKER',
    qa_request: 'TASK',
    release_request: 'TASK',
    atlas_update: 'INFO',
    engineering_handoff: 'HANDOFF'
  };

  function AgentBusBridge(options) {
    options = options || {};
    this.outboxDir = options.outboxDir || null;
    this.fs = options.fs || null;
    this.path = options.path || null;
    this.live = options.live === true;
  }

  AgentBusBridge.prototype.toAgentCommsV1 = function (v2Msg) {
    if (!v2Msg || !v2Msg.messageId) throw new Error('Invalid Bus 2.0 message');
    var subject = (v2Msg.body && (v2Msg.body.subject || v2Msg.body.note)) || v2Msg.type;
    var bodyText = typeof v2Msg.body === 'string'
      ? v2Msg.body
      : JSON.stringify(v2Msg.body || {});
    return {
      messageId: v2Msg.messageId,
      threadId: v2Msg.correlationId || '',
      timestamp: v2Msg.timestamp || EOS.nowIso(),
      from: v2Msg.sourceAgent,
      to: [v2Msg.destinationAgent],
      cc: [],
      type: TYPE_MAP[v2Msg.type] || 'INFO',
      priority: PRIORITY_MAP[v2Msg.priority] || 'NORMAL',
      subject: String(subject),
      body: bodyText,
      relatedBranch: (v2Msg.body && v2Msg.body.relatedBranch) || '',
      relatedFiles: (v2Msg.body && v2Msg.body.relatedFiles) || [],
      requestedAction: (v2Msg.body && v2Msg.body.requestedAction) || '',
      dueBy: null,
      requiresAcknowledgement: true,
      status: 'NEW',
      replyTo: null,
      schemaBridge: {
        from: 'agent-bus-v2',
        relatedSprint: v2Msg.relatedSprint,
        relatedTrack: v2Msg.relatedTrack,
        correlationId: v2Msg.correlationId,
        live: false
      }
    };
  };

  AgentBusBridge.prototype.bridge = function (v2Msg) {
    var v1 = this.toAgentCommsV1(v2Msg);
    if (this.live) {
      throw new Error('Live agent-comms send is disabled in EOS Sprint 2 (Development offline bridge only)');
    }
    if (!this.outboxDir || !this.fs || !this.path) {
      return { bridged: true, live: false, persisted: false, message: v1 };
    }
    if (!this.fs.existsSync(this.outboxDir)) {
      this.fs.mkdirSync(this.outboxDir, { recursive: true });
    }
    var file = this.path.join(this.outboxDir, v1.messageId + '.json');
    this.fs.writeFileSync(file, JSON.stringify(v1, null, 2));
    return { bridged: true, live: false, persisted: true, path: file, message: v1 };
  };

  root.AgentBusBridge = AgentBusBridge;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AgentBusBridge;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
