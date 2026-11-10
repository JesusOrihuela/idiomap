#!/usr/bin/env node
/* Language-model gate: 18 active languages, layered pair manifests, generated artifacts.
 *
 * Fails when:
 *  - the registry contains a language outside the approved active scope
 *  - a language/pair locale, script or direction is invalid
 *  - a pair manifest is missing or disagrees with the registry
 *  - a pair uses a language without a profile
 *  - generated pairs.js/languages.js are stale
 *
 * Usage: node tools/check-language-model.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => path.join(ROOT, p);
const require = createRequire(import.meta.url);
const read = (p) => JSON.parse(fs.readFileSync(R(p), 'utf8'));
const exists = (p) => fs.existsSync(R(p));
const fails = [];

const index = read('shared/json/languages/index.json');
const langs = index.languages;
const byTag = new Map(langs.map((l) => [l.tag, l]));
const BANNED = new Set(['hu', 'sk', 'ro', 'hr', 'bs', 'sr', 'sq', 'mt', 'ca', 'gl', 'eu', 'cy', 'ga', 'lb', 'rm', 'tr']);

if (langs.length !== 18) fails.push(`registry must contain exactly 18 active languages, found ${langs.length}`);
if (byTag.size !== langs.length) fails.push('registry has duplicate language tags');
for (const l of langs) {
  if (BANNED.has(l.tag)) fails.push(`[${l.tag}] outside the approved active scope`);
  if (!/^[a-z]{2,3}$/.test(l.tag)) fails.push(`[${l.tag}] invalid BCP 47 primary tag`);
  if (l.script !== 'Latn') fails.push(`[${l.tag}] script must be Latn in this phase`);
  if (l.dir !== 'ltr') fails.push(`[${l.tag}] dir must be ltr; RTL is out of scope`);
  if (!/^[a-z]{2,3}-[A-Z]{2}$|^[a-z]{2,3}-[0-9]{3}$/.test(l.canonicalLocale)) fails.push(`[${l.tag}] invalid canonicalLocale ${l.canonicalLocale}`);
  const primary = l.canonicalLocale.split('-')[0];
  if (primary !== l.tag && !(l.tag === 'no' && primary === 'nb')) fails.push(`[${l.tag}] canonicalLocale ${l.canonicalLocale} does not belong to the language`);
  if (!Array.isArray(l.plural) || !l.plural.length) fails.push(`[${l.tag}] plural categories missing`);
  if (!l.collation) fails.push(`[${l.tag}] collation missing`);
  if (!l.casing) fails.push(`[${l.tag}] casing missing`);
  if (!Array.isArray(l.flags) || !l.flags.length) fails.push(`[${l.tag}] flags missing`);
  for (const v of l.variants ?? []) {
    const vp = v.split('-')[0];
    if (vp !== l.tag && !(l.tag === 'no' && vp === 'nn')) fails.push(`[${l.tag}] variant ${v} does not belong to the language`);
  }
  if (!exists(`shared/json/languages/${l.tag}/profile.json`)) fails.push(`[${l.tag}] missing shared/json/languages/${l.tag}/profile.json`);
}

// Pair manifests: one per content dir, and no manifest without a content dir.
const contentDirs = fs.readdirSync(R('shared/json/pairs'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
const pairManifests = contentDirs.map((id) => {
  const file = `shared/json/pairs/${id}/pair.json`;
  if (!exists(file)) { fails.push(`[${id}] missing pair.json`); return null; }
  return read(file);
}).filter(Boolean);
const manifestIds = pairManifests.map((p) => p.id).sort();
if (manifestIds.join(',') !== contentDirs.join(',')) fails.push(`pair.json set (${manifestIds.join(',')}) does not match content dirs (${contentDirs.join(',')})`);

for (const p of pairManifests) {
  const src = byTag.get(p.source?.code);
  const tgt = byTag.get(p.target?.code);
  if (!src) fails.push(`[${p.id}] source ${p.source?.code} is not an active language`);
  if (!tgt) fails.push(`[${p.id}] target ${p.target?.code} is not an active language`);
  if (src && p.sourceLocale !== src.canonicalLocale) fails.push(`[${p.id}] sourceLocale ${p.sourceLocale} != ${src.canonicalLocale}`);
  if (tgt && p.targetLocale !== tgt.canonicalLocale) fails.push(`[${p.id}] targetLocale ${p.targetLocale} != ${tgt.canonicalLocale}`);
  if (!['shippable', 'stress', 'wip'].includes(p.status)) fails.push(`[${p.id}] invalid status ${p.status}`);
  if (p.status === 'stress' && !p.stressTest) fails.push(`[${p.id}] stress status requires stressTest:true`);
  if (p.status === 'wip' && !p.wip) fails.push(`[${p.id}] wip status requires wip:true`);
  if (p.status === 'shippable' && (p.stressTest || p.wip)) fails.push(`[${p.id}] shippable pair must not be stressTest/wip`);
  if (p.quality && !['legacy', 'required'].includes(p.quality)) fails.push(`[${p.id}] invalid quality ${p.quality}`);
  if (!p.label || !String(p.label).trim()) fails.push(`[${p.id}] missing label`);
  for (const side of ['source', 'target']) {
    for (const field of ['name', 'localName']) {
      if (!p[side]?.[field] || !String(p[side][field]).trim())
        fails.push(`[${p.id}] missing ${side}.${field}`);
    }
  }
  if (!Array.isArray(p.ttsVoices) || !p.ttsVoices.length) {
    fails.push(`[${p.id}] ttsVoices missing/empty`);
  } else if (tgt) {
    const allowed = new Set(tgt.tts?.voices || []);
    for (const voice of p.ttsVoices) if (!allowed.has(voice))
      fails.push(`[${p.id}] ttsVoice ${voice} is not in the ${tgt.tag} profile voices`);
  }
  if (!p.sttLanguage || !tgt?.stt || p.sttLanguage !== tgt.stt)
    fails.push(`[${p.id}] sttLanguage ${p.sttLanguage} != target profile stt ${tgt?.stt}`);
}
// Generated runtime artifacts must exist and match the registry.
for (const f of ['shared/js/pairs.js', 'shared/js/languages.js']) if (!exists(f)) fails.push(`missing generated ${f}`);
const AppPairs = require('../shared/js/pairs.js');
const AppLanguages = require('../shared/js/languages.js');
if (AppPairs.length !== pairManifests.length) fails.push('shared/js/pairs.js is out of date');
if (AppPairs[0]?.id !== index.defaultPair) fails.push(`default pair ${index.defaultPair} must be first in pairs.js`);
if (AppLanguages.length !== langs.length) fails.push('shared/js/languages.js is out of date');

// UI bundles: only published languages, and every ui:true language has one.
const uiSrc = fs.readFileSync(R('lang/ui.js'), 'utf8');
const uiCodes = [...uiSrc.matchAll(/^\s{2,4}([a-z]{2}): \{/gm)].map((m) => m[1]);
for (const code of uiCodes) if (!byTag.has(code)) fails.push(`[ui] bundle ${code} is not an active language`);
for (const l of langs) if (l.ui && !uiCodes.includes(l.tag)) fails.push(`[${l.tag}] ui:true but no bundle in lang/ui.js`);
for (const code of uiCodes) {
  const l = byTag.get(code);
  if (l && !l.ui) fails.push(`[${code}] has a UI bundle but ui:false in the registry`);
}
// A shippable pair must have a real UI in its SOURCE language; otherwise the
// picker offers a course whose chrome falls back to another language.
for (const p of pairManifests) {
  if (p.status !== 'shippable') continue;
  const src = byTag.get(p.source?.code);
  if (!src || !src.ui || !uiCodes.includes(src.tag)) {
    fails.push(`[${p.id}] shippable source ${p.source?.code} has no UI block in lang/ui.js`);
  }
}

if (fails.length) {
  for (const f of fails) console.error(`ERROR ${f}`);
  console.error(`\n${fails.length} language-model problem(s).`);
  process.exit(1);
}
console.log(`Language model OK: ${langs.length} active languages, ${pairManifests.length} pairs, ${uiCodes.length} UI bundles (${uiCodes.join(', ')}).`);
