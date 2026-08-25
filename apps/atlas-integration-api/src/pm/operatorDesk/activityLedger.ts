/**
 * Durable Hub overlay for the Agent Activity Ledger.
 *
 * Recycle-survivable, redeploy-survivable, single-instance JSON — same
 * constraint as capital overlay. Not a SharePoint list, Cosmos, SQL, or
 * an eighth system. Tests use INTEGRATION_DATA_DIR and never write to
 * /home/webapp_data.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AtlasPrincipal } from '../../middleware/auth.ts';
import { entitledClientCodes } from '../sharepoint/authz.ts';
import type {
  AgentActivityAffectedEntity,
  AgentActivityLedgerEntry,
  AskAtlasActivity,
  AskAtlasAnswer,
  AskAtlasClassification,
  AskAtlasReadWriteStatus,
} from './types.ts';

export const AGENT_ACTIVITY_OVERLAY_SCHEMA_VERSION = 1;
export const AGENT_ACTIVITY_MAX_ENTRIES = 500;
export const DEFAULT_AGENT_ACTIVITY_HOME_DIR = '/home/webapp_data/integrations/agent-activity';

const CLASSIFICATIONS = new Set<AskAtlasClassification | 'HONEST_EMPTY'>([
  'CONFIRMED',
  'LIKELY',
  'PROPOSED',
  'HONEST_EMPTY',
]);

const READ_WRITE_STATUSES = new Set<AskAtlasReadWriteStatus>([
  'READ_AUTO',
  'PROPOSE_AUTO',
  'SAFE_INTERNAL_WRITE',
]);

export class AgentActivityOverlayCorruptError extends Error {
  readonly code = 'AGENT_ACTIVITY_OVERLAY_CORRUPT';
  constructor(message: string) {
    super(message);
    this.name = 'AgentActivityOverlayCorruptError';
  }
}

export class AgentActivityOverlayUnsupportedSchemaError extends Error {
  readonly code = 'AGENT_ACTIVITY_OVERLAY_SCHEMA';
  constructor(message: string) {
    super(message);
    this.name = 'AgentActivityOverlayUnsupportedSchemaError';
  }
}

export interface AgentActivityOverlay {
  schemaVersion?: number;
  entries: AgentActivityLedgerEntry[];
}

export function emptyAgentActivityOverlay(): AgentActivityOverlay {
  return {
    schemaVersion: AGENT_ACTIVITY_OVERLAY_SCHEMA_VERSION,
    entries: [],
  };
}

/**
 * Durable overlay directory.
 * Production sibling of capital-overlay under INTEGRATION_DATA_DIR
 * (`/home/webapp_data/integrations/agent-activity`).
 */
export function resolveAgentActivityOverlayDir(
  dataDir: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const explicit = (env.INTEGRATION_AGENT_ACTIVITY_DIR || '').trim();
  if (explicit) return explicit;
  const fromEnv = (env.INTEGRATION_DATA_DIR || '').trim();
  if (fromEnv) return join(fromEnv, 'agent-activity');
  if ((env.HOME || '') === '/home') {
    const preferred = DEFAULT_AGENT_ACTIVITY_HOME_DIR;
    try {
      mkdirSync(preferred, { recursive: true, mode: 0o700 });
      return preferred;
    } catch {
      /* fall through to dataDir */
    }
  }
  return join(dataDir, 'agent-activity');
}

export function agentActivityOverlayFilePath(dir: string): string {
  return join(dir, 'agent-activity-overlay.json');
}

export function readAgentActivityOverlay(dir: string): AgentActivityOverlay {
  const path = agentActivityOverlayFilePath(dir);
  if (!existsSync(path)) return emptyAgentActivityOverlay();
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'EACCES' || code === 'EPERM' || code === 'EROFS') {
      throw new AgentActivityOverlayCorruptError('Agent activity overlay is unreadable');
    }
    throw err;
  }
  if (!raw.trim()) {
    throw new AgentActivityOverlayCorruptError('Agent activity overlay is empty');
  }
  let parsed: AgentActivityOverlay;
  try {
    parsed = JSON.parse(raw) as AgentActivityOverlay;
  } catch {
    throw new AgentActivityOverlayCorruptError('Agent activity overlay could not be parsed');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new AgentActivityOverlayCorruptError('Agent activity overlay is not an object');
  }
  const ver = parsed.schemaVersion || AGENT_ACTIVITY_OVERLAY_SCHEMA_VERSION;
  if (ver > AGENT_ACTIVITY_OVERLAY_SCHEMA_VERSION) {
    throw new AgentActivityOverlayUnsupportedSchemaError(
      `Agent activity overlay schemaVersion ${ver} is newer than runtime ${AGENT_ACTIVITY_OVERLAY_SCHEMA_VERSION}`,
    );
  }
  return {
    schemaVersion: ver,
    entries: Array.isArray(parsed.entries) ? parsed.entries : [],
  };
}

const overlayWriteLocks = new Map<string, Promise<void>>();

export function writeAgentActivityOverlay(dir: string, overlay: AgentActivityOverlay): void {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const path = agentActivityOverlayFilePath(dir);
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  const payload = JSON.stringify(
    {
      schemaVersion: AGENT_ACTIVITY_OVERLAY_SCHEMA_VERSION,
      entries: overlay.entries.slice(-AGENT_ACTIVITY_MAX_ENTRIES),
    },
    null,
    2,
  );
  writeFileSync(tmp, payload, { mode: 0o600 });
  renameSync(tmp, path);
}

/** In-process serialization. Not a distributed lock — single App Service instance only. */
export async function withAgentActivityWriteLock<T>(dir: string, fn: () => Promise<T> | T): Promise<T> {
  const prev = overlayWriteLocks.get(dir) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  overlayWriteLocks.set(dir, prev.then(() => gate));
  await prev;
  try {
    return await fn();
  } finally {
    release();
  }
}

function isClassification(value: unknown): value is AskAtlasClassification | 'HONEST_EMPTY' {
  return typeof value === 'string' && CLASSIFICATIONS.has(value as AskAtlasClassification | 'HONEST_EMPTY');
}

function isReadWriteStatus(value: unknown): value is AskAtlasReadWriteStatus {
  return typeof value === 'string' && READ_WRITE_STATUSES.has(value as AskAtlasReadWriteStatus);
}

function neverPromote(
  value: AskAtlasClassification | 'HONEST_EMPTY',
): AskAtlasClassification | 'HONEST_EMPTY' {
  return isClassification(value) ? value : 'HONEST_EMPTY';
}

function affectedFromAnswer(answer: AskAtlasAnswer): AgentActivityAffectedEntity[] {
  if (answer.activity.result === 'hvs_blocked' || answer.activity.result === 'honest_empty') {
    return [];
  }
  const out: AgentActivityAffectedEntity[] = [];
  const seen = new Set<string>();
  for (const item of answer.items) {
    const client = item.client?.trim() || undefined;
    const clientCode = item.clientCode?.trim() || undefined;
    if (!client && !clientCode) continue;
    const key = `${clientCode || ''}:${client || ''}:${item.classification}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      ...(client ? { client } : {}),
      ...(clientCode ? { clientCode } : {}),
      classification: item.classification,
    });
  }
  return out;
}

export function ledgerEntryFromAskAtlas(opts: {
  answer: AskAtlasAnswer;
  principal: AtlasPrincipal;
}): AgentActivityLedgerEntry {
  const activity: AskAtlasActivity = opts.answer.activity;
  const classification = neverPromote(activity.classification);
  const affected = affectedFromAnswer(opts.answer);
  return {
    agent: activity.agent,
    missionKey: activity.missionKey,
    trigger: activity.trigger,
    timestamp: activity.timestamp,
    tools: [...activity.tools],
    classification,
    confidence: classification,
    result: activity.result,
    readWriteStatus: isReadWriteStatus(activity.readWriteStatus) ? activity.readWriteStatus : 'READ_AUTO',
    policyDecision: activity.policyDecision,
    ...(affected.length ? { affected } : {}),
    writerUserId: opts.principal.userId,
    ...(typeof activity.ran === 'boolean' ? { ran: activity.ran } : {}),
  };
}

function overlayEnv(dataDir: string, env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return {
    ...env,
    INTEGRATION_DATA_DIR: dataDir || env.INTEGRATION_DATA_DIR,
  };
}

export async function appendAskAtlasActivity(opts: {
  dataDir: string;
  answer: AskAtlasAnswer;
  principal: AtlasPrincipal;
  env?: NodeJS.ProcessEnv;
}): Promise<AgentActivityLedgerEntry> {
  const dir = resolveAgentActivityOverlayDir(opts.dataDir, overlayEnv(opts.dataDir, opts.env || process.env));
  const entry = ledgerEntryFromAskAtlas({
    answer: opts.answer,
    principal: opts.principal,
  });
  await withAgentActivityWriteLock(dir, () => {
    const overlay = readAgentActivityOverlay(dir);
    overlay.entries.push(entry);
    writeAgentActivityOverlay(dir, overlay);
  });
  return entry;
}

function callerMayRead(entry: AgentActivityLedgerEntry, principal: AtlasPrincipal): boolean {
  if (entry.writerUserId === principal.userId) return true;
  const entitled = new Set(entitledClientCodes(principal));
  const codes = (entry.affected || []).map((row) => row.clientCode).filter((code): code is string => Boolean(code));
  if (!codes.length) return false;
  return codes.every((code) => entitled.has(code));
}

export function listVisibleAgentActivity(opts: {
  dataDir: string;
  principal: AtlasPrincipal;
  limit?: number;
  env?: NodeJS.ProcessEnv;
}): AgentActivityLedgerEntry[] {
  const dir = resolveAgentActivityOverlayDir(opts.dataDir, overlayEnv(opts.dataDir, opts.env || process.env));
  const overlay = readAgentActivityOverlay(dir);
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  return overlay.entries.filter((entry) => callerMayRead(entry, opts.principal)).slice(-limit).reverse();
}
