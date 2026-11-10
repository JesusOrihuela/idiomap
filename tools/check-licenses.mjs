#!/usr/bin/env node
/* License gate: every source used as EVIDENCE must be redistributable.
 *
 * Sibling to check-pedagogy (which checks that evidence ids exist). This one
 * makes the license policy explicit:
 *   - every source declares type/title/license;
 *   - content evidence cannot use a nonCommercial, localOnly or otherwise
 *     non-redistributable external source;
 *   - grammar inventoryRef may be a reference work (reference is not
 *     redistributed), but not a nonCommercial/localOnly dataset.
 *
 * Usage: node tools/check-licenses.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => path.join(ROOT, p);
const read = (p) => JSON.parse(fs.readFileSync(R(p), 'utf8'));
const exists = (p) => fs.existsSync(R(p));
const sources = read('shared/json/common/sources.json').sources;
const fails = [];
const used = new Set();

for (const [id, src] of Object.entries(sources)) {
  if (!src.type) fails.push(`source ${id}: missing type`);
  if (!src.title) fails.push(`source ${id}: missing title`);
  if (!src.license) fails.push(`source ${id}: missing license`);
}

const isInternal = (id) => id === 'legacy' || id === 'attested';
const isRedistributable = (id) => {
  const src = sources[id];
  if (!src) return false;
  if (isInternal(id)) return true;
  // A reference work may be CITED as evidence without redistributing its text.
  if (src.license === 'reference') return true;
  return src.redistributable === true && !src.nonCommercial && !src.localOnly;
};

function checkEvidence(where, ids) {
  for (const id of ids || []) {
    used.add(id);
    if (!sources[id]) { fails.push(`${where}: unknown source ${id}`); continue; }
    if (!isRedistributable(id)) {
      fails.push(`${where}: evidence source ${id} is not redistributable (${sources[id].license})`);
    }
  }
}

for (const pair of fs.readdirSync(R('shared/json/pairs'))) {
  if (!exists(`shared/json/pairs/${pair}/pair.json`)) continue;
  const dir = `shared/json/pairs/${pair}/content`;
  if (exists(dir)) {
    for (const f of fs.readdirSync(R(dir)).filter((x) => x.endsWith('.json'))) {
      for (const row of read(`${dir}/${f}`).phrases || []) {
        checkEvidence(`${pair}/${f}/${row.conceptId}`, row.evidence);
      }
    }
  }
  const gf = `shared/json/pairs/${pair}/grammar-rules.json`;
  if (exists(gf)) {
    for (const rule of read(gf).rules || []) {
      const ref = rule.inventoryRef;
      if (!ref) { fails.push(`${pair}/grammar/${rule.id}: missing inventoryRef`); continue; }
      used.add(ref);
      if (!sources[ref]) { fails.push(`${pair}/grammar/${rule.id}: unknown inventoryRef ${ref}`); continue; }
      const src = sources[ref];
      if (src.nonCommercial || src.localOnly) {
        fails.push(`${pair}/grammar/${rule.id}: inventoryRef ${ref} is nonCommercial/localOnly`);
      }
    }
  }
}

for (const lang of fs.readdirSync(R('shared/json/vocab'))) {
  const dir = `shared/json/vocab/${lang}`;
  if (!fs.statSync(R(dir)).isDirectory()) continue;
  for (const f of fs.readdirSync(R(dir)).filter((x) => x.endsWith('.json'))) {
    for (const word of read(`${dir}/${f}`).words || []) {
      checkEvidence(`vocab/${lang}/${f}/${word.id}`, word.evidence);
    }
  }
}

if (fails.length) {
  for (const f of fails.slice(0, 40)) console.error(`ERROR ${f}`);
  console.error(`\n${fails.length} license problem(s).`);
  process.exit(1);
}
console.log(`Licenses OK: ${Object.keys(sources).length} sources, ${used.size} used, all evidence redistributable.`);
