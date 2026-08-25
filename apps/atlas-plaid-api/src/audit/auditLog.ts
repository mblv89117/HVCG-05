/**
 * Audit logger — never writes secrets, access tokens, or full account numbers.
 */

export type AuditAction =
  | 'link_token_created'
  | 'exchange_success'
  | 'exchange_failure'
  | 'sync_started'
  | 'sync_completed'
  | 'sync_failure'
  | 'disconnect'
  | 'webhook_received'
  | 'webhook_processed'
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
  itemId?: string;
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
  // Structured log without secrets
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
    .replace(/secret[=:]\s*\S+/gi, 'secret=[REDACTED]')
    .replace(/public[_-]?token[=:]\s*\S+/gi, 'public_token=[REDACTED]')
    .replace(/\b\d{9,17}\b/g, '[ACCT_REDACTED]');
}

export function listAuditEvents(filter?: { clientId?: string }): AuditEvent[] {
  return buffer.filter((e) => !filter?.clientId || e.clientId === filter.clientId);
}
