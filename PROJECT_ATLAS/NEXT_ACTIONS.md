# NEXT_ACTIONS

**As of:** 2026-07-19 (Master PM program audit)  
**Ordered for Master PM / owner prioritization.** Do not execute gated items without approval.

## Now (program critical path)

1. Keep Track 1 **frozen**.  
2. Treat Elite **RC1** Release pack as sole product release SoR:  
   `.worktrees/atlas-integration-release/PROJECT_ATLAS/Release/`  
3. **Freeze** `cursor/atlas-integration-release` to stabilization / defect fixes only.  
4. Assign **QA** to rebase onto RC1 and issue written Local UAT GO/NO-GO.  
5. Assign **Documentation** to point status readers at RC1 + [CURRENT_STATE.md](CURRENT_STATE.md); stop treating root Maker OA `PROJECT_STATUS.md` as live program status.  
6. Stop `track10` feature divergence from recovery/RC1 line.  
7. Hold **QBO merge** until written QA ACK; tip remains `c892215` on `cursor/quickbooks-integration`.

## Owner decisions

1. Walk RC1 Local UAT at http://127.0.0.1:5180/ (nav, pending financials, Accounting BLOCKED).  
2. Provide Plaid Sandbox + encryption secrets via `.secrets` / Key Vault — **never paste into chat**.  
3. Provide / register Entra SPA client ID.  
4. Accept or reject RC1 shell for continued stabilization.  
5. QBO: merge-after-QA vs defer past RC1.  
6. Confirm Track 1 freeze stands.  
7. BL-C1 / DNS / pilot / canvas — remain closed unless explicitly opened.

## Next engineering candidates (gated)

| Action | Track | Gate |
|--------|-------|------|
| Full QA written GO on RC1 | QA / Release | Assignment |
| Plaid Sandbox E2E | Banking | Owner secrets |
| Security Sandbox re-review | Security | After Plaid E2E |
| QBO tip merge into integration | Accounting | QA ACK + Master PM |
| Dev SWA redeploy + DEF-ELITE retest | Elite | QA |
| Staging KV prep | Azure | Infra only |
| Portal / Finance Ops / Ops / AI schema merge queue | Multi | Post Owner UAT acceptance |
| Revenue Sprint 5 | Track 2 | Owner assignment |
| Soft UAT conversion CTA | Track 2 | Human QA |
| Hosted private website preview | Track 3 | Owner (not public DNS) |
| Next Prod flow activation | Track 1/7 | New owner approval |
| Pilot import | Track 2 data | Owner |
| Canvas publish | CRM | D-002 |
| Public DNS | Track 3 | BL-PUBLISH-1 |
| Portal invites | Track 4 | BL-C1 |

## Explicit non-actions

- Do not prepare Production  
- Do not add features on Elite RC1 branch  
- Do not merge QBO before QA ACK  
- Do not treat Jul 15 QA dashboard or Master PM `b75b19b` tip as current release authority  
- Do not push unless the human asks  
