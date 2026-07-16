# WEBSITE PREVIEW DEPLOYMENT

**Source package:** Master PM `docs/business-launch/go-live/track3-website/`  
**Local preview:** `serve_preview.sh` → http://127.0.0.1:8765  
**Soft UAT:** 834 PASS / 0 FAIL  
**robots:** Disallow · noindex (preview)  

## Validation (consume website track)

| Check | Status |
|-------|--------|
| Preview pack present | YES (master-pm worktree) |
| Pages / sitemap / robots | YES |
| HTTPS public | NOT STARTED |
| Hosted private preview | NOT APPROVED |
| Forms → CRM | NOT WIRED |
| Booking live | MOCK |
| Analytics Prod | NOT STARTED |
| DNS | BLOCKED pending GL-PUBLISH-1 |

## Hosting / DNS requirements (plan only)

1. Phase B: Azure Static Web Apps **or** SharePoint Communication Site (owner chooses)  
2. Private hosted preview URL before DNS  
3. SSL/HTTPS on host  
4. No public DNS until GL-PUBLISH-1  

**No hosting purchase or DNS change this cycle.**
