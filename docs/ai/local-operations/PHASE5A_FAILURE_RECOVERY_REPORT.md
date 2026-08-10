# Phase 5A Failure and Recovery Report

| Scenario | Expected |
| --- | --- |
| Hub restart after intake before AI (`deferAi`) | Status `AI Review Pending`; resume via governed retry; no duplicate company/contact/prospect |
| Model offline / timeout / malformed JSON / prohibited claims | Status `Failed`; ready queue exclusion; original preserved |
| Duplicate AI job while in progress | Blocked by `aiJobIdempotencyKey` |
| Governed retry | Clears lock; increments retry count; does not recreate prospect |

Evidence: unit tests + `scripts/phase5a-live-acceptance.ts` recovery section.
