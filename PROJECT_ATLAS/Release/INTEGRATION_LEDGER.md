# Integration Ledger — Project Atlas

**Branch:** `cursor/atlas-integration-release`  
**Maintained by:** Integration & Release Manager  
**Started:** 2026-07-20

---

## Entry 001 — Base product SoR

| Field | Value |
|-------|-------|
| Branch | `cursor/elite-ui-release-recovery` |
| Agent / owner | Elite UI / Master PM |
| Commit | `35ca684` (docs) · product deploy `ce59f8e` |
| Scope | Atlas Elite OS shell, design system, Entra MSAL, RBAC, exec/clients/projects/tasks/docs/finance modules |
| Merge method | Branch create / worktree from tip |
| Conflicts | None |
| Resolution | N/A |
| Tests run | `npm run build`; `npm run test:recovery` |
| Result | **PASS** |
| Remaining defects | DEF-ELITE-001–005/009 pending live QA; Entra client ID may be unset locally |
| Date | 2026-07-20 |

---

## Entry 002 — Knowledge rail preserve

| Field | Value |
|-------|-------|
| Branch | Uncommitted elite worktree → integration |
| Agent / owner | Knowledge / Elite |
| Commit | `798acdf` |
| Scope | `apps/atlas-elite-os/src/integrations/knowledge/*` + Admin/Exec hooks |
| Merge method | Preserve copy + commit (stash on elite retained) |
| Conflicts | None |
| Resolution | N/A |
| Tests run | Included in subsequent build |
| Result | **PASS** |
| Remaining defects | Full SharePoint grounding not live |
| Date | 2026-07-20 |

---

## Entry 003 — Plaid Sandbox stack into Elite shell

| Field | Value |
|-------|-------|
| Branch | `cursor/plaid-integration` @ `6d78514` |
| Agent / owner | Plaid Integration |
| Commit | Carried in `6402bfb` |
| Scope | `apps/atlas-plaid-api`, `packages/atlas-plaid-contracts`, docs/plaid, scripts/plaid, Banking Connections page in Elite (not full client-portal shell) |
| Merge method | Path checkout + Elite UI adaptation (Fluent) |
| Conflicts | Avoided full merge of `hvcg-client-portal` (competing shell) |
| Resolution | Authoritative shell = Elite OS; portal remains on plaid branch for reference |
| Tests run | `npm run test:plaid-api` (5/5); API health without secrets |
| Result | **PASS** (unit) · Live Link **BLOCKED** pending owner Sandbox secrets |
| Remaining defects | P0 secrets not configured; webhook URL unset |
| Date | 2026-07-20 |

---

## Entry 004 — Azure foundations (partial Sprint 11)

| Field | Value |
|-------|-------|
| Branch | `cursor/sprint11-azure-production-migration` @ `a386d81` |
| Agent / owner | Azure Platform |
| Commit | Carried in `6402bfb` |
| Scope | `infrastructure/azure/*`, `scripts/deploy-swa-dev.sh` |
| Merge method | Path checkout (did **not** overwrite Elite design-system) |
| Conflicts | Avoided by selective paths |
| Resolution | Product UI remains recovery SoR |
| Tests run | Not applicable (infra scripts) |
| Result | **PASS** (files present) · Staging deploy **NOT RUN** |
| Remaining defects | Staging apply requires owner Azure auth |
| Date | 2026-07-20 |

---

## Entry 005 — Unified navigation + client selector

| Field | Value |
|-------|-------|
| Branch | Integration local |
| Agent / owner | Integration & Release Manager |
| Commit | Carried in `6402bfb` |
| Scope | Required primary nav; Banking/Accounting/Knowledge/Automations/Reports; workspace dropdown |
| Merge method | Direct edit on Elite AppShell/App |
| Conflicts | Replaced prior Capital/Revenue/EV/AI primary items — routes retained via Reports + deep links |
| Resolution | Single NavShell; no duplicate nav systems |
| Tests run | HTTP smoke 200 on all primary routes; `tsc -b && vite build` |
| Result | **PASS** |
| Remaining defects | None for nav reachability |
| Date | 2026-07-20 |

---

## Entry 006 — QuickBooks

| Field | Value |
|-------|-------|
| Branch | `cursor/quickbooks-integration` |
| Agent / owner | QuickBooks Online Integration Specialist |
| Commit | Pending Integration Manager merge |
| Scope | `atlas-qbo-api`, contracts, Accounting Connections UI, docs, tests |
| Merge method | Do **not** auto-merge — Integration & Release Manager reviews |
| Conflicts | Expect none vs `cursor/atlas-integration-release` base (branched from it) |
| Resolution | Honest 503 when secrets missing; no fake connected state |
| Tests run | `npm run test:qbo-api` — 20/20 PASS |
| Result | **READY FOR MERGE REVIEW** (live OAuth awaits Owner secrets) |
| Remaining defects | INT-004 secrets portion OPEN; code READY |
| Date | 2026-07-20 |

---

## Explicitly not merged

| Branch | Reason |
|--------|--------|
| `cursor/track10-elite-microsoft-ui` / comms-product-timeline | Competing Elite fork |
| `cursor/finance-intelligence-sprint1` | Mock-demo dollars |
| `cursor/executive-intelligence-sprint1` | Separate mock app; Elite covers exec |
| `cursor/client-portal-sprint1` | Separate shell / BL-C1 |
| `cursor/orchestration-sprint12` | Divergent ancestry — Phase 2 |
| `cursor/revenue-sprint4-activation` | Hold per Master PM |
| Into `main` / production | No QA GO |
