#!/usr/bin/env node
/* Audio orphan gate: every .m4a in shared/audio must be referenced by content.
 *
 * check-audio-refs checks content -> audio. This is the other direction: a
 * deleted phrase/word/form (or an old slug after a text edit) must not leave
 * dead files that inflate the repo and hosting file count.
 *
 * Usage: node tools/check-audio-orphans.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const AUDIO = 'shared/audio';
const expected = new Set();

for (const pair of fs.readdirSync('shared/json/pairs')) {
  if (!fs.existsSync(`shared/json/pairs/${pair}/pair.json`)) continue;
  const meta = JSON.parse(fs.readFileSync(`shared/json/pairs/${pair}/pair.json`, 'utf8'));
  const pack = JSON.parse(fs.readFileSync(`shared/json/targets/${meta.target.code}/concepts.json`, 'utf8'));
  const byId = new Map(pack.concepts.map((c) => [c.conceptId, c]));
  const dir = `shared/json/pairs/${pair}/content`;
  if (!fs.existsSync(dir)) continue;
  for (const file of fs.readdirSync(dir)) {
    const topic = file.replace(/\.json$/, '');
    for (const row of JSON.parse(fs.readFileSync(`${dir}/${file}`, 'utf8')).phrases || []) {
      const concept = byId.get(row.conceptId);
      if (!concept) continue;
      for (const form of concept.target || []) expected.add(`${pair}/${topic}/${form.audioSlug}`);
    }
  }
}

for (const lang of fs.readdirSync('shared/json/vocab')) {
  const dir = `shared/json/vocab/${lang}`;
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    const deck = file === 'words.json'
      ? 'vocab'
      : `vocab_${file.replace(/^words-/, '').replace(/\.json$/, '')}`;
    for (const word of JSON.parse(fs.readFileSync(`${dir}/${file}`, 'utf8')).words || []) {
      expected.add(`${lang}/${deck}/${word.id}`);
      for (const variant of word.variants || []) {
        if (variant.audioSlug) expected.add(`${lang}/${deck}/${variant.audioSlug}`);
      }
    }
  }
}

const orphans = [];
(function walk(dir, rel = '') {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(full, rel ? `${rel}/${entry.name}` : entry.name); continue; }
    if (!/\.m4a$/i.test(entry.name)) continue;
    const slug = entry.name.replace(/\.m4a$/i, '').replace(/-[a-z]{2,3}_[a-z0-9]+$/i, '');
    const key = rel ? `${rel}/${slug}` : slug;
    if (!expected.has(key)) orphans.push(key);
  }
})(AUDIO);

if (orphans.length) {
  console.error(`Audio orphans: ${orphans.length} unreferenced file slug(s).`);
  for (const key of orphans.slice(0, 40)) console.error(`  ${key}`);
  if (orphans.length > 40) console.error(`  +${orphans.length - 40} more`);
  console.error('Delete them or restore the content reference.');
  process.exit(1);
}
console.log(`Audio orphans OK: ${expected.size} referenced slugs, no unreferenced audio.`);
