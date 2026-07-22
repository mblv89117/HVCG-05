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
