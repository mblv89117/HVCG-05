# Atlas live release — 2026-08-20

Honesty rule: this file records **what Azure is running**, not what a worktree contains.

## Hub

| Item | Value |
|------|--------|
| App | `app-atlas-integration-hub` / `rg-atlas-prod` |
| URL | `https://app-atlas-integration-hub.azurewebsites.net` |
| Running SHA | `940a4849577ad5356da86850e2eccdbf3fe4e86b` |
| Azure deployment ID | `9b406df7-984c-43c0-a4e1-52a291eb79b3` |
| Previous live SHA | `b6a3c9c50747f3bc06b0de870d9906c4b9424152` (`3f62750c-2909-49d5-b25e-d1e119843e2e`) |
| Convert-stage ancestor | `ec71350` (Lead → Prospect on reuse) |
| Historical live before this window | `5b50ca2c338b34afffa5796d6fa79298a7b27d4c` (`7795bc89-daaa-43a8-8213-581e01c0f460`) |
| `dd965bc2` | Older inactive deploy (2026-08-18). Repo docs that cited it as current were stale. |
| Health | `ok=true`, `authRequired=true`, `insecureDevAuth=false`, PM+Capital `sharepoint` MI |
| Synthetic Graph | `INTEGRATION_CAPITAL_ALLOW_SYNTHETIC_GRAPH=false` (unchanged) |

## Elite

| Item | Value |
|------|--------|
| SWA | `swa-atlas-elite-os-dev` / `rg-atlas-dev` (Free SKU; production URL) |
| URL | `https://zealous-rock-0090c7e1e.7.azurestaticapps.net` |
| Asset | `/assets/index-DpGJPHPN.js` |
| Stamped SHA | `940a4849577ad5356da86850e2eccdbf3fe4e86b` |
| Flags | `VITE_ATLAS_ENV=production`, `VITE_ALLOW_SAMPLE_FALLBACK=false`, `VITE_ALLOW_DEV_OWNER_LOGIN=false` |
| Snapshot | empty `client360-snapshot.json` (`source=disabled-in-production`) |
| Prior asset | `/assets/index-Ba9JfZv2.js` / SHA `b6a3c9c50747f3bc06b0de870d9906c4b9424152` |

## Rollback

Gitignored `deployment/artifacts/hub-rollback/pre-940a484-from-b6a3c9c.zip` is the immediately prior healthy Hub (`b6a3c9c`). Pre-window Hub (`5b50ca2`) remains `deployment/artifacts/hub-rollback/pre-3f794f7a8b51c094dba7e4cd5febd0c6bc81c6a6-20260820-014626.zip`. Restore with `deployment/scripts/Rollback-HVCGCapitalHub.ps1`. Do not commit the zip, Kudu copies, or tokens. Do not roll back a healthy release unless P0/P1.

## Live SYN01 certification (this window)

- Website intake created `HVCG_Leads` item `21` (idempotent replay confirmed).
- First convert on `3f794f7` failed: Hub stamped `ClientCode` onto `HVCG_Leads` (column does not exist). Graph also drops `ClientIdLookupId` on `HVCG_Opportunities`.
- Fix `b6a3c9c` stops the lead `ClientCode` write and recovers opportunity `clientCode` from the converted Discovery title.
- Convert reused SYN01; opportunity `4`; Won → activation required; request → review → Manny authorize → verify.
- SYN01 `ClientStage=Active Client`. `entitlementProvisioned`, `entraGroupProvisioned`, `sharePointLibraryProvisioned`, and `portalAccessProvisioned` all false. Idempotency `client-activate|SYN01|4`.
- ACCG01 was GET-only. Forged ACCG01 authorize without ETag/opportunity was blocked.
- Capital: SYN01 create, `*` 422, SYN99 403, synthetic Graph stayed false. Full recorded-only lender package submit completed through the governed attestation path on `b6a3c9c`: `CLIENT_CONFIRMATION_REQUIRED → CLIENT_CONFIRMED → APPROVED_FOR_SUBMISSION → submissions`. Submission `sub-a1384526-d064-4d42-9cc4-0d7dee93cdce`, stage Submitted, `recordedOnly=true`, replay `created=false`. No external lender send.
- Convert-stage defect (reuse left Lead) fixed in `ec71350` and live on Hub `940a484`. Recert fixture SYNT67: Lead → Prospect; SYN01 not downgraded.

## Out of scope

360, Copilot, and GCC were not deployed in this window.
