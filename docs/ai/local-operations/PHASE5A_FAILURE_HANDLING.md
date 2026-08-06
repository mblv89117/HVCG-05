# Failure Handling (Phase 5A)

| Failure | Behavior |
| --- | --- |
| Invalid / missing fields / malformed financials | 400; no submission row (or failure recorded) |
| Oversized payload | 413 |
| Rate limit | 429 |
| Production origin | 403 `production_origin_rejected` |
| Duplicate idempotency key | 200 replay of original |
| Spam / injection in input | 400 `spam_or_injection_like_input` |
| Model offline / timeout / malformed JSON / forbidden claims | Submission preserved; status `Failed`; deterministic draft attached with warning |
| Low confidence | Waiting on Manny; batch recommended; warning |
| SQLite unavailable | Request fails safely |
| Hub restart | SQLite durable; no auto-reprocess required for EVA |
| Cancelled review | Status `Cancelled`; original preserved |

Never display AI-review success when AI failed.
