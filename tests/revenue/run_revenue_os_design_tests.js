#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const engine = require(
  path.resolve(
    __dirname,
    "../../docs/business-launch/revenue-os/reference/revenue-os-engine.js"
  )
);

const ROOT = path.resolve(__dirname, "../..");
let passed = 0;
let failed = 0;
const results = [];

function check(name, condition, detail = "") {
  const row = { name, ok: !!condition, detail };
  results.push(row);
  if (condition) passed++;
  else {
    failed++;
    console.error("FAIL", name, detail);
  }
}

// Global safety
check("mock_environment", engine.SAFETY.environment === "Mock");
check("production_writes_blocked", engine.SAFETY.productionWrites === false);
check("external_sends_blocked", engine.SAFETY.externalSends === false);
check("payment_processing_blocked", engine.SAFETY.paymentProcessing === false);
check("schema_changes_blocked", engine.SAFETY.schemaChanges === false);
check("auto_qualify_blocked", engine.SAFETY.autoQualify === false);
check("legacy_auto_reprice_blocked", engine.SAFETY.legacyAutoReprice === false);

// Lead qualification gates
const lead = { id: "L1", status: "Discovery", legacy_guard: "PASS" };
const deniedQual = engine.transition("lead", lead, "Qualified", {});
check(
  "lead_qualification_requires_manual_approval",
  !deniedQual.ok && deniedQual.errors.includes("manual_qualification_required")
);
const approvedQual = engine.transition("lead", lead, "Qualified", {
  manualApprovalRef: "APP-1",
  now: "2026-07-16T00:00:00Z",
});
check("lead_manual_qualification_allowed", approvedQual.ok);
check("lead_source_record_immutable", lead.status === "Discovery");
const legacyQual = engine.transition(
  "lead",
  { status: "Discovery", legacy_guard: "BLOCK" },
  "Qualified",
  { manualApprovalRef: "APP-1" }
);
check(
  "legacy_guard_blocks_qualification",
  !legacyQual.ok && legacyQual.errors.includes("legacy_guard_block")
);
check(
  "invalid_transition_rejected",
  !engine.transition("lead", lead, "Converted", {}).ok
);
check(
  "production_context_rejected",
  !engine.transition("lead", { status: "New" }, "Contacted", {
    environment: "Production",
  }).ok
);

// Proposal and contract gates
check(
  "proposal_price_gate",
  !engine.transition(
    "proposal",
    { status: "Internal Review", owner_review_required: true },
    "Approved",
    {}
  ).ok
);
check(
  "proposal_approved_with_price_approval",
  engine.transition(
    "proposal",
    { status: "Internal Review", owner_review_required: true },
    "Approved",
    { pricingApprovalRef: "PRICE-1" }
  ).ok
);
check(
  "proposal_send_requires_BL_C1",
  !engine.transition("proposal", { status: "Approved" }, "Sent", {}).ok
);
check(
  "contract_signature_requires_evidence",
  !engine.transition("contract", { status: "Sent" }, "Signed", {}).ok
);
check(
  "contract_signature_with_evidence",
  engine.transition("contract", { status: "Sent" }, "Signed", {
    signatureEvidenceId: "SIG-1",
  }).ok
);

// Forecast
const opportunities = [
  {
    id: "O1",
    stage: "Discovery",
    amount: 100000,
    forecast_category: "Pipeline",
  },
  {
    id: "O2",
    stage: "Negotiation",
    amount: 200000,
    forecast_category: "Best Case",
  },
  {
    id: "O3",
    stage: "Won",
    amount: 50000,
    forecast_category: "Closed",
  },
  {
    id: "O4",
    stage: "Proposal",
    amount: 80000,
    probability: 60,
    forecast_category: "Commit",
  },
];
const f = engine.forecast(opportunities);
check("weighted_pipeline_calculated", f.weighted_pipeline === 198000, f.weighted_pipeline);
check("closed_forecast", f.closed === 50000, f.closed);
check("commit_forecast", f.commit === 80000, f.commit);
check("scenario_order", f.scenarios.conservative <= f.scenarios.base && f.scenarios.base <= f.scenarios.upside);
check(
  "weighted_pipeline_api",
  engine.weightedPipeline(opportunities) === 198000
);

// Pipeline health
const green = engine.pipelineHealth(
  {
    stage_evidence_complete: true,
    next_action: "Call decision maker",
    next_action_at: "2026-07-20T00:00:00Z",
    last_meaningful_contact: "2026-07-15T00:00:00Z",
    decision_maker_identified: true,
    expected_close_date: "2026-08-01T00:00:00Z",
    amount: 100000,
    pricing_quality: true,
    data_completeness_pct: 100,
    owner: "owner@example.com",
  },
  "2026-07-16T00:00:00Z"
);
check("healthy_pipeline_green", green.band === "Green", JSON.stringify(green));
const red = engine.pipelineHealth(
  {
    next_action: null,
    last_meaningful_contact: "2026-06-01T00:00:00Z",
    close_date_slips: 2,
    proposal_expired: true,
    data_completeness_pct: 10,
  },
  "2026-07-16T00:00:00Z"
);
check("unhealthy_pipeline_red", red.band === "Red", JSON.stringify(red));
check("health_explains_risk", red.reasons.length >= 4);

// Invoice and collections
const pastDue = engine.invoiceAging(
  {
    amount: 10000,
    amount_collected: 2500,
    invoice_date: "2026-05-01",
    due_date: "2026-05-31",
    status: "Partial",
  },
  "2026-07-16"
);
check("invoice_open_balance", pastDue.open_balance === 7500, pastDue.open_balance);
check("invoice_past_due_status", pastDue.status === "Past Due");
check("invoice_aging_bucket", pastDue.aging_bucket === "31–60", pastDue.aging_bucket);
const collection = engine.recommendCollection(
  {
    amount: 10000,
    amount_collected: 0,
    invoice_date: "2026-01-01",
    due_date: "2026-01-31",
  },
  "2026-07-16"
);
check("collections_recommends_not_executes", collection.outbound_sent === false);
check("collections_no_writeoff", collection.writeoff_performed === false);
check("collections_owner_gate", collection.gate === "FINANCE_OWNER");

// Billing intent contract
const missingIntent = engine.createBillingIntent({});
check("billing_intent_validates_required", !missingIntent.ok);
const intent = engine.createBillingIntent({
  client_id: "C1",
  engagement_id: "E1",
  type: "Retainer",
  amount: 5000,
  service_period: "2026-08",
  idempotency_key: "E1|retainer|2026-08",
});
check("billing_intent_mock_created", intent.ok);
check("billing_intent_no_side_effect", intent.value.side_effect_performed === false);
check("billing_intent_deterministic_id", intent.value.billing_intent_id === engine.createBillingIntent(intent.value.input).value.billing_intent_id);

// Dashboard
const dashboard = engine.dashboard(
  {
    leads: [{ status: "New" }, { status: "Qualified" }],
    opportunities: opportunities.map((o, i) =>
      Object.assign({}, o, {
        owner: i === 0 ? null : "owner@example.com",
        next_action: i === 0 ? null : "Follow up",
        next_action_at: i === 0 ? null : "2026-07-20",
      })
    ),
    engagements: [
      { status: "Active", monthly_retainer: 5000, health: "Green" },
      { status: "Active", monthly_retainer: 7000, health: "Red" },
    ],
    invoices: [
      {
        id: "I1",
        amount: 10000,
        amount_collected: 2500,
        invoice_date: "2026-05-01",
        due_date: "2026-05-31",
      },
    ],
  },
  "2026-07-16T00:00:00Z"
);
check("dashboard_new_leads", dashboard.sales.new_leads === 1);
check("dashboard_mrr", dashboard.retainers.mrr === 12000, dashboard.retainers.mrr);
check("dashboard_at_risk_retainer", dashboard.retainers.at_risk_count === 1);
check("dashboard_open_ar", dashboard.billing.open_ar === 7500);
check("dashboard_past_due_ar", dashboard.billing.past_due_ar === 7500);
check("dashboard_data_quality", dashboard.data_quality.owner_coverage_pct === 75);
check("dashboard_is_mock", dashboard.safety.environment === "Mock");

// Documentation / model validation
const docsDir = path.resolve(ROOT, "docs/business-launch/revenue-os");
const requiredDocs = [
  "README.md",
  "ARCHITECTURE.md",
  "DATA_MODEL.json",
  "AUTOMATION_AND_INTERFACES.md",
  "KPI_FORECASTING_ANALYTICS.md",
  "ASSUMPTIONS_RISKS_DEBT.md",
  "QA_HANDOFF.md",
];
for (const file of requiredDocs) {
  check("doc_exists:" + file, fs.existsSync(path.join(docsDir, file)));
}
const model = JSON.parse(fs.readFileSync(path.join(docsDir, "DATA_MODEL.json"), "utf8"));
check("data_model_no_deploy", model.deployment === false);
check("data_model_no_schema_change", model.schema_changes === false);
check(
  "data_model_complete_domains",
  [
    "lead",
    "opportunity",
    "proposal",
    "contract_envelope",
    "client",
    "engagement",
    "onboarding_case",
    "project",
    "billing_intent",
    "invoice",
    "collection_activity",
    "forecast_line",
  ].every((key) => model.entities[key])
);

const summary = {
  suite: "HVCG Revenue OS design validation",
  version: engine.VERSION,
  passed,
  failed,
  total: passed + failed,
  results,
};
console.log(JSON.stringify(summary, null, 2));
process.exit(failed ? 1 : 0);
