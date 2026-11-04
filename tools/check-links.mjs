#!/usr/bin/env node
/* check-links.mjs — enlaces internos y de navegación (estándar del proyecto).
 *
 * Reglas:
 *  1. Todo href interno resuelve a un archivo real (o a un directorio con index.html).
 *  2. Sin href="#", vacío ni javascript:.
 *  3. Un fragmento (#id) existe en el documento destino.
 *  4. El destino activo de la nav lleva aria-current con el valor correcto,
 *     y solo hay uno por página.
 *  5. Un enlace solo-icono tiene nombre accesible (aria-label o data-i18n-aria).
 *  6. target="_blank" exige rel=noopener y aviso de pestaña nueva en su nombre.
 *
 * Uso: node tools/check-links.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
let checked = 0;

const htmlFiles = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const fp = path.join(d, e.name);
    const rel = path.relative(ROOT, fp).replace(/\\/g, '/');
    if (e.isDirectory()) {
      if (/^(node_modules|\.git|docs|tools|soon|shared\/audio)$/.test(rel)) continue;
      walk(fp);
    } else if (e.name.endsWith('.html')) htmlFiles.push({ fp, rel });
  }
})(ROOT);

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\b${name}="([^"]*)"`));
  return m ? m[1] : null;
};
const ids = new Map();
for (const { fp, rel } of htmlFiles) {
  ids.set(rel, new Set([...fs.readFileSync(fp, 'utf8').matchAll(/\bid="([^"]+)"/g)].map((m) => m[1])));
}

const uiBundles = {};
for (const loc of ['es', 'en', 'de']) {
  const f = path.join(ROOT, `lang/ui/${loc}.js`);
  if (!fs.existsSync(f)) continue;
  const raw = fs.readFileSync(f, 'utf8');
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('};');
  try { uiBundles[loc] = JSON.parse(raw.slice(start, end + 1)); } catch { uiBundles[loc] = {}; }
}
const disclosure = (key) => key && ['es', 'en', 'de'].every((loc) =>
  /pestaña nueva|new tab|neue[mn] tab/i.test(String((uiBundles[loc] || {})[key] || '')));

const resolveTarget = (fromRel, clean) => {
  if (clean === '') return { rel: fromRel, file: true };
  let baseRel = null;
  if (clean.startsWith('/')) {
    // Enlace root-relative: quitar el basePath del sitio (sitio en raíz o subcarpeta).
    let site = { basePath: '/' };
    try { site = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.json'), 'utf8')); } catch { /* default */ }
    let base = String(site.basePath || '/');
    if (!base.endsWith('/')) base += '/';
    const rest = clean.startsWith(base) ? clean.slice(base.length) : clean.slice(1);
    baseRel = rest;
  } else {
    baseRel = path.relative(ROOT, path.resolve(path.dirname(path.join(ROOT, fromRel)), clean)).replace(/\\/g, '/');
  }
  const fp = path.join(ROOT, baseRel);
  if (fs.existsSync(fp) && fs.statSync(fp).isDirectory()) {
    const idx = path.join(fp, 'index.html');
    if (fs.existsSync(idx)) return { rel: baseRel.replace(/\/?$/, '/') + 'index.html', file: true };
  }
  return { rel: baseRel, file: fs.existsSync(fp) };
};

for (const { fp, rel } of htmlFiles) {
  const html = fs.readFileSync(fp, 'utf8');
  const anchors = [...html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)].map((m) => m[0]);
  const currents = [];
  for (const full of anchors) {
    checked++;
    const open = full.match(/<a\b[^>]*>/)[0];
    const href = attr(open, 'href');
    const cls = attr(open, 'class') || '';
    const target = attr(open, 'target');
    const aria = attr(open, 'aria-label');
    const i18nAria = attr(open, 'data-i18n-aria');
    const current = attr(open, 'aria-current');
    const label = `${rel}  <a href="${href}">`;

    if (href === null || href.trim() === '' || href.trim() === '#' || /^javascript:/i.test(href)) {
      problems.push(`${label} href inválido: ${JSON.stringify(href)}`);
      continue;
    }
    if (/^(?:https?:|mailto:|tel:|data:)/i.test(href)) {
      if (target === '_blank' && !/noopener/.test(attr(open, 'rel') || '')) {
        problems.push(`${label} target=_blank sin rel=noopener`);
      }
      if (target === '_blank' && !(aria && /new tab|pestaña|tab/i.test(aria)) && !disclosure(i18nAria)) {
        problems.push(`${label} target=_blank sin aviso de pestaña nueva (${i18nAria || 'sin i18n'})`);
      }
    } else {
      const [rawPath, fragment] = href.split('#');
      const clean = rawPath.split('?')[0];
      const targetResolved = resolveTarget(rel, clean);
      if (!targetResolved.file) {
        problems.push(`${label} destino inexistente: ${href}`);
      } else if (fragment && targetResolved.rel.endsWith('.html')) {
        if (!(ids.get(targetResolved.rel) || new Set()).has(fragment)) {
          problems.push(`${label} fragmento inexistente: #${fragment} en ${targetResolved.rel}`);
        }
      }
    }

    if (/nav-item--active/.test(cls)) {
      currents.push(current);
      const expected = /nav-item--active-path/.test(cls) ? 'true' : 'page';
      if (current !== expected) problems.push(`${label} nav activa con aria-current="${current}" (esperado "${expected}")`);
    }
    const inner = full.slice(open.length);
    const withoutSvg = inner.replace(/<svg\b[\s\S]*?<\/svg>/g, '').trim();
    if (/<svg\b/.test(inner) && withoutSvg === '' && !aria && !i18nAria) {
      problems.push(`${label} enlace solo-icono sin nombre accesible`);
    }
  }
  if (currents.length > 1) problems.push(`${rel}  ${currents.length} aria-current en la misma página`);
}

console.log(`check-links: ${htmlFiles.length} páginas, ${checked} enlaces`);
if (problems.length) {
  console.log(`\n${problems.length} problema(s):`);
  problems.slice(0, 40).forEach((p) => console.log('  ' + p));
  if (problems.length > 40) console.log(`  ... y ${problems.length - 40} más`);
  process.exit(1);
}
console.log('✓ check-links: ALL CLEAR');
