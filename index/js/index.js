document.addEventListener('DOMContentLoaded', async function () {
  // Part B: load the active pair's topics before reading topic lists.
  await AppTopics.load();
  // The id-map (phrase/vocab counts the path nodes need) is now fetched lazily; wait for
  // it so the "Mi Aprendizaje" preview renders with correct progress. Below the fold →
  // no effect on FCP/LCP. SW-precached, so ~instant for returning users.
  if (typeof Progress !== 'undefined' && Progress.ensureIdMap) await Progress.ensureIdMap();
  if (typeof AppPath !== 'undefined' && AppPath.load) await AppPath.load();

  /* ── Hero image skew effect (solo con puntero y sin reduced-motion) ── */
  const image = document.getElementById('skewingImage');
  const _fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const _still = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (image && _fine.matches && !_still.matches) {
    let rect = null, frame = 0;
    image.addEventListener('pointerenter', function () { rect = image.getBoundingClientRect(); });
    image.addEventListener('pointermove', function (e) {
      if (!rect) rect = image.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(function () {
        image.style.transform = `skew(${(x - rect.width / 2) / 150}deg, ${(y - rect.height / 2) / 150}deg)`;
      });
    });
    image.addEventListener('pointerleave', function () {
      cancelAnimationFrame(frame);
      rect = null;
      image.style.transform = 'skew(0deg, 0deg)';
    });
  }

  /* ── Learning Path ── */
  if (typeof AppPath === 'undefined' || typeof Progress === 'undefined') return;

  const grammarData = await AppData.get(AppLangPair.grammarKey()).catch(() => ({ rules: [] }));
  AppPath.setGrammarRules(grammarData.rules || []);

  _renderSessionCta();
  _renderSessionTrail();
});

/* ═══════════════════════════════════════════════
   ZONE 1 — Daily session CTA card
   ═══════════════════════════════════════════════ */

function _ctaSubtitle(summary) {
  var parts = [];
  if (summary.reviewCount > 0) parts.push(AppLang.t('cta_review', { n: summary.reviewCount }));
  if (summary.newCount > 0)    parts.push(AppLang.t(summary.newCount === 1 ? 'cta_new_one' : 'cta_new_many', { n: summary.newCount }));
  if (summary.estimatedMinutes) parts.push(AppLang.t('cta_min_left', { n: summary.estimatedMinutes }));
  if (summary.skippedReviews > 0) parts.push(AppLang.t('cta_deferred', { n: summary.skippedReviews }));
  return parts.join(' · ');
}

function _ctaArrow() {
  return ' <svg class="icon path-cta__arrow" aria-hidden="true"><use href="#i-arrow-right"/></svg>';
}

function _renderSessionCta() {
  const el = document.getElementById('path-session-cta');
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
      '<div class="progress-bar path-cta__bar"><div class="progress-bar__fill path-cta__bar-fill" style="transform:scaleX(' + (Math.max(pct, 5) / 100) + ')"></div></div>' +
      '<div class="path-cta__row">' +
        '<div class="path-cta__body">' +
          '<div class="path-cta__title">' + AppLang.t('cta_keep_going') + '</div>' +
          '<div class="path-cta__sub">' + AppLang.t('cta_exercise_n', { cur: prog.current, total: prog.total }) + (remMins ? ' · ' + AppLang.t('cta_min_left', { n: remMins }) : '') + '</div>' +
        '</div>' +
        (href
          ? '<a href="my-learning/" class="btn btn--path path-cta__btn">' + AppLang.t('cta_continue') + _ctaArrow() + '</a>'
          : '<span class="path-cta__done">' + AppLang.t('done_today_status') + '</span>') +
      '</div>';
    return;
  }

  if (session && session.started && session.position >= session.queue.length) {
    el.innerHTML =
      '<div class="path-cta__row">' +
        '<div class="path-cta__body">' +
          '<div class="path-cta__title">' + AppLang.t('cta_done_today') + '</div>' +
          '<div class="path-cta__sub">' + AppLang.t('cta_tomorrow') + '</div>' +
        '</div>' +
      '</div>';
    return;
  }

  if (!summary.hasAnything) {
    el.innerHTML =
      '<div class="path-cta__row">' +
        '<div class="path-cta__body">' +
          '<div class="path-cta__title">' + AppLang.t('cta_up_to_date') + '</div>' +
          '<div class="path-cta__sub">' + AppLang.t('cta_come_back_new') + '</div>' +
        '</div>' +
      '</div>';
    return;
  }

  el.innerHTML =
    '<div class="path-cta__row">' +
      '<div class="path-cta__body">' +
        '<div class="path-cta__title">' + AppLang.t('cta_ready') + '</div>' +
        '<div class="path-cta__sub">' + _ctaSubtitle(summary) + '</div>' +
      '</div>' +
      '<a href="my-learning/" class="btn btn--path path-cta__btn">' + AppLang.t('cta_start') + _ctaArrow() + '</a>' +
    '</div>';
}

/* ═══════════════════════════════════════════════
   ZONE 2 — Duolingo-style session trail
   ═══════════════════════════════════════════════ */

const _ACT_ICON = {
  speaking: 'mic', grammar: 'ruler', vocabulary: 'book', quiz: 'brain',
  cloze: 'type', dictation: 'pen', translation: 'languages', scramble: 'puzzle',
};
function _actLabel(id)   { return AppLang.t('act_' + id) || id; }
function _topicLabel(id) {
  const t = (AppTopics.PHRASE_TOPICS || []).find(function (x) { return x.id === id; })
         || (AppTopics.VOCAB_TOPICS  || []).find(function (x) { return x.id === id; });
  if (!t) return id;
  return AppTopics.getLabel(t);
}

let _trailStart = null;
let _connRO = null;

function _renderSessionTrail() {
  const container = document.getElementById('path-nodes');
  if (!container || typeof PathSession === 'undefined') return;

  // Rebuild if not yet started — ensures reviews due since last build are included
  let session = PathSession.getSession();
  if (!session || !session.started) {
    const summary = PathSession.getTodaySummary();
    if (summary.hasAnything) session = PathSession.buildAndSave();
  }

  // The trail node is replaced on every render: release the old observer.
  if (_connRO) { _connRO.disconnect(); _connRO = null; }
  container.innerHTML = '';

  if (session && session.queue.length > 0) {
    _buildTrailNodes(container, session.queue, session.position);
  } else {
    _updatePager(null, 0, 0);
  }
  // If truly nothing to do, leave trail empty (CTA already shows "All caught up!")
}

function _drawConnectors(trail, position) {
  trail._connPos = position;
  _paintConnectors(trail);
  // One observer for the life of this trail: redraw geometry, never re-create.
  if (_connRO || typeof ResizeObserver === 'undefined') return;
  _connRO = new ResizeObserver(function () { _paintConnectors(trail); });
  _connRO.observe(trail);
}

function _paintConnectors(trail) {
  const position = trail._connPos || 0;
  const NS = 'http://www.w3.org/2000/svg';
  const nodes = Array.from(trail.querySelectorAll('.path-node'));
  if (nodes.length < 2) return;
  const old = trail.querySelector('.path-connectors');
  if (old) old.remove();

  // Use the rendered box, not scrollWidth/scrollHeight: a wide label overflows
  // the trail and would make the viewBox wider than the SVG, rescaling every
  // endpoint and leaving gaps between the lines and the circles.
  const trailRect = trail.getBoundingClientRect();
  const width  = trailRect.width;
  const height = trailRect.height;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'path-connectors');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);

  const bubbles = nodes.map((n) => n.querySelector('.path-node__bubble'));
  for (let i = 0; i < bubbles.length - 1; i++) {
    const a = bubbles[i].getBoundingClientRect();
    const b = bubbles[i + 1].getBoundingClientRect();
    const ax = a.left + a.width / 2 - trailRect.left;
    const ay = a.top + a.height / 2 - trailRect.top;
    const bx = b.left + b.width / 2 - trailRect.left;
    const by = b.top + b.height / 2 - trailRect.top;
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy);
    if (!len) continue;
    const ux = dx / len, uy = dy / len;
    const ra = Math.max(a.width, a.height) / 2;
    const rb = Math.max(b.width, b.height) / 2;
    const line = document.createElementNS(NS, 'line');
    line.setAttribute('x1', (ax + ux * ra).toFixed(2));
    line.setAttribute('y1', (ay + uy * ra).toFixed(2));
    line.setAttribute('x2', (bx - ux * rb).toFixed(2));
    line.setAttribute('y2', (by - uy * rb).toFixed(2));
    line.setAttribute('class', 'path-connector-line' + (i + 1 <= position ? ' path-connector-line--done' : ''));
    svg.appendChild(line);
  }
  trail.insertBefore(svg, trail.firstChild);
}

/* Page status: tells which slice of the session is on screen. */
function _updatePager(queue, start, win) {
  const pager = document.getElementById('path-pager');
  const status = document.getElementById('path-page-status');
  if (!pager || !status) return;

  if (!queue || queue.length <= win) {
    pager.hidden = true;
    status.textContent = '';
    return;
  }

  pager.hidden = false;
  const from = start + 1;
  const to = Math.min(start + win, queue.length);
  status.textContent = AppLang.t('index_path_range', { from: from, to: to, total: queue.length });
}

function _buildTrailNodes(container, queue, position) {
  // A focused window, not an endless rail: 5 steps on desktop, 3 on narrow
  // screens. The arrows page the window; nothing is clipped at the edges.
  // The size and its breakpoint live in CSS (--path-window) so there is one
  // source of truth for the layout and for this window.
  const trailCard = document.querySelector('.path-card__trail');
  const cssWin = trailCard ? parseInt(getComputedStyle(trailCard).getPropertyValue('--path-window'), 10) : 5;
  const win = Math.max(1, cssWin || 5);
  const maxStart = Math.max(0, queue.length - win);
  if (_trailStart === null) {
    _trailStart = Math.min(Math.max(0, position - Math.floor(win / 2)), maxStart);
  }
  const start = Math.min(Math.max(0, _trailStart), maxStart);
  _trailStart = start;
  const visible = queue.slice(start, start + win);

  const trail = document.createElement('div');
  trail.className = 'path-trail';
  // Transparent wrapper: keeps the .path-node listitems as the direct children
  // of the role="list" container in the accessibility tree.
  trail.setAttribute('role', 'presentation');

  // One row per page, no vertical wave: every bubble sits on the same line and
  // the connector reads as a single rail. The topic pill is repeated only when
  // the topic changes, so a same-topic session does not stamp it on every step.
  visible.forEach(function (item, i) {
    const idx = start + i;
    const isDone = idx < position;
    const isActive = idx === position;
    const showTopic = i === 0 || visible[i - 1].topic !== item.topic;

    const node = document.createElement('div');
    node.className = 'path-node' +
      (isDone ? ' path-node--done' : isActive ? ' path-node--active' : ' path-node--pending');
    node.setAttribute('role', 'listitem');

    // Topic pill above the bubble, inside the reserved pin zone.
    if (showTopic) {
      const pin = document.createElement('div');
      pin.className = 'path-node__topic';
      pin.textContent = _topicLabel(item.topic);
      node.appendChild(pin);
    }

    // Bubble: link when active, plain div otherwise.
    const bubble = isActive ? document.createElement('a') : document.createElement('div');
    bubble.className = 'path-node__bubble';
    if (isActive && item.href) {
      bubble.href = item.href;
      bubble.setAttribute('aria-label', AppLang.t('aria_go_to', { label: _actLabel(item.activityId) }));
    }
    bubble.setAttribute('aria-hidden', isActive ? 'false' : 'true');

    if (isDone) {
      bubble.innerHTML = '<span class="path-node__check">✓</span>';
    } else {
      bubble.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-' + (_ACT_ICON[item.activityId] || 'star') + '"/></svg>';
    }
    node.appendChild(bubble);

    const label = document.createElement('div');
    label.className = 'path-node__label';
    label.textContent = _actLabel(item.activityId);
    node.appendChild(label);

    // Status chip below the activity label: Nuevo for the active new step,
    // Repasar for a pending review. Steps without one keep no chip.
    if (isActive && item.isNew) {
      const badge = document.createElement('span');
      badge.className = 'path-node__new-badge';
      badge.textContent = AppLang.t('badge_new');
      node.appendChild(badge);
    } else if (!isDone && !item.isNew) {
      const badge = document.createElement('span');
      badge.className = 'path-node__review-badge';
      badge.textContent = AppLang.t('badge_review');
      node.appendChild(badge);
    }

    trail.appendChild(node);
  });

  container.appendChild(trail);
  _drawConnectors(trail, position - start);

  const btnLeft = document.getElementById('path-scroll-left');
  const btnRight = document.getElementById('path-scroll-right');
  const hasPrev = start > 0;
  const hasNext = start + win < queue.length;
  if (btnLeft) {
    btnLeft.classList.toggle('is-hidden', !hasPrev);
    btnLeft.onclick = function () {
      if (!hasPrev) return;
      _trailStart = Math.max(0, start - win);
      _renderSessionTrail();
    };
  }
  if (btnRight) {
    btnRight.classList.toggle('is-hidden', !hasNext);
    btnRight.onclick = function () {
      if (!hasNext) return;
      _trailStart = Math.min(maxStart, start + win);
      _renderSessionTrail();
    };
  }

  _updatePager(queue, start, win);
}

function _esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

let _trailResizeTimer = 0;
window.addEventListener('resize', function () {
  clearTimeout(_trailResizeTimer);
  _trailResizeTimer = setTimeout(function () {
    _trailStart = null;
    if (typeof _renderSessionTrail === 'function') _renderSessionTrail();
  }, 150);
});
