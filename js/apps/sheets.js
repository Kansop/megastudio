/* Sheets: spreadsheet with formula engine, multiple tabs, formatting, CSV, charts, undo */
(function () {
  const { h } = MS;
  const COLS = 26, ROWS = 120;
  const colName = (c) => String.fromCharCode(65 + c);
  const ref = (c, r) => colName(c) + (r + 1);
  const parseRef = (s) => { const m = /^\$?([A-Z])\$?(\d+)$/.exec(s.toUpperCase()); return m ? [m[1].charCodeAt(0) - 65, +m[2] - 1] : null; };
  const demo = () => {
    const c = {}; const put = (k, v, f) => (c[k] = { v, ...(f || {}) });
    put('A1', 'Monthly budget', { b: 1, sz: 16 }); put('A3', 'Item', { b: 1, bg: '#7c5cff33' }); put('B3', 'Planned', { b: 1, bg: '#7c5cff33' }); put('C3', 'Actual', { b: 1, bg: '#7c5cff33' }); put('D3', 'Diff', { b: 1, bg: '#7c5cff33' });
    [['Rent', 1200, 1200], ['Groceries', 400, 452], ['Transport', 120, 96], ['Fun', 150, 210], ['Savings', 500, 500]].forEach(([a, b, d], i) => { put('A' + (i + 4), a); put('B' + (i + 4), String(b), { fmt: 'money' }); put('C' + (i + 4), String(d), { fmt: 'money' }); put('D' + (i + 4), `=C${i + 4}-B${i + 4}`, { fmt: 'money' }); });
    put('A10', 'Total', { b: 1 }); put('B10', '=SUM(B4:B8)', { b: 1, fmt: 'money' }); put('C10', '=SUM(C4:C8)', { b: 1, fmt: 'money' }); put('D10', '=C10-B10', { b: 1, fmt: 'money' });
    put('A12', 'Over budget?'); put('B12', '=IF(D10>0,"Yes 😬","No 🎉")'); put('A13', 'Biggest expense'); put('B13', '=MAX(C4:C8)', { fmt: 'money' }); put('A14', 'Avg actual'); put('B14', '=ROUND(AVERAGE(C4:C8),2)', { fmt: 'money' });
    return { sheets: [{ id: 's1', name: 'Budget', cells: c, widths: { 0: 140 } }], active: 's1' };
  };
  let store;
  const getStore = async () => (store = store || (await MS.store('sheets', demo)));

  /* ---------- formula engine ---------- */
  function tokenize(src) {
    const t = []; const re = /\s*("(?:[^"]|"")*"|\$?[A-Z]\$?\d+(?::\$?[A-Z]\$?\d+)?|\d+\.?\d*(?:e[+-]?\d+)?|\.\d+|[A-Z_][A-Z0-9_.]*|<=|>=|<>|[-+*/^&=<>(),:%])/giy; let m, p = 0;
    while (p < src.length) { re.lastIndex = p; m = re.exec(src); if (!m) { if (!src.slice(p).trim()) break; throw new Error('#PARSE'); } t.push(m[1]); p = re.lastIndex; }
    return t;
  }
  const num = (v) => { if (typeof v === 'number') return v; if (v === '' || v == null) return 0; if (typeof v === 'boolean') return +v; const n = parseFloat(String(v).replace(/[$,]/g, '')); if (isNaN(n)) throw new Error('#VALUE!'); return n; };
  const flat = (args) => args.flat(Infinity);
  const nums = (args) => flat(args).filter((v) => v !== '' && v != null && !isNaN(parseFloat(v))).map(num);
  const crit = (c) => { const m = String(c).match(/^(<=|>=|<>|<|>|=)?(.*)$/); const op = m[1] || '='; const val = m[2]; const isN = val !== '' && !isNaN(+val);
    return (x) => { const a = isN ? +x : String(x).toLowerCase(); const b = isN ? +val : val.toLowerCase(); switch (op) { case '=': return a == b; case '<>': return a != b; case '<': return a < b; case '>': return a > b; case '<=': return a <= b; case '>=': return a >= b; } }; };
  const FN = {
    SUM: (...a) => nums(a).reduce((x, y) => x + y, 0), AVERAGE: (...a) => { const n = nums(a); return n.length ? n.reduce((x, y) => x + y, 0) / n.length : 0; }, AVG: (...a) => FN.AVERAGE(...a),
    MIN: (...a) => Math.min(...nums(a)), MAX: (...a) => Math.max(...nums(a)), COUNT: (...a) => nums(a).length, COUNTA: (...a) => flat(a).filter((v) => v !== '' && v != null).length,
    MEDIAN: (...a) => { const n = nums(a).sort((x, y) => x - y); const m = n.length >> 1; return n.length % 2 ? n[m] : (n[m - 1] + n[m]) / 2; },
    STDEV: (...a) => { const n = nums(a); const m = FN.AVERAGE(n); return Math.sqrt(n.reduce((s, x) => s + (x - m) ** 2, 0) / (n.length - 1)); },
    PRODUCT: (...a) => nums(a).reduce((x, y) => x * y, 1), IF: (c, a, b = '') => (c ? a : b), IFERROR: (a, b) => (a instanceof Error || (typeof a === 'string' && a.startsWith('#')) ? b : a),
    AND: (...a) => flat(a).every(Boolean), OR: (...a) => flat(a).some(Boolean), NOT: (a) => !a, ROUND: (a, d = 0) => Math.round(num(a) * 10 ** d) / 10 ** d, ROUNDUP: (a, d = 0) => Math.ceil(num(a) * 10 ** d) / 10 ** d, ROUNDDOWN: (a, d = 0) => Math.floor(num(a) * 10 ** d) / 10 ** d,
    ABS: (a) => Math.abs(num(a)), SQRT: (a) => Math.sqrt(num(a)), POWER: (a, b) => num(a) ** num(b), MOD: (a, b) => num(a) % num(b), INT: (a) => Math.floor(num(a)), PI: () => Math.PI, RAND: () => Math.random(), RANDBETWEEN: (a, b) => Math.floor(num(a) + Math.random() * (num(b) - num(a) + 1)),
    CONCAT: (...a) => flat(a).join(''), CONCATENATE: (...a) => flat(a).join(''), LEN: (a) => String(a).length, UPPER: (a) => String(a).toUpperCase(), LOWER: (a) => String(a).toLowerCase(), TRIM: (a) => String(a).trim(),
    LEFT: (a, n = 1) => String(a).slice(0, n), RIGHT: (a, n = 1) => String(a).slice(-n), MID: (a, s, n) => String(a).substr(s - 1, n), REPT: (a, n) => String(a).repeat(n), PROPER: (a) => String(a).replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase()),
    TODAY: () => MS.isoDate(), NOW: () => new Date().toLocaleString(), YEAR: (d) => new Date(d).getFullYear(), MONTH: (d) => new Date(d).getMonth() + 1, DAY: (d) => new Date(d + 'T00:00').getDate(),
    COUNTIF: (r, c) => flat([r]).filter(crit(c)).length, SUMIF: (r, c, s) => { const R = flat([r]); const S = s ? flat([s]) : R; const f = crit(c); return R.reduce((t, x, i) => (f(x) ? t + num(S[i]) : t), 0); },
    AVERAGEIF: (r, c) => { const v = flat([r]).filter(crit(c)).map(num); return v.length ? v.reduce((a, b) => a + b) / v.length : 0; },
    VLOOKUP: (k, range, col, exact = true) => { const rows = range.__rows; if (!rows) throw new Error('#REF!'); for (const row of rows) if (exact ? row[0] == k : num(row[0]) <= num(k)) return row[col - 1]; throw new Error('#N/A'); },
    INDEX: (range, r, c = 1) => { const rows = range.__rows; if (!rows) return flat([range])[r - 1]; return rows[r - 1]?.[c - 1] ?? ''; },
    MATCH: (k, range) => { const i = flat([range]).findIndex((x) => x == k); if (i < 0) throw new Error('#N/A'); return i + 1; },
    ISNUMBER: (a) => typeof a === 'number', ISBLANK: (a) => a === '' || a == null, TEXT: (a, f) => (/0\.0+/.test(f) ? num(a).toFixed(f.split('.')[1].length) : String(a)),
    SPARK: (...a) => { const n = nums(a); const mn = Math.min(...n), mx = Math.max(...n); return n.map((x) => '▁▂▃▄▅▆▇█'[Math.round(((x - mn) / (mx - mn || 1)) * 7)]).join(''); },
  };
  MS.sheetFunctions = Object.keys(FN);
  function makeEvaluator(sheet) {
    const cache = {}; const visiting = new Set();
    const raw = (k) => sheet.cells[k]?.v ?? '';
    function value(k) {
      if (k in cache) return cache[k];
      const r = raw(k);
      if (typeof r === 'string' && r.startsWith('=')) {
        if (visiting.has(k)) return (cache[k] = '#CYCLE!');
        visiting.add(k);
        let out; try { out = evalFormula(r.slice(1)); if (typeof out === 'number' && !isFinite(out)) out = '#DIV/0!'; if (out && out.__rows) out = out.__rows[0][0]; } catch (e) { out = e.message.startsWith('#') ? e.message : '#ERROR!'; }
        visiting.delete(k); return (cache[k] = out);
      }
      if (r !== '' && !isNaN(r) && /^\s*-?[\d.]+(e[+-]?\d+)?\s*$/i.test(r)) return (cache[k] = parseFloat(r));
      return (cache[k] = r);
    }
    function rangeVals(a, b) {
      const [c1, r1] = parseRef(a), [c2, r2] = parseRef(b); const rows = [];
      for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) { const row = []; for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) row.push(value(ref(c, r))); rows.push(row); }
      const arr = rows.flat(); arr.__rows = rows; return arr;
    }
    function evalFormula(src) {
      const t = tokenize(src); let i = 0; const peek = () => t[i]; const next = () => t[i++];
      const cmp = () => { let a = concat(); while (['=', '<>', '<', '>', '<=', '>='].includes(peek())) { const o = next(); const b = concat(); a = o === '=' ? a == b : o === '<>' ? a != b : o === '<' ? a < b : o === '>' ? a > b : o === '<=' ? a <= b : a >= b; } return a; };
      const concat = () => { let a = add(); while (peek() === '&') { next(); a = String(a) + String(add()); } return a; };
      const add = () => { let a = mul(); while (peek() === '+' || peek() === '-') { const o = next(); const b = mul(); a = o === '+' ? num(a) + num(b) : num(a) - num(b); } return a; };
      const mul = () => { let a = pw(); while (peek() === '*' || peek() === '/') { const o = next(); const b = pw(); if (o === '/' && num(b) === 0) throw new Error('#DIV/0!'); a = o === '*' ? num(a) * num(b) : num(a) / num(b); } return a; };
      const pw = () => { let a = un(); while (peek() === '^') { next(); a = num(a) ** num(un()); } return a; };
      const un = () => { if (peek() === '-') { next(); return -num(un()); } if (peek() === '+') { next(); return num(un()); } let v = prim(); if (peek() === '%') { next(); v = num(v) / 100; } return v; };
      const prim = () => {
        const tk = next(); if (tk == null) throw new Error('#PARSE');
        if (tk === '(') { const v = cmp(); if (next() !== ')') throw new Error('#PARSE'); return v; }
        if (tk[0] === '"') return tk.slice(1, -1).replace(/""/g, '"');
        if (/^[\d.]/.test(tk)) return parseFloat(tk);
        if (tk.includes(':')) { const [a, b] = tk.split(':'); return rangeVals(a, b); }
        if (parseRef(tk)) { const v = value(tk.replace(/\$/g, '').toUpperCase()); if (typeof v === 'string' && v.startsWith('#')) throw new Error(v); return v; }
        const U = tk.toUpperCase();
        if (U === 'TRUE') return true; if (U === 'FALSE') return false;
        if (FN[U] && peek() === '(') { next(); const args = []; if (peek() !== ')') { args.push(cmp()); while (peek() === ',') { next(); args.push(cmp()); } } if (next() !== ')') throw new Error('#PARSE'); return FN[U](...args); }
        throw new Error('#NAME?');
      };
      const v = cmp(); if (i < t.length) throw new Error('#PARSE'); return v;
    }
    return { value };
  }
  MS.sheetsEngine = { makeEvaluator, tokenize };
  function fmtVal(v, f) {
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    if (typeof v !== 'number') return v;
    switch (f) { case 'money': return v.toLocaleString(undefined, { style: 'currency', currency: 'USD' }); case 'pct': return (v * 100).toFixed(1) + '%'; case 'int': return Math.round(v).toLocaleString(); case 'dec2': return v.toFixed(2); }
    return Math.abs(v) > 1e12 || (Math.abs(v) < 1e-6 && v) ? v.toExponential(4) : String(Math.round(v * 1e10) / 1e10);
  }
  // shift relative refs when copying formulas
  const shiftFormula = (f, dc, dr) => f.replace(/("(?:[^"]|"")*")|(\$?)([A-Z])(\$?)(\d+)/g, (m, str, d1, c, d2, r) => { if (str) return str; const nc = d1 ? c.charCodeAt(0) - 65 : c.charCodeAt(0) - 65 + dc; const nr = d2 ? +r : +r + dr; if (nc < 0 || nr < 1 || nc >= COLS) return '#REF!'; return d1 + colName(nc) + d2 + nr; });

  MS.register({
    id: 'sheets', name: 'Sheets', icon: '📊', group: 'Productivity', desc: 'Spreadsheets with formulas & charts', keywords: 'excel spreadsheet table formula csv chart',
    async mount(view) {
      const s = await getStore(); let sel = { c: 0, r: 0, c2: 0, r2: 0 }; let editing = null; let ev; const undo = [], redo = [];
      const sheet = () => s.data.sheets.find((x) => x.id === s.data.active) || s.data.sheets[0];
      const snapshot = () => { undo.push(JSON.stringify(sheet().cells)); if (undo.length > 100) undo.shift(); redo.length = 0; };
      const nameBox = h('input.input.mono', { style: { width: '70px', textAlign: 'center' }, on: { keydown: (e) => { if (e.key === 'Enter') { const p = parseRef(nameBox.value); if (p) { setSel(p[0], p[1]); grid.focus(); } } } } });
      const fbar = h('input.input.mono', { style: { flex: 1 }, placeholder: 'Value or =FORMULA()', on: { keydown: (e) => { if (e.key === 'Enter') { commit(fbar.value); move(0, 1); grid.focus(); } if (e.key === 'Escape') { renderSel(); grid.focus(); } } } });
      const fnHint = h('span.small.muted');
      fbar.addEventListener('input', () => { const m = fbar.value.match(/([A-Z]+)\($/i); fnHint.textContent = m ? (FN[m[1].toUpperCase()] ? 'ƒ ' + m[1].toUpperCase() + '(…)' : '') : ''; });
      const tool = (label, title, fn) => h('button.btn.sm', { title, on: { click: fn } }, label);
      const fmtSel = h('select.input', { title: 'Number format', on: { change: () => applyFmt({ fmt: fmtSel.value }) } }, [['', 'Auto'], ['money', '$ Money'], ['pct', '% Percent'], ['int', 'Integer'], ['dec2', '0.00']].map(([v, l]) => h('option', { value: v }, l)));
      const bgIn = h('input', { type: 'color', value: '#7c5cff', title: 'Fill color', style: { width: '32px', height: '28px', border: 0, background: 'none' }, on: { input: () => applyFmt({ bg: bgIn.value + '44' }) } });
      const fcIn = h('input', { type: 'color', value: '#ff4fa3', title: 'Text color', style: { width: '32px', height: '28px', border: 0, background: 'none' }, on: { input: () => applyFmt({ fc: fcIn.value }) } });
      const toolbar = h('div.row', { style: { padding: '8px 12px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap', gap: '4px', background: 'var(--panel)' } },
        tool('↶', 'Undo (Ctrl+Z)', doUndo), tool('↷', 'Redo (Ctrl+Y)', doRedo), tool('B', 'Bold', () => toggleFmt('b')), tool('I', 'Italic', () => toggleFmt('i')), tool('U', 'Underline', () => toggleFmt('u')),
        tool('⇤', 'Align left', () => applyFmt({ al: 'left' })), tool('↔', 'Center', () => applyFmt({ al: 'center' })), tool('⇥', 'Align right', () => applyFmt({ al: 'right' })), fmtSel, bgIn, fcIn, tool('⌫ fmt', 'Clear formatting', () => eachSel((k) => { const c = sheet().cells[k]; if (c) sheet().cells[k] = { v: c.v }; })),
        tool('Σ', 'AutoSum below selection', autoSum), tool('↧ Fill', 'Fill down (Ctrl+D)', fillDown), tool('⇅ Sort', 'Sort selected rows by first column', sortSel), tool('📈 Chart', 'Chart selection', chart), tool('ƒ', 'Function list', fnList));
      const bar = h('div.row', { style: { padding: '6px 12px', borderBottom: '1px solid var(--line)', gap: '8px' } }, nameBox, h('span.muted', 'ƒx'), fbar, fnHint);
      const grid = h('div', { tabIndex: 0, style: { flex: 1, overflow: 'auto', outline: 'none', position: 'relative' } });
      const tabs = h('div.row', { style: { padding: '6px 10px', borderTop: '1px solid var(--line)', background: 'var(--panel)', gap: '4px', overflowX: 'auto' } });
      const statusR = h('span.small.muted', { style: { marginLeft: 'auto', whiteSpace: 'nowrap' } });
      view.append(h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } }, toolbar, bar, grid, tabs));
      MS.setActions(h('button.btn', { on: { click: importCSV } }, '⬆ CSV'), h('button.btn', { on: { click: exportCSV } }, '⬇ CSV'));
      const table = h('table', { style: { borderCollapse: 'collapse', fontSize: '13px', tableLayout: 'fixed' } }); grid.append(table);
      const cellEls = {};
      function buildGrid() {
        table.innerHTML = ''; const sh = sheet(); const head = h('tr', h('th', { style: { width: '44px', position: 'sticky', top: 0, left: 0, zIndex: 3, background: 'var(--panel2)', border: '1px solid var(--line)' } }));
        for (let c = 0; c < COLS; c++) { const w = sh.widths?.[c] || 100; const th = h('th', { style: { width: w + 'px', minWidth: w + 'px', position: 'sticky', top: 0, zIndex: 2, background: 'var(--panel2)', border: '1px solid var(--line)', fontWeight: 500, color: 'var(--muted)', userSelect: 'none', cursor: 'pointer' }, on: { click: () => { sel = { c, r: 0, c2: c, r2: ROWS - 1 }; renderSel(); } } }, colName(c));
          const grip = h('span', { style: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '5px', cursor: 'col-resize' }, on: { mousedown: (e) => { e.stopPropagation(); const x0 = e.clientX, w0 = th.offsetWidth; const mv = (m) => { const nw = Math.max(40, w0 + m.clientX - x0); th.style.width = th.style.minWidth = nw + 'px'; sh.widths = sh.widths || {}; sh.widths[c] = nw; }; const up = () => { removeEventListener('mousemove', mv); removeEventListener('mouseup', up); s.touch(); }; addEventListener('mousemove', mv); addEventListener('mouseup', up); } } });
          th.style.position = 'sticky'; th.append(grip); head.append(th); }
        table.append(head);
        for (let r = 0; r < ROWS; r++) {
          const tr = h('tr', h('th', { style: { position: 'sticky', left: 0, zIndex: 1, background: 'var(--panel2)', border: '1px solid var(--line)', fontWeight: 500, color: 'var(--muted)', cursor: 'pointer' }, on: { click: () => { sel = { c: 0, r, c2: COLS - 1, r2: r }; renderSel(); } } }, r + 1));
          for (let c = 0; c < COLS; c++) { const td = h('td', { 'data-c': c, 'data-r': r, style: { border: '1px solid var(--line)', height: '24px', padding: '0 6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'cell' } }); cellEls[ref(c, r)] = td; tr.append(td); }
          table.append(tr);
        }
      }
      function paint() {
        ev = makeEvaluator(sheet()); const sh = sheet();
        for (const k in cellEls) { const td = cellEls[k]; const c = sh.cells[k]; if (!c) { if (td.textContent) td.textContent = ''; if (td.dataset.f) { for (const p of ['fontWeight', 'fontStyle', 'textDecoration', 'textAlign', 'background', 'color', 'fontSize']) td.style[p] = ''; delete td.dataset.f; } continue; }
          td.dataset.f = 1;
          const v = ev.value(k); td.textContent = fmtVal(v, c.fmt);
          td.style.fontWeight = c.b ? '700' : ''; td.style.fontStyle = c.i ? 'italic' : ''; td.style.textDecoration = c.u ? 'underline' : ''; td.style.background = c.bg || ''; td.style.color = c.fc || (typeof v === 'string' && v.startsWith('#') && v.endsWith('!') || v === '#NAME?' || v === '#N/A' ? 'var(--bad)' : ''); td.style.fontSize = c.sz ? c.sz + 'px' : '';
          td.style.textAlign = c.al || (typeof v === 'number' ? 'right' : 'left'); }
        renderSel();
      }
      const norm = () => ({ c1: Math.min(sel.c, sel.c2), c2: Math.max(sel.c, sel.c2), r1: Math.min(sel.r, sel.r2), r2: Math.max(sel.r, sel.r2) });
      const eachSel = (fn) => { snapshot(); const n = norm(); for (let r = n.r1; r <= n.r2; r++) for (let c = n.c1; c <= n.c2; c++) fn(ref(c, r), c, r); s.touch(); paint(); };
      const applyFmt = (f) => eachSel((k) => (sheet().cells[k] = { v: '', ...sheet().cells[k], ...f }));
      const toggleFmt = (p) => { const on = !sheet().cells[ref(sel.c, sel.r)]?.[p]; applyFmt({ [p]: on ? 1 : 0 }); };
      let prevSel = [];
      function renderSel() {
        prevSel.forEach((td) => { td.style.outline = ''; td.style.boxShadow = ''; }); prevSel = [];
        const n = norm();
        for (let r = n.r1; r <= n.r2; r++) for (let c = n.c1; c <= n.c2; c++) { const td = cellEls[ref(c, r)]; td.style.boxShadow = 'inset 0 0 0 999px color-mix(in srgb, var(--accent) 14%, transparent)'; prevSel.push(td); }
        const cur = cellEls[ref(sel.c, sel.r)]; cur.style.outline = '2px solid var(--accent)'; cur.style.outlineOffset = '-2px'; prevSel.push(cur);
        const k = ref(sel.c, sel.r); nameBox.value = n.c1 !== n.c2 || n.r1 !== n.r2 ? `${ref(n.c1, n.r1)}:${ref(n.c2, n.r2)}` : k; fbar.value = sheet().cells[k]?.v ?? ''; fmtSel.value = sheet().cells[k]?.fmt || '';
        const vals = []; for (let r = n.r1; r <= n.r2; r++) for (let c = n.c1; c <= n.c2; c++) { const v = ev.value(ref(c, r)); if (typeof v === 'number') vals.push(v); }
        statusR.textContent = vals.length > 1 ? `Sum ${fmtVal(vals.reduce((a, b) => a + b, 0))} · Avg ${fmtVal(vals.reduce((a, b) => a + b, 0) / vals.length)} · Count ${vals.length}` : '';
        const tr = cur.getBoundingClientRect(), gr = grid.getBoundingClientRect();
        if (tr.bottom > gr.bottom) grid.scrollTop += tr.bottom - gr.bottom + 4; if (tr.top < gr.top + 26) grid.scrollTop -= gr.top + 26 - tr.top; if (tr.right > gr.right) grid.scrollLeft += tr.right - gr.right + 4; if (tr.left < gr.left + 44) grid.scrollLeft -= gr.left + 44 - tr.left;
      }
      const setSel = (c, r, extend = false) => { c = MS.clamp(c, 0, COLS - 1); r = MS.clamp(r, 0, ROWS - 1); if (extend) { sel.c2 = c; sel.r2 = r; } else sel = { c, r, c2: c, r2: r }; renderSel(); };
      const move = (dc, dr, ext) => ext ? setSel(sel.c2 + dc, sel.r2 + dr, true) : setSel(sel.c + dc, sel.r + dr);
      function commit(v, k = ref(sel.c, sel.r)) { snapshot(); const sh = sheet(); if (v === '' && !Object.keys(sh.cells[k] || {}).some((x) => x !== 'v')) delete sh.cells[k]; else sh.cells[k] = { ...sh.cells[k], v }; s.touch(); paint(); }
      function startEdit(initial) {
        const td = cellEls[ref(sel.c, sel.r)]; const k = ref(sel.c, sel.r);
        const inp = h('input.mono', { value: initial ?? sheet().cells[k]?.v ?? '', style: { position: 'absolute', left: td.offsetLeft + 'px', top: td.offsetTop + 'px', width: Math.max(td.offsetWidth, 140) + 'px', height: td.offsetHeight + 'px', zIndex: 5, border: '2px solid var(--accent)', background: 'var(--bg)', padding: '0 5px', outline: 'none', fontSize: '13px' } });
        grid.append(inp); inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); editing = inp;
        const done = (save, dc = 0, dr = 0) => { if (editing !== inp) return; editing = null; if (save) commit(inp.value, k); inp.remove(); if (dc || dr) move(dc, dr); grid.focus(); };
        inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); done(true, 0, e.shiftKey ? -1 : 1); } else if (e.key === 'Tab') { e.preventDefault(); done(true, e.shiftKey ? -1 : 1, 0); } else if (e.key === 'Escape') done(false); });
        inp.addEventListener('blur', () => done(true));
        inp.addEventListener('input', () => (fbar.value = inp.value));
      }
      let mouseDown = false;
      grid.addEventListener('mousedown', (e) => { const td = e.target.closest('td'); if (!td) return; if (editing) editing.blur(); mouseDown = true; setSel(+td.dataset.c, +td.dataset.r, e.shiftKey); e.preventDefault(); grid.focus(); });
      grid.addEventListener('mouseover', (e) => { if (!mouseDown) return; const td = e.target.closest('td'); if (td) setSel(+td.dataset.c, +td.dataset.r, true); });
      const up = () => (mouseDown = false); addEventListener('mouseup', up);
      grid.addEventListener('dblclick', (e) => { if (e.target.closest('td')) startEdit(); });
      grid.addEventListener('keydown', (e) => {
        if (editing) return; const k = MS.eventKey(e); const mod = e.ctrlKey || e.metaKey;
        const arrows = { arrowup: [0, -1], arrowdown: [0, 1], arrowleft: [-1, 0], arrowright: [1, 0] };
        const a = arrows[e.key.toLowerCase()];
        if (a) { e.preventDefault(); move(a[0] * (mod ? 50 : 1), a[1] * (mod ? 200 : 1), e.shiftKey); return; }
        if (e.key === 'Enter') { e.preventDefault(); startEdit(); return; }
        if (e.key === 'Tab') { e.preventDefault(); move(e.shiftKey ? -1 : 1, 0); return; }
        if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); eachSel((kk) => { const c = sheet().cells[kk]; if (c) { c.v = ''; if (Object.keys(c).length === 1) delete sheet().cells[kk]; } }); return; }
        if (e.key === 'F2') { e.preventDefault(); startEdit(); return; }
        if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? doRedo() : doUndo(); return; }
        if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); doRedo(); return; }
        if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); fillDown(); return; }
        if (mod && e.key.toLowerCase() === 'b') { e.preventDefault(); e.stopPropagation(); toggleFmt('b'); return; }
        if (mod && e.key.toLowerCase() === 'i') { e.preventDefault(); toggleFmt('i'); return; }
        if (mod && e.key.toLowerCase() === 'a') { e.preventDefault(); sel = { c: 0, r: 0, c2: COLS - 1, r2: ROWS - 1 }; renderSel(); return; }
        if (!mod && !e.altKey && e.key.length === 1) { e.preventDefault(); startEdit(e.key); }
      });
      grid.addEventListener('copy', (e) => { if (editing) return; const n = norm(); const rows = []; for (let r = n.r1; r <= n.r2; r++) { const row = []; for (let c = n.c1; c <= n.c2; c++) row.push(fmtVal(ev.value(ref(c, r)))); rows.push(row.join('\t')); } e.clipboardData.setData('text/plain', rows.join('\n')); const rawRows = []; for (let r = n.r1; r <= n.r2; r++) { const row = []; for (let c = n.c1; c <= n.c2; c++) row.push(sheet().cells[ref(c, r)] || null); rawRows.push(row); } e.clipboardData.setData('application/x-megastudio', JSON.stringify({ c: n.c1, r: n.r1, rows: rawRows })); e.preventDefault(); MS.toast('Copied'); });
      grid.addEventListener('paste', (e) => {
        if (editing) return; e.preventDefault(); snapshot(); const sh = sheet();
        const rich = e.clipboardData.getData('application/x-megastudio');
        if (rich) { const d = JSON.parse(rich); d.rows.forEach((row, i) => row.forEach((cell, j) => { const k = ref(sel.c + j, sel.r + i); if (sel.c + j >= COLS || sel.r + i >= ROWS) return; if (!cell) delete sh.cells[k]; else { const nc = { ...cell }; if (typeof nc.v === 'string' && nc.v.startsWith('=')) nc.v = shiftFormula(nc.v, sel.c - d.c, sel.r - d.r); sh.cells[k] = nc; } })); }
        else { const txt = e.clipboardData.getData('text/plain'); txt.replace(/\r/g, '').split('\n').forEach((line, i) => line.split('\t').forEach((v, j) => { if (sel.c + j < COLS && sel.r + i < ROWS && (v !== '' || line)) sh.cells[ref(sel.c + j, sel.r + i)] = { ...sh.cells[ref(sel.c + j, sel.r + i)], v }; })); }
        s.touch(); paint();
      });
      function doUndo() { if (!undo.length) return MS.toast('Nothing to undo'); redo.push(JSON.stringify(sheet().cells)); sheet().cells = JSON.parse(undo.pop()); s.touch(); paint(); }
      function doRedo() { if (!redo.length) return; undo.push(JSON.stringify(sheet().cells)); sheet().cells = JSON.parse(redo.pop()); s.touch(); paint(); }
      function fillDown() { const n = norm(); if (n.r1 === n.r2) return MS.toast('Select a range spanning several rows'); snapshot(); const sh = sheet(); for (let c = n.c1; c <= n.c2; c++) { const src = sh.cells[ref(c, n.r1)]; for (let r = n.r1 + 1; r <= n.r2; r++) { if (!src) { delete sh.cells[ref(c, r)]; continue; } const nc = { ...src }; if (typeof nc.v === 'string' && nc.v.startsWith('=')) nc.v = shiftFormula(nc.v, 0, r - n.r1); else if (!isNaN(parseFloat(nc.v)) && sh.cells[ref(c, n.r1 + 1)] && r > n.r1 + 1) { /* keep */ } sh.cells[ref(c, r)] = nc; } } s.touch(); paint(); }
      function autoSum() { const n = norm(); const k = ref(n.c1, n.r2 + 1); commit(`=SUM(${ref(n.c1, n.r1)}:${ref(n.c1, n.r2)})`, k); setSel(n.c1, n.r2 + 1); }
      function sortSel() { const n = norm(); if (n.r1 === n.r2) return MS.toast('Select rows to sort'); snapshot(); const sh = sheet(); const rows = []; for (let r = n.r1; r <= n.r2; r++) { const row = []; for (let c = n.c1; c <= n.c2; c++) row.push(sh.cells[ref(c, r)]); rows.push({ key: ev.value(ref(n.c1, r)), row }); }
        const asc = !sortSel.asc; sortSel.asc = asc; rows.sort((a, b) => (typeof a.key === 'number' && typeof b.key === 'number' ? a.key - b.key : String(a.key).localeCompare(String(b.key))) * (asc ? 1 : -1));
        rows.forEach((x, i) => x.row.forEach((cell, j) => { const k = ref(n.c1 + j, n.r1 + i); if (cell) sh.cells[k] = cell; else delete sh.cells[k]; })); s.touch(); paint(); MS.toast('Sorted ' + (asc ? 'A→Z' : 'Z→A')); }
      function fnList() { MS.modal(h('div', h('h2', 'ƒ Functions'), h('p.muted.small', 'Use ranges like A1:B5, absolute refs like $A$1, operators + - * / ^ & = <> < > and percentages.'), h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } }, Object.keys(FN).sort().map((f) => h('span.tag.mono', f))))); }
      function chart() {
        const n = norm(); const labels = [], series = [];
        const hasLabels = typeof ev.value(ref(n.c1, n.r1 + (n.r2 > n.r1 ? 1 : 0))) !== 'number';
        const c0 = hasLabels ? n.c1 + 1 : n.c1; const hasHeader = n.r2 > n.r1 && typeof ev.value(ref(c0, n.r1)) !== 'number'; const r0 = hasHeader ? n.r1 + 1 : n.r1;
        for (let r = r0; r <= n.r2; r++) labels.push(hasLabels ? String(ev.value(ref(n.c1, r))) : String(r + 1));
        for (let c = c0; c <= n.c2; c++) { const vals = []; for (let r = r0; r <= n.r2; r++) { const v = ev.value(ref(c, r)); vals.push(typeof v === 'number' ? v : 0); } series.push({ name: hasHeader ? String(ev.value(ref(c, n.r1))) : colName(c), vals }); }
        if (!series.length || !labels.length) return MS.toast('Select labels + numbers first');
        const cv = h('canvas', { width: 640, height: 360, style: { width: '100%', background: 'var(--bg)', borderRadius: '10px' } }); let type = 'bar';
        const draw = () => { const g = cv.getContext('2d'); const W = cv.width, H = cv.height; g.clearRect(0, 0, W, H); const css = getComputedStyle(document.documentElement); const txt = css.getPropertyValue('--text'), line = css.getPropertyValue('--line');
          const pal = ['#7c5cff', '#ff4fa3', '#3ddc97', '#2fa8ff', '#ffb84f', '#ff5d6c']; g.font = '12px system-ui'; g.fillStyle = txt;
          if (type === 'pie') { const vals = series[0].vals; const tot = vals.reduce((a, b) => a + Math.abs(b), 0) || 1; let a = -Math.PI / 2; vals.forEach((v, i) => { const da = (Math.abs(v) / tot) * Math.PI * 2; g.beginPath(); g.moveTo(220, 180); g.arc(220, 180, 150, a, a + da); g.fillStyle = pal[i % 6]; g.fill(); a += da; g.fillRect(420, 40 + i * 22, 14, 14); g.fillStyle = txt; g.fillText(`${labels[i]} (${((Math.abs(v) / tot) * 100).toFixed(1)}%)`, 440, 52 + i * 22); }); return; }
          const all = series.flatMap((x) => x.vals); const mx = Math.max(0, ...all), mn = Math.min(0, ...all); const L = 60, R = W - 20, T = 30, B = H - 40; const y = (v) => B - ((v - mn) / (mx - mn || 1)) * (B - T);
          g.strokeStyle = line; for (let i = 0; i <= 5; i++) { const v = mn + ((mx - mn) * i) / 5; g.beginPath(); g.moveTo(L, y(v)); g.lineTo(R, y(v)); g.stroke(); g.fillStyle = txt; g.fillText(fmtVal(Math.round(v * 100) / 100), 4, y(v) + 4); }
          const bw = (R - L) / labels.length; labels.forEach((l, i) => g.fillText(l.slice(0, 10), L + i * bw + 4, H - 20));
          series.forEach((se, si) => { g.fillStyle = g.strokeStyle = pal[si % 6]; if (type === 'bar') se.vals.forEach((v, i) => { const w = (bw - 10) / series.length; g.fillRect(L + i * bw + 5 + si * w, Math.min(y(v), y(0)), w - 2, Math.abs(y(v) - y(0))); }); else { g.lineWidth = 3; g.beginPath(); se.vals.forEach((v, i) => { const x = L + i * bw + bw / 2; i ? g.lineTo(x, y(v)) : g.moveTo(x, y(v)); }); g.stroke(); g.lineWidth = 1; se.vals.forEach((v, i) => { g.beginPath(); g.arc(L + i * bw + bw / 2, y(v), 4, 0, 7); g.fill(); }); } g.fillRect(L + si * 120, 8, 12, 12); g.fillStyle = txt; g.fillText(se.name, L + si * 120 + 16, 18); });
        };
        const types = ['bar', 'line', 'pie'].map((t) => h('button.btn.sm', { on: { click: () => { type = t; types.forEach((b) => b.classList.toggle('on', b.textContent === t)); draw(); } } }, t));
        MS.modal(h('div.col', h('h2', '📈 Chart'), h('div.row', types, h('div.spacer'), h('button.btn.sm', { on: { click: () => cv.toBlob((b) => MS.download('chart.png', b)) } }, '⬇ PNG')), cv));
        types[0].classList.add('on'); setTimeout(draw, 10);
      }
      function exportCSV() { const sh = sheet(); let maxR = 0, maxC = 0; Object.keys(sh.cells).forEach((k) => { const [c, r] = parseRef(k); maxR = Math.max(maxR, r); maxC = Math.max(maxC, c); }); const lines = []; for (let r = 0; r <= maxR; r++) { const row = []; for (let c = 0; c <= maxC; c++) { let v = String(fmtVal(ev.value(ref(c, r))) ?? ''); if (/[",\n]/.test(v)) v = '"' + v.replace(/"/g, '""') + '"'; row.push(v); } lines.push(row.join(',')); } MS.download(sh.name + '.csv', lines.join('\n'), 'text/csv'); }
      async function importCSV() { const f = await MS.pickFile('.csv,.tsv,text/csv'); if (!f) return; const txt = await MS.readText(f); const sep = f.name.endsWith('.tsv') ? '\t' : ','; const rows = []; let row = [], cur = '', q = false;
        for (let i = 0; i < txt.length; i++) { const ch = txt[i]; if (q) { if (ch === '"' && txt[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; } else if (ch === '"') q = true; else if (ch === sep) { row.push(cur); cur = ''; } else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; } else if (ch !== '\r') cur += ch; }
        if (cur || row.length) { row.push(cur); rows.push(row); }
        const sh = { id: MS.uid('s'), name: f.name.replace(/\.\w+$/, ''), cells: {}, widths: {} }; rows.slice(0, ROWS).forEach((r, i) => r.slice(0, COLS).forEach((v, j) => { if (v !== '') sh.cells[ref(j, i)] = { v }; })); s.data.sheets.push(sh); s.data.active = sh.id; s.touch(); buildGrid(); paint(); renderTabs(); MS.toast('Imported ' + rows.length + ' rows'); }
      function renderTabs() {
        tabs.innerHTML = '';
        s.data.sheets.forEach((sh) => tabs.append(h('button.btn.sm', { class: sh.id === sheet().id ? 'on' : '', on: { click: () => { s.data.active = sh.id; s.touch(); undo.length = redo.length = 0; buildGrid(); paint(); renderTabs(); }, dblclick: async () => { const n = await MS.prompt('Rename sheet', sh.name); if (n) { sh.name = n; s.touch(); renderTabs(); } } } }, sh.name)));
        tabs.append(h('button.btn.sm', { title: 'New sheet', on: { click: () => { const sh = { id: MS.uid('s'), name: 'Sheet ' + (s.data.sheets.length + 1), cells: {}, widths: {} }; s.data.sheets.push(sh); s.data.active = sh.id; s.touch(); buildGrid(); paint(); renderTabs(); } } }, '+'));
        tabs.append(h('button.btn.sm.danger', { title: 'Delete this sheet', on: { click: async () => { if (s.data.sheets.length < 2) return MS.toast('Keep at least one sheet'); if (await MS.confirm('Delete sheet?', sheet().name, 'Delete')) { s.data.sheets = s.data.sheets.filter((x) => x !== sheet()); s.data.active = s.data.sheets[0].id; s.touch(); buildGrid(); paint(); renderTabs(); } } } }, '🗑'), statusR);
      }
      buildGrid(); paint(); renderTabs(); setTimeout(() => grid.focus(), 50);
      return { unmount: () => removeEventListener('mouseup', up) };
    },
  });
})();
