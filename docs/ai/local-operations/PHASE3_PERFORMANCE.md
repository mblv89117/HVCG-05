# Phase 3 Performance Metrics

## Dashboard fields

- average duration by operation / by model  
- failure rate · validation-failure rate  
- redaction-review time · Manny-review time  
- estimated Manny time saved  
- queue wait time  
- fallback usage · cancelled jobs · timeout count  

## Flags

- routine jobs over 30s  
- deep-analysis jobs over 180s  
- repeated retries  
- models with frequent schema failures  

API: `GET /api/local-ai/performance`  
Code: `packages/atlas-integration-core/src/local-ai/performanceMetrics.ts`  
Elite: AI Operations Queue → Performance card
