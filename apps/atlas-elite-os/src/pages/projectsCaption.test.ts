/**
 * W2R Elite projects caption. Display only on a loaded workspace.
 * projects=PARTIAL when the hygiene-kept array is non-empty.
 * projects=MISSING when it is empty. Never projects=INDEXED.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PROJECTS_MISSING_RELATED_SENTENCE,
  PROJECTS_PARTIAL_CAPTION,
  PROJECTS_READ_ONLY_EMPTY_DESCRIPTION,
  projectsChipLabel,
} from './projectsCaption.ts';

const root = dirname(fileURLToPath(import.meta.url));

const CAPTION_TEXT = [
  PROJECTS_MISSING_RELATED_SENTENCE,
  PROJECTS_PARTIAL_CAPTION,
  PROJECTS_READ_ONLY_EMPTY_DESCRIPTION,
].join(' ');

describe('W2R Elite projects caption', () => {
  it('labels a non-empty loaded set projects=PARTIAL and never INDEXED', () => {
    assert.equal(projectsChipLabel(1), 'projects=PARTIAL');
    assert.equal(projectsChipLabel(6), 'projects=PARTIAL');
    assert.match(PROJECTS_PARTIAL_CAPTION, /projects=PARTIAL/);
    assert.match(PROJECTS_PARTIAL_CAPTION, /hygiene-kept HVCG_Projects/);
    assert.equal(PROJECTS_PARTIAL_CAPTION.includes('projects=MISSING'), false);
    assert.equal(PROJECTS_PARTIAL_CAPTION.includes('projects=INDEXED'), false);
    assert.equal(PROJECTS_PARTIAL_CAPTION.includes('Create a project'), false);
    assert.equal(PROJECTS_PARTIAL_CAPTION.includes('0 projects'), false);
  });

  it('labels a loaded empty set projects=MISSING and does not say to create', () => {
    assert.equal(projectsChipLabel(0), 'projects=MISSING');
    assert.match(PROJECTS_MISSING_RELATED_SENTENCE, /projects=MISSING/);
    assert.match(PROJECTS_READ_ONLY_EMPTY_DESCRIPTION, /projects=MISSING/);
    assert.match(PROJECTS_READ_ONLY_EMPTY_DESCRIPTION, /Queried HVCG_Projects returned no entitled rows/);
    assert.equal(PROJECTS_MISSING_RELATED_SENTENCE.includes('projects=PARTIAL'), false);
    assert.equal(PROJECTS_MISSING_RELATED_SENTENCE.includes('Create'), false);
    assert.equal(
      PROJECTS_READ_ONLY_EMPTY_DESCRIPTION.includes('Create a project to track next actions'),
      false,
    );
    assert.equal(/SOURCE_UNAVAILABLE|Not queried|projects=INDEXED/.test(CAPTION_TEXT), false);
    assert.equal(/ACCG ROS|warehouse|Richmond|buildout|Onboarding|harden-/.test(CAPTION_TEXT), false);
  });

  it('wires the State chip, related work, and the read-only empty description', () => {
    const page = readFileSync(join(root, 'LiveClientDetailPage.tsx'), 'utf8');
    const helper = readFileSync(join(root, 'projectsCaption.ts'), 'utf8');

    const failed = page.slice(page.indexOf('if (unauthorized'), page.indexOf('const title = overview'));
    assert.equal(failed.includes('projectsChipLabel'), false);
    assert.equal(failed.includes('PROJECTS_MISSING_RELATED_SENTENCE'), false);
    assert.equal(failed.includes('projects=MISSING'), false);

    const state = page.slice(page.indexOf('label="State"'), page.indexOf('label="Next"'));
    assert.match(state, /projectsChipLabel\(projects\.length\)/);
    assert.equal(state.includes('${projects.length} projects'), false);
    assert.match(state, /tasksChipLabel\(tasksHonesty\.kind\)/);
    assert.equal(state.includes('${tasks.length} open tasks'), false);
    assert.match(state, /\$\{workspace\.timeline\.length\} timeline/);

    const related = page.slice(page.indexOf('label="Related work"'), page.indexOf('label="What requires me"'));
    assert.match(related, /PROJECTS_MISSING_RELATED_SENTENCE/);
    assert.match(related, /PROJECTS_PARTIAL_CAPTION/);
    assert.match(related, /projectDetailPath\(p\.id\)/);
    assert.match(related, /\{p\.name\}/);
    assert.equal(related.includes('No entitled projects on this ClientCode'), false);
    assert.equal(related.includes('Create a project'), false);
    assert.match(related, /sectionHonesty\(workspace\.documents\)/);
    assert.match(related, /\{communicationsListView\.sentence\}/);
    assert.match(related, /\{tasksHonesty\.sentence\}/);
    assert.match(related, /capitalLinked/);

    const card = page.slice(page.indexOf('title="Related projects"'), page.indexOf('title="Related tasks"'));
    assert.match(card, /This ClientCode is read-only on Hub\. Create is hidden until an approved write window exists\./);
    assert.match(card, /placeholder="New project name"/);
    assert.match(card, />\s*Create project\s*</);
    const description = card.slice(card.indexOf('description={'), card.indexOf('DataTable'));
    assert.match(description, /writePolicy === 'read_only'/);
    assert.match(description, /PROJECTS_READ_ONLY_EMPTY_DESCRIPTION/);
    assert.match(description, /Create a project to track next actions/);
    const readOnlyArm = description.slice(
      description.indexOf("writePolicy === 'read_only'"),
      description.indexOf(':'),
    );
    assert.match(readOnlyArm, /PROJECTS_READ_ONLY_EMPTY_DESCRIPTION/);
    assert.equal(readOnlyArm.includes('Create a project to track next actions'), false);

    assert.equal(helper.includes('projects=INDEXED'), false);
    assert.equal(helper.includes('SOURCE_UNAVAILABLE'), false);
    assert.equal(helper.includes('Not queried'), false);
    assert.equal(helper.includes('filterOwnerFacingProjects'), false);
    assert.equal(helper.includes('hvsRecovered'), false);
    assert.equal(helper.includes('Create a project'), false);
  });

  it('leaves the certified W2G projects answer and phrase map unchanged', () => {
    const brief = readFileSync(
      join(root, '../../../atlas-integration-api/src/pm/operatorDesk/askAtlasClientOperatingBrief.ts'),
      'utf8',
    );
    const projectsPhrase = String.raw`/\bwhat projects\b|\bprojects are active\b|\bprojects brief\b|\bprojects domain\b|\bactive projects\b|\bwhat are the (?:active )?projects\b|^projects$/`;
    assert.equal(brief.includes(projectsPhrase), true);
    assert.equal(brief.includes(String.raw`\blist\b.+\bprojects\b`), false);
    const projectsCase = brief.slice(brief.indexOf("case 'projects':"), brief.indexOf("case 'changed':"));
    assert.match(projectsCase, /truth\.answers\.workingOn\.text/);
    assert.match(projectsCase, /projects=\$\{truth\.projects\.completeness\}/);
    assert.match(projectsCase, /REAL_CURRENT_OPERATING/);
    assert.match(projectsCase, /hygiene-kept HVCG_Projects/);
    const detect = brief.slice(brief.indexOf('function detectTopic'), brief.indexOf('function renderTopic'));
    assert.match(detect, /if \(\/capital\/\.test\(q\)\) return 'capital'/);

    const truth = readFileSync(
      join(root, '../../../atlas-integration-api/src/pm/commercialContext/clientTruth.ts'),
      'utf8',
    );
    assert.match(truth, /projectCount > 0 \? 'PARTIAL' : 'MISSING'/);
    assert.match(truth, /canExecute: false/);
    assert.match(truth, /capitalSubmit: false/);
    assert.match(truth, /globalAutoRespond: false/);
  });
});
