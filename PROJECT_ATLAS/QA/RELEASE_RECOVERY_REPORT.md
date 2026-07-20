# Executive Dashboard Release Recovery Report

**Branch:** `cursor/elite-ui-release-recovery`  
**Base commit:** `a571a8a` (Sprint 14 SoR)  
**Master PM:** Recovery fixes implemented — **NO-GO remains** until QA live retest GO  

## Defect board

| Defect | Owner | Status | Dependency |
|--------|-------|--------|------------|
| DEF-ELITE-001 Fabricated finance | Elite UI + Data Engineering | Fixed in source — pending QA live | Redeploy + live KPI audit |
| DEF-ELITE-002 Clients placeholder | Elite UI + Client Portal | Fixed in source — pending QA live | `/clients` + `/clients/ws-ccb` |
| DEF-ELITE-003 Build / SHA mismatch | Elite UI + Azure Platform | Fixed in source — pending redeploy | SWA from recovery SHA; footer badge |
| DEF-ELITE-004/009 Role matrix | Security Engineering + Elite UI | Fixed in source — pending QA identities | Entra app roles or Dev `VITE_ATLAS_ROLE_SIM` (signed-in only; never default Owner) |
| DEF-ELITE-005 Tasks & approvals | Operations Hub + Elite UI + Power Platform | Fixed in source — pending QA live | Dataverse write + role with mutate |

## Expected merge sequence

1. Commit recovery on `cursor/elite-ui-release-recovery`
2. Deploy Dev SWA from that commit only
3. QA live retest DEF-001 → 005 / 009
4. Written GO → then consider staging / Owner UAT

## Commit evidence

| Field | Value |
|-------|-------|
| Recovery commit | *(filled after commit)* |
| Parent | `a571a8a` |

## Deployment evidence

| Field | Value |
|-------|-------|
| Environment | Dev SWA (`swa-atlas-elite-os-dev`) |
| URL | https://zealous-rock-0090c7e1e.7.azurestaticapps.net |
| Deployment ID | *(filled after deploy)* |
| Deployment time (UTC) | *(filled after deploy)* |
| Footer SHA must match | Recovery commit |

## QA retest status

**Not started** — blocked until redeploy completes. Do not treat as staging/production/Owner-UAT ready.

### Retest checklist (live app only)

- [ ] No `$1.25M` / `$4.8M` / sample finance on Executive Home or finance modules
- [ ] Pending labels only: Awaiting verified data / Data connection pending / Not yet calculated / No verified records available
- [ ] Connection metadata: source, period, last refresh, verification status
- [ ] `/clients` portfolio + Colorado Craft Beef detail (`/clients/ws-ccb`)
- [ ] No “coming next” / placeholder nav destinations
- [ ] Footer build SHA matches deploy commit
- [ ] Signed-in without role → Access denied (not Owner)
- [ ] Restricted roles cannot mutate approvals / open Admin
- [ ] Task create/edit/reopen and approval approve/reject persist to Dataverse with audit notes
