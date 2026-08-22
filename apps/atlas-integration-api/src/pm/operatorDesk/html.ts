import { EMPTY_REASON } from '../commercialContext/types.ts';
import type { OperatorDeskModel, OperatorOperatingItem, OperatorQueueItem } from './types.ts';

function esc(value: string | number | undefined | null): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function queueList(items: OperatorQueueItem[], empty: string): string {
  if (!items.length) return `<p class="empty">${esc(empty)}</p>`;
  return `<ul>${items
    .map((item) => {
      const label = esc(item.title);
      const inner = item.href
        ? `<a href="${esc(item.href)}">${label}</a>`
        : label;
      return `<li><span class="kind">${esc(item.kind)}</span> ${inner}</li>`;
    })
    .join('')}</ul>`;
}

function operatingList(items: OperatorOperatingItem[], empty: string, synthetic = false): string {
  if (!items.length) return `<p class="empty">${esc(empty)}</p>`;
  return `<ul>${items
    .map((row) => {
      const qa = synthetic || row.clientCode === 'SYN01' || row.clientCode === 'SYNTH01';
      const title = qa ? `${row.title} (SYNTHETIC QA)` : row.title;
      return `<li><span class="kind">${esc(row.queue)}</span> ${esc(title)} · ${esc(row.clientCode)} <span class="muted">(${esc(row.provenance)})</span></li>`;
    })
    .join('')}</ul>`;
}

function flatQueues(
  queues: OperatorDeskModel['operatingPicture']['queues'],
): OperatorOperatingItem[] {
  return [
    ...queues.needsAction,
    ...queues.waiting,
    ...queues.overdue,
    ...queues.blocked,
    ...queues.decisionRequired,
    ...queues.atRisk,
    ...queues.ready,
    ...queues.outcomes,
  ];
}

const SHELL = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Atlas Hub operator desk</title>
<style>
  :root { color-scheme: dark; --bg:#0f1419; --card:#1a222c; --ink:#e8eef4; --muted:#93a1b0; --line:#2a3644; --good:#3dd68c; --warn:#f5c06a; }
  body { margin:0; font:15px/1.45 ui-sans-serif,system-ui,Segoe UI,sans-serif; background:var(--bg); color:var(--ink); }
  header, main { max-width:1080px; margin:0 auto; padding:20px 24px; }
  h1 { font-size:1.35rem; margin:0 0 6px; }
  h2 { font-size:1.05rem; margin:0 0 8px; }
  .muted { color:var(--muted); }
  .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:10px; margin:16px 0; }
  .card, section { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:14px 16px; margin:12px 0; }
  .card strong { display:block; font-size:1.4rem; }
  .empty { color:var(--muted); margin:0; }
  .kind { display:inline-block; font-size:11px; letter-spacing:.04em; text-transform:uppercase; color:var(--warn); margin-right:6px; }
  ul { margin:0; padding-left:18px; }
  li { margin:4px 0; }
  a { color:#8cb4ff; }
  form { display:flex; gap:8px; }
  input[type=search] { flex:1; padding:8px 10px; border-radius:8px; border:1px solid var(--line); background:#0c1116; color:var(--ink); }
  button { padding:8px 12px; border-radius:8px; border:0; background:#2f6fed; color:white; }
  .off { color:var(--good); font-size:12px; }
</style>
</head>
<body>
`;

export function renderUnsignedOperatorDesk(): string {
  return `${SHELL}
<header>
  <h1>Atlas Hub operator desk</h1>
  <p class="muted">Microsoft sign-in required. This desk is fail-closed and does not render CRM, Search, or commercial context without a Hub Bearer token.</p>
</header>
<main>
  <section>
    <h2>Signed out</h2>
    <p>Use the same Hub API access token required by <code>/api/pm/*</code>. Live GTM outbound and paid ads stay OFF. Atlas does not invent LTV, MRI, or campaign history.</p>
    <p class="empty">No queues. No clients. No search results.</p>
  </section>
</main>
</body></html>`;
}

export function renderOperatorDeskHtml(model: OperatorDeskModel): string {
  const cc = model.commercialContext;
  const gccEmpty = cc.gcc.emptyReason || EMPTY_REASON.gcc;
  const copilotEmpty = cc.copilot.emptyReason || EMPTY_REASON.copilot;
  const gtmEmpty = cc.gtm.emptyReason || EMPTY_REASON.gtm;
  const rows = cc.rows
    .map((row) => {
      const bits = [
        row.clientCode,
        row.title,
        row.stage,
        row.capitalHandoffStatus,
        row.hasGcc ? 'GCC recorded' : null,
        row.hasCopilot ? 'Copilot recorded' : null,
        row.hasGtm ? 'GTM recorded' : null,
      ].filter(Boolean);
      return `<li>${esc(bits.join(' · '))}</li>`;
    })
    .join('');
  const searchHits = model.search.ran
    ? model.search.hits.length
      ? `<ul>${model.search.hits
          .map((hit) => `<li><span class="kind">${esc(hit.kind || 'hit')}</span> ${esc(hit.title)}${hit.clientCode ? ` · ${esc(hit.clientCode)}` : ''}</li>`)
          .join('')}</ul>`
      : `<p class="empty">No entitled matches for “${esc(model.search.q)}”. Atlas does not invent results.</p>`
    : `<p class="empty">Enter at least two characters. Search is entitled and fail-closed.</p>`;
  const op = model.operatingPicture;
  const realWork = flatQueues(op.queues);
  const syntheticWork = flatQueues(op.syntheticQueues);

  return `${SHELL}
<header>
  <h1>Atlas Hub operator desk</h1>
  <p class="muted">Daily CRM + Search + commercial context without Elite chrome. Hub SHA ${esc(model.hubSha || 'unknown')}.</p>
  <p class="off">liveGtmOutbound=false · paidAds=false · recorded-only commercial lanes</p>
</header>
<main>
  <div class="cards">
    <div class="card"><span class="muted">Active projects</span><strong>${esc(model.businessHealth.activeProjects)}</strong></div>
    <div class="card"><span class="muted">Open tasks</span><strong>${esc(model.businessHealth.openTasks)}</strong></div>
    <div class="card"><span class="muted">Overdue</span><strong>${esc(model.businessHealth.overdueTasks)}</strong></div>
    <div class="card"><span class="muted">Decisions</span><strong>${esc(model.businessHealth.decisionsNeeded)}</strong></div>
    <div class="card"><span class="muted">Entitled clients</span><strong>${esc(model.entitledClients.length)}</strong></div>
  </div>
  <section>
    <h2>Client workspace preview</h2>
    ${
      model.clientDeskPreviews.length
        ? `<ul>${model.clientDeskPreviews
            .map(
              (row) =>
                `<li><span class="kind">preview</span> <a href="${esc(row.href)}">${esc(row.clientCode)}</a> · isolated client desk</li>`,
            )
            .join('')}</ul>`
        : '<p class="empty">No entitled client workspace to preview. Atlas does not invent clients.</p>'
    }
  </section>
  <section>
    <h2>Client journey</h2>
    <p class="muted">Governed activation → invitation → signed client session. Staff preview is not a Client Executive session.</p>
    ${
      model.clientJourneys.length
        ? `<ul>${model.clientJourneys
            .map((row) => {
              const session = row.signedClientSession ? 'signed client session' : 'signedClientSession=false';
              const stage = row.canStageFromDesk
                ? ` · stage <code>${esc(row.stageHref)}</code>`
                : '';
              const reissue = row.canReissueInviteFromDesk
                ? ` · reissue <code>${esc(row.reissueHref)}</code>`
                : '';
              return `<li><span class="kind">${esc(row.classification)}</span> <a href="${esc(row.previewHref)}">${esc(row.clientCode)}</a> · workspace ${row.workspaceStaged ? 'staged' : 'not staged'} · invite ${esc(row.invitationStatus)} · ${esc(session)} · GCC <code>${esc(row.gccWorkspaceKey)}</code>${stage}${reissue}<br/><span class="muted">${esc(row.nextAction)}</span></li>`;
            })
            .join('')}</ul>`
        : '<p class="empty">No entitled client journey in this session. Atlas does not invent clients.</p>'
    }
  </section>
  <section>
    <h2>What we are working on</h2>
    <p class="muted">HVS ${esc(op.hvsDataAccess)} · ${op.honestEmpty ? 'honest empty for real clients' : `${esc(String(op.realClientsOperationalized.length))} real client(s) operationalized`} · SYNQA ${syntheticWork.length ? 'labeled' : 'none'}</p>
    ${operatingList(realWork, 'No entitled customer operating items. Atlas does not invent work.')}
  </section>
  <section>
    <h2>Needs Action</h2>
    ${operatingList(op.queues.needsAction, 'No customer Needs Action items in entitled scope.')}
  </section>
  <section>
    <h2>Waiting</h2>
    ${operatingList(op.queues.waiting, 'No customer Waiting items in entitled scope.')}
  </section>
  <section>
    <h2>Overdue</h2>
    ${operatingList(op.queues.overdue, 'No customer Overdue items in entitled scope.')}
  </section>
  <section>
    <h2>Blocked</h2>
    ${operatingList(op.queues.blocked, 'No customer Blocked items in entitled scope.')}
  </section>
  <section>
    <h2>Decision Required</h2>
    ${operatingList(op.queues.decisionRequired, 'No customer Decision Required items in entitled scope.')}
  </section>
  <section>
    <h2>At Risk</h2>
    ${operatingList(op.queues.atRisk, 'No customer At Risk items in entitled scope.')}
  </section>
  <section>
    <h2>Synthetic QA work</h2>
    <p class="muted">Labeled fixtures only. SYN01 is not a customer operationalization.</p>
    ${operatingList(syntheticWork, 'No labeled SYNTHETIC_QA work in this entitled session.', true)}
  </section>
  <section>
    <h2>Missing or blocked data</h2>
    ${
      op.missingData.length
        ? `<ul>${op.missingData.map((row) => `<li>${esc(row)}</li>`).join('')}</ul>`
        : '<p class="empty">No recorded gaps for this entitled session.</p>'
    }
  </section>
  <section>
    <h2>Recovery ledger</h2>
    ${
      op.recoveryLedger.length
        ? `<ul>${op.recoveryLedger
            .map((row) => {
              const code = row.clientCode || 'n/a';
              const state = row.accessible ? (row.operationalized ? 'operationalized' : 'accessible') : 'inaccessible';
              return `<li><span class="kind">${esc(row.provenance)}</span> ${esc(row.client)} · ${esc(code)} · ${esc(state)}</li>`;
            })
            .join('')}</ul>`
        : '<p class="empty">No recovery rows for this entitled session.</p>'
    }
  </section>
  <section>
    <h2>Needs action</h2>
    ${queueList(model.queues.needsAction, 'No needs-action items in entitled scope.')}
  </section>
  <section>
    <h2>Decision queue</h2>
    ${queueList(model.queues.decisions, 'No owner decisions in entitled scope.')}
  </section>
  <section>
    <h2>Overdue + follow-ups</h2>
    ${queueList([...model.queues.overdue, ...model.queues.followUps], 'No overdue work or follow-ups in entitled scope.')}
  </section>
  <section>
    <h2>Commercial context</h2>
    <p class="muted">GCC ${cc.gcc.available ? `recorded (${cc.gcc.count})` : 'honest empty'} · Copilot ${cc.copilot.available ? `recorded (${cc.copilot.count})` : 'honest empty'} · GTM ${cc.gtm.available ? `recorded (${cc.gtm.count})` : 'honest empty'}</p>
    ${cc.gcc.available ? '' : `<p class="empty">${esc(gccEmpty)}</p>`}
    ${cc.copilot.available ? '' : `<p class="empty">${esc(copilotEmpty)}</p>`}
    ${cc.gtm.available ? '' : `<p class="empty">${esc(gtmEmpty)}</p>`}
    ${rows ? `<ul>${rows}</ul>` : '<p class="empty">No entitled commercial rows. Atlas does not invent LTV or campaigns.</p>'}
  </section>
  <section>
    <h2>Search</h2>
    <form method="get" action="/operator">
      <input type="search" name="q" minlength="2" maxlength="120" value="${esc(model.search.q)}" placeholder="Entitled search"/>
      <button type="submit">Search</button>
    </form>
    ${searchHits}
  </section>
</main>
</body></html>`;
}
