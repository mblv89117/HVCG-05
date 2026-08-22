import { microsoftConfig } from '../config';
import type { Sourced } from '../types';

/**
 * Power Automate integration interface (Development only).
 * Flows must live in HVCG Development and must not send live client communications.
 */
export type AutomateAction =
  | 'refresh-executive-brief'
  | 'notify-approval-pending'
  | 'snapshot-warning'
  | 'uat-feedback-received';

export interface AutomateInvokeResult {
  ok: boolean;
  action: AutomateAction;
  status: number;
  detail: string;
}

export async function invokeDevelopmentFlow(
  action: AutomateAction,
  payload: Record<string, unknown> = {},
): Promise<Sourced<AutomateInvokeResult>> {
  if (microsoftConfig.blockLiveClientComms && action === 'notify-approval-pending') {
    // Internal notify is OK in Dev; still no client email.
  }
  if (microsoftConfig.environment === 'production') {
    throw new Error('Power Automate invoke blocked in Production without an explicit gate.');
  }
  const base = microsoftConfig.powerAutomateBaseUrl;
  if (!base) {
    return {
      data: {
        ok: false,
        action,
        status: 0,
        detail: 'VITE_POWER_AUTOMATE_BASE_URL not set — flow not invoked.',
      },
      source: 'Unavailable',
      detail: 'Configure Dev HTTP-triggered flows, then set the base URL.',
    };
  }

  const res = await fetch(`${base.replace(/\/$/, '')}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      environment: microsoftConfig.environment,
      blockLiveClientComms: microsoftConfig.blockLiveClientComms,
      requestedAt: new Date().toISOString(),
    }),
  });

  return {
    data: {
      ok: res.ok,
      action,
      status: res.status,
      detail: res.ok ? 'Flow accepted' : `Flow error ${res.status}`,
    },
    source: 'Live',
    detail: 'Power Automate HVCG Development',
  };
}
