# Teams + Copilot readiness — Opportunity CRM

**Product:** HVCG OS  
**Module:** Opportunity CRM  
**Status:** Readiness packaging — docs/spec only  
**Hard constraints:** Do **not** publish Teams apps, enable org-wide channels, or send notifications from this branch. Do **not** edit flow/app/schema JSON here — reference only.

## Executive checklist

| # | Item | Owner | Gate | Done when |
|---|------|-------|------|-----------|
| 1 | Create private **HVCG CRM** and **HVCG Capital** Teams (or equivalent); add **CRM / Pipeline** and **Capital Desk** channels | Ops / Owner | N/A setup | Channels exist; membership least-privilege |
| 2 | Provision **test-only** channels or restrict env vars to test channel IDs | Ops | Test recipients | Dev/Test env vars ≠ production IDs |
| 3 | Map `HVCG_TEAMS_CRM_CHANNEL_ID` / `HVCG_TEAMS_CAPITAL_CHANNEL_ID` (env) | Administrator | Config | Documented in env inventory; test IDs first |
| 4 | Wire Approvals (or Owner enablement) before `TeamsPostMessage` in production | Flow owner | See notification spec gates | Production posts blocked until Approved |
| 5 | Validate Copilot list fields + descriptions + keyword hygiene | CRM + Capital Advisors | Copilot | Matches `COPILOT_OPPORTUNITY.md` |
| 6 | Purview / DLP spot-check on CopilotSummary / CopilotKeywords | Owner security | Security | No secrets patterns in sample rows |
| 7 | Production cutover of channel IDs | Owner | `OA-CRM-*` / `OA-CAP-01` | Signed approval record |

## Teams packaging (spec — not executed here)

### Package contents (logical LOB package for future publish)

| Artifact | Role | This workstream |
|----------|------|-----------------|
| Team + channel topology | CRM Pipeline + Capital Desk (+ optional Test twins) | Spec only |
| Environment variables | Channel ID bindings for Power Automate | Spec / inventory only |
| Connection refs | SharePoint, Teams, Approvals (`hvcg_sharedapprovals`) | Reference existing solution manifests |
| Notification templates | Adaptive Card / markdown posts per event | Defined in `TEAMS_NOTIFICATION_SPEC.md` |
| Optional future Teams app | Deep links into Power App CRM screens | **Deferred** — do not publish |

### Sideload / publish ban

Until Owner signs packaging go-live:

- No Teams Developer Portal publish  
- No org-wide or company-wide app policies  
- No production channel posts from CRM notify flows  

### Membership (least privilege)

| Channel | Suggested membership |
|---------|----------------------|
| HVCG CRM / Pipeline | Owner, Ops Manager, Project Managers / sellers with CRM access |
| HVCG Capital Desk | Owner, Capital Advisors, Ops as needed |
| Test channels | Builders + named test UPNs only |

Guests and clients: **out of scope** for CRM notify channels.

## Outbound communication policy

**Every** Teams, Outlook, or external message triggered by Opportunity CRM automation requires a **human approval gate** before non-test delivery. Details and gate IDs: `docs/crm/TEAMS_NOTIFICATION_SPEC.md`.

Aligns with `docs/ai/AI_CONTEXT_POLICY.md` (prohibited autonomous send) and `docs/ai/AI_APPROVAL_MATRIX.md` (never auto-send client-facing).

## Flow map (reference only — do not edit JSON here)

| Flow | Teams channel env | Copilot side effect |
|------|-------------------|---------------------|
| `HVCG_LeadQualifiedCreateOpportunity` | `HVCG_TEAMS_CRM_CHANNEL_ID` | Seeds `CopilotSummary` on new opportunity |
| `HVCG_OpportunityStageChangedNotify` | `HVCG_TEAMS_CRM_CHANNEL_ID` | Patches `CopilotSummary`; logs activity |
| `HVCG_OpportunityWonCloseout` | CRM (+ capital awareness) | Win/loss + capital bridge fields |
| `HVCG_CapitalFundingStatusNotify` | `HVCG_TEAMS_CAPITAL_CHANNEL_ID` | Bridge `CapitalHandoffStatus`; activity log |

## Copilot readiness pointer

Full grounding rules, searchable field inventory, and **secrets ban**: `docs/crm/COPILOT_OPPORTUNITY.md`.

Platform baseline: `docs/architecture/COPILOT_READY.md`.

## Deal war-room (optional)

- Field: `HVCG_Opportunities.TeamsThreadUrl`  
- Human sets URL after creating a private deal thread  
- Automations must not invent guest-sharing links  

## Acceptance criteria (docs-complete)

- [x] Notification spec with CRM + Capital channels and test-only recipients  
- [x] Explicit human approval gates for outbound communication  
- [x] Copilot metadata / field descriptions / searchable grounding validated in `COPILOT_OPPORTUNITY.md`  
- [x] Secrets banned from Copilot fields  
- [ ] Owner packaging sign-off (live Teams) — **human, out of band**  
- [ ] Production notifications enabled — **human, out of band; never by this agent**
