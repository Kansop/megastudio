/* Focus: Pomodoro timer with session log & stats, plus a habit tracker with streaks and heatmaps */
(function () {
  const { h } = MS;
  let store;
  const getStore = async () => (store = store || (await MS.store('focus', () => ({ work: 25, short: 5, long: 15, every: 4, log: [], habits: [{ id: 'h1', name: '💧 Drink water', color: '#2fa8ff', days: {} }, { id: 'h2', name: '📚 Read 20 min', color: '#3ddc97', days: {} }, { id: 'h3', name: '🏃 Move', color: '#ff4fa3', days: {} }], sound: true }))));
  // timer state survives app switches
  const T = { phase: 'work', left: null, running: false, endAt: 0, count: 0, label: '', iv: null };
  const chime = () => { try { const ac = new AudioContext(); [660, 880, 990].forEach((f, i) => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f; g.gain.setValueAtTime(0.0001, ac.currentTime + i * 0.18); g.gain.exponentialRampToValueAtTime(0.3, ac.currentTime + i * 0.18 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + i * 0.18 + 0.5); o.connect(g).connect(ac.destination); o.start(ac.currentTime + i * 0.18); o.stop(ac.currentTime + i * 0.18 + 0.6); }); setTimeout(() => ac.close(), 1500); } catch (e) {} };
  async function finishPhase() {
    const s = await getStore(); T.running = false; clearInterval(T.iv);
    if (T.phase === 'work') { T.count++; s.data.log.push({ t: Date.now(), min: s.data.work, label: T.label || 'Focus' }); s.touch(); }
    if (s.data.sound) chime();
    const msg = T.phase === 'work' ? 'Focus session done — take a break ☕' : 'Break over — back to it 💪';
    MS.toast(msg, 'good'); if ('Notification' in window && Notification.permission === 'granted') new Notification('MegaStudio Focus', { body: msg, icon: 'icons/icon-192.png' });
    T.phase = T.phase === 'work' ? (T.count % s.data.every === 0 ? 'long' : 'short') : 'work'; T.left = s.data[T.phase] * 60; MS.emit('focus:tick');
    document.title = 'MegaStudio';
  }
  function startTimer() { if (T.running) return; T.running = true; T.endAt = Date.now() + T.left * 1000; clearInterval(T.iv); T.iv = setInterval(() => { T.left = Math.max(0, Math.round((T.endAt - Date.now()) / 1000)); if (MS.current() !== 'focus' && T.running) document.title = `⏱ ${fmt(T.left)} — MegaStudio`; MS.emit('focus:tick'); if (T.left <= 0) finishPhase(); }, 250); }
  const fmt = (sec) => `${MS.pad(Math.floor(sec / 60))}:${MS.pad(sec % 60)}`;
  const PH = { work: ['Focus', '#ff5d6c'], short: ['Short break', '#3ddc97'], long: ['Long break', '#2fa8ff'] };
  MS.register({
    id: 'focus', name: 'Focus & Habits', icon: '⏱', group: 'Productivity', desc: 'Pomodoro timer and habit streaks', keywords: 'pomodoro timer habit streak tracker productivity concentrate',
    commands: [{ id: 'focus-toggle', title: 'Start / pause focus timer', icon: '⏱', key: 'alt+t', run: async () => { const s = await getStore(); if (T.left == null) T.left = s.data.work * 60; T.running ? (T.running = false, clearInterval(T.iv), MS.emit('focus:tick')) : startTimer(); MS.toast(T.running ? 'Focus timer running' : 'Focus timer paused'); } }],
    async mount(view) {
      const s = await getStore(); const d = s.data; if (T.left == null) T.left = d.work * 60;
      const R = 120, CIRC = 2 * Math.PI * R;
      const ring = h('div', { html: `<svg width="290" height="290" viewBox="0 0 290 290"><circle cx="145" cy="145" r="${R}" fill="none" stroke="var(--panel2)" stroke-width="16"/><circle id="fring" cx="145" cy="145" r="${R}" fill="none" stroke="#ff5d6c" stroke-width="16" stroke-linecap="round" transform="rotate(-90 145 145)" stroke-dasharray="${CIRC}" stroke-dashoffset="0" style="transition:stroke-dashoffset .3s"/></svg>`, style: { position: 'relative', width: '290px', height: '290px', margin: 'auto' } });
      const timeEl = h('div', { style: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } }); ring.append(timeEl);
      const big = h('div', { style: { fontSize: '56px', fontWeight: 800, fontVariantNumeric: 'tabular-nums' } }); const phaseEl = h('div.muted'); timeEl.append(big, phaseEl);
      const startBtn = h('button.btn.primary', { style: { minWidth: '110px', fontSize: '16px' }, on: { click: () => { if (T.running) { T.running = false; clearInterval(T.iv); upd(); } else { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); startTimer(); upd(); } } } });
      const label = h('input.input', { value: T.label, placeholder: 'What are you focusing on?', style: { width: '100%', textAlign: 'center' }, on: { input: () => (T.label = label.value) } });
      const phaseBtns = Object.keys(PH).map((p) => h('button.btn.sm', { on: { click: () => { T.running = false; clearInterval(T.iv); T.phase = p; T.left = d[p] * 60; upd(); } } }, PH[p][0]));
      const num = (k, lbl) => h('label.col.small', { style: { gap: '2px' } }, h('span.muted', lbl), h('input.input', { type: 'number', min: 1, max: 180, value: d[k], style: { width: '72px' }, on: { change: (e) => { d[k] = MS.clamp(+e.target.value || 1, 1, 180); s.touch(); if (!T.running && T.phase === k) { T.left = d[k] * 60; upd(); } } } }));
      const statsEl = h('div'); const habitsEl = h('div.col', { style: { gap: '10px' } });
      function upd() { const total = d[T.phase] * 60; big.textContent = fmt(T.left); phaseEl.textContent = PH[T.phase][0] + ` · session ${T.count % d.every + (T.phase === 'work' ? 1 : 0)}/${d.every}`; const r = ring.querySelector('#fring'); r.setAttribute('stroke', PH[T.phase][1]); r.setAttribute('stroke-dashoffset', String(CIRC * (1 - T.left / total))); startBtn.textContent = T.running ? '⏸ Pause' : '▶ Start'; phaseBtns.forEach((b, i) => b.classList.toggle('on', Object.keys(PH)[i] === T.phase)); }
      function renderStats() {
        const days = [...Array(7)].map((_, i) => { const x = new Date(); x.setDate(x.getDate() - 6 + i); return MS.isoDate(x); });
        const mins = days.map((iso) => d.log.filter((l) => MS.isoDate(new Date(l.t)) === iso).reduce((a, l) => a + l.min, 0)); const mx = Math.max(25, ...mins);
        const today = mins[6]; const total = d.log.reduce((a, l) => a + l.min, 0);
        statsEl.innerHTML = ''; statsEl.append(h('div.row', { style: { gap: '16px', marginBottom: '10px', flexWrap: 'wrap' } }, h('div', h('div', { style: { fontSize: '22px', fontWeight: 800 } }, today + 'm'), h('div.small.muted', 'today')), h('div', h('div', { style: { fontSize: '22px', fontWeight: 800 } }, d.log.length), h('div.small.muted', 'sessions all-time')), h('div', h('div', { style: { fontSize: '22px', fontWeight: 800 } }, (total / 60).toFixed(1) + 'h'), h('div.small.muted', 'focused all-time'))),
          h('div', { style: { display: 'flex', alignItems: 'flex-end', gap: '8px', height: '110px' } }, days.map((iso, i) => h('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' } }, h('div.small.muted', mins[i] || ''), h('div', { title: `${iso}: ${mins[i]} min`, style: { width: '100%', height: Math.max(3, (mins[i] / mx) * 80) + 'px', borderRadius: '6px 6px 2px 2px', background: 'linear-gradient(var(--accent2),var(--accent))' } }), h('div.small.muted', new Date(iso + 'T12:00').toLocaleDateString(undefined, { weekday: 'narrow' }))))),
          h('div.col.small', { style: { gap: '2px', marginTop: '10px', maxHeight: '120px', overflow: 'auto' } }, d.log.slice(-8).reverse().map((l) => h('div.row', h('span.muted', MS.fmtTime(l.t)), h('span', `${l.min}m · ${l.label}`)))));
      }
      function streak(hb) { let n = 0; const x = new Date(); if (!hb.days[MS.isoDate(x)]) x.setDate(x.getDate() - 1); while (hb.days[MS.isoDate(x)]) { n++; x.setDate(x.getDate() - 1); } return n; }
      function renderHabits() {
        habitsEl.innerHTML = ''; const days = [...Array(7)].map((_, i) => { const x = new Date(); x.setDate(x.getDate() - 6 + i); return x; });
        habitsEl.append(h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(70px,1fr) repeat(7, minmax(22px,34px)) 48px', gap: '4px', alignItems: 'center' } }, h('span'), days.map((x) => h('div.small.muted', { style: { textAlign: 'center' } }, x.toLocaleDateString(undefined, { weekday: 'narrow' }) + '\n' + x.getDate())), h('div.small.muted', 'Streak'),
          ...d.habits.flatMap((hb) => [h('div.row', { style: { gap: '6px' } }, h('span', { style: { cursor: 'pointer' }, title: 'Rename', on: { click: async () => { const n = await MS.prompt('Habit name', hb.name); if (n) { hb.name = n; s.touch(); renderHabits(); } } } }, hb.name), h('button.icon-btn', { title: 'Delete', on: { click: async () => { if (await MS.confirm('Delete habit?', hb.name, 'Delete')) { d.habits = d.habits.filter((x) => x !== hb); s.touch(); renderHabits(); } } } }, '×')),
            ...days.map((x) => { const iso = MS.isoDate(x); const on = !!hb.days[iso]; return h('button', { title: iso, style: { width: '34px', height: '34px', borderRadius: '9px', border: '1px solid var(--line)', cursor: 'pointer', background: on ? hb.color : 'var(--panel2)', color: '#fff', fontSize: '16px' }, on: { click: () => { if (on) delete hb.days[iso]; else hb.days[iso] = 1; s.touch(); renderHabits(); if (!on && iso === MS.isoDate()) MS.toast('✅ ' + hb.name, 'good'); } } }, on ? '✓' : ''); }),
            h('strong', { style: { textAlign: 'center' } }, '🔥 ' + streak(hb))])));
        // heatmap of all habits, 16 weeks
        const cells = h('div', { style: { display: 'grid', gridTemplateRows: 'repeat(7, 12px)', gridAutoColumns: '12px', gridAutoFlow: 'column', gap: '3px', marginTop: '6px' } });
        const start = new Date(); start.setDate(start.getDate() - 15 * 7 - start.getDay());
        for (let i = 0; i < 16 * 7; i++) { const x = new Date(start); x.setDate(start.getDate() + i); const iso = MS.isoDate(x); const n = d.habits.filter((hb) => hb.days[iso]).length; const a = d.habits.length ? n / d.habits.length : 0; cells.append(h('div', { title: `${iso}: ${n}/${d.habits.length}`, style: { width: '12px', height: '12px', borderRadius: '3px', background: a ? `color-mix(in srgb, var(--good) ${Math.round(25 + a * 75)}%, var(--panel2))` : 'var(--panel2)' } })); }
        habitsEl.append(h('div.small.muted', 'Last 16 weeks'), cells);
        habitsEl.append(h('button.btn', { style: { alignSelf: 'flex-start' }, on: { click: async () => { const n = await MS.prompt('New habit', '✨ '); if (n) { d.habits.push({ id: MS.uid('h'), name: n, color: ['#ff4fa3', '#7c5cff', '#3ddc97', '#2fa8ff', '#ffb84f'][d.habits.length % 5], days: {} }); s.touch(); renderHabits(); } } } }, '+ Add habit'));
      }
      view.append(h('div.pad', { style: { maxWidth: '1150px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: '16px' } },
        h('div.card.col', { style: { gap: '14px', alignItems: 'center' } }, h('div.row', phaseBtns), ring, label, h('div.row', startBtn, h('button.btn', { on: { click: () => { T.running = false; clearInterval(T.iv); T.left = d[T.phase] * 60; upd(); } } }, '↺ Reset'), h('button.btn', { title: 'Skip to next phase', on: { click: () => { T.left = 0; finishPhase(); } } }, '⏭ Skip')),
          h('div.row', { style: { gap: '10px', flexWrap: 'wrap', justifyContent: 'center' } }, num('work', 'Focus min'), num('short', 'Short break'), num('long', 'Long break'), num('every', 'Long every'), h('label.row.small', h('input', { type: 'checkbox', checked: d.sound, on: { change: (e) => { d.sound = e.target.checked; s.touch(); } } }), 'Chime'))),
        h('div.col', { style: { gap: '16px' } }, h('div.card', h('strong', '📈 Focus stats'), h('div', { style: { height: '8px' } }), statsEl), h('div.card', h('strong', '🔥 Habits'), h('div', { style: { height: '8px' } }), habitsEl))));
      const off = MS.on('focus:tick', () => { upd(); if (T.left === d[T.phase] * 60) renderStats(); });
      upd(); renderStats(); renderHabits(); document.title = 'Focus & Habits — MegaStudio';
      return { unmount: off };
    },
  });
})();
