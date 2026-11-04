/* Genera docs/UI-CATALOG.md desde components.css (fuente unica).
   Uso: node tools/catalog.mjs */
import fs from 'node:fs';

const COMP = 'shared/css/components.css';
const text = fs.readFileSync(COMP, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

const rules = [];
for (const m of text.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  const sel = m[1].replace(/\s+/g, ' ').trim();
  const props = m[2].split(';').map(x => x.trim().split(':')[0].trim()).filter(Boolean);
  rules.push({ sel, props, body: m[2] });
}

const base = new Map();
for (const r of rules) {
  const m = r.sel.match(/^\.([a-z][a-z0-9_-]*)$/);
  if (!m) continue;
  if (!base.has(m[1])) base.set(m[1], { props: r.props, states: new Set(), variants: new Set(), media: 0 });
  base.get(m[1]).props = r.props;
}
for (const r of rules) {
  for (const m of r.sel.matchAll(/\.([a-z][a-z0-9_-]*)/g)) {
    const c = m[1];
    if (!base.has(c)) continue;
    const state = r.sel.match(/:(hover|active|focus-visible|disabled|checked|focus)/);
    if (state) base.get(c).states.add(state[1]);
    if (r.sel.includes(c + '--')) base.get(c).variants.add(r.sel.split(' ').pop().slice(1));
  }
}

const rows = [...base.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([c, v]) => {
  const states = [...v.states].sort().join(', ') || '—';
  const variants = [...v.variants].sort().join(', ') || '—';
  const key = v.props.filter(p => /^(border-radius|padding|font-size|font-weight|color|background|border|box-shadow|transition)$/.test(p));
  return `| \`.${c}\` | ${v.props.length} | ${states} | ${variants} | ${key.join(', ')} |`;
});

// ── componentes de página (una pantalla), tambien documentados
const pageFiles = [];
for (const d of fs.readdirSync('.')) {
  if (d.startsWith('.') || /^(node_modules|docs|tools|shared|lang|tests)$/.test(d)) continue;
  const f = d + '/css/' + d + '.css';
  if (fs.existsSync(f)) pageFiles.push([d, f]);
}
const pageRows = [];
for (const [page, file] of pageFiles) {
  const text = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const set = new Set();
  for (const m of text.matchAll(/([^{}]+)\{/g)) {
    for (const c of m[1].matchAll(/\.([a-z][a-z0-9_-]*)/g)) if (!base.has(c[1])) set.add(c[1]);
  }
  pageRows.push(`| \`${page}\` | ${set.size} | ${[...set].sort().map(c => '`' + c + '`').join(', ')} |`);
}

const out = `# Catálogo de componentes

Generado por \`tools/catalog.mjs\`. **No editar a mano.**

- Componentes del sistema (reutilizables): **${base.size}**
- Componentes de página (una pantalla): **${pageFiles.length} páginas, ${pageRows.reduce((n, r) => n + +r.split('|')[2].trim(), 0)} clases**
- Atributos: los del sistema salen de tokens (\`--color-*\`, \`--space-*\`, \`--radius-*\`, \`--text-*\`).
- Estados obligatorios en interactivos del sistema: \`hover\`, \`active\`, \`focus-visible\`, \`disabled\`.
- Variantes: clase \`block--variant\` o custom property; el CSS de página no reescribe componentes del sistema.
- Gate: \`node tools/check-components.mjs\` (override, duplicate, state-gaps, unstyled, important).

## 1 · Componentes del sistema

| Componente | Props | Estados | Variantes | Atributos clave |
|---|---:|---|---|---|
${rows.join('\n')}

## 2 · Componentes de página

Viven en el CSS de su pantalla, usan los tokens del sistema y no se comparten entre páginas.

| Página | Clases | Componentes |
|---|---:|---|
${pageRows.join('\n')}
`;
fs.writeFileSync('docs/UI-CATALOG.md', out);
console.log(`catalogo: ${base.size} del sistema + ${pageFiles.length} paginas -> docs/UI-CATALOG.md`);
