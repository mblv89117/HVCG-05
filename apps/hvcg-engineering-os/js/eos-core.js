/**
 * EOS shared utilities — browser + Node.
 */
(function (root) {
  'use strict';

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function uid(prefix) {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function avg(nums) {
    if (!nums || !nums.length) return 0;
    return nums.reduce(function (a, b) { return a + b; }, 0) / nums.length;
  }

  function pct(part, whole) {
    if (!whole) return 0;
    return Math.round((part / whole) * 1000) / 10;
  }

  var EOS = {
    deepClone: deepClone,
    nowIso: nowIso,
    uid: uid,
    avg: avg,
    pct: pct,
    VERSION: 'eos-1.0.0'
  };

  root.EOS = EOS;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = EOS;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
