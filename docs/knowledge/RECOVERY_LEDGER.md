# Client knowledge recovery ledger

Cycle: 2026-08-22T14:20Z
Durable specialist: `bc-cb506396-3ccc-5ac1-b2e3-58b3cd1b8438` (do not persist Task IDs as this specialist)
Live Hub at start of increment: `ba491c2` (recovered-clients desk). This increment stacks on `ba491c2`.
HVS admin identity: `HVCG-V3-HVS-Admin` (Sites.Read.All / Files.Read.All)

Two principals, two honesty rules:

- **Hub MI / entitled HVCG_Clients** — fail-closed. This automation principal still sees SYN01 only. Atlas does not invent SharePoint rows the Hub MI cannot see.
- **HVS admin** — PARTIAL. Confirmed HVS sites, client folders, and lists below are reference + metadata + provenance only. Binaries stay in SharePoint.

`HVS_DATA_ACCESS = PARTIAL`. Hub MI HVS access remains BLOCKED.

OWNER ACTIONS: none. Do not grant Sites.Selected. Do not add the Hub MI / automation SP to `HVCG-Client-*` groups.

## Hub MI (fail-closed)

| SOURCE | CLIENT | CLIENTCODE | DATA TYPE | DISCOVERED | ACCESSIBLE | INDEXED | CLASSIFIED | OPERATIONALIZED | VALIDATED | EXCEPTIONS | BLOCKER |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Hub MI HVCG_Clients | SYNTHETIC QA — Atlas Capital Operations | SYN01 | SYNTHETIC_QA | yes | yes | yes | yes | no | yes | Labeled fixture | Not a customer record |

## HVS admin — CONFIRMED client folders

Path: `HIGH VALUE SOLUTION / Documents / 4_Engagements / 00_Client Files`

| CLIENT | CLIENTCODE | OPERATIONALIZED | NOTES |
| --- | --- | --- | --- |
| ACCG Inc | ACCG01 | no | First-level structured folders indexed. ACCG remains read-only on Hub. |
| Christie's Place | CPL01 | no | Invoice filenames 6.19.26 indexed. Amounts not extracted. Keep Falk persons distinct. |
| Prodigy Games | PDG01 | no | Engagement / onboarding / capital-plan filenames + P&L filenames indexed. Balances not extracted. |
| Pierlo Inc (DBA Baker's Travertine Power Clean) | — | no | New Client Template folder only. Also the sole Master Client List row. |
| Colorado Beef | CCB01 | no | HVCG Engagement 7.20.26 + SBA Express filenames indexed. No invented terms. |
| Comic Books | — | no | System-doc filenames indexed. No Hub client code invented. |
| Frocovery | — | no | Formation / BDA / operating-agreement filenames indexed. No invented obligations. |
| Integrity Lift Solutions LLC | — | no | First-level structured folders indexed. |
| Lien Partners LLC | LIEN01 | no | First-level structured folders indexed. |
| LV Appraisals | — | no | First-level structured folders indexed. |
| Victory Contracting | — | no | First-level structured folders indexed. |

Template/upload folders (not clients): `0_Client_Folder (Template)`, `00_HVS Connect_Client Secure Document Upload`. `2nd Location` and `Final Installment` are not treated as standalone clients.

## Generational Group / Capital Access

| SOURCE | CLIENT | PROVENANCE | OPERATIONALIZED |
| --- | --- | --- | --- |
| HIGH VALUE SOLUTION / 4_Engagements / Generational Group | Kaurina | CONFIRMED folder | no |
| HIGH VALUE SOLUTION / 4_Engagements / Generational Group | Titan | CONFIRMED folder | no |
| Capital Access HUB / 00_Client Files / 00_Generational Group | Nabro Holdings, LLC | CONFIRMED folder | no |
| Capital Access HUB / 00_Client Files / 00_Generational Group | Triarc Construction, LLC | CONFIRMED folder | no |

## HVS lists

| LIST | SITE | ROWS | PROVENANCE |
| --- | --- | --- | --- |
| Master Client List | HVS Operations Hub | Pierlo Inc. (Status Closed) | CONFIRMED |
| Clients | HVS Operations Hub | empty | CONFIRMED honest empty |
| Opportunities | HVS Operations Hub | empty | CONFIRMED honest empty |
| Contracts | HVS Operations Hub | empty | CONFIRMED honest empty |
| Proposals | HVS Operations Hub | empty | CONFIRMED honest empty |
| Capital Deals | HVS Operations Hub | empty | CONFIRMED honest empty |
| Client Engagements | HVS Engagements | empty | CONFIRMED honest empty |
| Lead Intake | HVS Operations Hub | High V Test; Testing; Helping Hands | STALE_OR_UNCERTAIN / synthetic-looking |

## Still STALE_OR_UNCERTAIN

| NAME | WHY |
| --- | --- |
| Hart Family Dental (HFD01) | No 00_Client Files folder, no Master Client List row, no hart-named files this cycle |
| Christie Falk | Related person, not a client. Keep distinct from Christie's Place |
| Irwin Falk | Related person, not a client. Keep distinct from Christie's Place |
| That's Kava LLC (KAVA01) | HVS materials exist, but no 00_Client Files folder and no Master Client List row |

Loanspark remains vendor_referral. Best Day Of My Life remains reference_tenant.

## Operationalized vs reference-only

- **Operationalized on Hub MI:** none for real customers. SYN01 remains labeled SYNTHETIC_QA.
- **Reference-only (this increment):** all CONFIRMED HVS folders/lists above, first-level recovered filenames/classes, plus Prodigy workbook filenames.
- **Proposed operator actions (not Hub MI rows):** Colorado Beef SBA Express review/decision; Christie Place invoice review; Frocovery formation packet; Prodigy engagement/capital packet.
- **Not dumped into Atlas:** binaries, balances, contacts, emails, phones, fees, deadlines.

Do not merge stale drafts #18 / #19 / #25.
