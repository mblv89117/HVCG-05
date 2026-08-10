# Phase 6A — Website Registry, Discovery, Page/Content/SEO/Media/Form Schemas

## Website registry

Record fields: websiteId, websiteName, businessEntity, production/staging URLs, repository URL, local path, framework, hosting, production & default development branches, build/test/preview commands, deployment method, content/SEO architecture, analytics & form providers, status, last successful deployment, last rollback point, open CR count, repository health, notes, synthetic, mannyConfirmedRegistration, timestamps.

Duplicate name registration → 409.  
Registration without Manny confirmation → 403.  
Synthetic fixtures: HVCG + Las Vegas Appraisal Company (not live repos).

## Discovery (read-only)

`discoverLocalRepository(path)` returns repository map + confidence. Never modifies files. Detects git remote/branch, framework, package manager, scripts, pages/routes/content/components/SEO/media/forms/redirects/sitemap/robots, env **filenames only**, deployment config files.

## Pages / content blocks

Page inventory is framework-agnostic (adapters via discovery + fixtures).  
Content blocks are typed (headline, CTA, FAQ, etc.). Normal path forbids raw arbitrary code editing.

## SEO

Controlled fields + `validateSeoFields` (title/description length, missing H1, malformed canonical, noindex, missing OG). Never auto-publish.

## Media

Inventory + unused / missing alt / duplicate flags. Phase 6A: local preview only; no live upload/replace.

## Forms

Inventory includes endpoint high-risk flag. Safe copy edits via CR; endpoints/auth/payments/CRM/EVA/webhooks require developer/restricted escalation.

## Change request lifecycle

Statuses from Draft → … → Waiting on Manny → Approved for Git → Committed (sandbox) → … Deployed (future). Phase 6A stops before push/PR/deploy. Every CR carries `phase6aNoPush` / `phase6aNoDeploy`.

## Classification policy

| Tier | Examples | Approval |
| --- | --- | --- |
| A | text, headline, CTA, FAQ, metadata | Manny approve for Git |
| B | section, media, form layout, redirect, schema | Stronger review |
| C | code behavior, APIs, integrations | Developer-style CR |
| D | DNS, secrets, auth/payment providers, Prod config | Restricted — no auto file apply in 6A |
