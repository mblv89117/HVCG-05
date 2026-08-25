/**
 * Observed capital overlay durability — no secrets, no fact payloads.
 *
 * App Service Linux built-in Node persists /home across recycle and zip --clean
 * of wwwroot. WEBSITE_RUN_FROM_PACKAGE=0 means wwwroot is writable and wiped
 * on --clean. Overlay must live under /home (INTEGRATION_DATA_DIR), not wwwroot.
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { CAPITAL_OVERLAY_SCHEMA_VERSION, overlayFilePath, resolveCapitalOverlayDir } from './overlay.ts';

function pathUnderHome(p: string): boolean {
  return p === '/home' || p.startsWith('/home/');
}

function pathLooksLikeWwwroot(p: string): boolean {
  return /wwwroot|\.data\/integrations$|\/site\//i.test(p);
}

export interface CapitalOverlayHealth {
  schemaVersion: number;
  dataDirectory: string;
  persistentStorageConfigured: boolean;
  recycleSurvivable: boolean;
  redeploySurvivable: boolean;
  multiInstanceSafe: false;
  authoritativeStateStore: 'sharepoint-lists+runtime-overlay';
  runtimeOverlay: 'durable-json';
  overlayPresent: boolean;
  overlayReadable: boolean;
  overlayCorrupt: boolean;
  overlayUnsupportedSchema: boolean;
  overlaySchemaVersion: number | null;
  scaleConstraint: 'single-instance-overlay';
  deploymentModelObserved: {
    homeIsPersistentHint: boolean;
    sku: string | null;
    siteNamePresent: boolean;
    instanceIdPresent: boolean;
    runFromPackage: string;
    dataDirUnderHome: boolean;
  };
}

export function inspectCapitalOverlayHealth(
  dataDir: string,
  env: NodeJS.ProcessEnv = process.env,
): CapitalOverlayHealth {
  const dir = resolveCapitalOverlayDir(dataDir, env);
  const file = overlayFilePath(dir);
  const underHome = pathUnderHome(dir);
  const wwwroot = pathLooksLikeWwwroot(dir);
  const runFromPackage = (env.WEBSITE_RUN_FROM_PACKAGE || '0').trim();
  let overlayPresent = false;
  let overlayReadable = false;
  let overlaySchemaVersion: number | null = null;
  let overlayCorrupt = false;
  let overlayUnsupportedSchema = false;
  if (existsSync(file)) {
    overlayPresent = true;
    try {
      const st = statSync(file);
      if (st.size <= 0) throw new Error('empty');
      const parsed = JSON.parse(readFileSync(file, 'utf8')) as { schemaVersion?: unknown };
      const ver = typeof parsed.schemaVersion === 'number' ? parsed.schemaVersion : CAPITAL_OVERLAY_SCHEMA_VERSION;
      if (ver > CAPITAL_OVERLAY_SCHEMA_VERSION) {
        overlayUnsupportedSchema = true;
        overlaySchemaVersion = ver;
      } else {
        overlaySchemaVersion = ver;
        overlayReadable = true;
      }
    } catch {
      overlayCorrupt = true;
      overlayReadable = false;
    }
  }
  const recycleSurvivable = underHome && !wwwroot;
  const redeploySurvivable = recycleSurvivable;
  return {
    schemaVersion: CAPITAL_OVERLAY_SCHEMA_VERSION,
    dataDirectory: dir,
    persistentStorageConfigured: underHome,
    recycleSurvivable,
    redeploySurvivable,
    multiInstanceSafe: false,
    authoritativeStateStore: 'sharepoint-lists+runtime-overlay',
    runtimeOverlay: 'durable-json',
    overlayPresent,
    overlayReadable,
    overlayCorrupt,
    overlayUnsupportedSchema,
    overlaySchemaVersion,
    scaleConstraint: 'single-instance-overlay',
    deploymentModelObserved: {
      homeIsPersistentHint: underHome,
      sku: (env.WEBSITE_SKU || '').trim() || null,
      siteNamePresent: Boolean((env.WEBSITE_SITE_NAME || '').trim()),
      instanceIdPresent: Boolean((env.WEBSITE_INSTANCE_ID || '').trim()),
      runFromPackage,
      dataDirUnderHome: underHome,
    },
  };
}
