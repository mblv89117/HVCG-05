# AR_SNAPSHOT

**Generated:** 2026-07-16T01:19:47.923208+00:00  
**Mode:** READ_ONLY — filename/content signals only; **no Mercury/Square/QuickBooks connect**

Outstanding signals derived from **Past Due** filenames and PDF header markers. Not a live AR balance.

**AR flags:** 5

| Client | Signal | Invoice ID | Amount | File | Path |
|--------|--------|------------|--------|------|------|
| ACCG Inc. | past_due | INV-2025-10-ACCG-AP | — | HVS ACCG Past Due Invoice 10.31.25.pdf | `HVS Hub - Documents/4_Engagements/00_Client Files/ACCG Inc/05_Contracts & Invoice Docs/Invoices/HVS ACCG Past Due Invoice 10.31.25.pdf` |
| ACCG Inc. | past_due | APM-ACCGINC-10-31-25 | $4,539.00 | HVS ACCG Past Due Invoice Oct 2025.pdf | `HVS Hub - Documents/4_Engagements/00_Client Files/ACCG Inc/05_Contracts & Invoice Docs/Invoices/HVS ACCG Past Due Invoice Oct 2025.pdf` |
| ACCG Inc. | past_due | — | $2,499.00 | HVS Invoice 6.27.24 ACCGa.pdf | `HVS Hub - Documents/4_Engagements/00_Client Files/ACCG Inc/05_Contracts & Invoice Docs/Invoices/HVS Invoice 6.27.24 ACCGa.pdf` |
| Prodigy Games LLC | past_due | — | — | Prodigy Games LLC April 2026 Past Due Invoice.pdf | `HVS Hub - Documents/4_Engagements/00_Client Files/Prodigy Games/05_Contracts & Invoice Docs/Prodigy Games LLC April 2026 Past Due Invoice.pdf` |
| Prodigy Games LLC | past_due | — | — | Prodigy Games LLC May 2026 Past Due Invoice.pdf | `HVS Hub - Documents/4_Engagements/00_Client Files/Prodigy Games/05_Contracts & Invoice Docs/Prodigy Games LLC May 2026 Past Due Invoice.pdf` |

## Notes

- ACCG: two October 2025 past-due PDFs (`APM-ACCGINC-10-31-25`, `INV-2025-10-ACCG-AP`) — $4,539/mo Access Plus pattern per PRICING_REGISTER.
- ACCG: `HVS Invoice 6.27.24 ACCGa.pdf` — PDF content marker "Past Due for UCFCR Consulting" ($2,499 extract).
- Prodigy: April/May 2026 past-due filenames — amounts not extracted this pass; legacy CFO ~$7,500/mo per CLIENT_HEALTH_DASHBOARD.
- Christie: no past-due signals.
- Legacy HVS: preserve Section A pricing; HVCG engine BLOCK.
