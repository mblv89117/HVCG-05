/** localStorage autosave + resume for EVA experience */
window.HVCG_EVA_STORE = (function () {
  const KEY = "hvcg_eva_experience_v2";

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function save(state) {
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({ ...state, savedAt: new Date().toISOString() })
      );
    } catch (_) {}
  }

  function clear() {
    try {
      localStorage.removeItem(KEY);
    } catch (_) {}
  }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "eva-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  return { KEY, load, save, clear, uuid };
})();
