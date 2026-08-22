# SYN01 entitlement re-probe — 2026-08-22T04:48Z (after `4b9631a`)

**Orchestrator:** V3 `bc-583ac529-8ba2-4f45-9e97-8ec41dd47a6b`  
**This V3 run:** `run-e07b76f2-e213-47ba-beac-2967c119567c`  
**Session:** existing V3 Azure SP (`HVCG-Cursor-Automation-Azure-MCP` oid `ac8fd7e6-79a1-49a0-9997-59cb023e3a39`)  
**Secrets logged:** NONE

## Lineage

Live Hub SHA `4b9631a0a50e06591dd9100fb48b07e5aea7d008` matches `/health`, `/ATLAS_HUB_COMMIT.txt`, `/hub-build.json`. Unauth pm/capital 401.

## Results

| Probe | HTTP | Note |
|-------|------|------|
| Membership | **PRESENT** | typed group members fallback |
| `GET /api/pm/clients/SYN01` | **200** | was 404 |
| Opportunities | **200** count **1** | was 0 |
| SYN01 opportunities | **200** count **1** | was 0 |
| Clients | **200** count **1** | was 0 |
| Capital | **404** `not_found` | was 403 empty-scope — do not invent rows |
| `/api/pm/opportunities/1` or `999999` | **NOT CALLED** | |

## Owner action

`OD-2026-08-22-ENTITLEMENT-SYN01` **SUPERSEDED**. V3 SP was already in `HVCG-Client-SYN01` (`a8e9b1e2-b69d-4170-b0cd-6604d34884a1`). Remaining gap was Graph `checkMemberGroups` 403. `Application.Read.All` **not** requested.

This is V3 measurement, not independent LIVE_CERT. RT D38 classifies ATLAS-01/02.

Artifact: `/opt/cursor/artifacts/v3_syn01_reprobe_0448z.json`
