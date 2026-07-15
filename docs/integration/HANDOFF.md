# Integration / Release — Handoff note

**Role:** `integration`  
**Branch / worktree:** `agent/crm-integration` @ `.worktrees/crm-integration`  
**Bus root:** main checkout `.agent-comms/` (`HVCG_REPO_ROOT`)  
**As of:** 2026-07-15

## Current stance

- **NO MERGES, NO DEPLOYS, NO PROD** until owner **D-003**.
- Opportunity CRM six-worker integration on this branch remains **repo-complete** (`8635397`); live Maker OA/smoke is CRM-owned — do not interrupt.
- Soft ownership among `docs/crm/`: **`PARALLEL_AGENT_MAP.md` only** — do not rewrite acceptance during live smoke.

## Deliverables this cycle

| Artifact | Path |
|----------|------|
| Executive merge packet (draft) | `docs/integration/MERGE_PACKET_EXECUTIVE.md` |
| Agent Comms merge packet (draft) | `docs/integration/MERGE_PACKET_AGENT_COMMS.md` |
| Client Portal merge packet (draft) | `docs/integration/MERGE_PACKET_CLIENT_PORTAL.md` |
| This handoff | `docs/integration/HANDOFF.md` |

## READY queue (hold)

- Executive `8c3f7d8` — READY FOR INTEGRATION → packet `MERGE-EXEC-001` drafted; **hold**.
- Agent Comms `2c064b3` — READY but **MAIN CRM-contaminated** → packet `MERGE-COMMS-001` drafted; **hold** until segregation.
- Client Portal `6998a7f` — READY FOR INTEGRATION → packet `MERGE-PORTAL-001` drafted; **hold**.

## Next

1. Wait for Master PM / owner D-003 on a specific packet.
2. Prefer landing clean Agent Comms before Executive exclusive merge + shared appends.
3. Keep heartbeat IN_PROGRESS while drafting/holding; escalate only DECISION types for owner gates.
