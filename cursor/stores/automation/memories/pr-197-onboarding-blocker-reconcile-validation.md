# PR #197 independent validation — ATLAS-ONBOARDING-BLOCKER-RECONCILE-001

VALIDATION_STATUS: PASS
DEPLOY: NOT_AUTHORIZED_UNTIL_PARENT_STACK_IS_LIVE
OWNER_ACTIONS: NONE

Validator did not implement PR #197. Validator is not a Supervisor and not a new durable specialist.
KEEP_DRAFT. No zipdeploy. No merge. No Ready. No retarget to v1.1.0. No Elite change. MEMORIES.md / control-plane.md / atlas-agentic-ops.md untouched.

## Identity

| Item | Value |
|------|--------|
| Repo | https://github.com/mblv89117/HVCG-05 |
| PR | https://github.com/mblv89117/HVCG-05/pull/197 (draft, base `cursor/atlas-onboarding-kickoff-reconcile-001`) |
| Candidate | `821482906dddd85e70843227a258fd8b16ee4a82` |
| Branch | `cursor/atlas-onboarding-blocker-reconcile-001` |
| GitHub PR base HEAD now | `7f669dcedb6fcaeb77e4332704d11ba51169e226` (PR #196 head — **not** the earlier validated `ca85cdd`) |
| Earlier validated kickoff parent | `ca85cdd923b9a334806fe7acf25ccfc30a1ab6ae` |
| Capital parent | `e0f19d05e53e2a35dc4353dfea743afc6b9f77cb` (not live) |
| Live Hub | `376fb537c3b073d2f30de199b4e04beed2c9137d` |
| Floor | `ecc357159277bccd76900961fd8e35ed1e7a4df0` |
| Validated at | 2026-08-25T19:34Z |

Checkout: `git checkout --detach 821482906dddd85e70843227a258fd8b16ee4a82` → HEAD matches candidate exactly.

## Ancestry

`git merge-base --is-ancestor <sha> HEAD`

| SHA | Result | Note |
|-----|--------|------|
| `7f669dcedb6fcaeb77e4332704d11ba51169e226` | **NO** | Current GitHub parent / PR #196 head. Docs-only validation commit on top of `ca85cdd`. Not an ancestor of this candidate. |
| `e0f19d05e53e2a35dc4353dfea743afc6b9f77cb` | YES | Capital reconcile parent |
| `376fb537c3b073d2f30de199b4e04beed2c9137d` | YES | Live Hub |
| `ecc357159277bccd76900961fd8e35ed1e7a4df0` | YES | Floor |
| `ca85cdd923b9a334806fe7acf25ccfc30a1ab6ae` | YES | Earlier validated kickoff parent. This is the merge-base with `7f669dce`. |

`7f669dce` vs `ca85cdd` is one file only: `pr-196-onboarding-kickoff-reconcile-validation.md` (+105). This blocker branch forked at `ca85cdd` and was not rebased onto the later PR #196 validation commit.

Lineage on HEAD: floor → live comms `376fb53` → capital `e0f19d05` → kickoff `e8840b4e` / `46a5391b` / `bc6091bd` / `ca85cdd9` → blocker `a155df39` / `51de1879` / `9032ab86` / `82148290`.

## Diff vs GitHub parent `7f669dce`

Three-dot / merge-base (`ca85cdd`…HEAD) is Hub-only. 5 files, +751 / −31. No Elite / static / frontend paths. GitHub PR reports the same 5-file three-dot set.

| Status | Path |
|--------|------|
| M | `apps/atlas-integration-api/src/pm/operatorDesk/clientOnboardingAutomation.ts` |
| M | `apps/atlas-integration-api/src/pm/operatorDesk/onboardingState.ts` |
| M | `apps/atlas-integration-api/tests/hub-client-onboarding-automation.test.ts` |
| M | `apps/atlas-integration-api/tests/hub-onboarding-execute-fail-closed-identity.test.ts` |
| A | `cursor/stores/automation/memories/pr-pending-onboarding-blocker-reconcile.md` |

Two-dot `7f669dce`…HEAD also deletes `pr-196-onboarding-kickoff-reconcile-validation.md` because that docs commit is not in this branch. Product code remains Hub-only. Not a blocker-logic defect; recorded because the GitHub parent is no longer `ca85cdd`.

## blockerReconciled contract

True only after entitled same-scope reuse of blocker/task/attention rows that have a real id, or a create that returned an id.

Observed in `runClientOnboardingAutomation` / `listRelatedBlockersForClient` / `composeBlockerReview`:

- Reuse: list (or discovered same-scope blocker-titled task) filtered by entitled canonical client; rows without id dropped; foreign `clientCode` never attaches.
- Create: `blockerCreate` runs only when not reconciled, not dry-run, and create is provided; `created?.id?.trim()` required; throw / missing id stays false.
- Empty list, list throw, create fail, create no-id, dry-run, wrong-client, missing identity / missing client scope → `blockerReconciled = false`, `relatedBlockers = []`. Nothing fabricated.
- Identity fail-closed record sets `blockerReconciled: false` before project/task/milestone/agent work.
- `composeBlockerReview` forces false when `identityResolutionRequired` or workspace/project missing, even if caller passed foreign refs.
- `communicationPolicy` remains `DRAFT_ONLY`. `send=false`, `outbound=false`, `liveGtmOutbound=false`, `autoRespond=false` (`COMMUNICATIONS_AUTO_RESPOND` / `COMMUNICATIONS_SEND` are `false as const`). `capitalSubmit=false`.
- Ask Atlas reports reused vs reconciled vs not confirmed. No invented blocker / ClientCode / outbound claim.
- Preserved: identity-before-structure, `workspaceReconciled`, `documentsReconciled`, task/agent reconcile-after-id, `milestoneReconciled`, `communicationContextReconciled`, `capitalContextReconciled`, `kickoffReconciled`. Blocker tests leave kickoff/capital/comms/milestone flags false when only blocker is injected (`kickoffList: []` isolation).

Production `handle.ts` / Ask Atlas execute / workflow activate do not inject `blockerCreate`. Live reuse is the existing blocker-titled task package (`discoveredBlockers` / `defaultOnboardingBlockerList`). Optional `blockerCreate` is the governed injection used by tests. Matches “reuse existing blocker-review package; no new blocker product.” Default onboarding task titles do not match `BLOCKER_ITEM_TITLE`, so default kickoff-task create cannot flip `blockerReconciled`.

## Tests

Command (cwd `apps/atlas-integration-api`):

`npx tsx --test tests/hub-client-onboarding-automation.test.ts tests/hub-onboarding-execute-fail-closed-identity.test.ts`

| Suite | Result |
|-------|--------|
| `hub-client-onboarding-automation.test.ts` | 30 pass |
| `hub-onboarding-execute-fail-closed-identity.test.ts` | 23 pass |
| Total | **53 pass / 0 fail** |

Covered: entitled reuse with id; create returns id; create fail / no id; empty list not fabricated; dry-run does not create; wrong-client never attaches; missing identity stays false; send / AUTO_RESPOND / capitalSubmit remain false; kickoff/capital/comms flags preserved.

## Live surfaces (observe only — not deployed)

GET `https://app-atlas-integration-hub.azurewebsites.net/health` → 200

```json
{"ok":true,"commit":"376fb537c3b073d2f30de199b4e04beed2c9137d"}
```

Sibling Supervisor has not deployed `e0f19d0`. Validator did not deploy.

Unsigned GET `/operator` → **401** `WWW-Authenticate: Bearer` (`x-atlas-operator-desk: v1`). No credentials used.

Elite `https://zealous-rock-0090c7e1e.7.azurestaticapps.net/assets/index-D_AIcabQ.js`

| Header | Observed |
|--------|----------|
| Last-Modified | `Tue, 25 Aug 2026 06:33:50 GMT` (unchanged) |
| ETag | `"65754738"` |
| Content-Length | 1467109 |

## Deploy gate

DEPLOY = NOT_AUTHORIZED_UNTIL_PARENT_STACK_IS_LIVE

Required live stack before this candidate: `e0f19d0` then kickoff parent. Live Hub remains `376fb53`. GitHub parent `7f669dce` is the PR #196 validation-docs HEAD, not live, and is not an ancestor of this SHA.

This candidate stays KEEP_DRAFT.

OWNER_ACTIONS = NONE. No credentials requested or used.
