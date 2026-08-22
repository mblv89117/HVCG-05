/**
 * RFI / condition decomposition and client-request consolidation.
 * Lender/client text is untrusted data. It never becomes Atlas instructions.
 */

import type {
  CapitalDocument,
  ChecklistItem,
  ClientRequestBundle,
  LenderInteraction,
  LenderInteractionType,
  LenderMessageClass,
  RfiItem,
  RfiItemSupport,
  SlaState,
  SourceRef,
} from './types.ts';
import { classifyLenderMessage } from './intelligence.ts';
import { detectInstructionInjection, INJECTION_RE, untrustedCommunication } from './execution-trust.ts';

function supportForItem(
  item: string,
  documents: CapitalDocument[],
  checklist: ChecklistItem[],
): { support: RfiItemSupport; source?: string; matchedDocumentId?: string; matchedChecklistItemId?: string; action: RfiItem['action'] } {
  const needle = item.toLowerCase();
  const narrative =
    /explain|explanation|narrative|why|decline in revenue|revenue decline|comment on/i.test(item);
  if (narrative) {
    return { support: 'requires_client_narrative', action: 'draft_response' };
  }

  const doc = documents.find((d) => {
    const hay = `${d.fileName} ${d.documentType}`.toLowerCase();
    return needle.split(/\s+/).filter((w) => w.length > 3).some((w) => hay.includes(w));
  });
  if (doc) {
    return {
      support: 'already_available',
      source: doc.fileName,
      matchedDocumentId: doc.id,
      action: 'attach_existing',
    };
  }

  const row = checklist.find((c) => {
    const hay = `${c.name} ${c.itemKey}`.toLowerCase();
    return needle.split(/\s+/).filter((w) => w.length > 3).some((w) => hay.includes(w));
  });
  if (row) {
    if (row.status === 'OUTDATED') {
      return {
        support: 'stale',
        source: row.name,
        matchedChecklistItemId: row.id,
        action: 'request_client',
      };
    }
    if (row.status === 'RECEIVED' || row.status === 'ACCEPTED') {
      return {
        support: 'already_available',
        source: row.name,
        matchedChecklistItemId: row.id,
        action: 'attach_existing',
      };
    }
    if (row.status === 'INCOMPLETE' || row.status === 'NEEDS_REVIEW') {
      return {
        support: 'partial_support_only',
        source: row.name,
        matchedChecklistItemId: row.id,
        action: 'request_client',
      };
    }
    return {
      support: 'missing',
      source: row.name,
      matchedChecklistItemId: row.id,
      action: 'request_client',
    };
  }

  return { support: 'missing', action: 'request_client' };
}

export function slaState(opts: { responseDue?: string; blocked?: SlaState; now?: Date }): SlaState {
  if (opts.blocked) return opts.blocked;
  if (!opts.responseDue) return 'ON_TRACK';
  const due = Date.parse(opts.responseDue);
  if (!Number.isFinite(due)) return 'ON_TRACK';
  const now = (opts.now || new Date()).getTime();
  if (now > due) return 'OVERDUE';
  if (due - now <= 2 * 86_400_000) return 'DUE_SOON';
  return 'ON_TRACK';
}

export function decomposeLenderRequest(opts: {
  text: string;
  capitalOpportunityId: string;
  clientCode: string;
  lenderId?: string;
  documents?: CapitalDocument[];
  checklist?: ChecklistItem[];
  requestedAt?: string;
  now?: Date;
}): { classification: ReturnType<typeof classifyLenderMessage>; injectionDetected: boolean; items: RfiItem[] } {
  const trust = untrustedCommunication(opts.text);
  const classification = classifyLenderMessage(opts.text);
  const requestedAt = opts.requestedAt || (opts.now || new Date()).toISOString();
  const docs = opts.documents || [];
  const checklist = opts.checklist || [];
  const bullets =
    classification.requestedItems.length > 0
      ? classification.requestedItems
      : splitProseItems(opts.text);

  const items: RfiItem[] = bullets
    .filter((item) => item && !INJECTION_RE.test(item))
    .map((item, idx) => {
      const matched = supportForItem(item, docs, checklist);
      const sla = slaState({
        responseDue: classification.dueDate,
        blocked:
          matched.support === 'requires_manny_narrative'
            ? 'MANNY_DECISION_REQUIRED'
            : matched.support === 'missing' || matched.support === 'stale'
              ? 'BLOCKED_CLIENT'
              : undefined,
        now: opts.now,
      });
      return {
        id: `rfi-${opts.capitalOpportunityId}-${idx + 1}`,
        capitalOpportunityId: opts.capitalOpportunityId,
        clientCode: opts.clientCode,
        lenderId: opts.lenderId,
        item,
        support: matched.support,
        source: matched.source,
        matchedDocumentId: matched.matchedDocumentId,
        matchedChecklistItemId: matched.matchedChecklistItemId,
        action: matched.action,
        sla,
        requestedAt,
        responseDue: classification.dueDate,
        nextAction:
          matched.action === 'attach_existing'
            ? 'Attach existing file to lender package'
            : matched.action === 'draft_response'
              ? 'Draft client/Manny narrative'
              : 'Request from client (do not send automatically)',
        nextActionOwner: matched.action === 'attach_existing' ? 'hvcg' : 'client',
        agingDays: 0,
        candidateOnly: true,
      };
    });

  return { classification, injectionDetected: trust.injectionDetected, items };
}

function splitProseItems(text: string): string[] {
  const parts = text
    .split(/,| and /i)
    .map((p) => p.replace(/^please provide\s+/i, '').replace(/\.$/, '').trim())
    .filter((p) => p.length > 8 && p.length < 180);
  return parts.slice(0, 8);
}

export function consolidateClientRequests(opts: {
  capitalOpportunityId: string;
  clientCode: string;
  items: RfiItem[];
}): ClientRequestBundle {
  const buckets: ClientRequestBundle['buckets'] = {
    STILL_NEEDED: [],
    UPDATED_VERSION_REQUIRED: [],
    CLARIFICATION_REQUIRED: [],
    SIGNATURE_ATTESTATION_REQUIRED: [],
    MANNY_INPUT_REQUIRED: [],
  };
  for (const item of opts.items) {
    if (item.support === 'stale') buckets.UPDATED_VERSION_REQUIRED.push(item.item);
    else if (item.support === 'requires_client_narrative') buckets.CLARIFICATION_REQUIRED.push(item.item);
    else if (item.support === 'requires_manny_narrative') buckets.MANNY_INPUT_REQUIRED.push(item.item);
    else if (/sign|attest|guarantee/i.test(item.item)) buckets.SIGNATURE_ATTESTATION_REQUIRED.push(item.item);
    else if (item.support === 'missing' || item.support === 'partial_support_only') buckets.STILL_NEEDED.push(item.item);
  }
  const lines = (Object.entries(buckets) as Array<[keyof typeof buckets, string[]]>)
    .filter(([, v]) => v.length)
    .map(([k, v]) => `${k}:\n${v.map((i) => `- ${i}`).join('\n')}`);
  return {
    capitalOpportunityId: opts.capitalOpportunityId,
    clientCode: opts.clientCode,
    sendAttempted: false,
    buckets,
    subject: `Capital follow-up — ${opts.clientCode} (DRAFT, not sent)`,
    body: lines.join('\n\n') || 'No client items outstanding.',
  };
}

export function interactionFromClassification(opts: {
  capitalOpportunityId: string;
  clientCode: string;
  lenderId: string;
  productId?: string;
  submissionId?: string;
  text: string;
  classification: LenderMessageClass;
  requestedItems: string[];
  responseDue?: string;
  injectionDetected: boolean;
  actor?: string;
}): LenderInteraction {
  const type: LenderInteractionType =
    opts.classification === 'REQUEST_FOR_INFORMATION' || opts.classification === 'MISSING_DOCUMENT'
      ? 'RFI'
      : opts.classification === 'TERM_SHEET'
        ? 'TERM_SHEET'
        : opts.classification === 'DECLINE'
          ? 'DECLINE'
          : opts.classification === 'CONDITIONAL_APPROVAL'
            ? 'APPROVAL'
            : opts.classification === 'FUNDED'
              ? 'FUNDED_NOTICE'
              : opts.classification === 'ACKNOWLEDGMENT'
                ? 'ACKNOWLEDGED'
                : opts.classification === 'CLOSING_CONDITION'
                  ? 'CLOSING_REQUEST'
                  : opts.classification === 'UNDERWRITING_QUESTION'
                    ? 'QUESTION'
                    : 'OTHER';
  const sourceRef: SourceRef = {
    sourceSystem: 'untrusted_lender_communication',
    capturedAt: new Date().toISOString(),
    capturedBy: opts.actor,
    field: 'body',
  };
  return {
    id: `int-${opts.capitalOpportunityId}-${Date.now()}`,
    capitalOpportunityId: opts.capitalOpportunityId,
    clientCode: opts.clientCode,
    lenderId: opts.lenderId,
    productId: opts.productId,
    submissionId: opts.submissionId,
    interactionType: type,
    at: sourceRef.capturedAt,
    direction: 'inbound',
    summary: opts.text.slice(0, 240),
    status: 'candidate',
    requestedItems: opts.requestedItems,
    responseDue: opts.responseDue,
    owner: 'hvcg',
    sourceRef,
    candidateOnly: true,
    injectionDetected: opts.injectionDetected,
  };
}

export function messageClassToInteractionType(classification: LenderMessageClass): LenderInteractionType {
  return interactionFromClassification({
    capitalOpportunityId: '_',
    clientCode: '_',
    lenderId: '_',
    text: '',
    classification,
    requestedItems: [],
    injectionDetected: false,
  }).interactionType;
}
