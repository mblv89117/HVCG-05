# SCALABILITY — HVCG OS

## Current design capacity (v1.1.0)

| Dimension | Target comfort | Warning | Action |
|-----------|----------------|---------|--------|
| Active clients | ≤50 | 80+ | Archive Alumni libraries; consider site-per-client |
| Tasks open | ≤3,000 | 5,000 | Indexed views; archive Completed yearly |
| Document requests | ≤3,000 | 5,000 | Same |
| AI queue backlog | ≤500 open | 1,000 | Throttle agents; purge Approved/Rejected |
| **Relationships edges** | **≤5,000** | **10,000** | Indexed ClientCode views; archive inactive; evaluate graph DB |
| **AIJobs open** | **≤200** | **500** | Purge completed; throttle worker concurrency |
| **AICostTracking rows** | **≤1,000/mo** | **5,000/mo** | Aggregate monthly; alert via OperationalAlerts |
| Capital opportunities | ≤200 active | 500 | Fine on Lists |
| Lists on Command Center | 81 | 100+ | Split Knowledge ops lists to Knowledge site |
| Concurrent Power Apps users | ≤15 | 30 | Monitor; split apps (CEO / Ops / Capital) |
| Lookups per form | <8 | 12 | Use ClientCode filters instead |
| **Backup export size** | **≤500 MB** | **2 GB** | Exclude document libraries from nightly; Full weekly with `-IncludeDocuments` |

## SharePoint thresholds

- List view threshold **5,000** — design views with indexed filters (`ClientCode`, `IsOverdue`, `AIStatus`, `FundingStatus`, `IsCrossClient`, `RelationshipType`).
- Avoid unfiltered `GetItems` in flows without OData filter + Top.
- **Relationships:** always filter by `ClientCode` or `SourceEntityType` + indexed status; never unfiltered graph scans.

## Power Automate

- Prefer child flows for onboarding/capital instantiate.
- Daily jobs: query only open/actionable rows.
- Expect Graph/SharePoint throttling under agent bursts — exponential backoff.
- **AI orchestration:** throttle AIJob creation; batch AICostTracking writes.

## Power BI

- Import mode OK under ~100k rows combined; switch incremental refresh if exceeded.
- Enterprise model in `POWERBI_ENTERPRISE_MODEL.md` uses ClientCode star schema.
- System Health Dashboard adds FactOperationalAlert, FactAIJob measures.

## When to migrate Relationships to Dataverse / Cosmos / graph DB

Move relationship storage if **two or more** are true for 60 days:

1. Relationship list exceeds 10k active edges with slow indexed views  
2. Cross-domain traversals (>2 hops) required in real-time UI  
3. Need graph algorithms (shortest path, community detection)  
4. Premium license already purchased for other reasons  

Migration path: export `RelationshipId` + `ClientCode` business keys; map to target graph store; preserve query catalog semantics.

## When to move to Dataverse (general)

Move if **two or more** are true for 60 days:

1. Multiple lists hitting view threshold despite archiving  
2. Need row-level security beyond app filters for >20 contractors  
3. Complex many-to-many (e.g., sources ↔ opportunities) hurting UX  
4. Premium license already purchased for other reasons  

Migration path: keep ClientCode business keys; map lists → tables; preserve AI queue names and orchestration entity names.

## AI cost & queue scalability

| Signal | Threshold | Action |
|--------|-----------|--------|
| Monthly AI cost | > budget in AICostTracking | OperationalAlerts AICostThreshold; throttle workers |
| Open AIJobs | >500 | Review approval backlog; purge stale |
| AI queue items | >1,000 open | Archive Approved/Rejected; throttle agent writes |

## Backup size growth

| Env | Expected growth | Mitigation |
|-----|-----------------|------------|
| Dev | Low (sample data) | Weekly config+data sufficient |
| Test | Moderate | Weekly Full |
| Prod | High (client libraries) | Nightly list data; weekly `-IncludeDocuments`; 90-day retention |

See `DISASTER_RECOVERY.md` for RPO/RTO targets.

## Licensing scalability

| Growth | Likely cost drivers |
|--------|---------------------|
| More staff | M365 BP seats |
| Client portal | Power Pages |
| Agents | Copilot Studio messages / Azure AI |
| Heavy BI | Power BI Pro/PPU |
| Dataverse / Cosmos | Power Apps premium / Azure consumption |
| Graph DB | Azure Cosmos DB Gremlin or managed Neo4j |

V1.x intentionally avoids these until value is proven in Dev/Prod Ops.
