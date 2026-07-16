/**
 * Sprint 4 Phase 2 — Sales Qualification Engine (config-driven thresholds).
 */
window.HVCG_EVA_SALES_QUAL = (function () {
  const VERSION = "sales-qual-1.0.0";

  function getConfig(override) {
    return override || window.HVCG_QUAL_CONFIG || null;
  }

  function classForScore(thresholds, score) {
    const ordered = (thresholds || [])
      .slice()
      .sort((a, b) => Number(b.min_score) - Number(a.min_score));
    for (let i = 0; i < ordered.length; i++) {
      if (score >= Number(ordered[i].min_score)) return ordered[i].class;
    }
    return "Not Qualified";
  }

  function build(conversion, fullPayload, opts) {
    opts = opts || {};
    const config = getConfig(opts.config);
    if (!config) {
      return {
        engine_version: VERSION,
        error: "MISSING_QUAL_CONFIG",
        classification: "Not Qualified",
        auto_qualify: false,
      };
    }

    const answers = opts.answers || {};
    const lead = (conversion && conversion.lead_qualification) || {};
    const guard =
      (fullPayload && fullPayload.eva && fullPayload.eva.legacy_guard) ||
      "PASS";
    const weights = config.weights || {};
    const signals = config.signals || {};

    if (guard === "BLOCK") {
      return {
        engine_version: VERSION,
        config_version: config.config_version,
        auto_qualify: false,
        lead_status_intent: "New",
        classification: config.legacy_force_class || "Not Qualified",
        score: 0,
        score_breakdown: { legacy_guard: "BLOCK" },
        pipeline_trigger: false,
        reasoning_summary: "Legacy guard BLOCK forces Not Qualified.",
      };
    }

    const fit = lead.fit_score == null ? 0 : Number(lead.fit_score);
    const temp = lead.lead_temperature || "Nurture";
    const tempPts = (signals.temperature_points || {})[temp] || 0;
    const dm =
      String(answers["contact.isDecisionMaker"] || "").toLowerCase() === "true"
        ? 100
        : 0;
    const capitalPoints = signals.capital_intent_points || {};
    const hasCapitalIntent =
      Array.isArray(answers["Q12.2"]) && answers["Q12.2"].length > 0;
    const capital = Number(
      hasCapitalIntent ? capitalPoints.present || 0 : capitalPoints.absent || 0
    );
    const band = answers["Q12.1"] || "under_250";
    const revPts = (signals.revenue_band_points || {})[band] || 0;
    const strategy = opts.strategyRequest ? 100 : 0;

    const breakdown = {
      fit_score: fit * Number(weights.fit_score || 0),
      temperature:
        tempPts *
        Number(
          temp === "Hot"
            ? weights.temperature_hot || 0
            : temp === "Warm"
              ? weights.temperature_warm || 0
              : (weights.temperature_warm || 0) * 0.4
        ),
      decision_maker: dm * Number(weights.decision_maker || 0),
      capital_intent: capital * Number(weights.capital_intent || 0),
      revenue_band: revPts * Number(weights.revenue_band || 0),
      strategy_request: strategy * Number(weights.strategy_request || 0),
    };

    const score = Object.keys(breakdown).reduce(
      (sum, k) => sum + Number(breakdown[k] || 0),
      0
    );
    const classification = classForScore(config.thresholds, score);
    const trigger = (config.pipeline_trigger_classes || []).indexOf(
      classification
    ) >= 0;

    return {
      engine_version: VERSION,
      config_version: config.config_version,
      auto_qualify: !!config.auto_qualify,
      lead_status_intent: "New",
      classification,
      classes: config.classes || [],
      score: Number(score.toFixed(2)),
      score_breakdown: breakdown,
      inputs: {
        fit_score: fit,
        lead_temperature: temp,
        decision_maker: !!dm,
        capital_intent: hasCapitalIntent,
        revenue_band: band,
        strategy_request: !!opts.strategyRequest,
      },
      pipeline_trigger: trigger,
      configurable: true,
      reasoning_summary:
        "Configurable score " +
        score.toFixed(1) +
        " → " +
        classification +
        ". Auto-qualify disabled.",
    };
  }

  return { VERSION, getConfig, build, classForScore };
})();
