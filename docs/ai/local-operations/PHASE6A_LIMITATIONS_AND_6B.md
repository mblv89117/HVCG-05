# Phase 6A — Known Limitations, Rollback, Phase 6B, Owner Actions

## Known limitations

- Preview servers are not auto-started in unit tests (URL scaffolding only)
- Real website file apply into live repos is intentionally disabled by default (sandbox only)
- Framework adapters beyond synthetic Next.js/Vite fixtures are discovery heuristics, not full AST parsers
- SEO duplicate title/description checks across all pages are dashboard-level heuristics, not full crawl
- Media compression recommendations are advisory strings only
- No Ollama live call required for Phase 6A (deterministic AI drafts)

## Rollback plan (Atlas code)

1. Revert the Website Studio commit(s) on `feature/atlas-local-ai-operations`
2. Delete local `.data/website-studio/` if needed
3. Do **not** touch Production tag `atlas-v1.0.1-production`
4. Keep draft PR draft; do not merge

## Phase 6B recommendation (do not start yet)

1. Optional Manny-authorized **single synthetic repo** end-to-end: branch → sandbox/real file patch → local preview process → commit on `website-studio/*` still **no push**
2. Governed push + draft PR creation behind explicit Manny action
3. Deeper framework adapters (Next.js App Router, Vite) for content source maps
4. Embedded preview iframe for localhost only
5. Still **no Production deploy** until a later phase with separate Production approval gate

## Owner actions required

1. Review Website Studio UI at `/website-studio` against synthetic fixtures
2. Confirm no real Production repos should be registered yet
3. Keep draft PR #3 as draft after Phase 6A update
4. Do not approve Phase 6B until Phase 6A review verdict is accepted
5. Confirm Local AI Production flags remain false
