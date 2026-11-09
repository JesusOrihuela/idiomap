/* ============================================================
   progress-page.js — Progress Dashboard Logic
   All data comes from Progress (shared/js/progress.js) and
   AppPath (shared/js/path.js) via localStorage.
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  // Part B: load the active pair's topics before reading topic lists.
  await AppTopics.load();
  if (typeof AppPath !== 'undefined' && AppPath.load) await AppPath.load();

  renderLangPair();
  renderNotificationSettings();
  renderBackupSection();
  renderHeroStats();
  renderTopicPrefs();
  renderActivityChart();
  renderMilestones();
  await renderExerciseMatrix();

  // Reminder banner inside the "Respaldo" section (not a floating toast)
  if (typeof AppBackupReminder !== 'undefined' && AppBackupReminder.shouldShow()) {
    AppBackupReminder.show();
  }
});

// ---- Language Pair ----

// Direction arrow as an icon: the same glyph in the flags row and the names row,
// so both sit on the card's centre line (text arrows drift with the name widths).
function _pairArrow() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'icon icon--xs lp-card__arrow');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', '#i-arrow-right');
  svg.appendChild(use);
  return svg;
}

function _pairName(text) {
  const span = document.createElement('span');
  span.className = 'lp-card__name';
  span.textContent = text;
  return span;
}

function renderLangPair() {
  const grid = document.getElementById('lang-pair-grid');
  if (!grid || typeof AppLangPair === 'undefined') return;

  const active = AppLangPair.getActive();
  // Shippable pairs only (stress-test pairs are hidden from real users; a ?dev=1 / pe_dev escape
  // reveals them). If a stress-test pair is somehow active (dev-selected), keep it in the list so the
  // current selection is never missing from its own settings.
  const all    = AppLangPair.getShippable().some(p => p.id === active.id)
    ? AppLangPair.getShippable()
    : AppLangPair.getShippable().concat([active]);

  grid.innerHTML = '';

  all.forEach(function (pair) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'choice choice--compact lp-card' + (pair.id === active.id ? ' choice--selected' : '');
    card.setAttribute('aria-pressed', pair.id === active.id ? 'true' : 'false');
    card.setAttribute('aria-label', pair.label);

    // Flag row: source / arrow / target share a 3-column grid, so the arrow
    // stays at the card centre even when a language carries several flags.
    const flagRow = document.createElement('span');
    flagRow.className = 'lp-card__row lp-card__flags';
    if (typeof AppFlags !== 'undefined') {
      flagRow.appendChild(AppFlags.langFlags(pair.source.flags));
      flagRow.appendChild(_pairArrow());
      flagRow.appendChild(AppFlags.langFlags(pair.target.flags));
    }
    card.appendChild(flagRow);

    // Name row: same grid and the same arrow icon, so it lines up with the flags.
    const nameRow = document.createElement('span');
    nameRow.className = 'lp-card__row';
    nameRow.appendChild(_pairName(pair.source.name));
    nameRow.appendChild(_pairArrow());
    nameRow.appendChild(_pairName(pair.target.name));
    card.appendChild(nameRow);

    card.addEventListener('click', function () {
      AppLangPair.setActive(pair.id);
      // Reload so all data re-initializes from the new pair's namespace
      location.reload();
    });

    grid.appendChild(card);
  });

  // Movil: solo el par activo; el resto se revela con el boton.
  const toggle = document.getElementById('lang-pair-toggle');
  if (toggle) {
    const mq = window.matchMedia('(max-width: 640px)');
    const sync = function () {
      const mobile = mq.matches;
      const open = grid.classList.contains('lang-pair-grid--open');
      toggle.classList.toggle('hidden', !mobile);
      toggle.setAttribute('aria-expanded', mobile && open ? 'true' : 'false');
      if (!mobile) grid.classList.remove('lang-pair-grid--open');
    };
    toggle.addEventListener('click', function () {
      grid.classList.toggle('lang-pair-grid--open');
      sync();
    });
    if (mq.addEventListener) mq.addEventListener('change', sync);
    sync();
  }
}

// ---- Topic Preferences ----

function renderTopicPrefs() {
  const container = document.getElementById('prog-prefs-bubbles');
  if (!container || typeof AppTopics === 'undefined') return;
  let saved;
  try { saved = new Set(JSON.parse(localStorage.getItem(AppLangPair.storageKey('pe_topic_preferences')) || '[]')); }
  catch (e) { saved = new Set(); }   // corrupt value must not break the progress page
  AppTopics.PHRASE_TOPICS.forEach(t => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'prog-bubble' + (saved.has(t.id) ? ' prog-bubble--on' : '');
    btn.dataset.id = t.id;
    const icon = document.createElement('span');
    icon.className = 'prog-bubble-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = '<svg class="icon"><use href="#' + AppTopicIcon.of(t.id) + '"/></svg>';
    const text = document.createElement('span');
    text.className = 'prog-bubble-label';
    text.textContent = AppTopics.getLabel(t);
    btn.replaceChildren(icon, text);
    btn.setAttribute('aria-pressed', saved.has(t.id) ? 'true' : 'false');
    btn.addEventListener('click', () => {
      btn.classList.toggle('prog-bubble--on');
      const isOn = btn.classList.contains('prog-bubble--on');
      btn.setAttribute('aria-pressed', isOn ? 'true' : 'false');
      const on = Array.from(container.querySelectorAll('.prog-bubble--on')).map(b => b.dataset.id);
      localStorage.setItem(AppLangPair.storageKey('pe_topic_preferences'), JSON.stringify(on));
    });
    container.appendChild(btn);
  });
}

// ---- Hero Stats ----

function renderHeroStats() {
  const streak = Progress.getStreak();
  const cards  = Progress.getAllCards();

  // Lessons started: count unique topic×activity combos + grammar rules started
  let lessonsStarted = 0;
  if (typeof AppTopics !== 'undefined') {
    const _PHRASE_PFXS  = { speaking: '', dictation: 'dict_', cloze: 'cloze_', translation: 'trans_', scramble: 'scramble_' };
    const _VOCAB_PFXS   = { vocabulary: 'vocab_', quiz: 'quiz_' };
    const seenKeys = Object.keys(cards).filter(function (k) { return !k.startsWith('_') && cards[k] && cards[k].reps > 0; });

    AppTopics.PHRASE_TOPICS.forEach(function (topic) {
      // Phrase activities: check if any seen card starts with prefix + topicId + '_'
      Object.values(_PHRASE_PFXS).forEach(function (pfx) {
        if (seenKeys.some(function (k) { return k.startsWith(pfx + topic.id + '_'); })) lessonsStarted++;
      });
      // Word activities: vocab_ and quiz_ use topicId_ prefix too
      Object.values(_VOCAB_PFXS).forEach(function (pfx) {
        if (seenKeys.some(function (k) { return k.startsWith(pfx + topic.id + '_'); })) lessonsStarted++;
      });
    });
    // Grammar: each started rule = 1 lesson
    seenKeys.forEach(function (k) { if (k.startsWith('grammar_')) lessonsStarted++; });
  }

  document.getElementById('stat-streak').textContent   = streak.current;
  // «Tarjetas dominadas» se pinta como porcentaje al cargar el resumen (DP-03).
  document.getElementById('stat-topics').textContent   = lessonsStarted;
  const bestEl = document.getElementById('stat-best-streak');
  if (bestEl && streak.best > streak.current) bestEl.textContent = AppLang.t('streak_best', { n: streak.best });
}

// ---- Exercise Overview Accordion ----

// Returns { mastered, learning, total } for one topic × activity.
// learning = seen but not yet mastered.
function _getActStats(topicId, actId, allCards, phraseIds, vocabIds, grammarRules) {
  var PHRASE_PFX = { speaking: '', cloze: 'cloze_', dictation: 'dict_', translation: 'trans_', scramble: 'scramble_' };
  var ids;

  if (actId === 'grammar') {
    ids = grammarRules
      .filter(function (r) { return Array.isArray(r.topics) && r.topics.includes(topicId); })
      .map(function (r) { return 'grammar_' + r.category + '_' + r.id; });
  } else if (actId === 'vocabulary') {
    ids = vocabIds.map(function (id) { return 'vocab_' + topicId + '_' + id; });
  } else if (actId === 'quiz') {
    ids = vocabIds.map(function (id) { return 'quiz_' + topicId + '_' + id; });
  } else if (actId in PHRASE_PFX) {
    ids = phraseIds.map(function (id) { return PHRASE_PFX[actId] + id; });
  } else {
    return null;
  }

  if (!ids || ids.length === 0) return null;

  var mastered = 0, seen = 0;
  ids.forEach(function (cardId) {
    var c = allCards[cardId];
    if (c && c.reps > 0) {
      seen++;
      if (Progress.getMastery(cardId) === 'mastered') mastered++;
    }
  });
  return { mastered: mastered, learning: seen - mastered, total: ids.length };
}

// Builds the inner HTML for a 3-segment bar (mastered | learning | not-started).
// The "not started" segment is implicit — it's the bar background showing through.
function _segBar(mastered, learning, total) {
  if (!total) return '';
  var mPct = Math.round((mastered  / total) * 100);
  var lPct = Math.round((learning  / total) * 100);
  var out  = '';
  if (mPct > 0) out += '<div class="ex-seg--mastered" style="transform:scaleX(' + (mPct/100) + ')"></div>';
  if (lPct > 0) out += '<div class="ex-seg--learning" style="transform:scaleX(' + (lPct/100) + ')"></div>';
  return out;
}

async function renderExerciseMatrix() {
  const container = document.getElementById('ex-matrix');
  if (!container || typeof AppPath === 'undefined') return;

  const grammarData = await AppData.get(AppLangPair.grammarKey()).catch(() => ({ rules: [] }));
  AppPath.setGrammarRules(grammarData.rules || []);
  const grammarRules = grammarData.rules || [];
  const allCards = Progress.getAllCards();

  // Cards Mastered stat: numerator only («0 / 9353» leído como cifra extraña, DP-03)
  (function() {
    let masteredCount = 0;
    Object.keys(allCards).forEach(function(key) {
      if (!key.startsWith('_') && Progress.getMastery(key) === 'mastered') masteredCount++;
    });
    const el = document.getElementById('stat-mastered');
    if (el) el.textContent = masteredCount;
  })();

  function _topicLabel(t) {
    return AppTopics.getLabel(t);
  }

  const ACT_ORDER = [
    { id: 'speaking',    icon: 'mic', label: AppLang.t('act_speaking')    },
    { id: 'dictation',   icon: 'type', label: AppLang.t('act_dictation')   },
    { id: 'vocabulary',  icon: 'book', label: AppLang.t('act_vocabulary')  },
    { id: 'cloze',       icon: 'pen', label: AppLang.t('act_cloze')       },
    { id: 'translation', icon: 'languages', label: AppLang.t('act_translation') },
    { id: 'scramble',    icon: 'puzzle', label: AppLang.t('act_scramble')    },
    { id: 'quiz',        icon: 'brain', label: AppLang.t('act_quiz')        },
    { id: 'grammar',     icon: 'ruler', label: AppLang.t('act_grammar')     },
  ];

  container.innerHTML = '';

  // ── Header row ────────────────────────────────────────────
  const hdrRow = document.createElement('div');
  hdrRow.className = 'ex-grid-row ex-grid-row--header';
  hdrRow.setAttribute('role', 'row');
  // Empty corner cell: pinned like the topic column so the headers keep
  // aligned with their columns when the matrix scrolls sideways.
  const corner = document.createElement('div');
  corner.className = 'ex-grid-corner';
  corner.setAttribute('role', 'columnheader');
  hdrRow.appendChild(corner);
  ACT_ORDER.forEach(function (a) {
    const th = document.createElement('div');
    th.className = 'ex-grid-th';
    th.dataset.activity = a.id;
    th.setAttribute('role', 'columnheader');
    th.setAttribute('aria-label', a.label);
    const emojiEl = document.createElement('span');
    emojiEl.setAttribute('aria-hidden', 'true');
    emojiEl.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-' + a.icon + '"/></svg>';
    const labelEl = document.createElement('span');
    labelEl.className = 'ex-grid-th-label';
    labelEl.textContent = a.label;
    th.replaceChildren(emojiEl, labelEl);
    hdrRow.appendChild(th);
  });
  container.appendChild(hdrRow);

  // ── Topic rows ────────────────────────────────────────────
  // Show EVERY category the active pair has: its phrase topics (with phrase + vocab activities)
  // PLUS its vocab-only decks (family, verbos_basicos, …) which have no phrases — their phrase
  // columns read n/a and Vocabulary/Quiz show progress. Both lists derive from the pair's
  // topics.json, so a divergent pair (en-de) shows exactly its own decks, nothing from other pairs.
  const _phraseRows = AppPath.getTopicStatuses();
  const _phraseIds  = new Set(_phraseRows.map(function (t) { return t.id; }));
  const _vocabOnly  = (typeof AppTopics !== 'undefined' ? (AppTopics.VOCAB_TOPICS || []) : [])
    .filter(function (t) { return !_phraseIds.has(t.id); });
  _phraseRows.concat(_vocabOnly).forEach(function (topic) {
    const phraseIds = Progress.getPhraseIds(topic.id);
    const vocabIds  = Progress.getVocabIds(topic.id);

    const row = document.createElement('div');
    row.className = 'ex-grid-row';
    row.setAttribute('role', 'row');

    // Topic label cell
    const th = document.createElement('div');
    th.className = 'ex-grid-topic';
    th.setAttribute('role', 'rowheader');
    th.innerHTML =
      '<span class="ex-grid-topic-emoji" aria-hidden="true"><svg class="icon"><use href="#' + AppTopicIcon.of(topic.id) + '"/></svg></span>' +
      '<span class="ex-grid-topic-name">' + _esc(_topicLabel(topic)) + '</span>';
    row.appendChild(th);

    // One cell per activity
    ACT_ORDER.forEach(function (act) {
      const td = document.createElement('div');
      td.className = 'ex-grid-cell';
      td.setAttribute('role', 'cell');
      td.dataset.label = act.label;

      const stats = _getActStats(topic.id, act.id, allCards, phraseIds, vocabIds, grammarRules);

      if (!stats) {
        td.innerHTML = '<div class="ex-seg-bar ex-seg-bar--na"></div><span class="ex-cell-na">N/A</span>';
        td.title = AppLang.t('cell_na', { act: act.label });
        row.appendChild(td);
        return;
      }

      var ns = stats.total - stats.mastered - stats.learning;
      td.title = AppLang.t('cell_stats', { act: act.label, mastered: stats.mastered, learning: stats.learning, unseen: ns });
      td.setAttribute('aria-label', td.title);
      td.innerHTML =
        '<div class="ex-seg-bar">' + _segBar(stats.mastered, stats.learning, stats.total) + '</div>' +
        '<div class="ex-cell-counts">' +
          '<span class="ex-count--n">' + ns + '</span>' +
          '<span class="ex-count-sep">,</span>' +
          '<span class="ex-count--l">' + stats.learning + '</span>' +
          '<span class="ex-count-sep">,</span>' +
          '<span class="ex-count--m">' + stats.mastered + '</span>' +
        '</div>';

      row.appendChild(td);
    });

    container.appendChild(row);
  });

  // ── Legend ────────────────────────────────────────────────
  const legend = document.createElement('div');
  legend.className = 'ex-acc-legend';
  legend.setAttribute('aria-hidden', 'true');
  [
    { cls: 'ex-seg--new',      countCls: 'ex-count--n', label: AppLang.t('progress_legend_unseen')   },
    { cls: 'ex-seg--learning', countCls: 'ex-count--l', label: AppLang.t('progress_legend_learning') },
    { cls: 'ex-seg--mastered', countCls: 'ex-count--m', label: AppLang.t('progress_legend_mastered') },
  ].forEach(function (li) {
    const el = document.createElement('div');
    el.className = 'ex-acc-legend-item';
    el.innerHTML =
      '<div class="ex-acc-legend-swatch ' + li.cls + '"></div>' +
      '<span class="' + li.countCls + '">' + li.label + '</span>';
    legend.appendChild(el);
  });
  const block = document.getElementById('exercises-block');
  const wrap = container.parentElement;
  if (block && wrap && wrap.parentElement === block) block.insertBefore(legend, wrap);
  else if (block) block.appendChild(legend);

}

// ---- Activity chart (last 60 days) ----
// 60 daily bars filling the card width; months below. The 60-day window fits
// inside the 90-day session history, so the chart never shows false zeros.

function renderActivityChart() {
  const sessions  = Progress.getSessions();
  const container = document.getElementById('activity-chart');
  if (!container) return;

  const counts = {};
  sessions.forEach(s => { counts[s.date] = (counts[s.date] || 0) + 1; });

  const lang    = document.documentElement.lang || 'es';
  const monFmt  = new Intl.DateTimeFormat(lang, { month: 'short' });
  const dateFmt = new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short' });
  const keyOf   = d => d.toLocaleDateString('sv');   // same local key as recordSession

  const today = new Date();
  const days  = [];
  for (let i = 59; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d);
  }

  const values = days.map(d => counts[keyOf(d)] || 0);
  const max    = Math.max(4, ...values);
  const total  = values.reduce((a, b) => a + b, 0);

  container.innerHTML = '';
  container.classList.toggle('is-empty', total === 0);

  if (total === 0) {
    const empty = document.createElement('div');
    empty.className = 'activity-empty';
    const icon = document.createElement('span');
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = '<svg class="icon"><use href="#i-calendar-days"/></svg>';
    const text = document.createElement('p');
    text.textContent = AppLang.t('activity_empty');
    empty.replaceChildren(icon, text);
    container.appendChild(empty);
    return;
  }

  const chart = document.createElement('div');
  chart.className = 'activity-chart';
  chart.style.setProperty('--days', days.length);

  const bars = document.createElement('div');
  bars.className = 'activity-bars';
  bars.setAttribute('role', 'group');

  days.forEach((day, i) => {
    const count = values[i];
    const level = count === 0 ? 'l0' : count === 1 ? 'l1' : count <= 3 ? 'l2' : 'l3';
    const bar = document.createElement('span');
    bar.className = 'activity-bar ' + level;
    bar.style.height = count ? Math.max(10, Math.round((count / max) * 100)) + '%' : '3px';
    const label = dateFmt.format(day) + (count > 0
      ? ', ' + count + ' ' + (count > 1 ? AppLang.t('activity_session_plural') : AppLang.t('activity_session_singular'))
      : '');
    bar.setAttribute('role', 'img');
    bar.setAttribute('aria-label', label);
    bar.title = label;
    bars.appendChild(bar);
  });
  chart.appendChild(bars);

  // Months: one label per month, spanning its days in the 60-column grid.
  const months = document.createElement('div');
  months.className = 'activity-months';
  let start = 0, current = '';
  const flush = end => {
    if (!current || end - start < 3) return;
    const el = document.createElement('span');
    el.className = 'activity-month';
    el.style.gridColumn = (start + 1) + ' / span ' + (end - start);
    el.textContent = current;
    months.appendChild(el);
  };
  days.forEach((day, i) => {
    const name = monFmt.format(day);
    if (name !== current) {
      flush(i);
      current = name;
      start = i;
    }
  });
  flush(days.length);
  chart.appendChild(months);

  container.appendChild(chart);
}

// ---- Milestones ----

function renderMilestones() {
  const container = document.getElementById('milestones-grid');
  if (!container || typeof MilestoneSystem === 'undefined') return;

  const achieved   = MilestoneSystem.getAchieved();
  const milestones = MilestoneSystem.MILESTONES;

  container.innerHTML = '';
  milestones.forEach(m => {
    const done    = achieved.indexOf(m.id) !== -1;
    const el      = document.createElement('div');
    const _mTitle = AppLang.t('milestone_' + m.id + '_title');
    const _mDesc  = AppLang.t('milestone_' + m.id + '_desc');
    el.className = 'milestone-badge' + (done ? ' milestone-badge--done' : ' milestone-badge--locked');
    // Sin aria-label: se leen título y descripción, y el estado va en texto oculto localizado.
    el.innerHTML =
      '<span class="milestone-badge__icon"><svg class="icon" aria-hidden="true"><use href="#' + (done ? (m.icon || 'i-star') : 'i-lock') + '"/></svg></span>' +
      '<span class="milestone-badge__title">' + _esc(_mTitle) + '</span>' +
      '<span class="milestone-badge__desc">' + _esc(_mDesc) + '</span>' +
      '<span class="visually-hidden">' + AppLang.t(done ? 'milestone_state_done' : 'milestone_state_locked') + '</span>';
    container.appendChild(el);
  });
}

// ---- Notification Settings ----

function renderNotificationSettings() {
  const NS = window.NotificationSystem;

  if (!NS || !('Notification' in window)) {
    const block = document.getElementById('notif-block');
    if (block) block.classList.add('hidden');
    return;
  }

  const toggle    = document.getElementById('notif-toggle');
  const timeRow   = document.getElementById('notif-time-row');
  const timeInput = document.getElementById('notif-time');
  const statusEl  = document.getElementById('notif-status');
  const hintEl    = document.getElementById('notif-hint');
  if (!toggle) return;

  function updateUI() {
    const granted = Notification.permission === 'granted';
    const on      = granted && NS.isEnabled();

    toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
    toggle.textContent = on ? AppLang.t('notif_on') : AppLang.t('notif_off');
    timeRow.classList.toggle('hidden', !on);

    if (Notification.permission === 'denied') {
      statusEl.textContent = AppLang.t('notif_blocked');
      statusEl.className   = 'notif-status notif-status--off';
      hintEl.textContent   = AppLang.t('notif_blocked_hint');
      toggle.disabled      = true;
    } else if (on) {
      const payload = NS.buildPayload();
      statusEl.textContent = AppLang.t('notif_active', { time: NS.getReminderTime() });
      statusEl.className   = 'notif-status notif-status--on';
      hintEl.textContent   = payload ? AppLang.t('notif_current', { body: payload.body }) : AppLang.t('notif_no_pending');
      toggle.disabled      = false;
    } else {
      statusEl.textContent = '';
      statusEl.className   = 'notif-status';
      hintEl.textContent   = AppLang.t('notif_hint');
      toggle.disabled      = false;
    }
  }

  timeInput.value = NS.getReminderTime();

  toggle.addEventListener('click', () => {
    if (NS.isEnabled() && Notification.permission === 'granted') {
      NS.disable();
      updateUI();
    } else {
      NS.requestPermission(() => updateUI());
    }
  });

  timeInput.addEventListener('change', () => {
    NS.setReminderTime(timeInput.value);
    updateUI();
  });

  updateUI();
}

// ---- Backup (Export / Import) ----

const _BACKUP_SKIP = new Set(['pe_tts_cached', 'pe_stt_cached', 'pe_last_export']);

function _backupData() {
  var data = { _exported_at: new Date().toISOString(), _version: 1 };
  for (var i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    if (key && key.startsWith('pe_') && !_BACKUP_SKIP.has(key)) {
      data[key] = localStorage.getItem(key);
    }
  }
  return data;
}

function _exportProgress() {
  var json = JSON.stringify(_backupData(), null, 2);
  var blob = new Blob([json], { type: 'application/json' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href     = url;
  a.download = 'idiomap-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  localStorage.setItem('pe_last_export', String(Date.now()));
  _updateBackupStatus();
}

function _importProgress(file) {
  var reader = new FileReader();
  reader.onload = function (e) {
    try {
      var data = JSON.parse(e.target.result);
      var keys = Object.keys(data).filter(function (k) { return k.startsWith('pe_'); });
      if (keys.length === 0) throw new Error('no pe_ keys');
      // Validate the SRS payloads parse before touching storage, so a corrupt file
      // is rejected wholesale instead of silently wiping progress on next load.
      keys.forEach(function (k) { if (/^pe_progress/.test(k)) JSON.parse(data[k]); });
      // Destructive: overwrites current progress — confirm first.
      if (!window.confirm(AppLang.t('backup_import_confirm'))) return;
      keys.forEach(function (k) { localStorage.setItem(k, data[k]); });
      var statusEl = document.getElementById('backup-status');
      if (statusEl) {
        statusEl.textContent = AppLang.t('backup_import_success');
        statusEl.className   = 'backup-status backup-status--ok';
      }
      setTimeout(function () { location.reload(); }, 1200);
    } catch (_) {
      var statusEl = document.getElementById('backup-status');
      if (statusEl) {
        statusEl.textContent = AppLang.t('backup_import_error');
        statusEl.className   = 'backup-status backup-status--err';
      }
    }
  };
  reader.readAsText(file);
}

function _updateBackupStatus() {
  var statusEl = document.getElementById('backup-status');
  if (!statusEl) return;
  var ts = parseInt(localStorage.getItem('pe_last_export') || '0', 10);
  if (ts) {
    var date = new Date(ts).toLocaleDateString();
    statusEl.textContent = AppLang.t('backup_last_export', { date: date });
    statusEl.className   = 'backup-status backup-status--ok';
  } else {
    statusEl.textContent = AppLang.t('backup_never_exported');
    statusEl.className   = 'backup-status';
  }
}

function renderBackupSection() {
  var exportBtn   = document.getElementById('backup-export-btn');
  var importInput = document.getElementById('backup-import-input');
  var importLabel = exportBtn && exportBtn.parentNode && exportBtn.parentNode.querySelector('label[for="backup-import-input"]');

  if (exportBtn) {
    exportBtn.addEventListener('click', _exportProgress);
  }

  if (importInput) {
    importInput.addEventListener('change', function () {
      if (importInput.files && importInput.files[0]) {
        _importProgress(importInput.files[0]);
        importInput.value = ''; // reset so same file can be re-selected
      }
    });
  }

  // Allow keyboard activation of the import label (role=button)
  if (importLabel) {
    importLabel.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); importInput && importInput.click(); }
    });
  }

  // Apply i18n to data-i18n nodes inside the section (nav.js runs later; this ensures immediate render)
  var block = document.getElementById('backup-block');
  if (block && typeof AppLang !== 'undefined') {
    block.querySelectorAll('[data-i18n]').forEach(function (el) {
      var k = el.getAttribute('data-i18n');
      var v = AppLang.t(k);
      if (v !== k) el.textContent = v;
    });
  }

  _updateBackupStatus();
}

// ---- Utilities ----

function _esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

