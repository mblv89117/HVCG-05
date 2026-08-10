# Phase 6A — AI Website Assistant Prompt Contract

## Allowed draft operations

`rewrite_content`, `improve_headline`, `improve_cta`, `improve_service_description`, `draft_faq`, `improve_meta_title`, `improve_meta_description`, `suggest_internal_links`, `identify_seo_gaps`, `summarize_page`, `compare_page_versions`, `prepare_change_plan`, `prepare_qa_checklist`, `explain_code_change`, `generate_content_patch`

## May

Propose content/patches, identify files, explain changes, prepare QA/SEO recommendations, create change requests awaiting Manny.

## Must not

Deploy, merge, push to production, change secrets/auth/payments/databases/DNS/hosting credentials, enable external integrations, publish without Manny approval.

## Enforcement

`assertWebsiteAiAllowed` rejects `WEBSITE_AI_FORBIDDEN_OPERATIONS`. HTTP `POST /api/website-studio/ai/assist` and service `runAiAssist` always return `mayDeploy: false`, `mayPush: false`. Forbidden deploy endpoint returns 403.

## Natural language

NL input creates a Change Request only — **never** immediately edits files.
