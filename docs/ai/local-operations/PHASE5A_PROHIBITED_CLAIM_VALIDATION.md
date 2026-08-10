# Phase 5A Prohibited-Claim Validation Report

Claims that fail validation (non-exhaustive list in `EVA_PROHIBITED_CLAIM_PHRASES`):

- prospect approved / client created / client activated / client accepted  
- financing guaranteed / guaranteed financing / guaranteed approval / financing approved  
- lender contacted / lender commitment  
- email sent / consultation scheduled / meeting scheduled  
- pricing approved / agreement executed / payment received  
- Atlas Production updated / production records created  

On match: validation fails · submission preserved · audit `eva_ai_review_failed` · revision queue only · governed retry allowed.
