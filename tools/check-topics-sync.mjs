#!/usr/bin/env node
/* The embedded topic fallbacks in shared/js/topics.js and shared/js/path.js
 * must match the owner, pairs/es-en/topics.json. They exist only so the first
 * paint has data before the async load; drift is a bug.
 *
 *   node tools/check-topics-sync.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const owner = JSON.parse(read('shared/json/pairs/es-en/topics.json')).topics;
const byId = new Map(owner.map((t) => [t.id, t]));

function extractArray(file, name) {
  const src = read(file);
  const re = new RegExp(`const ${name} = \\[([\\s\\S]*?)\\n  \\];`, 'm');
  const m = src.match(re);
  if (!m) throw new Error(`${file}: cannot find ${name}`);
  return new Function(`return [${m[1]}];`)();
}

const fails = [];
const topics = extractArray('shared/js/topics.js', '_DEFAULT_RECORDS');
const pathTopics = extractArray('shared/js/path.js', 'TOPICS');

for (const item of topics) {
  const ownerItem = byId.get(item.id);
  if (!ownerItem) { fails.push(`topics.js: ${item.id} not in topics.json`); continue; }
  for (const key of ['label', 'labelEn', 'emoji', 'phrase', 'vocab', 'level', 'order']) {
    if (key in ownerItem && item[key] !== ownerItem[key]) {
      fails.push(`topics.js: ${item.id}.${key} "${item[key]}" != "${ownerItem[key]}"`);
    }
  }
  if (ownerItem.vocab && item.vocabOrder !== ownerItem.vocabOrder) {
    fails.push(`topics.js: ${item.id}.vocabOrder "${item.vocabOrder}" != "${ownerItem.vocabOrder}"`);
  }
}
for (const item of pathTopics) {
  const ownerItem = byId.get(item.id);
  if (!ownerItem) { fails.push(`path.js: ${item.id} not in topics.json`); continue; }
  for (const key of ['label', 'labelEn', 'emoji', 'level', 'order']) {
    if (key in ownerItem && item[key] !== ownerItem[key]) {
      fails.push(`path.js: ${item.id}.${key} "${item[key]}" != "${ownerItem[key]}"`);
    }
  }
}
if (topics.length !== owner.length) fails.push(`topics.js: ${topics.length} records != ${owner.length}`);
if (pathTopics.length !== owner.filter((t) => t.phrase).length) {
  fails.push(`path.js: ${pathTopics.length} records != ${owner.filter((t) => t.phrase).length} phrase topics`);
}

// The labels users actually see come from lang/ui.js (`topic_<id>`), not from
// topics.json (which is only the fallback). Check coverage and drift there.
const uiSrc = read('lang/ui.js');
const uiMatch = uiSrc.match(/const _DATA = (\{[\s\S]*?\n  \});/);
if (!uiMatch) {
  fails.push('lang/ui.js: cannot find const _DATA');
} else {
  let data;
  try { data = new Function(`return ${uiMatch[1]};`)(); }
  catch (e) { fails.push(`lang/ui.js: cannot parse _DATA (${e.message})`); data = null; }
  if (data) {
    for (const code of Object.keys(data)) {
      for (const topic of owner) {
        const key = `topic_${topic.id}`;
        if (!(key in data[code])) {
          fails.push(`lang/ui.js [${code}]: missing ${key}`);
          continue;
        }
        if (code === 'es' && data[code][key] !== topic.label) {
          fails.push(`lang/ui.js [es] ${key} "${data[code][key]}" != topics.json label "${topic.label}"`);
        }
        if (code === 'en' && data[code][key] !== topic.labelEn) {
          fails.push(`lang/ui.js [en] ${key} "${data[code][key]}" != topics.json labelEn "${topic.labelEn}"`);
        }
      }
    }
  }
}

if (fails.length) {
  for (const f of fails.slice(0, 40)) console.error(`ERROR ${f}`);
  console.error(`\n${fails.length} topic-fallback drift(s).`);
  process.exit(1);
}
console.log(`Topic fallbacks OK: ${topics.length} records, ${pathTopics.length} path records match topics.json.`);
