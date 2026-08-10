# Website Studio — Product Design (Phase 6A)

## Positioning

Website Studio is a **module inside Atlas Elite OS**, not a standalone app. It sits on Integration Hub APIs and uses the existing Atlas design system (`ModuleScaffold`, Fluent UI, AtlasCard).

## Primary user

Manny — full Website Studio control; final authority for Production deployment (blocked in 6A).

## Workflow

1. Select registered website (multi-site registry)
2. Inspect pages / content blocks / SEO / media / forms
3. Natural-language or structured edit → Change Request
4. Local AI may draft proposals only
5. Preview & QA scaffolding
6. Manny approves for Git
7. Sandbox / feature-branch apply (no push)
8. Deployment/rollback UI scaffolding only

## Navigation

Route: `/website-studio`  
Subsections (query `?section=`): Websites, Pages, Content, SEO, Media, Forms, Change Requests, Preview & QA, Deployments, Rollback History, Settings.

## Non-goals (6A)

- Unrestricted visual page builder
- Live Production content edits
- Automatic media upload/replace
- Push / PR / merge / deploy execution
- Arbitrary Git/shell commands from the UI

## Time protection

Each change request includes estimated review minutes, estimated time saved, and recommended action so Manny does not need to read raw code for Tier A/B changes.
