# Hub entitlement group-members fallback — DEPLOYED 0451Z

**Orchestrator:** V3 `bc-583ac529-8ba2-4f45-9e97-8ec41dd47a6b`  
**This V3 run:** `run-e07b76f2-e213-47ba-beac-2967c119567c`  
**Mechanism:** `Deploy-HVCGCapitalHub.ps1 -Apply` from `/tmp/hvcg-entitlement-members`  
**App Settings:** **NOT** mutated

## Candidate

| Field | Value |
|-------|--------|
| SHA | `4b9631a0a50e06591dd9100fb48b07e5aea7d008` |
| Parent | `ed34f2f86fa1a0ce0c4c6ff6ab255d6eff32aa3a` |
| Tests | **343/343** |
| Section 27 | **PASS_HUB_ONLY** |
| OneDeploy | `7e3f65a2-948b-4f7d-959b-dd47576170b2` |
| Immediate rollback | `ed34f2f` / `798f0dd6` |

## Path

`checkMemberGroups` on `directoryObjects/{spOid}` still 403 without Application.Read.All. Fallback: typed `GET /groups/{id}/members/microsoft.graph.user` and `/microsoft.graph.servicePrincipal`. Live-proved GroupMember.Read.All. Default `/members` omits SPs.

## Lineage

`/health` + `/ATLAS_HUB_COMMIT.txt` + `/hub-build.json` = `4b9631a`. authRequired=true. insecureDevAuth=false. Unauth pm/capital 401. Elite `75d0c59` unchanged.

## V3 AUTH_SESSION reprobe

| Probe | Before (`ed34f2f`) | After (`4b9631a`) |
|-------|--------------------|-------------------|
| SYN01 client | 404 | **200** |
| Opportunities | 0 | **1** |
| SYN01 opportunities | 0 | **1** |
| Capital | 403 no entitled clients | **404** `not_found` (empty-scope 403 gone) |
| Membership | EMPTY | **PRESENT** |

OD-2026-08-22-ENTITLEMENT-SYN01 **SUPERSEDED** (group membership already YES; remaining gap was Graph caller path). Application.Read.All **not** requested. LIVE_CERT=NO. D38 issued for independent ATLAS-01/02 classify.
