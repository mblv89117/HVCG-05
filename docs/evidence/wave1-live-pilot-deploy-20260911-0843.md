# Wave 1 Live Client Pilot — production deploy evidence

**Constitution:** HVCG-CONSTITUTION-2026-09-04-v1.0  
**Repository:** mblv89117/HVCG-05  
**Production branch:** `production/atlas-core`  
**PR included:** #222 PKG-02A Live Client pilot PDG01/HFD01  
**Exact deploy target:** `d8a9574eb6af0c37e56bb6e955126086d1ce284e`  
**Governance writeback:** NOT performed (reality-first sequence)

## Verdict

`DEPLOYMENT_VERDICT=PASS` — Hub + Elite verified at target SHA; ancestry/lease/CI gates held; PDG01/HFD01 authenticated operator smoke PASS; durable hydrate from azure-table observed; signed recert PASS for GCC/PDG01 + Growth360/HFD01 fail-closed + happy-path; Website unsigned fail-closed PASS. MRI01 treated as existing fixture code (already in identity seed) — not a newly invented production mapping.

`BUSINESS_USEFUL=PASS` — live operator commercial-context briefs for PDG01 and HFD01 rendered WHAT IS HAPPENING / WHY / CHANGED / KNOWN / UNKNOWN / NEXT / PROVENANCE / APPROVAL REQUIRED with hydrate-from azure-table and OBSERVE/RECOMMEND/PREPARE authority only.

`SIGNED_RECERT=PASS` — Key Vault–backed ephemeral HMAC matrix executed successfully (secrets never written to evidence).

`ROLLBACK_REQUIRED=no`

## SHAs

| Field | Value |
|-------|--------|
| PRE_DEPLOY_HUB_SHA | `4a7e5f75ca2c740e44de4854bdf4ac7343f0bce6` |
| CURRENT_CANDIDATE / PRODUCTION_BRANCH_SHA | `d8a9574eb6af0c37e56bb6e955126086d1ce284e` |
| POST_DEPLOY_HUB_SHA | `d8a9574eb6af0c37e56bb6e955126086d1ce284e` |
| PRE_DEPLOY_ELITE_SHA | `b504e12245e57b016e2bab934ebb44e55747a7e8` |
| POST_DEPLOY_ELITE_SHA | `d8a9574eb6af0c37e56bb6e955126086d1ce284e` |
| HISTORICAL_FLOOR | `2d61fe65603b88d12d08456967c65dae8e5aec52` |

## Azure account (no credentials)

| Field | Value |
|-------|--------|
| AZURE_ACCOUNT_NAME | HVCG Production |
| Subscription ID | `ebc84d85-b5ff-4c4b-add1-b0a8de31b319` |
| Tenant ID | `3df46563-86f3-4414-87fd-84ba967741ef` |
| Signed-in user | `manny@highvaluecapitalgroup.com` |
| AZURE_ACCOUNT_VERIFIED | true |

## Pre-deploy / CI / guards

| Check | Result |
|-------|--------|
| Target lock | PASS — `origin/production/atlas-core` == `d8a9574e…` |
| Atlas CI | SUCCESS on `d8a9574e` |
| HVCG OS Release validation | SUCCESS (validation only; not used to deploy) |
| ANCESTRY_GUARD | PASS — live Hub `4a7e5f75…` ancestor of candidate |
| DEPLOY_LEASE | PASS (flock) — Azure blob data-plane lease unavailable (missing Storage Blob Data role on `sthvcgwebintake`); flock fallback acquired/released |
| SHA equalize flag | NOT set |

## Deploy order

1. Hub via `./scripts/local-hub-deploy.sh` → PASS (`/health.commit` matches candidate)
2. Elite via `./scripts/deploy-swa-dev.sh` with production Vite locks → PASS after Rosetta install for x86_64 StaticSitesClient

Elite env confirmed: `VITE_ATLAS_ENV=production`, `VITE_ALLOW_SAMPLE_FALLBACK=false`, `VITE_ALLOW_DEV_OWNER_LOGIN=false`, `VITE_BLOCK_LIVE_CLIENT_COMMS=true`, Hub `https://app-atlas-integration-hub.azurewebsites.net`, SWA `swa-atlas-elite-os-dev` / `zealous-rock-0090c7e1e.7.azurestaticapps.net`.

## Public smoke

| Check | Result |
|-------|--------|
| Hub `/health` ok | true |
| Hub commit | `d8a9574e…` |
| Elite HTTP | 200 |
| Elite embedded SHA | `d8a9574e…` |

## Security smoke

| Probe | Result |
|-------|--------|
| Unauthenticated commercial/PM routes | 401 Bearer required |
| OPTIONS `/api/modules/ingest` allow-headers | key-id + timestamp + signature only (no raw secret when not requested) |
| Missing key-id / unknown key-id / bad signature / expired timestamp / raw-secret-only | 401 unauthorized |
| Website intake without auth | 401 |
| GLOBAL_AUTO_RESPOND | false (stated in live pilot approvalRequired copy; no paid execute) |
| Growth360 canExecute=true | 400 `PAID_EXECUTE_FORBIDDEN` |
| Hart slug with non-HFD01 ClientCode | 403 `HART_CLIENTCODE_REQUIRED` |
| Unknown ClientCode path | fail-closed (401 unauth; no cross-fallback payload) |

## PDG01 live operator smoke

Authenticated Hub Bearer via existing Azure CLI session (`api://99dd84b0-…/access_as_user`).

| Field | Result |
|-------|--------|
| commercial-context HTTP | 200 |
| liveClientPilot | present |
| WHAT IS HAPPENING | GCC engagement_health signals including post-deploy OBSERVE |
| WHY / CHANGED / KNOWN / UNKNOWN / NEXT / PROVENANCE / APPROVAL | present |
| Hydrate | provenance `module-ingest-hydrate` detail includes `azure-table` |
| Authority | RECOMMEND / PREPARE only (no autonomous execute) |
| GCC durable hydrate without opening GCC | PASS |

## HFD01 live operator smoke

| Field | Result |
|-------|--------|
| commercial-context HTTP | 200 |
| liveClientPilot | present |
| Growth360 attributions | hydrated; known states `canExecute remains false` |
| organizationSlug | `hart-family-dental` present in live context |
| organizationId `99cdffba-3cf2-4343-9e4a-3dca42ff4711` | confirmed in identity seed dual-resolve; UUID not echoed in pilot brief text |
| Authority | OBSERVE / PREPARE only |
| Paid campaign execution | blocked (ingest + brief) |

## Durable hydration smoke

| Check | Result |
|-------|--------|
| Azure Table backend | live signed ingest `backend=azure-table` |
| Hydrate-on-read | live provenance `Commercial observations hydrated from: azure-table` |
| Unit suite (wave1 hydrate blockers + pilot) | 768/768 PASS locally on deployed SHA |
| Silent empty on auth failure | covered by unit blockers; live hydrate returned rows for entitled clients |
| GET-time disk mutation | unit-proven persist:false default; not mutated in production for test |

## Signed recertification

Secrets retrieved ephemerally from Key Vault `kv-atlas-hvcg-ebc84d85` (`AtlasModuleIngestKeyGcc`, `AtlasModuleIngestKeyGrowth360`, `AtlasModuleIngestKeyMri`, `AtlasModuleIngestKeysJson`). Never echoed, never written to evidence.

| Case | Result |
|------|--------|
| GCC/PDG01 valid OBSERVE | 201 azure-table |
| GCC/PDG01 replay | 200 replay=true |
| GCC cross-org mismatch | 403 `GCC_ORG_CLIENTCODE_MISMATCH` |
| GCC bad signature / expired / raw secret | 401 |
| Growth360/HFD01 valid OBSERVE | 201 azure-table |
| Growth360/HFD01 replay | 200 replay=true |
| Growth360 canExecute=true | 400 `PAID_EXECUTE_FORBIDDEN` |
| Hart slug wrong ClientCode | 403 |
| MRI01 fixture attempt | 201 azure-table on existing seed fixture code `MRI01` (not invented mapping) |
| Website unsigned | 401 |

`SIGNED_RECERT=PASS` with note: KeysJson contains `growth360`+`mri` only; GCC uses standalone secret + Hub `INTEGRATION_MODULE_INGEST_KEY_ID=gcc`.

## Defects / follow-ups (non-blocking)

1. Azure blob deploy lease data-plane RBAC missing for Owner on `sthvcgwebintake` → flock fallback used.
2. StaticSitesClient is x86_64; required Rosetta on Apple Silicon host.
3. Live HFD01 pilot brief does not echo Growth360 organization UUID (slug + canExecute honesty present; seed mapping intact).
4. Governance registry writeback deferred pending independent review of this evidence.

## Rollback

Not required. Pre-deploy Hub reference preserved: `4a7e5f75ca2c740e44de4854bdf4ac7343f0bce6`.

## Timestamp

Deployment window UTC: Hub start `2026-09-11T08:31:44Z` → Hub verified `2026-09-11T08:33:18Z`; Elite verified shortly after Rosetta repair; evidence stamped `2026-09-11T08:43Z` approx.
