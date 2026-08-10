# Phase 6B-UX — Website Studio Owner Experience + Expert Website Advisor

## Scope
Owner-friendly Website Studio redesign on Atlas branch `feature/atlas-local-ai-operations`.
Preserves Phase 6A/6B control plane, HVCG pilot CR `wcr_96016971141f`, and all production safety gates.

## Owner Mode (default)
- Website selector (synthetic sites hidden unless Advanced Mode)
- Left navigation: Overview / Edit / Growth / Changes / Tools / Advanced
- First-run welcome actions
- Human-readable page names
- Visual editor + Expert Website Advisor panel
- Owner-friendly change review (before/after)
- Preview status detection for registered local preview
- SEO / Media / Forms / Analytics / Publishing / History views
- Publish button disabled — Production publishing requires separate Manny authorization

## Advanced Mode
- Shows TEST WEBSITE fixtures
- Developer Details (repo, path, framework, bootstrap tools)
- Collapsed technical CR metadata

## Expert Website Advisor
- Deterministic local analysis (`/analyze`, site-wide analyze, advisor chat)
- AI Website Health Estimate (not external certification)
- Claim verification warnings for invented metrics
- Never deploys, pushes, merges, or bypasses Manny approval

## Local URLs
- Atlas: http://127.0.0.1:5180/
- Website Studio: http://127.0.0.1:5180/website-studio
- HVCG local preview: http://127.0.0.1:8765/

## Screenshots
See `deployment/reports/website-studio-phase6b-ux/`.

## Safety
No Production website edits, no website push, no Atlas deploy, no PR merge in this phase.
