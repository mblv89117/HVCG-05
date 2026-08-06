/**
 * Phase 4C-2 encrypted local backups.
 * Encryption: AES-256-GCM (authenticated) with scrypt KDF via Node.js OpenSSL crypto.
 * Passphrase never logged, never stored in DB, never committed.
 */

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import {
  BACKUP_ENCRYPTION_ALG,
  BACKUP_FORMAT_VERSION,
  BACKUP_KDF,
  DOCUMENT_DURABLE_SCHEMA_LABEL,
  type BackupProfile,
  type EncryptedBackupManifest,
} from '@hvcg/atlas-integration-core';

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 32;

export function resolveBackupPassphrase(
  env: Record<string, string | undefined>,
  explicit?: string,
): string | null {
  if (explicit != null && explicit.length > 0) return explicit;
  const fromEnv = (env.LOCAL_AI_BACKUP_PASSPHRASE || '').trim();
  return fromEnv || null;
}

function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return scryptSync(passphrase, salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 64 * 1024 * 1024,
  });
}

export function encryptBuffer(plaintext: Buffer, passphrase: string): {
  ciphertext: Buffer;
  salt: Buffer;
  iv: Buffer;
  authTag: Buffer;
} {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = deriveKey(passphrase, salt);
  const cipher = createCipheriv(BACKUP_ENCRYPTION_ALG, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return { ciphertext: enc, salt, iv, authTag };
}

export function decryptBuffer(
  ciphertext: Buffer,
  passphrase: string,
  salt: Buffer,
  iv: Buffer,
  authTag: Buffer,
): Buffer {
  const key = deriveKey(passphrase, salt);
  const decipher = createDecipheriv(BACKUP_ENCRYPTION_ALG, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export function sha256Hex(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

export function estimateBackupSize(opts: {
  dbBytes: number;
  profile: BackupProfile;
  stagedOriginalBytes?: number;
  extractedBytes?: number;
}): { estimatedBytes: number; fileCount: number; warning: string | null } {
  let bytes = opts.dbBytes;
  let files = 1;
  let warning: string | null = null;
  if (opts.profile === 'Metadata Plus Extracted Content') {
    bytes += opts.extractedBytes || 0;
    files += 1;
  }
  if (opts.profile === 'Full Local Review Backup') {
    bytes += (opts.extractedBytes || 0) + (opts.stagedOriginalBytes || 0);
    files += 2;
    warning =
      'WARNING: Full Local Review Backup includes staged original files. Confirm before proceeding.';
  }
  return { estimatedBytes: bytes, fileCount: files, warning };
}

export function writeBackupBundle(opts: {
  backupDir: string;
  backupId: string;
  dbPath: string;
  schemaVersion: number;
  profile: BackupProfile;
  encrypted: boolean;
  passphrase: string | null;
  dryRun: boolean;
  includeStagedOriginals: boolean;
  reviewCount: number;
  packCount: number;
  auditCount: number;
  estimatedBytes: number;
  fileCount: number;
  warning: string | null;
}): EncryptedBackupManifest {
  mkdirSync(opts.backupDir, { recursive: true, mode: 0o700 });
  const createdAt = new Date().toISOString();
  const plainPath = join(opts.backupDir, `document-reviews-${opts.backupId}.sqlite`);
  const encPath = join(opts.backupDir, `document-reviews-${opts.backupId}.sqlite.enc`);
  const manifestPath = join(opts.backupDir, `document-reviews-${opts.backupId}.manifest.json`);

  const plaintext = existsSync(opts.dbPath) ? readFileSync(opts.dbPath) : Buffer.alloc(0);
  const plaintextChecksum = sha256Hex(plaintext);

  let pathHint = opts.dryRun ? '[dry-run — no file written]' : plainPath;
  let checksum = plaintextChecksum;
  let encryption: EncryptedBackupManifest['encryption'];

  if (opts.encrypted) {
    if (!opts.passphrase) {
      throw Object.assign(new Error('Encrypted backup requires LOCAL_AI_BACKUP_PASSPHRASE or passphrase'), {
        status: 400,
        code: 'backup_passphrase_required',
      });
    }
    const { ciphertext, salt, iv, authTag } = encryptBuffer(plaintext, opts.passphrase);
    checksum = sha256Hex(ciphertext);
    encryption = {
      alg: BACKUP_ENCRYPTION_ALG,
      kdf: BACKUP_KDF,
      saltB64: salt.toString('base64'),
      ivB64: iv.toString('base64'),
      authTagB64: authTag.toString('base64'),
      scryptN: SCRYPT_N,
      scryptR: SCRYPT_R,
      scryptP: SCRYPT_P,
    };
    pathHint = opts.dryRun ? '[dry-run — no file written]' : encPath;
    if (!opts.dryRun) {
      writeFileSync(encPath, ciphertext, { mode: 0o600 });
      chmodSync(encPath, 0o600);
    }
  } else if (!opts.dryRun) {
    copyFileSync(opts.dbPath, plainPath);
    chmodSync(plainPath, 0o600);
  }

  if (opts.includeStagedOriginals && opts.profile !== 'Full Local Review Backup') {
    throw Object.assign(new Error('Staged originals require Full Local Review Backup profile'), {
      status: 400,
      code: 'invalid_backup_profile',
    });
  }

  const manifest: EncryptedBackupManifest = {
    formatVersion: BACKUP_FORMAT_VERSION,
    backupId: opts.backupId,
    createdAt,
    schemaVersion: opts.schemaVersion,
    schemaLabel: DOCUMENT_DURABLE_SCHEMA_LABEL,
    profile: opts.profile,
    encrypted: opts.encrypted,
    encryption,
    checksumSha256: checksum,
    plaintextChecksumSha256: plaintextChecksum,
    pathHint,
    includeStagedOriginals: Boolean(opts.includeStagedOriginals),
    reviewCount: opts.reviewCount,
    packCount: opts.packCount,
    auditCount: opts.auditCount,
    dryRun: opts.dryRun,
    estimatedBytes: opts.estimatedBytes,
    fileCount: opts.fileCount,
    warning: opts.warning,
  };

  if (!opts.dryRun) {
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), { mode: 0o600 });
  }
  return manifest;
}

export function verifyBackupBundle(opts: {
  manifestPathOrDir: string;
  passphrase?: string | null;
}): {
  ok: boolean;
  errors: string[];
  manifest?: EncryptedBackupManifest;
} {
  const errors: string[] = [];
  let manifestPath = opts.manifestPathOrDir;
  if (!manifestPath.endsWith('.json')) {
    // allow pointing at .enc / .sqlite — find sibling manifest
    const base = basename(manifestPath).replace(/\.sqlite(\.enc)?$/, '');
    const dir = dirname(manifestPath);
    const candidate = join(dir, `${base}.manifest.json`);
    if (existsSync(candidate)) manifestPath = candidate;
  }
  if (!existsSync(manifestPath)) return { ok: false, errors: ['manifest_not_found'] };
  let manifest: EncryptedBackupManifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as EncryptedBackupManifest;
  } catch {
    return { ok: false, errors: ['manifest_parse_failed'] };
  }
  const dir = dirname(manifestPath);
  const dataPath = manifest.encrypted
    ? join(dir, `document-reviews-${manifest.backupId}.sqlite.enc`)
    : join(dir, `document-reviews-${manifest.backupId}.sqlite`);
  if (!existsSync(dataPath)) {
    errors.push('backup_data_missing');
    return { ok: false, errors, manifest };
  }
  const data = readFileSync(dataPath);
  const actual = sha256Hex(data);
  if (actual !== manifest.checksumSha256) {
    errors.push('checksum_mismatch');
  }
  if (manifest.encrypted) {
    if (!opts.passphrase) {
      errors.push('passphrase_required_for_verify_decrypt');
    } else if (manifest.encryption) {
      try {
        const plain = decryptBuffer(
          data,
          opts.passphrase,
          Buffer.from(manifest.encryption.saltB64, 'base64'),
          Buffer.from(manifest.encryption.ivB64, 'base64'),
          Buffer.from(manifest.encryption.authTagB64, 'base64'),
        );
        if (
          manifest.plaintextChecksumSha256 &&
          sha256Hex(plain) !== manifest.plaintextChecksumSha256
        ) {
          errors.push('plaintext_checksum_mismatch');
        }
      } catch {
        errors.push('wrong_passphrase_or_corrupt');
      }
    }
  }
  return { ok: errors.length === 0, errors, manifest };
}

export function listBackupManifests(backupDir: string): EncryptedBackupManifest[] {
  if (!existsSync(backupDir)) return [];
  const out: EncryptedBackupManifest[] = [];
  for (const f of readdirSync(backupDir)) {
    if (!f.endsWith('.manifest.json')) continue;
    try {
      out.push(JSON.parse(readFileSync(join(backupDir, f), 'utf8')) as EncryptedBackupManifest);
    } catch {
      /* skip */
    }
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function backupDirBytes(backupDir: string): { count: number; bytes: number } {
  if (!existsSync(backupDir)) return { count: 0, bytes: 0 };
  let count = 0;
  let bytes = 0;
  for (const f of readdirSync(backupDir)) {
    const st = statSync(join(backupDir, f));
    if (st.isFile()) {
      count += 1;
      bytes += st.size;
    }
  }
  return { count, bytes };
}

export function assertBackupPathSafe(candidate: string, allowedRoot: string) {
  const abs = resolve(candidate);
  const root = resolve(allowedRoot);
  if (abs.includes('..') || (!abs.startsWith(root + '/') && abs !== root)) {
    throw Object.assign(new Error('Backup path outside allowed root'), {
      status: 400,
      code: 'path_traversal_rejected',
    });
  }
  return abs;
}

/** Constant-time compare of hex digests when equal length. */
export function safeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, 'hex');
    const bb = Buffer.from(b, 'hex');
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}
