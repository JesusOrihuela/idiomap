#!/usr/bin/env node
/* Audio manifest (F5): pair-scoped paths with hashes, one entry per file.
 * Source of truth for runtime resolution, dedupe and coverage.
 *
 * Usage: node tools/build-audio-manifest.mjs [--check]
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AUDIO = path.join(ROOT, 'shared/audio');
const CHECK = process.argv.includes('--check');
const OUT = path.join(AUDIO, 'manifest.json');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === 'manifest.json') continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.wav$/i.test(e.name)) files.push(p);
  }
})(AUDIO);

const entries = files.sort().map((f) => {
  const rel = path.relative(AUDIO, f).replaceAll('\\', '/');
  const parts = rel.split('/');
  const top = parts[0];
  const dir = parts[1] || '';
  const base = path.basename(f).replace(/\.wav$/i, '');
  const m = base.match(/^(.*)-([a-z]{2,3}_[a-z0-9]+)$/i);
  const slug = m ? m[1] : base;
  const voice = m ? m[2] : null;
  const isPair = top.includes('-');
  return {
    path: `shared/audio/${rel}`,
    pair: isPair ? top : null,
    target: isPair ? top.split('-')[1] : top,
    dir,
    slug,
    voice,
    bytes: fs.statSync(f).size,
    sha256: sha(fs.readFileSync(f)),
  };
});

const out = JSON.stringify({ schemaVersion: 1, generatedBy: 'tools/build-audio-manifest.mjs', count: entries.length, files: entries }, null, 2) + '\n';
if (CHECK) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;
  if (cur !== out) { console.error('DRIFT shared/audio/manifest.json'); process.exit(1); }
  console.log(`audio manifest up to date: ${entries.length} files`);
} else {
  fs.writeFileSync(OUT, out);
  console.log(`audio manifest: ${entries.length} files`);
}
