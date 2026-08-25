/**
 * Thread context from already-indexed entitled mail previews.
 *
 * Does not call Graph/Outlook, invent amounts/deadlines, or send mail.
 * Suggested replies stay DRAFT_ONLY. AUTO_RESPOND is never enabled.
 */

import { extractMailConversationId, indexedPreviewOnly } from '../sharepoint/fabric/mailPreview.ts';
import {
  COMMUNICATIONS_AUTO_RESPOND,
  COMMUNICATIONS_POLICY_CLASS,
  COMMUNICATIONS_SEND,
  type AskAtlasClassification,
  type AtlasAuthorizedSearchHit,
  type MailThreadDetectedItem,
  type MailThreadOperatingPayload,
  type MailThreadOperatingRecord,
  type MailThreadSuggestedDraft,
} from './types.ts';

export { extractMailConversationId, indexedPreviewOnly };

const CONFIRMED_COMMITMENT =
  /\b(?:i will|i shall|i am going to|i'll|we will|we shall|we are going to|we can send)\b/i;
const LIKELY_COMMITMENT = /\b(?:follow(?:ing)? up|waiting (?:on|for)|i can|we can)\b/i;
const CONFIRMED_QUESTION = /\?/;
const LIKELY_QUESTION =
  /\b(?:can you|could you|please (?:confirm|advise|let me know|provide|send|review)|let me know)\b/i;

const AMOUNT_OR_DEADLINE = /\$|\b\d{1,3}(?:,\d{3})+(?:\.\d{2})?\b|\b(?:by|due)\s+\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/i;

function sentenceSpans(preview: string): string[] {
  return preview
    .split(/(?<=[.?!])\s+/)
    .map((row) => row.trim())
    .filter(Boolean);
}

function classifySpan(
  span: string,
  confirmed: RegExp,
  likely: RegExp,
): AskAtlasClassification | null {
  if (confirmed.test(span)) return 'CONFIRMED';
  if (likely.test(span)) return 'LIKELY';
  return null;
}

function detectItems(
  preview: string,
  confirmed: RegExp,
  likely: RegExp,
): MailThreadDetectedItem[] {
  const items: MailThreadDetectedItem[] = [];
  const seen = new Set<string>();
  for (const span of sentenceSpans(preview)) {
    const classification = classifySpan(span, confirmed, likely);
    if (!classification) continue;
    const text = span.slice(0, 280);
    if (seen.has(text.toLowerCase())) continue;
    seen.add(text.toLowerCase());
    items.push({ text, classification, evidence: text });
  }
  return items;
}

function summaryFromPreview(preview: string, title: string): string {
  if (!preview) {
    return `Indexed preview only. No stored body preview for "${title}".`;
  }
  const safe = sentenceSpans(preview).find((span) => !AMOUNT_OR_DEADLINE.test(span));
  if (!safe) {
    return 'Indexed preview only. Thread context is available from the stored preview. Amounts and deadlines were not extracted.';
  }
  return `Indexed preview only. ${safe.slice(0, 240)}`.trim();
}

function draftFromEvidence(opts: {
  title: string;
  commitments: MailThreadDetectedItem[];
  unansweredQuestions: MailThreadDetectedItem[];
}): MailThreadSuggestedDraft {
  const lines = ['Thank you for your note.'];
  if (opts.unansweredQuestions.length) {
    lines.push('I will answer the questions already stated in this indexed thread.');
  }
  if (opts.commitments.length) {
    lines.push('I will follow through on the commitments already stated in this indexed thread.');
  }
  if (!opts.unansweredQuestions.length && !opts.commitments.length) {
    lines.push('I will review this indexed thread and reply with entitled facts we already have.');
  }
  lines.push('This suggested reply is a draft only. It has not been sent.');
  const body = lines.join(' ');
  return {
    policyClass: COMMUNICATIONS_POLICY_CLASS,
    send: COMMUNICATIONS_SEND,
    autoRespond: COMMUNICATIONS_AUTO_RESPOND,
    subject: opts.title.trim() ? `Re: ${opts.title.trim().slice(0, 200)}` : 'Re: indexed thread',
    body,
    status: 'draft',
  };
}

function strongestClassification(
  commitments: MailThreadDetectedItem[],
  questions: MailThreadDetectedItem[],
  hasPreview: boolean,
): AskAtlasClassification | 'HONEST_EMPTY' {
  const all = [...commitments, ...questions];
  if (all.some((row) => row.classification === 'CONFIRMED')) return 'CONFIRMED';
  if (all.some((row) => row.classification === 'LIKELY')) return 'LIKELY';
  if (hasPreview) return 'PROPOSED';
  return 'HONEST_EMPTY';
}

function emptyDraft(title: string): MailThreadSuggestedDraft {
  return draftFromEvidence({ title, commitments: [], unansweredQuestions: [] });
}

export function emptyMailThreadPayload(): MailThreadOperatingPayload {
  return {
    kind: 'mail_thread_operating_record_v1',
    policyClass: COMMUNICATIONS_POLICY_CLASS,
    invented: false,
    autoRespond: COMMUNICATIONS_AUTO_RESPOND,
    send: COMMUNICATIONS_SEND,
    indexedPreviewOnly: true,
    items: [],
  };
}

export function composeMailThreadRecords(hits: AtlasAuthorizedSearchHit[]): MailThreadOperatingPayload {
  const items: MailThreadOperatingRecord[] = [];
  const seen = new Set<string>();
  for (const hit of hits) {
    if (hit.kind !== 'communication') continue;
    const preview = indexedPreviewOnly(hit.preview || '');
    const conversationId =
      (hit.conversationId && hit.conversationId.trim()) || extractMailConversationId(hit.preview || '', hit) || hit.id;
    if (seen.has(conversationId)) continue;
    seen.add(conversationId);
    const commitments = preview ? detectItems(preview, CONFIRMED_COMMITMENT, LIKELY_COMMITMENT) : [];
    const unansweredQuestions = preview
      ? detectItems(preview, CONFIRMED_QUESTION, LIKELY_QUESTION)
      : [];
    const classification = strongestClassification(commitments, unansweredQuestions, Boolean(preview));
    const clientCode = hit.clientCode?.trim() || undefined;
    const direction =
      hit.direction === 'Inbound' || hit.direction === 'Outbound' || hit.direction === 'Internal'
        ? hit.direction
        : undefined;
    items.push({
      id: hit.id,
      conversationId,
      title: hit.title,
      ...(clientCode ? { clientCode } : {}),
      channel: 'Email',
      ...(direction ? { direction } : {}),
      preview,
      summary: summaryFromPreview(preview, hit.title),
      summarySource: 'indexed_preview_only',
      invented: false,
      ...(hit.webUrl ? { webUrl: hit.webUrl } : {}),
      ...(hit.modifiedAt ? { modifiedAt: hit.modifiedAt } : {}),
      classification,
      provenance: classification,
      commitments,
      unansweredQuestions,
      suggestedDraft: preview
        ? draftFromEvidence({ title: hit.title, commitments, unansweredQuestions })
        : emptyDraft(hit.title),
    });
  }
  return {
    kind: 'mail_thread_operating_record_v1',
    policyClass: COMMUNICATIONS_POLICY_CLASS,
    invented: false,
    autoRespond: COMMUNICATIONS_AUTO_RESPOND,
    send: COMMUNICATIONS_SEND,
    indexedPreviewOnly: true,
    items,
  };
}

export function mailThreadPayloadHasInventedFacts(payload: MailThreadOperatingPayload): boolean {
  for (const row of payload.items) {
    if (row.invented) return true;
    if (row.summarySource !== 'indexed_preview_only') return true;
    if (row.suggestedDraft.send || row.suggestedDraft.autoRespond) return true;
    if (row.suggestedDraft.policyClass !== COMMUNICATIONS_POLICY_CLASS) return true;
    if (AMOUNT_OR_DEADLINE.test(row.summary) || AMOUNT_OR_DEADLINE.test(row.suggestedDraft.body)) {
      return true;
    }
    for (const item of [...row.commitments, ...row.unansweredQuestions]) {
      if (!row.preview.includes(item.evidence)) return true;
    }
  }
  return false;
}
