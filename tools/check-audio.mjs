#!/usr/bin/env node
/* Deterministic audio-content gate.
 *
 * Checks every clip: valid container/codec, sane duration, and the exact voice
 * set its language declares. Signal (silence/clipping) is sampled: decoding all
 * 28k AAC files would make CI unusable; every 40th file is decoded to PCM.
 * WAV files are still parsed directly during the migration window.
 *
 * Nothing hardcoded: voices come from shared/js/lang-profiles.js; the language
 * of a folder is derived from the path (pair -> target, bare dir -> itself).
 *
 * Usage: node tools/check-audio.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import AppLangProfiles from '../shared/js/lang-profiles.js';

const execFileP = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const AUDIO = join(ROOT, 'shared', 'audio');
const T = { silenceRms: 0.004, clipFrac: 0.02, minDur: 0.2, maxDur: 20, sampleEvery: 40 };

const voicesFor = (lang) => (AppLangProfiles.get(lang)?.voices) || null;
const allVoices = new Set(AppLangProfiles.codes().flatMap((c) => voicesFor(c) || []));
const langForTop = (top) => (top.includes('-') ? top.split('-')[1] : top);

function parseWav(buf) {
  if (buf.length < 44 || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') return null;
  let off = 12, fmt = null, dataOff = -1, declared = 0;
  while (off + 8 <= buf.length) {
    const id = buf.toString('ascii', off, off + 4), sz = buf.readUInt32LE(off + 4);
    if (id === 'fmt ') fmt = { format: buf.readUInt16LE(off + 8), channels: buf.readUInt16LE(off + 10), rate: buf.readUInt32LE(off + 12), bits: buf.readUInt16LE(off + 22) };
    else if (id === 'data') { dataOff = off + 8; declared = sz; break; }
    off += 8 + sz + (sz % 2);
  }
  if (!fmt || dataOff < 0) return null;
  return { fmt, dataOff, dataLen: Math.min(declared, buf.length - dataOff) };
}

function analyzeWav(buf, w) {
  const { fmt, dataOff, dataLen } = w;
  const dur = dataLen / (fmt.rate * fmt.channels * (fmt.bits / 8));
  if (fmt.format !== 1 || fmt.bits !== 16) return { dur, pcm: false };
  const bytesPerSample = 2 * fmt.channels, total = Math.floor(dataLen / bytesPerSample);
  const stride = Math.max(1, Math.floor(total / 20000)) * bytesPerSample;
  let n = 0, sumSq = 0, clip = 0;
  for (let i = dataOff; i + 1 < dataOff + dataLen && i + 1 < buf.length; i += stride) {
    const s = buf.readInt16LE(i) / 32768;
    sumSq += s * s; n++;
    if (Math.abs(s) >= 0.999) clip++;
  }
  return { dur, pcm: true, rms: Math.sqrt(sumSq / (n || 1)), clipFrac: clip / (n || 1) };
}

const probe = async (file) => {
  try {
    const { stdout } = await execFileP('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-show_entries', 'stream=codec_name,sample_rate,channels', '-of', 'json', file], { maxBuffer: 1 << 20 });
    const j = JSON.parse(stdout);
    const s = (j.streams || [])[0] || {};
    return { dur: Number(j.format?.duration || 0), codec: s.codec_name, rate: Number(s.sample_rate || 0), channels: Number(s.channels || 0) };
  } catch { return null; }
};

const signal = async (file) => {
  try {
    const { stdout } = await execFileP('ffmpeg', ['-v', 'error', '-i', file, '-f', 's16le', '-ac', '1', '-ar', '16000', '-'], { encoding: 'buffer', maxBuffer: 8 << 20 });
    const buf = stdout;
    const total = Math.floor(buf.length / 2);
    const stride = Math.max(1, Math.floor(total / 20000)) * 2;
    let n = 0, sumSq = 0, clip = 0;
    for (let i = 0; i + 1 < buf.length; i += stride) {
      const s = buf.readInt16LE(i) / 32768;
      sumSq += s * s; n++;
      if (Math.abs(s) >= 0.999) clip++;
    }
    return { rms: Math.sqrt(sumSq / (n || 1)), clipFrac: clip / (n || 1) };
  } catch { return null; }
};

const files = [];
(function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(wav|m4a)$/i.test(e.name)) files.push(p);
  }
})(AUDIO);
files.sort();

const issues = [];
const flag = (rel, rule, msg) => issues.push({ rel, rule, msg });
const groups = new Map();
let scanned = 0;
let sampleIdx = 0;

async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) await fn(items[i++]);
  }));
}

await pool(files, 8, async (p) => {
  scanned++;
  const ext = extname(p).toLowerCase();
  const parts = p.slice(AUDIO.length + 1).split(/[\\/]/);
  const lang = langForTop(parts[0]);
  const rel = parts.join('/');
  let dur = 0, codec = 'wav', rate = 0, channels = 1, pcm = true, rms = null, clipFrac = null;

  if (ext === '.wav') {
    const buf = readFileSync(p);
    const w = parseWav(buf);
    if (!w) { flag(rel, 'corrupt', 'no es un WAV PCM valido'); return; }
    const a = analyzeWav(buf, w);
    dur = a.dur; rate = w.fmt.rate; channels = w.fmt.channels; pcm = a.pcm; rms = a.rms; clipFrac = a.clipFrac;
  } else {
    const meta = await probe(p);
    if (!meta) { flag(rel, 'corrupt', 'ffprobe no puede leer el archivo'); return; }
    dur = meta.dur; codec = meta.codec; rate = meta.rate; channels = meta.channels;
    if (codec !== 'aac') flag(rel, 'codec', `codec ${codec || '?'} (esperado aac)`);
    if (sampleIdx++ % T.sampleEvery === 0) {
      const s = await signal(p);
      if (s) { rms = s.rms; clipFrac = s.clipFrac; }
    }
  }

  if (dur < T.minDur || dur > T.maxDur) flag(rel, 'duration', `duracion ${dur.toFixed(2)}s fuera de [${T.minDur}, ${T.maxDur}]`);
  if (rms !== null && rms < T.silenceRms) flag(rel, 'silent', `casi en silencio (rms ${rms.toFixed(4)})`);
  if (clipFrac !== null && clipFrac > T.clipFrac) flag(rel, 'clipped', `recortado (${(clipFrac * 100).toFixed(1)}% al tope)`);
  if (channels !== 1) flag(rel, 'channels', `${channels} canales (esperado mono)`);

  const voice = [...allVoices].find((v) => basename(p).endsWith(`-${v}${ext}`));
  if (!voice) { flag(rel, 'voice', 'sufijo de voz desconocido'); return; }
  const slug = basename(p, `-${voice}${ext}`);
  const key = parts.slice(0, -1).join('/') + '\0' + slug;
  if (!groups.has(key)) groups.set(key, { lang, dir: parts.slice(0, -1).join('/'), slug, voices: new Set() });
  groups.get(key).voices.add(voice);
});

for (const g of groups.values()) {
  const expected = voicesFor(g.lang);
  if (!expected) { flag(`${g.dir}/${g.slug}`, 'voice', `idioma "${g.lang}" sin voces en lang-profiles`); continue; }
  const missing = expected.filter((v) => !g.voices.has(v));
  const extra = [...g.voices].filter((v) => !expected.includes(v));
  if (missing.length) flag(`${g.dir}/${g.slug}`, 'voice', `faltan voces: ${missing.join(', ')}`);
  if (extra.length) flag(`${g.dir}/${g.slug}`, 'voice', `voces inesperadas para ${g.lang}: ${extra.join(', ')}`);
}

if (!issues.length) {
  console.log(`check-audio: ${scanned} files, ${groups.size} slugs - ALL CLEAR (signal sampled 1/${T.sampleEvery})`);
  process.exit(0);
}
const byRule = {};
for (const i of issues) (byRule[i.rule] ||= []).push(i);
console.log(`check-audio: ${issues.length} problemas (${scanned} files)\n`);
for (const rule of Object.keys(byRule).sort()) {
  console.log(`-- ${rule} (${byRule[rule].length}) --`);
  for (const i of byRule[rule].slice(0, 15)) console.log(`  ${i.rel}: ${i.msg}`);
  if (byRule[rule].length > 15) console.log(`  +${byRule[rule].length - 15} mas`);
  console.log('');
}
process.exit(1);
