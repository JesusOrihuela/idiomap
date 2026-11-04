/* ============================================================
   text-utils.js — Shared text normalisation + cloze-gap utilities
   Single source of truth for normalise, tokenisation and AppCloze.
   Used by: translation, scramble, dictation, grammar, global-review, cloze

   Precision rules (docs/LANGUAGE-PLAN.md):
   - NFC first. Diacritics are letters: canción ≠ cancion.
   - Case and external punctuation are ignored in strict/meaning.
   - No ASCII folding, no fuzzy matching, no letter equivalences (ß≠ss, ø≠o).
   - Speech (STT) is the only profile that folds accents, because the
     recogniser cannot be expected to return them.
   ============================================================ */

const AppText = (() => {

  function _locale() {
    try {
      if (typeof AppLangPair === 'undefined') return undefined;
      const p = AppLangPair.getActive();
      return (p && (p.targetLocale || p.target?.code)) || undefined;
    } catch (_) { return undefined; }
  }

  const _segCache = new Map();
  function _segmenter() {
    if (typeof Intl === 'undefined' || !Intl.Segmenter) return null;
    const loc = _locale() || 'en';
    if (!_segCache.has(loc)) _segCache.set(loc, new Intl.Segmenter(loc, { granularity: 'word' }));
    return _segCache.get(loc);
  }

  /** Locale-aware case fold. NFC first so composed/decomposed input compares equal. */
  function casefold(s) {
    const x = String(s ?? '').normalize('NFC');
    try { return x.toLocaleLowerCase(_locale() || 'en'); }
    catch (_) { return x.toLowerCase(); }
  }

  /** Word-like segments, punctuation excluded. This is the comparison unit. */
  function words(s) {
    const x = String(s ?? '').normalize('NFC');
    const seg = _segmenter();
    if (seg) return [...seg.segment(x)].filter((p) => p.isWordLike).map((p) => p.segment);
    return x.match(/[\p{L}\p{N}\p{M}]+(?:['’\-][\p{L}\p{N}\p{M}]+)*/gu) || [];
  }

  /**
   * Display tokens: words keep their surrounding punctuation, whitespace is
   * collapsed to single spaces. Used by cloze/scramble/diff so a token is the
   * unit the learner sees, not an ASCII-only slice.
   */
  function tokens(s) {
    const x = String(s ?? '').normalize('NFC').trim();
    if (!x) return [];
    const seg = _segmenter();
    if (!seg) return x.split(/\s+/u);
    const out = [];
    let buf = '';
    for (const part of seg.segment(x)) {
      if (part.isWordLike) {
        if (buf && /\s$/u.test(buf)) { out.push(buf.trim()); buf = ''; }
        buf += part.segment;
      } else if (/\s/u.test(part.segment)) {
        if (buf) { out.push(buf.trim()); buf = ''; }
      } else {
        buf += part.segment;
      }
    }
    if (buf.trim()) out.push(buf.trim());
    return out;
  }

  /**
   * Expand contractions in a lowercase string.
   * First pass: single-token expansion via regex (e.g. "don't" → "do not").
   * Second pass: multi-word phrase expansion using map._multi.
   */
  function expandContractions(s, map) {
    if (!map) return s;
    let result = s.replace(/[\p{L}\p{M}][\p{L}\p{M}'’]*[\p{L}\p{M}]/gu, (token) => {
      const hit = map[token] ?? map[token.toLowerCase()];
      return hit || token;
    });
    const multi = map._multi;
    if (multi && multi.length > 0) {
      for (const { pattern, canonical } of multi) {
        result = result.replace(
          new RegExp('(^|\\s)' + pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=\\s|$)', 'gu'),
          (_, prefix) => prefix + canonical
        );
      }
    }
    return result;
  }

  /**
   * Normalise a phrase for strict/meaning comparison.
   * NFC + locale casefold + words only + optional contraction expansion.
   * Accents and distinct letters are preserved.
   */
  function normalise(s, map) {
    let x = words(s).map(casefold).join(' ');
    if (map) x = expandContractions(x, map);
    return x.replace(/\s+/g, ' ').trim();
  }

  /** Normalise a single word/token, preserving letters and marks. */
  function normaliseSingle(s) {
    return casefold(s).replace(/[^\p{L}\p{M}'’\-]/gu, '').trim();
  }

  /**
   * STT-only normalisation: ignore accents because the recogniser may omit
   * them. Distinct letters (ß, ø, ł) are not accents and stay distinct.
   */
  function normaliseSpeech(s) {
    return words(s)
      .map((w) => casefold(w).normalize('NFD').replace(/\p{M}/gu, ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Build equivalence maps from a word-equivalents groups array.
   */
  function buildEquivalenceMaps(groups) {
    const flatMap  = {};
    const groupMap = new Map();
    const _multi   = [];

    for (const group of groups) {
      const canonical = casefold(group[0]).replace(/[‘’]/g, "'");
      const set = new Set(group.map((w) => casefold(w).replace(/[‘’]/g, "'")));

      for (const form of set) {
        if (!form.includes(' ')) {
          flatMap[form] = canonical;
        } else if (!canonical.includes(' ')) {
          _multi.push({ pattern: form, canonical });
        }
        if (!groupMap.has(form)) groupMap.set(form, new Set());
        for (const v of set) groupMap.get(form).add(v);
      }
    }

    _multi.sort((a, b) => b.pattern.length - a.pattern.length);
    flatMap._multi = _multi;
    return { flatMap, groupMap };
  }

  /** Pick the candidate with the most normalised words in common with the input. */
  function closestPhrase(raw, candidates, map) {
    if (!candidates || candidates.length === 0) return '';
    if (candidates.length === 1) return candidates[0];
    const normWords = new Set(words(normalise(raw, map)));
    let best = candidates[0], bestScore = -1;
    for (const c of candidates) {
      const cSet = new Set(words(normalise(c, map)));
      const score = [...normWords].filter((w) => cSet.has(w)).length;
      if (score > bestScore) { bestScore = score; best = c; }
    }
    return best;
  }

  /** Strings (legacy) become { text, type: 'style' }; objects pass through. */
  function normaliseAlt(alt) {
    return typeof alt === 'string' ? { text: alt, type: 'style' } : alt;
  }

  return {
    casefold, words, tokens, expandContractions,
    normalise, normaliseSingle, normaliseSpeech,
    buildEquivalenceMaps, closestPhrase, normaliseAlt,
  };
})();

/* ============================================================
   AppCloze — shared blank-word selection for cloze exercises
   ============================================================ */

const AppCloze = (() => {

  function _stopWords() {
    if (typeof AppLangProfiles === 'undefined' || typeof AppLangPair === 'undefined') return new Set();
    return AppLangProfiles.clozeStopWords(AppLangPair.getActive().target.code);
  }

  /**
   * Select the word to blank in a phrase.
   * Deterministic: middle content-word candidate.
   * @returns {{ word: string, clean: string, idx: number, tokens: string[] } | null}
   */
  function pick(phrase) {
    const stop = _stopWords();
    const toks = AppText.tokens(phrase);
    const candidates = toks
      .map((w, i) => ({ word: w, idx: i, clean: AppText.normaliseSingle(w) }))
      .filter((t) => [...t.clean].length > 2 && !stop.has(t.clean));

    if (candidates.length === 0) return null;
    const chosen = candidates[Math.floor(candidates.length / 2)];
    return { ...chosen, tokens: toks };
  }

  return { pick };
})();

if (typeof globalThis !== 'undefined') {
  globalThis.AppText = AppText;
  globalThis.AppCloze = AppCloze;
}
if (typeof module !== 'undefined' && module.exports) module.exports = { AppText, AppCloze };
