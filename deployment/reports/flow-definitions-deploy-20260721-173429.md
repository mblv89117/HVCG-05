# HVCG Flow Definition Dataverse Deploy

- **When:** 2026-07-22T00:32:37.580615+00:00
- **Dataverse:** https://orgee2f7545.crm.dynamics.com
- **Method:** python-raw-json
- **Success:** False

## Flows
- **HVCG_CreateClientWorkspace** patched=True reactivated=True matchAfter=True
- **HVCG_CreateProjectFromTemplate** patched=True reactivated=True matchAfter=True
- **HVCG_CreateDocumentRequests** patched=True reactivated=True matchAfter=True
- **HVCG_DeliverableApproval** patched=False reactivated=False matchAfter=False error=patch failed 400: {"error":{"code":"0x80060467","message":"Flow client error returned with status code \"BadRequest\" and details \"{\"error\":{\"code\":\"InvalidOpenApiFlow\",\"message\":\"Flow save failed with code 'OpenApiOperationParameterValidationFailed' and message 'Input parameter 'item' validation failed in workflow operation 'Patch_Deliverable_Approved': The API operation 'PatchItem' is missing required property 'item/Title'.'.\"}}\"."}}
- **HVCG_ExecutiveDecisionEscalation** patched=True reactivated=True matchAfter=True

## Errors
- HVCG_DeliverableApproval: patch failed 400: {"error":{"code":"0x80060467","message":"Flow client error returned with status code \"BadRequest\" and details \"{\"error\":{\"code\":\"InvalidOpenApiFlow\",\"message\":\"Flow save failed with code 'OpenApiOperationParameterValidationFailed' and message 'Input parameter 'item' validation failed in workflow operation 'Patch_Deliverable_Approved': The API operation 'PatchItem' is missing required property 'item/Title'.'.\"}}\"."}}
