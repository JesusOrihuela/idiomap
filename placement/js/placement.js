/* ============================================================
   placement.js — Initial Placement Test (CEFR A1–C2)
   14 questions of increasing difficulty.
   Research: Nation & Newton (2009) — placement tests that
   estimate CEFR bands need just ~10 well-selected items.
   ============================================================ */

/* ---- Questions (loaded via AppData.get('placement') → shared/json/pairs/{pairId}/placement.json) ----
   Ordered A1 → C2 (2 per band, B1/B2 have 3). Correct answer index = .answer
   To add a new language pair: add a key matching the pair id in the JSON file.
   ---------------------------------------------------------------- */
let QUESTIONS = null;
AppData.get('placement')
  .then(function (data) {
    QUESTIONS = (data && data.questions) || [];
  })
  .catch(function () { QUESTIONS = []; });

/* ---- CEFR result config ---- */
const _LEVEL_ICONS   = { A1: 'i-sprout', A2: 'i-book-open', B1: 'i-book', B2: 'i-graduation-cap', C1: 'i-medal', C2: 'i-star' };
const _LEVEL_SUGGESTIONS = {
  A1: [
    { icon: 'i-book', labelKey: 'act_vocabulary',            url: '../vocabulary/' },
    { icon: 'i-mic', labelKey: 'placement_speaking_greetings', url: '../speaking/' },
    { icon: 'i-pen', labelKey: 'act_dictation',             url: '../dictation/' },
  ],
  A2: [
    { icon: 'i-mic', labelKey: 'act_speaking',   url: '../speaking/' },
    { icon: 'i-type', labelKey: 'act_cloze',       url: '../cloze/' },
    { icon: 'i-brain', labelKey: 'act_quiz',        url: '../quiz/' },
  ],
  B1: [
    { icon: 'i-ruler', labelKey: 'act_grammar',     url: '../grammar/' },
    { icon: 'i-languages', labelKey: 'act_translation', url: '../translation/' },
    { icon: 'i-puzzle', labelKey: 'act_scramble',    url: '../scramble/' },
  ],
  B2: [
    { icon: 'i-ruler', labelKey: 'act_grammar',               url: '../grammar/' },
    { icon: 'i-languages', labelKey: 'act_translation',           url: '../translation/' },
    { icon: 'i-mic', labelKey: 'placement_speaking_advanced', url: '../speaking/' },
  ],
  C1: [
    { icon: 'i-ruler', labelKey: 'act_grammar',     url: '../grammar/' },
    { icon: 'i-languages', labelKey: 'act_translation', url: '../translation/' },
    { icon: 'i-puzzle', labelKey: 'act_scramble',    url: '../scramble/' },
  ],
  C2: [
    { icon: 'i-ruler', labelKey: 'act_grammar',     url: '../grammar/' },
    { icon: 'i-languages', labelKey: 'act_translation', url: '../translation/' },
    { icon: 'i-puzzle', labelKey: 'act_scramble',    url: '../scramble/' },
  ],
};

function _pairParams() {
  var p = AppLangPair.getActive();
  return { target: p.target.localName, targetName: p.target.name, source: p.source.localName, sourceName: p.source.name };
}

function _getLevelConfig(level) {
  var lk = level.toLowerCase();
  return {
    label:   AppLang.t('placement_result_' + lk + '_label'),
    icon: _LEVEL_ICONS[level],
    message: AppLang.t('placement_result_' + lk + '_msg', _pairParams()),
    suggestions: (_LEVEL_SUGGESTIONS[level] || []).map(function (s) {
      return { icon: s.icon, label: AppLang.t(s.labelKey), url: s.url };
    }),
  };
}

/* ---- State ---- */
let currentQ = 0;
let score    = 0;
let answered = false;  // lock during feedback delay

/* ---- Screens ---- */

function showScreen(id) {
  ['screen-intro', 'screen-quiz', 'screen-result'].forEach(s => {
    document.getElementById(s).classList.toggle('hidden', s !== id);
  });
}

/* ---- Intro ---- */

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('start-btn').addEventListener('click', startTest);
  document.getElementById('skip-btn').addEventListener('click', skipTest);
  document.getElementById('retake-btn').addEventListener('click', retakeTest);

  if (AppLangPair.getActive().source.code !== 'es' &&
      typeof AppLang !== 'undefined') {
    const _plParams = _pairParams();
    const _t = key => { const v = AppLang.t(key, _plParams); return v !== key ? v : null; };
    const _s = (sel, key) => { const el = document.querySelector(sel); const v = _t(key); if (el && v) el.textContent = v; };
    const _i = (id,  key) => { const el = document.getElementById(id);  const v = _t(key); if (el && v) el.textContent = v; };
    _s('.placement-title',       'placement_title');
    _s('.placement-subtitle',    'placement_subtitle_enes');
    _i('start-btn',              'placement_start_btn');
    _i('skip-btn',               'placement_skip_btn');
    _i('retake-btn',             'placement_retake_btn');
    _i('result-cta',             'placement_result_cta');
    _s('.result-suggestions-label', 'placement_suggestions_label');
    // Info pills (by index)
    const pills = document.querySelectorAll('.info-pill');
    const pillKeys = ['placement_time_pill', 'placement_questions_pill', 'placement_result_pill'];
    pills.forEach((p, i) => { const v = _t(pillKeys[i]); if (v) p.textContent = v; });
  }
});

function startTest() {
  currentQ = 0;
  score    = 0;
  answered = false;
  showScreen('screen-quiz');
  showQuestion(0);
}

function skipTest() {
  localStorage.setItem(AppLangPair.storageKey('pe_placement_done'), 'skipped');
  window.location.href = '../';
}

function retakeTest() {
  startTest();
}

/* ---- Quiz ---- */

function showQuestion(i) {
  const q = QUESTIONS[i];

  // Progress bar
  const pct = (i / QUESTIONS.length) * 100;
  document.getElementById('placement-progress-fill').style.transform = 'scaleX(' + (pct / 100) + ')';

  // Counter + level badge
  document.getElementById('placement-counter').textContent = AppLang.t('placement_counter', { n: i + 1, total: QUESTIONS.length });
  const badge = document.getElementById('placement-level-badge');
  badge.textContent = q.level;
  badge.className   = 'placement-level-badge level-' + q.level.replace('+', 'plus').replace(' ', '');

  // Question text
  document.getElementById('question-text').textContent = q.q;

  // Options
  const grid = document.getElementById('options-grid');
  grid.innerHTML = '';
  answered = false;

  q.options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'option option-btn';
    btn.textContent = opt;
    btn.setAttribute('aria-label', AppLang.t('option_n', { n: idx + 1 }) + ': ' + opt);
    btn.addEventListener('click', () => selectOption(idx, btn));
    grid.appendChild(btn);
  });
}

function selectOption(idx, btn) {
  if (answered) return;
  answered = true;

  const q = QUESTIONS[currentQ];
  const correct = idx === q.answer;
  if (correct) score++;

  // Visual feedback: mark selected + correct
  const allBtns = document.querySelectorAll('.option-btn');
  allBtns.forEach((b, i) => {
    b.disabled = true;
    if (i === q.answer)   b.classList.add('option--correct');
    if (i === idx && !correct) b.classList.add('option--wrong');
  });

  // Advance after short delay so user sees the feedback
  setTimeout(() => {
    currentQ++;
    if (currentQ < QUESTIONS.length) {
      showQuestion(currentQ);
    } else {
      showResults();
    }
  }, 850);
}

/* ---- Results ---- */

function scoreToLevel(s) {
  if (s <= 3)  return 'A1';
  if (s <= 6)  return 'A2';
  if (s <= 9)  return 'B1';
  if (s <= 11) return 'B2';
  if (s <= 13) return 'C1';
  return 'C2';
}

function showResults() {
  const level  = scoreToLevel(score);
  const config = _getLevelConfig(level);
  const _resultScreen = document.getElementById('screen-result');
  _resultScreen.className = _resultScreen.className.replace(/\blevel-[A-C][12]\b/g, '').trim();
  _resultScreen.classList.add('level-' + level);

  // Fill progress bar to 100%
  document.getElementById('placement-progress-fill').style.transform = 'scaleX(1)';

  // Result card
  const emojiEl = document.getElementById('result-emoji');
  const levelEl = document.getElementById('result-level-label');
  const scoreEl = document.getElementById('result-score');
  const msgEl   = document.getElementById('result-message');
  const sugsEl  = document.getElementById('result-suggestions');
  const ctaEl   = document.getElementById('result-cta');

  emojiEl.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#' + config.icon + '"/></svg>';

  levelEl.innerHTML = '<span class="cefr-badge cefr-badge--' + level.toLowerCase() + '">' + level + '</span>' +
    '<span class="result-level-text">' + config.label + '</span>';
  const _isEnSrc = AppLangPair.getActive().source.code === 'en';
  scoreEl.textContent  = score + ' / ' + QUESTIONS.length + AppLang.t('placement_score_suffix');
  msgEl.textContent    = config.message;

  sugsEl.innerHTML = '';
  config.suggestions.forEach(s => {
    const a = document.createElement('a');
    a.href      = s.url;
    a.className = 'result-suggestion';
    a.innerHTML = '<span class="result-suggestion__icon"><svg class="icon" aria-hidden="true"><use href="#' + s.icon + '"/></svg></span>' +
                  '<span class="result-suggestion__label">' + s.label + '</span>';
    sugsEl.appendChild(a);
  });

  ctaEl.href = '../';

  showScreen('screen-result');

  // Persist level + initialize proficiency from placement result
  localStorage.setItem(AppLangPair.storageKey('pe_placement_done'),  'done');
  localStorage.setItem(AppLangPair.storageKey('pe_placement_level'), level);
  if (typeof AppProficiency !== 'undefined') AppProficiency.initFromManual(level);
}
