/**
 * Canonical BA engine path resolution (packaging / tests).
 * Production Hub runtime does not start a local Python subprocess. See ./client.ts.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * Resolve canonical in-tree BA engines at config/business.
 * Production must never search sibling worktrees or workstation paths.
 * HVCG_BA_BUSINESS_DIR is an explicit override only (tests / exceptional local layouts).
 */
export function resolveBaBusinessDir(): string {
  const env = process.env.HVCG_BA_BUSINESS_DIR;
  if (env) {
    const override = path.resolve(env);
    if (fs.existsSync(path.join(override, 'ba_bridge.py'))) return override;
    throw new Error(`HVCG_BA_BUSINESS_DIR is set but ba_bridge.py was not found in ${override}`);
  }

  const inTree = path.resolve(here, '../../../../config/business');
  if (fs.existsSync(path.join(inTree, 'ba_bridge.py'))) return inTree;
  throw new Error(
    'Canonical BA engines not found at config/business/ba_bridge.py. Restore in-tree engines or set HVCG_BA_BUSINESS_DIR.',
  );
}

export type { BaBridgeRequest, BaBridgeResponse } from './client.ts';
export { httpStatusForBa } from './client.ts';
