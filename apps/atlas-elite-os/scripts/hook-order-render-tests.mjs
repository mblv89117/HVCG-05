/**
 * Controlled React render reproduction of Hub-token → Projects transition.
 * Proves stable hook order across auth flips; contrasts with broken pattern (#310).
 */
import assert from 'node:assert/strict';
import { createElement, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'https://zealous-rock-0090c7e1e.7.azurestaticapps.net/projects',
});

Object.defineProperty(globalThis, 'window', { value: dom.window, configurable: true });
Object.defineProperty(globalThis, 'document', { value: dom.window.document, configurable: true });
Object.defineProperty(globalThis, 'HTMLElement', { value: dom.window.HTMLElement, configurable: true });
Object.defineProperty(globalThis, 'Node', { value: dom.window.Node, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function ProjectsAuthGate({ tokenReady, hasBearer, interactionRequired }) {
  const [rows] = useState([{ ownerName: 'Manny Barela', name: 'Demo', status: 'active', priority: 'normal' }]);
  const [query] = useState('');
  const owners = useMemo(
    () => Array.from(new Set(rows.map((r) => r.ownerName).filter(Boolean))).sort(),
    [rows],
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => (!q ? true : r.name.toLowerCase().includes(q)));
  }, [rows, query]);

  if (!tokenReady) return createElement('div', { 'data-stage': 'acquiring' }, 'Acquiring…');
  if (interactionRequired) return createElement('div', { 'data-stage': 'interaction' }, 'Authorize Hub');
  if (!hasBearer) return createElement('div', { 'data-stage': 'no-bearer' }, 'Sign in required');
  return createElement(
    'div',
    { 'data-stage': 'ready', 'data-owners': owners.join(','), 'data-count': String(filtered.length) },
    `${filtered.length} projects`,
  );
}

function BrokenProjectsAuthGate({ tokenReady, hasBearer }) {
  const [rows] = useState([{ ownerName: 'Manny', name: 'X' }]);
  if (!tokenReady) return createElement('div', null, 'wait');
  if (!hasBearer) return createElement('div', null, 'auth');
  const owners = useMemo(() => rows.map((r) => r.ownerName), [rows]);
  return createElement('div', null, owners.join(','));
}

const rootEl = document.getElementById('root');
const root = createRoot(rootEl);

const consoleErrors = [];
const originalError = console.error;
console.error = (...args) => {
  consoleErrors.push(args.map(String).join(' '));
  originalError(...args);
};

await act(async () => {
  root.render(createElement(ProjectsAuthGate, { tokenReady: false, hasBearer: false, interactionRequired: false }));
});
assert.equal(rootEl.textContent, 'Acquiring…');

await act(async () => {
  root.render(createElement(ProjectsAuthGate, { tokenReady: true, hasBearer: false, interactionRequired: true }));
});
assert.equal(rootEl.textContent, 'Authorize Hub');

await act(async () => {
  root.render(createElement(ProjectsAuthGate, { tokenReady: true, hasBearer: true, interactionRequired: false }));
});
assert.match(rootEl.textContent, /1 projects/);

await act(async () => {
  root.render(createElement(ProjectsAuthGate, { tokenReady: false, hasBearer: false, interactionRequired: false }));
});
await act(async () => {
  root.render(createElement(ProjectsAuthGate, { tokenReady: true, hasBearer: true, interactionRequired: false }));
});
assert.match(rootEl.textContent, /1 projects/);

const joined = consoleErrors.join('\n');
for (const needle of ['Rendered more hooks', 'Rendered fewer hooks', 'Invalid hook call', 'Minified React error #310']) {
  assert.equal(joined.includes(needle), false, `fixed gate must not log ${needle}`);
}

let brokenThrew = false;
try {
  await act(async () => {
    root.render(createElement(BrokenProjectsAuthGate, { tokenReady: false, hasBearer: false }));
  });
  await act(async () => {
    root.render(createElement(BrokenProjectsAuthGate, { tokenReady: true, hasBearer: true }));
  });
} catch (e) {
  brokenThrew = /more hooks|Rendered more hooks|#310|change in the order of Hooks/i.test(String(e));
}
assert.equal(brokenThrew, true, 'broken pattern must throw hook-order error for regression contrast');

console.error = originalError;
root.unmount();
console.log('PASS react hook-order transition render tests');
