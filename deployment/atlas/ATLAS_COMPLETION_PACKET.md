# PROJECT ATLAS — Deployment Framework Completion Packet

**Agent:** deployment-engineer  
**Track:** Deployment Framework (Project Atlas)  
**Package:** `deployment/atlas/`  
**Version:** 0.1.0-dev  
**Status:** **COMPLETE — AWAITING QA VALIDATION**  
**Date:** 2026-07-17  

---

## Global rules compliance

| Rule | Status |
|------|--------|
| Never modify another agent's workspace | Honored — only `deployment/atlas/` on `cursor/deployment-engineer` |
| Never overwrite another branch | Honored |
| Never commit another track | Honored — **no commit** |
| Never merge | Honored |
| Never deploy | Honored |
| Additive architecture only | Honored — new package; did not replace existing `deployment/health`, pipelines, or Track-1 freeze |
| Document assumptions | See below |
| Other tracks → interface specs, not implementation | See Interfaces |
| External dependencies mocked / dry-run | Scripts default dry-run; Prod hard-blocked |
| Stop when deliverables complete | **Stopped** |

---

## Executive Summary

Project Atlas delivers a **Development-only deployment framework** that standardizes environment promotion, validation gates, rollback thinking, feature flags, blue/green design, release notes, and deployment logging for HVCG.

The framework is **scaffolding + documentation + offline-safe wrappers**. It reuses existing Dev tools via thin adapters and **explicitly refuses Production** connect/deploy. It does not replace the project-brain SoR at root `PROJECT_ATLAS/`, and it does not touch `releases/Track-1-Live-Internal/`.

Offline self-checks passed: Development guard PASS, Production guard BLOCK, preflight PASS, dry-run health/smoke/notes/log OK.

**This track is complete for QA review. No further implementation until QA validation.**

---

## Deliverables

| # | Deliverable | Path | State |
|---|-------------|------|-------|
| 1 | Deployment Dashboard | `dashboard/DEPLOYMENT_DASHBOARD.md` + schema | Done |
| 2 | Environment Manager | `docs/ENVIRONMENT_MANAGER.md` + `scripts/Test-AtlasEnvironmentGuard.ps1` | Done |
| 3 | Environment Definitions | `environments/{development,testing,staging,production}.json` + index | Done |
| 4 | Rollback Engine | `docs/ROLLBACK_ENGINE.md` + `checklists/rollback.md` | Done |
| 5 | Release Pipeline | `pipeline/atlas-release-pipeline.yml` + `docs/RELEASE_PIPELINE.md` | Done |
| 6 | Deployment Checklist | `docs/DEPLOYMENT_CHECKLIST.md` + `checklists/*` | Done |
| 7 | Health Checks | `docs/HEALTH_CHECKS.md` + `Invoke-AtlasHealthChecks.ps1` | Done (dry-run default) |
| 8 | Smoke Tests | `docs/SMOKE_TESTS.md` + `Invoke-AtlasSmoke.ps1` | Done (dry-run default) |
| 9 | Pre-flight Validation | `docs/PREFLIGHT_VALIDATION.md` + `Invoke-AtlasPreflight.ps1` | Done |
| 10 | Post Deployment Validation | `docs/POST_DEPLOYMENT_VALIDATION.md` + wrapper | Done (dry-run default) |
| 11 | Feature Flags | `docs/FEATURE_FLAGS.md` + `flags/feature-flags.*.json` | Done |
| 12 | Blue/Green Architecture | `docs/BLUE_GREEN_ARCHITECTURE.md` | Done (docs only) |
| 13 | Release Notes Generator | `docs/RELEASE_NOTES_GENERATOR.md` + `New-AtlasReleaseNotes.ps1` | Done |
| 14 | Deployment Logs | `docs/DEPLOYMENT_LOGS.md` + `Write-AtlasDeploymentLog.ps1` | Done |
| 15 | Documentation index | `README.md` + `ATLAS_MANIFEST.json` | Done |
| 16 | QA Handoff | `docs/QA_HANDOFF.md` + this packet | Done |

**Entry points for QA:** `README.md` · `docs/QA_HANDOFF.md` · this file.

---

## Assumptions

1. **Naming:** Root `PROJECT_ATLAS/` remains the project-brain SoR; `deployment/atlas/` is the deployment framework package (no rename/merge of those trees).
2. **Ownership:** Deployment Engineer owns `deployment/atlas/` on `cursor/deployment-engineer` until Master PM assigns otherwise.
3. **Promotion model:** `development → testing → staging → production` is the intended ladder; only **development** is an active Atlas execution target in 0.1.0-dev.
4. **Production:** Track-1 Live-Internal freeze and `deployment/release-ops/` are **read-only references**. Atlas does not connect, deploy, or mutate them.
5. **Reuse over rewrite:** Health, CRM smoke, Dev deploy, and rollback continue to live in existing `deployment/*` paths; Atlas wraps them.
6. **Secrets:** Live config stays in gitignored `config/environments/development.json`; Atlas definitions hold metadata only.
7. **Parallel agents:** Other Atlas tracks (website, CRM modules, ops, etc.) are consumers of Atlas **interfaces** below — not implemented here.
8. **External systems:** Power Platform, SharePoint, Azure DevOps, and GitHub Actions are treated as **mocked** unless QA later approves `-Execute` against Development only.
9. **Gates default Off:** Teams notify, client emails, canvas publish, pilot import remain `false` in all flag files.
10. **No commit in this delivery:** Artifacts remain uncommitted until QA approves a commit on this branch only.

---

## Interface specifications (other tracks — not implemented)

Use these contracts instead of reaching into another agent’s workspace.

### IF-ATLAS-01 — Environment selection

```text
Input:  environmentId ∈ {development, testing, staging, production}
Output: { connectAllowed: bool, deployAllowed: bool, flagsPath: string }
Rule:   production → always connectAllowed=false, deployAllowed=false
Owner:  deployment-engineer (Atlas)
Consumer: any module agent preparing a Dev validation run
```

### IF-ATLAS-02 — Preflight gate

```text
Input:  environmentId=development
Output: reports/preflight-<stamp>.json { overall: PASS|FAIL, checks[] }
Rule:   FAIL blocks deploy wrappers
Mock:   Offline file checks only in 0.1.0-dev
```

### IF-ATLAS-03 — Feature flag read

```text
Input:  environmentId
Output: flags object (CrmEnableTeamsNotify, EnableClientEmails, ...)
Rule:   Consumers must not flip Production flags via Atlas
```

### IF-ATLAS-04 — Deployment log append

```text
Input:  { environment, action, status, detail }
Output: logs/deploy-<stamp>.json
Rule:   productionTouch must be false for Atlas writers
```

### IF-ATLAS-05 — Release notes request

```text
Input:  { environment, version, summary, validationResults }
Output: reports/release-notes-<stamp>.md
Consumer: docs / Master PM release communication
```

### IF-ATLAS-06 — Blue/Green swap (future)

```text
Status: SPEC ONLY
Input:  { environment: staging|production, fromSlot, toSlot, validationEvidence }
Output: { swapped: bool, rollbackSlot }
Rule:   Atlas 0.1.0-dev must not execute swaps; Production blocked
```

### IF-ATLAS-07 — Track-1 / Prod ops boundary

```text
Atlas MUST NOT call:
  - deployment/release-ops/Invoke-ProdLeadQualifiedSmoke.ps1
  - pac against HVCG Production
  - mutation of releases/Track-1-Live-Internal/
Prod ops remain owner-gated via release-ops + Track-1 freeze guides.
```

---

## Risks

| ID | Risk | Severity | Mitigation |
|----|------|----------|------------|
| R1 | Agents confuse `PROJECT_ATLAS/` SoR with `deployment/atlas/` framework | Med | Documented in README + this packet; Master PM routing |
| R2 | Someone runs wrappers with `-Execute` against wrong PAC profile | High | Guard blocks `production`; QA must approve Execute; document PAC Dev-only |
| R3 | Testing/Staging definitions exist but environments may be unprovisioned | Med | Marked scaffold; deployAllowed=false |
| R4 | Dual pipelines (Atlas YAML vs existing azure-pipelines/GitHub) drift | Med | Atlas docs state “orchestration view”; no replacement this sprint |
| R5 | Feature flags diverge from Dataverse env var Values | Med | Flags are Atlas policy layer; sync is a next-sprint interface |
| R6 | Parallel track implements deploy logic outside Atlas gates | High | Publish IF-ATLAS-01/02; Master PM enforces gate usage |
| R7 | Uncommitted package lost if worktree cleaned | Low | QA → approve commit on this branch only |

---

## Technical Debt

1. **Dry-run by default** — Health/smoke/post-deploy do not yet have CI-wired Execute jobs.
2. **No real dashboard UI** — Markdown + JSON schema only; no Power BI/canvas binding.
3. **Flag ↔ Dataverse env var sync** — Not automated; manual parity risk.
4. **Blue/Green** — Architecture only; no slot provisioning or traffic swap tooling.
5. **Testing/Staging** — Definitions without provisioned Power Platform / SharePoint targets.
6. **Pipeline YAML** — Placeholder validate step; not hooked to agents or ADO project.
7. **Guard keyword list** — Production block is env-id based; does not scan arbitrary config files deeply.
8. **Report retention** — Local `reports/` / `logs/` not yet archived to a release package format.
9. **Interface versioning** — IF-ATLAS-* contracts not yet in a machine-readable OpenAPI/JSON schema pack.
10. **Worktree exclusivity** — Package lives on deployment-engineer worktree; main checkout may lack it until merge (merge is out of scope).

---

## Recommended Next Sprint

**Goal:** Make Atlas executable for **Development only**, still Prod-blocked.

1. QA sign-off on this packet → **commit on `cursor/deployment-engineer` only** (no merge).  
2. Wire offline preflight into a local `Invoke-AtlasValidate.ps1` one-shot for Dev engineers.  
3. After owner approval: one **Dev** `-Execute` health + LeadQualified smoke via Atlas wrappers; capture evidence under `deployment/atlas/reports/`.  
4. Publish machine-readable `interfaces/IF-ATLAS-*.json` for parallel agents.  
5. Align feature-flag names 1:1 with `hvcg_*` env var schema (documentation + mapping table).  
6. Staging blue/green: design-only workshop → update IF-ATLAS-06; still no Prod.  
7. Explicitly leave Track-2 pilot / website DNS / canvas publish to their tracks via interfaces.

**Out of next sprint:** Production connect, Production deploy, merge to main, enabling Teams/email, client import.

---

## QA Handoff

### Ask

Validate the Atlas package **offline**, then approve or reject for a future commit on this branch only.

### Offline commands (required)

```powershell
cd "<.worktrees/deployment-engineer or repo root containing deployment/atlas>"

pwsh -File ./deployment/atlas/scripts/Test-AtlasEnvironmentGuard.ps1 -Environment development
# expect EXIT 0

pwsh -File ./deployment/atlas/scripts/Test-AtlasEnvironmentGuard.ps1 -Environment production
# expect EXIT 2

pwsh -File ./deployment/atlas/scripts/Invoke-AtlasPreflight.ps1 -Environment development
# expect overall PASS
```

### Optional dry-runs

```powershell
pwsh -File ./deployment/atlas/scripts/Invoke-AtlasHealthChecks.ps1 -Environment development
pwsh -File ./deployment/atlas/scripts/Invoke-AtlasSmoke.ps1 -Environment development
pwsh -File ./deployment/atlas/scripts/New-AtlasReleaseNotes.ps1 -Environment development -Summary "QA review"
```

### Do not

- Pass `-Execute` until QA explicitly approves live Dev use  
- Connect to Production  
- Deploy  
- Commit / merge  
- Modify other agent worktrees or Track-1 freeze  

### Pass criteria

- [ ] All listed deliverables present under `deployment/atlas/`  
- [ ] Production guard blocks  
- [ ] Development preflight PASS  
- [ ] Assumptions and IF-ATLAS interfaces reviewed  
- [ ] No Prod/deploy/commit occurred in this delivery  

### Detail checklist

Also see `docs/QA_HANDOFF.md`.

---

## Stop

**Assigned deliverables are complete.**  

**Awaiting QA validation.** No further work on this track until QA responds.
