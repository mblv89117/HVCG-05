# CHANGELOG

## Atlas

| Date | Change |
|------|--------|
| 2026-08-11 | Sprint 9 Dev (pending commit): Risk/Claims OS — `risk_claims.py`, RiskMatters/Evidence, tax/UE/insurance/claims agents, CFO/Capital/Procurement signals; Elite `/risk` + Client 360. RISK-001/002 → IN_PROGRESS. **No Production / no Sprint 10.** |
| 2026-08-11 | Sprint 8 commit: Procurement & Government Readiness OS (BA `a0166e9` · Elite `34b6f4f`). PROC-001/002 remain IN_PROGRESS. **No Production / no external submit.** |
| 2026-08-11 | Sprint 8 Dev (pending commit): Contract Procurement & Government Readiness OS — `contract_procurement.py`, registrations, capability truth, bid/no-bid, Capital/CFO handoffs; Elite `/procurement` + Client 360. PROC-001/002 → IN_PROGRESS (not full IMPLEMENTED). **No Production / no Sprint 9.** |
| 2026-08-11 | Sprint 7 commit: Fractional CFO OS (BA `fee9d69` · Elite `90f0138`). CFO-002/004 IN_PROGRESS; live QBO/Plaid remain gated. **No Production.** |
| 2026-08-11 | Sprint 7 Dev (pending commit): Fractional CFO OS — `fractional_cfo.py`, source registry, monthly cycle, 13-week forecast, AR/AP/WIP/budget/KPI/report, Capital continuity; Elite Finance workbench + Client 360 Finance; AGT-CFO-OPS. Coverage 56.0%→55.6% (honest IN_PROGRESS, not full IMPLEMENTED). CAP-003 unchanged. **No Production / no Sprint 8.** |
| 2026-08-11 | Sprint 6 commit: Lender-Ready Capital Package + AGT-FIN-PKG (BA `80eb54f` · Elite `ec5566d`). CAP-003 remains IN_PROGRESS (submission-gated). **No Production / no lender submit.** |
| 2026-08-11 | Sprint 3 commit: Revenue conversion engine (Free Fit/Diagnostics Dev schemas, pricing recommendation, proposal draft+BL-C1 lock, E2E service tests). Honest req status corrections (config≠UI). Coverage 50.4%→44.8%. **No Production / no merge.** |
| 2026-08-11 | Sprint 3 (Dev): Revenue OS conversion path — Free Fit vs Paid Diagnostic, pricing recommendation (V2 new-client / legacy protected), proposal draft+internal approval (BL-C1 blocks send), FitAssessments/Diagnostics Dev schemas, 29 unit tests. Coverage 46.4%→50.4%. **No Production changes.** |
| 2026-08-11 | Owner ADR-BA-V2-002: CR accepted; V2 rate card CURRENT for new clients; Free Fit Assessment policy; BL-C1/Track1/ACCG confirmed; HVF deferred. Sprint 2 commit `16609c4`. |
| 2026-08-11 | BA V2 Sprint 2: requirements traceability ledger (125 reqs) + coverage report; commercial class/offer/pricing schema wiring; diagnostics, offer grid/decision engine, three proposal templates, compliance library, commercial playbook, progressive validation tests. **No Production changes.** |
| 2026-08-11 | Opened [CR-HVCG-BA-V2-001](ChangeRequests/CR-HVCG-BA-V2-001.md): HVCG Business Architecture V2 integration. Added canonical [BUSINESS/HVCG_BUSINESS_ARCHITECTURE_V2.md](BUSINESS/HVCG_BUSINESS_ARCHITECTURE_V2.md), [Impact Analysis](Reports/HVCG_V2_IMPACT_ANALYSIS_2026-08-11.md), `config/business/*` catalog/pricing/migration seeds, Dev-only list schemas, foundation unit tests. Documented Absolute GO vs Jul-19 CURRENT_STATE discrepancy. **No Production changes.** |
| 2026-07-19 | Master PM program audit: refreshed CURRENT_STATE / ROADMAP / NEXT_ACTIONS / indexes; designated Elite Integration **RC1** as release SoR; Revenue S4 marked COMPLETE (Dev/Staging); QBO tip recorded as unmerged; [EXECUTIVE_PROGRAM_STATUS_2026-07-19](Reports/EXECUTIVE_PROGRAM_STATUS_2026-07-19.md) published. |
| 2026-07-16 19:01 UTC | Created pre-Sprint 4 [Release Candidate RC-1](Releases/Release_Candidate_RC-1.md): Revenue/Atlas/Track 1 immutable refs verified; dirty worktrees documented and excluded; Sprint 4 READY TO START / NOT STARTED (superseded for Sprint 4 status by 2026-07-19 audit). |
| 2026-07-16 04:20 UTC | Revenue Systems Engineer COMPLETE; Sprint 1–3 complete at `origin/cursor/revenue-sprint3-conversion` @ `0073bf49411408cced88873805b432bce4eefb31`; Track 1 frozen; Sprint 4 ready/not started. |
| 2026-07-16 (validation) | Path/timestamp/ownership consistency fixes per [VALIDATION_REPORT.md](VALIDATION_REPORT.md). |
| 2026-07-16 04:10 UTC | Created `PROJECT_ATLAS/` as permanent project brain (docs only). |

## Platform milestones (evidence-backed; not exhaustive)

| Milestone | Evidence |
|-----------|----------|
| RC-1 Development Baseline | `releases/RC-1-Development-Baseline/version.json` · commit `0f8d8eb` |
| GL-0 Prod env + SP sites | Deployment Engineer handoff · COMPLETE |
| Track 1 Live — Internal (**FROZEN**) | Tag `Track-1-Live-Internal` @ `302615956cea80c238172931f5901792f548f59c` |
| Sprint 1 EVA → Dev CRM | Smoke LeadId=13 → OppId=18 · `deployment/reports/checkpoints/eva-dev-smoke-20260715-203045.json` |
| Sprint 2–3 EVA + conversion | `origin/cursor/revenue-sprint3-conversion` @ `0073bf49411408cced88873805b432bce4eefb31` |
| Revenue Systems Engineer | **COMPLETE** @ `0073bf49411408cced88873805b432bce4eefb31` |
| Agent communications bus | `cursor/agent-communications` lineage |

Longer product history: root `CHANGELOG.md`, `releases/v1.0.0`, `releases/v1.1.0`.
