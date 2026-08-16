# NEXT_ACTIONS

**As of:** 2026-08-14 21:25 UTC  
**Ordered for owner / next engineer. Do not execute gated items without approval.**  
**Owner guide:** [HVCG_OWNER_OPERATING_GUIDE.md](HVCG_OWNER_OPERATING_GUIDE.md)

Architecture audit is finished. Do not restart it. Owner may conduct normal client operations.

## Now

0. AI sessions doing seven-system certification: read `/Volumes/MacMiniPro2TB/HVCG_SYSTEM_CERTIFICATION/STATUS.md` first ([pointer](SYSTEM_CERTIFICATION_HARNESS.md)). Do not restart the architecture audit. Do not start Gate 12. Do not promote `main`.
1. Owner: sign in at production Elite, hard-refresh, confirm Command Center / My Work / Portfolio / Projects load SharePoint `HVCG_*` data.
2. Keep `origin/main` at `b641fdd784b9d9cc50b85f2e5548526da4f28a02` until a separately authorized promotion.
3. Keep client entitlements **Manny-only** on the seven `HVCG-Client-*` groups.
4. Leave Client 360 mapping fail-closed. Do not invent mappings.
5. Website lead ingest is **COMPLETE AND VERIFIED** — do not rebuild it.

## Next (not started)

| Action | Gate | Notes |
|--------|------|-------|
| Gate 12 — controlled worktree/workspace retirement and final architecture closeout | **NOT STARTED** | Do not prune, archive systems, delete branches, or remove preservation from this file |
| Execute duplicate-infra retirement path | Gate 12 | Path exists; execution is later |

## Post-audit (not core-audit work)

| Action | Gate |
|--------|------|
| Client 360 trusted mapping | Post-audit feature |
| Commercial product launches | Separate programs |
| Anyone other than Manny on client groups | Explicit owner roster |
| Dynamics / Dataverse | Future business case only |

## Explicit non-actions

- Do not start Gate 12 until assigned
- Do not launch commercial products as part of architecture-audit completion
- Do not promote `integration/atlas-canonical` to `main`
- Do not change `origin/main` contents
- Do not force push / rewrite history
- Do not initiate Dynamics/Dataverse
- Do not add users other than Manny to `HVCG-Client-*` groups
- Do not weaken BA/Hub auth
- Do not deploy production merely to test governance

## Owner decisions already made (do not re-ask)

See [DECISIONS.md](DECISIONS.md) and [Decisions/2026-08-14-GATE11-OWNER-DECISIONS.md](Decisions/2026-08-14-GATE11-OWNER-DECISIONS.md).
