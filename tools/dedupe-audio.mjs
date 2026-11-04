#!/usr/bin/env node
/* Find exact-duplicate audio files whose slugs are DIFFERENT terms (F0's 69 groups)
 * and, with --apply, remove them so the TTS generator can recreate each term from
 * its own text. A safety copy is written under the OS temp dir.
 *
 * Usage: node tools/dedupe-audio.mjs [--apply]
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AUDIO = path.join(ROOT, 'shared/audio');
const APPLY = process.argv.includes('--apply');
const BACKUP = path.join(os.tmpdir(), 'opencode', 'idiomap-audio-duplicates');
const stem = (f) => path.basename(f).replace(/\.wav$/i, '').replace(/-[a-z]{2,3}_[a-z0-9]+$/i, '');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

// Same pronunciation, different spelling: identical audio is correct.
const HOMOPHONES = new Set([
  'peace|piece', 'wait|weight', 'sea|see',
]);

const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.wav$/i.test(e.name)) files.push(p);
  }
})(AUDIO);

const byHash = new Map();
for (const f of files) {
  const h = sha(fs.readFileSync(f));
  if (!byHash.has(h)) byHash.set(h, []);
  byHash.get(h).push(f);
}

const groups = [];
const decks = new Set();
for (const [hash, paths] of byHash) {
  if (paths.length < 2) continue;
  const stems = [...new Set(paths.map(stem))];
  if (stems.length < 2) continue; // same term in two decks = legitimate reuse
  if (stems.length === 2 && HOMOPHONES.has(stems.sort().join('|'))) continue;
  groups.push({ hash, paths: paths.map((p) => path.relative(ROOT, p).replaceAll('\\', '/')) });
  for (const p of paths) {
    const rel = path.relative(AUDIO, p).split(path.sep);
    decks.add(`${rel[0]}/${rel[1]}`);
  }
}

console.log(`duplicate groups (different terms): ${groups.length}`);
console.log(`files: ${groups.reduce((n, g) => n + g.paths.length, 0)}`);
console.log(`decks: ${[...decks].sort().join(', ')}`);
if (!APPLY) {
  fs.mkdirSync(path.join(ROOT, 'docs/F0'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'docs/F0/audio-duplicates.json'), JSON.stringify({ groups, decks: [...decks].sort() }, null, 2) + '\n');
  console.log('dry run: wrote docs/F0/audio-duplicates.json');
  if (process.argv.includes('--gate') && groups.length) process.exit(1);
  process.exit(0);
}

for (const g of groups) for (const rel of g.paths) {
  const src = path.join(ROOT, rel);
  const dst = path.join(BACKUP, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  fs.unlinkSync(src);
}
console.log(`removed ${groups.reduce((n, g) => n + g.paths.length, 0)} files; backup: ${BACKUP}`);
