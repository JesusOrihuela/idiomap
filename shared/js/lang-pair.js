/* ============================================================
   lang-pair.js — Language pair management
   MUST load before proficiency.js, progress.js, and path-session.js.

   Responsibilities:
     1. Define available language pairs
     2. Persist and retrieve the active pair
     3. Namespace all per-pair localStorage keys via storageKey()
     4. Migrate existing (un-namespaced) data to the active pair on first load
     5. Inject the language pair badge into the page header
   ============================================================ */

const AppLangPair = (() => {

  const ACTIVE_KEY = 'pe_active_pair';

  // Site root path captured at load time (document.currentScript is only set
  // while the script executes, not inside later callbacks).
  const SITE_ROOT_PATH = (() => {
    if (typeof document === 'undefined') return null;
    const s = document.currentScript;
    return s ? new URL('../../', s.src).pathname : null;
  })();

  // ── Available pairs ───────────────────────────────────────────
  // Add new pairs here when new source/target languages are supported.
  // flags: a language's flag code(s) — ONE, TWO or THREE, whatever represents it (Finnish/Icelandic
  //   may need just ['fi']/['is']; Spanish/German two; a language could need three). AppFlags.langFlags()
  //   renders any count (1 = single, 2 = overlapping stack, 3+ = cluster) — never assume exactly two.
  // Generated pair list: shared/js/pairs.js (source: shared/json/pairs/<id>/pair.json).
  // Browser pages load pairs.js immediately before this file. Node tooling falls back
  // to require() so gates never duplicate the list.
  const PAIRS = (typeof AppPairs !== 'undefined')
    ? AppPairs
    : (typeof require === 'function' ? require('./pairs.js') : []);

  // ── Active pair ───────────────────────────────────────────────

  function getActive() {
    // localStorage is absent in Node (the pair-completeness gate loads this module) → default pair.
    var stored = (typeof localStorage !== 'undefined') ? localStorage.getItem(ACTIVE_KEY) : null;
    return PAIRS.find(function (p) { return p.id === stored; }) || PAIRS[0];
  }

  function setActive(id) {
    if (!PAIRS.find(function (p) { return p.id === id; })) return;
    localStorage.setItem(ACTIVE_KEY, id);
  }

  function getAll() { return PAIRS.slice(); }

  // Pairs to offer in the SHIPPABLE product picker: everything EXCEPT the architecture stress-test
  // pairs (`stressTest:true`) and shippable pairs still under construction (`wip:true`) — neither is
  // meant for real users. But when running LOCALLY (localhost / 127.0.0.1 / file://) we show ALL pairs
  // automatically, so a pair being developed is reviewable during development with zero friction; the
  // filtering applies only on the deployed site. An explicit `pe_dev='1'` (localStorage) or `?dev=1`
  // URL param also reveals everything (e.g. reviewing on a phone over the LAN). getAll() stays the
  // full list for tools/audit.
  function getShippable() {
    var dev = false;
    try {
      var host = (typeof location !== 'undefined' && location.hostname) || '';
      var isLocal = host === '' || host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
      dev = isLocal ||
            (typeof localStorage !== 'undefined' && localStorage.getItem('pe_dev') === '1') ||
            (typeof location !== 'undefined' && /[?&]dev=1(&|$)/.test(location.search));
    } catch (e) { /* storage/location blocked → default to shippable-only */ }
    return dev ? PAIRS.slice() : PAIRS.filter(function (p) { return !p.stressTest && !p.wip; });
  }

  // ── Key namespacing ───────────────────────────────────────────
  // Returns a pair-scoped localStorage key.
  // e.g.  storageKey('pe_progress') → 'pe_progress__es-en'

  function storageKey(base) {
    return base + '__' + getActive().id;
  }

  // ── Grammar file key ──────────────────────────────────────────
  // Returns the AppData key for the active pair's grammar rules.
  // AppData.get() resolves this to shared/json/{pairId}/grammar-rules.json.

  function grammarKey() {
    return 'grammar-rules';
  }

  // ── One-time data migration ───────────────────────────────────
  // Runs synchronously at module init so that progress.js reads
  // the correct namespaced key from its very first call.

  var _KEYS_TO_MIGRATE = [
    'pe_progress',
    'pe_path_session',
    'pe_topic_preferences',
    'pe_placement_level',
    'pe_placement_done',
    'pe_onboarded',
    'pe_user_proficiency',
    'pe_milestones',
  ];

  (function _migrate() {
    if (typeof localStorage === 'undefined') return;   // Node (tooling) — nothing to migrate.
    var pairId = getActive().id;
    _KEYS_TO_MIGRATE.forEach(function (key) {
      var newKey = key + '__' + pairId;
      var existing = localStorage.getItem(key);
      if (existing !== null && localStorage.getItem(newKey) === null) {
        localStorage.setItem(newKey, existing);
        localStorage.removeItem(key);
      }
    });
  })();

  // ── Header badge (injected on DOMContentLoaded) ───────────────

  function _progressHref() {
    // Derive the site root from this script, so the prefix is right for the root
    // page and for clean directories (/speaking/, /cloze/) on root or subpath.
    var path = location.pathname;
    var root = SITE_ROOT_PATH || '/';
    var isRoot = path === root || path === root + 'index.html';
    var prefix = isRoot ? '' : '../';
    return prefix + 'progress/';
  }

  function _injectBadge() {
    var header = document.querySelector('header');
    if (!header || header.querySelector('.lp-badge') || typeof AppFlags === 'undefined') return;
    var pair = getActive();

    var badge = document.createElement('a');
    badge.className  = 'lp-badge';
    badge.href       = _progressHref();
    badge.setAttribute('aria-label',
      (typeof AppLang !== 'undefined') ? AppLang.t('lang_switch_aria', { pair: pair.label }) : pair.label);
    badge.setAttribute('title', pair.label);

    badge.appendChild(AppFlags.langFlags(pair.source.flags));
    var sep = document.createElement('span');
    sep.className   = 'lp-badge__sep';
    sep.setAttribute('aria-hidden', 'true');
    sep.textContent = '→';
    badge.appendChild(sep);
    badge.appendChild(AppFlags.langFlags(pair.target.flags));

    header.appendChild(badge);
  }

  if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', _injectBadge);

  // ── Public API ────────────────────────────────────────────────
  return { getActive, setActive, getAll, getShippable, storageKey, grammarKey };

})();

// Dual-mode: expose to Node tooling (getAll() reads no localStorage) so the pair-completeness
// gate can validate each pair's declared flags/voices without duplicating the PAIRS list.
if (typeof module !== 'undefined' && module.exports) module.exports = AppLangPair;
