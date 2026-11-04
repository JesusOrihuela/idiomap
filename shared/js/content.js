/* ============================================================
   content.js — layered content resolver (F3)
   Composes a legacy-shaped topic from:
     pairs/<pair>/content/<topic>.json   (C1 order)
     pairs/<pair>/gloss.json             (C1 source/level/grammar)
     targets/<target>/concepts.json      (C3 target forms)
   Enabled with ?content=layered or localStorage pe_content_model=layered.
   ============================================================ */
const AppContent = (() => {
  const _BASE = (function () {
    try {
      const s = document.currentScript && document.currentScript.src;
      if (s) return s.replace(/js\/[^/]*$/, '');
    } catch (_) { /* noop */ }
    return 'shared/';
  })();

  const _cache = new Map();

  function _pair() {
    return (typeof AppLangPair !== 'undefined') ? AppLangPair.getActive() : null;
  }

  function enabled() {
    // F7: the legacy payload was retired; content is always layered. Rollback is a
    // git revert of the migration commit, not a runtime flag.
    return true;
  }

  function _json(rel) {
    const key = _BASE + rel;
    if (_cache.has(key)) return _cache.get(key);
    const p = fetch(key)
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + key); return r.json(); })
      .then((data) => { _cache.set(key, data); return data; })
      .catch((e) => { _cache.delete(key); throw e; });
    _cache.set(key, p);
    return p;
  }

  /**
   * Resolve one phrase topic for the active pair.
   * @param {string} topic - e.g. 'greetings'
   * @returns {Promise<{phrases: Array}>}
   */
  async function topic(topic) {
    const p = _pair();
    if (!p) throw new Error('AppContent: no active pair');
    const [order, pack, gloss] = await Promise.all([
      _json(`json/pairs/${p.id}/content/${topic}.json`),
      _json(`json/targets/${p.target.code}/concepts.json`),
      _json(`json/pairs/${p.id}/gloss.json`),
    ]);
    const concepts = new Map(pack.concepts.map((c) => [c.conceptId, c]));
    const phrases = order.conceptIds.map((conceptId) => {
      const c = concepts.get(conceptId);
      const g = gloss.glosses[conceptId];
      if (!c) throw new Error(`AppContent: ${p.id}/${topic}: concept ${conceptId} missing`);
      if (!g) throw new Error(`AppContent: ${p.id}/${topic}: gloss ${conceptId} missing`);
      return {
        id: c.id,
        conceptId,
        source: g.source,
        level: g.level,
        grammar: g.grammar,
        target: c.target,
      };
    });
    return { phrases };
  }

  return { enabled, topic };
})();
