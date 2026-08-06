/**
 * Phase 4C-1 durable local review store tests.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  DEFAULT_LOCAL_AI_FEATURE_FLAGS,
  DOCUMENT_DURABLE_SCHEMA_VERSION,
  assertDurableTransition,
  toDurableStatus,
} from '@hvcg/atlas-integration-core';
import { LocalAiRepository } from '../src/local-ai/repository.ts';
import { LocalAiService } from '../src/local-ai/service.ts';
import { DocumentReviewDatabase, assertSafeBackupPath } from '../src/local-ai/documentReviewDb.ts';
import { DocumentReviewService } from '../src/local-ai/documentReviewService.ts';
import { OllamaClient } from '../src/local-ai/ollamaClient.ts';
import { createFixture } from '../src/local-ai/documentFixtures.ts';

function tempService() {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-p4c1-'));
  const service = new LocalAiService({
    repo: new LocalAiRepository(join(dir, 'repo')),
    flags: { ...DEFAULT_LOCAL_AI_FEATURE_FLAGS, LocalAIEnabled: true },
    defaultExecutorMode: 'mock',
    secretsFileEnv: { LOCAL_AI_MALWARE_SCAN_SYNTHETIC_OVERRIDE: 'true' },
    documentStagingRoot: join(dir, 'staging'),
    documentReviewDbPath: join(dir, 'reviews.sqlite'),
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

describe('phase4c1 durable store', () => {
  it('initializes empty SQLite and migrates to schema v1', () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-p4c1-db-'));
    const dbPath = join(dir, 't.sqlite');
    const db = new DocumentReviewDatabase(dbPath);
    assert.equal(db.getSchemaVersion(), DOCUMENT_DURABLE_SCHEMA_VERSION);
    assert.equal(db.health().ok, true);
    assert.equal(db.health().reviewCount, 0);
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('maps legacy statuses and validates transitions', () => {
    assert.equal(toDurableStatus('ReadyForReview'), 'Draft Ready');
    assert.equal(toDurableStatus('Enriching'), 'AI Enrichment In Progress');
    assert.equal(assertDurableTransition('Draft Ready', 'Approved Draft'), 'Approved Draft');
  });

  it('persists review across service restart', async () => {
    const { dir, service, cleanup } = tempService();
    try {
      const fx = createFixture('txt');
      const staged = await service.stageDocument({
        originalFilename: fx.filename,
        contentBase64: fx.bytes.toString('base64'),
        declaredMime: fx.mime,
      });
      assert.ok(staged.stagedFileId);
      const health = service.documentDatabaseHealth();
      assert.equal(health.reviewCount, 1);
      assert.equal(health.schemaVersion, DOCUMENT_DURABLE_SCHEMA_VERSION);

      const service2 = new LocalAiService({
        repo: new LocalAiRepository(join(dir, 'repo2')),
        flags: { ...DEFAULT_LOCAL_AI_FEATURE_FLAGS, LocalAIEnabled: true },
        defaultExecutorMode: 'mock',
        secretsFileEnv: { LOCAL_AI_MALWARE_SCAN_SYNTHETIC_OVERRIDE: 'true' },
        documentStagingRoot: join(dir, 'staging'),
        documentReviewDbPath: join(dir, 'reviews.sqlite'),
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
      const listed = service2.listStagedDocuments();
      assert.ok(listed.some((d) => d.stagedFileId === staged.stagedFileId));
    } finally {
      cleanup();
    }
  });

  it('idempotent staging does not duplicate reviews', async () => {
    const { service, cleanup } = tempService();
    try {
      const fx = createFixture('txt');
      const a = await service.stageDocument({
        originalFilename: fx.filename,
        contentBase64: fx.bytes.toString('base64'),
      });
      const b = await service.stageDocument({
        originalFilename: fx.filename,
        contentBase64: fx.bytes.toString('base64'),
      });
      assert.equal(a.stagedFileId, b.stagedFileId);
      assert.equal(service.documentDatabaseHealth().reviewCount, 1);
    } finally {
      cleanup();
    }
  });

  it('persists pack, corrections, decisions, audit; search filters', async () => {
    const { service, cleanup } = tempService();
    try {
      const fx1 = createFixture('txt');
      const fx2 = createFixture('csv');
      const d1 = await service.stageDocument({
        originalFilename: fx1.filename,
        contentBase64: fx1.bytes.toString('base64'),
      });
      const d2 = await service.stageDocument({
        originalFilename: fx2.filename,
        contentBase64: fx2.bytes.toString('base64'),
      });
      await service.processStagedDocument({
        stagedFileId: d1.stagedFileId,
        clientLabel: 'Acme Test',
      });
      await service.processStagedDocument({
        stagedFileId: d2.stagedFileId,
        clientLabel: 'Acme Test',
      });
      await service.decideStagedDocument(d1.stagedFileId, 'Approve Redacted Content');
      const ready = await service.enrichStagedDocument(d1.stagedFileId);
      assert.ok(ready.status === 'ReadyForReview' || ready.status === 'Draft Ready');

      await service.decideStagedDocument(d1.stagedFileId, 'Correct Classification', {
        proposedType: 'invoice',
        reason: 'Manny override',
      });
      const corrections = service.listDocumentCorrections(d1.stagedFileId);
      assert.ok(corrections.length >= 1);

      await service.decideStagedDocument(d1.stagedFileId, 'Approve Draft');
      const decisions = service.listDocumentDecisions(d1.stagedFileId);
      assert.ok(decisions.some((x) => x.decision === 'Approve Draft'));
      assert.equal(decisions[0].fileMoved, false);
      assert.equal(decisions[0].authoritativeWrite, false);

      const pack = service.createMultiDocumentReview({
        stagedFileIds: [d1.stagedFileId, d2.stagedFileId],
        clientLabel: 'Acme Test',
        title: 'Test Pack',
      });
      assert.equal(pack.stagedFileIds.length, 2);
      assert.equal(service.listMultiDocumentReviews().length, 1);
      assert.equal(service.getMultiDocumentReview(pack.packId).packId, pack.packId);

      const found = service.searchStagedDocuments({ clientLabel: 'Acme', purged: false });
      assert.ok(found.length >= 1);

      const audit = service.listDocumentReviewAudit(d1.stagedFileId);
      assert.ok(audit.length >= 1);
    } finally {
      cleanup();
    }
  });

  it('marks interrupted jobs on restart without auto-reprocess', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-p4c1-rec-'));
    const dbPath = join(dir, 'r.sqlite');
    const staging = join(dir, 'staging');
    const env = {
      LOCAL_AI_DOCUMENT_STAGING_DIR: staging,
      LOCAL_AI_DOCUMENT_REVIEW_DB: dbPath,
      LOCAL_AI_DOCUMENT_BACKUP_DIR: join(dir, 'backups'),
      LOCAL_AI_MALWARE_SCAN_SYNTHETIC_OVERRIDE: 'true',
    };
    const svc = new DocumentReviewService(dir, env);
    const fx = createFixture('txt');
    const rec = await svc.stage({
      originalFilename: fx.filename,
      bytes: fx.bytes,
      allowSyntheticMalwareOverride: true,
    });
    rec.status = 'Enriching';
    // Access private persist via public decideRedaction path: direct durable upsert
    svc.durable.upsertReviewFromStaged(rec);
    svc.durable.close();
    const svc2 = new DocumentReviewService(dir, env);
    assert.ok(svc2.listInterruptedJobs().length >= 1);
    assert.ok(svc2.recoveryActions.length >= 1);
    svc2.durable.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('retention preview, purge tombstone, backup checksum, restore dry-run', async () => {
    const { dir, service, cleanup } = tempService();
    try {
      const fx = createFixture('txt');
      const staged = await service.stageDocument({
        originalFilename: fx.filename,
        contentBase64: fx.bytes.toString('base64'),
      });
      const preview = service.retentionPreviewDocuments();
      assert.ok(Array.isArray(preview));

      const purged = service.purgeStagedDocument(staged.stagedFileId, {
        authorized: true,
        reason: 'test purge',
      });
      assert.equal(String(purged.status), 'Purged');
      assert.ok(purged.purgedAt);

      const dry = service.backupDocumentReviews({ dryRun: true });
      assert.equal(dry.dryRun, true);
      assert.ok(dry.checksumSha256);
      assert.equal(dry.includeStagedOriginals, false);

      const bak = service.backupDocumentReviews({ dryRun: false });
      assert.equal(bak.dryRun, false);
      assert.ok(existsSync(String(bak.pathHint)));

      const validation = service.validateDocumentRestore(String(bak.pathHint));
      assert.equal(validation.ok, true);

      const dryRestore = service.restoreDocumentReviews(String(bak.pathHint), {
        dryRun: true,
        authorized: true,
      });
      assert.equal(dryRestore.dryRun, true);

      assert.throws(
        () =>
          service.restoreDocumentReviews(String(bak.pathHint), {
            dryRun: false,
            authorized: false,
          }),
        /authorization|unauthorized/i,
      );
    } finally {
      cleanup();
    }
  });

  it('rejects path traversal and unauthorized purge', async () => {
    const { service, cleanup } = tempService();
    try {
      assert.throws(() => assertSafeBackupPath('/tmp/../etc/passwd', '/tmp/backups'), /path/i);
      assert.throws(
        () => service.purgeStagedDocument('missing', { authorized: false }),
        /authorization|unauthorized/i,
      );

      // Parameterized search must not throw on injection-like strings
      const docs = service.searchStagedDocuments({
        originalFilename: "'; DROP TABLE document_reviews;--",
        clientLabel: "1 OR 1=1",
      });
      assert.ok(Array.isArray(docs));
      assert.equal(service.documentDatabaseHealth().ok, true);
    } finally {
      cleanup();
    }
  });

  it('keeps safety flags false and never moves files', async () => {
    const { service, cleanup } = tempService();
    try {
      const flags = service.getFlags();
      assert.equal(flags.LocalAIWritesEnabled, false);
      assert.equal(flags.LocalAIExternalMessagesEnabled, false);
      assert.equal(flags.EvaIntakeEnabled, false);
      assert.equal(flags.ClientEmailsEnabled, false);

      const fx = createFixture('txt');
      const staged = await service.stageDocument({
        originalFilename: fx.filename,
        contentBase64: fx.bytes.toString('base64'),
      });
      await service.processStagedDocument({ stagedFileId: staged.stagedFileId });
      await service.decideStagedDocument(staged.stagedFileId, 'Approve Redacted Content');
      const enriched = await service.enrichStagedDocument(staged.stagedFileId);
      assert.equal(enriched.reviewPackage?.noFileMovement, true);
      assert.equal(enriched.reviewPackage?.noRecordWrites, true);
      assert.equal(enriched.reviewPackage?.naming.fileRenamed, false);
      assert.equal(enriched.reviewPackage?.folder.fileMoved, false);
    } finally {
      cleanup();
    }
  });
});
