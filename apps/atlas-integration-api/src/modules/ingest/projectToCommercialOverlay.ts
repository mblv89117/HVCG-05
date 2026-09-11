/**
 * Project durable module ingest envelopes into the operator commercial overlay
 * so Live Client / Command Center can show GCC / MRI / 360 observations without
 * requiring Manny to open module shells.
 *
 * Observation-only. Never invents ledger numbers. Never sets liveDispatch.
 * Fixtures (MRI01, SYN01) are recorded but must not become production entitlements.
 */
import {
  EVENT_360_CAMPAIGN_APPROVAL,
  EVENT_GCC_SYN01_OBSERVATION,
  EVENT_GCC_VALUE_SIGNAL,
  EVENT_MRI_FINDINGS,
  type AtlasIntegrationEnvelope,
} from '@hvcg/atlas-integration-contracts';
import type {
  CommercialOverlay,
  CopilotAssessment,
  GccValueSignal,
  PersistedAttribution,
} from '../../pm/commercialContext/types.ts';
import { loadOverlay, saveOverlay } from '../../pm/commercialContext/store.ts';

const FIXTURE_CODES = new Set(['MRI01', 'SYN01', 'T360A']);

function asString(raw: unknown, max = 2000): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

export type ProjectionResult = {
  projected: boolean;
  kind?: string;
  replay?: boolean;
  fixtureOnly?: boolean;
  overlay: CommercialOverlay;
};

/** Pure merge — used by ingest projection and durable hydrate-on-read. */
export function applyEnvelopeToOverlay(
  overlay: CommercialOverlay,
  envelope: AtlasIntegrationEnvelope,
): ProjectionResult {
  const fixtureOnly = FIXTURE_CODES.has(envelope.clientCode);

  if (envelope.eventType === EVENT_MRI_FINDINGS) {
    const idempotencyKey = envelope.idempotencyKey;
    const existing = overlay.copilotAssessments.find((a) => a.idempotencyKey === idempotencyKey);
    if (existing) {
      return { projected: true, kind: 'atlas-lead-handoff.v1', replay: true, fixtureOnly, overlay };
    }
    const summary =
      asString(envelope.payload.findingsSummary) ||
      asString(envelope.payload.summary) ||
      'MRI findings observed (human review required).';
    const next: CopilotAssessment = {
      contractVersion: 'atlas-lead-handoff.v1',
      assessmentId: asString(envelope.sourceRecordId, 255) || idempotencyKey,
      organizationName: asString(envelope.payload.organizationName, 255),
      clientCode: fixtureOnly ? undefined : envelope.clientCode,
      summary: fixtureOnly ? `[FIXTURE ${envelope.clientCode}] ${summary}` : summary,
      observationOnly: true,
      source: 'agent-copilot',
      idempotencyKey,
      recordedAt: new Date().toISOString(),
    };
    return {
      projected: true,
      kind: 'atlas-lead-handoff.v1',
      replay: false,
      fixtureOnly,
      overlay: { ...overlay, copilotAssessments: [...overlay.copilotAssessments, next] },
    };
  }

  if (envelope.eventType === EVENT_360_CAMPAIGN_APPROVAL) {
    const idempotencyKey = envelope.idempotencyKey;
    const existing = overlay.attributions.find((a) => a.idempotencyKey === idempotencyKey);
    if (existing) {
      return { projected: true, kind: 'attribution-lineage.v1', replay: true, fixtureOnly, overlay };
    }
    if (fixtureOnly) {
      return { projected: false, kind: 'attribution-lineage.v1', fixtureOnly, overlay };
    }
    const slug = asString(envelope.payload.organizationSlug, 255);
    const campaignId = asString(envelope.payload.campaignId, 255);
    const next: PersistedAttribution = {
      contractVersion: 'attribution-lineage.v1',
      clientCode: envelope.clientCode,
      lineage: {
        source: 'growth_360',
        campaignId,
        contentId: slug,
        clientCode: envelope.clientCode,
      },
      idempotencyKey,
      recordedAt: new Date().toISOString(),
    };
    return {
      projected: true,
      kind: 'attribution-lineage.v1',
      replay: false,
      fixtureOnly,
      overlay: { ...overlay, attributions: [...overlay.attributions, next] },
    };
  }

  if (
    envelope.eventType === EVENT_GCC_VALUE_SIGNAL ||
    envelope.eventType === EVENT_GCC_SYN01_OBSERVATION
  ) {
    const idempotencyKey = envelope.idempotencyKey;
    const existing = overlay.gccSignals.find((s) => s.idempotencyKey === idempotencyKey);
    if (existing) {
      return { projected: true, kind: 'gcc-value-signal.v1', replay: true, fixtureOnly, overlay };
    }
    if (fixtureOnly) {
      return { projected: false, kind: 'gcc-value-signal.v1', fixtureOnly, overlay };
    }
    const signalTypeRaw = asString(envelope.payload.signalType, 64) || 'engagement_health';
    const allowed = new Set([
      'renewal_risk',
      'expansion_opportunity',
      'value_realized',
      'engagement_health',
      'ltv_update',
      'capital_need',
      'constraint',
      'ai_opportunity',
      'process_bottleneck',
      'contract_opportunity',
    ]);
    const signalType = (allowed.has(signalTypeRaw)
      ? signalTypeRaw
      : 'engagement_health') as GccValueSignal['signalType'];
    const next: GccValueSignal = {
      contractVersion: 'gcc-value-signal.v1',
      signalId: asString(envelope.sourceRecordId, 255) || idempotencyKey,
      clientCode: envelope.clientCode,
      signalType,
      summary: asString(envelope.payload.summary, 2000) || asString(envelope.payload.notes, 2000),
      emittedAt: envelope.timestamp || new Date().toISOString(),
      copiesLedger: false,
      idempotencyKey,
    };
    return {
      projected: true,
      kind: 'gcc-value-signal.v1',
      replay: false,
      fixtureOnly,
      overlay: { ...overlay, gccSignals: [...overlay.gccSignals, next] },
    };
  }

  return { projected: false, overlay };
}

export function projectModuleEnvelopeToOverlay(
  dataDir: string,
  envelope: AtlasIntegrationEnvelope,
): { projected: boolean; kind?: string; replay?: boolean; fixtureOnly?: boolean } {
  const current = loadOverlay(dataDir);
  const result = applyEnvelopeToOverlay(current, envelope);
  if (result.projected && !result.replay) {
    saveOverlay(dataDir, result.overlay);
  }
  return {
    projected: result.projected,
    kind: result.kind,
    replay: result.replay,
    fixtureOnly: result.fixtureOnly,
  };
}
