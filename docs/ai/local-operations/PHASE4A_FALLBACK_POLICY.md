# Phase 4A Fallback Policy

1. Preferred Fast unavailable → Deep with reason `no_faster_model_installed` / `preferred_model_unavailable`
2. Fast schema/malformed failure → Deep with reason `fast_model_schema_validation_failed` (recorded in audit)
3. Never silently substitute
4. Deep-only operations never use Fast
5. After Deep quality fallback exhaustion → job Validation/Processing Failed; preserve audit; no false completion
