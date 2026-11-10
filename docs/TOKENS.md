# Tokens de diseño — fuente DTCG 2025.10

> La fuente de verdad es `tokens/*.tokens.json`, en el formato del **Design Tokens
> Format Module 2025.10** del W3C. `shared/css/tokens.css` es **generado**: no se edita a mano.

## Archivos y comandos

| Archivo | Qué contiene |
|---|---|
| `tokens/primitive.tokens.json` | paleta y escalas crudas: color, tipografía, espacio, tamaño, radio, sombra, movimiento, capas, layout |
| `tokens/semantic.tokens.json` | roles: superficies, texto, acción, éxito, peligro, foco, categorías, transiciones |
| `tokens/component.tokens.json` | decisiones por componente; hoy `feedback.*` (avisos de corrección) |
| `tokens/breakpoints.tokens.json` | escala de cortes (9 valores, 6 familias); no se emite al CSS, fija los permitidos |
| `shared/css/tokens.css` | **generado** por `tools/build-tokens.mjs` |

```bash
node tools/build-tokens.mjs          # regenera tokens.css
node tools/build-tokens.mjs --check  # falla si el CSS no coincide con el JSON
node tools/check-tokens.mjs          # nivel semántico + contrato de contraste AA
npm run tokens:build                 # alias
npm run tokens:check                 # alias
```

El `--check` corre en CI antes de los gates de UI. Si alguien edita el CSS generado, el job falla con la primera línea divergente.

## Formato DTCG aplicado

| Tipo | Uso en este repo | Ejemplo de `$value` |
|---|---|---|
| `color` | paleta y semánticos de color plano | `"#DC2626"` |
| `dimension` | espacio, tamaño, radio, icono, medida, tracking | `{ "value": 4, "unit": "px" }` |
| `number` | interlineado, z-index, opacidad | `1.5` |
| `fontWeight` | pesos | `600` |
| `fontFamily` | familias | `"'Raleway', system-ui, …"` |
| `duration` | duraciones | `{ "value": 200, "unit": "ms" }` |
| `cubicBezier` | curvas | `[0.4, 0, 0.2, 1]` |
| `cssValue` | **escape hatch documentado** | `clamp(2.1rem, 4.5vw, 3.5rem)` |

`cssValue` cubre lo que el formato no expresa como tipo estándar: `clamp()`, `calc()`, `color-mix()`, sombras con `color-mix`, `transition` shorthand y composites de `var()`. Hoy son **16 de 200 tokens (8 %)**; el resto usa tipos estándar. Cada uno lleva su motivo en `$description` cuando aplica.

Los alias usan la sintaxis DTCG `{ruta.del.token}`:

```json
"danger": {
  "$value": "{color.primitive.red-600}",
  "$extensions": { "com.idiomap": { "cssVar": "--color-danger" } }
}
```

### Extensiones propias (`$extensions["com.idiomap"]`)

| Clave | Para qué |
|---|---|
| `cssVar` | nombre exacto de la custom property (`--color-danger`). Obligatorio: evita renombrar consumidores |
| `media` | overrides por media query; el generador emite el bloque fuera de la capa |
| `emit: false` | el token documenta una escala que no se emite al CSS (breakpoints) |

```json
"max-w": {
  "$type": "dimension",
  "$value": { "value": 1200, "unit": "px" },
  "$extensions": {
    "com.idiomap": {
      "cssVar": "--max-w",
      "media": [
        { "query": "(min-width: 1920px)", "value": "1440px" },
        { "query": "(min-width: 2560px)", "value": "1600px" }
      ]
    }
  }
}
```

## Niveles

1. **Primitivo** — valores crudos. Solo lo consume el nivel semántico.
2. **Semántico** — roles (`--color-danger`, `--color-surface`). Es lo que consumen componentes y páginas.
3. **Componente** — decisión propia de un componente; **solo** aliasa semánticos (o un `cssValue` que los referencia). Hoy: `--feedback-correct-*`, `--feedback-error-*` y `--feedback-word-*`, compartidos por Dictado, Cloze, Traducción, Secuencia, Quiz y Pronunciación.

Regla de consumo: un componente **nunca** usa un primitivo; un token de componente **nunca** contiene un valor crudo.

## Cómo trabajar

**Cambiar un valor existente** (p. ej. el tono de peligro):

1. Edita el primitivo en `tokens/primitive.tokens.json` (o el semántico, si es un alias).
2. `npm run tokens:build`
3. `npm run tokens:check` y los gates.
4. Capturas: el cambio debe afectar exactamente las superficies esperadas.

**Añadir un token:**

1. Elige familia y nombre (`category.name`), con `$type`.
2. Añade `$value` y `$extensions["com.idiomap"].cssVar` con el nombre de la variable.
3. `npm run tokens:build` lo emite; `check-ui-system` marca tokens declarados y nunca usados.

**Deprecar:** mantén el token con `$description: "deprecado: usar --x"` y un alias al nuevo; se retira en la siguiente major.

## Estado (2026-11-02)

- **251 tokens** únicos: **183 primitivos** (180 + 3 pesos) + **57 semánticos** (38 de color, 2 de movimiento, 7 de sombra, 3 anillos, 7 de gradiente) + **11 de componente** (`feedback.*`).
- **Escala de movimiento** (8 duraciones): instant 100 · fast 150 · base 200 · enter 250 · slow 300 · xslow 400 · draw 600 · shimmer 1300 ms. Ninguna transición lleva ya una duración literal (`motion-literal`).
- **Breakpoints** (9 valores, `breakpoints.tokens.json`): 400 · 480 · 640 (+641) · 768 (+769) · 900 · 1920 · 2560. Un corte nuevo debe declararse ahí (`breakpoint-scale`).
- **Capas** (7 tokens): `--z-sticky-bar 80` · `--z-nav 90` · `--z-header 100` · `--z-overlay 300` · `--z-toast 500` · `--z-network 510` · `--z-skip 9999`. Los `z-index: 0/1/2` locales siguen en crudo (contextos de apilado, no capas globales).
- **Opacidades** (10 pasos, 40–90): `--opacity-40/45/50/55/60/65/70/75/85/90`. Los valores 0 y 1 siguen literales (estados de animación). `raw-opacity` ya es regla **dura** en 0.
- **Cubiertos por tokens y gates duros**: color, caja (>3 px o rem), opacidad, duración, z-index, breakpoints, radios, grosores de borde, iconos y foco.
- **Tipografía**: pesos `--weight-regular/medium/semibold` (los roles `--text-*-weight` ahora los aliasan); gate `raw-font-weight`.
- **Elevación**: sombras de estado `--shadow-ring/flag/hover/hover-lg/heat-glow/hint/hint-hover/path-ring/path-ring-strong/inset` y 7 gradientes; gate `raw-shadow`.
- **Único literal tipográfico pendiente**: 22 `line-height: 1` estructurales (iconos y símbolos de una línea).
- **2 overrides** por media (ultrapanorámica).
- **17 pares de contraste AA** verificados por `check-tokens` (texto, acción, peligro, éxito, aviso, foco).
- CSS generado **idéntico** al anterior en las 202 declaraciones originales (comparación nombre/valor/media: 0 diferencias).
- 0 valores de color fuera de tokens: gate `palette-outside` (paleta solo en mapas de datos y badges por nivel).
- Duplicado eliminado en la importación: `--icon-md` estaba declarado dos veces (20 px y 18 px); gana 18 px, que era el valor efectivo.
- Retirado `--color-text-subtle` (2.97:1, no pasaba AA); su uso (placeholder) pasa a `--color-text-muted` (5.25:1).
- `--color-warning-bg` y `--color-warning` añadidos para que el panel «no entendido» no consuma la paleta.

## Breakpoints: 6 familias, 9 valores

| Corte | Valor | Rol |
|---|---|---|
| teléfono | 400 | canónico |
| teléfono grande | 480 | canónico |
| tablet pequeña | 640 (+641 inverso) | canónico (nav móvil) |
| tablet | 768 (+769 inverso) | canónico |
| escritorio pequeño | 900 | canónico |
| ultrapanorámica | 1920 y 2560 | canónico (dos pasos de ancho de contenido) |

El legado (`380, 520, 560, 600, 700, 760`) se colapsó el 2026-11-02 con capturas en 561/601/701/761: la rejilla de frases se mantuvo a 2 columnas en tablet (el corte 700 bajó a 640) para no perder densidad.

## Deprecación y versionado

- **Deprecar**: el token se queda con su valor, recibe `$description: "deprecado: usar …"` y `$extensions["com.idiomap"].deprecated = "AAAA-MM"`. Se retira en la siguiente major.
- **Renombrar**: alias del nombre nuevo al valor del viejo durante una minor; el viejo se marca deprecado.
- **Semver de tokens**: patch = valor de un token existente; minor = token nuevo o alias; major = retirar/renombrar un token consumido.
- **Prohibido**: cambiar el `cssVar` de un token sin alias de compatibilidad; el gate `token-ref` lo detectaría tarde (en el navegador).

## Checklist de PR de tokens

1. Editar solo `tokens/*.json` (nunca `shared/css/tokens.css`).
2. `npm run tokens:build` y `npm run tokens:check`.
3. Si el cambio es visual: capturas 390/768/1440/3440 de las pantallas afectadas.
4. Si añade un token: `check-ui-system` exige que se consuma (`token-dead`).
5. Registrar el cambio en `tokens/CHANGELOG.md`.

## Matriz atributo × componente

Resumen por macro-familia (el detalle por clase está en `docs/UI-CATALOG.md`):

| Atributo | Acciones | Campos | Opciones | Tarjetas | Avisos | Navegación | Progreso/datos |
|---|---|---|---|---|---|---|---|
| Fondo | `--color-action` / `--color-surface` | `--color-surface` | `--color-surface` | `--color-surface` | `--feedback-*-bg` | `--color-surface` | `--color-success` / `--color-action` |
| Texto | `--color-on-action` | `--color-text` | `--color-text` | `--color-text` | `--feedback-*-text` | `--color-text-muted` / `--color-on-action` | `--color-text` |
| Borde | `--color-border` | `--color-border` | `--color-border` | `--color-border` | `--feedback-*-border` | `--color-border` | `--color-border` |
| Radio | `--radius-md` | `--radius-md` | `--radius-md` | `--radius-xl` | `--radius-xl` | `--radius-full` / `--radius-md` | `--radius-2xs` / `--radius-full` |
| Espacio | `--space-3/8` | `--space-3/4` | `--space-3/4` | `--space-4/6` | `--space-4` | `--space-2` | `--space-1/2` |
| Tipografía | `--text-body-lg` + `--weight-medium` | `--text-body-lg` | `--text-body` | `--text-body-lg` | `--text-body` | `--text-body` | `--text-label` / `--text-numeric` |
| Elevación | `--shadow-sm` | — | — | `--shadow-xs/md` | — | `--shadow-xs` | — |
| Movimiento | `--duration-base` | `--duration-base` | `--transition` | `--transition` | `--transition` | `--transition` | `--duration-slow` |
| Foco | `--color-focus` 3 px | idem | idem | idem | idem | idem | idem |
| Estados | hover/active/disabled | focus/disabled | correct/wrong/selected | hover | correct/error | active | derivado de datos |

## Acta: familias revisadas sin capa de componente

| Familia | Por qué no necesita tokens propios |
|---|---|
| Formularios | Fondo, texto, borde, radio y foco son 1:1 con el semántico; el placeholder ya usa `text-muted` |
| Opciones / choices | Correcta y fallada son el trío `success`/`danger`; seleccionada es el trío `action` |
| Tarjetas | Superficie, borde, radio y sombra son 1:1; los colores por tema son **dato** (`--topic-clr`) |
| Navegación | Activa = `--color-action`; el resto = superficie y texto |
| Progreso / datos | `success`/`action`/`border`; el heatmap usa la paleta de datos |
| Ruta | `--color-category-path` + `success` para hechos |

Solo **feedback** justifica capa propia: seis pantallas comparten el mismo contrato de estado y antes duplicaban las reglas.



| Fase | Entregable | Estado |
|---|---|---|
| 0 | contrato y taxonomía | **Completo**: tipos, niveles, matriz atributo×componente y acta de familias |
| 1 | fuente DTCG + generador | **Completo**: 232 tokens, `--check` en CI, CSS idéntico al importar |
| 2 | capa de componente | **Completo**: `feedback` tokenizado; resto revisado con acta (no necesita capa propia) |
| 3 | gates | **Completo**: `target-size` en la suite local; `component-contract` descartado con motivo |
| 4 | migración de literales | **Completo**: color, caja, opacidad, duración, z, breakpoints, pesos, sombras y degradados |
| 5 | gobernanza | **Completo**: deprecación, versionado, checklist, changelog y CI |

## Pendiente

Solo queda **U-08** (verificación con hardware): checklist en `docs/UI-DEBT.md` §5. El resto del plan está cerrado.
