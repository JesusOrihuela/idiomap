/* ============================================================
   verify-ui.mjs — verificación total de la UI
   ------------------------------------------------------------
   Una sola orden comprueba, en las 12 páginas:

     1. errores de JS en consola
     2. desborde horizontal a 375px
     3. desborde con zoom 200% (viewport efectivo 640)
     4. WCAG 1.4.12: interlinea 1.5 + tracking .12em + palabra .16em
        sin desborde ni texto recortado
     5. iconos <use> sin resolver
     6. emoji en el texto renderizado
     7. adopción de las clases canónicas

   Uso:  node tools/verify-ui.mjs [--shots <dir>] [--baseline <dir>]
   ============================================================ */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const SHOTS = args.includes('--shots') ? args[args.indexOf('--shots') + 1] : null;
const BASELINE = args.includes('--baseline') ? args[args.indexOf('--baseline') + 1] : null;

const PAGES = [
  'index.html',
  'speaking/', 'dictation/', 'cloze/',
  'translation/', 'scramble/', 'vocabulary/',
  'quiz/', 'grammar/', 'my-learning/',
  'progress/', 'placement/',
];

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp',
  '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg',
};

const PORT = 8081;
const server = http.createServer((req, res) => {
  let f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (f.endsWith('/') || f.endsWith('\\')) f = path.join(f, 'index.html');
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('404'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(PORT, r));

let chromium;
try {
  ({ chromium } = await import('playwright-core'));
} catch {
  const local = path.join(ROOT, 'node_modules/playwright-core/index.mjs');
  ({ chromium } = await import('file:///' + local.replace(/\\/g, '/')));
}

const EXE = process.env.PE_CHROME ||
  'C:/Users/juanj/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe';
const browser = await chromium.launch({ executablePath: fs.existsSync(EXE) ? EXE : undefined });

const EMO = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u;
const TEXT_SPACING = `* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }`;
const CANON = ['container', 'page-header__title', 'btn', 'nav-item', 'field__input', 'card', 'pill', 'choice'];

const rows = [];
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const shots = {};

for (const page of PAGES) {
  const r = { page, errors: [], overflow375: 0, zoom: 0, spacing: 0, clipped: 0, iconsBroken: 0, emoji: 0, canon: 0 };
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, serviceWorkers: 'block' });
  await ctx.addInitScript(() => localStorage.setItem('pe_active_pair', 'es-en'));
  const pg = await ctx.newPage();
  pg.on('pageerror', e => r.errors.push(String(e.message).slice(0, 80)));

  try {
    await pg.goto(`http://localhost:${PORT}/${page}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await pg.waitForTimeout(2800);

    const base = await pg.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    r.overflow375 = Math.max(0, base.sw - base.cw);

    // iconos sin resolver + emoji renderizado + adopcion
    Object.assign(r, await pg.evaluate((emoSrc) => {
      const RE = new RegExp(emoSrc, 'u');
      let iconsBroken = 0;
      for (const u of document.querySelectorAll('svg.icon use')) {
        const svg = u.closest('svg');
        if (svg && svg.getBoundingClientRect().width > 0 && svg.getBBox().width <= 0.01) iconsBroken++;
      }
      // Emoji de CONTENIDO: viene de los datos del tema (shared/json), no del
      // chrome. Excepcion declarada, no un descuido. Ver UI-SYSTEM §4.
      const CONTENT_EMOJI = ['.ex-grid-topic-emoji', '.category-emoji', '.ml-snode__topic', '.img-topic-card__title', '.path-node__topic'];
      const clone = document.body.cloneNode(true);
      CONTENT_EMOJI.forEach(sel => clone.querySelectorAll(sel).forEach(n => n.remove()));
      const text = clone.innerText || '';
      const emoji = (text.match(new RegExp(emoSrc, 'gu')) || []).length;
      const canon = [...document.querySelectorAll('[class]')].filter(el =>
        [...el.classList].some(c => ['container','btn','nav-item','card','pill','choice','field__input','page-header__title'].includes(c))).length;
      return { iconsBroken, emoji, canon };
    }, EMO.source));

    // zoom 200%
    await pg.setViewportSize({ width: 640, height: 512 });
    await pg.waitForTimeout(500);
    const z = await pg.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    r.zoom = Math.max(0, z.sw - z.cw);

    if (SHOTS) {
      await pg.addStyleTag({ content: '* { transition: none !important; animation: none !important; }' });
      await pg.setViewportSize({ width: 1440, height: 900 });
      await pg.waitForTimeout(400);
      const buf = await pg.screenshot({ fullPage: true, animations: 'disabled', caret: 'hide' });
      const name = page.replace(/[/\\]/g, '_') + '.png';
      fs.writeFileSync(path.join(SHOTS, name), buf);
      shots[page] = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 12);
    }
    // WCAG 1.4.12
    await pg.addStyleTag({ content: TEXT_SPACING });
    await pg.waitForTimeout(500);
    r.spacing = await pg.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
    r.clipped = await pg.evaluate(() => {
      let n = 0;
      for (const el of document.querySelectorAll('body *')) {
        const cs = getComputedStyle(el);
        if (cs.overflow === 'visible' || cs.display === 'none') continue;
        // .btn-label es el patron sr-only: alto 1px a proposito
        if (el.classList.contains('btn-label') || el.classList.contains('skip-link') || el.classList.contains('visually-hidden')) continue;
        if (el.scrollHeight > el.clientHeight + 2 && cs.overflowY !== 'auto' && cs.overflowY !== 'scroll') n++;
      }
      return n;
    });

  } catch (e) {
    r.errors.push('TIMEOUT');
  }
  await ctx.close();
  rows.push(r);
}
await browser.close();
server.close();

if (SHOTS) fs.writeFileSync(path.join(SHOTS, '_hashes.json'), JSON.stringify(shots, null, 1), 'utf8');

// informe
console.log('\npagina                        err  over375  zoom  wcag  clip  iconos  emoji  canon');
let fails = 0;
for (const r of rows) {
  const bad = r.errors.length || r.overflow375 || r.zoom || r.spacing || r.clipped || r.iconsBroken || r.emoji;
  if (bad) fails++;
  console.log(
    `${r.page.padEnd(30)}` +
    `${String(r.errors.length).padStart(4)}` +
    `${String(r.overflow375).padStart(8)}` +
    `${String(r.zoom).padStart(6)}` +
    `${String(r.spacing).padStart(6)}` +
    `${String(r.clipped).padStart(6)}` +
    `${String(r.iconsBroken).padStart(8)}` +
    `${String(r.emoji).padStart(7)}` +
    `${String(r.canon).padStart(7)}` + (bad ? '  <<<' : '')
  );
}
console.log(`\npáginas con incidencia: ${fails}/${rows.length}`);

// comparacion con baseline de capturas
if (BASELINE && fs.existsSync(path.join(BASELINE, '_hashes.json'))) {
  const base = JSON.parse(fs.readFileSync(path.join(BASELINE, '_hashes.json'), 'utf8'));
  const diff = Object.keys(shots).filter(k => base[k] && base[k] !== shots[k]);
  console.log(`capturas distintas respecto a ${BASELINE}: ${diff.length}`);
  diff.forEach(d => console.log('   ' + d));
}

if (rows.some(r => r.errors.length || r.overflow375 || r.zoom || r.spacing || r.clipped || r.iconsBroken || r.emoji)) process.exit(1);
