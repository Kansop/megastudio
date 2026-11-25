/* Photo Lab: non-destructive adjustments, presets, crop/rotate/flip, vignette, before/after, export */
(function () {
  const { h } = MS;
  const DEF = { brightness: 0, contrast: 0, saturation: 0, warmth: 0, tint: 0, exposure: 0, vignette: 0, grain: 0, sharpen: 0, blur: 0, gray: 0, sepia: 0, invert: 0 };
  const PRESETS = { Original: {}, Vivid: { contrast: 18, saturation: 35, sharpen: 30 }, Noir: { gray: 100, contrast: 35, vignette: 45 }, Vintage: { sepia: 55, contrast: -10, vignette: 40, grain: 25, warmth: 15 }, Cool: { warmth: -30, tint: 8, saturation: 10 }, Warm: { warmth: 35, brightness: 5 }, Fade: { contrast: -25, brightness: 10, saturation: -20 }, Drama: { contrast: 40, saturation: -15, vignette: 60, sharpen: 40 }, Pop: { saturation: 60, contrast: 10, brightness: 5 }, Dream: { blur: 2, brightness: 12, saturation: 15, vignette: 20 } };
  function process(src, a, outW, outH) {
    const c = document.createElement('canvas'); c.width = outW; c.height = outH; const g = c.getContext('2d', { willReadFrequently: true });
    if (a.blur && 'filter' in g) g.filter = `blur(${(a.blur * outW) / 1000}px)`; g.drawImage(src, 0, 0, outW, outH); g.filter = 'none';
    const img = g.getImageData(0, 0, outW, outH); const d = img.data; const n = d.length;
    const br = a.brightness * 2.55, ct = (259 * (a.contrast * 2.55 + 255)) / (255 * (259 - a.contrast * 2.55)), sat = 1 + a.saturation / 100, ex = Math.pow(2, a.exposure / 50);
    const cx = outW / 2, cy = outH / 2, maxD = Math.hypot(cx, cy);
    for (let i = 0; i < n; i += 4) {
      let r = d[i] * ex, gg = d[i + 1] * ex, b = d[i + 2] * ex;
      r += br; gg += br; b += br;
      r = ct * (r - 128) + 128; gg = ct * (gg - 128) + 128; b = ct * (b - 128) + 128;
      const L = 0.299 * r + 0.587 * gg + 0.114 * b; r = L + (r - L) * sat; gg = L + (gg - L) * sat; b = L + (b - L) * sat;
      r += a.warmth * 0.8; b -= a.warmth * 0.8; gg += a.tint * 0.8;
      if (a.gray) { const y = 0.299 * r + 0.587 * gg + 0.114 * b; const k = a.gray / 100; r += (y - r) * k; gg += (y - gg) * k; b += (y - b) * k; }
      if (a.sepia) { const k = a.sepia / 100; const sr = r * 0.393 + gg * 0.769 + b * 0.189, sg = r * 0.349 + gg * 0.686 + b * 0.168, sb = r * 0.272 + gg * 0.534 + b * 0.131; r += (sr - r) * k; gg += (sg - gg) * k; b += (sb - b) * k; }
      if (a.invert) { const k = a.invert / 100; r += (255 - 2 * r) * k; gg += (255 - 2 * gg) * k; b += (255 - 2 * b) * k; }
      if (a.vignette) { const p = i / 4; const x = p % outW, y = (p / outW) | 0; const v = 1 - (a.vignette / 100) * Math.pow(Math.hypot(x - cx, y - cy) / maxD, 2) * 1.3; r *= v; gg *= v; b *= v; }
      if (a.grain) { const z = (Math.random() - 0.5) * a.grain * 1.2; r += z; gg += z; b += z; }
      d[i] = r; d[i + 1] = gg; d[i + 2] = b;
    }
    if (a.sharpen) { const k = a.sharpen / 100; const src2 = new Uint8ClampedArray(d); const w = outW * 4; for (let y = 1; y < outH - 1; y++) for (let x = 1; x < outW - 1; x++) { const i = y * w + x * 4; for (let ch = 0; ch < 3; ch++) { const v = src2[i + ch] * 5 - src2[i + ch - 4] - src2[i + ch + 4] - src2[i + ch - w] - src2[i + ch + w]; d[i + ch] = src2[i + ch] + (v - src2[i + ch]) * k; } } }
    g.putImageData(img, 0, 0); return c;
  }
  function sample() { const c = document.createElement('canvas'); c.width = 1200; c.height = 800; const g = c.getContext('2d'); const sky = g.createLinearGradient(0, 0, 0, 520); sky.addColorStop(0, '#2b5876'); sky.addColorStop(0.6, '#f5a25d'); sky.addColorStop(1, '#ffd29d'); g.fillStyle = sky; g.fillRect(0, 0, 1200, 800); g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(820, 420, 90, 0, 7); g.fill();
    const hill = (y, col, amp) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, 800); for (let x = 0; x <= 1200; x += 20) g.lineTo(x, y + Math.sin(x / 140 + amp) * 40 + Math.sin(x / 47) * 10); g.lineTo(1200, 800); g.fill(); }; hill(500, '#6b4c7a', 1); hill(580, '#3e3160', 2.5); hill(660, '#1f1b3a', 4);
    g.fillStyle = '#0f0d20'; for (let i = 0; i < 9; i++) { const x = 80 + i * 130, y = 690; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 30, y - 120 - (i % 3) * 30); g.lineTo(x + 60, y); g.fill(); } return c; }
  MS.register({
    id: 'photo', name: 'Photo Lab', icon: '📷', group: 'Create', desc: 'Photo filters & edits', keywords: 'photo image filter edit crop rotate instagram lightroom adjust',
    async mount(view) {
      let src = sample(), name = 'sample', adj = { ...DEF }, crop = null, cropping = false, showBefore = false;
      const cv = h('canvas', { style: { maxWidth: '100%', maxHeight: '100%', boxShadow: 'var(--shadow)', borderRadius: '6px', cursor: 'default', touchAction: 'none' } });
      const stage = h('div', { style: { flex: 1, display: 'grid', placeItems: 'center', padding: '20px', minWidth: 0, background: 'var(--bg)', position: 'relative', overflow: 'hidden' } }, cv);
      const sliders = h('div.col', { style: { gap: '8px' } }); const presetsEl = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '6px' } });
      const panel = h('div', { style: { width: '280px', flex: 'none', overflow: 'auto', padding: '14px', borderLeft: '1px solid var(--line)', background: 'var(--panel)', display: 'flex', flexDirection: 'column', gap: '14px' } }, h('strong', 'Presets'), presetsEl, h('strong', 'Adjust'), sliders);
      view.append(h('div', { style: { display: 'flex', height: '100%' } }, stage, panel));
      const RANGES = { exposure: [-100, 100], brightness: [-100, 100], contrast: [-100, 100], saturation: [-100, 100], warmth: [-100, 100], tint: [-100, 100], sharpen: [0, 100], blur: [0, 20], vignette: [0, 100], grain: [0, 100], gray: [0, 100], sepia: [0, 100], invert: [0, 100] };
      const inputs = {};
      Object.entries(RANGES).forEach(([k, [mn, mx]]) => { const val = h('span.small.muted', '0'); const r = h('input', { type: 'range', min: mn, max: mx, value: 0, style: { width: '100%' }, on: { input: () => { adj[k] = +r.value; val.textContent = r.value; renderSoon(); }, dblclick: () => { adj[k] = 0; r.value = 0; val.textContent = '0'; render(); } } }); inputs[k] = [r, val]; sliders.append(h('div', h('div.row.small', h('span', k[0].toUpperCase() + k.slice(1)), h('div.spacer'), val), r)); });
      const syncInputs = () => Object.entries(inputs).forEach(([k, [r, v]]) => { r.value = adj[k]; v.textContent = adj[k]; });
      const thumbSrc = () => { const t = document.createElement('canvas'); const sc = 120 / Math.max(src.width, src.height); t.width = src.width * sc; t.height = src.height * sc; t.getContext('2d').drawImage(src, 0, 0, t.width, t.height); return t; };
      const renderPresets = () => { presetsEl.innerHTML = ''; const t = thumbSrc(); Object.entries(PRESETS).forEach(([n, p]) => { const c = process(t, { ...DEF, ...p }, t.width, t.height); c.style.width = '100%'; c.style.borderRadius = '6px'; presetsEl.append(h('button', { style: { background: 'none', border: '1px solid var(--line)', borderRadius: '8px', padding: '4px', cursor: 'pointer', color: 'inherit' }, on: { click: () => { adj = { ...DEF, ...p }; syncInputs(); render(); } } }, c, h('div.small', n))); }); };
      const previewSize = () => { const maxW = Math.max(200, stage.clientWidth - 40), maxH = Math.max(200, stage.clientHeight - 40); const sw = crop ? crop.w : src.width, sh = crop ? crop.h : src.height; const sc = Math.min(1, maxW / sw, maxH / sh, 1400 / Math.max(sw, sh)); return [Math.round(sw * sc), Math.round(sh * sc)]; };
      const cropped = () => { if (!crop) return src; const c = document.createElement('canvas'); c.width = crop.w; c.height = crop.h; c.getContext('2d').drawImage(src, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h); return c; };
      function render() { const [w, hh] = previewSize(); const out = showBefore ? (() => { const c = document.createElement('canvas'); c.width = w; c.height = hh; c.getContext('2d').drawImage(cropped(), 0, 0, w, hh); return c; })() : process(cropped(), adj, w, hh); cv.width = w; cv.height = hh; cv.getContext('2d').drawImage(out, 0, 0); if (cropping && cropRect) { const g = cv.getContext('2d'); g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(0, 0, w, hh); const r = cropRect; g.drawImage(out, r.x, r.y, r.w, r.h, r.x, r.y, r.w, r.h); g.strokeStyle = '#fff'; g.setLineDash([6, 4]); g.lineWidth = 2; g.strokeRect(r.x, r.y, r.w, r.h); } }
      const renderSoon = MS.debounce(render, 30);
      let cropRect = null, cropStart = null;
      cv.addEventListener('pointerdown', (e) => { if (!cropping) return; const r = cv.getBoundingClientRect(); cropStart = { x: ((e.clientX - r.left) / r.width) * cv.width, y: ((e.clientY - r.top) / r.height) * cv.height }; cv.setPointerCapture(e.pointerId); });
      cv.addEventListener('pointermove', (e) => { if (!cropping || !cropStart) return; const r = cv.getBoundingClientRect(); const x = ((e.clientX - r.left) / r.width) * cv.width, y = ((e.clientY - r.top) / r.height) * cv.height; cropRect = { x: Math.min(x, cropStart.x), y: Math.min(y, cropStart.y), w: Math.abs(x - cropStart.x), h: Math.abs(y - cropStart.y) }; render(); });
      cv.addEventListener('pointerup', () => (cropStart = null));
      const cropBtn = h('button.btn', { on: { click: () => { if (!cropping) { cropping = true; cropRect = null; cv.style.cursor = 'crosshair'; cropBtn.textContent = '✓ Apply crop'; MS.toast('Drag on the photo to choose the crop'); render(); } else { if (cropRect && cropRect.w > 5) { const base = crop || { x: 0, y: 0, w: src.width, h: src.height }; const k = base.w / cv.width; crop = { x: base.x + cropRect.x * k, y: base.y + cropRect.y * k, w: cropRect.w * k, h: cropRect.h * k }; } cropping = false; cropRect = null; cv.style.cursor = 'default'; cropBtn.textContent = '✂ Crop'; render(); } } } }, '✂ Crop');
      const transform = (fn) => { const base = cropped(); const c = document.createElement('canvas'); fn(c, base); src = c; crop = null; renderPresets(); render(); };
      const rotate = () => transform((c, b) => { c.width = b.height; c.height = b.width; const g = c.getContext('2d'); g.translate(c.width, 0); g.rotate(Math.PI / 2); g.drawImage(b, 0, 0); });
      const flipH = () => transform((c, b) => { c.width = b.width; c.height = b.height; const g = c.getContext('2d'); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(b, 0, 0); });
      const flipV = () => transform((c, b) => { c.width = b.width; c.height = b.height; const g = c.getContext('2d'); g.translate(0, c.height); g.scale(1, -1); g.drawImage(b, 0, 0); });
      const loadImg = (url, n) => { const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext('2d').drawImage(img, 0, 0); src = c; name = n.replace(/\.\w+$/, ''); crop = null; adj = { ...DEF }; syncInputs(); renderPresets(); render(); }; img.src = url; };
      const fullRes = () => { const b = cropped(); const sc = Math.min(1, 4000 / Math.max(b.width, b.height)); return process(b, adj, Math.round(b.width * sc), Math.round(b.height * sc)); };
      const beforeBtn = h('button.btn', { title: 'Hold to compare', on: { pointerdown: () => { showBefore = true; render(); }, pointerup: () => { showBefore = false; render(); }, pointerleave: () => { if (showBefore) { showBefore = false; render(); } } } }, '◐ Before');
      MS.setActions(h('button.btn.primary', { on: { click: async () => { const f = await MS.pickFile('image/*'); if (f) loadImg(await MS.readDataURL(f), f.name); } } }, '⬆ Open photo'),
        h('button.btn', { on: { click: async () => { const imgs = (await MS.db.files.all()).filter((f) => f.type.startsWith('image/')); if (!imgs.length) return MS.toast('No images in Files yet'); const close = MS.modal(h('div', h('h2', 'Open from Files'), h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(110px,1fr))', gap: '8px' } }, imgs.map((f) => h('button', { style: { background: 'none', border: '1px solid var(--line)', borderRadius: '8px', padding: '4px', cursor: 'pointer', color: 'inherit' }, on: { click: () => { close(); loadImg(f.data, f.name); } } }, h('img', { src: f.data, style: { width: '100%', height: '80px', objectFit: 'cover', borderRadius: '6px' } }), h('div.small', f.name)))))); } } }, '🗂 From Files'),
        cropBtn, h('button.btn', { title: 'Rotate 90°', on: { click: rotate } }, '⟳'), h('button.btn', { title: 'Flip horizontal', on: { click: flipH } }, '⇋'), h('button.btn', { title: 'Flip vertical', on: { click: flipV } }, '⇅'), beforeBtn,
        h('button.btn', { on: { click: () => { adj = { ...DEF }; crop = null; syncInputs(); render(); } } }, 'Reset'),
        h('button.btn', { on: { click: () => fullRes().toBlob((b) => MS.download(name + '-edited.jpg', b), 'image/jpeg', 0.92) } }, '⬇ JPG'),
        h('button.btn', { on: { click: () => fullRes().toBlob((b) => MS.download(name + '-edited.png', b)) } }, '⬇ PNG'),
        h('button.btn', { on: { click: async () => { const url = fullRes().toDataURL('image/jpeg', 0.9); await MS.db.files.put({ id: MS.uid('f'), name: name + '-edited.jpg', type: 'image/jpeg', folder: '/Pictures', size: (url.length * 0.75) | 0, data: url, created: Date.now(), updated: Date.now() }); MS.toast('Saved to Files › /Pictures', 'good'); } } }, '💾 Files'));
      view.addEventListener('dragover', (e) => e.preventDefault()); view.addEventListener('drop', async (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f && f.type.startsWith('image/')) loadImg(await MS.readDataURL(f), f.name); });
      const ro = new ResizeObserver(MS.debounce(render, 80)); ro.observe(stage);
      renderPresets(); render();
      return { unmount: () => ro.disconnect(), async route(args) { if (args[0] === 'file' && args[1]) { const f = await MS.db.files.get(args[1]); if (f) loadImg(f.data, f.name); } } };
    },
  });
})();
