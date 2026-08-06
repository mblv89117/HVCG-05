/**
 * Phase 5A — Local synthetic EVA SQLite store.
 * Separated from document-reviews. No SharePoint/Dataverse/Outlook writes.
 */

import { randomUUID } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  EVA_DO_NOT_CONTACT,
  EVA_SCHEMA_VERSION,
  EVA_SOURCE,
  EVA_STORE_SCHEMA_VERSION,
  EVA_SYNTHETIC_BANNER,
  MANNY_OWNER,
  type EvaCompanyRecord,
  type EvaContactRecord,
  type EvaMannyDecision,
  type EvaMatchClass,
  type EvaProspectRecord,
  type EvaReviewOutput,
  type EvaSubmissionPayload,
  type EvaSubmissionRecord,
  type EvaSubmissionStatus,
} from '@hvcg/atlas-integration-core';

export const EVA_DB_FILENAME = 'eva-intake.sqlite';

export function resolveEvaDbPath(
  env: Record<string, string | undefined>,
  repoRoot: string,
): string {
  const configured = (env.LOCAL_AI_EVA_DB || '').trim();
  if (configured) return resolve(configured);
  return resolve(repoRoot, '.data', 'local-ai-eva', EVA_DB_FILENAME);
}

export class EvaStore {
  readonly dbPath: string;
  private db: DatabaseSync;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new DatabaseSync(dbPath);
    try {
      chmodSync(dbPath, 0o600);
    } catch {
      /* best effort on some FS */
    }
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.db.exec('PRAGMA synchronous = NORMAL;');
    this.db.exec('PRAGMA busy_timeout = 5000;');
    this.migrate();
  }

  private migrate() {
    this.db.exec(`
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL,
  label TEXT NOT NULL
);
`);
    const row = this.db
      .prepare('SELECT MAX(version) AS v FROM schema_migrations')
      .get() as { v: number | null } | undefined;
    const current = row?.v ?? 0;
    if (current < 1) {
      this.db.exec(`
CREATE TABLE IF NOT EXISTS eva_submissions (
  submission_id TEXT PRIMARY KEY,
  correlation_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  match_class TEXT,
  match_evidence_json TEXT,
  company_id TEXT,
  contact_id TEXT,
  prospect_id TEXT,
  ai_job_id TEXT,
  model_used TEXT,
  processing_duration_ms INTEGER,
  review_output_json TEXT,
  manny_decision TEXT,
  manny_decision_at TEXT,
  manny_notes TEXT,
  error_detail TEXT,
  record_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_eva_sub_status ON eva_submissions(status);
CREATE INDEX IF NOT EXISTS idx_eva_sub_hash ON eva_submissions(payload_hash);
CREATE INDEX IF NOT EXISTS idx_eva_sub_created ON eva_submissions(created_at);

CREATE TABLE IF NOT EXISTS eva_companies (
  company_id TEXT PRIMARY KEY,
  legal_name TEXT NOT NULL,
  dba TEXT,
  website_domain TEXT,
  email_domain TEXT,
  phone_normalized TEXT,
  address_normalized TEXT,
  industry TEXT,
  created_at TEXT NOT NULL,
  record_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_eva_co_name ON eva_companies(legal_name);
CREATE INDEX IF NOT EXISTS idx_eva_co_web ON eva_companies(website_domain);

CREATE TABLE IF NOT EXISTS eva_contacts (
  contact_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email_normalized TEXT NOT NULL,
  phone_normalized TEXT,
  title TEXT,
  created_at TEXT NOT NULL,
  record_json TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES eva_companies(company_id)
);
CREATE INDEX IF NOT EXISTS idx_eva_ct_email ON eva_contacts(email_normalized);

CREATE TABLE IF NOT EXISTS eva_prospects (
  prospect_id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  submission_id TEXT NOT NULL,
  source TEXT NOT NULL,
  status TEXT NOT NULL,
  recommended_owner TEXT NOT NULL,
  active_client INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  record_json TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES eva_companies(company_id),
  FOREIGN KEY(contact_id) REFERENCES eva_contacts(contact_id),
  FOREIGN KEY(submission_id) REFERENCES eva_submissions(submission_id)
);

CREATE TABLE IF NOT EXISTS eva_audit (
  event_id TEXT PRIMARY KEY,
  submission_id TEXT,
  correlation_id TEXT NOT NULL,
  at TEXT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT,
  json_payload TEXT
);
CREATE INDEX IF NOT EXISTS idx_eva_audit_sub ON eva_audit(submission_id);

CREATE TABLE IF NOT EXISTS eva_failures (
  failure_id TEXT PRIMARY KEY,
  submission_id TEXT,
  correlation_id TEXT NOT NULL,
  at TEXT NOT NULL,
  code TEXT NOT NULL,
  detail TEXT NOT NULL,
  preserved_submission INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS eva_rate_limits (
  bucket_key TEXT PRIMARY KEY,
  window_start TEXT NOT NULL,
  count INTEGER NOT NULL
);
`);
      this.db
        .prepare(
          'INSERT INTO schema_migrations(version, applied_at, label) VALUES (?, ?, ?)',
        )
        .run(1, new Date().toISOString(), EVA_SCHEMA_VERSION);
    }
  }

  close() {
    this.db.close();
  }

  exists(): boolean {
    return existsSync(this.dbPath);
  }

  audit(opts: {
    submissionId?: string | null;
    correlationId: string;
    actor: string;
    action: string;
    detail?: string;
    payload?: unknown;
  }) {
    this.db
      .prepare(
        `INSERT INTO eva_audit(event_id, submission_id, correlation_id, at, actor, action, detail, json_payload)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        randomUUID(),
        opts.submissionId || null,
        opts.correlationId,
        new Date().toISOString(),
        opts.actor,
        opts.action,
        opts.detail || null,
        opts.payload ? JSON.stringify(opts.payload) : null,
      );
  }

  recordFailure(opts: {
    submissionId?: string | null;
    correlationId: string;
    code: string;
    detail: string;
    preserved?: boolean;
  }) {
    this.db
      .prepare(
        `INSERT INTO eva_failures(failure_id, submission_id, correlation_id, at, code, detail, preserved_submission)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        randomUUID(),
        opts.submissionId || null,
        opts.correlationId,
        new Date().toISOString(),
        opts.code,
        opts.detail,
        opts.preserved === false ? 0 : 1,
      );
  }

  checkRateLimit(bucketKey: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const row = this.db
      .prepare('SELECT window_start, count FROM eva_rate_limits WHERE bucket_key = ?')
      .get(bucketKey) as { window_start: string; count: number } | undefined;
    if (!row) {
      this.db
        .prepare(
          'INSERT INTO eva_rate_limits(bucket_key, window_start, count) VALUES (?, ?, 1)',
        )
        .run(bucketKey, new Date(now).toISOString());
      return true;
    }
    const start = Date.parse(row.window_start);
    if (now - start > windowMs) {
      this.db
        .prepare(
          'UPDATE eva_rate_limits SET window_start = ?, count = 1 WHERE bucket_key = ?',
        )
        .run(new Date(now).toISOString(), bucketKey);
      return true;
    }
    if (row.count >= limit) return false;
    this.db
      .prepare('UPDATE eva_rate_limits SET count = count + 1 WHERE bucket_key = ?')
      .run(bucketKey);
    return true;
  }

  getByIdempotencyKey(key: string): EvaSubmissionRecord | null {
    const row = this.db
      .prepare('SELECT record_json FROM eva_submissions WHERE idempotency_key = ?')
      .get(key) as { record_json: string } | undefined;
    return row ? (JSON.parse(row.record_json) as EvaSubmissionRecord) : null;
  }

  getSubmission(id: string): EvaSubmissionRecord | null {
    const row = this.db
      .prepare('SELECT record_json FROM eva_submissions WHERE submission_id = ?')
      .get(id) as { record_json: string } | undefined;
    return row ? (JSON.parse(row.record_json) as EvaSubmissionRecord) : null;
  }

  listSubmissions(status?: string): EvaSubmissionRecord[] {
    const rows = status
      ? (this.db
          .prepare(
            'SELECT record_json FROM eva_submissions WHERE status = ? ORDER BY created_at DESC',
          )
          .all(status) as Array<{ record_json: string }>)
      : (this.db
          .prepare('SELECT record_json FROM eva_submissions ORDER BY created_at DESC')
          .all() as Array<{ record_json: string }>);
    return rows.map((r) => JSON.parse(r.record_json) as EvaSubmissionRecord);
  }

  listCompanies(): EvaCompanyRecord[] {
    const rows = this.db
      .prepare('SELECT record_json FROM eva_companies')
      .all() as Array<{ record_json: string }>;
    return rows.map((r) => JSON.parse(r.record_json) as EvaCompanyRecord);
  }

  listContacts(): EvaContactRecord[] {
    const rows = this.db
      .prepare('SELECT record_json FROM eva_contacts')
      .all() as Array<{ record_json: string }>;
    return rows.map((r) => JSON.parse(r.record_json) as EvaContactRecord);
  }

  listProspects(): EvaProspectRecord[] {
    const rows = this.db
      .prepare('SELECT record_json FROM eva_prospects ORDER BY created_at DESC')
      .all() as Array<{ record_json: string }>;
    return rows.map((r) => JSON.parse(r.record_json) as EvaProspectRecord);
  }

  listAudit(submissionId?: string) {
    const rows = submissionId
      ? (this.db
          .prepare(
            'SELECT * FROM eva_audit WHERE submission_id = ? ORDER BY at DESC',
          )
          .all(submissionId) as Array<Record<string, unknown>>)
      : (this.db
          .prepare('SELECT * FROM eva_audit ORDER BY at DESC LIMIT 200')
          .all() as Array<Record<string, unknown>>);
    return rows;
  }

  listFailures() {
    return this.db
      .prepare('SELECT * FROM eva_failures ORDER BY at DESC LIMIT 100')
      .all() as Array<Record<string, unknown>>;
  }

  upsertSubmission(rec: EvaSubmissionRecord) {
    this.db
      .prepare(
        `INSERT INTO eva_submissions(
          submission_id, correlation_id, idempotency_key, status, created_at, updated_at,
          payload_json, payload_hash, match_class, match_evidence_json, company_id, contact_id,
          prospect_id, ai_job_id, model_used, processing_duration_ms, review_output_json,
          manny_decision, manny_decision_at, manny_notes, error_detail, record_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(submission_id) DO UPDATE SET
          status=excluded.status,
          updated_at=excluded.updated_at,
          match_class=excluded.match_class,
          match_evidence_json=excluded.match_evidence_json,
          company_id=excluded.company_id,
          contact_id=excluded.contact_id,
          prospect_id=excluded.prospect_id,
          ai_job_id=excluded.ai_job_id,
          model_used=excluded.model_used,
          processing_duration_ms=excluded.processing_duration_ms,
          review_output_json=excluded.review_output_json,
          manny_decision=excluded.manny_decision,
          manny_decision_at=excluded.manny_decision_at,
          manny_notes=excluded.manny_notes,
          error_detail=excluded.error_detail,
          record_json=excluded.record_json`,
      )
      .run(
        rec.submissionId,
        rec.correlationId,
        rec.idempotencyKey,
        rec.status,
        rec.createdAt,
        rec.updatedAt,
        JSON.stringify(rec.payload),
        rec.payloadHash,
        rec.matchClass,
        JSON.stringify(rec.matchEvidence),
        rec.companyId,
        rec.contactId,
        rec.prospectId,
        rec.aiJobId,
        rec.modelUsed,
        rec.processingDurationMs,
        rec.reviewOutput ? JSON.stringify(rec.reviewOutput) : null,
        rec.mannyDecision,
        rec.mannyDecisionAt,
        rec.mannyNotes,
        rec.errorDetail,
        JSON.stringify(rec),
      );
  }

  insertCompany(rec: EvaCompanyRecord) {
    this.db
      .prepare(
        `INSERT INTO eva_companies(
          company_id, legal_name, dba, website_domain, email_domain, phone_normalized,
          address_normalized, industry, created_at, record_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        rec.companyId,
        rec.legalName,
        rec.dba ?? null,
        rec.websiteDomain ?? null,
        rec.emailDomain ?? null,
        rec.phoneNormalized ?? null,
        rec.addressNormalized ?? null,
        rec.industry ?? null,
        rec.createdAt,
        JSON.stringify(rec),
      );
  }

  insertContact(rec: EvaContactRecord) {
    this.db
      .prepare(
        `INSERT INTO eva_contacts(
          contact_id, company_id, first_name, last_name, email_normalized, phone_normalized,
          title, created_at, record_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        rec.contactId,
        rec.companyId,
        rec.firstName,
        rec.lastName,
        rec.emailNormalized,
        rec.phoneNormalized ?? null,
        rec.title ?? null,
        rec.createdAt,
        JSON.stringify(rec),
      );
  }

  upsertProspect(rec: EvaProspectRecord) {
    this.db
      .prepare(
        `INSERT INTO eva_prospects(
          prospect_id, company_id, contact_id, submission_id, source, status,
          recommended_owner, active_client, created_at, updated_at, record_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
        ON CONFLICT(prospect_id) DO UPDATE SET
          status=excluded.status,
          updated_at=excluded.updated_at,
          record_json=excluded.record_json`,
      )
      .run(
        rec.prospectId,
        rec.companyId,
        rec.contactId,
        rec.submissionId,
        rec.source,
        rec.status,
        rec.recommendedOwner,
        rec.createdAt,
        rec.updatedAt,
        JSON.stringify(rec),
      );
  }

  performanceSnapshot() {
    const submissions = this.listSubmissions();
    const failures = this.listFailures();
    const duplicates = submissions.filter(
      (s) =>
        s.matchClass === 'exact match' ||
        s.matchClass === 'probable match' ||
        s.mannyDecision === 'Duplicate',
    ).length;
    const withDuration = submissions.filter((s) => s.processingDurationMs != null);
    const avgProcessing =
      withDuration.length === 0
        ? 0
        : withDuration.reduce((a, s) => a + (s.processingDurationMs || 0), 0) /
          withDuration.length;
    const reviewMinutes = submissions
      .map((s) => s.reviewOutput?.time_protection?.estimated_manny_review_minutes || 0)
      .filter(Boolean);
    const saved = submissions
      .map((s) => s.reviewOutput?.time_protection?.estimated_manny_time_saved_minutes || 0)
      .filter(Boolean);
    const avgReview =
      reviewMinutes.length === 0
        ? 0
        : reviewMinutes.reduce((a, n) => a + n, 0) / reviewMinutes.length;
    const avgSaved =
      saved.length === 0 ? 0 : saved.reduce((a, n) => a + n, 0) / saved.length;
    return {
      schemaVersion: EVA_STORE_SCHEMA_VERSION,
      submissions: submissions.length,
      duplicates,
      averageProcessingMs: Math.round(avgProcessing),
      deepRoutingDefault: 'glm-4.7-flash:q4_K_M',
      aiFailures: failures.filter((f) => String(f.code).includes('model')).length,
      validationFailures: failures.filter((f) =>
        String(f.code).includes('validation'),
      ).length,
      averageMannyReviewMinutes: Math.round(avgReview * 10) / 10,
      estimatedMannyTimeSavedMinutes: Math.round(avgSaved * saved.length * 10) / 10,
      banners: {
        syntheticEva: EVA_SYNTHETIC_BANNER,
        doNotContact: EVA_DO_NOT_CONTACT,
      },
      evaIntakeEnabledMustRemainFalse: true,
      noEmail: true,
      noProductionRecords: true,
      noClientActivation: true,
    };
  }
}

export function newSubmissionShell(opts: {
  payload: EvaSubmissionPayload;
  payloadHash: string;
  idempotencyKey: string;
  correlationId: string;
  reviewMode?: EvaSubmissionRecord['reviewMode'];
}): EvaSubmissionRecord {
  const now = new Date().toISOString();
  return {
    submissionId: randomUUID(),
    correlationId: opts.correlationId,
    idempotencyKey: opts.idempotencyKey,
    status: 'Received',
    createdAt: now,
    updatedAt: now,
    payload: opts.payload,
    payloadHash: opts.payloadHash,
    matchClass: null,
    matchEvidence: [],
    companyId: null,
    contactId: null,
    prospectId: null,
    aiJobId: null,
    aiJobIdempotencyKey: null,
    reviewMode: opts.reviewMode || null,
    modelUsed: null,
    modelRouting: null,
    performanceTimings: null,
    uatChecklist: null,
    processingDurationMs: null,
    reviewOutput: null,
    mannyDecision: null,
    mannyDecisionAt: null,
    mannyNotes: null,
    errorDetail: null,
    banners: {
      syntheticEva: EVA_SYNTHETIC_BANNER,
      doNotContact: EVA_DO_NOT_CONTACT,
    },
    draftOnly: true,
    noEmail: true,
    noClientActivation: true,
    noProductionRecords: true,
  };
}

export type {
  EvaSubmissionRecord,
  EvaSubmissionPayload,
  EvaMannyDecision,
  EvaMatchClass,
  EvaSubmissionStatus,
  EvaReviewOutput,
  EvaCompanyRecord,
  EvaContactRecord,
  EvaProspectRecord,
};

export { EVA_SOURCE, MANNY_OWNER, EVA_SYNTHETIC_BANNER, EVA_DO_NOT_CONTACT };
