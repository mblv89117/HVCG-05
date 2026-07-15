# SOP — Executive Escalation Hygiene

Manny should only receive alerts matching `config/hvcg.config.json` executiveEscalationRules.

## Do escalate

Relationship at risk, material schedule slip, critical deadline, major deliverable needing him, pricing/scope exception, disputes, out-of-scope work, capital strategy, lender/investor executive need, material past-due payment, success fee earned/disputed, legal/ethical/reputational, unresolvable blocker, material financial consequence, material inaccurate client info.

## Do not escalate

Routine doc reminders, ordinary task nudges, scheduling, status updates, noncritical overdue items.

## How

Set **RequiresExecutiveAttention = true** and select EscalationReason. Flow notifies executive.
