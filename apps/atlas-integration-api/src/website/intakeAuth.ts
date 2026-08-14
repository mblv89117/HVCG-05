/**
 * Keyed website ingest auth. Independent of Hub Bearer / Graph / BA tokens.
 * Never log the key.
 */

import { createHash, timingSafeEqual } from 'node:crypto';

const MIN_KEY_LENGTH = 16;

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
