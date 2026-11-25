/* Onboarding tour: spotlight walkthrough on first visit + "What's new" + command to replay */
(function () {
  const { h } = MS;
  const isMobile = () => matchMedia('(max-width:820px)').matches;
  const STEPS = [
    { title: 'Welcome to MegaStudio ✨', body: () => `One app, ${MS.apps.length} apps inside: notes, docs, spreadsheets, a graphing calculator, music, video, 3D, maps, ${Object.keys(MS.arcade?.GAMES || {}).length} games and more. Everything runs in your browser and saves on this device — no account needed.` },
    { target: () => (isMobile() ? '#sidebar' : '#nav'), before: () => isMobile() && document.body.classList.add('nav-open'), after: () => document.body.classList.remove('nav-open'), title: 'All your apps', body: () => 'Apps are grouped into Productivity, Create, Play and Tools. Click a group title to fold it away.' },
    { target: () => (isMobile() ? '#menu-btn' : '#palette-btn'), title: 'Search & run anything', body: () => 'Press Ctrl/⌘ K to search apps, notes, cards, events and files — or type “=” to do math, like “=sqrt(2)*10”.' },
    { target: () => '#theme-btn', title: 'Make it yours', body: () => '7 themes plus a custom accent color in Settings. Ctrl+Shift+L cycles themes.' },
    { target: () => '#help-btn', title: 'Keyboard shortcuts', body: () => 'Press ? any time for the full list. Alt+1…9 jumps straight to your top apps.' },
    { target: () => '#view', title: 'Your dashboard', body: () => 'Your day at a glance: clock, agenda, boards, recent notes and quick capture.' },
    { title: 'Where to start? 🚀', body: () => 'Pick something to try — you can replay this tour from the command palette (“Take the tour”).', picks: [['notes', '📝 Notes'], ['graph', '📈 Graphing Calc'], ['music', '🎹 Music Studio'], ['arcade', '🕹 Arcade'], ['voxel', '🧊 Voxel 3D'], ['writer', '✍️ Writer']] },
  ];
  let active = null;
  function start() {
    if (active) return; let i = 0;
    const shade = h('div', { style: { position: 'fixed', zIndex: 90, borderRadius: '12px', boxShadow: '0 0 0 9999px rgba(5,6,15,.62)', transition: 'all .25s ease', pointerEvents: 'none' } });
    const ring = h('div', { style: { position: 'fixed', zIndex: 91, borderRadius: '12px', border: '2px solid var(--accent)', transition: 'all .25s ease', pointerEvents: 'none' } });
    const card = h('div.card', { role: 'dialog', 'aria-live': 'polite', style: { position: 'fixed', zIndex: 92, width: 'min(360px, 92vw)', boxShadow: 'var(--shadow)', transition: 'top .25s, left .25s' } });
    const blocker = h('div', { style: { position: 'fixed', inset: 0, zIndex: 89 } });
    document.body.append(blocker, shade, ring, card);
    const finish = async () => { STEPS[i]?.after?.(); [blocker, shade, ring, card].forEach((e) => e.remove()); document.removeEventListener('keydown', kd, true); removeEventListener('resize', place); active = null; const m = await MS.store('meta', { recent: [], opened: {} }); m.data.toured = true; m.touch(); };
    const kd = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(); } else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); go(i + 1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); go(i - 1); } };
    document.addEventListener('keydown', kd, true); addEventListener('resize', place);
    function place() {
      const s = STEPS[i]; const el = s.target && document.querySelector(s.target());
      const r = el ? el.getBoundingClientRect() : null; const pad = 6;
      if (r && r.width) { Object.assign(shade.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px', opacity: 1 }); Object.assign(ring.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px', opacity: 1 }); }
      else { Object.assign(shade.style, { left: innerWidth / 2 + 'px', top: innerHeight / 2 + 'px', width: '0px', height: '0px' }); ring.style.opacity = 0; }
      const cw = card.offsetWidth, ch = card.offsetHeight; let x, y;
      if (!r || !r.width) { x = (innerWidth - cw) / 2; y = (innerHeight - ch) / 2; }
      else if (r.width > innerWidth * 0.6) { x = r.left + (r.width - cw) / 2; y = r.top + Math.min(r.height / 3, 120); }
      else if (r.right + cw + 24 < innerWidth) { x = r.right + 18; y = r.top + r.height / 2 - ch / 2; }
      else if (r.bottom + ch + 20 < innerHeight) { x = r.left + r.width / 2 - cw / 2; y = r.bottom + 16; }
      else { x = r.left + r.width / 2 - cw / 2; y = r.top - ch - 16; }
      card.style.left = MS.clamp(x, 8, innerWidth - cw - 8) + 'px'; card.style.top = MS.clamp(y, 8, innerHeight - ch - 8) + 'px';
    }
    function go(n) {
      if (n < 0) return; STEPS[i]?.after?.(); if (n >= STEPS.length) return finish(); i = n; const s = STEPS[i]; s.before?.();
      card.innerHTML = '';
      card.append(...[h('div.row', h('strong', { style: { fontSize: '16px' } }, s.title), h('div.spacer'), h('span.small.muted', `${i + 1} / ${STEPS.length}`)),
        h('p', { style: { margin: '8px 0 12px', lineHeight: 1.5 } }, s.body()),
        s.picks ? h('div.row', { style: { flexWrap: 'wrap', marginBottom: '12px' } }, s.picks.filter(([id]) => MS.appMap[id]).map(([id, l]) => h('button.btn.sm', { on: { click: () => { finish(); MS.go(id); } } }, l))) : null,
        h('div.row', h('div.row', { style: { gap: '4px' } }, STEPS.map((_, k) => h('span', { style: { width: k === i ? '18px' : '7px', height: '7px', borderRadius: '9px', background: k === i ? 'var(--accent)' : 'var(--line)', transition: 'width .2s' } }))), h('div.spacer'),
          h('button.btn.sm', { on: { click: finish } }, 'Skip'), i > 0 ? h('button.btn.sm', { on: { click: () => go(i - 1) } }, 'Back') : null,
          h('button.btn.sm.primary', { on: { click: () => go(i + 1) } }, i === STEPS.length - 1 ? 'Done' : 'Next →'))].filter(Boolean));
      requestAnimationFrame(() => setTimeout(place, s.before ? 220 : 0));
    }
    active = { finish }; go(0);
  }
  MS.tour = { start };
  MS.command({ id: 'tour', title: 'Take the tour', icon: '🧭', run: () => { if (MS.current() !== 'dashboard') MS.go('dashboard'); setTimeout(start, 300); } });
  const wait = setInterval(async () => {
    if (!MS.booted) return; clearInterval(wait);
    if (navigator.webdriver) return;
    const m = await MS.store('meta', { recent: [], opened: {} });
    if (m.data.toured) return;
    // existing users (who've already opened apps) get a gentle nudge instead of an interrupting tour
    if ((m.data.recent || []).length > 1) { m.data.toured = true; m.touch(); setTimeout(() => MS.toast('✨ New here or missed what\'s new? Press Ctrl+K and run "Take the tour"'), 1500); return; }
    setTimeout(start, 600);
  }, 100);
})();
