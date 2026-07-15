# TECHNICAL DEBT — HVCG OS

Tracked intentionally; none block Dev deployment.

| ID | Debt | Impact | When to pay |
|----|------|--------|-------------|
| TD01 | Canvas app not yet tenant-authored `.msapp` | Manual build sheet | First Dev publish → pac export |
| TD02 | Flow definitions are Logic schema scaffolds, not tenant-bound | Rebuild/bind connections | After list provision |
| TD03 | 10 AI queues duplicate schema | Admin overhead | Consolidate if >2 unused after 6 months |
| TD04 | InternalProjects vs Projects.IsInternalProject overlap | Mild confusion | Pick one pattern in training |
| TD05 | View OData filters not fully applied via PnP (title-only create) | Manual filter refine | Post-deploy view pass |
| TD06 | MultiChoice CapitalFocus may need Note fallback | CapitalSources tagging | Fix if Add-PnPField fails |
| TD07 | Power Apps 81-list connection bloat | Perf | Screen-scoped data sources |
| TD08 | CLV fields manual | Forecast quality | Automate from Invoices later |
| TD09 | TimeEntries optional / lightly used | Utilization accuracy | Enforce if capacity mgmt critical |
| TD10 | Denormalized ClientCode | Sync risk | Flows must stamp on create |
| TD11 | Executive KPIs computed in BI not stored | Refresh dependency | Add nightly snapshot list if needed |
| TD12 | CopilotKeywords free text | Inconsistent retrieval | Managed term store V2 |
| **TD13** | **Relationships as soft graph edges (not true graph DB)** | Multi-query traversals; no native path finding | Migrate to Dataverse/Cosmos/graph DB when >10k edges or complex traversals needed |
| **TD14** | **AI queues + orchestration dual model** | Two patterns for AI work routing | Consolidate to orchestration-only if specialized queues underused after agent launch |
| **TD15** | **SharePoint scale for graph queries** | Relationship list view threshold at volume | Indexed ClientCode views; archive inactive edges; evaluate graph DB in V2 |

## Explicit non-debt (accepted design)

- SharePoint Lists as SOR without Dataverse  
- Operational finance ≠ GL  
- Human approval on AI external artifacts  
- ExternalSendBlocked on all AI jobs (no autonomous sends)
