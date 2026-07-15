# Opportunity CRM — Owner Action Guide

**Audience:** HVCG owner / Global Admin / SharePoint Admin (Manny)  
**Module:** Opportunity CRM on Dev Command Center  
**Prerequisite infra:** Tag `v1.1.0-dev-sharepoint-baseline` (1,147 fields, zero drift) frozen  
**Repo package:** Opportunity CRM v1 committed (`fd5a9b9`); schema **not yet applied** to live Dev until you run repair  

This guide consolidates every **owner-attended** stop for applying Opportunity CRM in Development. Agents can prepare packages; only you can authenticate, consent connectors, bind connections, import/activate flows, publish apps, and approve outbound Teams traffic.

Companion docs:

| Doc | Role |
|-----|------|
| `OWNER_ACTIONS_REQUIRED.md` (repo root) | Tenant-wide Dev/Prod owner checklist |
| `docs/crm/OPPORTUNITY_MANAGEMENT.md` | Technical design + apply commands |
| `docs/crm/ACCEPTANCE_REPORT.md` | Fill-in template after live verify |
| `docs/deployment/PNP_AUTHENTICATION.md` | PnP Entra Client ID registration |
| `src/power-apps/BUILD_SHEET.md` | Canvas CRM screen build order |

---

## Owner-only stop points (critical path)

Complete in this order. Items marked **STOP** block automation until you act.

| # | Stop | Why owner-only | Blocks |
|---|------|----------------|--------|
| **OA-CRM-01** | Microsoft interactive sign-in (PnP + Graph as prompted) | Tenant mutation requires your identity / MFA | Schema repair |
| **OA-CRM-02** | Admin consent for Entra/PnP/Graph permissions (first-time only) | Tenant policy blocks silent grants | Repair + Graph group/site reads |
| **OA-CRM-03** | Run additive schema repair on Dev | You must approve live SharePoint change | Lists/columns/views for CRM |
| **OA-CRM-04** | Confirm repair report: `hasDrift=false`, exit 0 | Human attestation of live state | Flow/app binding to lists |
| **OA-CRM-05** | Create/authorize connector connections (SharePoint, Teams, Outlook) | Connection creation is user-consented; JSON cannot self-bind | Flow import & run |
| **OA-CRM-06** | Import four CRM flows in Maker + bind connections | Maker UI + your connections | Automations |
| **OA-CRM-07** | Set env vars / Teams channel IDs (test channels only until approved) | Channel IDs are tenant-specific | Notification actions |
| **OA-CRM-08** | Activate flows (Off → On) after dry-run binding | Enabling can send messages if misconfigured | Runtime |
| **OA-CRM-09** | Build/publish canvas `scrCRM` / `scrOpportunityDetail` in Maker | App authoring requires Maker + your connections | End-user CRM UI |
| **OA-CRM-10** | Manual verification + fill `ACCEPTANCE_REPORT.md` | Business sign-off | Declaring CRM Dev-ready |
| **OA-CRM-11** | Explicit approval before Production promote | Production gate | Prod CRM |

Do **not** enable real client/partner notifications until OA-CRM-10 passes with test recipients only.

---

## Phase A — Sign-in and consent

### A1. Confirm PnP Entra app Client ID (once per machine/tenant)

If `authentication.pnpEntraAppClientId` is already set in local `config/environments/development.json` (gitignored), skip registration.

```powershell
pwsh -File ./deployment/scripts/Register-HVCGPnPEntraApp.ps1 -UpdateConfig
```

Details: `docs/deployment/PNP_AUTHENTICATION.md`.

### A2. Interactive Microsoft sign-in (**OA-CRM-01**)

Any repair/connect command opens a browser or device-code prompt. Sign in as the tenant admin that can manage Dev Command Center:

- Site: `https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter-Dev`

Complete MFA / Conditional Access as required.

### A3. Admin consent (**OA-CRM-02**)

If Azure AD / Graph / PnP prompts for permissions (SharePoint, Groups, Directory), click **Accept**. First Dev baseline should already have consented; re-prompt only if permissions changed or a new app ID is used.

---

## Phase B — Apply Opportunity CRM schema (additive, idempotent)

### B1. Optional safety backup (recommended)

```powershell
pwsh -File ./deployment/backup/Backup-HVCGOS.ps1 -Environment development
```

### B2. Run schema repair (**OA-CRM-03**)

From repository root (prefer the integration commit that parent merges, not a partial agent branch):

```powershell
pwsh -File ./deployment/repair/Repair-HVCGOSSharePointSchema.ps1 -Environment development
```

Expected additive outcomes (from migration `releases/migrations/20260715_001_opportunity_crm_module.json`):

- New list: `HVCG_OpportunityActivities`
- Bridge / Copilot columns on `HVCG_Opportunities` and `HVCG_CapitalOpportunities`
- CRM views (Open Pipeline, Commit Forecast, Capital Handoffs Ready, Recent Activities, etc.)

Repair is **idempotent** — safe to re-run. Do **not** delete sites or lists.

### B3. Attest drift (**OA-CRM-04**)

Confirm:

- Script exit code **0**
- Schema validation reports **zero** missing / extra / mismatched drift (`hasDrift=false`)
- Spot-check list `HVCG_OpportunityActivities` exists on Dev Command Center

Record results in `docs/crm/ACCEPTANCE_REPORT.md` § Schema.

---

## Phase C — Connection binding (**OA-CRM-05**)

In [Power Automate](https://make.powerautomate.com) / [Power Apps](https://make.powerapps.com) for the **Dev** environment:

1. **Data → Connections** (or first-run prompts when opening flows/apps)
2. Create or re-auth:
   - **SharePoint** → allow access to Command Center Dev site
   - **Microsoft Teams** → allow (needed for pipeline / win / capital notifies)
   - **Office 365 Outlook** (where flow packages list Outlook)
3. Click **Allow** / **Create** on every consent dialog

JSON under `src/power-automate/` references logical connection names only (`shared_sharepointonline`, `shared_teams`, …). Binding to *your* connections is always owner/Maker work.

---

## Phase D — Import CRM flows (**OA-CRM-06**)

Import or recreate from repo packages (preferred order):

| # | Flow | Repo path | Connectors |
|---|------|-----------|------------|
| 1 | `HVCG_LeadQualifiedCreateOpportunity` | `src/power-automate/flows/HVCG_LeadQualifiedCreateOpportunity.json` | SharePoint, Teams, Outlook |
| 2 | `HVCG_OpportunityStageChangedNotify` | `src/power-automate/flows/HVCG_OpportunityStageChangedNotify.json` | SharePoint, Teams |
| 3 | `HVCG_OpportunityWonCloseout` | `src/power-automate/flows/HVCG_OpportunityWonCloseout.json` | SharePoint, Teams, Outlook |
| 4 | `HVCG_CapitalFundingStatusNotify` | `src/power-automate/flows/HVCG_CapitalFundingStatusNotify.json` | SharePoint, Teams |

For each flow:

1. Create cloud flow in Maker (or import package if using solution packaging later).
2. When prompted, select **your** SharePoint / Teams / Outlook connections.
3. Point SharePoint actions at **Command Center Dev** lists (`HVCG_Leads`, `HVCG_Opportunities`, `HVCG_OpportunityActivities`, `HVCG_CapitalOpportunities`, …).
4. Leave flow **Off** until Phase E–F checks pass.

If a sibling agent produced `docs/crm/POWER_AUTOMATE_OWNER_GUIDE.md` / `FLOW_PACKAGE_MATRIX.md`, follow those for field-level mapping.

---

## Phase E — Environment variables and Teams channels (**OA-CRM-07**)

Set in Maker environment variables (or flow parameters) before activation:

| Variable | Purpose | Safe Dev value |
|----------|---------|----------------|
| `HVCG_SITE_URL` | Command Center Dev site URL | Dev Command Center URL |
| `HVCG_TEAMS_CRM_CHANNEL_ID` | Pipeline / win notifications | **Test-only** channel ID |
| `HVCG_TEAMS_CAPITAL_CHANNEL_ID` | Diligence / funding status | **Test-only** channel ID |

Recommended private test channels (create if missing): **HVCG CRM / Pipeline (Test)**, **HVCG Capital Desk (Test)**.  
Do not point at production client-facing channels until acceptance and written approval.

Optional: store deal war-room URL on `Opportunities.TeamsThreadUrl` after a deal channel exists.

---

## Phase F — Activation (**OA-CRM-08**)

1. Run one **manual test trigger** per flow with a **demo** lead/opportunity (Off → Test → use sample data) and confirm:
   - SharePoint writes succeed
   - Teams posts only to **test** channels
   - No unexpected Outlook sends (or sends only to your mailbox)
2. Turn flows **On** only after those checks.
3. Prefer keeping a “notification gated” pattern (test recipients / human approval) until UAT is signed in `ACCEPTANCE_REPORT.md`.

---

## Phase G — Power Apps publish (**OA-CRM-09**)

1. Open Power Apps Maker → Dev environment.
2. Build screens per `src/power-apps/BUILD_SHEET.md` and specs:
   - `src/power-apps/screens/scrCRM.md`
   - `src/power-apps/screens/scrOpportunityDetail.md`
3. Connect SharePoint lists; bind named formulas (`nfOpenPipeline`, `nfQualifiedLeads`, `nfCapitalHandoffsReady`, …).
4. Save + **Publish** Dev app.
5. Share with CapitalAdvisor / ProjectManager test users per `PERMISSIONS_MATRIX.md`.

Do not promote the app solution to Production without OA-CRM-11.

---

## Phase H — Manual verification (**OA-CRM-10**)

Walk the lifecycle once on Dev (demo data only):

1. Create / open a Lead → set **Qualified** → confirm Opportunity created (flow 1).
2. Change Opportunity **Stage** → confirm activity / notify (flow 2) to test channel.
3. Mark **Won** → confirm closeout + capital handoff fields (flow 3).
4. Change capital **FundingStatus** → confirm capital notify (flow 4) to test channel.
5. Open `scrCRM` / detail — pipeline, activities, next action visible; empty/error states sane.
6. Confirm Copilot fields (`CopilotSummary`, `CopilotKeywords`) contain no secrets (see `docs/crm/COPILOT_OPPORTUNITY.md`).

Fill `docs/crm/ACCEPTANCE_REPORT.md` with dates, operator name, pass/fail, and evidence links (run URLs, screenshots optional).

---

## Phase I — Production gate (**OA-CRM-11**)

Production CRM apply requires:

- Written approval to run Prod install/upgrade/repair
- Prod connector consent (see root `OWNER_ACTIONS_REQUIRED.md` OA-008 / P-*)
- Real Teams channel IDs (not test)
- Roster / sharing posture confirmed

This guide does **not** authorize Production actions.

---

## What agents / scripts may do without you

- Edit SharePoint list JSON, migration diffs, flow definition JSON, Power Apps screen **specs**, Copilot docs, tests
- Commit/push to agent/integration branches
- Run **local** unit tests (`python3 tests/unit/test_opportunity_crm.py`, pre-deployment test harness)

## What agents must never do without explicit approval

- Live SharePoint repair/deploy/backup connect to tenant
- Import or turn On flows in Maker
- Publish canvas apps
- Create real Teams channels or send org-wide notifications
- Point notifications at non-test recipients

---

## Quick command cheat sheet

```powershell
# PnP Client ID (once)
pwsh -File ./deployment/scripts/Register-HVCGPnPEntraApp.ps1 -UpdateConfig

# Optional backup before CRM apply
pwsh -File ./deployment/backup/Backup-HVCGOS.ps1 -Environment development

# Apply additive CRM schema (owner interactive)
pwsh -File ./deployment/repair/Repair-HVCGOSSharePointSchema.ps1 -Environment development

# Post-apply health (optional but recommended)
pwsh -File ./deployment/health/Test-HVCGOSHealth.ps1 -Environment development

# Local package tests (no tenant)
python3 tests/unit/test_opportunity_crm.py
pwsh -File ./tests/Invoke-HVCGPreDeploymentTests.ps1
```

---

## Related parallel workstreams

See `docs/crm/PARALLEL_AGENT_MAP.md` for which agent owns which files and what must stay sequential after packages merge.
