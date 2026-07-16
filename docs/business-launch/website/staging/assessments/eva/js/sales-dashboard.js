/** Sprint 4 — Internal sales dashboard (local staging board). */
(function () {
  function readJson(key, fallback) {
    try {
      const v = JSON.parse(localStorage.getItem(key) || "null");
      return v == null ? fallback : v;
    } catch (_) {
      return fallback;
    }
  }

  function boot() {
    const board = readJson("hvcg_eva_sales_board", []);
    const requests = readJson("hvcg_eva_strategy_requests", []);
    const activation = readJson("hvcg_eva_activation", null);
    const gates = window.HVCG_EVA_ACTIVATION.OWNER_GATES;

    const queues = {
      sales_priority: 0,
      nurture_warm: 0,
      nurture_educate: 0,
      educate: 0,
      legacy_block: 0,
      strategy_intake: 0,
    };
    board.forEach((r) => {
      const q = r.queue || "educate";
      queues[q] = (queues[q] || 0) + 1;
    });

    document.getElementById("boardMeta").innerHTML = [
      ["Leads on board", String(board.length)],
      ["Strategy requests", String(requests.length)],
      ["Outbound email", "BLOCKED (BL-C1)"],
      ["Production CRM", "BLOCKED (Track 1 freeze)"],
    ]
      .map(
        ([k, v]) =>
          `<div class="meta-row"><span>${k}</span><strong>${v}</strong></div>`
      )
      .join("");

    if (window.HVCG_EVA_EXEC_REVENUE) {
      const exec = window.HVCG_EVA_EXEC_REVENUE.buildFromLocal({
        board: board,
        requests: requests,
      });
      const k = exec.kpis || {};
      const execEl = document.getElementById("execKpiMeta");
      if (execEl) {
        execEl.innerHTML = [
          ["Leads", k.leads],
          ["EVAs completed", k.evas_completed],
          ["Conversion %", k.conversion_pct],
          ["Qualified leads", k.qualified_leads],
          ["Proposals sent", k.proposals_sent],
          ["Deals won", k.deals_won],
          ["MRR", k.mrr],
          ["Pipeline value", k.pipeline_value],
          ["Revenue forecast", k.revenue_forecast],
          ["Owner tasks", k.owner_tasks],
          ["Outstanding approvals", k.outstanding_approvals],
        ]
          .map(
            ([label, val]) =>
              `<div class="meta-row"><span>${label}</span><strong>${esc(
                val
              )}</strong></div>`
          )
          .join("");
      }
      const funnelEl = document.getElementById("funnelList");
      if (funnelEl) {
        funnelEl.innerHTML = (exec.sales_funnel || [])
          .map(
            (s) =>
              `<li><strong>${esc(s.stage)}</strong> — ${esc(s.count)}</li>`
          )
          .join("");
      }
    }

    document.getElementById("queueGrid").innerHTML = Object.keys(queues)
      .map(
        (k) =>
          `<div class="queue-card"><span>${k}</span><strong>${queues[k]}</strong></div>`
      )
      .join("");

    const tbody = document.querySelector("#boardTable tbody");
    tbody.innerHTML = board.length
      ? board
          .map((r) => {
            return `<tr>
            <td>${esc(r.company)}</td>
            <td>${esc(r.contact_name)}<br/><span class="fine">${esc(r.email)}</span></td>
            <td>${esc(r.temperature)}</td>
            <td>${r.fit_score == null ? "—" : r.fit_score}</td>
            <td>${esc(r.sku)}</td>
            <td>${esc(r.queue)}</td>
            <td>${esc(r.strategy_status)}</td>
            <td>${esc(r.owner_price_gate)}</td>
            <td class="fine">${esc(r.updated_at)}</td>
          </tr>`;
          })
          .join("")
      : `<tr><td colspan="9">No local leads yet. Complete an EVA and open results, or submit a strategy request.</td></tr>`;

    document.getElementById("requestList").innerHTML = requests.length
      ? requests
          .slice(0, 20)
          .map((r) => {
            return `<li><strong>${esc(r.request_id)}</strong> — ${esc(r.session_type)} · ${esc(
              (r.contact && r.contact.email) || ""
            )} · ${esc(r.status)} · slots: ${esc(
              ((r.preferred_slots || []).map((s) => s.label).join("; "))
            )}</li>`;
          })
          .join("")
      : "<li>No strategy session requests captured yet.</li>";

    const gateExtra =
      activation && activation.owner_gates
        ? activation.owner_gates.owner_review || []
        : [];
    const allGates = Object.values(gates).concat(gateExtra);
    document.getElementById("gateList").innerHTML = allGates
      .map(
        (g) =>
          `<li><strong>${esc(g.id)}</strong> [${esc(g.status)}] — ${esc(g.reason)}</li>`
      )
      .join("");

    document.getElementById("btnClearBoard").onclick = function () {
      localStorage.removeItem("hvcg_eva_sales_board");
      localStorage.removeItem("hvcg_eva_strategy_requests");
      localStorage.removeItem("hvcg_eva_activation");
      boot();
    };
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
