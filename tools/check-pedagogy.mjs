#!/usr/bin/env node
/* Pedagogy gate: every item carries traceable evidence and a level basis.
 *
 *   quality:"legacy"  -> visible waiver: reports the debt, exits 0.
 *   quality:"required" -> hard failure on any legacy/missing evidence.
 *
 * New pairs are required by default; only the audited pre-existing pairs are
 * marked legacy.
 *
 * Usage: node tools/check-pedagogy.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => path.join(ROOT, p);
const read = (p) => JSON.parse(fs.readFileSync(R(p), 'utf8'));
const exists = (p) => fs.existsSync(R(p));
const sources = read('shared/json/common/sources.json').sources;
const LEVELS = new Set(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
const BASIS_SOURCES = new Set(['legacy', 'attested', 'inventory', 'frequency', 'authored']);
const BASIS_METHODS = new Set(['authored', 'mapped', 'imported']);
const fails = [];
const warnings = [];
const legacyCounts = { phrases: 0, words: 0, rules: 0 };
const requiredCounts = { phrases: 0, words: 0, rules: 0 };
let attestedWithoutRef = 0;

// Per-topic attestations are the real record behind evidence:["attested"].
// Keys are full concept ids (target.conceptSlug), never bare slugs: a new
// target must not inherit an attestation from another target that happens to
// use the same slug.
const attested = new Map();
const derived = 'tools/sources/derived';
if (exists(derived)) {
  for (const f of fs.readdirSync(R(derived)).filter((x) => x.endsWith('-attestation.json'))) {
    const data = read(`${derived}/${f}`);
    for (const [id, record] of Object.entries(data.phrases || {})) {
      if (!/^[a-z]{2,3}\./.test(id)) {
        fails.push(`${f}: attestation key "${id}" is not target-prefixed`);
        continue;
      }
      if (attested.has(id)) fails.push(`${f}: duplicate attestation key "${id}"`);
      attested.set(id, record || {});
    }
  }
}

function checkLevelBasis(where, basis) {
  if (!basis || typeof basis !== 'object' || Array.isArray(basis)) {
    fails.push(`${where}: missing levelBasis`);
    return;
  }
  if (!BASIS_SOURCES.has(basis.source)) {
    fails.push(`${where}: invalid levelBasis.source "${basis.source}"`);
  }
  if (!BASIS_METHODS.has(basis.method)) {
    fails.push(`${where}: invalid levelBasis.method "${basis.method}"`);
  }
}

// A target language is "required" if at least one pair that teaches it is not
// on the legacy waiver. All current pairs are legacy, so this preserves the
// live product while blocking unprovenanced vocab in a new pair.
const requiredTargets = new Set();
for (const pair of fs.readdirSync(R('shared/json/pairs'))) {
  if (!exists(`shared/json/pairs/${pair}/pair.json`)) continue;
  const meta = read(`shared/json/pairs/${pair}/pair.json`);
  if (meta.quality !== 'legacy' && meta.target?.code) requiredTargets.add(meta.target.code);
}

const checkSource = (where, ids) => {
  if (!Array.isArray(ids) || !ids.length) { fails.push(`${where}: missing evidence`); return false; }
  for (const id of ids) if (!sources[id]) fails.push(`${where}: unknown source "${id}"`);
  return true;
};

for (const pair of fs.readdirSync(R('shared/json/pairs'))) {
  if (!exists(`shared/json/pairs/${pair}/pair.json`)) continue;
  const meta = read(`shared/json/pairs/${pair}/pair.json`);
  const legacy = meta.quality === 'legacy';
  const contentDir = `shared/json/pairs/${pair}/content`;
  if (exists(contentDir)) {
    for (const f of fs.readdirSync(R(contentDir)).filter((x) => x.endsWith('.json'))) {
      const data = read(`${contentDir}/${f}`);
      for (const row of data.phrases || []) {
        const where = `${pair}/${f}/${row.conceptId}`;
        const ev = row.evidence || [];
        checkSource(where, ev);
        if (ev.includes('attested')) {
          const record = attested.get(row.conceptId);
          if (!record) {
            fails.push(`${where}: evidence "attested" has no attestation record for ${row.conceptId}`);
          } else if (record.ref !== undefined && (typeof record.ref !== 'string' || !record.ref.trim())) {
            fails.push(`${where}: attestation ref for ${row.conceptId} must be a non-empty string`);
          } else if (!record.ref) {
            if (legacy) attestedWithoutRef++;
            else fails.push(`${where}: evidence "attested" has no locator ref for ${row.conceptId}`);
          }
        }
        if (!LEVELS.has(row.level)) fails.push(`${where}: invalid level "${row.level}"`);
        checkLevelBasis(where, row.levelBasis);
        if (ev.includes('legacy')) {
          legacyCounts.phrases++;
          if (!legacy) fails.push(`${where}: legacy evidence in a required pair`);
        } else requiredCounts.phrases++;
      }
    }
  }
  if (exists(`shared/json/pairs/${pair}/grammar-rules.json`)) {
    const g = read(`shared/json/pairs/${pair}/grammar-rules.json`);
    for (const r of g.rules || []) {
      const where = `${pair}/grammar/${r.id}`;
      if (!LEVELS.has(r.level)) fails.push(`${where}: invalid level "${r.level}"`);
      if (!r.inventoryRef) fails.push(`${where}: missing inventoryRef`);
      checkLevelBasis(where, r.levelBasis);
      if (r.inventoryRef === 'legacy') {
        legacyCounts.rules++;
        if (!legacy) fails.push(`${where}: legacy inventory in a required pair`);
      } else requiredCounts.rules++;
    }
  }
}

for (const lang of fs.readdirSync(R('shared/json/vocab'))) {
  const dir = `shared/json/vocab/${lang}`;
  if (!fs.statSync(R(dir)).isDirectory()) continue;
  for (const f of fs.readdirSync(R(dir)).filter((x) => x.endsWith('.json'))) {
    const data = read(`${dir}/${f}`);
    for (const w of data.words || []) {
      const where = `vocab/${lang}/${f}/${w.id}`;
      checkSource(where, w.evidence || []);
      if (!LEVELS.has(w.level)) fails.push(`${where}: invalid level "${w.level}"`);
      checkLevelBasis(where, w.levelBasis);
      if ((w.evidence || []).includes('legacy')) {
        legacyCounts.words++;
        if (requiredTargets.has(lang)) fails.push(`${where}: legacy evidence in a required target (${lang})`);
      } else requiredCounts.words++;
    }
  }
}

if (fails.length) {
  for (const f of fails.slice(0, 40)) console.error(`ERROR ${f}`);
  console.error(`\n${fails.length} pedagogy problem(s).`);
  process.exit(1);
}
console.log(`Pedagogy OK: ${requiredCounts.phrases} phrases, ${requiredCounts.words} words, ${requiredCounts.rules} rules with evidence.`);
if (legacyCounts.phrases || legacyCounts.words || legacyCounts.rules) {
  console.log(`  legacy waiver (visible, backfill pending): ${legacyCounts.phrases} phrases, ${legacyCounts.words} words, ${legacyCounts.rules} rules.`);
}
if (attestedWithoutRef) {
  console.log(`  attestation locator waiver (legacy pairs): ${attestedWithoutRef} attested phrases without ref.`);
}
