# AUTOMATED_ONBOARDING_SPEC

**As of:** 2026-07-15 18:45 PT  
**Priority:** #7 — Automated Client Onboarding  
**Trigger:** Opportunity `Stage` → **Won** (HVCG new clients only)  
**Status:** SPEC READY — fire in Dev only when flows imported; no Prod, no invites, no client email  
**Data model:** `CLIENT_DATA_MODEL.md` · `CRM_ACCOUNT_CONTACT_ENGAGEMENT_MAPPING.md`  
**Existing flows:** `HVCG_OpportunityWonCloseout` · `HVCG_ClientOnboarding` · child flows

---

## Scope & exclusions

| Client class | Automated onboarding |
|--------------|---------------------|
| `HVCG_NEW_CLIENT` | **Yes** — full spec below |
| `HVCG_PROSPECT` | No — remains lead/opportunity until Won |
| `HVS_LEGACY_CLIENT` | **No** — migration track; manual / ACCG packet |
| `HVS_TRANSITIONING_CLIENT` | **No** — owner gates BL-ACCG-CLASS etc. |
| `FORMER_CLIENT` | No |

**Legacy guard:** Never apply HVCG rate card or default onboarding pricing to legacy classes.

---

## Trigger

| Event | Source | Idempotency |
|-------|--------|-------------|
| Opportunity `Stage` = `Won` | `HVCG_Opportunities` | `HVCG_IdempotencyKey` = `onboard|{OpportunityId}` |
| Pre-req | Signed agreement on file (manual confirm until doc automation) | |
| Pre-req | `owner_approval_required` cleared on proposal price | |

**Parent flow:** `HVCG_OpportunityWonCloseout` → invoke onboarding orchestration.

**Environment:** HVCG Development only until PROD-1.

---

## Orchestration sequence

```
Won
  → 1. Validate + legacy guard
  → 2. Create / update Account (HVCG_Clients)
  → 3. Create Contacts
  → 4. Create Engagement (owner-approved pricing only)
  → 5. Workspace plan → optional provision (PortalEnabled=false)
  → 6. Project from template
  → 7. Document requests from template set
  → 8. Internal tasks (no client email)
  → 9. Log + notify staff (Teams gated Off)
```

---

## Step 1 — Validate & legacy guard

| Check | Fail action |
|-------|-------------|
| `Classification` ∉ legacy classes | Abort; log `LEGACY_BLOCK` |
| `ContractingEntity` = HVCG | Abort if HVS |
| Owner-approved `ProposalAmount` / engagement price present | Abort → executive escalation |
| `ClientCode` unique | Generate if missing per naming convention |
| `PortalEnabled` | Force **false** |
| BL-C1 | Skip all external comms steps |

---

## Step 2 — Create Account (`HVCG_Clients`)

| Logical field (`CLIENT_DATA_MODEL`) | SP column | Source on Won |
|-------------------------------------|-----------|---------------|
| LegalName | `Title` | Lead `Title` / EVA Q0.1 |
| DBA | `DBA` | EVA Q0.2 |
| EntityType | `EntityType` | EVA Q0.3 |
| State | `StateOfFormation` | EVA Q0.4 |
| Classification | `Classification` *(additive)* | `HVCG_NEW_CLIENT` |
| ContractingEntity | `ContractingEntity` *(additive)* | `High Value Capital Group LLC` |
| ClientCode | `ClientCode` | Generated `{PREFIX}{NN}` |
| ClientStage | `ClientStage` | `Active Client` |
| PortalEnabled | `PortalEnabled` | **false** |
| SharePointLibraryUrl | `SharePointLibraryUrl` | `PLAN_ONLY` until workspace provisioned |
| Service package | `EngagementTypePrimary` | Won Opportunity `ServicePackage` / SKU |
| Pricing | `MonthlyRetainer`, `SetupFee`, `SuccessFee*` | **Owner-approved proposal only** — rate card v1 |
| Relationship owner | `RelationshipOwnerEmail` | Opportunity `SalesOwnerEmail` |
| PM | `ProjectManagerEmail` | Ops assignment rule / default |

**Forbidden:** Copying HVCG calculator defaults without approved proposal row.

---

## Step 3 — Create Contacts (`HVCG_Contacts`)

| Logical field | SP column | Source |
|---------------|-----------|--------|
| Name | `Title` | Lead `ContactName` / EVA Q0.6 |
| Email | `Email` | Lead `Email` |
| Phone | `Phone` | Lead `Phone` / EVA Q0.6 |
| Role | `JobTitle` | EVA Q0.6 role |
| Primary | `IsPrimary` | true for first contact |
| Decision maker | `IsDecisionMaker` | Discovery call notes |
| Billing | `IsBillingContact` | Default false until confirmed |

**Do not** set `DoNotContact` false or send welcome — BL-C1.

---

## Step 4 — Create Engagement (`HVCG_Engagements`)

| Logical field | SP column | Source |
|---------------|-----------|--------|
| AccountId | `ClientId`, `ClientCode` | Step 2 |
| ContractingEntity | `ContractingEntity` *(additive)* | HVCG |
| EngagementType | `EngagementType` | Opportunity `OpportunityType` |
| ServicePackage | `ServicePackage` | SKU-CAP-* from proposal |
| MonthlyRetainer | `MonthlyRetainer` | Approved proposal |
| SetupFee | `SetupFee` | Approved proposal |
| SuccessFeeDebtPercent | `SuccessFeeDebtPercent` | 1.5 if SKU-SUCCESS-DEBT |
| SuccessFeeEquityPercent | `SuccessFeeEquityPercent` | 3 if SKU-SUCCESS-EQUITY |
| EngagementValue | `EngagementValue` | 12× monthly + setup (estimate) |
| StartDate | `StartDate` | Won date or SOW effective |
| TermsSourceHash | `TermsSourceHash` *(additive)* | Signed agreement hash |
| OriginalPricing | `OriginalPricingNotes` *(additive)* | Snapshot at Won |
| CurrentPricing | `MonthlyRetainer` etc. | Same as Original for new clients |
| PricingPreservationFlag | `PricingPreservationFlag` | false for new HVCG |
| EngagementStatus | `EngagementStatus` | `Active` |

---

## Step 5 — Workspace plan (no invite)

| Action | Flow | Notes |
|--------|------|-------|
| Load plan from template | `portal/WORKSPACE_PLAN_TEMPLATE.md` | Per-client instance |
| Provision library | `HVCG_CreateClientWorkspace` | Dev only; folders 00–23 |
| Update URL | `SharePointLibraryUrl` | After provision |
| Portal | `PortalEnabled` | Stays **false** |
| Invites | — | **SKIP** — BL-C1 |

Legacy clients: use filled plan (e.g. `ACCG_WORKSPACE_PLAN.md`) — **do not** auto-run create workspace.

---

## Step 6 — Project from template

| Parameter | Value |
|-----------|-------|
| Flow | `HVCG_CreateProjectFromTemplate` |
| Default template | `general-client-onboarding` |
| Alt templates | `capital-readiness-assessment`, `fractional-cfo-engagement`, `debt-capital-raise`, etc. — select by `ServicePackage` / SKU |
| Duration | `defaultDurationDays` from template JSON |

**Skip or gate task t4 (welcome communication)** until BL-C1.

---

## Step 7 — Document requests

| Source | Flow |
|--------|------|
| EVA ops readiness gaps (Q17) | `HVCG_CreateDocumentRequests` |
| Template doc set | `templates/projects/{templateKey}.json` document request section |
| Portal visibility | `PortalVisible` = **false** until BL-C1 |

**Standard new-client requests (minimum)**

| Request | Target folder | From EVA |
|---------|---------------|----------|
| Last 2 years tax returns | 05 | Q17.1 |
| YTD + prior P&L / BS | 04 | Q17.2 |
| Bank statements (6–12 mo) | 06 | Q17.3 |
| Debt schedule | 07 | Q17.4 |
| Ownership / org chart | 02 | Q17.5 |

---

## Step 8 — Internal tasks (no client email)

| Task | Role | Due |
|------|------|-----|
| First internal document review | FinancialAnalyst | +7 days |
| Schedule kickoff meeting | ProjectManager | +2 days |
| Confirm engagement terms filed | OperationsManager | +0 days |
| Billing milestones (setup / retainer) | OperationsManager | +1 day |

---

## Step 9 — Logging & notifications

| Item | Setting |
|------|---------|
| `HVCG_AutomationLogs` | Always |
| Teams notify | **Off** (`HVCG_CRM_ENABLE_TEAMS_NOTIFY=false`) |
| Client email | **Off** (`HVCG_ENABLE_CLIENT_EMAILS=false`) |
| Outlook send | **Forbidden** without BL-C1 |

---

## ACCG / legacy path (reference only)

ACCG uses manual migration — **not** this Won trigger. See `ACCG_ONBOARDING_PACKET.md` and `crm-import/ACCG01_dev_shell.json`. When Dev shells allowed:

1. Classification `HVS_LEGACY_CLIENT`  
2. Pricing null until BL-ACCG-PRICE  
3. Workspace plan only — `ACCG_WORKSPACE_PLAN.md`  
4. No onboarding automation fire

---

## Owner gates

| ID | Blocks |
|----|--------|
| BL-C1 | Welcome email, doc request client notify, portal |
| PROD-1 | Prod execution |
| D-002 | Flow import / Maker |
| BL-P1 | *(CLOSED)* — new client rates |
| BL-ACCG-* | Legacy ACCG manual path |

---

## Build readiness

| Piece | Status |
|-------|--------|
| Spec + field mapping | **READY** |
| Flow definitions exist | **READY** (repo) |
| Dev flow import | **BLOCKED** — D-002 |
| Live Won trigger | **BLOCKED** — D-002 + PROD-1 |
| Client comms steps | **BLOCKED** — BL-C1 |

**Related:** `sales/PIPELINE_STAGES.md` · `portal/WORKSPACE_PLAN_TEMPLATE.md` · `CLIENT_DATA_MODEL.md`
