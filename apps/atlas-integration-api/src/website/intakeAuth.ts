/**
 * Keyed + signed website ingest auth. Independent of Hub Bearer / Graph / BA tokens.
 * Never log the key or signature.
 *
 * XSYS-RT-20260820-01: key equality alone is insufficient — require key-id, timestamp,
 * and HMAC-SHA256 body signature (fail closed).
 */

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const MIN_KEY_LENGTH = 16;
/** Reject signed requests older/newer than this skew (ms). */
export const WEBSITE_INTAKE_MAX_SKEW_MS = 5 * 60 * 1000;
/** Default sender key-id until multi-sender secrets are configured. */
export const WEBSITE_INTAKE_DEFAULT_KEY_ID = 'website';

export function websiteIntakeKeyConfigured(expected: string): boolean {
  return expected.trim().length >= MIN_KEY_LENGTH;
}

export function verifyWebsiteIntakeKey(provided: unknown, expected: string): boolean {
  if (!websiteIntakeKeyConfigured(expected)) return false;
  const got = Array.isArray(provided) ? provided[0] : provided;
  if (typeof got !== 'string' || !got) return false;
  const a = createHash('sha256').update(got, 'utf8').digest();
  const b = createHash('sha256').update(expected, 'utf8').digest();
  return timingSafeEqual(a, b);
}

function headerString(value: unknown): string {
  const got = Array.isArray(value) ? value[0] : value;
  return typeof got === 'string' ? got.trim() : '';
}

export function websiteIntakeSignaturePayload(timestamp: string, rawBody: string): string {
  return `${timestamp}.${rawBody}`;
}

export function computeWebsiteIntakeSignature(secret: string, timestamp: string, rawBody: string): string {
  return createHmac('sha256', secret)
    .update(websiteIntakeSignaturePayload(timestamp, rawBody), 'utf8')
    .digest('hex');
}

function signaturesEqual(provided: string, expected: string): boolean {
  const a = Buffer.from(provided.toLowerCase(), 'utf8');
  const b = Buffer.from(expected.toLowerCase(), 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export type WebsiteIntakeAuthFailure = {
  ok: false;
  status: number;
  code: string;
  message: string;
};

export type WebsiteIntakeAuthSuccess = {
  ok: true;
  keyId: string;
  timestamp: string;
};

/**
 * Fail-closed website intake auth (XSYS-01).
 * Requires: x-website-intake-key + x-website-intake-key-id + x-website-intake-timestamp
 * + x-website-intake-signature = HMAC-SHA256(key, `${timestamp}.${rawBody}`) hex.
 */
export function verifyWebsiteIntakeSignedRequest(opts: {
  keyHeader: unknown;
  keyIdHeader: unknown;
  timestampHeader: unknown;
  signatureHeader: unknown;
  rawBody: string;
  expectedKey: string;
  expectedKeyId?: string;
  nowMs?: number;
}): WebsiteIntakeAuthSuccess | WebsiteIntakeAuthFailure {
  if (!websiteIntakeKeyConfigured(opts.expectedKey)) {
    return {
      ok: false,
      status: 503,
      code: 'WEBSITE_INTAKE_UNAVAILABLE',
      message: 'Website lead ingest is not configured.',
    };
  }

  if (!verifyWebsiteIntakeKey(opts.keyHeader, opts.expectedKey)) {
    return {
      ok: false,
      status: 401,
      code: 'unauthorized',
      message: 'Website intake key required.',
    };
  }

  const keyId = headerString(opts.keyIdHeader);
  const expectedKeyId = (opts.expectedKeyId || WEBSITE_INTAKE_DEFAULT_KEY_ID).trim();
  if (!keyId || keyId !== expectedKeyId) {
    return {
      ok: false,
      status: 401,
      code: 'unauthorized',
      message: 'Website intake key-id required.',
    };
  }

  const timestamp = headerString(opts.timestampHeader);
  if (!/^\d{10,13}$/.test(timestamp)) {
    return {
      ok: false,
      status: 401,
      code: 'unauthorized',
      message: 'Website intake timestamp required.',
    };
  }
  const tsMs = timestamp.length <= 10 ? Number(timestamp) * 1000 : Number(timestamp);
  const now = opts.nowMs ?? Date.now();
  if (!Number.isFinite(tsMs) || Math.abs(now - tsMs) > WEBSITE_INTAKE_MAX_SKEW_MS) {
    return {
      ok: false,
      status: 401,
      code: 'unauthorized',
      message: 'Website intake timestamp skew rejected.',
    };
  }

  const signature = headerString(opts.signatureHeader);
  if (!signature) {
    return {
      ok: false,
      status: 401,
      code: 'unauthorized',
      message: 'Website intake signature required.',
    };
  }
  const expected = computeWebsiteIntakeSignature(opts.expectedKey, timestamp, opts.rawBody);
  if (!signaturesEqual(signature, expected)) {
    return {
      ok: false,
      status: 401,
      code: 'unauthorized',
      message: 'Website intake signature invalid.',
    };
  }

  return { ok: true, keyId, timestamp };
}
