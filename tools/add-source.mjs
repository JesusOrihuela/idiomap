#!/usr/bin/env node
/* Add or update a canonical source sentence and print its sourceId.
 *
 *   node tools/add-source.mjs --lang en --text "Hi, how are you?" \
 *     [--origin TATOEBA-CC-BY --locator tatoeba:123456]
 *
 * Then put the printed id in content/<topic>.json. The source is removed on the
 * next build if no content row references it (source store has no orphans).
 */
import { makeSourceId, loadSourceLanguage, saveSourceLanguage, normalizeSource } from './lib-source-store.mjs';

const args = process.argv.slice(2);
const val = (flag) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : null);
const lang = val('--lang');
const text = val('--text');
if (!lang || !normalizeSource(text)) {
  console.error('Usage: node tools/add-source.mjs --lang <tag> --text "<sentence>" [--origin <id> --locator <ref>]');
  process.exit(1);
}
const id = makeSourceId(lang, text);
const map = loadSourceLanguage(lang);
const existing = map.get(id);
const record = {
  text: normalizeSource(text),
  origins: existing?.origins || [],
};
const origin = val('--origin');
const locator = val('--locator');
if (origin && !record.origins.some((o) => o.source === origin && (o.locator || null) === (locator || null))) {
  record.origins.push({ source: origin, locator: locator || null });
}
map.set(id, record);
saveSourceLanguage(lang, map);
console.log(id);
