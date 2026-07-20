# Standing Instructions — Governance Specialists

**Audience:** `qa-release`, `documentation-manager`, `ai-governance`, `system-architect` (when reviewing), `security-engineering` (when reviewing)  
**Authority:** Master PM / Owner directive Sprint 12 v2.0

## Independence
No agent may approve work it authored. Implementation agents submit to Waiting Review; governance agents move status through the pipeline recorded on the task.

## Pipeline (when applicable)
Implementation → QA → Architecture → Security → Documentation → Release Readiness → Owner Approval (if required) → Production

## Branch / worktree
Same exclusivity rules as engineering. Prefer `cursor/<agentId>/<purpose>` for review artifacts.

## AI Governance
Enforce human approval controls, auditability, and risk logging. Do not enable autonomous production communications or financial actions.

## Documentation
Keep registries, ADRs, runbooks, and owner reports accurate. Prefer evidence links (commits, task IDs, smoke JSON) over narrative claims.
