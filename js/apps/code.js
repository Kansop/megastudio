/* Code Lab: HTML/CSS/JS playground with syntax highlighting, live preview, console, projects, templates */
(function () {
  const { h, esc } = MS;
  const T = {
    'Hello world': { html: '<h1>Hello, MegaStudio 👋</h1>\n<p>Edit the HTML, CSS and JS tabs — the preview updates live.</p>\n<button id="b">Click me</button>\n<p id="out"></p>', css: 'body { font-family: system-ui; padding: 2rem; background: linear-gradient(135deg,#7c5cff,#ff4fa3); color: white; min-height: 100vh; margin: 0; }\nbutton { font-size: 1.2rem; padding: .6rem 1.2rem; border-radius: 12px; border: 0; cursor: pointer; }', js: "let n = 0;\ndocument.getElementById('b').onclick = () => {\n  n++;\n  document.getElementById('out').textContent = `Clicked ${n} time${n === 1 ? '' : 's'} 🎉`;\n  console.log('clicks:', n);\n};" },
    'Canvas particles': { html: '<canvas id="c"></canvas>', css: 'html,body{margin:0;height:100%;background:#0b0b1a;overflow:hidden}canvas{display:block}', js: "const c = document.getElementById('c'), g = c.getContext('2d');\nconst fit = () => { c.width = innerWidth; c.height = innerHeight; }; fit(); onresize = fit;\nconst P = Array.from({ length: 160 }, () => ({ x: Math.random() * c.width, y: Math.random() * c.height, vx: (Math.random() - .5) * 2, vy: (Math.random() - .5) * 2, h: Math.random() * 360 }));\nlet mx = c.width / 2, my = c.height / 2; onmousemove = (e) => { mx = e.clientX; my = e.clientY; };\n(function loop() {\n  g.fillStyle = 'rgba(11,11,26,.2)'; g.fillRect(0, 0, c.width, c.height);\n  for (const p of P) {\n    const dx = mx - p.x, dy = my - p.y, d = Math.hypot(dx, dy) + 1;\n    p.vx += dx / d * .05; p.vy += dy / d * .05; p.vx *= .99; p.vy *= .99; p.x += p.vx; p.y += p.vy; p.h += .5;\n    g.fillStyle = `hsl(${p.h},90%,60%)`; g.beginPath(); g.arc(p.x, p.y, 2.5, 0, 7); g.fill();\n  }\n  requestAnimationFrame(loop);\n})();" },
    'Todo app': { html: '<main>\n  <h1>✅ Todos</h1>\n  <form id="f"><input id="i" placeholder="What needs doing?" autofocus><button>Add</button></form>\n  <ul id="l"></ul>\n</main>', css: 'body{font-family:system-ui;background:#f4f5fb;display:grid;place-items:start center;padding-top:40px}main{width:360px;background:white;padding:20px;border-radius:16px;box-shadow:0 10px 30px #0001}form{display:flex;gap:8px}input{flex:1;padding:8px;border:1px solid #ddd;border-radius:8px}li{padding:6px 0;cursor:pointer}li.done{text-decoration:line-through;color:#999}', js: "const todos = JSON.parse(localStorage.todos || '[]');\nconst render = () => { l.innerHTML = ''; todos.forEach((t, i) => { const li = document.createElement('li'); li.textContent = t.text; li.className = t.done ? 'done' : ''; li.onclick = () => { t.done = !t.done; save(); }; l.append(li); }); };\nconst save = () => { localStorage.todos = JSON.stringify(todos); render(); };\nf.onsubmit = (e) => { e.preventDefault(); if (i.value.trim()) todos.push({ text: i.value.trim(), done: false }); i.value = ''; save(); };\nrender();" },
    'CSS art': { html: '<div class="sun"></div><div class="hill a"></div><div class="hill b"></div>', css: 'body{margin:0;height:100vh;background:linear-gradient(#ff9a8b,#ff6a88 40%,#ff99ac);overflow:hidden}\n.sun{position:absolute;width:180px;height:180px;border-radius:50%;background:#ffe29a;left:50%;top:22%;transform:translateX(-50%);box-shadow:0 0 80px #ffe29a;animation:rise 6s ease-in-out infinite alternate}\n.hill{position:absolute;bottom:-40%;width:120%;height:70%;border-radius:50%}\n.a{left:-30%;background:#6a4c93}.b{right:-40%;background:#3d2c6b}\n@keyframes rise{to{top:12%}}', js: '' },
    Blank: { html: '', css: '', js: '' },
  };
  let store;
  const getStore = async () => (store = store || (await MS.store('code', () => ({ projects: [{ id: 'p1', name: 'Hello world', ...T['Hello world'], updated: Date.now() }], active: 'p1' }))));
  // --- tiny highlighter ---
  const KW = /\b(const|let|var|function|return|if|else|for|while|do|break|continue|new|class|extends|import|from|export|default|async|await|try|catch|finally|throw|typeof|instanceof|in|of|switch|case|this|null|undefined|true|false|yield)\b/g;
  function hl(src, lang) {
    let s = esc(src);
    if (lang === 'js') {
      const parts = []; const keep = (cls) => (m) => (parts.push(`<span class="${cls}">${m}</span>`), String.fromCharCode(0xE000 + parts.length - 1));
      s = s.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, keep('c')).replace(/(&quot;|&#39;|`)(?:(?!\1)[\s\S])*?\1/g, keep('s'));
      s = s.replace(KW, '<span class="k">$1</span>').replace(/(?<![#\w])(\d+\.?\d*)\b/g, '<span class="n">$1</span>').replace(/([a-zA-Z_$][\w$]*)(?=\()/g, '<span class="f">$1</span>');
      s = s.replace(/[\uE000-\uF8FF]/g, (ch) => parts[ch.charCodeAt(0) - 0xE000]);
    } else if (lang === 'css') {
      s = s.replace(/\/\*[\s\S]*?\*\//g, '<span class="c">$&</span>').replace(/([\w-]+)(\s*:)(?![^{]*\{)/g, '<span class="k">$1</span>$2').replace(/(#[0-9a-fA-F]{3,8})\b/g, '<span class="n">$1</span>').replace(/(^|[}\n])([^{}\n]+)(?=\{)/g, '$1<span class="f">$2</span>');
    } else {
      s = s.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="c">$1</span>').replace(/(&lt;\/?)([\w-]+)/g, '$1<span class="k">$2</span>').replace(/([\w-]+)=(&quot;[^&]*&quot;)/g, '<span class="f">$1</span>=<span class="s">$2</span>');
    }
    return s + '\n';
  }
  const style = h('style', `.code-ed{position:relative;flex:1;min-height:0;overflow:hidden;background:var(--bg)}
.code-ed pre,.code-ed textarea{position:absolute;inset:0;margin:0;padding:12px 12px 12px 52px;font:13px/1.55 var(--mono);white-space:pre;overflow:auto;tab-size:2;border:0;outline:none}
.code-ed textarea{color:transparent;background:transparent;caret-color:var(--text);resize:none}
.code-ed pre{pointer-events:none;color:var(--text)}
.code-ed .gutter{position:absolute;left:0;top:0;bottom:0;width:42px;padding-top:12px;text-align:right;font:13px/1.55 var(--mono);color:var(--muted);background:var(--panel);border-right:1px solid var(--line);overflow:hidden;padding-right:6px;user-select:none}
.code-ed .k{color:#c792ea}.code-ed .s{color:#c3e88d}.code-ed .c{color:#697098;font-style:italic}.code-ed .n{color:#f78c6c}.code-ed .f{color:#82aaff}
[data-theme=daylight] .code-ed .k,[data-theme=solar] .code-ed .k{color:#7c3aed}[data-theme=daylight] .code-ed .s,[data-theme=solar] .code-ed .s{color:#16803c}[data-theme=daylight] .code-ed .f,[data-theme=solar] .code-ed .f{color:#1d4ed8}[data-theme=daylight] .code-ed .n,[data-theme=solar] .code-ed .n{color:#c2410c}
.console-line{font:12px/1.5 var(--mono);padding:2px 10px;border-bottom:1px solid var(--line);white-space:pre-wrap}.console-line.error{color:var(--bad)}.console-line.warn{color:var(--warn)}`);
  MS.codeEditor = function (value, lang, onChange) {
    const ta = h('textarea', { spellcheck: false, value, autocapitalize: 'off' }); const pre = h('pre'); const gutter = h('div.gutter');
    const wrap = h('div.code-ed', gutter, pre, ta);
    const sync = () => { pre.innerHTML = hl(ta.value, lang); const n = ta.value.split('\n').length; if (gutter.childElementCount !== n) gutter.innerHTML = Array.from({ length: n }, (_, i) => i + 1).join('<br>'); pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft; gutter.scrollTop = ta.scrollTop; };
    ta.addEventListener('input', () => { sync(); onChange && onChange(ta.value); });
    ta.addEventListener('scroll', () => { pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft; gutter.scrollTop = ta.scrollTop; });
    ta.addEventListener('keydown', (e) => {
      const pairs = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '`': '`' };
      if (e.key === 'Tab') { e.preventDefault(); ta.setRangeText('  ', ta.selectionStart, ta.selectionEnd, 'end'); ta.dispatchEvent(new Event('input')); }
      else if (e.key === 'Enter') { const a = ta.value.lastIndexOf('\n', ta.selectionStart - 1) + 1; const ind = ta.value.slice(a).match(/^\s*/)[0]; const prev = ta.value[ta.selectionStart - 1]; const nxt = ta.value[ta.selectionStart]; e.preventDefault(); if ('{[('.includes(prev) && prev && '}])'.includes(nxt) && nxt) { ta.setRangeText('\n' + ind + '  \n' + ind, ta.selectionStart, ta.selectionEnd, 'start'); ta.selectionStart = ta.selectionEnd = ta.selectionStart + ind.length + 3; } else ta.setRangeText('\n' + ind + ('{[('.includes(prev) && prev ? '  ' : ''), ta.selectionStart, ta.selectionEnd, 'end'); ta.dispatchEvent(new Event('input')); }
      else if (pairs[e.key] && ta.selectionStart === ta.selectionEnd && lang !== 'html') { e.preventDefault(); const p = ta.selectionStart; ta.setRangeText(e.key + pairs[e.key], p, p); ta.selectionStart = ta.selectionEnd = p + 1; ta.dispatchEvent(new Event('input')); }
      else if ((e.ctrlKey || e.metaKey) && e.key === '/') { e.preventDefault(); const a = ta.value.lastIndexOf('\n', ta.selectionStart - 1) + 1; const pfx = lang === 'js' ? '// ' : ''; if (!pfx) return; if (ta.value.slice(a, a + 3) === pfx) ta.setRangeText('', a, a + 3, 'end'); else ta.setRangeText(pfx, a, a, 'end'); ta.dispatchEvent(new Event('input')); }
    });
    sync();
    return { el: wrap, ta, set(v) { ta.value = v; sync(); }, get: () => ta.value };
  };
  const buildDoc = (p, withConsole = true) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${p.css}</style>${withConsole ? `<script>(function(){const send=(t,a)=>parent.postMessage({__ms:1,t,a:a.map(x=>{try{return typeof x==='object'?JSON.stringify(x):String(x)}catch(e){return String(x)}})},'*');['log','info','warn','error'].forEach(k=>{const o=console[k];console[k]=(...a)=>{send(k,a);o.apply(console,a)}});addEventListener('error',e=>send('error',[e.message+' (line '+e.lineno+')']));addEventListener('unhandledrejection',e=>send('error',['Unhandled: '+e.reason]));})();<\/script>` : ''}</head><body>${p.html}<script>${p.js.replace(/<\/script/gi, '<\\/script')}<\/script></body></html>`;
  MS.register({
    id: 'code', name: 'Code Lab', icon: '💻', group: 'Develop', desc: 'HTML/CSS/JS playground', keywords: 'code html css javascript playground codepen editor ide',
    async mount(view) {
      const s = await getStore(); view.append(style.cloneNode(true)); let tab = 'html', auto = true;
      const proj = () => s.data.projects.find((p) => p.id === s.data.active) || s.data.projects[0];
      const frame = h('iframe', { sandbox: 'allow-scripts allow-modals allow-forms allow-popups', style: { flex: 1, border: 0, background: '#fff', width: '100%' }, title: 'Preview' });
      const cons = h('div', { style: { height: '140px', overflow: 'auto', borderTop: '1px solid var(--line)', background: 'var(--panel)' } });
      const editors = {};
      const edHost = h('div', { style: { flex: 1, display: 'flex', minHeight: 0 } });
      const tabBtns = ['html', 'css', 'js'].map((t) => h('button.btn.sm', { on: { click: () => showTab(t) } }, t.toUpperCase()));
      const showTab = (t) => { tab = t; tabBtns.forEach((b) => b.classList.toggle('on', b.textContent.toLowerCase() === t)); edHost.innerHTML = ''; edHost.append(editors[t].el); editors[t].ta.focus(); };
      const run = () => { cons.innerHTML = ''; frame.srcdoc = buildDoc(proj()); };
      const runSoon = MS.debounce(() => auto && run(), 600);
      const projSel = h('select.input', { on: { change: () => { s.data.active = projSel.value; s.touch(); load(); } } });
      const load = () => { const p = proj(); projSel.innerHTML = ''; s.data.projects.forEach((x) => projSel.append(h('option', { value: x.id, selected: x.id === p.id }, x.name))); ['html', 'css', 'js'].forEach((k) => editors[k].set(p[k])); run(); };
      ['html', 'css', 'js'].forEach((k) => (editors[k] = MS.codeEditor('', k, (v) => { proj()[k] = v; proj().updated = Date.now(); s.touch(); runSoon(); })));
      const onMsg = (e) => { if (e.source !== frame.contentWindow || !e.data || !e.data.__ms) return; cons.append(h('div.console-line', { class: e.data.t }, (e.data.t === 'error' ? '✖ ' : e.data.t === 'warn' ? '⚠ ' : '› ') + e.data.a.join(' '))); cons.scrollTop = cons.scrollHeight; };
      addEventListener('message', onMsg);
      const autoBox = h('label.row.small', h('input', { type: 'checkbox', checked: true, on: { change: (e) => (auto = e.target.checked) } }), 'Auto-run');
      const left = h('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, borderRight: '1px solid var(--line)' } }, h('div.row', { style: { padding: '6px 10px', borderBottom: '1px solid var(--line)', background: 'var(--panel)' } }, tabBtns, h('div.spacer'), autoBox), edHost);
      const right = h('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 } }, frame, h('div.row.small', { style: { padding: '4px 10px', background: 'var(--panel2)', borderTop: '1px solid var(--line)' } }, h('strong', 'Console'), h('div.spacer'), h('button.btn.sm', { on: { click: () => (cons.innerHTML = '') } }, 'Clear')), cons);
      view.append(h('div', { style: { display: 'flex', height: '100%' } }, left, right));
      MS.setActions(projSel,
        h('button.btn', { on: { click: async () => { const close = MS.modal(h('div.col', h('h2', 'New project from template'), ...Object.keys(T).map((k) => h('button.btn', { style: { textAlign: 'left' }, on: { click: () => { close(); const p = { id: MS.uid('p'), name: k, ...T[k], updated: Date.now() }; s.data.projects.push(p); s.data.active = p.id; s.touch(); load(); } } }, k)))); } } }, '+ New'),
        h('button.btn', { on: { click: async () => { const n = await MS.prompt('Rename project', proj().name); if (n) { proj().name = n; s.touch(); load(); } } } }, '✎'),
        h('button.btn.danger', { on: { click: async () => { if (s.data.projects.length < 2) return MS.toast('Keep at least one project'); if (await MS.confirm('Delete project?', proj().name, 'Delete')) { s.data.projects = s.data.projects.filter((p) => p !== proj()); s.data.active = s.data.projects[0].id; s.touch(); load(); } } } }, '🗑'),
        h('button.btn.primary', { title: 'Run (Ctrl+Enter)', on: { click: run } }, '▶ Run'),
        h('button.btn', { on: { click: () => { const w = window.open(); if (w) { w.document.write(buildDoc(proj(), false)); w.document.close(); } } } }, '↗ Open'),
        h('button.btn', { on: { click: () => MS.download(proj().name.replace(/\W+/g, '-') + '.html', buildDoc(proj(), false), 'text/html') } }, '⬇ HTML'),
        h('button.btn', { on: { click: async () => { const p = proj(); const html = buildDoc(p, false); await MS.db.files.put({ id: MS.uid('f'), name: p.name + '.html', type: 'text/html', folder: '/Code', size: html.length, data: html, created: Date.now(), updated: Date.now() }); MS.toast('Saved to Files › /Code', 'good'); } } }, '💾 Files'));
      const keys = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); } if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); MS.toast('Saved automatically ✓'); } };
      document.addEventListener('keydown', keys);
      load(); showTab('html');
      return { unmount: () => { removeEventListener('message', onMsg); document.removeEventListener('keydown', keys); } };
    },
  });
})();
