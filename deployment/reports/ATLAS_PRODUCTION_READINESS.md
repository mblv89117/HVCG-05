# Project Atlas — Production Readiness Release Package

**Branch:** `fix/atlas-production-readiness`  
**Generated:** 2026-07-21  
**Mode:** Link-first HVS → Atlas · HVCG M365 destination · originals unchanged

## Production URLs (operational now)

| Surface | URL | Notes |
|---------|-----|-------|
| **Atlas Elite OS** | http://127.0.0.1:5180/ | Desktop + mobile responsive Vite app |
| **Command Center** | http://127.0.0.1:5180/ | Daily home |
| **Live Clients** | http://127.0.0.1:5180/clients | Client 360 (not demo catalog) |
| **Example: ACCG docs** | http://127.0.0.1:5180/clients/client-accg01 | HVS secure source links |
| **Integration Hub** | http://127.0.0.1:8790/health | API |
| **HVCG Command Center (Prod site)** | https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter | Site exists; **lists not yet provisioned** |
| **HVCG Command Center (Dev — live lists)** | https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter-Dev | 7 real clients imported |

LaunchAgents installed for hub + Elite (`com.hvcg.atlas-hub`, `com.hvcg.atlas-elite`) so services survive Cursor/terminal exit.

## Gate status

| Gate | Status |
|------|--------|
| 1 Schema engine / Dev compliant | **PASS** — Dev Command Center live; clients ACCG01…LIEN01 verified via Graph |
| 2 HVS inventory JSON/CSV/MD | **PASS** — 84,151 items inventoried (read-only) |
| 3 Canonical clients + link-first | **PASS** — 2,278 files linked; restricted omitted from broad search |
| 4 Migration manifest + review queue | **PASS** — under `deployment/reports/hvs-onedrive-inventory/` |
| 5 HVS originals unchanged | **PASS** — no move/delete/rename/permission change |
| 6 Elite live data / demos labeled | **PASS** — Live Clients + LiveClientDetail; demo detail labeled DEMO |
| 7 Persistence (survive Cursor) | **PASS** — LaunchAgents installed |
| 8 Production SharePoint lists | **BLOCKED** — sites empty; needs owner DeviceLogin |
| 9 Tag `atlas-v1.0.0-production` | **HOLD** until gate 8 |

## HVS link-first summary

- Scanned files (noise-filtered): 13,584  
- Linked: **2,278**  
- Restricted flagged: 600 (omitted from client document list unless `includeRestricted=1`)  
- By client: ACCG 1631 · Hart 319 · Prodigy 223 · Christie's Place 79 · Lien 20 · Kava 4 · CCB 1 · Irwin Falk 1  

## ONE owner action required (Production schema)

Production sites exist but have **no HVCG lists** yet. No certificate is registered for unattended PnP — one MFA DeviceLogin is required:

```bash
cd "/Volumes/MacMiniPro2TB/HVCG Project Management System/.worktrees/atlas-integration-release"
pwsh -File ./deployment/Deploy-HVCGProduction.ps1 -DeviceLogin
```

1. When the browser opens, sign in as **manuel@highvaluecapitalgroup.com**.
2. Paste the device code if prompted.
3. Approve PnP / Graph consent if asked.
4. Wait for `Production deploy success=True`.
5. Reply in chat: **Production DeviceLogin complete**.

After that, the agent will: re-validate production schema live, import clients if needed, run E2E, tag `atlas-v1.0.0-production`, and finalize the public Production URL.

## Artifacts

- `deployment/reports/hvs-onedrive-inventory/` — inventory + link summaries  
- `deployment/reports/schema/schema-validation-graph-live.json` — Dev live probe  
- `deployment/reports/schema/production-graph-probe.json` — Prod empty-lists probe  
- `deployment/reports/recovery-backup-20260720-224238/` — scrubbed backup  
- `deployment/hosting/*.plist` — LaunchAgents  
- `deployment/Deploy-HVCGProduction.ps1` — production repair entrypoint  

## Hard rules honored

- No HVS file mutations  
- No secrets committed (`production.json` gitignored; scrubbed backups only)  
- No external client emails sent  
- Live Graph verification of Dev clients and HVS links (not exit-code-only)
