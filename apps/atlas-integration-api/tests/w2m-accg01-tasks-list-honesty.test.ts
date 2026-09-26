/**
 * W2M ACCG01 tasks list honesty.
 * Titles come from the open hygiene-kept HVCG_Tasks slice only.
 * The projects suffix and the blocked queue stay on their existing answers.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  composeClientTruth,
  TASKS_LIST_SLICE,
  TASKS_MISSING_SENTENCE,
  taskListLabel,
  type WorkspaceTruthSnapshot,
} from '../src/pm/commercialContext/clientTruth.ts';
import {
  answerClientOperatingBrief,
  clientOperatingBriefTopic,
  mapsToClientOperatingBriefIntent,
  tasksIndexUnavailableAnswer,
} from '../src/pm/operatorDesk/askAtlasClientOperatingBrief.ts';
import { LIST_WALK_PAGE_CAP, LIST_WALK_TOP } from '../src/pm/sharepoint/repository.ts';

const root = dirname(fileURLToPath(import.meta.url));
const PAGE_CAP_REASON =
  'HVCG_Tasks list walk did not complete. reason=page_cap; pagesFetched=80. Section is SOURCE_UNAVAILABLE. OWNER_DECISION_REQUIRED pageCap=80 top=100 itemsFetched=80.';
const READ_FAIL_REASON = 'HVCG_Tasks could not be read. Section is SOURCE_UNAVAILABLE.';
const ALLOWLIST_REASON =
  'HVCG_Tasks is not in the Hub Graph Selected allowlist. Section is not working until the list is granted and configured.';

const INDEXED_SENTENCE =
  '2 entitled open HVCG_Tasks row(s). tasks=INDEXED. File the ACCG return (ready, due 2026-10-02); Confirm bank access.';

function workspace(overrides: Partial<WorkspaceTruthSnapshot> = {}): WorkspaceTruthSnapshot {
  return {
    clientCode: 'ACCG01',
    displayName: 'ACCG Inc.',
    documents: {
      queried: true,
      items: [
        {
          id: 'doc-1',
          title: 'ACCG indexed correspondence.pdf',
          source: 'HVCG_Communications/file-index',
          clientCode: 'ACCG01',
        },
      ],
    },
    projects: [{ id: 'p1', name: 'ACCG operating engagement', status: 'active' }],
    meetings: {
      queried: true,
      status: 'COMPLETE',
      items: [
        {
          id: 'm1',
          title: 'ACCG kickoff',
          clientCode: 'ACCG01',
          date: '2026-09-01T00:00:00.000Z',
        },
      ],
    },
    contacts: {
      queried: true,
      status: 'COMPLETE',
      items: [
        {
          id: 'c1',
          title: 'Ada Lovelace',
          clientCode: 'ACCG01',
          email: 'ada@accg.example',
          jobTitle: 'Founder',
        },
      ],
    },
    tasks: [],
    ...overrides,
  };
}

function indexedTasks(): NonNullable<WorkspaceTruthSnapshot['tasks']> {
  return [
    {
      id: 't1',
      title: 'File the ACCG return',
      status: 'ready',
      dueDate: '2026-10-02T15:00:00.000Z',
      clientCode: 'ACCG01',
      nextAction: 'Call the client tomorrow',
      blocker: 'Waiting on a wet signature',
      projectId: 'p1',
    },
    {
      id: 't2',
      title: 'Confirm bank access',
      clientCode: 'ACCG01',
      status: '   ',
      dueDate: '',
    },
    {
      id: 't-done',
      title: 'Completed filing',
      status: 'completed',
      clientCode: 'ACCG01',
      dueDate: '2026-01-01',
    },
    {
      id: 't-cancel',
      title: 'Cancelled outreach',
      status: 'Cancelled',
      clientCode: 'ACCG01',
    },
    {
      id: 't-pdg',
      title: 'PDG secret task',
      status: 'ready',
      clientCode: 'PDG01',
      dueDate: '2026-11-01',
    },
    {
      id: '11',
      title: 'Schedule and run kickoff call',
      status: 'ready',
      clientCode: 'ACCG01',
      projectId: '27',
    },
  ];
}

function truth(snapshot?: WorkspaceTruthSnapshot, clientCode = 'ACCG01') {
  const composed = composeClientTruth({ clientCode, workspace: snapshot });
  assert.equal('failClosed' in composed, false);
  if ('failClosed' in composed) throw new Error('unexpected fail closed');
  return composed;
}

describe('W2M tasks list honesty', () => {
  it('keeps the list walk budget at page_cap 80 and $top 100 and leaves listAuthorizedTasks unscoped', () => {
    assert.equal(LIST_WALK_PAGE_CAP, 80);
    assert.equal(LIST_WALK_TOP, 100);
    const repository = readFileSync(join(root, '../src/pm/sharepoint/repository.ts'), 'utf8');
    const fn = repository.slice(
      repository.indexOf('async listAuthorizedTasks'),
      repository.indexOf('private filterTasksForProject'),
    );
    assert.match(fn, /this\.listAll\(this\.settings\.tasksListId\)/);
    assert.equal(fn.includes('indexedClientCode'), false);
    assert.equal(fn.includes('clientCode'), false);
    const handle = readFileSync(join(root, '../src/pm/operatorDesk/handle.ts'), 'utf8');
    assert.match(handle, /topic === 'tasks'/);
    assert.match(handle, /tasksIndexUnavailableAnswer\(scoped\)/);
  });

  it('maps a closed tasks question and leaves projects, blocked, and other topics alone', () => {
    assert.equal(mapsToClientOperatingBriefIntent('What tasks does ACCG01 have?'), true);
    assert.equal(clientOperatingBriefTopic('What tasks does ACCG01 have?'), 'tasks');
    assert.equal(mapsToClientOperatingBriefIntent('What tasks exist for ACCG01?'), true);
    assert.equal(clientOperatingBriefTopic('What tasks exist for ACCG01?'), 'tasks');
    assert.equal(mapsToClientOperatingBriefIntent('List ACCG01 tasks'), true);
    assert.equal(clientOperatingBriefTopic('List ACCG01 tasks'), 'tasks');
    assert.equal(mapsToClientOperatingBriefIntent('What tasks exist?'), false);
    assert.equal(mapsToClientOperatingBriefIntent('List tasks'), false);
    assert.equal(clientOperatingBriefTopic('What are we working on for ACCG01?'), 'working_on');
    assert.equal(clientOperatingBriefTopic('What is blocked?'), 'blocked');
    assert.equal(clientOperatingBriefTopic('What is blocked for ACCG01?'), 'blocked');
    assert.equal(mapsToClientOperatingBriefIntent('What is blocked?'), false);
    assert.equal(mapsToClientOperatingBriefIntent('What is blocked?', 'ACCG01'), true);
    assert.equal(clientOperatingBriefTopic('What contacts exist for ACCG01?'), 'contacts');
    assert.equal(clientOperatingBriefTopic('What meetings exist for ACCG01?'), 'meetings');
    assert.equal(clientOperatingBriefTopic('What documents exist for ACCG01?'), 'documents');
    assert.equal(clientOperatingBriefTopic('What projects are active for ACCG01?'), 'projects');
    assert.equal(clientOperatingBriefTopic('What is the capital context for ACCG01?'), 'capital');
    assert.equal(clientOperatingBriefTopic('What is the finance picture for ACCG01?'), 'finance');
  });

  it('lists entitled open titles with status and due only when present, and drops the rest', () => {
    const composed = truth(
      workspace({
        projects: [
          { id: 'p1', name: 'ACCG operating engagement', status: 'active' },
          { id: '27', name: 'ACCG01 - Onboarding', status: 'active' },
        ],
        tasks: indexedTasks(),
      }),
    );
    assert.equal(composed.tasks.completeness, 'INDEXED');
    assert.equal(composed.tasks.classification, 'CONFIRMED');
    assert.equal(composed.tasks.summary, INDEXED_SENTENCE);
    assert.equal(composed.tasks.summary.includes('Completed filing'), false);
    assert.equal(composed.tasks.summary.includes('Cancelled outreach'), false);
    assert.equal(composed.tasks.summary.includes('PDG secret task'), false);
    assert.equal(composed.tasks.summary.includes('PDG01'), false);
    assert.equal(composed.tasks.summary.includes('Schedule and run kickoff call'), false);
    assert.equal(composed.tasks.summary.includes('Call the client tomorrow'), false);
    assert.equal(composed.tasks.summary.includes('wet signature'), false);
    assert.equal(composed.tasks.summary.includes('Ada Lovelace'), false);
    assert.equal(/tasks=MISSING|tasks=SOURCE_UNAVAILABLE/.test(composed.tasks.summary), false);
    assert.equal(
      taskListLabel({ title: 'File the ACCG return', status: 'ready', dueDate: '2026-10-02' }),
      'File the ACCG return (ready, due 2026-10-02)',
    );
    assert.equal(composed.contacts.completeness, 'INDEXED');
    assert.equal(composed.meetings.completeness, 'INDEXED');
    assert.equal(composed.canExecute, false);
    assert.equal(composed.capitalSubmit, false);
    assert.equal(composed.globalAutoRespond, false);

    const questions = ['What tasks does ACCG01 have?', 'What tasks exist for ACCG01?', 'List ACCG01 tasks'];
    for (const question of questions) {
      const answer = answerClientOperatingBrief(question, {
        entitledCodes: ['ACCG01', 'PDG01', 'HFD01'],
        workspace: workspace({
          projects: [
            { id: 'p1', name: 'ACCG operating engagement', status: 'active' },
            { id: '27', name: 'ACCG01 - Onboarding', status: 'active' },
          ],
          tasks: indexedTasks(),
        }),
      });
      assert.match(answer, /tasks=INDEXED/);
      assert.match(answer, /CONFIRMED/);
      assert.match(answer, /File the ACCG return \(ready, due 2026-10-02\)/);
      assert.match(answer, /Confirm bank access/);
      assert.equal(answer.includes('Completed filing'), false);
      assert.equal(answer.includes('PDG secret task'), false);
      assert.equal(answer.includes('PDG01'), false);
      assert.equal(answer.includes('Schedule and run kickoff call'), false);
      assert.equal(answer.includes('Call the client tomorrow'), false);
      assert.equal(answer.includes('Ada Lovelace'), false);
      assert.equal(answer.includes('ACCG kickoff'), false);
      assert.equal(/contacts=|meetings=|documents=|projects=|capitalContext=/.test(answer), false);
      assert.match(answer, /GLOBAL_AUTO_RESPOND=false/);
      assert.match(answer, /capitalSubmit=false/);
      assert.match(answer, /canExecute=false/);
      assert.match(answer, /canExecute=false\.$/);
    }
  });

  it('caps the short slice at six labels and reports +N more', () => {
    const tasks = Array.from({ length: TASKS_LIST_SLICE + 2 }, (_, index) => ({
      id: `t-${index}`,
      title: `ACCG task ${index + 1}`,
      clientCode: 'ACCG01',
      status: index === 0 ? 'ready' : undefined,
      dueDate: index === 0 ? '2026-10-02' : undefined,
    }));
    const composed = truth(workspace({ tasks }));
    assert.equal(composed.tasks.completeness, 'INDEXED');
    assert.match(composed.tasks.summary, /8 entitled open HVCG_Tasks row/);
    assert.match(composed.tasks.summary, /ACCG task 1 \(ready, due 2026-10-02\)/);
    assert.match(composed.tasks.summary, /ACCG task 6/);
    assert.match(composed.tasks.summary, /\+2 more/);
    assert.equal(composed.tasks.summary.includes('ACCG task 7'), false);
    assert.equal(composed.tasks.summary.includes('ACCG task 8'), false);
  });

  it('says tasks=MISSING for a finished empty open slice', () => {
    const composed = truth(workspace());
    assert.equal(composed.tasks.completeness, 'MISSING');
    assert.equal(composed.tasks.classification, 'MISSING');
    assert.equal(composed.tasks.summary, TASKS_MISSING_SENTENCE);
    assert.equal(/tasks=SOURCE_UNAVAILABLE|tasks=INDEXED|truncated|page_cap/.test(composed.tasks.summary), false);
    assert.equal(composed.contacts.completeness, 'INDEXED');
    assert.equal(composed.meetings.completeness, 'INDEXED');

    const answer = answerClientOperatingBrief('What tasks does ACCG01 have?', {
      entitledCodes: ['ACCG01'],
      workspace: workspace(),
    });
    assert.match(answer, /tasks=MISSING/);
    assert.match(answer, /does not invent tasks, assignees, due dates, notes, or next actions/);
    assert.equal(/tasks=SOURCE_UNAVAILABLE|tasks=INDEXED/.test(answer), false);
    assert.match(answer, /canExecute=false/);
    assert.match(answer, /capitalSubmit=false/);
    assert.match(answer, /GLOBAL_AUTO_RESPOND=false/);
  });

  it('keeps a missing workspace and an allowlist miss as not queried, not an empty task list', () => {
    const bare = truth(undefined);
    assert.equal(bare.tasks.completeness, 'NOT_CERTIFIED');
    assert.match(bare.tasks.summary, /was not queried/);
    assert.match(bare.tasks.summary, /does not treat that as an empty task list/);
    assert.equal(/tasks=MISSING|tasks=INDEXED|tasks=SOURCE_UNAVAILABLE/.test(bare.tasks.summary), false);

    const allowlist = truth(
      workspace({
        tasksIndex: {
          queried: false,
          status: 'PARTIAL_SOURCE_DATA_NOT_FOUND',
          reason: ALLOWLIST_REASON,
        },
        tasks: [{ id: 'hidden', title: 'Should Not List', status: 'ready', clientCode: 'ACCG01' }],
      }),
    );
    assert.equal(allowlist.tasks.completeness, 'NOT_CERTIFIED');
    assert.match(allowlist.tasks.summary, /was not queried/);
    assert.match(allowlist.tasks.summary, /allowlist/);
    assert.equal(allowlist.tasks.summary.includes('Should Not List'), false);
    assert.equal(/tasks=MISSING|tasks=INDEXED|tasks=SOURCE_UNAVAILABLE|OWNER_DECISION_REQUIRED/.test(allowlist.tasks.summary), false);
  });

  it('says tasks=SOURCE_UNAVAILABLE and hides partial rows, with page_cap text only when measured', () => {
    const capped = truth(
      workspace({
        tasksIndex: {
          queried: false,
          status: 'SOURCE_UNAVAILABLE',
          reason: PAGE_CAP_REASON,
        },
        tasks: [
          {
            id: 'partial',
            title: 'Hidden Task',
            status: 'ready',
            clientCode: 'ACCG01',
            dueDate: '2026-12-01',
            nextAction: 'Invented next step',
          },
        ],
      }),
    );
    assert.match(capped.tasks.summary, /tasks=SOURCE_UNAVAILABLE/);
    assert.match(capped.tasks.summary, /reason=page_cap/);
    assert.match(capped.tasks.summary, /pagesFetched=80/);
    assert.match(capped.tasks.summary, /OWNER_DECISION_REQUIRED pageCap=80 top=100/);
    assert.match(capped.tasks.summary, /itemsFetched=80/);
    assert.equal(capped.tasks.summary.includes('Hidden Task'), false);
    assert.equal(capped.tasks.summary.includes('Invented next step'), false);
    assert.equal(/tasks=MISSING|tasks=INDEXED/.test(capped.tasks.summary), false);
    assert.equal(capped.contacts.completeness, 'INDEXED');
    assert.equal(capped.meetings.completeness, 'INDEXED');

    const unread = truth(
      workspace({
        tasksIndex: {
          queried: false,
          status: 'SOURCE_UNAVAILABLE',
          reason: READ_FAIL_REASON,
        },
        tasks: [{ id: 'partial', title: 'Hidden Task', status: 'ready', clientCode: 'ACCG01' }],
      }),
    );
    assert.match(unread.tasks.summary, /tasks=SOURCE_UNAVAILABLE/);
    assert.match(unread.tasks.summary, /could not be read/);
    assert.equal(/OWNER_DECISION_REQUIRED|pageCap=80|Hidden Task/.test(unread.tasks.summary), false);

    const answer = answerClientOperatingBrief('List ACCG01 tasks', {
      entitledCodes: ['ACCG01'],
      workspace: workspace({
        tasksIndex: { queried: false, status: 'SOURCE_UNAVAILABLE', reason: PAGE_CAP_REASON },
        tasks: [{ id: 'partial', title: 'Hidden Task', status: 'ready', clientCode: 'ACCG01' }],
      }),
    });
    assert.match(answer, /tasks=SOURCE_UNAVAILABLE/);
    assert.match(answer, /OWNER_DECISION_REQUIRED pageCap=80 top=100/);
    assert.equal(answer.includes('Hidden Task'), false);
    assert.equal(/meetings=|documents=|contacts=/.test(answer), false);
    assert.match(answer, /canExecute=false/);
  });

  it('keeps working-on on projects and blocked on the blocked queue', () => {
    const snapshot = workspace({
      tasks: [
        {
          id: 'b1',
          title: 'ACCG waiting on signature',
          status: 'blocked',
          clientCode: 'ACCG01',
          blocker: 'Signature packet',
        },
        {
          id: 't-done',
          title: 'Completed filing',
          status: 'completed',
          clientCode: 'ACCG01',
        },
      ],
    });
    const working = answerClientOperatingBrief('What are we working on for ACCG01?', {
      entitledCodes: ['ACCG01'],
      workspace: snapshot,
    });
    assert.match(working, /Current\/active projects/);
    assert.match(working, /ACCG operating engagement/);
    assert.equal(/tasks=INDEXED|tasks=MISSING|tasks=SOURCE_UNAVAILABLE/.test(working), false);

    const projects = answerClientOperatingBrief('What projects are active for ACCG01?', {
      entitledCodes: ['ACCG01'],
      workspace: snapshot,
    });
    assert.match(projects, /projects=/);
    assert.match(projects, /2 open HVCG_Tasks/);
    assert.equal(/tasks=INDEXED|tasks=MISSING/.test(projects), false);
    assert.equal(projects.includes('Completed filing'), false);

    const blocked = answerClientOperatingBrief('What is blocked for ACCG01?', {
      entitledCodes: ['ACCG01'],
      workspace: snapshot,
    });
    assert.match(blocked, /ACCG waiting on signature/);
    assert.equal(/tasks=INDEXED|tasks=MISSING|tasks=SOURCE_UNAVAILABLE/.test(blocked), false);
  });

  it('does not change contacts, meetings, documents, capital, or finance answers', () => {
    const snapshot = workspace({
      tasks: [{ id: 't1', title: 'File the ACCG return', status: 'ready', clientCode: 'ACCG01', dueDate: '2026-10-02' }],
    });
    const contacts = answerClientOperatingBrief('What contacts exist for ACCG01?', {
      entitledCodes: ['ACCG01'],
      workspace: snapshot,
    });
    assert.match(contacts, /contacts=INDEXED/);
    assert.match(contacts, /Ada Lovelace <ada@accg\.example>, Founder/);
    assert.equal(/tasks=INDEXED|File the ACCG return/.test(contacts), false);

    const meetings = answerClientOperatingBrief('What meetings exist for ACCG01?', {
      entitledCodes: ['ACCG01'],
      workspace: snapshot,
    });
    assert.match(meetings, /meetings=INDEXED/);
    assert.match(meetings, /ACCG kickoff \(2026-09-01\)/);
    assert.equal(/tasks=INDEXED/.test(meetings), false);

    const documents = answerClientOperatingBrief('What documents exist for ACCG01?', {
      entitledCodes: ['ACCG01'],
      workspace: snapshot,
    });
    assert.match(documents, /documents=INDEXED/);
    assert.match(documents, /ACCG indexed correspondence\.pdf/);
    assert.equal(documents.includes('File the ACCG return'), false);

    const capital = answerClientOperatingBrief('What is the capital context for ACCG01?', {
      entitledCodes: ['ACCG01'],
      workspace: snapshot,
    });
    assert.match(capital, /capitalContext=/);
    assert.match(capital, /Amounts, lender, and funding status remain unstated/);
    assert.equal(/tasks=INDEXED/.test(capital), false);

    const finance = answerClientOperatingBrief('What is the finance picture for ACCG01?', {
      entitledCodes: ['ACCG01'],
      workspace: snapshot,
    });
    assert.match(finance, /financialContext=/);
    assert.equal(/tasks=INDEXED|File the ACCG return/.test(finance), false);
  });

  it('places indexed tasks under what Atlas knows and the other states under what Atlas does not know', () => {
    const indexed = answerClientOperatingBrief('Give me the current ACCG operating brief.', {
      entitledCodes: ['ACCG01'],
      explicitClientCode: 'ACCG01',
      workspace: workspace({
        tasks: [{ id: 't1', title: 'File the ACCG return', status: 'ready', clientCode: 'ACCG01', dueDate: '2026-10-02' }],
      }),
    });
    const [knows, unknown] = indexed.split('WHAT ATLAS DOES NOT KNOW');
    assert.match(knows || '', /tasks=INDEXED/);
    assert.match(knows || '', /File the ACCG return \(ready, due 2026-10-02\)/);
    assert.equal((unknown || '').includes('tasks='), false);
    assert.match(indexed, /GLOBAL_AUTO_RESPOND=false/);
    assert.match(indexed, /canExecute=false/);

    const missing = answerClientOperatingBrief('Give me the current ACCG operating brief.', {
      entitledCodes: ['ACCG01'],
      explicitClientCode: 'ACCG01',
      workspace: workspace(),
    });
    const missingUnknown = missing.split('WHAT ATLAS DOES NOT KNOW')[1] || '';
    assert.match(missingUnknown, /tasks=MISSING/);
    assert.equal(missing.split('WHAT ATLAS DOES NOT KNOW')[0]?.includes('tasks=INDEXED'), false);
  });

  it('fail-closes a foreign or unknown ClientCode and does not emit the entitled list', () => {
    const foreign = answerClientOperatingBrief('What tasks does PDG01 have?', {
      entitledCodes: ['ACCG01', 'PDG01'],
      workspace: workspace({ tasks: indexedTasks() }),
    });
    assert.match(foreign, /Fail closed/);
    assert.equal(foreign.includes('File the ACCG return'), false);
    assert.equal(/tasks=INDEXED/.test(foreign), false);

    const unknown = answerClientOperatingBrief('What tasks exist for ZZZ01?', {
      entitledCodes: ['ACCG01', 'PDG01'],
    });
    assert.match(unknown, /Fail closed|Client scope is required|will not fall back/i);
    assert.equal(unknown.includes('File the ACCG return'), false);
  });

  it('answers a missing workspace as tasks=SOURCE_UNAVAILABLE without inventing page_cap', () => {
    const answer = tasksIndexUnavailableAnswer('ACCG01');
    assert.match(answer, /tasks=SOURCE_UNAVAILABLE/);
    assert.match(answer, /HVCG_Tasks/);
    assert.equal(/tasks=MISSING|tasks=INDEXED|reason=page_cap|OWNER_DECISION_REQUIRED|documents=|meetings=|contacts=/.test(answer), false);
    assert.match(answer, /GLOBAL_AUTO_RESPOND=false/);
    assert.match(answer, /capitalSubmit=false/);
    assert.match(answer, /canExecute=false/);
  });
});
