# Client Portal QA Results — Sprint 1 Phase 1

**As of:** 2026-07-16
**Branch:** `cursor/client-portal-sprint1`
**App:** `apps/hvcg-client-portal`

## Summary

| Suite | Result |
|-------|--------|
| Unit (Vitest) | **PASS** — 7/7 |
| Portal smoke | **PASS** |
| Permission tests | **PASS** |
| Navigation tests | **PASS** |
| Responsive tests | **PASS** |
| Production build | **PASS** (`vite build`) |

## Commands

```bash
cd apps/hvcg-client-portal
npm run build
npm test
npm run qa:smoke
npm run qa:permissions
npm run qa:navigation
npm run qa:responsive
# or: npm run qa:all
```

## Coverage notes

- Branding + nav + multi-client switcher
- Funding stages (all 11) render
- Document folders present
- Integrations mocked; Outlook not ready
- Mobile breakpoint CSS + viewport meta
- Build emits `dist/` for preview/screenshots

## Screenshots

See `docs/portal-sprint1/screenshots/` (desktop + mobile home).

## Residual / gated

- Live Entra invites (BL-C1)
- Live SharePoint wiring
- Merge requires a separate owner instruction
- No Production / Track 1 / Revenue edits performed
