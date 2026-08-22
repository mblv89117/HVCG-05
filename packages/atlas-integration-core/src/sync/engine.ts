/**
 * Reusable synchronization primitives: retry, backoff, idempotency, rate limits.
 * A failed connector or record must not stop unrelated work.
 */

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitter?: boolean;
}

export const DEFAULT_RETRY: RetryOptions = {
  maxAttempts: 5,
  baseDelayMs: 500,
  maxDelayMs: 30_000,
  jitter: true,
};

export function computeBackoff(attempt: number, opts: RetryOptions = DEFAULT_RETRY): number {
  const exp = Math.min(opts.maxDelayMs, opts.baseDelayMs * 2 ** Math.max(0, attempt - 1));
  if (!opts.jitter) return exp;
  const jitter = Math.floor(Math.random() * Math.min(250, exp * 0.2));
  return exp + jitter;
}

export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  opts: RetryOptions = DEFAULT_RETRY,
  isRetryable: (err: unknown) => boolean = () => true,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      if (attempt >= opts.maxAttempts || !isRetryable(err)) throw err;
      await sleep(computeBackoff(attempt, opts));
    }
  }
  throw lastError;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class RateLimiter {
  private timestamps: number[] = [];

  constructor(private readonly requestsPerMinute: number) {}

  async acquire(): Promise<void> {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => now - t < 60_000);
    if (this.timestamps.length >= this.requestsPerMinute) {
      const wait = 60_000 - (now - this.timestamps[0]) + 10;
      await sleep(Math.max(wait, 50));
      return this.acquire();
    }
    this.timestamps.push(Date.now());
  }
}

/** Idempotent upsert key for source records */
export function sourceDedupeKey(
  provider: string,
  sourceAccount: string,
  sourceRecordId: string,
): string {
  return `${provider}::${sourceAccount}::${sourceRecordId}`;
}

export interface SyncCheckpoint {
  connectionId: string;
  resourceType: string;
  deltaToken?: string;
  cursor?: string;
  updatedAt: string;
}

export type RecordProcessor<T> = (item: T) => Promise<'imported' | 'skipped' | 'duplicate' | 'error'>;

/**
 * Process items independently — one failure does not abort the batch.
 */
export async function processIndependently<T>(
  items: T[],
  process: RecordProcessor<T>,
): Promise<{ imported: number; skipped: number; duplicates: number; errors: number }> {
  let imported = 0;
  let skipped = 0;
  let duplicates = 0;
  let errors = 0;
  for (const item of items) {
    try {
      const result = await process(item);
      if (result === 'imported') imported++;
      else if (result === 'skipped') skipped++;
      else if (result === 'duplicate') duplicates++;
      else errors++;
    } catch {
      errors++;
    }
  }
  return { imported, skipped, duplicates, errors };
}
