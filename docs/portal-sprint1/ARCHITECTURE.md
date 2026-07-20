# Client Portal Sprint 1 — Architecture Summary

**Branch:** `cursor/client-portal-sprint1`
**Worktree:** `.worktrees/client-portal-sprint1`
**App:** `apps/hvcg-client-portal` (Vite + React + TypeScript)
**Mode:** Dev MVP with **mocked** Microsoft integrations — **no production credentials**, no live DNS/email/SMS, Track 1 untouched.

## Purpose

Secure multi-client engagement workspace every signed HVCG client uses after engagement start. Designed to scale from a few pilot clients to thousands of businesses via client-scoped workspaces (`ClientCode` isolation).

## System context

```text
Client (browser)
  → HVCG Client Portal MVP (this app)
  → Mock adapters (Entra, SharePoint, OneDrive, Teams, Outlook*, Power Automate, Book Meeting, Doc Requests, E-sign)
  → Future: SharePoint lists / Power Pages / Entra External ID (BL-C1 gated invites)

* Outlook outbound remains disabled by default.
```

## Screens (Version 1)

| Route | Screen |
|-------|--------|
| `/` | Client Home |
| `/engagement` | Engagement Status |
| `/timeline` | Project Timeline |
| `/milestones` | Milestones |
| `/funding` | Capital Raise Tracker / Funding Progress (11 stages) |
| `/documents` | Document Checklist / Requested / Uploaded |
| `/messages` | Secure messaging |
| `/tasks` | Client & Advisor Task Center |
| `/meetings` | Upcoming Meetings + Book (mock) |
| `/invoices` | Mock read-only invoices |
| `/notifications` | In-app notifications |
| `/advisor` | Assigned Advisor + integration readiness |
| `/files` | Secure File Center |

## Data model (admin architecture)

| Entity | Key fields | Notes |
|--------|------------|-------|
| Clients | id, code, name, industry, engagementStatus, advisorId | Multi-tenant switcher |
| Users | id, name, email, role, clientIds | ClientContact / Advisor / Admin |
| Engagements | clientId, title, type, status, progressPct, nextMilestone | No fee fields |
| FundingRequests | clientId, stage, amountTarget, amountCommitted, lenderInterest | 11 visual stages |
| TimelineEvents | clientId, title, date, type, status | Client-safe chronology |
| Milestones | clientId, dueDate, owner, status, progressPct | Shared checkpoints |
| Invoices | clientId, invoiceNumber, dates, amount, status | Mock/read-only |
| DocumentRequests | clientId, folder, title, status, dueDate, uploaded* | Reusable engine |
| Folders | DOCUMENT_FOLDERS catalog (15) | Diligence taxonomy |
| Tasks | clientId, ownerType, dueDate, status, weight | Completion % |
| Messages / Threads | threadId, direction, body, attachment | Portal-secure |
| Notifications | clientId, title, body, read | In-app only |
| SecureFiles | folder, name, sensitivity | ClientVisible only in UI |
| Permissions | role + clientIds + PortalVisible gates | Fees/internal never shown |

## Document Center folders

Financial Statements · Tax Returns · Business Returns · Personal Returns · Bank Statements · P&L · Balance Sheet · Payroll · Ownership Docs · Articles · Operating Agreement · Insurance · Real Estate · Business Plan · Pitch Deck

## Funding stages

Assessment → Discovery → Financial Review → Capital Strategy → Document Collection → Packaging → Lender Matching → Submission → Conditional Approval → Funding → Closed

## Security defaults

- External invites: **gated (BL-C1)** — not implemented live
- Client email / SMS: **Off**
- Anonymous sharing: **forbidden**
- Track 1 Production / Revenue Sprint 1–4 / CRM schema: **not modified**

## Branding

Aligned with HVCG EVA staging: forest green `#1a5c42`, deep `#0f3d2c`, gold `#b08a3c`, paper backgrounds, display serif + UI sans.

## Related docs

- `docs/portal-sprint1/DATA_MODEL.md`
- `docs/portal-sprint1/HANDOFF.md`
- `docs/portal-sprint1/QA_RESULTS.md`
- `docs/portal-sprint1/INTERFACE_SPECIFICATIONS.md`
- `docs/portal-sprint1/V1_DELIVERY_REPORT.md`
- `docs/portal-sprint1/QA_HANDOFF_V1.md`
- Atlas Track 4 + Sprint Client Portal 1
