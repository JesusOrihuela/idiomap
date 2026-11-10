# Plan de arquitectura de idiomas (solo alfabeto latino)

> **Documento histórico (plan aprobado 2026-11-02).** El estado vigente y el esquema real
> están en [ARCHITECTURE.md](ARCHITECTURE.md). Los nombres `gloss.json`, `pairs.index.json`,
> `targets/<tag>/topics/`, `lang/ui/<locale>.js` y las cifras de audio WAV de este plan ya
> no existen; se conservan como registro de decisiones.

> Estado: **aprobado** (2026-11-02). Principio rector: **precisión antes que rapidez**.
> Alcance: idiomas latinos del scope activo y sus casos límite. **No** entran escrituras no latinas
> ni RTL en esta fase; el *plumbing* de `dir` se deja preparado, sin piloto.

## 1. Decisiones cerradas

| # | Decisión |
|---|---|
| D1 | **Sin equivalencias entre letras distintas**: `ß ≠ ss`, `ø ≠ o`, `ł ≠ l`, `ı ≠ i`, `đ ≠ d`, `ș ≠ s`. **Tampoco se toleran acentos ausentes**: `cancion` no es `canción`; `cafe` no es `café`. Solo `speech` normaliza por limitación del STT |
| D2 | **La tolerancia es por ejercicio**: `strict` (dictado, cloze, secuencia), `meaning` (traducción), `speech` (reconocimiento) |
| D3 | **No hay “neutro” universal**: se elige un **locale canónico** por idioma y se documenta su guía de estilo. “Neutro” solo donde la industria lo reconoce (español `es-419`) |
| D4 | **IDs de par a nivel de idioma** (`es-en`), con `sourceLocale`/`targetLocale` como metadatos. El subtag de región **nunca** entra en el ID: no hay productos por variedad |
| D5 | **`conceptId` desde el inicio**: identidad de significado entre packs y glosas (`greetings.hello`) |
| D6 | **Congelación de contenido durante F3** (migración) |
| D7 | **Pilotos**: `es-pt`, `es-it` (destinos nuevos/parciales) + `es-de` (control con destino completo), 10–20 fichas curadas |
| D8 | **TTS sin revisión humana**; riesgo documentado y muestreo opcional |
| D9 | **UI sin fallback entre idiomas en locales publicados**: solo variantes del mismo idioma. A `en` solo en desarrollo y con `lang="en"` por cadena |
| D10 | **El contenido evaluado nunca cae a otro idioma**: si falta la glosa, es un hueco, no un fallback |
| D11 | **Un curso por idioma, siempre**: las variedades (región, norma escrita, registro) se eligen dentro; ninguna se promueve a curso separado en esta fase (`pt-BR`/`pt-PT`, `nb`/`nn`, `es-ES`/`es-MX` son variedades) |
| D12 | **“Ver todas las variantes” es un modo, no un curso**: muestra todas las formas etiquetadas y su audio; en producción exige la forma pedida o acepta variantes declaradas solo en `meaning`; el progreso sigue siendo por idioma |

## 2. Modelo: 3 capas de contenido + 1 de interfaz

| Capa | Contenido | Dueño |
|---|---|---|
| **C1 · Par** | Glosa a la lengua base, temas exclusivos, overrides de cualquier campo (incluido el destino, para paridad legacy) | `pairs/<src>-<tgt>/` |
| **C2 · Región / norma destino** | Solo diferencias de variedad (región o norma escrita) | `targets/<tgt>/overlays/<tag>.json` |
| **C3 · Idioma destino** | Pack canónico: frases, audio, gramática, vocab, frecuencia, placement | `targets/<tgt>/` |
| **C4 · Interfaz** | Instrucciones, menús, etiquetas, errores; idioma base con variantes | `lang/ui/<locale>.js` |

### Cadenas

```
Contenido:  C1 par → C2 variedad → C3 idioma → HUECO (nunca otro idioma)
Interfaz:   C4 override de par → C4 variedad base → C4 idioma base → (en solo en desarrollo)
Metadatos:  idioma → base → en (con provenance)
```

## 3. Artefactos dependientes de la fuente (inventario obligatorio)

| Artefacto | Capa | Gate |
|---|---|---|
| Texto fuente de la frase | C1 glosa | `gloss-coverage` |
| Pistas y notas de alternativa | C1 glosa | `gloss-coverage` |
| Glosas de vocabulario | C1 glosa | `vocab-gloss-coverage` |
| Explicaciones de gramática y tips | C1 glosa | `grammar-gloss-coverage` |
| Instrucciones/prompts de placement | C1 glosa | `placement-coverage` |
| Etiquetas de tema | C1 glosa o C4 | `topic-label-coverage` |
| Equivalencias/contracciones por par | C1 | `equivalence-policy` |
| Variantes de género/registro de la fuente | C1 | `variant-binding` |
| Audio del destino | C3/C2 | `audio-coverage` |
| Reglas de gramática y detectores | C3 | `grammar-rules` |

## 4. Scope activo y fuera de alcance

**Regla de curso:** **un curso por idioma**; la variedad se elige dentro. Ninguna variedad se separa como curso en esta fase: ni `pt-BR`/`pt-PT` ni `nb`/`nn` ni `es-ES`/`es-MX`.

### Activos (con contenido)

| Idioma | Tag | Canónico | Variedades |
|---|---|---|---|
| Español | `es` | `es-419` | `es-ES`, `es-MX`, `es-AR` |
| Inglés | `en` | `en-US` | `en-GB` |
| Alemán | `de` | `de-DE` | `de-AT`, `de-CH` |
| Portugués | `pt` | `pt-BR` | `pt-PT` |
| Italiano | `it` | `it-IT` | — |
| Neerlandés | `nl` | `nl-NL` | `nl-BE` |
| Francés | `fr` | `fr-FR` | `fr-CA` |
| Sueco | `sv` | `sv-SE` | — |
| Danés | `da` | `da-DK` | — |
| Noruego | `no` | `nb-NO` | `nn-NO` (norma escrita) |
| Finés | `fi` | `fi-FI` | — |
| Islandés | `is` | `is-IS` | — |
| Polaco | `pl` | `pl-PL` | — |
| Checo | `cs` | `cs-CZ` | — |
| Esloveno | `sl` | `sl-SI` | — |
| Lituano | `lt` | `lt-LT` | — |
| Letón | `lv` | `lv-LV` | — |
| Estonio | `et` | `et-EE` | — |

### Fuera de alcance (no existen en el registro)

**No tienen entrada en `languages/index.json`, ni perfil, ni pack, ni aparecen en el picker.** No es una fase futura con registro preparado: si algún día se retoma un idioma, se crea desde cero con el checklist de alta.

- **Retirados por decisión:** eslovaco (`sk`), rumano (`ro`), croata (`hr`), bosnio (`bs`), serbio (`sr`), albanés (`sq`), maltés (`mt`), catalán (`ca`), gallego (`gl`), euskera (`eu`), galés (`cy`), irlandés (`ga`), luxemburgués (`lb`), romanche (`rm`), húngaro (`hu`), turco (`tr`).
- **Resto del alfabeto latino:** afrikáans, feroés, frisón, bajo alemán, alemánico, asturiano, occitano, corso, sardo, casubio, sórabo, sami, gaélico escocés, bretón, córnico, manés, túrquicas latinas, sudeste asiático, África, Pacífico, criollos y construidos.

**Regla:** el registro solo contiene los 18 idiomas activos. Un tag fuera de esa lista es un error de gate, no un hueco.

## 5. Variantes: un curso por idioma

```
Idioma (pack)  →  Variedad (región / norma escrita / registro)  →  Par (base × idioma)
```

El alumno elige “Portugués” y dentro “Brasil” o “Portugal”; elige “Noruego” y dentro “Bokmål” o “Nynorsk”. El progreso es del idioma.

| Caso | Decisión |
|---|---|
| Español | Un curso + variedades `es-419` (neutro), `es-ES`, `es-MX`, `es-AR` |
| Portugués | **Un curso** + variedades `pt-BR` y `pt-PT`; léxico/gramática/audio son overlays |
| Noruego | **Un curso** + normas escritas `nb-NO` (defecto) y `nn-NO`; no son regiones |
| Inglés | Un curso + `en-US`/`en-GB` |
| Alemán / neerlandés / francés | Un curso + `de-AT`/`de-CH`, `nl-BE`, `fr-CA` |
| Resto | Un curso; overlay solo si aparece divergencia real |

**Progreso:** siempre por idioma, con cobertura por forma/variedad (`recordVariant`). Cambiar de variedad no pierde progreso ni duplica SRS.

**UX:** primero “¿qué idioma quieres aprender?”, después “¿en qué variedad?” solo para los idiomas que la ofrecen.

### 5.1 Selector de variedad

| Opción | Qué hace |
|---|---|
| **Canónica / neutra** | Variedad por defecto del pack (`es-419`, `en-US`, `pt-BR`…); formas no marcadas |
| **Una variedad** (`es-ES`, `pt-PT`, `nn-NO`…) | Prioriza las formas de esa variedad; el resto queda como alternativa visible |
| **Ver todas las variantes** | Modo de exploración: muestra todas las formas declaradas de cada ficha con etiqueta y audio, como hoy; no crea curso ni cambia el pack |

**“Ver todas” no es una variedad ni un curso:**

- **Presentación:** cada ficha muestra todas sus formas (región, género, registro, norma) con etiquetas y audio.
- **Producción:** el ejercicio declara qué forma espera. Si no lo hace, acepta cualquier variante declarada solo en `meaning`; en `strict`, solo la pedida.
- **`strict` + “todas”:** cada intento elige **una sola forma** (con su audio y etiqueta); nunca se mezclan formas en la misma pregunta.
- **Progreso:** cobertura por forma; sin curso ni SRS aparte.
- **Precisión:** una variante sin etiqueta o sin audio no entra en “ver todas”; el gate la bloquea.

La preferencia (`variantMode: canonical | variant:<tag> | all`) se guarda por alumno e idioma; cambiarla no pierde progreso.

## 6. Evaluación: perfiles de tolerancia

| Perfil | Ejercicios | Qué acepta | Qué no acepta |
|---|---|---|---|
| `strict` | Dictado, Cloze, Secuencia | Diferencia de mayúsculas/minúsculas; puntuación externa | Acentos, letras distintas, omisiones, sinónimos |
| `meaning` | Traducción | Alternativas declaradas; mayúsculas/puntuación externa | **Acentos ausentes**, letras distintas (`ł/l`, `ß/ss`, `ø/o`, `ı/i`), sinónimos no declarados |
| `speech` | Pronunciación | Salida del STT normalizada (limitación del reconocedor) + umbral de confianza | Texto libre no declarado |

Sin distancia de edición, sin fuzzy matching, sin “parecido”. El diff y el cloze usan **segmentación** (`Intl.Segmenter`), no `split(' ')`.

## 7. Almacenamiento

```text
shared/json/
  languages/index.json          # GENERADO; solo los 18 activos (tag, script, dir, plural, collation, casing, fuentes, TTS/STT)
  languages/<tag>/profile.json  # stopwords, functionWords, frecuencia, puntuación, detectores
  targets/<tag>/                # pack canónico
    topics.json · phrases/*.json · vocab/*.json · grammar-rules.json
    frequency.json · placement.json · overlays/<tag>.json
  pairs/<src>-<tgt>/
    pair.json                   # source, target, sourceLocale, targetLocale, gloss, overlays, status
    gloss.json                  # artefactos C1 por conceptId
    topics.extra.json · overrides.json
  pairs.index.json              # GENERADO
  common/id-map.json            # GENERADO
shared/audio/<target>/<slug>.mp3
shared/img/topics|flags/…
lang/ui/<locale>.js
shared/js/{languages,pairs,content}.js
```

## 8. Fases

### F0 · Congelación y línea base (1–2 d)
Inventario de pares, idiomas, artefactos y audio; snapshots + hashes; informe de duplicación/conflictos.
**Cierre:** 0 cambios; inventario reproducible; artefactos por fuente completos.

### F1 · Registros y manifiestos (2–3 d)
`languages/index.json`, `profile.json`, `pairs/*/pair.json`; `conceptId`; `sourceLocale`/`targetLocale`; alias de IDs; migración de `localStorage`; generadores `languages.js`, `pairs.js`, `id-map`.
**Cierre:** lista de pares idéntica; ningún par cambia; `--check`.

### F2 · Motor de texto y evaluación (4–6 d)
NFC, casefold por locale, segmentación, perfiles `strict|meaning|speech`; corpus dorado por idioma y **por ejercicio**; modo sombra.
**Cierre:** corpus 100 %; diferencias con legacy solo las correcciones documentadas.

### F3 · Packs, glosas y overlays (8–12 d)
Migración con `--dry`, libro mayor, conflictos, overrides de destino por par para paridad; resolución C1→C2→C3; congelación de contenido.
**Cierre:** deep-equal con legacy en los 9 pares; 0 conflictos sin decisión; 0 duplicados exactos.

### F4 · Interfaz, `lang`/`dir` y fuentes (4–6 d)
Bundles por locale; fallback intra-idioma; `lang` por cadena; CSS lógico; fuentes con `unicode-range` y cobertura latin-ext/vietnamita.
**Cierre:** 100 % de claves en locales publicados; WCAG 3.1.2 en 0; paridad visual 390/768/1440.

### F5 · Audio y perfiles (3–5 d)
Audio único por forma en `audio/<target>/`; voces por locale/región; perfiles completos (detectores y frecuencia con procedencia); TTS sin revisión (D8) con muestreo opcional.
**Cierre:** toda forma con audio; 0 duplicados; 0 refs rotas; un `setBase`.

### F6 · Todos-todos y gates (3–5 d)
Alta de par = `pair.json` + glosa + UI si base nueva; `conceptId`; gates; pilotos `es-pt`, `es-it`, `es-de` con 10–20 fichas; selector de variedad y modo “ver todas”.
**Cierre:** 0 duplicación; 0 glosas huérfanas; 0 claves UI sin resolver; pilotos con las tres opciones.

### F7 · Retirada del legacy (2–3 d)
Solo tras paridad y dos releases de ventana; legacy archivado, no borrado de git.
**Cierre:** todos los pares leen del modelo por capas; gates en 0.

## 9. Migración y paridad

- **Libro mayor** (`migration-ledger.json`): cada ítem legacy → destino + hash + estado (`migrated|conflict|pair-only`).
- **Conflictos**: mismo `conceptId`/id con texto distinto → diff y decisión humana; nunca auto-merge.
- **Paridad**: `check-parity` compara el contenido servido (frases, fuente, pistas, variantes, audioSlug, glosas) antes/después.
- **Datos del alumno**: alias de IDs de par y ficha; migración de `localStorage` con test.
- **Corte**: `contentModel=layered` solo con paridad 100 %; rollback a legacy en un paso.

## 10. Gates

`check-languages` · `check-packs` · `check-parity` · `check-text-golden` · `check-equivalence` · `check-variant-binding` · `check-fallback` · `check-audio` · `check-duplication` · `check-ui-lang` · `check-pwa-budget`. Todos en CI y `gate-run`.

## 11. Riesgos

| Riesgo | Respuesta |
|---|---|
| Conflictos de contenido | Libro mayor + decisión humana + paridad |
| TTS sin revisión | Muestreo opcional; `audioReviewed:false`; no bloquea (D8) |
| `pt` es stress-test (6 ítems) e `it` no existe | Los pilotos crean contenido real; 10–20 fichas |
| Variedades muy divergentes (`pt`) | Overlays de léxico/gramática/audio; si un overlay reemplaza casi todo, se revisa el pack, no se separa el curso |
| Fallback de UI oculta huecos | Gate de cobertura por locale; `lang` por cadena |
| Rendimiento/PWA | Budget + cache; bundles resueltos son artefactos generados |
| Migración a medias | Congelación F3 + legacy intacto + ventana de rollback |

## 12. Decisiones registradas y pendientes

**Registradas:**
- Scope activo: **18 idiomas** (es, en, de, pt, it, nl, fr, sv, da, no, fi, is, pl, cs, sl, lt, lv, et). El registro contiene **solo estos**.
- **Un curso por idioma**; `pt-BR`/`pt-PT`, `nb-NO`/`nn-NO` y las variantes del español son variedades, no cursos. Defectos: `pt-BR` en `pt`, `nb-NO` en `no`, `es-419` en `es`, `en-US` en `en`.
- Fuera del registro, sin entrada ni perfil: eslovaco, rumano, croata, bosnio, serbio, albanés, maltés, catalán, gallego, euskera, galés, irlandés, luxemburgués, romanche, **húngaro**, turco y el resto del alfabeto latino no listado.
- **`strict`** tolera mayúsculas/minúsculas y puntuación externa; nada más.
- **`meaning` no tolera acentos ausentes**.
- **Pilotos**: `es-pt`, `es-it`, `es-de`.
- **“Ver todas”** es un modo, no un curso.
- **Un overlay de variedad puede cambiar léxico, gramática, evaluación y audio**, pero no el curso ni el progreso: el progreso sigue siendo del idioma.

**Pendiente (operativo, no bloquea F0):**
- Umbral para revisar un pack cuando un overlay de variedad reemplaza “casi todo” (se revisa el pack; nunca se separa el curso).

## 13. Estado de implementación (2026-11-02)

| Fase | Estado | Evidencia |
|---|---|---|
| **F0** | **Completa** | `docs/F0-BASELINE.md`, `docs/F0-SNAPSHOT.json` (root hash), `docs/F0/f0-inventory.mjs` |
| **F1** | **Completa** | `shared/json/languages/index.json` (18), `languages/<tag>/profile.json`, `pairs/<id>/pair.json` (11), `pairs.index.json`; generados `shared/js/{languages,pairs,lang-profiles}.js`; gates `check-language-model`, `build-lang-profiles --check` |
| **F2** | **Completa (núcleo)** | `shared/js/text-utils.js` (NFC, sin fold, `Intl.Segmenter`, `strict/meaning/speech`), `tests/text-golden.mjs` 22/22, smoke 50/50 |
| **F3** | **Completa** | `conceptId` 100 % (4.716 frases, 2.908 vocab), `targets/<tag>/{index,concepts}.json`, `pairs/<pair>/{content,gloss}.json`, resolver Node/browser y 143 temas con paridad exacta. El legacy ya no se sirve; rollback = revertir el commit de F7 |
| **F4** | **Parcial** | `lang/ui/{es,en,de}.js` (512 claves), `lang` por texto destino (`data-lang-target`), `dir="ltr"`, CSS lógico (0 propiedades físicas); faltan bundles para los 15 idiomas restantes y revisión humana de traducciones |
| **F5** | **Completa** | 28.579 wav, 0 grupos duplicados entre términos distintos, manifest `shared/audio/manifest.json`, `check-audio` y `check-audio-refs` en verde |
| **F6** | **Completa (pilotos)** | `es-it`, `es-pt`, `es-de` con 10 frases, audio (60 wav), placement, estado `stress`; selector de variantes `canonical/all` y presentación “ver todas” |
| **F7** | **Completa** | Payload legacy retirado; el runtime compone C1+C3; gates y smoke 55/55 en verde con `contentModel=layered` por defecto |

**Gates nuevos:** `language-model`, `lang-profiles`, `ui-bundles`, `logical-css`, `lang-attrs`, `layered-content`, `text-golden`, `audio-refs`, `audio-duplicates`, `audio-manifest`, `audio-signal`. Todos en `gate-run` y CI.

**Regenerar artefactos:**

```bash
node tools/build-language-model.mjs
node tools/build-lang-profiles.mjs
node tools/build-ui-bundles.mjs
node tools/build-audio-manifest.mjs
```

**Pendiente real:** F4 solo publica UI en `es/en/de`; los otros 15 idiomas siguen `ui:false` hasta traducción y revisión humana. El resto de F0–F7 está cerrado y verificado con legacy retirado.

**Plan de cierre:** `docs/LANGUAGE-REMAINING-PLAN.md` (F3 runtime → F4 → F5 → F6 → F7, con gates y criterios de salida).
