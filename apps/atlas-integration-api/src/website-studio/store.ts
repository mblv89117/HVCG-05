/**
 * Phase 6A Website Studio durable local store (SQLite).
 */

import { randomUUID } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  WEBSITE_STUDIO_SCHEMA_VERSION,
  type ContentBlockRecord,
  type DeploymentRecord,
  type FormInventoryRecord,
  type MediaAssetRecord,
  type PreviewSession,
  type QaChecklistItem,
  type RollbackRecord,
  type WebsiteChangeRequest,
  type WebsiteDiscoveryResult,
  type WebsitePageRecord,
  type WebsiteProductionBaseline,
  type WebsiteRegistryRecord,
} from '@hvcg/atlas-integration-core';

export function resolveWebsiteStudioDbPath(
  env: Record<string, string | undefined>,
  repoRoot: string,
): string {
  const configured = (env.WEBSITE_STUDIO_DB || '').trim();
  if (configured) return resolve(configured);
  return resolve(repoRoot, '.data', 'website-studio', 'website-studio.sqlite');
}

export class WebsiteStudioStore {
  readonly dbPath: string;
  private db: DatabaseSync;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new DatabaseSync(dbPath);
    try {
      chmodSync(dbPath, 0o600);
    } catch {
      /* best effort */
    }
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA foreign_keys = ON;');
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
    if ((row?.v ?? 0) < 1) {
      this.db.exec(`
CREATE TABLE IF NOT EXISTS websites (
  website_id TEXT PRIMARY KEY,
  record_json TEXT NOT NULL,
  name TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS pages (
  page_id TEXT PRIMARY KEY,
  website_id TEXT NOT NULL,
  record_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS blocks (
  block_id TEXT PRIMARY KEY,
  website_id TEXT NOT NULL,
  page_id TEXT NOT NULL,
  record_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS media (
  media_id TEXT PRIMARY KEY,
  website_id TEXT NOT NULL,
  record_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS forms (
  form_id TEXT PRIMARY KEY,
  website_id TEXT NOT NULL,
  record_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS change_requests (
  change_request_id TEXT PRIMARY KEY,
  website_id TEXT NOT NULL,
  status TEXT NOT NULL,
  record_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS discoveries (
  discovery_id TEXT PRIMARY KEY,
  record_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS previews (
  preview_id TEXT PRIMARY KEY,
  change_request_id TEXT NOT NULL,
  record_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS qa_checklists (
  change_request_id TEXT PRIMARY KEY,
  items_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS deployments (
  deployment_id TEXT PRIMARY KEY,
  website_id TEXT NOT NULL,
  record_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS rollbacks (
  rollback_id TEXT PRIMARY KEY,
  website_id TEXT NOT NULL,
  record_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit (
  event_id TEXT PRIMARY KEY,
  at TEXT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  correlation_id TEXT,
  detail TEXT,
  json_payload TEXT
);
`);
      this.db
        .prepare('INSERT INTO schema_migrations(version, applied_at, label) VALUES (1, ?, ?)')
        .run(new Date().toISOString(), WEBSITE_STUDIO_SCHEMA_VERSION);
    }
    const row2 = this.db
      .prepare('SELECT MAX(version) AS v FROM schema_migrations')
      .get() as { v: number | null } | undefined;
    if ((row2?.v ?? 0) < 2) {
      this.db.exec(`
CREATE TABLE IF NOT EXISTS baselines (
  baseline_id TEXT PRIMARY KEY,
  website_id TEXT NOT NULL,
  record_json TEXT NOT NULL,
  captured_at TEXT NOT NULL
);
`);
      this.db
        .prepare('INSERT INTO schema_migrations(version, applied_at, label) VALUES (2, ?, ?)')
        .run(new Date().toISOString(), 'phase6b-baselines');
    }
  }

  close() {
    this.db.close();
  }

  audit(opts: {
    actor: string;
    action: string;
    correlationId?: string;
    detail?: string;
    payload?: unknown;
  }) {
    this.db
      .prepare(
        `INSERT INTO audit(event_id, at, actor, action, correlation_id, detail, json_payload)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        randomUUID(),
        new Date().toISOString(),
        opts.actor,
        opts.action,
        opts.correlationId || null,
        opts.detail || null,
        opts.payload ? JSON.stringify(opts.payload) : null,
      );
  }

  listAudit(limit = 100) {
    return this.db
      .prepare('SELECT * FROM audit ORDER BY at DESC LIMIT ?')
      .all(limit) as Array<Record<string, unknown>>;
  }

  upsertWebsite(rec: WebsiteRegistryRecord) {
    this.db
      .prepare(
        `INSERT INTO websites(website_id, record_json, name, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(website_id) DO UPDATE SET record_json=excluded.record_json, name=excluded.name, updated_at=excluded.updated_at`,
      )
      .run(rec.websiteId, JSON.stringify(rec), rec.websiteName, rec.updatedAt);
  }

  getWebsite(id: string): WebsiteRegistryRecord | null {
    const row = this.db
      .prepare('SELECT record_json FROM websites WHERE website_id = ?')
      .get(id) as { record_json: string } | undefined;
    return row ? (JSON.parse(row.record_json) as WebsiteRegistryRecord) : null;
  }

  listWebsites(): WebsiteRegistryRecord[] {
    return (
      this.db.prepare('SELECT record_json FROM websites ORDER BY name').all() as Array<{
        record_json: string;
      }>
    ).map((r) => JSON.parse(r.record_json) as WebsiteRegistryRecord);
  }

  findWebsiteByName(name: string): WebsiteRegistryRecord | null {
    const n = name.trim().toLowerCase();
    return this.listWebsites().find((w) => w.websiteName.toLowerCase() === n) || null;
  }

  upsertPage(rec: WebsitePageRecord) {
    this.db
      .prepare(
        `INSERT INTO pages(page_id, website_id, record_json) VALUES (?, ?, ?)
         ON CONFLICT(page_id) DO UPDATE SET record_json=excluded.record_json`,
      )
      .run(rec.pageId, rec.websiteId, JSON.stringify(rec));
  }

  listPages(websiteId: string): WebsitePageRecord[] {
    return (
      this.db
        .prepare('SELECT record_json FROM pages WHERE website_id = ?')
        .all(websiteId) as Array<{ record_json: string }>
    ).map((r) => JSON.parse(r.record_json) as WebsitePageRecord);
  }

  upsertBlock(rec: ContentBlockRecord) {
    this.db
      .prepare(
        `INSERT INTO blocks(block_id, website_id, page_id, record_json) VALUES (?, ?, ?, ?)
         ON CONFLICT(block_id) DO UPDATE SET record_json=excluded.record_json`,
      )
      .run(rec.blockId, rec.websiteId, rec.pageId, JSON.stringify(rec));
  }

  listBlocks(websiteId: string, pageId?: string): ContentBlockRecord[] {
    const rows = pageId
      ? (this.db
          .prepare('SELECT record_json FROM blocks WHERE website_id = ? AND page_id = ?')
          .all(websiteId, pageId) as Array<{ record_json: string }>)
      : (this.db
          .prepare('SELECT record_json FROM blocks WHERE website_id = ?')
          .all(websiteId) as Array<{ record_json: string }>);
    return rows.map((r) => JSON.parse(r.record_json) as ContentBlockRecord);
  }

  upsertMedia(rec: MediaAssetRecord) {
    this.db
      .prepare(
        `INSERT INTO media(media_id, website_id, record_json) VALUES (?, ?, ?)
         ON CONFLICT(media_id) DO UPDATE SET record_json=excluded.record_json`,
      )
      .run(rec.mediaId, rec.websiteId, JSON.stringify(rec));
  }

  listMedia(websiteId: string): MediaAssetRecord[] {
    return (
      this.db
        .prepare('SELECT record_json FROM media WHERE website_id = ?')
        .all(websiteId) as Array<{ record_json: string }>
    ).map((r) => JSON.parse(r.record_json) as MediaAssetRecord);
  }

  upsertForm(rec: FormInventoryRecord) {
    this.db
      .prepare(
        `INSERT INTO forms(form_id, website_id, record_json) VALUES (?, ?, ?)
         ON CONFLICT(form_id) DO UPDATE SET record_json=excluded.record_json`,
      )
      .run(rec.formId, rec.websiteId, JSON.stringify(rec));
  }

  listForms(websiteId: string): FormInventoryRecord[] {
    return (
      this.db
        .prepare('SELECT record_json FROM forms WHERE website_id = ?')
        .all(websiteId) as Array<{ record_json: string }>
    ).map((r) => JSON.parse(r.record_json) as FormInventoryRecord);
  }

  upsertChangeRequest(rec: WebsiteChangeRequest) {
    this.db
      .prepare(
        `INSERT INTO change_requests(change_request_id, website_id, status, record_json, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(change_request_id) DO UPDATE SET
           status=excluded.status, record_json=excluded.record_json, updated_at=excluded.updated_at`,
      )
      .run(
        rec.changeRequestId,
        rec.websiteId,
        rec.status,
        JSON.stringify(rec),
        rec.updatedAt,
      );
  }

  getChangeRequest(id: string): WebsiteChangeRequest | null {
    const row = this.db
      .prepare('SELECT record_json FROM change_requests WHERE change_request_id = ?')
      .get(id) as { record_json: string } | undefined;
    return row ? (JSON.parse(row.record_json) as WebsiteChangeRequest) : null;
  }

  listChangeRequests(websiteId?: string): WebsiteChangeRequest[] {
    const rows = websiteId
      ? (this.db
          .prepare(
            'SELECT record_json FROM change_requests WHERE website_id = ? ORDER BY updated_at DESC',
          )
          .all(websiteId) as Array<{ record_json: string }>)
      : (this.db
          .prepare('SELECT record_json FROM change_requests ORDER BY updated_at DESC')
          .all() as Array<{ record_json: string }>);
    return rows.map((r) => JSON.parse(r.record_json) as WebsiteChangeRequest);
  }

  saveDiscovery(rec: WebsiteDiscoveryResult) {
    this.db
      .prepare(
        `INSERT INTO discoveries(discovery_id, record_json) VALUES (?, ?)
         ON CONFLICT(discovery_id) DO UPDATE SET record_json=excluded.record_json`,
      )
      .run(rec.discoveryId, JSON.stringify(rec));
  }

  listDiscoveries(): WebsiteDiscoveryResult[] {
    return (
      this.db.prepare('SELECT record_json FROM discoveries').all() as Array<{
        record_json: string;
      }>
    ).map((r) => JSON.parse(r.record_json) as WebsiteDiscoveryResult);
  }

  savePreview(rec: PreviewSession) {
    this.db
      .prepare(
        `INSERT INTO previews(preview_id, change_request_id, record_json) VALUES (?, ?, ?)
         ON CONFLICT(preview_id) DO UPDATE SET record_json=excluded.record_json`,
      )
      .run(rec.previewId, rec.changeRequestId, JSON.stringify(rec));
  }

  listPreviews(): PreviewSession[] {
    return (
      this.db.prepare('SELECT record_json FROM previews').all() as Array<{ record_json: string }>
    ).map((r) => JSON.parse(r.record_json) as PreviewSession);
  }

  saveQa(changeRequestId: string, items: QaChecklistItem[]) {
    this.db
      .prepare(
        `INSERT INTO qa_checklists(change_request_id, items_json) VALUES (?, ?)
         ON CONFLICT(change_request_id) DO UPDATE SET items_json=excluded.items_json`,
      )
      .run(changeRequestId, JSON.stringify(items));
  }

  getQa(changeRequestId: string): QaChecklistItem[] {
    const row = this.db
      .prepare('SELECT items_json FROM qa_checklists WHERE change_request_id = ?')
      .get(changeRequestId) as { items_json: string } | undefined;
    return row ? (JSON.parse(row.items_json) as QaChecklistItem[]) : [];
  }

  upsertDeployment(rec: DeploymentRecord) {
    this.db
      .prepare(
        `INSERT INTO deployments(deployment_id, website_id, record_json) VALUES (?, ?, ?)
         ON CONFLICT(deployment_id) DO UPDATE SET record_json=excluded.record_json`,
      )
      .run(rec.deploymentId, rec.websiteId, JSON.stringify(rec));
  }

  listDeployments(): DeploymentRecord[] {
    return (
      this.db.prepare('SELECT record_json FROM deployments').all() as Array<{
        record_json: string;
      }>
    ).map((r) => JSON.parse(r.record_json) as DeploymentRecord);
  }

  upsertRollback(rec: RollbackRecord) {
    this.db
      .prepare(
        `INSERT INTO rollbacks(rollback_id, website_id, record_json) VALUES (?, ?, ?)
         ON CONFLICT(rollback_id) DO UPDATE SET record_json=excluded.record_json`,
      )
      .run(rec.rollbackId, rec.websiteId, JSON.stringify(rec));
  }

  listRollbacks(): RollbackRecord[] {
    return (
      this.db.prepare('SELECT record_json FROM rollbacks').all() as Array<{
        record_json: string;
      }>
    ).map((r) => JSON.parse(r.record_json) as RollbackRecord);
  }

  upsertBaseline(rec: WebsiteProductionBaseline) {
    this.db
      .prepare(
        `INSERT INTO baselines(baseline_id, website_id, record_json, captured_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(baseline_id) DO UPDATE SET record_json=excluded.record_json, captured_at=excluded.captured_at`,
      )
      .run(rec.baselineId, rec.websiteId, JSON.stringify(rec), rec.capturedAt);
  }

  listBaselines(websiteId?: string): WebsiteProductionBaseline[] {
    const rows = websiteId
      ? (this.db
          .prepare(
            'SELECT record_json FROM baselines WHERE website_id = ? ORDER BY captured_at DESC',
          )
          .all(websiteId) as Array<{ record_json: string }>)
      : (this.db
          .prepare('SELECT record_json FROM baselines ORDER BY captured_at DESC')
          .all() as Array<{ record_json: string }>);
    return rows.map((r) => JSON.parse(r.record_json) as WebsiteProductionBaseline);
  }

  latestBaseline(websiteId: string): WebsiteProductionBaseline | null {
    return this.listBaselines(websiteId)[0] || null;
  }

  exists(): boolean {
    return existsSync(this.dbPath);
  }
}
