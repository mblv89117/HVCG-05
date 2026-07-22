/**
 * Project routing + PM operating-layer regression tests.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { PmRepository } from '../src/pm/repository.ts';
import { isValidProjectId } from '../src/pm/projectId.ts';
import { handlePmRoutes } from '../src/pm/http.ts';
import { IntegrationRepository } from '../src/store/repository.ts';
import { loadConfig } from '../src/config.ts';
import type { IncomingMessage, ServerResponse } from 'node:http';

process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
process.env.INTEGRATION_REQUIRE_AUTH = 'false';

function mockRes() {
  const chunks: Buffer[] = [];
  let statusCode = 0;
  const res = {
    writeHead(code: number) {
      statusCode = code;
    },
    end(body?: string | Buffer) {
      if (body) chunks.push(Buffer.isBuffer(body) ? body : Buffer.from(String(body)));
    },
  } as unknown as ServerResponse;
  return {
    res,
    status: () => statusCode,
    json: () => JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'),
  };
}

function mockReq(method: string, url: string, body?: unknown): IncomingMessage {
  const payload = body ? JSON.stringify(body) : '';
  const stream = {
    method,
    url,
    headers: {
      'x-atlas-user-id': 'test-owner',
      'x-atlas-organization-id': 'org-hvcg',
      'x-atlas-client-ids': '*',
      'x-atlas-roles': 'HVCG Owner',
    },
    async *[Symbol.asyncIterator]() {
      if (payload) yield Buffer.from(payload);
    },
  };
  return stream as unknown as IncomingMessage;
}

describe('project id validation', () => {
  it('rejects undefined/null/unknown/empty/demo ids', () => {
    assert.equal(isValidProjectId('undefined'), false);
    assert.equal(isValidProjectId('null'), false);
    assert.equal(isValidProjectId('unknown'), false);
    assert.equal(isValidProjectId(''), false);
    assert.equal(isValidProjectId('prj-ccb-capital'), false);
    assert.equal(isValidProjectId('  '), false);
  });

  it('accepts real uuid-like ids', () => {
    assert.equal(isValidProjectId('a1b2c3d4-e5f6-7890-abcd-ef1234567890'), true);
  });
});

describe('PM project CRUD + routing', () => {
  it('lists projects, opens valid project, rejects invalid id, archives', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-pm-'));
    const cfg = loadConfig();
    const repo = new IntegrationRepository(dir, cfg.tokenEncryptionKeyB64);
    const pm = new PmRepository(dir);

    // Create
    {
      const m = mockRes();
      const handled = await handlePmRoutes({
        cfg,
        repo,
        pm,
        req: mockReq('POST', '/api/pm/projects', {
          name: 'Colorado Beef SBA Express',
          clientName: 'Colorado Craft Beef',
          ownerName: 'Manny Barela',
          nextAction: 'Confirm package intake',
        }),
        res: m.res,
        method: 'POST',
        path: '/api/pm/projects',
      });
      assert.equal(handled, true);
      assert.equal(m.status(), 200);
      const created = m.json().project;
      assert.ok(created.id);
      assert.equal(created.name, 'Colorado Beef SBA Express');

      // List
      {
        const list = mockRes();
        await handlePmRoutes({
          cfg,
          repo,
          pm,
          req: mockReq('GET', '/api/pm/projects'),
          res: list.res,
          method: 'GET',
          path: '/api/pm/projects',
        });
        assert.equal(list.status(), 200);
        assert.equal(list.json().projects.length, 1);
      }

      // Open valid
      {
        const detail = mockRes();
        await handlePmRoutes({
          cfg,
          repo,
          pm,
          req: mockReq('GET', `/api/pm/projects/${created.id}`),
          res: detail.res,
          method: 'GET',
          path: `/api/pm/projects/${created.id}`,
        });
        assert.equal(detail.status(), 200);
        assert.equal(detail.json().project.id, created.id);
        assert.ok(detail.json().board);
      }

      // Invalid id
      {
        const bad = mockRes();
        await handlePmRoutes({
          cfg,
          repo,
          pm,
          req: mockReq('GET', '/api/pm/projects/undefined'),
          res: bad.res,
          method: 'GET',
          path: '/api/pm/projects/undefined',
        });
        assert.equal(bad.status(), 404);
        assert.equal(bad.json().error, 'invalid_project_id');
      }

      // Task persist + board column
      {
        const taskRes = mockRes();
        await handlePmRoutes({
          cfg,
          repo,
          pm,
          req: mockReq('POST', '/api/pm/tasks', {
            title: 'Collect tax returns',
            projectId: created.id,
            status: 'ready',
          }),
          res: taskRes.res,
          method: 'POST',
          path: '/api/pm/tasks',
        });
        assert.equal(taskRes.status(), 200);
        const taskId = taskRes.json().task.id;

        const patch = mockRes();
        await handlePmRoutes({
          cfg,
          repo,
          pm,
          req: mockReq('PATCH', `/api/pm/tasks/${taskId}`, { status: 'in_progress' }),
          res: patch.res,
          method: 'PATCH',
          path: `/api/pm/tasks/${taskId}`,
        });
        assert.equal(patch.status(), 200);
        assert.equal(patch.json().task.status, 'in_progress');
      }

      // Archive
      {
        const arch = mockRes();
        await handlePmRoutes({
          cfg,
          repo,
          pm,
          req: mockReq('POST', `/api/pm/projects/${created.id}/archive`, {}),
          res: arch.res,
          method: 'POST',
          path: `/api/pm/projects/${created.id}/archive`,
        });
        assert.equal(arch.status(), 200);
        assert.equal(arch.json().project.status, 'archived');
      }
    }

    rmSync(dir, { recursive: true, force: true });
  });
});

describe('populate matching + preview idempotency', () => {
  it('matches Lienpartners to Lien Partners without creating a second project', async () => {
    const { previewPopulateFromMicrosoft, populateRealWorkFromMicrosoft } = await import(
      '../src/pm/populateReal.ts'
    );
    const { bootstrapKnownProjects } = await import('../src/pm/bootstrap.ts');
    const dir = mkdtempSync(join(tmpdir(), 'atlas-pm-lien-'));
    const cfg = loadConfig();
    const repo = new IntegrationRepository(dir, cfg.tokenEncryptionKeyB64);
    const pm = new PmRepository(dir);

    const clients = [
      {
        id: 'client-lien01',
        displayName: 'Lien Partners',
        legalName: 'Lien Partners',
        domains: ['lienpartners.com'],
        emails: [] as string[],
        lifecycle: 'active' as const,
        completenessScore: 50,
        associations: {
          documents: [{ id: 'd1' }],
          emails: [],
          meetings: [{ id: 'm1' }, { id: 'm2' }],
        },
        sourceRefs: [
          {
            providerId: 'microsoft',
            connectionId: 'c',
            sourceRecordId: 'r1',
            kind: 'file',
            title: 'x',
          },
        ],
        businessEntities: ['HVS'],
        recommendedNextActions: ['Open HVS source links'],
      },
    ];
    repo.saveClient360(clients as never);

    bootstrapKnownProjects(
      pm,
      clients.map((c) => ({
        id: c.id,
        displayName: c.displayName,
        domains: c.domains,
        completenessScore: c.completenessScore,
      })),
    );
    // Force the historical mismatch: bootstrap clientName without space/id
    const lien = pm.listProjects().find((p) => p.name === 'Lien Partners Engagement');
    assert.ok(lien);
    pm.upsertProject({
      ...lien!,
      clientId: undefined,
      clientName: 'Lienpartners',
      tags: ['lienpartner', 'lien partners'],
    });

    const before = pm.listProjects().filter((p) => p.name === 'Lien Partners Engagement').length;
    assert.equal(before, 1);

    const preview1 = previewPopulateFromMicrosoft(pm, repo);
    assert.equal(preview1.dryRun, true);
    assert.equal(
      preview1.projectsToCreate.filter((p) => /lien/i.test(p.name)).length,
      0,
      JSON.stringify(preview1.projectsToCreate),
    );
    const preview2 = previewPopulateFromMicrosoft(pm, repo);
    assert.equal(preview2.projectsToCreate.length, preview1.projectsToCreate.length);

    populateRealWorkFromMicrosoft(pm, repo);
    const after = pm.listProjects().filter((p) => p.name === 'Lien Partners Engagement');
    assert.equal(after.length, 1, 'populate must not create Lien Partners duplicate');
    assert.equal(after[0].clientId, 'client-lien01');

    rmSync(dir, { recursive: true, force: true });
  });

  it('create project defaults health to unknown and omits fabricated next action', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-pm-qa-'));
    const cfg = loadConfig();
    const repo = new IntegrationRepository(dir, cfg.tokenEncryptionKeyB64);
    const pm = new PmRepository(dir);
    const m = mockRes();
    await handlePmRoutes({
      cfg,
      repo,
      pm,
      req: mockReq('POST', '/api/pm/projects', {
        name: 'Atlas Production QA Verification',
        clientName: 'High Value Capital Group',
        businessEntity: 'HVCG',
        projectType: 'internal_operations',
        ownerName: 'Manny Barela',
        tags: ['qa', 'internal', 'non-client', 'safe-to-archive'],
      }),
      res: m.res,
      method: 'POST',
      path: '/api/pm/projects',
    });
    assert.equal(m.status(), 200);
    const created = m.json().project;
    assert.equal(created.health, 'unknown');
    assert.equal(created.nextAction == null || created.nextAction === '', true);

    const id = created.id;
    {
      const m2 = mockRes();
      await handlePmRoutes({
        cfg,
        repo,
        pm,
        req: mockReq('PATCH', `/api/pm/projects/${id}`, {
          name: 'Atlas Production QA Verification (edited)',
        }),
        res: m2.res,
        method: 'PATCH',
        path: `/api/pm/projects/${id}`,
      });
      assert.equal(m2.status(), 200);
      assert.match(m2.json().project.name, /edited/);
    }
    {
      const m3 = mockRes();
      await handlePmRoutes({
        cfg,
        repo,
        pm,
        req: mockReq('POST', `/api/pm/projects/${id}/archive`, {}),
        res: m3.res,
        method: 'POST',
        path: `/api/pm/projects/${id}/archive`,
      });
      assert.equal(m3.status(), 200);
      assert.equal(m3.json().project.status, 'archived');
    }
    assert.equal(pm.listProjects().some((p) => p.id === id), false);
    assert.ok(pm.getProject(id)?.status === 'archived' || pm.getProject(id)?.archivedAt);
    rmSync(dir, { recursive: true, force: true });
  });
});
