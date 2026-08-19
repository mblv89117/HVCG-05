# Project Atlas Documentation Standards

| Field | Value |
|---|---|
| Purpose | Define evidence, metadata, lifecycle, review, and deduplication rules |
| Owner | Documentation & Knowledge Manager |
| Status | IN REVIEW |
| Last verified | 2026-07-16 |
| Related | [MASTER_INDEX.md](MASTER_INDEX.md), [FOLDER_STANDARDS.md](FOLDER_STANDARDS.md), [NAMING_STANDARDS.md](NAMING_STANDARDS.md) |

## Required metadata

Every new or materially revised Atlas document must state:

- title;
- purpose;
- audience or owner;
- status;
- last verified date;
- evidence source (path, branch, commit, report, or decision);
- related canonical documents;
- known limitations or assumptions;
- material change history.

## Status vocabulary

`DRAFT`, `IN REVIEW`, `VERIFIED`, `RELEASED`, `STALE`, `DEPRECATED`, `ARCHIVED`.

Do not use “complete,” “live,” “deployed,” or “Production” as documentation status. Those are implementation claims and require evidence.

## Evidence rules

1. Repository evidence outranks chat history.
2. `PROJECT_ATLAS/CURRENT_STATE.md` owns current status.
3. Decisions must retain history; replace with a new decision ID rather than rewriting old reasoning.
4. Architecture detail remains in root `ARCHITECTURE.md`, `docs/architecture/`, `docs/data-model/`, and release freeze packages. Atlas links to those sources.
5. Development or Staging behavior must not imply Production availability.
6. External systems are treated as mocked unless a cited acceptance/deployment report proves otherwise.
7. Never include credentials, tokens, confidential tenant data, or client-sensitive records.
8. Commands that can deploy or mutate an environment must carry a safety warning and point to an approved runbook.

## Deduplication rule

Use one canonical document per fact class:

| Fact class | Canonical source |
|---|---|
| Current state | `CURRENT_STATE.md` |
| Startup workflow | `CONTINUATION/STARTUP_SEQUENCE.md` |
| Next work | `NEXT_ACTIONS.md` |
| Track status | `TRACK_INDEX.md` plus one Track page |
| Sprint status | `SPRINT_INDEX.md` plus one Sprint page |
| Agent ownership | `AGENT_ASSIGNMENTS.md` and `OWNERSHIP.md` |
| Decisions | `DECISIONS.md` index plus `CONTINUATION/DECISION_HISTORY.md` history |
| Architecture | External architecture SoR; Atlas `ARCHITECTURE.md` is an index |
| Release status | `RELEASES.md` plus one release package |

Scoped documents may summarize a canonical fact in one sentence and must link back. They must not maintain an independent status table.

## Review workflow

1. Identify the owning track and canonical source.
2. Cite implementation or report evidence.
3. Draft additively in an isolated worktree.
4. Check links, metadata, terminology, status, and sensitive content.
5. Route architecture facts to the System Architect and release facts to QA/Release.
6. Mark `VERIFIED` only after the owner and QA accept the evidence.
7. Archive superseded documents with a replacement link; never silently delete decision history.

## Review intervals

| Document class | Review trigger |
|---|---|
| Current state / active sprint | Every control-point change |
| Release and deployment | Every release |
| Architecture | Every approved architecture change |
| Track / sprint / handoff | Every milestone |
| User and operations guides | Every behavior-affecting release |
| SOPs | Every process change or 90 days |
| Indexes and cross-references | Every added, moved, or archived document |

