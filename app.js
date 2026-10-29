'use strict';
/* Trackerrr – pití, suplementy a jídlo. Bez frameworku, bez buildu (stejně jako ostatní jendovyapky). */

const VERSION = '2.1';
const API = 'https://script.google.com/macros/s/AKfycbzqRrJO7skZKFusk_YjWmwHSaSs2Nf_MO0dBqZBr4_Qpqt26HnZIiWBk4xVdsfLYKmu/exec';
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
  life: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="m4.9 4.9 4.3 4.3M14.8 14.8l4.3 4.3M14.8 9.2l4.3-4.3M4.9 19.1l4.3-4.3"/>',
  cup: '<path d="M17 8h1a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1"/><path d="M6 6h11v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2Z"/><path d="M11 2v4"/>',
  can: '<path d="M7 3h10v18H7z"/><path d="M7 7h10"/><path d="M13.5 10 10.5 14h3l-3 4"/>',
  glass: '<path d="M5 3h14l-1.6 16.2a2 2 0 0 1-2 1.8H8.6a2 2 0 0 1-2-1.8Z"/><path d="M5.6 9h12.8"/>',
  bottle: '<path d="M10 2h4v3l1.5 2.5a3 3 0 0 1 .5 1.7V20a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V9.2a3 3 0 0 1 .5-1.7L10 5z"/><path d="M8 12h8"/>',
  coffee: '<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><path d="M7 2v2M11 2v2"/>',
  star: '<path d="M12 2.8l2.84 5.76 6.36.92-4.6 4.49 1.08 6.33L12 17.32 6.32 20.3l1.08-6.33-4.6-4.49 6.36-.92z"/>',
};
const starsRow = (n) => `<span class="srow" aria-label="${n} z 5">${[1, 2, 3, 4, 5].map((i) => ic('star', i <= n ? 'on' : '')).join('')}</span>`;
const ic = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;
const DRINK_ICONS = ['glass', 'cup', 'bottle', 'can', 'coffee', 'drop'];

/* ===== stav ===== */
let state = load(KS) || load('trackerrr_state_v9') || { lastUpdated: 0, deletedLogs: [] };
if (!state || typeof state !== 'object') state = { lastUpdated: 0, deletedLogs: [] };
if (!Array.isArray(state.deletedLogs)) state.deletedLogs = [];
let DEL = new Set(state.deletedLogs);

const hadConfig = !!load(KC);
let config = Object.assign({ notifEnabled: false, notifInterval: 120, statsPeriod: 'week', syncRoom: '', customSuplementsList: [], initialized: false }, load(KC) || {});
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
if (!config.waterGoal) config.waterGoal = 2100;
if (!Array.isArray(config.drinks)) config.drinks = [
  { id: 'stanley', name: 'Stanley Cup', ml: 900, icon: 'cup' },
  { id: 'monster', name: 'Monster', ml: 500, icon: 'can' },
  { id: 'glass', name: 'Sklenička', ml: 250, icon: 'glass' },
];
if (!Array.isArray(config.places)) config.places = [];
if (config.haptics === undefined) config.haptics = true;
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
  if (sync && config.syncRoom) { clearTimeout(upTimer); upTimer = setTimeout(upload, 1500); }
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
  $('#title').textContent = TITLES[ui.tab].toUpperCase();
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
}
function renderSyncBtn() {
  const b = $('#syncBtn');
  const icon = { off: 'cloud', busy: 'refresh', ok: 'cloudOk', err: 'cloudOff' }[ui.sync];
  b.dataset.state = ui.sync;
  b.innerHTML = ic(icon, ui.sync === 'busy' ? 'spin' : '');
}

/* ===== přepínání obrazovek ===== */
function setTab(t) {
  if (t === ui.tab) { scrollTo({ top: 0, behavior: 'smooth' }); return; }
  ui.tab = t;
  document.body.dataset.tab = t; // barevný nádech pozadí podle záložky
  $$('.view').forEach((v) => { v.hidden = v.id !== 'view-' + t; });
  const v = $('#view-' + t);
  v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter');
  clearTimeout(setTab.t); setTab.t = setTimeout(() => v.classList.remove('enter'), 750); // jinak by se animace spouštěla při každém překreslení
  if (t === 'home') ui.shownPct = null; // znovu dopočítat procenta
  scrollTo({ top: 0 });
  render();
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

function nextDose(d, k) {
  const list = [];
  for (const s of config.customSuplementsList) {
    const n = doses(d, s.id).length;
    if (n < s.frequency) list.push({ s, i: n, t: s.customTimes[n] });
  }
  list.sort((a, b) => (toMins(a.t) ?? 9999) - (toMins(b.t) ?? 9999));
  const it = list[0];
  if (it && k === TODAY) it.late = toMins(it.t) !== null && toMins(it.t) + 30 < nowMins();
  return it;
}

function renderHome() {
  const k = ui.active, d = getDay(k), w = dayWater(d), g = goal();
  const pct = Math.round((w / g) * 100);
  const { cur } = streakInfo();
  const ss = suppStats(d), nd = nextDose(d, k);
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
    <div class="week__row">${weekRow()}</div>
  </div>

  <div class="orbwrap">
    <button type="button" class="orb" data-act="tab" data-tab="water" aria-label="Pití: ${pct} %">
      <span class="orb__liquid" id="orbLiquid"><i></i><i></i></span>
      <canvas class="orb__eyes" id="eyes" width="96" height="48"></canvas>
      <b class="orb__pct" id="orbPct">0%</b>
    </button>
    <p class="orb__sub"><span class="num">${fmtMl(w)}</span> z ${fmtMl(g)}</p>
    ${pace ? `<p class="pace ${pace.startsWith('Pozadu') ? 'warn' : 'okc'}">${pace}</p>` : ''}
  </div>

  <div class="quick">${config.drinks.map((dr) => `<button type="button" class="qd" data-act="drink" data-id="${esc(dr.id)}" aria-label="${esc(dr.name)} ${dr.ml} ml">${ic(dr.icon)}<span>${esc(dr.name)}</span><small class="num">+${dr.ml}</small></button>`).join('')}</div>

  <div class="group">
    <div class="grow grow--supp">
      <button type="button" class="grow__main" data-act="tab" data-tab="supps">
        <span class="gi">${ic('pill')}</span>
        <span class="grow__t"><b>Suplementy</b><small class="${nd?.late ? 'warn' : ''}">${nd ? `${esc(nd.s.name)} · ${esc(nd.t)}` : ss.target ? 'Všechno vzato' : 'Zatím žádné'}</small></span>
        <span class="frac num">${ss.done}<i>/${ss.target}</i></span>
      </button>
      ${nd ? `<button type="button" class="take" data-act="dose" data-id="${esc(nd.s.id)}" data-i="${nd.i}">Vzít</button>` : ''}
    </div>
    <button type="button" class="grow grow--food" data-act="tab" data-tab="food">
      <span class="gi">${ic('food')}</span>
      <span class="grow__t"><b>Jídlo</b><small>${last ? `${esc(last.emoji || '')} ${esc(lastS.detail || lastS.place)}` : 'Nic zapsáno'}${snacks ? ` · +${snacks} ${plural(snacks, 'svačina', 'svačiny', 'svačin')}` : ''}</small></span>
      <span class="meals" aria-label="Snídaně, oběd, večeře">${['Snídaně', 'Oběd', 'Večeře'].map((c) => `<i class="${has(c) ? 'on' : ''}" title="${c}"></i>`).join('')}</span>
    </button>
  </div>`;
  swipe($('#weekCard'), (dir) => moveWeek(dir));
  setOrb(pct);
}
function setOrb(pct) {
  const el = $('#orbPct'); if (!el) return;
  const level = clamp(pct, 0, 100);
  $('#orbLiquid').style.setProperty('--lvl', level);
  const from = ui.shownPct ?? 0;
  ui.shownPct = pct;
  eyesMood(pct);
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
  render();
}

/* ===== tečkové oči v kapce (maskot rodiny jendovyapky) ===== */
const EYE = { lx: 0, ly: 0, happy: 0, sq: 0, wide: 0 }, TGT = { lx: 0, ly: 0, happy: 0, sq: 0, wide: 0 };
let blinkAt = 0, nextBlink = 1200, nextLook = 0, hop = 0, joyUntil = 0;
function eyesMood(pct) {
  TGT.happy = pct >= 100 || performance.now() < joyUntil ? 1 : 0;
  TGT.sq = pct < 25 ? 0.55 : 0; // žízeň → přivřené oči
  TGT.wide = pct >= 50 && pct < 100 ? 0.4 : 0;
}
function eyesJoy() { hop = 1; joyUntil = performance.now() + 1400; TGT.happy = 1; setTimeout(() => eyesMood(ui.shownPct ?? 0), 1450); }
function drawEye(g, cx, cy, w, h, happy) {
  const P = 4.2, R = 1.45;
  for (let y = -12.6; y <= 12.6; y += P) for (let x = -10.5; x <= 10.5; x += P) {
    const ax = Math.abs(x), ay = Math.abs(y);
    if (ax > w / 2 || ay > h / 2) continue;
    const r = Math.min(w, h) * 0.38, dx = Math.max(0, ax - (w / 2 - r)), dy = Math.max(0, ay - (h / 2 - r));
    if (Math.hypot(dx, dy) > r) continue;
    if (happy > 0.3 && y > -h * 0.05) continue; // ∩
    g.beginPath(); g.arc(cx + x, cy + y, R, 0, 7); g.fill();
  }
}
function eyesFrame(t) {
  const cv = $('#eyes');
  if (cv && !document.hidden) {
    const g = cv.getContext('2d'), dpr = Math.min(2, devicePixelRatio || 1);
    if (cv.width !== 96 * dpr) { cv.width = 96 * dpr; cv.height = 48 * dpr; }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (t > nextBlink) { blinkAt = t; nextBlink = t + 2400 + Math.random() * 3200; }
    if (t > nextLook) { TGT.lx = (Math.random() - 0.5) * 9; TGT.ly = (Math.random() - 0.5) * 4; nextLook = t + 1300 + Math.random() * 2600; }
    const bk = (t - blinkAt) / 170, blink = bk >= 0 && bk < 1 ? Math.abs(Math.cos(bk * Math.PI)) : 1;
    for (const k in TGT) EYE[k] += (TGT[k] - EYE[k]) * 0.14;
    hop = Math.max(0, hop - 0.05);
    g.clearRect(0, 0, 96, 48);
    g.fillStyle = '#f1fbff';
    const by = 24 - Math.sin(hop * Math.PI) * 5;
    const w = 17 + EYE.wide * 3, h = (21 + EYE.wide * 2) * blink * (1 - EYE.sq * 0.55);
    drawEye(g, 30 + EYE.lx, by + EYE.ly + EYE.sq * 3, w, Math.max(3, h), EYE.happy);
    drawEye(g, 66 + EYE.lx, by + EYE.ly + EYE.sq * 3, w, Math.max(3, h), EYE.happy);
  }
  requestAnimationFrame(eyesFrame);
}
requestAnimationFrame(eyesFrame);

/* ===== PITÍ ===== */
function logWater(ml, type) {
  ml = parseInt(ml); if (!ml) return;
  const k = ui.active, d = mutDay(k), id = newId();
  d.waterLogs.push({ id, amount: ml, type, time: hm(Date.now()) });
  d.water = dayWater(d);
  const before = Math.round(((d.water - ml) / goal()) * 100), after = Math.round((d.water / goal()) * 100);
  commit();
  eyesJoy();
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
    <div class="row">
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
        return `<button type="button" class="dose${on ? ' on' : ''}${late ? ' late' : ''}" data-act="dose" data-id="${esc(s.id)}" data-i="${i}">
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
const EMOJIS = ['🍳', '🥖', '🍔', '🍕', '🍣', '🍜', '🍝', '🥗', '🌯', '🥙', '🍗', '🥩', '🍲', '🥪', '🍟', '🌮', '🥐', '🍰', '🍦', '☕'];
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
function newFoodDraft() { return { cat: autoCat(), place: 'Domácí', detail: '', emoji: '🍳', stars: 5, edit: null, emojiOpen: false }; }
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
    <div class="rate"><span>Chuť</span><div class="stars">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-act="foodStars" data-n="${n}" class="${n <= F.stars ? 'on' : ''}" aria-label="${n} z 5">${ic('star')}</button>`).join('')}</div></div>
    <button type="button" class="btn btn--food" data-act="foodSave">${F.edit ? 'Uložit změny' : 'Uložit jídlo'}</button>
  </div>

  <h3 class="sec">${ui.active === TODAY ? 'Dnes' : dayLabel(ui.active, { weekday: 'short', day: 'numeric', month: 'numeric' })} <span class="num">${fs.length}</span></h3>
  <div class="group">${fs.length ? fs.map((f) => { const s = foodSplit(f); return `
    <div class="row${F.edit === f.id ? ' sel' : ''}">
      <span class="row__e">${esc(f.emoji || '🍽️')}</span>
      <button type="button" class="row__t" data-act="foodEdit" data-id="${f.id}" aria-label="Upravit"><small class="cat">${esc(f.category)} · <span class="num">${esc(f.time || hm(f.id))}</span></small><b>${esc(s.detail || s.place)}</b>${s.detail && s.place ? `<small>${esc(s.place)}</small>` : ''}</button>
      ${starsRow(+f.stars || 0)}
      <button type="button" class="ibtn ghost" data-act="rmFood" data-id="${f.id}" aria-label="Smazat">${ic('x')}</button>
    </div>`; }).join('') : '<p class="empty">Zatím žádné jídlo.</p>'}</div>
  <button type="button" class="btn btn--ghost" data-act="history">${ic('clock')} Historie a podniky</button>`;
  $('#fPlace').addEventListener('input', (e) => { F.place = e.target.value; });
  $('#fDetail').addEventListener('input', (e) => { F.detail = e.target.value; });
  $('#fDetail').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); saveFood(); } });
}
function saveFood() {
  const F = ui.food, place = F.place.trim(), detail = F.detail.trim();
  if (!place && !detail) { toast('Napiš, co jsi jedl', 'Stačí podnik nebo jídlo.', 'err'); $('#fDetail')?.focus(); return; }
  const k = ui.active, d = mutDay(k);
  const fields = { category: F.cat, place, detail, name: detail ? (place ? `${place} | ${detail}` : detail) : place, emoji: F.emoji, stars: F.stars };
  if (F.edit) {
    const f = d.food.find((x) => x.id === F.edit);
    if (f) Object.assign(f, fields, { edited: Date.now() });
    ui.food = newFoodDraft();
    commit();
    toast('Upraveno', fields.name, 'ok');
  } else {
    const id = newId();
    d.food.push({ id, time: hm(Date.now()), ...fields });
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
  ui.food = { cat: f.category || 'Oběd', place: s.place, detail: s.detail, emoji: f.emoji || '🍳', stars: +f.stars || 5, edit: id, emojiOpen: false };
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
        return `${head}<button type="button" class="row" data-go="${f.date}"><span class="row__e">${esc(f.emoji || '🍽️')}</span>
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
    return `<rect x="${x.toFixed(1)}" y="${(H - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(5, bw / 2).toFixed(1)}" class="${water[i] >= g ? 'hit' : ''}${k === TODAY ? ' today' : ''}"/>
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
    const notifOk = 'Notification' in window;
    $('#sheetBody').innerHTML = `
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
      <div class="set__row"><span>Připomínat pití a suplementy<small>7:00–22:00, jen když je appka otevřená nebo na pozadí</small></span><button type="button" class="switch${config.notifEnabled ? ' on' : ''}" id="nToggle" ${notifOk ? '' : 'disabled'} aria-label="Upozornění"><i></i></button></div>
      ${config.notifEnabled ? `<div class="seg">${[60, 120, 180].map((m) => `<button type="button" data-ni="${m}" class="${config.notifInterval === m ? 'on' : ''}">každé ${m / 60} h</button>`).join('')}</div>` : ''}
      ${notifOk ? '' : '<p class="note">Na iPhonu fungují jen v appce přidané na plochu.</p>'}
    </div>

    <h3 class="sec">${ic('cloud')} Synchronizace</h3>
    <div class="card set">
      <p class="note">Stejný kód na více zařízeních = stejná data. ${config.syncRoom ? `Připojeno: <b>${esc(config.syncRoom)}</b>` : 'Nepřipojeno.'}</p>
      <div class="inrow"><input id="room" class="in" type="text" autocomplete="off" autocapitalize="off" placeholder="Kód…" value="${esc(config.syncRoom)}"><button type="button" class="btn btn--water sm" id="roomSave">${config.syncRoom ? 'Změnit' : 'Spárovat'}</button></div>
      ${config.syncRoom ? `<div class="inrow"><button type="button" class="btn btn--ghost sm" id="syncNow">${ic('refresh')} Synchronizovat</button><button type="button" class="btn btn--ghost sm" id="roomOff">Odpojit</button></div>` : ''}
    </div>

    <h3 class="sec">${ic('download')} Data</h3>
    <div class="card set">
      <div class="inrow"><button type="button" class="btn btn--ghost sm" id="exp">${ic('download')} Export</button><button type="button" class="btn btn--ghost sm" id="imp">${ic('upload')} Import</button></div>
      <button type="button" class="btn btn--ghost sm" id="recover">${ic('life')} Najít data ze starých verzí</button>
      <div class="set__row"><span>Vibrace při ťuknutí<small>funguje na Androidu</small></span><button type="button" class="switch${config.haptics ? ' on' : ''}" id="hToggle" aria-label="Vibrace"><i></i></button></div>
      <button type="button" class="btn btn--danger sm" id="wipe">${ic('alert')} Smazat data v zařízení</button>
    </div>
    <img class="foot__logo" src="icons/logo.png" alt="Trackerrr">
    <p class="foot">verze ${VERSION} · jendovyapky</p>`;

    const stepGoal = (d) => { config.waterGoal = clamp(config.waterGoal + d, 500, 6000); haptic(); settingsChanged(); paint(); };
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
    $$('[data-ni]').forEach((b) => (b.onclick = () => { config.notifInterval = +b.dataset.ni; haptic(); commit({ sync: false }); paint(); }));
    $('#roomSave').onclick = () => {
      const code = $('#room').value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
      if (!code) return;
      config.syncRoom = code; persist(); paint();
      toast('Cloud propojen', `Místnost „${code}“`, 'ok');
      syncNow();
    };
    $('#syncNow') && ($('#syncNow').onclick = () => syncNow(true));
    $('#roomOff') && ($('#roomOff').onclick = () => { config.syncRoom = ''; ui.sync = 'off'; persist(); render(); paint(); toast('Odpojeno', 'Data zůstala v telefonu i v cloudu.'); });
    $('#exp').onclick = exportData;
    $('#imp').onclick = () => $('#importFile').click();
    $('#recover').onclick = recoverOld;
    $('#hToggle').onclick = () => { config.haptics = !config.haptics; haptic(); persist(); paint(); };
    $('#wipe').onclick = wipeAll;
  };
  openSheet('Nastavení', paint);
}
function toggleNotifs(paint) {
  if (config.notifEnabled) { config.notifEnabled = false; persist(); paint(); toast('Upozornění vypnutá'); return; }
  Notification.requestPermission().then((p) => {
    if (p === 'granted') { config.notifEnabled = true; persist(); paint(); toast('Upozornění zapnutá', 'Připomenu se, když budeš pozadu.', 'ok'); checkNotifs(); }
    else toast('Nepovoleno', 'Povol upozornění pro Trackerrr v nastavení telefonu.', 'err');
  });
}
function exportData() {
  const blob = new Blob([JSON.stringify({ ...state, _config: config }, null, 1)], { type: 'application/json' });
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
function recoverOld() {
  const keys = ['trackerrr_state_v9', 'trackerrr_state_v8', 'trackerrr_state_v7', 'trackerrr_state_v6', 'trackerrr_state_v5', 'trackerrr_state_v4', 'trackerrr_state_v3', 'trackerrr_state_v2', 'trackerrr_state_v1', 'app_tracker_state'];
  let found = 0;
  for (const k of keys) { const old = load(k); if (old && typeof old === 'object') { state = merge(state, old); found++; } }
  DEL = new Set(state.deletedLogs);
  if (found) { commit(); toast('Nalezeno', `Spojeno ${found} ${plural(found, 'stará záloha', 'staré zálohy', 'starých záloh')}.`, 'ok'); }
  else toast('Nic nenalezeno', 'Žádná stará data v tomhle zařízení nejsou.', 'err');
}
function wipeAll() {
  if (!confirm('Smazat všechna data v tomhle zařízení? Doporučuju předtím Export.')) return;
  if (!confirm(config.syncRoom ? 'Opravdu? Kopie v cloudu zůstane – appku odpojím, aby se data nevrátila.' : 'Opravdu? Nejde to vrátit.')) return;
  [KS, KC, 'trackerrr_state_v9'].forEach((k) => localStorage.removeItem(k));
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
  drink: (b) => { const dr = config.drinks.find((x) => x.id === b.dataset.id); if (dr) logWater(dr.ml, dr.name); },
  customToggle: () => { haptic(); ui.customOpen = !ui.customOpen; render(); },
  customSet: (b) => { ui.customMl = +b.dataset.ml; haptic(); render(); },
  customAdd: () => { logWater(ui.customMl, 'Vlastní objem'); ui.customOpen = false; render(); },
  rmWater: (b) => removeWater(ui.active, +b.dataset.id),
  dose: (b) => toggleDose(b.dataset.id, +b.dataset.i),
  editSupp: (b) => openSuppEditor(b.dataset.id),
  foodCat: (b) => { ui.food.cat = b.dataset.c; haptic(); render(); },
  foodPlace: (b) => { ui.food.place = b.dataset.p; ui.food.emoji = b.dataset.e; haptic(); render(); $('#fDetail')?.focus(); },
  foodEmoji: () => { ui.food.emojiOpen = !ui.food.emojiOpen; haptic(); render(); },
  foodEmojiSet: (b) => { ui.food.emoji = b.dataset.e; ui.food.emojiOpen = false; haptic(); render(); },
  foodStars: (b) => { ui.food.stars = +b.dataset.n; haptic(); render(); },
  foodSave: saveFood,
  foodEdit: (b) => startFoodEdit(+b.dataset.id),
  foodCancel: () => { ui.food = newFoodDraft(); render(); },
  rmFood: (b) => removeFood(ui.active, +b.dataset.id),
  history: openHistory,
  period: (b) => { config.statsPeriod = b.dataset.p; ui.statsOffset = 0; haptic(); persist(); render(); },
  statNav: (b) => { ui.statsOffset = Math.min(0, ui.statsOffset + +b.dataset.d); haptic(); render(); },
  statDay: (b) => { const k = b.dataset.k; if (k > TODAY) return; const d = getDay(k), ss = suppStats(d); toast(dayLabel(k, { weekday: 'long', day: 'numeric', month: 'numeric' }), `${fmtMl(dayWater(d))} · suply ${ss.done}/${ss.target} · ${foods(d).length} jídel`); },
  allDays: openAllDays,
  settings: openSettings,
  closeSheet,
  sync: () => { if (!config.syncRoom) { openSettings(); return; } syncNow(true); },
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
const post = (keepalive = false) => fetch(API, { method: 'POST', body: JSON.stringify({ date: config.syncRoom, data: state }), keepalive });
let syncing = false;
async function syncNow(manual = false) {
  if (!config.syncRoom) { ui.sync = 'off'; renderSyncBtn(); return; }
  if (syncing) return;
  syncing = true; ui.sync = 'busy'; renderSyncBtn();
  if (manual) haptic();
  try {
    if (!state._settings && config.settingsUpdated) state._settings = settingsSnapshot();
    const r = await fetch(API, { cache: 'no-store' });
    if (!r.ok) throw new Error(r.status);
    const all = await r.json();
    const remote = all && all[config.syncRoom];
    if (remote && typeof remote === 'object') {
      state = merge(state, remote); DEL = new Set(state.deletedLogs);
      applyRemoteSettings();
      persist();
    }
    await post();
    ui.sync = 'ok';
    if (manual) toast('Synchronizováno', `Místnost „${config.syncRoom}“`, 'ok');
  } catch {
    ui.sync = 'err';
    if (manual) toast('Cloud nejde', 'Zkus to za chvíli. Data jsou v bezpečí v telefonu.', 'err');
  }
  syncing = false;
  render();
  if (sheetPaint) sheetPaint();
}
async function upload() {
  if (!config.syncRoom || syncing) return;
  ui.sync = 'busy'; renderSyncBtn();
  try { await post(); ui.sync = 'ok'; } catch { ui.sync = 'err'; }
  renderSyncBtn();
}
addEventListener('pagehide', () => { if (upTimer && config.syncRoom) { clearTimeout(upTimer); upTimer = 0; try { post(true); } catch {} } });

/* ===== upozornění ===== */
async function notify(title, body, tag) {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) return await reg.showNotification(title, { body, tag, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' });
  } catch {}
  try { new Notification(title, { body, tag }); } catch {}
}
function checkNotifs() {
  if (!config.notifEnabled || !('Notification' in window) || Notification.permission !== 'granted') return;
  const h = new Date().getHours(); if (h >= 22 || h < 7) return;
  const d = getDay(TODAY), every = config.notifInterval * 60000, nm = nowMins();
  const due = (key) => Date.now() - (+localStorage.getItem('last_notif_' + key) || 0) > every;
  const mark = (key) => localStorage.setItem('last_notif_' + key, String(Date.now()));
  const behind = paceTarget() - dayWater(d);
  if (behind >= 250 && due('water')) { notify('Kde máš vodu? 💧', `Jsi pozadu o ${fmtMl(behind)}. Napij se.`, 'water'); mark('water'); }
  for (const s of config.customSuplementsList) {
    const expected = s.customTimes.filter((t) => (toMins(t) ?? 9999) + 15 <= nm).length;
    if (doses(d, s.id).length < expected && due(s.id)) { notify(`Čas na ${s.name} 💊`, 'Ještě sis nevzal dávku.', 'supp-' + s.id); mark(s.id); }
  }
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
  checkNotifs();
}
setInterval(tick, 30000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { tick(); if (config.syncRoom) syncNow(); }
});

/* ===== start ===== */
if (!state._settings && config.settingsUpdated) state._settings = settingsSnapshot();
persist();
$$('#dock button').forEach((b) => { b.innerHTML = ic({ home: 'home', water: 'drop', supps: 'pill', food: 'food', stats: 'chart' }[b.dataset.tab]); });
$('[data-act="settings"]').innerHTML = ic('sliders');
$('.sheet__head .ibtn').innerHTML = ic('x');
document.body.dataset.tab = ui.tab;
render();
// úvod: krátký, ťuknutím přeskočit
(() => {
  const boot = $('#boot');
  const done = () => { boot.classList.add('out'); document.body.classList.add('ready'); setTimeout(() => boot.remove(), 600); };
  if (reduced() || sessionStorage.getItem('booted')) { boot.remove(); document.body.classList.add('ready'); return; }
  try { sessionStorage.setItem('booted', '1'); } catch {}
  boot.addEventListener('click', done, { once: true });
  setTimeout(done, 1650);
})();
if (config.syncRoom) syncNow(); else checkNotifs();
// service worker jen na webu (lokálně bez cache, ať je vidět každá změna)
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
