# Phase 1 safety check — Opportunity CRM SharePoint migration (Dev)

**Purpose:** Pre-flight gate before owner runs Dev schema repair for Opportunity CRM.  
**Artifacts reviewed:** `releases/migrations/20260715_001_opportunity_crm_module.json`, `releases/migrations/diffs/opportunity_crm_v1.json`, CRM list schemas, CRM views.  
**Does not connect to SharePoint / tenant.**

---

## Pass criteria (all required)

| # | Check | Status | Evidence |
|---|--------|--------|----------|
| 1 | Migration marked additive | **PASS** | `"additiveOnly": true` on pack |
| 2 | Diff has no destructive ops | **PASS** | Top-level keys: `description`, `addLists`, `addColumns` only |
| 3 | No list/column deletes or renames | **PASS** | No `removeLists` / `removeColumns` / rename keys |
| 4 | New list is empty schema only | **PASS** | `HVCG_OpportunityActivities` via `addLists`; no item mutations in pack |
| 5 | Existing lists get columns only | **PASS** | Columns on `HVCG_Opportunities` + `HVCG_CapitalOpportunities` only |
| 6 | Diff columns exist in repo schemas | **PASS** | Unit: `test_opportunity_migration.py` |
| 7 | Bridge lookups point both ways | **PASS** | Opp→Capital + Capital→Opp |
| 8 | Repair path is idempotent | **PASS** | `Add-HVCGFieldFromSchema` skips existing type-matched fields; Repair does not delete sites/lists |
| 9 | Semver does not force Upgrade apply | **PASS** | Pack is `1.1.0`→`1.1.0`; Dev apply path is **Repair**, not Upgrade |
| 10 | Views are additive titles | **PASS** | New/extended CRM views in `command-center-views.json`; Install-HVCGViews is create/ensure style |

---

## Known risks (accept before Dev repair)

| Risk | Severity | Mitigation |
|------|----------|------------|
| `Upgrade-HVCGOS.ps1` will not apply this pack when already at 1.1.0 | Medium (process) | Use Repair command in `MIGRATION_PLAN_DEV.md` |
| `Invoke-HVCGListDiff` skips Lookup columns on `addLists` | Medium (if Upgrade/diff used alone) | Prefer Repair (`Install-HVCGListsFromSchema` two-pass lookups) |
| Dev already missing `HVCG_OpportunityActivities` | Low | Expected; Repair creates list + fields |
| Choice fields already present with different choices | Low | Repair reports type mismatch / compliance fail — do not force-delete |
| Seed write after schema | Low | Use `-SkipSeed` if only schema desired |

---

## Forbidden during Phase 1

- Deploy / backup / restore / tenant connection from this audit agent  
- Production repair  
- Editing Power Apps, Power Automate, `PROJECT_STATUS.md`, `NEXT_SESSION.md`, `deployment/lib`, Deploy scripts  

---

## Sign-off checklist (owner)

- [ ] Read `docs/crm/MIGRATION_PLAN_DEV.md`
- [ ] `python3 tests/unit/test_opportunity_migration.py` → PASS
- [ ] Dev credentials / PnP auth ready
- [ ] Run Repair with `-Environment development`
- [ ] Confirm schema report `Compliant` / no CRM list drift
- [ ] Spot-check Activities list + bridge columns + CRM views
- [ ] Re-run Repair once to confirm idempotent skips

**Audit decision:** Phase 1 Dev schema repair is **SAFE TO PROCEED** via Repair only.
