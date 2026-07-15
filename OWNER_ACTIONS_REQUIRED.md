# OWNER ACTIONS REQUIRED

Only actions that **legally or technically require Manny (or a Global/SharePoint Admin)** to authenticate, approve tenant consent, purchase a license, or make a business decision.

Everything else is automated by:

```powershell
pwsh -File ./deployment/install/Install-HVCGOS.ps1 -Environment development
```

For upgrades from an existing v1.0.0 tenant:

```powershell
pwsh -File ./deployment/upgrade/Upgrade-HVCGOS.ps1 -Environment development -TargetVersion 1.1.0
```

---

## Development deployment — your checklist (sequential)

### 1. Run the install or upgrade command (interactive sign-in)
| | |
|--|--|
| **Action** | From the repository root, run the one-line command in `DEPLOYMENT_GUIDE.md` (fresh install **or** upgrade from 1.0.0). Sign into Microsoft when the browser/device prompt appears. |
| **Why** | Tenant mutations require an authenticated admin. |
| **Can continue without?** | No — this *is* the deployment. |
| **Automated behind the login** | Modules, Entra groups, Dev sites, lists/columns/lookups/indexes, views, Knowledge templates, seed data, sample client library folders 00–23, Dev sharing lockdown, deployment report. v1.1.0 adds Relationships, AI orchestration lists, and OperationalAlerts. |

### 2. Approve consent prompts (first run only)
| | |
|--|--|
| **Action** | If Azure/Graph/PnP asks for admin consent (Groups, SharePoint, Directory), click **Accept**. |
| **Why** | Tenant policy blocks silent grants. |
| **Can continue without?** | No for first deployment. |

### 3. Validate health, operational health, and backup
| | |
|--|--|
| **Action** | After install/upgrade, run health + operational health scripts; run a backup to confirm export works. |
| **Commands** | See `DEPLOYMENT_GUIDE.md` — `Test-HVCGOSHealth.ps1`, `Invoke-HVCGOSOperationalHealth.ps1`, `Backup-HVCGOS.ps1` |
| **Why** | Confirms v1.1.0 schema and operational baseline before authoring apps/flows. |
| **Can continue without?** | Yes for app authoring, but recommended before declaring Dev ready. |

### 4. Authorize Power Automate / Power Apps connections (after sites exist)
| | |
|--|--|
| **Action** | When creating/enabling flows or the canvas app, sign in to SharePoint, Outlook, and Teams connectors and **Allow**. Follow `src/power-platform/PACKAGING.md` and `src/power-apps/BUILD_SHEET.md`. |
| **Why** | Connection creation is user-consented; cloud flow definition JSON cannot self-bind your tenant connections. |
| **Can continue without?** | SharePoint lists/data work without this; automations/app wait on it. |

---

## Not required for Development (automated or deferred)

| Former ID | Item | Status |
|-----------|------|--------|
| OA-001 | Manually confirm domain in chat | **Replaced** — script prompts / `-TenantDomain` / `development.json` |
| OA-002 | Manually create Entra groups | **Automated** |
| OA-003 | Manually create SharePoint sites | **Automated** |
| OA-004 | Org-wide sharing policy | **Dev sites forced SharingCapability=Disabled** by script; org policy review only before Prod |
| OA-005 | Service account | **Deferred to Production**; Dev uses deploying admin connections |
| OA-006 | App registration + certificate | **Not required for Dev** (interactive PnP/Graph auth) |
| OA-007 | Power BI Pro purchase | **Optional**; Excel fallback remains |
| OA-008 | Prod connector consent | **Prod only** (Dev covered by step 4 above) |
| OA-010 | Full staff roster | **Dev auto-adds deploying user** to Owner/Admin/OpsMgr groups |

---

## Production only (do not do during Dev)

| ID | Action |
|----|--------|
| **P-1** | Explicit written approval to deploy Production (`Deploy-HVCGProduction.ps1` when published) |
| **P-2** | Create/license automation service account for flow ownership |
| **P-3** | Confirm/purchase Power BI Pro if desired |
| **P-4** | Approve org external sharing posture for real client guests |
| **P-5** | Approve real staff → Entra role group roster |
| **P-6** | Approve nightly backup schedule and DR RPO/RTO targets (`DISASTER_RECOVERY.md`) |

---

## Optional business overrides (defaults already set)

Reminder cadence 0/3/7/14 · library-per-client isolation · USD · America/Los_Angeles · Data Rooms site off in V1 · ExternalSendBlocked on all AI jobs · no autonomous external AI communications.
