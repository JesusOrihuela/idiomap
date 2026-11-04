/* ============================================================
   check-layout.mjs — verifica el contrato de layout del plan H1–H4
   ------------------------------------------------------------
   1. Secciones del perfil: misma medida y sin scroll horizontal.
   2. Heatmap: 7 filas de dias, meses, celdas con etiqueta.
   3. Mi Aprendizaje: zigzag diagonal (<= 900 px de alto), sin trazos sobre las capsulas.
   4. Alineación: gramática y actividades arrancan a la misma altura.
   5. Índice: tarjetas de actividad parejas.
   6. Índice: ruta paginada (indicador, flechas, conectores pegados y aire simétrico).
   7. Nav: una fila, 44 px por destino y alto cómodo de 320 a 1966 px.
   8. Landing: el aire bajo el header y sobre el footer coinciden.
   9. Teclado: las 8 tarjetas del índice se alcanzan con Tab y foco visible.
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

// 2 · heatmap
{
  const { ctx, pg } = await page('/progress/', 1440, 900);
  const m = await pg.evaluate(() => {
    const grid = document.querySelector('.heatmap-grid');
    if (!grid) return null;
    return {
      rows: getComputedStyle(grid).gridTemplateRows.split(' ').length,
      days: document.querySelectorAll('.heatmap-day').length,
      months: document.querySelectorAll('.heatmap-month').length,
      cells: document.querySelectorAll('.heatmap-cell:not(.heatmap-cell--empty)').length,
      labelled: [...document.querySelectorAll('.heatmap-cell:not(.heatmap-cell--empty)')].filter(c => c.getAttribute('aria-label')).length,
    };
  });
  check(!!m, 'heatmap presente');
  if (m) {
    check(m.rows === 8, `heatmap: ${m.rows} filas (cabecera + 7 dias)`);
    check(m.days === 7, `heatmap: ${m.days} etiquetas de dia`);
    check(m.months >= 2, `heatmap: ${m.months} etiquetas de mes`);
    check(m.cells >= 60, `heatmap: ${m.cells} celdas`);
    check(m.labelled === m.cells, `heatmap: ${m.labelled}/${m.cells} con aria-label`);
  }
  await ctx.close();
}

// 3 · mi aprendizaje: zigzag diagonal y capsulas intactas
{
  const { ctx, pg } = await page('/my-learning/', 1440, 900);
  const m = await pg.evaluate(() => {
    const trail = document.querySelector('.ml-trail');
    if (!trail) return { h: null };
    const nodes = [...document.querySelectorAll('.ml-snode')].map(e => e.getBoundingClientRect());
    let overlaps = 0;
    for (let i = 1; i < nodes.length; i++) {
      const a = nodes[i - 1], b = nodes[i];
      if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) overlaps++;
    }
    const t = trail.getBoundingClientRect();
    const bubbles = [...trail.querySelectorAll('.ml-snode__bubble')].map(e => e.getBoundingClientRect());
    const sides = bubbles.map(b => (b.left + b.width / 2 < t.left + t.width / 2 ? 'L' : 'R')).join('');
    const zigzag = /^(LR)+L?$/.test(sides) || /^(RL)+R?$/.test(sides);
    // Ningun trazo puede cruzar una capsula de tema, una etiqueta o un chip.
    const targets = [...trail.querySelectorAll('.ml-snode__topic, .ml-snode__label, .ml-snode__new-badge, .ml-snode__review-badge')]
      .filter(e => getComputedStyle(e).visibility !== 'hidden')
      .map(e => { const b = e.getBoundingClientRect(); return { l: b.left - t.left, r: b.right - t.left, t: b.top - t.top, b: b.bottom - t.top }; });
    let crossings = 0;
    for (const s of trail.querySelectorAll('line.ml-connector')) {
      const x1 = +s.getAttribute('x1'), y1 = +s.getAttribute('y1');
      const x2 = +s.getAttribute('x2'), y2 = +s.getAttribute('y2');
      for (let k = 0; k <= 200; k++) {
        const x = x1 + (x2 - x1) * k / 200;
        const y = y1 + (y2 - y1) * k / 200;
        if (targets.some(b => x >= b.l && x <= b.r && y >= b.t && y <= b.b)) { crossings++; break; }
      }
    }
    return { h: Math.round(t.height), nodes: nodes.length, overlaps, sides, zigzag, crossings };
  });
  check(m.nodes >= 8, `mi aprendizaje: ${m.nodes} nodos`);
  check(m.zigzag === true, `mi aprendizaje: zigzag ${m.sides}`);
  check(m.h !== null && m.h <= 900, `mi aprendizaje: ruta de ${m.h}px (<=900)`);
  check(m.overlaps === 0, `mi aprendizaje: ${m.overlaps} solapes`);
  check(m.crossings === 0, `mi aprendizaje: ${m.crossings} trazos sobre capsulas`);
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
  const hs = await pg.evaluate(() =>
    [...document.querySelectorAll('.card--feature')].map(c => Math.round(c.getBoundingClientRect().height)));
  check(hs.length === 8 && Math.max(...hs) - Math.min(...hs) <= 1,
    `index ${w}: ${hs.length} tarjetas parejas (${Math.min(...hs)}-${Math.max(...hs)})`);
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
      ...[...trail.querySelectorAll('.path-node__new-badge, .path-node__review-badge')].map(e => e.getBoundingClientRect().bottom),
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
    };
  });

  const first = await read();
  const total = (first.status.match(/de (\d+)$/) || [])[1];
  check(first.pager && /^Pasos 1-5 de \d+$/.test(first.status), `ruta: indicador "${first.status}"`);
  check(first.role === 'status', 'ruta: indicador en role=status');
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

await browser.close();
server.close();
if (fails.length) { console.log(`\n✗ layout: ${fails.length} fallo(s)`); process.exit(1); }
console.log('\n✓ layout: ALL CLEAR');
