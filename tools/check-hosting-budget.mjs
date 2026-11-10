#!/usr/bin/env node
/* Hosting budget gate: make the deployment limits visible on every CI run.
 *
 * GitHub Pages: published site <= 1 GB (hard), 100 GB/month soft bandwidth.
 * Cloudflare Pages: 20,000 files on Free (100,000 on paid).
 *
 * The repository root is the deployable site, so tracked + untracked
 * non-ignored files are counted (excluding deleted paths).
 *
 *   node tools/check-hosting-budget.mjs
 *   node tools/check-hosting-budget.mjs --cloudflare   # fail above 20k files
 */
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const GH_BYTES = 1 * 1024 * 1024 * 1024;
const CF_FILES = 20000;
const CLOUDFLARE = process.argv.includes('--cloudflare');

const list = (args) => execSync(`git ls-files ${args} -z`, { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 })
  .toString('utf8').split('\0').filter(Boolean);

const files = [...new Set([...list(''), ...list('-o --exclude-standard')])]
  .filter((f) => fs.existsSync(f))
  .filter((f) => !f.startsWith('.git/') && !f.includes('/node_modules/') && !f.startsWith('node_modules/'));

let bytes = 0;
for (const f of files) bytes += fs.statSync(f).size;

const mb = bytes / (1024 * 1024);
const gb = bytes / (1024 * 1024 * 1024);
console.log(`Hosting: ${files.length} files, ${gb.toFixed(2)} GB (${mb.toFixed(0)} MB)`);
console.log(`  GitHub Pages: 1 GB limit -> ${bytes > GH_BYTES ? 'OVER' : 'OK'} (headroom ${(1 - gb).toFixed(2)} GB)`);
const cf = files.length > CF_FILES ? `BLOCKED (${files.length - CF_FILES} over)` : `OK (${CF_FILES - files.length} left)`;
console.log(`  Cloudflare Pages Free: 20k files -> ${cf}; R2 or fewer voices required when blocked`);

let failed = false;
if (bytes > GH_BYTES) {
  console.error('ERROR hosting: site exceeds the GitHub Pages 1 GB published limit.');
  failed = true;
}
if (CLOUDFLARE && files.length > CF_FILES) {
  console.error(`ERROR hosting: ${files.length} files exceed the Cloudflare Pages Free limit (${CF_FILES}).`);
  failed = true;
}
process.exit(failed ? 1 : 0);
