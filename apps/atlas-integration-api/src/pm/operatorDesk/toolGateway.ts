/**
 * Governed READ_AUTO tool gateway for the existing Atlas operator desk.
 *
 * Exposes get_attention_items (READ_AUTO) and create_engineering_mission
 * (PROPOSE_AUTO / SAFE_INTERNAL_WRITE only). Wraps buildAskAtlasAnswer / the
 * entitled operator picture already built by handleOperatorDesk. Does not
 * re-query raw admin Graph. No OWNER_GATED tools. create_engineering_mission
 * does not dispatch V4, deploy, merge, or execute code changes.
 */

import type { AtlasPrincipal } from '../../middleware/auth.ts';
import { canAccessOperatorDesk, entitledClientCodes } from '../sharepoint/authz.ts';
import { buildAskAtlasAnswer } from './askAtlas.ts';
import {
  ASK_ATLAS_MISSION_KEY,
  ASK_ATLAS_OPERATOR_AGENT,
  ASK_ATLAS_PII_MISSION_KEY,
  ASK_ATLAS_QUESTION,
  ASK_ATLAS_RANKING,
  ASK_ATLAS_RUNTIME_AGENT,
  CREATE_ENGINEERING_MISSION_TOOL,
  GET_ATTENTION_ITEMS_TOOL,
  type AskAtlasAnswer,
  type AskAtlasClassification,
  type OperatorOperatingPicture,
  type ProductImprovementEvidenceClass,
  type ProposedEngineeringMission,
} from './types.ts';

export const READ_AUTO_TOOL_NAMES = [GET_ATTENTION_ITEMS_TOOL] as const;
export type ReadAutoToolName = (typeof READ_AUTO_TOOL_NAMES)[number];
export const TOOL_GATEWAY_POLICY_CLASS = 'READ_AUTO' as const;
export const PROPOSE_AUTO_TOOL_NAMES = [CREATE_ENGINEERING_MISSION_TOOL] as const;
export type ProposeAutoToolName = (typeof PROPOSE_AUTO_TOOL_NAMES)[number];
export const TOOL_GATEWAY_PROPOSE_POLICY_CLASS = 'PROPOSE_AUTO' as const;

export interface ToolGatewayContext {
  principal: AtlasPrincipal;
  picture: OperatorOperatingPicture;
  now?: string;
}

function honestEmptyAnswer(opts?: { now?: string; tools?: string[] }): AskAtlasAnswer {
  return {
    kind: 'ask_atlas_attention_v1',
    question: ASK_ATLAS_QUESTION,
    invented: false,
    honestEmpty: true,
    ranking: [...ASK_ATLAS_RANKING],
    items: [],
    activity: {
      agent: ASK_ATLAS_OPERATOR_AGENT,
      missionKey: ASK_ATLAS_MISSION_KEY,
      trigger: 'operator_operating_picture',
      timestamp: opts?.now || new Date().toISOString(),
      tools: opts?.tools ? [...opts.tools] : [],
      classification: 'HONEST_EMPTY',
      result: 'honest_empty',
      readWriteStatus: 'READ_AUTO',
      policyDecision: 'honest_empty',
    },
  };
}

/**
 * READ_AUTO tool. Authorization (desk principal + entitledClientCodes) is
 * resolved before buildAskAtlasAnswer runs. The picture must already be the
 * entitled operator operating picture from the existing desk loaders.
 */
export function getAttentionItems(ctx: ToolGatewayContext): AskAtlasAnswer {
  if (!canAccessOperatorDesk(ctx.principal)) {
    return honestEmptyAnswer({ now: ctx.now, tools: [GET_ATTENTION_ITEMS_TOOL] });
  }
  entitledClientCodes(ctx.principal);
  const answer = buildAskAtlasAnswer(ctx.picture, { now: ctx.now });
  return {
    ...answer,
    activity: {
      ...answer.activity,
      tools: [...answer.activity.tools, GET_ATTENTION_ITEMS_TOOL],
    },
  };
}

export function invokeReadAutoTool(tool: string, ctx: ToolGatewayContext): AskAtlasAnswer {
  if (tool === GET_ATTENTION_ITEMS_TOOL) {
    return getAttentionItems(ctx);
  }
  return honestEmptyAnswer({ now: ctx.now, tools: [] });
}

function neverPromote(value: AskAtlasClassification): AskAtlasClassification {
  if (value === 'CONFIRMED' || value === 'LIKELY' || value === 'PROPOSED') {
    return value;
  }
  return 'PROPOSED';
}

/**
 * PROPOSE_AUTO / SAFE_INTERNAL_WRITE only. Builds a visibly non-authoritative
 * proposed engineering mission from already-detected entitled evidence.
 * Does not dispatch V4, deploy, merge, execute code changes, or reach
 * OWNER_GATED actions.
 */
export function createEngineeringMission(opts: {
  why: string;
  basedOn: string;
  evidenceClass: ProductImprovementEvidenceClass;
  classification: AskAtlasClassification;
}): ProposedEngineeringMission {
  return {
    kind: 'proposed_engineering_mission_v1',
    authoritative: false,
    invented: false,
    status: 'PROPOSED',
    policyClass: 'PROPOSE_AUTO',
    readWriteStatus: 'SAFE_INTERNAL_WRITE',
    agent: ASK_ATLAS_RUNTIME_AGENT,
    missionKey: ASK_ATLAS_PII_MISSION_KEY,
    why: opts.why,
    basedOn: opts.basedOn,
    evidenceClass: opts.evidenceClass,
    classification: neverPromote(opts.classification),
    dispatchesV4: false,
    deploys: false,
    merges: false,
    executesCodeChanges: false,
    ownerGated: false,
  };
}
