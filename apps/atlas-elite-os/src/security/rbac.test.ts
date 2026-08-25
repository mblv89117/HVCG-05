import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  atlasRole,
  can,
  canAccessAdmin,
  canViewFinance,
  normalizeRole,
  resolveAtlasRole,
  type AtlasRole,
  type Capability,
} from './rbac.ts';

const CAPABILITIES: Capability[] = [
  'viewExecutiveHome',
  'viewClients',
  'viewCrmLeads',
  'viewClientDetail',
  'viewFinance',
  'mutateTasks',
  'mutateApprovals',
  'viewAdmin',
  'viewDocumentsConfidential',
];

describe('Elite RBAC fail closed', () => {
  it('never defaults to Owner when unsigned or when claims are missing', () => {
    assert.equal(atlasRole(), 'Unresolved');
    assert.equal(resolveAtlasRole({ signedIn: false, environment: 'production' }), 'Unauthenticated');
    assert.equal(
      resolveAtlasRole({ signedIn: true, environment: 'production', idTokenClaims: {} }),
      'Unresolved',
    );
    assert.equal(
      resolveAtlasRole({ signedIn: true, environment: 'local', idTokenClaims: { roles: ['Superuser'] } }),
      'Unresolved',
    );
  });

  it('denies every capability for Unauthenticated and Unresolved', () => {
    for (const role of ['Unauthenticated', 'Unresolved'] as AtlasRole[]) {
      for (const cap of CAPABILITIES) {
        assert.equal(can(role, cap), false, `${role} ${cap}`);
      }
    }
    assert.equal(canAccessAdmin('Unresolved'), false);
    assert.equal(canViewFinance('HVCG Owner'), true);
    assert.equal(canViewFinance('Client Executive'), false);
    assert.equal(canAccessAdmin('Administrator'), true);
    assert.equal(canAccessAdmin('HVCG Team Member'), false);
    assert.equal(can('HVCG Owner', 'viewCrmLeads'), true);
    assert.equal(can('HVCG Team Member', 'viewCrmLeads'), true);
    assert.equal(can('Client Executive', 'viewCrmLeads'), false);
    assert.equal(can('Administrator', 'viewCrmLeads'), false);
  });

  it('does not treat Client Executive as Owner/Admin', () => {
    assert.equal(normalizeRole('Client Executive'), 'Client Executive');
    assert.equal(normalizeRole('executive'), 'HVCG Owner');
    const role = resolveAtlasRole({
      signedIn: true,
      environment: 'production',
      idTokenClaims: { roles: ['Client Executive'] },
    });
    assert.equal(role, 'Client Executive');
    assert.equal(canAccessAdmin(role), false);
    assert.equal(canViewFinance(role), false);
  });

  it('resolves known Entra roles and ignores unknown values', () => {
    assert.equal(
      resolveAtlasRole({
        signedIn: true,
        environment: 'staging',
        idTokenClaims: { roles: ['HVCG Owner'] },
      }),
      'HVCG Owner',
    );
    assert.equal(
      resolveAtlasRole({
        signedIn: true,
        environment: 'production',
        idTokenClaims: { extension_AtlasRole: 'Read-Only Advisor' },
      }),
      'Read-Only Advisor',
    );
    assert.equal(normalizeRole(''), null);
    assert.equal(normalizeRole('wildcard'), null);
  });

  it('DEV Owner session is ignored in production/staging', () => {
    assert.equal(
      resolveAtlasRole({
        signedIn: true,
        environment: 'production',
        devOwnerSession: true,
        devOwnerRole: 'HVCG Owner',
      }),
      'Unresolved',
    );
  });
});
