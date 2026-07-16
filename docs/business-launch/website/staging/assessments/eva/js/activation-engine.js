/**
 * Sprint 4 — Conversion Activation Engine (Dev/Staging only).
 * Consumes Sprint 3 conversion output. Does NOT modify conversion-engine.js
 * or locked EVA CRM schema v1 keys (schemaOnly remains unchanged).
 */
window.HVCG_EVA_ACTIVATION = (function () {
  const VERSION = "activation-1.0.0";
  const ASSESSMENT_VER = "EVA-FREE-S4";

  const OWNER_GATES = {
    BL_C1_OUTBOUND: { id: "BL-C1", status: "BLOCKED", reason: "No prospect email/SMS until owner gate" },
    BL_PUBLISH_1: { id: "BL-PUBLISH-1", status: "BLOCKED", reason: "No public website / DNS" },
    LIVE_BOOKING: { id: "LIVE-BOOKING", status: "BLOCKED", reason: "No live calendar until approved" },
    PROD_CRM: { id: "PROD-CRM", status: "BLOCKED", reason: "Track 1 frozen — Dev CRM only" },
    AUTO_QUALIFY: { id: "AUTO-QUALIFY", status: "BLOCKED", reason: "LeadStatus stays New unless manual" },
    PRICE_CARD_FCFO: { id: "PRICE-FCFO", status: "OWNER_REVIEW", reason: "SKU-FCFO rate card pending" },
    PRICE_CARD_EXIT: { id: "PRICE-EXIT", status: "OWNER_REVIEW", reason: "SKU-EXIT rate card pending" },
    PRICE_CARD_ACQ: { id: "PRICE-ACQ", status: "OWNER_REVIEW", reason: "SKU-ACQ rate card pending" },
    PRICE_CARD_MODEL: { id: "PRICE-MODEL", status: "OWNER_REVIEW", reason: "SKU-MODEL rate card pending" },
    PHONE_SECONDARY: { id: "DS-PHONE", status: "OWNER_REVIEW", reason: "725.577.6511 routing undefined" },
  };

  const SLOT_PRESETS = [
    { id: "am_early", label: "Weekday morning (8–10 PT)" },
    { id: "am_late", label: "Weekday late morning (10–12 PT)" },
    { id: "pm_early", label: "Weekday early afternoon (12–2 PT)" },
    { id: "pm_mid", label: "Weekday afternoon (2–4 PT)" },
    { id: "pm_late", label: "Weekday late afternoon (4–6 PT)" },
  ];

  function gatesSummary(conversion) {
    const open = [];
    const blocked = [];
    Object.values(OWNER_GATES).forEach((g) => {
      if (g.status === "BLOCKED") blocked.push(g);
      else open.push(g);
    });
    const skus = (conversion && conversion.owner_review_required_skus) || [];
    skus.forEach((sku) => {
      open.push({
        id: "SKU-" + sku,
        status: "OWNER_REVIEW",
        reason: "Engagement pricing requires owner approval for " + sku,
      });
    });
    return {
      blocked_actions: blocked,
      owner_review: open,
      can_send_outbound: false,
      can_live_book: false,
      can_write_prod: false,
      can_auto_qualify: false,
      staging_capture_allowed: true,
    };
  }

  /**
   * Formalize Sprint 3 lead_qualification into an activation workflow (no LeadStatus mutation).
   */
  function qualifyWorkflow(conversion, fullPayload) {
    const lead = (conversion && conversion.lead_qualification) || {};
    const guard =
      (fullPayload && fullPayload.eva && fullPayload.eva.legacy_guard) ||
      (fullPayload && fullPayload._experience && fullPayload._experience.legacy_guard) ||
      "PASS";

    const steps = [
      {
        id: "ingest",
        label: "Assessment ingested",
        status: conversion ? "DONE" : "PENDING",
      },
      {
        id: "legacy_guard",
        label: "Legacy client guard",
        status: guard === "BLOCK" ? "BLOCKED" : guard === "PASS" ? "DONE" : "FAIL",
        detail: guard,
      },
      {
        id: "temperature",
        label: "Lead temperature assigned",
        status: lead.lead_temperature ? "DONE" : "PENDING",
        detail: lead.lead_temperature || null,
      },
      {
        id: "human_review",
        label: "Human review queue",
        status: lead.required_human_review ? "QUEUED" : "SKIPPED",
      },
      {
        id: "manual_qualify",
        label: "Manual qualify (CRM)",
        status: "OWNER_GATE",
        detail: "auto_qualify remains false — LeadStatus stays New until manual",
      },
      {
        id: "opportunity",
        label: "Create opportunity",
        status: "OWNER_GATE",
        detail: "Use existing Dev LeadQualified path only after manual qualify",
      },
    ];

    let queue = "educate";
    if (guard === "BLOCK") queue = "legacy_block";
    else if (lead.lead_temperature === "Hot") queue = "sales_priority";
    else if (lead.lead_temperature === "Warm") queue = "nurture_warm";
    else queue = "nurture_educate";

    return {
      workflow_version: "qual-1.0.0",
      auto_qualify: false,
      lead_status_intent: "New",
      queue,
      sales_priority: lead.sales_priority || "Educate",
      lead_temperature: lead.lead_temperature || "Nurture",
      fit_score: lead.fit_score ?? null,
      close_likelihood_band: lead.close_likelihood_band || null,
      required_human_review: !!lead.required_human_review,
      steps,
      allowed_next:
        guard === "BLOCK"
          ? ["internal_legacy_review"]
          : ["strategy_session_request", "nurture_enroll_staging", "download_report"],
    };
  }

  /**
   * Engagement recommendation package for activation (wraps Sprint 3 services).
   */
  function engagementPackage(conversion) {
    const svc = (conversion && conversion.hvcg_service_recommendation) || {};
    const primary = svc.primary || {};
    const secondary = svc.secondary || [];
    const capital = (conversion && conversion.capital_and_funding) || {};

    return {
      package_version: "engage-1.0.0",
      primary_engagement: {
        name: primary.engagement_name || null,
        sku_id: primary.sku_id || null,
        category: primary.category || null,
        timeline: primary.estimated_timeline || null,
        investment: primary.estimated_investment_range || null,
        owner_review_required: !!primary.owner_review_required,
        next_step: primary.recommended_next_step || null,
        deliverables: primary.expected_deliverables || [],
      },
      secondary_engagements: secondary.map((s) => ({
        name: s.engagement_name,
        sku_id: s.sku_id,
        owner_review_required: !!s.owner_review_required,
      })),
      capital_path: capital.recommended_capital_path || null,
      capital_confidence: capital.confidence_level || null,
      pricing_gate:
        primary.owner_review_required ||
        (primary.estimated_investment_range &&
          primary.estimated_investment_range.status === "OWNER_REVIEW_REQUIRED")
          ? "OWNER_APPROVAL_REQUIRED"
          : "RATE_CARD_ESTIMATE",
      proposal_ready: false,
      proposal_blocker: "Owner pricing approval + diligence package required before proposal",
    };
  }

  /**
   * Strategy Session scheduling — request capture only (no live calendar).
   */
  function buildStrategySessionRequest(input, conversion, fullPayload) {
    input = input || {};
    const contact =
      (fullPayload && fullPayload.contact) ||
      {};
    const company = (fullPayload && fullPayload.company) || {};
    const cta = (conversion && conversion.conversion_cta) || {};
    const lead = (conversion && conversion.lead_qualification) || {};

    const preferred = Array.isArray(input.preferred_slots)
      ? input.preferred_slots
      : input.preferred_slot
        ? [input.preferred_slot]
        : [];

    const request = {
      request_version: "strategy-session-1.0.0",
      request_id:
        input.request_id ||
        "ss-" + Date.now().toString(16) + "-" + Math.random().toString(16).slice(2, 8),
      requested_at: new Date().toISOString(),
      session_type: input.session_type || mapSessionType(cta.id),
      status: "REQUESTED_STAGING",
      live_booking_enabled: false,
      calendar_provider: null,
      preferred_slots: preferred.map((id) => {
        const preset = SLOT_PRESETS.find((s) => s.id === id);
        return { id: id, label: (preset && preset.label) || id };
      }),
      notes: (input.notes || "").slice(0, 2000),
      contact: {
        name:
          input.name ||
          contact.name ||
          [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim() ||
          null,
        email: input.email || contact.email || null,
        phone: input.phone || contact.phone || null,
        role: input.role || contact.role || null,
      },
      company: {
        legalName: input.company || company.legalName || null,
      },
      from_conversion: {
        cta_id: cta.id || null,
        cta_label: cta.label || null,
        lead_temperature: lead.lead_temperature || null,
        recommended_sku: lead.recommended_sku || null,
        recommended_service: lead.recommended_service || null,
      },
      owner_gates: {
        outbound_email: "BLOCKED",
        live_calendar: "BLOCKED",
        confirmation_sms: "BLOCKED",
      },
      internal_routing: {
        assignee_email: "manny@highvaluecapitalgroup.com",
        phone_primary: "702.906.6444",
        queue: lead.lead_temperature === "Hot" ? "sales_priority" : "strategy_intake",
      },
    };

    return request;
  }

  function mapSessionType(ctaId) {
    const map = {
      strategy: "Strategy Session",
      capital_readiness: "Capital Readiness Review",
      funding_review: "Funding Review",
      fcfo: "Fractional CFO Consultation",
      exit: "Exit Readiness Review",
      nurture: "Nurture Orientation (internal)",
      download_report: "Report Follow-up",
      complete_missing: "Information Completion",
    };
    return map[ctaId] || "Strategy Session";
  }

  /**
   * CRM activation pipeline — Dev staging only. Does not mutate schemaOnly keys.
   * Additive package lives under _experience.activation for Notes / internal use.
   */
  function crmActivationPipeline(conversion, fullPayload, strategyRequest, nurturePlan) {
    const guard =
      (fullPayload && fullPayload.eva && fullPayload.eva.legacy_guard) || "PASS";
    const qual = qualifyWorkflow(conversion, fullPayload);
    const engage = engagementPackage(conversion);
    const gates = gatesSummary(conversion);

    const stages = [
      {
        id: "capture_lead",
        label: "EVA lead capture (existing Dev flow)",
        status: guard === "BLOCK" ? "SKIP_LEGACY_BLOCK" : "READY_DEV",
        flow_ref: "HVCG_EvaFormCreateLead",
        environment: "Development",
        activated: false,
      },
      {
        id: "attach_activation",
        label: "Attach activation package to Notes / _experience",
        status: "READY_STAGING",
        environment: "Development",
        activated: false,
      },
      {
        id: "strategy_request",
        label: "Strategy session request queue",
        status: strategyRequest ? "CAPTURED_STAGING" : "PENDING_REQUEST",
        environment: "Development",
        activated: false,
      },
      {
        id: "nurture_plan",
        label: "Nurture trigger plan (no send)",
        status: nurturePlan ? "PLANNED_STAGING" : "PENDING",
        environment: "Development",
        activated: false,
        outbound_blocked: true,
      },
      {
        id: "manual_qualify",
        label: "Manual qualify in Dev CRM",
        status: "OWNER_GATE",
        environment: "Development",
        activated: false,
      },
      {
        id: "create_opportunity",
        label: "LeadQualified → Opportunity (existing)",
        status: "OWNER_GATE",
        flow_ref: "HVCG_LeadQualifiedCreateOpportunity",
        environment: "Development",
        activated: false,
      },
      {
        id: "production_sync",
        label: "Production write",
        status: "BLOCKED",
        environment: "Production",
        activated: false,
        reason: "Track 1 frozen",
      },
    ];

    return {
      pipeline_version: "crm-activation-1.0.0",
      environment_intent: "Development",
      production_writes: false,
      schema_mutation: false,
      schema_only_keys_unchanged: true,
      legacy_guard: guard,
      qualification: qual,
      engagement: engage,
      owner_gates: gates,
      strategy_session_request: strategyRequest || null,
      nurture_plan: nurturePlan || null,
      stages,
      next_safe_action:
        guard === "BLOCK"
          ? "Stop — legacy guard BLOCK; internal review only"
          : strategyRequest
            ? "Queue internal follow-up (no outbound); await owner for live booking/email"
            : "Capture strategy session request in staging",
    };
  }

  /**
   * Build full activation object from Sprint 3 conversion (+ optional request/nurture).
   */
  function build(conversion, fullPayload, opts) {
    opts = opts || {};
    const strategyRequest =
      opts.strategyRequest ||
      (opts.strategyInput
        ? buildStrategySessionRequest(opts.strategyInput, conversion, fullPayload)
        : null);
    const nurturePlan =
      opts.nurturePlan ||
      (window.HVCG_EVA_NURTURE
        ? window.HVCG_EVA_NURTURE.buildPlan(conversion, fullPayload)
        : null);
    const pipeline = crmActivationPipeline(
      conversion,
      fullPayload,
      strategyRequest,
      nurturePlan
    );

    const answers =
      opts.answers ||
      (fullPayload && fullPayload.answers) ||
      (fullPayload && fullPayload.eva && fullPayload.eva.answers) ||
      {};

    const salesEngine = buildSalesEngine(
      conversion,
      fullPayload,
      strategyRequest,
      answers,
      opts
    );

    let salesDashboard = buildDashboardRow(conversion, fullPayload, pipeline);
    if (window.HVCG_EVA_EXEC_REVENUE && salesEngine) {
      salesDashboard = window.HVCG_EVA_EXEC_REVENUE.buildDashboardRowExtension(
        salesDashboard,
        salesEngine
      );
    }

    return {
      activation_version: VERSION,
      assessment_version: ASSESSMENT_VER,
      generated_at: new Date().toISOString(),
      recommendation_version:
        (conversion && conversion.recommendation_version) || null,
      qualification_workflow: pipeline.qualification,
      engagement_recommendation: pipeline.engagement,
      strategy_session: strategyRequest,
      nurture: nurturePlan,
      crm_pipeline: pipeline,
      owner_gates: pipeline.owner_gates,
      sales_engine: salesEngine,
      sales_dashboard: salesDashboard,
      executive_revenue_dashboard:
        window.HVCG_EVA_EXEC_REVENUE
          ? window.HVCG_EVA_EXEC_REVENUE.buildFromLocal({
              board: salesDashboard ? [salesDashboard] : [],
              requests: strategyRequest ? [strategyRequest] : [],
              activations: salesEngine ? [{ pricing: salesEngine.pricing, proposal: salesEngine.proposal, pipeline: salesEngine.pipeline }] : [],
            })
          : null,
    };
  }

  /**
   * Sprint 4 Phase 2 — Automated Sales Engine (additive; optional if modules loaded).
   */
  function buildSalesEngine(conversion, fullPayload, strategyRequest, answers, opts) {
    opts = opts || {};
    if (
      !window.HVCG_EVA_PRICING ||
      !window.HVCG_EVA_SALES_QUAL ||
      !window.HVCG_EVA_PROPOSAL ||
      !window.HVCG_EVA_PIPELINE
    ) {
      return null;
    }

    const pricing = window.HVCG_EVA_PRICING.build(conversion, fullPayload, {
      answers: answers,
      config: opts.pricingConfig,
    });
    const qualification = window.HVCG_EVA_SALES_QUAL.build(
      conversion,
      fullPayload,
      {
        answers: answers,
        strategyRequest: strategyRequest,
        config: opts.qualConfig,
      }
    );
    const proposal = window.HVCG_EVA_PROPOSAL.build(
      pricing,
      qualification,
      conversion,
      fullPayload,
      { proposal_version: opts.proposal_version || 1 }
    );
    const pipelineAutomation = window.HVCG_EVA_PIPELINE.build(
      qualification,
      pricing,
      proposal,
      conversion,
      fullPayload,
      { config: opts.pipelineConfig }
    );

    return {
      phase: "Sprint4-Phase2",
      phase_version: "sales-engine-1.0.0",
      pricing: pricing,
      qualification: qualification,
      proposal: proposal,
      pipeline: pipelineAutomation,
      production_writes: false,
      communications_enabled: false,
    };
  }

  function buildDashboardRow(conversion, fullPayload, pipeline) {
    const contact = (fullPayload && fullPayload.contact) || {};
    const company = (fullPayload && fullPayload.company) || {};
    const lead = (conversion && conversion.lead_qualification) || {};
    const cta = (conversion && conversion.conversion_cta) || {};
    return {
      company: company.legalName || null,
      contact_name: contact.name || null,
      email: contact.email || null,
      temperature: lead.lead_temperature || null,
      fit_score: lead.fit_score ?? null,
      sku: lead.recommended_sku || null,
      service: lead.recommended_service || null,
      capital_path: lead.recommended_capital_path || null,
      cta: cta.label || null,
      queue: pipeline.qualification.queue,
      human_review: !!lead.required_human_review,
      strategy_status: pipeline.strategy_session_request
        ? pipeline.strategy_session_request.status
        : "NONE",
      nurture_status: pipeline.nurture_plan
        ? pipeline.nurture_plan.enrollment_status
        : "NONE",
      owner_price_gate: pipeline.engagement.pricing_gate,
      updated_at: new Date().toISOString(),
    };
  }

  /** Persist activation package for dashboard / strategy page (staging localStorage). */
  function persist(activation) {
    try {
      localStorage.setItem("hvcg_eva_activation", JSON.stringify(activation));
      const dash = JSON.parse(localStorage.getItem("hvcg_eva_sales_board") || "[]");
      if (activation.sales_dashboard) {
        const row = activation.sales_dashboard;
        const key = (row.email || "") + "|" + (row.company || "");
        const next = dash.filter(
          (r) => (r.email || "") + "|" + (r.company || "") !== key
        );
        next.unshift(row);
        localStorage.setItem(
          "hvcg_eva_sales_board",
          JSON.stringify(next.slice(0, 50))
        );
      }
      if (activation.strategy_session) {
        const reqs = JSON.parse(
          localStorage.getItem("hvcg_eva_strategy_requests") || "[]"
        );
        reqs.unshift(activation.strategy_session);
        localStorage.setItem(
          "hvcg_eva_strategy_requests",
          JSON.stringify(reqs.slice(0, 50))
        );
      }
      if (activation.sales_engine) {
        const runs = JSON.parse(
          localStorage.getItem("hvcg_eva_sales_engine_runs") || "[]"
        );
        runs.unshift({
          at: activation.generated_at,
          pricing: activation.sales_engine.pricing,
          qualification: activation.sales_engine.qualification,
          proposal: activation.sales_engine.proposal,
          pipeline: activation.sales_engine.pipeline,
        });
        localStorage.setItem(
          "hvcg_eva_sales_engine_runs",
          JSON.stringify(runs.slice(0, 50))
        );
      }
    } catch (_) {}
  }

  function load() {
    try {
      return JSON.parse(localStorage.getItem("hvcg_eva_activation") || "null");
    } catch (_) {
      return null;
    }
  }

  return {
    VERSION,
    OWNER_GATES,
    SLOT_PRESETS,
    gatesSummary,
    qualifyWorkflow,
    engagementPackage,
    buildStrategySessionRequest,
    crmActivationPipeline,
    buildSalesEngine,
    build,
    persist,
    load,
    mapSessionType,
  };
})();
