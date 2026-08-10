# Model Routing Policy (Phase 3)

## Profiles

| Profile | Purpose | Initial config |
| --- | --- | --- |
| Fast Operations Model | Routine classify/summarize/agenda jobs | Unconfigured until owner installs a faster model |
| Deep Analysis Model | Decision packages, client review, strategic analysis | `glm-4.7-flash:q4_K_M` |
| Fallback Model | Preferred unavailable | Same as Deep initially |

## Per-operation defaults

**Fast:** `classify_work_value`, `identify_missing_information`, `summarize_text`, `summarize_meeting_notes`, `draft_internal_status_update`, `prepare_meeting_agenda`, `prepare_meeting_brief`, `summarize_meeting_outcomes`, `draft_internal_task_plan`

**Deep:** `prepare_decision_package`, `summarize_synthetic_eva`, `review_eva_submission`, `prepare_document_review_pack`, `prepare_client_operations_pack`, `complex_client_review`, `strategic_issue_analysis`

Override per pack via `modelProfileOverride`.

## Fallback rules

- Never silently substitute — always record `requestedProfile`, `actualModel`, `usedFallback`, `fallbackReason`
- Never auto-pull or install models
- If Fast is empty, fall back to Deep with `no_faster_model_installed` and surface recommended models to the owner

## Audit fields recorded on each job

requested model profile · actual model · fallback reason · processing duration · input size · output size · validation result · confidence
