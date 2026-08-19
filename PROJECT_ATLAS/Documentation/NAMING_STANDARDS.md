# Project Atlas Naming Standards

| Field | Value |
|---|---|
| Purpose | Standardize document, identifier, status, and link names |
| Owner | Documentation & Knowledge Manager |
| Status | IN REVIEW |
| Last verified | 2026-07-16 |

## Files

- Canonical cross-project documents: uppercase snake case, for example `CURRENT_STATE.md`.
- Numbered entities: canonical noun plus number, for example `Sprint4.md`, `Track2_RevenueOS.md`.
- Role handbooks: PascalCase role, for example `DeploymentEngineer.md`.
- Release records: descriptive name with stable release ID, for example `Release_Candidate_RC-1.md`.
- Reports and handoffs: `<Subject>_<Milestone>.md`; include date only when multiple records can exist for the same milestone.
- Indexes: `<DOMAIN>_INDEX.md` at root or `README.md` inside a folder.

Do not create `final`, `final2`, `latest`, `new`, or case-only variants.

## Identifiers

| Entity | Format | Example |
|---|---|---|
| Decision | `DEC-NNNN` | `DEC-0013` |
| Documentation debt | `DOC-DEBT-NNN` | `DOC-DEBT-001` |
| Release candidate | `RC-N` | `RC-1` |
| Business/owner gate | Existing registered ID | `BL-C1`, `D-002` |
| Track | `Track N` | `Track 2` |
| Sprint | `Sprint N` | `Sprint 4` |

Identifiers are immutable. When replaced, retain the old ID and link to the replacement.

## Status language

Use exact, scoped values:

- `NOT STARTED`
- `IN PROGRESS`
- `BLOCKED`
- `COMPLETE (Development)`
- `COMPLETE (Dev/Staging)`
- `READY FOR QA`
- `FROZEN — LIVE—INTERNAL`
- `RELEASED`

Always name the environment. “Complete” without scope is prohibited.

## Links and references

- Link text describes the destination; avoid “click here.”
- Use relative links inside Atlas.
- Cross-worktree references must include worktree, branch, and commit when material.
- Commands, paths, branch names, commit hashes, environment names, and identifiers use backticks.
- URLs are documented as external dependencies and must not be used by this documentation review.

## Terminology

- Project name: **Project Atlas** or `PROJECT_ATLAS`.
- Product: **HVCG OS** when referring to the Microsoft 365 / Power Platform system.
- Status authority: **source of truth (SoR)** on first use.
- Production: capitalize when referring to the environment.
- Development and Staging: capitalize when referring to environments.

