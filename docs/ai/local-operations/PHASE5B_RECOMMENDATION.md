# Phase 5B Recommendation

**Do not begin Phase 5B without separate authorization.**

Recommended Phase 5B (only after owner approval):

1. Controlled connection of a **non-Production** staging website form to the governed intake (still not Production EVA).  
2. Keep `EvaIntakeEnabled=false` for Production until an explicit Production EVA gate is authorized.  
3. Expand matching against optional local CRM mirrors (still no authoritative writes).  
4. Owner UAT on Manny queue quality and time-protection accuracy.  
5. Keep writes / external messages / client emails **Off** unless separately authorized.

Phase 5B must not: enable Production EVA · send client email · activate clients · write SharePoint/Dataverse · merge this PR into Production without a dedicated release decision.
