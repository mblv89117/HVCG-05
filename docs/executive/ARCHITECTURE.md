# Executive Command Center — Architecture

**Module:** CEO / Executive Command Center  
**Product:** HVCG OS Command Center  
**Branch:** `cursor/executive-command-center`  
**Packaging:** **Option A — exclusive** module paths (`docs/executive/`, `src/power-apps/executive/`, `src/power-bi/executive/`, `src/sharepoint/views/executive-views.json`, `src/power-automate/executive/`, `tests/executive/`). Shared files are recommendation-only.  
**Audience:** Owner (Manny) — role `Owner` only for finance KPIs and decision queue  
**Status:** Spec + offline implementation package (no tenant deploy from this branch)

## 1. Purpose

Give the CEO a single, low-noise operating surface for:

- Pipeline and forecast health  
- MRR / cash / AR  
- Capital book momentum  
- Capacity and utilization  
- Approvals and executive decisions  
- Material risks and critical meetings  

Routine ops noise (low-priority tasks, draft AI emails, doc reminders) is **explicitly excluded**.

## 2. Capability map

```
┌─────────────────────────────────────────────────────────────┐
│                 Executive Command Center                     │
│  scrHomeExec · Power BI CEO app · Copilot brief · SP views   │
└────────────────────────────┬────────────────────────────────┘
     ┌───────────┬───────────┼───────────┬───────────┐
     ▼           ▼           ▼           ▼           ▼
  CRM / Sales  Capital    Finance Ops  Delivery   Registers
  Pipeline     Book       MRR/AR/Cash  Capacity   Decisions
  Forecast     Funding    Invoices     Health     Risks
                                                     Meetings
     └───────────┴───────────┴───────────┴───────────┘
                         ▼
              SharePoint Lists (system of record)
```

## 3. Layering

| Layer | Technology | Role |
|-------|------------|------|
| SOR | SharePoint Lists (`HVCG_*`) | Source of truth |
| Aggregation views | SharePoint list views (`executive-views.json`) | Filter/sort for Apps + BI |
| App UX | Canvas Power Apps `scrHomeExec` + exec components | Daily triage |
| Analytics | Power BI semantic model `HVCG_CEO_Command` | Trends, concentration, forecast |
| Narrative | Copilot prompts + `CopilotSummary` fields | Grounded executive briefs |
| Escalation | Existing flow `HVCG_ExecutiveDecisionEscalation` (CRM branch owns runtime; this module documents integration only) | Notify Owner on threshold |

## 4. Design principles

1. **Decision density** — Every row on the executive home should imply an action or acceptance of risk.  
2. **Single currency** — Prefer `ClientCode` + weighted dollars; never invent missing amounts.  
3. **Role gate** — Finance tiles and Restricted fields require Owner (or finance viewer where already defined).  
4. **No second SOR** — All KPIs read existing lists; no parallel executives-only tables.  
5. **Isolation** — Module files live under `docs/executive/`, `src/power-apps/executive/`, `src/power-bi/executive/`, `tests/executive/` so CRM deployment agents are untouched.

## 5. Runtime topology (Dev)

| Surface | Dev target |
|---------|------------|
| SharePoint | `https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter-Dev` |
| Power Apps | `HVCG_ProjectCommandCenter_DEV` → screen `scrHomeExec` |
| Power BI | Workspace `HVCG OS` → app audience Owner group |
| Copilot | Grounded on allow-listed columns only (`COPILOT_EXECUTIVE.md`) |

## 6. Integration boundaries

| May read | Must not modify (this branch) |
|----------|-------------------------------|
| List schemas under `src/sharepoint/lists/` | `deployment/**` engine scripts |
| Existing `command-center-views.json` (read) | Auth / PnP / `.env` |
| CRM screen navigation contracts | CRM flow JSON under `src/power-automate/flows/HVCG_{Lead,Opportunity,Capital}*` |
| Intelligence query catalog (Q14–Q15) | Live solution under active Maker OA smoke agent |

Shared-file merge recommendations: `SHARED_FILE_RECOMMENDATIONS.md`.

## 7. Related requirements

- FR-CMD-02 Executive dashboard  
- FR-RPT-01 Executive reporting  
- User story #5 — Manny only sees decisions/escalations meeting executive rules  
- SOP: `docs/sops/SOP_Executive_Escalation.md`
