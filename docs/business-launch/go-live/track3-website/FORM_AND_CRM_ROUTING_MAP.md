# FORM_AND_CRM_ROUTING_MAP

| Form | Staging now | Dev target | Prod target | Notify |
|------|-------------|------------|-------------|--------|
| EVA | localStorage + **CRM-ready JSON** (`eva.html` + `EVA_CRM_PAYLOAD_SCHEMA`) | `HVCG_EvaFormCreateLead` (HTTP/Forms → `HVCG_Leads` Dev) — see `funnel/EVA_DEV_FORMS_CRM_RUNBOOK.md` | Same lists in Prod only after explicit owner gate | Internal only (`hvcg_EnableClientEmails=false`) |
| Contact | localStorage | Form → HVCG_Leads Source=Website-Contact | Prod later | Internal |
| Book appointment | localStorage | Form/Bookings → Activity + Lead | Prod later | Internal calendar — no auto client email |
| Capital Readiness | page only | Form → Lead + score | Prod later | Internal |

**Lead scoring:** `sales/score_eva_json.py`  
**Pricing ranges:** PRICING_REGISTER Section B · `owner_approval_required`  
**Legacy guard:** never HVCG-price HVS clients
