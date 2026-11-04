/* ============================================================
   lang.js — AppLang helper
   Provides template substitution over LangUI / LangTarget and the
   language/direction attributes required by WCAG 3.1.2.
   Depends on: lang/ui.js, lang/target/{target}.js, shared/js/languages.js
   ============================================================ */
const AppLang = (() => {

  function _pair() {
    try { return (typeof AppLangPair !== 'undefined') ? AppLangPair.getActive() : null; }
    catch (_) { return null; }
  }

  /** Active target language tag (e.g. 'es'). */
  function targetCode() {
    const p = _pair();
    return p && p.target ? p.target.code : '';
  }

  /** Active source language tag (e.g. 'en'). */
  function sourceCode() {
    const p = _pair();
    return p && p.source ? p.source.code : '';
  }

  /** BCP 47 script direction for a language tag. All 18 active languages are ltr. */
  function dirFor(code) {
    try {
      const l = (typeof AppLanguages !== 'undefined' ? AppLanguages : []).find((x) => x.tag === code);
      return (l && l.dir) || 'ltr';
    } catch (_) { return 'ltr'; }
  }

  function targetDir() { return dirFor(targetCode()); }

  /** Mark every [data-lang-target] subtree with the target language + direction. */
  function markTargets(root) {
    const host = root || (typeof document !== 'undefined' ? document : null);
    if (!host || !targetCode()) return;
    host.querySelectorAll('[data-lang-target]').forEach((el) => {
      el.lang = targetCode();
      el.dir = targetDir();
    });
  }

  /** Set <html lang/dir> for the source UI. */
  function applyDocumentLang() {
    if (typeof document === 'undefined' || !document.documentElement) return;
    document.documentElement.lang = sourceCode() || document.documentElement.lang || 'en';
    document.documentElement.dir = dirFor(sourceCode());
  }

  /**
   * Get a UI string in the source language (user's native language).
   * Supports {placeholder} substitution.
   */
  function t(key, vars) {
    const src = (typeof LangUI !== 'undefined' && LangUI[key]) || key;
    if (!vars) return src;
    return src.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : ''));
  }

  /** Get a target-language string (activity names, nav labels). */
  function tgt(key) {
    return (typeof LangTarget !== 'undefined' && LangTarget[key]) || key;
  }

  return { t, tgt, targetCode, sourceCode, dirFor, targetDir, markTargets, applyDocumentLang };
})();
