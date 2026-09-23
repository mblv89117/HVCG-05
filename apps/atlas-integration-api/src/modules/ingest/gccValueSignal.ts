/**
 * PDG01 gcc.value_signal.v1 observe-honesty gate.
 * Verified GCC map only, typed payload allow-list, and text projection.
 * Observation-only. copiesLedger stays false. canExecute stays false.
 * Does not invent a GCC organization, a finance taxonomy, or an Approval Center item.
 */
import {
  EVENT_GCC_SYN01_OBSERVATION,
  EVENT_GCC_VALUE_SIGNAL,
  SCHEMA_GCC_VALUE_SIGNAL,
  type AtlasIntegrationEnvelope,
} from '@hvcg/atlas-integration-contracts';
import { getIdentityRegistry } from '../../identity/registry.ts';
import { GCC_SIGNAL_TYPES, type GccSignalType } from '../../pm/commercialContext/types.ts';

const ALLOWED_PAYLOAD_KEYS = new Set([
  'organizationId',
  'signalType',
  'finding',
  'evidence',
  'summary',
  'financialImpact',
  'autoProvision',
]);

const FIXTURE_CODES = new Set(['MRI01', 'SYN01', 'T360A']);
const TEXT_MAX = 2000;
const ID_MAX = 64;

export type GccValueSignalFields = {
  organizationId?: string;
  signalType: GccSignalType;
  /** Finding and evidence folded into text. Dollar amounts are not included. */
  summary?: string;
};

export type GccValueSignalDecision =
  | ({ ok: true } & GccValueSignalFields)
  | { ok: false; status: number; code: string; message: string };

function fail(
  status: number,
  code: string,
  message: string,
): { ok: false; status: number; code: string; message: string } {
  return { ok: false, status, code, message };
}

export function isFixtureClientCode(clientCode: string): boolean {
  return FIXTURE_CODES.has(clientCode);
}

/** Verified production seed only. Does not invent a GCC organization. */
export function verifiedGccClient(clientCode: string): boolean {
  if (!clientCode || isFixtureClientCode(clientCode)) return false;
  const mapping = getIdentityRegistry().getByClientCode(clientCode);
  if (!mapping || mapping.confidence !== 'VERIFIED') return false;
  return Boolean(mapping.gccOrganizationId?.trim());
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

function optionalText(
  value: unknown,
  field: string,
): { ok: true; value?: string } | { ok: false; status: number; code: string; message: string } {
  if (value === undefined) return { ok: true };
  if (typeof value !== 'string') {
    return fail(400, 'PAYLOAD_FIELD_INVALID', `${field} must be text.`);
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > TEXT_MAX) {
    return fail(400, 'PAYLOAD_FIELD_INVALID', `${field} must be text.`);
  }
  return { ok: true, value: trimmed };
}

const CURRENCY_CODES = 'USD|EUR|GBP|CAD|AUD|NZD|CHF|JPY';
const MONEY_NUMBER = '\\d{1,3}(?:,\\d{3})+(?:\\.\\d+)?|\\d+(?:\\.\\d+)?';
const CASH_WORD = 'runway|cash|forecast';
const CASH_UNIT = 'months?|days?|weeks?|years?';

function stripImpactFigure(text: string, impact: number): string {
  const abs = String(Math.abs(impact));
  const grouped = abs.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const tokens = abs === grouped ? [abs] : [abs, grouped];
  let out = text;
  for (const token of tokens) {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`(?<![\\d.,])${escaped}(?:\\.\\d+)?(?!\\d)`, 'g'), '');
  }
  return out;
}

/** Remove cash/runway/forecast amounts so a phrase cannot remain as a finance fact. */
function neutralizeCashRunwayAmounts(text: string): string {
  const leading = new RegExp(
    `\\b(?:${CASH_WORD})\\b(?:\\s+(?:of|on|hand|balance|is|at))*\\s+(?:${MONEY_NUMBER})(?:\\s+(?:${CASH_UNIT}))?`,
    'gi',
  );
  const trailing = new RegExp(
    `\\b(?:${MONEY_NUMBER})(?:\\s+(?:${CASH_UNIT}))?\\s+(?:${CASH_WORD})\\b`,
    'gi',
  );
  return text.replace(leading, '').replace(trailing, '');
}

/**
 * Strip currency amounts from observation text.
 * Finding and evidence stay as words. Dollar figures, including decimals,
 * currency codes, and cash/runway amounts, do not.
 */
export function redactFinancialDollars(text: string, impact?: number): string {
  let out = text.replace(new RegExp(`\\$[ \\t]{0,2}(?:${MONEY_NUMBER})`, 'g'), '');
  out = out.replace(new RegExp(`\\b(?:${CURRENCY_CODES})[ \\t]{0,2}(?:${MONEY_NUMBER})`, 'gi'), '');
  out = neutralizeCashRunwayAmounts(out);
  if (typeof impact === 'number' && Number.isFinite(impact) && impact !== 0) {
    out = stripImpactFigure(out, impact);
  }
  out = out.replace(/\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b/g, '');
  out = out.replace(/\b\d{4,}(?:\.\d+)?\b/g, '');
  return out.replace(/\s{2,}/g, ' ').trim();
}

function projectObservationSummary(opts: {
  summary?: string;
  finding?: string;
  evidence?: string;
  financialImpact?: number;
}): string | undefined {
  const parts: string[] = [];
  const summary = opts.summary ? redactFinancialDollars(opts.summary, opts.financialImpact) : '';
  const finding = opts.finding ? redactFinancialDollars(opts.finding, opts.financialImpact) : '';
  const evidence = opts.evidence ? redactFinancialDollars(opts.evidence, opts.financialImpact) : '';
  if (summary) parts.push(summary);
  if (finding) parts.push(`Finding: ${finding}`);
  if (evidence) parts.push(`Evidence: ${evidence}`);
  if (!parts.length) return undefined;
  return parts.join(' ').slice(0, TEXT_MAX);
}

/** Quote an already-projected observation. Does not add dollar fields. */
export function gccObservationHonestyLine(signal: { signalType: string; summary?: string }): string {
  const text = redactFinancialDollars((signal.summary || '').replace(/\s+/g, ' ').trim());
  const quote = text ? `signalType=${signal.signalType}; summary=${text}` : `signalType=${signal.signalType}`;
  return `${quote}. observation-only. copiesLedger=false. canExecute=false. Not a certified ledger.`;
}

export function evaluateGccValueSignal(envelope: AtlasIntegrationEnvelope): GccValueSignalDecision {
  if (
    envelope.eventType !== EVENT_GCC_VALUE_SIGNAL &&
    envelope.eventType !== EVENT_GCC_SYN01_OBSERVATION
  ) {
    return fail(400, 'UNSUPPORTED_EVENT', 'Expected gcc.value_signal.v1.');
  }
  if (envelope.schemaVersion !== SCHEMA_GCC_VALUE_SIGNAL) {
    return fail(400, 'SCHEMA_MISMATCH', 'Expected gcc-value-signal.v1.');
  }
  if (envelope.authorityClass !== 'OBSERVE' && envelope.authorityClass !== 'RECOMMEND') {
    return fail(400, 'AUTHORITY_NOT_OBSERVE', 'GCC ingest is observation-only.');
  }

  const payload = envelope.payload;
  for (const key of Object.keys(payload)) {
    if (!ALLOWED_PAYLOAD_KEYS.has(key)) {
      return fail(
        400,
        'PAYLOAD_FIELD_NOT_ALLOWED',
        `Payload field not allowed on gcc.value_signal.v1: ${key.slice(0, 64)}`,
      );
    }
  }

  if (payload.autoProvision !== undefined && payload.autoProvision !== false) {
    return fail(400, 'AUTO_PROVISION_FORBIDDEN', 'GCC auto-provision remains false.');
  }

  const organizationId = optionalId(payload.organizationId, 'organizationId');
  if (!organizationId.ok) return organizationId;
  const summary = optionalText(payload.summary, 'summary');
  if (!summary.ok) return summary;
  const finding = optionalText(payload.finding, 'finding');
  if (!finding.ok) return finding;
  const evidence = optionalText(payload.evidence, 'evidence');
  if (!evidence.ok) return evidence;

  let financialImpact: number | undefined;
  if (payload.financialImpact !== undefined) {
    if (typeof payload.financialImpact !== 'number' || !Number.isFinite(payload.financialImpact)) {
      return fail(400, 'PAYLOAD_FIELD_INVALID', 'financialImpact must be a finite number.');
    }
    financialImpact = payload.financialImpact;
  }
  if (envelope.confidence === 'INFERRED' && typeof financialImpact === 'number' && financialImpact > 0) {
    return fail(400, 'INFERRED_IMPACT_FORBIDDEN', 'INFERRED signals must not claim financialImpact > 0.');
  }

  if (typeof payload.signalType !== 'string' || !payload.signalType.trim()) {
    return fail(
      400,
      'SIGNAL_TYPE_UNMAPPED',
      'signalType is not an allow-listed gcc.value_signal.v1 type. Atlas will not rewrite it or invent a finance taxonomy.',
    );
  }
  const signalTypeRaw = payload.signalType.trim();
  if (!GCC_SIGNAL_TYPES.includes(signalTypeRaw as GccSignalType)) {
    return fail(
      400,
      'SIGNAL_TYPE_UNMAPPED',
      'signalType is not an allow-listed gcc.value_signal.v1 type. Atlas will not rewrite it or invent a finance taxonomy.',
    );
  }

  if (!verifiedGccClient(envelope.clientCode)) {
    return fail(
      403,
      'GCC_UNMAPPED',
      'ClientCode has no verified GCC organization map — fail closed. Atlas does not invent a GCC organization.',
    );
  }

  if (organizationId.value) {
    const dual = getIdentityRegistry().dualResolve({
      clientCode: envelope.clientCode,
      system: 'gcc',
      localId: organizationId.value,
    });
    if (!dual.ok || dual.result.clientCode !== envelope.clientCode) {
      return fail(
        403,
        'GCC_ORG_CLIENTCODE_MISMATCH',
        'ClientCode and GCC organizationId disagree or are unmapped.',
      );
    }
  }

  return {
    ok: true,
    organizationId: organizationId.value,
    signalType: signalTypeRaw as GccSignalType,
    summary: projectObservationSummary({
      summary: summary.value,
      finding: finding.value,
      evidence: evidence.value,
      financialImpact,
    }),
  };
}
