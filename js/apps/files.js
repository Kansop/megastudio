/* Files: a virtual file system on IndexedDB — folders, upload, preview, edit, move, search */
(function () {
  const { h } = MS;
  const isText = (f) => /^text\/|json|javascript|xml|svg|markdown|csv/.test(f.type) || /\.(md|txt|js|json|css|html|csv|ts|py|svg|xml|yml|yaml|ics)$/i.test(f.name);
  const iconFor = (f) => f.type.startsWith('image/') ? '🖼' : f.type.startsWith('audio/') ? '🎵' : f.type.startsWith('video/') ? '🎬' : /pdf/.test(f.type) ? '📕' : /\.md$/i.test(f.name) ? '📝' : /html/.test(f.type) ? '🌐' : /csv|sheet/.test(f.type) ? '📊' : /zip/.test(f.type) ? '🗜' : isText(f) ? '📄' : '📦';
  const fmtSize = (n) => (n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(1) + ' MB');
  const dataToBlob = (f) => { if (typeof f.data !== 'string' || !f.data.startsWith('data:')) return new Blob([f.data ?? ''], { type: f.type || 'text/plain' }); const [head, b64] = f.data.split(','); const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type: head.slice(5).split(';')[0] }); };
  MS.filesApi = { dataToBlob, isText, iconFor };
  MS.searchProviders.push(async (q) => (await MS.db.files.all()).map((f) => ({ icon: iconFor(f), title: f.name, sub: 'File · ' + f.folder, run: () => MS.go('files', f.folder, f.id), score: MS.fuzzy(q, f.name) })));
  let meta;
  const getMeta = async () => (meta = meta || (await MS.store('files-meta', () => ({ folders: ['/', '/Documents', '/Pictures', '/Music', '/Code', '/Notes'], view: 'grid', sort: 'name' }))));
  async function seed() {
    const all = await MS.db.files.all(); const m = await getMeta(); if (m.data.seeded) return; m.data.seeded = true; m.touch();
    if (all.length) return;
    await MS.db.files.put({ id: MS.uid('f'), name: 'Read me.md', type: 'text/markdown', folder: '/Documents', size: 300, data: '# Your files\n\nThis is a private file system stored in your browser.\n\n- Drag & drop files anywhere here to upload\n- Double-click to open, right-click for more\n- Text files can be edited in place\n', created: Date.now(), updated: Date.now() });
    await MS.db.files.put({ id: MS.uid('f'), name: 'shopping.csv', type: 'text/csv', folder: '/Documents', size: 60, data: 'Item,Qty,Price\nApples,6,3.50\nBread,1,2.99\nCoffee,2,11.00\n', created: Date.now(), updated: Date.now() });
  }
  MS.register({
    id: 'files', name: 'Files', icon: '🗂', group: 'Tools', desc: 'Your private file system', keywords: 'files folders upload storage drive explorer finder',
    async mount(view) {
      await seed(); const m = await getMeta(); let folder = '/', q = '', selected = null;
      const tree = h('div.list'); const main = h('div', { style: { flex: 1, overflow: 'auto', padding: '14px' } }); const crumbs = h('div.row', { style: { padding: '10px 14px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap' } });
      const usage = h('div.small.muted', { style: { padding: '10px' } });
      const right = h('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 } }, crumbs, main);
      view.append(h('div.split', h('div.list-pane', h('div', { style: { padding: '10px' } }, h('input.input', { placeholder: 'Search all files…', style: { width: '100%' }, on: { input: (e) => { q = e.target.value.toLowerCase(); render(); } } })), tree, usage), right));
      const search = (txt) => txt;
      const upload = async (files) => { for (const f of files) { const data = f.type.startsWith('text/') || isText({ type: f.type, name: f.name }) ? await MS.readText(f) : await MS.readDataURL(f); await MS.db.files.put({ id: MS.uid('f'), name: f.name, type: f.type || 'application/octet-stream', folder, size: f.size, data, created: Date.now(), updated: Date.now() }); } MS.toast(`Uploaded ${files.length} file(s)`, 'good'); render(); };
      MS.setActions(h('button.btn.primary', { on: { click: async () => { const fs = await MS.pickFile('*/*', true); if (fs && fs.length) upload(fs); } } }, '⬆ Upload'),
        h('button.btn', { on: { click: async () => { const n = await MS.prompt('New text file name', 'untitled.txt'); if (!n) return; const f = await MS.db.files.put({ id: MS.uid('f'), name: n, type: /\.md$/.test(n) ? 'text/markdown' : /\.html?$/.test(n) ? 'text/html' : 'text/plain', folder, size: 0, data: '', created: Date.now(), updated: Date.now() }); render(); open(f); } } }, '+ File'),
        h('button.btn', { on: { click: async () => { const n = await MS.prompt('New folder name'); if (!n) return; const p = (folder === '/' ? '' : folder) + '/' + n.replace(/\//g, '-'); if (!m.data.folders.includes(p)) m.data.folders.push(p); m.touch(); folder = p; render(); } } }, '+ Folder'),
        h('button.btn', { title: 'Toggle grid/list', on: { click: () => { m.data.view = m.data.view === 'grid' ? 'list' : 'grid'; m.touch(); render(); } } }, '▦/☰'),
        h('select.input', { on: { change: (e) => { m.data.sort = e.target.value; m.touch(); render(); } } }, [['name', 'Name'], ['updated', 'Modified'], ['size', 'Size'], ['type', 'Type']].map(([v, l]) => h('option', { value: v, selected: m.data.sort === v }, 'Sort: ' + l))));
      view.addEventListener('dragover', (e) => { e.preventDefault(); main.style.outline = '2px dashed var(--accent)'; });
      view.addEventListener('dragleave', (e) => { if (e.target === main) main.style.outline = ''; });
      view.addEventListener('drop', (e) => { e.preventDefault(); main.style.outline = ''; if (e.dataTransfer.files.length) upload([...e.dataTransfer.files]); });
      async function render() {
        const all = await MS.db.files.all();
        const folders = [...new Set([...m.data.folders, ...all.map((f) => f.folder)])].sort();
        tree.innerHTML = '';
        folders.forEach((p) => { const depth = p === '/' ? 0 : p.split('/').length - 1; const count = all.filter((f) => f.folder === p).length;
          const el = h('div.list-item', { class: p === folder && !q ? 'active' : '', style: { paddingLeft: 10 + depth * 14 + 'px' }, on: { click: () => { folder = p; q = ''; render(); }, dragover: (e) => e.preventDefault(), drop: async (e) => { e.preventDefault(); e.stopPropagation(); const id = e.dataTransfer.getData('ms/file'); if (id) { const f = await MS.db.files.get(id); f.folder = p; await MS.db.files.put(f); render(); MS.toast('Moved to ' + p); } } } }, h('div.t', (p === '/' ? '💽 Home' : '📁 ' + p.split('/').pop()) + (count ? `  ·  ${count}` : '')));
          tree.append(el); });
        crumbs.innerHTML = ''; const segs = folder.split('/').filter(Boolean); crumbs.append(h('button.btn.sm', { on: { click: () => { folder = '/'; render(); } } }, '💽 Home'));
        segs.forEach((sg, i) => { const p = '/' + segs.slice(0, i + 1).join('/'); crumbs.append(h('span.muted', '›'), h('button.btn.sm', { on: { click: () => { folder = p; render(); } } }, sg)); });
        if (folder !== '/' && !all.some((f) => f.folder === folder)) crumbs.append(h('div.spacer'), h('button.btn.sm.danger', { on: { click: () => { m.data.folders = m.data.folders.filter((x) => x !== folder && !x.startsWith(folder + '/')); m.touch(); folder = '/'; render(); } } }, 'Remove empty folder'));
        let files = q ? all.filter((f) => f.name.toLowerCase().includes(q)) : all.filter((f) => f.folder === folder);
        const k = m.data.sort; files.sort((a, b) => (k === 'name' ? a.name.localeCompare(b.name) : k === 'type' ? a.type.localeCompare(b.type) : b[k] - a[k]));
        const sub = q ? [] : folders.filter((p) => p !== folder && p.startsWith(folder === '/' ? '/' : folder + '/') && p.slice(folder === '/' ? 1 : folder.length + 1).indexOf('/') < 0 && p !== '/');
        main.innerHTML = '';
        if (!files.length && !sub.length) { main.append(h('div.empty', h('div.big', '📂'), q ? 'No files match.' : 'This folder is empty — drop files here or click Upload.')); }
        const grid = m.data.view === 'grid';
        const cont = h('div', { style: grid ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: '10px' } : { display: 'flex', flexDirection: 'column', gap: '2px' } });
        sub.forEach((p) => cont.append(item({ folder: true, name: p.split('/').pop(), path: p })));
        files.forEach((f) => cont.append(item(f)));
        main.append(cont);
        if (navigator.storage?.estimate) navigator.storage.estimate().then((e) => (usage.textContent = `${all.length} files · ${fmtSize(all.reduce((a, f) => a + (f.size || 0), 0))} · browser quota used ${fmtSize(e.usage || 0)} of ${fmtSize(e.quota || 0)}`));
        function item(f) {
          const thumb = f.folder === true ? h('div', { style: { fontSize: '40px' } }, '📁') : f.type.startsWith('image/') ? h('img', { src: f.data, style: { width: grid ? '100%' : '28px', height: grid ? '80px' : '28px', objectFit: 'cover', borderRadius: '8px' } }) : h('div', { style: { fontSize: grid ? '40px' : '22px' } }, iconFor(f));
          const el = h('div', { draggable: f.folder !== true, tabIndex: 0, title: f.name, style: grid ? { padding: '10px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel)', textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' } : { padding: '6px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: 'var(--panel)' },
            on: { dblclick: () => (f.folder === true ? ((folder = f.path), render()) : open(f)), click: () => { selected = f; [...cont.children].forEach((c) => (c.style.borderColor = '')); el.style.borderColor = 'var(--accent)'; if (f.folder === true && !grid) { folder = f.path; render(); } }, keydown: (e) => { if (e.key === 'Enter') f.folder === true ? ((folder = f.path), render()) : open(f); if (e.key === 'Delete' && f.folder !== true) del(f); }, contextmenu: (e) => { e.preventDefault(); if (f.folder !== true) menu(f); }, dragstart: (e) => e.dataTransfer.setData('ms/file', f.id) } },
            thumb, h('div.small', { style: { wordBreak: 'break-word', flex: grid ? '' : 1 } }, f.name), !grid && f.folder !== true ? h('span.small.muted', fmtSize(f.size || 0) + ' · ' + MS.ago(f.updated)) : null);
          return el;
        }
      }
      async function del(f) { if (await MS.confirm('Delete file?', f.name, 'Delete')) { await MS.db.files.del(f.id); render(); } }
      function menu(f) {
        const close = MS.modal(h('div.col', h('h2', iconFor(f) + ' ' + f.name), h('div.small.muted', `${f.type || 'unknown'} · ${fmtSize(f.size || 0)} · in ${f.folder} · modified ${MS.fmtTime(f.updated)}`),
          h('button.btn', { on: { click: () => { close(); open(f); } } }, 'Open'),
          h('button.btn', { on: { click: async () => { close(); const n = await MS.prompt('Rename', f.name); if (n) { f.name = n; f.updated = Date.now(); await MS.db.files.put(f); render(); } } } }, 'Rename'),
          h('button.btn', { on: { click: async () => { close(); const n = await MS.prompt('Move to folder', f.folder); if (n) { f.folder = n.startsWith('/') ? n : '/' + n; if (!m.data.folders.includes(f.folder)) { m.data.folders.push(f.folder); m.touch(); } await MS.db.files.put(f); render(); } } } }, 'Move…'),
          h('button.btn', { on: { click: async () => { close(); await MS.db.files.put({ ...f, id: MS.uid('f'), name: 'Copy of ' + f.name, created: Date.now(), updated: Date.now() }); render(); } } }, 'Duplicate'),
          h('button.btn', { on: { click: () => { close(); MS.download(f.name, dataToBlob(f)); } } }, '⬇ Download'),
          f.type.startsWith('image/') ? h('button.btn', { on: { click: () => { close(); MS.go('paint', 'file', f.id); } } }, '🎨 Open in Paint') : null,
          /\.md$|markdown|text\/plain/.test(f.name + f.type) ? h('button.btn', { on: { click: async () => { close(); MS.notesApi.create(f.data); } } }, '📝 Open as note') : null,
          h('button.btn.danger', { on: { click: () => { close(); del(f); } } }, '🗑 Delete')));
      }
      function open(f) {
        let body;
        if (f.type.startsWith('image/')) body = h('img', { src: f.data, style: { maxWidth: '100%', maxHeight: '60vh', display: 'block', margin: 'auto', borderRadius: '10px' } });
        else if (f.type.startsWith('audio/')) body = h('audio', { controls: true, src: URL.createObjectURL(dataToBlob(f)), style: { width: '100%' } });
        else if (f.type.startsWith('video/')) body = h('video', { controls: true, src: URL.createObjectURL(dataToBlob(f)), style: { width: '100%', maxHeight: '60vh' } });
        else if (/pdf/.test(f.type)) body = h('iframe', { src: URL.createObjectURL(dataToBlob(f)), style: { width: '100%', height: '60vh', border: 0 } });
        else if (isText(f)) {
          const ta = h('textarea.input.mono', { value: f.data, style: { width: '100%', height: '50vh', resize: 'vertical' } });
          const prev = h('div.md', { style: { maxHeight: '50vh', overflow: 'auto' } }); let showPrev = /\.md$/i.test(f.name);
          const toggle = () => { ta.style.display = showPrev ? 'none' : ''; prev.style.display = showPrev ? '' : 'none'; if (showPrev) prev.innerHTML = /html/.test(f.type) ? '' : MS.md(ta.value); if (showPrev && /html/.test(f.type)) { prev.innerHTML = ''; prev.append(h('iframe', { sandbox: 'allow-scripts', srcdoc: ta.value, style: { width: '100%', height: '48vh', border: 0, background: '#fff', borderRadius: '8px' } })); } };
          body = h('div.col', h('div.row', h('button.btn.sm', { on: { click: () => { showPrev = !showPrev; toggle(); } } }, 'Toggle preview'), h('div.spacer'), h('button.btn.sm.primary', { on: { click: async () => { f.data = ta.value; f.size = ta.value.length; f.updated = Date.now(); await MS.db.files.put(f); MS.toast('Saved', 'good'); render(); } } }, '💾 Save')), ta, prev);
          setTimeout(toggle, 0);
        } else body = h('div.empty', h('div.big', iconFor(f)), 'No preview for this type.', h('button.btn', { on: { click: () => MS.download(f.name, dataToBlob(f)) } }, '⬇ Download'));
        const box = h('div.col', h('div.row', h('h2', { style: { margin: 0, flex: 1 } }, f.name), h('button.btn.sm', { on: { click: () => menu(f) } }, '⋯')), body);
        MS.modal(box); const mb = document.querySelector('.modal-box'); mb.style.width = 'min(900px,94vw)';
      }
      const off = MS.on('files:changed', MS.debounce(render, 100));
      render();
      return { unmount: off, route(args) { if (args[0]) { folder = args[0]; render(); if (args[1]) MS.db.files.get(args[1]).then((f) => f && open(f)); } } };
    },
  });
})();
