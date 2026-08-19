# Release notes (DRAFT) — Atlas Elite OS Executive Dashboard

**Version:** elite-os-dev-uat (candidate)  
**Date:** 2026-07-20  
**Environment:** HVCG Development SWA only  
**Recommendation:** **DO NOT RELEASE** / **CHANGES REQUESTED**

## Intended scope (Sprint 14)

- Executive Home with pending-safe KPIs  
- Module pages: Financials, Revenue, Clients, Projects, Tasks, Capital, EV, Documents, AI, Admin  
- HVCG + Colorado Craft Beef workspaces  
- MSAL + Dataverse adapters on Dev  

## What is live on SWA Dev today

- Shell loads; Entra Sign-in entry points  
- Home with sample fallback, approvals list, AI stubs  
- Admin link to model-driven Dev app  
- **Still shipping Soon placeholders and sample finance dollars**

## Known limitations

- Not production  
- Unsigned users see Development sample data including fabricated $ amounts (defect)  
- Most Operate modules gated/placeholder on live deploy  
- SPA role matrix not enforced  
- Sprint 14 source currently fails TypeScript build  
- Owner interactive UAT incomplete  

## Security

- No secrets found in deployed bundle HTML/JS scan  
- Live client communications blocked by env banner policy  

## Rollback

Revert SWA deployment revision; Dataverse admin SoR remains.
