/**
 * Sprint 4 Phase 2 — Proposal Generator (Draft only; PDF placeholder).
 */
window.HVCG_EVA_PROPOSAL = (function () {
  const VERSION = "proposal-generator-1.0.0";

  function build(pricing, qualification, conversion, fullPayload, opts) {
    opts = opts || {};
    const contact = (fullPayload && fullPayload.contact) || {};
    const company = (fullPayload && fullPayload.company) || {};
    const engage =
      (conversion && conversion.hvcg_service_recommendation) || {};
    const primary =
      (pricing &&
        (pricing.recommended_services || []).find((s) => s.role === "primary")) ||
      {};
    const version = opts.proposal_version || 1;

    const scope = [
      "Discovery and scoping aligned to EVA findings",
      "Recommended engagement: " + (primary.name || "TBD"),
      "Owner-approved commercial terms before send",
      "Diligence package collection and readiness review",
    ];

    const deliverables =
      (engage.primary && engage.primary.expected_deliverables) ||
      [
        "Engagement kickoff plan",
        "Priority workstreams and timeline",
        "Reporting cadence for owner",
      ];

    const weeks =
      (pricing &&
        pricing.implementation_timeline &&
        pricing.implementation_timeline.weeks) ||
      opts.default_timeline_weeks ||
      null;

    const paymentSchedule = [];
    if (pricing && pricing.estimated_setup != null) {
      paymentSchedule.push({
        label: "Setup / mobilization",
        amount: pricing.estimated_setup,
        timing: "Upon engagement acceptance",
      });
    }
    if (pricing && pricing.estimated_monthly_retainer != null) {
      paymentSchedule.push({
        label: "Monthly retainer",
        amount: pricing.estimated_monthly_retainer,
        timing: "Monthly in advance",
      });
    }
    if (pricing && pricing.success_fee) {
      paymentSchedule.push({
        label: pricing.success_fee.label || "Success fee",
        amount: null,
        percent: pricing.success_fee.percent,
        timing: "Upon qualifying close",
      });
    }

    return {
      engine_version: VERSION,
      proposal_status: "Draft",
      proposal_version: version,
      client_acceptance_status: "Not Sent",
      generated_at: new Date().toISOString(),
      environment_intent: "Development",
      communications_enabled: false,
      recommended_services: (pricing && pricing.recommended_services) || [],
      pricing: {
        currency: (pricing && pricing.currency) || "USD",
        setup: pricing ? pricing.estimated_setup : null,
        monthly_retainer: pricing ? pricing.estimated_monthly_retainer : null,
        success_fee: pricing ? pricing.success_fee : null,
        owner_approval_required: !!(pricing && pricing.owner_approval_required),
        rate_card_version: pricing ? pricing.rate_card_version : null,
      },
      scope_of_work: scope,
      implementation_timeline: {
        weeks,
        label: weeks ? weeks + " weeks (estimate)" : "Owner scoping required",
      },
      deliverables,
      payment_schedule: paymentSchedule,
      qualification_class:
        (qualification && qualification.classification) || null,
      client: {
        company:
          company.legalName ||
          answersName(fullPayload) ||
          null,
        contact_name:
          [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim() ||
          contact.name ||
          null,
        email: contact.email || null,
      },
      proposal_pdf: {
        status: "PLACEHOLDER",
        file_link: null,
        generator: "future-pdf-service",
        note: "PDF generation deferred; data contract ready for future integration",
      },
      list_mapping_intent: {
        sharepoint_list: "HVCG_Proposals",
        ProposalStatus: "Draft",
        write_mode: "NOT_EXECUTED",
      },
      future_integrations: [
        "PDF renderer",
        "Dev CRM proposal Draft write",
        "Owner approval queue",
        "Client portal proposal room (gated)",
      ],
    };
  }

  function answersName(fullPayload) {
    const a = (fullPayload && fullPayload.answers) || {};
    return a["Q0.1"] || null;
  }

  return { VERSION, build };
})();
