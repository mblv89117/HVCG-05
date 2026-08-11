# Revenue Pipeline Product — QA Evidence

**Branch / worktree:** `cursor/revenue-pipeline-product` · `.worktrees/revenue-pipeline-product`  
**Base:** Elite OS Executive Dashboard product tip (`a571a8a`)  
**Date:** 2026-07-19  
**Status:** READY FOR INTEGRATION & QA (not self-released; Master PM notified 2026-07-20)

## Deliverable checklist

| Deliverable | Evidence |
|-------------|----------|
| Production pipeline | `PIPELINE_STAGES` in `apps/atlas-elite-os/src/data/revenuePipeline.ts`; UI on `/revenue` |
| Referral tracking | `referralPartners` + opportunity `attributionChain`; UI referral table |
| Opportunity detail | `/revenue/opportunities/:opportunityId` → `OpportunityDetailPage.tsx` |
| Weighted forecast | `forecastSummary` / `stageCounts`; Revenue + Executive widgets |
| Executive revenue components | `ExecutiveDashboard.tsx` “Revenue operating system” card |
| Stale-opportunity alerts | `isStale` + executive stale count + Revenue health column |
| Onboarding transition | `advanceOnboarding` + detail action “Initiate onboarding” |
| Role-based access | `REVENUE_CAPABILITIES` + `canAccessRevenue` / `canRevenueCapability` |
| QA evidence | This file + `tests/revenue/run_revenue_pipeline_product_tests.mjs` |
| User documentation | `docs/revenue/REVENUE_OS_USER_GUIDE.md` |

## Colorado Craft Beef verification

| Fact | Source used | Invented? |
|------|-------------|-----------|
| Jeff Smith | Owner product-build assignment | No |
| Colorado Craft Beef | Repo + assignment | No |
| Randy Kamin / Generational Group | Repo + assignment | No |
| Original HVS referral → HVCG | Repo relationship history | No |
| Stage Blueprint | Owner assignment | No |
| Growth capital + real estate | Repo + assignment | No |
| Fee / recurring / success-fee $ | None verified | Shown as Pending verification |

## Automated QA

```bash
node tests/revenue/run_revenue_pipeline_product_tests.mjs
```

Expect: **58 passed, 0 failed**; exit code 0.

## Manual smoke (Dev)

1. Open Elite OS → Executive Home → confirm Revenue OS strip and CCB highlight.
2. Open Revenue → confirm Blueprint stage count ≥ 1; CCB row links to detail.
3. Opportunity detail → confirm attribution chain and pending fee labels.
4. Create lead → Qualify → Convert → confirm new Discovery opportunity with referral source.
5. Mark Won → Initiate onboarding → confirm stage Onboarding.
6. Confirm Guest role (`VITE_ATLAS_ROLE=Guest`) is redirected from `/revenue`.

## Out of scope / not done

- Production deploy / public publish
- Invented fee amounts
- Auto-qualify leads
- Dataverse live write-back (seed SoR for Dev/UAT product experience)
- Commit/push (awaiting explicit Owner request)
