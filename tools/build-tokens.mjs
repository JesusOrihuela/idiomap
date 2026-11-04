/* ============================================================
   build-tokens.mjs — fuente DTCG 2025.10 → shared/css/tokens.css
   ------------------------------------------------------------
   Fuente: tokens/primitive.tokens.json + tokens/semantic.tokens.json
   Salida: shared/css/tokens.css (generado, no editar a mano)

   Uso:
     node tools/build-tokens.mjs            regenera el CSS
     node tools/build-tokens.mjs --check    falla si el CSS no coincide
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'shared/css/tokens.css');
const FILES = ['tokens/primitive.tokens.json', 'tokens/semantic.tokens.json', 'tokens/component.tokens.json', 'tokens/breakpoints.tokens.json'];
const CHECK = process.argv.includes('--check');
const KNOWN = new Set(['color', 'dimension', 'number', 'fontFamily', 'fontWeight', 'duration', 'cubicBezier', 'cssValue']);

const problems = [];
const tokens = [];   // { path, cssVar, type, value, media[], desc }

function walk(node, pathParts) {
  if (!node || typeof node !== 'object') return;
  if ('$value' in node) {
    const ext = (node.$extensions || {})['com.idiomap'] || {};
    if (ext.emit === false) return;   // solo documenta la escala (breakpoints)
    if (!ext.cssVar) { problems.push(`sin cssVar: ${pathParts.join('.')}`); return; }
    const type = node.$type || '';
    if (type && !KNOWN.has(type)) problems.push(`tipo desconocido ${type} en ${pathParts.join('.')}`);
    tokens.push({
      path: pathParts.join('.'),
      cssVar: ext.cssVar,
      type,
      value: node.$value,
      desc: node.$description || '',
      media: ext.media || [],
    });
    return;
  }
  for (const [k, v] of Object.entries(node)) {
    if (k.startsWith('$')) continue;
    walk(v, [...pathParts, k]);
  }
}

for (const f of FILES) {
  const abs = path.join(ROOT, f);
  if (!fs.existsSync(abs)) { problems.push(`falta ${f}`); continue; }
  walk(JSON.parse(fs.readFileSync(abs, 'utf8')), []);
}

/* ---- validación ---- */
const byVar = new Map();
const byPath = new Map();
for (const t of tokens) {
  if (byVar.has(t.cssVar)) problems.push(`cssVar duplicado: ${t.cssVar}`);
  if (byPath.has(t.path)) problems.push(`ruta duplicada: ${t.path}`);
  byVar.set(t.cssVar, t);
  byPath.set(t.path, t);
}
for (const t of tokens) {
  if (typeof t.value === 'string' && /^\{[^}]+\}$/.test(t.value)) {
    const target = t.value.slice(1, -1);
    if (!byPath.has(target)) problems.push(`alias roto en ${t.path} → ${target}`);
  }
}
if (problems.length) {
  console.error('TOKENS INVÁLIDOS');
  problems.forEach(p => console.error('  ' + p));
  process.exit(1);
}

/* ---- formato ---- */
const cssValueOf = t => {
  const v = t.value;
  if (typeof v === 'string' && /^\{[^}]+\}$/.test(v)) return `var(${byPath.get(v.slice(1, -1)).cssVar})`;
  switch (t.type) {
    case 'dimension': return `${v.value}${v.unit}`;
    case 'duration': return `${v.value}${v.unit || 'ms'}`;
    case 'cubicBezier': return `cubic-bezier(${v.join(', ')})`;
    case 'number':
    case 'fontWeight': return String(v);
    default: return String(v);
  }
};

const STAMP = '/* Idiomap · shared/css/tokens.css · GENERADO por tools/build-tokens.mjs · sistema: docs/UI-SYSTEM.md';
let css = STAMP + ' */\n';
css += '/* NO EDITAR A MANO: la fuente es tokens/*.tokens.json. */\n\n';
css += '@layer reset, tokens, page, components, utilities;\n\n';
css += '@layer tokens {\n';
css += '/* ============================================================================\n';
css += '   Capa 1 · Primitivos   → color, tipografía, espacio, tamaño, radio, sombra,\n';
css += '                           movimiento, capas y medidas de layout.\n';
css += '   Capa 2 · Semánticos   → el vocabulario que consumen componentes y páginas.\n';
css += '   Fuente: tokens/primitive.tokens.json + tokens/semantic.tokens.json (DTCG 2025.10)\n';
css += '   ============================================================================ */\n';

let group = '';
css += '\n:root {\n';
for (const t of tokens) {
  const parts = t.path.split('.');
  const g = parts[0] === 'color' ? 'color.' + parts[1] : parts[0];
  if (g !== group) {
    group = g;
    css += `\n  /* ── ${g} ${'─'.repeat(Math.max(0, 46 - g.length))} */\n`;
  }
  if (t.desc) css += `  /* ${t.desc.replace(/\*\//g, '* /')} */\n`;
  css += `  ${t.cssVar}: ${cssValueOf(t)};\n`;
}
css += '}\n}\n';

/* overrides por media: misma query agrupada, fuera de la capa para ganar */
const mediaOrder = [];
const mediaMap = new Map();
for (const t of tokens) {
  for (const m of t.media) {
    if (!mediaMap.has(m.query)) { mediaMap.set(m.query, []); mediaOrder.push(m.query); }
    mediaMap.get(m.query).push({ cssVar: t.cssVar, value: m.value });
  }
}
for (const q of mediaOrder) {
  css += `\n@media ${q} {\n  :root {\n`;
  for (const d of mediaMap.get(q)) css += `    ${d.cssVar}: ${d.value};\n`;
  css += '  }\n}\n';
}

/* ---- escribir o comprobar ---- */
const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
if (CHECK) {
  if (current !== css) {
    const a = current.split('\n'), b = css.split('\n');
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    console.error('tokens.css NO coincide con la fuente DTCG.');
    console.error(`  primera diferencia en la línea ${i + 1}:`);
    console.error(`    actual:    ${a[i] ?? '(fin)'}`);
    console.error(`    generado:  ${b[i] ?? '(fin)'}`);
    console.error('  ejecuta: node tools/build-tokens.mjs');
    process.exit(1);
  }
  console.log(`✓ tokens: ${tokens.length} tokens generados coinciden con tokens/*.json (${mediaOrder.length} media)`);
} else {
  fs.writeFileSync(OUT, css, 'utf8');
  console.log(`tokens: ${tokens.length} tokens → shared/css/tokens.css (${mediaOrder.length} media)`);
}
