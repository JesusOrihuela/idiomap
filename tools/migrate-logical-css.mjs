#!/usr/bin/env node
/* Convert physical horizontal CSS properties to logical ones (F4).
 * All active languages are LTR, so this is a no-op visually; it prepares RTL.
 *
 * Usage: node tools/migrate-logical-css.mjs [--check]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.css')) files.push(p);
  }
})(ROOT);

function convert(text) {
  return text
    .replace(/\b(margin|padding|border)-(left|right)\b/g, (_, prop, side) =>
      `${prop}-inline-${side === 'left' ? 'start' : 'end'}`)
    .replace(/\btext-align:\s*(left|right)\b/g, (_, side) =>
      `text-align: ${side === 'left' ? 'start' : 'end'}`)
    .replace(/\bfloat:\s*(left|right)\b/g, (_, side) =>
      `float: ${side === 'left' ? 'inline-start' : 'inline-end'}`)
    .replace(/(^|[;{]\s*)(left|right):/g, (_, pre, side) =>
      `${pre}inset-inline-${side === 'left' ? 'start' : 'end'}:`);
}

const drift = [];
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const out = convert(src);
  if (out === src) continue;
  if (CHECK) drift.push(path.relative(ROOT, f).replaceAll('\\', '/'));
  else fs.writeFileSync(f, out);
}
if (CHECK) {
  if (drift.length) { for (const f of drift) console.error(`PHYSICAL ${f}`); process.exit(1); }
  console.log(`logical-css: ${files.length} CSS files clean`);
} else {
  console.log(`logical-css: converted ${drift.length || files.length} files`);
}
