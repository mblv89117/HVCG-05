# Branch & Worktree Inventory — Project Atlas

**As of:** 2026-07-20  
**Authority:** Integration & Release Manager  
**Primary worktree:** `.worktrees/atlas-integration-release`  
**Integration branch:** `cursor/atlas-integration-release`

## Source of truth

| Field | Value |
|-------|-------|
| Integration branch | `cursor/atlas-integration-release` |
| Base (product SoR) | `cursor/elite-ui-release-recovery` @ `35ca684` |
| Deployed product commit (Dev SWA) | `ce59f8e` |
| Integration HEAD (at inventory) | see RELEASE_STATUS.md |
| Governance trunk (not product) | `cursor/agent-communications` @ `912d3ca` |

## Uncommitted-work protection

| Location | Action | Ref |
|----------|--------|-----|
| Main worktree `cursor/agent-communications` | Stashed (not discarded) | `stash@{1}` INTEGRATION-PRESERVE agent-communications WIP |
| `elite-ui-release-recovery` knowledge rail WIP | Stashed + carried into integration | `stash@{0}` + commit on integration |

## Active worktrees (40)

| Worktree | Branch | HEAD | Disposition |
|----------|--------|------|-------------|
| _(main)_ | `cursor/agent-communications` | `912d3ca` | Governance trunk — dirty WIP stashed |
| `atlas-integration-release` | `cursor/atlas-integration-release` | integration | **RELEASE SoR** |
| `elite-ui-release-recovery` | `cursor/elite-ui-release-recovery` | `35ca684` | Product base — freeze features |
| `plaid-integration` | `cursor/plaid-integration` | `6d78514` | **Integrated** (API + contracts + banking UI) |
| `sprint11-azure-production-migration` | `cursor/sprint11-azure-production-migration` | `a386d81` | **Partial** (infra + deploy script) |
| `revenue-sprint3` | `cursor/revenue-sprint3-conversion` | `0073bf4` | Preserve — Revenue SoR (docs/flows) |
| `revenue-sprint4` | `cursor/revenue-sprint4-activation` | `bf34c93` | Deferred |
| `orchestration-sprint12` | `cursor/orchestration-sprint12` | `5f33510` | Deferred — divergent merge-base |
| `executive-intelligence-sprint1` | `cursor/executive-intelligence-sprint1` | `5bb42c2` | Deferred — separate mock app |
| `finance-intelligence-sprint1` | `cursor/finance-intelligence-sprint1` | `c287508` | **Excluded** — mock-demo policy |
| `client-portal-sprint1` | `cursor/client-portal-sprint1` | `1d399eb` | Deferred — BL-C1; portal shell not merged |
| `operations-hub-sprint1` | `cursor/operations-hub-sprint1` | `0f8f6da` | Deferred — registry |
| `ai-governance-sprint1` | `cursor/ai-governance-sprint1` | `0dc0c6f` | Deferred |
| `deployment-engineer` | `cursor/deployment-engineer` | `c726f1e` | Preserve — Track 1 freeze |
| `deployment-manager-sprint1` | `cursor/deployment-manager-sprint1` | `2290456` | Later |
| `track10-elite-ui` | `cursor/track10-elite-microsoft-ui` | `cd2bd72` | **STOP** — competing Elite fork |
| `revenue-pipeline-product` | `cursor/revenue-pipeline-product` | `923d475` | **STOP** — archive |
| CRM agent WTs (6) | `agent/crm-*` | various | Finished — preserve |
| Duplicate EOS / CEO / UAT WTs | track7 / track9 | `d778f23` | Archive duplicates |
| Stale governance WTs | master-pm / architect / qa @ old | various | Stale |

## Included in integration (this release)

1. Elite UI release recovery (shell, auth, RBAC, modules)
2. Knowledge rail WIP (from elite uncommitted)
3. Plaid API + contracts + Banking Connections page in Elite shell
4. Azure foundations + `scripts/deploy-swa-dev.sh`
5. Unified primary navigation + client selector

## Excluded / deferred

| Branch / work | Reason |
|---------------|--------|
| `cursor/comms-product-timeline` / track10 | Competing Elite OS (+1657 conflict risk) |
| `cursor/revenue-pipeline-product` | Unstable checkpoint |
| `cursor/finance-intelligence-sprint1` | Mock-demo financials — policy conflict |
| `cursor/executive-*-sprint1` separate app | Elite already has Executive Dashboard |
| `cursor/client-portal-sprint1` full portal | Separate shell; BL-C1 gate |
| QuickBooks | **No specialist branch / incomplete** |
| `cursor/orchestration-sprint12` | High-risk divergent ancestry |
| Production / `main` promotion | Blocked until QA written GO |

## Specialist coverage vs request

| Area | Status |
|------|--------|
| Master PM | Docs on trunk + audit 2026-07-20 |
| Elite UI | Integrated (SoR) |
| Client Portal | Portal shell deferred; Plaid banking in Elite |
| Executive Command Center | Covered by Elite Home / Executive Dashboard |
| Finance Intelligence | Elite Financials (pending labels); mock app excluded |
| Data Engineering | Not merged as separate package |
| Administration | Elite Admin page |
| Knowledge Platform | Knowledge rail + Knowledge nav |
| Revenue OS | S1–3 complete on own branch; not re-merged into UI |
| Plaid | Integrated Sandbox stack |
| QuickBooks | **Missing — blocker** |
| Azure deployment | Scripts + bicep included |
| Power Platform | Track 1 frozen; Prod NO-GO unchanged |
| Entra auth | Elite MSAL path — needs `VITE_ENTRA_CLIENT_ID` |
| QA / release recovery | Recovery tests PASS on integration |
| Agent communications | Preserved via stash on trunk |
