/**
 * Phase 4C-2 pack-level draft analysis for manually selected documents.
 */

import type { PackAnalysisDraft, PackMemberMeta, StagedDocumentRecord } from '@hvcg/atlas-integration-core';

export function analyzeMultiDocumentPack(opts: {
  packId: string;
  members: PackMemberMeta[];
  reviews: StagedDocumentRecord[];
  expectedChecklist?: string[];
}): PackAnalysisDraft {
  const byId = new Map(opts.reviews.map((r) => [r.stagedFileId, r]));
  const inventory = opts.members.map((m) => {
    const r = byId.get(m.stagedFileId) || byId.get(m.reviewId);
    return {
      reviewId: m.reviewId,
      filename: r?.originalFilename || m.stagedFileId,
      documentType: r?.reviewPackage?.classification?.proposedType || null,
      designation: m.designation,
      relationshipType: m.relationshipType,
    };
  });

  const chronology = opts.members.map((m) => {
    const r = byId.get(m.stagedFileId);
    const dates = r?.reviewPackage?.dates || [];
    return {
      reviewId: m.reviewId,
      dateHint: dates[0] || null,
      note: m.versionLabel || m.amendmentLabel || m.relationshipType,
    };
  });
  chronology.sort((a, b) => String(a.dateHint || '').localeCompare(String(b.dateHint || '')));

  const primary =
    opts.members.find((m) => m.designation === 'primary') ||
    opts.members.find((m) => m.relationshipType === 'primary document') ||
    opts.members[0];

  const amounts = new Map<string, string[]>();
  const dateSets = new Map<string, string[]>();
  for (const m of opts.members) {
    const r = byId.get(m.stagedFileId);
    for (const a of r?.reviewPackage?.amounts || []) {
      const list = amounts.get(a) || [];
      list.push(m.reviewId);
      amounts.set(a, list);
    }
    for (const d of r?.reviewPackage?.dates || []) {
      const list = dateSets.get(d) || [];
      list.push(m.reviewId);
      dateSets.set(d, list);
    }
  }

  const amountConflicts: string[] = [];
  const allAmounts = [...amounts.keys()];
  if (allAmounts.length > 1 && opts.members.length > 1) {
    amountConflicts.push(`Multiple distinct amounts across pack: ${allAmounts.slice(0, 5).join(', ')}`);
  }

  const dateConflicts: string[] = [];
  // Heuristic: same review types with differing first dates
  const firstDates = chronology.map((c) => c.dateHint).filter(Boolean);
  if (new Set(firstDates).size > 1) {
    dateConflicts.push('Document date hints differ across pack members');
  }

  const checksums = new Map<string, string[]>();
  for (const m of opts.members) {
    const r = byId.get(m.stagedFileId);
    if (!r) continue;
    const list = checksums.get(r.checksumSha256) || [];
    list.push(m.reviewId);
    checksums.set(r.checksumSha256, list);
  }
  const duplicateWarnings = [...checksums.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([c, ids]) => `Exact duplicate checksum ${c.slice(0, 12)}… → ${ids.join(',')}`);

  const presentTypes = new Set(
    inventory.map((i) => i.documentType).filter(Boolean) as string[],
  );
  const expected = opts.expectedChecklist || [];
  const missingDocuments = expected.filter((e) => {
    const key = e.toLowerCase();
    return ![...presentTypes].some((t) => t.toLowerCase().includes(key) || key.includes(t));
  });

  const missingSignatures: string[] = [];
  const missingExhibits: string[] = [];
  for (const m of opts.members) {
    const r = byId.get(m.stagedFileId);
    const enr = r?.reviewPackage?.enrichment as
      | {
          signatures?: { missing?: string[] };
          missing_exhibits?: string[];
        }
      | null
      | undefined;
    for (const s of enr?.signatures?.missing || []) {
      missingSignatures.push(`${m.reviewId}: ${s}`);
    }
    for (const e of enr?.missing_exhibits || []) {
      missingExhibits.push(`${m.reviewId}: ${e}`);
    }
  }

  const amendments = opts.members
    .filter((m) => m.relationshipType === 'amendment' || m.amendmentLabel)
    .map((m) => `${m.reviewId}: ${m.amendmentLabel || 'amendment'}`);

  const conflictingTerms: string[] = [...amountConflicts, ...dateConflicts];
  const unresolvedQuestions = [
    ...missingDocuments.map((d) => `Missing expected document: ${d}`),
    ...missingExhibits.map((e) => `Missing exhibit: ${e}`),
    ...missingSignatures.map((s) => `Missing signature: ${s}`),
  ];

  const reviewMinutes = Math.min(45, 8 + opts.members.length * 4);
  const savedMinutes = Math.min(90, 15 + opts.members.length * 8);

  return {
    packId: opts.packId,
    analyzedAt: new Date().toISOString(),
    draftOnly: true,
    documentInventory: inventory,
    documentChronology: chronology,
    likelyGoverningDocument: primary?.reviewId || null,
    amendmentsAndModifications: amendments,
    conflictingTerms,
    supersededTerms: opts.members
      .filter((m) => m.relationshipType === 'prior version')
      .map((m) => `${m.reviewId} may be superseded`),
    missingDocuments,
    missingExhibits,
    missingSignatures,
    amountConflicts,
    dateConflicts,
    partyConflicts: [],
    obligationConflicts: [],
    deadlineConflicts: [],
    unresolvedQuestions,
    recommendedCurrentVersion:
      opts.members.find((m) => m.relationshipType === 'replacement version')?.reviewId ||
      primary?.reviewId ||
      null,
    recommendedNextAction: 'Manny review pack decision package (draft only)',
    workValueTier: 'Tier 2 — Judgment Required',
    mannyDecisionRequired: true,
    estimatedMannyReviewMinutes: reviewMinutes,
    estimatedMannyTimeSavedMinutes: savedMinutes,
    sourceReferences: opts.members.map((m) => ({
      reviewId: m.reviewId,
      page: 1,
      note: byId.get(m.stagedFileId)?.originalFilename || m.stagedFileId,
    })),
    duplicateWarnings,
    packRecommendation: duplicateWarnings.length
      ? 'Resolve duplicates before pack decision'
      : 'Review governing document and missing items, then decide',
  };
}
