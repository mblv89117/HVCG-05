# Implementation guide — Client Portal & Secure Data Rooms

## Branch

**`cursor/client-portal-data-rooms`** (exclusive).  

`cursor/executive-command-center` is owned by the Executive Command Center Option A package; portal commits were removed there as contamination. Do not re-merge portal into that branch without integrator coordination.

## Build order

1. Schema lists + library template + migration (done)
2. Architecture / permissions / visibility docs (done)
3. Flows Off + screen specs + notification specs (this package)
4. Offline validation
5. Owner: schema repair → Maker import → smoke

## Staff surfaces

| Artifact | Path |
|----------|------|
| Portal admin screen | `src/power-apps/screens/scrPortalAdmin.md` |
| Data rooms screen | `src/power-apps/screens/scrDataRooms.md` |
| Formulas | `src/power-apps/formulas/PortalNamedFormulas.fx` |

## Client surface

Deferred — see `POWER_PAGES_POWER_APPS_RECOMMENDATION.md`.

## Feature flags (conceptual)

| Flag | Default | Purpose |
|------|---------|---------|
| Clients.PortalEnabled | false | Unlock portal filters |
| Clients.ExternalAccessAllowed | false | Permit guests at all |
| DataRooms.ExternalAccessAllowed | false | Room guest unlock |
| HVCG_PORTAL_ENABLE_CLIENT_NOTIFY | false | Allow client email path |

## Done when

- Offline tests PASS
- Security review PASS (Dev)
- Handoff package complete
- External access still disabled
