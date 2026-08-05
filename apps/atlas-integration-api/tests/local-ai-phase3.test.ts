/**
 * Phase 3 tests — content packs, routing, approvals, metrics (fake Ollama).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  DEFAULT_LOCAL_AI_FEATURE_FLAGS,
  buildModelRoutingConfig,
  resolveModelForOperation,
  buildTimeProtectionOutput,
  buildPerformanceDashboard,
  buildDocumentReviewPackDraft,
  PHASE3_ALLOWED_OPERATIONS,
} from '@hvcg/atlas-integration-core';
import { LocalAiRepository } from '../src/local-ai/repository.ts';
import { LocalAiService } from '../src/local-ai/service.ts';
import { OllamaClient } from '../src/local-ai/ollamaClient.ts';
import { SYNTHETIC_FIXTURES } from '../src/local-ai/syntheticFixtures.ts';

function validOutput(jobId: string, operation: string, confidence = 0.82) {
  return {
    job_id: jobId,
    operation,
    executive_summary: 'TEST — SYNTHETIC AI OUTPUT — DO NOT SEND: phase3 summary',
    facts: ['Synthetic fact'],
    inferences: ['Synthetic inference'],
    missing_information: ['Bank statements'],
    risks: ['Incomplete package'],
    recommended_next_action: 'Prepare Manny review package',
    recommended_owner: 'Manny',
    work_value_tier: 'Tier 1 — Manny Only',
    requires_manny_approval: true,
    decision_package: {
      decision: 'Whether to proceed',
      recommendation: 'Request missing docs',
      why: ['Incomplete financials'],
      alternatives: ['Defer'],
      risks: ['Gap'],
      deadline: null,
      required_review_minutes: 10,
      source_records: [{ type: 'Note', id: 'synth', title: 'TEST — DO NOT CONTACT' }],
      confidence,
      missing_information: ['Bank statements'],
    },
    confidence,
    warnings: [],
  };
}

class FakeOllamaClient {
  constructor(private behavior: 'success' | 'offline' = 'success') {}
  getConfig() {
    return {
      baseUrl: 'http://127.0.0.1:11434',
      model: 'fake-deep',
      timeoutMs: 1000,
      maxRetries: 1,
      allowNonLoopback: false,
      formatJson: true,
    };
  }
  withModel(model: string) {
    const next = new FakeOllamaClient(this.behavior);
    (next as unknown as { _model: string })._model = model;
    return next;
  }
  async health() {
    return this.behavior === 'offline' ? { ok: false } : { ok: true, version: 'fake' };
  }
  async listModels() {
    return ['fake-deep'];
  }
  async chat(opts: { system: string; user: string; model?: string }) {
    if (this.behavior === 'offline') {
      throw Object.assign(new Error('offline'), { code: 'ollama_offline', status: 503 });
    }
    const jobId = /job_id:\s*(\S+)/.exec(opts.user)?.[1] || 'unknown';
    const operation = /operation:\s*(\S+)/.exec(opts.user)?.[1] || 'summarize_text';
    return {
      rawContent: JSON.stringify(validOutput(jobId, operation)),
      model: opts.model || 'fake-deep',
      evalCount: 5,
    };
  }
}

function tempService(fake = new FakeOllamaClient()) {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-local-ai-p3-'));
  const flags = { ...DEFAULT_LOCAL_AI_FEATURE_FLAGS, LocalAIEnabled: true };
  const service = new LocalAiService({
    repo: new LocalAiRepository(dir),
    flags,
    ollamaClient: fake as unknown as OllamaClient,
    ollamaConfig: fake.getConfig(),
    defaultExecutorMode: 'ollama',
    secretsFileEnv: {},
    documentStagingRoot: join(dir, 'staging'),
  });
  return { dir, service, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

describe('phase3 model routing', () => {
  it('uses deep model and records fallback when fast model missing', () => {
    const routing = buildModelRoutingConfig({
      deepModel: 'glm-4.7-flash:q4_K_M',
      fastModel: '',
      fallbackModel: 'glm-4.7-flash:q4_K_M',
      installedModels: ['glm-4.7-flash:q4_K_M'],
    });
    assert.equal(routing.fasterModelAvailable, false);
    const fast = resolveModelForOperation('summarize_text', routing, {
      installedModels: ['glm-4.7-flash:q4_K_M'],
    });
    assert.equal(fast.usedFallback, true);
    assert.equal(fast.fallbackReason, 'no_faster_model_installed');
    assert.equal(fast.actualModel, 'glm-4.7-flash:q4_K_M');
    const deep = resolveModelForOperation('prepare_decision_package', routing, {
      installedModels: ['glm-4.7-flash:q4_K_M'],
    });
    assert.equal(deep.usedFallback, false);
    assert.equal(deep.actualProfile, 'Deep Analysis Model');
  });

  it('includes Phase 3 operations', () => {
    assert.ok(PHASE3_ALLOWED_OPERATIONS.includes('prepare_meeting_brief'));
    assert.ok(PHASE3_ALLOWED_OPERATIONS.includes('prepare_client_operations_pack'));
  });
});

describe('phase3 content packs and workflows', () => {
  it('requires redaction approval before model processing', async () => {
    const { service, cleanup } = tempService();
    const pack = service.createContentPack({
      sourceKind: 'pasted_text',
      sourceConfirmed: true,
      clientId: 'synth-client',
      clientLabel: 'Bright Smile Dental',
      sensitivity: 'Confidential',
      requestedOperation: 'prepare_meeting_brief',
      originalContent: SYNTHETIC_FIXTURES.meeting_prep.content,
    });
    assert.equal(pack.status, 'AwaitingRedactionApproval');
    await assert.rejects(
      () => service.processContentPack(pack.packId, { force: true }),
      /redaction/i,
    );
    cleanup();
  });

  it('runs meeting prep after redaction approval and blocks writes', async () => {
    const { service, cleanup } = tempService();
    const pack = service.createContentPack({
      sourceKind: 'meeting_notes',
      sourceConfirmed: true,
      clientId: 'synth-venue',
      clientLabel: 'Harbor Lights Venue',
      sensitivity: 'Internal',
      requestedOperation: 'prepare_meeting_brief',
      originalContent: SYNTHETIC_FIXTURES.meeting_prep.content,
    });
    service.decideContentPackRedaction(pack.packId, 'Approve Redacted Content');
    const { job } = await service.processContentPack(pack.packId, { force: true });
    assert.equal(job.validationStatus, 'Passed');
    assert.equal(job.wroteAuthoritativeBusinessRecord, false);
    assert.ok(job.meetingDraft);
    assert.ok(job.timeProtection);
    assert.ok(job.modelRouting);
    assert.equal(job.modelRouting?.usedFallback, true);
    cleanup();
  });

  it('builds document review pack and detects injection + sensitive data', async () => {
    const { service, cleanup } = tempService();
    const pack = service.createContentPack({
      sourceKind: 'uploaded_document',
      sourceConfirmed: true,
      clientId: 'synth-agree',
      clientLabel: 'SolidPath Concrete',
      sensitivity: 'Highly Confidential',
      requestedOperation: 'prepare_document_review_pack',
      originalContent: SYNTHETIC_FIXTURES.agreement_summary.content,
    });
    assert.ok((pack.redactionPreview?.redactionCount || 0) >= 1);
    assert.equal(pack.injectionPreview?.suspicious, true);
    const draft = buildDocumentReviewPackDraft({
      title: 'Agreement',
      documentType: 'agreement',
      client: 'SolidPath',
      project: 'p1',
      sensitivity: 'Highly Confidential',
      extractedText: SYNTHETIC_FIXTURES.agreement_summary.content,
      redactedText: pack.redactedContent,
      injectionWarnings: pack.injectionPreview?.warnings || [],
      requestedOperation: 'prepare_document_review_pack',
    });
    assert.ok(draft.detectedAmounts.length >= 1);
    assert.ok(draft.injectionWarnings.length >= 1);
    assert.equal(draft.draftOnly, true);
    service.decideContentPackRedaction(pack.packId, 'Cancel Job');
    assert.equal(service.getContentPack(pack.packId).status, 'Cancelled');
    cleanup();
  });

  it('supports post-meeting, client ops, and extended approval decisions', async () => {
    const { service, cleanup } = tempService();
    for (const [op, fx] of [
      ['summarize_meeting_outcomes', SYNTHETIC_FIXTURES.post_meeting],
      ['prepare_client_operations_pack', SYNTHETIC_FIXTURES.task_value],
      ['classify_work_value', SYNTHETIC_FIXTURES.task_value],
    ] as const) {
      const pack = service.createContentPack({
        sourceKind: 'client_summary',
        sourceConfirmed: true,
        clientId: fx.id,
        clientLabel: fx.industry,
        sensitivity: 'Internal',
        requestedOperation: op,
        originalContent: fx.content,
      });
      service.decideContentPackRedaction(pack.packId, 'Approve Redacted Content');
      const { job } = await service.processContentPack(pack.packId, { force: true });
      assert.equal(job.validationStatus, 'Passed');
    }

    const pack = service.createContentPack({
      sourceKind: 'pasted_text',
      sourceConfirmed: true,
      clientId: 'approve-1',
      clientLabel: 'Synthetic Client',
      sensitivity: 'Internal',
      requestedOperation: 'summarize_text',
      originalContent: SYNTHETIC_FIXTURES.lender_research.content,
    });
    service.decideContentPackRedaction(pack.packId, 'Approve Redacted Content');
    const { job } = await service.processContentPack(pack.packId, { force: true });
    const approved = service.mannyDecide(job.aiJobId, 'Approved', 'Manny');
    assert.equal(approved.processingStatus, 'Completed');
    assert.equal(approved.wroteAuthoritativeBusinessRecord, false);

    const pack2 = service.createContentPack({
      sourceKind: 'pasted_text',
      sourceConfirmed: true,
      clientId: 'elim-1',
      clientLabel: 'Synthetic Client',
      sensitivity: 'Internal',
      requestedOperation: 'classify_work_value',
      originalContent: SYNTHETIC_FIXTURES.task_value.content,
    });
    service.decideContentPackRedaction(pack2.packId, 'Approve Redacted Content');
    const { job: job2 } = await service.processContentPack(pack2.packId, { force: true });
    const elim = service.mannyDecide(job2.aiJobId, 'Eliminate', 'Manny');
    assert.equal(elim.mannyDecision, 'Eliminate');
    assert.equal(elim.wroteAuthoritativeBusinessRecord, false);

    const rejected = (() => {
      const p = service.createContentPack({
        sourceKind: 'pasted_text',
        sourceConfirmed: true,
        clientId: 'rej-1',
        clientLabel: 'Synthetic Client',
        sensitivity: 'Internal',
        requestedOperation: 'summarize_text',
        originalContent: SYNTHETIC_FIXTURES.dental_practice_prospect.content,
      });
      service.decideContentPackRedaction(p.packId, 'Approve Redacted Content');
      return p;
    })();
    const { job: job3 } = await service.processContentPack(rejected.packId, { force: true });
    assert.equal(service.mannyDecide(job3.aiJobId, 'Rejected', 'Manny').processingStatus, 'Manny Rejected');

    const revPack = service.createContentPack({
      sourceKind: 'pasted_text',
      sourceConfirmed: true,
      clientId: 'rev-1',
      clientLabel: 'Synthetic Client',
      sensitivity: 'Internal',
      requestedOperation: 'summarize_text',
      originalContent: SYNTHETIC_FIXTURES.concrete_contractor.content,
    });
    service.decideContentPackRedaction(revPack.packId, 'Approve Redacted Content');
    const { job: job4 } = await service.processContentPack(revPack.packId, { force: true });
    assert.equal(
      service.mannyDecide(job4.aiJobId, 'Returned for Revision', 'Manny').processingStatus,
      'Returned for Revision',
    );

    const noActionPack = service.createContentPack({
      sourceKind: 'pasted_text',
      sourceConfirmed: true,
      clientId: 'na-1',
      clientLabel: 'Synthetic Client',
      sensitivity: 'Internal',
      requestedOperation: 'summarize_text',
      originalContent: SYNTHETIC_FIXTURES.entertainment_venue.content,
    });
    service.decideContentPackRedaction(noActionPack.packId, 'Approve Redacted Content');
    const { job: job5 } = await service.processContentPack(noActionPack.packId, { force: true });
    assert.equal(
      service.mannyDecide(job5.aiJobId, 'No Action Required', 'Manny').processingStatus,
      'Completed',
    );

    cleanup();
  });

  it('cancels before processing and rejects oversized input', async () => {
    const { service, cleanup } = tempService();
    const pack = service.createContentPack({
      sourceKind: 'pasted_text',
      sourceConfirmed: true,
      clientId: 'c',
      clientLabel: 'C',
      sensitivity: 'Internal',
      requestedOperation: 'summarize_text',
      originalContent: SYNTHETIC_FIXTURES.post_meeting.content,
    });
    service.decideContentPackRedaction(pack.packId, 'Cancel Job');
    await assert.rejects(() => service.processContentPack(pack.packId, { force: true }));

    assert.throws(() =>
      service.createContentPack({
        sourceKind: 'pasted_text',
        sourceConfirmed: true,
        clientId: 'big',
        clientLabel: 'Big',
        sensitivity: 'Internal',
        requestedOperation: 'summarize_text',
        originalContent: 'TEST — SYNTHETIC DATA\n' + 'x'.repeat(130_000),
      }),
    );
    cleanup();
  });

  it('keeps safety flags false and builds performance dashboard', async () => {
    const { service, cleanup } = tempService();
    const flags = service.getFlags();
    assert.equal(flags.LocalAIWritesEnabled, false);
    assert.equal(flags.LocalAIExternalMessagesEnabled, false);
    assert.equal(flags.EvaIntakeEnabled, false);
    assert.equal(flags.ClientEmailsEnabled, false);
    const tp = buildTimeProtectionOutput({
      requiresMannyApproval: true,
      confidence: 0.8,
      workValueTier: 'Tier 1 — Manny Only',
    });
    assert.equal(tp.classification, 'AI Can Complete After Approval');
    const dash = service.performanceDashboard();
    assert.ok(typeof dash.jobCount === 'number');
    const queue = service.approvalQueue();
    assert.ok(Array.isArray(queue.items));
    const emptyDash = buildPerformanceDashboard([], []);
    assert.equal(emptyDash.failureRate, 0);
    cleanup();
  });

  it('supports Edit Redactions, Archive, Automation Candidate, and cancel in-flight', async () => {
    const { service, cleanup } = tempService();
    const pack = service.createContentPack({
      sourceKind: 'pasted_text',
      sourceConfirmed: true,
      clientId: 'edit-1',
      clientLabel: 'Synthetic Client',
      sensitivity: 'Confidential',
      requestedOperation: 'summarize_text',
      originalContent: SYNTHETIC_FIXTURES.agreement_summary.content,
    });
    const edited = service.decideContentPackRedaction(pack.packId, 'Edit Redactions', {
      editedRedactedContent: 'TEST — SYNTHETIC DATA\n[REDACTED MANUAL EDIT]\nTEST — DO NOT CONTACT',
    });
    assert.equal(edited.status, 'AwaitingRedactionApproval');
    assert.match(edited.redactedContent, /REDACTED MANUAL EDIT/);

    service.decideContentPackRedaction(pack.packId, 'Approve Redacted Content');
    const { job } = await service.processContentPack(pack.packId, { force: true });
    const archived = service.mannyDecide(job.aiJobId, 'Archived', 'Manny');
    assert.equal(archived.mannyDecision, 'Archived');
    assert.equal(archived.wroteAuthoritativeBusinessRecord, false);

    const pack2 = service.createContentPack({
      sourceKind: 'pasted_text',
      sourceConfirmed: true,
      clientId: 'auto-1',
      clientLabel: 'Synthetic Client',
      sensitivity: 'Internal',
      requestedOperation: 'classify_work_value',
      originalContent: SYNTHETIC_FIXTURES.task_value.content,
    });
    service.decideContentPackRedaction(pack2.packId, 'Approve Redacted Content');
    const { job: job2 } = await service.processContentPack(pack2.packId, { force: true });
    const auto = service.mannyDecide(job2.aiJobId, 'Automation Candidate', 'Manny');
    assert.equal(auto.mannyDecision, 'Automation Candidate');
    assert.equal(auto.wroteAuthoritativeBusinessRecord, false);

    // Cancel while Queued / before model completes path
    const pack3 = service.createContentPack({
      sourceKind: 'pasted_text',
      sourceConfirmed: true,
      clientId: 'cancel-1',
      clientLabel: 'Synthetic Client',
      sensitivity: 'Internal',
      requestedOperation: 'summarize_text',
      originalContent: SYNTHETIC_FIXTURES.post_meeting.content,
    });
    service.decideContentPackRedaction(pack3.packId, 'Approve Redacted Content');
    const { job: job3 } = await service.processContentPack(pack3.packId, { force: true });
    // Job already completed in fake executor — cancel is no-op for Completed; create queued job via createJob path
    job3.processingStatus = 'Queued';
    service['repo'].upsertJob(job3);
    const cancelled = service.cancelJob(job3.aiJobId);
    assert.equal(cancelled.processingStatus, 'Cancelled');
    cleanup();
  });

  it('handles malformed empty content and financial sensitivity markers', () => {
    const { service, cleanup } = tempService();
    assert.throws(() =>
      service.createContentPack({
        sourceKind: 'uploaded_document',
        sourceConfirmed: true,
        clientId: 'm',
        clientLabel: 'M',
        sensitivity: 'Highly Confidential',
        requestedOperation: 'prepare_document_review_pack',
        originalContent: '   ',
      }),
    );
    const pack = service.createContentPack({
      sourceKind: 'uploaded_document',
      sourceConfirmed: true,
      clientId: 'fin',
      clientLabel: 'SolidPath Concrete',
      sensitivity: 'Highly Confidential',
      requestedOperation: 'prepare_document_review_pack',
      originalContent: SYNTHETIC_FIXTURES.agreement_summary.content,
    });
    assert.ok((pack.redactionPreview?.redactionCount || 0) >= 1);
    cleanup();
  });

  it('blocks process without source confirmation and live content without owner flag', () => {
    const { service, cleanup } = tempService();
    assert.throws(() =>
      service.createContentPack({
        sourceKind: 'pasted_text',
        sourceConfirmed: false,
        clientId: 'c',
        clientLabel: 'C',
        sensitivity: 'Internal',
        requestedOperation: 'summarize_text',
        originalContent: SYNTHETIC_FIXTURES.dental_practice_prospect.content,
      }),
    );
    assert.throws(() =>
      service.createContentPack({
        sourceKind: 'pasted_text',
        sourceConfirmed: true,
        clientId: 'c',
        clientLabel: 'C',
        sensitivity: 'Internal',
        requestedOperation: 'summarize_text',
        originalContent: 'Real-looking content without synthetic banner',
        ownerApprovedLiveContent: false,
      }),
    );
    cleanup();
  });
});
