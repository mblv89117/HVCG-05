# Integration Readiness Report — Client Portal & Data Rooms → Executive Dashboard Release

**Module:** Client Portal & Secure Data Rooms  
**Agent:** `client-portal` / orchestration `client-workspace`  
**Branch:** `cursor/client-portal-sprint1`  
**Worktree:** `.worktrees/client-portal-sprint1`  
**Date:** 2026-07-20  
**Disposition:** Ready for **integration planning + QA** — **not** ready for independent deploy or live invites (BL-C1)

---

## 1. Executive summary

The Client Portal CCB workspace is **feature-complete as a reference product module**. Per Atlas ADR / Master PM Exec Dashboard guidance, Elite OS (`atlas-elite-os`) remains the **Executive Dashboard UX system of record**. Portal surfaces must integrate **as adapters / modules inside Elite**, not as a competing daily shell.

**Colorado Craft Beef** relationship facts are aligned with Elite `workspaces.ts` (`ws-ccb`). Financial values are **not fabricated** — screens use:

- `Awaiting verified data`
- `Pending verification`
- `Not yet calculated`

---

## 2. Merge dependencies

| Dependency | Owner | Status | Gate |
|------------|-------|--------|------|
| Elite OS Executive Dashboard SoR tip | Elite UI / Master PM | Required first | Freeze Sprint 14 / recovery tip before porting portal modules |
| Owner UAT of Elite Home + `/clients/ws-ccb` | QA & Release / Master PM | Required | Do not merge portal SPA as parallel frontend |
| Shared CCB seed package (or Elite import) | Elite UI + Client Portal + Data Engineering | Not started | Eliminate duplicate `workspaces.ts` ↔ `coloradoCraftBeef.ts` |
| Entra app roles matrix | Security Engineering + Administration | Partial | Portal now uses Exec release role names; Entra claim mapping still Elite-owned |
| Classic SharePoint data-rooms package | Client Portal Track 4 | Separate track | `cursor/client-portal-data-rooms` — after SPA adapter plan; D-003 / BL-C1 |
| Agent-comms exclusive merge order | Master PM | Known | Exec → Portal adapters → Ops/Finance adapters |

**Do not:** merge `apps/hvcg-client-portal` wholesale into `main` as a second production SPA for this release.

---

## 3. UI dependencies

| Item | Detail |
|------|--------|
| Design system | Elite uses `@hvcg/atlas-design-system` + Fluent; portal is standalone Vite CSS — **re-skin required** when porting screens |
| Navigation target | Prefer Elite routes under `/clients/ws-ccb/*` (detail, documents, tasks) over portal shell |
| Screens ready to port | Data room, document requests, capital roadmap, approvals, activity, notifications (in-app) |
| Screens already in Elite | Clients/CCB profile, Projects (`prj-ccb-capital`), Tasks/action center, Documents, Enterprise Value, Notifications, Communications |
| Branding | HVCG forest/gold language is compatible; tokens must move to design-system |

---

## 4. Data dependencies

| Surface | Elite today | Portal today | Integration need |
|---------|-------------|--------------|------------------|
| CCB identity | `ws-ccb` in `workspaces.ts` | `cli-ccb` / `CCB` | ID mapping table (`ws-ccb` ↔ `cli-ccb`) |
| Relationship facts | Verified | Verified (copied) | Single shared module |
| Revenue pipeline | Elite / Revenue Systems | Portal lender pipeline (structure only) | Bind to Revenue Systems SoR; keep pending labels until verified |
| Projects | `portfolioProjects` / Elite projects | Portal projects | Filter by `workspaceId=ws-ccb` |
| Tasks / approvals | Elite + Dataverse when signed in | Mock | Prefer Dataverse adapters; portal mocks as fixtures |
| Documents | Elite documents + SharePoint package | Mock data room | SharePoint / Graph adapters; inherit ACLs |
| Enterprise Value | Elite EV page + pending KPIs | Portal EV pending | Same pending vocabulary; no invented EV |
| Executive Intelligence | Elite briefs / AI modules | Portal AI insight (structure) | Gate on AI Governance; client-safe only |
| Notifications | Elite notifications | In-app + EmailDisabled | Keep outbound disabled until BL-C1 |

**Verified production data rule:** If Dataverse/SharePoint value missing → show pending labels only. Never fabricate currency.

---

## 5. Security dependencies

| Control | Portal status | Integration requirement |
|---------|---------------|-------------------------|
| Client isolation | Enforced by `clientId` filters + ACCG fixture test | Elite must filter by workspace + Entra group `HVCG-Client-{Code}` |
| Role matrix | HVCG Owner, HVCG Team Member, Client Executive, Client Contributor, Read-Only Advisor, Administrator | Align Entra app roles; map Elite `Client Team Member` → `Client Contributor` |
| Internal notes/docs | Hidden from client + Read-Only Advisor | Staff-only (`HVCG Owner` / `HVCG Team Member` / `Administrator`) |
| Anonymous sharing | Forbidden | Do not enable in SharePoint library settings |
| Audit history | Activity feed + per-doc audit summary | Persist to `HVCG_PortalAuditLog` / Dataverse audit on bind |
| Upload / request workflows | Mock only; contributor-gated | Wire to SharePoint + approval before client download |
| External invites | BL-C1 gated | Security + Master PM + Owner |

---

## 6. QA dependencies

| Suite | Result (portal worktree) |
|-------|--------------------------|
| `npm run qa:all` (build, vitest, smoke, permissions, navigation, responsive) | PASS (post role/label alignment — re-run before merge packet) |
| Elite Owner UAT (Home + CCB) | External — QA & Release |
| Cross-app CCB fact parity checklist | Required before adapter PR |
| Role matrix matrix test (6 roles) | Portal unit coverage added; Elite RBAC recovery must match |
| Document isolation ACCG vs CCB | Portal PASS; Elite must repeat with live ACLs |
| No fabricated financials scan | Portal PASS for CCB KPIs/funding/EV |

---

## 7. Deployment dependencies

| Item | Status |
|------|--------|
| Independent portal SWA deploy | **Forbidden** for this assignment |
| Elite SWA / Dev host | Elite UI / Deployment Manager |
| Production Power Platform | Owner-gated |
| DNS / client email / SMS | Blocked |
| Key Vault / App Insights | Azure Platform (Exec release parallel) — not portal-owned |

---

## 8. Recommended merge sequence

1. **Freeze Elite Executive Dashboard SoR** (recovery / Sprint 14 tip) and complete Owner UAT on Home + `/clients/ws-ccb`.
2. **Security + Administration:** publish Entra role claim → AtlasRole mapping including Client Contributor.
3. **Data Engineering + Elite UI:** extract shared CCB/workspace seed + `DataAvailability` vocabulary into a shared package consumed by Elite (portal remains reference until deleted).
4. **Client Portal + Elite UI:** port data-room / document-request / capital-readiness panels into Elite client detail (design-system components). Close portal shell for daily use.
5. **Revenue Systems:** bind CCB pipeline card to revenue SoR with pending labels until verified deals exist.
6. **Operations Hub + Executive / Finance Intelligence:** confirm task/approval/EV widgets read same workspace id and pending policy.
7. **QA & Release:** integration test pack (roles, isolation, pending labels, no outbound).
8. **Master PM:** authorize merge of adapter PRs only; defer Track 4 live invites (BL-C1) and SharePoint `MERGE-PORTAL-001` until after Exec release.

---

## 9. Coordination matrix (this packet)

| Partner | Bus id | Ask |
|---------|--------|-----|
| Master PM | `master-pm` | Accept readiness; schedule adapter sprint; no independent deploy |
| Elite UI | via `executive` | Own UX SoR; consume portal as reference for CCB panels |
| Revenue Systems | `revenue-systems` | CCB pipeline bind + pending policy |
| Operations Hub | `operations-hub` | Tasks/approvals workspace filter `ws-ccb` |
| Executive Intelligence | `executive` | Client-safe briefs only; pending figures |
| Finance Intelligence | `finance` | EV/KPI pending vocabulary parity |
| Security Engineering | via `architect` | Entra role mapping + no anonymous share |
| Data Engineering | `data-engineering` | Shared seed / ID map `ws-ccb`↔`cli-ccb` |
| QA & Release | `qa-release` | Integration test pack ownership |

---

## 10. Readiness verdict

| Criterion | Verdict |
|-----------|---------|
| Portal module complete as reference | **YES** |
| Ready for Elite adapter integration + QA | **YES** |
| Ready for independent production deploy | **NO** |
| Ready for client invites / live outbound | **NO** (BL-C1) |
| Fabricated financials present for CCB | **NO** |

**Signal to Master PM:** Client Portal is **READY FOR INTEGRATION AND QA** under the Executive Dashboard release — adapter path only.

---

## 11. Bus coordination note (2026-07-20)

HANDOFF + partner REQUESTs were posted on `.agent-comms` from `client-portal`. The bus flagged `CONFLICT` with `documentation-manager` because related file paths were listed as `docs/portal-sprint1/*` (documentation path ownership). **Canonical copies for this packet live in the portal worktree:**

`.worktrees/client-portal-sprint1/docs/portal-sprint1/INTEGRATION_READINESS_REPORT.md`

Master PM should mediate path ownership if Documentation Manager requires a mirrored copy under a docs-owned path after adapter planning.
