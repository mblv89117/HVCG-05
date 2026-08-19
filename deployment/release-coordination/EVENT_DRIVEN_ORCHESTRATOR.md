# Event-Driven Release Orchestrator

**Mode:** Event-driven (no timed polling)  
**Agent:** `deployment-manager`  
**Auto-deploy:** **NEVER**

## Deploy authorization (all required)

1. QA formal **GO**
2. Master PM approval
3. Owner approval

Missing any one ⇒ `deployAuthorized=false`.

## Event types

| Event | Meaning |
|-------|---------|
| `RC_ASSIGNED` | Master PM assigns a release candidate |
| `QA_STATUS_CHANGED` | QA sets GO / NO-GO / PENDING |
| `MERGE_CANDIDATE_READY` | New merge candidate becomes Ready / enters review |
| `BLOCKING_ISSUE_RESOLVED` | S0/S1 or refuse-gate blocker cleared |
| `DEPLOYMENT_APPROVAL_GRANTED` | Explicit approval signal (still needs all three gates) |
| `ROLLBACK_REQUESTED` | Rollback validation + plan refresh |
| `PRODUCTION_INCIDENT` | Incident response — freeze deploys |
| `SYNC_REQUESTED` | Master PM sync / inventory refresh |

## How to emit

```bash
python3 deployment/release-coordination/scripts/emit-release-event.py \
  --type RC_ASSIGNED \
  --source master-pm \
  --release-version RC-2026.07.20-1 \
  --commit-sha <sha> \
  --notes "assign candidate for validation"
```

Events land in `events/inbox/*.json`. The watcher wakes the orchestrator; handler processes and moves files to `events/processed/`.

## Maintained artifacts

| Artifact | Path |
|----------|------|
| Deployment readiness checklist | `checklists/DEPLOYMENT_READINESS_CHECKLIST.md` |
| Release candidate inventory | `inventory/RC_INVENTORY.json` |
| Deployment validation | `validation/DEPLOYMENT_VALIDATION.md` |
| Rollback validation | `validation/ROLLBACK_VALIDATION.md` |
| Smoke test validation | `validation/SMOKE_VALIDATION.md` |
| Production readiness report | `reports/PRODUCTION_READINESS_REPORT.md` |
| RC packages | `rc-packages/` |

## Watcher

`scripts/watch-release-events.sh` — filesystem events only (inbox + orchestration queue/reviews). No interval polling.
