# Client field forensics (live, read-only)

- **Generated:** 2026-07-22T00:48:39.010116+00:00
- **Method:** Graph read-only + prior PnP SchemaXml capture; SPO REST via az = 401
- **Decision:** **Case B** — Existing ClientId field malformed / inconsistently exposed — replace with AtlasClientRef

## Auth paths
- Microsoft Graph: success (az token)
- SharePoint REST via az: **401 invalid_request** (audiences with/without trailing slash) — not usable without additional consent/MFA
- PnP DeviceLogin: **not used** (owner ordered MFA loop stop)
- Prior PnP SchemaXml (same day, before kill): incorporated as evidence

## HVCG_Clients target list
- **List GUID:** `f60a7d4e-74d9-4b57-8c98-1a7b75d76104`
- **Web URL:** https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter/Lists/HVCG_Clients
- **Created:** 2026-07-21T05:54:08Z
- **Same web as Projects/Tasks/etc.:** yes (Command Center)
- **Title field Graph name:** `Title`

## Per-list Client* fields
### HVCG_Projects
- List GUID: `05e972c6-d724-4221-a61b-251c4fc8122d`
- AtlasClientRef exists: **False**
- Graph items expose ClientId/ClientIdLookupId: **False**
- Sample item field keys include ClientCode only for client identity in most samples
- **ClientCode** (display `ClientCode`)
  - Graph column id: `b3db3c7e-da48-4ab5-8741-c674bdb95182`
  - Type: text
- **ClientId** (display `ClientId`)
  - Graph column id: `ae60dbdf-00c7-4bcd-bb42-06c3b90bbcd7`
  - Type: lookup
  - Lookup listId: `f60a7d4e-74d9-4b57-8c98-1a7b75d76104` ShowField/columnName: `Title` multi=False
  - SchemaXml Name/StaticName: `ClientId` / `ClientId`
  - SchemaXml Field ID: `{01bfb3e6-92cf-4ede-bb23-49fd695cf70d}`
  - SchemaXml List/ShowField: `{f60a7d4e-74d9-4b57-8c98-1a7b75d76104}` / `Title` ColName=`int1`
  - Graph id matches SchemaXml ID: **False**

### HVCG_Tasks
- List GUID: `6cfc50e6-3ea2-43fd-a053-09091a4f4e4c`
- AtlasClientRef exists: **False**
- Graph items expose ClientId/ClientIdLookupId: **False**
- Sample item field keys include ClientCode only for client identity in most samples
- **ClientCode** (display `ClientCode`)
  - Graph column id: `b7e0ca4c-88a8-4e1d-ba20-3125c4a7d272`
  - Type: text
- **ClientId** (display `ClientId`)
  - Graph column id: `008a2479-69ea-419a-b489-91cf2b97f627`
  - Type: lookup
  - Lookup listId: `f60a7d4e-74d9-4b57-8c98-1a7b75d76104` ShowField/columnName: `Title` multi=False
  - SchemaXml Name/StaticName: `ClientId` / `ClientId`
  - SchemaXml Field ID: `{35941598-a2f8-4f41-a525-553ab16456ae}`
  - SchemaXml List/ShowField: `{f60a7d4e-74d9-4b57-8c98-1a7b75d76104}` / `Title` ColName=`int1`
  - Graph id matches SchemaXml ID: **False**

### HVCG_Deliverables
- List GUID: `9b9555d4-589b-4fea-b7e5-f1da24b224d9`
- AtlasClientRef exists: **False**
- Graph items expose ClientId/ClientIdLookupId: **False**
- Sample item field keys include ClientCode only for client identity in most samples
- **ClientCode** (display `ClientCode`)
  - Graph column id: `3f70caf7-f779-484a-8a1e-3acce4331385`
  - Type: text
- **ClientApprovalStatus** (display `ClientApprovalStatus`)
  - Graph column id: `513cf63b-19b7-4df1-982f-34f398f47e14`
  - Type: choice
- **ClientId** (display `ClientId`)
  - Graph column id: `6dfd0a93-a60d-46c0-9b06-b50879d79b59`
  - Type: lookup
  - Lookup listId: `f60a7d4e-74d9-4b57-8c98-1a7b75d76104` ShowField/columnName: `Title` multi=False
  - SchemaXml Name/StaticName: `ClientId` / `ClientId`
  - SchemaXml Field ID: `{1d2c6db5-e7c8-414f-9e10-4b7a357307ac}`
  - SchemaXml List/ShowField: `{f60a7d4e-74d9-4b57-8c98-1a7b75d76104}` / `Title` ColName=`int1`
  - Graph id matches SchemaXml ID: **False**

### HVCG_Decisions
- List GUID: `94bf4c6d-339c-4578-9094-7247d346e993`
- AtlasClientRef exists: **False**
- Graph items expose ClientId/ClientIdLookupId: **False**
- Sample item field keys include ClientCode only for client identity in most samples
- **ClientCode** (display `ClientCode`)
  - Graph column id: `a66e0578-fea0-4e69-988f-9ebedc967e7a`
  - Type: text
- **ClientImpact** (display `ClientImpact`)
  - Graph column id: `60c3757c-ab5c-414e-8348-a986d90a9e24`
  - Type: text
- **ClientId** (display `ClientId`)
  - Graph column id: `da298a2e-6409-41ff-9b63-f16259e4d5ac`
  - Type: lookup
  - Lookup listId: `f60a7d4e-74d9-4b57-8c98-1a7b75d76104` ShowField/columnName: `Title` multi=False
  - SchemaXml Name/StaticName: `ClientId` / `ClientId`
  - SchemaXml Field ID: `{f6f21b12-500d-45af-a55a-67f74e800d7f}`
  - SchemaXml List/ShowField: `{f60a7d4e-74d9-4b57-8c98-1a7b75d76104}` / `Title` ColName=`int1`
  - Graph id matches SchemaXml ID: **False**

### HVCG_DocumentRequests
- List GUID: `89a421e9-3086-47ef-80c3-214500d3d92c`
- AtlasClientRef exists: **False**
- Graph items expose ClientId/ClientIdLookupId: **False**
- Sample item field keys include ClientCode only for client identity in most samples
- **ClientCode** (display `ClientCode`)
  - Graph column id: `dacd62a8-2ba3-470a-b18a-5f46c80b76f5`
  - Type: text
- **ResponsibleClientContactEmail** (display `ResponsibleClientContactEmail`)
  - Graph column id: `54170b4f-57b6-4c1d-a03f-e342865f31d7`
  - Type: text
- **ClientId** (display `ClientId`)
  - Graph column id: `5de34824-3d34-48a2-9202-56a4486aea30`
  - Type: lookup
  - Lookup listId: `f60a7d4e-74d9-4b57-8c98-1a7b75d76104` ShowField/columnName: `Title` multi=False
  - SchemaXml Name/StaticName: `ClientId` / `ClientId`
  - SchemaXml Field ID: `{df809347-9b17-44ef-873b-652aa43783e0}`
  - SchemaXml List/ShowField: `{f60a7d4e-74d9-4b57-8c98-1a7b75d76104}` / `Title` ColName=`int1`
  - Graph id matches SchemaXml ID: **False**

## Connector / API evidence (live failures)
- **Create_Project_PostItem:** The passed-in field "ClientIdId" could not be found
- **Create_Decision_PostItem:** The passed-in field "ClientIdId" could not be found
- **Get_Deliverable_GetItem:** The field or property 'ClientId' does not exist.
- **Graph_write_ClientIdLookupId:** HTTP 201 but reread ClientIdLookupId=null (silent drop)

## Case A vs Case B
Case A (retain ClientId) requires REST/connector/Graph item exposure all healthy. **Not met.**
- Graph list items do not expose ClientId or ClientIdLookupId on any of the five lists despite columnDefinition.lookup metadata.
- SharePoint connector PostItem rejects ClientIdId ("could not be found").
- SharePoint connector GetItem rejects property ClientId on Deliverables.
- Graph writes using ClientIdLookupId return 201 but value does not persist on reread.
- Prior PnP session: item-level REST $select=ClientIdId failed with "ClientIdId does not exist" even though SchemaXml Type=Lookup.
- Graph column GUID for Projects ClientId differs from SchemaXml ID captured earlier the same day (field churn / recreate history under same InternalName).

## Recommended remediation (Case B)
- Create lookup **InternalName=`AtlasClientRef`** DisplayName=`Client`
- Target list `f60a7d4e-74d9-4b57-8c98-1a7b75d76104` ShowField `Title`
- Prefer Graph column create with existing az Graph token (no MFA)
- Do not delete legacy ClientId this release

