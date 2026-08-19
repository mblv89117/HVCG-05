# HVCG Deployment Manager

**Sprint:** Deployment Manager Sprint 1 Phase 1  
**Mode:** Mock data only · **No live deployments**  
**App:** `apps/hvcg-deployment-manager/`

## Scripts

```bash
cd apps/hvcg-deployment-manager
npm install --cache .npm-cache
npm run dev          # local Vite
npm run build
npm run test
npm run qa           # Playwright against preview :4181
npm run qa:all
```

## Modules

Release Dashboard · Queue · Promotion · Approvals · Evidence · Rollback · Environments · Calendar · Incidents · Audit · Release Detail

## Guardrails

- No Production credentials
- No deployment automation
- Track 1 remains frozen
- Role switcher is a QA control, not auth
