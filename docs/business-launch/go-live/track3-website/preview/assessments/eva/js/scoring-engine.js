/**
 * Multi-score EVA engine (Dev). Outputs 0–100 domain scores + composite band.
 * Aligns with ENTERPRISE_VALUE_ASSESSMENT_SPEC weights (abbreviated EVA-FREE).
 */
window.HVCG_EVA_SCORING = (function () {
  const WEIGHTS = {
    maturity: 0.1,
    revenue: 0.12,
    profitability: 0.12,
    cash: 0.1,
    debt: 0.08,
    collateral: 0.06,
    industry: 0.06,
    growth: 0.08,
    risk: 0.1,
    reporting: 0.1,
    capital_clarity: 0.05,
    management: 0.05,
    exit: 0.03,
    ops: 0.05,
  };

  function optScore(q, val) {
    if (!q || val === undefined || val === null || val === "") return null;
    if (q.type === "multi" && Array.isArray(val)) {
      if (val.includes("MCA")) return 1;
      if (val.includes("None") && val.length === 1) return 5;
      return 3;
    }
    if (q.options) {
      const o = q.options.find((x) => String(x.value) === String(val));
      if (o && typeof o.score === "number") return o.score;
    }
    if (q.type === "number") {
      let n = Number(val);
      if (q.id === "Q0.5") {
        if (n < 1) n = 0;
        else if (n < 2) n = 2;
        else if (n < 4) n = 3;
        else if (n < 8) n = 4;
        else n = 5;
      } else {
        n = Math.max(0, Math.min(5, n));
      }
      return n;
    }
    return null;
  }

  function scaleInvert(n, invert) {
    n = Math.max(0, Math.min(5, Number(n)));
    if (!invert) return n;
    return 6 - n; // 1→5, 5→1
  }

  function sectionMean(answers, domain) {
    const qs = (window.HVCG_EVA_BANK.QUESTIONS || []).filter(
      (q) => q.scored === domain
    );
    const vals = [];
    for (const q of qs) {
      if (typeof q.showIf === "function" && !q.showIf(answers)) continue;
      let s;
      if (q.type === "scale") {
        if (answers[q.id] === undefined || answers[q.id] === "") continue;
        s = scaleInvert(answers[q.id], q.invert);
      } else {
        s = optScore(q, answers[q.id]);
      }
      if (s === null || s === undefined || Number.isNaN(s)) continue;
      vals.push(s);
    }
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  function bandFrom(score) {
    if (score >= 80) return "A";
    if (score >= 65) return "B";
    if (score >= 50) return "C";
    if (score >= 35) return "D";
    return "F";
  }

  function to100(mean05) {
    if (mean05 === null) return null;
    return Math.round(Math.max(0, Math.min(5, mean05)) * 20);
  }

  function flags(answers) {
    const f = [];
    if (answers["Q11.7"] === "N") f.push("tax_filings_not_current");
    if (answers["Q5.6"] === "Y") f.push("debt_distress_history");
    if (answers["Q10.3"] === "Y") f.push("litigation_or_regulatory");
    if (answers["Q8.1"] === "cannabis") f.push("restricted_industry_review");
    if (answers["Q8.1"] === "fintech" && answers["Q8.2"] === "Y")
      f.push("regulated_fintech");
    const debt = answers["Q5.2"] || [];
    if (Array.isArray(debt) && debt.includes("MCA") && answers["Q12.4"] === "4")
      f.push("mca_stacking_urgent_capital");
    if (Number(answers["Q10.1"]) >= 4) f.push("high_customer_concentration");
    return f;
  }

  function scoreAll(answers) {
    const sections = {};
    for (const d of Object.keys(WEIGHTS)) {
      sections[d] = sectionMean(answers, d);
    }
    // Debt cap if defaults
    if (answers["Q5.6"] === "Y" && sections.debt !== null) {
      sections.debt = Math.min(sections.debt, 1);
    }

    let wSum = 0;
    let acc = 0;
    for (const [d, w] of Object.entries(WEIGHTS)) {
      if (sections[d] === null) continue;
      acc += sections[d] * w;
      wSum += w;
    }
    const composite05 = wSum ? acc / wSum : 0;
    const composite = Math.round(composite05 * 20);

    const capitalReadiness = to100(
      meanOf([
        sections.reporting,
        sections.cash,
        sections.debt,
        sections.collateral,
        sections.capital_clarity,
        sections.ops,
      ])
    );
    const enterpriseValue = to100(
      meanOf([
        sections.revenue,
        sections.profitability,
        sections.growth,
        sections.maturity,
        sections.industry,
      ])
    );
    const fundingReadiness = to100(
      meanOf([
        sections.capital_clarity,
        sections.debt,
        sections.collateral,
        sections.reporting,
        sections.cash,
      ])
    );
    const exitReadiness = to100(
      meanOf([sections.exit, sections.management, sections.ops, sections.reporting])
    );
    // Risk score: higher = more risk (invert operating quality)
    const riskQuality = meanOf([sections.risk, sections.debt, sections.cash]);
    const riskScore =
      riskQuality === null ? null : Math.round(100 - riskQuality * 20);

    const confidence =
      Math.round(
        (Object.values(sections).filter((x) => x !== null).length /
          Object.keys(WEIGHTS).length) *
          100
      ) / 100;

    return {
      sections_0_5: sections,
      scores: {
        capital_readiness: capitalReadiness,
        enterprise_value: enterpriseValue,
        funding_readiness: fundingReadiness,
        exit_readiness: exitReadiness,
        risk: riskScore,
        composite,
      },
      band: bandFrom(composite),
      confidence_index: Math.min(1, confidence),
      flags: flags(answers),
      composite_score_proxy: composite,
    };
  }

  function meanOf(arr) {
    const v = arr.filter((x) => x !== null && x !== undefined);
    if (!v.length) return null;
    return v.reduce((a, b) => a + b, 0) / v.length;
  }

  /** Rough valuation range hint — preliminary, non-binding. */
  function valuationRange(answers, scores) {
    const revMap = { 1: 0.05, 2: 0.3, 3: 1.0, 4: 3.0, 5: 8.0 }; // $M mid
    const rev = revMap[String(answers["Q2.1"])] || 1;
    const ebitdaMult = {
      loss: [0.5, 1.5],
      breakeven: [2, 4],
      modest: [3, 6],
      strong: [5, 9],
    };
    const m = ebitdaMult[answers["Q3.2"]] || [2, 5];
    // Revenue multiple proxy for early / services
    let low = rev * m[0] * 0.4;
    let high = rev * m[1] * 0.7;
    if (scores.enterprise_value >= 70) {
      low *= 1.15;
      high *= 1.2;
    }
    if (scores.risk >= 60) {
      low *= 0.75;
      high *= 0.85;
    }
    const fmt = (n) => {
      if (n < 1) return `$${Math.round(n * 1000)}k`;
      return `$${n.toFixed(1)}M`;
    };
    return {
      low_label: fmt(low),
      high_label: fmt(high),
      method: "preliminary_revenue_ebitda_proxy",
      disclaimer:
        "Not a formal valuation, appraisal, or fairness opinion. Ranges are illustrative only.",
    };
  }

  return { scoreAll, valuationRange, bandFrom, WEIGHTS };
})();
