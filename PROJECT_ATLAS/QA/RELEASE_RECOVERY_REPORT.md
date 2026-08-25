# Executive Dashboard Release Recovery Report

**Branch:** `cursor/elite-ui-release-recovery`  
**Base commit:** `a571a8a` (Sprint 14 SoR)  
**Master PM:** Recovery deployed to Dev SWA — **NO-GO remains** until QA written GO  

## Defect board

| Defect | Owner | Status | Dependency |
|--------|-------|--------|------------|
| DEF-ELITE-001 Fabricated finance | Elite UI + Data Engineering | Deployed — pending QA live | Live KPI audit on SWA |
| DEF-ELITE-002 Clients placeholder | Elite UI + Client Portal | Deployed — pending QA live | `/clients` + `/clients/ws-ccb` |
| DEF-ELITE-003 Build / SHA mismatch | Elite UI + Azure Platform | Deployed — SHA in footer/bundle | QA confirm footer = commit |
| DEF-ELITE-004/009 Role matrix | Security Engineering + Elite UI | Deployed — pending QA identities | Signed-in + Entra roles, or rebuild with `VITE_ATLAS_ROLE_SIM` (never anonymous Owner) |
| DEF-ELITE-005 Tasks & approvals | Operations Hub + Elite UI + Power Platform | Deployed — pending QA live | Dataverse + mutate role |

## Expected merge sequence

1. ~~Commit recovery~~ → `ce59f8e`
2. ~~Deploy Dev SWA from that commit~~
3. **QA live retest** DEF-001 → 005 / 009
4. Written GO → then staging / Owner UAT consideration

## Commit evidence

| Field | Value |
|-------|-------|
| Recovery commit | `ce59f8e58e0abd584b8c8c552e10940010982be3` |
| Parent lineage | `5175e1a` (recovery checkpoint) ← `a571a8a` (Sprint 14) |
| Remote branch | `origin/cursor/elite-ui-release-recovery` |

## Deployment evidence

| Field | Value |
|-------|-------|
| Environment | Dev SWA (`swa-atlas-elite-os-dev` / `rg-atlas-dev`) |
| URL | https://zealous-rock-0090c7e1e.7.azurestaticapps.net |
| Deployment ID | `default` build on `swa-atlas-elite-os-dev` |
| Deployment time (UTC) | `2026-07-20T02:27:48Z` (`lastUpdatedOn`) |
| Built at (UTC) | `2026-07-20T02:27:12Z` |
| Bundle | `/assets/index-BcqkzVkr.js` |
| Live SHA in bundle | `ce59f8e58e0abd584b8c8c552e10940010982be3` |
| Pre-deploy gates | `tsc -b`, `vite build`, `recovery-tests.mjs` PASS |
| Live finance scan | No `1.25M` / `4.8M` / `$1.25` / `$4.8` / `Revenue (sample)` in deployed JS |

## QA retest status

**Ready for QA** — live Dev SWA updated. **Not GO.** Staging / production / Owner-complete UAT remain blocked.

### Retest checklist (live app only)

- [ ] No `$1.25M` / `$4.8M` / sample finance on Executive Home or finance modules
- [ ] Pending labels only: Awaiting verified data / Data connection pending / Not yet calculated / No verified records available
- [ ] Connection metadata: source, period, last refresh, verification status
- [ ] `/clients` portfolio + Colorado Craft Beef detail (`/clients/ws-ccb`)
- [ ] No “coming next” / placeholder nav destinations
- [ ] Footer build SHA matches `ce59f8e`
- [ ] Signed-out → not Owner; signed-in without role claim → Access denied unless Dev role sim rebuilt for that identity
- [ ] Restricted roles cannot mutate approvals / open Admin (rebuild with `VITE_ATLAS_ROLE_SIM=Read-Only Advisor` for that pass)
- [ ] Task create/edit/reopen and approval approve/reject persist to Dataverse with audit notes

### Dev role-sim note

This Dev deploy was built with `VITE_ALLOW_ROLE_SIM=true` and `VITE_ATLAS_ROLE_SIM=HVCG Owner` so signed-in QA can exercise mutate flows. Simulation does **not** apply when signed out. Production builds must set `VITE_ATLAS_ENV=production` (sim disabled) and rely on Entra app roles.
