/** Wave 8 — hard default. Do not infer send authority. */
export const GLOBAL_AUTO_RESPOND = false as const;

export type RespondMode = 'DRAFT_ONLY' | 'REQUIRE_APPROVAL' | 'POLICY_AUTO_RESPOND';

export function assertGlobalAutoRespondOff(value: unknown): asserts value is false {
  if (value !== false && value !== undefined && value !== null) {
    throw new Error(
      'GLOBAL_AUTO_RESPOND must remain false unless Owner policy explicitly grants POLICY_AUTO_RESPOND for a scoped class.',
    );
  }
}
