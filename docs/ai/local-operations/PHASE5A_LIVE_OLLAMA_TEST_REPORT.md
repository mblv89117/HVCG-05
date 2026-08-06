# Phase 5A Live Ollama Test Report

**Run:** `npx tsx scripts/phase5a-live-acceptance.ts`  
**Evidence:** `deployment/reports/local-ai-phase5a/live-acceptance.json`  
**Ollama:** 0.32.5 loopback · Deep `glm-4.7-flash:q4_K_M` · Fast `qwen2.5:7b-instruct`

## Results (acceptance run)

| Metric | Value |
| --- | --- |
| Live scenarios OK | **13/13** (12 Deep reviews + prompt-injection intake reject) |
| Schema validation rate | **100%** (12/12 Deep) |
| Fast preliminary Passed | **12/12** |
| AI failure count | **0** |
| Avg end-to-end | **~201s** |
| Max end-to-end | **~370s** (`same_company_new_contact`) |
| Min end-to-end | **~135s** |
| Prohibited-claim tests | **all rejected** |
| Recovery tests | **pass** |
| Manny UAT checklist | **PASS** (Qualified for Consultation) |
| Safety flags | all required falses confirmed |

## Scenarios

strong concrete · dental · entertainment weak controls · supportive living · auto repair · early-stage · heavy debt · strong recurring · high concentration · missing financials · duplicate company · same company new contact · prompt-injection (intake reject)
