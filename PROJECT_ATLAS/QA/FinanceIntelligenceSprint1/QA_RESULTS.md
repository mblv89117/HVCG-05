# Finance Intelligence Sprint 1 — QA Results

Generated: 2026-07-20T02:46:26.039Z
Branch: `cursor/finance-intelligence-sprint1`
Data mode: **mock-demo + incomplete CCB**

## Summary: 25/25 passed

| Suite | Check | Result | Evidence |
|-------|-------|--------|----------|
| Navigation QA | overview route | PASS | / → Financial Overview |
| Navigation QA | decisions route | PASS | /decisions → Executive Recommendations |
| Navigation QA | changes route | PASS | /changes → What Changed Since Yesterday |
| Navigation QA | scores route | PASS | /scores → Risk & Readiness Scores |
| Navigation QA | trends route | PASS | /trends → Trend Analysis |
| Navigation QA | cash route | PASS | /cash → Cash & Runway |
| Navigation QA | working-capital route | PASS | /working-capital → Working Capital |
| Navigation QA | budget route | PASS | /budget → Budget versus Actual |
| Navigation QA | forecast route | PASS | /forecast → Forecast & Scenario Analysis |
| Navigation QA | enterprise-value route | PASS | /enterprise-value → Enterprise Value |
| Navigation QA | workspaces route | PASS | /workspaces → Client Workspaces |
| Navigation QA | capital route | PASS | /capital → Capital Advisory |
| Navigation QA | alerts route | PASS | /alerts → Finance Alerts |
| Navigation QA | ai route | PASS | /ai → AI-supported Financial Observations |
| Navigation QA | governance route | PASS | /governance → Governance, Permissions & Audit |
| Responsive QA | 390×844 cash dashboard | PASS | mobile nav=true; overflowPx=0 |
| Decision QA | Recommendations cite supporting data | PASS | recCards=7; citations=16 |
| Decision QA | What changed since yesterday | PASS | 3 rows |
| Decision QA | Risk and readiness scores | PASS | 3 scorecards |
| Permission QA | Assistant layout | PASS | cash=false; ev=false; overview=true |
| Permission QA | Protected cash route | PASS | redirected to http://127.0.0.1:4176/ |
| Financial QA | CCB incomplete labels | PASS | incomplete matches=15 |
| Financial QA | Overview KPI density | PASS | 14 KPI cards |
| Financial QA | Mock-only banner present | PASS | banner=1 |
| Financial QA | EV indicative labeling | PASS | indicative matches=6 |

## Screenshots

- `screenshots/01-overview-desktop.png`
- `screenshots/02-decisions-desktop.png`
- `screenshots/03-enterprise-value-desktop.png`
- `screenshots/04-ccb-workspace-desktop.png`
- `screenshots/05-scores-desktop.png`
- `screenshots/06-cash-mobile.png`
