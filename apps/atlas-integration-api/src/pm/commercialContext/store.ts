import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { CommercialOverlay } from './types.ts';

export const OVERLAY_FILENAME = 'commercial-context-overlay.json';

export function emptyOverlay(): CommercialOverlay {
  return {
    gccSignals: [],
    preCallBriefs: [],
    attributions: [],
    copilotAssessments: [],
  };
}

export function overlayPath(dataDir: string): string {
  return join(dataDir, OVERLAY_FILENAME);
}

function asArray<T>(raw: unknown): T[] {
  return Array.isArray(raw) ? (raw as T[]) : [];
}

export function loadOverlay(dataDir: string): CommercialOverlay {
  const path = overlayPath(dataDir);
  if (!existsSync(path)) return emptyOverlay();
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<CommercialOverlay>;
    return {
      gccSignals: asArray(parsed.gccSignals),
      preCallBriefs: asArray(parsed.preCallBriefs),
      attributions: asArray(parsed.attributions),
      copilotAssessments: asArray(parsed.copilotAssessments),
    };
  } catch {
    return emptyOverlay();
  }
}

export function saveOverlay(dataDir: string, overlay: CommercialOverlay): void {
  const path = overlayPath(dataDir);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(overlay, null, 2)}\n`, 'utf8');
}
