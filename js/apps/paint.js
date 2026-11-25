/* Paint: layered raster editor with brushes, shapes, flood fill, text, symmetry, undo */
(function () {
  const { h } = MS;
  const TOOLS = [['brush', '🖌', 'Brush (B)'], ['pencil', '✏️', 'Pencil (P)'], ['spray', '💨', 'Spray (S)'], ['eraser', '🧽', 'Eraser (E)'], ['line', '╱', 'Line (L)'], ['rect', '▭', 'Rectangle (R)'], ['ellipse', '◯', 'Ellipse (O)'], ['fill', '🪣', 'Fill (F)'], ['text', 'T', 'Text (T)'], ['picker', '💧', 'Eyedropper (I)']];
  const SWATCHES = ['#000000', '#ffffff', '#7c5cff', '#ff4fa3', '#ff5d6c', '#ffb84f', '#ffe14f', '#3ddc97', '#2fa8ff', '#1b3a8a', '#8b5a2b', '#888888'];
  MS.register({
    id: 'paint', name: 'Paint', icon: '🎨', group: 'Create', desc: 'Layered drawing & painting', keywords: 'draw sketch art canvas image photoshop',
    async mount(view) {
      const W = 1200, H = 800; let tool = 'brush', color = '#7c5cff', size = 12, alpha = 1, sym = false, fillShape = false, zoom = 1;
      const layers = []; let active = 0; const undo = [], redo = [];
      const stage = h('div', { style: { position: 'relative', width: W + 'px', height: H + 'px', background: 'repeating-conic-gradient(#ccc 0 25%, #fff 0 50%) 0 0/20px 20px', boxShadow: 'var(--shadow)', transformOrigin: '0 0', touchAction: 'none', flex: 'none' } });
      const overlay = h('canvas', { width: W, height: H, style: { position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50 } });
      const stageWrap = h('div', { style: { flex: 1, overflow: 'auto', padding: '24px', background: 'var(--bg)' } }, h('div', { style: { width: 'max-content' } }, stage));
      const layerList = h('div.col', { style: { gap: '4px' } });
      const colorIn = h('input', { type: 'color', value: color, style: { width: '100%', height: '36px', border: 0, background: 'none' }, on: { input: () => (color = colorIn.value) } });
      const sizeIn = h('input', { type: 'range', min: 1, max: 120, value: size, on: { input: () => { size = +sizeIn.value; sizeL.textContent = size + 'px'; } } }); const sizeL = h('span.small.muted', size + 'px');
      const alphaIn = h('input', { type: 'range', min: 5, max: 100, value: 100, on: { input: () => { alpha = alphaIn.value / 100; alphaL.textContent = alphaIn.value + '%'; } } }); const alphaL = h('span.small.muted', '100%');
      const toolBtns = TOOLS.map(([id, ic, t]) => h('button.btn', { title: t, style: { fontSize: '16px', padding: '6px' }, on: { click: () => setTool(id) } }, ic));
      const setTool = (t) => { tool = t; toolBtns.forEach((b, i) => b.classList.toggle('on', TOOLS[i][0] === t)); stage.style.cursor = t === 'picker' ? 'copy' : t === 'text' ? 'text' : 'crosshair'; };
      const side = h('div', { style: { width: '220px', flex: 'none', borderRight: '1px solid var(--line)', background: 'var(--panel)', padding: '12px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' } },
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '4px' } }, toolBtns),
        h('div.col', h('strong.small', 'Color'), colorIn, h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '4px' } }, SWATCHES.map((c) => h('button', { title: c, style: { height: '22px', borderRadius: '6px', border: '1px solid var(--line)', background: c, cursor: 'pointer' }, on: { click: () => { color = c; colorIn.value = c; } } })))),
        h('div.col', h('div.row', h('strong.small', 'Size'), h('div.spacer'), sizeL), sizeIn, h('div.row', h('strong.small', 'Opacity'), h('div.spacer'), alphaL), alphaIn),
        h('label.row.small', h('input', { type: 'checkbox', on: { change: (e) => (sym = e.target.checked) } }), 'Mirror symmetry'),
        h('label.row.small', h('input', { type: 'checkbox', on: { change: (e) => (fillShape = e.target.checked) } }), 'Filled shapes'),
        h('div.col', h('div.row', h('strong.small', 'Layers'), h('div.spacer'), h('button.btn.sm', { on: { click: () => { addLayer(); renderLayers(); } } }, '+')), layerList));
      view.append(h('div.split', side, stageWrap)); stage.append(overlay);
      const ctxOf = (i) => layers[i].cv.getContext('2d', { willReadFrequently: true });
      function addLayer(name, fillWhite) { const cv = h('canvas', { width: W, height: H, style: { position: 'absolute', inset: 0 } }); const L = { cv, name: name || 'Layer ' + (layers.length + 1), visible: true, opacity: 1 }; layers.splice(active + 1, 0, L); active = layers.indexOf(L); if (fillWhite) { const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); } restack(); return L; }
      function restack() { layers.forEach((L, i) => { if (L.cv.parentNode !== stage) stage.insertBefore(L.cv, overlay); L.cv.style.zIndex = i; L.cv.style.display = L.visible ? '' : 'none'; L.cv.style.opacity = L.opacity; }); }
      function renderLayers() {
        layerList.innerHTML = '';
        layers.slice().reverse().forEach((L) => { const i = layers.indexOf(L);
          layerList.append(h('div', { style: { padding: '6px', borderRadius: '8px', border: '1px solid ' + (i === active ? 'var(--accent)' : 'var(--line)'), background: 'var(--panel2)', cursor: 'pointer' }, on: { click: () => { active = i; renderLayers(); } } },
            h('div.row', h('button.icon-btn', { title: 'Toggle visibility', on: { click: (e) => { e.stopPropagation(); L.visible = !L.visible; restack(); renderLayers(); } } }, L.visible ? '👁' : '🚫'), h('span.small', { style: { flex: 1 }, on: { dblclick: async () => { const n = await MS.prompt('Layer name', L.name); if (n) { L.name = n; renderLayers(); } } } }, L.name),
              h('button.icon-btn', { title: 'Up', on: { click: (e) => { e.stopPropagation(); if (i < layers.length - 1) { [layers[i], layers[i + 1]] = [layers[i + 1], layers[i]]; active = i + 1; restack(); renderLayers(); } } } }, '▲'),
              h('button.icon-btn', { title: 'Down', on: { click: (e) => { e.stopPropagation(); if (i > 0) { [layers[i], layers[i - 1]] = [layers[i - 1], layers[i]]; active = i - 1; restack(); renderLayers(); } } } }, '▼'),
              h('button.icon-btn', { title: 'Delete', on: { click: (e) => { e.stopPropagation(); if (layers.length < 2) return; L.cv.remove(); layers.splice(i, 1); active = Math.min(active, layers.length - 1); restack(); renderLayers(); } } }, '×')),
            h('input', { type: 'range', min: 0, max: 100, value: L.opacity * 100, style: { width: '100%' }, on: { click: (e) => e.stopPropagation(), input: (e) => { L.opacity = e.target.value / 100; restack(); } } })));
        });
      }
      const pushUndo = () => { undo.push({ i: active, data: ctxOf(active).getImageData(0, 0, W, H) }); if (undo.length > 40) undo.shift(); redo.length = 0; };
      const doUndo = () => { const u = undo.pop(); if (!u || !layers[u.i]) return; redo.push({ i: u.i, data: ctxOf(u.i).getImageData(0, 0, W, H) }); ctxOf(u.i).putImageData(u.data, 0, 0); };
      const doRedo = () => { const u = redo.pop(); if (!u || !layers[u.i]) return; undo.push({ i: u.i, data: ctxOf(u.i).getImageData(0, 0, W, H) }); ctxOf(u.i).putImageData(u.data, 0, 0); };
      const pos = (e) => { const r = stage.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H, p: e.pressure || 0.5 }; };
      const hexToRgb = (hx) => [parseInt(hx.slice(1, 3), 16), parseInt(hx.slice(3, 5), 16), parseInt(hx.slice(5, 7), 16)];
      function flood(x, y) {
        const g = ctxOf(active); const img = g.getImageData(0, 0, W, H); const d = img.data; x |= 0; y |= 0; const i0 = (y * W + x) * 4; const t = [d[i0], d[i0 + 1], d[i0 + 2], d[i0 + 3]]; const [r, gg, b] = hexToRgb(color); const a = Math.round(alpha * 255);
        if (t[0] === r && t[1] === gg && t[2] === b && t[3] === a) return;
        const match = (i) => Math.abs(d[i] - t[0]) + Math.abs(d[i + 1] - t[1]) + Math.abs(d[i + 2] - t[2]) + Math.abs(d[i + 3] - t[3]) < 48;
        const stack = [[x, y]]; const seen = new Uint8Array(W * H);
        while (stack.length) { let [cx, cy] = stack.pop(); let i = cy * W + cx; while (cx >= 0 && !seen[i] && match(i * 4)) { cx--; i--; } cx++; i++; let up = false, dn = false;
          while (cx < W && !seen[i] && match(i * 4)) { seen[i] = 1; const p = i * 4; d[p] = r; d[p + 1] = gg; d[p + 2] = b; d[p + 3] = a;
            if (cy > 0) { const u = i - W; if (!seen[u] && match(u * 4)) { if (!up) { stack.push([cx, cy - 1]); up = true; } } else up = false; }
            if (cy < H - 1) { const dd = i + W; if (!seen[dd] && match(dd * 4)) { if (!dn) { stack.push([cx, cy + 1]); dn = true; } } else dn = false; }
            cx++; i++; } }
        g.putImageData(img, 0, 0);
      }
      function stroke(g, a, b) {
        const seg = (p, q) => { g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(q.x, q.y); g.stroke(); };
        g.lineCap = g.lineJoin = 'round'; g.strokeStyle = color; g.globalAlpha = alpha;
        if (tool === 'eraser') { g.globalCompositeOperation = 'destination-out'; g.globalAlpha = 1; } else g.globalCompositeOperation = 'source-over';
        if (tool === 'pencil') { g.lineWidth = Math.max(1, size / 4); g.lineCap = 'square'; }
        else g.lineWidth = tool === 'brush' ? size * (0.5 + b.p) : size;
        if (tool === 'spray') { g.fillStyle = color; for (let i = 0; i < size * 1.5; i++) { const ang = Math.random() * 7, rad = Math.random() * size; g.fillRect(b.x + Math.cos(ang) * rad, b.y + Math.sin(ang) * rad, 1.5, 1.5); if (sym) g.fillRect(W - (b.x + Math.cos(ang) * rad), b.y + Math.sin(ang) * rad, 1.5, 1.5); } }
        else { seg(a, b); if (sym) seg({ x: W - a.x, y: a.y }, { x: W - b.x, y: b.y }); }
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      }
      function shape(g, a, b) {
        g.strokeStyle = g.fillStyle = color; g.lineWidth = size; g.globalAlpha = alpha; g.lineCap = 'round'; g.beginPath();
        const draw = (ax, bx) => { if (tool === 'line') { g.moveTo(ax, a.y); g.lineTo(bx, b.y); } else if (tool === 'rect') g.rect(Math.min(ax, bx), Math.min(a.y, b.y), Math.abs(bx - ax), Math.abs(b.y - a.y)); else if (tool === 'ellipse') { g.moveTo(Math.max(ax, bx), (a.y + b.y) / 2); g.ellipse((ax + bx) / 2, (a.y + b.y) / 2, Math.abs(bx - ax) / 2, Math.abs(b.y - a.y) / 2, 0, 0, 7); } };
        draw(a.x, b.x); if (sym) draw(W - a.x, W - b.x);
        fillShape && tool !== 'line' ? g.fill() : g.stroke(); g.globalAlpha = 1;
      }
      let down = null, last = null;
      stage.addEventListener('pointerdown', async (e) => {
        const p = pos(e); if (!layers[active].visible) return MS.toast('That layer is hidden');
        if (tool === 'picker') { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); layers.forEach((L) => L.visible && g.drawImage(L.cv, 0, 0)); const d = g.getImageData(p.x | 0, p.y | 0, 1, 1).data; color = '#' + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join(''); colorIn.value = color; MS.toast('Picked ' + color); return; }
        pushUndo();
        if (tool === 'fill') { flood(p.x, p.y); return; }
        if (tool === 'text') { const t = await MS.prompt('Text to place'); if (!t) { undo.pop(); return; } const g = ctxOf(active); g.fillStyle = color; g.globalAlpha = alpha; g.font = `bold ${size * 2 + 8}px system-ui`; g.fillText(t, p.x, p.y); g.globalAlpha = 1; return; }
        stage.setPointerCapture(e.pointerId); down = p; last = p; if (['brush', 'pencil', 'spray', 'eraser'].includes(tool)) stroke(ctxOf(active), p, { ...p, x: p.x + 0.01 });
      });
      stage.addEventListener('pointermove', (e) => {
        const p = pos(e); const og = overlay.getContext('2d'); og.clearRect(0, 0, W, H);
        if (!down) { og.strokeStyle = 'rgba(128,128,128,.8)'; og.beginPath(); og.arc(p.x, p.y, Math.max(2, size / 2), 0, 7); og.stroke(); return; }
        if (['line', 'rect', 'ellipse'].includes(tool)) shape(og, down, p);
        else { stroke(ctxOf(active), last, p); last = p; }
      });
      stage.addEventListener('pointerup', (e) => { if (!down) return; const p = pos(e); if (['line', 'rect', 'ellipse'].includes(tool)) { overlay.getContext('2d').clearRect(0, 0, W, H); shape(ctxOf(active), down, p); } down = null; });
      stage.addEventListener('pointerleave', () => overlay.getContext('2d').clearRect(0, 0, W, H));
      const flatten = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); layers.forEach((L) => { if (L.visible) { g.globalAlpha = L.opacity; g.drawImage(L.cv, 0, 0); } }); return c; };
      const setZoom = (z) => { zoom = MS.clamp(z, 0.25, 4); stage.style.transform = `scale(${zoom})`; stage.parentNode.style.width = W * zoom + 'px'; stage.parentNode.style.height = H * zoom + 'px'; zl.textContent = Math.round(zoom * 100) + '%'; };
      const zl = h('span.small.muted', '100%');
      MS.setActions(h('button.btn', { title: 'Undo (Ctrl+Z)', on: { click: doUndo } }, '↶'), h('button.btn', { title: 'Redo', on: { click: doRedo } }, '↷'),
        h('button.btn', { on: { click: () => setZoom(zoom - 0.25) } }, '−'), zl, h('button.btn', { on: { click: () => setZoom(zoom + 0.25) } }, '+'),
        h('button.btn', { on: { click: async () => { if (await MS.confirm('Clear the current layer?')) { pushUndo(); ctxOf(active).clearRect(0, 0, W, H); } } } }, 'Clear'),
        h('button.btn', { on: { click: async () => { const f = await MS.pickFile('image/*'); if (!f) return; const img = new Image(); img.onload = () => { addLayer(f.name); const sc = Math.min(W / img.width, H / img.height, 1); ctxOf(active).drawImage(img, (W - img.width * sc) / 2, (H - img.height * sc) / 2, img.width * sc, img.height * sc); renderLayers(); }; img.src = await MS.readDataURL(f); } } }, '⬆ Open'),
        h('button.btn', { on: { click: () => flatten().toBlob((b) => MS.download('painting.png', b)) } }, '⬇ PNG'),
        h('button.btn.primary', { on: { click: async () => { const name = await MS.prompt('Save to Files as', 'Painting ' + new Date().toLocaleDateString().replace(/\//g, '-') + '.png'); if (!name) return; const url = flatten().toDataURL('image/png'); await MS.db.files.put({ id: MS.uid('f'), name, type: 'image/png', folder: '/Pictures', size: Math.round(url.length * 0.75), data: url, created: Date.now(), updated: Date.now() }); MS.toast('Saved to Files › /Pictures', 'good'); } } }, '💾 Save'));
      addLayer('Background', true); addLayer('Layer 2'); renderLayers(); setTool('brush');
      // open a file passed from the Files app
      const keys = (e) => { if (/^(input|textarea)$/i.test(e.target.tagName)) return; const k = MS.eventKey(e); if (k === 'ctrl+z' || k === 'meta+z') { e.preventDefault(); doUndo(); } else if (k === 'ctrl+y' || k === 'ctrl+shift+z' || k === 'meta+shift+z') { e.preventDefault(); doRedo(); } else if (!e.ctrlKey && !e.metaKey && !e.altKey) { const m = { b: 'brush', p: 'pencil', s: 'spray', e: 'eraser', l: 'line', r: 'rect', o: 'ellipse', f: 'fill', t: 'text', i: 'picker' }[e.key]; if (m) setTool(m); if (e.key === '[') { size = Math.max(1, size - 2); sizeIn.value = size; sizeL.textContent = size + 'px'; } if (e.key === ']') { size = Math.min(120, size + 2); sizeIn.value = size; sizeL.textContent = size + 'px'; } } };
      document.addEventListener('keydown', keys);
      return {
        unmount: () => document.removeEventListener('keydown', keys),
        async route(args) { if (args[0] === 'file' && args[1]) { const f = await MS.db.files.get(args[1]); if (f && f.type.startsWith('image/')) { const img = new Image(); img.onload = () => { addLayer(f.name); const sc = Math.min(W / img.width, H / img.height, 1); ctxOf(active).drawImage(img, 0, 0, img.width * sc, img.height * sc); renderLayers(); }; img.src = f.data; } } },
      };
    },
  });
})();
