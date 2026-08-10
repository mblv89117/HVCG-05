/**
 * Phase 6A — governed Git adapter.
 * Predefined operations only. No arbitrary commands. No push/merge/deploy.
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export type GitSafeOp =
  | 'status'
  | 'current_branch'
  | 'is_clean'
  | 'show_diff'
  | 'create_feature_branch'
  | 'record_baseline'
  | 'commit_approved'
  | 'prepare_pr_metadata';

const FORBIDDEN = [
  'push',
  'merge',
  'rebase',
  'reset --hard',
  'checkout main',
  'checkout master',
  'deploy',
];

function run(cwd: string, args: string[]): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    timeout: 15_000,
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

export class WebsiteGitAdapter {
  constructor(private repoPath: string) {
    this.repoPath = resolve(repoPath);
  }

  assertNotForbidden(op: string) {
    const lower = op.toLowerCase();
    for (const f of FORBIDDEN) {
      if (lower.includes(f)) {
        throw Object.assign(new Error(`Git operation forbidden in Phase 6A: ${f}`), {
          status: 403,
          code: 'git_forbidden',
        });
      }
    }
  }

  status() {
    if (!existsSync(this.repoPath)) {
      throw Object.assign(new Error('Repository path not found'), { status: 404, code: 'repo_missing' });
    }
    const branch = run(this.repoPath, ['rev-parse', '--abbrev-ref', 'HEAD']);
    const porcelain = run(this.repoPath, ['status', '--porcelain']);
    const head = run(this.repoPath, ['rev-parse', 'HEAD']);
    return {
      repoPath: this.repoPath,
      currentBranch: branch,
      clean: porcelain.length === 0,
      dirtyFiles: porcelain ? porcelain.split('\n').filter(Boolean) : [],
      head,
      productionBranchDirectEditAllowed: false,
      pushAllowed: false,
      mergeAllowed: false,
      phase6a: true,
    };
  }

  createFeatureBranch(name: string) {
    this.assertNotForbidden(name);
    if (!/^website-studio\/[a-z0-9._/-]+$/i.test(name)) {
      throw Object.assign(
        new Error('Branch must match website-studio/<slug>'),
        { status: 400, code: 'invalid_branch' },
      );
    }
    const st = this.status();
    if (!st.clean) {
      throw Object.assign(new Error('Working tree dirty — refuse branch create'), {
        status: 409,
        code: 'dirty_tree',
      });
    }
    if (st.currentBranch === 'main' || st.currentBranch === 'master') {
      // Creating a feature branch from production branch is OK; editing production branch is not
    }
    run(this.repoPath, ['checkout', '-b', name]);
    return { branch: name, baselineCommit: this.status().head, created: true };
  }

  showDiff() {
    const staged = run(this.repoPath, ['diff', '--cached']);
    const unstaged = run(this.repoPath, ['diff']);
    return { staged, unstaged, combined: `${staged}\n${unstaged}`.trim() };
  }

  /**
   * Phase 6A: commit is allowed only on website-studio/* branches for synthetic/local tests.
   * Never push. Never checkout production for edit.
   */
  commitApproved(message: string, allowEmpty = false) {
    const st = this.status();
    if (st.currentBranch === 'main' || st.currentBranch === 'master') {
      throw Object.assign(new Error('Cannot commit on production branch in Phase 6A'), {
        status: 403,
        code: 'production_branch_commit_forbidden',
      });
    }
    if (!st.currentBranch.startsWith('website-studio/')) {
      throw Object.assign(new Error('Commits only allowed on website-studio/* branches'), {
        status: 403,
        code: 'branch_not_website_studio',
      });
    }
    const safeMsg = message.replace(/[`$]/g, '').slice(0, 200);
    run(this.repoPath, ['add', '-A']);
    const args = ['commit', '-m', safeMsg];
    if (allowEmpty) args.push('--allow-empty');
    try {
      run(this.repoPath, args);
    } catch (err) {
      throw Object.assign(new Error(`Commit failed: ${err instanceof Error ? err.message : String(err)}`), {
        status: 500,
        code: 'commit_failed',
      });
    }
    return { commit: this.status().head, branch: st.currentBranch, pushed: false };
  }

  preparePrMetadata(opts: { title: string; body: string; base?: string }) {
    return {
      title: opts.title,
      body: opts.body,
      base: opts.base || 'main',
      head: this.status().currentBranch,
      draft: true,
      created: false,
      phase6aNote: 'PR metadata prepared only — create requires separate Manny authorization',
    };
  }

  /**
   * Phase 6B: push only the current website-studio/* feature branch.
   * Never force, never push main/master, never merge.
   */
  pushFeatureBranch(remote = 'origin') {
    const st = this.status();
    if (st.currentBranch === 'main' || st.currentBranch === 'master') {
      throw Object.assign(new Error('Refusing to push production branch'), {
        status: 403,
        code: 'production_push_forbidden',
      });
    }
    if (!st.currentBranch.startsWith('website-studio/')) {
      throw Object.assign(new Error('Push only allowed for website-studio/* branches'), {
        status: 403,
        code: 'branch_not_website_studio',
      });
    }
    run(this.repoPath, ['push', '-u', remote, st.currentBranch]);
    return {
      pushed: true,
      remoteBranch: `${remote}/${st.currentBranch}`,
      branch: st.currentBranch,
      commit: this.status().head,
      merge: false,
      deploy: false,
    };
  }
}
