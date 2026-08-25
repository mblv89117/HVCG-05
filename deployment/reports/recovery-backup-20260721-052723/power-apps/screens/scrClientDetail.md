# Screen: Client Detail (scrClientDetail)

## Context

`varSelectedClient` set from galClients.

## Header

Title, DBA, Stage, Health badge, Risk (internal), Relationship owner, PM.

Buttons: Open SharePoint library, Open Teams, Activate/Onboard (confirm), Flag for executive.

## Snapshot row

- Open tasks count  
- Missing docs count  
- Next meeting  
- Retainer payment status (finance viewers only)  
- Days since last meaningful contact  

## Tabs (TabList or buttons)

1. **Projects** — Filter HVCG_Projects by ClientId  
2. **Document requests** — status chips  
3. **Deliverables**  
4. **Meetings**  
5. **Registers** — nested: Decisions / Risks / Issues / Changes  
6. **Finance** — visible if nfIsFinanceViewer  
7. **Timeline** — colClientTimeline  

## Forms

Edit form for non-sensitive fields for Ops; fee fields unlocked only for finance viewers.
