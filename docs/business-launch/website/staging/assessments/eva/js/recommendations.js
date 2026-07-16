/**
 * Rule-based "AI recommendation layer" — preliminary, non-binding.
 * No external LLM call in Dev (deterministic, auditable).
 */
window.HVCG_EVA_RECS = (function () {
  const RATE = "HVCG-PRICE-2026-07-15-v1";

  const SKUS = {
    "SKU-FRA": {
      label: "Funding Readiness Assessment",
      setup: 0,
      monthly: 0,
    },
    "SKU-CAP-CORE": {
      label: "Capital Advisory — Core (estimate)",
      setup: 5000,
      monthly: 3500,
    },
    "SKU-CAP-GROWTH": {
      label: "Capital Advisory — Growth (estimate)",
      setup: 10000,
      monthly: 7500,
    },
    "SKU-CAP-ENT": {
      label: "Capital Advisory — Enterprise (estimate)",
      setup: 20000,
      monthly: 12500,
    },
  };

  function topPriorities(answers, scored) {
    const gaps = [];
    const s = scored.sections_0_5 || {};
    const push = (title, why, impact) => gaps.push({ title, why, impact });
    if ((s.reporting ?? 5) < 3)
      push(
        "Strengthen financial reporting",
        "Close cadence and books quality limit lender/investor confidence.",
        "high"
      );
    if ((s.cash ?? 5) < 3)
      push(
        "Stabilize cash runway & forecasting",
        "Short runway or conversion stress raises funding risk.",
        "high"
      );
    if ((s.capital_clarity ?? 5) < 3)
      push(
        "Clarify use-of-funds & capital plan",
        "Ambiguous purpose slows capital packaging.",
        "medium"
      );
    if ((s.debt ?? 5) < 3 || (scored.flags || []).includes("mca_stacking_urgent_capital"))
      push(
        "Address debt structure before new capital",
        "MCA stacking or distress history reduces instrument options.",
        "high"
      );
    if ((s.management ?? 5) < 3)
      push(
        "Add finance leadership capacity",
        "Owner-only finance slows diligence and capital close.",
        "medium"
      );
    if ((s.risk ?? 5) < 3)
      push(
        "Reduce concentration / operating risk",
        "Customer or litigation risk compresses valuation and capital access.",
        "medium"
      );
    if ((s.exit ?? 5) < 3 && answers["Q16.1"] && answers["Q16.1"] !== "none")
      push(
        "Improve exit / diligence readiness",
        "Contracts, IP, and books cleanliness lag exit horizon.",
        "low"
      );
    while (gaps.length < 5) {
      push(
        "Complete Capital Readiness Assessment",
        "Next structured step after EVA-FREE.",
        "low"
      );
    }
    return gaps.slice(0, 5);
  }

  function recommend(answers, scored) {
    const scores = scored.scores;
    const flags = scored.flags || [];
    const reporting = scored.sections_0_5.reporting ?? 3;
    const capital = answers["Q12.3"] || "none";
    const timeline = answers["Q12.4"] || "1";
    const band = scored.band;

    let sku = "SKU-FRA";
    let path = "Funding Readiness / discovery";
    let next = "CAPITAL_READINESS";

    if (reporting <= 2 && (timeline === "3" || timeline === "4") && capital !== "none") {
      sku = "SKU-FRA";
      path = "Fractional CFO / books remediation before capital";
      next = "FRACTIONAL_CFO_DISCOVERY";
    } else if (band === "A" && (capital === "debt" || capital === "equity" || capital === "both")) {
      sku =
        answers["Q2.1"] === "5" || answers["Q12.1"] === "5m_plus"
          ? "SKU-CAP-ENT"
          : "SKU-CAP-GROWTH";
      path = "Capital Advisory + Capital Readiness";
      next = "STRATEGY_CALL";
    } else if (band === "B" && capital !== "none") {
      sku = "SKU-CAP-CORE";
      path = "Capital Advisory — Core path";
      next = "STRATEGY_CALL";
    } else if (band === "C") {
      sku = "SKU-FRA";
      path = "Strengthen reporting, then Capital Readiness";
      next = "CAPITAL_READINESS";
    } else {
      sku = "SKU-FRA";
      path = "Education / nurture — free assessment follow-up";
      next = "NURTURE";
    }

    if (flags.includes("restricted_industry_review")) {
      path += " (owner industry review required)";
      next = "OWNER_REVIEW";
    }

    const pack = SKUS[sku];
    const priorities = topPriorities(answers, scored);
    const fundingSummary = buildFundingSummary(answers, scored, path);
    const valuation = window.HVCG_EVA_SCORING.valuationRange(answers, scores);

    return {
      recommended_sku: sku,
      package_label: pack.label,
      proposed_price: { setup: pack.setup, monthly: pack.monthly },
      rate_card_version: RATE,
      owner_approval_required: true,
      recommended_path: path,
      next_step: next,
      top_5_priorities: priorities,
      biggest_risks: (flags.length ? flags : ["general_execution_risk"]).slice(0, 5).map(
        (f) => ({
          code: f,
          summary: riskCopy(f),
        })
      ),
      funding_readiness_summary: fundingSummary,
      estimated_valuation_range: valuation,
      suggested_hvcg_engagement: {
        sku,
        label: pack.label,
        path,
        next_step: next,
        estimate_only: true,
        owner_approval_required: true,
      },
      ai_layer: {
        type: "rule_based_v1",
        model: "HVCG_EVA_RECS",
        note: "Deterministic recommendation rules — not generative AI. Preliminary only.",
      },
    };
  }

  function riskCopy(code) {
    const map = {
      tax_filings_not_current: "Tax filings not current — blocks most capital paths.",
      debt_distress_history: "Recent defaults/collections reduce lender appetite.",
      litigation_or_regulatory: "Pending litigation/regulatory action elevates diligence risk.",
      restricted_industry_review: "Industry may be restricted — owner review required.",
      regulated_fintech: "Regulated fintech — specialized capital packaging needed.",
      mca_stacking_urgent_capital: "MCA stacking + urgency — refinance/structure first.",
      high_customer_concentration: "High customer concentration compresses value and terms.",
      general_execution_risk: "Execution and data-quality risk until diligence completes.",
    };
    return map[code] || code;
  }

  function buildFundingSummary(answers, scored, path) {
    const fr = scored.scores.funding_readiness;
    const band = scored.band;
    return {
      funding_readiness_score: fr,
      composite_band: band,
      capital_intent: answers["Q12.3"],
      timeline: answers["Q12.4"],
      narrative: `Funding readiness score ${fr}/100 (band ${band}). Preferred instrument: ${answers["Q12.3"] || "n/a"}. Recommended path: ${path}. This is preliminary and subject to diligence.`,
    };
  }

  return { recommend, SKUS };
})();
