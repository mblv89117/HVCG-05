# Client knowledge operationalization ledger

Generated: 2026-08-22T06:57:30Z
Durable Agent ID: `bc-135772fd-035e-4ea0-8858-b47a1921fb7a`
Live Hub SHA: `46dc70ef121b1b38c7036e60069801204ce38f64`
HVS_DATA_ACCESS: **BLOCKED**
CLIENT_KNOWLEDGE_OPERATIONALIZATION: **FAIL**

## Honesty

- SharePoint / OneDrive remain the governed source repositories. Atlas holds metadata, source refs, relationships, summaries, and exception-driven operating records.
- SYN01 in live `HVCG_Clients` is labeled **SYNTHETIC QA** and is not a customer.
- ACCG01 writes are frozen until an approved window.
- No balances, deadlines, lender criteria, or project health were invented this cycle.

## Least-privileged owner action

Grant application permission Sites.Selected to HVCG-Cursor-Automation-Azure-MCP, then SharePoint admin Read on HVCG-CommandCenter, HVCG-Clients, HVCG-Knowledge. Do not add this app to HVCG-Client-* groups (Manny-only). For HVS: Sites.Selected Read on HVS libraries or complete Hub delegated HVS connector. Do not manually download/re-upload.

Do **not** add this automation principal to `HVCG-Client-*` groups (G11-F03 Manny-only).
Do **not** download/re-upload HVS files if Sites.Selected or Hub delegated HVS access can be granted.

## Ledger

| SOURCE | CLIENT | CLIENTCODE | DATA TYPE | DISCOVERED | ACCESSIBLE | INDEXED | CLASSIFIED | OPERATIONALIZED | VALIDATED | EXCEPTIONS | BLOCKER |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Entra HVCG-Client-* + live Hub entitlement map | Hart Family Dental | HFD01 | Client master / entitlement | YES | NO | NO | CONFIRMED | NO | PARTIAL | Entra group HVCG-Client-HFD01 exists. Hub GET /api/pm/clients/HFD01 is 404 to non-Manny callers (fail-closed). | Hub entitlement fail-closed (non-Manny) and Graph Sites.Selected missing |
| Entra HVCG-Client-* + live Hub entitlement map | Christie's Place | CPL01 | Client master / entitlement | YES | NO | NO | CONFIRMED | NO | PARTIAL | Entra group HVCG-Client-CPL01 exists. Falk PHL hardship is a related matter — do not auto-merge into CPL01 work. | Hub entitlement fail-closed (non-Manny) and Graph Sites.Selected missing |
| Entra HVCG-Client-* + live Hub entitlement map | Prodigy Games | PDG01 | Client master / entitlement | YES | NO | NO | CONFIRMED | NO | PARTIAL | Entra group HVCG-Client-PDG01 exists. | Hub entitlement fail-closed (non-Manny) and Graph Sites.Selected missing |
| Entra HVCG-Client-* + live Hub entitlement map | That's Kava | KAVA01 | Client master / entitlement | YES | NO | NO | CONFIRMED | NO | PARTIAL | Entra group HVCG-Client-KAVA01 exists. | Hub entitlement fail-closed (non-Manny) and Graph Sites.Selected missing |
| Entra HVCG-Client-* + live Hub entitlement map | ACCG | ACCG01 | Client master / entitlement | YES | NO | NO | CONFIRMED | NO | PARTIAL | Entra group HVCG-Client-ACCG01 exists. ACCG01 write restriction is in force. | ACCG01 write freeze |
| Entra HVCG-Client-* + live Hub entitlement map | Colorado Craft Beef | CCB01 | Client master / entitlement | YES | NO | NO | CONFIRMED | NO | PARTIAL | Entra group HVCG-Client-CCB01 exists. Do not invent SBA status or balances. | Hub entitlement fail-closed (non-Manny) and Graph Sites.Selected missing |
| Entra HVCG-Client-* + live Hub entitlement map | Lien Partners | LIEN01 | Client master / entitlement | YES | NO | NO | CONFIRMED | NO | PARTIAL | Entra group HVCG-Client-LIEN01 exists. | Hub entitlement fail-closed (non-Manny) and Graph Sites.Selected missing |
| Live Hub GET /api/pm/clients | SYNTHETIC QA — Atlas Capital Operations | SYN01 | Labeled synthetic QA SharePoint row | YES | YES | YES | SYNTHETIC_QA | NO | YES | Visible to automation principal. Not a customer. Do not invent real work. |  |
| Owner instruction + Hub bootstrap heuristics | Best Day Of My Life |  | Boundary / non-client | YES | NO | NO | STALE_OR_UNCERTAIN | NO | PARTIAL | Bootstrap historically treated 'Gnieski Engagement' as HVS client work. Owner instruction: reference tenant under 360 Website Builder. Conflict surfaced; do not create BDOM01. | Do not create a ClientCode without owner confirmation |
| Owner instruction + Hub bootstrap heuristics | Loanspark |  | Boundary / non-client | YES | NO | NO | NOT_A_CLIENT | NO | PARTIAL | No HVCG-Client-* group. Do not create LOAN01. Bootstrap 'LoanSpark Engagement' is stale unless owner reclassifies. | Do not create a ClientCode without owner confirmation |
| Owner instruction + Hub bootstrap heuristics | Falk PHL hardship / cash surrender |  | Boundary / non-client | YES | NO | NO | PROPOSED | NO | PARTIAL | Keep associated to CPL01 as a matter/contact until owner confirms a separate client record. | Do not create a ClientCode without owner confirmation |
| HVS SharePoint / OneDrive / historical repositories | HVS historical materials |  | Historical HVS documents | UNPROVEN | NO | NO | STALE_OR_UNCERTAIN | NO | NO | HVS_DATA_ACCESS=BLOCKED. No Sites.Selected on HVS tenant; Hub has no HVS site IDs. | Least-privileged: Sites.Selected Read on HVS libraries or Hub delegated HVS connector |

## Counts

- CONFIRMED production clients (entitlement groups): 7
- Operationalized this cycle: 0
- Live Hub codes visible to this principal: SYN01

## Extra runtime notes

```
{'entitlement_map_codes': ['ACCG01', 'CCB01', 'CPL01', 'HFD01', 'KAVA01', 'LIEN01', 'PDG01', 'SYN01'], 'hub_client_count': 1, 'writes': [], 'skipped': ['SYN01'], 'graph_command_center_status': 401}
```
