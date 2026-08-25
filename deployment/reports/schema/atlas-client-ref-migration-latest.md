# AtlasClientRef migration (live)
- Generated: 2026-07-22T01:08:19.4235250Z
- Clients list: f60a7d4e-74d9-4b57-8c98-1a7b75d76104
- Field: InternalName=AtlasClientRef DisplayName=Client
- Legacy ClientId: preserved (not deleted)

## Write/read proof (REST AtlasClientRefId)
- HVCG_Projects: ok=True AtlasClientRefId=1
- HVCG_Tasks: ok=True AtlasClientRefId=1
- HVCG_Deliverables: ok=True AtlasClientRefId=1
- HVCG_Decisions: ok=True AtlasClientRefId=1
- HVCG_DocumentRequests: ok=True AtlasClientRefId=1

## Migration
- HVCG_Projects: migrated=4 skipped=0 exceptions=0
- HVCG_Tasks: migrated=0 skipped=0 exceptions=0
- HVCG_Deliverables: migrated=2 skipped=0 exceptions=0
- HVCG_Decisions: migrated=1 skipped=0 exceptions=0
- HVCG_DocumentRequests: migrated=0 skipped=0 exceptions=0

## Actions
- HVCG_Projects created AtlasClientRef -> f60a7d4e-74d9-4b57-8c98-1a7b75d76104
- HVCG_Tasks created AtlasClientRef -> f60a7d4e-74d9-4b57-8c98-1a7b75d76104
- HVCG_Deliverables created AtlasClientRef -> f60a7d4e-74d9-4b57-8c98-1a7b75d76104
- HVCG_Decisions created AtlasClientRef -> f60a7d4e-74d9-4b57-8c98-1a7b75d76104
- HVCG_DocumentRequests created AtlasClientRef -> f60a7d4e-74d9-4b57-8c98-1a7b75d76104
- HVCG_Projects migration migrated=4 skipped=0 exceptions=0
- HVCG_Tasks migration migrated=0 skipped=0 exceptions=0
- HVCG_Deliverables migration migrated=2 skipped=0 exceptions=0
- HVCG_Decisions migration migrated=1 skipped=0 exceptions=0
- HVCG_DocumentRequests migration migrated=0 skipped=0 exceptions=0

## Exceptions

## Proven live property names
- REST / SharePoint connector write/read: **AtlasClientRefId**
- Microsoft Graph item fields: **AtlasClientRefLookupId**
- PnP Values key: **AtlasClientRef**
- Legacy **ClientId** preserved (not deleted)

## Graph reread evidence (post-migrate)
- HVCG_Projects item 16: AtlasClientRefLookupId=1 ClientCode=ACCG01
- HVCG_Deliverables item 1: AtlasClientRefLookupId=1 ClientCode=ACCG01

## Legacy ClientId hide
- Pending PnP (Graph column PATCH 403) so connector GetItem/PostItem stop failing on malformed ClientId projection.
