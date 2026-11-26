/* Vault: encrypted password manager + TOTP authenticator. Everything is encrypted with AES-256-GCM using a key
   derived from your master password (PBKDF2-SHA256, 310k iterations). Only ciphertext is stored. */
(function () {
  const { h } = MS;
  const enc = new TextEncoder(), dec = new TextDecoder();
  const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))); const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  async function deriveKey(pw, salt) { const base = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveKey']); return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 310000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); }
  async function seal(key, obj) { const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj))); return { iv: b64(iv), ct: b64(ct) }; }
  async function open(key, box) { const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, key, unb64(box.ct)); return JSON.parse(dec.decode(pt)); }
  // ----- TOTP (RFC 6238) -----
  function base32(s) { const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; s = s.toUpperCase().replace(/[^A-Z2-7]/g, ''); let bits = '', out = []; for (const c of s) bits += A.indexOf(c).toString(2).padStart(5, '0'); for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2)); return new Uint8Array(out); }
  async function totp(secret, { digits = 6, period = 30, algo = 'SHA-1', t = Date.now() } = {}) {
    const key = await crypto.subtle.importKey('raw', base32(secret), { name: 'HMAC', hash: algo }, false, ['sign']);
    let ctr = Math.floor(t / 1000 / period); const msg = new Uint8Array(8); for (let i = 7; i >= 0; i--) { msg[i] = ctr & 255; ctr = Math.floor(ctr / 256); }
    const hm = new Uint8Array(await crypto.subtle.sign('HMAC', key, msg)); const o = hm[hm.length - 1] & 15;
    const code = (((hm[o] & 127) << 24) | (hm[o + 1] << 16) | (hm[o + 2] << 8) | hm[o + 3]) % 10 ** digits; return String(code).padStart(digits, '0');
  }
  MS.totp = totp;
  // ----- generator & strength -----
  const WORDS = 'apple river stone cloud tiger maple orbit pixel candle forest violet ember harbor meadow comet falcon lemon glacier canyon velvet rocket willow thunder cobalt saffron prism lantern breeze summit marble nectar quartz raven tundra jasmine copper island puzzle sonnet galaxy otter bamboo mango crystal dune echo frost hazel ivory jungle koala lotus nova opal panda quill ruby sierra tango umbra vivid walnut xenon yonder zephyr'.split(' ');
  function rnd(n) { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; }
  function generate(o) { if (o.mode === 'phrase') return Array.from({ length: o.words }, () => { const w = WORDS[rnd(WORDS.length)]; return o.caps ? w[0].toUpperCase() + w.slice(1) : w; }).join(o.sep) + (o.num ? o.sep + rnd(100) : ''); let set = ''; if (o.lower) set += 'abcdefghijkmnopqrstuvwxyz'; if (o.upper) set += 'ABCDEFGHJKLMNPQRSTUVWXYZ'; if (o.digits) set += '23456789'; if (o.symbols) set += '!@#$%^&*-_=+?'; if (!o.similar) set += o.lower ? 'l' : '', set += o.upper ? 'IO' : '', set += o.digits ? '01' : ''; set = set || 'abcdefghijkmnopqrstuvwxyz'; return Array.from({ length: o.length }, () => set[rnd(set.length)]).join(''); }
  function strength(pw) { if (!pw) return { score: 0, bits: 0, label: '—' }; let pool = 0; if (/[a-z]/.test(pw)) pool += 26; if (/[A-Z]/.test(pw)) pool += 26; if (/\d/.test(pw)) pool += 10; if (/[^A-Za-z0-9]/.test(pw)) pool += 33; let bits = pw.length * Math.log2(Math.max(pool, 2)); if (/^(password|qwerty|123456|letmein|admin|welcome|iloveyou)/i.test(pw)) bits = Math.min(bits, 10); if (/(.)\1{2,}/.test(pw)) bits *= 0.8; if (/^[a-z]+\d{0,4}$/i.test(pw)) bits *= 0.6; const score = bits < 28 ? 0 : bits < 40 ? 1 : bits < 60 ? 2 : bits < 80 ? 3 : 4; return { score, bits: Math.round(bits), label: ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'][score] }; }
  const crack = (bits) => { const s = 2 ** bits / 1e10; return s < 1 ? 'instantly' : s < 3600 ? Math.round(s / 60) + ' minutes' : s < 86400 * 365 ? Math.round(s / 86400) + ' days' : s < 86400 * 365 * 1e6 ? Math.round(s / 86400 / 365).toLocaleString() + ' years' : 'millions of years+'; };
  const SCOL = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];

  MS.register({
    id: 'vault', name: 'Vault', icon: '🔐', group: 'Tools', desc: 'Encrypted passwords & 2FA authenticator', keywords: 'password manager vault totp 2fa authenticator otp generator encryption secure notes',
    async mount(view) {
      const st = await MS.store('vault', () => ({ salt: null, box: null, autolock: 5 }));
      let key = null, V = null, tab = 'logins', q = '', idle = 0, tick;
      const wrap = h('div.pad.col', { style: { gap: '12px', maxWidth: '980px', margin: '0 auto' } }); view.append(wrap);
      const persist = async () => { st.data.box = await seal(key, V); st.touch(); };
      function lock() { key = null; V = null; render(); }
      const bump = () => (idle = 0); view.addEventListener('pointerdown', bump); view.addEventListener('keydown', bump);
      tick = setInterval(() => { if (key) { idle++; if (st.data.autolock && idle > st.data.autolock * 60) { lock(); MS.toast('🔒 Vault auto-locked'); } } if (tab === 'otp' && key) document.querySelectorAll('[data-otp]').forEach((el) => el._upd && el._upd()); }, 1000);
      function render() { wrap.innerHTML = ''; MS.setActions(); if (!st.data.salt) return setup(); if (!key) return unlockScreen(); main(); }
      function setup() {
        const p1 = h('input.input', { type: 'password', placeholder: 'Master password', autocomplete: 'new-password' }), p2 = h('input.input', { type: 'password', placeholder: 'Repeat master password', autocomplete: 'new-password' }); const meter = h('div.small');
        p1.oninput = () => { const s = strength(p1.value); meter.innerHTML = ''; meter.append(h('span', { style: { color: SCOL[s.score], fontWeight: 700 } }, s.label), ` · ~${s.bits} bits · cracked ${crack(s.bits)} at 10B guesses/s`); };
        const go = async () => { if (p1.value.length < 8) return MS.toast('Use at least 8 characters', 'bad'); if (p1.value !== p2.value) return MS.toast("Passwords don't match", 'bad'); const salt = crypto.getRandomValues(new Uint8Array(16)); key = await deriveKey(p1.value, salt); V = { logins: [{ id: MS.uid('l'), title: 'Example site', user: 'me@example.com', pw: generate({ length: 18, lower: 1, upper: 1, digits: 1, symbols: 1 }), url: 'https://example.com', notes: 'Delete me — just an example.', fav: false, t: Date.now() }], notes: [], otp: [{ id: MS.uid('o'), name: 'Demo (RFC 6238)', issuer: 'MegaStudio', secret: 'JBSWY3DPEHPK3PXP', digits: 6, period: 30 }] }; st.data.salt = b64(salt); await persist(); render(); MS.toast('🔐 Vault created', 'good'); };
        p2.onkeydown = (e) => e.key === 'Enter' && go();
        wrap.append(h('div.card.col', { style: { gap: '10px', maxWidth: '460px', margin: '40px auto', textAlign: 'center' } }, h('div', { style: { fontSize: '56px' } }, '🔐'), h('h2', { style: { margin: 0 } }, 'Create your vault'), h('div.small.muted', 'Your master password encrypts everything with AES-256-GCM on this device. It is never stored — if you forget it, the vault cannot be recovered.'), p1, meter, p2, h('button.btn.primary', { on: { click: go } }, 'Create vault')));
        setTimeout(() => p1.focus(), 50);
      }
      function unlockScreen() {
        const p = h('input.input', { type: 'password', placeholder: 'Master password', autocomplete: 'current-password' }); const err = h('div.small', { style: { color: 'var(--bad)', minHeight: '18px' } });
        const go = async () => { err.textContent = '⏳ Unlocking…'; try { const k = await deriveKey(p.value, unb64(st.data.salt)); V = await open(k, st.data.box); key = k; idle = 0; render(); } catch { err.textContent = '✕ Wrong password'; p.select(); } };
        p.onkeydown = (e) => e.key === 'Enter' && go();
        wrap.append(h('div.card.col', { style: { gap: '10px', maxWidth: '400px', margin: '60px auto', textAlign: 'center' } }, h('div', { style: { fontSize: '56px' } }, '🔒'), h('h2', { style: { margin: 0 } }, 'Vault locked'), p, err, h('button.btn.primary', { on: { click: go } }, 'Unlock'), h('button.btn.sm', { style: { alignSelf: 'center' }, on: { click: async () => { if (await MS.confirm('Reset the vault?', 'This permanently erases all encrypted data stored here.', 'Erase vault')) { st.data.salt = st.data.box = null; st.touch(); render(); } } } }, 'Forgot password? Reset vault')));
        setTimeout(() => p.focus(), 50);
      }
      const copy = (t, what = 'Copied') => { navigator.clipboard?.writeText(t); MS.toast('📋 ' + what + ' (clears in 30s)'); setTimeout(() => navigator.clipboard?.readText?.().then((c) => { if (c === t) navigator.clipboard.writeText(''); }).catch(() => {}), 30000); };
      function main() {
        MS.setActions(h('button.btn.sm', { on: { click: () => { lock(); } } }, '🔒 Lock'), h('button.btn.sm', { on: { click: () => MS.download('vault-backup.json', JSON.stringify({ v: 1, salt: st.data.salt, box: st.data.box }), 'application/json') } }, '⬇ Encrypted backup'), h('button.btn.sm', { on: { click: async () => { const f = await MS.pickFile('.json'); if (!f) return; try { const d = JSON.parse(await f.text()); const pw = await MS.prompt('Master password of that backup'); if (!pw) return; const k = await deriveKey(pw, unb64(d.salt)); const data = await open(k, d.box); const ids = new Set([...V.logins, ...V.notes, ...V.otp].map((x) => x.id)); ['logins', 'notes', 'otp'].forEach((t) => (data[t] || []).forEach((x) => { if (!ids.has(x.id)) V[t].push(x); })); await persist(); render(); MS.toast('Backup merged', 'good'); } catch { MS.toast('Could not open backup', 'bad'); } } } }, '⬆ Import'));
        const tabs = h('div.row', { style: { flexWrap: 'wrap' } }, [['logins', `🔑 Logins (${V.logins.length})`], ['otp', `⏱ Authenticator (${V.otp.length})`], ['notes', `📝 Secure notes (${V.notes.length})`], ['gen', '🎲 Generator'], ['health', '🩺 Health']].map(([k, l]) => h('button.btn', { class: tab === k ? 'on' : '', on: { click: () => { tab = k; render(); } } }, l)), h('div.spacer'), h('span.small.muted', '🔓 Unlocked · auto-lock '), h('select.input', { style: { width: 'auto' }, on: { change: (e) => { st.data.autolock = +e.target.value; st.touch(); } } }, [[1, '1 min'], [5, '5 min'], [15, '15 min'], [0, 'never']].map(([v, l]) => h('option', { value: v, selected: st.data.autolock === v }, l))));
        wrap.append(tabs); const body = h('div.col', { style: { gap: '10px' } }); wrap.append(body);
        ({ logins, otp, notes, gen, health })[tab](body);
      }
      function logins(body) {
        const search = h('input.input', { placeholder: 'Search…', value: q, style: { flex: 1 }, on: { input: () => { q = search.value; list(); } } });
        const box = h('div.col', { style: { gap: '6px' } });
        function list() { box.innerHTML = ''; const s = q.toLowerCase(); const items = V.logins.filter((l) => (l.title + l.user + l.url).toLowerCase().includes(s)).sort((a, b) => b.fav - a.fav || a.title.localeCompare(b.title)); if (!items.length) box.append(h('div.empty', 'No logins yet.'));
          items.forEach((l) => { const shown = h('span.mono', '••••••••••'); let vis = false; const sc = strength(l.pw).score; const host = (() => { try { return new URL(l.url).hostname; } catch { return ''; } })();
            box.append(h('div.card.row', { style: { gap: '12px', flexWrap: 'wrap' } }, h('div', { style: { width: '38px', height: '38px', borderRadius: '10px', background: `hsl(${[...l.title].reduce((a, c) => a + c.charCodeAt(0), 0) % 360} 60% 50%)`, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: '18px', flex: 'none' } }, (l.title[0] || '?').toUpperCase()),
              h('div.col', { style: { gap: '2px', flex: 1, minWidth: '160px' } }, h('b', (l.fav ? '★ ' : '') + l.title), h('span.small.muted', l.user + (host ? ' · ' + host : ''))),
              h('div.row', { style: { gap: '6px' } }, shown, h('span', { title: strength(l.pw).label, style: { width: '8px', height: '8px', borderRadius: '50%', background: SCOL[sc] } })),
              h('div.row', { style: { gap: '4px' } }, h('button.btn.sm', { title: 'Show', on: { click: () => { vis = !vis; shown.textContent = vis ? l.pw : '••••••••••'; } } }, '👁'), h('button.btn.sm', { on: { click: () => copy(l.user, 'Username copied') } }, '👤'), h('button.btn.sm.primary', { on: { click: () => copy(l.pw, 'Password copied') } }, '🔑 Copy'), l.url ? h('button.btn.sm', { on: { click: () => window.open(l.url, '_blank', 'noopener') } }, '↗') : null, h('button.btn.sm', { on: { click: () => editLogin(l) } }, '✏️')))); }); }
        body.append(h('div.row', search, h('button.btn.primary', { on: { click: () => editLogin() } }, '＋ Add login')), box); list();
      }
      function editLogin(l) {
        const isNew = !l; l = l || { id: MS.uid('l'), title: '', user: '', pw: generate({ length: 18, lower: 1, upper: 1, digits: 1, symbols: 1 }), url: '', notes: '', fav: false, t: Date.now() };
        const f = (ph, v, type = 'text') => h('input.input', { placeholder: ph, value: v, type, autocomplete: 'off' });
        const title = f('Title (e.g. GitHub)', l.title), user = f('Username / email', l.user), pw = f('Password', l.pw), url = f('https://…', l.url); const notes = h('textarea.input', { rows: 3, placeholder: 'Notes' }, l.notes); const fav = h('input', { type: 'checkbox', checked: l.fav }); const meter = h('div.small');
        const upd = () => { const s = strength(pw.value); meter.innerHTML = ''; meter.append(h('span', { style: { color: SCOL[s.score], fontWeight: 700 } }, s.label), ` · ${s.bits} bits · ${crack(s.bits)}`); }; pw.oninput = upd; upd();
        const close = MS.modal(h('div.col', { style: { gap: '8px' } }, h('h2', isNew ? 'New login' : 'Edit login'), title, user, h('div.row', pw, h('button.btn.sm', { on: { click: () => { pw.value = generate({ length: 20, lower: 1, upper: 1, digits: 1, symbols: 1 }); upd(); } } }, '🎲')), meter, url, notes, h('label.row', fav, '★ Favorite'),
          h('div.row', !isNew ? h('button.btn.danger', { on: { click: async () => { if (await MS.confirm('Delete this login?')) { V.logins = V.logins.filter((x) => x !== l); await persist(); close(); render(); } } } }, 'Delete') : null, h('div.spacer'), h('button.btn', { on: { click: () => close() } }, 'Cancel'), h('button.btn.primary', { on: { click: async () => { if (!title.value.trim()) return MS.toast('Add a title', 'bad'); if (l.pw !== pw.value) { l.hist = [...(l.hist || []), { pw: l.pw, t: Date.now() }].slice(-5); } Object.assign(l, { title: title.value.trim(), user: user.value, pw: pw.value, url: url.value.trim(), notes: notes.value, fav: fav.checked, t: Date.now() }); if (isNew) V.logins.push(l); await persist(); close(); render(); } } }, 'Save'))));
      }
      function otp(body) {
        const grid = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '10px' } });
        V.otp.forEach((o) => {
          const code = h('div.mono', { style: { fontSize: '30px', fontWeight: 800, letterSpacing: '3px', cursor: 'pointer' } }, '------'); const ring = h('canvas', { width: 64, height: 64, style: { width: '32px', height: '32px' } }); const g = ring.getContext('2d'); let last = '';
          const el = h('div.card.col', { style: { gap: '4px' } }, h('div.row', h('div.col', { style: { gap: 0, flex: 1 } }, h('b', o.issuer || o.name), h('span.small.muted', o.issuer ? o.name : '')), ring), code,
            h('div.row', { style: { gap: '4px' } }, h('button.btn.sm.primary', { on: { click: () => copy(last.replace(' ', ''), 'Code copied') } }, '📋 Copy'), h('div.spacer'), h('button.btn.sm', { on: { click: async () => { if (await MS.confirm('Remove ' + o.name + '?', 'Make sure 2FA is disabled on that account or you have backup codes.')) { V.otp = V.otp.filter((x) => x !== o); await persist(); render(); } } } }, '🗑')));
          el.setAttribute('data-otp', '1');
          el._upd = async () => { const p = o.period || 30; const left = p - (Math.floor(Date.now() / 1000) % p); try { const c = await totp(o.secret, { digits: o.digits || 6, period: p, algo: o.algo || 'SHA-1' }); last = c.length === 6 ? c.slice(0, 3) + ' ' + c.slice(3) : c; } catch { last = 'invalid'; } code.textContent = last; code.style.color = left <= 5 ? 'var(--bad)' : ''; g.clearRect(0, 0, 64, 64); g.lineWidth = 8; g.strokeStyle = 'rgba(128,128,128,.25)'; g.beginPath(); g.arc(32, 32, 26, 0, 7); g.stroke(); g.strokeStyle = left <= 5 ? '#ef4444' : '#10b981'; g.beginPath(); g.arc(32, 32, 26, -Math.PI / 2, -Math.PI / 2 + (left / p) * Math.PI * 2); g.stroke(); };
          code.onclick = () => copy(last.replace(' ', ''), 'Code copied'); el._upd(); grid.append(el);
        });
        const add = async () => {
          const uri = h('input.input', { placeholder: 'otpauth://totp/… or paste a Base32 secret' }); const name = h('input.input', { placeholder: 'Account name (e.g. you@gmail.com)' }); const issuer = h('input.input', { placeholder: 'Service (e.g. Google)' });
          const close = MS.modal(h('div.col', { style: { gap: '8px' } }, h('h2', 'Add 2FA account'), h('div.small.muted', 'On the website choose "can\'t scan the QR code?" to reveal the secret key, or paste the otpauth:// link.'), uri, issuer, name, h('div.row', h('div.spacer'), h('button.btn.primary', { on: { click: async () => {
            let v = uri.value.trim(); let o = { id: MS.uid('o'), name: name.value || 'Account', issuer: issuer.value, secret: v, digits: 6, period: 30 };
            if (v.startsWith('otpauth://')) { try { const u = new URL(v); const lbl = decodeURIComponent(u.pathname.replace(/^\/+(totp\/)?/, '')); const p = u.searchParams; o = { ...o, secret: p.get('secret') || '', issuer: p.get('issuer') || lbl.split(':')[0] || o.issuer, name: lbl.split(':').pop() || o.name, digits: +p.get('digits') || 6, period: +p.get('period') || 30, algo: ({ SHA1: 'SHA-1', SHA256: 'SHA-256', SHA512: 'SHA-512' })[(p.get('algorithm') || 'SHA1').toUpperCase()] }; } catch { return MS.toast('Invalid link', 'bad'); } }
            o.secret = o.secret.replace(/\s/g, '').toUpperCase(); if (!/^[A-Z2-7]+=*$/.test(o.secret) || o.secret.length < 16) return MS.toast('That secret does not look like Base32', 'bad');
            V.otp.push(o); await persist(); close(); render(); } } }, 'Add'))));
        };
        body.append(h('div.row', h('div.small.muted', { style: { flex: 1 } }, 'Time-based one-time codes (RFC 6238), computed locally with WebCrypto. Click a code to copy.'), h('button.btn.primary', { on: { click: add } }, '＋ Add account')), grid);
      }
      function notes(body) {
        const box = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: '10px' } });
        const edit = (n) => { const isNew = !n; n = n || { id: MS.uid('n'), title: '', text: '' }; const t = h('input.input', { placeholder: 'Title', value: n.title }); const ta = h('textarea.input', { rows: 10, placeholder: 'Recovery codes, Wi-Fi passwords, PINs…', style: { fontFamily: 'var(--mono, monospace)' } }, n.text);
          const close = MS.modal(h('div.col.modal-wide', { style: { gap: '8px' } }, h('h2', '📝 Secure note'), t, ta, h('div.row', !isNew ? h('button.btn.danger', { on: { click: async () => { V.notes = V.notes.filter((x) => x !== n); await persist(); close(); render(); } } }, 'Delete') : null, h('div.spacer'), h('button.btn.primary', { on: { click: async () => { n.title = t.value || 'Untitled'; n.text = ta.value; if (isNew) V.notes.push(n); await persist(); close(); render(); } } }, 'Save')))); };
        V.notes.forEach((n) => box.append(h('div.card.col', { style: { cursor: 'pointer', gap: '4px' }, on: { click: () => edit(n) } }, h('b', '📝 ' + n.title), h('div.small.muted', { style: { filter: 'blur(4px)' } }, n.text.slice(0, 80) || '…'))));
        body.append(h('div.row', h('div.spacer'), h('button.btn.primary', { on: { click: () => edit() } }, '＋ New secure note')), V.notes.length ? box : h('div.empty', 'Store recovery codes, Wi-Fi keys, PINs… all encrypted.'));
      }
      const G = { mode: 'chars', length: 20, lower: true, upper: true, digits: true, symbols: true, similar: false, words: 5, sep: '-', caps: true, num: true };
      function gen(body) {
        const out = h('div.mono', { style: { fontSize: '22px', fontWeight: 700, wordBreak: 'break-all', padding: '14px', background: 'var(--panel2)', borderRadius: '10px', minHeight: '32px' } }); const meter = h('div.small'); const bar = h('div', { style: { height: '8px', borderRadius: '4px', transition: 'width .3s, background .3s' } });
        const regen = () => { const p = generate(G); out.textContent = p; const s = strength(p); bar.style.width = Math.min(100, s.bits / 1.28) + '%'; bar.style.background = SCOL[s.score]; meter.textContent = `${s.label} · ${s.bits} bits of entropy · brute force: ${crack(s.bits)}`; };
        const chk = (k, l) => h('label.row', { style: { gap: '6px' } }, h('input', { type: 'checkbox', checked: G[k], on: { change: (e) => { G[k] = e.target.checked; regen(); } } }), l);
        const lenL = h('b', String(G.length)), wL = h('b', String(G.words));
        const opts = G.mode === 'phrase' ? h('div.col', { style: { gap: '8px' } }, h('div.row', h('span', 'Words'), h('input', { type: 'range', min: 3, max: 10, value: G.words, style: { flex: 1 }, on: { input: (e) => { G.words = +e.target.value; wL.textContent = G.words; regen(); } } }), wL), h('div.row', { style: { flexWrap: 'wrap' } }, chk('caps', 'Capitalize'), chk('num', 'Add number'), h('span', 'Separator'), h('select.input', { style: { width: 'auto' }, on: { change: (e) => { G.sep = e.target.value; regen(); } } }, ['-', '.', '_', ' ', ''].map((s) => h('option', { value: s, selected: G.sep === s }, s === ' ' ? 'space' : s || 'none')))))
          : h('div.col', { style: { gap: '8px' } }, h('div.row', h('span', 'Length'), h('input', { type: 'range', min: 6, max: 64, value: G.length, style: { flex: 1 }, on: { input: (e) => { G.length = +e.target.value; lenL.textContent = G.length; regen(); } } }), lenL), h('div.row', { style: { flexWrap: 'wrap', gap: '14px' } }, chk('lower', 'a-z'), chk('upper', 'A-Z'), chk('digits', '0-9'), chk('symbols', '!@#'), chk('similar', 'Avoid look-alikes (l, 1, O, 0)')));
        const tester = h('input.input', { placeholder: 'Test any password (never leaves this page)…', type: 'text', autocomplete: 'off' }); const tres = h('div.small');
        tester.oninput = () => { const s = strength(tester.value); tres.innerHTML = ''; if (tester.value) tres.append(h('span', { style: { color: SCOL[s.score], fontWeight: 700 } }, s.label), ` · ${s.bits} bits · ${crack(s.bits)}`); };
        body.append(h('div.card.col', { style: { gap: '10px' } }, h('div.row', h('button.btn.sm', { class: G.mode === 'chars' ? 'on' : '', on: { click: () => { G.mode = 'chars'; render(); } } }, 'Random characters'), h('button.btn.sm', { class: G.mode === 'phrase' ? 'on' : '', on: { click: () => { G.mode = 'phrase'; render(); } } }, 'Passphrase')), out, h('div', { style: { background: 'var(--panel2)', borderRadius: '4px' } }, bar), meter, opts, h('div.row', h('button.btn.primary', { on: { click: regen } }, '🎲 Generate'), h('button.btn', { on: { click: () => copy(out.textContent, 'Password copied') } }, '📋 Copy'))),
          h('div.card.col', { style: { gap: '8px' } }, h('b', 'Strength tester'), tester, tres));
        regen();
      }
      function health(body) {
        const weak = V.logins.filter((l) => strength(l.pw).score < 2); const counts = {}; V.logins.forEach((l) => (counts[l.pw] = (counts[l.pw] || 0) + 1)); const reused = V.logins.filter((l) => counts[l.pw] > 1); const old = V.logins.filter((l) => Date.now() - (l.t || 0) > 365 * 864e5);
        const score = V.logins.length ? Math.round(100 * (1 - (weak.length + reused.length * 0.7 + old.length * 0.3) / (V.logins.length * 2))) : 100;
        const sect = (title, list, why) => h('div.card.col', { style: { gap: '6px' } }, h('b', `${title} (${list.length})`), h('div.small.muted', why), ...list.map((l) => h('div.row', h('span', l.title), h('span.small.muted', l.user), h('div.spacer'), h('button.btn.sm', { on: { click: () => editLogin(l) } }, 'Fix'))), list.length ? null : h('div.small', { style: { color: 'var(--good)' } }, '✔ None'));
        body.append(h('div.card.row', { style: { gap: '18px' } }, h('div', { style: { fontSize: '48px', fontWeight: 800, color: score > 80 ? 'var(--good)' : score > 50 ? 'var(--warn)' : 'var(--bad)' } }, score), h('div.col', h('b', 'Vault health score'), h('div.small.muted', `${V.logins.length} logins · ${V.otp.length} 2FA accounts · ${V.notes.length} secure notes`))),
          sect('🔁 Reused passwords', reused, 'If one site leaks, every account sharing that password is at risk.'), sect('⚠️ Weak passwords', weak, 'Under ~40 bits of entropy — easy to brute force.'), sect('🕰 Not changed in a year', old, 'Consider rotating important passwords.'));
      }
      render();
      return { unmount() { clearInterval(tick); key = null; V = null; } };
    },
  });
})();
