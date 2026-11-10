#!/usr/bin/env node
/* Layered-content gate: every pair topic resolves from its C1 content file
 * (source/level/grammar) + C3 concepts, with no orphans in either direction.
 *
 * Usage: node tools/check-layered-content.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sourceText } from './lib-source-store.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => path.join(ROOT, p);
const read = (p) => JSON.parse(fs.readFileSync(R(p), 'utf8'));
const fails = [];
const pairs = fs.readdirSync(R('shared/json/pairs'), { withFileTypes: true })
  .filter((e) => e.isDirectory() && fs.existsSync(R(`shared/json/pairs/${e.name}/pair.json`)))
  .map((e) => e.name).sort();

for (const pair of pairs) {
  const meta = read(`shared/json/pairs/${pair}/topics.json`);
  const pairInfo = read(`shared/json/pairs/${pair}/pair.json`);
  const sourceLang = pairInfo.source.code;
  const phraseTopics = meta.topics.filter((t) => t.phrase).map((t) => t.id);
  const target = pair.split('-')[1];
  const pack = read(`shared/json/targets/${target}/concepts.json`);
  const byId = new Map();
  for (const c of pack.concepts) {
    if (byId.has(c.conceptId)) fails.push(`[${target}] duplicate conceptId ${c.conceptId}`);
    byId.set(c.conceptId, c);
  }
  const contentDir = R(`shared/json/pairs/${pair}/content`);
  if (!fs.existsSync(contentDir)) { fails.push(`[${pair}] missing content/`); continue; }
  const orderFiles = fs.readdirSync(contentDir).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));
  for (const topic of phraseTopics) {
    if (!orderFiles.includes(topic)) { fails.push(`[${pair}] missing content/${topic}.json`); continue; }
    const order = read(`shared/json/pairs/${pair}/content/${topic}.json`);
    if (order.schemaVersion !== 3) fails.push(`[${pair}/${topic}] content schemaVersion must be 3`);
    const seen = new Set();
    for (const row of (order.phrases || [])) {
      const cid = row.conceptId;
      if (seen.has(cid)) fails.push(`[${pair}/${topic}] duplicate concept ${cid}`);
      seen.add(cid);
      const c = byId.get(cid);
      if (!c) { fails.push(`[${pair}/${topic}] concept ${cid} missing in targets/${target}`); continue; }
      if (!row.sourceId) fails.push(`[${pair}/${topic}] sourceId missing for ${cid}`);
      else {
        try { sourceText(sourceLang, row.sourceId); }
        catch { fails.push(`[${pair}/${topic}] sourceId ${row.sourceId} missing from source-texts/${sourceLang}`); }
      }
      if (!row.level) fails.push(`[${pair}/${topic}] level missing for ${cid}`);
      if (!Array.isArray(c.target) || !c.target.length) fails.push(`[${pair}/${topic}] concept ${cid} has no target forms`);
      for (const f of c.target) if (!f.text || !f.audioSlug) fails.push(`[${pair}/${topic}] concept ${cid} form missing text/audioSlug`);
    }
    if (!Array.isArray(order.phrases)) fails.push(`[${pair}/${topic}] old content schema (conceptIds); run tools/merge-gloss.mjs`);
  }
  for (const t of orderFiles) if (!phraseTopics.includes(t)) fails.push(`[${pair}] orphan content/${t}.json (not in topics.json)`);
}

if (fails.length) {
  for (const f of fails.slice(0, 30)) console.error(`ERROR ${f}`);
  console.error(`\n${fails.length} layered-content problem(s).`);
  process.exit(1);
}
console.log(`Layered content OK: ${pairs.length} pairs, all topics resolve.`);
