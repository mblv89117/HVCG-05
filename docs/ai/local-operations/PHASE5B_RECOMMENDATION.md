# Phase 5B Recommendation (Revised after Phase 5A live acceptance)

**Do not begin Phase 5B without separate authorization.**

After Phase 5A live acceptance:

1. Keep Production `EvaIntakeEnabled=false` until an explicit Production EVA gate is authorized.  
2. Optional next step (only if authorized): connect a **non-Production staging** website form to the governed local intake — never a public Production endpoint in the same change.  
3. Improve Deep latency (model quantization / hardware) before expecting interactive Production SLAs.  
4. Owner UAT of live Manny packages and UAT checklist PASS rates.  
5. Keep writes / external messages / client emails **Off** unless separately authorized.

Phase 5B must not: enable Production EVA · send client email · activate clients · write SharePoint/Dataverse · merge this PR into Production without a dedicated release decision.
