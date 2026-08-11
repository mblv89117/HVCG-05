# DECISIONS

**As of:** 2026-08-11 (Owner Decisions ADR-BA-V2-002)  
**Detail SoR:** `.worktrees/master-pm-orchestrator/docs/business-launch/OWNER_DECISIONS.md`  
**Also:** Track-1 gates in `.worktrees/deployment-engineer/releases/Track-1-Live-Internal/README.md`  
**BA V2:** [ChangeRequests/CR-HVCG-BA-V2-001.md](ChangeRequests/CR-HVCG-BA-V2-001.md) · [ADR-BA-V2-002](Decisions/ADR-BA-V2-002-owner-decisions-2026-08-11.md)

## Closed this cycle (Owner 2026-08-11)

| ID | Outcome | Source |
|----|---------|--------|
| **BA-V2-CR-ACCEPT** | CR-HVCG-BA-V2-001 → **OWNER_ACCEPTED / DEVELOPMENT_AUTHORIZED** | Owner directive |
| **BA-V2-RATE-ACTIVATE** | `HVCG-PRICE-2026-08-11-v2` = **CURRENT for new HVCG clients**; BL-P1/v1 preserved as **HISTORICAL** | Owner directive |
| **BA-V2-PAID-DIAG** | SKU-FRA FREE retained as **Free Fit & Readiness Assessment** (qualification only); substantive work → paid diagnostics | Owner directive |
| **BA-V2-LEGACY** | No automatic legacy reprice; ACCG $4,539/mo remains protected | Owner directive |
| **BA-V2-BL-C1** | BL-C1 confirmed — no autonomous external contact | Owner directive |
| **BA-V2-TRACK1** | Track 1 confirmed **FROZEN — LIVE—INTERNAL** | Owner directive |
| **BA-V2-HVF** | High Value Founder remains **DEFERRED_OWNER_GATE** (prepare only) | Owner directive |
| **BA-V2-HR** | HR is supporting capability / premium special project — not 8th public service line | Owner directive |

## Proposed / pending

| ID | Ask | Conflict with | Recommended reconciliation |
|----|-----|---------------|----------------------------|
| Per-client reprice | Migrate any legacy retainer to V2 ranges | `BL-ACCG-PRICE` | Contracted vs Recommended display only; reprice requires agreement |
| HVF public launch | Publish High Value Founder | BA-V2-HVF | Separate owner authorization |

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

## Open gates

| ID | Ask | Blocks |
|----|-----|--------|
| BL-GRAPH-1 | Graph read-only (optional) | Optional enrichment |
| BL-PNP-1 | PnP for SP Comm Site provision | Some SharePoint automation |
| BL-C1 | Any outbound client contact / portal invite | Collections send, invites |
| BL-F1 | Mercury/Stripe/bank connections | Payment automation |
| PROD-1 / further Prod writes | Any additional Production deploy beyond freeze | Extra flows, imports |
| BL-PUBLISH-1 / GL-PUBLISH-1 | Public website DNS/publish | Public launch |
| D-002 / OA-CRM-09 | Canvas build/publish in Maker | Canvas app |
| Sprint 3 commit | **CLOSED** — `0073bf49411408cced88873805b432bce4eefb31` on `origin/cursor/revenue-sprint3-conversion` | Sprint 2–3 landed |
| Sprint 4 start | Explicit assignment | Conversion activation |
| FCFO/Exit/Acq/Model price cards | OWNER REVIEW REQUIRED | Full SKU pricing in conversion |

## Standing hard rules (LOCKED)

- Never contact a client automatically without Manny approval  
- Never change existing-client pricing  
- Never publish website publicly without BL-PUBLISH-1  
- Collections / reminders / follow-ups = draft + approval queue only  
- Track 1 freeze gates: no extra flows, no canvas, Teams notify Off, client emails Off, no pilot import, no DNS  

## Decision log folder

Future ADRs: [Decisions/](Decisions/) — prefer linking to OWNER_DECISIONS over copying full text.
