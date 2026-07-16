# Track 1 Live - Internal

**Deployment tag:** `Track 1 Live - Internal`  
**Git tag (slug):** `Track-1-Live-Internal`  
**STATUS:** **INTERNALLY PRODUCTION READY**  
**Declared:** 2026-07-16T03:08Z  
**Environment:** HVCG Production only  

## What this freeze means

Track 1 CRM managed solution is live in Production with **one** Activated flow (`HVCG_LeadQualifiedCreateOpportunity`), functional smoke **PASS**, notification gates **Off**, and no canvas publish / DNS / pilot import.

This package freezes the known-good Production checkpoint for rollback and audit.

## Package contents

| Path | Description |
|------|-------------|
| `solution/` | Frozen managed import anchor + LeadQualified Prod-layer clientdata |
| `backup/` | Production backup: config solution export, live PAC snapshots, frozen managed zip |
| `settings/` | Prod deployment settings + PnP runtime (non-secret) |
| `validation/` | Production validation report |
| `smoke/` | Readonly + LeadQualified functional smoke evidence |
| `checksums/sha256.json` | File hashes |
| `guides/ROLLBACK.md` | Rollback for this tag |
| `version.json` | Release identity |

## Gates (do not violate without new owner approval)

- Do **not** activate additional flows.
- Do **not** publish Canvas apps.
- Do **not** enable Teams notifications (`hvcg_CrmEnableTeamsNotify=false`).
- Do **not** enable client emails (`hvcg_EnableClientEmails=false`).
- Do **not** import client / pilot data.
- Do **not** change DNS / publish website.

## Managed solution freeze note

Power Platform **cannot re-export a managed solution** from the target environment (`Managed solutions cannot be exported`).  

Freeze integrity is therefore:

1. **Import-anchor managed zip** (SHA-256 `515c692c…337cdf`) — exact package imported to Prod  
2. **Live Prod verification** snapshots (flows, connections, env Values, org who)  
3. **Unmanaged Prod layer** for LeadQualified site URL (Prod Command Center) captured in clientdata JSON  
4. **HVCGProductionConfig** unmanaged export from Prod (connection-binding solution)
