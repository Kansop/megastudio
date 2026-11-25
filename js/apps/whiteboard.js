/* Whiteboard: infinite canvas of sticky notes, shapes & connectors (mind maps, flows), pan/zoom, pen, SVG/PNG export */
(function () {
  const { h } = MS;
  const NS = 'http://www.w3.org/2000/svg';
  const sv = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const COLORS = ['#ffe14f', '#ff9ec7', '#9be7ff', '#b6f5a6', '#d7b8ff', '#ffc48a', '#ffffff'];
  const demo = () => ({ boards: [{ id: 'w1', name: 'Mind map', view: { x: 0, y: 0, z: 1 }, strokes: [], nodes: [
    { id: 'n1', x: 520, y: 300, w: 200, h: 90, text: 'MegaStudio 🚀', color: '#d7b8ff', shape: 'round' },
    { id: 'n2', x: 200, y: 140, w: 170, h: 70, text: 'Write notes', color: '#ffe14f', shape: 'note' },
    { id: 'n3', x: 860, y: 140, w: 170, h: 70, text: 'Make music', color: '#9be7ff', shape: 'note' },
    { id: 'n4', x: 200, y: 480, w: 170, h: 70, text: 'Plan on boards', color: '#b6f5a6', shape: 'note' },
    { id: 'n5', x: 860, y: 480, w: 170, h: 70, text: 'Play games', color: '#ff9ec7', shape: 'note' },
    { id: 'n6', x: 540, y: 560, w: 160, h: 60, text: 'Double-click empty space to add', color: '#ffffff', shape: 'rect' }],
    edges: [{ a: 'n1', b: 'n2' }, { a: 'n1', b: 'n3' }, { a: 'n1', b: 'n4' }, { a: 'n1', b: 'n5' }] }], active: 'w1' });
  let store;
  const getStore = async () => (store = store || (await MS.store('whiteboard', demo)));
  MS.register({
    id: 'whiteboard', name: 'Whiteboard', icon: '🧠', group: 'Create', desc: 'Mind maps, flows & sticky notes', keywords: 'mindmap diagram flowchart canvas sticky miro brainstorm',
    async mount(view) {
      const s = await getStore(); let mode = 'select', selected = null, linkFrom = null, color = COLORS[0];
      const B = () => s.data.boards.find((b) => b.id === s.data.active) || s.data.boards[0];
      const svg = sv('svg', { width: '100%', height: '100%', style: 'display:block;touch-action:none;background:var(--bg)' });
      const defs = sv('defs'); const pat = sv('pattern', { id: 'wbgrid', width: 40, height: 40, patternUnits: 'userSpaceOnUse' }); pat.append(sv('circle', { cx: 1, cy: 1, r: 1.2, fill: 'var(--line)' })); const mk = sv('marker', { id: 'wbarrow', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }); mk.append(sv('path', { d: 'M0,0 L10,5 L0,10 z', fill: 'var(--muted)' })); defs.append(pat, mk); svg.append(defs);
      const world = sv('g'); const bg = sv('rect', { x: -50000, y: -50000, width: 100000, height: 100000, fill: 'url(#wbgrid)' }); const gStrokes = sv('g'), gEdges = sv('g'), gNodes = sv('g'), gTmp = sv('g');
      world.append(bg, gStrokes, gEdges, gNodes, gTmp); svg.append(world);
      const host = h('div', { style: { position: 'absolute', inset: 0 } }); host.append(svg); view.style.overflow = 'hidden'; view.append(host);
      const zoomL = h('span.small.muted'); const modeBtns = {};
      const setMode = (m) => { mode = m; linkFrom = null; Object.entries(modeBtns).forEach(([k, b]) => b.classList.toggle('on', k === m)); svg.style.cursor = m === 'pen' ? 'crosshair' : m === 'link' ? 'alias' : 'default'; };
      [['select', '🖱 Select'], ['link', '🔗 Connect'], ['pen', '✏️ Pen']].forEach(([m, l]) => (modeBtns[m] = h('button.btn', { on: { click: () => setMode(m) } }, l)));
      const boardSel = h('select.input', { on: { change: () => { s.data.active = boardSel.value; s.touch(); render(); } } });
      const swatches = h('div.row', { style: { gap: '3px' } }, COLORS.map((c) => h('button', { title: 'Color', style: { width: '20px', height: '20px', borderRadius: '50%', border: '1px solid var(--line)', background: c, cursor: 'pointer' }, on: { click: () => { color = c; const n = sel(); if (n) { n.color = c; s.touch(); render(); } } } })));
      MS.setActions(boardSel, h('button.btn', { on: { click: async () => { const n = await MS.prompt('Board name', 'New board'); if (!n) return; const b = { id: MS.uid('w'), name: n, view: { x: 0, y: 0, z: 1 }, nodes: [], edges: [], strokes: [] }; s.data.boards.push(b); s.data.active = b.id; s.touch(); render(); } } }, '+'),
        modeBtns.select, modeBtns.link, modeBtns.pen, swatches,
        h('button.btn', { title: 'Add note', on: { click: () => addNode(center()) } }, '+ Note'),
        h('button.btn', { title: 'Auto-arrange as radial mind map', on: { click: arrange } }, '✨ Arrange'),
        h('button.btn', { on: { click: () => fit() } }, '⤢ Fit'), zoomL,
        h('button.btn', { on: { click: exportSVG } }, '⬇ SVG'), h('button.btn', { on: { click: exportPNG } }, '⬇ PNG'),
        h('button.btn.danger', { title: 'Delete board', on: { click: async () => { if (s.data.boards.length < 2) return MS.toast('Keep at least one board'); if (await MS.confirm('Delete board?', B().name, 'Delete')) { s.data.boards = s.data.boards.filter((b) => b !== B()); s.data.active = s.data.boards[0].id; s.touch(); render(); } } } }, '🗑'));
      const sel = () => B().nodes.find((n) => n.id === selected);
      const applyView = () => { const v = B().view; world.setAttribute('transform', `translate(${v.x},${v.y}) scale(${v.z})`); zoomL.textContent = Math.round(v.z * 100) + '%'; };
      const toWorld = (e) => { const r = svg.getBoundingClientRect(); const v = B().view; return { x: (e.clientX - r.left - v.x) / v.z, y: (e.clientY - r.top - v.y) / v.z }; };
      const center = () => { const r = svg.getBoundingClientRect(); const v = B().view; return { x: (r.width / 2 - v.x) / v.z, y: (r.height / 2 - v.y) / v.z }; };
      const addNode = (p, text = 'New idea') => { const n = { id: MS.uid('n'), x: p.x - 80, y: p.y - 35, w: 160, h: 70, text, color, shape: 'note' }; B().nodes.push(n); if (selected && sel() && mode === 'select') B().edges.push({ a: selected, b: n.id }); selected = n.id; s.touch(); render(); setTimeout(() => editText(n), 30); return n; };
      const mid = (n) => ({ x: n.x + n.w / 2, y: n.y + n.h / 2 });
      const edgePt = (n, toward) => { const c = mid(n); const dx = toward.x - c.x, dy = toward.y - c.y; const sx = Math.abs(dx) / (n.w / 2 + 6), sy = Math.abs(dy) / (n.h / 2 + 6); const k = 1 / Math.max(sx, sy, 1e-6); return { x: c.x + dx * k, y: c.y + dy * k }; };
      function render() {
        boardSel.innerHTML = ''; s.data.boards.forEach((b) => boardSel.append(h('option', { value: b.id, selected: b.id === B().id }, b.name)));
        applyView(); gStrokes.innerHTML = gEdges.innerHTML = gNodes.innerHTML = '';
        B().strokes.forEach((st) => gStrokes.append(sv('path', { d: st.d, stroke: st.c, 'stroke-width': st.w, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })));
        B().edges.forEach((e, i) => { const a = B().nodes.find((n) => n.id === e.a), b = B().nodes.find((n) => n.id === e.b); if (!a || !b) return; const p1 = edgePt(a, mid(b)), p2 = edgePt(b, mid(a)); const mx = (p1.x + p2.x) / 2; const path = sv('path', { d: `M${p1.x},${p1.y} C${mx},${p1.y} ${mx},${p2.y} ${p2.x},${p2.y}`, stroke: 'var(--muted)', 'stroke-width': 2.5, fill: 'none', 'marker-end': 'url(#wbarrow)', style: 'cursor:pointer' }); path.addEventListener('dblclick', (ev) => { ev.stopPropagation(); B().edges.splice(i, 1); s.touch(); render(); }); const hit = sv('path', { d: path.getAttribute('d'), stroke: 'transparent', 'stroke-width': 14, fill: 'none', style: 'cursor:pointer' }); hit.addEventListener('dblclick', (ev) => { ev.stopPropagation(); B().edges.splice(i, 1); s.touch(); render(); }); gEdges.append(path, hit); });
        B().nodes.forEach((n) => {
          const g = sv('g', { transform: `translate(${n.x},${n.y})`, style: 'cursor:move' });
          const rx = n.shape === 'round' ? n.h / 2 : n.shape === 'note' ? 6 : 2;
          if (n.shape === 'diamond') g.append(sv('path', { d: `M${n.w / 2},0 L${n.w},${n.h / 2} L${n.w / 2},${n.h} L0,${n.h / 2} Z`, fill: n.color, stroke: n.id === selected ? 'var(--accent)' : 'rgba(0,0,0,.25)', 'stroke-width': n.id === selected ? 3 : 1 }));
          else g.append(sv('rect', { width: n.w, height: n.h, rx, fill: n.color, stroke: n.id === selected ? 'var(--accent)' : 'rgba(0,0,0,.25)', 'stroke-width': n.id === selected ? 3 : 1, style: n.shape === 'note' ? 'filter:drop-shadow(0 3px 4px rgba(0,0,0,.25))' : '' }));
          const fo = sv('foreignObject', { x: 6, y: 4, width: n.w - 12, height: n.h - 8 }); const div = document.createElement('div'); Object.assign(div.style, { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#1b1e33', font: '600 14px system-ui', overflow: 'hidden', wordBreak: 'break-word', lineHeight: '1.25', pointerEvents: 'none' }); div.textContent = n.text; fo.append(div); g.append(fo);
          if (n.id === selected) { const rs = sv('rect', { x: n.w - 7, y: n.h - 7, width: 12, height: 12, fill: 'var(--accent)', rx: 3, style: 'cursor:nwse-resize' }); rs.addEventListener('pointerdown', (e) => { e.stopPropagation(); drag = { kind: 'resize', n, start: toWorld(e), w: n.w, h: n.h }; svg.setPointerCapture(e.pointerId); }); g.append(rs);
            const plus = sv('g', { transform: `translate(${n.w + 18},${n.h / 2})`, style: 'cursor:pointer' }); plus.append(sv('circle', { r: 11, fill: 'var(--accent)' })); const t = sv('text', { 'text-anchor': 'middle', y: 5, fill: '#fff', 'font-size': 16, 'font-weight': 700 }); t.textContent = '+'; plus.append(t); plus.addEventListener('pointerdown', (e) => { e.stopPropagation(); addNode({ x: n.x + n.w + 160, y: n.y + n.h / 2 + (Math.random() - 0.5) * 120 }); }); g.append(plus); }
          g.addEventListener('pointerdown', (e) => { e.stopPropagation(); if (mode === 'link') { if (!linkFrom) { linkFrom = n.id; selected = n.id; render(); MS.toast('Now click the node to connect to'); } else if (linkFrom !== n.id) { B().edges.push({ a: linkFrom, b: n.id }); linkFrom = null; s.touch(); render(); } return; } const now = Date.now(); if (lastTap.id === n.id && now - lastTap.t < 380) { lastTap = {}; editText(n); return; } lastTap = { id: n.id, t: now }; const changed = selected !== n.id; selected = n.id; drag = { kind: 'node', n, start: toWorld(e), ox: n.x, oy: n.y, moved: false }; svg.setPointerCapture(e.pointerId); if (changed) render(); });
          g.addEventListener('dblclick', (e) => e.stopPropagation());
          gNodes.append(g);
        });
      }
      function editText(n) {
        const r = svg.getBoundingClientRect(); const v = B().view; const hostR = host.getBoundingClientRect();
        const ta = h('textarea', { value: n.text, style: { position: 'absolute', left: n.x * v.z + v.x + (r.left - hostR.left) + 'px', top: n.y * v.z + v.y + (r.top - hostR.top) + 'px', width: n.w * v.z + 'px', height: n.h * v.z + 'px', zIndex: 5, font: `600 ${14 * v.z}px system-ui`, textAlign: 'center', border: '2px solid var(--accent)', borderRadius: '6px', background: n.color, color: '#1b1e33', resize: 'none', padding: '6px' } });
        host.append(ta); ta.focus(); ta.select();
        const done = () => { n.text = ta.value.trim() || '…'; ta.remove(); s.touch(); render(); };
        ta.addEventListener('blur', done); ta.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ta.blur(); } if (e.key === 'Escape') ta.blur(); });
      }
      let drag = null; let penPts = null, penPath = null; let lastTap = {};
      svg.addEventListener('pointerdown', (e) => {
        if (mode === 'pen') { penPts = [toWorld(e)]; penPath = sv('path', { stroke: color === '#ffffff' ? '#333' : color, 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }); gTmp.append(penPath); svg.setPointerCapture(e.pointerId); return; }
        if (selected || linkFrom) { selected = null; linkFrom = null; render(); } const v = B().view; drag = { kind: 'pan', sx: e.clientX, sy: e.clientY, vx: v.x, vy: v.y }; svg.setPointerCapture(e.pointerId); svg.style.cursor = 'grabbing';
      });
      svg.addEventListener('pointermove', (e) => {
        if (penPts) { penPts.push(toWorld(e)); penPath.setAttribute('d', 'M' + penPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L')); return; }
        if (!drag) return; const v = B().view;
        if (drag.kind === 'pan') { v.x = drag.vx + e.clientX - drag.sx; v.y = drag.vy + e.clientY - drag.sy; applyView(); }
        else if (drag.kind === 'node') { const p = toWorld(e); drag.n.x = Math.round((drag.ox + p.x - drag.start.x) / 10) * 10; drag.n.y = Math.round((drag.oy + p.y - drag.start.y) / 10) * 10; drag.moved = true; render(); }
        else if (drag.kind === 'resize') { const p = toWorld(e); drag.n.w = Math.max(60, drag.w + p.x - drag.start.x); drag.n.h = Math.max(36, drag.h + p.y - drag.start.y); render(); }
      });
      svg.addEventListener('pointerup', () => { if (penPts) { if (penPts.length > 1) B().strokes.push({ d: penPath.getAttribute('d'), c: penPath.getAttribute('stroke'), w: 4 }); gTmp.innerHTML = ''; penPts = null; s.touch(); render(); return; } if (drag) { s.touch(); } drag = null; if (mode === 'select') svg.style.cursor = 'default'; });
      svg.addEventListener('dblclick', (e) => { if (mode === 'select') addNode(toWorld(e)); });
      svg.addEventListener('wheel', (e) => { e.preventDefault(); const v = B().view; const r = svg.getBoundingClientRect(); const mx = e.clientX - r.left, my = e.clientY - r.top; const nz = MS.clamp(v.z * Math.exp(-e.deltaY * 0.0015), 0.15, 4); v.x = mx - ((mx - v.x) * nz) / v.z; v.y = my - ((my - v.y) * nz) / v.z; v.z = nz; applyView(); s.touch(); }, { passive: false });
      const keys = (e) => { if (/^(input|textarea|select)$/i.test(e.target.tagName)) return; const n = sel();
        if ((e.key === 'Delete' || e.key === 'Backspace') && n) { B().nodes = B().nodes.filter((x) => x !== n); B().edges = B().edges.filter((x) => x.a !== n.id && x.b !== n.id); selected = null; s.touch(); render(); }
        else if (e.key === 'Tab' && n) { e.preventDefault(); addNode({ x: n.x + n.w + 160, y: n.y + n.h / 2 }); }
        else if (e.key === 'Enter' && n) { e.preventDefault(); editText(n); }
        else if (n && e.key === 's' && !e.ctrlKey && !e.metaKey) { const shapes = ['note', 'rect', 'round', 'diamond']; n.shape = shapes[(shapes.indexOf(n.shape) + 1) % shapes.length]; s.touch(); render(); }
        else if (n && (e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); const c = { ...n, id: MS.uid('n'), x: n.x + 30, y: n.y + 30 }; B().nodes.push(c); selected = c.id; s.touch(); render(); }
        else if (e.key === 'v' && !e.ctrlKey) setMode('select'); else if (e.key === 'c' && !e.ctrlKey && !e.metaKey) setMode('link'); else if (e.key === 'p') setMode('pen');
        else if (e.key === 'z' && (e.ctrlKey || e.metaKey) && B().strokes.length) { B().strokes.pop(); s.touch(); render(); } };
      document.addEventListener('keydown', keys);
      function bbox() { const ns = B().nodes; if (!ns.length) return { x: 0, y: 0, w: 800, h: 600 }; const x1 = Math.min(...ns.map((n) => n.x)), y1 = Math.min(...ns.map((n) => n.y)), x2 = Math.max(...ns.map((n) => n.x + n.w)), y2 = Math.max(...ns.map((n) => n.y + n.h)); return { x: x1 - 60, y: y1 - 60, w: x2 - x1 + 120, h: y2 - y1 + 120 }; }
      function fit() { const r = svg.getBoundingClientRect(); const b = bbox(); const z = MS.clamp(Math.min(r.width / b.w, r.height / b.h), 0.15, 2); Object.assign(B().view, { z, x: (r.width - b.w * z) / 2 - b.x * z, y: (r.height - b.h * z) / 2 - b.y * z }); applyView(); s.touch(); }
      function arrange() {
        const ns = B().nodes; if (!ns.length) return; const deg = {}; B().edges.forEach((e) => { deg[e.a] = (deg[e.a] || 0) + 1; deg[e.b] = (deg[e.b] || 0) + 1; });
        const root = (sel() || ns.slice().sort((a, b) => (deg[b.id] || 0) - (deg[a.id] || 0))[0]); const adj = {}; B().edges.forEach((e) => { (adj[e.a] = adj[e.a] || []).push(e.b); (adj[e.b] = adj[e.b] || []).push(e.a); });
        const seen = new Set([root.id]); const levels = [[root]]; while (true) { const nxt = []; levels[levels.length - 1].forEach((n) => (adj[n.id] || []).forEach((id) => { if (!seen.has(id)) { seen.add(id); nxt.push(ns.find((x) => x.id === id)); } })); if (!nxt.length) break; levels.push(nxt); }
        const rest = ns.filter((n) => !seen.has(n.id)); const c = mid(root);
        levels.forEach((lv, i) => { if (!i) return; lv.forEach((n, j) => { const a = (j / lv.length) * Math.PI * 2 + i * 0.4; n.x = c.x + Math.cos(a) * 260 * i - n.w / 2; n.y = c.y + Math.sin(a) * 200 * i - n.h / 2; }); });
        rest.forEach((n, j) => { n.x = c.x - 400 + j * 190; n.y = c.y + 200 * levels.length + 100; });
        s.touch(); render(); fit();
      }
      function svgString() { const b = bbox(); const clone = world.cloneNode(true); clone.removeAttribute('transform'); clone.querySelector('rect').remove(); const css = getComputedStyle(document.documentElement);
        let str = new XMLSerializer().serializeToString(clone).replace(/var\(--muted\)/g, css.getPropertyValue('--muted').trim()).replace(/var\(--accent\)/g, css.getPropertyValue('--accent').trim());
        return `<svg xmlns="${NS}" viewBox="${b.x} ${b.y} ${b.w} ${b.h}" width="${b.w}" height="${b.h}"><defs><marker id="wbarrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#888"/></marker></defs><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="#fff"/>${str}</svg>`; }
      function exportSVG() { MS.download(B().name + '.svg', svgString(), 'image/svg+xml'); }
      function exportPNG() { const b = bbox(); const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = b.w * 2; c.height = b.h * 2; const g = c.getContext('2d'); g.scale(2, 2); g.drawImage(img, 0, 0); c.toBlob((bl) => MS.download(B().name + '.png', bl)); }; img.onerror = () => MS.toast('PNG export failed — try SVG', 'bad'); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString()); }
      setMode('select'); render(); if (!B().view.fitted) { B().view.fitted = true; setTimeout(fit, 30); }
      view.append(h('div.small.muted', { style: { position: 'absolute', left: '12px', bottom: '10px', background: 'var(--panel)', padding: '4px 10px', borderRadius: '8px', border: '1px solid var(--line)', pointerEvents: 'none' } }, 'Double-click: add · Tab: child · Enter: edit · S: shape · Del: delete · drag empty space: pan · wheel: zoom · dbl-click a line: remove'));
      return { unmount: () => document.removeEventListener('keydown', keys) };
    },
  });
})();
