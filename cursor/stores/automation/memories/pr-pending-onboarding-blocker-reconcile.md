# ATLAS-ONBOARDING-BLOCKER-RECONCILE-001

KEEP_DRAFT. Do not merge to v1.1.0. Do not zipdeploy. Elite unchanged.

## Lineage

- Repo: HVCG-05
- Base branch: `cursor/atlas-onboarding-kickoff-reconcile-001`
- Base SHA: `ca85cdd923b9a334806fe7acf25ccfc30a1ab6ae`
- Branch: `cursor/atlas-onboarding-blocker-reconcile-001`
- HEAD: `9032ab86fdbe918bbb4ef17eb9b059555bf59417`
- PR: https://github.com/mblv89117/HVCG-05/pull/197 (KEEP_DRAFT against kickoff parent)
- Live Hub (do not deploy): `376fb537c3b073d2f30de199b4e04beed2c9137d`
- Reuses blocker-review package lineage from PR #166 — not a new blocker product

## Behavior

`blockerReconciled = true` only after:

1. entitled reuse of existing same-scope blocker/task/attention rows that have a real id, or
2. a create that returned an id

Never invent blocker ids, ClientCodes, or outbound mail. If no entitled blockers exist, report none confirmed — do not fabricate blockers.

- `communicationPolicy` remains `DRAFT_ONLY`
- `send=false`, `outbound=false`, `liveGtmOutbound=false`, `AUTO_RESPOND` off, `capitalSubmit=false`
- Canonical roster only: PDG01, ACCG01, CCB01, HFD01, LIEN01
- Wrong-client blockers never attach
- Dry-run does not create
- Create fail / no id → not reconciled
- Ask Atlas reports reused vs not confirmed. No fabricated blockers.

## Preserved fail-closed flags

- identity before project/task/milestone/agent
- `workspaceReconciled`, `documentsReconciled`, `taskReconciled`, `agentReconciled`
- `milestoneReconciled` after reuse/create returns an id
- `communicationContextReconciled` after entitled thread/email ids
- `capitalContextReconciled` after entitled capital ids
- `kickoffReconciled` after entitled reuse or create returns an id

## Tests

53 pass / 0 fail

- `hub-client-onboarding-automation.test.ts` (30)
- `hub-onboarding-execute-fail-closed-identity.test.ts` (23)

## OWNER_ACTIONS

NONE. No credentials.
