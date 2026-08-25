/**
 * Phase 2 allowed operations — internal drafts only.
 */

export const PHASE2_ALLOWED_OPERATIONS = [
  'summarize_text',
  'classify_work_value',
  'identify_missing_information',
  'prepare_decision_package',
  'draft_internal_task_plan',
  'summarize_synthetic_eva',
  'prepare_meeting_agenda',
  'summarize_meeting_notes',
  'draft_internal_status_update',
] as const;

export type Phase2AllowedOperation = (typeof PHASE2_ALLOWED_OPERATIONS)[number];

export const PHASE2_FORBIDDEN_OPERATIONS = [
  'email_sending',
  'document_movement',
  'record_updates',
  'client_activation',
  'prospect_conversion',
  'financing_submissions',
  'lender_outreach',
  'accounting_changes',
  'calendar_changes',
  'website_publishing',
  'social_media_publishing',
] as const;

export function isPhase2AllowedOperation(op: string): op is Phase2AllowedOperation {
  return (PHASE2_ALLOWED_OPERATIONS as readonly string[]).includes(op);
}

export function assertPhase2AllowedOperation(op: string): Phase2AllowedOperation {
  if (!isPhase2AllowedOperation(op)) {
    throw Object.assign(
      new Error(
        `Operation "${op}" is not allowed in Phase 2. Allowed: ${PHASE2_ALLOWED_OPERATIONS.join(', ')}`,
      ),
      { status: 400, code: 'operation_not_allowed' },
    );
  }
  return op;
}
