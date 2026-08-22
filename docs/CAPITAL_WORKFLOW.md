# Capital Workflow

**As of:** 2026-08-17  
**Stage source:** `packages/atlas-capital-core/src/stages.ts`  
**Enforcement:** process code + Hub (when routes exist). SharePoint choice fields do not enforce transitions by themselves.

HVCG is not a lender. Financing outcomes are determined by third-party capital providers. Atlas does not guarantee approval, terms, or funding.

---

## 23 stages

| Stage | Label | Typical next |
|-------|--------|----------------|
| NeedIdentified | Need Identified | InitialQualification |
| InitialQualification | Initial Qualification | DocumentsRequested |
| DocumentsRequested | Documents Requested | DocumentsInProgress |
| DocumentsInProgress | Documents In Progress | DocumentsComplete |
| DocumentsComplete | Documents Complete | FinancialUnderwritingReview |
| FinancialUnderwritingReview | Financial / Underwriting Review | StrategyDrafted |
| StrategyDrafted | Strategy Drafted | AwaitingMannyStrategyApproval |
| AwaitingMannyStrategyApproval | Awaiting Manny Strategy Approval | StrategyApproved (or back to StrategyDrafted) |
| StrategyApproved | Strategy Approved | LenderVendorResearch |
| LenderVendorResearch | Lender / Vendor Research | AwaitingMannyShortlistApproval |
| AwaitingMannyShortlistApproval | Awaiting Manny Shortlist Approval | ReadyForSubmission (or back to research) |
| ReadyForSubmission | Ready for Submission | Submitted |
| Submitted | Submitted | Underwriting / RFI / Declined |
| AdditionalInformationRequested | Additional Information Requested | Underwriting |
| Underwriting | Underwriting | TermSheetOfferReceived |
| TermSheetOfferReceived | Term Sheet / Offer Received | OfferComparison |
| OfferComparison | Offer Comparison | ClientDecision |
| ClientDecision | Client Decision | Closing |
| Closing | Closing | Funded |
| Funded | Funded | ClosedArchived |
| Declined | Declined | ClosedArchived or NeedIdentified |
| Withdrawn | Withdrawn | ClosedArchived or NeedIdentified |
| ClosedArchived | Closed / Archived | (none) |

`Withdrawn` / `Declined` / `ClosedArchived` / `Funded` are documented in `FORWARD`. Do not skip Manny stages in software.

---

## Human gates

| Gate | Stage / field | Rule |
|------|----------------|------|
| Manny strategy | `AwaitingMannyStrategyApproval` + `MannyStrategyApproval` | Strategy is a draft until APPROVED. AI cannot approve. |
| Manny shortlist | `AwaitingMannyShortlistApproval` + `MannyShortlistApproval` | No lender submit before shortlist approval. |
| Client decision | `ClientDecision` + `ClientApproval` | Client chooses among compared offers. |
| Submission | `SubmissionReadiness` | Package + required checklist ACCEPTED (or audited override). |
| Closing | `ClosingReadiness` | Open `HVCG_ClosingConditions` not blocking. |
| External send | existing AI / comms policy | No auto-email or portal post. Human send step. |

---

## Operator queues

Derived (`queueFor` in `intelligence.ts`), not stored as the SoR:

- `NEEDS_ATTENTION` — default active
- `AWAITING_CLIENT` — open required client docs or document stages
- `AWAITING_LENDER` — submitted / UW / RFI / research wait
- `AWAITING_MANNY` — strategy or shortlist approval
- `OFFERS_RECEIVED` — term sheet through client decision
- `CLOSING` / `FUNDED`

Aging: `daysInStage(StageEnteredAt)` and `agingBand` (fresh / watch / overdue / critical). `DaysInStage` on the list is a cache.

---

## Legacy FundingStatus

`FundingStatus` stays on the list (Identified → On Hold). Maps are lossy. UI for this module should prefer `Stage`. Integrations that still read `FundingStatus` keep working.

---

## Outreach and offers

1. After shortlist approval, create `HVCG_LenderOutreach` rows (`SubmissionStatus=draft`).
2. Human submits (package / email / portal instructions / approved API only if later explicitly built). Record `SubmittedAt`, `SubmittedBy`, `PackageVersion`, `ConfirmationNumber`.
3. Classify inbound lender mail into `MessageClass` (advisory). RFIs may spawn document rows.
4. Offers land in `HVCG_CapitalOffers`. Comparison is informational; rate is not effective cost without fees/term/assumptions.
5. Client decision → closing conditions → funded. Fee records are separate from GL.

---

## What the workflow does not do

- Automatic stage skip when a document is uploaded
- Automatic BEST_FIT lender selection as a submission target
- Automatic invoicing when `Funded` is set
- Production Graph writes until allowlist + provisioning (see discovery)
