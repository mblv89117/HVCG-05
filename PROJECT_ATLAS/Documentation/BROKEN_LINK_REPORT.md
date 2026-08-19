# Project Atlas Broken Link Report

| Field | Value |
|---|---|
| Purpose | Record internal-link and referenced-evidence integrity findings |
| Owner | Documentation & Knowledge Manager |
| Status | IN REVIEW |
| Last verified | 2026-07-16 |
| Scope | 65 Markdown files in authoritative `PROJECT_ATLAS/` plus this proposed package |

## Result

| Check | Result |
|---|---|
| Authoritative Atlas relative Markdown links | **0 known broken** in latest repository validation |
| Temporary links to `VALIDATION_REPORT.md` | Resolved by existing report |
| New `Documentation/` package relative links | Structured to remain within this folder; QA re-scan required after promotion |
| Referenced external worktree paths | Mixed: valid cross-worktree evidence plus known drift |
| External URLs | Not opened; treated as mocked |

## Stale destination content

Relative links may resolve while their destination is stale. The current pass found:

- `Sprints/README.md` links correctly but says Sprint 4 is `NOT STARTED`, contradicting current authority.
- `Releases/Release_Candidate_RC-1.md` links correctly but is a historical pre-Sprint 4 checkpoint and needs a prominent banner.
- The existing `VALIDATION_REPORT.md` link is valid, but its no-contradiction verdict is superseded by [CONTRADICTION_REPORT.md](CONTRADICTION_REPORT.md).

## Known reference defects or drift

| Reference | Finding | Canonical replacement/action |
|---|---|---|
| Bare `releases/Track-1-Live-Internal/` | Does not exist on main checkout | Use deployment-engineer worktree freeze package |
| Root `deployment/release-ops/GO_LIVE_STATUS.md` | Missing on main | Use deployment-engineer worktree path |
| Root `docs/deployment/DEPLOYMENT_ENGINEER_HANDOFF.md` | Missing on main | Use deployment-engineer worktree path |
| Master PM go-live status | Exists but stale relative to Track 1 freeze | Prefer Deployment Engineer freeze/status evidence |
| `.agent-comms/registry.json` CRM ownership | Exists but stale | Prefer `PROJECT_ATLAS/OWNERSHIP.md` plus live worktree list |
| Historical `.worktrees/revenue-sprint3/...` shorthand | Ambiguous if copied outside repository | Qualify branch/commit in material references |

## Link policy

- Relative links within authoritative Atlas are required.
- Cross-worktree paths must include owning worktree and branch/commit when material.
- A moved document leaves a deprecation stub or receives all inbound-link updates in the same documentation change.
- External URLs are never considered validated by a documentation-only review.

## QA validation requested

1. Re-run relative-link resolution after placing this folder under authoritative `PROJECT_ATLAS/`.
2. Verify each external worktree path against the QA checkout.
3. Flag absolute workstation paths as non-portable unless diagnostic-only.
4. Confirm every `SUPERSEDED` or `DEPRECATED` document links to its replacement.

