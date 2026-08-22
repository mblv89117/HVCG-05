# Sprint 1 — EVA → Dev CRM capture

**Status:** **COMPLETE**  
**As of:** 2026-07-16 04:20 UTC  
**Sources:** RevenueSystemsEngineer handoff; smoke `deployment/reports/checkpoints/eva-dev-smoke-20260715-203045.json`

## Objective

Capture EVA form submissions into Development CRM (Lead + opportunity path as designed).

## Deliverables (evidence)

| Artifact | Path |
|----------|------|
| Flow definition | `src/power-automate/definitions/HVCG_EvaFormCreateLead.definition.json` |
| Dev HTTP smoke script | `deployment/scripts/crm/Invoke-EvaDevHttpSmoke.ps1` |
| Smoke result | LeadId=**13** → OppId=**18** (Path A PASS) |

## Environment

Development only. Production untouched.

## Exit

Sprint 1 COMPLETE. Schema v1 established for later sprints.
