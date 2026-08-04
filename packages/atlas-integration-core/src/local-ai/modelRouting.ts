/**
 * Configurable model profiles + per-operation routing (Phase 3).
 * Never auto-pull models. Never silently substitute without recording.
 */

export const MODEL_PROFILES = [
  'Fast Operations Model',
  'Deep Analysis Model',
  'Fallback Model',
] as const;

export type ModelProfile = (typeof MODEL_PROFILES)[number];

export interface ModelProfileConfig {
  profile: ModelProfile;
  /** Empty string means not configured / unavailable. */
  modelName: string;
  notes: string;
}

export interface ModelRoutingConfig {
  profiles: Record<ModelProfile, ModelProfileConfig>;
  /** Operation → preferred profile */
  operationProfiles: Record<string, ModelProfile>;
  /** Recommended faster models for owner authorization (not installed automatically). */
  recommendedFasterModels: string[];
  fasterModelAvailable: boolean;
}

export interface ModelResolution {
  requestedProfile: ModelProfile;
  requestedModel: string | null;
  actualProfile: ModelProfile;
  actualModel: string;
  usedFallback: boolean;
  fallbackReason: string | null;
}

export const DEFAULT_OPERATION_PROFILES: Record<string, ModelProfile> = {
  classify_work_value: 'Fast Operations Model',
  identify_missing_information: 'Fast Operations Model',
  summarize_text: 'Fast Operations Model',
  summarize_meeting_notes: 'Fast Operations Model',
  draft_internal_status_update: 'Fast Operations Model',
  prepare_meeting_agenda: 'Fast Operations Model',
  prepare_meeting_brief: 'Fast Operations Model',
  summarize_meeting_outcomes: 'Fast Operations Model',
  draft_internal_task_plan: 'Fast Operations Model',
  prepare_decision_package: 'Deep Analysis Model',
  summarize_synthetic_eva: 'Deep Analysis Model',
  prepare_document_review_pack: 'Deep Analysis Model',
  prepare_client_operations_pack: 'Deep Analysis Model',
  complex_client_review: 'Deep Analysis Model',
  strategic_issue_analysis: 'Deep Analysis Model',
};

/** Owner-facing recommendations when no distinct fast model is installed. */
export const RECOMMENDED_FASTER_MODELS = [
  'llama3.2:3b',
  'qwen2.5:7b-instruct',
  'phi4-mini',
  'gemma2:9b',
];

export function buildModelRoutingConfig(opts: {
  deepModel: string;
  fastModel?: string;
  fallbackModel?: string;
  installedModels?: string[];
}): ModelRoutingConfig {
  const deep = opts.deepModel.trim();
  const fast = (opts.fastModel || '').trim();
  const fallback = (opts.fallbackModel || deep).trim();
  const installed = new Set(opts.installedModels || []);
  const fastDistinct =
    Boolean(fast) &&
    fast !== deep &&
    (installed.size === 0 || installed.has(fast));

  return {
    profiles: {
      'Fast Operations Model': {
        profile: 'Fast Operations Model',
        modelName: fastDistinct ? fast : '',
        notes: fastDistinct
          ? 'Configured distinct fast model'
          : 'No distinct faster model installed/configured — awaits owner authorization',
      },
      'Deep Analysis Model': {
        profile: 'Deep Analysis Model',
        modelName: deep,
        notes: 'Primary deep analysis model (Phase 2 selection)',
      },
      'Fallback Model': {
        profile: 'Fallback Model',
        modelName: fallback || deep,
        notes: 'Used only when preferred model unavailable; always recorded',
      },
    },
    operationProfiles: { ...DEFAULT_OPERATION_PROFILES },
    recommendedFasterModels: RECOMMENDED_FASTER_MODELS,
    fasterModelAvailable: fastDistinct,
  };
}

export function preferredProfileForOperation(
  operation: string,
  routing: ModelRoutingConfig,
): ModelProfile {
  return routing.operationProfiles[operation] || 'Deep Analysis Model';
}

export function resolveModelForOperation(
  operation: string,
  routing: ModelRoutingConfig,
  opts?: { overrideProfile?: ModelProfile; installedModels?: string[] },
): ModelResolution {
  const requestedProfile = opts?.overrideProfile || preferredProfileForOperation(operation, routing);
  const installed = new Set(opts?.installedModels || []);
  const preferredName = routing.profiles[requestedProfile].modelName;
  const fallbackName = routing.profiles['Fallback Model'].modelName;
  const deepName = routing.profiles['Deep Analysis Model'].modelName;

  const isAvailable = (name: string) =>
    Boolean(name) && (installed.size === 0 || installed.has(name));

  if (preferredName && isAvailable(preferredName)) {
    return {
      requestedProfile,
      requestedModel: preferredName,
      actualProfile: requestedProfile,
      actualModel: preferredName,
      usedFallback: false,
      fallbackReason: null,
    };
  }

  // Prefer Deep, then Fallback, when Fast is missing
  const candidates: Array<{ profile: ModelProfile; reason: string }> = [];
  if (requestedProfile === 'Fast Operations Model') {
    candidates.push({
      profile: 'Deep Analysis Model',
      reason: 'no_faster_model_installed',
    });
  }
  candidates.push({
    profile: 'Fallback Model',
    reason: preferredName
      ? 'preferred_model_unavailable'
      : 'preferred_profile_unconfigured',
  });
  if (requestedProfile !== 'Deep Analysis Model') {
    candidates.push({
      profile: 'Deep Analysis Model',
      reason: 'fallback_to_deep_analysis',
    });
  }

  for (const c of candidates) {
    const name = routing.profiles[c.profile].modelName;
    if (name && isAvailable(name)) {
      return {
        requestedProfile,
        requestedModel: preferredName || null,
        actualProfile: c.profile,
        actualModel: name,
        usedFallback: true,
        fallbackReason: c.reason,
      };
    }
  }

  // Last resort: deep name even if not in installed list (caller may still fail at execute)
  const last = deepName || fallbackName || preferredName;
  if (!last) {
    throw Object.assign(new Error('No Ollama model configured for any profile'), {
      status: 503,
      code: 'model_missing',
    });
  }
  return {
    requestedProfile,
    requestedModel: preferredName || null,
    actualProfile: 'Fallback Model',
    actualModel: last,
    usedFallback: true,
    fallbackReason: 'no_suitable_installed_model',
  };
}
