/* Journal: daily entries with mood, activities, sleep and gratitude; Year in Pixels, mood trends,
   activity/mood correlations, writing prompts, search and Markdown export */
(function () {
  const { h } = MS;
  const MOODS = [['😞', 'Awful', '#ef4444'], ['🙁', 'Meh', '#f97316'], ['😐', 'Okay', '#eab308'], ['🙂', 'Good', '#84cc16'], ['😄', 'Great', '#22c55e']];
  const ACTS = ['🏃 Exercise', '📚 Reading', '👥 Friends', '👪 Family', '💼 Work', '🎮 Gaming', '🎨 Creative', '🌳 Outdoors', '🧘 Meditation', '🍔 Junk food', '🥗 Ate well', '📺 TV', '✈️ Travel', '😴 Nap', '☕ Coffee', '🎵 Music'];
  const PROMPTS = ['What made you smile today?', 'What is one thing you learned this week?', 'Describe a small win from today.', 'What are you looking forward to tomorrow?', 'Who made a difference to your day, and how?', 'What drained your energy today? What restored it?', 'If today had a title, what would it be?', 'What would you tell yourself from a year ago?', 'What is something you are proud of lately?', 'Describe your perfect weekend.', 'What is a worry you can let go of?', 'What did you notice today that you usually overlook?', 'Which habit do you want to build next, and why?', 'Write about a place that makes you feel calm.', 'What is a question you keep thinking about?'];
  const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parse = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d, 12); };
  const nice = (k, o = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) => parse(k).toLocaleDateString(undefined, o);

  MS.register({
    id: 'journal', name: 'Journal', icon: '📔', group: 'Productivity', desc: 'Daily journal with mood tracking & insights', keywords: 'journal diary mood tracker gratitude reflection year in pixels feelings writing prompts',
    async mount(view, args) {
      const st = await MS.store('journal', () => ({ entries: {}, tab: 'write' }));
      const D = st.data; const save = () => st.touch();
      let cur = key(new Date()); let q = '';
      const wrap = h('div.pad.col', { style: { gap: '14px', maxWidth: '1000px', margin: '0 auto' } }); view.append(wrap);
      const tabsEl = h('div.row', { style: { flexWrap: 'wrap' } }); const body = h('div.col', { style: { gap: '14px' } }); wrap.append(tabsEl, body);
      const TABS = [['write', '✍️ Today'], ['pixels', '🟩 Year in pixels'], ['insights', '📊 Insights'], ['browse', '🔎 Entries']];
      const entry = (k) => D.entries[k] || { mood: null, acts: [], sleep: null, grat: ['', '', ''], text: '', prompt: null };
      const keys = () => Object.keys(D.entries).filter((k) => { const e = D.entries[k]; return e.mood != null || e.text.trim() || e.grat.some(Boolean) || e.acts.length; }).sort();
      function streak() { let n = 0; const d = new Date(); if (!keys().includes(key(d))) d.setDate(d.getDate() - 1); const ks = new Set(keys()); while (ks.has(key(d))) { n++; d.setDate(d.getDate() - 1); } return n; }
      function render() { tabsEl.innerHTML = ''; TABS.forEach(([k, l]) => tabsEl.append(h('button.btn', { class: D.tab === k ? 'on' : '', on: { click: () => { D.tab = k; save(); render(); } } }, l))); tabsEl.append(h('div.spacer'), h('span.small.muted', `🔥 ${streak()}-day streak · ${keys().length} entries`)); body.innerHTML = ''; ({ write, pixels, insights, browse })[D.tab](); }
      MS.setActions(h('button.btn.sm', { on: { click: exportMd } }, '⬇ Export'));

      /* ---------- write ---------- */
      function write() {
        const e = entry(cur); const commit = () => { D.entries[cur] = e; save(); };
        const shift = (n) => { const d = parse(cur); d.setDate(d.getDate() + n); if (d > new Date()) return; cur = key(d); render(); };
        const dateIn = h('input.input', { type: 'date', value: cur, max: key(new Date()), on: { change: () => { if (dateIn.value) { cur = dateIn.value; render(); } } } });
        const moodRow = h('div.row', { style: { gap: '8px', flexWrap: 'wrap', justifyContent: 'center' } }, MOODS.map(([em, name, col], i) => h('button.btn', { style: { flexDirection: 'column', padding: '8px 10px', minWidth: '58px', border: e.mood === i ? `2px solid ${col}` : '', background: e.mood === i ? col + '22' : '' }, on: { click: () => { e.mood = e.mood === i ? null : i; commit(); render(); } } }, h('div', { style: { fontSize: '34px', lineHeight: 1.1 } }, em), h('div.small', name))));
        const acts = h('div.row', { style: { flexWrap: 'wrap', gap: '6px' } }, ACTS.map((a) => h('button.btn.sm', { class: e.acts.includes(a) ? 'on' : '', on: { click: () => { e.acts = e.acts.includes(a) ? e.acts.filter((x) => x !== a) : [...e.acts, a]; commit(); render(); } } }, a)));
        const sleep = h('input', { type: 'range', min: 0, max: 12, step: 0.5, value: e.sleep ?? 7, style: { flex: 1 } }); const sv = h('b', e.sleep == null ? '—' : e.sleep + ' h');
        sleep.oninput = () => { e.sleep = +sleep.value; sv.textContent = e.sleep + ' h'; commit(); };
        const grat = e.grat.map((g, i) => h('input.input', { placeholder: ['Something good that happened…', 'Someone I appreciate…', 'A small pleasure…'][i], value: g, on: { input: (ev) => { e.grat[i] = ev.target.value; commit(); } } }));
        const prompt = h('div.small', { style: { fontStyle: 'italic', color: 'var(--accent)' } }, e.prompt || '');
        const ta = h('textarea.input', { rows: 12, placeholder: 'Write freely… (Markdown welcome)', style: { width: '100%', fontSize: '15px', lineHeight: 1.6, fontFamily: 'inherit', resize: 'vertical' } }, e.text);
        const wc = h('span.small.muted'); const upd = () => { const n = (ta.value.match(/\S+/g) || []).length; wc.textContent = n + ' words'; }; upd();
        let tmo; ta.oninput = () => { e.text = ta.value; upd(); clearTimeout(tmo); tmo = setTimeout(commit, 300); };
        const past = [1, 7, 30, 365].map((n) => { const d = parse(cur); d.setDate(d.getDate() - n); const k = key(d); const p = D.entries[k]; return p && (p.text.trim() || p.mood != null) ? h('div.card', { style: { padding: '10px', cursor: 'pointer' }, on: { click: () => { cur = k; render(); } } }, h('div.small.muted', (n === 1 ? 'Yesterday' : n === 7 ? 'A week ago' : n === 30 ? 'A month ago' : 'A year ago') + ' ' + (p.mood != null ? MOODS[p.mood][0] : '')), h('div.small', (p.text.trim() || p.grat.filter(Boolean).join(' · ')).slice(0, 140) || '—')) : null; }).filter(Boolean);
        body.append(
          h('div.row', { style: { flexWrap: 'wrap' } }, h('button.btn', { on: { click: () => shift(-1) } }, '‹'), dateIn, h('button.btn', { disabled: cur >= key(new Date()), on: { click: () => shift(1) } }, '›'), cur !== key(new Date()) ? h('button.btn.sm', { on: { click: () => { cur = key(new Date()); render(); } } }, 'Today') : null, h('h3', { style: { margin: '0 0 0 8px' } }, nice(cur))),
          h('div.card.col', { style: { gap: '10px', alignItems: 'center' } }, h('b', 'How was your day?'), moodRow),
          h('div.jr-cols', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' } },
            h('div.card.col', { style: { gap: '8px' } }, h('b', 'What did you do?'), acts, h('div.row', { style: { marginTop: '6px' } }, h('span.small.muted', '😴 Sleep'), sleep, sv)),
            h('div.card.col', { style: { gap: '8px' } }, h('b', '🙏 Three good things'), ...grat)),
          h('div.card.col', { style: { gap: '8px' } }, h('div.row', h('b', 'Journal'), h('div.spacer'), wc, h('button.btn.sm', { on: { click: () => { e.prompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)]; commit(); prompt.textContent = e.prompt; } } }, '💡 Prompt me')), prompt, ta),
          past.length ? h('div.col', { style: { gap: '8px' } }, h('b.small.muted', 'ON THIS DAY & RECENTLY'), h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: '10px' } }, ...past)) : null);
      }

      /* ---------- year in pixels ---------- */
      let year = new Date().getFullYear();
      function pixels() {
        const cell = 'clamp(12px, 2.4vw, 22px)';
        const grid = h('div', { style: { display: 'grid', gridTemplateColumns: `28px repeat(12, ${cell})`, gap: '3px', justifyContent: 'center' } });
        grid.append(h('div'), ...'JFMAMJJASOND'.split('').map((m) => h('div.small.muted', { style: { textAlign: 'center' } }, m)));
        const counts = [0, 0, 0, 0, 0];
        for (let d = 1; d <= 31; d++) { grid.append(h('div.small.muted', { style: { textAlign: 'right', paddingRight: '4px', fontSize: '10px', lineHeight: cell } }, d)); for (let m = 0; m < 12; m++) { const dt = new Date(year, m, d, 12); if (dt.getMonth() !== m) { grid.append(h('div')); continue; } const k = key(dt); const e = D.entries[k]; const mood = e?.mood; if (mood != null) counts[mood]++; const future = dt > new Date(); grid.append(h('div', { title: nice(k) + (mood != null ? ' — ' + MOODS[mood][1] : ''), style: { height: cell, borderRadius: '4px', background: mood != null ? MOODS[mood][2] : future ? 'transparent' : 'var(--panel2)', border: future ? '1px dashed var(--line)' : '1px solid var(--line)', cursor: future ? 'default' : 'pointer', outline: k === key(new Date()) ? '2px solid var(--accent)' : '' }, on: { click: () => { if (future) return; cur = k; D.tab = 'write'; save(); render(); } } })); } }
        const total = counts.reduce((a, b) => a + b, 0);
        body.append(h('div.row', { style: { justifyContent: 'center' } }, h('button.btn', { on: { click: () => { year--; render(); } } }, '‹'), h('h2', { style: { margin: '0 12px' } }, String(year)), h('button.btn', { disabled: year >= new Date().getFullYear(), on: { click: () => { year++; render(); } } }, '›')),
          h('div.card', { style: { overflowX: 'auto' } }, grid),
          h('div.row', { style: { justifyContent: 'center', flexWrap: 'wrap', gap: '14px' } }, MOODS.map(([em, n, c], i) => h('div.row', { style: { gap: '6px' } }, h('span', { style: { width: '14px', height: '14px', borderRadius: '3px', background: c, display: 'inline-block' } }), h('span.small', `${em} ${n} · ${counts[i]}${total ? ' (' + Math.round(counts[i] / total * 100) + '%)' : ''}`)))));
      }

      /* ---------- insights ---------- */
      function insights() {
        const ks = keys(); const withMood = ks.filter((k) => D.entries[k].mood != null);
        if (withMood.length < 3) { body.append(h('div.empty', 'Log your mood on at least 3 days to unlock insights.'), h('button.btn', { style: { alignSelf: 'center' }, on: { click: demo } }, '✨ Fill 60 days of sample data')); return; }
        const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
        const allAvg = avg(withMood.map((k) => D.entries[k].mood));
        const cv = h('canvas', { width: 900, height: 220, style: { width: '100%', height: '220px' } });
        const words = ks.reduce((a, k) => a + (D.entries[k].text.match(/\S+/g) || []).length, 0);
        const stats = [['Entries', ks.length], ['Avg mood', MOODS[Math.round(allAvg)][0] + ' ' + (allAvg + 1).toFixed(1) + '/5'], ['Current streak', streak() + ' days'], ['Words written', words.toLocaleString()]];
        const corr = ACTS.map((a) => { const w = withMood.filter((k) => D.entries[k].acts.includes(a)).map((k) => D.entries[k].mood); const wo = withMood.filter((k) => !D.entries[k].acts.includes(a)).map((k) => D.entries[k].mood); return w.length >= 2 && wo.length >= 1 ? { a, n: w.length, d: avg(w) - avg(wo) } : null; }).filter(Boolean).sort((x, y) => y.d - x.d);
        const maxD = Math.max(0.5, ...corr.map((c) => Math.abs(c.d)));
        const sleepPts = withMood.filter((k) => D.entries[k].sleep != null).map((k) => [D.entries[k].sleep, D.entries[k].mood]);
        const dow = [0, 1, 2, 3, 4, 5, 6].map((i) => { const a = withMood.filter((k) => parse(k).getDay() === i).map((k) => D.entries[k].mood); return a.length ? avg(a) : null; });
        body.append(h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '10px' } }, stats.map(([l, v]) => h('div.card', h('div.small.muted', l), h('div', { style: { fontSize: '22px', fontWeight: 700 } }, String(v))))),
          h('div.card.col', h('b', 'Mood over the last 60 days'), cv),
          h('div.jr-cols', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' } },
            h('div.card.col', { style: { gap: '6px' } }, h('b', 'What lifts your mood'), h('div.small.muted', 'Average mood on days with vs. without each activity'), ...corr.map((c) => h('div.row', { style: { gap: '8px' } }, h('span.small', { style: { width: '120px', flexShrink: 0 } }, c.a), h('div', { style: { flex: 1, position: 'relative', height: '14px', background: 'var(--panel2)', borderRadius: '7px' } }, h('div', { style: { position: 'absolute', top: 0, bottom: 0, left: c.d >= 0 ? '50%' : 50 - (-c.d / maxD) * 50 + '%', width: (Math.abs(c.d) / maxD) * 50 + '%', background: c.d >= 0 ? 'var(--good)' : 'var(--bad)', borderRadius: '7px' } })), h('span.small.mono', { style: { width: '44px', textAlign: 'right' } }, (c.d >= 0 ? '+' : '') + c.d.toFixed(1)))), corr.length ? null : h('div.small.muted', 'Tag activities to see patterns.')),
            h('div.card.col', { style: { gap: '10px' } }, h('b', 'Mood by weekday'), h('div.row', { style: { alignItems: 'flex-end', height: '120px', gap: '6px' } }, ...[1, 2, 3, 4, 5, 6, 0].map((i) => h('div.col', { style: { flex: 1, alignItems: 'center', gap: '4px' } }, h('span', { style: { fontSize: '16px' } }, dow[i] == null ? '' : MOODS[Math.round(dow[i])][0]), h('div', { style: { width: '100%', height: (dow[i] == null ? 0 : 12 + dow[i] * 18) + 'px', background: dow[i] == null ? 'transparent' : MOODS[Math.round(dow[i])][2], borderRadius: '6px 6px 2px 2px' } }), h('span.small.muted', 'MTWTFSS'[(i + 6) % 7])))),
              sleepPts.length >= 3 ? h('div.small', (() => { const good = sleepPts.filter((p) => p[0] >= 7).map((p) => p[1]), bad = sleepPts.filter((p) => p[0] < 7).map((p) => p[1]); return good.length && bad.length ? `😴 With 7+ hours of sleep your mood averages ${(avg(good) + 1).toFixed(1)}/5, vs ${(avg(bad) + 1).toFixed(1)}/5 on shorter nights.` : `😴 Average sleep: ${avg(sleepPts.map((p) => p[0])).toFixed(1)} h`; })()) : null)));
        requestAnimationFrame(() => { const g = cv.getContext('2d'); const css = getComputedStyle(view); const W = 900, H = 220, P = 30; g.clearRect(0, 0, W, H); g.font = '18px system-ui'; g.textBaseline = 'middle';
          for (let m = 0; m < 5; m++) { const y = H - P - m * (H - 2 * P) / 4; g.strokeStyle = css.getPropertyValue('--line'); g.beginPath(); g.moveTo(P, y); g.lineTo(W - 6, y); g.stroke(); g.fillText(MOODS[m][0], 2, y); }
          const pts = []; for (let i = 59; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const e = D.entries[key(d)]; if (e?.mood != null) pts.push([P + (59 - i) / 59 * (W - P - 10), H - P - e.mood * (H - 2 * P) / 4, e.mood]); }
          const grd = g.createLinearGradient(0, P, 0, H - P); grd.addColorStop(0, '#22c55e'); grd.addColorStop(0.5, '#eab308'); grd.addColorStop(1, '#ef4444');
          g.strokeStyle = grd; g.lineWidth = 3; g.lineJoin = 'round'; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
          pts.forEach(([x, y, m]) => { g.fillStyle = MOODS[m][2]; g.beginPath(); g.arc(x, y, 4.5, 0, 7); g.fill(); });
          // 7-day rolling average
          g.strokeStyle = css.getPropertyValue('--accent'); g.globalAlpha = 0.6; g.setLineDash([6, 5]); g.lineWidth = 2; g.beginPath(); pts.forEach((p, i) => { const w = pts.slice(Math.max(0, i - 6), i + 1); const a = w.reduce((s, q) => s + q[2], 0) / w.length; const y = H - P - a * (H - 2 * P) / 4; i ? g.lineTo(p[0], y) : g.moveTo(p[0], y); }); g.stroke(); g.setLineDash([]); g.globalAlpha = 1; });
      }
      async function demo() {
        if (keys().length && !(await MS.confirm('Add sample data?', 'Sample entries are only added to empty days.'))) return;
        for (let i = 60; i >= 1; i--) { const d = new Date(); d.setDate(d.getDate() - i); const k = key(d); if (D.entries[k]) continue; const acts = ACTS.filter(() => Math.random() < 0.22); const sleep = 5 + Math.round(Math.random() * 8) / 2; let m = 2 + (acts.includes('🏃 Exercise') ? 0.9 : 0) + (acts.includes('👥 Friends') ? 0.7 : 0) - (acts.includes('🍔 Junk food') ? 0.6 : 0) + (sleep >= 7 ? 0.5 : -0.6) + (d.getDay() % 6 === 0 ? 0.5 : 0) + (Math.random() - 0.5) * 1.6; m = Math.max(0, Math.min(4, Math.round(m))); D.entries[k] = { mood: m, acts, sleep, grat: ['', '', ''], text: ['A quiet day.', 'Productive morning, slow afternoon.', 'Caught up with an old friend.', 'Long day at work but got a lot done.', 'Went for a walk by the river.', 'Tried a new recipe — success!', ''][i % 7], prompt: null }; }
        save(); render();
      }

      /* ---------- browse ---------- */
      function browse() {
        const search = h('input.input', { placeholder: 'Search entries…', value: q, style: { flex: 1 }, on: { input: () => { q = search.value; list(); } } });
        const moodF = h('select.input', { on: { change: list } }, h('option', { value: '' }, 'Any mood'), ...MOODS.map(([em, n], i) => h('option', { value: i }, em + ' ' + n)));
        const box = h('div.col', { style: { gap: '10px' } });
        function list() { box.innerHTML = ''; const s = q.toLowerCase(); const ks = keys().reverse().filter((k) => { const e = D.entries[k]; return (moodF.value === '' || e.mood === +moodF.value) && (!s || (e.text + ' ' + e.grat.join(' ') + ' ' + e.acts.join(' ')).toLowerCase().includes(s)); });
          if (!ks.length) box.append(h('div.empty', 'No entries yet.'));
          ks.slice(0, 200).forEach((k) => { const e = D.entries[k]; box.append(h('div.card.col', { style: { gap: '6px', cursor: 'pointer', borderLeft: e.mood != null ? `4px solid ${MOODS[e.mood][2]}` : '' }, on: { click: () => { cur = k; D.tab = 'write'; save(); render(); } } }, h('div.row', h('b', nice(k, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })), h('span', e.mood != null ? MOODS[e.mood][0] : ''), h('div.spacer'), e.sleep != null ? h('span.small.muted', '😴 ' + e.sleep + 'h') : null), e.acts.length ? h('div.small.muted', e.acts.join('  ')) : null, e.text.trim() ? h('div', { style: { whiteSpace: 'pre-wrap', maxHeight: '4.8em', overflow: 'hidden' } }, e.text.trim()) : null, e.grat.some(Boolean) ? h('div.small', '🙏 ' + e.grat.filter(Boolean).join(' · ')) : null)); }); }
        body.append(h('div.row', search, moodF), box); list();
      }
      function exportMd() { const md = keys().map((k) => { const e = D.entries[k]; return `## ${nice(k)}${e.mood != null ? ' ' + MOODS[e.mood][0] : ''}\n${e.acts.length ? '\n' + e.acts.join(', ') + '\n' : ''}${e.sleep != null ? '\nSleep: ' + e.sleep + 'h\n' : ''}${e.grat.some(Boolean) ? '\nGrateful for:\n' + e.grat.filter(Boolean).map((g) => '- ' + g).join('\n') + '\n' : ''}${e.prompt ? '\n> ' + e.prompt + '\n' : ''}\n${e.text.trim()}\n`; }).join('\n'); MS.download('journal.md', '# Journal\n\n' + md, 'text/markdown'); }

      render();
      return { unmount() {} };
    },
  });
})();
