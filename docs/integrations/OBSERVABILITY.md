# Observability Contract

Cross-system actions must be traceable via `trace-context.v1`.

## Required fields

| Field | Description |
| --- | --- |
| `correlationId` | End-to-end journey correlation (journey / session / case) |
| `sourceSystem` | Emitting product |
| `destinationSystem` | Receiving product (when known) |
| `eventId` | Unique event id for this emission |
| `entityId` | Primary entity id touched |
| `campaignId` | When attribution involves a campaign |
| `timestamp` | ISO-8601 emission time |
| `version` | Contract version |
| `outcome` | `accepted` \| `rejected` \| `duplicate` \| `pending` \| `failed` \| `timeout` \| `partial` |

## Propagation

1. GTM/EVA/Copilot mint `correlationId` at first user-visible intake.
2. Every downstream handoff copies `correlationId` and mints a new `eventId`.
3. Atlas Hub logs include idempotency key + correlation id.
4. GCC persist-only receiver stores correlation for later mapping audits.
5. Synthetic harness asserts correlation continuity across Journey A/B/C.

## Outcome semantics

| Outcome | Meaning |
| --- | --- |
| `accepted` | Durable commit |
| `duplicate` | Idempotent replay of prior accept |
| `rejected` | Schema/auth/permission/business rule failure |
| `pending` | Async not yet durable |
| `failed` | Receiver error |
| `timeout` | Unknown; safe to retry same key |
| `partial` | Multi-step incomplete — must not be treated as success by automations |
