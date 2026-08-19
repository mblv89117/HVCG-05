# QA Handoff — Project Atlas Command Center (Microsoft Dev/UAT)

## Summary

Development/UAT model-driven app published in **HVCG Development** with 13 Atlas Dataverse tables, seeded sample data, sitemap navigation, and System Administrator / System Customizer role association.

## Links

| Kind | URL |
|------|-----|
| Play | https://org1131a2b0.crm.dynamics.com/main.aspx?appid=dea8a490-4b82-f111-ab0e-6045bd0193e8 |
| Maker | https://make.powerapps.com/environments/c03b1329-4394-ece7-acc9-c50794b3db1e/apps/dea8a490-4b82-f111-ab0e-6045bd0193e8/details |
| Owner guide | `PROJECT_ATLAS/HOW_MANNY_USES_PROJECT_ATLAS_UI.md` |
| UAT checklist | `PROJECT_ATLAS/QA/AtlasPowerAppsUAT/UAT_CHECKLIST.md` |

## Solution / app

| Item | Value |
|------|-------|
| Environment | HVCG Development (`org1131a2b0`) |
| Environment ID | c03b1329-4394-ece7-acc9-c50794b3db1e |
| Solution unique name | HVCGProjectAtlasCommandCenterDEV |
| App display name | Atlas Command Center |
| App unique name | atlas_command_center_005b1424 |
| App ID | dea8a490-4b82-f111-ab0e-6045bd0193e8 |
| Branch | `cursor/track7-atlas-powerapps-uat` |
| Worktree | `.worktrees/atlas-powerapps-uat` |

## Tables (prefix `hvcg_`)

atlastrack, atlassprint, atlasagent, atlasapproval, atlaschangerequest, atlasrisk, atlasblocker, atlastechnicaldebt, atlasrelease, atlasuatfeedback, atlasbrief, atlasrevenuekpi, atlasdatasource

## Seed counts (API verified)

Tracks 8 · Sprints 6 · Agents 6 · Approvals 5 · CRs 3 · Risks 4 · Blockers 3 · Debt 3 · Releases 4 · UAT 2 · Briefs 1 · Revenue KPIs 6 · Data Sources 6

## Automated checks completed

- [x] Silent Dataverse token for Dev org
- [x] Solution present
- [x] All 13 tables present with rows
- [x] Forms/views added to app
- [x] Sitemap includes all 13 entity SubAreas
- [x] ValidateApp ValidationSuccess=true (warnings only)
- [x] PublishXml + PublishAllXml
- [x] pac model list shows app **Published** (not Saved-Not-Published)
- [x] Roles associated: System Administrator, System Customizer

## Known limitations

1. App is a **model-driven** Power App (grids/forms), not a polished Canvas UI. Canvas polish is deferred.
2. ValidateApp may still warn that the app "does not reference at least one entity" even though forms/views and sitemap Entity SubAreas are present — navigation works after publish.
3. Orphan unpublished app `hvcg_projectatlascommandcenter` (id `60d2602c-...`) may still appear in the list; do not use it. Primary app is `dea8a490-...`.
4. Revenue KPIs are Development sample / Unavailable — not live.
5. Teams tab not added yet (safe follow-up after owner UAT).
6. No Production, Track 1, client comms, merge, or push performed.

## Rollback (Dev only)

1. Unpublish or delete app `dea8a490-4b82-f111-ab0e-6045bd0193e8` in Maker.
2. Optionally delete solution `HVCGProjectAtlasCommandCenterDEV` (removes managed customizations in that solution).
3. Tables can be left in place for Dev reuse or deleted later with owner approval.
4. No Production rollback needed — nothing was deployed to Production.

## QA next

1. Owner completes UAT checklist in the play link.
2. Capture screenshots per screen during owner session.
3. Triage UAT Feedback rows.
4. Gate: commit/push of this branch only after QA/owner approval.
