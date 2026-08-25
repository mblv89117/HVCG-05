import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isHvsRecoveredKind } from '../src/pm/sharepoint/hvsRecoveredDocuments.ts';
import { buildAskAtlasAnswer } from '../src/pm/operatorDesk/askAtlas.ts';
import { buildOperatorDeskModel, emptyHonestDesk, emptyHonestOperatingPicture } from '../src/pm/operatorDesk/model.ts';
import {
  ASK_ATLAS_MISSION_KEY,
  ASK_ATLAS_QUESTION,
  ASK_ATLAS_RANKING,
  type AskAtlasAttentionState,
  type OperatorOperatingPicture,
} from '../src/pm/operatorDesk/types.ts';

const AMOUNT = /\b\d{1,3}(?:,\d{3})+(?:\.\d{2})?\b/;

function lastIndex(states: string[], state: AskAtlasAttentionState): number {
  return states.lastIndexOf(state);
}

function firstIndex(states: string[], state: AskAtlasAttentionState): number {
  return states.indexOf(state);
}

function ranksBefore(states: string[], earlier: AskAtlasAttentionState, later: AskAtlasAttentionState): void {
  const lastEarlier = lastIndex(states, earlier);
  const firstLater = firstIndex(states, later);
  if (lastEarlier === -1 || firstLater === -1) return;
  assert.ok(lastEarlier < firstLater, `${earlier} should rank before ${later}`);
}

describe('Ask Atlas attention answer', () => {
  it('ranks entitled queue items and keeps Prodigy At Risk LIKELY without invented amounts', () => {
    const model = buildOperatorDeskModel({
      hubSha: '31d3015',
      entitledClients: ['SYN01'],
      commandCenter: {},
      commercialContext: emptyHonestDesk(1),
    });
    const answer = model.askAtlas;
    assert.equal(answer.kind, 'ask_atlas_attention_v1');
    assert.equal(answer.question, ASK_ATLAS_QUESTION);
    assert.equal(answer.invented, false);
    assert.equal(answer.honestEmpty, false);
    assert.deepEqual(answer.ranking, [...ASK_ATLAS_RANKING]);
    assert.ok(answer.items.length > 0);
    assert.equal(answer.activity.agent, 'atlas-hub-operator');
    assert.equal(answer.activity.missionKey, ASK_ATLAS_MISSION_KEY);
    assert.equal(answer.activity.trigger, 'operator_operating_picture');
    assert.equal(answer.activity.result, 'answered');
    assert.match(answer.activity.timestamp, /^\d{4}-\d{2}-\d{2}T/);
    assert.deepEqual(answer.activity.tools, ['operator_operating_picture', 'hvs_actionable_queues']);

    const states = answer.items.map((row) => row.state);
    ranksBefore(states, 'At Risk', 'Overdue');
    ranksBefore(states, 'Overdue', 'Decision Required');
    ranksBefore(states, 'Decision Required', 'Capital');
    ranksBefore(states, 'Capital', 'Waiting');
    ranksBefore(states, 'Waiting', 'Blocked');

    const atRisk = answer.items.filter((row) => row.state === 'At Risk');
    assert.equal(atRisk.length, 1);
    assert.equal(atRisk[0]?.client, 'Prodigy Games');
    assert.equal(atRisk[0]?.clientCode, 'PDG01');
    assert.equal(atRisk[0]?.classification, 'LIKELY');
    assert.equal(atRisk[0]?.provenance, 'LIKELY');
    assert.match(atRisk[0]?.why || '', /past-due invoice filenames and capital-packet filenames/i);
    assert.match(atRisk[0]?.basedOn || '', /Past Due Invoice/i);
    assert.match(atRisk[0]?.basedOn || '', /Capital_Acquisition/i);
    assert.equal(/^\d+\s+documents?\b/i.test(atRisk[0]?.why || ''), false);

    assert.equal(
      answer.items.some(
        (row) => row.state === 'At Risk' && (row.client === 'Colorado Beef' || row.clientCode === 'CCB01'),
      ),
      false,
    );
    assert.ok(answer.items.some((row) => row.state === 'Capital' && row.client === 'Colorado Beef'));
    assert.ok(answer.items.some((row) => row.state === 'Overdue' && row.clientCode === 'PDG01'));

    assert.equal(
      answer.items.every((row) => ['CONFIRMED', 'LIKELY', 'PROPOSED'].includes(row.classification)),
      true,
    );
    assert.equal(
      answer.items.every((row) => Boolean(row.why) && Boolean(row.basedOn) && Boolean(row.evidence)),
      true,
    );

    const serialized = JSON.stringify(answer);
    assert.equal(serialized.includes('$'), false);
    assert.equal(AMOUNT.test(serialized), false);
    assert.equal(/\bltv\s*[:=]\s*\d/i.test(serialized), false);
  });

  it('drops recovered items when HVS is blocked and stays honestly empty', () => {
    const live = emptyHonestOperatingPicture();
    const blocked: OperatorOperatingPicture = {
      ...live,
      hvsDataAccess: 'BLOCKED',
    };
    const answer = buildAskAtlasAnswer(blocked, { now: '2026-08-22T17:00:00.000Z' });
    assert.equal(answer.items.every((row) => !isHvsRecoveredKind(row.kind)), true);
    assert.equal(answer.items.length, 0);
    assert.equal(answer.honestEmpty, true);
    assert.equal(answer.invented, false);
    assert.equal(answer.activity.result, 'hvs_blocked');
    assert.equal(answer.activity.classification, 'HONEST_EMPTY');
    assert.equal(answer.activity.timestamp, '2026-08-22T17:00:00.000Z');
  });

  it('does not manufacture attention items to fill the ranked list', () => {
    const empty: OperatorOperatingPicture = {
      ...emptyHonestOperatingPicture(),
      hvsDataAccess: 'PARTIAL',
      queues: {
        needsAction: [],
        waiting: [],
        overdue: [],
        blocked: [],
        decisionRequired: [],
        atRisk: [],
        ready: [],
        outcomes: [],
      },
      hvsActionableClientKnowledge: [],
      hvsRecoveredCapitalPackets: [],
    };
    const answer = buildAskAtlasAnswer(empty);
    assert.equal(answer.items.length, 0);
    assert.equal(answer.honestEmpty, true);
    assert.equal(answer.activity.result, 'honest_empty');
    assert.deepEqual(answer.ranking, [...ASK_ATLAS_RANKING]);
  });
});
