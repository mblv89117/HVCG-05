# Copilot readiness — Opportunity CRM

**Product:** HVCG OS  
**Module:** Opportunity CRM  
**Status:** Validated field metadata + grounding rules (docs)  
**Platform baseline:** `docs/architecture/COPILOT_READY.md`  
**Teams packaging:** `docs/crm/TEAMS_COPILOT_READINESS.md`

## Goal

Enable Microsoft 365 Copilot (and future HVCG AI workers) to answer grounded questions about pipeline and capital raises **without** inventing figures or exposing sensitive data.

## Validation summary (this revision)

| Check | Result |
|-------|--------|
| Copilot field inventory vs list schema (`HVCG_Opportunities`, Activities, Capital, Leads) | Aligned |
| Field descriptions present for `CopilotSummary` / `CopilotKeywords` / `TeamsThreadUrl` | Validated |
| Searchable / grounding allow-list (queryable business columns only) | Defined below |
| Secrets / Restricted Financial in Copilot-authored fields | **Banned** |
| Human approval before outbound Teams/email from AI or CRM automation | Required — see `TEAMS_NOTIFICATION_SPEC.md` |

## Grounding sources (SharePoint)

| List | Fields Copilot may use | Notes |
|------|------------------------|-------|
| `HVCG_Opportunities` | Title, Stage, WinLossStatus, OpportunityType, Probability, WeightedValue, ExpectedCloseDate, SalesOwnerEmail, CapitalHandoffStatus, ForecastCategory, CopilotSummary, CopilotKeywords | Prefer summary + stage over free-text `NextActionNotes` |
| `HVCG_OpportunityActivities` | Title, ActivityType, ActivityDate, Outcome, CopilotKeywords | Prefer typed Outcome; avoid pasting email bodies into Title |
| `HVCG_CapitalOpportunities` | Title, ClientCode, CapitalType, FundingStatus, TargetAmount, CopilotKeywords | Amounts as stored TargetAmount only |
| `HVCG_Leads` | Title, LeadStatus, ServiceInterest, EstimatedValue | **No** free-text Notes by default |

Related document grounding (capital packages): content type `HVCG_CapitalPackageDocument` — tag with ClientCode + FundingStatus + CopilotKeywords for discovery. Respect library ACLs and sensitivity labels.

## Field metadata (validated descriptions)

| List.Column | Type (schema) | Required description / usage |
|-------------|---------------|------------------------------|
| `HVCG_Opportunities.CopilotSummary` | Note | Human-curated short summary for Copilot answers. Factual: stage, next action, dollar intent. ≤ ~500 characters. |
| `HVCG_Opportunities.CopilotKeywords` | Note | Keywords for Copilot grounding. Comma-separated business terms (ClientCode, capital type, Commit/Pipeline, owner alias). |
| `HVCG_Opportunities.TeamsThreadUrl` | Text | Optional deep link to Teams deal thread — **not** a Copilot secret store; URL only. |
| `HVCG_OpportunityActivities.CopilotKeywords` | Note | Keywords for activity discovery; keep short. |
| `HVCG_CapitalOpportunities.CopilotKeywords` | Note | Keywords for capital book grounding (ClientCode, CapitalType, FundingStatus terms). |

Schema references (do not edit in this workstream): `src/sharepoint/lists/HVCG_Opportunities.json`, `HVCG_OpportunityActivities.json`, `HVCG_CapitalOpportunities.json`.

## Searchable grounding rules

Copilot (and HVCG AI context packages) **may ground** only when **all** of the following hold:

1. **Allow-listed columns** — Only columns in the table above (plus titled capital package files the user can already open).  
2. **Permission boundary** — Answer only from items the asking user can already read in SharePoint (Copilot respects ACL).  
3. **No invention** — If Stage / FundingStatus / amounts are missing, say so; do not fabricate Probability, WeightedValue, or TargetAmount.  
4. **Prefer curated narrative** — Use `CopilotSummary` / `CopilotKeywords` for prose; structured columns for facts.  
5. **Client isolation** — Scope by ClientCode / linked ClientId when the question is client-specific.  
6. **Search keywords** — Index-friendly tokens only: `ClientCode`, Stage names, FundingStatus values, `Commit`/`Pipeline`/`Closed`, CapitalType, owner alias — not secrets or raw IDs that encode PII.  
7. **Refresh cadence** — Refresh `CopilotSummary` on Stage / FundingStatus changes (flows `HVCG_OpportunityStageChangedNotify` / capital notify — reference only).  
8. **Leads Notes** — Lead free-text Notes are **out of default ground** until redacted/approved.

## Banned from Copilot context (secrets ban)

**Never** place the following in `CopilotSummary`, `CopilotKeywords`, activity Titles used for grounding, Teams notification text, or capital package filenames intended for broad discovery:

- Bank account / routing numbers, wire instructions  
- TINs, EINs, SSNs, SSA statements, full tax returns  
- Passwords, API keys, connection strings, tokens, certificate material  
- Raw email bodies with personal PII beyond business contact  
- Unpublished proposal PDFs or Restricted diligence file contents unless separately Owner-approved for that audience  
- Guest-sharing links that bypass least privilege  

If a user pastes a secret into a Copilot field: remove immediately, rotate if credential-like, and log per security SOP.

## Authoring rules

1. Keep `CopilotSummary` factual and short (stage, next action, dollar intent).  
2. Refresh summary on Stage / FundingStatus changes (flow `HVCG_OpportunityStageChangedNotify` / capital notify).  
3. Prefer keywords: `ClientCode`, capital type, `Commit`/`Pipeline`, owner alias.  
4. Do not use Copilot fields as a scratch pad for credentials or diligence extracts.  
5. AI-drafted summaries follow `docs/ai/AI_APPROVAL_MATRIX.md` before external use; internal list patches still must not contain banned content.

## Example prompts (validated against schema)

- “What open Commit-category opportunities does HVCG have?”  
- “Which capital raises are in Due Diligence?”  
- “Summarize the Summit Ridge opportunity handoff status.”  
- “What is the CapitalHandoffStatus for opportunities marked Ready?”  

## Content types

Capital package library content type `HVCG_CapitalPackageDocument` remains for diligence files; tag packages with ClientCode + FundingStatus for discovery.

## Outbound + Copilot

Copilot must **not** send Teams or email. Any composed message for CRM/Capital channels requires human gates in `docs/crm/TEAMS_NOTIFICATION_SPEC.md` (`OA-AI-01` and channel-specific gates).
