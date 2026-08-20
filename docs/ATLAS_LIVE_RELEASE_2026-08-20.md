# Atlas live release — 2026-08-20

Honesty rule: this file records **what Azure is running**, not what a worktree contains.

## Hub

| Item | Value |
|------|--------|
| App | `app-atlas-integration-hub` / `rg-atlas-prod` |
| URL | `https://app-atlas-integration-hub.azurewebsites.net` |
| Running SHA | `b6a3c9c50747f3bc06b0de870d9906c4b9424152` |
| Azure deployment ID | `3f62750c-2909-49d5-b25e-d1e119843e2e` |
| Previous live SHA | `3f794f7a8b51c094dba7e4cd5febd0c6bc81c6a6` (`828e426b-edb5-4cbb-8b7d-f3b75427c5ea`) |
| Historical live before this window | `5b50ca2c338b34afffa5796d6fa79298a7b27d4c` (`7795bc89-daaa-43a8-8213-581e01c0f460`) |
| `dd965bc2` | Older inactive deploy (2026-08-18). Repo docs that cited it as current were stale. |
| Health | `ok=true`, `authRequired=true`, `insecureDevAuth=false`, PM+Capital `sharepoint` MI |
| Synthetic Graph | `INTEGRATION_CAPITAL_ALLOW_SYNTHETIC_GRAPH=false` (unchanged) |

## Elite

| Item | Value |
|------|--------|
| SWA | `swa-atlas-elite-os-dev` / `rg-atlas-dev` (Free SKU; production URL) |
| URL | `https://zealous-rock-0090c7e1e.7.azurestaticapps.net` |
| Asset | `/assets/index-Ba9JfZv2.js` |
| Stamped SHA | `b6a3c9c50747f3bc06b0de870d9906c4b9424152` |
| Flags | `VITE_ATLAS_ENV=production`, `VITE_ALLOW_SAMPLE_FALLBACK=false`, `VITE_ALLOW_DEV_OWNER_LOGIN=false` |
| Snapshot | empty `client360-snapshot.json` (`source=disabled-in-production`) |
| Prior asset | `/assets/index-cEa6tmpZ.js` / SHA `632b7ae32e94afe9d839d39f1dff20625e86789e` |

## Rollback

Gitignored `deployment/artifacts/hub-rollback/pre-3f794f7a8b51c094dba7e4cd5febd0c6bc81c6a6-20260820-014626.zip` is the captured pre-window Hub (`5b50ca2`). Restore with `deployment/scripts/Rollback-HVCGCapitalHub.ps1`. Do not commit the zip, Kudu copies, or tokens.

## Live SYN01 certification (this window)

- Website intake created `HVCG_Leads` item `21` (idempotent replay confirmed).
- First convert on `3f794f7` failed: Hub stamped `ClientCode` onto `HVCG_Leads` (column does not exist). Graph also drops `ClientIdLookupId` on `HVCG_Opportunities`.
- Fix `b6a3c9c` stops the lead `ClientCode` write and recovers opportunity `clientCode` from the converted Discovery title.
- Convert reused SYN01; opportunity `4`; Won → activation required; request → review → Manny authorize → verify.
- SYN01 `ClientStage=Active Client`. `entitlementProvisioned`, `entraGroupProvisioned`, `sharePointLibraryProvisioned`, and `portalAccessProvisioned` all false. Idempotency `client-activate|SYN01|4`.
- ACCG01 was GET-only. Forged ACCG01 authorize without ETag/opportunity was blocked.
- Capital: SYN01 create, `*` 422, SYN99 403, synthetic Graph stayed false. Full recorded-only lender package submit stayed fail-closed (`PREPARED` cannot skip to `APPROVED_FOR_SUBMISSION`; empty lender package is 422). No external lender send.

## Out of scope

360, Copilot, and GCC were not deployed in this window.
