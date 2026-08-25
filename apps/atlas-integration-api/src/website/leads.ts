/**
 * Website → HVCG_Leads upsert. Uses the Hub Graph transport (no $filter).
 * SoR is SharePoint HVCG_Leads. Not a second CRM. Not Client 360.
 */

import { PmHttpError, pmInfrastructureError } from '../pm/sharepoint/errors.ts';
import type { GraphListItem, PmGraphTransport } from '../pm/sharepoint/graph.ts';
import { fieldsEq, itemMatchesFieldsFilter } from '../pm/sharepoint/odata.ts';
import type { SharePointPmSettings } from '../pm/sharepoint/settings.ts';

const NOTES_MAX = 3500;
const TEXT_MAX = 255;
const SERVICE_INTEREST = new Set([
  'Assessment',
  'Capital Advisory',
  'Fractional CFO',
  'Operational Consulting',
  'Growth',
  'Retainer',
  'Success Fee',
  'Hybrid',
  'Other',
]);
const TERMINAL_STATUS = new Set(['Qualified', 'Disqualified', 'Converted']);

export interface WebsiteLeadUpsertResult {
  ok: true;
  created: boolean;
  itemId: string;
  idempotencyKey: string;
  list: 'HVCG_Leads';
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : typeof v === 'number' && Number.isFinite(v) ? String(v) : '';
}

function clip(value: string, max: number): string {
  return value.length <= max ? value : value.slice(0, max);
}

function contactOf(body: Record<string, unknown>): Record<string, unknown> {
  const top = asRecord(body.contact);
  const full = asRecord(body.fullPayload);
  const nested = asRecord(full.contact);
  return { ...nested, ...top };
}

/** Allowed idempotency key prefixes per submissionType (XSYS-RT-20260820-02). */
export function allowedIdempotencyPrefixes(submissionType: string): string[] {
  const t = submissionType.trim();
  if (t === 'Agent-Copilot') return ['copilot|'];
  if (t === 'Website-EVA') return ['eva|'];
  if (t.startsWith('Website-')) return ['website|'];
  if (t.startsWith('360') || t.toLowerCase().includes('gtm')) return ['360|', 'website|'];
  // Unknown types: only explicit website| — never accept foreign prefixes unbound.
  return ['website|'];
}

/**
 * XSYS-02: reject foreign-prefix overwrite (e.g. Website type + eva| key → 409).
 */
export function assertIdempotencyKeyBoundToSource(
  submissionType: string,
  idempotencyKey: string,
): void {
  const key = idempotencyKey.trim();
  const allowed = allowedIdempotencyPrefixes(submissionType);
  if (!allowed.some((prefix) => key.startsWith(prefix))) {
    throw new PmHttpError(
      409,
      'IDEMPOTENCY_PREFIX_MISMATCH',
      `Idempotency key prefix must match submissionType (${allowed.join(', ')}).`,
    );
  }
}

export function resolveWebsiteLeadIdempotencyKey(body: Record<string, unknown>): string {
  const full = asRecord(body.fullPayload);
  const submissionType = asString(body.submissionType);
  const fromFull = asString(full.idempotencyKey);
  if (fromFull) {
    const key = clip(fromFull, TEXT_MAX);
    assertIdempotencyKeyBoundToSource(submissionType || 'Website-Contact', key);
    return key;
  }
  const sessionId = asString(full.sessionId) || asString(body.correlationId);
  if (submissionType === 'Website-EVA' && sessionId) return clip(`eva|${sessionId}`, TEXT_MAX);
  const assessmentId = asString(full.assessmentId) || asString(body.assessmentId);
  if (submissionType === 'Agent-Copilot' && assessmentId) return clip(`copilot|${assessmentId}`, TEXT_MAX);
  const leadId = asString(body.leadId);
  if (leadId) return clip(`website|${leadId}`, TEXT_MAX);
  return '';
}

function sourceOf(body: Record<string, unknown>): string {
  const submissionType = asString(body.submissionType);
  if (submissionType.startsWith('Website-')) return clip(submissionType, TEXT_MAX);
  const source = asString(body.source);
  if (source) return clip(source, TEXT_MAX);
  return 'HVCG Website';
}

function serviceInterestOf(body: Record<string, unknown>): string {
  const submissionType = asString(body.submissionType);
  const sku = asString(asRecord(asRecord(body.fullPayload).eva).recommended_sku).toUpperCase();
  if (submissionType === 'Website-Funding' || sku.includes('CAP')) return 'Capital Advisory';
  if (sku.includes('FRA')) return 'Fractional CFO';
  if (submissionType === 'Website-EVA' || submissionType === 'Website-Book' || submissionType === 'Agent-Copilot') {
    return 'Assessment';
  }
  return 'Other';
}

function titleOf(body: Record<string, unknown>, contact: Record<string, unknown>): string {
  const full = asRecord(body.fullPayload);
  const company = asRecord(full.company);
  return (
    asString(contact.company) ||
    asString(company.legalName) ||
    asString(contact.name) ||
    'Website lead'
  );
}

function notesOf(body: Record<string, unknown>): string {
  const full = asRecord(body.fullPayload);
  const eva = asRecord(full.eva);
  const payload = {
    leadId: asString(body.leadId),
    correlationId: asString(body.correlationId),
    submissionType: asString(body.submissionType),
    source: asString(body.source),
    submittedAt: asString(body.submittedAt),
    testLabel: asString(body.testLabel),
    nextAction: asString(body.nextAction),
    atlasHint: asString(body.atlasHint),
    eva: eva.band || eva.composite_score_proxy || eva.recommended_sku
      ? {
          band: asString(eva.band),
          composite_score_proxy: eva.composite_score_proxy,
          recommended_sku: asString(eva.recommended_sku),
        }
      : undefined,
  };
  return clip(JSON.stringify(payload), NOTES_MAX);
}

function leadScoreOf(body: Record<string, unknown>): number | undefined {
  const n = Number(asRecord(asRecord(body.fullPayload).eva).composite_score_proxy);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function fieldsFromPayload(
  body: Record<string, unknown>,
  idempotencyKey: string,
  ownerEmail: string,
): Record<string, unknown> {
  const contact = contactOf(body);
  const interest = serviceInterestOf(body);
  const fields: Record<string, unknown> = {
    Title: clip(titleOf(body, contact), TEXT_MAX),
    ContactName: clip(asString(contact.name), TEXT_MAX),
    Email: clip(asString(contact.email).toLowerCase(), TEXT_MAX),
    Phone: clip(asString(contact.phone), TEXT_MAX),
    Source: sourceOf(body),
    HVCG_IdempotencyKey: idempotencyKey,
    LeadSourceDetail: clip(asString(body.submissionType) || 'website-intake', TEXT_MAX),
    Notes: notesOf(body),
    OwnerEmail: clip(ownerEmail, TEXT_MAX),
    IsReferral: false,
  };
  if (SERVICE_INTEREST.has(interest)) fields.ServiceInterest = interest;
  const score = leadScoreOf(body);
  if (score !== undefined) fields.LeadScore = score;
  return fields;
}

async function listAll(graph: PmGraphTransport, listId: string): Promise<GraphListItem[]> {
  const items: GraphListItem[] = [];
  let nextLink: string | undefined;
  do {
    const page = await graph.listItems(listId, { nextLink, top: 100 });
    items.push(...page.items);
    nextLink = page.nextLink;
  } while (nextLink);
  return items;
}

export async function upsertWebsiteLead(opts: {
  settings: SharePointPmSettings;
  graph: PmGraphTransport;
  body: Record<string, unknown>;
  ownerEmail: string;
}): Promise<WebsiteLeadUpsertResult> {
  const listId = opts.settings.leadsListId;
  if (!listId) {
    throw pmInfrastructureError('WEBSITE_INTAKE_UNAVAILABLE', 'Website lead ingest is not configured.');
  }
  const idempotencyKey = resolveWebsiteLeadIdempotencyKey(opts.body);
  if (!idempotencyKey) {
    throw new PmHttpError(400, 'invalid_lead', 'idempotencyKey or leadId is required.');
  }
  // Defense in depth: synthesized keys are already prefix-bound; re-assert before write.
  assertIdempotencyKeyBoundToSource(asString(opts.body.submissionType) || 'Website-Contact', idempotencyKey);
  const contact = contactOf(opts.body);
  if (!asString(contact.email) && asString(opts.body.submissionType) !== 'Website-Privacy-Request') {
    throw new PmHttpError(400, 'invalid_lead', 'contact.email is required.');
  }
  const fields = fieldsFromPayload(opts.body, idempotencyKey, opts.ownerEmail);
  const items = await listAll(opts.graph, listId);
  const matches = items.filter((item) => itemMatchesFieldsFilter(item, fieldsEq('HVCG_IdempotencyKey', idempotencyKey)));
  if (matches.length > 1) {
    throw new PmHttpError(409, 'PM_IDEMPOTENCY_CONFLICT', 'Idempotency key already used.');
  }
  const existing = matches[0];
  if (existing) {
    const status = asString(existing.fields.LeadStatus);
    const patch = { ...fields };
    if (TERMINAL_STATUS.has(status)) {
      delete patch.LeadStatus;
    }
    const updated = await opts.graph.patchItemFields(listId, existing.id, patch, existing.etag);
    return {
      ok: true,
      created: false,
      itemId: updated.id,
      idempotencyKey,
      list: 'HVCG_Leads',
    };
  }
  const created = await opts.graph.createItem(listId, { ...fields, LeadStatus: 'New' });
  return {
    ok: true,
    created: true,
    itemId: created.id,
    idempotencyKey,
    list: 'HVCG_Leads',
  };
}
