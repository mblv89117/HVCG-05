import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { shouldUseSwaSignInNavigation } from './swaSignIn.ts';

describe('SWA sign-in helpers', () => {
  it('detects hosted Static Web Apps hosts and not local Vite', () => {
    assert.equal(shouldUseSwaSignInNavigation('zealous-rock-0090c7e1e.7.azurestaticapps.net'), true);
    assert.equal(shouldUseSwaSignInNavigation('app.azurestaticapps.dev'), true);
    assert.equal(shouldUseSwaSignInNavigation('localhost'), false);
    assert.equal(shouldUseSwaSignInNavigation('127.0.0.1'), false);
  });
});
