"""HVCG Lender-Ready Capital Package + Financial Package Agent (Development) — Sprint 6 BA-C2.

Consumes Capital Readiness handoff. Assembles package with provenance.
Never certifies financials, invents figures, or submits to lenders.
BL-C1: APPROVED_FOR_LENDER_SUBMISSION ≠ auto-submit.
"""

from __future__ import annotations

from copy import deepcopy
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any

from capital_readiness import (
    CapitalRequest,
    DebtLine,
    ProvenancedValue,
    UseOfFundsLine,
    aggregate_debt,
    build_document_checklist,
    build_financial_package_handoff,
    compute_dscr,
    detect_source_conflicts,
    freshness_flag,
    human_approve_readiness,
    pv,
    run_capital_readiness_diagnostic,
    score_document_completeness,
)
from pricing_policy import CURRENT_NEW_CLIENT_RATE_CARD, is_legacy_client, load_json

AGENT_CODE = "AGT-FIN-PKG"
OFFER_CODE = "OFF-CAP-PKG"
BL_C1_ACTIVE = True


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_package_policy() -> dict[str, Any]:
    return load_json("capital-package-policy.json")


def load_compliance() -> dict[str, Any]:
    return load_json("compliance-language.json")


# --- Financial metrics with period alignment ---


@dataclass
class PeriodBoundMetric:
    name: str
    value: Any
    period_start: str | None = None
    period_end: str | None = None
    fiscal_year: str | None = None
    ytd_vs_full_year: str | None = None  # YTD | FULL_YEAR | OTHER
    as_of_date: str | None = None
    source: str | None = None
    provenance_kind: str = "FACT"  # FACT | CALCULATED | AI_INFERENCE | ADVISOR_JUDGMENT | PROJECTION
    verification_status: str = "UNVERIFIED"  # VERIFIED | UNVERIFIED | PENDING_LIVE_SOURCE
    authority_class: str | None = None
    unavailable: bool = False
    notes: str | None = None


@dataclass
class AdvisoryAdjustment:
    field: str
    source_value: float
    proposed_adjustment: float
    adjustment_type: str
    adjustment_amount: float
    reason: str
    evidence: str | None
    advisor: str
    approval_status: str  # PENDING | APPROVED | REJECTED
    adjusted_value: float
    label: str = "HVCG ADVISORY ADJUSTMENT"


@dataclass
class ProjectionLine:
    metric: str
    value: float
    kind: str  # HISTORICAL_ACTUAL | CURRENT_YTD_ACTUAL | CLIENT_FORECAST | HVCG_SCENARIO | MANAGEMENT_PROJECTION
    scenario: str | None = None
    assumptions: str | None = None
    author: str | None = None
    date_created: str | None = None
    period: str | None = None
    approval_status: str = "DRAFT"


@dataclass
class DataRoomItem:
    document: str
    category: str
    period: str | None
    version: str
    received_date: str | None
    verification_status: str
    package_inclusion: bool
    source: str | None
    visibility: str
    notes_internal: str | None = None
    document_status: str = "Current"  # Current | Superseded | Rejected | Included


@dataclass
class PackageVersionMeta:
    package_version: str
    created_date: str
    created_by: str
    source_snapshot: str
    superseded_by: str | None = None
    approval_status: str = "DRAFT"


# --- Completeness ---


def _category_for_doc_code(code: str) -> str:
    tax = {"BIZ_TAX", "PERSONAL_TAX"}
    fin = {"YTD_PL", "PRIOR_PL", "BALANCE_SHEET", "CASH_FLOW"}
    bank = {"BANK_STMTS"}
    debt = {"DEBT_SCHEDULE", "EXISTING_LOANS"}
    entity = {"ENTITY_DOCS", "OWNERSHIP", "IDS", "LICENSES"}
    proj = {"PROJECTIONS"}
    uof = {"USE_OF_FUNDS"}
    contracts = {"CONTRACTS", "LEASES"}
    txn = {"SBA_FORMS", "COLLATERAL", "INSURANCE", "WIP", "AR_AGING", "AP_AGING"}
    if code in tax:
        return "Tax Documents"
    if code in fin:
        return "Financial Documents"
    if code in bank:
        return "Banking"
    if code in debt:
        return "Debt"
    if code in entity:
        return "Ownership / Entity"
    if code in proj:
        return "Projections"
    if code in uof:
        return "Use of Funds"
    if code in contracts:
        return "Supporting Contracts"
    if code in txn:
        return "Transaction-Specific Documents"
    return "Supporting Contracts"


def build_package_completeness(
    *,
    financing_type: str,
    amount: float,
    item_statuses: dict[str, str],
    waivers: dict[str, dict[str, Any]] | None = None,
    capital_request_ok: bool = True,
    use_of_funds_ok: bool = True,
) -> dict[str, Any]:
    """Capital Package Completeness — distinct from Capital Readiness Score."""
    waivers = waivers or {}
    checklist = build_document_checklist(financing_type=financing_type, amount=amount)
    categories: dict[str, list[dict[str, Any]]] = {c: [] for c in load_package_policy()["completenessCategories"]}
    counts = {s: 0 for s in load_package_policy()["itemStatuses"]}
    details = []

    for req in checklist["required"]:
        code = req["code"]
        status = item_statuses.get(code, "MISSING")
        if status == "WAIVED_BY_ADVISOR":
            w = waivers.get(code)
            if not w or not w.get("advisor") or not w.get("reason"):
                status = "MISSING"
            else:
                status = "WAIVED_BY_ADVISOR"
        cat = _category_for_doc_code(code)
        row = {
            "code": code,
            "label": req["label"],
            "category": cat,
            "status": status if status != "REQUIRED" else "MISSING",
        }
        if status == "WAIVED_BY_ADVISOR":
            row["waiver"] = waivers.get(code)
        categories.setdefault(cat, []).append(row)
        details.append(row)
        counts[row["status"]] = counts.get(row["status"], 0) + 1

    # Structural categories
    categories["Capital Request"].append(
        {"code": "CAPITAL_REQUEST", "label": "Capital Request", "category": "Capital Request", "status": "ACCEPTED" if capital_request_ok else "MISSING"}
    )
    categories["Use of Funds"].append(
        {"code": "USE_OF_FUNDS_STRUCT", "label": "Use of Funds schedule", "category": "Use of Funds", "status": "ACCEPTED" if use_of_funds_ok else "MISSING"}
    )
    counts["ACCEPTED" if capital_request_ok else "MISSING"] += 1
    counts["ACCEPTED" if use_of_funds_ok else "MISSING"] += 1

    requiredish = sum(counts.get(s, 0) for s in ("MISSING", "RECEIVED", "ACCEPTED", "NEEDS_REPLACEMENT", "WAIVED_BY_ADVISOR"))
    done = counts.get("ACCEPTED", 0) + counts.get("WAIVED_BY_ADVISOR", 0) + counts.get("NOT_APPLICABLE", 0)
    # N/A not in requiredish above — recompute
    actionable = [
        d
        for d in details
        + categories["Capital Request"]
        + [categories["Use of Funds"][-1]]
        if d["status"] not in {"NOT_APPLICABLE"}
    ]
    # dedupe use of funds structural
    actionable = details + [
        {"code": "CAPITAL_REQUEST", "status": "ACCEPTED" if capital_request_ok else "MISSING"},
        {"code": "USE_OF_FUNDS_STRUCT", "status": "ACCEPTED" if use_of_funds_ok else "MISSING"},
    ]
    denom = max(len([a for a in actionable if a["status"] != "NOT_APPLICABLE"]), 1)
    complete = len([a for a in actionable if a["status"] in {"ACCEPTED", "WAIVED_BY_ADVISOR", "NOT_APPLICABLE"}])
    pct = round(100.0 * complete / denom, 1)
    return {
        "packageCompletenessPercent": pct,
        "counts": counts,
        "categories": categories,
        "details": details,
        "note": "Package completeness ≠ Capital Readiness Score ≠ financing approval.",
        "kind": "CALCULATED",
        "agent": AGENT_CODE,
    }


# --- Reconciliations ---


def reconcile_use_of_funds(request_amount: float, lines: list[UseOfFundsLine]) -> dict[str, Any]:
    total = sum(l.amount for l in lines)
    variance = round(total - request_amount, 2)
    ok = abs(variance) <= max(1.0, abs(request_amount) * 0.01)
    return {
        "requestedCapital": request_amount,
        "useOfFundsTotal": total,
        "variance": variance,
        "reconciled": ok,
        "flag": None if ok else "USE_OF_FUNDS_VARIANCE",
        "kind": "CALCULATED",
    }


def reconcile_debt(
    *,
    debt_lines: list[DebtLine],
    balance_sheet_debt: PeriodBoundMetric | None,
) -> dict[str, Any]:
    agg = aggregate_debt(debt_lines)
    conflicts = []
    if (
        balance_sheet_debt
        and not balance_sheet_debt.unavailable
        and balance_sheet_debt.value is not None
        and abs(float(balance_sheet_debt.value) - float(agg["totalDebt"])) > max(1.0, float(agg["totalDebt"]) * 0.02)
    ):
        conflicts.append(
            {
                "code": "DEBT_RECONCILIATION_REQUIRED",
                "debtScheduleTotal": agg["totalDebt"],
                "balanceSheetDebt": asdict(balance_sheet_debt),
                "resolution": "ADVISOR_REQUIRED",
            }
        )
    return {
        "aggregate": agg,
        "conflicts": conflicts,
        "flag": "DEBT_RECONCILIATION_REQUIRED" if conflicts else None,
        "kind": "CALCULATED",
    }


# --- Financial summary ---


def build_financial_summary(metrics: list[PeriodBoundMetric]) -> dict[str, Any]:
    out = []
    for m in metrics:
        if m.unavailable or m.value is None:
            out.append(
                {
                    "name": m.name,
                    "value": None,
                    "unavailable": True,
                    "period": {"start": m.period_start, "end": m.period_end, "fiscalYear": m.fiscal_year, "ytdVsFullYear": m.ytd_vs_full_year},
                    "asOfDate": m.as_of_date,
                    "source": m.source,
                    "provenanceKind": m.provenance_kind,
                    "verificationStatus": m.verification_status,
                    "notes": m.notes or "unavailable",
                }
            )
        else:
            out.append(
                {
                    "name": m.name,
                    "value": m.value,
                    "unavailable": False,
                    "period": {"start": m.period_start, "end": m.period_end, "fiscalYear": m.fiscal_year, "ytdVsFullYear": m.ytd_vs_full_year},
                    "asOfDate": m.as_of_date,
                    "source": m.source,
                    "provenanceKind": m.provenance_kind,
                    "verificationStatus": m.verification_status,
                    "authorityClass": m.authority_class,
                    "notes": m.notes,
                }
            )
    return {"metrics": out, "note": "Unavailable shown explicitly — figures never invented.", "agent": AGENT_CODE}


def separate_projections(projections: list[ProjectionLine]) -> dict[str, Any]:
    historical = [asdict(p) for p in projections if p.kind in {"HISTORICAL_ACTUAL", "CURRENT_YTD_ACTUAL"}]
    forecasts = [asdict(p) for p in projections if p.kind not in {"HISTORICAL_ACTUAL", "CURRENT_YTD_ACTUAL"}]
    return {
        "historicalActuals": historical,
        "projectionsAndForecasts": forecasts,
        "rule": "Projections must never visually merge with historical actuals.",
        "scenarios": load_package_policy()["projectionScenarios"],
    }


# --- Data room ---


def build_data_room_index(items: list[DataRoomItem]) -> dict[str, Any]:
    policy = load_package_policy()
    lender_facing = []
    internal_only = []
    for it in items:
        row = {
            "document": it.document,
            "category": it.category,
            "period": it.period,
            "version": it.version,
            "receivedDate": it.received_date,
            "verificationStatus": it.verification_status,
            "packageInclusion": it.package_inclusion,
            "source": it.source,
            "visibility": it.visibility,
            "documentStatus": it.document_status,
        }
        if it.visibility in {"LENDER_PACKAGE", "CLIENT_VISIBLE"} and it.package_inclusion and it.visibility != "OWNER_ONLY":
            if it.visibility == "LENDER_PACKAGE" and it.document_status in {"Current", "Included"}:
                lender_facing.append(row)
            elif it.visibility == "CLIENT_VISIBLE":
                lender_facing.append({**row, "notes": None})
        if it.visibility in {"INTERNAL_ONLY", "RESTRICTED", "OWNER_ONLY"}:
            internal_only.append({**row, "notesInternal": it.notes_internal})
        # Owner-only / restricted never in lender package even if inclusion flag mistaken
        if it.visibility in {"OWNER_ONLY", "RESTRICTED"} and it.package_inclusion:
            # force exclude
            lender_facing = [x for x in lender_facing if x["document"] != it.document]
    return {
        "categories": policy["dataRoomCategories"],
        "lenderFacingIndex": lender_facing,
        "internalIndex": internal_only,
        "reuses": "HVCG_DataRooms LenderPackage / folder-taxonomy-map — no second repository",
        "externalSharing": "Off",
    }


# --- Lender memo ---


def draft_lender_memo(ctx: dict[str, Any]) -> dict[str, Any]:
    compliance = load_compliance()
    disclaimer = compliance["language"]["generalAdvisory"] + " " + compliance["language"]["financing"]
    summary = ctx.get("readinessSummary") or {}
    request: CapitalRequest = ctx["request"]
    sections = {
        "Company Overview": {"text": ctx.get("companyOverview") or ctx.get("client"), "kind": "CLIENT_PROVIDED_OR_FACT"},
        "Capital Request": {"text": f"Amount {request.amount_requested}; type {request.preferred_capital_type}", "kind": "FACT"},
        "Use of Funds": {"text": "; ".join(f"{l.category}: {l.amount}" for l in request.use_of_funds), "kind": "FACT"},
        "Business Overview": {"text": ctx.get("businessOverview") or "See client profile", "kind": "HVCG_ADVISORY_INTERPRETATION"},
        "Historical Financial Performance": {"text": ctx.get("historicalNarrative") or "See financial summary", "kind": "FACT"},
        "Current Financial Position": {"text": ctx.get("currentPositionNarrative") or "See financial summary", "kind": "CALCULATED"},
        "Debt Profile": {"text": ctx.get("debtNarrative") or "See debt schedule", "kind": "CALCULATED"},
        "Key Strengths": {"text": ", ".join(c.get("code", c) if isinstance(c, dict) else str(c) for c in (summary.get("financialStrengths") or [])), "kind": "HVCG_ADVISORY_INTERPRETATION"},
        "Risks / Considerations": {"text": ", ".join(c.get("code", c) if isinstance(c, dict) else str(c) for c in (summary.get("lenderConcerns") or [])), "kind": "HVCG_ADVISORY_INTERPRETATION"},
        "Mitigating Factors": {"text": ctx.get("mitigants") or "Advisor to complete", "kind": "HVCG_ADVISORY_INTERPRETATION"},
        "Projections": {"text": "See projections section — clearly labeled non-historical", "kind": "PROJECTION"},
        "Capital Readiness Summary": {"text": f"Score {summary.get('readinessScore')} band {summary.get('band')}", "kind": "CALCULATED"},
        "Supporting Documentation": {"text": "See Data Room index (lender-facing only)", "kind": "FACT"},
        "Requested Structure": {"text": ctx.get("requestedStructure") or request.preferred_capital_type, "kind": "HVCG_ADVISORY_INTERPRETATION"},
        "HVCG Limitations / Disclaimer": {"text": disclaimer, "kind": "COMPLIANCE"},
    }
    body_lines = ["# LENDER MEMO (DRAFT — HUMAN APPROVAL REQUIRED)", ""]
    for title, block in sections.items():
        body_lines += [f"## {title}", f"[{block['kind']}] {block['text']}", ""]
    body_lines += [
        "---",
        "Truth controls: Client-provided · Financial fact · Calculated · HVCG advisory · Projection · AI draft are labeled.",
        "AI-generated interpretation must not silently become fact.",
    ]
    return {
        "status": "DRAFT",
        "sections": sections,
        "body": "\n".join(body_lines),
        "humanApprovalRequired": True,
        "aiDraft": True,
        "canAutoSend": False,
    }


# --- Package QA ---


def run_package_qa(package: dict[str, Any]) -> dict[str, Any]:
    failures = []
    conditions = []

    def fail(rule: str, reason: str, evidence: Any, owner: str = "Capital Advisor") -> None:
        failures.append({"rule": rule, "reason": reason, "evidence": evidence, "owner": owner, "resolution": "REQUIRED"})

    def cond(rule: str, reason: str, evidence: Any, owner: str = "Capital Advisor") -> None:
        conditions.append({"rule": rule, "reason": reason, "evidence": evidence, "owner": owner, "resolution": "CONDITION"})

    completeness = package.get("completeness") or {}
    if float(completeness.get("packageCompletenessPercent") or 0) < 100:
        missing = [d for d in completeness.get("details", []) if d.get("status") == "MISSING"]
        fail("REQUIRED_DOCUMENTS", "Required package documents missing", missing)

    if package.get("useOfFundsReconciliation") and not package["useOfFundsReconciliation"].get("reconciled"):
        fail("USE_OF_FUNDS_RECONCILED", "Use of Funds does not reconcile to Capital Request", package["useOfFundsReconciliation"])

    if package.get("debtReconciliation") and package["debtReconciliation"].get("flag"):
        fail("DEBT_RECONCILED", "Debt schedule vs balance sheet conflict", package["debtReconciliation"]["conflicts"])

    if package.get("sourceConflicts"):
        fail("SOURCE_CONFLICTS_VISIBLE", "Unresolved source conflicts", package["sourceConflicts"])

    if package.get("staleFlags"):
        cond("FRESHNESS", "Stale financials present", package["staleFlags"])

    if not package.get("readinessApproval"):
        fail("READINESS_APPROVAL", "Capital Readiness human approval missing", None)

    memo = package.get("lenderMemo") or {}
    if memo.get("status") != "APPROVED":
        fail("LENDER_MEMO_REVIEW", "Lender memo not human-approved", memo.get("status"))

    if not package.get("disclaimer"):
        fail("DISCLAIMER", "Compliance disclaimer missing", None)

    # Restricted docs accidentally in lender index
    idx = package.get("dataRoomIndex") or {}
    for row in idx.get("lenderFacingIndex") or []:
        if row.get("visibility") in {"OWNER_ONLY", "RESTRICTED", "INTERNAL_ONLY"}:
            fail("VISIBILITY_CLASSIFICATION", "Restricted/internal document in lender-facing index", row)

    # Projection labeling
    proj = package.get("projections") or {}
    for p in proj.get("projectionsAndForecasts") or []:
        if p.get("kind") in {"HISTORICAL_ACTUAL", "CURRENT_YTD_ACTUAL"}:
            fail("PROJECTION_LABELING", "Forecast mixed into historical", p)
    for p in proj.get("historicalActuals") or []:
        if p.get("kind") not in {"HISTORICAL_ACTUAL", "CURRENT_YTD_ACTUAL"}:
            fail("PROJECTION_LABELING", "Non-actual in historical bucket", p)

    # Period alignment sample: forbid unlabeled period on present metrics
    for m in (package.get("financialSummary") or {}).get("metrics") or []:
        if not m.get("unavailable") and not (m.get("period") or {}).get("end") and not m.get("asOfDate"):
            cond("PERIOD_ALIGNMENT", f"Metric {m.get('name')} missing period/as-of", m)

    overrides = package.get("qaOverrides") or []
    unresolved = [f for f in failures if not any(o.get("rule") == f["rule"] for o in overrides)]
    if not unresolved and not conditions:
        result = "PASS"
    elif not unresolved and conditions:
        result = "PASS_WITH_CONDITIONS"
    elif unresolved and overrides and len(unresolved) < len(failures):
        result = "PASS_WITH_CONDITIONS" if not unresolved else "FAIL"
    else:
        result = "FAIL" if unresolved else ("PASS_WITH_CONDITIONS" if conditions else "PASS")

    # Recompute with overrides clearing failures
    if overrides:
        overridden_rules = {o["rule"] for o in overrides if o.get("advisor") and o.get("reason") and o.get("riskAcknowledgment")}
        unresolved = [f for f in failures if f["rule"] not in overridden_rules]
        if not unresolved:
            result = "PASS_WITH_CONDITIONS" if (conditions or overrides) else "PASS"
        else:
            result = "FAIL"

    return {
        "result": result,
        "failures": failures,
        "conditions": conditions,
        "unresolvedFailures": unresolved if overrides else failures if result == "FAIL" else [],
        "overrides": overrides,
        "blocksApprovalForSubmission": result == "FAIL",
        "calculatedAt": _now(),
        "agent": AGENT_CODE,
    }


def apply_qa_override(
    package: dict[str, Any],
    *,
    rule: str,
    reason: str,
    advisor: str,
    evidence: str,
    risk_acknowledgment: str,
) -> dict[str, Any]:
    out = deepcopy(package)
    entry = {
        "rule": rule,
        "reason": reason,
        "advisor": advisor,
        "date": _now(),
        "evidence": evidence,
        "riskAcknowledgment": risk_acknowledgment,
    }
    out.setdefault("qaOverrides", []).append(entry)
    out.setdefault("audit", []).append({"event": "qa_override", **entry})
    out["qa"] = run_package_qa(out)
    return out


# --- State machine ---


_ALLOWED = {
    "NOT_STARTED": {"REQUIREMENTS_GENERATED"},
    "REQUIREMENTS_GENERATED": {"COLLECTING_DOCUMENTS"},
    "COLLECTING_DOCUMENTS": {"DOCUMENTS_IN_REVIEW", "GAPS_IDENTIFIED"},
    "DOCUMENTS_IN_REVIEW": {"FINANCIAL_REVIEW", "GAPS_IDENTIFIED"},
    "FINANCIAL_REVIEW": {"PACKAGE_ASSEMBLY", "GAPS_IDENTIFIED"},
    "GAPS_IDENTIFIED": {"COLLECTING_DOCUMENTS", "PACKAGE_ASSEMBLY"},
    "PACKAGE_ASSEMBLY": {"INTERNAL_QA"},
    "INTERNAL_QA": {"ADVISOR_REVIEW", "PACKAGE_ASSEMBLY", "GAPS_IDENTIFIED"},
    "ADVISOR_REVIEW": {"APPROVED_FOR_LENDER_SUBMISSION", "INTERNAL_QA", "PACKAGE_ASSEMBLY"},
    "APPROVED_FOR_LENDER_SUBMISSION": {"SUBMISSION_GATED", "REVIEW_REQUIRED_DATA_CHANGED", "SUPERSEDED", "CLOSED"},
    "SUBMISSION_GATED": {"CLOSED", "REVIEW_REQUIRED_DATA_CHANGED"},
    "REVIEW_REQUIRED_DATA_CHANGED": {"PACKAGE_ASSEMBLY", "INTERNAL_QA", "ADVISOR_REVIEW"},
    "SUPERSEDED": {"CLOSED"},
    "CLOSED": set(),
}


def transition_package(package: dict[str, Any], new_state: str, *, actor: str) -> dict[str, Any]:
    cur = package.get("state") or "NOT_STARTED"
    if new_state not in load_package_policy()["packageStates"]:
        return {"errors": [f"Invalid state {new_state}"], "package": package}
    if new_state not in _ALLOWED.get(cur, set()) and new_state != cur:
        return {"errors": [f"Illegal transition {cur} → {new_state}"], "package": package}

    # Material QA failures block APPROVED_FOR_LENDER_SUBMISSION unless overridden to non-FAIL
    if new_state == "APPROVED_FOR_LENDER_SUBMISSION":
        qa = package.get("qa") or run_package_qa(package)
        if qa.get("result") == "FAIL":
            return {
                "errors": ["QA FAIL blocks APPROVED_FOR_LENDER_SUBMISSION without valid overrides clearing failures"],
                "package": package,
            }
        if not package.get("advisorApproval"):
            return {"errors": ["Advisor approval required before APPROVED_FOR_LENDER_SUBMISSION"], "package": package}

    # Auto-submit forbidden
    if new_state == "SUBMISSION_GATED":
        # Always land here conceptually for external — still no send
        pass

    out = deepcopy(package)
    out["state"] = new_state
    out.setdefault("audit", []).append({"event": "state_transition", "from": cur, "to": new_state, "actor": actor, "at": _now()})
    if new_state == "APPROVED_FOR_LENDER_SUBMISSION":
        out["submission"] = {
            "status": "SUBMISSION_GATED",
            "canAutoSubmit": False,
            "blC1Active": True,
            "note": "APPROVED_FOR_LENDER_SUBMISSION ≠ automatic lender submission",
        }
        out["state"] = "SUBMISSION_GATED"  # enforce gate immediately after approval in Dev flow
        out["approvedForLenderSubmission"] = True
        out["audit"].append({"event": "submission_gated", "at": _now(), "blC1": True})
    return {"errors": [], "package": out}


def detect_material_data_change(package: dict[str, Any], *, change_description: str, new_source_hash: str) -> dict[str, Any]:
    out = deepcopy(package)
    prior = out.get("sourceSnapshotHash")
    if prior and prior != new_source_hash and out.get("approvedForLenderSubmission"):
        out["state"] = "REVIEW_REQUIRED_DATA_CHANGED"
        out["approvedForLenderSubmission"] = False
        out.setdefault("audit", []).append(
            {
                "event": "material_data_changed",
                "description": change_description,
                "priorSnapshot": prior,
                "newSnapshot": new_source_hash,
                "at": _now(),
            }
        )
        out["version"] = bump_package_version(out["version"], reason=change_description)
    out["sourceSnapshotHash"] = new_source_hash
    return out


def bump_package_version(meta: dict[str, Any] | PackageVersionMeta, *, reason: str) -> dict[str, Any]:
    if isinstance(meta, PackageVersionMeta):
        meta = asdict(meta)
    old = meta.get("package_version") or "v1"
    try:
        n = int(old.lstrip("v")) + 1
    except ValueError:
        n = 2
    new_meta = {
        **meta,
        "package_version": f"v{n}",
        "created_date": _now(),
        "superseded_by": None,
        "approval_status": "DRAFT",
        "priorVersion": old,
        "changeReason": reason,
    }
    return new_meta


# --- Agent runtime ---


def run_financial_package_agent(payload: dict[str, Any]) -> dict[str, Any]:
    """AGT-FIN-PKG runtime — assemble lender-ready package from verified inputs + readiness handoff."""
    audit = [{"event": "fin_pkg_started", "at": _now(), "agent": AGENT_CODE}]
    handoff = payload.get("readinessHandoff") or {}
    if not handoff and payload.get("readinessResult"):
        handoff = build_financial_package_handoff(payload["readinessResult"])

    request_raw = payload.get("request") or {}
    if isinstance(request_raw, CapitalRequest):
        request = request_raw
    else:
        uof = [UseOfFundsLine(**x) if isinstance(x, dict) else x for x in (request_raw.get("use_of_funds") or [])]
        request = CapitalRequest(
            amount_requested=float(request_raw.get("amount_requested") or 0),
            preferred_capital_type=request_raw.get("preferred_capital_type") or "Working Capital",
            use_of_funds=uof,
            purpose=request_raw.get("purpose"),
            timing=request_raw.get("timing"),
            acquisition_need=bool(request_raw.get("acquisition_need")),
            refinance_need=bool(request_raw.get("refinance_need")),
            ar_facility_need=bool(request_raw.get("ar_facility_need")),
            real_estate_need=bool(request_raw.get("real_estate_need")),
            equipment_need=bool(request_raw.get("equipment_need")),
            bridge_need=bool(request_raw.get("bridge_need")),
        )

    item_statuses = payload.get("documentStatuses") or {}
    completeness = build_package_completeness(
        financing_type=request.preferred_capital_type,
        amount=request.amount_requested,
        item_statuses=item_statuses,
        waivers=payload.get("waivers"),
        capital_request_ok=request.amount_requested > 0,
        use_of_funds_ok=bool(request.use_of_funds),
    )
    uof_rec = reconcile_use_of_funds(request.amount_requested, request.use_of_funds)

    debt_lines = [DebtLine(**x) if isinstance(x, dict) else x for x in (payload.get("debtLines") or [])]
    bs_debt = payload.get("balanceSheetDebt")
    if isinstance(bs_debt, dict):
        bs_debt = PeriodBoundMetric(**bs_debt)
    debt_rec = reconcile_debt(debt_lines=debt_lines, balance_sheet_debt=bs_debt)

    metrics = [m if isinstance(m, PeriodBoundMetric) else PeriodBoundMetric(**m) for m in (payload.get("metrics") or [])]
    financial_summary = build_financial_summary(metrics)

    projections = [p if isinstance(p, ProjectionLine) else ProjectionLine(**p) for p in (payload.get("projections") or [])]
    proj_sep = separate_projections(projections)

    values = [v if isinstance(v, ProvenancedValue) else ProvenancedValue(**v) for v in (payload.get("provenancedValues") or [])]
    conflicts = detect_source_conflicts(values)
    stale = [f for f in (freshness_flag(v) for v in values) if f]

    room_items = [d if isinstance(d, DataRoomItem) else DataRoomItem(**d) for d in (payload.get("dataRoomItems") or [])]
    data_room_index = build_data_room_index(room_items)

    readiness_summary = (payload.get("readinessResult") or {}).get("summary") or handoff
    memo_ctx = {
        "client": payload.get("client"),
        "request": request,
        "readinessSummary": readiness_summary if isinstance(readiness_summary, dict) else {},
        "companyOverview": payload.get("companyOverview"),
        "businessOverview": payload.get("businessOverview"),
        "historicalNarrative": payload.get("historicalNarrative"),
        "currentPositionNarrative": payload.get("currentPositionNarrative"),
        "debtNarrative": payload.get("debtNarrative"),
        "mitigants": payload.get("mitigants"),
        "requestedStructure": payload.get("requestedStructure"),
    }
    # Normalize strengths/concerns if from handoff-only
    if "financialStrengths" not in memo_ctx["readinessSummary"] and isinstance(handoff, dict):
        memo_ctx["readinessSummary"] = {
            "readinessScore": handoff.get("score"),
            "band": handoff.get("band"),
            "financialStrengths": (handoff.get("financialSignals") or {}).get("strengths") or [],
            "lenderConcerns": (handoff.get("financialSignals") or {}).get("concerns") or [],
        }
    lender_memo = draft_lender_memo(memo_ctx)

    compliance = load_compliance()
    disclaimer = compliance["language"]["generalAdvisory"] + " " + compliance["language"]["financing"]

    version = asdict(
        PackageVersionMeta(
            package_version=payload.get("packageVersion") or "v1",
            created_date=_now(),
            created_by=payload.get("createdBy") or AGENT_CODE,
            source_snapshot=payload.get("sourceSnapshotHash") or "snap-initial",
            approval_status="DRAFT",
        )
    )

    adjustments = [asdict(a) if isinstance(a, AdvisoryAdjustment) else a for a in (payload.get("adjustments") or [])]
    for a in adjustments:
        a["label"] = "HVCG ADVISORY ADJUSTMENT"

    success_fee = payload.get("successFee") or {
        "percentage": None,
        "feeBase": "closed_financing_per_agreement",
        "trigger": "funding_closed",
        "agreementReference": None,
        "effectiveDate": None,
        "complianceFlag": True,
        "status": "Not Proposed",
        "earnedCollected": False,
        "note": "Do not calculate earned/collected until trigger occurs.",
    }

    funding_outcome = payload.get("fundingOutcome") or {
        "status": "Requested",
        "requestedAmount": request.amount_requested,
        "submittedAmount": None,
        "approvedAmount": None,
        "fundedAmount": None,
        "rules": ["Approved ≠ Funded", "Funded ≠ Collected HVCG revenue"],
    }

    lender_pipeline_handoff = {
        "lender": payload.get("targetLender"),
        "product": payload.get("targetProduct") or request.preferred_capital_type,
        "targetAmount": request.amount_requested,
        "packageVersion": version["package_version"],
        "submissionReadiness": "NOT_READY",
        "approval": None,
        "assignedAdvisor": payload.get("assignedAdvisor"),
        "targetSubmissionDate": payload.get("targetSubmissionDate"),
        "canSubmit": False,
    }

    package = {
        "agent": AGENT_CODE,
        "offerCode": OFFER_CODE,
        "client": payload.get("client"),
        "opportunityId": payload.get("opportunityId"),
        "capitalOpportunityId": payload.get("capitalOpportunityId"),
        "state": "PACKAGE_ASSEMBLY",
        "version": version,
        "sourceSnapshotHash": version["source_snapshot"],
        "checklist": build_document_checklist(financing_type=request.preferred_capital_type, amount=request.amount_requested),
        "completeness": completeness,
        "missingInformation": [d for d in completeness.get("details", []) if d.get("status") == "MISSING"],
        "financialSummary": financial_summary,
        "adjustments": adjustments,
        "debtReconciliation": debt_rec,
        "useOfFundsReconciliation": uof_rec,
        "projections": proj_sep,
        "sourceConflicts": conflicts + (debt_rec.get("conflicts") or []),
        "staleFlags": stale,
        "dataRoomIndex": data_room_index,
        "lenderMemo": lender_memo,
        "disclaimer": disclaimer,
        "readinessHandoff": handoff,
        "readinessApproval": payload.get("readinessApproval"),
        "advisorApproval": None,
        "qaOverrides": [],
        "qa": None,
        "successFee": success_fee,
        "fundingOutcome": funding_outcome,
        "lenderPipelineHandoff": lender_pipeline_handoff,
        "pricingLink": {
            "offerCode": OFFER_CODE,
            "pricingVersion": CURRENT_NEW_CLIENT_RATE_CARD,
            "routeToProposalWorkflow": True,
            "legacyPricingProtected": is_legacy_client(payload.get("clientClassification") or ""),
            "contractedCurrent": payload.get("contractedCurrent"),
        },
        "blC1Active": BL_C1_ACTIVE,
        "canAutoSubmitToLender": False,
        "canAutoSendClient": False,
        "approvedForLenderSubmission": False,
        "audit": audit
        + [
            {"event": "requirements_and_assembly", "completeness": completeness["packageCompletenessPercent"], "at": _now()},
        ],
        "fiAdapterStatus": payload.get("fiAdapterStatus") or "PENDING_LIVE_SOURCE",
        "clientClassification": payload.get("clientClassification"),
        "contractedCurrent": payload.get("contractedCurrent"),
    }

    # Advance through assembly toward QA when documents collected
    if completeness["packageCompletenessPercent"] >= 100 and uof_rec["reconciled"] and not debt_rec.get("flag"):
        package["state"] = "INTERNAL_QA"
    elif completeness["packageCompletenessPercent"] < 100:
        package["state"] = "GAPS_IDENTIFIED"

    package["qa"] = run_package_qa(package)
    package["audit"].append({"event": "qa_initial", "result": package["qa"]["result"], "at": _now()})
    return package


def approve_lender_memo(package: dict[str, Any], *, advisor: str) -> dict[str, Any]:
    out = deepcopy(package)
    out["lenderMemo"] = {**out.get("lenderMemo", {}), "status": "APPROVED", "approvedBy": advisor, "approvedAt": _now()}
    out.setdefault("audit", []).append({"event": "lender_memo_approved", "advisor": advisor, "at": _now()})
    out["qa"] = run_package_qa(out)
    return out


def advisor_approve_package(package: dict[str, Any], *, advisor: str, conclusion: str) -> dict[str, Any]:
    out = deepcopy(package)
    out["advisorApproval"] = {"advisor": advisor, "conclusion": conclusion, "at": _now(), "kind": "ADVISOR_JUDGMENT"}
    out["version"] = {**out.get("version", {}), "approval_status": "ADVISOR_APPROVED"}
    out.setdefault("audit", []).append({"event": "advisor_package_approval", "advisor": advisor, "at": _now()})
    out["qa"] = run_package_qa(out)
    if out["qa"]["result"] == "FAIL":
        out["state"] = "INTERNAL_QA"
        return out
    # Move to advisor review then attempt approval→gated
    out["state"] = "ADVISOR_REVIEW"
    transitioned = transition_package(out, "APPROVED_FOR_LENDER_SUBMISSION", actor=advisor)
    if transitioned["errors"]:
        out["transitionErrors"] = transitioned["errors"]
        return out
    pkg = transitioned["package"]
    pkg["lenderPipelineHandoff"] = {
        **(pkg.get("lenderPipelineHandoff") or {}),
        "submissionReadiness": "APPROVED_GATED",
        "approval": pkg.get("advisorApproval"),
        "canSubmit": False,
    }
    return pkg


def attempt_lender_submit(package: dict[str, Any], *, actor: str) -> dict[str, Any]:
    """Always blocked in Sprint 6 — BL-C1 / submission gate."""
    return {
        "allowed": False,
        "errors": ["BL-C1 / submission gate: lender submission not authorized in Sprint 6 Development"],
        "packageState": package.get("state"),
        "approvedForLenderSubmission": package.get("approvedForLenderSubmission"),
        "actor": actor,
        "at": _now(),
    }
