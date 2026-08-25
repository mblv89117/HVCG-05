/**
 * Governed Atlas → V4 engineering loop. No new LLM, CRM, Atlas, SWA, or V5.
 *
 * INSPECT (READ_AUTO) → consume PII create_engineering_mission output
 * → persist PROPOSED records (SAFE_INTERNAL_WRITE) or honest-empty
 * → Agent Activity Ledger (atlas-hub-runtime / LOOP-001).
 *
 * Records are non-authoritative and not auto-executed. V4 chat inject is
 * UNSUPPORTED. This increment does not dispatch V4, deploy, merge, or
 * execute code. Authorization happens before retrieval.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AtlasPrincipal } from '../../middleware/auth.ts';
import {
  classifyImprovementPolicy,
  inspectProductImprovements,
  type ImprovementPolicyDecision,
  type ProductImprovementInspectHealth,
  type ProductImprovementInspectSearch,
} from './productImprovement.ts';
import type { AgentActivityLedgerEntry } from './types.ts';
import {
  ASK_ATLAS_LOOP_MISSION_KEY,
  ASK_ATLAS_PII_MISSION_KEY,
  ASK_ATLAS_QUESTION,
  ASK_ATLAS_RANKING,
  ASK_ATLAS_RUNTIME_AGENT,
  ASK_ATLAS_RUNTIME_MISSION_KEY,
  CREATE_ENGINEERING_MISSION_TOOL,
  ENGINEERING_MISSION_DISPATCH_STATUS,
  V4_CHAT_INJECT,
  type AskAtlasAnswer,
  type AskAtlasClassification,
  type AskAtlasTrigger,
  type OperatorOperatingPicture,
  type PersistedEngineeringMissionRecord,
  type ProposedEngineeringMission,
} from './types.ts';

export const ATLAS_HUB_LOOP_MISSION_KEY = ASK_ATLAS_LOOP_MISSION_KEY;
export const ATLAS_HUB_LOOP_INSPECT_POLICY_CLASS = 'READ_AUTO' as const;
export const ATLAS_HUB_LOOP_PERSIST_POLICY_CLASS = 'SAFE_INTERNAL_WRITE' as const;
export const ENGINEERING_MISSION_OVERLAY_SCHEMA_VERSION = 1;
export const ENGINEERING_MISSION_MAX_RECORDS = 500;
export const DEFAULT_ENGINEERING_MISSION_HOME_DIR = '/home/webapp_data/integrations/engineering-missions';

export type EngineeringLoopOutcome = 'persisted' | 'inspected' | 'honest_empty' | 'hvs_blocked';

export interface AtlasEngineeringLoop {
  agent: typeof ASK_ATLAS_RUNTIME_AGENT;
  missionKey: typeof ASK_ATLAS_LOOP_MISSION_KEY;
  policyClass: typeof ATLAS_HUB_LOOP_INSPECT_POLICY_CLASS | typeof ATLAS_HUB_LOOP_PERSIST_POLICY_CLASS;
  trigger: AskAtlasTrigger;
  inspectClass: string;
  outcome: EngineeringLoopOutcome;
  invented: false;
  honestEmpty: boolean;
  authoritative: false;
  records: PersistedEngineeringMissionRecord[];
  v4ChatInject: typeof V4_CHAT_INJECT;
  dispatchesV4: false;
  deploys: false;
  merges: false;
  executesCodeChanges: false;
  autoExecutes: false;
}

export interface AtlasEngineeringLoopResult {
  engineeringMission: AtlasEngineeringLoop;
  askAtlas: AskAtlasAnswer;
  runtime: {
    agent: typeof ASK_ATLAS_RUNTIME_AGENT;
    toolsInvoked: string[];
    policyClass: typeof ATLAS_HUB_LOOP_INSPECT_POLICY_CLASS;
    missionKey: typeof ASK_ATLAS_RUNTIME_MISSION_KEY;
  };
  recordsToPersist: PersistedEngineeringMissionRecord[];
}

export interface EngineeringMissionOverlay {
  schemaVersion?: number;
  records: PersistedEngineeringMissionRecord[];
}

export class EngineeringMissionOverlayCorruptError extends Error {
  readonly code = 'ENGINEERING_MISSION_OVERLAY_CORRUPT';
  constructor(message: string) {
    super(message);
    this.name = 'EngineeringMissionOverlayCorruptError';
  }
}

export class EngineeringMissionOverlayUnsupportedSchemaError extends Error {
  readonly code = 'ENGINEERING_MISSION_OVERLAY_SCHEMA';
  constructor(message: string) {
    super(message);
    this.name = 'EngineeringMissionOverlayUnsupportedSchemaError';
  }
}

export function classifyLoopPolicy(
  raw: string | undefined | null,
  principal?: AtlasPrincipal,
): ImprovementPolicyDecision {
  return classifyImprovementPolicy(raw, principal);
}

function neverPromote(value: AskAtlasClassification | 'HONEST_EMPTY'): AskAtlasClassification | 'HONEST_EMPTY' {
  if (value === 'CONFIRMED' || value === 'LIKELY' || value === 'PROPOSED' || value === 'HONEST_EMPTY') {
    return value;
  }
  return 'HONEST_EMPTY';
}

function neverPromoteClass(value: AskAtlasClassification | string | undefined): AskAtlasClassification {
  if (value === 'CONFIRMED' || value === 'LIKELY' || value === 'PROPOSED') {
    return value;
  }
  return 'PROPOSED';
}

function recordKey(row: { evidenceClass: string; basedOn: string }): string {
  return `${row.evidenceClass}:${row.basedOn}`;
}

const SCAN_ALL = new Set(['inspect', 'detect', '']);

function wantsClass(inspectClass: string, evidenceClass: string): boolean {
  if (SCAN_ALL.has(inspectClass)) return true;
  return inspectClass === evidenceClass;
}

function honestEmptyAnswer(opts: {
  now?: string;
  trigger: AskAtlasTrigger;
  tools?: string[];
  result?: 'honest_empty' | 'hvs_blocked';
}): AskAtlasAnswer {
  const result = opts.result || 'honest_empty';
  return {
    kind: 'ask_atlas_attention_v1',
    question: ASK_ATLAS_QUESTION,
    invented: false,
    honestEmpty: true,
    ranking: [...ASK_ATLAS_RANKING],
    items: [],
    activity: {
      agent: ASK_ATLAS_RUNTIME_AGENT,
      missionKey: ASK_ATLAS_LOOP_MISSION_KEY,
      trigger: opts.trigger,
      timestamp: opts.now || new Date().toISOString(),
      tools: opts.tools ? [...opts.tools] : [],
      classification: 'HONEST_EMPTY',
      result,
      readWriteStatus: 'READ_AUTO',
      policyDecision: result,
    },
  };
}

function runtimeEnvelope(toolsInvoked: string[]) {
  return {
    agent: ASK_ATLAS_RUNTIME_AGENT,
    toolsInvoked: [...toolsInvoked],
    policyClass: ATLAS_HUB_LOOP_INSPECT_POLICY_CLASS,
    missionKey: ASK_ATLAS_RUNTIME_MISSION_KEY,
  };
}

function loopEnvelope(opts: {
  trigger: AskAtlasTrigger;
  inspectClass: string;
  outcome: EngineeringLoopOutcome;
  honestEmpty: boolean;
  records: PersistedEngineeringMissionRecord[];
}): AtlasEngineeringLoop {
  return {
    agent: ASK_ATLAS_RUNTIME_AGENT,
    missionKey: ASK_ATLAS_LOOP_MISSION_KEY,
    policyClass: opts.outcome === 'persisted' ? ATLAS_HUB_LOOP_PERSIST_POLICY_CLASS : ATLAS_HUB_LOOP_INSPECT_POLICY_CLASS,
    trigger: opts.trigger,
    inspectClass: opts.inspectClass,
    outcome: opts.outcome,
    invented: false,
    honestEmpty: opts.honestEmpty,
    authoritative: false,
    records: opts.records,
    v4ChatInject: V4_CHAT_INJECT,
    dispatchesV4: false,
    deploys: false,
    merges: false,
    executesCodeChanges: false,
    autoExecutes: false,
  };
}

function stampLoopAnswer(opts: {
  records: PersistedEngineeringMissionRecord[];
  trigger: AskAtlasTrigger;
  now?: string;
  persisted: boolean;
}): AskAtlasAnswer {
  const classification = neverPromote(opts.records[0]!.classification);
  return {
    kind: 'ask_atlas_attention_v1',
    question: ASK_ATLAS_QUESTION,
    invented: false,
    honestEmpty: false,
    ranking: [...ASK_ATLAS_RANKING],
    items: [],
    activity: {
      agent: ASK_ATLAS_RUNTIME_AGENT,
      missionKey: ASK_ATLAS_LOOP_MISSION_KEY,
      trigger: opts.trigger,
      timestamp: opts.now || new Date().toISOString(),
      tools: opts.persisted ? [CREATE_ENGINEERING_MISSION_TOOL] : [],
      classification,
      result: 'answered',
      readWriteStatus: opts.persisted ? 'SAFE_INTERNAL_WRITE' : 'READ_AUTO',
      policyDecision: 'answered',
    },
  };
}

export function persistRecordFromProposed(
  mission: ProposedEngineeringMission,
  now?: string,
): PersistedEngineeringMissionRecord {
  return {
    kind: 'persisted_engineering_mission_v1',
    authoritative: false,
    invented: false,
    status: 'PROPOSED',
    dispatchStatus: ENGINEERING_MISSION_DISPATCH_STATUS,
    v4ChatInject: V4_CHAT_INJECT,
    policyClass: 'SAFE_INTERNAL_WRITE',
    readWriteStatus: 'SAFE_INTERNAL_WRITE',
    agent: ASK_ATLAS_RUNTIME_AGENT,
    missionKey: ASK_ATLAS_LOOP_MISSION_KEY,
    sourceMissionKey: ASK_ATLAS_PII_MISSION_KEY,
    why: mission.why,
    basedOn: mission.basedOn,
    evidenceClass: mission.evidenceClass,
    classification: neverPromoteClass(mission.classification),
    dispatchesV4: false,
    deploys: false,
    merges: false,
    executesCodeChanges: false,
    ownerGated: false,
    persistedAt: now || new Date().toISOString(),
  };
}

function emptyLoop(opts: {
  trigger: AskAtlasTrigger;
  inspectClass: string;
  now?: string;
  outcome?: 'honest_empty' | 'hvs_blocked';
}): AtlasEngineeringLoopResult {
  const outcome = opts.outcome || 'honest_empty';
  return {
    engineeringMission: loopEnvelope({
      trigger: opts.trigger,
      inspectClass: opts.inspectClass,
      outcome,
      honestEmpty: true,
      records: [],
    }),
    askAtlas: honestEmptyAnswer({
      now: opts.now,
      trigger: opts.trigger,
      result: outcome,
    }),
    runtime: runtimeEnvelope([]),
    recordsToPersist: [],
  };
}

export function inspectEngineeringMissions(opts: {
  principal: AtlasPrincipal;
  picture: OperatorOperatingPicture;
  ledger?: AgentActivityLedgerEntry[];
  search?: ProductImprovementInspectSearch;
  health?: ProductImprovementInspectHealth;
  inspectClass?: string;
  trigger?: AskAtlasTrigger;
  now?: string;
  persisted?: PersistedEngineeringMissionRecord[];
}): AtlasEngineeringLoopResult {
  const trigger: AskAtlasTrigger = opts.trigger || 'signed_operator_inspect';
  const policy = classifyLoopPolicy(opts.inspectClass, opts.principal);
  if (!policy.allowed) {
    return emptyLoop({
      trigger,
      inspectClass: policy.inspectClass || 'unknown',
      now: opts.now,
    });
  }

  if (opts.picture.hvsDataAccess === 'BLOCKED') {
    return emptyLoop({
      trigger,
      inspectClass: policy.inspectClass,
      now: opts.now,
      outcome: 'hvs_blocked',
    });
  }

  const pii = inspectProductImprovements({
    principal: opts.principal,
    picture: opts.picture,
    ledger: opts.ledger,
    search: opts.search,
    health: opts.health,
    inspectClass: policy.inspectClass,
    trigger,
    now: opts.now,
  });

  if (pii.productImprovement.outcome === 'hvs_blocked') {
    return emptyLoop({
      trigger,
      inspectClass: policy.inspectClass,
      now: opts.now,
      outcome: 'hvs_blocked',
    });
  }

  const existing = (opts.persisted || []).filter((row) => wantsClass(policy.inspectClass, row.evidenceClass));
  const existingKeys = new Set(existing.map(recordKey));
  const fromPii = pii.productImprovement.proposedMissions.map((mission) =>
    persistRecordFromProposed(mission, opts.now),
  );
  const recordsToPersist = fromPii.filter((row) => !existingKeys.has(recordKey(row)));
  const records = [...existing, ...recordsToPersist];
  if (!records.length) {
    return emptyLoop({
      trigger,
      inspectClass: policy.inspectClass,
      now: opts.now,
    });
  }

  const persistedThisRun = recordsToPersist.length > 0;
  return {
    engineeringMission: loopEnvelope({
      trigger,
      inspectClass: policy.inspectClass,
      outcome: persistedThisRun ? 'persisted' : 'inspected',
      honestEmpty: false,
      records,
    }),
    askAtlas: stampLoopAnswer({
      records,
      trigger,
      now: opts.now,
      persisted: persistedThisRun,
    }),
    runtime: runtimeEnvelope(persistedThisRun ? [CREATE_ENGINEERING_MISSION_TOOL] : []),
    recordsToPersist,
  };
}

export function emptyEngineeringMissionOverlay(): EngineeringMissionOverlay {
  return {
    schemaVersion: ENGINEERING_MISSION_OVERLAY_SCHEMA_VERSION,
    records: [],
  };
}

export function resolveEngineeringMissionOverlayDir(
  dataDir: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const explicit = (env.INTEGRATION_ENGINEERING_MISSION_DIR || '').trim();
  if (explicit) return explicit;
  const fromEnv = (env.INTEGRATION_DATA_DIR || '').trim();
  if (fromEnv) return join(fromEnv, 'engineering-missions');
  if ((env.HOME || '') === '/home') {
    const preferred = DEFAULT_ENGINEERING_MISSION_HOME_DIR;
    try {
      mkdirSync(preferred, { recursive: true, mode: 0o700 });
      return preferred;
    } catch {
      /* fall through to dataDir */
    }
  }
  return join(dataDir, 'engineering-missions');
}

export function engineeringMissionOverlayFilePath(dir: string): string {
  return join(dir, 'engineering-missions-overlay.json');
}

export function readEngineeringMissionOverlay(dir: string): EngineeringMissionOverlay {
  const path = engineeringMissionOverlayFilePath(dir);
  if (!existsSync(path)) return emptyEngineeringMissionOverlay();
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'EACCES' || code === 'EPERM' || code === 'EROFS') {
      throw new EngineeringMissionOverlayCorruptError('Engineering mission overlay is unreadable');
    }
    throw err;
  }
  if (!raw.trim()) {
    throw new EngineeringMissionOverlayCorruptError('Engineering mission overlay is empty');
  }
  let parsed: EngineeringMissionOverlay;
  try {
    parsed = JSON.parse(raw) as EngineeringMissionOverlay;
  } catch {
    throw new EngineeringMissionOverlayCorruptError('Engineering mission overlay could not be parsed');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new EngineeringMissionOverlayCorruptError('Engineering mission overlay is not an object');
  }
  const ver = parsed.schemaVersion || ENGINEERING_MISSION_OVERLAY_SCHEMA_VERSION;
  if (ver > ENGINEERING_MISSION_OVERLAY_SCHEMA_VERSION) {
    throw new EngineeringMissionOverlayUnsupportedSchemaError(
      `Engineering mission overlay schemaVersion ${ver} is newer than runtime ${ENGINEERING_MISSION_OVERLAY_SCHEMA_VERSION}`,
    );
  }
  return {
    schemaVersion: ver,
    records: Array.isArray(parsed.records) ? parsed.records : [],
  };
}

const overlayWriteLocks = new Map<string, Promise<void>>();

export function writeEngineeringMissionOverlay(dir: string, overlay: EngineeringMissionOverlay): void {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const path = engineeringMissionOverlayFilePath(dir);
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  const payload = JSON.stringify(
    {
      schemaVersion: ENGINEERING_MISSION_OVERLAY_SCHEMA_VERSION,
      records: overlay.records.slice(-ENGINEERING_MISSION_MAX_RECORDS),
    },
    null,
    2,
  );
  writeFileSync(tmp, payload, { mode: 0o600 });
  renameSync(tmp, path);
}

async function withEngineeringMissionWriteLock<T>(dir: string, fn: () => Promise<T> | T): Promise<T> {
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

function overlayEnv(dataDir: string, env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return {
    ...env,
    INTEGRATION_DATA_DIR: dataDir || env.INTEGRATION_DATA_DIR,
  };
}

export function listPersistedEngineeringMissions(opts: {
  dataDir: string;
  env?: NodeJS.ProcessEnv;
}): PersistedEngineeringMissionRecord[] {
  const dir = resolveEngineeringMissionOverlayDir(opts.dataDir, overlayEnv(opts.dataDir, opts.env || process.env));
  return readEngineeringMissionOverlay(dir).records;
}

export async function persistEngineeringMissionRecords(opts: {
  dataDir: string;
  records: PersistedEngineeringMissionRecord[];
  env?: NodeJS.ProcessEnv;
}): Promise<PersistedEngineeringMissionRecord[]> {
  if (!opts.records.length) return [];
  const dir = resolveEngineeringMissionOverlayDir(opts.dataDir, overlayEnv(opts.dataDir, opts.env || process.env));
  return withEngineeringMissionWriteLock(dir, () => {
    const overlay = readEngineeringMissionOverlay(dir);
    const seen = new Set(overlay.records.map(recordKey));
    const added: PersistedEngineeringMissionRecord[] = [];
    for (const row of opts.records) {
      const key = recordKey(row);
      if (seen.has(key)) continue;
      seen.add(key);
      overlay.records.push(row);
      added.push(row);
    }
    writeEngineeringMissionOverlay(dir, overlay);
    return added;
  });
}
