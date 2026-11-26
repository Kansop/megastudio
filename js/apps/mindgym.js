/* Mind Gym: quick brain-training drills (mental math, digit span, reaction time, Stroop, Schulte grid,
   visual memory) with personal bests, daily-training checklist and progress history */
(function () {
  const { h } = MS;
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const day = (t = Date.now()) => new Date(t).toDateString();
  const DRILLS = [
    { id: 'math', icon: '➗', name: 'Mental Math', desc: 'Solve as many as you can in 60 seconds', unit: 'correct', better: 'high' },
    { id: 'span', icon: '🔢', name: 'Digit Span', desc: 'Memorize a growing number, then type it back', unit: 'digits', better: 'high' },
    { id: 'react', icon: '⚡', name: 'Reaction Time', desc: 'Click the moment the panel turns green (avg of 5)', unit: 'ms', better: 'low' },
    { id: 'stroop', icon: '🎨', name: 'Stroop Test', desc: 'Pick the INK color, not the word — 30 seconds', unit: 'correct', better: 'high' },
    { id: 'schulte', icon: '🔳', name: 'Schulte Grid', desc: 'Tap 1 → 25 in order as fast as you can', unit: 's', better: 'low' },
    { id: 'visual', icon: '🧩', name: 'Visual Memory', desc: 'Remember which tiles lit up; the grid grows', unit: 'level', better: 'high' },
  ];
  MS.register({
    id: 'mindgym', name: 'Mind Gym', icon: '🧠', group: 'Play', desc: 'Brain-training drills with personal bests', keywords: 'brain training mind gym memory math reaction stroop schulte focus puzzle cognitive iq',
    async mount(view) {
      const st = await MS.store('mindgym', { best: {}, hist: [] }); const D = st.data; const save = () => st.touch();
      const wrap = h('div.pad.col', { style: { gap: '14px', maxWidth: '900px', margin: '0 auto' } }); view.append(wrap);
      let timers = []; const later = (fn, ms) => timers.push(setTimeout(fn, ms)); const clear = () => { timers.forEach(clearTimeout); timers = []; document.onkeydown = null; };
      const isBetter = (d, v) => D.best[d.id] == null || (d.better === 'high' ? v > D.best[d.id] : v < D.best[d.id]);
      function record(d, v) { const pb = isBetter(d, v); if (pb) D.best[d.id] = v; D.hist.push({ d: d.id, v, t: Date.now() }); if (D.hist.length > 600) D.hist.shift(); save(); return pb; }
      function home() {
        clear(); wrap.innerHTML = ''; const today = new Set(D.hist.filter((x) => day(x.t) === day()).map((x) => x.d));
        wrap.append(h('div.card.row', { style: { flexWrap: 'wrap' } }, h('div.col', { style: { flex: 1 } }, h('strong', '🏋️ Daily workout'), h('span.small.muted', `${today.size}/${DRILLS.length} drills done today — play each once to complete it`)), h('div', { style: { fontSize: '26px' } }, DRILLS.map((d) => (today.has(d.id) ? '✅' : '⬜')).join(''))));
        wrap.append(h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: '12px' } }, DRILLS.map((d) => {
          const runs = D.hist.filter((x) => x.d === d.id).slice(-12); const spark = h('canvas', { width: 220, height: 36, style: { width: '100%', height: '36px' } });
          requestAnimationFrame(() => { if (runs.length < 2) return; const g = spark.getContext('2d'); const vs = runs.map((r) => r.v); const mn = Math.min(...vs), mx = Math.max(...vs) || 1; g.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#7c5cff'; g.lineWidth = 2; g.beginPath(); vs.forEach((v, i) => { const x = (i / (vs.length - 1)) * 216 + 2, y = 32 - ((v - mn) / (mx - mn || 1)) * 28; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); });
          return h('div.card.col', { style: { gap: '6px', cursor: 'pointer' }, on: { click: () => play(d) } }, h('div', { style: { fontSize: '30px' } }, d.icon), h('strong', d.name), h('span.small.muted', d.desc), h('div.row', h('span.small', '🏆 Best: ' + (D.best[d.id] != null ? D.best[d.id] + ' ' + d.unit : '—')), h('div.spacer'), h('span.small.muted', runs.length ? runs.length + ' runs' : '')), spark);
        })));
        wrap.append(h('div.row', h('div.spacer'), h('button.btn.sm', { on: { click: async () => { if (await MS.confirm('Reset Mind Gym?', 'Clears all bests and history.', 'Reset')) { D.best = {}; D.hist = []; save(); home(); } } } }, '↺ Reset stats')));
      }
      function frame(d) { clear(); wrap.innerHTML = ''; const stage = h('div.card.col', { style: { alignItems: 'center', gap: '14px', padding: '28px', minHeight: '380px', justifyContent: 'center' } }); wrap.append(h('div.row', h('button.btn.sm', { on: { click: home } }, '← All drills'), h('strong', d.icon + ' ' + d.name), h('div.spacer'), h('span.small.muted', '🏆 ' + (D.best[d.id] != null ? D.best[d.id] + ' ' + d.unit : '—'))), stage); return stage; }
      function done(d, v, extra = '') { const pb = record(d, v); const s = frame(d); s.append(h('div', { style: { fontSize: '54px' } }, pb ? '🏆' : '✅'), h('h2', { style: { margin: 0 } }, `${v} ${d.unit}`), h('div.muted', (pb ? 'New personal best! ' : 'Best: ' + D.best[d.id] + ' ' + d.unit + '. ') + extra), h('div.row', h('button.btn.primary', { on: { click: () => play(d) } }, '↻ Play again'), h('button.btn', { on: { click: home } }, 'All drills'))); }
      const big = (t, sz = 56) => h('div', { style: { fontSize: sz + 'px', fontWeight: 900, textAlign: 'center', fontVariantNumeric: 'tabular-nums' } }, t);
      function play(d) { ({ math, span, react, stroop, schulte, visual })[d.id](d); }
      function math(d) {
        const s = frame(d); let score = 0, q, end = Date.now() + 60000; const qEl = big(''), inp = h('input.input', { inputmode: 'numeric', style: { fontSize: '28px', width: '180px', textAlign: 'center' } }), tEl = h('div.muted'), sEl = h('div.small');
        const gen = () => { const lv = Math.min(4, 1 + Math.floor(score / 6)); const op = ['+', '−', '×', '÷'][rnd(0, lv >= 3 ? 3 : lv >= 2 ? 2 : 1)]; let a, b, ans; if (op === '+') { a = rnd(2, 10 * lv * 2); b = rnd(2, 10 * lv * 2); ans = a + b; } else if (op === '−') { a = rnd(5, 20 * lv); b = rnd(1, a); ans = a - b; } else if (op === '×') { a = rnd(2, 4 + lv * 2); b = rnd(2, 12); ans = a * b; } else { b = rnd(2, 12); ans = rnd(2, 12); a = b * ans; } q = ans; qEl.textContent = `${a} ${op} ${b}`; inp.value = ''; };
        inp.oninput = () => { if (+inp.value === q && inp.value !== '') { score++; sEl.textContent = '✔ ' + score; gen(); } };
        s.append(tEl, qEl, inp, sEl, h('div.small.muted', 'Type the answer — it advances automatically.')); gen(); setTimeout(() => inp.focus(), 50);
        const tick = () => { const l = Math.ceil((end - Date.now()) / 1000); tEl.textContent = '⏱ ' + l + 's'; if (l <= 0) return done(d, score); later(tick, 200); }; tick();
      }
      function span(d) {
        let n = 3; const s = frame(d);
        const round = () => { s.innerHTML = ''; const num = Array.from({ length: n }, (_, i) => rnd(i ? 0 : 1, 9)).join(''); s.append(h('div.muted', `${n} digits — memorize`), big(num, 64)); later(() => { s.innerHTML = ''; const inp = h('input.input', { inputmode: 'numeric', style: { fontSize: '28px', width: '260px', textAlign: 'center', letterSpacing: '4px' } }); const go = () => { if (inp.value.trim() === num) { n++; s.innerHTML = ''; s.append(big('✔', 64)); later(round, 600); } else done(d, n - 1, `It was ${num}.`); }; inp.onkeydown = (e) => e.key === 'Enter' && go(); s.append(h('div.muted', 'Type the number'), inp, h('button.btn.primary', { on: { click: go } }, 'Check')); setTimeout(() => inp.focus(), 30); }, 900 + n * 550); };
        s.append(h('div.muted', 'Numbers flash briefly. Each success adds a digit.'), h('button.btn.primary', { on: { click: round } }, '▶ Start'));
      }
      function react(d) {
        const s = frame(d); const times = []; let state = 'idle', t0 = 0; const pad = h('div', { style: { width: '100%', height: '300px', borderRadius: '16px', display: 'grid', placeItems: 'center', fontSize: '26px', fontWeight: 800, color: '#fff', cursor: 'pointer', userSelect: 'none', background: '#3b82f6' } }, 'Click to start');
        const arm = () => { state = 'wait'; pad.style.background = '#e74c3c'; pad.textContent = 'Wait for green…'; later(() => { state = 'go'; t0 = performance.now(); pad.style.background = '#2ecc71'; pad.textContent = 'CLICK!'; }, rnd(1200, 3500)); };
        const hit = () => { if (state === 'idle') return arm(); if (state === 'wait') { clear(); state = 'idle'; pad.style.background = '#f5a623'; pad.textContent = 'Too soon! Click to retry'; return; } if (state === 'go') { const ms = Math.round(performance.now() - t0); times.push(ms); if (times.length >= 5) return done(d, Math.round(times.reduce((a, b) => a + b) / 5), 'Runs: ' + times.join(', ') + ' ms'); state = 'idle'; pad.style.background = '#3b82f6'; pad.textContent = `${ms} ms — click for next (${times.length}/5)`; } };
        pad.addEventListener('pointerdown', hit); s.append(pad);
      }
      function stroop(d) {
        const C = [['RED', '#e74c3c'], ['BLUE', '#3b82f6'], ['GREEN', '#2ecc71'], ['YELLOW', '#f1c40f'], ['PURPLE', '#9b59b6']]; const s = frame(d); let score = 0, miss = 0, ink, end = Date.now() + 30000;
        const word = big('', 64), tEl = h('div.muted'), sEl = h('div.small'); const btns = h('div.row', { style: { flexWrap: 'wrap', justifyContent: 'center' } }, C.map(([n, c]) => h('button.btn', { style: { minWidth: '96px' }, on: { click: () => { if (n === ink) score++; else miss++; sEl.textContent = `✔ ${score}  ✖ ${miss}`; gen(); } } }, n)));
        const gen = () => { const w = C[rnd(0, 4)]; let k; do k = C[rnd(0, 4)]; while (k === w && Math.random() < 0.8); ink = k[0]; word.textContent = w[0]; word.style.color = k[1]; };
        s.append(tEl, h('div.small.muted', 'Click the color of the INK'), word, btns, sEl); gen();
        const tick = () => { const l = Math.ceil((end - Date.now()) / 1000); tEl.textContent = '⏱ ' + l + 's'; if (l <= 0) return done(d, Math.max(0, score - miss), `${score} right, ${miss} wrong (score = right − wrong)`); later(tick, 200); }; tick();
      }
      function schulte(d) {
        const s = frame(d); const nums = Array.from({ length: 25 }, (_, i) => i + 1).sort(() => Math.random() - 0.5); let next = 1, t0 = 0; const info = h('div.muted', 'Find 1'); const tEl = h('div', { style: { fontSize: '22px', fontWeight: 800 } }, '0.0s');
        const grid = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '6px', width: 'min(100%,380px)' } }, nums.map((n) => h('button.btn', { style: { aspectRatio: '1', fontSize: '22px', fontWeight: 800, padding: 0 }, on: { click: (e) => { if (n !== next) { e.target.animate([{ background: '#e74c3c' }, { background: '' }], 300); return; } if (n === 1) { t0 = performance.now(); const tk = () => { if (next > 25) return; tEl.textContent = ((performance.now() - t0) / 1000).toFixed(1) + 's'; later(tk, 100); }; tk(); } e.target.style.opacity = '.3'; next++; info.textContent = next > 25 ? '' : 'Find ' + next; if (next > 25) done(d, +((performance.now() - t0) / 1000).toFixed(1)); } } }, String(n))));
        s.append(tEl, info, grid);
      }
      function visual(d) {
        const s = frame(d); let level = 1;
        const round = () => { const size = Math.min(7, 3 + Math.floor((level - 1) / 3)); const k = Math.min(size * size - 2, 2 + level); const lit = new Set(); while (lit.size < k) lit.add(rnd(0, size * size - 1)); let found = 0, wrong = 0, open = false; s.innerHTML = '';
          const cells = []; const grid = h('div', { style: { display: 'grid', gridTemplateColumns: `repeat(${size},1fr)`, gap: '6px', width: 'min(100%,360px)' } }, Array.from({ length: size * size }, (_, i) => { const c = h('div', { style: { aspectRatio: '1', borderRadius: '8px', background: 'var(--panel2)', cursor: 'pointer', transition: 'background .15s' }, on: { click: () => { if (!open || c.dataset.done) return; c.dataset.done = 1; if (lit.has(i)) { c.style.background = 'var(--accent)'; if (++found === k) { open = false; level++; later(round, 500); } } else { c.style.background = '#e74c3c'; if (++wrong >= 3) { open = false; later(() => done(d, level - 1), 500); } } } } }); cells.push(c); return c; }));
          s.append(h('div.muted', `Level ${level} · remember ${k} tiles · 3 misses ends the game`), grid); lit.forEach((i) => (cells[i].style.background = 'var(--accent)'));
          later(() => { lit.forEach((i) => (cells[i].style.background = 'var(--panel2)')); open = true; }, 1000 + k * 120); };
        s.append(h('div.muted', 'Tiles light up briefly — tap the same ones.'), h('button.btn.primary', { on: { click: round } }, '▶ Start'));
      }
      home();
      return { unmount: clear };
    },
  });
})();
