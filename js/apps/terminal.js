/* Terminal: a shell that drives the whole studio — files, notes, tasks, events, themes, math, apps */
(function () {
  const { h } = MS;
  const HKEY = 'terminal';
  MS.register({
    id: 'terminal', name: 'Terminal', icon: '⌨️', group: 'Develop', desc: 'A shell for the whole studio', keywords: 'terminal shell console command line cli bash',
    async mount(view) {
      const st = await MS.store(HKEY, () => ({ history: [], aliases: { ll: 'ls', '?': 'help' } }));
      let cwd = '/', hi = st.data.history.length;
      const out = h('div', { style: { whiteSpace: 'pre-wrap', wordBreak: 'break-word' } });
      const promptEl = h('span', { style: { color: 'var(--accent)' } });
      const input = h('input', { spellcheck: false, autocomplete: 'off', style: { flex: 1, background: 'transparent', border: 0, outline: 'none', color: 'inherit', font: 'inherit' } });
      const wrap = h('div', { style: { height: '100%', overflow: 'auto', padding: '14px 18px', fontFamily: 'var(--mono, ui-monospace, Menlo, monospace)', fontSize: '13.5px', lineHeight: '1.55', background: 'var(--bg)' }, on: { click: () => getSelection().toString() || input.focus() } }, out, h('div', { style: { display: 'flex', gap: '8px' } }, promptEl, input));
      view.append(wrap);
      const setPrompt = () => (promptEl.textContent = `you@megastudio:${cwd}$`);
      const print = (txt, color) => { const el = typeof txt === 'string' ? h('div', { style: color ? { color } : {} }, txt) : txt; out.append(el); wrap.scrollTop = wrap.scrollHeight; return el; };
      const err = (t) => print(t, 'var(--bad, #ff5d6c)'); const ok = (t) => print(t, 'var(--good, #3ddc97)');
      const resolve = (p) => { if (!p) return cwd; let parts = (p.startsWith('/') ? p : (cwd === '/' ? '' : cwd) + '/' + p).split('/'); const outp = []; parts.forEach((x) => { if (!x || x === '.') return; if (x === '..') outp.pop(); else outp.push(x); }); return '/' + outp.join('/'); };
      const meta = () => MS.store('files-meta', () => ({ folders: ['/', '/Documents', '/Pictures', '/Music', '/Code', '/Notes'], view: 'grid', sort: 'name' }));
      const allFolders = async () => { const m = await meta(); const files = await MS.db.files.all(); return [...new Set([...m.data.folders, ...files.map((f) => f.folder)])]; };
      const findFile = async (p) => { const full = resolve(p); const i = full.lastIndexOf('/'); const folder = full.slice(0, i) || '/', name = full.slice(i + 1); return (await MS.db.files.all()).find((f) => f.folder === folder && f.name === name); };
      const table = (rows) => { const w = []; rows.forEach((r) => r.forEach((c, i) => (w[i] = Math.max(w[i] || 0, String(c).length)))); return rows.map((r) => r.map((c, i) => String(c).padEnd(w[i] + 2)).join('')).join('\n'); };
      const fmtSize = (n) => (n < 1024 ? n + 'B' : n < 1048576 ? (n / 1024).toFixed(1) + 'K' : (n / 1048576).toFixed(1) + 'M');
      const CMDS = {
        help: { d: 'List commands', run: () => print(table(Object.entries(CMDS).sort().map(([k, v]) => [k, v.d]))) },
        clear: { d: 'Clear the screen', run: () => (out.innerHTML = '') },
        echo: { d: 'Print text', run: (a) => print(a.join(' ')) },
        date: { d: 'Current date & time', run: () => print(new Date().toString()) },
        whoami: { d: 'Who are you', run: async () => { const s = await MS.store('settings', MS.defaultSettings); print(s.data.name || 'you'); } },
        history: { d: 'Command history', run: () => print(st.data.history.slice(-50).map((c, i) => String(i + 1).padStart(4) + '  ' + c).join('\n')) },
        alias: { d: 'alias name=command', run: (a) => { if (!a.length) return print(table(Object.entries(st.data.aliases))); const [k, ...v] = a.join(' ').split('='); st.data.aliases[k.trim()] = v.join('=').trim(); st.touch(); ok('alias set'); } },
        calc: { d: 'Evaluate math (also: = 2+2)', run: (a) => { try { print(String(MS.calc(a.join(' ')))); } catch (e) { err(e.message); } } },
        apps: { d: 'List apps', run: () => print(table(MS.apps.map((x) => [x.id, x.icon + ' ' + x.name, x.desc || '']))) },
        open: { d: 'open <app> [args] — launch an app', run: (a) => { const q = (a[0] || '').toLowerCase(); const app = MS.appMap[q] || MS.apps.find((x) => x.name.toLowerCase().startsWith(q) || x.id.includes(q)); if (!app) return err('no such app: ' + q); ok('opening ' + app.name + '…'); setTimeout(() => MS.go(app.id, ...a.slice(1)), 250); } },
        theme: { d: 'theme [name] — list or switch theme', run: async (a) => { if (!a[0]) return print(MS.themes.join('  ')); if (!MS.themes.includes(a[0])) return err('unknown theme'); await MS.setTheme(a[0]); ok('theme → ' + a[0]); } },
        pwd: { d: 'Print working folder', run: () => print(cwd) },
        cd: { d: 'Change folder', run: async (a) => { const p = resolve(a[0] || '/'); const f = await allFolders(); if (p !== '/' && !f.includes(p) && !f.some((x) => x.startsWith(p + '/'))) return err('cd: no such folder: ' + p); cwd = p; setPrompt(); } },
        ls: { d: 'List files in a folder', run: async (a) => { const p = resolve(a[0]); const folders = (await allFolders()).filter((x) => x !== p && x.startsWith(p === '/' ? '/' : p + '/') && !x.slice(p === '/' ? 1 : p.length + 1).includes('/')); const files = (await MS.db.files.all()).filter((f) => f.folder === p).sort((x, y) => x.name.localeCompare(y.name)); if (!folders.length && !files.length) return print('(empty)', 'var(--muted)'); print(table([...folders.map((x) => ['📁 ' + x.split('/').pop() + '/', '', '']), ...files.map((f) => [MS.filesApi.iconFor(f) + ' ' + f.name, fmtSize(f.size || 0), MS.ago(f.updated || f.created)])])); } },
        mkdir: { d: 'Create a folder', run: async (a) => { if (!a[0]) return err('usage: mkdir <name>'); const m = await meta(); const p = resolve(a[0]); if (!m.data.folders.includes(p)) m.data.folders.push(p); m.touch(); ok('created ' + p); } },
        touch: { d: 'Create an empty text file', run: async (a) => { if (!a[0]) return err('usage: touch <name>'); if (await findFile(a[0])) return; const full = resolve(a[0]); const i = full.lastIndexOf('/'); await MS.db.files.put({ id: MS.uid('f'), name: full.slice(i + 1), type: 'text/plain', folder: full.slice(0, i) || '/', size: 0, data: '', created: Date.now(), updated: Date.now() }); } },
        write: { d: 'write <file> <text…> — write text to a file', run: async (a) => { const [name, ...rest] = a; if (!name) return err('usage: write <file> <text>'); const text = rest.join(' '); let f = await findFile(name); const full = resolve(name); const i = full.lastIndexOf('/'); f = f || { id: MS.uid('f'), name: full.slice(i + 1), type: /\.md$/.test(name) ? 'text/markdown' : 'text/plain', folder: full.slice(0, i) || '/', created: Date.now() }; f.data = text; f.size = text.length; f.updated = Date.now(); await MS.db.files.put(f); ok('wrote ' + text.length + ' chars'); } },
        cat: { d: 'Print a text file', run: async (a) => { const f = await findFile(a[0] || ''); if (!f) return err('cat: not found'); if (!MS.filesApi.isText(f)) return err('cat: binary file (' + f.type + ')'); print(f.data || ''); } },
        rm: { d: 'Delete a file', run: async (a) => { const f = await findFile(a[0] || ''); if (!f) return err('rm: not found'); await MS.db.files.del(f.id); ok('removed ' + f.name); } },
        mv: { d: 'mv <file> <folder|newname>', run: async (a) => { const f = await findFile(a[0] || ''); if (!f || !a[1]) return err('usage: mv <file> <dest>'); const dest = resolve(a[1]); const folders = await allFolders(); if (folders.includes(dest)) f.folder = dest; else { const i = dest.lastIndexOf('/'); f.folder = dest.slice(0, i) || '/'; f.name = dest.slice(i + 1); } f.updated = Date.now(); await MS.db.files.put(f); ok('moved'); } },
        find: { d: 'Search files by name', run: async (a) => { const q = a.join(' ').toLowerCase(); const r = (await MS.db.files.all()).filter((f) => f.name.toLowerCase().includes(q)); print(r.length ? r.map((f) => (f.folder === '/' ? '' : f.folder) + '/' + f.name).join('\n') : 'no matches'); } },
        edit: { d: 'Open a file in Files', run: async (a) => { const f = await findFile(a[0] || ''); if (!f) return err('not found'); MS.go(/^image\//.test(f.type) ? 'photo' : 'files', ...(/^image\//.test(f.type) ? ['file', f.id] : [])); } },
        df: { d: 'Storage usage', run: async () => { const all = await MS.db.files.all(); const e = navigator.storage?.estimate ? await navigator.storage.estimate() : {}; print(`${all.length} files, ${fmtSize(all.reduce((s, f) => s + (f.size || 0), 0))}\nbrowser storage: ${fmtSize(e.usage || 0)} used of ${fmtSize(e.quota || 0)}`); } },
        note: { d: 'note <text> — create a note (no args: list)', run: async (a) => { if (!a.length) { const n = await MS.notesApi.all(); return print(n.slice(0, 20).map((x) => '• ' + x.title + '  ' + MS.ago(x.updated)).join('\n') || 'no notes'); } const n = await MS.notesApi.create('# ' + a.join(' ') + '\n', false); ok('note created: ' + n.title); } },
        todo: { d: 'todo <text> — add a card to your active board (no args: list)', run: async (a) => { const s = await MS.kanbanApi.getStore(); const b = s.data.boards.find((x) => x.id === s.data.active) || s.data.boards[0]; if (!b) return err('no boards'); if (!a.length) return print(b.columns.map((c) => c.name + '\n' + (c.cards.map((k) => '   • ' + k.title).join('\n') || '   (empty)')).join('\n')); const col = b.columns.find((c) => /to ?do/i.test(c.name)) || b.columns[0]; col.cards.push({ id: MS.uid('k'), title: a.join(' '), labels: [], desc: '', checklist: [], due: '' }); s.touch(); ok(`added to ${b.name} › ${col.name}`); } },
        event: { d: 'event <YYYY-MM-DD|today|tomorrow> [HH:MM] <title>', run: async (a) => { if (a.length < 2) return err('usage: event tomorrow 09:30 Dentist'); let [d, ...rest] = a; if (d === 'today') d = MS.isoDate(); else if (d === 'tomorrow') d = MS.isoDate(new Date(Date.now() + 864e5)); if (!/^\d{4}-\d\d-\d\d$/.test(d)) return err('bad date'); let time = ''; if (/^\d\d?:\d\d$/.test(rest[0])) time = rest.shift().padStart(5, '0'); const s = await MS.calendarApi.getStore(); s.data.events.push({ id: MS.uid('e'), title: rest.join(' '), date: d, time, end: '', color: '#7c5cff', repeat: 'none', notes: '' }); s.touch(); ok(`event added on ${d}${time ? ' at ' + time : ''}`); } },
        agenda: { d: 'Today\'s (or N days\') events', run: async (a) => { const n = +a[0] || 1; const lines = []; for (let i = 0; i < n; i++) { const d = MS.isoDate(new Date(Date.now() + i * 864e5)); const ev = await MS.calendarApi.eventsOn(d); if (ev.length) lines.push(d + '\n' + ev.map((e) => '   ' + (e.time || '  ·  ') + '  ' + e.title).join('\n')); } print(lines.join('\n') || 'nothing scheduled'); } },
        qr: { d: 'qr <text> — render a QR code', run: (a) => { try { const c = MS.qrCanvas(a.join(' ') || 'https://kansop.github.io/megastudio/', 4); c.style.margin = '6px 0'; print(h('div', c)); } catch (e) { err(e.message); } } },
        uuid: { d: 'Random UUID', run: () => print(crypto.randomUUID ? crypto.randomUUID() : MS.uid()) },
        rand: { d: 'rand [max] — random integer', run: (a) => print(String(Math.floor(Math.random() * (+a[0] || 100)) + 1)) },
        roll: { d: 'roll 2d6 — dice', run: (a) => { const m = /^(\d*)d(\d+)$/.exec(a[0] || 'd6'); if (!m) return err('usage: roll 3d6'); const r = Array.from({ length: +m[1] || 1 }, () => 1 + Math.floor(Math.random() * +m[2])); print(r.join(' + ') + ' = ' + r.reduce((x, y) => x + y, 0)); } },
        base64: { d: 'base64 [-d] <text>', run: (a) => { try { print(a[0] === '-d' ? decodeURIComponent(escape(atob(a.slice(1).join(' ')))) : btoa(unescape(encodeURIComponent(a.join(' '))))); } catch (e) { err('invalid input'); } } },
        sha256: { d: 'SHA-256 of text', run: async (a) => { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(a.join(' '))); print([...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('')); } },
        wc: { d: 'wc <file> — count lines/words/chars', run: async (a) => { const f = await findFile(a[0] || ''); if (!f) return err('not found'); const t = f.data || ''; print(`${t.split('\n').length} lines  ${(t.match(/\S+/g) || []).length} words  ${t.length} chars`); } },
        timer: { d: 'timer <minutes> — countdown toast', run: (a) => { const m = parseFloat(a[0]); if (!(m > 0)) return err('usage: timer 5'); ok(`⏱ timer set for ${m} min`); setTimeout(() => { MS.toast(`⏰ Timer done (${m} min)`, 'good'); MS.notify && MS.notify('Timer done', `${m} minute timer finished`); }, m * 60000); } },
        fortune: { d: 'A fortune', run: () => print(['Simplicity is prerequisite for reliability. — Dijkstra', 'Make it work, make it right, make it fast. — Kent Beck', 'The best way to predict the future is to invent it. — Alan Kay', 'Talk is cheap. Show me the code. — Linus Torvalds', 'Done is better than perfect.', 'Ship it. 🚀', 'Programs must be written for people to read. — Abelson', 'Small steps, every day.'][Math.floor(Math.random() * 8)]) },
        neofetch: { d: 'System info', run: async () => { const files = await MS.db.files.all(); const notes = await MS.notesApi.all(); print(h('div', { style: { display: 'flex', gap: '24px', alignItems: 'center' } }, h('pre', { style: { margin: 0, color: 'var(--accent)' } }, '  ▄▀▀▀▀▄\n ▐ MS  ▌\n  ▀▄▄▄▄▀\n  MegaStudio'), h('pre', { style: { margin: 0 } }, `OS: MegaStudio (${navigator.platform || 'web'})\nApps: ${MS.apps.length}\nTheme: ${document.documentElement.dataset.theme}\nFiles: ${files.length}\nNotes: ${notes.length}\nScreen: ${screen.width}x${screen.height}\nShell: mega-sh 1.0`))); } },
        sl: { d: '🚂', run: () => { const el = print('', 'var(--accent)'); let x = 60; const iv = setInterval(() => { el.textContent = ' '.repeat(Math.max(0, x)) + '🚂🚃🚃🚃'; if (--x < -8) { clearInterval(iv); el.textContent = ''; } }, 30); } },
        exit: { d: 'Back to dashboard', run: () => MS.go('dashboard') },
      };
      const tokenize = (s) => { const r = []; let cur = '', q = null, has = false; for (const c of s) { if (q) { if (c === q) q = null; else cur += c; } else if (c === '"' || c === "'") { q = c; has = true; } else if (/\s/.test(c)) { if (cur || has) r.push(cur); cur = ''; has = false; } else cur += c; } if (cur || has) r.push(cur); return r; };
      async function exec(line) {
        print(h('div', h('span', { style: { color: 'var(--accent)' } }, promptEl.textContent + ' '), line));
        line = line.trim(); if (!line) return;
        if (line.startsWith('=')) return CMDS.calc.run([line.slice(1)]);
        for (const part of line.split(/\s*&&\s*/)) {
          const rd = part.match(/^echo\s+(.*?)\s*(>>?)\s*(\S+)$/);
          if (rd) { const txt = rd[1].replace(/^(["'])(.*)\1$/, '$2'); let prev = ''; if (rd[2] === '>>') { const f0 = await findFile(rd[3]); prev = f0 && typeof f0.data === 'string' ? f0.data + '\n' : ''; } await CMDS.write.run([rd[3], prev + txt]); continue; }
          let [cmd, ...args] = tokenize(part); if (st.data.aliases[cmd]) { const al = tokenize(st.data.aliases[cmd]); cmd = al[0]; args = [...al.slice(1), ...args]; }
          const c = CMDS[cmd]; if (!c) { err(`${cmd}: command not found — try "help"`); return; }
          try { await c.run(args); } catch (e) { err(String(e.message || e)); return; }
        }
      }
      input.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') { const v = input.value; input.value = ''; if (v.trim()) { st.data.history.push(v); st.data.history = st.data.history.slice(-300); st.touch(); } hi = st.data.history.length; await exec(v); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); hi = Math.max(0, hi - 1); input.value = st.data.history[hi] || ''; }
        else if (e.key === 'ArrowDown') { e.preventDefault(); hi = Math.min(st.data.history.length, hi + 1); input.value = st.data.history[hi] || ''; }
        else if (e.key === 'Tab') { e.preventDefault(); const parts = input.value.split(' '); const last = parts.pop(); let cands; if (!parts.length) cands = Object.keys(CMDS); else if (parts[0] === 'open') cands = MS.apps.map((a) => a.id); else if (parts[0] === 'theme') cands = MS.themes; else { const files = (await MS.db.files.all()).filter((f) => f.folder === cwd).map((f) => f.name); const fold = (await allFolders()).filter((x) => x.startsWith(cwd === '/' ? '/' : cwd + '/')).map((x) => x.slice(cwd === '/' ? 1 : cwd.length + 1)).filter((x) => x && !x.includes('/')).map((x) => x + '/'); cands = [...fold, ...files]; } const m = cands.filter((c) => c.startsWith(last)); if (m.length === 1) input.value = [...parts, m[0]].join(' ') + (m[0].endsWith('/') ? '' : ' '); else if (m.length > 1) { print(m.join('  '), 'var(--muted)'); let p = m[0]; m.forEach((x) => { while (!x.startsWith(p)) p = p.slice(0, -1); }); input.value = [...parts, p].join(' '); } }
        else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); out.innerHTML = ''; }
        else if (e.key === 'c' && e.ctrlKey && !getSelection().toString()) { print(promptEl.textContent + ' ' + input.value + '^C'); input.value = ''; }
      });
      setPrompt();
      print(h('div', h('strong', 'mega-sh 1.0'), ' — type ', h('code', 'help'), ' for commands. Try ', h('code', 'neofetch'), ', ', h('code', 'todo buy milk'), ', ', h('code', 'event tomorrow 09:00 Gym'), ', ', h('code', '= sqrt(2)*10'), ', or ', h('code', 'open chess'), '.'));
      MS.setActions(h('button.btn', { on: { click: () => { out.innerHTML = ''; input.focus(); } } }, 'Clear'));
      setTimeout(() => input.focus(), 50);
      return { route(args) { if (args.length) exec(args.join(' ')); } };
    },
  });
})();
