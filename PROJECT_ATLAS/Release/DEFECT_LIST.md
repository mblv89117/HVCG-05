# Consolidated Defect List — Project Atlas Integration

**As of:** 2026-07-20  
**Branch:** `cursor/atlas-integration-release`

| ID | Sev | Summary | Owner | Status |
|----|-----|---------|-------|--------|
| INT-001 | P0 | Plaid Sandbox secrets not configured (`plaidConfigured: false`) | Owner (Key Vault / `.secrets`) | OPEN |
| INT-002 | P0 | `PLAID_TOKEN_ENCRYPTION_KEY` unset — cannot store access tokens securely | Owner | OPEN |
| INT-003 | P1 | Entra SPA `VITE_ENTRA_CLIENT_ID` may be unset — live sign-in blocked | Owner / Azure | OPEN |
| INT-004 | P1 | QuickBooks Phase 1 implementation missing — Accounting Connections BLOCKED | QuickBooks agent (unassigned) | OPEN |
| INT-005 | P1 | Plaid webhook HTTPS URL unset — async item updates incomplete | Owner / Azure | OPEN |
| INT-006 | P1 | Prior DEF-ELITE-001–005/009 live QA retest still pending on Dev SWA | QA | OPEN |
| INT-007 | P2 | Capital / Revenue / EV / AI removed from primary nav (still reachable via Reports + routes) | Integration | ACCEPTED |
| INT-008 | P2 | Knowledge SharePoint / Copilot grounding not live | Knowledge Platform | OPEN |
| INT-009 | P2 | Automations page is status-only (no runtime trigger UI) | Automation / PP | OPEN |
| INT-010 | P2 | Client Portal shell not merged (BL-C1) | Master PM / Client Portal | DEFERRED |
| INT-011 | P2 | Integration branch not yet redeployed to Dev SWA | Deployment | OPEN |
| INT-012 | P3 | npm global cache permission issues on agent host — use `.npm-cache` | Engineering | WORKAROUND |
| INT-013 | P3 | Auto checkpoint commit message on `6402bfb` is generic | Integration | NOTE |

## Severity policy

- **P0** blocks startup, security, or data integrity — cannot downgrade.  
- **P1** blocks owner UAT or critical workflow.  
- Cosmetic issues do not block owner preview.
