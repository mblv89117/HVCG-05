/**
 * Sprint 4 — Activation bridge (additive).
 * Enhances Sprint 3 results CTA without changing conversion-engine.js.
 * Observes results panel and wires Strategy Session / nurture / activation persist.
 */
(function () {
  if (!window.HVCG_EVA_ACTIVATION) return;

  let wired = false;

  function readConversion() {
    try {
      return JSON.parse(localStorage.getItem("hvcg_eva_conversion") || "null");
    } catch (_) {
      return null;
    }
  }

  function readFull() {
    try {
      return JSON.parse(localStorage.getItem("hvcg_eva_last_full") || "null");
    } catch (_) {
      return null;
    }
  }

  function ensureActivation(strategyInput) {
    const conversion = readConversion();
    if (!conversion) return null;
    const full = readFull();
    const activation = window.HVCG_EVA_ACTIVATION.build(conversion, full, {
      strategyInput: strategyInput || null,
    });
    window.HVCG_EVA_ACTIVATION.persist(activation);
    return activation;
  }

  function enhanceCta() {
    const panel = document.getElementById("resultsPanel");
    if (!panel || panel.hidden) return;
    const ctaBtn = document.getElementById("primaryCta");
    if (!ctaBtn || ctaBtn.dataset.s4Wired === "1") return;

    const conversion = readConversion();
    if (!conversion) return;

    // Persist activation row for sales dashboard as soon as results show
    ensureActivation(null);

    const ctaId = conversion.conversion_cta && conversion.conversion_cta.id;
    const note = document.getElementById("ctaStagingNote");
    const openReport = document.getElementById("openReport");

    // Additive link row for Sprint 4 pages (do not remove Sprint 3 report link)
    let row = document.getElementById("s4ActionRow");
    if (!row && panel.querySelector(".cta-panel")) {
      row = document.createElement("div");
      row.id = "s4ActionRow";
      row.className = "cta-row";
      row.style.marginTop = "0.75rem";
      row.innerHTML =
        '<a class="btn secondary" href="strategy-session.html">Strategy Session request</a>' +
        '<a class="btn ghost" href="sales-dashboard.html">Internal sales board</a>';
      const ctaPanel = panel.querySelector(".cta-panel");
      if (openReport && openReport.parentElement) {
        openReport.parentElement.appendChild(row);
      } else if (ctaPanel) {
        ctaPanel.appendChild(row);
      }
    }

    const prev = ctaBtn.onclick;
    ctaBtn.onclick = function (e) {
      e.preventDefault();
      if (note) note.hidden = false;

      if (ctaId === "download_report") {
        window.location.href = "report.html";
        return;
      }
      if (ctaId === "nurture") {
        ensureActivation(null);
        window.location.href = "strategy-session.html?mode=nurture";
        return;
      }
      // Default: strategy / consult request capture
      ensureActivation(null);
      window.location.href =
        "strategy-session.html?cta=" + encodeURIComponent(ctaId || "strategy");
    };
    ctaBtn.dataset.s4Wired = "1";
    wired = true;
    if (typeof prev === "function") {
      /* Sprint 3 handler replaced by activation-aware handler; staging note still shown */
    }
  }

  function boot() {
    enhanceCta();
    const panel = document.getElementById("resultsPanel");
    if (!panel) return;
    const obs = new MutationObserver(enhanceCta);
    obs.observe(panel, { attributes: true, attributeFilter: ["hidden"] });
    // Also watch when finish() reveals panel after innerHTML updates
    const root = document.querySelector(".app-shell") || document.body;
    const obs2 = new MutationObserver(enhanceCta);
    obs2.observe(root, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
