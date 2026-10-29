'use strict';
/* Trackerrr – pití, suplementy a jídlo. Bez frameworku, bez buildu (stejně jako ostatní jendovyapky). */

const VERSION = '2.8';
// Klíče v localStorage zůstávají ze staré verze → data v telefonu se neztratí a stará verze by s nimi pořád uměla pracovat.
const KS = 'trackerrr_state_v10', KC = 'trackerrr_config_v10';

/* ===== pomocníci ===== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const isDay = (k) => /^\d{4}-\d{2}-\d{2}$/.test(k);
const parseDay = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }; // lokálně, ne UTC
const addDays = (k, n) => { const d = parseDay(k); d.setDate(d.getDate() + n); return iso(d); };
const mondayOf = (k) => { const d = parseDay(k); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return iso(d); };
const hm = (ts) => new Date(ts).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sum = (arr, f = (x) => x) => arr.reduce((a, x) => a + (+f(x) || 0), 0);
const nowMins = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };
const toMins = (t) => { const m = /^(\d{1,2}):(\d{2})$/.exec(t || ''); return m ? +m[1] * 60 + +m[2] : null; };
const plural = (n, one, few, many) => (n === 1 ? one : n >= 2 && n <= 4 ? few : many);
const fmtMl = (ml) => (ml >= 1000 ? `${(ml / 1000).toLocaleString('cs-CZ', { maximumFractionDigits: 2 })} l` : `${ml} ml`);
const DAY_SHORT = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];
const dayLabel = (k, opts = { weekday: 'long', day: 'numeric', month: 'long' }) => parseDay(k).toLocaleDateString('cs-CZ', opts);
const load = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };

/* ===== ikonky (vlastní sada ve stylu lucide) ===== */
const ICONS = {
  home: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  drop: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
  pill: '<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>',
  food: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
  chart: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  sliders: '<path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4"/>',
  cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
  cloudOk: '<path d="m17 15-5.5 5.5L9 18"/><path d="M5 17.74A7 7 0 1 1 15.71 10h1.79a4.5 4.5 0 0 1 1.5 8.74"/>',
  cloudOff: '<path d="m2 2 20 20"/><path d="M5.78 5.78A7 7 0 0 0 9 19h8.5a4.5 4.5 0 0 0 1.31-.19"/><path d="M21.53 16.5A4.5 4.5 0 0 0 17.5 10h-1.79A7 7 0 0 0 10 5.07"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  chevL: '<path d="m15 18-6-6 6-6"/>',
  chevR: '<path d="m9 18 6-6-6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  upload: '<path d="M12 21V9M7 14l5-5 5 5M5 3h14"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  store: '<path d="M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9h18M9 20v-6h6v6"/>',
  alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  cup: '<path d="M17 8h1a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1"/><path d="M6 6h11v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2Z"/><path d="M11 2v4"/>',
  can: '<path d="M7 3h10v18H7z"/><path d="M7 7h10"/><path d="M13.5 10 10.5 14h3l-3 4"/>',
  glass: '<path d="M5 3h14l-1.6 16.2a2 2 0 0 1-2 1.8H8.6a2 2 0 0 1-2-1.8Z"/><path d="M5.6 9h12.8"/>',
  bottle: '<path d="M10 2h4v3l1.5 2.5a3 3 0 0 1 .5 1.7V20a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V9.2a3 3 0 0 1 .5-1.7L10 5z"/><path d="M8 12h8"/>',
  coffee: '<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><path d="M7 2v2M11 2v2"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  star: '<path d="M12 2.8l2.84 5.76 6.36.92-4.6 4.49 1.08 6.33L12 17.32 6.32 20.3l1.08-6.33-4.6-4.49 6.36-.92z"/>',
};
const starsRow = (n) => `<span class="srow" aria-label="${n} z 5">${[1, 2, 3, 4, 5].map((i) => ic('star', i <= n ? 'on' : '')).join('')}</span>`;
const ic = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;
const DRINK_ICONS = ['glass', 'cup', 'bottle', 'can', 'coffee', 'drop'];

/* ===== stav ===== */
let state = load(KS) || { lastUpdated: 0, deletedLogs: [] };
if (!state || typeof state !== 'object') state = { lastUpdated: 0, deletedLogs: [] };
if (!Array.isArray(state.deletedLogs)) state.deletedLogs = [];
let DEL = new Set(state.deletedLogs);

const hadConfig = !!load(KC);
let config = Object.assign({ notifEnabled: false, notifInterval: 120, statsPeriod: 'week', customSuplementsList: [], initialized: false }, load(KC) || {});
if (!config.initialized) {
  config.customSuplementsList = [
    { id: 'multivitamin', name: 'Multivitamin', frequency: 2, customTimes: ['09:00', '15:00'] },
    { id: 'omega3', name: 'Omega 3', frequency: 1, customTimes: ['13:00'] },
    { id: 'enzymes', name: 'Trávicí enzymy', frequency: 1, customTimes: ['13:00'] },
  ];
  config.initialized = true;
  config.vitamins_v13_migrated = true;
}
// nové věci ve v2
delete config.syncRoom; // starý Google cloud už se nepoužívá
if (!config.waterGoal) config.waterGoal = 2100;
if (!Array.isArray(config.drinks)) config.drinks = [
  { id: 'stanley', name: 'Stanley Cup', ml: 900, icon: 'cup' },
  { id: 'monster', name: 'Monster', ml: 500, icon: 'can' },
  { id: 'glass', name: 'Sklenička', ml: 250, icon: 'glass' },
];
if (!Array.isArray(config.places)) config.places = [];
if (config.haptics === undefined) config.haptics = true;
if (!config.theme) config.theme = 'dark';
if (config.settingsUpdated === undefined) config.settingsUpdated = hadConfig ? 1 : 0; // starý telefon s vlastním seznamem vyhraje nad čistou instalací
config.customSuplementsList.forEach(normSupp);

function normSupp(s) {
  s.frequency = clamp(parseInt(s.frequency) || 1, 1, 8);
  if (!Array.isArray(s.customTimes) || s.customTimes.length !== s.frequency) s.customTimes = defaultTimes(s.frequency, s.preferredTime);
  s.desc = s.customTimes.join(' · ');
  return s;
}
function defaultTimes(n, pref) {
  if (n === 1) return [pref === 'Ráno' ? '09:00' : pref === 'Večer' ? '21:00' : '13:00'];
  return ({ 2: ['09:00', '21:00'], 3: ['09:00', '15:00', '21:00'], 4: ['09:00', '13:00', '17:00', '21:00'], 5: ['09:00', '12:00', '15:00', '18:00', '21:00'] })[n]
    || Array.from({ length: n }, (_, i) => `${pad(clamp(8 + Math.round((i * 14) / (n - 1)), 0, 23))}:00`);
}

let TODAY = iso(new Date());
const ui = {
  tab: 'home', active: TODAY, weekStart: mondayOf(TODAY), statsOffset: 0,
  shownPct: null, customMl: 500, customOpen: false, sync: 'off',
  food: null, histTab: 'meals', histSort: 'date', histQuery: '',
};

const goal = () => config.waterGoal || 2100;
const EMPTY = Object.freeze({ waterLogs: [], food: [], vitamins: {} });
const getDay = (k) => state[k] || EMPTY;
function mutDay(k) {
  const d = state[k] || (state[k] = { water: 0, waterLogs: [], vitamins: {}, food: [] });
  d.waterLogs ||= []; d.food ||= []; d.vitamins ||= {};
  return d;
}
const waterLogs = (d) => (d.waterLogs || []).filter((l) => !DEL.has(l.id));
const foods = (d) => (d.food || []).filter((f) => !DEL.has(f.id));
const doses = (d, id) => ((d.vitamins || {})[id] || []).filter((t) => !DEL.has(t)).sort((a, b) => a - b);
const dayWater = (d) => sum(waterLogs(d), (l) => parseInt(l.amount));
function tomb(id) { if (!DEL.has(id)) { DEL.add(id); state.deletedLogs.push(id); } }
let lastId = 0;
const newId = () => (lastId = Math.max(Date.now(), lastId + 1));

function suppStats(d) {
  let done = 0, target = 0;
  for (const s of config.customSuplementsList) { target += s.frequency; done += Math.min(doses(d, s.id).length, s.frequency); }
  return { done, target };
}
const foodSplit = (f) => {
  if (f.place !== undefined || f.detail !== undefined) return { place: f.place || '', detail: f.detail || '' };
  const i = (f.name || '').indexOf(' | ');
  return i >= 0 ? { place: f.name.slice(0, i), detail: f.name.slice(i + 3) } : { place: f.name || '', detail: '' };
};
const firstDay = () => Object.keys(state).filter(isDay).sort()[0] || TODAY;

/* ===== ukládání ===== */
function persist() {
  state.deletedLogs = [...DEL];
  try { localStorage.setItem(KS, JSON.stringify(state)); localStorage.setItem(KC, JSON.stringify(config)); }
  catch { toast('Nejde uložit', 'Paměť prohlížeče je asi plná. Udělej si export.', 'err'); }
}
let upTimer = 0;
function commit({ sync = true, buzz = true } = {}) {
  if (buzz) haptic();
  state.lastUpdated = Date.now();
  persist();
  render();
  if (sync && config.cloudKey) { clearTimeout(upTimer); upTimer = setTimeout(upload, 1500); }
}
function settingsChanged() {
  config.settingsUpdated = Date.now();
  state._settings = settingsSnapshot();
  commit({ buzz: false });
}
const settingsSnapshot = () => ({ updatedAt: config.settingsUpdated, waterGoal: config.waterGoal, drinks: config.drinks, supps: config.customSuplementsList, places: config.places });
function haptic(ms = 12) { if (config.haptics && navigator.vibrate) try { navigator.vibrate(ms); } catch {} }

/* ===== toast (s možností Zpět) ===== */
let toastTimer = 0, toastUndo = null;
function toast(title, msg = '', type = 'info', undo = null) {
  const t = $('#toast');
  toastUndo = undo;
  const icon = { ok: 'check', err: 'alert', sync: 'refresh', info: 'drop' }[type] || 'drop';
  t.className = `toast toast--${type}`;
  t.innerHTML = `<span class="toast__i">${ic(icon)}</span><span class="toast__t"><b>${esc(title)}</b>${msg ? `<small>${esc(msg)}</small>` : ''}</span>${undo ? '<button type="button" data-act="undo">Zpět</button>' : ''}`;
  requestAnimationFrame(() => t.classList.add('on'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.classList.remove('on'); toastUndo = null; }, undo ? 4500 : 3000);
}

/* ===== hlavička ===== */
const TITLES = { home: 'Přehled', water: 'Pití', supps: 'Suplementy', food: 'Jídlo', stats: 'Statistiky' };
function renderTop() {
  const h = $('#title'), title = TITLES[ui.tab].toUpperCase();
  if (h.textContent !== title) { h.textContent = title; if (!reduced()) { h.classList.remove('swap'); void h.offsetWidth; h.classList.add('swap'); } }
  const a = ui.active;
  $('#subtitle').textContent = a === TODAY ? 'dnes · ' + dayLabel(a, { weekday: 'long', day: 'numeric', month: 'numeric' })
    : a === addDays(TODAY, -1) ? 'včera · ' + dayLabel(a, { day: 'numeric', month: 'numeric' }) : dayLabel(a);
  $('#pastBar').hidden = a === TODAY || ui.tab === 'stats';
  $('#pastText').textContent = `Zapisuješ do: ${dayLabel(a, { weekday: 'short', day: 'numeric', month: 'numeric' })}`;
  $$('#dock button').forEach((b) => b.classList.toggle('on', b.dataset.tab === ui.tab));
  renderBattery();
  renderSyncBtn();
}
// Kolik zbývá ze dne: 100 % v 7:00 ráno, 0 % v 7:00 dalšího dne
function renderBattery() {
  const m = nowMins(), h = Math.floor(m / 60);
  const passed = m >= 420 ? m - 420 : 1440 - 420 + m;
  const pct = clamp(100 - (passed / 1440) * 100, 0, 100);
  const b = $('#battery');
  b.dataset.phase = h >= 7 && h < 14 ? 'morning' : h >= 14 && h < 21 ? 'day' : 'night';
  $('#batteryFill').style.width = pct + '%';
  $('#batteryText').textContent = Math.round(pct) + '%';
  b.style.setProperty('--w', pct + '%');
}
function renderSyncBtn() {
  const b = $('#syncBtn');
  const icon = { off: 'cloud', busy: 'refresh', ok: 'cloudOk', err: 'cloudOff' }[ui.sync];
  b.dataset.state = ui.sync;
  b.innerHTML = ic(icon, ui.sync === 'busy' ? 'spin' : '');
}

/* ===== přepínání obrazovek ===== */
// Přechod mezi záložkami podle směru v doku: nová obrazovka přijede z té strany a obsah naskočí postupně.
const ORDER = ['home', 'water', 'supps', 'food', 'stats'];
function setTab(t) {
  if (t === ui.tab) { scrollTo({ top: 0, behavior: 'smooth' }); return; }
  const from = $('#view-' + ui.tab), v = $('#view-' + t);
  const dir = ORDER.indexOf(t) > ORDER.indexOf(ui.tab) ? 1 : -1;
  ui.tab = t;
  document.body.dataset.tab = t; // barevný nádech pozadí podle záložky
  if (t === 'home') ui.shownPct = null; // znovu dopočítat procenta
  // stará obrazovka zmizí hned – dvě přes sebe prolínané obrazovky dělaly na iPhonu „ghosting“
  from.hidden = true;
  scrollTo({ top: 0 });
  v.hidden = false;
  v.style.setProperty('--dir', dir);
  v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter');
  clearTimeout(setTab.t); setTab.t = setTimeout(() => v.classList.remove('enter'), 900); // jinak by se animace spouštěla při každém překreslení
  render();
  moveLamp();
}
// lampička v doku jezdí za aktivní záložkou
function moveLamp(instant) {
  const b = $(`#dock button[data-tab="${ui.tab}"]`), lamp = $('#lamp');
  if (!b || !lamp) return;
  lamp.classList.toggle('instant', !!instant);
  lamp.style.transform = `translateX(${b.offsetLeft + b.offsetWidth / 2}px)`;
}
addEventListener('resize', () => moveLamp(true));
// odlétající „+900 ml“ od tlačítka
function floatText(from, text, cls = '') {
  if (!from || reduced()) return;
  const r = from.getBoundingClientRect(), s = document.createElement('span');
  s.className = 'floaty ' + cls; s.textContent = text;
  s.style.left = r.left + r.width / 2 + 'px'; s.style.top = r.top + 'px';
  document.body.appendChild(s);
  setTimeout(() => s.remove(), 900);
}
// číslo naběhne od nuly (velká čísla nahoře v záložce)
function countUp(el, to, suffix = '') {
  if (!el || reduced() || !to) return;
  const t0 = performance.now(), dur = 700;
  const step = (t) => {
    const p = clamp((t - t0) / dur, 0, 1);
    el.textContent = Math.round(to * (1 - Math.pow(1 - p, 4))) + suffix;
    if (p < 1 && el.isConnected) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
// řádek nejdřív odjede, pak se smaže
function rowOut(btn, fn) {
  const row = btn.closest('.row');
  if (!row || reduced()) { fn(); return; }
  row.classList.add('out');
  setTimeout(fn, 200);
}
function setActive(k) {
  ui.active = k > TODAY ? TODAY : k;
  ui.weekStart = mondayOf(ui.active);
  ui.shownPct = null;
  ui.food = null;
  render();
}

function render() {
  renderTop();
  ({ home: renderHome, water: renderWater, supps: renderSupps, food: renderFood, stats: renderStats })[ui.tab]();
  const v = $('#view-' + ui.tab);
  [...v.children].forEach((c, i) => c.style.setProperty('--n', i)); // pořadí pro postupné naskočení
  if (v.classList.contains('enter')) countUp($('.head__num b', v), parseInt($('.head__num b', v)?.textContent) || 0);
  ui.pop = null; ui.newId = null; ui.popStar = 0;
}

/* ===== PŘEHLED ===== */
function streakInfo() {
  const ok = (k) => dayWater(getDay(k)) >= goal();
  let cur = 0, k = ok(TODAY) ? TODAY : addDays(TODAY, -1);
  while (ok(k)) { cur++; k = addDays(k, -1); }
  let best = 0, run = 0;
  for (let d = firstDay(); d <= TODAY; d = addDays(d, 1)) { run = ok(d) ? run + 1 : 0; best = Math.max(best, run); }
  return { cur, best };
}
function weekRow() {
  let html = '';
  for (let i = 0; i < 7; i++) {
    const k = addDays(ui.weekStart, i), d = getDay(k), future = k > TODAY;
    const p = clamp(dayWater(d) / goal(), 0, 1), full = p >= 1;
    const ss = suppStats(d), meals = new Set(foods(d).map((f) => f.category)).size;
    const C = 2 * Math.PI * 15;
    html += `<button type="button" class="day${k === ui.active ? ' on' : ''}${k === TODAY ? ' today' : ''}${full ? ' full' : ''}" data-act="day" data-k="${k}" ${future ? 'disabled' : ''}>
      <span class="day__ring"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15" class="bg"/><circle cx="18" cy="18" r="15" class="fg" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - p)}"/></svg>${full ? ic('check') : `<b>${parseDay(k).getDate()}</b>`}</span>
      <span class="day__l">${DAY_SHORT[i]}</span>
      <span class="day__dots"><i class="${ss.target && ss.done >= ss.target ? 'p' : ''}"></i><i class="${meals >= 3 ? 'f' : ''}"></i></span>
    </button>`;
  }
  return html;
}
function weekLabel() {
  const diff = Math.round((parseDay(mondayOf(TODAY)) - parseDay(ui.weekStart)) / 864e5 / 7);
  if (diff === 0) return 'Tento týden';
  if (diff === 1) return 'Minulý týden';
  const a = parseDay(ui.weekStart), b = parseDay(addDays(ui.weekStart, 6));
  return `${a.getDate()}. ${a.getMonth() + 1}. – ${b.getDate()}. ${b.getMonth() + 1}.`;
}
// Kolik bys měl mít vypito podle času (7:00 → 0 %, 21:00 → 100 %)
const paceTarget = () => Math.round(goal() * clamp((nowMins() - 420) / (840), 0, 1));

// dávky, které ještě nejsou vzaté (u každého suplementu ta další), seřazené podle času
function pendingDoses(d, k) {
  const list = [];
  for (const s of config.customSuplementsList) {
    const n = doses(d, s.id).length;
    if (n < s.frequency) list.push({ s, i: n, t: s.customTimes[n], late: k === TODAY && toMins(s.customTimes[n]) !== null && toMins(s.customTimes[n]) + 30 < nowMins() });
  }
  return list.sort((a, b) => (toMins(a.t) ?? 9999) - (toMins(b.t) ?? 9999));
}
const nextDose = (d, k) => pendingDoses(d, k)[0];

function renderHome() {
  const k = ui.active, d = getDay(k), w = dayWater(d), g = goal();
  const pct = Math.round((w / g) * 100);
  const { cur } = streakInfo();
  const ss = suppStats(d), pend = pendingDoses(d, k);
  ui.suppPick = clamp(ui.suppPick || 0, 0, Math.max(0, pend.length - 1));
  const nd = pend[ui.suppPick];
  const fs = foods(d), has = (c) => fs.some((f) => f.category === c);
  const snacks = fs.filter((f) => f.category === 'Svačina').length;
  let pace = '';
  if (k === TODAY && w < g) {
    const diff = w - paceTarget();
    pace = Math.abs(diff) < 100 ? 'Držíš tempo' : diff > 0 ? `Napřed o ${fmtMl(diff)}` : `Pozadu o ${fmtMl(-diff)}`;
  } else if (w >= g) pace = pct >= 130 ? 'Splněno s rezervou' : 'Cíl splněn';
  const last = fs[fs.length - 1], lastS = last && foodSplit(last);
  const v = $('#view-home');
  v.innerHTML = `
  <div class="week" id="weekCard">
    <div class="week__head">
      <button type="button" class="streak" data-act="streak" aria-label="Série dní">${ic('flame')}<b>${cur}</b><span>${plural(cur, 'den', 'dny', 'dní')}</span></button>
      <div class="week__nav"><button type="button" class="ibtn ghost" data-act="week" data-d="-1" aria-label="Předchozí týden">${ic('chevL')}</button>
      <span>${weekLabel()}</span>
      <button type="button" class="ibtn ghost" data-act="week" data-d="1" aria-label="Další týden" ${ui.weekStart >= mondayOf(TODAY) ? 'disabled' : ''}>${ic('chevR')}</button></div>
    </div>
    <div class="week__row${ui.weekDir ? ` slide${ui.weekDir > 0 ? 'R' : 'L'}` : ''}">${weekRow()}</div>
  </div>

  <div class="orbwrap">
    <button type="button" class="orb" id="orb" aria-label="Kapka – vypito ${pct} %">
      <canvas class="orb__water" id="water" aria-hidden="true"></canvas>
      <canvas class="orb__eyes" id="eyes" width="120" height="60"></canvas>
      <b class="orb__pct" id="orbPct">0%</b>
    </button>
    <p class="orb__sub"><span class="num">${fmtMl(w)}</span> z ${fmtMl(g)}</p>
    ${pace ? `<p class="pace ${pace.startsWith('Pozadu') ? 'warn' : 'okc'}">${pace}</p>` : ''}
  </div>

  <div class="quick">${config.drinks.map((dr) => `<button type="button" class="qd" data-act="drink" data-id="${esc(dr.id)}" aria-label="${esc(dr.name)} ${dr.ml} ml">${ic(dr.icon)}<span>${esc(dr.name)}</span><small class="num">+${dr.ml}</small></button>`).join('')}</div>

  <div class="group">
    <div class="grow grow--supp" id="suppRow">
      <button type="button" class="grow__main" data-act="tab" data-tab="supps">
        <span class="gi">${ic('pill')}</span>
        <span class="grow__t"><b>Suplementy</b><small class="${nd?.late ? 'warn' : ''}${ui.suppDir ? ` slide${ui.suppDir > 0 ? 'R' : 'L'}` : ''}">${nd ? `${esc(nd.s.name)} · ${esc(nd.t)}` : ss.target ? 'Všechno vzato' : 'Zatím žádné'}</small>
          ${pend.length > 1 ? `<span class="pick" aria-hidden="true">${pend.map((_, i) => `<i class="${i === ui.suppPick ? 'on' : ''}"></i>`).join('')}</span>` : ''}</span>
        <span class="frac num">${ss.done}<i>/${ss.target}</i></span>
      </button>
      ${nd ? `<button type="button" class="take" data-act="dose" data-id="${esc(nd.s.id)}" data-i="${nd.i}">Vzít</button>` : ''}
    </div>
    <button type="button" class="grow grow--food" data-act="tab" data-tab="food">
      <span class="gi">${ic('food')}</span>
      <span class="grow__t"><b>Jídlo</b><small>${last ? `${esc(foodEmoji(last))} ${esc(lastS.detail || lastS.place)}` : 'Nic zapsáno'}${snacks ? ` · +${snacks} ${plural(snacks, 'svačina', 'svačiny', 'svačin')}` : ''}</small></span>
      <span class="meals" aria-label="Snídaně, oběd, večeře">${['Snídaně', 'Oběd', 'Večeře'].map((c) => `<i class="${has(c) ? 'on' : ''}" title="${c}"></i>`).join('')}</span>
    </button>
  </div>`;
  swipe($('#weekCard'), (dir) => moveWeek(dir));
  // švihnutím do strany vybíráš, kterou dávku vezmeš
  swipe($('#suppRow'), (dir) => {
    if (pend.length < 2) return;
    ui.suppPick = (ui.suppPick + dir + pend.length) % pend.length; ui.suppDir = dir; haptic(); render(); ui.suppDir = 0;
  });
  const orb = $('#orb');
  fitOrb();
  orb.addEventListener('click', pokeOrb);
  orb.addEventListener('pointermove', stirOrb, { passive: true });
  setOrb(pct);
}
function setOrb(pct) {
  const el = $('#orbPct'); if (!el) return;
  const level = clamp(pct, 0, 100);
  W.target = level / 100;
  const from = ui.shownPct ?? 0;
  ui.shownPct = pct;
  eyesMood();
  if (from === pct || reduced()) { el.textContent = pct + '%'; return; }
  const t0 = performance.now(), dur = 900;
  const step = (t) => {
    const p = clamp((t - t0) / dur, 0, 1), e = 1 - Math.pow(1 - p, 4);
    el.textContent = Math.round(from + (pct - from) * e) + '%';
    if (p < 1 && document.body.contains(el)) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function moveWeek(dir) {
  const ns = addDays(ui.weekStart, dir * 7);
  if (ns > mondayOf(TODAY)) return;
  haptic();
  ui.weekStart = ns;
  ui.weekDir = dir;
  render();
  ui.weekDir = 0;
}

/* ===== voda v kapce: hladina z pružin (po napití se rozvlní a dohoupe), výška vody na pružině, bublinky ===== */
const W = { level: 0, target: 0, vel: 0, t: 0, cols: Array.from({ length: 34 }, () => ({ h: 0, v: 0 })), bubbles: [] };
function splashWater() {
  if (reduced()) return;
  const n = W.cols.length, c = Math.floor(n * (0.3 + Math.random() * 0.4));
  for (let i = -4; i <= 4; i++) { const col = W.cols[c + i]; if (col) col.v += 70 * (1 - Math.abs(i) / 5); } // dopad doprostřed
  for (let i = 0; i < 14; i++) W.bubbles.push({ x: 0.3 + Math.random() * 0.4, y: 1.02 + Math.random() * 0.25, r: 1.5 + Math.random() * 3, s: 0.25 + Math.random() * 0.35, ph: Math.random() * 6 });
}
function pokeWater(fx, power) {
  if (reduced()) return;
  const n = W.cols.length, c = Math.round(clamp(fx, 0, 1) * (n - 1));
  for (let i = -3; i <= 3; i++) { const col = W.cols[c + i]; if (col) col.v += power * (1 - Math.abs(i) / 4); }
  if (power > 40) for (let i = 0; i < 6; i++) W.bubbles.push({ x: clamp(fx + (Math.random() - 0.5) * 0.15, 0.1, 0.9), y: 1.02 + Math.random() * 0.1, r: 1 + Math.random() * 2.5, s: 0.3 + Math.random() * 0.3, ph: Math.random() * 6 });
}
function waterFrame(dt) {
  const cv = $('#water'); if (!cv || !dt) return;
  const S = cv.clientWidth, dpr = Math.min(2, devicePixelRatio || 1);
  if (!S) return;
  if (cv.width !== Math.round(S * dpr)) { cv.width = cv.height = Math.round(S * dpr); }
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, S, S);
  W.t += dt;
  // výška hladiny – pružina (tuhost 40, tlumení 9 → lehce přejede a usadí se)
  const acc = (W.target - W.level) * 40 - W.vel * 9; W.vel += acc * dt; W.level += W.vel * dt;
  if (reduced()) { W.level = W.target; W.vel = 0; }
  // vlny – každý sloupec je pružina, vlna se šíří do sousedů
  const C = W.cols, n = C.length;
  for (const c of C) { c.v += (-c.h * 90 - c.v * 3.2) * dt; c.h += c.v * dt; }
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < n; i++) {
    if (i > 0) { const d = (C[i].h - C[i - 1].h) * 0.18; C[i - 1].v += d; }
    if (i < n - 1) { const d = (C[i].h - C[i + 1].h) * 0.18; C[i + 1].v += d; }
  }
  const lvl = clamp(W.level, 0, 1.05);
  if (lvl <= 0.003 && !W.bubbles.length) { W.surfAt = () => S + 99; const pct = $('#orbPct'); if (pct) pct.style.setProperty('--cut', '999px'); return; }
  const top = S * (1 - lvl * 1.02), tilt = Math.sin(W.t * 0.7) * 2;
  const surf = (x, k, ph) => { const i = clamp(Math.round((x / S) * (n - 1)), 0, n - 1);
    return top + C[i].h * k + Math.sin(x * 0.045 + W.t * 1.9 + ph) * 2.2 + Math.sin(x * 0.018 - W.t * 1.1 + ph) * 1.6 + (x / S - 0.5) * tilt; };
  const shape = (k, ph) => { g.beginPath(); g.moveTo(0, S); for (let x = 0; x <= S; x += 4) g.lineTo(x, surf(x, k, ph)); g.lineTo(S, S); g.closePath(); };
  // zadní vlna (světlejší), přední voda s hloubkou
  shape(0.6, 2.4); g.fillStyle = 'rgba(26,111,191,.32)'; g.fill();
  shape(1, 0);
  const grd = g.createLinearGradient(0, top - 6, 0, S);
  grd.addColorStop(0, '#4C97DD'); grd.addColorStop(0.35, '#1A6FBF'); grd.addColorStop(1, '#0D3F75');
  g.fillStyle = grd; g.fill();
  // světlo pod hladinou (kaustika)
  g.save(); g.clip();
  const cx = S * (0.35 + Math.sin(W.t * 0.5) * 0.08), rg = g.createRadialGradient(cx, top + 18, 4, cx, top + 18, S * 0.45);
  rg.addColorStop(0, 'rgba(255,255,255,.22)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, S, S);
  // bublinky
  if (lvl > 0.06 && Math.random() < dt * 1.4) W.bubbles.push({ x: 0.2 + Math.random() * 0.6, y: 1.02, r: 1 + Math.random() * 2, s: 0.12 + Math.random() * 0.15, ph: Math.random() * 6 });
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1;
  W.bubbles = W.bubbles.filter((b) => {
    b.y -= b.s * dt; const bx = (b.x + Math.sin(W.t * 3 + b.ph) * 0.012) * S, by = b.y * S;
    if (by < surf(bx, 1, 0) + b.r) return false;
    g.beginPath(); g.arc(bx, by, b.r, 0, 7); g.stroke(); return true;
  });
  g.restore();
  // lesklá linka hladiny
  g.beginPath(); for (let x = 0; x <= S; x += 4) { const y = surf(x, 1, 0); x ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.6; g.stroke();
  W.surfAt = (x) => surf(x, 1, 0);
  // text procent se přebarví přesně na hladině (nad vodou tmavý, pod ní bílý)
  const pct = $('#orbPct'); if (pct) pct.style.setProperty('--cut', (surf(S / 2, 1, 0) - pct.offsetTop) + 'px');
}

/* ===== vzhled: tmavý (výchozí) / světlý / podle telefonu ===== */
let INK = '#F5F0E8';
const darkMQ = matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  const t = config.theme === 'auto' ? (darkMQ.matches ? 'dark' : 'light') : config.theme;
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('trackerrr_theme', t); } catch {}
  INK = t === 'light' ? '#10233D' : '#F5F0E8';
  $('meta[name="theme-color"]').setAttribute('content', t === 'light' ? '#F5F0E8' : '#0B1626');
}
darkMQ.addEventListener?.('change', () => { if (config.theme === 'auto') applyTheme(); });
applyTheme();

/* ===== robotí oči v kapce (tečkové oči rodiny jendovyapky, styl Cozmo) =====
   Každé oko = zaoblený obdélník z teček. Horní víčko se dá naklonit (smutek, ospalost), spodní ho zezdola
   ukusuje do obloučku (radost ∩). Oči těkají, sledují prst, mrkají (i dvakrát) a reagují na pití a dotek. */
const EW = 120, EH = 60; // velikost plátna očí v CSS px
const EYE = { lx: 0, ly: 0, w: 1, h: 1, lid: 0, tilt: 0, joy: 0 }, TGT = { lx: 0, ly: 0, w: 1, h: 1, lid: 0, tilt: 0, joy: 0 };
let blinkAt = -9e9, blinkTwice = false, nextBlink = 1500, nextLook = 0, followUntil = 0, hop = 0, hopV = 0, moodUntil = 0, moodNow = 'normal';
const MOODS = {
  normal: { w: 1, h: 1, lid: 0, tilt: 0, joy: 0 },
  thirsty: { w: 1, h: 0.95, lid: 0.28, tilt: 0.45, joy: 0 },      // víčka spadlá ven = smutné
  happy: { w: 1.04, h: 1, lid: 0, tilt: 0, joy: 0.55 },
  wide: { w: 1.12, h: 1.18, lid: 0, tilt: 0, joy: 0 },            // překvapení
  sleepy: { w: 1.02, h: 0.9, lid: 0.55, tilt: -0.15, joy: 0 },
  proud: { w: 1.06, h: 1.02, lid: 0.1, tilt: -0.2, joy: 0.45 },  // cíl splněn – spokojeně přimhouřené
};
function baseMood() {
  const p = ui.shownPct ?? 0, h = new Date().getHours();
  if (h >= 23 || h < 6) return 'sleepy';
  return p >= 100 ? 'proud' : p < 25 ? 'thirsty' : 'normal';
}
function setMood(m, ms = 0) { moodNow = m; moodUntil = ms ? performance.now() + ms : 0; Object.assign(TGT, MOODS[m]); }
function eyesMood() { if (performance.now() > moodUntil) setMood(baseMood()); }
function eyesJoy() { // napil ses: překvapení → radost → poskok
  setMood('wide', 260); hopV = -260;
  setTimeout(() => setMood('happy', 1500), 260);
}
function eyesBlink(twice) { blinkAt = performance.now(); blinkTwice = twice; }
function drawEye(g, cx, cy, side, under) {
  const P = 3.7, R = 1.3; // rozteč a velikost teček (jemná LED matice)
  const w = 27 * EYE.w, hh = 33 * EYE.h;
  const t = performance.now() - blinkAt, bl = blinkTwice ? 360 : 170;
  const blink = t >= 0 && t < bl ? Math.abs(Math.cos(((t % 170) / 170) * Math.PI)) : 1;
  const h = Math.max(3, hh * blink), r = Math.min(w, h) * 0.3;
  for (let y = -P * 5; y <= P * 5; y += P) for (let x = -P * 4; x <= P * 4; x += P) {
    const ax = Math.abs(x), ay = Math.abs(y);
    if (ax > w / 2 || ay > h / 2) continue;
    const dx = Math.max(0, ax - (w / 2 - r)), dy = Math.max(0, ay - (h / 2 - r));
    if (Math.hypot(dx, dy) > r) continue;
    // horní víčko nakloněné k vnějšímu kraji (side = -1 levé oko, 1 pravé)
    if (y < -h / 2 + EYE.lid * h + EYE.tilt * (x * side) * 0.45) continue;
    // radost: spodek oka ukousnutý obloukem → ∩
    if (EYE.joy > 0.02 && y > h / 2 - EYE.joy * h * 0.95 - EYE.joy * h * 0.6 * (1 - (x / (w / 2)) ** 2)) continue;
    const px = cx + x, py = cy + y;
    g.fillStyle = under && under(px, py) ? '#F5F0E8' : INK; // pod hladinou světlé
    g.globalAlpha = 0.18; g.beginPath(); g.arc(px, py, R * 2.2, 0, 7); g.fill(); // jemná záře jako LED
    g.globalAlpha = 1; g.beginPath(); g.arc(px, py, R, 0, 7); g.fill();
  }
}
let lastT = 0;
function eyesFrame(t) {
  const dt = Math.min(0.033, (t - (lastT || t)) / 1000); lastT = t;
  if (!document.hidden) waterFrame(dt);
  const cv = $('#eyes'), orb = $('#orb');
  if (cv && orb && !document.hidden) {
    const g = cv.getContext('2d'), dpr = Math.min(2, devicePixelRatio || 1);
    if (cv.width !== EW * dpr) { cv.width = EW * dpr; cv.height = EH * dpr; }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    eyesMood();
    // mrkání (občas dvakrát rychle za sebou), ospalé oči mrkají častěji
    if (t > nextBlink) { eyesBlink(Math.random() < 0.22); nextBlink = t + (moodNow === 'sleepy' ? 1800 : 2600) + Math.random() * 3400; }
    // těkání očima: rychlý skok na nový bod (sakáda), mezi tím klid; když se ťuká nebo táhne, sledují prst
    if (t > nextLook && t > followUntil) {
      TGT.lx = Math.random() < 0.25 ? 0 : (Math.random() - 0.5) * 16; TGT.ly = (Math.random() - 0.5) * 6;
      if (moodNow === 'thirsty') TGT.ly = 3 + Math.random() * 2; // smutně kouká dolů
      nextLook = t + 900 + Math.random() * 2600;
    }
    const fast = 1 - Math.pow(0.0009, dt), slow = 1 - Math.pow(0.004, dt); // nezávislé na fps
    for (const key in TGT) EYE[key] += (TGT[key] - EYE[key]) * (key === 'lx' || key === 'ly' ? fast : slow);
    // poskok na pružině, dýchání a naklonění kapky za pohledem
    hopV += (-hop * 520 - hopV * 14) * dt; hop += hopV * dt;
    if (!reduced()) {
      const breathe = Math.sin(t / 900) * 0.012;
      orb.style.translate = `0 ${hop.toFixed(2)}px`;
      orb.style.scale = `${(1 + breathe - hop * 0.002).toFixed(4)} ${(1 - breathe + hop * 0.003).toFixed(4)}`;
      orb.style.rotate = `${(EYE.lx * 0.18).toFixed(2)}deg`;
    }
    g.clearRect(0, 0, EW, EH);
    const sc = cv.clientWidth / EW, ox = cv.offsetLeft, oy = cv.offsetTop; // oči se zmenšují s kapkou
    const under = W.surfAt ? (x, y) => oy + y * sc > W.surfAt(ox + x * sc) : null;
    drawEye(g, EW / 2 - 21 + EYE.lx, EH / 2 + EYE.ly, -1, under);
    drawEye(g, EW / 2 + 21 + EYE.lx, EH / 2 + EYE.ly, 1, under);
  }
  requestAnimationFrame(eyesFrame);
}
requestAnimationFrame(eyesFrame);
// oči sledují prst kdekoliv na přehledu
function lookAt(x, y) {
  const orb = $('#orb'); if (!orb || ui.tab !== 'home') return;
  const r = orb.getBoundingClientRect(), dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height * 0.4);
  const d = Math.hypot(dx, dy) || 1;
  TGT.lx = (dx / d) * Math.min(9, d / 14); TGT.ly = (dy / d) * Math.min(4, d / 30);
  followUntil = performance.now() + 1400; nextLook = followUntil;
}
addEventListener('pointermove', (e) => lookAt(e.clientX, e.clientY), { passive: true });
addEventListener('pointerdown', (e) => lookAt(e.clientX, e.clientY), { passive: true });
// ťuknutí do kapky: poskočí, zasměje se a voda se v tom místě rozčeří; tažením prstu dělá vlny
function pokeOrb(e) {
  const r = e.currentTarget.getBoundingClientRect();
  haptic(18);
  pokeWater((e.clientX - r.left) / r.width, 60);
  hopV = -200; setMood('happy', 900);
  if (Math.random() < 0.3) setTimeout(() => eyesBlink(true), 300);
}
function stirOrb(e) {
  if (e.pointerType === 'mouse' && !e.buttons) return;
  const r = e.currentTarget.getBoundingClientRect();
  pokeWater((e.clientX - r.left) / r.width, Math.min(30, Math.abs(e.movementX || 0) * 3 + 4));
}

/* ===== PITÍ ===== */
function logWater(ml, type) {
  ml = parseInt(ml); if (!ml) return;
  const k = ui.active, d = mutDay(k), id = newId();
  d.waterLogs.push({ id, amount: ml, type, time: hm(Date.now()) });
  ui.newId = id;
  d.water = dayWater(d);
  const before = Math.round(((d.water - ml) / goal()) * 100), after = Math.round((d.water / goal()) * 100);
  commit();
  eyesJoy();
  splashWater();
  const orb = $('.orb'); if (orb && !reduced()) { orb.classList.remove('splash'); void orb.offsetWidth; orb.classList.add('splash'); }
  if (before < 100 && after >= 100) toast('Cíl splněn 💧', `${fmtMl(d.water)} – tak se to dělá.`, 'ok', () => removeWater(k, id, true));
  else toast(`+${ml} ml`, `${type} · celkem ${fmtMl(d.water)}`, 'info', () => removeWater(k, id, true));
}
function removeWater(k, id, quiet) {
  const d = mutDay(k), it = d.waterLogs.find((l) => l.id === id);
  if (!it) return;
  tomb(id);
  d.waterLogs = d.waterLogs.filter((l) => l.id !== id);
  d.water = dayWater(d);
  commit();
  if (!quiet) toast('Smazáno', `${it.type} ${it.amount} ml`, 'info', () => {
    DEL.delete(id); d.waterLogs.push(it); d.waterLogs.sort((a, b) => a.id - b.id); d.water = dayWater(d); commit();
  });
}
const drinkIcon = (type) => (config.drinks.find((x) => x.name === type) || {}).icon
  || (/monster|energ|red ?bull/i.test(type) ? 'can' : /stanley|cup/i.test(type) ? 'cup' : /káv|kafe|coffee|čaj/i.test(type) ? 'coffee' : 'drop');

function renderWater() {
  const k = ui.active, d = getDay(k), w = dayWater(d), g = goal(), logs = waterLogs(d);
  const v = $('#view-water');
  v.innerHTML = `
  <div class="head">
    <div class="head__num"><b class="dot">${w}</b><span class="num">/ ${g} ml</span></div>
    <div class="bar bar--lg"><i style="width:${clamp((w / g) * 100, 0, 100)}%"></i>${k === TODAY && w < g ? `<em style="left:${(paceTarget() / g) * 100}%" title="Kolik bys měl mít teď"></em>` : ''}</div>
    <p class="head__hint">${w >= g ? `Splněno${w > g ? `, o ${fmtMl(w - g)} navíc` : ''}` : `Zbývá ${fmtMl(g - w)}${k === TODAY ? `. Touhle dobou bys měl mít ${fmtMl(paceTarget())}.` : ''}`}</p>
  </div>

  <div class="drinks">
    ${config.drinks.map((dr) => `<button type="button" class="drink" data-act="drink" data-id="${esc(dr.id)}">${ic(dr.icon)}<b>${esc(dr.name)}</b><small class="num">${dr.ml} ml</small></button>`).join('')}
    <button type="button" class="drink drink--custom${ui.customOpen ? ' on' : ''}" data-act="customToggle">${ic('plus')}<b>Vlastní</b><small>vybrat objem</small></button>
  </div>

  <div class="card custom" ${ui.customOpen ? '' : 'hidden'}>
    <div class="custom__top"><span>Vlastní množství</span><b class="dot" id="customVal">${ui.customMl} ml</b></div>
    <input type="range" class="range" id="customRange" min="10" max="2000" step="10" value="${ui.customMl}" style="--p:${(ui.customMl - 10) / 19.9}%">
    <div class="custom__presets">${[100, 200, 330, 750, 1000].map((m) => `<button type="button" data-act="customSet" data-ml="${m}">${m}</button>`).join('')}</div>
    <button type="button" class="btn btn--water" data-act="customAdd">Přidat ${ui.customMl} ml</button>
  </div>

  <h3 class="sec">Vypito <span class="num">${logs.length}×</span></h3>
  <div class="group">${logs.length ? logs.slice().reverse().map((l) => `
    <div class="row${l.id === ui.newId ? ' new' : ''}">
      <span class="gi">${ic(drinkIcon(l.type))}</span>
      <span class="row__t"><b>${esc(l.type)}</b><small class="num">${esc(l.time || hm(l.id))}</small></span>
      <b class="row__v num">${l.amount} ml</b>
      <button type="button" class="ibtn ghost" data-act="rmWater" data-id="${l.id}" aria-label="Smazat ${esc(l.type)}">${ic('x')}</button>
    </div>`).join('') : '<p class="empty">Zatím nic. Ťukni na pití nahoře.</p>'}</div>`;
  const r = $('#customRange');
  if (r) r.addEventListener('input', () => {
    ui.customMl = +r.value;
    r.style.setProperty('--p', ((r.value - 10) / 19.9) + '%');
    $('#customVal').textContent = r.value + ' ml';
    $('[data-act="customAdd"]').textContent = `Přidat ${r.value} ml`;
  });
}

/* ===== SUPLEMENTY ===== */
function toggleDose(id, i) {
  const s = config.customSuplementsList.find((x) => x.id === id); if (!s) return;
  const k = ui.active, d = mutDay(k), list = doses(d, id);
  d.vitamins[id] ||= [];
  if (i < list.length) {
    tomb(list[i]);
    d.vitamins[id] = d.vitamins[id].filter((t) => t !== list[i]);
    commit();
  } else {
    // časová značka = teď; u minulého dne naplánovaný čas toho dne (+ náhodné ms, ať je jedinečná)
    let ts = Date.now();
    if (k !== TODAY) { const m = toMins(s.customTimes[list.length]) ?? 720; const dd = parseDay(k); dd.setHours(Math.floor(m / 60), m % 60, 0, Math.floor(Math.random() * 999)); ts = dd.getTime() + (Date.now() % 60000); }
    d.vitamins[id].push(ts);
    ui.pop = id + ':' + list.length;
    commit();
    const ss = suppStats(d);
    if (ss.target && ss.done >= ss.target) toast('Všechno vzato 💊', 'Suplementy na dnešek hotové.', 'ok');
  }
}
function renderSupps() {
  const k = ui.active, d = getDay(k), ss = suppStats(d), nm = nowMins();
  const v = $('#view-supps');
  v.innerHTML = `
  <div class="head">
    <div class="head__num"><b class="dot">${ss.done}</b><span class="num">/ ${ss.target} ${plural(ss.target, 'dávka', 'dávky', 'dávek')}</span></div>
    <div class="bar bar--lg"><i style="width:${ss.target ? (ss.done / ss.target) * 100 : 0}%"></i></div>
  </div>
  <div class="group">${config.customSuplementsList.map((s) => {
    const list = doses(d, s.id);
    return `<div class="supp${list.length >= s.frequency ? ' done' : ''}">
      <div class="supp__top"><b>${esc(s.name)}${list.length >= s.frequency ? ic('check', 'ok') : ''}</b><button type="button" class="ibtn ghost" data-act="editSupp" data-id="${esc(s.id)}" aria-label="Upravit ${esc(s.name)}">${ic('pencil')}</button></div>
      <div class="supp__doses">${s.customTimes.map((t, i) => {
        const on = i < list.length, late = !on && k === TODAY && toMins(t) !== null && toMins(t) + 30 < nm && i === list.length;
        return `<button type="button" class="dose${on ? ' on' : ''}${late ? ' late' : ''}${ui.pop === s.id + ':' + i ? ' pop' : ''}" data-act="dose" data-id="${esc(s.id)}" data-i="${i}">
          <span>${on ? ic('check') : i + 1}</span><small class="num">${on ? hm(list[i]) : esc(t)}</small></button>`;
      }).join('')}</div>
    </div>`;
  }).join('') || '<p class="empty">Žádné suplementy. Přidej první.</p>'}</div>
  <button type="button" class="btn btn--ghost" data-act="editSupp">${ic('plus')} Přidat suplement</button>`;
}
function openSuppEditor(id) {
  const s = config.customSuplementsList.find((x) => x.id === id);
  const draft = s ? { ...s, customTimes: [...s.customTimes] } : { id: 'c_' + Date.now(), name: '', frequency: 1, customTimes: ['09:00'] };
  const paint = () => {
    $('#sheetBody').innerHTML = `
    <label class="field"><span>Název</span><input id="sName" type="text" maxlength="40" placeholder="např. Vitamin D" value="${esc(draft.name)}"></label>
    <div class="field"><span>Kolikrát denně</span><div class="seg" id="sFreq">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-n="${n}" class="${draft.frequency === n ? 'on' : ''}">${n}×</button>`).join('')}</div></div>
    <div class="field"><span>V kolik</span><div class="times">${draft.customTimes.map((t, i) => `<label class="time"><small>${i + 1}.</small><input type="time" data-i="${i}" value="${esc(t)}"></label>`).join('')}</div></div>
    <button type="button" class="btn btn--supp" id="sSave">${s ? 'Uložit změny' : 'Přidat do seznamu'}</button>
    ${s ? `<button type="button" class="btn btn--danger" id="sDel">${ic('trash')} Smazat suplement</button><p class="note">Historie zůstane, jen se přestane zobrazovat.</p>` : ''}`;
    $('#sName').addEventListener('input', (e) => { draft.name = e.target.value; });
    $$('#sFreq button').forEach((b) => b.addEventListener('click', () => {
      draft.frequency = +b.dataset.n; draft.customTimes = defaultTimes(draft.frequency); haptic(); paint();
    }));
    $$('.times input').forEach((inp) => inp.addEventListener('change', () => { draft.customTimes[+inp.dataset.i] = inp.value || '12:00'; }));
    $('#sSave').addEventListener('click', () => {
      draft.name = draft.name.trim();
      if (!draft.name) { $('#sName').focus(); return; }
      draft.customTimes = draft.customTimes.map((t) => t || '12:00').sort();
      delete draft.preferredTime;
      normSupp(draft);
      if (s) Object.assign(s, draft); else config.customSuplementsList.push(draft);
      closeSheet(); settingsChanged();
      toast(s ? 'Uloženo' : 'Přidáno', draft.name, 'ok');
    });
    if (s) $('#sDel').addEventListener('click', () => {
      if (!confirm(`Smazat ${s.name}?`)) return;
      const idx = config.customSuplementsList.indexOf(s);
      config.customSuplementsList.splice(idx, 1);
      closeSheet(); settingsChanged();
      toast('Smazáno', s.name, 'info', () => { config.customSuplementsList.splice(idx, 0, s); settingsChanged(); });
    });
  };
  openSheet(s ? 'Upravit suplement' : 'Nový suplement', paint);
  if (!s) setTimeout(() => $('#sName')?.focus(), 350);
}

/* ===== JÍDLO ===== */
const CATS = ['Snídaně', 'Svačina', 'Oběd', 'Večeře'];
const EMOJIS = ['🍳', '🥖', '🥪', '🍔', '🍕', '🌭', '🌯', '🥙', '🌮', '🍟', '🍗', '🥩', '🍖', '🥓', '🍣', '🍱', '🍤', '🥟', '🍜', '🍝', '🍛', '🍚', '🍲', '🥘',
  '🥗', '🥣', '🧀', '🥐', '🥯', '🥨', '🥞', '🧇', '🍰', '🍩', '🍪', '🍫', '🍦', '🍎', '🍌', '🥑', '☕', '🧋', '🥤', '🍺', '🍷'];
// Ikonka podle toho, co jsi jedl (pořadí je důležité: druh jídla má přednost před surovinou – „kuřecí bageta“ = 🥖).
const FOOD_GUESS = [
  [/bage|baguet/, '🥖'], [/sendvi|toust|toast|panin|club/, '🥪'], [/burger|big ?mac|mcchick|whopper|cheeseb/, '🍔'], [/pizz/, '🍕'],
  [/hot ?dog|parek|parky|klobas/, '🌭'], [/burrit|wrap|tortil|quesad/, '🌯'], [/kebab|gyros|durum|falaf/, '🥙'], [/taco|nacho/, '🌮'],
  [/sushi|maki|nigiri|poke/, '🍣'], [/bento|onigir/, '🍱'], [/krevet|shrimp|tempur/, '🍤'], [/dumpl|gyoz|knedlic|pirozk|pelmen/, '🥟'],
  [/ramen|pho|nudl|udon|pad ?thai|wok/, '🍜'], [/spaget|testovin|pasta|lasagn|carbon|penne|gnocc|bolon/, '🍝'], [/curry|kari|tikka/, '🍛'],
  [/rizot|ryz|risot/, '🍚'], [/polevk|vyvar|bujon|soup/, '🍲'], [/gulas|svickov|omack|segedin|rajsk/, '🥘'],
  [/salat|caesar|bowl/, '🥗'], [/jogurt|musli|kase|ovesn|granol|cerea/, '🥣'], [/palacin|livan|pancak/, '🥞'], [/vafl|waffl/, '🧇'],
  [/hranol|fries|batatk/, '🍟'], [/rizek|schnitz|kure|kuřec|chick|nugget|wings|kridel|krid/, '🍗'], [/steak|hovez|vepr|maso|pecen|zebir/, '🥩'],
  [/slanin|bacon/, '🥓'], [/smazak|syr|chees/, '🧀'], [/vajic|omelet|miche|vejce|scrambl/, '🍳'], [/croiss|rohlik|pecivo|housk|chleb/, '🥐'],
  [/bagel/, '🥯'], [/preclik|pretzel/, '🥨'], [/dort|zakus|cheesecak|kolac|buchta|struudl|strudl|muff|brownie/, '🍰'], [/donut|kobl/, '🍩'],
  [/susenk|cookie/, '🍪'], [/cokolad|choco/, '🍫'], [/zmrzl|ice ?cream|gelat/, '🍦'], [/ovoce|jablk/, '🍎'], [/banan/, '🍌'], [/avokad|guac/, '🥑'],
  [/kafe|kava|cappu|latte|espres|flat ?white/, '☕'], [/bubble|boba/, '🧋'], [/pivo|beer/, '🍺'], [/vino|wine/, '🍷'],
];
const fold = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const guessEmoji = (t) => { const x = fold(t); if (!x) return ''; for (const [re, e] of FOOD_GUESS) if (re.test(x)) return e; return ''; };
// u starších záznamů (bez ručně vybrané ikonky) se ikonka odhadne z jídla – „Domácí | Kuřecí bageta“ už nebude pánvička
const foodEmoji = (f) => (f.emojiManual ? f.emoji : guessEmoji(foodSplit(f).detail) || f.emoji) || '🍽️';
const DEFAULT_PLACES = [
  { place: 'Domácí', emoji: '🍳' },
  { place: 'Bageterie Boulevard', emoji: '🥖', short: 'BB' },
  { place: "McDonald's", emoji: '🍔', short: 'Mekáč' },
  { place: 'Pizza', emoji: '🍕' },
];
function autoCat() {
  const m = nowMins();
  return m < 630 ? 'Snídaně' : m < 900 ? 'Oběd' : m < 1050 ? 'Svačina' : 'Večeře';
}
function allFoods() {
  const out = [];
  for (const k of Object.keys(state)) if (isDay(k)) for (const f of foods(state[k])) out.push({ ...f, date: k, ...foodSplit(f) });
  return out;
}
function placeStats() {
  const m = new Map();
  for (const f of allFoods()) {
    const p = f.place.trim(); if (!p) continue;
    const key = p.toLowerCase(), o = m.get(key) || { place: p, emoji: f.emoji, n: 0, stars: 0, last: '' };
    o.n++; o.stars += +f.stars || 0;
    if (f.date >= o.last) { o.last = f.date; o.emoji = f.emoji || o.emoji; }
    m.set(key, o);
  }
  return [...m.values()].map((o) => ({ ...o, avg: o.stars / o.n }));
}
function quickPlaces() {
  const stats = placeStats().sort((a, b) => b.n - a.n || (b.last > a.last ? 1 : -1));
  const out = [...DEFAULT_PLACES];
  for (const s of stats) {
    if (out.length >= 8) break;
    if (!out.some((p) => p.place.toLowerCase() === s.place.toLowerCase())) out.push({ place: s.place, emoji: s.emoji });
  }
  return out;
}
function newFoodDraft() { return { cat: autoCat(), place: 'Domácí', detail: '', emoji: '🍳', placeEmoji: '🍳', manual: false, stars: 5, edit: null, emojiOpen: false }; }
function renderFood() {
  const k = ui.active, fs = foods(getDay(k));
  const F = ui.food || (ui.food = newFoodDraft());
  const v = $('#view-food');
  v.innerHTML = `
  <div class="card foodform${F.edit ? ' editing' : ''}">
    ${F.edit ? `<div class="editing__bar">${ic('pencil')} Upravuješ záznam<button type="button" data-act="foodCancel">Zrušit</button></div>` : ''}
    <div class="seg seg--food">${CATS.map((c) => `<button type="button" data-act="foodCat" data-c="${c}" class="${F.cat === c ? 'on' : ''}">${c}</button>`).join('')}</div>
    <div class="chips">${quickPlaces().map((p) => `<button type="button" data-act="foodPlace" data-p="${esc(p.place)}" data-e="${esc(p.emoji)}" class="${F.place.toLowerCase() === p.place.toLowerCase() ? 'on' : ''}">${esc(p.emoji)} ${esc(p.short || p.place)}</button>`).join('')}</div>
    <div class="foodin">
      <button type="button" class="emoji" data-act="foodEmoji" aria-label="Vybrat ikonku">${esc(F.emoji)}</button>
      <input id="fPlace" type="text" maxlength="40" placeholder="Podnik" value="${esc(F.place)}" autocomplete="off">
    </div>
    <div class="emojis" ${F.emojiOpen ? '' : 'hidden'}>${EMOJIS.map((e) => `<button type="button" data-act="foodEmojiSet" data-e="${e}">${e}</button>`).join('')}</div>
    <input id="fDetail" class="in" type="text" maxlength="80" placeholder="Co jsi měl? (BigMac, kuřecí bageta…)" value="${esc(F.detail)}" autocomplete="off">
    <div class="rate"><span>Chuť</span><div class="stars">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-act="foodStars" data-n="${n}" style="--s:${n}" class="${n <= F.stars ? 'on' : ''}${n <= ui.popStar ? ' pop' : ''}" aria-label="${n} z 5">${ic('star')}</button>`).join('')}</div></div>
    <button type="button" class="btn btn--food" data-act="foodSave">${F.edit ? 'Uložit změny' : 'Uložit jídlo'}</button>
  </div>

  <h3 class="sec">${ui.active === TODAY ? 'Dnes' : dayLabel(ui.active, { weekday: 'short', day: 'numeric', month: 'numeric' })} <span class="num">${fs.length}</span></h3>
  <div class="group">${fs.length ? fs.map((f) => { const s = foodSplit(f); return `
    <div class="row${F.edit === f.id ? ' sel' : ''}${f.id === ui.newId ? ' new' : ''}">
      <span class="row__e">${esc(foodEmoji(f))}</span>
      <button type="button" class="row__t" data-act="foodEdit" data-id="${f.id}" aria-label="Upravit"><small class="cat">${esc(f.category)} · <span class="num">${esc(f.time || hm(f.id))}</span></small><b>${esc(s.detail || s.place)}</b>${s.detail && s.place ? `<small>${esc(s.place)}</small>` : ''}</button>
      ${starsRow(+f.stars || 0)}
      <button type="button" class="ibtn ghost" data-act="rmFood" data-id="${f.id}" aria-label="Smazat">${ic('x')}</button>
    </div>`; }).join('') : '<p class="empty">Zatím žádné jídlo.</p>'}</div>
  <button type="button" class="btn btn--ghost" data-act="history">${ic('clock')} Historie a podniky</button>`;
  $('#fPlace').addEventListener('input', (e) => { F.place = e.target.value; });
  $('#fDetail').addEventListener('input', (e) => {
    F.detail = e.target.value;
    if (F.manual) return; // ručně vybranou ikonku nepřepisovat
    const em = guessEmoji(F.detail) || F.placeEmoji || F.emoji;
    if (em !== F.emoji) { F.emoji = em; const b = $('.emoji'); if (b) { b.textContent = em; b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); } }
  });
  $('#fDetail').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); saveFood(); } });
}
function saveFood() {
  const F = ui.food, place = F.place.trim(), detail = F.detail.trim();
  if (!place && !detail) { toast('Napiš, co jsi jedl', 'Stačí podnik nebo jídlo.', 'err'); $('#fDetail')?.focus(); return; }
  const k = ui.active, d = mutDay(k);
  const fields = { category: F.cat, place, detail, name: detail ? (place ? `${place} | ${detail}` : detail) : place, emoji: F.emoji, emojiManual: !!F.manual, stars: F.stars };
  if (F.edit) {
    const f = d.food.find((x) => x.id === F.edit);
    if (f) Object.assign(f, fields, { edited: Date.now() });
    ui.food = newFoodDraft();
    commit();
    toast('Upraveno', fields.name, 'ok');
  } else {
    const id = newId();
    d.food.push({ id, time: hm(Date.now()), ...fields });
    ui.newId = id;
    ui.food = { ...newFoodDraft(), cat: F.cat };
    commit();
    toast(`${F.emoji} Uloženo`, `${fields.name} · ${F.stars}/5`, 'ok', () => removeFood(k, id, true));
  }
}
function removeFood(k, id, quiet) {
  const d = mutDay(k), it = d.food.find((f) => f.id === id); if (!it) return;
  tomb(id);
  d.food = d.food.filter((f) => f.id !== id);
  if (ui.food?.edit === id) ui.food = newFoodDraft();
  commit();
  if (!quiet) toast('Smazáno', it.name, 'info', () => { DEL.delete(id); d.food.push(it); d.food.sort((a, b) => a.id - b.id); commit(); });
}
function startFoodEdit(id) {
  const f = foods(getDay(ui.active)).find((x) => x.id === id); if (!f) return;
  const s = foodSplit(f);
  ui.food = { cat: f.category || 'Oběd', place: s.place, detail: s.detail, emoji: foodEmoji(f), placeEmoji: f.emoji || '🍳', manual: !!f.emojiManual, stars: +f.stars || 5, edit: id, emojiOpen: false };
  haptic(); render(); scrollTo({ top: 0, behavior: 'smooth' });
}

function openHistory() {
  const paint = () => {
    const q = ui.histQuery.trim().toLowerCase();
    let body = `<div class="seg">${[['meals', 'Jídla'], ['places', 'Podniky']].map(([k, l]) => `<button type="button" data-h="${k}" class="${ui.histTab === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <label class="search">${ic('search')}<input id="hQ" type="search" placeholder="Hledat…" value="${esc(ui.histQuery)}"></label>`;
    if (ui.histTab === 'meals') {
      let list = allFoods().filter((f) => !q || `${f.place} ${f.detail} ${f.category}`.toLowerCase().includes(q));
      list.sort(ui.histSort === 'date' ? (a, b) => (b.date + b.id > a.date + a.id ? 1 : -1) : (a, b) => (b.stars - a.stars) || (b.date > a.date ? 1 : -1));
      body += `<div class="sortrow"><span>${list.length} ${plural(list.length, 'jídlo', 'jídla', 'jídel')}</span><div class="seg seg--sm">${[['date', 'Nejnovější'], ['stars', 'Nejlepší']].map(([k, l]) => `<button type="button" data-s="${k}" class="${ui.histSort === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>`;
      let lastDate = '';
      body += list.length ? '<div class="group">' + list.slice(0, 300).map((f) => {
        const head = ui.histSort === 'date' && f.date !== lastDate ? `<p class="dhead">${dayLabel(f.date, { weekday: 'long', day: 'numeric', month: 'long', year: f.date.slice(0, 4) === TODAY.slice(0, 4) ? undefined : 'numeric' })}</p>` : '';
        lastDate = f.date;
        return `${head}<button type="button" class="row" data-go="${f.date}"><span class="row__e">${esc(foodEmoji(f))}</span>
          <span class="row__t"><small class="cat">${esc(f.category)}${ui.histSort !== 'date' ? ' · ' + dayLabel(f.date, { day: 'numeric', month: 'numeric', year: '2-digit' }) : ''}</small><b>${esc(f.detail || f.place)}</b>${f.detail && f.place ? `<small>${esc(f.place)}</small>` : ''}</span>
          ${starsRow(+f.stars || 0)}</button>`;
      }).join('') + '</div>' : '<p class="empty">Nic nenalezeno.</p>';
    } else {
      const list = placeStats().filter((p) => !q || p.place.toLowerCase().includes(q)).sort((a, b) => b.avg - a.avg || b.n - a.n);
      body += list.length ? '<div class="group">' + list.map((p, i) => `<div class="row place"><span class="rank num">${i + 1}</span><span class="row__e">${esc(p.emoji || '🍽️')}</span>
        <span class="row__t"><b>${esc(p.place)}</b><small>${p.n}× · naposledy ${dayLabel(p.last, { day: 'numeric', month: 'numeric', year: '2-digit' })}</small></span>
        <span class="avg"><b class="num">${p.avg.toFixed(1).replace('.', ',')}</b>${ic('star', 'on')}</span></div>`).join('') + '</div>' : '<p class="empty">Zatím žádné podniky.</p>';
    }
    $('#sheetBody').innerHTML = body;
    const inp = $('#hQ');
    inp.addEventListener('input', () => { ui.histQuery = inp.value; const pos = inp.selectionStart; paint(); const n = $('#hQ'); n.focus(); n.setSelectionRange(pos, pos); });
    $$('[data-h]').forEach((b) => b.addEventListener('click', () => { ui.histTab = b.dataset.h; haptic(); paint(); }));
    $$('[data-s]').forEach((b) => b.addEventListener('click', () => { ui.histSort = b.dataset.s; haptic(); paint(); }));
    $$('[data-go]').forEach((b) => b.addEventListener('click', () => { closeSheet(); setActive(b.dataset.go); setTab('food'); }));
  };
  openSheet('Historie jídel', paint);
}

/* ===== STATISTIKY ===== */
function periodKeys() {
  if (config.statsPeriod === 'month') {
    const n = parseDay(TODAY), first = new Date(n.getFullYear(), n.getMonth() + ui.statsOffset, 1);
    const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    return { keys: Array.from({ length: days }, (_, i) => iso(new Date(first.getFullYear(), first.getMonth(), i + 1))),
      label: first.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' }) };
  }
  const mon = addDays(mondayOf(TODAY), ui.statsOffset * 7);
  const keys = Array.from({ length: 7 }, (_, i) => addDays(mon, i));
  const a = parseDay(keys[0]), b = parseDay(keys[6]);
  return { keys, label: ui.statsOffset === 0 ? 'Tento týden' : ui.statsOffset === -1 ? 'Minulý týden' : `${a.getDate()}. ${a.getMonth() + 1}. – ${b.getDate()}. ${b.getMonth() + 1}.` };
}
function renderStats() {
  const { keys, label } = periodKeys(), g = goal(), fd = firstDay();
  const counted = keys.filter((k) => k <= TODAY && k >= fd);
  const water = keys.map((k) => dayWater(getDay(k)));
  const cw = counted.map((k) => dayWater(getDay(k)));
  const avg = cw.length ? Math.round(sum(cw) / cw.length) : 0;
  const hit = cw.filter((x) => x >= g).length;
  let sd = 0, st = 0; counted.forEach((k) => { const s = suppStats(getDay(k)); sd += s.done; st += s.target; });
  const meals = counted.flatMap((k) => foods(getDay(k)));
  const avgStars = meals.length ? sum(meals, (f) => f.stars) / meals.length : 0;
  const { cur, best } = streakInfo();
  const max = Math.max(g * 1.25, ...water);
  const W = 320, H = 150, n = keys.length, gap = n > 10 ? 2 : 8, bw = (W - gap * (n - 1)) / n;
  const gy = H - (g / max) * H;
  const bars = keys.map((k, i) => {
    const h = Math.max(water[i] ? 4 : 0, (water[i] / max) * H), x = i * (bw + gap);
    return `<rect x="${x.toFixed(1)}" y="${(H - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(5, bw / 2).toFixed(1)}" class="${water[i] >= g ? 'hit' : ''}${k === TODAY ? ' today' : ''}" style="--i:${i}"/>
      <rect x="${x.toFixed(1)}" y="0" width="${bw.toFixed(1)}" height="${H}" class="hitbox" data-act="statDay" data-k="${k}"/>`;
  }).join('');
  const labels = keys.map((k, i) => { const dd = parseDay(k).getDate(); return n > 10 ? (dd === 1 || dd % 5 === 0 ? `<span style="left:${((i + 0.5) / n) * 100}%">${dd}</span>` : '') : `<span style="left:${((i + 0.5) / n) * 100}%">${DAY_SHORT[i]}</span>`; }).join('');
  const perSupp = config.customSuplementsList.map((s) => {
    const done = sum(counted, (k) => Math.min(doses(getDay(k), s.id).length, s.frequency)), tgt = counted.length * s.frequency;
    return { s, p: tgt ? done / tgt : 0 };
  });
  const v = $('#view-stats');
  const out = meals.filter((f) => !/^dom/i.test(foodSplit(f).place)).length;
  v.innerHTML = `
  <div class="statbar">
    <div class="seg">${[['week', 'Týden'], ['month', 'Měsíc']].map(([k, l]) => `<button type="button" data-act="period" data-p="${k}" class="${config.statsPeriod === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div class="week__nav"><button type="button" class="ibtn ghost" data-act="statNav" data-d="-1" aria-label="Předchozí">${ic('chevL')}</button><span>${label}</span><button type="button" class="ibtn ghost" data-act="statNav" data-d="1" aria-label="Další" ${ui.statsOffset >= 0 ? 'disabled' : ''}>${ic('chevR')}</button></div>
  </div>
  <div class="chart" id="chartCard">
    <div class="chart__head"><b class="dot">${fmtMl(avg)}</b><span>průměrně za den · cíl ${fmtMl(g)}</span></div>
    <div class="chart__plot"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${bars}<line x1="0" x2="${W}" y1="${gy}" y2="${gy}" class="goal"/></svg></div>
    <div class="chart__labels">${labels}</div>
  </div>
  <div class="group">
    <div class="row"><span class="gi">${ic('drop')}</span><span class="row__t"><b>Splněný cíl</b><small>dny v období</small></span><b class="row__v num">${hit} z ${counted.length}</b></div>
    <div class="row"><span class="gi">${ic('flame')}</span><span class="row__t"><b>Série</b><small>nejdelší ${best} ${plural(best, 'den', 'dny', 'dní')}</small></span><b class="row__v num">${cur} ${plural(cur, 'den', 'dny', 'dní')}</b></div>
    <div class="row"><span class="gi gi--food">${ic('food')}</span><span class="row__t"><b>Jídla</b><small>${out} mimo domov</small></span><b class="row__v num">${meals.length}${meals.length ? ` · ${avgStars.toFixed(1).replace('.', ',')}` : ''}</b>${meals.length ? ic('star', 'on') : ''}</div>
  </div>
  ${perSupp.length ? `<h3 class="sec">Suplementy <span class="num">${st ? Math.round((sd / st) * 100) : 0} % dávek</span></h3>
  <div class="group">${perSupp.map(({ s, p }) => `<div class="row adh"><span class="row__t"><b>${esc(s.name)}</b></span><div class="bar"><i style="width:${p * 100}%"></i></div><b class="row__v num">${Math.round(p * 100)} %</b></div>`).join('')}</div>` : ''}
  <button type="button" class="btn btn--ghost" data-act="allDays">${ic('list')} Všechny dny</button>`;
  swipe($('#chartCard'), (dir) => { const no = ui.statsOffset + dir; if (no <= 0) { ui.statsOffset = no; haptic(); render(); } });
}
function openAllDays() {
  const days = Object.keys(state).filter(isDay).filter((k) => { const d = state[k]; return waterLogs(d).length || foods(d).length || Object.keys(d.vitamins || {}).some((id) => doses(d, id).length); }).sort().reverse();
  openSheet('Všechny dny', () => {
    $('#sheetBody').innerHTML = days.length ? '<div class="group">' + days.map((k) => {
      const d = getDay(k), w = dayWater(d), ss = suppStats(d), f = foods(d).length;
      return `<button type="button" class="row dayrow" data-go="${k}"><span class="row__t"><b>${dayLabel(k, { weekday: 'short', day: 'numeric', month: 'numeric', year: '2-digit' })}</b></span>
        <span class="dstat ${w >= goal() ? 'w' : ''}">${ic('drop')}${Math.round((w / goal()) * 100)}%</span>
        <span class="dstat ${ss.target && ss.done >= ss.target ? 'p' : ''}">${ic('pill')}${ss.done}</span>
        <span class="dstat ${f ? 'f' : ''}">${ic('food')}${f}</span></button>`;
    }).join('') + '</div>' : '<p class="empty">Zatím žádná data.</p>';
    $$('[data-go]').forEach((b) => b.addEventListener('click', () => { closeSheet(); setActive(b.dataset.go); setTab('home'); }));
  });
}

/* ===== NASTAVENÍ ===== */
function openSettings() {
  const paint = () => {
    const notifOk = pushOk();
    $('#sheetBody').innerHTML = `
    <h3 class="sec">${ic('eye')} Vzhled</h3>
    <div class="seg" id="themeSeg">${[['dark', 'Tmavý'], ['light', 'Světlý'], ['auto', 'Podle telefonu']].map(([k, l]) => `<button type="button" data-th="${k}" class="${config.theme === k ? 'on' : ''}">${l}</button>`).join('')}</div>

    <h3 class="sec">${ic('drop')} Pitný režim</h3>
    <div class="card set">
      <div class="set__row"><span>Denní cíl</span><div class="stepper"><button type="button" class="ibtn sm" id="gMinus" aria-label="Méně">${ic('minus')}</button><b class="dot">${config.waterGoal}</b><button type="button" class="ibtn sm" id="gPlus" aria-label="Víc">${ic('plus')}</button></div></div>
      <p class="note">Rychlé nápoje (ťukni na ikonku pro změnu):</p>
      <div class="drinkedit">${config.drinks.map((dr, i) => `<div class="de" data-i="${i}">
        <button type="button" class="ibtn sm de__icon" data-di="${i}" aria-label="Změnit ikonku">${ic(dr.icon)}</button>
        <input type="text" class="de__name" maxlength="20" value="${esc(dr.name)}" aria-label="Název">
        <input type="number" class="de__ml" min="10" max="3000" step="10" inputmode="numeric" value="${dr.ml}" aria-label="Mililitry"><small>ml</small>
        <button type="button" class="ibtn sm ghost de__rm" aria-label="Odebrat">${ic('x')}</button></div>`).join('')}</div>
      ${config.drinks.length < 6 ? `<button type="button" class="btn btn--ghost sm" id="dAdd">${ic('plus')} Přidat nápoj</button>` : ''}
    </div>

    <h3 class="sec">${ic('bell')} Upozornění</h3>
    <div class="card set">
      <div class="set__row"><span>Připomínat pití a suplementy<small>7:00–22:00, i když je appka zavřená</small></span><button type="button" class="switch${config.notifEnabled ? ' on' : ''}" id="nToggle" ${notifOk ? '' : 'disabled'} aria-label="Upozornění"><i></i></button></div>
      ${config.notifEnabled ? `<div class="seg">${[60, 120, 180].map((m) => `<button type="button" data-ni="${m}" class="${config.notifInterval === m ? 'on' : ''}">každé ${m / 60} h</button>`).join('')}</div>` : ''}
      ${config.notifEnabled ? '<button type="button" class="btn btn--ghost sm" id="nTest">Poslat zkušební</button>' : ''}
      ${notifOk ? '' : '<p class="note">Na iPhonu fungují jen v appce přidané na plochu.</p>'}
    </div>

    <h3 class="sec">${ic('cloud')} Soukromý cloud</h3>
    <div class="card set">
      ${config.cloudKey ? `
      <p class="note">Zapnuto. Data vidí jen zařízení s tímhle klíčem – nikomu ho neposílej.</p>
      <div class="keybox"><code class="num" id="keyTxt">${ui.showKey ? fmtKey(config.cloudKey) : '••••-••••-…-' + config.cloudKey.slice(-4)}</code><button type="button" class="ibtn ghost" id="keyShow" aria-label="${ui.showKey ? 'Skrýt' : 'Ukázat'} klíč">${ic(ui.showKey ? 'x' : 'eye')}</button></div>
      <div class="inrow"><button type="button" class="btn btn--ghost sm" id="keyLink">Další zařízení</button><button type="button" class="btn btn--ghost sm" id="syncNow">${ic('refresh')} Teď</button></div>
      <div class="inrow"><button type="button" class="btn btn--ghost sm" id="cloudOff">Odpojit</button><button type="button" class="btn btn--danger sm" id="cloudDel">Smazat z cloudu</button></div>`
      : `
      <p class="note">Záloha a stejná data na více zařízeních. Appka vytvoří tajný klíč, bez kterého se k datům nikdo nedostane.</p>
      <button type="button" class="btn btn--water sm" id="cloudOn">${ic('cloud')} Zapnout cloud</button>
      <div class="inrow"><input id="keyIn" class="in" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Mám klíč z jiného zařízení…"><button type="button" class="btn btn--ghost sm" id="keyJoin">Připojit</button></div>`}
    </div>

    <h3 class="sec">${ic('download')} Data</h3>
    <div class="card set">
      <div class="inrow"><button type="button" class="btn btn--ghost sm" id="exp">${ic('download')} Export</button><button type="button" class="btn btn--ghost sm" id="imp">${ic('upload')} Import</button></div>
      <div class="set__row"><span>Vibrace při ťuknutí<small>funguje na Androidu</small></span><button type="button" class="switch${config.haptics ? ' on' : ''}" id="hToggle" aria-label="Vibrace"><i></i></button></div>
      <button type="button" class="btn btn--danger sm" id="wipe">${ic('alert')} Smazat data v zařízení</button>
    </div>
    <img class="foot__logo" src="icons/logo.png" alt="Trackerrr">
    <p class="foot">verze ${VERSION} · jendovyapky</p>`;

    const stepGoal = (d) => { config.waterGoal = clamp(config.waterGoal + d, 500, 6000); haptic(); settingsChanged(); paint(); };
    $$('[data-th]').forEach((b) => (b.onclick = () => { config.theme = b.dataset.th; haptic(); persist(); applyTheme(); paint(); }));
    $('#gMinus').onclick = () => stepGoal(-100);
    $('#gPlus').onclick = () => stepGoal(100);
    $$('.de').forEach((row) => {
      const i = +row.dataset.i, dr = config.drinks[i];
      $('.de__name', row).onchange = (e) => { dr.name = e.target.value.trim() || dr.name; settingsChanged(); };
      $('.de__ml', row).onchange = (e) => { dr.ml = clamp(parseInt(e.target.value) || dr.ml, 10, 3000); e.target.value = dr.ml; settingsChanged(); };
      $('.de__icon', row).onclick = () => { dr.icon = DRINK_ICONS[(DRINK_ICONS.indexOf(dr.icon) + 1) % DRINK_ICONS.length]; haptic(); settingsChanged(); paint(); };
      $('.de__rm', row).onclick = () => { if (config.drinks.length <= 1) return; config.drinks.splice(i, 1); haptic(); settingsChanged(); paint(); };
    });
    $('#dAdd') && ($('#dAdd').onclick = () => { config.drinks.push({ id: 'd_' + Date.now(), name: 'Nový', ml: 330, icon: 'bottle' }); settingsChanged(); paint(); });
    $('#nToggle').onclick = toggleNotifs.bind(null, paint);
    $$('[data-ni]').forEach((b) => (b.onclick = () => { config.notifInterval = +b.dataset.ni; haptic(); persist(); paint(); pushRegister().catch(() => {}); }));
    $('#nTest') && ($('#nTest').onclick = async () => { try { const sub = await pushSub(false); await pushApi('/test', { endpoint: sub?.endpoint }); toast('Odesláno', 'Za pár vteřin by mělo přijít upozornění.', 'ok'); } catch { toast('Nepovedlo se', 'Zkus upozornění vypnout a zapnout.', 'err'); } });
    const on = (id, fn) => { const el = $('#' + id); if (el) el.onclick = fn; };
    on('cloudOn', () => connectKey(newKey()));
    on('keyJoin', () => {
      const k = normKey($('#keyIn').value);
      if (!validKey(k)) { toast('Neplatný klíč', 'Má 24 znaků, třeba abcd-efgh-…', 'err'); return; }
      connectKey(k);
    });
    on('keyShow', () => { ui.showKey = !ui.showKey; haptic(); paint(); });
    on('keyLink', async () => {
      const link = `${location.origin}${location.pathname}#klic=${fmtKey(config.cloudKey)}`;
      try {
        if (navigator.share) await navigator.share({ title: 'Trackerrr – připojení', url: link });
        else { await navigator.clipboard.writeText(link); toast('Odkaz zkopírovaný', 'Otevři ho na druhém zařízení. Nikomu jinému ho neposílej.', 'ok'); }
      } catch {}
    });
    on('syncNow', () => syncNow(true));
    on('cloudOff', () => {
      if (!confirm('Odpojit tohle zařízení od cloudu? Data v cloudu zůstanou. Bez klíče se k nim nedostaneš – ulož si ho, nebo ho máš v jiném zařízení.')) return;
      config.cloudKey = ''; ui.sync = 'off'; ui.showKey = false; persist(); render(); paint(); toast('Odpojeno', 'Data zůstala v telefonu.');
    });
    on('cloudDel', async () => {
      if (!confirm('Smazat všechna data z cloudu? V tomhle zařízení zůstanou.')) return;
      try { await cloud('DELETE'); config.cloudKey = ''; ui.sync = 'off'; persist(); render(); paint(); toast('Cloud smazaný', 'Data zůstala jen v telefonu.', 'ok'); }
      catch { toast('Nepovedlo se', 'Zkus to znovu.', 'err'); }
    });
    $('#exp').onclick = exportData;
    $('#imp').onclick = () => $('#importFile').click();
    $('#hToggle').onclick = () => { config.haptics = !config.haptics; haptic(); persist(); paint(); };
    $('#wipe').onclick = wipeAll;
  };
  openSheet('Nastavení', paint);
}
async function toggleNotifs(paint) {
  if (config.notifEnabled) {
    config.notifEnabled = false; persist(); paint();
    try { const sub = await pushSub(false); if (sub) { await pushApi('/unsubscribe', { endpoint: sub.endpoint }); await sub.unsubscribe(); } } catch {}
    toast('Upozornění vypnutá'); return;
  }
  if (!pushOk()) { toast('Tady to nejde', 'Na iPhonu přidej Trackerrr na plochu a otevři ho odtud.', 'err'); return; }
  if (!config.cloudKey) {
    if (!confirm('Upozornění posílá tvůj soukromý cloud (musí vidět, jestli jsi pozadu). Zapnout ho?')) return;
    await connectKey(newKey());
    if (!config.cloudKey || ui.sync !== 'ok') return;
  }
  if ((await Notification.requestPermission()) !== 'granted') { toast('Nepovoleno', 'Povol upozornění pro Trackerrr v nastavení telefonu.', 'err'); return; }
  try {
    await syncNow(); // server potřebuje aktuální data a seznam suplementů
    await pushRegister();
    config.notifEnabled = true; persist(); paint();
    toast('Upozornění zapnutá', 'Chodí i při zavřené appce. Zkus „Poslat zkušební“.', 'ok');
  } catch { toast('Nepovedlo se', 'Zkus to znovu za chvíli.', 'err'); }
}
function exportData() {
  const { cloudKey, ...cfg } = config; // klíč do zálohy nepatří (soubor se dá omylem někomu poslat)
  const blob = new Blob([JSON.stringify({ ...state, _config: cfg }, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `trackerrr_zaloha_${TODAY}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('Záloha hotová', a.download, 'ok');
}
$('#importFile').addEventListener('change', (e) => {
  const file = e.target.files[0]; if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const data = JSON.parse(r.result);
      if (!data || typeof data !== 'object' || !Object.keys(data).some(isDay)) throw 0;
      const cfg = data._config; delete data._config;
      state = merge(state, data); DEL = new Set(state.deletedLogs);
      if (cfg && Array.isArray(cfg.customSuplementsList)) {
        // seznam suplementů ze zálohy se přidá k současnému (nic se nesmaže)
        for (const s of cfg.customSuplementsList) if (!config.customSuplementsList.some((x) => x.id === s.id)) config.customSuplementsList.push(normSupp(s));
        if (Array.isArray(cfg.drinks)) config.drinks = cfg.drinks;
        if (cfg.waterGoal) config.waterGoal = cfg.waterGoal;
        config.settingsUpdated = Date.now(); state._settings = settingsSnapshot();
      }
      commit(); closeSheet();
      toast('Import hotový', 'Data jsou spojená s tím, co už tu bylo.', 'ok');
    } catch { toast('Chyba importu', 'Tohle není záloha Trackerrru.', 'err'); }
    e.target.value = '';
  };
  r.readAsText(file);
});
function wipeAll() {
  if (!confirm('Smazat všechna data v tomhle zařízení? Doporučuju předtím Export.')) return;
  if (!confirm(config.cloudKey ? 'Opravdu? Kopie v cloudu zůstane (smazat ji jde v Soukromý cloud). Appku odpojím, aby se data nevrátila.' : 'Opravdu? Nejde to vrátit.')) return;
  [KS, KC].forEach((k) => localStorage.removeItem(k));
  location.reload();
}

/* ===== sheet (vysouvací okno) ===== */
let sheetPaint = null;
function openSheet(title, paint) {
  haptic();
  $('#sheetTitle').textContent = title;
  sheetPaint = paint; paint();
  const s = $('#sheet');
  s.hidden = false; $('#sheetBody').scrollTop = 0;
  requestAnimationFrame(() => requestAnimationFrame(() => s.classList.add('on')));
  document.body.classList.add('noscroll');
}
function closeSheet() {
  const s = $('#sheet');
  if (s.hidden) return;
  s.classList.remove('on');
  document.body.classList.remove('noscroll');
  sheetPaint = null;
  setTimeout(() => { if (!s.classList.contains('on')) s.hidden = true; }, 320);
}
// stažení dolů za úchyt zavře okno
(() => {
  const box = $('.sheet__box'); let y0 = null, dy = 0;
  const start = (e) => { if (e.target.closest('.sheet__grab, .sheet__head')) { y0 = e.touches[0].clientY; dy = 0; box.style.transition = 'none'; } };
  box.addEventListener('touchstart', start, { passive: true });
  box.addEventListener('touchmove', (e) => { if (y0 === null) return; dy = Math.max(0, e.touches[0].clientY - y0); box.style.transform = `translateY(${dy}px)`; }, { passive: true });
  box.addEventListener('touchend', () => { if (y0 === null) return; box.style.transition = ''; box.style.transform = ''; if (dy > 90) closeSheet(); y0 = null; });
})();

/* ===== swipe ===== */
function swipe(el, cb) {
  if (!el) return;
  let x0 = null, y0 = 0;
  el.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  el.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) cb(dx < 0 ? 1 : -1);
  }, { passive: true });
}

/* ===== akce (jeden posluchač pro celou appku) ===== */
const ACT = {
  tab: (b) => { haptic(); setTab(b.dataset.tab); },
  today: () => { haptic(); setActive(TODAY); },
  day: (b) => { haptic(); setActive(b.dataset.k); },
  week: (b) => moveWeek(+b.dataset.d),
  streak: () => { const { cur, best } = streakInfo(); toast(`Série ${cur} ${plural(cur, 'den', 'dny', 'dní')} 🔥`, `Dny po sobě se splněným pitím. Nejdelší: ${best}.`); },
  battery: () => { const m = nowMins(), left = m >= 420 ? 1440 + 420 - m : 420 - m; toast('Zbytek dne', `Do 7:00 zbývá ${Math.floor(left / 60)} h ${left % 60} min.`); },
  drink: (b) => { const dr = config.drinks.find((x) => x.id === b.dataset.id); if (dr) { floatText(b, `+${dr.ml} ml`, 'water'); logWater(dr.ml, dr.name); } },
  customToggle: () => { haptic(); ui.customOpen = !ui.customOpen; render(); },
  customSet: (b) => { ui.customMl = +b.dataset.ml; haptic(); render(); },
  customAdd: (b) => { floatText(b, `+${ui.customMl} ml`, 'water'); logWater(ui.customMl, 'Vlastní objem'); ui.customOpen = false; render(); },
  rmWater: (b) => rowOut(b, () => removeWater(ui.active, +b.dataset.id)),
  dose: (b) => toggleDose(b.dataset.id, +b.dataset.i),
  editSupp: (b) => openSuppEditor(b.dataset.id),
  foodCat: (b) => { ui.food.cat = b.dataset.c; haptic(); render(); },
  foodPlace: (b) => { const F = ui.food; F.place = b.dataset.p; F.placeEmoji = b.dataset.e; if (!F.manual) F.emoji = guessEmoji(F.detail) || b.dataset.e; haptic(); render(); $('#fDetail')?.focus(); },
  foodEmoji: () => { ui.food.emojiOpen = !ui.food.emojiOpen; haptic(); render(); },
  foodEmojiSet: (b) => { ui.food.emoji = b.dataset.e; ui.food.manual = true; ui.food.emojiOpen = false; haptic(); render(); },
  foodStars: (b) => { ui.food.stars = +b.dataset.n; ui.popStar = ui.food.stars; haptic(); render(); },
  foodSave: saveFood,
  foodEdit: (b) => startFoodEdit(+b.dataset.id),
  foodCancel: () => { ui.food = newFoodDraft(); render(); },
  rmFood: (b) => rowOut(b, () => removeFood(ui.active, +b.dataset.id)),
  history: openHistory,
  period: (b) => { config.statsPeriod = b.dataset.p; ui.statsOffset = 0; haptic(); persist(); render(); },
  statNav: (b) => { ui.statsOffset = Math.min(0, ui.statsOffset + +b.dataset.d); haptic(); render(); },
  statDay: (b) => { const k = b.dataset.k; if (k > TODAY) return; const d = getDay(k), ss = suppStats(d); toast(dayLabel(k, { weekday: 'long', day: 'numeric', month: 'numeric' }), `${fmtMl(dayWater(d))} · suply ${ss.done}/${ss.target} · ${foods(d).length} jídel`); },
  allDays: openAllDays,
  settings: openSettings,
  closeSheet,
  sync: () => { if (!config.cloudKey) { openSettings(); return; } syncNow(true); },
  undo: () => { const u = toastUndo; toastUndo = null; $('#toast').classList.remove('on'); if (u) { u(); haptic(20); } },
};
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled) return;
  const f = ACT[b.dataset.act];
  if (f) f(b, e);
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });
// bez přiblížení dvojitým ťuknutím a gestem (iOS ignoruje user-scalable=no)
addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
// přehled na výšku displeje: změřit hlavičku a dolní lištu
function measureChrome() {
  const r = document.documentElement.style, dock = $('#dock');
  r.setProperty('--toph', $('.top').offsetHeight + 'px');
  r.setProperty('--dockh', (innerHeight - dock.getBoundingClientRect().top + 14) + 'px');
  fitOrb();
}
// kapka zabere, co na přehledu zbyde (mezi týdnem a pitím)
function fitOrb() {
  const wrap = $('.orbwrap'), orb = $('#orb'); if (!wrap || !orb) return;
  orb.style.setProperty('--o', clamp(wrap.clientHeight - 74, 150, 260) + 'px');
}
addEventListener('resize', () => { measureChrome(); fitOrb(); });
// velký nadpis se při scrollu zmenší
addEventListener('scroll', () => document.body.classList.toggle('scrolled', scrollY > 12), { passive: true });

/* ===== cloud (Google Apps Script – stejný jako ve staré verzi) ===== */
function merge(a, b) {
  const del = new Set([...(a.deletedLogs || []), ...(b.deletedLogs || [])]);
  const out = { lastUpdated: Math.max(a.lastUpdated || 0, b.lastUpdated || 0), deletedLogs: [...del] };
  const byId = (x, y) => {
    const m = new Map();
    for (const it of [...(x || []), ...(y || [])]) {
      if (!it || it.id == null) continue;
      const p = m.get(it.id);
      if (!p || (it.edited || 0) > (p.edited || 0)) m.set(it.id, it);
    }
    return [...m.values()].filter((i) => !del.has(i.id)).sort((p, q) => p.id - q.id);
  };
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (!isDay(k)) continue;
    const A = a[k] || {}, B = b[k] || {};
    const wl = byId(A.waterLogs, B.waterLogs), food = byId(A.food, B.food), vit = {};
    for (const id of new Set([...Object.keys(A.vitamins || {}), ...Object.keys(B.vitamins || {})])) {
      const arr = [...new Set([...((A.vitamins || {})[id] || []), ...((B.vitamins || {})[id] || [])])].filter((t) => !del.has(t)).sort((p, q) => p - q);
      if (arr.length) vit[id] = arr;
    }
    if (!wl.length && !food.length && !Object.keys(vit).length) continue;
    out[k] = { water: sum(wl, (l) => parseInt(l.amount)), waterLogs: wl, food, vitamins: vit };
  }
  const sa = a._settings, sb = b._settings;
  const s = (sa?.updatedAt || 0) >= (sb?.updatedAt || 0) ? sa : sb;
  if (s) out._settings = s;
  return out;
}
function applyRemoteSettings() {
  const s = state._settings;
  if (!s || !(s.updatedAt > (config.settingsUpdated || 0))) return;
  if (s.waterGoal) config.waterGoal = s.waterGoal;
  if (Array.isArray(s.drinks) && s.drinks.length) config.drinks = s.drinks;
  if (Array.isArray(s.supps)) config.customSuplementsList = s.supps.map(normSupp);
  if (Array.isArray(s.places)) config.places = s.places;
  config.settingsUpdated = s.updatedAt;
}
// Vlastní soukromý cloud (Cloudflare Worker v sync/): data jen pod tajným klíčem, server je spojí a vrátí.
const SYNC = 'https://trackerrr-sync.jendovyapky.workers.dev/data';
const KEY_ABC = 'abcdefghijkmnpqrstuvwxyz23456789'; // bez l, 0, 1 (pletou se)
const newKey = () => [...crypto.getRandomValues(new Uint8Array(24))].map((b) => KEY_ABC[b & 31]).join('');
const normKey = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const fmtKey = (k) => k.match(/.{1,4}/g).join('-');
const validKey = (k) => /^[a-km-z2-9]{24}$/.test(k);
async function cloud(method = 'POST', keepalive = false) {
  const r = await fetch(SYNC, { method, keepalive, cache: 'no-store',
    headers: { Authorization: 'Bearer ' + config.cloudKey, 'Content-Type': 'application/json' },
    body: method === 'POST' ? JSON.stringify(state) : undefined });
  if (!r.ok) throw new Error(r.status);
  return r.json();
}
let syncing = false, syncAgain = false;
async function syncNow(manual = false) {
  if (!config.cloudKey) { ui.sync = 'off'; renderSyncBtn(); return; }
  if (syncing) { syncAgain = true; return; }
  syncing = true; ui.sync = 'busy'; renderSyncBtn();
  if (manual) haptic();
  try {
    if (!state._settings) state._settings = settingsSnapshot(); // server podle toho posílá upozornění
    const remote = await cloud();
    state = merge(state, remote); DEL = new Set(state.deletedLogs); // spojit i s tím, co přibylo během požadavku
    applyRemoteSettings();
    persist();
    ui.sync = 'ok';
    if (manual) toast('Synchronizováno', 'Data jsou v tvém soukromém cloudu.', 'ok');
  } catch {
    ui.sync = 'err';
    if (manual) toast('Cloud nejde', 'Zkus to za chvíli. Data jsou v bezpečí v telefonu.', 'err');
  }
  syncing = false;
  render();
  if (sheetPaint) sheetPaint();
  if (syncAgain) { syncAgain = false; syncNow(); }
}
const upload = () => syncNow();
addEventListener('pagehide', () => { if (upTimer && config.cloudKey) { clearTimeout(upTimer); upTimer = 0; try { cloud('POST', true); } catch {} } });
async function connectKey(key) {
  config.cloudKey = key; persist();
  await syncNow();
  if (ui.sync === 'ok') toast('Cloud zapnutý', 'Data se teď synchronizují.', 'ok');
  else toast('Cloud nejde', 'Klíč je uložený, zkusím to znovu později.', 'err');
}

// odkaz pro další zařízení: …/#klic=xxxx-xxxx-… (část za # se na server neposílá)
function keyFromLink() {
  const m = /[#&]klic=([a-z0-9-]+)/i.exec(location.hash);
  if (!m) return;
  history.replaceState(null, '', location.pathname + location.search);
  const k = normKey(m[1]);
  if (!validKey(k) || k === config.cloudKey) return;
  if (confirm('Připojit tohle zařízení k tvému cloudu? Data z obou míst se spojí.')) connectKey(k);
}

/* ===== upozornění: posílá je server (sync/worker.js) – chodí i při zavřené appce ===== */
const PUSH = SYNC.replace(/\/data$/, '/push');
const pushOk = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const b64uToBytes = (s) => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); };
async function pushApi(path, body) {
  const r = await fetch(PUSH + path, { method: 'POST', headers: { Authorization: 'Bearer ' + config.cloudKey, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(r.status);
  return r.json();
}
async function pushSub(create) {
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub && create) {
    const { key } = await (await fetch(PUSH + '/vapid')).json();
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToBytes(key) });
  }
  return sub;
}
async function pushRegister() {
  const sub = await pushSub(true);
  await pushApi('/subscribe', { sub: sub.toJSON(), interval: config.notifInterval, tz: Intl.DateTimeFormat().resolvedOptions().timeZone });
}

/* ===== nový den, návrat do appky ===== */
function tick() {
  const t = iso(new Date());
  if (t !== TODAY) {
    const wasToday = ui.active === TODAY;
    TODAY = t;
    if (wasToday) { ui.active = TODAY; ui.weekStart = mondayOf(TODAY); ui.shownPct = null; ui.food = null; }
    render();
  } else renderBattery();
}
setInterval(tick, 30000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { tick(); if (config.cloudKey) syncNow(); }
});

/* ===== start ===== */
if (!state._settings && config.settingsUpdated) state._settings = settingsSnapshot();
persist();
$$('#dock button').forEach((b) => { b.innerHTML = ic({ home: 'home', water: 'drop', supps: 'pill', food: 'food', stats: 'chart' }[b.dataset.tab]); });
$('[data-act="settings"]').innerHTML = ic('sliders');
$('.sheet__head .ibtn').innerHTML = ic('x');
document.body.dataset.tab = ui.tab;
render();
measureChrome(); setTimeout(measureChrome, 1500); // po úvodní animaci lišty
moveLamp(true);
// úvod: krátký, ťuknutím přeskočit
(() => {
  const boot = $('#boot');
  const done = () => { boot.classList.add('out'); document.body.classList.add('ready'); setTimeout(() => boot.remove(), 600); };
  if (reduced() || sessionStorage.getItem('booted')) { boot.remove(); document.body.classList.add('ready'); return; }
  try { sessionStorage.setItem('booted', '1'); } catch {}
  boot.addEventListener('click', done, { once: true });
  setTimeout(done, 1650);
})();
keyFromLink();
if (config.cloudKey) syncNow();
// service worker jen na webu (lokálně bez cache, ať je vidět každá změna)
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
