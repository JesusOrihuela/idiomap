#!/usr/bin/env node
/* Build the canonical source-sentence store from pair content.
 *
 *   node tools/build-source-store.mjs --migrate   # one-off: add sourceId, remove inline source
 *   node tools/build-source-store.mjs             # write source-texts/ buckets
 *   node tools/build-source-store.mjs --check     # CI: buckets are current and every ref resolves
 *
 * The source store is keyed by a content hash of (lang, normalized text). The
 * same sentence is stored once and referenced by sourceId from every pair that
 * uses it. Runtime packs resolve the text; the browser never loads this store.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeSourceId, bucketFor, normalizeSource, loadSourceLanguage } from './lib-source-store.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => path.join(ROOT, p);
const CHECK = process.argv.includes('--check');
const MIGRATE = process.argv.includes('--migrate');
const read = (p) => JSON.parse(fs.readFileSync(R(p), 'utf8'));
const exists = (p) => fs.existsSync(R(p));
const write = (p, data) => {
  fs.mkdirSync(path.dirname(R(p)), { recursive: true });
  fs.writeFileSync(R(p), JSON.stringify(data, null, 2) + '\n');
};

const pairs = fs.readdirSync(R('shared/json/pairs'), { withFileTypes: true })
  .filter((e) => e.isDirectory() && exists(`shared/json/pairs/${e.name}/pair.json`))
  .map((e) => e.name)
  .sort();

const byLang = new Map();
let changed = 0;

function addSource(lang, id, text, origins) {
  if (!byLang.has(lang)) byLang.set(lang, new Map());
  const map = byLang.get(lang);
  const prev = map.get(id);
  if (prev && normalizeSource(prev.text) !== normalizeSource(text)) {
    throw new Error(`source-texts/${lang}: ${id} has two texts ("${prev.text}" / "${text}")`);
  }
  if (!prev) map.set(id, { text, origins: origins || [] });
}

for (const pair of pairs) {
  const meta = read(`shared/json/pairs/${pair}/pair.json`);
  const lang = meta.source.code;
  const dir = `shared/json/pairs/${pair}/content`;
  if (!exists(dir)) continue;
  for (const file of fs.readdirSync(R(dir)).filter((f) => f.endsWith('.json')).sort()) {
    const rel = `${dir}/${file}`;
    const data = read(rel);
    let dirty = false;
    if (MIGRATE && data.schemaVersion !== 3) { data.schemaVersion = 3; dirty = true; changed++; }
    for (const row of data.phrases || []) {
      const conceptId = row.conceptId;
      let id = row.sourceId;
      if (row.source) {
        const computed = makeSourceId(lang, row.source);
        if (id && id !== computed) {
          throw new Error(`${pair}/${file}: ${conceptId} sourceId ${id} does not match its source text (${computed})`);
        }
        id = computed;
      }
      if (!id) throw new Error(`${pair}/${file}: ${conceptId} missing sourceId (run --migrate while source is inline)`);
      const existing = loadSourceLanguage(lang).get(id);
      const text = row.source || existing?.text;
      if (!text) throw new Error(`${pair}/${file}: ${conceptId} has no source text for ${id}`);
      if (makeSourceId(lang, text) !== id) {
        throw new Error(`${pair}/${file}: ${conceptId} sourceId ${id} does not match its text (${makeSourceId(lang, text)})`);
      }
      addSource(lang, id, text, existing?.origins);

      if (MIGRATE) {
        if (!row.sourceId || row.sourceId !== id) { row.sourceId = id; dirty = true; changed++; }
        if (Object.prototype.hasOwnProperty.call(row, 'source')) { delete row.source; dirty = true; changed++; }
        if (Object.prototype.hasOwnProperty.call(row, 'sourceOrigins')) { delete row.sourceOrigins; dirty = true; changed++; }
      } else {
        if (!row.sourceId) throw new Error(`${pair}/${file}: ${conceptId} missing sourceId; run build-source-store --migrate`);
        if (Object.prototype.hasOwnProperty.call(row, 'source')) {
          throw new Error(`${pair}/${file}: ${conceptId} still has inline source; run build-source-store --migrate`);
        }
      }
    }
    if (dirty) write(rel, data);
  }
}

// If a sourceId already exists but its record text is empty (idempotent runs),
// fill it from the inline text captured above.
for (const [lang, map] of byLang) {
  for (const [id, record] of map) {
    if (!record.text) throw new Error(`source-texts/${lang}: ${id} has no text`);
  }
}

// Detect duplicate normalized text that produced different ids (hash collision or
// a language-prefix mistake). One text must have one id.
for (const [lang, map] of byLang) {
  const seen = new Map();
  for (const [id, record] of map) {
    const key = normalizeSource(record.text);
    if (seen.has(key) && seen.get(key) !== id) {
      throw new Error(`source-texts/${lang}: duplicate text with ids ${seen.get(key)} and ${id}`);
    }
    seen.set(key, id);
  }
}

let files = 0;
for (const lang of [...byLang.keys()].sort()) {
  const buckets = new Map();
  for (const [id, record] of byLang.get(lang)) {
    const b = bucketFor(id);
    if (!buckets.has(b)) buckets.set(b, {});
    buckets.get(b)[id] = record;
  }
  const dir = `shared/json/source-texts/${lang}/buckets`;
  const expected = new Set();
  for (const b of [...buckets.keys()].sort()) {
    const rel = `${dir}/${b}.json`;
    expected.add(`${b}.json`);
    const data = {
      schemaVersion: 1,
      lang,
      bucket: b,
      sentences: Object.fromEntries(Object.entries(buckets.get(b)).sort(([a], [c]) => a.localeCompare(c))),
    };
    const text = JSON.stringify(data, null, 2) + '\n';
    if (CHECK) {
      if (!exists(rel) || fs.readFileSync(R(rel), 'utf8') !== text) {
        console.error(`DRIFT ${rel} (run node tools/build-source-store.mjs)`);
        process.exitCode = 1;
      }
    } else {
      write(rel, data);
      files++;
    }
  }
  if (exists(dir)) {
    for (const f of fs.readdirSync(R(dir)).filter((x) => x.endsWith('.json'))) {
      if (expected.has(f)) continue;
      if (CHECK) {
        console.error(`ORPHAN ${dir}/${f} (source no longer used; run node tools/build-source-store.mjs)`);
        process.exitCode = 1;
      } else {
        fs.unlinkSync(R(`${dir}/${f}`));
      }
    }
  }
}

if (CHECK && process.exitCode) process.exit(1);
const unique = [...byLang.values()].reduce((n, m) => n + m.size, 0);
if (CHECK) console.log(`Source store OK: ${unique} sentences across ${byLang.size} languages.`);
else console.log(`Source store: ${unique} sentences across ${byLang.size} languages, ${files} buckets${MIGRATE ? `, ${changed} field changes` : ''}.`);
