/**
 * Phase 6A — read-only repository discovery.
 * Never modifies files. Never runs deploy.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import type { WebsiteDiscoveryResult, WebsiteFramework } from '@hvcg/atlas-integration-core';

function safeList(dir: string, max = 200): string[] {
  try {
    if (!existsSync(dir)) return [];
    return readdirSync(dir).slice(0, max);
  } catch {
    return [];
  }
}

function walkFiles(root: string, pred: (name: string) => boolean, limit = 80): string[] {
  const out: string[] = [];
  const stack = [root];
  while (stack.length && out.length < limit) {
    const dir = stack.pop()!;
    let entries: string[] = [];
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of entries) {
      if (name === 'node_modules' || name === '.git' || name === 'dist' || name === '.next') continue;
      const full = join(dir, name);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) stack.push(full);
      else if (pred(name)) out.push(full.replace(root + '/', '').replace(root + '\\', ''));
      if (out.length >= limit) break;
    }
  }
  return out;
}

function git(cwd: string, args: string[]): string | null {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      timeout: 5_000,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

function detectFramework(root: string, pkg: Record<string, unknown> | null): WebsiteFramework {
  const deps = {
    ...((pkg?.dependencies as Record<string, string>) || {}),
    ...((pkg?.devDependencies as Record<string, string>) || {}),
  };
  if (deps.next || existsSync(join(root, 'next.config.js')) || existsSync(join(root, 'next.config.mjs'))) {
    return 'Next.js';
  }
  if (deps.astro || existsSync(join(root, 'astro.config.mjs'))) return 'Astro';
  if (deps.vite || existsSync(join(root, 'vite.config.ts')) || existsSync(join(root, 'vite.config.js'))) {
    return 'Vite/React';
  }
  if (existsSync(join(root, 'index.html'))) return 'Static HTML';
  return 'Unknown';
}

function detectPackageManager(root: string): WebsiteDiscoveryResult['packageManager'] {
  if (existsSync(join(root, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(root, 'yarn.lock'))) return 'yarn';
  if (existsSync(join(root, 'bun.lockb'))) return 'bun';
  if (existsSync(join(root, 'package-lock.json'))) return 'npm';
  return 'unknown';
}

export function discoverLocalRepository(localPath: string): WebsiteDiscoveryResult {
  const resolved = resolve(localPath);
  const notes: string[] = [];
  if (!existsSync(resolved)) {
    return {
      discoveryId: randomUUID(),
      websiteId: null,
      localPath: resolved,
      repositoryRoot: null,
      gitRemote: null,
      currentBranch: null,
      productionBranchGuess: null,
      framework: 'Unknown',
      packageManager: 'unknown',
      buildScripts: [],
      deploymentConfigFiles: [],
      pages: [],
      routes: [],
      contentFiles: [],
      componentFiles: [],
      seoFiles: [],
      mediaDirectories: [],
      formDefinitions: [],
      redirects: [],
      sitemapRobotsFiles: [],
      envVarReferences: [],
      deploymentProviderConfig: [],
      confidence: 0,
      readOnly: true,
      modifiedAnything: false,
      discoveredAt: new Date().toISOString(),
      notes: ['Path does not exist'],
    };
  }

  const gitRoot = git(resolved, ['rev-parse', '--show-toplevel']) || null;
  const root = gitRoot || resolved;
  const remote = git(root, ['remote', 'get-url', 'origin']);
  const branch = git(root, ['rev-parse', '--abbrev-ref', 'HEAD']);
  let pkg: Record<string, unknown> | null = null;
  const pkgPath = join(root, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as Record<string, unknown>;
    } catch {
      notes.push('package.json unreadable');
    }
  }
  const scripts = Object.keys((pkg?.scripts as Record<string, string>) || {});
  const framework = detectFramework(root, pkg);
  const packageManager = detectPackageManager(root);

  const deploymentConfigFiles = walkFiles(
    root,
    (n) =>
      /^(vercel\.json|netlify\.toml|staticwebapp\.config\.json|wrangler\.toml|firebase\.json)$/i.test(
        n,
      ),
  );
  const pages = walkFiles(
    root,
    (n) => /^(page\.(tsx|jsx|ts|js|mdx)|index\.(tsx|jsx|html)|\[.*\]\.(tsx|jsx))$/i.test(n),
  );
  const contentFiles = walkFiles(root, (n) => /\.(md|mdx|json)$/i.test(n) && !/package(-lock)?\.json/i.test(n));
  const componentFiles = walkFiles(root, (n) => /\.(tsx|jsx)$/i.test(n));
  const seoFiles = walkFiles(
    root,
    (n) => /seo|metadata|helmet|jsonld|schema/i.test(n) || n === 'robots.txt' || n === 'sitemap.xml',
  );
  const mediaDirectories = ['public', 'public/images', 'public/media', 'src/assets', 'assets']
    .map((d) => join(root, d))
    .filter((d) => existsSync(d))
    .map((d) => d.replace(root + '/', ''));
  const formDefinitions = walkFiles(root, (n) => /form/i.test(n) && /\.(tsx|jsx|ts|js)$/i.test(n));
  const sitemapRobotsFiles = walkFiles(root, (n) => /^robots\.txt$|^sitemap.*\.xml$/i.test(n));
  const redirects = walkFiles(root, (n) => /redirect/i.test(n));
  const envVarReferences = walkFiles(root, (n) => /^\.env/i.test(n) || n.endsWith('.env.example'));
  // Do not read .env values — only filenames
  const envNames = envVarReferences.map((f) => basename(f));

  let confidence = 0.2;
  if (gitRoot) confidence += 0.2;
  if (pkg) confidence += 0.2;
  if (framework !== 'Unknown') confidence += 0.2;
  if (pages.length) confidence += 0.15;
  if (remote) confidence += 0.05;
  confidence = Math.min(0.99, confidence);

  notes.push('Read-only discovery — no files modified');
  notes.push('Environment files listed by name only; contents not loaded');

  return {
    discoveryId: randomUUID(),
    websiteId: null,
    localPath: resolved,
    repositoryRoot: root,
    gitRemote: remote,
    currentBranch: branch,
    productionBranchGuess: 'main',
    framework,
    packageManager,
    buildScripts: scripts,
    deploymentConfigFiles,
    pages,
    routes: pages.map((p) => p),
    contentFiles,
    componentFiles,
    seoFiles,
    mediaDirectories,
    formDefinitions,
    redirects,
    sitemapRobotsFiles,
    envVarReferences: envNames,
    deploymentProviderConfig: deploymentConfigFiles,
    confidence,
    readOnly: true,
    modifiedAnything: false,
    discoveredAt: new Date().toISOString(),
    notes,
  };
}
