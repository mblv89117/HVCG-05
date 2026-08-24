/**
 * ATLAS-M365-MEETING-ATTENTION-001
 * Entitled authorizedSearch.meetings copy into get_attention_items / askAtlas
 * only when hit.queue is already an ASK_ATLAS_RANKING state. Never invents
 * a rank, downloadUrl, transcript, or TargetAmount.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildAskAtlasAnswer } from '../src/pm/operatorDesk/askAtlas.ts';
import { getAttentionItems } from '../src/pm/operatorDesk/toolGateway.ts';
import { buildOperatorDeskModel, emptyHonestDesk, emptyHonestOperatingPicture } from '../src/pm/operatorDesk/model.ts';
import {
  ASK_ATLAS_RANKING,
  type AskAtlasAttentionItem,
  type AtlasAuthorizedSearchHit,
  type OperatorOperatingPicture,
} from '../src/pm/operatorDesk/types.ts';
import type { AtlasPrincipal } from '../src/middleware/auth.ts';
import type { PmSearchHit } from '../src/pm/sharepoint/search.ts';

const OUTLOOK = 'https://outlook.office.com/calendar/item/syn01-standup';
const SAS =
  'https://hvfiles.blob.core.windows.net/docs/meet.ics?sv=2024-11-04&sig=abc&se=2026-08-24T00:00:00Z&sp=r';
const ANON =
  'https://highvaluecapitalgroup.sharepoint.com/:b:/s/HVCG-Clients/abc?guestaccess=1&share=xyz';
const FORBIDDEN = /downloadUrl|transcript|TargetAmount|\$\d|ltv\s*[:=]/i;

function staff(allowedClientIds: string[] = ['SYN01']): AtlasPrincipal {
  return {
    userId: '11111111-1111-4111-8111-aaaaaaaaaa01',
    organizationId: 'org-hvcg',
    allowedClientIds,
    roles: ['HVCG Team Member'],
  };
}

function meetingHit(overrides: Partial<AtlasAuthorizedSearchHit> & Pick<AtlasAuthorizedSearchHit, 'id' | 'title'>): AtlasAuthorizedSearchHit {
  return {
    kind: 'meeting',
    why: overrides.title,
    basedOn: 'Entitled HVCG_Meetings row already on authorizedSearch.meetings.',
    provenance: 'LIKELY',
    classification: 'LIKELY',
    source: 'HVCG_Meetings',
    ...overrides,
  };
}

function indexMeeting(overrides: Partial<PmSearchHit> & Pick<PmSearchHit, 'id' | 'title'>): PmSearchHit {
  return {
    kind: 'meeting',
    href: '/api/pm/clients/SYN01/desk',
    source: 'HVCG_Meetings',
    clientCode: 'SYN01',
    ...overrides,
  };
}

function emptyQueues(): OperatorOperatingPicture['queues'] {
  return {
    needsAction: [],
    waiting: [],
    overdue: [],
    blocked: [],
    decisionRequired: [],
    atRisk: [],
    ready: [],
    outcomes: [],
  };
}

function pictureWithoutQueues(): OperatorOperatingPicture {
  return {
    ...emptyHonestOperatingPicture(),
    queues: emptyQueues(),
    hvsActionableClientKnowledge: [],
    hvsRecoveredCapitalPackets: [],
  };
}

function meetingItems(items: AskAtlasAttentionItem[]): AskAtlasAttentionItem[] {
  return items.filter((row) => row.kind === 'meeting');
}

describe('Ask Atlas entitled queued meeting attention', () => {
  it('copies a queued entitled meeting into askAtlas.items with that existing state', () => {
    const answer = buildAskAtlasAnswer(pictureWithoutQueues(), {
      entitledClientCodes: ['SYN01'],
      meetingHits: [
        meetingHit({
          id: 'meet-syn-queued',
          title: 'SYN01 capital standup',
          clientCode: 'SYN01',
          queue: 'Decision Required',
          sourceEventId: 'AAMk-syn-cal-1',
          webUrl: OUTLOOK,
          classification: 'CONFIRMED',
          provenance: 'CONFIRMED',
        }),
      ],
    });
    const meetings = meetingItems(answer.items);
    assert.equal(meetings.length, 1);
    assert.equal(meetings[0]?.kind, 'meeting');
    assert.equal(meetings[0]?.state, 'Decision Required');
    assert.equal(meetings[0]?.invented, false);
    assert.equal(meetings[0]?.clientCode, 'SYN01');
    assert.equal(meetings[0]?.classification, 'CONFIRMED');
    assert.equal(meetings[0]?.provenance, 'CONFIRMED');
    assert.equal(meetings[0]?.webUrl, OUTLOOK);
    assert.equal(meetings[0]?.sourceEventId, 'AAMk-syn-cal-1');
    assert.match(meetings[0]?.basedOn || '', /Decision Required/);
    assert.match(meetings[0]?.basedOn || '', /AAMk-syn-cal-1/);
    assert.match(meetings[0]?.evidence || '', /Decision Required/);
    assert.match(meetings[0]?.evidence || '', /AAMk-syn-cal-1/);
    assert.equal(answer.invented, false);
    assert.equal(answer.honestEmpty, false);
  });

  it('omits a meeting without an existing ASK_ATLAS_RANKING queue', () => {
    const answer = buildAskAtlasAnswer(pictureWithoutQueues(), {
      entitledClientCodes: ['SYN01'],
      meetingHits: [
        meetingHit({
          id: 'meet-syn-no-queue',
          title: 'SYN01 weekly',
          clientCode: 'SYN01',
          sourceEventId: 'AAMk-syn-none',
          webUrl: OUTLOOK,
        }),
      ],
    });
    assert.equal(meetingItems(answer.items).length, 0);
    assert.equal(
      answer.items.some((row) => row.id === 'meet-syn-no-queue' || row.sourceEventId === 'AAMk-syn-none'),
      false,
    );
  });

  it('never shows Client B meeting attention to Client A', () => {
    const answer = buildAskAtlasAnswer(pictureWithoutQueues(), {
      entitledClientCodes: ['SYN01'],
      meetingHits: [
        meetingHit({
          id: 'meet-pdg-queued',
          title: 'PDG01 lender call',
          clientCode: 'PDG01',
          queue: 'At Risk',
          sourceEventId: 'AAMk-pdg-cal-1',
          webUrl: 'https://outlook.office.com/calendar/item/pdg01-lender',
        }),
        meetingHit({
          id: 'meet-syn-queued',
          title: 'SYN01 capital standup',
          clientCode: 'SYN01',
          queue: 'Waiting',
          sourceEventId: 'AAMk-syn-cal-1',
          webUrl: OUTLOOK,
        }),
      ],
    });
    const meetings = meetingItems(answer.items);
    assert.equal(meetings.length, 1);
    assert.equal(meetings[0]?.clientCode, 'SYN01');
    assert.equal(meetings[0]?.state, 'Waiting');
    assert.equal(
      answer.items.some((row) => row.clientCode === 'PDG01' || /pdg/i.test(row.id) || /pdg/i.test(row.title)),
      false,
    );
  });

  it('drops SAS and anonymous meeting webUrl on copied attention items', () => {
    const answer = buildAskAtlasAnswer(pictureWithoutQueues(), {
      entitledClientCodes: ['SYN01'],
      meetingHits: [
        meetingHit({
          id: 'meet-sas',
          title: 'SYN01 SAS meeting',
          clientCode: 'SYN01',
          queue: 'Overdue',
          sourceEventId: 'AAMk-syn-sas',
          webUrl: SAS,
        }),
        meetingHit({
          id: 'meet-anon',
          title: 'SYN01 anonymous meeting',
          clientCode: 'SYN01',
          queue: 'Blocked',
          sourceEventId: 'AAMk-syn-anon',
          webUrl: ANON,
        }),
        meetingHit({
          id: 'meet-ok',
          title: 'SYN01 outlook meeting',
          clientCode: 'SYN01',
          queue: 'Capital',
          sourceEventId: 'AAMk-syn-ok',
          webUrl: OUTLOOK,
        }),
      ],
    });
    const byId = new Map(meetingItems(answer.items).map((row) => [row.id, row]));
    assert.equal(byId.get('meet-sas')?.webUrl, undefined);
    assert.equal(byId.get('meet-anon')?.webUrl, undefined);
    assert.equal(byId.get('meet-ok')?.webUrl, OUTLOOK);
    const blob = JSON.stringify(meetingItems(answer.items));
    assert.equal(/blob\.core\.windows\.net|\bsig=|guestaccess=1/i.test(blob), false);
  });

  it('does not invent a rank, downloadUrl, transcript, or TargetAmount', () => {
    const answer = buildAskAtlasAnswer(pictureWithoutQueues(), {
      entitledClientCodes: ['SYN01'],
      meetingHits: [
        meetingHit({
          id: 'meet-syn-queued',
          title: 'SYN01 capital standup',
          clientCode: 'SYN01',
          queue: 'Waiting',
          sourceEventId: 'AAMk-syn-cal-1',
          webUrl: OUTLOOK,
        }),
      ],
    });
    const meetings = meetingItems(answer.items);
    assert.equal(meetings[0]?.invented, false);
    assert.equal(meetings[0]?.state, 'Waiting');
    assert.deepEqual(answer.ranking, [...ASK_ATLAS_RANKING]);
    const blob = JSON.stringify(answer);
    assert.equal(FORBIDDEN.test(blob), false);
    assert.equal(blob.includes('downloadUrl'), false);
    assert.equal(/transcript/i.test(blob), false);
    assert.equal(/TargetAmount/.test(blob), false);
    assert.equal(answer.invented, false);
  });

  it('omits unscoped meetings even when a queue is present', () => {
    const answer = buildAskAtlasAnswer(pictureWithoutQueues(), {
      entitledClientCodes: ['SYN01'],
      meetingHits: [
        meetingHit({
          id: 'meet-unscoped',
          title: 'Unscoped standup',
          queue: 'At Risk',
          sourceEventId: 'AAMk-unscoped',
          webUrl: OUTLOOK,
        }),
      ],
    });
    assert.equal(meetingItems(answer.items).length, 0);
  });

  it('honestly omits meeting attention when no entitled meeting has a queue', () => {
    const live = emptyHonestOperatingPicture();
    const existing = buildAskAtlasAnswer(live);
    const withMeetings = buildAskAtlasAnswer(live, {
      entitledClientCodes: ['SYN01'],
      meetingHits: [
        meetingHit({
          id: 'meet-syn-no-queue',
          title: 'SYN01 weekly',
          clientCode: 'SYN01',
        }),
      ],
    });
    assert.equal(meetingItems(withMeetings.items).length, 0);
    assert.deepEqual(
      withMeetings.items.map((row) => row.id),
      existing.items.map((row) => row.id),
    );
  });

  it('preserves existing non-meeting attention when copying a queued meeting', () => {
    const live = emptyHonestOperatingPicture();
    const existing = buildAskAtlasAnswer(live);
    assert.ok(existing.items.some((row) => row.kind !== 'meeting'));
    const answer = buildAskAtlasAnswer(live, {
      entitledClientCodes: ['SYN01', 'PDG01'],
      meetingHits: [
        meetingHit({
          id: 'meet-syn-queued',
          title: 'SYN01 capital standup',
          clientCode: 'SYN01',
          queue: 'Waiting',
          sourceEventId: 'AAMk-syn-cal-1',
          webUrl: OUTLOOK,
        }),
      ],
    });
    assert.ok(answer.items.some((row) => row.kind !== 'meeting'));
    assert.ok(answer.items.some((row) => row.kind === 'meeting' && row.state === 'Waiting'));
    for (const row of existing.items) {
      assert.ok(
        answer.items.some((copy) => copy.id === row.id && copy.state === row.state && copy.kind === row.kind),
        `missing existing attention ${row.id}`,
      );
    }
  });

  it('get_attention_items copies a queued entitled meeting and isolates clients', () => {
    const viaTool = getAttentionItems({
      principal: staff(['SYN01']),
      picture: pictureWithoutQueues(),
      entitledIndexHits: [
        indexMeeting({
          id: 'meet-syn-queued',
          title: 'SYN01 capital standup',
          clientCode: 'SYN01',
          sourceEventId: 'AAMk-syn-cal-1',
          webUrl: OUTLOOK,
          provenance: 'LIKELY',
          queue: 'Overdue',
        } as PmSearchHit),
        indexMeeting({
          id: 'meet-pdg-queued',
          title: 'PDG01 lender call',
          clientCode: 'PDG01',
          href: '/api/pm/clients/PDG01/desk',
          sourceEventId: 'AAMk-pdg-cal-1',
          webUrl: 'https://outlook.office.com/calendar/item/pdg01-lender',
          provenance: 'LIKELY',
          queue: 'At Risk',
        } as PmSearchHit),
      ],
    });
    const meetings = meetingItems(viaTool.items);
    assert.equal(meetings.length, 1);
    assert.equal(meetings[0]?.state, 'Overdue');
    assert.equal(meetings[0]?.clientCode, 'SYN01');
    assert.equal(meetings[0]?.invented, false);
    assert.equal(
      viaTool.items.some((row) => row.clientCode === 'PDG01' || /pdg/i.test(row.title)),
      false,
    );
  });

  it('get_attention_items omits a meeting without queue and drops SAS/anonymous webUrl', () => {
    const viaTool = getAttentionItems({
      principal: staff(['SYN01']),
      picture: pictureWithoutQueues(),
      deskSearch: {
        q: 'standup',
        ran: true,
        hitCount: 3,
        hits: [
          {
            id: 'meet-syn-no-queue',
            title: 'SYN01 weekly',
            kind: 'meeting',
            clientCode: 'SYN01',
            source: 'HVCG_Meetings',
            webUrl: OUTLOOK,
          },
          {
            id: 'meet-sas',
            title: 'SYN01 SAS meeting',
            kind: 'meeting',
            clientCode: 'SYN01',
            source: 'HVCG_Meetings',
            webUrl: SAS,
            ...{ queue: 'Waiting', sourceEventId: 'AAMk-syn-sas' },
          },
        ],
      },
    });
    assert.equal(
      viaTool.items.some((row) => row.id === 'meet-syn-no-queue'),
      false,
    );
    const sas = viaTool.items.find((row) => row.id === 'meet-sas');
    assert.equal(sas?.kind, 'meeting');
    assert.equal(sas?.state, 'Waiting');
    assert.equal(sas?.webUrl, undefined);
    assert.equal(/blob\.core\.windows\.net|\bsig=/i.test(JSON.stringify(viaTool)), false);
    assert.equal(FORBIDDEN.test(JSON.stringify(viaTool)), false);
  });

  it('desk model keeps existing non-meeting attention and copies a queued meeting', () => {
    const model = buildOperatorDeskModel({
      hubSha: '242af05',
      entitledClients: ['SYN01'],
      commandCenter: {},
      commercialContext: emptyHonestDesk(1),
      searchRan: true,
      searchQuery: 'standup',
      searchHits: [
        {
          id: 'meet-syn-queued',
          title: 'SYN01 capital standup',
          kind: 'meeting',
          clientCode: 'SYN01',
          source: 'HVCG_Meetings',
          webUrl: OUTLOOK,
          sourceEventId: 'AAMk-syn-cal-1',
          provenance: 'LIKELY',
          queue: 'Blocked',
        },
      ],
    });
    assert.equal(model.askAtlas.invented, false);
    assert.ok(model.askAtlas.items.some((row) => row.kind !== 'meeting'));
    const meeting = model.askAtlas.items.find((row) => row.kind === 'meeting');
    assert.equal(meeting?.state, 'Blocked');
    assert.equal(meeting?.invented, false);
    assert.equal(meeting?.clientCode, 'SYN01');
    assert.equal(meeting?.webUrl, OUTLOOK);
    assert.equal(FORBIDDEN.test(JSON.stringify(model.askAtlas)), false);
  });
});
