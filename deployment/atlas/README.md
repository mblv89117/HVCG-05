# PROJECT ATLAS — Deployment Framework

**Codename:** Project Atlas  
**Scope:** Development framework only  
**Status:** READY FOR QA  
**Home:** `deployment/atlas/`  
**Branch context:** `cursor/deployment-engineer`  

## Hard rules

| Rule | Enforcement |
|------|-------------|
| No production connection | Environment guard rejects `production` / Prod URLs |
| No production deployment | Pipeline Prod stage = blocked; scripts refuse Prod |
| No deploy in this delivery | Framework scaffolding + docs only |
| No commit in this delivery | Stop for QA before any commit |
| Do not touch Track-1 freeze | `releases/Track-1-Live-Internal/` is read-only reference |

> Root `PROJECT_ATLAS/` is the project-brain SoR. This package is the **deployment framework** under `deployment/atlas/`.

---

## Deliverables index

| Deliverable | Path |
|-------------|------|
| Deployment Dashboard | [dashboard/DEPLOYMENT_DASHBOARD.md](dashboard/DEPLOYMENT_DASHBOARD.md) |
| Environment Manager | [docs/ENVIRONMENT_MANAGER.md](docs/ENVIRONMENT_MANAGER.md) |
| Environment Definitions | [environments/](environments/) |
| Rollback Engine | [docs/ROLLBACK_ENGINE.md](docs/ROLLBACK_ENGINE.md) |
| Release Pipeline | [pipeline/atlas-release-pipeline.yml](pipeline/atlas-release-pipeline.yml) · [docs/RELEASE_PIPELINE.md](docs/RELEASE_PIPELINE.md) |
| Deployment Checklist | [checklists/](checklists/) · [docs/DEPLOYMENT_CHECKLIST.md](docs/DEPLOYMENT_CHECKLIST.md) |
| Health Checks | [docs/HEALTH_CHECKS.md](docs/HEALTH_CHECKS.md) · `scripts/Invoke-AtlasHealthChecks.ps1` |
| Smoke Tests | [docs/SMOKE_TESTS.md](docs/SMOKE_TESTS.md) · `scripts/Invoke-AtlasSmoke.ps1` |
| Pre-flight Validation | [docs/PREFLIGHT_VALIDATION.md](docs/PREFLIGHT_VALIDATION.md) · `scripts/Invoke-AtlasPreflight.ps1` |
| Post Deployment Validation | [docs/POST_DEPLOYMENT_VALIDATION.md](docs/POST_DEPLOYMENT_VALIDATION.md) · `scripts/Invoke-AtlasPostDeployValidate.ps1` |
| Feature Flags | [docs/FEATURE_FLAGS.md](docs/FEATURE_FLAGS.md) · [flags/](flags/) |
| Blue/Green Architecture | [docs/BLUE_GREEN_ARCHITECTURE.md](docs/BLUE_GREEN_ARCHITECTURE.md) |
| Release Notes Generator | [docs/RELEASE_NOTES_GENERATOR.md](docs/RELEASE_NOTES_GENERATOR.md) · `scripts/New-AtlasReleaseNotes.ps1` |
| Deployment Logs | [docs/DEPLOYMENT_LOGS.md](docs/DEPLOYMENT_LOGS.md) · `scripts/Write-AtlasDeploymentLog.ps1` |
| QA Handoff | [docs/QA_HANDOFF.md](docs/QA_HANDOFF.md) |
| Completion Packet (Exec / Risks / Debt / Next Sprint) | [ATLAS_COMPLETION_PACKET.md](ATLAS_COMPLETION_PACKET.md) |

---

## Environment promotion (Atlas)

```text
Development  →  Testing  →  Staging  →  Production (BLOCKED in this framework build)
     ▲
  ONLY active target for Atlas scripts today
```

---

## Quick start (Dev only)

```powershell
cd "<repo>"
pwsh -File ./deployment/atlas/scripts/Test-AtlasEnvironmentGuard.ps1 -Environment development
pwsh -File ./deployment/atlas/scripts/Invoke-AtlasPreflight.ps1 -Environment development
# Health / smoke wrappers call existing Dev tools — they do not touch Prod
```

---

## Manifest

See [ATLAS_MANIFEST.json](ATLAS_MANIFEST.json).
