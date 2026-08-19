# DECISIONS

**As of:** 2026-07-17 01:54 UTC
**Detail SoR:** `.worktrees/master-pm-orchestrator/docs/business-launch/OWNER_DECISIONS.md`
**Also:** Track-1 gates in `.worktrees/deployment-engineer/releases/Track-1-Live-Internal/README.md`

## Closed (repository-backed)

| ID | Outcome | Source |
|----|---------|--------|
| BL-P1 | HVCG new-client rate card canonical v1 | OWNER_DECISIONS |
| RC-1 | Dev baseline frozen | `releases/RC-1-Development-Baseline/` |
| BL-ACCG-PRICE | Keep ACCG legacy Access Plus **$4,539/mo**; do not apply MSA $12.5k or HVCG $6k drafts | OWNER_DECISIONS |
| BL-ACCG-CLASS | HVS_LEGACY_CLIENT · High Value Solution LLC | OWNER_DECISIONS |
| BL-W1-STAGING | Staging website testing approved; public still gated | OWNER_DECISIONS |
| GL-0 | Prod env + Prod SharePoint sites complete | `.worktrees/deployment-engineer/docs/deployment/DEPLOYMENT_ENGINEER_HANDOFF.md` |
| Track 1 Live — Internal | Prod CRM slice frozen LIVE—INTERNAL | Track-1-Live-Internal |
| D-004 | Agent Comms tip `2c064b3` is SoR; no rebuild/fork without owner | `.agent-comms` bus messages (canonical-bus-lock) |
| DEC-0014 | Track 9 EOS Sprint 1 approved with minor changes; DEF-EOS-001 through DEF-EOS-005 accepted for EOS Sprint 2; feature-branch commit/push authorized only | `CONTINUATION/DECISION_HISTORY.md` |
| DEC-0015 | Track 9 EOS Sprint 2 start approved (Dev only); commit/push gated on QA + owner; no merge/deploy/live comms | `CONTINUATION/DECISION_HISTORY.md` |
| DEC-0016 | Track 9 EOS Sprint 2 release approved; commit/push completed @ `e7bb1a3`; no merge/deploy/Sprint 3 | `CONTINUATION/DECISION_HISTORY.md` |
| DEC-0017 | Atlas CEO Command Center assigned to Track 7 as Executive Command Center Sprint 2; Development/UAT only; stop uncommitted for QA/owner review | `CONTINUATION/DECISION_HISTORY.md` |

## Open gates

| ID | Ask | Blocks |
|----|-----|--------|
| CEO-CC-S2 | QA/owner approval and separate feature-branch commit/push authorization | CEO Command Center release |
| BL-GRAPH-1 | Graph read-only (optional) | Optional enrichment |
| BL-PNP-1 | PnP for SP Comm Site provision | Some SharePoint automation |
| BL-C1 | Any outbound client contact / portal invite | Collections send, invites |
| BL-F1 | Mercury/Stripe/bank connections | Payment automation |
| PROD-1 / further Prod writes | Any additional Production deploy beyond freeze | Extra flows, imports |
| BL-PUBLISH-1 / GL-PUBLISH-1 | Public website DNS/publish | Public launch |
| D-002 / OA-CRM-09 | Canvas build/publish in Maker | Canvas app |
| Sprint 3 commit | **CLOSED** — `0073bf49411408cced88873805b432bce4eefb31` on `origin/cursor/revenue-sprint3-conversion` | Sprint 2–3 landed |
| Sprint 4 start | **CLOSED** — owner assigned Automated Sales Engine 2026-07-16 | COMPLETE Dev/Staging @ `7e4eb10` |
| FCFO/Exit/Acq/Model price cards | OWNER REVIEW REQUIRED | Full SKU pricing in conversion |

## Standing hard rules (LOCKED)

- Never contact a client automatically without Manny approval
- Never change existing-client pricing
- Never publish website publicly without BL-PUBLISH-1
- Collections / reminders / follow-ups = draft + approval queue only
- Track 1 freeze gates: no extra flows, no canvas, Teams notify Off, client emails Off, no pilot import, no DNS

## Decision log folder

Future ADRs: [Decisions/](Decisions/) — prefer linking to OWNER_DECISIONS over copying full text.
