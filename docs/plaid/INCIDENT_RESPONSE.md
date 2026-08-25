# Plaid Incident Response

## Severity

| Class | Examples |
|-------|----------|
| S0 | Access token leaked; cross-tenant data exposure |
| S1 | Unauthorized API access; webhook forgery |
| S2 | Sync outage; Link failures |

## Immediate actions (S0/S1)

1. Disable Connect Bank in portal (feature flag / remove route if needed).  
2. Rotate Plaid secret + encryption key if exposure confirmed.  
3. Call `item/remove` for affected Items where possible.  
4. Mark connections `Disconnected` / `Error`.  
5. Preserve audit logs.  
6. Notify Master PM + Security + Owner.  

## Investigation checklist

- [ ] Confirm whether secrets appeared in logs/browser/git  
- [ ] Confirm tenant isolation held  
- [ ] Identify affected `clientId`s  
- [ ] Review webhook event digests  

## Communication

Do not include account numbers, tokens, or secrets in tickets or status updates.
