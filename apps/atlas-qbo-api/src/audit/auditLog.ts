/**
 * Audit logger — never writes secrets, access/refresh tokens, or full realm IDs.
 */

export type AuditAction =
  | 'oauth_start'
  | 'oauth_callback_success'
  | 'oauth_callback_failure'
  | 'token_refresh_success'
  | 'token_refresh_failure'
  | 'sync_started'
  | 'sync_completed'
  | 'sync_failure'
  | 'sync_resumed'
  | 'disconnect'
  | 'reconnect_start'
  | 'scheduler_tick'
  | 'access_denied'
  | 'auth_failure'
  | 'reauth_required';

export interface AuditEvent {
  id: string;
  at: string;
  action: AuditAction;
  organizationId?: string;
  clientId?: string;
  connectionId?: string;
  realmIdRedacted?: string;
  actorId?: string;
  outcome: 'success' | 'failure' | 'denied';
  detail?: string;
}

const buffer: AuditEvent[] = [];

export function audit(event: Omit<AuditEvent, 'id' | 'at'> & { id?: string; at?: string }): AuditEvent {
  const full: AuditEvent = {
    id: event.id || crypto.randomUUID(),
    at: event.at || new Date().toISOString(),
    ...event,
  };
  console.info(
    JSON.stringify({
      level: 'audit',
      ...full,
      detail: sanitizeDetail(full.detail),
    }),
  );
  buffer.push(full);
  if (buffer.length > 5000) buffer.shift();
  return full;
}

function sanitizeDetail(detail?: string): string | undefined {
  if (!detail) return detail;
  return detail
    .replace(/access[-_]?token[=:]\s*\S+/gi, 'access_token=[REDACTED]')
    .replace(/refresh[-_]?token[=:]\s*\S+/gi, 'refresh_token=[REDACTED]')
    .replace(/client[_-]?secret[=:]\s*\S+/gi, 'client_secret=[REDACTED]')
    .replace(/code[=:]\s*\S+/gi, 'code=[REDACTED]')
    .replace(/realm[_-]?id[=:]\s*\S+/gi, 'realm_id=[REDACTED]')
    .replace(/\b\d{9,17}\b/g, '[ID_REDACTED]');
}

export function listAuditEvents(filter?: { clientId?: string }): AuditEvent[] {
  return buffer.filter((e) => !filter?.clientId || e.clientId === filter.clientId);
}

export function clearAuditBufferForTests(): void {
  buffer.length = 0;
}
