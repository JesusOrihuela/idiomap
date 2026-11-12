# Propuestas por hallazgo crítico

> Documento complementario de [PEDAGOGY-AUDIT.md](PEDAGOGY-AUDIT.md). Para cada
> hallazgo se proponen varias alternativas, con su fundamento, coste relativo y
> encaje en una PWA estática (GitHub Pages, localStorage, audio pre-generado,
> TTS/STT en el dispositivo, sin backend). No hay una sola solución "correcta":
> hay opciones que compiten por coste, fidelidad pedagógica y complejidad.

## Cómo leer las propuestas

- **Evidencia fuerte:** revisiones, meta-análisis o consenso amplio.
- **Evidencia moderada:** estudios empíricos con límites de contexto.
- **Evidencia emergente:** prometedora, pero dependiente de tecnología o
  implementación.
- **Coste:** L = bajo, M = medio, H = alto, en esfuerzo de producto/contenido.
- **Recomendación:** la opción que mejor equilibra aprendizaje, coste y encaje
  con la arquitectura actual.
- **Cómo se ve y qué hace el usuario:** cada propuesta termina con este apartado,
  que describe su pantalla y su flujo de uso.

---

## Hallazgo 1 - Speaking es lectura en voz alta

**Problema:** el texto objetivo está visible, el STT compara texto y no hay
feedback de pronunciación, prosodia ni fluidez.

### Propuesta A - Producción oral desde el significado, sin ASR fonético

- **Qué cambia:** ocultar el texto objetivo; mostrar la fuente L1, una situación o
  una imagen; pedir la frase; aceptar todas las formas válidas del concepto;
  revelar el modelo después; permitir grabar y escuchar la propia voz.
- **Evidencia:** output hypothesis (Swain, 1985), auto-monitorización y
  pronunciación centrada en inteligibilidad (Derwing & Munro, 2015); el feedback
  diferido/modelo es útil cuando no hay evaluador humano.
- **Coste:** M. Reutiliza el audio y el STT actuales; requiere UI de grabación,
  reproducción y comparación, y aceptar variantes.
- **Riesgo:** el STT sigue sin evaluar pronunciación; puede haber falsos negativos
  por acento. Se mitiga aceptando variantes y no puntuando la pronunciación como
  si fuera una prueba fonética.
- **Encaje:** alto. No necesita backend.

#### Cómo se ve y qué hace el usuario

En pantalla aparece una situación cotidiana (por ejemplo, pedir una habitación) y un botón para grabar. No se muestra la frase que hay que decir. El usuario piensa la frase, la dice en voz alta, escucha su grabación y la compara con un modelo que aparece después. La app le dice si se entendió y le deja repetir.

### Propuesta B - Producción oral con rúbrica de auto-evaluación

- **Qué cambia:** añadir una rúbrica de 3 criterios (inteligibilidad, fluidez,
  adecuación a la tarea) y una auto-evaluación de 1-3; el SRS usa la rúbrica, no
  solo el texto del STT.
- **Evidencia:** evaluación formativa y auto-evaluación (Black & Wiliam, 1998;
  Oscarson); rúbricas para producción oral (CEFR Companion Volume).
- **Coste:** M. Requiere diseñar rúbricas por nivel y entrenar al aprendiz en su
  uso.
- **Riesgo:** auto-evaluación inflada; necesita anclas/modelos y calibración.
- **Encaje:** alto, especialmente como puente antes de un evaluador automático.

#### Cómo se ve y qué hace el usuario

En pantalla aparece la misma situación y una lista sencilla para valorar si se le entendió, si habló con fluidez y si respondió a la situación. El usuario graba, se escucha, compara con el modelo y se pone una nota en esa lista. La app guarda esa valoración y le sugiere repetir si hace falta.

### Propuesta C - ASR con puntuación fonética

- **Qué cambia:** forced alignment, goodness-of-pronunciation, errores por fonema,
  prosodia y fluidez; feedback específico ("th", vocales, enlace).
- **Evidencia:** ASR para pronunciación y "automatic pronunciation assessment"
  (Farrús, 2023; Inceoglu, 2023; Cucchiarini, 2017). La evidencia es prometedora,
  pero el ASR no es un evaluador humano y puede tener sesgos por acento.
- **Coste:** H. Modelo y pipeline nuevos; probablemente fuera de una PWA ligera.
- **Riesgo:** falsos negativos, sesgo, latencia, tamaño; no recomendable como
  primer paso.
- **Encaje:** bajo/medio; candidato a fase posterior o servicio opcional.

#### Cómo se ve y qué hace el usuario

En pantalla aparecen palabras o frases con un sonido concreto para practicar. El usuario escucha, repite y ve qué sonido le costó; la app le propone repetir solo esa parte. Al final recibe una indicación sencilla de mejora, no una nota de acento.

---

## Hallazgo 2 - Vocabulary no comprueba recuperación

**Problema:** se puede girar la tarjeta y avanzar; el SRS puntúa siempre 3.

### Propuesta A - Recuperación L1 -> L2 con 4 grados

- **Qué cambia:** mostrar L1/definición; pedir la forma; revelar; botones
  Again / Hard / Good / Easy; audio y ejemplo después.
- **Evidencia:** testing effect y retrieval practice (Roediger & Karpicke, 2006;
  Dunlosky et al., 2013); auto-testing con flashcards supera a relectura.
- **Coste:** L/M. Datos ya existen; cambia la interacción y el quality del SRS.
- **Riesgo:** la auto-calificación puede ser imprecisa; usar anclas y calibrar.
- **Encaje:** muy alto.

#### Cómo se ve y qué hace el usuario

En pantalla aparece el significado en su idioma (o una definición) y la pregunta "¿Cómo se dice?". El usuario intenta recordar y escribe o dice la palabra; después ve la respuesta, escucha cómo suena y lee un ejemplo. Al final indica si le resultó fácil o difícil.

### Propuesta B - Dos etapas: reconocimiento y producción

- **Qué cambia:** primero significado (audio/definición -> elegir), después
  producción (L1 -> escribir/decir); el SRS distingue ambas.
- **Evidencia:** distinción vocabulario receptivo/productivo (Nation, 2013;
  Laufer & Hulstijn, 2001); CEFR distingue recepción y producción.
- **Coste:** M. Duplica tarjetas o etapas; buena para A2+.
- **Riesgo:** más carga; puede duplicar el tiempo de revisión.
- **Encaje:** alto, con reconocimiento en A1 y producción desde A2/B1.

#### Cómo se ve y qué hace el usuario

Primero aparece un audio o una definición con varias opciones para elegir el significado. Después de acertar, aparece el significado y el usuario tiene que escribir o decir la palabra. La app le muestra el resultado de las dos partes.

### Propuesta C - Uso en contexto

- **Qué cambia:** pedir una frase propia con la palabra; modelo y auto-check;
  variante de cloze/colocación.
- **Evidencia:** involvement load e output (Laufer & Hulstijn, 2001; Swain, 1985);
  vocabulario profundo (Nation, 2013).
- **Coste:** M/H; requiere rúbrica y contenido de colocaciones.
- **Riesgo:** corrección automática limitada; auto-evaluación.
- **Encaje:** medio; mejor como extensión, no como reemplazo del recall.

#### Cómo se ve y qué hace el usuario

En pantalla aparece una palabra y la petición de usarla en una frase propia. El usuario escribe o graba su frase, ve un ejemplo y compara. Al final marca si su frase es correcta y adecuada.

---

## Hallazgo 3 - La ruta excluye 21 temas vocab-only

**Problema:** `AppPath.TOPICS` solo incluye temas `phrase: true`; los decks
vocab-only no se programan.

### Propuesta A - Nodos de vocabulario de primera clase

- **Qué cambia:** dar nivel CEFR y prerequisitos a los 21 temas; incluirlos en
  `TOPICS` y en `PathSession`; programar Vocabulary/Quiz.
- **Evidencia:** currículo equilibrado y strand de vocabulario (Nation, 2007;
  Nation, 2013); coherencia curricular y CEFR.
- **Coste:** M. Requiere nivelar 21 temas y ajustar la ruta.
- **Riesgo:** temas sin nivel no se pueden ordenar; hay que decidir su nivel.
- **Encaje:** alto.

#### Cómo se ve y qué hace el usuario

En la ruta aparece una tarjeta de vocabulario con el nivel, cuántas palabras faltan y cuánto tarda. El usuario entra, practica esas palabras y vuelve a la ruta; la tarjeta muestra el avance.

### Propuesta B - Integrarlos en temas de frases

- **Qué cambia:** mapear cada deck a un tema temático (p. ej. `ropa` a
  `vestimenta`); el vocabulario se practica dentro del tema, no como nodo
  separado.
- **Evidencia:** enfoque léxico y agrupación temática; evitar sets semánticos de
  sinónimos que compiten (Tinkham, 1993; Nation, 2013).
- **Coste:** M/H. Requiere mapa de decks a temas y revisar contenido.
- **Riesgo:** puede perder decks sin tema claro (`software_apps`, `ciberseguridad`).
- **Encaje:** alto para los decks temáticos; A para los transversales.

#### Cómo se ve y qué hace el usuario

Al abrir un tema aparecen las palabras importantes de ese tema, antes o después de las frases. El usuario las practica con el significado delante y luego sigue con las frases.

### Propuesta C - Dejarlos como "extras" fuera de la ruta

- **Qué cambia:** mantenerlos accesibles, pero no en la sesión diaria; añadir un
  CTA "vocabulario extra".
- **Evidencia:** autonomía y elección (UDL 7.1; Deci & Ryan, 2000), pero no
  garantiza cobertura.
- **Coste:** L.
- **Riesgo:** el aprendiz puede no verlos nunca; el "curso" queda incompleto.
- **Encaje:** bajo como solución única.

#### Cómo se ve y qué hace el usuario

En una sección de extras aparecen los temas de vocabulario que no están en la ruta diaria. El usuario los abre cuando quiere; no le aparecen solos en la sesión.

---

## Hallazgo 4 - El mastery ignora 3 de 8 actividades

**Problema:** `getTopicMastery` solo promedia 5 actividades; Vocabulary, Quiz y
Grammar no cuentan para el 80%.

### Propuesta A - Mastery global ponderado

- **Qué cambia:** incluir las 8 actividades con pesos; declarar el peso de cada
  una.
- **Evidencia:** mastery learning (Bloom, 1968) y evaluación criterial; la
  ponderación debe ser transparente.
- **Coste:** L. Cambia una función y el copy.
- **Riesgo:** un peso arbitrario puede ocultar una destreza débil.
- **Encaje:** alto como corrección mínima.

#### Cómo se ve y qué hace el usuario

En la ficha del tema aparece un porcentaje general y una lista de las actividades que lo componen. El usuario ve qué parte tiene más floja y entra a practicarla desde ahí.

### Propuesta B - Perfil por destreza + mastery global

- **Qué cambia:** mostrar mastery separado de listening, speaking, reading,
  writing, vocabulary y grammar; el tema se completa solo si cada destreza
  alcanza su umbral.
- **Evidencia:** validez de constructo y evaluación multidimensional (Messick,
  1995; Kane, 2013); CEFR por destrezas.
- **Coste:** M. Requiere UI y criterios por destreza.
- **Riesgo:** más complejo de entender; necesita copy claro.
- **Encaje:** alto; es la solución conceptualmente correcta.

#### Cómo se ve y qué hace el usuario

En la ficha del tema aparecen seis apartados: escuchar, hablar, leer, escribir, vocabulario y gramática. Cada uno muestra cuánto lleva hecho. El usuario entra en el que le falta y el tema solo se completa cuando todos están suficientemente practicados.

### Propuesta C - Capstone de tema

- **Qué cambia:** el tema se completa con una tarea de actuación (role-play,
  mensaje, problema) evaluada con rúbrica; el SRS es práctica, no mastery.
- **Evidencia:** evaluación de desempeño y CEFR action-oriented; TBLT (Ellis,
  2003).
- **Coste:** H. Requiere tareas, rúbricas y contenido.
- **Riesgo:** sin evaluador, la rúbrica es auto-evaluada.
- **Encaje:** medio; combinar con B.

#### Cómo se ve y qué hace el usuario

Al final del tema aparece una tarea práctica: una conversación, un mensaje o un problema. El usuario la hace, la compara con un ejemplo y marca si cumplió los criterios. El tema se da por terminado con esa tarea.

---

## Hallazgo 5 - El orden de sesión y el orden visual no coinciden

**Problema:** `ACT_ORDER` y `getTopicStepStates` tienen secuencias distintas;
además, Speaking va primero aunque es lectura oral.

### Propuesta A - Una sola fuente de orden

- **Qué cambia:** definir una secuencia canónica (por ejemplo: input -> forma ->
  output -> fluidez) y derivar de ella tanto la sesión como la UI.
- **Evidencia:** Four Strands (Nation, 2007), skill acquisition (DeKeyser, 2007)
  e input processing (VanPatten, 2004).
- **Coste:** L/M. Cambia configuración y tests.
- **Riesgo:** una secuencia fija puede no adaptarse a todos.
- **Encaje:** muy alto.

#### Cómo se ve y qué hace el usuario

La sesión aparece dividida en cuatro partes: entender, practicar la forma, usar lo aprendido y ganar soltura. El usuario ve cuánto dura cada parte y las actividades que incluye, y las hace en ese orden.

### Propuesta B - Dos modos explícitos

- **Qué cambia:** "guiado" (input -> forma -> output) e "intercalado" (mezcla
  deliberada); el aprendiz elige; ambos documentados.
- **Evidencia:** autonomía y elección (UDL 7.1; Deci & Ryan, 2000); interleaving
  (Rohrer & Taylor, 2007).
- **Coste:** M.
- **Riesgo:** parálisis de elección; necesita explicación.
- **Encaje:** alto.

#### Cómo se ve y qué hace el usuario

En pantalla aparece la opción de seguir un orden guiado o uno mezclado. El usuario elige y la sesión se organiza de esa manera; puede cambiar cuando quiera.

### Propuesta C - Orden adaptativo

- **Qué cambia:** el siguiente ítem se elige por due, destreza débil, confianza y
  dificultad; no hay orden fijo.
- **Evidencia:** adaptive learning y desirable difficulties (Bjork & Bjork, 2011);
  CAT (Wainer, 2000).
- **Coste:** H.
- **Riesgo:** opacidad; requiere telemetría y reglas.
- **Encaje:** futuro.

#### Cómo se ve y qué hace el usuario

La app propone la siguiente actividad y explica por qué: porque toca repasar, porque una destreza está floja o porque toca algo nuevo. El usuario puede aceptar o pedir otra.

---

## Hallazgo 6 - El placement deja de proteger tras la primera práctica

**Problema:** el bootstrap solo aplica si no hay Speaking visto; después vuelve
el gate del 30% del tema anterior.

### Propuesta A - Placement como floor

- **Qué cambia:** los temas <= nivel de placement quedan siempre desbloqueados;
  el gate solo aplica por encima del nivel.
- **Evidencia:** zona de desarrollo próximo y autonomía; validez del placement
  como orientación (CEFR; Alderson, 2005).
- **Coste:** L. Cambia una condición.
- **Riesgo:** un placement sobreestimado deja temas demasiado altos; se mitiga
  con re-placement y auto-corrección.
- **Encaje:** muy alto.

#### Cómo se ve y qué hace el usuario

Al terminar el test aparece un nivel orientativo y se le dice que los temas de ese nivel y los anteriores quedan abiertos. El usuario puede empezar por ahí; los temas más altos se le recomiendan más adelante.

### Propuesta B - Placement adaptativo por destreza

- **Qué cambia:** ramificación por respuesta, ítems de listening/reading y un
  perfil por destreza; no un único score.
- **Evidencia:** computer-adaptive testing (Weiss & Kingsbury, 1984; Wainer,
  2000); CEFR.
- **Coste:** H. Requiere banco de ítems calibrado.
- **Riesgo:** sin calibración, la adaptación es cosmética.
- **Encaje:** medio/futuro.

#### Cómo se ve y qué hace el usuario

El test cambia de dificultad según las respuestas: si acierta, sube; si falla, baja. Al final muestra un nivel por destreza, no un único número.

### Propuesta C - Re-placement y auto-evaluación periódica

- **Qué cambia:** can-do checklist cada cierto tiempo; opción de re-test; el
  aprendiz puede corregir su nivel.
- **Evidencia:** auto-evaluación y evaluación formativa (Black & Wiliam, 1998;
  Oscarson).
- **Coste:** L/M.
- **Riesgo:** sobreconfianza; necesita anclas.
- **Encaje:** alto.

#### Cómo se ve y qué hace el usuario

En pantalla aparece una lista de cosas que el usuario debería poder hacer y un botón para ajustar su nivel. El usuario marca lo que ya sabe hacer y puede repetir el test si cree que su nivel cambió.

---

## Hallazgo 7 - El feedback correctivo solo aparece si acierta

**Problema:** el chip/regla se oculta en el error; solo hay diff.

### Propuesta A - Chip/regla también en el error

- **Qué cambia:** mostrar el chip y una explicación breve cuando falla, después
  del primer intento.
- **Evidencia:** focus on form y feedback correctivo (Long, 1991; Lyster & Ranta,
  1997; Schmidt, 1990).
- **Coste:** L. Cambia condicionales en 4 actividades.
- **Riesgo:** interrumpir la fluidez; usar solo en tareas de forma.
- **Encaje:** muy alto.

#### Cómo se ve y qué hace el usuario

Cuando falla, aparece un aviso con la regla que necesita repasar y un botón para intentarlo otra vez. El usuario lee la pista, corrige y vuelve a probar; si falla otra vez, ve la respuesta y un ejemplo.

### Propuesta B - Elicitación antes de la explicación

- **Qué cambia:** tras el error, pedir "intenta de nuevo / ¿qué falta?"; si falla
  otra vez, mostrar regla y contraste.
- **Evidencia:** los prompts y la elicitación favorecen la reparación (Lyster &
  Ranta, 1997); noticing (Schmidt, 1990).
- **Coste:** M.
- **Riesgo:** frustración si no hay pista suficiente; necesita escalado.
- **Encaje:** alto.

#### Cómo se ve y qué hace el usuario

Cuando falla, la app no le da la respuesta: le pregunta qué le falta y le pide que lo intente de nuevo. Si vuelve a fallar, entonces le muestra la explicación.

### Propuesta C - Micro-remediación adaptativa

- **Qué cambia:** según el error, enlazar a una regla concreta y a 2-3 ítems de
  práctica; luego volver.
- **Evidencia:** tutoring adaptativo y mastery learning (Bloom, 1968); feedback
  específico.
- **Coste:** H.
- **Riesgo:** complejidad de mapeo error -> regla.
- **Encaje:** medio/futuro.

#### Cómo se ve y qué hace el usuario

Cuando falla, aparecen dos o tres ejercicios cortos sobre esa regla. El usuario los hace y luego vuelve al ejercicio original para intentarlo otra vez.

---

## Hallazgo 8 - Reintentar no vuelve a puntuar

**Problema:** el SRS registra el primer intento; el éxito posterior no cambia la
programación.

### Propuesta A - Re-puntuar tras un reintento exitoso, sin borrar el fallo

- **Qué cambia:** guardar el primer intento y el resultado corregido; el segundo
  éxito programa con quality 2-3, no 5; el fallo queda en el historial.
- **Evidencia:** aprendizaje a partir de errores y corrección (Metcalfe, 2017;
  hypercorrection, Butterfield & Metcalfe, 2001); SRS.
- **Coste:** L/M. Requiere un pequeño event log.
- **Riesgo:** "answer fishing"; limitar intentos y no dar quality 5.
- **Encaje:** alto.

#### Cómo se ve y qué hace el usuario

Cuando falla, la app le dice que el primer intento ya está anotado y le pide corregir sin darle la respuesta. Si acierta al segundo intento, ve "corregido" y la app le programará un repaso pronto.

### Propuesta B - Dos tarjetas: intento y corrección

- **Qué cambia:** una tarjeta para el primer intento y otra para la forma
  corregida; la segunda vence antes.
- **Evidencia:** práctica de recuperación y corrección; separa precisión de
  consolidación.
- **Coste:** M. Duplica tarjetas y puede inflar la carga.
- **Riesgo:** más volumen; confusión.
- **Encaje:** medio.

#### Cómo se ve y qué hace el usuario

El mismo contenido aparece en dos tarjetas: una para el primer intento y otra para la corrección. El usuario practica las dos; la de corrección vuelve antes.

### Propuesta C - Mantener el primer intento, pero adelantar el repaso

- **Qué cambia:** no cambia el quality; si hubo corrección, la tarjeta vence al
  día siguiente.
- **Evidencia:** errorful learning con feedback; simplicidad.
- **Coste:** L.
- **Riesgo:** no distingue corrección de fallo persistente.
- **Encaje:** alto como mínimo.

#### Cómo se ve y qué hace el usuario

Cuando falla, la app le deja corregir, pero el resultado principal sigue siendo el fallo. Si acierta después, le programa un repaso para el día siguiente.

---

## Hallazgo 9 - No hay C1/C2 y la proficiency es una sola dimensión

### Propuesta A - Declarar el techo B2

- **Qué cambia:** el placement no devuelve C1/C2 si no hay contenido; el copy
  dice "curso A1-B2"; se evita prometer lo que no existe.
- **Evidencia:** transparencia y validez de la interpretación (Messick, 1995;
  CEFR).
- **Coste:** L.
- **Riesgo:** menos atractivo comercial; pero honesto.
- **Encaje:** muy alto.

#### Cómo se ve y qué hace el usuario

El resultado del test dice claramente hasta qué nivel hay contenido. Si el usuario habría dado C1 o C2, la app le muestra B2 y le explica que el curso llega hasta ahí.

### Propuesta B - Perfil por destreza

- **Qué cambia:** proficiency como vector (listening, speaking, reading, writing,
  vocabulary, grammar) con confianza; el nivel global es una síntesis, no un
  único Elo.
- **Evidencia:** evaluación multidimensional y CEFR por destrezas (CEFR
  Companion Volume; Kane, 2013).
- **Coste:** M.
- **Riesgo:** más complejo de mostrar y calibrar.
- **Encaje:** alto.

#### Cómo se ve y qué hace el usuario

En pantalla aparecen seis barras, una por destreza, con el nivel y la seguridad. El usuario puede abrir cada una para ver qué debería saber hacer.

### Propuesta C - Añadir contenido C1/C2

- **Qué cambia:** temas, textos, tareas, gramática y vocabulario C1/C2; el
  placement puede sostener esos niveles.
- **Evidencia:** CEFR y currículo por niveles; sin contenido, el nivel es una
  etiqueta vacía.
- **Coste:** H.
- **Riesgo:** mucho contenido y revisión; no es un cambio de código.
- **Encaje:** futuro.

#### Cómo se ve y qué hace el usuario

Aparecen temas y tareas de nivel C1 y C2 dentro de la ruta. El usuario puede avanzar a esos niveles y el test puede reconocerlos.

---

## Hallazgo 10 - Faltan tareas, discurso, interacción y fluidez

**Problema:** la unidad es ítem + actividad; no hay tarea, discurso ni
interacción.

### Propuesta A - Capstone task por tema

- **Qué cambia:** una tarea por tema (role-play, mensaje, problema) con ciclo
  pre-task/task/planning/report/focus-on-form; rúbrica y modelo.
- **Evidencia:** TBLT (Ellis, 2003), CEFR action-oriented, output hypothesis
  (Swain, 1985).
- **Coste:** M/H. Requiere contenido de tareas y rúbricas.
- **Riesgo:** auto-evaluación; sin interlocutor.
- **Encaje:** alto.

#### Cómo se ve y qué hace el usuario

Primero aparece una conversación corta con dos preguntas para entenderla. Después, una situación para resolver (por ejemplo, pedir un cambio de habitación); el usuario escribe o graba su respuesta. Luego compara con un ejemplo, repasa dos o tres formas y repite la tarea.

### Propuesta B - Diálogos ramificados

- **Qué cambia:** diálogo con 2-3 opciones por turno, audio y consecuencias;
  modelo de respuesta; auto-evaluación.
- **Evidencia:** interaction hypothesis (Long, 1996) y práctica de interacción;
  ramificación no es interacción abierta, pero entrena turnos y adecuación.
- **Coste:** M/H.
- **Riesgo:** linealidad; no sustituye a un interlocutor.
- **Encaje:** alto como paso intermedio.

#### Cómo se ve y qué hace el usuario

Aparece una conversación con varias respuestas posibles en cada turno. El usuario elige una, ve qué pasa y al final compara con un modelo.

### Propuesta C - Agente conversacional

- **Qué cambia:** interacción abierta con un agente; feedback en tiempo real.
- **Evidencia:** interacción y output; evidencia emergente en apps.
- **Coste:** H; backend/modelo.
- **Riesgo:** coste, latencia, privacidad, dependencia de API.
- **Encaje:** bajo para la arquitectura actual.

#### Cómo se ve y qué hace el usuario

El usuario mantiene una conversación abierta por voz o texto con un asistente. El asistente responde, pide aclaraciones y al final le da una indicación.

### Propuesta D - Fluidez con material familiar

- **Qué cambia:** 4/3/2 (hablar del mismo tema 4, 3 y 2 minutos), lectura
  cronometrada, repetición de un diálogo conocido.
- **Evidencia:** fluency development (Nation, 2007; Arevart & Nation, 1991).
- **Coste:** L/M. No necesita backend.
- **Riesgo:** ansiedad por tiempo; hacerlo opcional.
- **Encaje:** muy alto.

#### Cómo se ve y qué hace el usuario

Aparece un tema conocido y un tiempo: primero 4 minutos, luego 3 y luego 2. El usuario habla del mismo tema cada vez con menos tiempo y compara cómo le sale.

---

## Hallazgo 11 - Accesibilidad/UDL parcial

**Problema:** dictation es audio-only; no hay velocidad, captions/transcripción ni
playback de la propia voz.

### Propuesta A - Alternativas para dictation

- **Qué cambia:** velocidad 0.75/1.0/1.25, repetición por fragmentos, transcripción
  opcional después del intento, y una variante de lectura/transcripción.
- **Evidencia:** UDL (CAST, 2024) y WCAG; múltiples medios de representación.
- **Coste:** L/M.
- **Riesgo:** si la transcripción está siempre visible, se pierde el listening;
  mostrarla después o marcar la actividad como "con apoyo".
- **Encaje:** muy alto.

#### Cómo se ve y qué hace el usuario

En el dictado aparece la opción de escuchar más despacio, repetir un trozo y ver el texto después de intentarlo. También hay un modo para leer y copiar el texto si no puede usar el audio.

### Propuesta B - Múltiples medios de expresión

- **Qué cambia:** en Speaking, mantener texto alternativo; añadir playback de la
  grabación, subtítulos y una opción de respuesta escrita; en tareas, permitir
  texto/audio.
- **Evidencia:** UDL acción y expresión; accesibilidad.
- **Coste:** M.
- **Riesgo:** la alternativa escrita no entrena speaking; etiquetarla como
  equivalente parcial.
- **Encaje:** alto.

#### Cómo se ve y qué hace el usuario

Al hablar, el usuario puede escuchar su grabación, ver subtítulos o escribir la respuesta en lugar de decirla. En las tareas también puede elegir texto o audio.

### Propuesta C - Personalización de la representación

- **Qué cambia:** tamaño de fuente, interlineado, modo dyslexia-friendly, alto
  contraste, movimiento reducido, elección de voz/acento.
- **Evidencia:** UDL percepción/customización; WCAG.
- **Coste:** M.
- **Riesgo:** más CSS/tokens y pruebas.
- **Encaje:** alto.

#### Cómo se ve y qué hace el usuario

En ajustes puede cambiar el tamaño de letra, el espacio entre líneas, el contraste, el movimiento y la voz. La app recuerda esas preferencias.

---

## Hallazgo 12 - La evaluación no es can-do ni por destreza

**Problema:** hay SRS, placement y mastery, pero no descriptores "puedo hacer X",
rúbricas ni perfil por destreza.

### Propuesta A - Can-do checklist por tema

- **Qué cambia:** cada tema declara 2-4 descriptores CEFR ("puedo presentarme",
  "puedo pedir comida"); el aprendiz los auto-evalúa; la ruta los muestra.
- **Evidencia:** CEFR Companion Volume; auto-evaluación (Oscarson); evaluación
  formativa (Black & Wiliam, 1998).
- **Coste:** L/M. Requiere contenido de descriptores.
- **Riesgo:** auto-evaluación inflada; usar anclas.
- **Encaje:** muy alto.

#### Cómo se ve y qué hace el usuario

En cada tema aparece una lista de cosas que el usuario debería poder hacer, con "lo puedo hacer" o "todavía no". Al lado hay un botón para practicar lo que le falta.

### Propuesta B - Perfil por destreza

- **Qué cambia:** progreso separado de listening, speaking, reading, writing,
  vocabulary y grammar; el global es una síntesis.
- **Evidencia:** evaluación multidimensional (Messick, 1995; Kane, 2013); CEFR.
- **Coste:** M.
- **Riesgo:** complejidad de UI.
- **Encaje:** alto.

#### Cómo se ve y qué hace el usuario

En el perfil aparecen seis barras de destreza con lo que el usuario ha practicado y la evidencia. Puede abrir una y ver qué le falta.

### Propuesta C - Tareas de actuación con rúbrica

- **Qué cambia:** una tarea por tema con rúbrica de 3-4 criterios; portfolio de
  grabaciones/escritos; el tema se completa con evidencia de desempeño.
- **Evidencia:** performance assessment y evaluación para el aprendizaje (Black &
  Wiliam, 1998; Carless, 2007).
- **Coste:** H.
- **Riesgo:** corrección manual o auto-evaluación.
- **Encaje:** medio; combinar con A/B.

#### Cómo se ve y qué hace el usuario

Al final de un tema aparece una tarea con una lista de criterios y un espacio para guardar la respuesta. El usuario la hace, la valora con los criterios y guarda la evidencia.

---

## Cobertura pedagógica de abiertos vs reemplazos

Ver [PEDAGOGY-COVERAGE.md](PEDAGOGY-COVERAGE.md). En resumen:

- **Con abiertos evaluables:** cobertura integral alta, pero exige un evaluador
  fiable.
- **Con abiertos como práctica:** mucha práctica de interacción y fluidez, poca
  evidencia; no cuenta para mastery.
- **Sin abiertos, con reemplazos:** buena base lingüística y producción
  controlada; quedan fuera la conversación espontánea, la fluidez, la reparación
  y la pragmática fina.
- **La pérdida principal es la competencia interactiva**, pequeña en A1-A2,
  grande en B1-B2 y muy grande en C1-C2.
- **Recomendación:** híbrido con separación explícita entre práctica y
  evidencia; no llamar "conversación" a una tarea cerrada.
- **Implementación:** dos familias, `closed` y `open_practice`, con
  `evidenceLevel` (`none`, `practice`, `validated`). El mastery solo se calcula
  desde `validated`. La práctica abierta guarda intentos, audio y
  auto-valoración; se puede promover a evidencia por tarea e idioma cuando haya
  un evaluador calibrado. El esquema está en
  [PEDAGOGY-COVERAGE.md](PEDAGOGY-COVERAGE.md#12-implementación-en-dos-familias).
- **Re-auditoría:** aprobado con condiciones. La propuesta cubre las cuatro
  hebras en práctica y separa evaluación de práctica, pero no cubre interacción
  espontánea real ni "pedagogía para todos". Ver
  [PEDAGOGY-AUDIT.md](PEDAGOGY-AUDIT.md#12-re-auditoría-con-la-propuesta-de-dos-familias).
- **Con evaluador validado:** si solo evalúa producción, cierra producción,
  tarea y fluidez; la conversación sigue condicional. Con interlocutor AI, la
  práctica de conversación simulada sube a evidencia parcial. Con revisión
  humana, la conversación puede aprobarse; UDL, escritura y mediación siguen
  pendientes si no se añaden.
- **Dominio por cobertura:** no es "pasó por todos los tipos", sino "evidenció
  las dimensiones requeridas sin apoyo y las retiene". Ver
  [PEDAGOGY-MASTERY.md](PEDAGOGY-MASTERY.md).
- **Compositor de sesión:** necesario para que el catálogo nuevo no sature la
  ruta; empieza con reglas deterministas y metadatos de actividad.
- **Gobernanza del evaluador:** se difiere hasta que exista una forma de
  evaluar; antes solo hay práctica, privacidad y borrado de audio.

## Secuencia recomendada

1. **Quick wins (1-2 semanas):**
   - Feedback en error (Hallazgo 7).
   - Placement como floor (6).
   - Unificar orden (5).
   - Vocabulary retrieval + 4 grados (2).
   - Mastery por destreza, al menos incluir las 8 actividades (4).
   - Nivelar los 21 temas vocab-only y meterlos en la ruta (3).

2. **Rediseño de actividades (2-4 semanas):**
   - Speaking desde el significado + playback + rúbrica (1A/1B).
   - Dictation con velocidad, gist/detalle y transcripción (11A).
   - Quiz/Scramble con audio y contexto.
   - Re-puntuación de reintentos (8A).

3. **Tareas y evaluación (4-8 semanas):**
   - Capstone task por tema + fluidez 4/3/2 (10A/10D).
   - Can-do checklist + perfil por destreza (12A/12B).
   - Diálogos ramificados (10B).

4. **Futuro:**
   - C1/C2 (9C).
   - ASR fonético (1C).
   - Agente conversacional (10C).
   - FSRS y analítica de retención.

## Fuentes adicionales

- Dunlosky, J., et al. (2013). Improving students' learning with effective
  learning techniques. *Psychological Science in the Public Interest*, 14(1),
  4-58.
- Karpicke, J. D., & Roediger, H. L. (2008). The critical importance of retrieval
  for learning. *Science*, 319(5865), 966-968.
- Metcalfe, J. (2017). Learning from errors. *Annual Review of Psychology*, 68,
  465-489.
- Butterfield, B., & Metcalfe, J. (2001). Errors committed with high confidence
  are hypercorrected. *Journal of Experimental Psychology: Learning, Memory, and
  Cognition*, 27(6), 1491-1494.
- Tinkham, T. (1993). The effect of semantic clustering on the learning of second
  language vocabulary. *System*, 21(3), 371-380.
- Laufer, B., & Hulstijn, J. (2001). Incidental vocabulary acquisition in a second
  language: The construct of task-induced involvement. *Applied Linguistics*,
  22(1), 1-26.
- Farrús, M. (2023). Automatic speech recognition in L2 learning: A review.
  *Languages*, 8(4), 242.
- Inceoglu, S. (2023). Assessment of L2 intelligibility: Comparing L1 listeners
  and automatic speech recognition. *ReCALL*.
- Cucchiarini, C. (2017). Automatic speech recognition for second language
  pronunciation training.
- Weiss, D. J., & Kingsbury, G. G. (1984). Application of computerized adaptive
  testing to educational problems. *Journal of Educational Measurement*.
- Wainer, H. (2000). *Computerized Adaptive Testing: A Primer*.
- Messick, S. (1995). Validity of psychological assessment. *American
  Psychologist*, 50(9), 741-749.
- Kane, M. T. (2013). Validating the interpretations and uses of test scores.
  *Journal of Educational Measurement*, 50(1), 1-73.
- Bloom, B. S. (1968). Learning for mastery. *Evaluation Comment*, 1(2).
- Carless, D. (2007). Learning-oriented assessment: Conceptual bases and
  practical implications. *Innovations in Education and Teaching International*,
  44(1), 57-66.
- Oscarson, M. (2013). Self-assessment in the classroom. In *The Companion to
  Language Assessment*.
- Arevart, S., & Nation, P. (1991). Fluency improvement in a second language.
  *RELC Journal*, 22(1), 84-94.
- CAST (2024). *UDL Guidelines 3.0*. https://udlguidelines.cast.org/
- Council of Europe (2020). *CEFR Companion Volume*.
  https://www.coe.int/en/web/common-european-framework-reference-languages

---

## Investigación de micro-modelos (2026-11-11)

La investigación completa está en [PEDAGOGY-MODELS.md](PEDAGOGY-MODELS.md).
Se amplió con `Horizon-Labs/multilingual-embedding-small` y
`Qwen2.5-0.5B-Instruct`. La conclusión se refuerza: **separar gramática y
adecuación** en dos etapas, no pedir a un solo modelo que haga las dos.

Prueba del pipeline separado, 36 respuestas (12 por idioma):

| Pipeline | Exactos | Falsos "correcto" | Falsos "no" |
|---|---:|---:|---:|
| Solo gramática | 14/36 | 18 | 0 |
| Solo checklist | 35/36 | 1 | 0 |
| Solo Horizon | 29/36 | 6 | 0 |
| Gramática + checklist (estricto) | **36/36** | 0 | 0 |
| Gramática + Horizon + checklist (seguro) | 31/36 exactos; 34/36 aceptando "no comprobado" en parciales | 0 | 0 |
| Gramática + NLI + checklist | 28/36 | 0 | 6 |

En 9 paráfrasis no usadas para escribir el checklist, el checklist solo acertó
1/9: marcó como parcial o negativo lo que era adecuado. Horizon separó bien el
marco (6/6 adecuadas por encima de 0.75; 3/3 fuera de tema por debajo), pero no
distingue parcial de adecuada. La política segura es: marco correcto + checklist
incompleto = **"no comprobado"**, no "incorrecto". El checklist da pistas, no
convierte una paráfrasis válida en un fallo.

Con Proofbird + un encoder de 118 MB, `paraphrase-multilingual-MiniLM-L12-v2`
fue mejor que `multilingual-e5-small` para el marco: 7/9 seguro frente a 5/9.
MiniLM no dio falsos "correcto"; e5 marcó como correctas dos frases de desayuno
fuera de tema. La cabeza de conceptos sigue siendo una prueba de concepto con 36
ejemplos; el marco de MiniLM es lo que separa.

Con 279 MB, `paraphrase-multilingual-mpnet-base-v2` mejora a MiniLM: 8/9
seguro, 1 falso "no" y 0 falsos "correcto". Es 2,4 veces más grande. Horizon
(269 MB) consigue 9/9 binario con un umbral provisional. Si el límite es 120 MB,
MiniLM sigue siendo la mejor opción; si se aceptan ~280 MB, MPNet es la mejor
probada.

Evaluación de las seis opciones:

- **LLM juez:** Qwen3.5-0.8B da 25/45 final con 19 falsos "correcto"; Qwen2.5-1.5B
  da 1/18 y consume 3,5 GB. No es fiable ni cabe en móvil.
- **Rúbrica automática:** Qwen3.5-0.8B genera criterios genéricos y acepta las
  tres respuestas, incluida "dos hamburguesas". 8 s por respuesta.
- **NLI:** Horizon zeroshot 141M da 31/36 en train y 6/9 en paráfrasis; rápido
  (8,3 ms/par) pero no es un gate. mDeBERTa es peor y más pesado.
- **Embeddings:** MiniLM 118 MB 7/9, MPNet 279 MB 8/9, Horizon 269 MB 9/9
  binario provisional. Necesitan cabeza o marco.
- **Clasificador entrenado:** e5 + cabeza da 6/9 exact; es la vía más prometedora,
  pero requiere datos y negativos difíciles.
- **Híbridos:** el mejor es Proofbird + MiniLM/MPNet + cabeza; los híbridos con
  Qwen añaden latencia y errores, no precisión.

Resumen de lo que cambia en estas propuestas:

- **Speaking (Hallazgo 1):** la producción oral guiada puede comprobarse con una
  lista de conceptos obligatorios y formas aceptadas, más un corrector de
  gramática opcional. No hace falta NLI. La producción abierta sigue sin
  evaluador fiable; si se ofrece, es práctica con apoyo, no mastery.
- **Vocabulary (Hallazgo 2C):** los embeddings no sirven como juez de una frase
  abierta. El constrained cloze con banco de palabras sigue siendo la opción
  determinista.
- **Tareas (Hallazgo 10A):** la tarea cerrada cubre adecuación funcional. La
  tarea abierta puede usar la lista de conceptos para dar pistas, pero si no
  detecta un elemento no puede declarar la respuesta incorrecta: la marca "no
  comprobada". No sirve para poner una nota.
- **Fluidez (Hallazgo 10D):** no hay evaluación fiable de fluidez con el stack
  actual. Se queda como práctica (participación, tiempo), no como mastery.
- **Can-do (Hallazgo 12):** sin tareas abiertas evaluables ni pronunciación
  evaluable, no entra la auto-evaluación. El can-do se calcula con evidencia
  determinista.
- **Feedback (Hallazgo 7):** el corrector puede mostrar sugerencias, pero no
  convierte la respuesta en "correcta". Si hay sugerencias o pista, la tarjeta
  queda en ámbar y quality 2-3.

### Qué se puede prometer

| Capa | Qué evalúa | Dispositivos | ¿Mastery? |
|---|---|---|---|
| Determinista | Elementos de la tarea, respuestas cerradas | Todos | Sí, si la tarea es cerrada |
| Corrector opcional | Errores locales de gramática | Desktop y móvil compatible | No; ámbar, quality 2-3 |
| Marco de tarea (MiniLM) | "Habla del tema" o "no habla del tema" | Desktop y móvil compatible, 118 MB | No; solo aviso |
| Marco de tarea (MPNet) | "Habla del tema" o "no habla del tema" | Desktop y móvil de gama alta, 279 MB | No; solo aviso |
| Marco de tarea (Horizon) | "Habla del tema" o "no habla del tema" | Desktop, 269 MB | No; solo aviso |
| Checklist + marco | Correcto / no comprobado / no responde | Todos sin modelo; desktop con encoder | Solo "correcto" en tarea cerrada |
| NLI | Nada fiable hoy | Desktop, 338 MB | No |
| LLM 270M-0.6B | Nada fiable sin benchmark propio | Desktop/WebGPU | No |

### Qué no se adopta

- NLI MiniLM como juez: sesgo a `neutral`, falla paráfrasis y tareas compuestas.
- NLI mDeBERTa como juez: 338 MB, falsos positivos por solapamiento léxico y
  ciego a la gramática.
- Embeddings e5 como juez: respuestas negadas y equivocadas quedan a menos de
  0.05 de las correctas; como marco de tarea, solapa fuera de tema con
  correctas. MiniLM es mejor para ese papel.
- MiniLM-L12-v2 como juez único: 7/9 seguro en paráfrasis, pero necesita una
  cabeza de conceptos entrenada y calibración; no es un modelo listo.
- Horizon como juez: 269 MB, separa el tema pero no los elementos; la negación y
  la respuesta parcial se solapan con las correctas.
- Qwen2.5-0.5B como juez: 1/18 en la prueba binaria; no sigue el formato y
  responde mal en español y alemán.
- Dos Qwen2.5-0.5B, una por tarea: 10/45 combinado y 3.2 GB de memoria; dos
  copias del mismo modelo no añaden conocimiento, solo duplican el coste.
- Clef / Clef-flash como juez: 27B/9B, H200 o Workers AI; no cabe en la PWA. Su
  patrón de preguntas tipadas sí se adopta en el checklist.
- LLM juez (Qwen2.5-0.5B, Qwen3.5-0.8B, Qwen2.5-1.5B): 1/18, 25/45 y 1/18;
  sobreaceptan respuestas parciales y fuera de tema. 3B no se probó; 1.5B ya
  consume 3,5 GB.
- Rúbrica automática: criterios genéricos y repetidos; 8 s por respuesta y
  acepta las tres respuestas de prueba. No sustituye al checklist.
- NLI como gate: Horizon 6/9 y mDeBERTa 28/36; útiles como pista, no como nota.
- LLM de 270M-0.6B como juez: pesado, generativo y sin calibración.
- Checklist como gate ciego: en paráfrasis no vistas acertó 1/9; si no detecta
  un elemento, la respuesta es "no comprobada", no "incorrecta".
- Cualquier modelo como nota automática de producción abierta.

### Qué queda pendiente

1. Benchmark propio de gramática y adecuación con respuestas de aprendices.
2. Medir paráfrasis no vistas y decidir cuánto authoring de formas se mantiene.
3. Calibrar el umbral de MiniLM (0.55-0.63), MPNet (0.65-0.72) y Horizon (0.75)
   con más respuestas.
4. Prueba en dispositivos reales de la capa de 112 MB.
5. Decidir si la capa de corrector se ofrece, se oculta o se elimina.
6. Authoring de las listas de conceptos por tarea.
7. Revisión de licencias (BETO/CC BY 4.0) y atribuciones.
8. Si se quiere un juez de 0.5 B, fine-tunear un clasificador; no usar prompt.
9. Si se quiere un “Clef pequeño”, entrenar una cabeza multi-label sobre un
   encoder pequeño; no usar embeddings zero-shot.
10. Entrenar la cabeza de conceptos con más datos y negativos difíciles; medir
    si supera al checklist en paráfrasis reales.
11. Probar `EmbeddingGemma-300m`, `gte-multilingual-base` y `bge-m3` si se
    acepta un encoder de 300-568 MB.
12. Si se insiste en un LLM juez, probar 3B en desktop y medir falsos
    "correcto"; 1.5B ya consume 3,5 GB y no es fiable.
