# stash0 hunk classification vs live Hub `a43803e`

**Recorded:** 2026-08-19  
**Branch:** `fix/hub-stash0-hardening` `773e120`  
**Verdict:** Do **not** merge, cherry-pick, or deploy this branch. Production changes from it: **none**.

Wave 2 collides with live CRM Hub `a43803e` (`listLeads` / `listAuthorizedLeads` / command-center). Remaining Wave 1 items are fail-closed hygiene, **not** a proven P0/P1.

| Wave | Hunk | vs `a43803e` |
|------|------|----------------|
| W1 | `capital/http.ts` 404 `{code,message}` | **STILL NEEDED** |
| W1 | Overlay `/health` parse cap (`HEALTH_OVERLAY_PARSE_MAX_BYTES`) | **STILL NEEDED** |
| W1 | `overlayReadable=true` on valid schema | **ALREADY PRESENT** |
| W1 | `MAX_GRAPH_LIST_PAGES` + capital `listAll` fail-closed | **STILL NEEDED** |
| W1 | `router.ts` `toHubErrorPayload` + 404 `code` | **STILL NEEDED** |
| W1 | Capital 409 `code` via `toCapitalErrorBody` | **ALREADY PRESENT** |
| W1 | Overlay-only SYN recorded-submission recycle **behavior** | **ALREADY PRESENT** |
| W1 | Overlay parse-cap / Graph-cap / 404-contract **tests** | **STILL NEEDED** |
| W1 | `Set-HVCGCapitalHubAppSettings.ps1` pin `INTEGRATION_DATA_DIR` | **STILL NEEDED** (script only; live app already uses that path) |
| W1 | Injection regex expansions (extract / execution-trust / local-ai) | **STILL NEEDED** |
| W1 | `wrapUntrustedContent` delimiters | **ALREADY PRESENT** |
| W1 | Expanded injection **tests** | **STILL NEEDED** |
| W2 | `command-center`: `listAuthorizedMilestones(principal)` (drops `listAuthorizedLeads`) | **CONFLICTING** / **UNSAFE** |
| W2 | Portfolio `blockerCount` | **ALREADY PRESENT** |
| W2 | Portfolio `dataQuality` / `bootstrapNext` (overwrites CRM `clientCode`/`needs_review`) | **CONFLICTING** |
| W2 | PM `listAll` page cap | **STILL NEEDED** |
| W2 | `listAuthorizedMilestones(projectId?)` signature | **CONFLICTING** |
| W2 | `listLeads()` insert | **SUPERSEDED** (live has `listLeads` + `listAuthorizedLeads`) |
| W2 | Search tenant-isolation / no `/pipeline` test | **SUPERSEDED** |
| W2 | Command-center N+1 milestone test | **CONFLICTING** |
| W2 | Unbounded Graph pagination test | **STILL NEEDED** |

If Wave 1 is ever hand-ported later, do it on a Hub-only branch against `a43803e`. Never apply whole `773e120`. Never drop `listAuthorizedLeads`.
