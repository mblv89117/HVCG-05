# Client knowledge recovery ledger

Cycle: 2026-08-22T07:04Z
Durable Agent: `bc-cb506396-3ccc-5ac1-b2e3-58b3cd1b8438`
Live Hub: `https://app-atlas-integration-hub.azurewebsites.net` commit `e63279a8`
Path: Hub SharePoint MI (`id-atlas-prod` via Hub) — not Graph sites search
Principal this cycle: Cursor automation SP Hub-audience token (oid prefix `ac8fd7e6`, entitled to SYN01)

Do not treat this table as a populated Atlas. Real-client rows were not visible to this principal.

| SOURCE | CLIENT | CLIENTCODE | DATA TYPE | DISCOVERED | ACCESSIBLE | INDEXED | CLASSIFIED | OPERATIONALIZED | VALIDATED | EXCEPTIONS | BLOCKER |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Hub MI GET /api/pm/clients | SYNTHETIC QA — Atlas Capital Operations | SYN01 | SYNTHETIC_QA | yes | yes | yes (queried) | yes | no | yes | Activation verified; library/portal/entitlement not provisioned | Not a customer record |
| Hub MI GET /api/pm/documents | SYN01 library/files | SYN01 | knowledge_ledger_v1 | yes | yes | yes | yes | no | yes | honestEmpty count=0 | No library URL on entitled row |
| Hub MI GET /api/pm/clients/:code | Hart Family Dental | HFD01 | client | catalog | no | no | catalog | no | no | 404 fail-closed | Not in this principal's entitled set |
| Hub MI GET /api/pm/clients/:code | Christie's Place LLC | CPL01 | client | catalog | no | no | catalog | no | no | 404 fail-closed | Not in this principal's entitled set |
| Hub MI GET /api/pm/clients/:code | Prodigy Games LLC | PDG01 | client | catalog | no | no | catalog | no | no | 404 fail-closed | Not in this principal's entitled set |
| Hub MI GET /api/pm/clients/:code | That's Kava LLC | KAVA01 | client | catalog | no | no | catalog | no | no | 404 fail-closed | Not in this principal's entitled set |
| Hub MI GET /api/pm/clients/:code | ACCG | ACCG01 | client read-only | catalog | no | no | catalog | no | no | 404 fail-closed; no write window | Not in this principal's entitled set |
| Hub MI GET /api/pm/clients/:code | Colorado Craft Beef | CCB01 | client | catalog | no | no | catalog | no | no | 404 fail-closed | Not in this principal's entitled set |
| Hub MI GET /api/pm/clients/:code | Lien Partners | LIEN01 | client | catalog | no | no | catalog | no | no | 404 fail-closed | Not in this principal's entitled set |
| Entity catalog | Loanspark | — | vendor_referral | yes | n/a | no | yes | no | n/a | No Hub client row this cycle | Remains vendor/referral |
| Entity catalog | Best Day Of My Life / Ryan Gnieski | — | reference_tenant | yes | n/a | no | yes | no | n/a | 360 Website Builder reference tenant | Not a client code |
| Graph sites search | HVS historical libraries | — | HVS_HISTORICAL | yes | no | no | yes | no | no | 401 generalException/spException | HVS_DATA_ACCESS=BLOCKED |

Search probes in entitled SYN01 scope (`Hart`, `Prodigy`, `ACCG`, `Christie`, `Kava`, `Loanspark`, `Gnieski`): HTTP 200, `results=[]`, `scope=entitled`. Honest empty.

`GET /api/pm/my-work` 200 honest-empty: `ownerResolution.reason=PM_DIRECTORY_UNAVAILABLE`.
`GET /api/pm/commercial-context` 200 entitled=true, one SYN01 Copilot recorded row.
`GET /api/pm/activations` and `GET /api/pm/knowledge` were 404 on live `e63279a8` before this branch. This branch adds `GET /api/pm/knowledge` as the entitled operating picture.

HVS_DATA_ACCESS = BLOCKED. Hub MI seeing HVCG SYN01 does not imply HVS access.

OWNER ACTIONS: none. Hub MI already inventories entitled `HVCG_Clients`. The gap is this principal's entitlement scope, not a missing Sites.Selected grant on the automation SP. Do not add the automation app to `HVCG-Client-*` groups.
