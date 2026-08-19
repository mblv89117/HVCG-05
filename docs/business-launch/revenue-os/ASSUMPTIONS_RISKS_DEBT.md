# Assumptions, Risks, and Technical Debt

## Assumptions

1. Existing `HVCG_*` list definitions are contracts, not authorization to change
   schemas or deploy.
2. Sprint 1–4 EVA/conversion artifacts remain backward compatible and unchanged.
3. SharePoint/Dataverse exports may be incomplete; missing values mean unknown.
4. USD is the reporting currency until Finance specifies multi-currency policy.
5. Finance is authoritative for invoices, collections, payments, taxes, GL, and
   write-offs.
6. Legal/business owner is authoritative for contract text and signature.
7. Operations and Client Portal own delivery workspace and access provisioning.
8. Executive Command owns dashboard UI; Revenue owns metric definitions.
9. BL-C1 blocks all external email/SMS and portal invitations.
10. Track 1 Production remains frozen.
11. Pricing exceptions, legacy pricing, and unapproved SKU cards require owner
    review; no automatic repricing.
12. All integrations in this phase are deterministic mocks.

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Cross-track ownership collision | inconsistent or overwritten systems | interface specs only; owning-agent approval |
| CRM stage mismatch (`Verbal Commit`) | semantic loss | map to Negotiation + metadata until owner decision |
| Contract entity absent | broken opportunity-to-onboarding lineage | logical envelope + legal interface |
| Billing-intent entity absent | Revenue may overreach into Finance | contract-only interface; no invoice creation |
| Inconsistent IDs across lists | duplicate clients/opportunities/invoices | correlation + idempotency keys |
| Stale/incomplete data | misleading dashboard/forecast | completeness KPIs + watermarks + unknown semantics |
| Manual forecast optimism | biased forecast | stage ceilings + approval reason + accuracy tracking |
| Automated outbound before approval | compliance/reputation | fail-closed BL-C1 gate |
| Legacy client repricing | contractual breach | legacy guard + immutable pricing references |
| Revenue recognized too early | financial misstatement | distinguish pipeline, booked, invoiced, collected |
| Payment/collections side effects | financial harm | mock only; Finance owns execution |
| Production drift | Track 1 regression | no deploy/write/flow activation |

## Technical Debt

1. No first-class contract-envelope list.
2. No first-class billing-intent list.
3. No first-class onboarding-case list.
4. Opportunity stage contract lacks `Verbal Commit`.
5. Proposal status contract lacks explicit `Approved` and `Expired`.
6. Invoice model does not expose currency, service period, payment terms, or
   source billing-intent ID.
7. Forecast lines have no vintage/scenario/source watermark.
8. Metric snapshots lack an approved persistent store.
9. Existing list ownership spans CRM, Finance, Operations, and Executive tracks.
10. No canonical commercial ID policy beyond optional idempotency fields.
11. No contract tests against live Dev adapters.
12. No approved e-sign/calendar/accounting/payment providers.
13. No outbound consent/preference center implementation.
14. No SLO/monitoring implementation for revenue automations.

Debt items are not resolved here because doing so would require schema,
infrastructure, or another track’s workspace.

## Decisions required before implementation

- CRM owner: stage/status mappings and adapter contract
- Finance: billing-intent acceptance and invoice/payment events
- Legal/owner: contract envelope, templates, signers, exceptions
- Operations: onboarding readiness and workspace response
- Client Portal: access and publication interface
- Executive Command: dashboard snapshot ingestion
- Owner: pricing cards, BL-C1, LIVE-BOOKING, Production gates

