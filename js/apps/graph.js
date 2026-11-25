/* Graphing Calculator: explicit, implicit, polar, parametric, inequalities, points, sliders, user functions, derivatives,
   roots/extrema/intersections, integrals with shading, value tables, trace, share links, PNG export */
(function () {
  const { h } = MS;
  const COLORS = ['#7c5cff', '#ff4fa3', '#2fa8ff', '#3ddc97', '#ffb84f', '#ff5d6c', '#33e0c8', '#c6f26a', '#b07cff', '#ff8a3d'];
  const FUNCS = { sin: 1, cos: 1, tan: 1, asin: 1, acos: 1, atan: 1, arcsin: 1, arccos: 1, arctan: 1, sinh: 1, cosh: 1, tanh: 1, sec: 1, csc: 1, cot: 1, sqrt: 1, cbrt: 1, abs: 1, ln: 1, log: 1, log2: 1, exp: 1, floor: 1, ceil: 1, round: 1, sign: 1, min: 2, max: 2, mod: 2, atan2: 2, gamma: 1, nroot: 2, frac: 1 };
  const CONSTS = { pi: 'Math.PI', 'π': 'Math.PI', e: 'Math.E', tau: '(2*Math.PI)', 'τ': '(2*Math.PI)' };
  const NAMES = [...Object.keys(FUNCS), 'theta', 'pi', 'tau'].sort((a, b) => b.length - a.length);
  const EXAMPLES = {
    'Getting started': ['y = sin(x)', 'y = a x^2 + b', 'a = 0.5', 'b = -2', '(1, 2)'],
    'Unit circle & trig': ['x^2 + y^2 = 1', 'y = sin(x)', 'y = cos(x)', '(cos(t), sin(t)) {0<t<k}', 'k = 4.2'],
    'Polar rose': ['r = cos(n θ)', 'n = 4', 'r = 1 + 0.5 sin(8θ)'],
    'Calculus': ['f(x) = x^3 - 3x', "y = f'(x)", 'y = f(x) {x>0}', 'y < f(x) {-2<x<0}'],
    'Heart': ['(16 sin(t)^3/5, (13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t))/5)', 'y > abs(x) - 4 {y < 2}'],
    'Inequalities': ['y > x^2 - 4', 'y < 4 - x^2', 'x^2 + y^2 < 1'],
    'Lissajous': ['(sin(a t), sin(b t)) {0<t<6.3}', 'a = 3', 'b = 2'],
    'Butterfly': ['r = e^(sin(θ)) - 2cos(4θ) + sin((2θ - π)/24)^5 {0<θ<75}'],
  };

  /* ---------------- parser ---------------- */
  function tokenize(src) {
    const t = []; let i = 0; src = src.replace(/\*\*/g, '^').replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/·|×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
    while (i < src.length) {
      const c = src[i];
      if (/\s/.test(c)) { i++; continue; }
      if (/[0-9.]/.test(c)) { const m = src.slice(i).match(/^(\d*\.?\d+(?:[eE][-+]?\d+)?|\d+\.)/); t.push({ k: 'num', v: parseFloat(m[0]) }); i += m[0].length; continue; }
      if (/[a-zA-Zθπτ_]/.test(c)) {
        const rest = src.slice(i); const nm = NAMES.find((n) => rest.startsWith(n) && !(/[a-zA-Z]/.test(rest[n.length] || '') && !NAMES.some((m) => rest.slice(n.length).startsWith(m)) && n.length < 3 && false));
        if (nm) { t.push({ k: 'id', v: nm === 'theta' ? 'θ' : nm }); i += nm.length; continue; }
        let v = c; i++; if (src[i] === '_') { const m = src.slice(i + 1).match(/^[a-zA-Z0-9]+/); if (m) { v += '_' + m[0]; i += 1 + m[0].length; } }
        t.push({ k: 'id', v }); continue;
      }
      const two = src.slice(i, i + 2);
      if (['<=', '>=', '!='].includes(two)) { t.push({ k: 'op', v: two }); i += 2; continue; }
      if ('+-*/^()[],=<>|!\'{}'.includes(c)) { t.push({ k: 'op', v: c }); i++; continue; }
      throw new Error('Unexpected “' + c + '”');
    }
    return t;
  }
  function parse(src, userFns) {
    const T = tokenize(src); let p = 0, absDepth = 0;
    const peek = () => T[p], next = () => T[p++];
    const isOp = (v) => T[p] && T[p].k === 'op' && T[p].v === v;
    const expect = (v) => { if (!isOp(v)) throw new Error('Expected “' + v + '”'); p++; };
    const isFn = (tok) => tok && tok.k === 'id' && (FUNCS[tok.v] || userFns.has(tok.v));
    function expr() { let a = mul(); while (isOp('+') || isOp('-')) { const o = next().v; a = { t: 'bin', o, a, b: mul() }; } return a; }
    const startsFactor = () => { const k = peek(); if (!k) return false; if (k.k === 'num' || k.k === 'id') return true; if (k.k === 'op' && (k.v === '(' || (k.v === '|' && absDepth === 0))) return true; return false; };
    function mul() { let a = unary(); for (;;) { if (isOp('*') || isOp('/')) { const o = next().v; a = { t: 'bin', o, a, b: unary() }; } else if (startsFactor()) a = { t: 'bin', o: '*', a, b: pow() }; else return a; } }
    function unary() { if (isOp('-')) { p++; return { t: 'neg', a: unary() }; } if (isOp('+')) { p++; return unary(); } return pow(); }
    function pow() { const b = post(); if (isOp('^')) { p++; return { t: 'bin', o: '^', a: b, b: unary() }; } return b; }
    function post() { let a = prim(); while (isOp('!')) { p++; a = { t: 'call', f: 'fact', args: [a] }; } return a; }
    function fnArg() { // argument without parentheses: "sin 2x" -> sin(2x)
      let a = pow(); while (peek() && ((peek().k === 'num') || (peek().k === 'id' && !isFn(peek())))) a = { t: 'bin', o: '*', a, b: pow() }; return a;
    }
    function prim() {
      const k = next(); if (!k) throw new Error('Unexpected end');
      if (k.k === 'num') return { t: 'num', v: k.v };
      if (k.k === 'id') {
        if (isFn(k)) {
          let deriv = 0; while (isOp("'")) { p++; deriv++; }
          let power = null; if (isOp('^') && FUNCS[k.v]) { p++; power = prim(); }
          let args; if (isOp('(')) { p++; args = [expr()]; while (isOp(',')) { p++; args.push(expr()); } expect(')'); } else args = [fnArg()];
          let node = { t: 'call', f: k.v, args, deriv }; if (power) node = { t: 'bin', o: '^', a: node, b: power }; return node;
        }
        return { t: 'id', v: k.v };
      }
      if (k.v === '(' || k.v === '[') { const close = k.v === '(' ? ')' : ']'; const items = [expr()]; while (isOp(',')) { p++; items.push(expr()); } expect(close); return items.length > 1 ? { t: 'tup', items } : items[0]; }
      if (k.v === '|') { absDepth++; const a = expr(); expect('|'); absDepth--; return { t: 'call', f: 'abs', args: [a] }; }
      throw new Error('Unexpected “' + k.v + '”');
    }
    const top = () => { const items = [expr()]; while (isOp(',')) { p++; items.push(expr()); } return items.length > 1 ? { t: 'list', items } : items[0]; };
    // split restriction {..}
    const out = {};
    const lhs = top();
    const REL = ['=', '<', '>', '<=', '>='];
    if (peek() && peek().k === 'op' && REL.includes(peek().v)) { out.rel = next().v; out.rhs = top(); } 
    out.lhs = lhs;
    const restr = [];
    while (isOp('{')) { p++; const parts = [expr()]; const ops = []; while (peek() && REL.includes(peek().v)) { ops.push(next().v); parts.push(expr()); } expect('}'); restr.push({ parts, ops }); }
    out.restr = restr;
    if (p < T.length) throw new Error('Unexpected “' + T[p].v + '”');
    return out;
  }
  const freeVars = (n, s = new Set()) => { if (!n) return s; if (n.t === 'id') s.add(n.v); (n.args || n.items || []).forEach((c) => freeVars(c, s)); if (n.a) freeVars(n.a, s); if (n.b) freeVars(n.b, s); return s; };
  function gen(n, env) {
    switch (n.t) {
      case 'num': return '(' + n.v + ')';
      case 'neg': return '(-' + gen(n.a, env) + ')';
      case 'bin': { const a = gen(n.a, env), b = gen(n.b, env); return n.o === '^' ? `S.pow(${a},${b})` : `(${a}${n.o}${b})`; }
      case 'id': if (n.v in env) return env[n.v]; if (CONSTS[n.v]) return CONSTS[n.v]; return `S.v(${JSON.stringify(n.v)})`;
      case 'call': { const args = n.args.map((a) => gen(a, env)).join(','); if (n.deriv) return `S.d(${JSON.stringify(n.f)},${n.deriv},${args})`; return FUNCS[n.f] || n.f === 'fact' ? `S.f.${n.f}(${args})` : `S.u(${JSON.stringify(n.f)},${args})`; }
      case 'tup': throw new Error('Unexpected point here');
      default: throw new Error('Bad expression');
    }
  }
  const ENV = { x: 'x', y: 'y', t: 't', 'θ': 'q', r: 'r' };
  const compile = (n, env = ENV) => new Function('x', 'y', 't', 'q', 'r', 'S', '"use strict";return ' + gen(n, env) + ';');
  const fact = (n) => { if (n < 0 || n !== Math.floor(n)) return gamma(n + 1); let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
  function gamma(z) { if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z)); z -= 1; const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61563184319342, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]; let x = c[0]; for (let i = 1; i < g + 2; i++) x += c[i] / (z + i); const t = z + g + 0.5; return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x; }

  /* ---------------- app ---------------- */
  MS.register({
    id: 'graph', name: 'Graphing Calc', icon: '📈', group: 'Tools', desc: 'Plot functions, polar, parametric, inequalities with sliders', keywords: 'graph graphing calculator desmos plot function math algebra calculus polar parametric derivative integral',
    async mount(view, args) {
      const st = await MS.store('graph', () => ({ graphs: [{ id: 'g1', name: 'My graph', lines: EXAMPLES['Getting started'].map((s, i) => ({ id: MS.uid(), src: s, color: COLORS[i % COLORS.length], on: true })), sliders: {} }], active: 'g1', deg: false, grid: true }));
      let G = st.data.graphs.find((g) => g.id === st.data.active) || st.data.graphs[0];
      if (args && args[0] && args[0].length > 4) { try { const lines = JSON.parse(decodeURIComponent(escape(atob(args[0])))); G = { id: MS.uid(), name: 'Shared graph', lines: lines.map((s, i) => ({ id: MS.uid(), src: s, color: COLORS[i % COLORS.length], on: true })), sliders: {} }; st.data.graphs.push(G); st.data.active = G.id; st.touch(); history.replaceState(null, '', '#/graph'); } catch (e) { MS.toast('Could not read shared graph', 'bad'); } }
      const cam = { cx: 0, cy: 0, s: 50 }; // pixels per unit
      let W = 800, H = 600, dpr = 1, compiled = [], selected = null, hover = null, integral = null, playing = new Set(), raf = 0, dirty = true;
      const vars = {}; const userFns = {};
      const S = {
        pow: (a, b) => (a < 0 && Number.isFinite(b) && b !== Math.round(b) && Math.abs(1 / b - Math.round(1 / b)) < 1e-9 && Math.round(1 / b) % 2 ? -Math.pow(-a, b) : Math.pow(a, b)),
        v: (k) => { if (k in vars) return vars[k]; throw new Error('undef:' + k); },
        u: (f, ...a) => { const fn = userFns[f]; if (!fn) throw new Error('undef:' + f); if (++depth > 200) { depth = 0; throw new Error('Too much recursion'); } try { return fn(...a); } finally { depth--; } },
        d: (f, n, x) => { const fn = (z) => (FUNCS[f] ? S.f[f](z) : S.u(f, z)); const hh = 1e-4; if (n === 1) return (fn(x + hh) - fn(x - hh)) / (2 * hh); if (n === 2) return (fn(x + hh) - 2 * fn(x) + fn(x - hh)) / (hh * hh); return NaN; },
        f: {},
      };
      let depth = 0;
      const trig = (fn) => (x) => fn(st.data.deg ? (x * Math.PI) / 180 : x), itrig = (fn) => (x) => (st.data.deg ? (fn(x) * 180) / Math.PI : fn(x));
      Object.assign(S.f, { sin: trig(Math.sin), cos: trig(Math.cos), tan: trig(Math.tan), sec: trig((x) => 1 / Math.cos(x)), csc: trig((x) => 1 / Math.sin(x)), cot: trig((x) => 1 / Math.tan(x)), asin: itrig(Math.asin), acos: itrig(Math.acos), atan: itrig(Math.atan), arcsin: itrig(Math.asin), arccos: itrig(Math.acos), arctan: itrig(Math.atan), atan2: (a, b) => (st.data.deg ? (Math.atan2(a, b) * 180) / Math.PI : Math.atan2(a, b)), sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, ln: Math.log, log: (x, b) => (b === undefined ? Math.log10(x) : Math.log(x) / Math.log(b)), log2: Math.log2, exp: Math.exp, floor: Math.floor, ceil: Math.ceil, round: Math.round, sign: Math.sign, min: Math.min, max: Math.max, mod: (a, b) => ((a % b) + b) % b, gamma, fact, nroot: (x, n) => S.pow(x, 1 / n), frac: (x) => x - Math.floor(x) });

      /* ---- DOM ---- */
      const list = h('div.col', { style: { gap: '0', flex: '1', overflow: 'auto' } });
      const analysis = h('div.small', { style: { padding: '10px', borderTop: '1px solid var(--line)', maxHeight: '38%', overflow: 'auto' } });
      const left = h('div.graph-left', { style: { width: '340px', flex: 'none', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--line)', background: 'var(--panel)', minHeight: 0 } },
        h('div.row', { style: { padding: '8px', borderBottom: '1px solid var(--line)', gap: '6px' } },
          h('button.btn.sm', { on: { click: () => addLine('', true) } }, '＋ Expression'),
          h('button.btn.sm', { on: { click: () => addLine('a = 1', true) } }, '＋ Slider'),
          h('button.btn.sm', { on: { click: () => addLine('(0, 0)', true) } }, '＋ Point'),
          h('div.spacer'), h('button.btn.sm', { title: 'Clear all', on: { click: async () => { if (await MS.confirm('Clear all expressions?')) { G.lines = []; addLine('', true); } } } }, '🗑')),
        list, analysis);
      const cv = h('canvas', { style: { width: '100%', height: '100%', display: 'block', touchAction: 'none', cursor: 'crosshair' } });
      const tip = h('div.small.mono', { style: { position: 'absolute', pointerEvents: 'none', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '8px', padding: '3px 8px', display: 'none', boxShadow: 'var(--shadow)', whiteSpace: 'nowrap' } });
      const zoomBtns = h('div.col', { style: { position: 'absolute', right: '10px', top: '10px', gap: '4px' } }, h('button.btn', { title: 'Zoom in', on: { click: () => zoomAt(W / 2, H / 2, 1.5) } }, '＋'), h('button.btn', { title: 'Zoom out', on: { click: () => zoomAt(W / 2, H / 2, 1 / 1.5) } }, '－'), h('button.btn', { title: 'Home view', on: { click: () => { cam.cx = 0; cam.cy = 0; cam.s = Math.min(W, H) / 20; dirty = true; } } }, '⌂'));
      const right = h('div', { style: { flex: 1, position: 'relative', minWidth: 0, minHeight: '300px' } }, cv, tip, zoomBtns);
      view.style.overflow = 'hidden';
      view.append(h('div.graph-wrap', { style: { display: 'flex', height: '100%' } }, left, right));
      const g = cv.getContext('2d');

      const graphSel = h('select.input', { style: { maxWidth: '160px' }, on: { change: () => { if (graphSel.value === '+') return newGraph(); st.data.active = graphSel.value; G = st.data.graphs.find((x) => x.id === graphSel.value); selected = null; integral = null; st.touch(); rebuild(); } } });
      const fillGraphs = () => { graphSel.innerHTML = ''; st.data.graphs.forEach((x) => graphSel.append(h('option', { value: x.id, selected: x.id === G.id }, x.name))); graphSel.append(h('option', { value: '+' }, '＋ New graph…')); };
      async function newGraph() { const name = await MS.prompt('Graph name', 'Graph ' + (st.data.graphs.length + 1)); if (!name) return fillGraphs(); G = { id: MS.uid(), name, lines: [], sliders: {} }; st.data.graphs.push(G); st.data.active = G.id; st.touch(); fillGraphs(); addLine('', true); }
      const exSel = h('select.input', { style: { maxWidth: '150px' }, on: { change: () => { const ex = EXAMPLES[exSel.value]; exSel.value = ''; if (!ex) return; G.lines = ex.map((s, i) => ({ id: MS.uid(), src: s, color: COLORS[i % COLORS.length], on: true })); G.sliders = {}; integral = null; selected = null; st.touch(); rebuild(); } } }, h('option', { value: '' }, '✨ Examples'), Object.keys(EXAMPLES).map((k) => h('option', { value: k }, k)));
      const degBtn = h('button.btn.sm', { title: 'Angle mode', on: { click: () => { st.data.deg = !st.data.deg; degBtn.textContent = st.data.deg ? 'DEG' : 'RAD'; st.touch(); rebuild(); } } }, st.data.deg ? 'DEG' : 'RAD');
      const gridBtn = h('button.btn.sm', { class: st.data.grid ? 'on' : '', on: { click: () => { st.data.grid = !st.data.grid; gridBtn.classList.toggle('on', st.data.grid); st.touch(); dirty = true; } } }, '▦ Grid');
      MS.setActions(graphSel, exSel, degBtn, gridBtn,
        h('button.btn.sm', { on: { click: async () => { const n = await MS.prompt('Rename graph', G.name); if (n) { G.name = n; st.touch(); fillGraphs(); } } } }, '✎'),
        h('button.btn.sm', { on: { click: () => { const link = location.origin + location.pathname + '#/graph/' + btoa(unescape(encodeURIComponent(JSON.stringify(G.lines.map((l) => l.src))))); navigator.clipboard?.writeText(link).then(() => MS.toast('Share link copied 🔗', 'good'), () => MS.prompt('Share link', link)); } } }, '🔗 Share'),
        h('button.btn.sm', { on: { click: () => cv.toBlob((b) => MS.download(G.name.replace(/\W+/g, '_') + '.png', b)) } }, '⬇ PNG'));
      fillGraphs();

      /* ---- expressions ---- */
      function addLine(src, focus, after) {
        const used = new Set(G.lines.map((l) => l.color)); const color = COLORS.find((c) => !used.has(c)) || COLORS[G.lines.length % COLORS.length];
        const ln = { id: MS.uid(), src, color, on: true }; const i = after ? G.lines.indexOf(after) + 1 : G.lines.length; G.lines.splice(i, 0, ln); st.touch(); renderList(); rebuild();
        if (focus) setTimeout(() => list.querySelector(`[data-id="${ln.id}"] input.gx`)?.focus(), 10);
        return ln;
      }
      function renderList() {
        list.innerHTML = '';
        G.lines.forEach((ln, idx) => {
          const c = compiled.find((x) => x.ln === ln) || {};
          const dot = h('button', { title: 'Show/hide · right-click for color', style: { width: '22px', height: '22px', borderRadius: '50%', border: '2px solid ' + ln.color, background: ln.on ? ln.color : 'transparent', cursor: 'pointer', flex: 'none' }, on: { click: () => { ln.on = !ln.on; st.touch(); renderList(); dirty = true; }, contextmenu: (e) => { e.preventDefault(); ln.color = COLORS[(COLORS.indexOf(ln.color) + 1) % COLORS.length]; st.touch(); renderList(); dirty = true; } } });
          const inp = h('input.gx.mono', { value: ln.src, placeholder: idx === 0 ? 'y = x^2   ·   r = θ   ·   (cos t, sin t)' : '', spellcheck: false, style: { flex: 1, minWidth: 0, background: 'none', border: 0, outline: 'none', fontSize: '15px', padding: '4px 0' },
            on: { input: () => { ln.src = inp.value; st.touch(); rebuild(true); }, focus: () => { selected = ln; dirty = true; renderAnalysis(); },
              keydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); addLine('', true, ln); } else if (e.key === 'Backspace' && !inp.value && G.lines.length > 1) { e.preventDefault(); const j = G.lines.indexOf(ln); G.lines.splice(j, 1); st.touch(); renderList(); rebuild(); list.querySelectorAll('input.gx')[Math.max(0, j - 1)]?.focus(); } else if (e.key === 'ArrowDown') list.querySelectorAll('input.gx')[idx + 1]?.focus(); else if (e.key === 'ArrowUp') list.querySelectorAll('input.gx')[idx - 1]?.focus(); } } });
          const info = h('div.small', { style: { color: c.err ? 'var(--bad)' : 'var(--muted)', minHeight: c.err || c.info ? '' : '0' } }, c.err || c.info || '');
          const row = h('div', { 'data-id': ln.id, style: { padding: '8px 10px', borderBottom: '1px solid var(--line)', borderLeft: '4px solid ' + (selected === ln ? ln.color : 'transparent') } },
            h('div.row', h('span.small.muted', { style: { width: '16px' } }, idx + 1), dot, inp, h('button.icon-btn', { title: 'Delete', on: { click: () => { G.lines.splice(G.lines.indexOf(ln), 1); if (selected === ln) selected = null; st.touch(); renderList(); rebuild(); } } }, '✕')), info);
          if (c.kind === 'slider') row.append(sliderUI(c));
          if (c.missing && c.missing.length) row.append(h('div.row', { style: { flexWrap: 'wrap', gap: '4px', marginTop: '4px' } }, h('span.small.muted', 'add slider:'), c.missing.map((v) => h('button.btn.sm', { on: { click: () => addLine(v + ' = 1', false) } }, v))));
          list.append(row);
        });
        list.append(h('div', { style: { padding: '10px', cursor: 'text', flex: 1, minHeight: '40px' }, on: { click: () => { const last = G.lines[G.lines.length - 1]; if (!last || last.src.trim()) addLine('', true); else list.querySelector(`[data-id="${last.id}"] input.gx`)?.focus(); } } }, h('span.small.muted', G.lines.length ? '' : 'Click to add an expression')));
      }
      function sliderUI(c) {
        const ln = c.ln; const cfg = (G.sliders[c.name] = G.sliders[c.name] || { min: -10, max: 10, step: 0.1 });
        const range = h('input', { type: 'range', min: cfg.min, max: cfg.max, step: cfg.step, value: vars[c.name], style: { flex: 1, minWidth: 0, accentColor: ln.color }, on: { input: () => setSlider(c.name, +range.value, ln) } });
        const num = (k) => h('input.input.mono', { value: cfg[k], style: { width: '52px', padding: '2px 4px', fontSize: '12px' }, on: { change: (e) => { cfg[k] = +e.target.value || 0; range[k] = cfg[k]; st.touch(); } } });
        const play = h('button.btn.sm', { on: { click: () => { if (playing.has(c.name)) playing.delete(c.name); else playing.add(c.name); play.textContent = playing.has(c.name) ? '⏸' : '▶'; } } }, playing.has(c.name) ? '⏸' : '▶');
        c.range = range;
        return h('div.row', { style: { marginTop: '6px', gap: '4px' } }, play, num('min'), range, num('max'));
      }
      function setSlider(name, v, ln) {
        v = Math.round(v * 1e6) / 1e6; vars[name] = v; ln = ln || G.lines.find((l) => compiled.find((c) => c.ln === l && c.kind === 'slider' && c.name === name));
        if (ln) { ln.src = name + ' = ' + v; const inp = list.querySelector(`[data-id="${ln.id}"] input.gx`); if (inp && document.activeElement !== inp) inp.value = ln.src; const c = compiled.find((x) => x.ln === ln); if (c?.range && document.activeElement !== c.range) c.range.value = v; }
        compiled.filter((c) => c.kind === 'const' && !c.err).forEach((c) => { try { vars[c.name] = c.expr(0, 0, 0, 0, 0, S); } catch (e) {} });
        st.touch(); dirty = true; if (selected) renderAnalysisSoon();
      }

      /* ---- compile all lines ---- */
      function rebuild(fromTyping) {
        compiled = []; for (const k in vars) delete vars[k]; for (const k in userFns) delete userFns[k];
        const fnNames = new Set();
        G.lines.forEach((ln) => { const m = ln.src.match(/^\s*([a-zA-Z](?:_[a-zA-Z0-9]+)?)\s*\(\s*([a-zA-Zθ])\s*\)\s*=/); if (m && !['x', 'y', 'r'].includes(m[1])) fnNames.add(m[1]); });
        for (const ln of G.lines) {
          const c = { ln }; compiled.push(c);
          const src = ln.src.trim(); if (!src) { c.kind = 'empty'; continue; }
          try {
            const P = parse(src, fnNames); c.P = P;
            const env = { ...ENV };
            const restrict = P.restr.length ? P.restr.map((r) => { const fs = r.parts.map((n) => compile(n)); return (x, y, t, q, rr) => { for (let i = 0; i < r.ops.length; i++) { const a = fs[i](x, y, t, q, rr, S), b = fs[i + 1](x, y, t, q, rr, S); const o = r.ops[i]; if (!(o === '<' ? a < b : o === '>' ? a > b : o === '<=' ? a <= b : o === '>=' ? a >= b : Math.abs(a - b) < 1e-9)) return false; } return true; }; }) : null;
            c.ok = restrict ? (x, y, t, q, rr) => restrict.every((f) => f(x, y, t, q, rr)) : null;
            // domain for t / θ from restriction like {0<t<10}
            c.dom = [0, 2 * Math.PI];
            P.restr.forEach((r) => { if (r.parts.length === 3 && r.parts[1].t === 'id' && (r.parts[1].v === 't' || r.parts[1].v === 'θ')) { try { c.domFn = [compile(r.parts[0]), compile(r.parts[2])]; } catch (e) {} } });
            const L = P.lhs, R = P.rhs;
            if (P.rel === '=' && L.t === 'call' && fnNames.has(L.f) && L.args.length === 1 && L.args[0].t === 'id') { // f(x) = ...
              const pn = L.args[0].v; const fenv = { ...env, [pn]: 'x' }; if (pn !== 'x') fenv.x = 'S.v("x")'; const body = new Function('x', 'y', 't', 'q', 'r', 'S', '"use strict";return ' + gen(R, fenv) + ';');
              userFns[L.f] = (z) => body(z, 0, 0, 0, 0, S); c.kind = pn === 'x' ? 'fx' : 'def'; c.name = L.f; if (pn === 'x') c.fy = (x) => body(x, 0, 0, 0, 0, S); c.vars = freeVars(R); c.vars.delete(pn);
            } else if (P.rel === '=' && L.t === 'id' && !['x', 'y', 'r'].includes(L.v) && !CONSTS[L.v] && L.v !== 't' && L.v !== 'θ' && !freeVars(R).has('x') && !freeVars(R).has('y')) { // slider or constant
              c.kind = 'slider'; c.name = L.v; c.expr = compile(R); c.vars = freeVars(R);
              c.isNum = R.t === 'num' || (R.t === 'neg' && R.a.t === 'num');
              if (!c.isNum) c.kind = 'const';
            } else if (P.rel === '=' && L.t === 'id' && L.v === 'y' && !freeVars(R).has('y')) { c.kind = 'fx'; const f = compile(R); c.fy = (x) => f(x, 0, 0, 0, 0, S); c.vars = freeVars(R); }
            else if (P.rel === '=' && R && R.t === 'id' && R.v === 'y' && !freeVars(L).has('y')) { c.kind = 'fx'; const f = compile(L); c.fy = (x) => f(x, 0, 0, 0, 0, S); c.vars = freeVars(L); }
            else if (P.rel === '=' && L.t === 'id' && L.v === 'x' && !freeVars(R).has('x')) { c.kind = 'fy'; const f = compile(R); c.fx = (y) => f(0, y, 0, 0, 0, S); c.vars = freeVars(R); }
            else if (P.rel === '=' && L.t === 'id' && L.v === 'r' && !freeVars(R).has('r')) { c.kind = 'polar'; const f = compile(R); c.fr = (q) => f(0, 0, 0, q, 0, S); c.vars = freeVars(R); }
            else if (!P.rel && (L.t === 'tup' || L.t === 'list')) {
              const tups = L.t === 'tup' ? [L] : L.items; if (tups.some((x) => x.t !== 'tup' || x.items.length !== 2)) throw new Error('Points need (x, y)');
              const fv = freeVars(L);
              if (fv.has('t')) { c.kind = 'param'; const fx = compile(tups[0].items[0]), fy = compile(tups[0].items[1]); c.fp = (t) => [fx(0, 0, t, 0, 0, S), fy(0, 0, t, 0, 0, S)]; }
              else { c.kind = 'points'; c.pts = tups.map((tp) => ({ fx: compile(tp.items[0]), fy: compile(tp.items[1]), drag: tp.items.map((n) => (n.t === 'id' ? n.v : null)) })); }
              c.vars = fv;
            } else if (!P.rel) {
              const fv = freeVars(L);
              if (fv.has('y')) throw new Error('Add “= …” to make an equation');
              if (fv.has('x')) { c.kind = 'fx'; const f = compile(L); c.fy = (x) => f(x, 0, 0, 0, 0, S); c.vars = fv; }
              else if (fv.has('θ')) { c.kind = 'polar'; const f = compile(L); c.fr = (q) => f(0, 0, 0, q, 0, S); c.vars = fv; }
              else { c.kind = 'value'; c.expr = compile(L); c.vars = fv; }
            } else {
              // implicit equation or inequality
              const a = compile(L.t === 'list' ? (() => { throw new Error('Bad equation'); })() : L), b = compile(R);
              c.kind = P.rel === '=' ? 'implicit' : 'ineq'; c.rel = P.rel; c.F = (x, y) => a(x, y, 0, 0, Math.hypot(x, y), S) - b(x, y, 0, 0, Math.hypot(x, y), S);
              c.vars = freeVars(L); freeVars(R, c.vars); c.polarish = c.vars.has('θ');
              if (c.polarish) { c.F = (x, y) => { const q = Math.atan2(y, x), r = Math.hypot(x, y); return a(x, y, 0, q, r, S) - b(x, y, 0, q, r, S); }; }
              // fast path: y < f(x) / y > f(x)
              if (c.kind === 'ineq' && !c.ok && L.t === 'id' && L.v === 'y' && !freeVars(R).has('y')) { const f = compile(R); c.fy = (x) => f(x, 0, 0, 0, 0, S); }
              if (c.kind === 'ineq' && !c.ok && R.t === 'id' && R.v === 'y' && !freeVars(L).has('y')) { const f = compile(L); c.fy = (x) => f(x, 0, 0, 0, 0, S); c.rel = { '<': '>', '>': '<', '<=': '>=', '>=': '<=' }[c.rel]; }
            }
          } catch (e) { c.kind = 'error'; c.err = e.message; }
        }
        // evaluate sliders/constants in dependency order (few passes)
        compiled.filter((c) => c.kind === 'slider').forEach((c) => { try { vars[c.name] = c.expr(0, 0, 0, 0, 0, S); } catch (e) { c.err = e.message; } });
        for (let pass = 0; pass < 5; pass++) compiled.filter((c) => c.kind === 'const').forEach((c) => { try { vars[c.name] = c.expr(0, 0, 0, 0, 0, S); c.info = '= ' + fmt(vars[c.name]); c.err = null; } catch (e) { c.err = /^undef:/.test(e.message) ? null : e.message; } });
        const known = new Set([...Object.keys(vars), ...Object.keys(userFns), 'x', 'y', 't', 'θ', 'r', ...Object.keys(CONSTS)]);
        for (const c of compiled) {
          if (c.vars) { const miss = [...c.vars].filter((v) => !known.has(v)); if (c.kind === 'def') miss.splice(0, miss.length, ...miss.filter((v) => v !== 'x')); if (miss.length) { c.missing = miss; c.err = c.err || 'Undefined: ' + miss.join(', '); c.broken = true; } }
          if (c.kind === 'value' && !c.broken) { try { c.info = '= ' + fmt(c.expr(0, 0, 0, 0, 0, S)); } catch (e) { c.err = e.message; } }
          if (c.kind === 'def') c.info = 'function ' + c.name;
        }
        dirty = true;
        if (fromTyping) { // update only info lines to avoid stealing focus
          compiled.forEach((c) => { const row = list.querySelector(`[data-id="${c.ln.id}"]`); if (!row) return; const info = row.children[1]; info.textContent = c.err || c.info || ''; info.style.color = c.err ? 'var(--bad)' : 'var(--muted)'; const hadSlider = !!row.querySelector('input[type=range]'); const hadMissing = !!row.querySelector('.row .btn.sm') && !hadSlider; if ((c.kind === 'slider') !== hadSlider || (!!(c.missing && c.missing.length)) !== hadMissing) { const focusId = c.ln.id; const pos = document.activeElement?.selectionStart; renderList(); const inp = list.querySelector(`[data-id="${focusId}"] input.gx`); if (inp) { inp.focus(); try { inp.setSelectionRange(pos, pos); } catch (e) {} } } });
        } else renderList();
        renderAnalysisSoon();
      }
      const fmt = (v) => { if (typeof v !== 'number') return String(v); if (Math.abs(v) < 1e-12) v = 0; if (!Number.isFinite(v)) return Number.isNaN(v) ? 'undefined' : v > 0 ? '∞' : '-∞'; if (Math.abs(v) >= 1e7 || (Math.abs(v) < 1e-5 && v !== 0)) return v.toExponential(4); return String(Math.round(v * 1e6) / 1e6); };

      /* ---- coordinates ---- */
      const X = (x) => W / 2 + (x - cam.cx) * cam.s, Y = (y) => H / 2 - (y - cam.cy) * cam.s;
      const ix = (px) => cam.cx + (px - W / 2) / cam.s, iy = (py) => cam.cy - (py - H / 2) / cam.s;
      const safe = (f, ...a) => { try { const v = f(...a); return typeof v === 'number' ? v : NaN; } catch (e) { return NaN; } };
      function niceStep(px) { const raw = px / cam.s; const p = Math.pow(10, Math.floor(Math.log10(raw))); const m = raw / p; return (m < 2 ? 2 : m < 5 ? 5 : 10) * p; }
      const css = (k) => getComputedStyle(view).getPropertyValue(k).trim();

      /* ---- drawing ---- */
      function draw() {
        dirty = false;
        const bg = css('--bg') || '#111', text = css('--text') || '#fff', muted = css('--muted') || '#999', line = css('--line') || '#333';
        g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = bg; g.fillRect(0, 0, W, H);
        const x0 = ix(0), x1 = ix(W), y0 = iy(H), y1 = iy(0);
        const step = niceStep(90);
        if (st.data.grid) {
          g.lineWidth = 1; g.strokeStyle = line; g.globalAlpha = 0.45; g.beginPath(); const mn = step / 5;
          for (let x = Math.ceil(x0 / mn) * mn; x < x1; x += mn) { g.moveTo(Math.round(X(x)) + 0.5, 0); g.lineTo(Math.round(X(x)) + 0.5, H); }
          for (let y = Math.ceil(y0 / mn) * mn; y < y1; y += mn) { g.moveTo(0, Math.round(Y(y)) + 0.5); g.lineTo(W, Math.round(Y(y)) + 0.5); }
          g.stroke(); g.globalAlpha = 1; g.beginPath();
          for (let x = Math.ceil(x0 / step) * step; x < x1; x += step) { g.moveTo(Math.round(X(x)) + 0.5, 0); g.lineTo(Math.round(X(x)) + 0.5, H); }
          for (let y = Math.ceil(y0 / step) * step; y < y1; y += step) { g.moveTo(0, Math.round(Y(y)) + 0.5); g.lineTo(W, Math.round(Y(y)) + 0.5); }
          g.stroke();
        }
        // axes
        g.strokeStyle = muted; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, Y(0)); g.lineTo(W, Y(0)); g.moveTo(X(0), 0); g.lineTo(X(0), H); g.stroke();
        g.fillStyle = muted; g.font = '11px ' + (css('--mono') || 'monospace');
        const lab = (v) => { const s = Math.abs(v) < step / 1e6 ? '0' : Math.abs(step) >= 1e5 || Math.abs(step) < 1e-3 ? v.toExponential(1) : String(+v.toPrecision(10)); return s; };
        const ay = MS.clamp(Y(0) + 14, 14, H - 4), ax = MS.clamp(X(0) - 5, 30, W - 4);
        g.textAlign = 'center'; for (let x = Math.ceil(x0 / step) * step; x < x1; x += step) if (Math.abs(x) > step / 2) g.fillText(lab(x), X(x), ay);
        g.textAlign = 'right'; for (let y = Math.ceil(y0 / step) * step; y < y1; y += step) if (Math.abs(y) > step / 2) g.fillText(lab(y), ax, Y(y) + 4);
        // integral shading
        if (integral && integral.c && integral.c.fy && integral.c.ln.on) { const { a, b, c } = integral; g.fillStyle = c.ln.color; g.globalAlpha = 0.25; g.beginPath(); g.moveTo(X(a), Y(0)); const n = 300; for (let i = 0; i <= n; i++) { const x = a + ((b - a) * i) / n; const y = safe(c.fy, x); g.lineTo(X(x), Number.isFinite(y) ? Y(y) : Y(0)); } g.lineTo(X(b), Y(0)); g.closePath(); g.fill(); g.globalAlpha = 1; }
        for (const c of compiled) { if (!c.ln.on || c.broken || c.err) continue; g.strokeStyle = g.fillStyle = c.ln.color; g.lineWidth = selected === c.ln ? 3.2 : 2.4; try { drawOne(c, x0, x1, y0, y1); } catch (e) {} }
        // markers for selected
        if (selected) { const c = compiled.find((x) => x.ln === selected); if (c && c.marks) for (const m of c.marks) { g.fillStyle = bg; g.strokeStyle = muted; g.lineWidth = 2; g.beginPath(); g.arc(X(m.x), Y(m.y), 4.5, 0, 7); g.fill(); g.stroke(); } }
        if (hover) { g.fillStyle = hover.color; g.beginPath(); g.arc(X(hover.x), Y(hover.y), 5.5, 0, 7); g.fill(); g.strokeStyle = bg; g.lineWidth = 2; g.stroke(); }
      }
      function strokePath(pts) { g.beginPath(); let pen = false; for (const p of pts) { if (!p) { pen = false; continue; } if (!pen) { g.moveTo(p[0], p[1]); pen = true; } else g.lineTo(p[0], p[1]); } g.stroke(); }
      function drawOne(c, x0, x1, y0, y1) {
        const ok = c.ok;
        if (c.kind === 'fx' || (c.kind === 'ineq' && c.fy)) {
          const pts = []; let prev = null;
          for (let px = 0; px <= W; px += 1) { const x = ix(px); let y = safe(c.fy, x); if (ok && !ok(x, y, 0, 0, 0)) y = NaN; if (!Number.isFinite(y)) { pts.push(null); prev = null; continue; } const py = Y(y); if (prev !== null && Math.abs(py - prev) > H * 1.5) pts.push(null); pts.push([px, MS.clamp(py, -1e4, 1e4)]); prev = py; }
          if (c.kind === 'ineq') { g.globalAlpha = 0.22; const up = c.rel[0] === '>'; let seg = []; const flush = () => { if (seg.length > 1) { g.beginPath(); g.moveTo(seg[0][0], up ? 0 : H); seg.forEach((p) => g.lineTo(p[0], p[1])); g.lineTo(seg[seg.length - 1][0], up ? 0 : H); g.fill(); } seg = []; }; pts.forEach((p) => (p ? seg.push(p) : flush())); flush(); g.globalAlpha = 1; if (c.rel.length === 1) g.setLineDash([7, 5]); }
          strokePath(pts); g.setLineDash([]); return;
        }
        if (c.kind === 'fy') { const pts = []; for (let py = 0; py <= H; py++) { const y = iy(py); let x = safe(c.fx, y); if (ok && !ok(x, y, 0, 0, 0)) x = NaN; pts.push(Number.isFinite(x) ? [MS.clamp(X(x), -1e4, 1e4), py] : null); } strokePath(pts); return; }
        if (c.kind === 'polar' || c.kind === 'param') {
          let [a, b] = c.dom; if (c.domFn) { a = safe(c.domFn[0], 0, 0, 0, 0, 0, S); b = safe(c.domFn[1], 0, 0, 0, 0, 0, S); if (!Number.isFinite(a) || !Number.isFinite(b)) return; }
          const n = MS.clamp(Math.ceil(Math.abs(b - a) * 400), 400, 20000); const pts = []; let last = null;
          for (let i = 0; i <= n; i++) { const t = a + ((b - a) * i) / n; let xy; if (c.kind === 'polar') { const r = safe(c.fr, st.data.deg ? (t * 180) / Math.PI : t); xy = [r * Math.cos(t), r * Math.sin(t)]; } else { try { xy = c.fp(t); } catch (e) { xy = [NaN, NaN]; } } if (!Number.isFinite(xy[0]) || !Number.isFinite(xy[1])) { pts.push(null); last = null; continue; } const p = [X(xy[0]), Y(xy[1])]; if (last && Math.hypot(p[0] - last[0], p[1] - last[1]) > Math.max(W, H)) pts.push(null); pts.push(p); last = p; }
          strokePath(pts); return;
        }
        if (c.kind === 'points') { for (const pt of c.pts) { const x = safe(pt.fx, 0, 0, 0, 0, 0, S), y = safe(pt.fy, 0, 0, 0, 0, 0, S); if (!Number.isFinite(x) || !Number.isFinite(y)) continue; const drag = pt.drag[0] && pt.drag[0] in vars || pt.drag[1] && pt.drag[1] in vars; g.beginPath(); g.arc(X(x), Y(y), drag ? 7 : 5, 0, 7); g.fill(); if (drag) { g.globalAlpha = 0.25; g.beginPath(); g.arc(X(x), Y(y), 13, 0, 7); g.fill(); g.globalAlpha = 1; } g.font = '12px ' + css('--mono'); g.textAlign = 'left'; g.fillText(`(${fmt(x)}, ${fmt(y)})`, X(x) + 9, Y(y) - 9); } return; }
        if (c.kind === 'implicit' || c.kind === 'ineq') {
          const cs = 4, nx = Math.ceil(W / cs) + 1, ny = Math.ceil(H / cs) + 1; const F = new Float64Array(nx * ny);
          for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const x = ix(i * cs), y = iy(j * cs); let v = safe(c.F, x, y); if (ok && !ok(x, y, 0, 0, 0)) v = NaN; F[j * nx + i] = v; }
          if (c.kind === 'ineq') { const want = c.rel[0] === '<'; g.globalAlpha = 0.22; for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) { const v = F[j * nx + i]; if (Number.isFinite(v) && (want ? v < 0 : v > 0)) g.fillRect(i * cs - cs / 2, j * cs - cs / 2, cs, cs); } g.globalAlpha = 1; if (c.rel.length === 1) g.setLineDash([7, 5]); }
          g.beginPath();
          for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
            const a = F[j * nx + i], b = F[j * nx + i + 1], cc = F[(j + 1) * nx + i + 1], d = F[(j + 1) * nx + i];
            if (!(Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(cc) && Number.isFinite(d))) continue;
            const e = []; const px = i * cs, py = j * cs;
            if ((a < 0) !== (b < 0)) e.push([px + (cs * a) / (a - b), py]);
            if ((b < 0) !== (cc < 0)) e.push([px + cs, py + (cs * b) / (b - cc)]);
            if ((d < 0) !== (cc < 0)) e.push([px + (cs * d) / (d - cc), py + cs]);
            if ((a < 0) !== (d < 0)) e.push([px, py + (cs * a) / (a - d)]);
            const big = Math.max(Math.abs(a), Math.abs(b), Math.abs(cc), Math.abs(d)); if (big > 1e3 * (1 + 4 / cam.s) && c.kind === 'implicit' && Math.min(Math.abs(a), Math.abs(b), Math.abs(cc), Math.abs(d)) > 50 / cam.s) continue; // asymptote
            for (let k = 0; k + 1 < e.length; k += 2) { g.moveTo(e[k][0], e[k][1]); g.lineTo(e[k + 1][0], e[k + 1][1]); }
          }
          g.stroke(); g.setLineDash([]);
        }
      }

      /* ---- analysis: roots, extrema, intercepts, intersections ---- */
      function bisect(f, a, b) { let fa = f(a); for (let i = 0; i < 60; i++) { const m = (a + b) / 2, fm = f(m); if (!Number.isFinite(fm)) return null; if ((fa < 0) === (fm < 0)) { a = m; fa = fm; } else b = m; } return (a + b) / 2; }
      function scan(f, a, b, n = 800) { const out = []; let px = a, pv = safe(f, a); for (let i = 1; i <= n; i++) { const x = a + ((b - a) * i) / n, v = safe(f, x); if (Number.isFinite(pv) && Number.isFinite(v)) { if (v === 0) out.push(x); else if ((pv < 0) !== (v < 0) && Math.abs(v - pv) < 1e3) { const r = bisect(f, px, x); if (r !== null) out.push(r); } } px = x; pv = v; } return out; }
      function analyze(c) {
        if (!c || c.kind !== 'fx' || c.broken || c.err) return null;
        const a = ix(0), b = ix(W), fr = (o) => (x) => { const y = safe(o.fy, x); return o.ok && !o.ok(x, y, 0, 0, 0) ? NaN : y; }, f = fr(c);
        const roots = scan(f, a, b).filter((x) => Math.abs(f(x)) < 1e-6).map((x) => ({ x, y: 0, k: 'root' }));
        const hh = (b - a) * 1e-5; const df = (x) => (f(x + hh) - f(x - hh)) / (2 * hh);
        const ext = scan(df, a, b).map((x) => { const y = f(x); const l = f(x - hh * 20), r = f(x + hh * 20); return { x, y, k: l > y && r > y ? 'min' : l < y && r < y ? 'max' : 'flat' }; }).filter((m) => m.k !== 'flat' && Number.isFinite(m.y));
        const yi = f(0); const marks = [...roots, ...ext]; if (Number.isFinite(yi) && a < 0 && b > 0) marks.push({ x: 0, y: yi, k: 'y-int' });
        const inter = []; for (const o of compiled) { if (o === c || o.kind !== 'fx' || o.broken || o.err || !o.ln.on) continue; const g2 = fr(o); if ([0.13, 0.37, 0.61, 0.89].every((k) => { const x = a + (b - a) * k; const d = f(x) - g2(x); return !Number.isFinite(d) || Math.abs(d) < 1e-9; })) continue; scan((x) => f(x) - g2(x), a, b, 600).forEach((x) => { const y = f(x); if (Number.isFinite(y) && Math.abs(y - g2(x)) < 1e-5) inter.push({ x, y, k: 'meets #' + (G.lines.indexOf(o.ln) + 1) }); }); }
        marks.push(...inter); const out = []; for (const m of marks) if (!out.some((o) => o.k === m.k && Math.abs(o.x - m.x) < 1e-6 * (1 + Math.abs(m.x)))) out.push(m); return out.slice(0, 60);
      }
      let anaT; const renderAnalysisSoon = () => { clearTimeout(anaT); anaT = setTimeout(renderAnalysis, 120); };
      function renderAnalysis() {
        analysis.innerHTML = ''; compiled.forEach((c) => (c.marks = null));
        const c = compiled.find((x) => x.ln === selected);
        if (!c || c.kind !== 'fx' || c.broken || c.err) { analysis.append(h('div.muted.ana-hint', '💡 Click an expression y = f(x) to see roots, extrema, intersections, an integral and a table of values. Drag to pan, scroll/pinch to zoom, hover a curve to trace.')); integral = null; dirty = true; return; }
        c.marks = analyze(c); dirty = true;
        const num = (v) => h('span.mono', fmt(v));
        analysis.append(h('strong', { style: { color: c.ln.color } }, 'Analysis of #' + (G.lines.indexOf(c.ln) + 1)));
        const groups = {}; (c.marks || []).forEach((m) => (groups[m.k] = groups[m.k] || []).push(m));
        if (!Object.keys(groups).length) analysis.append(h('div.muted', 'No roots or turning points in view.'));
        Object.entries(groups).forEach(([k, ms]) => analysis.append(h('div', { style: { margin: '4px 0' } }, h('span.tag', k), ' ', ms.slice(0, 8).map((m, i) => h('a', { href: '#', style: { marginRight: '8px' }, on: { click: (e) => { e.preventDefault(); cam.cx = m.x; cam.cy = m.y; dirty = true; } } }, `(${fmt(m.x)}, ${fmt(m.y)})`)))));
        // evaluate & integral
        const xin = h('input.input.mono', { value: '1', style: { width: '70px' } }); const xout = h('span.mono');
        const upd = () => { xout.textContent = 'f(' + xin.value + ') = ' + fmt(safe(c.fy, +xin.value)); };
        xin.oninput = upd; upd();
        const ia = h('input.input.mono', { value: integral?.a ?? 0, style: { width: '60px' } }), ib = h('input.input.mono', { value: integral?.b ?? 1, style: { width: '60px' } }); const iout = h('span.mono');
        const integ = () => { const a = +ia.value, b = +ib.value; if (!Number.isFinite(a) || !Number.isFinite(b)) return; const n = 2000; let s = 0; const hh = (b - a) / n; for (let i = 0; i <= n; i++) { const w = i === 0 || i === n ? 1 : i % 2 ? 4 : 2; s += w * safe(c.fy, a + i * hh); } s *= hh / 3; iout.textContent = '∫ = ' + fmt(s); integral = { a, b, c }; dirty = true; };
        ia.oninput = ib.oninput = integ;
        analysis.append(h('div.row', { style: { marginTop: '6px', flexWrap: 'wrap' } }, 'x =', xin, xout), h('div.row', { style: { marginTop: '6px', flexWrap: 'wrap' } }, '∫ from', ia, 'to', ib, h('button.btn.sm', { on: { click: integ } }, 'Shade'), h('button.btn.sm', { on: { click: () => { integral = null; iout.textContent = ''; dirty = true; } } }, '✕'), iout));
        if (integral && integral.c && integral.c.ln === c.ln) integ(); else integral = null;
        // table
        const t0 = h('input.input.mono', { value: -3, style: { width: '56px' } }), dt = h('input.input.mono', { value: 1, style: { width: '56px' } }); const tbl = h('table.mono', { style: { borderCollapse: 'collapse', marginTop: '6px', width: '100%' } });
        const tab = () => { tbl.innerHTML = ''; tbl.append(h('tr', h('th', { style: { textAlign: 'left' } }, 'x'), h('th', { style: { textAlign: 'left' } }, 'y'))); for (let i = 0; i < 9; i++) { const x = +t0.value + i * +dt.value; tbl.append(h('tr', h('td', { style: { borderTop: '1px solid var(--line)' } }, fmt(x)), h('td', { style: { borderTop: '1px solid var(--line)' } }, fmt(safe(c.fy, x))))); } };
        t0.oninput = dt.oninput = tab; tab();
        analysis.append(h('details', { style: { marginTop: '6px' } }, h('summary', '📋 Table of values'), h('div.row', { style: { marginTop: '4px' } }, 'start', t0, 'step', dt), tbl));
      }

      /* ---- interaction ---- */
      function zoomAt(px, py, k) { const wx = ix(px), wy = iy(py); cam.s = MS.clamp(cam.s * k, 1e-4, 1e8); cam.cx = wx - (px - W / 2) / cam.s; cam.cy = wy + (py - H / 2) / cam.s; dirty = true; renderAnalysisSoon(); }
      cv.addEventListener('wheel', (e) => { e.preventDefault(); const r = cv.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
      const ptrs = new Map(); let pan = null, pinch = null, dragPt = null;
      const hitPoint = (px, py) => { for (const c of compiled) { if (c.kind !== 'points' || !c.ln.on || c.broken) continue; for (const pt of c.pts) { const x = safe(pt.fx, 0, 0, 0, 0, 0, S), y = safe(pt.fy, 0, 0, 0, 0, 0, S); const dv = pt.drag.filter((v) => v && v in vars && compiled.some((s) => s.kind === 'slider' && s.name === v)); if (dv.length && Math.hypot(X(x) - px, Y(y) - py) < 14) return pt; } } return null; };
      cv.addEventListener('pointerdown', (e) => {
        cv.setPointerCapture(e.pointerId); const r = cv.getBoundingClientRect(); const px = e.clientX - r.left, py = e.clientY - r.top; ptrs.set(e.pointerId, [px, py]);
        if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), s: cam.s }; pan = null; return; }
        const pt = hitPoint(px, py); if (pt) { dragPt = pt; return; }
        pan = { px, py, cx: cam.cx, cy: cam.cy, moved: false };
      });
      cv.addEventListener('pointermove', (e) => {
        const r = cv.getBoundingClientRect(); const px = e.clientX - r.left, py = e.clientY - r.top; if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, [px, py]);
        if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); const k = (pinch.s * d) / pinch.d / cam.s; zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, k); return; }
        if (dragPt) { const [vx, vy] = dragPt.drag; const snap = (v) => Math.round(v / (niceStep(90) / 10)) * (niceStep(90) / 10); if (vx && vx in vars) setSlider(vx, snap(ix(px))); if (vy && vy in vars) setSlider(vy, snap(iy(py))); return; }
        if (pan) { if (Math.abs(px - pan.px) + Math.abs(py - pan.py) > 3) pan.moved = true; cam.cx = pan.cx - (px - pan.px) / cam.s; cam.cy = pan.cy + (py - pan.py) / cam.s; dirty = true; tip.style.display = 'none'; hover = null; return; }
        // trace
        cv.style.cursor = hitPoint(px, py) ? 'grab' : 'crosshair';
        let best = null; const x = ix(px);
        for (const c of compiled) { if (!c.ln.on || c.broken || c.err || !(c.kind === 'fx')) continue; const y = safe(c.fy, x); if (!Number.isFinite(y)) continue; const d = Math.abs(Y(y) - py); if (d < 16 && (!best || d < best.d)) best = { d, x, y, color: c.ln.color, n: G.lines.indexOf(c.ln) + 1 }; }
        if (selected) { const c = compiled.find((q) => q.ln === selected); (c?.marks || []).forEach((m) => { const d = Math.hypot(X(m.x) - px, Y(m.y) - py); if (d < 10) best = { d: 0, x: m.x, y: m.y, color: c.ln.color, n: m.k }; }); }
        hover = best; dirty = true;
        if (best) { tip.style.display = 'block'; tip.style.left = MS.clamp(X(best.x) + 12, 0, W - 160) + 'px'; tip.style.top = MS.clamp(Y(best.y) - 30, 0, H - 24) + 'px'; tip.style.borderColor = best.color; tip.textContent = `${typeof best.n === 'number' ? '#' + best.n : best.n}  (${fmt(best.x)}, ${fmt(best.y)})`; }
        else { tip.style.display = 'block'; tip.style.borderColor = 'var(--line)'; tip.style.left = px + 14 + 'px'; tip.style.top = py + 10 + 'px'; tip.textContent = `${fmt(+ix(px).toPrecision(4))}, ${fmt(+iy(py).toPrecision(4))}`; }
      });
      const up = (e) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (pan && pan.moved) renderAnalysisSoon(); pan = null; dragPt = null; };
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      cv.addEventListener('pointerleave', () => { tip.style.display = 'none'; hover = null; dirty = true; });

      function resize() { const r = right.getBoundingClientRect(); dpr = devicePixelRatio || 1; const fresh = W === 800 && H === 600; W = Math.max(50, r.width); H = Math.max(50, r.height); cv.width = W * dpr; cv.height = H * dpr; if (fresh) cam.s = Math.min(W, H) / 20; dirty = true; }
      let lastT = performance.now();
      function loop(now) { const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now; if (playing.size) { for (const name of playing) { const cfg = G.sliders[name] || { min: -10, max: 10 }; let v = (vars[name] ?? 0) + (cfg.max - cfg.min) * dt * 0.15; if (v > cfg.max) v = cfg.min; setSlider(name, v); } } if (dirty) draw(); raf = requestAnimationFrame(loop); }
      const ro = new ResizeObserver(resize); ro.observe(right); resize();
      const themeOff = MS.on('store:settings', () => setTimeout(() => (dirty = true), 50));
      rebuild(); raf = requestAnimationFrame(loop);
      return { unmount: () => { cancelAnimationFrame(raf); ro.disconnect(); themeOff(); clearTimeout(anaT); } };
    },
  });
})();
