# Defect log — Executive Dashboard (Elite OS)

**Release candidate:** elite-os-dev-uat / Sprint 14 branch  
**Environment tested:** Azure SWA Dev (live) + source build check  
**Updated:** 2026-07-20

| ID | Sev | Title | Status | Evidence |
|----|-----|-------|--------|----------|
| DEF-ELITE-001 | S0 | Fabricated finance KPIs on live Dev SWA (Revenue 1.25M USD, Funding 4.8M USD) | **OPEN** | Browser home; violates no-fabricated-finance |
| DEF-ELITE-002 | S1 | Nav modules marked Soon; Client/Capital/Projects/Docs/AI are placeholders | **OPEN** | `/clients` gated empty state |
| DEF-ELITE-003 | S1 | Deployed SWA ≠ Sprint 14 source; candidate cannot build (TS errors) | **OPEN** | build fail Modules.tsx / ModuleScaffold import |
| DEF-ELITE-004 | S1 | SPA RBAC incomplete — defaults all signed-in users to Owner; required roles not testable | **OPEN** | `src/security/rbac.ts` |
| DEF-ELITE-005 | S1 | Task create/update and approval approve/reject not functional on live deploy | **OPEN** | Approvals display-only; modules gated |
| DEF-ELITE-006 | S2 | Sample fallback + sample clients (Apex/Northstar/Cascade) without Owner UAT gate clarity for demos | **OPEN** | Home widgets |
| DEF-ELITE-007 | S2 | Hardcoded display name `Manny Barela` when unsigned; role label not from Entra | **OPEN** | ExecutiveDashboard.tsx source |
| DEF-ELITE-008 | S3 | Bundle ~884KB single chunk (perf debt) | **OPEN** | SWA asset size |
| DEF-ELITE-009 | S2 | Required role set (HVCG Owner, Team Member, Client Executive, Client Team Member, Read-Only Advisor, Administrator) not mapped/enforced in Elite SPA | **OPEN** | vs PERMISSIONS_MATRIX / SECURITY_MODEL |

## Build blockers (Sprint 14 branch)

```
Modules.tsx TS2322 — DataTable row key/type mismatch (documentCategories)
ModuleScaffold.tsx TS2307 — import '../data/workspaces' should be '../../data/workspaces'
```
