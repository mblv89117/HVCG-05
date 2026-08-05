/**
 * Document review orchestration — Phase 4B-2.
 * stage → malware → extract/OCR → redaction gate → (service) Ollama enrich → draft package.
 * Never moves/renames/uploads files. Never writes authoritative records.
 */

import { randomUUID } from 'node:crypto';
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
  type DocumentEnrichmentOutput,
  type DocumentReviewDecision,
  type DocumentReviewPackage,
  type DocumentVersionComparison,
  type FieldCorrectionRecord,
  type MalwareScanResult,
  type MultiDocumentReviewPack,
  type StagedDocumentRecord,
} from '@hvcg/atlas-integration-core';
import {
  DocumentStagingStore,
  detectMimeFromBuffer,
  resolveDocumentStagingConfig,
} from './documentStaging.ts';
import { combinedExtractedText, extractDocument } from './documentExtraction.ts';
import { malwareQuarantineDir, scanFileLocally } from './malwareScanner.ts';
import { createFixture, type FixtureKind } from './documentFixtures.ts';

export class DocumentReviewService {
  readonly staging: DocumentStagingStore;
  private activeAbort = new Map<string, AbortController>();
  private multiPacks = new Map<string, MultiDocumentReviewPack>();
  private env: Record<string, string | undefined>;

  constructor(repoRoot: string, env: Record<string, string | undefined> = process.env) {
    this.env = env;
    this.staging = new DocumentStagingStore(resolveDocumentStagingConfig(env, repoRoot));
  }

  list() {
    this.staging.expireDue();
    return this.staging.list().map((r) => this.publicView(r));
  }

  get(id: string) {
    return this.publicView(this.require(id), true);
  }

  async stage(input: {
    originalFilename: string;
    bytes: Buffer;
    declaredMime?: string;
    allowSyntheticMalwareOverride?: boolean;
  }): Promise<StagedDocumentRecord> {
    this.staging.expireDue();
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

    const scan = await scanFileLocally({
      absolutePath: this.staging.absolutePath(rec),
      checksumSha256: rec.checksumSha256,
      quarantineDir: malwareQuarantineDir(this.staging.getConfig().rootDir),
      env: this.env,
      allowSyntheticOverride: true,
      isSyntheticTestFile: isSynthetic,
    });

    rec.malwareScan = scan;
    rec.malwareScanStatus = scan.status;
    rec.malwareScanNote = scan.detail;
    if (scan.blocked) {
      rec.status = 'MalwareBlocked';
      rec.errorDetail = scan.detail;
    }
    rec.updatedAt = new Date().toISOString();
    this.staging.upsert(rec);
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

    const controller = new AbortController();
    this.activeAbort.set(rec.stagedFileId, controller);
    rec.status = 'Extracting';
    rec.updatedAt = new Date().toISOString();
    this.staging.upsert(rec);

    try {
      const bytes = this.staging.readBytes(rec);
      const abs = this.staging.absolutePath(rec);
      if (['png', 'jpg', 'jpeg', 'pdf'].includes(String(rec.extension))) {
        rec.status = 'OcrInProgress';
        this.staging.upsert(rec);
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
      this.staging.upsert(latest);
      return this.publicView(latest, true);
    } catch (err) {
      const latest = this.require(opts.stagedFileId);
      latest.status = 'Failed';
      latest.errorDetail = err instanceof Error ? err.message : String(err);
      latest.updatedAt = new Date().toISOString();
      this.staging.upsert(latest);
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
      this.staging.upsert(rec);
      return this.publicView(rec, true);
    }
    if (decision === 'Edit Redactions' && editedRedactedContent != null) {
      rec.redactedContent = editedRedactedContent;
      if (rec.reviewPackage) {
        rec.reviewPackage.redactedContentPreview = editedRedactedContent.slice(0, 4000);
      }
      rec.redactionDecision = 'Pending';
      rec.updatedAt = new Date().toISOString();
      this.staging.upsert(rec);
      return this.publicView(rec, true);
    }
    rec.redactionDecision = 'Approve Redacted Content';
    rec.status = 'Enriching';
    rec.updatedAt = new Date().toISOString();
    this.staging.upsert(rec);
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
    this.staging.upsert(rec);
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

    const pack: MultiDocumentReviewPack = {
      packId: randomUUID(),
      stagedFileIds: opts.stagedFileIds,
      createdAt: new Date().toISOString(),
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

    // Cross-doc amount/date conflicts (heuristic)
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
    return pack;
  }

  getMultiDocumentPack(packId: string) {
    const p = this.multiPacks.get(packId);
    if (!p) throw Object.assign(new Error('Multi-doc pack not found'), { status: 404 });
    return p;
  }

  decide(
    stagedFileId: string,
    decision: DocumentReviewDecision,
    corrections?: Record<string, unknown>,
  ): StagedDocumentRecord {
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
      return this.publicView(this.staging.purge(stagedFileId, 'Manny purge'), true);
    }
    if (
      decision === 'Approve Redacted Content' ||
      decision === 'Edit Redactions' ||
      decision === 'Cancel Enrichment'
    ) {
      return this.decideRedaction(
        stagedFileId,
        decision,
        corrections?.redactedContent ? String(corrections.redactedContent) : undefined,
      );
    }

    const pack = { ...rec.reviewPackage! };
    const log = [...((rec.correctionLog as FieldCorrectionRecord[]) || [])];
    const pushCorrection = (field: string, original: unknown, corrected: unknown) => {
      log.push({
        field,
        originalValue: original,
        correctedValue: corrected,
        correctedBy: 'Manny',
        correctedAt: new Date().toISOString(),
        reason: String(corrections?.reason || 'Manny correction'),
        informFutureDeterministicRules: Boolean(corrections?.informFutureDeterministicRules),
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
      decision === 'Reject Draft'
        ? 'ReviewComplete'
        : 'ReadyForReview';
    rec.updatedAt = new Date().toISOString();
    this.staging.upsert(rec);
    return this.publicView(rec, true);
  }

  purge(stagedFileId: string) {
    return this.publicView(this.staging.purge(stagedFileId, 'Manual purge'), true);
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

  private require(id: string): StagedDocumentRecord {
    const rec = this.staging.get(id);
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
