/**
 * Communication Policy Center — records scoped comms policy.
 * Does not send mail. Does not replace Approval Center.
 * Global AUTO_RESPOND stays disabled (COMMUNICATIONS_AUTO_RESPOND).
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AtlasPrincipal } from '../../middleware/auth.ts';
import { entitledClientCodes } from '../sharepoint/authz.ts';
import {
  ENTITLED_CANONICAL_CLIENT_CODES,
  resolveEntitledClientCodeFromQuestion,
} from './clientOnboardingAutomation.ts';
import { COMMUNICATIONS_AUTO_RESPOND, COMMUNICATIONS_POLICY_CLASS } from './types.ts';

export const COMMUNICATION_POLICY_CENTER_CONTRACT = 'atlas-hub-communication-policies.v1' as const;
export const COMMUNICATION_POLICY_CENTER_MISSION_KEY = 'ATLAS-COMMUNICATION-POLICY-CENTER-001' as const;
export const COMMUNICATION_POLICY_SCHEMA_VERSION = 1;

export const COMMUNICATION_POLICY_ROSTER = ENTITLED_CANONICAL_CLIENT_CODES;
export type CommunicationPolicyRosterCode = (typeof COMMUNICATION_POLICY_ROSTER)[number];

export type CommunicationPolicyScopeKind = 'org' | 'client' | 'domain' | 'contact';
export type CommunicationPolicyMode = 'DRAFT_ONLY' | 'REQUIRE_APPROVAL' | 'AUTO_RESPOND';

export type CommunicationPolicyRecord = {
  policyId: string;
  scopeKind: CommunicationPolicyScopeKind;
  mode: CommunicationPolicyMode;
  clientCode?: CommunicationPolicyRosterCode;
  domain?: string;
  contact?: string;
  recordedAt: string;
  recordedBy: string;
  autoSend: false;
};

export type CommunicationPolicyOverlay = {
  schemaVersion?: number;
  records: CommunicationPolicyRecord[];
};

export type CommunicationPolicyCenterModel = {
  contractVersion: typeof COMMUNICATION_POLICY_CENTER_CONTRACT;
  missionKey: typeof COMMUNICATION_POLICY_CENTER_MISSION_KEY;
  generatedAt: string;
  globalAutoRespond: typeof COMMUNICATIONS_AUTO_RESPOND;
  orgDefault: {
    scopeKind: 'org';
    mode: 'DRAFT_ONLY';
    policyClass: typeof COMMUNICATIONS_POLICY_CLASS;
    recorded: boolean;
  };
  items: CommunicationPolicyRecord[];
  approvalPath: 'Approval Center';
};

export type CommunicationPolicyWriteInput = {
  scopeKind?: unknown;
  mode?: unknown;
  clientCode?: unknown;
  domain?: unknown;
  contact?: unknown;
};

export type CommunicationPolicyWriteError =
  | 'invalid_scope'
  | 'invalid_mode'
  | 'unknown_client_code'
  | 'client_not_entitled'
  | 'org_default_must_be_draft_only'
  | 'auto_respond_not_org_default'
  | 'auto_respond_requires_explicit_scope';

const SCOPE_KINDS = new Set<CommunicationPolicyScopeKind>(['org', 'client', 'domain', 'contact']);
const MODES = new Set<CommunicationPolicyMode>(['DRAFT_ONLY', 'REQUIRE_APPROVAL', 'AUTO_RESPOND']);

export function isRosterClientCode(code: string): code is CommunicationPolicyRosterCode {
  return (COMMUNICATION_POLICY_ROSTER as readonly string[]).includes(code);
}

export function resolveCommunicationPolicyDir(dataDir: string, env: NodeJS.ProcessEnv = process.env): string {
  const explicit = (env.INTEGRATION_COMMUNICATION_POLICY_DIR || '').trim();
  if (explicit) return explicit;
  const fromEnv = (env.INTEGRATION_DATA_DIR || '').trim();
  if (fromEnv) return join(fromEnv, 'communication-policies');
  return join(dataDir, 'communication-policies');
}

export function communicationPolicyFilePath(dir: string): string {
  return join(dir, 'communication-policy-overlay.json');
}

export function emptyCommunicationPolicyOverlay(): CommunicationPolicyOverlay {
  return { schemaVersion: COMMUNICATION_POLICY_SCHEMA_VERSION, records: [] };
}

export function readCommunicationPolicyOverlay(dir: string): CommunicationPolicyOverlay {
  const path = communicationPolicyFilePath(dir);
  if (!existsSync(path)) return emptyCommunicationPolicyOverlay();
  const raw = readFileSync(path, 'utf8');
  if (!raw.trim()) return emptyCommunicationPolicyOverlay();
  const parsed = JSON.parse(raw) as CommunicationPolicyOverlay;
  return {
    schemaVersion: parsed.schemaVersion ?? COMMUNICATION_POLICY_SCHEMA_VERSION,
    records: Array.isArray(parsed.records) ? parsed.records : [],
  };
}

export function writeCommunicationPolicyOverlay(dir: string, overlay: CommunicationPolicyOverlay): void {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const path = communicationPolicyFilePath(dir);
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(
    tmp,
    JSON.stringify(
      { schemaVersion: COMMUNICATION_POLICY_SCHEMA_VERSION, records: overlay.records },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  renameSync(tmp, path);
}

export function orgDefaultPolicy(recordedBy = 'system', recordedAt = new Date().toISOString()): CommunicationPolicyRecord {
  return {
    policyId: 'org:default',
    scopeKind: 'org',
    mode: 'DRAFT_ONLY',
    recordedAt,
    recordedBy,
    autoSend: false,
  };
}

export function policyIdFor(input: {
  scopeKind: CommunicationPolicyScopeKind;
  clientCode?: string;
  domain?: string;
  contact?: string;
}): string {
  if (input.scopeKind === 'org') return 'org:default';
  if (input.scopeKind === 'client') return `client:${(input.clientCode || '').toUpperCase()}`;
  if (input.scopeKind === 'domain') return `domain:${(input.domain || '').trim().toLowerCase()}`;
  return `contact:${(input.contact || '').trim().toLowerCase()}`;
}

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function validateCommunicationPolicyWrite(
  input: CommunicationPolicyWriteInput,
  entitledCodes: readonly string[],
):
  | { ok: true; scopeKind: CommunicationPolicyScopeKind; mode: CommunicationPolicyMode; clientCode?: CommunicationPolicyRosterCode; domain?: string; contact?: string }
  | { ok: false; error: CommunicationPolicyWriteError } {
  const scopeKind = asTrimmedString(input.scopeKind).toLowerCase() as CommunicationPolicyScopeKind;
  const mode = asTrimmedString(input.mode).toUpperCase() as CommunicationPolicyMode;
  const clientCode = asTrimmedString(input.clientCode).toUpperCase();
  const domain = asTrimmedString(input.domain).toLowerCase();
  const contact = asTrimmedString(input.contact).toLowerCase();

  if (!SCOPE_KINDS.has(scopeKind)) return { ok: false, error: 'invalid_scope' };
  if (!MODES.has(mode)) return { ok: false, error: 'invalid_mode' };

  if (scopeKind === 'org') {
    if (mode === 'AUTO_RESPOND') return { ok: false, error: 'auto_respond_not_org_default' };
    if (mode !== 'DRAFT_ONLY') return { ok: false, error: 'org_default_must_be_draft_only' };
    return { ok: true, scopeKind, mode: 'DRAFT_ONLY' };
  }

  if (mode === 'AUTO_RESPOND' && scopeKind !== 'client' && scopeKind !== 'domain' && scopeKind !== 'contact') {
    return { ok: false, error: 'auto_respond_requires_explicit_scope' };
  }

  if (clientCode) {
    if (!isRosterClientCode(clientCode)) return { ok: false, error: 'unknown_client_code' };
    if (!entitledCodes.includes(clientCode)) return { ok: false, error: 'client_not_entitled' };
  }

  if (scopeKind === 'client') {
    if (!clientCode) return { ok: false, error: 'invalid_scope' };
    if (!isRosterClientCode(clientCode)) return { ok: false, error: 'unknown_client_code' };
    return { ok: true, scopeKind, mode, clientCode };
  }

  if (scopeKind === 'domain') {
    if (!domain) return { ok: false, error: 'invalid_scope' };
    return {
      ok: true,
      scopeKind,
      mode,
      domain,
      ...(clientCode && isRosterClientCode(clientCode) ? { clientCode } : {}),
    };
  }

  if (!contact) return { ok: false, error: 'invalid_scope' };
  return {
    ok: true,
    scopeKind,
    mode,
    contact,
    ...(clientCode && isRosterClientCode(clientCode) ? { clientCode } : {}),
  };
}

function callerMaySeeRecord(principal: AtlasPrincipal, record: CommunicationPolicyRecord): boolean {
  if (record.scopeKind === 'org') return true;
  if (!record.clientCode) return true;
  return entitledClientCodes(principal).includes(record.clientCode);
}

export function listCommunicationPolicies(opts: {
  principal: AtlasPrincipal;
  dataDir: string;
}): CommunicationPolicyCenterModel {
  const dir = resolveCommunicationPolicyDir(opts.dataDir);
  const overlay = readCommunicationPolicyOverlay(dir);
  const recordedOrg = overlay.records.find((r) => r.scopeKind === 'org');
  const org = recordedOrg && recordedOrg.mode === 'DRAFT_ONLY' ? recordedOrg : orgDefaultPolicy();
  const scoped = overlay.records.filter((r) => r.scopeKind !== 'org' && callerMaySeeRecord(opts.principal, r));
  return {
    contractVersion: COMMUNICATION_POLICY_CENTER_CONTRACT,
    missionKey: COMMUNICATION_POLICY_CENTER_MISSION_KEY,
    generatedAt: new Date().toISOString(),
    globalAutoRespond: COMMUNICATIONS_AUTO_RESPOND,
    orgDefault: {
      scopeKind: 'org',
      mode: 'DRAFT_ONLY',
      policyClass: COMMUNICATIONS_POLICY_CLASS,
      recorded: Boolean(recordedOrg && recordedOrg.mode === 'DRAFT_ONLY'),
    },
    items: [org, ...scoped].sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt)),
    approvalPath: 'Approval Center',
  };
}

export function recordCommunicationPolicy(opts: {
  principal: AtlasPrincipal;
  dataDir: string;
  input: CommunicationPolicyWriteInput;
}):
  | { ok: true; record: CommunicationPolicyRecord; model: CommunicationPolicyCenterModel }
  | { ok: false; error: CommunicationPolicyWriteError } {
  const entitled = entitledClientCodes(opts.principal).filter((code) => isRosterClientCode(code));
  const validated = validateCommunicationPolicyWrite(opts.input, entitled);
  if (!validated.ok) return validated;

  const now = new Date().toISOString();
  const record: CommunicationPolicyRecord = {
    policyId: policyIdFor(validated),
    scopeKind: validated.scopeKind,
    mode: validated.mode,
    ...(validated.clientCode ? { clientCode: validated.clientCode } : {}),
    ...(validated.domain ? { domain: validated.domain } : {}),
    ...(validated.contact ? { contact: validated.contact } : {}),
    recordedAt: now,
    recordedBy: opts.principal.userId,
    autoSend: false,
  };

  const dir = resolveCommunicationPolicyDir(opts.dataDir);
  const overlay = readCommunicationPolicyOverlay(dir);
  const idx = overlay.records.findIndex((r) => r.policyId === record.policyId);
  if (idx >= 0) overlay.records[idx] = record;
  else overlay.records.push(record);
  writeCommunicationPolicyOverlay(dir, overlay);

  return {
    ok: true,
    record,
    model: listCommunicationPolicies({ principal: opts.principal, dataDir: opts.dataDir }),
  };
}

export function mapsToCommunicationPolicyIntent(question: string): boolean {
  const q = question.toLowerCase();
  return (
    (q.includes('communication policy') || q.includes('comms policy') || q.includes('auto-respond') || q.includes('auto respond')) &&
    (q.includes('policy') || q.includes('what is') || q.includes('for'))
  );
}

export function answerCommunicationPolicy(
  question: string,
  model: CommunicationPolicyCenterModel,
  entitledCodes: readonly string[],
): { text: string; honestEmpty: boolean; clientCode?: string } {
  const match = resolveEntitledClientCodeFromQuestion(question, entitledCodes);
  if (match.kind === 'ambiguous') {
    return {
      text: `Communication policy is ambiguous across ${match.candidates.join(', ')}. Ask with a full ClientCode.`,
      honestEmpty: true,
    };
  }
  if (match.kind === 'none') {
    return {
      text: 'No recorded communication policy matched that question. Organization default remains DRAFT_ONLY. AUTO_RESPOND is not globally enabled. Approval Center remains the approval path. Atlas does not auto-send mail.',
      honestEmpty: true,
    };
  }

  const clientCode = match.clientCode;
  const scoped = model.items.filter(
    (row) => row.scopeKind !== 'org' && row.clientCode === clientCode,
  );
  if (!scoped.length) {
    return {
      text: `No recorded communication policy for ${clientCode}. Organization default remains DRAFT_ONLY. AUTO_RESPOND is not globally enabled. Atlas does not auto-send mail.`,
      honestEmpty: true,
      clientCode,
    };
  }
  const lines = scoped.map((row) => {
    const scope =
      row.scopeKind === 'client'
        ? row.clientCode
        : row.scopeKind === 'domain'
          ? `${row.domain}${row.clientCode ? ` (${row.clientCode})` : ''}`
          : `${row.contact}${row.clientCode ? ` (${row.clientCode})` : ''}`;
    return `${scope}: ${row.mode}`;
  });
  return {
    text: `Recorded communication policy for ${clientCode}:\n${lines.join('\n')}\nOrganization default remains DRAFT_ONLY. AUTO_RESPOND is not globally enabled. Atlas does not auto-send mail. Approvals remain the approval path.`,
    honestEmpty: false,
    clientCode,
  };
}
