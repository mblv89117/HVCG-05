/**
 * Microsoft Graph change-notification handshake + fail-closed clientState.
 * Triggers the existing fabric delta processor. Not a second indexer.
 *
 * Graph docs (2026-08-24): POST ?validationToken= must return HTTP 200
 * text/plain with the URL-decoded token within 10s. Notifications carry
 * the subscription clientState; unsigned/forged batches fail closed.
 */

import { timingSafeEqual } from 'node:crypto';

export const GRAPH_NOTIFICATION_PATH = '/api/graph/change-notifications';
export const MAX_VALIDATION_TOKEN_CHARS = 2048;
export const MAX_SEEN_NOTIFICATION_IDS = 64;

export type ChangeNotificationStatus = 'ready' | 'skipped' | 'error';

export interface GraphChangeNotification {
  subscriptionId?: string;
  clientState?: string;
  changeType?: string;
  resource?: string;
  lifecycleEvent?: string;
  id?: string;
  resourceData?: { id?: string };
}

export interface GraphNotificationBatch {
  value?: GraphChangeNotification[];
}

export function resolveGraphNotificationUrl(
  env: NodeJS.Dict<string | undefined> = process.env,
): string | null {
  const explicit = (env.INTEGRATION_GRAPH_NOTIFICATION_URL || '').trim();
  if (explicit) {
    try {
      const url = new URL(explicit);
      if (url.protocol !== 'https:') return null;
      return url.toString();
    } catch {
      return null;
    }
  }
  const host = (env.WEBSITE_HOSTNAME || '').trim();
  if (!host || /^(localhost|127\.0\.0\.1|\[::1\])/i.test(host)) return null;
  return `https://${host}${GRAPH_NOTIFICATION_PATH}`;
}

export function resolveGraphNotificationClientState(
  env: NodeJS.Dict<string | undefined> = process.env,
): string | null {
  const raw = (env.INTEGRATION_GRAPH_NOTIFICATION_CLIENT_STATE || '').trim();
  return raw.length >= 16 && raw.length <= 128 ? raw : null;
}

export function decodeGraphValidationToken(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_VALIDATION_TOKEN_CHARS) return null;
  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

export function graphValidationResponse(token: string): { status: number; contentType: string; body: string } {
  return { status: 200, contentType: 'text/plain; charset=utf-8', body: token };
}

export function clientStateMatches(expected: string | null, actual: unknown): boolean {
  if (!expected || typeof actual !== 'string') return false;
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(actual, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function parseGraphNotificationBatch(body: unknown): GraphChangeNotification[] {
  if (!body || typeof body !== 'object') return [];
  const value = (body as GraphNotificationBatch).value;
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is GraphChangeNotification => Boolean(row) && typeof row === 'object');
}

export function assertGraphNotificationClientState(
  notifications: GraphChangeNotification[],
  expected: string | null,
): { ok: true } | { ok: false; reason: string } {
  if (!expected) return { ok: false, reason: 'clientState not configured; notifications fail closed' };
  if (notifications.length === 0) return { ok: false, reason: 'notification batch empty' };
  for (const row of notifications) {
    if (!clientStateMatches(expected, row.clientState)) {
      return { ok: false, reason: 'clientState mismatch' };
    }
  }
  return { ok: true };
}

export function notificationReplayId(row: GraphChangeNotification): string {
  const resourceId = typeof row.resourceData?.id === 'string' ? row.resourceData.id : '';
  const parts = [
    row.subscriptionId || '',
    row.changeType || row.lifecycleEvent || '',
    row.resource || '',
    resourceId || row.id || '',
  ];
  return parts.join(':');
}

export function rememberNotificationIds(prior: string[] | undefined, incoming: string[]): {
  seen: string[];
  novel: string[];
} {
  const known = new Set(prior || []);
  const novel = incoming.filter((id) => id && !known.has(id));
  const seen = [...(prior || []), ...novel].slice(-MAX_SEEN_NOTIFICATION_IDS);
  return { seen, novel };
}

export async function acceptGraphChangeNotifications(opts: {
  body: unknown;
  expectedClientState: string | null;
  priorSeenIds?: string[];
  trigger?: () => Promise<{ accepted: boolean; queued: boolean }>;
}): Promise<
  | { ok: true; replay: boolean; novel: number; seen: string[]; triggered: boolean }
  | { ok: false; status: number; reason: string }
> {
  const notifications = parseGraphNotificationBatch(opts.body);
  const auth = assertGraphNotificationClientState(notifications, opts.expectedClientState);
  if (!auth.ok) return { ok: false, status: 401, reason: auth.reason };
  const incoming = notifications.map(notificationReplayId);
  const { seen, novel } = rememberNotificationIds(opts.priorSeenIds, incoming);
  if (novel.length === 0) {
    return { ok: true, replay: true, novel: 0, seen, triggered: false };
  }
  let triggered = false;
  if (opts.trigger) {
    await opts.trigger();
    triggered = true;
  }
  return { ok: true, replay: false, novel: novel.length, seen, triggered };
}
