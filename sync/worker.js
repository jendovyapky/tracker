// Trackerrr sync: soukromá data jednoho člověka. Přístup jen se 120bitovým klíčem v hlavičce Authorization
// (nikdy v adrese → nezůstane v logech). Server klíč nezná, data hledá podle jeho SHA-256 otisku.
// Nejde vypsat ostatní – každý klíč má vlastní Durable Object.
// Navíc upozornění (Web Push): každých 15 min se zkontroluje, jestli nejsi pozadu s pitím / suplementy.
import { DurableObject } from 'cloudflare:workers';

const KEY = /^[a-km-z2-9]{24}$/; // stejná abeceda jako v app.js (bez l, 0, 1)
const ORIGINS = [/^https:\/\/tracker\.jendovyapky\.eu$/, /^https:\/\/trackerrr\.jendovyapky\.workers\.dev$/, /^https:\/\/([a-z0-9-]+\.)?trackerrr(-[a-z0-9]+)?\.pages\.dev$/,
  /^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/];
const MAX_BODY = 4 * 1024 * 1024;
const isDay = (k) => /^\d{4}-\d{2}-\d{2}$/.test(k);
const sum = (arr, f) => arr.reduce((a, x) => a + (+f(x) || 0), 0);

function cors(req) {
  const o = req.headers.get('Origin') || '';
  if (!ORIGINS.some((r) => r.test(o))) return {};
  return { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' };
}
const json = (data, status, h) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...h } });
const registry = (env) => env.REGISTRY.get(env.REGISTRY.idFromName('registry'));

export default {
  async fetch(req, env) {
    const h = cors(req);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    const url = new URL(req.url), path = url.pathname;
    if (path === '/push/vapid') return json({ key: await registry(env).vapidPublic() }, 200, h);
    if (path !== '/data' && !path.startsWith('/push/')) return new Response('Trackerrr', { headers: h });
    const key = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!KEY.test(key)) return json({ error: 'key' }, 401, h);
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('trackerrr:' + key)))].map((b) => b.toString(16).padStart(2, '0')).join('');
    const vault = env.VAULT.get(env.VAULT.idFromName(hash));
    if (path === '/data' && req.method === 'GET') return json(await vault.read(), 200, h);
    if (path === '/data' && req.method === 'DELETE') { await vault.wipe(); await registry(env).remove(hash); return json({ ok: true }, 200, h); }
    if (req.method !== 'POST') return json({ error: 'method' }, 405, h);
    if (+(req.headers.get('Content-Length') || 0) > MAX_BODY) return json({ error: 'size' }, 413, h);
    const text = await req.text();
    if (text.length > MAX_BODY) return json({ error: 'size' }, 413, h);
    let body; try { body = JSON.parse(text); } catch { return json({ error: 'json' }, 400, h); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'json' }, 400, h);
    if (path === '/data') return json(await vault.sync(body), 200, h);

    // ---- upozornění ----
    const sub = body.sub;
    const okSub = sub && typeof sub.endpoint === 'string' && /^https:\/\//.test(sub.endpoint) && sub.keys?.p256dh && sub.keys?.auth;
    if (path === '/push/subscribe') {
      if (!okSub) return json({ error: 'sub' }, 400, h);
      await vault.addSub({ endpoint: sub.endpoint, keys: { p256dh: String(sub.keys.p256dh), auth: String(sub.keys.auth) } },
        { interval: [60, 120, 180].includes(+body.interval) ? +body.interval : 120, tz: typeof body.tz === 'string' && body.tz.length < 40 ? body.tz : 'Europe/Prague' });
      await registry(env).add(hash);
      return json({ ok: true }, 200, h);
    }
    if (path === '/push/unsubscribe') {
      const left = await vault.removeSub(String(body.endpoint || sub?.endpoint || ''));
      if (!left) await registry(env).remove(hash);
      return json({ ok: true }, 200, h);
    }
    if (path === '/push/test') {
      const subs = await vault.subs(), s = subs.find((x) => x.endpoint === (body.endpoint || sub?.endpoint)) || subs[0];
      if (!s) return json({ error: 'nosub' }, 404, h);
      const r = await sendPush(env, s, { title: 'Trackerrr 💧', body: 'Upozornění fungujou. Připomenu se, když budeš pozadu.', tag: 'test' });
      return json(r, 200, h);
    }
    return json({ error: 'path' }, 404, h);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(runChecks(env));
  },
};

/* ---------------- Kontrola všech přihlášených ---------------- */
async function runChecks(env) {
  const reg = registry(env);
  for (const hash of await reg.list()) {
    try {
      const vault = env.VAULT.get(env.VAULT.idFromName(hash));
      const { subs, msgs } = await vault.check(Date.now());
      for (const msg of msgs) for (const s of subs) {
        const r = await sendPush(env, s, msg);
        if (r.status === 404 || r.status === 410) { if (!(await vault.removeSub(s.endpoint))) await reg.remove(hash); } // telefon se odhlásil
      }
    } catch (e) { console.log('check failed', e?.message); }
  }
}

// místní datum a minuty dne v časovém pásmu telefonu
function localNow(now, tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date(now)).map((x) => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, mins: +p.hour * 60 + +p.minute };
}
const toMins = (t) => { const m = /^(\d{1,2}):(\d{2})$/.exec(t || ''); return m ? +m[1] * 60 + +m[2] : null; };
const fmtMl = (ml) => (ml >= 1000 ? `${(Math.round(ml / 100) / 10).toString().replace('.', ',')} l` : `${ml} ml`);

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
    if (si && typeof si === 'object' && (!sc || (si.updatedAt || 0) > (sc.updatedAt || 0))) cur._settings = si;
    cur.deletedLogs = [...del];
    cur.lastUpdated = Math.max(cur.lastUpdated || 0, +inc.lastUpdated || 0);
    puts.meta = { lastUpdated: cur.lastUpdated, deletedLogs: cur.deletedLogs, _settings: cur._settings };
    const entries = Object.entries(puts);
    for (let i = 0; i < entries.length; i += 100) await this.ctx.storage.put(Object.fromEntries(entries.slice(i, i + 100)));
    for (let i = 0; i < dels.length; i += 100) await this.ctx.storage.delete(dels.slice(i, i + 100));
    return cur;
  }
  async wipe() { await this.ctx.storage.deleteAll(); }

  // ---- upozornění ----
  async subs() { return (await this.ctx.storage.get('push')) || []; }
  async addSub(sub, prefs) {
    const list = (await this.subs()).filter((x) => x.endpoint !== sub.endpoint);
    list.push({ ...sub, ...prefs });
    await this.ctx.storage.put('push', list.slice(-5));
  }
  async removeSub(endpoint) {
    const list = (await this.subs()).filter((x) => x.endpoint !== endpoint);
    await this.ctx.storage.put('push', list);
    return list.length;
  }
  // Co poslat teď: pití podle tempa (7:00 → 0 %, 21:00 → 100 % cíle), suplementy po naplánovaném čase. Noční klid 22–7.
  async check(now) {
    const subs = await this.subs();
    if (!subs.length) return { subs, msgs: [] };
    const tz = subs[0].tz || 'Europe/Prague', every = Math.min(...subs.map((s) => s.interval || 120)) * 60000;
    const { day, mins } = localNow(now, tz);
    if (mins < 420 || mins >= 1320) return { subs, msgs: [] };
    const s = this.ctx.storage, meta = (await s.get('meta')) || {}, d = (await s.get('d:' + day)) || {};
    const del = new Set(meta.deletedLogs || []), set = meta._settings || {};
    const last = (await s.get('notified')) || {}, msgs = [];
    const due = (k) => now - (last[k] || 0) > every;
    const goal = +set.waterGoal || 2100;
    const water = sum((d.waterLogs || []).filter((l) => !del.has(l.id)), (l) => parseInt(l.amount));
    const behind = Math.round(goal * Math.max(0, Math.min(1, (mins - 420) / 840))) - water;
    if (behind >= 250 && due('water')) { msgs.push({ title: 'Kde máš vodu? 💧', body: `Jsi pozadu o ${fmtMl(behind)}. Napij se.`, tag: 'water' }); last.water = now; }
    const late = [];
    for (const sp of Array.isArray(set.supps) ? set.supps : []) {
      const times = Array.isArray(sp.customTimes) ? sp.customTimes : [];
      const expected = times.filter((t) => (toMins(t) ?? 9999) + 15 <= mins).length;
      const taken = ((d.vitamins || {})[sp.id] || []).filter((t) => !del.has(t)).length;
      if (taken < expected && due('s:' + sp.id)) { late.push(sp.name); last['s:' + sp.id] = now; }
    }
    if (late.length) msgs.push({ title: late.length === 1 ? `Čas na ${late[0]} 💊` : 'Čas na suplementy 💊', body: late.length === 1 ? 'Ještě sis nevzal dávku.' : `Ještě sis nevzal: ${late.join(', ')}.`, tag: 'supps' });
    if (msgs.length) await s.put('notified', last);
    return { subs, msgs };
  }
}

// Seznam klíčů s přihlášenými telefony (jen otisky) + VAPID klíče serveru – NEMAZAT, jinak přestanou chodit upozornění.
export class Registry extends DurableObject {
  async add(hash) { await this.ctx.storage.put('v:' + hash, 1); }
  async remove(hash) { await this.ctx.storage.delete('v:' + hash); }
  async list() { return [...(await this.ctx.storage.list({ prefix: 'v:' })).keys()].map((k) => k.slice(2)); }
  async vapid() {
    let v = await this.ctx.storage.get('vapid');
    if (!v) {
      const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
      v = { jwk: await crypto.subtle.exportKey('jwk', kp.privateKey), publicKey: b64u(await crypto.subtle.exportKey('raw', kp.publicKey)) };
      await this.ctx.storage.put('vapid', v);
    }
    return v;
  }
  async vapidPublic() { return (await this.vapid()).publicKey; }
}

/* ---------------- Web Push (VAPID + aes128gcm) – stejně jako mraq-push ---------------- */
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); };
const concat = (...arrs) => { const n = arrs.reduce((a, x) => a + x.length, 0), o = new Uint8Array(n); let i = 0; for (const a of arrs) { o.set(a, i); i += a.length; } return o; };
const enc = (s) => new TextEncoder().encode(s);

let vapidCache = null;
async function vapidKeys(env) {
  if (vapidCache) return vapidCache;
  const v = await registry(env).vapid();
  vapidCache = { privateKey: await crypto.subtle.importKey('jwk', v.jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']), publicKey: v.publicKey };
  return vapidCache;
}
async function vapidAuth(env, endpoint) {
  const { privateKey, publicKey } = await vapidKeys(env);
  const header = b64u(enc(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64u(enc(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.CONTACT || 'mailto:jendovyapky@gmail.com' })));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, enc(`${header}.${claims}`));
  return `vapid t=${header}.${claims}.${b64u(sig)}, k=${publicKey}`;
}
async function hkdf(salt, ikm, info, len) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, len * 8));
}
async function encryptPayload(sub, payload) {
  const uaPublic = unb64u(sub.keys.p256dh), authSecret = unb64u(sub.keys.auth);
  const as = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', as.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, as.privateKey, 256));
  const ikm = await hkdf(authSecret, shared, concat(enc('WebPush: info\0'), uaPublic, asPublic), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, concat(enc(payload), new Uint8Array([2]))));
  return concat(salt, new Uint8Array([0, 0, 16, 0]), new Uint8Array([asPublic.length]), asPublic, ct);
}
async function sendPush(env, sub, msg) {
  const r = await fetch(sub.endpoint, {
    method: 'POST',
    headers: { Authorization: await vapidAuth(env, sub.endpoint), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '1800', Urgency: 'normal' },
    body: await encryptPayload(sub, JSON.stringify({ ...msg, url: (env.APP_URL || 'https://tracker.jendovyapky.eu') + '/' })),
  });
  return { ok: r.ok, status: r.status };
}
