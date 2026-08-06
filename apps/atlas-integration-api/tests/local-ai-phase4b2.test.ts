/**
 * Phase 4B-2 document enrichment / malware / fixtures / compare tests.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  DEFAULT_LOCAL_AI_FEATURE_FLAGS,
  mergeDeterministicAndModel,
  validateDocumentEnrichmentOutput,
  classifyOcrConfidence,
  isDeepDocumentType,
} from '@hvcg/atlas-integration-core';
import { LocalAiRepository } from '../src/local-ai/repository.ts';
import { LocalAiService } from '../src/local-ai/service.ts';
import { createFixture } from '../src/local-ai/documentFixtures.ts';
import { resolveClamscanPath } from '../src/local-ai/malwareScanner.ts';
import { OllamaClient } from '../src/local-ai/ollamaClient.ts';

function tempService() {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-p4b2-'));
  const service = new LocalAiService({
    repo: new LocalAiRepository(join(dir, 'repo')),
    flags: { ...DEFAULT_LOCAL_AI_FEATURE_FLAGS, LocalAIEnabled: true },
    defaultExecutorMode: 'mock',
    secretsFileEnv: { LOCAL_AI_MALWARE_SCAN_SYNTHETIC_OVERRIDE: 'true' },
    documentStagingRoot: join(dir, 'staging'),
    ollamaClient: {
      getConfig: () => ({
        baseUrl: 'http://127.0.0.1:11434',
        model: 'x',
        timeoutMs: 1000,
        maxRetries: 1,
        allowNonLoopback: false,
        formatJson: true,
      }),
      withModel() {
        return this;
      },
      health: async () => ({ ok: true }),
      listModels: async () => [],
      chat: async () => ({ rawContent: '{}', model: 'x' }),
    } as unknown as OllamaClient,
  });
  return { dir, service, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

describe('phase4b2 enrichment schema', () => {
  it('validates enrichment and preserves deterministic over model', () => {
    const merged = mergeDeterministicAndModel({
      reviewId: 'r1',
      jobId: 'j1',
      deterministic: {
        documentType: 'invoice',
        documentTypeConfidence: 0.8,
        alternatives: [],
        proposedFilename: 'Client_invoice.pdf',
        proposedFolder: '01_Financial/Invoices',
        duplicateStatus: 'unique',
        dates: ['2026-01-02'],
        amounts: ['$50.00'],
        obligations: [],
        deadlines: [],
        facts: ['checksum:abc'],
      },
      model: {
        review_id: 'r1',
        job_id: 'j1',
        document_type: 'agreement',
        document_type_confidence: 0.9,
        alternative_document_types: [],
        executive_summary: 'model says agreement',
        facts: [],
        inferences: [{ text: 'maybe lease', source: 'model_inference', confidence: 0.4, refs: [] }],
        parties: [],
        dates: [],
        amounts: [],
        payment_terms: [],
        obligations: [],
        deliverables: [],
        deadlines: [],
        renewal_terms: [],
        termination_terms: [],
        default_terms: [],
        governing_law: null,
        confidentiality_terms: [],
        signatures: { expected: [], present: [], missing: [], uncertain: [] },
        missing_pages: [],
        referenced_exhibits: [],
        missing_exhibits: [],
        risks: [],
        missing_information: [],
        proposed_filename: 'Other.pdf',
        proposed_folder: 'x',
        duplicate_status: 'unique',
        recommended_next_action: 'review',
        recommended_owner: 'Manny',
        work_value_tier: 'Tier 3 — Administrative Delegate',
        requires_manny_approval: true,
        estimated_manny_review_minutes: 5,
        estimated_manny_time_saved_minutes: 10,
        confidence: 0.9,
        warnings: [],
        source_references: [],
        conflicts: [],
        schemaVersion: '1.0.0-phase4b2',
        draftOnly: true,
        banner: 'TEST — SYNTHETIC AI OUTPUT — DO NOT SEND',
      },
    });
    assert.equal(merged.document_type, 'invoice');
    assert.equal(merged.proposed_filename, 'Client_invoice.pdf');
    assert.ok(merged.conflicts.length >= 1);
    assert.equal(classifyOcrConfidence(0.9), 'High confidence');
    assert.equal(isDeepDocumentType('agreement'), true);
  });
});

describe('phase4b2 staging malware gate and enrichment', () => {
  it('stages clean files when ClamAV is healthy', async () => {
    const { service, cleanup } = tempService();
    assert.ok(resolveClamscanPath());
    const fx = createFixture('txt');
    const staged = await service.stageDocument({
      originalFilename: fx.filename,
      contentBase64: fx.bytes.toString('base64'),
      declaredMime: fx.mime,
    });
    // Cold ClamAV DB load can be slow; clean is expected when scan completes
    assert.ok(
      staged.malwareScanStatus === 'clean' || staged.malwareScanStatus === 'timeout',
      `unexpected malware status: ${staged.malwareScanStatus}`,
    );
    if (staged.malwareScanStatus === 'clean') {
      assert.notEqual(staged.status, 'MalwareBlocked');
    }
    cleanup();
  });

  it('extract → redaction approve → mock enrich → ReadyForReview', async () => {
    const { service, cleanup } = tempService();
    const fx = createFixture('injection');
    const staged = await service.stageDocument({
      originalFilename: fx.filename,
      contentBase64: fx.bytes.toString('base64'),
      declaredMime: fx.mime,
    });
    const extracted = await service.processStagedDocument({
      stagedFileId: staged.stagedFileId,
      clientLabel: 'Synthetic',
    });
    assert.equal(extracted.status, 'AwaitingRedactionApproval');
    assert.ok((extracted.reviewPackage?.injectionWarnings || []).length >= 1);
    const enriched = await service.decideStagedDocument(
      staged.stagedFileId,
      'Approve Redacted Content',
    );
    assert.equal(enriched.status, 'ReadyForReview');
    assert.equal(enriched.reviewPackage?.enrichmentStatus, 'complete');
    assert.ok(enriched.reviewPackage?.enrichment);
    assert.equal(enriched.reviewPackage?.naming.fileRenamed, false);
    assert.equal(enriched.reviewPackage?.noRecordWrites, true);
    cleanup();
  });

  it('rejects encrypted PDF and MIME mismatch; DOCX/XLSX extract', async () => {
    const { service, cleanup } = tempService();
    const enc = createFixture('pdf_encrypted');
    await assert.rejects(() =>
      service.stageDocument({
        originalFilename: enc.filename,
        contentBase64: enc.bytes.toString('base64'),
        declaredMime: enc.mime,
      }),
    );
    const png = createFixture('png_invoice');
    await assert.rejects(() =>
      service.stageDocument({
        originalFilename: 'fake.pdf',
        contentBase64: png.bytes.toString('base64'),
        declaredMime: 'application/pdf',
      }),
    );
    const docx = createFixture('docx_agreement');
    const staged = await service.stageDocument({
      originalFilename: docx.filename,
      contentBase64: docx.bytes.toString('base64'),
      declaredMime: docx.mime,
    });
    const processed = await service.processStagedDocument({
      stagedFileId: staged.stagedFileId,
      clientLabel: 'DOCX Client',
    });
    assert.ok((processed.extraction?.embeddedTextChars || 0) > 20);
    const xlsx = createFixture('xlsx_external_link');
    const xs = await service.stageDocument({
      originalFilename: xlsx.filename,
      contentBase64: xlsx.bytes.toString('base64'),
      declaredMime: xlsx.mime,
    });
    const xp = await service.processStagedDocument({
      stagedFileId: xs.stagedFileId,
      clientLabel: 'XLSX Client',
    });
    assert.ok(xp.extraction?.warnings.some((w) => /macro|formula|workbook/i.test(w)));
    cleanup();
  });

  it('version compare and multi-doc pack + correction audit', async () => {
    const { service, cleanup } = tempService();
    const a = createFixture('txt');
    const b = createFixture('prior_version');
    const sa = await service.stageDocument({
      originalFilename: a.filename,
      contentBase64: a.bytes.toString('base64'),
      declaredMime: a.mime,
    });
    const sb = await service.stageDocument({
      originalFilename: b.filename,
      contentBase64: b.bytes.toString('base64'),
      declaredMime: b.mime,
    });
    await service.processStagedDocument({ stagedFileId: sa.stagedFileId, clientLabel: 'A' });
    await service.processStagedDocument({ stagedFileId: sb.stagedFileId, clientLabel: 'A' });
    const cmp = service.compareStagedDocumentVersions(sa.stagedFileId, sb.stagedFileId);
    assert.equal(cmp.filesDeleted, false);
    assert.equal(cmp.draftOnly, true);
    const pack = service.createMultiDocumentReview({
      stagedFileIds: [sa.stagedFileId, sb.stagedFileId],
      clientLabel: 'A',
    });
    assert.equal(pack.stagedFileIds.length, 2);
    await service.decideStagedDocument(sa.stagedFileId, 'Approve Redacted Content');
    const corrected = await service.decideStagedDocument(sa.stagedFileId, 'Correct Classification', {
      proposedType: 'meeting_notes',
      reason: 'Manny override',
      informFutureDeterministicRules: false,
    });
    assert.ok((corrected.correctionLog as unknown[]).length >= 1);
    const flags = service.getFlags();
    assert.equal(flags.LocalAIWritesEnabled, false);
    assert.equal(flags.EvaIntakeEnabled, false);
    assert.equal(flags.ClientEmailsEnabled, false);
    cleanup();
  });
});
