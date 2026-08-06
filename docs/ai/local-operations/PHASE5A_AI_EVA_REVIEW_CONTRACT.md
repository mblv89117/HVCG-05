# AI EVA Review Contract (Phase 5A)

**Operation:** `review_eva_submission` (Deep-only by default: `glm-4.7-flash:q4_K_M`)  
Fast model may be used only for preliminary missing-information checks.

## Required output fields

`submission_id`, `prospect_summary`, `company_profile`, `strengths`, `risks`, `growth_opportunities`, `financial_observations`, `operational_observations`, `capital_readiness`, `enterprise_value_readiness`, `missing_information`, `recommended_hvcg_services`, `recommended_next_action`, `follow_up_questions`, `work_value_tier`, `requires_manny_approval=true`, `confidence`, `facts`, `inferences`, `warnings`, `decision_package`, plus `time_protection`.

## Model must not

Approve/reject prospect · promise financing · recommend guaranteed approval · claim client created · claim email sent · assign pricing · bind HVCG · make lender commitment · create active client.

Malformed JSON, forbidden claims, or offline model → submission status `Failed` (original preserved; UI must not show AI success).
