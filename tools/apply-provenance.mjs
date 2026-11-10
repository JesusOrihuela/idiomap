#!/usr/bin/env node
/* Backfill the evidence fields with the honest default:
 * - phrases that already have a per-topic attestation record -> "attested"
 * - everything else -> "legacy" (visible waiver, never treated as verified)
 * It also marks every current pair as quality:"legacy" so the pedagogy gate
 * blocks only new/changed content until the editorial backfill is done.
 *
 *   node tools/apply-provenance.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => path.join(ROOT, p);
const read = (p) => JSON.parse(fs.readFileSync(R(p), 'utf8'));
const write = (p, data) => fs.writeFileSync(R(p), JSON.stringify(data, null, 2) + '\n');
const exists = (p) => fs.existsSync(R(p));

const attested = new Set();
const der = 'tools/sources/derived';
if (exists(der)) {
  for (const f of fs.readdirSync(R(der)).filter((x) => x.endsWith('-attestation.json'))) {
    const j = read(`${der}/${f}`);
    for (const id of Object.keys(j.phrases || {})) attested.add(id);
  }
}

let phrases = 0, words = 0, rules = 0, pairs = 0;
for (const pair of fs.readdirSync(R('shared/json/pairs'))) {
  const dir = `shared/json/pairs/${pair}/content`;
  if (!exists(`shared/json/pairs/${pair}/pair.json`)) continue;
  const meta = read(`shared/json/pairs/${pair}/pair.json`);
  if (meta.quality !== 'legacy') { meta.quality = 'legacy'; write(`shared/json/pairs/${pair}/pair.json`, meta); pairs++; }
  if (!exists(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const file = `shared/json/pairs/${pair}/content/${f}`;
    const data = read(file);
    let dirty = false;
    for (const row of data.phrases || []) {
      if (!row.evidence) {
        row.evidence = [attested.has(row.conceptId) ? 'attested' : 'legacy'];
        dirty = true; phrases++;
      }
      if (!row.levelBasis) {
        row.levelBasis = { source: row.evidence[0] === 'attested' ? 'attested' : 'legacy', method: 'authored' };
        dirty = true;
      }
    }
    if (dirty) write(file, data);
  }
  const gf = `shared/json/pairs/${pair}/grammar-rules.json`;
  if (exists(gf)) {
    const g = read(gf);
    let dirty = false;
    for (const r of g.rules || []) {
      if (!r.inventoryRef) { r.inventoryRef = 'legacy'; dirty = true; rules++; }
      if (!r.levelBasis) { r.levelBasis = { source: 'legacy', method: 'authored' }; dirty = true; }
    }
    if (dirty) write(gf, g);
  }
}

for (const lang of fs.readdirSync(R('shared/json/vocab'))) {
  const dir = R(`shared/json/vocab/${lang}`);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const file = `shared/json/vocab/${lang}/${f}`;
    const data = read(file);
    let dirty = false;
    for (const w of data.words || []) {
      if (!w.evidence) { w.evidence = ['legacy']; dirty = true; words++; }
      if (!w.levelBasis) { w.levelBasis = { source: 'legacy', method: 'authored' }; dirty = true; }
    }
    if (dirty) write(file, data);
  }
}

console.log(`provenance: ${phrases} phrases, ${words} words, ${rules} rules, ${pairs} pairs marked legacy`);
