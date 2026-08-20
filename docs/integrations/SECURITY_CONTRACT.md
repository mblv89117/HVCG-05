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

## XSYS-01 / XSYS-02 (intake authenticity + prefix bind) — Hub-side

Independent Red Team findings (D21 catalog; D23 revalidation). Classification: **Hub LIVE_PRODUCTION_P0** on frozen Hub `940a484`. **Not this contracts branch.** Candidate `9e5d10a` is FIXED_REVALIDATED.

| ID | Live Hub `940a484` | Remediation owner |
| --- | --- | --- |
| **XSYS-01** (XSYS-RT-20260820-01) | Website/EVA intake key without body HMAC | `cursor/atlas-security-patch-od005` @ `9e5d10a` — HMAC-SHA256(`${timestamp}.${rawBody}`) fail-closed |
| **XSYS-02** (XSYS-RT-20260820-02) | `fullPayload.idempotencyKey` accepted unbound to source | Same candidate — prefix must match `submissionType` (`website\|` / `eva\|` / `copilot\|` / `360\|`); mismatch → 409 |

| Rule | Value |
| --- | --- |
| Contract posture | Live intake MUST plan for request authenticity beyond a static header key, plus prefix↔source bind, before new production intake hardening |
| This train | Documents requirement only (`ATLAS-INT-007`) |
| Forbidden here | Patching frozen Hub `940a484` runtime on the contracts branch |
| Owner | Atlas security-patch train (OD-005). Independent RT PASS + owner authorize required before any Hub deploy |

SECURITY_CERTIFIED remains Atlas/OD-005, not this train.
