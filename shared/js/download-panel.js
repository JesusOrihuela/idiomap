/* ============================================================
   download-panel.js — Shared model-download status strip
   Used by: tts.js (voice model), speaking.js (speech model)
   Marcado y estilos en components.css (.model-strip).
   ============================================================ */

const AppDownloadPanel = (() => {

  /* La tira vive en el flujo, justo bajo la barra de sesión: nunca tapa
     controles ni feedback (DP-05). */
  function _getContainer() {
    let c = document.getElementById('pe-model-strip');
    if (c) return c;
    c = document.createElement('div');
    c.id = 'pe-model-strip';
    c.className = 'model-strip';
    c.setAttribute('role', 'status');
    c.setAttribute('aria-live', 'polite');
    const area = document.getElementById('exercise-area');
    if (area) {
      const bar = area.querySelector('.session-info-bar');
      if (bar && bar.nextSibling) area.insertBefore(c, bar.nextSibling);
      else area.insertBefore(c, area.firstElementChild);
    } else {
      const main = document.querySelector('main');
      (main || document.body).prepend(c);
    }
    return c;
  }

  /**
   * Create an independent download-progress row in the shared strip.
   * @param {string} loadingText - Text shown while downloading
   * @param {string} readyText   - Text shown on completion
   * @param {string} cacheKey    - localStorage key; when set, show() is a no-op after first completion
   * @returns {{ show, update, complete, hide }}
   */
  function create(loadingText, readyText, cacheKey) {
    let row = null, barEl = null, hideTimer = null, safetyTimer = null, _done = false;

    function hide() {
      clearTimeout(safetyTimer);
      clearTimeout(hideTimer);
      if (!row) return;
      row.classList.add('is-hidden');
      const el = row;
      row = null;
      barEl = null;
      setTimeout(() => el.remove(), 350);
    }

    function _ensure() {
      if (row) return;
      row = document.createElement('div');
      row.className = 'model-strip__row is-hidden';
      const label = document.createElement('span');
      label.className = 'model-strip__label';
      label.textContent = loadingText;
      row.appendChild(label);
      const track = document.createElement('div');
      track.className = 'progress-bar model-strip__bar';
      barEl = document.createElement('div');
      barEl.className = 'progress-bar__fill';
      track.appendChild(barEl);
      row.appendChild(track);
      _getContainer().appendChild(row);
    }

    function show() {
      if (_done) return;                                        // already complete this session
      if (cacheKey && localStorage.getItem(cacheKey)) return;  // cached from prior session
      clearTimeout(hideTimer);
      _ensure();
      clearTimeout(safetyTimer);
      safetyTimer = setTimeout(hide, 12000);
      requestAnimationFrame(() => {
        if (row) row.classList.remove('is-hidden');
      });
    }

    function update(pct) {
      if (_done) return;
      show();
      if (barEl) barEl.style.transform = 'scaleX(' + (Math.min(pct, 100) / 100) + ')';
    }

    function complete() {
      _done = true;
      if (cacheKey) localStorage.setItem(cacheKey, '1');
      clearTimeout(safetyTimer);
      if (!row) return;
      const label = row.querySelector('.model-strip__label');
      if (label) label.textContent = readyText;
      row.classList.add('is-ready');
      if (barEl) barEl.style.transform = 'scaleX(1)';
      hideTimer = setTimeout(hide, 2000);
    }

    return { show, update, complete, hide };
  }

  return { create };
})();
