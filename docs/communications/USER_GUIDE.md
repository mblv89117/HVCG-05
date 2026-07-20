# Communications — User Guide

**Product:** Atlas Elite OS · Communications  
**Audience:** Owner, Executive, Operations, Advisors  
**Rule:** Atlas surfaces context and launches Microsoft 365 tools. It does not replace Outlook or Teams.

## What you can do

| Action | Where |
|--------|--------|
| Review communication timeline | **Communications** nav · filter by client / purpose |
| Open Jeff Smith / CCB history | Communications → Client = Colorado Craft Beef, or Clients → CCB → timeline card |
| Launch Outlook compose / calendar | Communications header actions |
| Launch Teams / schedule meeting | Communications header actions |
| Prepare approved templates | Templates table → **Prepare** (opens Outlook draft marked NOT SENT) |
| Record call notes | Quick action → Record call notes |
| Create follow-up tasks | Quick action → Create follow-up task |
| Review notifications | **Notifications** (in-app; Teams posts remain gated) |

## Draft vs Sent

- **Draft / PendingApproval** — never treat as sent; chip shows `DRAFT · …`
- **Sent** — outbound after human approval
- **Recorded** — historical note/meeting/referral (may never have been email)

External templates set `ApprovalRequiredBeforeSend=true`. Live send stays blocked while `VITE_BLOCK_LIVE_CLIENT_COMMS=true` (default).

## Colorado Craft Beef · Jeff Smith

Timeline includes:

1. Generational Group referral (Randy Kamin) / original HVS path  
2. Referral continuity with Randy Kamin  
3. Prior HVS discussions (growth capital + real estate)  
4. Transition to HVCG  
5. Current HVCG meeting  
6. Blueprint presentation  
7. Follow-up document-request **draft** (not sent)  
8. Internal executive briefing  

Contact email/phone remain pending verified source — do not invent.

## Permissions

| Role | View timeline | Prepare external draft | Auto-send |
|------|---------------|------------------------|-----------|
| Owner / Executive | Yes | Yes | Never from Atlas |
| Operations / Advisor | Yes | Yes | Never |
| Finance | Yes | No | Never |
| Guest | No | No | Never |

See [PERMISSIONS_REVIEW.md](PERMISSIONS_REVIEW.md).

## Related Microsoft policy

- `docs/crm/TEAMS_NOTIFICATION_SPEC.md` — OA-CRM / OA-EXT gates  
- `docs/ai/AI_APPROVAL_MATRIX.md` — client emails never auto-send  
