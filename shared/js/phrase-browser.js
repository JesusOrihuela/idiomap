/* shared/js/phrase-browser.js
   Renders a phrase/word list as a third screen inside <main>,
   sitting alongside #topic-picker and #exercise-area.
   Header, nav and footer remain fully visible.

   PhraseBrowser.show({ items, cardIds, topicLabel, pickerEl, traductions, onStart })
     items      — string[] (phrases) or {word, category}[] (vocab)
     cardIds    — parallel SRS card ID array
     topicLabel — heading text
     pickerEl   — the picker DOM element to hide while browser is open
     traductions — optional string[] of Spanish translations used as labels (same length as items)
     onStart(i) — called with chosen index when user picks or taps "Start"
*/

const PhraseBrowser = (() => {

  function show({ items, cardIds, topicLabel, pickerEl, traductions, cefrLevels, forms, onStart }) {
    const trigger = document.activeElement;
    const cards     = Progress.getAllCards();
    const total     = cardIds.length;
    const seenCount = cardIds.filter(id => { const c = cards[id]; return c && c.reps > 0; }).length;
    const isWordList = total > 0 && typeof items[0] === 'object';
    const pct = total > 0 ? Math.round((seenCount / total) * 100) : 0;

    /* Reset scroll before any DOM change so focus() below lands in-view */
    window.scrollTo(0, 0);

    /* Hide the picker, build our section */
    if (pickerEl) pickerEl.classList.add('hidden');

    const section = document.createElement('section');
    section.id = 'pb-section';
    section.className = 'pb-section';
    section.setAttribute('aria-label', topicLabel + ' · ' + AppLang.t(isWordList ? 'pb_word' : 'pb_phrase'));

    /* ── Top bar ── */
    const bar = document.createElement('div');
    bar.className = 'pb-bar';

    const backBtn = document.createElement('button');
    backBtn.className = 'btn btn--ghost btn--sm btn--back';
    backBtn.textContent = AppLang.t('back_to_topics');
    backBtn.setAttribute('aria-label', AppLang.t('back_to_topics'));

    const barMeta = document.createElement('div');
    barMeta.className = 'pb-bar-meta';

    const barTitle = document.createElement('h2');
    barTitle.className = 'pb-bar-title';
    barTitle.tabIndex = -1;
    barTitle.textContent = topicLabel;

    const barCount = document.createElement('span');
    barCount.className = 'pb-bar-count';

    barMeta.appendChild(barTitle);
    // Un tema sin empezar no anuncia «0 / N Aprendidas» (DP-03).
    if (seenCount > 0) {
      barCount.textContent = AppLang.t('topic_learned', { seen: seenCount, total });
      barMeta.appendChild(barCount);
    }
    // Variant presentation mode (F6): only when the topic actually has variants.
    const _hasVariants = !isWordList && Array.isArray(forms) && forms.some((f) => Array.isArray(f) && f.length > 1);
    let mode = null;
    if (_hasVariants && typeof Progress.getVariantMode === 'function') {
      mode = document.createElement('select');
      mode.className = 'pb-mode-select';
      mode.setAttribute('aria-label', AppLang.t('variant_mode_label'));
      for (const [value, key] of [['all', 'variant_mode_all'], ['canonical', 'variant_mode_canonical']]) {
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = AppLang.t(key);
        mode.appendChild(opt);
      }
      mode.value = Progress.getVariantMode();
      // Repaint the open list in place: same section, same scroll, same focus.
      mode.addEventListener('change', () => {
        const y = window.scrollY;
        Progress.setVariantMode(mode.value);
        renderChips();
        window.scrollTo(0, y);
        mode.focus({ preventScroll: true });
      });
    }
    bar.appendChild(backBtn);
    bar.appendChild(barMeta);
    if (mode) bar.appendChild(mode);

    // La barra queda fija al bajar por una lista larga (DP-04).
    const nav = document.querySelector('.mode-switcher');
    if (nav) document.documentElement.style.setProperty('--nav-sticky-h', nav.getBoundingClientRect().height + 'px');

    /* ── Progress track ── */
    const track = document.createElement('div');
    track.className = 'progress-bar pb-track';
    track.setAttribute('role', 'progressbar');
    track.setAttribute('aria-valuenow', seenCount);
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', total);
    track.setAttribute('aria-label', AppLang.t('pb_pct_learned', { pct: pct, topic: topicLabel }));
    const fill = document.createElement('div');
    fill.className = 'progress-bar__fill pb-track-fill';
    fill.style.transform = 'scaleX(' + (pct / 100) + ')';
    track.appendChild(fill);

    /* ── Grid ── */
    const grid = document.createElement('div');
    grid.className = 'pb-grid';

    function renderChips() {
      grid.innerHTML = '';
      items.forEach((item, i) => {
        const seen = !!(cards[cardIds[i]] && cards[cardIds[i]].reps > 0);
        let mainText;
        let subText = null;
        let variantsText = null;
        if (isWordList) {
          const _raw = (traductions && traductions[i]) ? traductions[i] : (item.term || item.word);
          // Capitalize the first letter of EVERY slash-separated form ("carta / letra" → "Carta / Letra").
          mainText = _raw ? _raw.replace(/(^|\/\s*)(\p{L})/gu, (m, p, c) => p + c.toUpperCase()) : _raw;
          const _POS = { Noun: 'pos_noun', Verb: 'pos_verb', Adjective: 'pos_adjective', Adverb: 'pos_adverb' };
          subText  = item.category
            ? (typeof AppLang !== 'undefined' ? AppLang.t(_POS[item.category] || item.category) : item.category)
            : null;
        } else {
          // No JS truncation — the CSS ellipsis on .pb-chip-text cuts the label
          // exactly where the chip actually runs out of width at each viewport.
          mainText = (traductions && traductions[i]) ? traductions[i] : item;
          const _forms = Array.isArray(forms) ? forms[i] : null;
          if (Array.isArray(_forms) && _forms.length > 1 && typeof Progress.getVariantMode === 'function' && Progress.getVariantMode() === 'all') {
            variantsText = _forms.map((f) => f.text).join(' · ');
          }
          subText = variantsText;
        }

        const chip = document.createElement('button');
        chip.className = 'pb-chip' + (seen ? ' pb-chip--seen' : '');
        chip.title = mainText + (variantsText ? ' · ' + variantsText : '');
        chip.setAttribute('aria-label', AppLang.t(isWordList ? 'pb_word' : 'pb_phrase') + ' ' + (i + 1) + ': ' + mainText + (variantsText ? ' · ' + variantsText : '') + (seen ? ' ' + AppLang.t('pb_learned') : ''));

        const num = document.createElement('span');
        num.className = 'pb-chip-num';
        num.setAttribute('aria-hidden', 'true');
        num.textContent = i + 1;

        const text = document.createElement('span');
        text.className = 'pb-chip-text';
        // Phrase lists show the source phrase; word lists show the target term.
        if (typeof AppLang !== 'undefined') text.lang = isWordList ? AppLang.targetCode() : AppLang.sourceCode();
        text.textContent = mainText;

        chip.appendChild(num);
        chip.appendChild(text);

        if (subText) {
          const sub = document.createElement('span');
          sub.className = 'pb-chip-sub';
          sub.setAttribute('aria-hidden', 'true');
          // The variant chip is target content; the word category is UI text.
          if (variantsText && typeof AppLang !== 'undefined') sub.lang = AppLang.targetCode();
          sub.textContent = subText;
          chip.appendChild(sub);
        }

        if (cefrLevels && cefrLevels[i]) {
          const lvl = cefrLevels[i];
          const badge = document.createElement('span');
          badge.className = 'pb-chip-cefr cefr-badge cefr-badge--' + lvl.toLowerCase();
          badge.setAttribute('aria-hidden', 'true');
          badge.textContent = lvl;
          chip.appendChild(badge);
        }

        // Coverage indicator — one pip per form, filled = practiced. A single-form
        // phrase shows one pip (practiced-or-not); a multi-form phrase shows N pips
        // (gender/region/register coverage). One consistent indicator — no separate
        // "seen" dot of a different size to disambiguate.
        const _pool  = (forms && forms[i]) ? forms[i].filter(f => f && f.audioSlug) : [];
        const _total = Math.max(_pool.length, 1);
        let _done;
        if (_pool.length > 1 && typeof Progress !== 'undefined' && Progress.getVariantCoverage) {
          _done = Progress.getVariantCoverage(cardIds[i], _pool.map(f => f.audioSlug)).practiced;
        } else {
          _done = seen ? _total : 0;   // single-form (or word list): reflect seen state
        }
        const cov = document.createElement('span');
        cov.className = 'pb-chip-cov';
        cov.setAttribute('role', 'img');
        cov.setAttribute('aria-label', _total > 1
          ? AppLang.t('pb_variants', { done: _done, total: _total })
          : (seen ? AppLang.t('pb_learned') : AppLang.t('pb_not_practiced')));
        for (let k = 0; k < _total; k++) {
          const pip = document.createElement('span');
          pip.className = 'pb-cov-pip' + (k < _done ? ' pb-cov-pip--done' : '');
          cov.appendChild(pip);
        }
        chip.appendChild(cov);

        chip.addEventListener('click', () => { close(); window.scrollTo(0, 0); onStart(i); });
        grid.appendChild(chip);
      });
    }
    renderChips();

    /* ── Assemble ── */
    const hint = document.createElement('p');
    hint.className = 'pb-hint';
    hint.textContent = AppLang.t(isWordList ? 'pb_hint_words' : 'pb_hint_phrases');

    section.appendChild(bar);
    if (seenCount > 0) section.appendChild(track);

    section.appendChild(hint);
    section.appendChild(grid);

    const main = document.querySelector('main');
    if (main) main.appendChild(section);
    else document.body.appendChild(section);

    barTitle.focus({ preventScroll: true });

    function close() {
      section.remove();
      if (pickerEl) pickerEl.classList.remove('hidden');
      // Devuelve el foco a la tarjeta de tema que abrió el índice (WCAG 2.4.3).
      if (trigger && trigger.isConnected && trigger.focus) trigger.focus({ preventScroll: true });
    }

    backBtn.addEventListener('click', close);
  }

  return { show };
})();
