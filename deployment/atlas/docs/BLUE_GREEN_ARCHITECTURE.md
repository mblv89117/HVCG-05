# Blue/Green Architecture — Project Atlas

## Intent

Support zero-downtime (or low-risk) promotion for Staging rehearsals and future Production, without executing swaps in this delivery.

## Model

```text
        ┌────────────┐
 traffic│            │
 ───────►   BLUE     │  active slot
        │  (stable)  │
        └────────────┘
        ┌────────────┐
 deploy │   GREEN    │  idle / candidate
 ───────► (new pkg)  │
        └────────────┘
              │
         swap after validation
```

## Atlas mapping

| Environment | Blue/Green |
|-------------|------------|
| development | Single slot (no BG) |
| testing | Single slot |
| staging | BG enabled in definition (`slot: blue`) |
| production | Architectural intent only; Atlas will not swap |

## Swap checklist (future)

1. Deploy candidate to idle slot  
2. Preflight + health + smoke on idle slot  
3. Feature flags verify gates  
4. Flip traffic / solution pointer  
5. Keep prior slot for fast rollback  
6. Log swap in deployment logs + release notes  

## This delivery

Documentation + staging definition only. **No swap. No Prod connection.**
