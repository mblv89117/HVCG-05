/**
 * Document review orchestration — Phase 4B-2.
 * stage → malware → extract/OCR → redaction gate → (service) Ollama enrich → draft package.
 * Never moves/renames/uploads files. Never writes authoritative records.
 */

import { createHash, randomUUID } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  DOCUMENT_STAGING_SCHEMA_VERSION,
  SYNTHETIC_AI_OUTPUT_BANNER,
  buildTimeProtectionOutput,
  classifyDocumentDraft,
  detectDuplicateDraft,
  extractStructuredFieldsDraft,
  isDeepDocumentType,
  listDatesAmountsDeadlinesObligations,
  mergeDeterministicAndModel,
  recommendFilename,
  recommendFolder,
  redactText,
  scanForInjection,
  DEFAULT_MULTI_DOC_MAX_BYTES,
  DEFAULT_MULTI_DOC_MAX_FILES,
  toDurableStatus,
  SCAN_POLICY_VERSION,
  EXTRACTION_POLICY_VERSION,
  OCR_PREPROCESS_VERSION,
  type BackupCreateOptions,
  type DocumentEnrichmentOutput,
  type DocumentRelationshipType,
  type DocumentReviewDecision,
  type DocumentReviewPackage,
  type DocumentVersionComparison,
  type DurableCorrectionRecord,
  type DurableDecisionRecord,
  type DurableMultiDocPack,
  type FieldCorrectionRecord,
  type HoldType,
  type MalwareScanResult,
  type MultiDocumentReviewPack,
  type PackMemberMeta,
  type ReviewSearchFilters,
  type StagedDocumentRecord,
} from '@hvcg/atlas-integration-core';
import {
  DocumentStagingStore,
  detectMimeFromBuffer,
  resolveDocumentStagingConfig,
} from './documentStaging.ts';
import { combinedExtractedText, extractDocument } from './documentExtraction.ts';
import {
  getClamavVersions,
  malwareQuarantineDir,
  resolveClamscanPath,
  scanFileLocally,
} from './malwareScanner.ts';
import { createFixture, type FixtureKind } from './documentFixtures.ts';
import {
  DocumentReviewDatabase,
  resolveDocumentReviewDbPath,
  assertSafeBackupPath,
} from './documentReviewDb.ts';
import { analyzeMultiDocumentPack } from './packAnalysis.ts';
import {
  backupDirBytes,
  estimateBackupSize,
  listBackupManifests,
  resolveBackupPassphrase,
  verifyBackupBundle,
  writeBackupBundle,
  decryptBuffer,
} from './encryptedBackup.ts';
import { sumDirBytes } from './phase4c2Store.ts';

export class DocumentReviewService {
  readonly staging: DocumentStagingStore;
  readonly durable: DocumentReviewDatabase;
  readonly recoveryActions: string[] = [];
  private activeAbort = new Map<string, AbortController>();
  private multiPacks = new Map<string, MultiDocumentReviewPack>();
  private env: Record<string, string | undefined>;
  private repoRoot: string;
  private backupRoot: string;

  constructor(repoRoot: string, env: Record<string, string | undefined> = process.env) {
    this.env = env;
    this.repoRoot = repoRoot;
    this.staging = new DocumentStagingStore(resolveDocumentStagingConfig(env, repoRoot));
    const dbPath = resolveDocumentReviewDbPath(env, repoRoot);
    this.durable = new DocumentReviewDatabase(dbPath);
    this.backupRoot = resolve(
      (env.LOCAL_AI_DOCUMENT_BACKUP_DIR || '').trim() ||
        resolve(repoRoot, '.data', 'local-ai-document-backups'),
    );
    // Hydrate staging → durable for any pre-4C-1 records still on disk
    for (const rec of this.staging.list()) {
      if (!this.durable.getReview(rec.stagedFileId)) {
        this.durable.upsertReviewFromStaged(rec, { actor: 'LocalAI' });
      }
    }
    for (const pack of this.durable.listPacks()) {
      this.multiPacks.set(pack.packId, this.fromDurablePack(pack));
    }
    const recovery = this.durable.recoverOnStartup('LocalAI');
    this.recoveryActions.push(...recovery.actions);
  }

  private persist(
    rec: StagedDocumentRecord,
    opts?: { clientLabel?: string; projectLabel?: string | null; actor?: string },
  ) {
    this.staging.upsert(rec);
    this.durable.upsertReviewFromStaged(rec, opts);
  }

  list() {
    this.staging.expireDue();
    const durable = this.durable.listReviews(500);
    if (durable.length) return durable.map((r) => this.publicView(r));
    return this.staging.list().map((r) => this.publicView(r));
  }

  search(filters: ReviewSearchFilters) {
    this.staging.expireDue();
    return this.durable.searchReviews(filters).map((r) => this.publicView(r));
  }

  get(id: string) {
    return this.publicView(this.require(id), true);
  }

  dbHealth() {
    return this.durable.health();
  }

  migrationStatus() {
    return {
      schemaVersion: this.durable.getSchemaVersion(),
      schemaLabel: this.durable.getSchemaLabel(),
      dbPath: this.durable.dbPath,
    };
  }

  async stage(input: {
    originalFilename: string;
    bytes: Buffer;
    declaredMime?: string;
    allowSyntheticMalwareOverride?: boolean;
    operationKey?: string;
  }): Promise<StagedDocumentRecord> {
    this.staging.expireDue();
    const checksum = createHash('sha256').update(input.bytes).digest('hex');
    const opKey =
      input.operationKey || `stage:${checksum}:${input.originalFilename.toLowerCase()}`;
    const prior = this.durable.getIdempotent(opKey);
    if (prior) {
      const existing =
        this.staging.get(prior.resourceId) || this.durable.getReview(prior.resourceId);
      if (existing) {
        // Skip duplicate malware scan when checksum + prior clean scan present
        if (
          existing.checksumSha256 === checksum &&
          existing.malwareScan &&
          !(existing.malwareScan as MalwareScanResult).blocked
        ) {
          return this.publicView(existing);
        }
        return this.publicView(existing);
      }
    }

    const ext = input.originalFilename.split('.').pop()?.toLowerCase() || '';
    const detectedMime = detectMimeFromBuffer(input.bytes, ext);
    const rec = this.staging.stageFile({
      originalFilename: input.originalFilename,
      bytes: input.bytes,
      declaredMime: input.declaredMime,
      detectedMime,
    });

    const isSynthetic =
      /TEST\s*—\s*(DO NOT CONTACT|SYNTHETIC)/i.test(input.originalFilename) ||
      input.bytes.includes(Buffer.from('TEST — SYNTHETIC')) ||
      input.bytes.includes(Buffer.from('TEST — DO NOT CONTACT')) ||
      Boolean(input.allowSyntheticMalwareOverride);

    const stageCp = this.durable.c2.startCheckpoint({
      reviewId: rec.stagedFileId,
      stage: 'staging',
      correlationId: rec.correlationId,
    });
    this.durable.c2.completeCheckpoint(stageCp.checkpointId, 'completed');

    const clam = resolveClamscanPath(this.env);
    const versions = clam
      ? await getClamavVersions(clam)
      : { scannerVersion: null, definitionVersion: null, definitionDate: null };
    const reuse = this.durable.c2.findReusableMalwareScan({
      reviewId: rec.stagedFileId,
      checksumSha256: rec.checksumSha256,
      clamavVersion: versions.scannerVersion,
      dailyDefinitionVersion: versions.definitionVersion,
    });

    const malwareCp = this.durable.c2.startCheckpoint({
      reviewId: rec.stagedFileId,
      stage: 'malware_scan',
      correlationId: rec.correlationId,
    });

    let scan: MalwareScanResult;
    if (reuse.reusable && reuse.fingerprint) {
      scan = {
        status: 'clean',
        engine: 'clamav',
        scannerVersion: reuse.fingerprint.clamavVersion,
        definitionVersion: reuse.fingerprint.dailyDefinitionVersion,
        definitionDate: reuse.fingerprint.definitionUpdateTimestamp,
        checksumSha256: rec.checksumSha256,
        detail: `Reused prior clean scan (${reuse.reason})`,
        durationMs: 0,
        quarantined: false,
        blocked: false,
        overrideUsed: false,
        overrideReason: null,
      };
      this.durable.c2.completeCheckpoint(malwareCp.checkpointId, 'skipped_reuse', {
        reusableResultRef: reuse.fingerprint.fingerprintId,
      });
    } else {
      scan = await scanFileLocally({
        absolutePath: this.staging.absolutePath(rec),
        checksumSha256: rec.checksumSha256,
        quarantineDir: malwareQuarantineDir(this.staging.getConfig().rootDir),
        env: this.env,
        allowSyntheticOverride: true,
        isSyntheticTestFile: isSynthetic,
      });
      const clean = !scan.blocked && scan.status !== 'unavailable' && scan.status !== 'error';
      this.durable.c2.saveMalwareFingerprint({
        fingerprintId: randomUUID(),
        reviewId: rec.stagedFileId,
        checksumSha256: rec.checksumSha256,
        clamavVersion: scan.scannerVersion,
        dailyDefinitionVersion: scan.definitionVersion,
        mainDefinitionVersion: scan.definitionVersion,
        bytecodeDefinitionVersion: null,
        definitionUpdateTimestamp: scan.definitionDate,
        scanPolicyVersion: SCAN_POLICY_VERSION,
        scanResult: scan.status,
        scanTimestamp: new Date().toISOString(),
        clean,
        reusableUntil: null,
      });
      this.durable.c2.completeCheckpoint(
        malwareCp.checkpointId,
        scan.blocked ? 'failed' : 'completed',
        { failureReason: scan.blocked ? scan.detail : undefined },
      );
    }

    rec.malwareScan = scan;
    rec.malwareScanStatus = scan.status;
    rec.malwareScanNote = scan.detail;
    if (scan.blocked) {
      rec.status = 'MalwareBlocked';
      rec.errorDetail = scan.detail;
    }
    rec.updatedAt = new Date().toISOString();
    this.persist(rec, { actor: 'LocalAI' });
    this.durable.putIdempotent({
      operationKey: opKey,
      operation: 'staging',
      resourceId: rec.stagedFileId,
      correlationId: rec.correlationId,
      result: { stagedFileId: rec.stagedFileId, checksum },
    });
    return this.publicView(rec);
  }

  cancel(id: string) {
    const c = this.activeAbort.get(id);
    if (c) c.abort();
    return { cancelled: Boolean(c) };
  }

  /** Deterministic extract + redaction preview. Does not call Ollama. */
  async process(opts: {
    stagedFileId: string;
    clientLabel?: string;
    projectLabel?: string | null;
    forceOcr?: boolean;
    operationKey?: string;
  }): Promise<StagedDocumentRecord> {
    const rec = this.require(opts.stagedFileId);
    if (rec.status === 'Purged' || rec.status === 'Expired') {
      throw Object.assign(new Error(`Cannot process ${rec.status} file`), {
        status: 409,
        code: 'invalid_status',
      });
    }
    const scan = rec.malwareScan as MalwareScanResult | null;
    if (rec.status === 'MalwareBlocked' || scan?.blocked) {
      throw Object.assign(new Error('Malware scan blocked extraction'), {
        status: 403,
        code: 'malware_blocked',
      });
    }
    if (scan?.status === 'unavailable') {
      throw Object.assign(new Error(scan.detail), {
        status: 503,
        code: 'malware_scanner_unavailable',
      });
    }

    const extractKey =
      opts.operationKey ||
      `extract:${rec.stagedFileId}:${rec.checksumSha256}:ocr=${opts.forceOcr ? 1 : 0}`;
    if (
      !opts.forceOcr &&
      this.durable.getIdempotent(extractKey) &&
      rec.extraction &&
      (rec.status === 'AwaitingRedactionApproval' ||
        rec.status === 'ReadyForReview' ||
        rec.status === 'ReviewComplete')
    ) {
      return this.publicView(rec, true);
    }

    const extractReuse = this.durable.c2.findReusableExtraction({
      sourceChecksum: rec.checksumSha256,
      extractionLibraryVersion: 'atlas-local-extract-1',
    });
    if (!opts.forceOcr && extractReuse.reusable && rec.extraction && rec.reviewPackage) {
      const cp = this.durable.c2.startCheckpoint({
        reviewId: rec.stagedFileId,
        stage: 'extraction',
        correlationId: rec.correlationId,
      });
      this.durable.c2.completeCheckpoint(cp.checkpointId, 'skipped_reuse', {
        reusableResultRef: extractReuse.fingerprint?.fingerprintId,
      });
      return this.publicView(rec, true);
    }

    const controller = new AbortController();
    this.activeAbort.set(rec.stagedFileId, controller);
    rec.status = 'Extracting';
    rec.updatedAt = new Date().toISOString();
    this.persist(rec, {
      clientLabel: opts.clientLabel,
      projectLabel: opts.projectLabel,
      actor: 'LocalAI',
    });

    try {
      const bytes = this.staging.readBytes(rec);
      const abs = this.staging.absolutePath(rec);
      if (['png', 'jpg', 'jpeg', 'pdf'].includes(String(rec.extension))) {
        rec.status = 'OcrInProgress';
        this.persist(rec, { clientLabel: opts.clientLabel, projectLabel: opts.projectLabel });
      }

      const extraction = await extractDocument({
        extension: String(rec.extension),
        bytes,
        absolutePath: abs,
        extractOpts: {
          forceOcr: opts.forceOcr,
          signal: controller.signal,
          ocrTimeoutMs: 180_000,
          maxOcrPages: 40,
        },
      });
      this.staging.updateExtraction(rec.stagedFileId, extraction, 'Extracting');
      this.durable.upsertReviewFromStaged(this.require(rec.stagedFileId), {
        clientLabel: opts.clientLabel,
        projectLabel: opts.projectLabel,
      });

      const rawText = combinedExtractedText(extraction);
      const bannerPrefixed = rawText.includes('TEST —')
        ? rawText
        : `TEST — SYNTHETIC DOCUMENT\n${rawText}`;
      const injection = scanForInjection(bannerPrefixed);
      const redaction = redactText(bannerPrefixed, { maskFinancialValues: true });
      const classification = classifyDocumentDraft(redaction.redactedText);
      const fields = extractStructuredFieldsDraft(redaction.redactedText, extraction.pages);
      const lists = listDatesAmountsDeadlinesObligations(redaction.redactedText);
      const clientLabel = opts.clientLabel || 'Unknown Client';
      const docDate = lists.dates[0] || null;
      const naming = recommendFilename({
        originalFilename: rec.originalFilename,
        clientLabel,
        documentType: classification.proposedType,
        documentDate: docDate,
        project: opts.projectLabel,
      });
      const folder = recommendFolder({
        clientLabel,
        documentType: classification.proposedType,
        project: opts.projectLabel,
      });

      const prior = this.staging
        .list()
        .filter((f) => f.stagedFileId !== rec.stagedFileId && f.status !== 'Purged')
        .map((f) => ({
          stagedFileId: f.stagedFileId,
          checksumSha256: f.checksumSha256,
          originalFilename: f.originalFilename,
          textSample: f.extraction ? combinedExtractedText(f.extraction).slice(0, 800) : '',
          pageCount: f.extraction?.pageCount ?? null,
        }));
      const duplicate = detectDuplicateDraft({
        checksum: rec.checksumSha256,
        originalFilename: rec.originalFilename,
        text: redaction.redactedText,
        pageCount: extraction.pageCount,
        prior,
      });
      if (duplicate.status === 'exact_duplicate' || duplicate.status === 'probable_duplicate') {
        naming.collisionOrDuplicateWarning = `Duplicate status: ${duplicate.status}`;
      }

      const deep = isDeepDocumentType(classification.proposedType);
      const timeProtection = buildTimeProtectionOutput({
        requiresMannyApproval: true,
        confidence: classification.confidence,
        workValueTier: deep ? 'Tier 1 — Manny Only' : 'Tier 3 — Administrative Delegate',
        estimatedReviewMinutes: deep ? 15 : 6,
        estimatedSavedMinutes: deep ? 25 : 12,
      });

      const pack: DocumentReviewPackage = {
        schemaVersion: DOCUMENT_STAGING_SCHEMA_VERSION,
        stagedFileId: rec.stagedFileId,
        correlationId: rec.correlationId,
        fileMetadata: {
          originalFilename: rec.originalFilename,
          safeFilename: rec.safeFilename,
          extension: String(rec.extension),
          declaredMime: rec.declaredMime,
          detectedMime: rec.detectedMime,
          sizeBytes: rec.sizeBytes,
          checksumSha256: rec.checksumSha256,
          uploadedAt: rec.createdAt,
        },
        extraction,
        classification,
        structuredFields: fields,
        dates: lists.dates,
        amounts: lists.amounts,
        deadlines: lists.deadlines,
        obligations: lists.obligations,
        signatureReview: {
          signaturesPresent: /\b(signature|signed by|\/s\/)\b/i.test(redaction.redactedText),
          signaturesMissing:
            /signature/i.test(redaction.redactedText) && !/signed\b/i.test(redaction.redactedText),
          initialsPresent: /\binitials?\b/i.test(redaction.redactedText),
          initialsMissing: false,
          notes: ['Signature review is a draft heuristic — not authoritative'],
        },
        missingPageReview: {
          indicators: /\b(missing page|page \d+ of \d+)\b/i.test(redaction.redactedText)
            ? ['Missing-page language detected']
            : [],
          pageCount: extraction.pageCount,
        },
        duplicate,
        naming,
        folder,
        risks: [
          ...(injection.suspicious ? ['Prompt-injection patterns flagged in document text'] : []),
          ...(extraction.ocr ? ['Contains OCR-derived text — not guaranteed accurate'] : []),
          ...(duplicate.status.includes('duplicate') ? [`Duplicate: ${duplicate.status}`] : []),
        ],
        missingInformation: [
          ...naming.missingNamingElements.map((m) => `naming:${m}`),
          ...folder.missingContext.map((m) => `folder:${m}`),
        ],
        recommendedNextAction:
          'Approve redacted content to run Fast/Deep Ollama enrichment — approval does not move files',
        workValueTier: timeProtection.classification.includes('Manny')
          ? 'Tier 1 — Manny Only'
          : 'Tier 3 — Administrative Delegate',
        estimatedMannyReviewMinutes: timeProtection.estimatedMannyReviewMinutes,
        estimatedMannyTimeSavedMinutes: timeProtection.estimatedMannyTimeSavedMinutes,
        decisionPackage: null,
        injectionWarnings: injection.warnings,
        redactionSummary: {
          policyVersion: redaction.policyVersion,
          fieldsRedacted: redaction.fieldsRedacted,
          redactionCount: redaction.redactionCount,
          manualReviewRequired: redaction.manualReviewRequired,
          blocked: redaction.blocked,
        },
        modelRouting: {
          requestedProfile: deep ? 'Deep Analysis Model' : 'Fast Operations Model',
          actualModel: 'pending_enrichment',
          usedFallback: false,
          fallbackReason: null,
        },
        enrichment: null,
        enrichmentStatus: 'awaiting_redaction',
        deterministicSnapshot: {
          documentType: classification.proposedType,
          documentTypeConfidence: classification.confidence,
          alternatives: classification.alternatives,
          proposedFilename: naming.proposedFilename,
          proposedFolder: folder.proposedFolderPath,
          duplicateStatus: duplicate.status,
          dates: lists.dates,
          amounts: lists.amounts,
          obligations: lists.obligations,
          deadlines: lists.deadlines,
          facts: [
            `filename:${rec.originalFilename}`,
            `checksum:${rec.checksumSha256.slice(0, 16)}`,
            `pages:${extraction.pageCount}`,
          ],
        },
        conflicts: [],
        redactedContentPreview: redaction.redactedText.slice(0, 4000),
        draftOnly: true,
        noFileMovement: true,
        noRecordWrites: true,
        noExternalCommunications: true,
        syntheticBanner: 'TEST — SYNTHETIC DOCUMENT',
      };

      const latest = this.require(opts.stagedFileId);
      latest.reviewPackage = pack;
      latest.redactedContent = redaction.redactedText;
      latest.redactionDecision = 'Pending';
      latest.status = 'AwaitingRedactionApproval';
      latest.updatedAt = new Date().toISOString();
      this.persist(latest, {
        clientLabel: opts.clientLabel,
        projectLabel: opts.projectLabel,
        actor: 'LocalAI',
      });
      this.durable.putIdempotent({
        operationKey: extractKey,
        operation: 'extraction',
        resourceId: latest.stagedFileId,
        correlationId: latest.correlationId,
        result: { status: latest.status, checksum: latest.checksumSha256 },
      });
      const conf = latest.extraction?.ocr?.averageConfidence ?? null;
      this.durable.c2.saveExtractionFingerprint({
        fingerprintId: randomUUID(),
        reviewId: latest.stagedFileId,
        sourceChecksum: latest.checksumSha256,
        extractionLibrary: 'atlas-local-extract',
        extractionLibraryVersion: 'atlas-local-extract-1',
        extractionPolicyVersion: EXTRACTION_POLICY_VERSION,
        ocrEngine: latest.extraction?.ocr ? 'tesseract' : null,
        ocrEngineVersion: latest.extraction?.ocr?.version || null,
        ocrPreprocessingVersion: OCR_PREPROCESS_VERSION,
        pageCount: latest.extraction?.pageCount ?? null,
        extractionTimestamp: new Date().toISOString(),
        confidenceSummary: conf,
        outcome:
          conf != null && conf < 0.4
            ? 'low_confidence'
            : String(latest.status) === 'Failed'
              ? 'failed'
              : 'ok',
      });
      const extractCp = this.durable.c2.startCheckpoint({
        reviewId: latest.stagedFileId,
        stage: 'extraction',
        correlationId: latest.correlationId,
      });
      this.durable.c2.completeCheckpoint(extractCp.checkpointId, 'completed', {
        reusableResultRef: latest.checksumSha256,
      });
      const redCp = this.durable.c2.startCheckpoint({
        reviewId: latest.stagedFileId,
        stage: 'redaction',
        correlationId: latest.correlationId,
      });
      this.durable.c2.completeCheckpoint(redCp.checkpointId, 'completed');
      return this.publicView(latest, true);
    } catch (err) {
      const latest = this.require(opts.stagedFileId);
      latest.status = 'Failed';
      latest.errorDetail = err instanceof Error ? err.message : String(err);
      latest.updatedAt = new Date().toISOString();
      this.persist(latest);
      throw err;
    } finally {
      this.activeAbort.delete(opts.stagedFileId);
    }
  }

  decideRedaction(
    stagedFileId: string,
    decision: 'Approve Redacted Content' | 'Edit Redactions' | 'Cancel Enrichment',
    editedRedactedContent?: string,
  ): StagedDocumentRecord {
    const rec = this.require(stagedFileId);
    if (rec.status !== 'AwaitingRedactionApproval' && decision !== 'Cancel Enrichment') {
      throw Object.assign(new Error('Not awaiting redaction approval'), {
        status: 409,
        code: 'invalid_status',
      });
    }
    if (decision === 'Cancel Enrichment') {
      rec.redactionDecision = decision;
      rec.status = 'ReviewComplete';
      rec.updatedAt = new Date().toISOString();
      this.persist(rec);
      return this.publicView(rec, true);
    }
    if (decision === 'Edit Redactions' && editedRedactedContent != null) {
      rec.redactedContent = editedRedactedContent;
      if (rec.reviewPackage) {
        rec.reviewPackage.redactedContentPreview = editedRedactedContent.slice(0, 4000);
      }
      rec.redactionDecision = 'Pending';
      rec.updatedAt = new Date().toISOString();
      this.persist(rec);
      return this.publicView(rec, true);
    }
    rec.redactionDecision = 'Approve Redacted Content';
    rec.status = 'Enriching';
    rec.updatedAt = new Date().toISOString();
    this.persist(rec);
    return this.publicView(rec, true);
  }

  applyEnrichment(opts: {
    stagedFileId: string;
    jobId: string;
    modelRouting: DocumentReviewPackage['modelRouting'];
    modelOutput: DocumentEnrichmentOutput | null;
    enrichmentError?: string | null;
  }): StagedDocumentRecord {
    const rec = this.require(opts.stagedFileId);
    const pack = rec.reviewPackage;
    if (!pack || !pack.deterministicSnapshot) {
      throw Object.assign(new Error('Deterministic package missing'), { status: 409 });
    }
    const snap = pack.deterministicSnapshot as {
      documentType: string;
      documentTypeConfidence: number;
      alternatives: Array<{ type: string; confidence: number }>;
      proposedFilename: string;
      proposedFolder: string;
      duplicateStatus: string;
      dates: string[];
      amounts: string[];
      obligations: string[];
      deadlines: string[];
      facts: string[];
    };
    const merged = mergeDeterministicAndModel({
      reviewId: rec.stagedFileId,
      jobId: opts.jobId,
      deterministic: snap,
      model: opts.modelOutput,
    });
    pack.enrichment = merged;
    // Deterministic merge always yields a schema-valid draft package.
    // Model failures are recorded as warnings — they do not void the draft schema.
    pack.enrichmentStatus = 'complete';
    pack.conflicts = merged.conflicts;
    pack.modelRouting = opts.modelRouting;
    pack.recommendedNextAction = merged.recommended_next_action;
    pack.decisionPackage = {
      decision: `Review ${merged.document_type} enrichment draft`,
      recommendation: merged.recommended_next_action,
      why: merged.facts.slice(0, 5).map((f) => f.text),
      alternatives: ['Return for revision', 'Archive'],
      risks: merged.risks,
      deadline: null,
      requiredReviewTimeMinutes: merged.estimated_manny_review_minutes,
      sourceRecords: [{ type: 'StagedDocument', id: rec.stagedFileId, title: rec.originalFilename }],
      confidence: merged.confidence,
      missingInformation: merged.missing_information,
      banner: SYNTHETIC_AI_OUTPUT_BANNER,
    };
    if (opts.enrichmentError) {
      pack.risks = [...pack.risks, `Enrichment model error: ${opts.enrichmentError}`];
      merged.warnings = [
        ...merged.warnings,
        `model_enrichment_failed: ${opts.enrichmentError}`,
      ];
      pack.enrichment = merged;
      if (opts.modelRouting) {
        pack.modelRouting = {
          ...opts.modelRouting,
          usedFallback: opts.modelRouting.usedFallback,
          fallbackReason:
            opts.modelRouting.fallbackReason || `model_error: ${opts.enrichmentError}`,
        };
      }
    }
    pack.naming = { ...pack.naming, fileRenamed: false };
    pack.folder = { ...pack.folder, fileMoved: false };
    rec.reviewPackage = pack;
    rec.linkedAiJobId = opts.jobId;
    rec.status = 'ReadyForReview';
    rec.updatedAt = new Date().toISOString();
    this.persist(rec);
    this.durable.putIdempotent({
      operationKey: `enrich:${opts.stagedFileId}:${opts.jobId}`,
      operation: 'ai_enrichment',
      resourceId: opts.stagedFileId,
      correlationId: rec.correlationId,
      result: { jobId: opts.jobId, status: rec.status },
    });
    return this.publicView(rec, true);
  }

  compareVersions(leftId: string, rightId: string): DocumentVersionComparison {
    const left = this.require(leftId);
    const right = this.require(rightId);
    const lt = left.extraction ? combinedExtractedText(left.extraction) : '';
    const rt = right.extraction ? combinedExtractedText(right.extraction) : '';
    const leftDates = listDatesAmountsDeadlinesObligations(lt);
    const rightDates = listDatesAmountsDeadlinesObligations(rt);
    const amountsChanged = [
      ...leftDates.amounts.filter((a) => !rightDates.amounts.includes(a)),
      ...rightDates.amounts.filter((a) => !leftDates.amounts.includes(a)),
    ];
    const datesChanged = [
      ...leftDates.dates.filter((a) => !rightDates.dates.includes(a)),
      ...rightDates.dates.filter((a) => !leftDates.dates.includes(a)),
    ];
    const sameFamily =
      left.checksumSha256 === right.checksumSha256 ||
      normalize(left.originalFilename) === normalize(right.originalFilename) ||
      similar(lt.slice(0, 400), rt.slice(0, 400));
    return {
      schemaVersion: '1.0.0-phase4b2',
      leftStagedFileId: leftId,
      rightStagedFileId: rightId,
      likelySameDocumentFamily: sameFamily,
      versionDates: [...new Set([...leftDates.dates, ...rightDates.dates])],
      sectionsAdded: rightDates.obligations.filter((o) => !leftDates.obligations.includes(o)),
      sectionsRemoved: leftDates.obligations.filter((o) => !rightDates.obligations.includes(o)),
      amountsChanged,
      datesChanged,
      partiesChanged: [],
      obligationsChanged: [
        ...leftDates.obligations.filter((o) => !rightDates.obligations.includes(o)),
        ...rightDates.obligations.filter((o) => !leftDates.obligations.includes(o)),
      ],
      signaturesChanged: [],
      materialRiskChanges: amountsChanged.length
        ? ['Amount differences detected — draft only']
        : [],
      proposedCurrentVersion: right.originalFilename,
      confidence: sameFamily ? 0.7 : 0.35,
      sourceReferences: [
        { stagedFileId: leftId, note: left.originalFilename },
        { stagedFileId: rightId, note: right.originalFilename },
      ],
      draftOnly: true,
      filesDeleted: false,
    };
  }

  createMultiDocumentPack(opts: {
    stagedFileIds: string[];
    clientLabel: string;
    title?: string;
    projectLabel?: string | null;
    purpose?: string | null;
    sensitivity?: string;
    expectedChecklist?: string[];
  }): MultiDocumentReviewPack {
    if (opts.stagedFileIds.length < 2) {
      throw Object.assign(new Error('Select at least two files'), { status: 400 });
    }
    if (opts.stagedFileIds.length > DEFAULT_MULTI_DOC_MAX_FILES) {
      throw Object.assign(new Error(`Max ${DEFAULT_MULTI_DOC_MAX_FILES} files`), {
        status: 400,
        code: 'too_many_files',
      });
    }
    const docs = opts.stagedFileIds.map((id) => this.require(id));
    const aggregate = docs.reduce((s, d) => s + d.sizeBytes, 0);
    if (aggregate > DEFAULT_MULTI_DOC_MAX_BYTES) {
      throw Object.assign(new Error('Aggregate size limit exceeded'), {
        status: 400,
        code: 'aggregate_too_large',
      });
    }
    const checksums = new Map<string, string[]>();
    for (const d of docs) {
      const list = checksums.get(d.checksumSha256) || [];
      list.push(d.stagedFileId);
      checksums.set(d.checksumSha256, list);
    }
    const duplicateNotes = [...checksums.entries()]
      .filter(([, ids]) => ids.length > 1)
      .map(([c, ids]) => `exact_duplicate checksum ${c.slice(0, 12)}… → ${ids.join(',')}`);

    const now = new Date().toISOString();
    const pack: MultiDocumentReviewPack = {
      packId: randomUUID(),
      stagedFileIds: opts.stagedFileIds,
      createdAt: now,
      clientLabel: opts.clientLabel,
      relationshipAnalysis: [
        'Manny-selected multi-document pack — draft relationship analysis only',
      ],
      crossDocumentConflicts: [],
      crossDocumentMissingInformation: [],
      duplicateNotes,
      sourceCitations: docs.map((d) => ({
        stagedFileId: d.stagedFileId,
        note: d.originalFilename,
      })),
      draftOnly: true,
      maxFiles: DEFAULT_MULTI_DOC_MAX_FILES,
      aggregateSizeBytes: aggregate,
    };

    if (docs.length >= 2 && docs[0].reviewPackage && docs[1].reviewPackage) {
      const a = docs[0].reviewPackage.amounts;
      const b = docs[1].reviewPackage.amounts;
      for (const x of a) {
        if (b.length && !b.includes(x)) {
          pack.crossDocumentConflicts.push(`Amount ${x} present in ${docs[0].originalFilename} only`);
        }
      }
    }
    this.multiPacks.set(pack.packId, pack);
    const durablePack = this.toDurablePack(pack, {
      title: opts.title || `Pack ${opts.clientLabel}`,
      projectLabel: opts.projectLabel ?? null,
      purpose: opts.purpose ?? null,
      sensitivity: opts.sensitivity || 'Confidential',
    });
    this.durable.upsertPack(durablePack);
    const members: PackMemberMeta[] = opts.stagedFileIds.map((id, i) => ({
      reviewId: id,
      stagedFileId: id,
      orderIndex: i,
      relationshipType: (i === 0 ? 'primary document' : 'supporting evidence') as DocumentRelationshipType,
      versionLabel: null,
      amendmentLabel: null,
      designation: (i === 0 ? 'primary' : 'supporting') as PackMemberMeta['designation'],
      expectedChecklistItem: null,
    }));
    this.durable.c2.setPackMembers(pack.packId, members);
    if (opts.expectedChecklist?.length) {
      this.durable.c2.setExpectedChecklist(pack.packId, opts.expectedChecklist);
    }
    this.analyzePack(pack.packId);
    this.durable.appendAudit({
      correlationId: pack.packId,
      reviewId: null,
      packId: pack.packId,
      at: now,
      actor: 'Manny',
      action: 'multi_document_pack_created',
      detail: `files=${pack.stagedFileIds.length}; draftOnly`,
      fromStatus: null,
      toStatus: 'Open',
    });
    return pack;
  }

  updateMultiDocumentPack(
    packId: string,
    opts: { addStagedFileIds?: string[]; removeStagedFileIds?: string[]; title?: string },
  ): MultiDocumentReviewPack {
    const pack = this.getMultiDocumentPack(packId);
    let ids = [...pack.stagedFileIds];
    for (const rem of opts.removeStagedFileIds || []) {
      ids = ids.filter((x) => x !== rem);
    }
    for (const add of opts.addStagedFileIds || []) {
      this.require(add);
      if (!ids.includes(add)) ids.push(add);
    }
    if (ids.length > DEFAULT_MULTI_DOC_MAX_FILES) {
      throw Object.assign(new Error(`Max ${DEFAULT_MULTI_DOC_MAX_FILES} files`), { status: 400 });
    }
    if (ids.length < 1) {
      throw Object.assign(new Error('Pack must retain at least one file'), { status: 400 });
    }
    const docs = ids.map((id) => this.require(id));
    pack.stagedFileIds = ids;
    pack.aggregateSizeBytes = docs.reduce((s, d) => s + d.sizeBytes, 0);
    pack.sourceCitations = docs.map((d) => ({
      stagedFileId: d.stagedFileId,
      note: d.originalFilename,
    }));
    this.multiPacks.set(pack.packId, pack);
    const existing = this.durable.getPack(packId);
    this.durable.upsertPack(
      this.toDurablePack(pack, {
        title: opts.title || existing?.title || `Pack ${pack.clientLabel}`,
        projectLabel: existing?.projectLabel ?? null,
        purpose: existing?.purpose ?? null,
        sensitivity: existing?.sensitivity || 'Confidential',
      }),
    );
    return pack;
  }

  listMultiDocumentPacks() {
    return this.durable.listPacks().map((p) => this.fromDurablePack(p));
  }

  decideMultiDocumentPack(packId: string, decision: string, notes?: string) {
    const pack = this.getMultiDocumentPack(packId);
    const durable = this.durable.getPack(packId);
    if (!durable) throw Object.assign(new Error('Pack not found'), { status: 404 });
    durable.mannyDecision = decision;
    durable.mannyDecisionAt = new Date().toISOString();
    durable.status = 'Decided';
    durable.updatedAt = durable.mannyDecisionAt;
    durable.packDecisionPackage = {
      decision,
      notes: notes || null,
      draftOnly: true,
      fileMoved: false,
      fileRenamed: false,
      authoritativeWrite: false,
      externalCommunication: false,
    };
    this.durable.upsertPack(durable);
    this.durable.appendAudit({
      correlationId: packId,
      reviewId: null,
      packId,
      at: durable.mannyDecisionAt,
      actor: 'Manny',
      action: 'pack_decision',
      detail: `decision=${decision}; notes=${notes || ''}; no side effects`,
      fromStatus: 'Open',
      toStatus: 'Decided',
    });
    this.multiPacks.set(packId, this.fromDurablePack(durable));
    return this.fromDurablePack(durable);
  }

  getMultiDocumentPack(packId: string) {
    const fromMem = this.multiPacks.get(packId);
    if (fromMem) return fromMem;
    const fromDb = this.durable.getPack(packId);
    if (!fromDb) throw Object.assign(new Error('Multi-doc pack not found'), { status: 404 });
    const pack = this.fromDurablePack(fromDb);
    this.multiPacks.set(packId, pack);
    return pack;
  }

  decide(
    stagedFileId: string,
    decision: DocumentReviewDecision,
    corrections?: Record<string, unknown>,
    operationKey?: string,
  ): StagedDocumentRecord {
    const decideKey = operationKey || `decision:${stagedFileId}:${decision}:${JSON.stringify(corrections || {})}`;
    const prior = this.durable.getIdempotent(decideKey);
    if (prior) {
      const existing = this.require(prior.resourceId);
      if (existing.mannyDecision === decision) return this.publicView(existing, true);
    }

    const rec = this.require(stagedFileId);
    if (
      !rec.reviewPackage &&
      decision !== 'Purge Staged File' &&
      decision !== 'Approve Redacted Content' &&
      decision !== 'Edit Redactions' &&
      decision !== 'Cancel Enrichment'
    ) {
      throw Object.assign(new Error('Review package not ready'), {
        status: 409,
        code: 'not_ready',
      });
    }

    if (decision === 'Purge Staged File') {
      return this.purge(stagedFileId, 'Manny purge');
    }
    if (
      decision === 'Approve Redacted Content' ||
      decision === 'Edit Redactions' ||
      decision === 'Cancel Enrichment'
    ) {
      const out = this.decideRedaction(
        stagedFileId,
        decision,
        corrections?.redactedContent ? String(corrections.redactedContent) : undefined,
      );
      this.recordDecision(stagedFileId, decision, corrections?.notes ? String(corrections.notes) : null);
      return out;
    }

    const pack = { ...rec.reviewPackage! };
    const log = [...((rec.correctionLog as FieldCorrectionRecord[]) || [])];
    const pushCorrection = (field: string, original: unknown, corrected: unknown) => {
      const corr: DurableCorrectionRecord = {
        correctionId: randomUUID(),
        reviewId: stagedFileId,
        field,
        originalValue: original,
        correctedValue: corrected,
        correctionType: decision,
        correctedBy: 'Manny',
        correctedAt: new Date().toISOString(),
        reason: String(corrections?.reason || 'Manny correction'),
        sourceReference: corrections?.sourceReference
          ? String(corrections.sourceReference)
          : null,
        origin: 'manny',
        ruleImprovementCandidate: Boolean(corrections?.informFutureDeterministicRules),
        active: true,
        supersededCorrectionId: null,
      };
      this.durable.addCorrection(corr);
      log.push({
        field,
        originalValue: original,
        correctedValue: corrected,
        correctedBy: 'Manny',
        correctedAt: corr.correctedAt,
        reason: corr.reason,
        informFutureDeterministicRules: corr.ruleImprovementCandidate,
      });
    };

    if (decision === 'Correct Classification' && corrections?.proposedType) {
      pushCorrection('classification', pack.classification.proposedType, corrections.proposedType);
      pack.classification = {
        ...pack.classification,
        proposedType: String(corrections.proposedType) as never,
        confidence: 1,
        evidence: [...pack.classification.evidence, 'Manny corrected classification'],
      };
    }
    if (decision === 'Correct Proposed Filename' && corrections?.proposedFilename) {
      pushCorrection('proposedFilename', pack.naming.proposedFilename, corrections.proposedFilename);
      pack.naming = {
        ...pack.naming,
        proposedFilename: String(corrections.proposedFilename),
        reason: `${pack.naming.reason}; Manny corrected`,
        fileRenamed: false,
      };
    }
    if (decision === 'Correct Proposed Folder' && corrections?.proposedFolderPath) {
      pushCorrection('proposedFolder', pack.folder.proposedFolderPath, corrections.proposedFolderPath);
      pack.folder = {
        ...pack.folder,
        proposedFolderPath: String(corrections.proposedFolderPath),
        reason: `${pack.folder.reason}; Manny corrected`,
        fileMoved: false,
      };
    }
    if (decision === 'Correct Extracted Fields' && corrections?.fields) {
      pushCorrection('structuredFields', pack.structuredFields, corrections.fields);
      pack.structuredFields = corrections.fields as never;
    }
    if (decision === 'Mark Duplicate') {
      pushCorrection('duplicate', pack.duplicate.status, 'probable_duplicate');
      pack.duplicate = {
        ...pack.duplicate,
        status: 'probable_duplicate',
        reasons: [...pack.duplicate.reasons, 'Manny marked duplicate'],
        fileDeleted: false,
      };
    }
    if (decision === 'Mark Unique') {
      pushCorrection('duplicate', pack.duplicate.status, 'unique');
      pack.duplicate = {
        status: 'unique',
        matchedStagedFileId: null,
        matchedChecksum: null,
        reasons: ['Manny marked unique'],
        fileDeleted: false,
      };
    }

    pack.naming = { ...pack.naming, fileRenamed: false };
    pack.folder = { ...pack.folder, fileMoved: false };
    pack.noFileMovement = true;
    pack.noRecordWrites = true;
    pack.noExternalCommunications = true;
    pack.draftOnly = true;

    rec.reviewPackage = pack;
    rec.correctionLog = log;
    rec.mannyDecision = decision;
    rec.mannyDecisionAt = new Date().toISOString();
    rec.mannyCorrections = corrections || null;
    rec.status =
      decision === 'Archive Review Result' ||
      decision === 'Approve Draft' ||
      decision === 'Reject Draft' ||
      decision === 'Eliminate' ||
      decision === 'No Action'
        ? 'ReviewComplete'
        : 'ReadyForReview';
    if (decision === 'Return for Revision') {
      rec.status = 'ReadyForReview';
    }
    if (decision === 'Archive Review Result') {
      // durable maps ReviewComplete → Approved Draft; archive via decision audit
    }
    rec.updatedAt = new Date().toISOString();
    this.persist(rec, { actor: 'Manny' });
    this.recordDecision(stagedFileId, decision, corrections?.notes ? String(corrections.notes) : null);
    this.durable.putIdempotent({
      operationKey: decideKey,
      operation: 'manny_decision',
      resourceId: stagedFileId,
      correlationId: rec.correlationId,
      result: { decision },
    });
    return this.publicView(rec, true);
  }

  private recordDecision(reviewId: string, decision: string, notes: string | null) {
    const d: DurableDecisionRecord = {
      decisionId: randomUUID(),
      reviewId,
      decision,
      decidedBy: 'Manny',
      decidedAt: new Date().toISOString(),
      notes,
      fileMoved: false,
      fileRenamed: false,
      authoritativeWrite: false,
      externalCommunication: false,
    };
    this.durable.addDecision(d);
    this.durable.appendAudit({
      correlationId: this.require(reviewId).correlationId,
      reviewId,
      packId: null,
      at: d.decidedAt,
      actor: 'Manny',
      action: 'manny_decision',
      detail: `decision=${decision}; fileMoved=false; writes=false; external=false`,
      fromStatus: null,
      toStatus: null,
    });
  }

  listCorrections(reviewId: string) {
    return this.durable.listCorrections(reviewId);
  }

  listDecisions(reviewId: string) {
    return this.durable.listDecisions(reviewId);
  }

  listAudit(reviewId?: string) {
    return this.durable.listAudit(reviewId);
  }

  listInterruptedJobs() {
    return this.durable.listInterrupted();
  }

  resumeInterruptedJob(id: string) {
    const jobs = this.durable.listInterrupted();
    const job = jobs.find((j) => String(j.id) === id);
    this.durable.resolveInterrupted(id, 'resumed');
    const reviewId = job ? String(job.review_id) : null;
    const eligibility = reviewId
      ? this.durable.c2.resumeEligibility(reviewId, job ? String(job.operation) : null)
      : null;
    this.durable.appendAudit({
      correlationId: id,
      reviewId,
      packId: null,
      at: new Date().toISOString(),
      actor: 'Manny',
      action: 'interrupted_job_resumed',
      detail: 'Manual resume marked; no automatic reprocess — use resumeReviewFromCheckpoint',
      fromStatus: 'interrupted',
      toStatus: 'resumed',
    });
    return { id, status: 'resumed', autoReprocessed: false, eligibility };
  }

  cancelInterruptedJob(id: string) {
    this.durable.resolveInterrupted(id, 'cancelled');
    return { id, status: 'cancelled' };
  }

  listCheckpoints(reviewId: string) {
    return this.durable.c2.listCheckpoints(reviewId);
  }

  resumeEligibility(reviewId: string) {
    const interrupted = this.durable
      .listInterrupted()
      .find((j) => String(j.review_id) === reviewId && String(j.status) === 'interrupted');
    return this.durable.c2.resumeEligibility(
      reviewId,
      interrupted ? String(interrupted.operation) : null,
    );
  }

  /**
   * Manual resume from safe checkpoint — reuses fingerprints; does not auto-run AI.
   * Manny must still approve redaction / trigger enrichment as needed.
   */
  async resumeReviewFromCheckpoint(reviewId: string) {
    const eligibility = this.resumeEligibility(reviewId);
    if (!eligibility.canResume) {
      throw Object.assign(new Error('Not eligible for resume'), {
        status: 409,
        code: 'not_resume_eligible',
      });
    }
    const rec = this.require(reviewId);
    // If extraction incomplete, run process (idempotent / fingerprint-aware)
    if (eligibility.stagesRequiringRerun.includes('extraction') || !rec.extraction) {
      return this.process({ stagedFileId: reviewId });
    }
    return this.publicView(rec, true);
  }

  async restartReviewFromBeginning(reviewId: string) {
    const rec = this.require(reviewId);
    this.durable.c2.startCheckpoint({
      reviewId,
      stage: 'staging',
      correlationId: rec.correlationId,
    });
    // Force re-extract by using a unique operation key
    return this.process({
      stagedFileId: reviewId,
      forceOcr: true,
      operationKey: `restart:${reviewId}:${Date.now()}`,
    });
  }

  archiveInterruptedJob(id: string) {
    this.durable.resolveInterrupted(id, 'cancelled');
    this.durable.appendAudit({
      correlationId: id,
      reviewId: null,
      packId: null,
      at: new Date().toISOString(),
      actor: 'Manny',
      action: 'interrupted_job_archived',
      detail: 'Archived interrupted job; prior attempts preserved in checkpoints',
      fromStatus: 'interrupted',
      toStatus: 'archived',
    });
    return { id, status: 'archived' };
  }

  retentionPreview() {
    return this.durable.retentionPreview();
  }

  listRetentionPolicies() {
    return this.durable.c2.listRetentionPolicies();
  }

  createRetentionBatch(notes?: string) {
    const preview = this.retentionPreview();
    return this.durable.c2.createRetentionBatch(
      preview.map((p) => p.reviewId),
      preview,
      notes,
    );
  }

  approveRetentionBatch(batchId: string, opts?: { execute?: boolean; authorized?: boolean }) {
    if (!opts?.authorized) {
      throw Object.assign(new Error('Retention batch approval requires authorization'), {
        status: 403,
        code: 'retention_unauthorized',
      });
    }
    const batch = this.durable.c2.approveRetentionBatch(batchId);
    if (opts.execute) {
      for (const id of batch.candidateReviewIds) {
        if (this.durable.c2.isHeld(id)) continue;
        try {
          this.purge(id, `Retention batch ${batchId}`);
        } catch {
          /* continue */
        }
      }
      this.durable.c2.markRetentionBatchExecuted(batchId);
      return this.durable.c2.getRetentionBatch(batchId);
    }
    return batch;
  }

  listRetentionBatches() {
    return this.durable.c2.listRetentionBatches();
  }

  createHold(opts: {
    reviewId?: string | null;
    packId?: string | null;
    holdType: HoldType;
    reason: string;
    expiresAt?: string | null;
  }) {
    return this.durable.c2.createHold(opts);
  }

  releaseHold(holdId: string) {
    return this.durable.c2.releaseHold(holdId);
  }

  listHolds(activeOnly = true) {
    return this.durable.c2.listHolds(activeOnly);
  }

  purge(stagedFileId: string, reason = 'Manual purge') {
    if (this.durable.c2.isHeld(stagedFileId)) {
      throw Object.assign(new Error('Review is on hold and cannot be purged'), {
        status: 403,
        code: 'held_not_purgeable',
      });
    }
    const purgedStaging = this.staging.purge(stagedFileId, reason);
    const correlationId = purgedStaging.correlationId || randomUUID();
    const purged = this.durable.purgeReview(stagedFileId, reason, correlationId) || purgedStaging;
    this.durable.putIdempotent({
      operationKey: `purge:${stagedFileId}`,
      operation: 'purge',
      resourceId: stagedFileId,
      correlationId,
      result: { purgedAt: purged.purgedAt },
    });
    return this.publicView(purged, true);
  }

  createBackup(opts?: BackupCreateOptions | { dryRun?: boolean }) {
    const profile =
      opts && 'profile' in opts && opts.profile ? opts.profile : ('Metadata Only' as const);
    const encrypted = Boolean(opts && 'encrypted' in opts && opts.encrypted);
    const dryRun = Boolean(opts?.dryRun);
    const includeStagedOriginals = Boolean(
      opts && 'includeStagedOriginals' in opts && opts.includeStagedOriginals,
    );
    if (includeStagedOriginals && profile !== 'Full Local Review Backup') {
      throw Object.assign(new Error('Staged originals require Full Local Review Backup'), {
        status: 400,
        code: 'invalid_backup_profile',
      });
    }
    try {
      this.durable.walCheckpoint();
    } catch {
      /* ignore */
    }
    const health = this.durable.health();
    const stagingBytes = sumDirBytes(join(this.staging.getConfig().rootDir, 'files'));
    const est = estimateBackupSize({
      dbBytes: health.dbBytes,
      profile,
      stagedOriginalBytes: includeStagedOriginals ? stagingBytes : 0,
      extractedBytes: profile === 'Metadata Only' ? 0 : Math.floor(health.dbBytes * 0.1),
    });
    const passphrase =
      encrypted
        ? resolveBackupPassphrase(
            this.env,
            opts && 'passphrase' in opts ? opts.passphrase : undefined,
          )
        : null;
    const dest =
      opts && 'destinationDir' in opts && opts.destinationDir
        ? resolve(opts.destinationDir)
        : this.backupRoot;
    mkdirSync(dest, { recursive: true, mode: 0o700 });
    const manifest = writeBackupBundle({
      backupDir: dest,
      backupId: randomUUID(),
      dbPath: this.durable.dbPath,
      schemaVersion: health.schemaVersion,
      profile,
      encrypted,
      passphrase,
      dryRun,
      includeStagedOriginals,
      reviewCount: health.reviewCount,
      packCount: health.packCount,
      auditCount: health.auditCount,
      estimatedBytes: est.estimatedBytes,
      fileCount: est.fileCount,
      warning: est.warning,
    });
    if (!dryRun) {
      this.durable.c2.noteMaintenance('backup_created', manifest.backupId);
    }
    return manifest;
  }

  verifyBackup(manifestPath: string, passphrase?: string) {
    const safe = assertSafeBackupPath(manifestPath, this.backupRoot);
    const result = verifyBackupBundle({
      manifestPathOrDir: safe,
      passphrase: resolveBackupPassphrase(this.env, passphrase),
    });
    if (result.ok) this.durable.c2.noteMaintenance('backup_verified', safe);
    return result;
  }

  listBackups() {
    return listBackupManifests(this.backupRoot);
  }

  validateRestore(backupPath: string) {
    const safe = assertSafeBackupPath(backupPath, this.backupRoot);
    // Encrypted .enc cannot validate via sqlite open — verify manifest instead
    if (safe.endsWith('.enc') || safe.endsWith('.manifest.json')) {
      return verifyBackupBundle({
        manifestPathOrDir: safe,
        passphrase: resolveBackupPassphrase(this.env),
      });
    }
    return this.durable.validateRestore(safe);
  }

  restoreBackup(
    backupPath: string,
    opts?: {
      dryRun?: boolean;
      authorized?: boolean;
      confirmOverwrite?: boolean;
      passphrase?: string;
      tempValidationOnly?: boolean;
    },
  ) {
    if (!opts?.authorized) {
      throw Object.assign(new Error('Restore requires explicit authorization'), {
        status: 403,
        code: 'restore_unauthorized',
      });
    }
    const safe = assertSafeBackupPath(backupPath, this.backupRoot);
    if (opts.tempValidationOnly || opts.dryRun) {
      const validation = this.validateRestore(safe);
      const health = this.durable.health();
      return {
        restored: false,
        dryRun: true,
        validation,
        activeSchemaVersion: health.schemaVersion,
        activeReviewCount: health.reviewCount,
        compareNote: 'Dry-run / temp validation only — active DB not overwritten',
      };
    }
    if (!opts.confirmOverwrite) {
      throw Object.assign(
        new Error('Restore requires confirmOverwrite=true to replace active database'),
        { status: 400, code: 'restore_confirmation_required' },
      );
    }
    // Safety backup first
    this.createBackup({ profile: 'Metadata Only', encrypted: false, dryRun: false });

    let sqlitePath = safe;
    if (safe.endsWith('.enc')) {
      const passphrase = resolveBackupPassphrase(this.env, opts.passphrase);
      if (!passphrase) {
        throw Object.assign(new Error('Passphrase required for encrypted restore'), {
          status: 400,
          code: 'backup_passphrase_required',
        });
      }
      const verified = verifyBackupBundle({ manifestPathOrDir: safe, passphrase });
      if (!verified.ok || !verified.manifest?.encryption) {
        throw Object.assign(new Error(verified.errors.join('; ')), {
          status: 400,
          code: 'restore_validation_failed',
        });
      }
      const data = readFileSync(safe);
      const plain = decryptBuffer(
        data,
        passphrase,
        Buffer.from(verified.manifest.encryption.saltB64, 'base64'),
        Buffer.from(verified.manifest.encryption.ivB64, 'base64'),
        Buffer.from(verified.manifest.encryption.authTagB64, 'base64'),
      );
      sqlitePath = join(this.backupRoot, `restore-temp-${randomUUID()}.sqlite`);
      writeFileSync(sqlitePath, plain, { mode: 0o600 });
    }
    return this.durable.restoreFromBackup(sqlitePath, { dryRun: false });
  }

  storageHealthReport() {
    const health = this.durable.health();
    const pragma = this.durable.c2.pragmaInfo();
    const stagingRoot = this.staging.getConfig().rootDir;
    const filesDir = join(stagingRoot, 'files');
    const stagedFiles = existsSync(filesDir) ? readdirSync(filesDir) : [];
    const bak = backupDirBytes(this.backupRoot);
    const preview = this.retentionPreview();
    const held = this.durable.c2.listHolds(true).length;
    const manifests = listBackupManifests(this.backupRoot);
    return {
      ok: health.ok,
      databaseAvailable: true,
      schemaVersion: health.schemaVersion,
      schemaLabel: health.schemaLabel,
      dbBytes: health.dbBytes,
      journalMode: pragma.journalMode,
      synchronous: String(pragma.synchronous),
      foreignKeys: pragma.foreignKeys,
      walOrJournalStatus: pragma.journalMode,
      stagedFileCount: stagedFiles.length,
      stagedFileBytes: sumDirBytes(filesDir),
      extractedContentBytes: 0,
      ocrContentBytes: 0,
      thumbnailBytes: 0,
      backupCount: bak.count,
      backupBytes: bak.bytes,
      orphanedFiles: 0,
      metadataWithoutFiles: 0,
      filesWithoutMetadata: 0,
      expiredItems: preview.filter((p) => p.reason.includes('TTL')).length,
      heldItems: held,
      purgeCandidates: preview.length,
      interruptedJobs: health.interruptedCount,
      failedMigrations: 0,
      lastSuccessfulBackup: this.durable.c2.lastMaintenance('backup_created'),
      lastVerifiedBackup: this.durable.c2.lastMaintenance('backup_verified'),
      lastRetentionReview: this.durable.c2.lastMaintenance('retention_review'),
      lastClamavDefinitionUpdate: null,
      reviewCount: health.reviewCount,
      packCount: health.packCount,
      auditCount: health.auditCount,
      recentBackups: manifests.slice(0, 5),
    };
  }

  integrityCheck() {
    const reviews = this.durable.listReviews(5000);
    const filesDir = join(this.staging.getConfig().rootDir, 'files');
    const onDisk = existsSync(filesDir)
      ? readdirSync(filesDir).map((f) => f.replace(/\.[^.]+$/, ''))
      : [];
    // staged files use safeFilename; map via staging list
    const stagedIds = this.staging.list().map((r) => r.stagedFileId);
    return this.durable.c2.integrityCheck({
      stagingRoot: this.staging.getConfig().rootDir,
      knownReviewIds: reviews.map((r) => r.stagedFileId),
      stagedFileIdsOnDisk: stagedIds,
    });
  }

  repairDryRun() {
    const report = this.integrityCheck();
    return {
      authorized: false,
      dryRun: true,
      report,
      note: 'No records deleted or rewritten. Authorize repair action explicitly.',
    };
  }

  authorizedRepair(opts: { authorized?: boolean; action?: string }) {
    if (!opts?.authorized) {
      throw Object.assign(new Error('Repair requires explicit Manny authorization'), {
        status: 403,
        code: 'repair_unauthorized',
      });
    }
    if (opts.action === 'integrity_check') {
      return { repaired: false, report: this.integrityCheck() };
    }
    if (opts.action === 'note_only') {
      this.durable.c2.noteMaintenance('repair_authorized', opts.action);
      return { repaired: false, note: 'Authorization recorded; no silent deletes' };
    }
    throw Object.assign(new Error('Unknown or unsupported repair action'), {
      status: 400,
      code: 'unsupported_repair',
    });
  }

  // --- Pack workspace ---
  configurePackWorkspace(
    packId: string,
    opts: {
      members?: PackMemberMeta[];
      expectedChecklist?: string[];
      title?: string;
      purpose?: string;
      projectLabel?: string | null;
      sensitivity?: string;
    },
  ) {
    const pack = this.getMultiDocumentPack(packId);
    if (opts.members) {
      if (opts.members.length > DEFAULT_MULTI_DOC_MAX_FILES) {
        throw Object.assign(new Error(`Max ${DEFAULT_MULTI_DOC_MAX_FILES} files`), { status: 400 });
      }
      for (const m of opts.members) this.require(m.stagedFileId);
      this.durable.c2.setPackMembers(packId, opts.members);
      pack.stagedFileIds = opts.members
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((m) => m.stagedFileId);
    }
    if (opts.expectedChecklist) {
      this.durable.c2.setExpectedChecklist(packId, opts.expectedChecklist);
    }
    const durable = this.durable.getPack(packId);
    if (durable) {
      if (opts.title) durable.title = opts.title;
      if (opts.purpose !== undefined) durable.purpose = opts.purpose;
      if (opts.projectLabel !== undefined) durable.projectLabel = opts.projectLabel;
      if (opts.sensitivity) durable.sensitivity = opts.sensitivity;
      durable.stagedFileIds = pack.stagedFileIds;
      durable.updatedAt = new Date().toISOString();
      this.durable.upsertPack(durable);
    }
    this.multiPacks.set(packId, pack);
    return this.getPackWorkspace(packId);
  }

  upsertPackRelationship(
    packId: string,
    opts: {
      relationshipId?: string;
      fromReviewId: string;
      toReviewId?: string | null;
      relationshipType: DocumentRelationshipType;
      label?: string | null;
      historyNote?: string;
    },
  ) {
    this.getMultiDocumentPack(packId);
    const now = new Date().toISOString();
    const rel = {
      relationshipId: opts.relationshipId || randomUUID(),
      packId,
      fromReviewId: opts.fromReviewId,
      toReviewId: opts.toReviewId ?? null,
      relationshipType: opts.relationshipType,
      label: opts.label ?? null,
      correctedBy: 'Manny' as const,
      correctedAt: now,
      active: true,
      createdAt: now,
      historyNote: opts.historyNote || 'Manny relationship correction',
    };
    this.durable.c2.upsertRelationship(rel);
    return rel;
  }

  deletePackRelationship(relationshipId: string) {
    this.durable.c2.deleteRelationship(relationshipId);
    return { deleted: true, relationshipId };
  }

  analyzePack(packId: string) {
    const pack = this.getMultiDocumentPack(packId);
    let members = this.durable.c2.getPackMembers(packId);
    if (!members.length) {
      members = pack.stagedFileIds.map((id, i) => ({
        reviewId: id,
        stagedFileId: id,
        orderIndex: i,
        relationshipType: (i === 0 ? 'primary document' : 'supporting evidence') as DocumentRelationshipType,
        versionLabel: null,
        amendmentLabel: null,
        designation: (i === 0 ? 'primary' : 'supporting') as PackMemberMeta['designation'],
        expectedChecklistItem: null,
      }));
      this.durable.c2.setPackMembers(packId, members);
    }
    const reviews = pack.stagedFileIds.map((id) => this.require(id));
    const analysis = analyzeMultiDocumentPack({
      packId,
      members,
      reviews,
      expectedChecklist: this.durable.c2.getExpectedChecklist(packId),
    });
    this.durable.c2.savePackAnalysis(analysis);
    const durable = this.durable.getPack(packId);
    if (durable) {
      durable.packRecommendation = analysis.packRecommendation;
      durable.crossDocumentConflicts = analysis.conflictingTerms;
      durable.missingDocuments = analysis.missingDocuments;
      durable.missingExhibits = analysis.missingExhibits;
      durable.missingSignatures = analysis.missingSignatures;
      durable.comparisonFindings = analysis;
      durable.updatedAt = new Date().toISOString();
      this.durable.upsertPack(durable);
    }
    return analysis;
  }

  getPackWorkspace(packId: string) {
    const pack = this.getMultiDocumentPack(packId);
    const durable = this.durable.getPack(packId);
    return {
      pack,
      durable,
      members: this.durable.c2.getPackMembers(packId),
      relationships: this.durable.c2.listRelationships(packId),
      expectedChecklist: this.durable.c2.getExpectedChecklist(packId),
      analysis: this.durable.c2.getPackAnalysis(packId),
      banners: {
        localDocumentReview: true,
        draftOnly: true,
        noFileMovement: true,
        noRecordWrites: true,
        noExternalCommunications: true,
      },
    };
  }

  getScanFingerprint(reviewId: string) {
    return this.durable.c2.findReusableMalwareScan({
      reviewId,
      checksumSha256: this.require(reviewId).checksumSha256,
      clamavVersion: null,
      dailyDefinitionVersion: null,
    });
  }

  getExtractionFingerprint(reviewId: string) {
    const rec = this.require(reviewId);
    return this.durable.c2.findReusableExtraction({
      sourceChecksum: rec.checksumSha256,
      extractionLibraryVersion: 'atlas-local-extract-1',
    });
  }

  authorizedPurge(stagedFileId: string, opts?: { authorized?: boolean; reason?: string }) {
    if (!opts?.authorized) {
      throw Object.assign(new Error('Purge requires explicit authorization'), {
        status: 403,
        code: 'purge_unauthorized',
      });
    }
    return this.purge(stagedFileId, opts.reason || 'Authorized purge');
  }

  listFixtures() {
    return (
      [
        'txt',
        'csv',
        'pdf_text',
        'injection',
        'docx_agreement',
        'xlsx_financial',
        'png_invoice',
        'pdf_encrypted',
      ] as FixtureKind[]
    ).map((kind) => {
      const f = createFixture(kind);
      return {
        kind,
        filename: f.filename,
        mime: f.mime,
        sizeBytes: f.bytes.length,
        banner: 'TEST — SYNTHETIC DOCUMENT',
      };
    });
  }

  private toDurablePack(
    pack: MultiDocumentReviewPack,
    meta: {
      title: string;
      projectLabel: string | null;
      purpose: string | null;
      sensitivity: string;
    },
  ): DurableMultiDocPack {
    return {
      packId: pack.packId,
      title: meta.title,
      clientLabel: pack.clientLabel,
      projectLabel: meta.projectLabel,
      purpose: meta.purpose,
      sensitivity: meta.sensitivity,
      createdAt: pack.createdAt,
      updatedAt: new Date().toISOString(),
      stagedFileIds: pack.stagedFileIds,
      relationshipAnalysis: pack.relationshipAnalysis,
      versionRelationships: [],
      duplicateRelationships: pack.duplicateNotes,
      comparisonFindings: null,
      crossDocumentConflicts: pack.crossDocumentConflicts,
      missingDocuments: pack.crossDocumentMissingInformation,
      missingExhibits: [],
      missingSignatures: [],
      packRecommendation: null,
      packDecisionPackage: null,
      mannyDecision: null,
      mannyDecisionAt: null,
      corrections: [],
      aggregateSizeBytes: pack.aggregateSizeBytes,
      maxFiles: pack.maxFiles,
      draftOnly: true,
      status: 'Open',
    };
  }

  private fromDurablePack(p: DurableMultiDocPack): MultiDocumentReviewPack {
    return {
      packId: p.packId,
      stagedFileIds: p.stagedFileIds,
      createdAt: p.createdAt,
      clientLabel: p.clientLabel,
      relationshipAnalysis: p.relationshipAnalysis,
      crossDocumentConflicts: p.crossDocumentConflicts,
      crossDocumentMissingInformation: p.missingDocuments,
      duplicateNotes: p.duplicateRelationships,
      sourceCitations: p.stagedFileIds.map((id) => ({
        stagedFileId: id,
        note: this.durable.getReview(id)?.originalFilename || id,
      })),
      draftOnly: true,
      maxFiles: p.maxFiles,
      aggregateSizeBytes: p.aggregateSizeBytes,
    };
  }

  private require(id: string): StagedDocumentRecord {
    const rec = this.staging.get(id) || this.durable.getReview(id);
    if (!rec) {
      throw Object.assign(new Error('Staged document not found'), {
        status: 404,
        code: 'not_found',
      });
    }
    return rec;
  }

  private publicView(rec: StagedDocumentRecord, includePackage = false): StagedDocumentRecord {
    return {
      ...rec,
      absolutePathHint: '[local staging — path omitted from API]',
      reviewPackage: includePackage
        ? rec.reviewPackage
        : rec.reviewPackage
          ? ({
              ...rec.reviewPackage,
              extraction: {
                ...rec.reviewPackage.extraction,
                pages: rec.reviewPackage.extraction.pages.map((p) => ({
                  ...p,
                  text: p.text.slice(0, 500),
                })),
              },
            } as DocumentReviewPackage)
          : null,
    };
  }
}

function normalize(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, '');
}
function similar(a: string, b: string) {
  if (!a || !b) return false;
  const na = a.toLowerCase().replace(/\s+/g, ' ').slice(0, 400);
  const nb = b.toLowerCase().replace(/\s+/g, ' ').slice(0, 400);
  return na.includes(nb.slice(0, 80)) || nb.includes(na.slice(0, 80));
}

export function createSyntheticTestBytes(
  kind:
    | 'txt'
    | 'csv'
    | 'pdf_text'
    | 'injection'
    | 'missing_signature'
    | 'png_placeholder',
): { filename: string; bytes: Buffer; mime: string } {
  const map: Record<string, FixtureKind> = {
    txt: 'txt',
    csv: 'csv',
    pdf_text: 'pdf_text',
    injection: 'injection',
    missing_signature: 'missing_signature',
    png_placeholder: 'png_invoice',
  };
  const f = createFixture(map[kind] || 'txt');
  return { filename: f.filename, bytes: f.bytes, mime: f.mime };
}

export { createFixture };
