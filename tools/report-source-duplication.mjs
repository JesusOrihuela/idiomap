#!/usr/bin/env node
/* Report identical source-language sentences reused by pairs with different
 * targets (the `es-de` after `es-en` duplication). This is a planning report,
 * not a gate: the canonical-source migration is a product decision.
 *
 *   node tools/report-source-duplication.mjs
 */
import fs from 'node:fs';
import { sourceText } from './lib-source-store.mjs';
const bySource = new Map();
const pairMeta = new Map();

for (const pair of fs.readdirSync('shared/json/pairs')) {
  if (!fs.existsSync(`shared/json/pairs/${pair}/pair.json`)) continue;
  const meta = JSON.parse(fs.readFileSync(`shared/json/pairs/${pair}/pair.json`, 'utf8'));
  pairMeta.set(pair, meta);
  const dir = `shared/json/pairs/${pair}/content`;
  if (!fs.existsSync(dir)) continue;
  for (const file of fs.readdirSync(dir)) {
    for (const row of JSON.parse(fs.readFileSync(`${dir}/${file}`, 'utf8')).phrases || []) {
      if (!row.sourceId) continue;
      const key = row.sourceId;
      if (!bySource.has(key)) bySource.set(key, []);
      bySource.get(key).push({ pair, topic: file.replace(/\.json$/, ''), conceptId: row.conceptId });
    }
  }
}

const rows = [];
for (const [sourceId, list] of bySource) {
  if (list.length < 2) continue;
  const first = list[0];
  const source = pairMeta.get(first.pair).source.code;
  const text = sourceText(source, sourceId);
  const targets = new Set(list.map((x) => pairMeta.get(x.pair).target.code));
  if (targets.size < 2) continue;
  rows.push({ source, sourceId, text, targets: [...targets].sort(), pairs: list.map((x) => `${x.pair}/${x.topic}`) });
}
rows.sort((a, b) => b.pairs.length - a.pairs.length || a.text.localeCompare(b.text));

console.log(`Source sentences identical across different target languages: ${rows.length}`);
for (const row of rows) {
  console.log(`  [${row.source} -> ${row.targets.join(',')}] "${row.text.slice(0, 80)}"`);
  console.log(`    ${row.pairs.join('  ')}`);
}
