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
    .filter((e) => e.isFile() && /\.(wav|mp3)$/i.test(e.name))
    .map((e) => e.name.replace(/\.(wav|mp3)$/i, '')) : []
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

// Vocab: audio lives under audio/<lang>/vocab*/word-voice.wav.
for (const lang of fs.readdirSync(R('shared/json/vocab'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)) {
  const vocabAudio = R(`shared/audio/${lang}`);
  if (!fs.existsSync(vocabAudio)) continue;
  const files = new Set();
  for (const d of fs.readdirSync(vocabAudio, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    for (const name of fs.readdirSync(path.join(vocabAudio, d.name))) files.add(name.replace(/\.(wav|mp3)$/i, ''));
  }
  for (const f of fs.readdirSync(R(`shared/json/vocab/${lang}`)).filter((x) => x.endsWith('.json'))) {
    const data = JSON.parse(fs.readFileSync(R(`shared/json/vocab/${lang}/${f}`), 'utf8'));
    for (const word of data.words || []) {
      const hit = [...files].some((x) => x === word.id || x.startsWith(word.id + '-'));
      if (!hit) fails.push(`[vocab/${lang}/${f}] ${word.id}: missing audio`);
    }
  }
}

if (fails.length) {
  for (const f of fails.slice(0, 50)) console.error(`ERROR ${f}`);
  console.error(`\n${fails.length} missing audio reference(s).`);
  process.exit(1);
}
console.log(`Audio refs OK: ${pairManifests.length} pairs, ${fs.readdirSync(R('shared/json/vocab')).length} vocab languages.`);
