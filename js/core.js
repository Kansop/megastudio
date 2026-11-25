/* MegaStudio core: storage, router, command palette, shortcuts, UI helpers */
(function () {
  'use strict';
  const MS = (window.MS = { apps: [], appMap: {}, commands: [], searchProviders: [], version: '1.0.0' });

  /* ---------- tiny utils ---------- */
  MS.uid = (p = '') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  MS.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  MS.debounce = (fn, ms = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  MS.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  MS.pad = (n, w = 2) => String(n).padStart(w, '0');
  MS.isoDate = (d = new Date()) => `${d.getFullYear()}-${MS.pad(d.getMonth() + 1)}-${MS.pad(d.getDate())}`;
  MS.fmtTime = (t) => { const d = new Date(t); return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); };
  MS.ago = (t) => { const s = (Date.now() - t) / 1000; if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + 'm ago'; if (s < 86400) return Math.floor(s / 3600) + 'h ago'; return Math.floor(s / 86400) + 'd ago'; };
  /** h('div.cls#id', {attrs, on:{}}, ...children) */
  MS.h = function h(sel, attrs, ...kids) {
    const m = sel.match(/^([a-z0-9-]+)?((?:[.#][\w-]+)*)$/i) || [];
    const el = document.createElement(m[1] || 'div');
    (m[2] || '').replace(/([.#])([\w-]+)/g, (_, t, v) => { if (t === '.') el.classList.add(v); else el.id = v; });
    if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (k === 'on') for (const e in v) el.addEventListener(e, v[e]);
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'class') { if (v) String(v).split(/\s+/).filter(Boolean).forEach((c) => el.classList.add(c)); }
      else if (k in el && k !== 'list' && k !== 'type' && typeof v !== 'string') el[k] = v;
      else if (v !== false && v != null) el.setAttribute(k, v === true ? '' : v);
    }
    const add = (c) => { if (c == null || c === false) return; if (Array.isArray(c)) c.forEach(add); else el.append(c instanceof Node ? c : document.createTextNode(c)); };
    kids.forEach(add);
    return el;
  };
  MS.download = (name, data, type = 'application/octet-stream') => {
    const blob = data instanceof Blob ? data : new Blob([data], { type });
    const a = MS.h('a', { href: URL.createObjectURL(blob), download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
  MS.pickFile = (accept = '*/*', multiple = false) => new Promise((res) => {
    const i = MS.h('input', { type: 'file', accept, multiple });
    i.onchange = () => res(multiple ? [...i.files] : i.files[0]);
    i.click();
  });
  MS.readText = (f) => new Promise((r, j) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.onerror = j; fr.readAsText(f); });
  MS.readDataURL = (f) => new Promise((r, j) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.onerror = j; fr.readAsDataURL(f); });

  /* ---------- events ---------- */
  const listeners = {};
  MS.on = (e, f) => ((listeners[e] = listeners[e] || []).push(f), () => MS.off(e, f));
  MS.off = (e, f) => { listeners[e] = (listeners[e] || []).filter((x) => x !== f); };
  MS.emit = (e, d) => (listeners[e] || []).slice().forEach((f) => { try { f(d); } catch (err) { console.error(err); } });

  /* ---------- IndexedDB ---------- */
  let dbp;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise((res) => {
      if (!('indexedDB' in window)) return res(null);
      const req = indexedDB.open('megastudio', 1);
      req.onupgradeneeded = () => { const d = req.result; d.createObjectStore('kv'); d.createObjectStore('files', { keyPath: 'id' }); };
      req.onsuccess = () => res(req.result);
      req.onerror = () => res(null);
      req.onblocked = () => res(null);
    });
    return dbp;
  }
  function tx(store, mode, fn) {
    return db().then((d) => new Promise((res, rej) => {
      const t = d.transaction(store, mode); const r = fn(t.objectStore(store));
      t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
    }));
  }
  const mem = { kv: new Map(), files: new Map() };
  const withDb = (idb, fallback) => db().then((d) => (d ? idb() : fallback()));
  MS.db = {
    get: (k) => withDb(() => tx('kv', 'readonly', (s) => s.get(k)), () => mem.kv.get(k)),
    set: (k, v) => withDb(() => tx('kv', 'readwrite', (s) => s.put(v, k)), () => mem.kv.set(k, v)),
    del: (k) => withDb(() => tx('kv', 'readwrite', (s) => s.delete(k)), () => mem.kv.delete(k)),
    keys: () => withDb(() => tx('kv', 'readonly', (s) => s.getAllKeys()), () => [...mem.kv.keys()]),
    files: {
      all: () => withDb(() => tx('files', 'readonly', (s) => s.getAll()), () => [...mem.files.values()]),
      get: (id) => withDb(() => tx('files', 'readonly', (s) => s.get(id)), () => mem.files.get(id)),
      put: (f) => withDb(() => tx('files', 'readwrite', (s) => s.put(f)), () => mem.files.set(f.id, f)).then(() => (MS.emit('files:changed'), f)),
      del: (id) => withDb(() => tx('files', 'readwrite', (s) => s.delete(id)), () => mem.files.delete(id)).then(() => MS.emit('files:changed')),
      clear: () => withDb(() => tx('files', 'readwrite', (s) => s.clear()), () => mem.files.clear()).then(() => MS.emit('files:changed')),
    },
    clear: () => withDb(() => tx('kv', 'readwrite', (s) => s.clear()), () => mem.kv.clear()),
  };

  /* ---------- persistent JSON stores with debounced save ---------- */
  const stores = {};
  const statusEl = () => document.getElementById('save-status');
  MS.store = async function (name, defaults) {
    if (stores[name]) return stores[name];
    let data = await MS.db.get('store:' + name);
    if (data == null) data = typeof defaults === 'function' ? defaults() : structuredClone(defaults);
    const st = {
      name, data,
      save: MS.debounce(async () => {
        try { await MS.db.set('store:' + name, st.data); const e = statusEl(); if (e) { e.textContent = 'Saved ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); } }
        catch (err) { console.error(err); MS.toast('Save failed: ' + err.message, 'bad'); }
      }, 350),
      touch() { const e = statusEl(); if (e) e.textContent = 'Saving…'; st.save(); MS.emit('store:' + name, st.data); },
    };
    stores[name] = st;
    return st;
  };
  MS.allStores = () => stores;

  /* ---------- toasts & modals ---------- */
  MS.toast = (msg, kind = '') => {
    const t = MS.h('div.toast', msg);
    if (kind === 'bad') t.style.borderLeftColor = 'var(--bad)';
    if (kind === 'good') t.style.borderLeftColor = 'var(--good)';
    document.getElementById('toasts').append(t);
    setTimeout(() => { t.style.opacity = 0; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, 2600);
  };
  const modal = () => document.getElementById('modal');
  MS.modal = (content, { onClose } = {}) => {
    const m = modal(); const box = m.querySelector('.modal-box');
    box.innerHTML = ''; box.style.width = ''; box.append(content); m.classList.remove('hidden');
    const close = () => { m.classList.add('hidden'); box.innerHTML = ''; m.onclick = null; document.removeEventListener('keydown', esc, true); onClose && onClose(); };
    const esc = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    document.addEventListener('keydown', esc, true);
    m.onclick = (e) => { if (e.target === m) close(); };
    return close;
  };
  MS.prompt = (title, value = '', { placeholder = '', multiline = false } = {}) => new Promise((res) => {
    const inp = MS.h(multiline ? 'textarea.input' : 'input.input', { value, placeholder, style: { width: '100%', minHeight: multiline ? '140px' : '' } });
    let done = false;
    const finish = (v) => { if (done) return; done = true; close(); res(v); };
    const close = MS.modal(MS.h('div.col', MS.h('h2', title), inp,
      MS.h('div.row', { style: { justifyContent: 'flex-end' } },
        MS.h('button.btn', { on: { click: () => finish(null) } }, 'Cancel'),
        MS.h('button.btn.primary', { on: { click: () => finish(inp.value) } }, 'OK'))), { onClose: () => { if (!done) { done = true; res(null); } } });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (!multiline || e.ctrlKey || e.metaKey)) { e.preventDefault(); finish(inp.value); } });
    setTimeout(() => { inp.focus(); inp.select && inp.select(); }, 20);
  });
  MS.confirm = (title, body = '', okText = 'OK') => new Promise((res) => {
    let done = false;
    const finish = (v) => { if (done) return; done = true; close(); res(v); };
    const ok = MS.h('button.btn.primary', { on: { click: () => finish(true) } }, okText);
    const close = MS.modal(MS.h('div.col', MS.h('h2', title), body && MS.h('p.muted', body),
      MS.h('div.row', { style: { justifyContent: 'flex-end' } }, MS.h('button.btn', { on: { click: () => finish(false) } }, 'Cancel'), ok)), { onClose: () => { if (!done) { done = true; res(false); } } });
    setTimeout(() => ok.focus(), 20);
  });

  /* ---------- apps & router ---------- */
  MS.register = (app) => { app.group = app.group || 'Apps'; MS.apps.push(app); MS.appMap[app.id] = app; (app.commands || []).forEach((c) => MS.command({ ...c, group: app.name })); };
  let current = null; let currentId = null;
  MS.current = () => currentId;
  MS.go = (id, ...args) => { location.hash = '#/' + [id, ...args.map(encodeURIComponent)].join('/'); };
  MS.setActions = (...els) => { const a = document.getElementById('app-actions'); a.innerHTML = ''; a.append(...els.flat().filter(Boolean)); };
  async function route() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
    let id = parts[0] || 'dashboard'; if (!MS.appMap[id]) id = 'dashboard';
    const args = parts.slice(1);
    if (current && currentId === id && current.route) { current.route(args); return; }
    if (current && current.unmount) { try { current.unmount(); } catch (e) { console.error(e); } }
    const app = MS.appMap[id]; currentId = id;
    const view = document.getElementById('view');
    view.innerHTML = ''; view.className = ''; view.removeAttribute('style'); view.scrollTop = 0; MS.setActions();
    document.getElementById('app-title').textContent = app.icon + '  ' + app.name;
    document.title = app.name + ' — MegaStudio';
    document.querySelectorAll('.nav-item').forEach((n) => n.classList.toggle('active', n.dataset.id === id));
    document.body.classList.remove('nav-open');
    try { current = (await app.mount(view, args)) || {}; } catch (e) { console.error(e); view.append(MS.h('div.empty', MS.h('div.big', '💥'), 'This app crashed: ' + e.message)); current = {}; }
    if (current.route) current.route(args);
    MS.emit('route', { id, args });
    MS.recordRecent(id);
  }
  MS.recordRecent = async (id) => { const s = await MS.store('meta', { recent: [], opened: {} }); s.data.recent = [id, ...s.data.recent.filter((x) => x !== id)].slice(0, 8); s.data.opened[id] = (s.data.opened[id] || 0) + 1; s.touch(); };
  window.addEventListener('hashchange', route);

  /* ---------- commands, shortcuts ---------- */
  MS.command = (c) => { MS.commands = MS.commands.filter((x) => x.id !== c.id); MS.commands.push(c); };
  const norm = (k) => k.toLowerCase().replace(/mod/g, navigator.platform.includes('Mac') ? 'meta' : 'ctrl').split('+').sort().join('+');
  function eventKey(e) {
    const parts = []; if (e.ctrlKey) parts.push('ctrl'); if (e.metaKey) parts.push('meta'); if (e.altKey) parts.push('alt'); if (e.shiftKey) parts.push('shift');
    let k = e.key.toLowerCase(); if (k === ' ') k = 'space'; if (!['control', 'meta', 'alt', 'shift'].includes(k)) parts.push(k);
    return parts.sort().join('+');
  }
  MS.eventKey = eventKey;
  const typing = (el) => el && (el.isContentEditable || /^(input|textarea|select)$/i.test(el.tagName));
  document.addEventListener('keydown', (e) => {
    const k = eventKey(e);
    for (const c of MS.commands) {
      if (!c.key) continue;
      const keys = [].concat(c.key);
      if (keys.some((x) => norm(x) === k || (x.toLowerCase().includes('mod') && norm(x.replace(/mod/gi, 'meta')) === k))) {
        if (!k.includes('ctrl') && !k.includes('meta') && !k.includes('alt') && typing(e.target)) continue;
        if (c.when && !c.when()) continue;
        e.preventDefault(); c.run(); return;
      }
    }
  });

  /* ---------- fuzzy search & palette ---------- */
  MS.fuzzy = (q, s) => {
    q = q.toLowerCase(); s = String(s).toLowerCase(); if (!q) return 1;
    const i = s.indexOf(q); if (i >= 0) return 100 - i + (i === 0 ? 50 : 0);
    let si = 0, score = 0, streak = 0;
    for (const ch of q) { const f = s.indexOf(ch, si); if (f < 0) return 0; streak = f === si ? streak + 1 : 0; score += 1 + streak; si = f + 1; }
    return score;
  };
  const pal = { el: null, items: [], sel: 0 };
  MS.openPalette = (prefill = '') => {
    pal.el = document.getElementById('palette'); pal.el.classList.remove('hidden');
    const inp = document.getElementById('palette-input'); inp.value = prefill; inp.focus(); renderPalette();
  };
  MS.closePalette = () => { document.getElementById('palette').classList.add('hidden'); };
  const keyLabel = (k) => [].concat(k)[0].replace(/mod/i, navigator.platform.includes('Mac') ? '⌘' : 'Ctrl').replace(/\+/g, ' ');
  async function renderPalette() {
    const q = document.getElementById('palette-input').value.trim();
    let items = [];
    MS.apps.forEach((a) => items.push({ icon: a.icon, title: 'Open ' + a.name, sub: a.desc || '', run: () => MS.go(a.id), score: MS.fuzzy(q, a.name + ' ' + (a.keywords || '')) * 1.4 }));
    MS.commands.forEach((c) => items.push({ icon: c.icon || '⚡', title: c.title, sub: c.group || '', key: c.key, run: c.run, score: MS.fuzzy(q, c.title + ' ' + (c.group || '')) }));
    if (q.length > 1) for (const p of MS.searchProviders) { try { (await p(q)).forEach((r) => items.push({ ...r, score: r.score ?? MS.fuzzy(q, r.title) })); } catch (e) { console.error(e); } }
    if (q.startsWith('=')) { try { const v = MS.calc(q.slice(1)); items.unshift({ icon: '🧮', title: `= ${v}`, sub: 'Calculator — Enter to copy', run: () => navigator.clipboard?.writeText(String(v)), score: 1e6 }); } catch (e) {} }
    items = items.filter((i) => i.score > 0).sort((a, b) => b.score - a.score).slice(0, 40);
    pal.items = items; pal.sel = 0;
    const ul = document.getElementById('palette-list'); ul.innerHTML = '';
    items.forEach((it, i) => ul.append(MS.h('li', { class: i === 0 ? 'sel' : '', on: { click: () => runItem(i), mousemove: () => select(i) } },
      MS.h('span', it.icon || '•'), MS.h('div', MS.h('div', it.title), it.sub ? MS.h('div.small.muted', it.sub) : null), it.key ? MS.h('kbd.k', keyLabel(it.key)) : null)));
    if (!items.length) ul.append(MS.h('li.muted', 'No matches'));
  }
  function select(i) { pal.sel = i; [...document.querySelectorAll('#palette-list li')].forEach((li, j) => li.classList.toggle('sel', j === i)); document.querySelectorAll('#palette-list li')[i]?.scrollIntoView({ block: 'nearest' }); }
  function runItem(i) { const it = pal.items[i]; if (!it) return; MS.closePalette(); setTimeout(() => it.run(), 10); }
  document.addEventListener('DOMContentLoaded', () => {
    const inp = document.getElementById('palette-input');
    inp.addEventListener('input', renderPalette);
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); select(Math.min(pal.sel + 1, pal.items.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); select(Math.max(pal.sel - 1, 0)); }
      else if (e.key === 'Enter') { e.preventDefault(); runItem(pal.sel); }
      else if (e.key === 'Escape') { e.preventDefault(); MS.closePalette(); }
    });
    document.getElementById('palette').addEventListener('click', (e) => { if (e.target.id === 'palette') MS.closePalette(); });
  });

  /* ---------- safe math evaluator (shared by palette, sheets, calc) ---------- */
  MS.calc = (expr, vars = {}) => {
    const fns = { sin: Math.sin, cos: Math.cos, tan: Math.tan, sqrt: Math.sqrt, abs: Math.abs, log: Math.log10, ln: Math.log, exp: Math.exp, round: Math.round, floor: Math.floor, ceil: Math.ceil, min: Math.min, max: Math.max, pow: Math.pow, asin: Math.asin, acos: Math.acos, atan: Math.atan };
    const consts = { pi: Math.PI, e: Math.E, ...vars };
    const toks = []; const re = /\s*(\d+\.?\d*(?:e[+-]?\d+)?|\.\d+|[a-z_][a-z0-9_]*|\*\*|[-+*/%^(),!])/giy; let m; let pos = 0;
    expr = String(expr);
    while (pos < expr.length) { re.lastIndex = pos; m = re.exec(expr); if (!m) { if (/^\s*$/.test(expr.slice(pos))) break; throw new Error('Bad input'); } toks.push(m[1]); pos = re.lastIndex; }
    let i = 0; const peek = () => toks[i]; const next = () => toks[i++];
    const prim = () => {
      const t = next(); if (t == null) throw new Error('Unexpected end');
      if (t === '(') { const v = add(); if (next() !== ')') throw new Error('Missing )'); return v; }
      if (t === '-') return -unary(); if (t === '+') return unary();
      if (/^[\d.]/.test(t)) return parseFloat(t);
      const lt = t.toLowerCase();
      if (fns[lt] && peek() === '(') { next(); const args = []; if (peek() !== ')') { args.push(add()); while (peek() === ',') { next(); args.push(add()); } } if (next() !== ')') throw new Error('Missing )'); return fns[lt](...args); }
      if (lt in consts) return consts[lt];
      throw new Error('Unknown ' + t);
    };
    const unary = () => { let v = prim(); while (peek() === '!') { next(); let f = 1; for (let k = 2; k <= v; k++) f *= k; v = f; } return v; };
    const pow = () => { const b = unary(); if (peek() === '^' || peek() === '**') { next(); return Math.pow(b, pow()); } return b; };
    const mul = () => { let v = pow(); while (['*', '/', '%'].includes(peek())) { const o = next(); const r = pow(); v = o === '*' ? v * r : o === '/' ? v / r : v % r; } return v; };
    const add = () => { let v = mul(); while (peek() === '+' || peek() === '-') { const o = next(); const r = mul(); v = o === '+' ? v + r : v - r; } return v; };
    const v = add(); if (i < toks.length) throw new Error('Unexpected ' + toks[i]);
    return Math.round(v * 1e12) / 1e12;
  };

  /* ---------- themes ---------- */
  MS.themes = ['midnight', 'daylight', 'synthwave', 'forest', 'ocean', 'solar', 'mono'];
  MS.setTheme = async (t) => {
    document.documentElement.dataset.theme = t;
    const s = await MS.store('settings', MS.defaultSettings()); s.data.theme = t; s.touch();
    document.querySelector('meta[name=theme-color]').content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#0f1222';
    MS.emit('theme', t);
  };
  MS.defaultSettings = () => ({ theme: matchMedia('(prefers-color-scheme: light)').matches ? 'daylight' : 'midnight', accent: '', collapsed: false, name: '', fontSize: 14, reduceMotion: false });
})();
