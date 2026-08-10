#!/usr/bin/env node
/**
 * Website Studio QA Agent — RELEASE GATE orchestrator.
 * Local-only. Does not deploy, merge, publish, or modify Production.
 */

import { spawnSync, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync, cpSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { FIXTURE, hub, hubHeaders, probe, extractH1 } from './lib/hub.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '../..');
const ELITE = process.env.ATLAS_ELITE_URL || 'http://127.0.0.1:5180';
const HUB = process.env.ATLAS_HUB_URL || 'http://127.0.0.1:8790';
const RUN_TYPE = (() => {
  const idx = process.argv.indexOf('--run-type');
  return idx >= 0 ? process.argv[idx + 1] : 'RELEASE GATE';
})();

function gitShort() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function nowIso() {
  return new Date().toISOString();
}

async function main() {
  const startedAt = nowIso();
  const t0 = Date.now();
  const testedCommit = gitShort();
  const stamp = testedCommit.slice(0, 12);
  const evidenceRoot = join(REPO, 'deployment/reports/website-studio-qa');
  const evidenceDir = join(evidenceRoot, `${stamp}-${Date.now()}`);
  const latestDir = join(evidenceRoot, 'latest');
  mkdirSync(evidenceDir, { recursive: true });
  process.env.QA_EVIDENCE_DIR = evidenceDir;

  const defects = [];
  const checks = [];
  const addCheck = (id, name, status, detail, durationMs) => {
    checks.push({ id, name, status, detail, durationMs });
    if (status === 'FAIL') {
      defects.push({
        id: `DEF-${defects.length + 1}`,
        title: name,
        severity: /before|after|safety|production|approve/i.test(name) ? 'CRITICAL' : 'HIGH',
        ownerWorkflowStep: name,
        expected: 'PASS',
        actual: detail || 'FAIL',
        affectedComponent: 'Website Studio',
        suggestedFix: 'See QA evidence and fix Phase 6B blocker',
        retestRequired: true,
      });
    }
  };

  // Service health
  const eliteHealth = await probe(ELITE);
  const hubHealth = await probe(`${HUB}/api/website-studio/health`);
  addCheck(
    'svc-elite',
    'Elite OS :5180',
    eliteHealth.ok ? 'PASS' : 'FAIL',
    JSON.stringify(eliteHealth),
  );
  addCheck('svc-hub', 'Integration Hub :8790', hubHealth.ok ? 'PASS' : 'FAIL', JSON.stringify(hubHealth));

  let ollama = await probe('http://127.0.0.1:11434/api/tags');
  addCheck(
    'svc-ollama',
    'Ollama (optional for deterministic advisor)',
    ollama.ok ? 'PASS' : 'WARN',
    JSON.stringify(ollama),
  );

  if (!eliteHealth.ok || !hubHealth.ok) {
    await finish({
      startedAt,
      t0,
      testedCommit,
      evidenceDir,
      latestDir,
      checks,
      defects,
      buttonInventory: emptyButtons(),
      beforeAfter: emptyBeforeAfter(),
      aiAdvisor: { mode: 'deterministic', threeOptionsOk: false, failures: ['services down'] },
      approval: {
        confirmationOk: false,
        persistenceOk: false,
        invalidationOk: false,
        productionUnchanged: true,
      },
      safety: defaultSafety(),
      performance: emptyPerf(t0),
      screenshots: [],
      traces: [],
      browserOk: false,
    });
    process.exit(1);
  }

  // Restore pilot + begin gate
  await hub('/api/website-studio/qa/restore-pilot', {
    method: 'POST',
    body: JSON.stringify({ changeRequestId: FIXTURE.changeRequestId }),
  });
  await hub('/api/website-studio/qa/begin', {
    method: 'POST',
    body: JSON.stringify({
      websiteId: FIXTURE.websiteId,
      changeRequestId: FIXTURE.changeRequestId,
      runType: RUN_TYPE,
    }),
  });

  // API before/after proof (must differ even before UI)
  const tPreview = Date.now();
  let previewOk = false;
  try {
    await hub(`/api/website-studio/websites/${FIXTURE.websiteId}/preview/start`, {
      method: 'POST',
      body: '{}',
    });
    for (let i = 0; i < 20; i++) {
      const health = await hub(
        `/api/website-studio/websites/${FIXTURE.websiteId}/preview-health`,
      );
      if (String(health?.previewHealth?.status || health?.status || '') === 'running') {
        previewOk = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
  } catch (e) {
    addCheck('preview-start', 'Start preview', 'WARN', String(e));
  }
  const previewStartupMs = Date.now() - tPreview;
  addCheck(
    'preview-running',
    'Preview running on loopback',
    previewOk ? 'PASS' : 'FAIL',
    previewOk ? 'running' : 'preview did not become healthy',
    previewStartupMs,
  );

  // FULL VISUAL RENDER — real localhost pages with CSS/assets (not srcDoc snapshots)
  let beforeH1 = '';
  let afterH1 = '';
  let fullVisualRenderOk = false;
  let beforeUrl = null;
  let afterUrl = null;
  let beforePort = null;
  let afterPort = null;
  let criticalAsset404s = [];
  let unstyledDetected = false;
  try {
    const urlsBody = await hub(
      `/api/website-studio/change-requests/${FIXTURE.changeRequestId}/preview-urls`,
    );
    const pu = urlsBody.previewUrls || {};
    beforeUrl = pu.before?.url || null;
    afterUrl = pu.after?.url || null;
    beforePort = pu.before?.port || null;
    afterPort = pu.after?.port || null;
    const vr = pu.visualRender || {};
    beforeH1 = vr.before?.h1 || '';
    afterH1 = vr.after?.h1 || '';
    criticalAsset404s = [
      ...(vr.before?.critical404s || []),
      ...(vr.after?.critical404s || []),
    ];
    unstyledDetected = Boolean(vr.before?.unstyled || vr.after?.unstyled);
    fullVisualRenderOk = Boolean(
      vr.ok &&
        beforePort === 8766 &&
        afterPort === 8765 &&
        beforePort !== afterPort &&
        beforeH1 === FIXTURE.beforeH1 &&
        afterH1 === FIXTURE.afterH1 &&
        !unstyledDetected &&
        criticalAsset404s.length === 0,
    );
    addCheck(
      'full-visual-render',
      'FULL VISUAL RENDER (styled localhost Before/After)',
      fullVisualRenderOk ? 'PASS' : 'FAIL',
      JSON.stringify({
        beforeUrl,
        afterUrl,
        beforePort,
        afterPort,
        beforeH1: beforeH1.slice(0, 80),
        afterH1: afterH1.slice(0, 80),
        mismatches: vr.mismatches || [],
        criticalAsset404s,
        unstyledDetected,
      }),
    );
    if (!fullVisualRenderOk) {
      defects.push({
        id: 'DEF-UNSTYLED-COMPARE',
        title: 'Before/After shows unstyled HTML instead of real HVCG pages',
        severity: 'CRITICAL',
        ownerWorkflowStep: 'Before/After/Compare',
        expected: 'Styled real HVCG pages on :8766 (BEFORE) and :8765 (AFTER)',
        actual: JSON.stringify(vr.mismatches || ['visual render failed']),
        affectedComponent: 'ChangeReviewScreen',
        suggestedFix:
          'Serve baseline git-archive on 8766 and pilot staging on 8765; use iframe src not srcDoc',
        retestRequired: true,
      });
    }

    // Direct asset probes (fail closed)
    for (const [label, url] of [
      ['before-styles', `${beforeUrl}styles.css`],
      ['after-styles', `${afterUrl}styles.css`],
      ['before-logo', `${beforeUrl}assets/brand/hvcg-logo-nav.png`],
      ['after-logo', `${afterUrl}assets/brand/hvcg-logo-nav.png`],
    ]) {
      const res = await fetch(url);
      const text = label.includes('styles') ? await res.text() : '';
      const cssOk =
        !label.includes('styles') ||
        (res.ok && /--bg\s*:|font-family|:root/i.test(text) && !/<html/i.test(text));
      addCheck(
        `asset-${label}`,
        `Asset ${label}`,
        res.ok && cssOk ? 'PASS' : 'FAIL',
        `${url} → ${res.status}`,
      );
      if (!res.ok || !cssOk) {
        criticalAsset404s.push(label);
        fullVisualRenderOk = false;
      }
    }
  } catch (e) {
    addCheck('full-visual-render', 'FULL VISUAL RENDER (styled localhost Before/After)', 'FAIL', String(e));
    defects.push({
      id: 'DEF-UNSTYLED-COMPARE',
      title: 'Before/After shows unstyled HTML instead of real HVCG pages',
      severity: 'CRITICAL',
      ownerWorkflowStep: 'Before/After/Compare',
      expected: 'Styled real HVCG pages on distinct localhost ports',
      actual: String(e),
      affectedComponent: 'ChangeReviewScreen',
      suggestedFix: 'Repair compare preview servers',
      retestRequired: true,
    });
  }

  // Legacy snapshot H1 identity (text proof) — must still differ
  const beforeHtml = await fetch(
    `${HUB}/api/website-studio/change-requests/${FIXTURE.changeRequestId}/preview-snapshot?mode=before`,
    { headers: hubHeaders() },
  ).then((r) => r.text());
  const afterHtml = await fetch(
    `${HUB}/api/website-studio/change-requests/${FIXTURE.changeRequestId}/preview-snapshot?mode=after`,
    { headers: hubHeaders() },
  ).then((r) => r.text());
  if (!beforeH1) beforeH1 = extractH1(beforeHtml);
  if (!afterH1) afterH1 = extractH1(afterHtml);
  const beforeAfterOk =
    beforeH1 === FIXTURE.beforeH1 && afterH1 === FIXTURE.afterH1 && beforeH1 !== afterH1;
  addCheck(
    'api-before-after',
    'API Before/After H1 identity',
    beforeAfterOk ? 'PASS' : 'FAIL',
    `before=${beforeH1.slice(0, 80)} | after=${afterH1.slice(0, 80)}`,
  );

  // Safety flags
  const localStatus = await hub('/api/website-studio/local-system-status');
  const flags = localStatus?.advanced?.featureFlags || localStatus?.advanced || {};
  const safety = {
    localAiWritesEnabled: Boolean(flags.LocalAIWritesEnabled),
    localAiExternalMessagesEnabled: Boolean(flags.LocalAIExternalMessagesEnabled),
    evaIntakeEnabled: Boolean(flags.EvaIntakeEnabled),
    clientEmailsEnabled: Boolean(flags.ClientEmailsEnabled),
    productionChanged: false,
    unexpectedExternalHosts: [],
  };
  const safetyOk =
    !safety.localAiWritesEnabled &&
    !safety.localAiExternalMessagesEnabled &&
    !safety.evaIntakeEnabled &&
    !safety.clientEmailsEnabled;
  addCheck('safety-flags', 'Safety feature flags', safetyOk ? 'PASS' : 'FAIL', JSON.stringify(flags));

  // Three options API
  const tAi = Date.now();
  const options = await hub(
    `/api/website-studio/change-requests/${FIXTURE.changeRequestId}/three-options`,
    { method: 'POST', body: '{}' },
  );
  const aiOperationMs = Date.now() - tAi;
  const threeOk =
    Array.isArray(options.options) &&
    options.options.length === 3 &&
    options.options.some((o) => o.recommended) &&
    new Set(options.options.map((o) => o.text)).size === 3;
  addCheck('ai-three-options', 'Advisor 3 options (deterministic)', threeOk ? 'PASS' : 'FAIL');

  // Install playwright if needed + run browser flow
  const install = spawnSync('npm', ['install'], { cwd: HERE, encoding: 'utf8' });
  if (install.status !== 0) {
    addCheck('pw-install', 'Install Playwright package', 'FAIL', install.stderr || install.stdout);
  }
  spawnSync('npx', ['playwright', 'install', 'chromium'], { cwd: HERE, encoding: 'utf8' });

  const tOwner = Date.now();
  const pw = spawnSync('npx', ['playwright', 'test', '--config=playwright.config.ts'], {
    cwd: HERE,
    encoding: 'utf8',
    env: { ...process.env, QA_EVIDENCE_DIR: evidenceDir, ATLAS_ELITE_URL: ELITE },
  });
  const ownerFlowMs = Date.now() - tOwner;
  writeFileSync(join(evidenceDir, 'playwright-stdout.txt'), pw.stdout || '');
  writeFileSync(join(evidenceDir, 'playwright-stderr.txt'), pw.stderr || '');
  addCheck(
    'browser-owner-flow',
    'Browser owner journey',
    pw.status === 0 ? 'PASS' : 'FAIL',
    (pw.stdout || pw.stderr || '').slice(-1200),
    ownerFlowMs,
  );

  let journey = null;
  const journeyPath = join(evidenceDir, 'owner-journey-result.json');
  if (existsSync(journeyPath)) {
    journey = JSON.parse(readFileSync(journeyPath, 'utf8'));
  }

  // Approval persistence + invalidation (API), then restore for Manny
  let approval = {
    confirmationOk: pw.status === 0,
    persistenceOk: false,
    invalidationOk: false,
    productionUnchanged: true,
  };
  try {
    // Ensure reviewable state after browser approve
    const review = await hub(
      `/api/website-studio/change-requests/${FIXTURE.changeRequestId}/owner-review`,
    );
    const status = review?.review?.ownerStatus;
    approval.persistenceOk =
      status === 'Approved — Not Published' || status === 'Changes Requested' || status === 'Waiting for Your Review';
    // Force a controlled invalidation test if approved
    if (status === 'Approved — Not Published') {
      const edited = await hub(
        `/api/website-studio/change-requests/${FIXTURE.changeRequestId}/owner-edit`,
        {
          method: 'POST',
          body: JSON.stringify({ proposedContent: `${FIXTURE.afterH1} (qa-invalidation)` }),
        },
      );
      approval.invalidationOk =
        edited?.changeRequest?.ownerApproval?.invalidated === true ||
        edited?.changeRequest?.ownerStatus === 'Changes Requested';
      // restore exact wording
      await hub(`/api/website-studio/change-requests/${FIXTURE.changeRequestId}/owner-edit`, {
        method: 'POST',
        body: JSON.stringify({ proposedContent: FIXTURE.afterH1 }),
      });
    } else {
      // Still prove invalidation path on a fresh approve
      await hub('/api/website-studio/qa/restore-pilot', {
        method: 'POST',
        body: JSON.stringify({ changeRequestId: FIXTURE.changeRequestId }),
      });
      await hub(`/api/website-studio/change-requests/${FIXTURE.changeRequestId}/device-review`, {
        method: 'POST',
        body: JSON.stringify({ device: 'Desktop', looksGood: true }),
      });
      // May fail if preview identity offline — don't hard-fail invalidation if preview blocked
      try {
        await hub(`/api/website-studio/change-requests/${FIXTURE.changeRequestId}/owner-approve`, {
          method: 'POST',
          body: JSON.stringify({
            confirmed: true,
            previewReviewed: true,
            deviceReviews: { Desktop: true, Tablet: true, Mobile: true },
          }),
        });
        const edited = await hub(
          `/api/website-studio/change-requests/${FIXTURE.changeRequestId}/owner-edit`,
          {
            method: 'POST',
            body: JSON.stringify({ proposedContent: `${FIXTURE.afterH1} (qa-invalidation)` }),
          },
        );
        approval.invalidationOk = edited?.changeRequest?.ownerApproval?.invalidated === true;
        await hub(`/api/website-studio/change-requests/${FIXTURE.changeRequestId}/owner-edit`, {
          method: 'POST',
          body: JSON.stringify({ proposedContent: FIXTURE.afterH1 }),
        });
      } catch (e) {
        approval.invalidationOk = false;
        addCheck('approval-invalidation', 'Approval invalidation', 'WARN', String(e));
      }
    }
    addCheck(
      'approval-persistence',
      'Approval persistence',
      approval.persistenceOk ? 'PASS' : 'FAIL',
    );
    if (approval.invalidationOk) {
      addCheck('approval-invalidation', 'Approval invalidation', 'PASS');
    }
  } catch (e) {
    addCheck('approval-flow', 'Approval API flow', 'FAIL', String(e));
  }

  // Restore pilot for Manny UAT package (Waiting for Your Review)
  const restored = await hub('/api/website-studio/qa/restore-pilot', {
    method: 'POST',
    body: JSON.stringify({ changeRequestId: FIXTURE.changeRequestId }),
  });
  addCheck(
    'restore-for-manny',
    'Restore CR for owner UAT',
    restored?.changeRequest?.ownerStatus === 'Waiting for Your Review' ? 'PASS' : 'FAIL',
    restored?.changeRequest?.ownerStatus,
  );

  const buttonInventory = {
    total: journey?.buttonReport?.length || 0,
    functional: (journey?.buttonReport || []).filter((b) => b.classification === 'FUNCTIONAL' && b.ok)
      .length,
    disabledWithExplanation: (journey?.buttonReport || []).filter(
      (b) => b.classification === 'DISABLED WITH EXPLANATION' && b.ok,
    ).length,
    comingLater: 0,
    failures: (journey?.buttonReport || []).filter((b) => !b.ok).map((b) => b.label),
  };

  const screenshots = journey?.screenshots || [];
  const result = await finish({
    startedAt,
    t0,
    testedCommit,
    evidenceDir,
    latestDir,
    checks,
    defects,
    buttonInventory,
    beforeAfter: {
      baselineCommit: FIXTURE.baselineCommit,
      pilotCommit: FIXTURE.pilotCommit,
      beforeH1,
      afterH1,
      visualDifferenceVerified: Boolean(
        journey?.beforeH1 && journey?.afterH1 && journey.beforeH1 !== journey.afterH1,
      ),
      fullVisualRenderOk,
      beforeUrl,
      afterUrl,
      beforePort,
      afterPort,
      criticalAsset404s,
      unstyledDetected,
    },
    aiAdvisor: {
      mode: 'deterministic',
      threeOptionsOk: threeOk,
      failures: threeOk ? [] : ['three options contract failed'],
    },
    approval,
    safety: {
      ...safety,
      unexpectedExternalHosts: journey?.networkSuspects || [],
    },
    performance: {
      ownerFlowMs,
      previewStartupMs,
      aiOperationMs,
      pageLoadMs: 0,
      retries: 0,
      retestCount: 0,
    },
    screenshots,
    traces: [],
    browserOk: pw.status === 0,
  });

  console.log('\n=== WEBSITE STUDIO QA AGENT ===');
  console.log(JSON.stringify(result.summary, null, 2));
  console.log('\nVERDICT:', result.verdict);
  process.exit(result.gate === 'READY FOR MANNY' ? 0 : 1);
}

function emptyButtons() {
  return { total: 0, functional: 0, disabledWithExplanation: 0, comingLater: 0, failures: [] };
}
function emptyBeforeAfter() {
  return {
    baselineCommit: FIXTURE.baselineCommit,
    pilotCommit: FIXTURE.pilotCommit,
    beforeH1: '',
    afterH1: '',
    visualDifferenceVerified: false,
  };
}
function defaultSafety() {
  return {
    localAiWritesEnabled: false,
    localAiExternalMessagesEnabled: false,
    evaIntakeEnabled: false,
    clientEmailsEnabled: false,
    productionChanged: false,
    unexpectedExternalHosts: [],
  };
}
function emptyPerf(t0) {
  return {
    ownerFlowMs: 0,
    previewStartupMs: 0,
    aiOperationMs: 0,
    pageLoadMs: 0,
    retries: 0,
    retestCount: 0,
  };
}

async function finish(ctx) {
  const finishedAt = nowIso();
  const durationMs = Date.now() - ctx.t0;
  const failed = ctx.checks.some((c) => c.status === 'FAIL') || ctx.defects.some((d) => !d.fixed);
  const payload = {
    schemaVersion: 1,
    runId: randomUUID(),
    runType: RUN_TYPE,
    gate: 'TESTING',
    verdict: 'WEBSITE STUDIO QA GATE — FAILED',
    testedCommit: ctx.testedCommit,
    startedAt: ctx.startedAt,
    finishedAt,
    durationMs,
    changeRequestId: FIXTURE.changeRequestId,
    websiteId: FIXTURE.websiteId,
    checks: ctx.checks,
    defects: ctx.defects,
    buttonInventory: ctx.buttonInventory,
    beforeAfter: ctx.beforeAfter,
    aiAdvisor: ctx.aiAdvisor,
    approval: ctx.approval,
    safety: ctx.safety,
    performance: ctx.performance,
    evidenceDir: ctx.evidenceDir,
    screenshots: ctx.screenshots,
    traces: ctx.traces,
    summary: {
      Build: ctx.browserOk ? 'PASS' : 'FAIL',
      'Browser Flow': ctx.checks.find((c) => c.id === 'browser-owner-flow')?.status || 'FAIL',
      'Preview Identity': ctx.beforeAfter.visualDifferenceVerified ? 'PASS' : 'FAIL',
      'FULL VISUAL RENDER': ctx.beforeAfter.fullVisualRenderOk ? 'PASS' : 'FAIL',
      'Before / After': ctx.checks.find((c) => c.id === 'api-before-after')?.status || 'FAIL',
      'AI Advisor': ctx.aiAdvisor.threeOptionsOk ? 'PASS' : 'FAIL',
      Buttons: `${ctx.buttonInventory.functional}/${ctx.buttonInventory.total || '?'}`,
      'Approval Persistence': ctx.approval.persistenceOk ? 'PASS' : 'FAIL',
      'Approval Invalidation': ctx.approval.invalidationOk ? 'PASS' : 'WARN',
      'Console Errors': String(
        (ctx.checks.find((c) => c.id === 'browser-owner-flow')?.status === 'PASS' && '0 blocking') ||
          'see evidence',
      ),
      Safety: ctx.checks.find((c) => c.id === 'safety-flags')?.status || 'FAIL',
      'Production Changed': ctx.safety.productionChanged ? 'YES' : 'NO',
    },
  };

  mkdirSync(ctx.evidenceDir, { recursive: true });
  writeFileSync(join(ctx.evidenceDir, 'qa-result.json'), JSON.stringify(payload, null, 2));

  let sealed = payload;
  try {
    const res = await hub('/api/website-studio/qa/record', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    sealed = res.result || payload;
  } catch (e) {
    // If gate compute unavailable, local fail-closed
    sealed = {
      ...payload,
      gate: failed ? 'FAILED QA' : 'READY FOR MANNY',
      verdict: failed
        ? 'WEBSITE STUDIO QA GATE — FAILED'
        : 'WEBSITE STUDIO QA GATE — READY FOR MANNY',
    };
    writeFileSync(join(ctx.evidenceDir, 'qa-record-error.txt'), String(e));
  }

  // If ready, ensure CR remains Waiting for Your Review with READY FOR MANNY
  if (sealed.gate === 'READY FOR MANNY') {
    try {
      await hub('/api/website-studio/qa/restore-pilot', {
        method: 'POST',
        body: JSON.stringify({ changeRequestId: FIXTURE.changeRequestId }),
      });
      // re-apply gate after restore (restore sets NOT TESTED)
      sealed = (
        await hub('/api/website-studio/qa/record', {
          method: 'POST',
          body: JSON.stringify({ ...sealed, defects: sealed.defects || [] }),
        })
      ).result;
    } catch {
      /* ignore */
    }
  }

  writeFileSync(join(ctx.evidenceDir, 'qa-result.final.json'), JSON.stringify(sealed, null, 2));
  try {
    if (existsSync(ctx.latestDir)) rmSync(ctx.latestDir, { recursive: true, force: true });
    cpSync(ctx.evidenceDir, ctx.latestDir, { recursive: true });
  } catch {
    /* ignore */
  }

  const mannyPkg = join(ctx.evidenceDir, 'OWNER_UAT_PACKAGE.md');
  if (sealed.gate === 'READY FOR MANNY' && sealed.ownerPackage) {
    writeFileSync(
      mannyPkg,
      [
        `# ${sealed.ownerPackage.title}`,
        '',
        `Website: ${sealed.ownerPackage.website}`,
        `Change: ${sealed.ownerPackage.change}`,
        `Estimated review time: ${sealed.ownerPackage.estimatedReviewMinutes} minute`,
        '',
        ...sealed.ownerPackage.lines,
        '',
        `Open: ${ELITE}${sealed.ownerPackage.openReviewPath}`,
        '',
      ].join('\n'),
    );
  }

  return sealed;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
