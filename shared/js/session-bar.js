/* ============================================================
   session-bar.js — AppSessionBar: the per-activity session bar.

   The "X / Y learned" counter, the CEFR/path progress fill, and the 🔥 streak
   badge were updated by near-identical code in every activity (differing only in
   the counter/streak element ids). Centralized here.

     AppSessionBar.updateStreak(streakId)
     AppSessionBar.updateCounter(counterId, cardIds, pathModeActive)

   The progress bar ids (session-progress-fill / -bar) are the same on every page.
   ============================================================ */
var AppSessionBar = (function () {

  function _setProgress(pct) {
    var fill = document.getElementById('session-progress-fill');
    if (fill) fill.style.transform = 'scaleX(' + (pct / 100) + ')';
    var bar = document.getElementById('session-progress-bar');
    if (bar) bar.setAttribute('aria-valuenow', pct);
  }

  // 🔥 streak badge — reads the current streak and writes the localized text.
  function updateStreak(streakId) {
    if (typeof Progress === 'undefined') return;
    var s  = Progress.getStreak();
    var el = document.getElementById(streakId);
    if (!el) return;
    // Una racha de 0 días no se celebra: el badge aparece cuando ya hay racha.
    el.hidden = s.current <= 0;
    if (s.current > 0) el.textContent = AppLang.t(s.current === 1 ? 'streak_singular' : 'streak_plural', { n: s.current });
  }

  // Counter + progress fill. In path mode it shows "exercise N of M" from the
  // PathSession; otherwise "seen / total learned" from the card SRS state.
  function updateCounter(counterId, cardIds, pathModeActive) {
    var el = document.getElementById(counterId);
    if (!el) return;
    if (pathModeActive && typeof PathSession !== 'undefined') {
      var prog = PathSession.getProgress();
      el.textContent = AppLang.t('cta_exercise_n', { cur: prog.current, total: prog.total });
      _setProgress(prog.total > 0 ? Math.round((prog.current / prog.total) * 100) : 0);
      return;
    }
    var stats = Progress.getStatsForCards(cardIds || []);
    // El contador se ve desde el principio (0 / N): su ausencia centraba la
    // racha por accidente y escondia el progreso del tema.
    el.hidden = stats.total === 0;
    if (stats.total > 0) {
      var full = AppLang.t('topic_learned', { seen: stats.seen, total: stats.total });
      // En movil el texto completo no cabe junto a la racha: "0 / 72" y el
      // nombre largo queda en el aria-label.
      var narrow = typeof window.matchMedia === 'function' &&
        window.matchMedia('(max-width: 400px)').matches;
      el.textContent = narrow ? (stats.seen + ' / ' + stats.total) : full;
      el.setAttribute('aria-label', full);
    }
    _setProgress(stats.total > 0 ? Math.min(100, Math.round((stats.seen / stats.total) * 100)) : 0);
  }

  // Etiqueta del boton atras dentro de un ejercicio: el destino real es el
  // indice del tema (frases o palabras), no el selector de temas.
  function setBackTarget(backId, kind) {
    var el = document.getElementById(backId);
    if (!el) return;
    var key = kind === 'words' ? 'back_to_words' : 'back_to_phrases';
    el.setAttribute('data-i18n', key);
    el.textContent = AppLang.t(key);
  }

  return { updateStreak: updateStreak, updateCounter: updateCounter, setBackTarget: setBackTarget };
})();
