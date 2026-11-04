#!/usr/bin/env node
/* Golden tests for the precision text engine (F2).
 * Run: node tests/text-golden.mjs
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

globalThis.AppLangPair = {
  getActive: () => ({ id: 'en-es', target: { code: 'es' }, targetLocale: 'es-419' }),
};
globalThis.AppLangProfiles = {
  clozeStopWords: () => new Set(['de', 'la', 'el', 'que', 'y', 'a', 'en', 'un', 'una', 'es', 'por', 'con', 'para', 'los', 'las', 'del', 'al', 'se', 'su', 'lo', 'como', 'más', 'pero', 'si', 'no', 'ya', 'o']),
};

const { AppText, AppCloze } = require('../shared/js/text-utils.js');
const { normalise, normaliseSingle, normaliseSpeech, tokens, words, closestPhrase } = AppText;

const cases = [];
const eq = (a, b, msg) => cases.push({ ok: Object.is(a, b), msg: `${msg}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}` });
const ne = (a, b, msg) => cases.push({ ok: !Object.is(a, b), msg: `${msg}: expected distinct, got ${JSON.stringify(a)}` });

// NFC + case + external punctuation.
eq(normalise('canción'), normalise('cancio\u0301n'), 'NFC composed/decomposed');
eq(normalise('¿Cómo estás?'), normalise('Cómo estás'), 'external punctuation ignored');
eq(normalise('¡HOLA!'), normalise('hola'), 'case ignored');
ne(normalise('cancion'), normalise('canción'), 'missing accent is not accepted');
ne(normalise('cafe'), normalise('café'), 'missing accent is not accepted (cafe)');
ne(normalise('straße'), normalise('strasse'), 'ß is not ss');
ne(normalise('ø'), normalise('o'), 'ø is not o');
ne(normalise('ł'), normalise('l'), 'ł is not l');
ne(normalise('ı'), normalise('i'), 'dotless ı is not i');

// Single-word normalisation preserves letters but strips punctuation.
eq(normaliseSingle('¿canción?'), 'canción', 'single word keeps accent');
ne(normaliseSingle('cancion'), 'canción', 'single word missing accent differs');

// STT-only folding.
eq(normaliseSpeech('cancion'), normaliseSpeech('canción'), 'speech folds accents');
ne(normaliseSpeech('straße'), normaliseSpeech('strasse'), 'speech keeps ß distinct');
ne(normaliseSpeech('ø'), normaliseSpeech('o'), 'speech keeps ø distinct');

// Segmentation.
eq(words('¿Cómo estás?').join('|'), 'Cómo|estás', 'word segments exclude punctuation');
eq(tokens('Hola, ¿qué tal?').join('|'), 'Hola,|¿qué|tal?', 'display tokens keep punctuation');

// Cloze picks a content word and preserves the token array.
const pick = AppCloze.pick('¿Cómo estás hoy?');
eq(!!pick, true, 'cloze finds a blank');
eq(pick.tokens.join('|'), '¿Cómo|estás|hoy?', 'cloze tokens preserve punctuation');
eq(pick.clean, 'estás', 'cloze clean form keeps accent');
eq(pick.tokens[pick.idx], 'estás', 'cloze index points at the chosen token');

// Contractions still expand after precision normalisation.
eq(normalise("I don't know", { "don't": 'do not' }), 'i do not know', 'contraction expansion');
eq(closestPhrase('¿Cómo estás?', ['¿Cómo estás?', '¿Qué tal?']), '¿Cómo estás?', 'closest phrase');

const failed = cases.filter((c) => !c.ok);
if (failed.length) {
  for (const f of failed) console.error('FAIL ' + f.msg);
  console.error(`\n${failed.length}/${cases.length} text golden test(s) failed.`);
  process.exit(1);
}
console.log(`text-golden: ${cases.length}/${cases.length} passed`);
