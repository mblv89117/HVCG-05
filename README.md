# HVCG OS — Project Management, CRM, Capital & Client Delivery

**HVCG OS** is the Microsoft 365 operating system for **High Value Capital Group LLC (HVCG)** — CRM, capital advisory, delivery, finance operations, knowledge, executive command, intelligence layer, AI orchestration, and AI-ready queues.

## Purpose

Run the firm: leads → capital & advisory delivery → documents → receivables → executive decisions — while keeping Manny focused on high-value judgment.

## Technology Stack (Version 1)

| Layer | Product | Notes |
|-------|---------|-------|
| Data & docs | SharePoint Online + Microsoft Lists | System of record for operational data |
| Collaboration | Teams, Outlook, OneDrive | Client teams/channels, mail, files |
| App UI | Power Apps (canvas) | HVCG Command Center |
| Automation | Power Automate (standard connectors) | Onboarding, reminders, escalations |
| Identity | Microsoft Entra ID | MFA, RBAC groups |
| Reporting | Power BI (pro if licensed; Excel fallback) | Executive + ops dashboards |
| Intelligence | `HVCG_Relationships` + query catalog | Cross-domain graph edges on SharePoint Lists |
| AI orchestration | AIJobs, AIContext, AIPrompts, etc. | Human-approved; no autonomous external sends |
| Optional V1 | Bookings, Forms | Kickoffs, intake |
| Deferred | Dataverse, Azure Functions, Copilot Studio | See licensing docs |

Version 1 **avoids** unnecessary premium licensing. Dataverse and premium connectors are deferred unless owner-approved.

## Quick Start (install HVCG OS v1.1.0)

From the repository root (PowerShell 7):

```powershell
pwsh -File ./deployment/install/Install-HVCGOS.ps1 -Environment development
```

Then validate:

```powershell
pwsh -File ./deployment/health/Test-HVCGOSHealth.ps1 -Environment development
pwsh -File ./deployment/health/Test-HVCGOSPostDeploy.ps1 -Environment development
pwsh -File ./deployment/health/Invoke-HVCGOSOperationalHealth.ps1 -Environment development
```

**Upgrade from v1.0.0** (additive; customer data preserved):

```powershell
pwsh -File ./deployment/upgrade/Upgrade-HVCGOS.ps1 -Environment development -TargetVersion 1.1.0
```

**Backup** (weekly Dev; nightly Prod recommended):

```powershell
pwsh -File ./deployment/backup/Backup-HVCGOS.ps1 -Environment development
```

Upgrade / rollback / pipelines: see [`RELEASE.md`](RELEASE.md) and [`releases/v1.1.0/notes/RELEASE_NOTES.md`](releases/v1.1.0/notes/RELEASE_NOTES.md).  
v1.0.0 release artifacts remain immutable at `releases/v1.0.0/`.  
Owner-only actions: [`OWNER_ACTIONS_REQUIRED.md`](OWNER_ACTIONS_REQUIRED.md).

## What's New in v1.1.0

- **Intelligence Layer** — `HVCG_Relationships` cross-domain graph edges with query catalog
- **AI orchestration foundation** — AIWorkers, AIJobs, AIJobSteps, AIContext, AIPrompts, AIToolRegistry, AIOutputs, AIApprovals, AIFeedback, AIAuditLog, AICostTracking (existing specialized `HVCG_AI_*` queues retained)
- **Backup / restore / DR** — `Backup-HVCGOS.ps1`, `Restore-HVCGOS.ps1`, `DISASTER_RECOVERY.md`
- **Operational monitoring** — `Invoke-HVCGOSOperationalHealth.ps1`, `HVCG_OperationalAlerts`, System Health Dashboard spec

## Repository Layout

```
/docs          Architecture, requirements, security, guides
/src           SharePoint, Power Apps, Power Automate, Graph
/templates     Project, document, meeting, communication templates
/config        Environment and naming configuration
/sample-data   Non-production demonstration data
/tests         Test plans and evidence templates
/deployment    Scripts, checklists, environments
```

## Naming Convention

Prefix: `HVCG_`

Examples: `HVCG_Clients`, `HVCG_Engagements`, `HVCG_CreateClientWorkspace`

## Documentation

Start at [`docs/INDEX.md`](docs/INDEX.md) (canonical documentation index).

| Need | Document |
|------|----------|
| Docs map / owners | [`docs/DOCUMENTATION_MAP.md`](docs/DOCUMENTATION_MAP.md) |
| Standards | [`docs/DOCUMENTATION_STANDARDS.md`](docs/DOCUMENTATION_STANDARDS.md) |
| Glossary | [`docs/GLOSSARY.md`](docs/GLOSSARY.md) |
| Onboarding | [`docs/ONBOARDING.md`](docs/ONBOARDING.md) |
| Doc status / debt | [`DOCUMENTATION_STATUS.md`](DOCUMENTATION_STATUS.md), [`DOCUMENTATION_DEBT.md`](DOCUMENTATION_DEBT.md) |
| Program status (SoR) | `.worktrees/master-pm-orchestrator/MASTER_PROJECT_STATUS.md` (master-pm) |
| Architecture (SoR) | `.worktrees/system-architect/docs/architecture/SYSTEM_ARCHITECTURE.md` (architect) |
| Release / QA | `.worktrees/qa-release-manager/docs/release/` and `docs/qa/` (integration) |

Agent communications: [`docs/agents/AGENT_COMMUNICATIONS.md`](docs/agents/AGENT_COMMUNICATIONS.md).

## Status

**Program status (authoritative):** `.worktrees/master-pm-orchestrator/MASTER_PROJECT_STATUS.md`

Root [`PROJECT_STATUS.md`](PROJECT_STATUS.md) is module/session-local and may diverge across worktrees — do not treat it as the program source of record (see DEF-QA-004 / master-pm).

## Owner Actions

Actions requiring Manny's credentials or approval are listed **only** in [`OWNER_ACTIONS_REQUIRED.md`](OWNER_ACTIONS_REQUIRED.md).

## License / Confidentiality

Internal use by High Value Capital Group LLC. Client financial data must never be committed to this repository.
