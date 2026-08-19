# AI Insight Metadata Standard

**Status:** Required for all product AI outputs before Production generative release
**Applies to:** Copilot-assisted briefs, AI queue outputs, AI-assisted documents, suggested actions

## 1. Purpose

Every AI-generated output must be transparent: who/what produced it, from which sources, when, how confident it is, whether a human must review it, and whether it is informational or actionable.

AI must **not** silently overwrite verified business data. AI may propose changes; humans (or explicit approved workflows) commit them.

## 2. Required metadata fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `IsAIGenerated` | Boolean | Yes | Always true for model-produced content |
| `AIDisclosureLabel` | Text | Yes | Fixed short label shown in UI (see §5) |
| `GeneratedAt` | DateTime (UTC) | Yes | Generation timestamp |
| `Generator` | Text | Yes | Worker/model/prompt identity (e.g. WorkerId + PromptVersion + ModelId) |
| `PromptId` | Text | Yes | Stable prompt ID |
| `PromptVersion` | Text | Yes | Immutable prompt version |
| `SourceRecordRefs` | Multi-line / JSON | Yes | List/item IDs (and field names when practical) used as grounding |
| `SourceSummary` | Text | Yes | Human-readable source description |
| `GroundingStatus` | Choice | Yes | `Grounded` / `Partial` / `Ungrounded` / `NotApplicable` |
| `Confidence` | Number 0–1 or % | Yes | Model or rule-based confidence |
| `VerificationStatus` | Choice | Yes | `Unverified` / `HumanVerified` / `Rejected` / `Superseded` |
| `OutputClass` | Choice | Yes | `Informational` / `ActionableDraft` / `ActionableRecommendation` |
| `HumanReviewRequired` | Boolean | Yes | From approval matrix |
| `ResponsibleReviewer` | Person/Email | Conditional | Required when HumanReviewRequired=true |
| `ApprovalStatus` | Choice | Conditional | Pending / Approved / Rejected / Dismissed |
| `DecisionAt` | DateTime | Conditional | When accept/reject/dismiss occurred |
| `DecisionBy` | Person/Email | Conditional | Reviewer identity |
| `ClientCode` | Text | Conditional | Required for client-scoped work |
| `DataClassification` | Choice | Yes | Ceiling used for context |
| `DisclaimerCodes` | MultiChoice | Conditional | e.g. `FIN`, `EVA`, `CAPITAL`, `CLIENT` |
| `ExternalSendBlocked` | Boolean | Yes | Default true |
| `MayOverwriteVerifiedData` | Boolean | Yes | Must be **false** |
| `CorrelationId` / `JobId` | Text | Yes | Trace to job/audit |

## 3. OutputClass rules

| Class | Meaning | Allowed automation |
|-------|---------|--------------------|
| Informational | Explains or summarizes; no system write beyond AI queues | May auto-create AI queue draft if HumanReviewRequired handled |
| ActionableDraft | Proposes email/doc/SOP/task text | Never auto-send / auto-publish |
| ActionableRecommendation | Proposes business decision, pricing, capital, legal stance | Never auto-apply; Owner/domain approval required |

## 4. GroundingStatus rules

- **Grounded:** Every material claim maps to SourceRecordRefs; missing figures say “not in source”.
- **Partial:** Some claims grounded; ungrounded parts explicitly marked.
- **Ungrounded:** No usable source binding — **cannot** be Approved for external, financial, capital, or client use.
- **NotApplicable:** Non-content system event (e.g. escalation metadata).

## 5. UI disclosure label

Default label (internal):

```text
AI-generated draft — verify before use
```

With metadata line:

```text
Generated {GeneratedAt UTC} · Confidence {Confidence} · Sources: {SourceSummary} · Reviewer: {ResponsibleReviewer or "required"} · Class: {OutputClass}
```

Client-facing label: use [AI_CLIENT_DISCLOSURE.md](AI_CLIENT_DISCLOSURE.md).

## 6. Overwrite protection

Verified business records (Invoices, Opportunities stage/amounts, Capital funding status, Client financial fields, published SOPs, approved Decisions) may only change through:

1. human edit, or
2. approved non-AI automation with its own audit trail.

AI outputs write to AI queues / draft fields only. Promotion copies content after Accept; it never silent-patches verified fields.

## 7. Schema interface (for Data Engineering / Power Platform)

Additive columns (or shared content type) should be applied to:

- `HVCG_AIOutputs`
- `HVCG_AI_DraftEmails`
- `HVCG_AI_MeetingSummaries`
- `HVCG_AI_SuggestedActions`
- `HVCG_AI_Tasks`
- `HVCG_AI_SOPDrafts`
- `HVCG_AI_KnowledgeExtraction`
- `HVCG_AI_GeneratedDocuments`
- `HVCG_AI_QualityReviews`
- `HVCG_AI_Reviews`

AI Governance defines the contract; owning teams implement schema/UI. Until implemented, Copilot templates must still include disclosure, sources, timestamp, and review banner in prose.
