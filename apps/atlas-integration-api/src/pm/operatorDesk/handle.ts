import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  isGitHubConfigured,
  isGoogleConfigured,
  isMicrosoftConfigured,
  type AppConfig,
} from '../../config.ts';
import { requirePrincipal } from '../../middleware/auth.ts';
import { resolveHubCommit } from '../../http/hubCommit.ts';
import { inspectFabricSyncHealth, isFabricSweepEnabled } from '../sharepoint/fabric/status.ts';
import type { IntegrationRepository } from '../../store/repository.ts';
import type { PmRepository } from '../repository.ts';
import { buildCommandCenter } from '../commandCenter.ts';
import { readDeskCommercialContext } from '../commercialContext/handle.ts';
import { canAccessOperatorDesk, entitledClientCodes } from '../sharepoint/authz.ts';
import { requestIndexedDocumentPreview } from '../sharepoint/fabric/documentPreview.ts';
import { createFabricGraphClient } from '../sharepoint/fabric/graph.ts';
import { buildSharePointCommandCenter } from '../sharepoint/http.ts';
import type { SharePointPmService } from '../sharepoint/repository.ts';
import { searchSharePointPm } from '../sharepoint/search.ts';
import { createManagedIdentityTokenProvider, GRAPH_TOKEN_RESOURCE } from '../sharepoint/token.ts';
import { renderOperatorDeskHtml, renderUnsignedOperatorDesk } from './html.ts';
import { listEntitledAttention, realClientsNeedingAttention } from '../sharepoint/attention.ts';
import { buildKnowledgeOperatingPicture } from '../sharepoint/knowledgeOperating.ts';
import { listOperatorClientJourneys } from '../../clientExperience/service.ts';
import { buildOperatorDeskModel, emptyHonestOperatingPicture, operatorOperatingPictureFromKnowledge } from './model.ts';
import {
  AGENT_ACTIVITY_CONTRACT,
  ASK_ATLAS_QUESTION,
  ASK_ATLAS_RUNTIME_AGENT,
  GET_CLIENT_CONTEXT_TOOL,
  clientContextMissionKey,
  isOperatorActivityLedgerPath,
  isOperatorClientContextPath,
  isOperatorDeskPath,
  isOperatorEngineeringMissionsPath,
  isOperatorEventsPath,
  isOperatorImprovementsPath,
  isOperatorRuntimePath,
  isOperatorSearchPath,
  isOperatorWorkflowsPath,
  wantsOperatorJson,
  type OperatorDeskModel,
} from './types.ts';
import { appendAskAtlasActivity, listVisibleAgentActivity } from './activityLedger.ts';
import {
  extractClientContextQuery,
  extractSearchAuthorizedQuery,
  isOwnerGatedQuestion,
  mapsToGetClientContext,
  mapsToSearchAuthorizedKnowledge,
  runAtlasClientContextRuntime,
  runAtlasHubRuntime,
  runAtlasSearchRuntime,
} from './agentRuntime.ts';
import { processAtlasEvent, resolveEventClass } from './eventProcessing.ts';
import {
  inspectEngineeringMissions,
  listPersistedEngineeringMissions,
  persistEngineeringMissionRecords,
} from './engineeringLoop.ts';
import {
  classifyImprovementPolicy,
  inspectProductImprovements,
  resolveInspectClass,
  type ProductImprovementInspectHealth,
} from './productImprovement.ts';
import {
  buildWorkflowAskAtlasAnswer,
  getWorkflowDetail,
  handleWorkflowControl,
  listWorkflowCenter,
  mapsToWorkflowQuestion,
  answerWorkflowQuestion,
} from './workflows.ts';
import {
  activateWorkflow,
  answerWorkflowDiscovery,
  buildConversationalAskAtlasAnswer,
  cancelWorkflowDraft,
  createWorkflowDraft,
  editWorkflowFromInstruction,
  mapsToConversationalWorkflowRuntime,
} from './workflowCreation.ts';
import {
  mapsToWorkflowCreationIntent,
  mapsToWorkflowEditIntent,
  mapsToWorkflowDiscoveryIntent,
} from './workflowParser.ts';
import { readWorkflowDefinitionOverlay, resolveWorkflowDefinitionOverlayDir } from './workflowDefinitions.ts';

export { isOperatorDeskPath };

function entitledProductResearchHealth(cfg: AppConfig): ProductImprovementInspectHealth {
  const fabric = inspectFabricSyncHealth(cfg.dataDir, {
    sweepEnabled: Boolean(cfg.pmBackend.sharepoint) && isFabricSweepEnabled(),
  });
  return {
    authRequired: cfg.requireAuth,
    insecureDevAuth: cfg.insecureDevAuth,
    providers: {
      microsoft: isMicrosoftConfigured(cfg),
      google: isGoogleConfigured(cfg),
      github: isGitHubConfigured(cfg) || Boolean(cfg.github.clientId),
    },
    fabricNotes: fabric.notes,
    fabricHonesty: fabric.honesty,
  };
}

function sendHtml(res: ServerResponse, status: number, body: string, origin?: string | null) {
  const headers: Record<string, string> = {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'x-atlas-operator-desk': 'v1',
  };
  if (status === 401) headers['www-authenticate'] = 'Bearer';
  if (origin) {
    headers['access-control-allow-origin'] = origin;
    headers['access-control-allow-credentials'] = 'true';
    headers['vary'] = 'Origin';
  }
  res.writeHead(status, headers);
  res.end(body);
}

function sendJson(res: ServerResponse, status: number, body: unknown, origin?: string | null) {
  const headers: Record<string, string> = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'x-atlas-operator-desk': 'v1',
  };
  if (status === 401) headers['www-authenticate'] = 'Bearer';
  if (origin) {
    headers['access-control-allow-origin'] = origin;
    headers['access-control-allow-credentials'] = 'true';
    headers['vary'] = 'Origin';
  }
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}

async function loadSharePointDesk(opts: {
  cfg: AppConfig;
  sharepoint: SharePointPmService;
  principal: Awaited<ReturnType<typeof requirePrincipal>>;
  searchQuery: string;
}): Promise<OperatorDeskModel> {
  const { sharepoint: service, principal, cfg } = opts;
  const [projects, tasks, leads, opportunities, knowledge] = await Promise.all([
    service.listAuthorizedProjects(principal),
    service.listAuthorizedTasks(principal),
    service.listAuthorizedLeads(principal),
    service.listAuthorizedOpportunities(principal),
    buildKnowledgeOperatingPicture(service, principal, {
      dataDir: cfg.dataDir,
    }),
  ]);
  const milestones = [];
  for (const project of projects) {
    milestones.push(...(await service.listAuthorizedMilestones(principal, project.id)));
  }
  const commandCenter = buildSharePointCommandCenter(projects, tasks, milestones, leads, opportunities);
  const commercialContext = readDeskCommercialContext({
    dataDir: cfg.dataDir,
    principal,
    opportunities,
    leads,
  });
  const q = opts.searchQuery.trim().slice(0, 120);
  const searchRan = q.length >= 2;
  const found = searchRan ? await searchSharePointPm(service, principal, q) : { results: [] };
  const entitled = entitledClientCodes(principal);
  const attention = listEntitledAttention(cfg.dataDir, entitled);
  return buildOperatorDeskModel({
    hubSha: resolveHubCommit(),
    entitledClients: entitled,
    commandCenter: commandCenter as unknown as Record<string, unknown>,
    commercialContext,
    searchQuery: q,
    searchRan,
    searchHits: found.results.map((hit) => ({
      id: hit.id,
      title: hit.title,
      kind: hit.kind,
      href: hit.href,
      clientCode: hit.clientCode,
      source: hit.source,
      webUrl: hit.webUrl,
      modifiedAt: hit.modifiedAt,
      provenance: hit.provenance,
    })),
    attentionItems: attention.map((row) => ({
      id: row.id,
      title: row.classification === 'SYNTHETIC_QA' ? `${row.title} (SYNTHETIC QA)` : row.title,
      href: row.href,
      kind: row.kind,
    })),
    realClientsNeedingAttention: realClientsNeedingAttention(attention).length,
    operatingPicture: operatorOperatingPictureFromKnowledge(knowledge),
    clientJourneys: listOperatorClientJourneys({
      dataDir: cfg.dataDir,
      entitledClientCodes: entitled,
      principal,
    }),
  });
}

function loadDevelopmentDesk(opts: {
  cfg: AppConfig;
  pm: PmRepository;
  repo: IntegrationRepository;
  principal: Awaited<ReturnType<typeof requirePrincipal>>;
  searchQuery: string;
}): OperatorDeskModel {
  const commandCenter = buildCommandCenter(opts.pm, opts.repo);
  const commercialContext = readDeskCommercialContext({
    dataDir: opts.cfg.dataDir,
    principal: opts.principal,
  });
  const q = opts.searchQuery.trim().slice(0, 120);
  return buildOperatorDeskModel({
    hubSha: resolveHubCommit(),
    entitledClients: entitledClientCodes(opts.principal),
    commandCenter: commandCenter as unknown as Record<string, unknown>,
    commercialContext,
    searchQuery: q,
    searchRan: q.length >= 2,
    searchHits: [],
    operatingPicture: emptyHonestOperatingPicture(),
    clientJourneys: listOperatorClientJourneys({
      dataDir: opts.cfg.dataDir,
      entitledClientCodes: entitledClientCodes(opts.principal),
      principal: opts.principal,
    }),
  });
}

async function readEventJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      const err = new Error('Request body must be a JSON object') as Error & { status: number; code: string };
      err.status = 400;
      err.code = 'malformed_json';
      throw err;
    }
    return parsed as Record<string, unknown>;
  } catch (err) {
    if ((err as { status?: number }).status === 400) throw err;
    const bad = new Error('Request body is not valid JSON') as Error & { status: number; code: string };
    bad.status = 400;
    bad.code = 'malformed_json';
    throw bad;
  }
}

export async function handleOperatorDesk(opts: {
  cfg: AppConfig;
  repo: IntegrationRepository;
  pm: PmRepository | null;
  sharepoint?: SharePointPmService | null;
  req: IncomingMessage;
  res: ServerResponse;
  method: string;
  path: string;
  origin?: string | null;
}): Promise<boolean> {
  if (!isOperatorDeskPath(opts.path)) return false;
  const eventsOnly = isOperatorEventsPath(opts.path);
  const improvementsOnly = isOperatorImprovementsPath(opts.path);
  const missionsOnly = isOperatorEngineeringMissionsPath(opts.path);
  const clientContextOnly = isOperatorClientContextPath(opts.path);
  const searchOnly = isOperatorSearchPath(opts.path);
  const workflowsOnly = isOperatorWorkflowsPath(opts.path);
  if (
    opts.method !== 'GET' &&
    opts.method !== 'HEAD' &&
    !((eventsOnly || improvementsOnly || missionsOnly || clientContextOnly || workflowsOnly) &&
      opts.method === 'POST')
  ) {
    sendJson(opts.res, 405, { error: 'method_not_allowed', code: 'method_not_allowed' }, opts.origin);
    return true;
  }

  const accept = typeof opts.req.headers.accept === 'string' ? opts.req.headers.accept : '';
  const ledgerOnly = isOperatorActivityLedgerPath(opts.path);
  const runtimeOnly = isOperatorRuntimePath(opts.path);
  const asJson =
    ledgerOnly ||
    runtimeOnly ||
    eventsOnly ||
    improvementsOnly ||
    missionsOnly ||
    clientContextOnly ||
    searchOnly ||
    workflowsOnly ||
    wantsOperatorJson(opts.path, accept);
  const url = new URL(opts.req.url || '/', `http://${opts.req.headers.host || 'local'}`);
  const searchQuery =
    runtimeOnly || eventsOnly || improvementsOnly || missionsOnly || clientContextOnly
      ? ''
      : url.searchParams.get('q') || '';

  let principal;
  try {
    principal = await requirePrincipal(opts.req, opts.cfg);
  } catch (err) {
    const status = (err as { status?: number }).status || 500;
    if (status === 401) {
      if (asJson) {
        sendJson(
          opts.res,
          401,
          {
            error: 'unauthorized',
            code: 'unauthorized',
            message: 'Microsoft sign-in required (Bearer token missing)',
          },
          opts.origin,
        );
      } else {
        sendHtml(opts.res, 401, renderUnsignedOperatorDesk(), opts.origin);
      }
      return true;
    }
    throw err;
  }

  if (!canAccessOperatorDesk(principal)) {
    if (asJson) {
      sendJson(
        opts.res,
        403,
        {
          error: 'forbidden',
          code: 'forbidden',
          message: 'Operator desk is restricted to HVCG internal staff.',
        },
        opts.origin,
      );
    } else {
      sendHtml(
        opts.res,
        403,
        '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Forbidden</title></head><body><p>Operator desk is restricted to HVCG internal staff.</p></body></html>',
        opts.origin,
      );
    }
    return true;
  }

  if (ledgerOnly) {
    try {
      const entries = listVisibleAgentActivity({
        dataDir: opts.cfg.dataDir,
        principal,
      });
      sendJson(
        opts.res,
        200,
        {
          agentActivity: {
            contractVersion: AGENT_ACTIVITY_CONTRACT,
            entitled: true,
            entries,
          },
        },
        opts.origin,
      );
    } catch {
      sendJson(
        opts.res,
        503,
        { error: 'overlay_unavailable', code: 'overlay_unavailable' },
        opts.origin,
      );
    }
    return true;
  }

  if (workflowsOnly) {
    const url = new URL(opts.req.url || '/', `http://${opts.req.headers.host || 'local'}`);
    if (opts.method === 'POST') {
      let body: {
        action?: string;
        workflowId?: string;
        reason?: string;
        instruction?: string;
        approveAuthority?: boolean;
      } = {};
      try {
        const chunks: Buffer[] = [];
        for await (const chunk of opts.req) chunks.push(chunk as Buffer);
        const text = Buffer.concat(chunks).toString('utf8').trim();
        if (text) body = JSON.parse(text) as typeof body;
      } catch {
        sendJson(opts.res, 400, { error: 'invalid_json', code: 'invalid_json' }, opts.origin);
        return true;
      }
      const action = body.action?.trim();

      if (action === 'create_draft' && body.instruction?.trim()) {
        const result = await createWorkflowDraft({
          cfg: opts.cfg,
          principal,
          dataDir: opts.cfg.dataDir,
          instruction: body.instruction.trim(),
        });
        if (!result.ok) {
          sendJson(opts.res, 400, { error: result.error, code: result.error }, opts.origin);
          return true;
        }
        const askAtlas = buildConversationalAskAtlasAnswer({
          question: body.instruction.trim(),
          previewText: result.payload.preview,
          workflowId: result.payload.record.workflowId,
          workflowName: result.payload.record.name,
          clientCode: result.payload.record.scope.clientCode,
        });
        try {
          await appendAskAtlasActivity({ dataDir: opts.cfg.dataDir, answer: askAtlas, principal });
        } catch {
          /* optional */
        }
        sendJson(
          opts.res,
          200,
          { workflowDraft: result.payload, operatorDesk: { askAtlas } },
          opts.origin,
        );
        return true;
      }

      if (action === 'activate' && body.workflowId?.trim()) {
        const result = await activateWorkflow({
          cfg: opts.cfg,
          principal,
          dataDir: opts.cfg.dataDir,
          workflowId: body.workflowId.trim(),
          approveAuthority: Boolean(body.approveAuthority),
        });
        if (!result.ok) {
          const status = result.error === 'authority_approval_required' ? 403 : 400;
          sendJson(opts.res, status, { error: result.error, code: result.error }, opts.origin);
          return true;
        }
        const detail = getWorkflowDetail({
          cfg: opts.cfg,
          principal,
          dataDir: opts.cfg.dataDir,
          workflowId: result.record.workflowId,
        });
        sendJson(
          opts.res,
          200,
          { workflowCenter: { activated: result.record, detail } },
          opts.origin,
        );
        return true;
      }

      if (action === 'edit_draft' && body.instruction?.trim()) {
        const result = await editWorkflowFromInstruction({
          cfg: opts.cfg,
          principal,
          dataDir: opts.cfg.dataDir,
          instruction: body.instruction.trim(),
          workflowId: body.workflowId?.trim(),
        });
        if (!result.ok) {
          sendJson(opts.res, 400, { error: result.error, code: result.error }, opts.origin);
          return true;
        }
        sendJson(opts.res, 200, { workflowDraft: result.payload }, opts.origin);
        return true;
      }

      if (action === 'cancel' && body.workflowId?.trim()) {
        const result = await cancelWorkflowDraft({
          principal,
          dataDir: opts.cfg.dataDir,
          workflowId: body.workflowId.trim(),
        });
        if (!result.ok) {
          sendJson(opts.res, 400, { error: result.error, code: result.error }, opts.origin);
          return true;
        }
        sendJson(opts.res, 200, { workflowCenter: { cancelled: result.record } }, opts.origin);
        return true;
      }

      const workflowId = body.workflowId?.trim();
      if (!workflowId || !action || !['pause', 'resume', 'disable', 'retry'].includes(action)) {
        sendJson(opts.res, 400, { error: 'invalid_workflow_control', code: 'invalid_workflow_control' }, opts.origin);
        return true;
      }
      const result = await handleWorkflowControl({
        cfg: opts.cfg,
        principal,
        workflowId,
        action: action as 'pause' | 'resume' | 'disable' | 'retry',
        reason: body.reason,
      });
      if (!result.ok) {
        sendJson(opts.res, 403, { error: result.error, code: result.error }, opts.origin);
        return true;
      }
      sendJson(
        opts.res,
        200,
        { workflowCenter: { control: result.control, workflow: result.workflow } },
        opts.origin,
      );
      return true;
    }

    const workflowId = url.searchParams.get('workflowId')?.trim();
    try {
      if (workflowId) {
        const detail = getWorkflowDetail({
          cfg: opts.cfg,
          principal,
          dataDir: opts.cfg.dataDir,
          workflowId,
        });
        if (!detail) {
          sendJson(opts.res, 404, { error: 'workflow_not_found', code: 'workflow_not_found' }, opts.origin);
          return true;
        }
        sendJson(opts.res, 200, { workflowCenter: { detail } }, opts.origin);
        return true;
      }
      const center = listWorkflowCenter({
        cfg: opts.cfg,
        principal,
        dataDir: opts.cfg.dataDir,
      });
      sendJson(opts.res, 200, { workflowCenter: center }, opts.origin);
    } catch {
      sendJson(opts.res, 503, { error: 'workflow_center_unavailable', code: 'workflow_center_unavailable' }, opts.origin);
    }
    return true;
  }

  const model =
    opts.cfg.pmBackend.mode === 'sharepoint' && opts.sharepoint
      ? await loadSharePointDesk({
          cfg: opts.cfg,
          sharepoint: opts.sharepoint,
          principal,
          searchQuery,
        })
      : opts.pm
        ? loadDevelopmentDesk({
            cfg: opts.cfg,
            pm: opts.pm,
            repo: opts.repo,
            principal,
            searchQuery,
          })
        : null;

  if (!model) {
    sendJson(
      opts.res,
      503,
      { error: 'pm_backend_unavailable', code: 'pm_backend_unavailable' },
      opts.origin,
    );
    return true;
  }

  const entitledSearch =
    opts.cfg.pmBackend.mode === 'sharepoint' && opts.sharepoint
      ? (query: string) => searchSharePointPm(opts.sharepoint!, principal, query)
      : undefined;
  const requestDocumentPreview =
    opts.cfg.pmBackend.mode === 'sharepoint' && opts.cfg.pmBackend.sharepoint
      ? (() => {
          const tokenProvider =
            opts.cfg.pmTokenProvider ||
            createManagedIdentityTokenProvider(opts.cfg.pmBackend.sharepoint?.managedIdentityClientId || '', {
              resource: GRAPH_TOKEN_RESOURCE,
            });
          const fabric = createFabricGraphClient(tokenProvider);
          return (ref: { driveId: string; itemId: string }) => requestIndexedDocumentPreview(fabric, ref);
        })()
      : undefined;

  if (runtimeOnly) {
    const question = (url.searchParams.get('question') || ASK_ATLAS_QUESTION).trim() || ASK_ATLAS_QUESTION;

    if (mapsToConversationalWorkflowRuntime(question)) {
      const defOverlayDir = resolveWorkflowDefinitionOverlayDir(opts.cfg.dataDir);
      const defOverlay = readWorkflowDefinitionOverlay(defOverlayDir);
      const center = listWorkflowCenter({
        cfg: opts.cfg,
        principal,
        dataDir: opts.cfg.dataDir,
      });

      if (mapsToWorkflowDiscoveryIntent(question)) {
        const discoveryAnswer = answerWorkflowDiscovery(question, defOverlay, principal, center);
        const askAtlas = buildConversationalAskAtlasAnswer({
          question,
          previewText: discoveryAnswer,
          workflowId: 'discovery',
          workflowName: 'Workflow discovery',
        });
        if (opts.method === 'GET') {
          try {
            await appendAskAtlasActivity({ dataDir: opts.cfg.dataDir, answer: askAtlas, principal });
          } catch {
            /* optional */
          }
        }
        sendJson(
          opts.res,
          200,
          {
            operatorDesk: { askAtlas },
            workflowAnswer: discoveryAnswer,
            runtime: {
              agent: ASK_ATLAS_RUNTIME_AGENT,
              toolsInvoked: ['workflow_discovery'],
              policyClass: 'READ_AUTO',
              missionKey: 'ATLAS-CONVERSATIONAL-WORKFLOW-CREATION-001',
            },
          },
          opts.origin,
        );
        return true;
      }

      if (mapsToWorkflowEditIntent(question)) {
        const editResult = await editWorkflowFromInstruction({
          cfg: opts.cfg,
          principal,
          dataDir: opts.cfg.dataDir,
          instruction: question,
        });
        if (!editResult.ok) {
          sendJson(opts.res, 400, { error: editResult.error, code: editResult.error }, opts.origin);
          return true;
        }
        const askAtlas = buildConversationalAskAtlasAnswer({
          question,
          previewText: editResult.payload.preview,
          workflowId: editResult.payload.record.workflowId,
          workflowName: editResult.payload.record.name,
          clientCode: editResult.payload.record.scope.clientCode,
        });
        if (opts.method === 'GET') {
          try {
            await appendAskAtlasActivity({ dataDir: opts.cfg.dataDir, answer: askAtlas, principal });
          } catch {
            /* optional */
          }
        }
        sendJson(
          opts.res,
          200,
          {
            operatorDesk: { askAtlas },
            workflowDraft: editResult.payload,
            workflowAnswer: editResult.payload.preview,
            runtime: {
              agent: ASK_ATLAS_RUNTIME_AGENT,
              toolsInvoked: ['workflow_edit'],
              policyClass: 'READ_AUTO',
              missionKey: 'ATLAS-CONVERSATIONAL-WORKFLOW-CREATION-001',
            },
          },
          opts.origin,
        );
        return true;
      }

      if (mapsToWorkflowCreationIntent(question)) {
        const draftResult = await createWorkflowDraft({
          cfg: opts.cfg,
          principal,
          dataDir: opts.cfg.dataDir,
          instruction: question,
        });
        if (!draftResult.ok) {
          sendJson(opts.res, 400, { error: draftResult.error, code: draftResult.error }, opts.origin);
          return true;
        }
        const askAtlas = buildConversationalAskAtlasAnswer({
          question,
          previewText: draftResult.payload.preview,
          workflowId: draftResult.payload.record.workflowId,
          workflowName: draftResult.payload.record.name,
          clientCode: draftResult.payload.record.scope.clientCode,
        });
        if (opts.method === 'GET') {
          try {
            await appendAskAtlasActivity({ dataDir: opts.cfg.dataDir, answer: askAtlas, principal });
          } catch {
            /* optional */
          }
        }
        sendJson(
          opts.res,
          200,
          {
            operatorDesk: { askAtlas },
            workflowDraft: draftResult.payload,
            workflowAnswer: `Workflow drafted.\n\n${draftResult.payload.preview}`,
            runtime: {
              agent: ASK_ATLAS_RUNTIME_AGENT,
              toolsInvoked: ['workflow_definition', 'workflow_preview'],
              policyClass: 'READ_AUTO',
              missionKey: 'ATLAS-CONVERSATIONAL-WORKFLOW-CREATION-001',
            },
          },
          opts.origin,
        );
        return true;
      }
    }

    if (mapsToWorkflowQuestion(question)) {
      const center = listWorkflowCenter({
        cfg: opts.cfg,
        principal,
        dataDir: opts.cfg.dataDir,
      });
      const askAtlas = buildWorkflowAskAtlasAnswer({ question, center });
      const workflowAnswer = answerWorkflowQuestion(question, center);
      if (opts.method === 'GET') {
        try {
          await appendAskAtlasActivity({
            dataDir: opts.cfg.dataDir,
            answer: askAtlas,
            principal,
          });
        } catch {
          /* overlay write optional */
        }
      }
      sendJson(
        opts.res,
        200,
        {
          operatorDesk: { askAtlas },
          runtime: {
            agent: ASK_ATLAS_RUNTIME_AGENT,
            toolsInvoked: ['workflow_center'],
            policyClass: 'READ_AUTO',
            missionKey: 'ATLAS-WORKFLOW-CENTER-001',
          },
          workflowAnswer,
          workflowCenter: { counts: center.counts },
        },
        opts.origin,
      );
      return true;
    }
    const result = mapsToSearchAuthorizedKnowledge(question)
      ? await runAtlasSearchRuntime({
          principal,
          picture: model.operatingPicture,
          question,
          deskSearch: model.search,
          entitledSearch,
          requestDocumentPreview,
        })
      : mapsToGetClientContext(question)
        ? await runAtlasClientContextRuntime({
            principal,
            picture: model.operatingPicture,
            question,
            deskSearch: model.search,
            entitledSearch,
          })
        : runAtlasHubRuntime({
            principal,
            picture: model.operatingPicture,
            question,
            deskSearch: model.search,
          });
    if (opts.method === 'GET') {
      try {
        await appendAskAtlasActivity({
          dataDir: opts.cfg.dataDir,
          answer: result.askAtlas,
          principal,
        });
      } catch {
        /* Runtime answer stays request-scoped if overlay write fails. Do not leak. */
      }
    }
    sendJson(
      opts.res,
      200,
      {
        operatorDesk: { askAtlas: result.askAtlas },
        runtime: result.runtime,
        ...(result.clientContext ? { clientContext: result.clientContext } : {}),
        ...(result.authorizedSearch ? { authorizedSearch: result.authorizedSearch } : {}),
      },
      opts.origin,
    );
    return true;
  }

  if (searchOnly) {
    const queryQ = (url.searchParams.get('q') || '').trim();
    const queryQuestion = (url.searchParams.get('question') || '').trim();
    const question = queryQuestion || (queryQ ? `Search ${queryQ}` : '');
    const result = await runAtlasSearchRuntime({
      principal,
      picture: model.operatingPicture,
      question,
      searchQuery: queryQ || extractSearchAuthorizedQuery(question) || '',
      deskSearch: model.search,
      entitledSearch,
      requestDocumentPreview,
    });
    if (opts.method === 'GET') {
      try {
        await appendAskAtlasActivity({
          dataDir: opts.cfg.dataDir,
          answer: result.askAtlas,
          principal,
        });
      } catch {
        /* Search answer stays request-scoped if overlay write fails. Do not leak. */
      }
    }
    sendJson(
      opts.res,
      200,
      {
        ...(result.authorizedSearch ? { authorizedSearch: result.authorizedSearch } : {}),
        operatorDesk: { askAtlas: result.askAtlas },
        runtime: result.runtime,
      },
      opts.origin,
    );
    return true;
  }

  if (clientContextOnly) {
    let postedClient = '';
    let postedQuestion = '';
    if (opts.method === 'POST') {
      try {
        const body = await readEventJson(opts.req);
        postedClient =
          typeof body.clientCode === 'string'
            ? body.clientCode
            : typeof body.client === 'string'
              ? body.client
              : '';
        postedQuestion = typeof body.question === 'string' ? body.question : '';
      } catch (err) {
        const status = (err as { status?: number }).status || 400;
        sendJson(
          opts.res,
          status,
          { error: 'malformed_json', code: 'malformed_json' },
          opts.origin,
        );
        return true;
      }
    }
    const queryClient = url.searchParams.get('client') || url.searchParams.get('clientCode') || '';
    const queryQuestion = url.searchParams.get('question') || '';
    const requestedClient = (postedClient || queryClient).trim();
    const requestedQuestion = (postedQuestion || queryQuestion).trim();
    const ownerGated = requestedQuestion ? isOwnerGatedQuestion(requestedQuestion) : false;
    const fromQuestion = !ownerGated && requestedQuestion ? extractClientContextQuery(requestedQuestion) : null;
    const invoked = ownerGated
      ? {
          askAtlas: runAtlasHubRuntime({
            principal,
            picture: model.operatingPicture,
            question: requestedQuestion,
          }).askAtlas,
          clientContext: undefined,
        }
      : await runAtlasClientContextRuntime({
          principal,
          picture: model.operatingPicture,
          question: requestedQuestion,
          clientCode: requestedClient,
          clientQuery: requestedClient || fromQuestion || '',
          deskSearch: model.search,
          entitledSearch,
        });
    const tools = ownerGated
      ? []
      : invoked.askAtlas.activity.tools.includes(GET_CLIENT_CONTEXT_TOOL)
        ? [...invoked.askAtlas.activity.tools]
        : [...invoked.askAtlas.activity.tools, GET_CLIENT_CONTEXT_TOOL];
    const recoveredMissionKey = clientContextMissionKey(invoked.clientContext);
    const askAtlas = ownerGated
      ? invoked.askAtlas
      : {
          ...invoked.askAtlas,
          invented: false as const,
          activity: {
            ...invoked.askAtlas.activity,
            agent: ASK_ATLAS_RUNTIME_AGENT,
            missionKey: recoveredMissionKey,
            trigger: 'signed_operator_question' as const,
            tools,
          },
        };
    if (opts.method === 'GET' || opts.method === 'POST') {
      try {
        await appendAskAtlasActivity({
          dataDir: opts.cfg.dataDir,
          answer: askAtlas,
          principal,
        });
      } catch {
        /* Client-context answer stays request-scoped if overlay write fails. Do not leak. */
      }
    }
    sendJson(
      opts.res,
      200,
      {
        ...(invoked.clientContext ? { clientContext: invoked.clientContext } : {}),
        operatorDesk: { askAtlas },
        runtime: {
          agent: ASK_ATLAS_RUNTIME_AGENT,
          toolsInvoked: ownerGated ? [] : [GET_CLIENT_CONTEXT_TOOL],
          policyClass: 'READ_AUTO',
          missionKey: ownerGated ? askAtlas.activity.missionKey : recoveredMissionKey,
        },
      },
      opts.origin,
    );
    return true;
  }

  if (eventsOnly) {
    let postedClass = '';
    if (opts.method === 'POST') {
      try {
        const body = await readEventJson(opts.req);
        postedClass = typeof body.eventClass === 'string' ? body.eventClass : typeof body.event === 'string' ? body.event : '';
      } catch (err) {
        const status = (err as { status?: number }).status || 400;
        sendJson(
          opts.res,
          status,
          { error: 'malformed_json', code: 'malformed_json' },
          opts.origin,
        );
        return true;
      }
    }
    const queryClass = url.searchParams.get('event') || url.searchParams.get('eventClass') || '';
    const rawClass = postedClass || queryClass;
    const eventClass = rawClass.trim() ? resolveEventClass(rawClass) : 'scheduled_sweep';
    const result = processAtlasEvent({
      principal,
      picture: model.operatingPicture,
      eventClass,
      trigger: eventClass === 'scheduled_sweep' && !rawClass.trim() ? 'scheduled_sweep' : undefined,
    });
    if (opts.method === 'GET' || opts.method === 'POST') {
      try {
        await appendAskAtlasActivity({
          dataDir: opts.cfg.dataDir,
          answer: result.askAtlas,
          principal,
        });
      } catch {
        /* Event answer stays request-scoped if overlay write fails. Do not leak. */
      }
    }
    sendJson(
      opts.res,
      200,
      {
        eventProcessing: result.eventProcessing,
        operatorDesk: { askAtlas: result.askAtlas },
        runtime: result.runtime,
      },
      opts.origin,
    );
    return true;
  }

  if (improvementsOnly) {
    let postedClass = '';
    if (opts.method === 'POST') {
      try {
        const body = await readEventJson(opts.req);
        postedClass =
          typeof body.inspectClass === 'string'
            ? body.inspectClass
            : typeof body.inspect === 'string'
              ? body.inspect
              : typeof body.class === 'string'
                ? body.class
                : '';
      } catch (err) {
        const status = (err as { status?: number }).status || 400;
        sendJson(
          opts.res,
          status,
          { error: 'malformed_json', code: 'malformed_json' },
          opts.origin,
        );
        return true;
      }
    }
    const queryClass =
      url.searchParams.get('inspect') ||
      url.searchParams.get('inspectClass') ||
      url.searchParams.get('class') ||
      '';
    const rawClass = postedClass || queryClass;
    const inspectClass = rawClass.trim() ? resolveInspectClass(rawClass) : 'inspect';
    const policy = classifyImprovementPolicy(inspectClass, principal);
    let ledger: ReturnType<typeof listVisibleAgentActivity> = [];
    if (policy.allowed) {
      try {
        ledger = listVisibleAgentActivity({
          dataDir: opts.cfg.dataDir,
          principal,
        });
      } catch {
        ledger = [];
      }
    }
    const result = inspectProductImprovements({
      principal,
      picture: model.operatingPicture,
      ledger: policy.allowed ? ledger : [],
      search: policy.allowed ? { ran: model.search.ran } : undefined,
      health: policy.allowed ? entitledProductResearchHealth(opts.cfg) : undefined,
      inspectClass,
    });
    if (opts.method === 'GET' || opts.method === 'POST') {
      try {
        await appendAskAtlasActivity({
          dataDir: opts.cfg.dataDir,
          answer: result.askAtlas,
          principal,
        });
      } catch {
        /* Improvement answer stays request-scoped if overlay write fails. Do not leak. */
      }
    }
    sendJson(
      opts.res,
      200,
      {
        productImprovement: result.productImprovement,
        operatorDesk: { askAtlas: result.askAtlas },
        runtime: result.runtime,
      },
      opts.origin,
    );
    return true;
  }

  if (missionsOnly) {
    let postedClass = '';
    if (opts.method === 'POST') {
      try {
        const body = await readEventJson(opts.req);
        postedClass =
          typeof body.inspectClass === 'string'
            ? body.inspectClass
            : typeof body.inspect === 'string'
              ? body.inspect
              : typeof body.class === 'string'
                ? body.class
                : '';
      } catch (err) {
        const status = (err as { status?: number }).status || 400;
        sendJson(
          opts.res,
          status,
          { error: 'malformed_json', code: 'malformed_json' },
          opts.origin,
        );
        return true;
      }
    }
    const queryClass =
      url.searchParams.get('inspect') ||
      url.searchParams.get('inspectClass') ||
      url.searchParams.get('class') ||
      '';
    const rawClass = postedClass || queryClass;
    const inspectClass = rawClass.trim() ? resolveInspectClass(rawClass) : 'inspect';
    const policy = classifyImprovementPolicy(inspectClass, principal);
    const hvsBlocked = model.operatingPicture.hvsDataAccess === 'BLOCKED';
    let ledger: ReturnType<typeof listVisibleAgentActivity> = [];
    let persisted: ReturnType<typeof listPersistedEngineeringMissions> = [];
    if (policy.allowed && !hvsBlocked) {
      try {
        ledger = listVisibleAgentActivity({
          dataDir: opts.cfg.dataDir,
          principal,
        });
      } catch {
        ledger = [];
      }
      try {
        persisted = listPersistedEngineeringMissions({
          dataDir: opts.cfg.dataDir,
        });
      } catch {
        persisted = [];
      }
    }
    const result = inspectEngineeringMissions({
      principal,
      picture: model.operatingPicture,
      ledger: policy.allowed && !hvsBlocked ? ledger : [],
      search: policy.allowed && !hvsBlocked ? { ran: model.search.ran } : undefined,
      health: policy.allowed && !hvsBlocked ? entitledProductResearchHealth(opts.cfg) : undefined,
      inspectClass,
      persisted: policy.allowed && !hvsBlocked ? persisted : [],
    });
    if ((opts.method === 'GET' || opts.method === 'POST') && result.recordsToPersist.length) {
      try {
        await persistEngineeringMissionRecords({
          dataDir: opts.cfg.dataDir,
          records: result.recordsToPersist,
        });
      } catch {
        /* Persist stays request-scoped if overlay write fails. Do not leak. */
      }
    }
    if (opts.method === 'GET' || opts.method === 'POST') {
      try {
        await appendAskAtlasActivity({
          dataDir: opts.cfg.dataDir,
          answer: result.askAtlas,
          principal,
        });
      } catch {
        /* Loop answer stays request-scoped if overlay write fails. Do not leak. */
      }
    }
    sendJson(
      opts.res,
      200,
      {
        engineeringMission: result.engineeringMission,
        operatorDesk: { askAtlas: result.askAtlas },
        runtime: result.runtime,
      },
      opts.origin,
    );
    return true;
  }

  if (opts.method === 'GET') {
    try {
      await appendAskAtlasActivity({
        dataDir: opts.cfg.dataDir,
        answer: model.askAtlas,
        principal,
      });
    } catch {
      /* Desk answer stays request-scoped if overlay write fails. Do not leak. */
    }
  }

  if (asJson) {
    sendJson(opts.res, 200, { operatorDesk: model }, opts.origin);
    return true;
  }
  sendHtml(opts.res, 200, renderOperatorDeskHtml(model), opts.origin);
  return true;
}
