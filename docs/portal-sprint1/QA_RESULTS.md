# Client Portal QA Results — Version 1

**As of:** 2026-07-16
**Branch:** `cursor/client-portal-sprint1`
**App:** `apps/hvcg-client-portal`

## Summary

| Suite | Result |
|-------|--------|
| Unit (Vitest) | **PASS** — 10/10 |
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
- Timeline, milestone, invoice, and notification routes present
- New mock records are client-scoped
- Integrations mocked; Outlook not ready
- Mobile breakpoint CSS + viewport meta
- Build emits `dist/` for preview/screenshots

## Screenshots

See `docs/portal-sprint1/screenshots/` (desktop + mobile home).

## Residual / gated

- Live Entra invites (BL-C1)
- Live SharePoint wiring
- Merge requires a separate owner instruction
- Current Version 1 additions remain uncommitted pending QA disposition
- No Production / Track 1 / Revenue edits performed
