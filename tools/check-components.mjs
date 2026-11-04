/* ============================================================
   check-components.mjs — gate de estandarización de componentes
   ------------------------------------------------------------
   Seis comprobaciones sobre la capa canónica (shared/css/components.css):
     override    CSS de página que pisa atributos visuales de un componente
     duplicate   dos reglas base para la misma clase (fuera de @media)
     state       interactivos sin :hover/:focus-visible/:disabled
     unstyled    clases usadas en HTML/JS sin ninguna regla
     important   !important fuera de utilidades
     button-class <button> sin clase de control (heredaria el boton nativo)

   Uso:  node tools/check-components.mjs [--write-baseline]
   Sale con 1 si alguna métrica sube o aparece un override nuevo.
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
process.chdir(ROOT);
const WRITE = process.argv.includes('--write-baseline');
const BASELINE_FILE = 'tools/components-baseline.json';

const CSS_FILES = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = (dir === '.' ? e.name : dir + '/' + e.name).replace(/\\/g, '/');
    if (e.isDirectory()) { if (/^(node_modules|\.git|docs|tools)$/.test(e.name)) continue; walk(p); }
    else if (e.name.endsWith('.css')) CSS_FILES.push(p);
  }
})('.');

const read = f => fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** Reglas con contexto: media = dentro de @media */
function parseRules(file) {
  const text = read(file);
  const rules = [];
  const stack = [];
  let i = 0, start = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '{') {
      const prelude = text.slice(start, i).replace(/\s+/g, ' ').trim();
      const isAt = prelude.startsWith('@');
      stack.push(isAt ? prelude : 'rule');
      if (!isAt) {
        // cuerpo hasta el cierre de esta regla
        let depth = 1, j = i + 1;
        while (j < text.length && depth > 0) { if (text[j] === '{') depth++; else if (text[j] === '}') depth--; j++; }
        const body = text.slice(i + 1, j - 1);
        const at = stack.slice(0, -1).filter(s => s !== 'rule');
        rules.push({
          file, sel: prelude, body,
          props: body.split(';').map(x => x.trim().split(':')[0].trim()).filter(Boolean),
          inMedia: at.length > 0,
          at,
        });
        i = j; start = i; continue;
      }
      i++; start = i; continue;
    }
    if (ch === '}') { stack.pop(); i++; start = i; continue; }
    i++;
  }
  return rules;
}

const VISUAL = /^(color|background|background-color|border|border-(top|right|bottom|left|color|width|style|radius)|border-radius|box-shadow|font|font-(size|weight|family|style)|padding|padding-(top|right|bottom|left)|margin|margin-(top|right|bottom|left)|gap|row-gap|column-gap|display|align-items|justify-content|flex|flex-direction|flex-wrap|grid|grid-template-.*|width|height|min-.*|max-.*|line-height|letter-spacing|text-transform|opacity|transition|transform|position|top|left|right|bottom|z-index)$/;

const allRules = CSS_FILES.flatMap(parseRules);
const canonical = new Set(
  allRules.filter(r => r.file === 'shared/css/components.css' && /^\.[a-z][a-z0-9_-]*$/.test(r.sel)).map(r => r.sel.slice(1))
);

// 1 · overrides desde CSS de página
const overrides = [];
for (const r of allRules) {
  if (r.file === 'shared/css/components.css') continue;
  const m = r.sel.match(/^\.([a-z][a-z0-9_-]*)(::?[a-z-]+)?$/);
  if (!m || !canonical.has(m[1])) continue;
  if (r.props.some(p => VISUAL.test(p))) overrides.push({ file: r.file, cls: m[1], key: r.file + '::' + m[1] });
}

// 2 · reglas base duplicadas (mismo nivel, sin @media)
const baseCount = new Map();
for (const r of allRules) {
  if (r.file !== 'shared/css/components.css' || r.inMedia) continue;
  if (!/^\.[a-z][a-z0-9_-]*$/.test(r.sel)) continue;
  baseCount.set(r.sel.slice(1), (baseCount.get(r.sel.slice(1)) || 0) + 1);
}
const duplicates = [...baseCount.entries()].filter(([, n]) => n > 1).map(([c, n]) => ({ cls: c, n }));

// 3 · estados de interactivos
const REQUIRED = {
  'btn': ['hover', 'active', 'focus-visible', 'disabled'],
  'icon-btn': ['hover', 'active', 'focus-visible', 'disabled'],
  'field__input': ['focus-visible', 'disabled'],
  'option': ['hover', 'focus-visible', 'disabled'],
  'choice': ['hover', 'focus-visible', 'disabled'],
  'word-tile': ['hover', 'focus-visible', 'disabled'],
  'card--interactive': ['hover', 'focus-visible'],
  'nav-item': ['hover', 'focus-visible'],
  'listen-btn': ['hover', 'focus-visible', 'disabled'],
};
const stateGaps = [];
for (const [cls, need] of Object.entries(REQUIRED)) {
  const sels = allRules.filter(r => r.file === 'shared/css/components.css' && r.sel.startsWith('.' + cls)).map(r => r.sel).join(' ');
  const missing = need.filter(s => !sels.includes(':' + s));
  if (missing.length) stateGaps.push({ cls, missing });
}

// 4 · clases usadas sin regla
const defined = new Set();
for (const r of allRules) for (const m of r.sel.matchAll(/\.([a-z][a-z0-9_-]*)/g)) defined.add(m[1]);
const used = new Set();
const htmls = [];
(function walkHtml(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = (dir === '.' ? e.name : dir + '/' + e.name).replace(/\\/g, '/');
    if (e.isDirectory()) { if (/^(node_modules|\.git|docs|tools)$/.test(e.name)) continue; walkHtml(p); }
    else if (e.name.endsWith('.html')) htmls.push(p);
  }
})('.');
for (const f of htmls) for (const m of fs.readFileSync(f, 'utf8').matchAll(/class="([^"]+)"/g)) {
  for (const c of m[1].split(/\s+/)) if (/^[a-z][a-z0-9_-]*$/.test(c)) used.add(c);
}
(function walkJs(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = (dir === '.' ? e.name : dir + '/' + e.name).replace(/\\/g, '/');
    if (e.isDirectory()) { if (/^(node_modules|\.git|docs|tools)$/.test(e.name)) continue; walkJs(p); }
    else if (e.name.endsWith('.js')) {
      const s = fs.readFileSync(p, 'utf8');
      for (const m of s.matchAll(/className\s*=\s*'([^']+)'/g)) {
        for (const c of m[1].split(/\s+/)) if (/^[a-z][a-z0-9_-]*$/.test(c)) used.add(c);
      }
      for (const m of s.matchAll(/classList\.(?:add|remove|toggle)\(\s*'([^']+)'/g)) if (/^[a-z][a-z0-9_-]*$/.test(m[1])) used.add(m[1]);
    }
  }
})('.');
const IGNORE = /^(hidden|active|open|selected|disabled|is-|has-|visually-hidden|skip-link|container|page-in|no-|js-)/;
const ALLOW = fs.existsSync('tools/components-allow.json')
  ? Object.keys(JSON.parse(fs.readFileSync('tools/components-allow.json', 'utf8')).allowed || {})
  : [];
const unstyled = [...used].filter(c => !defined.has(c) && !IGNORE.test(c) && !c.endsWith('--') && !ALLOW.includes(c));

// 5 · !important (solo se permiten en utilidades y en prefers-reduced-motion)
let important = 0;
for (const r of allRules) {
  if (!/!important/.test(r.body)) continue;
  if (/prefers-reduced-motion/.test(r.body) || (r.at || []).some(a => /prefers-reduced-motion/.test(a))) continue;
  if (/^\.(hidden|visually-hidden)$/.test(r.sel)) continue;
  important += 1;
}

const report = {
  override: overrides.length,
  overrideKeys: [...new Set(overrides.map(o => o.key))].sort(),
  duplicate: duplicates.length,
  stateGaps: stateGaps.length,
  unstyled: unstyled.length,
  important,
};

// 6 · todo <button> del HTML lleva una clase de control canónica (si no, hereda el botón nativo del navegador)
const CONTROL_CLASSES = new Set(['btn', 'icon-btn', 'segmented__item', 'word-tile', 'choice', 'option', 'chip', 'nav-item', 'lp-picker-card', 'flip-hint', 'fc-back-word']);
const bareButtons = [];
for (const f of htmls) {
  for (const m of fs.readFileSync(f, 'utf8').matchAll(/<button\b([^>]*)>/g)) {
    const c = (m[1].match(/class="([^"]*)"/) || [, ''])[1];
    const tokens = c.split(/\s+/).filter(Boolean);
    if (!tokens.some(t => CONTROL_CLASSES.has(t))) bareButtons.push(`${f}  class="${c}"`);
  }
}
const details = { duplicates, stateGaps, unstyled: unstyled.sort(), overrides };

if (WRITE) {
  fs.writeFileSync(BASELINE_FILE, JSON.stringify(report, null, 2) + '\n');
  console.log(`baseline escrito en ${BASELINE_FILE}`);
}

const base = fs.existsSync(BASELINE_FILE) ? JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8')) : { override: 0, overrideKeys: [], duplicate: 0, stateGaps: 0, unstyled: 0, important: 0 };
const newKeys = report.overrideKeys.filter(k => !(base.overrideKeys || []).includes(k));
let fail = 0;
const line = (name, cur, lim, extra = '') => {
  const ok = cur <= lim && !(name === 'override' && newKeys.length);
  if (!ok) fail++;
  console.log(`  ${ok ? 'ok    ' : 'FALLO '} ${name.padEnd(12)} ${String(cur).padStart(3)}  (baseline ${lim})${extra}`);
};
console.log('── componentes ──');
line('override', report.override, base.override, newKeys.length ? `  nuevos: ${newKeys.join(', ')}` : '');
line('duplicate', report.duplicate, base.duplicate);
line('state-gaps', report.stateGaps, base.stateGaps);
line('unstyled', report.unstyled, base.unstyled);
line('important', report.important, base.important);
if (bareButtons.length) {
  fail++;
  console.log(`  FALLO  button-class  ${bareButtons.length}  (0 obligatorio)`);
}

if (fail) {
  console.log('\nDetalle:');
  if (bareButtons.length) console.log('  botones sin clase de control: ' + bareButtons.join(' · '));
  if (overrides.length) {
    console.log('  overrides:');
    for (const o of overrides) console.log(`    ${o.file}  .${o.cls}`);
  }
  if (duplicates.length) console.log('  duplicadas: ' + duplicates.map(d => '.' + d.cls).join(' '));
  if (stateGaps.length) console.log('  estados: ' + stateGaps.map(s => '.' + s.cls + ' → ' + s.missing.join('/')).join(' · '));
  if (unstyled.length) console.log('  sin regla: ' + unstyled.join(' '));
  console.log('\n✗ componentes: hay regresiones');
  process.exit(1);
}
console.log('\n✓ componentes: ALL CLEAR');
if (process.argv.includes('--details')) console.log(JSON.stringify(details, null, 1));
