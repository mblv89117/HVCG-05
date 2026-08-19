# Command Center — Next Wire Plan (Dev Only)

**Branch:** `cursor/executive-command-center`  
**Target:** `https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter-Dev`  
**Production:** **FORBIDDEN** — no tenant deploy, no Prod connectors, no master-pm register edits

---

## Objective

Wire the Executive Command Center to surface **real** client health band counts and directional MRR from the master-pm business-launch intelligence pack — without creating a second system of record.

**Mirrored band counts (source register):** Green **3** · Yellow **6** · Red **54**

---

## Phase 0 — Preconditions (complete)

| Item | Status |
|------|--------|
| ECC architecture locked | ✅ `ARCHITECTURE.md`, `DATA_MAP.md` |
| KPI definitions | ✅ `KPI_DEFINITIONS.md` |
| Screen / BI specs | ✅ `SCREEN_SPECS.md`, `POWERBI_CEO_MODEL.md` |
| Offline tests | ✅ `tests/executive/run_offline_tests.py` |
| master-pm health register | ✅ `CLIENT_HEALTH_DASHBOARD.json` (READ-ONLY) |

---

## Phase 1 — Snapshot ingest (Dev, no Prod)

**Goal:** Make health scores available to Dev surfaces without modifying master-pm.

| Step | Action | Owner | Output |
|------|--------|-------|--------|
| 1.1 | Copy `CLIENT_HEALTH_DASHBOARD.json` → ECC `src/sharepoint/seed/executive/client-health-snapshot.json` | ECC agent | Versioned snapshot with `generated_at` |
| 1.2 | Add ingest script `scripts/executive/import-client-health-snapshot.py` (dry-run default) | ECC agent | Maps JSON → `HVCG_Clients` patch plan |
| 1.3 | **Do not run import** until master-pm releases D-003 merge gate | Owner | — |

**Field mapping (snapshot → `HVCG_Clients`):**

| Snapshot field | SP column | Notes |
|----------------|-----------|-------|
| `code` | `ClientCode` | Join key |
| `client` | `Title` | Display |
| `health_score` | `HealthScore` (recommend new column) or `CopilotKeywords` JSON | Prefer explicit column via SHARED recommendation |
| `health_band` | `OverallHealth` | Green / Yellow / Red |
| `pricing_current` | `MonthlyRetainer` | **Only** when `pricing_confidence` ∈ {VERIFIED, INVOICE_EXTRACTED} |
| `top_next_action` | `CopilotSummary` | Truncate to 500 chars |
| `renewal` | `RenewalStatus` (recommend) | MISSING → blank |
| `data_tier` | `ClientStage` | STRUCTURED → `Active Client` candidate; else `Discovery` |

**Pricing write rule:** Import **only** ACCG01 ($4,539) and CHRI01 ($4,750) to `MonthlyRetainer` on first pass. All other amounts remain blank (KPI rule: never invent).

---

## Phase 2 — SharePoint views (Dev)

| Step | File | Action |
|------|------|--------|
| 2.1 | `src/sharepoint/views/executive-views.json` | Provision views on Dev site |
| 2.2 | View: `Exec — Client Health` | Filter `OverallHealth` ∈ {Red, Yellow} OR `RequiresExecutiveAttention` = true |
| 2.3 | View: `Exec — Verified MRR` | Filter `MonthlyRetainer` > 0 AND `ClientStage` = Active Client |
| 2.4 | View: `Exec — Discovery Census` | Filter `ClientStage` = Discovery; sort by file count desc |

Merge into `command-center-views.json` is **recommendation-only** per `SHARED_FILE_RECOMMENDATIONS.md`.

---

## Phase 3 — Canvas app (`scrHomeExec`)

| Region | Wire to | Initial Dev value |
|--------|---------|-------------------|
| **KPI-11 Client health** | `HVCG_Clients.OverallHealth` counts | G **3** / Y **6** / R **54** (from snapshot until CRM refresh) |
| **KPI-02 MRR** | `SUM(MonthlyRetainer)` active clients | **$9,289** verified floor |
| **KPI-01 Pipeline $** | `HVCG_Opportunities` | **$0** — show explicit empty state |
| **KPI-04 Forecast** | `HVCG_RevenueForecastLines` | **$0** |
| **Queue: Yellow clients** | Gallery ← `Exec — Client Health` view | 6 rows: LIEN01, INTL01, KAVA01, ARBO01, CHRI01, VICT01 |
| **Queue: Owner decisions** | `HVCG_Decisions` RequiresExecutiveAttention | Seed 3 Dev rows: BL-ACCG-PRICE, ARBO01 active confirm, CHRI01 cadence |

**Formulas:** Paste `ExecutiveNamedFormulas.fx` (`nfExecMrrVerified`, `nfExecHealthCounts`) per BUILD_SHEET.

**Named formula sketch (Dev):**

```
nfExecHealthGreen = 3   // snapshot until live COUNTROWS
nfExecHealthYellow = 6
nfExecHealthRed = 54
nfExecMrrVerified = 9289
```

Replace constants with `COUNTROWS`/`SUM` after Phase 1 import.

---

## Phase 4 — Power BI (`HVCG_CEO_Command`)

| Page | Measure | Dev seed |
|------|---------|----------|
| CEO Overview | `[Client Health Green]` | 3 |
| CEO Overview | `[Client Health Yellow]` | 6 |
| CEO Overview | `[Client Health Red]` | 54 |
| CEO Overview | `[MRR Verified]` | 9,289 |
| Pipeline & Forecast | `[Pipeline $]` | 0 (blank formatting) |
| Cash & AR | `[AR Past Due $]` | 0 until Finance import |
| Exceptions Queue | Yellow structured clients | 6-row table |

Build per `POWERBI_CEO_MODEL.md` — SharePoint Dev lists only. Paste measures from `src/power-bi/executive/measures.dax`.

**Concentration visual:** Top-2 verified clients = 100% of MRR — flag in BI narrative text box.

---

## Phase 5 — Copilot brief grounding

| Step | Action |
|------|--------|
| 5.1 | Allow-list `CopilotSummary`, `OverallHealth`, `MonthlyRetainer`, `ClientCode` per `COPILOT_EXECUTIVE.md` |
| 5.2 | Ground brief on: band counts (3/6/54), verified MRR ($9,289), top 3 Green actions, 6 Yellow queue |
| 5.3 | **Exclude** discovery census (49 Red) from narrative unless Owner requests full inventory |

Weekly brief flow (`HVCG_ExecutiveWeeklyBrief.json`) stays **Off** per `FLOW_INTEGRATION.md`.

---

## Phase 6 — Validation (Dev smoke)

| # | Test | Pass criteria |
|---|------|---------------|
| 1 | `python3 tests/executive/run_offline_tests.py` | All PASS |
| 2 | scrHomeExec OnVisible | KPI-11 shows G3/Y6/R54 |
| 3 | MRR tile | $9,289 (not directional $23k) |
| 4 | Pipeline tile | $0 with "No open opportunities" empty state |
| 5 | Yellow queue | 6 structured clients with `top_next_action` |
| 6 | Role gate | Finance tiles hidden for non-Owner |
| 7 | Prod guard | No connection to Prod site URL |

Checklist: `SMOKE_TEST_CHECKLIST.md`

---

## Explicit out of scope

| Item | Reason |
|------|--------|
| master-pm register edits | Owned by master-pm-orchestrator |
| Prod SharePoint / Power Apps publish | Owner gate |
| CRM flow modifications | CRM branch owns `HVCG_*` flows |
| Pipeline seeding from discovery | Would invent funnel data |
| Full 63-client CRM import | Requires owner classification pass |
| `deployment/**` engine changes | Platform agent scope |

---

## Sequencing summary

```
Phase 1 Snapshot copy (no write)
    ↓
Phase 2 Dev views provisioned
    ↓
Phase 3 scrHomeExec constants → live COUNTROWS
    ↓
Phase 4 Power BI pages + measures
    ↓
Phase 5 Copilot allow-list brief
    ↓
Phase 6 Dev smoke → HANDOFF to owner for Maker publish
```

**Merge gate:** Hold Phases 1–6 CRM writes until master-pm releases integration (see `PROJECT_STATUS.md`). Phases 0 docs and offline tests can proceed now.

---

## Owner actions (Dev Maker)

1. Confirm Dev site URL and Owner Entra group.  
2. Approve `HealthScore` / `RenewalStatus` column recommendations in SHARED merge.  
3. Run import script **dry-run** → review patch plan for ACCG01 + CHRI01 only.  
4. Publish `scrHomeExec` to `HVCG_ProjectCommandCenter_DEV`.  
5. Publish `HVCG_CEO_Command` to HVCG OS workspace (Owner audience).  
6. Keep `HVCG_ExecutiveDecisionEscalation` **Off** until test mailbox configured.

See `OWNER_ACTION_GUIDE.md` for step-by-step Maker instructions.
