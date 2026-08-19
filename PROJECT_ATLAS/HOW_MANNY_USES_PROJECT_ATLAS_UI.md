# How Manny Uses Project Atlas Command Center

**Environment:** HVCG Development only  
**Banner meaning:** This is Development / UAT. No live client actions.

## Open the app

Play link:

https://org1131a2b0.crm.dynamics.com/main.aspx?appid=dea8a490-4b82-f111-ab0e-6045bd0193e8

Sign in as: `manny@highvaluecapitalgroup.com`

Maker / details:

https://make.powerapps.com/environments/c03b1329-4394-ece7-acc9-c50794b3db1e/apps/dea8a490-4b82-f111-ab0e-6045bd0193e8/details

## What you will see (left navigation)

| Nav item | Purpose |
|----------|---------|
| Executive Home | Latest executive brief |
| Portfolio | Tracks and health |
| Revenue Summary | KPI cards (sample / labeled) |
| Sprint Center | Active and recent sprints |
| Agent Control Center | Agent assignments |
| Release Center | Release / deployment status |
| Owner Approval Inbox | Items waiting for your decision |
| Change Request Center | Change requests |
| UAT Feedback | Log bugs / enhancements |
| Risks / Blockers / Technical Debt | Supporting lists |
| Data Sources | Where each number comes from |

## How to tell real vs sample data

Look at the **Data Source** column on records:

| Label | Meaning |
|-------|---------|
| Repository-derived | Taken from Atlas / repo state for Dev |
| Development sample | Realistic sample for UAT only |
| Unavailable | Not connected in Development |
| Live | Would mean live system (not used for client actions here) |

If a metric says sample or unavailable, do not treat it as a live business number.

## Safe owner actions in this app

- Read portfolio, sprints, agents, releases, briefs
- Open an approval and set Decision + Owner Notes
- Submit UAT Feedback (Bug / Enhancement / Question)
- Create or update a Change Request

## Do not do from this app

- Production changes
- Track 1 CRM changes
- Client emails, portal invites, payments, DNS, website publish
- Anything labeled Production without a separate owner gate

## If something looks wrong

1. Note the screen name
2. Note whether Data Source said sample / repository / unavailable
3. Add a row under **UAT Feedback** with expected vs actual
4. Or message Master PM with a screenshot

## Solution / names (for support)

| Item | Value |
|------|-------|
| Environment | HVCG Development |
| Org URL | https://org1131a2b0.crm.dynamics.com |
| Solution | HVCGProjectAtlasCommandCenterDEV |
| App display name | Atlas Command Center |
| App unique name | atlas_command_center_005b1424 |
| App ID | dea8a490-4b82-f111-ab0e-6045bd0193e8 |
| Roles associated | System Administrator, System Customizer |
