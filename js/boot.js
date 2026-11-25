/* Boot: navigation, global commands, settings, service worker */
(async function () {
  const { h } = MS;
  const settings = await MS.store('settings', MS.defaultSettings());
  const applySettings = () => {
    const s = settings.data;
    document.documentElement.dataset.theme = s.theme || 'midnight';
    document.body.classList.toggle('collapsed', !!s.collapsed);
    if (s.accent) { document.documentElement.style.setProperty('--accent', s.accent); } else document.documentElement.style.removeProperty('--accent');
    document.documentElement.style.fontSize = (s.fontSize || 14) + 'px';
    document.body.style.fontSize = (s.fontSize || 14) + 'px';
    document.body.classList.toggle('reduce-motion', !!s.reduceMotion);
  };
  MS.applySettings = applySettings; applySettings();

  // nav
  const nav = document.getElementById('nav');
  const groups = {};
  MS.apps.filter((a) => !a.hidden).forEach((a) => (groups[a.group] = groups[a.group] || []).push(a));
  const order = ['Home', 'Productivity', 'Create', 'Develop', 'Play', 'Tools', 'System', 'Apps'];
  Object.keys(groups).sort((a, b) => order.indexOf(a) - order.indexOf(b)).forEach((g) => {
    const closed = (settings.data.navClosed || []).includes(g);
    const items = groups[g].map((a) => h('button.nav-item', { class: closed ? 'gone' : '', 'data-id': a.id, title: a.name, on: { click: () => MS.go(a.id) } }, h('span.ico', a.icon), h('span.lbl', a.name)));
    const head = h('div.nav-group', { class: closed ? 'closed' : '', title: 'Click to collapse/expand', on: { click: () => { const nc = new Set(settings.data.navClosed || []); const now = !nc.has(g); now ? nc.add(g) : nc.delete(g); settings.data.navClosed = [...nc]; settings.touch(); head.classList.toggle('closed', now); items.forEach((i) => i.classList.toggle('gone', now && !i.classList.contains('active'))); } } }, g + ' · ' + groups[g].length);
    nav.append(head, ...items);
  });

  const toggleCollapse = () => { settings.data.collapsed = !settings.data.collapsed; settings.touch(); applySettings(); };
  const cycleTheme = () => { const i = MS.themes.indexOf(settings.data.theme); MS.setTheme(MS.themes[(i + 1) % MS.themes.length]); MS.toast('Theme: ' + MS.themes[(i + 1) % MS.themes.length]); };
  document.getElementById('palette-btn').onclick = () => MS.openPalette();
  document.getElementById('collapse-btn').onclick = toggleCollapse;
  document.getElementById('theme-btn').onclick = cycleTheme;
  document.getElementById('menu-btn').onclick = () => document.body.classList.toggle('nav-open');
  document.getElementById('help-btn').onclick = () => showShortcuts();
  document.getElementById('view').addEventListener('click', () => document.body.classList.remove('nav-open'));

  function showShortcuts() {
    const rows = MS.commands.filter((c) => c.key).map((c) => h('tr', h('td', c.title), h('td.muted.small', c.group || 'Global'), h('td', h('kbd', [].concat(c.key)[0].replace(/mod/i, navigator.platform.includes('Mac') ? '⌘' : 'Ctrl')))));
    MS.modal(h('div', h('h2', '⌨  Keyboard shortcuts'), h('table', { style: { width: '100%', borderSpacing: '0 6px' } }, rows), h('p.muted.small', 'Tip: type "=" in the command palette to calculate, e.g. "=sqrt(2)*10".')));
  }

  MS.command({ id: 'palette', title: 'Command palette', key: ['mod+k', 'mod+shift+p'], icon: '🔎', run: () => MS.openPalette() });
  MS.command({ id: 'collapse', title: 'Toggle sidebar', key: 'mod+b', icon: '⇤', run: toggleCollapse });
  MS.command({ id: 'theme', title: 'Cycle theme', key: 'mod+shift+l', icon: '🎨', run: cycleTheme });
  MS.command({ id: 'help', title: 'Show keyboard shortcuts', key: 'shift+?', icon: '⌨', run: showShortcuts });
  MS.command({ id: 'home', title: 'Go to dashboard', key: 'alt+h', icon: '🏠', run: () => MS.go('dashboard') });
  MS.themes.forEach((t) => MS.command({ id: 'theme-' + t, title: 'Theme: ' + t, icon: '🎨', run: () => MS.setTheme(t) }));
  MS.command({ id: 'fullscreen', title: 'Toggle fullscreen', key: 'f11', icon: '⛶', run: () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()) });
  // Alt+1..9 jump to apps
  MS.apps.filter((a) => !a.hidden).slice(0, 9).forEach((a, i) => MS.command({ id: 'jump-' + a.id, title: 'Go to ' + a.name, key: 'alt+' + (i + 1), icon: a.icon, run: () => MS.go(a.id) }));

  // service worker
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing; nw && nw.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) MS.toast('Update ready — reload to get the newest MegaStudio'); });
      });
    }).catch((e) => console.warn('SW failed', e));
  }
  // install prompt
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); MS.installPrompt = e; MS.emit('installable'); });
  MS.command({ id: 'install', title: 'Install MegaStudio as an app', icon: '📲', run: async () => { if (MS.installPrompt) { MS.installPrompt.prompt(); } else MS.toast('Use your browser menu → "Install app" / "Add to Home Screen"'); } });

  window.addEventListener('online', () => MS.toast('Back online', 'good'));
  window.addEventListener('offline', () => MS.toast('Offline — everything keeps working'));
  window.dispatchEvent(new HashChangeEvent('hashchange'));
  document.documentElement.classList.add('ready');
  MS.booted = true;
})();
