/* ============================================================
   flags.js - Band flags (AppFlags). Ninguna bandera se dibuja aqui: todas son
   <img> de shared/img/flags/<code>.svg, importadas de Wikimedia Commons.
   Uso: AppFlags.langFlags(['es','mx']) -> <span class="flag-stack">...</span>
        AppFlags.region('Chile')       -> <img class="flag-img" src=".../cl.svg">
   ============================================================ */

const AppFlags = (() => {

  /* ---------- Public API ---------- */

  // Razon real (w/h) de cada bandera importada. La usa SOLO el layout del stack (ancho del
  // contenedor y posiciones): una bandera con otra proporcion queda centrada, sin inclinarse.
  const FLAG_AR = {
    ar: 1.600, at: 1.500, au: 2.000, bo: 1.467,
    br: 1.429, ch: 1.000, cl: 1.500, co: 1.500,
    cr: 1.667, cu: 2.000, de: 1.667, do: 1.500,
    ec: 1.500, es: 1.500, fi: 1.636, gb: 1.667,
    gt: 1.600, hn: 2.000, it: 1.500, mx: 1.750, ni: 1.667,
    no: 1.375, pa: 1.500, pe: 1.500, pl: 1.600,
    pr: 1.500, pt: 1.500, py: 1.818, se: 1.600,
    sv: 1.772, us: 1.900, uy: 1.500, ve: 1.500
  };
  const _flagW = (code, h) => Math.round((FLAG_AR[code] || 1.5) * h);

  // A language's flags as ONE overlapping stack, for ANY count. Every flag is the SAME height; width
  // follows each flag's aspect. The wrapper is ALWAYS the same fixed height (HC) regardless of count —
  // so a 3-flag badge is never taller than a 1/2-flag one — and its width is the flags' real bounding
  // box (so the badge content is horizontally centered, no lean). Layout by count:
  //   1 → single, centered.        2 → diagonal: back top-left, front down-right + on top.
  //   3 → three levels (staircase): the MIDDLE flag (e.g. México in es/mx/ar) is at the bottom-centre
  //       and ON TOP (never covered); the LAST flag (Argentina) is top-left and hindmost; the FIRST is
  //       middle-right. All three fit inside HC (smaller vertical step than 2-flag), never taller.
  function langFlags(codes) {
    const list = (codes || []).filter(Boolean);
    const n = list.length;
    const FH = 14, HC = 22;                     // fixed flag height + fixed wrapper height (any count)
    const w = (i) => _flagW(list[i], FH);       // each flag's own width (aspect-based)
    const wrap = document.createElement('span');
    wrap.className = 'flag-stack';
    wrap.setAttribute('aria-hidden', 'true');
    if (!n) return wrap;

    // ZIGZAG (vertical levels) + overlap by HALF the covered flag's width, so a covered flag never
    // shows less than half whatever its aspect. pos[i] = { x, y, z }.
    //   n=2 → diagonal: back flag top-left; front flag down-right, covering the back's right half.
    //   n=3 → staircase: last flag (Argentina) top-left/back; first (España) middle-right; middle flag
    //         (México) bottom-centre and ON TOP, covering the inner half of each neighbour (uncovered).
    const DY = 4;                                         // vertical step between levels
    let pos = [];
    if (n === 1) {
      pos[0] = { x: 0, y: 0, z: 1 };
    } else if (n === 2) {
      pos[0] = { x: 0,        y: 0,  z: 1 };
      pos[1] = { x: w(0) / 2, y: DY, z: 2 };
    } else if (n === 3) {
      pos[2] = { x: 0,                          y: 0,      z: 1 };
      pos[0] = { x: w(2) / 2 + w(1) - w(0) / 2, y: DY,     z: 2 };
      pos[1] = { x: w(2) / 2,                   y: 2 * DY, z: 3 };
    } else {
      let x = 0;                                          // 4+: half-overlap zigzag cascade
      for (let i = 0; i < n; i++) { pos[i] = { x: x, y: (i % 2) * DY, z: i + 1 }; x += w(i) / 2; }
    }

    var minX = Infinity, maxX = -Infinity, maxY = 0;
    list.forEach(function (code, i) { minX = Math.min(minX, pos[i].x); maxX = Math.max(maxX, pos[i].x + w(i)); maxY = Math.max(maxY, pos[i].y); });
    var offY = (HC - (FH + maxY)) / 2;                    // centre the whole cascade in the fixed height
    list.forEach(function (code, i) {
      var img = flagImg(code, 'flag-layer');
      img.style.left = (pos[i].x - minX) + 'px';
      img.style.top  = (offY + pos[i].y) + 'px';
      img.style.zIndex = String(pos[i].z);
      wrap.appendChild(img);
    });
    wrap.style.width  = (maxX - minX) + 'px';
    wrap.style.height = HC + 'px';
    // Fixed frame: every language stack occupies the SAME slot regardless of
    // 1/2/3 flags. Consumers (header, profile cards, vocabulary toggle) align.
    const frame = document.createElement('span');
    frame.className = 'flag-frame';
    frame.appendChild(wrap);
    return frame;
  }

  /* ---------- Regions / variants → REAL national flags (cluster) ---------- */

  // Base path to the flag assets, derived from THIS script's own URL so it resolves at any page
  // depth (GitHub Pages subpath, local, …): .../shared/js/flags.js → .../shared/img/flags/
  const _scriptSrc = (document.currentScript && document.currentScript.src) ||
    ([].map.call(document.scripts, s => s.src).find(s => /\/flags\.js(\?|$)/.test(s))) || '';
  const FLAG_BASE = _scriptSrc.replace(/[^/]*$/, '').replace(/\/js\/$/, '/img/flags/');
  const REGION_BASE = FLAG_BASE.replace(/\/flags\/$/, '/regions/');   // shared/img/regions/

  const _fold = (s) => (s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  // A region/variant LABEL → the country code(s) it covers. One country → one flag; several →
  // a flag cluster (works for any set, even antipodal like US+Australia). A new region/variant
  // needs an entry here + its flag asset in shared/img/flags/. A macro-zone with no country
  // list returns null → the caller shows the name alone.
  const REGION_MAP = {
    // German-speaking regions (DACH) — de/at/ch flag assets exist in shared/img/flags/.
    'deutschland': ['de'], 'alemania': ['de'], 'germany': ['de'],
    'osterreich': ['at'], 'austria': ['at'],
    'schweiz': ['ch'], 'suiza': ['ch'], 'switzerland': ['ch'],
    'dach': ['de', 'at', 'ch'],
    'espana': ['es'], 'uk': ['gb'], 'reino unido': ['gb'],
    // Portuguese-speaking regions (en-pt BR↔PT split) — br/pt flag assets exist in shared/img/flags/.
    'brasil': ['br'], 'brazil': ['br'], 'portugal': ['pt'],
    'us': ['us'], 'usa': ['us'], 'ee. uu.': ['us'], 'ee.uu.': ['us'], 'estados unidos': ['us'],
    'mexico': ['mx'], 'argentina': ['ar'], 'chile': ['cl'], 'peru': ['pe'], 'bolivia': ['bo'],
    'uruguay': ['uy'], 'colombia': ['co'], 'venezuela': ['ve'], 'australia': ['au'],
    // Macro-zones whose member flags all exist → a clean flag cluster (cluster() caps at 5 + "+N").
    'cono sur': ['ar', 'cl', 'uy'], 'rio de la plata': ['ar', 'uy'],
    'mexico y espana': ['mx', 'es'],
    'sudamerica andina y cono sur': ['pe', 'bo', 'cl', 'ar', 'uy'],
    'caribe': ['cu', 'do', 'pr'],
    'mexico y centroamerica': ['mx', 'gt', 'hn', 'ni', 'pa'],
    'sudamerica': ['co', 've', 'ec', 'pe', 'bo', 'cl', 'py', 'ar', 'uy'],
    'centroamerica': ['gt', 'hn', 'sv', 'ni', 'cr', 'pa'],
  };

  // Contiguous MACRO-regions (fit in one hemisphere) → a real orthographic-globe asset, since
  // a flag cluster of ~20 countries would be absurd. Country-precise sets use flags (above).
  const REGION_GLOBE = {
    'latinoamerica': 'latinoamerica.svg',
    // "carro" zone (DAMER): all of Latin America except the Cono Sur (which says "auto"). The Latin-
    // America globe is the closest locator; the label text carries the precise exclusion.
    'america (salvo cono sur)': 'latinoamerica.svg',
    // The neutral / pan-Hispanic variety is a first-class labelled variant with its own badge
    // (a world globe, distinct from the Latin-America locator map) — shown like any country/region.
    'general': 'general.svg', 'neutro': 'general.svg', 'panhispanico': 'general.svg',
  };

  /** A single real flag as an <img> from the asset dir (never inlined; emblem flags are big). */
  function flagImg(code, cls) {
    const img = document.createElement('img');
    img.src = FLAG_BASE + code + '.svg';
    img.className = cls || 'flag-img'; img.alt = '';
    img.setAttribute('aria-hidden', 'true'); img.loading = 'lazy';
    return img;
  }

  /** Cluster of real flags for a multi-country variant: first `max` + "+N"; wraps responsively. */
  function cluster(codes, max) {
    max = max || 5;
    const wrap = document.createElement('span');
    wrap.className = 'flag-cluster';
    (codes || []).slice(0, max).forEach(c => wrap.appendChild(flagImg(c)));
    if ((codes || []).length > max) {
      const more = document.createElement('span');
      more.className = 'flag-more';
      more.textContent = '+' + (codes.length - max);
      wrap.appendChild(more);
    }
    return wrap;
  }

  /**
   * Visual for a region/variant LABEL: one real flag, a flag cluster (multi-country), or null
   * (macro-zone with no country list → caller shows the name alone).
   * @param {string} name — label as authored (e.g. 'España', 'UK', 'palta')
   */
  function region(name) {
    const key = _fold(name);
    const codes = REGION_MAP[key];
    if (codes && codes.length) return codes.length === 1 ? flagImg(codes[0]) : cluster(codes);
    const globe = REGION_GLOBE[key];
    if (globe) {
      const img = document.createElement('img');
      img.src = REGION_BASE + globe;
      img.className = 'region-globe'; img.alt = '';
      img.setAttribute('aria-hidden', 'true'); img.loading = 'lazy';
      return img;
    }
    return null;   // unknown label → caller shows the name alone
  }

  return { region, cluster, flagImg, langFlags };
})();
