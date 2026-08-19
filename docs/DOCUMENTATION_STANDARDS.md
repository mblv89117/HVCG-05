# Documentation Standards

| Field | Value |
|-------|--------|
| Title | Documentation Standards |
| Purpose | Define authorship, evidence, status, and review rules for HVCG project knowledge |
| Audience | All agents; contributors |
| Owner | docs |
| Status | DRAFT |
| Last verified | 2026-07-15 |
| Source | `cursor/documentation-knowledge-manager` @ inventory |
| Related | [INDEX](INDEX.md), [DOCUMENTATION_MAP](DOCUMENTATION_MAP.md), [GLOSSARY](GLOSSARY.md) |
| Known limitations | Standards not yet applied retroactively to all module docs |

## Required header (every document)

| Field | Required | Notes |
|-------|----------|-------|
| Title | Yes | H1 matches filename purpose |
| Purpose | Yes | One sentence |
| Audience | Yes | Role or agent |
| Owner | Yes | `docs`, `architect`, module agent id, or `master-pm` |
| Status | Yes | See statuses below |
| Last verified | Yes | ISO date `YYYY-MM-DD` |
| Source branch / commit | When material | Cite branch or short hash |
| Related documents | Yes | Links to authoritative peers |
| Known limitations | Yes | Or "None" |
| Change history | When material | Bullet list of material edits |

## Document statuses

| Status | Meaning |
|--------|---------|
| DRAFT | Authoring in progress; not authoritative |
| IN REVIEW | Sent to owning reviewer (architect / integration / master-pm) |
| VERIFIED | Checked against repository evidence by docs |
| RELEASED | Aligned to a shipped release version |
| STALE | Diverged from evidence or past review interval |
| DEPRECATED | Superseded; keep for history with pointer |
| ARCHIVED | Moved under `docs/ARCHIVE/` |

## Evidence rules

1. Do **not** document a capability as complete unless verified via code, tests, reports, or an approved handoff.
2. Label proposed designs **PROPOSED**.
3. Label incomplete work **IN PROGRESS**.
4. Label Development-only behavior **DEVELOPMENT**.
5. Do **not** imply Production availability unless Production deployment is verified.
6. Cite file paths, commit hashes, report paths, or ADRs for internal docs when useful.
7. Prefer concise summaries with links to authoritative detailed documents.
8. Never store credentials, tokens, secrets, or client-sensitive data in documentation.

## Staleness triggers

A document is **STALE** if any of the following is true:

- Referenced files no longer exist
- Named branches changed without doc update
- Commands no longer work
- Environment names changed
- Release versions diverged
- Implementation changed without doc update
- Tests contradict the document
- An ADR supersedes the document
- Last verification exceeds the review interval

## Review intervals

| Class | Interval |
|-------|----------|
| Active release docs | Every material change |
| Deployment docs | Every release |
| Architecture docs | Every major design change |
| Module docs | Every module milestone |
| SOPs | Every 90 days or process change |
| User guides | Every release affecting behavior |

## Ownership boundaries

| Domain | Owner agent | Paths (authoritative) |
|--------|-------------|----------------------|
| Program status / roadmap | master-pm | `MASTER_*.md` (master-pm worktree) |
| Architecture / ADRs | architect | `docs/architecture/`, `docs/data-model/` |
| QA / release verdicts | integration | `docs/qa/`, `docs/release/`, `QA_*.md`, `RELEASE_*.md` |
| Module implementation docs | module agents | `docs/<module>/` in module worktrees |
| Navigation, glossary, standards, debt | docs | See registry `ownedPaths` for `docs` |

## Publishing workflow

1. Detect implementation changes.
2. Identify affected documents.
3. Request missing facts via `.agent-comms/` (`REQUEST` to owning agent).
4. Draft or update documentation on `cursor/documentation-knowledge-manager`.
5. Verify against repository evidence.
6. Technical docs → architect review.
7. Release docs → integration review.
8. Business-facing docs → master-pm alignment.
9. Mark **VERIFIED** only after evidence review.
10. Send `HANDOFF` when documentation is release-ready.

## SOP minimum sections

purpose, owner, prerequisites, permissions required, step-by-step procedure, expected result, validation, common errors, rollback or recovery, escalation path, related systems, revision history.

## Troubleshooting article minimum sections

symptom, likely cause, confirmation steps, safe fix, unsafe actions to avoid, logs or evidence to collect, escalation path, related known issues.

## Change history

- 2026-07-15 — Initial draft from docs steward mandate; not yet retroapplied.
