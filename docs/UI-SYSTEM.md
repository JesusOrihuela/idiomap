# Sistema de UI â€” Idiomap

> Referencia operativa. El *porquÃ©* y el plan de migraciÃ³n estÃ¡n en
> [`UI-PLAN.md`](UI-PLAN.md). Esto es el contrato para tocar UI.
> Criterio externo y checklist por pase: [`UI-REFERENCES.md`](UI-REFERENCES.md).
> Juicios de diseÃ±o abiertos: [`UI-DECISIONS.md`](UI-DECISIONS.md).
>
> Ãšltima revisiÃ³n: 2026-11-02 Â· Tokens: `shared/css/tokens.css`

---

## 1. Reglas de uso

1. **Nunca un valor crudo en un componente.** Ni `#2563EB`, ni `14px`, ni `font-size: 0.9rem`. Siempre un token.
2. **Un componente solo referencia la capa semÃ¡ntica.** Si necesita un color o un tamaÃ±o que no existe, se aÃ±ade el token con nombre; no se escribe inline.
3. **Sentence case.** Nada de `text-transform: uppercase`. USWDS: *Â«uppercase text has a serious negative effect on readabilityÂ»*.
4. **Cero emoji como icono.** Set SVG propio, un tamaÃ±o, un grosor.
5. **Cifras con `font-variant-numeric: tabular-nums`.**

---

## 2. TipografÃ­a

### Roles

| Rol | Token | Valor | Peso | InterlÃ­nea | Tracking |
|---|---|---|---|---|---|
| `display-lg` | `--text-display-lg` | `clamp(2.1rem, 4.5vw, 3.5rem)` | 600 | 1.1 | âˆ’0.02em |
| `display-md` | `--text-display-md` | `clamp(1.7rem, 3.5vw, 2.4rem)` | 600 | 1.15 | âˆ’0.01em |
| `headline` | `--text-headline` | `clamp(1.4rem, 3vw, 1.9rem)` | 500 | 1.25 | 0 |
| `title` | `--text-title` | `1.25rem` | 500 | 1.3 | 0 |
| `body-lg` | `--text-body-lg` | `1rem` | 400 | 1.6 | 0 |
| `body` | `--text-body` | `0.875rem` | 400 | 1.55 | 0 |
| `label` | `--text-label` | `0.75rem` | 500 | 1.4 | +0.02em |
| `caption` | `--text-caption` | `0.75rem` | 400 | 1.4 | 0 |
| `numeric` | `--text-numeric` | `clamp(1.5rem, 4vw, 2rem)` | 600 | 1 | -0.01em |

**Reglas de texto:** todo bloque con un rol usa su interlineado y tracking (--text-<rol>-leading/tracking); no se escriben nÃºmeros sueltos. line-height: 1 queda reservado a iconos y cifras (alineaciÃ³n). El tracking de etiquetas es 0.02em; el tracking amplio (0.05em+) solo se admite en micro-etiquetas en mayÃºsculas, y hoy no hay ninguna. La familia es Raleway (--font-family-base); solo el cÃ³digo usa --font-family-mono.

Cada rol expone el tamaÃ±o (`--text-<rol>`) y, cuando el uso lo necesita, su interlineado y tracking
(`--text-<rol>-leading` / `-tracking`). Solo existen las variables que se consumen: un token sin
consumidor es deuda, no contrato (gate `check-ui-system` exige 0 tokens muertos).

### Uso

| Rol | DÃ³nde |
|---|---|
| `display-lg` | Hero del landing (`.hero-title`) |
| `display-md` | H1 de cada pÃ¡gina |
| `headline` | H2 de secciÃ³n |
| `title` | H3, tÃ­tulo de card, tÃ­tulo de modal |
| `body-lg` | PÃ¡rrafos de lectura |
| `body` | Descripciones de card, texto secundario, botón |
| `label` | Labels, botón compacto, badges, estado de sección |
| `caption` | Metadatos, contadores, notas al pie |
| `numeric` | Cifras de stat, resultados |

### Por quÃ© esos valores

- **Cuerpo mÃ­nimo 16 px** â€” USWDS: *Â«use at least an effective size of 16pxÂ»* para texto corrido. Los menores se reservan *Â«sparingly for captionsâ€¦ specialized UI elementsÂ»*. Por eso `body-lg` es el cuerpo real y `body` (14 px) queda para lo secundario.
- **InterlÃ­nea por longitud** â€” USWDS: 1â€“1.35 en tÃ­tulos y textos de 1-2 lÃ­neas; **â‰¥ 1.5 en texto largo**. Los valores de la tabla cumplen.
- **WCAG 2.2 AA Â· SC 1.4.12** â€” el contenido debe aguantar interlÃ­nea 1.5, tracking 0.12em, espaciado de palabra 0.16em y 2em entre pÃ¡rrafos **sin recorte ni solape**. No obliga a usarlos; obliga a que nada se rompa si el usuario los impone.
- **Uppercase fuera** â€” USWDS: efecto serio en legibilidad. Las 7 reglas `text-transform: uppercase` con tracking del proyecto desaparecen.
- **Medida** â€” `--measure: 66ch` (USWDS: 45â€“90 caracteres, objetivo 66).

### DerivaciÃ³n de fuentes

9 roles â†’ **3 pesos: 400 / 500 / 600**. El 600 queda para display y cifras; los titulares de secciÃ³n y las tarjetas usan 500; el resto, 400/500. No hay 700, 800 ni 900. La jerarquÃ­a la dan tamaÃ±o y color, no el grosor. La cursiva tiene 18 declaraciones y se revisa caso a caso.

---

### Jerarquía y prioridad

La literatura converge: la jerarquía se construye con **pocos niveles** y se refuerza con color, peso y agrupación, no añadiendo tamaños.

- **Material 3** reduce todo a cinco roles (display, headline, title, body, label); los botones usan `label`, no `body`; interlínea 1.2 en titulares y ~1.5 en texto pequeño.
- **Apple HIG**: los text styles existen para expresar *levels of importance*; se usan tal cual en lugar de inventar tamaños por pantalla.
- **Carbon**: los controles usan una escala fija de alturas (24/32/40/48/64/80), no una altura por página.
- **NN/g**: como máximo **3 tamaños** y **3 pasos de contraste** por pantalla; los elementos grandes se limitan a 2. La agrupación (proximidad y región común) hace el resto.
- **USWDS**: cuerpo >=16 px e interlínea >=1.5 en texto largo.

**Regla del proyecto: tres niveles por pantalla.**

| Nivel | Rol | Dónde | Cuántos |
|---|---|---|---|
| 1 · Página | `display-md` | H1 y una línea de contexto | 2 |
| 2 · Sección | `title` 20/500 + hairline | H2 de `.section-block` | 1 por sección |
| 3 · Contenido | `body-lg` / `body` / `label` | párrafos, datos, metadatos | sin límite |

Dentro del mismo nivel la diferencia se marca con **peso y color**, nunca con un tamaño nuevo. Una tarjeta usa como máximo **tres roles**: título, cuerpo y etiqueta.

**Anatomía de una tarjeta de sección:** título (20) → subtítulo (14) → acciones → estado (12) → ayuda (12). Máximo **una acción primaria** y una secundaria por sección; el resto es `ghost`. El estado y la ayuda comparten tamaño; el aviso urgente se distingue por color (`warning`), no por tamaño ni por una superficie nueva.

**Racha en Mi Ruta:** va arriba a la derecha, alineada con el borde del contenido y a la altura del titulo; por debajo de 768 px pasa a flujo, alineada a la derecha bajo el subtitulo, para no pisar el titulo.

**Barra de sesión:** tres pistas (`1fr auto 1fr`): volver a la izquierda, contador en el centro exacto de la columna y racha a la derecha. El contador se alinea con el título del ejercicio, no con el hueco que dejan los laterales, que miden distinto, y **se muestra desde el primer momento con `0 / N`**: su ausencia dejaba la racha en el centro. En pantallas de 400 px o menos el contador se abrevia a `0 / N` (el texto completo va en el `aria-label`). Contador y racha son pastillas de **32 px** de alto. `check-layout` compara centros, alineación derecha y alturas.

**Boton atras del ejercicio:** dentro de un ejercicio el atras vuelve al **indice del tema**, no al selector: la etiqueta dice `← Frases` en las actividades de frase y `← Palabras` en Quiz y Vocabulario. Solo en el selector de temas dice `← Temas`. La etiqueta la fija `AppSessionBar.setBackTarget` al abrir el indice.

**Titulo de actividad:** la palabra clave del h1 va en `--color-action` mediante un `<span>` (`¿Cómo se <span>pronuncia</span>?`, `Completa el <span>espacio</span>`); el resto del titulo queda en color de texto. Mi Ruta usa el mismo recurso en "Ruta de Aprendizaje".

**Entrada de las actividades:** cada bloque visible de una pantalla de ejercicio entra con `fadeIn` o `fadeInScale` (0.2 s, delay 0.2 s): barra de sesion, titulo, subtitulo, tarjeta, controles, avisos de carga y progreso de fases. `check-layout` recorre los hijos visibles de cada pantalla y exige animacion en todos.

**Ritmo del ejercicio:** también aplica a Quiz y Vocabulario: la superficie (`#exercise-area`, `#quiz-content`, `#vocab-content`) se centra en el alto disponible y no genera scroll a 1280x800. La instrucción de Quiz (`Elige la traducción`) entra con el mismo `fadeIn` que la tarjeta y las opciones.

**Ritmo del ejercicio:** el área de práctica apila bloques con dos distancias, no con una por página. Título y subtítulo van a **8 px** (`--space-2`); del subtítulo al primer bloque hay **24 px** (`--space-6`); todos los bloques siguientes (tarjeta, Escuchar, barra de escritura, alerta, acciones) van a **16 px** (`--space-4`). El ejemplo medido en Cloze: 8, 24, 16, 16, 16, 16. La fila de gramática y Escuchar solo aporta su margen cuando tiene algo visible. `check-layout` mide la pila completa en Cloze, Traducción y Dictado.

**Cabecera de sección:** las secciones de **ajuste** (Idioma, Temas de Interés, Respaldo, Recordatorios) llevan una línea de ayuda porque su efecto no se ve en el propio control; las de **datos** (Resumen de Ejercicios, Actividad, Logros) van solo con el título. Un subtítulo en una sección de datos es ruido; su ausencia en una de ajuste deja al usuario sin explicación.

**Inventario:** `docs/UI-CATALOG.md` (generado) lista las clases y sus consumidores; este documento define qué rol puede usar cada una.

### Controles

Un solo alto de control en todo el sitio: **44 px de objetivo táctil** y **36 px de superficie visible**. El fondo y el borde viven en `::before` con `inset: 4px 0`, la misma técnica que las cápsulas de Temas (32/44). El botón no lleva relleno vertical: el texto se centra en el objetivo, no lo estira.

Los campos de una línea usan la misma pareja: 4 px de borde transparente dejan el campo pintado en 36 dentro de 44, y el borde visible es un `box-shadow` interior (`--shadow-field`); el foco lo marca solo el anillo exterior, sin segundo aro interior, y ese anillo se dibuja pegado al campo (`outline-offset` negativo) para que no quede como un segundo marco. Así una barra de escritura y el botón de al lado miden lo mismo a la vista, no solo de caja. Los textareas y el hueco de frase conservan su borde real.

| Clase | Letra | Superficie | Objetivo |
|---|---|---|---|
| `.btn` | 14/500 | 36 px | 44 px |
| `.btn--sm` | 12/500 | 36 px | 44 px |
| `.icon-btn` | icono 32 px | 32 px | 44 px |

---

| `input.field__input` | 14/400 (16 en tactil) | **36 px** dentro de 44 | campo de una linea |
| `input.field__input--inline` | 16/400 | auto (hueco de frase) | — |

Los inputs de una línea comparten los 44 px del objetivo táctil y la letra del botón (14/400); en pantalla táctil suben a 16/400 para que iOS no amplíe la página al enfocar; los textareas conservan su padding porque son multilínea. El hueco inline de Gramática mantiene su alto automático. El badge CEFR es 12/600: en Dictado comparte fila con Escuchar (`position: static`), en el resto va en la esquina de la tarjeta. La insignia de variante sigue la misma regla en Dictado: va en esa fila, detras del boton, no en una linea propia.

### Acciones

| Rol | Clase | Color |
|---|---|---|
| Ejecutar (Hablar, Comprobar) | `.btn--primary` / `.btn--check` | azul `--color-action` |
| Avanzar (Siguiente) | `.btn--next` | verde `--color-success-strong` |
| Reintentar | `.btn--retry` | ámbar `--color-warning-strong` |
| Escuchar / secundaria | `.btn--secondary` | neutro |

Las filas de acción de un ejercicio comparten el ancho completo y dos columnas iguales. No se repite el par azul/neutro en dos filas: ejecutar, avanzar y reintentar se distinguen por color y por posición.

### Botones de audio

Escuchar y Hablar llevan icono de 18 px + etiqueta: `#i-volume-2` y `#i-mic`. El boton Escuchar es el mismo componente en Pronunciacion, Dictado, Cloze, Vocabulario y Traduccion: `.btn .btn--secondary`, 44 px de objetivo, icono de volumen y `.btn-label`; no se usa `.btn--sm` para escuchar. El icono es `aria-hidden`; el texto visible sigue siendo la etiqueta accesible y el botón conserva su `aria-label` de acción. Los cambios de estado (Grabando, Transcribiendo) actualizan solo `.btn-label`, nunca el `textContent` del botón, para no borrar el icono.

### Alertas de resultado

Mismo cuerpo para acierto, error y aviso: **12/16 de padding**, borde de **1 px** en el color del estado por los cuatro lados (sin franja lateral), título **14/600**, cuerpo **14/400** e icono de 16 px. Las filas del diff van a 4 px y el divisor a 8. El color sale de los tokens `--feedback-correct-*`, `--feedback-error-*` y `--color-warning-*`, nunca de un valor suelto. El error de micrófono de Pronunciación usa este cuerpo (icono + “Error” + mensaje), no el bloque grande de 16/20.

---

## 3. CalibraciÃ³n contra el cÃ³digo real

Medido sobre **360 declaraciones `font-size`** en los 13 CSS. Resultado del reemplazo por los 9 roles:

| Impacto | Declaraciones | % |
|---|---|---|
| Sin cambio perceptible (< 0.5 px) | 151 | 42,2 % |
| Ajuste fino (0.5 â€“ 1 px) | 128 | 35,8 % |
| Salto visible (â‰¥ 1 px) | 79 | 22,1 % |

### Reparto por rol

| Rol | Declaraciones | Valores absorbidos |
|---|---|---|
| `body` | 125 | `0.9rem`(41) Â· `0.82rem`(34) Â· `0.85rem`(25) Â· `0.88rem`(16) |
| `label` | 107 | `0.72rem`(20) Â· `0.78rem`(17) Â· `0.75rem`(15) Â· `0.8rem`(14) Â· `0.7rem`(10) |
| `body-lg` | 59 | `1rem`(32) Â· `0.95rem`(13) Â· `1.05rem`(9) Â· `1.1rem`(5) |
| `title` | 24 | `1.4rem`(7) Â· `1.5rem`(6) Â· `1.2rem`(3) Â· `1.25rem`(3) |
| `headline` | 20 | `1.8rem`(5) Â· `clamp(1.4rem,3vw,1.9rem)`(5) Â· `1.6rem`(4) |
| `display-md` | 17 | `clamp(1.7rem,3.5vw,2.4rem)`(3) Â· `clamp(1.6rem,3.5vw,2.2rem)`(5) |
| `numeric` | 6 | `2rem`(4) Â· `clamp(1.5rem,â€¦,2rem)`(2) |

### Contrato tipografico por componente (2026-11-04)

Mismo componente, mismo rol. Los roles viven en `shared/css/components.css`; las paginas
solo componen. Si un componente necesita otro tamano, se crea/cambia un rol, no un
`font-size` suelto.

| Componente | Clase | Rol (tamano / peso / interlineado) |
|---|---|---|
| Titulo de pagina (h1) | `.page-header__title` | `display-md` / 600 / `display-md-leading` |
| Subtitulo de pagina | `.page-header__sub` | `body-lg` / 400 / `body-lg-leading` |
| Seccion de pagina (portada) | `.section-heading` | `headline` / 500 / `headline-leading` |
| Subtitulo de seccion de pagina | `.section-subheading` | `body` / 400 / `body-leading` |
| Seccion dentro de tarjeta (h2) | `.section-title` (`--tight` para matrices) | `title` / 500 / `title-leading` + hairline |
| Subtitulo de seccion de tarjeta | `.section-subtitle` | `body` / 400 / `body-leading` |
| Titulo de tarjeta | `.card__title`, `.category-label` | `body-lg` / 600 / `body-lg-leading` |
| Titulo de tarjeta multimedia | `.img-topic-card__title` | `body` / 500 / `body-leading` |
| Pantalla terminal | `.screen-title` | `headline` / 500 / `headline-leading` |
| Dialogo / onboarding | `.dialog-title` | `title` / 600 / `title-leading` |
| Boton | `.btn` | `body` / 500 / `body-leading` |
| Boton compacto | `.btn--sm` | `label` / 500 / `label-leading` |
| Etiqueta / chip / par | `.prog-bubble`, `.lp-card__name`, `.path-node__label`, `.ml-snode__label` | `label` / 500 / `label-leading` |
| Etiqueta de stat | `.stat-label` | `label` / 600 / `label-leading` |
| Sección de grupo (landing) | `.group-badge` | `title` / 500 / `title-leading`, igual que `.section-title` |
| Valor numerico | `.stat-value` | `numeric` / 600 / `numeric-leading` |
| Enunciado de ejercicio | `.exercise-prompt`, `.word-text`, `.quiz-word` | `headline` / 500 / `headline-leading` |
| Traduccion o pista | `.exercise-sub` | `body-lg` / 400 / `body-lg-leading` + italica |

`check-layout` valida los roles representativos a 1440 px. Los h1 de pagina y los h2
de seccion tambien se comprueban estaticamente.

### Los dos hallazgos de la calibraciÃ³n

**1. Los tamaÃ±os grandes no eran tipografÃ­a: eran iconos.**
`4rem` era `.result-emoji`, `3rem` era `.complete-icon` y `.placement-icon`, `2.8rem` era `.ob-hero-icon`. Ninguno es texto. Salieron de la escala y tienen la suya (`Â§4`). Sin esta correcciÃ³n, el rol `display` habrÃ­a tenido que absorber un emoji de 64 px.

**2. Los tÃ­tulos ya eran fluidos.** `.hero-title` usa `clamp(2.1rem, 4.5vw, 3.5rem)` y los H1 de pÃ¡gina `clamp(1.7rem, 3.5vw, 2.4rem)`. Sustituirlos por un valor fijo habrÃ­a roto el comportamiento responsive. Los roles conservan el `clamp` â€” por eso hay `display-lg` y `display-md` en lugar de un solo `display`.

### Mapa de migraciÃ³n para F5

De mayor a menor uso. Â«SaltoÂ» = diferencia entre el valor actual y el rol asignado.

| Actual | Decl. | â†’ Rol | Salto |
|---|---|---|---|
| `0.9rem` | 41 | `body` | 0,4 px |
| `0.82rem` | 34 | `body` | 0,9 px |
| `1rem` | 32 | `body-lg` | 0 |
| `0.85rem` | 25 | `body` | 0,4 px |
| `0.72rem` | 20 | `label` | 0,5 px |
| `0.78rem` | 17 | `label` | 0,5 px |
| `0.88rem` | 16 | `body` | 0,1 px |
| `0.75rem` | 15 | `label` | 0 |
| `0.8rem` | 14 | `label` | 0,8 px |
| `0.95rem` | 13 | `body-lg` | 0,8 px |
| `0.7rem` | 10 | `label` | 0,8 px |
| `1.05rem` | 9 | `body-lg` | 0,8 px |
| `0.68rem` | 8 | `label` | 1,1 px |
| `1.4rem` | 7 | `title` | 2,4 px |
| `1.5rem` | 6 | `title` | 4 px |
| `0.65rem` | 6 | `label` | 1,6 px |

**Texto por debajo de 11 px:** 30 declaraciones repartidas entre `.cefr-badge`, `.path-node__label`, `.stat-label`, `.pb-chip-num`, `.ml-snode__topic`, `.prog-cefr-pct` y similares. Todas suben a `label` (12 px). Es intencionado: 8 px no es legible y USWDS no lo permite fuera de notas al pie.

**Nota de riesgo:** el 22 % con salto visible se concentra en badges y micro-labels. Al subirlos a 12 px puede haber reflujo en los nodos del camino y en las tablas de `progress`. Se verifica con pixel-diff por pÃ¡gina en F5, no en bloque.

---

## 4. Iconos

Un solo set: **43 sÃ­mbolos**, empaquetados en un **sprite Ãºnico** (`shared/js/icons.js`):
42 de **Lucide** (ISC/MIT) y el glifo de marca de GitHub (`i-github`, Font Awesome, CC BY 4.0).
El script se carga en `<head>` y se inyecta antes de que el cuerpo se parsee, asÃ­ que ningÃºn
`<use>` queda sin resolver y no hay parpadeo.

```html
<svg class="icon" aria-hidden="true"><use href="#i-house"/></svg>
```

| Token / clase | Valor | Uso |
|---|---|---|
| `.icon` | 20px | nav, botones |
| `.icon--sm` | 16px | inline con `caption` |
| `.icon--lg` | 24px | encabezados |
| `.icon--xl` | 32px | tiles de card |
| `.icon--brand` | heredado | marcas rellenas (`#i-github`): `fill` en vez de `stroke` |

**Reglas duras (verificadas por `tools/check-ui-system.mjs`):**

- **Un sÃ­mbolo por idea, definido una sola vez.** 0 duplicados exactos y 0 sÃ­mbolos sin uso.
- **Nada de SVG de icono en el HTML.** Los 12 footers usaban el glifo de GitHub inline; ahora
  todos resuelven `#i-github`. Un `<svg>` suelto en HTML/JS solo se admite si es **dato**
  (iconos de dimensiÃ³n de `feedback.js`, confeti).
- **TamaÃ±o por contexto**, color heredado del rol de texto, `aria-hidden` siempre (el nombre
  accesible va en el control), nunca color propio.
- Un icono no se copia a mano: se aÃ±ade al sprite y se referencia por `#i-<id>`.

Dentro de los contenedores que antes dimensionaban un emoji con `font-size`
(`.feature-icon`, `.stat-icon`, `.complete-icon`, `.ob-hero-icon`, `.placement-icon`,
`.path-node__bubble`, `.ob-close`â€¦) el icono usa `1em`, asÃ­ que **conserva el tamaÃ±o exacto
que tenÃ­a el emoji** sin tocar una sola regla de layout.

**AÃ±adir un icono:** se aÃ±ade el nombre de Lucide al mapa del generador, se regenera
`shared/js/icons.js` y se referencia con `#i-<id>`. No se copia SVG a mano en el HTML.

### Banderas

**Ninguna bandera se dibuja en cÃ³digo.** Las 33 son archivos SVG **importados de Wikimedia
Commons** en `shared/img/flags/<code>.svg` (dominio pÃºblico; optimizados con SVGO a precisiÃ³n 1),
y `flags.js` solo crea `<img src>`: no contiene ni una primitiva SVG. Los mapas de macro-regiÃ³n
(`shared/img/regions/`, ortofrÃ¡ficos) siguen la misma regla.

| Rol | Selector | Alto | Ancho |
|---|---|---|---|
| **Slot de idioma (estÃ¡ndar)** | `.flag-frame` | **22 px** (`--size-badge`) | **48 px** (`--space-12`) |
| **Slot compacto (toggle vocab)** | `.fc-def-side .flag-frame` | **16 px** (`--icon-sm`) | **36 px** (`--space-9`) |
| Stack de par / idioma | `.flag-layer` | **14 px** | automÃ¡tico (razÃ³n real) |
| PÃ­ldora de regiÃ³n | `.region-phrase-badge .flag-img` | **11 px** | automÃ¡tico |
| Globo de macro-regiÃ³n | `.region-phrase-badge .region-globe` | **18 px** | 18 px (asset cuadrado) |
| Etiqueta de variante | `.variant-meta-item .flag-img` | **11 px** | automÃ¡tico |
| Etiqueta compacta (reverso) | `.variant-compact-tag .flag-img` | **10 px** | automÃ¡tico |

**Escala = altura fija + `width: auto`.** Una bandera cuadrada (Suiza) mide 14Ã—14 y una 1:2
(EE. UU., 1.9:1) mide 27Ã—14; nunca se estira. El stack del par calcula su caja con la razÃ³n real
de cada asset (`FLAG_AR`, 32 cÃ³digos), asÃ­ el conjunto queda centrado sin inclinarse.

**Slot fijo, no ancho variable.** `AppFlags.langFlags()` envuelve el stack en `.flag-frame`:
un idioma con 1, 2 o 3 banderas ocupa **el mismo ancho**. Eso mantiene alineados el badge del
header, las tarjetas de perfil y el toggle de vocabulario. El badge del header mide **124,8Ã—44 px**
para cualquier par; las tarjetas de perfil, **114,4 px** de fila.

Gate: `node tools/check-flags.mjs` â€” 0 SVG dibujado a mano, razÃ³n de cada archivo = `FLAG_AR`
(Â±1.5 %), 0 huÃ©rfanos, 0 referencias sin asset, `viewBox` en todos.

### Estado (F4)

- **Hecho:** 144 lÃ­neas de marcado convertidas, 12 pÃ¡ginas, **0 emoji en HTML**.
- **F4-B cerrado:** 186 emoji retirados de `lang/ui.js`, los nodos de `my-learning`, las
  cabeceras de columna de `progress` y los iconos del toast de logros pasaron al sprite
  (se aÃ±adiÃ³ `#i-lock`). **0 emoji en el texto renderizado** en las 12 pÃ¡ginas en su estado
  inicial, verificado por `tools/verify-ui.mjs`.
- **Quedan emoji en pantallas de estado** (no las recorre `verify-ui`): toast de logro
  (`milestones.js` â†’ `mt-emoji`), resultado de placement (`.result-suggestion__emoji`),
  el icono de reentrada de grammar y las valoraciones. La sesiÃ³n completada ya usa el
  sprite (`#i-party`). Declarado en `UI-DEBT.md` A-07 con su motivo y su coste.
- **Regla:** el emoji que viene de los **datos** (campo `emoji` de
  `shared/json`, `topics.js`, `path.js` y las categorÃ­as de grammar) se pinta como dato,
  nunca como chrome: `.ex-grid-topic-emoji`, `.category-emoji`, `.ml-snode__topic`,
  `.img-topic-card__title`, `.path-node__topic`. Verificado: 11 `.category-emoji` visibles
  en grammar, todos con `display` distinto de `none`.

---

## 5. Espaciado

Base 4 pt. Toda medida cae en la tabla.

| Token | px | Uso |
|---|---|---|
| `--space-1` | 4 | ajuste interno |
| `--space-2` | 8 | gap iconoâ€“label |
| `--space-3` | 12 | gap entre items de lista |
| `--space-4` | 16 | padding de control |
| `--space-5` | 20 | padding de card compacta |
| `--space-6` | 24 | padding de card |
| `--space-8` | 32 | padding de pÃ¡gina (mÃ³vil) |
| `--space-10` | 40 | separaciÃ³n entre bloques |
| `--space-12` | 48 | padding de pÃ¡gina (escritorio) |
| `--space-16` | 64 | separaciÃ³n entre secciones |
| `--space-20` | 80 | hero |
| `--space-24` | 96 | secciÃ³n grande |

**Ritmo vertical** (USWDS): â‰¥ 1em entre pÃ¡rrafos Â· â‰¥ 0.5em entre items de lista Â· al menos 1.5Ã— mÃ¡s espacio encima de un tÃ­tulo que debajo.

Rejilla verificada: **0 valores fuera de la escala** (`off-scale`) y **0 px literales de caja** (`page-literal`: espaciado y tamaÃ±os).

**Regla de alineaciÃ³n:** los catÃ¡logos (portada, gramÃ¡tica, perfil, mi aprendizaje, actividades) van alineados arriba con --page-pad-block; solo las pantallas de foco (una tarjeta: prueba de nivel, onboarding, estados vacÃ­os) se centran verticalmente.

**Ancho de secciÃ³n:** toda secciÃ³n ocupa --content-max (1.200; **1.440 a â‰¥1920 y 1.600 a â‰¥2560**); lo estrecho se resuelve con la rejilla interna. La superficie de ejercicio se acota a --content-narrow (720) en ultrapanorÃ¡mica para que un campo de texto no se estire a 800 px., nunca encogiendo la tarjeta. Medidas auxiliares: --content-narrow (720) para contenido de lectura y --card-min (220) para rejillas de tarjetas.

**Espaciado por rol (uniforme, no idÃ©ntico):**

| Rol | Token | Uso |
|---|---|---|
| PÃ¡gina | --page-pad-block | padding-block de todas las pantallas (32/64); mÃ³vil --page-pad-block-mobile (20/48) |
| SecciÃ³n | --space-6 | separaciÃ³n entre secciones apiladas (24) |
| Tarjeta de secciÃ³n | --space-6 | padding uniforme de .section-block |
| TÃ­tulo de secciÃ³n | --space-5 + --space-3 | margen inferior + padding inferior |
| Lista | --space-2 / --space-3 | listas densas / estÃ¡ndar |
| Control | --space-2 / --space-3 | botÃ³n/input pequeÃ±o / estÃ¡ndar |
| Texto | --space-1â€¦--space-3 | tÃ­tulo â†’ cuerpo, pÃ¡rrafo â†’ bloque |

Los negativos se escriben calc(-1 * var(--space-N)), nunca -var(...).

**Ritmo de pÃ¡gina (uniforme, no idÃ©ntico):** todas las pantallas usan `padding-block: var(--page-pad-block)` = `--space-8 --space-16` (32/64); las pantallas de ejercicio (**también Quiz y Vocabulario**) usan **32/32** mientras el ejercicio está abierto, porque su superficie se centra verticalmente y un 64 abajo la dejaba 16 px sobre el centro (y 16/16 con ventanas de 860 px o menos); el índice de temas de esas mismas páginas conserva **32/64** y, en mÃ³vil, `--page-pad-block-mobile` = `--space-5 --space-12` (20/48). Las separaciones entre secciones usan `--space-6` (24); las medidas de layout (`--measure-*`), alturas de control (`--control-h*`) y geometrÃ­a (`--size-*`, `--grid-min-*`, `--dialog-w`, `--panel-w*`) son tokens con rol, no nÃºmeros sueltos.

### Radios

Escala de 3 Â· 4 Â· 8 Â· 10 Â· 12 Â· 16 Â· 24 Â· pill, asignada por rol:

| Token | px | Rol |
|---|---|---|
| `--radius-2xs` | 3 | **marca de dato**: banderas, barras de actividad, conectores, marcas de palabra |
| `--radius-xs` | 4 | marcas y detalles, esqueletos de carga |
| `--radius-sm` | 8 | controles pequeÃ±os |
| `--radius-md` | 10 | **control**: inputs, botones, opciones, icon-btn |
| `--radius-lg` | 12 | **fila**: chips, listas, tarjetas pequeÃ±as |
| `--radius-xl` | 16 | **tarjeta**: cards y superficies |
| `--radius-2xl` | 24 | **panel**: modales y contenedores grandes |
| `--radius-full` | 9999 | **pill**: solo insignias, contadores, nav y barras |

`50%` queda reservado a cÃ­rculos geomÃ©tricos (avatares, dots, botones redondos). Cualquier otro valor
en px es una violaciÃ³n: lo bloquea `check-ui-system` (`radius-role`).

Regla de anidado: el radio interior = radio exterior âˆ’ padding entre ellos, nunca menos de 4. Nada es pill por defecto: un botÃ³n es un control (10), no una pÃ­ldora.

### Anillo de foco

Un Ãºnico anillo en todo el producto: `outline: 3px solid var(--color-focus)` + `outline-offset: 2px`.
El token es `--color-focus` (no `--color-action`, aunque hoy compartan valor) y el offset no varÃ­a por
componente. `outline: none` solo se admite en el reset y en elementos con foco gestionado por script.
Gate: `focus-ring`.

**Cobertura actual:** 180 componentes canÃ³nicos en `components.css`. El gate `check-components` estÃ¡ en cero: 0 overrides desde CSS de pÃ¡gina, 0 reglas base duplicadas, 0 interactivos sin estados, 0 clases sin regla (7 hooks documentados en `tools/components-allow.json`), 0 `!important` fuera de utilidades/reduced-motion y **0 `<button>` sin clase de control** (un botÃ³n sin `.btn`/`.icon-btn`/`.choice`â€¦ hereda el botÃ³n nativo del navegador: borde 2 px negro `outset`, Arial, sin radio). CatÃ¡logo generado en `docs/UI-CATALOG.md` (`node tools/catalog.mjs`).

**Capas CSS** (`tokens.css`, primera regla): `@layer reset, tokens, page, components, utilities;`

- `reset` va **antes** que `page`: el reset universal (`* { margin:0; padding:0 }`) debe perder frente a las pÃ¡ginas, o borra sus mÃ¡rgenes.
- `page` pierde frente a `components`: una pÃ¡gina ya no puede reescribir un componente; si necesita variante, declara `block--variant` (en `components`) o una custom property.
- `utilities` es la Ãºnica capa que puede usar `!important`.

---

## 6. Color

> Fuente de verdad: `tokens/*.tokens.json` (DTCG 2025.10). `shared/css/tokens.css` es
> **generado** con `node tools/build-tokens.mjs`; no se edita a mano. Ver `docs/TOKENS.md`.

Cinco capas en `tokens.css`:

```
Primitivos   --blue-600, --amber-500, --gray-150 â€¦     (valores crudos)
SemÃ¡nticos   --color-bg, --color-text, --color-actionâ€¦  (lo Ãºnico usable)
Roles        --text-*, --radius-*, --space-*            (escalas por rol)
CategorÃ­a    --color-category-path / -grammar           (identidad del producto)
Runtime      --activity-clr, --topic-clrâ€¦               (los escribe JS/datos)
```

| Token | Uso |
|---|---|
| `--color-bg` / `--color-surface` / `--color-surface-alt` | fondos y superficies |
| `--color-border` / `--color-border-strong` | hairlines |
| `--color-text` / `--color-text-muted` | dos roles de texto, no diez (el antiguo `text-subtle` no pasaba AA y se retirÃ³) |
| `--color-action` / `--color-action-hover` / `--color-action-subtle` | **el Ãºnico acento del chrome** |
| `--color-accent` / `--color-accent-strong` / `--color-accent-subtle` | reservado a la racha |
| `--color-success` / `--color-danger` (+ `-subtle`) | solo significado |
| `--color-category-path` / `--color-category-grammar` | solo dentro de la Ruta y de GramÃ¡tica |
| `--color-focus` | anillo de foco |

**Sistema de color completo:** docs/UI-COLOR.md (paleta, semÃ¡nticos, alfa con color-mix, color de dato y 	heme-color).

**Acentos de actividad (una sola fuente: `[data-activity]` en `components.css`).** Se usan en la matriz, en las tarjetas de actividad de la portada y en el chrome de cada actividad.

| Actividad | Token | Valor |
|---|---|---|
| Pronunciacion | `--cyan-700` | `#0E7490` |
| Dictado | `--gray-600` | `#5E6B7A` |
| Vocabulario | `--amber-800` | `#92400E` |
| Cloze | `--amber-600` | `#D97706` |
| Traduccion | `--green-700` | `#16A34A` |
| Secuencia | `--pink-500` | `#EC4899` |
| Quiz | `--red-600` | `#DC2626` |
| Gramatica | `--color-category-grammar` | `#7C3AED` |

**Regla de un acento.** El chrome (nav, botones, enlaces, foco) usa un solo acento: azul `--color-action`. El Ã¡mbar queda para la racha y el oro para la Ruta; los colores de actividad y de tema viven en su propio dato y no salen de ahÃ­. Si un componente nuevo necesita color, se pregunta primero si puede ser neutro.

**El oro del camino se oscureciÃ³ en 2026-10-31.** El valor anterior #C9920A daba 2.76:1 con texto blanco; ahora es #8A6107 (5.54:1 con blanco, 4.98:1 sobre el fondo de pÃ¡gina) y el hover #6E4D06 (7.70:1). Afecta a nodos, conectores y CTA del camino, que comparten --color-category-path.

**El Ã¡mbar no llega a 4.5:1 sobre blanco.** Para texto sobre claro usar `--color-accent-strong` (#B45309), no `--color-accent`. Es la causa del CTA a 2.76:1 detectado en la auditorÃ­a.

---

## 7. Componentes (20)

**Estado: las clases canÃ³nicas estÃ¡n implementadas en `components.css` y las 12 pÃ¡ginas
las usan.** La adopciÃ³n se completÃ³ en P1â€“P7 ([`UI-IMPLEMENTATION.md`](UI-IMPLEMENTATION.md));
lo que queda son deudas registradas en [`UI-DEBT.md`](UI-DEBT.md).

| Componente | Clase canÃ³nica | Sustituye a |
|---|---|---|
| Contenedor | `.container` | `max-width` + padding repetidos en cada pÃ¡gina |
| Cabecera | `.page-header` `__title` `__sub` | 33 selectores de heading |
| NavegaciÃ³n | `.nav-item` + `--active` + `--active-path` + `data-nav` | `.mode-btn` (110 elementos) y `.mode-home` |
| BotÃ³n | `.btn` + `--primary/--secondary/--ghost/--check/--path/--back/--block/--danger` + `--sm/--lg` | `.next-btn`, `.check-btn`, `.resume-btn`, `.ptest-btn`, `.back-btn`, `.ob-primary-btn`, `.ob-ghost-btn` |
| BotÃ³n-icono | `.icon-btn` | `.path-scroll-btn`, `.ob-close` |
| Aviso en lÃ­nea | `.banner` + `--error` | banner de error de `app-ui.js` (estilos inline) |
| Pantalla terminal | `.path-session-complete` `__icon` `__title` `__sub` | sesiÃ³n completada en `app-ui.js` y `grammar.js` |
| Tarjeta | `.card` + `--flush/--raised/--interactive/--accent/--alt/--feature` | `.feature-card`, `.img-topic-card`, `.stat-card` |
| Etiqueta | `.pill` + `--accent/--success` | `__new-badge`, group badges |
| Insignia CEFR | `.cefr-badge` + `--a1â€¦--c2` | `.cefr-A1â€¦C2` de grammar (paleta propia duplicada) |
| Campo | `.field` `__label` `__input` `__error` `--error` | 16 selectores de input |
| **OpciÃ³n de respuesta** | `.option` + `--correct/--wrong/--chosen` | `.choice-btn` (quiz), `.option-btn` (grammar, placement) â€” tres nombres y tres vocabularios de estado hasta P5 |
| Lista de opciones | `.choice-list` + `.choice` + `--row/--selected` | `#topic-picker`, `.topic-grid`, `.option-btn`, `.lp-picker-card`, `.lp-card` |
| Feedback | `.feedback-result` (ya compartido) | 5 archivos |
| Barra de progreso | `.progress-bar` + `__fill` | 4 implementaciones |
| Nodo de camino | `.path-node` (ya compartido) | `index`, `my-learning` |
| Dialog | `.dialog` + `.dialog-overlay` | `.ob-modal`, `.lp-picker` |
| Toast | `.toast` + `.toast--panel` + `.toast-stack` | `.milestone-toast`, aviso de copia, paneles de descarga y de respaldo |
| Tabla | `.table` | `.ex-grid-*` de `progress` (aceptado: uso Ãºnico, A-04) |
| Estado vacÃ­o | `.empty-state` (ya compartido) | â€” |

Los botones de sesiÃ³n (avanzar / reintentar) no llevan clase propia: son `.btn` dentro
de `.action-row`, y su layout y hover vienen de ahÃ­.

La styleguide renderiza los componentes principales con sus variantes reales. La matriz
completa de estados â€” default Â· hover Â· `:focus-visible` Â· active Â· disabled Â· loading Â·
error Â· success â€” se define aquÃ­ y se comprueba en las pÃ¡ginas reales, no en la styleguide.

`.path-node` y `.empty-state` son **componentes de pÃ¡gina**: viven en `index/css/index.css` y
`grammar/css/grammar.css` porque tienen **un solo consumidor** cada uno (ver
`UI-IMPLEMENTATION.md` P7). Si aparece un segundo, se mueven a `components.css`.

### Ruta de aprendizaje paginada

`index.html` monta la ruta en **una sola fila compacta** que ocupa el ancho de la tarjeta:
5 pasos en escritorio, 4 a 900 px o menos, 3 a 640 px o menos y 2 a 400 px o menos. El
tamaño de página vive en `--path-window` (`.path-card__trail`), que es la única fuente: la
rejilla lo usa como número de columnas y JS lo lee con `getComputedStyle`, sin repetir el
breakpoint.

- Sin onda vertical: todos los círculos comparten la misma línea y los conectores forman
  un riel horizontal, así la ruta se lee de un vistazo y no alarga la página.
- Las flechas (`.path-scroll-btn`) viven en `.path-pager`, junto al indicador, no encima
  del carril: no roban ancho a los pasos. Cambian de página, no hacen scroll; su nombre
  accesible es "Actividades anteriores/siguientes".
- `.path-pager` muestra "Pasos 1-5 de 12" en una región `role="status"` y solo aparece
  cuando hay más de una página. No lleva botón de salto: las flechas ya paginan.
- Los conectores SVG se redibujan con un único `ResizeObserver` por render (se libera al
  reconstruir la ruta) y usan la caja renderizada, no `scrollWidth`, para que el viewBox
  no se reescale y las líneas toquen siempre el borde del círculo.
- **Cada paso muestra su píldora de tema y su chip de estado** (`Nuevo`, `Repasar` o `Hecho`),
  siempre, igual que en Mi Aprendizaje. Cada nodo reserva 32 px arriba para la píldora, así los
  círculos quedan alineados; el anillo del paso activo (3 px, 5 px al pasar el cursor) no la
  toca. La píldora lleva el nombre completo en `title` (a 320-390 el más largo puede elidirse).
- El chip de estado va bajo la etiqueta de la actividad en todos los pasos; `Hecho` usa el
  verde de éxito. `check-layout` exige una píldora y un chip por nodo.
- El aire sobre la píldora es igual al aire entre el último chip y la fila del paginador
  (16 px); `check-layout` mide ambos y el anclaje de los conectores.

### Mi Aprendizaje: ruta en rejilla serpentina

La pestaña Mi Aprendizaje muestra **la sesión completa** en una rejilla que ocupa todo el ancho
de la sección (sin el antiguo tope de `--content-narrow`). El número de columnas lo calcula JS a
partir del ancho disponible, con una celda mínima de 170 px (140 px por debajo de 380 px, donde
la píldora se ajusta a la celda): 5 columnas a 1440, 4 a 768, 3 a 640, 2 en móvil y 1 solo si no
cabe otra. Diez pasos quedan en dos filas a 1440 (299 px) y cinco a 390 (784 px).

- **Cada paso muestra su píldora de tema y su chip de estado** (`Nuevo`, `Repasar` o `Hecho`).
  Ya no se ocultan las repeticiones: las diez tarjetas dicen su tema y su estado. El hueco entre
  filas es de **40 px** (`--space-10`) para que el chip de una fila y la píldora de la siguiente
  no se lean como un bloque; entre columnas, 8 px.
- Las filas van en boustrophedon (una a la derecha, la siguiente a la izquierda). El conector
  dentro de la fila es una recta a la altura del centro de la burbuja; el cambio de fila es un
  **giro en el borde exterior**, con el carril a 14 px del contenido más ancho de los dos pasos
  (píldora, etiqueta o chip) y esquinas redondeadas. Así ningún trazo cruza una cápsula.
- La rejilla la pinta CSS (`--cols`); JS calcula las columnas, coloca `(fila, columna)` y lee las
  burbujas renderizadas para dibujar. Al cambiar de ancho se vuelve a montar la ruta (debounce
  150 ms) para recolocar las columnas; dentro del mismo número de columnas el `ResizeObserver`
  solo redibuja los conectores.
- El SVG de los conectores tiene `overflow: visible`: el carril del giro puede entrar en el
  margen de la página, fuera de la píldora más larga.
- A ≤400 px la píldora de tema se ajusta a la celda (`max-width: 100%` con elipsis) y el nombre
  completo queda en `title`; a 390 cabe completa y solo los nombres más largos se recortan a 320.
- `check-layout` verifica que la ruta ocupe ≥98 % del ancho, que haya ≥3 columnas a 1440, que
  **cada paso tenga píldora de tema y chip de estado**, la altura ≤ 900 px, 0 solapes y que
  ningún trazo (recta o `path`) cruce una cápsula, etiqueta o chip.

### Índice de frases y palabras (`pb-*`)

El índice se abre tras elegir un tema. El chip es el mismo para frases y palabras; el contrato
que fija `tools/check-phrase-index.mjs`:

- **Texto principal**: `min-width: min(120px, 40%)`, **una línea con `line-clamp` en la rejilla de varias columnas** (una frase larga hacia su fila más alta que la vecina) y dos líneas en la columna única móvil. En frases es
  la **fuente** (el `lang` es `sourceCode()`); en palabras, el término (**target**). Nunca cede
  su sitio al chip de variantes ni a los badges.
- **Chip secundario**: solo lo llevan las palabras, con la categoría gramatical (texto de UI, sin
  `lang`). **Las frases no muestran las variantes en el índice**: quedan en el `title` y el
  `aria-label` del chip y en el ejercicio. Una línea
  con elipsis y `max-width: 45%`; el dato completo va en `title` y en el `aria-label` del chip,
  que el sub sigue `aria-hidden`. **A ≤400 px no se pinta** (`display: none`): con 288 px de chip
  la categoría quedaría en 45 px («Ve…»).
- **Pips de cobertura y badge CEFR**: siempre dentro del chip. El slot de pips es un mínimo
  (32 px) y crece si una frase tiene más formas con audio.
- **Sin control de variantes**: el modo es siempre «todas las variantes»; el ejercicio rota
  por todas las formas declaradas (la menos practicada primero). No hay selector en la barra,
  así que la barra queda en una fila (~80 px) en escritorio y el índice no ofrece un control que
  no cambie nada visible.
- **Hover**: los cuatro bordes con `--color-action`. El chip visto conserva su acento de 3 px
  en el inicio, pero del mismo color al hacer hover (antes quedaba gris/verde y el resto azul).
- **Foco del título**: programático (anuncia la pantalla), sin anillo de control.

### Tarjetas de actividad a altura igual

Las tarjetas no se miden por JS. El copy de las 8 tarjetas está normalizado a una
longitud similar, así que cada rejilla de grupo (`.activity-grid`, `auto-fill` sobre
`--measure-xs`, `gap` de 16 px) deja todas las tarjetas a la misma altura por
`align-items: stretch`. `check-layout` lo verifica en 1440 y 390 px: si una edición de
copy rompe la igualdad, el gate falla y se ajusta el texto, en lugar de esconder la
diferencia con alturas inline.

### Barra de navegación

Una sola fila siempre, sin wrap: si las etiquetas no caben, JS pone
`mode-switcher--compact` (iconos, nombre accesible intacto) y, si aun así no cabe,
`mode-switcher--tight` (sin etiqueta activa). El alto es el mismo en todos los anchos:
6 px de padding de la barra arriba y abajo y 40 px por destino, total 53 px. Texto de
12 px (`--text-label`) e iconos de 16 px con etiquetas y 18 px en modo icono. La píldora
activa se pinta con `::before` a 4 px del borde del destino: mide 32 px de alto sin
reducir el área clicable de 40 px. El modo compacto conserva el mismo padding horizontal
(12 px) y el mismo gap (4 px) que el normal; solo pierde las etiquetas. `check-layout`
verifica fila única, alto mínimo, 40 px por destino, texto ≤12,5 px, píldora ≤36 px y
ausencia de recorte de 320 a 1966 px.

**Resumen de Ejercicios (desktop):** la fila de cabeceras se fija arriba y la columna de temas a la izquierda. La esquina vacía forma parte de ese pin: va sticky a la izquierda, con superficie opaca y `z-index` por encima de las cabeceras, de modo que al desplazar en horizontal las cabeceras desaparecen por la izquierda bajo la esquina y cada cabecera sigue centrada sobre su columna. Sin la esquina fija las cabeceras flotan sobre el nombre del tema y se desalinean.

**Todas las cápsulas miden lo mismo a la vista: 32 px.** La píldora activa de la barra, la
etiqueta de idioma de la tarjeta de ejercicio y la cápsula del par en el header pintan su
fondo en `::before` con `inset` vertical de 4 px dentro de un objetivo de 44 (header) o 40
(pestañas). Nunca se agranda la cápsula para hacer más grande el control: el control crece,
la cápsula no. `check-layout` compara las tres alturas.

### Estados obligatorios

Todo control interactivo necesita: default, hover, `:focus-visible` (anillo de 3:1 o mejor, **nunca transicionado**), active, disabled, loading, error, success.

Dos reglas que vienen de casos reales de este proyecto:
- **El foco no puede entrar con fade.** Si se transiciona `box-shadow` y el anillo se dibuja con `box-shadow`, el foco parpadea.
- **Nada tapa el foco.** Un toast o un footer fijo que cubre el control enfocado incumple WCAG 2.2 SC 2.4.11.

---

> Deudas y pendientes abiertos: [UI-DEBT.md](UI-DEBT.md).

## 8. CÃ³mo verificar

```bash
node tools/verify-ui.mjs           # runtime: 12 pÃ¡ginas, 375px, zoom 200%, WCAG 1.4.12,
                                   # recortes, iconos sin resolver, emoji renderizado
node tools/check-ui-system.mjs     # gate estÃ¡tico: tokens, emoji en HTML, escala, componentes
node tools/audit.mjs               # gates de contenido
node tools/check-a11y.mjs          # accesibilidad
node tests/smoke.mjs               # suite funcional (50 comprobaciones)
node tools/bump-assets.mjs         # rehash de ?v= â€” OBLIGATORIO tras tocar CSS
```

`verify-ui.mjs` acepta `--shots <dir>` para guardar capturas y `--baseline <dir>` para
compararlas. Es la orden que cierra una fase: si imprime `pÃ¡ginas con incidencia: 0/12`,
la UI estÃ¡ cubierta en runtime.

Sin `bump-assets` el navegador sirve el CSS viejo desde cachÃ© y cualquier verificaciÃ³n miente.

---

## 9. Estado de la migraciÃ³n

| Fase | Estado |
|---|---|
| F0 Â· LÃ­nea base de capturas | Hecho â€” 24 capturas (1440 / 375) |
| F1 Â· `tokens.css` + enlace en 12 pÃ¡ginas | Hecho â€” diff visual 0 |
| F2 Â· Partir `generalities.css` | Hecho â€” 298 reglas idÃ©nticas, 44/44 tokens, 0 regresiones |
| F3 Â· Consolidar duplicados | Hecho (A) â€” 61 reglas, 22 grupos idÃ©nticos, 0 regresiones. Quedan 28 selectores divergentes |
| F4 Â· Sprite SVG | Hecho â€” 43 iconos, 0 emoji en el marcado |
| F5 Â· Aplicar escala tipogrÃ¡fica y de espacio | Hecho â€” 10 tamaÃ±os y 4 pesos; 0 medidas fuera de la rejilla de 4pt |
| F6 Â· `styleguide.html` + gate en CI | Hecho |

---

## 11. La puerta (F6)

Gate local: `node tools/check-layout.mjs` (secciones al mismo ancho, sin scroll horizontal, grafico de actividad de 60 barras, ruta â‰¤900 px sin solapes, catÃ¡logos a la misma altura). Requiere Playwright, por eso no corre en CI.

**Contenedores (superficies):**

| Rol | Componentes | Borde | Sombra | Radio |
|---|---|---|---|---|
| Superficie base | `.card`, `.stat-card`, `.question-card`, `.img-topic-card`, `.path-card`, `.ml-session-card` | 1 px `--color-border` | `--shadow-xs` | `--radius-xl` |
| Tarjeta focal | `.phrase-card`, `.placement-card`, `.flashcard-face` | 1 px | `--shadow-sm` | `--radius-xl` |
| Tarjeta pequeÃ±a | `.milestone-badge` | 1 px | ninguna | `--radius-lg` |
| SecciÃ³n elevada | `.section-block`, `.result-card` | 1 px | `--shadow-md` | `--radius-xl` |
| Overlay | `.toast` / `.dialog` | 1 px | `--shadow-lg` / `--shadow-xl` | `xl` / `2xl` |
| Insignia | `.pill`, `.cefr-badge`, `*-badge` | 1 px o ninguno | ninguna | `full` |

**Escala de borde, tres roles (sin excepciones):**

| Grosor | Rol | DÃ³nde |
|---|---|---|
| **1 px** | estructura | superficies, overlays, separadores, insignias, filas de tabla, acento de dato en tarjeta con imagen |
| **2 px** | control | botones, inputs, opciones, chips, toggles, subrayados, zona de drop |
| **3 px** | Ã©nfasis | franjas de estado (feedback, prompts, tÃ­tulos, stats), anillo de nodo, foco |

No hay 1.5 px ni 4 px: cualquier borde nuevo debe caer en uno de los tres roles.
Gate: `border-width` (solo 0/1/2/3 px o `none`).

**Color de borde:** siempre token (`--color-border`, `--color-border-strong`, `--color-action`,
`--color-success`, `--color-danger`, `--color-focus`) o `transparent`. Nunca un literal; lo cubre el gate de color.

**Variantes (no excepciones):** la insignia de logro usa el mismo borde de 1 px y comunica el estado con icono y color; el feedback usa borde de 1 px por los cuatro lados; los nodos de ruta llevan anillo de 3 px.

**Primer contacto:** el selector de par usa el idioma del navegador y un overlay opaco, para que no se vea la pÃ¡gina en otro idioma detrÃ¡s.

**Resumen del perfil:** panel acotado (720 px) con cabecera y tema fijos y scroll interno en escritorio; tarjeta por tema en mÃ³vil (â‰¤640). Sin filtros: siempre se muestran todas las filas/temas, el dato completo.

**Controles (inputs y botones):**

| Control | Base | Radio | Borde | Estados |
|---|---|---|---|---|
| BotÃ³n | .btn + variantes | 10 | 2 px | hover/active/focus/disabled |
| BotÃ³n icono | .icon-btn (--overlay en modales) | 10 (overlay 50 %) | 2 px | hover/active/focus/disabled |
| Campo | .field__input (--alt, --inline) | 10 | 2 px | focus/disabled |
| OpciÃ³n | .option | 10 | 2 px | hover/focus/disabled |
| ElecciÃ³n | .choice (--row) | 10 | 2 px | hover/focus/disabled |
| Ficha de palabra | .word-tile | 10 | 2 px | hover/active/focus/disabled |
| Segmentado | .segmented__item | full | 2 px | active/focus |
| Chip | .chip | full | 2 px | selected/focus |

Los botones de pÃ¡gina usan .btn (clases extra solo como hook); ningÃºn control se estiliza desde cero.

**Una sola polÃ­tica de hover:** solo los contenedores interactivos cambian (`border-color: --color-action` + un paso de sombra: `--shadow-sm`); `:active` baja a `scale(0.98)`; foco con anillo de 3 px. Las secciones no interactivas **no** se elevan al pasar el ratÃ³n. Toda regla `:hover` vive dentro de `@media (hover: hover) and (pointer: fine)`: en tÃ¡ctil el hover se queda pegado tras el toque y la regla `hover-guard` lo impide.

**Un solo ritmo de entrada (Motion v1):** las entradas de bloque usan `fadeIn`/`fadeInScale`/`revealUp`
durante `--duration-base` (200 ms) con `--transition-emphasis` y `both`, **una por bloque y sin
retardos en cascada**; el giro de la tarjeta de vocabulario es `--duration-slow` (300 ms); los
overlays (modal de par y de onboarding) conservan su entrada corta propia; `skShimmer` es un bucle de
carga. `prefers-reduced-motion` apaga todas las entradas.

`tools/check-ui-system.mjs` corre en `ci.yml` despuÃ©s de los gates de contenido. Veinticinco
reglas, de dos tipos:

| Regla | Tipo | Hoy |
|---|---|---|
| `emoji-markup` â€” emoji en HTML | **dura** | 0 |
| `off-scale` â€” spacing/font-size fuera de escala | **dura** | 0 |
| `css-stamp` â€” CSS sin sello de cabecera | **dura** | 0 |
| `page-literal` â€” px literales de caja en CSS de pÃ¡gina | **dura** | 0 |
| `icon-dup` â€” dos sÃ­mbolos del sprite con el mismo trazo | **dura** | 0 |
| `icon-unused` â€” sÃ­mbolo declarado y no referenciado | **dura** | 0 |
| `icon-broken` â€” `#i-x` sin sÃ­mbolo en el sprite | **dura** | 0 |
| `icon-inline` â€” SVG de icono fuera del sprite (los datos estÃ¡n exentos) | **dura** | 0 |
| `border-width` â€” grosor de borde/foco fuera de 1/2/3 px | **dura** | 0 |
| `radius-role` â€” radio fuera de la escala de rol (o 50 %) | **dura** | 0 |
| `focus-ring` â€” `outline` que no es 3px `--color-focus` a 2px | **dura** | 0 |
| `token-dead` â€” token declarado en `tokens.css` y nunca consumido | **dura** | 0 |
| `token-ref` â€” `var(--x)` sin fallback que apunta a un token inexistente | **dura** | 0 |
| `cefr-contrast` â€” contraste AA de los badges CEFR | **dura** | 0 |
| `hover-guard` â€” `:hover` fuera de `@media (hover: hover) and (pointer: fine)` | **dura** | 0 |
| `palette-outside` â€” paleta usada fuera de `tokens.css` (salvo mapas de datos y badges por nivel) | **dura** | 0 |
| `motion-literal` â€” duraciÃ³n de transiciÃ³n/animaciÃ³n fuera de `--duration-*` | **dura** | 0 |
| `breakpoint-scale` â€” media query fuera de `tokens/breakpoints.tokens.json` | **dura** | 0 |
| `raw-box` - px/rem de caja fuera de tokens (em y â‰¤3 px exentos) | **dura** | 0 |
| `raw-opacity` - opacidad fuera de `--opacity-*` (0/1 exentos) | **dura** | 0 |
| `raw-font-weight` - `font-weight` fuera de `--weight-*` / `--text-*-weight` | **dura** | 0 |
| `raw-shadow` - `box-shadow` o degradado fuera de `--shadow-*` / `--gradient-*` | **dura** | 0 |
| `raw-z` - z-index global fuera de `--z-*` (0-2 local exento) | **dura** | 0 |
| `color-literal` â€” hex/rgb/hsl fuera de `tokens.css`, incluidos los `<style>` inline del HTML | ratchet | 0 |
| `component-outside` â€” clases `.btn/.card/.badgeâ€¦` fuera de `components.css` | ratchet | 0 |

Las **duras** deben estar a cero siempre. Las de **ratchet** arrastran deuda conocida y
fallan solo si el nÃºmero sube respecto a `tools/ui-system-baseline.json`. Regenerar el
baseline es un acto deliberado: `node tools/check-ui-system.mjs --write-baseline`.

Ese baseline es la deuda declarada. Convertirla en cero es trabajo aparte; lo que la
puerta impide es que crezca sin que nadie lo note.

**Sellos:** los 15 CSS llevan en su primera lÃ­nea
`/* Idiomap Â· <ruta> Â· 2026-10-31 Â· sistema: docs/UI-SYSTEM.md */`.

**Referencia viva:** `docs/styleguide.html` renderiza color, tipografÃ­a, espaciado,
iconos y componentes leyendo los tokens reales. No se publica (`docs/` estÃ¡ fuera del
Ã­ndice de git); se abre en local y sirve para comparar antes de tocar algo.

---

## 10. Backlog de F3 (histÃ³rico) â€” cerrado en Â§10 bis

Quedaron **28 selectores** repetidos con cuerpos distintos. No se podÃ­an borrar: cada copia diferÃ­a y consolidarlos exigÃ­a **elegir un valor canÃ³nico**, lo que cambia pÃ­xeles en al menos una pÃ¡gina. Se resolvieron en F3-B (Â§10 bis): 16 fusionados con valor canÃ³nico y 12 declarados divergencia intencionada.

| Familia | Selectores | DÃ³nde | Divergencia principal |
|---|---|---|---|
| **Topic picker** (9) | `#exercise-area`, `.topic-grid`, `.topic-btn`, `.topic-btn:hover`, `.grammar-chip-wrap`, `@media .topic-grid`, `.topic-picker-header` + `h1` + `p` | cloze, dictation, scramble, speaking, translation, vocabulary, components | dictation usa `minmax(160px,1fr)` y grid mÃ³vil de 2 columnas; el resto 150px y 3 columnas. dictation/speaking aÃ±aden `gap: 0` en `#exercise-area` |
| **Cards de ejercicio** (7) | `.phrase-card`, `@media .phrase-card`, `.listen-btn`, `.check-btn`, `.check-btn:hover`, `#exercise-area .action-row`, `.post-feedback-row` | cloze, speaking, translation, scramble, vocabulary | speaking usa `padding: 28px 20px` en mÃ³vil (24px 18px el resto); scramble tiene `.check-btn` con `height: 50px` y `0.88rem` |
| **Grammar Â· related** (6) | `.related-phrases`, `.related-heading`, `.related-phrase-item`, `.related-phrase-text`, `.related-practice-btn` (+`:hover`) | grammar, components | grammar redefine el bloque entero con otros espaciados |
| **Opciones** (2) | `.option-btn`, `.option-btn:hover:not(:disabled)` | grammar, placement | grammar es mÃ¡s ancho y con `border: 2px`; placement es mÃ¡s compacto (`12px 10px`, `0.82rem`) |
| **Badges y labels** (2) | `.cefr-badge`, `.stat-label` | grammar, index, progress, components | `.cefr-badge` tiene **tres** definiciones distintas (0.72/0.62/0.65 rem, pesos 800/700) |
| **Misc** (2) | `.hint-card`, `.word-variants` | scramble, vocabulary, components | ajustes locales de padding |

**Criterio sugerido para F3-B:** empezar por `.cefr-badge`, que hoy tiene tres definiciones y es el caso mÃ¡s claro de deriva; seguir por la familia *Topic picker* (9 selectores, 5 pÃ¡ginas) y dejar `.related-*` y `.option-btn` para el final, porque son los que mÃ¡s difieren.

Ninguna de estas consolidaciones es "cero cambio visual": requieren una decisiÃ³n de diseÃ±o por familia y capturas antes/despuÃ©s.

---

## 10 bis. ResoluciÃ³n aplicada (F3-B, 2026-10-31)

**108 reglas eliminadas.** Criterio de canÃ³nica: **la variante mayoritaria**, y **ningÃºn texto se hace mÃ¡s pequeÃ±o** durante una fase de consolidaciÃ³n.

### Fusionadas (16 selectores)

| Selector | CanÃ³nica | Cambio medido |
|---|---|---|
| `#exercise-area` | con `gap: 0` | ninguno (equivale a sin gap) |
| `.topic-grid` | 150px + `fadeIn` | ninguno en dictation: **esas clases eran cÃ³digo muerto allÃ­** (usa `.img-topic-grid`) |
| `.topic-btn`, `.topic-btn:hover` | components | Ã­dem, cÃ³digo muerto en dictation |
| `@media .topic-grid` | 3 columnas | Ã­dem |
| `.phrase-card` | cloze | translation: `margin-bottom` 20â†’16; speaking: `padding-top` 36â†’32 |
| `@media .phrase-card` | 24px 18px | speaking |
| `.check-btn` | cloze | scramble: `font-size` 14.08â†’14.4px |
| `.check-btn:hover` | 1.1 / 1.03 | scramble |
| `#exercise-area .action-row` | sin `margin-top` | speaking y translation: 16pxâ†’0 |
| `.topic-picker-header` | components | speaking: 32â†’24px |
| `.topic-picker-header h1` | components | speaking: 38.4â†’35.2px |
| `.topic-picker-header p` | 400px | speaking |
| `.post-feedback-row` | `margin: 0` | ninguno (equivalente) |
| `.stat-label` | index | progress: 11.2â†’11.52px |
| `.cefr-badge` | grammar (la mayor) | grammar conserva tamaÃ±o, pierde `uppercase`; el resto crece |

**Total: 15 propiedades medidas.** Nada cambia de tamaÃ±o a la baja salvo el H1 de speaking (âˆ’3.2px), que converge al valor compartido.

### Declaradas como divergencia intencionada (12)

No son duplicados: son componentes distintos que comparten nombre. Se dejan y se documentan aquÃ­.

| Selector | Por quÃ© no se fusiona |
|---|---|
| `.listen-btn` | el cuerpo es idÃ©ntico; solo cambia el `margin-bottom` segÃºn el contexto de cada pÃ¡gina |
| `.option-btn` (+`:hover`) | grammar lo usa como fila con icono (16px de padding, `translateX`); placement como opciÃ³n centrada y compacta |
| `.related-phrases`, `.related-heading`, `.related-phrase-item`, `.related-phrase-text`, `.related-practice-btn` (+`:hover`) | grammar los pinta como tarjetas apiladas; las actividades, como filas inline con `space-between` |
| `.word-variants` | components define fila centrada; vocabulary necesita columna alineada a la izquierda |
| `.grammar-chip-wrap` | components aporta la base (`display:flex; justify-content:center`); cada actividad aÃ±ade sus mÃ¡rgenes. Es base + modifier |
| `.hint-card` | components solo aÃ±ade `flex-wrap: wrap` a una tarjeta definida en scramble |

**Nota de verificaciÃ³n:** las 108 reglas se aplicaron dos veces. El primer intento corrompiÃ³ 6 archivos porque el parser eliminaba los comentarios antes de numerar lÃ­neas, desplazando los Ã­ndices. Se restauraron los 10 CSS de pÃ¡gina desde `HEAD` y se reaplicÃ³ con un parser que vacÃ­a los comentarios **conservando la numeraciÃ³n**. El control fue el equilibrio de llaves (15/15) y el snapshot de estilos computados.

---

## 13. Nueva actividad: contrato de UI

Una actividad nueva no debe inventar CSS. El orden obligatorio es:

1. **Contenedor** â€” el `<main>` lleva `class="X-page container"`. No se escribe
   `max-width` ni `padding-inline`: los aporta `.container`.
2. **Cabecera** â€” `.page-header` con `.page-header__title` y `.page-header__sub`.
   El CSS de la pÃ¡gina no define tamaÃ±o de fuente.
3. **Controles** â€” `.btn` (+ `--primary/--secondary/--ghost/--check`, `--sm/--lg`),
   `.icon-btn` con `aria-label`, `.field` + `.field__input` para formularios,
   `.choice-list` + `.choice` para selecciÃ³n de temas u opciones.
4. **Superficies** â€” `.card` para bloques, `.pill` para etiquetas, `.progress-bar`
   para avance, `.table` para datos, `.dialog` / `.toast` para overlays.
5. **Iconos** â€” `<svg class="icon"><use href="#i-â€¦"/></svg>`. Nunca emoji.
6. **Texto** â€” roles `--text-*`. Nunca `font-size` literal.
7. **Espaciado** â€” `--space-*` o mÃºltiplos de 4. Nudges de 1-2px permitidos.

Antes de darla por terminada:

```bash
node tools/verify-ui.mjs   # debe imprimir: pÃ¡ginas con incidencia: 0/12
node tests/smoke.mjs
```

Si un componente no cubre el caso, **se amplÃ­a el componente en `components.css`**;
nunca se crea una clase paralela en la pÃ¡gina. Esa es la regla que evita volver al
punto de partida.
