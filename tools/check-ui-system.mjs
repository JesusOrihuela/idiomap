/* ============================================================
   check-ui-system.mjs — puerta del sistema de UI (F6)
   ------------------------------------------------------------
   Dieciseis reglas. Dos tipos:

   DURAS  -> deben estar a cero siempre: emoji en marcado, valores fuera
             de la escala, CSS sin sello de cabecera, px literales de caja,
             iconos (duplicados, muertos, SVG inline, referencias rotas),
             bordes (grosor por rol, radio por rol, anillo de foco unico) y
             tokens (sin consumidor o referenciados sin existir) y contraste de los badges CEFR.
   RATCHET-> arrastran deuda conocida: color literal fuera de tokens y
             clases de componente fuera de components.css. Fallan solo si
             el numero SUBE respecto a tools/ui-system-baseline.json, que
             se regenera a proposito con --write-baseline.

   Uso:  node tools/check-ui-system.mjs
         node tools/check-ui-system.mjs --write-baseline
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE_PATH = path.join(ROOT, 'tools/ui-system-baseline.json');
const WRITE = process.argv.includes('--write-baseline');

const cssFiles = [];
const htmlFiles = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const fp = path.join(d, e.name);
    const rel = path.relative(ROOT, fp).replace(/\\/g, '/');
    if (e.isDirectory()) {
      if (/^(node_modules|\.git|docs|tools\/sources)$/.test(rel)) continue;
      walk(fp);
    } else if (e.name.endsWith('.css')) cssFiles.push({ fp, rel });
    else if (e.name.endsWith('.html') && !rel.startsWith('tools/')) htmlFiles.push({ fp, rel });
  }
})(ROOT);

const read = f => fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '');
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '');

const problems = [];
const counts = {};

// ── 1 · color literal fuera de tokens.css (RATCHET)
{
  let n = 0;
  for (const { fp, rel } of cssFiles) {
    if (rel.endsWith('shared/css/tokens.css')) continue;
    const lineas = stripComments(read(fp)).split(/\r?\n/)
      // Paleta de categorias por tema: un color por tema, usado una vez.
      // No es diseno, es dato del producto. Excepcion declarada (UI-DEBT D-04).
      .filter(l => !/--topic-clr\s*:/.test(l));
    for (const linea of lineas) {
      // Sombra y filtro admiten alfa arbitrario: no son color de paleta.
      if (/^\s*(box-shadow|text-shadow|filter|backdrop-filter)\s*:/.test(linea)) {
        const hexSombra = linea.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
        n += hexSombra.length;
        continue;
      }
      for (const m of linea.matchAll(/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g)) {
        n++;
        if (n <= 5) problems.push(`color-literal  ${rel}  ${m[0]}`);
      }
    }
  }
  // Los .js de UI tampoco pueden llevar color literal. Se excluyen los datos puros
  // (banderas, confeti) y los ficheros de contenido.
  {
    const seen = new Set();
    const walk = dir => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name).replace(/\\/g, '/');
        if (e.isDirectory()) { if (/^(node_modules|\.git|docs|tools|shared\/json)$/.test(p)) continue; walk(p); }
        else if (e.name.endsWith('.js') && !/js-confetti\.js/.test(p) && !seen.has(p)) {
          seen.add(p);
          for (const m of read(p).matchAll(/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g)) {
            n++;
            if (n <= 8) problems.push('color-literal  ' + p + '  ' + m[0]);
          }
        }
      }
    };
    walk('.');
  }

  // Los <style> inline de cada pagina tambien pintan UI: mismo criterio que el CSS.
  for (const { fp, rel } of htmlFiles) {
    for (const block of read(fp).matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
      for (const m of block[1].matchAll(/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g)) {
        n++;
        if (n <= 5) problems.push(`color-literal  ${rel}  <style> ${m[0]}`);
      }
    }
  }
  counts['color-literal'] = n;
}

// ── 2 · emoji en marcado HTML (DURA)
{
  let n = 0;
  const EMO = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/gu;
  for (const { fp, rel } of htmlFiles) {
    const html = stripComments(read(fp));
    for (const m of html.matchAll(EMO)) {
      n++;
      problems.push(`emoji-markup  ${rel}  ${m[0]}`);
    }
  }
  counts['emoji-markup'] = n;
}

// ── 3 · valores fuera de la escala (DURA)
{
  const SPACING = ['margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'gap', 'row-gap', 'column-gap'];
  let n = 0;
  for (const { fp, rel } of cssFiles) {
    if (rel.endsWith('shared/css/tokens.css')) continue;
    for (const line of stripComments(read(fp)).split(/\r?\n/)) {
      const m = line.match(/^\s*([a-z-]+):\s*([^;]+);/);
      if (!m) continue;
      const [full, prop, raw] = m;

      if (prop === 'font-size' && !/var\(--text-|var\(--icon-|^inherit|^unset|em$/.test(raw)) {
        n++; problems.push(`off-scale  ${rel}  font-size: ${raw.trim()}`); continue;
      }
      if (!SPACING.includes(prop)) continue;
      if (/calc\(|clamp\(|auto|inherit|initial|none|%/.test(raw)) continue;
      for (const part of raw.trim().split(/\s+/)) {
        const num = part.match(/^(-?[\d.]+)(px|rem)?$/);
        if (!num) continue;
        if (/var\(--space-/.test(part)) continue;
        const px = num[2] === 'rem' ? parseFloat(num[1]) * 16 : parseFloat(num[1]);
        if (px === 0) continue;
        if (Math.abs(px) < 3) continue;            // nudges 1-2px permitidos
        if (Math.abs(px) % 4 === 0) continue;      // en rejilla
        n++; problems.push(`off-scale  ${rel}  ${prop}: ${raw.trim()}`);
      }
    }
  }
  counts['off-scale'] = n;
}

// ── 4 · clase de componente fuera de components.css (RATCHET)
{
  const FAMILY = /^\.(btn|button|card|pill|chip|badge|field|input|modal|toast|table|nav|tab)\b/;
  let n = 0;
  for (const { fp, rel } of cssFiles) {
    if (rel === 'shared/css/components.css' || rel.endsWith('tokens.css')) continue;
    for (const line of stripComments(read(fp)).split(/\r?\n/)) {
      const m = line.match(/^\s*([^{}]+)\{\s*$/);
      if (!m) continue;
      for (const sel of m[1].split(',')) {
        if (FAMILY.test(sel.trim())) { n++; if (n <= 5) problems.push(`component-outside  ${rel}  ${sel.trim()}`); }
      }
    }
  }
  counts['component-outside'] = n;
}

// ── 5 · CSS sin sello de cabecera (DURA)
{
  let n = 0;
  for (const { fp, rel } of cssFiles) {
    if (!read(fp).slice(0, 400).includes('docs/UI-SYSTEM.md')) {
      n++; problems.push(`css-stamp  ${rel}`);
    }
  }
  counts['css-stamp'] = n;
}

// ── 6 · valores px literales de caja (espaciado/tamaño)
{
  let n = 0;
  for (const { fp, rel } of cssFiles) {
    if (rel.endsWith('shared/css/tokens.css')) continue;
    const s = stripComments(read(fp));
    for (const m of s.matchAll(/([a-z-]+)\s*:\s*([^;{}]*\d+px[^;{}]*);/g)) {
      const prop = m[1], val = m[2];
      if (/^(border|outline|box-shadow|text-shadow|filter|backdrop-filter|--shadow)/.test(prop)) continue;
      const nums = [...val.matchAll(/(\d+(?:\.\d+)?)px/g)].map(x => +x[1]);
      if (!nums.some(x => x > 3)) continue;
      n++;
      if (n <= 8) problems.push(`page-literal  ${rel}  ${prop}: ${val.trim()}`);
    }
  }
  counts['page-literal'] = n;
}

// ── 7 · iconos: sprite único, sin duplicados, sin muertos, sin SVG inline (DURA)
{
  const SPRITE = 'shared/js/icons.js';
  // SVG de DATO, no de chrome: banderas, iconos de dimensión, confeti.
  const DATA_SVG = /shared\/js\/(feedback|js-confetti)\.js$/;
  const src = read(path.join(ROOT, SPRITE));
  const symbols = [...src.matchAll(/<symbol id=\\?"(i-[a-z0-9-]+)\\?"[^>]*>([\s\S]*?)<\/symbol>/g)]
    .map(m => ({ id: m[1], body: m[2].replace(/\\"/g, '"').replace(/\s+/g, ' ').trim() }));

  const byBody = new Map();
  for (const s of symbols) {
    const prev = byBody.get(s.body);
    if (prev) { counts['icon-dup'] = (counts['icon-dup'] || 0) + 1; problems.push(`icon-dup  ${prev} = ${s.id}`); }
    else byBody.set(s.body, s.id);
  }
  counts['icon-dup'] = counts['icon-dup'] || 0;

  const jsFiles = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const fp = path.join(d, e.name);
      const rel = path.relative(ROOT, fp).replace(/\\/g, '/');
      if (e.isDirectory()) { if (/^(node_modules|\.git|docs|tools)$/.test(rel)) continue; walk(fp); }
      else if (/\.(js|html)$/.test(e.name)) jsFiles.push({ fp, rel });
    }
  })(ROOT);

  const used = new Set();
  // Referencias dinámicas dentro del propio módulo (mapa tema → icono).
  for (const m of src.matchAll(/['"](i-[a-z0-9-]+)['"]/g)) used.add(m[1]);
  for (const { fp, rel } of jsFiles) {
    if (rel === SPRITE) continue;
    const s = read(fp);
    for (const m of s.matchAll(/#(i-[a-z0-9-]+)/g)) used.add(m[1]);
    for (const m of s.matchAll(/['"](i-[a-z0-9-]+)['"]/g)) used.add(m[1]);
    if (DATA_SVG.test(rel)) continue;
    for (const m of s.matchAll(/<svg\b[^>]*>(?:(?!<\/svg>)[\s\S]){0,400}?<\/svg>/g)) {
      if (/<use\s+href=/.test(m[0])) continue;
      counts['icon-inline'] = (counts['icon-inline'] || 0) + 1;
      problems.push(`icon-inline  ${rel}  ${m[0].replace(/\s+/g, ' ').slice(0, 60)}`);
    }
  }
  counts['icon-inline'] = counts['icon-inline'] || 0;

  const ids = new Set(symbols.map(s => s.id));
  for (const id of used) {
    if (ids.has(id)) continue;
    counts['icon-broken'] = (counts['icon-broken'] || 0) + 1;
    problems.push(`icon-broken  ${id} sin símbolo`);
  }
  counts['icon-broken'] = counts['icon-broken'] || 0;

  const unused = symbols.filter(s => !used.has(s.id));
  counts['icon-unused'] = unused.length;
  unused.forEach(s => problems.push(`icon-unused  ${s.id}`));
}

// ── 7b · un icono por tema, sin repetir y sin pisar los de tipo de ejercicio (DURA)
{
  const EXERCISE = new Set(['i-mic', 'i-pen', 'i-book', 'i-type',
    'i-languages', 'i-puzzle', 'i-brain', 'i-ruler']);
  const src = read(path.join(ROOT, 'shared/js/icons.js'));
  const mapBlock = (src.match(/MAP:\s*\{([\s\S]*?)\n\s*\},/) || [])[1] || '';
  const map = new Map([...mapBlock.matchAll(/([a-z0-9_]+):\s*'(i-[a-z0-9-]+)'/g)]
    .map(m => [m[1], m[2]]));

  const topicIds = new Set();
  const pairsDir = path.join(ROOT, 'shared/json/pairs');
  for (const p of fs.readdirSync(pairsDir)) {
    const f = path.join(pairsDir, p, 'topics.json');
    if (!fs.existsSync(f)) continue;
    for (const t of JSON.parse(read(f)).topics) topicIds.add(t.id);
  }

  const seen = new Map();
  let n = 0;
  for (const id of topicIds) {
    const icon = map.get(id);
    if (!icon) { n++; problems.push(`topic-icon  ${id} sin icono`); continue; }
    if (seen.has(icon)) { n++; problems.push(`topic-icon  ${icon} repetido: ${seen.get(icon)} = ${id}`); }
    else seen.set(icon, id);
    if (EXERCISE.has(icon)) { n++; problems.push(`topic-icon  ${icon} es un tipo de ejercicio (${id})`); }
  }
  counts['topic-icon'] = n;
}

// ── 8 · bordes: un ancho por rol y un solo anillo de foco (DURA)
//   1 = estructura · 2 = control · 3 = énfasis. El foco es siempre 3px --color-focus a 2px.
{
  let bad = 0, focus = 0, radius = 0;
  for (const { fp, rel } of cssFiles) {
    if (rel.endsWith('shared/css/tokens.css')) continue;
    const s = stripComments(read(fp));
    for (const m of s.matchAll(/([a-z-]+)\s*:\s*([^;{}]+);/g)) {
      const prop = m[1], val = m[2].trim().replace(/\s+/g, ' ');
      if (prop === 'border-radius') {
        // Escala por rol: 3/4/8/10/12/16/24/full (+ 0 y círculos 50 %). Sin nudges ad hoc.
        if (!/var\(--radius-|^0$|^50%$|^inherit/.test(val)) {
          radius++;
          problems.push(`radius-role  ${rel}  border-radius: ${val}`);
        }
        continue;
      }
      if (!/^border(-(top|right|bottom|left))?(-width)?$/.test(prop) && prop !== 'outline' && prop !== 'outline-width') continue;
      if (/^(none|0|inherit|unset)$/.test(val)) continue;
      const widths = [...val.matchAll(/(\d*\.?\d+)px/g)].map(x => +x[1]);
      if (!widths.length) continue;
      if (widths.every(w => w === 1 || w === 2 || w === 3)) continue;
      bad++;
      problems.push(`border-width  ${rel}  ${prop}: ${val}`);
    }
    const selectorAt = idx => {
      const open = s.lastIndexOf('{', idx);
      const prev = s.lastIndexOf('}', open);
      return s.slice(prev + 1, open).replace(/\s+/g, ' ').trim();
    };
    for (const m of s.matchAll(/outline\s*:\s*([^;{}]+);/g)) {
      const val = m[1].trim().replace(/\s+/g, ' ');
      if (/^none$/.test(val)) {
        // Quitar el anillo en un estado de foco deja el control sin señal visible.
        // .fc-back-word, .quiz-word, .phase-label y los titulos con tabindex=-1 son
        // destinos de foco programatico (texto, no control): sin anillo.
        if (/:focus/.test(selectorAt(m.index)) && !/\.(fc-back-word|quiz-word|phase-label)\b/.test(selectorAt(m.index)) && !/\[tabindex="-1"\]/.test(selectorAt(m.index))) {
          focus++;
          problems.push(`focus-ring  ${rel}  ${selectorAt(m.index).slice(0, 50)}  outline: none`);
        }
        continue;
      }
      if (!/^3px solid var\(--color-focus\)$/.test(val)) {
        focus++;
        problems.push(`focus-ring  ${rel}  outline: ${val}`);
      }
    }
    for (const m of s.matchAll(/outline-offset\s*:\s*([^;{}]+);/g)) {
      const val = m[1].trim();
      // Los campos de una linea y los textareas pintan su superficie dentro de
      // la caja: el anillo baja con ella para no quedar como un segundo marco.
      const fieldRing = /^(input|textarea)\.field__input/.test(selectorAt(m.index)) &&
        val === 'calc(-1 * var(--space-1))';
      if (val !== '2px' && !fieldRing) {
        focus++;
        problems.push(`focus-ring  ${rel}  outline-offset: ${val}`);
      }
    }
  }
  counts['border-width'] = bad;
  counts['focus-ring'] = focus;
  counts['radius-role'] = radius;
}

// ── 9 · tokens declarados y nunca consumidos (DURA)
//   Un token sin consumidor no es contrato: es deuda. Debe borrarse o usarse.
{
  const tokenFile = path.join(ROOT, 'shared/css/tokens.css');
  const tokensCss = read(tokenFile);
  const declared = [...tokensCss.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)].map(m => m[1]);
  let corpus = tokensCss;
  for (const { fp, rel } of cssFiles) if (rel !== 'shared/css/tokens.css') corpus += '\n' + read(fp);
  for (const { fp } of htmlFiles) corpus += '\n' + read(fp);
  (function walkJs(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const fp = path.join(d, e.name);
      const rel = path.relative(ROOT, fp).replace(/\\/g, '/');
      if (e.isDirectory()) { if (/^(node_modules|\.git|docs|tools)$/.test(rel)) continue; walkJs(fp); }
      else if (e.name.endsWith('.js')) corpus += '\n' + read(fp);
    }
  })(ROOT);
  const dead = declared.filter(t => (corpus.match(new RegExp(t.replace(/-/g, '\\-') + '(?![a-z0-9-])', 'g')) || []).length < 2);
  counts['token-dead'] = dead.length;
  dead.forEach(t => problems.push(`token-dead  ${t}`));
}

// ── 10 · referencias a tokens inexistentes (DURA)
//   var(--x) sin fallback debe apuntar a un token declarado. Un token renombrado
//   o borrado se descubre aquí, no en el navegador.
{
  const declaredSet = new Set([...read(path.join(ROOT, 'shared/css/tokens.css')).matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)].map(m => m[1]));
  let missing = 0;
  for (const { fp, rel } of cssFiles) {
    const s2 = stripComments(read(fp));
    for (const m of s2.matchAll(/var\(\s*(--[a-z0-9-]+)\s*(,?)/g)) {
      if (m[2] === ',') continue;            // con fallback no rompe
      if (declaredSet.has(m[1])) continue;
      missing++;
      problems.push(`token-ref  ${rel}  var(${m[1]})`);
    }
  }
  counts['token-ref'] = missing;
}


// ── 11 · contraste AA de los badges CEFR (DURA)
//   Los seis niveles se pintan con tinte + texto de paleta; un cambio de tono
//   puede bajar de 4.5:1 sin que el gate de color lo note.
{
  const tokensSrc = read(path.join(ROOT, 'shared/css/tokens.css'));
  const vars = {};
  for (const m of tokensSrc.matchAll(/^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);/gm)) vars[m[1]] = m[2].trim();
  const resolve = (v, depth) => {
    if (!v || depth > 6) return null;
    const mm = v.match(/var\((--[a-z0-9-]+)\)/);
    if (mm) return resolve(vars[mm[1]], depth + 1);
    const hex = v.match(/#([0-9a-f]{6})\b/i);
    return hex ? '#' + hex[1] : null;
  };
  const lum = hex => {
    const c = hex.slice(1);
    const v = [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16) / 255)
      .map(x => x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const comps = read(path.join(ROOT, 'shared/css/components.css'));
  let bad = 0;
  for (const m of comps.matchAll(/\.cefr-badge--([a-z0-9]+)\s*\{([^}]*)\}/g)) {
    const decls = m[2].split(';').map(d => d.split(':')).filter(x => x.length === 2);
    const get = name => (decls.find(d => d[0].trim() === name) || [, ''])[1].trim();
    const bg = resolve(get('background') || get('background-color'), 0);
    const fg = resolve(get('color'), 0);
    if (!bg || !fg) { bad++; problems.push('cefr-contrast  ' + m[1] + '  no resuelve'); continue; }
    const r = ratio(fg, bg);
    if (r < 4.5) { bad++; problems.push('cefr-contrast  ' + m[1] + '  ' + r.toFixed(2) + ' < 4.5'); }
  }
  counts['cefr-contrast'] = bad;
}

// ── 12 · hover solo con puntero fino (DURA)
//   En pantalla táctil :hover se queda pegado tras el toque. Toda regla con
//   :hover debe vivir dentro de @media (hover: hover) and (pointer: fine).
{
  let bad = 0;
  for (const { fp, rel } of cssFiles) {
    const src = stripComments(read(fp));
    let i = 0, sel = 0;
    const guards = [];
    while (i < src.length) {
      const c = src[i];
      if (c === '{') {
        const s = src.slice(sel, i).trim();
        if (/^@(media|supports|container|layer)/.test(s)) {
          guards.push(/^@media/.test(s) && /hover:\s*hover/.test(s));
          i++; sel = i; continue;
        }
        if (/^@(keyframes|font-face|property)/.test(s)) {
          let d = 1; i++;
          while (i < src.length && d > 0) { if (src[i] === '{') d++; else if (src[i] === '}') d--; i++; }
          sel = i; continue;
        }
        let d = 1, j = i + 1;
        while (j < src.length && d > 0) { if (src[j] === '{') d++; else if (src[j] === '}') d--; j++; }
        if (/:hover/.test(s) && !guards.some(Boolean)) {
          bad++;
          problems.push('hover-guard  ' + rel + '  ' + s.replace(/\s+/g, ' ').slice(0, 70));
        }
        i = j; sel = i; continue;
      }
      if (c === '}') { guards.pop(); i++; sel = i; continue; }
      i++;
    }
  }
  counts['hover-guard'] = bad;
}

// ── 13 · paleta fuera de tokens.css (DURA)
//   Componentes y páginas consumen el nivel semántico; la paleta solo se admite en
//   mapas de DATOS (--topic-clr, --level-color…) y en los badges por nivel (CEFR y
//   placement), que son datos del producto, no decisiones de chrome.
{
  const PALETTE = /var\(--(blue|amber|gold|violet|cat|cyan|pink|indigo|emerald|sky|rose|green|red|gray|white)[-)]/;
  const DATA_PROP = /^--(topic-clr|activity-clr|cat-color|level-color)$/;
  const DATA_SEL = /^\.(cefr-badge--|placement-level-badge|level-)/;
  let bad = 0;
  for (const { fp, rel } of cssFiles) {
    if (rel.endsWith('shared/css/tokens.css')) continue;
    const src = stripComments(read(fp));
    let i = 0, selStart = 0;
    while (i < src.length) {
      const c = src[i];
      if (c === '{') {
        const sel = src.slice(selStart, i).trim();
        if (/^@(media|supports|container|layer)/.test(sel)) { i++; selStart = i; continue; }
        let d = 1, j = i + 1;
        while (j < src.length && d > 0) { if (src[j] === '{') d++; else if (src[j] === '}') d--; j++; }
        const body = src.slice(i + 1, j - 1);
        const selector = sel.split('\n').pop().trim();
        for (const m of body.matchAll(/([a-z-]+)\s*:\s*([^;]+);/g)) {
          if (!PALETTE.test(m[2])) continue;
          if (DATA_PROP.test(m[1])) continue;
          if (DATA_SEL.test(selector)) continue;
          bad++;
          problems.push('palette-outside  ' + rel + '  ' + selector.slice(0, 50) + ' { ' + m[1] + ' }');
        }
        i = j; selStart = i; continue;
      }
      if (c === '}') { i++; selStart = i; continue; }
      i++;
    }
  }
  counts['palette-outside'] = bad;
}

// ── 14 · movimiento solo desde tokens (DURA)
//   Ninguna transición/animación escribe una duración literal (salvo 0s).
{
  let bad = 0;
  for (const { fp, rel } of cssFiles) {
    if (rel.endsWith('shared/css/tokens.css')) continue;   // aquí viven los valores
    const src = stripComments(read(fp));
    for (const m of src.matchAll(/(transition|animation)\s*:\s*([^;{}]+);/g)) {
      const raw = m[2].match(/\b\d*\.?\d+m?s\b/g) || [];
      const bads = raw.filter(v => !/^0(\.0+)?m?s$/.test(v));
      if (bads.length) {
        bad++;
        problems.push('motion-literal  ' + rel + '  ' + m[1] + ': ' + bads.join(', '));
      }
    }
  }
  counts['motion-literal'] = bad;
}

// ── 15 · breakpoints de la escala declarada (DURA)
//   Un corte nuevo debe añadirse a tokens/breakpoints.tokens.json, no inventarse.
{
  const bpPath = path.join(ROOT, 'tokens/breakpoints.tokens.json');
  let allowed = null;
  if (fs.existsSync(bpPath)) {
    const bp = JSON.parse(read(bpPath));
    allowed = new Set(Object.values(bp.breakpoint).map(t => String(t.$value.value)));
  }
  let bad = 0;
  if (!allowed) {
    bad++;
    problems.push('breakpoint-scale  falta tokens/breakpoints.tokens.json');
  } else {
    for (const { fp, rel } of cssFiles) {
      const src = stripComments(read(fp));
      for (const m of src.matchAll(/@media[^{]+/g)) {
        for (const w of m[0].matchAll(/(min|max)-width:\s*(\d+)px/g)) {
          if (!allowed.has(w[2])) {
            bad++;
            problems.push('breakpoint-scale  ' + rel + '  ' + w[1] + '-width: ' + w[2] + 'px');
          }
        }
      }
    }
  }
  counts['breakpoint-scale'] = bad;
}

// ── 16 · valores crudos pendientes de migrar (RATCHET)
//   Deuda declarada: caja, opacidad y z-index locales. Se congela en el baseline;
//   solo falla si SUBE. Se reduce por familias en la fase de migración.
{
  const BOX = /^(width|height|min-width|max-width|min-height|max-height|top|left|right|bottom|inset|margin|margin-top|margin-right|margin-bottom|margin-left|padding|padding-top|padding-right|padding-bottom|padding-left|gap|row-gap|column-gap|flex-basis)$/;
  let box = 0, op = 0, z = 0;
  for (const { fp, rel } of cssFiles) {
    if (rel.endsWith('shared/css/tokens.css')) continue;
    const src = stripComments(read(fp));
    for (const m of src.matchAll(/([a-z-]+)\s*:\s*([^;{}]+);/g)) {
      const p = m[1], v = m[2].trim();
      if (BOX.test(p) && /\b\d*\.?\d+(px|rem|em)\b/.test(v) && !/var\(|calc\(/.test(v)) {
        // Estructura, no decisión: hairlines (≤3 px) y tamaños relativos a la letra (em).
        const parts = v.match(/-?\d*\.?\d+(px|rem|em)/g) || [];
        const structural = parts.length > 0 && parts.every(t => /em$/.test(t) || Math.abs(parseFloat(t)) <= 3);
        if (!structural) box++;
      }
      if (p === 'opacity' && !/var\(/.test(v) && !/^0(\.0+)?$|^1(\.0+)?$/.test(v)) op++;
      if (p === 'z-index' && !/var\(/.test(v) && !/^[0-2]$/.test(v)) z++;
    }
  }
  counts['raw-box'] = box;
  counts['raw-opacity'] = op;
  counts['raw-z'] = z;
}

// ── 17 · tipografía y elevación desde tokens (DURA)
//   font-weight solo desde --weight-* o --text-*-weight; sombras desde --shadow-*;
//   degradados desde --gradient-* (los mask-image son estructurales y se eximen).
{
  let weight = 0, shadow = 0;
  for (const { fp, rel } of cssFiles) {
    if (rel.endsWith('shared/css/tokens.css')) continue;
    const src = stripComments(read(fp));
    for (const m of src.matchAll(/(font-weight)\s*:\s*([^;{}]+);/g)) {
      const v = m[2].trim();
      if (!/^var\(--(weight|text)-/.test(v) && !/^(inherit|normal|bold)$/.test(v)) {
        weight++;
        problems.push('raw-font-weight  ' + rel + '  ' + v);
      }
    }
    for (const m of src.matchAll(/(box-shadow)\s*:\s*([^;{}]+);/g)) {
      const v = m[2].trim();
      if (v !== 'none' && !/^var\(--shadow-/.test(v) && !/^var\(--shadow-[a-z-]+,\s*0/.test(v)) {
        shadow++;
        problems.push('raw-shadow  ' + rel + '  ' + v.slice(0, 60));
      }
    }
    for (const m of src.matchAll(/(background|background-image)\s*:\s*([^;{}]+);/g)) {
      if (/gradient\(/.test(m[2]) && !/var\(--gradient-/.test(m[2])) {
        shadow++;
        problems.push('raw-shadow  ' + rel + '  degradado sin token');
      }
    }
  }
  counts['raw-font-weight'] = weight;
  counts['raw-shadow'] = shadow;
}

// ── evaluación
const HARD = ['emoji-markup', 'off-scale', 'css-stamp', 'page-literal',
  'icon-dup', 'icon-unused', 'icon-inline', 'icon-broken', 'topic-icon', 'border-width', 'focus-ring', 'radius-role',
  'token-dead', 'token-ref', 'cefr-contrast', 'hover-guard', 'palette-outside',
  'motion-literal', 'breakpoint-scale', 'raw-opacity', 'raw-box', 'raw-z', 'raw-font-weight', 'raw-shadow'];
let baseline = fs.existsSync(BASELINE_PATH) ? JSON.parse(read(BASELINE_PATH)) : null;

if (WRITE || !baseline) {
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(counts, null, 2) + '\n', 'utf8');
  console.log('baseline escrito en tools/ui-system-baseline.json:', JSON.stringify(counts));
  baseline = counts;
}

const failed = [];
for (const rule of Object.keys(counts)) {
  const cur = counts[rule];
  const base = baseline ? (baseline[rule] ?? 0) : 0;
  if (HARD.includes(rule)) { if (cur > 0) failed.push(`${rule}: ${cur} (debe ser 0)`); }
  else if (cur > base) failed.push(`${rule}: ${cur} > baseline ${base}`);
}

console.log('\n── sistema de UI ──');
for (const rule of Object.keys(counts)) {
  const base = baseline ? (baseline[rule] ?? 0) : counts[rule];
  const tag = HARD.includes(rule) ? (counts[rule] === 0 ? 'ok' : 'FALLA') : (counts[rule] <= base ? 'ok' : 'FALLA');
  console.log(`  ${tag.padEnd(6)} ${rule.padEnd(18)} ${String(counts[rule]).padStart(4)}${HARD.includes(rule) ? '' : '  (baseline ' + base + ')'}`);
}

if (failed.length) {
  console.log('\nviolaciones:');
  problems.slice(0, 25).forEach(p => console.log('   ' + p));
  if (problems.length > 25) console.log(`   ... y ${problems.length - 25} más`);
  console.log('\n' + failed.join('\n'));
  process.exit(1);
}
console.log('\n✓ UI system: ALL CLEAR');
