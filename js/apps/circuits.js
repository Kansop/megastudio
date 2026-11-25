/* Logic Lab: digital circuit simulator — gates, switches, buttons, clocks, LEDs, 7-segment displays, D flip-flops,
   wiring, live signal propagation, truth tables, presets (adders, latches, counter), undo, copy/paste, JSON import/export */
(function () {
  const { h } = MS;
  const T = {
    switch: { n: 'Switch', ins: 0, outs: 1, w: 56, icon: '🔘', cat: 'Input' },
    button: { n: 'Button', ins: 0, outs: 1, w: 56, icon: '⏺', cat: 'Input' },
    clock: { n: 'Clock', ins: 0, outs: 1, w: 56, icon: '⏱', cat: 'Input' },
    const1: { n: 'High (1)', ins: 0, outs: 1, w: 40, icon: '1', cat: 'Input' },
    const0: { n: 'Low (0)', ins: 0, outs: 1, w: 40, icon: '0', cat: 'Input' },
    and: { n: 'AND', ins: 2, outs: 1, w: 64, f: (a) => a[0] & a[1], cat: 'Gate' },
    or: { n: 'OR', ins: 2, outs: 1, w: 64, f: (a) => a[0] | a[1], cat: 'Gate' },
    not: { n: 'NOT', ins: 1, outs: 1, w: 56, f: (a) => 1 - a[0], cat: 'Gate' },
    nand: { n: 'NAND', ins: 2, outs: 1, w: 70, f: (a) => 1 - (a[0] & a[1]), cat: 'Gate' },
    nor: { n: 'NOR', ins: 2, outs: 1, w: 70, f: (a) => 1 - (a[0] | a[1]), cat: 'Gate' },
    xor: { n: 'XOR', ins: 2, outs: 1, w: 68, f: (a) => a[0] ^ a[1], cat: 'Gate' },
    xnor: { n: 'XNOR', ins: 2, outs: 1, w: 74, f: (a) => 1 - (a[0] ^ a[1]), cat: 'Gate' },
    buf: { n: 'Buffer', ins: 1, outs: 1, w: 50, f: (a) => a[0], cat: 'Gate' },
    and3: { n: 'AND-3', ins: 3, outs: 1, w: 64, f: (a) => a[0] & a[1] & a[2], cat: 'Gate' },
    or3: { n: 'OR-3', ins: 3, outs: 1, w: 64, f: (a) => a[0] | a[1] | a[2], cat: 'Gate' },
    dff: { n: 'D flip-flop', ins: 2, outs: 2, w: 70, pinsIn: ['D', '▷'], pinsOut: ['Q', 'Q̅'], cat: 'Memory' },
    tff: { n: 'T flip-flop', ins: 2, outs: 2, w: 70, pinsIn: ['T', '▷'], pinsOut: ['Q', 'Q̅'], cat: 'Memory' },
    led: { n: 'LED', ins: 1, outs: 0, w: 44, cat: 'Output' },
    seg7: { n: '7-segment', ins: 4, outs: 0, w: 70, hgt: 104, pinsIn: ['1', '2', '4', '8'], cat: 'Output' },
    label: { n: 'Text', ins: 0, outs: 0, w: 120, hgt: 30, cat: 'Output' },
  };
  const size = (c) => { const t = T[c.type]; return [t.w, t.hgt || Math.max(40, Math.max(t.ins, t.outs) * 22 + 12)]; };
  const pinIn = (c, i) => { const [w, hh] = size(c); const n = T[c.type].ins; return [c.x - 6, c.y + ((i + 1) * hh) / (n + 1)]; };
  const pinOut = (c, i) => { const [w, hh] = size(c); const n = T[c.type].outs; return [c.x + w + 6, c.y + ((i + 1) * hh) / (n + 1)]; };
  // presets are built programmatically
  function P() { const comps = [], wires = []; let id = 0; const add = (type, x, y, extra = {}) => { const c = { id: 'c' + ++id, type, x, y, ...extra }; comps.push(c); return c; }; const wire = (a, ai, b, bi) => wires.push({ from: [a.id, ai], to: [b.id, bi] }); return { comps, wires, add, wire }; }
  const PRESETS = {
    'Half adder': () => { const p = P(); const a = p.add('switch', 60, 80, { label: 'A' }), b = p.add('switch', 60, 200, { label: 'B' }); const x = p.add('xor', 240, 70), n = p.add('and', 240, 190); const s = p.add('led', 420, 76, { label: 'Sum' }), c = p.add('led', 420, 196, { label: 'Carry', color: '#ffb84f' }); p.wire(a, 0, x, 0); p.wire(b, 0, x, 1); p.wire(a, 0, n, 0); p.wire(b, 0, n, 1); p.wire(x, 0, s, 0); p.wire(n, 0, c, 0); p.add('label', 160, 10, { label: 'Half adder: A + B' }); return p; },
    'Full adder': () => { const p = P(); const a = p.add('switch', 40, 60, { label: 'A' }), b = p.add('switch', 40, 150, { label: 'B' }), ci = p.add('switch', 40, 260, { label: 'Cin' }); const x1 = p.add('xor', 200, 80), x2 = p.add('xor', 380, 140), a1 = p.add('and', 380, 240), a2 = p.add('and', 200, 300), o = p.add('or', 540, 270); const s = p.add('led', 600, 146, { label: 'Sum' }), co = p.add('led', 700, 276, { label: 'Cout', color: '#ffb84f' }); p.wire(a, 0, x1, 0); p.wire(b, 0, x1, 1); p.wire(x1, 0, x2, 0); p.wire(ci, 0, x2, 1); p.wire(x1, 0, a1, 0); p.wire(ci, 0, a1, 1); p.wire(a, 0, a2, 0); p.wire(b, 0, a2, 1); p.wire(a1, 0, o, 0); p.wire(a2, 0, o, 1); p.wire(x2, 0, s, 0); p.wire(o, 0, co, 0); return p; },
    'SR latch (NOR)': () => { const p = P(); const s = p.add('button', 60, 70, { label: 'Set' }), r = p.add('button', 60, 230, { label: 'Reset' }); const n1 = p.add('nor', 240, 60), n2 = p.add('nor', 240, 220); const q = p.add('led', 440, 66, { label: 'Q' }), qn = p.add('led', 440, 226, { label: 'Q̅', color: '#ff4fa3' }); p.wire(r, 0, n1, 0); p.wire(n2, 0, n1, 1); p.wire(s, 0, n2, 1); p.wire(n1, 0, n2, 0); p.wire(n1, 0, q, 0); p.wire(n2, 0, qn, 0); return p; },
    '4-bit counter': () => { const p = P(); const clk = p.add('clock', 40, 160, { label: 'CLK', period: 600 }); const one = p.add('const1', 40, 40); const ffs = []; for (let i = 0; i < 4; i++) { const f = p.add('tff', 160 + i * 150, 140); ffs.push(f); p.wire(one, 0, f, 0); p.wire(i ? ffs[i - 1] : clk, i ? 1 : 0, f, 1); } const seg = p.add('seg7', 780, 300); const leds = ffs.map((f, i) => { const l = p.add('led', 200 + i * 150, 300, { label: 'Q' + i }); p.wire(f, 0, l, 0); p.wire(f, 0, seg, i); return l; }); return p; },
    'Blinker & oscillator': () => { const p = P(); const n1 = p.add('not', 140, 80), n2 = p.add('not', 260, 80), n3 = p.add('not', 380, 80); p.wire(n1, 0, n2, 0); p.wire(n2, 0, n3, 0); p.wire(n3, 0, n1, 0); const l = p.add('led', 520, 80, { label: 'Ring osc.' }); p.wire(n3, 0, l, 0); const c = p.add('clock', 80, 220, { period: 400 }); const c2 = p.add('clock', 80, 320, { period: 700 }); const x = p.add('xor', 240, 250); p.wire(c, 0, x, 0); p.wire(c2, 0, x, 1); const l2 = p.add('led', 420, 256, { label: 'XOR beat', color: '#2fa8ff' }); p.wire(x, 0, l2, 0); return p; },
    'Hex display': () => { const p = P(); const sw = [0, 1, 2, 3].map((i) => p.add('switch', 60, 40 + i * 70, { label: 'b' + i + ' (' + (1 << i) + ')' })); const seg = p.add('seg7', 300, 90); sw.forEach((s, i) => p.wire(s, 0, seg, i)); p.add('label', 260, 10, { label: 'Flip switches → hex digit' }); return p; },
  };
  const strip = (p) => ({ comps: p.comps, wires: p.wires });

  MS.register({
    id: 'circuits', name: 'Logic Lab', icon: '🔌', group: 'Develop', desc: 'Digital logic circuit simulator', keywords: 'logic gates circuit simulator and or not xor flip flop electronics digital boolean truth table computer science',
    async mount(view) {
      const st = await MS.store('circuits', () => ({ list: [{ id: 'k1', name: 'Full adder', ...strip(PRESETS['Full adder']()) }], active: 'k1' }));
      let K = st.data.list.find((x) => x.id === st.data.active) || st.data.list[0];
      const cam = { x: 0, y: 0, z: 1 }; let W = 800, H = 600, dpr = 1, sel = new Set(), selWire = null, drag = null, hoverPin = null, clip = null, simT = 0, raf = 0, running = true;
      const undo = [], redo = [];
      const snap = () => { undo.push(JSON.stringify({ comps: K.comps, wires: K.wires })); if (undo.length > 80) undo.shift(); redo.length = 0; };
      const restore = (s) => { const o = JSON.parse(s); K.comps = o.comps; K.wires = o.wires; sel.clear(); selWire = null; st.touch(); };
      const byId = () => Object.fromEntries(K.comps.map((c) => [c.id, c]));
      const nid = () => 'c' + MS.uid();
      // simulation state (not persisted except switch states)
      const sim = new Map(); // id -> {out:[], prev:{}}
      const S = (c) => { let s = sim.get(c.id); if (!s) { s = { out: new Array(T[c.type].outs).fill(0), q: 0, pclk: 0, inp: [] }; sim.set(c.id, s); } return s; };
      function step(dt) {
        simT += dt * 1000; const map = byId(); const inputs = new Map();
        for (const w of K.wires) { const a = map[w.from[0]], b = map[w.to[0]]; if (!a || !b) continue; const v = S(a).out[w.from[1]] || 0; let arr = inputs.get(b.id); if (!arr) inputs.set(b.id, (arr = [])); arr[w.to[1]] = v; }
        const next = [];
        for (const c of K.comps) {
          const t = T[c.type], s = S(c), a = inputs.get(c.id) || []; for (let i = 0; i < t.ins; i++) a[i] = a[i] || 0; s.inp = a;
          let o;
          if (c.type === 'switch') o = [c.on ? 1 : 0];
          else if (c.type === 'button') o = [c.down ? 1 : 0];
          else if (c.type === 'clock') o = [Math.floor(simT / (c.period || 500)) % 2];
          else if (c.type === 'const1') o = [1];
          else if (c.type === 'const0') o = [0];
          else if (c.type === 'dff' || c.type === 'tff') { const clk = a[1]; if (clk && !s.pclk) s.q = c.type === 'dff' ? a[0] : a[0] ? 1 - s.q : s.q; s.pclk = clk; o = [s.q, 1 - s.q]; }
          else if (t.f) o = [t.f(a)];
          else o = [];
          next.push([s, o]);
        }
        for (const [s, o] of next) s.out = o;
      }
      // ---------- DOM ----------
      const cv = h('canvas', { tabIndex: 0, style: { width: '100%', height: '100%', display: 'block', touchAction: 'none', outline: 'none' } });
      const g = cv.getContext('2d');
      const cats = {}; Object.entries(T).forEach(([k, t]) => (cats[t.cat] = cats[t.cat] || []).push(k));
      const side = h('div.circ-side', { style: { width: '170px', flex: 'none', borderRight: '1px solid var(--line)', background: 'var(--panel)', overflow: 'auto', padding: '8px' } },
        Object.entries(cats).map(([cat, ks]) => h('div', h('div.small.muted', { style: { textTransform: 'uppercase', letterSpacing: '.08em', margin: '8px 2px 4px' } }, cat), h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' } }, ks.map((k) => h('button.btn.sm', { title: 'Add ' + T[k].n, style: { padding: '6px 4px' }, on: { click: () => addComp(k) } }, T[k].n))))),
        h('div.small.muted', { style: { marginTop: '12px', lineHeight: 1.5 } }, 'Drag from an output pin (right) to an input pin (left) to wire. Click switches to toggle. Double-click to rename. Del deletes, Ctrl+C/V copies, Ctrl+Z undoes. Drag empty space to pan, scroll to zoom.'));
      const tt = h('div.card', { style: { position: 'absolute', right: '12px', top: '12px', maxHeight: '70%', overflow: 'auto', display: 'none', padding: '10px', fontSize: '12px' } });
      const canvasWrap = h('div', { style: { flex: 1, position: 'relative', minWidth: 0 } }, cv, tt);
      view.style.overflow = 'hidden'; view.append(h('div.circ-wrap', { style: { display: 'flex', height: '100%' } }, side, canvasWrap));
      const listSel = h('select.input', { style: { maxWidth: '150px' }, on: { change: async () => { if (listSel.value === '+') { const n = await MS.prompt('Circuit name', 'Circuit ' + (st.data.list.length + 1)); if (!n) return fillList(); K = { id: MS.uid(), name: n, comps: [], wires: [] }; st.data.list.push(K); } else K = st.data.list.find((x) => x.id === listSel.value); st.data.active = K.id; sim.clear(); sel.clear(); undo.length = 0; st.touch(); fillList(); fit(); } } });
      const fillList = () => { listSel.innerHTML = ''; st.data.list.forEach((x) => listSel.append(h('option', { value: x.id, selected: x === K }, x.name))); listSel.append(h('option', { value: '+' }, '＋ New circuit…')); };
      const presetSel = h('select.input', { style: { maxWidth: '140px' }, on: { change: () => { const f = PRESETS[presetSel.value]; presetSel.value = ''; if (!f) return; K = { id: MS.uid(), name: Object.keys(PRESETS).find((k) => PRESETS[k] === f), ...strip(f()) }; st.data.list.push(K); st.data.active = K.id; sim.clear(); sel.clear(); st.touch(); fillList(); fit(); } } }, h('option', { value: '' }, '📚 Examples'), Object.keys(PRESETS).map((k) => h('option', k)));
      const runBtn = h('button.btn.sm', { on: { click: () => { running = !running; runBtn.textContent = running ? '⏸ Pause' : '▶ Run'; } } }, '⏸ Pause');
      MS.setActions(listSel, presetSel, runBtn,
        h('button.btn.sm', { on: { click: truthTable } }, '📋 Truth table'),
        h('button.btn.sm', { title: 'Fit to screen', on: { click: fit } }, '⤢'),
        h('button.btn.sm', { on: { click: async () => { const n = await MS.prompt('Rename circuit', K.name); if (n) { K.name = n; st.touch(); fillList(); } } } }, '✎'),
        h('button.btn.sm', { on: { click: () => MS.download(K.name.replace(/\W+/g, '_') + '.circuit.json', JSON.stringify({ name: K.name, comps: K.comps, wires: K.wires }, null, 1), 'application/json') } }, '⬇'),
        h('button.btn.sm', { title: 'Import', on: { click: async () => { const f = await MS.pickFile('.json'); if (!f) return; try { const o = JSON.parse(await MS.readText(f)); K = { id: MS.uid(), name: o.name || f.name, comps: o.comps || [], wires: o.wires || [] }; st.data.list.push(K); st.data.active = K.id; st.touch(); fillList(); fit(); } catch (e) { MS.toast('Bad file', 'bad'); } } } }, '⬆'),
        h('button.btn.sm.danger', { title: 'Delete circuit', on: { click: async () => { if (st.data.list.length < 2) return MS.toast('Keep at least one circuit'); if (!(await MS.confirm('Delete “' + K.name + '”?'))) return; st.data.list = st.data.list.filter((x) => x !== K); K = st.data.list[0]; st.data.active = K.id; st.touch(); fillList(); fit(); } } }, '🗑'));
      fillList();

      function addComp(type, x, y) { snap(); const [w, hh] = size({ type }); const c = { id: nid(), type, x: x ?? Math.round((W / 2 - cam.x) / cam.z - w / 2 + (Math.random() - 0.5) * 60), y: y ?? Math.round((H / 2 - cam.y) / cam.z - hh / 2 + (Math.random() - 0.5) * 60) }; if (type === 'label') c.label = 'Text'; if (type === 'clock') c.period = 500; K.comps.push(c); sel = new Set([c.id]); st.touch(); return c; }
      // ---------- geometry & hit testing ----------
      const toW = (px, py) => [(px - cam.x) / cam.z, (py - cam.y) / cam.z];
      function hitPin(wx, wy) { for (let i = K.comps.length - 1; i >= 0; i--) { const c = K.comps[i]; const t = T[c.type]; for (let k = 0; k < t.outs; k++) { const [x, y] = pinOut(c, k); if (Math.hypot(x - wx, y - wy) < 10) return { c, k, out: true }; } for (let k = 0; k < t.ins; k++) { const [x, y] = pinIn(c, k); if (Math.hypot(x - wx, y - wy) < 10) return { c, k, out: false }; } } return null; }
      function hitComp(wx, wy) { for (let i = K.comps.length - 1; i >= 0; i--) { const c = K.comps[i]; const [w, hh] = size(c); if (wx >= c.x && wx <= c.x + w && wy >= c.y && wy <= c.y + hh) return c; } return null; }
      const bez = (a, b) => { const dx = Math.max(30, Math.abs(b[0] - a[0]) / 2); return [a, [a[0] + dx, a[1]], [b[0] - dx, b[1]], b]; };
      const bpt = (p, t) => { const u = 1 - t; return [u * u * u * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t * t * t * p[3][0], u * u * u * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t * t * t * p[3][1]]; };
      function hitWire(wx, wy) { const map = byId(); for (const w of K.wires) { const a = map[w.from[0]], b = map[w.to[0]]; if (!a || !b) continue; const p = bez(pinOut(a, w.from[1]), pinIn(b, w.to[1])); for (let i = 0; i <= 30; i++) { const q = bpt(p, i / 30); if (Math.hypot(q[0] - wx, q[1] - wy) < 6 / cam.z + 2) return w; } } return null; }
      // ---------- drawing ----------
      const css = (k) => getComputedStyle(view).getPropertyValue(k).trim();
      function gateShape(c, w, hh) {
        const x = c.x, y = c.y; g.beginPath(); const ty = c.type.replace(/3$/, '');
        if (ty === 'and' || ty === 'nand') { const r = hh / 2; const bw = (ty === 'nand' ? w - 10 : w) - r; g.moveTo(x, y); g.lineTo(x + bw, y); g.arc(x + bw, y + r, r, -Math.PI / 2, Math.PI / 2); g.lineTo(x, y + hh); g.closePath(); }
        else if (ty === 'or' || ty === 'nor' || ty === 'xor' || ty === 'xnor') { const off = ty.startsWith('x') ? 8 : 0; const ew = (ty === 'nor' || ty === 'xnor' ? w - 10 : w); g.moveTo(x + off, y); g.quadraticCurveTo(x + off + ew * 0.55, y, x + ew, y + hh / 2); g.quadraticCurveTo(x + off + ew * 0.55, y + hh, x + off, y + hh); g.quadraticCurveTo(x + off + 14, y + hh / 2, x + off, y); g.closePath(); }
        else if (ty === 'not' || ty === 'buf') { const ew = ty === 'not' ? w - 10 : w; g.moveTo(x, y + 2); g.lineTo(x + ew, y + hh / 2); g.lineTo(x, y + hh - 2); g.closePath(); }
        else { const r = 8; g.roundRect ? g.roundRect(x, y, w, hh, r) : g.rect(x, y, w, hh); }
      }
      function draw() {
        const bg = css('--bg'), panel = css('--panel'), panel2 = css('--panel2'), line = css('--line'), text = css('--text'), muted = css('--muted'), accent = css('--accent');
        const ON = '#3ddc97', OFF = muted;
        g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = bg; g.fillRect(0, 0, W, H);
        // dot grid
        const gs = 20 * cam.z; if (gs > 6) { g.fillStyle = line; const ox = ((cam.x % gs) + gs) % gs, oy = ((cam.y % gs) + gs) % gs; for (let x = ox; x < W; x += gs) for (let y = oy; y < H; y += gs) g.fillRect(x - 1, y - 1, 2, 2); }
        g.setTransform(dpr * cam.z, 0, 0, dpr * cam.z, dpr * cam.x, dpr * cam.y);
        const map = byId();
        // wires
        for (const w of K.wires) { const a = map[w.from[0]], b = map[w.to[0]]; if (!a || !b) continue; const v = S(a).out[w.from[1]]; const p = bez(pinOut(a, w.from[1]), pinIn(b, w.to[1])); g.lineWidth = selWire === w ? 5 : 3; g.strokeStyle = selWire === w ? accent : v ? ON : OFF; g.beginPath(); g.moveTo(p[0][0], p[0][1]); g.bezierCurveTo(p[1][0], p[1][1], p[2][0], p[2][1], p[3][0], p[3][1]); g.stroke(); if (v) { g.globalAlpha = 0.25; g.lineWidth = 8; g.stroke(); g.globalAlpha = 1; } }
        if (drag && drag.kind === 'wire') { const p = bez(drag.from, drag.to); g.setLineDash([6, 5]); g.strokeStyle = accent; g.lineWidth = 2.5; g.beginPath(); g.moveTo(p[0][0], p[0][1]); g.bezierCurveTo(p[1][0], p[1][1], p[2][0], p[2][1], p[3][0], p[3][1]); g.stroke(); g.setLineDash([]); }
        // comps
        g.textAlign = 'center'; g.textBaseline = 'middle';
        for (const c of K.comps) {
          const t = T[c.type], [w, hh] = size(c), s = S(c), isSel = sel.has(c.id);
          if (c.type === 'label') { g.fillStyle = text; g.font = '600 15px ' + css('--font'); g.textAlign = 'left'; g.fillText(c.label || 'Text', c.x, c.y + hh / 2); g.textAlign = 'center'; if (isSel) { g.strokeStyle = accent; g.setLineDash([4, 4]); g.strokeRect(c.x - 4, c.y, Math.max(w, g.measureText(c.label || '').width + 8), hh); g.setLineDash([]); } continue; }
          gateShape(c, w, hh); g.fillStyle = panel; g.fill(); g.lineWidth = isSel ? 3 : 2; g.strokeStyle = isSel ? accent : (t.cat === 'Gate' ? text : line); g.stroke();
          if (['not', 'nand', 'nor', 'xnor'].includes(c.type)) { g.beginPath(); g.arc(c.x + w - 5, c.y + hh / 2, 5, 0, 7); g.fillStyle = panel; g.fill(); g.stroke(); }
          if (c.type === 'xor' || c.type === 'xnor') { g.beginPath(); g.moveTo(c.x, c.y); g.quadraticCurveTo(c.x + 14, c.y + hh / 2, c.x, c.y + hh); g.stroke(); }
          g.fillStyle = muted; g.font = '600 11px ' + css('--font');
          if (t.cat === 'Gate') g.fillText(t.n.replace('-3', '₃'), c.x + w * 0.42, c.y + hh / 2);
          else if (c.type === 'switch') { const on = c.on; g.fillStyle = on ? ON : panel2; g.beginPath(); g.roundRect ? g.roundRect(c.x + 10, c.y + hh / 2 - 9, 36, 18, 9) : g.rect(c.x + 10, c.y + hh / 2 - 9, 36, 18); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(c.x + (on ? 37 : 19), c.y + hh / 2, 7, 0, 7); g.fill(); }
          else if (c.type === 'button') { g.fillStyle = c.down ? ON : '#ff5d6c'; g.beginPath(); g.arc(c.x + w / 2, c.y + hh / 2, c.down ? 11 : 13, 0, 7); g.fill(); }
          else if (c.type === 'clock') { const v = s.out[0]; g.strokeStyle = v ? ON : muted; g.lineWidth = 2; g.beginPath(); g.moveTo(c.x + 8, c.y + 26); g.lineTo(c.x + 18, c.y + 26); g.lineTo(c.x + 18, c.y + 14); g.lineTo(c.x + 30, c.y + 14); g.lineTo(c.x + 30, c.y + 26); g.lineTo(c.x + 42, c.y + 26); g.lineTo(c.x + 42, c.y + 14); g.lineTo(c.x + 48, c.y + 14); g.stroke(); g.fillStyle = muted; g.font = '9px ' + css('--mono'); g.fillText((c.period || 500) + 'ms', c.x + w / 2, c.y + hh - 6); }
          else if (c.type === 'const1' || c.type === 'const0') { g.fillStyle = c.type === 'const1' ? ON : muted; g.font = 'bold 18px ' + css('--mono'); g.fillText(c.type === 'const1' ? '1' : '0', c.x + w / 2, c.y + hh / 2 + 1); }
          else if (c.type === 'led') { const v = s.inp[0]; const col = c.color || '#ff5d6c'; if (v) { const gr = g.createRadialGradient(c.x + w / 2, c.y + hh / 2, 2, c.x + w / 2, c.y + hh / 2, 30); gr.addColorStop(0, col); gr.addColorStop(1, 'transparent'); g.fillStyle = gr; g.fillRect(c.x - 10, c.y - 10, w + 20, hh + 20); } g.fillStyle = v ? col : panel2; g.beginPath(); g.arc(c.x + w / 2, c.y + hh / 2, 13, 0, 7); g.fill(); g.strokeStyle = line; g.stroke(); }
          else if (c.type === 'seg7') { const v = (s.inp[0] || 0) + 2 * (s.inp[1] || 0) + 4 * (s.inp[2] || 0) + 8 * (s.inp[3] || 0); const SEG = [0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f, 0x77, 0x7c, 0x39, 0x5e, 0x79, 0x71][v]; const ox = c.x + 22, oy = c.y + 14, sw = 30, sh = 36, th = 6; const segs = [[0, 0, sw, th], [sw - th, 0, th, sh], [sw - th, sh, th, sh], [0, 2 * sh - th, sw, th], [0, sh, th, sh], [0, 0, th, sh], [0, sh - th / 2, sw, th]]; g.fillStyle = '#111'; g.fillRect(c.x + 14, c.y + 6, w - 22, hh - 12); segs.forEach((sg, i) => { g.fillStyle = SEG >> i & 1 ? '#ff3b4f' : '#2a1518'; g.fillRect(ox + sg[0], oy + sg[1], sg[2], sg[3]); }); }
          else if (c.type === 'dff' || c.type === 'tff') { g.fillStyle = text; g.font = 'bold 12px ' + css('--font'); g.fillText(c.type === 'dff' ? 'D FF' : 'T FF', c.x + w / 2, c.y + hh / 2); }
          // pin labels
          g.font = '9px ' + css('--mono'); g.fillStyle = muted;
          (t.pinsIn || []).forEach((l, i) => { const [x, y] = pinIn(c, i); g.textAlign = 'left'; g.fillText(l, x + 10, y); });
          (t.pinsOut || []).forEach((l, i) => { const [x, y] = pinOut(c, i); g.textAlign = 'right'; g.fillText(l, x - 10, y); });
          g.textAlign = 'center';
          if (c.label) { g.fillStyle = text; g.font = '600 11px ' + css('--font'); g.fillText(c.label, c.x + w / 2, c.y - 9); }
          // pins
          for (let k = 0; k < t.ins; k++) { const [x, y] = pinIn(c, k); const v = s.inp[k]; g.fillStyle = v ? ON : panel2; g.strokeStyle = hoverPin && hoverPin.c === c && !hoverPin.out && hoverPin.k === k ? accent : muted; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); g.stroke(); }
          for (let k = 0; k < t.outs; k++) { const [x, y] = pinOut(c, k); const v = s.out[k]; g.fillStyle = v ? ON : panel2; g.strokeStyle = hoverPin && hoverPin.c === c && hoverPin.out && hoverPin.k === k ? accent : muted; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); g.stroke(); }
        }
        if (drag && drag.kind === 'box') { g.fillStyle = 'rgba(124,92,255,.12)'; g.strokeStyle = accent; g.lineWidth = 1 / cam.z; const [x1, y1] = drag.a, [x2, y2] = drag.b; g.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1)); g.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1)); }
        g.textAlign = 'left'; g.textBaseline = 'alphabetic';
        if (!K.comps.length) { g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = muted; g.font = '15px ' + css('--font'); g.textAlign = 'center'; g.fillText('Add parts from the left, or open 📚 Examples', W / 2, H / 2); g.textAlign = 'left'; }
      }
      // ---------- interaction ----------
      const pos = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
      const ptrs = new Map(); let pinch = null;
      cv.addEventListener('pointerdown', (e) => {
        cv.focus(); cv.setPointerCapture(e.pointerId); const [px, py] = pos(e); ptrs.set(e.pointerId, [px, py]);
        if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: cam.z, cx: cam.x, cy: cam.y, mx: (a[0] + b[0]) / 2, my: (a[1] + b[1]) / 2 }; drag = null; return; }
        const [wx, wy] = toW(px, py); selWire = null;
        const pin = hitPin(wx, wy);
        if (pin) { if (pin.out) { drag = { kind: 'wire', src: [pin.c.id, pin.k], from: pinOut(pin.c, pin.k), to: [wx, wy] }; return; } const ex = K.wires.find((w) => w.to[0] === pin.c.id && w.to[1] === pin.k); if (ex) { snap(); K.wires = K.wires.filter((w) => w !== ex); const src = byId()[ex.from[0]]; drag = { kind: 'wire', src: ex.from, from: pinOut(src, ex.from[1]), to: [wx, wy], snapped: true }; st.touch(); return; } }
        const c = hitComp(wx, wy);
        if (c) { if (c.type === 'button') { c.down = true; } if (!sel.has(c.id)) { if (!e.shiftKey) sel.clear(); sel.add(c.id); } else if (e.shiftKey) { sel.delete(c.id); } drag = { kind: 'move', start: [wx, wy], c, orig: K.comps.filter((x) => sel.has(x.id)).map((x) => [x, x.x, x.y]), moved: false }; return; }
        const w = hitWire(wx, wy); if (w) { selWire = w; sel.clear(); return; }
        if (e.shiftKey) { drag = { kind: 'box', a: [wx, wy], b: [wx, wy] }; return; }
        sel.clear(); drag = { kind: 'pan', px, py, cx: cam.x, cy: cam.y };
      });
      cv.addEventListener('pointermove', (e) => {
        const [px, py] = pos(e); if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, [px, py]);
        if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); const z = MS.clamp((pinch.z * d) / pinch.d, 0.25, 3); const wx = (pinch.mx - pinch.cx) / pinch.z, wy = (pinch.my - pinch.cy) / pinch.z; cam.z = z; cam.x = (a[0] + b[0]) / 2 - wx * z; cam.y = (a[1] + b[1]) / 2 - wy * z; return; }
        const [wx, wy] = toW(px, py); hoverPin = hitPin(wx, wy);
        cv.style.cursor = hoverPin ? 'crosshair' : hitComp(wx, wy) ? 'move' : 'default';
        if (!drag) return;
        if (drag.kind === 'wire') drag.to = hoverPin && !hoverPin.out ? pinIn(hoverPin.c, hoverPin.k) : [wx, wy];
        else if (drag.kind === 'move') { const dx = wx - drag.start[0], dy = wy - drag.start[1]; if (!drag.moved && Math.hypot(dx, dy) * cam.z > 4) { drag.moved = true; snap(); } if (drag.moved) drag.orig.forEach(([c, x, y]) => { c.x = Math.round((x + dx) / 10) * 10; c.y = Math.round((y + dy) / 10) * 10; }); }
        else if (drag.kind === 'pan') { cam.x = drag.cx + px - drag.px; cam.y = drag.cy + py - drag.py; }
        else if (drag.kind === 'box') { drag.b = [wx, wy]; const [x1, y1] = drag.a, [x2, y2] = drag.b; sel = new Set(K.comps.filter((c) => { const [w, hh] = size(c); return c.x >= Math.min(x1, x2) && c.x + w <= Math.max(x1, x2) && c.y >= Math.min(y1, y2) && c.y + hh <= Math.max(y1, y2); }).map((c) => c.id)); }
      });
      const up = (e) => {
        ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (!drag) return;
        if (drag.kind === 'wire') { const [wx, wy] = toW(...pos(e)); const pin = hitPin(wx, wy); if (pin && !pin.out && pin.c.id !== drag.src[0]) { if (!drag.snapped) snap(); K.wires = K.wires.filter((w) => !(w.to[0] === pin.c.id && w.to[1] === pin.k)); K.wires.push({ from: drag.src, to: [pin.c.id, pin.k] }); st.touch(); } }
        if (drag.kind === 'move') { const c = drag.c; if (c.type === 'button') c.down = false; if (!drag.moved && c.type === 'switch') { c.on = !c.on; st.touch(); } if (drag.moved) st.touch(); }
        drag = null;
      };
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      cv.addEventListener('dblclick', async (e) => { const [wx, wy] = toW(...pos(e)); const c = hitComp(wx, wy); if (!c) return; if (c.type === 'clock') { const v = await MS.prompt('Clock period (ms)', String(c.period || 500)); if (v && +v > 20) { snap(); c.period = +v; st.touch(); } return; } const v = await MS.prompt('Label', c.label || ''); if (v !== null) { snap(); c.label = v; st.touch(); } });
      cv.addEventListener('wheel', (e) => { e.preventDefault(); const [px, py] = pos(e); const z = MS.clamp(cam.z * Math.exp(-e.deltaY * 0.0015), 0.25, 3); const wx = (px - cam.x) / cam.z, wy = (py - cam.y) / cam.z; cam.z = z; cam.x = px - wx * z; cam.y = py - wy * z; }, { passive: false });
      function del() { if (selWire) { snap(); K.wires = K.wires.filter((w) => w !== selWire); selWire = null; st.touch(); return; } if (!sel.size) return; snap(); K.comps = K.comps.filter((c) => !sel.has(c.id)); K.wires = K.wires.filter((w) => !sel.has(w.from[0]) && !sel.has(w.to[0])); sel.clear(); st.touch(); }
      cv.addEventListener('keydown', (e) => {
        const mod = e.ctrlKey || e.metaKey;
        if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); del(); }
        else if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) { if (redo.length) { undo.push(JSON.stringify({ comps: K.comps, wires: K.wires })); restore(redo.pop()); } } else if (undo.length) { redo.push(JSON.stringify({ comps: K.comps, wires: K.wires })); restore(undo.pop()); } }
        else if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); if (redo.length) { undo.push(JSON.stringify({ comps: K.comps, wires: K.wires })); restore(redo.pop()); } }
        else if (mod && e.key.toLowerCase() === 'a') { e.preventDefault(); sel = new Set(K.comps.map((c) => c.id)); }
        else if (mod && e.key.toLowerCase() === 'c') { const cs = K.comps.filter((c) => sel.has(c.id)); clip = JSON.stringify({ comps: cs, wires: K.wires.filter((w) => sel.has(w.from[0]) && sel.has(w.to[0])) }); MS.toast('Copied ' + cs.length + ' part' + (cs.length === 1 ? '' : 's')); }
        else if (mod && e.key.toLowerCase() === 'v' && clip) { snap(); const o = JSON.parse(clip); const remap = {}; o.comps.forEach((c) => { remap[c.id] = nid(); c.id = remap[c.id]; c.x += 40; c.y += 40; }); o.wires.forEach((w) => { w.from[0] = remap[w.from[0]]; w.to[0] = remap[w.to[0]]; }); K.comps.push(...o.comps); K.wires.push(...o.wires); sel = new Set(o.comps.map((c) => c.id)); clip = JSON.stringify(o); st.touch(); }
        else if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); const k = new KeyboardEvent('keydown', { key: 'c', ctrlKey: true }); cv.dispatchEvent(k); cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', ctrlKey: true })); }
      });
      // ---------- truth table ----------
      function truthTable() {
        if (tt.style.display === 'block') { tt.style.display = 'none'; return; }
        const ins = K.comps.filter((c) => c.type === 'switch').sort((a, b) => a.y - b.y || a.x - b.x), outs = K.comps.filter((c) => c.type === 'led').sort((a, b) => a.y - b.y || a.x - b.x);
        if (!ins.length || !outs.length) return MS.toast('Truth tables need switches (inputs) and LEDs (outputs)');
        if (ins.length > 6) return MS.toast('Up to 6 switches please');
        const saved = ins.map((c) => c.on); const savedSim = new Map([...sim].map(([k, v]) => [k, { ...v, out: [...v.out] }])); const rows = [];
        for (let m = 0; m < 1 << ins.length; m++) { ins.forEach((c, i) => (c.on = !!(m >> (ins.length - 1 - i) & 1))); for (let k = 0; k < 60; k++) step(0); rows.push([...ins.map((c) => +c.on), ...outs.map((c) => S(c).inp[0] || 0)]); }
        ins.forEach((c, i) => (c.on = saved[i])); sim.clear(); savedSim.forEach((v, k) => sim.set(k, v));
        const nm = (c, i, p) => c.label || p + i;
        tt.innerHTML = ''; tt.append(h('div.row', h('strong', '📋 Truth table'), h('div.spacer'), h('button.icon-btn', { on: { click: () => (tt.style.display = 'none') } }, '✕')),
          h('table.mono', { style: { borderCollapse: 'collapse', marginTop: '6px' } }, h('tr', ins.map((c, i) => h('th', { style: { padding: '2px 8px', borderBottom: '1px solid var(--line)' } }, nm(c, i, 'in'))), outs.map((c, i) => h('th', { style: { padding: '2px 8px', borderBottom: '1px solid var(--line)', borderLeft: i ? '' : '2px solid var(--line)', color: 'var(--good)' } }, nm(c, i, 'out')))),
            rows.map((r) => h('tr', r.map((v, i) => h('td', { style: { padding: '2px 8px', textAlign: 'center', borderLeft: i === ins.length ? '2px solid var(--line)' : '', color: v ? 'var(--good)' : 'var(--muted)', fontWeight: v ? 700 : 400 } }, v))))));
        tt.style.display = 'block';
      }
      function fit() { if (!K.comps.length) { cam.x = 0; cam.y = 0; cam.z = 1; return; } let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; K.comps.forEach((c) => { const [w, hh] = size(c); x0 = Math.min(x0, c.x - 20); y0 = Math.min(y0, c.y - 30); x1 = Math.max(x1, c.x + w + 20); y1 = Math.max(y1, c.y + hh + 20); }); cam.z = MS.clamp(Math.min(W / (x1 - x0), H / (y1 - y0)) * 0.9, 0.3, 1.6); cam.x = (W - (x1 - x0) * cam.z) / 2 - x0 * cam.z; cam.y = (H - (y1 - y0) * cam.z) / 2 - y0 * cam.z; }
      function resize() { const r = canvasWrap.getBoundingClientRect(); dpr = devicePixelRatio || 1; W = Math.max(50, r.width); H = Math.max(50, r.height); cv.width = W * dpr; cv.height = H * dpr; }
      let last = performance.now();
      const loop = (now) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; if (running) for (let i = 0; i < 8; i++) step(dt / 8); draw(); raf = requestAnimationFrame(loop); };
      const ro = new ResizeObserver(resize); ro.observe(canvasWrap); resize(); fit(); raf = requestAnimationFrame(loop);
      return { unmount: () => { cancelAnimationFrame(raf); ro.disconnect(); } };
    },
  });
})();
