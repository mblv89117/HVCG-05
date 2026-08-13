import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtempSync, rmSync } from 'node:fs';
import {
  UnsafeHubConfigurationError,
  loadConfig,
  resolvePmBackend,
} from '../src/config.ts';
import { createAuthorizedPmRepository } from '../src/pm/backend.ts';
import { PmRepository } from '../src/pm/repository.ts';

describe('PM backend configuration', () => {
  it('development default is unavailable — local JSON is not silently authoritative', () => {
    const backend = resolvePmBackend({ NODE_ENV: 'development' });
    assert.equal(backend.mode, 'unavailable');
    assert.equal(backend.classification, 'unavailable');
    assert.equal(backend.localJsonAuthorized, false);
  });

  it('explicit development-json is local-only and not SharePoint or production', () => {
    const backend = resolvePmBackend({
      NODE_ENV: 'development',
      INTEGRATION_PM_BACKEND: 'development-json',
    });
    assert.equal(backend.mode, 'development-json');
    assert.equal(backend.classification, 'development-local');
    assert.equal(backend.localJsonAuthorized, true);
  });

  it('local-json is an alias of development-json', () => {
    const backend = resolvePmBackend({
      NODE_ENV: 'development',
      INTEGRATION_PM_BACKEND: 'local-json',
    });
    assert.equal(backend.mode, 'development-json');
    assert.equal(backend.classification, 'development-local');
  });

  it('production with no PM backend is unavailable, not a JSON fallback', () => {
    const backend = resolvePmBackend({ NODE_ENV: 'production' });
    assert.equal(backend.mode, 'unavailable');
    assert.equal(backend.classification, 'unavailable');
    assert.equal(backend.localJsonAuthorized, false);
  });

  it('production plus development-json is rejected at configuration time', () => {
    assert.throws(
      () =>
        resolvePmBackend({
          NODE_ENV: 'production',
          INTEGRATION_PM_BACKEND: 'development-json',
        }),
      (err: unknown) =>
        err instanceof UnsafeHubConfigurationError &&
        err.message.includes('development PM JSON store') &&
        err.message.includes('NODE_ENV=production') &&
        !err.message.toLowerCase().includes('secret'),
    );
  });

  it('production plus local-json is rejected at configuration time', () => {
    assert.throws(
      () =>
        resolvePmBackend({
          NODE_ENV: 'production',
          INTEGRATION_PM_BACKEND: 'local-json',
        }),
      UnsafeHubConfigurationError,
    );
  });

  it('sharepoint without required IDs is rejected at configuration time', () => {
    assert.throws(
      () =>
        resolvePmBackend({
          NODE_ENV: 'production',
          INTEGRATION_PM_BACKEND: 'sharepoint',
        }),
      (err: unknown) =>
        err instanceof UnsafeHubConfigurationError &&
        err.message.includes('INTEGRATION_PM_BACKEND=sharepoint requires'),
    );
  });

  it('sharepoint with valid IDs is selected and does not authorize JSON', () => {
    const backend = resolvePmBackend({
      NODE_ENV: 'production',
      INTEGRATION_PM_BACKEND: 'sharepoint',
      INTEGRATION_PM_SHAREPOINT_SITE_ID:
        'contoso.sharepoint.com,11111111-1111-4111-8111-111111111011,22222222-2222-4222-8222-222222222022',
      INTEGRATION_PM_PROJECTS_LIST_ID: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      INTEGRATION_PM_TASKS_LIST_ID: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
      INTEGRATION_PM_MILESTONES_LIST_ID: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
      INTEGRATION_PM_CLIENTS_LIST_ID: 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
      AZURE_CLIENT_ID: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
    });
    assert.equal(backend.mode, 'sharepoint');
    assert.equal(backend.classification, 'sharepoint-graph');
    assert.equal(backend.localJsonAuthorized, false);
    assert.equal(backend.credentialMode, 'managed_identity');
    assert.equal(backend.configComplete, true);
  });

  it('sharepoint with malformed list ID is rejected', () => {
    assert.throws(
      () =>
        resolvePmBackend({
          NODE_ENV: 'development',
          INTEGRATION_PM_BACKEND: 'sharepoint',
          INTEGRATION_PM_SHAREPOINT_SITE_ID:
            'contoso.sharepoint.com,11111111-1111-4111-8111-111111111011,22222222-2222-4222-8222-222222222022',
          INTEGRATION_PM_PROJECTS_LIST_ID: 'not-a-guid',
          INTEGRATION_PM_TASKS_LIST_ID: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
          INTEGRATION_PM_MILESTONES_LIST_ID: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
          INTEGRATION_PM_CLIENTS_LIST_ID: 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
          AZURE_CLIENT_ID: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
        }),
      UnsafeHubConfigurationError,
    );
  });
});

describe('authorized PM repository factory', () => {
  it('does not instantiate PmRepository when the backend is unavailable', () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-pm-unavail-'));
    let created = 0;
    const prev = {
      NODE_ENV: process.env.NODE_ENV,
      KEY: process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY,
      HOST: process.env.INTEGRATION_HOST,
      PM: process.env.INTEGRATION_PM_BACKEND,
      DATA: process.env.INTEGRATION_DATA_DIR,
      REQUIRE: process.env.INTEGRATION_REQUIRE_AUTH,
      INSECURE: process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH,
    };
    try {
      process.env.NODE_ENV = 'development';
      process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
      process.env.INTEGRATION_HOST = '127.0.0.1';
      process.env.INTEGRATION_DATA_DIR = dir;
      delete process.env.INTEGRATION_PM_BACKEND;
      delete process.env.INTEGRATION_REQUIRE_AUTH;
      delete process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH;
      const cfg = loadConfig();
      assert.equal(cfg.pmBackend.mode, 'unavailable');
      const pm = createAuthorizedPmRepository(cfg, () => {
        created += 1;
        return new PmRepository(dir);
      });
      assert.equal(pm, null);
      assert.equal(created, 0);
      assert.equal(existsSync(join(dir, 'pm-store.json')), false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
      if (prev.NODE_ENV === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = prev.NODE_ENV;
      if (prev.KEY === undefined) delete process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY;
      else process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = prev.KEY;
      if (prev.HOST === undefined) delete process.env.INTEGRATION_HOST;
      else process.env.INTEGRATION_HOST = prev.HOST;
      if (prev.PM === undefined) delete process.env.INTEGRATION_PM_BACKEND;
      else process.env.INTEGRATION_PM_BACKEND = prev.PM;
      if (prev.DATA === undefined) delete process.env.INTEGRATION_DATA_DIR;
      else process.env.INTEGRATION_DATA_DIR = prev.DATA;
      if (prev.REQUIRE === undefined) delete process.env.INTEGRATION_REQUIRE_AUTH;
      else process.env.INTEGRATION_REQUIRE_AUTH = prev.REQUIRE;
      if (prev.INSECURE === undefined) delete process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH;
      else process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH = prev.INSECURE;
    }
  });

  it('production unavailable does not instantiate or touch pm-store.json', () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-pm-prod-unavail-'));
    let created = 0;
    const prev = {
      NODE_ENV: process.env.NODE_ENV,
      KEY: process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY,
      HOST: process.env.INTEGRATION_HOST,
      PM: process.env.INTEGRATION_PM_BACKEND,
      DATA: process.env.INTEGRATION_DATA_DIR,
      REQUIRE: process.env.INTEGRATION_REQUIRE_AUTH,
      INSECURE: process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH,
    };
    try {
      process.env.NODE_ENV = 'production';
      process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
      process.env.INTEGRATION_HOST = '127.0.0.1';
      process.env.INTEGRATION_DATA_DIR = dir;
      delete process.env.INTEGRATION_PM_BACKEND;
      delete process.env.INTEGRATION_REQUIRE_AUTH;
      delete process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH;
      const cfg = loadConfig();
      assert.equal(cfg.pmBackend.mode, 'unavailable');
      const pm = createAuthorizedPmRepository(cfg, () => {
        created += 1;
        return new PmRepository(dir);
      });
      assert.equal(pm, null);
      assert.equal(created, 0);
      assert.equal(existsSync(join(dir, 'pm-store.json')), false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
      if (prev.NODE_ENV === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = prev.NODE_ENV;
      if (prev.KEY === undefined) delete process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY;
      else process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = prev.KEY;
      if (prev.HOST === undefined) delete process.env.INTEGRATION_HOST;
      else process.env.INTEGRATION_HOST = prev.HOST;
      if (prev.PM === undefined) delete process.env.INTEGRATION_PM_BACKEND;
      else process.env.INTEGRATION_PM_BACKEND = prev.PM;
      if (prev.DATA === undefined) delete process.env.INTEGRATION_DATA_DIR;
      else process.env.INTEGRATION_DATA_DIR = prev.DATA;
      if (prev.REQUIRE === undefined) delete process.env.INTEGRATION_REQUIRE_AUTH;
      else process.env.INTEGRATION_REQUIRE_AUTH = prev.REQUIRE;
      if (prev.INSECURE === undefined) delete process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH;
      else process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH = prev.INSECURE;
    }
  });

  it('production plus development-json fails closed before any JSON I/O', () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-pm-prod-json-'));
    const prev = {
      NODE_ENV: process.env.NODE_ENV,
      KEY: process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY,
      HOST: process.env.INTEGRATION_HOST,
      PM: process.env.INTEGRATION_PM_BACKEND,
      DATA: process.env.INTEGRATION_DATA_DIR,
      REQUIRE: process.env.INTEGRATION_REQUIRE_AUTH,
      INSECURE: process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH,
    };
    try {
      process.env.NODE_ENV = 'production';
      process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
      process.env.INTEGRATION_HOST = '127.0.0.1';
      process.env.INTEGRATION_DATA_DIR = dir;
      process.env.INTEGRATION_PM_BACKEND = 'development-json';
      delete process.env.INTEGRATION_REQUIRE_AUTH;
      delete process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH;
      assert.throws(() => loadConfig(), UnsafeHubConfigurationError);
      assert.equal(existsSync(join(dir, 'pm-store.json')), false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
      if (prev.NODE_ENV === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = prev.NODE_ENV;
      if (prev.KEY === undefined) delete process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY;
      else process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = prev.KEY;
      if (prev.HOST === undefined) delete process.env.INTEGRATION_HOST;
      else process.env.INTEGRATION_HOST = prev.HOST;
      if (prev.PM === undefined) delete process.env.INTEGRATION_PM_BACKEND;
      else process.env.INTEGRATION_PM_BACKEND = prev.PM;
      if (prev.DATA === undefined) delete process.env.INTEGRATION_DATA_DIR;
      else process.env.INTEGRATION_DATA_DIR = prev.DATA;
      if (prev.REQUIRE === undefined) delete process.env.INTEGRATION_REQUIRE_AUTH;
      else process.env.INTEGRATION_REQUIRE_AUTH = prev.REQUIRE;
      if (prev.INSECURE === undefined) delete process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH;
      else process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH = prev.INSECURE;
    }
  });

  it('explicit development-json initializes only the configured local path', () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-pm-dev-json-'));
    const prev = {
      NODE_ENV: process.env.NODE_ENV,
      KEY: process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY,
      HOST: process.env.INTEGRATION_HOST,
      PM: process.env.INTEGRATION_PM_BACKEND,
      DATA: process.env.INTEGRATION_DATA_DIR,
      REQUIRE: process.env.INTEGRATION_REQUIRE_AUTH,
      INSECURE: process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH,
    };
    try {
      process.env.NODE_ENV = 'development';
      process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
      process.env.INTEGRATION_HOST = '127.0.0.1';
      process.env.INTEGRATION_DATA_DIR = dir;
      process.env.INTEGRATION_PM_BACKEND = 'development-json';
      delete process.env.INTEGRATION_REQUIRE_AUTH;
      delete process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH;
      const cfg = loadConfig();
      const pm = createAuthorizedPmRepository(cfg);
      assert.ok(pm);
      assert.equal(pm.backendMode, 'development-json');
      assert.equal(pm.classification, 'development-local');
      assert.equal(existsSync(join(dir, 'pm-store.json')), true);
      pm.upsertProject({
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Local JSON fixture',
        businessEntity: 'HVCG',
        projectType: 'internal_operations',
        ownerId: 'person-manny',
        ownerName: 'Manny Barela',
        teamMemberIds: ['person-manny'],
        status: 'active',
        priority: 'normal',
        health: 'healthy',
        progressPercent: 0,
        sourceLinks: [],
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      assert.equal(pm.listProjects().length, 1);
      assert.equal(pm.listProjects()[0].name, 'Local JSON fixture');
    } finally {
      rmSync(dir, { recursive: true, force: true });
      if (prev.NODE_ENV === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = prev.NODE_ENV;
      if (prev.KEY === undefined) delete process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY;
      else process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = prev.KEY;
      if (prev.HOST === undefined) delete process.env.INTEGRATION_HOST;
      else process.env.INTEGRATION_HOST = prev.HOST;
      if (prev.PM === undefined) delete process.env.INTEGRATION_PM_BACKEND;
      else process.env.INTEGRATION_PM_BACKEND = prev.PM;
      if (prev.DATA === undefined) delete process.env.INTEGRATION_DATA_DIR;
      else process.env.INTEGRATION_DATA_DIR = prev.DATA;
      if (prev.REQUIRE === undefined) delete process.env.INTEGRATION_REQUIRE_AUTH;
      else process.env.INTEGRATION_REQUIRE_AUTH = prev.REQUIRE;
      if (prev.INSECURE === undefined) delete process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH;
      else process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH = prev.INSECURE;
    }
  });
});
