/**
 * Deterministic lender-id reconciliation.
 * Never guess. Preserve the original historical lookup id.
 */

import { normalizeLenderName } from './matching.ts';
import type { LenderIdMapping, LenderIdReconcileState, LenderOrganization, LenderSubmission } from './types.ts';

export interface LenderReconcileInput {
  originalLookupId: string;
  originalLenderName?: string;
  domain?: string;
  catalog: Array<Pick<LenderOrganization, 'id' | 'name'>>;
}

function uniqueNameHits(
  catalog: Array<Pick<LenderOrganization, 'id' | 'name'>>,
  name: string | undefined,
): Array<Pick<LenderOrganization, 'id' | 'name'>> {
  const n = normalizeLenderName(name);
  if (!n) return [];
  return catalog.filter((l) => normalizeLenderName(l.name) === n);
}

export function reconcileLenderId(input: LenderReconcileInput): LenderIdMapping {
  const evidence: string[] = [`originalLookupId=${input.originalLookupId}`];
  if (input.originalLenderName) evidence.push(`originalName=${input.originalLenderName}`);
  if (input.domain) evidence.push(`domain=${input.domain}`);

  const exactId = input.catalog.find((l) => l.id === input.originalLookupId);
  if (exactId) {
    return {
      originalLookupId: input.originalLookupId,
      originalLenderName: input.originalLenderName,
      catalogLenderId: exactId.id,
      catalogLenderName: exactId.name,
      state: 'RESOLVED',
      evidence: [...evidence, 'exact catalog id match'],
      autoResolved: true,
    };
  }

  const nameHits = uniqueNameHits(input.catalog, input.originalLenderName);
  if (nameHits.length === 1) {
    return {
      originalLookupId: input.originalLookupId,
      originalLenderName: input.originalLenderName,
      catalogLenderId: nameHits[0].id,
      catalogLenderName: nameHits[0].name,
      state: 'LIKELY_MATCH_NEEDS_REVIEW',
      evidence: [...evidence, 'unique normalized name match — review required, not auto-applied'],
      autoResolved: false,
    };
  }
  if (nameHits.length > 1) {
    return {
      originalLookupId: input.originalLookupId,
      originalLenderName: input.originalLenderName,
      state: 'CONFLICT',
      evidence: [...evidence, `normalized name matched ${nameHits.length} catalog lenders`],
      autoResolved: false,
    };
  }

  return {
    originalLookupId: input.originalLookupId,
    originalLenderName: input.originalLenderName,
    state: 'UNRESOLVED',
    evidence: [...evidence, 'no exact catalog id; no unique name match — do not guess'],
    autoResolved: false,
  };
}

export function reconcileOutreachRows(opts: {
  outreach: LenderSubmission[];
  catalog: Array<Pick<LenderOrganization, 'id' | 'name'>>;
}): {
  mappings: LenderIdMapping[];
  resolved: number;
  likely: number;
  unresolved: number;
  conflicts: number;
} {
  const seen = new Map<string, LenderIdMapping>();
  for (const row of opts.outreach) {
    const key = `${row.lenderId}|${normalizeLenderName(row.lenderName)}`;
    if (seen.has(key)) continue;
    const mapped = reconcileLenderId({
      originalLookupId: row.lenderId,
      originalLenderName: row.lenderName,
      catalog: opts.catalog,
    });
    seen.set(key, mapped);
  }
  const mappings = [...seen.values()];
  const count = (state: LenderIdReconcileState) => mappings.filter((m) => m.state === state).length;
  return {
    mappings,
    resolved: count('RESOLVED'),
    likely: count('LIKELY_MATCH_NEEDS_REVIEW'),
    unresolved: count('UNRESOLVED'),
    conflicts: count('CONFLICT'),
  };
}
