# Project Atlas Developer Guide

| Field | Value |
|---|---|
| Purpose | Define the safe documentation-first workflow for Atlas implementation tracks |
| Audience | Developers and specialist agents |
| Owner | Documentation & Knowledge Manager |
| Status | IN REVIEW |
| Last verified | 2026-07-16 |

## Before work

1. Read `PROJECT_ATLAS/CONTINUATION/STARTUP_SEQUENCE.md`.
2. Read `CURRENT_STATE.md`, `ACTIVE_SPRINT.md`, `OWNERSHIP.md`, and the assigned Track/Sprint page.
3. Verify the dedicated branch/worktree and ownership boundary.
4. Treat external dependencies as mocked until an approved track provides an interface and QA evidence.
5. Confirm that Production, public DNS, outbound contact, and payment integrations remain gated unless explicitly approved.

## During work

- Make additive changes in the assigned workspace.
- Never edit another agent’s workspace or branch.
- When another track is required, create an interface specification containing:
  - owner and consumer;
  - inputs and outputs;
  - schema/version;
  - success and failure behavior;
  - security and approval gates;
  - mocked test behavior;
  - acceptance evidence required.
- Preserve completed work unless an approved change request authorizes modification.
- Keep status scoped to its environment.

## Documentation expected from a track

| Artifact | Minimum content |
|---|---|
| Architecture/interface | Boundaries, dependencies, data flow, non-mutations |
| Acceptance criteria | Testable statements and environment |
| Test/QA report | Commands or evidence, result, limitations |
| Handoff | Branch, commit/state, changed paths, blockers, next action |
| Release notes | User/operator impact, migrations, rollback, known issues |
| Atlas proposal | Exact canonical files that need updating |

## Before handoff

1. Verify links and cited paths.
2. Confirm no secrets or client data were added.
3. Separate implementation facts from proposals.
4. Update the track-local handoff; do not overwrite authoritative Atlas.
5. Await QA and Atlas owner promotion.

## Existing implementation references

- Repository layout and setup: root `README.md`.
- Architecture: root `ARCHITECTURE.md`, `docs/architecture/`, `docs/data-model/`.
- Agent protocols: `docs/agents/`.
- Release and deployment artifacts: `releases/`, deployment-engineer worktree.
- Atlas interfaces: [API_CATALOG.md](API_CATALOG.md).

