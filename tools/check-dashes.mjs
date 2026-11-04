#!/usr/bin/env node
/* Dash gate: no em dash (—) or en dash (–) in user-facing text or content.
 * Comments in JS tools are out of scope; UI strings, HTML, JSON and the manifest are.
 *
 * Usage: node tools/check-dashes.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => path.join(ROOT, p);
const files = [];
const walk = (dir, filter) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'shared/audio', 'shared/img'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, filter);
    else if (filter(e.name)) files.push(p);
  }
};
walk(R('lang'), (n) => n.endsWith('.js'));
walk(R('shared/json'), (n) => n.endsWith('.json'));
walk(ROOT, (n) => n.endsWith('.html'));
files.push(R('manifest.json'));

const fails = [];
for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    if (/[\u2013\u2014]/.test(line)) fails.push(`${path.relative(ROOT, f).replaceAll('\\', '/')}:${i + 1}: ${line.trim().slice(0, 120)}`);
  });
}
if (fails.length) {
  for (const f of fails.slice(0, 30)) console.error(`DASH ${f}`);
  console.error(`\n${fails.length} em/en dash(es) in user-facing text.`);
  process.exit(1);
}
console.log(`Dashes OK: ${files.length} user-facing files clean.`);
