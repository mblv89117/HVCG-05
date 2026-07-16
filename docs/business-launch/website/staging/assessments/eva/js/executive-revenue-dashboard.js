/**
 * Sprint 4 Phase 2 — Executive Revenue Dashboard data layer.
 * Extends local sales board metrics; does not redesign existing dashboards.
 */
window.HVCG_EVA_EXEC_REVENUE = (function () {
  const VERSION = "exec-revenue-dashboard-1.0.0";

  function readJson(key, fallback) {
    if (typeof localStorage === "undefined") return fallback;
    try {
      const v = JSON.parse(localStorage.getItem(key) || "null");
      return v == null ? fallback : v;
    } catch (_) {
      return fallback;
    }
  }

  function emptyModel() {
    return {
      engine_version: VERSION,
      generated_at: new Date().toISOString(),
      environment_intent: "Development",
      kpis: {
        leads: 0,
        evas_started: 0,
        evas_completed: 0,
        conversion_pct: 0,
        qualified_leads: 0,
        proposals_sent: 0,
        deals_won: 0,
        mrr: 0,
        revenue_forecast: 0,
        pipeline_value: 0,
        owner_tasks: 0,
        outstanding_approvals: 0,
      },
      sales_funnel: [],
      pipeline_by_stage: {},
      owner_task_queue: [],
      outstanding_approval_queue: [],
      source: "local_staging_extension",
    };
  }

  function buildFromLocal(opts) {
    opts = opts || {};
    const board = opts.board || readJson("hvcg_eva_sales_board", []);
    const requests = opts.requests || readJson("hvcg_eva_strategy_requests", []);
    const activations =
      opts.activations || readJson("hvcg_eva_sales_engine_runs", []);
    const model = emptyModel();

    model.kpis.leads = board.length;
    model.kpis.evas_started = board.length + activations.length;
    model.kpis.evas_completed = board.filter((r) => r.temperature).length;
    model.kpis.conversion_pct =
      model.kpis.evas_started === 0
        ? 0
        : Number(
            (
              (model.kpis.evas_completed / model.kpis.evas_started) *
              100
            ).toFixed(1)
          );

    const qualified = board.filter((r) =>
      ["Sales Qualified", "Priority", "Immediate Opportunity", "Hot"].some(
        (x) =>
          String(r.qualification_class || "").indexOf(x) >= 0 ||
          r.temperature === "Hot"
      )
    );
    model.kpis.qualified_leads = qualified.length;

    let mrr = 0;
    let pipeline = 0;
    const byStage = {};
    const approvals = [];
    const tasks = [];

    board.forEach((r) => {
      const stage = r.pipeline_stage || r.queue || "unassigned";
      byStage[stage] = (byStage[stage] || 0) + 1;
      if (r.monthly_retainer) mrr += Number(r.monthly_retainer) || 0;
      if (r.pipeline_value) pipeline += Number(r.pipeline_value) || 0;
      if (r.owner_price_gate && r.owner_price_gate !== "RATE_CARD_ESTIMATE") {
        approvals.push({
          type: "pricing",
          company: r.company,
          detail: r.owner_price_gate,
        });
      }
      if (r.strategy_status === "REQUESTED_STAGING") {
        tasks.push({
          type: "strategy_followup",
          company: r.company,
          status: "Owner review",
        });
      }
    });

    requests.forEach((r) => {
      tasks.push({
        type: "strategy_request",
        id: r.request_id,
        status: r.status,
      });
    });

    activations.forEach((run) => {
      if (run.proposal && run.proposal.proposal_status === "Draft") {
        /* Draft proposals are not Sent */
      }
      if (run.proposal && run.proposal.client_acceptance_status === "Sent") {
        model.kpis.proposals_sent += 1;
      }
      if (run.pipeline && run.pipeline.shells && run.pipeline.shells.opportunity_draft) {
        const st = run.pipeline.shells.opportunity_draft.stage || "Discovery";
        byStage[st] = (byStage[st] || 0) + 1;
        if (run.pricing && run.pricing.estimated_monthly_retainer) {
          pipeline += Number(run.pricing.estimated_monthly_retainer) * 3;
        }
      }
      if (run.pricing && run.pricing.owner_approval_required) {
        approvals.push({
          type: "pricing_engine",
          detail: run.pricing.matched_rule_id || "owner_approval",
        });
      }
    });

    model.kpis.mrr = mrr;
    model.kpis.pipeline_value = pipeline;
    model.kpis.revenue_forecast = pipeline + mrr * 3;
    model.kpis.deals_won = board.filter((r) => r.deal_status === "Won").length;
    model.kpis.owner_tasks = tasks.length;
    model.kpis.outstanding_approvals = approvals.length;
    model.pipeline_by_stage = byStage;
    model.owner_task_queue = tasks.slice(0, 50);
    model.outstanding_approval_queue = approvals.slice(0, 50);
    model.sales_funnel = [
      { stage: "Leads", count: model.kpis.leads },
      { stage: "EVAs Completed", count: model.kpis.evas_completed },
      { stage: "Qualified", count: model.kpis.qualified_leads },
      { stage: "Proposals Sent", count: model.kpis.proposals_sent },
      { stage: "Deals Won", count: model.kpis.deals_won },
    ];
    return model;
  }

  function buildDashboardRowExtension(baseRow, salesEngine) {
    const row = Object.assign({}, baseRow || {});
    if (!salesEngine) return row;
    row.qualification_class =
      (salesEngine.qualification && salesEngine.qualification.classification) ||
      null;
    row.monthly_retainer =
      (salesEngine.pricing && salesEngine.pricing.estimated_monthly_retainer) ||
      null;
    row.pipeline_stage =
      (salesEngine.pipeline &&
        salesEngine.pipeline.shells &&
        salesEngine.pipeline.shells.opportunity_draft &&
        salesEngine.pipeline.shells.opportunity_draft.stage) ||
      row.queue ||
      null;
    row.pipeline_value =
      row.monthly_retainer != null ? Number(row.monthly_retainer) * 3 : null;
    row.proposal_status =
      (salesEngine.proposal && salesEngine.proposal.proposal_status) || null;
    row.confidence_score =
      (salesEngine.pricing && salesEngine.pricing.confidence_score) || null;
    return row;
  }

  return {
    VERSION,
    emptyModel,
    buildFromLocal,
    buildDashboardRowExtension,
  };
})();
