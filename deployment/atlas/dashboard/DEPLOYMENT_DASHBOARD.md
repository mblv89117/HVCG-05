# Deployment Dashboard — Project Atlas

**Purpose:** Single pane for release readiness across Atlas environments.  
**Mode:** Documentation + data schema (no live Prod telemetry in this build).

## Composition

| Panel | Source | Status in this build |
|-------|--------|----------------------|
| Environment status | `environments/*.json` + guard results | Defined |
| Pipeline stage | `pipeline/atlas-release-pipeline.yml` | Defined (Prod blocked) |
| Pre-flight | `reports/preflight-*.json` | Schema + script |
| Health | Existing `deployment/reports/health/` + Atlas wrapper | Wrapper ready |
| Smoke | CRM Dev smoke scripts via Atlas wrapper | Wrapper ready |
| Feature flags | `flags/feature-flags.<env>.json` | Dev sample |
| Last deploy log | `logs/deploy-*.json` | Template + writer |
| Rollback readiness | Rollback engine checklist | Documented |

## Environment board

| Environment | Atlas role | Deploy allowed by Atlas scripts? |
|-------------|------------|----------------------------------|
| Development | Primary | Yes (framework wrappers only; this delivery does not run deploy) |
| Testing | Promotion target | Scaffolded — not executed |
| Staging | Pre-prod rehearsal | Scaffolded — not executed |
| Production | Future gated target | **No — blocked** |

## Operator view (markdown)

Update this table after each Dev validation run (manual until UI exists):

| Metric | Value | Updated |
|--------|-------|---------|
| Framework version | 0.1.0-dev | 2026-07-17 |
| Active environment | development | — |
| Pre-flight | NOT RUN (QA) | — |
| Health | NOT RUN (QA) | — |
| Smoke | NOT RUN (QA) | — |
| Feature flags loaded | development sample | — |
| Production gate | BLOCKED | — |

## Data schema

See [dashboard-data.schema.json](dashboard-data.schema.json).

## Related

- System health BI concept: `docs/reporting/SYSTEM_HEALTH_DASHBOARD.md` (repo)
- Atlas Environment Manager: `../docs/ENVIRONMENT_MANAGER.md`
