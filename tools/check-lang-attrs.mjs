#!/usr/bin/env node
/* Language-attribute gate (F4, WCAG 3.1.2): target-language containers must be
 * marked with data-lang-target so AppLang.markTargets() can set lang/dir.
 *
 * Usage: node tools/check-lang-attrs.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pages = [
  ['cloze/index.html', ['id="phrase-text"']],
  ['speaking/index.html', ['id="Phrase"']],
  ['scramble/index.html', ['id="construction-area"']],
  ['translation/index.html', ['id="trans-input"']],
  ['dictation/index.html', ['id="dict-input"']],
  ['quiz/index.html', ['id="quiz-word"']],
];
const fails = [];
for (const [file, needles] of pages) {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  for (const needle of needles) {
    const re = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]{0,200}?data-lang-target');
    if (!re.test(html)) fails.push(`${file}: ${needle} lacks data-lang-target`);
  }
}
if (fails.length) {
  for (const f of fails) console.error(`ERROR ${f}`);
  process.exit(1);
}
console.log(`Language attributes OK: ${pages.length} target containers marked.`);
