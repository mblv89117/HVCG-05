/**
 * HVCG EVA Experience — multi-step wizard (Sprint 3 results = conversion engine).
 * Prospect-facing: no CRM JSON, schema names, or developer controls.
 */
(function () {
  const bank = window.HVCG_EVA_BANK;
  const store = window.HVCG_EVA_STORE;
  let state = {
    sessionId: store.uuid(),
    stepIndex: 0,
    answers: {},
  };

  const els = {
    progress: document.getElementById("progressFill"),
    progressLabel: document.getElementById("progressLabel"),
    stepTitle: document.getElementById("stepTitle"),
    stepSub: document.getElementById("stepSub"),
    form: document.getElementById("stepForm"),
    resumeBanner: document.getElementById("resumeBanner"),
    saveHint: document.getElementById("saveHint"),
    err: document.getElementById("stepError"),
    results: document.getElementById("resultsPanel"),
    navRow: document.getElementById("navRow"),
  };

  function init() {
    const prior = store.load();
    if (prior && prior.answers && Object.keys(prior.answers).length) {
      els.resumeBanner.hidden = false;
      document.getElementById("btnResume").onclick = () => {
        state = {
          sessionId: prior.sessionId || store.uuid(),
          stepIndex: prior.stepIndex || 0,
          answers: prior.answers || {},
        };
        els.resumeBanner.hidden = true;
        render();
      };
      document.getElementById("btnFresh").onclick = () => {
        store.clear();
        els.resumeBanner.hidden = true;
        render();
      };
    }
    document.getElementById("btnBack").onclick = () => {
      if (state.stepIndex > 0) {
        state.stepIndex--;
        persist();
        render();
      }
    };
    document.getElementById("btnNext").onclick = onNext;
    render();
  }

  function persist() {
    store.save(state);
    els.saveHint.textContent =
      "Autosaved " +
      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function render() {
    const step = bank.STEPS[state.stepIndex];
    const pct = Math.round((state.stepIndex / (bank.STEPS.length - 1)) * 100);
    els.progress.style.width = pct + "%";
    els.progressLabel.textContent = `Step ${state.stepIndex + 1} of ${bank.STEPS.length} — ${step.title}`;
    els.stepTitle.textContent = step.title;
    els.stepSub.textContent = step.subtitle;
    els.err.hidden = true;
    els.results.hidden = true;
    els.form.hidden = false;
    if (els.navRow) els.navRow.hidden = false;

    document.getElementById("btnBack").disabled = state.stepIndex === 0;
    document.getElementById("btnNext").disabled = false;
    const isReview = step.id === "review";
    document.getElementById("btnNext").textContent = isReview
      ? "See my results"
      : "Continue";

    els.form.innerHTML = "";
    if (isReview) {
      els.form.innerHTML = `<div class="review-box">
        <p>Ready to generate your <strong>preliminary</strong> Enterprise Value Assessment results — including readiness scores, capital guidance, and a recommended next step.</p>
        <p class="fine">Not a valuation or financing commitment. Final engagement pricing requires owner approval.</p>
      </div>`;
      return;
    }

    for (const q of bank.visibleQuestions(state.answers, step.id)) {
      els.form.appendChild(renderField(q));
    }
  }

  function renderField(q) {
    const wrap = document.createElement("div");
    wrap.className = "field";
    const lab = document.createElement("label");
    lab.htmlFor = "f_" + q.id;
    lab.innerHTML = q.label + (q.required ? ' <span class="req">*</span>' : "");
    wrap.appendChild(lab);
    const val = state.answers[q.id];

    if (q.type === "confirm") {
      const input = document.createElement("label");
      input.className = "check";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.id = "f_" + q.id;
      cb.checked = val === true || val === "true";
      cb.onchange = () => {
        state.answers[q.id] = cb.checked;
        persist();
      };
      input.appendChild(cb);
      input.appendChild(document.createTextNode(" I agree"));
      wrap.appendChild(input);
      return wrap;
    }

    if (q.type === "multi") {
      const box = document.createElement("div");
      box.className = "multi";
      const selected = Array.isArray(val) ? val : [];
      for (const o of q.options) {
        const l = document.createElement("label");
        l.className = "check";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.value = o.value;
        cb.checked = selected.includes(o.value);
        cb.onchange = () => {
          const cur = Array.isArray(state.answers[q.id])
            ? [...state.answers[q.id]]
            : [];
          if (cb.checked) {
            if (!cur.includes(o.value)) cur.push(o.value);
          } else {
            const i = cur.indexOf(o.value);
            if (i >= 0) cur.splice(i, 1);
          }
          state.answers[q.id] = cur;
          persist();
        };
        l.appendChild(cb);
        l.appendChild(document.createTextNode(" " + o.label));
        box.appendChild(l);
      }
      wrap.appendChild(box);
      return wrap;
    }

    if (q.type === "enum" || q.type === "scale") {
      const input = document.createElement("select");
      input.id = "f_" + q.id;
      const blank = document.createElement("option");
      blank.value = "";
      blank.textContent = "Select";
      input.appendChild(blank);
      for (const o of q.options) {
        const opt = document.createElement("option");
        opt.value = o.value;
        opt.textContent = o.label;
        if (String(val) === String(o.value)) opt.selected = true;
        input.appendChild(opt);
      }
      input.onchange = () => {
        state.answers[q.id] = input.value;
        persist();
        if (q.id === "Q8.1" || q.id === "Q3.2" || q.id === "Q12.3") render();
      };
      wrap.appendChild(input);
      return wrap;
    }

    if (q.type === "textarea") {
      const input = document.createElement("textarea");
      input.id = "f_" + q.id;
      input.rows = 4;
      if (q.maxLength) input.maxLength = q.maxLength;
      input.value = val || "";
      input.oninput = () => {
        state.answers[q.id] = input.value;
        persist();
      };
      wrap.appendChild(input);
      return wrap;
    }

    const input = document.createElement("input");
    input.id = "f_" + q.id;
    input.type =
      q.type === "email"
        ? "email"
        : q.type === "tel"
          ? "tel"
          : q.type === "number"
            ? "number"
            : "text";
    input.value = val || "";
    input.oninput = () => {
      state.answers[q.id] = input.value;
      persist();
    };
    wrap.appendChild(input);
    return wrap;
  }

  function onNext() {
    const step = bank.STEPS[state.stepIndex];
    if (step.id !== "review") {
      const missing = bank.validateStep(state.answers, step.id);
      if (missing.length) {
        els.err.hidden = false;
        els.err.textContent = "Please complete the required fields on this step.";
        return;
      }
      state.stepIndex++;
      persist();
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    finish();
  }

  function finish() {
    const scored = window.HVCG_EVA_SCORING.scoreAll(state.answers);
    const recs = window.HVCG_EVA_RECS.recommend(state.answers, scored);
    const conversion = window.HVCG_EVA_CONVERSION.build(state.answers, scored);
    const full = window.HVCG_EVA_CRM.buildPayload(
      state.sessionId,
      state.answers,
      scored,
      recs,
      { conversion: conversion }
    );
    const schema = window.HVCG_EVA_CRM.schemaOnly(full);

    try {
      localStorage.setItem("hvcg_eva_last_full", JSON.stringify(full));
      localStorage.setItem("hvcg_eva_last", JSON.stringify(schema));
      localStorage.setItem("hvcg_eva_conversion", JSON.stringify(conversion));
    } catch (_) {}

    // Silent Dev CRM post when configured (not shown to prospect)
    const url =
      (window.HVCG_EVA_CONFIG && window.HVCG_EVA_CONFIG.flowHttpUrl) ||
      localStorage.getItem("hvcg_eva_flow_http_url");
    if (url && full.eva.legacy_guard === "PASS") {
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(schema),
      }).catch(function () {});
    }

    els.form.hidden = true;
    if (els.navRow) els.navRow.hidden = true;
    els.results.hidden = false;
    document.getElementById("btnNext").disabled = true;
    renderResults(conversion, full);
    persist();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderResults(c, full) {
    const d = c.executive_diagnostic;
    document.getElementById("execSummary").textContent = d.executive_summary;
    document.getElementById("diagMeta").innerHTML = [
      ["Business stage", d.current_business_stage],
      ["Primary constraint", d.primary_constraint],
      ["Strongest value driver", d.strongest_value_driver],
      ["Largest risk", d.largest_risk],
      ["Immediate focus", d.recommended_immediate_focus],
    ]
      .map(
        ([k, v]) =>
          `<div class="meta-row"><span>${k}</span><strong>${escapeHtml(v)}</strong></div>`
      )
      .join("");

    const order = [
      "capital_readiness",
      "enterprise_value",
      "funding_readiness",
      "exit_readiness",
      "risk",
      "composite",
    ];
    document.getElementById("scoreGrid").innerHTML = order
      .map((k) => {
        const sc = c.scorecards[k];
        return `<div class="score-card">
          <span>${sc.name}</span>
          <strong>${sc.score ?? "—"}</strong>
          <p class="score-plain">${escapeHtml(sc.plain)}</p>
        </div>`;
      })
      .join("");

    const val = c.preliminary_enterprise_value;
    const valEl = document.getElementById("valuationBlock");
    if (val.status === "preliminary_range") {
      valEl.innerHTML = `<p class="val-range">${val.range.low} – ${val.range.high}</p>
        <ul class="fine-list">${val.disclaimers.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`;
    } else {
      valEl.innerHTML = `<p class="val-range">Additional information required</p>
        <p>${escapeHtml(val.message)}</p>
        <ul class="fine-list">${val.disclaimers.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`;
    }

    const cap = c.capital_and_funding;
    document.getElementById("capitalBlock").innerHTML = `
      <p><strong>Recommended capital path:</strong> ${escapeHtml(cap.recommended_capital_path)}</p>
      <p>${escapeHtml(cap.why_it_may_fit)}</p>
      <p><strong>Primary obstacles:</strong> ${escapeHtml(cap.primary_obstacles.join("; "))}</p>
      <p><strong>Estimated readiness timeline:</strong> ${escapeHtml(cap.estimated_readiness_timeline)}</p>
      <p><strong>Confidence:</strong> ${escapeHtml(cap.confidence_level)} · Advisor validation required</p>
      <p class="fine">${escapeHtml(cap.disclaimer)}</p>`;

    const svc = c.hvcg_service_recommendation.primary;
    const sec = c.hvcg_service_recommendation.secondary || [];
    document.getElementById("engagementBlock").innerHTML = `
      <p><strong>${escapeHtml(svc.engagement_name)}</strong></p>
      <p>${escapeHtml(svc.business_problem_addressed)}</p>
      <p><strong>Deliverables:</strong> ${escapeHtml((svc.expected_deliverables || []).join("; "))}</p>
      <p><strong>Estimated timeline:</strong> ${escapeHtml(svc.estimated_timeline)}</p>
      <p><strong>Estimated investment:</strong> ${escapeHtml(svc.estimated_investment_range.label)}</p>
      <p class="fine">Estimates are not binding quotes. Final pricing requires owner approval and may change after diligence — you will be notified before any increase or reduction.</p>
      ${
        sec.length
          ? `<p><strong>Also consider:</strong> ${escapeHtml(
              sec.map((s) => s.engagement_name).join("; ")
            )}</p>`
          : ""
      }`;

    document.getElementById("prioritiesList").innerHTML = (c.top_5_priorities || [])
      .map((p) => `<li><strong>${escapeHtml(p.title)}</strong> — ${escapeHtml(p.why)}</li>`)
      .join("");
    document.getElementById("risksList").innerHTML = (c.major_risks || [])
      .map((r) => `<li>${escapeHtml(r.summary)}</li>`)
      .join("");
    document.getElementById("docsList").innerHTML = (c.required_documents || [])
      .map((d) => `<li>${escapeHtml(d)}</li>`)
      .join("");

    document.getElementById("timelineInvest").innerHTML = `
      <p><strong>Suggested timeline:</strong> ${escapeHtml(c.expected_timeline)}</p>
      <p><strong>Estimated investment range:</strong> ${escapeHtml(
        c.estimated_investment_range.label
      )}</p>`;

    const cta = c.conversion_cta;
    const ctaBtn = document.getElementById("primaryCta");
    ctaBtn.textContent = cta.label;
    ctaBtn.onclick = function (e) {
      e.preventDefault();
      document.getElementById("ctaStagingNote").hidden = false;
    };

    document.getElementById("openReport").href = "report.html";
    document.getElementById("contactLine").textContent =
      c.contact.email + " · " + c.contact.phone_primary;

    document.getElementById("disclaimerBlock").innerHTML = (c.disclaimers || [])
      .map((x) => `<li>${escapeHtml(x)}</li>`)
      .join("");
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  init();
})();
