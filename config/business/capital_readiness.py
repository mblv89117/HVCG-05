"""HVCG Capital Readiness Engine (Development) — BA-C Sprint 5.

Reuses Capital OS lists/contracts. Explainable scoring. Missing ≠ Failed.
Does not guarantee financing, contact lenders, or mutate Production.
"""

from __future__ import annotations

import json
from copy import deepcopy
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pricing_policy import CURRENT_NEW_CLIENT_RATE_CARD, is_legacy_client, load_json

BUSINESS = Path(__file__).resolve().parent
BL_C1_ACTIVE = True
AGENT_CODE = "AGT-CAP-READY"
PACKAGE_OFFER = "OFF-CAP-PKG"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_scoring_policy() -> dict[str, Any]:
    return load_json("capital-readiness-scoring.json")


def load_compliance() -> dict[str, Any]:
    return load_json("compliance-language.json")


# --- Provenance ---


@dataclass
class ProvenancedValue:
    field: str
    value: Any
    state: str  # PRESENT | MISSING | FAILED | NOT_APPLICABLE | UNKNOWN
    kind: str  # FACT | CALCULATED | AI_INFERENCE | ADVISOR_JUDGMENT
    source: str | None = None
    period_end: str | None = None
    received_date: str | None = None
    source_date: str | None = None
    last_verified: str | None = None
    notes: str | None = None


def pv(
    field: str,
    value: Any,
    *,
    state: str = "PRESENT",
    kind: str = "FACT",
    source: str | None = None,
    period_end: str | None = None,
    received_date: str | None = None,
    source_date: str | None = None,
    last_verified: str | None = None,
    notes: str | None = None,
) -> ProvenancedValue:
    if value is None and state == "PRESENT":
        state = "MISSING"
    return ProvenancedValue(
        field=field,
        value=value,
        state=state,
        kind=kind,
        source=source,
        period_end=period_end,
        received_date=received_date,
        source_date=source_date,
        last_verified=last_verified,
        notes=notes,
    )


def detect_source_conflicts(values: list[ProvenancedValue]) -> list[dict[str, Any]]:
    """Same field with differing PRESENT FACT values → SOURCE_CONFLICT."""
    by_field: dict[str, list[ProvenancedValue]] = {}
    for v in values:
        if v.state != "PRESENT" or v.kind not in {"FACT", "CALCULATED"}:
            continue
        by_field.setdefault(v.field, []).append(v)
    conflicts = []
    for fname, items in by_field.items():
        uniq = {json.dumps(i.value, sort_keys=True, default=str) for i in items}
        if len(uniq) > 1:
            conflicts.append(
                {
                    "code": "SOURCE_CONFLICT",
                    "field": fname,
                    "values": [asdict(i) for i in items],
                    "resolution": "ADVISOR_REQUIRED",
                }
            )
    return conflicts


def freshness_flag(value: ProvenancedValue, *, max_age_days: int | None = None) -> dict[str, Any] | None:
    policy = load_scoring_policy()
    days = max_age_days if max_age_days is not None else int(policy.get("freshnessDaysDefault", 120))
    ref = value.source_date or value.period_end or value.last_verified
    if not ref or value.state != "PRESENT":
        return None
    try:
        dt = datetime.fromisoformat(ref.replace("Z", "+00:00"))
    except ValueError:
        return {"code": "STALE_OR_UNPARSEABLE_DATE", "field": value.field, "ref": ref}
    age = (datetime.now(timezone.utc) - dt.astimezone(timezone.utc)).days
    if age > days:
        return {"code": "STALE_DATA", "field": value.field, "ageDays": age, "maxAgeDays": days, "ref": ref}
    return None


# --- Capital request / use of funds / debt ---


@dataclass
class UseOfFundsLine:
    category: str
    amount: float
    description: str = ""
    priority: str = "Normal"
    evidence: str | None = None
    eligibilityFlag: str = "UNREVIEWED"  # UNREVIEWED | ELIGIBLE_CANDIDATE | QUESTIONABLE — not legal determination


@dataclass
class CapitalRequest:
    amount_requested: float
    minimum_acceptable: float | None = None
    preferred_capital_type: str = "Working Capital"
    alternative_capital_types: list[str] = field(default_factory=list)
    use_of_funds: list[UseOfFundsLine] = field(default_factory=list)
    timing: str | None = None
    purpose: str | None = None
    expected_impact: str | None = None
    existing_lender_discussions: str | None = None
    collateral: str | None = None
    refinance_need: bool = False
    working_capital_need: bool = False
    acquisition_need: bool = False
    equipment_need: bool = False
    real_estate_need: bool = False
    ar_facility_need: bool = False
    bridge_need: bool = False


@dataclass
class DebtLine:
    creditor: str
    original_balance: float | None = None
    current_balance: float | None = None
    interest_rate: float | None = None
    monthly_payment: float | None = None
    maturity: str | None = None
    collateral: str | None = None
    loan_type: str | None = None
    status: str | None = None
    refinance_candidate: bool = False
    payoff_amount: float | None = None
    payoff_date: str | None = None
    source_evidence: str | None = None


def aggregate_debt(lines: list[DebtLine]) -> dict[str, Any]:
    total = sum(l.current_balance or 0 for l in lines)
    monthly = sum(l.monthly_payment or 0 for l in lines)
    secured = sum(
        (l.current_balance or 0) for l in lines if l.collateral and str(l.collateral).strip().lower() not in {"", "none", "n/a"}
    )
    return {
        "totalDebt": total,
        "monthlyDebtService": monthly,
        "securedDebt": secured,
        "unsecuredDebt": total - secured,
        "lineCount": len(lines),
        "kind": "CALCULATED",
        "source": "debt_schedule_aggregation",
    }


def compute_dscr(
    *,
    noi_or_ebitda: ProvenancedValue | None,
    debt_service: ProvenancedValue | None,
    period: str | None = None,
) -> dict[str, Any]:
    policy = load_scoring_policy()["dscr"]
    if (
        not noi_or_ebitda
        or not debt_service
        or noi_or_ebitda.state != "PRESENT"
        or debt_service.state != "PRESENT"
        or noi_or_ebitda.value is None
        or debt_service.value is None
        or float(debt_service.value) == 0
    ):
        return {
            "status": "INSUFFICIENT_DATA",
            "result": None,
            "numerator": asdict(noi_or_ebitda) if noi_or_ebitda else None,
            "denominator": asdict(debt_service) if debt_service else None,
            "period": period,
            "formula": policy["formula"],
            "kind": "CALCULATED",
            "notLenderUnderwriting": True,
            "timestamp": _now(),
        }
    num = float(noi_or_ebitda.value)
    den = float(debt_service.value)
    return {
        "status": "CALCULATED",
        "result": round(num / den, 3),
        "numerator": asdict(noi_or_ebitda),
        "denominator": asdict(debt_service),
        "period": period,
        "formula": policy["formula"],
        "kind": "CALCULATED",
        "notLenderUnderwriting": True,
        "timestamp": _now(),
    }


# --- Documents ---


def build_document_checklist(
    *,
    financing_type: str,
    amount: float | None = None,
    transaction_hints: dict[str, bool] | None = None,
) -> dict[str, Any]:
    """AGT-DOC-CHECKLIST integration — conditional by financing type (not universal)."""
    policy = load_scoring_policy()
    catalog = {d["code"]: d["label"] for d in policy["documentCatalog"]}
    reqs = list(policy["documentRequirementsByFinancingType"].get(financing_type) or policy["documentRequirementsByFinancingType"]["Other"])
    hints = transaction_hints or {}
    if hints.get("acquisition") and "CONTRACTS" not in reqs:
        reqs.append("CONTRACTS")
    if hints.get("real_estate") and "COLLATERAL" not in reqs:
        reqs.append("COLLATERAL")
    if hints.get("sba") and "SBA_FORMS" not in reqs:
        reqs.append("SBA_FORMS")
    if amount and amount >= 1_000_000 and "PROJECTIONS" not in reqs:
        reqs.append("PROJECTIONS")
    return {
        "agent": "AGT-DOC-CHECKLIST",
        "financingType": financing_type,
        "required": [{"code": c, "label": catalog.get(c, c), "status": "MISSING"} for c in reqs],
        "note": "Conditional checklist — not a universal capital document dump.",
    }


def score_document_completeness(checklist: dict[str, Any], received: dict[str, str]) -> dict[str, Any]:
    """received: code -> PRESENT|ACCEPTED|REJECTED|MISSING|NOT_APPLICABLE"""
    required = checklist["required"]
    counts = {"required": 0, "received": 0, "accepted": 0, "rejected": 0, "missing": 0, "notApplicable": 0}
    details = []
    for item in required:
        code = item["code"]
        status = received.get(code, "MISSING")
        if status == "NOT_APPLICABLE":
            counts["notApplicable"] += 1
            details.append({**item, "status": status})
            continue
        counts["required"] += 1
        if status in {"PRESENT", "ACCEPTED", "RECEIVED"}:
            counts["received"] += 1
            if status == "ACCEPTED":
                counts["accepted"] += 1
            details.append({**item, "status": status})
        elif status in {"REJECTED", "NEEDS_REPLACEMENT"}:
            counts["rejected"] += 1
            details.append({**item, "status": status})
        else:
            counts["missing"] += 1
            details.append({**item, "status": "MISSING"})
    denom = max(counts["required"], 1)
    pct = round(100.0 * counts["received"] / denom, 1)
    return {
        **counts,
        "documentCompletenessPercent": pct,
        "details": details,
        "note": "Document completeness ≠ lender readiness.",
        "kind": "CALCULATED",
    }


# --- Scoring ---


def _clamp(n: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, n))


def _band_for(score: float) -> dict[str, Any]:
    for b in load_scoring_policy()["bands"]:
        if b["min"] <= score <= b["max"]:
            return b
    return load_scoring_policy()["bands"][-1]


def calculate_readiness_score(ctx: dict[str, Any]) -> dict[str, Any]:
    """Explainable 0–100 score from configurable dimension weights."""
    policy = load_scoring_policy()
    dims_out: list[dict[str, Any]] = []
    total = 0.0
    conflicts = ctx.get("conflicts") or []
    doc = ctx.get("documentCompleteness") or {}
    dscr = ctx.get("dscr") or {}
    debt_agg = ctx.get("debtAggregate") or {}
    request: CapitalRequest = ctx["request"]
    signals = ctx.get("signals") or []
    stale = ctx.get("staleFlags") or []

    # Financial readiness (25)
    fin = 25.0
    fin_evidence = []
    fin_missing = []
    if any(s.get("code") == "NEGATIVE_CASH_FLOW" for s in signals):
        fin -= 10
        fin_evidence.append({"flag": "NEGATIVE_CASH_FLOW", "kind": "FACT"})
    if any(s.get("code") == "DECLINING_REVENUE" for s in signals):
        fin -= 6
        fin_evidence.append({"flag": "DECLINING_REVENUE", "kind": "FACT"})
    if any(s.get("code") == "STRONG_REVENUE_HISTORY" for s in signals):
        fin_evidence.append({"flag": "STRONG_REVENUE_HISTORY", "kind": "FACT"})
    if any(s.get("code") == "POSITIVE_CASH_FLOW" for s in signals):
        fin_evidence.append({"flag": "POSITIVE_CASH_FLOW", "kind": "FACT"})
    revenue = ctx.get("revenue")
    if not revenue or revenue.state in {"MISSING", "UNKNOWN"}:
        fin -= 5
        fin_missing.append("revenue")
    fin = _clamp(fin, 0, 25)
    dims_out.append(
        {
            "dimension": "financial_readiness",
            "score": fin,
            "maximum": 25,
            "evidence": fin_evidence,
            "missingData": fin_missing,
            "flags": [e["flag"] for e in fin_evidence],
            "rationale": "Financial signals with provenance; missing revenue reduces score without inventing negatives.",
            "source": "capital_readiness.calculate_readiness_score",
            "lastUpdated": _now(),
            "valueKind": "CALCULATED",
        }
    )

    # Documentation (20)
    pct = float(doc.get("documentCompletenessPercent") or 0)
    doc_score = round(20.0 * (pct / 100.0), 1)
    dims_out.append(
        {
            "dimension": "documentation_readiness",
            "score": doc_score,
            "maximum": 20,
            "evidence": [{"documentCompletenessPercent": pct, "kind": "CALCULATED"}],
            "missingData": [d["code"] for d in doc.get("details", []) if d.get("status") == "MISSING"],
            "flags": ["DOCUMENTATION_INCOMPLETE"] if pct < 100 else ["DOCUMENTATION_COMPLETE"],
            "rationale": "Missing docs are MISSING evidence — not automatic compliance failure.",
            "source": "document_checklist",
            "lastUpdated": _now(),
            "valueKind": "CALCULATED",
        }
    )

    # Debt / cash flow (20)
    debt_score = 20.0
    debt_flags = []
    debt_missing = []
    if dscr.get("status") == "INSUFFICIENT_DATA":
        debt_score -= 6
        debt_missing.append("dscr_inputs")
        debt_flags.append("INSUFFICIENT_DATA_DSCR")
    elif dscr.get("status") == "CALCULATED":
        if dscr["result"] is not None and dscr["result"] < 1.0:
            debt_score -= 12
            debt_flags.append("EXCESSIVE_DEBT_SERVICE_BURDEN")
        elif dscr["result"] is not None and dscr["result"] < 1.25:
            debt_score -= 6
            debt_flags.append("TIGHT_DSCR")
        else:
            debt_flags.append("ADEQUATE_DSCR_PROXY")
    monthly = debt_agg.get("monthlyDebtService")
    if monthly and ctx.get("cash") and ctx["cash"].state == "PRESENT" and ctx["cash"].value is not None:
        if float(monthly) > float(ctx["cash"].value) * 0.5:
            debt_score -= 4
            debt_flags.append("DEBT_SERVICE_VS_CASH_PRESSURE")
    debt_score = _clamp(debt_score, 0, 20)
    dims_out.append(
        {
            "dimension": "debt_cashflow_capacity",
            "score": debt_score,
            "maximum": 20,
            "evidence": [{"dscr": dscr, "debtAggregate": debt_agg}],
            "missingData": debt_missing,
            "flags": debt_flags,
            "rationale": "DSCR only when authoritative inputs exist; otherwise INSUFFICIENT_DATA.",
            "source": "debt_schedule+dscr",
            "lastUpdated": _now(),
            "valueKind": "CALCULATED",
        }
    )

    # Business stability (15)
    stab = 15.0
    stab_flags = []
    age = ctx.get("businessAgeYears")
    if age is None:
        stab -= 3
        stab_flags.append("UNKNOWN_OPERATING_HISTORY")
    elif age < 2:
        stab -= 8
        stab_flags.append("SHORT_OPERATING_HISTORY")
    if any(s.get("code") == "CUSTOMER_CONCENTRATION" for s in signals):
        stab -= 4
        stab_flags.append("CUSTOMER_CONCENTRATION")
    if any(s.get("code") == "RECURRING_CONTRACTS" for s in signals):
        stab_flags.append("RECURRING_CONTRACTS")
    stab = _clamp(stab, 0, 15)
    dims_out.append(
        {
            "dimension": "business_stability",
            "score": stab,
            "maximum": 15,
            "evidence": [{"businessAgeYears": age}],
            "missingData": ["businessAgeYears"] if age is None else [],
            "flags": stab_flags,
            "rationale": "Operating history and concentration signals.",
            "source": "client_profile",
            "lastUpdated": _now(),
            "valueKind": "CALCULATED",
        }
    )

    # Capital request clarity (10)
    clarity = 10.0
    clarity_flags = []
    if not request.use_of_funds:
        clarity -= 5
        clarity_flags.append("UNCLEAR_USE_OF_FUNDS")
    else:
        uof_sum = sum(l.amount for l in request.use_of_funds)
        if abs(uof_sum - request.amount_requested) > max(1.0, request.amount_requested * 0.05):
            clarity -= 3
            clarity_flags.append("USE_OF_FUNDS_AMOUNT_MISMATCH")
        else:
            clarity_flags.append("CLEAR_USE_OF_FUNDS")
    if not request.purpose and not request.timing:
        clarity -= 2
        clarity_flags.append("REQUEST_DETAILS_THIN")
    clarity = _clamp(clarity, 0, 10)
    dims_out.append(
        {
            "dimension": "capital_request_clarity",
            "score": clarity,
            "maximum": 10,
            "evidence": [{"amount": request.amount_requested, "uofLines": len(request.use_of_funds)}],
            "missingData": [],
            "flags": clarity_flags,
            "rationale": "Structured capital request and use-of-funds schedule.",
            "source": "capital_request",
            "lastUpdated": _now(),
            "valueKind": "CALCULATED",
        }
    )

    # Lender / transaction readiness (10)
    lender = 10.0
    lender_flags = []
    if conflicts:
        lender -= 5
        lender_flags.append("SOURCE_CONFLICT")
    if stale:
        lender -= 2
        lender_flags.append("STALE_DATA")
    if any(s.get("code") == "DOCUMENTATION_INCONSISTENCY" for s in signals):
        lender -= 3
        lender_flags.append("DOCUMENTATION_INCONSISTENCY")
    if pct >= 90 and not conflicts:
        lender_flags.append("TRANSACTION_PACKAGING_READY_CANDIDATE")
    lender = _clamp(lender, 0, 10)
    dims_out.append(
        {
            "dimension": "lender_transaction_readiness",
            "score": lender,
            "maximum": 10,
            "evidence": [{"conflicts": len(conflicts), "stale": len(stale)}],
            "missingData": [],
            "flags": lender_flags,
            "rationale": "Conflicts and stale data block silent packaging.",
            "source": "provenance_checks",
            "lastUpdated": _now(),
            "valueKind": "CALCULATED",
        }
    )

    total = round(sum(d["score"] for d in dims_out), 1)
    band = _band_for(total)
    return {
        "score": total,
        "band": band,
        "dimensions": dims_out,
        "weights": policy["dimensions"],
        "advisoryOnly": True,
        "notApprovalProbability": True,
        "notCreditDecision": True,
        "notGuaranteeOfFinancing": True,
        "calculatedAt": _now(),
        "agent": AGENT_CODE,
    }


def derive_concerns_and_strengths(ctx: dict[str, Any], score_pkg: dict[str, Any]) -> tuple[list[dict], list[dict]]:
    concerns: list[dict] = []
    strengths: list[dict] = []
    for d in score_pkg["dimensions"]:
        for f in d.get("flags", []):
            entry = {
                "code": f,
                "dimension": d["dimension"],
                "evidence": d.get("evidence"),
                "kind": "CALCULATED",
            }
            if f in {
                "NEGATIVE_CASH_FLOW",
                "DECLINING_REVENUE",
                "EXCESSIVE_DEBT_SERVICE_BURDEN",
                "TIGHT_DSCR",
                "DOCUMENTATION_INCOMPLETE",
                "SHORT_OPERATING_HISTORY",
                "CUSTOMER_CONCENTRATION",
                "UNCLEAR_USE_OF_FUNDS",
                "SOURCE_CONFLICT",
                "STALE_DATA",
                "INSUFFICIENT_DATA_DSCR",
                "DOCUMENTATION_INCONSISTENCY",
                "USE_OF_FUNDS_AMOUNT_MISMATCH",
            }:
                concerns.append(entry)
            elif f in {
                "STRONG_REVENUE_HISTORY",
                "POSITIVE_CASH_FLOW",
                "DOCUMENTATION_COMPLETE",
                "ADEQUATE_DSCR_PROXY",
                "RECURRING_CONTRACTS",
                "CLEAR_USE_OF_FUNDS",
                "TRANSACTION_PACKAGING_READY_CANDIDATE",
            }:
                strengths.append(entry)
    for c in ctx.get("conflicts") or []:
        concerns.append({"code": "SOURCE_CONFLICT", "evidence": c, "kind": "FACT"})
    return concerns, strengths


def recommend_funding_paths(ctx: dict[str, Any], score_pkg: dict[str, Any], concerns: list[dict]) -> list[dict[str, Any]]:
    """Advisory paths only — human approval required. No securities solicitation."""
    paths: list[dict[str, Any]] = []
    ctype = ctx["request"].preferred_capital_type
    score = score_pkg["score"]
    concern_codes = {c["code"] for c in concerns}

    if score < 50 or "EXCESSIVE_DEBT_SERVICE_BURDEN" in concern_codes:
        paths.append(
            {
                "path": "NOT_READY_REMEDIATION_FIRST",
                "rationale": "Readiness below threshold or debt-service burden requires remediation first.",
                "humanApprovalRequired": True,
            }
        )
        if "EXCESSIVE_DEBT_SERVICE_BURDEN" in concern_codes:
            paths.append(
                {
                    "path": "DEBT_RESTRUCTURING",
                    "rationale": "Debt-service capacity concern evidenced in DSCR/debt aggregate.",
                    "humanApprovalRequired": True,
                }
            )
        return paths

    mapping = {
        "SBA": ["SBA_7A", "SBA_504"],
        "Working Capital": ["LINE_OF_CREDIT", "CONVENTIONAL_TERM_DEBT"],
        "Equipment Financing": ["EQUIPMENT_FINANCING"],
        "Commercial Real Estate": ["SBA_504", "CONVENTIONAL_TERM_DEBT"],
        "Private Credit": ["PRIVATE_CREDIT"],
        "Debt": ["CONVENTIONAL_TERM_DEBT", "LINE_OF_CREDIT"],
        "Hybrid": ["CONVENTIONAL_TERM_DEBT", "PRIVATE_CREDIT"],
        "Equity": ["EQUITY_REVIEW"],
    }
    for p in mapping.get(ctype, ["CAPITAL_STRATEGY_REVIEW"]):
        if p == "EQUITY_REVIEW":
            paths.append(
                {
                    "path": p,
                    "rationale": "Equity path flagged for human strategy review only — no autonomous securities recommendation.",
                    "humanApprovalRequired": True,
                    "securitiesAutomationForbidden": True,
                }
            )
        else:
            paths.append(
                {
                    "path": p,
                    "rationale": f"Aligned to preferred capital type {ctype} and score band {score_pkg['band']['code']}.",
                    "humanApprovalRequired": True,
                }
            )
    if ctx["request"].ar_facility_need:
        paths.append({"path": "AR_RECEIVABLES_FACILITY", "rationale": "AR facility need indicated on request.", "humanApprovalRequired": True})
    if ctx["request"].bridge_need:
        paths.append({"path": "BRIDGE_CAPITAL", "rationale": "Bridge need indicated on request.", "humanApprovalRequired": True})
    if ctx["request"].acquisition_need:
        paths.append({"path": "ACQUISITION_FINANCING", "rationale": "Acquisition need indicated.", "humanApprovalRequired": True})
    return paths


def recommend_next_step(score_pkg: dict[str, Any], concerns: list[dict], doc: dict[str, Any]) -> str:
    codes = {c["code"] for c in concerns}
    if score_pkg["score"] < 50:
        return "NOT_READY"
    if "SOURCE_CONFLICT" in codes:
        return "CAPITAL_STRATEGY_REVIEW"
    if "EXCESSIVE_DEBT_SERVICE_BURDEN" in codes:
        return "DEBT_RESTRUCTURE_REVIEW"
    if doc.get("documentCompletenessPercent", 0) < 70:
        return "DOCUMENTATION_REQUIRED"
    if "NEGATIVE_CASH_FLOW" in codes or "DECLINING_REVENUE" in codes:
        return "FINANCIAL_CLEANUP_REQUIRED"
    if score_pkg["band"]["code"] == "CAPITAL_READY":
        return "READY_FOR_LENDER_READY_PACKAGE"
    if score_pkg["band"]["code"] == "READY_WITH_MINOR_CONDITIONS":
        return "READY_WITH_CONDITIONS"
    if "SHORT_OPERATING_HISTORY" in codes:
        return "CFO_SUPPORT_RECOMMENDED"
    return "CAPITAL_STRATEGY_REVIEW"


# --- Agent runtime ---


def run_capital_readiness_diagnostic(payload: dict[str, Any]) -> dict[str, Any]:
    """AGT-CAP-READY runtime beyond config-only.

    Inputs expected in payload (Dev):
      client, opportunityId, diagnosticId, request (CapitalRequest|dict),
      documentsReceived, debtLines, provenancedValues, signals, businessAgeYears,
      clientClassification, contractedCurrent
    """
    audit: list[dict[str, Any]] = [{"event": "capital_diagnostic_started", "at": _now(), "agent": AGENT_CODE}]
    request_raw = payload.get("request") or {}
    if isinstance(request_raw, CapitalRequest):
        request = request_raw
    else:
        uof = [
            UseOfFundsLine(**x) if not isinstance(x, UseOfFundsLine) else x
            for x in (request_raw.get("use_of_funds") or [])
        ]
        request = CapitalRequest(
            amount_requested=float(request_raw.get("amount_requested") or request_raw.get("amountRequested") or 0),
            minimum_acceptable=request_raw.get("minimum_acceptable"),
            preferred_capital_type=request_raw.get("preferred_capital_type")
            or request_raw.get("preferredCapitalType")
            or "Working Capital",
            alternative_capital_types=request_raw.get("alternative_capital_types") or [],
            use_of_funds=uof,
            timing=request_raw.get("timing"),
            purpose=request_raw.get("purpose"),
            expected_impact=request_raw.get("expected_impact"),
            existing_lender_discussions=request_raw.get("existing_lender_discussions"),
            collateral=request_raw.get("collateral"),
            refinance_need=bool(request_raw.get("refinance_need")),
            working_capital_need=bool(request_raw.get("working_capital_need")),
            acquisition_need=bool(request_raw.get("acquisition_need")),
            equipment_need=bool(request_raw.get("equipment_need")),
            real_estate_need=bool(request_raw.get("real_estate_need")),
            ar_facility_need=bool(request_raw.get("ar_facility_need")),
            bridge_need=bool(request_raw.get("bridge_need")),
        )

    checklist = build_document_checklist(
        financing_type=request.preferred_capital_type,
        amount=request.amount_requested,
        transaction_hints={
            "acquisition": request.acquisition_need,
            "real_estate": request.real_estate_need,
            "sba": request.preferred_capital_type == "SBA",
        },
    )
    doc = score_document_completeness(checklist, payload.get("documentsReceived") or {})
    audit.append({"event": "document_checklist_built", "required": doc["required"], "completeness": doc["documentCompletenessPercent"]})

    debt_lines = [
        DebtLine(**x) if isinstance(x, dict) else x for x in (payload.get("debtLines") or [])
    ]
    debt_agg = aggregate_debt(debt_lines)

    values: list[ProvenancedValue] = []
    for v in payload.get("provenancedValues") or []:
        values.append(v if isinstance(v, ProvenancedValue) else ProvenancedValue(**v))

    conflicts = detect_source_conflicts(values)
    stale = [f for f in (freshness_flag(v) for v in values) if f]
    audit.append({"event": "provenance_checked", "conflicts": len(conflicts), "stale": len(stale)})

    def find(field: str) -> ProvenancedValue | None:
        for v in values:
            if v.field == field and v.state == "PRESENT":
                return v
        return None

    noi = find("noi_or_ebitda") or find("ebitda")
    debt_service = find("annual_debt_service")
    monthly_ds = find("monthly_debt_service")
    if debt_service is None and monthly_ds and monthly_ds.state == "PRESENT" and monthly_ds.value is not None:
        debt_service = pv(
            "annual_debt_service",
            float(monthly_ds.value) * 12.0,
            kind="CALCULATED",
            source=f"annualized_from_monthly:{monthly_ds.source or 'monthly_debt_service'}",
            notes="Monthly debt service × 12 for DSCR period alignment with annual NOI/EBITDA proxy",
        )
    if debt_service is None and debt_agg["monthlyDebtService"]:
        debt_service = pv(
            "annual_debt_service",
            float(debt_agg["monthlyDebtService"]) * 12.0,
            kind="CALCULATED",
            source="debt_schedule_aggregation_annualized",
        )
    dscr = compute_dscr(noi_or_ebitda=noi, debt_service=debt_service, period=payload.get("dscrPeriod") or "annual")

    ctx = {
        "request": request,
        "documentCompleteness": doc,
        "debtAggregate": debt_agg,
        "dscr": dscr,
        "conflicts": conflicts,
        "staleFlags": stale,
        "signals": payload.get("signals") or [],
        "businessAgeYears": payload.get("businessAgeYears"),
        "revenue": find("revenue"),
        "cash": find("cash"),
    }
    score_pkg = calculate_readiness_score(ctx)
    concerns, strengths = derive_concerns_and_strengths(ctx, score_pkg)
    paths = recommend_funding_paths(ctx, score_pkg, concerns)
    next_step = recommend_next_step(score_pkg, concerns, doc)
    audit.append({"event": "score_calculated", "score": score_pkg["score"], "band": score_pkg["band"]["code"], "nextStep": next_step})

    compliance = load_compliance()
    disclaimer = (
        compliance["language"]["generalAdvisory"]
        + " "
        + compliance["language"]["financing"]
        + " "
        + compliance["language"]["aiSystems"]
    )

    summary = {
        "requestedCapital": request.amount_requested,
        "proposedUseOfFunds": [asdict(x) for x in request.use_of_funds],
        "readinessScore": score_pkg["score"],
        "scoreBreakdown": score_pkg["dimensions"],
        "band": score_pkg["band"],
        "documentationCompleteness": doc,
        "financialStrengths": strengths,
        "lenderConcerns": concerns,
        "missingInformation": doc.get("details", []),
        "readinessConditions": [c for c in concerns if c["code"] != "SOURCE_CONFLICT"],
        "potentialFundingPaths": paths,
        "recommendedNextStep": next_step,
        "advisorConclusion": None,  # requires human
        "complianceDisclaimer": disclaimer,
        "humanApprovalRequired": True,
        "humanApprovalStatus": "PENDING",
        "blC1Active": BL_C1_ACTIVE,
        "canContactLender": False,
        "canAutoSend": False,
    }

    memo = draft_capital_readiness_memo(summary, payload)
    handoff = None
    offer_rec = None

    result = {
        "agent": AGENT_CODE,
        "client": payload.get("client"),
        "opportunityId": payload.get("opportunityId"),
        "diagnosticId": payload.get("diagnosticId"),
        "capitalType": request.preferred_capital_type,
        "checklist": checklist,
        "summary": summary,
        "dscr": dscr,
        "debtAggregate": debt_agg,
        "conflicts": conflicts,
        "staleFlags": stale,
        "memoDraft": memo,
        "packageHandoff": handoff,
        "offerRecommendation": offer_rec,
        "audit": audit,
        "clientClassification": payload.get("clientClassification"),
        "contractedCurrent": payload.get("contractedCurrent"),
        "legacyPricingProtected": is_legacy_client(payload.get("clientClassification") or ""),
    }
    return result


def human_approve_readiness(
    result: dict[str, Any],
    *,
    advisor: str,
    conclusion: str,
    approve_funding_paths: bool = True,
    approve_package_handoff: bool = False,
) -> dict[str, Any]:
    """Human approval gate for score interpretation / paths / package handoff."""
    out = deepcopy(result)
    out["summary"]["advisorConclusion"] = {
        "advisor": advisor,
        "conclusion": conclusion,
        "at": _now(),
        "kind": "ADVISOR_JUDGMENT",
    }
    out["summary"]["humanApprovalStatus"] = "APPROVED"
    out["audit"].append({"event": "human_approval", "advisor": advisor, "at": _now()})

    if approve_funding_paths:
        out["summary"]["fundingPathsApproved"] = True

    next_step = out["summary"]["recommendedNextStep"]
    if approve_package_handoff and next_step in {
        "READY_FOR_LENDER_READY_PACKAGE",
        "READY_WITH_CONDITIONS",
    }:
        out["packageHandoff"] = build_financial_package_handoff(out)
        out["offerRecommendation"] = {
            "offerCode": PACKAGE_OFFER,
            "pricingVersion": CURRENT_NEW_CLIENT_RATE_CARD,
            "autoCreateProposal": False,
            "routeToProposalWorkflow": True,
            "legacyPricingProtected": out.get("legacyPricingProtected"),
            "contractedCurrent": out.get("contractedCurrent"),
            "note": "Recommendation only — does not mutate contracted economics; BL-C1 blocks send.",
        }
        out["audit"].append({"event": "package_handoff_created", "status": "READY_FOR_PACKAGE_BUILD"})
    return out


def build_financial_package_handoff(result: dict[str, Any]) -> dict[str, Any]:
    """Capital Readiness → Lender-Ready Capital Package → AGT-FIN-PKG contract."""
    s = result["summary"]
    return {
        "status": "READY_FOR_PACKAGE_BUILD",
        "agentTarget": "AGT-FIN-PKG",
        "client": result.get("client"),
        "capitalRequest": {
            "amount": s["requestedCapital"],
            "useOfFunds": s["proposedUseOfFunds"],
            "capitalType": result.get("capitalType"),
        },
        "score": s["readinessScore"],
        "band": s["band"],
        "gaps": [d for d in s.get("missingInformation", []) if d.get("status") == "MISSING"],
        "documents": s.get("documentationCompleteness"),
        "debtSchedule": result.get("debtAggregate"),
        "useOfFunds": s["proposedUseOfFunds"],
        "financialSignals": {
            "dscr": result.get("dscr"),
            "strengths": s.get("financialStrengths"),
            "concerns": s.get("lenderConcerns"),
        },
        "requiredPackageComponents": [d["code"] for d in (result.get("checklist") or {}).get("required", [])],
        "selectedFundingPath": (s.get("potentialFundingPaths") or [{}])[0].get("path"),
        "approval": s.get("advisorConclusion"),
        "auditContext": result.get("audit"),
        "canSubmitToLender": False,
        "blC1Active": True,
    }


def draft_capital_readiness_memo(summary: dict[str, Any], payload: dict[str, Any]) -> str:
    lines = [
        "# CAPITAL READINESS SUMMARY (DRAFT)",
        "",
        "## Executive Summary",
        f"Client: {payload.get('client')}",
        f"Requested capital: {summary['requestedCapital']}",
        f"Readiness score: {summary['readinessScore']} ({summary['band']['label']})",
        f"Recommended next step: {summary['recommendedNextStep']}",
        "Status: DRAFT — human review required. Not a lender commitment.",
        "",
        "## Capital Request",
        f"Amount: {summary['requestedCapital']}",
        "## Readiness Score",
        f"Score: {summary['readinessScore']} / 100",
        "## Financial Overview",
        f"Strengths: {len(summary.get('financialStrengths') or [])}",
        f"Concerns: {len(summary.get('lenderConcerns') or [])}",
        "",
        "## Documentation Status",
        f"Completeness: {summary['documentationCompleteness'].get('documentCompletenessPercent')}%",
        "",
        "## Strengths",
    ]
    for s in summary.get("financialStrengths") or []:
        lines.append(f"- {s['code']}")
    lines += ["", "## Lender Concerns"]
    for c in summary.get("lenderConcerns") or []:
        lines.append(f"- {c['code']}")
    lines += ["", "## Missing Items"]
    for d in summary.get("missingInformation") or []:
        if d.get("status") == "MISSING":
            lines.append(f"- {d.get('code')}: MISSING (not automatically FAILED)")
    lines += ["", "## Recommended Remediation", f"- Follow next step: {summary['recommendedNextStep']}", "", "## Potential Funding Paths"]
    for p in summary.get("potentialFundingPaths") or []:
        lines.append(f"- {p['path']}: {p['rationale']}")
    lines += [
        "",
        "## Recommended Next Step",
        summary["recommendedNextStep"],
        "",
        "## Limitations / Disclaimer",
        summary["complianceDisclaimer"],
    ]
    return "\n".join(lines)


def success_fee_foundation_for_capital(*, percentage: float | None = None) -> dict[str, Any]:
    return {
        "percentage": percentage,
        "base": "closed_financing_or_collected_cleared_as_agreed",
        "trigger": "funding_closed_per_agreement",
        "agreementStatus": "Not Proposed",
        "complianceFlag": True,
        "note": "Foundation only — full payout engine deferred.",
    }
