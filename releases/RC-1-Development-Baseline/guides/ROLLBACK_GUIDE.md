# Rollback Guide — RC-1 Development Baseline

**Package:** `releases/RC-1-Development-Baseline`  
**Scope:** Soft rollback for Development packaging / future target imports of this RC  
**Production:** No Production import was performed in this milestone.

---

## Identity

| Item | Value |
|------|--------|
| Solution zip | `solution/HVCGCommandCenterDev-unmanaged-20260716-004621.zip` |
| SHA-256 | `b08b45bc2aad8605d13a6dbce89eb01895510ae64ab452f2ea050a369f9e3522` |
| Prior export (pre env-var packaging) | `deployment/packages/crm/HVCGCommandCenterDev-unmanaged-20260716-003427.zip` |
| Branch | `agent/crm-dev-validation` |

---

## Policy

1. Prefer **deactivate first**, then fix or revert — do not leave mis-pointed flows On.
2. Rolling back solution membership of env vars does **not** delete env vars from the environment.
3. Never “fix forward” into Production without a new approved RC.

---

## Development rollback scenarios

### A. Bad solution import / upgrade in Dev

1. Turn CRM flows **Off**.
2. Re-import prior known-good unmanaged zip (or restore from maker history).
3. Re-bind connection references if needed.
4. Re-run `deployment/scripts/crm/Invoke-CrmLeadQualifiedSmoke.ps1` and `Invoke-CrmAllSmoke.ps1`.
5. Confirm `hvcg_CrmEnableTeamsNotify=false`.

### B. Env vars wrongly pointed after settings change

1. Restore prior Environment Variable **current values** in Maker (or re-apply known-good settings).
2. Confirm CRM flow parameters still match intended site.
3. Re-smoke before re-activating anything that was turned Off.

### C. Undo “add to solution” for env vars only

1. In Maker → Solutions → `HVCGCommandCenterDev` → remove Environment Variable Definition/Value components from the solution (do not delete from environment unless intentional).
2. Re-export if a new package is required.

---

## Future Production rollback (planning only — not executed)

If a future approved Prod import of this RC fails:

1. Deactivate CRM flows immediately.
2. Roll back the solution layer / re-import prior managed version.
3. Restore Prod env var values and connection bindings from the last known-good Prod settings file.
4. Open an incident with `integration` / QA and `master-pm`.

---

## Evidence to retain

- This RC folder + `checksums/sha256.json`
- Smoke JSON under `smoke/`
- `validation/ENV_VAR_GAP_VALIDATION.md`
