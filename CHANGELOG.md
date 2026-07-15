# CHANGELOG

## [1.1.0] — 2026-07-14

### Added — Intelligence, AI orchestration, backup, monitoring

- **Intelligence Layer** — `HVCG_Relationships` normalized cross-domain relationship graph edges (people, clients, capital parties, opportunities, projects, documents, meetings, tasks, decisions, risks, funding milestones); indexed fields for SharePoint-scale filtering (`RelationshipId`, entity types, `ClientCode`, `IsCrossClient`, status, dates); query catalog at `docs/intelligence/INTELLIGENCE_QUERY_CATALOG.md`; migration guidance for future Dataverse / Microsoft Graph / Cosmos DB / dedicated graph DB
- **AI orchestration foundation** — `HVCG_AIWorkers`, `HVCG_AIJobs`, `HVCG_AIJobSteps`, `HVCG_AIContext`, `HVCG_AIPrompts`, `HVCG_AIToolRegistry`, `HVCG_AIOutputs`, `HVCG_AIApprovals`, `HVCG_AIFeedback`, `HVCG_AIAuditLog`, `HVCG_AICostTracking`; existing specialized `HVCG_AI_*` queues retained and linkable via `JobId`; human approval defaults on; `ExternalSendBlocked=true` (no autonomous external communications)
- **Backup & disaster recovery** — `deployment/backup/Backup-HVCGOS.ps1`, `deployment/restore/Restore-HVCGOS.ps1`, `DISASTER_RECOVERY.md`
- **Operational monitoring** — `MONITORING.md`, `deployment/health/Invoke-HVCGOSOperationalHealth.ps1`, `HVCG_OperationalAlerts`, `docs/reporting/SYSTEM_HEALTH_DASHBOARD.md`
- **Documentation** — Updated architecture, security, permissions, deployment, admin, scalability, technical debt, and test plans for v1.1.0
- **Tests** — `tests/intelligence/test_intelligence_ai_backup.py` for schema validation of new entities

### Notes

- Additive, backward-compatible minor release; v1.0.0 artifacts immutable
- Schema grows from 68 to **81** SharePoint lists
- Customer data preserved across 1.x upgrades via additive migrations
- Migration pack: `releases/migrations/20260714_002_intelligence_ai_backup_v1_1_0.json`

## [1.0.0] — 2026-07-14

### Added — Installable release system
- Semantic versioning (`VERSION`, `version.json`, `releases/v1.0.0/`)
- Release notes and schema snapshot / checksums
- `Install-HVCGOS.ps1`, `Upgrade-HVCGOS.ps1`, `Rollback-HVCGOS.ps1`
- Config schema migration (`config/migrations/`)
- `HVCG_SystemInfo` list for installed version tracking
- Health checks + post-deployment validation
- Managed/unmanaged Power Platform solution manifests (`HVCGOS` / `HVCGOS_managed`)
- Managed solution import script + pack script
- GitHub Actions + Azure DevOps Dev → Test → Production gates
- `RELEASE.md` engineering guide; v2.x upgrade policy stub

### Notes
- First GA installable release of HVCG OS (68 lists, 21 templates)
- Customer data preserved across 1.x upgrades via additive migrations

## [1.5.0-os] — 2026-07-14 (pre-release OS expansion)

### Added
- CRM, capital, finance, AI queues, ops hub, portal prep, Copilot/BI docs

## [1.1.0-deploy] — 2026-07-14

### Added
- `Deploy-HVCGDevelopment.ps1` orchestration

## [1.0.0-repo] — 2026-07-14

### Added
- Initial repository foundation
