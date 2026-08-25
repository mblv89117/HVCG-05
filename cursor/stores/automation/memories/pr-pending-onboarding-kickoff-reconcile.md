# ATLAS-ONBOARDING-KICKOFF-RECONCILE-001

KEEP_DRAFT. Do not merge to v1.1.0. Do not zipdeploy. Elite unchanged.

## Lineage

- Repo: HVCG-05
- Base branch: `cursor/atlas-onboarding-capital-reconcile-001`
- Base SHA: `e0f19d05e53e2a35dc4353dfea743afc6b9f77cb`
- Branch: `cursor/atlas-onboarding-kickoff-reconcile-001`
- PR target: `cursor/atlas-onboarding-capital-reconcile-001` (not v1.1.0)
- Live Hub (do not deploy): `c666585865b519c8e3953fd5eab47495a78e2851`
- Reuses kickoff package lineage from PR #165 — not a new kickoff product

## Behavior

`kickoffReconciled = true` only after:

1. entitled reuse of an existing same-scope kickoff record/task/milestone that has a real id, or
2. a create that returned an id

Never invent kickoff ids, meeting ids, or ClientCodes. Never send outbound kickoff mail.

- `communicationPolicy` remains `DRAFT_ONLY`
- `send=false`, `outbound=false`, `liveGtmOutbound=false`, `AUTO_RESPOND` off, `capitalSubmit=false`
- Canonical roster only: PDG01, ACCG01, CCB01, HFD01, LIEN01
- Wrong-client kickoff never attaches
- Dry-run does not create
- Create fail / no id → not reconciled
- Ask Atlas reports reused vs not confirmed. No fabricated kickoff completion.

## Preserved fail-closed flags

- identity before project/task/milestone/agent
- `workspaceReconciled`, `documentsReconciled`, `taskReconciled`, `agentReconciled`
- `milestoneReconciled` after reuse/create returns an id
- `communicationContextReconciled` after entitled thread/email ids
- `capitalContextReconciled` after entitled capital ids

## OWNER_ACTIONS

NONE. No credentials.
