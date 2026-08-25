# PR #196 independent validation — ATLAS-ONBOARDING-KICKOFF-RECONCILE-001

VALIDATION_STATUS: PASS
DEPLOY: NOT_AUTHORIZED_UNTIL_PARENT_e0f19d0_IS_LIVE
OWNER_ACTIONS: NONE

Validator did not implement PR #196. Validator is not a Supervisor and not a new durable specialist.
KEEP_DRAFT. No zipdeploy. No merge. No Ready. No Elite change. #195 left closed. MEMORIES.md / control-plane.md / atlas-agentic-ops.md untouched.

## Identity

| Item | Value |
|------|--------|
| Repo | https://github.com/mblv89117/HVCG-05 |
| PR | https://github.com/mblv89117/HVCG-05/pull/196 (draft, base `cursor/atlas-onboarding-capital-reconcile-001`) |
| Candidate | `ca85cdd923b9a334806fe7acf25ccfc30a1ab6ae` |
| Branch | `cursor/atlas-onboarding-kickoff-reconcile-001` |
| Parent | `e0f19d05e53e2a35dc4353dfea743afc6b9f77cb` (PR #193 VALIDATED, not live) |
| Live Hub | `376fb537c3b073d2f30de199b4e04beed2c9137d` |
| Floor | `ecc357159277bccd76900961fd8e35ed1e7a4df0` |
| Closed wrong-base | #195 against `cursor/v1.1.0-intelligence-ai-ops` — remains closed |
| Validated at | 2026-08-25T19:22Z |

Checkout: `git checkout -f ca85cdd923b9a334806fe7acf25ccfc30a1ab6ae` → HEAD matches candidate exactly.

## Ancestry

`git merge-base --is-ancestor <sha> HEAD`

| Ancestor | Result |
|----------|--------|
| `e0f19d05e53e2a35dc4353dfea743afc6b9f77cb` | YES |
| `376fb537c3b073d2f30de199b4e04beed2c9137d` | YES |
| `ecc357159277bccd76900961fd8e35ed1e7a4df0` | YES |

Lineage on HEAD: floor → live comms `376fb53` → capital parent `e0f19d05` → kickoff commits `e8840b4e` / `46a5391b` / `bc6091bd` / `ca85cdd9`.

## Diff vs parent `e0f19d05`

Hub-only. 5 files, +738 / −42. No Elite / static / frontend paths.

| Status | Path |
|--------|------|
| M | `apps/atlas-integration-api/src/pm/operatorDesk/clientOnboardingAutomation.ts` |
| M | `apps/atlas-integration-api/src/pm/operatorDesk/onboardingState.ts` |
| M | `apps/atlas-integration-api/tests/hub-client-onboarding-automation.test.ts` |
| M | `apps/atlas-integration-api/tests/hub-onboarding-execute-fail-closed-identity.test.ts` |
| A | `cursor/stores/automation/memories/pr-pending-onboarding-kickoff-reconcile.md` |

## kickoffReconciled contract

True only after entitled same-scope reuse of a kickoff record/task/milestone that has a real id, or a create that returned an id.

Observed in `runClientOnboardingAutomation` / `listRelatedKickoffForClient` / `composeKickoff`:

- Reuse: list (or discovered same-scope kickoff-titled task/milestone) filtered by entitled canonical client; rows without id dropped; foreign `clientCode` never attaches.
- Create: `kickoffCreate` runs only when not reconciled, not dry-run, and create is provided; `created?.id?.trim()` required; throw / missing id stays false.
- Empty list, list throw, create fail, create no-id, dry-run, wrong-client, missing identity / missing client scope → `kickoffReconciled = false`, `relatedKickoff = []`.
- Identity fail-closed record sets `kickoffReconciled: false` before project/task/milestone/agent work.
- `composeKickoff` forces false when `identityResolutionRequired` or workspace/project missing, even if caller passed foreign refs.
- `communicationPolicy` remains `DRAFT_ONLY`. `send=false`, `outbound=false`, `liveGtmOutbound=false`, `autoRespond=false` (`COMMUNICATIONS_AUTO_RESPOND` / `COMMUNICATIONS_SEND` are `false as const`). `capitalSubmit=false`.
- Ask Atlas reports reused vs reconciled vs not confirmed. No invented kickoff / meeting / ClientCode / outbound claim.
- Preserved: `workspaceReconciled`, `documentsReconciled`, task/agent reconcile-after-id, `milestoneReconciled`, `communicationContextReconciled`, `capitalContextReconciled`. Kickoff tests leave capital/comms/milestone flags false when only kickoff is injected.

Production `handle.ts` / Ask Atlas execute / workflow activate do not inject `kickoffCreate`. Live create-with-id is the existing kickoff-titled task/milestone package (`discoveredKickoff` / `defaultOnboardingKickoffList`). Optional `kickoffCreate` is the governed injection used by tests. Matches “reuse existing kickoff package; no new kickoff product.”

## Tests

Command (cwd `apps/atlas-integration-api`):

`npx tsx --test tests/hub-client-onboarding-automation.test.ts tests/hub-onboarding-execute-fail-closed-identity.test.ts`

| Suite | Result |
|-------|--------|
| `hub-client-onboarding-automation.test.ts` | 29 pass |
| `hub-onboarding-execute-fail-closed-identity.test.ts` | 22 pass |
| Total | **51 pass / 0 fail** |

Covered: entitled reuse with id; create returns id; create fail / no id; empty list; dry-run does not create; wrong-client never attaches; missing identity stays false; send / AUTO_RESPOND / capitalSubmit remain false.

## Live surfaces (observe only — not deployed)

GET `https://app-atlas-integration-hub.azurewebsites.net/health` → 200

```json
{"ok":true,"commit":"376fb537c3b073d2f30de199b4e04beed2c9137d"}
```

Unsigned GET `/operator` → **401** `WWW-Authenticate: Bearer` (`x-atlas-operator-desk: v1`). No credentials used.

Elite `https://zealous-rock-0090c7e1e.7.azurestaticapps.net/assets/index-D_AIcabQ.js`

| Header | Observed |
|--------|----------|
| Last-Modified | `Tue, 25 Aug 2026 06:33:50 GMT` (unchanged) |
| ETag | `"65754738"` |
| Content-Length | 1467109 |

## Deploy gate

DEPLOY = NOT_AUTHORIZED_UNTIL_PARENT_e0f19d0_IS_LIVE

Parent `e0f19d05` (PR #193) is VALIDATED and not live. That parent waits for live Hub `376fb53` soak. This candidate stays KEEP_DRAFT behind both.

OWNER_ACTIONS = NONE. No credentials requested or used.
