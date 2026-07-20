# Approval request

**Channel:** Teams / Approvals

**Subject:** Approval needed — {{ItemTitle}}

**Gate ID:** {{GateId}}  
**Environment:** {{Environment}}  
**Requester:** {{RequesterName}}  
**Impact:** {{ImpactSummary}}

Please **Approve**, **Reject**, or **Hold-test-only**.

Record decision in `HVCG_Approvals` / `HVCG_AIApprovals` with timestamp and approver UPN.

---
**Control:** No outbound client message until gate Approved. Production channel IDs require Owner sign-off per `docs/crm/TEAMS_NOTIFICATION_SPEC.md`.
