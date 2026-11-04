# Changelog de tokens

Formato: `AAAA-MM-DD · tipo · qué». Tipos: `added`, `changed`, `removed`, `fixed`.

## 2026-11-02

### added
- **Fuente DTCG 2025.10**: `tokens/primitive.tokens.json`, `tokens/semantic.tokens.json` y `tools/build-tokens.mjs`. `shared/css/tokens.css` pasa a ser generado.
- `tokens/component.tokens.json` con la familia `feedback`: `--feedback-correct-{bg,border,text}`, `--feedback-error-{bg,border,text}`, `--feedback-word-{ok,err}-{bg,text}`, `--feedback-word-neutral-text`.
- `tokens/breakpoints.tokens.json` (15 valores, 6 familias; `emit:false`).
- `tokens/contrast.contract.json` con 17 pares AA.
- Duraciones: `--duration-instant 100`, `--duration-enter 250`, `--duration-xslow 400`, `--duration-draw 600`, `--duration-shimmer 1300`.
- Capas: `--z-header 100`, `--z-nav 90`, `--z-sticky-bar 80`, `--z-network 510`, `--z-skip 9999`.
- Opacidades: `--opacity-40/45/50/55/60/65/70/75/85/90`.
- Semánticos: `--color-warning` (amber-600) y `--color-warning-bg` (amber-050).

### changed
- `--color-text-subtle` retirado: 2.97:1 (no AA). Placeholder y textos de Secuencia pasan a `--color-text-muted`.
- Banner «conectado»: fondo a `--color-success-strong` (3.77 → 7.13).
- Resultado de Pronunciación: usa `-strong` como el resto (3.95 → 6.80).
- `.uf-word-ok/err` consumen `--color-success` / `--color-danger` en vez de la paleta.
- 16 duraciones literales → `--duration-*`; la imagen del hero pasa de 500 a 400 ms.
- 36 opacidades literales → `--opacity-*` (mismos valores).
- 5 capas `z-index` literales → `--z-*`.

### fixed
- `--icon-md` estaba declarado dos veces (20 px y 18 px); se queda 18 px, el valor efectivo.
- `--feedback-*` elimina el override de Pronunciación que bajaba el contraste.

### gates
- `palette-outside`, `motion-literal`, `breakpoint-scale`, `raw-box`, `raw-opacity`, `raw-z`.
- `tokens:check` (generado + contrato AA) en CI y `gate-run`.

### 2026-11-02 · fase de deuda

- **added**: `--weight-regular/medium/semibold`; sombras `--shadow-ring/flag/hover/hover-lg/heat-glow/hint/hint-hover/path-ring/path-ring-strong/inset`; degradados `--gradient-grammar/glow/fade-left/fade-right/action/shimmer`.
- **changed**: breakpoints 15 → 9 (colapso de 380/520/560/600/700/760 con capturas); el corte 700 de la rejilla de frases baja a 640 para conservar 2 columnas en tablet.
- **added**: 	ests/hardware-states.mjs (permisos, error de audio, sesión completada) en CI.
- **added**: gates `raw-font-weight`, `raw-shadow` y `target-size` (Playwright); `gate-run` incluye los gates de UI.
- **changed**: la tarjeta de vocabulario se voltea en ambos sentidos (clic en cualquier cara, botón y Enter).
