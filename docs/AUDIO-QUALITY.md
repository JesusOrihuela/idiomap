# Audio quality - spoken clips

The shipped audio is **AAC/M4A** (mono, 64 kbps, 24 kHz). WAV is only the generation master;
`tools/encode-audio.mjs` converts it, and the WAVs are deleted after a successful encode.

- Phrases: `shared/audio/{pair}/{topic}/{audioSlug}-{voice}.m4a` (target-language voices)
- Vocab: `shared/audio/{lang}/vocab_{deck}/{id}-{voice}.m4a` (the `general` deck uses `vocab/`)
- Manifest: `shared/audio/manifest.json` (`format`, `bytes`, `sha256`, `voice`, `slug`)
- Text-hash map: `shared/audio/versions.json` (detects a text edit without regenerating audio)

The voice set per language lives in `languages/<tag>/profile.json` (generated
`shared/js/lang-profiles.js`), the single source of truth, so a new language fills its profile.

## The quality layers

**1. Deterministic - `tools/check-audio.mjs` (CI-blockable)**
For every `.m4a`: ffprobe reads the container/codec/sample rate/channels and duration; a
sampled subset (1 in 40) is decoded to PCM to check **silence** and **clipping**. Every
slug must carry **exactly the voice set** its language declares (no missing or
cross-language voice). WAV files are still parsed directly during a migration window.

```
node tools/check-audio.mjs
```

Runs in CI via `.github/workflows/audio.yml`, path-filtered to `shared/audio/**`,
`shared/json/**`, `shared/js/lang-profiles.js`, and the checker itself.

**2. Reference completeness - `tools/check-audio-refs.mjs`**
Content -> audio: every phrase form (including variants), every word and every vocab
variant has at least one clip in the expected deck folder.

**3. Orphan control - `tools/check-audio-orphans.mjs`**
Audio -> content: every `.m4a` in `shared/audio` is referenced by a phrase/vocab slug.
Deleting content or renaming a text leaves no dead files (which would otherwise consume
the hosting file budget).

**4. Perceptual - `tools/audio-asr-audit.mjs` (dev-time, advisory)**
Whisper transcribes each clip and compares the transcription to the expected text; a low
word-overlap means the audio says the wrong thing. ASR is slow, so it runs on a subset
(one voice per slug, filters `--pair` / `--lang` / `--deck` / `--topic` / `--limit`).
Advisory, report-only, with waivers in `tools/audio-audit-waivers.json`. Treat flags as
candidates to listen to, not verdicts.

```
node tools/audio-asr-audit.mjs --pair es-en --limit 40
node tools/audio-asr-audit.mjs --lang es --deck health
```

## Pipeline

```
node tools/assign-alt-slugs.mjs
node tools/generate-audio.mjs              # English masters (Kokoro)
python tools/generate-audio-tgt.py --lang es   # non-English masters (edge-tts)
node tools/encode-audio.mjs --delete-wav  # AAC/M4A
node tools/build-audio-manifest.mjs
node tools/build-audio-versions.mjs
node tools/check-audio-refs.mjs
node tools/check-audio-orphans.mjs
node tools/check-audio.mjs
```

## Where quality is enforced vs. audited

- **Presence/counts** - `check-audio-refs` (content -> audio), CI gate.
- **No orphans** - `check-audio-orphans` (audio -> content), CI gate.
- **Container/codec/signal/voice set** - `check-audio`, CI gate (signal sampled).
- **Says the right words** - `audio-asr-audit`, dev-time advisory.
- **Stale audio after a text edit** - `build-audio-versions --check`, CI gate.

Nothing hardcoded: voices from the language profile, pairs/decks/topics from `lib-content`,
and the language of each audio folder derived from its path. `check-audio*.mjs` and the
manifest/versions are committed (CI needs them); `audio-asr-audit` and this doc are
development references.

## Licensing

English audio uses Kokoro-82M (Apache-2.0). Non-English audio uses Microsoft Edge TTS;
generated audio is subject to the Microsoft service terms and must be re-checked before a
commercial launch. See `CREDITS.md`. Tatoeba audio is not bundled.
