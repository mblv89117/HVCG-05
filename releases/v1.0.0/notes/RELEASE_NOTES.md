# HVCG OS v1.0.0 — Release Notes

**Release date:** 2026-07-14  
**Codename:** Foundation  
**Schema version:** 1.0.0  

## Highlights

- Installable **HVCG OS** with semantic versioning
- SharePoint data plane: **68** lists (CRM, capital, delivery, finance, ops, AI queues, portal prep, system info)
- **21** project templates
- Additive upgrade engine (`Upgrade-HVCGOS.ps1`) preserving customer data
- Soft rollback (version marker; data retained)
- Health checks + post-deployment validation
- Power Platform **managed** solution path for Test/Production
- CI pipeline Dev → Test → Production gates

## Install

```powershell
pwsh -File ./deployment/install/Install-HVCGOS.ps1 -Environment development
```

## Upgrade from unversioned preview

Treat as fresh baseline if `HVCG_SystemInfo` missing:

```powershell
pwsh -File ./deployment/upgrade/Upgrade-HVCGOS.ps1 -Environment development -TargetVersion 1.0.0
```

Existing list items are **not** deleted; missing lists/columns are added.

## Breaking changes

None (first GA release).

## Known limitations

- Canvas app / flows require tenant authoring + connection consent (see PACKAGING.md)
- Managed solution zip is produced after first Dev authoring (`Pack-HVCGOSRelease.ps1`)
- SharePoint column removal is not automated on rollback (by design)

## Artifacts

- `artifacts/schema-snapshot.json`
- `checksums/sha256.json`
- `artifacts/HVCGOS_managed_1.0.0.zip` (after pac export)

## Upgrade path forward

| From | To | Method |
|------|-----|--------|
| 0.0.0 | 1.0.0 | Baseline migration |
| 1.0.0 | 1.x | Additive migration packs |
| 1.x | 2.0.0 | See `releases/migrations/POLICY_v2_0_0.md` |
