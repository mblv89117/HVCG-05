# Release plan — HVCG Executive Dashboard (Elite OS)

## Objective

Ship a stable, honest, role-aware Executive Dashboard on Microsoft stack (SWA + Entra + Dataverse Dev), then Owner-gate any higher environment.

## Phases

### Phase A — Stabilize candidate (now)

1. Close DEF-ELITE-001 (fabricated $)  
2. Fix Sprint 14 build errors  
3. Replace Soon placeholders with pending-safe modules  
4. Unit/build green → redeploy SWA Dev  

### Phase B — Dev UAT

1. QA regression R1–R6 on new hash  
2. Owner UAT checklist (signed-in)  
3. Restricted-role spot check (Read-Only / Client Contact)  

### Phase C — Hardening

1. Full six-role matrix  
2. Live KPI refresh indicators  
3. App Insights (if in scope)  
4. Rollback drill recorded  

### Phase D — Promote (Owner only)

1. Staging SWA + PP Test if exists  
2. Production only after explicit Owner authorization  

## Out of scope this release

Paused runtime/cloud-agent/ATLAS-R work · Prod Power Platform import · Canvas rebuild
