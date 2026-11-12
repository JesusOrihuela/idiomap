# Plan de implementación por fases atómicas

> Basado en [PEDAGOGY-AUDIT.md](PEDAGOGY-AUDIT.md),
> [PEDAGOGY-PROPOSALS.md](PEDAGOGY-PROPOSALS.md),
> [PEDAGOGY-COVERAGE.md](PEDAGOGY-COVERAGE.md) y
> [PEDAGOGY-MASTERY.md](PEDAGOGY-MASTERY.md). Fecha: 2026-11-12.
>
> Objetivo: llegar a un curso coherente de **práctica guiada con evaluación
> controlada**, con práctica abierta separada y sin fingir que se evalúa lo que
> todavía no se puede evaluar.

## 1. Punto deseado

Al terminar este plan:

- Todas las actividades **cerradas** son deterministas y se evalúan con reglas.
- La **práctica abierta** existe como familia separada, con referencias,
  elementos y auto-chequeo; no tiene mastery ni corrección automática.
- La barra y la landing se organizan por **grupos**, no por actividades.
- Existe una **página de grupo** con las tarjetas de sus actividades.
- Existe un **compositor de sesión** que elige 3-5 actividades para 20 minutos,
  con cobertura, spacing e interleaving.
- El **mastery** se calcula por evidencia y retención, no por "pasó por todos
  los ejercicios".
- La **ruta** usa nodos unificados y tarjetas; el modo libre no impone orden,
  solo una píldora "Recomendado".
- El **placement** devuelve un rango y acumula historial con peso, sin
  sobrescribir.
- El **feedback** cerrado es determinista; el ámbar "practicado con apoyo" baja
  quality y no concede mastery.
- El modelo de datos está preparado para un evaluador futuro, pero **no depende
  de él**.

Techo de contenido de este plan: B2. C1/C2 queda en F3 y en la auditoría del
"qué"; no se promete un nivel sin contenido.

## 2. Principios y no objetivos

### Principios

1. Una sola fuente por dato: grupos, actividades, contenido, nav.
2. Sin build step, sin framework, sin backend.
3. Cerrado = determinista. Ningún LLM dentro de una actividad cerrada.
4. Abierto = práctica. Sin evaluador validado, no hay mastery.
5. Cada fase es un vertical slice con tests y gates.
6. Migración compatible: no perder progreso existente.
7. El compositor empieza con reglas, no con ML.
8. La ruta no se satura: 3-5 actividades por sesión.
9. UDL pedagógica fuera de alcance, pero WCAG/ARIA, foco, contraste y 44 px
   siguen siendo obligatorios.

### No objetivos de este plan

- Evaluador validado de actividades abiertas.
- Mastery de producción abierta.
- Modelos locales de gramática, NLI, embeddings o LLM como jueces dentro de
  actividades. El ASR existente para pronunciación/producción guiada es una
  entrada con umbral de confianza, no un juez.
- UDL / "para todos".
- Interacción humana auténtica.
- Far transfer.
- Contenido C1/C2 (va en la auditoría del "qué").
- Escritura, mediación y evaluación fonética.

## 3. Mapa de fases

| Fase | Objetivo | Depende de | Entregable |
|---|---|---|---|
| **A1** | Spec de contrato | Decisiones actuales | `docs/ACTIVITY-MODEL.md` |
| **A2** | Registro de grupos y actividades | A1 | `groups.json`, `activities.json`, gate |
| **A3** | Navegación por grupos y página de grupo | A2 | Barra, landing, `practice/` |
| **A4** | Modelo de intento, evaluación y evidencia | A1 | Esquema, migración, tests |
| **A5** | Modelo de nodo y tarjeta de ruta | A4 | Datos de ruta, migración |
| **B1** | Contrato cerrado con Fill the gap | A2, A4 | Actividad de referencia |
| **B2** | Migrar cerradas existentes | B1 | Grammar, Quiz, Scramble, Dictation, Translation |
| **B3** | Vocabulario: Flashcards, Practice, cloze | B1 | Actividades separadas + contenido |
| **B4** | Speaking: pronunciación y producción guiada | B1 | Actividades separadas + contenido |
| **B5** | Tareas cerradas y diálogos ramificados | B1 | Actividades + contenido |
| **B6** | Contenido de cerradas nuevas | B2-B5 | Contenido por par y tema |
| **C1** | Shell de práctica abierta + Speaking abierto | A4 | Intento, audio, referencias, self-check |
| **C2** | Tarea abierta | C1 | Actividad + contenido |
| **C3** | Fluidez 4/3/2 | C1 | Actividad + contenido |
| **C4** | Contenido de práctica abierta | C1-C3 | Referencias, elementos y audio |
| **D1** | Compositor de sesión | A2, B2-B6, C1-C4 | Motor de reglas + tests |
| **D2** | Ruta integrada | A5, D1 | Nodos, tarjetas, sesión |
| **D3** | Modo libre | D1 | Píldora "Recomendado" |
| **E1** | Perfiles de evidencia y cobertura | A4, B2-B6, C1-C4 | Mastery por dimensiones |
| **E2** | Reintentos y feedback ámbar | B1 | Log de intentos, estados |
| **E3** | Placement por rango e historial | A4 | Test y estimación |
| **E4** | Tarjeta Preparación y can-do | E1 | Perfil por destreza |
| **E5** | Mastery UI y migración | E1-E4 | Estados verdes/ámbar |
| **F1** | Investigación de evaluador | A4, C1 | Benchmark y piloto |
| **F2** | Piloto con aprendices | A-E | Métricas y ajustes |
| **F3** | Contenido C1/C2 | Auditoría del qué | Fuera de este plan |

## 4. Fases atómicas

### A1. Spec de contrato

**Objetivo:** cerrar el contrato antes de tocar código.

**Entregables:**

- `docs/ACTIVITY-MODEL.md` con:
  - taxonomía `closed`, `open_practice`, `explore`, `practice`, `diagnostic`;
  - esquema de actividad, intento, evaluación y evidencia;
  - perfiles de mastery;
  - compositor: entradas, reglas, salida;
  - migración de `localStorage`;
  - estados de UI y copy;
  - no objetivos.

**Aceptación:**

- Decisiones cerradas: IDs, familias, dimensiones, umbrales iniciales,
  migración, audio en IndexedDB/OPFS.
- Revisado contra la auditoría y las propuestas.

**Tests/gates:** documentación; `gate-run` verde.

**Riesgo:** spec demasiado grande. Máximo 2-3 páginas; el resto son ejemplos.

### A2. Registro de grupos y actividades

**Objetivo:** una sola fuente para navegación, página de grupo y compositor.

**Entregables:**

- `shared/json/groups.json`.
- `shared/json/activities.json`.
- `tools/check-activities.mjs`:
  - IDs únicos;
  - todo grupo visible tiene actividades;
  - toda actividad tiene grupo, href, icono, label e i18n;
  - no hay huérfanas;
  - enlaces e iconos existen.
- Metadatos completos por actividad:
  - `id`, `groupId`, `href`, `label`, `shortLabel`, `i18n`, `icon`;
  - `family`: `closed`, `open_practice`, `explore`, `practice`, `diagnostic`;
  - `skills`: grammar, vocabulary, reading, listening, spoken_production,
    spoken_interaction, pragmatics, fluency, pronunciation;
  - `evidenceDimensions`: recognition, comprehension, controlled_production,
    open_production, retention;
  - `masteryProfile`: vocab, phrase, grammar, task, spoken_controlled;
  - `assessmentMode`: deterministic, model_assisted, open_practice, none;
  - `masteryEligible`: boolean;
  - `duration`: minutos estimados;
  - `prerequisites`: activity IDs o vacío;
  - `contentTags`, `cefrLevels`, `status`, `requiresAudio`, `requiresModel`.
- Validaciones del gate:
  - ninguna `closed` con `model_assisted` o `open_practice`;
  - ninguna `open_practice`, `explore`, `practice` o `diagnostic` con
    `masteryEligible: true`;
  - ninguna actividad sin `duration`, `skills` o `evidenceDimensions`;
  - ningún perfil de mastery imposible de satisfacer con las actividades
    registradas;
  - ningún perfil que exija `open_production` mientras no haya evaluador
    validado.

**Aceptación:**

- El registro cubre las 8 actividades actuales.
- `check-activities` verde.
- Sin cambio visual todavía.

**Tests/gates:** `check-activities`, `gate-run`.

### A3. Navegación por grupos y página de grupo

**Objetivo:** la barra muestra grupos, no actividades; hay una página por grupo.

**Entregables:**

- `build-nav.mjs` lee grupos y renderiza:
  - escritorio: icono + label;
  - móvil: icono; solo el activo muestra label corto.
- `nav.json` referencia grupos, no actividades.
- `groups.json` incluye `label`, `shortLabel`, `i18n`, `i18nShort`, `order`,
  `description`, `visible`.
- `practice/index.html` genérica con `?group=`, nav, footer, skip link e i18n.
- La landing renderiza los grupos desde `groups.json`; no duplica labels ni
  tarjetas en HTML.
- Página de grupo:
  - tarjetas desde `activities.json`;
  - badge `Evaluación` o `Práctica`;
  - duración, nivel, progreso y estado;
  - breadcrumb y enlace de vuelta;
  - estado vacío y grupo inválido.
- Activo de grupo también en páginas de actividad: `data-group` o mapa
  actividad -> grupo.
- Grupo oculto: no aparece en la barra; su URL directa muestra estado o redirige
  a la landing, sin romper las URLs de sus actividades.
- Actualizar `service-worker.js` para cachear `practice/`, `groups.json` y
  `activities.json`; subir versión de caché.
- Revisar `sitemap`, `site.json` y `build-site-meta` si la nueva ruta entra en
  metadatos.
- Migración de enlaces actuales: las URLs de actividades siguen funcionando.
- `check-groups`, `check-links`, `check-i18n`.

Mapa inicial de grupos:

| Grupo | Actividades |
|---|---|
| Habla y escucha | Pronunciación, Dictado, Producción oral guiada, Speaking abierto, Fluidez |
| Oraciones y tareas | Fill the gap, Traducción, Secuencia, Tareas cerradas, Diálogos ramificados, Tarea abierta |
| Vocabulario | Flashcards, Vocabulary Practice, Vocabulary cloze, Quiz |
| Gramática | Grammar Workshop |

**Aceptación:**

- 4 grupos + Inicio + Mi Ruta + Ajustes.
- Activo correcto en grupo y actividad.
- `aria-current`, `aria-label`, foco visible, 44 px.
- Probado a 320, 360, 390 y 768 px.
- No hay actividades en la barra.
- Si hay más de 5 grupos, existe “Más” o hub; no scroll silencioso.
- La landing y la barra comparten la misma fuente.
- Offline: grupo y tarjetas cargan desde caché.

**Tests/gates:** `check-groups`, `check-links`, `check-i18n`, `smoke`,
`check-a11y`, `check-layout`, `test:states`.

### A4. Modelo de intento, evaluación y evidencia

**Objetivo:** separar actividad, intento, evaluación y mastery.

**Entregables:**

- Esquema versionado `v4` (v3 actual):
  - `schemaVersion`, `pair`, `createdAt`, `updatedAt`.
  - `attempts`:
    - `id`, `activityId`, `cardId`, `topicId`, `taskVersion`;
    - `responseText`, `audioRef`, `asrConfidence`, `durationMs`;
    - `hintsUsed`, `supportUsed`, `attemptNumber`, `firstAttempt`;
    - `selfAssessment`, `createdAt`.
  - `evaluations`:
    - `id`, `attemptId`, `evaluatorId`, `evaluatorVersion`;
    - `scores`, `confidence`, `evidenceLevel`, `feedback`;
    - `sourceActivity`, `sourceFamily`, `createdAt`.
  - `evidence`:
    - `dimension`, `sourceActivity`, `sourceFamily`, `score`, `independent`,
      `evidenceLevel`, `retentionDue`, `createdAt`.
  - `mastery` derivado por ítem/tema/perfil.
- Migración:
  - `pe_progress` v3 -> v4;
  - legacy `pe_srs` -> v4;
  - `pe_placement_level` se conserva;
  - copia de seguridad de la clave antigua antes de migrar;
  - migración idempotente y rollback.
- Audio en IndexedDB/OPFS; límite y limpieza; no `localStorage`.
- Tests de migración con fixtures: vacío, v3, legacy, datos corruptos.

**Aceptación:**

- El progreso actual se conserva.
- Una actividad cerrada puede guardar intento y evaluación.
- Una actividad abierta puede guardar intento sin evaluación.
- No se concede mastery desde `evidenceLevel: practice`.
- La migración se puede repetir sin duplicar datos.
- El audio no bloquea el hilo principal ni llena el almacenamiento sin aviso.

**Tests/gates:** migración, `check-model`, `smoke`, `test:states`.

### A5. Modelo de nodo y tarjeta de ruta

**Objetivo:** unificar la ruta en nodos por tema y tarjetas individuales.

**Entregables:**

- Nodo:
  - `topicId`, `level`, `difficulty`, `prerequisites`, `order`;
  - `cards`: lista de tarjetas;
  - `vocabOnly`: boolean;
  - `visible`.
- Tarjeta:
  - `cardId`, `activityId`, `order`, `required`, `estimatedMinutes`;
  - `masteryProfile`, `evidenceTargets`.
- Progreso por tarjeta.
- Salida a mitad sin pérdida y reanudación.
- Migración del progreso actual y de los temas vocab-only.
- `check-path` valida:
  - todo card apunta a una actividad existente;
  - no hay tarjetas duplicadas;
  - no hay nodos sin tarjetas;
  - los prerequisitos existen;
  - vocab-only puede ser nodo.

**Aceptación:**

- Todos los temas, incluidos vocab-only, pueden ser nodos.
- No hay mezcla de nodos integrados e individuales.
- El progreso por tarjeta se conserva.
- La ruta puede reconstruirse desde `groups.json`, `activities.json` y el
  contenido; no hay listas hardcodeadas.

**Tests/gates:** `check-path`, `smoke`, migración.

### B1. Contrato cerrado con Fill the gap

**Objetivo:** probar el contrato con una sola actividad cerrada.

**Entregables:**

- Fill the gap migrada a:
  - `family: closed`;
  - `assessmentMode: deterministic`;
  - intento + evaluación;
  - evidencia;
  - mastery elegible.
- UI de feedback determinista básica:
  - correcto/incorrecto;
  - pista de texto dentro del componente;
  - log de intento.
- La pista no convierte el intento en correcto.
- Tests de evaluación y de migración.

**Aceptación:**

- Funciona de punta a punta.
- No hay modelo.
- No hay regresión en el progreso.
- Si el contrato falla, se corrige antes de migrar el resto.

**Tests/gates:** unitarios de evaluación, `smoke`, `gate-run`.

### B2. Migrar cerradas existentes

**Objetivo:** todas las cerradas usan el mismo contrato.

**Entregables:**

- Grammar Workshop.
- Quiz.
- Scramble.
- Dictation.
- Translation con respuestas aceptadas.
- Renombrar Cloze -> Fill the gap.
- Renombrar Vocabulary -> Flashcards.

**Aceptación:**

- Todas deterministas.
- Todas con intento/evaluación.
- Ninguna con LLM.
- Grammar Workshop: la fase de producción comunicativa debe ser determinista
  (respuestas aceptadas/checklist) o separarse como práctica abierta. No puede
  quedar una fase auto-evaluada dentro de una actividad cerrada.
- Translation se queda como cerrada con respuestas aceptadas. Si se añade
  traducción libre, es `open_practice`, no una variante de Translation.
- Cloze -> Fill the gap conserva sus cards SRS; no se reinicia el progreso.
- Tests por actividad.

**Tests/gates:** tests por actividad, `smoke`, `gate-run`.

### B3. Vocabulario: Flashcards, Practice y cloze

**Objetivo:** separar explorar, recuperar y usar en contexto.

**Entregables:**

- Flashcards: explorar, sin SRS, sin valoración.
  - B2 hace el renombrado de Vocabulary a Flashcards; B3 añade Practice y cloze.
- Vocabulary Practice: recuperación, corrección, valoración; sin default.
  - Dos etapas: reconocimiento -> producción desde A2; A1 solo reconocimiento.
  - Hereda las cards SRS del Vocabulary actual; no se reinicia el progreso.
- Vocabulary cloze: banco de palabras, significado/contexto.
- Contenido por tema y par.
- Ruta y modo libre como actividades separadas.
- IDs de cards estables; no duplicar tarjetas entre Flashcards y Practice.

**Aceptación:**

- No se elige entre Flashcards y Practice: son actividades distintas.
- Vocabulary Practice actualiza SRS; Flashcards no.
- Vocabulary cloze es determinista.
- No hay valoración por defecto.

**Tests/gates:** tests de SRS, contenido, `check-content`, `smoke`.

### B4. Speaking: pronunciación y producción guiada

**Objetivo:** separar lectura en voz alta de producción oral guiada.

**Entregables:**

- Pronunciación: lectura en voz alta, ASR, sin mastery. La URL actual de
  Speaking se conserva o redirige; no se rompen enlaces. El progreso actual de
  Speaking se queda en Pronunciación.
- Producción oral guiada:
  - situación o L1;
  - texto objetivo oculto;
  - conjunto amplio de respuestas aceptadas;
  - audio modelo;
  - grabación y comparación;
  - evaluación determinista del texto;
  - mastery de producción controlada, no de interacción.
- Contenido por tema.

**Aceptación:**

- No se mezclan variantes.
- Pronunciación no concede mastery.
- Producción guiada no evalúa fonética ni conversación.
- ASR es una entrada, no un juez: la evaluación es determinista sobre la
  transcripción; si la confianza es baja, "no evaluable"; no se marca error.
- Audio modelo generado, codificado y con manifest/versiones; sin huérfanos.
- La producción guiada usa respuestas aceptadas amplias, no una sola frase.

**Tests/gates:** tests de aceptación, ASR mock, `smoke`, `check-audio-refs`,
`check-audio-orphans`, `audio-manifest`, `audio-versions`.

### B5. Tareas cerradas y diálogos ramificados

**Objetivo:** cubrir adecuación funcional sin producción abierta.

**Entregables:**

- Diálogos ramificados deterministas:
  - opciones escritas;
  - consecuencias;
  - puntuación por elección;
  - reintento sin callejones.
- Tareas cerradas:
  - elegir, ordenar, completar ficha, seleccionar respuesta;
  - criterios de adecuación funcional.
- Contenido por tema.

**Aceptación:**

- Deterministas.
- Mastery elegible.
- No se presentan como conversación.

**Tests/gates:** tests de ramas, contenido, `smoke`.

### B6. Contenido de cerradas nuevas

**Objetivo:** que las actividades nuevas tengan contenido real antes de
activarlas. B3-B5 incluyen el contenido mínimo para probar la actividad; B6
completa la cobertura por par y tema.

**Entregables:**

- Contenido para Vocabulary Practice, Vocabulary cloze, producción oral guiada,
  tareas cerradas y diálogos ramificados.
- Metadatos por ítem: conceptos, respuestas aceptadas, distractores, pistas,
  nivel, tema, evidencia esperada.
- Audio modelo cuando aplique.
- Rollout por par: `es-en`, `en-es`, `de-es` primero; pares de estrés después.
- Pipeline de contenido y audio:
  - source/target store;
  - runtime packs;
  - audio, manifest y versiones;
  - content index;
  - gates de contenido, variantes, cobertura y licencias.

**Aceptación:**

- Ninguna actividad nueva se activa sin contenido mínimo.
- Los gates de contenido y audio están verdes.
- No hay audio huérfano ni referencias rotas.
- Los pares shippable tienen la misma actividad; los de estrés pueden quedar
  ocultos.

**Tests/gates:** `check-content`, `check-layered-content`,
`check-variants --gate`, `coverage --gate`, `check-audio-refs`,
`check-audio-orphans`, `check-licenses`.

### C1. Shell de práctica abierta + Speaking abierto

**Objetivo:** práctica abierta sin evaluación ni mastery.

**Entregables:**

- Familia `open_practice`.
- Pantalla:
  - tu respuesta;
  - audio;
  - referencias (2-3);
  - elementos esperados;
  - auto-valoración;
  - guardar/repetir.
- Sin "Analizar mi respuesta".
- Sin verde/rojo.
- Audio en IndexedDB/OPFS.
- Copy "práctica abierta".

**Aceptación:**

- Se guarda el intento.
- No hay evaluación automática.
- No hay mastery.
- El alumno puede borrar el audio.
- Permiso de micrófono, denegación, grabación fallida y reintento tienen estado.
- Cuota de IndexedDB/OPFS controlada; aviso y limpieza.
- La pantalla funciona sin modelo y sin red después de la primera carga.

**Tests/gates:** flujo de intento, almacenamiento, `smoke`, `check-a11y`,
`test:states`, `check-layout`.

### C2. Tarea abierta

**Objetivo:** misma shell, tarea abierta.

**Entregables:**

- Tarea con referencias y elementos.
- Sin evaluación.
- Sin mastery.
- Contenido por tema.

**Aceptación:** igual que C1, adaptado a texto.

**Tests/gates:** flujo de intento, `smoke`, `check-a11y`, `check-layout`.

### C3. Fluidez 4/3/2

**Objetivo:** práctica de fluidez sin evaluación.

**Entregables:**

- Repetición 4/3/2 minutos.
- Grabación y reproducción.
- Referencias.
- Auto-valoración.
- Sin mastery.

**Aceptación:** el alumno completa las rondas; no hay nota.

**Tests/gates:** flujo de rondas, grabación, `smoke`, `test:states`.

### C4. Contenido de práctica abierta

**Objetivo:** que la práctica abierta tenga referencias y elementos reales antes
de activarla. C1-C3 incluyen el mínimo para probar la shell; C4 completa la
cobertura por par y tema.

**Entregables:**

- 2-3 referencias por tarea y nivel.
- Elementos esperados.
- Audio modelo cuando aplique.
- Auto-chequeo.
- Contenido por tema y par.
- Rollout por par.

**Aceptación:**

- Ninguna práctica abierta se activa sin referencias y elementos.
- No se presenta como evaluación.
- No hay audio huérfano.
- Los gates de contenido están verdes.

**Tests/gates:** `check-content`, `check-variants --gate`, `coverage --gate`,
`check-audio-refs`, `check-audio-orphans`.

### D1. Compositor de sesión

**Objetivo:** elegir 3-5 actividades para 20 minutos.

**Entregables:**

- Entradas:
  - actividades disponibles y su metadata;
  - cobertura/mastery por tarjeta;
  - repasos vencidos;
  - contenido disponible por tema/par;
  - duración y carga;
  - prerrequisitos;
  - interleaving;
  - cadencia de práctica abierta;
  - evaluador disponible y validado;
  - audio/modelo disponible;
  - preferencias y tiempo del alumno.
- Motor de reglas:
  - 3-5 actividades, 20 minutos;
  - al menos un repaso espaciado;
  - 2-3 hebras por sesión;
  - no repetir familia;
  - controlada antes de abierta;
  - abierta según cadencia;
  - fallback si falta audio/modelo;
  - no incluir evaluador no validado;
  - no incluir actividad sin contenido.
- Salida `sessionPlan` con `activityId`, `reason`, `estimatedMinutes`.
- Tests de constraints y edge cases:
  - sin repasos vencidos;
  - todo dominado;
  - solo 2 actividades disponibles;
  - falta audio;
  - evaluador ausente;
  - 20 minutos exactos.
- No ML.

**Aceptación:**

- Nunca supera 20 minutos.
- No repite familia.
- No salta prerrequisitos.
- Incluye práctica abierta cuando toca.
- No incluye evaluador no validado.
- No incluye actividades sin contenido.
- El plan es determinista y testeable.

**Tests/gates:** `check-composer`, fixtures, `smoke`.

### D2. Ruta integrada

**Objetivo:** la ruta usa nodos, tarjetas y compositor.

**Entregables:**

- Nodo por tema.
- Tarjetas por actividad.
- Sesión generada por compositor.
- Progreso por tarjeta.
- Reanudación.
- Orden de sesión visible en la cabecera (A); sin árbol de orden.
- La ruta no muestra razones de recomendación.

**Aceptación:**

- La ruta no es una lista de todas las actividades.
- Incluye cerradas y abiertas con la cadencia definida.
- No se satura.
- El orden de sesión se entiende sin una pantalla nueva.

**Tests/gates:** `check-path`, `smoke`, `check-layout`.

### D3. Modo libre

**Objetivo:** el modo libre usa el mismo registro, sin orden impuesto.

**Entregables:**

- Selección de actividad/grupo.
- Píldora "Recomendado" como Grammar.
- Sin árbol de orden.
- Práctica abierta disponible.
- La recomendación no añade mastery.

**Aceptación:**

- No hay orden obligatorio.
- La recomendación no bloquea.
- No se mezclan variantes.
- La píldora no promete evaluación.

### E1. Perfiles de evidencia y cobertura

**Objetivo:** mastery por dimensiones, no por "pasó por todo".

**Entregables:**

- Dimensiones: recognition, comprehension, controlled_production,
  open_production, retention.
- Perfiles por tipo: vocab, frase, gramática, tarea, spoken_controlled.
- **Dos niveles de dominio:**
  - `mastery_controlled`: evidencia en las dimensiones cerradas requeridas +
    retención. Es el único nivel alcanzable sin evaluador.
  - `mastery_open`: exige `open_production` validada. No se alcanza mientras no
    haya evaluador; no se muestra como verde. Se define como punto de extensión,
    pero no se implementa en este plan.
- `open_production` es **opcional** en los perfiles hasta que exista evaluador
  validado. Ningún perfil puede quedar imposible de completar.
- Evidencia sin apoyo.
- Retención diferida con intervalo definido (por ejemplo 7 y 30 días).
- Transferencia interna: la misma dimensión debe evidenciarse en al menos dos
  familias de actividad distintas cuando el perfil lo requiera (por ejemplo
  Vocabulary cloze -> Vocabulary Practice; Fill the gap -> producción guiada).
- El SRS sigue siendo el scheduler; el mastery es evidencia separada. Un ítem
  puede estar programado sin estar dominado.
- Cálculo por ítem y tema.

**Aceptación:**

- `exposed` no cuenta.
- `practiced` es ámbar.
- `mastery_controlled` exige todas las evidencias cerradas requeridas,
  independencia y retención.
- `mastery_open` no se concede sin `evidenceLevel: validated`.
- No se usa "todos los tipos" literal.
- Un perfil sin `open_production` no bloquea el mastery controlado.
- La transferencia interna se mide por familia, no por actividad suelta.

**Tests/gates:** `check-mastery`, fixtures, migración.

### E2. Reintentos y feedback ámbar

**Objetivo:** registrar intentos y no premiar la corrección con quality 5.

**Entregables:**

- Log interno de intentos.
- Pista de texto dentro del componente, sin links.
- Estado ámbar "practicado con apoyo".
- Quality: independiente 3-4; con apoyo o corrección 2-3; nunca 5.
- Insignia "corregido".
- La tarjeta vuelve pronto.
- Mapeo SRS:
  - intento independiente correcto: quality 3-4, según perfil;
  - con pista/apoyo: quality 2-3;
  - fallo: quality 1-2;
  - corrección posterior: no borra el fallo, pero registra "corregido".
- El mastery usa el intento independiente; el reintento no lo sustituye.

**Aceptación:**

- Un acierto con pista no es mastery.
- Un reintento exitoso no borra el fallo.
- No hay quality 5 por corrección.
- El SRS y el mastery no se pisan.

**Tests/gates:** tests de SRS, `smoke`, fixtures de intentos.

### E3. Placement por rango e historial

**Objetivo:** placement orientativo, no etiqueta rígida.

**Entregables:**

- Test de entrada mejorado.
- Rango A2-B1, no nivel único.
- Historial de intentos en `pe_placement_history`.
- Actualización con peso por recencia.
- Si contradice, amplía rango; no borra.
- La práctica diaria sigue actualizando.
- Migración de `pe_placement_level` y del historial previo.
- El rango se recorta al contenido disponible por par.
- El test inmediato pesa menos; tras tiempo, pesa más.

**Aceptación:**

- No sobrescribe.
- No devuelve un nivel sin contenido.
- El rango es visible.
- El historial no se pierde.
- Un re-test no borra el anterior.

**Tests/gates:** tests de estimación, fixtures, migración.

### E4. Tarjeta Preparación y can-do

**Objetivo:** una sola tarjeta de perfil, can-do implícito.

**Entregables:**

- Una tarjeta "Preparación" en Mi Perfil.
- Grupos:
  - Comprensión: reading, listening.
  - Expresión: spoken_production controlada, tarea funcional cerrada,
    pronunciación, práctica abierta y fluidez (sin mastery en las tres últimas).
  - Precisión: grammar.
  - Vocabulario: vocabulary.
- Detalle por destreza.
- Can-do implícito, sin checklist visible.
- Sin auto-evaluación salvo práctica abierta o pronunciación, y sin mastery.
- Retos solo en ruta, cuando haya cobertura y retención.
- Migración de las tarjetas de progreso actuales a la tarjeta única.
- No se crea una tarjeta nueva por destreza.

**Aceptación:**

- No hay tarjetas duplicadas.
- No hay auto-evaluación como nota.
- Los retos no aparecen en modo libre.
- La tarjeta única muestra los cuatro grupos.
- Los retos no conceden mastery si son abiertos.

**Tests/gates:** `smoke`, `check-ui-system`, migración.

### E5. Mastery UI y migración

**Objetivo:** mostrar el mastery nuevo sin romper el progreso.

**Entregables:**

- Estados verdes/ámbar/neutros.
- Etiqueta "dominio controlado" y "dominio abierto pendiente" cuando aplique.
- Migración de progreso.
- Explicación de "no comprobado".
- Tests de regresión.

**Aceptación:**

- El progreso antiguo se conserva.
- No hay verdes falsos.
- La práctica abierta nunca es verde de mastery.

### F1. Investigación de evaluador

**Objetivo:** buscar una forma fiable de evaluar abierto, sin bloquear el plan.

**Entregables:**

- Benchmark por tarea e idioma.
- 100-200 respuestas etiquetadas por humanos.
- Precisión, recall, calibración, falsos positivos/negativos.
- Sesgos por acento, variedad y nivel.
- Modo sombra: el evaluador corre, pero no concede mastery.
- Estado "no evaluable" y umbral de confianza.
- Si no hay evaluador validado, la práctica abierta sigue como práctica.

**Aceptación:**

- No se implementa mastery abierto sin `validated`.
- No se construye gobernanza completa antes del piloto.
- El evaluador no se usa en actividades cerradas.
- La validación es por tarea e idioma, no global.

### F2. Piloto con aprendices

**Objetivo:** validar cobertura, transferencia interna y carga.

**Entregables:**

- Métricas:
  - finalización de sesión;
  - cobertura por destreza;
  - transferencia interna entre actividades;
  - distribución de mastery controlado/abierto;
  - tiempo y abandono;
  - uso de práctica abierta.
- Instrumentación local, sin backend: eventos en `localStorage`/IndexedDB con
  consentimiento y exportación opcional; sin PII.
- Cohorte y duración del piloto definidas antes de empezar.
- Ajustes de contenido y compositor.

**Aceptación:**

- La ruta no satura.
- La práctica abierta se usa.
- El mastery no se infla.
- Los datos se pueden borrar y exportar.
- No se envía audio a un servidor.

### F3. Contenido C1/C2

**Objetivo:** contenido real para C1/C2, fuera de este plan.

**Entregables:**

- Auditoría del "qué".
- Contenido por par y nivel.
- Publicar solo hasta el nivel con contenido real.

**Aceptación:** no se promete C1/C2 sin contenido.

## 5. Controles transversales

### 5.1 Definition of Done por fase

Una fase no está terminada hasta que:

- el objetivo se cumple sin depender de una fase futura;
- hay tests o asserts para la lógica nueva;
- la migración de datos funciona con fixtures;
- `node tools/gate-run.mjs` está verde;
- no hay `console.log` en producción;
- no hay enlaces rotos ni actividades huérfanas;
- la UI mantiene 44 px, foco, ARIA y contraste;
- el contenido nuevo pasa sus gates;
- se actualizó la documentación de referencia.

### 5.2 Visibilidad y rollout

- Cada actividad tiene `status`: `available`, `soon`, `hidden`.
- Un grupo sin actividades visibles no se muestra.
- Una actividad sin contenido no se activa.
- Una actividad cerrada no se publica con modelo.
- Una práctica abierta no se publica como evaluación.
- El rollout inicial es por par: `es-en`, `en-es`, `de-es`.
- Los pares de estrés pueden quedar ocultos hasta tener contenido.

### 5.3 Migración y rollback

- Copia de la clave antigua antes de migrar.
- Migración idempotente.
- Si falla, se conserva la clave antigua y se muestra un estado seguro.
- Rollback: ocultar la actividad/grupo y volver al contrato anterior, sin borrar
  datos del alumno.
- No hay migración destructiva en el primer arranque.

### 5.4 Matriz de pruebas

| Tipo | Qué cubre | Herramienta |
|---|---|---|
| Unitarias | Evidencia, mastery, compositor, evaluadores deterministas, placement | `node --test` / asserts |
| Integración | Grupo, nav, intento, evaluación, migración | `tests/smoke.mjs` |
| Contenido | Frases, vocab, variantes, cobertura, licencias | `check-content`, `check-variants`, `coverage`, `check-licenses` |
| Audio | Referencias, huérfanos, manifest, versiones | `check-audio-*` |
| UI | Tokens, componentes, i18n, a11y, layout | `check-ui-system`, `check-i18n`, `check-a11y`, `check-layout` |
| Hardware | Permisos, micrófono, sesión, estados | `npm run test:states` |
| Rendimiento | Carga y Lighthouse | CI / Lighthouse |
| Migración | v3, legacy, vacío, corrupto | fixtures |

### 5.5 Riesgos

| Riesgo | Mitigación |
|---|---|
| Migración pierde progreso | Backup, idempotencia, fixtures, rollback |
| Contenido insuficiente | Fase B6/C4, rollout por par, gates |
| Nav se desborda | Máximo 5 grupos, “Más”, short labels, tests 320 px |
| Compositor satura | 3-5 actividades, 20 min, tests de constraints |
| Audio llena el almacenamiento | Cuota, limpieza, borrado, aviso |
| Mastery se infla | Evidencia independiente, retención, sin open mastery |
| Evaluador se cuela antes | `closed` solo determinista; `open` sin mastery |
| Scope creep | No objetivos explícitos; fases atómicas |

## 6. Reglas de ejecución

- Una fase = un PR/ship. Si dura más de una semana, se parte.
- No empezar una fase sin sus dependencias.
- Cada fase termina con `node tools/gate-run.mjs` verde.
- Cada fase nueva deja tests o asserts.
- No se cambia el contrato de datos sin migración y test.
- No se añade una actividad al registro sin contenido mínimo.
- No se activa una actividad en ruta hasta que tenga contenido y evaluación.
- No se concede mastery desde práctica abierta.
- No se construye evaluador/gobernanza antes de F1.

## 7. Orden recomendado de arranque

1. A1: spec.
2. A2: registro.
3. A3: navegación por grupos y página de grupo.
4. A4: modelo de intento/evaluación/evidencia.
5. B1: Fill the gap como referencia.
6. E2: feedback básico, intentos y ámbar.
7. B2-B5: cerrar el resto.
8. B6: contenido de cerradas nuevas.
9. C1-C3: práctica abierta.
10. C4: contenido de práctica abierta.
11. D1-D3: compositor y ruta.
12. E1, E3-E5: mastery, placement, perfil y UI.
13. F1-F2: evaluador y piloto, en paralelo cuando toque.

## 8. Criterio de "punto deseado alcanzado"

- Todas las cerradas son deterministas.
- Todas las abiertas son práctica, sin mastery.
- La barra es por grupos y la página de grupo funciona.
- El compositor genera sesiones de 20 minutos sin saturar.
- El mastery controlado exige evidencia y retención; el mastery abierto queda
  pendiente de evaluador y no se muestra como verde.
- La ruta y el modo libre están integrados.
- El placement es por rango e historial.
- El feedback ámbar está implementado.
- La tarjeta Preparación es única.
- No hay evaluador validado, y no hace falta para cerrar el plan.
- `gate-run` verde y tests de migración.

## 9. Revisión de coherencia

Esta revisión corrige los huecos detectados al contrastar el plan con la
auditoría, las propuestas y el estado real del repo:

- **Mastery abierto:** `open_production` no puede ser requisito mientras no haya
  evaluador. Se separó `mastery_controlled` y `mastery_open`.
- **Registro de actividades:** ahora incluye metadatos de evidencia, duración,
  prerrequisitos y estado; sin ellos el compositor y el mastery no funcionan.
- **Contenido:** se añadieron B6 y C4; las actividades nuevas no se activan sin
  contenido ni audio.
- **Migración:** se explicitaron v3 -> v4, legacy `pe_srs`, backup, idempotencia
  y rollback.
- **Navegación:** landing, barra y página de grupo comparten fuente; se añadió
  service worker, i18n, grupo inválido, overflow y activo en actividad.
- **Feedback:** B1 deja feedback básico y E2 completa ámbar/reintentos/quality.
- **Grammar Workshop:** su fase comunicativa debe ser determinista o separarse
  como práctica abierta; no puede quedar auto-evaluada dentro de una cerrada.
- **Translation:** se queda cerrada con respuestas aceptadas; la traducción
  libre sería `open_practice`.
- **SRS vs mastery:** el SRS programa; el mastery se calcula con evidencia
  independiente y retención. No se pisan.
- **Transferencia interna:** se mide por familia de actividad, no por "pasó por
  todos los tipos".
- **Placement:** se recorta al contenido disponible y conserva historial.
- **Piloto:** se añadió instrumentación local sin backend, consentimiento y
  borrado/exportación.
- **Pruebas:** se añadió una matriz de pruebas y un Definition of Done.
- **Fuera de alcance:** UDL, interacción humana, far transfer, C1/C2, escritura,
  mediación, evaluación fonética y evaluador.
