# Phase 6A — Git Safety, Preview, QA, Deployment & Rollback

## Git adapter

Predefined operations only: status, current branch, clean/dirty, create `website-studio/*` feature branch, show diff, commit approved (non-production, website-studio branch only), prepare PR metadata.

Forbidden: push, merge, rebase, hard reset, checkout main/master for edit, deploy, arbitrary user shell.

## File change safety (after Manny approve)

- Prefer `.data/website-studio/sandboxes/...` writes
- Never edit production branch directly
- Record branch / sandbox commit reference
- Show diff
- No push / deploy in Phase 6A

## Preview

Scaffold local preview URL (`127.0.0.1` only). `publicExposure: false`. Does not expose localhost publicly. Phase 6A tests do not spawn long-running preview servers.

## QA policy

`buildDefaultQaChecklist` covers build/typecheck/tests, layouts (Manny visual), links/CTA/forms, SEO fields, images/alt, analytics preservation, robots/sitemap/redirects, no broken imports, no secret exposure, no env breakage. Manny can mark visual items.

## Deployment scaffolding

Records store environment, provider, branch, commit, status=`Blocked — Phase 6A`, `phase6aNoExecute: true`. Future flow: commit → push → PR → merge → preview → **Manny Production approval** → deploy → health → rollback.

## Rollback scaffolding

Tracks website, deployment, commits, reason, initiators, outcome=`Scaffolded Only — Phase 6A`. No execute in 6A.
