/* Clock: world clock with analog faces, time-zone meeting planner, stopwatch with laps,
   multiple named countdown timers and alarms (with repeat days, snooze and notifications) */
(function () {
  const { h } = MS;
  const ZONES = [['New York', 'America/New_York'], ['Detroit', 'America/Detroit'], ['Chicago', 'America/Chicago'], ['Denver', 'America/Denver'], ['Los Angeles', 'America/Los_Angeles'], ['Anchorage', 'America/Anchorage'], ['Honolulu', 'Pacific/Honolulu'], ['Toronto', 'America/Toronto'], ['Mexico City', 'America/Mexico_City'], ['São Paulo', 'America/Sao_Paulo'], ['Buenos Aires', 'America/Argentina/Buenos_Aires'], ['London', 'Europe/London'], ['Lisbon', 'Europe/Lisbon'], ['Paris', 'Europe/Paris'], ['Berlin', 'Europe/Berlin'], ['Rome', 'Europe/Rome'], ['Madrid', 'Europe/Madrid'], ['Athens', 'Europe/Athens'], ['Istanbul', 'Europe/Istanbul'], ['Moscow', 'Europe/Moscow'], ['Cairo', 'Africa/Cairo'], ['Lagos', 'Africa/Lagos'], ['Johannesburg', 'Africa/Johannesburg'], ['Nairobi', 'Africa/Nairobi'], ['Dubai', 'Asia/Dubai'], ['Karachi', 'Asia/Karachi'], ['Mumbai', 'Asia/Kolkata'], ['Kathmandu', 'Asia/Kathmandu'], ['Dhaka', 'Asia/Dhaka'], ['Bangkok', 'Asia/Bangkok'], ['Singapore', 'Asia/Singapore'], ['Hong Kong', 'Asia/Hong_Kong'], ['Shanghai', 'Asia/Shanghai'], ['Seoul', 'Asia/Seoul'], ['Tokyo', 'Asia/Tokyo'], ['Sydney', 'Australia/Sydney'], ['Perth', 'Australia/Perth'], ['Auckland', 'Pacific/Auckland'], ['Reykjavík', 'Atlantic/Reykjavik'], ['UTC', 'UTC']];
  const LOCAL = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  function parts(date, tz) { const p = {}; new Intl.DateTimeFormat('en-US', { timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short' }).formatToParts(date).forEach((x) => (p[x.type] = x.value)); p.hour = +p.hour % 24; p.minute = +p.minute; p.second = +p.second; return p; }
  function offsetMin(tz, date = new Date()) { const p = parts(date, tz); const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, p.hour, p.minute, p.second); return Math.round((asUTC - Math.floor(date.getTime() / 1000) * 1000) / 60000); }
  const fmtOff = (m) => { const s = m < 0 ? '-' : '+'; m = Math.abs(m); return `UTC${s}${Math.floor(m / 60)}${m % 60 ? ':' + pad(m % 60) : ''}`; };
  function fmtDur(ms, cs = true) { ms = Math.max(0, ms); const hh = Math.floor(ms / 3600000), mm = Math.floor(ms / 60000) % 60, ss = Math.floor(ms / 1000) % 60, c = Math.floor(ms / 10) % 100; return (hh ? hh + ':' + pad(mm) : pad(mm)) + ':' + pad(ss) + (cs ? '.' + pad(c) : ''); }
  let actx; function beep(kind = 'alarm', dur = 1.6) { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const t0 = actx.currentTime; const seq = kind === 'chime' ? [880, 1108, 1318, 1760] : [988, 0, 988, 0, 988, 0, 988]; const step = kind === 'chime' ? 0.22 : 0.12; seq.forEach((f, i) => { if (!f) return; const o = actx.createOscillator(), g = actx.createGain(); o.type = kind === 'chime' ? 'sine' : 'square'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t0 + i * step); g.gain.exponentialRampToValueAtTime(kind === 'chime' ? 0.3 : 0.12, t0 + i * step + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * step + step * (kind === 'chime' ? 3 : 0.9)); o.connect(g).connect(actx.destination); o.start(t0 + i * step); o.stop(t0 + i * step + step * 3 + 0.05); }); } catch (e) { } }
  function notify(title, body) { try { if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body, icon: 'icons/icon-192.png' }); } catch (e) { } if (navigator.vibrate) navigator.vibrate([300, 150, 300]); }

  function face(size = 120) {
    const c = h('canvas', { width: size * 2, height: size * 2, style: { width: size + 'px', height: size + 'px' } });
    c.draw = (p, dark) => { const g = c.getContext('2d'), R = size; g.setTransform(2, 0, 0, 2, 0, 0); g.clearRect(0, 0, R, R); const cx = R / 2, r = R / 2 - 3; g.fillStyle = dark ? '#1e1b2e' : '#fff'; g.strokeStyle = dark ? '#6d5dfc' : '#c7c2f2'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cx, r, 0, 7); g.fill(); g.stroke(); const fg = dark ? '#e5e7eb' : '#1f2937'; for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2, l = i % 5 ? 3 : 7; g.strokeStyle = fg; g.globalAlpha = i % 5 ? 0.35 : 0.9; g.lineWidth = i % 5 ? 1 : 2; g.beginPath(); g.moveTo(cx + Math.sin(a) * (r - 4), cx - Math.cos(a) * (r - 4)); g.lineTo(cx + Math.sin(a) * (r - 4 - l), cx - Math.cos(a) * (r - 4 - l)); g.stroke(); } g.globalAlpha = 1; const hand = (ang, len, w, col) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx - Math.sin(ang) * len * 0.15, cx + Math.cos(ang) * len * 0.15); g.lineTo(cx + Math.sin(ang) * len, cx - Math.cos(ang) * len); g.stroke(); }; const s = p.second + (p.ms || 0) / 1000; hand(((p.hour % 12) + p.minute / 60) / 12 * Math.PI * 2, r * 0.5, 4, fg); hand((p.minute + s / 60) / 60 * Math.PI * 2, r * 0.75, 3, fg); hand(s / 60 * Math.PI * 2, r * 0.85, 1.5, '#ef4444'); g.fillStyle = '#ef4444'; g.beginPath(); g.arc(cx, cx, 3, 0, 7); g.fill(); };
    return c;
  }

  /* global alarm/timer engine so alarms fire while any app is open */
  let eng = null;
  async function engine() {
    if (eng) return eng;
    const st = await MS.store('clock', () => ({ tab: 'world', cities: ['America/New_York', 'Europe/London', 'Asia/Tokyo', 'Australia/Sydney'], alarms: [{ id: MS.uid(), time: '07:00', label: 'Wake up', days: [1, 2, 3, 4, 5], on: false, sound: 'alarm' }], timers: [], sw: { start: 0, acc: 0, running: false, laps: [] }, h24: false, presets: [60, 180, 300, 600, 900, 1500, 3600] }));
    eng = { st, ringing: null, listeners: new Set() };
    const D = st.data;
    const ring = (title, body, onSnooze, sound) => { beep(sound); notify(title, body); let n = 0; const iv = setInterval(() => { if (++n > 20) stop(); else beep(sound); }, 2200); const stop = () => { clearInterval(iv); close(); eng.ringing = null; }; const close = MS.modal(h('div.col', { style: { alignItems: 'center', gap: '12px', padding: '10px', textAlign: 'center' } }, h('div', { style: { fontSize: '64px' } }, '⏰'), h('h2', { style: { margin: 0 } }, title), h('div.muted', body), h('div.row', { style: { gap: '10px' } }, onSnooze ? h('button.btn', { on: { click: () => { onSnooze(); stop(); } } }, '😴 Snooze 9 min') : '', h('button.btn.primary', { on: { click: () => stop() } }, 'Dismiss'))), { onClose: () => clearInterval(iv) }); eng.ringing = stop; };
    let lastMin = '';
    setInterval(() => {
      const now = new Date(); const hm = pad(now.getHours()) + ':' + pad(now.getMinutes());
      if (hm !== lastMin) { lastMin = hm; D.alarms.forEach((a) => { const snz = a.snooze && a.snooze <= now.getTime() && a.snooze > now.getTime() - 60000; if (!a.on) return; if (snz || (a.time === hm && (!a.days.length || a.days.includes(now.getDay())) && !a.snooze)) { if (snz) delete a.snooze; if (!a.days.length && !snz) a.on = false; st.touch(); ring(a.label || 'Alarm', a.time, () => { a.snooze = Date.now() + 9 * 60000; a.on = true; st.touch(); }, a.sound); } }); }
      D.timers.forEach((t) => { if (t.running && Date.now() >= t.end) { t.running = false; t.left = 0; t.done = true; st.touch(); ring(t.label || 'Timer done', fmtDur(t.total * 1000, false) + ' timer finished', null, 'chime'); } });
      eng.listeners.forEach((f) => f());
    }, 250);
    return eng;
  }
  setTimeout(() => engine(), 1500);

  MS.register({
    id: 'clock', name: 'Clock', icon: '⏰', group: 'Productivity', desc: 'World clock, alarms, timers, stopwatch & meeting planner', keywords: 'clock world time zone alarm timer countdown stopwatch lap meeting planner utc',
    async mount(view, args) {
      const E = await engine(); const st = E.st; const D = st.data; const save = () => st.touch();
      let darkC = null; const dark = () => { if (darkC == null) { const m = getComputedStyle(document.body).backgroundColor.match(/\d+/g) || [0, 0, 0]; darkC = (+m[0] + +m[1] + +m[2]) / 3 < 128; setTimeout(() => (darkC = null), 2000); } return darkC; };
      const wrap = h('div.pad.col', { style: { gap: '14px', maxWidth: '1000px', margin: '0 auto' } }); view.append(wrap);
      const tabsEl = h('div.row', { style: { flexWrap: 'wrap' } }); const body = h('div.col', { style: { gap: '14px' } }); wrap.append(tabsEl, body);
      const TABS = [['world', '🌍 World'], ['planner', '🤝 Meeting planner'], ['alarms', '⏰ Alarms'], ['timers', '⏳ Timers'], ['stopwatch', '⏱ Stopwatch']];
      const a0 = Array.isArray(args) ? args[0] : args; if (a0 && TABS.some((t) => t[0] === a0)) D.tab = a0;
      let tick = null; const fmtT = (p) => D.h24 ? `${pad(p.hour)}:${pad(p.minute)}` : `${p.hour % 12 || 12}:${pad(p.minute)} ${p.hour < 12 ? 'AM' : 'PM'}`;
      function render() { tick = null; tabsEl.innerHTML = ''; TABS.forEach(([k, l]) => tabsEl.append(h('button.btn', { class: D.tab === k ? 'on' : '', on: { click: () => { D.tab = k; save(); render(); } } }, l))); tabsEl.append(h('div.spacer'), h('button.btn.sm', { class: D.h24 ? 'on' : '', on: { click: () => { D.h24 = !D.h24; save(); render(); } } }, '24h')); body.innerHTML = ''; ({ world, planner, alarms, timers, stopwatch })[D.tab](); }
      const loop = () => { if (tick) tick(); }; E.listeners.add(loop);
      let raf; const rafLoop = () => { if (tick && tick.fast) tick(); raf = requestAnimationFrame(rafLoop); }; raf = requestAnimationFrame(rafLoop);
      const cityName = (tz) => (ZONES.find((z) => z[1] === tz) || [tz.split('/').pop().replace(/_/g, ' ')])[0];
      function addCity(cb) { const all = Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : ZONES.map((z) => z[1]); const list = [...ZONES.map((z) => [z[0], z[1]]), ...all.filter((z) => !ZONES.some((x) => x[1] === z)).map((z) => [z.split('/').pop().replace(/_/g, ' '), z])]; const q = h('input.input', { placeholder: 'Search city or zone…', autofocus: true }); const res = h('div.col', { style: { maxHeight: '50vh', overflow: 'auto', gap: '2px' } }); const draw = () => { res.innerHTML = ''; const s = q.value.toLowerCase(); list.filter(([n, z]) => !s || n.toLowerCase().includes(s) || z.toLowerCase().includes(s)).slice(0, 80).forEach(([n, z]) => res.append(h('button.btn', { style: { justifyContent: 'space-between' }, on: { click: () => { cb(z); close(); } } }, h('span', n), h('span.small.muted', z + ' · ' + fmtT(parts(new Date(), z)))))); }; q.oninput = draw; draw(); const close = MS.modal(h('div.col', { style: { gap: '10px' } }, h('h3', { style: { margin: 0 } }, 'Add a city'), q, res)); setTimeout(() => q.focus(), 50); }

      /* ---------- world ---------- */
      function world() {
        const big = face(220); const bigT = h('div', { style: { fontSize: '44px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' } }); const bigD = h('div.muted');
        body.append(h('div.card.row', { style: { gap: '28px', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', padding: '20px' } }, big, h('div.col', { style: { gap: '4px' } }, h('div.small.muted', '📍 ' + cityName(LOCAL) + ' · ' + fmtOff(offsetMin(LOCAL))), bigT, bigD, sunInfo())));
        const grid = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: '12px' } }); body.append(h('div.row', h('b', 'Cities'), h('div.spacer'), h('button.btn.sm.primary', { on: { click: () => addCity((z) => { if (!D.cities.includes(z)) D.cities.push(z); save(); render(); }) } }, '＋ Add city'))); body.append(grid);
        const cards = D.cities.map((tz) => { const f = face(84); const t = h('div', { style: { fontSize: '22px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' } }); const sub = h('div.small.muted'); const card = h('div.card.row', { style: { gap: '12px', alignItems: 'center', position: 'relative' } }, f, h('div.col', { style: { gap: '2px', minWidth: 0 } }, h('b', cityName(tz)), t, sub), h('button.icon-btn', { title: 'Remove', style: { position: 'absolute', top: '4px', right: '4px', fontSize: '12px' }, on: { click: () => { D.cities = D.cities.filter((x) => x !== tz); save(); render(); } } }, '✕')); grid.append(card); return { tz, f, t, sub }; });
        if (!D.cities.length) grid.append(h('div.empty', 'No cities yet'));
        tick = () => { const now = new Date(); const lp = parts(now, LOCAL); lp.ms = now.getMilliseconds(); big.draw(lp, dark()); bigT.textContent = fmtT(lp) + (D.h24 ? ':' + pad(lp.second) : ''); bigD.textContent = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }); const lo = offsetMin(LOCAL, now); cards.forEach((c) => { const p = parts(now, c.tz); p.ms = now.getMilliseconds(); c.f.draw(p, p.hour < 6 || p.hour >= 20 || dark()); c.t.textContent = fmtT(p); const diff = (offsetMin(c.tz, now) - lo) / 60; const ld = parts(now, LOCAL); const dd = p.day !== ld.day ? (Date.UTC(+p.year, +p.month - 1, +p.day) > Date.UTC(+ld.year, +ld.month - 1, +ld.day) ? 'Tomorrow' : 'Yesterday') : 'Today'; c.sub.textContent = `${dd} · ${diff === 0 ? 'same time' : (diff > 0 ? '+' : '') + diff + 'h'} · ${p.hour >= 6 && p.hour < 20 ? '☀️' : '🌙'}`; }); };
        tick.fast = true; tick();
      }
      function sunInfo() { const now = new Date(); const start = new Date(now.getFullYear(), 0, 0); const doy = Math.floor((now - start) / 864e5); const dl = 12 + 4 * Math.sin((doy - 80) / 365 * 2 * Math.PI) * (Math.abs(new Date(now.getFullYear(), 6, 1).getTimezoneOffset() - new Date(now.getFullYear(), 0, 1).getTimezoneOffset()) ? 1 : 0.2); const yearPct = ((now - new Date(now.getFullYear(), 0, 1)) / (new Date(now.getFullYear() + 1, 0, 1) - new Date(now.getFullYear(), 0, 1)) * 100); const wk = Math.ceil((((now - new Date(now.getFullYear(), 0, 1)) / 864e5) + new Date(now.getFullYear(), 0, 1).getDay() + 1) / 7); return h('div.col.small.muted', { style: { gap: '2px', marginTop: '6px' } }, h('span', `📅 Day ${doy} · week ${wk} · ${yearPct.toFixed(1)}% of ${now.getFullYear()} done`), h('div', { style: { height: '6px', borderRadius: '3px', background: 'var(--border)', overflow: 'hidden', width: '240px' } }, h('div', { style: { width: yearPct + '%', height: '100%', background: 'var(--accent)' } })), h('span', `🌗 ~${dl.toFixed(1)} h of daylight (est.)`)); }

      /* ---------- meeting planner ---------- */
      function planner() {
        const zones = [LOCAL, ...D.cities.filter((z) => z !== LOCAL)];
        let day = new Date(); day.setHours(0, 0, 0, 0); let sel = null;
        const dayIn = h('input.input', { type: 'date', value: `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`, style: { width: 'auto' } });
        const out = h('div.card', { style: { overflowX: 'auto', padding: '10px' } }); const info = h('div.card.small');
        body.append(h('div.row', { style: { flexWrap: 'wrap', gap: '8px' } }, h('span.muted', 'Day (your time):'), dayIn, h('div.spacer'), h('span.small.muted', '🟩 work hours 9–17 · 🟨 6–9 & 17–22 · ⬛ night'), h('button.btn.sm', { on: { click: () => addCity((z) => { if (!D.cities.includes(z)) D.cities.push(z); save(); render(); }) } }, '＋ City')), out, info);
        dayIn.onchange = () => { const [y, m, d] = dayIn.value.split('-').map(Number); day = new Date(y, m - 1, d); draw(); };
        function color(hr) { return hr >= 9 && hr < 17 ? '#22c55e' : (hr >= 6 && hr < 9) || (hr >= 17 && hr < 22) ? '#eab308' : '#334155'; }
        function draw() {
          out.innerHTML = ''; const tbl = h('table', { style: { borderCollapse: 'separate', borderSpacing: '2px', fontSize: '12px' } });
          let best = []; const scores = [];
          for (let i = 0; i < 24; i++) { const t = new Date(day.getTime() + i * 3600000); let sc = 0; zones.forEach((z) => { const hr = parts(t, z).hour; sc += hr >= 9 && hr < 17 ? 2 : (hr >= 7 && hr < 9) || (hr >= 17 && hr < 20) ? 1 : 0; }); scores.push(sc); }
          const mx = Math.max(...scores); best = scores.map((s, i) => s === mx ? i : -1).filter((i) => i >= 0);
          zones.forEach((z, zi) => { const tr = h('tr', h('td', { style: { paddingRight: '10px', whiteSpace: 'nowrap', fontWeight: zi ? 400 : 700 } }, (zi ? '' : '📍 ') + cityName(z), h('div.small.muted', fmtOff(offsetMin(z, day))))); for (let i = 0; i < 24; i++) { const t = new Date(day.getTime() + i * 3600000); const p = parts(t, z); const hr = p.hour; const td = h('td', { title: `${cityName(z)}: ${p.weekday} ${fmtT(p)}`, style: { background: color(hr), color: hr >= 6 && hr < 22 ? '#111' : '#cbd5e1', textAlign: 'center', minWidth: '30px', height: '30px', borderRadius: '5px', cursor: 'pointer', outline: sel === i ? '3px solid var(--accent)' : best.includes(i) && zi === 0 ? '2px dashed #6d5dfc' : '', fontWeight: hr === 0 ? 700 : 400 }, on: { click: () => { sel = i; draw(); } } }, hr === 0 ? p.weekday : D.h24 ? pad(hr) : (hr % 12 || 12) + (hr < 12 ? 'a' : 'p')); if (p.minute) td.textContent += ':' + pad(p.minute); tr.append(td); } tbl.append(tr); });
          out.append(tbl);
          const i = sel ?? best[0]; const t = new Date(day.getTime() + i * 3600000);
          info.innerHTML = ''; info.append(h('b', sel == null ? `⭐ Best overlap: ${best.length} slot${best.length > 1 ? 's' : ''} (dashed). First one:` : '🕑 Selected slot:'), h('div.col', { style: { gap: '3px', marginTop: '6px' } }, zones.map((z) => { const p = parts(t, z); return h('div', `${cityName(z)} — ${p.weekday} ${fmtT(p)} ${p.hour >= 9 && p.hour < 17 ? '✅' : p.hour >= 22 || p.hour < 6 ? '😴' : '⚠️'}`); })), h('button.btn.sm', { style: { marginTop: '8px' }, on: { click: () => { const txt = zones.map((z) => { const p = parts(t, z); return `${cityName(z)}: ${p.weekday} ${fmtT(p)}`; }).join('\n'); navigator.clipboard?.writeText(txt); MS.toast('Copied times'); } } }, '📋 Copy times'));
        }
        draw();
      }

      /* ---------- alarms ---------- */
      function alarms() {
        const perm = 'Notification' in window && Notification.permission === 'default' ? h('button.btn.sm', { on: { click: async () => { await Notification.requestPermission(); render(); } } }, '🔔 Enable notifications') : '';
        body.append(h('div.row', { style: { flexWrap: 'wrap', gap: '8px' } }, h('span.small.muted', 'Alarms ring while MegaStudio is open in any app (keep a tab open).'), h('div.spacer'), perm, h('button.btn.sm', { on: { click: () => beep('alarm') } }, '🔊 Test sound'), h('button.btn.sm.primary', { on: { click: () => { D.alarms.push({ id: MS.uid(), time: '08:00', label: 'Alarm', days: [], on: true, sound: 'alarm' }); save(); render(); } } }, '＋ New alarm')));
        const next = h('div.card', { style: { textAlign: 'center' } }); body.append(next);
        const now = new Date(); let soon = null;
        D.alarms.forEach((a) => { if (!a.on) return; const [hh, mm] = a.time.split(':').map(Number); for (let d = 0; d < 8; d++) { const t = new Date(now); t.setDate(t.getDate() + d); t.setHours(hh, mm, 0, 0); if (t <= now) continue; if (a.days.length && !a.days.includes(t.getDay())) continue; if (!soon || t < soon.t) soon = { t, a }; break; } });
        const upd = () => { if (!soon) { next.textContent = 'No alarms on'; return; } const ms = soon.t - new Date(); next.innerHTML = ''; next.append(h('div.small.muted', 'Next alarm'), h('div', { style: { fontSize: '26px', fontWeight: 700 } }, `${soon.a.label} · in ${Math.floor(ms / 3600000)}h ${Math.floor(ms / 60000) % 60}m`)); };
        upd(); tick = upd;
        D.alarms.sort((a, b) => a.time.localeCompare(b.time)).forEach((a) => {
          const time = h('input.input', { type: 'time', value: a.time, style: { fontSize: '26px', fontWeight: 700, width: 'auto', padding: '4px 8px' }, on: { change: (e) => { a.time = e.target.value; delete a.snooze; save(); render(); } } });
          const lbl = h('input.input', { value: a.label, placeholder: 'Label', style: { flex: 1, minWidth: '120px' }, on: { input: (e) => { a.label = e.target.value; save(); } } });
          const days = h('div.row', { style: { gap: '3px' } }, DAYS.map((d, i) => h('button.btn.sm', { class: a.days.includes(i) ? 'on' : '', style: { minWidth: '32px', padding: '4px' }, on: { click: () => { a.days = a.days.includes(i) ? a.days.filter((x) => x !== i) : [...a.days, i].sort(); save(); render(); } } }, d)));
          const tog = h('button.btn', { class: a.on ? 'primary' : '', on: { click: () => { a.on = !a.on; delete a.snooze; save(); render(); } } }, a.on ? 'On' : 'Off');
          const snd = h('select.input', { style: { width: 'auto' }, on: { change: (e) => { a.sound = e.target.value; save(); } } }, [['alarm', '📢 Beeps'], ['chime', '🎐 Chime']].map(([v, l]) => h('option', { value: v, selected: a.sound === v }, l)));
          body.append(h('div.card.row', { style: { flexWrap: 'wrap', gap: '10px', alignItems: 'center', opacity: a.on ? 1 : 0.6 } }, time, lbl, days, snd, a.snooze ? h('span.tag', '😴 snoozed') : '', h('span.small.muted', a.days.length === 7 ? 'Every day' : a.days.join() === '1,2,3,4,5' ? 'Weekdays' : a.days.join() === '0,6' ? 'Weekends' : a.days.length ? '' : 'Once'), h('div.spacer'), tog, h('button.icon-btn', { on: { click: () => { D.alarms = D.alarms.filter((x) => x !== a); save(); render(); } } }, '🗑')));
        });
        if (!D.alarms.length) body.append(h('div.empty', 'No alarms'));
      }

      /* ---------- timers ---------- */
      function timers() {
        const hh = h('input.input', { type: 'number', min: 0, max: 99, value: 0, style: { width: '70px' } }); const mm = h('input.input', { type: 'number', min: 0, max: 59, value: 5, style: { width: '70px' } }); const ss = h('input.input', { type: 'number', min: 0, max: 59, value: 0, style: { width: '70px' } }); const lb = h('input.input', { placeholder: 'Label (e.g. Pasta)', style: { flex: 1, minWidth: '140px' } });
        const add = (sec, label) => { if (sec <= 0) return; D.timers.push({ id: MS.uid(), label: label || fmtDur(sec * 1000, false) + ' timer', total: sec, left: sec * 1000, running: true, end: Date.now() + sec * 1000 }); save(); render(); };
        body.append(h('div.card.col', { style: { gap: '10px' } }, h('div.row', { style: { flexWrap: 'wrap', gap: '6px', alignItems: 'center' } }, hh, h('span', 'h'), mm, h('span', 'm'), ss, h('span', 's'), lb, h('button.btn.primary', { on: { click: () => add(+hh.value * 3600 + +mm.value * 60 + +ss.value, lb.value) } }, '▶ Start')), h('div.row', { style: { flexWrap: 'wrap', gap: '6px' } }, h('span.small.muted', 'Quick:'), D.presets.map((p) => h('button.btn.sm', { on: { click: () => add(p) } }, p >= 3600 ? p / 3600 + 'h' : p / 60 + 'm')), h('button.btn.sm', { on: { click: () => add(3 * 60 + 30, '🥚 Soft-boiled egg') } }, '🥚 Egg'), h('button.btn.sm', { on: { click: () => add(4 * 60, '🍵 Tea') } }, '🍵 Tea'), h('button.btn.sm', { on: { click: () => add(25 * 60, '🍅 Focus') } }, '🍅 Pomodoro'))));
        const grid = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: '12px' } }); body.append(grid);
        const items = D.timers.map((t) => {
          const R = 70, C = 2 * Math.PI * R; const ring = h('div'); ring.innerHTML = `<svg width="170" height="170" viewBox="0 0 170 170"><circle cx="85" cy="85" r="${R}" fill="none" stroke="var(--border)" stroke-width="10"/><circle class="arc" cx="85" cy="85" r="${R}" fill="none" stroke="var(--accent)" stroke-width="10" stroke-linecap="round" stroke-dasharray="${C}" transform="rotate(-90 85 85)"/><text class="tt" x="85" y="92" text-anchor="middle" font-size="24" font-weight="700" fill="currentColor" style="font-variant-numeric:tabular-nums"></text></svg>`;
          const arc = ring.querySelector('.arc'), tt = ring.querySelector('.tt');
          const pp = h('button.btn.sm', { on: { click: () => { if (t.done) { t.done = false; t.left = t.total * 1000; t.running = true; t.end = Date.now() + t.left; } else if (t.running) { t.left = t.end - Date.now(); t.running = false; } else { t.running = true; t.end = Date.now() + t.left; } save(); render(); } } }, t.done ? '↻ Restart' : t.running ? '⏸ Pause' : '▶ Resume');
          grid.append(h('div.card.col', { style: { alignItems: 'center', gap: '6px' } }, h('b', t.label), ring, h('div.row', { style: { gap: '6px' } }, pp, h('button.btn.sm', { on: { click: () => { t.left += 60000; if (t.running) t.end += 60000; t.total += 60; t.done = false; if (!t.running && t.left > 0 && t.left === 60000) { t.running = true; t.end = Date.now() + 60000; } save(); render(); } } }, '+1m'), h('button.icon-btn', { on: { click: () => { D.timers = D.timers.filter((x) => x !== t); save(); render(); } } }, '🗑'))));
          return { t, arc, tt, C };
        });
        if (!D.timers.length) grid.append(h('div.empty', 'No timers running — start one above'));
        tick = () => items.forEach(({ t, arc, tt, C }) => { const left = t.running ? t.end - Date.now() : t.left; const f = Math.max(0, left) / (t.total * 1000); arc.setAttribute('stroke-dashoffset', C * (1 - f)); arc.setAttribute('stroke', t.done ? '#22c55e' : f < 0.1 ? '#ef4444' : 'var(--accent)'); tt.textContent = t.done ? 'Done ✓' : fmtDur(Math.ceil(Math.max(0, left) / 1000) * 1000, false); });
        tick.fast = true; tick();
      }

      /* ---------- stopwatch ---------- */
      function stopwatch() {
        const S = D.sw; const el = () => S.acc + (S.running ? Date.now() - S.start : 0);
        const disp = h('div', { style: { fontSize: 'min(16vw,88px)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', textAlign: 'center', letterSpacing: '-2px' } });
        const cur = h('div.muted', { style: { textAlign: 'center', fontVariantNumeric: 'tabular-nums' } });
        const startB = h('button.btn.primary', { style: { minWidth: '110px', fontSize: '16px' }, on: { click: () => { if (S.running) { S.acc = el(); S.running = false; } else { S.start = Date.now(); S.running = true; } save(); render(); } } }, S.running ? '⏸ Stop' : el() ? '▶ Resume' : '▶ Start');
        const lapB = h('button.btn', { style: { minWidth: '110px', fontSize: '16px' }, on: { click: () => { if (S.running) { S.laps.push(el()); save(); render(); } else { S.acc = 0; S.laps = []; save(); render(); } } } }, S.running ? '🏁 Lap' : '↺ Reset');
        body.append(h('div.card.col', { style: { gap: '10px', padding: '24px' } }, disp, cur, h('div.row', { style: { justifyContent: 'center', gap: '12px' } }, lapB, startB), h('div.small.muted', { style: { textAlign: 'center' } }, 'Space = start/stop · L = lap · R = reset')));
        const splits = S.laps.map((t, i) => t - (S.laps[i - 1] || 0)); const fast = Math.min(...splits), slow = Math.max(...splits);
        if (S.laps.length) { const tbl = h('table.mono', { style: { width: '100%', borderCollapse: 'collapse' } }, h('tr.small.muted', h('th', { style: { textAlign: 'left' } }, 'Lap'), h('th', 'Split'), h('th', 'Total'), h('th', '')), [...S.laps].map((t, i) => [t, i]).reverse().map(([t, i]) => h('tr', { style: { borderTop: '1px solid var(--border)', color: S.laps.length > 2 && splits[i] === fast ? '#22c55e' : S.laps.length > 2 && splits[i] === slow ? '#ef4444' : '' } }, h('td', { style: { padding: '6px' } }, '#' + (i + 1)), h('td', { style: { textAlign: 'center' } }, fmtDur(splits[i])), h('td', { style: { textAlign: 'center' } }, fmtDur(t)), h('td', { style: { width: '40%' } }, h('div', { style: { height: '6px', borderRadius: '3px', background: 'var(--accent)', width: (splits[i] / slow * 100) + '%', opacity: 0.7 } }))))); const avg = S.laps[S.laps.length - 1] / S.laps.length; body.append(h('div.card.col', { style: { gap: '6px' } }, h('div.row', h('b', `${S.laps.length} laps`), h('div.spacer'), h('span.small.muted', `avg ${fmtDur(avg)} · best ${fmtDur(fast)} · worst ${fmtDur(slow)}`), h('button.btn.sm', { on: { click: () => MS.download('laps.csv', 'lap,split_ms,total_ms\n' + S.laps.map((t, i) => `${i + 1},${splits[i]},${t}`).join('\n'), 'text/csv') } }, '⬇ CSV')), tbl)); }
        tick = () => { const e = el(); disp.textContent = fmtDur(e); cur.textContent = S.laps.length ? 'Lap ' + (S.laps.length + 1) + ': ' + fmtDur(e - S.laps[S.laps.length - 1]) : ''; };
        tick.fast = true; tick();
      }
      const onKey = (e) => { if (D.tab !== 'stopwatch' || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return; const S = D.sw; const el = S.acc + (S.running ? Date.now() - S.start : 0); if (e.code === 'Space') { e.preventDefault(); if (S.running) { S.acc = el; S.running = false; } else { S.start = Date.now(); S.running = true; } } else if (e.key === 'l' && S.running) S.laps.push(el); else if (e.key === 'r' && !S.running) { S.acc = 0; S.laps = []; } else return; save(); render(); };
      document.addEventListener('keydown', onKey);
      render();
      return { unmount() { E.listeners.delete(loop); cancelAnimationFrame(raf); document.removeEventListener('keydown', onKey); }, route(a) { a = Array.isArray(a) ? a[0] : a; if (a && TABS.some((t) => t[0] === a)) { D.tab = a; render(); } } };
    },
  });
  if (MS.command) { MS.command({ id: 'clock-timer', title: 'Clock: timers', icon: '⏳', run: () => MS.go('clock', 'timers') }); MS.command({ id: 'clock-sw', title: 'Clock: stopwatch', icon: '⏱', run: () => MS.go('clock', 'stopwatch') }); }
})();
