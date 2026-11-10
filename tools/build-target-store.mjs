#!/usr/bin/env node
/* Build the canonical target store.
 *
 *   node tools/build-target-store.mjs --migrate   # seed buckets from concepts.json
 *   node tools/build-target-store.mjs             # regenerate concepts.json from buckets
 *   node tools/build-target-store.mjs --check     # CI: buckets/aggregate current, ids unique
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTargetLanguage, saveTargetLanguage, bucketFor } from './lib-target-store.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => path.join(ROOT, p);
const CHECK = process.argv.includes('--check');
const MIGRATE = process.argv.includes('--migrate');
const read = (p) => JSON.parse(fs.readFileSync(R(p), 'utf8'));
const exists = (p) => fs.existsSync(R(p));

const tags = fs.readdirSync(R('shared/json/targets'), { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

let total = 0;
for (const tag of tags) {
  const aggregate = `shared/json/targets/${tag}/concepts.json`;
  const bucketDir = `shared/json/targets/${tag}/buckets`;
  let concepts;
  if (MIGRATE) {
    if (!exists(aggregate)) continue;
    concepts = new Map(read(aggregate).concepts.map((c) => [c.conceptId, c]));
  } else {
    if (!exists(bucketDir)) throw new Error(`targets/${tag}: buckets missing; run build-target-store --migrate`);
    concepts = loadTargetLanguage(tag);
  }

  const ids = new Set();
  for (const c of concepts.values()) {
    if (!c.conceptId || !c.id) throw new Error(`targets/${tag}: concept missing conceptId/id`);
    if (ids.has(c.id)) throw new Error(`targets/${tag}: duplicate id ${c.id}`);
    ids.add(c.id);
    if (!Array.isArray(c.target) || !c.target.length) throw new Error(`targets/${tag}: ${c.conceptId} has no target forms`);
  }

  if (CHECK) {
    const before = exists(aggregate) ? fs.readFileSync(R(aggregate), 'utf8') : '';
    if (!before) { console.error(`MISSING ${aggregate}`); process.exitCode = 1; continue; }
    // Compare a canonical serialization, not the previous file order.
    const expected = {
      schemaVersion: 1,
      tag,
      concepts: [...concepts.values()].sort((a, b) => a.conceptId.localeCompare(b.conceptId)),
    };
    if (before !== JSON.stringify(expected, null, 2) + '\n') {
      console.error(`DRIFT ${aggregate} (run node tools/build-target-store.mjs)`);
      process.exitCode = 1;
    }
    // Buckets are validated by loading them; check for orphan bucket files.
    const expectedFiles = new Set([...concepts.keys()].map((id) => `${bucketFor(id)}.json`));
    if (exists(bucketDir)) {
      for (const f of fs.readdirSync(R(bucketDir)).filter((x) => x.endsWith('.json'))) {
        if (!expectedFiles.has(f)) {
          console.error(`ORPHAN ${bucketDir}/${f}`);
          process.exitCode = 1;
        }
      }
      for (const f of expectedFiles) {
        if (!exists(`${bucketDir}/${f}`)) {
          console.error(`MISSING ${bucketDir}/${f}`);
          process.exitCode = 1;
        }
      }
    }
  } else {
    saveTargetLanguage(tag, concepts);
  }
  total += concepts.size;
}

if (CHECK && process.exitCode) process.exit(1);
console.log(`Target store ${CHECK ? 'OK' : 'written'}: ${total} concepts across ${tags.length} tags.`);
