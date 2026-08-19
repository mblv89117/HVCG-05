# Source Coverage — Client Intelligence

**Generated:** 2026-07-16 01:17 UTC  
**Specialist:** Client Intelligence (crm)  
**Mode:** READ-ONLY

## Source status

| Source ID | System | Status | Impact on profiles |
|-----------|--------|--------|-------------------|
| DS-OD-LOCAL | OneDrive local sync | **AVAILABLE** | Paths, census, local email/msg PDFs |
| DS-OD-HUB | HVS Hub client files | **AVAILABLE** | Primary engagement trees |
| DS-OL-HVS | Outlook (HVS) | **BLOCKED_CREDENTIALS** | Contacts, comms history incomplete |
| DS-OL-HVCG | Outlook (HVCG) | **BLOCKED_CREDENTIALS** | Contacts incomplete |
| DS-TEAMS | Teams / Graph | **BLOCKED_CREDENTIALS** | Chat history not extracted |
| DS-SP-CLIENTS | SharePoint online | **BLOCKED_CREDENTIALS** | Beyond OD sync — URLs needed |
| DS-SP-CC-DEV | SharePoint Command Center Dev | **BLOCKED_CREDENTIALS** | No PnP session |
| DS-DV | Dataverse Dev | **AVAILABLE** (no writes) | CRM shells drafted only |
| DS-FIN | Mercury / Stripe / banks | **NOT STARTED** | Payment verification partial via invoice PDFs only |

## Coverage gaps

| Gap | Clients affected | Mitigation |
|-----|------------------|------------|
| Graph/Outlook blocked | All | Local email PDF count only; contacts MISSING unless in agreements |
| Signed PDF OCR incomplete | ACCG Access Plus, Integrity Lift invoice, Victory/Arboretum signed PDFs | Flag UNVERIFIED; paths recorded |
| Engagement status unconfirmed | HART01, OUTS01, ARBO01, DISC_04–05 | Owner gates in OWNER_DECISIONS.md |
| Archive duplicate folders | comp-* entries | Separate _ARCH profiles; do not dedupe source |
| KAVA01 / OUTS01 not in discovery JSON | KAVA01, OUTS01 | Manual roster profiles from onboarding packets |

## Profile completeness

| Metric | Value |
|--------|-------|
| Profiles generated | 73 |
| P1 enriched | 7 |
| Hub DISC enriched | 7 |
| Pricing verified (invoice/agreement extract) | ACCG01, CHRI01, PROD01 (partial), ARBO01, DISC_03, DISC_06 |
| Pricing MISSING | HART01, OUTS01, DISC_04, DISC_05, majority of DISC_11+ |
