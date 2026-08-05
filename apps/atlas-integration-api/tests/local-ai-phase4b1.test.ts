/**
 * Phase 4B-1 document intake / staging / extraction tests.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  DEFAULT_LOCAL_AI_FEATURE_FLAGS,
  classifyDocumentDraft,
  recommendFilename,
  isDeepDocumentType,
} from '@hvcg/atlas-integration-core';
import { LocalAiRepository } from '../src/local-ai/repository.ts';
import { LocalAiService } from '../src/local-ai/service.ts';
import { createSyntheticTestBytes } from '../src/local-ai/documentReviewService.ts';
import { OllamaClient } from '../src/local-ai/ollamaClient.ts';

function tempService() {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-p4b1-'));
  const staging = join(dir, 'staging');
  const service = new LocalAiService({
    repo: new LocalAiRepository(join(dir, 'repo')),
    flags: { ...DEFAULT_LOCAL_AI_FEATURE_FLAGS, LocalAIEnabled: true },
    defaultExecutorMode: 'mock',
    secretsFileEnv: {},
    documentStagingRoot: staging,
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
  return { dir, staging, service, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

describe('phase4b1 document policies', () => {
  it('classifies invoice-like text and deep agreement types', () => {
    const c = classifyDocumentDraft('TEST Invoice number 12 Amount due $50.00');
    assert.equal(c.proposedType, 'invoice');
    assert.equal(c.mannyReviewRequired, true);
    assert.equal(isDeepDocumentType('agreement'), true);
    assert.equal(isDeepDocumentType('invoice'), false);
    const naming = recommendFilename({
      originalFilename: 'a.pdf',
      clientLabel: 'Harbor Lights',
      documentType: 'invoice',
      documentDate: '2026-01-02',
    });
    assert.equal(naming.fileRenamed, false);
    assert.ok(naming.proposedFilename.includes('invoice'));
  });
});

describe('phase4b1 staging and extraction', () => {
  it('rejects unsupported types and oversized payloads', () => {
    const { service, cleanup } = tempService();
    assert.throws(() =>
      service.stageDocument({
        originalFilename: 'x.exe',
        contentBase64: Buffer.from('MZ').toString('base64'),
      }),
    );
    cleanup();
  });

  it('stages txt, extracts, detects injection, never moves file', async () => {
    const { service, staging, cleanup } = tempService();
    const fx = createSyntheticTestBytes('injection');
    const staged = service.stageDocument({
      originalFilename: fx.filename,
      contentBase64: fx.bytes.toString('base64'),
      declaredMime: fx.mime,
    });
    assert.equal(staged.status, 'Staged');
    assert.ok(existsSync(join(staging, 'files', staged.safeFilename)));
    const processed = await service.processStagedDocument({
      stagedFileId: staged.stagedFileId,
      clientLabel: 'Synthetic Client',
    });
    assert.equal(processed.status, 'ReadyForReview');
    assert.ok(processed.reviewPackage);
    assert.equal(processed.reviewPackage!.draftOnly, true);
    assert.equal(processed.reviewPackage!.noFileMovement, true);
    assert.equal(processed.reviewPackage!.noRecordWrites, true);
    assert.ok((processed.reviewPackage!.injectionWarnings || []).length >= 1);
    assert.equal(processed.reviewPackage!.naming.fileRenamed, false);
    assert.equal(processed.reviewPackage!.folder.fileMoved, false);
    // original still present under safe name only
    assert.ok(existsSync(join(staging, 'files', staged.safeFilename)));
    cleanup();
  });

  it('extracts CSV safely and PDF embedded text', async () => {
    const { service, cleanup } = tempService();
    const csv = createSyntheticTestBytes('csv');
    const stagedCsv = service.stageDocument({
      originalFilename: csv.filename,
      contentBase64: csv.bytes.toString('base64'),
      declaredMime: csv.mime,
    });
    const csvDoc = await service.processStagedDocument({
      stagedFileId: stagedCsv.stagedFileId,
      clientLabel: 'CSV Client',
    });
    assert.ok(csvDoc.extraction?.warnings.some((w) => /formula/i.test(w)));

    const pdf = createSyntheticTestBytes('pdf_text');
    const stagedPdf = service.stageDocument({
      originalFilename: pdf.filename,
      contentBase64: pdf.bytes.toString('base64'),
      declaredMime: pdf.mime,
    });
    const pdfDoc = await service.processStagedDocument({
      stagedFileId: stagedPdf.stagedFileId,
      clientLabel: 'PDF Client',
    });
    assert.ok((pdfDoc.extraction?.embeddedTextChars || 0) > 20);
    assert.match(pdfDoc.extraction?.method || '', /pdf-parse/);
    assert.equal(pdfDoc.reviewPackage?.noExternalCommunications, true);
    cleanup();
  });

  it('detects exact duplicate by checksum and supports purge + approve draft', async () => {
    const { service, staging, cleanup } = tempService();
    const fx = createSyntheticTestBytes('txt');
    const a = service.stageDocument({
      originalFilename: fx.filename,
      contentBase64: fx.bytes.toString('base64'),
      declaredMime: fx.mime,
    });
    await service.processStagedDocument({ stagedFileId: a.stagedFileId, clientLabel: 'A' });
    const b = service.stageDocument({
      originalFilename: 'copy-' + fx.filename,
      contentBase64: fx.bytes.toString('base64'),
      declaredMime: fx.mime,
    });
    const bDoc = await service.processStagedDocument({
      stagedFileId: b.stagedFileId,
      clientLabel: 'A',
    });
    assert.equal(bDoc.reviewPackage?.duplicate.status, 'exact_duplicate');

    const approved = service.decideStagedDocument(a.stagedFileId, 'Approve Draft');
    assert.equal(approved.mannyDecision, 'Approve Draft');
    assert.equal(approved.reviewPackage?.naming.fileRenamed, false);
    assert.equal(approved.reviewPackage?.folder.fileMoved, false);

    const purged = service.purgeStagedDocument(a.stagedFileId);
    assert.equal(purged.status, 'Purged');
    assert.equal(existsSync(join(staging, 'files', a.safeFilename)), false);

    const flags = service.getFlags();
    assert.equal(flags.LocalAIWritesEnabled, false);
    assert.equal(flags.LocalAIExternalMessagesEnabled, false);
    assert.equal(flags.EvaIntakeEnabled, false);
    assert.equal(flags.ClientEmailsEnabled, false);
    cleanup();
  });

  it('rejects MIME mismatch', () => {
    const { service, cleanup } = tempService();
    // PNG bytes with .pdf extension
    const png = createSyntheticTestBytes('png_placeholder');
    assert.throws(() =>
      service.stageDocument({
        originalFilename: 'fake.pdf',
        contentBase64: png.bytes.toString('base64'),
        declaredMime: 'application/pdf',
      }),
    );
    cleanup();
  });
});
