# Intelligence Query Catalog — HVCG OS

Cross-domain questions answered via `HVCG_Relationships` + domain lists. Prefer **ClientCode** filters for isolation. Never return rows that cross clients unless the user is Owner/Admin and `IsCrossClient` is explicitly allowed.

---

## Q01 — Lenders funding a specific industry
| | |
|--|--|
| **Purpose** | Identify lenders experienced in a borrower industry |
| **Sources** | CapitalSources, Lenders, CapitalOpportunities, Clients, Relationships |
| **Filters** | Client.Industry = X; CapitalOpportunity.FundingStatus in Committed/Closed; Lender via Lent to / Funded |
| **Logic** | Join closed capital ops → client industry → lender via Relationships or LenderOutreach |
| **Security** | Internal only; no client portal |
| **Output** | Lender, deal count, avg amount, industries |
| **Power BI** | Capital page — slicer Industry |
| **Power Apps** | Capital Desk filter gallery |
| **AI/Copilot** | Grounded answer using Capital + Relationships keywords |

## Q02 — Lenders funding above amount threshold
| | |
|--|--|
| **Purpose** | Match capital size to lender capacity |
| **Sources** | CapitalOpportunities, Lenders, CapitalSources |
| **Filters** | TargetAmount >= N; FundingStatus Closed/Committed OR CapitalSources.MaxDealSize >= N |
| **Logic** | Aggregate historical funded amounts + source max |
| **Security** | Capital Advisor+ |
| **Output** | Lender ranked by max funded / stated capacity |
| **PBI / Apps / AI** | Capital pipeline visuals; Capital Desk; Copilot brief |

## Q03 — Investors connected to a current client
| | |
|--|--|
| **Purpose** | Surface investor graph for relationship strategy |
| **Sources** | Relationships, Investors, Clients, InvestorOutreach |
| **Filters** | Source/Target ClientCode = client; RelationshipType in Invested in, Introduced, Partnered with |
| **Logic** | Bidirectional edge query on Relationships |
| **Security** | Block cross-client unless Owner |
| **Output** | Investor, strength, last interaction |
| **PBI / Apps / AI** | Relationship card; Client Detail tab; Copilot |

## Q04 — Referral partners by revenue generated
| | |
|--|--|
| **Purpose** | Partner ROI |
| **Sources** | ReferralPartners, Referrals, Opportunities, Invoices, Clients |
| **Filters** | ReferralStatus=Converted; optional date range |
| **Logic** | Sum Invoice.AmountCollected or Opportunity weighted won for referred clients |
| **Security** | Finance fields Owner/Ops only |
| **Output** | Partner, wins, revenue influenced |
| **PBI / Apps / AI** | CRM dashboard; CRM screen; exec brief |

## Q05 — Clients with no meaningful communication (30/45/60 days)
| | |
|--|--|
| **Purpose** | Relationship hygiene |
| **Sources** | Clients (LastMeaningfulContact / DaysSinceLastContact), Communications, Meetings, Relationships.LastMeaningfulInteraction |
| **Filters** | DaysSinceLastContact >= threshold; ClientStage=Active Client |
| **Logic** | Coalesce last contact fields; flag red >60 |
| **Security** | Staff with client assignment |
| **Output** | Client, days silent, owner |
| **PBI / Apps / AI** | CEO / Ops health; My priorities; AI SuggestedActions |

## Q06 — Opportunities blocked by missing financial documents
| | |
|--|--|
| **Purpose** | Unblock revenue |
| **Sources** | Opportunities, Clients, DocumentRequests, Projects |
| **Filters** | Doc IsCritical + not Accepted; Opportunity open |
| **Logic** | Join via ClientCode; count blocking docs |
| **Security** | Assigned roles |
| **Output** | Opportunity, missing docs list |
| **PBI / Apps / AI** | Ops; Doc Requests; MissingDocs AI job |

## Q07 — Projects depending on a person or client deliverable
| | |
|--|--|
| **Purpose** | Dependency risk |
| **Sources** | Relationships (Depends on), Dependencies, Tasks, Deliverables |
| **Filters** | Target = person email or deliverable id |
| **Logic** | Edge query + HVCG_Dependencies |
| **Security** | Project team |
| **Output** | Dependent projects/tasks |
| **PBI / Apps / AI** | Project risk; Copilot |

## Q08 — Capital transactions highest close probability
| | |
|--|--|
| **Purpose** | Focus capital effort |
| **Sources** | CapitalOpportunities |
| **Filters** | FundingStatus not Closed/Declined; order by FundingProbability * TargetAmount |
| **Logic** | WeightedValue = TargetAmount * Probability/100 |
| **Security** | Capital desk |
| **Output** | Ranked capital book |
| **PBI / Apps / AI** | Capital pipeline; Capital Desk; exec |

## Q09 — Clients approaching renewal
| | |
|--|--|
| **Purpose** | Retention |
| **Sources** | Clients.RenewalDate |
| **Filters** | RenewalDate within 60/30/14 days |
| **Logic** | Date windows (existing renewal automation) |
| **Security** | Ops/Owner |
| **Output** | Client, renewal date, retainer |
| **PBI / Apps / AI** | CEO; renewal tasks; brief |

## Q10 — Projects at risk from overdue client responsibilities
| | |
|--|--|
| **Purpose** | Delivery risk |
| **Sources** | Tasks (Waiting on Client + overdue), DocumentRequests, Projects |
| **Filters** | TaskStatus Waiting on Client / IsOverdue; ProjectHealth |
| **Logic** | Raise health Yellow/Red |
| **Security** | PM+ |
| **Output** | Project, blockers |
| **PBI / Apps / AI** | Ops; escalations |

## Q11 — Documents related to a capital raise
| | |
|--|--|
| **Purpose** | Package integrity |
| **Sources** | Relationships (Related document), DocumentRequests (CapitalOpportunityId), Deliverables, library paths 16/17 |
| **Filters** | CapitalOpportunity id/code |
| **Logic** | Union requests + relationship edges + folder metadata |
| **Security** | Capital + client ACL on files |
| **Output** | Doc inventory with status |
| **PBI / Apps / AI** | Capital; AI LenderPackageDraft |

## Q12 — Meetings with unresolved decisions
| | |
|--|--|
| **Purpose** | Close decision loops |
| **Sources** | Meetings, Decisions, Relationships Related meeting |
| **Filters** | DecisionStatus in Proposed/Pending; linked Meeting |
| **Logic** | Join Decisions to Meetings |
| **Security** | Internal |
| **Output** | Meeting, open decisions |
| **PBI / Apps / AI** | Registers; AI TaskExtraction |

## Q13 — Tasks blocking major revenue events
| | |
|--|--|
| **Purpose** | Protect MRR/success fees |
| **Sources** | Tasks, FinancialMilestones, Opportunities, CapitalOpportunities, Relationships Blocks |
| **Filters** | Critical/High + overdue; linked revenue milestone |
| **Logic** | Edge Blocks or same ClientCode near-term finance due |
| **Security** | Ops/Owner for $ |
| **Output** | Task → revenue event |
| **PBI / Apps / AI** | CEO; priorities |

## Q14 — Greatest client lifetime value
| | |
|--|--|
| **Purpose** | Concentration & VIP care |
| **Sources** | Clients.ClientLifetimeValue, Invoices |
| **Filters** | Active clients |
| **Logic** | Rank by CLV / collected revenue |
| **Security** | Owner/Ops finance |
| **Output** | Top CLV clients |
| **PBI / Apps / AI** | CEO; exec brief |

## Q15 — Relationships Manny should prioritize this week
| | |
|--|--|
| **Purpose** | Executive focus |
| **Sources** | Relationships, Clients, CapitalOpportunities, Decisions, Opportunities |
| **Filters** | StrategicValue High/Critical OR RequiresExecutiveAttention OR NextPlannedInteraction this week OR Revenue/Capital influenced high |
| **Logic** | Score = strategic + $ influenced + urgency; Owner=Manny or decision maker |
| **Security** | Executive only |
| **Output** | Prioritized relationship list with why |
| **PBI / Apps / AI** | CEO Command Center; AI NextActions / ExecutiveBrief |

---

## Future graph migration

`HVCG_Relationships` on SharePoint Lists is intentional for v1.x — no duplicate SOR. Migrate when **two or more** are true for 60 days:

| Signal | Prefer |
|--------|--------|
| Relationship edges > ~50k with complex multi-hop queries | **Azure Cosmos DB** (Gremlin) or dedicated **graph database** |
| Need enforced RLS + relational joins with Power Apps premium | **Dataverse** many-to-many / intersect tables |
| People/org enrichment from Entra/M365 profile graph | **Microsoft Graph** (read) + retain RelationshipId in HVCG |
| Inference-heavy recommendations at scale | Graph DB or vector + graph hybrid (V2 AI) |

**Portable keys:** `RelationshipId`, `SourceEntityType`/`SourceRecordId`, `TargetEntityType`/`TargetRecordId`, `ClientCode`, `IsCrossClient`. Dual-write during cutover; do not break analytics that key on RelationshipId.
