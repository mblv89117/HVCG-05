# Deployment and Release Notes — Elite OS (Product)

| Field | Value |
|-------|--------|
| Audience | Administrators, deployment partners |
| Status | CURRENT pointers for Development hosting |
| Last verified | 2026-07-20 |
| Product | Atlas Elite OS (Track 10) |
| Production Elite OS | **Not deployed** (do not document as live) |

## Current (Development)

| Action | Documented location |
|--------|---------------------|
| Local run | `apps/atlas-elite-os/README.md` — `npm run dev` → `http://127.0.0.1:5180` |
| Build | `npm run build` in Track 10 worktree |
| Env vars | `PROJECT_ATLAS/Architecture/Track10_Environment_Matrix.md` |
| Entra SPA | `Track10_Entra_App_Registration.md` + `OWNER_ACTIONS_REQUIRED_TRACK10_MICROSOFT.md` |
| SWA hosting plan | `Track10_Hosting_Teams_Rollback.md` |
| Rollback | Same hosting doc — remove Teams/sitemap link; revert SWA; does **not** remove Dataverse tables |
| Model-driven admin | Dev Dynamics URL in Elite OS README |

## HVCG OS platform releases (separate from Elite UI)

| Version | Notes |
|---------|-------|
| `releases/v1.0.0` | Historical platform release artifacts |
| `releases/v1.1.0` | Platform release notes, checklist, rollback |
| Track 1 Live—Internal | Deployment-engineer freeze package — **CRM Prod slice**; not Elite OS |

## Rules

1. SWA CLI “production” slot naming still means **HVCG Development** business environment unless owner gates otherwise (`Track10_Hosting_Teams_Rollback.md`).
2. No client secrets in SPA env files.
3. `VITE_BLOCK_LIVE_CLIENT_COMMS=true` until owner gate.
4. Update this page whenever Track 10 ships a new Dev hosting URL.

## Planned

- Staging environment matrix rows
- Production Elite OS (owner-gated) — **not started**
