# ARCHITECTURE REVIEW — HVCG OS v1.1.0

**Date:** 2026-07-14  
**Scope:** Full repository after v1.1.0 expansion (81 lists, 21 templates, intelligence + AI orchestration + backup/monitoring)

## Verdict

**Deployment-ready for Development** after this expansion, with eyes open to SharePoint list-scale, relationship query volume, and dual AI model risks documented below. No critical blockers that prevent Dev deploy. Production cutover should re-read SCALABILITY.md after 90 days of use.

## Duplicate entities / fields

| Finding | Assessment | Action |
|---------|------------|--------|
| `HVCG_Lenders` / `HVCG_Investors` vs `HVCG_CapitalSources` | Intentional specialization; CapitalSources is master | Keep; link via lookup |
| `HVCG_FinancialMilestones` vs `HVCG_Invoices` | Milestones = operational plans; Invoices = bill artifacts | Keep both; InvoiceId links them |
| `HVCG_InternalProjects` vs `HVCG_Projects` | InternalProjects is metadata overlay; can point at Projects | Prefer Projects.IsInternalProject for delivery; InternalProjects for ops portfolio |
| Opportunity vs CapitalOpportunity | Sales engagement vs capital raise | Distinct — correct |
| AI queues share identical schemas | By design for agent routing | Accept; orchestration via JobId reduces sprawl concern |
| **Relationships vs domain lookups** | Relationships = cross-domain edges; lookups = within-domain FK | Complementary; Relationships for graph queries, lookups for forms |
| **AI orchestration vs AI_* queues** | Orchestration = job lifecycle; queues = domain routing | Dual model accepted; JobId links them (see TECHNICAL_DEBT TD13) |

## Normalization

- ClientCode denormalized on children — required for indexed filters / flows (accepted denormalization).
- Circular lookups (Clients↔Contacts, Leads↔Opportunities) — optional lookups; create-order safe with two-pass provisioning.
- CapitalFocus MultiChoice on CapitalSources — monitor PnP provisioning; fallback to Note if tenant rejects.
- **Relationships as soft graph edges** — not a true graph DB; traversals require multiple list queries (see TECHNICAL_DEBT TD13).

## Permissions

- Dev: sharing disabled; deploying user in elevated Dev role groups — appropriate.
- 81 lists increase risk of over-sharing Contribute — mitigate via app-layer filters + client libraries ACL (unchanged model).
- AI queues and orchestration lists must remain **internal-only**; never grant portal / guest roles.
- **Relationships:** `IsCrossClient` flag enforces client isolation; Owner/Admin only for cross-client views.
- PortalV2 lists present but unused — keep Contribute limited to staff until Power Pages launch.

## SharePoint limitations

| Limit | Relevance | Mitigation |
|-------|-----------|------------|
| 5,000 item view threshold | Tasks, DocRequests, AI queues, **Relationships** | Indexed columns; filtered views; archive completed |
| 12 indexed columns / list | Several lists near usefulness | Only index filters used in flows/views |
| Lookup complexity | 120+ lookups repo-wide | Avoid deep nested expands in Power Apps |
| List count per site | 81 is fine | Hub remains Command Center |
| Column limit ~276 | Clients 52 cols — OK | Watch Clients growth |
| **Graph query performance** | Relationships at scale | ClientCode-indexed views; migrate to graph DB if breached (SCALABILITY.md) |

## Power Platform limitations

- Canvas app with 81 connectors/lists will be heavy — use **subset datasources** per screen; defer unused AI/portal lists until screens exist.
- Flow definitions still require connection consent — documented.
- No Dataverse = weaker relational integrity — accepted for V1 licensing.

## Scalability

See `SCALABILITY.md`. Trigger for Dataverse evaluation: sustained >5k items on Tasks or DocRequests with slow views, or >100 active clients with complex capital books, or **>10k Relationships rows** with slow traversals.

## Licensing

- OS expansion does **not** require premium for schema/storage.
- Copilot / Copilot Studio / Power Pages / premium connectors remain optional paid — V2.

## Automation bottlenecks

- Daily flows scanning large lists need indexed filters + pagination.
- AI queues: do not auto-start storms; throttle agent writes.
- Onboarding + capital template instantiate should stay child-flow based (already designed).
- **Operational health script:** run daily; writes OperationalAlerts on failure.

## Technical debt

See `TECHNICAL_DEBT.md` (TD13–TD15 added for v1.1.0).

## Security risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| AI Draft Emails auto-send | Critical if misconfigured | HumanApprovalRequired default true; ExternalSendBlocked=true |
| **Prompt injection** | High | AIContext policy scopes inputs; AIPrompts versioned; no raw user HTML in prompts |
| **Malicious document ingestion** | High | AI jobs on docs require human review; AIAuditLog traces source |
| **Cross-client relationship leak** | High | IsCrossClient=false default; app filters by ClientCode |
| Portal lists mistaken as live | Medium | PortalEnabled false by default; no guest access in Dev |
| Finance lists oversharing | High | Role matrix + app visibility |
| 81-list admin mistake | Medium | Deploy script idempotent; least privilege roles |

## Intelligence Layer review

| Aspect | Assessment |
|--------|------------|
| Client isolation | `IsCrossClient` + `ClientCode` filters — adequate for V1 |
| Query patterns | Indexed views per catalog — SharePoint-scale OK to ~10k edges |
| Data integrity | No FK enforcement — flows must validate source/target existence |
| Migration readiness | RelationshipId business keys preserved for V2 graph DB |

## AI Orchestration review

| Aspect | Assessment |
|--------|------------|
| Human gates | AIApprovals + HumanReviewRequired on jobs — adequate |
| External send | ExternalSendBlocked=true — no autonomous sends |
| Audit | AIAuditLog + AICostTracking — sufficient for V1 |
| Context policy | Scoped assembly per AI_CONTEXT_POLICY — review before agent activation |
| Dual model | Orchestration + specialized queues — accepted; JobId linkage |

## Acceptance for Dev deploy

- [x] Validators PASS (81 lists, 21 templates)
- [x] Existing deploy entrypoint still loads `_index.json`
- [x] Architecture, debt, scalability, V2 roadmap published
- [x] v1.1.0 migration pack `20260714_002` resolves
- [x] Backup/restore/operational health scripts present
- [ ] Live tenant UAT (owner command)
