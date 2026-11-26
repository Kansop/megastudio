/* Fitness: interval timer (Tabata, HIIT, EMOM, custom), routine builder with an exercise library,
   guided breathing (box, 4-7-8, coherent), workout log with streaks and a weekly chart */
(function () {
  const { h } = MS;
  const LIB = { Strength: ['Push-ups', 'Squats', 'Lunges', 'Burpees', 'Plank', 'Glute bridge', 'Tricep dips', 'Wall sit', 'Superman', 'Pike push-ups'], Cardio: ['Jumping jacks', 'High knees', 'Mountain climbers', 'Butt kicks', 'Skater hops', 'Jump squats', 'Shadow boxing', 'Jump rope'], Core: ['Crunches', 'Bicycle crunches', 'Russian twists', 'Leg raises', 'Side plank L', 'Side plank R', 'Dead bug', 'Flutter kicks'], Stretch: ['Hamstring stretch', 'Quad stretch L', 'Quad stretch R', 'Child\'s pose', 'Cat-cow', 'Hip flexor stretch', 'Shoulder stretch', 'Cobra'] };
  const PRESETS = [
    { name: 'Tabata', work: 20, rest: 10, rounds: 8, ex: ['Burpees', 'Squats'] },
    { name: 'HIIT 30/30', work: 30, rest: 30, rounds: 10, ex: ['Jumping jacks', 'Push-ups', 'Mountain climbers', 'Lunges', 'High knees'] },
    { name: 'EMOM 10', work: 60, rest: 0, rounds: 10, ex: ['Squats', 'Push-ups'] },
    { name: '7-minute workout', work: 30, rest: 10, rounds: 12, ex: ['Jumping jacks', 'Wall sit', 'Push-ups', 'Crunches', 'Squats', 'Tricep dips', 'Plank', 'High knees', 'Lunges', 'Pike push-ups', 'Side plank L', 'Side plank R'] },
    { name: 'Core blast', work: 40, rest: 15, rounds: 8, ex: ['Crunches', 'Russian twists', 'Leg raises', 'Plank', 'Bicycle crunches', 'Dead bug', 'Flutter kicks', 'Side plank L'] },
    { name: 'Cool-down stretch', work: 30, rest: 5, rounds: 8, ex: LIB.Stretch },
  ];
  const BREATH = [['Box 4-4-4-4', [['Inhale', 4], ['Hold', 4], ['Exhale', 4], ['Hold', 4]]], ['Relax 4-7-8', [['Inhale', 4], ['Hold', 7], ['Exhale', 8]]], ['Coherent 5-5', [['Inhale', 5], ['Exhale', 5]]], ['Energize 6-2', [['Inhale', 6], ['Exhale', 2]]]];
  let ac = null; const beep = (f = 880, d = 0.12) => { try { ac = ac || new AudioContext(); const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f; g.gain.setValueAtTime(0.25, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + d); o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + d); } catch (e) {} };
  const day = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${MS.pad(d.getMonth() + 1)}-${MS.pad(d.getDate())}`; };
  const mmss = (s) => `${Math.floor(s / 60)}:${MS.pad(Math.max(0, Math.ceil(s)) % 60)}`;
  MS.register({
    id: 'fitness', name: 'Fitness', icon: '💪', group: 'Productivity', desc: 'Interval workouts, breathing & workout log', keywords: 'fitness workout exercise hiit tabata emom interval timer breathing meditation gym log streak health',
    async mount(view) {
      const st = await MS.store('fitness', { tab: 'timer', voice: true, sound: true, cfg: { ...PRESETS[0] }, routines: [], log: [] }); const D = st.data; const save = () => st.touch();
      const wrap = h('div.pad.col', { style: { gap: '14px', maxWidth: '960px', margin: '0 auto' } }); view.append(wrap);
      const tabsEl = h('div.row', { style: { flexWrap: 'wrap' } }); const body = h('div.col', { style: { gap: '14px' } }); wrap.append(tabsEl, body);
      const TABS = [['timer', '⏱ Interval timer'], ['routines', '📋 Routines'], ['breathe', '🫁 Breathe'], ['log', '📈 Log']];
      let run = null, raf = null; const say = (t) => { if (D.voice && window.speechSynthesis) { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.rate = 1.05; speechSynthesis.speak(u); } };
      const stopRun = () => { if (raf) cancelAnimationFrame(raf); raf = null; run = null; window.speechSynthesis?.cancel(); };
      function render() { stopRun(); tabsEl.innerHTML = ''; TABS.forEach(([k, l]) => tabsEl.append(h('button.btn', { class: D.tab === k ? 'on' : '', on: { click: () => { D.tab = k; save(); render(); } } }, l))); tabsEl.append(h('div.spacer'), h('button.btn.sm', { class: D.sound ? 'on' : '', on: { click: () => { D.sound = !D.sound; save(); render(); } } }, '🔔 Beeps'), h('button.btn.sm', { class: D.voice ? 'on' : '', on: { click: () => { D.voice = !D.voice; save(); render(); } } }, '🗣 Voice')); body.innerHTML = ''; ({ timer, routines, breathe, log })[D.tab](); }
      const num = (label, key, min, max) => h('label.col', { style: { gap: '4px', minWidth: '90px' } }, h('span.small.muted', label), h('input.input', { type: 'number', min, max, value: D.cfg[key], on: { change: (e) => { D.cfg[key] = Math.max(min, Math.min(max, +e.target.value || min)); save(); } } }));
      function timer() {
        const presetRow = h('div.row', { style: { flexWrap: 'wrap' } }, [...PRESETS, ...D.routines].map((p) => h('button.btn.sm', { class: D.cfg.name === p.name ? 'on' : '', on: { click: () => { D.cfg = structuredClone(p); save(); render(); } } }, p.name)));
        const exIn = h('textarea.input', { rows: 2, value: (D.cfg.ex || []).join(', '), placeholder: 'Exercises, comma-separated (cycled each round)', on: { change: (e) => { D.cfg.ex = e.target.value.split(',').map((s) => s.trim()).filter(Boolean); save(); } } });
        const total = (D.cfg.work + D.cfg.rest) * D.cfg.rounds + 10;
        body.append(h('div.card.col', { style: { gap: '10px' } }, h('strong', 'Pick a preset or set your own'), presetRow, h('div.row', { style: { flexWrap: 'wrap', alignItems: 'flex-end' } }, num('Work (s)', 'work', 5, 600), num('Rest (s)', 'rest', 0, 600), num('Rounds', 'rounds', 1, 50)), exIn, h('div.row', h('span.small.muted', `≈ ${mmss(total)} total incl. 10s get-ready`), h('div.spacer'), h('button.btn.primary', { on: { click: () => startWorkout(D.cfg) } }, '▶ Start workout'))));
      }
      function startWorkout(cfg) {
        const phases = [['Get ready', 10, 'ready', cfg.ex?.[0] || '']]; for (let r = 0; r < cfg.rounds; r++) { const ex = cfg.ex?.length ? cfg.ex[r % cfg.ex.length] : 'Work'; phases.push([ex, cfg.work, 'work', `Round ${r + 1}/${cfg.rounds}`]); if (cfg.rest && r < cfg.rounds - 1) phases.push(['Rest', cfg.rest, 'rest', 'Next: ' + (cfg.ex?.length ? cfg.ex[(r + 1) % cfg.ex.length] : 'Work')]); }
        body.innerHTML = ''; const COL = { ready: '#f5a623', work: '#2ecc71', rest: '#3b82f6' };
        const big = h('div', { style: { fontSize: 'min(28vw,160px)', fontWeight: 900, fontVariantNumeric: 'tabular-nums', lineHeight: 1 } }); const title = h('div', { style: { fontSize: '30px', fontWeight: 800, textAlign: 'center' } }); const sub = h('div.muted'); const bar = h('div', { style: { height: '10px', borderRadius: '5px', background: 'var(--accent)', width: '0%' } });
        const pauseBtn = h('button.btn', { on: { click: () => { run.paused = !run.paused; if (!run.paused) run.last = performance.now(); pauseBtn.textContent = run.paused ? '▶ Resume' : '⏸ Pause'; } } }, '⏸ Pause');
        const card = h('div.card.col', { style: { alignItems: 'center', gap: '12px', padding: '28px', transition: 'background .3s' } }, title, big, sub, h('div', { style: { width: '100%', background: 'var(--panel2)', borderRadius: '5px' } }, bar), h('div.row', pauseBtn, h('button.btn', { on: { click: () => { run.left = 0.01; } } }, '⏭ Skip'), h('button.btn', { on: { click: () => render() } }, '✖ Stop')));
        body.append(card); const tot = phases.reduce((a, p) => a + p[1], 0);
        run = { i: -1, left: 0, last: performance.now(), paused: false, done: 0, lastSec: null };
        const next = () => { run.i++; if (run.i >= phases.length) return finish(); const p = phases[run.i]; run.left = p[1]; title.textContent = p[0]; sub.textContent = p[3]; card.style.background = `color-mix(in srgb, ${COL[p[2]]} 22%, var(--panel))`; if (D.sound) beep(p[2] === 'work' ? 1046 : 660, 0.3); say(p[2] === 'work' ? p[0] : p[2] === 'rest' ? 'Rest. ' + p[3] : 'Get ready'); };
        const finish = async () => { stopRun(); D.log.push({ id: MS.uid('w'), t: Date.now(), name: cfg.name || 'Custom', secs: cfg.work * cfg.rounds, rounds: cfg.rounds }); save(); if (D.sound) { beep(784, 0.2); setTimeout(() => beep(1046, 0.4), 220); } say('Workout complete. Great job!'); body.innerHTML = ''; body.append(h('div.card.col', { style: { alignItems: 'center', gap: '10px', padding: '30px' } }, h('div', { style: { fontSize: '60px' } }, '🎉'), h('h2', { style: { margin: 0 } }, 'Workout complete!'), h('div.muted', `${cfg.rounds} rounds · ${mmss(cfg.work * cfg.rounds)} of work · streak ${streak()} day${streak() === 1 ? '' : 's'}`), h('div.row', h('button.btn.primary', { on: { click: () => startWorkout(cfg) } }, '↻ Again'), h('button.btn', { on: { click: () => { D.tab = 'log'; save(); render(); } } }, '📈 See log')))); MS.toast('Workout logged 💪', 'good'); };
        const loop = (now) => { if (!run) return; raf = requestAnimationFrame(loop); if (!run.paused) { const dt = (now - run.last) / 1000; run.left -= dt; run.done += dt; } run.last = now;
          if (run.left <= 0) next(); if (!run) return; const s = Math.ceil(run.left); if (s !== run.lastSec) { run.lastSec = s; if (s <= 3 && s > 0 && D.sound) beep(880, 0.1); } big.textContent = mmss(run.left); bar.style.width = Math.min(100, (run.done / tot) * 100) + '%'; };
        next(); raf = requestAnimationFrame(loop);
      }
      function routines() {
        const draft = { name: '', work: 40, rest: 20, rounds: 6, ex: [] }; const chosen = h('div.row', { style: { flexWrap: 'wrap', minHeight: '32px' } });
        const drawChosen = () => { chosen.innerHTML = ''; if (!draft.ex.length) chosen.append(h('span.small.muted', 'Tap exercises below to add them in order')); draft.ex.forEach((e, i) => chosen.append(h('span.tag', { style: { cursor: 'pointer' }, title: 'Remove', on: { click: () => { draft.ex.splice(i, 1); draft.rounds = Math.max(1, draft.ex.length); drawChosen(); } } }, `${i + 1}. ${e} ✕`))); };
        const nameIn = h('input.input', { placeholder: 'Routine name', on: { input: (e) => (draft.name = e.target.value) } });
        const n = (l, k) => h('label.col', { style: { gap: '4px' } }, h('span.small.muted', l), h('input.input', { type: 'number', value: draft[k], min: k === 'rest' ? 0 : 1, style: { width: '90px' }, on: { change: (e) => (draft[k] = Math.max(k === 'rest' ? 0 : 1, +e.target.value || 0)) } }));
        body.append(h('div.card.col', { style: { gap: '10px' } }, h('strong', '🛠 Build a routine'), nameIn, h('div.row', { style: { flexWrap: 'wrap' } }, n('Work (s)', 'work'), n('Rest (s)', 'rest'), n('Rounds', 'rounds')), chosen,
          ...Object.entries(LIB).map(([cat, list]) => h('div.col', { style: { gap: '4px' } }, h('span.small.muted', cat), h('div.row', { style: { flexWrap: 'wrap', gap: '6px' } }, list.map((e) => h('button.btn.sm', { on: { click: () => { draft.ex.push(e); draft.rounds = Math.max(draft.rounds, draft.ex.length); drawChosen(); } } }, e))))),
          h('div.row', h('div.spacer'), h('button.btn.primary', { on: { click: () => { if (!draft.ex.length) return MS.toast('Add at least one exercise', 'bad'); draft.name = draft.name.trim() || 'My routine ' + (D.routines.length + 1); D.routines.push({ ...draft, id: MS.uid('r') }); save(); MS.toast('Routine saved', 'good'); render(); } } }, '💾 Save routine'))));
        drawChosen();
        body.append(h('h3', { style: { margin: '4px 0 0' } }, 'My routines'));
        if (!D.routines.length) body.append(h('div.small.muted', 'No saved routines yet.'));
        D.routines.forEach((r, i) => body.append(h('div.card.row', { style: { flexWrap: 'wrap' } }, h('div.col', { style: { flex: 1, minWidth: '200px' } }, h('strong', r.name), h('span.small.muted', `${r.rounds} rounds · ${r.work}s work / ${r.rest}s rest · ${r.ex.join(', ')}`)), h('button.btn.primary.sm', { on: { click: () => { D.cfg = structuredClone(r); D.tab = 'timer'; save(); render(); startWorkout(D.cfg); } } }, '▶ Start'), h('button.btn.sm', { on: { click: async () => { if (await MS.confirm('Delete routine?', r.name, 'Delete')) { D.routines.splice(i, 1); save(); render(); } } } }, '🗑'))));
      }
      function breathe() {
        let pi = D.breath || 0; const circle = h('div', { style: { width: '220px', height: '220px', borderRadius: '50%', background: 'radial-gradient(circle at 40% 35%, color-mix(in srgb,var(--accent) 60%,#fff), var(--accent))', transform: 'scale(.55)', transition: 'transform 1s linear', boxShadow: '0 0 60px color-mix(in srgb,var(--accent) 50%,transparent)' } });
        const label = h('div', { style: { fontSize: '28px', fontWeight: 800 } }, 'Ready'); const count = h('div.muted', { style: { fontVariantNumeric: 'tabular-nums' } }, ''); const cycles = h('div.small.muted');
        const mins = h('select.input', {}, [1, 2, 3, 5, 10].map((m) => h('option', { value: m, selected: m === (D.bmins || 2) }, m + ' min')));
        const go = h('button.btn.primary', { on: { click: () => (run ? render() : start()) } }, '▶ Begin');
        body.append(h('div.card.col', { style: { alignItems: 'center', gap: '14px', padding: '26px' } }, h('div.row', { style: { flexWrap: 'wrap', justifyContent: 'center' } }, BREATH.map(([n], i) => h('button.btn.sm', { class: i === pi ? 'on' : '', on: { click: () => { D.breath = i; save(); render(); } } }, n)), mins), h('div', { style: { height: '240px', display: 'grid', placeItems: 'center' } }, circle), label, count, cycles, go,
          h('div.small.muted', { style: { textAlign: 'center', maxWidth: '520px' } }, 'Follow the circle: breathe in as it grows, hold while it stays, breathe out as it shrinks. Sessions are added to your log.')));
        function start() {
          const pat = BREATH[pi][1]; D.bmins = +mins.value; save(); const end = performance.now() + D.bmins * 60000; let k = -1, left = 0, last = performance.now(), n = 0; run = { breath: true }; go.textContent = '■ Stop';
          const step = () => { k = (k + 1) % pat.length; if (k === 0) { n++; cycles.textContent = 'Cycle ' + n; } const [name, secs] = pat[k]; left = secs; label.textContent = name; circle.style.transition = `transform ${secs}s ease-in-out`; if (name === 'Inhale') circle.style.transform = 'scale(1)'; else if (name === 'Exhale') circle.style.transform = 'scale(.55)'; if (D.sound) beep(name === 'Inhale' ? 528 : name === 'Exhale' ? 396 : 440, 0.15); };
          const loop = (now) => { if (!run) return; raf = requestAnimationFrame(loop); left -= (now - last) / 1000; last = now; if (left <= 0) { if (now >= end && k === pat.length - 1) { D.log.push({ id: MS.uid('w'), t: Date.now(), name: '🫁 ' + BREATH[pi][0], secs: D.bmins * 60, breath: true }); save(); stopRun(); label.textContent = 'Done — nice work 🌿'; count.textContent = ''; go.textContent = '▶ Again'; circle.style.transform = 'scale(.55)'; MS.toast('Breathing session logged', 'good'); return; } step(); } count.textContent = Math.ceil(left) + 's · ' + mmss((end - now) / 1000) + ' left'; };
          step(); raf = requestAnimationFrame(loop);
        }
      }
      function streak() { const days = new Set(D.log.map((l) => day(l.t))); let s = 0, t = Date.now(); if (!days.has(day(t))) t -= 864e5; while (days.has(day(t))) { s++; t -= 864e5; } return s; }
      function log() {
        const L = D.log; const week = L.filter((l) => l.t > Date.now() - 7 * 864e5); const totalMin = Math.round(L.reduce((a, l) => a + l.secs, 0) / 60);
        const stat = (i, v, l) => h('div.card', { style: { flex: 1, minWidth: '130px', textAlign: 'center' } }, h('div', { style: { fontSize: '24px', fontWeight: 800 } }, i + ' ' + v), h('div.small.muted', l));
        body.append(h('div.row', { style: { flexWrap: 'wrap' } }, stat('🔥', streak(), 'day streak'), stat('🏋️', L.filter((l) => !l.breath).length, 'workouts'), stat('🫁', L.filter((l) => l.breath).length, 'breathing sessions'), stat('⏱', totalMin, 'active minutes'), stat('📅', week.length, 'this week')));
        const cv = h('canvas', { width: 900, height: 220, style: { width: '100%', height: '220px' } }); body.append(h('div.card.col', h('strong', 'Last 14 days (minutes)'), cv));
        requestAnimationFrame(() => { const g = cv.getContext('2d'); const css = getComputedStyle(document.documentElement); const acc = css.getPropertyValue('--accent').trim() || '#7c5cff'; const fg = css.getPropertyValue('--muted').trim() || '#888'; const vals = []; for (let i = 13; i >= 0; i--) { const d = day(Date.now() - i * 864e5); vals.push([d, L.filter((l) => day(l.t) === d).reduce((a, l) => a + l.secs / 60, 0)]); } const mx = Math.max(5, ...vals.map((v) => v[1])); const bw = 900 / 14; g.font = '14px system-ui'; g.textAlign = 'center';
          vals.forEach(([d, v], i) => { const bh = (v / mx) * 160; g.fillStyle = acc; g.fillRect(i * bw + 8, 180 - bh, bw - 16, bh); g.fillStyle = fg; g.fillText(d.slice(8), i * bw + bw / 2, 205); if (v) g.fillText(Math.round(v), i * bw + bw / 2, 172 - bh); }); });
        body.append(h('div.row', h('h3', { style: { margin: 0 } }, 'History'), h('div.spacer'), h('button.btn.sm', { on: { click: () => { const csv = 'date,activity,minutes,rounds\n' + L.map((l) => `${new Date(l.t).toISOString()},"${l.name}",${(l.secs / 60).toFixed(1)},${l.rounds || ''}`).join('\n'); MS.download('workouts.csv', csv, 'text/csv'); } } }, '⬇ CSV')));
        if (!L.length) body.append(h('div.small.muted', 'No workouts yet — finish one from the Interval timer or Breathe tab.'));
        [...L].reverse().slice(0, 50).forEach((l) => body.append(h('div.card.row', h('span', new Date(l.t).toLocaleString()), h('strong', l.name), h('div.spacer'), h('span.muted', mmss(l.secs)), h('button.btn.sm', { title: 'Delete', on: { click: () => { D.log = D.log.filter((x) => x.id !== l.id); save(); render(); } } }, '✕'))));
      }
      render();
      return { unmount: stopRun };
    },
  });
})();
