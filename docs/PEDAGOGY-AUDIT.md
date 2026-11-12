# Auditoría pedagógica - el cómo

> **Alcance:** esta auditoría evalúa **cómo enseña** la app: tipos de ejercicio, carga
> cognitiva, feedback, secuencia, ruta, evaluación y accesibilidad. **No** evalúa la
> exactitud del contenido (frases, glosas, niveles o fuentes); eso queda para la
> auditoría de respaldo pedagógico del "qué". Fecha: 2026-11-10.
>
> **Propuestas de mejora:** cada hallazgo crítico tiene alternativas fundamentadas en
> [PEDAGOGY-PROPOSALS.md](PEDAGOGY-PROPOSALS.md).

## 1. Veredicto

La app tiene una base pedagógica real, no decorativa:

- **Retrieval practice** y **spaced repetition** en casi todas las actividades.
- Un **Grammar Workshop** de seis fases con noticing, input estructurado, producción
  controlada y producción comunicativa auto-evaluada.
- Frases contextualizadas por tema, audio pre-generado, variantes y etiquetas.
- Una ruta guiada con libertad ("guide + freedom"), sesiones de 20 minutos y
  placement inicial.

Pero el diseño está **desequilibrado hacia el aprendizaje de formas** y hacia tareas
de frase suelta. Le faltan los dos motores que la literatura considera esenciales para
"aprender un idioma de verdad":

1. **Input y output con foco en el significado** (comprensión y producción de discurso,
   no solo de ítems).
2. **Interacción y tareas comunicativas** (negociación de significado, propósito,
   audiencia, ciclo pre-task/task/post-task).

Además hay cuatro brechas concretas de implementación que afectan directamente al
aprendizaje:

- La actividad de **Speaking es lectura en voz alta**, no producción oral desde el
  significado: el texto objetivo está visible y el STT compara texto.
- La actividad de **Vocabulary no comprueba recuperación**: se puede girar la tarjeta
  y avanzar sin recuperar; además el SRS la puntúa siempre como "OK".
- La **ruta diaria excluye 21 de los 66 temas** (los vocab-only) y el **mastery del
  tema ignora Vocabulary, Quiz y Grammar**.
- No hay **C1/C2** en la ruta: el placement puede colocar en C1/C2, pero el contenido
  de temas llega a B2.

La recomendación no es reescribir la app. Es **conservar el motor de práctica y
reequilibrar el diseño** con input/output significativo, tareas, feedback correctivo
y una ruta que cubra todos los temas y habilidades.

## 2. Marco de referencia

La auditoría usa cinco marcos complementarios, no una sola "teoría":

| Marco | Qué aporta | Uso en esta auditoría |
|---|---|---|
| **Four Strands** (Nation) | Equilibrio entre input significativo, output significativo, aprendizaje enfocado en la lengua y fluidez | Mide el balance real de la ruta |
| **CEFR / Companion Volume** | Enfoque orientado a la acción, tareas, interacción, mediación, can-do descriptors | Evalúa si la app hace cosas con la lengua o solo ítems |
| **Skill acquisition** (DeKeyser) | Declarativo -> procedural -> automático; práctica distribuida y variada | Evalúa la progresión de grammar y producción |
| **TBLT** (Ellis; Long) | Ciclo de tarea, foco en la forma dentro de la tarea, interacción | Detecta la ausencia de tareas comunicativas |
| **Retrieval, spacing, interleaving, desirable difficulties** (Roediger & Karpicke; Cepeda; Rohrer & Taylor; Bjork) | Práctica de recuperación, distribución, intercalado y dificultad óptima | Valida el motor SRS y detecta dónde se diluye |
| **Corrective feedback** (Lyster & Ranta; Schmidt; VanPatten) | Noticing, input processing, recasts, prompts, feedback metalingüístico | Evalúa la calidad del feedback por actividad |
| **UDL** (CAST) | Múltiples medios de representación, acción/expresión e implicación | Evalúa "para todos" |

**Nota sobre estilos de aprendizaje:** no se recomienda adaptar actividades a "estilos
visual/auditivo/kinestésico". La evidencia no sostiene esa clasificación (Pashler et
al., 2008). Sí se recomienda ofrecer **múltiples medios** y **elección**, que es
distinto.

## 3. Modelo actual en una página

### Las 8 actividades

| Actividad | Qué hace el aprendiz | Destreza principal | Producción | Feedback | SRS |
|---|---|---|---|---|---|
| **Speaking** | Ve la frase objetivo, escucha, graba, el STT transcribe, compara | Pronunciación / lectura oral | Oral, pero con texto visible | Diff textual | Sí |
| **Dictation** | Escucha, escribe, ve diff palabra a palabra | Listening / ortografía | Escrita | Diff + audio | Sí |
| **Cloze** | Lee frase con hueco, escribe palabra, verifica | Reading / léxico | Escrita controlada | Diff + chip gramatical solo si acierta | Sí |
| **Scramble** | Reordena fichas para reconstruir la frase | Sintaxis / escritura | Escrita controlada | Diff | Sí |
| **Translation** | Lee L1, escribe L2, verifica | Producción de significado | Escrita | Diff + tip gramatical solo si acierta | Sí |
| **Quiz** | Elige definición/traducción entre 4 opciones | Vocabulario receptivo | Reconocimiento | Acierto/error + ejemplo | Sí |
| **Vocabulary** | Ve palabra, gira tarjeta, lee definición/ejemplo, avanza | Vocabulario receptivo | Ninguna comprobada | Ninguno | Sí, pero siempre quality 3 |
| **Grammar** | Contexto -> noticing -> regla -> input estructurado -> FITB -> producción libre auto-evaluada | Forma / gramática | Controlada + libre | Explicación, why, contraste | Sí, solo con FITB |

### La ruta

- Sesión diaria de **20 minutos**, máximo **10 cartas nuevas**, mínimo **3 nuevas**.
- Repasos primero (due), luego nuevas; una carta nueva por tipo de actividad en la
  primera pasada.
- Curva de dificultad: fácil -> difícil -> medio.
- `GUIDE_THRESHOLD`: el tema siguiente se activa cuando el anterior tiene **30% de
  Speaking visto**.
- `COMPLETE_THRESHOLD`: tema completo al **80%** de mastery medio de las 5 actividades
  primarias.
- Placement: 14 preguntas MCQ, 2 por banda (3 en B1/B2), umbrales fijos.
- Proficiency: una sola estimación Elo 0-1, ponderada por actividad.

## 4. Auditoría actividad por actividad

### 4.1 Speaking

**Cómo se presenta:** se muestra la frase en la lengua objetivo (`speaking/js/speaking.js:214`),
su fuente L1, botón de escucha, botón de micrófono y, tras la transcripción, un diff
textual. Si no hay STT, hay un campo de texto alternativo (`speaking.js:65-68`).

**Qué entrena bien:** pronunciación a nivel de lectura, correspondencia
ortografía-sonido, algo de listening, y confianza con el micrófono.

**Brecha principal:** es **lectura en voz alta**, no producción oral desde el
significado. El texto objetivo está siempre visible; el aprendiz no tiene que recuperar
la forma. El STT compara la transcripción con el texto (`speaking.js:589-594`), pero no
evalúa pronunciación, prosodia, fluidez ni inteligibilidad. No hay playback de la propia
grabación, ni comparación con el modelo, ni rúbrica de auto-evaluación. Tampoco hay
interacción.

**Consecuencia:** la actividad etiquetada como "Speaking" no cubre el constructo de
producción oral comunicativa. Sirve como práctica de lectura oral y pronunciación
básica, no como speaking.

### 4.2 Dictation

**Cómo se presenta:** audio, botón de escucha, número de palabras y ranuras
(`dictation/js/dictation.js:177-188`), input, diff palabra a palabra. Solo se acepta la
forma reproducida (`dictation.js:259-260`).

**Qué entrena bien:** discriminación auditiva, memoria de trabajo, ortografía,
segmentación y atención a la forma. Es una tarea de listening intensivo útil.

**Brechas:** no hay velocidad lenta ni reproducción por fragmentos; no hay comprensión
global (gist) ni preguntas de detalle; no hay transcripción alternativa para personas
sordas o con dificultad auditiva; no hay feedback sobre por qué falló; el foco es la
transcripción exacta, no la comprensión. Es una tarea de forma, no de significado.

### 4.3 Cloze

**Cómo se presenta:** frase objetivo con un hueco, fuente L1 visible, input, botón de
audio, verificación, diff y chip gramatical **solo si acierta** (`cloze/js/cloze.js:265-318`).

**Qué entrena bien:** recuperación de una palabra en contexto, generación, ortografía y
lectura de frase. El hueco se elige de forma determinista entre palabras de contenido
(`shared/js/text-utils.js:179-207`), lo que evita huecos triviales.

**Brechas:** un solo hueco; no hay inferencia de significado a nivel de discurso; el
feedback en error es un diff, sin explicación de la regla; el chip de gramática se
oculta justo cuando el aprendiz lo necesita; reintentar no vuelve a puntuar el SRS.
Puede convertirse en "adivinar la palabra" si la fuente L1 hace el trabajo semántico.

### 4.4 Scramble

**Cómo se presenta:** fuente L1, fichas desordenadas, construcción, verificación, diff
(`scramble/js/scramble.js:310-364`).

**Qué entrena bien:** orden de palabras, sintaxis, construcción de frase, atención a
morfemas y concordancia.

**Brechas:** no hay audio modelo; no hay explicación gramatical en el error (el chip
solo aparece si acierta); no hay contexto de discurso; la tarea se puede resolver por
sintaxis sin comprender el significado; reintentar no vuelve a puntuar.

### 4.5 Translation

**Cómo se presenta:** fuente L1, input L2, verificación, diff, audio después de
responder, tip gramatical y chip solo si acierta (`translation/js/translation.js:263-376`).

**Qué entrena bien:** recuperación léxica y sintáctica desde el significado, producción
escrita controlada, atención a variantes. Es una de las tareas con mayor "desirable
difficulty" del conjunto.

**Brechas:** la corrección es exacta contra formas aceptadas; puede rechazar
alternativas naturales; el feedback de error no explica la regla; el audio llega
después; no hay propósito comunicativo ni audiencia; reintentar no vuelve a puntuar.

### 4.6 Quiz

**Cómo se presenta:** palabra objetivo, cuatro opciones (traducción L1 en A1/A2,
definición L2 en B1+), feedback, ejemplo (`quiz/js/quiz.js:21-25`, `241-295`).

**Qué entrena bien:** reconocimiento de significado, testing effect, discriminación
entre opciones, vocabulario receptivo. Los distractores se eligen por dificultad y se
evitan cognados triviales.

**Brechas:** es reconocimiento, no producción; no hay audio de la palabra; no hay
contexto de frase; se puede acertar por eliminación; no hay feedback metalingüístico;
el SRS lo puntúa como una tarea de producción en los repasos.

### 4.7 Vocabulary

**Cómo se presenta:** tarjeta frontal con palabra/formas, audio, giro, definición L1/L2,
ejemplo, traducción, variantes (`vocabulary/js/vocabulary.js:217-304`).

**Qué entrena bien:** presentación multimodal, forma-significado, variantes, ejemplo,
definición adaptada al nivel (Laufer & Shmueli). El audio y las formas son un buen
andamiaje.

**Brecha principal:** **no hay comprobación de recuperación**. El aprendiz puede girar
la tarjeta inmediatamente y pulsar "siguiente"; el botón llama a `rateAndNext(3)` y el
SRS puntúa siempre "OK" (`vocabulary.js:91`, `396-400`). No hay "Again/Hard/Good/Easy",
ni recall antes de revelar, ni producción. Es una actividad de presentación, no de
práctica de recuperación.

### 4.8 Grammar

**Cómo se presenta:** contexto dialógico, noticing con respuestas escritas, explicación,
input estructurado referencial/afectivo, producción FITB y producción comunicativa
auto-evaluada (`grammar/js/grammar.js:418-973`). El SRS se calcula solo con el FITB
(`grammar.js:980-1016`).

**Qué entrena bien:** es la actividad más alineada con la literatura: noticing
(Schmidt), input processing (VanPatten), foco en la forma, producción controlada y
producción libre; incluye re-entrada y frases relacionadas. El feedback tiene veredicto,
explicación y contraste.

**Brechas:** el diálogo de contexto no tiene audio; las respuestas de noticing solo se
validan por longitud, no por contenido; el input estructurado es MCQ; la producción
libre es auto-evaluada y el modelo es opcional; el SRS ignora el input estructurado y la
producción libre; la cobertura de reglas es desigual entre pares; no hay interacción.

## 5. Ruta y progresión

### Lo que está bien

- **Guide + freedom:** todos los temas accesibles, con recomendación y escape hatch.
- **Sesión acotada:** 20 minutos, 10 nuevas máximo, 3 mínimas; evita sesiones
  interminables.
- **Repaso primero, luego nuevas:** alinea con spacing/retrieval.
- **Intercalado de actividades:** una nueva por tipo de actividad en la primera pasada.
- **Curva de dificultad:** intenta evitar fatiga y picos; es una hipótesis razonable.
- **Placement bootstrap:** desbloquea temas hasta el nivel detectado.
- **Transparencia:** la ruta muestra pasos, due, mastery y tiempo estimado.

### Brechas estructurales

1. **21 de 66 temas no entran en la ruta.** `AppPath.load()` reconstruye `TOPICS` solo
   con `topics.json` que tienen `phrase: true` (`shared/js/path.js:545-563`). Los 21
   temas vocab-only (`general`, `verbos_basicos`, `adjetivos_basicos`, `colores`,
   `naturaleza`, `tiempo`, `lugares`, `cantidad`, `juegos`, `ropa`, `lengua`,
   `sociedad_politica`, `trabajo`, `educacion`, `objetos`, `dispositivos`, `internet`,
   `software_apps`, `ciberseguridad`, etc.) quedan fuera de la sesión diaria. El
   aprendiz solo los encuentra si navega manualmente.
2. **El mastery del tema ignora 3 de las 8 actividades.** `getTopicMastery` promedia
   solo Speaking, Dictation, Cloze, Scramble y Translation
   (`path.js:183-197`). Vocabulary, Quiz y Grammar no cuentan para el 80% de tema
   completo, aunque la lista de pasos sí los muestra (`path.js:468-540`).
3. **El orden de la sesión y el orden visual no coinciden.** `PathSession` usa
   `speaking, grammar, vocabulary, quiz, cloze, dictation, translation, scramble`
   (`path-session.js:25-26`), mientras la ruta visual muestra
   `speaking, vocabulary, cloze, dictation, translation, scramble, grammar`
   (`path.js:509-531`). Un aprendiz ve una secuencia y recibe otra.
4. **El placement deja de proteger la ruta tras la primera práctica.** El bootstrap
   solo se aplica si no hay ninguna carta de Speaking vista (`path.js:240-243`). Tras
   una sola práctica, vuelve el gate de 30% del tema anterior; un aprendiz colocado en
   B2 puede perder acceso a temas B1/B2 aunque su nivel lo justifique.
5. **Los umbrales son arbitrarios y no son can-do.** 30% de Speaking visto, 80% de
   media, `interval > 14` como "mastered". No hay descriptores CEFR, ni criterios por
   destreza, ni una definición de "puedo hacer X".
6. **No hay ruta de fluidez.** No hay repetición de material familiar con presión de
   tiempo, lectura extensiva, listening extensivo ni técnica 4/3/2.
7. **No hay cuaderno de errores ni repaso dirigido a fallos.** El SRS programa la
   tarjeta, pero no hay una vista "mis errores" ni una práctica de contraste
   (ser/estar, por/para, etc.).
8. **El intercalado no es semántico.** Se intercalan actividades, pero no
   necesariamente formas confundibles; la selección nueva usa CEFR y preferencias, no
   confusabilidad ni frecuencia.
9. **C1/C2 no existe en la ruta.** El nivel máximo de tema es B2; el placement puede
   devolver C1/C2 y no hay contenido para sostenerlo. Un aprendiz C1/C2 recibe material
   B2 como máximo.

## 6. Cobertura por constructo

Escala: **fuerte / parcial / ausente**.

| Constructo | Estado | Evidencia |
|---|---|---|
| Recuperación y spacing | **Fuerte** | SRS, due queue, repasos, tarjetas por actividad |
| Aprendizaje enfocado en la forma | **Fuerte** | Grammar Workshop, cloze, dictation, translation |
| Input significativo (listening/reading) | **Parcial** | Audio de frase, dictation; no discurso ni textos |
| Output significativo (speaking/writing) | **Parcial** | Translation y grammar express; speaking es lectura |
| Interacción / negociación de significado | **Ausente** | No hay diálogo, rol, peer ni agente |
| Tareas comunicativas / CEFR acción | **Parcial** | Contexto por temas, pero ejercicios item-based |
| Fluidez | **Ausente** | No hay repetición cronometrada ni material familiar |
| Pronunciación | **Parcial** | TTS/STT, pero sin feedback fonético/prosódico |
| Vocabulario profundo | **Parcial** | Definición, ejemplo, variantes; sin colocaciones/familias |
| Pragmática / interculturalidad | **Parcial** | Etiquetas de registro/región; sin tareas de adecuación |
| Evaluación formativa | **Parcial** | Feedback inmediato, SRS, placement; sin rúbricas/can-do |
| Autonomía / estrategias | **Parcial** | Guide + freedom, preferencias; sin entrenamiento de estrategias |
| Accesibilidad / UDL | **Parcial** | WCAG, teclado, texto alternativo; sin captions/velocidad |
| Motivación | **Parcial** | Streak, confetti, milestones; sin relación social |

## 7. Prioridades

### P0 - cambios de diseño que más aprenden

1. **Convertir Speaking en producción oral desde el significado.**
   - Ocultar el texto objetivo; mostrar la fuente L1 o una imagen/situación.
   - Aceptar todas las formas válidas del concepto, no solo la mostrada.
   - Permitir grabar y escuchar la propia producción; comparar con el modelo.
   - Añadir una rúbrica corta de auto-evaluación (inteligibilidad, fluidez,
     adecuación) y, si se puede, feedback de pronunciación.
   - Mantener una variante de lectura oral como actividad separada, no como "Speaking".

2. **Hacer Vocabulary retrieval-first.**
   - Mostrar L1/definición y pedir la forma; revelar después.
   - Botones **Again / Hard / Good / Easy** (o al menos "no lo sabía / lo sabía").
   - Audio en la respuesta; ejemplo después; no permitir avanzar sin intento.
   - SRS con quality real, no `3` fijo.

3. **Incluir los 21 temas vocab-only en la ruta.**
   - `AppPath.TOPICS` debe derivar también de `topics.json` con `vocab: true` y un
     nivel CEFR; los temas sin nivel deben recibir uno antes de entrar.
   - La sesión debe poder programar Vocabulary/Quiz de esos decks.

4. **Alinear mastery con lo que se muestra.**
   - `getTopicMastery` debe incluir Vocabulary, Quiz y Grammar, o declarar
     explícitamente que el tema "completo" es solo de frases.
   - Mejor: mastery por destreza + mastery global; el 80% debe ser un criterio
     declarado, no una media oculta.

5. **Corregir el placement bootstrap y el orden.**
   - El nivel de placement debe ser un **floor** hasta que el aprendiz supere el
     mastery del nivel, no un bootstrap de una sola vez.
   - Unificar `ACT_ORDER` de sesión con el orden visual de la ruta.
   - Revisar el gate de 30% de Speaking: si Speaking pasa a producción, el gate debe
     medir algo significativo (comprensión/producción), no lectura oral.

6. **Feedback correctivo en el error.**
   - Mostrar el chip/regla también cuando falla, no solo cuando acierta.
   - Añadir un prompt de corrección (intenta de nuevo, explica la diferencia) y, en
     Grammar, mantener el feedback metalingüístico.
   - Evitar que el aprendiz avance sin corregir; el botón "try again" debe ser el
     camino principal tras un fallo.

7. **Añadir input/output significativo y tareas.**
   - Un diálogo corto por tema (4-6 turnos) con audio y transcripción, preguntas de
     gist/detalle y una tarea de rol.
   - Una tarea de escritura corta con propósito (mensaje, reseña, invitación) y
     rúbrica.
   - Un ciclo TBLT: pre-task (esquema/vocabulario), task (resultado), planning/report,
     focus on form, repeat task.

8. **C1/C2 y can-do descriptors.**
   - Añadir temas/contenido C1/C2 o declarar que la app llega a B2.
   - Mapear cada tema a descriptores CEFR "puedo hacer" y usarlos en la ruta y el
     progreso.
   - El placement debe devolver un perfil por destreza, no un único nivel.

### P1 - mejoras de alto valor

- **Dictation:** velocidad 0.75x, reproducción por fragmentos, una pregunta de gist y
  otra de detalle, transcripción opcional para accesibilidad.
- **Scramble:** audio modelo después de responder, explicación de orden/concordancia,
  una versión con contexto.
- **Quiz:** audio de la palabra, una opción de producción, contexto de frase.
- **Vocabulary:** colocaciones, familias de palabras y una frase de producción.
- **SRS:** quality 2/4, self-rating, confianza, penalización por pista, re-rating tras
  reintento exitoso, transferencia parcial entre actividades.
- **Sesión:** plantilla de Four Strands (input, output, forma, fluidez), no solo
  actividades; bloques de 5-10 minutos con propósito declarado.
- **Errores:** cuaderno de errores, repaso de confundibles, "por qué fallé".
- **Accesibilidad:** captions/transcripción, control de velocidad, alternativa textual
  a dictation, tamaño de fuente/dyslexia, playback de la propia voz.
- **Placement:** adaptativo por destreza, con listening/reading y una tarea corta de
  producción; etiquetarlo como orientación, no certificación.

### P2 - futuro

- FSRS en lugar de SM-2.
- Pronunciación con feedback fonético (forced alignment/ASR especializado).
- Interacción con agente/peer, si el producto lo permite.
- Analítica de retención a 7/30 días y de transferencia entre destrezas.
- Contenido extensivo (reading/listening) por nivel.

## 8. Modelo objetivo de sesión

Una sesión de 20 minutos alineada con Four Strands:

| Bloque | Minutos | Qué se hace | Evidencia |
|---|---:|---|---|
| Input significativo | 5 | Diálogo/texto corto con audio, gist + detalle | Nation; Vandergrift & Goh; Grabe |
| Forma | 5 | Vocabulario en recuperación + grammar noticing/input | Nation; Schmidt; VanPatten |
| Output significativo | 5 | Tarea oral o escrita con propósito | Swain; Ellis; DeKeyser |
| Fluidez | 3 | Repetición de material familiar, 4/3/2 o lectura cronometrada | Nation |
| Cierre | 2 | Feedback, error log, auto-evaluación | Black & Wiliam; Lyster & Ranta |

La ruta actual ya tiene la infraestructura para hacer esto: temas, frases, audio,
gramática, SRS y una sesión de 20 minutos. Lo que falta es **cambiar la unidad de
diseño**: de "ítem + actividad" a "tarea + destreza + evidencia".

## 9. Métricas para validar el rediseño

- % de sesiones que cubren los cuatro strands.
- % de temas con cobertura de las 8 actividades y de las 4 destrezas.
- % de ítems con feedback correctivo en el error (no solo diff).
- Retención a 7 y 30 días por destreza.
- Tiempo hasta mastery por tema y por destreza.
- Tasa de abandono tras error y tras reintento.
- Auto-eficacia declarada y carga cognitiva percibida.
- Accesibilidad: dictation con alternativa, velocidad, captions, teclado.
- Transferencia: mejora en producción no ensayada (speaking/writing) tras práctica
  receptiva.

## 10. Lo que hay que conservar

- Grammar Workshop de seis fases.
- SRS y repaso diario.
- Frases contextualizadas y audio.
- Variantes, etiquetas y registro.
- Guide + freedom y sesiones de 20 minutos.
- Feedback inmediato con diff.
- Transparencia de progreso.
- La disciplina de gates y documentación.

## 11. Fuentes

- Council of Europe (2020). *Common European Framework of Reference for Languages:
  Companion Volume*. https://www.coe.int/en/web/common-european-framework-reference-languages
- Nation, I. S. P. (2007). The Four Strands. *Innovation in Language Learning and
  Teaching*, 1(1). https://doi.org/10.2167/illt039.0
- Ellis, R. (2003). *Task-based Language Learning and Teaching*. Oxford University
  Press.
- Long, M. H. (1996). The role of the linguistic environment in second language
  acquisition. In *Handbook of Second Language Acquisition*.
- Swain, M. (1985). Communicative competence: Some roles of comprehensible input and
  comprehensible output in its development. In *Input in Second Language Acquisition*.
- Schmidt, R. (1990). The role of consciousness in second language learning. *Applied
  Linguistics*, 11(2), 129-158. https://doi.org/10.1093/applin/11.2.129
- VanPatten, B. (2004). *Processing Instruction: Theory, Research, and Commentary*.
- Lyster, R., & Ranta, L. (1997). Corrective feedback and learner uptake. *Studies in
  Second Language Acquisition*, 19(1), 37-66.
  https://doi.org/10.1017/S0272263197004014
- DeKeyser, R. (2007). Skill acquisition theory. In *Theories in Second Language
  Acquisition*.
- Sweller, J. (1988). Cognitive load during problem solving. *Cognitive Science*,
  12(2), 257-285. https://doi.org/10.1207/s15516709cog1202_4
- Bjork, E. L., & Bjork, R. A. (2011). Making things hard on yourself, but in a good
  way. In *Psychology and the Real World*.
- Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning. *Psychological
  Science*, 17(3), 249-255. https://doi.org/10.1111/j.1467-9280.2006.01693.x
- Cepeda, N. J., et al. (2006). Distributed practice in verbal recall tasks.
  *Psychological Bulletin*, 132(3), 354-380.
  https://doi.org/10.1037/0033-2909.132.3.354
- Rohrer, D., & Taylor, K. (2007). The shuffling of mathematics problems improves
  learning. *Instructional Science*, 35, 481-498.
  https://doi.org/10.1007/s11251-006-9005-1
- Pashler, H., et al. (2008). Learning styles: Concepts and evidence. *Psychological
  Science in the Public Interest*, 9(3), 105-119.
  https://doi.org/10.1111/j.1539-6053.2009.01038.x
- Nation, I. S. P. (2013). *Learning Vocabulary in Another Language* (2nd ed.).
  Cambridge University Press.
- Grabe, W. (2009). *Reading in a Second Language*. Cambridge University Press.
- Vandergrift, L., & Goh, C. C. M. (2012). *Teaching and Learning Second Language
  Listening*. Routledge.
- Derwing, T. M., & Munro, M. J. (2015). *Pronunciation Fundamentals*. John Benjamins.
- Kasper, G., & Rose, K. R. (2002). *Pragmatic Development in a Second Language*.
  Blackwell.
- Byram, M. (1997). *Teaching and Assessing Intercultural Communicative Competence*.
  Multilingual Matters.
- CAST (2018). *Universal Design for Learning Guidelines*.
  https://udlguidelines.cast.org/
- Deci, E. L., & Ryan, R. M. (2000). The "what" and "why" of goal pursuits.
  *Psychological Inquiry*, 11(4), 227-268.
- Black, P., & Wiliam, D. (1998). Assessment and classroom learning. *Assessment in
  Education*, 5(1), 7-74.

---

## 12. Re-auditoría con la propuesta de dos familias

> Fecha: 2026-11-12. Evalúa el "cómo" con la propuesta de actividades cerradas
> deterministas y práctica abierta separada, sin botón "Analizar mi respuesta".

### 12.1 Veredicto

**Aprobado con condiciones.** La propuesta mejora la cobertura de práctica y la
honestidad de la evaluación. No alcanza "pedagogía para todos" ni cubre
interacción espontánea real. Es un curso coherente de **práctica guiada y
evaluación controlada**; no es todavía un curso de conversación.

### 12.2 Lo que mejora

- **Four Strands:** por primera vez están las cuatro hebras. Input significativo
  (lectura, listening, dictation), output significativo (producción guiada,
  práctica abierta, tareas), aprendizaje enfocado en la forma (grammar,
  vocabulary, fill the gap, cloze) y fluidez (práctica abierta, fluidez 4/3/2).
- **CEFR:** las tareas cerradas y abiertas acercan el diseño al enfoque
  orientado a la acción. La producción oral guiada cubre descriptores de
  producción; la práctica abierta cubre producción espontánea.
- **Skill acquisition:** hay declarativo (Grammar Workshop), procedural
  (práctica controlada) y automaticidad (práctica abierta, fluidez).
- **Evaluación:** las actividades cerradas son deterministas y el mastery solo
  se calcula desde evidencia validada. La práctica abierta no finge ser
  evaluación. Esto corrige el problema de validez más grave.
- **Transparencia:** el alumno distingue práctica de evaluación; no hay
  verde/rojo falsos; se muestran referencias y elementos esperados.
- **Modelo de datos:** `family`, `assessmentMode`, `evidenceLevel`, intento y
  evaluación separados. La práctica abierta puede escalar a evidencia por tarea
  e idioma sin rehacer el modelo.

### 12.3 Lo que sigue en brecha

- **Interacción humana:** fuera de alcance. La práctica abierta en solitario es
  producción, no conversación. Un interlocutor AI, si se añade, sería
  interacción simulada. Los diálogos ramificados son simulación cerrada.
- **Feedback:** sin "Analizar mi respuesta", la práctica abierta no recibe
  corrección específica. Las referencias y la auto-valoración ayudan a notar,
  pero no son feedback correctivo. Hay riesgo de fossilización.
- **UDL / "para todos":** fuera de alcance. No se audita ni se promete.
- **Pronunciación:** la lectura en voz alta con ASR de texto no evalúa fonética,
  prosodia ni inteligibilidad. Es práctica, no evidencia.
- **Escritura, mediación e interacción online:** no están cubiertas. El CEFR
  Companion Volume las incluye; si el producto promete cobertura integral, son
  una brecha.
- **Ruta:** el catálogo crece. Meter todas las actividades en cada sesión
  saturaría la ruta. Hace falta un compositor de sesión que seleccione por
  cobertura, spacing e interleaving, no una lista fija.
- **Evidencia de la práctica abierta:** no hay mastery. Es correcto, pero el
  producto debe ajustar sus promesas y no usar la práctica abierta como prueba
  de conversación.

### 12.4 Tabla de auditoría

| Dimensión | Estado | Lo que hay | Brecha | Acción |
|---|---|---|---|---|
| Four Strands | Fuerte en práctica; parcial en evidencia | Las cuatro hebras presentes | Fluidez e interacción sin evidencia | Medir práctica y evidencia por separado |
| CEFR orientado a la acción | Parcial | Tareas cerradas y abiertas | Mediación, interacción online | Añadir o declarar fuera de alcance |
| Interacción humana | Fuera de alcance | Práctica abierta y diálogos simulados | No hay interlocutor humano | No prometer conversación humana |
| Skill acquisition | Fuerte en controlado; parcial en automático | Declarativo, procedural, práctica | Automaticidad sin feedback | Modelo, auto-chequeo, revisión periódica |
| Retrieval y spacing | Fuerte en cerrado; parcial en abierto | SRS, variantes, repaso | Práctica abierta sin programación | Calendario de práctica, no mastery |
| Feedback correctivo | Fuerte en cerrado; débil en abierto | Diff, pistas, reglas | Sin corrección específica en abierto | Referencias + auto-chequeo + revisión futura |
| UDL / para todos | Fuera de alcance | Audio, texto, variantes | No se aborda | No prometer "para todos" |
| Validez de evaluación | Fuerte en cerrado; honesta en abierto | Determinista vs práctica | Abierto sin evidencia | Claims precisos; evaluador futuro |
| Ruta | Parcial | Ruta guiada, 20 min | Riesgo de saturación | Compositor de sesión por cobertura |
| Presentación | Fuerte | Práctica vs evaluación clara | Auto-chequeo puede ser carga | Divulgación progresiva |
| Alineación con fuentes | Fuerte | Nation, CEFR, DeKeyser, TBLT, feedback | Interacción humana y UDL fuera de alcance | Declarar límites y priorizar |

### 12.5 Condiciones para aprobar sin reservas

1. **Claim del producto:** "práctica guiada + evaluación controlada", no
   "conversación humana" ni "cobertura integral". La interacción humana y UDL
   quedan fuera de alcance.
2. **Práctica abierta programada:** al menos una por unidad o tema, con
   referencias, elementos y auto-chequeo. No dejarla como extra opcional.
3. **Feedback:** modelo + auto-chequeo + revisión periódica. Sin "Analizar" no
   hay corrección específica; si se quiere aprendizaje, hace falta un canal de
   feedback, aunque sea diferido.
4. **Pronunciación:** etiquetarla como práctica, no como evaluación, hasta que
   haya un evaluador fonético validado.
5. **Escritura/mediación:** añadirlas o declararlas fuera de alcance.
6. **Ruta:** compositor de sesión, no todas las actividades cada día. Priorizar
   cobertura, spacing e interleaving.
7. **Medición:** mapear actividades a descriptores CEFR y contar práctica y
   evidencia por separado; pilotar con aprendices.
8. **Gobernanza del evaluador:** si se implementa, validar por tarea e idioma,
   versionar, medir sesgos, proteger privacidad y mantener revisión humana.

### 12.6 Conclusión

La propuesta es pedagógicamente coherente y mucho más honesta que el diseño
anterior. Pasa como **práctica guiada con evaluación controlada**. No pasa como
**curso de conversación humana** ni como **pedagogía para todos**; ambos quedan
fuera de alcance, no son brechas pendientes.

La diferencia principal con la auditoría anterior es que ya no hay que fingir
que las tareas cerradas cubren la interacción. La práctica abierta cubre parte
de la producción y la fluidez; la interacción humana no es una promesa del
producto.

### 12.7 Si se implementa un evaluador validado

Un evaluador no cambia la pedagogía por sí solo. Cambia la **evidencia** y el
**feedback** de los constructos que valida. Hay que distinguir tres escenarios.

#### A. Evaluador de producción abierta, sin interlocutor

El alumno produce un monólogo o una tarea abierta; el evaluador la corrige.

- **Cierra:** producción espontánea, fluidez, cumplimiento de la tarea,
  pragmática parcial.
- **No cierra:** interacción y negociación de significado, porque no hay
  interlocutor; UDL, escritura, mediación y pronunciación siguen fuera.
- **Auditoría:** pasa a **aprobado en producción, tarea y fluidez**; sigue
  **condicional en conversación y en "para todos"**.

#### B. Evaluador + interlocutor AI

El alumno conversa con un interlocutor AI y el evaluador puntúa la interacción.

- **Añade:** turnos, reparación, petición de aclaración, negociación simulada.
- **Evidencia:** válida solo si se valida con humanos y se acepta que el
  interlocutor es AI. No sustituye la interacción humana; puede ser un puente.
- **Auditoría:** **aprobado en práctica de conversación simulada**; evidencia de
  interacción **parcial**; sigue condicional en interacción humana y UDL.

#### C. Evaluador + revisión humana

El evaluador propone y una persona revisa una muestra o todos los intentos.

- **Cierra:** interacción, pragmática y adecuación cultural con alta validez.
- **Coste:** alto; no es una PWA completamente automática.
- **Auditoría:** **aprobado en conversación**; siguen pendientes UDL, escritura
  y mediación si no se añaden.

### Qué cambia en la tabla

| Dimensión | Sin evaluador | Con evaluador A | Con evaluador B/C |
|---|---|---|---|
| Producción espontánea | Práctica sin evidencia | Evidencia validada | Evidencia validada |
| Fluidez | Práctica sin evidencia | Evidencia validada | Evidencia validada |
| Tarea abierta | Práctica sin evidencia | Evidencia validada | Evidencia validada |
| Interacción | Débil | Débil | Parcial (B) / fuerte (C) |
| Feedback correctivo | Débil en abierto | Fuerte en lo validado | Fuerte |
| Validez de evaluación | Fuerte en cerrado | Fuerte en cerrado + abierto validado | Fuerte |
| UDL / para todos | Débil | Débil | Débil si no se aborda |
| Escritura/mediación | Débil | Débil | Débil si no se añade |
| Pronunciación | Práctica | Práctica | Práctica, salvo evaluador fonético |
| Ruta | Riesgo de saturación | Mismo riesgo | Mismo riesgo |

### Condiciones para que el evaluador cuente

- Validación **por tarea e idioma**, no global.
- 100-200 respuestas etiquetadas por humanos como mínimo.
- Precisión, recall, falsos positivos, falsos negativos, calibración y acuerdo
  inter-evaluador.
- Prueba de sesgos por acento, variedad y nivel.
- Estado "no evaluable" cuando la confianza sea baja.
- Feedback específico, no solo una nota.
- Mastery solo con `evidenceLevel: validated` y confianza suficiente.
- Revisión humana por muestreo y versión del evaluador.
- Consentimiento y privacidad si el evaluador es remoto.

### Veredicto con evaluador

- **A:** aprobado para producción, tarea y fluidez; condicional para
  conversación y "para todos".
- **B:** aprobado para práctica de conversación simulada; condicional para
  interacción humana y UDL.
- **C:** aprobado para conversación; condicional en UDL, escritura y mediación
  si no se añaden.

El evaluador cierra la brecha de **evidencia** de la producción abierta. No
cierra la **interacción humana** ni la **UDL**, porque ambas quedan fuera de
alcance.

### 12.8 Alcance excluido y brechas restantes

**Fuera de alcance:**

- **UDL / "para todos":** no se audita ni se promete.
- **Interacción humana auténtica:** no se promete. La práctica abierta es
  producción; un interlocutor AI sería interacción simulada.
- **Contenido C1/C2:** se decidirá en la auditoría del "qué", no en esta.
- **Transferencia al mundo real:** no se puede certificar sin interacción
  humana. Sí se puede medir transferencia interna.

**Brechas que quedan:**

- transferencia interna entre actividades: Fill the gap -> producción abierta,
  Vocabulary cloze -> Vocabulary Practice, diálogo ramificado -> tarea abierta.
  Se concreta como **dominio por cobertura**: no es "pasó por todos los tipos",
  sino "evidenció las dimensiones requeridas sin apoyo y las retiene". Ver
  [PEDAGOGY-MASTERY.md](PEDAGOGY-MASTERY.md).
- ruta y composición de sesión: qué actividades entran, en qué orden y cuántas.
  El compositor se especifica en [PEDAGOGY-MASTERY.md](PEDAGOGY-MASTERY.md).
- gobernanza del evaluador: se difiere hasta que exista una forma de evaluar;
  antes solo hay práctica, privacidad y borrado de audio.
- feedback de la práctica abierta sin "Analizar";
- pronunciación, escritura y mediación si no se añaden.
