#!/usr/bin/env node
/* Build the content graph used by gates (not loaded by the app).
 *
 * Sources: pairs/<id>/{pair,topics}.json, content/<topic>.json,
 *          source-texts/<lang>/, targets/<tag>/concepts.json,
 *          vocab/<tag>/words-*.json, pairs/<id>/grammar-rules.json.
 *
 *   node tools/build-content-index.mjs          # write
 *   node tools/build-content-index.mjs --check  # fail on drift / invalid refs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sourceText } from './lib-source-store.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const R = (p) => path.join(ROOT, p);
const read = (p) => JSON.parse(fs.readFileSync(R(p), 'utf8'));
const exists = (p) => fs.existsSync(R(p));
const sortObj = (entries) => Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b)));

const failures = [];
const fail = (msg) => failures.push(msg);

const pairDirs = fs.readdirSync(R('shared/json/pairs'), { withFileTypes: true })
  .filter((e) => e.isDirectory() && exists(`shared/json/pairs/${e.name}/pair.json`))
  .map((e) => e.name)
  .sort();

// A phrase id is also a raw SRS card key for Speaking. If it starts with a
// prefixed activity namespace, reporting/notification code misclassifies it.
const ACTIVITY_PREFIXES = ['dict_', 'cloze_', 'trans_', 'scramble_', 'vocab_', 'quiz_', 'grammar_'];

const conceptCache = new Map();
const usedConcepts = new Map();
function conceptsFor(tag) {
  if (conceptCache.has(tag)) return conceptCache.get(tag);
  const data = read(`shared/json/targets/${tag}/concepts.json`);
  const map = new Map(data.concepts.map((c) => [c.conceptId, c]));
  const ids = new Set();
  const conceptIds = new Set();
  for (const c of data.concepts) {
    if (ids.has(c.id)) fail(`targets/${tag}: duplicate id ${c.id}`);
    ids.add(c.id);
    if (conceptIds.has(c.conceptId)) fail(`targets/${tag}: duplicate conceptId ${c.conceptId}`);
    conceptIds.add(c.conceptId);
    for (const p of ACTIVITY_PREFIXES) {
      if (String(c.id).startsWith(p)) fail(`targets/${tag}: id ${c.id} starts with activity prefix "${p}"`);
    }
  }
  conceptCache.set(tag, map);
  return map;
}

const pairs = {};
const vocab = {};
const counts = { pairs: 0, topics: 0, phrases: 0, words: 0, rules: 0, forms: 0 };

for (const pair of pairDirs) {
  const meta = read(`shared/json/pairs/${pair}/pair.json`);
  const topicsFile = read(`shared/json/pairs/${pair}/topics.json`);
  const concepts = conceptsFor(meta.target.code);
  const phraseIds = new Set();
  const topicIds = new Set();
  const orders = new Set();
  const topics = {};
  const contentDir = `shared/json/pairs/${pair}/content`;

  for (const topic of topicsFile.topics) {
    if (topicIds.has(topic.id)) fail(`${pair}: duplicate topic ${topic.id}`);
    topicIds.add(topic.id);
    if (topic.phrase) {
      if (orders.has(topic.order)) fail(`${pair}: duplicate topic order ${topic.order}`);
      orders.add(topic.order);
    }
    const file = `${contentDir}/${topic.id}.json`;
    if (!exists(file)) {
      if (topic.phrase) fail(`${pair}: missing ${file}`);
      continue;
    }
    const content = read(file);
    if (!Array.isArray(content.phrases)) fail(`${pair}/${topic.id}: old schema`);
    const phrases = [];
    const slugText = new Map();
    for (const row of content.phrases || []) {
      const c = concepts.get(row.conceptId);
      if (!c) { fail(`${pair}/${topic.id}: missing concept ${row.conceptId}`); continue; }
      if (phraseIds.has(c.id)) fail(`${pair}: duplicate phrase id ${c.id}`);
      phraseIds.add(c.id);
      if (!row.sourceId) fail(`${pair}/${topic.id}: ${c.id} missing sourceId`);
      let src = '';
      if (row.sourceId) {
        try { src = sourceText(meta.source.code, row.sourceId); }
        catch { fail(`${pair}/${topic.id}: ${c.id} sourceId ${row.sourceId} missing from source-texts/${meta.source.code}`); }
      }
      if (!row.level) fail(`${pair}/${topic.id}: ${c.id} missing level`);
      if (!usedConcepts.has(meta.target.code)) usedConcepts.set(meta.target.code, new Set());
      usedConcepts.get(meta.target.code).add(row.conceptId);
      for (const form of c.target || []) {
        if (!form.audioSlug) fail(`${pair}/${topic.id}: ${c.id} form missing audioSlug`);
        const prev = slugText.get(form.audioSlug);
        if (prev !== undefined && prev !== form.text) {
          fail(`${pair}/${topic.id}: audioSlug ${form.audioSlug} has different texts ("${prev}" / "${form.text}")`);
        } else {
          slugText.set(form.audioSlug, form.text);
        }
      }
      counts.forms += (c.target || []).length;
      phrases.push({
        id: c.id,
        conceptId: row.conceptId,
        sourceId: row.sourceId,
        level: row.level,
        source: src,
        evidence: row.evidence || [],
        levelBasis: row.levelBasis || null,
        forms: (c.target || []).map((f) => ({ text: f.text, audioSlug: f.audioSlug, labels: f.labels || null })),
      });
      counts.phrases++;
    }
    if (topic.phrase) {
      topics[topic.id] = {
        order: topic.order,
        level: topic.level || null,
        phrase: !!topic.phrase,
        vocab: !!topic.vocab,
        phrases: phrases.sort((a, b) => a.id.localeCompare(b.id)),
      };
      counts.topics++;
    }
  }

  const rulesFile = `shared/json/pairs/${pair}/grammar-rules.json`;
  const rules = {};
  if (exists(rulesFile)) {
    const grammar = read(rulesFile);
    const catIds = new Set();
    for (const c of grammar.categories || []) {
      if (catIds.has(c.id)) fail(`${pair}: duplicate grammar category ${c.id}`);
      catIds.add(c.id);
    }
    const ruleIds = new Set();
    for (const r of grammar.rules || []) {
      if (ruleIds.has(r.id)) fail(`${pair}: duplicate grammar rule ${r.id}`);
      ruleIds.add(r.id);
      if (!catIds.has(r.category)) fail(`${pair}/${r.id}: missing category ${r.category}`);
      if (!r.level) fail(`${pair}/${r.id}: missing level`);
      rules[r.id] = {
        category: r.category,
        level: r.level,
        inventoryRef: r.inventoryRef || null,
        levelBasis: r.levelBasis || null,
        topics: r.topics || [],
      };
      counts.rules++;
    }
  }

  pairs[pair] = {
    source: meta.source.code,
    target: meta.target.code,
    quality: meta.quality || 'required',
    topics: sortObj(Object.entries(topics)),
    rules: sortObj(Object.entries(rules)),
    categories: (exists(rulesFile) ? read(rulesFile).categories || [] : []).map((c) => c.id).sort(),
  };
  counts.pairs++;
}

// Every concept in every target pack must be reachable from at least one pair.
// Orphans are dead weight in the runtime pack (downloaded on every page).
for (const tag of fs.readdirSync(R('shared/json/targets')).sort()) {
  const file = `shared/json/targets/${tag}/concepts.json`;
  if (!exists(file)) continue;
  const used = usedConcepts.get(tag) || new Set();
  for (const c of read(file).concepts || []) {
    if (!used.has(c.conceptId)) fail(`targets/${tag}: orphan concept ${c.conceptId} (not referenced by any pair)`);
  }
}

for (const lang of fs.readdirSync(R('shared/json/vocab')).sort()) {
  const dir = `shared/json/vocab/${lang}`;
  if (!fs.statSync(R(dir)).isDirectory()) continue;
  const decks = {};
  for (const file of fs.readdirSync(R(dir)).filter((f) => f.endsWith('.json')).sort()) {
    const deck = file === 'words.json' ? 'general' : file.replace(/^words-/, '').replace(/\.json$/, '');
    const words = {};
    const ids = new Set();
    for (const w of read(`${dir}/${file}`).words || []) {
      if (ids.has(w.id)) fail(`vocab/${lang}/${deck}: duplicate word id ${w.id}`);
      ids.add(w.id);
      if (!w.level) fail(`vocab/${lang}/${deck}/${w.id}: missing level`);
      if (!w.term) fail(`vocab/${lang}/${deck}/${w.id}: missing term`);
      words[w.id] = {
        level: w.level,
        evidence: w.evidence || [],
        levelBasis: w.levelBasis || null,
        translations: Object.keys(w.translations || {}).sort(),
        variants: (w.variants || []).map((v) => v.audioSlug || null).filter(Boolean),
      };
      counts.words++;
    }
    decks[deck] = sortObj(Object.entries(words));
  }
  vocab[lang] = sortObj(Object.entries(decks));
}

const out = {
  schemaVersion: 1,
  generatedBy: 'tools/build-content-index.mjs',
  counts,
  pairs: sortObj(Object.entries(pairs)),
  vocab: sortObj(Object.entries(vocab)),
};

if (failures.length) {
  for (const f of failures.slice(0, 40)) console.error(`ERROR ${f}`);
  console.error(`\n${failures.length} content-index problem(s).`);
  process.exit(1);
}

const file = 'shared/json/common/content-index.json';
const text = JSON.stringify(out, null, 2) + '\n';
if (CHECK) {
  const current = exists(file) ? fs.readFileSync(R(file), 'utf8') : null;
  if (current !== text) { console.error(`DRIFT ${file}`); process.exit(1); }
  console.log(`Content index OK: ${counts.pairs} pairs, ${counts.phrases} phrases, ${counts.words} words, ${counts.rules} rules.`);
} else {
  fs.mkdirSync(path.dirname(R(file)), { recursive: true });
  fs.writeFileSync(R(file), text);
  console.log(`Content index: ${counts.pairs} pairs, ${counts.phrases} phrases, ${counts.words} words, ${counts.rules} rules.`);
}
