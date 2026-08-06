# Local EVA Sandbox Policy (Phase 5A)

## Visibility

Every surface must display:

- LOCAL EVA SANDBOX  
- SYNTHETIC TEST DATA ONLY  
- NO PRODUCTION RECORDS  
- NO EMAILS  
- NO CLIENT ACTIVATION  
- TEST — DO NOT CONTACT  
- TEST — SYNTHETIC EVA  

## Access

- Elite OS route `/ai-operations/eva` — local development host only  
- Authenticated Hub principal required (same as other Local AI routes)  
- Intake rejects Production / Azure Static Apps / public marketing origins  

## Allowed actions

- Create synthetic EVA submissions  
- Run local AI draft review  
- Record local Manny decisions  

## Forbidden actions

- Enable `EvaIntakeEnabled`  
- Send email or external messages  
- Create Production leads / clients  
- Connect live HVCG website forms  
- Write SharePoint / Dataverse / OneDrive / Outlook / Power Automate  

Sandbox proceeds under `LocalAIEnabled` only while `EvaIntakeEnabled` stays **false**.
