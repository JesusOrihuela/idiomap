#!/usr/bin/env node
/* Record the text hash each audio slug was generated from. Committed so a text
 * edit without regenerating audio fails CI (the runtime cache version is only a
 * second line of defence).
 *
 *   node tools/build-audio-versions.mjs [--check]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const R = (p) => path.join(ROOT, p);
const read = (p) => JSON.parse(fs.readFileSync(R(p), 'utf8'));
const exists = (p) => fs.existsSync(R(p));

const fnv = (text) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
};

const out = { schemaVersion: 1, generatedBy: 'tools/build-audio-versions.mjs', phrases: {}, vocab: {} };
const pairs = fs.readdirSync(R('shared/json/pairs')).filter((p) => exists(`shared/json/pairs/${p}/pair.json`));

for (const pair of pairs) {
  const meta = read(`shared/json/pairs/${pair}/pair.json`);
  const pack = read(`shared/json/targets/${meta.target.code}/concepts.json`);
  const byId = new Map(pack.concepts.map((c) => [c.conceptId, c]));
  const dir = `shared/json/pairs/${pair}/content`;
  if (!exists(dir)) continue;
  const topicMap = {};
  for (const f of fs.readdirSync(R(dir)).filter((x) => x.endsWith('.json'))) {
    const topic = f.replace(/\.json$/, '');
    const data = read(`${dir}/${f}`);
    const entries = {};
    for (const row of data.phrases || []) {
      const c = byId.get(row.conceptId);
      if (!c) continue;
      for (const form of c.target || []) {
        if (form.audioSlug) entries[form.audioSlug] = fnv(form.text || '');
      }
    }
    topicMap[topic] = entries;
  }
  out.phrases[pair] = topicMap;
}

for (const lang of fs.readdirSync(R('shared/json/vocab'))) {
  const dir = `shared/json/vocab/${lang}`;
  if (!fs.statSync(R(dir)).isDirectory()) continue;
  const decks = {};
  for (const f of fs.readdirSync(R(dir)).filter((x) => x.endsWith('.json'))) {
    const deck = f === 'words.json' ? 'general' : f.replace(/^words-/, '').replace(/\.json$/, '');
    const entries = {};
    for (const w of read(`${dir}/${f}`).words || []) {
      if (w.term) entries[w.id] = fnv(w.term);
      for (const v of w.variants || []) if (v.audioSlug) entries[v.audioSlug] = fnv(v.text || '');
    }
    decks[deck] = entries;
  }
  out.vocab[lang] = decks;
}

const file = 'shared/audio/versions.json';
const text = JSON.stringify(out, null, 2) + '\n';
if (CHECK) {
  const cur = exists(file) ? fs.readFileSync(R(file), 'utf8') : null;
  if (cur !== text) { console.error(`DRIFT ${file} (regenera el audio y luego este mapa)`); process.exit(1); }
  console.log('Audio versions OK: every slug matches its current text hash.');
} else {
  fs.writeFileSync(R(file), text);
  const n = Object.values(out.phrases).reduce((a, t) => a + Object.values(t).reduce((b, e) => b + Object.keys(e).length, 0), 0)
    + Object.values(out.vocab).reduce((a, d) => a + Object.values(d).reduce((b, e) => b + Object.keys(e).length, 0), 0);
  console.log(`Audio versions: ${n} slugs`);
}
