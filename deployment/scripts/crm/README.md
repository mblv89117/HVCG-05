# CRM Dev smoke scripts

Reusable PowerShell smoke tests for HVCG Opportunity CRM flows in **Development only**.

## Prerequisites

1. Copy `config/environments/development.example.json` → `development.json` (gitignored) and fill PnP Entra app client id.
2. PAC profile `HVCG-Dev-Maker` authenticated to HVCG Development.
3. PnP.PowerShell module installed.

## Scripts

| Script | Purpose |
|--------|---------|
| `Invoke-CrmLeadQualifiedSmoke.ps1` | Qualify a lead; assert opportunity, activity, lookups, automation log |
| `Invoke-EvaDevHttpSmoke.ps1` | EVA Path A: offline fixtures + Dev `HVCG_Leads` write + optional qualify→opp |
| `Invoke-CrmAllSmoke.ps1` | Stage / Won / Capital suites (plus optional prior LeadQualified evidence) |

Evidence JSON is written under `deployment/reports/checkpoints/` (local only; do not commit tenant run reports).

Do **not** run against Production.
