/* Canonical source-sentence store.
 *
 * A source sentence is the L1 hint shown to the learner. Its identity is a
 * content hash of the normalized text plus language, so the same sentence is
 * stored once even when several pairs reuse it. Tools load it; the browser
 * does not: runtime/<pair>/<topic>.json carries the resolved text.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_ROOT = path.join(ROOT, 'shared/json/source-texts');

export function normalizeSource(text) {
  return String(text ?? '').normalize('NFC').trim().replace(/\s+/g, ' ');
}

export function makeSourceId(lang, text) {
  const norm = normalizeSource(text);
  const hash = crypto.createHash('sha256').update(`${lang}\0${norm}`).digest('hex').slice(0, 16);
  return `${lang}.s.${hash}`;
}

export function bucketFor(id) {
  return crypto.createHash('sha256').update(String(id)).digest('hex').slice(0, 2);
}

export function sourceBucketPath(lang, bucket) {
  return path.join(SOURCE_ROOT, lang, 'buckets', `${bucket}.json`);
}

export function sourceLanguages() {
  if (!fs.existsSync(SOURCE_ROOT)) return [];
  return fs.readdirSync(SOURCE_ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

const cache = new Map();

/** Map<sourceId, { text, origins? }> for one source language. */
export function loadSourceLanguage(lang) {
  if (cache.has(lang)) return cache.get(lang);
  const out = new Map();
  const dir = path.join(SOURCE_ROOT, lang, 'buckets');
  if (fs.existsSync(dir)) {
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
      const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      for (const [id, record] of Object.entries(data.sentences || {})) out.set(id, record);
    }
  }
  cache.set(lang, out);
  return out;
}

export function sourceText(lang, id) {
  const record = loadSourceLanguage(lang).get(id);
  if (!record) throw new Error(`source-texts/${lang}: missing ${id}`);
  return record.text;
}

export function saveSourceLanguage(lang, sentences) {
  const buckets = new Map();
  for (const [id, record] of sentences) {
    const b = bucketFor(id);
    if (!buckets.has(b)) buckets.set(b, {});
    buckets.get(b)[id] = record;
  }
  const dir = path.join(SOURCE_ROOT, lang, 'buckets');
  fs.mkdirSync(dir, { recursive: true });
  const expected = new Set();
  for (const b of [...buckets.keys()].sort()) {
    const file = path.join(dir, `${b}.json`);
    expected.add(`${b}.json`);
    const data = {
      schemaVersion: 1,
      lang,
      bucket: b,
      sentences: Object.fromEntries(Object.entries(buckets.get(b)).sort(([a], [c]) => a.localeCompare(c))),
    };
    fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  }
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    if (!expected.has(f)) fs.unlinkSync(path.join(dir, f));
  }
  cache.delete(lang);
}

export function clearSourceCache() {
  cache.clear();
}
