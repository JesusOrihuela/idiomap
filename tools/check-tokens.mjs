/* ============================================================
   check-tokens.mjs — contrato de los tokens (DTCG 2025.10)
   ------------------------------------------------------------
   1. Nivel: ningún token semántico de color lleva un hex crudo; debe aliasar
      un primitivo (única excepción declarada: --color-overlay, que es color-mix).
   2. Contraste: los pares de tokens/contrast.contract.json cumplen AA.

   Uso: node tools/check-tokens.mjs
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILES = ['tokens/primitive.tokens.json', 'tokens/semantic.tokens.json', 'tokens/component.tokens.json'];
const CONTRACT = 'tokens/contrast.contract.json';
const TIER_EXCEPTIONS = new Set(['color.semantic.overlay']);

const problems = [];
const tokens = new Map();
const componentPaths = new Set();

function walk(node, parts, isComponent) {
  if (!node || typeof node !== 'object') return;
  if ('$value' in node) {
    const p = parts.join('.');
    tokens.set(p, node);
    if (isComponent) componentPaths.add(p);
    return;
  }
  for (const [k, v] of Object.entries(node)) if (!k.startsWith('$')) walk(v, [...parts, k], isComponent);
}
for (const f of FILES) walk(JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')), [], f.endsWith('component.tokens.json'));

/* ---- 0 · nivel: un token de componente solo aliasa semánticos ---- */
for (const p of componentPaths) {
  const v = tokens.get(p).$value;
  const alias = typeof v === 'string' && /^\{color\.semantic\./.test(v);
  const cssRef = typeof v === 'string' && !v.startsWith('{') && /var\(--color-[a-z-]+\)/.test(v);
  if (!alias && !cssRef) problems.push(`tier  ${p} debe aliasar un token semántico o referenciar var(--color-*)`);
}

/* ---- 1 · regla de nivel ---- */
for (const [p, t] of tokens) {
  if (!p.startsWith('color.semantic.')) continue;
  if (TIER_EXCEPTIONS.has(p)) continue;
  const v = t.$value;
  const isAlias = typeof v === 'string' && /^\{.+\}$/.test(v);
  if (!isAlias) problems.push(`tier  ${p} debe aliasar un primitivo (valor: ${JSON.stringify(v)})`);
}

/* ---- resolución a hex ---- */
function hexOf(p, depth = 0) {
  const t = tokens.get(p);
  if (!t || depth > 8) return null;
  const v = t.$value;
  if (typeof v === 'string' && /^\{.+\}$/.test(v)) return hexOf(v.slice(1, -1), depth + 1);
  return typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : null;
}
const lum = h => {
  const c = h.slice(1).match(/../g).map(x => parseInt(x, 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const l1 = lum(a), l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

/* ---- 2 · contraste ---- */
const contract = JSON.parse(fs.readFileSync(path.join(ROOT, CONTRACT), 'utf8'));
const rows = [];
for (const pair of contract.pairs) {
  const fg = hexOf(pair.fg), bg = hexOf(pair.bg);
  if (!fg || !bg) { problems.push(`contraste  ${pair.fg} / ${pair.bg} no resuelve a hex`); continue; }
  const r = ratio(fg, bg);
  const ok = r >= pair.min;
  rows.push({ ...pair, ratio: r, ok });
  if (!ok) problems.push(`contraste  ${pair.fg} sobre ${pair.bg} = ${r.toFixed(2)} < ${pair.min} (${pair.use})`);
}

for (const r of rows) {
  console.log(`  ${r.ok ? 'ok  ' : 'FALLA'} ${r.ratio.toFixed(2).padStart(6)}  ${r.fg} sobre ${r.bg}`);
}

if (problems.length) {
  console.error('\nTOKENS: contrato incumplido');
  problems.forEach(p => console.error('  ' + p));
  process.exit(1);
}
console.log(`\n✓ tokens: ${tokens.size} declarados · ${rows.length} pares de contraste AA · nivel semántico sin hex crudo`);
