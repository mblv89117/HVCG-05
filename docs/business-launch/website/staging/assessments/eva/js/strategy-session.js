/** Sprint 4 — Strategy Session request page (staging capture only). */
(function () {
  const params = new URLSearchParams(location.search);
  const mode = params.get("mode") || "";
  const ctaParam = params.get("cta") || "strategy";

  function readJson(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch (_) {
      return null;
    }
  }

  function boot() {
    const conversion = readJson("hvcg_eva_conversion");
    const full = readJson("hvcg_eva_last_full");
    const contact = (full && full.contact) || {};
    const company = (full && full.company) || {};

    if (mode === "nurture") {
      document.getElementById("pageTitle").textContent = "Nurture track — staging enrollment";
    }

    const typeSel = document.getElementById("ssType");
    const types = [
      "Strategy Session",
      "Capital Readiness Review",
      "Funding Review",
      "Fractional CFO Consultation",
      "Exit Readiness Review",
      "Nurture Orientation (internal)",
    ];
    const mapped =
      window.HVCG_EVA_ACTIVATION.mapSessionType(ctaParam) || "Strategy Session";
    types.forEach((t) => {
      const o = document.createElement("option");
      o.value = t;
      o.textContent = t;
      if (t === mapped) o.selected = true;
      typeSel.appendChild(o);
    });

    const slots = document.getElementById("ssSlots");
    (window.HVCG_EVA_ACTIVATION.SLOT_PRESETS || []).forEach((s) => {
      const lab = document.createElement("label");
      lab.className = "check";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = s.id;
      lab.appendChild(cb);
      lab.appendChild(document.createTextNode(" " + s.label));
      slots.appendChild(lab);
    });

    document.getElementById("ssName").value = contact.name || "";
    document.getElementById("ssEmail").value = contact.email || "";
    document.getElementById("ssPhone").value = contact.phone || "";
    document.getElementById("ssCompany").value = company.legalName || "";

    document.getElementById("ssSubmit").onclick = submit;
  }

  function submit() {
    const err = document.getElementById("formError");
    const ok = document.getElementById("formSuccess");
    err.hidden = true;
    ok.hidden = true;

    const name = document.getElementById("ssName").value.trim();
    const email = document.getElementById("ssEmail").value.trim();
    const slots = [...document.querySelectorAll("#ssSlots input:checked")].map(
      (c) => c.value
    );

    if (!name || !email || !slots.length) {
      err.hidden = false;
      err.textContent = "Name, email, and at least one preferred time are required.";
      return;
    }

    const conversion = readJson("hvcg_eva_conversion");
    const full = readJson("hvcg_eva_last_full");
    const input = {
      name,
      email,
      phone: document.getElementById("ssPhone").value.trim(),
      company: document.getElementById("ssCompany").value.trim(),
      session_type: document.getElementById("ssType").value,
      preferred_slots: slots,
      notes: document.getElementById("ssNotes").value.trim(),
    };

    const activation = window.HVCG_EVA_ACTIVATION.build(conversion, full, {
      strategyInput: input,
    });
    window.HVCG_EVA_ACTIVATION.persist(activation);

    document.getElementById("ssForm").hidden = true;
    const panel = document.getElementById("confirmPanel");
    panel.hidden = false;
    const req = activation.strategy_session;
    document.getElementById("confirmText").textContent =
      "Request " +
      req.request_id +
      " queued as " +
      req.status +
      " · " +
      req.session_type +
      " · internal queue: " +
      req.internal_routing.queue +
      ".";
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
