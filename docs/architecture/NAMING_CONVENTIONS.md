# NAMING CONVENTIONS — HVCG OS

| Field | Value |
|-------|--------|
| Owner | architect |
| Status | ACTIVE |
| As of | 2026-07-15 |

## 1. General rules

- Product prefix: **`HVCG`** (human) / **`hvcg`** (publisher / Dataverse / solution logical names)
- Prefer PascalCase concatenated tokens after prefix for SharePoint list *file* and *Title*: `HVCG_Clients`
- Underscore separates prefix from entity: `HVCG_<Entity>`
- Domain exclusive extensions: `HVCG_<Domain><Entity>` e.g. `HVCG_FinanceCashReceipts`, `HVCG_OpsRenewalAlerts`
- AI specialized queues: **`HVCG_AI_<Queue>`** (underscore after AI) — retain for existing ten queues
- AI orchestration foundation lists: **`HVCG_AI<Token>`** without second underscore (`HVCG_AIJobs`) — historical; **do not invent a third pattern**

## 2. SharePoint

| Artifact | Pattern | Example |
|----------|---------|---------|
| Site | Purpose-based URL segment | Command Center site, Clients hub |
| List Title / schema file | `HVCG_<Entity>.json` / Title `HVCG_<Entity>` | `HVCG_Opportunities` |
| Library | `HVCG_<Purpose>Library` | `HVCG_DataRoomLibrary` |
| Column internal name | PascalCase, no spaces | `ClientCode`, `OpportunityId` |
| Business keys | `<Entity>Id` or stable code | `JobId`, `ClientCode` |
| View | `<Entity>_<Purpose>` | `Opportunities_OpenPipeline` |
| Content type (if used) | `HVCG <Name>` | `HVCG Deliverable` |

**List vs library:** structured rows → list; documents/binaries → library. Data rooms = library + participant list.

## 3. Power Platform

| Artifact | Pattern | Example |
|----------|---------|---------|
| Publisher | `HVCG` | |
| Prefix | `hvcg` | |
| Solution (unmanaged Dev) | `HVCGCommandCenterDev` | |
| Canvas app | `HVCG OS Command Center` / module screens `scr<Name>` | `scrDataRooms` |
| Flow display name | `HVCG_<VerbOrDomain><Action>` | `HVCG_LeadQualifiedCreateOpportunity` |
| Module-exclusive flow | `HVCG_<ModulePrefix><Action>` | `HVCG_OpsWeeklyDigest`, `HVCG_PortalPublishStatusUpdate` |
| Connection reference logical name | `hvcg_shared<connector>` | `hvcg_sharedsharepointonline` |
| Environment variable logical name | `hvcg_<PascalCase>` | `hvcg_ExecutiveEmail` |
| Env var *documentation alias* | `HVCG_<SCREAMING>` optional | Map explicitly to `hvcg_*` |

## 4. Dataverse (future)

Tables: `hvcg_<entity>` plural; columns `hvcg_<field>`; choices `hvcg_<name>`.

## 5. Power BI

Dataset: `HVCG OS Enterprise`; tables match SharePoint entity names; measures `m_<VerbNoun>`; reports `HVCG <Audience> <Topic>`.

## 6. Copilot / AI

Prompts: `PromptKey` + `PromptVersion` in `HVCG_AIPrompts`; agents/workers registered in `HVCG_AIWorkers`; no secrets in prompt text.

## 7. Git / worktrees / releases / tests

| Artifact | Pattern |
|----------|---------|
| Feature / agent branch | `cursor/<role-or-module>` or `agent/crm-<worker>` |
| Worktree folder | `.worktrees/<same-as-branch-suffix>` |
| Release tag | `vMAJOR.MINOR.PATCH` |
| Migration file | `releases/migrations/YYYYMMDD_NNN_<slug>.json` |
| Test file | `tests/<area>/…` or `Test-HVCG*.ps1` / `test_<module>.py` |

## 8. Agent communications

`agentId`: lowercase kebab optional tokens — canonical IDs: `master-pm`, `crm`, `executive`, `operations`, `finance`, `client-portal`, `ai-governance`, `integration`, `architect`.  
**Do not** register a second ID for the same module (`operations-hub` is legacy duplicate of `operations`).

## 9. Anti-patterns

- Editing shared `*_index.json` from module branches (use exclusive `_module_index.json`)
- New connection refs that duplicate shared_* connectors
- Mixing `HVCG_AI_Tasks` (AI queue) with delivery `HVCG_Tasks` in the same UI without clear labels
- Storing secrets in JSON schemas, flows checked into git, or `.agent-comms` messages
