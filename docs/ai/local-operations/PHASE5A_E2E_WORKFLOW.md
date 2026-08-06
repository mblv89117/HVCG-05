# Phase 5A Full End-to-End Workflow

1. Authenticated Manny opens `/ai-operations/eva` (local host only)  
2. Loads synthetic scenario (TEST — DO NOT CONTACT / TEST — SYNTHETIC EVA)  
3. Selects **Run Live Local AI Review** (Full Local AI End-to-End Test)  
4. `POST /api/local-ai/eva/intake` with `reviewMode`  
5. Schema validation → duplicate matching → synthetic company/contact/prospect  
6. Fast preliminary (optional non-blocking) → Deep `review_eva_submission`  
7. Schema + prohibited-claim validation  
8. On success → Manny ready queue + UAT checklist  
9. On failure → revision queue; original preserved; governed retry allowed  
10. Manny records local decision only (no email / Production / client activation)
