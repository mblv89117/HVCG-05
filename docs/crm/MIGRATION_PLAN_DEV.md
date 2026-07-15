# Opportunity CRM — Dev migration plan

**Migration pack:** `releases/migrations/20260715_001_opportunity_crm_module.json`  
**Diff:** `releases/migrations/diffs/opportunity_crm_v1.json`  
**Audit base:** `cursor/v1.1.0-intelligence-ai-ops` @ `4a8f25d`  
**Scope:** Dev SharePoint Command Center schema only (no Power Apps / flows / prod).

---

## Verdict

| Check | Result |
|-------|--------|
| Additive only | **Yes** — diff keys are only `addLists` + `addColumns` (no remove/rename/delete) |
| Idempotent apply path | **Yes** — `Repair-HVCGOSSharePointSchema.ps1` → `Install-HVCGListsFromSchema` / `Add-HVCGFieldFromSchema` skip existing fields |
| Semver bump | **No** — pack is `1.1.0` → `1.1.0` (`additiveOnly: true`) |
| Safe for Dev repair | **Yes** when applied via **Repair** (recommended). Do **not** rely on `Upgrade-HVCGOS.ps1` for this pack once Dev is already on 1.1.0 |

---

## Exact Dev SharePoint changes

### 1. New list — `HVCG_OpportunityActivities`

| Internal name | Type | Notes |
|---------------|------|--------|
| Title | Text | Required (system Title) |
| OpportunityId | Lookup → `HVCG_Opportunities` | Indexed |
| LeadId | Lookup → `HVCG_Leads` | Indexed |
| ClientId | Lookup → `HVCG_Clients` | Indexed |
| ActivityType | Choice | Call, Email, Meeting, Note, StageChange, Proposal, Handoff, FundingUpdate, Other; default Note; required; indexed |
| ActivityDate | DateTime | Required; indexed |
| OwnerEmail | Text | Indexed |
| Outcome | Text | |
| Notes | Note | |
| PriorStage | Text | |
| NewStage | Text | |
| CopilotKeywords | Note | |
| HVCG_IdempotencyKey | Text | Indexed |

### 2. New columns — `HVCG_Opportunities`

| Internal name | Type | Notes |
|---------------|------|--------|
| CapitalOpportunityId | Lookup → `HVCG_CapitalOpportunities` | Indexed |
| CapitalHandoffStatus | Choice | NotApplicable, Ready, HandedOff, InFunding, Funded, Declined; default NotApplicable; indexed |
| NextActionDate | DateTime | Indexed |
| NextActionNotes | Note | |
| CopilotKeywords | Note | |
| CopilotSummary | Note | |
| TeamsThreadUrl | Text | |
| HVCG_IdempotencyKey | Text | Indexed |

### 3. New columns — `HVCG_CapitalOpportunities`

| Internal name | Type | Notes |
|---------------|------|--------|
| OpportunityId | Lookup → `HVCG_Opportunities` | Indexed |
| HandoffSource | Choice | SalesWin, Direct, Referral, Expansion, Other; default Direct; indexed |

### 4. Views (via repair views pass — not inside the JSON diff)

From `src/sharepoint/views/command-center-views.json` (CRM-relevant):

| List | View title |
|------|------------|
| `HVCG_Opportunities` | Open Pipeline |
| `HVCG_Opportunities` | Commit Forecast |
| `HVCG_Opportunities` | Capital Handoffs Ready |
| `HVCG_Leads` | Open Leads |
| `HVCG_Leads` | Qualified Leads |
| `HVCG_OpportunityActivities` | Recent Activities |
| `HVCG_CapitalOpportunities` | Active Capital Book |

---

## Why Repair (not Upgrade) for Dev

1. **Same-version pack** — `Upgrade-HVCGOS.ps1` exits with “Already at 1.1.0” when installed == target, so this Active pack is never applied by the upgrade planner after Dev is on 1.1.0.
2. **Lookup completeness** — `Invoke-HVCGListDiff` creates `addLists` then **skips Lookup columns** on the new list. Repair’s two-pass `Install-HVCGListsFromSchema` provisions look-ups correctly.
3. **Views** — Repair runs `Install-HVCGViews` unless `-SkipViews`.
4. Observability — recent Dev backup report warned `List missing, skip data: HVCG_OpportunityActivities`, confirming the activities list is not yet on tenant.

The migration JSON remains the documented additive contract; Repair applies the full source-of-truth schemas that include that contract.

---

## Exact repair command (owner-run)

From repo root, authenticated to the Dev tenant:

```powershell
pwsh -File ./deployment/repair/Repair-HVCGOSSharePointSchema.ps1 -Environment development
```

Optional dry planning (no PnP mutations beyond whatif short-circuit):

```powershell
pwsh -File ./deployment/repair/Repair-HVCGOSSharePointSchema.ps1 -Environment development -WhatIf
```

Schema-only if seed must be skipped:

```powershell
pwsh -File ./deployment/repair/Repair-HVCGOSSharePointSchema.ps1 -Environment development -SkipSeed
```

---

## Validation steps (post-repair)

1. **Exit code** — repair process exits `0`; console/report `Success=True`.
2. **Deployment report** — open latest under `deployment/reports/` for `*-repair-schema*`; confirm created/skipped fields (no Errors); Note skipped existing fields is OK (idempotent re-run).
3. **Schema compliance** — `Assert-HVCGSharePointSchemaCompliance` phase `post-repair` / report under `deployment/reports/schema/`:
   - `hasDrift=false` / `Compliant=True` for Dev site
   - Lists present: `HVCG_OpportunityActivities`, `HVCG_Opportunities`, `HVCG_CapitalOpportunities`
4. **Column spot-check (PnP or UI)**  
   - Opportunities: `CapitalOpportunityId`, `CapitalHandoffStatus`, `NextActionDate`, `CopilotSummary`, `HVCG_IdempotencyKey`  
   - Capital: `OpportunityId`, `HandoffSource`  
   - Activities: `ActivityType`, `ActivityDate`, `OpportunityId`, `LeadId`, `ClientId`
5. **Views** — confirm the seven CRM views listed above exist on the Dev Command Center site.
6. **Repo unit gate (no tenant)**  

```powershell
python3 ./tests/unit/test_opportunity_migration.py
python3 ./tests/unit/test_opportunity_crm.py
```

7. **Idempotency** — re-run the same Repair command; expect skip counts for already-present lists/fields and still `Success=True`.

---

## Out of scope for this repair

- Power Apps / Power Automate packaging or connections  
- Production or Test environments  
- Data seed contents beyond what Repair’s `-SkipSeed` / config `seedSampleData` already control  
- Editing `deployment/lib` or Deploy scripts  

See also: `docs/crm/PHASE1_SAFETY_CHECK.md`.
