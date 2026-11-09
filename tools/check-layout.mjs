/* ============================================================
   check-layout.mjs — verifica el contrato de layout del plan H1–H4
   ------------------------------------------------------------
   1. Secciones del perfil: misma medida y sin scroll horizontal.
   2. Actividad: 60 barras a todo el ancho, meses y estado vacío.
   3. Mi Aprendizaje: rejilla serpentina a todo el ancho (<= 900 px), pildoras en cada paso y sin trazos sobre las capsulas.
   4. Alineación: gramática y actividades arrancan a la misma altura.
   5. Índice: tarjetas de actividad parejas.
   6. Índice: ruta paginada (indicador, flechas, conectores pegados y aire simétrico).
   7. Nav: una fila, 44 px por destino y alto cómodo de 320 a 1966 px.
   8. Landing: el aire bajo el header y sobre el footer coinciden.
   9. Teclado: las 8 tarjetas del índice se alcanzan con Tab y foco visible.
   10. Acentos de actividad: mapeo único en components.css, páginas con data-activity.
   11. Tipografía: cada h1/h2 tiene un rol compartido y los roles representativos se miden.
   12. Matriz y landing: columnas alineadas, sin etiquetas móviles en escritorio y 8 acentos únicos.
   Uso: node tools/check-layout.mjs
   ============================================================ */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'file:///C:/Users/juanj/Downloads/PracticeEnglish/practice_english.github.io/node_modules/playwright-core/index.mjs';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const PORT = 8180;
const MIME = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.ico':'image/x-icon' };
const server = http.createServer((req, res) => {
  let f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (f.endsWith('/') || f.endsWith('\\')) f = path.join(f, 'index.html');
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(PORT, r));
const browser = await chromium.launch({ executablePath: 'C:/Users/juanj/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe' });

const fails = [];
const check = (ok, msg) => { console.log(`  ${ok ? 'ok   ' : 'FALLA'} ${msg}`); if (!ok) fails.push(msg); };

async function page(url, w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block' });
  await ctx.addInitScript(() => localStorage.setItem('pe_active_pair', 'es-en'));
  const pg = await ctx.newPage();
  await ctx.route(/\.(onnx|wasm|bin)(\?|$)/i, r => r.abort());
  await pg.goto(`http://localhost:${PORT}${url}`, { waitUntil: 'domcontentloaded' });
  await pg.waitForTimeout(1600);
  // Medir siempre con la tipografia cargada: con la de respaldo las fichas de
  // Secuencia envuelven y el ancho de linea cambia.
  await pg.evaluate(() => document.fonts.ready);
  return { ctx, pg };
}

// 1 · perfil
for (const w of [1440, 375]) {
  const { ctx, pg } = await page('/progress/', w, w === 375 ? 812 : 900);
  const m = await pg.evaluate(() => {
    const rects = [...document.querySelectorAll('.section-block')].map(e => {
      const r = e.getBoundingClientRect();
      return { l: Math.round(r.left), r: Math.round(r.right) };
    });
    return { rects, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth };
  });
  const bases = m.rects.map(x => x.l);
  const rights = m.rects.map(x => x.r);
  check(m.rects.length >= 5, `perfil ${w}: ${m.rects.length} secciones`);
  check(Math.max(...bases) - Math.min(...bases) <= 1, `perfil ${w}: mismo borde izquierdo`);
  check(Math.max(...rights) - Math.min(...rights) <= 1, `perfil ${w}: mismo borde derecho`);
  check(m.sw <= m.cw + 1, `perfil ${w}: sin scroll horizontal (${m.sw}/${m.cw})`);
  await ctx.close();
}

// 1b · perfil: stats, pares, temas, títulos y respaldo comparten contrato
{
  const { ctx, pg } = await page('/progress/', 1440, 900);
  const m = await pg.evaluate(() => {
    const section = document.querySelector('.section-block');
    const sr = section.getBoundingClientRect();
    const cs = getComputedStyle(section);
    const content = sr.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      - parseFloat(cs.borderLeftWidth) - parseFloat(cs.borderRightWidth);
    const stats = document.querySelector('.stats-row').getBoundingClientRect();
    const labels = [...document.querySelectorAll('.stat-label')];
    const cards = [...document.querySelectorAll('.lp-card')];
    const grid = document.querySelector('.lang-pair-grid').getBoundingClientRect();
    const cardRects = cards.map(c => c.getBoundingClientRect());
    const first = cardRects[0];
    const arrows = [...cards[0].querySelectorAll('.lp-card__arrow')].map(a => {
      const r = a.getBoundingClientRect();
      return Math.round(r.left + r.width / 2 - first.left);
    });
    const bubbles = [...document.querySelectorAll('.prog-bubble')];
    const bs = bubbles.length ? getComputedStyle(bubbles[0]) : null;
    const title = document.querySelector('h2.section-title');
    const ts = getComputedStyle(title);
    const backupBtn = document.getElementById('backup-export-btn');
    return {
      section: [Math.round(sr.left), Math.round(sr.right)],
      content: Math.round(content),
      stats: [Math.round(stats.left), Math.round(stats.right)],
      statsHidden: document.getElementById('stats-row').classList.contains('hidden'),
      statLines: labels.map(l => Math.round(l.getBoundingClientRect().height / parseFloat(getComputedStyle(l).lineHeight))),
      grid: Math.round(grid.width),
      cardW: cardRects.map(r => Math.round(r.width)),
      cardH: cardRects.map(r => Math.round(r.height)),
      nameOverflow: cards.flatMap(c => [...c.querySelectorAll('.lp-card__name')])
        .filter(n => n.scrollWidth > n.clientWidth + 1).length,
      arrowW: Math.round(cards[0].querySelector('.lp-card__arrow').getBoundingClientRect().width),
      arrows,
      bubbles: bubbles.length,
      bubbleIcons: bubbles.filter(b => b.querySelector('.prog-bubble-icon .icon')).length,
      bubbleCenter: getComputedStyle(document.querySelector('.prog-bubbles')).justifyContent,
      bubbleFont: bs ? bs.fontSize : null,
      bubbleH: bs ? Math.round(bubbles[0].getBoundingClientRect().height) : null,
      bubbleCapsule: bs ? (() => {
        const ps = getComputedStyle(bubbles[0], '::before');
        return Math.round(bubbles[0].getBoundingClientRect().height - parseFloat(ps.top) - parseFloat(ps.bottom));
      })() : null,
      titleFont: ts.fontSize,
      titleBar: ts.borderInlineStartWidth,
      titleRule: getComputedStyle(title, '::after').content !== 'none',
      textColor: getComputedStyle(document.querySelector('.ex-grid-topic-name')).color,
      actIcons: [...document.querySelectorAll('.ex-grid-th .icon')].map(i => getComputedStyle(i).stroke),
      actLabels: [...document.querySelectorAll('.ex-grid-th-label')].map(l => getComputedStyle(l).color),
      matrix: (() => {
        const header = document.querySelector('.ex-grid-row--header');
        const data = [...document.querySelectorAll('.ex-grid-row')].find(r => !r.classList.contains('ex-grid-row--header'));
        const centers = row => [...row.children].slice(1).map(c => {
          const r = c.getBoundingClientRect();
          return r.left + r.width / 2;
        });
        const h = centers(header), d = centers(data);
        const cell = document.querySelector('.ex-grid-cell');
        const wrap = document.querySelector('.ex-matrix-wrap').getBoundingClientRect();
        const lastCell = [...data.children].pop().getBoundingClientRect();
        return {
          diff: Math.max(...h.map((x, i) => Math.abs(x - d[i]))),
          sameCols: getComputedStyle(header).gridTemplateColumns === getComputedStyle(data).gridTemplateColumns,
          label: getComputedStyle(cell, '::before').content,
          seg: getComputedStyle(cell.querySelector('.ex-seg-bar')).display,
          rightGap: Math.round(wrap.right - lastCell.right),
          thClear: [...document.querySelectorAll('.ex-grid-th')]
            .filter(t => getComputedStyle(t).backgroundColor === 'rgba(0, 0, 0, 0)').length,
        };
      })(),
      backup: backupBtn ? {
        sm: backupBtn.classList.contains('btn--sm'),
        h: Math.round(backupBtn.getBoundingClientRect().height),
        surface: Math.round(backupBtn.getBoundingClientRect().height
          - parseFloat(getComputedStyle(backupBtn, '::before').top)
          - parseFloat(getComputedStyle(backupBtn, '::before').bottom)),
        font: getComputedStyle(backupBtn).fontSize,
      } : null,
      backupFonts: ['.section-subtitle', '.backup-banner__text', '.backup-status', '.backup-hint']
        .map(sel => { const el = document.querySelector('#backup-block ' + sel); return el ? getComputedStyle(el).fontSize : null; })
        .filter(Boolean),
      banner: !!document.querySelector('#backup-block .banner'),
      backupWarn: (document.getElementById('backup-status') || {}).className || '',
      oldClasses: document.querySelectorAll('.backup-btn, .backup-banner, .lp-card__label').length,
      sectionSubs: {
        lang: !!document.querySelector('#lang-pair .section-subtitle'),
        topics: !!document.querySelector('#topics-block .section-subtitle'),
        backup: !!document.querySelector('#backup-block .section-subtitle'),
        notif: !!document.querySelector('#notif-block .section-subtitle'),
        data: !!document.querySelector('#exercises-block .section-subtitle'),
      },
    };
  });
  // Las tres tarjetas se muestran siempre, también con todo a 0.
  check(!m.statsHidden && m.stats[0] === m.section[0] && m.stats[1] === m.section[1],
    `perfil: stats alineadas a la sección (${m.stats.join('/')})`);
  check(m.statLines.every(n => n === 1),
    `perfil: rótulos de stats en 1 línea (${m.statLines.join('/')})`);
  check(m.grid >= m.content - 1, `perfil: rejilla de pares ${m.grid}/${m.content} px`);
  check(new Set(m.cardW).size === 1, `perfil: tarjetas de par iguales (${[...new Set(m.cardW)].join('/')})`);
  check(new Set(m.cardH).size === 1, `perfil: alturas de par iguales (${[...new Set(m.cardH)].join('/')})`);
  check(m.nameOverflow === 0, `perfil: nombres de par sin recorte (${m.nameOverflow})`);
  check(m.arrowW <= 16, `perfil: flecha de par ${m.arrowW}px`);
  check(m.arrows.length === 2 && Math.abs(m.arrows[0] - m.arrows[1]) <= 1 && Math.abs(m.arrows[0] - m.cardW[0] / 2) <= 1,
    `perfil: flechas centradas (${m.arrows.join('/')} en ${m.cardW[0]} px)`);
  check(m.bubbles > 0 && m.bubbleIcons === m.bubbles, `perfil: ${m.bubbleIcons}/${m.bubbles} temas con icono`);
  check(m.bubbleCenter === 'center', `perfil: temas centrados (${m.bubbleCenter})`);
  check(m.bubbleFont === '12px' && m.bubbleH === 44 && m.bubbleCapsule === 32, `perfil: cápsulas ${m.bubbleFont}/${m.bubbleCapsule}px (objetivo ${m.bubbleH}px)`);
  check(new Set(m.actIcons).size === 8, `perfil: ${new Set(m.actIcons).size} acentos de actividad distintos`);
  check(m.actLabels.every(c => c === m.textColor), `perfil: rótulos de actividad en color de texto (${m.actLabels[0]})`);
  check(m.matrix.sameCols && m.matrix.diff <= 1, `perfil: matriz alineada (${m.matrix.diff}px, ${m.matrix.sameCols})`);
  check(m.matrix.thClear === 0, `perfil: cabeceras con fondo opaco (${m.matrix.thClear} transparentes)`);
  check(m.matrix.rightGap >= 6, `perfil: última columna con aire (${m.matrix.rightGap}px)`);
  check(m.matrix.label === 'none' && m.matrix.seg !== 'none', `perfil: matriz sin etiquetas móviles (${m.matrix.label}/${m.matrix.seg})`);
  check(m.titleFont === '20px' && m.titleBar === '0px' && m.titleRule, `perfil: título ${m.titleFont}, barra ${m.titleBar}, regla ${m.titleRule}`);
  check(!!m.backup && m.backup.sm && m.backup.h === 44 && m.backup.surface === 36 && m.backup.font === '12px',
    `perfil: respaldo 44/36 px y 12 px de letra (${m.backup ? m.backup.h + '/' + m.backup.surface + '/' + m.backup.font : 'sin botón'})`);
  check(m.backupFonts.length >= 3 && new Set([m.titleFont, ...m.backupFonts]).size === 3 && m.backupFonts.every(f => f === '14px' || f === '12px'),
    `perfil: respaldo en 3 tamanos (${[m.titleFont, ...new Set(m.backupFonts)].join('/')})`);
  check(!m.banner && m.backupWarn.includes('--warn') && m.oldClasses === 0,
    `perfil: aviso de respaldo en la linea de estado (${m.backupWarn || 'sin estado'})`);
  check(m.sectionSubs.lang && m.sectionSubs.topics && m.sectionSubs.backup && m.sectionSubs.notif,
    `perfil: ajustes con subtitulo (${Object.entries(m.sectionSubs).filter(([, v]) => v).map(([k]) => k).join('/')})`);
  check(!m.sectionSubs.data, 'perfil: secciones de datos sin subtitulo');
  await ctx.close();
}

// 1c · pares: mismas alturas y sin recorte también en anchos intermedios
for (const w of [800, 1024]) {
  const { ctx, pg } = await page('/progress/', w, 900);
  const m = await pg.evaluate(() => {
    const section = document.querySelector('.section-block');
    const cs = getComputedStyle(section);
    const sr = section.getBoundingClientRect();
    const content = sr.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      - parseFloat(cs.borderLeftWidth) - parseFloat(cs.borderRightWidth);
    const grid = document.querySelector('.lang-pair-grid');
    const cards = [...document.querySelectorAll('.lp-card')];
    const rects = cards.map(c => c.getBoundingClientRect());
    const labels = [...document.querySelectorAll('.ex-grid-th-label')].map(l => l.getBoundingClientRect());
    const wrapR = document.querySelector('.ex-matrix-wrap').getBoundingClientRect();
    return {
      gridW: Math.round(grid.getBoundingClientRect().width),
      content: Math.round(content),
      heights: [...new Set(rects.map(r => Math.round(r.height)))],
      nameOverflow: cards.flatMap(c => [...c.querySelectorAll('.lp-card__name')])
        .filter(n => n.scrollWidth > n.clientWidth + 1).length,
      arrowW: Math.round(cards[0].querySelector('.lp-card__arrow').getBoundingClientRect().width),
      labelOverlap: labels.slice(1).filter((r, i) => r.left < labels[i].right - 1).length,
      labelsFit: labels.length === 8 && labels[7].right <= wrapR.right - 6,
    };
  });
  check(m.gridW >= m.content - 1, `pares ${w}: rejilla ${m.gridW}/${m.content} px`);
  check(m.heights.length === 1, `pares ${w}: alturas iguales (${m.heights.join('/')})`);
  check(m.labelOverlap === 0, `matriz ${w}: etiquetas sin solape (${m.labelOverlap})`);
  if (w === 1024) check(m.labelsFit, 'matriz 1024: las 8 etiquetas caben sin scroll');
  check(m.nameOverflow === 0, `pares ${w}: nombres sin recorte (${m.nameOverflow})`);
  check(m.arrowW <= 16, `pares ${w}: flecha ${m.arrowW}px`);
  await ctx.close();
}

// 1d · matriz en pantalla dividida: el scroll horizontal cabe en el viewport
{
  const ctx = await browser.newContext({ viewport: { width: 900, height: 600 }, serviceWorkers: 'block' });
  await ctx.addInitScript(() => {
    localStorage.setItem('pe_onboarded', '1');
    localStorage.setItem('pe_active_pair', 'es-en');
  });
  const pg = await ctx.newPage();
  await pg.goto(`http://localhost:${PORT}/progress/`, { waitUntil: 'domcontentloaded' });
  await pg.waitForTimeout(1200);
  await pg.evaluate(() => {
    const wrap = document.querySelector('.ex-matrix-wrap');
    window.scrollTo(0, wrap.getBoundingClientRect().top + window.scrollY - 110);
  });
  await pg.waitForTimeout(300);
  const m = await pg.evaluate(() => {
    const wrap = document.querySelector('.ex-matrix-wrap');
    const r = wrap.getBoundingClientRect();
    return {
      bottom: Math.round(r.bottom),
      vh: innerHeight,
      maxH: getComputedStyle(wrap).maxHeight,
      scrollX: wrap.scrollWidth > wrap.clientWidth + 1,
    };
  });
  check(m.scrollX, 'matriz 900x600: conserva el scroll horizontal');
  check(m.bottom <= m.vh + 1, `matriz 900x600: scroll inferior visible (${m.bottom}/${m.vh}, max ${m.maxH})`);
  // La esquina vacia se queda con la columna de temas: las cabeceras pasan
  // debajo y siguen alineadas con su columna al desplazar en horizontal.
  await pg.evaluate(() => { const w = document.querySelector('.ex-matrix-wrap'); w.scrollLeft = w.scrollWidth; });
  await pg.waitForTimeout(200);
  const sc = await pg.evaluate(() => {
    const wrap = document.querySelector('.ex-matrix-wrap').getBoundingClientRect();
    const corner = document.querySelector('.ex-grid-corner').getBoundingClientRect();
    const th = [...document.querySelectorAll('.ex-grid-th')].map(e => Math.round(e.getBoundingClientRect().left));
    const row = [...document.querySelectorAll('.ex-grid-row')].find(r => !r.classList.contains('ex-grid-row--header'));
    const cells = [...row.querySelectorAll('.ex-grid-cell')].map(e => Math.round(e.getBoundingClientRect().left));
    return {
      cornerLeft: Math.round(corner.left), wrapLeft: Math.round(wrap.left),
      cornerH: Math.round(corner.height),
      misaligned: th.filter((x, i) => Math.abs(x - cells[i]) > 1).length,
    };
  });
  check(sc.cornerLeft === sc.wrapLeft && sc.cornerH > 0,
    `matriz 900x600: esquina fija con la columna de temas (${sc.cornerLeft}/${sc.wrapLeft}, ${sc.cornerH} px)`);
  check(sc.misaligned === 0, `matriz 900x600: cabeceras alineadas con sus columnas al hacer scroll (${sc.misaligned} desalineadas)`);
  await ctx.close();
}

// 2 · activity chart
{
  const { ctx, pg } = await page('/progress/', 1440, 900);
  const empty = await pg.evaluate(() => ({
    box: !!document.querySelector('.activity-empty'),
    text: (document.querySelector('.activity-empty p') || {}).textContent || '',
    legend: getComputedStyle(document.querySelector('.activity-legend')).display,
  }));
  check(empty.box, 'actividad: estado vacío sin sesiones');
  check(empty.text.trim().length > 0, 'actividad: mensaje del estado vacío');
  check(empty.legend === 'none', 'actividad: leyenda oculta sin datos');
  // Seed 60 daily sessions so the chart (not the empty state) is measured.
  await pg.evaluate(() => {
    const today = new Date();
    const sessions = [];
    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      sessions.push({ date: d.toLocaleDateString('sv'), topic: 'greetings', correct: 1, total: 1 });
    }
    localStorage.setItem('pe_progress__es-en', JSON.stringify({ _v: 3, cards: {}, _sessions: sessions }));
  });
  await pg.reload({ waitUntil: 'domcontentloaded' });
  await pg.waitForTimeout(1400);
  const m = await pg.evaluate(() => {
    const chart = document.querySelector('.activity-chart');
    if (!chart) return null;
    const bars = [...document.querySelectorAll('.activity-bar')];
    const host = chart.parentElement;
    return {
      width: Math.round(chart.getBoundingClientRect().width),
      host: Math.round(host.getBoundingClientRect().width),
      bars: bars.length,
      columns: getComputedStyle(document.querySelector('.activity-bars')).gridTemplateColumns.split(' ').length,
      labelled: bars.filter(b => b.getAttribute('aria-label')).length,
      months: document.querySelectorAll('.activity-month').length,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  check(!!m, 'gráfico de actividad presente');
  if (m) {
    check(m.width >= m.host - 2, `actividad: ${m.width}/${m.host} px de ancho`);
    check(m.bars === 60, `actividad: ${m.bars} barras (60 días)`);
    check(m.columns === 60, `actividad: ${m.columns} columnas CSS`);
    check(m.labelled === m.bars, `actividad: ${m.labelled}/${m.bars} con aria-label`);
    check(m.months >= 2, `actividad: ${m.months} etiquetas de mes`);
    check(!m.overflow, 'actividad: sin scroll horizontal');
  }
  await ctx.close();
}

// 3 · mi aprendizaje: rejilla a todo el ancho, pildoras en cada paso y capsulas intactas
{
  const { ctx, pg } = await page('/my-learning/', 1440, 900);
  const m = await pg.evaluate(() => {
    const trail = document.querySelector('.ml-trail');
    if (!trail) return { h: null };
    const section = document.getElementById('ml-trail-section');
    const nodes = [...document.querySelectorAll('.ml-snode')].map(e => e.getBoundingClientRect());
    let overlaps = 0;
    for (let i = 1; i < nodes.length; i++) {
      const a = nodes[i - 1], b = nodes[i];
      if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) overlaps++;
    }
    const t = trail.getBoundingClientRect();
    const cols = getComputedStyle(trail).gridTemplateColumns.split(' ').length;
    const topics = trail.querySelectorAll('.ml-snode__topic').length;
    const states = trail.querySelectorAll('.ml-snode__new-badge, .ml-snode__review-badge, .ml-snode__done-badge').length;
    // Ningun trazo puede cruzar una capsula de tema, una etiqueta o un chip.
    const targets = [...trail.querySelectorAll('.ml-snode__topic, .ml-snode__label, .ml-snode__new-badge, .ml-snode__review-badge, .ml-snode__done-badge')]
      .map(e => { const b = e.getBoundingClientRect(); return { l: b.left - t.left, r: b.right - t.left, t: b.top - t.top, b: b.bottom - t.top }; });
    const inside = (x, y) => targets.some(b => x >= b.l && x <= b.r && y >= b.t && y <= b.b);
    let crossings = 0;
    for (const s of trail.querySelectorAll('.ml-connector')) {
      let hit = false;
      if (s.tagName === 'line') {
        const x1 = +s.getAttribute('x1'), y1 = +s.getAttribute('y1');
        const x2 = +s.getAttribute('x2'), y2 = +s.getAttribute('y2');
        for (let k = 0; k <= 200; k++) {
          if (inside(x1 + (x2 - x1) * k / 200, y1 + (y2 - y1) * k / 200)) { hit = true; break; }
        }
      } else if (s.tagName === 'path') {
        const len = s.getTotalLength();
        for (let k = 0; k <= 300; k++) {
          const pt = s.getPointAtLength(len * k / 300);
          if (inside(pt.x, pt.y)) { hit = true; break; }
        }
      }
      if (hit) crossings++;
    }
    // La tarjeta de sesion lleva el mismo aire arriba (subtitulo) que abajo (ruta).
    const sub = document.querySelector('.page-header__sub').getBoundingClientRect();
    const card = document.querySelector('.ml-session-card').getBoundingClientRect();
    const wrap = document.querySelector('.ml-trail-wrap').getBoundingClientRect();
    // La racha va arriba a la derecha, sin pisar el titulo (se fuerza para medir).
    const streak = document.querySelector('.ml-streak');
    streak.hidden = false;
    streak.textContent = 'Racha de 1 día';
    const sr = streak.getBoundingClientRect();
    const h1 = document.querySelector('.ml-header h1').getBoundingClientRect();
    return {
      h: Math.round(t.height), nodes: nodes.length, overlaps, cols, topics, states, crossings,
      newStates: trail.querySelectorAll('.ml-snode__new-badge').length,
      activeState: !!trail.querySelector('.ml-snode--active .ml-snode__new-badge, .ml-snode--active .ml-snode__review-badge, .ml-snode--active .ml-snode__done-badge'),
      fill: section ? Math.round(t.width) / Math.round(section.getBoundingClientRect().width) : 0,
      gapAbove: Math.round(card.top - sub.bottom),
      gapBelow: Math.round(wrap.top - card.bottom),
      streakPos: getComputedStyle(streak).position,
      streakOverlap: sr.left < h1.right && h1.left < sr.right && sr.top < h1.bottom && h1.top < sr.bottom,
    };
  });
  check(m.nodes >= 8, `mi aprendizaje: ${m.nodes} nodos`);
  check(m.topics >= 1 && m.topics < m.nodes, `mi aprendizaje: ${m.topics}/${m.nodes} con pildora de tema (solo al cambiar)`);
  check(m.states >= 1 && m.newStates <= 1 && m.activeState,
    `mi aprendizaje: ${m.states}/${m.nodes} con estado, ${m.newStates} "Nuevo", activo ${m.activeState}`);
  check(m.cols >= 3, `mi aprendizaje: ${m.cols} columnas`);
  check(m.fill >= 0.98, `mi aprendizaje: ocupa el ${Math.round(m.fill * 100)}% del ancho`);
  check(m.h !== null && m.h <= 900, `mi aprendizaje: ruta de ${m.h}px (<=900)`);
  check(m.overlaps === 0, `mi aprendizaje: ${m.overlaps} solapes`);
  check(m.crossings === 0, `mi aprendizaje: ${m.crossings} trazos sobre capsulas`);
  check(Math.abs(m.gapAbove - m.gapBelow) <= 1,
    `mi aprendizaje: tarjeta de sesion simetrica (${m.gapAbove} arriba / ${m.gapBelow} abajo)`);
  check(m.streakPos === 'absolute' && !m.streakOverlap,
    `mi aprendizaje: racha arriba a la derecha (${m.streakPos}, solape ${m.streakOverlap})`);
  await ctx.close();
}

// 4 · alineacion de catalogos
{
  const tops = {};
  for (const [name, url] of [['grammar', '/grammar/'], ['cloze', '/cloze/']]) {
    const { ctx, pg } = await page(url, 1440, 900);
    tops[name] = await pg.evaluate(() => {
      const h = document.querySelector('h1, .page-header__title');
      return h ? Math.round(h.getBoundingClientRect().top) : null;
    });
    await ctx.close();
  }
  check(tops.grammar !== null && tops.cloze !== null && Math.abs(tops.grammar - tops.cloze) <= 2,
    `catalogos alineados: gramatica ${tops.grammar} vs cloze ${tops.cloze}`);
}

// 5 · objetivo tactil 44 (puntero grueso). Exentos: nav (11 destinos), skip-link,
//     enlaces en linea y el input oculto de importacion.
for (const [name, url] of [
  ['index', '/index.html'], ['speaking', '/speaking/'], ['dictation', '/dictation/'],
  ['cloze', '/cloze/'], ['translation', '/translation/'], ['scramble', '/scramble/'],
  ['vocabulary', '/vocabulary/'], ['quiz', '/quiz/'], ['grammar', '/grammar/'],
  ['my-learning', '/my-learning/'], ['progress', '/progress/'], ['placement', '/placement/'],
]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', hasTouch: true, isMobile: true });
  await ctx.addInitScript(() => localStorage.setItem('pe_active_pair', 'es-en'));
  const pg = await ctx.newPage();
  await ctx.route(/\.(onnx|wasm|bin)(\?|$)/i, r => r.abort());
  await pg.goto(`http://localhost:${PORT}${url}`, { waitUntil: 'domcontentloaded' });
  await pg.waitForTimeout(1200);
  const bad = await pg.evaluate(() => {
    const out = [];
    const sel = 'button, input:not([type=hidden]), select, textarea, a.btn, a.icon-btn, [role="button"]';
    for (const el of document.querySelectorAll(sel)) {
      if (el.closest('.visually-hidden') || el.classList.contains('visually-hidden')) continue;
      if (el.closest('.mode-switcher') || el.classList.contains('skip-link')) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      if (r.width < 43.5 || r.height < 43.5) {
        const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/)[0] : '';
        out.push((el.id ? '#' + el.id : el.tagName.toLowerCase()) + (cls ? '.' + cls : '') + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
      }
    }
    return out;
  });
  check(bad.length === 0, `objetivo 44 ${name}: ${bad.length ? bad.slice(0, 3).join(', ') : 'ok'}`);
  await ctx.close();
}

// 5b · botones: un solo tamano en todo el sitio (44 tactil / 36 superficie)
for (const [name, url] of [['index', '/index.html'], ['progress', '/progress/'], ['placement', '/placement/']]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  await ctx.addInitScript(() => {
    localStorage.setItem('pe_active_pair', 'es-en');
    localStorage.setItem('pe_onboarded', '1');
  });
  const pg = await ctx.newPage();
  await pg.goto(`http://localhost:${PORT}${url}`, { waitUntil: 'domcontentloaded' });
  await pg.waitForTimeout(1200);
  const m = await pg.evaluate(() => {
    const btns = [...document.querySelectorAll('.btn')].filter(b => {
      const r = b.getBoundingClientRect();
      return r.height > 0 && getComputedStyle(b).visibility !== 'hidden';
    });
    const surface = b => {
      const ps = getComputedStyle(b, '::before');
      return Math.round(b.getBoundingClientRect().height - parseFloat(ps.top) - parseFloat(ps.bottom));
    };
    return {
      n: btns.length,
      sizes: [...new Set(btns.map(b => Math.round(b.getBoundingClientRect().height)))],
      surfaces: [...new Set(btns.map(surface))],
      fonts: [...new Set(btns.map(b => getComputedStyle(b).fontSize))].sort(),
    };
  });
  check(m.n > 0 && m.sizes.length === 1 && m.sizes[0] === 44, `botones ${name}: objetivo ${m.sizes.join('/')} px`);
  check(m.surfaces.length === 1 && m.surfaces[0] === 36, `botones ${name}: superficie ${m.surfaces.join('/')} px`);
  check(m.fonts.every(f => f === '14px' || f === '12px'), `botones ${name}: letra ${m.fonts.join('/')}`);

  if (name === 'index') {
    const readCta = () => pg.evaluate(() => {
      const b = document.querySelector('.path-cta__btn');
      const ps = getComputedStyle(b, '::before');
      return {
        h: Math.round(b.getBoundingClientRect().height),
        surface: Math.round(b.getBoundingClientRect().height - parseFloat(ps.top) - parseFloat(ps.bottom)),
        bg: getComputedStyle(b).backgroundColor,
      };
    });
    const before = await readCta();
    await pg.hover('.path-cta__btn');
    await pg.waitForTimeout(300);
    const after = await readCta();
    check(after.h === before.h && after.surface === before.surface && after.bg === 'rgba(0, 0, 0, 0)',
      `botones index hover: ${before.h}/${before.surface} -> ${after.h}/${after.surface} (${after.bg})`);
  }
  await ctx.close();
}

// 6 · index: tarjetas parejas y ruta paginada
for (const w of [1440, 768, 390]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w === 390 ? 844 : 900 }, serviceWorkers: 'block' });
  await ctx.addInitScript(() => {
    localStorage.setItem('pe_active_pair', 'es-en');
    localStorage.setItem('pe_onboarded', '1');
  });
  const pg = await ctx.newPage();
  await ctx.route(/\.(onnx|wasm|bin)(\?|$)/i, r => r.abort());
  await pg.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
  await pg.waitForTimeout(1400);
  await pg.evaluate(() => document.fonts && document.fonts.ready);
  // Medir con las animaciones terminadas: a media entrada la tarjeta mide distinto.
  await pg.evaluate(() => document.getAnimations().forEach(a => a.finish()));
  // La pagina aplica i18n y fuentes en varios pasos; un respiro evita medir el
  // estado intermedio (una descripcion mas larga que luego se sustituye).
  await pg.waitForTimeout(400);
  const readCards = () => pg.evaluate(() =>
    [...document.querySelectorAll('.card--feature')].map(c => ({
      h: Math.round(c.getBoundingClientRect().height),
    })));
  // La pagina aplica i18n y fuentes despues del DOMContentLoaded: medir solo
  // cuando las alturas llevan tres lecturas seguidas iguales.
  let cards = await readCards();
  let stableRuns = 0;
  for (let k = 0; k < 10; k++) {
    await pg.waitForTimeout(150);
    const next = await readCards();
    const stable = next.length === cards.length && next.every((c, j) => c.h === cards[j].h);
    cards = next;
    stableRuns = stable ? stableRuns + 1 : 0;
    if (stableRuns >= 2) break;
  }
  await pg.waitForTimeout(150);
  cards = await readCards();
  const hs = cards.map(c => c.h);
  // La mas alta manda en las ocho, no solo dentro de su grupo.
  const even = hs.length === 8 && Math.max(...hs) - Math.min(...hs) <= 1;
  check(even,
    `index ${w}: 8 tarjetas parejas entre grupos (${Math.min(...hs)}-${Math.max(...hs)})`);
  const ringGap = await pg.evaluate(() => {
    const pill = document.querySelector('.path-node--active .path-node__topic');
    const bubble = document.querySelector('.path-node--active .path-node__bubble');
    return pill && bubble ? +(bubble.getBoundingClientRect().top - pill.getBoundingClientRect().bottom).toFixed(1) : null;
  });
  check(ringGap !== null && ringGap >= 9, `index ${w}: el anillo no toca la etiqueta (${ringGap}px)`);
  await ctx.close();
}

// 6b · index: teclado alcanza las 8 tarjetas con foco visible
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  await ctx.addInitScript(() => {
    localStorage.setItem('pe_active_pair', 'es-en');
    localStorage.setItem('pe_onboarded', '1');
  });
  const pg = await ctx.newPage();
  await ctx.route(/\.(onnx|wasm|bin)(\?|$)/i, r => r.abort());
  await pg.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
  await pg.waitForTimeout(1200);
  const seen = new Set();
  let ringOk = true;
  for (let i = 0; i < 90 && seen.size < 8; i++) {
    await pg.keyboard.press('Tab');
    const r = await pg.evaluate(() => {
      const el = document.activeElement;
      if (!el || !el.classList || !el.classList.contains('feature-card-link')) return null;
      const cs = getComputedStyle(el);
      return {
        href: el.getAttribute('href'),
        ok: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2,
      };
    });
    if (r) { seen.add(r.href); if (!r.ok) ringOk = false; }
  }
  check(seen.size === 8, `teclado index: ${seen.size}/8 tarjetas alcanzables`);
  check(ringOk, 'teclado index: foco visible en las tarjetas');
  await ctx.close();
}

// 7 · index: la ruta pagina sin perder el paso actual
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  await ctx.addInitScript(() => {
    localStorage.setItem('pe_active_pair', 'es-en');
    localStorage.setItem('pe_onboarded', '1');
  });
  const pg = await ctx.newPage();
  await ctx.route(/\.(onnx|wasm|bin)(\?|$)/i, r => r.abort());
  await pg.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
  await pg.waitForTimeout(1400);

  const read = () => pg.evaluate(() => {
    const trail = document.querySelector('.path-trail');
    const nodesBox = document.getElementById('path-nodes').getBoundingClientRect();
    const bottom = Math.max(
      ...[...trail.querySelectorAll('.path-node__label')].map(e => e.getBoundingClientRect().bottom),
      ...[...trail.querySelectorAll('.path-node__new-badge, .path-node__review-badge, .path-node__done-badge')].map(e => e.getBoundingClientRect().bottom),
    );
    const pins = [...trail.querySelectorAll('.path-node__topic')].map(e => e.getBoundingClientRect().top);
    // Distance from each circle edge to the connector endpoint (0 = attached).
    const t = trail.getBoundingClientRect();
    const bubbles = [...trail.querySelectorAll('.path-node__bubble')].map(e => {
      const r = e.getBoundingClientRect();
      return { cx: r.left + r.width / 2 - t.left, cy: r.top + r.height / 2 - t.top, r: r.width / 2 };
    });
    const attach = [...trail.querySelectorAll('.path-connectors line')].map((l, i) => {
      const a = bubbles[i], b = bubbles[i + 1];
      const d1 = Math.hypot(+l.getAttribute('x1') - a.cx, +l.getAttribute('y1') - a.cy) - a.r;
      const d2 = Math.hypot(+l.getAttribute('x2') - b.cx, +l.getAttribute('y2') - b.cy) - b.r;
      return Math.max(Math.abs(d1), Math.abs(d2));
    });
    return {
      pager: !(document.getElementById('path-pager') || {}).hidden,
      status: (document.getElementById('path-page-status') || {}).textContent || '',
      role: (document.getElementById('path-page-status') || {}).getAttribute?.('role'),
      left: document.getElementById('path-scroll-left')?.getAttribute('aria-label'),
      right: document.getElementById('path-scroll-right')?.getAttribute('aria-label'),
      attachWorst: attach.length ? Math.max(...attach) : 0,
      gapTop: pins[0] - nodesBox.top,
      gapBottom: document.getElementById('path-pager').getBoundingClientRect().top - bottom,
      nodes: trail.querySelectorAll('.path-node').length,
      pills: trail.querySelectorAll('.path-node__topic').length,
      states: trail.querySelectorAll('.path-node__new-badge, .path-node__review-badge, .path-node__done-badge').length,
      newStates: trail.querySelectorAll('.path-node__new-badge').length,
      activeState: !!trail.querySelector('.path-node--active .path-node__new-badge, .path-node--active .path-node__review-badge, .path-node--active .path-node__done-badge'),
    };
  });

  const first = await read();
  const total = (first.status.match(/de (\d+)$/) || [])[1];
  check(first.pager && /^Pasos 1-5 de \d+$/.test(first.status), `ruta: indicador "${first.status}"`);
  check(first.role === 'status', 'ruta: indicador en role=status');
  check(first.pills >= 1 && first.pills < first.nodes, `ruta: ${first.pills}/${first.nodes} con pildora de tema (solo al cambiar)`);
  check(first.states >= 1 && first.newStates <= 1 && first.activeState,
    `ruta: ${first.states}/${first.nodes} con estado, ${first.newStates} "Nuevo", activo ${first.activeState}`);
  check(first.left === 'Actividades anteriores' && first.right === 'Actividades siguientes',
    `ruta: flechas "${first.left}" / "${first.right}"`);
  check(first.attachWorst <= 1, `ruta: conectores pegados al circulo (${first.attachWorst.toFixed(2)}px)`);
  check(Math.abs(first.gapTop - first.gapBottom) <= 2,
    `ruta: aire arriba/abajo igual (${first.gapTop.toFixed(1)}/${first.gapBottom.toFixed(1)})`);

  await pg.click('#path-scroll-right');
  await pg.waitForTimeout(400);
  const next = await read();
  const page2 = next.status.match(/^Pasos (\d+)-(\d+) de (\d+)$/);
  check(!!page2 && +page2[1] === 6 && +page2[2] === Math.min(10, +total) && +page2[3] === +total,
    `ruta: pagina siguiente "${next.status}"`);

  await pg.click('#path-scroll-left');
  await pg.waitForTimeout(400);
  const back = await read();
  const page1 = back.status.match(/^Pasos (\d+)-(\d+) de (\d+)$/);
  check(!!page1 && +page1[1] === 1 && +page1[2] === Math.min(5, +total),
    `ruta: pagina anterior "${back.status}"`);
  await ctx.close();
}

// 7b · landing: el aire bajo el header y sobre el footer son el mismo
for (const w of [1966, 1440, 1024, 900, 768, 480, 390]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, serviceWorkers: 'block' });
  await ctx.addInitScript(() => {
    localStorage.setItem('pe_active_pair', 'es-en');
    localStorage.setItem('pe_onboarded', '1');
  });
  const pg = await ctx.newPage();
  await ctx.route(/\.(onnx|wasm|bin)(\?|$)/i, r => r.abort());
  await pg.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
  await pg.waitForTimeout(1000);
  const g = await pg.evaluate(() => {
    const hb = document.querySelector('header').getBoundingClientRect().bottom;
    const title = document.querySelector('.hero-title').getBoundingClientRect();
    const lastCard = [...document.querySelectorAll('.card--feature')].pop().getBoundingClientRect();
    const footer = document.querySelector('footer').getBoundingClientRect();
    return {
      top: +(title.top - hb).toFixed(1),
      bottom: +(footer.top - lastCard.bottom).toFixed(1),
    };
  });
  check(Math.abs(g.top - g.bottom) <= 2, `landing ${w}: aire arriba/abajo ${g.top}/${g.bottom}`);
  await ctx.close();
}

// 8 · nav: una sola fila, 44 px por destino y sin recorte, de 320 a 1966.
//     El modo compacto puede perder etiquetas, nunca destinos ni alto.
for (const [name, url] of [['progress', '/progress/'], ['cloze', '/cloze/']]) {
  for (const w of [1966, 1456, 1024, 768, 390, 320]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, serviceWorkers: 'block' });
    await ctx.addInitScript(() => {
      localStorage.setItem('pe_active_pair', 'es-en');
      localStorage.setItem('pe_onboarded', '1');
    });
    const pg = await ctx.newPage();
    await ctx.route(/\.(onnx|wasm|bin)(\?|$)/i, r => r.abort());
    await pg.goto(`http://localhost:${PORT}${url}`, { waitUntil: 'domcontentloaded' });
    await pg.waitForTimeout(900);
    const m = await pg.evaluate(() => {
      const nav = document.querySelector('.mode-switcher');
      const visible = [...nav.querySelectorAll('.nav-item')].filter(e => getComputedStyle(e).display !== 'none');
      const box = e => e.getBoundingClientRect();
      const active = nav.querySelector('.nav-item--active, .nav-item--active-path');
      const inset = active ? parseFloat(getComputedStyle(active, '::before').top) || 0 : 0;
      return {
        h: Math.round(box(nav).height),
        itemH: Math.round(box(visible[0]).height),
        rows: new Set(visible.map(e => Math.round(box(e).top / 4))).size,
        font: parseFloat(getComputedStyle(visible[0]).fontSize),
        pillH: active ? Math.round(box(active).height) - 2 * inset : 0,
        sw: nav.scrollWidth,
        cw: nav.clientWidth,
      };
    });
    check(m.rows === 1 && m.h >= 52 && m.itemH >= 39.5 && m.font <= 12.5 && m.pillH <= 36 && m.sw <= m.cw + 1,
      `nav ${name} ${w}: fila ${m.rows}, ${m.h}px, item ${m.itemH}px, texto ${m.font}px, pildora ${m.pillH}px, ${m.sw}/${m.cw}`);
    await ctx.close();
  }
}

// 10 · activity accents: one shared mapping, pages only declare data-activity
for (const page of ['speaking', 'dictation', 'cloze', 'translation', 'scramble', 'vocabulary', 'quiz', 'grammar']) {
  const html = fs.readFileSync(path.join(ROOT, page, 'index.html'), 'utf8');
  check(new RegExp('<body[^>]*data-activity="' + page + '"').test(html), `acento ${page}: data-activity`);
  check(!html.includes('--activity-clr'), `acento ${page}: sin estilo inline`);
}
check(fs.readFileSync(path.join(ROOT, 'shared/css/components.css'), 'utf8').includes('[data-activity="speaking"]'),
  'acentos: mapeo único en components.css');

// 11 · typography: every heading has a role; representative roles are enforced
{
  const pageFiles = ['index.html', 'speaking/index.html', 'dictation/index.html', 'cloze/index.html',
    'translation/index.html', 'scramble/index.html', 'vocabulary/index.html', 'quiz/index.html',
    'grammar/index.html', 'my-learning/index.html', 'progress/index.html', 'placement/index.html'];
  const h2Roles = ['section-heading', 'section-title', 'screen-title', 'dialog-title', 'ob-title'];
  for (const rel of pageFiles) {
    const html = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const h1s = html.match(/<h1\b[^>]*>/g) || [];
    const h2s = html.match(/<h2\b[^>]*>/g) || [];
    if (rel === 'index.html') check(h1s.length === 1 && h1s[0].includes('hero-title'), 'tipo portada: hero-title');
    else check(h1s.length > 0 && h1s.every(t => t.includes('page-header__title')), `tipo ${rel}: h1 page-header__title`);
    check(h2s.every(t => h2Roles.some(c => t.includes(c))), `tipo ${rel}: h2 con rol`);
  }

  const typeChecks = [
    ['/speaking/', [['.page-header__title', '38.4px', '600', '44.16px'], ['.page-header__sub', '16px', '400', '25.6px'], ['.img-topic-card__title', '14px', '500', '21.7px'], ['.exercise-prompt', '30.4px', '500', '38px'], ['.exercise-sub', '16px', '400', '25.6px']]],
    ['/cloze/', [['.exercise-prompt', '30.4px', '500', '38px'], ['.exercise-sub', '16px', '400', '25.6px']]],
    ['/translation/', [['.exercise-sub', '16px', '400', '25.6px']]],
    ['/quiz/', [['.exercise-prompt', '30.4px', '500', '38px']]],
    ['/vocabulary/', [['.word-text', '30.4px', '500', '38px']]],
    ['/scramble/', [['.exercise-sub', '16px', '400', '25.6px']]],
    ['/progress/', [['.page-header__title', '38.4px', '600', '44.16px'], ['.page-header__sub', '16px', '400', '25.6px'], ['.section-title', '20px', '500', '26px'], ['.btn--sm', '12px', '500', '16.8px'], ['.stat-value', '32px', '600', '32px'], ['.stat-label', '12px', '600', '16.8px'], ['.ex-grid-th-label', '12px', '500', '16.8px']]],
    ['/my-learning/', [['.page-header__title', '38.4px', '600', '44.16px'], ['.ml-snode__label', '12px', '500', '16.8px']]],
    ['/', [['.section-heading', '30.4px', '500', '38px'], ['.section-subheading', '14px', '400', '21.7px'], ['.card__title', '16px', '600', '25.6px'], ['.ob-title', '30.4px', '500', '38px'], ['.group-badge', '20px', '500', '26px'], ['.path-node__label', '12px', '500', '16.8px']]],
    ['/grammar/', [['.img-topic-card__title', '14px', '500', '21.7px'], ['.screen-title', '30.4px', '500', '38px']]],
    ['/placement/', [['.page-header__title', '38.4px', '600', '44.16px'], ['.screen-title', '30.4px', '500', '38px']]],
  ];
  for (const [route, list] of typeChecks) {
    const { ctx, pg } = await page(route, 1440, 900);
    const m = await pg.evaluate(sels => {
      const out = {};
      for (const sel of sels) {
        const el = document.querySelector(sel);
        if (!el) { out[sel] = null; continue; }
        const s = getComputedStyle(el);
        out[sel] = { size: s.fontSize, weight: s.fontWeight, lh: s.lineHeight };
      }
      return out;
    }, list.map(x => x[0]));
    for (const [sel, size, weight, lh] of list) {
      const v = m[sel];
      check(!!v && v.size === size && v.weight === weight && v.lh === lh,
        `tipo ${route} ${sel}: ${v ? v.size + '/' + v.weight + '/' + v.lh : 'ausente'} (esperado ${size}/${weight}/${lh})`);
    }
    await ctx.close();
  }
}

// 11b · grammar category picker: same topic-card shell, icon panel, counter
{
  const { ctx, pg } = await page('/grammar/', 1440, 900);
  const m = await pg.evaluate(() => {
    const cards = [...document.querySelectorAll('#category-grid .img-topic-card')];
    const media = cards.map(c => c.querySelector('.img-topic-card__img-wrap'));
    return {
      n: cards.length,
      withMedia: media.filter(Boolean).length,
      withProgress: cards.filter(c => ((c.querySelector('.img-topic-card__progress') || {}).textContent || '').trim()).length,
      withIcon: cards.filter(c => c.querySelector('.category-icon .icon')).length,
      ratio: media[0] ? +(media[0].getBoundingClientRect().width / media[0].getBoundingClientRect().height).toFixed(2) : 0,
    };
  });
  check(m.n >= 8 && m.withMedia === m.n && m.withIcon === m.n, `gramatica: ${m.n} tarjetas con panel e icono`);
  check(m.withProgress === m.n, `gramatica: ${m.withProgress}/${m.n} con contador`);
  check(Math.abs(m.ratio - 16 / 9) < 0.1, `gramatica: panel 16:9 (${m.ratio})`);
  await ctx.close();
}

// 11b2 · gramatica: la pantalla de ejercicio entra con todos sus bloques animados
{
  const { ctx, pg } = await page('/grammar/', 1280, 900);
  await pg.evaluate(() => document.querySelector('#category-grid .img-topic-card').click());
  await pg.waitForTimeout(700);
  await pg.evaluate(() => document.querySelector('#rule-list .rule-row').click());
  await pg.waitForTimeout(900);
  const noAnim = await pg.evaluate(() => {
    const screen = document.getElementById('screen-exercise');
    return [...screen.children].filter(el => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.animationName === 'none';
    }).map(el => (el.className || el.tagName).split(/\s+/)[0]);
  });
  check(noAnim.length === 0, `gramatica ejercicio: bloques animados (${noAnim.join(', ') || 'ok'})`);
  await ctx.close();
}

// 11b3 · gramatica resultados: cierre compacto y frases de practica uniformes
{
  const { ctx, pg } = await page('/grammar/', 1280, 900);
  await pg.evaluate(() => document.querySelector('#category-grid .img-topic-card').click());
  await pg.waitForTimeout(400);
  await pg.evaluate(() => document.querySelector('#rule-list .rule-row').click());
  await pg.waitForTimeout(700);
  await pg.evaluate(() => { prodCorrect = 3; goToPhase(6); });
  await pg.waitForTimeout(800);
  const m = await pg.evaluate(() => {
    const card = document.getElementById('complete-card').getBoundingClientRect();
    const btn = document.getElementById('rate-auto').getBoundingClientRect();
    const items = [...document.querySelectorAll('.related-phrase-item')];
    const sub = document.querySelector('.related-sub');
    return {
      cardW: Math.round(card.width), btnW: Math.round(btn.width),
      hs: items.map(i => Math.round(i.getBoundingClientRect().height)),
      tops: items.map(i => Math.round(i.querySelector('.related-activity-links').getBoundingClientRect().top)),
      dotsDone: document.querySelectorAll('.phase-dot--done').length,
      sub: !!(sub && sub.textContent.trim()),
      fill: getComputedStyle(document.getElementById('complete-progress')).transform,
    };
  });
  check(m.dotsDone === 6, `gramatica resultados: 6 fases cerradas (${m.dotsDone})`);
  check(m.btnW < m.cardW * 0.6, `gramatica resultados: CTA compacta (${m.btnW}/${m.cardW})`);
  check(new Set(m.hs).size === 1, `gramatica resultados: frases iguales (${m.hs.join('/')})`);
  check(new Set(m.tops).size === 1, `gramatica resultados: acciones alineadas (${m.tops.join('/')})`);
  check(m.sub, 'gramatica resultados: subtitulo de practica');
  check(m.fill === 'matrix(0.6, 0, 0, 1, 0, 0)', `gramatica resultados: barra al 60% (${m.fill})`);
  await ctx.close();
}

// 11b4 · gramatica: acierto/fallo con el aviso estandar (borde completo, sin barra)
{
  const { ctx, pg } = await page('/grammar/', 1280, 900);
  await pg.evaluate(() => document.querySelector('#category-grid .img-topic-card').click());
  await pg.waitForTimeout(400);
  await pg.evaluate(() => document.querySelector('#rule-list .rule-row').click());
  await pg.waitForTimeout(700);
  await pg.evaluate(() => goToPhase(3));
  await pg.waitForTimeout(500);
  await pg.evaluate(() => {
    const opts = [...document.querySelectorAll('.option-btn')];
    (opts.find(o => o.dataset.correct !== 'true') || opts[0]).click();
  });
  await pg.waitForTimeout(500);
  await pg.evaluate(() => goToPhase(4));
  await pg.waitForTimeout(500);
  await pg.evaluate(() => {
    const inp = document.querySelector('.production-input');
    inp.value = 'zzz';
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await pg.click('.production-next-btn');
  await pg.waitForTimeout(500);
  const m = await pg.evaluate(() => {
    const read = el => {
      const cs = getComputedStyle(el);
      return {
        cls: el.className,
        top: cs.borderTopWidth, left: cs.borderLeftWidth,
        topColor: cs.borderTopColor, leftColor: cs.borderLeftColor,
        bg: cs.backgroundColor,
        verdict: !!el.querySelector('.feedback-result.incorrect'),
      };
    };
    return { s: read(document.querySelector('.structured-feedback')), p: read(document.querySelector('.production-feedback')) };
  });
  for (const [name, f] of [['structured', m.s], ['production', m.p]]) {
    check(f.top === '1px' && f.left === '1px' && f.topColor === f.leftColor && f.verdict,
      `gramatica ${name}: aviso estandar sin barra (${f.top}/${f.left}, ${f.topColor})`);
    check(f.bg !== 'rgba(0, 0, 0, 0)', `gramatica ${name}: superficie de feedback (${f.bg})`);
  }
  await ctx.close();
}

// 11b5 · gramatica expresion: la accion principal existe desde el inicio y el
// ejemplo es apoyo (se abre tras producir, sin bloquear la edicion)
{
  const { ctx, pg } = await page('/grammar/', 1280, 900);
  await pg.evaluate(() => document.querySelector('#category-grid .img-topic-card').click());
  await pg.waitForTimeout(400);
  await pg.evaluate(() => document.querySelector('#rule-list .rule-row').click());
  await pg.waitForTimeout(700);
  await pg.evaluate(() => goToPhase(5));
  await pg.waitForTimeout(600);
  const read = () => pg.evaluate(() => ({
    next: document.querySelector('.express-next-btn')?.disabled,
    nextN: document.querySelectorAll('.express-next-btn').length,
    show: document.querySelector('.express-model-btn')?.disabled,
    model: !!document.querySelector('.express-model'),
    readOnly: document.querySelector('.express-input')?.readOnly,
  }));
  const a = await read();
  await pg.fill('.express-input', 'I saw a cat');
  const b = await read();
  await pg.click('.express-model-btn');
  await pg.waitForTimeout(400);
  const c = await read();
  await pg.fill('.express-input', 'I');
  const d = await read();
  check(a.next === true && a.show === true && !a.model && a.nextN === 1,
    `gramatica expresion: CTA visible y bloqueada al inicio (${a.next}/${a.show}/${a.nextN})`);
  check(b.next === false && b.show === false,
    `gramatica expresion: producir habilita CTA y ejemplo (${b.next}/${b.show})`);
  check(c.model && c.show === true && c.readOnly === false && c.next === false,
    `gramatica expresion: ejemplo como apoyo, campo editable (${c.model}/${c.show}/${c.readOnly})`);
  check(d.next === true, 'gramatica expresion: borrar la produccion vuelve a bloquear');
  await ctx.close();
}

// 11c · indice de frases: un solo montaje, sin animacion de entrada
{
  const { ctx, pg } = await page('/cloze/', 1440, 900);
  const card = await pg.$('.img-topic-card');
  if (card) { await card.click(); await pg.waitForTimeout(600); }
  const m = await pg.evaluate(() => {
    const s = document.getElementById('pb-section');
    const chips = s ? [...s.querySelectorAll('.pb-chip')] : [];
    return {
      n: document.querySelectorAll('#pb-section').length,
      anim: s ? getComputedStyle(s).animationName : null,
      chips: chips.length,
      chipHeights: [...new Set(chips.map(c => Math.round(c.getBoundingClientRect().height)))],
    };
  });
  check(!!card && m.n === 1 && m.anim === 'none' && m.chips > 0,
    `indice: 1 montaje, sin fade (${m.n}/${m.anim}/${m.chips})`);
  check(m.chipHeights.length === 1,
    `indice: tarjetas uniformes (${m.chipHeights.join('/')} px)`);
  await ctx.close();
}

// 11d · speaking: filas de accion, colores y alerta compacta
{
  const { ctx, pg } = await page('/speaking/', 1440, 900);
  await pg.evaluate(() => document.querySelector('.img-topic-card').click());
  await pg.waitForTimeout(500);
  await pg.evaluate(() => document.querySelector('.pb-chip').click());
  await pg.waitForTimeout(500);
  await pg.evaluate(() => window._onSttError('Error de prueba'));
  await pg.waitForTimeout(600);   // deja terminar el fadeIn: medir a media animacion infla el hueco
  const m = await pg.evaluate(() => {
    const fb = document.getElementById('speaking-feedback');
    const head = fb.querySelector('.feedback-result');
    const diff = document.getElementById('speaking-diff');
    const fbR = fb.getBoundingClientRect();
    const audio = document.querySelector('.actions-row').getBoundingClientRect();
    const footer = document.getElementById('action-row').getBoundingClientRect();
    const main = document.querySelector('main');
    const pseudo = sel => getComputedStyle(document.querySelector(sel), '::before').backgroundColor;
    return {
      fbH: Math.round(fbR.height),
      pad: getComputedStyle(fb).padding,
      head: getComputedStyle(head).fontSize + '/' + getComputedStyle(head).fontWeight,
      body: getComputedStyle(diff).fontSize,
      icon: !!head.querySelector('.icon'),
      audioW: Math.round(audio.width),
      footerW: Math.round(footer.width),
      gapAbove: Math.round(fbR.top - audio.bottom),
      gapBelow: Math.round(footer.top - fbR.bottom),
      gapFooter: Math.round(document.querySelector('footer').getBoundingClientRect().top - footer.bottom),
      padBottom: Math.round(parseFloat(getComputedStyle(main).paddingBottom)),
      colors: {
        listen: pseudo('#listenButton'),
        speak: pseudo('#speakButton'),
        next: pseudo('#tryAnotherButton'),
        retry: getComputedStyle(document.querySelector('#tryAgainButton')).color,
      },
      icons: {
        listen: document.querySelector('#listenButton .icon use').getAttribute('href'),
        speak: document.querySelector('#speakButton .icon use').getAttribute('href'),
      },
      labels: {
        listen: (document.querySelector('#listenButton .btn-label') || {}).textContent || '',
        speak: (document.querySelector('#speakButton .btn-label') || {}).textContent || '',
      },
    };
  });
  check(m.fbH <= 100 && m.pad === '12px 16px', `speaking alerta: ${m.fbH}px, ${m.pad}`);
  check(m.head === '14px/600' && m.body === '14px' && m.icon, `speaking alerta: ${m.head}/${m.body}, icono ${m.icon}`);
  check(m.audioW === m.footerW, `speaking acciones: ${m.audioW}/${m.footerW} px`);
  check(m.gapAbove >= 8 && m.gapAbove <= 16 && m.gapBelow >= 8,
    `speaking aire: ${m.gapAbove}/${m.gapBelow} px`);
  check(m.gapFooter === m.padBottom,
    `speaking acciones al footer: ${m.gapFooter}px (${m.padBottom})`);
  check(m.colors.listen === 'rgb(250, 251, 252)' && m.colors.speak === 'rgb(37, 99, 235)'
    && m.colors.next === 'rgb(22, 101, 52)' && m.colors.retry === 'rgb(180, 83, 9)',
    `speaking colores: ${Object.values(m.colors).join(' / ')}`);
  check(m.icons.listen === '#i-volume-2' && m.icons.speak === '#i-mic',
    `speaking iconos: ${m.icons.listen}/${m.icons.speak}`);
  check(m.labels.listen.trim() && m.labels.speak.trim(), `speaking etiquetas: ${m.labels.listen}/${m.labels.speak}`);
  // Tras un "no entendido", el siguiente intento incorrecto debe volver a mostrar el diff.
  await pg.evaluate(() => window._showNotUnderstood());
  await pg.waitForTimeout(200);
  await pg.evaluate(() => window.displayResult('hola mundo', 0.5));
  await pg.waitForTimeout(300);
  const diff = await pg.evaluate(() => {
    const d = document.getElementById('speaking-diff');
    return { hidden: d.classList.contains('hidden'), h: Math.round(d.getBoundingClientRect().height) };
  });
  check(!diff.hidden && diff.h > 0,
    `speaking: diff visible tras no-entendido + incorrecto (${diff.hidden}/${diff.h})`);
  // La "Respuesta Correcta" debe ser la variante que se esta practicando.
  const variant = await pg.evaluate(() => {
    const phrase = document.getElementById('Phrase').textContent.trim();
    const rows = document.querySelectorAll('#speaking-diff .uf-diff-row');
    const last = rows[rows.length - 1];
    const shown = last
      ? [...last.querySelectorAll('.uf-words span')].map(s => s.textContent).join(' ').trim()
      : '';
    const n = s => AppText.normaliseSpeech(s, {});
    return { phrase, shown, same: n(phrase) === n(shown) };
  });
  check(variant.same,
    `speaking: correcta = variante practicada ("${variant.phrase}" vs "${variant.shown}")`);
  await ctx.close();
}

// 11e · volver a temas: la barra y las acciones quedan a un relleno fijo (Cloze)
{
  const { ctx, pg } = await page('/cloze/', 1440, 900);
  await pg.evaluate(() => document.querySelector('.img-topic-card').click());
  await pg.waitForTimeout(500);
  await pg.evaluate(() => document.querySelector('.pb-chip').click());
  await pg.waitForTimeout(500);
  const m = await pg.evaluate(() => {
    const main = document.querySelector('main');
    const cs = getComputedStyle(main);
    const bar = document.querySelector('#exercise-area .session-info-bar').getBoundingClientRect();
    const input = document.querySelector('#cloze-input');
    const btn = document.querySelector('#check-btn');
    const ps = getComputedStyle(btn, '::before');
    return {
      barGap: Math.round(bar.top - main.getBoundingClientRect().top),
      padTop: Math.round(parseFloat(cs.paddingTop)),
      inputH: Math.round(input.getBoundingClientRect().height),
      btnH: Math.round(btn.getBoundingClientRect().height),
      // superficie pintada: el input pinta su padding-box, el boton su ::before
      inputSurface: input.clientHeight,
      btnSurface: Math.round(btn.getBoundingClientRect().height - parseFloat(ps.top) - parseFloat(ps.bottom)),
      inputFont: getComputedStyle(input).fontSize,
      btnFont: getComputedStyle(btn).fontSize,
    };
  });
  check(m.barGap === m.padTop, `cloze barra al header: ${m.barGap}px (${m.padTop})`);
  check(m.inputH === 44 && m.btnH === 44, `cloze controles: ${m.inputH}/${m.btnH} px`);
  check(m.inputFont === m.btnFont, `cloze letra: campo y boton iguales (${m.inputFont}/${m.btnFont})`);
  check(m.inputSurface === m.btnSurface,
    `cloze superficie: input y verificar iguales (${m.inputSurface}/${m.btnSurface} px)`);
  await ctx.close();
}

// 11e0 · actividades: superficie centrada y sin scroll de pagina
for (const [name, url, w, h, sel] of [
  ['pronunciacion', '/speaking/', 1440, 900, '#exercise-area'],
  ['pronunciacion', '/speaking/', 1280, 800, '#exercise-area'],
  ['dictado', '/dictation/', 1280, 800, '#exercise-area'],
  ['cloze', '/cloze/', 1280, 800, '#exercise-area'],
  ['traduccion', '/translation/', 1280, 800, '#exercise-area'],
  ['secuencia', '/scramble/', 1280, 800, '#exercise-area'],
  ['quiz', '/quiz/', 1280, 800, '#quiz-content'],
  ['vocabulario', '/vocabulary/', 1280, 800, '#vocab-content'],
  ['quiz', '/quiz/', 390, 844, '#quiz-content'],
  ['vocabulario', '/vocabulary/', 390, 844, '#vocab-content'],
  // Cuarto de pantalla (960x540): modo compacto sin scroll (auditoria 8 nov 2026).
  ['pronunciacion', '/speaking/', 960, 540, '#exercise-area'],
  ['dictado', '/dictation/', 960, 540, '#exercise-area'],
  ['cloze', '/cloze/', 960, 540, '#exercise-area'],
  ['traduccion', '/translation/', 960, 540, '#exercise-area'],
  ['secuencia', '/scramble/', 960, 540, '#exercise-area'],
  ['vocabulario', '/vocabulary/', 960, 540, '#vocab-content'],
  ['quiz', '/quiz/', 960, 540, '#quiz-content'],
  ['pronunciacion', '/speaking/', 390, 844, '#exercise-area'],
  ['dictado', '/dictation/', 390, 844, '#exercise-area'],
  ['cloze', '/cloze/', 390, 844, '#exercise-area'],
  ['traduccion', '/translation/', 390, 844, '#exercise-area'],
  ['secuencia', '/scramble/', 390, 844, '#exercise-area'],
]) {
  const { ctx, pg } = await page(url, w, h);
  await pg.evaluate(() => document.querySelector('.img-topic-card').click());
  await pg.waitForTimeout(400);
  await pg.evaluate(() => document.querySelector('.pb-chip').click());
  await pg.waitForTimeout(700);
  await pg.evaluate(() => document.fonts.ready);
  const m = await pg.evaluate((s) => {
    const mainEl = document.querySelector('main');
    const main = mainEl.getBoundingClientRect();
    const mcs = getComputedStyle(mainEl);
    const container = document.querySelector(s);
    const area = container.getBoundingClientRect();
    // Todos los bloques visibles entran con animacion.
    const noAnim = [...container.children].filter(el => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.display !== 'none' &&
        cs.animationName === 'none';
    }).map(el => (el.className || el.tagName).split(/\s+/)[0]);
    const progress = container.querySelector('.session-progress-bar');
    const input = [...container.querySelectorAll('input.field__input')]
      .find(i => i.getBoundingClientRect().height > 0) || null;
    const bar = container.querySelector('.session-info-bar');
    const row = container.querySelector('#action-row');
    return {
      scroll: document.documentElement.scrollHeight - innerHeight,
      above: Math.round(area.top - main.top),
      below: Math.round(main.bottom - area.bottom),
      noAnim,
      progressW: progress ? Math.round(progress.getBoundingClientRect().width) : null,
      inputH: input ? Math.round(input.getBoundingClientRect().height) : null,
      barGap: bar ? Math.round(bar.getBoundingClientRect().top - main.top) : null,
      rowGap: row ? Math.round(main.bottom - row.getBoundingClientRect().bottom) : null,
      padTop: Math.round(parseFloat(mcs.paddingTop)),
      padBottom: Math.round(parseFloat(mcs.paddingBottom)),
    };
  }, sel);
  // El vocabulario a 960x540 es la excepcion: su ficha a una columna depende
  // del contenido y puede superar el cuarto de pantalla.
  const scrollOk = m.scroll <= 0 || (name === 'vocabulario' && h === 540);
  check(scrollOk, `${name} ${w}x${h}: sin scroll (${m.scroll}px)`);
  check(m.noAnim.length === 0, `${name} ${w}x${h}: todos los bloques entran animados (${m.noAnim.join(', ') || 'ok'})`);
  check(Math.abs(m.above - m.below) <= 2,
    `${name} ${w}x${h}: centrado (${m.above}/${m.below})`);
  check(m.barGap === null || m.barGap === m.padTop,
    `${name} ${w}x${h}: barra a un relleno del header (${m.barGap}/${m.padTop})`);
  check(m.rowGap === null || m.rowGap === m.padBottom,
    `${name} ${w}x${h}: acciones a un relleno del footer (${m.rowGap}/${m.padBottom})`);
  check(m.progressW > 0, `${name} ${w}x${h}: barra de sesion visible (${m.progressW}px)`);
  check(m.inputH === null || m.inputH >= 44,
    `${name} ${w}x${h}: campo de 44 px (${m.inputH})`);
  if (name === 'quiz' && h !== 540) {
    const anim = await pg.evaluate(() => getComputedStyle(document.querySelector('.quiz-title')).animationName);
    check(anim === 'fadeIn', `quiz ${w}x${h}: instruccion con fadeIn (${anim})`);
    const head = await pg.evaluate(() => {
      const t = document.querySelector('.quiz-title');
      const s = document.querySelector('.quiz-subtitle');
      const span = t.querySelector('span');
      return {
        title: getComputedStyle(t).fontSize + '/' + getComputedStyle(t).fontWeight,
        sub: getComputedStyle(s).fontSize + '/' + getComputedStyle(s).fontWeight,
        key: span ? getComputedStyle(span).color : null,
      };
    });
    check(head.title === (w === 390 ? '27.2px/600' : '38.4px/600') && head.sub === '16px/400'
      && head.key === 'rgb(37, 99, 235)',
      `quiz ${w}x${h}: titulo e instruccion compartidos (${head.title}/${head.sub}/${head.key})`);
  }
  if (sel === '#exercise-area') {
    const color = await pg.evaluate(() => {
      const span = document.querySelector('#exercise-area .page-header__title span');
      return span ? getComputedStyle(span).color : null;
    });
    check(color === 'rgb(37, 99, 235)', `${name}: palabra clave del titulo en azul (${color})`);
  }
  // Contrato de estilos por idioma: el enunciado/objetivo va 30,4/500 y el
  // equivalente de origen (traduccion o pista) 16/400 italica.
  if ((name === 'pronunciacion' || name === 'cloze' || name === 'traduccion' || name === 'secuencia') && h !== 540) {
    const roles = await pg.evaluate((s) => {
      const root = document.querySelector(s);
      const pick = x => {
        const e = root.querySelector(x);
        if (!e) return null;
        const c = getComputedStyle(e);
        return c.fontSize + '/' + c.fontWeight + '/' + c.fontStyle;
      };
      return { target: pick('.exercise-prompt'), source: pick('.exercise-sub') };
    }, sel);
    if (name === 'pronunciacion' || name === 'cloze') {
      const target = (w === 390 ? '20px' : '30.4px') + '/500/normal';
      check(roles.target === target && roles.source === '16px/400/italic',
        `${name}: objetivo ${target} y origen 16/italic (${roles.target}/${roles.source})`);
      const air = await pg.evaluate((s) => {
        const root = document.querySelector(s);
        const card = root.querySelector('.phrase-card').getBoundingClientRect();
        const t = root.querySelector('.phrase-card .exercise-prompt').getBoundingClientRect();
        const src = root.querySelector('.phrase-card .exercise-sub').getBoundingClientRect();
        return { above: Math.round(t.top - card.top), below: Math.round(card.bottom - src.bottom) };
      }, sel);
      check(Math.abs(air.above - air.below) <= 2,
        `${name}: aire simetrico en la tarjeta (${air.above}/${air.below})`);
    } else {
      check(!roles.target && roles.source === '16px/400/italic',
        `${name}: origen 16/italic (${roles.target}/${roles.source})`);
    }
  }
  // El atras vuelve al indice del tema: la etiqueta debe decir frases/palabras.
  const back = await pg.evaluate(() => document.getElementById('back-btn').textContent.trim());
  check(back === (sel === '#exercise-area' ? '← Frases' : '← Palabras'),
    `${name}: atras a "${back}"`);
  await ctx.close();
}

// 11e0c · gramatica: misma barra y mismas acciones que el resto, y la fase de
// entrada sin scroll.
{
  const { ctx, pg } = await page('/grammar/', 1280, 800);
  await pg.evaluate(() => document.querySelector('#category-grid .img-topic-card').click());
  await pg.waitForTimeout(500);
  await pg.evaluate(() => document.querySelector('#rule-list .rule-row').click());
  await pg.waitForTimeout(700);
  const m = await pg.evaluate(() => {
    const main = document.querySelector('main');
    const cs = getComputedStyle(main);
    const bar = document.querySelector('#screen-exercise .session-info-bar').getBoundingClientRect();
    const sec = document.querySelector('#screen-exercise .phase-section:not(.hidden)');
    const act = sec.querySelector('.phase-actions').getBoundingClientRect();
    return {
      barGap: Math.round(bar.top - main.getBoundingClientRect().top),
      padTop: Math.round(parseFloat(cs.paddingTop)),
      actGap: Math.round(document.querySelector('footer').getBoundingClientRect().top - act.bottom),
      padBottom: Math.round(parseFloat(cs.paddingBottom)),
      scroll: document.documentElement.scrollHeight - innerHeight,
    };
  });
  check(m.barGap === m.padTop, `gramatica: barra al header (${m.barGap}/${m.padTop})`);
  check(m.actGap === m.padBottom, `gramatica: acciones al footer (${m.actGap}/${m.padBottom})`);
  check(m.scroll <= 0, `gramatica: fase de entrada sin scroll (${m.scroll}px)`);
  await ctx.close();
}

// 11e0b · el indice de temas conserva el relleno de pagina (solo el ejercicio se compacta)
{
  const { ctx, pg } = await page('/dictation/', 1280, 800);
  const picker = await pg.evaluate(() => getComputedStyle(document.querySelector('main')).paddingTop);
  await pg.evaluate(() => document.querySelector('.img-topic-card').click());
  await pg.waitForTimeout(500);
  await pg.evaluate(() => document.querySelector('.pb-chip').click());
  await pg.waitForTimeout(600);
  const exercise = await pg.evaluate(() => getComputedStyle(document.querySelector('main')).paddingTop);
  check(picker === '32px' && exercise === '16px',
    `indice/ejercicio: relleno propio (${picker}/${exercise})`);
  await ctx.close();
}

// 11e1 · barra de sesion: contador visible y centrado, racha a la derecha e iguales
{
  const { ctx, pg } = await page('/cloze/', 1440, 900);
  await pg.evaluate(() => document.querySelector('.img-topic-card').click());
  await pg.waitForTimeout(400);
  await pg.evaluate(() => document.querySelector('.pb-chip').click());
  await pg.waitForTimeout(600);
  const m = await pg.evaluate(() => {
    const bar = document.querySelector('#exercise-area .session-info-bar');
    const counter = bar.querySelector('.session-counter');
    const streak = bar.querySelector('.streak-badge');
    // con racha 0 el badge no debe ocupar: `display:inline-flex` ganaba a `hidden`
    const streakZeroDisplay = getComputedStyle(streak).display;
    // la racha real puede ser 0: se fuerza para medir su alineacion y altura
    streak.hidden = false;
    streak.textContent = 'Racha de 1 día';
    const title = document.querySelector('#exercise-area .page-header__title');
    const c = el => { const r = el.getBoundingClientRect(); return Math.round(r.left + r.width / 2); };
    const b = bar.getBoundingClientRect();
    return {
      counter: c(counter), title: c(title), display: getComputedStyle(bar).display,
      counterHidden: counter.hidden, counterText: counter.textContent.trim(), streakZeroDisplay,
      counterH: Math.round(counter.getBoundingClientRect().height),
      streakH: Math.round(streak.getBoundingClientRect().height),
      streakRight: Math.round(streak.getBoundingClientRect().right),
      barRight: Math.round(b.right),
    };
  });
  check(m.display === 'grid' && Math.abs(m.counter - m.title) <= 1,
    `barra de sesion: contador y titulo centrados (${m.counter}/${m.title})`);
  check(!m.counterHidden && /^0 \/ \d+/.test(m.counterText),
    `barra de sesion: contador visible desde el inicio ("${m.counterText}")`);
  check(Math.abs(m.streakRight - m.barRight) <= 1,
    `barra de sesion: racha a la derecha (${m.streakRight}/${m.barRight})`);
  check(m.counterH === 32 && m.streakH === 32,
    `barra de sesion: pastillas de 32 px (${m.counterH}/${m.streakH})`);
  check(m.streakZeroDisplay === 'none',
    `barra de sesion: racha 0 oculta (${m.streakZeroDisplay})`);
  await ctx.close();
}

// 11e2 · ritmo vertical del ejercicio: 8 titulo/subtitulo, 24 subtitulo/bloques, 16 entre bloques
for (const [name, url, inputSel, answer] of [
  ['cloze', '/cloze/', '#cloze-input', 'know'],
  ['traduccion', '/translation/', '#trans-input', 'hola'],
  ['dictado', '/dictation/', '#dict-input', 'hola'],
]) {
  const { ctx, pg } = await page(url, 1440, 900);
  await pg.evaluate(() => document.querySelector('.img-topic-card').click());
  await pg.waitForTimeout(400);
  await pg.evaluate(() => document.querySelector('.pb-chip').click());
  await pg.waitForTimeout(600);
  await pg.fill(inputSel, answer);
  await pg.keyboard.press('Enter');
  await pg.waitForTimeout(700);
  const m = await pg.evaluate(() => {
    const area = document.querySelector('#exercise-area');
    const kids = [...area.children].filter(el => {
      const cs = getComputedStyle(el);
      return el.id !== 'action-row' && cs.display !== 'none' &&
        el.getBoundingClientRect().height > 0;
    });
    const r = kids.map(el => el.getBoundingClientRect());
    const gaps = [];
    for (let i = 1; i < r.length; i++) gaps.push(Math.round(r[i].top - r[i - 1].bottom));
    const row = document.getElementById('action-row').getBoundingClientRect();
    const main = document.querySelector('main');
    return {
      gaps,
      iTitle: kids.findIndex(el => el.classList.contains('page-header__title')),
      gapFooter: Math.round(document.querySelector('footer').getBoundingClientRect().top - row.bottom),
      padBottom: Math.round(parseFloat(getComputedStyle(main).paddingBottom)),
    };
  });
  const after = m.gaps.slice(m.iTitle);
  check(after[0] === 8, `${name}: titulo/subtitulo ${after[0]}px (esperado 8)`);
  check(after[1] === 24, `${name}: subtitulo/bloque ${after[1]}px (esperado 24)`);
  check(after.slice(2).every(g => g === 16),
    `${name}: bloques a 16px (${after.slice(2).join('/')})`);
  check(m.gapFooter === m.padBottom,
    `${name}: acciones al footer ${m.gapFooter}px (${m.padBottom})`);
  await ctx.close();
}

// 11f · Dictado: tarjeta de audio con pildoras y Escuchar debajo
{
  const { ctx, pg } = await page('/dictation/', 1440, 900);
  await pg.evaluate(() => document.querySelector('.img-topic-card').click());
  await pg.waitForTimeout(500);
  await pg.evaluate(() => document.querySelector('.pb-chip').click());
  await pg.waitForTimeout(700);
  const m = await pg.evaluate(() => {
    const card = document.querySelector('.phrase-card.dict-card');
    const badge = card.querySelector('.cefr-phrase-badge');
    const variant = card.querySelector('.variant-badges');
    const cardR = card.getBoundingClientRect();
    const play = document.querySelector('.play-btn').getBoundingClientRect();
    const v = variant ? variant.getBoundingClientRect() : null;
    const c = badge ? badge.getBoundingClientRect() : null;
    const slotR = card.querySelector('#dict-slots').getBoundingClientRect();
    const countEl = card.querySelector('#dict-word-count');
    const countRange = document.createRange();
    countRange.selectNodeContents(countEl);
    const countR = countRange.getBoundingClientRect();
    return {
      inputH: Math.round(document.querySelector('#dict-input').getBoundingClientRect().height),
      checkH: Math.round(document.querySelector('#check-btn').getBoundingClientRect().height),
      playH: Math.round(play.height),
      slots: card.querySelectorAll('#dict-slots span').length,
      count: card.querySelector('#dict-word-count').textContent.trim(),
      above: Math.round(slotR.top - cardR.top),
      below: Math.round(cardR.bottom - countR.bottom),
      cardW: Math.round(cardR.width),
      cardBottom: Math.round(cardR.bottom),
      playTop: Math.round(play.top),
      badgePos: badge ? getComputedStyle(badge).position : null,
      variantPos: variant ? getComputedStyle(variant).position : null,
      variantLeft: v ? Math.round(v.left) : null,
      cefrRight: c ? Math.round(c.right) : null,
      playLeft: Math.round(play.left),
      playRight: Math.round(play.right),
    };
  });
  check(m.inputH === 44 && m.checkH === 44 && m.playH === 44,
    `dictado controles: ${m.inputH}/${m.checkH}/${m.playH} px`);
  check(m.cardW > 0 && m.slots > 0 && m.count.startsWith(String(m.slots)) && m.playTop > m.cardBottom,
    `dictado tarjeta de audio y Escuchar debajo (${m.cardW}px, ${m.slots} ranuras, "${m.count}", ${m.playTop}/${m.cardBottom})`);
  check(m.badgePos === 'absolute' && m.variantPos === 'absolute',
    `dictado pildoras en las esquinas: ${m.variantPos}/${m.badgePos}`);
  check(m.above - m.below >= 14 && m.above - m.below <= 18 && m.below >= 30,
    `dictado ranuras y contador con sesgo optico (${m.above}/${m.below})`);
  check(m.variantLeft < m.playLeft && m.cefrRight > m.playRight,
    `dictado variante izquierda / CEFR derecha (${m.variantLeft}/${m.playLeft}, ${m.playRight}/${m.cefrRight})`);
  await ctx.close();
}

// 11e4 · vocabulario: tarjeta estable al girar y Siguiente fuera, al pie
{
  const { ctx, pg } = await page('/vocabulary/', 1016, 816);
  await pg.evaluate(() => document.querySelector('.img-topic-card').click());
  await pg.waitForTimeout(400);
  await pg.evaluate(() => document.querySelector('.pb-chip').click());
  await pg.waitForTimeout(700);
  await pg.evaluate(() => document.fonts.ready);
  const read = () => pg.evaluate(() => {
    const q = s => document.querySelector(s).getBoundingClientRect();
    const main = document.querySelector('main');
    const cs = getComputedStyle(main);
    const back = document.querySelector('#flashcard-back');
    const next = document.querySelector('#next-btn');
    const sub = document.querySelector('.vocab-subtitle');
    return {
      cardW: Math.round(q('#flashcard-front').width),
      cardTop: Math.round(q('#flashcard').top),
      cardH: Math.round(q('#flashcard').height),
      // La ficha se centra entre la instruccion y el boton (fuera de la ficha).
      above: Math.round(q('#flashcard-scene').top -
        (q('.vocab-subtitle').bottom + parseFloat(getComputedStyle(sub).marginBottom))),
      below: Math.round(q('#next-btn').top - parseFloat(getComputedStyle(next).marginTop) - q('#flashcard-scene').bottom),
      // Aire visible entre la instruccion y la tarjeta (incluye el relleno de la escena).
      cardAbove: Math.round(q('#flashcard').top -
        (q('.vocab-subtitle').bottom + parseFloat(getComputedStyle(sub).marginBottom))),
      nextOutside: !back.contains(next),
      nextVisibility: getComputedStyle(next).visibility,
      // offsetHeight: el alto de caja, sin el scale de la animacion de entrada.
      nextH: next.offsetHeight,
      footerGap: Math.round(main.getBoundingClientRect().bottom - q('#next-btn').bottom),
      padBottom: Math.round(parseFloat(cs.paddingBottom)),
      backScroll: back.scrollHeight - back.clientHeight,
      title: (() => { const c = getComputedStyle(document.querySelector('.vocab-title')); return c.fontSize + '/' + c.fontWeight; })(),
      sub: (() => { const c = getComputedStyle(document.querySelector('.vocab-subtitle')); return c.fontSize + '/' + c.fontWeight; })(),
      key: getComputedStyle(document.querySelector('.vocab-title span')).color,
      source: getComputedStyle(document.querySelector('#word-translation')).fontStyle,
      scroll: document.documentElement.scrollHeight - innerHeight,
    };
  });
  const a = await read();
  await pg.evaluate(() => document.querySelector('#flip-btn').click());
  await pg.waitForTimeout(400);
  const ab = await read();
  await pg.evaluate(() => document.querySelector('#next-btn').click());
  await pg.waitForTimeout(700);
  const b2 = await read();
  check(ab.cardW === b2.cardW, `vocabulario: tarjeta de ancho fijo (${ab.cardW}/${b2.cardW})`);
  // Girar no reacomoda la pagina: la tarjeta conserva posicion y alto.
  check(a.cardTop === ab.cardTop && a.cardH === ab.cardH,
    `vocabulario: la tarjeta no se mueve al girar (${a.cardTop}/${ab.cardTop}, ${a.cardH}/${ab.cardH})`);
  check(Math.abs(a.above - a.below) <= 2 && Math.abs(ab.above - ab.below) <= 2,
    `vocabulario: ficha centrada entre instruccion y Siguiente (${a.above}/${a.below})`);
  check(a.cardAbove >= 12,
    `vocabulario: aire minimo bajo la instruccion (${a.cardAbove})`);
  check(a.nextOutside && a.nextVisibility === 'hidden' && ab.nextVisibility === 'visible' && ab.nextH >= 44,
    `vocabulario: Siguiente fuera y visible al girar (${a.nextOutside}, ${a.nextVisibility}/${ab.nextVisibility}, ${ab.nextH})`);
  check(Math.abs(a.footerGap - a.padBottom) <= 1,
    `vocabulario: Siguiente al pie (${a.footerGap}/${a.padBottom})`);
  check(a.backScroll <= 1 && ab.backScroll <= 1,
    `vocabulario: dorso sin scroll interno (${a.backScroll}/${ab.backScroll})`);
  check(a.scroll <= 0 && ab.scroll <= 0, `vocabulario: sin scroll de pagina (${a.scroll}/${ab.scroll})`);
  check(a.title.endsWith('/600') && a.sub === '16px/400' && a.key === 'rgb(37, 99, 235)',
    `vocabulario: titulo e instruccion compartidos (${a.title}/${a.sub}/${a.key})`);
  check(a.source === 'italic',
    `vocabulario: equivalente de origen en italica (${a.source})`);
  await ctx.close();
}

// 11e5 · secuencia: tarjeta de frase, sin etiquetas y controles alineados
{
  const { ctx, pg } = await page('/scramble/', 1440, 900);
  await pg.evaluate(() => document.querySelector('.img-topic-card').click());
  await pg.waitForTimeout(400);
  await pg.evaluate(() => document.querySelector('.pb-chip').click());
  await pg.waitForTimeout(700);
  const m = await pg.evaluate(() => {
    const area = document.querySelector('.construction-area').getBoundingClientRect();
    const btn = document.getElementById('check-btn').getBoundingClientRect();
    const clear = document.getElementById('clear-btn').getBoundingClientRect();
    const card = document.getElementById('hint-card');
    return {
      areaH: Math.round(area.height), btnH: Math.round(btn.height),
      areaTop: Math.round(area.top), btnTop: Math.round(btn.top),
      clearH: Math.round(clear.height), clearTop: Math.round(clear.top),
      cardClass: card.className,
      cardH: Math.round(card.getBoundingClientRect().height),
      labels: document.querySelectorAll('.zone-label, .hint-label').length,
    };
  });
  check(m.areaH === 44 && m.btnH === 44 && Math.abs(m.areaTop - m.btnTop) <= 1,
    `secuencia: construccion y Verificar iguales (${m.areaH}/${m.btnH}, ${m.areaTop}/${m.btnTop})`);
  check(m.clearH === 44 && Math.abs(m.clearTop - m.areaTop) <= 1,
    `secuencia: Borrar comparte fila con el campo (${m.clearH}, ${m.clearTop}/${m.areaTop})`);
  check(m.cardClass.includes('phrase-card') && m.cardH > 0 && m.labels === 0,
    `secuencia: tarjeta de frase sin etiquetas (${m.cardClass}, ${m.labels})`);
  // Ficha 28 dentro de la superficie de 36: respira sin subir la caja.
  await pg.evaluate(() => document.querySelector('.word-bank .word-tile').click());
  await pg.waitForTimeout(300);
  const t = await pg.evaluate(() => {
    const tile = document.querySelector('.construction-area .word-tile');
    return { h: Math.round(tile.getBoundingClientRect().height) };
  });
  check(t.h === 28, `secuencia: ficha de 28 px dentro del campo (${t.h})`);
  // Frase larga: varias filas de fichas, botones centrados con el campo y aire
  // suficiente dentro del marco discontinuo.
  await pg.evaluate(() => {
    const area = document.getElementById('construction-area');
    const tile = area.querySelector('.word-tile');
    if (!tile) return;
    for (let i = 0; i < 24; i++) area.appendChild(tile.cloneNode(true));
  });
  await pg.waitForTimeout(200);
  const long = await pg.evaluate(() => {
    const area = document.getElementById('construction-area').getBoundingClientRect();
    const clear = document.getElementById('clear-btn').getBoundingClientRect();
    const check = document.getElementById('check-btn').getBoundingClientRect();
    const tiles = [...document.querySelectorAll('#construction-area .word-tile')].map(x => x.getBoundingClientRect());
    const rows = new Set(tiles.map(x => Math.round(x.top))).size;
    const center = r => (r.top + r.bottom) / 2;
    return {
      rows,
      clear: Math.round(center(clear)),
      check: Math.round(center(check)),
      field: Math.round(center(area)),
      padTop: Math.round(tiles[0].top - area.top),
      padBottom: Math.round(area.bottom - tiles[tiles.length - 1].bottom),
    };
  });
  check(long.rows >= 2 && Math.abs(long.clear - long.field) <= 1 && Math.abs(long.check - long.field) <= 1,
    `secuencia frase larga: Borrar/Verificar centrados (${long.clear}/${long.check}/${long.field}, ${long.rows} filas)`);
  check(long.padTop >= 8 && long.padBottom >= 8,
    `secuencia frase larga: aire dentro del campo (${long.padTop}/${long.padBottom})`);
  await ctx.close();
}

// 11g · auditoria UI/UX 8 nov 2026: perfil, indice, onboarding, landing, ultrawide
{
  // Perfil 390: la matriz conserva el scroll interno (no 16.000 px de lista).
  const { ctx, pg } = await page('/progress/', 390, 844);
  const prof = await pg.evaluate(() => {
    const w = document.querySelector('.ex-matrix-wrap');
    return {
      docX: document.documentElement.scrollWidth - innerWidth,
      sw: w ? w.scrollWidth : 0, cw: w ? w.clientWidth : 0,
      pageH: document.documentElement.scrollHeight,
    };
  });
  check(prof.docX <= 0 && prof.sw > prof.cw && prof.pageH < 7000,
    `perfil 390: matriz con scroll interno (${prof.sw}/${prof.cw}, pagina ${prof.pageH})`);
  await ctx.close();
}
{
  // Indice de palabras 390: dos columnas.
  const { ctx, pg } = await page('/vocabulary/', 390, 844);
  await pg.evaluate(() => document.querySelector('.img-topic-card').click());
  await pg.waitForTimeout(900);
  const idx = await pg.evaluate(() => {
    const g = document.querySelector('.pb-grid');
    return g ? { two: getComputedStyle(g).gridTemplateColumns.split(' ').length === 2, cls: g.className } : null;
  });
  check(idx && idx.two && idx.cls.includes('pb-grid--words'),
    `indice palabras 390: 2 columnas (${idx ? idx.cls : 'sin rejilla'})`);
  await ctx.close();
}
{
  // Onboarding 390: chips de 44 px y buscador que filtra.
  const { ctx, pg } = await page('/index.html', 390, 844);
  await pg.evaluate(() => document.getElementById('ob-next-0')?.click());
  await pg.waitForTimeout(400);
  const ob = await pg.evaluate(() => {
    const chips = [...document.querySelectorAll('#ob-topic-bubbles .prog-bubble')];
    const h = chips.length ? Math.round(chips[0].getBoundingClientRect().height) : 0;
    const inner = document.querySelector('.ob-inner');
    const innerScroll = inner.scrollHeight > inner.clientHeight;
    const s = document.getElementById('ob-topic-search');
    s.value = 'famil'; s.dispatchEvent(new Event('input'));
    const visible = chips.filter(c => !c.hidden).length;
    const cta = document.getElementById('ob-topics-done').getBoundingClientRect();
    return {
      h, visible, total: chips.length,
      ctaTop: Math.round(cta.top), ctaBottom: Math.round(cta.bottom),
      vh: innerHeight, innerScroll
    };
  });
  check(ob.h >= 44 && ob.visible > 0 && ob.visible < ob.total,
    `onboarding 390: chips 44 y buscador (${ob.h}, ${ob.visible}/${ob.total})`);
  check(ob.ctaTop >= 0 && ob.ctaBottom <= ob.vh && ob.innerScroll,
    `onboarding 390: CTA fijo visible (${ob.ctaTop}-${ob.ctaBottom}/${ob.vh}, scroll ${ob.innerScroll})`);
  await ctx.close();
}
{
  // Landing 1920: los grupos no dejan columnas vacias.
  const { ctx, pg } = await page('/index.html', 1920, 1080);
  const land = await pg.evaluate(() => [...document.querySelectorAll('.activity-grid')].map(g => ({
    cols: getComputedStyle(g).gridTemplateColumns.split(' ').length,
    n: g.querySelectorAll('.card--feature').length,
  })));
  check(land.every(g => g.cols === g.n), `landing 1920: grupos sin huecos (${land.map(g => g.cols + '/' + g.n).join(', ')})`);
  await ctx.close();
}
{
  // Ultrapanoramica: Quiz y Gramatica con el mismo limite de 720 que el resto.
  const { ctx, pg } = await page('/quiz/', 1920, 1080);
  const qw = await pg.evaluate(() => Math.round(document.getElementById('quiz-content').getBoundingClientRect().width));
  check(qw <= 720, `quiz 1920: contenedor acotado (${qw})`);
  await ctx.close();
}
{
  const { ctx, pg } = await page('/grammar/', 1920, 1080);
  await pg.evaluate(() => document.querySelector('#category-grid .img-topic-card').click());
  await pg.waitForTimeout(500);
  await pg.evaluate(() => document.querySelector('#rule-list .rule-row').click());
  await pg.waitForTimeout(700);
  const gw = await pg.evaluate(() => Math.round(document.getElementById('screen-exercise').getBoundingClientRect().width));
  check(gw <= 720, `gramatica 1920: contenedor acotado (${gw})`);
  await ctx.close();
}

// 11e3 · boton Escuchar: mismo formato (icono + etiqueta) en las cuatro actividades
for (const [name, url, sel, answer] of [
  ['cloze', '/cloze/', '#listen-btn', null],
  ['dictado', '/dictation/', '#play-btn', null],
  ['vocabulario', '/vocabulary/', '#listen-btn', null],
  ['traduccion', '/translation/', '#listen-btn', 'hola'],
]) {
  const { ctx, pg } = await page(url, 1440, 900);
  await pg.evaluate(() => document.querySelector('.img-topic-card').click());
  await pg.waitForTimeout(400);
  await pg.evaluate(() => document.querySelector('.pb-chip').click());
  await pg.waitForTimeout(700);
  if (answer) {
    await pg.fill('#trans-input', answer);
    await pg.keyboard.press('Enter');
    await pg.waitForTimeout(700);
  }
  const m = await pg.evaluate((s) => {
    const b = document.querySelector(s);
    const r = b.getBoundingClientRect();
    const use = b.querySelector('svg.icon use');
    return {
      h: Math.round(r.height),
      icon: use ? use.getAttribute('href') : null,
      label: ((b.querySelector('.btn-label') || {}).textContent || '').trim(),
    };
  }, sel);
  check(m.h === 44 && m.icon === '#i-volume-2' && m.label.length > 0,
    `${name}: Escuchar con icono y etiqueta (${m.h}px, ${m.icon}, "${m.label}")`);
  await ctx.close();
}

// 11f · capsulas: header, pestañas y etiqueta de idioma comparten 32 visibles
{
  const { ctx, pg } = await page('/translation/', 1440, 900);
  const m = await pg.evaluate(() => {
    const box = el => (el ? el.getBoundingClientRect().height : 0);
    const pill = el => {
      if (!el) return 0;
      const ps = getComputedStyle(el, '::before');
      return Math.round(box(el) - parseFloat(ps.top || 0) - parseFloat(ps.bottom || 0));
    };
    return {
      header: Math.round(box(document.querySelector('.lp-badge'))),
      headerPill: pill(document.querySelector('.lp-badge')),
      navPill: pill(document.querySelector('.mode-switcher .nav-item--active')),
    };
  });
  check(m.header === 44 && m.headerPill === 32,
    `capsula del par: ${m.headerPill} px visibles en ${m.header} (esperado 32/44)`);
  check(m.navPill === m.headerPill, `capsula del par = capsula de pestañas (${m.headerPill}/${m.navPill})`);
  await ctx.close();
}

// 11g · quiz: un fallo no pinta la tarjeta como aprendida en el indice
for (const [label, correct, expected] of [['fallo', false, 0], ['acierto', true, 1]]) {
  const { ctx, pg } = await page('/quiz/', 1440, 900);
  await pg.evaluate(() => document.querySelector('.img-topic-card').click());
  await pg.waitForTimeout(500);
  await pg.evaluate(() => document.querySelector('.pb-chip').click());
  await pg.waitForTimeout(600);
  await pg.evaluate(ok => {
    const opts = [...document.querySelectorAll('.option')];
    (ok ? opts.find(x => x.dataset.correct === 'true') : opts.find(x => x.dataset.correct !== 'true')).click();
  }, correct);
  await pg.waitForTimeout(300);
  await pg.click('#back-btn');
  await pg.waitForTimeout(500);
  const seen = await pg.evaluate(() => document.querySelectorAll('#pb-section .pb-chip--seen').length);
  check(seen === expected, `quiz ${label}: ${seen} tarjetas verdes (esperado ${expected})`);
  await ctx.close();
}

// 11g2 · un fallo tampoco rellena las variantes (cobertura) del indice
{
  const { ctx, pg } = await page('/cloze/', 1440, 900);
  await pg.evaluate(() => document.querySelector('.img-topic-card').click());
  await pg.waitForTimeout(500);
  await pg.evaluate(() => document.querySelector('.pb-chip').click());
  await pg.waitForTimeout(600);
  await pg.fill('#cloze-input', 'zzz');
  await pg.keyboard.press('Enter');
  await pg.waitForTimeout(700);
  await pg.click('#back-btn');
  await pg.waitForTimeout(500);
  const m = await pg.evaluate(() => ({
    seen: document.querySelectorAll('#pb-section .pb-chip--seen').length,
    pips: document.querySelectorAll('#pb-section .pb-cov-pip--done').length,
  }));
  check(m.seen === 0 && m.pips === 0,
    `cloze fallo: sin tarjeta verde ni variantes (${m.seen}/${m.pips})`);
  await ctx.close();
}

// 11h · selector de par: flechas reales y sin resaltado falso de seleccion
{
  const ctx = await browser.newContext({ viewport: { width: 1244, height: 900 }, serviceWorkers: 'block' });
  await ctx.addInitScript(() => {
    localStorage.setItem('pe_onboarded', '1');
    localStorage.removeItem('pe_active_pair');
  });
  const pg = await ctx.newPage();
  await pg.route(/\.(onnx|wasm|bin)(\?|$)/i, r => r.abort());
  await pg.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' });
  await pg.waitForTimeout(2000);
  const m = await pg.evaluate(() => {
    const cards = [...document.querySelectorAll('.lp-pair')];
    const r = document.querySelector('.lp-modal').getBoundingClientRect();
    return {
      cards: cards.length,
      chevrons: document.querySelectorAll('.lp-pair__chevron').length,
      arrows: [...document.querySelectorAll('.lp-pair__sep')].map(a => a.textContent.trim()),
      cols: getComputedStyle(document.querySelector('.lp-grid')).gridTemplateColumns.split(' ').length,
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      vh: innerHeight,
      close: (document.getElementById('lp-close') || {}).className,
      badge: !!document.querySelector('.lp-badge'),
    };
  });
  check(m.cards >= 8, `selector de par: ${m.cards} pares`);
  check(m.chevrons === m.cards, `selector de par: cheurón por fila (${m.chevrons}/${m.cards})`);
  check(m.arrows.length === m.cards && m.arrows.every(a => a === '\u2192'),
    `selector de par: flechas (${[...new Set(m.arrows)].join('') || 'ninguna'})`);
  check(m.cols === 2, `selector de par: 2 columnas (${m.cols})`);
  check(m.top >= 0 && m.bottom <= m.vh && Math.abs((m.top + m.bottom) / 2 - m.vh / 2) <= 2,
    `selector de par: modal centrado y dentro de la ventana (${m.top}-${m.bottom}/${m.vh})`);
  check(m.close === 'icon-btn ob-close', `selector de par: cierre estandar (${m.close || 'ausente'})`);
  check(!m.badge, 'selector de par: sin insignia de par por defecto');
  await ctx.close();
}

// 11i — hero map: labels clear of the route and of each other (es/en/de)
for (const [pair, w, h] of [
  ['es-en', 1366, 768], ['en-es', 1366, 768], ['de-es', 1366, 768],
  ['es-en', 390, 844], ['en-es', 390, 844], ['de-es', 390, 844]
]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block' });
  await ctx.addInitScript((p) => {
    localStorage.setItem('pe_active_pair', p);
    localStorage.setItem('pe_onboarded', '1');
  }, pair);
  const pg = await ctx.newPage();
  await ctx.route(/\.(onnx|wasm|bin)(\?|$)/i, r => r.abort());
  await pg.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
  await pg.waitForTimeout(1400);
  await pg.evaluate(() => document.fonts.ready);
  const m = await pg.evaluate(() => {
    const labels = [...document.querySelectorAll('.hero-map__label')];
    const path = document.querySelector('#hero-map-route path');
    const ctm = path.getScreenCTM();
    const total = path.getTotalLength();
    const pts = [];
    for (let d = 0; d <= total; d += 2) {
      const q = path.getPointAtLength(d).matrixTransform(ctm);
      pts.push([q.x, q.y]);
    }
    const hits = [];
    labels.forEach(l => {
      const r = l.getBoundingClientRect();
      const n = pts.filter(([x, y]) => x >= r.left - 1 && x <= r.right + 1 && y >= r.top - 1 && y <= r.bottom + 1).length;
      if (n) hits.push(l.textContent);
    });
    const overlaps = [];
    for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) {
      const a = labels[i].getBoundingClientRect(), b = labels[j].getBoundingClientRect();
      if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) {
        overlaps.push(labels[i].textContent + ' / ' + labels[j].textContent);
      }
    }
    return { hits, overlaps };
  });
  check(m.hits.length === 0 && m.overlaps.length === 0,
    `hero map ${pair} ${w}: etiquetas sin choque (${m.hits.length}/${m.overlaps.length})`);
  await ctx.close();
}

// 12 · activity palette on the landing cards (same single source)
{
  const { ctx, pg } = await page('/', 1440, 900);
  const m = await pg.evaluate(() => {
    const cards = [...document.querySelectorAll('.card--feature[data-activity]')];
    return {
      n: cards.length,
      colors: cards.map(c => getComputedStyle(c.querySelector('.card__title .icon')).color),
      emphases: cards.map(c => {
        const p = c.querySelector('p');
        const s = p.querySelector('strong');
        const ps = getComputedStyle(p);
        return {
          has: !!s,
          color: s ? getComputedStyle(s).color : null,
          weight: s ? getComputedStyle(s).fontWeight : null,
          title: getComputedStyle(c.querySelector('.card__title')).color,
          desc: ps.color,
          descWeight: ps.fontWeight,
        };
      }),
    };
  });
  check(m.n === 8, `landing: ${m.n} tarjetas de actividad con data-activity`);
  check(new Set(m.colors).size === 8, `landing: ${new Set(m.colors).size} acentos de actividad distintos`);
  check(m.emphases.every(e => e.has && e.color === e.title && e.color !== e.desc && +e.weight > +e.descWeight),
    'landing: frase con enfasis sobre el texto secundario');
  await ctx.close();
}

// 13 — onboarding: topic capsules equal Mi Perfil; close is the standard icon-btn
{
  const readChip = (pg) => pg.evaluate(() => {
    const c = document.querySelector('.prog-bubble');
    if (!c) return null;
    const cs = getComputedStyle(c);
    const bs = getComputedStyle(c, '::before');
    const icon = c.querySelector('.prog-bubble-icon .icon');
    return {
      tag: c.tagName,
      h: Math.round(c.getBoundingClientRect().height),
      font: cs.fontSize,
      weight: cs.fontWeight,
      gap: cs.gap,
      radius: cs.borderRadius,
      capsule: Math.round(c.getBoundingClientRect().height - 2 * parseFloat(bs.top)),
      icon: icon ? getComputedStyle(icon).width : null,
      label: getComputedStyle(c.querySelector('.prog-bubble-label')).whiteSpace,
    };
  });
  const prof = await page('/progress/', 1440, 900);
  const a = await readChip(prof.pg);
  await prof.ctx.close();

  const onb = await page('/', 1440, 900);
  await onb.pg.click('#ob-next-0');
  await onb.pg.waitForTimeout(400);
  const b = await readChip(onb.pg);
  const close = await onb.pg.evaluate(() => {
    const el = document.getElementById('ob-close');
    const cs = getComputedStyle(el);
    return {
      cls: el.className,
      w: Math.round(el.getBoundingClientRect().width),
      h: Math.round(el.getBoundingClientRect().height),
      radius: cs.borderRadius,
      icon: getComputedStyle(el.querySelector('.icon')).width,
    };
  });
  check(a && b && JSON.stringify(a) === JSON.stringify(b),
    `onboarding: capsulas iguales a Mi Perfil (${a && a.font}/${b && b.font}, ${a && a.capsule}/${b && b.capsule})`);
  check(close.cls === 'icon-btn ob-close' && close.w === 44 && close.h === 44 && close.icon === '18px',
    `onboarding: cierre estandar (${close.cls}, ${close.w}, ${close.icon})`);
  await onb.ctx.close();
}

// 14 — feedback visible: aire minimo arriba y abajo, en cualquier alto
for (const [name, url, titleSel, flow] of [
  ['cloze', '/cloze/', '.cloze-title', async (pg) => {
    await pg.fill('#cloze-input', 'doing');
    await pg.keyboard.press('Enter');
  }],
  ['quiz', '/quiz/', '#quiz-content .page-header__title', async (pg) => {
    await pg.locator('.option').first().click();
  }],
]) {
  for (const [w, h] of [[1280, 800], [1440, 900]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block' });
    await ctx.addInitScript(() => {
      localStorage.setItem('pe_active_pair', 'es-en');
      localStorage.setItem('pe_onboarded', '1');
    });
    const pg = await ctx.newPage();
    await ctx.route(/\.(onnx|wasm|bin)(\?|$)/i, r => r.abort());
    await pg.goto(`http://localhost:${PORT}${url}`, { waitUntil: 'domcontentloaded' });
    await pg.waitForTimeout(1500);
    await pg.evaluate(() => document.querySelector('.img-topic-card').click());
    await pg.waitForTimeout(400);
    await pg.evaluate(() => document.querySelector('.pb-chip').click());
    await pg.waitForTimeout(600);
    await flow(pg);
    await pg.waitForTimeout(700);
    const m = await pg.evaluate((sel) => {
      const bar = document.getElementById('session-progress-bar').getBoundingClientRect();
      const t = document.querySelector(sel);
      const tr = t.getBoundingClientRect();
      const ts = getComputedStyle(t);
      const row = document.getElementById('action-row');
      const rr = row.getBoundingClientRect();
      const foot = document.querySelector('footer').getBoundingClientRect();
      const cs = getComputedStyle(document.querySelector('main'));
      return {
        top: Math.round(tr.top + parseFloat(ts.paddingTop) - bar.bottom),
        bottom: Math.round(foot.top - rr.bottom),
        pad: Math.round(parseFloat(cs.paddingBottom)),
        padTop: Math.round(parseFloat(ts.paddingTop)),
        rowMargin: Math.round(parseFloat(getComputedStyle(row).marginBottom)),
        scroll: document.documentElement.scrollHeight > innerHeight,
      };
    }, titleSel);
    check(m.top >= 28, `${name} ${w}x${h}: titulo con aire (${m.top}px)`);
    check(m.bottom >= 28, `${name} ${w}x${h}: acciones con aire (${m.bottom}px)`);
    check(m.padTop === (h <= 800 ? 28 : 24) && m.rowMargin === (h <= 860 ? 12 : 0),
      `${name} ${w}x${h}: minimos ${h <= 800 ? 28 : 24}/${h <= 860 ? 12 : 0} (${m.padTop}/${m.rowMargin})`);
    check(m.scroll, `${name} ${w}x${h}: scroll disponible con feedback`);
    await ctx.close();
  }
}

// 15 — inputs: same body text size across exercises (14 desktop)
{
  const sizes = {};
  for (const [name, url, sel] of [
    ['cloze', '/cloze/', '#cloze-input'],
    ['dictado', '/dictation/', '#dict-input'],
    ['traduccion', '/translation/', '#trans-input'],
  ]) {
    const { ctx, pg } = await page(url, 1366, 900);
    await pg.evaluate(() => document.querySelector('.img-topic-card').click());
    await pg.waitForTimeout(400);
    await pg.evaluate(() => document.querySelector('.pb-chip').click());
    await pg.waitForTimeout(600);
    sizes[name] = await pg.evaluate(s => getComputedStyle(document.querySelector(s)).fontSize, sel);
    await ctx.close();
  }
  const g = await page('/grammar/', 1366, 900);
  await g.pg.evaluate(() => document.querySelector('#category-grid .img-topic-card').click());
  await g.pg.waitForTimeout(400);
  await g.pg.evaluate(() => document.querySelector('#rule-list .rule-row').click());
  await g.pg.waitForTimeout(600);
  await g.pg.evaluate(() => goToPhase(1));
  await g.pg.waitForTimeout(400);
  sizes.noticing = await g.pg.evaluate(() => getComputedStyle(document.querySelector('.noticing-input')).fontSize);
  await g.pg.evaluate(() => goToPhase(4));
  await g.pg.waitForTimeout(400);
  sizes.production = await g.pg.evaluate(() => getComputedStyle(document.querySelector('.production-input')).fontSize);
  // Huecos de relleno: mismo ancho y grande, para que el campo no delate la respuesta.
  const prodW = await g.pg.evaluate(() =>
    [...document.querySelectorAll('.production-input')].map(i => Math.round(i.getBoundingClientRect().width)));
  check(prodW.length > 0 && prodW.every(w => w === prodW[0]) && prodW[0] >= 180,
    `production: huecos uniformes (${prodW.join('/')})`);
  await g.pg.evaluate(() => goToPhase(5));
  await g.pg.waitForTimeout(400);
  sizes.express = await g.pg.evaluate(() => getComputedStyle(document.querySelector('.express-input')).fontSize);
  await g.ctx.close();
  check(Object.values(sizes).every(v => v === '14px'),
    `inputs: mismo cuerpo (${Object.entries(sizes).map(([k, v]) => k + ' ' + v).join(', ')})`);
}

await browser.close();
server.close();
if (fails.length) { console.log(`\n✗ layout: ${fails.length} fallo(s)`); process.exit(1); }
console.log('\n✓ layout: ALL CLEAR');
