/**
 * Feature flags for Local AI Operations — all default Off.
 * Never enable via code defaults; runtime env may override for local tests only.
 */

export interface LocalAiFeatureFlags {
  LocalAIEnabled: boolean;
  LocalAIWritesEnabled: boolean;
  LocalAIExternalMessagesEnabled: boolean;
  EvaIntakeEnabled: boolean;
  ClientEmailsEnabled: boolean;
}

export const DEFAULT_LOCAL_AI_FEATURE_FLAGS: Readonly<LocalAiFeatureFlags> = Object.freeze({
  LocalAIEnabled: false,
  LocalAIWritesEnabled: false,
  LocalAIExternalMessagesEnabled: false,
  EvaIntakeEnabled: false,
  ClientEmailsEnabled: false,
});

export const LOCAL_AI_FEATURE_FLAG_KEYS = Object.keys(
  DEFAULT_LOCAL_AI_FEATURE_FLAGS,
) as Array<keyof LocalAiFeatureFlags>;

function parseBool(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined || raw === '') return fallback;
  const v = raw.trim().toLowerCase();
  if (v === 'true' || v === '1' || v === 'yes' || v === 'on') return true;
  if (v === 'false' || v === '0' || v === 'no' || v === 'off') return false;
  return fallback;
}

/**
 * Load flags from env. Defaults are always false unless explicitly set.
 * Kill switch: LOCAL_AI_KILL_SWITCH=true forces LocalAIEnabled=false.
 */
export function loadLocalAiFeatureFlags(
  env: Record<string, string | undefined> = process.env,
): LocalAiFeatureFlags {
  const kill = parseBool(env.LOCAL_AI_KILL_SWITCH, false);
  const flags: LocalAiFeatureFlags = {
    LocalAIEnabled: kill ? false : parseBool(env.LOCAL_AI_ENABLED, false),
    LocalAIWritesEnabled: parseBool(env.LOCAL_AI_WRITES_ENABLED, false),
    LocalAIExternalMessagesEnabled: parseBool(env.LOCAL_AI_EXTERNAL_MESSAGES_ENABLED, false),
    EvaIntakeEnabled: parseBool(env.EVA_INTAKE_ENABLED, false),
    ClientEmailsEnabled: parseBool(env.CLIENT_EMAILS_ENABLED, false),
  };
  return flags;
}

export function assertSafetyFlagsOff(flags: LocalAiFeatureFlags): {
  ok: boolean;
  violations: string[];
} {
  const violations: string[] = [];
  if (flags.EvaIntakeEnabled) violations.push('EvaIntakeEnabled must be false in Phase 1');
  if (flags.ClientEmailsEnabled) violations.push('ClientEmailsEnabled must be false in Phase 1');
  if (flags.LocalAIExternalMessagesEnabled) {
    violations.push('LocalAIExternalMessagesEnabled must be false in Phase 1');
  }
  return { ok: violations.length === 0, violations };
}

export function isLocalAiRuntimeAllowed(flags: LocalAiFeatureFlags): boolean {
  return flags.LocalAIEnabled === true;
}
