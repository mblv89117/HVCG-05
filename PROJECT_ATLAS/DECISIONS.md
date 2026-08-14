# DECISIONS

**As of:** 2026-08-14 20:25 UTC  
**Gate 11 owner decisions (authoritative for business architecture):** [Decisions/2026-08-14-GATE11-OWNER-DECISIONS.md](Decisions/2026-08-14-GATE11-OWNER-DECISIONS.md)  
**Chronological log:** [CONTINUATION/DECISION_HISTORY.md](CONTINUATION/DECISION_HISTORY.md)  
**Historical owner-interrupt file:** `.worktrees/master-pm-orchestrator/docs/business-launch/OWNER_DECISIONS.md`

## Closed — Gate 11 owner decisions (2026-08-14)

These five decisions supersede older business assumptions that conflict with them (including treating Dynamics as Atlas V1 SoR, treating GCC as HVCG internal accounting, or treating Client 360 mapping as an audit blocker).

| ID | Outcome |
|----|---------|
| OD-G11-1 | Audit finish line approved: architecture/security/SoR/seven systems/governed Atlas production; duplicate infra has a retirement **path** (do not execute). Commercial launches are **after** the audit. |
| OD-G11-2 | GCC = commercial CFO / financial-intelligence product; own app/data boundary; HVCG may be a tenant. |
| OD-G11-3 | Atlas V1 SoR = SharePoint `HVCG_*` for CRM/clients/projects/tasks/HVCG finance ops. **No** Dynamics/Dataverse migration. |
| OD-G11-4 | G11-F03: **Manny only** across the seven `HVCG-Client-*` groups. Do not infer other users. |
| OD-G11-5 | Client 360 mapping deferred, fail-closed, not an audit blocker. Do not invent mappings. |

## Closed (repository-backed, earlier)

| ID | Outcome | Source |
|----|---------|--------|
| BL-P1 | HVCG new-client rate card canonical v1 | OWNER_DECISIONS |
| RC-1 | Dev baseline frozen | `releases/RC-1-Development-Baseline/` |
| BL-ACCG-PRICE | Keep ACCG legacy Access Plus **$4,539/mo**; do not apply MSA $12.5k or HVCG $6k drafts | OWNER_DECISIONS |
| BL-ACCG-CLASS | HVS_LEGACY_CLIENT · High Value Solution LLC | OWNER_DECISIONS |
| BL-W1-STAGING | Staging website testing approved; public still gated | OWNER_DECISIONS |
| GL-0 | Prod env + Prod SharePoint sites complete | `.worktrees/deployment-engineer/docs/deployment/DEPLOYMENT_ENGINEER_HANDOFF.md` |
| Track 1 Live — Internal | Historical Dynamics CRM slice frozen LIVE—INTERNAL (not Atlas V1 SoR) | Track-1-Live-Internal |
| D-004 | Agent Comms tip `2c064b3` is SoR; no rebuild/fork without owner | `.agent-comms` bus messages (canonical-bus-lock) |

## Open gates (not core-audit blockers)

| ID | Ask | Blocks |
|----|-----|--------|
| Gate 12 | Controlled worktree/workspace retirement | **NOT STARTED** |
| Client 360 mapping | Trusted source-container → ClientCode | Post-audit feature only |
| BL-GRAPH-1 | Graph read-only (optional) | Optional enrichment |
| BL-PNP-1 | PnP for SP Comm Site provision | Some SharePoint automation |
| BL-C1 | Any outbound client contact / portal invite | Collections send, invites |
| BL-F1 | Mercury/Stripe/bank connections | Payment automation |
| BL-PUBLISH-1 / GL-PUBLISH-1 | Public website DNS/publish | Public launch |
| D-002 / OA-CRM-09 | Canvas build/publish in Maker | Canvas app |
| FCFO/Exit/Acq/Model price cards | OWNER REVIEW REQUIRED | Full SKU pricing in conversion |
| Production env GitHub reviewers | Not invented | Residual on `production` environment |

## Standing hard rules (LOCKED)

- Never contact a client automatically without Manny approval
- Never change existing-client pricing
- Never publish website publicly without BL-PUBLISH-1
- Collections / reminders / follow-ups = draft + approval queue only
- Do not add anyone except Manny to `HVCG-Client-*` groups without a new owner roster
- Do not invent Client 360 mappings
- Do not initiate Dynamics/Dataverse for Atlas V1
- Do not promote `integration/atlas-canonical` to `main` without separate authorization
- Do not weaken BA/Hub authentication
