/**
 * Sprint 4 Phase 2 — Pipeline Automation (Draft shells only).
 * Does NOT activate flows, email, Teams, or Production.
 */
window.HVCG_EVA_PIPELINE = (function () {
  const VERSION = "pipeline-automation-1.0.0";

  function getConfig(override) {
    return override || window.HVCG_PIPELINE_CONFIG || null;
  }

  function build(qualification, pricing, proposal, conversion, fullPayload, opts) {
    opts = opts || {};
    const config = getConfig(opts.config);
    if (!config) {
      return {
        engine_version: VERSION,
        error: "MISSING_PIPELINE_CONFIG",
        activated: false,
      };
    }

    const classification =
      (qualification && qualification.classification) || "Not Qualified";
    const trigger =
      (config.trigger_classes || []).indexOf(classification) >= 0 &&
      !(qualification && qualification.auto_qualify);
    const company =
      ((fullPayload && fullPayload.company) || {}).legalName ||
      ((fullPayload && fullPayload.answers) || {})["Q0.1"] ||
      "Unknown Company";
    const contact = (fullPayload && fullPayload.contact) || {};
    const stage =
      (config.stage_by_class && config.stage_by_class[classification]) ||
      "Discovery";

    if (!trigger) {
      return {
        engine_version: VERSION,
        config_version: config.config_version,
        triggered: false,
        reason: "Qualification class below pipeline trigger threshold",
        classification,
        production_writes: false,
        communications_enabled: false,
        activated: false,
        shells: null,
      };
    }

    const idSeed =
      "draft-" + Date.now().toString(16) + "-" + Math.random().toString(16).slice(2, 7);

    const primaryName =
      (pricing &&
        pricing.recommended_services &&
        pricing.recommended_services[0] &&
        pricing.recommended_services[0].name) ||
      "Engagement";
    const opportunity = {
      status: "Draft",
      title: company + " — " + primaryName,
      stage,
      environment: "Development",
      activated: false,
      flow_ref: "HVCG_LeadQualifiedCreateOpportunity",
      flow_activated: false,
      estimated_monthly_retainer:
        pricing && pricing.estimated_monthly_retainer != null
          ? pricing.estimated_monthly_retainer
          : null,
      note: "Draft shell only — existing LeadQualified path remains owner-gated",
    };

    const projectShell = {
      status: "Draft",
      name: company + " — Engagement Shell",
      template: "general-client-onboarding",
      activated: false,
      flow_ref: "HVCG_CreateProjectFromTemplate",
    };

    const clientFolder = {
      status: "Draft",
      path_intent: "Clients/" + company.replace(/[^\w\- ]+/g, "").trim(),
      activated: false,
      flow_ref: "HVCG_CreateClientWorkspace",
    };

    const documentChecklist = (config.document_checklist_template || []).map(
      (item, idx) => ({
        id: "doc-" + (idx + 1),
        title: item,
        status: "Required",
        requested: false,
      })
    );

    const portalPrep = Object.assign(
      {
        client: company,
        contact_email: contact.email || null,
      },
      config.portal_prep || {},
      { invite_enabled: false }
    );

    const onboardingQueue = (config.onboarding_task_templates || []).map(
      (title, idx) => ({
        id: "task-" + (idx + 1),
        title,
        status: "Queued_Draft",
        assignee: config.default_assignee_email || null,
      })
    );

    return {
      engine_version: VERSION,
      config_version: config.config_version,
      draft_id: idSeed,
      triggered: true,
      classification,
      environment_intent: config.environment_intent || "Development",
      production_writes: false,
      communications_enabled: false,
      email_enabled: false,
      teams_notify_enabled: false,
      auto_activate_flows: false,
      activated: false,
      existing_flows_referenced_not_modified:
        config.existing_flows_referenced_not_modified || [],
      shells: {
        opportunity_draft: opportunity,
        project_shell: projectShell,
        client_folder: clientFolder,
        document_checklist: documentChecklist,
        portal_prep: portalPrep,
        onboarding_queue: onboardingQueue,
        proposal_draft_ref: proposal
          ? {
              proposal_status: proposal.proposal_status,
              proposal_version: proposal.proposal_version,
            }
          : null,
      },
      next_safe_action:
        "Keep all shells Draft. Manual Dev CRM qualify remains owner-gated. No outbound.",
    };
  }

  return { VERSION, getConfig, build };
})();
