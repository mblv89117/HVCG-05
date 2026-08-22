# Capital Security

**As of:** 2026-08-17  
**Parent:** [security/SECURITY_MODEL.md](security/SECURITY_MODEL.md), [security/PM_SHAREPOINT_SELECTED_PERMISSIONS.md](security/PM_SHAREPOINT_SELECTED_PERMISSIONS.md)  
**Module:** Atlas Capital Operations (internal). Same Entra tenant, same Hub, same SharePoint. No parallel identity provider.

---

## Identity and roles

Reuse Entra groups. Relevant existing roles:

| Group | Capital expectation |
|-------|---------------------|
| HVCG-Role-Owner | Strategy/shortlist analog of executive gate; fee/legal visibility |
| HVCG-Role-CapitalAdvisor | Day-to-day capital workstreams and packages |
| HVCG-Role-ProjectManager / FinancialAnalyst | Assigned client work; not a bypass of Manny gates |
| HVCG-Client-{ClientCode} | Library + related items for that client |

Immediate production client-group membership remains **Manny-only** unless a later owner roster says otherwise (Gate 11). Do not add users from this document.

Hub JWT + ClientCode filtering stay in force. Capital routes, when built, must not be a generic Graph proxy.

---

## Data classification

| Class | Capital examples | Handling |
|-------|------------------|----------|
| Restricted Client Financial | Tax returns, bank statements, PFS, EIN | Libraries + labels; `EINProtected` on profiles; minimize in AI context |
| Internal Confidential | Success fees, tail, lender pricing notes, strategy | Internal groups; not portal-visible by default |
| Internal General | Checklist templates, stage labels | Staff |

Dev/fixtures: synthetic data only. ACCG/Prodigy real PII must not appear in tests or JSON fixtures.

---

## SharePoint and Graph

Production PM today: managed identity `id-atlas-prod`, `Lists.SelectedOperations.Selected`, allowlist **Projects / Tasks / Milestones write, Clients read**.

**Capital list IDs are not in that allowlist.** Live capital writes are BLOCKED until the owner:

1. Provisions additive columns and new lists.
2. Grants Selected operations on those lists (least privilege; write only where required).
3. Configures Hub allowlist IDs and capabilities.

Do not grant the Hub identity site-wide list access to “make capital easier.” Do not create a dedicated capital site unless an owner ADR says so (current PM decision was: keep Command Center site).

Residual: ungranted **catalog/schema metadata** can be visible to the MI token. Item data isolation was observed for ungranted lists in tested live conditions; that is tenant behavior, not a Microsoft contractual guarantee. Application allowlist remains mandatory.

`development-json` is local/CI only. Production configuration must not point capital at `pm-store.json`.

---

## Files and sharing

- Originals preserved; no in-place “AI cleanup” of source PDFs.
- Anonymous links denied on HVCG-Clients (existing policy).
- Lender packages: human send; no standing anonymous data-room links from this module.
- SHA-256 is integrity metadata, not encryption.

---

## Audit

Write `HVCG_AuditEvents` for:

- Stage transitions
- Manny strategy / shortlist decisions
- Checklist overrides
- Submission events
- Fee records that require legal review

AI path: `HVCG_AIAuditLog` for jobs. Do not skip audit because the actor is an agent.

---

## Threats specific to capital

| Threat | Control |
|--------|---------|
| Premature lender send | Manny shortlist + submission readiness + no auto-send |
| Fabricated financials in UI | Fixtures labeled; verification ceiling; missing stays missing |
| Cross-client deal leakage | ClientCode + existing Hub filters + library ACLs |
| Graph overreach | Allowlist; no `/lists` catalog from the capital adapter |
| Fee/tail over-claim | Legal flag; not GL; not legal advice |
| Fixture PII | Synthetic only |

Incident response follows `docs/sops/SOP_Security_Incident_Response.md`.
