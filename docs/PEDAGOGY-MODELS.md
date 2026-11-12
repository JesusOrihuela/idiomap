# Modelos locales para evaluar escritura y adecuación

> Investigación para la PWA estática de IdiomaP. Fecha: 2026-11-11. No implementa
> nada; decide qué se puede prometer y qué no. Documento complementario de
> [PEDAGOGY-AUDIT.md](PEDAGOGY-AUDIT.md) y
> [PEDAGOGY-PROPOSALS.md](PEDAGOGY-PROPOSALS.md).

## 1. Pregunta

¿Puede un micro-modelo ejecutarse en el navegador, sin backend, en cualquier
ordenador o móvil, y decidir dos cosas a la vez?

1. Si una frase está bien escrita (gramática, ortografía, puntuación).
2. Si la frase corresponde al contexto o a la tarea (adecuación).

Debe cubrir al menos inglés, español y alemán, y ser viable en una PWA con
GitHub Pages, `localStorage`, audio pre-generado, STT en el dispositivo y
funcionamiento offline.

## 2. Criterios

| Criterio | Qué se exige |
|---|---|
| Tamaño | Descarga y almacenamiento asumibles en móvil; idealmente menos de 150 MB por idioma. |
| Memoria | No provocar cierres del navegador en equipos de 4 GB o menos. |
| Latencia | Feedback en menos de 1-2 s por respuesta en un móvil de gama media. |
| Cobertura | EN, ES y DE como mínimo; FR/IT deseables; 18 idiomas a futuro. |
| Licencia | Compatible con una PWA pública y gratuita; atribución posible. |
| Runtime | WASM en cualquier navegador; WebGPU solo como mejora opcional. |
| Determinismo | Mismo texto, mismo resultado; sin generación libre. |
| Validación | Métricas propias en respuestas de aprendices, no solo en un benchmark académico. |
| Mantenimiento | Versión fijada, tamaño controlado, sin backend y sin dependencias invisibles. |

## 3. Resumen ejecutivo

**No hay un micro-modelo único que evalúe gramática y adecuación de forma fiable
en cualquier dispositivo.** Son dos tareas distintas y ninguna de las opciones
pequeñas resuelve ambas.

- **Gramática:** el mejor candidato es **Proofbird GECToR** para EN, ES, DE, FR
  e IT. Cuantizado a int8 ocupa **112-114 MB por idioma**, tiene licencia
  Apache-2.0 (ES: CC BY 4.0) y **funciona en el navegador con WASM**. Corrige
  errores locales con alta precisión, pero no es un oráculo: deja pasar errores
  de aprendices y en una prueba produjo una corrección incorrecta.
- **Adecuación:** los modelos NLI multilingües no sirven como jueces. El MiniLM
  de 107 MB está sesgado hacia `neutral`; el mDeBERTa de 338 MB mejora con
  hipótesis atómicas, pero sigue aceptando respuestas incorrectas por solapamiento
  léxico y no evalúa gramática. Los embeddings de e5-small (118 MB) dan
  similitudes altas a respuestas negadas o equivocadas; no hay umbral que separe
  bien de mal. El embedding de Horizon-Labs (269 MB int8) separa mejor el tema
  (correctas 0.86-0.93, fuera de tema 0.36-0.60), pero la negación y la respuesta
  parcial se solapan con las correctas; sirve para un marco de tarea, no para
  decidir si están todos los elementos.
- **Modelos generales:** Qwen3-0.6B y Gemma 3 270M son multilingües, pero pesan
  273-589 MB, son generativos y están por debajo de la fiabilidad necesaria para
  una nota. Qwen2.5-0.5B-Instruct se probó con preguntas binarias y acertó 1 de
  18 casos combinados de gramática y tarea; no es un juez utilizable sin
  fine-tuning. No se descartan para siempre; no son la base de la v1.
- **Diseño recomendado:** separar **gramática** y **adecuación** en dos etapas.
  La gramática la comprueba un corrector opcional (Proofbird int8). La adecuación
  la comprueba una **lista de conceptos** determinista; si se quiere un marco de
  tarea, un embedding opcional (Horizon) puede decir "habla del tema" o "no
  habla del tema", pero no sustituye a la lista. En una prueba de 36 respuestas,
  gramática + checklist acertó 36/36; en 9 paráfrasis no vistas, el checklist
  solo acertó 1/9. Por eso, si el marco es correcto y el checklist no detecta un
  elemento, el estado es **"no comprobado"**, no "incorrecto". Si no hay modelo o
  la respuesta no se puede comprobar, estado **"no evaluable"**. La capa
  determinista funciona en cualquier dispositivo; la capa de modelo es un extra
  por niveles.
- **Mastery:** solo la evidencia determinista puede contar como dominio. La
  práctica con modelo se marca en ámbar ("practicado con apoyo"), con quality
  2-3, nunca 5. No cuenta para retención ni para completar una destreza.

## 4. Matriz de candidatos

Tamaños medidos en los archivos publicados (MB decimales). "Browser" indica si
se ejecutó en un navegador real durante esta investigación.

| Candidato | Tarea | Idiomas | Tamaño | Licencia | Runtime | Estado |
|---|---|---|---|---|---|---|
| Proofbird GECToR EN | Corrección gramatical | EN | 446.5 MB fp32; 112.4 MB int8 | Apache-2.0 | ONNX Runtime Web (WASM) | **Probado en browser** |
| Proofbird GECToR ES | Corrección gramatical | ES | 452.7 MB fp32; 113.9 MB int8 | CC BY 4.0 | ONNX Runtime Web (WASM) | Validado en Python |
| Proofbird GECToR DE | Corrección gramatical | DE | 453.0 MB fp32; 114.0 MB int8 | Apache-2.0 | ONNX Runtime Web (WASM) | Validado en Python |
| Proofbird GECToR FR/IT | Corrección gramatical | FR, IT | 412.6 / 434.9 MB fp32 | Apache-2.0 | ONNX Runtime Web (WASM) | No probado; mismo diseño |
| nlprule | Reglas gramaticales | EN, DE; ES experimental | Binarios por idioma, no medidos | MIT/Apache-2.0; binarios LGPL-2.1 | Rust/WASM posible | Alternativa ligera, no probada |
| LanguageTool | Reglas gramaticales | 25+ | Servidor Java, no cabe en la PWA | LGPL-2.1 | Java | Descartado sin backend |
| Harper | Corrección en inglés | EN | ~95 MB (npm) | Apache-2.0 | Rust/WASM | Solo inglés; no cubre el requisito |
| Grammalecte | Corrección en francés | FR | No medido | MPL/GPL (verificar) | JS | Solo francés |
| mT5-small GEC | Corrección generativa | Multilingüe | ~300 M parámetros; sin ONNX listo | Apache-2.0 (base); fine-tune sin licencia clara | PyTorch/ONNX a convertir | No determinista; no recomendado |
| multilingual-MiniLMv2-L6 NLI | Adecuación (NLI) | 100+ | 107.4 MB int8 | MIT | Transformers.js / ORT Web | **Probado; sesgo a neutral** |
| mDeBERTa-v3-base XNLI | Adecuación (NLI) | 100+ | 338.3 MB int8 | MIT | Transformers.js / ORT Web | **Probado; mejor con hipótesis atómicas** |
| multilingual-nli-bert | Adecuación (NLI) | Multilingüe | 179.0 MB int8 | No declarada | ORT Web | **Probado; salida rota (una sola clase)** |
| multilingual-e5-small | Similitud semántica | 100+ | 118.3 MB int8 | MIT | Transformers.js / ORT Web | **Probado; no separa el marco de tarea** |
| paraphrase-multilingual-MiniLM-L12-v2 | Similitud semántica | 50+ | 118.4 MB int8 | Apache-2.0 | Transformers.js / ORT Web | **Probado; mejor marco que e5** |
| paraphrase-multilingual-mpnet-base-v2 | Similitud semántica | 50+ | 278.7 MB int8 | Apache-2.0 | Transformers.js / ORT Web | **Probado; mejor que MiniLM en 279 MB** |
| Horizon-Labs multilingual-embedding-small | Similitud semántica | 92 | 269.3 MB int8 | Apache-2.0 | Transformers.js / ORT Web | **Probado; mejor marco de tarea, no juez** |
| Qwen3-0.6B | Juicio generativo | 119 | 543 MB int4 WebGPU; 589 MB int8 | Apache-2.0 | WebLLM / Transformers.js | No probado; pesado y no calibrado |
| Qwen2.5-0.5B-Instruct | Juicio generativo | 29 | 483 MB q4f16; 512 MB int8 | Apache-2.0 | Transformers.js | **Probado; 1/18, no fiable** |
| Gemma 3 270M IT | Juicio generativo | 140+ | 273 MB q4f16; 323 MB q4 | Gemma (no OSI) | MediaPipe / Transformers.js | No probado; benchmarks bajos |
| mmBERT-small | Encoder base | 300+ | 136.1 MB int8 | MIT | Transformers.js | Sin cabezal de gramática/NLI; futuro |

## 5. Qué se midió

### 5.1 Entorno

- PC de escritorio con Windows, Edge headless, ONNX Runtime Web 1.22, WASM,
  **un solo hilo** para acercarse a un móvil de gama media.
- Modelos descargados de Hugging Face, convertidos de fp32 a int8 dinámico con
  `onnxruntime.quantization.quantize_dynamic` (QInt8).
- Frases de prueba escritas para esta investigación: 20 en inglés, 10 en español
  y 10 en alemán para gramática; 30 pares en inglés, español y alemán para NLI;
  27 pares para embeddings.
- Prueba de pipeline: 36 respuestas etiquetadas (12 por idioma) y 9 paráfrasis
  que no se usaron para escribir las formas del checklist.
- No es un benchmark de aprendices ni de dispositivos reales. Es una prueba de
  viabilidad y de límites.

### 5.2 Navegador

| Medida | Resultado |
|---|---|
| Modelo | Proofbird EN int8, 112.4 MB |
| Descarga local | 243 ms (localhost; no incluye red real) |
| Creación de sesión | 569 ms |
| 16 frases, 1 hilo | 833 ms en total; 52 ms de media; rango 26-106 ms |
| CPU limitada 4x | 3842 ms; 240 ms de media; rango 132-488 ms |
| CPU limitada 6x | 6250 ms; 391 ms de media; rango 209-849 ms |
| Heap JS | 157-183 MB (no incluye toda la memoria WASM) |

La latencia es aceptable para un botón "comprobar mi respuesta", no para
feedback en tiempo real. En un móvil real de gama baja puede ser varias veces
peor. La prueba con limitación de CPU es un proxy, no una medición de teléfono.

### 5.3 Cuantización

| Idioma | fp32 | int8 | Tiempo de cuantización | ¿Mismos resultados? |
|---|---|---|---|---|
| EN | 446.5 MB | 112.4 MB | 4.4 s | Sí en 20 frases |
| ES | 452.7 MB | 113.9 MB | 4.4 s | Sí en 10 frases |
| DE | 453.0 MB | 114.0 MB | 4.1 s | Sí en 10 frases |

"Mismos resultados" significa mismas sugerencias (posición, original y
reemplazo) en esa muestra pequeña. No garantiza que int8 sea idéntico en todos
los casos; hay que repetir la comparación con un conjunto más amplio antes de
adoptarlo.

## 6. Gramática: Proofbird GECToR

### 6.1 Qué es

Un etiquetador GECToR sobre BERT base. Para cada palabra predice una edición
(`$KEEP`, `$DELETE`, `$REPLACE_...`, `$TRANSFORM_...`) y aplica las ediciones
hasta cinco pasadas. No reescribe la frase; propone cambios locales. La página
de demostración de Proofbird incluye un port en JavaScript (`gector.js`) que
funciona con ONNX Runtime Web y devuelve las mismas sugerencias que el runner de
Python.

### 6.2 Calidad observada

Aciertos claros:

| Entrada | Salida |
|---|---|
| `My brother have two cat.` | `My brother has two cats.` |
| `The results was very good.` | `The results were very good.` |
| `There is many people here.` | `There are many people here.` |
| `He go to school every day.` | `He goes to school every day.` |
| `I have went to Berlin last year.` | `I have gone to Berlin last year.` |
| `The people is very nice.` | `The people are very nice.` |
| `La casa son muy bonito.` | `La casa es muy bonita.` |
| `Mis hermanos tiene dos gato.` | `Mis hermanos tienen dos gatos.` |
| `Los niños juega en el parque.` | `Los niños juegan en el parque.` |
| `¿Donde está la estación?` | `¿Dónde está la estación?` |
| `Meine Schwester sind sehr mude.` | `Meine Schwester ist sehr müde.` |
| `Die Kinder spielt im Garten.` | `Die Kinder spielen im Garten.` |
| `Du hat heute keine zeit.` | `Du hast heute keine Zeit.` |
| `Ich hoffe, das du kommst.` | `Ich hoffe, dass du kommst.` |

Fallos observados:

| Entrada | Resultado | Problema |
|---|---|---|
| `She don't like coffee.` | Sin cambios | No detecta el error de concordancia. |
| `We discussed about the plan.` | Sin cambios | No detecta la preposición sobrante. |
| `He suggested me to go.` | Sin cambios | No detecta el patrón verbal. |
| `She is more taller than her sister.` | Sin cambios | No detecta el doble comparativo. |
| `Can you to help me?` | Sin cambios | No detecta el infinitivo. |
| `I look forward to meet you.` | Sin cambios | No detecta la forma verbal. |
| `I am agree with you.` | `I am agreeing with you.` | Corrección incorrecta; lo correcto es `I agree with you`. |
| `I have gone to Berlin last year.` | Sin cambios | Corrige el participio, pero no el tiempo con `last year`. |

La conclusión es la que ya declara el modelo: está entrenado para **precisión**,
no para cobertura. Detecta muchos errores locales y deja pasar otros. Puede
equivocarse al corregir. Por eso sirve para **sugerencias**, no para decidir si
una respuesta es correcta o incorrecta.

### 6.3 Tamaño, licencia y runtime

- EN: Apache-2.0. ES: CC BY 4.0 (BETO; el card pide verificar la cadena de
  licencias de preentrenamiento para uso comercial). DE/FR/IT: Apache-2.0.
- El modelo ES incluye `grammar-messages.json`; EN/DE no lo incluyen. Si se
  quiere explicar el error, hay que aportar el texto o mapear las etiquetas.
- El port `gector.js` de la Space de Proofbird es Apache-2.0 y se puede reutilizar
  con atribución. La app tendría que servirlo junto con el modelo, o replicar el
  decodificador.
- El modelo fp32 no es viable en móvil (446-453 MB). int8 (112-114 MB) sí es
  posible, pero sigue siendo una descarga grande y una memoria considerable.

### 6.4 Límites

- Solo cinco idiomas. No cubre los 18 idiomas de la app ni los pares de estrés.
- No evalúa adecuación, registro, fluidez ni pronunciación.
- No es determinista en el sentido de "verdad": es un modelo; puede cambiar con
  la versión, la cuantización o el contexto.
- La cuantización int8 no está validada por Proofbird; es una derivación nuestra.
  Hay que mantener la versión fija y repetir la comparación fp32/int8 con un
  conjunto más amplio.
- El modelo no está entrenado con ensayos de aprendices; su recall en errores
  reales de aprendizaje es desconocido. La tarjeta lo dice: "It has not been
  measured on learner essays."

## 7. Adecuación al contexto: NLI y embeddings

### 7.1 Qué se probó

Se usó una tarea de reserva de hotel:

> Pide una habitación para dos noches para dos personas y pregunta el precio.

Y respuestas buenas, parciales, negadas, fuera de tema y gramaticalmente
incorrectas. La hipótesis NLI era, en la primera prueba, una frase larga con
todos los elementos. En la segunda, hipótesis atómicas en primera persona
(`I want a room`, `I want two nights`, `I want two people`, `I ask how much it
is`).

### 7.2 MiniLM NLI (107 MB)

- En inglés, **todas** las hipótesis largas dieron `neutral`, incluidas las
  respuestas correctas. La confianza rondó 0.85-0.97.
- En español y alemán acertó algunas respuestas correctas, pero también dio
  `neutral` a paráfrasis válidas.
- Con hipótesis atómicas en primera persona, el inglés siguió dando `neutral`
  en todos los casos; español y alemán acertaron más.
- Resultado: no es un juez. Es un modelo de inferencia entrenado con pares
  cortos; no entiende una tarea compuesta ni parafrasea como un humano.

### 7.3 mDeBERTa XNLI (338 MB)

Es el mejor NLI multilingüe de tamaño medio que se probó. Su tarjeta declara
XNLI: EN 0.871, ES 0.832, DE 0.824. Con hipótesis atómicas en primera persona:

| Idioma | `I want a room` | `... two nights` | `... two people` | `I ask how much it is` |
|---|---|---|---|---|
| EN | entailment 0.755 | entailment 0.767 | entailment 0.774 | entailment 0.578 |
| ES | entailment 0.760 | entailment 0.782 | entailment 0.731 | entailment 0.593 |
| DE | entailment 0.620 | entailment 0.695 | entailment 0.742 | entailment 0.566 |

Pero:

| Caso | Resultado | Lectura |
|---|---|---|
| `Two hamburgers to the room, please.` + `I want a room.` | entailment 0.534 | Falso positivo por la palabra `room`. |
| `I wants a room ... How much it costs?` + `I want a room.` | entailment 0.832 | No evalúa gramática. |
| Respuesta válida + hipótesis larga con todos los elementos | neutral 0.75 | No entiende una hipótesis compuesta. |
| `A man is playing a guitar.` + `A man is playing an instrument.` | neutral 0.769 | No reconoce una paráfrasis básica. |

Conclusión: sirve para comprobar **elementos atómicos** si las hipótesis se
escriben a mano y se calibran, pero no para decidir si una respuesta abierta es
adecuada. Un falso positivo como el de las hamburguesas es suficiente para no
usarlo como nota.

### 7.4 e5-small (118 MB)

Similitud coseno entre la respuesta y una referencia de la tarea:

| Idioma | Respuesta correcta | Error de gramática | Respuesta equivocada | Negación | Parcial | Cancelación | Fuera de tema |
|---|---|---|---|---|---|---|---|
| EN | 0.947 | 0.954 | 0.873 | 0.887 | 0.935 | 0.909 | 0.783-0.810 |
| ES | 0.957 | 0.948 | 0.908 | 0.903 | 0.949 | 0.923 | 0.797-0.864 |
| DE | 0.944 | 0.941 | 0.895 | 0.909 | 0.953 | 0.918 | 0.763-0.769 |

Las respuestas correctas y las negadas quedan a menos de 0.05 de distancia. No
hay un umbral que separe "responde a la tarea" de "dice lo contrario" o "habla
de otra cosa". Los embeddings sirven para buscar temas, no para evaluar
adecuación.

### 7.5 Horizon-Labs multilingual-embedding-small (269 MB)

Es un modelo de embeddings de 141 M parámetros, 1024 dimensiones, 92 idiomas,
Apache-2.0. Es una destilación de `bge-m3` en `mmBERT-small`, pensada para
recuperación y similitud, no para evaluar. El ONNX int8 ocupa 269.3 MB y el fp32
564 MB. Se probó con la misma tarea de reserva y las mismas 27 respuestas:

| Idioma | Correcta | Error de gramática | Equivocada | Negación | Parcial | Cancelación | Fuera de tema |
|---|---|---|---|---|---|---|---|
| EN | 0.867-0.930 | 0.933 | 0.723 | 0.793 | 0.877 | 0.764 | 0.489-0.596 |
| ES | 0.856-0.924 | 0.926 | 0.735 | 0.760 | 0.862 | 0.744 | 0.400-0.580 |
| DE | 0.864-0.926 | 0.919 | 0.744 | 0.760 | 0.896 | 0.786 | 0.358-0.383 |

Es mejor que e5-small: las respuestas fuera de tema caen a 0.36-0.60 y las
equivocadas a 0.72-0.74, mientras las correctas quedan en 0.86-0.93. Pero la
negación (0.76-0.79) y la respuesta parcial (0.86-0.90) se solapan con las
correctas. No puede decidir si están todos los elementos; solo puede decir si la
respuesta **habla del tema** o no.

Con umbrales provisionales:

- `>= 0.82`: el marco de la tarea es correcto.
- `0.75-0.82`: ambiguo, "no se pudo evaluar".
- `< 0.75`: no responde a la tarea.

La respuesta parcial pasa el marco (0.86-0.90) pero falla la lista de conceptos
porque no menciona las personas o el precio. Esa combinación es la que aporta
valor: el embedding detecta el tema, la lista detecta los elementos.

Coste: 269 MB, 2.4 veces el corrector de gramática. No es "pequeño" para un
móvil de gama baja. Sirve como capa opcional de desktop o gama alta, no como
núcleo.

### 7.6 Un modelo roto

`onnx-community/multilingual-nli-bert-ONNX` (179 MB int8) devolvió la misma
clase (índice 0) con probabilidad 1.0 para todo, incluidas las hamburguesas y
las frases con errores. Su `config.json` no declara nombres de etiqueta, así que
ni siquiera se puede saber qué clase es. No se debe adoptar un modelo de la
comunidad sin validarlo: la etiqueta `transformers.js` no garantiza que la
conversión sea correcta.

### 7.7 Por qué falla el NLI

- **Solapamiento léxico:** si la respuesta contiene la palabra `room`, el modelo
  puede aceptar `I want a room` aunque la frase sea sobre hamburguesas.
- **Paráfrasis:** `I'd like` y `I want` no siempre se reconocen como equivalentes.
- **Negación:** detecta mejor la negación explícita, pero no razona sobre
  intención, cancelación o condiciones.
- **Perspectiva:** las hipótesis en primera persona funcionan mejor que las de
  tercera persona; el modelo no es consistente.
- **Tareas compuestas:** una hipótesis con varios requisitos se vuelve `neutral`
  aunque la respuesta sea correcta.
- **Gramática:** una frase agramatical puede implicar el mismo contenido. El NLI
  no sustituye a un corrector.
- **Cambio de dominio:** XNLI son pares cortos de noticias y Wikipedia, no
  respuestas de aprendices en una tarea de reserva.

La exactitud XNLI no es validez de la tarea. Es un benchmark de inferencia, no
una rúbrica de adecuación.

### 7.8 Qwen2.5-0.5B-Instruct (483-512 MB)

Es un modelo general de 0.49 B parámetros, 29 idiomas, Apache-2.0. ONNX q4f16
483 MB; int8 512 MB. Se probó con Transformers.js en CPU de escritorio, con una
pregunta binaria por vez:

- gramática: `Is this sentence grammatically correct? ... YES or NO`;
- tarea: `Task: ... Answer: ... Does the answer do what the task asks? YES or NO`.

Se probaron 6 casos por idioma (18 combinaciones de gramática y tarea).

Resultado: **1 de 18**. No es un juez utilizable.

Ejemplos:

| Caso | Esperado | Respuesta del modelo |
|---|---|---|
| EN correcto: `I'd like a room for two nights...` | tarea SÍ, gramática SÍ | SÍ, SÍ |
| EN `I wants a room...` | tarea SÍ, gramática NO | no respondió ("TASK: ASK FOR A ROOM"), gramática SÍ |
| EN `Two hamburgers to the room...` | tarea NO, gramática SÍ | tarea SÍ, gramática NO |
| EN `I don't want a room...` | tarea NO, gramática SÍ | tarea SÍ, gramática SÍ |
| EN `I'd like a room for two nights.` | tarea NO, gramática SÍ | tarea SÍ, gramática SÍ |
| ES correcto | tarea SÍ, gramática SÍ | no respondió, gramática SÍ |
| DE `Zwei Hamburger...` | tarea NO, gramática SÍ | tarea SÍ, gramática SÍ |

Además:

- El prompt JSON no respetó el esquema: inventó claves y explicaciones.
- En español y alemán respondió a veces en inglés o se fue por las ramas.
- La latencia fue de 300-900 ms por pregunta en escritorio; dos preguntas por
  respuesta, 1-2 s; en móvil sería peor.

Conclusión: un modelo general de 0.5 B no basta para este juicio. Un clasificador
**fine-tuned** de tamaño similar podría funcionar, pero eso exige datos
etiquetados y un pipeline de entrenamiento que hoy no existen. No es el mismo
producto que bajar un ONNX y usarlo.

#### Dos instancias, una por tarea

Se probó la idea de usar **dos Qwen2.5-0.5B-Instruct**, una para gramática y otra
para tarea, con prompts separados y pocos ejemplos. 45 casos (36 respuestas más
9 paráfrasis):

| Medida | Resultado |
|---|---:|
| Gramática | 16/45 |
| Tarea | 23/45 |
| Combinado | 10/45 |
| Falsos "correcto" | 6 |
| Falsos "no" | 6 |
| Memoria con dos pipelines | 3.2 GB RSS |

El modelo devolvió explicaciones, ejemplos o texto en inglés en vez de YES/NO,
sobre todo en español y alemán. Dos copias del mismo modelo no añaden
conocimiento: duplican la memoria y mantienen los mismos fallos. Para que dos
modelos separados funcionen habría que **fine-tunear cada uno** con datos
etiquetados. No es viable en la PWA.

### 7.9 Separar gramática y adecuación

La intuición es correcta: son dos decisiones distintas y conviene separarlas.

- El NLI acepta frases agramaticales porque el contenido se mantiene.
- El corrector de gramática no sabe si la frase responde a la tarea.
- Un solo modelo que haga ambas cosas es o demasiado grande o demasiado
  impreciso.

Pipeline recomendado:

1. **Gramática:** Proofbird int8 del idioma. Devuelve sugerencias.
   - Con sugerencias: estado ámbar y "posibles mejoras".
   - Sin sugerencias: "no se detectaron errores", no "correcto".
2. **Marco de tarea:** Horizon (opcional, 269 MB) o la lista de conceptos.
   - `>= 0.75`: habla del tema.
   - `0.75-0.82`: baja confianza, pero no es un fallo.
   - `< 0.75`: no responde a la tarea.
3. **Elementos de la tarea:** lista de conceptos determinista.
   - No se detectó un obligatorio: "no se detectó X" (pista).
   - Todos presentes: "cumple los elementos".
   - Un elemento ausente en una paráfrasis no es un fallo: es "no comprobado".
4. **Resultado final:** solo si el marco es correcto, la gramática no tiene
   sugerencias y la lista está completa se puede decir "correcto".
   - Marco `< 0.75`: "no responde".
   - Marco `>= 0.75` y lista incompleta: "no comprobado" (ámbar).
   - Gramática con sugerencias: "con apoyo" (ámbar).

Esto no convierte la producción abierta en una evaluación completa. La
convierte en una evaluación **más estrecha y honesta**: gramática local, marco de
tarea y elementos requeridos. La interacción espontánea, la pragmática fina y la
fluidez siguen fuera.

### 7.10 Prueba del pipeline separado

Se evaluaron 36 respuestas (12 por idioma) con etiquetas de gramática y
adecuación, más 9 paráfrasis que no se usaron para escribir las formas del
checklist. No es un benchmark de aprendices; es una prueba de comportamiento.

Resultado sobre las 36 respuestas:

| Pipeline | Exactos | Falsos "correcto" | Falsos "no" |
|---|---:|---:|---:|
| Solo gramática | 14/36 | 18 | 0 |
| Solo checklist | 35/36 | 1 | 0 |
| Solo Horizon | 29/36 | 6 | 0 |
| Gramática + checklist (estricto) | **36/36** | 0 | 0 |
| Gramática + Horizon + checklist (seguro) | 31/36 exactos; 34/36 aceptando "no comprobado" en parciales | 0 | 0 |
| Gramática + NLI + checklist | 28/36 | 0 | 6 |

- **Gramática:** 5 casos con error, 5 detectados; 31 correctos, 0 falsos positivos.
  Es una muestra pequeña y contiene errores que el modelo ya conocía. En las
  pruebas anteriores dejó pasar `She don't`, `We discussed about` y
  `He suggested me`, así que no generalizar.
- **Checklist:** 36/36, pero es circular: las etiquetas y las formas se
  escribieron juntas. La prueba justa es la de paráfrasis no vistas.
- **NLI:** 28/36. Falló sobre todo con paráfrasis correctas: 6 falsos "no".
  No debe ser un gate.
- **Horizon:** 35/36 en binario (responde / no responde), pero 16/36 en tres
  clases porque no distingue adecuada de parcial.

El pipeline "estricto" llama "parcial" a una respuesta cuando el checklist
detecta algunos elementos. El "seguro" la llama "no comprobada" cuando el
checklist no está completo. El seguro baja el exacto porque las 5 parciales dejan
de llamarse "parcial", pero no produce falsos "correcto" ni falsos "no". Es el
que recomiendo para respuestas abiertas.

Paráfrasis no vistas:

| Caso | Etiqueta | Checklist | Horizon | Pipeline seguro |
|---|---|---|---|---|
| EN `twin room ... two of us` | A | A | 0.868 | correcto |
| EN `weekend ... partner and me` | A | P | 0.810 | no comprobado |
| EN `quiet room ... breakfast` | N | P | 0.677 | no |
| ES `somos dos ... cuánto sería` | A | P | 0.862 | no comprobado |
| ES `fin de semana ... pareja` | A | N | 0.770 | no comprobado |
| ES `habitación tranquila ... desayuno` | N | P | 0.684 | no |
| DE `zu zweit ... was kostet` | A | P | 0.825 | no comprobado |
| DE `Wochenende ... meine Frau` | A | P | 0.766 | no comprobado |
| DE `ruhiges Zimmer ... Frühstück` | N | P | 0.696 | no |

Lectura:

- El checklist solo acierta 1/9 en paráfrasis no vistas: marca como parcial o
  negativo lo que es adecuado porque no tiene esas formas.
- Horizon separa bien el marco: las 6 adecuadas quedan en 0.766-0.868 y las 3
  fuera de tema en 0.677-0.696. El umbral 0.75 acierta 9/9 en binario, pero el
  margen es pequeño.
- La combinación no debe usar el checklist como gate. Si el marco es correcto y
  el checklist no encuentra un elemento, la respuesta no es incorrecta: es
  **"no comprobada"**. El checklist da una pista ("no se detectó el precio"),
  no un fallo.

Política segura:

1. `Horizon < 0.75` → "no responde a la tarea".
2. `Horizon >= 0.75` y gramática con sugerencias → "con apoyo" (ámbar).
3. `Horizon >= 0.75`, checklist completo y gramática sin sugerencias →
   "correcto".
4. `Horizon >= 0.75` y checklist incompleto → "no comprobado" (ámbar), con la
   pista de lo que no se detectó. No es "incorrecto".

Con esta política, las 9 paráfrasis quedan: 1 correcta, 5 no comprobadas, 3 no
responden. Cero falsos "correcto" y cero falsos "no". Es menos ambicioso, pero es
honesto.

### 7.11 MiniLM-L12-v2 vs e5-small con Proofbird

Se probó Proofbird int8 como etapa de gramática y, para la tarea, un encoder de
118 MB con dos piezas: una cabeza de conceptos entrenada con 36 ejemplos y una
similitud de referencia para el marco. Se midió en las 9 paráfrasis no vistas.

| Encoder | Tamaño | Similitud adecuadas | Similitud fuera de tema | Strict | Safe | Falsos "correcto" | Falsos "no" |
|---|---:|---|---|---:|---:|---:|---:|
| `paraphrase-multilingual-MiniLM-L12-v2` | 118.4 MB | 0.564-0.742 | 0.421-0.523 | 5/9 | **7/9** | 0 | 2 |
| `multilingual-e5-small` | 118.3 MB | 0.856-0.924 | 0.840-0.911 | 6/9 | 5/9 | 2 | 2 |

Lectura:

- **MiniLM separa el marco:** las adecuadas quedan por encima de 0.564 y las
  fuera de tema por debajo de 0.523. Con un umbral de 0.55 acierta 9/9 en
  binario, pero ese umbral se eligió mirando el test; no es una validación.
- **e5 no separa el marco:** las fuera de tema (0.840-0.911) se solapan con las
  adecuadas (0.856-0.924). Es un modelo de recuperación, no un juez de tarea.
  En el pipeline seguro produce 2 falsos "correcto" en las frases de desayuno.
- **La cabeza de conceptos** detecta los 4 conceptos en las 6 paráfrasis
  adecuadas con ambos encoders, pero también los detecta en las frases de
  desayuno. El marco es lo que las rechaza. MiniLM lo hace mejor.
- **El umbral de MiniLM** calibrado en el train (0.631) da 36/36 en train, pero
  es demasiado alto para dos paráfrasis de fin de semana (0.564 y 0.594). Hay
  que calibrar con más datos, no con el test.

Conclusión: para el mismo tamaño, **MiniLM-L12-v2 es mejor que e5-small** para
esta tarea. Proofbird sigue siendo la gramática; MiniLM sería el encoder de la
cabeza de conceptos y del marco. La cabeza sigue siendo una prueba de concepto
con 36 ejemplos, no un modelo final.

### 7.12 Qué hay mejor que MiniLM-L12-v2

Se probó `paraphrase-multilingual-mpnet-base-v2` con el mismo pipeline. Es el
mismo tipo de modelo que MiniLM (paráfrasis multilingüe), pero con 12 capas y
768 dimensiones en vez de 384.

| Encoder | Tamaño | Safe held-out | Falsos "correcto" | Falsos "no" | Similitud adecuadas | Similitud fuera de tema |
|---|---:|---:|---:|---:|---|---|
| MiniLM-L12-v2 | 118.4 MB | 7/9 | 0 | 2 | 0.564-0.742 | 0.421-0.523 |
| MPNet-base-v2 | 278.7 MB | **8/9** | 0 | 1 | 0.703-0.857 | 0.541-0.583 |
| Horizon small | 269.3 MB | 9/9 binario con umbral 0.75 provisional | 0 | 0 | 0.766-0.868 | 0.677-0.696 |
| e5-small | 118.3 MB | 5/9 | 2 | 2 | 0.856-0.924 | 0.840-0.911 |

- **MPNet** es la mejor mejora calibrada en train: umbral 0.719, 36/36 en train,
  8/9 en held-out. Solo falla la paráfrasis alemana de fin de semana (0.703);
  las fuera de tema quedan en 0.541-0.583. El hueco es de 0.12, más del doble
  que el de MiniLM.
- **Horizon** consigue 9/9 binario con 0.75, pero ese umbral es provisional y
  falta calibrarlo en train. Tiene 92 idiomas y 1024 dimensiones.
- **MiniLM** sigue siendo el mejor en 118 MB. Si el presupuesto es 120 MB, no
  hay un reemplazo claro.
- **e5-small** no sirve para el marco: las fuera de tema se solapan con las
  correctas.

Opciones más grandes, no probadas:

- `BAAI/bge-m3`: 568 M, 1024 dimensiones, el profesor de Horizon. Muy bueno,
  pero 568 MB int8 y pensado para desktop.
- `Qwen3-Embedding-0.6B`: 0.6 B, 100+ idiomas, ~600 MB int8. Desktop/WebGPU.
- `EmbeddingGemma-300m`: 300 M, 100+ idiomas, 768 dimensiones, Matryoshka.
  Candidato a probar; licencia Gemma.
- `gte-multilingual-base`: 305 M, 768 dimensiones. Candidato a probar.

La conclusión importante: **el encoder no es el cuello de botella principal**.
Con 36 ejemplos, pasar de MiniLM a MPNet mejora un caso. Lo que falta son datos
etiquetados y negativos difíciles; sin eso, un encoder más grande no arregla las
frases de desayuno.

### 7.13 Comparativa de las seis opciones

Medido en el mismo equipo, CPU de escritorio, salvo que se indique. "Safe" es el
resultado sobre las 9 paráfrasis no vistas. No es un benchmark de aprendices.

| Opción | Mejor variante probada | Efectividad | Velocidad | Memoria / tamaño | Gramática |
|---|---|---|---|---|---|
| 1. LLM juez | Qwen3.5-0.8B | 25/45 final; 19 falsos "correcto" | 250-450 ms/prompt tras warmup | ~1 GB RSS; 551 MB q4 | 40/45, pero 3/5 errores no detectados |
| 2. Rúbrica | Qwen3.5-0.8B | Rúbrica genérica; 3/3 respuestas aceptadas | 6,5 s rúbrica + 1,6 s/respuesta | ~1 GB RSS | No evalúa gramática |
| 3. NLI | Horizon zeroshot 141M | 31/36 train; 6/9 held-out | 8,3 ms/par | 268 MB | No; se combina con Proofbird |
| 4. Embeddings | MPNet-base-v2 | 8/9 safe; 0 falsos "correcto" | 9,9 ms/embedding | 279 MB | No; se combina con Proofbird |
| 5. Clasificador | e5-small + cabeza | 6/9 exact; 3 fallos en negativos difíciles | 3,3 ms/embedding + cabeza | 118 MB + KB | No; se combina con Proofbird |
| 6. Híbrido | Proofbird + MPNet + cabeza | 8/9 safe; 0 falsos "correcto" | ~60-100 ms/respuesta | 391 MB | Sí, Proofbird |

#### 1. LLM-as-a-judge

- **Qwen2.5-0.5B:** 1/18 combinado; 10/45 con dos instancias; 6 falsos "correcto"
  y 6 falsos "no". 300-900 ms/prompt, 1,7-3,2 GB RSS.
- **Qwen3.5-0.8B:** gramática 40/45, tarea 31/45, combinado 25/45; 19 falsos
  "correcto"; 250-450 ms/prompt; ~1 GB RSS; 551 MB q4.
- **Qwen2.5-1.5B:** 1/18 combinado en 18 casos; 2/18 gramática; 5/18 tarea;
  0,5-1,9 s/prompt; 3,47 GB RSS; carga de 157 s.
- **Qwen2.5-3B:** no probado. 1.5B ya falla y consume 3,5 GB; 3B sería más
  pesado y lento, sin evidencia de que arregle el formato.

El problema no es solo el tamaño: los modelos pequeños no siguen el formato
YES/NO y sobreaceptan respuestas parciales o fuera de tema. No sustituyen a
Proofbird para gramática.

#### 2. Rúbrica automática

Qwen3.5-0.8B generó una rúbrica genérica y repetida ("must be in English",
"same language as the user" tres veces), sin `room`, `two nights`, `two people`
ni `price`. Después aceptó como `task_ok` las tres respuestas: correcta,
parcial y "dos hamburguesas".

- Rúbrica: 6,5 s.
- Evaluación: 1,6 s por respuesta.
- Total: ~8 s por respuesta, y equivocada.

1.5B y 3B no se probaron; 1.5B ya consume 3,5 GB y tarda ~1 s por llamada. Dos
llamadas por respuesta duplican la latencia y heredan los errores de la rúbrica.
No compensa frente a un checklist fijo.

#### 3. NLI

- **Horizon multilingual-zeroshot-small:** 141M, 268,4 MB int8, 30+ idiomas,
  Apache-2.0, XNLI 0.758. 8,3 ms/par. En las 36: 31/36 en tres clases, 32/36 en
  binario con 4 hipótesis atómicas. En las 9: 6/9. La hipótesis larga funciona
  mejor en EN/DE que en ES; no es un gate.
- **mDeBERTa-v3-base XNLI:** 338,3 MB, 13,2 ms/par, 28/36, falsos positivos por
  solapamiento léxico. Peor que Horizon en esta prueba y más pesado.
- **XLM-R large:** 560M, sin cabeza NLI. No se puede usar tal cual; necesita
  fine-tuning y 2,2 GB fp32. No es una opción de navegador.

El NLI es rápido, pero depende de la redacción de la hipótesis y del idioma. No
sustituye al checklist.

#### 4. Embeddings

| Modelo | Tamaño | Embedding | Safe 9 | Falsos "correcto" | Falsos "no" |
|---|---:|---:|---:|---:|---:|
| e5-small | 118,3 MB | 3,3 ms | 5/9 | 2 | 2 |
| MiniLM-L12-v2 | 118,4 MB | 3,2 ms | 7/9 | 0 | 2 |
| MPNet-base-v2 | 278,7 MB | 9,9 ms | 8/9 | 0 | 1 |
| Horizon small | 269,3 MB | 16,4 ms | 9/9 binario* | 0 | 0 |

\* Horizon con umbral 0.75 provisional; falta calibrarlo en train.

Todos necesitan una cabeza de conceptos o un marco; el embedding solo no decide
si están `room`, `two nights`, `two people` y `price`. La cabeza entrenada con 36
ejemplos detecta los 4 conceptos en las 6 paráfrasis adecuadas con MiniLM,
MPNet y Horizon, pero también los detecta en las frases de desayuno. El marco es
lo que las rechaza.

#### 5. Clasificador entrenado

- **e5-small + cabeza de centroides:** 6/9 exact; los 3 fallos son negativos
  difíciles ("habitación con desayuno").
- **XLM-R base / mDeBERTa base:** no probados. Requieren fine-tuning, datos
  etiquetados y un pipeline de entrenamiento. No son un checkpoint que se baja y
  se usa.
- Esta es la vía más prometedora para sustituir el checklist, pero necesita
  300-800 respuestas por idioma y negativos difíciles. La cabeza es el cuello de
  botella, no el encoder.

#### 6. Híbridos

- **e5 + reglas:** las reglas son el checklist; e5 añade poco. 5/9 con e5, 7/9
  con MiniLM.
- **zeroshot + e5:** NLI 6/9 y e5 5/9; combinar dos señales débiles no las hace
  fuertes.
- **e5 + Qwen3.5-0.8B:** Qwen añade explicación, pero su juicio de tarea es
  31/45 con 19 falsos "correcto"; +0,3-1 s por respuesta. No compensa.
- **Completo (zeroshot + Qwen0.8 + Proofbird):** ~931 MB de modelos, 1,5-3 s por
  respuesta, y los errores de Qwen dominan. No es viable en móvil ni mejora al
  checklist.

#### Conclusión

La mejor opción medida sigue siendo:

1. **Proofbird int8** para gramática.
2. **Checklist determinista** para la tarea, con estado "no comprobado".
3. **MiniLM-L12-v2 (118 MB)** o **MPNet-base-v2 (279 MB)** + cabeza entrenada
   como evolución del checklist, cuando haya datos.
4. **Horizon zeroshot (268 MB)** solo como NLI de apoyo, no como gate.
5. **Nada de LLM juez, rúbrica automática ni híbridos con Qwen** en la v1.

## 8. Modelos generales pequeños

| Modelo | Idiomas | Tamaño | Qué aporta | Qué falta |
|---|---|---|---|---|
| Qwen3-0.6B | 119 | 543 MB int4 WebGPU; 589 MB int8 | Instrucciones, JSON, razonamiento básico | 0.6B es pequeño para juicio fino; latencia y memoria; no calibrado |
| Qwen2.5-0.5B-Instruct | 29 | 483 MB q4f16; 512 MB int8 | Instrucciones, multilingüe | **Probado: 1/18 en gramática + tarea; no fiable sin fine-tuning** |
| 2 × Qwen2.5-0.5B (una por tarea) | 29 | 2 × 512 MB; 3.2 GB RSS | Separación de prompts | **Probado: 10/45; no fiable y no cabe en móvil** |
| Cloudflare Clef / Clef-flash | Decisión tipada | Multilingüe (base Qwen) | 27B / 9B; H200 o Workers AI | Apache-2.0 | PyTorch / SGLang | No cabe en la PWA; patrón útil |
| Gemma 3 270M IT | 140+ | 273 MB q4f16; 323 MB q4 | Multilingüe, licencia Gemma | Benchmarks bajos (IFEval 51.2, BBH 26.7, HellaSwag 37.7); no fiable para gramática/adecuación |
| mT5-small GEC | Multilingüe | ~300 M; sin ONNX listo | Corrección generativa | No determinista; licencia del fine-tune poco clara; no hay runtime de navegador |

Los modelos generales no están descartados para siempre. Pero para usarlos como
juez haría falta:

- un conjunto de 100-200 respuestas por idioma, etiquetadas por humanos;
- un prompt fijo con salida JSON y temperatura 0;
- métricas de falsos positivos y falsos negativos;
- calibración de umbrales y un estado "no evaluable";
- una prueba en dispositivos reales.

Sin eso, un LLM de 270M-0.6B puede sonar convincente y equivocarse. No puede
contar para mastery.

### 8.1 Clef y los modelos de decisión

Clef (Cloudflare) es un modelo de decisión, no un generador de texto:

- **Clef:** 27B, basado en Qwen3.8-27B, multimodal. Apache-2.0.
- **Clef-flash:** 9B, basado en Qwen3.5-9B. Apache-2.0.
- **Entrada:** un estado (texto, JSON, imagen o vídeo) y un esquema de preguntas
  tipadas (`noul` sí/no, `choice` opciones, `score` escala).
- **Salida:** una probabilidad por opción, en una sola pasada. Sin generación
  libre ni parseo.
- **Runtime:** PyTorch, head personalizado, SGLang; probado en H200. También se
  puede servir desde Workers AI.

No cabe en la PWA: 9B/27B, GPU o backend, sin ONNX ni Transformers.js. Además,
está entrenado para decisiones de negocio, no para gramática de aprendices; no
hay evidencia en EN/ES/DE.

Lo que sí vale es el **patrón**: en vez de preguntar “¿está bien?”, definir
preguntas atómicas con opciones y obtener probabilidades. Es lo que ya hace el
checklist con `room`, `two_nights`, `two_people` y `price`.

Si se quisiera un Clef pequeño para el navegador, la vía sería:

1. Un encoder multilingüe pequeño (`mmBERT-small` 136 MB o `e5-small` 118 MB).
2. Una cabeza multi-label entrenada para 4-6 preguntas atómicas.
3. Entrenamiento offline con respuestas etiquetadas; en runtime solo embeddings
   y productos escalares.

No es zero-shot. Se probó a usar embeddings para detectar cada concepto sin
entrenar:

- Horizon: 1/9 en paráfrasis no vistas; los umbrales no generalizan.
- e5-small: 6/9, pero asigna los 4 conceptos a respuestas fuera de tema; no
  discrimina.

La conclusión es la misma: sin entrenamiento, un “Clef pequeño” no existe. Con
entrenamiento, sería la evolución natural del checklist, no un sustituto de la
v1.

## 9. Proyectos descartados o no viables

- **LanguageTool:** excelente cobertura y reglas, pero es Java y requiere un
  servidor. No cabe en una PWA estática sin backend.
- **nlprule:** interesante como versión ligera de LanguageTool en Rust/WASM.
  Cubre EN y DE; ES es experimental. Los binarios derivan de LanguageTool 5.2 y
  tienen LGPL-2.1. No se probó; podría ser una alternativa si se quiere evitar
  una descarga de 112 MB, pero la cobertura y la calidad en ES no están claras.
- **Harper:** muy buen corrector inglés, Apache-2.0, Rust/WASM. Ocupa ~95 MB en
  npm y solo cubre inglés. No resuelve el requisito multilingüe.
- **Grammalecte:** corrector francés en JS. Solo francés; la app no envía FR hoy.
- **mT5-small GEC:** generativo, sin ONNX listo, sin licencia clara del
  fine-tune. No es determinista ni fácil de auditar.

## 10. Diseño recomendado por capas

La evaluación se separa en dos etapas: **gramática** y **tarea**. Ninguna capa
intenta hacer las dos cosas. La capa 0 resuelve la tarea; la capa 1, la
gramática; la capa 2 añade un marco semántico opcional.

### 10.1 Capa 0: determinista, siempre disponible

La evaluación que no depende de ningún modelo:

- tareas cerradas: elegir, ordenar, completar, relacionar;
- respuestas aceptadas de una lista;
- **lista de conceptos** para producción guiada;
- normalización de texto y comparación por formas aceptadas.

Para la tarea de reserva:

```json
{
  "taskId": "hotel_booking",
  "level": "A2",
  "prompt": "Pide una habitación para dos noches para dos personas y pregunta el precio.",
  "concepts": [
    { "id": "room", "required": true, "forms": ["habitación", "cuarto", "pieza"] },
    { "id": "two_nights", "required": true, "forms": ["dos noches", "2 noches"] },
    { "id": "two_people", "required": true, "forms": ["dos personas", "2 personas", "dos huéspedes"] },
    { "id": "price", "required": true, "forms": ["cuánto cuesta", "cuánto es", "precio", "tarifa"] }
  ]
}
```

Ventajas:

- funciona en cualquier dispositivo;
- es explicable ("faltó el precio");
- se puede testear con asserts;
- reutiliza los `conceptId` y las variantes del target pack;
- no necesita NLI ni embeddings.

Límites:

- evalúa **cumplimiento de elementos**, no calidad de expresión;
- depende de que las formas aceptadas estén bien authored;
- no detecta ironía, intención ni adecuación pragmática fina;
- no es "producción abierta"; es "producción guiada con comprobación".

La comparación debe usar límites de palabra y normalización de mayúsculas,
puntuación y acentos. No usar `includes` sin límites: `dos` no debe coincidir con
`doscientos`.

### 10.2 Capa 1: corrector de gramática opcional

- Modelo: Proofbird GECToR int8 del idioma objetivo.
- Descarga: 112-114 MB, bajo demanda, con progreso y cancelación.
- Caché: Cache Storage; si el navegador la borra, se vuelve a descargar.
- Uso: mostrar sugerencias inline (`original -> replacement`) y un aviso
  "posibles mejoras".
- Estado: si hay sugerencias, la tarjeta pasa a **ámbar** ("practicado con
  apoyo"); si no hay, "no se detectaron errores", nunca "perfecto".
- Límite: no bloquea la sesión si el modelo no carga; se oculta la sección de
  gramática y se sigue con la capa 0.
- Licencia: incluir NOTICE y atribución; el modelo ES es CC BY 4.0.

### 10.3 Capa 2: marco de tarea (opcional, no en v1)

Si se quiere detectar "esto no responde a la tarea" sin depender solo de la lista
de conceptos:

- Horizon-Labs multilingual-embedding-small int8 (269 MB);
- comparar la respuesta con una referencia de la tarea;
- umbral provisional: `>= 0.75` responde al tema; `< 0.75` no responde. La zona
  0.75-0.82 es de baja confianza, no de fallo;
- la lista de conceptos da pistas de elementos, no decide el fallo;
- si el marco es correcto y la lista no encuentra un elemento, la respuesta es
  "no comprobada", no "incorrecta";
- salida: "no parece responder a la tarea" o "no se pudo comprobar";
- nunca una nota, nunca mastery;
- solo en desktop o móvil de gama alta.

No compensa en la v1: 269 MB para una señal que la lista de conceptos ya da,
con menos explicabilidad. Si se adopta, es un extra, no el núcleo.

mDeBERTa-v3-base XNLI int8 (338 MB) sigue siendo una alternativa NLI, pero no
recomendada: necesita hipótesis atómicas, tiene falsos positivos y cuesta más
que Horizon sin mejorar la decisión final.

### 10.4 Capa 3: LLM (experimental)

No en la v1. Si se explora:

- Qwen3-0.6B o Gemma 3 270M, con WebGPU;
- Qwen2.5-0.5B-Instruct no se recomienda: 1/18 en la prueba binaria;
- salida JSON estricta y temperatura 0;
- benchmark propio por idioma;
- estado "no evaluable" si la confianza es baja;
- nunca mastery.

Si se quiere un juez de 0.5 B, la vía no es el prompt: es un clasificador
fine-tuned con datos etiquetados. Eso es otro proyecto y otro coste.

### 10.5 Contrato de datos

```json
{
  "taskId": "hotel_booking",
  "concepts": [
    { "conceptId": "hotel.room", "required": true, "forms": ["habitación", "cuarto"] }
  ],
  "grammar": {
    "model": "proofbird/gector-bert-es",
    "revision": "v1.2.0",
    "sizeMb": 114,
    "license": "CC-BY-4.0"
  },
  "fallback": "no_evaluable"
}
```

- `conceptId` referencia el target pack; no duplicar la lista de variantes.
- `forms` añade sinónimos específicos de la tarea.
- `required` distingue elementos obligatorios de opcionales.
- `grammar` es opcional; si falta, la tarea sigue siendo evaluable.
- `fallback` define qué mostrar si no hay modelo o no hay confianza.

### 10.6 Estados de UI

| Estado | Cuándo | Color | Mastery |
|---|---|---|---|
| Correcto | Marco correcto, checklist completo, gramática sin sugerencias | Verde | Sí, si la tarea es cerrada |
| Practicado con apoyo | La gramática tiene sugerencias, o se usó una pista | Ámbar | No |
| No comprobado | Marco correcto, pero el checklist no detecta un elemento | Ámbar | No |
| No responde | Marco `< 0.75`, o respuesta cerrada que no coincide | Rojo | No |
| No se pudo evaluar | ASR de baja confianza, modelo no disponible, respuesta vacía | Neutro | No |

La app nunca debe decir "perfecto" ni "correcto" basándose solo en que el
corrector no encontró errores.

### 10.7 Mastery y SRS

- La capa 0 puede actualizar mastery si la tarea es cerrada y la respuesta es
  determinista.
- La capa 1 y la capa 2 no actualizan mastery; como máximo, quality 2-3.
- La corrección con pista o con modelo no cuenta para retención ni para completar
  una destreza.
- La tarjeta vuelve pronto; si luego se acierta sin apoyo, pasa a verde.
- Nunca quality 5 por una corrección.

### 10.8 Descarga, caché y offline

- La primera vez requiere red. Mostrar tamaño, progreso y botón de cancelar.
- Guardar el modelo en Cache Storage; comprobar cuota con
  `navigator.storage.estimate()`.
- Si el navegador borra la caché, ofrecer descargar de nuevo; no fallar en
  silencio.
- El modo offline funciona después de la descarga; la capa 0 funciona siempre.
- No descargar todos los idiomas: solo el idioma objetivo activo.

### 10.9 Hosting y licencias

- No meter 336 MB (3 idiomas) en GitHub Pages: el límite es 1 GB y el sitio ya
  ocupa 0.63 GB.
- Servir los modelos desde Hugging Face Hub o Cloudflare R2, con revisión fijada
  (`v1.2.0`, etc.) y CORS.
- Incluir atribuciones en `CREDITS.md`: Proofbird, BETO, Wikipedia/Tatoeba,
  GECToR, ONNX Runtime Web.
- El modelo ES es CC BY 4.0; el resto Apache-2.0. La cuantización int8 es una
  derivación; conservar NOTICE y aviso de cambios.

## 11. Límites de "cualquier dispositivo"

| Capa | Dispositivos | Requisitos | Garantía |
|---|---|---|---|
| 0. Determinista | Todos | Navegador moderno, JS, localStorage | Sí, es el baseline actual |
| 1. Corrector | Desktop y móvil de gama media/alta | ~4 GB RAM, ~150 MB libres, WASM SIMD | No garantizada; probar en dispositivo real |
| 2. Marco de tarea (Horizon) | Desktop y gama alta | 269 MB de modelo; ~500 MB RAM; 381 MB si se suma al corrector | Opcional, no recomendada en v1 |
| 3. LLM | Desktop con WebGPU | 273-589 MB, GPU | Experimental |

El navegador puede exponer `navigator.deviceMemory`,
`navigator.hardwareConcurrency`, `navigator.storage.estimate()` y
`WebAssembly.validate` para decidir si ofrecer la capa 1. No son fiables en todos
los navegadores; usar un valor conservador y permitir que el usuario decida.

Antes de prometer "cualquier dispositivo" hay que probar:

- Android de gama baja (2-4 GB), gama media y gama alta;
- iPhone antiguo y reciente (Safari, política de almacenamiento);
- tablet;
- portátil antiguo;
- primera inferencia y estado estable;
- memoria real y cierres del navegador.

## 12. Qué queda por validar

1. **Benchmark propio de gramática:** 100-200 frases por idioma con errores de
   aprendices, no solo errores sintéticos. Medir precisión, recall, falsos
   positivos y falsos negativos.
2. **Benchmark propio de adecuación:** 100-200 respuestas por tarea, etiquetadas
   por humanos, para comparar lista de conceptos, Horizon, NLI y LLM.
3. **Paráfrasis no vistas:** el checklist acertó 1/9 en las paráfrasis de prueba.
   Hay que medir cuántas respuestas reales caen fuera de las formas y decidir
   cuánto authoring se está dispuesto a mantener.
4. **Calibrar Horizon:** confirmar el umbral 0.75 con más respuestas y decidir si
   269 MB compensan frente a la lista de conceptos sola.
5. **Dispositivos reales:** latencia, memoria y estabilidad de la capa 1.
6. **Cuantización:** comparar fp32/int8 en el benchmark amplio; decidir si la
   pérdida es aceptable.
7. **Licencias:** revisar la cadena de BETO para uso comercial y las obligaciones
   de CC BY 4.0.
8. **Producto:** decidir si la capa 1 se ofrece, se oculta o se elimina. Si no se
   ofrece, la app se queda con la capa 0 y no promete evaluación abierta.
9. **Juez de 0.5 B:** si se quiere, fine-tunear un clasificador con datos
   etiquetados; no usar un modelo general con prompt.

## 13. Recomendación

1. **Adoptar la capa 0** para Speaking, tareas y fluidez: lista de conceptos +
   respuestas aceptadas. Llamarlo "producción guiada con comprobación de
   elementos", no "evaluación de producción abierta".
2. **Ofrecer la capa 1 como extra opcional** para EN/ES/DE, con descarga de
   112-114 MB, sugerencias y estado ámbar. No bloquear la sesión si no carga.
3. **Separar gramática y adecuación** en la UI y en el motor. La gramática la
   evalúa el corrector; la tarea, el marco y la lista de conceptos. No pedir a un
   modelo que haga las dos cosas.
4. **No convertir el checklist en un gate ciego.** Si el marco es correcto y el
   checklist no detecta un elemento, la respuesta es "no comprobada", no
   "incorrecta". El checklist da pistas; no demuestra que la respuesta sea mala.
5. **No adoptar NLI ni LLM como jueces** en la v1. Horizon (269 MB) puede volver
   como marco de tarea opcional si se calibra; no sustituye a la lista.
6. **No prometer "cualquier dispositivo"** para la capa 1. Prometer la capa 0
   para todos y la capa 1 para dispositivos compatibles, con un aviso claro.
7. **Medir antes de implementar:** benchmark propio, paráfrasis no vistas y
   pruebas en dispositivos reales. Sin eso, la decisión es una hipótesis, no una
   validación.

## 14. Reproducción

Los scripts de esta investigación quedaron en un directorio temporal, fuera del
repo. Para repetirla:

1. Descargar el modelo de Hugging Face con `huggingface_hub`.
2. Cuantizar:

```python
from onnxruntime.quantization import quantize_dynamic, QuantType
quantize_dynamic("model.onnx", "model_int8.onnx", weight_type=QuantType.QInt8)
```

3. Ejecutar el `quickstart.py` del modelo con `tokenizers` y `onnxruntime`.
4. Para el navegador, servir `gector.js`, `config.json`, `tokenizer.json`,
   `language-rules.json`, `verb-form-vocab.txt` y `model.onnx` (int8) con
   `onnxruntime-web`, y medir con Playwright.
5. Para NLI, usar `tokenizers` + `onnxruntime` con el tokenizer del modelo y
   `softmax` sobre `logits`; recordar `token_type_ids` en los modelos BERT.
6. Para Horizon, usar `onnx/model_quantized.onnx` con `input_ids` y
   `attention_mask`; la salida `sentence_embedding` ya está normalizada. La
   similitud es el producto escalar.
7. Para Qwen2.5-0.5B, usar `@huggingface/transformers` con `dtype: "q8"` y
   `pipeline("text-generation", ...)`, `do_sample: false`, y una pregunta
   binaria por vez. El JSON estructurado no funciona de forma fiable.

## 15. Fuentes

- Proofbird, `gector-bert-en`: https://huggingface.co/proofbird/gector-bert-en
- Proofbird, `gector-bert-es`: https://huggingface.co/proofbird/gector-bert-es
- Proofbird, `gector-bert-de`: https://huggingface.co/proofbird/gector-bert-de
- Proofbird, demo en navegador: https://huggingface.co/spaces/proofbird/try-grammar
- GECToR, Omelianchuk et al. (2020): https://arxiv.org/abs/2005.12595
- nlprule: https://github.com/bminixhofer/nlprule
- LanguageTool: https://github.com/languagetool-org/languagetool
- Harper: https://github.com/Automattic/harper
- Transformers.js: https://huggingface.co/docs/transformers.js
- ONNX Runtime Web: https://onnxruntime.ai/docs/tutorials/web/
- MiniLM NLI: https://huggingface.co/MoritzLaurer/multilingual-MiniLMv2-L6-mnli-xnli
- mDeBERTa XNLI: https://huggingface.co/MoritzLaurer/mDeBERTa-v3-base-xnli-multilingual-nli-2mil7
- XNLI, Conneau et al. (2018): https://arxiv.org/abs/1809.05053
- e5-small: https://huggingface.co/intfloat/multilingual-e5-small
- Horizon-Labs multilingual-embedding-small: https://huggingface.co/Horizon-Labs/multilingual-embedding-small
- Qwen3-0.6B: https://huggingface.co/Qwen/Qwen3-0.6B
- Qwen2.5-0.5B-Instruct: https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct
- Qwen2.5-0.5B-Instruct ONNX: https://huggingface.co/onnx-community/Qwen2.5-0.5B-Instruct
- Gemma 3 270M: https://huggingface.co/google/gemma-3-270m-it
- mmBERT-small: https://huggingface.co/onnx-community/mmBERT-small-ONNX
- Kane, M. T. (2013). Validating the interpretations and uses of test scores.
- Messick, S. (1995). Validity of psychological assessment.
