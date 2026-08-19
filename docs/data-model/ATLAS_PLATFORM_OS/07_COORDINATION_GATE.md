# 07 — Coordination Gate (required before promote)

Data Engineering **will not** apply or promote Platform OS schema until the following partners acknowledge.

| Partner | agentId | Must confirm |
|---------|---------|--------------|
| Master PM | `master-pm` | Priority, sprint slot, no conflicting path locks |
| Architecture | `system-architect` | ADR: platform-vs-product layering, SoR path, TenantId model |
| Power Platform | `power-platform` | Provisioning feasibility, Dataverse publish plan, flow impact |
| Knowledge Platform | `knowledge-platform` | Knowledge graph node/edge alignment to canonical names |
| AI Governance | `ai-governance` | Agent/Queue/Approval/Audit collapse does not weaken human gates |
| Security | `security` | Permission model + SharePoint ACL binding |
| QA | `qa-release` | Validation + isolation tests |

## Promotion checklist

- [ ] Architecture ADR accepted (or explicit defer with date)  
- [ ] Power Platform Dev apply dry-run OK  
- [ ] AI Governance sign-off on Agent/Task/Approval canonicalization  
- [ ] Knowledge Platform catalog updated to platform logical names  
- [ ] Master PM schedules migrate window  
- [ ] Security ACL matrix draft for new lists  
- [ ] QA test plan attached  
- [ ] Owner gate for any Production step  
- [ ] Data Engineering records schema impact + rollback in migration JSON  

## Explicit non-actions until gate clears

- No Production ApplyListDiff  
- No Dataverse table create in Prod  
- No deletion of legacy lists  
- No self-approval by Data Engineering  

## Handoff artifacts for partners

- This pack: `docs/data-model/ATLAS_PLATFORM_OS/`  
- Catalog: `docs/data-model/contracts/atlas-platform.entities.json`  
- Migration: `releases/migrations/20260720_002_atlas_platform_os_v1.json`
