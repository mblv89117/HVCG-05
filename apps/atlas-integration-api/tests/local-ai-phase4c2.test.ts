/**
 * Phase 4C-2 hardening tests.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  DEFAULT_LOCAL_AI_FEATURE_FLAGS,
  DOCUMENT_DURABLE_SCHEMA_VERSION,
} from '@hvcg/atlas-integration-core';
import { LocalAiRepository } from '../src/local-ai/repository.ts';
import { LocalAiService } from '../src/local-ai/service.ts';
import { DocumentReviewDatabase } from '../src/local-ai/documentReviewDb.ts';
import { encryptBuffer, decryptBuffer, verifyBackupBundle } from '../src/local-ai/encryptedBackup.ts';
import { OllamaClient } from '../src/local-ai/ollamaClient.ts';
import { createFixture } from '../src/local-ai/documentFixtures.ts';

function tempService(extraEnv: Record<string, string> = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-p4c2-'));
  const service = new LocalAiService({
    repo: new LocalAiRepository(join(dir, 'repo')),
    flags: { ...DEFAULT_LOCAL_AI_FEATURE_FLAGS, LocalAIEnabled: true },
    defaultExecutorMode: 'mock',
    secretsFileEnv: {
      LOCAL_AI_MALWARE_SCAN_SYNTHETIC_OVERRIDE: 'true',
      ...extraEnv,
    },
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

describe('phase4c2 hardening', () => {
  it('migrates to schema v2 and seeds retention policies', () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-p4c2-mig-'));
    const db = new DocumentReviewDatabase(join(dir, 't.sqlite'));
    assert.equal(db.getSchemaVersion(), DOCUMENT_DURABLE_SCHEMA_VERSION);
    assert.ok(db.c2.listRetentionPolicies().length >= 4);
    const pragma = db.c2.pragmaInfo();
    assert.ok(pragma.journalMode);
    assert.equal(pragma.foreignKeys, true);
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('AES-256-GCM encrypt/decrypt; wrong passphrase fails', () => {
    const plain = Buffer.from('atlas-local-backup-test');
    const { ciphertext, salt, iv, authTag } = encryptBuffer(plain, 'correct-horse');
    const out = decryptBuffer(ciphertext, 'correct-horse', salt, iv, authTag);
    assert.equal(out.toString(), plain.toString());
    assert.throws(() => decryptBuffer(ciphertext, 'wrong-pass', salt, iv, authTag));
  });

  it('pack members, relationships, ordering, chronology, conflicts', async () => {
    const { service, cleanup } = tempService();
    try {
      const a = await service.stageDocument({
        originalFilename: createFixture('txt').filename,
        contentBase64: createFixture('txt').bytes.toString('base64'),
      });
      const b = await service.stageDocument({
        originalFilename: createFixture('csv').filename,
        contentBase64: createFixture('csv').bytes.toString('base64'),
      });
      await service.processStagedDocument({ stagedFileId: a.stagedFileId, clientLabel: 'Acme' });
      await service.processStagedDocument({ stagedFileId: b.stagedFileId, clientLabel: 'Acme' });
      const pack = service.createMultiDocumentReview({
        stagedFileIds: [a.stagedFileId, b.stagedFileId],
        clientLabel: 'Acme',
        title: 'Lease pack',
        purpose: 'Review',
        expectedChecklist: ['agreement', 'invoice'],
      });
      const ws = service.getPackWorkspace(pack.packId);
      assert.ok((ws.members as unknown[]).length >= 2);
      service.configurePackWorkspace(pack.packId, {
        members: [
          {
            reviewId: b.stagedFileId,
            stagedFileId: b.stagedFileId,
            orderIndex: 0,
            relationshipType: 'primary document',
            versionLabel: 'v2',
            amendmentLabel: null,
            designation: 'primary',
            expectedChecklistItem: 'agreement',
          },
          {
            reviewId: a.stagedFileId,
            stagedFileId: a.stagedFileId,
            orderIndex: 1,
            relationshipType: 'amendment',
            versionLabel: 'v1',
            amendmentLabel: 'First amendment',
            designation: 'supporting',
            expectedChecklistItem: null,
          },
        ],
      });
      const rel = service.upsertPackRelationship(pack.packId, {
        fromReviewId: a.stagedFileId,
        toReviewId: b.stagedFileId,
        relationshipType: 'prior version',
        label: 'superseded by v2',
      });
      assert.ok(rel.relationshipId);
      const analysis = service.analyzeMultiDocumentPack(pack.packId);
      assert.equal(analysis.draftOnly, true);
      assert.ok(analysis.documentChronology.length >= 1);
      assert.ok(analysis.documentInventory.length === 2);
      assert.equal(analysis.mannyDecisionRequired, true);
    } finally {
      cleanup();
    }
  });

  it('encrypted backup, verify, wrong passphrase, checksum mismatch, dry-run restore', async () => {
    const { dir, service, cleanup } = tempService({
      LOCAL_AI_BACKUP_PASSPHRASE: 'test-passphrase-4c2',
    });
    try {
      await service.stageDocument({
        originalFilename: createFixture('txt').filename,
        contentBase64: createFixture('txt').bytes.toString('base64'),
      });
      const dry = service.backupDocumentReviews({
        dryRun: true,
        profile: 'Metadata Only',
        encrypted: true,
      });
      assert.equal(dry.dryRun, true);
      assert.equal(dry.encrypted, true);

      const bak = service.backupDocumentReviews({
        dryRun: false,
        profile: 'Metadata Only',
        encrypted: true,
      });
      assert.equal(bak.encrypted, true);
      assert.ok(existsSync(String(bak.pathHint)));
      const manifestPath = String(bak.pathHint).replace(/\.sqlite\.enc$/, '.manifest.json');
      const verified = service.verifyDocumentBackup(manifestPath, 'test-passphrase-4c2');
      assert.equal(verified.ok, true);

      const badPass = service.verifyDocumentBackup(manifestPath, 'wrong');
      assert.equal(badPass.ok, false);
      assert.ok(badPass.errors.some((e) => /passphrase|corrupt/i.test(e)));

      // Corrupt ciphertext
      const encPath = String(bak.pathHint);
      const buf = Buffer.from(readFileSync(encPath));
      buf[10] = buf[10] ^ 0xff;
      writeFileSync(encPath, buf);
      const corrupt = verifyBackupBundle({
        manifestPathOrDir: manifestPath,
        passphrase: 'test-passphrase-4c2',
      });
      assert.equal(corrupt.ok, false);

      const dryRestore = service.restoreDocumentReviews(manifestPath, {
        dryRun: true,
        authorized: true,
        tempValidationOnly: true,
      });
      assert.equal(dryRestore.dryRun, true);

      assert.throws(
        () =>
          service.restoreDocumentReviews(manifestPath, {
            authorized: true,
            confirmOverwrite: false,
          }),
        /confirmOverwrite|confirmation/i,
      );

      const fullWarn = service.backupDocumentReviews({
        dryRun: true,
        profile: 'Full Local Review Backup',
        encrypted: false,
        includeStagedOriginals: true,
      });
      assert.ok(fullWarn.warning);
      void dir;
    } finally {
      cleanup();
    }
  });

  it('retention batch, holds exclude purge, hold release', async () => {
    const { service, cleanup } = tempService();
    try {
      const staged = await service.stageDocument({
        originalFilename: createFixture('txt').filename,
        contentBase64: createFixture('txt').bytes.toString('base64'),
      });
      const hold = service.createDocumentHold({
        reviewId: staged.stagedFileId,
        holdType: 'Legal Hold',
        reason: 'Matter hold test',
      });
      assert.equal(hold.active, true);
      assert.throws(
        () => service.purgeStagedDocument(staged.stagedFileId, { authorized: true }),
        /hold/i,
      );
      const batch = service.createRetentionBatch('test');
      assert.equal(batch.status, 'Proposed');
      assert.ok(!batch.candidateReviewIds.includes(staged.stagedFileId));
      service.releaseDocumentHold(hold.holdId);
      const approved = service.approveRetentionBatch(batch.batchId, {
        authorized: true,
        execute: false,
      });
      assert.equal(approved?.status, 'Approved');
    } finally {
      cleanup();
    }
  });

  it('malware and extraction fingerprints + checkpoints + resume eligibility', async () => {
    const { service, cleanup } = tempService();
    try {
      const fx = createFixture('txt');
      const staged = await service.stageDocument({
        originalFilename: fx.filename,
        contentBase64: fx.bytes.toString('base64'),
      });
      await service.processStagedDocument({ stagedFileId: staged.stagedFileId });
      const cps = service.listDocumentCheckpoints(staged.stagedFileId);
      assert.ok(cps.some((c) => c.stage === 'staging'));
      assert.ok(cps.some((c) => c.stage === 'malware_scan' || c.stage === 'extraction'));
      const elig = service.documentResumeEligibility(staged.stagedFileId);
      assert.equal(elig.canRestart, true);
      const again = await service.stageDocument({
        originalFilename: fx.filename,
        contentBase64: fx.bytes.toString('base64'),
      });
      assert.equal(again.stagedFileId, staged.stagedFileId);
    } finally {
      cleanup();
    }
  });

  it('storage health, integrity, repair dry-run, unauthorized repair', async () => {
    const { service, cleanup } = tempService();
    try {
      await service.stageDocument({
        originalFilename: createFixture('txt').filename,
        contentBase64: createFixture('txt').bytes.toString('base64'),
      });
      const health = service.storageHealthExtended();
      assert.equal(health.databaseAvailable, true);
      assert.equal(health.schemaVersion, DOCUMENT_DURABLE_SCHEMA_VERSION);
      const integrity = service.documentIntegrityCheck();
      assert.ok(integrity.integrityCheck);
      const dry = service.documentRepairDryRun();
      assert.equal(dry.dryRun, true);
      assert.throws(
        () => service.documentAuthorizedRepair({ authorized: false }),
        /authorization|unauthorized/i,
      );
      const notes = service.documentAuthorizedRepair({
        authorized: true,
        action: 'note_only',
      });
      assert.ok(notes);
    } finally {
      cleanup();
    }
  });

  it('path traversal / SQL injection / safety flags / no file move', async () => {
    const { service, cleanup } = tempService();
    try {
      const flags = service.getFlags();
      assert.equal(flags.LocalAIWritesEnabled, false);
      assert.equal(flags.LocalAIExternalMessagesEnabled, false);
      assert.equal(flags.EvaIntakeEnabled, false);
      assert.equal(flags.ClientEmailsEnabled, false);
      assert.throws(() => service.verifyDocumentBackup('/etc/passwd'), /path/i);
      const docs = service.searchStagedDocuments({
        originalFilename: "'; DROP TABLE document_reviews;--",
      });
      assert.ok(Array.isArray(docs));
      const staged = await service.stageDocument({
        originalFilename: createFixture('txt').filename,
        contentBase64: createFixture('txt').bytes.toString('base64'),
      });
      await service.processStagedDocument({ stagedFileId: staged.stagedFileId });
      await service.decideStagedDocument(staged.stagedFileId, 'Approve Redacted Content');
      const enriched = await service.enrichStagedDocument(staged.stagedFileId);
      assert.equal(enriched.reviewPackage?.noFileMovement, true);
      assert.equal(enriched.reviewPackage?.naming.fileRenamed, false);
      assert.equal(enriched.reviewPackage?.folder.fileMoved, false);
    } finally {
      cleanup();
    }
  });
});
