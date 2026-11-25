/* Slides: write decks in Markdown (--- between slides), live thumbnails, themes, present full-screen, export HTML */
(function () {
  const { h } = MS;
  const DEMO = `# MegaStudio Slides 🎤
Write your deck in **Markdown**

---

## How it works
- Separate slides with \`---\`
- Use headings, lists, images, code, tables
- Press **Present** (or F5) for full screen
- Arrow keys / click to advance

Note: lines starting with "Note:" are speaker notes.

---

## Code looks great
\`\`\`js
const studio = ['notes', 'sheets', 'paint', 'music'];
studio.forEach(app => console.log('🚀', app));
\`\`\`

---

## Compare things

| App | Superpower |
|---|---|
| Sheets | Formulas |
| Paint | Layers |
| Music | Beats |

---

# Thank you! 🎉
> Made in MegaStudio`;
  const THEMES = { Aurora: 'background:linear-gradient(135deg,#1f1147,#3b1b6b 50%,#6b1d5c);color:#fff', Paper: 'background:#fbfaf7;color:#222', Ocean: 'background:linear-gradient(160deg,#0b2b4a,#0f5a7a);color:#eaf6ff', Sunset: 'background:linear-gradient(135deg,#ff9966,#ff5e62);color:#fff', Midnight: 'background:#0d1117;color:#e6edf3', Mint: 'background:linear-gradient(135deg,#d4fc79,#96e6a1);color:#123' };
  let store;
  const getStore = async () => (store = store || (await MS.store('slides', () => ({ decks: [{ id: 'd1', name: 'Welcome deck', md: DEMO, theme: 'Aurora' }], active: 'd1' }))));
  const split = (md) => md.split(/\n-{3,}\s*\n/).map((s) => { const notes = []; const body = s.split('\n').filter((l) => (/^Note:/i.test(l) ? (notes.push(l.replace(/^Note:\s*/i, '')), false) : true)).join('\n'); return { body, notes: notes.join('\n') }; });
  const slideCSS = `.slide{width:1280px;height:720px;padding:70px 90px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;font:28px/1.45 system-ui,sans-serif;overflow:hidden}.slide h1{font-size:72px;margin:0 0 20px;line-height:1.1}.slide h2{font-size:52px;margin:0 0 24px;border:0}.slide p{margin:10px 0}.slide li{margin:8px 0}.slide pre{background:rgba(0,0,0,.35);padding:22px;border-radius:14px;font-size:22px;color:#f8f8f2}.slide code{font-family:ui-monospace,Menlo,monospace}.slide :not(pre)>code{background:rgba(127,127,127,.25);padding:2px 8px;border-radius:6px}.slide table{border-collapse:collapse;font-size:26px}.slide td,.slide th{border:1px solid rgba(127,127,127,.5);padding:10px 20px}.slide blockquote{border-left:6px solid currentColor;margin:0;padding:6px 24px;opacity:.85}.slide img{max-height:420px;max-width:100%;border-radius:12px}.slide mark{background:#ffe14f;color:#111}.slide .tag{font-size:.7em;padding:2px 10px;border-radius:99px;background:rgba(127,127,127,.25)}`;
  const renderSlide = (sl, theme) => { const d = h('div.slide', { html: MS.md(sl.body) }); d.setAttribute('style', THEMES[theme] || THEMES.Aurora); return d; };
  MS.register({
    id: 'slides', name: 'Slides', icon: '🎤', group: 'Create', desc: 'Markdown presentations', keywords: 'presentation deck powerpoint keynote slides present',
    async mount(view) {
      const s = await getStore(); view.append(h('style', slideCSS)); let cur = 0;
      const deck = () => s.data.decks.find((d) => d.id === s.data.active) || s.data.decks[0];
      const ed = MS.codeEditor ? null : null;
      const ta = h('textarea.input.mono', { style: { flex: 1, resize: 'none', border: 0, borderRadius: 0, padding: '16px', fontSize: '14px', lineHeight: '1.6', background: 'var(--bg)' } });
      const thumbs = h('div', { style: { width: '220px', flex: 'none', overflow: 'auto', borderLeft: '1px solid var(--line)', padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--panel)' } });
      const stage = h('div', { style: { flex: 1.3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', minWidth: 0, background: 'var(--panel2)', gap: '8px' } });
      const notesEl = h('div.small.muted', { style: { maxWidth: '100%' } });
      view.append(h('div', { style: { display: 'flex', height: '100%' } }, h('div', { style: { flex: 1, display: 'flex', minWidth: 0, borderRight: '1px solid var(--line)' } }, ta), stage, thumbs));
      const scaled = (el, w) => { const box = h('div', { style: { width: w + 'px', height: (w * 9) / 16 + 'px', overflow: 'hidden', borderRadius: '8px', boxShadow: 'var(--shadow)', flex: 'none' } }); el.style.transform = `scale(${w / 1280})`; el.style.transformOrigin = '0 0'; box.append(el); return box; };
      function render() {
        const sl = split(deck().md); cur = MS.clamp(cur, 0, sl.length - 1);
        thumbs.innerHTML = ''; sl.forEach((x, i) => { const t = scaled(renderSlide(x, deck().theme), 196); t.style.outline = i === cur ? '3px solid var(--accent)' : ''; t.style.cursor = 'pointer'; t.addEventListener('click', () => { cur = i; render(); }); thumbs.append(h('div.small.muted', i + 1), t); });
        stage.innerHTML = ''; const w = Math.max(280, Math.min(stage.clientWidth - 32, ((stage.clientHeight - 80) * 16) / 9)); stage.append(scaled(renderSlide(sl[cur], deck().theme), w || 600), h('div.row', h('button.btn.sm', { on: { click: () => { cur--; render(); } } }, '‹'), h('span.small', `${cur + 1} / ${sl.length}`), h('button.btn.sm', { on: { click: () => { cur++; render(); } } }, '›')), notesEl); notesEl.textContent = sl[cur].notes ? '🗒 ' + sl[cur].notes : '';
      }
      const renderSoon = MS.debounce(render, 250);
      ta.addEventListener('input', () => { deck().md = ta.value; s.touch(); const before = ta.value.slice(0, ta.selectionStart); cur = (before.match(/\n-{3,}\s*\n/g) || []).length; renderSoon(); });
      ta.addEventListener('click', () => { const before = ta.value.slice(0, ta.selectionStart); const c = (before.match(/\n-{3,}\s*\n/g) || []).length; if (c !== cur) { cur = c; render(); } });
      const deckSel = h('select.input', { on: { change: () => { s.data.active = deckSel.value; s.touch(); load(); } } });
      const themeSel = h('select.input', { on: { change: () => { deck().theme = themeSel.value; s.touch(); render(); } } }, Object.keys(THEMES).map((t) => h('option', t)));
      const load = () => { deckSel.innerHTML = ''; s.data.decks.forEach((d) => deckSel.append(h('option', { value: d.id, selected: d.id === deck().id }, d.name))); themeSel.value = deck().theme; ta.value = deck().md; cur = 0; render(); };
      function present() {
        const sl = split(deck().md); let i = cur; const ov = h('div', { style: { position: 'fixed', inset: 0, background: '#000', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'none' } }); const css = h('style', slideCSS);
        const counter = h('div', { style: { position: 'fixed', right: '18px', bottom: '12px', color: '#fff8', font: '14px system-ui', zIndex: 101 } });
        const show = () => { ov.innerHTML = ''; const sc = Math.min(innerWidth / 1280, innerHeight / 720); const el = renderSlide(sl[i], deck().theme); el.style.transform = `scale(${sc})`; el.style.flex = 'none'; el.style.animation = 'pop .35s ease'; ov.append(css, el, counter); counter.textContent = `${i + 1} / ${sl.length}`; };
        const key = (e) => { if (['ArrowRight', ' ', 'PageDown', 'Enter'].includes(e.key)) { e.preventDefault(); i = Math.min(sl.length - 1, i + 1); show(); } else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); i = Math.max(0, i - 1); show(); } else if (e.key === 'Escape') close(); else if (e.key === 'Home') { i = 0; show(); } else if (e.key === 'End') { i = sl.length - 1; show(); } };
        const close = () => { document.removeEventListener('keydown', key, true); removeEventListener('resize', show); ov.remove(); if (document.fullscreenElement) document.exitFullscreen(); cur = i; render(); };
        ov.addEventListener('click', (e) => { i = e.clientX < innerWidth / 3 ? Math.max(0, i - 1) : Math.min(sl.length - 1, i + 1); show(); });
        document.addEventListener('keydown', key, true); addEventListener('resize', show); document.body.append(ov); show(); ov.requestFullscreen?.().catch(() => {});
        document.addEventListener('fullscreenchange', function fc() { if (!document.fullscreenElement && ov.isConnected) { document.removeEventListener('fullscreenchange', fc); close(); } });
      }
      const exportHTML = () => { const sl = split(deck().md); const html = `<!doctype html><meta charset="utf-8"><title>${MS.esc(deck().name)}</title><style>html,body{margin:0;background:#000;height:100%;overflow:hidden;display:flex;align-items:center;justify-content:center}${slideCSS}.slide{display:none;flex:none}.slide.on{display:flex}</style>${sl.map((x, i) => `<div class="slide${i ? '' : ' on'}" style="${THEMES[deck().theme]}">${MS.md(x.body)}</div>`).join('')}<script>let i=0;const S=[...document.querySelectorAll('.slide')];const fit=()=>S.forEach(s=>s.style.transform='scale('+Math.min(innerWidth/1280,innerHeight/720)+')');fit();onresize=fit;const go=n=>{S[i].classList.remove('on');i=Math.max(0,Math.min(S.length-1,n));S[i].classList.add('on')};onkeydown=e=>{if(['ArrowRight',' ','PageDown'].includes(e.key))go(i+1);if(['ArrowLeft','PageUp'].includes(e.key))go(i-1)};onclick=e=>go(e.clientX<innerWidth/3?i-1:i+1)<\/script>`; MS.download(deck().name.replace(/\W+/g, '-') + '.html', html, 'text/html'); };
      MS.setActions(deckSel, h('button.btn', { on: { click: async () => { const n = await MS.prompt('Deck name', 'New deck'); if (!n) return; const d = { id: MS.uid('d'), name: n, md: `# ${n}\n\n---\n\n## Slide 2\n- Point one\n- Point two`, theme: 'Aurora' }; s.data.decks.push(d); s.data.active = d.id; s.touch(); load(); } } }, '+'),
        h('button.btn.danger', { on: { click: async () => { if (s.data.decks.length < 2) return MS.toast('Keep at least one deck'); if (await MS.confirm('Delete deck?', deck().name, 'Delete')) { s.data.decks = s.data.decks.filter((d) => d !== deck()); s.data.active = s.data.decks[0].id; s.touch(); load(); } } } }, '🗑'),
        themeSel, h('button.btn', { on: { click: () => { const sl = split(deck().md); const w = window.open('', '_blank'); if (!w) return; w.document.write(`<title>${MS.esc(deck().name)}</title><style>${slideCSS}@page{size:1280px 720px;margin:0}body{margin:0}.slide{page-break-after:always}</style>` + sl.map((x) => `<div class="slide" style="${THEMES[deck().theme]};-webkit-print-color-adjust:exact;print-color-adjust:exact">${MS.md(x.body)}</div>`).join('')); w.document.close(); setTimeout(() => w.print(), 300); } } }, '🖨 PDF'),
        h('button.btn', { on: { click: exportHTML } }, '⬇ HTML'), h('button.btn.primary', { title: 'Present (F5)', on: { click: present } }, '▶ Present'));
      const keys = (e) => { if (e.key === 'F5') { e.preventDefault(); present(); } };
      document.addEventListener('keydown', keys); const ro = new ResizeObserver(MS.debounce(render, 100)); ro.observe(stage);
      load();
      return { unmount: () => { document.removeEventListener('keydown', keys); ro.disconnect(); } };
    },
  });
})();
