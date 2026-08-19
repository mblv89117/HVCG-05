# QA Evidence — Automation Product Package

**Date:** 2026-07-20  
**Branch:** `cursor/orchestration-sprint12`  
**Agent:** automation (product build only — no ATLAS-R / runtime orchestration work)

## Scope tested

| Check | Result |
|-------|--------|
| Inventory JSON count matches automations array | PASS (26) |
| Flow index count matches flow files + executive brief | PASS |
| Definition index count matches definition files + executive | PASS |
| Registry seed count matches inventory | PASS |
| Priority flows present (due-soon, approval outcome, stale opp, meeting prep, project status, capital readiness, failure digest, client gated notify, payment past due, change request, exec brief) | PASS |
| New definitions include Log_Failure + Failure_Notify_Admin | PASS (generated scaffolds) |
| `HVCG_AutomationRegistry` list schema present | PASS |
| `HVCG_Notifications` Status/Audience columns for gated client send | PASS |
| Automation Center screen spec fields cover mission checklist | PASS (see scrAutomationCenter.md) |
| SharePoint views for Failed logs / Registry / pending client sends | PASS |
| Duplicate findings documented with resolutions | PASS |
| No production Maker enablement performed by agent | PASS (scaffolds default Off / EnableAuthorized=false) |

## How to re-run structural checks

```bash
python3 scripts/automation/seed-automation-registry.py
python3 scripts/automation/qa-automation-package.py
```

## Maker UAT (owner — not executed here)

1. Import scaffolds into **HVCG Development** only  
2. Bind connection references to service account  
3. Enable **one** flow at a time with synthetic data  
4. Confirm AutomationLogs Started/Succeeded/SkippedDuplicate  
5. Confirm Failure_Notify with intentional fault  
6. Leave Production Off pending Owner gate  

## Defects / residual risk

| Risk | Severity | Mitigation |
|------|----------|------------|
| Build sheets are scaffolds — not live Maker exports | Medium | Owner import guide; default Off |
| WeeklyStatusSummary vs ExecutiveWeeklyBrief audience overlap | Low | Duplicate findings split |
| Canvas Automation Center is spec-only until .msapp built | Medium | SharePoint views usable immediately |
| Notifications schema additive columns need list upgrade script | Medium | Include in next schema repair |
