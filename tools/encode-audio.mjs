#!/usr/bin/env node
/* Convert the pre-generated WAV masters to AAC/M4A (mono 64 kbps, 24 kHz).
 * Keeps all voices; the WAVs can be removed after the gates pass.
 *
 *   node tools/encode-audio.mjs [--delete-wav] [--jobs 6] [--limit N]
 *
 * Requires ffmpeg in PATH (local dev and CI install it).
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AUDIO = path.join(ROOT, 'shared/audio');
const args = process.argv.slice(2);
const DELETE = args.includes('--delete-wav');
const LIMIT = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : Infinity;
const JOBS = args.includes('--jobs') ? Number(args[args.indexOf('--jobs') + 1]) : 6;

const wavs = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.wav$/i.test(e.name)) wavs.push(p);
  }
})(AUDIO);
wavs.sort();

let done = 0, skipped = 0, failed = 0;
const queue = wavs.slice(0, LIMIT);

function encode(file) {
  return new Promise((resolve) => {
    const out = file.replace(/\.wav$/i, '.m4a');
    if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(file).mtimeMs) {
      if (DELETE) fs.unlinkSync(file);
      skipped++; return resolve();
    }
    const p = spawn('ffmpeg', ['-y', '-v', 'error', '-i', file, '-c:a', 'aac', '-b:a', '64k', '-ac', '1', '-ar', '24000', out], { stdio: 'ignore' });
    p.on('error', () => { failed++; resolve(); });
    p.on('exit', (code) => {
      if (code === 0) {
        done++;
        if (DELETE) fs.unlinkSync(file);
      } else failed++;
      resolve();
    });
  });
}

let i = 0;
async function worker() {
  while (i < queue.length) {
    const file = queue[i++];
    await encode(file);
    if ((done + skipped + failed) % 500 === 0) {
      console.log(`audio: ${done} encoded, ${skipped} skipped, ${failed} failed (${i}/${queue.length})`);
    }
  }
}

await Promise.all(Array.from({ length: JOBS }, worker));
console.log(`done: ${done} encoded, ${skipped} skipped, ${failed} failed of ${queue.length}`);
process.exit(failed ? 1 : 0);
