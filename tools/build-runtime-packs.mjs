#!/usr/bin/env node
/* Materialize one resolved pack per pair topic for the static runtime.
 *
 * Input:  pairs/<pair>/content/<topic>.json + source-texts/ + targets/<tag>/concepts.json
 * Output: shared/json/runtime/<pair>/<topic>.json
 *
 *   node tools/build-runtime-packs.mjs
 *   node tools/build-runtime-packs.mjs --check
 *
 * The pack is generated, never hand-edited. It contains only display fields:
 * evidence/levelBasis stay in the canonical content file.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { discoverPairs, phraseTopicsFor } from './lib-content.mjs';
import { resolveTopic } from './lib-resolve.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => path.join(ROOT, p);
const CHECK = process.argv.includes('--check');
const BUDGET = 250 * 1024;

function serialize(pair, topic, phrases) {
  return {
    schemaVersion: 1,
    pair,
    topic,
    phrases: phrases.map((p) => ({
      id: p.id,
      conceptId: p.conceptId,
      sourceId: p.sourceId,
      source: p.source,
      level: p.level,
      grammar: p.grammar,
      target: p.target,
    })),
  };
}

let packs = 0, bytes = 0, over = 0;
const expected = new Map();
for (const pair of discoverPairs()) {
  expected.set(pair, new Set());
  for (const topic of phraseTopicsFor(pair)) {
    let resolved;
    try { resolved = resolveTopic(pair, topic); }
    catch (e) { throw new Error(`${pair}/${topic}: ${e.message}`); }
    const data = serialize(pair, topic, resolved.phrases);
    const text = JSON.stringify(data, null, 2) + '\n';
    const gz = zlib.gzipSync(Buffer.from(text)).length;
    if (gz > BUDGET) {
      over++;
      console.error(`BUDGET ${pair}/${topic}: ${(gz / 1024).toFixed(1)} KB gzip > ${BUDGET / 1024} KB`);
    }
    const rel = `shared/json/runtime/${pair}/${topic}.json`;
    if (CHECK) {
      if (!fs.existsSync(R(rel)) || fs.readFileSync(R(rel), 'utf8') !== text) {
        console.error(`DRIFT ${rel} (run node tools/build-runtime-packs.mjs)`);
        process.exitCode = 1;
      }
    } else {
      fs.mkdirSync(path.dirname(R(rel)), { recursive: true });
      fs.writeFileSync(R(rel), text);
    }
    packs++;
    bytes += Buffer.byteLength(text);
    expected.get(pair).add(`${topic}.json`);
  }
}

for (const pair of [...expected.keys()].sort()) {
  const dir = `shared/json/runtime/${pair}`;
  if (!fs.existsSync(R(dir))) continue;
  for (const f of fs.readdirSync(R(dir)).filter((x) => x.endsWith('.json'))) {
    if (expected.get(pair).has(f)) continue;
    if (CHECK) {
      console.error(`ORPHAN ${dir}/${f} (topic not in topics.json; run node tools/build-runtime-packs.mjs)`);
      process.exitCode = 1;
    } else {
      fs.unlinkSync(R(`${dir}/${f}`));
    }
  }
}

if (CHECK && process.exitCode) process.exit(1);
if (over) process.exit(1);
console.log(`Runtime packs ${CHECK ? 'OK' : 'written'}: ${packs} packs, ${(bytes / 1024 / 1024).toFixed(1)} MB raw.`);
