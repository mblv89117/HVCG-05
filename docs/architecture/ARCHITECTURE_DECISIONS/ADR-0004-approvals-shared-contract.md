# ADR-0004 — HVCG_Approvals Is a Shared Contract

| Field | Value |
|-------|--------|
| ID | ADR-0004 |
| Title | HVCG_Approvals shared contract governance |
| Status | Accepted |
| Date | 2026-07-15 |
| Decision owner | architect |

## Context

Inventory shows `HVCG_Approvals.json` content drift on `operations-hub` tip (baseline 10 columns → Ops 14, including `RequesterEmail` and `Amount`). Domain lists also exist (`HVCG_ExpenseApprovals`, `HVCG_AIApprovals`, Ops approval router flows).

## Problem

Unilateral column changes on a cross-module list break consumers and acceptance packs.

## Options considered

1. Let each module extend `HVCG_Approvals` ad hoc
2. Freeze core columns; require architect review for additive columns; domain-specific lists for specialized payloads
3. Replace with Approvals connector only (no list)

## Decision

**Option 2.** `HVCG_Approvals` is a **shared contract**. Additive columns require architecture review / ADR update. Specialized payloads stay in domain lists (`HVCG_ExpenseApprovals`, `HVCG_AIApprovals`) linked via `RelatedList` / `RelatedItemId`.

## Rationale

Preserves a single cross-domain approval spine while allowing Ops/Finance/AI specialization without silent forks.

## Consequences

- Ops must submit ARQ for Approvals expansion **or** revert shared file to baseline and keep extras domain-side
- Master/QA treat Approvals schema diffs as release risks

## Affected modules

operations, finance, ai-governance, delivery/CRM.

## Migration / security / testing / rollback

If Ops columns are approved: additive-only migration in Dev; update all consumers; no destructive renames. Security: ApproverEmail must not broaden permissions. Rollback: restore baseline schema file + ignore unknown columns in readers.

## Related files

`src/sharepoint/lists/HVCG_Approvals.json`, Ops tip `cursor/operations-hub`.
