# Rollback validation

## Procedure (documented)

From `Track10_Hosting_Teams_Rollback.md`:

1. Remove Teams tab / sitemap link if enabled  
2. Revert SWA to prior deployment revision  
3. Elite rollback does **not** tear down Dataverse / model-driven admin  
4. No Production rollback needed (Prod not deployed)

## Exercise status

| Check | Result |
|-------|--------|
| Procedure documented | **PASS** |
| Prior SWA revision ID recorded in this QA pack | **FAIL** — not captured (needs Deployment Manager) |
| Drill executed on Dev | **NOT RUN** this session |
| Dataverse unaffected by UI rollback | Accepted by design |

**Verdict:** Rollback **documented but not verified by drill**. Block Prod; acceptable for Dev-only with Deployment Manager completing revision bookmark.
