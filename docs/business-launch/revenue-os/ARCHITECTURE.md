# Revenue OS Architecture

## Design principles

1. **Additive only.** Existing lists, EVA contracts, and flows remain unchanged.
2. **One commercial identity chain.** `lead_id → opportunity_id → proposal_id →
   contract_id → client_id → engagement_id → project_id → invoice_id`.
3. **Explicit state machines.** Invalid transitions fail closed.
4. **Human gates for consequential actions.** Qualification, pricing, contract
   acceptance, outbound, write-off, and Production activation require approval.
5. **Event + audit first.** Every accepted transition emits a versioned event.
6. **Finance is accounting SoR.** Revenue requests billing; Finance owns posting,
   invoice authority, collection policy, and write-offs.
7. **External dependencies are mocked.** Interfaces specify intent, not side effects.

## System layers

| Layer | Revenue-owned responsibility | External owner/interface |
|---|---|---|
| Experience | EVA results, activation CTA, strategy request | Website owner for live publish |
| Revenue orchestration | Lifecycle states, gates, routing, next actions | CRM owner for list/flow adapters |
| Commercial | Opportunity, recommendation, proposal, commercial terms | Legal/owner for contract approval |
| Delivery handoff | Won deal package and onboarding readiness | Operations + Client Portal |
| Revenue operations | Billing intent, renewal, forecast, health | Finance for invoices/collections |
| Intelligence | KPI definitions, forecasts, pipeline analytics | Executive Command for UI |
| Audit | Idempotency, event definitions, approval references | AI Governance / platform logging |

## Lifecycle state machines

### 1. Lead Pipeline

| State | Entry | Exit criteria | Next |
|---|---|---|---|
| New | inbound/EVA/referral captured | identity + consent + owner assigned | Contacted / Disqualified |
| Contacted | meaningful contact logged | discovery scheduled or reason closed | Discovery / Disqualified |
| Discovery | discovery request/meeting exists | need, authority, timing, fit recorded | Qualified / Nurture / Disqualified |
| Qualified | manual approval; `auto_qualify=false` | opportunity created idempotently | Converted |
| Nurture | fit/timing not sales-ready | re-score or owner action | Contacted / Disqualified |
| Converted | client/opportunity link exists | terminal lead state | — |
| Disqualified | reason + reviewer | terminal unless manually reopened | New |

Controls:

- Duplicate key: normalized email + company.
- Legacy guard blocks new-client pricing/nurture.
- External nurture remains `PLANNED_NOT_SENT` until BL-C1.
- Lead status never changes to Qualified automatically.

### 2. Sales Pipeline

The sales pipeline is the activity/ownership view over leads and opportunities:

`Unworked → Working → Meeting Scheduled → Meeting Held → Follow-up → Decision
Pending → Closed`.

Every open item requires `owner`, `next_action`, and `next_action_at`. Items with
no next action are unhealthy, regardless of monetary value.

### 3. Opportunity Pipeline

| Stage | Probability default | Required evidence |
|---|---:|---|
| Discovery | 10% | qualified problem + decision process |
| Assessment | 25% | completed assessment/discovery + recommended path |
| Proposal | 50% | approved proposal version |
| Negotiation | 70% | open terms + decision date |
| Verbal Commit | 85% | documented verbal approval; no revenue booking |
| Won | 100% | signed contract + onboarding/billing readiness |
| Lost | 0% | loss reason + date |

Existing CRM lacks `Verbal Commit`; adapters must map it to `Negotiation` plus an
additive metadata field/Notes value until the CRM owner approves schema change.

### 4. Proposal Engine

`Draft → Internal Review → Approved → Sent → Negotiation → Accepted / Rejected /
Expired / Withdrawn`

Proposal generation inputs:

- opportunity and decision maker
- approved SKU/service recommendation
- scope and deliverables
- commercial model: setup, retainer, fixed, success fee, hourly, hybrid
- term, renewal, payment cadence, assumptions, exclusions
- pricing register version and approval IDs

Rules:

- Owner-review SKUs cannot enter Approved without approval reference.
- Every revision creates a new immutable version.
- Sent is an outbound action and remains mocked until approved.
- Accepted proposal does not equal a signed contract.

### 5. Contract Engine

`Draft → Legal/Owner Review → Approved to Send → Sent → Negotiation → Signed →
Activated / Declined / Expired / Terminated`

Required controls:

- contract template/version and contracting entity
- proposal + opportunity lineage
- authorized signer and signature evidence
- effective/start/end/renewal/notice dates
- pricing, billing schedule, success-fee trigger, client obligations
- approval chain and exception log

This track defines the contract envelope only. Legal text, e-sign integration,
and signature authority are external owner interfaces.

### 6. Client Onboarding

`Pending Contract → Pending Payment → Internal Setup → Client Inputs → Kickoff
Ready → Active → Blocked`

Readiness gates:

- signed/activated contract
- invoice/payment policy satisfied
- client and engagement records linked
- owner/PM assigned
- workspace request acknowledged
- kickoff date and agenda
- document request list
- security/access approvals

Revenue emits `client_onboarding_requested`; Operations and Client Portal own
workspace/project/access implementation.

### 7. Retainer Management

`Planned → Active → At Risk → Renewal Due → Renewed / Expanded / Paused /
Cancelled / Completed`

Monthly controls:

- contracted MRR vs invoiced vs collected
- service period and invoice cadence
- delivery/relationship health
- renewal date, notice window, next executive action
- expansion/contraction/churn reason

No legacy client is repriced automatically.

### 8. Project Billing

Revenue creates a **billing intent**, never an accounting entry:

`Draft Intent → Commercial Review → Finance Accepted → Invoice Drafted →
Invoice Issued → Collected / Partial / Past Due / Void`

Billing intent types:

- setup fee
- recurring retainer
- fixed milestone
- hourly/time-and-materials
- reimbursable expense
- success fee
- credit/adjustment request

Finance owns tax, invoice numbering, posting, payment allocation, credits, and GL.

### 9. Invoice Tracking

Normalize existing invoice states:

`Draft → Sent → Partial → Paid / Past Due / Void`

Derived fields:

- open balance = amount − amount collected
- days outstanding = as-of − invoice date
- days past due = max(0, as-of − due date)
- aging bucket = Current / 1–30 / 31–60 / 61–90 / 90+

### 10. Collections

`Current → Reminder Due → Contacted → Promise to Pay → Payment Plan → Escalated →
Resolved / Write-off Requested`

Collections actions are recommendations until Finance approves. Write-off always
requires Finance + owner approval. Prospect/client outbound remains mocked.

## Revenue database

### Logical entities

- `Lead`
- `SalesActivity`
- `Opportunity`
- `Proposal`
- `ContractEnvelope` (new logical entity; no deployed schema)
- `Client`
- `Engagement`
- `OnboardingCase` (logical/interface)
- `Project`
- `BillingIntent` (logical/interface)
- `Invoice`
- `CollectionActivity`
- `ForecastLine`
- `Approval`
- `RevenueEvent`
- `MetricSnapshot`

### Identity and idempotency

Every command carries:

```json
{
  "command_id": "uuid",
  "idempotency_key": "domain|source-id|action|version",
  "actor": "user-or-service",
  "occurred_at": "ISO-8601",
  "environment": "Mock|Development",
  "approval_refs": []
}
```

Repeated idempotency keys return the original result and produce no duplicate side
effect.

## Command and event model

Commands express requested intent:

- `CaptureLead`
- `RecordDiscovery`
- `RequestLeadQualification`
- `CreateOpportunity`
- `GenerateProposalDraft`
- `RequestProposalApproval`
- `RequestContract`
- `RequestClientOnboarding`
- `CreateBillingIntent`
- `RequestInvoice`
- `RecommendCollectionAction`
- `RequestRenewalReview`

Events record accepted facts:

- `LeadCaptured`
- `LeadQualificationApproved`
- `OpportunityStageChanged`
- `ProposalVersionCreated`
- `ProposalApproved`
- `ContractSigned`
- `OnboardingRequested`
- `EngagementActivated`
- `BillingIntentAccepted`
- `InvoiceIssued`
- `PaymentRecorded`
- `CollectionEscalated`
- `RenewalDecisionRecorded`

## Owner approval matrix

| Action | Default | Required owner |
|---|---|---|
| Auto-qualify lead | Blocked | Revenue owner + CRM owner |
| Proposal pricing exception | Blocked | Business owner |
| Send proposal/contract | Mocked | Business owner + BL-C1 |
| Accept/sign contract | External | Authorized signer/legal |
| Create client workspace | Interface only | Operations/Portal |
| Issue invoice | Interface only | Finance |
| Send collections message | Mocked | Finance + BL-C1 |
| Write off balance | Blocked | Finance + business owner |
| Production activation | Blocked | Deployment + owner |
| Public dashboard/publish | Blocked | Executive/Website + owner |

