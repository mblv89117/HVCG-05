# Flow functional tests
- Generated: 2026-07-22T02:55:38.645585+00:00
- Fixes: InternalOwnerEmail + ApproverEmail manny@

- **HVCG_CreateClientWorkspace**: Succeeded (`08584169216163361325081182434CU17`)
- **HVCG_CreateProjectFromTemplate**: Succeeded (`08584169215579444431226385183CU03`)
- **HVCG_CreateDocumentRequests**: Succeeded (`08584169214701205183293146817CU19`)
- **HVCG_DeliverableApproval**: Succeeded (`08584169181821856627151136758CU11`)
  - lifecycle Approve → SP DeliverableStatus=`Approved` InternalReviewStatus=`Approved`
- **HVCG_ExecutiveDecisionEscalation**: Succeeded (`08584169219702596907179209949CU10`)

- absoluteGo flows: True
- absoluteGo DeliverableApproval lifecycle: True
- notes: DeliverableApproval real lifecycle Succeeded with Approve + SP Approved. Other four flows previously Succeeded. Button triggers restored after Http test.
