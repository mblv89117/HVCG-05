/**
 * HVCG Revenue OS deterministic reference engine.
 * In-memory mock only: no network, CRM, Finance, email, payment, or Prod writes.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.HVCG_REVENUE_OS = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VERSION = "revenue-os-1.0.0";
  const SAFETY = Object.freeze({
    environment: "Mock",
    productionWrites: false,
    externalSends: false,
    paymentProcessing: false,
    schemaChanges: false,
    autoQualify: false,
    legacyAutoReprice: false,
  });

  const STATES = Object.freeze({
    lead: {
      New: ["Contacted", "Disqualified"],
      Contacted: ["Discovery", "Nurture", "Disqualified"],
      Discovery: ["Qualified", "Nurture", "Disqualified"],
      Qualified: ["Converted"],
      Nurture: ["Contacted", "Disqualified"],
      Converted: [],
      Disqualified: ["New"],
    },
    opportunity: {
      Discovery: ["Assessment", "Lost"],
      Assessment: ["Proposal", "Lost"],
      Proposal: ["Negotiation", "Lost"],
      Negotiation: ["Verbal Commit", "Won", "Lost"],
      "Verbal Commit": ["Won", "Negotiation", "Lost"],
      Won: [],
      Lost: [],
    },
    proposal: {
      Draft: ["Internal Review", "Withdrawn"],
      "Internal Review": ["Approved", "Draft", "Withdrawn"],
      Approved: ["Sent", "Withdrawn"],
      Sent: ["Negotiation", "Accepted", "Rejected", "Expired", "Withdrawn"],
      Negotiation: ["Accepted", "Rejected", "Expired", "Withdrawn"],
      Accepted: [],
      Rejected: [],
      Expired: [],
      Withdrawn: [],
    },
    contract: {
      Draft: ["Review"],
      Review: ["Approved to Send", "Draft"],
      "Approved to Send": ["Sent"],
      Sent: ["Negotiation", "Signed", "Declined", "Expired"],
      Negotiation: ["Signed", "Declined", "Expired"],
      Signed: ["Activated", "Terminated"],
      Activated: ["Terminated"],
      Declined: [],
      Expired: [],
      Terminated: [],
    },
  });

  const STAGE_PROBABILITY = Object.freeze({
    Discovery: 10,
    Assessment: 25,
    Proposal: 50,
    Negotiation: 70,
    "Verbal Commit": 85,
    Won: 100,
    Lost: 0,
  });

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function result(ok, value, errors) {
    return {
      ok,
      value: value == null ? null : clone(value),
      errors: errors || [],
      safety: SAFETY,
    };
  }

  function transition(kind, record, nextState, context) {
    context = context || {};
    const graph = STATES[kind];
    if (!graph) return result(false, null, ["unknown_state_machine"]);
    if (!record || !record.status) return result(false, null, ["missing_record_status"]);
    if (!Object.prototype.hasOwnProperty.call(graph, record.status)) {
      return result(false, null, ["unknown_current_state"]);
    }
    if (!graph[record.status].includes(nextState)) {
      return result(false, null, [
        "invalid_transition:" + record.status + "->" + nextState,
      ]);
    }

    const errors = gateErrors(kind, record, nextState, context);
    if (errors.length) return result(false, null, errors);

    const updated = Object.assign({}, record, {
      status: nextState,
      updated_at: context.now || new Date().toISOString(),
      last_transition: record.status + "->" + nextState,
    });
    return result(true, updated, []);
  }

  function gateErrors(kind, record, nextState, context) {
    const errors = [];
    if (context.environment === "Production") errors.push("production_blocked");
    if (context.externalSend) errors.push("external_send_blocked");

    if (kind === "lead" && nextState === "Qualified") {
      if (!context.manualApprovalRef) errors.push("manual_qualification_required");
      if (record.legacy_guard === "BLOCK") errors.push("legacy_guard_block");
    }
    if (kind === "proposal" && nextState === "Approved") {
      if (record.owner_review_required && !context.pricingApprovalRef) {
        errors.push("pricing_approval_required");
      }
    }
    if (kind === "proposal" && nextState === "Sent") {
      if (!context.blC1Approved) errors.push("BL-C1_required");
    }
    if (kind === "contract" && nextState === "Approved to Send") {
      if (!context.ownerApprovalRef) errors.push("owner_approval_required");
    }
    if (kind === "contract" && nextState === "Sent") {
      if (!context.blC1Approved) errors.push("BL-C1_required");
    }
    if (kind === "contract" && nextState === "Signed") {
      if (!context.signatureEvidenceId) errors.push("signature_evidence_required");
    }
    return errors;
  }

  function weightedPipeline(opportunities) {
    return roundMoney(
      (opportunities || [])
        .filter((o) => !["Won", "Lost"].includes(o.stage || o.status))
        .reduce((sum, o) => {
          const probability =
            numberOrNull(o.probability) ??
            STAGE_PROBABILITY[o.stage || o.status] ??
            0;
          return sum + money(o.amount) * probability / 100;
        }, 0)
    );
  }

  function forecast(opportunities) {
    const rows = (opportunities || []).map((o) => {
      const stage = o.stage || o.status;
      const probability =
        numberOrNull(o.probability) ?? STAGE_PROBABILITY[stage] ?? 0;
      const amount = money(o.amount);
      return {
        id: o.id,
        stage,
        category: o.forecast_category || "Pipeline",
        amount,
        probability,
        weighted_amount: roundMoney(amount * probability / 100),
      };
    });
    const sum = (predicate, field) =>
      roundMoney(rows.filter(predicate).reduce((n, r) => n + r[field], 0));
    const closed = sum((r) => r.category === "Closed" || r.stage === "Won", "amount");
    const commit = sum((r) => r.category === "Commit", "amount");
    const best = sum((r) => r.category === "Best Case", "weighted_amount");
    const pipeline = sum((r) => r.category === "Pipeline", "weighted_amount");
    return {
      rows,
      closed,
      commit,
      weighted_pipeline: roundMoney(
        rows
          .filter((r) => !["Won", "Lost"].includes(r.stage))
          .reduce((n, r) => n + r.weighted_amount, 0)
      ),
      scenarios: {
        conservative: roundMoney(closed + commit * 0.85),
        base: roundMoney(closed + commit + best),
        upside: roundMoney(closed + commit + best + pipeline),
      },
    };
  }

  function pipelineHealth(opportunity, asOf) {
    const now = new Date(asOf || new Date().toISOString());
    let score = 0;
    const reasons = [];

    if (opportunity.stage_evidence_complete) score += 25;
    else reasons.push("stage_evidence_missing");

    const next = opportunity.next_action_at
      ? new Date(opportunity.next_action_at)
      : null;
    if (opportunity.next_action && next && next >= now) score += 20;
    else reasons.push(next && next < now ? "next_action_overdue" : "next_action_missing");

    const contactDays = daysBetween(opportunity.last_meaningful_contact, now);
    if (contactDays != null && contactDays <= 14) score += 15;
    else reasons.push("contact_stale_or_missing");

    if (opportunity.decision_maker_identified) score += 10;
    else reasons.push("decision_maker_missing");

    if (opportunity.expected_close_date) score += 10;
    else reasons.push("close_date_missing");

    if (money(opportunity.amount) > 0 && opportunity.pricing_quality) score += 10;
    else reasons.push("amount_or_pricing_quality_missing");

    const completeness = Math.max(
      0,
      Math.min(100, Number(opportunity.data_completeness_pct || 0))
    );
    score += completeness * 0.1;

    if ((opportunity.close_date_slips || 0) >= 2) {
      score -= 15;
      reasons.push("close_date_slipped_twice");
    }
    if (!opportunity.owner) {
      score -= 25;
      reasons.push("owner_missing");
    }
    if (opportunity.proposal_expired) {
      score -= 20;
      reasons.push("proposal_expired");
    }

    score = Math.max(0, Math.min(100, Math.round(score)));
    return {
      score,
      band: score >= 75 ? "Green" : score >= 50 ? "Yellow" : "Red",
      reasons,
    };
  }

  function invoiceAging(invoice, asOf) {
    const now = new Date(asOf || new Date().toISOString());
    const amount = money(invoice.amount);
    const collected = money(invoice.amount_collected);
    const openBalance = Math.max(0, amount - collected);
    const daysOutstanding = Math.max(
      0,
      daysBetween(invoice.invoice_date, now) || 0
    );
    const daysPastDue = Math.max(0, daysBetween(invoice.due_date, now) || 0);
    let bucket = "Current";
    if (daysPastDue > 90) bucket = "90+";
    else if (daysPastDue > 60) bucket = "61–90";
    else if (daysPastDue > 30) bucket = "31–60";
    else if (daysPastDue > 0) bucket = "1–30";
    return {
      open_balance: roundMoney(openBalance),
      days_outstanding: daysOutstanding,
      days_past_due: daysPastDue,
      aging_bucket: bucket,
      status:
        openBalance === 0
          ? "Paid"
          : daysPastDue > 0
            ? "Past Due"
            : collected > 0
              ? "Partial"
              : invoice.status || "Sent",
    };
  }

  function dashboard(data, asOf) {
    data = data || {};
    const opportunities = data.opportunities || [];
    const invoices = data.invoices || [];
    const leads = data.leads || [];
    const engagements = data.engagements || [];
    const f = forecast(opportunities);
    const aging = invoices.map((i) =>
      Object.assign({ id: i.id }, invoiceAging(i, asOf))
    );
    const openAr = roundMoney(
      aging.reduce((sum, i) => sum + i.open_balance, 0)
    );
    const pastDueAr = roundMoney(
      aging
        .filter((i) => i.days_past_due > 0)
        .reduce((sum, i) => sum + i.open_balance, 0)
    );
    const active = engagements.filter((e) => e.status === "Active");
    return {
      version: VERSION,
      as_of: asOf || new Date().toISOString(),
      currency: "USD",
      safety: SAFETY,
      sales: {
        new_leads: leads.filter((l) => l.status === "New").length,
        qualified_leads: leads.filter((l) => l.status === "Qualified").length,
        open_opportunities: opportunities.filter(
          (o) => !["Won", "Lost"].includes(o.stage || o.status)
        ).length,
      },
      pipeline: {
        open_value: roundMoney(
          opportunities
            .filter((o) => !["Won", "Lost"].includes(o.stage || o.status))
            .reduce((sum, o) => sum + money(o.amount), 0)
        ),
        weighted_value: weightedPipeline(opportunities),
      },
      forecast: f,
      retainers: {
        active_count: active.length,
        mrr: roundMoney(
          active.reduce((sum, e) => sum + money(e.monthly_retainer), 0)
        ),
        at_risk_count: active.filter((e) =>
          ["Yellow", "Red"].includes(e.health)
        ).length,
      },
      billing: {
        invoice_count: invoices.length,
        open_ar: openAr,
        past_due_ar: pastDueAr,
        collection_rate:
          invoices.reduce((s, i) => s + money(i.amount), 0) > 0
            ? roundPercent(
                invoices.reduce(
                  (s, i) => s + money(i.amount_collected),
                  0
                ) /
                  invoices.reduce((s, i) => s + money(i.amount), 0) *
                  100
              )
            : null,
      },
      data_quality: dataQuality(data),
    };
  }

  function dataQuality(data) {
    const opportunities = data.opportunities || [];
    if (!opportunities.length) {
      return {
        owner_coverage_pct: null,
        next_action_coverage_pct: null,
      };
    }
    return {
      owner_coverage_pct: roundPercent(
        opportunities.filter((o) => !!o.owner).length /
          opportunities.length *
          100
      ),
      next_action_coverage_pct: roundPercent(
        opportunities.filter((o) => !!o.next_action && !!o.next_action_at)
          .length /
          opportunities.length *
          100
      ),
    };
  }

  function createBillingIntent(input) {
    const required = [
      "client_id",
      "engagement_id",
      "type",
      "amount",
      "service_period",
      "idempotency_key",
    ];
    const missing = required.filter(
      (key) => input == null || input[key] == null || input[key] === ""
    );
    if (missing.length) return result(false, null, missing.map((x) => "missing:" + x));
    return result(true, {
      billing_intent_id: "mock-bi-" + stableHash(input.idempotency_key),
      status: "Draft",
      environment: "Mock",
      side_effect_performed: false,
      input,
    });
  }

  function recommendCollection(invoice, asOf) {
    const aging = invoiceAging(invoice, asOf);
    let recommendation = "No action";
    let gate = "NONE";
    if (aging.days_past_due > 90) {
      recommendation = "Executive escalation / payment-plan review";
      gate = "FINANCE_OWNER";
    } else if (aging.days_past_due > 30) {
      recommendation = "Finance follow-up";
      gate = "FINANCE_BL-C1";
    } else if (aging.days_past_due > 0) {
      recommendation = "Reminder draft";
      gate = "FINANCE_BL-C1";
    }
    return {
      aging,
      recommendation,
      outbound_sent: false,
      writeoff_performed: false,
      gate,
    };
  }

  function daysBetween(start, end) {
    if (!start) return null;
    const a = new Date(start);
    const b = end instanceof Date ? end : new Date(end);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
    return Math.floor((b.getTime() - a.getTime()) / 86400000);
  }

  function money(value) {
    const n = Number(value || 0);
    return Number.isFinite(n) ? n : 0;
  }

  function numberOrNull(value) {
    if (value == null || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function roundMoney(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  function roundPercent(value) {
    return Math.round((value + Number.EPSILON) * 10) / 10;
  }

  function stableHash(value) {
    let hash = 2166136261;
    for (const char of String(value)) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16);
  }

  return Object.freeze({
    VERSION,
    SAFETY,
    STATES,
    STAGE_PROBABILITY,
    transition,
    weightedPipeline,
    forecast,
    pipelineHealth,
    invoiceAging,
    dashboard,
    dataQuality,
    createBillingIntent,
    recommendCollection,
  });
});
