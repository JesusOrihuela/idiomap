/* ============================================================
   hardware-states.mjs — estados que dependen de permisos/audio.
   Automatiza lo que no necesita hardware real:
     1. Permiso de notificaciones concedido.
     2. Permiso de notificaciones denegado (stub del getter).
     3. Error de audio (peticiones .mp3 abortadas).
     4. Mi Ruta con la sesión completada (seed).
   Micrófono real y fases 5-6 siguen en el checklist manual (UI-DEBT §5).
   Uso: node tests/hardware-states.mjs
   ============================================================ */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'file:///C:/Users/juanj/Downloads/PracticeEnglish/practice_english.github.io/node_modules/playwright-core/index.mjs';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const PORT = 8190;
const MIME = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.woff2':'font/woff2', '.mp3':'audio/mpeg' };
const server = http.createServer((req, res) => {
  let f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (f.endsWith('/') || f.endsWith('\\')) f = path.join(f, 'index.html');
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(PORT, r));
const launch = async () => {
  if (process.env.PW_CHROME_PATH) return chromium.launch({ executablePath: process.env.PW_CHROME_PATH });
  if (process.env.PW_CHANNEL) return chromium.launch({ channel: process.env.PW_CHANNEL });
  return chromium.launch({ executablePath: 'C:/Users/juanj/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe' });
};
const browser = await launch();

const fails = [];
const check = (ok, msg) => { console.log(`  ${ok ? 'ok   ' : 'FALLA'} ${msg}`); if (!ok) fails.push(msg); };

async function open(url, { grantNotifications, denyNotifications, blockAudio } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  if (grantNotifications) await ctx.grantPermissions(['notifications'], { origin: `http://localhost:${PORT}` });
  await ctx.addInitScript((deny) => {
    localStorage.setItem('pe_active_pair', 'es-en');
    if (deny) Object.defineProperty(Notification, 'permission', { get: () => 'denied' });
  }, !!denyNotifications);
  if (blockAudio) await ctx.route(/\.mp3(\?|$)/i, r => r.abort());
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e.message).slice(0, 80)));
  await pg.goto(`http://localhost:${PORT}${url}`, { waitUntil: 'domcontentloaded' });
  await pg.waitForTimeout(1200);
  return { ctx, pg, errs };
}

/* 1 · permiso concedido */
{
  const { ctx, pg } = await open('/progress/', { grantNotifications: true });
  const m = await pg.evaluate(() => ({
    perm: Notification.permission,
    disabled: document.getElementById('notif-toggle').disabled,
    blockHidden: document.getElementById('notif-block').classList.contains('hidden'),
  }));
  check(m.perm === 'granted' && !m.disabled && !m.blockHidden, `notificaciones concedidas: perm=${m.perm} toggle=${m.disabled ? 'disabled' : 'activo'}`);
  await ctx.close();
}

/* 2 · permiso denegado */
{
  const { ctx, pg } = await open('/progress/', { denyNotifications: true });
  const m = await pg.evaluate(() => ({
    perm: Notification.permission,
    disabled: document.getElementById('notif-toggle').disabled,
    status: document.getElementById('notif-status').textContent.trim().length,
  }));
  check(m.perm === 'denied' && m.disabled && m.status > 0, `notificaciones denegadas: perm=${m.perm} toggle=${m.disabled ? 'disabled' : 'activo'}`);
  await ctx.close();
}

/* 3 · error de audio */
{
  const { ctx, pg, errs } = await open('/dictation/', { blockAudio: true });
  await pg.locator('#topic-grid > *').first().click();
  await pg.waitForSelector('.pb-chip');
  await pg.locator('.pb-chip').first().click();
  await pg.waitForSelector('#play-btn', { state: 'visible' });
  await pg.click('#play-btn');
  await pg.waitForTimeout(800);
  check(errs.length === 0, `audio bloqueado: sin errores JS (${errs[0] || 'ok'})`);
  await ctx.close();
}

/* 4 · sesión de ruta completada */
{
  const { ctx, pg } = await open('/my-learning/');
  await pg.evaluate(() => {
    const s = PathSession.buildAndSave();
    if (!s) return;
    const k = AppLangPair.storageKey('pe_path_session');
    const d = JSON.parse(localStorage.getItem(k));
    d.position = d.queue.length;
    d.started = true;
    localStorage.setItem(k, JSON.stringify(d));
  });
  await pg.reload({ waitUntil: 'domcontentloaded' });
  await pg.waitForTimeout(1000);
  const m = await pg.evaluate(() => ({
    title: document.querySelector('.ml-cta__title') ? document.querySelector('.ml-cta__title').textContent.trim() : '',
    expected: AppLang.t('cta_done_today'),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  check(m.title === m.expected && m.overflow <= 1, `sesión completada: «${m.title}» overflow=${m.overflow}`);
  await ctx.close();
}

await browser.close();
server.close();
if (fails.length) { console.log(`\n✗ hardware-states: ${fails.length} fallo(s)`); process.exit(1); }
console.log('\n✓ hardware-states: ALL CLEAR');
