# HANDOFF — What Was Built

## Summary

High Value Capital Group’s **Project Management & Client Delivery System (V1)** is specified and packaged in this repository as a Microsoft 365–native solution centered on SharePoint Lists, Power Apps, and Power Automate (standard connectors). Live wiring into the HVCG tenant requires the owner actions listed in `OWNER_ACTIONS_REQUIRED.md`.

## What was built

| Area | Location |
|------|----------|
| Architecture & decisions | `ARCHITECTURE.md`, `DECISION_LOG.md` |
| Data model | `DATA_DICTIONARY.md`, `src/sharepoint/lists/` (27 lists) |
| Client folders 00–23 | `config/hvcg.config.json`, library template |
| Provisioning scripts | `deployment/scripts/` |
| 18 project templates | `templates/projects/`, `PROJECT_TEMPLATE_CATALOG.md` |
| Automations | `AUTOMATION_CATALOG.md`, `src/power-automate/flows/` |
| App UX | `src/power-apps/` |
| Reporting | `docs/architecture/REPORTING.md` |
| Security | `SECURITY_MODEL.md`, `PERMISSIONS_MATRIX.md` |
| Sample data | `sample-data/` |
| Tests | `TEST_PLAN.md`, `tests/unit/test_schemas.py` |
| Guides | `DEPLOYMENT_GUIDE.md`, `ADMIN_GUIDE.md`, `USER_GUIDE.md` |

## How to deploy

Follow `DEPLOYMENT_GUIDE.md` after completing owner actions.

## How to administer / use

`ADMIN_GUIDE.md` and `USER_GUIDE.md`.

## How to add a client

Set stage to Active Client (app) → onboarding flow; or scripts if flow unavailable.

## How to create a project

`HVCG_CreateProjectFromTemplate` or `New-HVCGProjectFromTemplate.ps1`.

## How to modify templates

Edit JSON under `templates/projects/` → upload to Knowledge → update `HVCG_Templates`.

## How to troubleshoot automations

Flow history + `HVCG_AutomationLogs` (see Admin Guide).

## How to grant/remove access

Entra `HVCG-Role-*` and `HVCG-Client-{Code}` groups; roster template in `docs/security/`.

## Known limitations

- Canvas app and flows are **spec packages** until rebuilt in the tenant (no live admin session here).
- Client portal deferred (V2).
- Operational finance ≠ accounting system.
- Lists scale monitored; Dataverse may be V2.

## Version 2 backlog

See `BACKLOG.md`.
