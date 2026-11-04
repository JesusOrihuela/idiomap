/* ============================================================
   tools/check-phrase-index.mjs — gate for the phrase/word index (pb-*)

   The index only exists after clicking a topic, so no other gate sees it.
   This one opens the real picker in the 7 activities at 320/390/768/1440 and
   checks the chip contract that broke with "Ver todas las variantes":

   - the main text never collapses (>= 40 px) and no chip overflows;
   - the CEFR badge and the coverage pips stay inside the chip;
   - the variant category chip is hidden at <= 400 px and shown above;
   - lang is correct per part (source phrase, target variants, target word);
   - the variant mode repaints the open list, keeping scroll and focus;
   - hover paints the four borders with the same color (normal and seen chip);
   - chip -> exercise and the empty/absent variants topic keep working.

   Runs locally with the installed Edge (or PW_CHANNEL), and in CI with
   PW_CHROME_PATH (see ci.yml e2e job), same pattern as tests/smoke.mjs.
   ============================================================ */
import { chromium } from 'playwright-core';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PW_PORT || 8198);
const BASE = `http://127.0.0.1:${PORT}`;

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.wav': 'audio/wav', '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

const server = http.createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    const fp = path.join(ROOT, p);
    if (!fp.startsWith(ROOT) || !existsSync(fp) || statSync(fp).isDirectory()) {
      res.writeHead(404); res.end('404'); return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' });
    res.end(await readFile(fp));
  } catch (e) { res.writeHead(500); res.end(String(e)); }
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

function launch() {
  const opts = { headless: true };
  if (process.env.PW_CHROME_PATH) return chromium.launch({ ...opts, executablePath: process.env.PW_CHROME_PATH });
  if (process.env.PW_CHANNEL)     return chromium.launch({ ...opts, channel: process.env.PW_CHANNEL });
  return chromium.launch({ ...opts, channel: 'msedge' });
}
const browser = await launch();

let pass = 0;
const failures = [];
function check(ok, msg) {
  if (ok) { pass++; return; }
  failures.push(msg);
}

async function newPage(width, pair = 'es-en') {
  const ctx = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: 'block' });
  await ctx.addInitScript((pair) => {
    localStorage.setItem('pe_onboarded', '1');
    localStorage.setItem('pe_dev', '1');
    localStorage.setItem('pe_active_pair', pair);
  }, pair);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  return { ctx, page, errors };
}

async function openTopic(page, act, theme) {
  await page.goto(`${BASE}/${act}/`, { waitUntil: 'domcontentloaded' });
  const sel = `.img-topic-card[data-theme="${theme}"]`;
  await page.waitForSelector(sel, { state: 'visible', timeout: 15000 }).catch(() => {});
  const card = await page.$(sel);
  if (!card) return false;
  await card.click();
  await page.waitForSelector('.pb-grid', { state: 'visible', timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(300);
  return (await page.$('.pb-grid')) !== null;
}

// Rendered contract of the open index.
const measure = () => {
  const chips = [...document.querySelectorAll('.pb-chip')];
  const r = e => e.getBoundingClientRect();
  let textMin = Infinity, cefrOut = 0, covOut = 0, chipOver = 0, subShown = 0, subLang = null;
  const langs = new Set();
  for (const c of chips) {
    const cb = r(c);
    const t = c.querySelector('.pb-chip-text');
    const s = c.querySelector('.pb-chip-sub');
    const cefr = c.querySelector('.pb-chip-cefr');
    const cov = c.querySelector('.pb-chip-cov');
    if (t) { textMin = Math.min(textMin, r(t).width); langs.add(t.getAttribute('lang') || '-'); }
    if (s && getComputedStyle(s).display !== 'none') {
      subShown++;
      subLang = s.getAttribute('lang');
    }
    if (cefr && (r(cefr).right > cb.right + 0.5 || r(cefr).left < cb.left - 0.5)) cefrOut++;
    if (cov && (r(cov).right > cb.right + 0.5 || r(cov).left < cb.left - 0.5)) covOut++;
    if (c.scrollWidth > c.clientWidth + 1) chipOver++;
  }
  const bar = document.querySelector('.pb-bar');
  const sel = document.querySelector('.pb-mode-select');
  return {
    chips: chips.length,
    textMin: Math.round(textMin),
    subShown, subLang,
    langs: [...langs].sort().join(','),
    cefrOut, covOut, chipOver,
    barH: bar ? Math.round(r(bar).height) : null,
    selW: sel ? Math.round(r(sel).width) : null,
    doc: document.documentElement.scrollWidth + '/' + document.documentElement.clientWidth,
  };
};

const ACTIVITIES = [
  ['speaking', 'phrases'], ['dictation', 'phrases'], ['cloze', 'phrases'],
  ['translation', 'phrases'], ['scramble', 'phrases'],
  ['vocabulary', 'words'], ['quiz', 'words'],
];
const WIDTHS = [320, 390, 768, 1440];

for (const [act, kind] of ACTIVITIES) {
  for (const w of WIDTHS) {
    const { ctx, page, errors } = await newPage(w);
    const tag = `${act} ${w}`;
    const opened = await openTopic(page, act, 'greetings');
    check(opened, `${tag}: el índice no abre`);
    if (opened) {
      const m = await page.evaluate(measure);
      check(m.chips > 0, `${tag}: sin chips`);
      check(m.textMin >= 40, `${tag}: texto principal de ${m.textMin}px`);
      check(m.cefrOut === 0, `${tag}: ${m.cefrOut} CEFR fuera del chip`);
      check(m.covOut === 0, `${tag}: ${m.covOut} pips fuera del chip`);
      check(m.chipOver === 0, `${tag}: ${m.chipOver} chips con desborde`);
      check(m.doc.split('/')[0] === m.doc.split('/')[1], `${tag}: desborde ${m.doc}`);
      if (kind === 'phrases') {
        check(m.langs.includes('es'), `${tag}: lang del texto (${m.langs})`);
        if (w <= 400) {
          check(m.subShown === 0, `${tag}: sub visible a ${w}px (${m.subShown})`);
        } else {
          check(m.subShown > 0, `${tag}: sin variantes visibles`);
          check(m.subLang === 'en', `${tag}: lang del sub (${m.subLang})`);
        }
      } else {
        check(m.langs.includes('en'), `${tag}: lang de la palabra (${m.langs})`);
        check(w <= 400 ? m.subShown === 0 : m.subShown > 0, `${tag}: categoría de palabra (${m.subShown})`);
      }
      if (w >= 768) {
        check(m.barH !== null && m.barH <= 84, `${tag}: barra de ${m.barH}px`);
      }
      if (kind === 'phrases' && m.selW !== null) {
        check(m.selW <= 240, `${tag}: select de ${m.selW}px`);
      }
      check(errors.length === 0, `${tag}: errores JS ${errors.join('; ')}`);
    }
    await ctx.close();
  }
}

// Topic without variants: no select, no category chip.
{
  const { ctx, page } = await newPage(768);
  const opened = await openTopic(page, 'speaking', 'airport');
  check(opened, 'airport: el índice no abre');
  if (opened) {
    const m = await page.evaluate(measure);
    check(m.subShown === 0, `airport: ${m.subShown} sub chips`);
    check((await page.$('.pb-mode-select')) === null, 'airport: select de variantes inesperado');
    check(m.cefrOut === 0 && m.chipOver === 0, 'airport: chip roto');
  }
  await ctx.close();
}

// Native target with 4 forms (de-es): the sub lists them without breaking the chip.
{
  const { ctx, page } = await newPage(1440, 'de-es');
  const opened = await openTopic(page, 'speaking', 'directions');
  check(opened, 'de-es directions: el índice no abre');
  if (opened) {
    const m = await page.evaluate(measure);
    check(m.subShown > 0, 'de-es: sin variantes visibles');
    check(m.subLang === 'es', `de-es: lang del sub (${m.subLang})`);
    check(m.chipOver === 0 && m.cefrOut === 0 && m.covOut === 0, 'de-es: chip roto con 4 formas');
  }
  await ctx.close();
}

// Variant mode repaints the open list: subs 24 -> 0, same scroll, focus on select.
for (const w of [1440, 390]) {
  const { ctx, page } = await newPage(w);
  const opened = await openTopic(page, 'speaking', 'greetings');
  check(opened, `modo ${w}: el índice no abre`);
  if (opened) {
    const sel = await page.$('.pb-mode-select');
    check(sel !== null, `modo ${w}: sin select`);
    if (sel) {
      const before = await page.evaluate(() => [...document.querySelectorAll('.pb-chip-sub')].filter(s => getComputedStyle(s).display !== 'none').length);
      await page.evaluate(() => window.scrollTo(0, 500));
      await sel.selectOption('canonical');
      await page.waitForTimeout(500);
      const after = await page.evaluate(() => ({
        subs: [...document.querySelectorAll('.pb-chip-sub')].filter(s => getComputedStyle(s).display !== 'none').length,
        focus: document.activeElement === document.querySelector('.pb-mode-select'),
        scrollY: Math.round(window.scrollY),
        value: document.querySelector('.pb-mode-select').value,
      }));
      check(w <= 400 || before > 0, `modo ${w}: sin subs antes (${before})`);
      check(after.subs === 0, `modo ${w}: ${after.subs} subs tras canónica`);
      check(after.focus, `modo ${w}: el foco no vuelve al select`);
      check(Math.abs(after.scrollY - 500) <= 2, `modo ${w}: scroll ${after.scrollY}`);
      check(after.value === 'canonical', `modo ${w}: valor ${after.value}`);
      await sel.selectOption('all');
      await page.waitForTimeout(400);
    }
  }
  await ctx.close();
}

// Hover: four equal borders on a normal chip and on a seen chip.
{
  const { ctx, page } = await newPage(1440);
  const opened = await openTopic(page, 'speaking', 'greetings');
  check(opened, 'hover: el índice no abre');
  if (opened) {
    const read = async (idx, seen) => page.evaluate(({ idx, seen }) => {
      const c = document.querySelectorAll('.pb-chip')[idx];
      if (seen) c.classList.add('pb-chip--seen');
      const s = getComputedStyle(c);
      return { colors: [s.borderTopColor, s.borderRightColor, s.borderBottomColor, s.borderLeftColor], width: s.borderLeftWidth };
    }, { idx, seen });
    await page.hover('.pb-chip:nth-of-type(2)');
    await page.waitForTimeout(250);
    const normal = await read(1, false);
    check(new Set(normal.colors).size === 1, `hover normal: ${normal.colors.join(' | ')}`);
    await page.hover('.pb-chip:nth-of-type(3)');
    await page.waitForTimeout(250);
    const seenM = await read(2, true);
    await page.hover('.pb-chip:nth-of-type(3)');
    await page.waitForTimeout(250);
    const seen = await page.evaluate(() => {
      const c = document.querySelectorAll('.pb-chip')[2];
      const s = getComputedStyle(c);
      return [s.borderTopColor, s.borderRightColor, s.borderBottomColor, s.borderLeftColor];
    });
    check(new Set(seen).size === 1, `hover visto: ${seen.join(' | ')}`);
    check(seenM.width === '3px', `hover visto: acento de ${seenM.width}`);
  }
  await ctx.close();
}

// Chip -> exercise -> back to the index; path mode skips the index.
{
  const { ctx, page } = await newPage(390);
  const opened = await openTopic(page, 'dictation', 'greetings');
  check(opened, 'ejercicio: el índice no abre');
  if (opened) {
    await page.click('.pb-chip');
    await page.waitForTimeout(900);
    const st = await page.evaluate(() => ({
      indexGone: !document.getElementById('pb-section'),
      exercise: !!document.querySelector('#exercise-area:not(.hidden)'),
    }));
    check(st.indexGone && st.exercise, 'ejercicio: el chip no abre el ejercicio');
    const back = await page.$('#back-btn');
    if (back) {
      await back.click();
      await page.waitForTimeout(600);
      check(await page.evaluate(() => !!document.getElementById('pb-section')), 'ejercicio: no vuelve al índice');
    }
  }
  await ctx.close();
}
{
  const { ctx, page } = await newPage(1440);
  await page.goto(`${BASE}/dictation/?path=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  check(await page.evaluate(() => !document.getElementById('pb-section')), 'path=1: abre el índice');
  await ctx.close();
}

await browser.close();
server.close();

if (failures.length) {
  console.log(`✗ check-phrase-index: ${failures.length} fallo(s), ${pass} ok`);
  for (const f of failures) console.log('  ✗ ' + f);
  process.exit(1);
}
console.log(`✓ check-phrase-index: ${pass} comprobaciones — ALL CLEAR`);
