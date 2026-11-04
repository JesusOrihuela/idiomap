#!/usr/bin/env node
/* build-nav.mjs — una sola fuente para la barra de navegación.
 *
 * shared/json/nav.json define destinos e iconos; este generador reescribe el
 * bloque <nav class="mode-switcher"> de cada página que lo tenga, conservando
 * su <script> inline (relleno de etiquetas antes del primer pintado).
 *
 * Uso: node tools/build-nav.mjs
 *      node tools/build-nav.mjs --check
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const nav = JSON.parse(fs.readFileSync(path.join(ROOT, 'shared/json/nav.json'), 'utf8'));
const PREFIX = nav.prefix || '../../';

if (!Array.isArray(nav.items) || !nav.items.length) throw new Error('nav.json: sin items');
const ids = new Set();
for (const it of nav.items) {
  if (!it.id || ids.has(it.id)) throw new Error(`nav.json: id duplicado o vacío (${it.id})`);
  ids.add(it.id);
  if (it.href === '') {
    if (it.id !== 'home') throw new Error(`nav.json: solo home puede tener href vacío (${it.id})`);
  } else if (!it.href || !fs.existsSync(path.join(ROOT, it.href))) {
    throw new Error(`nav.json: href inexistente (${it.href})`);
  }
  if (!it.icon) throw new Error(`nav.json: ${it.id} sin icono`);
  if (!it.i18n && !it.ariaKey) throw new Error(`nav.json: ${it.id} sin nombre accesible`);
}
if (!nav.items.some((it) => it.id === 'home')) throw new Error('nav.json: falta home');

const pages = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const fp = path.join(d, e.name);
    const rel = path.relative(ROOT, fp).replace(/\\/g, '/');
    if (e.isDirectory()) {
      if (/^(node_modules|\.git|docs|tools|soon|shared\/audio)$/.test(rel)) continue;
      walk(fp);
    } else if (e.name.endsWith('.html')) {
      const html = fs.readFileSync(fp, 'utf8');
      if (html.includes('<nav class="mode-switcher"')) pages.push({ fp, rel, html });
    }
  }
})(ROOT);

const activeFrom = (html) => {
  const a = html.match(/<a\b[^>]*class="nav-item nav-item--active(?:-path)?[^"]*"[^>]*>/);
  if (!a) return { href: null, path: false };
  const href = (a[0].match(/href="([^"]+)"/) || [])[1] || null;
  return { href, path: /nav-item--active-path/.test(a[0]) };
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');

function render(items, active) {
  const lines = items.map((it) => {
    const isActive = active.href && (it.match || it.id)
      && active.href.includes(it.match || it.id);
    const cls = 'nav-item' + (isActive ? (active.path ? ' nav-item--active-path active' : ' nav-item--active active') : '');
    const ariaCurrent = isActive ? ` aria-current="${active.path ? 'true' : 'page'}"` : '';
    const dataNav = it.dataNav ? ` data-nav="${it.dataNav}"` : '';
    const aria = it.ariaLabel ? ` aria-label="${esc(it.ariaLabel)}"` : '';
    const i18nAria = it.ariaKey ? ` data-i18n-aria="${it.ariaKey}"` : '';
    const icon = `<a href="${PREFIX}${it.href}" class="${cls}"${dataNav}${aria}${i18nAria}${ariaCurrent}><svg class="icon" aria-hidden="true"><use href="#i-${it.icon}"/></svg>`;
    if (it.i18n) {
      return `${icon} <span class="btn-label" data-i18n="${it.i18n}">${esc(it.label || '')}</span></a>`;
    }
    return `${icon}</a>`;
  });
  return lines.join('\n        ');
}

let drift = 0;
for (const { fp, rel, html } of pages) {
  const active = activeFrom(html);
  const generated = render(nav.items, active);
  const re = /([ \t]*)<nav class="mode-switcher"[\s\S]*?<\/nav>/m;
  const m = html.match(re);
  if (!m) continue;
  const script = (m[0].match(/<script>[\s\S]*?<\/script>/) || [''])[0];
  const block = `${m[1]}<nav class="mode-switcher" aria-label="Modos de práctica" data-i18n-aria="nav_modes_aria">
        ${generated}
    ${script}
    ${m[1]}</nav>`;
  const next = html.replace(re, block);
  if (next === html) continue;
  drift++;
  if (CHECK) { console.log(`drift  ${rel}`); continue; }
  fs.writeFileSync(fp, next);
  console.log(`wrote  ${rel}`);
}

if (CHECK && drift) {
  console.log(`\n${drift} página(s) desactualizada(s): node tools/build-nav.mjs`);
  process.exit(1);
}
console.log(CHECK ? '✓ nav: sin deriva' : `nav: ${drift} página(s) actualizada(s)`);
