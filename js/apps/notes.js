/* Notes: markdown docs with live preview, wikilinks, tags, pinning, templates, daily notes */
(function () {
  const { h } = MS;
  const WELCOME = `# Welcome to MegaStudio ✨

MegaStudio is a whole studio in one tab: **notes**, **kanban**, **calendar**, **sheets**, **paint**, **music**, **code** and **games** — and it all works *offline*.

## Try things
- [ ] Press **Ctrl K** to open the command palette
- [ ] Type \`=12*7\` in the palette to calculate
- [ ] Link notes like [[Ideas]] — click it to create it
- [x] Tag things with #welcome

> Everything is saved in your browser (IndexedDB). Use **Settings → Export** to back up.

| Shortcut | Action |
|---|---|
| Ctrl K | Command palette |
| Alt N | New note |
| Ctrl B | Toggle sidebar |

\`\`\`js
console.log('Hello from MegaStudio');
\`\`\`
`;
  const TEMPLATES = {
    Blank: '',
    'Meeting notes': '# Meeting: \n\n**Date:** {{date}}\n**Attendees:** \n\n## Agenda\n- \n\n## Notes\n\n## Action items\n- [ ] \n',
    'Daily journal': '# {{date}}\n\n## 🌅 Today I want to\n- [ ] \n\n## 📝 Notes\n\n## 🙏 Grateful for\n- \n',
    'Project brief': '# Project: \n\n## Goal\n\n## Why it matters\n\n## Milestones\n1. \n\n## Risks\n- \n',
    'Essay outline': '# Title\n\n## Thesis\n\n## Body 1\n- Claim:\n- Evidence:\n\n## Body 2\n- Claim:\n- Evidence:\n\n## Conclusion\n',
    'Bug report': '# Bug: \n\n**Steps to reproduce**\n1. \n\n**Expected**\n\n**Actual**\n\n**Notes**\n',
  };
  let store;
  const getStore = async () => (store = store || (await MS.store('notes', () => ({ notes: [{ id: 'welcome', title: 'Welcome to MegaStudio', body: WELCOME, pinned: true, created: Date.now(), updated: Date.now() }] }))));
  const titleOf = (body) => (body.match(/^#+\s+(.+)$/m) || [, body.split('\n')[0] || 'Untitled'])[1].trim().slice(0, 80) || 'Untitled';
  const tagsOf = (body) => [...new Set((body.match(/(^|\s)#([a-z][\w-]*)/gi) || []).map((t) => t.trim().slice(1).toLowerCase()))];

  MS.notesApi = {
    async create(body = '', open = true) {
      const s = await getStore(); const n = { id: MS.uid('n'), title: titleOf(body || 'Untitled'), body, pinned: false, created: Date.now(), updated: Date.now() };
      s.data.notes.unshift(n); s.touch(); if (open) MS.go('notes', n.id); return n;
    },
    async all() { return (await getStore()).data.notes; },
  };
  MS.searchProviders.push(async (q) => (await getStore()).data.notes.map((n) => ({ icon: '📝', title: n.title, sub: 'Note · ' + MS.ago(n.updated), run: () => MS.go('notes', n.id), score: MS.fuzzy(q, n.title) * 1.1 + (n.body.toLowerCase().includes(q.toLowerCase()) ? 20 : 0) })));

  async function daily() {
    const s = await getStore(); const t = MS.isoDate();
    const ex = s.data.notes.find((n) => n.title === t);
    if (ex) return MS.go('notes', ex.id);
    MS.notesApi.create(TEMPLATES['Daily journal'].replace(/{{date}}/g, t));
  }

  MS.register({
    id: 'notes', name: 'Notes', icon: '📝', group: 'Productivity', desc: 'Markdown notes & docs', keywords: 'docs markdown write editor wiki',
    commands: [
      { id: 'note-new', title: 'New note', key: 'alt+n', icon: '📝', run: () => MS.notesApi.create('# Untitled\n\n') },
      { id: 'note-daily', title: "Open today's daily note", key: 'alt+d', icon: '📅', run: daily },
      { id: 'note-import', title: 'Import Markdown files as notes', icon: '📥', run: async () => { const fs = await MS.pickFile('.md,.txt,text/*', true); for (const f of fs || []) await MS.notesApi.create(await MS.readText(f), false); MS.toast(`Imported ${fs?.length || 0} notes`); MS.go('notes'); } },
    ],
    async mount(view) {
      const s = await getStore();
      let currentId = null; let mode = localStorage.getItem('ms-notes-mode') || 'split'; let filter = ''; let tagFilter = '';
      const list = h('div.list'); const search = h('input.input', { placeholder: 'Search notes…', style: { width: '100%' } });
      const tagBar = h('div.row', { style: { flexWrap: 'wrap', gap: '4px', padding: '0 10px 6px' } });
      const ta = h('textarea.input.mono', { spellcheck: true, style: { flex: 1, resize: 'none', border: 0, borderRadius: 0, padding: '18px 22px', fontSize: '14px', lineHeight: '1.6', background: 'var(--bg)', minHeight: 0 } });
      const prev = h('div.md', { style: { padding: '8px 28px 40px' } });
      const prevWrap = h('div', { style: { flex: 1, overflow: 'auto', minWidth: 0, borderLeft: '1px solid var(--line)' } }, prev);
      const stats = h('span.small.muted');
      const toolbar = h('div.row', { style: { padding: '6px 10px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap', gap: '4px' } });
      const editorArea = h('div', { style: { display: 'flex', flex: 1, minHeight: 0 } }, ta, prevWrap);
      const editor = h('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 } }, toolbar, editorArea,
        h('div.row.small', { style: { padding: '4px 12px', borderTop: '1px solid var(--line)', background: 'var(--panel)' } }, stats));
      const pane = h('div.list-pane', h('div', { style: { padding: '10px' } }, search), tagBar, list,
        h('div.row', { style: { padding: '8px', borderTop: '1px solid var(--line)' } },
          h('button.btn.primary', { style: { flex: 1 }, on: { click: () => MS.notesApi.create('# Untitled\n\n') } }, '+ New'),
          h('button.btn', { title: 'From template', on: { click: pickTemplate } }, '📋'),
          h('button.btn', { title: 'Daily note', on: { click: daily } }, '📅')));
      const empty = h('div.empty', { style: { flex: 1 } }, h('div.big', '📝'), 'Pick a note or create a new one');
      view.append(h('div.split', pane, empty, editor));

      const wrap = (pre, post = pre, ph = 'text') => { const a = ta.selectionStart, b = ta.selectionEnd; const sel = ta.value.slice(a, b) || ph; ta.setRangeText(pre + sel + post, a, b); ta.selectionStart = a + pre.length; ta.selectionEnd = a + pre.length + sel.length; ta.focus(); onInput(); };
      const linePrefix = (p) => { const a = ta.value.lastIndexOf('\n', ta.selectionStart - 1) + 1; ta.setRangeText(p, a, a); ta.focus(); onInput(); };
      const tb = [['B', 'Bold (Ctrl+B in editor)', () => wrap('**')], ['I', 'Italic', () => wrap('*')], ['S', 'Strikethrough', () => wrap('~~')], ['H', 'Highlight', () => wrap('==')], ['H1', 'Heading', () => linePrefix('# ')], ['H2', 'Subheading', () => linePrefix('## ')],
        ['•', 'Bullet list', () => linePrefix('- ')], ['☑', 'Task', () => linePrefix('- [ ] ')], ['1.', 'Numbered', () => linePrefix('1. ')], ['❝', 'Quote', () => linePrefix('> ')], ['</>', 'Code', () => wrap('`')], ['{ }', 'Code block', () => wrap('\n```\n', '\n```\n', 'code')],
        ['🔗', 'Link', () => wrap('[', '](https://)', 'link')], ['[[ ]]', 'Wiki link', () => wrap('[[', ']]', 'Note')], ['▦', 'Table', () => wrap('\n| A | B |\n|---|---|\n| ', ' | |\n', '1')], ['—', 'Divider', () => wrap('\n---\n', '', '')], ['🖼', 'Insert image', insertImage], ['🕒', 'Insert date/time', () => wrap(new Date().toLocaleString(), '', '')]];
      tb.forEach(([l, t, f]) => toolbar.append(h('button.btn.sm', { title: t, on: { click: f } }, l)));
      toolbar.append(h('div.spacer'));
      const modeBtns = ['edit', 'split', 'preview'].map((m) => h('button.btn.sm', { 'data-m': m, on: { click: () => setMode(m) } }, { edit: '✎ Edit', split: '◫ Split', preview: '👁 Preview' }[m]));
      toolbar.append(...modeBtns);
      function setMode(m) { mode = m; localStorage.setItem('ms-notes-mode', m); ta.style.display = m === 'preview' ? 'none' : ''; prevWrap.style.display = m === 'edit' ? 'none' : ''; prevWrap.style.borderLeft = m === 'split' ? '1px solid var(--line)' : '0'; modeBtns.forEach((b) => b.classList.toggle('on', b.dataset.m === m)); }
      async function insertImage() { const f = await MS.pickFile('image/*'); if (!f) return; const url = await MS.readDataURL(f); wrap(`![${f.name}](`, ')', url); }
      async function pickTemplate() {
        const close = MS.modal(h('div.col', h('h2', 'New from template'), ...Object.keys(TEMPLATES).map((k) => h('button.btn', { style: { textAlign: 'left' }, on: { click: () => { close(); MS.notesApi.create(TEMPLATES[k].replace(/{{date}}/g, MS.isoDate()) || '# Untitled\n\n'); } } }, k))));
      }

      const cur = () => s.data.notes.find((n) => n.id === currentId);
      const renderPreview = () => { const n = cur(); if (!n) return; prev.innerHTML = MS.md(n.body); const w = (n.body.match(/\S+/g) || []).length; stats.textContent = `${w} words · ${n.body.length} chars · ~${Math.max(1, Math.round(w / 220))} min read · edited ${MS.ago(n.updated)}`; };
      const onInput = () => { const n = cur(); if (!n) return; n.body = ta.value; n.title = titleOf(n.body); n.updated = Date.now(); s.touch(); renderPreview(); renderListSoon(); };
      const renderListSoon = MS.debounce(renderList, 250);
      ta.addEventListener('input', onInput);
      ta.addEventListener('keydown', (e) => {
        const k = MS.eventKey(e);
        if (k === 'b+ctrl' || k === 'b+meta') { e.preventDefault(); e.stopPropagation(); wrap('**'); }
        else if (k === 'ctrl+i' || k === 'i+meta') { e.preventDefault(); wrap('*'); }
        else if (e.key === 'Tab') { e.preventDefault(); ta.setRangeText('  ', ta.selectionStart, ta.selectionEnd, 'end'); onInput(); }
        else if (e.key === 'Enter') { // continue lists
          const a = ta.value.lastIndexOf('\n', ta.selectionStart - 1) + 1; const line = ta.value.slice(a, ta.selectionStart);
          const m = line.match(/^(\s*)([-*+]|\d+[.)])\s(\[[ xX]\]\s)?/);
          if (m) { e.preventDefault(); if (line.trim() === m[0].trim()) { ta.setRangeText('', a, ta.selectionStart, 'end'); } else { let b = m[2]; if (/\d/.test(b)) b = parseInt(b) + 1 + b.slice(-1); ta.setRangeText('\n' + m[1] + b + ' ' + (m[3] ? '[ ] ' : ''), ta.selectionStart, ta.selectionEnd, 'end'); } onInput(); }
        }
      });
      prev.addEventListener('click', async (e) => {
        const wl = e.target.closest('.wikilink');
        if (wl) { e.preventDefault(); const name = wl.dataset.note; const ex = s.data.notes.find((n) => n.title.toLowerCase() === name.toLowerCase()); if (ex) MS.go('notes', ex.id); else MS.notesApi.create(`# ${name}\n\n`); return; }
        if (e.target.matches('input[type=checkbox][data-line]')) { const n = cur(); const ln = +e.target.dataset.line; const lines = n.body.split('\n'); lines[ln] = lines[ln].replace(/\[([ xX])\]/, (_, c) => (c === ' ' ? '[x]' : '[ ]')); ta.value = n.body = lines.join('\n'); onInput(); }
        const tg = e.target.closest('.tag'); if (tg) { tagFilter = tg.textContent.slice(1).toLowerCase(); renderList(); }
      });
      search.addEventListener('input', () => { filter = search.value.toLowerCase(); renderList(); });

      function renderList() {
        const allTags = {}; s.data.notes.forEach((n) => tagsOf(n.body).forEach((t) => (allTags[t] = (allTags[t] || 0) + 1)));
        tagBar.innerHTML = '';
        Object.keys(allTags).sort().slice(0, 30).forEach((t) => tagBar.append(h('span.tag', { style: { cursor: 'pointer', borderColor: tagFilter === t ? 'var(--accent)' : '' }, on: { click: () => { tagFilter = tagFilter === t ? '' : t; renderList(); } } }, '#' + t + ' ' + allTags[t])));
        list.innerHTML = '';
        const notes = s.data.notes.filter((n) => (!filter || (n.title + n.body).toLowerCase().includes(filter)) && (!tagFilter || tagsOf(n.body).includes(tagFilter)))
          .sort((a, b) => (b.pinned - a.pinned) || b.updated - a.updated);
        notes.forEach((n) => list.append(h('div.list-item', { class: n.id === currentId ? 'active' : '', on: { click: () => MS.go('notes', n.id), contextmenu: (e) => { e.preventDefault(); noteMenu(n); } } },
          h('div.t', (n.pinned ? '📌 ' : '') + n.title), h('div.s', MS.ago(n.updated) + ' · ' + n.body.replace(/[#*`>\-\[\]]/g, '').replace(/\s+/g, ' ').slice(0, 60)))));
        if (!notes.length) list.append(h('div.muted.small', { style: { padding: '12px' } }, 'No notes match.'));
      }
      function noteMenu(n) {
        const close = MS.modal(h('div.col', h('h2', n.title),
          h('button.btn', { on: { click: () => { n.pinned = !n.pinned; s.touch(); renderList(); close(); } } }, n.pinned ? 'Unpin' : '📌 Pin to top'),
          h('button.btn', { on: { click: () => { close(); MS.notesApi.create(n.body); } } }, '⧉ Duplicate'),
          h('button.btn', { on: { click: () => { MS.download(n.title.replace(/[^\w -]/g, '') + '.md', n.body, 'text/markdown'); close(); } } }, '⬇ Export .md'),
          h('button.btn', { on: { click: () => { const w = window.open('', '_blank'); if (w) { w.document.write(`<title>${MS.esc(n.title)}</title><style>body{font:16px/1.6 system-ui;max-width:760px;margin:40px auto;padding:0 20px}pre,code{background:#f3f3f3}td,th{border:1px solid #ccc;padding:4px 8px}table{border-collapse:collapse}</style>` + MS.md(n.body)); w.document.close(); w.print(); } close(); } } }, '🖨 Print / PDF'),
          h('button.btn', { on: { click: async () => { await MS.db.files.put({ id: MS.uid('f'), name: n.title + '.md', type: 'text/markdown', folder: '/Notes', size: n.body.length, data: n.body, created: Date.now(), updated: Date.now() }); MS.toast('Saved to Files › /Notes'); close(); } } }, '🗂 Save copy to Files'),
          h('button.btn.danger', { on: { click: async () => { close(); if (await MS.confirm('Delete this note?', n.title, 'Delete')) { s.data.notes = s.data.notes.filter((x) => x !== n); s.touch(); MS.go('notes'); renderList(); } } } }, '🗑 Delete')));
      }
      const menuBtn = h('button.btn', { on: { click: () => cur() && noteMenu(cur()) } }, '⋯ Note');
      MS.setActions(menuBtn);
      setMode(mode);
      return {
        route(args) {
          currentId = args[0] || null;
          if (!cur() && !args[0]) { const first = s.data.notes.slice().sort((a, b) => (b.pinned - a.pinned) || b.updated - a.updated)[0]; if (first) { currentId = first.id; } }
          const n = cur(); editor.style.display = n ? 'flex' : 'none'; empty.style.display = n ? 'none' : 'flex'; menuBtn.disabled = !n;
          if (n) { ta.value = n.body; renderPreview(); if (mode !== 'preview') setTimeout(() => ta.focus(), 30); }
          renderList();
        },
      };
    },
  });
})();
