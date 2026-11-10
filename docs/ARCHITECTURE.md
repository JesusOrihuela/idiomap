# Arquitectura de contenido

> Estado: implementado 2026-11-10. Modelo v3: fuentes canónicas, targets en
> buckets y packs de runtime materializados. Sin backend, sin CMS, sin base de
> datos. GitHub Pages hoy; R2 para audio cuando toque.

## Principios

1. **Documentos para autorar, grafo para verificar.** El contenido se edita por
   par/tema; las relaciones se materializan en `content-index.json` y se validan.
2. **Una fuente por dato.** `topics.json` es la única lista de temas; `pair.json`
   es la única identidad del par; `source-texts/` es la única fuente del texto L1;
   `targets/<tag>/buckets/` es la única fuente de formas destino.
3. **Identidad estable.** El ID de una frase/palabra/regla no se deriva de su
   ubicación. El `sourceId` es el hash del texto normalizado: el mismo texto
   siempre produce el mismo ID.
4. **Runtime materializado.** El navegador no hace joins de contenido, fuente y
   target: lee un pack por par/tema generado y verificado.
5. **Fallar cerrado.** Si falta un concepto, una fuente o un pack, se falla; nunca
   se usa el contenido de otro par.
6. **Estático.** Git + JSON + CDN. El único "build" es de autoría/CI; el runtime
   sigue siendo estático.

## Archivos canónicos

```
shared/json/
  common/sources.json              # catálogo de fuentes y licencias
  languages/index.json
  languages/<tag>/profile.json
  source-texts/<lang>/buckets/<xx>.json  # texto L1 único + procedencia
  pairs/<pair>/pair.json
  pairs/<pair>/topics.json
  pairs/<pair>/content/<topic>.json      # pertenencia + sourceId + nivel + evidencia
  pairs/<pair>/grammar-rules.json
  pairs/<pair>/placement.json
  targets/<tag>/buckets/<xx>.json        # formas destino canónicas
  targets/<tag>/concepts.json            # agregado generado para herramientas
  vocab/<tag>/words-*.json
```

Y el runtime generado:

```
shared/json/runtime/<pair>/<topic>.json  # pack resuelto que carga la app
```

### `content/<topic>.json` (schema v3)

```json
{
  "schemaVersion": 3,
  "pair": "en-es",
  "topic": "greetings",
  "phrases": [
    {
      "conceptId": "es.greetings_hola_como_estas",
      "sourceId": "en.s.7f815aafd523dd62",
      "level": "A1",
      "grammar": null,
      "evidence": ["attested"],
      "levelBasis": { "source": "attested", "method": "authored" }
    }
  ]
}
```

Ya no existe `source` inline. La pertenencia al tema es este archivo; el ID de la
tarjeta vive en el target pack; el texto L1 vive en `source-texts/`.

### `source-texts/<lang>/buckets/<xx>.json`

```json
{
  "schemaVersion": 1,
  "lang": "en",
  "bucket": "55",
  "sentences": {
    "en.s.7f815aafd523dd62": {
      "text": "Hi, how are you?",
      "origins": [
        { "source": "TATOEBA-CC-BY", "locator": "tatoeba:123456" }
      ]
    }
  }
}
```

- `sourceId = <lang>.s.<sha256(lang + NUL + textoNormalizado).slice(0,16)>`.
- Normalización: NFC, `trim`, colapsar espacios. Se conservan mayúsculas y
  puntuación.
- El mismo texto normalizado produce el mismo ID; no se duplica entre pares.
- `origins[]` es opcional y se backfillea por fuente.
- El navegador no lee este árbol.

### `targets/<tag>/buckets/<xx>.json`

```json
{
  "schemaVersion": 1,
  "tag": "en",
  "bucket": "19",
  "concepts": {
    "es.greetings_hola_como_estas": {
      "conceptId": "es.greetings_hola_como_estas",
      "id": "greetings_hola_como_estas",
      "target": [
        { "text": "Hola, ¿cómo estás?", "audioSlug": "hola_como_estas", "labels": null }
      ]
    }
  }
}
```

`targets/<tag>/concepts.json` es un agregado generado desde los buckets para las
herramientas existentes. No se carga en runtime y no se edita a mano.

### `runtime/<pair>/<topic>.json`

```json
{
  "schemaVersion": 1,
  "pair": "en-es",
  "topic": "greetings",
  "phrases": [
    {
      "id": "greetings_hola_como_estas",
      "conceptId": "es.greetings_hola_como_estas",
      "sourceId": "en.s.7f815aafd523dd62",
      "source": "Hi, how are you?",
      "level": "A1",
      "grammar": null,
      "target": [
        { "text": "Hola, ¿cómo estás?", "audioSlug": "hola_como_estas" }
      ]
    }
  ]
}
```

- Generado por `tools/build-runtime-packs.mjs`; nunca se edita a mano.
- Incluye solo lo que la actividad usa: `evidence` y `levelBasis` se quedan en el
  canónico.
- `AppContent.topic()` lee este pack y devuelve la misma forma `{ phrases }` a las
  8 actividades.

### `vocab/<tag>/words-*.json`

`id` es único por deck. `term` es la forma principal; `variants[]` las formas
etiquetadas. El deck es la ubicación (no parte del ID de la tarjeta).

### `pairs/<pair>/grammar-rules.json`

Por par: la explicación va en la lengua fuente y la selección/nivel es específica
del par. Cada regla lleva `inventoryRef` y `levelBasis`. No se comparten reglas
completas entre pares; la decisión es pedagógica, no solo de normalización.

## Grafo generado

`shared/json/common/content-index.json` (no se carga en las páginas):

- `pairs`, `topics`, `phrases`, `words`, `rules`, `categories`, `counts`.
- Se genera con `node tools/build-content-index.mjs` y se verifica con `--check`.
- Valida: conceptos existentes, IDs únicos por par/target/deck, niveles, formas
  con `audioSlug`, órdenes únicos, categorías de gramática y `sourceId` resuelto.
- A 100.000 frases el JSON crece; si supera el presupuesto, se sustituye por un
  índice SQLite local/CI o índices por par. No es runtime.

`shared/json/common/id-map.json` resuelve tarjeta -> tema/actividad para progreso.
Es independiente del pack de runtime.

## Audio

- Formato: **AAC/M4A, mono, 64 kbps, 24 kHz**.
- Layout: `shared/audio/<pair>/<topic>/<slug>-<voice>.m4a` y
  `shared/audio/<target>/vocab[_deck]/...`.
- El reproductor añade `?v=<hash FNV-1a del texto>`: un texto editado cambia la
  URL y el service worker no sirve el audio viejo.
- `manifest.json` incluye `format`, `bytes`, `sha256`, `voice`, `slug`.
- `versions.json` (committeado) guarda el hash del texto de cada slug; si el texto
  cambia sin regenerar el audio, `build-audio-versions --check` falla.
- `check-audio` valida contenedor/codec/duración/voces y muestrea la señal
  (1 de cada 40) para no decodificar 28k archivos en cada gate.
- `encode-audio.mjs` convierte los WAV maestros; `--delete-wav` los retira.

## Procedencia

- `common/sources.json` registra las fuentes y su licencia.
- Cada frase/palabra/regla lleva `evidence[]` y `levelBasis`.
- Los registros `tools/sources/derived/*-attestation.json` están versionados:
  CI los necesita para validar `evidence:["attested"]` en un clon limpio.
- Las claves de atestiguación son el `conceptId` completo (`es.greetings_...`),
  no el slug base: un target nuevo no hereda la atestiguación de otro idioma
  con el mismo slug.
- `levelBasis` se valida contra un enum: `source` (`legacy|attested|inventory|
  frequency|authored`) y `method` (`authored|mapped|imported`).
- El localizador `ref` de una atestiguación es obligatorio en pares
  `quality:"required"`; en los pares legacy queda como waiver visible hasta el
  backfill (1.599 frases hoy).
- `check-pedagogy.mjs`:
  - par `quality:"legacy"`: reporta la deuda y no bloquea (waiver visible);
  - par nuevo (sin `quality` o `quality:"required"`): exige 100 % de evidencia,
    nivel y audio; falla si falta.
- Estado actual: 1.599 frases atestiguadas; 3.117 frases, 2.908 palabras y 95
  reglas en `legacy`. El backfill es un programa editorial, no código.

## Gates

`gate-run.mjs` y CI comparten el mismo set. Gates del modelo v3:

- `build-source-store --check`: IDs de fuente, texto normalizado único, refs y
  huérfanos.
- `build-target-store --check`: buckets y agregado en sync, IDs únicos.
- `build-runtime-packs --check`: cada pack resuelve, está actualizado y no supera
  el presupuesto de 250 KB gzip.
- `check-topics-sync`: las copias embebidas de `topics.js`/`path.js` coinciden con
  `pairs/es-en/topics.json`.
- `build-content-index --check`: grafo íntegro y actualizado.
- `check-pedagogy`: evidencia, `levelBasis` y localizador.
- `check-audio`: AAC + voces + muestra de señal.

## Añadir contenido

### Frase

1. `targets/<tag>/buckets/<xx>.json`: añade `conceptId`, `id`, `target[]` con
   `text` y `audioSlug`; `labels` si hay más de una forma. La ruta del bucket se
   obtiene con `node tools/target-bucket.mjs --tag <tag> --conceptId <id>`.
   `concepts.json` es un agregado: regenéralo con `build-target-store`.
2. `pairs/<pair>/content/<topic>.json`: añade `{conceptId, sourceId, level,
   grammar, evidence, levelBasis}`. Para una fuente nueva:
   `node tools/add-source.mjs --lang <tag> --text "<frase>"` imprime el
   `sourceId`; si ya existe, reutilízalo.
3. `node tools/assign-alt-slugs.mjs` (si falta slug).
4. Genera audio (WAV), `node tools/encode-audio.mjs`,
   `node tools/build-audio-manifest.mjs`.
5. `node tools/build-source-store.mjs`, `node tools/build-target-store.mjs`,
   `node tools/build-runtime-packs.mjs`, `node tools/fix-phrase-ids.js`,
   `node tools/grammar-topics.mjs --write`, `node tools/build-content-index.mjs`.
6. `node tools/gate-run.mjs`.

### Palabra

1. `vocab/<tag>/words-<deck>.json`: `id`, `term`, `translations`, `gloss`,
   `definition`, `example`, `level`, `evidence`, `levelBasis`, `variants[]`.
2. Slug de variantes + audio + manifiesto.
3. `fix-phrase-ids` + índice + gates.

### Regla

1. `grammar-rules.json`: categoría, nivel, seis fases, traducciones L1,
   `inventoryRef`, `levelBasis`.
2. `grammar-topics --write`, índice, gates.

### Tema

1. `topics.json` (orden único), `content/<topic>.json`, conceptos, scope,
   `topic_<id>` en `lang/ui.js`, icono, imágenes, audio.
2. Actualizar las copias de `topics.js`/`path.js` o el gate `check-topics-sync`
   fallará.
3. `build-source-store`, `build-target-store`, `build-runtime-packs`,
   `fix-phrase-ids`, `grammar-topics --write`, índice, gates.

### Idioma / par

Ver `docs/ADD-A-LANGUAGE.md`. El par nuevo no se publica hasta que
`check-pedagogy` pase en modo `required`.

## Migración v2 -> v3

- `content.phrases[].source` se sustituyó por `sourceId`; el texto vive una vez en
  `source-texts/`.
- `targets/<tag>/concepts.json` pasó a agregado generado; la fuente son los
  buckets.
- `runtime/<pair>/<topic>.json` reemplaza el join `content + target` en el
  navegador.
- Los IDs de tarjeta, el progreso, `id-map.json` y las actividades no cambian.
- `build-runtime-packs` y los stores son generados y `--check`; no se editan a
  mano.

## Escala

- **GitHub Pages hoy:** el texto v3 vive en JSON estático y no necesita backend.
- **100.000 frases totales:** los packs por par/tema son pequeños; el texto
  canónico + runtime queda muy por debajo de 1 GB.
- **100.000 frases por par (2M):** el texto se acerca al límite de 1 GB de GitHub
  Pages. Umbral: generar los packs en deploy (sigue estático) o mover JSON a R2.
- **Audio:** 100.000 frases x 4 voces ~7 GB; GitHub Pages no puede. R2 Free
  (10 GB, egress gratis) es el camino, pendiente de Cloudflare.
- **Presupuesto de pack:** 250 KB gzip. Si un tema lo supera, se parte por nivel o
  subtema solo si la UI/path ya usa esa frontera; nunca por "primeros N".

## Borrado en la consolidación v2

- `pairs/<pair>/gloss.json` (fusionado en content).
- `targets/<tag>/topics/` (112 espejos), `targets/<tag>/index.json` (9).
- `pairs.index.json`.
- `lang/ui/<locale>.js` (bundles no usados) y `build-ui-bundles.mjs`.
- `vocab[].conceptId`, `concepts[].pairs/sources/status`, `gloss.hash`,
  `grammar.prerequisites/related_phrases`.
- C2 overlays (documentado como diferido; no existía).

## Consolidación 2026-11-09

- `build-content-index` falla en `conceptId` duplicado, concepto target huérfano,
  colisión slug/texto y IDs de frase que chocan con un namespace de actividad.
- `check-pedagogy` cruza `evidence:["attested"]` con las atestiguaciones y bloquea
  `legacy` en un target requerido.
- `check-pair-completeness` exige `example`, amplitud shippable (contenido de
  frases, gramática, deck de vocab viable) y grammar file para pares shippable.
- `check-language-model` valida `label`, nombres, `ttsVoices`, `sttLanguage` y el
  bloque UI de la fuente.
- `check-topics-sync` verifica `topic_<id>` en cada bloque UI y las etiquetas
  es/en contra `topics.json`.
- `check-variants` rechaza texto duplicado de variantes y sets de labels
  flexivos duplicados.
- `check-audio-orphans` es el reverso de `check-audio-refs`: no hay `.m4a` sin
  referencia.
- `variant-dimensions` rechaza valores vacíos en dimensiones abiertas y usa
  `case` por idioma.
- Progress/reporting resuelve el tema desde `id-map` (`Progress.getCardTopic`),
  nunca parseando un prefijo `topic_`; el namespace vive en
  `Progress.ACTIVITY_PREFIX`.
- Vocabulary muestra `gloss_example` debajo del ejemplo target.
- `docs/` ya no está completamente ignorado.

### Contraste externo

- **Anki** (notas/campos/tarjetas, IDs estables, media separada, FSRS): confirma
  el modelo concepto->tarjeta y la identidad estable. FSRS sigue siendo una
  mejora futura.
- **Tatoeba** (IDs de frase, enlaces de traducción, audio con licencia): inspiró
  IDs estables, `sourceId` y `check-licenses`.
- **Wikidata Lexemes / UniMorph** (lema, formas, sentidos, rasgos): confirma la
  separación forma/lema; los `labels` actuales son legibles, no rasgos canónicos.
- **CLDF** (UTF-8, referenciar entidades en vez de duplicar): se implementó el
  almacén canónico de fuentes y los buckets target.
- **Materialized View / SSG** (Fowler, Next.js/Astro): los packs de runtime son
  una vista materializada por par/tema; el canónico sigue normalizado.
- **Particionado por acceso** (Microsoft): el split de runtime es par/tema, no
  un chunk arbitrario.
- **CLDR plural rules**: el truco `{s}` era incorrecto en alemán; se reemplazó
  por `_one`/`_other`.
- **GitHub Pages / Cloudflare Pages**: 1 GB publicado / 20.000 archivos free;
  `check-hosting-budget` hace visible el techo (0,63 GB, 31.378 archivos).
- **RFC 5646 (BCP 47)**: los locales actuales son válidos; falta `lang` por
  variante (diferido).
- **JSON Schema**: los gates actuales cubren refs/IDs con más precisión que un
  schema genérico; no se añadió una capa nueva.

### Diferido por decisión

- Audio target-centric (`shared/audio/<target>/...`): ahorra duplicación pero
  acopla pares; requiere migración y decisión de producto.
- Gramática: decisión tomada, no se comparten reglas completas. La explicación,
  el noticing y la producción son pedagogía L1; cada par mantiene su archivo.
- R2 para audio (Cloudflare Pages tiene límite de 20.000 archivos) o reducir
  voces; rewrite de historia para quitar los WAV.
- Audio en quiz/scramble/gramática y rotación léxica de vocabulario: cambios de
  producto/UX, no de integridad.
- Preferencia de locale/región del aprendiz y `sourceLocale` variable.
- FSRS, rasgos canónicos y `lang` por variante.

## Referencias externas consultadas

- Anki: https://docs.ankiweb.net/manual/getting-started y
  https://docs.ankiweb.net/manual/deck-options (notas/campos/tarjetas, FSRS).
- Tatoeba: https://tatoeba.org/en/downloads (IDs, enlaces, licencias de audio).
- Wikidata Lexemes: https://www.wikidata.org/wiki/Wikidata:Lexicographical_data
- CLDF: https://cldf.clld.org/ (UTF-8, referenciar entidades, semántica).
- UniMorph: https://unimorph.github.io/ (lema + rasgos flexivos).
- Martin Fowler, Materialized View:
  https://martinfowler.com/eaaCatalog/materializedView.html
- Microsoft, data partitioning:
  https://learn.microsoft.com/en-us/azure/architecture/best-practices/data-partitioning
- web.dev, HTTP cache: https://web.dev/articles/http-cache
- CLDR plural rules: https://cldr.unicode.org/index/cldr-spec/plural-rules
- RFC 5646 (BCP 47): https://www.rfc-editor.org/rfc/rfc5646
- JSON Schema: https://json-schema.org/understanding-json-schema/
- GitHub Pages limits: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- Cloudflare Pages limits: https://developers.cloudflare.com/pages/platform/limits/
- R2 pricing: https://developers.cloudflare.com/r2/pricing/
- Kokoro-82M (Apache-2.0): https://huggingface.co/hexgrad/Kokoro-82M
- ELELex (CC BY-NC-SA 4.0, local-only): https://cental.uclouvain.be/cefrlex/elelex/

## Cloudflare

Hoy GitHub Pages. Para Cloudflare Pages: el límite es 20.000 archivos por
deployment; el sitio tiene 31.378 archivos y 0,63 GB (28.583 M4A). Antes de mover
el dominio, elegir: R2 para audio (storage/CDN, sin cómputo) o reducir voces. El
código no cambia: solo la base de audio.

R2 Free cubre el audio actual con margen: 10 GB-month, egress gratis y 10
millones de operaciones Class B al mes (0,63 GB hoy). Pages Free seguiría
sirviendo HTML/JSON; el bucket R2 de producción requiere dominio propio
(`r2.dev` es solo para pruebas).

El modelo v3 no cambia esta decisión: el texto y los packs de runtime siguen en
GitHub Pages; solo el audio se mueve a R2 cuando el dominio esté listo.
