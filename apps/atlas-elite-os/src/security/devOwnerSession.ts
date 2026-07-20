/**
 * DEV-ONLY Local Owner session for Owner UAT.
 * Hard-disabled when VITE_ATLAS_ENV is production or staging.
 * Never grants roles without an explicit user action (button) or Entra claims.
 */

import { microsoftConfig } from '../microsoft/config';
import { normalizeRole, type AtlasRole } from './rbac';

const STORAGE_KEY = 'atlas.devOwnerSession.v1';

export function isDevOwnerLoginAllowed(): boolean {
  const env = microsoftConfig.environment;
  if (env === 'production' || env === 'staging') return false;
  return import.meta.env.VITE_ALLOW_DEV_OWNER_LOGIN === 'true';
}

export function readDevOwnerSessionActive(): boolean {
  if (!isDevOwnerLoginAllowed()) return false;
  if (typeof sessionStorage === 'undefined') return false;
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeDevOwnerSessionActive(active: boolean): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    if (active && isDevOwnerLoginAllowed()) {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* ignore quota / private mode */
  }
}

/** Role granted by Local Owner (Dev) — defaults to HVCG Owner (includes Administrator capabilities). */
export function resolveDevOwnerRole(): AtlasRole {
  const raw = String(import.meta.env.VITE_DEV_OWNER_ROLE || 'HVCG Owner');
  const normalized = normalizeRole(raw);
  if (normalized && normalized !== 'Unauthenticated' && normalized !== 'Unresolved') {
    return normalized;
  }
  return 'HVCG Owner';
}

export const DEV_OWNER_DISPLAY_NAME = 'Local Owner (Dev)';
