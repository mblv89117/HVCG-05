# BACKLOG

## Immediate — Install / upgrade to v1.1.0

- [ ] Fresh install: `pwsh -File ./deployment/install/Install-HVCGOS.ps1 -Environment development`
- [ ] **Or** upgrade from 1.0.0: `pwsh -File ./deployment/upgrade/Upgrade-HVCGOS.ps1 -Environment development -TargetVersion 1.1.0`
- [ ] Health + operational health + post-deploy validation
- [ ] Run backup: `pwsh -File ./deployment/backup/Backup-HVCGOS.ps1 -Environment development`
- [ ] Author PP components; `Pack-HVCGOSRelease.ps1`; export managed zip
- [ ] Promote Test → Production via pipeline gates

## V1.x upgrades

- [ ] Ship additive packs under `releases/migrations/` for each minor/patch
- [ ] Never rebuild customer data from sample-data

## Version 2 (see VERSION2_ROADMAP.md + POLICY_v2_0_0.md)

- [ ] Portal, agents, Dataverse evaluation with migration packs preserving ClientCode keys

---

## Completed — v1.1.0 (2026-07-14)

- [x] Intelligence Layer — `HVCG_Relationships` + query catalog
- [x] AI orchestration foundation (11 lists + `JobId` linkage to existing `HVCG_AI_*` queues)
- [x] Backup / restore / DR scripts and documentation
- [x] Operational monitoring — `Invoke-HVCGOSOperationalHealth.ps1`, `HVCG_OperationalAlerts`, System Health Dashboard spec
- [x] v1.1.0 release packaging (`releases/v1.1.0/`, migration pack `20260714_002`)
