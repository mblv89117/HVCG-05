# QA Handoff — Colorado Craft Beef Client Workspace

**Branch:** `cursor/client-portal-sprint1`  
**Worktree:** `.worktrees/client-portal-sprint1`  
**Scope:** Product UI + mock integrations for reusable client workspace + CCB seed  
**Commit instruction:** Awaiting owner/QA authorization (do not self-approve)

## What shipped (local)

- Reusable workspace template (`workspaceTemplate.ts`)
- Colorado Craft Beef verified seed (`coloradoCraftBeef.ts`)
- Full client experience routes (home → notifications)
- Secure data room with 13 required categories
- Role switcher: ClientContact / ClientContributor / Advisor / Admin
- Upload + document-request mock workflows
- Activity history + in-app notification behavior (email/SMS disabled)
- User documentation: `CCB_WORKSPACE_GUIDE.md`

## Automated QA

```bash
cd apps/hvcg-client-portal && npm run qa:all
```

Expect:

- TypeScript + Vite production build
- Vitest role / isolation / CCB fact tests
- Smoke route inventory
- Permissions (fee hiding, no secrets, anonymous sharing statement, CCB verified referral)
- Navigation contract
- Responsive CSS checks

## Manual QA focus

1. Default workspace is Colorado Craft Beef.
2. Executive summary shows Randy Kamin / Generational Group, HVS → HVCG, growth capital + real estate, non-dilutive + agricultural themes, Blueprint stage.
3. No dollar amounts on KPIs, funding target/committed, or enterprise value.
4. Data room lists all 13 categories; internal strategy draft hidden for client roles; visible for Advisor.
5. Contributor can mock-upload; ClientContact cannot.
6. Switch to ACCG — CCB financial package request disappears; ACCG_ONLY file never appears on CCB.
7. Notifications show InApp + EmailDisabled behavior copy.
8. Activity history lists workspace seed + document request + next action.

## Security checklist

- [ ] No anonymous sharing affordance
- [ ] Internal notes/files gated
- [ ] ClientId isolation on all collections
- [ ] Outlook / email outbound remain not ready
- [ ] No invented CCB financials

## Disposition

- **PASS:** authorize commit/push separately  
- **FAIL:** return defects only; keep uncommitted if so instructed
