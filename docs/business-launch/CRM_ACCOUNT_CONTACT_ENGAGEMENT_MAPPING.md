# CRM_ACCOUNT_CONTACT_ENGAGEMENT_MAPPING

**As of:** 2026-07-15 18:10 PT  
**Purpose:** Recommendations only — map Business Launch logical entities (Account / Contact / Engagement) to existing SharePoint CRM lists.  
**Scope:** Docs/specs · **no** locked-index edits · **no** Prod writes · **no** `_index.json` / `command-center-views.json` changes this cycle.  
**List schemas referenced:** `.worktrees/crm-dev-validation-commit/src/sharepoint/lists/HVCG_{Clients,Contacts,Engagements}.json`

---

## 1. Entity → list map

| Logical entity (`CLIENT_DATA_MODEL`) | SharePoint list | Join key | Notes |
|--------------------------------------|-----------------|----------|-------|
| **Account** | `HVCG_Clients` | `Title` (legal name) + `ClientCode` | Master client record |
| **Contact** | `HVCG_Contacts` | `ClientId` → Clients; `Email` | People under account |
| **Engagement** | `HVCG_Engagements` | `ClientId` → Clients | Commercial engagement(s); prefer **not** overloading all commercial fields onto Clients alone |

Related (later, not this cycle): `HVCG_Projects`, `HVCG_Tasks`, `HVCG_Milestones`, `HVCG_Deliverables`, `HVCG_Invoices`, `HVCG_DocumentRequests`, `HVCG_Communications`, `HVCG_CapitalOpportunities`.

---

## 2. Account (`HVCG_Clients`) field mapping

| Logical field | Existing SP column | Recommendation |
|---------------|--------------------|----------------|
| LegalName | `Title` | Use as-is |
| DBA | `DBA` | Use as-is |
| EntityType | `EntityType` | Use as-is |
| State | `StateOfFormation` | Use as-is |
| Status / stage | `ClientStage` | Use as-is (`Active Client` for ACCG) |
| Pricing (legacy) | `MonthlyRetainer`, `SetupFee`, `SuccessFee*` | **PRESERVE** values from agreements — never overwrite with new HVCG calculator rates for HVS legacy |
| Health / risk | `OverallHealth`, `RiskLevel` | Use as-is |
| Workspace URL | `SharePointLibraryUrl` | Plan URL only until approved |
| Portal | `PortalEnabled`, `PortalAccessGroup` | Keep **false** / empty for ACCG until owner BL-C1 |
| **Classification** | **MISSING** | **Recommend add** Choice column `Classification` (see §4) — **Dev first**; do not edit locked indexes without window |
| **ContractingEntity** | **MISSING** | **Recommend add** Choice `ContractingEntity` = `High Value Solution LLC` \| `High Value Capital Group LLC` (or short codes HVS \| HVCG) |

ACCG draft values (docs only): Classification=`HVS_LEGACY_CLIENT`; ContractingEntity=`High Value Solution LLC`; ClientCode=`ACCG01`; MonthlyRetainer preserve after verify.

---

## 3. Contact (`HVCG_Contacts`) field mapping

| Logical field | Existing SP column | Recommendation |
|---------------|--------------------|----------------|
| Name | `Title` | Use as-is |
| AccountId | `ClientId` + `ClientCode` | Lookup required |
| Email / Phone | `Email`, `Phone` | Use as-is |
| Role | `JobTitle` | Use as-is (or Note if multi-role) |
| Primary | `IsPrimary` | Use as-is |
| Billing / decision | `IsBillingContact`, `IsDecisionMaker` | Use as-is |

No new columns required for ACCG contact shells. **Do not** trigger welcome/invite flows.

---

## 4. Engagement (`HVCG_Engagements`) field mapping

| Logical field | Existing SP column | Recommendation |
|---------------|--------------------|----------------|
| AccountId | `ClientId`, `ClientCode` | Required lookup |
| Type / scope | `EngagementType`, `Scope`, `ServicePackage` | Use as-is |
| Pricing summary | `PricingSummary`, `BillingStructure`, `MonthlyRetainer`, `SetupFee`, `EngagementValue` | **Preserve** legacy; document source hash in `PricingSummary` or Internal notes |
| Dates | `StartDate`, `TargetCompletionDate` | Use as-is; add Renewal later if needed |
| Status / health | `EngagementStatus`, `EngagementHealth`, `FinancialStatus` | Use as-is |
| **ContractingEntity** | **MISSING** | **Recommend add** Choice (same enum as Clients) — engagements can differ historically |
| **OriginalPricing** | **MISSING** | **Recommend** Note or Currency+Note: freeze “as contracted” snapshot |
| **CurrentPricing** | Partially `MonthlyRetainer` etc. | Keep columns; policy = Current must match Original for HVS legacy unless owner-approved change |
| **TermsHash** | **MISSING** | **Recommend** Text `TermsSourceHash` = SHA256 of MSA/SOW file (from inventory) |
| SOW ref | No dedicated URL column | Use `Scope` + optional future `SowDocumentUrl` (URL) — additive only |

---

## 5. Classification / ContractingEntity — recommended column specs (Dev additive)

**Do not apply to Prod or locked shared indexes without an approved window.**

### `Classification` (Choice) — Clients (required for migration)

Values aligned with `CLIENT_DATA_MODEL.md`:

- `HVS_LEGACY_CLIENT`
- `HVS_TRANSITIONING_CLIENT`
- `HVCG_PROSPECT`
- `HVCG_NEW_CLIENT`
- `FORMER_CLIENT`
- `REFERRAL_PARTNER`

Default for ACCG: **`HVS_LEGACY_CLIENT`**.

### `ContractingEntity` (Choice) — Clients + Engagements

- `High Value Solution LLC`
- `High Value Capital Group LLC`

Default for ACCG: **`High Value Solution LLC`**.

### Optional additive (Engagements)

| Column | Type | Purpose |
|--------|------|---------|
| `OriginalPricingNotes` | Note | Verbatim terms excerpt / pointer |
| `TermsSourceHash` | Text (indexed) | SHA256 of governing agreement file |
| `PricingPreservationFlag` | Boolean default true | Guardrail for flows/UI |

---

## 6. Flow / UX guardrails (recommendations — no implementation this cycle)

1. Client onboarding / workspace flows: if `Classification=HVS_LEGACY_CLIENT`, **skip** portal invite, welcome email, and HVCG re-paper steps.  
2. Pricing calculator (new clients): hard-exclude rows where Classification is HVS legacy.  
3. `PortalEnabled` must remain false until owner BL-C1.  
4. Demo `sample-data/clients.csv` must never seed ACCG or other legacy roster names.

---

## 7. Architect ask

Please review/approve this mapping against `CLIENT_DATA_MODEL.md` and confirm:

1. Additive `Classification` + `ContractingEntity` on `HVCG_Clients` (and ContractingEntity on `HVCG_Engagements`) in **Dev only**.  
2. Whether Engagement is mandatory for every Active Client (recommended: **yes** for legacy migration completeness).

No index/list edits until architect + owner window.
