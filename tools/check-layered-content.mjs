#!/usr/bin/env node
/* Layered-content gate (F7): every pair topic resolves from C1 order/gloss + C3
 * concepts, with no orphans in either direction.
 *
 * Usage: node tools/check-layered-content.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => path.join(ROOT, p);
const read = (p) => JSON.parse(fs.readFileSync(R(p), 'utf8'));
const fails = [];
const pairs = fs.readdirSync(R('shared/json/pairs'), { withFileTypes: true })
  .filter((e) => e.isDirectory() && fs.existsSync(R(`shared/json/pairs/${e.name}/pair.json`)))
  .map((e) => e.name).sort();

for (const pair of pairs) {
  const meta = read(`shared/json/pairs/${pair}/topics.json`);
  const phraseTopics = meta.topics.filter((t) => t.phrase).map((t) => t.id);
  const target = pair.split('-')[1];
  const pack = read(`shared/json/targets/${target}/concepts.json`);
  const byId = new Map();
  for (const c of pack.concepts) {
    if (byId.has(c.conceptId)) fails.push(`[${target}] duplicate conceptId ${c.conceptId}`);
    byId.set(c.conceptId, c);
  }
  const gloss = read(`shared/json/pairs/${pair}/gloss.json`).glosses;
  const contentDir = R(`shared/json/pairs/${pair}/content`);
  if (!fs.existsSync(contentDir)) { fails.push(`[${pair}] missing content/`); continue; }
  const orderFiles = fs.readdirSync(contentDir).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));
  for (const topic of phraseTopics) {
    if (!orderFiles.includes(topic)) { fails.push(`[${pair}] missing content/${topic}.json`); continue; }
    const order = read(`shared/json/pairs/${pair}/content/${topic}.json`);
    for (const cid of order.conceptIds) {
      const c = byId.get(cid);
      if (!c) { fails.push(`[${pair}/${topic}] concept ${cid} missing in targets/${target}`); continue; }
      if (!gloss[cid]) fails.push(`[${pair}/${topic}] gloss ${cid} missing`);
      if (!Array.isArray(c.target) || !c.target.length) fails.push(`[${pair}/${topic}] concept ${cid} has no target forms`);
      for (const f of c.target) if (!f.text || !f.audioSlug) fails.push(`[${pair}/${topic}] concept ${cid} form missing text/audioSlug`);
    }
  }
  for (const t of orderFiles) if (!phraseTopics.includes(t)) fails.push(`[${pair}] orphan content/${t}.json (not in topics.json)`);
}

if (fails.length) {
  for (const f of fails.slice(0, 30)) console.error(`ERROR ${f}`);
  console.error(`\n${fails.length} layered-content problem(s).`);
  process.exit(1);
}
console.log(`Layered content OK: ${pairs.length} pairs, all topics resolve.`);
