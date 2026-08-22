# Elite candidate change manifest

Inspected from the dirty worktree immediately before the Elite candidate commit. Hub search is already live at `d22b55f` and is **not** part of this commit.

## Included (certified candidate)

### Command-K
- `AppShell.tsx`: Hub search loading/error; `searchPm(hubAuth, q)` only; no local Clients fallback; `hubHitTo` keeps `/capital?opportunity=`
- `SearchAndAI.tsx`: loading spinner, empty vs error copy, keyboard listbox
- `CommandBar.tsx`: nowrap, mobile search, compact chrome

### Auth / navigation
- `msal.ts`: Hub `access_as_user` scope; popup → redirect fallback
- `useHubAuth.ts`: `clientIds: []` (never `['*']`); `hasBearer` only with access token
- `RequireMicrosoftAuth.tsx`, `SystemPages.tsx`: unsigned fail-closed; Local Owner is chrome-only
- `vite.config.ts`: `strictPort: true` on `:5180`

### Knowledge / RBAC
- `knowledge/access.ts`, `roleMap.ts`: ClientScoped = assignedClients; Owner/Admin no bypass; Client Executive = ClientContact; Unauthenticated/Unresolved not ReadOnly
- `rbac.ts`, `clientCode.ts` + tests

### Home / Capital
- `CommandCenterPage.tsx`: Hub attention; Capital deep-links from Hub items
- `CapitalCommandCenter.tsx`: `?opportunity=` workspace; Needs Action fallback when Needs Manny is empty
- `OpportunityWorkspace.tsx`, `capitalApi.ts`, `capitalAccess.ts`, `capitalDisplay.ts`: 401/403 fail closed; no sample fallback in production

### Shared premium UI
- Design system: PageLayout/cards, NavShell, EmptyState, StatusChip, Overlays, OperatingPrimitives, status language
- Brand logo `public/brand/hvcg-logo.svg`
- Operating page shells (Clients, Projects, My Work, approvals) that were visually certified

### Tests included
- `appShellSearch.redteam.test.ts`
- `knowledge.redteam.test.ts`
- `capitalUiAssumptions.redteam.test.ts`, `capitalAccess.test.ts`, `capitalDisplay.test.ts`
- `rbac.test.ts`, `rbac.redteam.test.ts`, `clientCode.test.ts`

## Excluded (not this SHA)

- `apps/atlas-elite-os/.env.local` (gitignored)
- Uncommitted Hub API / capital-core / integration-core (not in live Hub `d22b55f` zip)
- `Set-HVCGCapitalHubAppSettings.ps1`
- QA screenshots / HTML dumps
- `PROJECT_ATLAS/CURRENT_STATE.md`

## Residual P2 (not fixed in this SHA)

Command-K Hub list-read latency ~8–18s on some queries.
