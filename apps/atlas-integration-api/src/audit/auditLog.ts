/**
 * Audit logger — never writes secrets, access tokens, or refresh tokens.
 */

import type { AuditEventRecord, ProviderId } from '@hvcg/atlas-integration-core';
import type { IntegrationRepository } from '../store/repository.ts';

export type AuditAction =
  | 'connect_started'
  | 'connect_completed'
  | 'connect_failure'
  | 'oauth_callback'
  | 'disconnect'
  | 'reauthorize'
  | 'verify_connection'
  | 'sync_started'
  | 'sync_completed'
  | 'sync_failure'
  | 'webhook_received'
  | 'webhook_processed'
  | 'access_denied'
  | 'auth_failure'
  | 'resource_select'
  | 'search';

export interface AuditContext {
  repo?: IntegrationRepository;
  actorUserId?: string;
  providerId?: ProviderId;
  connectionId?: string;
  outcome: AuditEventRecord['outcome'];
  action: AuditAction | string;
  detail?: string;
  sensitive?: boolean;
}

export function audit(ctx: AuditContext & { sourceAccount?: string; businessEntity?: string }): AuditEventRecord {
  const full: AuditEventRecord = {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    actorUserId: ctx.actorUserId || 'system',
    action: ctx.action,
    providerId: ctx.providerId,
    connectionId: ctx.connectionId,
    sourceAccount: ctx.sourceAccount,
    businessEntity: ctx.businessEntity,
    outcome: ctx.outcome,
    detail: sanitizeDetail(ctx.detail || ''),
    sensitive: ctx.sensitive ?? false,
  };
  console.info(
    JSON.stringify({
      level: 'audit',
      ...full,
      detail: full.sensitive ? '[REDACTED]' : full.detail,
    }),
  );
  ctx.repo?.appendAudit(full);
  return full;
}

function sanitizeDetail(detail: string): string {
  return detail
    .replace(/access[-_]?token[=:]\s*\S+/gi, 'access_token=[REDACTED]')
    .replace(/refresh[-_]?token[=:]\s*\S+/gi, 'refresh_token=[REDACTED]')
    .replace(/secret[=:]\s*\S+/gi, 'secret=[REDACTED]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
    .replace(/\b[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g, '[JWT_REDACTED]');
}
