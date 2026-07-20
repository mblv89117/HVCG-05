import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * AES-256-GCM envelope for QBO access + refresh tokens.
 * Key material comes from Key Vault / env — never commit the key.
 */

export function deriveKey(keyB64: string): Buffer {
  const raw = Buffer.from(keyB64, 'base64');
  if (raw.length === 32) return raw;
  return createHash('sha256').update(raw).digest();
}

export function encryptSecret(plaintext: string, keyB64: string): string {
  const key = deriveKey(keyB64);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

export function decryptSecret(payload: string, keyB64: string): string {
  const [ver, ivB64, tagB64, dataB64] = payload.split(':');
  if (ver !== 'v1' || !ivB64 || !tagB64 || !dataB64) {
    throw new Error('Invalid encrypted payload');
  }
  const key = deriveKey(keyB64);
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]);
  return dec.toString('utf8');
}

/** Redact for logs — never return full secrets */
export function redact(value: string | null | undefined): string {
  if (!value) return '[empty]';
  if (value.length <= 8) return '***';
  return `${value.slice(0, 2)}…${value.slice(-2)} (len=${value.length})`;
}

/** Realm IDs are identifiers — show last 4 in operator UI, redact in logs */
export function redactRealmId(realmId: string | null | undefined): string {
  if (!realmId) return '[empty]';
  if (realmId.length <= 4) return '****';
  return `…${realmId.slice(-4)}`;
}
