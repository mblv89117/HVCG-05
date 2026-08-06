/**
 * Phase 4C-1 durable SQLite store for document reviews / packs / audit.
 * Uses Node built-in node:sqlite (DatabaseSync). Local-only, mode 0600.
 */

import { createHash, randomUUID } from 'node:crypto';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  DOCUMENT_DURABLE_SCHEMA_VERSION,
  DOCUMENT_DURABLE_SCHEMA_LABEL,
  DEFAULT_RETENTION,
  assertDurableTransition,
  toDurableStatus,
  type BackupManifest,
  type DurableAuditEvent,
  type DurableCorrectionRecord,
  type DurableDecisionRecord,
  type DurableMultiDocPack,
  type DurableReviewStatus,
  type RetentionPreviewItem,
  type ReviewSearchFilters,
} from '@hvcg/atlas-integration-core';
import type { StagedDocumentRecord } from '@hvcg/atlas-integration-core';

export const DOCUMENT_REVIEW_DB_FILENAME = 'document-reviews.sqlite';

export function resolveDocumentReviewDbPath(
  env: Record<string, string | undefined>,
  repoRoot: string,
): string {
  const configured = (env.LOCAL_AI_DOCUMENT_REVIEW_DB || '').trim();
  if (configured) return resolve(configured);
  return resolve(repoRoot, '.data', 'local-ai-document-reviews', DOCUMENT_REVIEW_DB_FILENAME);
}

const MIGRATIONS: Array<{ version: number; sql: string }> = [
  {
    version: 1,
    sql: `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL,
  label TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS document_reviews (
  review_id TEXT PRIMARY KEY,
  correlation_id TEXT NOT NULL,
  staged_file_id TEXT NOT NULL UNIQUE,
  durable_status TEXT NOT NULL,
  legacy_status TEXT,
  original_filename TEXT NOT NULL,
  safe_filename TEXT NOT NULL,
  extension TEXT,
  client_label TEXT,
  project_label TEXT,
  declared_mime TEXT,
  detected_mime TEXT,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  checksum_sha256 TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  expires_at TEXT,
  malware_status TEXT,
  malware_json TEXT,
  extraction_json TEXT,
  ocr_json TEXT,
  redaction_json TEXT,
  injection_json TEXT,
  deterministic_json TEXT,
  enrichment_json TEXT,
  conflict_json TEXT,
  review_package_json TEXT,
  linked_ai_job_id TEXT,
  model_used TEXT,
  model_routing_json TEXT,
  document_type TEXT,
  proposed_filename TEXT,
  proposed_folder TEXT,
  duplicate_status TEXT,
  work_value_tier TEXT,
  requires_manny_approval INTEGER NOT NULL DEFAULT 1,
  manny_decision TEXT,
  manny_decision_at TEXT,
  redaction_decision TEXT,
  redacted_content TEXT,
  error_detail TEXT,
  purged_at TEXT,
  archived_at TEXT,
  recovery_state TEXT,
  interrupted INTEGER NOT NULL DEFAULT 0,
  draft_only INTEGER NOT NULL DEFAULT 1,
  record_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reviews_status ON document_reviews(durable_status);
CREATE INDEX IF NOT EXISTS idx_reviews_client ON document_reviews(client_label);
CREATE INDEX IF NOT EXISTS idx_reviews_checksum ON document_reviews(checksum_sha256);
CREATE INDEX IF NOT EXISTS idx_reviews_filename ON document_reviews(original_filename);
CREATE INDEX IF NOT EXISTS idx_reviews_type ON document_reviews(document_type);
CREATE INDEX IF NOT EXISTS idx_reviews_decision ON document_reviews(manny_decision);
CREATE INDEX IF NOT EXISTS idx_reviews_updated ON document_reviews(updated_at);

CREATE TABLE IF NOT EXISTS review_transitions (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  at TEXT NOT NULL,
  actor TEXT NOT NULL,
  detail TEXT,
  FOREIGN KEY(review_id) REFERENCES document_reviews(review_id)
);

CREATE TABLE IF NOT EXISTS review_corrections (
  correction_id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL,
  field TEXT NOT NULL,
  original_value TEXT,
  corrected_value TEXT,
  correction_type TEXT NOT NULL,
  corrected_by TEXT NOT NULL,
  corrected_at TEXT NOT NULL,
  reason TEXT,
  source_reference TEXT,
  origin TEXT,
  rule_improvement_candidate INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  superseded_correction_id TEXT,
  FOREIGN KEY(review_id) REFERENCES document_reviews(review_id)
);

CREATE TABLE IF NOT EXISTS review_decisions (
  decision_id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL,
  decision TEXT NOT NULL,
  decided_by TEXT NOT NULL,
  decided_at TEXT NOT NULL,
  notes TEXT,
  file_moved INTEGER NOT NULL DEFAULT 0,
  file_renamed INTEGER NOT NULL DEFAULT 0,
  authoritative_write INTEGER NOT NULL DEFAULT 0,
  external_communication INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(review_id) REFERENCES document_reviews(review_id)
);

CREATE TABLE IF NOT EXISTS multi_document_packs (
  pack_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  client_label TEXT NOT NULL,
  project_label TEXT,
  purpose TEXT,
  sensitivity TEXT NOT NULL DEFAULT 'Confidential',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Open',
  relationship_json TEXT,
  version_relationships_json TEXT,
  duplicate_relationships_json TEXT,
  comparison_json TEXT,
  conflicts_json TEXT,
  missing_documents_json TEXT,
  missing_exhibits_json TEXT,
  missing_signatures_json TEXT,
  pack_recommendation TEXT,
  pack_decision_package_json TEXT,
  manny_decision TEXT,
  manny_decision_at TEXT,
  corrections_json TEXT,
  aggregate_size_bytes INTEGER NOT NULL DEFAULT 0,
  max_files INTEGER NOT NULL DEFAULT 5,
  draft_only INTEGER NOT NULL DEFAULT 1,
  pack_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS multi_document_pack_members (
  id TEXT PRIMARY KEY,
  pack_id TEXT NOT NULL,
  review_id TEXT NOT NULL,
  staged_file_id TEXT NOT NULL,
  added_at TEXT NOT NULL,
  UNIQUE(pack_id, staged_file_id),
  FOREIGN KEY(pack_id) REFERENCES multi_document_packs(pack_id)
);

CREATE TABLE IF NOT EXISTS review_audit_events (
  event_id TEXT PRIMARY KEY,
  correlation_id TEXT NOT NULL,
  review_id TEXT,
  pack_id TEXT,
  at TEXT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_review ON review_audit_events(review_id);
CREATE INDEX IF NOT EXISTS idx_audit_corr ON review_audit_events(correlation_id);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  operation_key TEXT PRIMARY KEY,
  operation TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  correlation_id TEXT,
  created_at TEXT NOT NULL,
  result_json TEXT
);

CREATE TABLE IF NOT EXISTS interrupted_jobs (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  interrupted_at TEXT,
  detail TEXT,
  resume_eligible INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY(review_id) REFERENCES document_reviews(review_id)
);

CREATE TABLE IF NOT EXISTS purge_tombstones (
  review_id TEXT PRIMARY KEY,
  original_filename TEXT,
  checksum_sha256 TEXT,
  purged_at TEXT NOT NULL,
  reason TEXT,
  audit_correlation_id TEXT,
  minimal_json TEXT NOT NULL
);
`,
  },
];

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

export class DocumentReviewDatabase {
  readonly dbPath: string;
  private db: DatabaseSync;
  private retention = { ...DEFAULT_RETENTION };

  constructor(dbPath: string, retentionPartial?: Partial<typeof DEFAULT_RETENTION>) {
    this.dbPath = dbPath;
    mkdirSync(dirname(dbPath), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(dbPath);
    try {
      chmodSync(dbPath, 0o600);
      chmodSync(dirname(dbPath), 0o700);
    } catch {
      /* ignore on some FS */
    }
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    this.runMigrations();
    if (retentionPartial) this.retention = { ...this.retention, ...retentionPartial };
  }

  close() {
    this.db.close();
  }

  getSchemaVersion(): number {
    try {
      const row = this.db.prepare('SELECT MAX(version) AS v FROM schema_migrations').get() as
        | { v: number | null }
        | undefined;
      return Number(row?.v || 0);
    } catch {
      return 0;
    }
  }

  getSchemaLabel(): string {
    return DOCUMENT_DURABLE_SCHEMA_LABEL;
  }

  health(): {
    ok: true;
    dbPath: string;
    schemaVersion: number;
    schemaLabel: string;
    reviewCount: number;
    packCount: number;
    auditCount: number;
    interruptedCount: number;
    dbBytes: number;
  } {
    const reviewCount = Number(
      (this.db.prepare('SELECT COUNT(*) AS c FROM document_reviews').get() as { c: number }).c,
    );
    const packCount = Number(
      (this.db.prepare('SELECT COUNT(*) AS c FROM multi_document_packs').get() as { c: number }).c,
    );
    const auditCount = Number(
      (this.db.prepare('SELECT COUNT(*) AS c FROM review_audit_events').get() as { c: number }).c,
    );
    const interruptedCount = Number(
      (
        this.db
          .prepare(`SELECT COUNT(*) AS c FROM interrupted_jobs WHERE status = 'interrupted'`)
          .get() as { c: number }
      ).c,
    );
    return {
      ok: true,
      dbPath: this.dbPath,
      schemaVersion: this.getSchemaVersion(),
      schemaLabel: this.getSchemaLabel(),
      reviewCount,
      packCount,
      auditCount,
      interruptedCount,
      dbBytes: existsSync(this.dbPath) ? statSync(this.dbPath).size : 0,
    };
  }

  private runMigrations() {
    this.db.exec(`
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL,
  label TEXT NOT NULL
);`);
    const current = this.getSchemaVersion();
    for (const m of MIGRATIONS) {
      if (m.version <= current) continue;
      this.db.exec('BEGIN');
      try {
        this.db.exec(m.sql);
        this.db
          .prepare(
            `INSERT INTO schema_migrations(version, applied_at, label) VALUES (?, ?, ?)`,
          )
          .run(m.version, new Date().toISOString(), DOCUMENT_DURABLE_SCHEMA_LABEL);
        this.db.exec('COMMIT');
      } catch (err) {
        this.db.exec('ROLLBACK');
        throw err;
      }
    }
    if (this.getSchemaVersion() < DOCUMENT_DURABLE_SCHEMA_VERSION) {
      throw new Error(
        `Document review DB schema incomplete: have ${this.getSchemaVersion()}, need ${DOCUMENT_DURABLE_SCHEMA_VERSION}`,
      );
    }
  }

  appendAudit(ev: Omit<DurableAuditEvent, 'eventId'> & { eventId?: string }) {
    const eventId = ev.eventId || randomUUID();
    this.db
      .prepare(
        `INSERT INTO review_audit_events(event_id, correlation_id, review_id, pack_id, at, actor, action, detail, from_status, to_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        eventId,
        ev.correlationId,
        ev.reviewId,
        ev.packId,
        ev.at,
        ev.actor,
        ev.action,
        ev.detail,
        ev.fromStatus,
        ev.toStatus,
      );
    return eventId;
  }

  listAudit(reviewId?: string, limit = 100): DurableAuditEvent[] {
    const rows = reviewId
      ? (this.db
          .prepare(
            `SELECT * FROM review_audit_events WHERE review_id = ? ORDER BY at DESC LIMIT ?`,
          )
          .all(reviewId, limit) as Record<string, unknown>[])
      : (this.db
          .prepare(`SELECT * FROM review_audit_events ORDER BY at DESC LIMIT ?`)
          .all(limit) as Record<string, unknown>[]);
    return rows.map((r) => ({
      eventId: String(r.event_id),
      correlationId: String(r.correlation_id),
      reviewId: r.review_id ? String(r.review_id) : null,
      packId: r.pack_id ? String(r.pack_id) : null,
      at: String(r.at),
      actor: String(r.actor),
      action: String(r.action),
      detail: String(r.detail),
      fromStatus: r.from_status ? String(r.from_status) : null,
      toStatus: r.to_status ? String(r.to_status) : null,
    }));
  }

  /** Idempotency: return prior result if key exists. */
  getIdempotent(operationKey: string): { resourceId: string; result: unknown } | null {
    const row = this.db
      .prepare(`SELECT resource_id, result_json FROM idempotency_keys WHERE operation_key = ?`)
      .get(operationKey) as { resource_id: string; result_json: string } | undefined;
    if (!row) return null;
    return { resourceId: row.resource_id, result: parseJ(row.result_json, null) };
  }

  putIdempotent(opts: {
    operationKey: string;
    operation: string;
    resourceId: string;
    correlationId?: string;
    result: unknown;
  }) {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO idempotency_keys(operation_key, operation, resource_id, correlation_id, created_at, result_json)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        opts.operationKey,
        opts.operation,
        opts.resourceId,
        opts.correlationId || null,
        new Date().toISOString(),
        j(opts.result),
      );
  }

  upsertReviewFromStaged(
    rec: StagedDocumentRecord,
    opts?: { clientLabel?: string; projectLabel?: string | null; actor?: string },
  ): StagedDocumentRecord {
    const durable = toDurableStatus(String(rec.status));
    const existing = this.db
      .prepare(`SELECT durable_status FROM document_reviews WHERE staged_file_id = ?`)
      .get(rec.stagedFileId) as { durable_status: string } | undefined;
    if (existing) {
      assertDurableTransition(existing.durable_status, durable);
    }
    const pack = rec.reviewPackage;
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO document_reviews(
          review_id, correlation_id, staged_file_id, durable_status, legacy_status,
          original_filename, safe_filename, extension, client_label, project_label,
          declared_mime, detected_mime, size_bytes, checksum_sha256, created_at, updated_at, expires_at,
          malware_status, malware_json, extraction_json, ocr_json, redaction_json, injection_json,
          deterministic_json, enrichment_json, conflict_json, review_package_json, linked_ai_job_id,
          model_used, model_routing_json, document_type, proposed_filename, proposed_folder,
          duplicate_status, work_value_tier, requires_manny_approval, manny_decision, manny_decision_at,
          redaction_decision, redacted_content, error_detail, purged_at, archived_at, recovery_state,
          interrupted, draft_only, record_json
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(review_id) DO UPDATE SET
          durable_status=excluded.durable_status,
          legacy_status=excluded.legacy_status,
          updated_at=excluded.updated_at,
          expires_at=excluded.expires_at,
          malware_status=excluded.malware_status,
          malware_json=excluded.malware_json,
          extraction_json=excluded.extraction_json,
          ocr_json=excluded.ocr_json,
          redaction_json=excluded.redaction_json,
          injection_json=excluded.injection_json,
          deterministic_json=excluded.deterministic_json,
          enrichment_json=excluded.enrichment_json,
          conflict_json=excluded.conflict_json,
          review_package_json=excluded.review_package_json,
          linked_ai_job_id=excluded.linked_ai_job_id,
          model_used=excluded.model_used,
          model_routing_json=excluded.model_routing_json,
          document_type=excluded.document_type,
          proposed_filename=excluded.proposed_filename,
          proposed_folder=excluded.proposed_folder,
          duplicate_status=excluded.duplicate_status,
          work_value_tier=excluded.work_value_tier,
          manny_decision=excluded.manny_decision,
          manny_decision_at=excluded.manny_decision_at,
          redaction_decision=excluded.redaction_decision,
          redacted_content=excluded.redacted_content,
          error_detail=excluded.error_detail,
          purged_at=excluded.purged_at,
          client_label=COALESCE(excluded.client_label, document_reviews.client_label),
          project_label=COALESCE(excluded.project_label, document_reviews.project_label),
          interrupted=excluded.interrupted,
          record_json=excluded.record_json
        `,
      )
      .run(
        rec.stagedFileId, // review_id == staged_file_id for 4C-1
        rec.correlationId,
        rec.stagedFileId,
        durable,
        String(rec.status),
        rec.originalFilename,
        rec.safeFilename,
        String(rec.extension),
        opts?.clientLabel || null,
        opts?.projectLabel ?? null,
        rec.declaredMime,
        rec.detectedMime,
        rec.sizeBytes,
        rec.checksumSha256,
        rec.createdAt,
        rec.updatedAt || now,
        rec.expiresAt,
        rec.malwareScanStatus,
        j(rec.malwareScan),
        j(rec.extraction),
        j(rec.extraction?.ocr || null),
        j(pack?.redactionSummary || null),
        j(pack?.injectionWarnings || null),
        j(pack?.deterministicSnapshot || null),
        j(pack?.enrichment || null),
        j(pack?.conflicts || null),
        j(pack),
        rec.linkedAiJobId,
        pack?.modelRouting?.actualModel || null,
        j(pack?.modelRouting || null),
        pack?.classification?.proposedType || null,
        pack?.naming?.proposedFilename || null,
        pack?.folder?.proposedFolderPath || null,
        pack?.duplicate?.status || null,
        pack?.workValueTier || null,
        1,
        rec.mannyDecision,
        rec.mannyDecisionAt,
        rec.redactionDecision,
        rec.redactedContent,
        rec.errorDetail,
        rec.purgedAt,
        durable === 'Archived' ? now : null,
        null,
        durable === 'AI Enrichment In Progress' || durable === 'Extraction Pending' ? 1 : 0,
        1,
        j(rec),
      );

    if (!existing || existing.durable_status !== durable) {
      this.db
        .prepare(
          `INSERT INTO review_transitions(id, review_id, from_status, to_status, at, actor, detail)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          randomUUID(),
          rec.stagedFileId,
          existing?.durable_status || null,
          durable,
          now,
          opts?.actor || 'LocalAI',
          `status→${durable}`,
        );
      this.appendAudit({
        correlationId: rec.correlationId,
        reviewId: rec.stagedFileId,
        packId: null,
        at: now,
        actor: opts?.actor || 'LocalAI',
        action: 'review_status_transition',
        detail: `${existing?.durable_status || '∅'} → ${durable}`,
        fromStatus: existing?.durable_status || null,
        toStatus: durable,
      });
    }
    return rec;
  }

  getReview(reviewId: string): StagedDocumentRecord | null {
    const row = this.db
      .prepare(`SELECT record_json, durable_status FROM document_reviews WHERE review_id = ? OR staged_file_id = ?`)
      .get(reviewId, reviewId) as { record_json: string; durable_status: string } | undefined;
    if (!row) return null;
    const rec = parseJ<StagedDocumentRecord | null>(row.record_json, null);
    if (!rec) return null;
    return { ...rec, status: row.durable_status as StagedDocumentRecord['status'] };
  }

  listReviews(limit = 200): StagedDocumentRecord[] {
    const rows = this.db
      .prepare(
        `SELECT record_json, durable_status FROM document_reviews
         WHERE durable_status NOT IN ('Purged')
         ORDER BY updated_at DESC LIMIT ?`,
      )
      .all(limit) as Array<{ record_json: string; durable_status: string }>;
    return rows.map((r) => {
      const rec = parseJ<StagedDocumentRecord>(r.record_json, null as never);
      return { ...rec, status: r.durable_status as StagedDocumentRecord['status'] };
    });
  }

  searchReviews(filters: ReviewSearchFilters): StagedDocumentRecord[] {
    const clauses: string[] = ['1=1'];
    const args: unknown[] = [];
    const eq = (col: string, v: unknown) => {
      clauses.push(`${col} = ?`);
      args.push(v);
    };
    const like = (col: string, v: string) => {
      clauses.push(`${col} LIKE ?`);
      args.push(`%${v}%`);
    };
    if (filters.reviewId) eq('review_id', filters.reviewId);
    if (filters.originalFilename) like('original_filename', filters.originalFilename);
    if (filters.proposedFilename) like('proposed_filename', filters.proposedFilename);
    if (filters.checksum) {
      clauses.push('checksum_sha256 LIKE ?');
      args.push(`${filters.checksum}%`);
    }
    if (filters.documentType) eq('document_type', filters.documentType);
    if (filters.clientLabel) like('client_label', filters.clientLabel);
    if (filters.projectLabel) like('project_label', filters.projectLabel);
    if (filters.status) eq('durable_status', toDurableStatus(filters.status));
    if (filters.dateFrom) {
      clauses.push('created_at >= ?');
      args.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      clauses.push('created_at <= ?');
      args.push(filters.dateTo);
    }
    if (filters.modelUsed) like('model_used', filters.modelUsed);
    if (filters.malwareResult) eq('malware_status', filters.malwareResult);
    if (filters.duplicateStatus) eq('duplicate_status', filters.duplicateStatus);
    if (filters.mannyDecision) eq('manny_decision', filters.mannyDecision);
    if (filters.workValueTier) eq('work_value_tier', filters.workValueTier);
    if (filters.requiresMannyApproval != null)
      eq('requires_manny_approval', filters.requiresMannyApproval ? 1 : 0);
    if (filters.archived) eq('durable_status', 'Archived');
    if (filters.expired) eq('durable_status', 'Expired');
    if (filters.purged === true) eq('durable_status', 'Purged');
    if (filters.purged === false) clauses.push(`durable_status != 'Purged'`);

    const limit = Math.min(Math.max(filters.limit || 100, 1), 500);
    const offset = Math.max(filters.offset || 0, 0);
    const sql = `SELECT record_json, durable_status FROM document_reviews WHERE ${clauses.join(' AND ')} ORDER BY updated_at DESC LIMIT ? OFFSET ?`;
    const rows = this.db.prepare(sql).all(...args, limit, offset) as Array<{
      record_json: string;
      durable_status: string;
    }>;
    return rows.map((r) => {
      const rec = parseJ<StagedDocumentRecord>(r.record_json, null as never);
      return { ...rec, status: r.durable_status as StagedDocumentRecord['status'] };
    });
  }

  addCorrection(c: DurableCorrectionRecord) {
    this.db
      .prepare(
        `INSERT INTO review_corrections(
          correction_id, review_id, field, original_value, corrected_value, correction_type,
          corrected_by, corrected_at, reason, source_reference, origin,
          rule_improvement_candidate, active, superseded_correction_id
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        c.correctionId,
        c.reviewId,
        c.field,
        j(c.originalValue),
        j(c.correctedValue),
        c.correctionType,
        c.correctedBy,
        c.correctedAt,
        c.reason,
        c.sourceReference,
        c.origin,
        c.ruleImprovementCandidate ? 1 : 0,
        c.active ? 1 : 0,
        c.supersededCorrectionId,
      );
  }

  listCorrections(reviewId: string): DurableCorrectionRecord[] {
    const rows = this.db
      .prepare(`SELECT * FROM review_corrections WHERE review_id = ? ORDER BY corrected_at DESC`)
      .all(reviewId) as Record<string, unknown>[];
    return rows.map((r) => ({
      correctionId: String(r.correction_id),
      reviewId: String(r.review_id),
      field: String(r.field),
      originalValue: parseJ(String(r.original_value), null),
      correctedValue: parseJ(String(r.corrected_value), null),
      correctionType: String(r.correction_type),
      correctedBy: 'Manny',
      correctedAt: String(r.corrected_at),
      reason: String(r.reason || ''),
      sourceReference: r.source_reference ? String(r.source_reference) : null,
      origin: (String(r.origin || 'unknown') as DurableCorrectionRecord['origin']),
      ruleImprovementCandidate: Boolean(r.rule_improvement_candidate),
      active: Boolean(r.active),
      supersededCorrectionId: r.superseded_correction_id
        ? String(r.superseded_correction_id)
        : null,
    }));
  }

  addDecision(d: DurableDecisionRecord) {
    this.db
      .prepare(
        `INSERT INTO review_decisions(
          decision_id, review_id, decision, decided_by, decided_at, notes,
          file_moved, file_renamed, authoritative_write, external_communication
        ) VALUES (?,?,?,?,?,?,0,0,0,0)`,
      )
      .run(d.decisionId, d.reviewId, d.decision, d.decidedBy, d.decidedAt, d.notes);
  }

  listDecisions(reviewId: string): DurableDecisionRecord[] {
    const rows = this.db
      .prepare(`SELECT * FROM review_decisions WHERE review_id = ? ORDER BY decided_at DESC`)
      .all(reviewId) as Record<string, unknown>[];
    return rows.map((r) => ({
      decisionId: String(r.decision_id),
      reviewId: String(r.review_id),
      decision: String(r.decision),
      decidedBy: 'Manny',
      decidedAt: String(r.decided_at),
      notes: r.notes ? String(r.notes) : null,
      fileMoved: false,
      fileRenamed: false,
      authoritativeWrite: false,
      externalCommunication: false,
    }));
  }

  upsertPack(pack: DurableMultiDocPack) {
    this.db
      .prepare(
        `INSERT INTO multi_document_packs(
          pack_id, title, client_label, project_label, purpose, sensitivity,
          created_at, updated_at, status, relationship_json, version_relationships_json,
          duplicate_relationships_json, comparison_json, conflicts_json,
          missing_documents_json, missing_exhibits_json, missing_signatures_json,
          pack_recommendation, pack_decision_package_json, manny_decision, manny_decision_at,
          corrections_json, aggregate_size_bytes, max_files, draft_only, pack_json
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(pack_id) DO UPDATE SET
          title=excluded.title,
          updated_at=excluded.updated_at,
          status=excluded.status,
          relationship_json=excluded.relationship_json,
          version_relationships_json=excluded.version_relationships_json,
          duplicate_relationships_json=excluded.duplicate_relationships_json,
          comparison_json=excluded.comparison_json,
          conflicts_json=excluded.conflicts_json,
          missing_documents_json=excluded.missing_documents_json,
          missing_exhibits_json=excluded.missing_exhibits_json,
          missing_signatures_json=excluded.missing_signatures_json,
          pack_recommendation=excluded.pack_recommendation,
          pack_decision_package_json=excluded.pack_decision_package_json,
          manny_decision=excluded.manny_decision,
          manny_decision_at=excluded.manny_decision_at,
          corrections_json=excluded.corrections_json,
          aggregate_size_bytes=excluded.aggregate_size_bytes,
          pack_json=excluded.pack_json`,
      )
      .run(
        pack.packId,
        pack.title,
        pack.clientLabel,
        pack.projectLabel,
        pack.purpose,
        pack.sensitivity,
        pack.createdAt,
        pack.updatedAt,
        pack.status,
        j(pack.relationshipAnalysis),
        j(pack.versionRelationships),
        j(pack.duplicateRelationships),
        j(pack.comparisonFindings),
        j(pack.crossDocumentConflicts),
        j(pack.missingDocuments),
        j(pack.missingExhibits),
        j(pack.missingSignatures),
        pack.packRecommendation,
        j(pack.packDecisionPackage),
        pack.mannyDecision,
        pack.mannyDecisionAt,
        j(pack.corrections),
        pack.aggregateSizeBytes,
        pack.maxFiles,
        1,
        j(pack),
      );
    this.db.prepare(`DELETE FROM multi_document_pack_members WHERE pack_id = ?`).run(pack.packId);
    for (const sid of pack.stagedFileIds) {
      this.db
        .prepare(
          `INSERT INTO multi_document_pack_members(id, pack_id, review_id, staged_file_id, added_at)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(randomUUID(), pack.packId, sid, sid, pack.updatedAt);
    }
  }

  getPack(packId: string): DurableMultiDocPack | null {
    const row = this.db
      .prepare(`SELECT pack_json FROM multi_document_packs WHERE pack_id = ?`)
      .get(packId) as { pack_json: string } | undefined;
    return row ? parseJ<DurableMultiDocPack | null>(row.pack_json, null) : null;
  }

  listPacks(limit = 100): DurableMultiDocPack[] {
    const rows = this.db
      .prepare(`SELECT pack_json FROM multi_document_packs ORDER BY updated_at DESC LIMIT ?`)
      .all(limit) as Array<{ pack_json: string }>;
    return rows.map((r) => parseJ<DurableMultiDocPack>(r.pack_json, null as never));
  }

  markInterrupted(reviewId: string, operation: string, detail: string) {
    this.db
      .prepare(
        `INSERT INTO interrupted_jobs(id, review_id, operation, status, started_at, interrupted_at, detail, resume_eligible)
         VALUES (?, ?, ?, 'interrupted', ?, ?, ?, 1)`,
      )
      .run(randomUUID(), reviewId, operation, new Date().toISOString(), new Date().toISOString(), detail);
    this.db
      .prepare(`UPDATE document_reviews SET interrupted = 1, recovery_state = ? WHERE review_id = ?`)
      .run('interrupted_needs_review', reviewId);
  }

  listInterrupted() {
    return this.db
      .prepare(
        `SELECT * FROM interrupted_jobs WHERE status = 'interrupted' ORDER BY interrupted_at DESC`,
      )
      .all() as Record<string, unknown>[];
  }

  resolveInterrupted(id: string, status: 'resumed' | 'cancelled') {
    this.db
      .prepare(`UPDATE interrupted_jobs SET status = ?, resume_eligible = 0 WHERE id = ?`)
      .run(status, id);
  }

  /** On startup: mark in-progress enrichment/extraction as interrupted for Manny review. */
  recoverOnStartup(actor = 'LocalAI'): { marked: number; actions: string[] } {
    const actions: string[] = [];
    const rows = this.db
      .prepare(
        `SELECT review_id, durable_status, correlation_id FROM document_reviews
         WHERE durable_status IN ('AI Enrichment In Progress', 'Extraction Pending', 'Malware Scan Pending')
            OR interrupted = 1`,
      )
      .all() as Array<{ review_id: string; durable_status: string; correlation_id: string }>;
    let marked = 0;
    for (const r of rows) {
      this.markInterrupted(r.review_id, r.durable_status, 'Recovered after restart — no auto-reprocess');
      this.appendAudit({
        correlationId: r.correlation_id,
        reviewId: r.review_id,
        packId: null,
        at: new Date().toISOString(),
        actor,
        action: 'restart_recovery',
        detail: `Marked interrupted: was ${r.durable_status}; no automatic reprocess`,
        fromStatus: r.durable_status,
        toStatus: r.durable_status,
      });
      actions.push(`${r.review_id}:${r.durable_status}`);
      marked += 1;
    }
    return { marked, actions };
  }

  retentionPreview(now = Date.now()): RetentionPreviewItem[] {
    const rows = this.db
      .prepare(
        `SELECT review_id, original_filename, durable_status, expires_at, purged_at, record_json
         FROM document_reviews WHERE durable_status != 'Purged'`,
      )
      .all() as Array<Record<string, unknown>>;
    const out: RetentionPreviewItem[] = [];
    for (const r of rows) {
      const expiresAt = r.expires_at ? String(r.expires_at) : null;
      const status = String(r.durable_status);
      let reason = '';
      let would = false;
      if (expiresAt && new Date(expiresAt).getTime() <= now) {
        reason = 'TTL expired for staged original';
        would = true;
      } else if (status === 'Approved Draft' || status === 'Archived') {
        const updated = parseJ<StagedDocumentRecord>(String(r.record_json), null as never)?.updatedAt;
        if (updated) {
          const ageDays = (now - new Date(updated).getTime()) / 86400000;
          if (ageDays >= this.retention.archivedReviewDays) {
            reason = `Archived/approved older than ${this.retention.archivedReviewDays}d`;
            would = true;
          }
        }
      }
      if (would) {
        out.push({
          reviewId: String(r.review_id),
          originalFilename: String(r.original_filename),
          status,
          reason,
          stagedFilePresent: true,
          expiresAt,
          wouldPurgeContent: true,
          wouldKeepTombstone: true,
        });
      }
    }
    return out;
  }

  purgeReview(reviewId: string, reason: string, correlationId: string): StagedDocumentRecord | null {
    const rec = this.getReview(reviewId);
    if (!rec) return null;
    const now = new Date().toISOString();
    const tombstone = {
      reviewId,
      originalFilename: rec.originalFilename,
      checksumSha256: rec.checksumSha256,
      purgedAt: now,
      reason,
      lastStatus: toDurableStatus(String(rec.status)),
    };
    this.db
      .prepare(
        `INSERT OR REPLACE INTO purge_tombstones(review_id, original_filename, checksum_sha256, purged_at, reason, audit_correlation_id, minimal_json)
         VALUES (?,?,?,?,?,?,?)`,
      )
      .run(
        reviewId,
        rec.originalFilename,
        rec.checksumSha256,
        now,
        reason,
        correlationId,
        j(tombstone),
      );
    const purged: StagedDocumentRecord = {
      ...rec,
      status: 'Purged' as StagedDocumentRecord['status'],
      purgedAt: now,
      updatedAt: now,
      absolutePathHint: '[purged]',
      redactedContent: null,
      extraction: null,
      reviewPackage: rec.reviewPackage
        ? {
            ...rec.reviewPackage,
            extraction: {
              ...rec.reviewPackage.extraction,
              pages: [],
            },
          }
        : null,
      errorDetail: reason,
    };
    this.upsertReviewFromStaged(purged, { actor: 'Manny' });
    this.appendAudit({
      correlationId,
      reviewId,
      packId: null,
      at: now,
      actor: 'Manny',
      action: 'review_purged',
      detail: `Content purged; tombstone retained. ${reason}`,
      fromStatus: toDurableStatus(String(rec.status)),
      toStatus: 'Purged',
    });
    return purged;
  }

  createBackup(backupDir: string, dryRun = false): BackupManifest {
    mkdirSync(backupDir, { recursive: true, mode: 0o700 });
    const backupId = randomUUID();
    const createdAt = new Date().toISOString();
    const dest = join(backupDir, `document-reviews-${backupId}.sqlite`);
    if (!dryRun) {
      // Checkpoint WAL then copy
      try {
        this.db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
      } catch {
        /* ignore */
      }
      copyFileSync(this.dbPath, dest);
      chmodSync(dest, 0o600);
    }
    const bytes = dryRun
      ? (existsSync(this.dbPath) ? readFileSync(this.dbPath) : Buffer.alloc(0))
      : readFileSync(dest);
    const checksumSha256 = createHash('sha256').update(bytes).digest('hex');
    const health = this.health();
    const manifest: BackupManifest = {
      backupId,
      createdAt,
      schemaVersion: health.schemaVersion,
      schemaLabel: health.schemaLabel,
      pathHint: dryRun ? '[dry-run — no file written]' : dest,
      checksumSha256,
      includeStagedOriginals: false,
      reviewCount: health.reviewCount,
      packCount: health.packCount,
      auditCount: health.auditCount,
      dryRun,
    };
    if (!dryRun) {
      writeFileSync(join(backupDir, `document-reviews-${backupId}.manifest.json`), j(manifest), {
        mode: 0o600,
      });
    }
    return manifest;
  }

  validateRestore(backupSqlitePath: string): { ok: boolean; errors: string[]; schemaVersion?: number } {
    const errors: string[] = [];
    const abs = resolve(backupSqlitePath);
    if (!abs.startsWith(resolve(dirname(this.dbPath))) && !abs.includes('backup')) {
      // Allow paths under configured backup dirs or temp — still require file exists
    }
    if (abs.includes('..')) {
      return { ok: false, errors: ['path_traversal_rejected'] };
    }
    if (!existsSync(abs)) return { ok: false, errors: ['backup_not_found'] };
    try {
      const probe = new DatabaseSync(abs, { readOnly: true });
      const row = probe.prepare('SELECT MAX(version) AS v FROM schema_migrations').get() as
        | { v: number }
        | undefined;
      const v = Number(row?.v || 0);
      probe.close();
      if (v < 1) errors.push('schema_version_invalid');
      return { ok: errors.length === 0, errors, schemaVersion: v };
    } catch (err) {
      return {
        ok: false,
        errors: [err instanceof Error ? err.message : 'restore_validation_failed'],
      };
    }
  }

  /** Restore replaces current DB file after validation. Destructive — call only after backup. */
  restoreFromBackup(backupSqlitePath: string, opts?: { dryRun?: boolean }) {
    const validation = this.validateRestore(backupSqlitePath);
    if (!validation.ok) {
      throw Object.assign(new Error(validation.errors.join('; ')), {
        status: 400,
        code: 'restore_validation_failed',
      });
    }
    if (opts?.dryRun) {
      return { restored: false, dryRun: true, validation };
    }
    this.db.close();
    const tmp = `${this.dbPath}.restoring`;
    copyFileSync(resolve(backupSqlitePath), tmp);
    renameSync(tmp, this.dbPath);
    chmodSync(this.dbPath, 0o600);
    // Re-open
    (this as { db: DatabaseSync }).db = new DatabaseSync(this.dbPath);
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    return { restored: true, dryRun: false, validation };
  }
}

export function assertSafeBackupPath(candidate: string, allowedRoot: string) {
  const abs = resolve(candidate);
  const root = resolve(allowedRoot);
  if (!abs.startsWith(root + '/') && abs !== root) {
    throw Object.assign(new Error('Backup path outside allowed root'), {
      status: 400,
      code: 'path_traversal_rejected',
    });
  }
  if (basename(abs).includes('..')) {
    throw Object.assign(new Error('Invalid backup path'), {
      status: 400,
      code: 'path_traversal_rejected',
    });
  }
  return abs;
}
