"""HVCG Growth Operating System (Development) — Sprint 10 BA-G.

Connects Strategy → Priorities → KPIs → Initiatives → Ops execution.
Does not duplicate CRM, task manager, project shell, Client 360, or ECC.
Consumes Revenue/CFO/Capital/Procurement/Risk/Ops as SoRs.
Pricing from OFF-GROWTH-OS — not hard-coded in UI.
"""

from __future__ import annotations

from copy import deepcopy
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any

from pricing_policy import is_legacy_client, load_json

OFFER_CODE = "OFF-GROWTH-OS"
SERVICE_LINE = "SL-GROWTH"
BL_C1_ACTIVE = True
AGENT_SUCCESS = "AGT-SUCCESS"
AGENT_CRM = "AGT-CRM"
AGENT_BRAIN = "AGT-SECOND-BRAIN"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_growth_policy() -> dict[str, Any]:
    return load_json("growth-operating-policy.json")


def offer_pricing_ref() -> dict[str, Any]:
    offers = {o["offerCode"]: o for o in load_json("offer-catalog.json")["offers"]}
    o = offers.get(OFFER_CODE) or {}
    return {
        "offerCode": OFFER_CODE,
        "serviceLine": SERVICE_LINE,
        "name": o.get("name"),
        "setupFeeGuidance": o.get("setupFeeGuidance"),
        "monthlyRetainerOption": o.get("monthlyRetainerOption"),
        "hardCodedInUiForbidden": True,
        "note": "Use canonical HVCG V2 pricing — do not hard-code fees in Growth UI.",
    }


# --- Engagement / baseline ---


@dataclass
class GrowthEngagement:
    client: str
    engagement_id: str
    offer_code: str = OFFER_CODE
    start_date: str | None = None
    target_end_date: str | None = None
    assigned_advisor: str | None = None
    executive_sponsor: str | None = None
    business_objective: str | None = None
    revenue_goal: str | None = None
    operational_goal: str | None = None
    primary_constraints: list[str] = field(default_factory=list)
    growth_stage: str | None = None
    current_systems: list[str] = field(default_factory=list)
    team_size: int | None = None
    priority_areas: list[str] = field(default_factory=list)
    review_cadence: str = "Weekly"
    engagement_status: str = "Active"
    client_classification: str | None = None
    contracted_current: float | None = None
    revenue_lineage: dict[str, Any] = field(default_factory=dict)


def create_growth_engagement(**kwargs: Any) -> dict[str, Any]:
    eng = GrowthEngagement(**{k: v for k, v in kwargs.items() if k in GrowthEngagement.__dataclass_fields__})
    policy = load_growth_policy()
    out = asdict(eng)
    out["pricingRef"] = offer_pricing_ref()
    out["disclaimer"] = policy["disclaimer"]
    out["blC1Active"] = BL_C1_ACTIVE
    out["legacyPricingProtected"] = bool(
        eng.client_classification and is_legacy_client(eng.client_classification)
    ) or (eng.client or "").upper() in {"ACCG", "AMERICAN CAPITAL CONSULTING GROUP"}
    if eng.contracted_current is not None:
        out["contractedCurrent"] = eng.contracted_current
    out["createdAt"] = _now()
    out["audit"] = [{"action": "GROWTH_ENGAGEMENT_CREATED", "at": _now()}]
    return out


def operating_baseline(dimensions: dict[str, str]) -> dict[str, Any]:
    policy = load_growth_policy()
    allowed = set(policy["baselineStates"])
    rows = {}
    errors = []
    for dim, state in dimensions.items():
        if state not in allowed:
            errors.append(f"Invalid baseline state for {dim}: {state}")
        else:
            rows[dim] = {"state": state, "evidenceRequired": True, "inventedBenchmarkForbidden": True}
    return {
        "dimensions": rows,
        "errors": errors,
        "note": "Evidence-backed status only — do not invent benchmark scores.",
        "assessedAt": _now(),
    }


# --- 90-day plan / priorities / initiatives ---


@dataclass
class Priority:
    title: str
    business_outcome: str
    owner: str
    success_measure: str
    related_kpi: str | None = None
    start_date: str | None = None
    due_date: str | None = None
    dependencies: list[str] = field(default_factory=list)
    risk: str | None = None
    status: str = "Active"
    confidence: str = "Medium"
    advisor_note: str | None = None


def create_90_day_plan(
    *,
    client: str,
    engagement_id: str,
    period_start: str,
    period_end: str,
    primary_objective: str,
    priorities: list[Priority | dict],
    created_by: str,
    version: int = 1,
    revenue_objective: str | None = None,
    operational_objective: str | None = None,
) -> dict[str, Any]:
    policy = load_growth_policy()
    rows = [asdict(p) if isinstance(p, Priority) else dict(p) for p in priorities]
    warn = len(rows) > policy["priorityWarnAbove"]
    return {
        "client": client,
        "engagementId": engagement_id,
        "version": version,
        "periodStart": period_start,
        "periodEnd": period_end,
        "primaryObjective": primary_objective,
        "revenueObjective": revenue_objective,
        "operationalObjective": operational_objective,
        "priorities": rows,
        "priorityCount": len(rows),
        "focusWarning": warn,
        "focusWarningMessage": (
            f"Plan has {len(rows)} priorities — default recommendation is 3–5. Encourage focus."
            if warn
            else None
        ),
        "defaultMaxPriorities": policy["defaultMaxPriorities"],
        "status": "DRAFT",
        "createdBy": created_by,
        "createdAt": _now(),
        "approvedBy": None,
        "supersededBy": None,
        "results": None,
    }


def approve_90_day_plan(plan: dict[str, Any], *, advisor: str) -> dict[str, Any]:
    out = deepcopy(plan)
    out["status"] = "ACTIVE"
    out["approvedBy"] = advisor
    out["approvedAt"] = _now()
    return out


def close_90_day_plan(plan: dict[str, Any], *, results: list[dict[str, Any]], closed_by: str) -> dict[str, Any]:
    policy = load_growth_policy()
    out = deepcopy(plan)
    for r in results:
        if r.get("status") not in policy["planResultStatuses"]:
            return {"errors": [f"Invalid result status {r.get('status')}"], "plan": out}
        if r.get("status") == "MISSED" and r.get("silentlyMovedForward"):
            return {"errors": ["Do not silently move missed priorities forward"], "plan": out}
    out["status"] = "CLOSED"
    out["results"] = results
    out["closedBy"] = closed_by
    out["closedAt"] = _now()
    out["note"] = "Create next version separately — do not rewrite history."
    return {"errors": [], "plan": out}


def create_initiative(*, objective: str, owner: str, related_priority: str, milestones: list[str] | None = None) -> dict[str, Any]:
    return {
        "objective": objective,
        "owner": owner,
        "relatedPriority": related_priority,
        "milestones": milestones or [],
        "tasksReuseOpsHub": True,
        "projectsReuseExisting": True,
        "duplicateTaskEngineForbidden": True,
        "health": "Unknown",
        "createdAt": _now(),
    }


# --- KPIs ---


@dataclass
class KpiDefinition:
    name: str
    domain: str
    definition: str
    formula: str | None
    owner: str
    source: str
    source_system: str
    frequency: str
    target: float | None = None
    target_origin: str | None = None
    target_benchmark_source: str | None = None
    actual: float | None = None
    prior_period: float | None = None
    available: bool = True


def kpi_scorecard(kpis: list[KpiDefinition | dict], *, thresholds: dict[str, float] | None = None) -> dict[str, Any]:
    policy = load_growth_policy()
    thr = thresholds or {"watch": 0.1, "off": 0.2}
    rows = []
    for k in kpis:
        row = asdict(k) if isinstance(k, KpiDefinition) else dict(k)
        if not row.get("definition"):
            row["validationError"] = "Ambiguous KPI without definition"
        if row.get("target") is not None and not row.get("target_origin"):
            row["validationError"] = "Target requires origin"
        if row.get("target_origin") == "BENCHMARK" and not row.get("target_benchmark_source"):
            row["validationError"] = "Benchmark target requires source — do not invent"
        if row.get("available") is False or (row.get("actual") is None and row.get("source_missing")):
            row["health"] = "NO_DATA"
            row["available"] = False
        elif row.get("actual") is None:
            row["health"] = "NO_DATA"
        elif row.get("target") is None:
            row["health"] = "WATCH"
            row["healthReason"] = "No target set"
        else:
            target = float(row["target"])
            actual = float(row["actual"])
            if target == 0:
                variance = 0.0
            else:
                variance = abs(actual - target) / abs(target)
            if variance <= thr["watch"]:
                row["health"] = "ON_TRACK"
            elif variance <= thr["off"]:
                row["health"] = "WATCH"
            else:
                row["health"] = "OFF_TRACK"
            row["healthReason"] = f"Variance {variance:.0%} vs configurable thresholds"
        row["sourceOfRecord"] = row.get("source_system") or policy["domainSources"].get(row.get("domain"), row.get("source"))
        row["duplicateCalculationForbidden"] = True
        rows.append(row)
    return {
        "scorecard": rows,
        "fabricateForbidden": True,
        "healthStates": policy["kpiHealthStates"],
        "note": "Health classification is explained by variance thresholds — not unexplained colors.",
    }


# --- Meetings / commitments / accountability ---


def weekly_operating_review(*, client: str, date: str, kpi_snapshot: dict[str, Any] | None = None) -> dict[str, Any]:
    policy = load_growth_policy()
    return {
        "meetingType": "Weekly Operating Review",
        "client": client,
        "date": date,
        "agenda": policy["weeklyReviewAgenda"],
        "kpiSnapshot": kpi_snapshot,
        "aiDraftSummary": None,
        "humanApprovedSummary": None,
        "status": "SCHEDULED",
        "reuseMeetingRecords": True,
    }


def record_meeting(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        **payload,
        "aiDraftSummary": payload.get("ai_draft"),
        "humanApprovedSummary": payload.get("human_summary"),
        "aiDraftNotFinal": True,
        "recordedAt": _now(),
    }


@dataclass
class Commitment:
    commitment: str
    owner: str
    due_date: str
    related_priority: str | None = None
    related_issue: str | None = None
    status: str = "Open"
    completion_evidence: str | None = None
    carryover_count: int = 0


def commitment_register(items: list[Commitment | dict]) -> dict[str, Any]:
    rows = [asdict(c) if isinstance(c, Commitment) else dict(c) for c in items]
    overdue = [r for r in rows if r.get("status") == "Overdue" or r.get("overdue")]
    repeated = [r for r in rows if int(r.get("carryover_count") or 0) >= 2]
    return {
        "commitments": rows,
        "overdue": overdue,
        "repeatedCarryovers": repeated,
        "accountabilityFlags": [
            {"type": "REPEATED_CARRYOVER", "commitment": r.get("commitment"), "owner": r.get("owner")}
            for r in repeated
        ],
        "punitiveHrJudgmentForbidden": True,
        "autonomousEmployeeDisciplineForbidden": True,
        "note": "Execution-management visibility only — not HR performance conclusions.",
    }


# --- Issues / decisions / routing ---


def create_issue(*, title: str, domain_hint: str, impact: str, owner: str) -> dict[str, Any]:
    policy = load_growth_policy()
    route = None
    hint = (domain_hint or "").lower()
    for key, dest in policy["issueRouting"].items():
        if key in hint:
            route = dest
            break
    return {
        "issue": title,
        "domainHint": domain_hint,
        "impact": impact,
        "owner": owner,
        "routedTo": route or "Ops",
        "duplicateDomainEngineForbidden": True,
        "status": "Open",
        "createdAt": _now(),
    }


def route_cross_domain_issues(issues: list[dict[str, Any]]) -> dict[str, Any]:
    routed = [create_issue(**i) if "title" in i else i for i in issues]
    # normalize if already created
    out = []
    for i in issues:
        if "routedTo" in i:
            out.append(i)
        else:
            out.append(
                create_issue(
                    title=i.get("title") or i.get("issue") or "Issue",
                    domain_hint=i.get("domain_hint") or i.get("domain") or "",
                    impact=i.get("impact") or "Unknown",
                    owner=i.get("owner") or "Unassigned",
                )
            )
    by_domain: dict[str, list] = {}
    for r in out:
        by_domain.setdefault(r["routedTo"], []).append(r["issue"])
    return {
        "issues": out,
        "byDomain": by_domain,
        "growthOrchestratesVisibilityOnly": True,
        "note": "Growth OS routes — does not recreate CFO/Capital/Risk/Procurement/Revenue engines.",
    }


def decision_register(items: list[dict[str, Any]]) -> dict[str, Any]:
    return {"decisions": items, "institutionalKnowledge": True, "reuseDecisionRegister": True}


# --- SOPs / processes / automation ---


def draft_sop(*, title: str, process: str, owner: str, steps: list[str], created_by: str) -> dict[str, Any]:
    return {
        "title": title,
        "process": process,
        "owner": owner,
        "steps": steps,
        "version": 1,
        "status": "DRAFT",
        "createdBy": created_by,
        "createdAt": _now(),
        "aiGenerated": created_by.startswith("AGT-") or created_by.upper() == "AI",
        "canAutoActivate": False,
        "sharePointArchitecture": True,
        "disconnectedRepoForbidden": True,
    }


def advance_sop(sop: dict[str, Any], new_status: str, *, actor: str) -> dict[str, Any]:
    policy = load_growth_policy()
    out = deepcopy(sop)
    if new_status not in policy["sopStatuses"]:
        return {"errors": [f"Invalid SOP status {new_status}"], "sop": out}
    if new_status == "ACTIVE" and out.get("status") not in {"APPROVED", "ACTIVE"}:
        return {"errors": ["AI/draft SOP cannot become ACTIVE without human APPROVED status"], "sop": out}
    if new_status == "ACTIVE" and out.get("aiGenerated") and out.get("status") != "APPROVED":
        return {"errors": ["Human review required before ACTIVE"], "sop": out}
    prev = out.get("status")
    out["status"] = new_status
    if new_status == "SUPERSEDED":
        out["supersededAt"] = _now()
    out.setdefault("audit", []).append({"from": prev, "to": new_status, "actor": actor, "at": _now()})
    return {"errors": [], "sop": out}


def process_map(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        **payload,
        "bottlenecks": payload.get("bottlenecks") or [],
        "automationOpportunity": payload.get("automation_class") or "MANUAL",
    }


def automation_opportunity(payload: dict[str, Any]) -> dict[str, Any]:
    policy = load_growth_policy()
    cls = payload.get("classification") or "AUTOMATION_CANDIDATE"
    if cls not in policy["automationClasses"]:
        cls = "AUTOMATION_CANDIDATE"
    return {
        "process": payload.get("process"),
        "classification": cls,
        "repetition": payload.get("repetition"),
        "volume": payload.get("volume"),
        "dataAvailability": payload.get("data_availability"),
        "ruleClarity": payload.get("rule_clarity"),
        "risk": payload.get("risk"),
        "humanApprovalRequirement": payload.get("human_approval") or True,
        "estimatedBenefit": payload.get("benefit"),
        "agentCandidate": payload.get("agent_candidate"),
        "autoDeployForbidden": True,
        "possibleNotShould": True,
        "feedsLaterAgentOrchestration": True,
        "note": "Do not equate possible-to-automate with should-automate. No automatic deployment.",
    }


# --- Agents / status / recommendations ---


def run_client_success_agent(payload: dict[str, Any]) -> dict[str, Any]:
    if payload.get("sendClientMessage") or payload.get("changePricing") or payload.get("changeScope"):
        return {"agent": AGENT_SUCCESS, "blocked": True, "reason": "May not send sensitive messages, change pricing, or modify scope."}
    return {
        "agent": AGENT_SUCCESS,
        "riskLevel": "LOW",
        "milestoneWatch": payload.get("milestones"),
        "missedCommitments": payload.get("missed"),
        "statusSummaryDraft": payload.get("status_draft") or "DRAFT",
        "meetingAgendaDraft": payload.get("agenda"),
        "risksSurfaced": payload.get("risks") or [],
        "followUps": payload.get("follow_ups") or [],
        "expansionOpportunities": payload.get("expansion") or [],
        "may": [
            "monitor milestones",
            "identify missed commitments",
            "prepare status summary",
            "prepare meeting agenda",
            "identify risks",
            "suggest follow-up",
            "surface expansion opportunities",
        ],
        "mustNot": [
            "send sensitive client messages autonomously",
            "promise scope",
            "change pricing",
            "modify contracts",
        ],
        "canAutoSend": False,
        "blC1Active": BL_C1_ACTIVE,
    }


def run_crm_update_agent(payload: dict[str, Any]) -> dict[str, Any]:
    if payload.get("deleteRecords") or payload.get("alterContractedEconomics") or payload.get("createFalseActivity"):
        return {"agent": AGENT_CRM, "blocked": True, "reason": "May not delete, alter contracted economics, or create false activity."}
    return {
        "agent": AGENT_CRM,
        "activitySummary": payload.get("activity"),
        "meetingOutcomes": payload.get("outcomes"),
        "nextActions": payload.get("next_actions"),
        "opportunityUpdates": payload.get("opportunity_updates"),
        "mustNot": ["delete records", "overwrite financial truth", "alter contracted economics", "create false activity"],
        "canOverwriteFinancialTruth": False,
    }


def client_status_draft(ctx: dict[str, Any]) -> dict[str, Any]:
    body = f"""# INTERNAL CLIENT STATUS (DRAFT)

# Wins
{ctx.get('wins', '')}

# KPI Changes
{ctx.get('kpis', '')}

# Priority Progress
{ctx.get('priorities', '')}

# Overdue Commitments
{ctx.get('overdue', '')}

# Issues
{ctx.get('issues', '')}

# Decisions Needed
{ctx.get('decisions', '')}

# Risks
{ctx.get('risks', '')}

# Upcoming Milestones
{ctx.get('milestones', '')}

# Advisor Recommendations
{ctx.get('recommendations', '')}
"""
    return {
        "body": body,
        "approved": False,
        "canAutoSend": False,
        "humanApprovalBeforeClientDelivery": True,
        "createdAt": _now(),
    }


def growth_recommendations(signals: list[str]) -> dict[str, Any]:
    mapping = {
        "cfo_gap": {"rec": "Formalize CFO cadence", "offer": "OFF-FCFO-OP"},
        "capital_need": {"rec": "Capital Diagnostic", "offer": "OFF-CAP-DIAG"},
        "ai_opportunity": {"rec": "AI Second Brain / AI Operations", "offer": "OFF-AI-BRAIN"},
        "risk_exposure": {"rec": "Risk Review", "offer": "OFF-RISK-REVIEW"},
        "procurement_need": {"rec": "Contract Procurement Readiness", "offer": "OFF-PROC-READY"},
        "revenue_process": {"rec": "Improve Revenue process", "offer": None},
        "sop_gap": {"rec": "Build SOP", "offer": None},
        "accountability": {"rec": "Add accountability cadence", "offer": None},
    }
    recs = []
    for s in signals:
        m = mapping.get(s)
        if m:
            recs.append({**m, "signal": s, "autoScopeChangeForbidden": True, "autoPricingChangeForbidden": True})
    return {"recommendations": recs, "humanReviewRequired": True}


def value_creation_record(payload: dict[str, Any]) -> dict[str, Any]:
    if payload.get("invented_roi"):
        return {"errors": ["Do not invent ROI"], "record": None}
    if not payload.get("evidence"):
        return {"errors": ["Evidence required"], "record": None}
    policy = load_growth_policy()
    attr = payload.get("attribution") or "HVCG_CONTRIBUTION"
    if attr not in policy["attributionKinds"]:
        attr = "HVCG_CONTRIBUTION"
    return {
        "errors": [],
        "record": {
            **payload,
            "attribution": attr,
            "baseline": payload.get("baseline"),
            "currentResult": payload.get("current"),
            "period": payload.get("period"),
            "confidence": payload.get("confidence") or "Medium",
        },
    }


def owner_dependency_signal(flags: list[str]) -> dict[str, Any]:
    return {
        "signal": "OWNER_DEPENDENCY",
        "flags": flags,
        "operatingObservationOnly": True,
        "notCompanyValuation": True,
    }


def process_documentation_coverage(*, critical: int, documented: int, approved: int, current: int, owner_assigned: int) -> dict[str, Any]:
    return {
        "criticalProcesses": critical,
        "documented": documented,
        "approved": approved,
        "current": current,
        "ownerAssigned": owner_assigned,
        "coveragePct": round(100 * documented / critical, 1) if critical else 0,
    }


def maturity_view(dimensions: dict[str, str]) -> dict[str, Any]:
    policy = load_growth_policy()
    allowed = set(policy["baselineStates"])
    rows = {k: v for k, v in dimensions.items() if v in allowed}
    return {
        "dimensions": rows,
        "arbitraryCompositeScoreForbidden": True,
        "note": "Evidence-based states only — no undocumented composite scoring.",
    }


def ecc_growth_summary(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "priorityHealth": payload.get("priority_health") or "NO_DATA",
        "kpiHealth": payload.get("kpi_health") or "NO_DATA",
        "overdueCommitments": payload.get("overdue") or 0,
        "criticalIssues": payload.get("critical_issues") or 0,
        "revenueStatus": payload.get("revenue") or "See Revenue OS",
        "cashCfoStatus": payload.get("cash") or "See CFO",
        "capitalStatus": payload.get("capital") or "See Capital",
        "procurementStatus": payload.get("procurement") or "See Procurement",
        "riskStatus": payload.get("risk") or "See Risk (permission-controlled)",
        "aiOpportunities": payload.get("ai") or [],
        "duplicateSourceCalculationsForbidden": True,
        "consumesApprovedSummariesOnly": True,
    }


def attempt_external_growth_action(*, action: str) -> dict[str, Any]:
    blocked = {
        "send_client_report",
        "send_employee_message",
        "external_task_escalation",
        "change_scope",
        "change_pricing",
    }
    return {
        "action": action,
        "allowed": False,
        "blC1Active": BL_C1_ACTIVE,
        "reason": "Growth external / commercial mutations gated.",
        "blockedActions": sorted(blocked),
    }


def second_brain_knowledge_candidates(items: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "candidates": items,
        "permissionMetadataRequired": True,
        "clientIsolationRequired": True,
        "fullOrchestrationDeferred": True,
        "agent": AGENT_BRAIN,
        "note": "Prepare knowledge for later Second Brain sprint — do not build full orchestration here.",
    }
