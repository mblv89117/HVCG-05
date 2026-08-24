/**
 * Graph change-notification subscription create / renew / delete.
 * Mail: users/{owner}/mailFolders/inbox/messages (app-only Mail.Read documented).
 * Files: attempt /drives/{id}/root only when the existing indexer already
 * proved a drive id. Graph 400/403/405 → honest-skip; scheduled file delta stays.
 *
 * Max mail lifetime is 4230 minutes. Renew before expiry. Persist ids in
 * fabric-checkpoint.json (same recycle-survivable overlay as mail delta).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { MANNY_ENTRA_OID } from '../manny.ts';
import type { FabricGraphClient } from './graph.ts';
import {
  type ChangeNotificationStatus,
  resolveGraphNotificationClientState,
  resolveGraphNotificationUrl,
} from './notifications.ts';
import { FABRIC_CHECKPOINT_FILE, sanitizeFabricNotes } from './status.ts';

export const MAIL_SUBSCRIPTION_MAX_MINUTES = 4230;
export const MAIL_SUBSCRIPTION_REQUEST_MINUTES = 4000;
export const FILE_SUBSCRIPTION_REQUEST_MINUTES = 4000;
export const RENEW_IF_REMAINING_MS = 12 * 60 * 60 * 1000;

export interface FabricSubscriptionRecord {
  id: string;
  resource: string;
  kind: 'mail' | 'files';
  expirationDateTime: string;
  notificationUrl: string;
}

export interface FabricChangeNotificationState {
  status: ChangeNotificationStatus;
  reason: string;
  mailStatus: ChangeNotificationStatus;
  filesStatus: ChangeNotificationStatus;
  mail?: FabricSubscriptionRecord;
  files?: FabricSubscriptionRecord[];
  lastEnsuredAt?: string;
  seenIds?: string[];
}

export function mailNotificationResource(oid = MANNY_ENTRA_OID): string {
  return `users/${oid}/mailFolders/inbox/messages`;
}

export function fileNotificationResource(driveId: string): string {
  return `drives/${driveId}/root`;
}

export function decideFileChangeNotifications(opts: {
  driveIds: string[];
  graphRejected?: boolean;
}): { action: 'attempt' | 'skip'; reason: string } {
  if (opts.graphRejected) {
    return {
      action: 'skip',
      reason: 'Graph rejected driveItem subscription for app-only; scheduled file delta remains',
    };
  }
  const driveIds = opts.driveIds.filter((id) => typeof id === 'string' && id.trim().length > 0);
  if (driveIds.length === 0) {
    return {
      action: 'skip',
      reason: 'no proven drive id from the existing indexer; scheduled file delta remains',
    };
  }
  return {
    action: 'attempt',
    reason: 'OneDrive for Business /drives/{id}/root is documented for application Files.Read.All',
  };
}

export function subscriptionExpiration(now: Date, minutes: number): string {
  const capped = Math.min(Math.max(45, minutes), MAIL_SUBSCRIPTION_MAX_MINUTES);
  return new Date(now.getTime() + capped * 60_000).toISOString();
}

export function needsRenewal(expirationDateTime: string | undefined, now = new Date()): boolean {
  if (!expirationDateTime) return true;
  const exp = Date.parse(expirationDateTime);
  if (!Number.isFinite(exp)) return true;
  return exp - now.getTime() <= RENEW_IF_REMAINING_MS;
}

function graphErrorMessage(json: Record<string, unknown>, fallback: string): string {
  const err = json.error;
  if (err && typeof err === 'object') {
    const rec = err as { code?: unknown; message?: unknown };
    const code = typeof rec.code === 'string' ? rec.code : '';
    const message = typeof rec.message === 'string' ? rec.message : '';
    const text = [code, message].filter(Boolean).join(' ');
    if (text) return text.slice(0, 200);
  }
  return fallback;
}

function isUnsupportedStatus(status: number): boolean {
  return status === 400 || status === 403 || status === 404 || status === 405;
}

function readCheckpointDriveIds(dataDir: string): string[] {
  const path = join(dataDir, FABRIC_CHECKPOINT_FILE);
  if (!existsSync(path)) return [];
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as { sharePoint?: { drives?: Record<string, unknown> } };
    return Object.keys(raw.sharePoint?.drives || {}).filter(Boolean);
  } catch {
    return [];
  }
}

export function loadChangeNotificationState(dataDir: string): FabricChangeNotificationState | undefined {
  const path = join(dataDir, FABRIC_CHECKPOINT_FILE);
  if (!existsSync(path)) return undefined;
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as { changeNotifications?: FabricChangeNotificationState };
    return raw.changeNotifications && typeof raw.changeNotifications === 'object'
      ? raw.changeNotifications
      : undefined;
  } catch {
    return undefined;
  }
}

export function persistChangeNotificationState(
  dataDir: string,
  state: FabricChangeNotificationState,
): FabricChangeNotificationState {
  const path = join(dataDir, FABRIC_CHECKPOINT_FILE);
  mkdirSync(dataDir, { recursive: true });
  let current: Record<string, unknown> = {};
  if (existsSync(path)) {
    try {
      const parsed = JSON.parse(readFileSync(path, 'utf8')) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        current = parsed as Record<string, unknown>;
      }
    } catch {
      current = {};
    }
  }
  const next = {
    ...current,
    changeNotifications: {
      ...state,
      reason: sanitizeFabricNotes([state.reason])[0] || state.reason,
    },
  };
  writeFileSync(path, JSON.stringify(next, null, 2));
  return next.changeNotifications as FabricChangeNotificationState;
}

async function createSubscription(
  fabric: FabricGraphClient,
  body: Record<string, unknown>,
): Promise<{ status: number; json: Record<string, unknown> }> {
  return fabric.postJson('/v1.0/subscriptions', body);
}

async function renewSubscription(
  fabric: FabricGraphClient,
  id: string,
  expirationDateTime: string,
): Promise<{ status: number; json: Record<string, unknown> }> {
  return fabric.patchJson(`/v1.0/subscriptions/${id}`, { expirationDateTime });
}

export async function deleteFabricSubscription(
  fabric: FabricGraphClient,
  id: string,
): Promise<{ status: number }> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { status: 400 };
  return fabric.deleteJson(`/v1.0/subscriptions/${id}`);
}

function asRecord(json: Record<string, unknown>, kind: 'mail' | 'files', notificationUrl: string): FabricSubscriptionRecord | null {
  const id = typeof json.id === 'string' ? json.id : '';
  const resource = typeof json.resource === 'string' ? json.resource : '';
  const expirationDateTime = typeof json.expirationDateTime === 'string' ? json.expirationDateTime : '';
  if (!id || !expirationDateTime) return null;
  return { id, resource, kind, expirationDateTime, notificationUrl };
}

export async function ensureFabricChangeSubscriptions(opts: {
  fabric: FabricGraphClient;
  dataDir: string;
  env?: NodeJS.Dict<string | undefined>;
  now?: () => Date;
  driveIds?: string[];
}): Promise<FabricChangeNotificationState> {
  const env = opts.env ?? process.env;
  const now = opts.now?.() ?? new Date();
  const prior = loadChangeNotificationState(opts.dataDir);
  const notificationUrl = resolveGraphNotificationUrl(env);
  const clientState = resolveGraphNotificationClientState(env);
  const driveIds = opts.driveIds ?? readCheckpointDriveIds(opts.dataDir);

  if (!notificationUrl) {
    const state: FabricChangeNotificationState = {
      status: 'skipped',
      reason: 'notification URL not configured (HTTPS required); subscription create not proven against Graph',
      mailStatus: 'skipped',
      filesStatus: 'skipped',
      lastEnsuredAt: now.toISOString(),
      seenIds: prior?.seenIds,
    };
    return persistChangeNotificationState(opts.dataDir, state);
  }
  if (!clientState) {
    const state: FabricChangeNotificationState = {
      status: 'skipped',
      reason: 'clientState not configured; subscription create not proven against Graph',
      mailStatus: 'skipped',
      filesStatus: 'skipped',
      lastEnsuredAt: now.toISOString(),
      seenIds: prior?.seenIds,
    };
    return persistChangeNotificationState(opts.dataDir, state);
  }

  const mailResource = mailNotificationResource();
  let mail = prior?.mail;
  let mailStatus: ChangeNotificationStatus = 'skipped';
  let mailReason = '';

  try {
    if (mail?.id && mail.resource === mailResource && !needsRenewal(mail.expirationDateTime, now)) {
      mailStatus = 'ready';
    } else if (mail?.id && needsRenewal(mail.expirationDateTime, now)) {
      const expirationDateTime = subscriptionExpiration(now, MAIL_SUBSCRIPTION_REQUEST_MINUTES);
      const renewed = await renewSubscription(opts.fabric, mail.id, expirationDateTime);
      if (renewed.status === 200) {
        const rec = asRecord(renewed.json, 'mail', notificationUrl);
        mail = rec || { ...mail, expirationDateTime };
        mailStatus = 'ready';
        mailReason = 'Mail subscription renewed.';
      } else if (renewed.status === 404) {
        mail = undefined;
      } else {
        mailStatus = 'error';
        mailReason = `Mail subscription renew HTTP ${renewed.status}: ${graphErrorMessage(renewed.json, 'renew failed')}`;
      }
    }

    if (mailStatus !== 'ready' && mailStatus !== 'error') {
      const created = await createSubscription(opts.fabric, {
        changeType: 'created,updated',
        notificationUrl,
        resource: mailResource,
        expirationDateTime: subscriptionExpiration(now, MAIL_SUBSCRIPTION_REQUEST_MINUTES),
        clientState,
        latestSupportedTlsVersion: 'v1_2',
      });
      if (created.status === 201 || created.status === 200) {
        const rec = asRecord(created.json, 'mail', notificationUrl);
        if (rec) {
          mail = rec;
          mailStatus = 'ready';
          mailReason = 'Mail subscription created.';
        } else {
          mailStatus = 'error';
          mailReason = 'Mail subscription create returned no id; not claiming ready.';
        }
      } else {
        mailStatus = 'error';
        mailReason = `Mail subscription create HTTP ${created.status}: ${graphErrorMessage(created.json, 'create failed')}`;
      }
    }
  } catch (err) {
    mailStatus = 'error';
    mailReason = `Mail subscription ensure failed: ${err instanceof Error ? err.message : 'unknown error'}`;
  }

  const fileDecision = decideFileChangeNotifications({
    driveIds,
    graphRejected: prior?.filesStatus === 'skipped' && /rejected driveItem/i.test(prior.reason || ''),
  });
  let files: FabricSubscriptionRecord[] = prior?.files || [];
  let filesStatus: ChangeNotificationStatus = 'skipped';
  let filesReason = fileDecision.reason;

  if (fileDecision.action === 'skip') {
    files = [];
    filesStatus = 'skipped';
  } else {
    try {
      const nextFiles: FabricSubscriptionRecord[] = [];
      let rejected = false;
      for (const driveId of driveIds.slice(0, 8)) {
        const resource = fileNotificationResource(driveId);
        const existing = files.find((row) => row.resource === resource);
        if (existing?.id && !needsRenewal(existing.expirationDateTime, now)) {
          nextFiles.push(existing);
          continue;
        }
        if (existing?.id && needsRenewal(existing.expirationDateTime, now)) {
          const expirationDateTime = subscriptionExpiration(now, FILE_SUBSCRIPTION_REQUEST_MINUTES);
          const renewed = await renewSubscription(opts.fabric, existing.id, expirationDateTime);
          if (renewed.status === 200) {
            nextFiles.push(asRecord(renewed.json, 'files', notificationUrl) || { ...existing, expirationDateTime });
            continue;
          }
          if (renewed.status !== 404) {
            if (isUnsupportedStatus(renewed.status)) {
              rejected = true;
              filesReason = `Graph rejected driveItem subscription HTTP ${renewed.status}; scheduled file delta remains`;
              break;
            }
          }
        }
        const created = await createSubscription(opts.fabric, {
          changeType: 'updated',
          notificationUrl,
          resource,
          expirationDateTime: subscriptionExpiration(now, FILE_SUBSCRIPTION_REQUEST_MINUTES),
          clientState,
          latestSupportedTlsVersion: 'v1_2',
        });
        if (created.status === 201 || created.status === 200) {
          const rec = asRecord(created.json, 'files', notificationUrl);
          if (rec) nextFiles.push(rec);
        } else if (isUnsupportedStatus(created.status)) {
          rejected = true;
          filesReason = `Graph rejected driveItem subscription HTTP ${created.status}; scheduled file delta remains`;
          break;
        }
      }
      files = nextFiles;
      filesStatus = rejected ? 'skipped' : nextFiles.length > 0 ? 'ready' : 'skipped';
      if (filesStatus === 'ready') filesReason = 'File subscription created.';
    } catch (err) {
      filesStatus = 'error';
      filesReason = `File subscription ensure failed: ${err instanceof Error ? err.message : 'unknown error'}`;
    }
  }

  const status: ChangeNotificationStatus =
    mailStatus === 'ready' ? 'ready' : mailStatus === 'error' ? 'error' : 'skipped';
  const reason =
    mailStatus === 'ready'
      ? filesStatus === 'skipped'
        ? `${mailReason || 'Mail subscription id stored after Graph create.'} Files: ${filesReason}`
        : mailReason || 'Mail subscription id stored after Graph create.'
      : mailReason || filesReason || 'subscription create not proven against Graph';

  return persistChangeNotificationState(opts.dataDir, {
    status,
    reason,
    mailStatus,
    filesStatus,
    mail: mailStatus === 'ready' ? mail : undefined,
    files: filesStatus === 'ready' ? files : [],
    lastEnsuredAt: now.toISOString(),
    seenIds: prior?.seenIds,
  });
}
