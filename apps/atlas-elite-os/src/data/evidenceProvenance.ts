/**
 * Gate 7B-1 / 7B-1R — executive evidence provenance.
 *
 * Origin (where a value came from) is distinct from status (what Atlas
 * can truthfully claim). Do not mutate origin to obtain a UI confidence label.
 *
 * Historical SourceKind (Repository-derived | Development sample | Unavailable | Live)
 * remains valid only when it is the actual origin or a true Live proof.
 */

export type SourceKind = 'Repository-derived' | 'Development sample' | 'Unavailable' | 'Live';

export type EvidenceOrigin =
  | 'repository'
  | 'development-sample'
  | 'dataverse'
  | 'hub-snapshot'
  | 'unknown';

export type EvidenceStatus = 'Live' | 'Not live' | 'Sample data' | 'Unavailable';

export const EVIDENCE_KINDS: readonly SourceKind[] = [
  'Repository-derived',
  'Development sample',
  'Unavailable',
  'Live',
] as const;

export interface EvidenceClassification {
  origin: EvidenceOrigin;
  status: EvidenceStatus;
  /** Concise executive-facing status label. */
  label: string;
  /** Internal origin/provenance detail (not a source of truth). */
  detail: string;
}

export interface ClassifyEvidenceInput {
  authenticated: boolean;
  loadFailed: boolean;
  hasPayload: boolean;
  /** Only true when a live operational SoR is actually proven. */
  provenLive?: boolean;
  origin?: EvidenceOrigin;
}

const KIND_SET = new Set<string>(EVIDENCE_KINDS);

export function parseSourceKind(value: unknown): SourceKind {
  if (typeof value === 'string' && KIND_SET.has(value)) {
    return value as SourceKind;
  }
  return 'Unavailable';
}

export function originDetail(origin: EvidenceOrigin): string {
  switch (origin) {
    case 'repository':
      return 'Repository artifact — not a live operational source';
    case 'development-sample':
      return 'Intentional development fixture';
    case 'dataverse':
      return 'Dataverse adapter — not SharePoint system of record';
    case 'hub-snapshot':
      return 'Hub local operating snapshot — not SharePoint system of record';
    case 'unknown':
      return 'Unknown origin';
    default: {
      const _exhaustive: never = origin;
      return _exhaustive;
    }
  }
}

export function statusLabel(status: EvidenceStatus): string {
  return status;
}

/** Historical origin kinds keep their own names. Status is not inferred from origin. */
export function executiveLabelForKind(kind: SourceKind): string {
  switch (kind) {
    case 'Live':
      return 'Live';
    case 'Unavailable':
      return 'Unavailable';
    case 'Development sample':
      return 'Sample data';
    case 'Repository-derived':
      return 'Repository-derived';
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function unavailable(detail: string): EvidenceClassification {
  return {
    origin: 'unknown',
    status: 'Unavailable',
    label: 'Unavailable',
    detail,
  };
}

/**
 * Deterministic classification for executive surfaces.
 * Unknown / unproven input fails closed to Unavailable.
 * provenLive is ignored unless a payload was actually loaded without error.
 */
export function classifyExecutiveEvidence(input: ClassifyEvidenceInput): EvidenceClassification {
  if (!input.authenticated || input.loadFailed || !input.hasPayload) {
    return unavailable(
      !input.authenticated
        ? 'Sign-in required — Command Center not loaded'
        : input.loadFailed
          ? 'Load failed — values are not available'
          : 'No operating snapshot loaded',
    );
  }

  const origin = input.origin ?? 'unknown';

  if (input.provenLive === true) {
    return {
      origin,
      status: 'Live',
      label: 'Live',
      detail: 'Proven live operational source',
    };
  }

  if (origin === 'development-sample') {
    return {
      origin,
      status: 'Sample data',
      label: 'Sample data',
      detail: originDetail(origin),
    };
  }

  return {
    origin,
    status: 'Not live',
    label: 'Not live',
    detail: originDetail(origin),
  };
}

/**
 * Preserve adapter/source identity. Adapter string "Live" is not executive Live.
 * Dataverse is never rewritten as Repository-derived.
 */
export function classifyAdapterSource(kind: unknown, provenLive = false): EvidenceClassification {
  if (kind === 'Dataverse') {
    return classifyExecutiveEvidence({
      authenticated: true,
      loadFailed: false,
      hasPayload: true,
      provenLive,
      origin: 'dataverse',
    });
  }
  if (kind === 'Live') {
    return classifyExecutiveEvidence({
      authenticated: true,
      loadFailed: false,
      hasPayload: true,
      provenLive,
      origin: 'unknown',
    });
  }
  if (kind === 'Repository-derived') {
    return classifyExecutiveEvidence({
      authenticated: true,
      loadFailed: false,
      hasPayload: true,
      provenLive: false,
      origin: 'repository',
    });
  }
  if (kind === 'Development sample') {
    return classifyExecutiveEvidence({
      authenticated: true,
      loadFailed: false,
      hasPayload: true,
      provenLive: false,
      origin: 'development-sample',
    });
  }
  if (kind === 'Unavailable') {
    return unavailable('No usable operational value');
  }
  return unavailable('Unknown provenance');
}

/** @deprecated Use classifyAdapterSource. Kept so call sites fail closed if missed. */
export function sourceKindFromAdapter(kind: unknown): SourceKind {
  const classified = classifyAdapterSource(kind);
  if (classified.origin === 'repository') return 'Repository-derived';
  if (classified.origin === 'development-sample') return 'Development sample';
  if (classified.status === 'Live') return 'Live';
  if (classified.status === 'Unavailable') return 'Unavailable';
  return 'Unavailable';
}
