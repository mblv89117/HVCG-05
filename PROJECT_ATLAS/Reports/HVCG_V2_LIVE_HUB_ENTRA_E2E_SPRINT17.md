# Live Hub / Entra E2E Evidence — Sprint 17

## Process path

`HTTP client → atlas-integration-api (/api/ba/*) → ba_bridge.py → atlas_security.dispatch_ba_request → domain modules → JSON + audit`

## Runtime used

| Hub | Port | Auth mode | Result |
|-----|------|-----------|--------|
| BA V2 Hub (this worktree) | 8792 | `REQUIRE_AUTH=false` + `x-atlas-*` | Live Cases A/B/D/E/K/V |
| BA V2 Hub | 8793 | `REQUIRE_AUTH=true` | Case C missing/malformed Bearer → 401 |
| Older local Hub | 8790 | (atlas-local-ai-operations) | No `/api/ba` — not used |

## Positive / negative

| Case | Result |
|------|--------|
| A Authorized health | 200 SUCCESS |
| B Cross-client | 403 |
| C Missing bearer | 401 missing_bearer |
| C Malformed JWT | 401 (tenant_unconfigured / invalid — fail closed) |
| D Owner Support | 403 + existenceConcealed |
| E Risk | 403 |
| K Guessed download | 403 |
| V BL-C1 | 403 BLOCKED_POLICY sent=false |

## Remaining

Real Entra Hub API access token validation against populated tenant = **CREDENTIAL_REQUIRED**.
