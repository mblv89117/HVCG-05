# CURRENT_STATE

**As of:** 2026-08-19  
**Status SoR:** this file  
**Honesty worktree:** `.worktrees/atlas-phase5-docs` (`feature/atlas-phase5-docs`)  
**Canonical Atlas git line (source, not Azure):** `integration/atlas-canonical`  
**Owner operating guide:** [HVCG_OWNER_OPERATING_GUIDE.md](HVCG_OWNER_OPERATING_GUIDE.md)  
**Historical July 16 snapshot (not current SoR):** [Archive/CURRENT_STATE_2026-07-16.md](Archive/CURRENT_STATE_2026-07-16.md)

**LIVE vs CANDIDATE:** Azure Elite is **LIVE** at merge SHA `2a4e115` (asset `index-CiVmQVqq.js`) = Capital `b9806bc` + Client ops `0ffb645`. Hub remains **`a43803e`** deploy `3d406e37`. Signed-in rendered Premium UI remains **HOLD**. stash0 Hub patches `773e120` are **not applied**. `origin/main` is **not** production.

**Owner recovery closeout (still true):** seven-system architecture is settled. Atlas owner recovery is complete. Manny-only entitlements are executed. Client 360 and commercial launches are deferred. Remaining technical governance is separate maintenance. Worktree retirement is not an owner-operability blocker. **Do not restart the architecture audit.**

## LIVE runtime (certified in Azure — not this git HEAD)

Recorded 2026-08-19 after Phase 5A CRM Hub+Elite exact-SHA deploy.

| Surface | LIVE fact | Evidence |
|---------|-----------|----------|
| Elite SWA | `2a4e115acdd881ef074f4c795fbe1e575f8fb7af` | `https://zealous-rock-0090c7e1e.7.azurestaticapps.net` asset `index-CiVmQVqq.js`. Last-Modified 2026-08-19 03:23:27 UTC. Contains Capital `b9806bc` + Client `0ffb645`. Prior: `b9806bc` / `index-DmyugMFV.js`, then `a43803e` / `index-iXOWTfM9.js`. |
| Hub App Service | `a43803edb29a3f8dd080033ca579a09532d89fbc` | `https://app-atlas-integration-hub.azurewebsites.net`. Azure deployment `3d406e37-2d91-4fd6-a20b-8c955c7b5733`. Kudu `ATLAS_HUB_COMMIT.txt` matches. Prior rollback: `d22b55f` / deploy `501fb29b-80f6-427d-8c65-3f1a88da52d9`. |
| Hub `/health` | `ok` | `authRequired=true`, `insecureDevAuth=false`, `pmBackend.mode=sharepoint`, `capitalBackend.mode=sharepoint`, overlay durable, `websiteLeads.configured=true` |
| Website → `HVCG_Leads` | **LIVE** | Keyed Hub ingest configured (`websiteLeads.configured=true`). Buffer is Azure Table `HvcgWebsiteLeads`. Not a second CRM. |
| Atlas Capital backend mode | **LIVE `sharepoint`** | Hub `/health` `capitalBackend.mode=sharepoint` on zip `a43803e`. Elite post-shortlist UI is in SWA `2a4e115` (includes `b9806bc`). **ACCG01 ACL Apply was not run.** |
| Command-K / Hub search | **P2 OPEN** | SYN* queries still **15–24s**. Do not call this fixed. `d22b55f` returns client hits without waiting out slow project lists; that does not close SYN latency. |
| `origin/main` | `b641fdd784b9d9cc50b85f2e5548526da4f28a02` | Protected promotion target. **Not production.** Do not imply `main` is what Azure is running. |

Prior Hub zip recorded in provenance (superseded): `8ff4220cec3d6cfd3ce41bb5232d0f325ef5fe6f` / deploy `dd965bc2-6d56-4f80-b126-67fcecfc33db`. See [docs/CAPITAL_RELEASE_PROVENANCE.md](../docs/CAPITAL_RELEASE_PROVENANCE.md).

## CRM operator (LIVE deployed — Premium UI HOLD)

| Surface | Fact | Evidence |
|---------|------|----------|
| CRM operator Hub+Elite | **DEPLOYED** `a43803e` | Hub GET/PATCH `/api/pm/leads` live. Anonymous 401. Converted PATCH rejected. 10 Home follow-ups with `/leads/:id`. Elite `/leads` SPA 200 with production Microsoft gate. |
| Signed-in rendered `/leads` | **HOLD** | Unsigned production screenshots show Microsoft sign-in. Local Owner is not a certification session. Do not mark Premium UI PASS until an Owner browser session reviews the queue. |
| Docs honesty branch | `feature/atlas-phase5-docs` | Doc-only. `origin/main` unchanged. |

## Phase 5B (Elite live in `2a4e115`; Hub hardening not applied)

Capital `b9806bc` and Client `0ffb645` are in Azure Elite. LIVE Hub stays `a43803e`. stash0 `773e120` stays unapplied.

| Candidate | SHA / branch | Scope | Status |
|-----------|--------------|-------|--------|
| Capital Elite post-shortlist execution | `b9806bc` in live Elite `2a4e115` | **Elite-only.** Hub unchanged `a43803e`. | **LIVE DEPLOYED** — signed-in Premium UI HOLD |
| Client ops Elite detail (workspace items) | `0ffb645` in live Elite `2a4e115` | Timeline / engagements / decisions from Hub workspace. | **LIVE DEPLOYED** — SYN01 workspace items currently empty |
| stash0 Hub hardening patches | `773e120420ffc35764cf2d31f84194a6acb2d031` `fix/hub-stash0-hardening` | Hub patches **NOT APPLIED**. Wave 2 **conflicts** with live CRM `a43803e` (`listLeads` / blockerCount / command-center). Do not apply, cherry-pick, or deploy this branch. | **NOT APPLIED** |

## Snapshot

| Area | Status | Evidence |
|------|--------|----------|
| Owner production workflow (Command Center SharePoint reads) | **YELLOW — Hub/Elite live; signed-in Elite session is owner-browser** | Anonymous `/api/pm/*` and `/api/ba/health` 401 (expected). Hub `/health` `pmBackend.mode=sharepoint`, `authRequired=true`, `insecureDevAuth=false`. Owner signs in at Elite to load Command Center / My Work / Portfolio / Projects. |
| Website → `HVCG_Leads` ingest | **GREEN — LIVE** | Hub `/health` `websiteLeads.configured=true`. Live path: www contact → Azure Table `HvcgWebsiteLeads` → keyed `POST /api/website/leads` → SharePoint `HVCG_Leads`. Adapter-framework consent (Google/GitHub) is a separate backlog — see [Integrations/STATUS.md](Integrations/STATUS.md). |
| HVCG Master Architecture Audit — core production architecture | **GATE 11 — COMPLETE** | [Reports/GATE11_FINAL_CLOSURE.md](Reports/GATE11_FINAL_CLOSURE.md) |
| Canonical Atlas git line | `integration/atlas-canonical` | Git source line. Do not treat `origin/main` or this docs HEAD as the integration line **or** as Azure production. |
| `origin/main` | **UNCHANGED** `b641fdd784b9d9cc50b85f2e5548526da4f28a02` | Must not be modified without separate promotion authorization. **Not LIVE Azure.** |
| Atlas V1 system of record | SharePoint `HVCG_*` (CRM / clients / projects / tasks / HVCG finance ops) | Owner Decision 3; Hub `pmBackend.mode=sharepoint` |
| Dynamics / Dataverse | **DEFERRED** — no migration | Owner Decision 3 |
| Token paths | Elite → Hub → `id-atlas-prod` → Graph → SharePoint `HVCG_*`; Elite → Hub → MI → BA | Audiences not mixed (`https://graph.microsoft.com` vs `api://` BA URI) |
| Client 360 mapping | **DEFERRED POST-AUDIT FEATURE** (fail-closed; not an audit blocker) | Owner Decision 5; `apps/atlas-integration-api/src/client360/access.ts` |
| Gate 12 worktree/workspace retirement | **NOT STARTED** | Explicitly out of scope |
| Seven-system architecture | Defined; commercial launches are **post-audit** | [docs/architecture/HVCG_SYSTEM_INDEX.md](../docs/architecture/HVCG_SYSTEM_INDEX.md); Owner Decision 1 |
| Atlas Capital Operations | **INTERNAL Atlas module — not an eighth platform** | Elite `/capital` on LIVE SWA `2a4e115` (Capital `b9806bc`). Hub zip remains `a43803e`. 401/403 fail closed. **ACCG01 ACL Apply was not run.** |
| Opportunity CRM operator (Elite/Hub) | **LIVE DEPLOYED `a43803e` — Premium UI HOLD** | Hub leads API + Elite `/leads` running. Unsigned production is Microsoft-gated. Local Owner is not a certification session. Do not mark Premium UI PASS. |
| Phase 5B Elite | **LIVE DEPLOYED** `2a4e115` | Capital `b9806bc` + Client `0ffb645` in the SWA bundle. stash0 `773e120` is **not applied**. |
| Command-K search P2 | **OPEN** | SYN* queries **15–24s**. Not fixed. |
| GCC | Commercial CFO / financial-intelligence product; own app/data boundary; HVCG may be a tenant | Owner Decision 2 |
| G11-F03 client entitlements | **COMPLETE** — `G11-F03 — MANNY-ONLY INITIAL PRODUCTION ENTITLEMENTS COMPLETE` | Entra read-back (Gate 11): Manny sole member of all seven groups; Hub app `checkMemberGroups` returns all seven IDs; Hub `INTEGRATION_CLIENT_ENTITLEMENT_GROUPS` maps those seven IDs. Owner role is not client access. |
| G11-F07 GitHub main protection | **DEFERRED ENGINEERING GOVERNANCE** (already in place; do not change) | PR + 1 approval + dismiss stale + conversation resolution + 6 Atlas checks + no force-push + no deletion + `enforce_admins`. Not an owner-operability blocker. |
| G11-F08 Atlas CI / release control | **DEFERRED ENGINEERING GOVERNANCE** (already in place; do not change) | `atlas-ci.yml` + `atlas-release-control.yml`. Residual: GitHub `production` reviewers not invented; default branch still `cursor/v1.1.0-intelligence-ai-ops`. |
| Worktree count | **Not an operability metric** | Parallel checkouts exist (including this docs worktree). Do not treat a count as Gate 11 completeness. |

## Canonical git (verify with `git rev-parse`; do not reuse chat SHAs)

| Ref | Role |
|-----|------|
| LIVE Elite | `2a4e115acdd881ef074f4c795fbe1e575f8fb7af` — Azure SWA asset `index-CiVmQVqq.js` (Capital `b9806bc` + Client `0ffb645`) |
| LIVE Hub | `a43803edb29a3f8dd080033ca579a09532d89fbc` — Azure App Service zip `3d406e37-2d91-4fd6-a20b-8c955c7b5733`, not `origin/main` |
| Rollback Elite | `e5740379ff16b68f329b7e2388867d7a43233a5b` / `index-DvEHjcS6.js` |
| Rollback Hub | `d22b55f870efc0c105ed328a20a4ba4df077e6aa` / deploy `501fb29b` |
| LIVE Capital Elite | `b9806bc` shipped inside SWA `2a4e115` |
| LIVE Client ops Elite | `0ffb645` shipped inside SWA `2a4e115` |
| stash0 Hub patches | `773e120420ffc35764cf2d31f84194a6acb2d031` `fix/hub-stash0-hardening` — **NOT APPLIED**; Wave 2 conflicts with `a43803e` |
| `integration/atlas-canonical` | Canonical Atlas **source** line (not automatically Azure) |
| `origin/main` | Protected production-promotion target; SHA must stay `b641fdd784b9d9cc50b85f2e5548526da4f28a02` until a separately authorized promotion. **Not what Azure is running.** |
| Default GitHub branch | `cursor/v1.1.0-intelligence-ai-ops` (residual; not changed by Gate 11) |

## Production Atlas

| Component | Status |
|-----------|--------|
| Elite SWA | **LIVE** `https://zealous-rock-0090c7e1e.7.azurestaticapps.net` — SHA `2a4e115`, asset `index-CiVmQVqq.js` |
| Hub | **LIVE** `https://app-atlas-integration-hub.azurewebsites.net` — SHA `a43803e`, Azure deploy `3d406e37-2d91-4fd6-a20b-8c955c7b5733`. Auth required; `insecureDevAuth=false`; SharePoint PM; capital backend `sharepoint`; overlay durable; keyed `POST /api/website/leads` configured; operator `GET/PATCH /api/pm/leads` |
| BA | Reachable through Hub when configured; anonymous `/api/ba/health` is 401 |
| Local AI | Disabled on production Hub (`insecureDevAuth=false`; do not treat Local AI as on) |
| CRM operator | **LIVE DEPLOYED** `a43803e` — signed-in rendered Premium UI HOLD |
| Phase 5B Elite | **LIVE DEPLOYED** `2a4e115` — Capital `b9806bc` + Client `0ffb645`. Hub still `a43803e`. stash0 `773e120` not applied. Signed-in Premium UI HOLD. |
| Command-K search | **P2 OPEN** — SYN* **15–24s**; not fixed |

## Entitlements (G11-F03)

**G11-F03 — MANNY-ONLY INITIAL PRODUCTION ENTITLEMENTS COMPLETE.**

Immediate production client access is **Manny only** (`manny@highvaluecapitalgroup.com`, Entra object `e4835ea2-3c45-493a-95f5-472f6339661d`) on:

- HVCG-Client-ACCG01
- HVCG-Client-CCB01
- HVCG-Client-CPL01
- HVCG-Client-HFD01
- HVCG-Client-KAVA01
- HVCG-Client-LIEN01
- HVCG-Client-PDG01

No other users. Employee-to-client roster requires a later owner approval. Hub confidential-client Graph resolves the seven groups; Elite signed-in UI still needs Manny’s browser.

**ACCG01 ACL Apply was not run.** Membership in `HVCG-Client-ACCG01` is not proof that capital Selected-permission Apply ran on ACCG01 lists.

## What the next session must not redo

- Do not re-audit product overlap, BA architecture, Elite auth, or completed Gate 11 findings unless **current** repository evidence contradicts them.
- Do not start Gate 12, prune/retire more worktrees, archive systems, delete branches, or remove preservation.
- Do not launch commercial products.
- Do not promote `integration/atlas-canonical` to `main`.
- Do not treat `origin/main` as production.
- Do not initiate Dynamics/Dataverse.
- Do not invent Client 360 mappings.
- Do not add anyone except Manny to client groups.
- Do not claim signed-in `/leads` Premium UI PASS. CRM operator Hub+Elite is **LIVE DEPLOYED** `a43803e`; Premium UI remains HOLD until an Owner browser session reviews the queue.
- Do not treat stash0 `773e120` / Wave 2 as live. Do not apply them onto Hub `a43803e`. Capital `b9806bc` and Client `0ffb645` are in live Elite `2a4e115`.
- Do not call Command-K SYN search (15–24s) fixed.
- Do not claim ACCG01 ACL Apply ran.
- Do not let documentation block a later certified Elite/Hub deploy. This branch still does not deploy.

## Status authority

Within Atlas, **this file** is the status SoR. July 2026 Dynamics Track-1 freeze notes are historical evidence only; they do not override Owner Decision 3 (SharePoint `HVCG_*` is Atlas V1 SoR). Git HEAD is not Azure. Azure is not `origin/main`.
