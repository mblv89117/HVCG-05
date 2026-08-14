# ROADMAP

**As of:** 2026-08-14 21:25 UTC  
**Sources:** [CURRENT_STATE.md](CURRENT_STATE.md); [HVCG_OWNER_OPERATING_GUIDE.md](HVCG_OWNER_OPERATING_GUIDE.md); [Reports/GATE11_FINAL_CLOSURE.md](Reports/GATE11_FINAL_CLOSURE.md); owner decisions 2026-08-14

Owner recovery is complete. Commercial launches and Gate 12 are **not** next owner-operability work. G11-F07/F08 are deferred engineering governance.

## Near-term (core architecture)

| Order | Milestone | Status | Gate |
|-------|-----------|--------|------|
| 1 | Gate 11 — core production architecture, security/SoR, governance | **COMPLETE** | Owner Decisions 1–5 |
| 2 | Gate 12 — controlled worktree/workspace retirement and final architecture closeout | **NOT STARTED** | Separate authorization; do not begin from Gate 11 |
| 3 | Duplicate-infra retirement path execution | Path documented; **do not execute** until Gate 12 | Owner Decision 1 |

## Post-audit product backlog (not core-audit blockers)

| Item | Classification |
|------|----------------|
| Client 360 trusted source-container → ClientCode mapping | **CLIENT 360 MAPPING — POST CORE AUDIT DEFERRED BACKLOG** |
| Commercial launches (360 DNS/launch, Copilot production, GCC commercial program, etc.) | After the architecture audit |
| Employee-to-client entitlement roster (anyone other than Manny) | Separate owner approval |
| Dynamics / Dataverse | Deferred until a future business case |
| QBO merge into canonical | Preserved on `cursor/quickbooks-integration`; not merged |

## Completed (architecture audit)

- Seven-system boundaries accepted (Atlas OS, Autonomous Marketing, 360 Growth, GCC, Agent Copilot, Elevated Syndicate, Best Day; Hart = 360 tenant; EVA = funnel into Copilot)
- G11-F01 through G11-F09 remediated / verified on canonical + production evidence
- G11-F03 Manny-only client groups (Entra + Hub group map; Elite signed-in session is an owner browser check)
- G11-F07 `main` protection — **DEFERRED ENGINEERING GOVERNANCE** (in place; do not change)
- G11-F08 Atlas CI + dry-run production release control — **DEFERRED ENGINEERING GOVERNANCE** (in place; do not change)
- Website → `HVCG_Leads` ingest verified (no second CRM)
- Owner Decisions 1–5 recorded

## Historical July 16 roadmap

Preserved at [Archive/ROADMAP_2026-07-16.md](Archive/ROADMAP_2026-07-16.md). Sprint 4 / Dynamics Track-1 freeze items are historical and are not the Atlas V1 SoR.
