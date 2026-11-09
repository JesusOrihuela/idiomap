/* ============================================================
   grammar.js — Grammar Workshop
   5-phase exercise: Context → Noticing → Rule → Structured Input → FITB Production
   Research: Schmidt 1990, VanPatten 2004, Erlam 2003, Lyster & Ranta 1997

   Card ID format: grammar_{category}_{ruleId}
     — ruleId is a stable semantic string (e.g. "present_simple"), NOT a sequential
       integer. This is intentional: grammar rules can be reordered or extended without
       orphaning SRS history.
     — All SRS reads use Progress.getAllCards() + manual filter.
     — parseCardId() in progress-page.js has a dedicated branch for this format.
   ============================================================ */

/* ── State ── */
let allRules     = [];
let categories   = [];
let currentRule  = null;

/* ── Path mode (set once on load) ── */
const _pathMode  = new URLSearchParams(window.location.search).get('path') === '1';
const _pathTopic = new URLSearchParams(window.location.search).get('topic') || null;
let phase        = 0;          // 0-5 = phases; 6 = complete
let siIndex      = 0;          // structured input item index
let prodIndex    = 0;          // production item index
let expIndex     = 0;          // express (communicative production) item index
let prodCorrect      = 0;      // count of correct FITB answers
let prodAnswered     = false;  // whether current FITB was answered
let currentAutoQuality = 3;   // SRS quality calculated from accuracy (1/3/5)
let _progressSaved   = false;  // true once Progress.rate has been called for the current rule
let noticingAnswers   = [];   // user's Phase 2 answers, shown in Phase 3

const PHASE_IDS = [
  'phase-context',
  'phase-noticing',
  'phase-rule',
  'phase-structured',
  'phase-production',
  'phase-express',      // communicative / meaningful production (open, self-assessed)
  'phase-complete',
];

/* ── Init ── */
document.addEventListener('DOMContentLoaded', async () => {
  // Part B: load the active pair's topics before reading topic lists.
  await AppTopics.load();
  if (typeof AppPath !== 'undefined' && AppPath.load) await AppPath.load();
  document.getElementById('footer-year').textContent = new Date().getFullYear();

  document.getElementById('back-to-categories').addEventListener('click', () => {
    showCategories();
  });
  document.getElementById('back-to-rules').addEventListener('click', () => {
    showRules(currentRule?.category);
  });

  // Step-back: return to any earlier phase (re-read the rule / context) if a doubt arises.
  document.getElementById('phase-back-btn').addEventListener('click', () => {
    if (phase > 0) goToPhase(phase - 1);
  });

  document.getElementById('context-next-btn').addEventListener('click', () => goToPhase(1));
  document.getElementById('noticing-show-btn').addEventListener('click', () => {
    // Capture answers before the textareas leave the DOM view
    noticingAnswers = Array.from(
      document.querySelectorAll('#noticing-card .noticing-input')
    ).map(t => t.value.trim());
    goToPhase(2);
  });
  document.getElementById('rule-next-btn').addEventListener('click', () => goToPhase(3));

  document.getElementById('rate-auto').addEventListener('click', () => finishAndRate(currentAutoQuality));

  loadData();
});

/* ── Data Loading ── */
function loadData() {
  AppData.get(AppLangPair.grammarKey())
    .then(data => {
      allRules   = data.rules   || [];
      categories = data.categories || [];

      // Path mode: ?path=1 — hide navigation, handle advance via PathSession
      if (_pathMode) {
        document.getElementById('back-to-categories').classList.add('hidden');
        document.getElementById('back-to-rules').classList.add('hidden');
      }

      // Deep-link: grammar.html?rule=<ruleId> → jump straight to that rule
      const urlRule = new URLSearchParams(window.location.search).get('rule');
      if (urlRule) {
        const deepRule = allRules.find(r => r.id === urlRule);
        if (deepRule) { startExercise(deepRule); return; }
      }

      // Topic filter: grammar.html?topic=<topicId> → show only rules for that topic
      if (_pathTopic && !urlRule) {
        const topicRules = allRules.filter(r =>
          Array.isArray(r.topics) && r.topics.includes(_pathTopic)
        );
        if (topicRules.length > 0) {
          _showTopicRules(topicRules);
          return;
        }
      }

      buildCategoryGrid();
    })
    .catch(() => {
      document.getElementById('category-grid').innerHTML =
        '<p style="color:var(--color-danger);text-align:center">' + AppLang.t('grammar_data_error') + '</p>';
    });
}

/* ══════════════════════════════════════════════════════
   SCREEN 1 — Category Grid
══════════════════════════════════════════════════════ */

function _catLabel(cat) {
  var _src = (typeof AppLangPair !== 'undefined') ? AppLangPair.getActive().source.code : 'es';
  return cat['label_' + _src] || cat.label_en || cat.label_es;
}

function _ruleTitle(rule) {
  var _src = (typeof AppLangPair !== 'undefined') ? AppLangPair.getActive().source.code : 'es';
  return rule['title_' + _src] || rule.title_en || rule.title;
}


// Order categories by COMPLEXITY, derived from their rules' CEFR levels — not by array order.
// Primary: the easiest entry level (min CEFR) so a learner meets foundational categories first;
// secondary: overall difficulty (avg CEFR); then id for stability. This is automatic, so every pair
// is ordered consistently and any NEW category lands in a coherent spot by its own content level —
// no manual ordering to maintain. (Advanced syntax, all C1/C2, therefore sorts LAST.)
function _categoriesByComplexity() {
  const cefr = lvl => (typeof CEFR_ORDER !== 'undefined' ? (CEFR_ORDER[lvl] ?? 99) : 99);
  const key = cat => {
    const levels = allRules.filter(r => r.category === cat.id).map(r => cefr(r.level));
    if (!levels.length) return { min: 99, avg: 99 };
    return { min: Math.min(...levels), avg: levels.reduce((a, b) => a + b, 0) / levels.length };
  };
  return categories.slice().sort((a, b) => {
    const ka = key(a), kb = key(b);
    return ka.min - kb.min || ka.avg - kb.avg || String(a.id).localeCompare(String(b.id));
  });
}

function buildCategoryGrid() {
  const grid = document.getElementById('category-grid');
  grid.innerHTML = '';

  // Icono de linea por categoria (ids en ingles; hay 39 entre todos los pares).
  // El emoji del dato no se pinta como chrome; una categoria nueva cae al generico.
  function _catIcon(id) {
    if (/question|interrog/.test(id)) return 'i-circle-help';
    if (/article/.test(id)) return 'i-book-open';
    if (/preposition|address/.test(id)) return 'i-map-pin';
    if (/tense|time|future|present|preterite|imperfect|futuro|presente|perfect/.test(id)) return 'i-clock';
    if (/conditional|condicional/.test(id)) return 'i-git-branch';
    if (/modal/.test(id)) return 'i-zap';
    if (/passive/.test(id)) return 'i-repeat';
    if (/subjunctive|subjuntivo/.test(id)) return 'i-brain';
    if (/phrasal/.test(id)) return 'i-link';
    if (/verb_pattern/.test(id)) return 'i-layout-grid';
    if (/relative|pronoun|reflex/.test(id)) return 'i-message';
    if (/syntax|discourse|registro/.test(id)) return 'i-graduation-cap';
    if (/comparative|cases|gender|standard/.test(id)) return 'i-scale';
    if (/verb|ser_estar|gustar|por_para|stem/.test(id)) return 'i-target';
    return 'i-book-open';
  }

  _categoriesByComplexity().forEach(cat => {
    const rulesInCat = allRules.filter(r => r.category === cat.id);
    const cardIds    = rulesInCat.map(r => 'grammar_' + cat.id + '_' + r.id);
    const _cards     = Progress.getAllCards();
    // "Learned" counts PASSED rules only (lapses === 0), same criterion as a rule's ✓ Done — a
    // failed round rates Hard and leaves lapses ≥ 1, so it does NOT count here.
    const seen       = cardIds.filter(id => { const c = _cards && _cards[id]; return c && c.reps > 0 && (c.lapses || 0) === 0; }).length;

    // Misma tarjeta que el resto de actividades: panel 16:9, titulo y contador.
    // Sin foto: el panel lleva el icono de la categoria sobre el tinte violeta.
    const progressText = AppLang.t(rulesInCat.length === 1 ? 'grammar_topic_progress_one' : 'grammar_topic_progress',
      { seen, total: rulesInCat.length });
    const btn = document.createElement('button');
    btn.className = 'img-topic-card';
    btn.setAttribute('aria-label', _catLabel(cat) + ', ' + progressText);
    btn.innerHTML =
      '<div class="img-topic-card__img-wrap category-media">' +
        '<span class="category-icon"><svg class="icon" aria-hidden="true"><use href="#' + _catIcon(cat.id) + '"/></svg></span>' +
      '</div>' +
      '<div class="img-topic-card__body">' +
        '<span class="img-topic-card__text">' +
          '<span class="img-topic-card__title">' + _catLabel(cat) + '</span>' +
          '<span class="img-topic-card__progress">' + progressText + '</span>' +
        '</span>' +
      '</div>';

    btn.addEventListener('click', () => showRules(cat.id));
    grid.appendChild(btn);
  });

  showScreen('screen-categories');
}

function showCategories() {
  buildCategoryGrid();
}

/* ── Topic-filtered rule list (used when ?topic= is set) ── */
function _showTopicRules(rules) {
  const list = document.getElementById('rule-list');
  if (!list) return;
  list.innerHTML = '';

  const header = document.getElementById('rules-category-label');
  if (header) header.textContent = AppLang.t('grammar_topic_label');

  rules.forEach(rule => {
    const cardId = 'grammar_' + rule.category + '_' + rule.id;
    const card   = Progress.getAllCards()[cardId];
    const seen   = card && card.reps > 0;

    const btn = document.createElement('button');
    btn.className = 'rule-row' + (seen ? ' rule-row--seen' : '');
    btn.setAttribute('aria-label', _ruleTitle(rule));
    btn.innerHTML =
      '<span class="rule-row__title">' + _ruleTitle(rule) + '</span>' +
      (seen ? '<span class="rule-row__seen-badge">' + AppLang.t('badge_studied') + '</span>' : '<span class="rule-row__new-badge">' + AppLang.t('badge_new_plain') + '</span>');
    btn.addEventListener('click', () => startExercise(rule));
    list.appendChild(btn);
  });

  showScreen('screen-rules');
  // Cambio de pantalla: el foco entra en la primera regla (el anterior ya no existe).
  const firstRule = document.querySelector('#rule-list .rule-row');
  if (firstRule) firstRule.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

/* ══════════════════════════════════════════════════════
   SCREEN 2 — Rule List
══════════════════════════════════════════════════════ */

function showRules(categoryId) {
  const cat = categories.find(c => c.id === categoryId);
  if (!cat) return;

  document.getElementById('rule-category-label').textContent = _catLabel(cat);

  // Rules within a category also run easiest → hardest (CEFR), matching the category ordering.
  const _cefr = lvl => (typeof CEFR_ORDER !== 'undefined' ? (CEFR_ORDER[lvl] ?? 99) : 99);
  const rulesInCat = allRules.filter(r => r.category === categoryId)
    .slice().sort((a, b) => _cefr(a.level) - _cefr(b.level));
  const list = document.getElementById('rule-list');
  list.innerHTML = '';

  if (rulesInCat.length === 0) {
    list.innerHTML =
      '<div class="empty-state">' +
        '<span class="empty-state__icon"><svg class="icon" aria-hidden="true"><use href="#i-lightbulb"/></svg></span>' +
        '<p class="empty-state__msg">' + AppLang.t('coming_soon') + '</p>' +
        '<p class="empty-state__sub">' + AppLang.t('coming_soon_body') + '</p>' +
      '</div>';
    showScreen('screen-rules');
    return;
  }

  rulesInCat.forEach(rule => {
    const cardId  = 'grammar_' + categoryId + '_' + rule.id;
    const cards   = Progress.getAllCards();
    const card    = cards && cards[cardId];
    // "Done" (green ✓) means PASSED, not merely attempted. A failed round rates Hard (quality 1),
    // which resets reps and increments lapses; a pass (quality ≥ 3) decrements lapses toward 0. So a
    // rule you got wrong stays lapses ≥ 1 → not Done, until you pass it. (The blue "studied" badge
    // elsewhere stays reps-based — you DID study it — but Done is the stronger claim.)
    const isDone  = card && card.reps > 0 && (card.lapses || 0) === 0;

    const btn = document.createElement('button');
    btn.className = 'rule-row';
    btn.setAttribute('aria-label', _ruleTitle(rule));

    const statusHtml = isDone
      ? '<span class="rule-row__status rule-row__status--done">' + AppLang.t('done_status') + '</span>'
      : '';

    btn.innerHTML =
      '<span class="rule-row__cefr cefr-badge cefr-badge--' + rule.level.toLowerCase() + '">' + rule.level + '</span>' +
      '<span class="rule-row__text">' +
        '<span class="rule-row__title">' + _ruleTitle(rule) + '</span>' +
      '</span>' +
      statusHtml;

    btn.addEventListener('click', () => startExercise(rule));
    list.appendChild(btn);
  });

  showScreen('screen-rules');

  // Cambio de pantalla: el foco entra en la primera regla (el anterior ya no existe).
  const firstRule = document.querySelector('#rule-list .rule-row');
  if (firstRule) firstRule.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

/* ══════════════════════════════════════════════════════
   SCREEN 3 — Exercise (5 phases)
══════════════════════════════════════════════════════ */

function startExercise(rule) {
  currentRule  = rule;
  phase           = 0;
  siIndex         = 0;
  prodIndex       = 0;
  expIndex        = 0;
  prodCorrect     = 0;
  prodAnswered    = false;
  noticingAnswers = [];
  _progressSaved  = false;

  // Set header badges
  document.getElementById('exercise-rule-title').textContent = _ruleTitle(rule);
  const cefrBadge = document.getElementById('exercise-cefr-badge');
  if (cefrBadge) {
    cefrBadge.textContent = rule.level;
    cefrBadge.className   = 'cefr-badge cefr-badge--' + rule.level.toLowerCase();
  }

  const cardId  = 'grammar_' + rule.category + '_' + rule.id;
  const reentry = getReentryPhase(cardId);

  showScreen('screen-exercise');

  // Show / hide re-entry banner
  setReentryBanner(reentry === REENTRY_PHASE);

  if (reentry === REENTRY_PHASE) {
    // Skip context / noticing / rule — user has seen them. But still BUILD the earlier phases so that
    // the step-back button reveals them populated instead of empty (their build runs only here, not
    // in goToPhase). Then jump straight to Structured Input.
    buildPhase1();
    buildPhase2();
    phase = REENTRY_PHASE;          // set before updatePhaseDots
    updatePhaseDots();
    goToPhase(REENTRY_PHASE);       // builds phase 4
  } else {
    buildPhase1();
    buildPhase2();
    goToPhase(0);
  }
}

/* ── Phase Transitions ── */
function goToPhase(p) {
  phase = p;
  updatePhaseDots();

  // Hide all phases
  PHASE_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });

  const target = document.getElementById(PHASE_IDS[p]);
  if (target) target.classList.remove('hidden');

  // Build on-demand phases
  if (p === 2) { buildPhase3(); }
  if (p === 3) { buildPhase4(); }
  if (p === 4) { buildPhase5(); }
  if (p === 5) { buildPhase6(); }
  if (p === 6) { buildPhaseComplete(); }

  _placeBack();

  // Cambio de fase: si el foco quedó en un control oculto, entra en la etiqueta de
  // fase (se anuncia "Fase N: …"); en el cierre, en "Continuar".
  const focusInside = target && target.contains(document.activeElement);
  if (target && !focusInside) {
    if (p === 6) {
      document.getElementById('rate-auto')?.focus({ preventScroll: true });
    } else {
      const label = target.querySelector('.phase-label');
      if (label) { label.tabIndex = -1; label.focus({ preventScroll: true }); }
    }
  }
  window.scrollTo(0, 0);
}

// Put the step-back button into the visible phase's action row so it sits at the SAME height as the
// "next" button — gray on the LEFT, next stays blue on the RIGHT (space-between). Dynamic phases
// (structured input / production) have no static action row, so it gets its own bottom-left row.
// Shown from phase 1 to production; hidden at the context phase, at completion, and in path mode.
function _placeBack() {
  const back = document.getElementById('phase-back-btn');
  if (!back) return;
  const show = phase >= 1 && phase <= 5 && !_pathMode;
  back.classList.toggle('hidden', !show);
  if (!show) return;
  const section = document.getElementById(PHASE_IDS[phase]);
  if (!section) return;
  const actions = section.querySelector('.phase-actions');   // every phase 1-4 has one
  if (actions) { actions.classList.add('phase-actions--split'); actions.insertBefore(back, actions.firstChild); }
}

function updatePhaseDots() {
  document.querySelectorAll('.phase-dot').forEach(dot => {
    const dp = parseInt(dot.dataset.phase, 10);
    dot.classList.toggle('phase-dot--active', dp === phase);
    // Mark as done: either naturally passed, or skipped via re-entry. En el
    // cierre (fase 6) las seis quedan completas.
    dot.classList.toggle('phase-dot--done', dp < phase);
  });
}

/* ══════════════════════════════════════════
   PHASE 1 — Context Dialogue
══════════════════════════════════════════ */
function buildPhase1() {
  const card = document.getElementById('dialogue-card');
  if (!card) return;
  card.innerHTML = '';

  (currentRule.context_dialogue || []).forEach(turn => {
    const div = document.createElement('div');
    div.className = 'dialogue-turn' + (turn.highlight ? ' dialogue-turn--highlight' : '');

    const spk = document.createElement('span');
    spk.className   = 'dialogue-speaker';
    spk.textContent = turn.speaker;

    // Text + its L1 gloss stack in a column so the speaker stays in its own left column.
    const body = document.createElement('div');
    body.className = 'dialogue-body';

    const txt = document.createElement('span');
    txt.className  = 'dialogue-text';
    // **word** → <span class="dialogue-target"> for target structure highlighting
    txt.innerHTML = parseDialogueText(escapeHTML(turn.text));
    body.appendChild(txt);

    // L1 translation (source language) so a distant-target sentence is never opaque.
    if (turn.translation) {
      const tr = document.createElement('span');
      tr.className   = 'dialogue-translation';
      tr.textContent = turn.translation;
      body.appendChild(tr);
    }

    div.appendChild(spk);
    div.appendChild(body);
    card.appendChild(div);
  });
}

/* ══════════════════════════════════════════
   PHASE 2 — Noticing Questions (interactive)
══════════════════════════════════════════ */
const MIN_NOTICING_CHARS = 3; // minimum chars per answer to count as engaged
const MIN_EXPRESS_WORDS = 3;  // produccion minima antes de ver el modelo o continuar

function buildPhase2() {
  const card    = document.getElementById('noticing-card');
  if (!card) return;
  card.innerHTML = '';
  const btn     = document.getElementById('noticing-show-btn');
  const progEl  = document.getElementById('noticing-progress');

  // Reset button state for this rule
  btn.disabled = true;

  const prompts = currentRule.noticing_prompts || [];
  const inputs  = [];

  prompts.forEach((prompt, i) => {
    // Each question + its textarea are ONE group, so a question sits tight with its own answer box
    // (the card gap separates the groups, not a question from its box).
    const item = document.createElement('div');
    item.className = 'noticing-item';

    const questionDiv = document.createElement('div');
    questionDiv.className = 'noticing-question';

    const num = document.createElement('span');
    num.className   = 'noticing-num';
    num.textContent = i + 1;

    const promptText = typeof prompt === 'object' ? prompt.q : prompt;
    const promptHint = typeof prompt === 'object' ? (prompt.placeholder || '') : '';

    const txt = document.createElement('span');
    txt.className   = 'noticing-text';
    txt.textContent = promptText;

    questionDiv.appendChild(num);
    questionDiv.appendChild(txt);
    item.appendChild(questionDiv);

    // Answer input
    const textarea = document.createElement('textarea');
    textarea.className   = 'field__input noticing-input';
    textarea.rows        = 2;
    textarea.placeholder = promptHint || AppLang.t('noticing_placeholder');
    textarea.setAttribute('aria-label', AppLang.t('grammar_noticing_answer_n', { n: i + 1 }));
    item.appendChild(textarea);
    card.appendChild(item);
    inputs.push(textarea);

    // Update gate on every keystroke
    textarea.addEventListener('input', () => checkNoticingGate(inputs, btn, progEl, prompts.length));
  });

  // Initial progress label
  updateNoticingProgress(progEl, 0, prompts.length);
}

function checkNoticingGate(inputs, btn, progEl, total) {
  const answered = inputs.filter(inp => inp.value.trim().length >= MIN_NOTICING_CHARS).length;
  updateNoticingProgress(progEl, answered, total);
  btn.disabled = answered < total;
}

function updateNoticingProgress(el, answered, total) {
  if (!el) return;
  if (answered === 0) {
    // La instruccion vive en la cabecera del paso; el pie solo muestra avance
    // cuando ya hay alguna respuesta.
    el.textContent = '';
    el.className   = 'noticing-progress';
  } else if (answered < total) {
    el.textContent = AppLang.t('answered_n', { done: answered, total });
    el.className   = 'noticing-progress noticing-progress--partial';
  } else {
    el.textContent = AppLang.t('ready_status');
    el.className   = 'noticing-progress noticing-progress--done';
  }
}

/* ══════════════════════════════════════════
   PHASE 3 — Rule Explanation (+ noticing contrast)
══════════════════════════════════════════ */
function buildPhase3() {
  const card = document.getElementById('rule-card');
  if (!card) return;
  card.innerHTML = '';

  // ── "Tu hipótesis" block — only when the user has answers ──
  const prompts = currentRule.noticing_prompts || [];
  const hasAnswers = noticingAnswers.some(a => a.length > 0);

  if (hasAnswers && prompts.length > 0) {
    const hypothesisBlock = document.createElement('div');
    hypothesisBlock.className = 'rule-hypothesis';

    const heading = document.createElement('p');
    heading.className = 'rule-hypothesis__heading';
    heading.textContent = AppLang.t('hypothesis');
    hypothesisBlock.appendChild(heading);

    prompts.forEach((prompt, i) => {
      const answer = noticingAnswers[i] || '';
      if (!answer) return;

      const item = document.createElement('div');
      item.className = 'rule-hypothesis__item';

      const qEl = document.createElement('span');
      qEl.className = 'rule-hypothesis__q';
      qEl.textContent = (typeof prompt === 'object' ? prompt.q : prompt);

      const aEl = document.createElement('blockquote');
      aEl.className = 'rule-hypothesis__a';
      aEl.textContent = answer;

      item.appendChild(qEl);
      item.appendChild(aEl);
      hypothesisBlock.appendChild(item);
    });

    card.appendChild(hypothesisBlock);

    const divider = document.createElement('div');
    divider.className = 'rule-divider';
    divider.setAttribute('aria-hidden', 'true');
    divider.setAttribute('data-label', AppLang.t('rule_reveal_label'));   // i18n (source language), not hardcoded in CSS
    card.appendChild(divider);
  }

  // ── Rule explanation ──
  const explanationEl = document.createElement('div');
  explanationEl.className = 'rule-explanation';
  explanationEl.innerHTML = parseMarkdown(escapeHTML(currentRule.explanation || ''));
  card.appendChild(explanationEl);
}

/* ══════════════════════════════════════════
   PHASE 4 — Structured Input (comprehension)
══════════════════════════════════════════ */
function buildPhase4() {
  siIndex = 0;
  showStructuredItem(0);
}

function showStructuredItem(idx) {
  const items = currentRule.structured_input || [];
  const total = items.length;

  if (idx >= total) {
    goToPhase(4);  // goToPhase(4) calls buildPhase5()
    return;
  }

  document.getElementById('structured-counter').textContent =
    AppLang.t('cta_exercise_n', { cur: idx + 1, total });

  const item = items[idx];
  const card = document.getElementById('structured-card');
  if (!card) return;
  card.innerHTML = '';
  // Drop the previous item's Next button from the action bar (back stays) while this item is unanswered.
  document.querySelectorAll('#structured-actions .structured-next-btn').forEach(x => x.remove());

  // Affective items (Processing Instruction: the learner reacts to real meaning while processing the
  // form) have no single target sentence — the OPTIONS are the meaning-bearing statements. Referential
  // items show the target sentence + its gloss.
  const affective = !!item.affective;

  // Referential: the target sentence and its L1 gloss form ONE boxed prompt (so the gloss reads as
  // part of the sentence, not a detached line). Affective: no sentence — a small "Your view" tag sits
  // tight above the question.
  if (item.sentence) {
    const prompt = document.createElement('div');
    prompt.className = 'structured-prompt';
    const sentEl = document.createElement('div');
    sentEl.className = 'structured-sentence';
    sentEl.innerHTML = parseInlineMarkdown(escapeHTML(item.sentence));
    prompt.appendChild(sentEl);
    if (item.translation) {
      const trEl = document.createElement('div');
      trEl.className   = 'structured-translation';
      trEl.textContent = item.translation;
      prompt.appendChild(trEl);
    }
    card.appendChild(prompt);
  }

  const qHead = document.createElement('div');
  qHead.className = 'structured-qhead';
  if (affective) {
    const tag = document.createElement('span');
    tag.className = 'structured-affective-tag';
    tag.textContent = AppLang.t('grammar_affective_tag');
    qHead.appendChild(tag);
  }
  const qEl = document.createElement('div');
  qEl.className   = 'structured-question';
  qEl.textContent = item.question;
  qHead.appendChild(qEl);
  card.appendChild(qHead);

  const optsEl = document.createElement('div');
  optsEl.className = 'structured-options';

  const LETTERS = ['A', 'B', 'C', 'D'];
  item.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'option option-btn';
    btn.innerHTML =
      '<span class="option-letter">' + LETTERS[i] + '</span>' +
      escapeHTML(opt);

    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      // Disable all
      optsEl.querySelectorAll('.option-btn').forEach(b => { b.disabled = true; });

      if (affective) {
        // No right/wrong — any answer is valid; just mark the learner's choice and acknowledge.
        btn.classList.add('option--chosen');
        const fb = document.createElement('div');
        fb.className = 'structured-feedback';
        fb.innerHTML = '<span class="structured-feedback__icon"><svg class="icon" aria-hidden="true"><use href="#i-lightbulb"/></svg></span>';
        fb.appendChild(document.createTextNode(item.feedback));
        card.appendChild(fb);
      } else {
        const isCorrect = i === item.correct;
        btn.classList.add(isCorrect ? 'option--correct' : 'option--wrong');
        if (!isCorrect) {
          optsEl.querySelectorAll('.option-btn')[item.correct].classList.add('option--correct');
        }
        // Mismo aviso que el resto: veredicto coloreado + explicacion.
        const fb = document.createElement('div');
        fb.className = 'structured-feedback' + (isCorrect ? '' : ' structured-feedback--wrong');
        const verdict = document.createElement('p');
        verdict.className = 'feedback-result ' + (isCorrect ? 'correct' : 'incorrect');
        verdict.textContent = AppLang.t(isCorrect ? 'feedback_correct' : 'feedback_incorrect');
        const why = document.createElement('span');
        why.className = 'feedback-why';
        why.textContent = item.feedback;
        fb.appendChild(verdict);
        fb.appendChild(why);
        card.appendChild(fb);
      }

      const advance = () => {
        siIndex++;
        if (siIndex >= (currentRule.structured_input || []).length) {
          goToPhase(4);
        } else {
          showStructuredItem(siIndex);
        }
      };

      const bar = document.getElementById('structured-actions');
      bar.querySelectorAll('.structured-next-btn').forEach(x => x.remove());
      const nextBtn = document.createElement('button');
      nextBtn.className   = 'btn btn--primary structured-next-btn';
      nextBtn.textContent = AppLang.t('btn_next');
      nextBtn.addEventListener('click', advance);
      bar.appendChild(nextBtn);   // in the action bar → same row as back (space-between)
      nextBtn.focus();
    });

    optsEl.appendChild(btn);
  });

  card.appendChild(optsEl);
}

/* ══════════════════════════════════════════
   PHASE 5 — FITB Production
══════════════════════════════════════════ */
function buildPhase5() {
  prodIndex    = 0;
  prodCorrect  = 0;
  prodAnswered = false;
  showProductionItem(0);
}

function showProductionItem(idx) {
  const items = currentRule.quiz || [];
  const total = items.length;

  if (idx >= total) {
    goToPhase(5); // goToPhase(5) calls buildPhaseComplete()
    return;
  }

  document.getElementById('production-counter').textContent =
    AppLang.t('cta_exercise_n', { cur: idx + 1, total });

  const item = items[idx];
  const card = document.getElementById('production-card');
  if (!card) return;
  card.innerHTML = '';
  if (!card) return;
  prodAnswered = false;

  // Detect number of blanks — multi-blank needs inline inputs
  const blankParts  = item.sentence.split(/_+/);
  const blankCount  = blankParts.length - 1;

  // Always render inputs inline inside the sentence text
  const sentEl = document.createElement('div');
  sentEl.className = 'production-sentence production-sentence--multi';

  const inputs = [];

  blankParts.forEach((part, i) => {
    if (part) {
      const span = document.createElement('span');
      span.textContent = part;
      sentEl.appendChild(span);
    }
    if (i < blankCount) {
      const inp = document.createElement('input');
      inp.type         = 'text';
      inp.className    = 'field__input field__input--inline production-input production-input--inline';
      inp.autocomplete = 'off';
      inp.spellcheck   = false;
      inp.setAttribute('aria-label', AppLang.t('grammar_production_blank_n', { n: i + 1 }));
      inputs.push(inp);
      sentEl.appendChild(inp);
    }
  });
  // The sentence and its L1 gloss form ONE boxed prompt, so the meaning reads as part of the sentence
  // (the challenge is the grammatical FORM, not the meaning) instead of a detached line below.
  const prompt = document.createElement('div');
  prompt.className = 'production-prompt';
  prompt.appendChild(sentEl);
  if (item.translation) {
    const trEl = document.createElement('div');
    trEl.className   = 'production-translation';
    trEl.textContent = item.translation;
    prompt.appendChild(trEl);
  }
  card.appendChild(prompt);

  // Feedback area
  const fbEl = document.createElement('div');
  fbEl.className = 'production-feedback';
  card.appendChild(fbEl);

  // Un solo boton en el pie: primero verifica y despues avanza. No se puede
  // saltar la correccion.
  const pBar = document.getElementById('production-actions');
  pBar.querySelectorAll('.production-next-btn').forEach(x => x.remove());
  const nextBtn = document.createElement('button');
  nextBtn.className   = 'btn btn--primary production-next-btn';
  nextBtn.textContent = AppLang.t('btn_verify');
  pBar.appendChild(nextBtn);

  // Focus first input
  if (inputs.length > 0) inputs[0].focus();

  // Submit logic
  const submit = () => {
    if (prodAnswered) return;
    const raw = inputs.map(i => i.value.trim()).filter(Boolean).join(' ');
    if (!raw) return;
    prodAnswered = true;

    inputs.forEach(i => { i.disabled = true; });

    const accepted = (item.accepted || [item.answer]).map(a => AppText.normalise(a));
    const isCorrect = accepted.includes(AppText.normalise(raw));

    if (isCorrect) prodCorrect++;

    // Mismo aviso que Cloze/Traduccion: veredicto + explicacion + contraste.
    fbEl.className = 'production-feedback ' + (isCorrect ? 'correct' : 'incorrect') + ' visible';
    fbEl.textContent = '';

    const verdict = document.createElement('p');
    verdict.className = 'feedback-result ' + (isCorrect ? 'correct' : 'incorrect');
    verdict.textContent = AppLang.t(isCorrect ? 'correct_answer_msg' : 'incorrect_answer_msg', { answer: item.answer });
    fbEl.appendChild(verdict);

    const why = document.createElement('span');
    why.className = 'feedback-why';
    why.textContent = item.feedback_why;
    fbEl.appendChild(why);

    if (item.contrast) {
      const rule = document.createElement('hr');
      rule.className = 'feedback-divider';
      const contrast = document.createElement('span');
      contrast.className = 'feedback-contrast';
      contrast.textContent = item.contrast;
      fbEl.appendChild(rule);
      fbEl.appendChild(contrast);
    }

    nextBtn.textContent = idx + 1 < total ? AppLang.t('btn_next') : AppLang.t('btn_results');
    nextBtn.focus();
  };

  inputs.forEach(inp => inp.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); }));

  nextBtn.addEventListener('click', () => {
    // El mismo boton hace las dos cosas: verifica primero y avanza despues.
    if (!prodAnswered) { submit(); return; }
    prodIndex++;
    showProductionItem(prodIndex);
  });
}

/* ══════════════════════════════════════════
   PHASE 6 — Express (communicative / meaningful production, self-assessed)

   Skill-acquisition theory (DeKeyser) and the practice progression mechanical → meaningful →
   communicative (Paulston; Ellis 2006) call for open production, not only mechanical drills. With no
   backend to grade free text, this is a SELF-ASSESSED step: the learner produces their own sentence
   using the structure, then reveals a model answer + gloss and self-checks against it.
══════════════════════════════════════════ */
function buildPhase6() {
  expIndex = 0;
  showExpressItem(0);
}

function showExpressItem(idx) {
  const items = currentRule.communicative_production || [];
  const total = items.length;

  if (idx >= total) { goToPhase(6); return; }   // nothing to express → straight to complete

  const item = items[idx];
  const card = document.getElementById('express-card');
  if (!card) return;
  card.innerHTML = '';
  const counter = document.getElementById('express-counter');
  if (counter) counter.textContent = AppLang.t('cta_exercise_n', { cur: idx + 1, total });

  // The prompt: a source-language instruction to produce something real using the structure.
  const promptEl = document.createElement('div');
  promptEl.className = 'express-prompt';
  promptEl.textContent = item.prompt;
  card.appendChild(promptEl);

  if (item.hint) {
    const hintEl = document.createElement('div');
    hintEl.className = 'express-hint';
    hintEl.textContent = item.hint;
    card.appendChild(hintEl);
  }

  // The learner's own production (free text — not auto-graded; it is theirs to compare).
  const ta = document.createElement('textarea');
  ta.className = 'field__input field__input--alt express-input';
  ta.rows = 2;
  ta.autocomplete = 'off';
  ta.spellcheck = false;
  ta.setAttribute('aria-label', AppLang.t('grammar_express_placeholder'));
  ta.placeholder = AppLang.t('grammar_express_placeholder');
  card.appendChild(ta);

  // Reveal-model button (self-assessment: compare your sentence to a model).
  const showBtn = document.createElement('button');
  showBtn.className = 'btn btn--secondary btn--sm express-model-btn';
  showBtn.textContent = AppLang.t('grammar_show_model');
  card.appendChild(showBtn);

  const bar = document.getElementById('express-actions');
  bar.querySelectorAll('.express-next-btn').forEach(x => x.remove());

  // La accion principal vive siempre en el footer: se habilita al producir,
  // no al ver el modelo. El ejemplo es apoyo, no un peaje.
  const nextBtn = document.createElement('button');
  nextBtn.className = 'btn btn--primary express-next-btn';
  nextBtn.textContent = idx + 1 < total ? AppLang.t('btn_next') : AppLang.t('btn_results');
  nextBtn.disabled = true;
  nextBtn.addEventListener('click', () => { expIndex++; showExpressItem(expIndex); });
  bar.appendChild(nextBtn);

  const syncExpress = () => {
    const words = ta.value.trim().split(/\s+/).filter(Boolean).length;
    const ready = words >= MIN_EXPRESS_WORDS;
    nextBtn.disabled = !ready;
    showBtn.disabled = !ready || !!card.querySelector('.express-model');
  };
  ta.addEventListener('input', syncExpress);
  syncExpress();

  showBtn.addEventListener('click', () => {
    showBtn.disabled = true;

    const model = document.createElement('div');
    model.className = 'express-model';
    const label = document.createElement('div');
    label.className = 'express-model-label';
    label.textContent = AppLang.t('grammar_express_model_label');
    const modelText = document.createElement('div');
    modelText.className = 'express-model-text';
    modelText.textContent = item.model;
    model.appendChild(label);
    model.appendChild(modelText);
    if (item.model_translation) {
      const mtr = document.createElement('div');
      mtr.className = 'express-model-translation';
      mtr.textContent = item.model_translation;
      model.appendChild(mtr);
    }
    const self = document.createElement('div');
    self.className = 'express-selfcheck';
    self.textContent = AppLang.t('grammar_express_selfcheck');
    model.appendChild(self);
    card.appendChild(model);

    // El campo sigue editable: comparar sirve para corregir la propia oracion.
    ta.focus({ preventScroll: true });
  });

  ta.focus();
}

/* ══════════════════════════════════════════
   PHASE 7 — Complete / Rating
══════════════════════════════════════════ */
/* Maps FITB accuracy to SM-2 quality score:
   ≥80% → 5 (Easy)  |  50–79% → 3 (OK)  |  <50% → 1 (Hard) */
function accuracyToQuality(correct, total) {
  if (total === 0) return 3;
  const pct = correct / total;
  if (pct >= 0.8) return 5;
  if (pct >= 0.5) return 3;
  return 1;
}

const QUALITY_META = {
  5: { emoji: '😄', label: 'Easy', cls: 'pill--easy',   hint: 'next review in ~1 week' },
  3: { emoji: '🙂', label: 'OK',   cls: 'pill--ok',     hint: 'next review in ~3 days' },
  1: { emoji: '😰', label: 'Hard', cls: 'pill--hard',   hint: 'next review tomorrow'   },
};

function buildPhaseComplete() {
  const cardId     = 'grammar_' + currentRule.category + '_' + currentRule.id;
  const total      = (currentRule.quiz || []).length;
  const pct        = total > 0 ? Math.round((prodCorrect / total) * 100) : 0;
  const wasReentry = getReentryPhase(cardId) === REENTRY_PHASE;

  // Calculate and store auto quality
  currentAutoQuality = accuracyToQuality(prodCorrect, total);

  // Record progress immediately so it's saved even if the user never taps Continue
  if (!_progressSaved) {
    _progressSaved = true;
    // Only skip the lesson (show the re-entry banner + jump to practice) NEXT time if the learner
    // PASSED this round (quality ≥ 3 = ≥50%). If they failed, clear it so they see the FULL lesson
    // again — a failed learner needs the context and rule, not just more drilling.
    if (currentAutoQuality >= 3) {
      setReentryPhase(cardId);
    } else {
      clearReentryPhase(cardId);
    }
    Progress.rate(cardId, currentAutoQuality);
    if (typeof AppProficiency !== 'undefined') AppProficiency.update(currentRule.level, currentAutoQuality >= 3, 'grammar');
    Progress.recordSession('grammar_' + currentRule.category, prodCorrect, total);
  }

  // Score line + barra: el texto ya da el numero, la barra solo lo refuerza.
  document.getElementById('complete-score').textContent =
    AppLang.t('score_n', { correct: prodCorrect, total, pct });
  const _fill = document.getElementById('complete-progress');
  if (_fill) _fill.style.transform = 'scaleX(' + (pct / 100) + ')';

  // Icon + title
  const iconEl  = document.querySelector('.complete-icon');
  const titleEl = document.querySelector('.complete-title');
  if (prodCorrect === total) {
    iconEl.innerHTML    = '<svg class="icon" aria-hidden="true"><use href="#' + (wasReentry ? 'i-trophy' : 'i-party') + '"/></svg>';
    titleEl.textContent = wasReentry ? AppLang.t('rule_mastered') : AppLang.t('exercise_complete');
  } else {
    iconEl.innerHTML    = '<svg class="icon" aria-hidden="true"><use href="#i-target"/></svg>';
    titleEl.textContent = AppLang.t('keep_practicing');
  }

  // Focus continue button
  document.getElementById('rate-auto')?.focus();

  // Back-to-path link (path mode only)
  const _completeCard = document.getElementById('complete-card');
  const _existingBack = document.getElementById('grammar-back-to-path');
  if (_pathMode && _completeCard && !_existingBack) {
    const _backLink = document.createElement('a');
    _backLink.id = 'grammar-back-to-path';
    _backLink.href = '../my-learning/';
    _backLink.className = 'back-to-path-link';
    _backLink.textContent = AppLang.t('back_to_path');
    _completeCard.appendChild(_backLink);
  }

  buildRelatedPhrases(currentRule);
}

function buildRelatedPhrases(rule) {
  var container = document.getElementById('related-phrases');
  if (!container) return;
  container.innerHTML = '';
  container.classList.add('hidden');

  var topicMeta = (typeof AppTopics !== 'undefined' ? AppTopics.PHRASE_TOPICS : []).map(function(t) {
    return { id: t.id, label: (typeof AppTopics !== 'undefined') ? AppTopics.getLabel(t) : t.label };
  });

  var fetches = topicMeta.map(function(tm) {
    return AppData.get(tm.id)
      .then(function(d){ return { meta: tm, data: d }; })
      .catch(function(){ return null; });
  });

  // Load the phrase→rules evidence map first so "related" uses the SAME link the
  // chip does (evidence map ∪ authored tip), not just phrases with a written tip.
  var _mapReady = (typeof AppGrammarChip !== 'undefined' && AppGrammarChip.load)
    ? AppGrammarChip.load() : Promise.resolve();

  Promise.all([_mapReady, Promise.all(fetches)]).then(function(all) {
    var results = all[1];
    var matches = [];
    for (var t = 0; t < results.length && matches.length < 3; t++) {
      var res = results[t];
      if (!res) continue;
      var phrases = res.data.phrases || [];
      for (var i = 0; i < phrases.length && matches.length < 3; i++) {
        // A phrase is "related" to this rule iff it exercises it — the same
        // phrase↔rule link the grammar chip uses (map ∪ authored tip).
        var rids = (typeof AppGrammarChip !== 'undefined' && AppGrammarChip.rulesFor)
          ? AppGrammarChip.rulesFor({ id: phrases[i].id, tip: phrases[i].grammar || null })
          : [];
        if (rids.indexOf(rule.id) === -1) continue;
        var _text = (phrases[i].target && phrases[i].target[0]) ? phrases[i].target[0].text : '';
        if (_text) matches.push({ phrase: _text, topicId: res.meta.id, topicLabel: res.meta.label });
      }
    }
    if (matches.length === 0) return;

    container.classList.remove('hidden');

    var heading = document.createElement('p');
    heading.className = 'related-heading';
    heading.textContent = AppLang.t('related_phrases');
    container.appendChild(heading);

    var sub = document.createElement('p');
    sub.className = 'related-sub';
    sub.textContent = AppLang.t('related_phrases_sub');
    container.appendChild(sub);

    var activities = [
      { href: '../cloze/',            label: AppLang.t('act_cloze') },
      { href: '../translation/', label: AppLang.t('translate_btn') },
      { href: '../speaking/',       label: AppLang.t('speak_btn') },
    ];

    matches.forEach(function(m) {
      var item = document.createElement('div');
      item.className = 'related-phrase-item';

      var phraseEl = document.createElement('span');
      phraseEl.className = 'related-phrase-text';
      phraseEl.textContent = m.phrase;

      var topicEl = document.createElement('span');
      topicEl.className = 'related-topic-label';
      topicEl.textContent = m.topicLabel;

      var linksEl = document.createElement('div');
      linksEl.className = 'related-activity-links';

      activities.forEach(function(act) {
        var link = document.createElement('a');
        link.className = 'btn btn--secondary btn--sm related-practice-btn';
        link.href = act.href + '?topic=' + m.topicId;
        link.textContent = act.label;
        linksEl.appendChild(link);
      });

      item.appendChild(phraseEl);
      item.appendChild(topicEl);
      item.appendChild(linksEl);
      container.appendChild(item);
    });
  });
}


function finishAndRate(quality) {
  const cardId = 'grammar_' + currentRule.category + '_' + currentRule.id;
  const total  = (currentRule.quiz || []).length;

  // Progress already saved in buildPhaseComplete(); only re-rate if quality differs
  if (!_progressSaved) {
    _progressSaved = true;
    if (quality >= 3) {          // passed → skip lesson next time; failed → full lesson next time
      setReentryPhase(cardId);
    } else {
      clearReentryPhase(cardId);
    }
    Progress.rate(cardId, quality);
    Progress.recordSession('grammar_' + currentRule.category, prodCorrect, total);
  }

  if (_pathMode && typeof PathSession !== 'undefined') {
    const nextHref = PathSession.advance();
    if (nextHref) {
      window.location.href = '../' + nextHref;
    } else {
      _showPathSessionComplete();
    }
    return;
  }

  showRules(currentRule.category);
}

function _showPathSessionComplete() {
  const summary = typeof PathSession !== 'undefined' ? PathSession.getTodaySummary() : null;
  const screen  = document.getElementById('screen-exercise');
  if (!screen) { window.location.href = '../my-learning/'; return; }
  screen.innerHTML =
    '<div class="path-session-complete">' +
      '<div class="path-session-complete__icon"><svg class="icon" aria-hidden="true"><use href="#i-party"/></svg></div>' +
      '<h2 class="path-session-complete__title">' + AppLang.t('session_complete') + '</h2>' +
      (summary ? '<p class="path-session-complete__sub">' + AppLang.t('path_complete_summary', { review: summary.reviewCount, new: summary.newCount }) + '</p>' : '') +
      '<a href="../my-learning/" class="btn btn--path">' + AppLang.t('my_learning_path_link') + '</a>' +
    '</div>';
}

/* ══════════════════════════════════════════
   Re-entry Banner
══════════════════════════════════════════ */
function setReentryBanner(visible) {
  let banner = document.getElementById('reentry-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id        = 'reentry-banner';
    banner.className = 'reentry-banner hidden';
    banner.setAttribute('role', 'status');
    banner.innerHTML =
      '<span class="reentry-icon"><svg class="icon" aria-hidden="true"><use href="#i-rotate-ccw"/></svg></span>' +
      '<span>' + AppLang.t('reentry_banner_msg') + '</span>';
    // Insert after phase-progress bar
    const prog = document.getElementById('phase-progress');
    if (prog) prog.insertAdjacentElement('afterend', banner);
  }
  banner.classList.toggle('hidden', !visible);
}

/* ══════════════════════════════════════════
   Screen switching
══════════════════════════════════════════ */
function showScreen(id) {
  ['screen-categories', 'screen-rules', 'screen-exercise'].forEach(s => {
    document.getElementById(s).classList.toggle('hidden', s !== id);
  });
}

/* ══════════════════════════════════════════
   Re-entry — persist which phase to start from
   Key: 'pe_reentry_' + cardId → '3' (phase index for Structured Input)
   Set when production ends with errors; cleared on perfect score or Easy rating.
══════════════════════════════════════════ */
const REENTRY_PHASE = 3; // index of Structured Input in PHASE_IDS

function getReentryPhase(cardId) {
  const v = localStorage.getItem(AppLangPair.storageKey('pe_reentry_' + cardId));
  return v ? parseInt(v, 10) : 0;
}

function setReentryPhase(cardId) {
  localStorage.setItem(AppLangPair.storageKey('pe_reentry_' + cardId), String(REENTRY_PHASE));
}

function clearReentryPhase(cardId) {
  localStorage.removeItem(AppLangPair.storageKey('pe_reentry_' + cardId));
}

/* ══════════════════════════════════════════
   Utilities
══════════════════════════════════════════ */

function escapeHTML(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/**
 * Converts **bold**, *italic*, and `code` spans to HTML.
 * Input must already be HTML-escaped.
 * Use for short inline strings (sentences, feedback).
 */
function parseInlineMarkdown(s) {
  return s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

/**
 * Converts multi-line markdown to HTML, supporting:
 *   - Paragraphs (blank-line separated)
 *   - Bullet lists (lines starting with "- ")
 *   - Blockquotes (lines starting with "&gt;" after escapeHTML)
 *   - All inline formatting from parseInlineMarkdown
 * Input must already be HTML-escaped.
 * Use for explanation text in Phase 3.
 */
function parseMarkdown(s) {
  const lines = s.split('\n');
  const out = [];
  let inList = false;
  let paraLines = [];

  const flushPara = () => {
    if (paraLines.length) {
      out.push('<p>' + paraLines.join('<br>') + '</p>');
      paraLines = [];
    }
  };

  for (const line of lines) {
    if (line === '') {
      if (inList) { out.push('</ul>'); inList = false; }
      flushPara();
    } else if (line.startsWith('- ')) {
      flushPara();
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push('<li>' + parseInlineMarkdown(line.slice(2)) + '</li>');
    } else if (line.startsWith('&gt;')) {
      if (inList) { out.push('</ul>'); inList = false; }
      flushPara();
      out.push('<blockquote class="rule-tip">' +
        parseInlineMarkdown(line.replace(/^&gt;\s*/, '')) +
        '</blockquote>');
    } else {
      if (inList) { out.push('</ul>'); inList = false; }
      paraLines.push(parseInlineMarkdown(line));
    }
  }
  if (inList) out.push('</ul>');
  flushPara();
  return out.join('');
}

/**
 * Converts **text** markers in dialogue turns into
 * visually highlighted .dialogue-target spans.
 * Used exclusively in buildPhase1() for input enhancement.
 * Input must already be HTML-escaped.
 */
function parseDialogueText(s) {
  return s.replace(/\*\*(.+?)\*\*/g,
    '<span class="dialogue-target">$1</span>'
  );
}
