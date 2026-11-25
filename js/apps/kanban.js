/* Kanban: multiple boards, drag & drop, labels, due dates, checklists */
(function () {
  const { h } = MS;
  const LABELS = { red: '#ff5d6c', orange: '#ffb84f', green: '#3ddc97', blue: '#2fa8ff', purple: '#a77bff', pink: '#ff4fa3' };
  const sample = () => ({ boards: [{ id: 'b1', name: 'My first board', columns: [
    { id: 'c1', name: '💡 Ideas', cards: [{ id: 'k1', title: 'Drag me to another column', labels: ['purple'], desc: 'Cards can have descriptions, labels, checklists and due dates.', checklist: [{ t: 'Open me', d: false }, { t: 'Check this box', d: false }], due: '' }] },
    { id: 'c2', name: '📋 To do', cards: [{ id: 'k2', title: 'Plan the week', labels: ['blue'], desc: '', checklist: [], due: MS.isoDate(new Date(Date.now() + 2 * 864e5)) }] },
    { id: 'c3', name: '⚡ Doing', cards: [] }, { id: 'c4', name: '✅ Done', cards: [{ id: 'k3', title: 'Install MegaStudio', labels: ['green'], desc: '', checklist: [], due: '' }] }] }], active: 'b1' });
  let store;
  const getStore = async () => (store = store || (await MS.store('kanban', sample)));
  MS.kanbanApi = { getStore };
  MS.searchProviders.push(async (q) => { const s = await getStore(); const out = []; s.data.boards.forEach((b) => b.columns.forEach((c) => c.cards.forEach((k) => out.push({ icon: '📋', title: k.title, sub: `Card · ${b.name} › ${c.name}`, run: () => { s.data.active = b.id; MS.go('kanban', b.id, k.id); }, score: MS.fuzzy(q, k.title) })))); return out; });

  MS.register({
    id: 'kanban', name: 'Boards', icon: '📋', group: 'Productivity', desc: 'Kanban boards', keywords: 'kanban trello tasks todo board',
    commands: [{ id: 'kanban-new-board', title: 'New kanban board', icon: '📋', run: async () => { MS.go('kanban'); setTimeout(() => MS.emit('kanban:newboard'), 50); } }],
    async mount(view) {
      const s = await getStore(); let filter = '';
      const board = () => s.data.boards.find((b) => b.id === s.data.active) || s.data.boards[0];
      const wrap = h('div', { style: { display: 'flex', gap: '14px', padding: '16px', alignItems: 'flex-start', height: '100%', overflowX: 'auto' } });
      view.append(wrap);
      const sel = h('select.input', { on: { change: () => { s.data.active = sel.value; s.touch(); render(); } } });
      const search = h('input.input', { placeholder: 'Filter cards…', style: { width: '160px' }, on: { input: () => { filter = search.value.toLowerCase(); render(); } } });
      const newBoard = async () => { const n = await MS.prompt('Board name', 'New board'); if (!n) return; const b = { id: MS.uid('b'), name: n, columns: ['To do', 'Doing', 'Done'].map((x) => ({ id: MS.uid('c'), name: x, cards: [] })) }; s.data.boards.push(b); s.data.active = b.id; s.touch(); render(); };
      const off = MS.on('kanban:newboard', newBoard);
      MS.setActions(sel, h('button.btn', { on: { click: newBoard } }, '+ Board'),
        h('button.btn', { on: { click: async () => { const n = await MS.prompt('Rename board', board().name); if (n) { board().name = n; s.touch(); render(); } } } }, '✎'),
        h('button.btn.danger', { title: 'Delete board', on: { click: async () => { if (s.data.boards.length < 2) return MS.toast('Keep at least one board'); if (await MS.confirm('Delete board?', board().name, 'Delete')) { s.data.boards = s.data.boards.filter((b) => b !== board()); s.data.active = s.data.boards[0].id; s.touch(); render(); } } } }, '🗑'), search);
      let drag = null;
      function render() {
        const b = board(); sel.innerHTML = ''; s.data.boards.forEach((x) => sel.append(h('option', { value: x.id, selected: x.id === b.id }, x.name)));
        wrap.innerHTML = '';
        b.columns.forEach((col, ci) => {
          const cards = h('div.col', { style: { minHeight: '40px', gap: '8px' } });
          const colEl = h('div', { style: { width: '280px', flex: 'none', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '14px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '100%' } },
            h('div.row', h('strong', { style: { flex: 1, cursor: 'text' }, on: { dblclick: async () => { const n = await MS.prompt('Column name', col.name); if (n) { col.name = n; s.touch(); render(); } } } }, col.name), h('span.tag', col.cards.length),
              h('button.icon-btn', { title: 'Move left', on: { click: () => { if (ci > 0) { b.columns.splice(ci - 1, 0, b.columns.splice(ci, 1)[0]); s.touch(); render(); } } } }, '‹'),
              h('button.icon-btn', { title: 'Delete column', on: { click: async () => { if (await MS.confirm('Delete column and its cards?', col.name, 'Delete')) { b.columns.splice(ci, 1); s.touch(); render(); } } } }, '×')),
            h('div', { style: { overflow: 'auto', flex: 1 } }, cards),
            h('button.btn', { on: { click: async () => { const t = await MS.prompt('Card title'); if (t) { col.cards.push({ id: MS.uid('k'), title: t, labels: [], desc: '', checklist: [], due: '' }); s.touch(); render(); } } } }, '+ Add card'));
          colEl.addEventListener('dragover', (e) => { e.preventDefault(); colEl.style.outline = '2px dashed var(--accent)'; });
          colEl.addEventListener('dragleave', () => (colEl.style.outline = ''));
          colEl.addEventListener('drop', (e) => {
            e.preventDefault(); colEl.style.outline = ''; if (!drag) return;
            const from = b.columns.find((c) => c.id === drag.col); const idx = from.cards.findIndex((k) => k.id === drag.card); const [card] = from.cards.splice(idx, 1);
            const after = [...cards.children].find((el) => e.clientY < el.getBoundingClientRect().top + el.offsetHeight / 2);
            const at = after ? col.cards.findIndex((k) => k.id === after.dataset.id) : col.cards.length; col.cards.splice(at < 0 ? col.cards.length : at, 0, card);
            if (/done|✅/i.test(col.name) && !/done|✅/i.test(from.name)) { MS.toast('🎉 Nice work!', 'good'); }
            drag = null; s.touch(); render();
          });
          col.cards.filter((k) => !filter || (k.title + k.desc).toLowerCase().includes(filter)).forEach((k) => {
            const done = k.checklist.filter((c) => c.d).length; const overdue = k.due && k.due < MS.isoDate() && !/done|✅/i.test(col.name);
            const el = h('div', { draggable: true, 'data-id': k.id, style: { background: 'var(--panel2)', border: '1px solid var(--line)', borderRadius: '10px', padding: '9px 10px', cursor: 'grab' }, on: { click: () => openCard(k, col), dragstart: (e) => { drag = { col: col.id, card: k.id }; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', k.title); el.style.opacity = '.4'; }, dragend: () => (el.style.opacity = '') } },
              k.labels.length ? h('div.row', { style: { gap: '4px', marginBottom: '6px' } }, k.labels.map((l) => h('span', { style: { width: '34px', height: '6px', borderRadius: '9px', background: LABELS[l] } }))) : null,
              h('div', k.title),
              h('div.row.small.muted', { style: { marginTop: '4px', gap: '10px' } }, k.desc ? '≡' : null, k.checklist.length ? `☑ ${done}/${k.checklist.length}` : null, k.due ? h('span', { style: { color: overdue ? 'var(--bad)' : '' } }, '📅 ' + k.due) : null));
            cards.append(el);
          });
          wrap.append(colEl);
        });
        wrap.append(h('button.btn', { style: { flex: 'none', width: '200px' }, on: { click: async () => { const n = await MS.prompt('Column name'); if (n) { b.columns.push({ id: MS.uid('c'), name: n, cards: [] }); s.touch(); render(); } } } }, '+ Add column'));
      }
      function openCard(k, col) {
        const title = h('input.input', { value: k.title, style: { width: '100%', fontSize: '16px', fontWeight: 600 } });
        const desc = h('textarea.input', { value: k.desc, placeholder: 'Description (markdown)…', style: { width: '100%', minHeight: '90px' } });
        const due = h('input.input', { type: 'date', value: k.due });
        const labels = h('div.row', Object.entries(LABELS).map(([n, c]) => h('button', { title: n, style: { width: '30px', height: '22px', borderRadius: '6px', border: k.labels.includes(n) ? '3px solid var(--text)' : '1px solid var(--line)', background: c, cursor: 'pointer' }, on: { click: (e) => { k.labels = k.labels.includes(n) ? k.labels.filter((x) => x !== n) : [...k.labels, n]; e.target.style.border = k.labels.includes(n) ? '3px solid var(--text)' : '1px solid var(--line)'; s.touch(); } } })));
        const cl = h('div.col');
        const renderCl = () => { cl.innerHTML = ''; k.checklist.forEach((c, i) => cl.append(h('label.row', h('input', { type: 'checkbox', checked: c.d, on: { change: (e) => { c.d = e.target.checked; s.touch(); } } }), h('span', { style: { flex: 1, textDecoration: c.d ? 'line-through' : '' } }, c.t), h('button.icon-btn', { on: { click: () => { k.checklist.splice(i, 1); s.touch(); renderCl(); } } }, '×')))); };
        renderCl();
        const newItem = h('input.input', { placeholder: 'Add checklist item + Enter', on: { keydown: (e) => { if (e.key === 'Enter' && newItem.value.trim()) { k.checklist.push({ t: newItem.value.trim(), d: false }); newItem.value = ''; s.touch(); renderCl(); } } } });
        const moveSel = h('select.input', board().columns.map((c) => h('option', { value: c.id, selected: c === col }, c.name)));
        const close = MS.modal(h('div.col', title, h('div.small.muted', 'in ' + col.name), h('strong', 'Labels'), labels, h('strong', 'Due date'), due, h('strong', 'Description'), desc, h('strong', 'Checklist'), cl, newItem,
          h('div.row', h('span.small.muted', 'Move to'), moveSel, h('div.spacer'),
            h('button.btn.danger', { on: { click: () => { col.cards = col.cards.filter((x) => x !== k); s.touch(); close(); } } }, 'Delete'),
            h('button.btn.primary', { on: { click: () => close() } }, 'Done'))), { onClose: () => {
          k.title = title.value || k.title; k.desc = desc.value; k.due = due.value;
          const to = board().columns.find((c) => c.id === moveSel.value);
          if (to && to !== col && col.cards.includes(k)) { col.cards = col.cards.filter((x) => x !== k); to.cards.push(k); }
          s.touch(); render();
        } });
      }
      render();
      return {
        unmount: off,
        route(args) { if (args[0] && s.data.boards.some((b) => b.id === args[0])) { s.data.active = args[0]; render(); } if (args[1]) { const b = board(); for (const c of b.columns) { const k = c.cards.find((x) => x.id === args[1]); if (k) openCard(k, c); } } },
      };
    },
  });
})();
