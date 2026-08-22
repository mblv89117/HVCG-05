"""HVCG Revenue Truth — Billing, Success Fees & Referral Economics (Sprint 12).

HVCG internal revenue only — not client AR/AP (CFO). Not a second GL.
States are never interchangeable. AI may calculate/draft; humans approve money moves.
BL-C1 blocks external collection/partner sends. Production payment tools DISABLED.
"""

from __future__ import annotations

import hashlib
import uuid
from copy import deepcopy
from dataclasses import asdict, dataclass, field
from datetime import date, datetime, timezone
from typing import Any

from pricing_policy import ACCG_LOCKED_MONTHLY, is_legacy_client, load_json

BL_C1_ACTIVE = True
OFFER_DOMAIN = "HVCG_INTERNAL_REVENUE"
RUNTIME_VERSION = "1.0.0-dev"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10].upper()}"


def load_revenue_policy() -> dict[str, Any]:
    return load_json("revenue-truth-policy.json")


# --- Contracted economics ---


@dataclass
class ContractedEconomics:
    client: str
    engagement_id: str
    pricing_version: str | None = None
    proposal_version: str | None = None
    agreement_reference: str | None = None
    effective_date: str | None = None
    setup_fee: float = 0.0
    retainer: float = 0.0
    minimum_term_months: int | None = None
    premium_hourly_rate: float | None = None
    success_fee: dict[str, Any] = field(default_factory=dict)
    pass_through_terms: str | None = None
    discounts: float = 0.0
    credits: float = 0.0
    referral_relationship: str | None = None
    legacy_pricing_protected: bool = False
    approved_overrides: list[dict[str, Any]] = field(default_factory=list)
    commercial_class: str | None = None
    offer_code: str | None = None
    service_line: str | None = None
    client_classification: str | None = None
    recommended_future_pricing: dict[str, Any] | None = None


def create_contracted_economics(**kwargs: Any) -> dict[str, Any]:
    econ = ContractedEconomics(
        **{k: v for k, v in kwargs.items() if k in ContractedEconomics.__dataclass_fields__}
    )
    out = asdict(econ)
    # ACCG / legacy protection
    client = out["client"]
    classification = out.get("client_classification") or ""
    if client.upper().startswith("ACCG") or is_legacy_client(classification):
        out["legacy_pricing_protected"] = True
        if client.upper().startswith("ACCG"):
            out["retainer"] = ACCG_LOCKED_MONTHLY
            out["agreement_reference"] = out.get("agreement_reference") or "BL-ACCG-PRICE"
            out["pricing_version"] = out.get("pricing_version") or "LEGACY-ACCG"
        # Recommended future never overwrites contracted
        if out.get("recommended_future_pricing"):
            out["recommended_future_pricing"]["appliesTo"] = "RECOMMENDED_FUTURE_ONLY"
            out["recommended_future_pricing"]["doesNotOverwriteContracted"] = True
    out["state"] = "CONTRACTED"
    out["note"] = "Executed agreement governs. Proposed/recommended ≠ contracted."
    out["event"] = emit_event(
        "CONTRACT_EXECUTED",
        client=out["client"],
        engagement=out["engagement_id"],
        offer=out.get("offer_code"),
        amount=float(out.get("setup_fee") or 0) + float(out.get("retainer") or 0),
        source="agreement",
        source_reference=out.get("agreement_reference"),
    )
    return out


def protect_accg_contract(econ: dict[str, Any]) -> dict[str, Any]:
    out = deepcopy(econ)
    if not str(out.get("client", "")).upper().startswith("ACCG"):
        return out
    out["retainer"] = ACCG_LOCKED_MONTHLY
    out["legacy_pricing_protected"] = True
    if out.get("recommended_future_pricing"):
        out["recommended_future_pricing"]["doesNotOverwriteContracted"] = True
    return out


# --- Revenue events ---


def emit_event(
    event_type: str,
    *,
    client: str,
    engagement: str | None = None,
    offer: str | None = None,
    service_line: str | None = None,
    commercial_class: str | None = None,
    invoice: str | None = None,
    payment: str | None = None,
    agreement: str | None = None,
    amount: float = 0.0,
    currency: str = "USD",
    source: str = "system",
    source_reference: str | None = None,
    recorded_by: str = "system",
    verification_status: str = "VERIFIED",
    reconciliation_status: str = "NOT_APPLICABLE",
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    policy = load_revenue_policy()
    if event_type not in policy["eventTypes"]:
        raise ValueError(f"Unknown event type {event_type}")
    ev = {
        "eventId": _id("EVT"),
        "eventType": event_type,
        "client": client,
        "engagement": engagement,
        "offer": offer,
        "serviceLine": service_line,
        "commercialClass": commercial_class,
        "invoice": invoice,
        "payment": payment,
        "agreement": agreement,
        "amount": amount,
        "currency": currency,
        "date": _now(),
        "source": source,
        "sourceReference": source_reference,
        "recordedBy": recorded_by,
        "verificationStatus": verification_status,
        "reconciliationStatus": reconciliation_status,
        "domain": OFFER_DOMAIN,
        "audit": {"createdAt": _now()},
    }
    if extra:
        ev["extra"] = extra
    return ev


# --- Invoices ---


def create_invoice(
    *,
    client: str,
    engagement_id: str,
    invoice_number: str,
    original_amount: float,
    invoice_date: str,
    due_date: str,
    offer: str | None = None,
    revenue_category: str = "Retainer",
    agreement_reference: str | None = None,
    service_period: str | None = None,
    payment_terms: str = "Net 15",
    source_system: str = "HVCG_Dev",
) -> dict[str, Any]:
    inv = {
        "invoiceId": _id("INV"),
        "client": client,
        "engagementId": engagement_id,
        "invoiceNumber": invoice_number,
        "invoiceDate": invoice_date,
        "dueDate": due_date,
        "originalAmount": float(original_amount),
        "currentAmount": float(original_amount),
        "tax": 0.0,
        "credits": 0.0,
        "adjustments": 0.0,
        "balanceDue": float(original_amount),
        "amountCollected": 0.0,
        "status": "ISSUED",
        "sourceSystem": source_system,
        "externalReference": None,
        "paymentTerms": payment_terms,
        "servicePeriod": service_period,
        "offer": offer,
        "revenueCategory": revenue_category,
        "agreementReference": agreement_reference,
        "reconciliationStatus": "UNRECONCILED",
        "paymentsApplied": [],
        "writeOffs": [],
        "refunds": [],
        "historicalIdImmutable": True,
        "domain": OFFER_DOMAIN,
    }
    inv["event"] = emit_event(
        "INVOICE_CREATED",
        client=client,
        engagement=engagement_id,
        offer=offer,
        invoice=inv["invoiceId"],
        agreement=agreement_reference,
        amount=float(original_amount),
        source=source_system,
        source_reference=invoice_number,
    )
    return inv


def _refresh_invoice_status(inv: dict[str, Any], *, as_of: date | None = None) -> None:
    collected = float(inv.get("amountCollected") or 0)
    current = float(inv.get("currentAmount") or 0)
    write_off = sum(float(w.get("amount") or 0) for w in inv.get("writeOffs") or [])
    outstanding = max(0.0, current - collected - write_off)
    inv["balanceDue"] = round(outstanding, 2)
    if inv.get("status") in ("VOID", "WRITTEN_OFF", "CREDITED", "DISPUTED"):
        if write_off >= current - collected and current > collected:
            inv["status"] = "WRITTEN_OFF"
        return
    if outstanding <= 0.001 and collected > 0:
        inv["status"] = "PAID"
    elif 0 < collected < current:
        inv["status"] = "PARTIALLY_PAID"
    else:
        # overdue check
        try:
            due = date.fromisoformat(str(inv["dueDate"])[:10])
            today = as_of or date.today()
            if outstanding > 0 and today > due:
                inv["status"] = "OVERDUE"
            elif outstanding > 0:
                inv["status"] = "DUE" if inv["status"] != "ISSUED" else "ISSUED"
        except Exception:
            inv["status"] = "DUE" if outstanding > 0 else inv["status"]


# --- Payments ---


def payment_fingerprint(payment: dict[str, Any]) -> str:
    raw = "|".join(
        [
            str(payment.get("sourceTransactionId") or ""),
            str(payment.get("bankProcessorReference") or ""),
            str(payment.get("client") or ""),
            str(payment.get("amount") or ""),
            str(payment.get("paymentDate") or ""),
        ]
    )
    return hashlib.sha256(raw.encode()).hexdigest()[:24]


def create_payment(
    *,
    client: str,
    amount: float,
    payment_date: str,
    payment_method: str = "ACH",
    source: str = "bank_transaction",
    bank_processor_reference: str | None = None,
    source_transaction_id: str | None = None,
    invoice_id: str | None = None,
    verification_status: str = "VERIFIED",
    recorded_by: str = "system",
    known_fingerprints: set[str] | None = None,
) -> dict[str, Any]:
    pay = {
        "paymentId": _id("PAY"),
        "client": client,
        "invoiceId": invoice_id,
        "paymentDate": payment_date,
        "amount": float(amount),
        "paymentMethod": payment_method,
        "source": source,
        "bankProcessorReference": bank_processor_reference,
        "sourceTransactionId": source_transaction_id or bank_processor_reference,
        "importedDate": _now(),
        "verificationStatus": verification_status,
        "reconciliationStatus": "UNRECONCILED",
        "appliedAmount": 0.0,
        "unappliedAmount": float(amount),
        "duplicateOf": None,
        "aiExtractedOnly": False,
        "domain": OFFER_DOMAIN,
    }
    pay["fingerprint"] = payment_fingerprint(pay)
    if known_fingerprints is not None and pay["fingerprint"] in known_fingerprints:
        pay["duplicate"] = True
        pay["verificationStatus"] = "REVIEW_REQUIRED"
        pay["reconciliationStatus"] = "REVIEW_REQUIRED"
        pay["note"] = "Duplicate payment detected — not double-counted"
        return pay
    if known_fingerprints is not None:
        known_fingerprints.add(pay["fingerprint"])
    pay["duplicate"] = False
    pay["event"] = emit_event(
        "PAYMENT_RECEIVED",
        client=client,
        invoice=invoice_id,
        payment=pay["paymentId"],
        amount=float(amount),
        source=source,
        source_reference=pay.get("sourceTransactionId"),
        recorded_by=recorded_by,
        verification_status=verification_status,
        reconciliation_status="UNRECONCILED",
    )
    return pay


def reconcile_payment_to_invoice(
    invoice: dict[str, Any],
    payment: dict[str, Any],
    *,
    allocate: float | None = None,
    force: bool = False,
) -> dict[str, Any]:
    """Deterministic reconciliation. Never silently force uncertain matches."""
    inv = deepcopy(invoice)
    pay = deepcopy(payment)
    if pay.get("duplicate"):
        return {
            "ok": False,
            "status": "REVIEW_REQUIRED",
            "invoice": inv,
            "payment": pay,
            "message": "Duplicate payment — not applied",
        }
    if pay.get("client") != inv.get("client"):
        return {
            "ok": False,
            "status": "SOURCE_CONFLICT",
            "invoice": inv,
            "payment": pay,
            "message": "Client mismatch",
        }
    # Source conflict: alternate amount claimed
    if pay.get("conflictingAmount") is not None and float(pay["conflictingAmount"]) != float(pay["amount"]):
        pay["reconciliationStatus"] = "SOURCE_CONFLICT"
        return {
            "ok": False,
            "status": "SOURCE_CONFLICT",
            "invoice": inv,
            "payment": pay,
            "message": "Bank/processor amounts disagree — human reconciliation required",
            "bankAmount": pay["amount"],
            "processorAmount": pay["conflictingAmount"],
            "forced": False,
        }

    available = float(pay.get("unappliedAmount") if pay.get("unappliedAmount") is not None else pay["amount"])
    outstanding = float(inv.get("balanceDue") if inv.get("balanceDue") is not None else inv["currentAmount"])
    apply_amt = float(allocate) if allocate is not None else min(available, outstanding)
    if apply_amt <= 0:
        return {"ok": False, "status": "NOT_APPLICABLE", "invoice": inv, "payment": pay, "message": "Nothing to apply"}

    if not force and pay.get("verificationStatus") not in ("VERIFIED", "MANUALLY_VERIFIED"):
        return {
            "ok": False,
            "status": "REVIEW_REQUIRED",
            "invoice": inv,
            "payment": pay,
            "message": "Payment not verified — AI extraction alone is insufficient",
        }

    inv["amountCollected"] = round(float(inv.get("amountCollected") or 0) + apply_amt, 2)
    inv.setdefault("paymentsApplied", []).append(
        {"paymentId": pay["paymentId"], "amount": apply_amt, "at": _now()}
    )
    pay["appliedAmount"] = round(float(pay.get("appliedAmount") or 0) + apply_amt, 2)
    pay["unappliedAmount"] = round(available - apply_amt, 2)
    pay["invoiceId"] = inv["invoiceId"]
    _refresh_invoice_status(inv)

    if inv["balanceDue"] <= 0.001 and pay["unappliedAmount"] <= 0.001:
        inv["reconciliationStatus"] = "RECONCILED"
        pay["reconciliationStatus"] = "RECONCILED"
        status = "RECONCILED"
    elif inv["amountCollected"] > 0:
        inv["reconciliationStatus"] = "PARTIALLY_RECONCILED"
        pay["reconciliationStatus"] = "PARTIALLY_RECONCILED" if pay["unappliedAmount"] > 0 else "RECONCILED"
        status = "PARTIALLY_RECONCILED"
    else:
        status = "UNRECONCILED"

    event_type = "PARTIAL_PAYMENT" if inv["status"] == "PARTIALLY_PAID" else "PAYMENT_RECEIVED"
    return {
        "ok": True,
        "status": status,
        "invoice": inv,
        "payment": pay,
        "applied": apply_amt,
        "event": emit_event(
            event_type,
            client=inv["client"],
            engagement=inv.get("engagementId"),
            invoice=inv["invoiceId"],
            payment=pay["paymentId"],
            amount=apply_amt,
            source=pay.get("source"),
            reconciliation_status=status,
        ),
    }


def record_refund(
    invoice: dict[str, Any],
    payment: dict[str, Any],
    *,
    amount: float,
    reason: str,
    approver: str,
    source: str = "manual",
) -> dict[str, Any]:
    inv = deepcopy(invoice)
    pay = deepcopy(payment)
    amt = float(amount)
    refund = {
        "refundId": _id("RFD"),
        "amount": amt,
        "refundDate": _now(),
        "relatedPayment": pay["paymentId"],
        "relatedInvoice": inv["invoiceId"],
        "reason": reason,
        "approver": approver,
        "source": source,
        "autonomousExecution": False,
    }
    inv.setdefault("refunds", []).append(refund)
    inv["amountCollected"] = round(max(0.0, float(inv.get("amountCollected") or 0) - amt), 2)
    _refresh_invoice_status(inv)
    inv["reconciliationStatus"] = "REVIEW_REQUIRED"
    return {
        "invoice": inv,
        "payment": pay,
        "refund": refund,
        "event": emit_event(
            "REFUND",
            client=inv["client"],
            invoice=inv["invoiceId"],
            payment=pay["paymentId"],
            amount=amt,
            source=source,
            recorded_by=approver,
        ),
        "note": "Refund tracked — autonomous refund execution not authorized",
    }


def record_write_off(
    invoice: dict[str, Any],
    *,
    amount: float,
    reason: str,
    approver: str,
    approved: bool = True,
) -> dict[str, Any]:
    if not approved:
        return {"ok": False, "status": "BLOCKED_POLICY", "message": "Write-off requires human approval"}
    inv = deepcopy(invoice)
    amt = float(amount)
    wo = {
        "writeOffId": _id("WO"),
        "originalBalance": inv.get("balanceDue"),
        "amount": amt,
        "reason": reason,
        "approver": approver,
        "date": _now(),
        "isPayment": False,
    }
    inv.setdefault("writeOffs", []).append(wo)
    _refresh_invoice_status(inv)
    if inv["balanceDue"] <= 0.001:
        inv["status"] = "WRITTEN_OFF"
    return {
        "ok": True,
        "invoice": inv,
        "writeOff": wo,
        "event": emit_event(
            "WRITE_OFF",
            client=inv["client"],
            invoice=inv["invoiceId"],
            amount=amt,
            recorded_by=approver,
        ),
        "note": "Write-off is NOT collected revenue",
    }


def collected_revenue(invoices: list[dict[str, Any]]) -> dict[str, Any]:
    gross = 0.0
    refunds = 0.0
    for inv in invoices:
        gross += float(inv.get("amountCollected") or 0)
        for r in inv.get("refunds") or []:
            refunds += float(r.get("amount") or 0)
            # amountCollected already net of refunds in record_refund; recount gross from paymentsApplied
    # Prefer sum of paymentsApplied for gross when refunds present
    gross_from_payments = 0.0
    for inv in invoices:
        applied = sum(float(p.get("amount") or 0) for p in inv.get("paymentsApplied") or [])
        if applied:
            gross_from_payments += applied
        else:
            # no refunds path: amountCollected is gross
            if not inv.get("refunds"):
                gross_from_payments += float(inv.get("amountCollected") or 0)
            else:
                gross_from_payments += float(inv.get("amountCollected") or 0) + sum(
                    float(r.get("amount") or 0) for r in inv.get("refunds") or []
                )
    net = round(gross_from_payments - refunds, 2)
    return {
        "grossCollected": round(gross_from_payments, 2),
        "refunds": round(refunds, 2),
        "reversals": 0.0,
        "netCollected": net,
        "definition": "Verified HVCG payments attributable to invoices, net of refunds",
        "notEqualTo": ["Proposed", "Contracted", "Invoiced", "Pipeline", "ClientFunding", "Award", "Recovery"],
    }


def invoiced_totals(invoices: list[dict[str, Any]]) -> dict[str, Any]:
    total = sum(float(i.get("currentAmount") or 0) for i in invoices if i.get("status") != "VOID")
    outstanding = sum(float(i.get("balanceDue") or 0) for i in invoices if i.get("status") not in ("VOID", "WRITTEN_OFF"))
    return {"totalInvoiced": round(total, 2), "totalOutstanding": round(outstanding, 2)}


# --- Success fees ---


def create_success_fee(
    *,
    client: str,
    engagement_id: str,
    offer: str | None,
    agreement_reference: str | None,
    fee_type: str,
    percentage: float | None = None,
    fixed_amount: float | None = None,
    fee_base_definition: str = "eligible_verified_base",
    trigger: str,
    causation_requirement: str | None = None,
    exclusions: list[str] | None = None,
    domain: str = "Capital",
) -> dict[str, Any]:
    if not agreement_reference:
        return {
            "successFeeId": _id("SF"),
            "client": client,
            "engagementId": engagement_id,
            "status": "MISSING_AGREEMENT",
            "earnedAmount": 0.0,
            "collectedAmount": 0.0,
            "message": "No executed success-fee agreement — fee not earned",
        }
    return {
        "successFeeId": _id("SF"),
        "client": client,
        "engagementId": engagement_id,
        "offer": offer,
        "agreementReference": agreement_reference,
        "feeType": fee_type,
        "percentage": percentage,
        "fixedAmount": fixed_amount,
        "feeBase": fee_base_definition,
        "trigger": trigger,
        "triggerDefinition": trigger,
        "causationRequirement": causation_requirement,
        "exclusions": exclusions or [],
        "tailPeriod": None,
        "effectiveDate": _now(),
        "complianceStatus": "PENDING_REVIEW",
        "permissibilityStatus": "REVIEW_REQUIRED",
        "reviewRequired": True,
        "status": "AGREED",
        "triggerEvidence": None,
        "triggerDate": None,
        "earnedAmount": 0.0,
        "invoiceId": None,
        "collectedAmount": 0.0,
        "domain": domain,
        "clientOutcomeSeparateFromHvcgRevenue": True,
    }


def evaluate_capital_success_fee(
    fee: dict[str, Any],
    *,
    requested: float,
    submitted: float,
    approved: float,
    closed: float,
    funded: float,
) -> dict[str, Any]:
    out = deepcopy(fee)
    out["capitalTruth"] = {
        "requestedCapital": requested,
        "submittedCapital": submitted,
        "approvedCapital": approved,
        "closedCapital": closed,
        "fundedCapital": funded,
        "note": "Funded capital ≠ HVCG collected revenue",
    }
    if out.get("status") == "MISSING_AGREEMENT":
        return out
    if funded <= 0:
        out["status"] = "POTENTIAL"
        return out
    out["status"] = "TRIGGER_REVIEW"
    out["triggerEvidence"] = {"funded": funded}
    out["triggerDate"] = _now()
    # Potential only until verified + compliance
    pct = float(out.get("percentage") or 0)
    potential = round(funded * pct / 100.0, 2) if pct else float(out.get("fixedAmount") or 0)
    out["potentialFee"] = potential
    out["earnedAmount"] = 0.0
    out["hvcgCollectedSuccessFee"] = 0.0
    out["message"] = "Funding triggers review — fee not collected until HVCG receives payment"
    return out


def verify_success_fee_earned(fee: dict[str, Any], *, eligible_base: float, reviewer: str) -> dict[str, Any]:
    out = deepcopy(fee)
    if out.get("status") == "MISSING_AGREEMENT":
        return out
    pct = float(out.get("percentage") or 0)
    earned = round(eligible_base * pct / 100.0, 2) if pct else float(out.get("fixedAmount") or 0)
    out["eligibleBase"] = eligible_base
    out["earnedAmount"] = earned
    out["status"] = "EARNED"
    out["complianceStatus"] = "REVIEWED"
    out["reviewer"] = reviewer
    out["event"] = emit_event(
        "SUCCESS_FEE_EARNED",
        client=out["client"],
        engagement=out.get("engagementId"),
        offer=out.get("offer"),
        agreement=out.get("agreementReference"),
        amount=earned,
        recorded_by=reviewer,
        extra={"eligibleBase": eligible_base},
    )
    return out


def evaluate_procurement_success_fee(
    fee: dict[str, Any],
    *,
    estimated_value: float,
    bid_amount: float,
    award_amount: float,
    client_recognized: float = 0.0,
    client_collected: float = 0.0,
) -> dict[str, Any]:
    out = deepcopy(fee)
    out["procurementTruth"] = {
        "estimatedOpportunityValue": estimated_value,
        "bidAmount": bid_amount,
        "awardAmount": award_amount,
        "clientRecognizedRevenue": client_recognized,
        "clientCollectedRevenue": client_collected,
        "note": "Award value is not HVCG revenue",
    }
    out["hvcgCollectedRevenue"] = float(out.get("collectedAmount") or 0)
    if out.get("status") != "MISSING_AGREEMENT" and award_amount > 0:
        out["status"] = "TRIGGER_REVIEW"
    return out


def evaluate_risk_success_fee(
    fee: dict[str, Any],
    *,
    claimed: float,
    verified_loss: float,
    requested_recovery: float,
    approved_recovery: float,
    paid_recovery: float,
    verified_savings: float | None = None,
) -> dict[str, Any]:
    out = deepcopy(fee)
    out["riskTruth"] = {
        "claimedAmount": claimed,
        "verifiedLoss": verified_loss,
        "requestedRecovery": requested_recovery,
        "approvedRecovery": approved_recovery,
        "paidRecovery": paid_recovery,
        "verifiedSavings": verified_savings,
        "note": "Do not calculate fees from hypothetical unsupported savings",
    }
    if out.get("status") == "MISSING_AGREEMENT":
        return out
    if paid_recovery > 0 or (verified_savings or 0) > 0:
        out["status"] = "TRIGGER_REVIEW"
        out["eligibleBaseCandidate"] = verified_savings if verified_savings is not None else paid_recovery
    return out


# --- Referrals ---


def create_referral_partner(**kwargs: Any) -> dict[str, Any]:
    return {
        "partnerId": kwargs.get("partner_id") or _id("RP"),
        "name": kwargs.get("name"),
        "contact": kwargs.get("contact"),
        "organization": kwargs.get("organization"),
        "partnerType": kwargs.get("partner_type", "Strategic"),
        "agreement": kwargs.get("agreement"),
        "effectiveDate": kwargs.get("effective_date"),
        "compensationStructure": kwargs.get("compensation_structure")
        or {"basis": "ELIGIBLE_COLLECTED_HVCG_REVENUE", "ratePct": 10},
        "paymentMethod": kwargs.get("payment_method"),
        "status": "Active",
        "owner": kwargs.get("owner"),
        "notes": kwargs.get("notes"),
    }


def referral_lineage(**kwargs: Any) -> dict[str, Any]:
    return {
        "partner": kwargs.get("partner"),
        "lead": kwargs.get("lead"),
        "opportunity": kwargs.get("opportunity"),
        "diagnostic": kwargs.get("diagnostic"),
        "proposal": kwargs.get("proposal"),
        "engagement": kwargs.get("engagement"),
        "invoice": kwargs.get("invoice"),
        "collectedRevenue": kwargs.get("collected_revenue"),
        "referralEligibility": kwargs.get("eligibility"),
        "referralApproval": kwargs.get("approval"),
        "referralPayment": kwargs.get("payment"),
        "attributionPreserved": True,
    }


def calculate_referral_eligibility(
    *,
    partner: dict[str, Any],
    client: str,
    engagement_id: str,
    offer: str | None,
    eligible_collected_revenue: float,
    revenue_type: str = "success_fee",
    prior_payouts: float = 0.0,
    refunds: float = 0.0,
    exclusions: list[str] | None = None,
) -> dict[str, Any]:
    agreement = partner.get("agreement")
    structure = partner.get("compensationStructure") or {}
    if not agreement:
        return {
            "status": "NOT_ELIGIBLE",
            "message": "Missing referral agreement",
            "approvalRequired": False,
        }
    basis = float(eligible_collected_revenue) - float(refunds)
    if basis <= 0:
        return {
            "status": "PENDING_REVENUE",
            "eligibleRevenueBase": 0.0,
            "potentialPayout": 0.0,
            "approvalRequired": False,
            "explanation": "No eligible collected HVCG revenue yet",
            "agreementReference": agreement,
            "defaultRule": "REFERRAL BASED ON ELIGIBLE COLLECTED HVCG REVENUE — not proposal/contract/invoice/funding/award",
        }
    rate = float(structure.get("ratePct") or 0)
    potential = round(basis * rate / 100.0, 2)
    potential = max(0.0, potential - float(prior_payouts))
    return {
        "status": "ELIGIBLE",
        "partnerId": partner.get("partnerId"),
        "partnerName": partner.get("name"),
        "client": client,
        "engagementId": engagement_id,
        "offer": offer,
        "revenueType": revenue_type,
        "eligibleRevenueBase": round(basis, 2),
        "ratePct": rate,
        "potentialPayout": potential,
        "priorPayouts": prior_payouts,
        "refunds": refunds,
        "exclusions": exclusions or [],
        "explanation": f"{rate}% of eligible collected HVCG revenue ${basis}",
        "agreementReference": agreement,
        "approvalRequired": True,
        "defaultRule": load_revenue_policy()["defaultReferralRule"],
    }


def create_referral_payout_approval(eligibility: dict[str, Any]) -> dict[str, Any]:
    return {
        "list": "HVCG_Approvals",
        "approvalId": _id("APR"),
        "approvalType": "ReferralPayout",
        "partner": eligibility.get("partnerName"),
        "client": eligibility.get("client"),
        "engagement": eligibility.get("engagementId"),
        "offer": eligibility.get("offer"),
        "agreement": eligibility.get("agreementReference"),
        "eligibleCollectedRevenue": eligibility.get("eligibleRevenueBase"),
        "rate": eligibility.get("ratePct"),
        "calculatedAmount": eligibility.get("potentialPayout"),
        "priorPayouts": eligibility.get("priorPayouts"),
        "refundAdjustmentHistory": eligibility.get("refunds"),
        "complianceFlags": [],
        "sourceEvidence": eligibility.get("explanation"),
        "recommendedPayout": eligibility.get("potentialPayout"),
        "status": "Pending",
        "requestedDate": _now(),
        "payoutExecutionAuthorized": False,
    }


def approve_referral_payout(approval: dict[str, Any], *, approver: str) -> dict[str, Any]:
    out = deepcopy(approval)
    out["status"] = "APPROVED"
    out["referralState"] = "PAYABLE"
    out["approver"] = approver
    out["completedDate"] = _now()
    out["payoutExecutionAuthorized"] = False
    out["stop"] = "PAYABLE → STOP BEFORE PAYMENT"
    out["event"] = emit_event(
        "REFERRAL_APPROVED",
        client=out.get("client") or "",
        engagement=out.get("engagement"),
        amount=float(out.get("calculatedAmount") or 0),
        recorded_by=approver,
        agreement=out.get("agreement"),
    )
    return out


def attempt_mark_referral_paid(referral_state: str, *, approval_status: str | None) -> dict[str, Any]:
    if approval_status != "APPROVED":
        return {
            "ok": False,
            "status": "BLOCKED_POLICY",
            "message": "Cannot mark REFERRAL_PAID without required approval",
            "attemptedState": "PAID",
            "currentState": referral_state,
        }
    return {
        "ok": False,
        "status": "BLOCKED_POLICY",
        "message": "Payout execution DISABLED — ACH/check/transfer not authorized in Sprint 12",
        "referralState": "PAYABLE",
        "productionPaymentTools": "DISABLED",
    }


# --- AR aging (HVCG own receivables) ---


def hvcg_ar_aging(invoices: list[dict[str, Any]], *, as_of: date | None = None) -> dict[str, Any]:
    today = as_of or date.today()
    buckets = {b: [] for b in load_revenue_policy()["agingBuckets"]}
    for inv in invoices:
        if float(inv.get("balanceDue") or 0) <= 0:
            continue
        if inv.get("status") in ("VOID", "WRITTEN_OFF"):
            continue
        try:
            due = date.fromisoformat(str(inv["dueDate"])[:10])
        except Exception:
            due = today
        days = (today - due).days
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
        buckets[bucket].append(
            {
                "client": inv.get("client"),
                "invoice": inv.get("invoiceNumber") or inv.get("invoiceId"),
                "openBalance": inv.get("balanceDue"),
                "dueDate": inv.get("dueDate"),
                "daysOutstanding": max(0, days),
                "collectionStatus": inv.get("status"),
                "lastPayment": (inv.get("paymentsApplied") or [{}])[-1].get("paymentId")
                if inv.get("paymentsApplied")
                else None,
                "draftFollowUpState": "NOT_SENT",
                "domain": "HVCG_AR_NOT_CLIENT_AR",
            }
        )
    return {
        "asOf": today.isoformat(),
        "buckets": buckets,
        "totals": {k: round(sum(float(i["openBalance"]) for i in v), 2) for k, v in buckets.items()},
        "note": "HVCG receivables aging — distinct from client AR (CFO)",
    }


def draft_collection_reminder(invoice: dict[str, Any]) -> dict[str, Any]:
    draft = {
        "type": "CollectionReminderDraft",
        "invoiceId": invoice.get("invoiceId"),
        "client": invoice.get("client"),
        "balanceDue": invoice.get("balanceDue"),
        "status": "DRAFT",
        "body": f"Internal draft: balance due {invoice.get('balanceDue')} for invoice {invoice.get('invoiceNumber')}",
        "humanApprovalRequired": True,
        "externalSend": False,
    }
    return draft


def attempt_send_collection_reminder(draft: dict[str, Any]) -> dict[str, Any]:
    if BL_C1_ACTIVE:
        return {
            "ok": False,
            "status": "BLOCKED_POLICY",
            "blC1Active": True,
            "message": "BL-C1 — collection reminder send blocked before side effects",
            "draft": draft,
        }
    return {"ok": False, "status": "BLOCKED_POLICY", "message": "External send disabled"}


# --- Agents ---


def run_invoice_agent(
    *,
    invoices: list[dict[str, Any]],
    payments: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    payments = payments or []
    open_inv = [i for i in invoices if float(i.get("balanceDue") or 0) > 0]
    overdue = [i for i in open_inv if i.get("status") == "OVERDUE"]
    duplicates = [p for p in payments if p.get("duplicate")]
    conflicts = [p for p in payments if p.get("reconciliationStatus") == "SOURCE_CONFLICT"]
    collected = collected_revenue(invoices)
    drafts = [draft_collection_reminder(i) for i in overdue[:5]]
    return {
        "agent": "AGT-INVOICE",
        "status": "SUCCESS",
        "openInvoices": len(open_inv),
        "overdue": len(overdue),
        "partialPayments": len([i for i in invoices if i.get("status") == "PARTIALLY_PAID"]),
        "duplicatesFlagged": len(duplicates),
        "sourceConflicts": len(conflicts),
        "collectedRevenue": collected,
        "reconciliationSummary": {
            "reconciled": len([i for i in invoices if i.get("reconciliationStatus") == "RECONCILED"]),
            "unreconciled": len([i for i in invoices if i.get("reconciliationStatus") == "UNRECONCILED"]),
            "conflicts": len(conflicts),
        },
        "reminderDrafts": drafts,
        "prohibited": [
            "unauthorized_invoice_create",
            "change_invoice_amounts",
            "issue_credits",
            "write_off",
            "refund",
            "charge_payment_methods",
            "send_collection_notices",
            "modify_bank_records",
        ],
        "blC1Active": BL_C1_ACTIVE,
        "maturityTarget": "FULL_DEV_RUNTIME",
        "productionReady": False,
    }


def run_referral_agent(
    *,
    partner: dict[str, Any],
    eligibility: dict[str, Any] | None = None,
    lineage: dict[str, Any] | None = None,
) -> dict[str, Any]:
    elig = eligibility or calculate_referral_eligibility(
        partner=partner,
        client="unknown",
        engagement_id="unknown",
        offer=None,
        eligible_collected_revenue=0.0,
    )
    approval = None
    if elig.get("approvalRequired") and elig.get("potentialPayout", 0) > 0:
        approval = create_referral_payout_approval(elig)
    return {
        "agent": "AGT-REFERRAL",
        "status": "NEEDS_HUMAN" if approval else "SUCCESS",
        "lineage": lineage or {},
        "eligibility": elig,
        "approval": approval,
        "payoutReady": bool(approval),
        "prohibited": [
            "approve_payout",
            "issue_payment",
            "change_agreement_terms",
            "alter_collected_revenue",
            "auto_partner_communication",
        ],
        "productionReady": False,
        "maturityTarget": "FULL_DEV_RUNTIME",
    }


# --- Rollups / Client 360 / Owner Brief / ECC ---


def client_revenue_truth(
    *,
    client: str,
    economics: dict[str, Any] | None,
    invoices: list[dict[str, Any]],
    success_fees: list[dict[str, Any]] | None = None,
    referral: dict[str, Any] | None = None,
) -> dict[str, Any]:
    inv_tot = invoiced_totals(invoices)
    col = collected_revenue(invoices)
    sf = success_fees or []
    return {
        "client": client,
        "contracted": {
            "economics": economics,
            "currentContractedPrice": (economics or {}).get("retainer"),
            "agreement": (economics or {}).get("agreement_reference"),
            "legacyProtected": (economics or {}).get("legacy_pricing_protected", False),
            "recommendedFutureSeparate": (economics or {}).get("recommended_future_pricing"),
        },
        "invoiced": {
            "invoices": [i.get("invoiceNumber") for i in invoices],
            "totalInvoiced": inv_tot["totalInvoiced"],
            "outstanding": inv_tot["totalOutstanding"],
        },
        "collected": {"paymentsNet": col["netCollected"], "gross": col["grossCollected"], "refunds": col["refunds"]},
        "successFees": {
            "potential": sum(float(s.get("potentialFee") or 0) for s in sf),
            "earned": sum(float(s.get("earnedAmount") or 0) for s in sf),
            "invoiced": sum(float(s.get("earnedAmount") or 0) for s in sf if s.get("status") == "INVOICED"),
            "collected": sum(float(s.get("collectedAmount") or 0) for s in sf),
        },
        "referral": referral or {},
        "disclaimer": "Internal HVCG revenue truth. Referral economics not for client portal.",
        "precedence": load_revenue_policy()["revenueSourcePrecedence"],
    }


def owner_brief_revenue(
    *,
    invoices: list[dict[str, Any]],
    payments: list[dict[str, Any]] | None = None,
    success_fees: list[dict[str, Any]] | None = None,
    referral_payables: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    payments = payments or []
    sf = success_fees or []
    col = collected_revenue(invoices)
    inv = invoiced_totals(invoices)
    aging = hvcg_ar_aging(invoices)
    return {
        "collectedRevenue": col["netCollected"],
        "invoicedRevenue": inv["totalInvoiced"],
        "outstandingAR": inv["totalOutstanding"],
        "overdueAR": aging["totals"].get("1-30", 0)
        + aging["totals"].get("31-60", 0)
        + aging["totals"].get("61-90", 0)
        + aging["totals"].get("90+", 0),
        "unreconciledPayments": len(
            [p for p in payments if p.get("reconciliationStatus") in ("UNRECONCILED", "SOURCE_CONFLICT", "REVIEW_REQUIRED")]
        ),
        "earnedUncollectedSuccessFees": sum(
            float(s.get("earnedAmount") or 0) - float(s.get("collectedAmount") or 0) for s in sf
        ),
        "referralPayables": sum(float(r.get("calculatedAmount") or r.get("potentialPayout") or 0) for r in (referral_payables or [])),
        "revenueExceptions": len([p for p in payments if p.get("reconciliationStatus") == "SOURCE_CONFLICT"]),
        "fabricatedMetrics": False,
        "aging": aging,
    }


def ecc_revenue_truth_cards(
    *,
    pipeline: float = 0.0,
    proposed: float = 0.0,
    contracted: float = 0.0,
    invoiced: float = 0.0,
    collected: float = 0.0,
) -> list[dict[str, Any]]:
    return [
        {"label": "Pipeline", "value": pipeline, "bucket": "Pipeline"},
        {"label": "Proposed", "value": proposed, "bucket": "Proposed"},
        {"label": "Contracted", "value": contracted, "bucket": "Contracted"},
        {"label": "Invoiced", "value": invoiced, "bucket": "Invoiced"},
        {"label": "Collected", "value": collected, "bucket": "Collected"},
    ]


def client_concentration(collected_by_client: dict[str, float]) -> dict[str, Any]:
    total = sum(collected_by_client.values()) or 1.0
    ranked = sorted(collected_by_client.items(), key=lambda x: -x[1])
    pcts = [(c, round(100 * a / total, 2)) for c, a in ranked]
    return {
        "byClientPct": pcts,
        "topClientPct": pcts[0][1] if pcts else 0,
        "top3Pct": round(sum(p for _, p in pcts[:3]), 2),
        "top5Pct": round(sum(p for _, p in pcts[:5]), 2),
        "basis": "collected_revenue",
        "note": "Operating signal — not enterprise valuation",
    }


def contribution_foundation(
    *,
    collected: float,
    referral_payouts: float = 0.0,
    pass_through: float = 0.0,
    direct_project_costs: float | None = None,
) -> dict[str, Any]:
    out = {
        "collectedRevenue": collected,
        "referralPayouts": referral_payouts,
        "directPassThroughCosts": pass_through,
        "approvedDirectProjectCosts": direct_project_costs,
    }
    if direct_project_costs is None:
        out["contribution"] = None
        out["note"] = "Contribution not invented — project costs incomplete"
    else:
        out["contribution"] = round(collected - referral_payouts - pass_through - direct_project_costs, 2)
    return out


def manual_reconcile(
    *,
    invoice: dict[str, Any],
    payment: dict[str, Any],
    resolution: str,
    user: str,
    evidence: str,
    reason: str,
    chosen_amount: float,
) -> dict[str, Any]:
    inv = deepcopy(invoice)
    pay = deepcopy(payment)
    audit = {
        "previousPaymentAmount": pay.get("amount"),
        "previousConflict": pay.get("conflictingAmount"),
        "newValue": chosen_amount,
        "resolution": resolution,
        "user": user,
        "date": _now(),
        "evidence": evidence,
        "reason": reason,
        "originalValuesPreserved": True,
    }
    pay["amount"] = chosen_amount
    pay.pop("conflictingAmount", None)
    pay["verificationStatus"] = "MANUALLY_VERIFIED"
    pay.setdefault("adjustmentAudit", []).append(audit)
    result = reconcile_payment_to_invoice(inv, pay, force=True)
    result["manualAudit"] = audit
    return result


def second_brain_revenue_answer(truth: dict[str, Any]) -> dict[str, Any]:
    return {
        "status": "SUCCESS",
        "answerKinds": [
            {"kind": "SOURCE_FACT", "label": "Contracted", "value": truth["contracted"].get("currentContractedPrice")},
            {"kind": "SOURCE_FACT", "label": "Invoiced", "value": truth["invoiced"]["totalInvoiced"]},
            {"kind": "SOURCE_FACT", "label": "Collected", "value": truth["collected"]["paymentsNet"]},
            {"kind": "SOURCE_FACT", "label": "Outstanding", "value": truth["invoiced"]["outstanding"]},
            {
                "kind": "SOURCE_FACT",
                "label": "SuccessFeeEarned",
                "value": truth["successFees"]["earned"],
            },
            {
                "kind": "SOURCE_FACT",
                "label": "ReferralEligibleBase",
                "value": (truth.get("referral") or {}).get("eligibleRevenueBase"),
            },
            {
                "kind": "SOURCE_FACT",
                "label": "ReferralEligible",
                "value": (truth.get("referral") or {}).get("potentialPayout"),
            },
            {
                "kind": "SOURCE_FACT",
                "label": "ReferralPayable",
                "value": (truth.get("referral") or {}).get("payable"),
            },
            {
                "kind": "SOURCE_FACT",
                "label": "ReferralPaid",
                "value": (truth.get("referral") or {}).get("paid", 0),
            },
        ],
        "citations": [
            {"source": "EngagementEconomics"},
            {"source": "HVCG_Invoices"},
            {"source": "HVCG_Payments"},
            {"source": "ReferralAgreement"},
        ],
        "disclaimer": "Authoritative revenue records over proposal text. AI summary is not cash.",
        "precedence": load_revenue_policy()["revenueSourcePrecedence"],
    }
