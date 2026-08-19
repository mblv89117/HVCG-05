# CHANGELOG

## Atlas

| Date | Change |
|------|--------|
| 2026-08-18 | **Documentation honesty (LIVE vs CANDIDATE).** LIVE Elite `e5740379` / `index-DvEHjcS6.js`. LIVE Hub `d22b55f` / Azure deploy `501fb29b-80f6-427d-8c65-3f1a88da52d9` with `/health` `capitalBackend.mode=sharepoint`, overlay durable, `websiteLeads.configured=true`. CRM operator `a43803e` remains a candidate (not live-certified). `origin/main` stays `b641fdd` (not production). ACCG01 ACL Apply was not run. Docs-only; no deploy. |
| 2026-08-14 21:25 UTC | **Owner recovery closeout.** Website lead path verified (www → buffer → `HVCG_Leads`). G11-F03 re-read: Manny sole member of seven groups; Hub approved-group map set. Owner guide added. G11-F07/F08 recorded as deferred engineering governance. `origin/main` untouched. |
| 2026-08-14 21:15 UTC | **P1 website lead ingest.** Keyed `POST /api/website/leads` upserts SharePoint `HVCG_Leads` via existing Graph/MI path. No second CRM. Bearer auth not broadened. `origin/main` untouched. |
| 2026-08-14 21:00 UTC | **P0 Command Center SharePoint 403 repair.** Hub Graph transport no longer sends `$filter` (Selected-permission 403 was masquerading as a token rejection). In-memory ClientCode/project authorization preserved. Elite hides unimplemented Initialize / Quick Capture / Microsoft sync / Archive. Graph vs BA audiences unchanged. `origin/main` untouched. Live: Hub zip `3572500` RuntimeSuccessful; Elite `index-CRgf6DAQ.js`. |
| 2026-08-14 20:25 UTC | **Gate 11 FINAL CLOSURE.** Owner Decisions 1–5 recorded. G11-F03 Manny-only entitlements applied. G11-F07/F08 verified. Client 360 mapping deferred post-audit (fail-closed). Core production architecture ready for Gate 12 cleanup/retirement (not started). See [Reports/GATE11_FINAL_CLOSURE.md](Reports/GATE11_FINAL_CLOSURE.md). |
| 2026-08-14 | C1 seven-system index (`docs/architecture/HVCG_SYSTEM_INDEX.md`); 19 Atlas worktree checkouts removed (branches kept); empty `OllamaModels` archived. Gate 12 not started. |
| 2026-07-16 19:01 UTC | Created pre-Sprint 4 [Release Candidate RC-1](Releases/Release_Candidate_RC-1.md): Revenue/Atlas/Track 1 immutable refs verified; dirty worktrees documented and excluded; Sprint 4 READY TO START / NOT STARTED. |
| 2026-07-16 04:20 UTC | Revenue Systems Engineer COMPLETE; Sprint 1–3 complete at `origin/cursor/revenue-sprint3-conversion` @ `0073bf49411408cced88873805b432bce4eefb31`; Track 1 frozen; Sprint 4 ready/not started. |
| 2026-07-16 (validation) | Path/timestamp/ownership consistency fixes per [VALIDATION_REPORT.md](VALIDATION_REPORT.md). |
| 2026-07-16 04:10 UTC | Created `PROJECT_ATLAS/` as permanent project brain (docs only). |

## Platform milestones (evidence-backed; not exhaustive)

| Milestone | Evidence |
|-----------|----------|
| Gate 11 — COMPLETE | [Reports/GATE11_FINAL_CLOSURE.md](Reports/GATE11_FINAL_CLOSURE.md) |
| Atlas CI + `main` protection | `.github/workflows/atlas-ci.yml`; GitHub branch protection on `main` |
| SharePoint PM production backend | Live Hub `/health` `pmBackend.mode=sharepoint` |
| RC-1 Development Baseline | `releases/RC-1-Development-Baseline/version.json` · commit `0f8d8eb` |
| GL-0 Prod env + SP sites | Deployment Engineer handoff · COMPLETE |
| Track 1 Live — Internal (**FROZEN**, historical Dynamics slice) | Tag `Track-1-Live-Internal` @ `302615956cea80c238172931f5901792f548f59c` |
| Sprint 1 EVA → Dev CRM | Smoke LeadId=13 → OppId=18 · `deployment/reports/checkpoints/eva-dev-smoke-20260715-203045.json` |
| Sprint 2–3 EVA + conversion | `origin/cursor/revenue-sprint3-conversion` @ `0073bf49411408cced88873805b432bce4eefb31` |
| Revenue Systems Engineer | **COMPLETE** @ `0073bf49411408cced88873805b432bce4eefb31` |
| Agent communications bus | `cursor/agent-communications` lineage |

Longer product history: root `CHANGELOG.md`, `releases/v1.0.0`, `releases/v1.1.0`.
