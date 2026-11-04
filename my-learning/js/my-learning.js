/* ============================================================
   my-learning.js — My Learning Path page
   Depends on: progress.js, path.js, path-session.js
   ============================================================ */

const _ACT_ICON = {
  speaking: 'mic', grammar: 'ruler', vocabulary: 'book', quiz: 'brain',
  cloze: 'type', dictation: 'pen', translation: 'languages', scramble: 'puzzle',
};
function _topicLabel(id) {
  var t = (AppTopics.PHRASE_TOPICS || []).find(function (x) { return x.id === id; })
       || (AppTopics.VOCAB_TOPICS  || []).find(function (x) { return x.id === id; });
  if (!t) return id;
  var lbl = AppTopics.getLabel(t);
  return lbl;
}

function _esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

document.addEventListener('DOMContentLoaded', async function () {
  // Part B: load the active pair's topics before reading topic lists.
  await AppTopics.load();
  if (typeof AppPath !== 'undefined' && AppPath.load) await AppPath.load();

  const fy = document.getElementById('footer-year');
  if (fy) fy.textContent = new Date().getFullYear();

  if (typeof AppPath === 'undefined' || typeof Progress === 'undefined') return;

  const grammarData = await AppData.get(AppLangPair.grammarKey()).catch(() => ({ rules: [] }));
  AppPath.setGrammarRules(grammarData.rules || []);

  _renderStreak();
  _renderCta();
  _renderTrail();
});

// ── Streak ───────────────────────────────────────────────────

function _renderStreak() {
  const el = document.getElementById('ml-streak');
  if (!el || typeof Progress === 'undefined') return;
  const streak = Progress.getStreak();
  if (streak.current > 0) el.textContent = AppLang.t(streak.current === 1 ? 'streak_singular' : 'streak_plural', { n: streak.current });
}

// ── CTA ──────────────────────────────────────────────────────

function _ctaSubtitle(summary) {
  var parts = [];
  if (summary.reviewCount > 0)    parts.push(AppLang.t('cta_review', { n: summary.reviewCount }));
  if (summary.newCount > 0)       parts.push(AppLang.t(summary.newCount === 1 ? 'cta_new_one' : 'cta_new_many', { n: summary.newCount }));
  if (summary.estimatedMinutes)   parts.push(AppLang.t('cta_min_left', { n: summary.estimatedMinutes }));
  if (summary.skippedReviews > 0) parts.push(AppLang.t('cta_deferred', { n: summary.skippedReviews }));
  return parts.join(' · ');
}

function _renderCta() {
  const el = document.getElementById('ml-session-cta');
  if (!el || typeof PathSession === 'undefined') return;

  const active  = PathSession.isActive();
  const session = PathSession.getSession();
  const summary = PathSession.getTodaySummary();

  if (active) {
    const prog    = PathSession.getProgress();
    const item    = PathSession.getCurrentItem();
    const href    = item ? item.href : null;
    const remMins = PathSession.getRemainingMinutes();
    const pct     = Math.round(((prog.current - 1) / prog.total) * 100);
    el.innerHTML =
      '<div class="ml-cta__bar"><div class="ml-cta__bar-fill" style="transform:scaleX(' + (Math.max(pct,5)/100) + ')"></div></div>' +
      '<div class="ml-cta__row">' +
        '<div class="ml-cta__body">' +
          '<div class="ml-cta__title">' + AppLang.t('cta_keep_going') + '</div>' +
          '<div class="ml-cta__sub">' + AppLang.t('cta_exercise_n', { cur: prog.current, total: prog.total }) +
            (remMins ? ' · ' + AppLang.t('cta_min_left', { n: remMins }) : '') + '</div>' +
        '</div>' +
        (href ? '<a href="../' + _esc(href) + '" class="btn btn--path ml-cta__btn">' + AppLang.t('cta_continue') + '</a>'
              : '<span class="ml-cta__done">' + AppLang.t('done_today_status') + '</span>') +
      '</div>';
    return;
  }

  if (session && session.started && session.position >= session.queue.length) {
    el.innerHTML =
      '<div class="ml-cta__row"><div class="ml-cta__body">' +
        '<div class="ml-cta__title">' + AppLang.t('cta_done_today') + '</div>' +
        '<div class="ml-cta__sub">' + AppLang.t('cta_tomorrow') + '</div>' +
      '</div></div>';
    return;
  }

  if (!summary.hasAnything) {
    el.innerHTML =
      '<div class="ml-cta__row"><div class="ml-cta__body">' +
        '<div class="ml-cta__title">' + AppLang.t('cta_up_to_date') + '</div>' +
        '<div class="ml-cta__sub">' + AppLang.t('cta_come_back_new') + '</div>' +
      '</div></div>';
    return;
  }

  el.innerHTML =
    '<div class="ml-cta__row">' +
      '<div class="ml-cta__body">' +
        '<div class="ml-cta__title">' + AppLang.t('cta_ready') + '</div>' +
        '<div class="ml-cta__sub">' + _ctaSubtitle(summary) + '</div>' +
      '</div>' +
      '<button class="btn btn--path ml-cta__btn" id="ml-start-btn">' + AppLang.t('cta_start') + '</button>' +
    '</div>';

  document.getElementById('ml-start-btn').addEventListener('click', function () {
    var s = PathSession.getSession();
    if (!s) s = PathSession.buildAndSave();
    if (s && s.queue.length > 0) {
      PathSession.start();
      window.location.href = '../' + s.queue[s.position].href;
    }
  });
}

// ── Trail ─────────────────────────────────────────────────────

function _renderTrail() {
  const container = document.getElementById('ml-trail');
  const titleEl   = document.getElementById('ml-trail-title');
  if (!container || typeof PathSession === 'undefined') return;

  if (_connRO) { _connRO.disconnect(); _connRO = null; }
  container.innerHTML = '';

  var session = PathSession.getSession();
  // Rebuild only if no session exists or session hasn't started AND has no progress yet.
  // Never rebuild a session that's already in progress (position > 0) — that would reset the user's place.
  if (!session || (!session.started && session.position === 0)) {
    var summary = PathSession.getTodaySummary();
    if (summary.hasAnything) session = PathSession.buildAndSave();
  }

  if (session && session.queue.length > 0) {
    if (titleEl) titleEl.textContent = AppLang.t('trail_today');
    _buildTrail(container, session.queue, session.position);
  } else {
    if (titleEl) titleEl.textContent = AppLang.t('trail_empty');
  }
}

// ── Trail: diagonal zigzag ────────────────────────────────────
// One step per row on alternating columns: every connector is a diagonal, so no
// stroke crosses the topic pill (above the bubble) or the activity label and the
// Nuevo/Repasar chip (below it). The row step lives in CSS
// (grid-auto-rows) and JS only mirrors the position to place each node.

var _connRO = null;

function _buildTrail(container, queue, position) {
  container.className = 'ml-trail';

  var lastTopic = null;

  queue.forEach(function (item, i) {
    var row     = i;
    var col     = (i % 2) + 1;
    var isDone   = i < position;
    var isActive = i === position;
    // Un paso hecho también es un enlace: repasar lo aprendido (DP-07).
    var isLink   = (isActive || isDone) && !!item.href;

    var node = document.createElement('div');
    node.className = 'ml-snode' +
      (isDone ? ' ml-snode--done' : isActive ? ' ml-snode--active' : ' ml-snode--pending');
    node.style.gridRow = String(row + 1);
    node.style.gridColumn = String(col);
    node.setAttribute('role', 'listitem');

    // Pin de tema: solo al cambiar de tema (los repetidos reservan el hueco).
    var tp = document.createElement('div');
    tp.className = 'ml-snode__topic';
    tp.textContent = _topicLabel(item.topic);
    if (item.topic === lastTopic) tp.style.visibility = 'hidden';
    lastTopic = item.topic;
    node.appendChild(tp);

    var bubble = isLink ? document.createElement('a') : document.createElement('div');
    bubble.className = 'ml-snode__bubble';
    if (isLink) {
      bubble.href = '../' + item.href;
      bubble.setAttribute('aria-label', AppLang.t(isDone ? 'aria_review' : 'aria_continue', { label: AppLang.t('act_' + item.activityId) || item.activityId }));
    }
    if (isDone) {
      bubble.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-check"/></svg>';
    } else {
      bubble.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-' + (_ACT_ICON[item.activityId] || 'star') + '"/></svg>';
    }
    node.appendChild(bubble);

    var info = document.createElement('div');
    info.className = 'ml-snode__info';
    var lbl = document.createElement('span');
    lbl.className = 'ml-snode__label';
    lbl.textContent = AppLang.t('act_' + item.activityId) || item.activityId;
    info.appendChild(lbl);
    // El estado se dice una vez: en el paso que toca ahora (10 "Nuevo" seguidos era ruido).
    if (isActive && item.isNew) {
      var badge = document.createElement('span');
      badge.className = 'ml-snode__new-badge';
      badge.textContent = AppLang.t('badge_new');
      info.appendChild(badge);
    } else if (isActive && !item.isNew) {
      var rbadge = document.createElement('span');
      rbadge.className = 'ml-snode__review-badge';
      rbadge.textContent = AppLang.t('badge_review');
      info.appendChild(rbadge);
    }
    node.appendChild(info);

    container.appendChild(node);
  });

  _drawConnectors(container, position);
}

function _drawConnectors(trail, position) {
  trail._connPos = position;
  _paintConnectors(trail);
  if (_connRO || typeof ResizeObserver === 'undefined') return;
  _connRO = new ResizeObserver(function () { _paintConnectors(trail); });
  _connRO.observe(trail);
}

function _paintConnectors(trail) {
  var position = trail._connPos || 0;
  var NS = 'http://www.w3.org/2000/svg';
  var nodes = Array.from(trail.querySelectorAll('.ml-snode'));
  if (nodes.length < 2) return;
  var old = trail.querySelector('.ml-connectors');
  if (old) old.remove();

  var trailRect = trail.getBoundingClientRect();
  var width  = trailRect.width;
  var height = trailRect.height;
  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'ml-connectors');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);

  var bubbles = nodes.map(function (n) { return n.querySelector('.ml-snode__bubble'); });
  for (var i = 0; i < bubbles.length - 1; i++) {
    var a = bubbles[i].getBoundingClientRect();
    var b = bubbles[i + 1].getBoundingClientRect();
    var ax = a.left + a.width / 2 - trailRect.left;
    var ay = a.top + a.height / 2 - trailRect.top;
    var bx = b.left + b.width / 2 - trailRect.left;
    var by = b.top + b.height / 2 - trailRect.top;
    var dx = bx - ax, dy = by - ay;
    var len = Math.hypot(dx, dy);
    if (!len) continue;
    var ra = Math.max(a.width, a.height) / 2;
    var rb = Math.max(b.width, b.height) / 2;
    var cls = 'ml-connector' + (i + 1 <= position ? ' ml-connector--done' : '');
    // Straight line from circle edge to circle edge. Every step is diagonal, so
    // the stroke passes beside the topic pill and the state chip, never over them.
    var ux = dx / len, uy = dy / len;
    var el = document.createElementNS(NS, 'line');
    el.setAttribute('x1', (ax + ux * ra).toFixed(2));
    el.setAttribute('y1', (ay + uy * ra).toFixed(2));
    el.setAttribute('x2', (bx - ux * rb).toFixed(2));
    el.setAttribute('y2', (by - uy * rb).toFixed(2));
    el.setAttribute('class', cls);
    svg.appendChild(el);
  }
  trail.insertBefore(svg, trail.firstChild);
}
