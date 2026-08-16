# CURRENT_STATE

> **Certification harness (non-product QA, not owner-ready):** `/Volumes/MacMiniPro2TB/HVCG_SYSTEM_CERTIFICATION/STATUS.md` · [SYSTEM_CERTIFICATION_HARNESS.md](SYSTEM_CERTIFICATION_HARNESS.md). Do not restart the architecture audit.

**As of:** 2026-08-14 21:25 UTC  
**Status SoR:** this file  
**Canonical worktree:** `.worktrees/atlas-canonical-integration`  
**Canonical branch:** `integration/atlas-canonical`  
**Owner operating guide:** [HVCG_OWNER_OPERATING_GUIDE.md](HVCG_OWNER_OPERATING_GUIDE.md)  
**Historical July 16 snapshot (not current SoR):** [Archive/CURRENT_STATE_2026-07-16.md](Archive/CURRENT_STATE_2026-07-16.md)

**Owner recovery closeout:** seven-system architecture is settled. Atlas owner recovery is complete. Manny-only entitlements are executed. Client 360 and commercial launches are deferred. Remaining technical governance is separate maintenance. Worktree retirement is not an owner-operability blocker. **Do not restart the architecture audit.**

## Snapshot

| Area | Status | Evidence |
|------|--------|----------|
| Owner production workflow (Command Center SharePoint reads) | **YELLOW — Hub/Elite live; signed-in Elite session not proven this closeout** | Anonymous `/api/pm/*` and `/api/ba/health` 401 (expected). Hub `/health` `pmBackend.mode=sharepoint`, `ba.configured=true`, `ba.reachable=true`. No user JWT / device-code this session. Owner signs in at Elite to load Command Center / My Work / Portfolio / Projects. |
| Website → `HVCG_Leads` ingest | **GREEN — COMPLETE AND VERIFIED** | Live www contact POST 201 `durable=true` `atlasSyncStatus=synced` → Hub keyed ingest → SharePoint `HVCG_Leads` (idempotent update). Buffer is Azure Table `HvcgWebsiteLeads` only. No second CRM. Synthetic closeout item removed. |
| HVCG Master Architecture Audit — core production architecture | **GATE 11 — COMPLETE** | [Reports/GATE11_FINAL_CLOSURE.md](Reports/GATE11_FINAL_CLOSURE.md) |
| Canonical Atlas line | `integration/atlas-canonical` | Git; do not treat `origin/main` as the integration line |
| `origin/main` | **UNCHANGED** `b641fdd784b9d9cc50b85f2e5548526da4f28a02` | Must not be modified without separate promotion authorization |
| Atlas V1 system of record | SharePoint `HVCG_*` (CRM / clients / projects / tasks / HVCG finance ops) | Owner Decision 3; Hub `pmBackend.mode=sharepoint` |
| Dynamics / Dataverse | **DEFERRED** — no migration | Owner Decision 3 |
| Token paths | Elite → Hub → `id-atlas-prod` → Graph → SharePoint `HVCG_*`; Elite → Hub → MI → BA | Audiences not mixed (`https://graph.microsoft.com` vs `api://` BA URI) |
| Client 360 mapping | **DEFERRED POST-AUDIT FEATURE** (fail-closed; not an audit blocker) | Owner Decision 5; `apps/atlas-integration-api/src/client360/access.ts` |
| Gate 12 worktree/workspace retirement | **NOT STARTED** | Explicitly out of scope |
| Seven-system architecture | Defined; commercial launches are **post-audit** | [docs/architecture/HVCG_SYSTEM_INDEX.md](../docs/architecture/HVCG_SYSTEM_INDEX.md); Owner Decision 1 |
| GCC | Commercial CFO / financial-intelligence product; own app/data boundary; HVCG may be a tenant | Owner Decision 2 |
| G11-F03 client entitlements | **COMPLETE** — `G11-F03 — MANNY-ONLY INITIAL PRODUCTION ENTITLEMENTS COMPLETE` | Entra read-back: Manny sole member of all seven groups; Hub app `checkMemberGroups` returns all seven IDs; Hub `INTEGRATION_CLIENT_ENTITLEMENT_GROUPS` maps those seven IDs. Signed-in Elite session was **not** proven (no user JWT). Owner role is not client access. |
| G11-F07 GitHub main protection | **DEFERRED ENGINEERING GOVERNANCE** (already in place; do not change) | PR + 1 approval + dismiss stale + conversation resolution + 6 Atlas checks + no force-push + no deletion + `enforce_admins`. Not an owner-operability blocker. |
| G11-F08 Atlas CI / release control | **DEFERRED ENGINEERING GOVERNANCE** (already in place; do not change) | `atlas-ci.yml` + `atlas-release-control.yml`. Residual: GitHub `production` reviewers not invented; default branch still `cursor/v1.1.0-intelligence-ai-ops`. |
| Worktree count | **27** | `git worktree list` (C1 already removed 19 Atlas checkouts; branches kept) |

## Canonical git (verify with `git rev-parse`; do not reuse chat SHAs)

| Ref | Role |
|-----|------|
| `integration/atlas-canonical` | Canonical Atlas source |
| `origin/main` | Protected production-promotion target; SHA must stay `b641fdd784b9d9cc50b85f2e5548526da4f28a02` until a separately authorized promotion |
| Default GitHub branch | `cursor/v1.1.0-intelligence-ai-ops` (residual; not changed by Gate 11) |

## Production Atlas

| Component | Status |
|-----------|--------|
| Elite SWA | Live (`https://zealous-rock-0090c7e1e.7.azurestaticapps.net`) — honesty UI for unimplemented ops |
| Hub | Live `https://app-atlas-integration-hub.azurewebsites.net` — auth required; SharePoint PM via `id-atlas-prod` Graph (no `$filter`); keyed `POST /api/website/leads` → `HVCG_Leads` |
| BA | Configured and reachable through Hub; anonymous `/api/ba/health` is 401 |
| Local AI | Disabled on production Hub |

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

## What the next session must not redo

- Do not re-audit product overlap, BA architecture, Elite auth, or completed Gate 11 findings unless **current** repository evidence contradicts them.
- Do not start Gate 12, prune/retire more worktrees, archive systems, delete branches, or remove preservation.
- Do not launch commercial products.
- Do not promote `integration/atlas-canonical` to `main`.
- Do not initiate Dynamics/Dataverse.
- Do not invent Client 360 mappings.
- Do not add anyone except Manny to client groups.

## Status authority

Within Atlas, **this file** is the status SoR. July 2026 Dynamics Track-1 freeze notes are historical evidence only; they do not override Owner Decision 3 (SharePoint `HVCG_*` is Atlas V1 SoR).
