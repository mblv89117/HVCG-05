# Capital Data Model

**As of:** 2026-08-17  
**SoR:** SharePoint `HVCG_*` (structured) + client libraries (files)  
**Contracts:** `packages/atlas-capital-core/src/types.ts`, `src/sharepoint/lists/`  
**Catalog:** `src/sharepoint/lists/_index.json` version **2.4**

No Dataverse tables. No new database. Additive columns only on existing lists; existing fields kept (including `FundingStatus`).

Hub camelCase maps at the adapter layer. SharePoint `internalName` is authoritative on the list.

---

## Entity map

```
HVCG_Clients
  └── HVCG_CapitalProfiles          (1:1 operational snapshot per client; not a second client master)
  └── HVCG_CapitalOpportunities     (many)
        ├── HVCG_DocumentRequests   (checklist rows; also used outside capital)
        ├── HVCG_CapitalDocumentReviews
        ├── HVCG_CapitalStrategies
        ├── HVCG_LenderOutreach     → HVCG_Lenders → HVCG_CapitalSources
        │                              └── HVCG_LenderProducts
        ├── HVCG_CapitalOffers
        ├── HVCG_FundingMilestones
        ├── HVCG_ClosingConditions
        └── HVCG_FeeRecords         (also EngagementId; not GL)
HVCG_AuditEvents                    (cross-cutting)
HVCG_AI*                            (jobs/outputs/approvals; reuse)
```

`TargetAmount` on `HVCG_CapitalOpportunities` is the operational requested amount. A second `RequestedAmount` column was **not** added.

---

## Existing lists — additive columns

### HVCG_CapitalOpportunities (45 columns)

Kept: `Title`, `ClientId`, `ClientCode`, `EngagementId`, `ProjectId`, `CapitalType`, `TargetAmount`, `FundingStatus`, probability/dates, `UseOfProceeds`, owner flags, CRM `OpportunityId` / `HandoffSource`.

Added (operational pipeline):

| internalName | type | notes |
|--------------|------|--------|
| Stage | Choice (23 = `CAPITAL_STAGES`) | Additive to `FundingStatus` |
| StageEnteredAt | DateTime | Source for Hub `DaysInStage` |
| NextAction, NextActionOwner, NextActionDue | Note / Text / DateTime | Single next action |
| Blockers, Risk | Note | Operational, not a credit rating |
| SubmissionReadiness, ClosingReadiness | Boolean | Human-gated flags |
| DaysInStage | Number | Cached; Hub-computed — not a SharePoint calculated column |
| MannyStrategyApproval, MannyShortlistApproval, ClientApproval | Choice `NOT_REQUIRED\|PENDING\|APPROVED\|REJECTED\|REVISE` | |
| TransactionType | Choice (`TRANSACTION_TYPES`) | Finer than `CapitalType` |
| Purpose, Urgency, Industry, NAICS | Note / Choice / Text | Unknown stays blank |
| AnnualRevenue, EBITDA, YearsInBusiness, ExistingDebt, MonthlyDebtService, Collateral | Currency / Number / Note | Snapshots; provenance on profile/reviews |
| LastMeaningfulActivityAt | DateTime | Not merely a list edit |

Indexed new fields kept under the SharePoint ~20 index cap: `Stage`, `NextActionOwner`, `NextActionDue`, `MannyStrategyApproval`, `TransactionType`, `LastMeaningfulActivityAt`.

### HVCG_Lenders (16)

Added: `Website`, `Geography`, `RelationshipStatus`, `RelationshipOwner`, `LastVerifiedAt`, `CriteriaFreshness` (`CURRENT\|STALE\|UNKNOWN`), `VerificationSource`.

### HVCG_LenderOutreach (15)

Added: `SubmissionMethod`, `SubmissionStatus`, `SubmittedAt`, `SubmittedBy`, `ConfirmationNumber`, `PackageVersion`, `MessageClass`.  
Kept: `Response`, `NextAction`.

### HVCG_DocumentRequests (43)

Added: `ChecklistItemKey`, `Requiredness`, `Condition`, `ChecklistStatus`, `VerificationStatus`, `OverrideReason`, `OverrideBy`, `RelatedLenderId`, `SHA256`, `VersionNumber`.  
Kept: `RequestStatus` and Atlas client lookup fields.

### HVCG_FundingMilestones (13)

Added: `RelatedLenderId`, `LinkedStage`, `Blocker`, `Notes`.

### HVCG_CapitalSources (16)

Added: `LastVerifiedAt`, `CriteriaFreshness`, `VerificationSource`.  
`Website` / `Geography` already existed.

---

## New lists

| List | Purpose | Key lookups |
|------|---------|-------------|
| HVCG_CapitalProfiles | Flattened capital facts per client. `EINProtected` default true. `FieldProvenance` Note holds optional JSON. | `ClientId` |
| HVCG_LenderProducts | Product criteria. Missing criteria stay blank. Freshness required for matching. | `LenderId` |
| HVCG_CapitalStrategies | Strategy draft. Not an HVCG recommendation until `MannyApproval=APPROVED`. | `CapitalOpportunityId` |
| HVCG_CapitalOffers | Term sheet / offer facts + `Assumptions`. | Opportunity, outreach, lender |
| HVCG_ClosingConditions | Closing checklist. Status on `ConditionStatus` (SharePoint `Status` is often reserved). | Opportunity, optional document/lender |
| HVCG_FeeRecords | Fee / tail tracking. Not GL. `LegalComplianceReviewRequired` for regulated/success/tail types. | Engagement, opportunity, lender |
| HVCG_CapitalDocumentReviews | AI/human review. Extracted facts cannot be stored as VERIFIED by AI. | Opportunity, document request |

**Live Hub slice:** `HVCG_CapitalDocumentReviews` and `HVCG_LenderProducts` are **not provisioned**. Advisory reviews stay in the Hub overlay. Checklist writes reuse `HVCG_DocumentRequests`. Matching uses in-app `LenderProduct` rows when present; live `HVCG_Lenders` without products stay UNKNOWN. Do not create those lists for v1.

---

## Provenance

SharePoint is a list, not a nested document store. Flattened value columns are operational. Verification:

- `VerificationStatus` / `CriteriaFreshness` / `FieldProvenance`
- `packages/atlas-capital-core` `ProvenancedValue<T>`: `VERIFIED | DERIVED | UNVERIFIED | CONFLICTING | MISSING`
- AI extraction lands as `UNVERIFIED` (core `reviewDocument` refuses AI `VERIFIED`)

Never guess NAICS, revenue, or DSCR to fill a blank.

---

## Mapping notes

| Hub / core | SharePoint |
|------------|------------|
| `need.requestedAmount` | `TargetAmount` |
| `stage` | `Stage` |
| `capitalTypeLegacy` | `CapitalType` |
| `LenderSubmission` | `HVCG_LenderOutreach` |
| `ChecklistItem` | `HVCG_DocumentRequests` row with `ChecklistItemKey` |
| `TermSheetOffer` | `HVCG_CapitalOffers` |
| `DocumentReview` | `HVCG_CapitalDocumentReviews` |

Idempotency: use `HVCG_IdempotencyKey` on lists that have it (same PM pattern).
