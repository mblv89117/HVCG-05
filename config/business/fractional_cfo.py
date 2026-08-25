"""HVCG Fractional CFO Operating Partner (Development) — Sprint 7 BA-D.

Recurring monthly finance cadence. Reuses Capital Readiness / Financial Package.
Does not certify financials, modify books, or auto-send client/CPA/bookkeeper.
Pricing from canonical OFF-FCFO-OP — not hard-coded in UI.
"""

from __future__ import annotations

from copy import deepcopy
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any

from capital_readiness import ProvenancedValue, detect_source_conflicts, freshness_flag, pv, run_capital_readiness_diagnostic
from pricing_policy import is_legacy_client, load_json

OFFER_CODE = "OFF-FCFO-OP"
SERVICE_LINE = "SL-FCFO"
BL_C1_ACTIVE = True
AGENT_INVOICE = "AGT-INVOICE"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_cfo_policy() -> dict[str, Any]:
    return load_json("cfo-operating-policy.json")


def load_compliance() -> dict[str, Any]:
    return load_json("compliance-language.json")


def offer_pricing_ref() -> dict[str, Any]:
    offers = {o["offerCode"]: o for o in load_json("offer-catalog.json")["offers"]}
    o = offers.get(OFFER_CODE) or {}
    return {
        "offerCode": OFFER_CODE,
        "serviceLine": SERVICE_LINE,
        "pricingStatus": o.get("pricingStatus") or "REQUIRES_OWNER_REVIEW",
        "setupFeeGuidance": o.get("setupFeeGuidance"),
        "monthlyRetainerOption": o.get("monthlyRetainerOption"),
        "hardCodedInUiForbidden": True,
        "note": "Use canonical HVCG pricing system — do not hard-code fees in Finance UI.",
    }


# --- Engagement / sources ---


@dataclass
class CfoEngagement:
    client: str
    engagement_id: str
    offer_code: str = OFFER_CODE
    start_date: str | None = None
    minimum_term_months: int | None = None
    assigned_advisor: str | None = None
    accounting_system: str | None = None
    bookkeeper: str | None = None
    cpa: str | None = None
    reporting_frequency: str = "Monthly"
    monthly_review_date: str | None = None
    cash_flow_cadence: str = "Weekly"
    budget_status: str = "Not Started"
    wip_applicable: bool = False
    ar_review_applicable: bool = True
    ap_review_applicable: bool = True
    capital_readiness_monitoring: bool = True
    data_source_status: str = "PENDING_LIVE_SOURCE"
    client_responsibilities: str | None = None
    internal_notes: str | None = None
    engagement_status: str = "ENGAGEMENT_CREATED"
    client_classification: str | None = None
    contracted_current: float | None = None


@dataclass
class FinancialSource:
    client: str
    system_source: str
    data_type: str
    connection_status: str  # Connected | Disconnected | PENDING_LIVE_SOURCE | Manual
    period: str | None = None
    as_of_date: str | None = None
    received_date: str | None = None
    verification_status: str = "UNVERIFIED"
    authority_class: str = "CLIENT_PROVIDED_DATA"
    freshness_days: int | None = None
    adapter_status: str = "PENDING_LIVE_SOURCE"
    reconciliation_status: str = "NOT_APPLICABLE"


def create_cfo_engagement(**kwargs: Any) -> dict[str, Any]:
    eng = CfoEngagement(**kwargs)
    pricing = offer_pricing_ref()
    audit = [{"event": "engagement_created", "at": _now(), "offer": OFFER_CODE}]
    return {
        "engagement": asdict(eng),
        "pricingRef": pricing,
        "onboardingState": "ENGAGEMENT_CREATED",
        "legacyPricingProtected": is_legacy_client(eng.client_classification or ""),
        "contractedCurrent": eng.contracted_current,
        "blC1Active": BL_C1_ACTIVE,
        "audit": audit,
    }


_ONBOARD_ORDER = load_cfo_policy()["onboardingStates"] if False else [
    "ENGAGEMENT_CREATED",
    "ACCESS_REQUESTED",
    "DATA_SOURCES_MAPPED",
    "BASELINE_FINANCIALS_RECEIVED",
    "FINANCIAL_STRUCTURE_REVIEW",
    "FORECAST_SETUP",
    "KPI_BASELINE",
    "MONTHLY_CADENCE_READY",
]


def advance_onboarding(record: dict[str, Any], *, to_state: str | None = None) -> dict[str, Any]:
    order = load_cfo_policy()["onboardingStates"]
    out = deepcopy(record)
    cur = out.get("onboardingState") or "ENGAGEMENT_CREATED"
    if to_state:
        if to_state not in order:
            return {**out, "errors": [f"Invalid onboarding state {to_state}"]}
        if order.index(to_state) < order.index(cur):
            return {**out, "errors": [f"Cannot move backward {cur} → {to_state}"]}
        out["onboardingState"] = to_state
    else:
        idx = order.index(cur)
        if idx >= len(order) - 1:
            return out
        out["onboardingState"] = order[idx + 1]
    out["engagement"]["engagement_status"] = out["onboardingState"]
    out.setdefault("audit", []).append({"event": "onboarding", "state": out["onboardingState"], "at": _now()})
    return out


def register_financial_sources(sources: list[FinancialSource | dict]) -> dict[str, Any]:
    rows = []
    for s in sources:
        row = asdict(s) if isinstance(s, FinancialSource) else dict(s)
        # Never claim live connection for deferred adapters without explicit Connected
        if row.get("adapter_status") == "PENDING_LIVE_SOURCE" and row.get("connection_status") == "Connected":
            row["connection_status"] = "PENDING_LIVE_SOURCE"
            row["note"] = "Disconnected/pending live adapter — not represented as connected."
        rows.append(row)
    return {"sources": rows, "rule": "Do not represent disconnected integrations as connected."}


# --- Monthly cycle ---


def start_monthly_cycle(*, period: str, engagement_id: str) -> dict[str, Any]:
    return {
        "engagementId": engagement_id,
        "period": period,
        "state": "WAITING_FOR_PERIOD_CLOSE",
        "checklist": [
            "P&L",
            "Balance Sheet",
            "Cash",
            "Revenue",
            "Gross Margin",
            "Operating Expenses",
            "EBITDA / operating earnings",
            "Net Income",
            "AR",
            "AP",
            "Debt",
            "Debt Service",
            "Working Capital",
            "WIP (if applicable)",
            "13-week cash forecast",
            "Budget variance",
            "major anomalies",
            "capital-readiness impacts",
        ],
        "audit": [{"event": "cycle_started", "period": period, "at": _now()}],
        "note": "Management/advisory close — not CPA attestation.",
    }


def transition_monthly_cycle(cycle: dict[str, Any], new_state: str, *, actor: str) -> dict[str, Any]:
    order = load_cfo_policy()["monthlyCycleStates"]
    if new_state not in order:
        return {"errors": [f"Invalid state {new_state}"], "cycle": cycle}
    out = deepcopy(cycle)
    # CLIENT_REVIEW_READY requires advisor interpretation
    if new_state == "CLIENT_REVIEW_READY" and not out.get("advisorInterpretation"):
        return {"errors": ["Advisor interpretation required before CLIENT_REVIEW_READY"], "cycle": cycle}
    if new_state == "CLIENT_REVIEW_READY" and BL_C1_ACTIVE:
        out["clientSend"] = {"allowed": False, "blC1Active": True, "note": "Draft ready — auto-send blocked"}
    out["state"] = new_state
    out.setdefault("audit", []).append({"event": "cycle_transition", "to": new_state, "actor": actor, "at": _now()})
    return {"errors": [], "cycle": out}


# --- 13-week forecast ---


@dataclass
class CashWeek:
    week_number: int
    week_ending: str
    opening_cash: float
    receipts: float = 0
    customer_collections: float = 0
    other_inflows: float = 0
    payroll: float = 0
    vendors: float = 0
    rent: float = 0
    debt_service: float = 0
    taxes: float = 0
    insurance: float = 0
    capex: float = 0
    owner_distributions: float = 0
    other_outflows: float = 0
    input_origins: dict[str, str] = field(default_factory=dict)


def build_13_week_forecast(
    weeks: list[CashWeek | dict],
    *,
    scenario: str = "BASE",
    assumptions: str | None = None,
    created_by: str = "advisor",
    ai_suggested: bool = False,
) -> dict[str, Any]:
    policy = load_cfo_policy()
    if scenario not in policy["forecastScenarios"]:
        raise ValueError(f"Invalid scenario {scenario}")
    rows = []
    prev_end = None
    for w in weeks:
        week = w if isinstance(w, CashWeek) else CashWeek(**w)
        if prev_end is not None:
            week.opening_cash = prev_end
        inflows = week.receipts + week.customer_collections + week.other_inflows
        outflows = (
            week.payroll
            + week.vendors
            + week.rent
            + week.debt_service
            + week.taxes
            + week.insurance
            + week.capex
            + week.owner_distributions
            + week.other_outflows
        )
        net = inflows - outflows
        ending = week.opening_cash + net
        # AI suggested estimates cannot silently become approved
        origins = dict(week.input_origins or {})
        pending_ai = [k for k, v in origins.items() if v == "AI Suggested Estimate"]
        rows.append(
            {
                **asdict(week),
                "inflows": inflows,
                "outflows": outflows,
                "netWeeklyCashFlow": net,
                "endingCash": ending,
                "aiSuggestedFieldsPendingApproval": pending_ai,
            }
        )
        prev_end = ending
    version = {
        "version": "v1",
        "createdDate": _now(),
        "createdBy": created_by,
        "scenario": scenario,
        "assumptions": assumptions,
        "sourceSnapshot": f"forecast-{scenario}-{_now()[:10]}",
        "approvedBy": None if ai_suggested or any(r["aiSuggestedFieldsPendingApproval"] for r in rows) else created_by,
        "supersededBy": None,
        "aiSuggestedRequiresHumanApproval": bool(ai_suggested) or any(r["aiSuggestedFieldsPendingApproval"] for r in rows),
    }
    alerts = generate_cash_alerts(rows)
    return {
        "weeks": rows,
        "version": version,
        "scenario": scenario,
        "alerts": alerts,
        "note": "Assumptions stored separately from actuals. Scenarios do not overwrite BASE.",
    }


def approve_forecast(forecast: dict[str, Any], *, advisor: str) -> dict[str, Any]:
    out = deepcopy(forecast)
    out["version"]["approvedBy"] = advisor
    out["version"]["aiSuggestedRequiresHumanApproval"] = False
    for w in out["weeks"]:
        w["aiSuggestedFieldsPendingApproval"] = []
        # convert AI origins to Advisor Assumption after approval
        origins = w.get("input_origins") or {}
        w["input_origins"] = {
            k: ("Advisor Assumption" if v == "AI Suggested Estimate" else v) for k, v in origins.items()
        }
    out.setdefault("audit", []).append({"event": "forecast_approved", "advisor": advisor, "at": _now()})
    return out


def generate_cash_alerts(weeks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    thr = load_cfo_policy()["cashAlertThresholds"]
    alerts = []
    for w in weeks:
        if w["endingCash"] < 0:
            alerts.append({"code": "PROJECTED_NEGATIVE_CASH", "week": w["week_number"], "endingCash": w["endingCash"], "kind": "HVCG_CALCULATION"})
        if w["endingCash"] < thr["minimumCash"]:
            alerts.append({"code": "MINIMUM_CASH_THRESHOLD_BREACH", "week": w["week_number"], "threshold": thr["minimumCash"], "endingCash": w["endingCash"], "kind": "HVCG_CALCULATION"})
        if w.get("payroll", 0) > 0 and w["endingCash"] < w["payroll"] * thr["payrollCoverageWeeks"]:
            alerts.append({"code": "PAYROLL_COVERAGE_RISK", "week": w["week_number"], "kind": "HVCG_CALCULATION"})
        if w.get("debt_service", 0) > max(w["endingCash"] * 0.5, 1):
            alerts.append({"code": "DEBT_SERVICE_PRESSURE", "week": w["week_number"], "kind": "HVCG_CALCULATION"})
        if w.get("owner_distributions", 0) > thr["minimumCash"]:
            alerts.append({"code": "UNUSUAL_OWNER_DISTRIBUTION", "week": w["week_number"], "kind": "HVCG_CALCULATION"})
    return alerts


def forecast_vs_actual(forecast: dict[str, Any], actuals: dict[str, float]) -> dict[str, Any]:
    """Compare key forecast totals to actuals for a closed period."""
    weeks = forecast.get("weeks") or []
    f_revenue = sum(w.get("customer_collections", 0) + w.get("receipts", 0) for w in weeks)
    f_payroll = sum(w.get("payroll", 0) for w in weeks)
    f_vendors = sum(w.get("vendors", 0) for w in weeks)
    f_debt = sum(w.get("debt_service", 0) for w in weeks)
    f_end = weeks[-1]["endingCash"] if weeks else None
    pairs = {
        "collections": (f_revenue, actuals.get("collections")),
        "payroll": (f_payroll, actuals.get("payroll")),
        "ap_payments": (f_vendors, actuals.get("ap_payments")),
        "debt_service": (f_debt, actuals.get("debt_service")),
        "ending_cash": (f_end, actuals.get("ending_cash")),
        "revenue": (actuals.get("forecast_revenue") or f_revenue, actuals.get("revenue")),
    }
    variances = []
    thr = load_cfo_policy()["cashAlertThresholds"]["materialVariancePercent"]
    for name, (f, a) in pairs.items():
        if f is None or a is None:
            continue
        var = a - f
        pct = (var / f * 100.0) if f else None
        material = abs(pct or 0) >= thr
        variances.append(
            {
                "metric": name,
                "forecast": f,
                "actual": a,
                "variance": var,
                "variancePercent": round(pct, 1) if pct is not None else None,
                "material": material,
                "note": "Variance is a management signal — not wrongdoing.",
            }
        )
    return {"variances": variances, "forecastVersion": forecast.get("version"), "kind": "HVCG_CALCULATION"}


# --- AR / AP / WC / WIP ---


@dataclass
class ArInvoice:
    customer: str
    invoice: str
    invoice_date: str
    due_date: str
    original_amount: float
    open_amount: float
    collection_status: str = "Open"
    dispute_status: str | None = None
    expected_collection_date: str | None = None
    source: str = "CLIENT_PROVIDED_DATA"


def ar_summary(invoices: list[ArInvoice | dict], *, as_of: str | None = None) -> dict[str, Any]:
    as_of_dt = datetime.fromisoformat((as_of or _now()[:10]).replace("Z", ""))
    buckets = {"Current": 0.0, "1-30": 0.0, "31-60": 0.0, "61-90": 0.0, "90+": 0.0}
    rows = []
    by_customer: dict[str, float] = {}
    for inv in invoices:
        i = inv if isinstance(inv, ArInvoice) else ArInvoice(**inv)
        due = datetime.fromisoformat(i.due_date)
        days = max(0, (as_of_dt - due).days)
        if days <= 0:
            bucket = "Current"
        elif days <= 30:
            bucket = "1-30"
        elif days <= 60:
            bucket = "31-60"
        elif days <= 90:
            bucket = "61-90"
        else:
            bucket = "90+"
        buckets[bucket] += i.open_amount
        by_customer[i.customer] = by_customer.get(i.customer, 0) + i.open_amount
        rows.append({**asdict(i), "agingBucket": bucket, "daysOutstanding": days})
    total = sum(buckets.values())
    ranked = sorted(by_customer.items(), key=lambda x: -x[1])
    top1 = (ranked[0][1] / total * 100) if total and ranked else 0
    top3 = (sum(v for _, v in ranked[:3]) / total * 100) if total else 0
    top5 = (sum(v for _, v in ranked[:5]) / total * 100) if total else 0
    return {
        "invoices": rows,
        "aging": buckets,
        "totalOpenAR": total,
        "concentration": {"topCustomerPct": round(top1, 1), "top3Pct": round(top3, 1), "top5Pct": round(top5, 1)},
        "note": "Do not modify accounting records automatically.",
        "kind": "HVCG_CALCULATION",
    }


@dataclass
class ApBill:
    vendor: str
    bill: str
    due_date: str
    amount: float
    status: str = "Open"
    priority: str = "Normal"
    critical_vendor: bool = False
    expected_payment_date: str | None = None
    source: str = "CLIENT_PROVIDED_DATA"


def ap_summary(bills: list[ApBill | dict], *, cash: float | None = None) -> dict[str, Any]:
    rows = [asdict(b) if isinstance(b, ApBill) else dict(b) for b in bills]
    total = sum(float(b["amount"]) for b in rows if b.get("status") != "Paid")
    pressure = cash is not None and total > cash
    return {
        "bills": rows,
        "totalOpenAP": total,
        "apPressure": pressure,
        "flag": "AP_EXCEEDS_NEAR_TERM_CASH" if pressure else None,
        "note": "Do not automatically schedule or issue payments.",
        "kind": "HVCG_CALCULATION",
    }


def working_capital(
    *,
    current_assets: ProvenancedValue | None,
    current_liabilities: ProvenancedValue | None,
    ar: float | None = None,
    ap: float | None = None,
    inventory: float | None = None,
    short_term_debt: float | None = None,
) -> dict[str, Any]:
    if (
        not current_assets
        or not current_liabilities
        or current_assets.state != "PRESENT"
        or current_liabilities.state != "PRESENT"
        or current_assets.value is None
        or current_liabilities.value is None
    ):
        return {"status": "INSUFFICIENT_DATA", "workingCapital": None, "currentRatio": None, "kind": "HVCG_CALCULATION"}
    ca = float(current_assets.value)
    cl = float(current_liabilities.value)
    wc = ca - cl
    ratio = round(ca / cl, 3) if cl else None
    return {
        "status": "CALCULATED",
        "currentAssets": asdict(current_assets),
        "currentLiabilities": asdict(current_liabilities),
        "workingCapital": wc,
        "currentRatio": ratio,
        "ar": ar,
        "ap": ap,
        "inventory": inventory,
        "shortTermDebt": short_term_debt,
        "kind": "HVCG_CALCULATION",
    }


@dataclass
class WipProject:
    project: str
    contract_value: float
    approved_change_orders: float = 0
    billed_to_date: float = 0
    collected_to_date: float = 0
    cost_to_date: float = 0
    estimated_cost_to_complete: float = 0
    earned_revenue: float | None = None
    source: str = "CLIENT_PROVIDED_DATA"


def wip_summary(projects: list[WipProject | dict] | None, *, applicable: bool) -> dict[str, Any]:
    if not applicable:
        return {"status": "NOT_APPLICABLE", "projects": [], "note": "WIP not applicable for this business type."}
    rows = []
    for p in projects or []:
        proj = p if isinstance(p, WipProject) else WipProject(**p)
        contract = proj.contract_value + proj.approved_change_orders
        etc = proj.cost_to_date + proj.estimated_cost_to_complete
        remaining = contract - proj.billed_to_date
        under = max(0.0, (proj.earned_revenue or 0) - proj.billed_to_date) if proj.earned_revenue is not None else None
        over = max(0.0, proj.billed_to_date - (proj.earned_revenue or 0)) if proj.earned_revenue is not None else None
        margin = None
        if etc:
            margin = round((contract - etc) / contract * 100, 1) if contract else None
        rows.append(
            {
                **asdict(proj),
                "remainingBacklog": remaining,
                "grossMarginPct": margin,
                "underbilling": under,
                "overbilling": over,
            }
        )
    return {"status": "PRESENT", "projects": rows, "note": "Do not create accounting entries.", "kind": "HVCG_CALCULATION"}


# --- Budget / KPIs / issues / decisions ---


def budget_vs_actual(budget: dict[str, float], actual: dict[str, float]) -> dict[str, Any]:
    thr = load_cfo_policy()["budgetMaterialityPercent"]
    rows = []
    for k, b in budget.items():
        a = actual.get(k)
        if a is None:
            continue
        var = a - b
        pct = (var / b * 100.0) if b else None
        rows.append(
            {
                "metric": k,
                "budget": b,
                "actual": a,
                "variance": var,
                "variancePercent": round(pct, 1) if pct is not None else None,
                "materialityFlag": abs(pct or 0) >= thr,
                "advisorNote": None,
            }
        )
    return {"rows": rows, "budgetVersion": "v1", "note": "Approved budget not overwritten by forecast changes."}


def kpi_scorecard(metrics: dict[str, dict[str, Any]]) -> dict[str, Any]:
    """metrics[name] = {actual, target?, prior?, source, targetOrigin?}"""
    catalog = set(load_cfo_policy()["kpiCatalog"])
    rows = []
    for name, m in metrics.items():
        if name not in catalog:
            continue
        if m.get("actual") is None and m.get("insufficient"):
            rows.append({"metric": name, "status": "INSUFFICIENT_DATA", "source": m.get("source")})
            continue
        target = m.get("target")
        origin = m.get("targetOrigin")
        if target is not None and not origin:
            raise ValueError(f"KPI target for {name} requires origin (client-approved / HVCG recommendation / benchmark)")
        rows.append(
            {
                "metric": name,
                "actual": m.get("actual"),
                "target": target,
                "priorPeriod": m.get("prior"),
                "trend": m.get("trend"),
                "status": m.get("status") or "OK",
                "source": m.get("source"),
                "targetOrigin": origin,
                "kind": m.get("kind") or "HVCG_CALCULATION",
            }
        )
    return {"scorecard": rows, "note": "Only evidence-supported meaningful metrics."}


def draft_management_report(ctx: dict[str, Any]) -> dict[str, Any]:
    compliance = load_compliance()
    sections = {
        "Executive Financial Summary": {"text": ctx.get("execSummary") or "", "kind": "AI_INFERENCE"},
        "Revenue & Margin": {"text": ctx.get("revenueMargin") or "", "kind": "SOURCE_ACCOUNTING_DATA"},
        "Cash Position": {"text": ctx.get("cash") or "", "kind": "BANK_DATA"},
        "13-Week Forecast": {"text": ctx.get("forecast") or "", "kind": "HVCG_FORECAST"},
        "AR": {"text": ctx.get("ar") or "", "kind": "HVCG_CALCULATION"},
        "AP": {"text": ctx.get("ap") or "", "kind": "HVCG_CALCULATION"},
        "Debt": {"text": ctx.get("debt") or "", "kind": "CLIENT_PROVIDED_DATA"},
        "Working Capital": {"text": ctx.get("wc") or "", "kind": "HVCG_CALCULATION"},
        "Budget vs Actual": {"text": ctx.get("budget") or "", "kind": "HVCG_CALCULATION"},
        "WIP / Backlog": {"text": ctx.get("wip") or "NOT_APPLICABLE", "kind": "HVCG_CALCULATION"},
        "KPI Scorecard": {"text": ctx.get("kpi") or "", "kind": "HVCG_CALCULATION"},
        "Key Risks": {"text": ctx.get("risks") or "", "kind": "AI_INFERENCE"},
        "Key Opportunities": {"text": ctx.get("opportunities") or "", "kind": "AI_INFERENCE"},
        "Capital Readiness Impact": {"text": ctx.get("capital") or "", "kind": "HVCG_CALCULATION"},
        "Decisions Required": {"text": ctx.get("decisions") or "", "kind": "ADVISOR_JUDGMENT"},
        "Next 30 Days": {"text": ctx.get("next30") or "", "kind": "ADVISOR_JUDGMENT"},
        "Advisor Commentary": {"text": None, "kind": "ADVISOR_JUDGMENT", "pendingHuman": True},
        "Disclaimer": {
            "text": compliance["language"]["generalAdvisory"] + " Not a CPA-reviewed statement unless separately provided by a CPA.",
            "kind": "COMPLIANCE",
        },
    }
    body = ["# HVCG MONTHLY MANAGEMENT REPORT (DRAFT)", f"Period: {ctx.get('period')}", ""]
    for title, block in sections.items():
        body += [f"## {title}", f"[{block['kind']}] {block.get('text') or '(pending)'}", ""]
    return {
        "period": ctx.get("period"),
        "version": "v1",
        "createdDate": _now(),
        "advisor": None,
        "approval": "DRAFT",
        "sourceSnapshot": ctx.get("sourceSnapshot"),
        "supersededVersion": None,
        "sections": sections,
        "body": "\n".join(body),
        "humanApprovalRequired": True,
        "canAutoSend": False,
        "blC1Active": True,
    }


def advisor_interpret(cycle: dict[str, Any], *, advisor: str, conclusion: str, facts: list[str], calculations: list[str], ai_obs: list[str]) -> dict[str, Any]:
    out = deepcopy(cycle)
    out["advisorInterpretation"] = {
        "advisor": advisor,
        "conclusion": conclusion,
        "at": _now(),
        "FACT": facts,
        "CALCULATION": calculations,
        "AI_OBSERVATION": ai_obs,
        "ADVISOR_CONCLUSION": [conclusion],
        "kind": "ADVISOR_JUDGMENT",
    }
    out.setdefault("audit", []).append({"event": "advisor_interpretation", "advisor": advisor, "at": _now()})
    return out


def approve_management_report(report: dict[str, Any], *, advisor: str) -> dict[str, Any]:
    out = deepcopy(report)
    out["approval"] = "APPROVED_INTERNAL"
    out["advisor"] = advisor
    out["sections"]["Advisor Commentary"]["text"] = out["sections"]["Advisor Commentary"].get("text") or "Approved by advisor"
    out["sections"]["Advisor Commentary"]["pendingHuman"] = False
    out.setdefault("audit", []).append({"event": "report_approved_internal", "advisor": advisor, "at": _now()})
    # still cannot auto-send
    out["canAutoSend"] = False
    return out


@dataclass
class FinancialIssue:
    issue: str
    severity: str
    evidence: str
    owner: str
    action: str
    due_date: str | None = None
    status: str = "Open"
    advisor_decision: str | None = None


@dataclass
class OwnerDecision:
    decision: str
    date: str
    decision_maker: str
    supporting_data: str
    expected_impact: str | None = None
    follow_up_date: str | None = None
    outcome: str | None = None


def recurring_cfo_tasks(engagement_id: str) -> list[dict[str, Any]]:
    return [
        {"engagementId": engagement_id, "task": t, "cadence": "Monthly", "status": "Planned", "externalSend": False}
        for t in load_cfo_policy()["recurringTasks"]
    ]


# --- Capital continuity ---


def capital_readiness_monitor(*, prior_score: float | None, latest_score: float | None, material_flags: list[str]) -> dict[str, Any]:
    if latest_score is None:
        return {"status": "Watch", "note": "Insufficient latest score", "autoRegenerateForbidden": True}
    if prior_score is None:
        status = "Stable"
    elif latest_score - prior_score >= 5:
        status = "Improved"
    elif prior_score - latest_score >= 5:
        status = "Material Change"
    elif material_flags:
        status = "Watch"
    else:
        status = "Stable"
    if "REASSESS" in material_flags or status == "Material Change":
        if "cash crunch" in " ".join(material_flags).lower() or any("CASH" in f or "DEBT" in f for f in material_flags):
            status = "Reassessment Recommended"
    return {
        "status": status,
        "priorScore": prior_score,
        "latestScore": latest_score,
        "autoRegenerateForbidden": True,
        "note": "Do not auto-regenerate official readiness without approval process.",
        "reuseEngine": "capital_readiness.run_capital_readiness_diagnostic",
    }


def recommend_capital_opportunity_from_cfo(
    *,
    engagement_id: str,
    client: str,
    reason: str,
    amount: float | None,
    advisor: str,
) -> dict[str, Any]:
    return {
        "recommendation": {
            "fromEngagement": engagement_id,
            "client": client,
            "reason": reason,
            "suggestedAmount": amount,
            "nextStep": "Human Review → Capital Diagnostic / Capital Package",
            "reuseCapitalEngine": True,
            "duplicateCapitalArchitectureForbidden": True,
            "canContactLender": False,
            "autoSellForbidden": True,
        },
        "humanApprovalRequired": True,
        "approved": False,
        "requestedBy": advisor,
        "at": _now(),
    }


def approve_capital_recommendation(rec: dict[str, Any], *, advisor: str) -> dict[str, Any]:
    out = deepcopy(rec)
    out["approved"] = True
    out["approvedBy"] = advisor
    out["at"] = _now()
    # Kick diagnostic using existing engine (caller supplies full payload usually)
    return out


def run_cross_sell_to_capital(rec: dict[str, Any], diagnostic_payload: dict[str, Any]) -> dict[str, Any]:
    if not rec.get("approved"):
        return {"errors": ["Human approval required before Capital Diagnostic"], "diagnostic": None}
    diag = run_capital_readiness_diagnostic(diagnostic_payload)
    return {
        "errors": [],
        "diagnostic": diag,
        "canContactLender": False,
        "engine": "capital_readiness",
        "duplicateArchitecture": False,
    }


def attempt_external_cfo_send(*, channel: str) -> dict[str, Any]:
    return {
        "allowed": False,
        "channel": channel,
        "errors": [f"BL-C1: automatic {channel} send not authorized in Sprint 7"],
        "at": _now(),
    }


def source_freshness_flags(sources: list[dict[str, Any]]) -> list[dict[str, Any]]:
    policy = load_cfo_policy()["freshnessPolicyDays"]
    flags = []
    for s in sources:
        dtype = s.get("data_type") or s.get("dataType")
        key = None
        if "BANK" in str(s.get("authority_class", "")).upper() or dtype == "Bank":
            key = "BANK_DATA"
        elif dtype in {"AR", "AP", "FINANCIAL_STATEMENTS", "TAX_RETURNS", "WIP", "FORECAST"}:
            key = dtype
        if not key:
            continue
        max_age = policy.get(key)
        as_of = s.get("as_of_date") or s.get("asOfDate")
        if not as_of or not max_age:
            continue
        try:
            dt = datetime.fromisoformat(as_of.replace("Z", ""))
            age = (datetime.now(timezone.utc).replace(tzinfo=None) - dt).days
            if age > max_age:
                flags.append({"code": "STALE_DATA", "source": s.get("system_source"), "dataType": dtype, "ageDays": age, "maxAgeDays": max_age})
        except ValueError:
            flags.append({"code": "UNPARSEABLE_DATE", "source": s.get("system_source")})
    return flags
