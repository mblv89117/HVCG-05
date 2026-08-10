/**
 * Local-only staged document store + filesystem staging (Phase 4B-1).
 * Path defaults under .data/local-ai-document-staging (gitignored).
 */

import {
  createHash,
  randomUUID,
} from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import type {
  StagedDocumentRecord,
  DocumentReviewPackage,
  ExtractionSummary,
} from '@hvcg/atlas-integration-core';
import {
  DEFAULT_MAX_STAGED_FILE_BYTES,
  DEFAULT_STAGED_FILE_TTL_HOURS,
  DOCUMENT_MIME_BY_EXT,
  extensionFromFilename,
  isSupportedExtension,
} from '@hvcg/atlas-integration-core';

export interface DocumentStagingConfig {
  rootDir: string;
  maxFileBytes: number;
  ttlHours: number;
}

export function resolveDocumentStagingConfig(
  env: Record<string, string | undefined> = process.env,
  repoRoot: string,
): DocumentStagingConfig {
  const configured = (env.LOCAL_AI_DOCUMENT_STAGING_DIR || '').trim();
  const rootDir = configured
    ? resolve(configured)
    : resolve(repoRoot, '.data', 'local-ai-document-staging');
  return {
    rootDir,
    maxFileBytes: Number(env.LOCAL_AI_DOCUMENT_MAX_BYTES || DEFAULT_MAX_STAGED_FILE_BYTES),
    ttlHours: Number(env.LOCAL_AI_DOCUMENT_TTL_HOURS || DEFAULT_STAGED_FILE_TTL_HOURS),
  };
}

interface StagingIndex {
  version: number;
  files: StagedDocumentRecord[];
}

function emptyIndex(): StagingIndex {
  return { version: 1, files: [] };
}

export class DocumentStagingStore {
  private cfg: DocumentStagingConfig;
  private indexPath: string;
  private filesDir: string;
  private data: StagingIndex;

  constructor(cfg: DocumentStagingConfig) {
    this.cfg = cfg;
    mkdirSync(cfg.rootDir, { recursive: true });
    this.filesDir = join(cfg.rootDir, 'files');
    mkdirSync(this.filesDir, { recursive: true });
    this.indexPath = join(cfg.rootDir, 'staging-index.json');
    if (existsSync(this.indexPath)) {
      try {
        const raw = JSON.parse(readFileSync(this.indexPath, 'utf8')) as StagingIndex;
        this.data = { ...emptyIndex(), ...raw, files: raw.files || [] };
      } catch {
        this.data = emptyIndex();
        this.persist();
      }
    } else {
      this.data = emptyIndex();
      this.persist();
    }
  }

  getConfig() {
    return { ...this.cfg };
  }

  private persist() {
    writeFileSync(this.indexPath, JSON.stringify(this.data, null, 2), { mode: 0o600 });
  }

  list(): StagedDocumentRecord[] {
    return [...this.data.files];
  }

  get(id: string): StagedDocumentRecord | undefined {
    return this.data.files.find((f) => f.stagedFileId === id);
  }

  upsert(rec: StagedDocumentRecord) {
    const i = this.data.files.findIndex((f) => f.stagedFileId === rec.stagedFileId);
    if (i >= 0) this.data.files[i] = rec;
    else this.data.files.push(rec);
    this.persist();
  }

  absolutePath(rec: StagedDocumentRecord): string {
    return join(this.filesDir, rec.safeFilename);
  }

  readBytes(rec: StagedDocumentRecord): Buffer {
    return readFileSync(this.absolutePath(rec));
  }

  stageFile(input: {
    originalFilename: string;
    bytes: Buffer;
    declaredMime?: string;
    detectedMime?: string | null;
  }): StagedDocumentRecord {
    const originalFilename = basename(input.originalFilename);
    const ext = extensionFromFilename(originalFilename);
    if (!isSupportedExtension(ext)) {
      throw Object.assign(new Error(`Unsupported file type: .${ext || '(none)'}`), {
        status: 400,
        code: 'unsupported_file_type',
      });
    }
    if (input.bytes.length <= 0) {
      throw Object.assign(new Error('Empty file rejected'), {
        status: 400,
        code: 'empty_file',
      });
    }
    if (input.bytes.length > this.cfg.maxFileBytes) {
      throw Object.assign(
        new Error(`File exceeds size limit (${this.cfg.maxFileBytes} bytes)`),
        { status: 400, code: 'file_too_large' },
      );
    }

    const declaredMime =
      input.declaredMime || DOCUMENT_MIME_BY_EXT[ext][0] || 'application/octet-stream';
    const detectedMime = input.detectedMime ?? null;
    if (detectedMime) {
      const allowed = DOCUMENT_MIME_BY_EXT[ext];
      const ok =
        allowed.some((m) => detectedMime === m || detectedMime.startsWith(m.split('/')[0] + '/')) ||
        // zip-based office docs often detected as application/zip
        ((ext === 'docx' || ext === 'xlsx') && detectedMime === 'application/zip');
      if (!ok && detectedMime !== 'application/octet-stream') {
        throw Object.assign(
          new Error(`MIME mismatch: extension .${ext} vs detected ${detectedMime}`),
          { status: 400, code: 'mime_mismatch' },
        );
      }
    }

    // Encrypted / password markers (best-effort)
    const head = input.bytes.slice(0, 2048).toString('latin1');
    if (/\/Encrypt\b/.test(head) && ext === 'pdf') {
      throw Object.assign(new Error('Encrypted PDF is not supported in Phase 4B-1'), {
        status: 400,
        code: 'encrypted_pdf',
      });
    }

    const checksumSha256 = createHash('sha256').update(input.bytes).digest('hex');
    const stagedFileId = randomUUID();
    const correlationId = randomUUID();
    const safeFilename = `${stagedFileId}.${ext}`;
    const abs = join(this.filesDir, safeFilename);
    writeFileSync(abs, input.bytes, { mode: 0o600 });

    const now = new Date();
    const expires = new Date(now.getTime() + this.cfg.ttlHours * 3600_000);
    const rec: StagedDocumentRecord = {
      stagedFileId,
      correlationId,
      status: 'Staged',
      originalFilename,
      safeFilename,
      relativePath: join('files', safeFilename),
      absolutePathHint: abs,
      extension: ext,
      declaredMime,
      detectedMime,
      sizeBytes: input.bytes.length,
      checksumSha256,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      initiatedBy: 'Manny',
      malwareScanStatus: 'unavailable',
      malwareScanNote: 'Scan pending at stage time',
      malwareScan: null,
      extraction: null,
      reviewPackage: null,
      linkedAiJobId: null,
      redactionDecision: 'Pending',
      redactedContent: null,
      mannyDecision: 'Pending',
      mannyDecisionAt: null,
      mannyCorrections: null,
      correctionLog: [],
      errorDetail: null,
      purgedAt: null,
      draftOnly: true,
    };
    this.upsert(rec);
    return rec;
  }

  updateExtraction(id: string, extraction: ExtractionSummary, status: StagedDocumentRecord['status']) {
    const rec = this.get(id);
    if (!rec) throw Object.assign(new Error('Staged file not found'), { status: 404 });
    rec.extraction = extraction;
    rec.status = status;
    rec.updatedAt = new Date().toISOString();
    this.upsert(rec);
    return rec;
  }

  updateReview(id: string, pack: DocumentReviewPackage) {
    const rec = this.get(id);
    if (!rec) throw Object.assign(new Error('Staged file not found'), { status: 404 });
    rec.reviewPackage = pack;
    rec.status = 'ReadyForReview';
    rec.updatedAt = new Date().toISOString();
    this.upsert(rec);
    return rec;
  }

  purge(id: string, reason: string): StagedDocumentRecord {
    const rec = this.get(id);
    if (!rec) throw Object.assign(new Error('Staged file not found'), { status: 404 });
    const abs = this.absolutePath(rec);
    if (existsSync(abs)) rmSync(abs, { force: true });
    rec.status = 'Purged';
    rec.purgedAt = new Date().toISOString();
    rec.updatedAt = rec.purgedAt;
    rec.errorDetail = reason;
    rec.absolutePathHint = '[purged]';
    this.upsert(rec);
    return rec;
  }

  expireDue(): StagedDocumentRecord[] {
    const now = Date.now();
    const expired: StagedDocumentRecord[] = [];
    for (const rec of this.list()) {
      if (rec.status === 'Purged' || rec.status === 'Expired') continue;
      if (new Date(rec.expiresAt).getTime() <= now) {
        expired.push(this.purge(rec.stagedFileId, 'TTL expired — automatic purge'));
        const latest = this.get(rec.stagedFileId)!;
        latest.status = 'Expired';
        this.upsert(latest);
      }
    }
    return expired;
  }

  /** Safety: never expose staging root outside configured path. */
  assertPathInsideStaging(candidate: string) {
    const root = resolve(this.cfg.rootDir);
    const abs = resolve(candidate);
    if (!abs.startsWith(root + '/') && abs !== root) {
      throw Object.assign(new Error('Path escapes staging root'), {
        status: 400,
        code: 'path_escape',
      });
    }
  }

  listOrphanFiles(): string[] {
    if (!existsSync(this.filesDir)) return [];
    const known = new Set(this.list().map((f) => f.safeFilename));
    return readdirSync(this.filesDir).filter((n) => !known.has(n));
  }
}

export function detectMimeFromBuffer(buf: Buffer, ext: string): string | null {
  // Lightweight magic-byte detection (avoid ESM file-type friction in tests)
  if (buf.length >= 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) {
    return 'application/pdf';
  }
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return 'image/png';
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg';
  }
  if (buf.length >= 2 && buf[0] === 0x50 && buf[1] === 0x4b) {
    // ZIP container — docx/xlsx
    if (ext === 'docx') {
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }
    if (ext === 'xlsx') {
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }
    return 'application/zip';
  }
  if (ext === 'txt' || ext === 'csv') return ext === 'csv' ? 'text/csv' : 'text/plain';
  return null;
}
