# Idempotency and Failure Atomicity

## Write envelope (required)

Every cross-system write MUST include `write-envelope.v1`:

| Field | Purpose |
| --- | --- |
| `idempotencyKey` | Stable natural key for the operation |
| `sourceSystem` / `destinationSystem` | Explicit edge |
| `entity` / `operation` | What is being written |
| `version` | Contract version string |
| `replaySemantics` | `return-existing` \| `update-existing` \| `reject-conflict` |
| `trace` | `trace-context.v1` |

Pattern registry: `schemas/idempotency-keys.v1.json`.

## Entities that must never duplicate on retry

Leads, opportunities, engagements, bookings, messages, client records, GCC handoffs.

## Failure atomicity matrix

Receivers must not report success unless the durable effect is committed **or** an idempotent prior commit is proven.

| Scenario | Required behavior | Forbidden |
| --- | --- | --- |
| Sender succeeds / receiver fails | Sender keeps undelivered; retry with same key | Mark CRM entity created |
| Receiver persists / response lost | Retry returns existing (`return-existing` / `created:false`) | Second lead/opp/client |
| Timeout | Treat as unknown; retry same key | Optimistic success without proof |
| Duplicate retry | Idempotent replay | Duplicate rows / messages |
| Stale auth | `401/403`; no partial write | Write then fail auth |
| Invalid schema | `400` + validation errors; no persist | Partial coerce / drop required fields |
| Unknown ID | `404` / `422`; no invent | Create placeholder ClientCode |
| Permission failure | `403`; no side effects | Soft-success |
| 5xx | Retryable failure; same key | Client-visible success |
| Partial state (multi-write convert) | Compensate or continue under same convert keys | Orphan client without opp keys |

## Atomicity rules for Atlas lead conversion

Lead → client + contact + opportunity uses three keys:

- `client-from-lead|{LeadId}`
- `contact-from-lead|{LeadId}`
- `opp-from-lead|{LeadId}`

Replays must return existing artifacts. No second `ClientCode` for the same lead.

## No false-success

HTTP 2xx for a cross-system write means: durable idempotent commit acknowledged.
`pending` / `partial` outcomes belong in `trace.outcome` and must not be advertised as terminal success to upstream automations.
