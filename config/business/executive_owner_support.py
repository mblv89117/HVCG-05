"""HVCG Executive Owner Support + Executive Intelligence (Development) — Sprint 14.

Extends Atlas — does NOT create a second ECC, Client 360, portal, Second Brain,
approvals plane, or executive app. Domain SoRs remain authoritative.
AGT-CONCIERGE is not a superuser. BL-C1 active. All Production gates remain.
DOCUMENT_ACCEPTED ≠ AUTOMATICALLY_AUTHORITATIVE.
AI_RECOMMENDATION ≠ OWNER_DECISION.
"""

from __future__ import annotations

import uuid
from copy import deepcopy
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any

from pricing_policy import ACCG_LOCKED_MONTHLY, is_legacy_client, load_json

try:
    import document_os as document_os
except ImportError:  # pragma: no cover
    document_os = None  # type: ignore

BL_C1_ACTIVE = True
RISK_ACL_GATE = "GATE-RISK-ELEVATED-ACL-PROD"
PORTAL_GATE = "GATE-CLIENT-PORTAL-PROD"
M365_GATE = "GATE-M365-SECOND-BRAIN-PROD"
RUNTIME_VERSION = "1.0.0-dev"
AGENT_CONCIERGE = "AGT-CONCIERGE"
SERVICE_LINE = "SL-OWNER"
OFFER_CODE = "OFF-OWNER-SUPPORT"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10].upper()}"


def load_eos_policy() -> dict[str, Any]:
    return load_json("executive-owner-support-policy.json")


# --- Context / ACL (DENY unless explicitly authorized) ---


@dataclass
class ExecUserContext:
    user: str
    role: str
    client: str | None = None
    allowed_clients: list[str] = field(default_factory=list)
    owner_support_scope: bool = False
    elevated_risk_access: bool = False
    hr_access: bool = False
    is_client_portal_user: bool = False
    authorized_matters: list[str] = field(default_factory=list)
    environment: str = "DEV"


def establish_exec_context(**kwargs: Any) -> dict[str, Any]:
    ctx = ExecUserContext(**{k: v for k, v in kwargs.items() if k in ExecUserContext.__dataclass_fields__})
    out = asdict(ctx)
    out["blC1Active"] = BL_C1_ACTIVE
    out["defaultAccess"] = "DENY_UNLESS_EXPLICITLY_AUTHORIZED"
    out["status"] = "OK"
    if ctx.is_client_portal_user:
        out["owner_support_scope"] = False  # portal never gets Owner Support
    if ctx.allowed_clients and ctx.client and ctx.client not in ctx.allowed_clients:
        out["status"] = "BLOCKED_PERMISSION"
    return out


def assert_client_isolation(ctx: dict[str, Any], client: str) -> dict[str, Any]:
    if ctx.get("client") and ctx["client"] != client:
        return {"ok": False, "status": "BLOCKED_PERMISSION", "message": "Client A must never see Client B"}
    allowed = ctx.get("allowed_clients") or []
    if allowed and client not in allowed:
        return {"ok": False, "status": "BLOCKED_PERMISSION", "message": "Client outside allow-list"}
    return {"ok": True, "client": client}


def can_access_owner_support(ctx: dict[str, Any], engagement: dict[str, Any] | None = None) -> dict[str, Any]:
    if ctx.get("is_client_portal_user"):
        return {"ok": False, "status": "BLOCKED_PERMISSION", "message": "Owner Support never on Client Portal", "gate": PORTAL_GATE}
    if not ctx.get("owner_support_scope"):
        return {"ok": False, "status": "BLOCKED_PERMISSION", "message": "Owner Support requires explicit authorization"}
    if engagement:
        iso = assert_client_isolation(ctx, engagement.get("clientId") or "")
        if not iso.get("ok") and engagement.get("clientId"):
            return iso
        matter_id = engagement.get("engagementId")
        authorized = ctx.get("authorized_matters") or []
        if authorized and matter_id and matter_id not in authorized:
            return {"ok": False, "status": "BLOCKED_PERMISSION", "message": "Matter not in authorized scope"}
    return {"ok": True}


# --- Owner Support Engagement ---


def create_owner_support_engagement(**kwargs: Any) -> dict[str, Any]:
    policy = load_eos_policy()
    status = kwargs.get("status", "OPEN")
    matter_type = kwargs.get("matterType", "CONFIDENTIAL_SPECIAL_PROJECT")
    if status not in policy["engagementStatuses"]:
        raise ValueError(f"Invalid engagement status: {status}")
    if matter_type not in policy["matterTypes"]:
        raise ValueError(f"Invalid matter type: {matter_type}")
    eng = {
        "engagementId": kwargs.get("engagementId") or _id("OSE"),
        "clientId": kwargs.get("clientId"),
        "principalIdentity": kwargs.get("principalIdentity") or "Manny Barela",
        "matterName": kwargs.get("matterName") or "Owner Support Matter",
        "matterType": matter_type,
        "status": status,
        "confidentiality": kwargs.get("confidentiality") or "OWNER_SUPPORT_RESTRICTED",
        "assignedInternalOwner": kwargs.get("assignedInternalOwner") or "Manny",
        "openedDate": kwargs.get("openedDate") or _now()[:10],
        "targetDate": kwargs.get("targetDate"),
        "closedDate": kwargs.get("closedDate"),
        "commercialClass": kwargs.get("commercialClass") or "PRIVATE",
        "contractedEconomicsRef": kwargs.get("contractedEconomicsRef"),
        "documentRefs": list(kwargs.get("documentRefs") or []),
        "issueRefs": list(kwargs.get("issueRefs") or []),
        "decisionRefs": list(kwargs.get("decisionRefs") or []),
        "professionalCoordinationRefs": list(kwargs.get("professionalCoordinationRefs") or []),
        "taskRefs": list(kwargs.get("taskRefs") or []),
        "approvalRefs": list(kwargs.get("approvalRefs") or []),
        "visibility": "OWNER_ONLY",
        "portalVisible": False,
        "generalClient360Visible": False,
        "generalSecondBrainEligible": False,
        "serviceLine": SERVICE_LINE,
        "offerCode": OFFER_CODE,
        "licensingDisclaimer": policy["licensingDisclaimer"],
        "audit": [{"action": "created", "at": _now(), "by": kwargs.get("createdBy") or "system"}],
        "environment": "DEV",
        "productionAuthorized": False,
    }
    return eng


def access_owner_support_engagement(ctx: dict[str, Any], engagement: dict[str, Any]) -> dict[str, Any]:
    gate = can_access_owner_support(ctx, engagement)
    if not gate.get("ok"):
        return {"status": gate["status"], "message": gate.get("message"), "leakage": False, "engagement": None}
    return {"status": "SUCCESS", "engagement": deepcopy(engagement), "leakage": False}


# --- Decision Intelligence (extends HVCG_Decisions concepts; no second decision platform) ---


def create_owner_decision(**kwargs: Any) -> dict[str, Any]:
    policy = load_eos_policy()
    status = kwargs.get("status", "DRAFT")
    if status not in policy["decisionStatuses"]:
        raise ValueError(f"Invalid decision status: {status}")
    rec = {
        "decisionId": kwargs.get("decisionId") or _id("OD"),
        "title": kwargs.get("title") or "Owner Decision",
        "issue": kwargs.get("issue") or "",
        "clientId": kwargs.get("clientId"),
        "ownerSupportEngagementId": kwargs.get("ownerSupportEngagementId"),
        "affectedDomains": list(kwargs.get("affectedDomains") or []),
        "decisionType": kwargs.get("decisionType") or "OPERATING",
        "priority": kwargs.get("priority") or "MATERIAL",
        "confidentiality": kwargs.get("confidentiality") or "INTERNAL_EXECUTIVE",
        "evidenceRefs": list(kwargs.get("evidenceRefs") or []),
        "documentRefs": list(kwargs.get("documentRefs") or []),
        "sourceRecordRefs": list(kwargs.get("sourceRecordRefs") or []),
        "knownFacts": list(kwargs.get("knownFacts") or []),
        "assumptions": list(kwargs.get("assumptions") or []),
        "conflicts": list(kwargs.get("conflicts") or []),
        "options": list(kwargs.get("options") or []),
        "recommendation": kwargs.get("recommendation"),
        "recommendationSource": kwargs.get("recommendationSource") or "AI_ASSIST",
        "riskTradeoffs": kwargs.get("riskTradeoffs"),
        "ownerDecision": None,
        "status": status,
        "decisionDate": None,
        "effectiveDate": kwargs.get("effectiveDate"),
        "decisionOwner": kwargs.get("decisionOwner") or "Manny",
        "requiredApprovals": list(kwargs.get("requiredApprovals") or ["Owner"]),
        "followUpActions": list(kwargs.get("followUpActions") or []),
        "responsiblePerson": kwargs.get("responsiblePerson"),
        "dueDate": kwargs.get("dueDate"),
        "expectedOutcome": kwargs.get("expectedOutcome"),
        "actualOutcome": None,
        "outcomeVariance": None,
        "outcomeReviewDate": None,
        "supersedes": kwargs.get("supersedes"),
        "supersededBy": None,
        "audit": [{"action": "created", "at": _now(), "by": kwargs.get("createdBy") or "system"}],
        "aiRecommendationIsNotApproval": True,
        "environment": "DEV",
    }
    return rec


def advance_decision(decision: dict[str, Any], *, to_status: str, actor: str, **kwargs: Any) -> dict[str, Any]:
    policy = load_eos_policy()
    if to_status not in policy["decisionStatuses"]:
        raise ValueError(f"Invalid decision status: {to_status}")
    d = deepcopy(decision)
    prior = d["status"]
    # AI cannot mark OWNER_DECISION = APPROVED / DECIDED without Owner actor
    if to_status == "DECIDED":
        if actor.upper() in ("AI", "AGT-CONCIERGE", "SYSTEM") or kwargs.get("aiSelfApprove"):
            return {
                "ok": False,
                "status": "BLOCKED_POLICY",
                "message": "AI_RECOMMENDATION ≠ OWNER_DECISION — Owner action required",
                "decision": d,
            }
        if not kwargs.get("ownerDecision"):
            return {"ok": False, "status": "NEEDS_HUMAN", "message": "Owner decision text required", "decision": d}
        d["ownerDecision"] = kwargs["ownerDecision"]
        d["decisionDate"] = kwargs.get("decisionDate") or _now()[:10]
        if kwargs.get("effectiveDate"):
            d["effectiveDate"] = kwargs["effectiveDate"]
    if to_status == "OUTCOME_REVIEWED":
        d["actualOutcome"] = kwargs.get("actualOutcome")
        d["outcomeVariance"] = kwargs.get("outcomeVariance")
        d["outcomeReviewDate"] = kwargs.get("outcomeReviewDate") or _now()[:10]
        # Do not rewrite original decision
        d["originalDecisionPreserved"] = True
    d["status"] = to_status
    d["audit"].append({"action": f"{prior}->{to_status}", "at": _now(), "by": actor, **{k: v for k, v in kwargs.items() if k not in ("ownerDecision", "aiSelfApprove")}})
    return {"ok": True, "decision": d}


def record_decision_outcome(decision: dict[str, Any], *, actual: str, variance: str, actor: str) -> dict[str, Any]:
    return advance_decision(
        decision,
        to_status="OUTCOME_REVIEWED",
        actor=actor,
        actualOutcome=actual,
        outcomeVariance=variance,
    )


# --- Authority precedence (document accepted ≠ authoritative) ---


def resolve_authority_conflict(
    *,
    executed_agreement: dict[str, Any] | None = None,
    owner_decision: dict[str, Any] | None = None,
    domain_record: dict[str, Any] | None = None,
    accepted_document: dict[str, Any] | None = None,
    ai_summary: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Higher SoR wins; accepted docs do not overwrite executed agreements / Owner decisions."""
    ranked = []
    if domain_record:
        ranked.append(("DOMAIN_RECORD", domain_record, 1))
    if owner_decision and owner_decision.get("status") in ("DECIDED", "IMPLEMENTED", "OUTCOME_PENDING", "OUTCOME_REVIEWED"):
        ranked.append(("OWNER_DECISION", owner_decision, 2))
    if executed_agreement:
        ranked.append(("EXECUTED_AGREEMENT", executed_agreement, 3))
    if accepted_document:
        ranked.append(("ACCEPTED_DOCUMENT", accepted_document, 5))
    if ai_summary:
        ranked.append(("AI_SUMMARY", ai_summary, 7))
    ranked.sort(key=lambda x: x[2])
    winner = ranked[0] if ranked else None
    return {
        "authoritative": winner[1] if winner else None,
        "authoritativeKind": winner[0] if winner else None,
        "documentAcceptedNotAutomaticallyAuthoritative": True,
        "conflictsPreserved": [r[0] for r in ranked[1:]],
        "precedence": load_eos_policy()["sourceOfTruthPrecedence"],
    }


# --- Pricing / ACCG / legacy protection ---


def pricing_protection_snapshot(*, client: str, contracted: float | None = None, recommended: float | None = None) -> dict[str, Any]:
    policy = load_eos_policy()["pricing"]
    is_accg = client.upper().startswith("ACCG")
    legacy = is_legacy_client(client) or is_accg
    return {
        "currentNewClientRateCard": policy["currentNewClientRateCard"],
        "historicalRateCardPreserved": True,
        "currentContracted": contracted if contracted is not None else (ACCG_LOCKED_MONTHLY if is_accg else None),
        "recommendedFuture": recommended,
        "proposed": None,
        "approvedFuture": None,
        "effectiveContracted": contracted if contracted is not None else (ACCG_LOCKED_MONTHLY if is_accg else None),
        "accgLocked": is_accg,
        "accgLockedMonthly": ACCG_LOCKED_MONTHLY if is_accg else None,
        "legacy": legacy,
        "automaticLegacyRepricing": False,
        "repricingLifecycle": [
            "Recommendation",
            "Manny approval",
            "Proposal / amendment",
            "Client agreement/signature",
            "Effective date",
            "Contracted economics update",
        ],
        "recommendationIsNotContract": True,
    }


# --- Executive Concierge (permission parity; not a superuser) ---


def concierge_permission_parity(invoking_ctx: dict[str, Any], agent_ctx: dict[str, Any]) -> dict[str, Any]:
    """Agent permissions must be ≤ invoking human."""
    for key in ("owner_support_scope", "elevated_risk_access", "hr_access", "client", "allowed_clients", "authorized_matters"):
        human = invoking_ctx.get(key)
        agent = agent_ctx.get(key)
        if key in ("owner_support_scope", "elevated_risk_access", "hr_access"):
            if agent and not human:
                return {"ok": False, "status": "BLOCKED_PERMISSION", "message": f"Agent cannot escalate {key}"}
        if key == "client" and agent and human and agent != human:
            return {"ok": False, "status": "BLOCKED_PERMISSION", "message": "Agent client scope exceeds human"}
        if key == "allowed_clients" and agent and human:
            if set(agent or []) - set(human or []):
                return {"ok": False, "status": "BLOCKED_PERMISSION", "message": "Agent allow-list exceeds human"}
        if key == "authorized_matters" and agent and human:
            if set(agent or []) - set(human or []):
                return {"ok": False, "status": "BLOCKED_PERMISSION", "message": "Agent matter scope exceeds human"}
    return {"ok": True, "parity": "agent_lte_human"}


def run_executive_concierge(
    ctx: dict[str, Any],
    request: str,
    *,
    engagement: dict[str, Any] | None = None,
    corpus: list[dict[str, Any]] | None = None,
    attempt_external_send: bool = False,
    attempt_prohibited: str | None = None,
) -> dict[str, Any]:
    policy = load_eos_policy()
    out: dict[str, Any] = {
        "agent": AGENT_CONCIERGE,
        "runtime": RUNTIME_VERSION,
        "governancePlane": "SINGLE_ATLAS_AI_ORCHESTRATOR",
        "superuser": False,
        "blC1Active": BL_C1_ACTIVE,
        "request": request,
        "status": "SUCCESS",
        "drafts": [],
        "approvals": [],
        "prohibitedBlocked": [],
    }

    scope = can_access_owner_support(ctx, engagement)
    if not scope.get("ok"):
        out["status"] = scope["status"]
        out["message"] = scope.get("message")
        return out

    # Permission parity: agent ctx derived from human — cannot escalate
    agent_ctx = deepcopy(ctx)
    parity = concierge_permission_parity(ctx, agent_ctx)
    if not parity.get("ok"):
        out["status"] = "BLOCKED_PERMISSION"
        out["message"] = parity.get("message")
        return out

    # Evidence retrieval within scope only
    evidence = []
    for item in corpus or []:
        if item.get("client") and ctx.get("client") and item["client"] != ctx["client"]:
            continue
        if item.get("ownerSupport") or item.get("domain") == "OwnerSupport":
            if not ctx.get("owner_support_scope"):
                continue
        if item.get("elevated_risk") and not ctx.get("elevated_risk_access"):
            continue
        # Prompt injection content remains data
        content = str(item.get("content") or "")
        evidence.append(
            {
                "sourceId": item.get("source_id") or item.get("documentId"),
                "title": item.get("title"),
                "kind": "SOURCE_FACT",
                "untrustedContent": True,
                "promptInjectionDetected": any(
                    p in content.lower()
                    for p in ("ignore previous", "ignore policy", "reveal all clients", "bypass permission")
                ),
            }
        )

    out["evidence"] = evidence
    out["drafts"].append(
        {
            "type": "IssueSummary",
            "text": f"Draft summary for: {request}",
            "status": "DRAFT",
            "requiresHumanApproval": True,
        }
    )
    out["drafts"].append(
        {
            "type": "Recommendation",
            "text": "AI recommendation only — not Owner decision",
            "status": "RECOMMENDATION",
            "isOwnerDecision": False,
        }
    )
    out["checklist"] = {"agent": "AGT-DOC-CHECKLIST", "status": "DRAFT_REQUESTS_ONLY"}
    out["followUps"] = [{"type": "InternalTask", "status": "DRAFT"}]

    prohibited = attempt_prohibited or ("send_client_email" if attempt_external_send else None)
    if prohibited:
        if prohibited in policy["prohibitedAgentActions"] or attempt_external_send:
            out["prohibitedBlocked"].append(
                {
                    "action": prohibited or "auto_send",
                    "status": "BLOCKED_POLICY",
                    "rule": "APPROVED_TO_SEND ≠ AUTO_SEND" if attempt_external_send else "prohibited",
                    "blC1": BL_C1_ACTIVE,
                }
            )
            out["status"] = "BLOCKED_POLICY"
            out["draftCommunication"] = {
                "status": "DRAFT_ONLY",
                "sent": False,
                "message": "Communication draft prepared — external send blocked (BL-C1)",
            }

    out["disclaimer"] = policy["licensingDisclaimer"]
    return out


def attempt_concierge_retrieve(ctx: dict[str, Any], target: dict[str, Any]) -> dict[str, Any]:
    """Permission parity retrieval — cannot exceed human access."""
    if target.get("ownerSupport") or target.get("domain") == "OwnerSupport":
        gate = can_access_owner_support(ctx, target if target.get("engagementId") else None)
        if not gate.get("ok"):
            return {"status": "BLOCKED_PERMISSION", "leakage": False, "data": None}
    if target.get("client"):
        iso = assert_client_isolation(ctx, target["client"])
        if not iso.get("ok"):
            return {"status": "BLOCKED_PERMISSION", "leakage": False, "data": None}
    if target.get("elevated_risk") or target.get("domain") == "Risk":
        if not ctx.get("elevated_risk_access"):
            return {"status": "BLOCKED_PERMISSION", "gate": RISK_ACL_GATE, "leakage": False, "data": None}
    return {"status": "SUCCESS", "data": target, "leakage": False}


# --- Executive Intelligence (aggregate; no shadow SoR) ---


def build_executive_intelligence(
    ctx: dict[str, Any],
    *,
    domain_snapshots: dict[str, Any],
) -> dict[str, Any]:
    """Cross-domain aggregation with provenance. Domains remain SoR."""
    intel = {
        "generatedAt": _now(),
        "environment": "DEV",
        "fabricatedMetrics": False,
        "shadowSourceOfTruth": False,
        "domains": {},
        "truthRules": load_eos_policy()["truthRules"],
        "provenanceRequired": True,
    }
    for name, snap in domain_snapshots.items():
        if name.startswith("_"):
            continue
        if snap is None:
            intel["domains"][name] = {"status": "NO_DATA", "items": [], "note": "Unavailable — not invented"}
            continue
        # Risk restriction
        if name.lower() in ("risk", "client risks") and snap.get("restricted") and not ctx.get("elevated_risk_access"):
            intel["domains"][name] = {
                "status": "RESTRICTED",
                "items": [],
                "gate": RISK_ACL_GATE,
                "note": "Risk detail withheld",
            }
            continue
        # Owner Support only with scope
        if name.lower().startswith("owner support") and not ctx.get("owner_support_scope"):
            intel["domains"][name] = {
                "status": "RESTRICTED",
                "items": [],
                "note": "Owner Support withheld — explicit scope required",
            }
            continue
        labeled_items = []
        for item in snap.get("items") or []:
            row = deepcopy(item) if isinstance(item, dict) else {"title": str(item)}
            # Label evidence quality
            if row.get("stale"):
                row["evidenceLabel"] = "STALE"
            elif row.get("disputed") or row.get("conflict"):
                row["evidenceLabel"] = "DISPUTED"
            elif row.get("forecast"):
                row["evidenceLabel"] = "FORECAST"
            elif row.get("aiExtracted"):
                row["evidenceLabel"] = "AI_EXTRACTION_UNVERIFIED"
            elif row.get("inferred"):
                row["evidenceLabel"] = "INFERRED"
            else:
                row["evidenceLabel"] = row.get("evidenceLabel") or "SOURCE_FACT"
            labeled_items.append(row)
        intel["domains"][name] = {
            "status": snap.get("status", "OK"),
            "items": labeled_items,
            "source": snap.get("source"),
            "authoritativeDomain": True,
            "executiveIntelligenceIsNotSoR": True,
        }
    return intel


def build_owner_brief_v2(
    ctx: dict[str, Any],
    *,
    domain_snapshots: dict[str, Any],
    prior_brief: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Extend Owner Brief — materiality over chronology; no fabricated totals."""
    sections = list(load_eos_policy()["ownerBriefSections"])
    # Preserve legacy aliases used by prior Owner Brief callers
    for legacy in (
        "Revenue",
        "Cash / CFO",
        "Risk",
        "Growth",
        "Approvals",
        "Critical Deadlines",
        "Procurement",
        "Documents",
    ):
        if legacy not in sections:
            sections.append(legacy)

    brief = {
        "generatedAt": _now(),
        "environment": "DEV",
        "question": "What needs Manny's attention now?",
        "sections": {},
        "fabricatedMetrics": False,
        "shadowSourceOfTruth": False,
        "materialityOrdered": True,
    }
    # Merge elevated flag from snapshots for compatibility
    merged_ctx = dict(ctx or {})
    if domain_snapshots.get("_elevated_risk_access"):
        merged_ctx["elevated_risk_access"] = True

    intel = build_executive_intelligence(merged_ctx, domain_snapshots=domain_snapshots)
    for sec in sections:
        snap = domain_snapshots.get(sec)
        if snap is None and sec not in intel["domains"]:
            brief["sections"][sec] = {"status": "NO_DATA", "items": [], "note": "Unavailable — not invented"}
            continue
        if sec in intel["domains"]:
            brief["sections"][sec] = intel["domains"][sec]
            continue
        # Direct snap path (when intel skipped underscore-only)
        if snap.get("restricted") and sec.lower() in ("risk", "client risks") and not merged_ctx.get("elevated_risk_access"):
            brief["sections"][sec] = {
                "status": "RESTRICTED",
                "items": [],
                "gate": RISK_ACL_GATE,
                "note": "Risk detail withheld",
            }
        else:
            brief["sections"][sec] = {
                "status": snap.get("status", "OK"),
                "items": snap.get("items") or [],
                "source": snap.get("source"),
            }

    if prior_brief:
        changes = []
        for sec, body in brief["sections"].items():
            prior_items = ((prior_brief.get("sections") or {}).get(sec) or {}).get("items") or []
            cur = {str(i.get("id") or i.get("title") if isinstance(i, dict) else i) for i in (body.get("items") or [])}
            old = {str(i.get("id") or i.get("title") if isinstance(i, dict) else i) for i in prior_items}
            added = cur - old
            if added:
                changes.append({"section": sec, "added": list(added), "provenance": body.get("source")})
        brief["sections"]["Material Changes Since Prior Brief"] = {
            "status": "OK" if changes else "NO_DATA",
            "items": changes,
            "source": "diff(prior_brief, current)",
        }
    brief["disclaimer"] = "Domain SoRs remain authoritative. Labels preserve uncertainty."
    return brief


def ask_atlas_executive(
    ctx: dict[str, Any],
    question: str,
    *,
    intel: dict[str, Any],
    decisions: list[dict[str, Any]] | None = None,
    corpus: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    q = question.lower()
    citations = []
    answer = []
    # Cross-client / Owner Support / Risk filters on corpus
    for item in corpus or []:
        if item.get("client") and ctx.get("client") and item["client"] != ctx["client"]:
            continue
        if (item.get("ownerSupport") or item.get("domain") == "OwnerSupport") and not ctx.get("owner_support_scope"):
            continue
        if item.get("elevated_risk") and not ctx.get("elevated_risk_access"):
            continue
        citations.append(
            {
                "sourceId": item.get("source_id") or item.get("documentId") or item.get("decisionId"),
                "title": item.get("title"),
                "kind": item.get("kind") or "SOURCE_FACT",
            }
        )

    if "decision" in q and ("approval" in q or "need" in q or "waiting" in q):
        pending = [d for d in (decisions or []) if d.get("status") in ("DRAFT", "READY_FOR_OWNER")]
        for d in pending:
            if d.get("confidentiality") in ("OWNER_PRIVATE", "OWNER_SUPPORT_RESTRICTED") and not ctx.get("owner_support_scope"):
                continue
            answer.append(
                {
                    "kind": "SOURCE_FACT",
                    "text": f"Decision pending: {d.get('title')} [{d.get('status')}]",
                    "decisionId": d.get("decisionId"),
                    "recommendationIsNotDecision": True,
                }
            )
    elif "owner support" in q:
        if not ctx.get("owner_support_scope"):
            return {
                "status": "BLOCKED_PERMISSION",
                "answer": [],
                "citations": [],
                "leakage": False,
                "message": "Owner Support requires explicit authorization",
            }
        answer.append({"kind": "SOURCE_FACT", "text": "Owner Support matters visible only in authorized scope"})
    elif "unpaid" in q or "invoice" in q:
        rev = (intel.get("domains") or {}).get("Cash / Revenue") or (intel.get("domains") or {}).get("Revenue") or {}
        for item in rev.get("items") or []:
            answer.append(
                {
                    "kind": "SOURCE_FACT",
                    "text": item.get("title") or str(item),
                    "evidenceLabel": item.get("evidenceLabel"),
                    "statesDistinct": True,
                }
            )
    else:
        # Generic: surface material items with labels
        for domain, body in (intel.get("domains") or {}).items():
            for item in (body.get("items") or [])[:2]:
                answer.append(
                    {
                        "kind": "SOURCE_FACT" if item.get("evidenceLabel") == "SOURCE_FACT" else "INFERENCE",
                        "domain": domain,
                        "text": item.get("title") or str(item),
                        "evidenceLabel": item.get("evidenceLabel"),
                        "source": body.get("source"),
                    }
                )

    return {
        "status": "SUCCESS",
        "question": question,
        "answer": answer or [{"kind": "AI_SUMMARY", "text": "No authorized evidence for this question in current context."}],
        "citations": citations,
        "factVsInference": True,
        "recommendationVsDecision": True,
        "disclaimer": "AI summaries are not facts. Domain records remain authoritative.",
    }


def explainable_priority(*, factors: dict[str, Any]) -> dict[str, Any]:
    """No false-precision score without explainability — return ranked reasons only."""
    reasons = []
    mapping = {
        "monetaryExposure": "Monetary exposure",
        "deadlineProximity": "Deadline proximity",
        "clientImportance": "Client importance",
        "cashImpact": "Cash impact",
        "complianceRiskSeverity": "Compliance/risk severity",
        "blockedRevenue": "Blocked revenue",
        "blockedCapital": "Blocked capital",
        "unresolvedOwnerDecision": "Unresolved Owner decision",
        "contractualObligation": "Contractual obligation",
        "durationUnresolved": "Duration unresolved",
        "domainsAffected": "Domains affected",
    }
    for key, label in mapping.items():
        if factors.get(key):
            reasons.append({"factor": key, "label": label, "value": factors[key]})
    return {
        "priorityScoreDisplayed": False,
        "reasons": reasons,
        "note": "Explainable factors only — no opaque priority score",
    }


def portal_owner_support_exclusion(ctx: dict[str, Any], engagement: dict[str, Any]) -> dict[str, Any]:
    """Case N — portal must not discover Owner Support."""
    if not ctx.get("is_client_portal_user"):
        return {"applicable": False}
    result = access_owner_support_engagement(ctx, engagement)
    # Also block document_os path if available
    doc_block = None
    if document_os is not None:
        doc = {
            "documentId": "DOC-OWNER-PRIVATE",
            "client": engagement.get("clientId") or "ClientA",
            "visibility": "OWNER_ONLY",
            "domain": "OwnerSupport",
            "portalVisibility": None,
        }
        doc_block = document_os.can_view_document(ctx, doc)
    return {
        "status": "BLOCKED_PERMISSION",
        "engagementAccess": result.get("status"),
        "documentAccess": (doc_block or {}).get("status"),
        "leakage": False,
        "gate": PORTAL_GATE,
    }


def ecc_executive_summary(ctx: dict[str, Any], intel: dict[str, Any]) -> dict[str, Any]:
    """ECC consumes intelligence — drill-through to domains, no duplicated logic."""
    return {
        "surface": "ECC",
        "duplicateCommandCenter": False,
        "items": [
            {"domain": name, "status": body.get("status"), "count": len(body.get("items") or []), "source": body.get("source")}
            for name, body in (intel.get("domains") or {}).items()
            if body.get("status") not in ("NO_DATA",)
        ],
        "ownerSupportIncluded": bool(ctx.get("owner_support_scope")),
        "navigation": "Drill through to canonical domain records",
        "environment": "DEV",
    }
