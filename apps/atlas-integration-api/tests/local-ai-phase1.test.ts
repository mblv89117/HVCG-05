import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  DEFAULT_LOCAL_AI_FEATURE_FLAGS,
  MANNY_OWNER,
  LOCAL_AI_OWNER,
  SYNTHETIC_AI_OUTPUT_BANNER,
  SYNTHETIC_RECORD_BANNER,
  FUTURE_OPERATOR_OWNER,
} from '@hvcg/atlas-integration-core';
import { LocalAiRepository } from '../src/local-ai/repository.ts';
import { LocalAiService } from '../src/local-ai/service.ts';

function tempService(flags = { ...DEFAULT_LOCAL_AI_FEATURE_FLAGS, LocalAIEnabled: true }) {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-local-ai-'));
  const repo = new LocalAiRepository(dir);
  const service = new LocalAiService({ repo, flags });
  return {
    dir,
    service,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

describe('local-ai Phase 1 service', () => {
  it('creates a clean AI job', () => {
    const { service, cleanup } = tempService();
    const { job, duplicate } = service.createJob({
      sourceRecordType: 'Task',
      sourceRecordId: 'test-task-1',
      requestedOperation: 'MeetingSummary',
      idempotencyKey: 'job|test|1',
      mockScenario: 'success',
    });
    assert.equal(duplicate, false);
    assert.ok(job.aiJobId);
    assert.equal(job.processingStatus, 'Queued'); // LocalAIEnabled true auto-queues
    assert.equal(job.syntheticBanner, SYNTHETIC_AI_OUTPUT_BANNER);
    assert.equal(job.wroteAuthoritativeBusinessRecord, false);
    cleanup();
  });

  it('keeps jobs Pending when LocalAIEnabled=false', () => {
    const { service, cleanup } = tempService({ ...DEFAULT_LOCAL_AI_FEATURE_FLAGS });
    const { job } = service.createJob({
      sourceRecordType: 'Task',
      sourceRecordId: 'test-task-pending',
      requestedOperation: 'MeetingSummary',
      idempotencyKey: 'job|pending|1',
    });
    assert.equal(job.processingStatus, 'Pending');
    assert.equal(service.getFlags().LocalAIEnabled, false);
    cleanup();
  });

  it('is idempotent on duplicate job request', () => {
    const { service, cleanup } = tempService();
    const a = service.createJob({
      sourceRecordType: 'Task',
      sourceRecordId: 'dup',
      requestedOperation: 'MeetingSummary',
      idempotencyKey: 'same-key',
    });
    const b = service.createJob({
      sourceRecordType: 'Task',
      sourceRecordId: 'dup',
      requestedOperation: 'MeetingSummary',
      idempotencyKey: 'same-key',
    });
    assert.equal(b.duplicate, true);
    assert.equal(a.job.aiJobId, b.job.aiJobId);
    cleanup();
  });

  it('produces successful mock output with validation', async () => {
    const { service, cleanup } = tempService();
    const { job } = service.createJob({
      sourceRecordType: 'Task',
      sourceRecordId: 'ok',
      requestedOperation: 'MeetingSummary',
      idempotencyKey: 'ok-1',
      mockScenario: 'success',
      requiresMannyApproval: false,
    });
    const processed = await service.processJob(job.aiJobId, { force: true });
    assert.equal(processed.validationStatus, 'Passed');
    assert.equal(processed.processingStatus, 'Draft Ready');
    assert.ok(String(processed.outputSummary || '').includes(SYNTHETIC_AI_OUTPUT_BANNER));
    assert.equal(processed.wroteAuthoritativeBusinessRecord, false);
    cleanup();
  });

  it('handles malformed mock output', async () => {
    const { service, cleanup } = tempService();
    const { job } = service.createJob({
      sourceRecordType: 'Task',
      sourceRecordId: 'bad',
      requestedOperation: 'MeetingSummary',
      idempotencyKey: 'bad-1',
      mockScenario: 'malformed',
    });
    const processed = await service.processJob(job.aiJobId, { force: true });
    assert.equal(processed.processingStatus, 'Validation Failed');
    assert.equal(processed.validationStatus, 'Failed');
    cleanup();
  });

  it('handles timeout', async () => {
    const { service, cleanup } = tempService();
    const { job } = service.createJob({
      sourceRecordType: 'Task',
      sourceRecordId: 'to',
      requestedOperation: 'MeetingSummary',
      idempotencyKey: 'to-1',
      mockScenario: 'timeout',
    });
    const processed = await service.processJob(job.aiJobId, { force: true });
    assert.equal(processed.processingStatus, 'Processing Failed');
    assert.equal(processed.errorType, 'Timeout');
    cleanup();
  });

  it('handles processing failure and retry', async () => {
    const { service, cleanup } = tempService();
    const { job } = service.createJob({
      sourceRecordType: 'Task',
      sourceRecordId: 'fail',
      requestedOperation: 'MeetingSummary',
      idempotencyKey: 'fail-1',
      mockScenario: 'failure',
    });
    const failed = await service.processJob(job.aiJobId, { force: true });
    assert.equal(failed.processingStatus, 'Processing Failed');
    // Change scenario via retry after manually flipping — recreate with success by updating store
    // Retry keeps same scenario; verify retry increments then still fails
    const retried = await service.retryJob(job.aiJobId, { force: true });
    assert.equal(retried.retryCount, 1);
    assert.equal(retried.processingStatus, 'Processing Failed');
    cleanup();
  });

  it('handles low-confidence response', async () => {
    const { service, cleanup } = tempService();
    const { job } = service.createJob({
      sourceRecordType: 'Task',
      sourceRecordId: 'low',
      requestedOperation: 'MeetingSummary',
      idempotencyKey: 'low-1',
      mockScenario: 'low_confidence',
      requiresMannyApproval: false,
    });
    const processed = await service.processJob(job.aiJobId, { force: true });
    assert.ok((processed.confidence ?? 1) < 0.5);
    assert.equal(processed.processingStatus, 'Waiting on Manny');
    cleanup();
  });

  it('requires Manny approval for gated pricing jobs', async () => {
    const { service, cleanup } = tempService();
    const { job } = service.createJob({
      sourceRecordType: 'Opportunity',
      sourceRecordId: 'opp-1',
      requestedOperation: 'Pricing',
      idempotencyKey: 'price-1',
      mockScenario: 'success',
    });
    assert.equal(job.requiresMannyApproval, true);
    const processed = await service.processJob(job.aiJobId, { force: true });
    assert.equal(processed.processingStatus, 'Waiting on Manny');
    assert.equal(processed.wroteAuthoritativeBusinessRecord, false);
    cleanup();
  });

  it('blocks unauthorized approval', async () => {
    const { service, cleanup } = tempService();
    const { job } = service.createJob({
      sourceRecordType: 'Opportunity',
      sourceRecordId: 'opp-2',
      requestedOperation: 'Pricing',
      idempotencyKey: 'price-2',
      mockScenario: 'success',
    });
    await service.processJob(job.aiJobId, { force: true });
    assert.throws(
      () => service.mannyDecide(job.aiJobId, 'Approved', LOCAL_AI_OWNER),
      (err: Error & { status?: number }) => err.status === 403,
    );
    cleanup();
  });

  it('supports Manny approval without authoritative writes', async () => {
    const { service, cleanup } = tempService();
    const { job } = service.createJob({
      sourceRecordType: 'Opportunity',
      sourceRecordId: 'opp-3',
      requestedOperation: 'Pricing',
      idempotencyKey: 'price-3',
      mockScenario: 'success',
    });
    await service.processJob(job.aiJobId, { force: true });
    const approved = service.mannyDecide(job.aiJobId, 'Approved', MANNY_OWNER);
    assert.equal(approved.mannyDecision, 'Approved');
    assert.equal(approved.processingStatus, 'Completed');
    assert.equal(approved.wroteAuthoritativeBusinessRecord, false);
    assert.equal(service.getFlags().LocalAIWritesEnabled, false);
    cleanup();
  });

  it('supports Manny rejection and return for revision', async () => {
    const { service, cleanup } = tempService();
    const a = service.createJob({
      sourceRecordType: 'Opportunity',
      sourceRecordId: 'opp-4',
      requestedOperation: 'CapitalStrategy',
      idempotencyKey: 'cap-1',
      mockScenario: 'success',
    });
    await service.processJob(a.job.aiJobId, { force: true });
    const rejected = service.mannyDecide(a.job.aiJobId, 'Rejected', MANNY_OWNER);
    assert.equal(rejected.processingStatus, 'Manny Rejected');

    const b = service.createJob({
      sourceRecordType: 'Opportunity',
      sourceRecordId: 'opp-5',
      requestedOperation: 'ScopeInterpretation',
      idempotencyKey: 'scope-1',
      mockScenario: 'success',
    });
    await service.processJob(b.job.aiJobId, { force: true });
    const returned = service.mannyDecide(b.job.aiJobId, 'Returned for Revision', MANNY_OWNER);
    assert.equal(returned.processingStatus, 'Returned for Revision');
    cleanup();
  });

  it('blocks AI prohibited actions and external communications', () => {
    const { service, cleanup } = tempService();
    const { job } = service.createJob({
      sourceRecordType: 'Client',
      sourceRecordId: 'c-1',
      requestedOperation: 'ExternalCommunications',
      idempotencyKey: 'ext-1',
      mockScenario: 'success',
    });
    const gate = service.attemptProhibitedAction(job.aiJobId, 'ProductionDeployment');
    assert.equal(gate.allowed, false);
    const ext = service.attemptExternalCommunication(job.aiJobId);
    assert.equal(ext.allowed, false);
    cleanup();
  });

  it('keeps EVA and client emails disabled', () => {
    const { service, cleanup } = tempService();
    const flags = service.getFlags();
    assert.equal(flags.EvaIntakeEnabled, false);
    assert.equal(flags.ClientEmailsEnabled, false);
    const snap = service.commandCenterSnapshot();
    assert.equal(snap.evaIntakeEnabled, false);
    assert.deepEqual(snap.evaSubmissionsAwaitingReview, []);
    cleanup();
  });

  it('allows Future Human Operator assignment without code changes', () => {
    const { service, cleanup } = tempService();
    const item = service.createOperationsItem({
      title: 'Prepare binder',
      sourceRecordType: 'Task',
      sourceRecordId: 't-op-1',
      assignee: FUTURE_OPERATOR_OWNER,
    });
    assert.equal(item.assignee, FUTURE_OPERATOR_OWNER);
    assert.ok(item.title.includes(SYNTHETIC_RECORD_BANNER));
    const reassigned = service.reassignOperationsItem(item.id, 'Unassigned Operations');
    assert.equal(reassigned.assignee, 'Unassigned Operations');
    cleanup();
  });

  it('rejects forbidden person names in inputs', () => {
    const { service, cleanup } = tempService();
    assert.throws(
      () =>
        service.createJob({
          sourceRecordType: 'Task',
          sourceRecordId: 'x',
          requestedOperation: 'MeetingSummary',
          idempotencyKey: 'forbid-1',
          requestedBy: 'Stephen',
        }),
      (err: Error & { code?: string }) => err.code === 'forbidden_person_name',
    );
    cleanup();
  });

  it('preserves complete audit history', async () => {
    const { service, cleanup } = tempService();
    const { job } = service.createJob({
      sourceRecordType: 'Task',
      sourceRecordId: 'audit',
      requestedOperation: 'Pricing',
      idempotencyKey: 'audit-1',
      mockScenario: 'success',
    });
    await service.processJob(job.aiJobId, { force: true });
    service.mannyDecide(job.aiJobId, 'Approved', MANNY_OWNER);
    const events = service.listAudit(job.aiJobId);
    assert.ok(events.length >= 3);
    assert.ok(events.every((e) => e.auditCorrelationId === job.auditCorrelationId));
    cleanup();
  });

  it('does not change authoritative business records before approval', async () => {
    const { service, cleanup } = tempService();
    const { job } = service.createJob({
      sourceRecordType: 'Client',
      sourceRecordId: 'biz',
      requestedOperation: 'ClientActivation',
      idempotencyKey: 'biz-1',
      mockScenario: 'success',
    });
    const processed = await service.processJob(job.aiJobId, { force: true });
    assert.equal(processed.wroteAuthoritativeBusinessRecord, false);
    assert.equal(processed.processingStatus, 'Waiting on Manny');
    cleanup();
  });
});
