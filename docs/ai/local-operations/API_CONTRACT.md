# Phase 1 — API contract (`/api/local-ai`)

All routes require Integration Hub principal (`requirePrincipal`).  
In local Dev with `INTEGRATION_REQUIRE_AUTH=false`, header principal / admin bypass applies (existing hub pattern).

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/local-ai/health` | Safety status, flags, ollamaConnected=false |
| GET | `/api/local-ai/flags` | Feature flags |
| GET | `/api/local-ai/command-center` | Manny decision snapshot |
| GET | `/api/local-ai/jobs` | List jobs (`?status=`) |
| GET | `/api/local-ai/jobs/:id` | Job + audit |
| POST | `/api/local-ai/jobs` | Create (idempotent via `idempotencyKey`) |
| POST | `/api/local-ai/jobs/:id/queue` | Queue |
| POST | `/api/local-ai/jobs/:id/process` | Mock process (`force` for tests when flag Off) |
| POST | `/api/local-ai/jobs/:id/retry` | Retry failed |
| POST | `/api/local-ai/jobs/:id/manny-decision` | Approve / Reject / Returned for Revision |
| POST | `/api/local-ai/jobs/:id/attempt-action` | Prove prohibited action block |
| POST | `/api/local-ai/jobs/:id/attempt-external` | Prove external send block |
| POST | `/api/local-ai/policy/evaluate` | Time-protection policy |
| GET/POST | `/api/local-ai/operations-queue` | List / create |
| POST | `/api/local-ai/operations-queue/:id/reassign` | Reassign configurable owner |
| GET | `/api/local-ai/audit` | Audit events |

## Create job body (minimum)

```json
{
  "sourceRecordType": "Task",
  "sourceRecordId": "test-1",
  "requestedOperation": "MeetingSummary",
  "idempotencyKey": "unique-key",
  "mockScenario": "success"
}
```

`mockScenario`: `success` | `timeout` | `malformed` | `low_confidence` | `failure`
