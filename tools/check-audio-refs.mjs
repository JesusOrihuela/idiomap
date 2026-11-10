#!/usr/bin/env node
/* Audio reference gate (F5): every phrase form and vocab word has an audio file
 * in the expected directory. Exact-match by slug prefix, so a voice suffix is
 * accepted; no content is generated or moved.
 *
 * Usage: node tools/check-audio-refs.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTopic } from './lib-content.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => path.join(ROOT, p);
const index = JSON.parse(fs.readFileSync(R('shared/json/languages/index.json'), 'utf8'));
const pairManifests = fs.readdirSync(R('shared/json/pairs'), { withFileTypes: true })
  .filter((e) => e.isDirectory() && fs.existsSync(R(`shared/json/pairs/${e.name}/pair.json`)))
  .map((e) => JSON.parse(fs.readFileSync(R(`shared/json/pairs/${e.name}/pair.json`), 'utf8')));
const fails = [];

const audioFiles = (dir) => new Set(
  fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && /\.(wav|mp3|m4a)$/i.test(e.name))
    .map((e) => e.name.replace(/\.(wav|mp3|m4a)$/i, '')) : []
);

for (const pair of pairManifests) {
  if (pair.wip) continue;
  const pairAudio = R(`shared/audio/${pair.id}`);
  const topics = JSON.parse(fs.readFileSync(R(`shared/json/pairs/${pair.id}/topics.json`), 'utf8')).topics.filter((t) => t.phrase);
  for (const t of topics) {
    const data = loadTopic(pair.id, t.id);
    const topic = t.id;
    const files = audioFiles(path.join(pairAudio, topic));
    for (const phrase of data.phrases) {
      for (const form of phrase.target || []) {
        if (!form.audioSlug) { fails.push(`[${pair.id}/${topic}] ${phrase.id}: form without audioSlug`); continue; }
        const hit = [...files].some((f) => f === form.audioSlug || f.startsWith(form.audioSlug + '-'));
        if (!hit) fails.push(`[${pair.id}/${topic}] ${phrase.id}: missing audio for ${form.audioSlug}`);
      }
    }
  }
}

// Vocab: each deck has its own folder, and every variant slug is checked too.
for (const lang of fs.readdirSync(R('shared/json/vocab'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)) {
  const vocabAudio = R(`shared/audio/${lang}`);
  if (!fs.existsSync(vocabAudio)) continue;
  for (const f of fs.readdirSync(R(`shared/json/vocab/${lang}`)).filter((x) => x.endsWith('.json'))) {
    const deck = f === 'words.json' ? 'vocab' : `vocab_${f.replace(/^words-/, '').replace(/\.json$/, '')}`;
    const dir = path.join(vocabAudio, deck);
    const files = new Set(fs.existsSync(dir)
      ? fs.readdirSync(dir).map((name) => name.replace(/\.(wav|mp3|m4a)$/i, ''))
      : []);
    const data = JSON.parse(fs.readFileSync(R(`shared/json/vocab/${lang}/${f}`), 'utf8'));
    for (const word of data.words || []) {
      const hit = (slug) => [...files].some((x) => x === slug || x.startsWith(slug + '-'));
      if (!hit(word.id)) fails.push(`[vocab/${lang}/${f}] ${word.id}: missing audio`);
      for (const variant of word.variants || []) {
        if (!variant.audioSlug) { fails.push(`[vocab/${lang}/${f}] ${word.id}: variant without audioSlug`); continue; }
        if (!hit(variant.audioSlug)) fails.push(`[vocab/${lang}/${f}] ${word.id}: missing variant audio ${variant.audioSlug}`);
      }
    }
  }
}

if (fails.length) {
  for (const f of fails.slice(0, 50)) console.error(`ERROR ${f}`);
  console.error(`\n${fails.length} missing audio reference(s).`);
  process.exit(1);
}
console.log(`Audio refs OK: ${pairManifests.length} pairs, ${fs.readdirSync(R('shared/json/vocab')).length} vocab languages.`);
