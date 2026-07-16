#!/usr/bin/env node
/**
 * Sprint 4 activation suite + Sprint 3 regression gate.
 * Run from revenue-sprint4 worktree:
 *   node tests/revenue/run_activation_tests.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");
const EVA_JS = path.join(
  ROOT,
  "docs/business-launch/website/staging/assessments/eva/js"
);

function loadEngines() {
  const sandbox = { console, window: {} };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const f of [
    "question-bank.js",
    "scoring-engine.js",
    "recommendations.js",
    "conversion-engine.js",
    "crm-payload.js",
    "nurture-framework.js",
    "activation-engine.js",
  ]) {
    vm.runInContext(fs.readFileSync(path.join(EVA_JS, f), "utf8"), ctx);
  }
  return sandbox.window;
}

function baseAnswers(over = {}) {
  return Object.assign(
    {
      "Q0.1": "Northridge Manufacturing LLC",
      "Q0.3": "LLC",
      "Q0.4": "NV",
      "Q0.5": "8",
      "contact.firstName": "Jordan",
      "contact.lastName": "Lee",
      "contact.email": "jordan.lee@example.com",
      "contact.phone": "7025550100",
      "contact.role": "Owner / CEO",
      "contact.isDecisionMaker": "true",
      "Q0.8": true,
      "Q0.9": true,
      "Q0.10": true,
      "Q1.1": "growth",
      "Q1.3": "Y",
      "Q1.5": "3",
      "Q8.1": "manufacturing",
      "Q8.2": "N",
      "Q8.mfg_capacity": "mid",
      "Q8.3": "4",
      "Q9.2": "sales",
      "Q9.3": "4",
      "company.challenge": "Need working capital before peak season",
      "company.valueDriverThemes": ["Working capital / cash conversion"],
      "Q2.1": "4",
      "Q2.3": "modest",
      "Q2.4": "3",
      "Q3.1": "3",
      "Q3.2": "modest",
      "Q4.1": "3",
      "Q4.2": "2",
      "Q11.1": "3",
      "Q11.7": "Y",
      "Q12.1": "250_1m",
      "Q12.2": ["Working capital", "Growth"],
      "Q12.3": "debt",
      "Q12.4": "3",
      "Q12.6": "Y",
      "Q5.2": ["Bank"],
      "Q5.4": "Y",
      "Q5.6": "N",
      "Q13.1": "Y",
      "Q10.1": "2",
      "Q10.3": "N",
      "Q14.3": "controller",
      "Q14.4": "4",
      "Q16.1": "2_5",
      "Q16.4": "4",
      "Q17.1": "Y",
      "Q17.2": "Y",
      "Q17.3": "Y",
    },
    over
  );
}

const w = loadEngines();
let pass = 0;
let fail = 0;
const results = [];

function assert(name, cond, detail = "") {
  if (cond) {
    pass++;
    results.push({ name, ok: true, detail });
  } else {
    fail++;
    results.push({ name, ok: false, detail });
    console.error("FAIL", name, detail);
  }
}

function run(answers) {
  const scored = w.HVCG_EVA_SCORING.scoreAll(answers);
  const recs = w.HVCG_EVA_RECS.recommend(answers, scored);
  const conv = w.HVCG_EVA_CONVERSION.build(answers, scored);
  const full = w.HVCG_EVA_CRM.buildPayload("s4-session", answers, scored, recs, {
    conversion: conv,
  });
  const schema = w.HVCG_EVA_CRM.schemaOnly(full);
  const nurture = w.HVCG_EVA_NURTURE.buildPlan(conv, full);
  const activation = w.HVCG_EVA_ACTIVATION.build(conv, full, {
    strategyInput: {
      name: "Jordan Lee",
      email: "jordan.lee@example.com",
      preferred_slots: ["am_late", "pm_mid"],
      notes: "Peak season working capital",
    },
    nurturePlan: nurture,
  });
  return { scored, conv, full, schema, nurture, activation };
}

// --- Sprint 4 cases ---
{
  const { activation, schema, nurture, conv, full } = run(baseAnswers());
  assert("activation_version", activation.activation_version === "activation-1.0.0");
  assert(
    "strategy_session_captured",
    activation.strategy_session &&
      activation.strategy_session.status === "REQUESTED_STAGING",
    activation.strategy_session && activation.strategy_session.status
  );
  assert(
    "strategy_no_live_booking",
    activation.strategy_session.live_booking_enabled === false
  );
  assert(
    "qual_auto_qualify_false",
    activation.qualification_workflow.auto_qualify === false
  );
  assert(
    "qual_lead_status_new",
    activation.qualification_workflow.lead_status_intent === "New"
  );
  assert(
    "engagement_primary_present",
    !!activation.engagement_recommendation.primary_engagement.name
  );
  assert(
    "crm_pipeline_no_prod",
    activation.crm_pipeline.production_writes === false
  );
  assert(
    "crm_schema_unchanged_flag",
    activation.crm_pipeline.schema_only_keys_unchanged === true
  );
  assert(
    "crm_prod_stage_blocked",
    activation.crm_pipeline.stages.some(
      (s) => s.id === "production_sync" && s.status === "BLOCKED"
    )
  );
  assert("nurture_outbound_disabled", nurture.outbound_enabled === false);
  assert("nurture_bl_c1_blocked", nurture.bl_c1_gate === "BL-C1" || nurture.bl_c1_gate === "BLOCKED" || nurture.bl_c1_gate.includes("BLOCK"));
  assert(
    "nurture_triggers_planned_not_sent",
    nurture.triggers.every((t) => t.fire_status === "PLANNED_NOT_SENT" && t.send_allowed === false)
  );
  assert(
    "owner_gates_block_outbound",
    activation.owner_gates.can_send_outbound === false
  );
  assert(
    "owner_gates_block_prod",
    activation.owner_gates.can_write_prod === false
  );
  assert(
    "dashboard_row",
    activation.sales_dashboard && activation.sales_dashboard.company === "Northridge Manufacturing LLC"
  );
  assert(
    "schema_keys_locked_s4",
    JSON.stringify(Object.keys(schema).sort()) ===
      JSON.stringify(
        [
          "company",
          "consent",
          "contact",
          "eva",
          "leadSourceDetail",
          "sessionId",
          "source",
          "submittedAt",
        ].sort()
      ),
    Object.keys(schema).join(",")
  );
  assert(
    "conversion_engine_untouched_api",
    typeof w.HVCG_EVA_CONVERSION.build === "function" &&
      conv.recommendation_version != null
  );
}

{
  const { activation, full } = run(
    baseAnswers({ "Q0.1": "ACCG Inc", "Q12.4": "2", "Q12.3": "none" })
  );
  assert(
    "legacy_queue_block",
    activation.qualification_workflow.queue === "legacy_block" ||
      full.eva.legacy_guard === "BLOCK",
    activation.qualification_workflow.queue + "/" + full.eva.legacy_guard
  );
  assert(
    "legacy_nurture_internal_only",
    activation.nurture.sequence_id === "legacy_halt" ||
      activation.nurture.triggers.every((t) => t.channel === "internal")
  );
}

{
  const fire = w.HVCG_EVA_NURTURE.canFire({
    channel: "email",
    send_allowed: false,
  });
  assert("nurture_canfire_email_blocked", fire.allowed === false);
  const internal = w.HVCG_EVA_NURTURE.canFire({ channel: "internal" });
  assert("nurture_canfire_internal_ok", internal.allowed === true && internal.send === false);
}

// File presence / no Sprint 3 engine mutation markers
{
  const convSrc = fs.readFileSync(path.join(EVA_JS, "conversion-engine.js"), "utf8");
  assert(
    "conversion_engine_no_s4_import",
    !convSrc.includes("HVCG_EVA_ACTIVATION") && !convSrc.includes("activation-engine")
  );
  const indexHtml = fs.readFileSync(
    path.join(ROOT, "docs/business-launch/website/staging/assessments/eva/index.html"),
    "utf8"
  );
  assert("index_loads_activation_bridge", indexHtml.includes("activation-bridge.js"));
  assert(
    "strategy_session_page",
    fs.existsSync(
      path.join(
        ROOT,
        "docs/business-launch/website/staging/assessments/eva/strategy-session.html"
      )
    )
  );
  assert(
    "sales_dashboard_page",
    fs.existsSync(
      path.join(
        ROOT,
        "docs/business-launch/website/staging/assessments/eva/sales-dashboard.html"
      )
    )
  );
}

console.log(
  JSON.stringify({ passed: pass, failed: fail, total: pass + fail, results }, null, 2)
);

// Regression: Sprint 3 suite must still pass
const reg = spawnSync("node", [path.join(__dirname, "run_conversion_tests.js")], {
  cwd: ROOT,
  encoding: "utf8",
});
if (reg.status !== 0) {
  console.error("Sprint 3 regression FAILED");
  console.error(reg.stdout || reg.stderr);
  process.exit(1);
}
const regJson = JSON.parse(reg.stdout);
assert(
  "sprint3_regression_pass",
  regJson.failed === 0 && regJson.passed === 33,
  JSON.stringify({ passed: regJson.passed, failed: regJson.failed })
);

console.log(
  JSON.stringify(
    {
      sprint4_passed: pass,
      sprint4_failed: fail,
      sprint3_regression: regJson,
      ok: fail === 0 && regJson.failed === 0,
    },
    null,
    2
  )
);
process.exit(fail === 0 && regJson.failed === 0 ? 0 : 1);
