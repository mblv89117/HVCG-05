# Sales Automation and Interface Specifications

## Automation policy

Automation may calculate, draft, classify, queue, and alert. It may not send,
sign, post, collect, qualify, write off, publish, or deploy without the
corresponding gate.

All automations are defined here as contracts. Runtime dependencies are mocked.

## Automation catalog

| ID | Trigger | Result | External side effect | Gate |
|---|---|---|---|---|
| REV-A01 | EVA completed | upsert lead intent + score | Mock CRM | manual qualification |
| REV-A02 | lead lacks next action | internal stale-lead alert | Internal mock only | none |
| REV-A03 | qualification approved | create opportunity intent | Mock CRM | approver reference |
| REV-A04 | opportunity stage changes | recalculate forecast/health | None | valid transition |
| REV-A05 | proposal requested | create versioned draft | Mock document | pricing approval |
| REV-A06 | proposal approved | queue outbound | No send | BL-C1 |
| REV-A07 | proposal accepted | create contract request | Mock legal/e-sign | owner/legal |
| REV-A08 | contract signed | request client/engagement/onboarding | Mock interfaces | signature evidence |
| REV-A09 | billing schedule due | create billing intent | Mock Finance | commercial approval |
| REV-A10 | invoice due/past due | recommend collection action | No send | Finance + BL-C1 |
| REV-A11 | renewal window opens | create renewal review | Internal mock | relationship owner |
| REV-A12 | daily snapshot | calculate KPI/forecast/health | None | source watermark |
| REV-A13 | pipeline health red | internal executive alert | Internal mock | none |
| REV-A14 | owner gate unresolved | block transition + audit event | None | named owner |

## Interface envelope

Every interface uses:

```json
{
  "interface_version": "1.0.0",
  "message_id": "uuid",
  "idempotency_key": "source|entity|action|version",
  "correlation_id": "uuid",
  "environment": "Mock",
  "occurred_at": "ISO-8601",
  "actor": "revenue-os",
  "approval_refs": [],
  "payload": {}
}
```

Responses must include `accepted`, `external_id`, `errors`, and
`source_watermark`. Retries must be safe.

## CRM interface (CRM owner)

Revenue may request:

- lead upsert using the locked EVA schema
- activity append
- opportunity creation after manual qualification
- opportunity stage update
- proposal metadata link
- next action update

Revenue may read:

- leads, opportunities, activities, proposals, approvals
- source IDs and watermarks

Revenue must not:

- alter SharePoint/Dataverse schema
- edit existing Power Automate contracts
- activate flows
- qualify leads automatically
- write Production

Mock adapter response:

```json
{
  "accepted": true,
  "external_id": "mock-lead-001",
  "environment": "Mock",
  "side_effect_performed": false
}
```

## Finance interface (Finance Operations owner)

### Revenue → Finance

`BillingIntentRequested`

Required payload:

- client and engagement IDs
- contract and proposal references
- billing type, amount, currency
- service period/milestone
- payment terms and due-date policy
- tax treatment = `FINANCE_DECIDES`
- approval references
- idempotency key

### Finance → Revenue

- `BillingIntentAccepted|Rejected`
- `InvoiceIssued`
- `PaymentRecorded`
- `InvoicePastDue`
- `InvoiceVoided`
- `WriteOffApproved|Rejected`

Revenue must not assign invoice numbers, post to GL, allocate payments, or write
off balances.

## Operations / Client Onboarding interface

Revenue emits `ClientOnboardingRequested` after:

- signed contract evidence
- client + engagement identity
- billing readiness
- owner/PM requested
- service package/template key

Operations responds:

- onboarding case ID
- project/workspace IDs
- owner assignment
- kickoff readiness
- blockers

Revenue does not create delivery workspaces, project tasks, or operational SOPs.

## Client Portal interface

Revenue may request:

- portal eligibility review
- document-request package
- proposal/contract/invoice link publication after approval

Portal owner controls access groups, invitations, authentication, data rooms, and
client-visible content. BL-C1 gates invitations.

## Executive Command interface

Revenue publishes a read-only `ExecutiveRevenueSnapshot` contract:

```json
{
  "as_of": "ISO-8601",
  "currency": "USD",
  "pipeline": {},
  "forecast": {},
  "sales": {},
  "retainers": {},
  "billing": {},
  "collections": {},
  "health": {},
  "data_quality": {}
}
```

Executive Command owns visualization, navigation, access, and publish behavior.
Revenue owns metric definitions and calculation fixtures.

## Legal / contract interface

Revenue requests a contract envelope; legal/business owner returns:

- approved template/version
- contracting entity
- authorized signer
- exception disposition
- signed document/evidence ID
- effective and renewal dates

No legal text or e-sign provider is implemented here.

## Calendar interface

Strategy requests contain preferred time windows. A future calendar owner may
return booked slot and meeting ID. Until LIVE-BOOKING approval:

- calendar provider is null
- status is `REQUESTED_STAGING`
- confirmation email/SMS is not sent

## Accounting/payment interface

Future accounting/payment adapters may return invoice and payment facts. This
design never stores credentials, charges a payment method, or treats a payment
intent as collected cash.

## Failure handling

1. Validate payload before queueing.
2. Reject schema/version mismatch.
3. Deduplicate by idempotency key.
4. Retry transient failures with bounded exponential backoff.
5. Dead-letter after configured attempts.
6. Emit an internal alert and audit event.
7. Never bypass an owner gate because of retry pressure.

