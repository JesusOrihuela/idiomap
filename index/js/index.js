document.addEventListener('DOMContentLoaded', async function () {
  // Part B: load the active pair's topics before reading topic lists.
  await AppTopics.load();

  _renderHeroMap();
  const heroMapMQ = window.matchMedia('(max-width: 640px)');
  if (heroMapMQ.addEventListener) heroMapMQ.addEventListener('change', _renderHeroMap);

  // The id-map (phrase/vocab counts the path nodes need) is now fetched lazily; wait for
  // it so the "Mi Aprendizaje" preview renders with correct progress. Below the fold →
  // no effect on FCP/LCP. SW-precached, so ~instant for returning users.
  if (typeof Progress !== 'undefined' && Progress.ensureIdMap) await Progress.ensureIdMap();
  if (typeof AppPath !== 'undefined' && AppPath.load) await AppPath.load();

  /* ── Learning Path ── */
  if (typeof AppPath === 'undefined' || typeof Progress === 'undefined') return;

  const grammarData = await AppData.get(AppLangPair.grammarKey()).catch(() => ({ rules: [] }));
  AppPath.setGrammarRules(grammarData.rules || []);

  _renderSessionCta();
  _renderSessionTrail();
});

/* ═══════════════════════════════════════════════
   ZONE 0 — Hero map
   ═══════════════════════════════════════════════ */

function _renderHeroMap() {
  const host = document.getElementById('hero-map');
  if (!host) return;
  const NS = 'http://www.w3.org/2000/svg';
  const make = (tag, attrs) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  };
  let svg = host.querySelector('svg');
  if (!svg) {
    svg = make('svg', { viewBox: '0 0 600 480', fill: 'none' });
    ['hero-map-contours', 'hero-map-route', 'hero-map-stops'].forEach((id) => {
      svg.appendChild(make('g', { id }));
    });
    svg.appendChild(make('path', { class: 'hero-map__compass', d: 'M50 82 v-30 m0 0 -7 11 m7 -11 7 11' }));
    const north = make('text', { class: 'hero-map__compass-label', x: 44, y: 100 });
    north.textContent = 'N';
    svg.appendChild(north);
    host.appendChild(svg);
  }
  const t = (key) => (typeof AppLang !== 'undefined' ? AppLang.t(key) : key);
  const mobile = window.matchMedia('(max-width: 640px)').matches;
  const touch = window.matchMedia('(hover: none)').matches;

  // Dos composiciones: el mapa ancho de escritorio y cuatro paradas en móvil.
  const cfg = mobile ? {
    w: 360, h: 300, contours: 12, step: 25, base: 18,
    ampA: 7, ampB: 3, freqA: 50, freqB: 24, sample: 10,
    routePoints: [
      { x: 50, y: 245 }, { x: 145, y: 225 }, { x: 105, y: 185 },
      { x: 210, y: 172 }, { x: 170, y: 132 }, { x: 250, y: 112 }, { x: 305, y: 80 }
    ],
    stops: [
      { x: 50, y: 245, key: 'hero_path_greet', level: 'A1', anchor: 'middle', dy: 30, current: true },
      { x: 145, y: 225, key: 'hero_path_talk', level: 'A2', anchor: 'start', dx: 14, dy: 24 },
      { x: 210, y: 172, key: 'hero_path_argue', level: 'B2', anchor: 'start', dx: 8, dy: 30 },
      { x: 305, y: 80, key: 'hero_path_master', level: 'C2', anchor: 'middle', dx: -6, dy: -44, summit: true }
    ]
  } : {
    w: 600, h: 480, contours: 16, step: 28, base: 34,
    ampA: 11, ampB: 4, freqA: 82, freqB: 37, sample: 14,
    routePoints: [
      { x: 90, y: 404 }, { x: 210, y: 376 }, { x: 155, y: 326 },
      { x: 300, y: 304 }, { x: 245, y: 254 }, { x: 390, y: 232 },
      { x: 335, y: 182 }, { x: 470, y: 160 }, { x: 425, y: 121 },
      { x: 520, y: 100 }
    ],
    stops: [
      { x: 90, y: 404, key: 'hero_path_greet', level: 'A1', anchor: 'middle', dy: 30, current: true },
      { x: 210, y: 376, key: 'hero_path_talk', level: 'A2', anchor: 'start', dx: 14, dy: 24 },
      { x: 300, y: 304, key: 'hero_path_opinion', level: 'B1', anchor: 'start', dx: 8, dy: 36 },
      { x: 390, y: 232, key: 'hero_path_argue', level: 'B2', anchor: 'start', dx: 14, dy: 28 },
      { x: 470, y: 160, key: 'hero_path_nuance', level: 'C1', anchor: 'start', dx: 10, dy: 34 },
      { x: 520, y: 100, key: 'hero_path_master', level: 'C2', anchor: 'middle', dx: -6, dy: -44, summit: true }
    ]
  };

  svg.setAttribute('viewBox', `0 0 ${cfg.w} ${cfg.h}`);
  ['hero-map-contours', 'hero-map-route', 'hero-map-stops'].forEach((id) => {
    const g = document.getElementById(id);
    while (g && g.firstChild) g.removeChild(g.firstChild);
  });

  // Curvas de nivel
  const contours = document.getElementById('hero-map-contours');
  for (let i = 0; i < cfg.contours; i++) {
    let d = '';
    for (let x = -20; x <= cfg.w + 20; x += cfg.sample) {
      const y = cfg.base + i * cfg.step
        + Math.sin(x / cfg.freqA + i * 0.65) * cfg.ampA
        + Math.sin(x / cfg.freqB + i * 0.4) * cfg.ampB;
      d += (x === -20 ? 'M' : 'L') + x + ' ' + y.toFixed(1);
    }
    contours.appendChild(make('path', {
      d,
      class: 'hero-map__contour',
      'stroke-width': i % 4 === 0 ? 1.25 : 0.9,
      opacity: i % 4 === 0 ? 0.8 : 0.45
    }));
  }

  const smoothPath = (points) => {
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;
      d += ` C ${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6}, ${p2.x - (p3.x - p1.x) / 6} ${p2.y - (p3.y - p1.y) / 6}, ${p2.x} ${p2.y}`;
    }
    return d;
  };

  document.getElementById('hero-map-route').appendChild(make('path', {
    d: smoothPath(cfg.routePoints),
    class: 'hero-map__route'
  }));

  const stopsG = document.getElementById('hero-map-stops');
  cfg.stops.forEach((s) => {
    const summit = !!s.summit;
    const g = make('g', {
      class: 'hero-map__stop'
        + (s.current ? ' hero-map__stop--current' : '')
        + (summit ? ' hero-map__stop--summit' : '')
    });
    // Diana invisible: el hover es cómodo sin dibujar un control.
    g.appendChild(make('circle', { class: 'hero-map__hit', cx: s.x, cy: s.y, r: mobile ? 20 : 24 }));

    if (!summit) {
      const rays = make('g', { class: 'hero-map__rays' });
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 - Math.PI / 2;
        rays.appendChild(make('line', {
          class: 'hero-map__ray',
          x1: (s.x + Math.cos(a) * 10).toFixed(1),
          y1: (s.y + Math.sin(a) * 10).toFixed(1),
          x2: (s.x + Math.cos(a) * 18).toFixed(1),
          y2: (s.y + Math.sin(a) * 18).toFixed(1)
        }));
      }
      g.appendChild(rays);
    } else {
      g.appendChild(make('path', { class: 'hero-map__flag-pole', d: `M ${s.x} ${s.y} V ${s.y - 24}` }));
      g.appendChild(make('path', { class: 'hero-map__flag', d: `M ${s.x} ${s.y - 24} l 18 6 -18 6` }));
    }
    g.appendChild(make('circle', { class: 'hero-map__node', cx: s.x, cy: s.y, r: 4.2 }));

    const label = make('text', {
      class: 'hero-map__label',
      x: s.x + (s.dx || 0),
      y: s.y + s.dy,
      'text-anchor': s.anchor
    });
    const ability = make('tspan', { class: 'hero-map__label-ability', 'data-i18n': s.key });
    ability.textContent = t(s.key);
    const level = make('tspan', { class: 'hero-map__label-level', dx: 3 });
    level.textContent = '· ' + s.level;
    label.appendChild(ability);
    label.appendChild(level);
    g.appendChild(label);
    // Táctil: el toque hace lo que el hover en escritorio.
    if (touch && !summit) {
      g.addEventListener('click', () => {
        const open = g.classList.contains('hero-map__stop--open');
        stopsG.querySelectorAll('.hero-map__stop--open').forEach((n) => n.classList.remove('hero-map__stop--open'));
        if (!open) g.classList.add('hero-map__stop--open');
      });
    }
    stopsG.appendChild(g);
  });

  if (typeof AppI18nDom !== 'undefined') AppI18nDom.apply(svg);
}

/* ═══════════════════════════════════════════════
   ZONE 1 — Daily session CTA card
   ═══════════════════════════════════════════════ */

function _ctaSubtitle(summary) {
  var parts = [];
  if (summary.reviewCount > 0) parts.push(AppLang.t('cta_review', { n: summary.reviewCount }));
  if (summary.newCount > 0)    parts.push(AppLang.t(summary.newCount === 1 ? 'cta_new_one' : 'cta_new_many', { n: summary.newCount }));
  if (summary.estimatedMinutes) parts.push(AppLang.t('cta_min_left', { n: summary.estimatedMinutes }));
  if (summary.skippedReviews > 0) parts.push(AppLang.t('cta_deferred', { n: summary.skippedReviews }));
  return parts.join(', ');
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
          '<div class="path-cta__sub">' + AppLang.t('cta_exercise_n', { cur: prog.current, total: prog.total }) + (remMins ? ', ' + AppLang.t('cta_min_left', { n: remMins }) : '') + '</div>' +
        '</div>' +
        (href
          ? '<a href="' + _esc(href) + '" class="btn btn--path path-cta__btn">' + AppLang.t('cta_continue') + _ctaArrow() + '</a>'
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
      '<button type="button" class="btn btn--path path-cta__btn" id="path-start-btn">' + AppLang.t('cta_start') + _ctaArrow() + '</button>' +
    '</div>';

  var startBtn = document.getElementById('path-start-btn');
  if (startBtn) startBtn.addEventListener('click', _startPathSession);
}

// Start the day's session from the landing: no second "Empezar" on Mi Aprendizaje.
function _startPathSession() {
  var s = PathSession.getSession();
  if (!s) s = PathSession.buildAndSave();
  if (s && s.queue.length > 0) {
    PathSession.start();
    window.location.href = s.queue[s.position].href;
  }
}

/* ═══════════════════════════════════════════════
   ZONE 2 — Duolingo-style session trail
   ═══════════════════════════════════════════════ */

const _ACT_ICON = {
  speaking: 'mic', grammar: 'ruler', vocabulary: 'book', quiz: 'brain',
  cloze: 'pen', dictation: 'type', translation: 'languages', scramble: 'puzzle',
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
  // the connector reads as a single rail. Every step shows its topic pill and
  // its state chip (the same contract as Mi Aprendizaje).
  visible.forEach(function (item, i) {
    const idx = start + i;
    const isDone = idx < position;
    const isActive = idx === position;

    const node = document.createElement('div');
    node.className = 'path-node' +
      (isDone ? ' path-node--done' : isActive ? ' path-node--active' : ' path-node--pending');
    node.setAttribute('role', 'listitem');

    // Cada paso lleva su tema arriba, aunque repita el del anterior.
    const pin = document.createElement('div');
    pin.className = 'path-node__topic';
    pin.textContent = _topicLabel(item.topic);
    pin.title = pin.textContent;
    node.appendChild(pin);

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

    // Cada paso lleva su estado abajo: Hecho, Repasar o Nuevo.
    const badge = document.createElement('span');
    if (isDone) {
      badge.className = 'path-node__done-badge';
      badge.textContent = AppLang.t('badge_done');
    } else if (!item.isNew) {
      badge.className = 'path-node__review-badge';
      badge.textContent = AppLang.t('badge_review');
    } else {
      badge.className = 'path-node__new-badge';
      badge.textContent = AppLang.t('badge_new');
    }
    node.appendChild(badge);

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

/* Las cuatro rejillas de actividades son grids distintos, asi que
   `grid-auto-rows: 1fr` solo iguala dentro de cada grupo. La tarjeta mas alta
   de la pagina fija la altura de las ocho. */
function _equalizeFeatureCards() {
  var cards = document.querySelectorAll('.card--feature');
  if (!cards.length) return;
  cards.forEach(function (c) { c.style.minHeight = ''; });
  var max = 0;
  cards.forEach(function (c) { max = Math.max(max, c.getBoundingClientRect().height); });
  cards.forEach(function (c) { c.style.minHeight = max + 'px'; });
}

document.addEventListener('DOMContentLoaded', function () {
  _equalizeFeatureCards();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(_equalizeFeatureCards);
});

let _cardResizeTimer = 0;
window.addEventListener('resize', function () {
  clearTimeout(_cardResizeTimer);
  _cardResizeTimer = setTimeout(_equalizeFeatureCards, 150);
});
