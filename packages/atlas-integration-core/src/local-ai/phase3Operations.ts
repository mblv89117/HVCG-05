/**
 * Phase 3 allowed operations — extends Phase 2 with meeting/document/client packs.
 * All remain read-only internal drafts.
 */

import {
  PHASE2_ALLOWED_OPERATIONS,
  PHASE2_FORBIDDEN_OPERATIONS,
  type Phase2AllowedOperation,
} from './allowedOperations.ts';

export const PHASE3_NEW_OPERATIONS = [
  'prepare_meeting_brief',
  'summarize_meeting_outcomes',
  'prepare_document_review_pack',
  'prepare_client_operations_pack',
  'complex_client_review',
  'strategic_issue_analysis',
  'classify_document',
  'recommend_document_filename',
  'recommend_document_folder',
  'review_routine_invoice',
  'review_routine_bank_statement',
  'review_routine_document',
  'review_complex_agreement',
  'review_financing_document',
  // Phase 4B-2 document AI operations
  'summarize_document',
  'extract_document_fields',
  'identify_document_obligations',
  'identify_document_deadlines',
  'identify_missing_signatures',
  'identify_missing_pages',
  'compare_document_versions',
  'prepare_document_decision_package',
] as const;

export type Phase3NewOperation = (typeof PHASE3_NEW_OPERATIONS)[number];

export const PHASE3_ALLOWED_OPERATIONS = [
  ...PHASE2_ALLOWED_OPERATIONS,
  ...PHASE3_NEW_OPERATIONS,
] as const;

export type Phase3AllowedOperation = (typeof PHASE3_ALLOWED_OPERATIONS)[number];

export const PHASE3_FORBIDDEN_OPERATIONS = PHASE2_FORBIDDEN_OPERATIONS;

export function isPhase3AllowedOperation(op: string): op is Phase3AllowedOperation {
  return (PHASE3_ALLOWED_OPERATIONS as readonly string[]).includes(op);
}

export function assertPhase3AllowedOperation(op: string): Phase3AllowedOperation {
  if (!isPhase3AllowedOperation(op)) {
    throw Object.assign(
      new Error(
        `Operation "${op}" is not allowed in Phase 3. Allowed: ${PHASE3_ALLOWED_OPERATIONS.join(', ')}`,
      ),
      { status: 400, code: 'operation_not_allowed' },
    );
  }
  return op;
}

/** Prefer Phase 3 assert when Phase 3 code paths run; Phase 2 ops remain valid. */
export function assertAllowedLocalAiOperation(op: string): Phase3AllowedOperation {
  return assertPhase3AllowedOperation(op);
}

export type { Phase2AllowedOperation };
