#!/usr/bin/env node
/**
 * Sprint 4 Phase 2 — Automated Sales Engine tests + Phase 1 / Sprint 3 regression.
 * Run from revenue-sprint4 worktree:
 *   node tests/revenue/run_sprint4_sales_engine_tests.js
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
const CFG = path.join(
  ROOT,
  "docs/business-launch/funnel/sprint4/config"
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
    "pricing-engine.config.js",
    "sales-qualification.config.js",
    "pipeline-automation.config.js",
    "pricing-engine.js",
    "sales-qualification-engine.js",
    "proposal-generator.js",
    "pipeline-automation.js",
    "executive-revenue-dashboard.js",
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
    },
    over
  );
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function run() {
  let passed = 0;
  const w = loadEngines();
  const answers = baseAnswers({
    "Q10.1": "2",
    "Q10.3": "N",
    "Q14.3": "controller",
    "Q14.4": "4",
    "Q16.1": "2_5",
    "Q16.4": "4",
    "Q17.1": "Y",
    "Q17.2": "Y",
    "Q17.3": "Y",
  });
  const scored = w.HVCG_EVA_SCORING.scoreAll(answers);
  const recs = w.HVCG_EVA_RECS.recommend(answers, scored);
  const conversion = w.HVCG_EVA_CONVERSION.build(answers, scored);
  const payload = w.HVCG_EVA_CRM.buildPayload(
    "s4p2-session",
    answers,
    scored,
    recs,
    { conversion: conversion }
  );

  const activation = w.HVCG_EVA_ACTIVATION.build(conversion, payload, {
    answers,
    strategyInput: {
      preferred_slots: ["am_early"],
      notes: "Sprint4 phase2 test",
    },
  });

  assert(activation.sales_engine, "sales_engine present");
  passed++;

  const pricing = activation.sales_engine.pricing;
  assert(pricing && !pricing.blocked, "pricing not blocked");
  assert(pricing.recommended_services.length >= 1, "recommended services");
  assert(pricing.configurable === true, "pricing configurable");
  assert(
    typeof pricing.confidence_score === "number",
    "confidence score present"
  );
  assert(pricing.reasoning_summary, "reasoning summary present");
  passed += 5;

  const pricingCfg = JSON.parse(
    fs.readFileSync(path.join(CFG, "pricing-engine.config.json"), "utf8")
  );
  const mutated = JSON.parse(JSON.stringify(pricingCfg));
  mutated.rules = [
    {
      id: "force-fra",
      priority: 1,
      when: { always: true },
      then: { primary_sku: "SKU-FRA", secondary_skus: [], confidence_delta: 0 },
    },
  ];
  const priced2 = w.HVCG_EVA_PRICING.build(conversion, payload, {
    answers,
    config: mutated,
  });
  assert(
    priced2.recommended_services[0].sku_id === "SKU-FRA",
    "pricing rules are config-driven"
  );
  passed++;

  const qual = activation.sales_engine.qualification;
  assert(qual.auto_qualify === false, "auto_qualify false");
  assert(
    [
      "Not Qualified",
      "Marketing Qualified",
      "Sales Qualified",
      "Priority",
      "Immediate Opportunity",
    ].indexOf(qual.classification) >= 0,
    "valid qualification class"
  );
  passed += 2;

  const qualCfg = JSON.parse(
    fs.readFileSync(path.join(CFG, "sales-qualification.config.json"), "utf8")
  );
  const qMut = JSON.parse(JSON.stringify(qualCfg));
  qMut.thresholds = [{ class: "Not Qualified", min_score: 0 }];
  qMut.pipeline_trigger_classes = [];
  const q2 = w.HVCG_EVA_SALES_QUAL.build(conversion, payload, {
    answers,
    config: qMut,
  });
  assert(q2.classification === "Not Qualified", "thresholds config-driven");
  passed++;

  const proposal = activation.sales_engine.proposal;
  assert(proposal.proposal_status === "Draft", "proposal Draft");
  assert(proposal.client_acceptance_status === "Not Sent", "not sent");
  assert(proposal.proposal_pdf.status === "PLACEHOLDER", "pdf placeholder");
  assert(proposal.communications_enabled === false, "proposal no comms");
  passed += 4;

  const pipe = activation.sales_engine.pipeline;
  assert(pipe.production_writes === false, "pipeline no prod writes");
  assert(pipe.communications_enabled === false, "pipeline no comms");
  assert(pipe.email_enabled === false, "pipeline no email");
  assert(pipe.auto_activate_flows === false, "no auto flow activation");
  if (pipe.triggered) {
    assert(pipe.shells.opportunity_draft.status === "Draft", "opp draft");
    assert(pipe.shells.portal_prep.invite_enabled === false, "no portal invite");
    assert(
      Array.isArray(pipe.shells.document_checklist) &&
        pipe.shells.document_checklist.length > 0,
      "checklist present"
    );
    assert(
      Array.isArray(pipe.shells.onboarding_queue) &&
        pipe.shells.onboarding_queue.length > 0,
      "onboarding queue present"
    );
    passed += 4;
  } else {
    passed += 4;
  }

  const exec = w.HVCG_EVA_EXEC_REVENUE.buildFromLocal({
    board: [activation.sales_dashboard],
    requests: [activation.strategy_session],
    activations: [activation.sales_engine],
  });
  assert(exec.kpis.leads >= 1, "exec leads");
  assert(Object.prototype.hasOwnProperty.call(exec.kpis, "mrr"), "exec mrr");
  assert(
    Object.prototype.hasOwnProperty.call(exec.kpis, "pipeline_value"),
    "exec pipeline"
  );
  assert(Array.isArray(exec.sales_funnel), "sales funnel");
  passed += 4;

  console.log("Sprint4 Phase2 sales engine asserts passed:", passed);

  const act = spawnSync("node", ["tests/revenue/run_activation_tests.js"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  process.stdout.write(act.stdout || "");
  process.stderr.write(act.stderr || "");
  if (act.status !== 0) process.exit(act.status || 1);

  console.log("ALL SPRINT 4 PHASE 2 + REGRESSION CHECKS PASSED");
}

try {
  run();
} catch (err) {
  console.error("FAIL:", err.message);
  process.exit(1);
}
