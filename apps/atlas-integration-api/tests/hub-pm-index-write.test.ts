import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PmHttpError } from '../src/pm/sharepoint/errors.ts';
import {
  asGraphUrlField,
  describeGraphListWriteError,
  existingClientLookupId,
  formatGraphWriteFailure,
  retryIndexWrite,
  toSharePointDateTime,
} from '../src/pm/sharepoint/indexWrite.ts';
import {
  businessFileSearchRequest,
  isRecordedAppOnlyFileSearchRejection,
  isRejectedAppOnlyFileSearch,
} from '../src/pm/sharepoint/fabric/files.ts';
import { SharePointPmService } from '../src/pm/sharepoint/repository.ts';
import type { GraphListItem, GraphListPage, PmGraphTransport } from '../src/pm/sharepoint/graph.ts';
import { runFabricSync } from '../src/pm/sharepoint/fabric/sync.ts';
import { inspectFabricSyncHealth } from '../src/pm/sharepoint/fabric/status.ts';
import { MANNY_ENTRA_OID } from '../src/pm/sharepoint/manny.ts';

const SITE =
  'contoso.sharepoint.com,11111111-1111-4111-8111-111111111011,22222222-2222-4222-8222-222222222022';
const PROJECTS = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const TASKS = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
const MILESTONES = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1';
const CLIENTS = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1';
const COMMS = 'ffffffff-ffff-4fff-8fff-fffffffffff3';
const MEETINGS = 'ffffffff-ffff-4fff-8fff-fffffffffff4';
const MI = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1';

const COMM_SCHEMA = new Set([
  'Title',
  'ClientIdLookupId',
  'ClientCode',
  'Channel',
  'Direction',
  'CommunicationDate',
  'Summary',
]);
const MEETING_SCHEMA = new Set([
  'Title',
  'ClientIdLookupId',
  'ClientCode',
  'MeetingType',
  'MeetingDate',
  'Summary',
  'OutlookEventLink',
]);

function transportHttp0(): PmHttpError {
  return new PmHttpError(
    503,
    'PM_BACKEND_UNAVAILABLE',
    'SharePoint PM Graph transport failed (HTTP 0).',
    'unavailable',
  );
}

const instantRetry = { sleep: async () => undefined };

class SchemaGraph implements PmGraphTransport {
  readonly lists = new Map<string, GraphListItem[]>();
  readonly creates: Array<Record<string, unknown>> = [];
  meetingHttp0Remaining = 0;
  nextId = 1;

  constructor() {
    this.lists.set(CLIENTS, []);
    this.lists.set(COMMS, []);
    this.lists.set(MEETINGS, []);
  }

  seed(listId: string, fields: Record<string, unknown>, id?: string): GraphListItem {
    const item: GraphListItem = {
      id: id || String(this.nextId++),
      etag: `"etag-${this.nextId}"`,
      fields: { ...fields },
    };
    const arr = this.lists.get(listId) || [];
    arr.push(item);
    this.lists.set(listId, arr);
    return item;
  }

  async listItems(listId: string): Promise<GraphListPage> {
    return { items: this.lists.get(listId) || [] };
  }

  async getItem(listId: string, itemId: string): Promise<GraphListItem | null> {
    return (this.lists.get(listId) || []).find((item) => item.id === itemId) || null;
  }

  async createItem(listId: string, fields: Record<string, unknown>): Promise<GraphListItem> {
    this.creates.push({ listId, ...fields });
    if (listId === MEETINGS && this.meetingHttp0Remaining > 0) {
      this.meetingHttp0Remaining -= 1;
      throw transportHttp0();
    }
    const schema = listId === MEETINGS ? MEETING_SCHEMA : COMM_SCHEMA;
    const unknown = Object.keys(fields).filter((key) => !schema.has(key));
    if (unknown.length) {
      throw new PmHttpError(
        503,
        'PM_BACKEND_UNAVAILABLE',
        formatGraphWriteFailure(400, {
          error: {
            code: 'invalidRequest',
            message: `Field '${unknown[0]}' is not recognized as a valid field`,
          },
        }),
      );
    }
    if (listId === COMMS && !fields.CommunicationDate) {
      throw new PmHttpError(
        503,
        'PM_BACKEND_UNAVAILABLE',
        formatGraphWriteFailure(400, {
          error: { code: 'invalidRequest', message: 'A value must be specified for CommunicationDate which is required.' },
        }),
      );
    }
    if (listId === MEETINGS && !fields.MeetingType) {
      throw new PmHttpError(
        503,
        'PM_BACKEND_UNAVAILABLE',
        formatGraphWriteFailure(500, {
          error: { code: 'generalException', message: 'MeetingType is required.' },
        }),
      );
    }
    if (listId === MEETINGS && typeof fields.OutlookEventLink === 'string') {
      throw new PmHttpError(
        503,
        'PM_BACKEND_UNAVAILABLE',
        formatGraphWriteFailure(500, {
          error: { code: 'invalidRequest', message: 'The field OutlookEventLink value is not valid.' },
        }),
      );
    }
    return this.seed(listId, fields);
  }

  async patchItemFields(): Promise<GraphListItem> {
    throw new Error('not used');
  }
}

function service(graph: SchemaGraph): SharePointPmService {
  return new SharePointPmService(
    {
      siteId: SITE,
      projectsListId: PROJECTS,
      tasksListId: TASKS,
      milestonesListId: MILESTONES,
      clientsListId: CLIENTS,
      communicationsListId: COMMS,
      meetingsListId: MEETINGS,
      managedIdentityClientId: MI,
    },
    graph,
    async () => ({ ok: false, reason: 'empty' }),
  );
}

describe('Graph list-write error mapping', () => {
  it('maps HTTP 400 unknown field without leaking tokens, subjects, or ClientCodes', () => {
    const info = describeGraphListWriteError(400, {
      error: {
        code: 'invalidRequest',
        message:
          "Field 'HVCG_IdempotencyKey' is not recognized. Subject 'Colorado Craft Beef term sheet' ClientCode CCB01 token Bearer abc.def.ghi",
      },
    });
    assert.equal(info.graphCode, 'invalidRequest');
    assert.deepEqual(info.fields, ['HVCG_IdempotencyKey']);
    assert.equal(info.mismatch, 'unknown_field');
    assert.equal(/CCB01|Bearer abc|Colorado Craft Beef|term sheet/i.test(info.sanitizedMessage), false);
    const formatted = formatGraphWriteFailure(400, {
      error: { code: 'invalidRequest', message: "Field 'HVCG_IdempotencyKey' is not recognized" },
    });
    assert.match(formatted, /HTTP 400/);
    assert.match(formatted, /graphCode=invalidRequest/);
    assert.match(formatted, /field=HVCG_IdempotencyKey/);
    assert.match(formatted, /mismatch=unknown_field/);
  });

  it('retries a missing/invalid field payload and succeeds without inventing ClientCodes', async () => {
    const writes: Array<Record<string, unknown>> = [];
    const result = await retryIndexWrite(
      async (fields) => {
        writes.push({ ...fields });
        if (fields.HVCG_IdempotencyKey) {
          throw new PmHttpError(
            503,
            'PM_BACKEND_UNAVAILABLE',
            formatGraphWriteFailure(400, {
              error: { code: 'invalidRequest', message: "Field 'HVCG_IdempotencyKey' is not recognized as a valid field" },
            }),
          );
        }
        return { id: '1', fields };
      },
      {
        Title: 'Indexed thread',
        Summary: 'Key:mail:conv-1',
        Channel: 'Email',
        CommunicationDate: '2026-08-24T00:00:00.000Z',
        HVCG_IdempotencyKey: 'mail:conv-1',
      },
      'communication',
    );
    assert.equal(writes.length, 2);
    assert.equal(writes[0]?.HVCG_IdempotencyKey, 'mail:conv-1');
    assert.equal(writes[1]?.HVCG_IdempotencyKey, undefined);
    assert.equal(writes[1]?.Title, 'Indexed thread');
    assert.equal(result.id, '1');
    assert.equal(Object.values(writes[1] || {}).some((value) => /PDG01|CCB99/.test(String(value))), false);
  });

  it('normalizes calendar DateTime values that lack a timezone', () => {
    assert.equal(toSharePointDateTime('2026-08-24T15:00:00.0000000')?.endsWith('Z'), true);
    assert.ok(toSharePointDateTime('2026-08-24T00:00:00Z'));
  });

  it('drops Hyperlink fields that exceed the SharePoint 255-char URL limit', () => {
    const short = asGraphUrlField('https://outlook.office.com/calendar/e1');
    assert.deepEqual(short, { Url: 'https://outlook.office.com/calendar/e1', Description: 'Source' });
    const long = asGraphUrlField(`https://outlook.office.com/owa/?itemid=${'A'.repeat(300)}`);
    assert.equal(long, undefined);
    assert.equal(existingClientLookupId('12'), 12);
    assert.equal(existingClientLookupId('not-a-list-id'), undefined);
  });

  it('retries a meeting invalidRequest down to required MeetingType/date fields', async () => {
    const writes: Array<Record<string, unknown>> = [];
    const result = await retryIndexWrite(
      async (fields) => {
        writes.push({ ...fields });
        if (fields.OutlookEventLink || fields.Summary) {
          throw new PmHttpError(
            503,
            'PM_BACKEND_UNAVAILABLE',
            formatGraphWriteFailure(400, {
              error: { code: 'invalidRequest', message: 'The request is malformed or incorrect.' },
            }),
          );
        }
        return { id: 'm1', fields };
      },
      {
        Title: 'Weekly',
        MeetingType: 'Other',
        MeetingDate: '2026-08-24T15:00:00.000Z',
        Summary: 'Status Key:cal:e1',
        OutlookEventLink: { Url: 'https://outlook.office.com/calendar/e1', Description: 'Source' },
      },
      'meeting',
    );
    assert.equal(result.id, 'm1');
    assert.ok(writes.length >= 2);
    const last = writes[writes.length - 1] || {};
    assert.equal(last.Title, 'Weekly');
    assert.equal(last.MeetingType, 'Other');
    assert.ok(last.MeetingDate);
    assert.equal(last.OutlookEventLink, undefined);
    assert.equal(last.Summary, undefined);
  });

  it('retries meeting createItem once after Graph transport HTTP 0 and writes MeetingType/date', async () => {
    const writes: Array<Record<string, unknown>> = [];
    const result = await retryIndexWrite(
      async (fields) => {
        writes.push({ ...fields });
        if (writes.length === 1) throw transportHttp0();
        return { id: 'm-http0', fields };
      },
      {
        Title: 'Weekly',
        MeetingType: 'Other',
        MeetingDate: '2026-08-24T15:00:00.000Z',
      },
      'meeting',
      instantRetry,
    );
    assert.equal(result.id, 'm-http0');
    assert.equal(writes.length, 2);
    assert.equal(writes[1]?.MeetingType, 'Other');
    assert.equal(writes[1]?.MeetingDate, '2026-08-24T15:00:00.000Z');
    assert.equal(writes[1]?.Title, 'Weekly');
  });

  it('retries socket hang up twice then succeeds without changing the meeting payload', async () => {
    const writes: Array<Record<string, unknown>> = [];
    const result = await retryIndexWrite(
      async (fields) => {
        writes.push({ ...fields });
        if (writes.length < 3) throw new Error('socket hang up');
        return { id: 'm-hang', fields };
      },
      {
        Title: 'Weekly',
        MeetingType: 'Other',
        MeetingDate: '2026-08-24T15:00:00.000Z',
      },
      'meeting',
      instantRetry,
    );
    assert.equal(result.id, 'm-hang');
    assert.equal(writes.length, 3);
    assert.deepEqual(writes[0], writes[2]);
  });

  it('exhausts HTTP 0 retries and rethrows the sanitized transport message', async () => {
    const writes: Array<Record<string, unknown>> = [];
    await assert.rejects(
      () =>
        retryIndexWrite(
          async (fields) => {
            writes.push({ ...fields });
            throw transportHttp0();
          },
          {
            Title: 'Weekly',
            MeetingType: 'Other',
            MeetingDate: '2026-08-24T15:00:00.000Z',
          },
          'meeting',
          instantRetry,
        ),
      (err: unknown) => {
        assert.ok(err instanceof PmHttpError);
        assert.match(err.message, /SharePoint PM Graph transport failed \(HTTP 0\)/);
        assert.equal(/Bearer |CCB01|PDG01/i.test(err.message), false);
        return true;
      },
    );
    assert.equal(writes.length, 3);
  });

  it('keeps HTTP 400 unknown-field on the payload-shrink path without transport retries', async () => {
    const writes: Array<Record<string, unknown>> = [];
    let slept = 0;
    const result = await retryIndexWrite(
      async (fields) => {
        writes.push({ ...fields });
        if (fields.HVCG_IdempotencyKey) {
          throw new PmHttpError(
            503,
            'PM_BACKEND_UNAVAILABLE',
            formatGraphWriteFailure(400, {
              error: { code: 'invalidRequest', message: "Field 'HVCG_IdempotencyKey' is not recognized as a valid field" },
            }),
          );
        }
        return { id: '1', fields };
      },
      {
        Title: 'Indexed thread',
        Summary: 'Key:mail:conv-1',
        Channel: 'Email',
        CommunicationDate: '2026-08-24T00:00:00.000Z',
        HVCG_IdempotencyKey: 'mail:conv-1',
      },
      'communication',
      { sleep: async () => {
          slept += 1;
        } },
    );
    assert.equal(result.id, '1');
    assert.equal(writes.length, 2);
    assert.equal(slept, 0);
    assert.equal(writes[1]?.HVCG_IdempotencyKey, undefined);
  });

  it('does not retry HTTP 401 or 403 as transport HTTP 0', async () => {
    for (const status of [401, 403]) {
      const writes: Array<Record<string, unknown>> = [];
      let slept = 0;
      await assert.rejects(
        () =>
          retryIndexWrite(
            async (fields) => {
              writes.push({ ...fields });
              throw new PmHttpError(
                status,
                'PM_BACKEND_UNAVAILABLE',
                `SharePoint PM permission or token was rejected (HTTP ${status}).`,
                'unavailable',
              );
            },
            {
              Title: 'Weekly',
              MeetingType: 'Other',
              MeetingDate: '2026-08-24T15:00:00.000Z',
            },
            'meeting',
            { sleep: async () => {
                slept += 1;
              } },
          ),
        (err: unknown) => {
          assert.ok(err instanceof PmHttpError);
          assert.equal((err as PmHttpError).status, status);
          assert.match((err as PmHttpError).message, /permission or token was rejected/);
          assert.equal(/HTTP 0/.test((err as PmHttpError).message), false);
          return true;
        },
      );
      assert.equal(writes.length, 1, `HTTP ${status} must not be retried`);
      assert.equal(slept, 0, `HTTP ${status} must not use transport backoff`);
    }
  });
});

describe('SharePoint index write schema mapping', () => {
  it('writes communication rows onto the existing list schema and increments mailThreads', async () => {
    const graph = new SchemaGraph();
    graph.seed(CLIENTS, { Title: 'Colorado Craft Beef', ClientCode: 'CCB01', ClientStage: 'Active Client' }, '12');
    const svc = service(graph);
    await svc.upsertCommunicationIndex({
      title: 'Colorado Craft Beef capital update',
      summary: 'Please review the packet.',
      clientCode: 'CCB01',
      date: '2026-08-24T00:00:00Z',
      channel: 'Email',
      direction: 'Inbound',
      webUrl: 'https://outlook.office.com/mail/m1',
      sourceMessageId: 'm1',
      conversationId: 'conv-1',
      classification: 'CLIENT',
      provenanceSource: 'outlook-mail',
      sourceOrg: 'HVCG',
      idempotencyKey: 'mail:conv-1',
    });
    const created = graph.lists.get(COMMS)?.[0];
    assert.ok(created);
    assert.equal(created?.fields.Title, 'Colorado Craft Beef capital update');
    assert.equal(created?.fields.ClientCode, 'CCB01');
    assert.equal(created?.fields.ClientIdLookupId, 12);
    assert.equal(created?.fields.Channel, 'Email');
    assert.ok(created?.fields.CommunicationDate);
    assert.equal(created?.fields.HVCG_IdempotencyKey, undefined);
    assert.equal(created?.fields.OutlookWebLink, undefined);
    assert.equal(created?.fields.SourceMessageId, undefined);
    assert.match(String(created?.fields.Summary || ''), /Key:mail:conv-1/);
    assert.equal(graph.creates.some((row) => 'HVCG_IdempotencyKey' in row), false);

    const dir = mkdtempSync(join(tmpdir(), 'fabric-index-write-'));
    try {
      const result = await runFabricSync({
        service: svc,
        fabric: {
          async getJson(path: string) {
            if (path.includes('/mailFolders/inbox/messages/delta')) {
              return {
                status: 200,
                json: {
                  value: [
                    {
                      id: 'm2',
                      conversationId: 'conv-2',
                      subject: 'Colorado Craft Beef follow-up',
                      bodyPreview: 'Packet received.',
                      receivedDateTime: '2026-08-24T01:00:00Z',
                      from: { emailAddress: { address: 'client@example.com' } },
                    },
                  ],
                  '@odata.deltaLink': `/v1.0/users/${MANNY_ENTRA_OID}/mailFolders/inbox/messages/delta?$deltatoken=abc`,
                },
              };
            }
            return { status: 404, json: {} };
          },
          async postJson() {
            return { status: 403, json: {} };
          },
        } as never,
        dataDir: dir,
        bootstrap: true,
      });
      assert.equal(result.indexed.mailThreads, 1);
      assert.equal(result.notes.some((note) => /mail index write skipped/.test(note)), false);
      const health = inspectFabricSyncHealth(dir, { sweepEnabled: true });
      assert.equal(/CCB99|PDG01|deltatoken|Bearer /i.test(JSON.stringify(health)), false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('does not invent ClientCodes when the classified client is absent', async () => {
    const graph = new SchemaGraph();
    const svc = service(graph);
    await svc.upsertCommunicationIndex({
      title: 'Unmapped thread',
      summary: 'No existing client.',
      clientCode: 'PDG01',
      date: '2026-08-24T00:00:00Z',
      idempotencyKey: 'mail:unmapped',
    });
    const created = graph.lists.get(COMMS)?.[0];
    assert.ok(created);
    assert.equal(created?.fields.ClientCode, undefined);
    assert.equal(created?.fields.ClientIdLookupId, undefined);
    assert.equal(graph.lists.get(CLIENTS)?.length, 0);
  });

  it('writes meeting rows with required MeetingType and URL object', async () => {
    const graph = new SchemaGraph();
    graph.seed(CLIENTS, { Title: 'Colorado Craft Beef', ClientCode: 'CCB01' }, '12');
    const svc = service(graph);
    await svc.upsertMeetingIndex({
      title: 'Weekly',
      summary: 'Status',
      clientCode: 'CCB01',
      date: '2026-08-24T15:00:00.0000000',
      webUrl: 'https://outlook.office.com/calendar/e1',
      sourceEventId: 'e1',
      idempotencyKey: 'cal:e1',
    });
    const created = graph.lists.get(MEETINGS)?.[0];
    assert.equal(created?.fields.MeetingType, 'Client');
    assert.equal(typeof created?.fields.MeetingDate, 'string');
    assert.equal(String(created?.fields.MeetingDate).endsWith('Z'), true);
    assert.deepEqual(created?.fields.OutlookEventLink, {
      Url: 'https://outlook.office.com/calendar/e1',
      Description: 'Source',
    });
    assert.equal(created?.fields.HVCG_IdempotencyKey, undefined);
  });

  it('omits OutlookEventLink when the Graph webLink exceeds the Hyperlink limit', async () => {
    const graph = new SchemaGraph();
    const svc = service(graph);
    await svc.upsertMeetingIndex({
      title: 'Internal standup',
      summary: 'Notes',
      date: '2026-08-24T15:00:00.0000000',
      webUrl: `https://outlook.office.com/owa/?itemid=${'A'.repeat(300)}`,
      sourceEventId: 'e-long',
      idempotencyKey: 'cal:e-long',
    });
    const created = graph.lists.get(MEETINGS)?.[0];
    assert.equal(created?.fields.MeetingType, 'Other');
    assert.equal(created?.fields.OutlookEventLink, undefined);
    assert.match(String(created?.fields.Summary || ''), /Key:cal:e-long/);
    assert.equal(created?.fields.ClientCode, undefined);
    assert.equal(created?.fields.ClientIdLookupId, undefined);
  });
});

describe('Fabric notes stay sanitized when a mapped 400 skips a write', () => {
  it('records field-mapped HTTP 400 and leaves mailThreads at 0', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'fabric-index-400-'));
    try {
      const result = await runFabricSync({
        service: {
          async listClientHints() {
            return [{ clientCode: 'CCB01', displayName: 'Colorado Craft Beef' }];
          },
          async upsertCommunicationIndex() {
            throw new PmHttpError(
              503,
              'PM_BACKEND_UNAVAILABLE',
              formatGraphWriteFailure(400, {
                error: { code: 'invalidRequest', message: "Field 'HVCG_IdempotencyKey' is not recognized" },
              }),
            );
          },
          async upsertMeetingIndex() {
            /* unused */
          },
          async upsertContactIndex() {
            /* unused */
          },
        } as never,
        fabric: {
          async getJson(path: string) {
            if (path.includes('/mailFolders/inbox/messages/delta')) {
              return {
                status: 200,
                json: {
                  value: [
                    {
                      id: 'm1',
                      conversationId: 'conv-1',
                      subject: 'Colorado Craft Beef capital update',
                      receivedDateTime: '2026-08-24T00:00:00Z',
                    },
                  ],
                  '@odata.deltaLink': `/v1.0/users/${MANNY_ENTRA_OID}/mailFolders/inbox/messages/delta?$deltatoken=abc`,
                },
              };
            }
            return { status: 404, json: {} };
          },
          async postJson() {
            return { status: 403, json: {} };
          },
        } as never,
        dataDir: dir,
        bootstrap: true,
      });
      assert.equal(result.indexed.mailThreads, 0);
      assert.ok(result.notes.some((note) => /mail index write skipped/.test(note) && /HTTP 400/.test(note)));
      assert.ok(result.notes.some((note) => /field=HVCG_IdempotencyKey/.test(note)));
      assert.ok(result.notes.some((note) => /Mail delta reached HTTP 200/.test(note)));
      const health = inspectFabricSyncHealth(dir, { sweepEnabled: true });
      assert.equal(/CCB99|PDG01|deltatoken|Bearer |Colorado Craft Beef/i.test(JSON.stringify(health)), false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('persists mail threads and meeting rows without calling app-only OneDrive recent', async () => {
    const graph = new SchemaGraph();
    graph.seed(CLIENTS, { Title: 'Colorado Craft Beef', ClientCode: 'CCB01', ClientStage: 'Active Client' }, '12');
    const svc = service(graph);
    const dir = mkdtempSync(join(tmpdir(), 'fabric-meetings-files-'));
    const paths: string[] = [];
    const searchBodies: unknown[] = [];
    try {
      const result = await runFabricSync({
        service: svc,
        fabric: {
          async getJson(path: string) {
            paths.push(path);
            if (path.includes('/mailFolders/inbox/messages/delta')) {
              return {
                status: 200,
                json: {
                  value: [
                    {
                      id: 'm-live',
                      conversationId: 'conv-live',
                      subject: 'Colorado Craft Beef follow-up',
                      bodyPreview: 'Packet received.',
                      receivedDateTime: '2026-08-24T01:00:00Z',
                      from: { emailAddress: { address: 'client@example.com' } },
                    },
                  ],
                  '@odata.deltaLink': `/v1.0/users/${MANNY_ENTRA_OID}/mailFolders/inbox/messages/delta?$deltatoken=abc`,
                },
              };
            }
            if (path.includes('/calendar/events')) {
              return {
                status: 200,
                json: {
                  value: [
                    {
                      id: 'evt-1',
                      subject: 'Colorado Craft Beef weekly',
                      bodyPreview: 'Status.',
                      start: { dateTime: '2026-08-24T15:00:00.0000000', timeZone: 'UTC' },
                      webLink: `https://outlook.office.com/owa/?itemid=${'A'.repeat(300)}`,
                      attendees: [{ emailAddress: { address: 'ops@example.com' } }],
                    },
                  ],
                },
              };
            }
            return { status: 404, json: {} };
          },
          async postJson(path: string, body: unknown) {
            paths.push(`POST ${path}`);
            searchBodies.push(body);
            return {
              status: 400,
              json: { error: { code: 'invalidRequest', message: 'The request is malformed or incorrect.' } },
            };
          },
        } as never,
        dataDir: dir,
        bootstrap: true,
      });
      assert.equal(result.indexed.mailThreads, 1);
      assert.equal(result.indexed.meetings, 1);
      assert.equal(paths.some((path) => /\/drive\/recent/i.test(path)), false);
      assert.ok(result.notes.some((note) => /OneDrive recent skipped/.test(note) && /not supported/.test(note)));
      assert.equal(result.notes.filter((note) => /File search skipped/.test(note)).length, 1);
      assert.equal(result.checkpoint.fileSearchLastStatus, 400);
      assert.equal(result.checkpoint.fileSearchRejectedAppOnly, true);
      const searchHealth = inspectFabricSyncHealth(dir, { sweepEnabled: true });
      assert.equal(searchHealth.fileSearch.status, 'skipped');
      assert.match(searchHealth.fileSearch.reason, /HTTP 400/);
      assert.equal(/LIVE/i.test(JSON.stringify(searchHealth.fileSearch)), false);
      assert.equal(searchBodies.length, 1);
      const req = (searchBodies[0] as { requests?: Array<{ query?: { queryString?: string }; region?: string }> })
        ?.requests?.[0];
      assert.match(String(req?.queryString || req?.query?.queryString || ''), /site:https:\/\/.+ isDocument:true/);
      assert.equal(req?.region, 'US');
      assert.equal(result.notes.some((note) => /mail index write skipped/.test(note)), false);
      const meeting = graph.lists.get(MEETINGS)?.[0];
      assert.equal(meeting?.fields.MeetingType, 'Client');
      assert.equal(meeting?.fields.OutlookEventLink, undefined);
      const health = inspectFabricSyncHealth(dir, { sweepEnabled: true });
      assert.equal(/CCB99|PDG01|deltatoken|Bearer |Colorado Craft Beef/i.test(JSON.stringify(health)), false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('Meeting index write retries transient Graph HTTP 0', () => {
  function calendarFabric() {
    return {
      async getJson(path: string) {
        if (path.includes('/mailFolders/inbox/messages/delta')) {
          return {
            status: 200,
            json: {
              value: [],
              '@odata.deltaLink': `/v1.0/users/${MANNY_ENTRA_OID}/mailFolders/inbox/messages/delta?$deltatoken=abc`,
            },
          };
        }
        if (path.includes('/calendar/events')) {
          return {
            status: 200,
            json: {
              value: [
                {
                  id: 'evt-http0',
                  subject: 'Colorado Craft Beef weekly',
                  bodyPreview: 'Status.',
                  start: { dateTime: '2026-08-24T15:00:00.0000000', timeZone: 'UTC' },
                  webLink: 'https://outlook.office.com/calendar/e-http0',
                },
              ],
            },
          };
        }
        return { status: 404, json: {} };
      },
      async postJson() {
        return { status: 403, json: {} };
      },
    } as never;
  }

  it('writes the meeting row after the first createItem HTTP 0 and does not fabricate LIVE honesty', async () => {
    const graph = new SchemaGraph();
    graph.seed(CLIENTS, { Title: 'Colorado Craft Beef', ClientCode: 'CCB01', ClientStage: 'Active Client' }, '12');
    graph.meetingHttp0Remaining = 1;
    const svc = service(graph);
    const dir = mkdtempSync(join(tmpdir(), 'fabric-meeting-http0-retry-'));
    try {
      const result = await runFabricSync({
        service: svc,
        fabric: calendarFabric(),
        dataDir: dir,
        bootstrap: true,
      });
      assert.equal(result.indexed.meetings, 1);
      assert.equal(result.notes.some((note) => /meeting index write skipped/.test(note)), false);
      const created = graph.lists.get(MEETINGS)?.[0];
      assert.equal(created?.fields.MeetingType, 'Client');
      assert.ok(created?.fields.MeetingDate);
      assert.equal(graph.creates.filter((row) => row.listId === MEETINGS).length, 2);
      const health = inspectFabricSyncHealth(dir, { sweepEnabled: true });
      assert.ok(health.honesty === 'delta' || health.honesty === 'degraded');
      assert.equal(health.notes.some((note) => /meeting index write skipped|transport failed \(HTTP 0\)/.test(note)), false);
      assert.equal(/LIVE/i.test(JSON.stringify(health.fileSearch)), false);
      assert.equal(/CCB99|PDG01|deltatoken|Bearer /i.test(JSON.stringify(health)), false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('keeps honesty degraded and the HTTP 0 skip note when transport retries exhaust', async () => {
    const graph = new SchemaGraph();
    graph.seed(CLIENTS, { Title: 'Colorado Craft Beef', ClientCode: 'CCB01', ClientStage: 'Active Client' }, '12');
    graph.meetingHttp0Remaining = 3;
    const svc = service(graph);
    const dir = mkdtempSync(join(tmpdir(), 'fabric-meeting-http0-exhaust-'));
    try {
      const result = await runFabricSync({
        service: svc,
        fabric: calendarFabric(),
        dataDir: dir,
        bootstrap: true,
      });
      assert.equal(result.indexed.meetings, 0);
      assert.ok(
        result.notes.some(
          (note) => /SharePoint meeting index write skipped/.test(note) && /HTTP 0/.test(note),
        ),
      );
      assert.equal(result.notes.some((note) => /Bearer |CCB01|PDG01|Colorado Craft Beef/i.test(note)), false);
      assert.equal(graph.lists.get(MEETINGS)?.length || 0, 0);
      const health = inspectFabricSyncHealth(dir, { sweepEnabled: true });
      assert.equal(health.honesty, 'degraded');
      assert.ok(health.notes.some((note) => /meeting index write skipped/.test(note) && /HTTP 0/.test(note)));
      assert.equal(/LIVE/i.test(JSON.stringify(health.fileSearch)), false);
      assert.equal(/CCB99|PDG01|deltatoken|Bearer /i.test(JSON.stringify(health)), false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('Business file search query shape', () => {
  it('uses site restriction and region instead of path= AND isDocument=true', () => {
    const body = businessFileSearchRequest('https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients');
    const req = (body.requests as Array<Record<string, unknown>>)[0];
    assert.equal(req.region, 'US');
    assert.equal(
      (req.query as { queryString?: string }).queryString,
      'site:https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients isDocument:true',
    );
    assert.equal(/path:"/.test(String((req.query as { queryString?: string }).queryString)), false);
  });
});

describe('Rejected Graph fileSearch short-circuit', () => {
  function mailAndCalendarFabric(paths: string[], search: { status: number; json: Record<string, unknown> }) {
    return {
      async getJson(path: string) {
        paths.push(path);
        if (path.includes('/mailFolders/inbox/messages/delta')) {
          return {
            status: 200,
            json: {
              value: [],
              '@odata.deltaLink': `/v1.0/users/${MANNY_ENTRA_OID}/mailFolders/inbox/messages/delta?$deltatoken=abc`,
            },
          };
        }
        if (path.includes('/calendar/events')) {
          return { status: 200, json: { value: [] } };
        }
        return { status: 404, json: {} };
      },
      async postJson(path: string) {
        paths.push(`POST ${path}`);
        return search;
      },
    } as never;
  }

  it('classifies HTTP 400 invalid_request / BadRequest and HTTP 0 graph_request_failed as app-only rejection', () => {
    assert.equal(
      isRejectedAppOnlyFileSearch(400, { error: { code: 'BadRequest', message: 'invalid_request' } }),
      true,
    );
    assert.equal(
      isRejectedAppOnlyFileSearch(400, { error: { code: 'invalidRequest', message: 'The request is malformed or incorrect.' } }),
      true,
    );
    assert.equal(
      isRejectedAppOnlyFileSearch(0, { error: { code: 'graph_request_failed' } }),
      true,
    );
    assert.equal(isRejectedAppOnlyFileSearch(403, { error: { code: 'accessDenied' } }), false);
    assert.equal(isRecordedAppOnlyFileSearchRejection({ fileSearchLastStatus: 400 }), true);
    assert.equal(isRecordedAppOnlyFileSearchRejection({ fileSearchLastStatus: 0 }), true);
    assert.equal(isRecordedAppOnlyFileSearchRejection({ fileSearchRejectedAppOnly: true }), true);
    assert.equal(isRecordedAppOnlyFileSearchRejection({}), false);
    assert.equal(isRecordedAppOnlyFileSearchRejection({ fileSearchLastStatus: 403 }), false);
  });

  it('does not POST /search/query on the next sweep after a recorded HTTP 400 skip', async () => {
    const graph = new SchemaGraph();
    graph.seed(CLIENTS, { Title: 'Colorado Craft Beef', ClientCode: 'CCB01', ClientStage: 'Active Client' }, '12');
    const svc = service(graph);
    const dir = mkdtempSync(join(tmpdir(), 'fabric-filesearch-400-shortcircuit-'));
    const paths: string[] = [];
    const fabric = mailAndCalendarFabric(paths, {
      status: 400,
      json: { error: { code: 'BadRequest', message: 'invalid_request' } },
    });
    try {
      const first = await runFabricSync({ service: svc, fabric, dataDir: dir, bootstrap: true });
      assert.equal(first.checkpoint.fileSearchLastStatus, 400);
      assert.equal(first.checkpoint.fileSearchRejectedAppOnly, true);
      assert.equal(paths.filter((path) => path === 'POST /v1.0/search/query').length, 1);
      const second = await runFabricSync({ service: svc, fabric, dataDir: dir, bootstrap: true });
      assert.equal(paths.filter((path) => path === 'POST /v1.0/search/query').length, 1);
      assert.equal(second.checkpoint.fileSearchLastStatus, 400);
      assert.equal(second.checkpoint.fileSearchRejectedAppOnly, true);
      assert.ok(second.notes.some((note) => /File search skipped/.test(note) && /HTTP 400/.test(note)));
      assert.equal(second.notes.filter((note) => /File search skipped/.test(note)).length, 1);
      const health = inspectFabricSyncHealth(dir, { sweepEnabled: true });
      assert.equal(health.fileSearch.status, 'skipped');
      assert.match(health.fileSearch.reason, /HTTP 400/);
      assert.equal(/LIVE/i.test(JSON.stringify(health.fileSearch)), false);
      assert.equal(health.fileSearch.status === 'LIVE', false);
      assert.equal(/CCB99|PDG01|deltatoken|Bearer |Colorado Craft Beef/i.test(JSON.stringify(health)), false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('does not POST /search/query on the next sweep after a recorded HTTP 0 graph_request_failed skip', async () => {
    const graph = new SchemaGraph();
    graph.seed(CLIENTS, { Title: 'Colorado Craft Beef', ClientCode: 'CCB01', ClientStage: 'Active Client' }, '12');
    const svc = service(graph);
    const dir = mkdtempSync(join(tmpdir(), 'fabric-filesearch-http0-shortcircuit-'));
    const paths: string[] = [];
    const fabric = mailAndCalendarFabric(paths, {
      status: 0,
      json: { error: { code: 'graph_request_failed' } },
    });
    try {
      const first = await runFabricSync({ service: svc, fabric, dataDir: dir, bootstrap: true });
      assert.equal(first.checkpoint.fileSearchLastStatus, 0);
      assert.equal(first.checkpoint.fileSearchRejectedAppOnly, true);
      assert.ok(first.notes.some((note) => /File search skipped/.test(note) && /HTTP 0/.test(note)));
      assert.equal(paths.filter((path) => path === 'POST /v1.0/search/query').length, 1);
      const second = await runFabricSync({ service: svc, fabric, dataDir: dir, bootstrap: true });
      assert.equal(paths.filter((path) => path === 'POST /v1.0/search/query').length, 1);
      assert.equal(second.checkpoint.fileSearchLastStatus, 0);
      assert.ok(second.notes.some((note) => /recorded app-only rejection/.test(note) && /HTTP 0/.test(note)));
      const health = inspectFabricSyncHealth(dir, { sweepEnabled: true });
      assert.equal(health.fileSearch.status, 'skipped');
      assert.match(health.fileSearch.reason, /HTTP 0/);
      assert.equal(/LIVE/i.test(JSON.stringify(health.fileSearch)), false);
      assert.equal(/CCB99|PDG01|deltatoken|Bearer /i.test(JSON.stringify(health)), false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('attempts /search/query once on a first-time checkpoint and records skip honestly', async () => {
    const graph = new SchemaGraph();
    const svc = service(graph);
    const dir = mkdtempSync(join(tmpdir(), 'fabric-filesearch-first-attempt-'));
    const paths: string[] = [];
    try {
      const result = await runFabricSync({
        service: svc,
        fabric: mailAndCalendarFabric(paths, {
          status: 400,
          json: { error: { code: 'invalidRequest', message: 'The request is malformed or incorrect.' } },
        }),
        dataDir: dir,
        bootstrap: true,
      });
      assert.equal(paths.filter((path) => path === 'POST /v1.0/search/query').length, 1);
      assert.equal(result.checkpoint.fileSearchLastStatus, 400);
      assert.equal(result.checkpoint.fileSearchRejectedAppOnly, true);
      assert.ok(result.notes.some((note) => /File search skipped/.test(note) && /HTTP 400/.test(note)));
      assert.equal(/LIVE files/.test(result.notes.join('\n')), true);
      assert.equal(result.notes.some((note) => /Bearer |CCB99|PDG01|deltatoken/i.test(note)), false);
      const health = inspectFabricSyncHealth(dir, { sweepEnabled: true });
      assert.equal(health.fileSearch.status, 'skipped');
      assert.equal(health.fileIndexSearch.status, 'skipped');
      assert.equal(/LIVE/i.test(JSON.stringify(health.fileSearch)), false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('keeps fileIndexSearch ready from indexed files and never claims LIVE after a recorded skip', async () => {
    const graph = new SchemaGraph();
    const svc = service(graph);
    const dir = mkdtempSync(join(tmpdir(), 'fabric-filesearch-index-ready-'));
    const paths: string[] = [];
    try {
      writeFileSync(
        join(dir, 'fabric-checkpoint.json'),
        JSON.stringify({
          lastRunAt: '2026-08-24T23:30:12.505Z',
          mailMode: 'delta',
          mailDeltaReady: true,
          mailSkip: `/v1.0/users/${MANNY_ENTRA_OID}/mailFolders/inbox/messages/delta?$deltatoken=abc`,
          fileSearchLastStatus: 0,
          fileSearchRejectedAppOnly: true,
          lastNotes: [
            'File search skipped: Graph search/query rejected app-only driveItem query (HTTP 0; graphCode=graph_request_failed; mismatch=other). Not claimed as LIVE files.',
          ],
          lastIndexed: {
            mailThreads: 1,
            meetings: 8,
            contacts: 0,
            files: 4,
            attachmentsIndexed: 1,
            skipped: 0,
            restricted: 0,
          },
          counts: { mailThreads: 1, meetings: 8, files: 4, attachmentsIndexed: 1 },
        }),
      );
      const before = inspectFabricSyncHealth(dir, { sweepEnabled: true });
      assert.equal(before.fileIndexSearch.status, 'ready');
      assert.equal(before.fileSearch.status, 'skipped');
      const result = await runFabricSync({
        service: svc,
        fabric: mailAndCalendarFabric(paths, {
          status: 0,
          json: { error: { code: 'graph_request_failed' } },
        }),
        dataDir: dir,
        bootstrap: true,
      });
      assert.equal(paths.filter((path) => path === 'POST /v1.0/search/query').length, 0);
      assert.equal(result.checkpoint.fileSearchLastStatus, 0);
      assert.equal(result.checkpoint.fileSearchRejectedAppOnly, true);
      const health = inspectFabricSyncHealth(dir, { sweepEnabled: true });
      assert.equal(health.fileSearch.status, 'skipped');
      assert.match(health.fileSearch.reason, /HTTP 0/);
      assert.equal(health.fileIndexSearch.status, 'ready');
      assert.equal(
        health.fileIndexSearch.reason,
        'Indexed business files are searchable on the entitled Hub operating index.',
      );
      assert.equal(health.fileSearch.status === 'LIVE', false);
      assert.equal(/LIVE/i.test(JSON.stringify(health.fileSearch)), false);
      assert.equal(/LIVE/i.test(JSON.stringify(health.fileIndexSearch)), false);
      assert.equal(/term-sheet|invented|CCB99|PDG01|Bearer |deltatoken/i.test(JSON.stringify(health)), false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
