# Production SharePoint Sites Plan

**Owner:** deployment-engineer (GL-0)  
**Security context:** Power Platform Prod SG = None (unrelated to SP permissions)

## Target sites (create)

| Purpose | Site name | URL | Template |
|---------|-----------|-----|----------|
| Command Center | HVCG-CommandCenter | https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter | Team site |
| Clients Hub | HVCG-Clients | https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients | Team site |
| Knowledge | HVCG-Knowledge | https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Knowledge | Team site |

## Forbidden

- Do not reuse `*-Dev` URLs in Prod deployment settings
- Do not put client PII on Knowledge without policy

## Status

| Site | Status |
|------|--------|
| HVCG-CommandCenter | NOT FOUND (404) — CREATE |
| HVCG-Clients | NOT FOUND (404) — CREATE |
| HVCG-Knowledge | NOT FOUND (404) — CREATE |
