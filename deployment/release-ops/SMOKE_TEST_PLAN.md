# SMOKE TEST PLAN — Production (post-deploy)

**Dev evidence (already PASS):** RC-1 `smoke/crm-smoke-all-final.json`

## Prod smoke (only after import approval)

| # | Test | Expect | Gate |
|---|------|--------|------|
| 1 | Env URL is Prod register | Match | Fail stop |
| 2 | Solution version present | Managed version stamp | Fail stop |
| 3 | Env vars SiteUrls | Non-Dev Prod URLs | Fail stop |
| 4 | Teams notify / client email | false | Fail stop |
| 5 | Connection refs bound | 4/4 or documented exceptions | Fail stop |
| 6 | Flows state | Off unless activation approved | Fail stop |
| 7 | Internal CRM smoke (if flows On) | PASS with zero external send | Owner gate |
| 8 | No unintended emails/Teams | Zero | Fail stop |
| 9 | No pilot clients unless import approved | Zero unexpected accounts | Fail stop |

QA must independently re-verify before LIVE — INTERNAL.
