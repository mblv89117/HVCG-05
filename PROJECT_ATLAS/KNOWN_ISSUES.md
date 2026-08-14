# KNOWN_ISSUES

**As of:** 2026-08-14 21:00 UTC

## Current (post Gate 11 / Command Center recovery)

| Issue | Status | Notes |
|-------|--------|-------|
| Command Center “SharePoint PM permission or token was rejected” | **FIXED in production Hub/Elite** — owner signed-in smoke pending | Graph `fields/` `$filter` + `Lists.SelectedOperations.Selected` → 403. Hub lists without `$filter`; entitlement filter is in-memory. Live Hub `/health` `pmBackend.mode=sharepoint`. |
| Website leads stay `atlasSyncStatus=pending` | **FIXED** | Hub `POST /api/website/leads` live. SWA `ATLAS_INTAKE_URL` set. Buffered recovery rows replayed to `synced`. |
| Quick Capture / Initialize / Microsoft sync / Archive | **Honest-disabled** | Production SharePoint MVP returns `501 PM_OPERATION_NOT_IMPLEMENTED`. Elite no longer presents them as working. |
| Client 360 source-container → ClientCode mapping | **DEFERRED POST-AUDIT FEATURE** | Fail-closed in `apps/atlas-integration-api/src/client360/access.ts`. Not an audit blocker. |
| Gate 12 worktree/workspace retirement | **NOT STARTED** | Path exists; do not execute from Gate 11 |
| GitHub `production` environment required reviewers | Residual | Not invented; `mblv89117` GitHub profile has no name/email to uniquely bind to Manny |
| Default GitHub branch `cursor/v1.1.0-intelligence-ai-ops` | Residual | Not changed; `main` is protected |
| Hub TS2367 `pm/http.ts:361` | Historical debt | Classified in `scripts/ci/hub-typecheck-gate.mjs`; new type errors still fail CI |
| Hub delegated Microsoft OAuth redirect mismatch (G11-F10) | Deferred non-blocking | Production PM uses managed identity |
| QBO app not in canonical | Preserved on `cursor/quickbooks-integration` | Not merged |
| Employee-to-client roster (non-Manny) | Not authorized | Do not infer |

## Historical blockers / open gates (July 2026 — not Atlas V1 SoR)

These remain as historical product/process items. They do **not** reopen Gate 11.

| Issue | Status | Evidence |
|-------|--------|----------|
| Canvas unpublished | D-002 / OA-CRM-09 | RC-1 acceptance; Deployment Engineer handoff |
| Pilot client import | NOT STARTED / BLOCKED | GO_LIVE_STATUS Track 2 |
| Public website / DNS | NOT STARTED | BL-PUBLISH-1 |
| Client outbound / portal invite | Open BL-C1 | OWNER_DECISIONS |
| Soft UAT conversion CTA copy | Human QA pending | Revenue handoff |
| Fractional CFO / Exit / Acquisition / Modeling prices | OWNER REVIEW REQUIRED | Revenue handoff |
| Second phone `725.577.6511` routing | Undefined vs `702.906.6444` | Revenue handoff |

## Documentation drift

July 16 Atlas status files treated Dynamics Track-1 as current production. Prefer [CURRENT_STATE.md](CURRENT_STATE.md) and Owner Decision 3 (SharePoint `HVCG_*` is Atlas V1 SoR). Historical copies: [Archive/](Archive/).
