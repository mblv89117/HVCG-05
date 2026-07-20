# Atlas Administration — Security Review

**Scope:** Elite OS Administration product (`apps/atlas-elite-os/src/admin/**`)  
**Date:** 2026-07-20  
**Classification:** Product security review (sample-backed v1)

## Summary

The administration experience enforces least privilege at the UI and mutation layer: role gates, allowlisted permissions, high-impact confirmations, audit logging, and no secret surfaces. Residual risk remains that v1 persists only in a browser sample store and that `VITE_ATLAS_ROLE` is not yet Entra-backed.

## Controls implemented

| Control | Implementation |
|---------|----------------|
| Access gate | `canAccessAdmin` (Owner / Administrator / Executive) via `PermissionGuard` |
| No unrestricted grants | `PERMISSION_CATALOG` only; `assertKnownPermissions`; no select-all |
| Elevation limits | Owner/Administrator roles cannot be newly assigned from invite/role UI |
| High-impact confirms | `DangerConfirmDialog` for disable user, flags, fee visibility, live comms, EVA, etc. |
| Visual distinction | Danger cards/buttons for high-impact areas |
| Audit | Every `adminApi` mutation appends `AuditEvent` |
| No secrets | Integrations show status only (`secretsConfigured` boolean, no values) |
| System vs ordinary | Hub groups + impact banners |
| Validation | Invite email/roles, reference codes, financial/EVA/application validators |
| Plain language | Impact copy on every area shell |

## Threat notes

### Privilege escalation

- **Risk:** User elevates self to Owner via role UI.  
- **Mitigation:** `ownerOnlyAssign` blocks new assignment; Owner/Admin checkboxes locked when already held.  
- **Residual:** Sample store can be reset in memory; production must enforce Entra group membership server-side.

### Secret exposure

- **Risk:** Admin UI leaks API keys or connection strings.  
- **Mitigation:** Model excludes credential fields; AI settings state that keys are never managed here.  
- **Residual:** Model-driven deep-link still requires maker permissions in Dataverse — gate separately.

### Unauthorized administration

- **Risk:** Guest opens `/admin`.  
- **Mitigation:** `PermissionGuard` + `AccessDeniedState`. Verify with `VITE_ATLAS_ROLE=Guest`.  
- **Residual:** Env role is client-side until Graph/app roles ship.

### Audit gaps

- **Risk:** Changes without trail.  
- **Mitigation:** Central `commit()` always writes audit.  
- **Residual:** In-memory audit is lost on refresh; production should write `HVCG_AuditEvents` / Dataverse.

### Feature flag misuse

- **Risk:** Enabling outbound email without awareness.  
- **Mitigation:** `highImpact` flags require danger confirm + impact summary.  
- **Residual:** Downstream flows must also respect flags.

## Non-goals / residual risks

1. Sample store ≠ Entra / Dataverse source of truth.  
2. No hidden superuser path was added; do not introduce one.  
3. Microsoft authentication (MSAL) was not weakened.  
4. Live write path intentionally out of scope for this product build.

## Recommendations before production wiring

1. Map Entra `HVCG-Role-*` groups to `AtlasRole` / admin capability.  
2. Persist mutations through Dataverse with server-side authorization.  
3. Mirror audit events to Purview-backed / `HVCG_AuditEvents` lists.  
4. Keep model-driven app for maker grids; keep Elite OS as the day-to-day admin UX.
