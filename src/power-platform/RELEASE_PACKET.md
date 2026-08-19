# Power Platform Release Packet — Sprint 14 product build

**Package version:** 1.1.1-pp-product  
**Environment target:** HVCG Development only  
**Owner gate required for:** Production Power Platform import  

## Artifacts in this package

| Artifact | Path |
|---|---|
| Product inventory | `src/power-platform/PRODUCT_INVENTORY.md` |
| Dataverse Atlas map | `src/power-platform/DATAVERSE_ATLAS_INVENTORY.json` |
| Connection references | `src/power-platform/connection-references/HVCG_ConnectionReferences.json` |
| Environment variables | `src/power-platform/environment-variables/HVCG_EnvironmentVariables.json` |
| Flow definitions (hardened) | `HVCG_DeliverableApproval`, `HVCG_CreateDocumentRequests` |
| CRM near-ready flows | Opportunity / Capital notify package 1.1.0 |
| Workspace seeds | `sample-data/workspaces/` + `sample-data/clients.csv` (HVCG01, CCB01) |
| SharePoint schemas | `src/sharepoint/lists/` (82) |
| Packaging guide | `src/power-platform/PACKAGING.md` |

## Deployment steps (Dev)

1. Confirm `pac org who` → HVCG Development.
2. Set environment variable values (Exec/Ops emails — no secrets in git).
3. Keep `hvcg_EnableClientEmails=false`, `hvcg_CrmEnableTeamsNotify=false`, `hvcg_ExecEnableEmailDigest=false`.
4. Import/update flow definitions for DeliverableApproval + CreateDocumentRequests (**Off** until smoke).
5. Seed SharePoint `HVCG_Clients` from `sample-data/workspaces/*.json` / clients.csv rows HVCG01 + CCB01 (pending-safe — no CCB dollars).
6. Verify model-driven Atlas Command Center opens.
7. Verify Elite OS signed-in reads `hvcg_atlasapprovals` / revenue KPIs / briefs.
8. QA: document readiness checklist for CCB01 via CreateDocumentRequests (categories only).

## Connection-reference checklist

- [ ] `hvcg_sharedsharepointonline`
- [ ] `hvcg_sharedoffice365`
- [ ] `hvcg_sharedteams`
- [ ] `hvcg_sharedapprovals` (required for DeliverableApproval)

## Environment-variable checklist

- [ ] Site URLs (Command Center, Clients, Knowledge)
- [ ] Exec + Ops emails (real UPNs)
- [ ] Teams channel IDs (empty until Security/Owner UAT)
- [ ] Feature gates remain Off
- [ ] `hvcg_EliteOsUrl` for deep links

## Known limitations

- Remaining core flows still scaffolds (workspace, project template, overdue, renewal, weekly, health, escalation).
- Canvas unpublished — intentional.
- CCB finance pending Owner-verified source.
- Production verification not in scope.

## Delegation / performance

- Elite OS Dataverse: `$top` + `$select` only.
- Document request foreach: idempotency keys prevent duplicates on re-run.
- Approvals flow: filter trigger conditions in Maker to Status/RequiresExecutiveApproval to reduce runs.

## Production verification

**Blocked** until Owner approval. Do not import managed solutions to Production from this packet.
