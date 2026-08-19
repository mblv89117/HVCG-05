# QA Known Issues

**Owner:** integration  
**As of:** 2026-07-15 15:38 PT

1. CRM live E2E FAILED (9 failures) — opportunity/activity writes/lookups; canvas missing (D-002).  
2. MAIN working tree mixes agent-comms and CRM solution WIP (dirty≈399).  
3. Ops tip retains locked shared-index deltas despite exclusive packaging policy.  
4. Root `PROJECT_STATUS.md` on Executive and Portal worktrees still shows CRM Maker OA text.  
5. `pytest` unavailable in default python — modules use direct `python3` runners (documented).  
6. Owner decision D-002 still required for canvas. D-001 may be mitigated (oauthConnectionsBound=4) — Master should confirm decision register.  
7. No RELEASE CANDIDATE until CRM park/PASS + HIGH defects closed + D-003.
