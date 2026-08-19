/**
 * Maps full EVA answers → EVA_CRM_PAYLOAD_SCHEMA v1 (locked — do not redesign).
 * Sprint 3: additive versioned recommendation object under _experience / Notes only.
 */
window.HVCG_EVA_CRM = (function () {
  const LEGACY = [
    "accg",
    "prodigy games",
    "kava",
    "christie",
    "hart family",
    "outstanding auto",
    "arboretum",
    "pierlo",
    "integrity lift",
    "lien partners",
    "frocovery",
    "victory contracting",
  ];

  function legacyGuard(name) {
    const n = (name || "").toLowerCase();
    if (!n) return "FAIL_MISSING_NAME";
    return LEGACY.some((f) => n.includes(f)) ? "BLOCK" : "PASS";
  }

  function labelOf(qId, val) {
    const q = (window.HVCG_EVA_BANK.QUESTIONS || []).find((x) => x.id === qId);
    if (!q || !q.options) return String(val ?? "");
    const o = q.options.find((x) => String(x.value) === String(val));
    return (o && (o.labelCrm || o.label)) || String(val ?? "");
  }

  function revenueBandCrm(v) {
    const n = Number(v);
    if (n >= 5) return "4";
    if (n >= 4) return "4";
    if (n >= 3) return "3";
    if (n >= 2) return "2";
    return "1";
  }

  /**
   * @param {string} sessionId
   * @param {object} answers
   * @param {object} scored
   * @param {object} recs — Sprint 2 lite recommendations (compat)
   * @param {object} opts — { leadSourceDetail, conversion, campaign }
   */
  function buildPayload(sessionId, answers, scored, recs, opts) {
    opts = opts || {};
    const conversion =
      opts.conversion ||
      (window.HVCG_EVA_CONVERSION
        ? window.HVCG_EVA_CONVERSION.build(answers, scored)
        : null);

    const first = answers["contact.firstName"] || "";
    const last = answers["contact.lastName"] || "";
    const name = `${first} ${last}`.trim();
    const legal = (answers["Q0.1"] || "").trim();
    const guard = legacyGuard(legal);
    const rev = revenueBandCrm(answers["Q2.1"]);
    const books = String(answers["Q11.1"] || "2");
    const capital = answers["Q12.3"] || "none";
    const timeline = answers["Q12.4"] || "1";

    let eva = {
      variant: "EVA-FREE",
      composite_score_proxy: scored.composite_score_proxy,
      band: scored.band,
      confidence_index: scored.confidence_index,
      flags: scored.flags,
      recommended_sku: recs.recommended_sku,
      package_label: recs.package_label,
      proposed_price: recs.proposed_price,
      rate_card_version: recs.rate_card_version,
      owner_approval_required: true,
      legacy_guard: guard,
    };

    if (conversion && window.HVCG_EVA_CONVERSION) {
      eva = window.HVCG_EVA_CONVERSION.applyToSchemaEva(eva, conversion);
      eva.legacy_guard = guard;
    }

    const payload = {
      sessionId: sessionId,
      submittedAt: new Date().toISOString(),
      source: "Website-EVA",
      leadSourceDetail:
        opts.leadSourceDetail || "eva-experience-v2|conversion-v1|dev-staging",
      contact: {
        firstName: first,
        lastName: last,
        name: name,
        email: (answers["contact.email"] || "").trim().toLowerCase(),
        phone: (answers["contact.phone"] || "").trim(),
        role: answers["contact.role"] || "",
        isDecisionMaker:
          answers["contact.isDecisionMaker"] === true ||
          answers["contact.isDecisionMaker"] === "true",
      },
      company: {
        legalName: legal,
        revenueBand: rev,
        revenueBandLabel: labelOf("Q2.1", answers["Q2.1"]),
        books: books,
        booksLabel: labelOf("Q11.1", books),
        capital: capital,
        capitalLabel: labelOf("Q12.3", capital),
        timeline: timeline,
        timelineLabel: labelOf("Q12.4", timeline),
        challenge: answers["company.challenge"] || "",
        valueDriverThemes: answers["company.valueDriverThemes"] || [],
      },
      consent: {
        hvcgProspect: !!(answers["Q0.8"] === true || answers["Q0.8"] === "true"),
        notLegacyEngagementChange: !!(
          answers["Q0.8"] === true || answers["Q0.8"] === "true"
        ),
        disclaimerAccepted: !!(
          answers["Q0.9"] === true || answers["Q0.9"] === "true"
        ),
      },
      eva: eva,
    };

    const lq = conversion && conversion.lead_qualification;
    payload._experience = {
      scores: scored.scores,
      sections_0_5: scored.sections_0_5,
      recommendations: {
        top_5_priorities: recs.top_5_priorities,
        biggest_risks: recs.biggest_risks,
        funding_readiness_summary: recs.funding_readiness_summary,
        estimated_valuation_range: recs.estimated_valuation_range,
        suggested_hvcg_engagement: recs.suggested_hvcg_engagement,
        ai_layer: recs.ai_layer,
        recommended_path: recs.recommended_path,
        next_step: recs.next_step,
      },
      recommendation: conversion,
      crm_record: conversion
        ? {
            primary_service:
              conversion.hvcg_service_recommendation.primary.engagement_name,
            capital_path: conversion.capital_and_funding.recommended_capital_path,
            lead_temperature: lq.lead_temperature,
            sales_priority: lq.sales_priority,
            estimated_engagement_value: lq.estimated_engagement_value,
            estimated_capital_need: lq.estimated_capital_need,
            cta_selected: conversion.conversion_cta.label,
            consent_status: payload.consent,
            source: payload.source,
            campaign: opts.campaign || null,
            assessment_version: conversion.assessment_version,
            pricing_version: conversion.pricing_version,
            recommendation_version: conversion.recommendation_version,
            timestamp: conversion.generated_at,
            idempotency_key: "eva|" + sessionId,
            human_review_requirement: conversion.human_review_required,
            auto_qualify: false,
          }
        : null,
      answers: answers,
      crm_contract: "EVA_CRM_PAYLOAD_SCHEMA_v1",
      environment: "Dev",
    };

    return payload;
  }

  /** Locked schema body for HTTP / Automate — no _experience */
  function schemaOnly(payload) {
    return {
      sessionId: payload.sessionId,
      submittedAt: payload.submittedAt,
      source: payload.source,
      leadSourceDetail: payload.leadSourceDetail,
      contact: payload.contact,
      company: payload.company,
      consent: payload.consent,
      eva: payload.eva,
    };
  }

  /** Notes JSON for SharePoint (additive recommendation object) */
  function buildNotesJson(payload) {
    const ex = payload._experience || {};
    const conv = ex.recommendation;
    const lq = conv && conv.lead_qualification;
    return {
      eva_summary: {
        eva_variant: payload.eva.variant,
        composite_score: payload.eva.composite_score_proxy,
        band: payload.eva.band,
        confidence_index: payload.eva.confidence_index,
        flags: payload.eva.flags,
        recommended_sku_primary: payload.eva.recommended_sku,
        rate_card_version: payload.eva.rate_card_version,
        legacy_guard: payload.eva.legacy_guard,
        owner_approval_required: true,
        next_step: conv && conv.conversion_cta && conv.conversion_cta.label,
        priority: lq && lq.sales_priority,
      },
      eva_answers: {
        "Q0.1": payload.company.legalName,
        "Q0.6":
          payload.contact.name +
          " / " +
          payload.contact.role +
          " / " +
          payload.contact.email,
        "Q2.1": payload.company.revenueBand,
        "Q12.1": (ex.answers && ex.answers["Q12.1"]) || null,
        "Q12.3": payload.company.capital,
        "Q12.4": payload.company.timeline,
        challenge: payload.company.challenge,
        valueDriverThemes: payload.company.valueDriverThemes,
      },
      recommendation: conv,
      crm: ex.crm_record,
      scoring: ex.scores,
      environment: "Dev",
      auto_contact: false,
    };
  }

  return { buildPayload, schemaOnly, legacyGuard, buildNotesJson };
})();
