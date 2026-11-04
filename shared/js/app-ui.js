/* ============================================================
   app-ui.js — AppUI: shared UI helpers used across every activity.

   Centralizes markup/behavior that was duplicated verbatim in the activity
   files. Text comes from AppLang.t (author-controlled i18n) — safe to interpolate.

     AppUI.sessionComplete()          - the "session complete" terminal screen
     AppUI.loadError(container, onRetry) - the fetch-error banner + retry button
   ============================================================ */
var AppUI = (function () {

  // Terminal screen shown when a Ruta de Aprendizaje session finishes. It replaces the
  // content of <main> (not the whole body), so the nav and footer stay usable. Callers
  // do their own cleanup first (e.g. AppAudio.cancel()). The ../ path resolves from
  // the activity page ({activity}/index.html), pointing at my-learning.
  function sessionComplete() {
    var prog        = (typeof PathSession !== 'undefined') ? PathSession.getProgress() : null;
    var reviewCount = prog ? Math.max(0, prog.total - (prog.newCount || 0)) : 0;
    var newCount    = prog ? (prog.newCount || 0) : 0;
    var target      = document.getElementById('main-content') || document.body;
    target.innerHTML =
      '<div class="path-session-complete">' +
        '<div class="path-session-complete__icon"><svg class="icon" aria-hidden="true"><use href="#i-party"/></svg></div>' +
        '<h2 class="path-session-complete__title">' + AppLang.t('session_complete') + '</h2>' +
        '<p class="path-session-complete__sub">' +
          AppLang.t('path_complete_summary', { review: reviewCount, new: newCount }) +
        '</p>' +
        '<a href="../my-learning/" class="btn btn--path">' + AppLang.t('my_learning_link') + '</a>' +
      '</div>';
    // El contenido cambia sin navegacion: se avisa al lector de pantalla llevandole el foco.
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }

  // Fetch-error banner with a retry button, inserted at the top of `container`.
  // `onRetry` is the activity's reload action (usually () => startTopic(id)).
  function loadError(container, onRetry) {
    var old = document.getElementById('fetch-error-banner');
    if (old) old.remove();

    var banner = document.createElement('div');
    banner.id = 'fetch-error-banner';
    banner.className = 'banner banner--error';
    banner.setAttribute('role', 'alert');
    banner.setAttribute('aria-live', 'assertive');

    var txt = document.createElement('span');
    txt.textContent = AppLang.t('error_loading');

    var btn = document.createElement('button');
    btn.className = 'btn btn--danger btn--sm';
    btn.textContent = AppLang.t('retry');
    btn.addEventListener('click', function () { banner.remove(); if (onRetry) onRetry(); });

    banner.appendChild(txt);
    banner.appendChild(btn);
    if (container) container.insertBefore(banner, container.firstChild);
  }

  // Path-mode "← back to Mi Aprendizaje" link, appended (hidden) to the activity's
  // exercise container. On click it advances the PathSession only when the round is
  // "done" — each activity decides what that means, so it passes isReadyFn (a getter
  // reading its own _lastCorrect / isFlipped state at click time).
  function addPathBackLink(containerId, isReadyFn) {
    var link = document.createElement('a');
    link.id = 'back-to-path';
    link.href = '../my-learning/';
    link.className = 'back-to-path-link hidden';
    link.textContent = AppLang.t('back_to_path');
    link.addEventListener('click', function () {
      if (isReadyFn() && typeof PathSession !== 'undefined') PathSession.advance();
    });
    var c = document.getElementById(containerId);
    if (c) c.appendChild(link);
  }

  return { sessionComplete: sessionComplete, loadError: loadError, addPathBackLink: addPathBackLink };
})();
