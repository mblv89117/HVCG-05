# CURRENT_STATE

**As of:** 2026-08-14 20:25 UTC  
**Status SoR:** this file  
**Canonical worktree:** `.worktrees/atlas-canonical-integration`  
**Canonical branch:** `integration/atlas-canonical`  
**Historical July 16 snapshot (not current SoR):** [Archive/CURRENT_STATE_2026-07-16.md](Archive/CURRENT_STATE_2026-07-16.md)

## Snapshot

| Area | Status | Evidence |
|------|--------|----------|
| HVCG Master Architecture Audit — core production architecture | **GATE 11 — COMPLETE** | [Reports/GATE11_FINAL_CLOSURE.md](Reports/GATE11_FINAL_CLOSURE.md) |
| Canonical Atlas line | `integration/atlas-canonical` | Git; do not treat `origin/main` as the integration line |
| `origin/main` | **UNCHANGED** `b641fdd784b9d9cc50b85f2e5548526da4f28a02` | Must not be modified without separate promotion authorization |
| Atlas V1 system of record | SharePoint `HVCG_*` (CRM / clients / projects / tasks / HVCG finance ops) | Owner Decision 3; Hub `pmBackend.mode=sharepoint` |
| Dynamics / Dataverse | **DEFERRED** — no migration | Owner Decision 3 |
| Seven-system architecture | Defined; commercial launches are **post-audit** | [docs/architecture/HVCG_SYSTEM_INDEX.md](../docs/architecture/HVCG_SYSTEM_INDEX.md); Owner Decision 1 |
| GCC | Commercial CFO / financial-intelligence product; own app/data boundary; HVCG may be a tenant | Owner Decision 2 |
| G11-F03 client entitlements | **COMPLETE** — Manny only on seven `HVCG-Client-*` groups | Entra tenant `3df46563-86f3-4414-87fd-84ba967741ef` |
| G11-F07 GitHub main protection | **COMPLETE** | Branch protection on `main` |
| G11-F08 Atlas CI / release control | **COMPLETE** | `.github/workflows/atlas-ci.yml`, `atlas-release-control.yml` |
| Client 360 mapping | **DEFERRED POST-AUDIT FEATURE** (fail-closed; not an audit blocker) | Owner Decision 5; `apps/atlas-integration-api/src/client360/access.ts` |
| Gate 12 worktree/workspace retirement | **NOT STARTED** | Explicitly out of scope for Gate 11 |
| Worktree count | **27** | `git worktree list` (C1 already removed 19 Atlas checkouts; branches kept) |

## Canonical git (verify with `git rev-parse`; do not reuse chat SHAs)

| Ref | Role |
|-----|------|
| `integration/atlas-canonical` | Canonical Atlas source |
| `origin/main` | Protected production-promotion target; SHA must stay `b641fdd784b9d9cc50b85f2e5548526da4f28a02` until a separately authorized promotion |
| Default GitHub branch | `cursor/v1.1.0-intelligence-ai-ops` (residual; not changed by Gate 11) |

## Production Atlas (read-only this gate)

| Component | Status |
|-----------|--------|
| Elite SWA | Live (`https://zealous-rock-0090c7e1e.7.azurestaticapps.net`) |
| Hub | Live `https://app-atlas-integration-hub.azurewebsites.net` — auth required; SharePoint PM via managed identity |
| BA | Configured and reachable through Hub; anonymous `/api/ba/health` is 401 |
| Local AI | Disabled on production Hub |
| Client business records | Not mutated by Gate 11 final closure |

## Entitlements (G11-F03)

Immediate production client access is **Manny only** (`manny@highvaluecapitalgroup.com`, Entra object `e4835ea2-3c45-493a-95f5-472f6339661d`) on:

- HVCG-Client-ACCG01
- HVCG-Client-CCB01
- HVCG-Client-CPL01
- HVCG-Client-HFD01
- HVCG-Client-KAVA01
- HVCG-Client-LIEN01
- HVCG-Client-PDG01

No other users. Employee-to-client roster requires a later owner approval.

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
