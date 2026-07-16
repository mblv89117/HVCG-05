/**
 * Sprint 4 Phase 2 — AI Pricing Engine (config-driven).
 * No hard-coded pricing rules; all SKUs/rules/confidence live in config.
 */
window.HVCG_EVA_PRICING = (function () {
  const VERSION = "pricing-engine-1.0.0";

  function getConfig(override) {
    return override || window.HVCG_PRICING_CONFIG || null;
  }

  function answerMap(answers) {
    return answers && typeof answers === "object" ? answers : {};
  }

  function legacyGuard(fullPayload, conversion) {
    return (
      (fullPayload && fullPayload.eva && fullPayload.eva.legacy_guard) ||
      (fullPayload &&
        fullPayload._experience &&
        fullPayload._experience.legacy_guard) ||
      (conversion && conversion.legacy_guard) ||
      "PASS"
    );
  }

  function fitScore(conversion) {
    const lead = (conversion && conversion.lead_qualification) || {};
    return lead.fit_score == null ? null : Number(lead.fit_score);
  }

  function revenueBand(answers) {
    return answers["Q12.1"] || answers["company.revenueBand"] || null;
  }

  function capitalIntent(answers, conversion) {
    const needs = answers["Q12.2"];
    if (Array.isArray(needs) && needs.length) return true;
    const capital = (conversion && conversion.capital_and_funding) || {};
    return !!capital.recommended_capital_path;
  }

  function matchWhen(when, ctx) {
    if (!when) return false;
    if (when.always) return true;
    if (when.legacy_guard != null)
      return ctx.legacy_guard === when.legacy_guard;
    if (when.capital_intent != null)
      return !!ctx.capital_intent === !!when.capital_intent;
    if (when.min_fit_score != null)
      return ctx.fit_score != null && ctx.fit_score >= when.min_fit_score;
    if (when.revenue_band_in)
      return when.revenue_band_in.indexOf(ctx.revenue_band) >= 0;
    if (when.any_answer_in) {
      return Object.keys(when.any_answer_in).some((key) => {
        const raw = ctx.answers[key];
        const vals = when.any_answer_in[key] || [];
        const hay = String(raw == null ? "" : raw).toLowerCase();
        return vals.some((v) => hay.indexOf(String(v).toLowerCase()) >= 0);
      });
    }
    if (when.all) return when.all.every((part) => matchWhen(part, ctx));
    if (when.any) return when.any.some((part) => matchWhen(part, ctx));
    return false;
  }

  function selectRule(config, ctx) {
    const rules = (config.rules || [])
      .slice()
      .sort((a, b) => (a.priority || 0) - (b.priority || 0));
    for (let i = 0; i < rules.length; i++) {
      if (matchWhen(rules[i].when, ctx)) return rules[i];
    }
    return null;
  }

  function build(conversion, fullPayload, opts) {
    opts = opts || {};
    const config = getConfig(opts.config);
    if (!config) {
      return {
        engine_version: VERSION,
        error: "MISSING_PRICING_CONFIG",
        owner_approval_required: true,
      };
    }

    const answers = answerMap(
      opts.answers ||
        (fullPayload && fullPayload.answers) ||
        (fullPayload && fullPayload.eva && fullPayload.eva.answers) ||
        {}
    );
    const guard = legacyGuard(fullPayload, conversion);
    const fit = fitScore(conversion);
    const band = revenueBand(answers);
    const ctx = {
      answers,
      legacy_guard: guard,
      fit_score: fit,
      revenue_band: band,
      capital_intent: capitalIntent(answers, conversion),
    };

    const rule = selectRule(config, ctx);
    if (!rule || (rule.then && rule.then.action === "block")) {
      return {
        engine_version: VERSION,
        config_version: config.config_version,
        rate_card_version: config.rate_card_version,
        legacy_guard: guard,
        blocked: true,
        recommended_services: [],
        estimated_monthly_retainer: null,
        success_fee: null,
        implementation_timeline: null,
        confidence_score: 0,
        reasoning_summary:
          (rule && rule.then && rule.then.reason) ||
          "Pricing blocked by configuration",
        owner_approval_required: true,
        notices: config.notices || [],
      };
    }

    const then = rule.then || {};
    const primaryId = then.primary_sku;
    const secondaryIds = then.secondary_skus || [];
    const skus = config.skus || {};
    const primary = skus[primaryId] || null;
    const recommended = [];
    if (primary) {
      recommended.push({
        role: "primary",
        sku_id: primaryId,
        name: primary.name,
        category: primary.category,
        owner_review_required: !!primary.owner_review_required,
      });
    }
    secondaryIds.forEach((id) => {
      const s = skus[id];
      if (!s) return;
      recommended.push({
        role: "secondary",
        sku_id: id,
        name: s.name,
        category: s.category,
        owner_review_required: !!s.owner_review_required,
      });
    });

    const successSku = recommended.find(
      (r) => (skus[r.sku_id] || {}).success_fee_pct != null
    );
    const successFee = successSku
      ? {
          sku_id: successSku.sku_id,
          percent: skus[successSku.sku_id].success_fee_pct,
          label: skus[successSku.sku_id].name,
        }
      : null;

    const conf = config.confidence || {};
    let confidence = Number(conf.base || 0.5) + Number(then.confidence_delta || 0);
    if (fit == null || !band) confidence -= Number(conf.incomplete_penalty || 0);
    if (primary && primary.owner_review_required)
      confidence -= Number(conf.owner_review_penalty || 0);
    confidence = Math.max(0, Math.min(Number(conf.max || 0.95), confidence));

    const reasoning = [
      "Matched pricing rule `" + rule.id + "`.",
      primary
        ? "Primary recommendation: " + primary.name + " (" + primaryId + ")."
        : "No primary SKU resolved.",
      guard === "PASS"
        ? "Legacy guard PASS — Section B rate card eligible."
        : "Legacy guard " + guard + ".",
      "Rate card " + config.rate_card_version + ".",
    ].join(" ");

    return {
      engine_version: VERSION,
      config_version: config.config_version,
      rate_card_version: config.rate_card_version,
      currency: config.currency || "USD",
      legacy_guard: guard,
      blocked: false,
      matched_rule_id: rule.id,
      recommended_services: recommended,
      estimated_monthly_retainer:
        primary && primary.monthly != null ? primary.monthly : null,
      estimated_setup: primary && primary.setup != null ? primary.setup : null,
      success_fee: successFee,
      implementation_timeline:
        primary && primary.timeline_weeks != null
          ? { weeks: primary.timeline_weeks, label: primary.timeline_weeks + " weeks" }
          : null,
      confidence_score: Number(confidence.toFixed(3)),
      reasoning_summary: reasoning,
      owner_approval_required: !!(
        !primary ||
        primary.owner_review_required ||
        recommended.some((r) => r.owner_review_required)
      ),
      subject_to_verification: true,
      notices: config.notices || [],
      configurable: true,
    };
  }

  return {
    VERSION,
    getConfig,
    build,
  };
})();
