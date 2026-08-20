# Identity and Auth Model

Least privilege across High Value products. **No universal cross-platform super-admin shortcut.**

## Identity classes

| Class | Who | Typical auth | Scope |
| --- | --- | --- | --- |
| `hvcg_human` | Internal HVCG staff | Entra / Hub bearer | Role-scoped Atlas operations |
| `client_user` | Atlas client portal principal | Client portal auth | Single `ClientCode` |
| `system_service` | Product-to-product service | Edge API keys / app registration | Single edge + idempotency |
| `marketing_tenant` | 360 tenant operator/service | 360 tenant auth | Own tenant GTM objects |
| `assessment_session` | Copilot / EVA session | Session token | Observation staging only |
| `gcc_client_user` | GCC customer user | GCC auth | Own `organizations.id` |

Encoded on writes via `write-envelope.v1` → `actor.identityClass`.

## Edge auth (current)

| Edge | Auth | Notes |
| --- | --- | --- |
| Website/EVA → Atlas | `x-website-intake-key` | Intake only; not staff admin |
| Atlas PM convert/activate | Staff bearer + ETag; Manny authorize for activation | Won ≠ Active |
| Capital handoffs | Bearer + client scope | Observation vs routing distinguished |
| 360 → Atlas (future live) | Service/intake key | Live dispatch owner-gated |
| Copilot → Atlas (future live) | Future Entra / service | Live dispatch off |
| Atlas → GCC | GCC `platform_admin` | Persist-only receiver |
| GCC → Atlas signals | Service identity | No ledger push |

## Privilege rules

1. Staff roles are product-local; Atlas admin ≠ GCC admin ≠ 360 tenant admin.
2. Service principals are edge-scoped; one key must not unlock all products.
3. Assessment sessions cannot create `ClientStage`, entitlements, or opportunities.
4. Client users cannot escalate to other `ClientCode`s or GCC orgs.
5. Marketing tenants cannot spoof another tenant's `campaignId` / attribution.
6. Owner gates remain for live dispatch, paid ads, and GCC access grants.

## Mapping discipline

Bridging Atlas `ClientCode` ↔ GCC `organizations.id` ↔ 360 org requires an explicit mapping record created by a governed handoff — never string equality assumptions.
