/**
 * Gate 7B-1 — executive evidence / provenance semantics.
 *
 * Canonical vocabulary (from CEO Sprint 2, already in the design system):
 *   Repository-derived | Development sample | Unavailable | Live
 *
 * These are metadata about what a displayed value is based on.
 * They do not confer SharePoint / Plaid / QBO source-of-truth authority.
 *
 * Live is reserved for a proven live operational source. Adapter success,
 * Hub JSON, Dataverse rows, fixtures, and repository snapshots are not Live.
 */

export type SourceKind = 'Repository-derived' | 'Development sample' | 'Unavailable' | 'Live';

export const EVIDENCE_KINDS: readonly SourceKind[] = [
  'Repository-derived',
  'Development sample',
  'Unavailable',
  'Live',
] as const;

export interface EvidenceClassification {
  kind: SourceKind;
  /** Concise executive-facing label. */
  label: string;
  /** Internal provenance detail (not a source of truth). */
  detail: string;
}

export interface ClassifyEvidenceInput {
  authenticated: boolean;
  loadFailed: boolean;
  hasPayload: boolean;
  /** Only true when a live operational SoR is actually proven. */
  provenLive?: boolean;
}

const KIND_SET = new Set<string>(EVIDENCE_KINDS);

export function parseSourceKind(value: unknown): SourceKind {
  if (typeof value === 'string' && KIND_SET.has(value)) {
    return value as SourceKind;
  }
  return 'Unavailable';
}

export function executiveLabelForKind(kind: SourceKind): string {
  switch (kind) {
    case 'Live':
      return 'Live';
    case 'Unavailable':
      return 'Unavailable';
    case 'Development sample':
      return 'Sample data';
    case 'Repository-derived':
      return 'Not live';
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

/**
 * Deterministic classification for executive surfaces.
 * Unknown / unproven input fails closed to Unavailable.
 * provenLive is ignored unless a payload was actually loaded without error.
 */
export function classifyExecutiveEvidence(input: ClassifyEvidenceInput): EvidenceClassification {
  if (!input.authenticated || input.loadFailed || !input.hasPayload) {
    return {
      kind: 'Unavailable',
      label: executiveLabelForKind('Unavailable'),
      detail: !input.authenticated
        ? 'Sign-in required — Command Center not loaded'
        : input.loadFailed
          ? 'Load failed — values are not available'
          : 'No operating snapshot loaded',
    };
  }

  if (input.provenLive === true) {
    return {
      kind: 'Live',
      label: executiveLabelForKind('Live'),
      detail: 'Proven live operational source',
    };
  }

  return {
    kind: 'Repository-derived',
    label: executiveLabelForKind('Repository-derived'),
    detail: 'Hub local operating snapshot — not SharePoint system of record',
  };
}

/**
 * Map Microsoft adapter / Dataverse source tags onto the executive vocabulary.
 * Dataverse and adapter "Live" are not proven SharePoint/Plaid SoR.
 */
export function sourceKindFromAdapter(kind: unknown): SourceKind {
  if (kind === 'Dataverse') {
    return 'Repository-derived';
  }
  const parsed = parseSourceKind(kind);
  if (parsed === 'Live') {
    return 'Repository-derived';
  }
  return parsed;
}
