/* Node resolver for the layered content model (F3).
 * Composes a legacy-shaped topic from C1 order/gloss + C3 target concepts.
 * This is the single source of truth for gates and parity checks.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
  return cached(`concepts:${tag}`, () => {
    const data = read(`shared/json/targets/${tag}/concepts.json`);
    return new Map(data.concepts.map((c) => [c.conceptId, c]));
  });
}

export function pairGlosses(pair) {
  return cached(`gloss:${pair}`, () => read(`shared/json/pairs/${pair}/gloss.json`).glosses);
}

export function resolveTopic(pair, topic) {
  const info = pairInfo(pair);
  const orderFile = `shared/json/pairs/${pair}/content/${topic}.json`;
  if (!exists(orderFile)) throw new Error(`layered order missing: ${orderFile}`);
  const order = read(orderFile);
  const concepts = targetConcepts(info.target.code);
  const glosses = pairGlosses(pair);
  const phrases = order.conceptIds.map((conceptId) => {
    const c = concepts.get(conceptId);
    const g = glosses[conceptId];
    if (!c) throw new Error(`${pair}/${topic}: concept ${conceptId} missing from targets/${info.target.code}`);
    if (!g) throw new Error(`${pair}/${topic}: gloss ${conceptId} missing`);
    return {
      id: c.id,
      conceptId,
      source: g.source,
      level: g.level,
      grammar: g.grammar,
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
