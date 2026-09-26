/**
 * W2I-R2: HVCG_Meetings client workspace reads are ClientCode-scoped.
 * A finished scoped walk is not SOURCE_UNAVAILABLE.
 * A truncated scoped walk stays SOURCE_UNAVAILABLE and does not blank documents.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AtlasPrincipal } from '../src/middleware/auth.ts';
import type { UserBasicLookup } from '../src/entitlements/userLookup.ts';
import { composeClientTruth, workspaceSnapshotFromPayload } from '../src/pm/commercialContext/clientTruth.ts';
import {
  answerClientOperatingBrief,
  mapsToClientOperatingBriefIntent,
} from '../src/pm/operatorDesk/askAtlasClientOperatingBrief.ts';
import { IndexedClientCodeScopeRejectedError } from '../src/pm/sharepoint/errors.ts';
import { FILE_INDEX_MARKER } from '../src/pm/sharepoint/fabric/fileIndex.ts';
import type { GraphListItem, GraphListPage, PmGraphTransport } from '../src/pm/sharepoint/graph.ts';
import { createListItemCache } from '../src/pm/sharepoint/listCache.ts';
import { LIST_WALK_PAGE_CAP, LIST_WALK_TOP, SharePointPmService } from '../src/pm/sharepoint/repository.ts';
import type { SharePointPmSettings } from '../src/pm/sharepoint/settings.ts';
import { buildSharePointClientWorkspace } from '../src/pm/sharepoint/workspace.ts';

const PROJECTS = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const TASKS = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
const MILESTONES = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1';
const CLIENTS = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1';
const COMMS = 'ffffffff-ffff-4fff-8fff-fffffffffff3';
const MEETINGS = 'ffffffff-ffff-4fff-8fff-fffffffffff4';
const ENGAGEMENTS = 'ffffffff-ffff-4fff-8fff-fffffffffff5';
const DELIVERABLES = 'ffffffff-ffff-4fff-8fff-fffffffffff6';

const ACCG_FILE = 'ACCG indexed correspondence.pdf';
const PDG_FILE = 'PDG secret index.pdf';
const HFD_FILE = 'HFD indexed correspondence.pdf';
const ACCG_MEETING = 'ACCG kickoff';
const PDG_MEETING = 'PDG working session';
const HVS_RECOVERED = 'HVS recovered calendar.csv';
const CAPPED_TITLE = 'ACCG scoped page row';

const principal: AtlasPrincipal = {
  userId: '11111111-1111-4111-8111-111111111003',
  organizationId: 'org-hvcg',
  allowedClientIds: ['ACCG01', 'PDG01', 'HFD01'],
  roles: ['HVCG Team Member'],
};

const lookupOk: UserBasicLookup = async (oid) => ({
  ok: true,
  profile: { id: oid, mail: 'owner@hvcg.example', userPrincipalName: 'owner@hvcg.example' },
});

function settings(): SharePointPmSettings {
  return {
    siteId: 'contoso.sharepoint.com,11111111-1111-4111-8111-111111111011,22222222-2222-4222-8222-222222222022',
    projectsListId: PROJECTS,
    tasksListId: TASKS,
    milestonesListId: MILESTONES,
    clientsListId: CLIENTS,
    communicationsListId: COMMS,
    meetingsListId: MEETINGS,
    engagementsListId: ENGAGEMENTS,
    deliverablesListId: DELIVERABLES,
    managedIdentityClientId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
  };
}

function item(id: string, fields: Record<string, unknown>): GraphListItem {
  return { id, etag: `"etag-${id}"`, fields };
}

type ScopeMode = 'honor' | 'reject' | 'reject-then-cap' | 'scoped-cap' | 'mixed-then-foreign';

class ScopeGraph implements PmGraphTransport {
  mode: ScopeMode = 'honor';
  readonly calls: Array<{ listId: string; indexedClientCode?: string; nextLink: boolean }> = [];
  readonly writes: string[] = [];

  async listItems(
    listId: string,
    opts?: { nextLink?: string; indexedClientCode?: string },
  ): Promise<GraphListPage> {
    this.calls.push({
      listId,
      indexedClientCode: opts?.indexedClientCode,
      nextLink: Boolean(opts?.nextLink),
    });
    if (listId !== MEETINGS) {
      if (opts?.nextLink) return { items: [] };
      return { items: this.rows(listId) };
    }
    return this.meetings(opts);
  }

  async getItem(): Promise<GraphListItem | null> {
    return null;
  }

  async createItem(): Promise<GraphListItem> {
    this.writes.push('create');
    throw new Error('read-only');
  }

  async patchItemFields(): Promise<GraphListItem> {
    this.writes.push('patch');
    throw new Error('read-only');
  }

  private rows(listId: string): GraphListItem[] {
    if (listId === CLIENTS) {
      return [
        item('1', { Title: 'ACCG Inc.', ClientCode: 'ACCG01' }),
        item('2', { Title: 'PDG', ClientCode: 'PDG01' }),
        item('3', { Title: 'Hart Family Dental', ClientCode: 'HFD01' }),
      ];
    }
    if (listId === PROJECTS) {
      return [
        item('10', {
          Title: 'ACCG weekly operating file',
          ClientCode: 'ACCG01',
          IsInternalProject: false,
          ProjectStatus: 'In Progress',
          ProjectHealth: 'Green',
          Priority: 'Medium',
        }),
        item('11', {
          Title: 'PDG secret work',
          ClientCode: 'PDG01',
          IsInternalProject: false,
          ProjectStatus: 'In Progress',
          ProjectHealth: 'Green',
          Priority: 'Medium',
        }),
      ];
    }
    if (listId === TASKS) {
      return [
        item('20', {
          Title: 'ACCG overdue blocked follow-up',
          ProjectIdLookupId: 10,
          ClientCode: 'ACCG01',
          TaskStatus: 'Blocked',
          Priority: 'High',
        }),
      ];
    }
    if (listId === COMMS) {
      return [
        item('31', {
          Title: ACCG_FILE,
          ClientCode: 'ACCG01',
          Summary: FILE_INDEX_MARKER,
          SourceItemId: 'file:accg-indexed-correspondence',
        }),
        item('32', {
          Title: PDG_FILE,
          ClientCode: 'PDG01',
          Summary: FILE_INDEX_MARKER,
          SourceItemId: 'file:pdg-secret',
        }),
        item('33', {
          Title: HFD_FILE,
          ClientCode: 'HFD01',
          Summary: FILE_INDEX_MARKER,
          SourceItemId: 'file:hfd-indexed-correspondence',
        }),
      ];
    }
    if (listId === DELIVERABLES) {
      return [item('50', { Title: 'ACCG deliverable', ClientCode: 'ACCG01', DeliverableStatus: 'Open' })];
    }
    return [];
  }

  private meetings(opts?: { nextLink?: string; indexedClientCode?: string }): GraphListPage {
    const code = opts?.indexedClientCode;
    const meetingCalls = () => this.calls.filter((call) => call.listId === MEETINGS).length;
    if (code && (this.mode === 'reject' || this.mode === 'reject-then-cap')) {
      throw new IndexedClientCodeScopeRejectedError();
    }
    if (this.mode === 'reject') return { items: this.meetingRows() };
    if (this.mode === 'reject-then-cap') {
      const n = meetingCalls();
      return {
        items: [item(`unscoped-${n}`, { Title: CAPPED_TITLE, ClientCode: 'ACCG01' })],
        nextLink: `https://graph.microsoft.com/v1.0/sites/contoso/lists/${MEETINGS}/items?$skiptoken=unscoped-${n}`,
      };
    }
    if (this.mode === 'scoped-cap') {
      const n = meetingCalls();
      return {
        items: [item(`scoped-${n}`, { Title: CAPPED_TITLE, ClientCode: code || 'ACCG01' })],
        nextLink: `https://graph.microsoft.com/v1.0/sites/contoso/lists/${MEETINGS}/items?$skiptoken=scoped-${n}`,
      };
    }
    if (this.mode === 'mixed-then-foreign') {
      if (!opts?.nextLink) {
        return {
          items: [item('m-accg', { Title: ACCG_MEETING, ClientCode: 'ACCG01' })],
          nextLink: `https://graph.microsoft.com/v1.0/sites/contoso/lists/${MEETINGS}/items?$skiptoken=mixed-2`,
        };
      }
      return { items: [item('m-foreign', { Title: 'Later foreign meeting', ClientCode: 'ZZZ01' })] };
    }
    if (!code) {
      const n = meetingCalls();
      return {
        items: [item(`tenant-${n}`, { Title: 'tenant meeting', ClientCode: n % 2 === 0 ? 'ZZZ01' : 'ACCG01' })],
        nextLink: `https://graph.microsoft.com/v1.0/sites/contoso/lists/${MEETINGS}/items?$skiptoken=tenant-${n}`,
      };
    }
    return { items: this.meetingRows().filter((row) => row.fields.ClientCode === code) };
  }

  private meetingRows(): GraphListItem[] {
    return [
      item('40', { Title: ACCG_MEETING, ClientCode: 'ACCG01', MeetingDate: '2026-09-01' }),
      item('41', { Title: PDG_MEETING, ClientCode: 'PDG01', MeetingDate: '2026-09-02' }),
      item('42', { Title: HVS_RECOVERED, Summary: 'recovered archive' }),
    ];
  }
}

function serviceFor(graph: ScopeGraph) {
  return new SharePointPmService(settings(), graph, lookupOk, createListItemCache({ ttlMs: 60_000 }));
}

function truthFor(workspace: Awaited<ReturnType<typeof buildSharePointClientWorkspace>>, clientCode: string) {
  const snapshot = workspaceSnapshotFromPayload(workspace);
  const truth = composeClientTruth({ clientCode, workspace: snapshot });
  assert.equal('failClosed' in truth, false);
  if ('failClosed' in truth) throw new Error('unexpected fail closed');
  return truth;
}

function meetingsAnswer(workspace: Awaited<ReturnType<typeof buildSharePointClientWorkspace>>, clientCode: string) {
  assert.equal(mapsToClientOperatingBriefIntent(`What meetings exist for ${clientCode}?`), true);
  return answerClientOperatingBrief(`What meetings exist for ${clientCode}?`, {
    entitledCodes: principal.allowedClientIds,
    workspace: workspaceSnapshotFromPayload(workspace),
  });
}

describe('W2I-R2 HVCG_Meetings client scope', () => {
  it('finishes an entitled populated meetings walk inside the page cap and keeps documents INDEXED', async () => {
    const graph = new ScopeGraph();
    const workspace = await buildSharePointClientWorkspace(serviceFor(graph), principal, 'ACCG01');
    assert.equal(workspace.meetings.status, 'COMPLETE');
    assert.equal(workspace.meetings.queried, true);
    assert.deepEqual(
      workspace.meetings.items.map((row) => row.title),
      [ACCG_MEETING],
    );
    assert.equal(workspace.meetings.items.some((row) => row.title === PDG_MEETING), false);
    assert.equal(workspace.meetings.items.some((row) => row.title === HVS_RECOVERED), false);
    assert.equal(workspace.documents.items.some((row) => row.title === ACCG_FILE), true);
    assert.equal(workspace.documents.items.some((row) => row.title === PDG_FILE), false);
    assert.equal(workspace.projects.some((row) => row.name === 'PDG secret work'), false);
    const truth = truthFor(workspace, 'ACCG01');
    assert.equal(truth.documents.completeness, 'INDEXED');
    assert.match(truth.documents.summary, new RegExp(ACCG_FILE));
    assert.equal(/documents=SOURCE_UNAVAILABLE|documents=MISSING/.test(truth.documents.summary), false);
    assert.equal(truth.documents.summary.includes(PDG_FILE), false);
    assert.equal(truth.documents.summary.includes(HVS_RECOVERED), false);
    assert.equal(truth.canExecute, false);
    assert.equal(truth.capitalSubmit, false);
    assert.equal(truth.globalAutoRespond, false);
    assert.equal(truth.meetings.completeness, 'INDEXED');
    assert.equal(truth.meetings.classification, 'CONFIRMED');
    assert.match(truth.meetings.summary, /meetings=INDEXED/);
    assert.match(truth.meetings.summary, /ACCG kickoff \(2026-09-01\)/);
    assert.match(truth.meetings.summary, /1 entitled HVCG_Meetings row/);
    assert.equal(truth.meetings.summary.includes(PDG_MEETING), false);
    assert.equal(truth.meetings.summary.includes(HVS_RECOVERED), false);
    assert.equal(/meetings=MISSING|meetings=SOURCE_UNAVAILABLE/.test(truth.meetings.summary), false);
    const answer = meetingsAnswer(workspace, 'ACCG01');
    assert.match(answer, /meetings=INDEXED/);
    assert.match(answer, /CONFIRMED/);
    assert.match(answer, /ACCG kickoff \(2026-09-01\)/);
    assert.equal(answer.includes(PDG_MEETING), false);
    assert.equal(/meetings=MISSING|meetings=SOURCE_UNAVAILABLE/.test(answer), false);
    assert.equal(/documents=MISSING|documents=SOURCE_UNAVAILABLE/.test(answer), false);
    assert.match(answer, /canExecute=false/);
    assert.match(answer, /capitalSubmit=false/);
    assert.match(answer, /GLOBAL_AUTO_RESPOND=false/);
    assert.equal(graph.writes.length, 0);
    assert.equal(LIST_WALK_PAGE_CAP, 80);
    assert.equal(LIST_WALK_TOP, 100);
    const meetingCalls = graph.calls.filter((call) => call.listId === MEETINGS);
    assert.ok(meetingCalls.length > 0);
    assert.equal(meetingCalls.every((call) => call.indexedClientCode === 'ACCG01' || call.nextLink), true);
    assert.equal(graph.calls.some((call) => call.listId === COMMS && call.indexedClientCode), false);
    assert.equal(graph.calls.some((call) => call.listId === PROJECTS && call.indexedClientCode), false);
    assert.equal(meetingCalls.length < LIST_WALK_PAGE_CAP, true);
  });

  it('finishes an entitled empty meetings walk as queried empty, not SOURCE_UNAVAILABLE or documents MISSING', async () => {
    const graph = new ScopeGraph();
    const workspace = await buildSharePointClientWorkspace(serviceFor(graph), principal, 'HFD01');
    assert.equal(workspace.meetings.status, 'COMPLETE');
    assert.equal(workspace.meetings.queried, true);
    assert.equal(workspace.meetings.items.length, 0);
    assert.equal(workspace.meetings.reason, undefined);
    assert.equal(JSON.stringify(workspace.meetings).includes(ACCG_MEETING), false);
    assert.equal(JSON.stringify(workspace.meetings).includes(HVS_RECOVERED), false);
    assert.equal(workspace.documents.items.some((row) => row.title === HFD_FILE), true);
    const truth = truthFor(workspace, 'HFD01');
    assert.equal(truth.documents.completeness, 'INDEXED');
    assert.match(truth.documents.summary, new RegExp(HFD_FILE));
    assert.equal(/documents=MISSING|documents=SOURCE_UNAVAILABLE/.test(truth.documents.summary), false);
    assert.equal(truth.meetings.completeness, 'MISSING');
    assert.equal(truth.meetings.classification, 'MISSING');
    assert.match(truth.meetings.summary, /meetings=MISSING/);
    assert.equal(/meetings=SOURCE_UNAVAILABLE|meetings=INDEXED/.test(truth.meetings.summary), false);
    assert.equal(truth.meetings.summary.includes(ACCG_MEETING), false);
    const answer = meetingsAnswer(workspace, 'HFD01');
    assert.match(answer, /meetings=MISSING/);
    assert.equal(/meetings=SOURCE_UNAVAILABLE|meetings=INDEXED/.test(answer), false);
    assert.equal(/documents=MISSING|documents=SOURCE_UNAVAILABLE/.test(answer), false);
    assert.equal(graph.writes.length, 0);
    assert.equal(
      graph.calls.filter((call) => call.listId === MEETINGS).every((call) => call.indexedClientCode === 'HFD01'),
      true,
    );
  });

  it('does not reuse one client scope as another client inventory', async () => {
    const graph = new ScopeGraph();
    const service = serviceFor(graph);
    const accg = await buildSharePointClientWorkspace(service, principal, 'ACCG01');
    const pdg = await buildSharePointClientWorkspace(service, principal, 'PDG01');
    assert.deepEqual(
      accg.meetings.items.map((row) => row.title),
      [ACCG_MEETING],
    );
    assert.deepEqual(
      pdg.meetings.items.map((row) => row.title),
      [PDG_MEETING],
    );
    assert.equal(pdg.documents.items.some((row) => row.title === PDG_FILE), true);
    assert.equal(pdg.documents.items.some((row) => row.title === ACCG_FILE), false);
    const scoped = graph.calls.filter((call) => call.listId === MEETINGS && call.indexedClientCode);
    assert.equal(scoped.some((call) => call.indexedClientCode === 'ACCG01'), true);
    assert.equal(scoped.some((call) => call.indexedClientCode === 'PDG01'), true);
  });

  it('keeps a scoped page cap SOURCE_UNAVAILABLE without blanking an INDEXED document walk', async () => {
    const graph = new ScopeGraph();
    graph.mode = 'scoped-cap';
    const workspace = await buildSharePointClientWorkspace(serviceFor(graph), principal, 'ACCG01');
    assert.equal(workspace.meetings.status, 'SOURCE_UNAVAILABLE');
    assert.equal(workspace.meetings.queried, false);
    assert.equal(workspace.meetings.items.length, 0);
    assert.match(workspace.meetings.reason || '', /HVCG_Meetings/);
    assert.match(workspace.meetings.reason || '', /reason=page_cap/);
    assert.match(workspace.meetings.reason || '', /pagesFetched=80/);
    assert.match(workspace.meetings.reason || '', /OWNER_DECISION_REQUIRED/);
    assert.match(workspace.meetings.reason || '', /pageCap=80/);
    assert.match(workspace.meetings.reason || '', /top=100/);
    assert.match(workspace.meetings.reason || '', /itemsFetched=80/);
    assert.equal((workspace.meetings.reason || '').includes(CAPPED_TITLE), false);
    assert.equal(/skiptoken|https?:\/\//.test(workspace.meetings.reason || ''), false);
    assert.equal(workspace.documents.availability, undefined);
    assert.equal(workspace.documents.items.some((row) => row.title === ACCG_FILE), true);
    const truth = truthFor(workspace, 'ACCG01');
    assert.equal(truth.documents.completeness, 'INDEXED');
    assert.equal(/documents=SOURCE_UNAVAILABLE|documents=MISSING/.test(truth.documents.summary), false);
    assert.equal(truth.meetings.completeness, 'NOT_CERTIFIED');
    assert.equal(truth.meetings.classification, 'NOT_CERTIFIED');
    assert.match(truth.meetings.summary, /meetings=SOURCE_UNAVAILABLE/);
    assert.match(truth.meetings.summary, /reason=page_cap/);
    assert.match(truth.meetings.summary, /pagesFetched=80/);
    assert.match(truth.meetings.summary, /OWNER_DECISION_REQUIRED/);
    assert.match(truth.meetings.summary, /itemsFetched=80/);
    assert.equal(truth.meetings.summary.includes(CAPPED_TITLE), false);
    assert.equal(/meetings=MISSING|meetings=INDEXED/.test(truth.meetings.summary), false);
    assert.equal(truth.canExecute, false);
    assert.equal(truth.capitalSubmit, false);
    assert.equal(truth.globalAutoRespond, false);
    const answer = meetingsAnswer(workspace, 'ACCG01');
    assert.match(answer, /meetings=SOURCE_UNAVAILABLE/);
    assert.match(answer, /reason=page_cap/);
    assert.match(answer, /pagesFetched=80/);
    assert.match(answer, /OWNER_DECISION_REQUIRED/);
    assert.match(answer, /itemsFetched=80/);
    assert.equal(answer.includes(CAPPED_TITLE), false);
    assert.equal(/meetings=MISSING|meetings=INDEXED/.test(answer), false);
    assert.equal(/documents=MISSING|documents=SOURCE_UNAVAILABLE/.test(answer), false);
    const documents = answerClientOperatingBrief('What documents exist for ACCG01?', {
      entitledCodes: principal.allowedClientIds,
      workspace: workspaceSnapshotFromPayload(workspace),
    });
    assert.match(documents, new RegExp(ACCG_FILE));
    assert.equal(/documents=SOURCE_UNAVAILABLE|documents=MISSING/.test(documents), false);
    assert.equal(graph.writes.length, 0);
    assert.equal(LIST_WALK_PAGE_CAP, 80);
    assert.equal(LIST_WALK_TOP, 100);
    const meetingPages = graph.calls.filter((call) => call.listId === MEETINGS).length;
    assert.equal(meetingPages, LIST_WALK_PAGE_CAP);
    assert.equal(graph.calls.filter((call) => call.listId === COMMS).length, 1);
  });

  it('treats a scope rejection as an unscoped walk and still isolates a later page cap', async () => {
    const small = new ScopeGraph();
    small.mode = 'reject';
    const workspace = await buildSharePointClientWorkspace(serviceFor(small), principal, 'ACCG01');
    assert.equal(workspace.meetings.status, 'COMPLETE');
    assert.deepEqual(
      workspace.meetings.items.map((row) => row.title),
      [ACCG_MEETING],
    );
    assert.equal(workspace.meetings.items.some((row) => row.title === HVS_RECOVERED), false);
    assert.equal(JSON.stringify(workspace.meetings).includes('token'), false);
    const truth = truthFor(workspace, 'ACCG01');
    assert.equal(truth.documents.completeness, 'INDEXED');

    const capped = new ScopeGraph();
    capped.mode = 'reject-then-cap';
    const unavailable = await buildSharePointClientWorkspace(serviceFor(capped), principal, 'ACCG01');
    assert.equal(unavailable.meetings.status, 'SOURCE_UNAVAILABLE');
    assert.equal(unavailable.meetings.queried, false);
    assert.equal(unavailable.meetings.items.length, 0);
    assert.match(unavailable.meetings.reason || '', /reason=page_cap/);
    assert.equal(/OWNER_DECISION_REQUIRED/.test(unavailable.meetings.reason || ''), false);
    assert.equal(/token was rejected/i.test(unavailable.meetings.reason || ''), false);
    assert.equal(unavailable.documents.items.some((row) => row.title === ACCG_FILE), true);
    assert.equal(truthFor(unavailable, 'ACCG01').documents.completeness, 'INDEXED');
  });

  it('does not finish a scoped walk whose later page is not the requested ClientCode', async () => {
    const graph = new ScopeGraph();
    graph.mode = 'mixed-then-foreign';
    const workspace = await buildSharePointClientWorkspace(serviceFor(graph), principal, 'ACCG01');
    assert.equal(workspace.meetings.status, 'SOURCE_UNAVAILABLE');
    assert.equal(workspace.meetings.items.length, 0);
    assert.match(workspace.meetings.reason || '', /scope_not_honored/);
    assert.equal((workspace.meetings.reason || '').includes(ACCG_MEETING), false);
    assert.equal((workspace.meetings.reason || '').includes(PDG_MEETING), false);
    assert.equal(workspace.documents.items.some((row) => row.title === ACCG_FILE), true);
    assert.equal(truthFor(workspace, 'ACCG01').documents.completeness, 'INDEXED');
  });
});
