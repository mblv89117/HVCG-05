# CURRENT_STATE

**As of:** 2026-08-19  
**Status SoR:** this file  
**Honesty worktree:** `.worktrees/atlas-phase5-docs` (`feature/atlas-phase5-docs`)  
**Canonical Atlas git line (source, not Azure):** `integration/atlas-canonical`  
**Owner operating guide:** [HVCG_OWNER_OPERATING_GUIDE.md](HVCG_OWNER_OPERATING_GUIDE.md)  
**Historical July 16 snapshot (not current SoR):** [Archive/CURRENT_STATE_2026-07-16.md](Archive/CURRENT_STATE_2026-07-16.md)

**LIVE vs CANDIDATE:** Azure Elite is **LIVE** at **`632b7ae`** (asset `index-cEa6tmpZ.js`) = prior `2a4e115` (Capital `b9806bc` + Client `0ffb645`) plus Lead → Opportunity UI. Hub is **LIVE** at **`5b50ca2`** deploy `7795bc89` on lineage `9091dd5` (persist-consistency + confirmation-gate retained). Lead → Opportunity conversion is **LIVE CERTIFIED** on synthetic lead `20` / opportunity `3` (`SYNAT01` Prospect). Conversion does **not** create `HVCG-Client-*` or change `INTEGRATION_CLIENT_ENTITLEMENT_GROUPS`. Confirmation-gate P1 remains closed. stash0 Hub patches `773e120` are **not applied**. `origin/main` is **not** production.

**Owner recovery closeout (still true):** seven-system architecture is settled. Atlas owner recovery is complete. Manny-only entitlements are executed. Client 360 and commercial launches are deferred. Remaining technical governance is separate maintenance. Worktree retirement is not an owner-operability blocker. **Do not restart the architecture audit.**

## LIVE runtime (certified in Azure — not this git HEAD)

Recorded 2026-08-19 after Phase 5D Hub-only confirmation-gate hotfix. Elite unchanged.

| Surface | LIVE fact | Evidence |
|---------|-----------|----------|
| Elite SWA | `632b7ae32e94afe9d839d39f1dff20625e86789e` | `https://zealous-rock-0090c7e1e.7.azurestaticapps.net` asset `index-cEa6tmpZ.js`. Built 2026-08-19T16:24:44Z from `2a4e115` + conversion UX. Prior: `2a4e115` / `index-CiVmQVqq.js`. |
| Hub App Service | `5b50ca2c338b34afffa5796d6fa79298a7b27d4c` | `https://app-atlas-integration-hub.azurewebsites.net`. Azure deployment `7795bc89-daaa-43a8-8213-581e01c0f460` (2026-08-19T16:17:01Z). Kudu `ATLAS_HUB_COMMIT.txt` matches. Immediate prior: `9091dd5` / deploy `3610366d`. Rollback archive `server.js.pre-5b50ca2-20260819-161646`. |
| Hub `/health` | `ok` | `authRequired=true`, `insecureDevAuth=false`, `pmBackend.mode=sharepoint`, `capitalBackend.mode=sharepoint`, overlay durable, `websiteLeads.configured=true` |
| Website → `HVCG_Leads` | **LIVE** | Keyed Hub ingest configured (`websiteLeads.configured=true`). Buffer is Azure Table `HvcgWebsiteLeads`. Not a second CRM. |
| Atlas Capital backend mode | **LIVE `sharepoint`** | Hub `/health` `capitalBackend.mode=sharepoint` on zip `5b50ca2` (retains `9091dd5` persist-consistency). Overlay durable. Elite Capital UI remains in SWA (now `632b7ae`). **ACCG01 ACL Apply was not run.** SYN Graph is overlay-authoritative; recorded submit returns 200. |
| Command-K / Hub search | **P2 OPEN** | SYN* queries still **15–24s**. Do not call this fixed. `d22b55f` returns client hits without waiting out slow project lists; that does not close SYN latency. |
| `origin/main` | `b641fdd784b9d9cc50b85f2e5548526da4f28a02` | Protected promotion target. **Not production.** Do not imply `main` is what Azure is running. |

Prior Hub zip recorded in provenance (superseded): `8ff4220cec3d6cfd3ce41bb5232d0f325ef5fe6f` / deploy `dd965bc2-6d56-4f80-b126-67fcecfc33db`. See [docs/CAPITAL_RELEASE_PROVENANCE.md](../docs/CAPITAL_RELEASE_PROVENANCE.md).

## CRM operator (LIVE — Owner-browser Premium UI PASS)

| Surface | Fact | Evidence |
|---------|------|----------|
| CRM operator Hub+Elite | **LIVE** Hub `5b50ca2` / Elite `632b7ae` | Hub GET/PATCH `/api/pm/leads` live. Anonymous 401. Converted PATCH rejected. Elite `/leads` Owner-browser certified Phase 5C; convert UI shipped in `632b7ae`. |
| Signed-in rendered `/leads` | **PASS** | Phase 5C Owner Chrome (MB / manny@highvaluecapitalgroup.com). Local Owner is still not a certification session. |
| Lead → Opportunity convert | **LIVE CERTIFIED** Hub `5b50ca2` / Elite `632b7ae` | Production-aligned from `9091dd5`, not `887edd8`. SYN lead `20` → Opportunity `3`, company `SYNAT01` ClientStage=Prospect, entitlementProvisioned=false, Entra `HVCG-Client-SYNAT01` **absent**, client GET **404**, replay same opportunity. Hub MI `HVCG_Clients` Selected grant upgraded **read → write** (Prospect rows only; no Entra group). |
| Docs honesty branch | `feature/atlas-phase5-docs` | Doc-only. `origin/main` unchanged. |

## Phase 5B (Elite live in `632b7ae`; Hub hardening not applied)

Capital `b9806bc` and Client `0ffb645` remain in Azure Elite. LIVE Hub is `5b50ca2` (confirmation-gate `b333fb4` plus persist-consistency `9091dd5` plus conversion). stash0 `773e120` stays unapplied.

| Candidate | SHA / branch | Scope | Status |
|-----------|--------------|-------|--------|
| Capital persist-consistency | `9091dd5` `fix/hub-capital-persist-consistency` | Hub-only. SYN Graph 503 no longer aborts overlay commit. | **LIVE CERTIFIED** |
| Capital confirmation-gate P1 | `b333fb4` `fix/hub-submission-lender-package` | Recorded submit requires matching attested package. | **LIVE** inside `9091dd5` |
| Capital Elite post-shortlist execution | `b9806bc` in live Elite `632b7ae` | **Elite-only.** Hub is `5b50ca2`. | **LIVE DEPLOYED** — Owner-browser `/capital` PASS |
| Client ops Elite detail (workspace items) | `0ffb645` in live Elite `632b7ae` | Timeline / engagements / decisions from Hub workspace. | **LIVE DEPLOYED** — SYN01 workspace items currently empty |
| stash0 Hub hardening patches | `773e120420ffc35764cf2d31f84194a6acb2d031` `fix/hub-stash0-hardening` | Hub patches **NOT APPLIED**. Wave 2 **conflicts** with live CRM (`listLeads` / blockerCount / command-center). Do not apply, cherry-pick, or deploy this branch. | **NOT APPLIED** |

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
| Atlas Capital Operations | **INTERNAL Atlas module — not an eighth platform** | Elite `/capital` on LIVE SWA `632b7ae` (Capital `b9806bc`). Hub zip `5b50ca2`. 401/403 fail closed. Confirmation-gate P1 **CLOSED**. Persist-consistency retained. **ACCG01 ACL Apply was not run.** |
| Opportunity CRM operator (Elite/Hub) | **LIVE** Hub `5b50ca2` / Elite `632b7ae` — convert **LIVE CERTIFIED** (SYN) | Hub `POST /api/pm/leads/:id/convert`. Does not provision client access. |
| Phase 5B Elite | **LIVE DEPLOYED** `632b7ae` | Capital `b9806bc` + Client `0ffb645` + conversion UX. stash0 `773e120` is **not applied**. |
| Command-K search P2 | **OPEN** | SYN* queries **15–24s**. Not fixed. |
| GCC | Commercial CFO / financial-intelligence product; own app/data boundary; HVCG may be a tenant | Owner Decision 2 |
| G11-F03 client entitlements | **COMPLETE** — `G11-F03 — MANNY-ONLY INITIAL PRODUCTION ENTITLEMENTS COMPLETE` | Entra read-back (Gate 11): Manny sole member of all seven groups; Hub app `checkMemberGroups` returns all seven IDs; Hub `INTEGRATION_CLIENT_ENTITLEMENT_GROUPS` maps those seven IDs. Owner role is not client access. |
| G11-F07 GitHub main protection | **DEFERRED ENGINEERING GOVERNANCE** (already in place; do not change) | PR + 1 approval + dismiss stale + conversation resolution + 6 Atlas checks + no force-push + no deletion + `enforce_admins`. Not an owner-operability blocker. |
| G11-F08 Atlas CI / release control | **DEFERRED ENGINEERING GOVERNANCE** (already in place; do not change) | `atlas-ci.yml` + `atlas-release-control.yml`. Residual: GitHub `production` reviewers not invented; default branch still `cursor/v1.1.0-intelligence-ai-ops`. |
| Worktree count | **Not an operability metric** | Parallel checkouts exist (including this docs worktree). Do not treat a count as Gate 11 completeness. |

## Canonical git (verify with `git rev-parse`; do not reuse chat SHAs)

| Ref | Role |
|-----|------|
| LIVE Elite | `632b7ae32e94afe9d839d39f1dff20625e86789e` — Azure SWA asset `index-cEa6tmpZ.js` (on `2a4e115` + conversion UX) |
| LIVE Hub | `5b50ca2c338b34afffa5796d6fa79298a7b27d4c` — Azure App Service zip `7795bc89-daaa-43a8-8213-581e01c0f460`, not `origin/main` |
| Rollback Elite | `e5740379ff16b68f329b7e2388867d7a43233a5b` / `index-DvEHjcS6.js` |
| Rollback Hub | `a43803edb29a3f8dd080033ca579a09532d89fbc` / deploy `3d406e37` / archive `server.js.pre-a43803e-20260819-040903`. Older: `d22b55f` / deploy `501fb29b` |
| LIVE Capital Elite | `b9806bc` shipped inside SWA `2a4e115` |
| LIVE Client ops Elite | `0ffb645` shipped inside SWA `2a4e115` |
| stash0 Hub patches | `773e120420ffc35764cf2d31f84194a6acb2d031` `fix/hub-stash0-hardening` — **NOT APPLIED**; Wave 2 conflicts with live CRM |
| `integration/atlas-canonical` | Canonical Atlas **source** line (not automatically Azure) |
| `origin/main` | Protected production-promotion target; SHA must stay `b641fdd784b9d9cc50b85f2e5548526da4f28a02` until a separately authorized promotion. **Not what Azure is running.** |
| Default GitHub branch | `cursor/v1.1.0-intelligence-ai-ops` (residual; not changed by Gate 11) |

## Production Atlas

| Component | Status |
|-----------|--------|
| Elite SWA | **LIVE** `https://zealous-rock-0090c7e1e.7.azurestaticapps.net` — SHA `632b7ae`, asset `index-cEa6tmpZ.js` |
| Hub | **LIVE** `https://app-atlas-integration-hub.azurewebsites.net` — SHA `5b50ca2`, Azure deploy `7795bc89-daaa-43a8-8213-581e01c0f460`. Auth required; `insecureDevAuth=false`; SharePoint PM; capital backend `sharepoint`; overlay durable; keyed `POST /api/website/leads` configured; operator `GET/PATCH /api/pm/leads`; convert `POST /api/pm/leads/:id/convert`. Confirmation-gate P1 **CLOSED**. Persist-consistency retained from `9091dd5`. |
| BA | Reachable through Hub when configured; anonymous `/api/ba/health` is 401 |
| Local AI | Disabled on production Hub (`insecureDevAuth=false`; do not treat Local AI as on) |
| CRM operator | **LIVE** Hub `5b50ca2` / Elite `632b7ae` — convert **LIVE CERTIFIED** on SYN lead 20. |
| Phase 5B Elite | **LIVE DEPLOYED** `632b7ae` — Capital `b9806bc` + Client `0ffb645` + conversion. Hub `5b50ca2`. stash0 `773e120` not applied. |
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
- Do not claim signed-in `/leads` is uncertified. Phase 5C Owner-browser `/leads` and `/capital` **PASS**. Convert Lead → Opportunity is **LIVE CERTIFIED** on synthetic data (do not convert ACCG/Prodigy/Hart to re-prove it).
- Do not treat a Prospect `HVCG_Clients` row as client entitlement. `SYNAT01` is Prospect; `HVCG-Client-SYNAT01` was not created.
- Do not treat stash0 `773e120` / Wave 2 as live. Do not apply them onto Hub `5b50ca2`. Capital `b9806bc` and Client `0ffb645` remain in Elite (now `632b7ae`).
- Do not call Command-K SYN search (15–24s) fixed.
- Do not claim ACCG01 ACL Apply ran.
- Do not reopen the confirmation-gate P1: live ReadyForSubmission mismatch is **422**. Matching attested HTTP 200 is separately blocked by SYN Graph 503 (P2).
- Do not let documentation block a later certified Elite/Hub deploy. This branch still does not deploy.

## Status authority

Within Atlas, **this file** is the status SoR. July 2026 Dynamics Track-1 freeze notes are historical evidence only; they do not override Owner Decision 3 (SharePoint `HVCG_*` is Atlas V1 SoR). Git HEAD is not Azure. Azure is not `origin/main`.
