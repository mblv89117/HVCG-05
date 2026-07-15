# VERSION 2 ROADMAP — HVCG OS

## v1.1.0 foundation already shipped

The following V2 prerequisites are **already provisioned** in v1.1.0 — agents and portal work build on these entities without schema redesign:

| V2 theme | v1.1.0 foundation |
|----------|-------------------|
| AI agents | AI orchestration lists (AIWorkers, AIJobs, AIContext, etc.) + existing `HVCG_AI_*` queues linked via `JobId` |
| Cross-domain intelligence | `HVCG_Relationships` graph edges + query catalog |
| Operational resilience | Backup/restore scripts, OperationalAlerts, System Health Dashboard spec |
| Client portal | PortalAccess, PortalMessages, PortalDeliverableLinks (from v1.0.0) |

## Principles

V2 builds on entities already provisioned in V1.x so **no redesign** is required for portal, AI, or Dataverse migration boundaries.

## Theme A — Client Portal (Power Pages or equivalent)

**Already prepared:** `HVCG_PortalAccess`, `HVCG_PortalMessages`, `HVCG_PortalDeliverableLinks`, `PortalVisible` / `PortalEnabled` flags.

| Epic | Deliverable |
|------|-------------|
| P1 | Authenticated client dashboard (engagement progress, milestones) |
| P2 | Document upload bound to DocumentRequests |
| P3 | Status tracking (tasks client-safe subset) |
| P4 | Secure messaging using PortalMessages |
| P5 | Deliverable downloads from PortalDeliverableLinks |
| P6 | Client approvals for deliverables/change requests |

**Licensing gate:** Power Pages capacity / Entra external identities.

## Theme B — AI Agents (Copilot Studio / Azure AI) with human gates

**Already prepared:** v1.1.0 AI orchestration foundation + 10 `HVCG_AI_*` queues with approval flags.

Agents register in `HVCG_AIWorkers`, create jobs in `HVCG_AIJobs`, assemble context per `AI_CONTEXT_POLICY`, and route outputs through `HVCG_AIApprovals`. Specialized queues remain for domain-specific routing.

| Epic | Agent | Queue / Orchestration | Guardrail |
|------|-------|----------------------|-----------|
| A1 | Meeting → summary + tasks | AI_MeetingSummaries, AI_SuggestedActions | Human review via AIApprovals |
| A2 | Draft client email | AI_DraftEmails | Never send without approval; ExternalSendBlocked |
| A3 | SOP from transcript | AI_SOPDrafts, AI_KnowledgeExtraction | Publish only after Ops approve |
| A4 | Package QC hints | AI_QualityReviews | Advisory only |
| A5 | Executive brief drafts | AI_Reviews | Owner open |
| A6 | Cross-domain insights | Relationships + AIJobs | ClientCode isolation; no cross-client without Owner |

## Theme C — CRM depth

- Referral partner portals / scorecards  
- Marketing attribution beyond manual LeadSource  
- Sequence automation (still with send approval)
- Relationship-driven CLV and referral scoring

## Theme D — Capital markets desk

- Automated lender matching from CapitalSources rules  
- Term sheet repository content type  
- Funding probability models in Power BI
- Capital relationship graph traversals via Relationships

## Theme E — Finance integration

- QuickBooks / bank feed for Invoice status sync (`ExternalAccountingId`)  
- Automated collections cadences on CollectionsActivities  

## Theme F — Platform

- Evaluate Dataverse if list thresholds breached (`SCALABILITY.md`)  
- Migrate Relationships to Cosmos DB / graph DB if query volume demands  
- pac-exported `.msapp` + managed solution in Azure DevOps pipeline  
- Hub site + Managed Metadata service for Copilot enterprise search

## Out of scope forever (unless strategy changes)

- Replacing accounting GL  
- Fully autonomous lending / investment decisions  
- Anonymous public document sharing  
- Autonomous external AI communications (email, Teams, portal)
