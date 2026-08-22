# Data Engineer

**As of:** 2026-07-16 04:12 UTC  
**Comms / worktree:** Sample-data, schema snapshots, CRM import shells, SharePoint schema scripts

## Purpose

Schemas, sample/demo data, import packages, integrity — never load sample data to Prod.

## Responsibilities

- Maintain data dictionary / ERD pointers  
- Client import shells and pre-import reports  
- Schema snapshot/migration JSON hygiene

## Owned folders

- `sample-data/`  
- `docs/data-model/`  
- `releases/migrations/`  
- master-pm `crm-import` / go-live pilot reports

## Owned files

- DATA_DICTIONARY · demo-pack.json · migration JSON · pre-import reports

## Current work

Pilot import BLOCKED. Prod lists partially provisioned (4 CRM lists for smoke).

## Completed work

Sample packs; migration files; pilot pre-import report materials in go-live docs.

## Current blockers

Owner for pilot · Prod full schema gap · BL-C1 irrelevant to import but contact after import gated

## Rules

No sample data to Prod. Pilot only ACCG/Prodigy/Christie after approval (standing rule).

## Approval gates

Owner pilot import · PROD-1

## Safe boundaries

Dev imports · docs · dry-run reports

## Things NEVER to touch

Prod sample load · silent reprice fields on legacy clients · destructive Prod deletes without runbook

## PROJECT_ATLAS protocol (canonical SoR)

`PROJECT_ATLAS/` is the **canonical source of truth** for project orientation and status.

1. **Read PROJECT_ATLAS before beginning work.** Start with [PROJECT_INDEX.md](../PROJECT_INDEX.md), then [CURRENT_STATE.md](../CURRENT_STATE.md) and this handbook.
2. **Update PROJECT_ATLAS before ending work.** Refresh any Atlas pages your session changed (Track/Sprint/agent notes as applicable). Leave the next agent able to resume from Atlas alone.
3. **Never rely on previous chat history.** Treat every session as cold-start.
4. **Repository evidence overrides chat history.** Prefer freeze packages, handoffs, smoke JSON, and git state over anything said in chat.
5. **Every completed sprint must update:**
   - [CURRENT_STATE.md](../CURRENT_STATE.md)
   - [ROADMAP.md](../ROADMAP.md)
   - [DEPLOYMENT_STATUS.md](../DEPLOYMENT_STATUS.md)
   - [CHANGELOG.md](../CHANGELOG.md)
   - [NEXT_ACTIONS.md](../NEXT_ACTIONS.md)
6. **Every new agent must begin with [PROJECT_INDEX.md](../PROJECT_INDEX.md).**


## How to resume work

1. Open [PROJECT_INDEX.md](../PROJECT_INDEX.md), then [CURRENT_STATE.md](../CURRENT_STATE.md).
2. Follow the PROJECT_ATLAS protocol above (read Atlas before work; never rely on chat history).
3. Read DATA_DICTIONARY + PILOT_IMPORT materials + Deployment SP list status.

## How to safely hand off work

1. Update PROJECT_ATLAS **before ending** (protocol §2).
2. If a sprint completed this session, update the five files in protocol §5 (CURRENT_STATE, ROADMAP, DEPLOYMENT_STATUS, CHANGELOG, NEXT_ACTIONS).
3. Cite row counts/evidence; state env touched; never leave Prod half-imported without Master PM alert.

