// Trackerrr sync: soukromá data jednoho člověka. Přístup jen se 120bitovým klíčem v hlavičce Authorization
// (nikdy v adrese → nezůstane v logech). Server klíč nezná, data hledá podle jeho SHA-256 otisku.
// Nejde vypsat ostatní – každý klíč má vlastní Durable Object.
import { DurableObject } from 'cloudflare:workers';

const KEY = /^[a-km-z2-9]{24}$/; // stejná abeceda jako v app.js (bez l, 0, 1)
const ORIGINS = [/^https:\/\/tracker\.jendovyapky\.eu$/, /^https:\/\/([a-z0-9-]+\.)?tracker-[a-z0-9]+\.pages\.dev$/, /^https:\/\/([a-z0-9-]+\.)?trackerrr\.pages\.dev$/,
  /^https:\/\/jendovyapky\.github\.io$/, /^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/];
const MAX_BODY = 4 * 1024 * 1024;
const isDay = (k) => /^\d{4}-\d{2}-\d{2}$/.test(k);
const sum = (arr, f) => arr.reduce((a, x) => a + (+f(x) || 0), 0);

function cors(req) {
  const o = req.headers.get('Origin') || '';
  if (!ORIGINS.some((r) => r.test(o))) return {};
  return { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' };
}
const json = (data, status, h) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...h } });

export default {
  async fetch(req, env) {
    const h = cors(req);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    const url = new URL(req.url);
    if (url.pathname !== '/data') return new Response('Trackerrr', { headers: h });
    const key = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!KEY.test(key)) return json({ error: 'key' }, 401, h);
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('trackerrr:' + key)))].map((b) => b.toString(16).padStart(2, '0')).join('');
    const vault = env.VAULT.get(env.VAULT.idFromName(hash));
    if (req.method === 'GET') return json(await vault.read(), 200, h);
    if (req.method === 'DELETE') { await vault.wipe(); return json({ ok: true }, 200, h); }
    if (req.method === 'POST') {
      if (+(req.headers.get('Content-Length') || 0) > MAX_BODY) return json({ error: 'size' }, 413, h);
      const text = await req.text();
      if (text.length > MAX_BODY) return json({ error: 'size' }, 413, h);
      let body; try { body = JSON.parse(text); } catch { return json({ error: 'json' }, 400, h); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'json' }, 400, h);
      return json(await vault.sync(body), 200, h);
    }
    return json({ error: 'method' }, 405, h);
  },
};

// Slučování – stejná pravidla jako merge() v app.js (sjednocení podle id, náhrobky v deletedLogs, upravené jídlo podle `edited`).
function mergeDay(A = {}, B = {}, del) {
  const byId = (x, y) => {
    const m = new Map();
    for (const it of [...(Array.isArray(x) ? x : []), ...(Array.isArray(y) ? y : [])]) {
      if (!it || typeof it !== 'object' || it.id == null) continue;
      const p = m.get(it.id);
      if (!p || (it.edited || 0) > (p.edited || 0)) m.set(it.id, it);
    }
    return [...m.values()].filter((i) => !del.has(i.id)).sort((p, q) => p.id - q.id);
  };
  const wl = byId(A.waterLogs, B.waterLogs), food = byId(A.food, B.food), vit = {};
  const av = A.vitamins || {}, bv = B.vitamins || {};
  for (const id of new Set([...Object.keys(av), ...Object.keys(bv)])) {
    const arr = [...new Set([...(Array.isArray(av[id]) ? av[id] : []), ...(Array.isArray(bv[id]) ? bv[id] : [])])].filter((t) => typeof t === 'number' && !del.has(t)).sort((p, q) => p - q);
    if (arr.length) vit[id] = arr;
  }
  if (!wl.length && !food.length && !Object.keys(vit).length) return null;
  return { water: sum(wl, (l) => parseInt(l.amount)), waterLogs: wl, food, vitamins: vit };
}

export class Vault extends DurableObject {
  async read() {
    const s = this.ctx.storage, meta = (await s.get('meta')) || {};
    const out = { lastUpdated: meta.lastUpdated || 0, deletedLogs: meta.deletedLogs || [] };
    if (meta._settings) out._settings = meta._settings;
    for (const [k, v] of await s.list({ prefix: 'd:' })) out[k.slice(2)] = v;
    return out;
  }
  async sync(inc) {
    const cur = await this.read();
    const del = new Set([...cur.deletedLogs, ...(Array.isArray(inc.deletedLogs) ? inc.deletedLogs.filter((x) => typeof x === 'number') : [])]);
    const puts = {}, dels = [];
    for (const k of new Set([...Object.keys(cur), ...Object.keys(inc)])) {
      if (!isDay(k)) continue;
      const m = mergeDay(cur[k], inc[k], del);
      if (!m) { if (cur[k]) dels.push('d:' + k); delete cur[k]; continue; }
      if (JSON.stringify(m) !== JSON.stringify(cur[k])) puts['d:' + k] = m;
      cur[k] = m;
    }
    const si = inc._settings, sc = cur._settings;
    if (si && typeof si === 'object' && (si.updatedAt || 0) > (sc?.updatedAt || 0)) cur._settings = si;
    cur.deletedLogs = [...del];
    cur.lastUpdated = Math.max(cur.lastUpdated || 0, +inc.lastUpdated || 0);
    puts.meta = { lastUpdated: cur.lastUpdated, deletedLogs: cur.deletedLogs, _settings: cur._settings };
    const entries = Object.entries(puts);
    for (let i = 0; i < entries.length; i += 100) await this.ctx.storage.put(Object.fromEntries(entries.slice(i, i + 100)));
    for (let i = 0; i < dels.length; i += 100) await this.ctx.storage.delete(dels.slice(i, i + 100));
    return cur;
  }
  async wipe() { await this.ctx.storage.deleteAll(); }
}
