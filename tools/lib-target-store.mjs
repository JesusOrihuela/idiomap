/* Canonical target-language store.
 *
 * Buckets are the authoring source of truth; concepts.json is a generated
 * aggregate kept for compatibility with the existing tools. The runtime never
 * reads either file: runtime/<pair>/<topic>.json is materialized.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TARGET_ROOT = path.join(ROOT, 'shared/json/targets');

export function bucketFor(id) {
  return crypto.createHash('sha256').update(String(id)).digest('hex').slice(0, 2);
}

export function bucketPath(tag, bucket) {
  return path.join(TARGET_ROOT, tag, 'buckets', `${bucket}.json`);
}

const cache = new Map();

/** Map<conceptId, { conceptId, id, target }> for one target tag. */
export function loadTargetLanguage(tag) {
  if (cache.has(tag)) return cache.get(tag);
  const out = new Map();
  const dir = path.join(TARGET_ROOT, tag, 'buckets');
  if (fs.existsSync(dir)) {
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
      const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      for (const [id, concept] of Object.entries(data.concepts || {})) {
        if (out.has(id)) throw new Error(`targets/${tag}: duplicate concept ${id} across buckets`);
        out.set(id, concept);
      }
    }
  }
  cache.set(tag, out);
  return out;
}

export function saveTargetLanguage(tag, concepts) {
  const buckets = new Map();
  for (const [conceptId, concept] of concepts) {
    const b = bucketFor(conceptId);
    if (!buckets.has(b)) buckets.set(b, {});
    buckets.get(b)[conceptId] = concept;
  }
  const dir = path.join(TARGET_ROOT, tag, 'buckets');
  fs.mkdirSync(dir, { recursive: true });
  const expected = new Set();
  for (const b of [...buckets.keys()].sort()) {
    const rel = path.join(dir, `${b}.json`);
    expected.add(`${b}.json`);
    const data = {
      schemaVersion: 1,
      tag,
      bucket: b,
      concepts: Object.fromEntries(Object.entries(buckets.get(b)).sort(([a], [c]) => a.localeCompare(c))),
    };
    fs.writeFileSync(rel, JSON.stringify(data, null, 2) + '\n');
  }
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    if (!expected.has(f)) fs.unlinkSync(path.join(dir, f));
  }
  const aggregate = {
    schemaVersion: 1,
    tag,
    concepts: [...concepts.values()].sort((a, b) => a.conceptId.localeCompare(b.conceptId)),
  };
  fs.writeFileSync(path.join(TARGET_ROOT, tag, 'concepts.json'), JSON.stringify(aggregate, null, 2) + '\n');
  cache.delete(tag);
}

export function clearTargetCache() {
  cache.clear();
}
