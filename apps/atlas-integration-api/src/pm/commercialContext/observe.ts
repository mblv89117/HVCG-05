import { isCanonicalClientCode } from '../../entitlements/clientCode.ts';
import { entitledClientCodes, isInternalStaff } from '../sharepoint/authz.ts';
import type { AtlasPrincipal } from '../../middleware/auth.ts';
import {
  GCC_SEVERITIES,
  GCC_SIGNAL_TYPES,
  PRECALL_OWNERS,
  type AttributionLineage,
  type CommercialOverlay,
  type CopilotAssessment,
  type GccValueSignal,
  type PersistedAttribution,
  type PreCallBrief,
} from './types.ts';

export class ObserveError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ObserveError';
  }
}

function asString(raw: unknown, max = 2000): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

function asIso(raw: unknown): string | undefined {
  const v = asString(raw, 64);
  if (!v) return undefined;
  const t = Date.parse(v);
  return Number.isFinite(t) ? new Date(t).toISOString() : undefined;
}

function requireClient(code: string | undefined, principal: AtlasPrincipal): string {
  if (!code || !isCanonicalClientCode(code) || code === '*') {
    throw new ObserveError(400, 'invalid_client_code', 'Canonical ClientCode is required.');
  }
  if (!entitledClientCodes(principal).includes(code)) {
    throw new ObserveError(404, 'not_found', 'not_found');
  }
  return code;
}

function rejectLiveFlags(record: Record<string, unknown>): void {
  if (record.liveDispatch === true) {
    throw new ObserveError(400, 'live_dispatch_forbidden', 'liveDispatch must be false. Live GTM outbound is OFF.');
  }
  if (record.copiesLedger === true) {
    throw new ObserveError(400, 'ledger_copy_forbidden', 'copiesLedger must be false. Atlas does not copy GCC ledgers.');
  }
  if (record.observationOnly === false) {
    throw new ObserveError(400, 'observation_required', 'observationOnly must be true.');
  }
  if (record.createsOpportunity === true || record.createsClient === true || record.createsLead === true) {
    throw new ObserveError(400, 'crm_write_forbidden', 'Observation ingest does not create CRM records.');
  }
}

function clipAttribution(raw: unknown, clientCode?: string): AttributionLineage | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const src = raw as Record<string, unknown>;
  const utmRaw = src.utm && typeof src.utm === 'object' && !Array.isArray(src.utm) ? (src.utm as Record<string, unknown>) : undefined;
  const lineage: AttributionLineage = {
    source: asString(src.source, 255),
    campaignId: asString(src.campaignId, 255),
    contentId: asString(src.contentId, 255),
    messageId: asString(src.messageId, 255),
    funnelId: asString(src.funnelId, 255),
    formId: asString(src.formId, 255),
    diagnosticId: asString(src.diagnosticId, 255),
    meetingId: asString(src.meetingId, 255),
    clientCode: asString(src.clientCode, 16) || clientCode,
    engagementId: asString(src.engagementId, 255),
    ltvSignalId: asString(src.ltvSignalId, 255),
    utm: utmRaw
      ? {
          source: asString(utmRaw.source, 255),
          medium: asString(utmRaw.medium, 255),
          campaign: asString(utmRaw.campaign, 255),
          content: asString(utmRaw.content, 255),
          term: asString(utmRaw.term, 255),
        }
      : undefined,
  };
  const has = Object.values(lineage).some((v) => v !== undefined && v !== '');
  return has ? lineage : undefined;
}

function clipMetrics(raw: unknown): Record<string, number | string | boolean | null> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const out: Record<string, number | string | boolean | null> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'number' && Number.isFinite(value)) out[key.slice(0, 64)] = value;
    else if (typeof value === 'string') out[key.slice(0, 64)] = value.slice(0, 255);
    else if (typeof value === 'boolean' || value === null) out[key.slice(0, 64)] = value;
  }
  return Object.keys(out).length ? out : undefined;
}

function strings(raw: unknown, maxItems = 20, maxLen = 500): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out = raw
    .filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
    .slice(0, maxItems)
    .map((item) => item.trim().slice(0, maxLen));
  return out.length ? out : undefined;
}

export function persistObservation(
  principal: AtlasPrincipal,
  overlay: CommercialOverlay,
  body: Record<string, unknown>,
): { overlay: CommercialOverlay; replay: boolean; kind: string; record: unknown } {
  if (!isInternalStaff(principal)) {
    throw new ObserveError(403, 'forbidden', 'Observation ingest is restricted to HVCG internal staff.');
  }
  const kind = asString(body.kind, 64) || asString((body.record as Record<string, unknown> | undefined)?.contractVersion, 64);
  const record = (body.record && typeof body.record === 'object' && !Array.isArray(body.record)
    ? (body.record as Record<string, unknown>)
    : body) as Record<string, unknown>;
  rejectLiveFlags(record);

  if (kind === 'gcc-value-signal.v1') {
    const signalType = asString(record.signalType, 64);
    if (!signalType || !GCC_SIGNAL_TYPES.includes(signalType as GccValueSignal['signalType'])) {
      throw new ObserveError(400, 'invalid_signal_type', 'signalType must be a gcc-value-signal.v1 enum value.');
    }
    const clientCode = requireClient(asString(record.clientCode, 16), principal);
    const signalId = asString(record.signalId, 255);
    const emittedAt = asIso(record.emittedAt) || new Date().toISOString();
    const idempotencyKey = asString(record.idempotencyKey, 255) || asString((record.envelope as Record<string, unknown> | undefined)?.idempotencyKey, 255) || `gcc|${signalId || emittedAt}|${clientCode}`;
    const existing = overlay.gccSignals.find((s) => s.idempotencyKey === idempotencyKey);
    if (existing) return { overlay, replay: true, kind, record: existing };
    const severity = asString(record.severity, 16);
    const next: GccValueSignal = {
      contractVersion: 'gcc-value-signal.v1',
      signalId: signalId || idempotencyKey,
      clientCode,
      signalType: signalType as GccValueSignal['signalType'],
      severity: severity && GCC_SEVERITIES.includes(severity as GccValueSignal['severity']) ? (severity as GccValueSignal['severity']) : undefined,
      summary: asString(record.summary, 2000),
      metrics: clipMetrics(record.metrics),
      emittedAt,
      copiesLedger: false,
      idempotencyKey,
    };
    return { overlay: { ...overlay, gccSignals: [...overlay.gccSignals, next] }, replay: false, kind, record: next };
  }

  if (kind === 'pre-call-brief.v1') {
    const owner = asString(record.ownerSystem, 16);
    if (!owner || !PRECALL_OWNERS.includes(owner as PreCallBrief['ownerSystem'])) {
      throw new ObserveError(400, 'invalid_owner_system', 'ownerSystem must be 360, copilot, or atlas.');
    }
    const clientCode = requireClient(asString(record.atlasClientCode, 16), principal);
    const briefId = asString(record.briefId, 255);
    const bookingId = asString(record.bookingId, 255);
    if (!briefId || !bookingId) {
      throw new ObserveError(400, 'invalid_pre_call', 'briefId and bookingId are required.');
    }
    const idempotencyKey = asString(record.idempotencyKey, 255) || `precall|${briefId}`;
    const existing = overlay.preCallBriefs.find((b) => b.idempotencyKey === idempotencyKey);
    if (existing) return { overlay, replay: true, kind, record: existing };
    const next: PreCallBrief = {
      contractVersion: 'pre-call-brief.v1',
      briefId,
      bookingId,
      companyName: asString(record.companyName, 255),
      atlasClientCode: clientCode,
      summary: asString(record.summary, 5000),
      painHypotheses: strings(record.painHypotheses),
      suggestedQuestions: strings(record.suggestedQuestions),
      generatedAt: asIso(record.generatedAt) || new Date().toISOString(),
      ownerSystem: owner as PreCallBrief['ownerSystem'],
      observationOnly: true,
      attribution: clipAttribution(record.attribution, clientCode),
      idempotencyKey,
    };
    return { overlay: { ...overlay, preCallBriefs: [...overlay.preCallBriefs, next] }, replay: false, kind, record: next };
  }

  if (kind === 'atlas-lead-handoff.v1') {
    const clientCode = requireClient(asString(record.clientCode, 16) || asString(record.atlasClientCode, 16), principal);
    const assessmentId = asString(record.assessmentId, 255);
    if (!assessmentId) throw new ObserveError(400, 'invalid_assessment', 'assessmentId is required.');
    const idempotencyKey = asString(record.idempotencyKey, 255) || `copilot|${assessmentId}`;
    const existing = overlay.copilotAssessments.find((a) => a.idempotencyKey === idempotencyKey);
    if (existing) return { overlay, replay: true, kind, record: existing };
    const assessment = record.assessment && typeof record.assessment === 'object' ? (record.assessment as Record<string, unknown>) : undefined;
    const next: CopilotAssessment = {
      contractVersion: 'atlas-lead-handoff.v1',
      assessmentId,
      organizationName: asString(record.organizationName, 255),
      clientCode,
      summary: asString(record.summary, 2000) || asString(assessment?.summary, 2000),
      observationOnly: true,
      source: 'agent-copilot',
      idempotencyKey,
      recordedAt: new Date().toISOString(),
    };
    return { overlay: { ...overlay, copilotAssessments: [...overlay.copilotAssessments, next] }, replay: false, kind, record: next };
  }

  if (kind === 'attribution-lineage.v1') {
    const lineage = clipAttribution(record.lineage || record, asString(record.clientCode, 16));
    const clientCode = requireClient(lineage?.clientCode || asString(record.clientCode, 16), principal);
    if (!lineage) throw new ObserveError(400, 'empty_attribution', 'Attribution lineage must preserve at least one supplied field.');
    const idempotencyKey = asString(record.idempotencyKey, 255) || `attr|${clientCode}|${lineage.campaignId || lineage.source || 'recorded'}`;
    const existing = overlay.attributions.find((a) => a.idempotencyKey === idempotencyKey);
    if (existing) return { overlay, replay: true, kind, record: existing };
    const next: PersistedAttribution = {
      contractVersion: 'attribution-lineage.v1',
      clientCode,
      lineage: { ...lineage, clientCode },
      idempotencyKey,
      recordedAt: new Date().toISOString(),
    };
    return { overlay: { ...overlay, attributions: [...overlay.attributions, next] }, replay: false, kind, record: next };
  }

  throw new ObserveError(
    400,
    'unsupported_kind',
    'kind must be gcc-value-signal.v1, pre-call-brief.v1, atlas-lead-handoff.v1, or attribution-lineage.v1.',
  );
}
