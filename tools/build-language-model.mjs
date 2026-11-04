#!/usr/bin/env node
/* Build the language/pair model artifacts from the source-of-truth JSON.
 *
 * Sources:
 *   shared/json/languages/index.json   (18 active languages)
 *   shared/json/languages/<tag>/profile.json
 *   shared/json/pairs/<id>/pair.json
 *
 * Generated:
 *   shared/json/pairs.index.json
 *   shared/js/pairs.js
 *
 * Bootstrap: on first run, pair.json/profile.json are derived from the legacy
 * lang-pair.js/lang-profiles.js so nothing is lost. Later runs only read them.
 *
 * Usage: node tools/build-language-model.mjs [--check]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => path.join(ROOT, p);
const require = createRequire(import.meta.url);
const CHECK = process.argv.includes('--check');

const read = (p) => JSON.parse(fs.readFileSync(R(p), 'utf8'));
const write = (p, data) => { fs.mkdirSync(path.dirname(R(p)), { recursive: true }); fs.writeFileSync(R(p), JSON.stringify(data, null, 2) + '\n'); };
const writeText = (p, text) => { fs.mkdirSync(path.dirname(R(p)), { recursive: true }); fs.writeFileSync(R(p), text); };
const exists = (p) => fs.existsSync(R(p));
const dirs = (p) => fs.readdirSync(R(p), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();

const index = read('shared/json/languages/index.json');
const byTag = new Map(index.languages.map((l) => [l.tag, l]));
if (byTag.size !== 18) throw new Error(`languages/index.json must contain 18 active languages, found ${byTag.size}`);
for (const banned of ['hu', 'sk', 'ro', 'hr', 'bs', 'sr', 'sq', 'mt', 'ca', 'gl', 'eu', 'cy', 'ga', 'lb', 'rm', 'tr']) {
  if (byTag.has(banned)) throw new Error(`language ${banned} is outside the active scope`);
}

// ---------- bootstrap pair manifests ----------
const LegacyPair = require('../shared/js/lang-pair.js');
const pairDirs = dirs('shared/json/pairs');
for (const id of pairDirs) {
  const file = `shared/json/pairs/${id}/pair.json`;
  if (exists(file)) continue;
  const p = LegacyPair.getAll().find((x) => x.id === id);
  if (!p) throw new Error(`pair dir ${id} has no legacy pair definition`);
  const src = byTag.get(p.source.code);
  const tgt = byTag.get(p.target.code);
  if (!src || !tgt) throw new Error(`pair ${id} uses a language outside the active scope`);
  write(file, {
    id,
    source: p.source,
    target: p.target,
    sourceLocale: src.canonicalLocale,
    targetLocale: tgt.canonicalLocale,
    label: p.label,
    ttsVoices: p.ttsVoices ?? tgt.tts.voices,
    sttLanguage: p.sttLanguage ?? tgt.stt,
    status: p.stressTest ? 'stress' : 'shippable',
    stressTest: !!p.stressTest,
    ...(p.wip ? { wip: true } : {}),
  });
}

const pairFiles = dirs('shared/json/pairs').map((id) => {
  const file = `shared/json/pairs/${id}/pair.json`;
  if (!exists(file)) throw new Error(`missing ${file}`);
  return read(file);
});

// CEFR range actually covered by each pair (C1 source of truth = gloss.json).
const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const pairLevels = new Map(pairFiles.map((p) => {
  const file = `shared/json/pairs/${p.id}/gloss.json`;
  if (!exists(file)) return [p.id, null];
  const levels = Object.values(read(file).glosses || {}).map((g) => g.level).filter((l) => CEFR.includes(l));
  if (!levels.length) return [p.id, null];
  levels.sort((a, b) => CEFR.indexOf(a) - CEFR.indexOf(b));
  return [p.id, { min: levels[0], max: levels[levels.length - 1] }];
}));

// ---------- bootstrap profiles ----------
const LegacyProfiles = require('../shared/js/lang-profiles.js');
const serializeRegex = (re) => ({ source: re.source, flags: re.flags });
for (const lang of index.languages) {
  const file = `shared/json/languages/${lang.tag}/profile.json`;
  if (exists(file)) continue;
  const p = LegacyProfiles.get(lang.tag);
  if (!p) {
    write(file, {
      tag: lang.tag,
      name: lang.englishName,
      status: 'stub',
      grammaticalGender: false,
      sourceGender: { nounsCapitalized: true, fixWords: [] },
      voices: lang.tts.voices,
      tts: lang.tts,
      foldPreserve: '',
      nativeChars: '',
      clozeStopWords: [],
      functionWords: [],
      ignoreTokens: [],
      grammarTipLabels: [],
      frequency: {
        list: 'pendiente',
        cefrGraded: true,
        committed: false,
        stressTest: true,
        gateIndex: null,
        gateFloor: 0,
        note: 'Sin pack todavía. Completar antes de publicar contenido.',
      },
    });
    continue;
  }
  write(file, {
    tag: lang.tag,
    name: p.name,
    status: 'complete',
    grammaticalGender: !!p.grammaticalGender,
    sourceGender: p.sourceGender ?? null,
    voices: p.voices,
    tts: p.tts,
    foldPreserve: p.foldPreserve ?? '',
    nativeChars: p.nativeChars ?? '',
    clozeStopWords: p.clozeStopWords ?? [],
    functionWords: p.functionWords ?? [],
    ignoreTokens: p.ignoreTokens ?? [],
    grammarTipLabels: (p.grammarTipLabels ?? []).map(([re, label, ruleId]) => [serializeRegex(re), label, ruleId]),
    frequency: p.frequency,
  });
}

// ---------- generated pair index ----------
const pairsIndex = {
  schemaVersion: 1,
  generatedBy: 'tools/build-language-model.mjs',
  defaultPair: index.defaultPair,
  pairs: pairFiles.map((p) => ({
    id: p.id,
    source: p.source.code,
    target: p.target.code,
    sourceLocale: p.sourceLocale,
    targetLocale: p.targetLocale,
    status: p.status,
    levels: pairLevels.get(p.id),
  })),
};

// ---------- generated runtime pair list ----------
const runtimePairs = pairFiles.map((p) => ({
  id: p.id,
  source: p.source,
  target: p.target,
  label: p.label,
  ttsVoices: p.ttsVoices,
  sttLanguage: p.sttLanguage,
  sourceLocale: p.sourceLocale,
  targetLocale: p.targetLocale,
  levels: pairLevels.get(p.id),
  ...(p.stressTest ? { stressTest: true } : {}),
  ...(p.wip ? { wip: true } : {}),
}));
// The default pair must be first: getActive() falls back to PAIRS[0].
runtimePairs.sort((a, b) => (a.id === index.defaultPair ? -1 : b.id === index.defaultPair ? 1 : 0));

const pairsJs = `/* ============================================================
   pairs.js — GENERATED by tools/build-language-model.mjs
   Source: shared/json/pairs/<id>/pair.json
   Do not edit by hand. Run: node tools/build-language-model.mjs
   ============================================================ */

const AppPairs = ${JSON.stringify(runtimePairs, null, 2)};

if (typeof globalThis !== 'undefined') globalThis.AppPairs = AppPairs;
if (typeof module !== 'undefined' && module.exports) module.exports = AppPairs;
`;

const languagesJs = `/* ============================================================
   languages.js — GENERATED by tools/build-language-model.mjs
   Source: shared/json/languages/index.json
   Do not edit by hand. Run: node tools/build-language-model.mjs
   ============================================================ */

const AppLanguages = ${JSON.stringify(index.languages, null, 2)};

if (typeof globalThis !== 'undefined') globalThis.AppLanguages = AppLanguages;
if (typeof module !== 'undefined' && module.exports) module.exports = AppLanguages;
`;

// ---------- write / check ----------
const outputs = [
  ['shared/json/pairs.index.json', JSON.stringify(pairsIndex, null, 2) + '\n'],
  ['shared/js/pairs.js', pairsJs],
  ['shared/js/languages.js', languagesJs],
];
let drift = 0;
for (const [file, text] of outputs) {
  if (CHECK) {
    const current = exists(file) ? fs.readFileSync(R(file), 'utf8') : null;
    if (current !== text) { console.error(`DRIFT ${file}`); drift++; }
  } else {
    writeText(file, text);
  }
}
const languageDirs = dirs('shared/json/languages').filter((d) => d !== 'index.json');
console.log(`languages=${index.languages.length} profiles=${languageDirs.length} pairs=${pairFiles.length}`);
if (CHECK) {
  if (drift) { console.error(`${drift} artifact(s) out of date`); process.exit(1); }
  console.log('language model artifacts are up to date');
}
