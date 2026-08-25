/**
 * Attachment-to-file reconciliation and document version chains for business memory.
 * Never forces a match — only evidence-backed CONFIRMED / LIKELY / PROPOSED links.
 */

import type { IdentityConfidence } from './businessMemoryState.ts';

export type BusinessMemoryAttachmentLink = {
  attachmentId: string;
  attachmentTitle: string;
  fileId?: string;
  fileTitle?: string;
  relationship: IdentityConfidence;
  matchBasis: string[];
  parentMessageId?: string;
  clientCode: string;
};

export type BusinessMemoryDocumentVersionStep = {
  kind: 'email_attachment' | 'saved_document' | 'modified_document' | 'current_version';
  title: string;
  id?: string;
  modifiedAt?: string;
  confidence: IdentityConfidence;
  provenance: string;
};

export type BusinessMemoryDocumentVersionChain = {
  chainId: string;
  clientCode: string;
  projectHint?: string;
  steps: BusinessMemoryDocumentVersionStep[];
  confidence: IdentityConfidence;
};

type ReconcileHit = {
  kind?: string;
  id: string;
  title: string;
  modifiedAt?: string;
  parentMessageId?: string;
  attachmentId?: string;
  size?: number;
  webUrl?: string;
};

function normalizeFilename(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\.[a-z0-9]{1,8}$/i, '')
    .replace(/[^a-z0-9]+/g, ' ');
}

function filenameTokens(value: string): string[] {
  return normalizeFilename(value).split(/\s+/).filter((t) => t.length >= 3);
}

function tokenOverlap(a: string, b: string): number {
  const ta = new Set(filenameTokens(a));
  const tb = new Set(filenameTokens(b));
  if (!ta.size || !tb.size) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared += 1;
  return shared / Math.max(ta.size, tb.size);
}

function parseModifiedMs(value?: string): number | undefined {
  if (!value) return undefined;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : undefined;
}

function withinProximity(a?: string, b?: string, windowMs = 7 * 24 * 60 * 60 * 1000): boolean {
  const am = parseModifiedMs(a);
  const bm = parseModifiedMs(b);
  if (!am || !bm) return false;
  return Math.abs(am - bm) <= windowMs;
}

export function reconcileAttachmentsToFiles(
  hits: ReconcileHit[],
  clientCode: string,
): { links: BusinessMemoryAttachmentLink[]; reconciledCount: number } {
  const attachments = hits.filter((h) => h.kind === 'attachment');
  const files = hits.filter((h) => h.kind === 'document' || h.kind === 'file');
  const links: BusinessMemoryAttachmentLink[] = [];

  for (const att of attachments) {
    let best: { file: ReconcileHit; relationship: IdentityConfidence; basis: string[] } | null = null;

    for (const file of files) {
      const basis: string[] = [];
      let relationship: IdentityConfidence | null = null;

      if (att.attachmentId && file.id.includes(att.attachmentId)) {
        basis.push('attachment_id_in_file_id');
        relationship = 'CONFIRMED';
      }
      if (att.parentMessageId && file.id.includes(att.parentMessageId)) {
        basis.push('parent_message_context');
        relationship = relationship || 'LIKELY';
      }
      const overlap = tokenOverlap(att.title, file.title);
      if (overlap >= 0.85) {
        basis.push('normalized_filename');
        relationship = relationship || 'CONFIRMED';
      } else if (overlap >= 0.55) {
        basis.push('partial_filename');
        relationship = relationship || 'LIKELY';
      }
      if (
        att.size &&
        file.size &&
        att.size === file.size &&
        overlap >= 0.35
      ) {
        basis.push('size_match');
        relationship = relationship || 'LIKELY';
      }
      if (withinProximity(att.modifiedAt, file.modifiedAt)) {
        basis.push('timestamp_proximity');
        relationship = relationship || 'PROPOSED';
      }

      if (!relationship || !basis.length) continue;
      const rank =
        relationship === 'CONFIRMED' ? 3 : relationship === 'LIKELY' ? 2 : 1;
      const bestRank = best
        ? best.relationship === 'CONFIRMED'
          ? 3
          : best.relationship === 'LIKELY'
            ? 2
            : 1
        : 0;
      if (!best || rank > bestRank) {
        best = { file, relationship, basis };
      }
    }

    if (best) {
      links.push({
        attachmentId: att.attachmentId || att.id,
        attachmentTitle: att.title,
        fileId: best.file.id,
        fileTitle: best.file.title,
        relationship: best.relationship,
        matchBasis: best.basis,
        ...(att.parentMessageId ? { parentMessageId: att.parentMessageId } : {}),
        clientCode,
      });
    } else {
      links.push({
        attachmentId: att.attachmentId || att.id,
        attachmentTitle: att.title,
        relationship: 'STALE_OR_UNCERTAIN',
        matchBasis: ['no_matching_file_evidence'],
        ...(att.parentMessageId ? { parentMessageId: att.parentMessageId } : {}),
        clientCode,
      });
    }
  }

  const reconciledCount = links.filter(
    (row) => row.relationship === 'CONFIRMED' || row.relationship === 'LIKELY',
  ).length;
  return { links, reconciledCount };
}

export function buildDocumentVersionChains(
  hits: ReconcileHit[],
  attachmentLinks: BusinessMemoryAttachmentLink[],
  clientCode: string,
): BusinessMemoryDocumentVersionChain[] {
  const files = hits
    .filter((h) => h.kind === 'document' || h.kind === 'file')
    .sort((a, b) => (parseModifiedMs(a.modifiedAt) || 0) - (parseModifiedMs(b.modifiedAt) || 0));

  const chains: BusinessMemoryDocumentVersionChain[] = [];
  const grouped = new Map<string, ReconcileHit[]>();

  for (const file of files) {
    const key = normalizeFilename(file.title);
    if (!key) continue;
    const bucket = grouped.get(key) || [];
    bucket.push(file);
    grouped.set(key, bucket);
  }

  for (const [key, bucket] of grouped) {
    if (bucket.length < 2) continue;
    const steps: BusinessMemoryDocumentVersionStep[] = [];
    const link = attachmentLinks.find(
      (row) => row.fileId && bucket.some((f) => f.id === row.fileId),
    );
    if (link) {
      steps.push({
        kind: 'email_attachment',
        title: link.attachmentTitle,
        id: link.attachmentId,
        confidence: link.relationship,
        provenance: link.matchBasis.join(','),
      });
    }
    for (let i = 0; i < bucket.length; i++) {
      const file = bucket[i]!;
      const isLast = i === bucket.length - 1;
      steps.push({
        kind: isLast ? 'current_version' : i === 0 ? 'saved_document' : 'modified_document',
        title: file.title,
        id: file.id,
        ...(file.modifiedAt ? { modifiedAt: file.modifiedAt } : {}),
        confidence: isLast ? 'CONFIRMED' : 'LIKELY',
        provenance: 'indexed_file_timeline',
      });
    }
    chains.push({
      chainId: `${clientCode}:${key}`,
      clientCode,
      steps,
      confidence: link?.relationship === 'CONFIRMED' ? 'CONFIRMED' : 'LIKELY',
    });
  }

  return chains;
}

export function applyConflictAndStaleness<T extends {
  confidence: IdentityConfidence;
  source: string;
  status?: string;
  superseded?: boolean;
}>(
  rows: T[],
  opts: { hubMiOperationalized: boolean; newerSources: string[] },
): T[] {
  return rows.map((row) => {
    const fromHvsOnly = /hvs|recovered/i.test(row.source) && !opts.hubMiOperationalized;
    if (fromHvsOnly && opts.hubMiOperationalized) {
      return {
        ...row,
        confidence: 'STALE_OR_UNCERTAIN',
        superseded: true,
        ...(row.status ? { status: 'STALE_OR_UNCERTAIN' } : {}),
      };
    }
    if (opts.newerSources.some((src) => src && row.source && src !== row.source)) {
      const stale =
        row.confidence === 'CONFIRMED'
          ? 'LIKELY'
          : row.confidence === 'LIKELY'
            ? 'STALE_OR_UNCERTAIN'
            : row.confidence;
      return {
        ...row,
        confidence: stale,
        superseded: stale === 'STALE_OR_UNCERTAIN',
        ...(row.status && stale === 'STALE_OR_UNCERTAIN' ? { status: 'STALE_OR_UNCERTAIN' } : {}),
      };
    }
    return row;
  });
}
