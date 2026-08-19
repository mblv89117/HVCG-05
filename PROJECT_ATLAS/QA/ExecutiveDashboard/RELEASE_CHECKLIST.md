# Release checklist — Elite OS Executive Dashboard

## Pre-release

- [ ] Build green on release commit
- [ ] SWA Dev redeployed; asset hash recorded
- [ ] DEF-ELITE-001 closed (no fabricated $)
- [ ] DEF-ELITE-002 closed (no Soon placeholders on ship nav)
- [ ] DEF-ELITE-003 closed (deploy = source)
- [ ] DEF-ELITE-004/009 role smoke started
- [ ] AC table ≥ all must-pass items green
- [ ] Rollback doc reviewed; prior revision ID noted
- [ ] Known limitations published in release notes
- [ ] Owner UAT scheduled on Dev only

## Deploy validation

- [ ] `scripts/deploy-swa-dev.sh` (or SWA CLI) completed
- [ ] Entra redirect URI includes SWA URL
- [ ] Dataverse CORS includes SWA + localhost
- [ ] Env banner shows Development/UAT
- [ ] `VITE_BLOCK_LIVE_CLIENT_COMMS=true`

## Go / No-Go

- **Prod:** NO until Owner gate + zero S0/S1 security/RBAC  
- **Dev Owner demo:** NO until 001–003 closed  
- **Internal engineering preview:** YES with limitations banner
