/* Pixel Studio: pixel art + frame animation with onion skin, palettes, mirror drawing, PNG/spritesheet/GIF export */
(function () {
  const { h } = MS;
  const PALETTES = { 'PICO-8': ['#000000', '#1d2b53', '#7e2553', '#008751', '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8', '#ff004d', '#ffa300', '#ffec27', '#00e436', '#29adff', '#83769c', '#ff77a8', '#ffccaa'], GameBoy: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'], Pastel: ['#fbf8cc', '#fde4cf', '#ffcfd2', '#f1c0e8', '#cfbaf0', '#a3c4f3', '#90dbf4', '#8eecf5', '#98f5e1', '#b9fbc0', '#ffffff', '#333333'], Neon: ['#000000', '#ffffff', '#ff00ff', '#00ffff', '#ffff00', '#ff0080', '#00ff80', '#8000ff', '#ff8000', '#0080ff'] };
  let store;
  const getStore = async () => (store = store || (await MS.store('pixel', () => ({ size: 32, frames: [], fps: 8, palette: 'PICO-8', name: 'sprite' }))));
  MS.register({
    id: 'pixel', name: 'Pixel Studio', icon: '👾', group: 'Create', desc: 'Pixel art & sprite animation', keywords: 'pixel art sprite animation gif 8bit retro game assets',
    async mount(view) {
      const s = await getStore(); const d = s.data; let N = d.size; let tool = 'pencil', color = '#ff004d', mirror = false, onion = true, cur = 0, playing = null, zoom = 16;
      const mkFrame = () => new ImageData(N, N);
      let frames = [];
      const loadFrames = async () => { frames = []; for (const url of d.frames) { const img = new Image(); await new Promise((r) => { img.onload = r; img.onerror = r; img.src = url; }); const c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'); g.drawImage(img, 0, 0); frames.push(g.getImageData(0, 0, N, N)); } if (!frames.length) { frames.push(mkFrame()); seed(frames[0]); } };
      const seed = (f) => { // a little smiley so it isn't empty
        const set = (x, y, c) => { const i = (y * N + x) * 4; const [r, g, b] = [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16)); f.data.set([r, g, b, 255], i); };
        const c = N / 2 | 0; for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) if (x * x + y * y <= 36) set(c + x, c + y, '#ffec27'); [[-2, -2], [2, -2]].forEach(([x, y]) => set(c + x, c + y, '#000000')); for (let x = -3; x <= 3; x++) set(c + x, c + 3 - (Math.abs(x) > 2 ? 1 : 0), '#7e2553'); };
      const save = MS.debounce(() => { d.frames = frames.map((f) => { const c = document.createElement('canvas'); c.width = c.height = N; c.getContext('2d').putImageData(f, 0, 0); return c.toDataURL(); }); s.touch(); renderFrames(); }, 400);
      const undo = [];
      const cv = h('canvas', { style: { imageRendering: 'pixelated', cursor: 'crosshair', touchAction: 'none', boxShadow: 'var(--shadow)', background: 'repeating-conic-gradient(#bbb 0 25%, #eee 0 50%) 0 0/16px 16px' } });
      const prev = h('canvas', { width: N, height: N, style: { width: '128px', height: '128px', imageRendering: 'pixelated', background: 'repeating-conic-gradient(#bbb 0 25%, #eee 0 50%) 0 0/16px 16px', borderRadius: '8px' } });
      const framesEl = h('div.row', { style: { overflowX: 'auto', gap: '6px', padding: '8px', borderTop: '1px solid var(--line)', background: 'var(--panel)' } });
      const palEl = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' } });
      const colorIn = h('input', { type: 'color', value: color, style: { width: '100%', height: '34px', border: 0, background: 'none' }, on: { input: () => { color = colorIn.value; renderPal(); } } });
      const toolBtns = {}; [['pencil', '✏️'], ['eraser', '🧽'], ['fill', '🪣'], ['line', '╱'], ['rect', '▭'], ['circle', '◯'], ['picker', '💧'], ['shift', '✥']].forEach(([t, i]) => (toolBtns[t] = h('button.btn', { title: t, style: { fontSize: '16px' }, on: { click: () => setTool(t) } }, i)));
      const setTool = (t) => { tool = t; Object.entries(toolBtns).forEach(([k, b]) => b.classList.toggle('on', k === t)); };
      const palSel = h('select.input', { on: { change: () => { d.palette = palSel.value; s.touch(); renderPal(); } } }, Object.keys(PALETTES).map((p) => h('option', { selected: p === d.palette }, p)));
      const fps = h('input', { type: 'range', min: 1, max: 24, value: d.fps, on: { input: () => { d.fps = +fps.value; fpsL.textContent = d.fps + ' fps'; s.touch(); if (playing) { stopPlay(); startPlay(); } } } }); const fpsL = h('span.small.muted', d.fps + ' fps');
      const side = h('div', { style: { width: '200px', flex: 'none', padding: '12px', borderRight: '1px solid var(--line)', background: 'var(--panel)', display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'auto' } },
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '4px' } }, Object.values(toolBtns)), colorIn, palSel, palEl,
        h('label.row.small', h('input', { type: 'checkbox', on: { change: (e) => (mirror = e.target.checked) } }), 'Mirror X'), h('label.row.small', h('input', { type: 'checkbox', checked: true, on: { change: (e) => { onion = e.target.checked; draw(); } } }), 'Onion skin'),
        h('strong.small', 'Preview'), prev, h('div.row', h('button.btn.sm', { on: { click: () => (playing ? stopPlay() : startPlay()) } }, '▶/■'), fps, fpsL));
      const stageWrap = h('div', { style: { flex: 1, overflow: 'auto', display: 'grid', placeItems: 'center', padding: '20px', background: 'var(--bg)' } }, cv);
      view.append(h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } }, h('div', { style: { display: 'flex', flex: 1, minHeight: 0 } }, side, stageWrap), framesEl));
      function renderPal() { palEl.innerHTML = ''; PALETTES[d.palette].forEach((c) => palEl.append(h('button', { title: c, style: { height: '28px', borderRadius: '6px', background: c, border: c === color ? '3px solid var(--text)' : '1px solid var(--line)', cursor: 'pointer' }, on: { click: () => { color = c; colorIn.value = c; renderPal(); } } }))); }
      const fitZoom = () => { const r = stageWrap.getBoundingClientRect(); zoom = Math.max(4, Math.floor(Math.min(r.width - 40, r.height - 40) / N)); cv.width = cv.height = N * zoom; draw(); };
      function draw() {
        const g = cv.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, cv.width, cv.height);
        const tmp = document.createElement('canvas'); tmp.width = tmp.height = N; const tg = tmp.getContext('2d');
        if (onion && cur > 0) { tg.putImageData(frames[cur - 1], 0, 0); g.globalAlpha = 0.25; g.drawImage(tmp, 0, 0, cv.width, cv.height); g.globalAlpha = 1; }
        tg.putImageData(frames[cur], 0, 0); g.drawImage(tmp, 0, 0, cv.width, cv.height);
        if (zoom >= 8) { g.strokeStyle = 'rgba(0,0,0,.08)'; g.beginPath(); for (let i = 0; i <= N; i++) { g.moveTo(i * zoom + 0.5, 0); g.lineTo(i * zoom + 0.5, cv.height); g.moveTo(0, i * zoom + 0.5); g.lineTo(cv.width, i * zoom + 0.5); } g.stroke(); }
        if (preview) { g.fillStyle = color; preview.forEach(([x, y]) => g.fillRect(x * zoom, y * zoom, zoom, zoom)); }
        if (!playing) { const pg = prev.getContext('2d'); pg.clearRect(0, 0, N, N); pg.putImageData(frames[cur], 0, 0); }
      }
      let preview = null;
      const hex = (c) => [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16));
      const setPx = (f, x, y, erase) => { if (x < 0 || y < 0 || x >= N || y >= N) return; const i = (y * N + x) * 4; if (erase) f.data.set([0, 0, 0, 0], i); else f.data.set([...hex(color), 255], i); if (mirror) { const mx = N - 1 - x; const j = (y * N + mx) * 4; if (erase) f.data.set([0, 0, 0, 0], j); else f.data.set([...hex(color), 255], j); } };
      const linePts = (x0, y0, x1, y1) => { const pts = []; const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx + dy; while (true) { pts.push([x0, y0]); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } } return pts; };
      const rectPts = (a, b) => { const pts = []; const [x0, x1] = [Math.min(a.x, b.x), Math.max(a.x, b.x)], [y0, y1] = [Math.min(a.y, b.y), Math.max(a.y, b.y)]; for (let x = x0; x <= x1; x++) pts.push([x, y0], [x, y1]); for (let y = y0; y <= y1; y++) pts.push([x0, y], [x1, y]); return pts; };
      const circPts = (a, b) => { const pts = []; const rx = Math.abs(b.x - a.x), ry = Math.abs(b.y - a.y); for (let t = 0; t < 360; t += 1) { pts.push([Math.round(a.x + rx * Math.cos((t * Math.PI) / 180)), Math.round(a.y + ry * Math.sin((t * Math.PI) / 180))]); } return pts; };
      const fill = (f, x, y) => { const i0 = (y * N + x) * 4; const t = [...f.data.slice(i0, i0 + 4)].join(); const nc = [...hex(color), 255]; if (t === nc.join()) return; const st = [[x, y]]; while (st.length) { const [cx, cy] = st.pop(); if (cx < 0 || cy < 0 || cx >= N || cy >= N) continue; const i = (cy * N + cx) * 4; if ([...f.data.slice(i, i + 4)].join() !== t) continue; f.data.set(nc, i); st.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]); } };
      const cell = (e) => { const r = cv.getBoundingClientRect(); return { x: Math.floor(((e.clientX - r.left) / r.width) * N), y: Math.floor(((e.clientY - r.top) / r.height) * N) }; };
      let down = null, last = null;
      cv.addEventListener('pointerdown', (e) => { const p = cell(e); const f = frames[cur]; undo.push({ i: cur, data: new ImageData(new Uint8ClampedArray(f.data), N, N) }); if (undo.length > 60) undo.shift(); cv.setPointerCapture(e.pointerId); down = p; last = p;
        const erase = tool === 'eraser' || e.button === 2;
        if (tool === 'picker') { const i = (p.y * N + p.x) * 4; if (f.data[i + 3]) { color = '#' + [0, 1, 2].map((k) => f.data[i + k].toString(16).padStart(2, '0')).join(''); colorIn.value = color; renderPal(); } undo.pop(); down = null; return; }
        if (tool === 'fill') { fill(f, p.x, p.y); draw(); save(); down = null; return; }
        if (tool === 'pencil' || tool === 'eraser') { setPx(f, p.x, p.y, erase); draw(); } });
      cv.addEventListener('contextmenu', (e) => e.preventDefault());
      cv.addEventListener('pointermove', (e) => { if (!down) return; const p = cell(e); const f = frames[cur];
        if (tool === 'pencil' || tool === 'eraser') { linePts(last.x, last.y, p.x, p.y).forEach(([x, y]) => setPx(f, x, y, tool === 'eraser' || e.buttons === 2)); last = p; draw(); }
        else if (tool === 'line') { preview = linePts(down.x, down.y, p.x, p.y); draw(); } else if (tool === 'rect') { preview = rectPts(down, p); draw(); } else if (tool === 'circle') { preview = circPts(down, p); draw(); }
        else if (tool === 'shift') { const dx = p.x - last.x, dy = p.y - last.y; if (dx || dy) { const src = new Uint8ClampedArray(f.data); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const sx = (x - dx + N) % N, sy = (y - dy + N) % N; f.data.set(src.slice((sy * N + sx) * 4, (sy * N + sx) * 4 + 4), (y * N + x) * 4); } last = p; draw(); } } });
      cv.addEventListener('pointerup', () => { if (!down) return; if (preview) { preview.forEach(([x, y]) => setPx(frames[cur], x, y, false)); preview = null; draw(); } down = null; save(); });
      function renderFrames() { framesEl.innerHTML = ''; frames.forEach((f, i) => { const c = h('canvas', { width: N, height: N, style: { width: '56px', height: '56px', imageRendering: 'pixelated', borderRadius: '6px', cursor: 'pointer', outline: i === cur ? '3px solid var(--accent)' : '1px solid var(--line)', background: 'repeating-conic-gradient(#bbb 0 25%, #eee 0 50%) 0 0/8px 8px', flex: 'none' }, on: { click: () => { cur = i; draw(); renderFrames(); } } }); c.getContext('2d').putImageData(f, 0, 0); framesEl.append(h('div.col', { style: { alignItems: 'center', gap: '2px' } }, c, h('span.small.muted', i + 1))); });
        framesEl.append(h('button.btn', { on: { click: () => { frames.splice(cur + 1, 0, mkFrame()); cur++; draw(); save(); } } }, '+ Frame'), h('button.btn', { on: { click: () => { frames.splice(cur + 1, 0, new ImageData(new Uint8ClampedArray(frames[cur].data), N, N)); cur++; draw(); save(); } } }, '⧉ Duplicate'), h('button.btn', { on: { click: () => { if (cur > 0) { [frames[cur - 1], frames[cur]] = [frames[cur], frames[cur - 1]]; cur--; draw(); save(); } } } }, '◀ Move'), h('button.btn.danger', { on: { click: () => { if (frames.length < 2) return; frames.splice(cur, 1); cur = Math.max(0, cur - 1); draw(); save(); } } }, '🗑 Frame')); }
      function startPlay() { let i = 0; playing = setInterval(() => { const pg = prev.getContext('2d'); pg.clearRect(0, 0, N, N); pg.putImageData(frames[i % frames.length], 0, 0); i++; }, 1000 / d.fps); }
      function stopPlay() { clearInterval(playing); playing = null; draw(); }
      const sheet = () => { const c = document.createElement('canvas'); c.width = N * frames.length; c.height = N; frames.forEach((f, i) => c.getContext('2d').putImageData(f, i * N, 0)); return c; };
      const scaled = (src, k) => { const c = document.createElement('canvas'); c.width = src.width * k; c.height = src.height * k; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(src, 0, 0, c.width, c.height); return c; };
      const frameCanvas = (f) => { const c = document.createElement('canvas'); c.width = c.height = N; c.getContext('2d').putImageData(f, 0, 0); return c; };
      MS.setActions(h('select.input', { title: 'Canvas size (clears)', on: { change: async (e) => { if (!(await MS.confirm('Change canvas size?', 'This starts a new, empty sprite.', 'Change'))) { e.target.value = N; return; } N = d.size = +e.target.value; d.frames = []; frames = [mkFrame()]; cur = 0; prev.width = prev.height = N; s.touch(); fitZoom(); renderFrames(); } } }, [8, 16, 24, 32, 48, 64].map((n) => h('option', { value: n, selected: n === N }, `${n}×${n}`))),
        h('button.btn', { title: 'Undo (Ctrl+Z)', on: { click: () => doUndo() } }, '↶'),
        h('button.btn', { on: { click: () => { const f = frames[cur]; const src = new Uint8ClampedArray(f.data); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) f.data.set(src.slice((y * N + N - 1 - x) * 4, (y * N + N - 1 - x) * 4 + 4), (y * N + x) * 4); draw(); save(); } } }, '⇋ Flip'),
        h('button.btn', { on: { click: () => { frames[cur] = mkFrame(); draw(); save(); } } }, 'Clear'),
        h('button.btn', { on: { click: () => scaled(frameCanvas(frames[cur]), 16).toBlob((b) => MS.download(`${d.name}-frame${cur + 1}.png`, b)) } }, '⬇ PNG'),
        h('button.btn', { on: { click: () => scaled(sheet(), 8).toBlob((b) => MS.download(`${d.name}-sheet.png`, b)) } }, '⬇ Sheet'),
        h('button.btn.primary', { on: { click: () => { const blob = MS.encodeGIF(frames, 1000 / d.fps, Math.max(1, Math.floor(256 / N))); MS.download(`${d.name}.gif`, blob); MS.toast('GIF exported', 'good'); } } }, '⬇ GIF'),
        h('button.btn', { on: { click: async () => { const blob = MS.encodeGIF(frames, 1000 / d.fps, Math.max(1, Math.floor(256 / N))); const url = await MS.readDataURL(blob); await MS.db.files.put({ id: MS.uid('f'), name: `${d.name}.gif`, type: 'image/gif', folder: '/Pictures', size: blob.size, data: url, created: Date.now(), updated: Date.now() }); MS.toast('Saved GIF to Files › /Pictures', 'good'); } } }, '💾 Files'));
      const doUndo = () => { const u = undo.pop(); if (!u || !frames[u.i]) return; frames[u.i] = u.data; cur = u.i; draw(); save(); };
      const keys = (e) => { if (/^(input|textarea|select)$/i.test(e.target.tagName)) return; if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); doUndo(); return; } const m = { b: 'pencil', p: 'pencil', e: 'eraser', f: 'fill', g: 'fill', l: 'line', r: 'rect', c: 'circle', i: 'picker', m: 'shift' }[e.key]; if (m && !e.ctrlKey && !e.metaKey) setTool(m); if (e.key === ',') { cur = Math.max(0, cur - 1); draw(); renderFrames(); } if (e.key === '.') { cur = Math.min(frames.length - 1, cur + 1); draw(); renderFrames(); } };
      document.addEventListener('keydown', keys);
      await loadFrames(); setTool('pencil'); renderPal(); renderFrames(); const ro = new ResizeObserver(MS.debounce(fitZoom, 60)); ro.observe(stageWrap); fitZoom();
      return { unmount: () => { document.removeEventListener('keydown', keys); stopPlay(); ro.disconnect(); } };
    },
  });
})();
