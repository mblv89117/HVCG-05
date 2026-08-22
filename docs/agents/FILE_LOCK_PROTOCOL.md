# File Lock Protocol

Agents must request a lock before editing shared or contested paths.

## Lock schema

Stored at `.agent-comms/locks/<lockId>.json`:

```json
{
  "lockId": "uuid",
  "owner": "agent-id",
  "paths": ["docs/crm/foo.md"],
  "timestamp": "ISO-8601",
  "reason": "why the lock is needed",
  "expiresAt": "ISO-8601"
}
```

## Commands

```bash
./scripts/agent-comms/lock-acquire.sh \
  --owner crm \
  --paths "docs/crm/OPPORTUNITY_MANAGEMENT.md,docs/crm/SMOKE_TEST_CHECKLIST.md" \
  --reason "Updating smoke checklist" \
  --ttl-minutes 60

./scripts/agent-comms/lock-release.sh --owner crm --lock-id <lockId>
```

## Rules

1. **No silent overwrite.** If another agent holds an overlapping path, acquire fails.
2. **TTL required.** Default 60 minutes. Expired locks are moved to `.agent-comms/archive/locks/`.
3. **Release when done.** Releases are archived (not deleted forever).
4. **Scope tightly.** Lock only the files you will change.
5. **Escalation.** If you cannot acquire a needed lock, send a `BLOCKER` or `CONFLICT` message to the lock owner and `master-pm`.

## Recommended shared paths to lock

- Root status files: `PROJECT_STATUS.md`, `NEXT_SESSION.md`, `PROJECT_HANDOFF.md`
- Cross-module docs indexes
- Solution packaging shared manifests
- Anything listed in multiple agents' `ownedPaths`
