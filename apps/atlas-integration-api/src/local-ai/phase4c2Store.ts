/**
 * Phase 4C-2 durable store extensions — holds, fingerprints, checkpoints, retention, integrity.
 * Operates on the same SQLite connection via DocumentReviewDatabase.rawExec helpers.
 */

import { randomUUID } from 'node:crypto';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import {
  DEFAULT_SCAN_REUSE_MAX_AGE_HOURS,
  EXTRACTION_POLICY_VERSION,
  JOB_CHECKPOINT_STAGES,
  OCR_PREPROCESS_VERSION,
  SCAN_POLICY_VERSION,
  buildExtractionFingerprintKey,
  buildScannerFingerprintKey,
  type DocumentRelationshipType,
  type ExtractionFingerprint,
  type HoldRecord,
  type HoldType,
  type IntegrityCheckReport,
  type JobCheckpoint,
  type JobCheckpointStage,
  type MalwareFingerprint,
  type PackAnalysisDraft,
  type PackMemberMeta,
  type PackRelationshipRecord,
  type ResumeEligibility,
  type RetentionBatch,
  type RetentionPolicyRecord,
  type StorageHealthReport,
} from '@hvcg/atlas-integration-core';

function j(v: unknown): string {
  return JSON.stringify(v ?? null);
}
function parseJ<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export class Phase4c2Store {
  constructor(private db: DatabaseSync) {}

  ensureDefaultRetentionPolicies() {
    const count = Number(
      (this.db.prepare('SELECT COUNT(*) AS c FROM retention_policies').get() as { c: number }).c,
    );
    if (count > 0) return;
    const defaults: Array<Omit<RetentionPolicyRecord, 'policyId'>> = [
      {
        policyVersion: '1.0.0',
        itemType: 'staged_original',
        ageThresholdHours: 24,
        sizeThresholdBytes: null,
        statusRequirement: null,
        exclusionRules: ['hold'],
        legalHoldFlag: true,
        clientHoldFlag: true,
        mannyHoldFlag: true,
        active: true,
      },
      {
        policyVersion: '1.0.0',
        itemType: 'temp_page_image',
        ageThresholdHours: 6,
        sizeThresholdBytes: null,
        statusRequirement: null,
        exclusionRules: ['hold'],
        legalHoldFlag: true,
        clientHoldFlag: true,
        mannyHoldFlag: true,
        active: true,
      },
      {
        policyVersion: '1.0.0',
        itemType: 'extracted_text',
        ageThresholdHours: 24 * 30,
        sizeThresholdBytes: null,
        statusRequirement: null,
        exclusionRules: ['hold'],
        legalHoldFlag: true,
        clientHoldFlag: true,
        mannyHoldFlag: true,
        active: true,
      },
      {
        policyVersion: '1.0.0',
        itemType: 'archived_review',
        ageThresholdHours: 24 * 180,
        sizeThresholdBytes: null,
        statusRequirement: 'Archived',
        exclusionRules: ['hold'],
        legalHoldFlag: true,
        clientHoldFlag: true,
        mannyHoldFlag: true,
        active: true,
      },
      {
        policyVersion: '1.0.0',
        itemType: 'audit_history',
        ageThresholdHours: 24 * 365,
        sizeThresholdBytes: null,
        statusRequirement: null,
        exclusionRules: ['never_auto_purge'],
        legalHoldFlag: true,
        clientHoldFlag: true,
        mannyHoldFlag: true,
        active: true,
      },
      {
        policyVersion: '1.0.0',
        itemType: 'tombstone',
        ageThresholdHours: 24 * 730,
        sizeThresholdBytes: null,
        statusRequirement: null,
        exclusionRules: ['never_auto_purge'],
        legalHoldFlag: true,
        clientHoldFlag: true,
        mannyHoldFlag: true,
        active: true,
      },
    ];
    for (const p of defaults) {
      this.db
        .prepare(
          `INSERT INTO retention_policies(
            policy_id, policy_version, item_type, age_threshold_hours, size_threshold_bytes,
            status_requirement, exclusion_rules_json, legal_hold_flag, client_hold_flag, manny_hold_flag, active
          ) VALUES (?,?,?,?,?,?,?,?,?,?,1)`,
        )
        .run(
          randomUUID(),
          p.policyVersion,
          p.itemType,
          p.ageThresholdHours,
          p.sizeThresholdBytes,
          p.statusRequirement,
          j(p.exclusionRules),
          p.legalHoldFlag ? 1 : 0,
          p.clientHoldFlag ? 1 : 0,
          p.mannyHoldFlag ? 1 : 0,
        );
    }
  }

  noteMaintenance(kind: string, detail: string) {
    this.db
      .prepare(`INSERT INTO maintenance_events(event_id, at, kind, detail) VALUES (?,?,?,?)`)
      .run(randomUUID(), new Date().toISOString(), kind, detail);
  }

  lastMaintenance(kind: string): string | null {
    const row = this.db
      .prepare(`SELECT at FROM maintenance_events WHERE kind = ? ORDER BY at DESC LIMIT 1`)
      .get(kind) as { at: string } | undefined;
    return row?.at || null;
  }

  // --- Holds ---
  createHold(opts: {
    reviewId?: string | null;
    packId?: string | null;
    holdType: HoldType;
    reason: string;
    expiresAt?: string | null;
  }): HoldRecord {
    const hold: HoldRecord = {
      holdId: randomUUID(),
      reviewId: opts.reviewId || null,
      packId: opts.packId || null,
      holdType: opts.holdType,
      reason: opts.reason,
      createdBy: 'Manny',
      createdAt: new Date().toISOString(),
      expiresAt: opts.expiresAt || null,
      releasedBy: null,
      releasedAt: null,
      active: true,
    };
    this.db
      .prepare(
        `INSERT INTO review_holds(hold_id, review_id, pack_id, hold_type, reason, created_by, created_at, expires_at, released_by, released_at, active)
         VALUES (?,?,?,?,?,?,?,?,NULL,NULL,1)`,
      )
      .run(
        hold.holdId,
        hold.reviewId,
        hold.packId,
        hold.holdType,
        hold.reason,
        hold.createdBy,
        hold.createdAt,
        hold.expiresAt,
      );
    this.noteMaintenance('hold_created', `${hold.holdType}:${hold.holdId}`);
    return hold;
  }

  releaseHold(holdId: string): HoldRecord | null {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `UPDATE review_holds SET active = 0, released_by = 'Manny', released_at = ? WHERE hold_id = ?`,
      )
      .run(now, holdId);
    const row = this.db.prepare(`SELECT * FROM review_holds WHERE hold_id = ?`).get(holdId) as
      | Record<string, unknown>
      | undefined;
    if (!row) return null;
    this.noteMaintenance('hold_released', holdId);
    return {
      holdId: String(row.hold_id),
      reviewId: row.review_id ? String(row.review_id) : null,
      packId: row.pack_id ? String(row.pack_id) : null,
      holdType: String(row.hold_type) as HoldType,
      reason: String(row.reason),
      createdBy: 'Manny',
      createdAt: String(row.created_at),
      expiresAt: row.expires_at ? String(row.expires_at) : null,
      releasedBy: 'Manny',
      releasedAt: now,
      active: false,
    };
  }

  listHolds(activeOnly = true): HoldRecord[] {
    const rows = (
      activeOnly
        ? this.db.prepare(`SELECT * FROM review_holds WHERE active = 1 ORDER BY created_at DESC`).all()
        : this.db.prepare(`SELECT * FROM review_holds ORDER BY created_at DESC`).all()
    ) as Record<string, unknown>[];
    return rows.map((row) => ({
      holdId: String(row.hold_id),
      reviewId: row.review_id ? String(row.review_id) : null,
      packId: row.pack_id ? String(row.pack_id) : null,
      holdType: String(row.hold_type) as HoldType,
      reason: String(row.reason),
      createdBy: 'Manny',
      createdAt: String(row.created_at),
      expiresAt: row.expires_at ? String(row.expires_at) : null,
      releasedBy: row.released_by ? String(row.released_by) : null,
      releasedAt: row.released_at ? String(row.released_at) : null,
      active: Boolean(row.active),
    }));
  }

  isHeld(reviewId: string): boolean {
    const row = this.db
      .prepare(
        `SELECT COUNT(*) AS c FROM review_holds WHERE active = 1 AND review_id = ?
         AND (expires_at IS NULL OR expires_at > ?)`,
      )
      .get(reviewId, new Date().toISOString()) as { c: number };
    return Number(row.c) > 0;
  }

  heldReviewIds(): Set<string> {
    const rows = this.db
      .prepare(
        `SELECT review_id FROM review_holds WHERE active = 1 AND review_id IS NOT NULL
         AND (expires_at IS NULL OR expires_at > ?)`,
      )
      .all(new Date().toISOString()) as Array<{ review_id: string }>;
    return new Set(rows.map((r) => r.review_id));
  }

  // --- Pack members / relationships ---
  setPackMembers(packId: string, members: PackMemberMeta[]) {
    this.db.prepare(`DELETE FROM pack_members_meta WHERE pack_id = ?`).run(packId);
    for (const m of members) {
      this.db
        .prepare(
          `INSERT INTO pack_members_meta(
            id, pack_id, review_id, staged_file_id, order_index, relationship_type,
            version_label, amendment_label, designation, expected_checklist_item
          ) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        )
        .run(
          randomUUID(),
          packId,
          m.reviewId,
          m.stagedFileId,
          m.orderIndex,
          m.relationshipType,
          m.versionLabel,
          m.amendmentLabel,
          m.designation,
          m.expectedChecklistItem,
        );
    }
  }

  getPackMembers(packId: string): PackMemberMeta[] {
    const rows = this.db
      .prepare(`SELECT * FROM pack_members_meta WHERE pack_id = ? ORDER BY order_index ASC`)
      .all(packId) as Record<string, unknown>[];
    return rows.map((r) => ({
      reviewId: String(r.review_id),
      stagedFileId: String(r.staged_file_id),
      orderIndex: Number(r.order_index),
      relationshipType: String(r.relationship_type) as DocumentRelationshipType,
      versionLabel: r.version_label ? String(r.version_label) : null,
      amendmentLabel: r.amendment_label ? String(r.amendment_label) : null,
      designation: String(r.designation) as PackMemberMeta['designation'],
      expectedChecklistItem: r.expected_checklist_item
        ? String(r.expected_checklist_item)
        : null,
    }));
  }

  setExpectedChecklist(packId: string, items: string[]) {
    this.db.prepare(`DELETE FROM pack_expected_checklist WHERE pack_id = ?`).run(packId);
    for (const item of items) {
      this.db
        .prepare(`INSERT INTO pack_expected_checklist(id, pack_id, item) VALUES (?,?,?)`)
        .run(randomUUID(), packId, item);
    }
  }

  getExpectedChecklist(packId: string): string[] {
    const rows = this.db
      .prepare(`SELECT item FROM pack_expected_checklist WHERE pack_id = ?`)
      .all(packId) as Array<{ item: string }>;
    return rows.map((r) => r.item);
  }

  upsertRelationship(rel: PackRelationshipRecord) {
    this.db
      .prepare(
        `INSERT INTO pack_relationships(
          relationship_id, pack_id, from_review_id, to_review_id, relationship_type,
          label, corrected_by, corrected_at, active, created_at, history_note, history_json
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(relationship_id) DO UPDATE SET
          relationship_type=excluded.relationship_type,
          label=excluded.label,
          corrected_by=excluded.corrected_by,
          corrected_at=excluded.corrected_at,
          active=excluded.active,
          history_note=excluded.history_note,
          history_json=excluded.history_json`,
      )
      .run(
        rel.relationshipId,
        rel.packId,
        rel.fromReviewId,
        rel.toReviewId,
        rel.relationshipType,
        rel.label,
        rel.correctedBy,
        rel.correctedAt,
        rel.active ? 1 : 0,
        rel.createdAt,
        rel.historyNote,
        j([]),
      );
  }

  deleteRelationship(relationshipId: string) {
    this.db
      .prepare(`UPDATE pack_relationships SET active = 0, corrected_at = ?, corrected_by = 'Manny' WHERE relationship_id = ?`)
      .run(new Date().toISOString(), relationshipId);
  }

  listRelationships(packId: string): PackRelationshipRecord[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM pack_relationships WHERE pack_id = ? AND active = 1 ORDER BY created_at`,
      )
      .all(packId) as Record<string, unknown>[];
    return rows.map((r) => ({
      relationshipId: String(r.relationship_id),
      packId: String(r.pack_id),
      fromReviewId: String(r.from_review_id),
      toReviewId: r.to_review_id ? String(r.to_review_id) : null,
      relationshipType: String(r.relationship_type) as DocumentRelationshipType,
      label: r.label ? String(r.label) : null,
      correctedBy: r.corrected_by ? 'Manny' : null,
      correctedAt: r.corrected_at ? String(r.corrected_at) : null,
      active: Boolean(r.active),
      createdAt: String(r.created_at),
      historyNote: r.history_note ? String(r.history_note) : null,
    }));
  }

  savePackAnalysis(analysis: PackAnalysisDraft) {
    this.db
      .prepare(
        `INSERT INTO pack_analysis(pack_id, analyzed_at, analysis_json) VALUES (?,?,?)
         ON CONFLICT(pack_id) DO UPDATE SET analyzed_at=excluded.analyzed_at, analysis_json=excluded.analysis_json`,
      )
      .run(analysis.packId, analysis.analyzedAt, j(analysis));
  }

  getPackAnalysis(packId: string): PackAnalysisDraft | null {
    const row = this.db
      .prepare(`SELECT analysis_json FROM pack_analysis WHERE pack_id = ?`)
      .get(packId) as { analysis_json: string } | undefined;
    return row ? parseJ<PackAnalysisDraft | null>(row.analysis_json, null) : null;
  }

  // --- Fingerprints ---
  saveMalwareFingerprint(fp: MalwareFingerprint) {
    const key = buildScannerFingerprintKey(fp);
    this.db
      .prepare(
        `INSERT INTO malware_fingerprints(
          fingerprint_id, review_id, checksum_sha256, clamav_version, daily_definition_version,
          main_definition_version, bytecode_definition_version, definition_update_timestamp,
          scan_policy_version, scan_result, scan_timestamp, clean, reusable_until, fingerprint_key
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        fp.fingerprintId,
        fp.reviewId,
        fp.checksumSha256,
        fp.clamavVersion,
        fp.dailyDefinitionVersion,
        fp.mainDefinitionVersion,
        fp.bytecodeDefinitionVersion,
        fp.definitionUpdateTimestamp,
        fp.scanPolicyVersion,
        fp.scanResult,
        fp.scanTimestamp,
        fp.clean ? 1 : 0,
        fp.reusableUntil,
        key,
      );
  }

  findReusableMalwareScan(opts: {
    reviewId: string;
    checksumSha256: string;
    clamavVersion: string | null;
    dailyDefinitionVersion: string | null;
    maxAgeHours?: number;
  }): { reusable: boolean; reason: string; fingerprint: MalwareFingerprint | null } {
    const key = buildScannerFingerprintKey({
      checksumSha256: opts.checksumSha256,
      clamavVersion: opts.clamavVersion,
      dailyDefinitionVersion: opts.dailyDefinitionVersion,
      scanPolicyVersion: SCAN_POLICY_VERSION,
    });
    const row = this.db
      .prepare(
        `SELECT * FROM malware_fingerprints WHERE fingerprint_key = ? AND clean = 1
         ORDER BY scan_timestamp DESC LIMIT 1`,
      )
      .get(key) as Record<string, unknown> | undefined;
    if (!row) {
      return { reusable: false, reason: 'no_matching_clean_fingerprint', fingerprint: null };
    }
    const fp = this.mapMalwareFp(row);
    const maxAge = (opts.maxAgeHours ?? DEFAULT_SCAN_REUSE_MAX_AGE_HOURS) * 3600_000;
    if (Date.now() - new Date(fp.scanTimestamp).getTime() > maxAge) {
      return { reusable: false, reason: 'scan_stale', fingerprint: fp };
    }
    if (fp.scanPolicyVersion !== SCAN_POLICY_VERSION) {
      return { reusable: false, reason: 'policy_changed', fingerprint: fp };
    }
    return { reusable: true, reason: 'fingerprint_match_clean_within_age', fingerprint: fp };
  }

  saveExtractionFingerprint(fp: ExtractionFingerprint) {
    const key = buildExtractionFingerprintKey(fp);
    this.db
      .prepare(
        `INSERT INTO extraction_fingerprints(
          fingerprint_id, review_id, source_checksum, extraction_library, extraction_library_version,
          extraction_policy_version, ocr_engine, ocr_engine_version, ocr_preprocessing_version,
          page_count, extraction_timestamp, confidence_summary, outcome, fingerprint_key
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        fp.fingerprintId,
        fp.reviewId,
        fp.sourceChecksum,
        fp.extractionLibrary,
        fp.extractionLibraryVersion,
        fp.extractionPolicyVersion,
        fp.ocrEngine,
        fp.ocrEngineVersion,
        fp.ocrPreprocessingVersion,
        fp.pageCount,
        fp.extractionTimestamp,
        fp.confidenceSummary,
        fp.outcome,
        key,
      );
  }

  findReusableExtraction(opts: {
    sourceChecksum: string;
    extractionLibraryVersion: string;
    minConfidence?: number;
  }): { reusable: boolean; reason: string; fingerprint: ExtractionFingerprint | null } {
    const key = buildExtractionFingerprintKey({
      sourceChecksum: opts.sourceChecksum,
      extractionPolicyVersion: EXTRACTION_POLICY_VERSION,
      extractionLibraryVersion: opts.extractionLibraryVersion,
      ocrPreprocessingVersion: OCR_PREPROCESS_VERSION,
    });
    const row = this.db
      .prepare(
        `SELECT * FROM extraction_fingerprints WHERE fingerprint_key = ? AND outcome = 'ok'
         ORDER BY extraction_timestamp DESC LIMIT 1`,
      )
      .get(key) as Record<string, unknown> | undefined;
    if (!row) return { reusable: false, reason: 'no_matching_ok_fingerprint', fingerprint: null };
    const fp = this.mapExtractFp(row);
    const min = opts.minConfidence ?? 0.4;
    if (fp.confidenceSummary != null && fp.confidenceSummary < min) {
      return { reusable: false, reason: 'confidence_below_threshold', fingerprint: fp };
    }
    return { reusable: true, reason: 'extraction_fingerprint_match', fingerprint: fp };
  }

  // --- Checkpoints ---
  startCheckpoint(opts: {
    reviewId: string;
    stage: JobCheckpointStage;
    correlationId: string;
    attemptNumber?: number;
  }): JobCheckpoint {
    const cp: JobCheckpoint = {
      checkpointId: randomUUID(),
      reviewId: opts.reviewId,
      stage: opts.stage,
      attemptNumber: opts.attemptNumber || this.nextAttempt(opts.reviewId, opts.stage),
      startedAt: new Date().toISOString(),
      completedAt: null,
      outcome: 'started',
      correlationId: opts.correlationId,
      durationMs: null,
      reusableResultRef: null,
      failureReason: null,
    };
    this.db
      .prepare(
        `INSERT INTO job_checkpoints(
          checkpoint_id, review_id, stage, attempt_number, started_at, completed_at, outcome,
          correlation_id, duration_ms, reusable_result_ref, failure_reason
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        cp.checkpointId,
        cp.reviewId,
        cp.stage,
        cp.attemptNumber,
        cp.startedAt,
        null,
        cp.outcome,
        cp.correlationId,
        null,
        null,
        null,
      );
    return cp;
  }

  completeCheckpoint(
    checkpointId: string,
    outcome: JobCheckpoint['outcome'],
    opts?: { reusableResultRef?: string; failureReason?: string },
  ) {
    const row = this.db
      .prepare(`SELECT started_at FROM job_checkpoints WHERE checkpoint_id = ?`)
      .get(checkpointId) as { started_at: string } | undefined;
    const now = new Date().toISOString();
    const durationMs = row ? Date.now() - new Date(row.started_at).getTime() : null;
    this.db
      .prepare(
        `UPDATE job_checkpoints SET completed_at = ?, outcome = ?, duration_ms = ?,
         reusable_result_ref = ?, failure_reason = ? WHERE checkpoint_id = ?`,
      )
      .run(
        now,
        outcome,
        durationMs,
        opts?.reusableResultRef || null,
        opts?.failureReason || null,
        checkpointId,
      );
  }

  listCheckpoints(reviewId: string): JobCheckpoint[] {
    const rows = this.db
      .prepare(`SELECT * FROM job_checkpoints WHERE review_id = ? ORDER BY started_at ASC`)
      .all(reviewId) as Record<string, unknown>[];
    return rows.map((r) => ({
      checkpointId: String(r.checkpoint_id),
      reviewId: String(r.review_id),
      stage: String(r.stage) as JobCheckpointStage,
      attemptNumber: Number(r.attempt_number),
      startedAt: String(r.started_at),
      completedAt: r.completed_at ? String(r.completed_at) : null,
      outcome: String(r.outcome) as JobCheckpoint['outcome'],
      correlationId: String(r.correlation_id),
      durationMs: r.duration_ms == null ? null : Number(r.duration_ms),
      reusableResultRef: r.reusable_result_ref ? String(r.reusable_result_ref) : null,
      failureReason: r.failure_reason ? String(r.failure_reason) : null,
    }));
  }

  resumeEligibility(reviewId: string, interruptedStage?: string | null): ResumeEligibility {
    const cps = this.listCheckpoints(reviewId);
    const completed = new Set(
      cps.filter((c) => c.outcome === 'completed' || c.outcome === 'skipped_reuse').map((c) => c.stage),
    );
    const reusable = new Set(
      cps.filter((c) => c.outcome === 'skipped_reuse' || (c.outcome === 'completed' && c.reusableResultRef)).map((c) => c.stage),
    );
    const order = [...JOB_CHECKPOINT_STAGES];
    const stagesRequiringRerun = order.filter((s) => !completed.has(s) && !reusable.has(s));
    const priorAttempts = Math.max(0, ...cps.map((c) => c.attemptNumber), 0);
    return {
      reviewId,
      interruptedStage: interruptedStage || null,
      completedStages: [...completed],
      reusableStages: [...reusable],
      stagesRequiringRerun,
      canResume: stagesRequiringRerun.length > 0 || Boolean(interruptedStage),
      canRestart: true,
      priorAttempts,
      notes: [
        'Never auto-resume after restart — Manny action required',
        'Reusable stages skip duplicate malware/OCR/AI when fingerprints valid',
      ],
    };
  }

  private nextAttempt(reviewId: string, stage: string): number {
    const row = this.db
      .prepare(
        `SELECT MAX(attempt_number) AS m FROM job_checkpoints WHERE review_id = ? AND stage = ?`,
      )
      .get(reviewId, stage) as { m: number | null };
    return Number(row?.m || 0) + 1;
  }

  // --- Retention ---
  listRetentionPolicies(): RetentionPolicyRecord[] {
    const rows = this.db
      .prepare(`SELECT * FROM retention_policies WHERE active = 1`)
      .all() as Record<string, unknown>[];
    return rows.map((r) => ({
      policyId: String(r.policy_id),
      policyVersion: String(r.policy_version),
      itemType: String(r.item_type),
      ageThresholdHours: r.age_threshold_hours == null ? null : Number(r.age_threshold_hours),
      sizeThresholdBytes: r.size_threshold_bytes == null ? null : Number(r.size_threshold_bytes),
      statusRequirement: r.status_requirement ? String(r.status_requirement) : null,
      exclusionRules: parseJ<string[]>(String(r.exclusion_rules_json), []),
      legalHoldFlag: Boolean(r.legal_hold_flag),
      clientHoldFlag: Boolean(r.client_hold_flag),
      mannyHoldFlag: Boolean(r.manny_hold_flag),
      active: Boolean(r.active),
    }));
  }

  createRetentionBatch(candidateReviewIds: string[], preview: unknown, notes?: string): RetentionBatch {
    const batch: RetentionBatch = {
      batchId: randomUUID(),
      createdAt: new Date().toISOString(),
      status: 'Proposed',
      candidateReviewIds,
      previewJson: preview,
      approvedBy: null,
      approvedAt: null,
      executedAt: null,
      notes: notes || null,
    };
    this.db
      .prepare(
        `INSERT INTO retention_batches(
          batch_id, created_at, status, candidate_review_ids_json, preview_json, notes
        ) VALUES (?,?,?,?,?,?)`,
      )
      .run(
        batch.batchId,
        batch.createdAt,
        batch.status,
        j(candidateReviewIds),
        j(preview),
        batch.notes,
      );
    this.noteMaintenance('retention_review', `batch=${batch.batchId}; candidates=${candidateReviewIds.length}`);
    return batch;
  }

  approveRetentionBatch(batchId: string): RetentionBatch {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `UPDATE retention_batches SET status = 'Approved', approved_by = 'Manny', approved_at = ? WHERE batch_id = ? AND status = 'Proposed'`,
      )
      .run(now, batchId);
    return this.getRetentionBatch(batchId)!;
  }

  markRetentionBatchExecuted(batchId: string) {
    this.db
      .prepare(`UPDATE retention_batches SET status = 'Executed', executed_at = ? WHERE batch_id = ?`)
      .run(new Date().toISOString(), batchId);
  }

  getRetentionBatch(batchId: string): RetentionBatch | null {
    const row = this.db
      .prepare(`SELECT * FROM retention_batches WHERE batch_id = ?`)
      .get(batchId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      batchId: String(row.batch_id),
      createdAt: String(row.created_at),
      status: String(row.status) as RetentionBatch['status'],
      candidateReviewIds: parseJ<string[]>(String(row.candidate_review_ids_json), []),
      previewJson: parseJ(String(row.preview_json), null),
      approvedBy: row.approved_by ? String(row.approved_by) : null,
      approvedAt: row.approved_at ? String(row.approved_at) : null,
      executedAt: row.executed_at ? String(row.executed_at) : null,
      notes: row.notes ? String(row.notes) : null,
    };
  }

  listRetentionBatches(): RetentionBatch[] {
    const rows = this.db
      .prepare(`SELECT batch_id FROM retention_batches ORDER BY created_at DESC LIMIT 50`)
      .all() as Array<{ batch_id: string }>;
    return rows.map((r) => this.getRetentionBatch(r.batch_id)!).filter(Boolean);
  }

  // --- Integrity ---
  integrityCheck(opts: {
    stagingRoot: string;
    knownReviewIds: string[];
    stagedFileIdsOnDisk: string[];
  }): IntegrityCheckReport {
    const integrity = String(
      (this.db.prepare('PRAGMA integrity_check').get() as { integrity_check: string }).integrity_check,
    );
    const fkRows = this.db.prepare('PRAGMA foreign_key_check').all() as Array<Record<string, unknown>>;
    const onDisk = new Set(opts.stagedFileIdsOnDisk);
    const inDb = new Set(opts.knownReviewIds);
    const orphanFiles = [...onDisk].filter((id) => !inDb.has(id));
    const missingFiles = [...inDb].filter((id) => !onDisk.has(id));
    const dupRows = this.db
      .prepare(
        `SELECT checksum_sha256, COUNT(*) AS c FROM document_reviews
         WHERE durable_status != 'Purged' GROUP BY checksum_sha256 HAVING c > 1`,
      )
      .all() as Array<{ checksum_sha256: string; c: number }>;
    return {
      ok: integrity === 'ok' && fkRows.length === 0,
      integrityCheck: integrity,
      foreignKeyCheck: fkRows.map((r) => j(r)),
      orphanFiles,
      missingFiles,
      missingMetadata: orphanFiles,
      duplicateRecords: dupRows.map((d) => `${d.checksum_sha256}:${d.c}`),
      staleLocks: [],
      interruptedMigrations: [],
      auditChainNotes: ['Audit events append-only; tombstones preserved after purge'],
      dryRunCleanup: [
        ...orphanFiles.map((f) => `Would flag orphan file ${f} (no delete without authorization)`),
        ...missingFiles.map((f) => `Would flag missing file for metadata ${f}`),
      ],
    };
  }

  pragmaInfo(): { journalMode: string; synchronous: string; foreignKeys: boolean } {
    const journalMode = String(
      (this.db.prepare('PRAGMA journal_mode').get() as { journal_mode: string }).journal_mode,
    );
    const synchronous = String(
      (this.db.prepare('PRAGMA synchronous').get() as { synchronous: number }).synchronous,
    );
    const foreignKeys = Boolean(
      (this.db.prepare('PRAGMA foreign_keys').get() as { foreign_keys: number }).foreign_keys,
    );
    return { journalMode, synchronous, foreignKeys };
  }

  private mapMalwareFp(row: Record<string, unknown>): MalwareFingerprint {
    return {
      fingerprintId: String(row.fingerprint_id),
      reviewId: String(row.review_id),
      checksumSha256: String(row.checksum_sha256),
      clamavVersion: row.clamav_version ? String(row.clamav_version) : null,
      dailyDefinitionVersion: row.daily_definition_version
        ? String(row.daily_definition_version)
        : null,
      mainDefinitionVersion: row.main_definition_version
        ? String(row.main_definition_version)
        : null,
      bytecodeDefinitionVersion: row.bytecode_definition_version
        ? String(row.bytecode_definition_version)
        : null,
      definitionUpdateTimestamp: row.definition_update_timestamp
        ? String(row.definition_update_timestamp)
        : null,
      scanPolicyVersion: String(row.scan_policy_version),
      scanResult: String(row.scan_result),
      scanTimestamp: String(row.scan_timestamp),
      clean: Boolean(row.clean),
      reusableUntil: row.reusable_until ? String(row.reusable_until) : null,
    };
  }

  private mapExtractFp(row: Record<string, unknown>): ExtractionFingerprint {
    return {
      fingerprintId: String(row.fingerprint_id),
      reviewId: String(row.review_id),
      sourceChecksum: String(row.source_checksum),
      extractionLibrary: String(row.extraction_library),
      extractionLibraryVersion: String(row.extraction_library_version),
      extractionPolicyVersion: String(row.extraction_policy_version),
      ocrEngine: row.ocr_engine ? String(row.ocr_engine) : null,
      ocrEngineVersion: row.ocr_engine_version ? String(row.ocr_engine_version) : null,
      ocrPreprocessingVersion: row.ocr_preprocessing_version
        ? String(row.ocr_preprocessing_version)
        : null,
      pageCount: row.page_count == null ? null : Number(row.page_count),
      extractionTimestamp: String(row.extraction_timestamp),
      confidenceSummary: row.confidence_summary == null ? null : Number(row.confidence_summary),
      outcome: String(row.outcome) as ExtractionFingerprint['outcome'],
    };
  }
}

export function sumDirBytes(dir: string): number {
  if (!existsSync(dir)) return 0;
  let total = 0;
  for (const f of readdirSync(dir)) {
    try {
      const st = statSync(join(dir, f));
      if (st.isFile()) total += st.size;
    } catch {
      /* ignore */
    }
  }
  return total;
}
