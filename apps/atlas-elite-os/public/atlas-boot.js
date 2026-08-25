/**
 * Visible pre-React startup fallback. Remains until React mounts successfully.
 * Never displays tokens, cookies, or secrets.
 */
(function atlasBoot() {
  var root = document.getElementById('root');
  var boot = document.getElementById('atlas-boot');
  if (!boot) return;

  var correlationId =
    'atlas-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  boot.setAttribute('data-correlation-id', correlationId);

  var stageEl = document.getElementById('atlas-boot-stage');
  var detailEl = document.getElementById('atlas-boot-detail');
  var shaEl = document.getElementById('atlas-boot-sha');

  function setStage(stage, detail) {
    if (stageEl) stageEl.textContent = stage;
    if (detailEl) detailEl.textContent = detail || '';
  }

  setStage('Loading Atlas', 'Preparing application shell…');
  if (shaEl) shaEl.textContent = 'Build pending React mount';

  window.__ATLAS_BOOT__ = {
    correlationId: correlationId,
    setStage: setStage,
    hide: function () {
      if (boot && boot.parentNode) boot.parentNode.removeChild(boot);
    },
    fail: function (category, message) {
      setStage('Atlas failed to start', (category || 'startup_error') + ' · ' + (message || 'Unknown error'));
      boot.classList.add('atlas-boot-failed');
      var actions = document.getElementById('atlas-boot-actions');
      if (actions) actions.hidden = false;
    },
  };

  window.addEventListener('error', function (event) {
    if (window.__ATLAS_REACT_MOUNTED__) return;
    var msg = (event && event.message) || 'Uncaught exception';
    var src = (event && event.filename) || 'unknown';
    var line = (event && event.lineno) || 0;
    window.__ATLAS_BOOT__.fail('uncaught_exception', msg + ' (' + src + ':' + line + ')');
  });

  window.addEventListener('unhandledrejection', function (event) {
    if (window.__ATLAS_REACT_MOUNTED__) return;
    var reason = event && event.reason;
    var msg =
      (reason && reason.message) ||
      (typeof reason === 'string' ? reason : 'Unhandled promise rejection');
    window.__ATLAS_BOOT__.fail('unhandled_rejection', String(msg).slice(0, 240));
  });

  // If React never mounts, surface recovery UI.
  setTimeout(function () {
    if (window.__ATLAS_REACT_MOUNTED__) return;
    if (!root || root.childElementCount === 0 || (boot && boot.isConnected && !root.querySelector('[data-atlas-shell]'))) {
      window.__ATLAS_BOOT__.fail(
        'startup_timeout',
        'Application shell did not become ready. Correlation ' + correlationId,
      );
    }
  }, 15000);
})();
