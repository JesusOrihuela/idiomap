# Documentation index

This index separates **current reference docs** from **historical plans**. Use the current
docs for schema, pipelines and gates; historical plans describe decisions already executed
and may name artifacts that no longer exist (for example `gloss.json`, `pairs.index.json`,
`targets/<tag>/topics/`, `lang/ui/<locale>.js` or WAV audio).

## Current reference

- [ARCHITECTURE.md](ARCHITECTURE.md) - canonical source/target stores, runtime packs, IDs, audio, provenance, gates, hosting.
- [ADD-A-LANGUAGE.md](ADD-A-LANGUAGE.md) - adding a language/pair, pair schema, checklists.
- [GRAMMAR.md](GRAMMAR.md) - six-phase rule schema, sources and gates.
- [LANGUAGE-PROFILES.md](LANGUAGE-PROFILES.md) - linguistic facts a target language provides.
- [CONTENT-QUALITY.md](CONTENT-QUALITY.md) - mechanical + semantic content rules.
- [AUDIO-QUALITY.md](AUDIO-QUALITY.md) - AAC/M4A, voice sets, refs, orphans, ASR.
- [PEDAGOGY-AUDIT.md](PEDAGOGY-AUDIT.md) - how the app teaches: exercise design, feedback, path, assessment, sources.
- [PEDAGOGY-PROPOSALS.md](PEDAGOGY-PROPOSALS.md) - options and evidence for each critical pedagogical gap.
- [PEDAGOGY-MODELS.md](PEDAGOGY-MODELS.md) - local micro-model research: grammar, context adequacy, sizes, licences, browser limits.
- [PEDAGOGY-COVERAGE.md](PEDAGOGY-COVERAGE.md) - pedagogical coverage of open exercises vs deterministic replacements, by skill and evidence.
- [PEDAGOGY-MASTERY.md](PEDAGOGY-MASTERY.md) - coverage-based mastery, evidence dimensions and session composer.
- [PEDAGOGY-IMPLEMENTATION-PLAN.md](PEDAGOGY-IMPLEMENTATION-PLAN.md) - atomic implementation phases from the pedagogy audit to the desired product state.
- [UI-SYSTEM.md](UI-SYSTEM.md) and [TOKENS.md](TOKENS.md) - UI components and DTCG tokens.

## Historical / superseded plans

These are kept for decision history. They are not the current source of truth:

- [LANGUAGE-PLAN.md](LANGUAGE-PLAN.md) and [LANGUAGE-REMAINING-PLAN.md](LANGUAGE-REMAINING-PLAN.md)
- [F0-BASELINE.md](F0-BASELINE.md)
- `UI-*-PLAN.md`, `UI-AUDIT-*`, `UI-DEBT.md`, `UI-DECISIONS.md`, `UI-IMPLEMENTATION.md`,
  `LINKS-PLAN.md`, `PERF-90-PLAN.md`, `DE-ES-PLAN.md`, `IMAGE-QUALITY.md`.

## Tracked vs local

`docs/*` is ignored except the current reference files, this index and a few historical
plans kept for context (`LANGUAGE-PLAN`, `DE-ES-PLAN`); the rest may remain local-only. The
tracked set is intentional: CI and contributors need the current architecture and authoring
references, not every historical planning note.

## External references

The external sources and licenses are in [CREDITS.md](../CREDITS.md). Architecture contrasts
(Anki, Tatoeba, Wikidata Lexemes, CLDF, UniMorph, CLDR, BCP 47, hosting limits) are listed in
[ARCHITECTURE.md](ARCHITECTURE.md#referencias-externas-consultadas).
