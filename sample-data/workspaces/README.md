# Workspace seeds (SharePoint / Elite OS alignment)

Pending-safe client/workspace records for Command Center + Elite OS.

| File | ClientCode | Elite OS id | Finance |
|---|---|---|---|
| `hvcg-internal.json` | HVCG01 | `ws-hvcg` | No dollars — internal firm workspace |
| `colorado-craft-beef.json` | CCB01 | `ws-ccb` | **Null finance fields** until Owner verifies |

Also mirrored in `sample-data/clients.csv`.

## Import notes

1. Upsert into SharePoint `HVCG_Clients` by `ClientCode`.
2. Do not invent TargetAmount / CurrentRevenue / retainers for CCB01.
3. After client exists, run `HVCG_CreateDocumentRequests` with CCB document categories from the JSON seed.
4. Elite OS workspace module may continue to use TypeScript catalog; SharePoint seed enables flows/admin.
