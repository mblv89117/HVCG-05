# DEPLOYMENT RUNBOOK — Track 1 (PREPARED — DO NOT EXECUTE)

## Preconditions

1. GL-0 complete — Prod env ID/URL registered  
2. Prod SharePoint URLs confirmed (non-Dev)  
3. Managed solution packed; hash recorded  
4. Private deployment settings filled  
5. Pre-deploy backup of Prod (empty or existing)  
6. Explicit owner approval naming env + package hash  
7. QA / Architect / Docs signoff on package  

## Procedure (summary — execute only after approval)

1. `pac env select --environment <PROD_ID>`  
2. Confirm URL matches register  
3. Export/backup any existing solutions if present  
4. `pac solution import` managed zip + deployment settings  
5. Bind any remaining connection references in Maker UI  
6. Verify env vars (no Dev URLs; notify/email gates false)  
7. Leave flows **Off** until separate activation approval  
8. Run smoke tests per `SMOKE_TEST_PLAN.md`  
9. Record evidence in `DEPLOYMENT_EVIDENCE_INDEX.md`  

## Activation

Separate owner approval required to turn on each Production flow.
