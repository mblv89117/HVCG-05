# Atlas Control Center — QA Handoff

**Entry:** `/admin` (Atlas Control Center)  
**Gate:** HVCG Owner / Administrator

## Smoke

| # | Step | Expected |
|---|------|----------|
| 1 | Open `/admin` | Hub titled Atlas Control Center; 21 areas |
| 2 | Search “audit” in hub or side nav | Audit Center |
| 3 | Open each group | Identity, Delivery, Intelligence, Platform, Experience, Governance, Operations |
| 4 | `/admin/roles` (legacy) | Resolves to Roles & Permissions |
| 5 | `/admin/feature-flags` (legacy) | Resolves to Licensing |
| 6 | Width &lt; 900px | Side nav stacks above content |
| 7 | Guest / non-admin role | Access denied |
| 8 | Disable user / enable client emails | Danger confirm + audit row |
| 9 | Integrations / System Health | Failed PA row; no secret values |
| 10 | Dataverse / SharePoint / Azure | Read-only existing config |
| 11 | Global search “Control Center” | Navigates to `/admin` |

## Area checklist

| Route | [ ] |
|-------|-----|
| `/admin/organizations` | |
| `/admin/users` | |
| `/admin/teams` | |
| `/admin/roles-permissions` | |
| `/admin/clients` | |
| `/admin/projects` | |
| `/admin/ai-agents` | |
| `/admin/automation-registry` | |
| `/admin/knowledge-platform` | |
| `/admin/integrations` | |
| `/admin/azure-resources` | |
| `/admin/dataverse` | |
| `/admin/sharepoint` | |
| `/admin/notifications` | |
| `/admin/branding` | |
| `/admin/licensing` | |
| `/admin/security-center` | |
| `/admin/ai-governance` | |
| `/admin/audit-center` | |
| `/admin/release-center` | |
| `/admin/system-health` | |

## Build

```bash
cd .worktrees/track10-elite-ui
npm run build --workspace=@hvcg/atlas-elite-os
```
