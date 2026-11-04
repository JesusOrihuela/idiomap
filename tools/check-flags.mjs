/* ============================================================
   check-flags.mjs — puerta de banderas (real, escala, sin repetir)

   Invariantes:
   1. Ninguna bandera se dibuja en JS: flags.js no contiene <svg>.
   2. Cada código de FLAG_AR tiene su archivo en shared/img/flags/.
   3. La razón ancho/alto del archivo coincide con FLAG_AR (±1.5 %).
   4. Todo asset del directorio está declarado (sin huérfanos).
   5. Todo código usado (REGION_MAP, pares de idioma) existe.
   6. Cada asset es un SVG con viewBox (sin viewBox, el <img> recorta en vez de escalar).

   Uso: node tools/check-flags.mjs
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'shared/img/flags');
const read = p => fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');

const problems = [];
const fail = (rule, msg) => problems.push(`${rule}  ${msg}`);

const flagsJs = read(path.join(ROOT, 'shared/js/flags.js'));

// 1 · sin dibujos a mano
const inline = (flagsJs.match(/<svg\b|<rect\b|<path\b|<circle\b/g) || []).length;
if (inline) fail('flag-inline', `flags.js contiene ${inline} primitivas SVG dibujadas a mano`);

// 2 · FLAG_AR
const arBlock = flagsJs.match(/const FLAG_AR = \{([\s\S]*?)\};/);
if (!arBlock) { console.log('check-flags: no se encontró FLAG_AR en flags.js'); process.exit(1); }
const DECLARED = {};
for (const m of arBlock[1].matchAll(/([a-z]{2}):\s*([\d.]+)/g)) DECLARED[m[1]] = +m[2];

const arOf = svg => {
  const vb = (svg.match(/viewBox="([^"]+)"/) || [])[1];
  if (vb) { const p = vb.split(/[\s,]+/).map(Number); if (p[2] && p[3]) return p[2] / p[3]; }
  const w = +(svg.match(/\swidth="([\d.]+)/) || [])[1];
  const h = +(svg.match(/\sheight="([\d.]+)/) || [])[1];
  return w && h ? w / h : NaN;
};

const files = fs.readdirSync(DIR).filter(f => f.endsWith('.svg')).map(f => f.replace(/\.svg$/, ''));
for (const code of Object.keys(DECLARED)) {
  const p = path.join(DIR, code + '.svg');
  if (!fs.existsSync(p)) { fail('flag-file', `${code}: falta shared/img/flags/${code}.svg`); continue; }
  const svg = read(p);
  if (!/viewBox=/.test(svg)) fail('flag-viewbox', `${code}: sin viewBox`);
  const ar = arOf(svg);
  const want = DECLARED[code];
  if (!(Math.abs(ar - want) / want < 0.015)) {
    fail('flag-ar', `${code}: archivo ${ar.toFixed(3)} vs FLAG_AR ${want.toFixed(3)}`);
  }
}
for (const code of files) if (!DECLARED[code]) fail('flag-orphan', `${code}.svg no está en FLAG_AR`);

// 5 · códigos usados
const regionBlock = (flagsJs.match(/const REGION_MAP = \{([\s\S]*?)\n  \};/) || [])[1] || '';
const used = new Set();
// solo los VALORES (arrays de códigos); las claves son etiquetas ('uk' → gb, no es un código)
for (const m of regionBlock.matchAll(/\[([^\]]*)\]/g)) {
  for (const c of m[1].matchAll(/'([a-z]{2})'/g)) used.add(c[1]);
}
const pairs = read(path.join(ROOT, 'shared/js/lang-pair.js'));
for (const m of pairs.matchAll(/flags:\s*\[([^\]]*)\]/g)) {
  for (const c of m[1].matchAll(/'([a-z]{2})'/g)) used.add(c[1]);
}
for (const code of used) {
  if (!DECLARED[code]) fail('flag-ref', `código '${code}' usado pero sin bandera declarada`);
}

// ── informe
const fonts = [...new Set([...used])].filter(c => DECLARED[c]).length;
console.log('\n── banderas ──');
console.log(`  assets: ${files.length} · declaradas: ${Object.keys(DECLARED).length} · usadas: ${fonts}`);
if (problems.length) {
  console.log('\nviolaciones:');
  problems.forEach(p => console.log('   ' + p));
  process.exit(1);
}
console.log('  ok     reales (0 SVG a mano) · escala (razón exacta) · referencias completas');
console.log('\n✓ banderas: ALL CLEAR');
