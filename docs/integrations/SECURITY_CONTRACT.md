# Security Contract Tests

Harness coverage (no production side effects): `tests/integrations/test_security_contracts.py`.

| Attack / failure | Expectation |
| --- | --- |
| ID spoofing | Typed refs require `system`+`entity`; foreign IDs rejected as Atlas `ClientCode` |
| Tenant spoofing | Marketing tenant cannot set another tenant's campaign as own without envelope actor scope |
| Campaign attribution spoofing | Attribution preserved from source; receivers do not trust client-supplied overwrite of sealed provenance without service auth |
| Cross-client access | `clientCode` scope checks; GCC org ≠ ClientCode |
| Replay abuse | Same idempotency key → duplicate/return-existing, not new entity |
| Forged handoff | Missing governance consts / wrong `contractVersion` → schema reject |
| Prompt-injected payloads | Oversized strings / unexpected properties rejected by closed schemas |
| Oversized payloads | `maxLength` / `maxItems` enforced |
| Schema confusion | Wrong `$id` / version const fails validation |
| Unsafe defaults | `observationOnly`, `liveDispatch:false`, `paidAdsEnabled:false`, `autoProvisionAccess:false` required where applicable |

No universal cross-platform admin token is defined in these contracts.
