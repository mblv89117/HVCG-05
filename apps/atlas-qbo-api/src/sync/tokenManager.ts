import type { AppConfig } from '../config.ts';
import { encryptSecret, decryptSecret, redactRealmId } from '../crypto/tokenVault.ts';
import { QboApiClient } from '../qbo/client.ts';
import { computeTokenStatus, refreshAccessToken } from '../qbo/oauth.ts';
import { audit } from '../audit/auditLog.ts';
import type { QboRepository } from '../store/repository.ts';
import type { QboConnectionRecord } from '../store/types.ts';

/**
 * Ensure a valid access token, rotating refresh tokens when Intuit issues new ones.
 */
export async function ensureFreshTokens(
  repo: QboRepository,
  cfg: AppConfig,
  connectionId: string,
): Promise<{ accessToken: string; connection: QboConnectionRecord }> {
  const conn = repo.getConnection(connectionId);
  if (!conn || conn.status === 'Disconnected') {
    throw Object.assign(new Error('Connection not found or disconnected'), { status: 404 });
  }

  const tokenStatus = computeTokenStatus(conn.accessTokenExpiresAt, conn.refreshTokenExpiresAt);
  if (tokenStatus === 'revoked') {
    const updated: QboConnectionRecord = {
      ...conn,
      status: 'NeedsReauthorization',
      oauthStatus: 'expired',
      tokenStatus: 'revoked',
      updatedAt: new Date().toISOString(),
    };
    repo.upsertConnection(updated);
    audit({
      action: 'reauth_required',
      organizationId: conn.organizationId,
      clientId: conn.clientId,
      connectionId: conn.id,
      realmIdRedacted: redactRealmId(conn.realmId),
      outcome: 'failure',
      detail: 'refresh_token_expired',
    });
    throw Object.assign(new Error('Refresh token expired — reconnect required'), { status: 401 });
  }

  if (tokenStatus === 'valid') {
    return {
      accessToken: decryptSecret(conn.accessTokenCiphertext, cfg.tokenEncryptionKeyB64),
      connection: { ...conn, tokenStatus: 'valid' },
    };
  }

  // refresh_required or expiring_soon → rotate
  try {
    const refreshToken = decryptSecret(conn.refreshTokenCiphertext, cfg.tokenEncryptionKeyB64);
    const pair = await refreshAccessToken(cfg, refreshToken);
    const now = Date.now();
    const updated: QboConnectionRecord = {
      ...conn,
      accessTokenCiphertext: encryptSecret(pair.accessToken, cfg.tokenEncryptionKeyB64),
      refreshTokenCiphertext: encryptSecret(pair.refreshToken, cfg.tokenEncryptionKeyB64),
      accessTokenExpiresAt: new Date(now + pair.expiresIn * 1000).toISOString(),
      refreshTokenExpiresAt: pair.xRefreshTokenExpiresIn
        ? new Date(now + pair.xRefreshTokenExpiresIn * 1000).toISOString()
        : conn.refreshTokenExpiresAt,
      tokenStatus: 'valid',
      oauthStatus: 'authorized',
      updatedAt: new Date().toISOString(),
      errorCode: null,
      errorMessage: null,
    };
    repo.upsertConnection(updated);
    audit({
      action: 'token_refresh_success',
      organizationId: conn.organizationId,
      clientId: conn.clientId,
      connectionId: conn.id,
      realmIdRedacted: redactRealmId(conn.realmId),
      outcome: 'success',
    });
    return { accessToken: pair.accessToken, connection: updated };
  } catch (err) {
    const updated: QboConnectionRecord = {
      ...conn,
      status: 'NeedsReauthorization',
      oauthStatus: 'expired',
      tokenStatus: 'refresh_required',
      consecutiveFailures: conn.consecutiveFailures + 1,
      errorCode: 'TOKEN_REFRESH_FAILED',
      errorMessage: 'Unable to refresh QuickBooks tokens — reconnect required',
      updatedAt: new Date().toISOString(),
    };
    repo.upsertConnection(updated);
    audit({
      action: 'token_refresh_failure',
      organizationId: conn.organizationId,
      clientId: conn.clientId,
      connectionId: conn.id,
      realmIdRedacted: redactRealmId(conn.realmId),
      outcome: 'failure',
      detail: err instanceof Error ? err.message.slice(0, 160) : 'refresh_failed',
    });
    throw err;
  }
}

export function createApiClient(cfg: AppConfig, realmId: string, accessToken: string): QboApiClient {
  return new QboApiClient(cfg, realmId, accessToken);
}
