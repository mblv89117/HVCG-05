/**
 * Hub confidential-client directory lookup for My Work.
 * GET /users/{oid}?$select=id,mail,userPrincipalName
 * Does not request User.Read.All. Does not run on the PM managed identity.
 */

import type { AppConfig } from '../config.ts';
import { getGraphAppToken } from './graphMembership.ts';
import { isEntraOid } from './resolver.ts';

export interface UserBasicProfile {
  id: string;
  mail: string | null;
  userPrincipalName: string | null;
}

export type UserBasicLookupResult =
  | { ok: true; profile: UserBasicProfile }
  | { ok: false; reason: 'failed' | 'mismatch' | 'empty' };

export type UserBasicLookup = (oid: string) => Promise<UserBasicLookupResult>;

function nonEmpty(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim();
  return v || null;
}

export async function lookupUserBasic(cfg: AppConfig, oid: string): Promise<UserBasicLookupResult> {
  if (!isEntraOid(oid)) return { ok: false, reason: 'failed' };
  const token = await getGraphAppToken(cfg);
  if (!token) return { ok: false, reason: 'failed' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.clientEntitlement.graphTimeoutMs);
  try {
    const resp = await fetch(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(oid)}?$select=id,mail,userPrincipalName`,
      { headers: { authorization: `Bearer ${token}` }, signal: controller.signal },
    );
    if (!resp.ok) return { ok: false, reason: 'failed' };
    const json = (await resp.json()) as Record<string, unknown>;
    const id = nonEmpty(json.id);
    if (!id || id.toLowerCase() !== oid.toLowerCase()) return { ok: false, reason: 'mismatch' };
    const mail = nonEmpty(json.mail);
    const userPrincipalName = nonEmpty(json.userPrincipalName);
    if (!mail && !userPrincipalName) return { ok: false, reason: 'empty' };
    return { ok: true, profile: { id, mail, userPrincipalName } };
  } catch {
    return { ok: false, reason: 'failed' };
  } finally {
    clearTimeout(timer);
  }
}

export function ownerEmailFromProfile(profile: UserBasicProfile): string | null {
  const mail = profile.mail?.trim().toLowerCase() || '';
  if (mail) return mail;
  const upn = profile.userPrincipalName?.trim().toLowerCase() || '';
  return upn || null;
}
