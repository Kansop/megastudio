/* Typing Tutor: lessons with finger guide, timed tests (words / quotes / code), live WPM & accuracy, history chart,
   per-key error heatmap, and Word Rain arcade mode */
(function () {
  const { h } = MS;
  const ROWS = [['`1234567890-=', '~!@#$%^&*()_+'], ['qwertyuiop[]\\', 'QWERTYUIOP{}|'], ["asdfghjkl;'", 'ASDFGHJKL:"'], ['zxcvbnm,./', 'ZXCVBNM<>?']];
  const FINGER = {}; // key -> finger 0..7 (L pinky..R pinky)
  ['`1qaz', '2wsx', '3edc', '45rtfgvb', '67yuhjnm', '8ik,', '9ol.', "0-=p[]\\;'/"].forEach((s, f) => [...s].forEach((k) => (FINGER[k] = f)));
  const FCOL = ['#ff5d6c', '#ffb84f', '#3ddc97', '#2fa8ff', '#b07cff', '#33e0c8', '#ff4fa3', '#c6f26a'];
  const FNAME = ['left pinky', 'left ring', 'left middle', 'left index', 'right index', 'right middle', 'right ring', 'right pinky'];
  const COMMON = 'the be to of and a in that have it for not on with he as you do at this but his by from they we say her she or an will my one all would there their what so up out if about who get which go me when make can like time no just him know take people into year your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give day most us is was are were been has had did said each tell does set three air play small end put home read hand port large spell add land here must big high such follow act why ask men change went light kind off need house picture try again animal point mother world near build self earth father head stand own page should country found answer school grow study still learn plant cover food sun four between state keep eye never last let thought city tree cross farm hard start might story saw far sea draw left late run while press close night real life few north open seem together next white children begin got walk example ease paper group always music those both mark often letter until mile river car feet care second book carry took science eat room friend began idea fish mountain stop once base hear horse cut sure watch color face wood main enough plain girl usual young ready above ever red list though feel talk bird soon body dog family direct pose leave song measure door product black short numeral class wind question happen complete ship area half rock order fire south problem piece told knew pass since top whole king space heard best hour better true during hundred five remember step early hold west ground interest reach fast verb sing listen six table travel less morning ten simple several vowel toward war lay against pattern slow center love person money serve appear road map rain rule govern pull cold notice voice unit power town fine certain fly fall lead cry dark machine note wait plan figure star box noun field rest correct able pound done beauty drive stood contain front teach week final gave green oh quick develop ocean warm free minute strong special mind behind clear tail produce fact street inch multiply nothing course stay wheel full force blue object decide surface deep moon island foot system busy test record boat common gold possible plane stead dry wonder laugh thousand ago ran check game shape equate hot miss brought heat snow tire bring yes distant fill east paint language among'.split(' ');
  const QUOTES = ['The only way to do great work is to love what you do.', 'In the middle of every difficulty lies opportunity.', 'It always seems impossible until it is done.', 'Success is not final, failure is not fatal: it is the courage to continue that counts.', 'The best time to plant a tree was twenty years ago. The second best time is now.', 'Whether you think you can, or you think you cannot, you are right.', 'Do what you can, with what you have, where you are.', 'Simplicity is the ultimate sophistication.', 'Stay hungry, stay foolish.', 'The future belongs to those who believe in the beauty of their dreams.', 'You miss one hundred percent of the shots you do not take.', 'Life is what happens when you are busy making other plans.', 'Act as if what you do makes a difference. It does.', 'Happiness is not something ready made. It comes from your own actions.', 'Quality is not an act, it is a habit.'];
  const CODE = ['const sum = (a, b) => a + b;', 'for (let i = 0; i < 10; i++) { console.log(i); }', 'if (x > 0 && y < 10) return true;', 'function greet(name) { return `Hello, ${name}!`; }', 'const items = list.filter((x) => x.done).map((x) => x.id);', 'def square(n): return n * n', 'print("Hello, world!")', 'let total = prices.reduce((s, p) => s + p, 0);', 'while (queue.length) node = queue.shift();', 'import { useState } from "react";'];
  const LESSONS = [
    { n: 'Home row: f j', keys: 'fj ' }, { n: 'Home row: d k', keys: 'dkfj ' }, { n: 'Home row: s l', keys: 'sldkfj ' }, { n: 'Home row: a ;', keys: 'a;sldkfj ' }, { n: 'Home row: g h', keys: 'asdfghjkl; ' },
    { n: 'Top row: r u e i', keys: 'ruei asdfjkl ' }, { n: 'Top row: t y w o', keys: 'tywoeiru asdfghjkl ' }, { n: 'Top row: q p', keys: 'qwertyuiop asdfghjkl ' },
    { n: 'Bottom row: v m c', keys: 'vmc,asdfjkl rueiwo ' }, { n: 'Bottom row: b n x z', keys: 'bnxzvmc asdfghjkl qwertyuiop ' }, { n: 'Capitals', words: true, caps: true }, { n: 'Numbers', keys: '1234567890 ' }, { n: 'Punctuation', keys: '.,;:!?\'"-() asdfjkl ' }, { n: 'Real words', words: true },
  ];
  const genFromKeys = (keys, n = 40) => { const ks = keys.replace(/ /g, ''); const words = COMMON.filter((w) => [...w].every((c) => keys.includes(c))); const out = []; for (let i = 0; i < n; i++) { if (words.length > 8 && Math.random() < 0.6) out.push(words[Math.floor(Math.random() * words.length)]); else { const L = 2 + Math.floor(Math.random() * 4); let w = ''; for (let j = 0; j < L; j++) w += ks[Math.floor(Math.random() * ks.length)]; out.push(w); } } return out.join(' '); };
  const words = (n, caps) => Array.from({ length: n }, () => { let w = COMMON[Math.floor(Math.random() * 200)]; if (caps && Math.random() < 0.4) w = w[0].toUpperCase() + w.slice(1); return w; }).join(' ');

  MS.register({
    id: 'typing', name: 'Typing Tutor', icon: '⌨️', group: 'Productivity', desc: 'Learn touch typing, tests & Word Rain', keywords: 'typing tutor wpm speed test keyboard touch type practice lessons game',
    async mount(view) {
      const st = await MS.store('typing', () => ({ history: [], keyErr: {}, keyHit: {}, lessonDone: {}, best: 0, mode: 'test', len: 30 }));
      const wrap = h('div.pad.col', { style: { maxWidth: '980px', margin: '0 auto', gap: '14px' } }); view.append(wrap);
      let mode = st.data.mode || 'test', sub = 'words', len = st.data.len || 30, lessonI = 0, cleanup = null;
      const tabs = h('div.row', { style: { flexWrap: 'wrap' } });
      const renderTabs = () => { tabs.innerHTML = ''; [['test', '⏱ Speed test'], ['lessons', '🎓 Lessons'], ['rain', '🌧 Word Rain'], ['stats', '📈 Stats']].forEach(([k, l]) => tabs.append(h('button.btn', { class: mode === k ? 'on' : '', on: { click: () => { mode = k; st.data.mode = k; st.touch(); render(); } } }, l))); };
      const body = h('div.col', { style: { gap: '14px' } });
      wrap.append(tabs, body);
      function render() { if (cleanup) cleanup(); cleanup = null; renderTabs(); body.innerHTML = ''; if (mode === 'test') testUI(); else if (mode === 'lessons') lessonsUI(); else if (mode === 'rain') rainUI(); else statsUI(); }

      /* ---------- keyboard ---------- */
      function keyboard() {
        const el = h('div.col', { style: { gap: '5px', alignItems: 'center', userSelect: 'none' } }); const keys = {};
        ROWS.forEach(([lo], ri) => { const row = h('div.row', { style: { gap: '4px', marginLeft: ri * 14 + 'px' } }); [...lo].forEach((k) => { const f = FINGER[k]; const b = h('div', { style: { width: 'min(38px, calc((100vw - 40px) / 16.5))', height: 'min(38px, calc((100vw - 40px) / 16.5))', borderRadius: '8px', display: 'grid', placeItems: 'center', fontFamily: 'var(--mono)', fontSize: '14px', background: 'var(--panel2)', border: '1px solid var(--line)', borderBottom: `3px solid ${FCOL[f] ?? 'var(--line)'}`, transition: 'transform .05s, background .1s' } }, k.toUpperCase()); keys[k] = b; row.append(b); }); el.append(row); });
        const space = h('div', { style: { width: 'min(260px, 60vw)', height: '34px', borderRadius: '8px', background: 'var(--panel2)', border: '1px solid var(--line)', borderBottom: '3px solid var(--muted)' } }); keys[' '] = space; el.append(space);
        const hint = h('div.small.muted', { style: { minHeight: '18px' } }); el.append(hint);
        let lit = null;
        const lower = (c) => { for (const [lo, up] of ROWS) { const i = up.indexOf(c); if (i >= 0) return lo[i]; } return c.toLowerCase(); };
        return { el, show(c) { if (lit) { lit.style.background = 'var(--panel2)'; lit.style.color = ''; } if (c == null) return; const k = lower(c); const b = keys[k]; if (b) { b.style.background = FCOL[FINGER[k]] ?? 'var(--accent)'; b.style.color = '#fff'; lit = b; } hint.textContent = c === ' ' ? 'Space — thumb' : (FINGER[k] != null ? `“${c}” — ${FNAME[FINGER[k]]}` : '') + (c !== k ? ' + Shift (other hand)' : ''); }, press(c) { const b = keys[lower(c)]; if (b) { b.style.transform = 'translateY(2px)'; setTimeout(() => (b.style.transform = ''), 80); } } };
      }

      /* ---------- core typing surface ---------- */
      function typer(text, { timeLimit = 0, onDone, showKb = true, title } = {}) {
        const box = h('div.card', { tabIndex: 0, style: { fontFamily: 'var(--mono)', fontSize: '24px', lineHeight: 1.7, outline: 'none', cursor: 'text', minHeight: '140px', maxHeight: '260px', overflow: 'hidden', position: 'relative', letterSpacing: '.3px' } });
        const stats = h('div.row', { style: { gap: '22px', fontSize: '15px', flexWrap: 'wrap' } }); const wpmEl = h('strong', '0'), accEl = h('strong', '100%'), timeEl = h('strong', timeLimit ? timeLimit + 's' : '0s'), progEl = h('span.muted');
        stats.append(h('span', '⚡ ', wpmEl, ' wpm'), h('span', '🎯 ', accEl), h('span', '⏱ ', timeEl), progEl, h('div.spacer'), h('span.small.muted', 'Tab = restart · Esc = pause'));
        const kb = showKb ? keyboard() : null;
        const spans = [...text].map((c) => h('span', { style: { color: 'var(--muted)', borderRadius: '3px' } }, c === ' ' ? ' ' : c));
        const inner = h('div', { style: { transition: 'transform .15s' } }, spans); box.append(inner);
        const hidden = h('input', { autocapitalize: 'off', autocomplete: 'off', spellcheck: false, style: { position: 'absolute', opacity: 0, width: '1px', height: '1px', left: 0, top: 0 } }); box.append(hidden);
        let i = 0, errs = 0, typed = 0, t0 = 0, done = false, timer = 0; const errAt = new Set();
        const caret = () => { spans.forEach((s) => (s.style.boxShadow = '')); if (spans[i]) { spans[i].style.boxShadow = 'inset 0 -3px 0 var(--accent)'; const top = spans[i].offsetTop; inner.style.transform = `translateY(${-Math.max(0, top - 50)}px)`; } kb && kb.show(text[i]); };
        const elapsed = () => (t0 ? (performance.now() - t0) / 1000 : 0);
        const upd = () => { const s = elapsed(); const correct = i - errAt.size; wpmEl.textContent = s > 1 ? Math.round((i / 5 / s) * 60) : 0; accEl.textContent = typed ? Math.round(((typed - errs) / typed) * 100) + '%' : '100%'; timeEl.textContent = timeLimit ? Math.max(0, Math.ceil(timeLimit - s)) + 's' : Math.floor(s) + 's'; progEl.textContent = Math.round((i / text.length) * 100) + '%'; if (timeLimit && s >= timeLimit) finish(); };
        function finish() { if (done) return; done = true; clearInterval(timer); const s = Math.max(1, elapsed()); const wpm = Math.round((Math.max(0, i - errAt.size) / 5 / s) * 60); const raw = Math.round((i / 5 / s) * 60); const acc = typed ? Math.round(((typed - errs) / typed) * 100) : 100; kb && kb.show(null); onDone && onDone({ wpm, raw, acc, secs: Math.round(s), chars: i }); }
        function key(c) {
          if (done) return; if (!t0) { t0 = performance.now(); timer = setInterval(upd, 200); }
          kb && kb.press(c); typed++; const want = text[i]; const k = want.toLowerCase();
          st.data.keyHit[k] = (st.data.keyHit[k] || 0) + 1;
          if (c === want) { spans[i].style.color = errAt.has(i) ? 'var(--warn)' : 'var(--text)'; spans[i].style.background = ''; i++; }
          else { errs++; errAt.add(i); st.data.keyErr[k] = (st.data.keyErr[k] || 0) + 1; spans[i].style.background = 'color-mix(in srgb, var(--bad) 35%, transparent)'; spans[i].style.color = 'var(--bad)'; box.animate([{ transform: 'translateX(-3px)' }, { transform: 'translateX(3px)' }, { transform: 'none' }], { duration: 120 }); }
          caret(); upd(); if (i >= text.length) finish();
        }
        function back() { if (done || i === 0) return; i--; spans[i].style.color = 'var(--muted)'; spans[i].style.background = ''; caret(); }
        const kd = (e) => { if (e.key === 'Tab') { e.preventDefault(); render(); return; } if (e.key === 'Escape') { box.blur(); return; } if (e.ctrlKey || e.metaKey || e.altKey) return; if (e.key === 'Backspace') { e.preventDefault(); back(); return; } if (e.key.length === 1) { e.preventDefault(); key(e.key); } };
        box.addEventListener('keydown', kd);
        hidden.addEventListener('input', () => { const v = hidden.value; hidden.value = ''; [...v].forEach(key); });
        box.addEventListener('click', () => { if (matchMedia('(pointer:coarse)').matches) hidden.focus(); else box.focus(); });
        const focusNote = h('div.small.muted', { style: { textAlign: 'center' } }, 'Click the text and start typing — the timer starts on your first key.');
        box.addEventListener('focus', () => (focusNote.style.visibility = 'hidden')); box.addEventListener('blur', () => (focusNote.style.visibility = 'visible'));
        caret(); setTimeout(() => box.focus(), 30);
        return { el: h('div.col', { style: { gap: '10px' } }, title ? h('strong', title) : null, stats, box, focusNote, kb && kb.el), stop: () => clearInterval(timer) };
      }
      function resultCard(r, again, extra) {
        const best = r.wpm > (st.data.best || 0); if (best) { st.data.best = r.wpm; MS.toast('🏆 New personal best: ' + r.wpm + ' WPM', 'good'); }
        const big = (v, l, c) => h('div', { style: { textAlign: 'center' } }, h('div', { style: { fontSize: '44px', fontWeight: 800, color: c } }, v), h('div.muted', l));
        return h('div.card.col', { style: { gap: '16px', alignItems: 'center' } }, h('div.row', { style: { gap: '40px', flexWrap: 'wrap', justifyContent: 'center' } }, big(r.wpm, 'WPM', 'var(--accent)'), big(r.acc + '%', 'accuracy', r.acc >= 95 ? 'var(--good)' : 'var(--warn)'), big(r.raw, 'raw WPM'), big(r.secs + 's', 'time')), best ? h('div', '🏆 Personal best!') : null, extra, h('div.row', h('button.btn.primary', { on: { click: again } }, '↻ Try again'), h('button.btn', { on: { click: () => { mode = 'stats'; render(); } } }, '📈 Stats')));
      }
      /* ---------- speed test ---------- */
      function testUI() {
        const opts = h('div.row', { style: { flexWrap: 'wrap' } });
        [['words', 'Words'], ['quotes', 'Quotes'], ['code', 'Code']].forEach(([k, l]) => opts.append(h('button.btn.sm', { class: sub === k ? 'on' : '', on: { click: () => { sub = k; render(); } } }, l)));
        opts.append(h('span.muted', '·')); [15, 30, 60, 120].forEach((s) => opts.append(h('button.btn.sm', { class: len === s ? 'on' : '', on: { click: () => { len = s; st.data.len = s; st.touch(); render(); } } }, s + 's')));
        opts.append(h('div.spacer'), h('span.small.muted', 'Best: ', h('strong', (st.data.best || 0) + ' WPM')));
        const text = sub === 'words' ? words(200) : sub === 'quotes' ? Array.from({ length: 8 }, () => QUOTES[Math.floor(Math.random() * QUOTES.length)]).join(' ') : Array.from({ length: 10 }, () => CODE[Math.floor(Math.random() * CODE.length)]).join(' ');
        const t = typer(text, { timeLimit: len, onDone: (r) => { st.data.history.push({ t: Date.now(), ...r, mode: sub, len }); st.data.history = st.data.history.slice(-300); st.touch(); body.innerHTML = ''; renderTabs(); body.append(opts, resultCard(r, render)); } });
        cleanup = t.stop; body.append(opts, t.el);
      }
      /* ---------- lessons ---------- */
      function lessonsUI() {
        const grid = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '8px' } });
        LESSONS.forEach((L, k) => { const d = st.data.lessonDone[k]; grid.append(h('button.card', { style: { cursor: 'pointer', textAlign: 'left', padding: '12px', borderColor: k === lessonI ? 'var(--accent)' : '' }, on: { click: () => { lessonI = k; render(); } } }, h('div.row', h('strong', (k + 1) + '. ' + L.n), h('div.spacer'), d ? h('span', d.stars) : null), h('div.small.muted', d ? `${d.wpm} wpm · ${d.acc}%` : 'not started'))); });
        const L = LESSONS[lessonI]; const text = L.words ? words(30, L.caps) : genFromKeys(L.keys, 28);
        const t = typer(text, { title: `Lesson ${lessonI + 1}: ${L.n}`, onDone: (r) => { const stars = r.acc >= 97 && r.wpm >= 30 ? '⭐⭐⭐' : r.acc >= 92 ? '⭐⭐' : '⭐'; const prev = st.data.lessonDone[lessonI]; if (!prev || r.wpm > prev.wpm) st.data.lessonDone[lessonI] = { wpm: r.wpm, acc: r.acc, stars }; st.data.history.push({ t: Date.now(), ...r, mode: 'lesson' }); st.touch(); body.innerHTML = ''; renderTabs(); body.append(resultCard(r, render, h('div', { style: { fontSize: '28px' } }, stars)), lessonI < LESSONS.length - 1 ? h('button.btn.primary', { style: { alignSelf: 'center' }, on: { click: () => { lessonI++; render(); } } }, 'Next lesson →') : null); } });
        cleanup = t.stop; body.append(t.el, h('details', h('summary', '📚 All lessons'), grid));
      }
      /* ---------- word rain ---------- */
      function rainUI() {
        const cv = h('canvas', { width: 900, height: 480, style: { width: '100%', maxWidth: '900px', aspectRatio: '900/480', borderRadius: '14px', background: 'linear-gradient(#0b1030,#1b0f3a)', alignSelf: 'center' } });
        const input = h('input.input.mono', { placeholder: 'type the falling words…', autocapitalize: 'off', autocomplete: 'off', spellcheck: false, style: { fontSize: '20px', textAlign: 'center', alignSelf: 'center', width: 'min(420px, 100%)' } });
        const g = cv.getContext('2d'); let W = [], score = 0, lives = 5, lvl = 1, spawnT = 0, over = false, typedWords = 0, t0 = performance.now(), raf, last = performance.now(), parts = [];
        const best = () => st.data.rainBest || 0;
        input.addEventListener('input', () => { const v = input.value.trim(); const hit = W.find((w) => w.w === v); if (hit) { W = W.filter((w) => w !== hit); score += hit.w.length * 10 * lvl; typedWords++; input.value = ''; for (let k = 0; k < 14; k++) parts.push({ x: hit.x, y: hit.y, vx: (Math.random() - 0.5) * 240, vy: (Math.random() - 0.5) * 240, l: 0.6 }); if (typedWords % 10 === 0) lvl++; } });
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && over) restart(); });
        const restart = () => { W = []; score = 0; lives = 5; lvl = 1; over = false; typedWords = 0; t0 = performance.now(); input.value = ''; input.focus(); };
        const loop = (now) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; raf = requestAnimationFrame(loop);
          if (!over) { spawnT -= dt; if (spawnT <= 0) { spawnT = Math.max(0.55, 2.2 - lvl * 0.18); const pool = COMMON.filter((w) => w.length <= 3 + lvl); const w = pool[Math.floor(Math.random() * pool.length)]; g.font = 'bold 22px ' + 'monospace'; W.push({ w, x: 40 + Math.random() * 760, y: -10, v: 30 + lvl * 9 + Math.random() * 20 }); }
            W.forEach((w) => (w.y += w.v * dt)); const lost = W.filter((w) => w.y > 470); if (lost.length) { lives -= lost.length; W = W.filter((w) => w.y <= 470); if (lives <= 0) { over = true; if (score > best()) { st.data.rainBest = score; st.touch(); MS.toast('🏆 Word Rain best: ' + score, 'good'); } MS.arcade && MS.arcade.report('Word Rain', score); } } }
          g.clearRect(0, 0, 900, 480); g.fillStyle = 'rgba(255,255,255,.5)'; for (let k = 0; k < 60; k++) g.fillRect((k * 137) % 900, (k * 71 + now / 30) % 480, 1, 6);
          const v = input.value.trim(); g.font = 'bold 22px monospace'; g.textAlign = 'center';
          W.forEach((w) => { const m = v && w.w.startsWith(v); const tw = g.measureText(w.w).width; g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(w.x - tw / 2 - 8, w.y - 20, tw + 16, 30); g.fillStyle = m ? '#3ddc97' : '#fff'; g.fillText(w.w, w.x, w.y); if (m) { g.fillStyle = '#ffd23f'; g.textAlign = 'left'; g.fillText(v, w.x - tw / 2, w.y); g.textAlign = 'center'; } });
          parts.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.l -= dt; g.fillStyle = `rgba(124,220,255,${Math.max(0, p.l * 1.6)})`; g.fillRect(p.x, p.y, 3, 3); }); parts = parts.filter((p) => p.l > 0);
          g.textAlign = 'left'; g.font = 'bold 16px system-ui'; g.fillStyle = '#fff'; g.fillText(`Score ${score}   Level ${lvl}   ${'❤️'.repeat(Math.max(0, lives))}   Best ${best()}`, 14, 26);
          const mins = (performance.now() - t0) / 60000; g.textAlign = 'right'; g.fillText(Math.round(typedWords / Math.max(mins, 0.1)) + ' words/min', 886, 26);
          if (over) { g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 0, 900, 480); g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = 'bold 40px system-ui'; g.fillText('Game over', 450, 220); g.font = '18px system-ui'; g.fillText(`Score ${score} · press Enter to play again`, 450, 260); }
          g.textAlign = 'left'; };
        raf = requestAnimationFrame(loop); cleanup = () => cancelAnimationFrame(raf);
        body.append(h('div.small.muted', { style: { textAlign: 'center' } }, 'Type a falling word before it hits the ground. Every 10 words the rain speeds up.'), cv, input); setTimeout(() => input.focus(), 30);
      }
      /* ---------- stats ---------- */
      function statsUI() {
        const hs = st.data.history; const tests = hs.filter((x) => x.mode !== 'lesson');
        const avg = (a, k) => (a.length ? Math.round(a.reduce((s, x) => s + x[k], 0) / a.length) : 0);
        const card = (v, l) => h('div.card', { style: { textAlign: 'center', flex: '1', minWidth: '120px' } }, h('div', { style: { fontSize: '30px', fontWeight: 800 } }, v), h('div.muted.small', l));
        body.append(h('div.row', { style: { flexWrap: 'wrap', gap: '10px' } }, card(st.data.best || 0, 'best WPM'), card(avg(tests.slice(-10), 'wpm'), 'avg WPM (last 10)'), card(avg(tests.slice(-10), 'acc') + '%', 'avg accuracy'), card(hs.length, 'sessions'), card(Math.round(hs.reduce((s, x) => s + (x.secs || 0), 0) / 60) + 'm', 'time practiced')));
        // chart
        const cv = h('canvas', { width: 900, height: 220, style: { width: '100%', height: '220px' } }); const g = cv.getContext('2d');
        body.append(h('div.card', h('strong', 'WPM over time'), cv));
        requestAnimationFrame(() => { const W = cv.clientWidth, H = 220; cv.width = W * devicePixelRatio; cv.height = H * devicePixelRatio; g.scale(devicePixelRatio, devicePixelRatio); const pts = tests.slice(-60); const css = getComputedStyle(view); if (!pts.length) { g.fillStyle = css.getPropertyValue('--muted'); g.font = '14px system-ui'; g.fillText('Take a speed test to see your progress here.', 20, 110); return; } const mx = Math.max(40, ...pts.map((p) => p.wpm)) * 1.1; g.strokeStyle = css.getPropertyValue('--line'); g.beginPath(); for (let k = 0; k <= 4; k++) { const y = 10 + ((H - 30) * k) / 4; g.moveTo(30, y); g.lineTo(W, y); g.fillStyle = css.getPropertyValue('--muted'); g.font = '10px system-ui'; g.fillText(Math.round(mx - (mx * k) / 4), 2, y + 3); } g.stroke(); g.strokeStyle = css.getPropertyValue('--accent'); g.lineWidth = 2.5; g.beginPath(); pts.forEach((p, k) => { const x = 30 + ((W - 40) * k) / Math.max(1, pts.length - 1), y = 10 + (H - 30) * (1 - p.wpm / mx); k ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); pts.forEach((p, k) => { const x = 30 + ((W - 40) * k) / Math.max(1, pts.length - 1), y = 10 + (H - 30) * (1 - p.wpm / mx); g.fillStyle = p.acc >= 95 ? css.getPropertyValue('--good') : css.getPropertyValue('--warn'); g.beginPath(); g.arc(x, y, 3.5, 0, 7); g.fill(); }); });
        // heatmap
        const kb = h('div.col', { style: { gap: '5px', alignItems: 'center' } });
        ROWS.forEach(([lo], ri) => kb.append(h('div.row', { style: { gap: '4px', marginLeft: ri * 14 + 'px' } }, [...lo].map((k) => { const hit = st.data.keyHit[k] || 0, err = st.data.keyErr[k] || 0; const rate = hit ? err / hit : 0; return h('div', { title: `${k}: ${err} errors / ${hit} presses`, style: { width: 'min(38px, calc((100vw - 40px) / 16.5))', height: 'min(38px, calc((100vw - 40px) / 16.5))', borderRadius: '8px', display: 'grid', placeItems: 'center', fontFamily: 'var(--mono)', background: hit ? `color-mix(in srgb, var(--bad) ${Math.round(Math.min(1, rate * 5) * 100)}%, var(--panel2))` : 'var(--panel2)', border: '1px solid var(--line)' } }, k.toUpperCase()); }))));
        const worst = Object.keys(st.data.keyHit).filter((k) => st.data.keyHit[k] > 4 && k.trim()).sort((a, b) => st.data.keyErr[b] / st.data.keyHit[b] - (st.data.keyErr[a] || 0) / st.data.keyHit[a] || 0).slice(0, 6).filter((k) => st.data.keyErr[k]);
        body.append(h('div.card.col', { style: { gap: '10px' } }, h('strong', '🔥 Error heatmap'), kb, worst.length ? h('div.row', { style: { flexWrap: 'wrap' } }, h('span.muted', 'Trickiest keys:'), worst.map((k) => h('span.tag', k)), h('button.btn.sm', { on: { click: () => { LESSONS.push({ n: 'Drill: ' + worst.join(' '), keys: worst.join('') + 'asdfjkl ' }); lessonI = LESSONS.length - 1; mode = 'lessons'; render(); } } }, '🎯 Drill these')) : null,
          h('button.btn.sm.danger', { style: { alignSelf: 'flex-start' }, on: { click: async () => { if (await MS.confirm('Reset all typing stats?')) { Object.assign(st.data, { history: [], keyErr: {}, keyHit: {}, lessonDone: {}, best: 0 }); st.touch(); render(); } } } }, 'Reset stats')));
      }
      render();
      return { unmount: () => cleanup && cleanup() };
    },
  });
})();
