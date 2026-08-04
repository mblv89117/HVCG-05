/**
 * Phase 3 controlled live-content + routing helpers for LocalAiService.
 */

import { randomUUID } from 'node:crypto';
import {
  MAX_CONTENT_PACK_CHARS,
  SYNTHETIC_AI_OUTPUT_BANNER,
  SYNTHETIC_RECORD_BANNER,
  approxTokens,
  assertAllowedLocalAiOperation,
  assertContentPackReadyForModel,
  buildDocumentReviewPackDraft,
  buildModelRoutingConfig,
  buildTimeProtectionOutput,
  emptyClientOperationsPack,
  emptyMeetingBrief,
  emptyMeetingOutcomes,
  extractMeetingHintsFromText,
  redactText,
  resolveModelForOperation,
  scanForInjection,
  seedClientOperationsFromText,
  type ContentPackRecord,
  type CreateContentPackRequest,
  type ModelProfile,
  type ModelRoutingConfig,
  type ModelResolution,
  type RedactionDecision,
} from '@hvcg/atlas-integration-core';

export function loadModelRoutingFromEnv(
  deepDefault: string,
  env: Record<string, string | undefined> = process.env,
  fileEnv: Record<string, string> = {},
  installedModels: string[] = [],
): ModelRoutingConfig {
  const merged = { ...fileEnv, ...env };
  return buildModelRoutingConfig({
    deepModel:
      merged.OLLAMA_DEEP_MODEL ||
      merged.OLLAMA_MODEL ||
      deepDefault ||
      '',
    fastModel: merged.OLLAMA_FAST_MODEL || '',
    fallbackModel: merged.OLLAMA_FALLBACK_MODEL || merged.OLLAMA_MODEL || deepDefault || '',
    installedModels,
  });
}

export function createContentPackRecord(
  req: CreateContentPackRequest,
): ContentPackRecord {
  assertAllowedLocalAiOperation(req.requestedOperation);
  if (!req.sourceConfirmed) {
    throw Object.assign(new Error('Manny must confirm the source before creating a pack'), {
      status: 400,
      code: 'source_not_confirmed',
    });
  }
  if (!req.clientId?.trim() || !req.clientLabel?.trim()) {
    throw Object.assign(new Error('Client identification is required'), {
      status: 400,
      code: 'client_required',
    });
  }
  if (!req.originalContent?.trim()) {
    throw Object.assign(new Error('Content is required'), {
      status: 400,
      code: 'content_required',
    });
  }
  if (req.originalContent.length > MAX_CONTENT_PACK_CHARS) {
    throw Object.assign(
      new Error(`Content exceeds max size (${MAX_CONTENT_PACK_CHARS} chars)`),
      { status: 400, code: 'oversized_input' },
    );
  }

  const isSynthetic =
    req.originalContent.includes(SYNTHETIC_RECORD_BANNER) ||
    req.originalContent.includes('TEST — DO NOT CONTACT') ||
    req.originalContent.includes('TEST — SYNTHETIC DATA');
  if (!isSynthetic && !req.ownerApprovedLiveContent) {
    throw Object.assign(
      new Error(
        'Non-synthetic content requires ownerApprovedLiveContent=true (manual approval)',
      ),
      { status: 400, code: 'live_content_not_approved' },
    );
  }

  const redaction = redactText(req.originalContent, {
    maskFinancialValues: true,
    maskClientNames: [req.clientLabel].filter(Boolean),
  });
  const injection = scanForInjection(req.originalContent);
  const now = new Date().toISOString();
  const packId = randomUUID();

  return {
    packId,
    createdAt: now,
    updatedAt: now,
    initiatedBy: 'Manny',
    sourceKind: req.sourceKind,
    sourceConfirmed: true,
    clientId: req.clientId,
    clientLabel: req.clientLabel,
    projectId: req.projectId || null,
    projectLabel: req.projectLabel || null,
    sensitivity: req.sensitivity,
    requestedOperation: req.requestedOperation,
    modelProfileOverride: req.modelProfileOverride || null,
    originalContent: req.originalContent,
    redactedContent: redaction.redactedText,
    redactionPreview: redaction,
    injectionPreview: injection,
    estimatedChars: req.originalContent.length,
    estimatedTokensApprox: approxTokens(req.originalContent.length),
    status: 'AwaitingRedactionApproval',
    redactionDecision: 'Pending',
    redactionApprovedAt: null,
    auditCorrelationId: randomUUID(),
    linkedAiJobId: null,
    notes: req.notes || '',
    syntheticOrApprovedLabel: isSynthetic
      ? SYNTHETIC_RECORD_BANNER
      : 'OWNER-APPROVED LIVE CONTENT — MANUAL PACK',
  };
}

export function applyRedactionDecision(
  pack: ContentPackRecord,
  decision: RedactionDecision,
  opts?: { editedRedactedContent?: string },
): ContentPackRecord {
  const now = new Date().toISOString();
  if (decision === 'Cancel Job') {
    return {
      ...pack,
      status: 'Cancelled',
      redactionDecision: decision,
      updatedAt: now,
    };
  }
  if (decision === 'Edit Redactions') {
    if (!opts?.editedRedactedContent?.trim()) {
      throw Object.assign(new Error('editedRedactedContent required for Edit Redactions'), {
        status: 400,
        code: 'edit_required',
      });
    }
    const reinjection = scanForInjection(opts.editedRedactedContent);
    return {
      ...pack,
      redactedContent: opts.editedRedactedContent,
      injectionPreview: reinjection,
      estimatedChars: opts.editedRedactedContent.length,
      estimatedTokensApprox: approxTokens(opts.editedRedactedContent.length),
      status: 'AwaitingRedactionApproval',
      redactionDecision: 'Pending',
      updatedAt: now,
    };
  }
  if (decision === 'Approve Redacted Content') {
    return {
      ...pack,
      status: 'RedactionApproved',
      redactionDecision: decision,
      redactionApprovedAt: now,
      updatedAt: now,
    };
  }
  throw Object.assign(new Error(`Unsupported redaction decision: ${decision}`), {
    status: 400,
    code: 'invalid_redaction_decision',
  });
}

export function enrichJobOutputForPhase3(opts: {
  operation: string;
  originalText: string;
  redactedText: string;
  clientLabel: string;
  projectLabel?: string | null;
  sensitivity: ContentPackRecord['sensitivity'];
  injectionWarnings: string[];
  outputPayload: unknown;
  requiresMannyApproval: boolean;
  confidence: number | null;
}): {
  documentReviewPack: unknown | null;
  meetingDraft: unknown | null;
  clientOperationsPack: unknown | null;
  timeProtection: ReturnType<typeof buildTimeProtectionOutput>;
} {
  const payload = (opts.outputPayload || {}) as Record<string, unknown>;
  const tier = typeof payload.work_value_tier === 'string' ? payload.work_value_tier : undefined;

  let documentReviewPack: unknown | null = null;
  let meetingDraft: unknown | null = null;
  let clientOperationsPack: unknown | null = null;

  if (
    opts.operation === 'prepare_document_review_pack' ||
    opts.operation === 'identify_missing_information'
  ) {
    documentReviewPack = buildDocumentReviewPackDraft({
      title: `${opts.clientLabel} document`,
      documentType: 'manual_upload',
      client: opts.clientLabel,
      project: opts.projectLabel || 'unspecified',
      sensitivity: opts.sensitivity,
      extractedText: opts.originalText,
      redactedText: opts.redactedText,
      injectionWarnings: opts.injectionWarnings,
      requestedOperation: opts.operation,
    });
  }

  if (opts.operation === 'prepare_meeting_brief' || opts.operation === 'prepare_meeting_agenda') {
    const hints = extractMeetingHintsFromText(opts.originalText);
    meetingDraft = {
      ...emptyMeetingBrief(),
      meetingObjective: String(payload.executive_summary || 'Meeting preparation draft'),
      backgroundSummary: String(payload.executive_summary || ''),
      missingDocuments: hints.missingDocuments,
      risks: hints.risks,
      decisionsRequired: Array.isArray(payload.missing_information)
        ? (payload.missing_information as string[])
        : [],
      agenda: Array.isArray(payload.facts) ? (payload.facts as string[]).slice(0, 8) : [],
      recommendedTalkingPoints: Array.isArray(payload.inferences)
        ? (payload.inferences as string[]).slice(0, 8)
        : [],
    };
  }

  if (
    opts.operation === 'summarize_meeting_outcomes' ||
    opts.operation === 'summarize_meeting_notes'
  ) {
    const hints = extractMeetingHintsFromText(opts.originalText);
    meetingDraft = {
      ...emptyMeetingOutcomes(),
      summary: String(payload.executive_summary || ''),
      decisions: Array.isArray(payload.facts) ? (payload.facts as string[]) : [],
      tasks: Array.isArray(payload.recommended_next_action)
        ? []
        : [String(payload.recommended_next_action || 'Review draft')],
      deadlines: hints.deadlines,
      unresolvedIssues: Array.isArray(payload.risks) ? (payload.risks as string[]) : [],
      followUpEmailDraft: `${SYNTHETIC_AI_OUTPUT_BANNER}\nInternal draft only — do not send.`,
      suggestedAtlasUpdates: ['Review suggested updates manually — no auto write'],
      atlasRecordsUpdated: false,
    };
  }

  if (
    opts.operation === 'prepare_client_operations_pack' ||
    opts.operation === 'complex_client_review' ||
    opts.operation === 'strategic_issue_analysis'
  ) {
    clientOperationsPack = {
      ...emptyClientOperationsPack(),
      ...seedClientOperationsFromText(opts.originalText),
      executiveSummary: String(payload.executive_summary || ''),
      decisionsRequired: Array.isArray(payload.missing_information)
        ? (payload.missing_information as string[])
        : [],
      recommendedNextActions: [String(payload.recommended_next_action || '')].filter(Boolean),
      tasksRequiringManny: opts.requiresMannyApproval
        ? ['Owner judgment required on draft recommendations']
        : [],
      tasksAiCouldHandle: ['Draft summaries', 'Missing-document lists', 'Agenda prep'],
    };
  }

  const timeProtection = buildTimeProtectionOutput({
    requiresMannyApproval: opts.requiresMannyApproval,
    confidence: opts.confidence,
    workValueTier: tier,
    duplicateDetected: /\bduplicate\b/i.test(opts.originalText),
    canBatch: /\bbatch|routine\b/i.test(opts.originalText),
    automationCandidate: /\bautomate|routine\b/i.test(opts.originalText),
    eliminate: /\beliminate|unnecessary\b/i.test(opts.originalText),
    estimatedReviewMinutes:
      typeof (payload.decision_package as { required_review_minutes?: number } | undefined)
        ?.required_review_minutes === 'number'
        ? (payload.decision_package as { required_review_minutes: number }).required_review_minutes
        : undefined,
  });

  return { documentReviewPack, meetingDraft, clientOperationsPack, timeProtection };
}

export function resolveJobModel(
  operation: string,
  routing: ModelRoutingConfig,
  override?: ModelProfile | null,
  installed?: string[],
): ModelResolution {
  return resolveModelForOperation(operation, routing, {
    overrideProfile: override || undefined,
    installedModels: installed,
  });
}

export { assertContentPackReadyForModel };
