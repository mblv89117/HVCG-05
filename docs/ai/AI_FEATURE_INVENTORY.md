# Product AI Feature Inventory

**Audit date:** 2026-07-20
**Auditor:** AI Governance Agent
**Method:** Repository review of schemas, Copilot docs, Power Apps specs, automation catalog
**Assumption:** Generative workers are schema-ready but not autonomously executing in Production.

## 1. Executive summary

Product AI today is primarily:

1. **Microsoft Copilot grounding** over allow-listed SharePoint fields and keywords.
2. **Human-gated AI queue schemas** (`HVCG_AI*`) for drafts, summaries, SOPs, packages, and reviews.
3. **Non-AI executive scaffolds** (weekly KPI brief HTML / decision notify templates) that must not be labeled as generative AI.

No Client Portal generative AI exists. Finance Intelligence has approval rules but no dedicated generative worker.

## 2. Feature inventory

| ID | Feature | Module | Implementation | Output | Grounding | Human gate | Client-facing | Capital/Finance risk |
|----|---------|--------|----------------|--------|-----------|------------|---------------|----------------------|
| F-01 | Executive Copilot prompts P1–P6 | Executive | `docs/executive/COPILOT_EXECUTIVE.md` | Briefs, decision packets, cash/AR, capital, relationships | Allow-listed SP fields; “not in source” | Owner if external; internal draft needs review banner | No | Yes |
| F-02 | CEO home excludes raw AI drafts | Executive | `scrHomeExec.md`, dashboard specs | Filter policy | N/A | N/A | No | No |
| F-03 | Opportunity Copilot fields | Revenue / CRM | `COPILOT_OPPORTUNITY.md`, Opportunity screen | `CopilotSummary` / keywords | Human/flow curated | Before external use | No | Yes |
| F-04 | Platform Copilot readiness | Knowledge / Capital / Delivery | `COPILOT_READY.md`, content types | Retrieval metadata | Document + keyword grounding | N/A | Indirect | Possible |
| F-05 | Draft emails | Ops / CRM / Comms | `HVCG_AI_DraftEmails` | Email drafts | Weak unless context job binds sources | Yes (default) | Yes when sent | Yes |
| F-06 | Meeting summaries | Ops / Knowledge | `HVCG_AI_MeetingSummaries` | Summaries | Related item only | Recommended | No | Possible |
| F-07 | Suggested / next actions | Ops / Executive | `HVCG_AI_SuggestedActions` | Action suggestions | Weak | Yes (default) | No | Possible |
| F-08 | Task extraction | Ops / Delivery | `HVCG_AI_Tasks` | Tasks | Weak | Recommended | No | Low |
| F-09 | SOP drafts | Operations Hub | `HVCG_AI_SOPDrafts` | SOP draft text | Weak | Yes before publish | No | Low |
| F-10 | Knowledge extraction | Knowledge | `HVCG_AI_KnowledgeExtraction` | Knowledge drafts | Weak | Yes (default) | No | Possible |
| F-11 | Generated documents | Delivery / Capital | `HVCG_AI_GeneratedDocuments` | Document drafts | Weak | Yes (default) | Possible after approve | Yes |
| F-12 | Quality / inconsistency reviews | Capital | `HVCG_AI_QualityReviews` | QC flags | Advisory | Yes (default) | No | Yes |
| F-13 | Lender / investor package drafts | Capital | JobTypes on `HVCG_AIJobs` | Package drafts | Intended via context policy | Capital Advisor ± Owner | Indirect | **Critical** |
| F-14 | Domain / executive review queue | Executive / Capital / Finance | `HVCG_AI_Reviews` | Briefs / reviews (has Confidence) | Medium | Yes + ApprovalType | Unclear | Yes |
| F-15 | Escalations | Cross-module | `HVCG_AI_Escalations` | Safety escalations | N/A | Yes | No | Possible |
| F-16 | AI work queues UI | Cross-module | `scrAIQueues` (referenced) | Review UX | N/A | Purpose = human review | No | Depends |
| F-17 | Power BI Copilot tips | Analytics / Executive | PBI enterprise model docs | NL answers over model | Model-dependent | None in HVCG gate | No | Yes |
| F-18 | Intelligence query catalog | Intelligence / Capital / Revenue | `INTELLIGENCE_QUERY_CATALOG.md` | Grounded Q&A design | Designed grounded | Unclear | No | Yes |

### Non-generative (do not label as AI-generated)

| ID | Feature | Module | Note |
|----|---------|--------|------|
| N-01 | `HVCG_ExecutiveWeeklyBrief` | Executive | Deterministic KPI → HTML |
| N-02 | Decision escalation compose | Executive | Template notify |
| N-03 | `PatchCopilotSummary` flows | CRM | Deterministic text patch |
| N-04 | Enterprise Value Assessment fields/templates | Capital / Revenue | Business process, not LLM |
| N-05 | Client Portal access/messages/links | Portal | No AI |

## 3. Job type map

| JobType | Typical queue | Module |
|---------|---------------|--------|
| MeetingSummary | MeetingSummaries | Ops / Knowledge |
| TaskExtraction | AI_Tasks | Ops |
| StatusReport | Reviews / GeneratedDocs | Ops / Exec |
| MissingDocs | SuggestedActions / Tasks | Ops / Revenue |
| ClientFollowUp | DraftEmails | CRM |
| SOPDraft | SOPDrafts | Ops Hub |
| ExecutiveBrief | Reviews | Executive |
| NextActions | SuggestedActions | Ops / Exec |
| InconsistencyDetect | QualityReviews | Capital |
| LenderPackageDraft / InvestorPackageDraft | GeneratedDocs / Reviews | Capital |

## 4. Module findings

### Executive Briefings / Dashboard / Intelligence

- Copilot prompts are the strongest grounded pattern (allow-list + “not in source”).
- P6 requires `[NEEDS OWNER REVIEW]` — keep as mandatory pattern.
- Weekly brief flows are **not** generative; do not auto-attach AI metadata.
- Raw AI drafts must stay off CEO home (current policy).

### Finance Intelligence

- No dedicated finance generative feature found.
- Financial analysis and pricing remain approval-gated by matrix.
- Any future finance AI must use Restricted classification, source refs, and Finance disclaimer.

### Revenue Systems

- Opportunity Copilot metadata is retrieval aid, not autonomous advice.
- Flow-patched summaries need deterministic labeling (not “AI-generated”) unless model-produced.

### Operations Hub

- SOP drafts may exist as queue items; publish requires Ops Manager.
- Promote-to-SOP must never overwrite published SOP text without review.

### Knowledge Platform

- Knowledge extraction is draft-only until approved into institutional records.
- CopilotKeywords improve retrieval; free-text keywords are technical debt.

### Client Portal

- **No generative AI approved.**
- Client-facing send via portal remains prohibited for autonomous AI.
- Future portal AI requires disclosure language + Owner approval + Security review.

### Capital Advisory

- Highest risk generative surfaces: lender/investor packages, QC, capital recommendations.
- EVA / enterprise-value ranges are **not** AI unless explicitly model-generated; if AI assists, EVA disclaimer is mandatory.
- AI QC is advisory only and must not silently change capital records.

## 5. Ungrounded or unsafe output candidates

| Finding | Severity | Feature IDs | Issue |
|---------|----------|-------------|-------|
| Specialized queues lack SourceRefs | High | F-05–F-13 | Weak provenance |
| Confidence only on Jobs/Outputs/Reviews | High | Most queues | Incomplete verification signal |
| AI-generated label only on Deliverables | High | Most queues | Users may trust unmarked drafts |
| Draft email ExternalSendBlocked not on queue | Critical | F-05 | Send risk if worker misconfigured |
| Meeting/task approval “Recommended” | Medium | F-06, F-08 | May skip review |
| No Client Portal AI but follow-up drafts exist | Medium | F-05 | Portal-adjacent send path |
| Capital package drafts | Critical | F-13 | Business/legal exposure |
| PBI Copilot without HVCG approval gate | Medium | F-17 | Financial figure misuse |

## 6. Interface needs (for owning teams; not implemented here)

| Need | Owning team | Purpose |
|------|-------------|---------|
| Insight metadata columns on all AI queues | Data Engineering / Power Platform | Enforce AI_INSIGHT_METADATA |
| SourceRefs on outputs | Data Engineering / Architecture | Grounding |
| Accept/Reject/Dismiss UX | Product / Power Apps | Review workflow |
| ExternalSendBlocked on draft-email queue | Power Platform / Automation | Unsafe automation prevention |
| Finance / Capital disclaimer blocks | Product + AI Governance | Legal/business clarity |

## 7. Assumptions

1. SharePoint AI list schemas are the product control plane for generative jobs.
2. Microsoft Copilot respects Entra/SharePoint ACLs; HVCG still requires prompt allow-lists.
3. No Production autonomous generative worker is authorized until release sign-off passes.
4. Atlas Runtime / orchestration engines are out of scope for this product audit.
