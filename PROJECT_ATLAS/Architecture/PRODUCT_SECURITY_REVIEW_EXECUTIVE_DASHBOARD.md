# Product Security Review — Atlas Executive Dashboard & Workspaces

**Agent:** Security Engineering (`security`)  
**Date:** 2026-07-20  
**Scope:** Product-build only — Executive Dashboard, HVCG / client workspaces (incl. Colorado Craft Beef), Dataverse, SharePoint, Power Apps, Power Automate, React (Elite OS), Graph, Teams, Power BI, AI, documents.  
**Out of scope:** Authentication debugging / keychain, Cursor APIs, cloud agents, runtime orchestration, dispatchers, ATLAS-R.  
**Evidence base:** `.worktrees/track10-elite-ui` Elite OS + Track 10 Architecture; `SECURITY_MODEL.md`; `docs/ai/AI_SECURITY_MODEL.md`; Architecture ADR-0006 sign-off.

---

## 1. Threat assessment

| ID | Threat | Likelihood | Impact | Affected surfaces | Current control | Residual risk |
|----|--------|------------|--------|-------------------|-----------------|---------------|
| T-01 | Cross-client data exposure (wrong ClientCode / workspace) | Medium | Critical | Dataverse, SharePoint libs, SPA modules, AI context | Client libraries break inheritance; AI ClientCode filter; CCB finance pending-safe | High until server-side filters enforced on all Elite queries |
| T-02 | SPA treats any signed-in tenant user as Owner | High | High | Executive Home UI | None (label hardcoded) | **Critical for UAT if non-owner signs in** |
| T-03 | Over-broad Graph delegated scopes (`Sites.Read.All`, `Files.Read.All`, `Mail.Read`) | High | High | Graph adapter, documents | Org-only SPA; no Mail.Send | Medium–High; narrow to site-scoped |
| T-04 | Unlabeled sample / fallback data mistaken for live financials | Medium | High | Executive KPIs, CCB demo | Pending labels in `workspaces.ts`; sample fallback flag | Medium in Dev; must be off for Prod |
| T-05 | Anonymous / unrestricted SharePoint links on confidential docs | Low | Critical | HVCG-Clients libraries | Policy: anonymous denied on Clients site | Low if tenant policy enforced |
| T-06 | AI access beyond user’s authorized clients | Medium | Critical | AI jobs, context assembly | ExternalSendBlocked; ClientCode; human review | Medium until AI wired through policy |
| T-07 | Privilege escalation via model-driven / maker roles | Medium | High | Dataverse admin | Separate MDA admin path | Medium — need dedicated Atlas Exec role |
| T-08 | Secrets or connection strings in SPA / git | Low | Critical | Repo, SWA | Public SPA; VITE public IDs only; `.env.example` warns | Low |
| T-09 | Live client communications (email/Teams/portal) | Low | High | Graph, Power Automate | `blockLiveClientComms=true`; no Mail.Send | Low |
| T-10 | Production data in insecure test / sample paths | Medium | High | Dev env, sample fallback | Dev-only targets; synthetic data policy | Medium until UAT data hygiene checked |
| T-11 | Destructive actions without confirmation | Medium | Medium | Approvals, admin | Partial (UI dialogs planned) | Medium |
| T-12 | Audit gaps on sensitive actions | Medium | Medium | Approvals, stage changes, AI | Purview + HVCG_AuditEvents / AIAuditLog (designed) | Medium until App Insights + list audit verified |
| T-13 | CORS misconfiguration allowing non-SWA origins | Medium | Medium | Dataverse | Documented SWA + localhost only | Medium until verified in PP admin |
| T-14 | PnP / deployment Graph `Sites.FullControl` misuse | Low | Critical | Deployment tooling | Human-operated deploy; not in SPA | Medium — keep out of product runtime |

---

## 2. Permission matrix (required product roles)

Maps **product roles** → Entra groups (existing) → surface access.  
**Legend:** F = Full · E = Edit · R = Read · N = None · P = Pending / not enforced in SPA

| Role | Entra group(s) | Elite OS Exec Home | HVCG internal WS | Client WS (e.g. CCB) | Dataverse `hvcg_atlas*` | SharePoint CommandCenter | SharePoint Clients lib | Docs (Graph) | Power Automate invoke | AI context | Admin / MDA |
|------|----------------|--------------------|------------------|----------------------|-------------------------|--------------------------|------------------------|--------------|----------------------|------------|-------------|
| **HVCG Owner** | `HVCG-Role-Owner` | F | F | F (assigned clients) | E | E | E | R/E per policy | Yes | All assigned | Yes (owner OA) |
| **HVCG Team Member** | Role-* (PM/Ops/Analyst/Advisor/Assistant) | R/E per assignment | R/E | E only if in `HVCG-Client-{Code}` | R/E least | E as matrix | E if client group | R scoped | Limited | Assigned clients only | N |
| **Client Executive** | B2B guest + client group | N (internal exec) | N | R/E own client only | N or R own | N | Contribute upload folders only (V1: request links preferred) | Own lib R | N | Own client only | N |
| **Client Team Member** | B2B guest + client group | N | N | R own client | N | N | Upload folders / request links | Own lib R | N | Own client only | N |
| **Read-Only Advisor** | `HVCG-Role-ReadOnlyReviewer` / ExternalProfessional | R | R | R permitted clients | R | R | R permitted | R | N | Permitted clients | N |
| **Administrator** | `HVCG-Role-Administrator` | E | E | E | E + config | E + site settings | E | E | Flow admin | Staff scope | Yes |

### SPA enforcement status (2026-07-20)

| Control | Status |
|---------|--------|
| Entra sign-in (MSAL PKCE SPA) | Implemented |
| Entra group → product role mapping in Elite OS | **Missing** (UI hardcodes Owner label) |
| Dataverse security role “Atlas Executive Dev” | Documented; verify in tenant |
| Client Workspace module gating until UAT | Documented / product guidance |
| CCB financial numerics | Blocked (pending labels only) |

Full Development actor matrix (Track 10): see [Track10_Security_Matrix.md](Track10_Security_Matrix.md).

---

## 3. Entra ID review

| Control | Expected | Finding | Verdict |
|---------|----------|---------|---------|
| App type | SPA public client, no secret | Documented `HVCG-Atlas-Elite-OS-DEV`; MSAL public client | Pass |
| Account types | Single tenant | Org directory only | Pass |
| Auth flow | Auth code + PKCE; implicit off | MSAL browser; sessionStorage cache | Pass |
| Redirect URIs | Localhost + exact SWA hostname | Documented; must match SWA | Conditional — verify live app reg |
| MFA / Conditional Access | Tenant MFA required | Owner OA; not app-owned | Pass (tenant) |
| Delegated Dynamics | `user_impersonation` | Required for Dataverse | Pass |
| Graph scopes | Least privilege | App requests `User.Read`, `Sites.Read.All`, `Files.Read.All`, `Calendars.Read`, `Mail.Read` | **Fail least-privilege** — Mail.Read unused; Sites/Files too broad |
| Application permissions | None on SPA | Correct | Pass |
| Mail.Send / client notify | Forbidden in Dev | Not granted; `blockLiveClientComms` | Pass |
| Role claims in token | Groups/roles for SPA RBAC | Not consumed by Elite OS | **Gap** |

**Recommendation:** Remove `Mail.Read` until needed; prefer Sites.Selected / library-scoped access; map Entra groups to product roles before any non-owner UAT.

---

## 4. Data-isolation review

| Boundary | Design | Evidence | Gap |
|----------|--------|----------|-----|
| Org (HVCG vs future SaaS) | Single-tenant now; SaaS deferred | ADR-0006 / arch sign-off | Acceptable |
| Internal vs client workspace | `WorkspaceKind` + catalog | `workspaces.ts` | Catalog is client-side; not ACL |
| Client-to-client | `HVCG-Client-{Code}` + ClientCode filters | SECURITY_MODEL; AI policy | Elite queries must filter server-side |
| Colorado Craft Beef | Demo profile; relationship facts only; no invented finance | `coloradoCraftBeefWorkspace`; product guides | Do not expose Restricted Financial until verified import + ACL |
| Cross-client relationships | `IsCrossClient` Owner/Admin only | AI / Intelligence model | Enforce in any Relationships UI |
| Sample fallback | Dev/local only by default | `allowSampleFallback` | Must be `false` for staging/prod builds |

**Verdict:** Isolation **designed** correctly; **not fully enforced** in Elite OS authorization layer. Dev demo with Owner-only sign-in is acceptable; multi-role UAT is **not**.

---

## 5. Document-security review

| Control | Status | Notes |
|---------|--------|-------|
| Anonymous links on HVCG-Clients | Required denied | Confirm tenant Sharing settings |
| Specific people / guest links | Allowed w/ expiration | 7–30 days recommended |
| Library inheritance break per client | Required | CCB lib must not inherit broad staff Edit without group |
| Graph document access | Via user token | `Sites.Read.All` over-reads other sites |
| Elite Documents module | Placeholder / Data pending | Do not claim live ACL enforcement in UI |
| Classification labels | Restricted / Confidential / General | Apply before CCB financial package import |
| Retention | Purview + AI output purge policy | Confirm retention labels for Restricted Client Financial |

---

## 6. Integration-permission review

| Integration | Permission model | Risk | Action |
|-------------|------------------|------|--------|
| Dataverse (Elite) | User-delegated | Medium if roles too broad | Dedicated Atlas Exec Dev role |
| Microsoft Graph | User-delegated | High scope breadth | Narrow scopes |
| SharePoint (ops lists) | User + classic SP perms | Medium | Prefer security groups |
| Power Automate | User context / connection refs | Medium | No live client send; service account for admin flows only |
| Power Apps (MDA) | Maker/admin | High if overused for daily UX | Keep admin-only |
| Power BI | Read models | Low | Row-level security by ClientCode when client-facing |
| Teams tab | Hosts SWA HTTPS | Low | Same Entra app + redirect |
| PnP deploy Graph | `Sites.FullControl` etc. | Critical if leaked to product | Keep deploy-only; never in SPA |

---

## 7. Secrets review

| Check | Result |
|-------|--------|
| Client secrets in SPA | None by design |
| Secrets in Elite OS source | No matches for passwords/API keys/connection strings |
| `.env.example` | Public IDs/URLs only; warns against secrets |
| Config loader | `VITE_*` only; throws if live client comms enabled in prod without gate |
| Key Vault | Azure foundations (`kv-atlas-*`); App Insights connection via build secret — not in git |
| Docs | Must not paste client secrets or certificates |

**Verdict:** Secrets handling for Elite OS **Pass**. Continue Key Vault for non-SPA secrets; never commit `.env.local`.

---

## 8. Code-security findings

| ID | Severity | Location | Finding | Remediation |
|----|----------|----------|---------|-------------|
| C-01 | **High** | `ExecutiveDashboard.tsx` ~L68 | Any authenticated account labeled `HVCG Owner / Executive` | Resolve role from Entra group claims; default to least privilege |
| C-02 | **High** | `msal.ts` `getGraphScopes()` | Requests `Mail.Read` + tenant-wide Sites/Files | Drop Mail.Read; plan Sites.Selected |
| C-03 | **Medium** | `config.ts` / `loadExecutiveHome.ts` | Sample fallback can mask connection failures | Banner + explicit “sample” watermark; disable outside local/dev |
| C-04 | **Medium** | Auth layer | No route guard by role/workspace | Add authz helper before client routes (`/clients/*`) |
| C-05 | **Low** | Token cache | `sessionStorage` | Acceptable for SPA; document XSS hygiene |
| C-06 | **Info** | Power Automate / Graph adapters | Live client comms blocked in code | Keep tests asserting block |

---

## 9. Remediation tasks (product)

| Priority | Task | Owner lane | Blocks |
|----------|------|------------|--------|
| P0 | Map Entra groups → product roles; stop hardcoding Owner label | Elite UI + Security | Multi-user UAT |
| P0 | Verify Dataverse CORS = SWA origin + localhost only | Power Platform | Hosted signed-in use |
| P0 | Confirm anonymous sharing denied on Clients site | Administrator / Security | Document UAT |
| P1 | Narrow Graph scopes; remove unused Mail.Read | Elite UI + Administration | Least privilege |
| P1 | Create/verify **Atlas Executive Dev** Dataverse role (least privilege) | Power Platform | Non-admin testers |
| P1 | Server-side ClientCode / workspace filters on all Elite Dataverse queries | Data Engineering + Elite UI | Client isolation |
| P1 | App Insights wiring without secrets in git | Azure + Elite UI | Auditability |
| P2 | Document confirmation UX for destructive/approval actions | Elite UI + QA | Admin boundaries |
| P2 | Power BI RLS design for client-facing reports | Analytics | Future client BI |
| P2 | Guest / Client Executive access path (B2B) design review before enablement | Security + Architecture | Client portal |
| P1 | Before any non-Owner CCB access: provision `HVCG-Client-{Code}` + library ACL (none exists today — catalog only) | Administration + Client Workspace | Client isolation |
| P2 | Promote Track10 Entra/Security matrix into main `PROJECT_ATLAS/` or `docs/security/` (today worktree-only) | Documentation + Security | Single SoR |
| P1 | Align Elite Exec AI/briefing path with AI Governance `R-AI-01` / `R-AI-06` (grounding + ClientCode) | AI Governance + Security | Ungrounded $ / cross-client |

Coordinate with: Architecture, AI Governance, Azure, Power Platform, Data Engineering, QA.

---

## 10. Release security recommendation

| Release target | Recommendation | Conditions |
|----------------|----------------|------------|
| **Local / Dev SWA — Owner-only demo & UAT** | **CONDITIONAL GO** | Owner account only; pending financial labels intact; live client comms blocked; no production data in Dev |
| **Multi-role Dev UAT** | **NO-GO** | Until C-01 / Entra role mapping + Dataverse role verified |
| **Client Executive / guest access** | **NO-GO** | Until isolation enforcement + document ACL proof |
| **Staging** | **NO-GO** | Until sample fallback off, scopes narrowed, App Insights on |
| **Production (PP + live client data)** | **NO-GO** | Owner gate; all P0/P1 remediations; security re-review |

---

## 11. Final security sign-off

| Item | Decision |
|------|----------|
| Elite OS MSAL SPA pattern (public client, PKCE, no secrets) | **APPROVED** for Development |
| SECURITY_MODEL / AI_SECURITY_MODEL policies | **APPROVED** as control baseline |
| Track 10 hard blocks (no Prod SP/DV from Dev agents; no Mail.Send; no secrets in git) | **APPROVED** |
| Colorado Craft Beef demo (relationship facts, pending finance) | **APPROVED** for Owner demo path |
| Executive Dashboard **Production** security sign-off | **NOT APPROVED** |
| Multi-role / client-user release | **NOT APPROVED** |
| Self-approval of Security-implemented code changes | **N/A** this review (assessment only) |

**Sign-off:** Security Engineering — 2026-07-20  
**Classification:** Internal Confidential  
**Escalation:** Material risk acceptance (e.g. retaining `Sites.Read.All` into Staging) → Master PM → Manuel Barela.

---

## Appendix A — Surfaces reviewed

Executive Dashboard · HVCG internal workspace · Client workspaces · Colorado Craft Beef · Dataverse · SharePoint · Power Apps (MDA) · Power Automate · React Elite OS · Microsoft Graph · Teams (hosting) · Power BI (read-model posture) · AI features (policy + not fully wired) · Document access (policy + Graph).

## Appendix B — Related artifacts

- [Track10_Security_Matrix.md](Track10_Security_Matrix.md)  
- [Track10_Entra_App_Registration.md](Track10_Entra_App_Registration.md)  
- Main repo `SECURITY_MODEL.md` / `docs/security/SECURITY_MODEL.md` (prefer root for v1.1 AI sections; avoid drift)  
- Main repo `PERMISSIONS_MATRIX.md` — operational RBAC SoR (Exec dashboard: Owner/Admin **E**, Ops Mgr **R**, others **N**)  
- Main repo `RISKS.md` — R003 oversharing, R009 contractor linger, R010 sample/prod mix  
- `docs/ai/AI_SECURITY_MODEL.md` / `docs/ai/AI_CONTEXT_POLICY.md`  
- AI Governance product AI risks: `.worktrees/sprint12-engineering-orchestration/docs/ai/AI_RISK_ASSESSMENT.md` (not yet in main `docs/ai/`)  
- Portal package: `.worktrees/client-portal-data-rooms/docs/portal/SECURITY_REVIEW.md` — **PASS Dev**; external unlock needs separate sign-off  
- Architecture Executive Dashboard sign-off (system-architect) — PR-4 incomplete SPA role mapping  

## Appendix C — STRIDE (product Elite OS path)

| Category | Example | Control / status |
|----------|---------|------------------|
| **S**poofing | Fake SWA origin / stolen session | Entra + PKCE; sessionStorage; exact redirect URIs — Pass design |
| **T**ampering | Client-side KPI / role spoof | Server Dataverse roles + list ACLs must be SoR; SPA labels not authoritative — **Gap** (C-01) |
| **R**epudiation | Unaudited approval / AI accept | Purview + HVCG_AuditEvents / AIAuditLog / App Insights — Partial |
| **I**nformation disclosure | Cross-client Graph/Sites read; CCB finance | Narrow Graph; ClientCode; CCB pending-safe; no `HVCG-Client-*` for CCB yet — **Gap** |
| **D**enial of service | Cost abuse on AI / Graph | AI CostTracking + Worker pause (policy); SPA N/A |
| **E**levation of privilege | Maker role / PnP FullControl / Owner label | Dedicated Atlas Exec role; PnP deploy-only; fix C-01 — **Gap** |

## Appendix D — Exploration follow-up (2026-07-20)

Confirmed by product-security exploration ([Explore Atlas security surfaces](339bbdf6-ecc2-4681-b252-609cd1568e7b)):

1. **CCB** is demo catalog (`ws-ccb`) only — no Entra `HVCG-Client-*`, SharePoint library grant, or portal data room for CCB.  
2. **Track10** Entra/Security docs exist only under worktrees — not mirrored to main `PROJECT_ATLAS/`.  
3. **Portal** Dev package already security-reviewed (PASS); do not conflate with Elite Exec Production sign-off.  
4. **PERMISSIONS_MATRIX** already denies Exec dashboard to PM/Capital/Contractor/Client — Elite OS must eventually honor this, not Owner-label everyone.  
5. Formal STRIDE for Elite path added above; prior gap was “AI/portal risk reviews only.”  

**Sign-off unchanged:** Production / multi-role / client-guest remain **NOT APPROVED**.  
