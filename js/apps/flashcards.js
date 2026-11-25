/* Flashcards: decks with spaced repetition (SM-2), quiz mode, CSV import/export, progress */
(function () {
  const { h } = MS;
  const DAY = 864e5;
  const demo = () => ({ decks: [{ id: 'fd1', name: '🌍 World capitals', cards: [['France', 'Paris'], ['Japan', 'Tokyo'], ['Brazil', 'Brasília'], ['India', 'New Delhi'], ['Canada', 'Ottawa'], ['Australia', 'Canberra'], ['Egypt', 'Cairo'], ['Kenya', 'Nairobi'], ['Norway', 'Oslo'], ['Argentina', 'Buenos Aires']].map(([f, b]) => ({ id: MS.uid('c'), f, b, ef: 2.5, iv: 0, reps: 0, due: 0 })) },
    { id: 'fd2', name: '💻 JavaScript basics', cards: [['What does `===` check?', 'Value AND type equality'], ['Keyword for a block-scoped constant', '`const`'], ['Array method that returns a new array of transformed items', '`map()`'], ['What is a Promise?', 'An object representing a future value of an async operation'], ['typeof null', '"object" (a famous quirk)']].map(([f, b]) => ({ id: MS.uid('c'), f, b, ef: 2.5, iv: 0, reps: 0, due: 0 })) }] });
  let store;
  const getStore = async () => (store = store || (await MS.store('flashcards', demo)));
  const sm2 = (c, q) => { if (q < 3) { c.reps = 0; c.iv = 1; } else { c.reps++; c.iv = c.reps === 1 ? 1 : c.reps === 2 ? 6 : Math.round(c.iv * c.ef); } c.ef = Math.max(1.3, c.ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))); c.due = Date.now() + (q < 3 ? 60e3 * 5 : c.iv * DAY); c.last = Date.now(); };
  const dueCards = (d) => d.cards.filter((c) => c.due <= Date.now());
  MS.register({
    id: 'flashcards', name: 'Flashcards', icon: '🗃', group: 'Productivity', desc: 'Spaced-repetition study', keywords: 'study learn anki quiz memorize cards school',
    async mount(view) {
      const s = await getStore(); const body = h('div.pad', { style: { maxWidth: '980px', margin: '0 auto' } }); view.append(body);
      let home = () => {
        MS.setActions(h('button.btn.primary', { on: { click: async () => { const n = await MS.prompt('Deck name'); if (n) { s.data.decks.push({ id: MS.uid('fd'), name: n, cards: [] }); s.touch(); home(); } } } }, '+ Deck'));
        body.innerHTML = ''; const totalDue = s.data.decks.reduce((a, d) => a + dueCards(d).length, 0);
        body.append(h('div.card', { style: { marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '14px' } }, h('div', { style: { fontSize: '40px' } }, totalDue ? '📚' : '🌟'), h('div', h('strong', totalDue ? `${totalDue} card${totalDue === 1 ? '' : 's'} due for review` : 'All caught up!'), h('div.small.muted', 'Cards you know well come back less often — that\'s spaced repetition.'))));
        body.append(h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '14px' } }, s.data.decks.map((d) => { const due = dueCards(d).length; const mastered = d.cards.filter((c) => c.iv >= 21).length;
          return h('div.card.col', h('strong', { style: { fontSize: '16px' } }, d.name), h('div.small.muted', `${d.cards.length} cards · ${due} due · ${mastered} mastered`), h('div', { style: { height: '6px', background: 'var(--panel2)', borderRadius: '9px', overflow: 'hidden' } }, h('div', { style: { height: '100%', width: (d.cards.length ? (mastered / d.cards.length) * 100 : 0) + '%', background: 'var(--good)' } })),
            h('div.row', { style: { flexWrap: 'wrap' } }, h('button.btn.primary', { disabled: !d.cards.length, on: { click: () => study(d, false) } }, due ? `Study (${due})` : 'Study'), h('button.btn', { disabled: d.cards.length < 4, title: 'Multiple choice quiz', on: { click: () => quiz(d) } }, 'Quiz'), h('button.btn', { on: { click: () => edit(d) } }, 'Edit'))); })));
      };
      function study(d, cram) {
        let queue = (cram ? d.cards.slice() : dueCards(d)).sort(() => Math.random() - 0.5); if (!queue.length) { queue = d.cards.slice().sort((a, b) => a.due - b.due).slice(0, 10); MS.toast('Nothing due — reviewing the next 10 anyway'); }
        let flipped = false, done = 0; const total = queue.length;
        MS.setActions(h('button.btn', { on: { click: home } }, '‹ Decks'), h('strong', d.name));
        const show = () => { body.innerHTML = ''; const c = queue[0]; if (!c) { s.touch(); body.append(h('div.empty', h('div.big', '🎉'), h('strong', 'Session complete!'), `You reviewed ${done} card${done === 1 ? '' : 's'}.`, h('button.btn.primary', { on: { click: home } }, 'Back to decks'))); return; }
          const card = h('div', { style: { minHeight: '300px', borderRadius: '20px', padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '26px', cursor: 'pointer', background: flipped ? 'var(--panel)' : 'linear-gradient(135deg, color-mix(in srgb,var(--accent) 30%, var(--panel)), color-mix(in srgb,var(--accent2) 22%, var(--panel)))', border: '1px solid var(--line)', boxShadow: 'var(--shadow)' }, on: { click: () => { flipped = !flipped; show(); } } },
            h('div.md', { html: MS.mdInline(c.f) }), flipped ? h('hr', { style: { width: '60%', border: 0, borderTop: '1px solid var(--line)', margin: '18px' } }) : null, flipped ? h('div.md', { style: { color: 'var(--accent)', fontWeight: 700 }, html: MS.mdInline(c.b) }) : h('div.small.muted', { style: { marginTop: '16px' } }, 'Click or press Space to reveal'));
          body.append(h('div.row', { style: { marginBottom: '10px' } }, h('span.small.muted', `${done} / ${total} reviewed · ${queue.length} left`), h('div.spacer')), h('div', { style: { height: '6px', background: 'var(--panel2)', borderRadius: '9px', marginBottom: '16px' } }, h('div', { style: { height: '100%', width: (done / total) * 100 + '%', background: 'var(--accent)', borderRadius: '9px' } })), card);
          if (flipped) body.append(h('div.row', { style: { justifyContent: 'center', marginTop: '16px', flexWrap: 'wrap' } }, [[1, 'Again', 'var(--bad)'], [3, 'Hard', 'var(--warn)'], [4, 'Good', 'var(--good)'], [5, 'Easy', 'var(--accent)']].map(([q, l, col], i) => h('button.btn', { style: { borderColor: col, minWidth: '100px' }, on: { click: () => grade(q) } }, h('div', { style: { fontWeight: 700, color: col } }, l), h('div.small.muted', `${i + 1}`)))));
        };
        const grade = (q) => { const c = queue.shift(); sm2(c, q); if (q < 3) queue.push(c); else done++; flipped = false; s.touch(); show(); };
        const key = (e) => { if (/^(input|textarea)$/i.test(e.target.tagName)) return; if (e.key === ' ') { e.preventDefault(); flipped = !flipped; show(); } else if (flipped && '1234'.includes(e.key)) grade([1, 3, 4, 5][+e.key - 1]); };
        document.addEventListener('keydown', key); cleanup = () => document.removeEventListener('keydown', key); show();
      }
      function quiz(d) {
        const qs = d.cards.slice().sort(() => Math.random() - 0.5).slice(0, 10); let i = 0, score = 0;
        MS.setActions(h('button.btn', { on: { click: home } }, '‹ Decks'), h('strong', d.name + ' · Quiz'));
        const show = () => { body.innerHTML = ''; if (i >= qs.length) { report(); return; } const c = qs[i]; const opts = [c, ...d.cards.filter((x) => x !== c).sort(() => Math.random() - 0.5).slice(0, 3)].sort(() => Math.random() - 0.5);
          body.append(h('div.small.muted', `Question ${i + 1} of ${qs.length} · Score ${score}`), h('div.card', { style: { fontSize: '24px', textAlign: 'center', padding: '34px', margin: '12px 0' }, html: MS.mdInline(c.f) }),
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' } }, opts.map((o) => { const b = h('button.btn', { style: { padding: '16px', fontSize: '16px' }, html: MS.mdInline(o.b), on: { click: () => { const ok = o === c; if (ok) score++; b.style.background = ok ? 'var(--good)' : 'var(--bad)'; b.style.color = '#fff'; if (!ok) [...b.parentNode.children][opts.indexOf(c)].style.outline = '3px solid var(--good)'; [...b.parentNode.children].forEach((x) => (x.disabled = true)); setTimeout(() => { i++; show(); }, ok ? 600 : 1300); } } }); return b; }))); };
        const report = () => body.append(h('div.empty', h('div.big', score === qs.length ? '🏆' : score > qs.length / 2 ? '👏' : '💪'), h('strong', `${score} / ${qs.length} correct`), h('div.row', h('button.btn.primary', { on: { click: () => quiz(d) } }, 'Try again'), h('button.btn', { on: { click: home } }, 'Decks'))));
        show();
      }
      function edit(d) {
        MS.setActions(h('button.btn', { on: { click: home } }, '‹ Decks'), h('button.btn', { on: { click: async () => { const n = await MS.prompt('Rename deck', d.name); if (n) { d.name = n; s.touch(); edit(d); } } } }, '✎ Rename'),
          h('button.btn', { on: { click: async () => { const f = await MS.pickFile('.csv,.tsv,.txt'); if (!f) return; const lines = (await MS.readText(f)).split(/\r?\n/).filter(Boolean); let n = 0; lines.forEach((l) => { const [a, b] = l.includes('\t') ? l.split('\t') : l.split(/,(.+)/); if (a && b) { d.cards.push({ id: MS.uid('c'), f: a.trim().replace(/^"|"$/g, ''), b: b.trim().replace(/^"|"$/g, ''), ef: 2.5, iv: 0, reps: 0, due: 0 }); n++; } }); s.touch(); MS.toast(`Imported ${n} cards`); edit(d); } } }, '⬆ Import CSV'),
          h('button.btn', { on: { click: () => MS.download(d.name.replace(/\W+/g, '_') + '.csv', d.cards.map((c) => `"${c.f.replace(/"/g, '""')}","${c.b.replace(/"/g, '""')}"`).join('\n'), 'text/csv') } }, '⬇ Export'),
          h('button.btn.danger', { on: { click: async () => { if (await MS.confirm('Delete deck?', d.name, 'Delete')) { s.data.decks = s.data.decks.filter((x) => x !== d); s.touch(); home(); } } } }, '🗑 Deck'));
        body.innerHTML = ''; const f = h('input.input', { placeholder: 'Front (question)', style: { flex: 1 } }), b = h('input.input', { placeholder: 'Back (answer)', style: { flex: 1 } });
        const add = () => { if (!f.value.trim() || !b.value.trim()) return; d.cards.push({ id: MS.uid('c'), f: f.value.trim(), b: b.value.trim(), ef: 2.5, iv: 0, reps: 0, due: 0 }); f.value = b.value = ''; s.touch(); edit(d); setTimeout(() => body.querySelector('input').focus(), 10); };
        [f, b].forEach((x) => x.addEventListener('keydown', (e) => e.key === 'Enter' && add()));
        body.append(h('h2', { style: { marginTop: 0 } }, d.name), h('div.row', f, b, h('button.btn.primary', { on: { click: add } }, 'Add')), h('div.small.muted', { style: { margin: '6px 0 12px' } }, 'Tip: Markdown like **bold** and `code` works. Import CSV with "front,back" per line.'),
          h('div.col', { style: { gap: '6px' } }, d.cards.map((c) => h('div.card.row', { style: { padding: '8px 12px' } }, h('div', { style: { flex: 1 }, html: MS.mdInline(c.f) }), h('div', { style: { flex: 1, color: 'var(--muted)' }, html: MS.mdInline(c.b) }), h('span.small.muted', c.due > Date.now() ? 'due ' + new Date(c.due).toLocaleDateString() : 'due now'), h('button.icon-btn', { on: { click: () => { d.cards = d.cards.filter((x) => x !== c); s.touch(); edit(d); } } }, '×')))));
        setTimeout(() => f.focus(), 10);
      }
      let cleanup = null; const origHome = home;
      const wrappedHome = () => { if (cleanup) { cleanup(); cleanup = null; } origHome(); };
      // ensure "Decks" buttons clear study key handlers
      home = wrappedHome; // eslint-disable-line no-func-assign
      home();
      return { unmount: () => cleanup && cleanup() };
    },
  });
})();
