# Microsoft Copilot Readiness — HVCG OS

## Goal

Enable Microsoft 365 Copilot (and later Copilot Studio agents) to answer questions about clients, projects, meetings, capital raises, documents, SOPs, and deliverables **without redesigning** the data model.

## Grounding strategy

| Content | Location | Copilot field / practice |
|---------|----------|--------------------------|
| Client narrative | `HVCG_Clients.CopilotSummary` | Keep updated at onboarding + QBR |
| Keywords | `CopilotKeywords` on Clients, Projects, Deliverables, SOPs, Policies, CapitalOpportunities, Templates, Playbooks, Scripts | Comma-separated business terms |
| Files | Client libraries + Knowledge | Sensitivity labels; meaningful file names; folder 00–23 taxonomy |
| Meetings | Meeting notes library + `HVCG_Meetings` | Title includes ClientCode; link notes file |
| Capital | CapitalOpportunities + packages in 16/17 | Status + amount in Title where practical |
| SOPs | Knowledge + `HVCG_SOPs` | Audience + keywords |

## SharePoint content types (provision metadata)

Defined in `src/sharepoint/content-types/HVCG_CopilotContentTypes.json`:

- HVCG_ClientDocument (existing pattern + CopilotKeywords)
- HVCG_KnowledgeArticle (SOP/Policy/Playbook)
- HVCG_DeliverableDocument
- HVCG_CapitalPackageDocument

## Naming conventions for retrieval

- Libraries: `HVCG_{ClientCode}`
- Deliverable files: `{ClientCode}_{DeliverableType}_{Version}_{yyyyMMdd}`
- Meeting notes: `{ClientCode}_Meeting_{yyyyMMdd}_{Topic}`

## Security for Copilot

- Copilot respects user permissions — client isolation via library ACLs remains critical.
- Never put Restricted financial content in all-staff Knowledge without labels.
- AI-generated drafts stay in `HVCG_AI_*` lists (not client libraries) until approved.

## Sample prompts (post-deploy)

- “Which active clients are Red health and why?”  
- “Summarize capital opportunities expected to close this quarter.”  
- “What SOPs relate to document collection?”  
- “What is outstanding on invoice milestones past due?”  

## Admin checklist

1. Enable Microsoft Graph connectors / SharePoint grounding per Microsoft guidance for the tenant  
2. Ensure site membership matches least privilege  
3. Populate CopilotSummary for top 10 clients first  
4. Review Purview DLP before broad Copilot rollout
