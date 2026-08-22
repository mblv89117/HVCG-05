# Client knowledge entity boundaries

Atlas holds metadata, references, relationships, summaries, and operating records.
SharePoint and OneDrive remain authoritative. This file is a classification catalog,
not a live client inventory and not a source of invented work.

| Code / name | Kind | Write policy | Boundary |
| --- | --- | --- | --- |
| HFD01 Hart Family Dental | client | normal | Operationalize only from a Hub-visible entitled row |
| CPL01 Christie's Place LLC | client | normal | Keep distinct from Christie Falk (related person, not a second code) |
| PDG01 Prodigy Games LLC | client | normal | Operationalize only from a Hub-visible entitled row |
| KAVA01 That's Kava LLC | client | normal | Operationalize only from a Hub-visible entitled row |
| ACCG01 ACCG | client | read-only | No writes without an approved window |
| CCB01 Colorado Craft Beef | client | normal | Operationalize only from a Hub-visible entitled row |
| LIEN01 Lien Partners | client | normal | Operationalize only from a Hub-visible entitled row |
| SYN01 | synthetic_qa | n/a | Never treat as a customer operating record |
| Loanspark | vendor_referral | none | Vendor/referral unless a current Hub client row says otherwise |
| Best Day Of My Life / Ryan Gnieski | reference_tenant | none | 360 Website Builder reference tenant, not standalone software |

Provenance labels used on Atlas operating records:

- `CONFIRMED` — Hub MI returned the row in this session
- `LIKELY` — catalog / prior evidence, not a current Hub row
- `PROPOSED` — suggested only
- `STALE_OR_UNCERTAIN` — known example, not visible to this principal
- `COMPLETE` — Hub row shows completed work
