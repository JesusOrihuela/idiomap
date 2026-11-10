#!/usr/bin/env node
/* Regression test for the pedagogy gate: attestations are keyed by full
 * conceptId, levelBasis is enum-checked, and required pairs need a ref.
 * Runs the real gate against a throwaway fixture, so it tests behavior, not
 * a copy of the rules.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const src = path.resolve('tools/check-pedagogy.mjs');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pedagogy-test-'));
const mk = (p) => fs.mkdirSync(path.join(root, p), { recursive: true });
const write = (p, data) => fs.writeFileSync(path.join(root, p), JSON.stringify(data, null, 2) + '\n');
const run = () => spawnSync(process.execPath, ['tools/check-pedagogy.mjs'], { cwd: root, encoding: 'utf8' });

try {
  mk('tools');
  mk('shared/json/common');
  mk('shared/json/pairs/test/content');
  mk('shared/json/vocab');
  mk('tools/sources/derived');
  fs.copyFileSync(src, path.join(root, 'tools/check-pedagogy.mjs'));
  write('shared/json/common/sources.json', { sources: { legacy: { type: 'internal' }, attested: { type: 'internal' } } });
  write('shared/json/pairs/test/pair.json', { id: 'test', quality: 'required', target: { code: 'xx' } });
  write('shared/json/pairs/test/content/t.json', {
    phrases: [{
      conceptId: 'xx.foo', source: 'Hola', level: 'A1', grammar: null,
      evidence: ['attested'], levelBasis: { source: 'attested', method: 'authored' },
    }],
  });
  write('tools/sources/derived/t-attestation.json', { phrases: { 'xx.foo': { level: 'A1' } } });

  let r = run();
  if (r.status === 0 || !r.stderr.includes('no locator ref')) {
    throw new Error(`expected missing-ref failure, got ${r.status}\n${r.stdout}\n${r.stderr}`);
  }

  const att = JSON.parse(fs.readFileSync(path.join(root, 'tools/sources/derived/t-attestation.json'), 'utf8'));
  att.phrases['xx.foo'].ref = 'tatoeba:1';
  write('tools/sources/derived/t-attestation.json', att);
  r = run();
  if (r.status !== 0) throw new Error(`expected pass with ref, got ${r.status}\n${r.stdout}\n${r.stderr}`);

  att.phrases = { 'yy.foo': att.phrases['xx.foo'] };
  write('tools/sources/derived/t-attestation.json', att);
  r = run();
  if (r.status === 0 || !r.stderr.includes('no attestation record for xx.foo')) {
    throw new Error(`expected missing-record failure, got ${r.status}\n${r.stdout}\n${r.stderr}`);
  }

  att.phrases = { 'xx.foo': att.phrases['yy.foo'] };
  write('tools/sources/derived/t-attestation.json', att);
  const content = JSON.parse(fs.readFileSync(path.join(root, 'shared/json/pairs/test/content/t.json'), 'utf8'));
  content.phrases[0].levelBasis.method = 'invented';
  write('shared/json/pairs/test/content/t.json', content);
  r = run();
  if (r.status === 0 || !r.stderr.includes('invalid levelBasis.method')) {
    throw new Error(`expected invalid-method failure, got ${r.status}\n${r.stdout}\n${r.stderr}`);
  }

  console.log('check-pedagogy self-test: OK');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
