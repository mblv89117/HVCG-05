/**
 * HFD01-only 360.campaign_approval.v1 observe continuity.
 * Typed payload allow-list, verified identity dual-resolve, and a sync read
 * model of the durable accept so Approval Center does not depend on overlay
 * projection. canExecute stays false. No 360 mutation.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  EVENT_360_CAMPAIGN_APPROVAL,
  SCHEMA_360_CAMPAIGN_APPROVAL,
  type AtlasIntegrationEnvelope,
} from '@hvcg/atlas-integration-contracts';
import { getIdentityRegistry } from '../../identity/registry.ts';
import { loadIngestStore, type StoredIngest } from './store.ts';

export const GROWTH360_OWNER_DECISION_RESULT =
  'owner decision recorded in Atlas; 360 campaign mutation not performed.';

const ALLOWED_PAYLOAD_KEYS = new Set([
  'campaignId',
  'organizationSlug',
  'organizationId',
  'requestedAction',
  'requestId',
  'canExecute',
]);

const FIXTURE_CODES = new Set(['MRI01', 'SYN01', 'T360A']);
const SHORT_TEXT_MAX = 240;
const ID_MAX = 255;

export type CampaignApprovalFields = {
  campaignId?: string;
  organizationSlug?: string;
  organizationId?: string;
  requestedAction?: string;
  requestId: string;
};

export type CampaignApprovalDecision =
  | ({ ok: true } & CampaignApprovalFields)
  | { ok: false; status: number; code: string; message: string };

type ContinuityFile = { byIdempotencyKey: Record<string, StoredIngest> };

function continuityPath(dataDir: string): string {
  return join(dataDir, 'module-ingest', 'growth360-approval-continuity.json');
}

function fail(
  status: number,
  code: string,
  message: string,
): { ok: false; status: number; code: string; message: string } {
  return { ok: false, status, code, message };
}

function optionalId(
  value: unknown,
  field: string,
): { ok: true; value?: string } | { ok: false; status: number; code: string; message: string } {
  if (value === undefined) return { ok: true };
  if (typeof value !== 'string') {
    return fail(400, 'PAYLOAD_FIELD_INVALID', `${field} must be a string.`);
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > ID_MAX) {
    return fail(400, 'PAYLOAD_FIELD_INVALID', `${field} must be a non-empty id.`);
  }
  return { ok: true, value: trimmed };
}

export function isFixtureClientCode(clientCode: string): boolean {
  return FIXTURE_CODES.has(clientCode);
}

export function growth360ApprovalId(idempotencyKey: string): string {
  return `growth360:${idempotencyKey}`;
}

export function growth360SlugLocalId(slug: string): string {
  return `slug:${slug}`;
}

/** Verified seed only. Does not invent a 360 organization. */
export function verifiedGrowth360Client(clientCode: string): boolean {
  if (!clientCode || isFixtureClientCode(clientCode)) return false;
  const mapping = getIdentityRegistry().getByClientCode(clientCode);
  if (!mapping || mapping.confidence !== 'VERIFIED') return false;
  const org = mapping.growth360OrganizationId?.trim();
  const slug = mapping.growth360Slug?.trim();
  return Boolean(org || slug);
}

export function evaluateCampaignApproval(
  envelope: AtlasIntegrationEnvelope,
): CampaignApprovalDecision {
  if (envelope.schemaVersion !== SCHEMA_360_CAMPAIGN_APPROVAL) {
    return fail(400, 'SCHEMA_MISMATCH', 'Expected 360_campaign_approval_v1.');
  }
  const payload = envelope.payload;
  if (payload.canExecute === true || (payload.canExecute !== undefined && payload.canExecute !== false)) {
    return fail(400, 'PAID_EXECUTE_FORBIDDEN', '360 campaign execute remains prohibited at Hub ingest.');
  }
  for (const key of Object.keys(payload)) {
    if (!ALLOWED_PAYLOAD_KEYS.has(key)) {
      return fail(400, 'PAYLOAD_FIELD_NOT_ALLOWED', `Payload field not allowed on 360.campaign_approval.v1: ${key.slice(0, 64)}`);
    }
  }

  const campaignId = optionalId(payload.campaignId, 'campaignId');
  if (!campaignId.ok) return campaignId;
  const organizationSlug = optionalId(payload.organizationSlug, 'organizationSlug');
  if (!organizationSlug.ok) return organizationSlug;
  const organizationId = optionalId(payload.organizationId, 'organizationId');
  if (!organizationId.ok) return organizationId;
  const requestIdField = optionalId(payload.requestId, 'requestId');
  if (!requestIdField.ok) return requestIdField;

  let requestedAction: string | undefined;
  if (payload.requestedAction !== undefined) {
    if (typeof payload.requestedAction !== 'string') {
      return fail(400, 'PAYLOAD_FIELD_INVALID', 'requestedAction must be short text.');
    }
    const trimmed = payload.requestedAction.trim();
    if (!trimmed || trimmed.length > SHORT_TEXT_MAX) {
      return fail(400, 'PAYLOAD_FIELD_INVALID', 'requestedAction must be short text.');
    }
    requestedAction = trimmed;
  }

  if (organizationSlug.value === 'hart-family-dental' && envelope.clientCode !== 'HFD01') {
    return fail(403, 'HART_CLIENTCODE_REQUIRED', 'Hart Family Dental requires ClientCode HFD01.');
  }
  if (!verifiedGrowth360Client(envelope.clientCode)) {
    return fail(403, 'GROWTH360_UNMAPPED', 'ClientCode has no verified 360 organization map — fail closed.');
  }

  const registry = getIdentityRegistry();
  if (organizationId.value) {
    const dual = registry.dualResolve({
      clientCode: envelope.clientCode,
      system: 'growth_360',
      localId: organizationId.value,
    });
    if (!dual.ok || dual.result.clientCode !== envelope.clientCode) {
      return fail(403, 'GROWTH360_ORG_CLIENTCODE_MISMATCH', 'ClientCode and 360 organizationId disagree or are unmapped.');
    }
  }
  if (organizationSlug.value) {
    const dual = registry.dualResolve({
      clientCode: envelope.clientCode,
      system: 'growth_360',
      localId: growth360SlugLocalId(organizationSlug.value),
    });
    if (!dual.ok || dual.result.clientCode !== envelope.clientCode) {
      return fail(403, 'GROWTH360_ORG_CLIENTCODE_MISMATCH', 'ClientCode and 360 organizationSlug disagree or are unmapped.');
    }
  }

  return {
    ok: true,
    campaignId: campaignId.value,
    organizationSlug: organizationSlug.value,
    organizationId: organizationId.value,
    requestedAction,
    requestId: requestIdField.value || envelope.sourceRecordId,
  };
}

function loadContinuity(dataDir: string): ContinuityFile {
  const path = continuityPath(dataDir);
  if (!existsSync(path)) return { byIdempotencyKey: {} };
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as ContinuityFile;
    return raw?.byIdempotencyKey ? raw : { byIdempotencyKey: {} };
  } catch {
    return { byIdempotencyKey: {} };
  }
}

function saveContinuity(dataDir: string, file: ContinuityFile): void {
  mkdirSync(join(dataDir, 'module-ingest'), { recursive: true });
  writeFileSync(continuityPath(dataDir), JSON.stringify(file, null, 2), 'utf8');
}

/**
 * Sync read model written after a durable accept. Azure Table is not listed
 * synchronously; this index is what Approval Center reads when projection fails.
 * First write for an idempotency key wins.
 */
export function recordGrowth360ApprovalContinuity(opts: {
  dataDir: string;
  envelope: AtlasIntegrationEnvelope;
  receivedAt: string;
}): void {
  if (opts.envelope.eventType !== EVENT_360_CAMPAIGN_APPROVAL) return;
  if (!evaluateCampaignApproval(opts.envelope).ok) return;
  const file = loadContinuity(opts.dataDir);
  const key = opts.envelope.idempotencyKey;
  if (file.byIdempotencyKey[key]) return;
  file.byIdempotencyKey[key] = {
    receivedAt: opts.receivedAt,
    keyId: 'growth360-continuity',
    envelope: opts.envelope,
  };
  saveContinuity(opts.dataDir, file);
}

export type Growth360ApprovalRequest = {
  idempotencyKey: string;
  receivedAt: string;
  envelope: AtlasIntegrationEnvelope;
  fields: CampaignApprovalFields;
};

function remember(
  byKey: Map<string, Growth360ApprovalRequest>,
  record: StoredIngest | undefined,
): void {
  const envelope = record?.envelope;
  if (!envelope || envelope.eventType !== EVENT_360_CAMPAIGN_APPROVAL) return;
  const decision = evaluateCampaignApproval(envelope);
  if (!decision.ok) return;
  const idempotencyKey = envelope.idempotencyKey;
  if (!idempotencyKey || byKey.has(idempotencyKey)) return;
  byKey.set(idempotencyKey, {
    idempotencyKey,
    receivedAt: record?.receivedAt || envelope.timestamp,
    envelope,
    fields: {
      campaignId: decision.campaignId,
      organizationSlug: decision.organizationSlug,
      organizationId: decision.organizationId,
      requestedAction: decision.requestedAction,
      requestId: decision.requestId,
    },
  });
}

/** One request per durable idempotency key. Store wins over the continuity index. */
export function listGrowth360ApprovalRequests(dataDir: string): Growth360ApprovalRequest[] {
  const byKey = new Map<string, Growth360ApprovalRequest>();
  const durable = loadIngestStore(dataDir);
  for (const record of Object.values(durable.byIdempotencyKey)) remember(byKey, record);
  const continuity = loadContinuity(dataDir);
  for (const record of Object.values(continuity.byIdempotencyKey)) remember(byKey, record);
  return [...byKey.values()];
}
