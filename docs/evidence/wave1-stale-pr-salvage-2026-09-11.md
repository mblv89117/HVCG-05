# Wave 1 Lane C — Stale PR Salvage Audit

- **Generated:** 2026-09-11T04:49:16Z
- **Baseline:** `production/atlas-core` @ `4a7e5f75ca2c740e44de4854bdf4ac7343f0bce6`
- **Repository:** `mblv89117/HVCG-05`
- **Open PRs examined:** 179

## Method

Enumerated all open PRs via gh; compared each head to production/atlas-core using ancestry (merge-base --is-ancestor) and limited git cherry (baseline head base) for patch-equivalence of base..head commits. Classified KEEP|SALVAGE|SUPERSEDED|CLOSE|RETIRE_LATER. Did not merge any draft chains. Auto-close limited to a small subset of draft SUPERSEDED PRs with fullyContainedInBaseline=true.

- Tools: `gh pr list`, `git merge-base --is-ancestor`, limited `git cherry`, `git log base..head`.
- **Do not merge** historical draft chains.
- No open PRs currently target `production/atlas-core` (1 draft targets `main`).

## Summary counts

| Classification | Count |
|---|---|
| KEEP | 1 |
| SALVAGE | 6 |
| SUPERSEDED | 104 |
| CLOSE | 1 |
| RETIRE_LATER | 67 |

- uniqueValueUnresolved: **74**
- safeToClose marked: **102** (auto-close limited to small subset)
- auto-close selected: [204, 203, 202, 201, 193, 192, 191, 190, 189, 188, 186, 185]

## KEEP

- #51 — Add Atlas agentic operations foundation (base `cursor/v1.1.0-intelligence-ai-ops`)

## SALVAGE

- #3 — DRAFT — DO NOT MERGE OR DEPLOY: Atlas Local AI Operations (Phases 1–5A + 6A/6B Website Studio) (base `main`, head `feature/atlas-lo…`)
- #7 — docs(red-team): Independent platform security findings 2026-08-20 (base `cursor/v1.1.0-intelligence-ai-ops`, head `cursor/platform-…`)
- #8 — Platform integration contracts: directive 8 icp-studio.v1 + outbound-dispatch.v1 (base `cursor/atlas-hv-completion-52d1`, head `cursor/platform-…`)
- #9 — perf(atlas): Search/Command-K latency P2 + date/Draft polish (base `cursor/atlas-hv-completion-52d1`, head `cursor/atlas-sea…`)
- #10 — Revenue OS D7 certification (synthetic + Premium) (base `cursor/atlas-hv-completion-52d1`, head `cursor/atlas-rev…`)
- #19 — Client knowledge operationalization (BU-P1) — ledger + Atlas metadata (base `cursor/v1.1.0-intelligence-ai-ops`, head `cursor/client-kn…`)

## CLOSE (manual; not auto-closed)

- #155 — Deployment lease guard + client onboarding automation

## SUPERSEDED (sample / auto-close set)

104 draft PRs fully contained in or patch-equivalent to production. Auto-close subset:

- #204 — KEEP_DRAFT: onboarding operations-handoff reconcile after entitled reuse or create
- #203 — KEEP_DRAFT: record onboarding owner attention only after entitled reuse or create returns an id
- #202 — KEEP_DRAFT: Restack onboarding blocker reconcile onto fa35b1c
- #201 — KEEP_DRAFT: Restack onboarding kickoff reconcile onto 36bfea3
- #193 — KEEP_DRAFT: record onboarding capital only after entitled reuse returns ids
- #192 — KEEP_DRAFT: record onboarding comms only after entitled reuse returns ids
- #191 — KEEP_DRAFT: record onboarding milestones only after reuse or create returns an id
- #190 — KEEP_DRAFT: record onboarding agent assignment only after assign returns an id
- #189 — KEEP_DRAFT: create onboarding tasks only when entitled projectId exists
- #188 — KEEP_DRAFT: ATLAS-ONBOARDING-DOCUMENT-RECONCILE-001 documentsReconciled only after reuse or successful create
- #186 — KEEP_DRAFT: ATLAS-ONBOARDING-WORKSPACE-RECONCILE-001 workspaceReconciled only after reuse or successful create
- #185 — KEEP_DRAFT: ATLAS-ONBOARDING-EXECUTE-FAIL-CLOSED-IDENTITY-001 entitled execute blocks project create until HVCG_Clients identity

## RETIRE_LATER

67 stale draft-stack / SharePoint-era PRs with residual cherry-+ commits or mid-chain dependency value. Preserve for tip salvage/rollback reference; do not merge; retire after salvage pass.

## Close actions

Autonomous close attempted for selected SUPERSEDED drafts (`uniqueValueUnresolved=false`, `safeToClose=true`): #204, #203, #202, #201, #193, #192, #191, #190, #189, #188, #186, #185.

**Blocker:** `gh` token lacks PR mutation permission (`403 Resource not accessible by integration` on `closePullRequest` / `addComment`). **Closed: 0.** Manual close of the selected subset is recommended.

Results recorded in JSON `summary.closed` / `summary.closeBlockers`.

Machine-readable report: `docs/evidence/wave1-stale-pr-salvage-2026-09-11.json`
