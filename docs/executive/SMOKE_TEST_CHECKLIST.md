# Executive Command Center — Smoke Test Checklist (Dev)

**Environment:** HVCG Development / Command Center Dev site only  
**Production:** Do not run

## Offline (agent / CI)

- [ ] `python3 tests/executive/test_executive_command_center.py` → PASS  
- [ ] No diffs under `deployment/**` engines from this branch  
- [ ] No diffs to CRM flow files `HVCG_Lead*`, `HVCG_Opportunity*`, `HVCG_Capital*`

## Dev Maker (owner)

- [ ] Append executive NamedFormulas (or confirm parent merge)  
- [ ] Rebuild `scrHomeExec` per build guide  
- [ ] Sign in as Owner → land on Executive home  
- [ ] Sign in as ProjectManager → redirected / cannot see finance tiles  
- [ ] Seed / demo HVD01 attention appears on Queue  
- [ ] KPI tiles render without invented numbers  
- [ ] Power BI CEO app pages open (if published)  
- [ ] Weekly brief flow remains **Off**

## Escalation hygiene

- [ ] Setting RequiresExecutiveAttention on a Decision with EscalationReason from config rules succeeds  
- [ ] Routine task overdue does **not** appear on Executive home
