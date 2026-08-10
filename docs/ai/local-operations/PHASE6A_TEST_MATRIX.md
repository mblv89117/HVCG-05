# Phase 6A — Test Matrix & Evidence

## Matrix

| Case | Expected |
| --- | --- |
| Website registration | Creates record with Manny confirm |
| Duplicate registration | 409 |
| Registration without confirm | 403 |
| Repository discovery | Read-only map + confidence |
| Framework detection | Next.js etc. from package/config |
| Page/content/SEO/media/form inventory | Present for synthetic sites |
| NL request | CR created, files not modified |
| Classification A/B/C/D | Correct tiers |
| AI content proposal | Proposal + mayDeploy/mayPush false |
| Forbidden AI deploy | 403 |
| Manny approve / reject | Status transitions |
| Tier D approve | Blocked |
| Branch create | `website-studio/*` only |
| Diff / sandbox edit | Local sandbox only |
| No production-branch commit | Forbidden |
| No push / merge / deploy | Enforced |
| Preview / QA | Scaffolded; localhost only |
| Deployment / rollback scaffold | `phase6aNoExecute` |
| Audit completeness | Events recorded |

## Commands

```bash
cd packages/atlas-integration-core && npm test -- tests/website-studio.test.ts
cd apps/atlas-integration-api && npm test -- tests/website-studio-phase6a.test.ts
```

Evidence captured in `deployment/reports/website-studio-phase6a/` after test run.
