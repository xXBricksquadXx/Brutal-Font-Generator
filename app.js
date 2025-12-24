import { FONT_STYLES } from './fonts.js';
import { DECORATORS } from './decorators.js';

/* =========================
   Storage
========================= */
const LS_FAV = 'cfg:favorites:v2';
const LS_DECORATOR = 'cfg:decorator:v2';

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}
function saveJSON(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // ignore
  }
}

/* =========================
   Repo (indexes + derived lists)
========================= */
const normalize = (s) => (s ?? '').toString().toLowerCase().trim();

function createRepo() {
  const fonts = (FONT_STYLES || []).map((f) => {
    const styles = Array.from(new Set((f.styles || []).map(String)));
    const chars = f.characters || {};
    const isBlock = Object.values(chars).some((v) => String(v).includes('\n'));
    const searchKey = normalize(
      `${f.name || ''} ${f.id || ''} ${styles.join(' ')}`
    );

    return {
      ...f,
      styles,
      characters: chars,
      _isBlockFont: isBlock,
      _searchKey: searchKey,
    };
  });

  const styles = Array.from(new Set(fonts.flatMap((f) => f.styles))).sort(
    (a, b) => a.localeCompare(b)
  );

  const fontsById = new Map(fonts.map((f) => [f.id, f]));

  return { fonts, styles, fontsById, decorators: DECORATORS.slice() };
}

const repo = createRepo();

/* =========================
   Transform (inline + block/ASCII fonts)
========================= */
const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

function transformInline(text, charMap) {
  let out = '';
  for (const ch of text)
    out += charMap && hasOwn(charMap, ch) ? charMap[ch] : ch;
  return out;
}

function transformBlock(lineText, charMap, joiner = ' ') {
  // lineText is a single input line (no '\n' inside)
  const glyphLinesList = [];
  let maxRows = 1;

  for (const ch of lineText) {
    const glyph = charMap && hasOwn(charMap, ch) ? String(charMap[ch]) : ch;
    const lines = glyph.split('\n');
    maxRows = Math.max(maxRows, lines.length);
    glyphLinesList.push(lines);
  }

  // compute per-glyph width for padding
  const widths = glyphLinesList.map((lines) =>
    Math.max(1, ...lines.map((ln) => ln.length))
  );

  const rows = Array.from({ length: maxRows }, () => '');

  for (let g = 0; g < glyphLinesList.length; g++) {
    const lines = glyphLinesList[g];
    const w = widths[g];
    for (let r = 0; r < maxRows; r++) {
      const part = (lines[r] ?? '').padEnd(w, ' ');
      rows[r] += part + joiner;
    }
  }

  return rows.map((r) => r.trimEnd()).join('\n');
}

function applyDecorator(text, decorator) {
  const val = decorator?.value ? String(decorator.value).trim() : '';
  if (!val) return text;
  return `${val} ${text} ${val}`;
}

function fontOutput({ text, font, decorator }) {
  const lines = String(text ?? '').split('\n');

  if (font._isBlockFont) {
    // Convert each input line to ASCII art; separate lines with a blank line
    const rendered = lines.map((ln) =>
      transformBlock(ln, font.characters, ' ')
    );
    return applyDecorator(rendered.join('\n\n'), decorator);
  }

  const rendered = lines.map((ln) => transformInline(ln, font.characters));
  return applyDecorator(rendered.join('\n'), decorator);
}

/* =========================
   UI helpers
========================= */
function debounce(fn, ms = 120) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function')
      node.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null) node.setAttribute(k, String(v));
  }
  for (const ch of children) {
    if (ch === null || ch === undefined) continue;
    node.appendChild(typeof ch === 'string' ? document.createTextNode(ch) : ch);
  }
  return node;
}

const toastHost = document.getElementById('toastHost');
function toast(msg) {
  const node = el('div', { class: 'toast' }, msg);
  toastHost.appendChild(node);
  setTimeout(() => node.remove(), 1400);
}

async function copyToClipboard(text) {
  const str = String(text ?? '');
  try {
    await navigator.clipboard.writeText(str);
    return true;
  } catch {
    // fallback
    try {
      const ta = document.createElement('textarea');
      ta.value = str;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      return true;
    } catch {
      return false;
    }
  }
}

/* =========================
   State
========================= */
const initialFavorites = new Set(loadJSON(LS_FAV, []));
const initialDecoratorId = loadJSON(LS_DECORATOR, 'none');

const state = {
  text: 'Preview Text',
  query: '',
  style: 'all',
  selectedFontId: 'all',
  decoratorId: initialDecoratorId,
  favOnly: false,
  limit: 25,
  favorites: initialFavorites,
};

function setState(patch) {
  Object.assign(state, patch);
  render();
}

/* =========================
   DOM bindings
========================= */
const inputText = document.getElementById('inputText');
const searchQuery = document.getElementById('searchQuery');
const styleFilter = document.getElementById('styleFilter');
const fontJump = document.getElementById('fontJump');
const decoratorSelect = document.getElementById('decoratorSelect');
const favOnly = document.getElementById('favOnly');
const pageSize = document.getElementById('pageSize');
const resultsMeta = document.getElementById('resultsMeta');
const results = document.getElementById('results');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const clearAllBtn = document.getElementById('clearAllBtn');

/* =========================
   Populate selects
========================= */
function fillSelect(
  select,
  items,
  { valueKey = 'value', labelKey = 'label', includeAll } = {}
) {
  select.innerHTML = '';
  if (includeAll) {
    select.appendChild(
      el('option', { value: includeAll.value }, includeAll.label)
    );
  }
  for (const it of items) {
    select.appendChild(el('option', { value: it[valueKey] }, it[labelKey]));
  }
}

fillSelect(
  styleFilter,
  repo.styles.map((s) => ({ value: s, label: s })),
  { includeAll: { value: 'all', label: 'All styles' } }
);

fillSelect(
  fontJump,
  repo.fonts.map((f) => ({ value: f.id, label: `${f.name} (${f.id})` })),
  {
    includeAll: { value: 'all', label: 'All fonts' },
    valueKey: 'value',
    labelKey: 'label',
  }
);

fillSelect(
  decoratorSelect,
  repo.decorators.map((d) => ({ value: d.id, label: d.name })),
  { valueKey: 'value', labelKey: 'label' }
);

/* =========================
   Wire events
========================= */
inputText.value = state.text;
decoratorSelect.value = state.decoratorId;
pageSize.value = String(state.limit);

inputText.addEventListener('input', () => setState({ text: inputText.value }));
searchQuery.addEventListener(
  'input',
  debounce(
    () => setState({ query: searchQuery.value, limit: Number(pageSize.value) }),
    140
  )
);

styleFilter.addEventListener('change', () =>
  setState({
    style: styleFilter.value,
    selectedFontId: 'all',
    limit: Number(pageSize.value),
  })
);

fontJump.addEventListener('change', () =>
  setState({ selectedFontId: fontJump.value, limit: Number(pageSize.value) })
);

decoratorSelect.addEventListener('change', () => {
  const id = decoratorSelect.value;
  saveJSON(LS_DECORATOR, id);
  setState({ decoratorId: id });
});

favOnly.addEventListener('change', () =>
  setState({ favOnly: favOnly.checked, limit: Number(pageSize.value) })
);

pageSize.addEventListener('change', () =>
  setState({ limit: Number(pageSize.value) })
);

loadMoreBtn.addEventListener('click', () =>
  setState({ limit: state.limit + Number(pageSize.value) })
);

clearAllBtn.addEventListener('click', () => {
  searchQuery.value = '';
  styleFilter.value = 'all';
  fontJump.value = 'all';
  decoratorSelect.value = 'none';
  favOnly.checked = false;
  pageSize.value = '25';
  saveJSON(LS_DECORATOR, 'none');
  saveJSON(LS_FAV, [...state.favorites]); // keep favorites
  setState({
    text: 'Preview Text',
    query: '',
    style: 'all',
    selectedFontId: 'all',
    decoratorId: 'none',
    favOnly: false,
    limit: 25,
  });
  inputText.value = state.text;
});

/* =========================
   Rendering
========================= */
function getDecoratorById(id) {
  return repo.decorators.find((d) => d.id === id) || repo.decorators[0];
}

function matchesFilters(font) {
  if (state.selectedFontId !== 'all' && font.id !== state.selectedFontId)
    return false;

  if (state.style !== 'all' && !(font.styles || []).includes(state.style))
    return false;

  if (state.favOnly && !state.favorites.has(font.id)) return false;

  const q = normalize(state.query);
  if (q && !font._searchKey.includes(q)) return false;

  return true;
}

function cardNode(font, decorator) {
  const isFav = state.favorites.has(font.id);

  const out = fontOutput({
    text: state.text,
    font,
    decorator,
  });

  const pills = el(
    'div',
    { class: 'pills' },
    ...font.styles.map((s) => el('span', { class: 'pill' }, s))
  );

  return el(
    'div',
    { class: 'card', dataset: { fontId: font.id } },
    el(
      'div',
      { class: 'card-head' },
      el(
        'div',
        {},
        el('div', { class: 'card-title' }, font.name || font.id),
        el(
          'div',
          { class: 'card-sub' },
          `${font.id}${font._isBlockFont ? ' • block' : ''}`
        )
      ),
      el('div', { class: 'spacer' }),
      el(
        'button',
        {
          class: 'btn',
          type: 'button',
          dataset: { action: 'fav' },
          title: 'Toggle favorite',
        },
        isFav ? '★' : '☆'
      )
    ),
    pills,
    el('pre', { class: 'output' }, out),
    el(
      'div',
      { class: 'card-actions' },
      el(
        'button',
        { class: 'btn primary', type: 'button', dataset: { action: 'copy' } },
        'Copy'
      ),
      el(
        'button',
        { class: 'btn', type: 'button', dataset: { action: 'copyRaw' } },
        'Copy raw'
      )
    )
  );
}

results.addEventListener('click', async (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;

  const card = e.target.closest('.card');
  if (!card) return;

  const fontId = card.dataset.fontId;
  const font = repo.fontsById.get(fontId);
  if (!font) return;

  const action = btn.dataset.action;
  if (action === 'fav') {
    if (state.favorites.has(fontId)) state.favorites.delete(fontId);
    else state.favorites.add(fontId);

    saveJSON(LS_FAV, [...state.favorites]);
    render();
    return;
  }

  const decorator = getDecoratorById(state.decoratorId);

  if (action === 'copy' || action === 'copyRaw') {
    const out = fontOutput({ text: state.text, font, decorator });
    const ok = await copyToClipboard(out);
    toast(ok ? 'Copied' : 'Copy failed');
  }
});

function render() {
  const decorator = getDecoratorById(state.decoratorId);

  // Filter list once
  const filtered = repo.fonts.filter(matchesFilters);
  const total = filtered.length;

  // Pagination
  const page = filtered.slice(0, Math.min(state.limit, total));

  resultsMeta.textContent = `Showing ${page.length} / ${total} fonts`;

  // Button visibility
  loadMoreBtn.style.display = page.length < total ? 'inline-flex' : 'none';

  // Render cards
  results.innerHTML = '';
  const frag = document.createDocumentFragment();
  for (const f of page) frag.appendChild(cardNode(f, decorator));
  results.appendChild(frag);
}

// initial render
render();
