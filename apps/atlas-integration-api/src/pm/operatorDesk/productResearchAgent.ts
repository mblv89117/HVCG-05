/**
 * Native product research agent from already-entitled Hub health only.
 *
 * Evaluates Atlas / GCC / Copilot / 360 / telemetry / GitHub / open-source
 * surfaces. Creates engineering-mission evidence only when Hub health already
 * recorded a gap. Does not invent metrics, scrape, or execute repairs.
 */

import {
  ASK_ATLAS_PRODUCT_RESEARCH_AGENT_MISSION_KEY,
  ATLAS_CLIENT_HINTS_STATUSES,
  PRODUCT_RESEARCH_AGENT_EXECUTE,
  PRODUCT_RESEARCH_INVENT_METRICS,
  PRODUCT_RESEARCH_SURFACES,
  type AskAtlasClassification,
  type AtlasClientHintsExtra,
  type AtlasClientHintsStatus,
  type ProductResearchAgentPayload,
  type ProductResearchSurface,
  type ProductResearchSurfaceRecord,
} from './types.ts';

export { ASK_ATLAS_PRODUCT_RESEARCH_AGENT_MISSION_KEY };

const NO_ENTITLED_EVIDENCE =
  'No entitled Hub evidence for this product surface. Metrics were not invented.';

const GAP_NOTE =
  /\b(?:skipped|failed|unavailable|rejected|deprecated|not indexed|not claimed|not continuous|unreadable|unproven|did not complete|stopped at HTTP|delegated-only|absent)\b/i;

const SUCCESS_NOTE = /\b(?:reached HTTP 200|mail delta reached)\b/i;

const INVENTED_METRICS =
  /\b(?:ltv\s*[:=]?\s*\d|dscr\s*[:=]?\s*\d|nps\s*[:=]?\s*\d|mrr\s*[:=]?\s*\d|conversion rate|best[_ ]?fit|credit box)\b/i;

export type ProductResearchClientHintsStatus = AtlasClientHintsStatus;
/** Count-only fabric hint honesty. Never includes ClientCodes or identifiers. */
export type ProductResearchClientHints = AtlasClientHintsExtra;

export interface ProductResearchInspectHealth {
  authRequired: boolean;
  insecureDevAuth: boolean;
  providers?: {
    microsoft?: boolean;
    google?: boolean;
    github?: boolean;
  };
  fabricNotes?: string[];
  fabricHonesty?: 'never_run' | 'delta' | 'page_fallback' | 'degraded';
  /** fabric.clientHints — status, reason, and count only. */
  clientHints?: ProductResearchClientHints;
}

const CLIENT_HINT_STATUSES = new Set<ProductResearchClientHintsStatus>(ATLAS_CLIENT_HINTS_STATUSES);
const COMPLETED_CLIENT_HINT_STATUSES = new Set<ProductResearchClientHintsStatus>([
  'ready',
  'empty',
  'error',
]);

const HINT_IDENTIFIER =
  /PDG01|ACCG01|CCB01|HFD01|LIEN01|ClientCode|displayName|\bDBA\b|@highvalue|Bearer\s|token=/i;

/**
 * Copy entitled fabric.clientHints without identifiers or extra fields.
 * Rejects unknown statuses. Never invents a ClientCode list.
 */
export function copyEntitledClientHints(
  raw: { status?: unknown; reason?: unknown; count?: unknown } | null | undefined,
): ProductResearchClientHints | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  if (typeof raw.status !== 'string' || !CLIENT_HINT_STATUSES.has(raw.status as ProductResearchClientHintsStatus)) {
    return undefined;
  }
  const count =
    typeof raw.count === 'number' && Number.isFinite(raw.count) ? Math.max(0, Math.floor(raw.count)) : 0;
  const reason = typeof raw.reason === 'string' ? raw.reason.trim() : '';
  return {
    status: raw.status as ProductResearchClientHintsStatus,
    reason: HINT_IDENTIFIER.test(reason) ? '' : reason,
    count,
  };
}

/**
 * Ask Atlas extras: copy completed fabric.clientHints only.
 * ready / empty / error attach. skipped / never_run / unknown omit (fail-closed).
 * Does not call listClientHints. Does not invent ClientCodes.
 */
export function completedEntitledClientHints(
  raw: { status?: unknown; reason?: unknown; count?: unknown } | null | undefined,
): ProductResearchClientHints | undefined {
  const copied = copyEntitledClientHints(raw);
  if (!copied || !COMPLETED_CLIENT_HINT_STATUSES.has(copied.status)) return undefined;
  return copied;
}

function clientHintsBasedOn(hints: ProductResearchClientHints): string {
  return `Entitled Hub fabric clientHints status=${hints.status} count=${hints.count}`;
}

export interface ProductResearchEvidence {
  surface: Extract<ProductResearchSurface, 'atlas' | 'github'>;
  classification: AskAtlasClassification;
  why: string;
  basedOn: string;
}

function neverPromote(value: AskAtlasClassification | string | undefined): AskAtlasClassification {
  if (value === 'CONFIRMED' || value === 'LIKELY' || value === 'PROPOSED') return value;
  return 'PROPOSED';
}

function emptySurfaces(): ProductResearchSurfaceRecord[] {
  return PRODUCT_RESEARCH_SURFACES.map((surface) => ({
    surface,
    status: 'honest_empty',
    invented: false,
    inventMetrics: PRODUCT_RESEARCH_INVENT_METRICS,
    basedOn: NO_ENTITLED_EVIDENCE,
  }));
}

function markSurface(
  surfaces: ProductResearchSurfaceRecord[],
  surface: ProductResearchSurface,
  basedOn: string,
): void {
  const row = surfaces.find((item) => item.surface === surface);
  if (!row) return;
  row.status = 'evaluated';
  row.basedOn = basedOn;
}

export function detectRecordedProductGaps(
  health?: ProductResearchInspectHealth,
): ProductResearchEvidence[] {
  if (!health) return [];
  const out: ProductResearchEvidence[] = [];
  if (health.providers && health.providers.github === false) {
    out.push({
      surface: 'github',
      classification: neverPromote('CONFIRMED'),
      why: 'Entitled Hub health already records the GitHub provider as off. This proposed mission does not invent telemetry, connect GitHub, or deploy.',
      basedOn: 'Entitled Hub health recorded providers.github=false',
    });
  }
  for (const note of health.fabricNotes || []) {
    const copied = note.trim();
    if (!copied) continue;
    if (SUCCESS_NOTE.test(copied) && !GAP_NOTE.test(copied)) continue;
    if (!GAP_NOTE.test(copied)) continue;
    out.push({
      surface: 'atlas',
      classification: neverPromote('CONFIRMED'),
      why: 'Entitled Hub fabric health already recorded this product-surface gap. This proposed mission does not invent metrics or execute a repair.',
      basedOn: `Entitled Hub fabric note: ${copied}`,
    });
  }
  if (
    health.fabricHonesty &&
    health.fabricHonesty !== 'delta' &&
    !out.some((row) => row.basedOn.includes(`honesty=${health.fabricHonesty}`))
  ) {
    out.push({
      surface: 'atlas',
      classification: neverPromote('CONFIRMED'),
      why: 'Entitled Hub fabric honesty is already recorded as not delta. This proposed mission does not invent a sync count or execute a repair.',
      basedOn: `Entitled Hub fabric honesty=${health.fabricHonesty}`,
    });
  }
  const hints = copyEntitledClientHints(health.clientHints);
  if (hints && (hints.status === 'skipped' || hints.status === 'error')) {
    const basedOn = clientHintsBasedOn(hints);
    if (!out.some((row) => row.basedOn === basedOn)) {
      out.push({
        surface: 'atlas',
        classification: neverPromote('CONFIRMED'),
        why: 'Entitled Hub fabric clientHints already recorded a skipped or error population. This proposed mission does not invent a repair count or execute a repair.',
        basedOn,
      });
    }
  }
  return out;
}

function applyClientHintsSurface(
  surfaces: ProductResearchSurfaceRecord[],
  health?: ProductResearchInspectHealth,
): void {
  const hints = copyEntitledClientHints(health?.clientHints);
  if (!hints) return;
  const row = surfaces.find((item) => item.surface === 'atlas');
  if (!row) return;
  const basedOn = clientHintsBasedOn(hints);
  if (hints.status === 'ready' && hints.count > 0) {
    if (row.status === 'honest_empty') {
      markSurface(surfaces, 'atlas', basedOn);
    }
    return;
  }
  if (hints.status === 'empty' && hints.count === 0) {
    if (row.status === 'honest_empty') {
      row.basedOn = basedOn;
    }
    return;
  }
  if ((hints.status === 'skipped' || hints.status === 'error') && row.status === 'honest_empty') {
    markSurface(surfaces, 'atlas', basedOn);
  }
}

export function composeProductResearch(opts: {
  health?: ProductResearchInspectHealth;
  evidence?: ProductResearchEvidence[];
}): ProductResearchAgentPayload {
  const surfaces = emptySurfaces();
  const evidence = opts.evidence || detectRecordedProductGaps(opts.health);
  for (const row of evidence) {
    markSurface(surfaces, row.surface, row.basedOn);
  }
  applyClientHintsSurface(surfaces, opts.health);
  return {
    kind: 'product_research_agent_v1',
    missionKey: ASK_ATLAS_PRODUCT_RESEARCH_AGENT_MISSION_KEY,
    invented: false,
    inventMetrics: PRODUCT_RESEARCH_INVENT_METRICS,
    execute: PRODUCT_RESEARCH_AGENT_EXECUTE,
    surfaces,
  };
}

export function emptyProductResearchPayload(): ProductResearchAgentPayload {
  return composeProductResearch({});
}

export function productResearchHasInventedFacts(payload: ProductResearchAgentPayload): boolean {
  if (payload.invented || payload.inventMetrics || payload.execute) return true;
  if (payload.kind !== 'product_research_agent_v1') return true;
  if (payload.missionKey !== ASK_ATLAS_PRODUCT_RESEARCH_AGENT_MISSION_KEY) return true;
  for (const row of payload.surfaces) {
    if (row.invented || row.inventMetrics) return true;
    if (INVENTED_METRICS.test(row.basedOn)) return true;
  }
  return false;
}
