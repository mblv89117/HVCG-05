# Phase 4B-2 Deterministic vs Model Conflict Policy

1. Run deterministic classification / fields / naming / folder first.  
2. Run model enrichment only after redaction approval.  
3. On conflict: keep deterministic value for primary fields; append model value to alternatives / conflicts; lower confidence; `requires_manny_approval=true`.  
4. Never auto-retrain from a single Manny correction (corrections may flag `informFutureDeterministicRules` for later human policy edits only).
