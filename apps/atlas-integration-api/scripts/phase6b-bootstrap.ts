/**
 * Phase 6B bootstrap against the real HVCG pilot worktree.
 * Read-only discovery + registry + baseline + pilot CR.
 * Does NOT modify website files.
 *
 * Usage:
 *   npx tsx apps/atlas-integration-api/scripts/phase6b-bootstrap.ts
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { WebsiteStudioService } from '../src/website-studio/service.ts';
import {
  HVCG_WORKTREE_PATH,
  CURRENT_H1,
} from '../src/website-studio/phase6b.ts';

const atlasRoot = resolve(process.cwd().includes('atlas-integration-api')
  ? join(process.cwd(), '../..')
  : process.cwd());

const dbPath = join(atlasRoot, '.data', 'website-studio', 'website-studio.sqlite');
const evidenceDir = join(atlasRoot, 'deployment', 'reports', 'website-studio-phase6b');
mkdirSync(evidenceDir, { recursive: true });

const service = new WebsiteStudioService({
  repoRoot: atlasRoot,
  env: { WEBSITE_STUDIO_DB: dbPath },
  dbPath,
});

const result = service.bootstrapPhase6bPilot({
  worktreePath: HVCG_WORKTREE_PATH,
  naturalLanguage:
    'Update the HVCG homepage headline to emphasize strategic capital advisory and business growth.',
});

const panel = service.getPilotReviewPanel(result.changeRequest.changeRequestId);

const evidence = {
  phase: '6B',
  ranAt: new Date().toISOString(),
  worktree: HVCG_WORKTREE_PATH,
  websiteId: result.registered.website.websiteId,
  baselineCommit: result.baseline.baselineCommit,
  pilotBranch: result.baseline.pilotBranch,
  changeRequestId: result.changeRequest.changeRequestId,
  originalH1: CURRENT_H1,
  aiProposals: result.changeRequest.aiProposals,
  recommendedVariantId: result.changeRequest.recommendedVariantId,
  filesModified: false,
  productionDeployAuthorized: false,
  candidateBRegistered: false,
  panel,
};

writeFileSync(join(evidenceDir, 'bootstrap.json'), JSON.stringify(evidence, null, 2));
writeFileSync(
  join(evidenceDir, 'ai-proposals.json'),
  JSON.stringify(
    {
      original: CURRENT_H1,
      recommendedVariantId: result.changeRequest.recommendedVariantId,
      variants: result.changeRequest.aiProposals,
    },
    null,
    2,
  ),
);

console.log(JSON.stringify({
  ok: true,
  changeRequestId: result.changeRequest.changeRequestId,
  baselineCommit: result.baseline.baselineCommit,
  filesModified: false,
  evidenceDir,
}, null, 2));

service.store.close();
