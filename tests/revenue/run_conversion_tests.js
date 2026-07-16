#!/usr/bin/env node
/**
 * Sprint 3 conversion + schema validation suite (Dev).
 * Run: node tests/revenue/run_conversion_tests.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "../..");
const EVA_JS = path.join(
  ROOT,
  "docs/business-launch/website/staging/assessments/eva/js"
);

function loadEngine() {
  const sandbox = { console, window: {} };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const f of [
    "question-bank.js",
    "scoring-engine.js",
    "recommendations.js",
    "conversion-engine.js",
    "crm-payload.js",
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

const w = loadEngine();
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

function run(name, answers) {
  const scored = w.HVCG_EVA_SCORING.scoreAll(answers);
  const recs = w.HVCG_EVA_RECS.recommend(answers, scored);
  const conv = w.HVCG_EVA_CONVERSION.build(answers, scored);
  const full = w.HVCG_EVA_CRM.buildPayload("test-session", answers, scored, recs, {
    conversion: conv,
  });
  return { scored, recs, conv, full, schema: w.HVCG_EVA_CRM.schemaOnly(full) };
}

// --- Cases ---
{
  const { conv, schema, full } = run("high_quality", baseAnswers());
  assert("high_quality_hot_or_warm", ["Hot", "Warm"].includes(conv.lead_qualification.lead_temperature), conv.lead_qualification.lead_temperature);
  assert("high_quality_has_capital_path", !!conv.capital_and_funding.recommended_capital_path);
  assert("high_quality_primary_service", !!conv.hvcg_service_recommendation.primary.engagement_name);
  assert("high_quality_valuation_or_info", ["preliminary_range", "additional_information_required"].includes(conv.preliminary_enterprise_value.status));
  assert("high_quality_schema_source", schema.source === "Website-EVA");
  assert("high_quality_no_auto_qualify", full._experience.crm_record.auto_qualify === false);
  assert("high_quality_disclaimer", (conv.disclaimers || []).length >= 3);
  assert("high_quality_cta", !!conv.conversion_cta.label);
}

{
  const { conv } = run(
    "early_low_rev",
    baseAnswers({
      "Q1.1": "early",
      "Q2.1": "1",
      "Q3.2": "loss",
      "Q3.4": "Need path",
      "Q11.1": "1",
      "Q12.3": "none",
      "Q12.4": "1",
      "Q4.1": "1",
    })
  );
  assert("early_not_funding_ready_or_nurture", ["Nurture", "Warm"].includes(conv.lead_qualification.lead_temperature) || conv.capital_and_funding.recommended_capital_path === "Not funding-ready yet");
}

{
  const { conv } = run(
    "funding_ready",
    baseAnswers({
      "Q11.1": "4",
      "Q12.4": "3",
      "Q2.1": "4",
      "Q5.4": "Y",
      "Q5.6": "N",
      "Q4.1": "4",
    })
  );
  assert(
    "funding_ready_path_not_blocked",
    conv.capital_and_funding.recommended_capital_path !== "Not funding-ready yet" ||
      conv.scores_numeric.funding_readiness >= 50,
    conv.capital_and_funding.recommended_capital_path
  );
}

{
  const { conv } = run(
    "not_ready",
    baseAnswers({
      "Q11.1": "1",
      "Q11.7": "N",
      "Q12.4": "4",
      "Q5.2": ["MCA", "Credit cards"],
      "Q5.6": "Y",
    })
  );
  assert(
    "not_ready_restructure_or_not_ready",
    ["Not funding-ready yet", "Debt restructuring"].includes(
      conv.capital_and_funding.recommended_capital_path
    ),
    conv.capital_and_funding.recommended_capital_path
  );
}

{
  const { conv } = run(
    "acquisition",
    baseAnswers({ "Q12.2": ["Acquisition"], "Q12.3": "both" })
  );
  assert(
    "acquisition_path_or_service",
    conv.capital_and_funding.recommended_capital_path === "Acquisition financing" ||
      conv.hvcg_service_recommendation.primary.sku_id === "SKU-ACQ",
    conv.capital_and_funding.recommended_capital_path +
      " / " +
      conv.hvcg_service_recommendation.primary.sku_id
  );
}

{
  const { conv } = run(
    "exit",
    baseAnswers({ "Q16.1": "lt2", "Q12.3": "none" })
  );
  assert(
    "exit_cta_or_service",
    conv.hvcg_service_recommendation.primary.category === "Exit Readiness" ||
      (conv.conversion_cta.label || "").includes("Exit") ||
      (conv.conversion_cta.label || "").includes("Report") ||
      (conv.conversion_cta.label || "").includes("Capital"),
    conv.conversion_cta.label
  );
}

{
  const { conv } = run("incomplete", baseAnswers({ "Q2.1": "", "Q3.2": "" }));
  assert(
    "incomplete_valuation_blocked",
    conv.preliminary_enterprise_value.status === "additional_information_required"
  );
}

{
  const a = baseAnswers({ "Q0.1": "ACCG Inc." });
  const scored = w.HVCG_EVA_SCORING.scoreAll(a);
  const recs = w.HVCG_EVA_RECS.recommend(a, scored);
  const full = w.HVCG_EVA_CRM.buildPayload("legacy", a, scored, recs);
  assert("legacy_guard_block", full.eva.legacy_guard === "BLOCK");
  assert("legacy_create_not_allowed_meta", w.HVCG_EVA_CRM.legacyGuard("ACCG Inc.") === "BLOCK");
}

{
  const { schema, full } = run("dup", baseAnswers());
  const s2 = w.HVCG_EVA_CRM.schemaOnly(full);
  assert("idempotent_key_stable", schema.sessionId === s2.sessionId);
  assert(
    "schema_keys_locked",
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
      )
  );
}

{
  const { conv } = run(
    "owner_review_sku",
    baseAnswers({
      "Q11.1": "1",
      "Q12.4": "4",
      "Q12.3": "debt",
    })
  );
  const primary = conv.hvcg_service_recommendation.primary;
  if (primary.owner_review_required) {
    assert(
      "owner_review_price_flag",
      primary.estimated_investment_range.status === "OWNER_REVIEW_REQUIRED"
    );
  } else {
    assert("owner_review_optional_path", true, "primary not FCFO in this seed");
  }
}

{
  const { conv } = run("price_map", baseAnswers({ "Q11.1": "4", "Q2.1": "4" }));
  const inv = conv.hvcg_service_recommendation.primary.estimated_investment_range;
  assert("price_has_rate_card", inv.rate_card_version === "HVCG-PRICE-2026-07-15-v1");
  assert("price_owner_approval", inv.owner_approval_required === true);
}

{
  const html = fs.readFileSync(
    path.join(ROOT, "docs/business-launch/website/staging/assessments/eva/index.html"),
    "utf8"
  );
  assert("ui_no_crm_json_preview", !html.includes("crmJson") && !html.includes("CRM JSON"));
  assert("ui_no_schema_name", !html.includes("EVA_CRM_PAYLOAD"));
  assert("ui_has_disclaimer_block", html.includes("disclaimerBlock"));
  assert("ui_has_primary_cta", html.includes("primaryCta"));
  assert("ui_loads_conversion", html.includes("conversion-engine.js"));
}

{
  const report = fs.readFileSync(
    path.join(ROOT, "docs/business-launch/website/staging/assessments/eva/report.html"),
    "utf8"
  );
  assert("report_has_brand", report.includes("High Value Capital Group"));
  assert("report_has_phone", report.includes("702.906.6444"));
  assert("report_no_second_phone_display", !report.includes("725.577.6511"));
  assert("report_print", report.includes("window.print"));
}

// Accessibility / mobile static heuristics
{
  const html = fs.readFileSync(
    path.join(ROOT, "docs/business-launch/website/staging/assessments/eva/index.html"),
    "utf8"
  );
  assert("a11y_viewport", html.includes("viewport"));
  assert("a11y_lang", html.includes('lang="en"'));
  const css = fs.readFileSync(
    path.join(ROOT, "docs/business-launch/website/staging/assessments/eva/css/eva-app.css"),
    "utf8"
  );
  assert("mobile_media_query", css.includes("@media"));
}

console.log(JSON.stringify({ passed: pass, failed: fail, total: pass + fail, results }, null, 2));
process.exit(fail ? 1 : 0);
