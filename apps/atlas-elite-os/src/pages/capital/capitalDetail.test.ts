import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  coerceApplications,
  isSyntheticMutationTarget,
  nextAttestationOptions,
  normalizeOpportunityDetail,
} from './capitalDetail.ts';

describe('Elite capital detail mapping', () => {
  it('maps Hub applications[] onto application convenience field', () => {
    const mapped = normalizeOpportunityDetail({
      opportunity: { id: 'cap-1', title: 'File' },
      applications: [
        { id: 'app-1', lenderId: 'ln-a', status: 'PREPARED', populatedFields: {}, missingFields: [] },
        { id: 'app-2', lenderId: 'ln-b', status: 'BLOCKED_MISSING_FIELDS', populatedFields: {}, missingFields: [] },
      ],
      rfis: [{ id: 'r1', item: 'July statement' }],
      comparison: { rows: [], bands: { LOWEST_COST: 'app-1' }, notes: [], derivedNotQuoted: true },
      funding: null,
    });
    assert.equal(Array.isArray(mapped.applications), true);
    assert.equal((mapped.applications as unknown[]).length, 2);
    assert.equal((mapped.application as { id: string }).id, 'app-1');
    assert.equal((mapped.rfis as unknown[]).length, 1);
    assert.equal((mapped.comparison as { derivedNotQuoted?: boolean }).derivedNotQuoted, true);
  });

  it('does not treat Hub application[] (legacy duplicate key) as a package object', () => {
    const pkgs = [{ id: 'app-9', lenderId: 'ln-syn-1', populatedFields: { a: { value: 1, verification: 'UNVERIFIED' } } }];
    const fromLegacy = coerceApplications({ application: pkgs, applications: pkgs });
    assert.equal(fromLegacy.length, 1);
    assert.equal((fromLegacy[0] as { id: string }).id, 'app-9');
    const mapped = normalizeOpportunityDetail({ opportunity: { id: 'cap-2' }, application: pkgs });
    assert.equal(Array.isArray(mapped.application), false);
    assert.equal((mapped.application as { id: string }).id, 'app-9');
    assert.equal((mapped.applications as unknown[]).length, 1);
  });

  it('wraps a true singular application object', () => {
    const mapped = normalizeOpportunityDetail({
      opportunity: { id: 'cap-3' },
      application: { id: 'app-solo', lenderId: 'ln-x', populatedFields: {}, missingFields: [] },
    });
    assert.equal((mapped.applications as unknown[]).length, 1);
    assert.equal((mapped.application as { id: string }).id, 'app-solo');
  });

  it('never invents a package when Hub returns none', () => {
    const mapped = normalizeOpportunityDetail({ opportunity: { id: 'cap-4' }, applications: [] });
    assert.equal(mapped.application, null);
    assert.deepEqual(mapped.applications, []);
    assert.deepEqual(mapped.rfis, []);
    assert.equal(mapped.funding, null);
  });

  it('limits synthetic mutation ids to SYN* / cap-syn-*', () => {
    assert.equal(isSyntheticMutationTarget('cap-syn-ready'), true);
    assert.equal(isSyntheticMutationTarget('SYN09'), true);
    assert.equal(isSyntheticMutationTarget('ACCG01'), false);
    assert.equal(isSyntheticMutationTarget('live-client-88'), false);
    assert.deepEqual(nextAttestationOptions('PREPARED'), ['CLIENT_CONFIRMATION_REQUIRED', 'CORRECTION_REQUIRED']);
    assert.deepEqual(nextAttestationOptions('CLIENT_CONFIRMED'), ['APPROVED_FOR_SUBMISSION', 'CORRECTION_REQUIRED']);
  });
});
