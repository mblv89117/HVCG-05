# AI Approval Matrix — HVCG OS

| Output / Job type | Human review required | Default approver | Auto-send allowed |
|-------------------|----------------------|------------------|-------------------|
| Client-facing emails | **Yes** | PM → Ops | **Never** (v1.x) |
| Proposals | **Yes** | Owner or Ops | Never |
| Financial analysis | **Yes** | Analyst reviewer + PM | Never |
| Capital recommendations | **Yes** | Capital Advisor + Owner if material | Never |
| Lender recommendations | **Yes** | Capital Advisor | Never |
| Investor recommendations | **Yes** | Capital Advisor + Owner | Never |
| Legal / compliance content | **Yes** | Owner | Never |
| Pricing | **Yes** | Owner | Never |
| Scope changes | **Yes** | Owner / Ops | Never |
| Client deliverables | **Yes** | PM / designated approver | Never |
| Meeting summaries (internal) | Recommended | Meeting owner | N/A internal |
| Task extraction (internal) | Recommended | PM | N/A |
| SOP drafts (internal) | **Yes** before publish | Ops Manager | N/A |
| Executive briefs | **Yes** if client-external | Owner | Never |

Enforced via `HVCG_AIJobs.HumanReviewRequired`, `HVCG_AIApprovals`, and `ExternalSendBlocked=true`.
