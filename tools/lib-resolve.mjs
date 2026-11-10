/* Node resolver for the layered content model (schema v3).
 * Composes a legacy-shaped topic from content + source-texts + target buckets.
 * This is the single source of truth for gates and parity checks.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sourceText } from './lib-source-store.mjs';
import { loadTargetLanguage } from './lib-target-store.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => path.join(ROOT, p);
const read = (p) => JSON.parse(fs.readFileSync(R(p), 'utf8'));
const exists = (p) => fs.existsSync(R(p));

const cache = new Map();
function cached(key, fn) {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key);
}

export function pairInfo(pair) {
  return cached(`pair:${pair}`, () => read(`shared/json/pairs/${pair}/pair.json`));
}

export function targetConcepts(tag) {
  return cached(`concepts:${tag}`, () => loadTargetLanguage(tag));
}

export function resolveTopic(pair, topic) {
  const info = pairInfo(pair);
  const orderFile = `shared/json/pairs/${pair}/content/${topic}.json`;
  if (!exists(orderFile)) throw new Error(`layered order missing: ${orderFile}`);
  const order = read(orderFile);
  const concepts = targetConcepts(info.target.code);
  const phrases = order.phrases.map((row) => {
    const c = concepts.get(row.conceptId);
    if (!c) throw new Error(`${pair}/${topic}: concept ${row.conceptId} missing from targets/${info.target.code}`);
    const source = row.sourceId ? sourceText(info.source.code, row.sourceId) : row.source;
    if (!source) throw new Error(`${pair}/${topic}: source missing for ${row.conceptId}`);
    return {
      id: c.id,
      conceptId: row.conceptId,
      sourceId: row.sourceId,
      source,
      level: row.level,
      grammar: row.grammar,
      target: c.target,
    };
  });
  return { phrases };
}

export function resolveAll() {
  const pairs = fs.readdirSync(R('shared/json/pairs'), { withFileTypes: true })
    .filter((e) => e.isDirectory() && exists(`shared/json/pairs/${e.name}/pair.json`))
    .map((e) => e.name)
    .sort();
  const out = {};
  for (const pair of pairs) {
    const dir = R(`shared/json/pairs/${pair}/content`);
    if (!exists(`shared/json/pairs/${pair}/content`)) continue;
    out[pair] = {};
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
      const topic = f.replace(/\.json$/, '');
      out[pair][topic] = resolveTopic(pair, topic);
    }
  }
  return out;
}
