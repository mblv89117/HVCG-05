# V3 Azure-backed remaining-P0 probes — 2026-08-22T02:53Z

**Orchestrator:** V3 `bc-583ac529-8ba2-4f45-9e97-8ec41dd47a6b`  
**Strategy:** Section-45 change — do **not** clone D33/D32. RT follow-ups cannot rebind (`a86e2323` / Azure ABSENT). V3 uses this-pod Azure SP (names present) to close evidence RT could not reach.  
**LIVE_SECURITY_CERTIFIED:** **NO** — V3 evidence alone is not enough.  
**Classification authority:** Red Team independent only.

No secret values, prefixes, suffixes, lengths, or hashes are recorded.

## a. Hub app-setting names (presence only)

Source: `az webapp config appsettings list -g rg-atlas-prod -n app-atlas-integration-hub --query "[].name"`.

| Name | Present |
|------|---------|
| `INTEGRATION_WEBSITE_INTAKE_KEY` | **YES** (Hub intake HMAC secret name; `config.ts` → `websiteIntakeKey`) |
| `WEBSITE_INTAKE_KEY` | **NO** (no alias setting) |
| `STAFF_JWT` / `HUB_TOKEN` / `MSAL_TOKEN` | **NO** |
| `INTEGRATION_REQUIRE_AUTH` | YES |
| `INTEGRATION_ALLOW_EPHEMERAL_KEY` | YES — connector token encryption, **not** a staff-session mint |
| `INTEGRATION_TOKEN_ENCRYPTION_KEY` | YES — connector encryption, **not** a staff JWT |
| `PLAID_*` / Plaid host URL | **NO** among Hub app-setting names |

Live `/health.websiteLeads.configured=true` agrees the intake key + leads list are configured at runtime.

## b. Live HMAC-invalid + `eva|` idempotency (V3 in-process)

Fetched `INTEGRATION_WEBSITE_INTAKE_KEY` in-process via Azure SP. Value never written to git, logs, or artifacts.

Route: `POST https://app-atlas-integration-hub.azurewebsites.net/api/website/leads`  
Contract: `x-website-intake-key` + `x-website-intake-key-id=website` + `x-website-intake-timestamp` + `x-website-intake-signature` = HMAC-SHA256(key, `${timestamp}.${rawBody}`) hex.

| Probe | Finding | HTTP | Body (code / message only) | Observed |
|-------|---------|------|----------------------------|----------|
| Valid key-id + timestamp + signature `'0'*64` | XSYS-RT-20260820-01 | **401** | `unauthorized` / `Website intake signature invalid.` | OBSERVED_401_INVALID_SIG |
| Missing intake headers | XSYS-01 fail-closed | **401** | `unauthorized` / `Website intake key required.` | STATUS_401 |
| Forged Bearer only | XSYS-01 fail-closed | **401** | `unauthorized` / `Website intake key required.` | STATUS_401 |
| Valid HMAC + `Website-Contact` + `fullPayload.idempotencyKey=eva\|v3-orchestrator-d33-do-not-upsert` | XSYS-RT-20260820-02 | **409** | `IDEMPOTENCY_PREFIX_MISMATCH` / prefix must match `website\|` | OBSERVED_409_PREFIX_MISMATCH |

The `eva|` request dies at `assertIdempotencyKeyBoundToSource` **before** SharePoint upsert. No lead was created.

Sanitized artifact: `/opt/cursor/artifacts/v3_xsys_live_probes_2026-08-22T0252Z.json`  
Probed at: 2026-08-22T02:52:55Z against live Hub SHA `64b56dc`.

**V3 classification:** package only. **Not** `VERIFIED_FIXED`. RT must independently classify.

## c. Staff / synthetic session mint

Inspected Hub source + app-setting names.

| Candidate | Result |
|-----------|--------|
| Documented QA / synthetic staff-session mint | **NO** |
| `INTEGRATION_ALLOW_EPHEMERAL_KEY` / `INTEGRATION_TOKEN_ENCRYPTION_KEY` | Connector-token encryption, not staff JWT |
| `INSECURE_DEV_PRINCIPAL` / `INTEGRATION_ALLOW_INSECURE_DEV_AUTH` | Loopback / non-production only; live `/health.insecureDevAuth=false` |
| V3 env `HUB_TOKEN` / `MSAL_TOKEN` / `STAFF_JWT` | **ABSENT** |

Do not invent a bypass. Do not ask Manny for a production identity.  
**AUTH_SESSION=MISSING. D14 NOT ISSUED.**  
ATLAS-01 / ATLAS-02 entitlement isolation **not** executed.

## d. Plaid host

| Check | Result |
|-------|--------|
| Hub `GET /api/plaid/link` | **405** `method_not_allowed` (not served by Hub router) |
| `rg-atlas-prod` webapps | `app-atlas-integration-hub`, `app-atlas-ba` only |
| Function Apps | none listed |
| Container app | `gs360p-api` in `rg-360gs-prod` (GTM, not Plaid) |
| Hub app-setting names | no `PLAID_*` host |
| In-tree `apps/atlas-plaid-api` | not a live Azure host |

Do **not** open a new Plaid surface. ATLAS-03 remains **INCONCLUSIVE**.

## e. D14

Not issued. No real staff/synthetic session obtained.

## Official effect

| Field | Value |
|-------|--------|
| LIVE_P0 | **5** (still INCONCLUSIVE for LIVE_CERT) |
| LIVE_SECURITY_CERTIFIED | **NO** |
| ALL_EXISTING_OD005_FINDINGS_VERIFIED_FIXED | **NO** |
| Owner actions | **NONE** — intake key already existed in Hub app settings |
