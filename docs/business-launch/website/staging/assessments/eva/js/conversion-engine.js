/**
 * HVCG Sprint 3 — Revenue Recommendations & Conversion Engine (v1)
 * Additive layer on Sprint 2 scores. Does not break EVA_CRM_PAYLOAD_SCHEMA v1.
 * Prospect-safe outputs only; no formula exposure.
 */
window.HVCG_EVA_CONVERSION = (function () {
  const VERSION = "HVCG-REC-2026-07-16-v1";
  const PRICE_VER = "HVCG-PRICE-2026-07-15-v1";
  const ASSESSMENT_VER = "EVA-FREE-v2";

  const SKUS = {
    "SKU-FRA": {
      name: "Funding Readiness Assessment",
      category: "Capital Advisory",
      setup: 0,
      monthly: null,
      priceLabel: "Complimentary (lead qualification)",
    },
    "SKU-CAP-CORE": {
      name: "Capital Advisory — Core",
      category: "Capital Advisory",
      setup: 5000,
      monthly: 3500,
      priceLabel: "Setup $5,000 · $3,500/mo (estimate)",
    },
    "SKU-CAP-GROWTH": {
      name: "Capital Advisory — Growth",
      category: "Capital Advisory",
      setup: 10000,
      monthly: 7500,
      priceLabel: "Setup $10,000 · $7,500/mo (estimate)",
    },
    "SKU-CAP-ENT": {
      name: "Capital Advisory — Enterprise",
      category: "Capital Advisory",
      setup: 20000,
      monthly: 12500,
      priceLabel: "Starting $20,000 setup · starting $12,500/mo (estimate)",
    },
    "SKU-FCFO": {
      name: "Fractional CFO",
      category: "Fractional CFO",
      setup: null,
      monthly: null,
      priceLabel: "OWNER REVIEW REQUIRED — package rates not on Section B card",
      ownerReviewRequired: true,
    },
    "SKU-EXIT": {
      name: "Exit Readiness Advisory",
      category: "Exit Readiness",
      setup: null,
      monthly: null,
      priceLabel: "OWNER REVIEW REQUIRED — custom advisory pricing",
      ownerReviewRequired: true,
    },
    "SKU-ACQ": {
      name: "Acquisition Advisory",
      category: "Acquisition Advisory",
      setup: null,
      monthly: null,
      priceLabel: "OWNER REVIEW REQUIRED — success-fee / custom",
      ownerReviewRequired: true,
    },
    "SKU-MODEL": {
      name: "Financial Modeling",
      category: "Financial Modeling",
      setup: null,
      monthly: null,
      priceLabel: "Hourly from rate card — OWNER REVIEW for scope",
      ownerReviewRequired: true,
      hourlyHint: "SKU-HR-SENIOR $350/hr (rate card)",
    },
  };

  const DOCS_BASE = [
    "Last 2 years business tax returns",
    "YTD and prior-year P&L, balance sheet, cash-flow statement",
    "6–12 months business bank statements",
    "Current debt schedule",
    "Ownership / operating agreement summary",
  ];

  function interpretScore(name, value, higherIsBetter) {
    if (value === null || value === undefined)
      return {
        name,
        score: null,
        band: "insufficient",
        plain:
          "Not enough information was provided to score this area reliably.",
      };
    const v = Number(value);
    let band, plain;
    if (higherIsBetter === false) {
      // Risk: higher = more risk
      if (v >= 70) {
        band = "elevated";
        plain =
          "Risk indicators are elevated. Expect tighter diligence and more conditions from capital sources.";
      } else if (v >= 45) {
        band = "moderate";
        plain =
          "Moderate risk profile. Addressable with documentation and operating improvements.";
      } else {
        band = "contained";
        plain =
          "Risk appears relatively contained based on self-reported inputs — still subject to verification.";
      }
    } else {
      if (v >= 80) {
        band = "strong";
        plain =
          "Strong relative readiness in this area — suitable for a priority strategy discussion.";
      } else if (v >= 65) {
        band = "good";
        plain =
          "Good foundation. A standard advisory path with focused improvements is typical.";
      } else if (v >= 50) {
        band = "developing";
        plain =
          "Developing readiness. Strengthening books, cash visibility, or capital clarity will improve outcomes.";
      } else if (v >= 35) {
        band = "early";
        plain =
          "Early-stage readiness. Foundation work (reporting, cash, structure) usually comes before capital packaging.";
      } else {
        band = "limited";
        plain =
          "Limited readiness signals. Education and operating-foundation work are the practical next steps.";
      }
    }
    return { name, score: v, band, plain };
  }

  function stageLabel(answers) {
    const map = {
      idea: "Idea stage",
      "pre-revenue": "Pre-revenue",
      early: "Early-stage operating",
      growth: "Growth-stage",
      mature: "Mature operating",
      turnaround: "Turnaround / restructuring",
    };
    return map[answers["Q1.1"]] || "Operating business (stage not specified)";
  }

  function primaryConstraint(answers, scored) {
    const s = scored.sections_0_5 || {};
    const pairs = [
      ["reporting quality", s.reporting],
      ["cash runway / conversion", s.cash],
      ["debt structure", s.debt],
      ["capital plan clarity", s.capital_clarity],
      ["operating risk / concentration", s.risk],
      ["management / finance capacity", s.management],
    ].filter((x) => x[1] !== null && x[1] !== undefined);
    pairs.sort((a, b) => a[1] - b[1]);
    if (!pairs.length) return "Insufficient data to isolate a primary constraint";
    return pairs[0][0];
  }

  function strongestDriver(answers) {
    const themes = answers["company.valueDriverThemes"] || [];
    if (themes.length) return themes[0];
    if (answers["Q2.3"] === "strong") return "Revenue growth momentum";
    if (Number(answers["Q3.1"]) >= 4) return "Margin / unit economics";
    return "Business continuity and growth potential";
  }

  function largestRisk(scored, answers) {
    const flags = scored.flags || [];
    if (flags.includes("tax_filings_not_current"))
      return "Tax filings not current";
    if (flags.includes("mca_stacking_urgent_capital"))
      return "MCA stacking combined with urgent capital need";
    if (flags.includes("debt_distress_history"))
      return "Recent debt distress / collections history";
    if (flags.includes("litigation_or_regulatory"))
      return "Pending litigation or regulatory exposure";
    if (flags.includes("high_customer_concentration"))
      return "High customer concentration";
    if ((scored.scores.risk || 0) >= 60) return "Elevated operating / financial risk score";
    return "Data verification risk until diligence packages are complete";
  }

  function dataSufficientForValuation(answers) {
    return !!(
      answers["Q2.1"] &&
      answers["Q3.2"] &&
      answers["Q1.1"] &&
      answers["Q0.1"]
    );
  }

  function valuationBlock(answers, scored) {
    if (!dataSufficientForValuation(answers)) {
      return {
        status: "additional_information_required",
        range: null,
        message:
          "Additional information required. A preliminary enterprise value range is not shown until revenue band, profitability profile, and business stage are complete.",
        disclaimers: baseValDisclaimers(),
      };
    }
    if ((scored.confidence_index || 0) < 0.35) {
      return {
        status: "additional_information_required",
        range: null,
        message:
          "Additional information required. Confidence in submitted inputs is too low to present a range.",
        disclaimers: baseValDisclaimers(),
      };
    }
    const v = window.HVCG_EVA_SCORING.valuationRange(answers, scored.scores);
    return {
      status: "preliminary_range",
      range: { low: v.low_label, high: v.high_label },
      method_note:
        "Illustrative range derived from self-reported revenue and profitability bands.",
      disclaimers: baseValDisclaimers(),
    };
  }

  function baseValDisclaimers() {
    return [
      "This is not a formal valuation, appraisal, or fairness opinion.",
      "The estimate relies on self-reported information.",
      "Verification may materially change the result.",
      "A formal valuation or advisory engagement may be required.",
    ];
  }

  function capitalRecommendation(answers, scored) {
    const capital = answers["Q12.3"] || "none";
    const purpose = answers["Q12.2"] || [];
    const purposes = Array.isArray(purpose) ? purpose : [purpose];
    const fr = scored.scores.funding_readiness ?? 0;
    const reporting = scored.sections_0_5.reporting ?? 3;
    const debt = scored.sections_0_5.debt ?? 3;
    const flags = scored.flags || [];
    const industry = answers["Q8.1"];
    const amount = answers["Q12.1"];
    const timeline = answers["Q12.4"];

    let path = "Not funding-ready yet";
    let why =
      "Reporting, cash, or capital clarity signals suggest foundation work before packaging a capital raise.";
    let obstacles = [];
    let docs = DOCS_BASE.slice();
    let readinessTimeline = "90–180 days of preparation typical";
    let confidence = "low";

    if (capital === "none" || fr < 40) {
      path = "Not funding-ready yet";
      why =
        "Capital intent is unclear or funding readiness is limited based on self-reported inputs.";
      obstacles = [
        "Incomplete capital plan",
        "Reporting or cash visibility gaps",
      ];
      readinessTimeline = "Complete Funding Readiness / Fractional CFO path first";
      confidence = "medium";
    } else if (flags.includes("mca_stacking_urgent_capital") || debt < 2) {
      path = "Debt restructuring";
      why =
        "Existing debt pressure or MCA stacking makes restructuring / refinance the practical first capital conversation.";
      obstacles = ["Existing liens / stacking", "Urgent timeline vs underwriting"];
      docs.push("MCA / alternative lender agreements", "Personal guarantee inventory");
      readinessTimeline = "30–90 days after debt map is complete";
      confidence = "medium";
    } else if (purposes.includes("Acquisition") || purposes.includes("acquisition")) {
      path = "Acquisition financing";
      why =
        "Stated purpose includes acquisition — packaging typically blends senior debt and sponsor equity contribution.";
      obstacles = ["Target diligence incomplete", "Equity contribution clarity"];
      docs.push("Target teaser / CIM (if available)", "Sources & uses draft");
      readinessTimeline = "60–120 days depending on target readiness";
      confidence = fr >= 65 ? "medium-high" : "medium";
    } else if (purposes.includes("Equipment")) {
      path = "Equipment financing";
      why =
        "Equipment purpose aligns with asset-backed structures when collateral and cash flow support repayment.";
      docs.push("Equipment quotes / invoices", "Existing equipment list / appraisals if any");
      readinessTimeline = "30–60 days with clean documentation";
      confidence = "medium";
    } else if (
      purposes.includes("Refinance") ||
      (industry === "real_estate" && capital === "debt")
    ) {
      path =
        industry === "real_estate"
          ? "Commercial real estate financing"
          : "Conventional bank financing";
      why =
        "Refinance or real-estate context commonly maps to conventional / CRE lenders when DSCR and collateral are viable.";
      docs.push("Rent roll / lease abstracts (if CRE)", "Appraisal (if available)");
      readinessTimeline = "60–120 days";
      confidence = "medium";
    } else if (capital === "equity" || capital === "both") {
      path =
        fr >= 70 && (amount === "1_5m" || amount === "5m_plus")
          ? "Equity or strategic investment"
          : "Growth capital";
      why =
        "Equity or hybrid preference with growth profile suggests investor or growth-capital packaging after narrative and model readiness.";
      obstacles = ["Dilution / governance readiness", "Forecast credibility"];
      docs.push("12–24 month forecast", "Cap table summary");
      readinessTimeline = "90–180 days";
      confidence = fr >= 65 ? "medium" : "low-medium";
    } else if (reporting >= 3.5 && fr >= 70 && debt >= 3) {
      path =
        amount === "under_250k" || amount === "250_1m"
          ? "SBA financing"
          : amount === "5m_plus"
            ? "Private credit"
            : "Conventional bank financing";
      why =
        "Stronger funding readiness and reporting support traditional credit packaging; size and structure refine SBA vs bank vs private credit.";
      if (timeline === "4") {
        path = "Bridge financing";
        why =
          "Urgent timeline with otherwise stronger readiness may point to a bridge discussion while longer-term capital is packaged — not a commitment to fund.";
        obstacles.push("Bridge cost / refinance path");
      }
      if (purposes.includes("Working capital")) {
        if (path !== "Bridge financing") path = "Line of credit";
        why =
          "Working-capital purpose with reasonable readiness often maps to a revolving line once borrowing base and covenants are understood.";
      }
      readinessTimeline = "45–90 days with complete package";
      confidence = "medium-high";
    } else if (reporting < 2.5) {
      path = "Not funding-ready yet";
      why =
        "Books and reporting quality are below the level most capital sources require for efficient underwriting.";
      obstacles = ["Reporting remediation required"];
      readinessTimeline = "60–120 days after books remediation";
      confidence = "high";
    } else {
      path = "Growth capital";
      why =
        "General growth / debt intent with mid-tier readiness — packaging after closing documentation gaps.";
      readinessTimeline = "60–120 days";
      confidence = "medium";
    }

    if (flags.includes("tax_filings_not_current")) {
      obstacles.push("Tax filings must be brought current");
      confidence = "low";
    }
    if (flags.includes("restricted_industry_review")) {
      obstacles.push("Industry may require owner / specialist review");
      confidence = "low";
    }

    return {
      recommended_capital_path: path,
      why_it_may_fit: why,
      primary_obstacles: obstacles.length
        ? obstacles
        : ["Verification of self-reported financials"],
      documents_likely_required: docs,
      estimated_readiness_timeline: readinessTimeline,
      confidence_level: confidence,
      required_advisor_validation: true,
      disclaimer:
        "This is not lender approval, a credit decision, or a commitment to fund. Capital outcomes depend on third-party underwriting and verification.",
    };
  }

  function serviceRecommendations(answers, scored, capitalRec) {
    const reporting = scored.sections_0_5.reporting ?? 3;
    const band = scored.band;
    const capital = answers["Q12.3"];
    const purposes = [].concat(answers["Q12.2"] || []);
    const exit = answers["Q16.1"];
    const timeline = answers["Q12.4"];
    const fr = scored.scores.funding_readiness ?? 0;

    let primaryKey = "SKU-FRA";
    let secondaries = [];

    if (reporting <= 2 && (timeline === "3" || timeline === "4") && capital !== "none") {
      primaryKey = "SKU-FCFO";
      secondaries = ["SKU-FRA", "SKU-MODEL"];
    } else if (purposes.includes("Acquisition")) {
      primaryKey = "SKU-ACQ";
      secondaries = ["SKU-CAP-CORE", "SKU-MODEL"];
    } else if (exit === "lt2" || exit === "2_5") {
      primaryKey = band === "A" || band === "B" ? "SKU-EXIT" : "SKU-FRA";
      secondaries =
        band === "A" || band === "B"
          ? ["SKU-CAP-CORE", "SKU-MODEL"]
          : ["SKU-FCFO"];
    } else if (band === "A" && capital !== "none") {
      primaryKey =
        answers["Q2.1"] === "5" || answers["Q12.1"] === "5m_plus"
          ? "SKU-CAP-ENT"
          : "SKU-CAP-GROWTH";
      secondaries = ["SKU-MODEL"];
    } else if (band === "B" && capital !== "none" && fr >= 55) {
      primaryKey = "SKU-CAP-CORE";
      secondaries = ["SKU-FRA"];
    } else if (capitalRec.recommended_capital_path === "Not funding-ready yet") {
      primaryKey = reporting < 3 ? "SKU-FCFO" : "SKU-FRA";
      secondaries = ["SKU-MODEL"];
    } else {
      primaryKey = "SKU-FRA";
      secondaries = ["SKU-CAP-CORE"];
    }

    secondaries = secondaries.filter((k) => k !== primaryKey).slice(0, 2);

    function enrich(key, role) {
      const sku = SKUS[key];
      if (!sku) {
        return {
          role,
          engagement_name: key,
          price: {
            status: "OWNER_REVIEW_REQUIRED",
            label: "OWNER REVIEW REQUIRED",
          },
          owner_review_required: true,
        };
      }
      const priceStatus = sku.ownerReviewRequired
        ? "OWNER_REVIEW_REQUIRED"
        : "estimate_from_rate_card";
      return {
        role,
        engagement_name: sku.name,
        category: sku.category,
        sku_id: key,
        business_problem_addressed: problemFor(key, capitalRec),
        expected_deliverables: deliverablesFor(key),
        estimated_timeline: timelineFor(key),
        estimated_investment_range: {
          status: priceStatus,
          label: sku.priceLabel,
          setup: sku.setup,
          monthly: sku.monthly,
          rate_card_version: PRICE_VER,
          owner_approval_required: true,
          may_change_after_diligence: true,
          notice_before_change:
            "You will be notified before any increase or reduction to estimated engagement pricing after diligence.",
        },
        why_selected: whyService(key, answers, scored, capitalRec),
        assumptions_requiring_validation: [
          "Self-reported financials verify in diligence",
          "Decision-maker authority confirmed",
          "No undisclosed debt, litigation, or tax issues",
        ],
        recommended_next_step: nextFor(key),
        owner_review_required: !!sku.ownerReviewRequired,
      };
    }

    return {
      primary: enrich(primaryKey, "primary"),
      secondary: secondaries.map((k) => enrich(k, "secondary")),
    };
  }

  function problemFor(key, capitalRec) {
    const map = {
      "SKU-FRA": "Clarify funding readiness and close documentation gaps before capital outreach.",
      "SKU-CAP-CORE": "Package and pursue an appropriate capital path with advisor-led diligence.",
      "SKU-CAP-GROWTH": "Scale capital advisory for larger or more complex growth financing needs.",
      "SKU-CAP-ENT": "Enterprise-complexity capital advisory and stakeholder coordination.",
      "SKU-FCFO": "Stabilize reporting, cash visibility, and finance leadership before capital packaging.",
      "SKU-EXIT": "Improve exit / diligence readiness and enterprise value presentation.",
      "SKU-ACQ": "Structure and diligence an acquisition financing path.",
      "SKU-MODEL": "Build credible forecasts and scenarios for capital or exit conversations.",
    };
    return map[key] || "Advisory support aligned to stated goals.";
  }

  function deliverablesFor(key) {
    const map = {
      "SKU-FRA": [
        "Readiness gap analysis",
        "Document checklist",
        "Recommended capital sequencing",
      ],
      "SKU-CAP-CORE": [
        "Capital strategy memo",
        "Lender/investor packaging support",
        "Weekly advisory cadence",
      ],
      "SKU-CAP-GROWTH": [
        "Advanced capital strategy",
        "Multi-source packaging",
        "Diligence coordination",
      ],
      "SKU-CAP-ENT": [
        "Enterprise capital program",
        "Complex structure advisory",
        "Executive reporting",
      ],
      "SKU-FCFO": [
        "Close cadence design",
        "Cash forecast process",
        "Reporting pack for capital readiness",
      ],
      "SKU-EXIT": [
        "Exit readiness scorecard",
        "Value-driver roadmap",
        "Diligence hygiene plan",
      ],
      "SKU-ACQ": [
        "Sources & uses framework",
        "Target diligence checklist",
        "Financing options memo",
      ],
      "SKU-MODEL": [
        "Integrated financial model",
        "Scenario analysis",
        "Assumptions register",
      ],
    };
    return map[key] || ["Scoped advisory deliverables (to be confirmed)"];
  }

  function timelineFor(key) {
    const map = {
      "SKU-FRA": "2–4 weeks",
      "SKU-CAP-CORE": "3–6 months typical advisory cycle",
      "SKU-CAP-GROWTH": "4–9 months typical",
      "SKU-CAP-ENT": "Custom — often 6–12 months",
      "SKU-FCFO": "2–4 months stabilization sprint common",
      "SKU-EXIT": "6–18 months depending on horizon",
      "SKU-ACQ": "Deal-dependent (often 60–180 days)",
      "SKU-MODEL": "2–6 weeks for initial model",
    };
    return map[key] || "To be scoped";
  }

  function whyService(key, answers, scored, capitalRec) {
    return (
      "Selected from self-reported stage, reporting quality (band " +
      scored.band +
      "), capital intent (" +
      (answers["Q12.3"] || "n/a") +
      "), and recommended capital path (" +
      capitalRec.recommended_capital_path +
      "). Preliminary only."
    );
  }

  function nextFor(key) {
    const map = {
      "SKU-FRA": "Request a Capital Readiness Review",
      "SKU-CAP-CORE": "Schedule a Strategy Session",
      "SKU-CAP-GROWTH": "Schedule a Strategy Session",
      "SKU-CAP-ENT": "Schedule a Strategy Session",
      "SKU-FCFO": "Request a Fractional CFO Consultation",
      "SKU-EXIT": "Request an Exit Readiness Review",
      "SKU-ACQ": "Request a Funding Review",
      "SKU-MODEL": "Schedule a Strategy Session",
    };
    return map[key] || "Schedule a Strategy Session";
  }

  function leadQualification(answers, scored, services, capitalRec, valuation) {
    const composite = scored.scores.composite ?? 0;
    const fr = scored.scores.funding_readiness ?? 0;
    const flags = scored.flags || [];
    const timeline = answers["Q12.4"];
    const dm =
      answers["contact.isDecisionMaker"] === true ||
      answers["contact.isDecisionMaker"] === "true";
    const capital = answers["Q12.3"];
    const complete =
      Math.round((scored.confidence_index || 0) * 100);

    let disqualified = false;
    let disqualifyReason = null;
    if (flags.includes("restricted_industry_review") && answers["Q8.1"] === "cannabis") {
      // soft: require human review, not hard DQ unless owner list says so
    }
    if (!answers["Q0.8"] && answers["Q0.8"] !== true) {
      // handled by form validation
    }

    // Legacy handled upstream
    let temperature = "Nurture";
    if (composite >= 75 && fr >= 65 && dm && capital !== "none" && (timeline === "3" || timeline === "4"))
      temperature = "Hot";
    else if (composite >= 55 && fr >= 45 && capital !== "none") temperature = "Warm";
    else if (composite < 35 && fr < 35) temperature = "Nurture";

    if (flags.includes("tax_filings_not_current") && timeline === "4") {
      temperature = "Warm"; // urgent but blocked
    }

    const salesPriority =
      temperature === "Hot"
        ? "Sales Priority"
        : temperature === "Warm"
          ? "Nurture"
          : "Educate";

    const primary = services.primary;
    const engValue = estimateEngagementValue(primary);
    const capitalNeed = mapCapitalNeed(answers["Q12.1"]);

    const fit = Math.min(
      100,
      Math.round(
        composite * 0.5 +
          fr * 0.3 +
          (dm ? 10 : 0) +
          (capital !== "none" ? 10 : 0)
      )
    );

    let closeBand = "Low";
    if (fit >= 75 && temperature === "Hot") closeBand = "High";
    else if (fit >= 55) closeBand = "Medium";

    const humanReview =
      !!primary.owner_review_required ||
      flags.includes("restricted_industry_review") ||
      flags.includes("litigation_or_regulatory") ||
      temperature === "Hot" ||
      valuation.status === "additional_information_required";

    return {
      lead_temperature: temperature,
      sales_priority: salesPriority,
      primary_need: primary.category || primary.engagement_name,
      secondary_need: (services.secondary[0] && services.secondary[0].category) || null,
      recommended_service: primary.engagement_name,
      recommended_sku: primary.sku_id,
      recommended_capital_path: capitalRec.recommended_capital_path,
      estimated_engagement_value: engValue,
      estimated_capital_need: capitalNeed,
      decision_timeline: labelTimeline(timeline),
      urgency: timeline === "4" ? "Urgent" : timeline === "3" ? "Near-term" : "Exploratory",
      data_completeness_pct: complete,
      fit_score: fit,
      close_likelihood_band: closeBand,
      required_human_review: humanReview,
      disqualified,
      disqualification_reason: disqualifyReason,
      auto_qualify: false,
    };
  }

  function estimateEngagementValue(primary) {
    if (!primary || !primary.estimated_investment_range) {
      return { status: "OWNER_REVIEW_REQUIRED", annualized_estimate: null };
    }
    const r = primary.estimated_investment_range;
    if (r.status === "OWNER_REVIEW_REQUIRED") {
      return {
        status: "OWNER_REVIEW_REQUIRED",
        annualized_estimate: null,
        label: r.label,
      };
    }
    const setup = r.setup || 0;
    const monthly = r.monthly || 0;
    const annualized = setup + monthly * 12;
    return {
      status: "estimate",
      setup,
      monthly,
      annualized_estimate: annualized,
      label:
        monthly != null
          ? `~$${annualized.toLocaleString()} first-year estimate (setup + 12 mo)`
          : r.label,
      owner_approval_required: true,
    };
  }

  function mapCapitalNeed(band) {
    const map = {
      under_250k: { label: "Under $250k", mid: 125000 },
      "250_1m": { label: "$250k–$1M", mid: 625000 },
      "1_5m": { label: "$1M–$5M", mid: 3000000 },
      "5m_plus": { label: "$5M+", mid: 7500000 },
      unsure: { label: "Unsure / not specified", mid: null },
    };
    return map[band] || { label: "Not specified", mid: null };
  }

  function labelTimeline(t) {
    return (
      {
        1: "Exploratory",
        2: "90–180 days",
        3: "30–90 days",
        4: "Urgent (<30 days)",
      }[t] || "Not specified"
    );
  }

  function selectCta(answers, scored, services, lead, capitalRec) {
    const missing = [];
    if (!answers["Q2.1"]) missing.push("revenue");
    if (!answers["Q11.1"]) missing.push("books");
    if (!answers["contact.email"]) missing.push("email");

    if (missing.length) {
      return {
        id: "complete_missing",
        label: "Complete Missing Information",
        staging_only: true,
      };
    }
    if (lead.lead_temperature === "Nurture" && (scored.scores.composite || 0) < 40) {
      return {
        id: "nurture",
        label: "Join Nurture Track",
        staging_only: true,
        note: "Nurture enrollment is staging-only until BL-C1 approval.",
      };
    }
    const next = services.primary.recommended_next_step || "";
    if (next.includes("Fractional CFO"))
      return { id: "fcfo", label: "Request a Fractional CFO Consultation", staging_only: true };
    if (next.includes("Exit"))
      return { id: "exit", label: "Request an Exit Readiness Review", staging_only: true };
    if (capitalRec.recommended_capital_path === "Not funding-ready yet")
      return { id: "capital_readiness", label: "Request a Capital Readiness Review", staging_only: true };
    if (
      ["SBA financing", "Private credit", "Bridge financing", "Acquisition financing"].includes(
        capitalRec.recommended_capital_path
      )
    )
      return { id: "funding_review", label: "Request a Funding Review", staging_only: true };
    if (lead.lead_temperature === "Hot" || lead.lead_temperature === "Warm")
      return { id: "strategy", label: "Schedule a Strategy Session", staging_only: true };
    return { id: "download_report", label: "Download the Report", staging_only: true };
  }

  function executiveDiagnostic(answers, scored) {
    const constraint = primaryConstraint(answers, scored);
    const risk = largestRisk(scored, answers);
    const driver = strongestDriver(answers);
    const stage = stageLabel(answers);
    const summary =
      stage +
      " business with composite readiness band " +
      scored.band +
      ". Primary constraint appears to be " +
      constraint +
      ". Strongest stated value driver: " +
      driver +
      ". Largest risk to address: " +
      risk +
      ". Immediate focus: close documentation gaps and validate the recommended advisory path before capital outreach.";

    return {
      executive_summary: summary,
      current_business_stage: stage,
      primary_constraint: constraint,
      strongest_value_driver: driver,
      largest_risk: risk,
      recommended_immediate_focus:
        "Validate books and tax currency, complete the document checklist, then proceed with the recommended consultation type — without assuming capital approval.",
    };
  }

  function build(answers, scored) {
    const diagnostic = executiveDiagnostic(answers, scored);
    const scorecards = {
      capital_readiness: interpretScore(
        "Capital Readiness",
        scored.scores.capital_readiness,
        true
      ),
      enterprise_value: interpretScore(
        "Enterprise Value",
        scored.scores.enterprise_value,
        true
      ),
      funding_readiness: interpretScore(
        "Funding Readiness",
        scored.scores.funding_readiness,
        true
      ),
      exit_readiness: interpretScore(
        "Exit Readiness",
        scored.scores.exit_readiness,
        true
      ),
      risk: interpretScore("Risk", scored.scores.risk, false),
      composite: interpretScore("Composite", scored.scores.composite, true),
    };
    const valuation = valuationBlock(answers, scored);
    const capital = capitalRecommendation(answers, scored);
    const services = serviceRecommendations(answers, scored, capital);
    const lead = leadQualification(answers, scored, services, capital, valuation);
    const cta = selectCta(answers, scored, services, lead, capital);
    const priorities = window.HVCG_EVA_RECS
      ? window.HVCG_EVA_RECS.recommend(answers, scored).top_5_priorities
      : [];
    const risks = (scored.flags || []).length
      ? scored.flags.map((f) => ({ code: f, summary: f.replace(/_/g, " ") }))
      : [{ code: "verification", summary: "Verification risk until diligence is complete" }];

    // Align priorities via recommendations if available
    let recsLite = null;
    if (window.HVCG_EVA_RECS) {
      recsLite = window.HVCG_EVA_RECS.recommend(answers, scored);
    }

    const ownerReviewFlags = [];
    if (services.primary.owner_review_required)
      ownerReviewFlags.push(services.primary.sku_id);
    services.secondary.forEach((s) => {
      if (s.owner_review_required) ownerReviewFlags.push(s.sku_id);
    });

    return {
      recommendation_version: VERSION,
      assessment_version: ASSESSMENT_VER,
      pricing_version: PRICE_VER,
      generated_at: new Date().toISOString(),
      executive_diagnostic: diagnostic,
      scorecards,
      scores_numeric: scored.scores,
      band: scored.band,
      confidence_index: scored.confidence_index,
      preliminary_enterprise_value: valuation,
      capital_and_funding: capital,
      hvcg_service_recommendation: services,
      lead_qualification: lead,
      conversion_cta: cta,
      top_5_priorities: (recsLite && recsLite.top_5_priorities) || priorities,
      major_risks: (recsLite && recsLite.biggest_risks) || risks,
      required_documents: capital.documents_likely_required,
      expected_timeline: services.primary.estimated_timeline,
      estimated_investment_range: services.primary.estimated_investment_range,
      contact: {
        email: "manny@highvaluecapitalgroup.com",
        phone_primary: "702.906.6444",
        phone_secondary: null,
        phone_secondary_flag:
          "725.577.6511 listed in inventory — OWNER REVIEW for public display / routing role (DS-PHONE NOT STARTED)",
      },
      disclaimers: [
        "Preliminary informational assessment only. Not a formal valuation, financing offer, credit decision, tax, legal, or investment advice.",
        "HVCG does not guarantee funding approval, enterprise value, tax outcomes, investment returns, or business performance.",
        "Estimates may change after diligence; you will be notified before any price increase or reduction.",
        "Legacy High Value Solution LLC clients are never auto-repriced under HVCG rates.",
      ],
      owner_review_required_skus: ownerReviewFlags,
      human_review_required: lead.required_human_review,
    };
  }

  /** Map conversion → Sprint 1 schema eva fields (sku/path) without breaking contract */
  function applyToSchemaEva(eva, conversion) {
    const primary = conversion.hvcg_service_recommendation.primary;
    const sku = primary.sku_id || "SKU-FRA";
    // Only map known CRM-safe SKUs onto schema recommended_sku
    const schemaSku = ["SKU-FRA", "SKU-CAP-CORE", "SKU-CAP-GROWTH", "SKU-CAP-ENT"].includes(
      sku
    )
      ? sku
      : "SKU-FRA";
    const pack = SKUS[schemaSku];
    return Object.assign({}, eva, {
      recommended_sku: schemaSku,
      package_label: pack.name + " (estimate)",
      proposed_price: {
        setup: pack.setup || 0,
        monthly: pack.monthly || 0,
      },
      rate_card_version: PRICE_VER,
      owner_approval_required: true,
    });
  }

  return {
    VERSION,
    PRICE_VER,
    build,
    applyToSchemaEva,
    SKUS,
  };
})();
