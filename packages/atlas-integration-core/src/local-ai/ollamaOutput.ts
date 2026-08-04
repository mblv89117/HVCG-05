/**
 * Phase 2 structured Ollama output contract.
 */

import {
  CONFIGURABLE_OWNERS,
  type ConfigurableOwner,
  isConfigurableOwner,
} from './ownership.ts';
import { WORK_VALUE_TIERS, type WorkValueTier } from './workValue.ts';
import { isPhase2AllowedOperation } from './allowedOperations.ts';
import { SYNTHETIC_AI_OUTPUT_BANNER } from './decisionPackage.ts';

export const OLLAMA_OUTPUT_SCHEMA_VERSION = '1.0.0-phase2';
export const MAX_OLLAMA_OUTPUT_CHARS = 50_000;

export interface Phase2DecisionPackage {
  decision: string;
  recommendation: string;
  why: string[];
  alternatives: string[];
  risks: string[];
  deadline: string | null;
  required_review_minutes: number;
  source_records: Array<{ type?: string; id?: string; title?: string } | string>;
  confidence: number;
  missing_information: string[];
}

export interface Phase2OllamaOutput {
  job_id: string;
  operation: string;
  executive_summary: string;
  facts: string[];
  inferences: string[];
  missing_information: string[];
  risks: string[];
  recommended_next_action: string;
  recommended_owner: string;
  work_value_tier: string;
  requires_manny_approval: boolean;
  decision_package: Phase2DecisionPackage;
  confidence: number;
  warnings: string[];
}

const CLAIM_PATTERNS = [
  /\b(email|message)\s+(was\s+)?sent\b/i,
  /\bsent\s+(an?\s+)?(email|message)\b/i,
  /\b(record|client|database)\s+(was\s+)?(updated|changed|modified|activated)\b/i,
  /\bupdated\s+(the\s+)?(client\s+)?record\b/i,
  /\bI\s+(have\s+)?(approved|activated|converted|submitted|sent)\b/i,
  /\bcommunication\s+was\s+sent\b/i,
];

const TOOL_PATTERNS = [
  /\b(shell|bash|powershell|curl\s+http|invoke_tool|tool_call)\b/i,
  /```(?:bash|sh|powershell)/i,
];

const SECRET_PATTERNS = [
  /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/,
  /\bsk-[A-Za-z0-9]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
];

function isObj(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === 'object' && !Array.isArray(v);
}

function asStringArray(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  if (!v.every((x) => typeof x === 'string')) return null;
  return v as string[];
}

export function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      /* fall through */
    }
  }
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) {
    return JSON.parse(fence[1].trim());
  }
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1));
  }
  throw new Error('No JSON object found in model response');
}

export function validatePhase2OllamaOutput(
  value: unknown,
  opts?: { expectedJobId?: string; expectedOperation?: string },
): { ok: boolean; errors: string[]; output?: Phase2OllamaOutput } {
  const errors: string[] = [];
  if (!isObj(value)) return { ok: false, errors: ['Output must be a JSON object'] };

  const required = [
    'job_id',
    'operation',
    'executive_summary',
    'facts',
    'inferences',
    'missing_information',
    'risks',
    'recommended_next_action',
    'recommended_owner',
    'work_value_tier',
    'requires_manny_approval',
    'decision_package',
    'confidence',
    'warnings',
  ];
  for (const k of required) {
    if (!(k in value)) errors.push(`Missing field: ${k}`);
  }

  if (typeof value.job_id !== 'string') errors.push('job_id must be string');
  if (typeof value.operation !== 'string') errors.push('operation must be string');
  if (typeof value.executive_summary !== 'string') errors.push('executive_summary must be string');
  if (typeof value.recommended_next_action !== 'string') {
    errors.push('recommended_next_action must be string');
  }
  if (typeof value.recommended_owner !== 'string') errors.push('recommended_owner must be string');
  if (typeof value.work_value_tier !== 'string') errors.push('work_value_tier must be string');
  if (typeof value.requires_manny_approval !== 'boolean') {
    errors.push('requires_manny_approval must be boolean');
  }
  if (typeof value.confidence !== 'number' || value.confidence < 0 || value.confidence > 1) {
    errors.push('confidence must be number 0..1');
  }

  for (const arrKey of ['facts', 'inferences', 'missing_information', 'risks', 'warnings']) {
    if (asStringArray(value[arrKey]) === null) errors.push(`${arrKey} must be string[]`);
  }

  if (value.operation && !isPhase2AllowedOperation(String(value.operation))) {
    errors.push(`Unauthorized operation in output: ${value.operation}`);
  }
  if (opts?.expectedOperation && value.operation !== opts.expectedOperation) {
    errors.push(`operation mismatch: expected ${opts.expectedOperation}`);
  }
  if (opts?.expectedJobId && value.job_id && value.job_id !== opts.expectedJobId) {
    errors.push('job_id mismatch');
  }
  if (value.recommended_owner && !isConfigurableOwner(String(value.recommended_owner))) {
    errors.push(
      `recommended_owner must be one of: ${CONFIGURABLE_OWNERS.join(', ')}`,
    );
  }
  if (
    value.work_value_tier &&
    !(WORK_VALUE_TIERS as readonly string[]).includes(String(value.work_value_tier))
  ) {
    errors.push('work_value_tier is not a valid tier');
  }

  if (!isObj(value.decision_package)) {
    errors.push('decision_package must be object');
  } else {
    const dp = value.decision_package;
    for (const k of [
      'decision',
      'recommendation',
      'why',
      'alternatives',
      'risks',
      'required_review_minutes',
      'source_records',
      'confidence',
      'missing_information',
    ]) {
      if (!(k in dp)) errors.push(`decision_package missing ${k}`);
    }
    if (asStringArray(dp.why) === null) errors.push('decision_package.why must be string[]');
    if (asStringArray(dp.alternatives) === null) {
      errors.push('decision_package.alternatives must be string[]');
    }
    if (asStringArray(dp.risks) === null) errors.push('decision_package.risks must be string[]');
    if (asStringArray(dp.missing_information) === null) {
      errors.push('decision_package.missing_information must be string[]');
    }
    if (!Array.isArray(dp.source_records)) errors.push('decision_package.source_records must be array');
    if (typeof dp.confidence !== 'number' || dp.confidence < 0 || dp.confidence > 1) {
      errors.push('decision_package.confidence must be 0..1');
    }
    if (typeof dp.required_review_minutes !== 'number') {
      errors.push('decision_package.required_review_minutes must be number');
    }
  }

  const blob = JSON.stringify(value);
  if (blob.length > MAX_OLLAMA_OUTPUT_CHARS) {
    errors.push(`Output exceeds size limit (${MAX_OLLAMA_OUTPUT_CHARS} chars)`);
  }
  for (const re of CLAIM_PATTERNS) {
    if (re.test(blob)) errors.push('Output claims unauthorized completed action');
  }
  for (const re of TOOL_PATTERNS) {
    if (re.test(blob)) errors.push('Output includes tool/shell commands');
  }
  for (const re of SECRET_PATTERNS) {
    if (re.test(blob)) errors.push('Output appears to include secrets');
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, errors: [], output: value as unknown as Phase2OllamaOutput };
}

export function mapPhase2ToLegacyDecisionPackage(output: Phase2OllamaOutput) {
  const dp = output.decision_package;
  return {
    decision: dp.decision,
    recommendation: dp.recommendation,
    why: Array.isArray(dp.why) ? dp.why.join(' ') : String(dp.why || ''),
    alternatives: dp.alternatives,
    risks: dp.risks,
    deadline: dp.deadline,
    requiredReviewTimeMinutes: dp.required_review_minutes,
    sourceRecords: (dp.source_records || []).map((s) =>
      typeof s === 'string'
        ? { type: 'Note', id: s, title: s }
        : {
            type: s.type || 'Note',
            id: s.id || 'unknown',
            title: s.title || s.id || 'source',
          },
    ),
    confidence: dp.confidence,
    missingInformation: dp.missing_information,
    banner: SYNTHETIC_AI_OUTPUT_BANNER as typeof SYNTHETIC_AI_OUTPUT_BANNER,
    schemaVersion: OLLAMA_OUTPUT_SCHEMA_VERSION,
  };
}

export type { ConfigurableOwner, WorkValueTier };
