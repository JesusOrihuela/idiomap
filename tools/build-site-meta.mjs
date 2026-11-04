#!/usr/bin/env node
/* build-site-meta.mjs — una sola fuente para origen, canonical, sitemap, robots,
 * manifest y CNAME.
 *
 *   site.json: { origin, basePath, host, customDomain }
 *     host: "github-pages" (escribe CNAME si hay customDomain) | "cloudflare"
 *
 * Descubre las páginas desde el sistema de archivos: una página nueva entra en
 * canonical y sitemap sin tocar este script.
 *
 * Uso: node tools/build-site-meta.mjs
 *      node tools/build-site-meta.mjs --check
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.json'), 'utf8'));
const origin = String(site.origin || '').replace(/\/+$/, '');
let base = String(site.basePath || '/');
if (!base.startsWith('/')) base = '/' + base;
if (!base.endsWith('/')) base += '/';
if (!/^https:\/\/[^/]+$/.test(origin)) throw new Error('site.json: origin inválido');

const ORDER = [
  'index.html',
  'speaking/index.html', 'dictation/index.html', 'cloze/index.html',
  'translation/index.html', 'scramble/index.html', 'vocabulary/index.html',
  'quiz/index.html', 'grammar/index.html',
  'my-learning/index.html', 'progress/index.html', 'placement/index.html',
];

const pages = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const fp = path.join(d, e.name);
    const rel = path.relative(ROOT, fp).replace(/\\/g, '/');
    if (e.isDirectory()) {
      if (/^(node_modules|\.git|docs|tools|soon|shared\/audio)$/.test(rel)) continue;
      if (e.name === 'html') continue; // stubs de redirección, no son páginas públicas
      walk(fp);
    } else if (e.name.endsWith('.html')) {
      pages.push(rel);
    }
  }
})(ROOT);

// Ruta pública: x/index.html -> x/ ; index.html raíz -> '' ; resto -> archivo.
const urlPath = (rel) => {
  if (rel === 'index.html') return '';
  if (rel.endsWith('/index.html')) return rel.slice(0, -'index.html'.length);
  return rel;
};
const publicUrl = (rel) => origin + base + urlPath(rel);

const rank = (rel) => {
  const i = ORDER.indexOf(rel);
  return i === -1 ? ORDER.length + 1 : i;
};
const ordered = [...pages].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));

const PRIORITY = (rel) => rel === 'index.html' ? '1.0'
  : /^(speaking|dictation|cloze|translation|scramble|vocabulary|quiz|grammar)\//.test(rel) ? '0.9'
  : '0.8';

function setTag(html, re, tag) {
  if (re.test(html)) return html.replace(re, tag);
  return html.replace(/<\/title>/, (m) => m + '\n    ' + tag);
}

const expect = new Map();
for (const rel of ordered) {
  const fp = path.join(ROOT, rel);
  let html = fs.readFileSync(fp, 'utf8');
  html = setTag(html, /<link rel="canonical" href="[^"]*">/,
    `<link rel="canonical" href="${publicUrl(rel)}">`);
  if (/property="og:url"/.test(html)) {
    html = setTag(html, /<meta property="og:url" content="[^"]*">/,
      `<meta property="og:url" content="${publicUrl(rel)}">`);
  }
  if (/property="og:image"/.test(html)) {
    html = setTag(html, /<meta property="og:image" content="[^"]*">/,
      `<meta property="og:image" content="${origin}${base}index/img/og-image.jpg">`);
  }
  expect.set(rel, html);
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ordered.map((rel) => `  <url>
    <loc>${publicUrl(rel)}</loc>
    <priority>${PRIORITY(rel)}</priority>
    <changefreq>${rel === 'index.html' ? 'weekly' : 'monthly'}</changefreq>
  </url>`).join('\n')}
</urlset>
`;
const robots = `User-agent: *
Allow: /
Disallow: /soon/

Sitemap: ${origin}${base}sitemap.xml
`;

const manifestPath = path.join(ROOT, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.start_url = './';
manifest.scope = './';
const manifestOut = JSON.stringify(manifest, null, 4) + '\n';

const writes = [
  ...[...expect.entries()],
  ['sitemap.xml', sitemap],
  ['robots.txt', robots],
  ['manifest.json', manifestOut],
];
// CNAME solo lo usa GitHub Pages; Cloudflare Pages configura el dominio en su panel.
if (site.customDomain && site.host === 'github-pages') {
  writes.push(['CNAME', site.customDomain + '\n']);
}

let drift = 0;
for (const [rel, content] of writes) {
  const fp = path.join(ROOT, rel);
  const current = fs.existsSync(fp) ? fs.readFileSync(fp, 'utf8') : null;
  if (current === content) continue;
  drift++;
  if (CHECK) { console.log(`drift  ${rel}`); continue; }
  fs.writeFileSync(fp, content);
  console.log(`wrote  ${rel}`);
}

if (CHECK && drift) {
  console.log(`\n${drift} archivo(s) desactualizado(s): node tools/build-site-meta.mjs`);
  process.exit(1);
}
console.log(CHECK ? '✓ site-meta: sin deriva' : `site-meta: ${drift} archivo(s) actualizado(s)`);
