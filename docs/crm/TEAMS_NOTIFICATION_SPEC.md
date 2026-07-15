# Teams notification specification — Opportunity CRM

**Product:** HVCG OS  
**Module:** Opportunity CRM  
**Status:** Spec only — **do not** publish Teams apps, enable org-wide channels, or send live notifications from this documentation workstream.  
**Related flows (reference only):** `HVCG_LeadQualifiedCreateOpportunity`, `HVCG_OpportunityStageChangedNotify`, `HVCG_OpportunityWonCloseout`, `HVCG_CapitalFundingStatusNotify`

## Purpose

Define **how** CRM and capital desk events post to Microsoft Teams, with mandatory **human approval** before any outbound message reaches a non-test audience.

## Channels (logical)

| Logical channel | Env var (reference) | Recommended team / channel name | Purpose |
|-----------------|---------------------|----------------------------------|---------|
| CRM / Pipeline | `HVCG_TEAMS_CRM_CHANNEL_ID` | **HVCG CRM / Pipeline** | Qualified leads, late-stage moves, wins/losses |
| Capital Desk | `HVCG_TEAMS_CAPITAL_CHANNEL_ID` | **HVCG Capital Desk** | Funding status through diligence → closed/declined |

Optional per-deal war room: store deep link on `HVCG_Opportunities.TeamsThreadUrl` (human-curated; not auto-created by flows in v1).

## Environments and recipients

| Environment | Recipient mode | Allowed destinations |
|-------------|----------------|----------------------|
| **Development / Test** | **Test-only** | Explicit test users or a private **HVCG CRM Test** / **HVCG Capital Test** channel. Never production sales or capital distribution lists. |
| **Production** | Approval-gated | Channels above, only after Owner (or designated Ops) approval of packaging + first successful dry-run |

### Test-only recipient rules (mandatory until production go-live)

1. Set channel env vars to **test channel IDs** only.  
2. Prefer Adaptive Card / Teams post to the **test channel**, not `@channel` or `@team` mentions.  
3. Ban org-wide / company-wide Teams apps and fan-out until packaging checklist in `TEAMS_COPILOT_READINESS.md` is signed off.  
4. Do not CC external guests or client tenants from CRM notify flows.

## Human approval gates (outbound communication)

**No Teams/Outlook/external message leaves HVCG without a recorded human approval** for that outbound class.

| Gate ID | Trigger event | Outbound type | Approver | Pass criteria |
|---------|---------------|---------------|----------|---------------|
| `OA-CRM-01` | Lead → Qualified notify | Teams CRM channel | Ops Manager (or Owner) | Message template + test recipients verified; payload has no Restricted Financial fields |
| `OA-CRM-02` | Opportunity Stage → Proposal / Negotiation / Won / Lost | Teams CRM channel | Ops Manager | Stage filter matches flow; amounts are `WeightedValue` / `ProposalAmount` only (no bank/TIN) |
| `OA-CRM-03` | Opportunity Won closeout notify | Teams CRM (+ optional capital alert) | Owner for first prod; Ops thereafter | Capital handoff text accurate; Capital Raise/Hybrid handoff already validated in closeout path |
| `OA-CAP-01` | Capital `FundingStatus` → Term Sheet / Due Diligence / Committed / Closed / Declined | Teams Capital channel | Capital Advisor (+ Owner if material ≥ Owner threshold) | ClientCode + status + `TargetAmount` only; no package file bodies |
| `OA-EXT-01` | Any Outlook / external email from CRM automation | Email | Owner | **Blocked by default in v1.x** — enable only with explicit Owner ticket |
| `OA-AI-01` | Copilot / AI–composed draft for Teams or email | Any | Per `docs/ai/AI_APPROVAL_MATRIX.md` | `HumanReviewRequired=true`; `ExternalSendBlocked` until approval recorded |

### Approval record (minimum)

Capture in `HVCG_AutomationLogs` and/or `HVCG_AIApprovals` (when AI-assisted):

- Gate ID, approver UPN, timestamp  
- Environment (`development` | `test` | `production`)  
- Recipient channel ID / test user list (redact secrets)  
- Flow name + idempotency key sample  
- Decision: Approve | Reject | Hold-test-only

**Implementation note (spec):** Flows that currently call `TeamsPostMessage` must not be turned on for production channel IDs until the matching gate is Approved. Prefer an Approvals connector step or Owner-run enablement checkbox before the post action.

## Event → message matrix

| Source flow (reference) | When | Channel | Message shape (factual) |
|-------------------------|------|---------|-------------------------|
| `HVCG_LeadQualifiedCreateOpportunity` | LeadStatus → Qualified | CRM | Qualified lead **{Title}** opened opportunity **{OpportunityTitle}** (owner {OwnerEmail}). |
| `HVCG_OpportunityStageChangedNotify` | Stage ∈ Proposal, Negotiation, Won, Lost | CRM | Opportunity **{Title}** moved to **{Stage}** (owner {SalesOwnerEmail}, weighted {WeightedValue}). |
| `HVCG_OpportunityWonCloseout` | Won | CRM | Won deal **{Title}** (amount {ProposalAmount}). Capital handoff: {CapitalHandoffStatus}. |
| `HVCG_CapitalFundingStatusNotify` | FundingStatus ∈ Term Sheet, Due Diligence, Committed, Closed, Declined | Capital | Capital book **{Title}** ({ClientCode}) → **{FundingStatus}** ({TargetAmount}). |

### Forbidden in notification payloads

- Bank account numbers, TINs/EINs, SSA/tax statement excerpts  
- Raw email bodies, meeting transcripts with PII beyond business contact  
- Connection strings, tokens, env secrets, API keys  
- Full proposal PDF contents or unpublished diligence file links with guest access  

## Idempotency and noise control

- Honor existing idempotency patterns on CRM flows (e.g. `opp-stage|{OpportunityId}|{NewStage}|{Modified}`, `opp-won|{OpportunityId}`, `cap-status|…`).  
- Do not `@everyone` / `@channel` in templates.  
- Stage notify only for meaningful late stages (as in flow condition) — Discovery/Qualification changes stay silent to Teams.

## Packaging prerequisites (before first prod post)

See `docs/crm/TEAMS_COPILOT_READINESS.md`. Summary:

1. Private team + two channels created; membership least-privilege.  
2. Env vars point to test channels first; production IDs only after `OA-*` gates.  
3. Connection references (SharePoint, Teams, Approvals) validated in Dev solution — **without** this agent publishing apps.  
4. Dry-run with test item IDs; log shows Success + SkippedDuplicate behavior.

## Explicit non-goals (this workstream)

- Publishing or sideloading a Teams store / LOB app  
- Enabling org-wide installation policies  
- Sending real notifications to CRM or Capital production recipients  
- Editing flow/app/schema JSON (reference only)
