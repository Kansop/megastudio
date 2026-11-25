/* Settings: themes, accent, font size, profile, backup/restore, storage, about */
(function () {
  const { h } = MS;
  async function exportAll() {
    const keys = await MS.db.keys(); const kv = {}; for (const k of keys) kv[k] = await MS.db.get(k);
    // flush in-memory stores first
    for (const st of Object.values(MS.allStores())) kv['store:' + st.name] = st.data;
    const files = await MS.db.files.all();
    return { app: 'MegaStudio', version: MS.version, exported: new Date().toISOString(), kv, files };
  }
  async function importAll(data, merge = false) {
    if (!data || data.app !== 'MegaStudio') throw new Error('Not a MegaStudio backup');
    if (!merge) { await MS.db.clear(); await MS.db.files.clear(); }
    for (const [k, v] of Object.entries(data.kv || {})) await MS.db.set(k, v);
    for (const f of data.files || []) await MS.db.files.put(f);
  }
  MS.backup = { exportAll, importAll };
  MS.register({
    id: 'settings', name: 'Settings', icon: '⚙️', group: 'System', desc: 'Themes, backup & more', keywords: 'preferences theme dark light backup export import reset',
    commands: [
      { id: 'backup-export', title: 'Export full backup (.json)', icon: '💾', run: async () => { MS.download(`megastudio-backup-${MS.isoDate()}.json`, JSON.stringify(await exportAll()), 'application/json'); MS.toast('Backup downloaded', 'good'); } },
      { id: 'backup-import', title: 'Restore from backup…', icon: '♻️', run: () => MS.go('settings') },
    ],
    async mount(view) {
      const s = await MS.store('settings', MS.defaultSettings()); const st = s.data;
      const section = (title, ...kids) => h('div.card.col', { style: { gap: '12px' } }, h('strong', { style: { fontSize: '15px' } }, title), ...kids);
      const themeGrid = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: '10px' } });
      const renderThemes = () => { themeGrid.innerHTML = ''; MS.themes.forEach((t) => { const probe = h('div', { 'data-theme': t, style: { borderRadius: '12px', border: '2px solid ' + (st.theme === t ? 'var(--accent)' : 'transparent'), padding: '3px', cursor: 'pointer' }, on: { click: async () => { await MS.setTheme(t); renderThemes(); } } },
        h('div', { 'data-theme': t, style: { background: 'var(--bg)', color: 'var(--text)', borderRadius: '9px', padding: '10px', border: '1px solid var(--line)' } }, h('div', { style: { display: 'flex', gap: '4px', marginBottom: '8px' } }, ['--accent', '--accent2', '--good', '--warn'].map((v) => h('span', { style: { width: '14px', height: '14px', borderRadius: '50%', background: `var(${v})` } }))), h('div', { style: { background: 'var(--panel)', height: '10px', borderRadius: '4px', marginBottom: '4px' } }), h('div.small', t))); themeGrid.append(probe); }); };
      renderThemes();
      const accent = h('input', { type: 'color', value: st.accent || '#7c5cff', on: { input: () => { st.accent = accent.value; s.touch(); MS.applySettings(); } } });
      const font = h('input', { type: 'range', min: 12, max: 18, value: st.fontSize || 14, on: { input: () => { st.fontSize = +font.value; fl.textContent = font.value + 'px'; s.touch(); MS.applySettings(); } } }); const fl = h('span.small.muted', (st.fontSize || 14) + 'px');
      const name = h('input.input', { value: st.name || '', placeholder: 'Your name (for greetings)', on: { input: () => { st.name = name.value; s.touch(); } } });
      const storageEl = h('div.small.muted');
      if (navigator.storage?.estimate) navigator.storage.estimate().then((e) => (storageEl.textContent = `Using ${((e.usage || 0) / 1048576).toFixed(2)} MB of ~${((e.quota || 0) / 1073741824).toFixed(1)} GB available to this site.`));
      const persistBtn = h('button.btn', { on: { click: async () => { const ok = await navigator.storage?.persist?.(); MS.toast(ok ? 'Storage is now persistent ✓' : 'Browser declined persistent storage', ok ? 'good' : ''); } } }, '🔒 Make storage persistent');
      view.append(h('div.pad.col', { style: { gap: '14px', maxWidth: '860px', margin: '0 auto' } },
        section('🎨 Theme', themeGrid, h('div.row', h('span', 'Accent color'), accent, h('button.btn.sm', { on: { click: () => { st.accent = ''; s.touch(); MS.applySettings(); } } }, 'Reset accent'))),
        section('🧑 Profile & display', name, h('div.row', h('span', 'Text size'), font, fl), h('label.row', h('input', { type: 'checkbox', checked: !!st.reduceMotion, on: { change: (e) => { st.reduceMotion = e.target.checked; s.touch(); MS.applySettings(); } } }), 'Reduce motion'), h('label.row', h('input', { type: 'checkbox', checked: !!st.collapsed, on: { change: (e) => { st.collapsed = e.target.checked; s.touch(); MS.applySettings(); } } }), 'Compact sidebar')),
        section('💾 Backup & restore', h('p.muted.small', { style: { margin: 0 } }, 'Everything lives in this browser. Download a backup to move it to another device or keep it safe.'),
          h('div.row', { style: { flexWrap: 'wrap' } },
            h('button.btn.primary', { on: { click: async () => { MS.download(`megastudio-backup-${MS.isoDate()}.json`, JSON.stringify(await exportAll()), 'application/json'); MS.toast('Backup downloaded', 'good'); } } }, '⬇ Export backup'),
            h('button.btn', { on: { click: async () => { const f = await MS.pickFile('.json,application/json'); if (!f) return; try { const data = JSON.parse(await MS.readText(f)); if (!(await MS.confirm('Restore backup?', 'This replaces all current data with the backup from ' + (data.exported || 'unknown date') + '.', 'Restore'))) return; await importAll(data); MS.toast('Restored — reloading…', 'good'); setTimeout(() => location.reload(), 700); } catch (e) { MS.toast('Restore failed: ' + e.message, 'bad'); } } } }, '⬆ Restore backup'),
            persistBtn), storageEl),
        section('🧨 Danger zone', h('div.row', h('button.btn.danger', { on: { click: async () => { if (!(await MS.confirm('Erase everything?', 'All notes, boards, events, sheets, files and settings will be deleted from this browser. Export a backup first if you want to keep anything.', 'Erase all'))) return; await MS.db.clear(); await MS.db.files.clear(); localStorage.clear(); location.hash = ''; location.reload(); } } }, 'Erase all data'))),
        section('ℹ️ About', h('div', `MegaStudio v${MS.version} — ${MS.apps.length} apps, ${MS.commands.length} commands.`), h('div.small.muted', 'An all-in-one productivity & creativity studio that runs entirely in your browser, works offline, and can be installed as an app. No accounts, no servers, no tracking.'), h('div.row', { style: { flexWrap: 'wrap' } }, h('button.btn', { on: { click: () => MS.commands.find((c) => c.id === 'install').run() } }, '📲 Install app'), h('button.btn', { on: { click: () => MS.commands.find((c) => c.id === 'help').run() } }, '⌨ Shortcuts'), h('a.btn', { href: 'https://github.com/Kansop/megastudio', target: '_blank', rel: 'noopener', style: { textDecoration: 'none', color: 'inherit' } }, '★ Source on GitHub')))));
    },
  });
})();
