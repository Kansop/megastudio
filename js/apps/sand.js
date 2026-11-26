/* Sand Lab: falling-sand cellular physics — sand, water, oil, fire, lava, wood, plants, acid, ice, steam, gunpowder… */
(function () {
  const { h } = MS;
  // element ids
  const E = { EMPTY: 0, WALL: 1, SAND: 2, WATER: 3, FIRE: 4, WOOD: 5, OIL: 6, LAVA: 7, STONE: 8, PLANT: 9, STEAM: 10, SMOKE: 11, ACID: 12, ICE: 13, POWDER: 14, SALT: 15, EMBER: 16, CLONE: 17, SNOW: 18, GLASS: 19 };
  const INFO = [
    [E.SAND, 'Sand', '#e6c87a', 'powder'], [E.WATER, 'Water', '#3a8cf0', 'liquid'], [E.OIL, 'Oil', '#6b4a1c', 'liquid'], [E.FIRE, 'Fire', '#ff6a1f', 'gas'], [E.LAVA, 'Lava', '#ff4a10', 'liquid'],
    [E.WOOD, 'Wood', '#8b5a2b', 'solid'], [E.STONE, 'Stone', '#8a8a92', 'powder'], [E.PLANT, 'Plant', '#3fbf4a', 'solid'], [E.ACID, 'Acid', '#9cff3a', 'liquid'], [E.ICE, 'Ice', '#bfe8ff', 'solid'],
    [E.SNOW, 'Snow', '#f4f8ff', 'powder'], [E.SALT, 'Salt', '#f0f0f0', 'powder'], [E.POWDER, 'Gunpowder', '#444', 'powder'], [E.STEAM, 'Steam', '#cfd8e3', 'gas'], [E.CLONE, 'Cloner', '#d0a020', 'solid'], [E.WALL, 'Wall', '#555a66', 'solid'], [E.EMPTY, 'Eraser', '#000', 'tool'],
  ];
  const BASE = []; INFO.forEach(([id, , c]) => (BASE[id] = c)); BASE[E.SMOKE] = '#555'; BASE[E.EMBER] = '#ffb020'; BASE[E.GLASS] = '#a8d8e8';
  const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const RGB = BASE.map((c) => (c ? hex(c) : [0, 0, 0]));
  const DENS = { [E.WATER]: 5, [E.OIL]: 3, [E.ACID]: 6, [E.LAVA]: 8 };
  const isLiquid = (t) => t === E.WATER || t === E.OIL || t === E.ACID || t === E.LAVA;
  const isGas = (t) => t === E.STEAM || t === E.SMOKE || t === E.FIRE;
  const flammable = (t) => t === E.WOOD || t === E.OIL || t === E.PLANT || t === E.POWDER;

  MS.register({
    id: 'sand', name: 'Sand Lab', icon: '⏳', group: 'Play', desc: 'Falling-sand physics sandbox', keywords: 'sand falling physics simulation powder toy water fire lava cellular automata',
    async mount(view) {
      const W = 300, H = 200;
      let grid = new Uint8Array(W * H), life = new Uint8Array(W * H), shade = new Uint8Array(W * H), moved = new Uint8Array(W * H);
      const cv = h('canvas', { width: W, height: H, style: { width: '100%', maxWidth: 'min(1100px, calc((100vh - 230px) * 1.5))', imageRendering: 'pixelated', borderRadius: '12px', background: '#0b0d14', touchAction: 'none', cursor: 'crosshair', display: 'block', margin: '0 auto', boxShadow: 'var(--shadow)' } });
      const g = cv.getContext('2d'); const img = g.createImageData(W, H);
      let cur = E.SAND, brush = 4, paused = false, speed = 1, frame = 0, painting = false, px = -1, py = -1, erasing = false;
      const set = (x, y, t) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = y * W + x; grid[i] = t; life[i] = t === E.FIRE ? 20 + (Math.random() * 30) | 0 : t === E.STEAM || t === E.SMOKE ? 80 + (Math.random() * 120) | 0 : t === E.EMBER ? 40 : t === E.CLONE ? 0 : 0; shade[i] = (Math.random() * 40) | 0; };
      const get = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? E.WALL : grid[y * W + x]);
      function swap(a, b) { const t = grid[a]; grid[a] = grid[b]; grid[b] = t; const l = life[a]; life[a] = life[b]; life[b] = l; const s = shade[a]; shade[a] = shade[b]; shade[b] = s; moved[a] = moved[b] = 1; }
      function paint(x, y, t) { for (let dy = -brush; dy <= brush; dy++) for (let dx = -brush; dx <= brush; dx++) { if (dx * dx + dy * dy > brush * brush) continue; const X = x + dx, Y = y + dy; if (t === E.EMPTY || get(X, Y) === E.EMPTY || t === E.WALL) { if (t !== E.EMPTY && (INFO.find((q) => q[0] === t)?.[3] !== 'solid') && Math.random() < 0.5) continue; set(X, Y, t); } } }
      const near = (x, y, t) => { for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (get(x + dx, y + dy) === t) return [x + dx, y + dy]; return null; };
      function step() {
        moved.fill(0); frame++;
        const ltr = frame % 2;
        for (let y = H - 1; y >= 0; y--) for (let k = 0; k < W; k++) {
          const x = ltr ? k : W - 1 - k; const i = y * W + x; const t = grid[i]; if (!t || moved[i] || t === E.WALL) continue;
          const below = i + W, r = Math.random() < 0.5 ? 1 : -1;
          const free = (xx, yy) => get(xx, yy) === E.EMPTY;
          const sinkable = (xx, yy, d) => { const o = get(xx, yy); return o === E.EMPTY || (isLiquid(o) && (DENS[o] || 0) < d) || isGas(o); };
          switch (t) {
            case E.SAND: case E.SALT: case E.STONE: case E.POWDER: case E.SNOW: {
              const d = t === E.STONE ? 20 : t === E.SNOW ? 4 : 10;
              if (t === E.SNOW && Math.random() < 0.5) break;
              if (y < H - 1 && sinkable(x, y + 1, d)) swap(i, below);
              else if (t !== E.STONE && sinkable(x + r, y + 1, d)) swap(i, below + r);
              else if (t !== E.STONE && sinkable(x - r, y + 1, d)) swap(i, below - r);
              if (t === E.SALT) { const w = near(x, y, E.WATER); if (w && Math.random() < 0.02) { set(x, y, E.EMPTY); } }
              if (t === E.SNOW) { if (near(x, y, E.FIRE) || near(x, y, E.LAVA) || Math.random() < 0.0005) set(x, y, E.WATER); }
              if (t === E.POWDER && (near(x, y, E.FIRE) || near(x, y, E.LAVA) || near(x, y, E.EMBER))) explode(x, y, 7);
              break; }
            case E.WATER: case E.OIL: case E.ACID: case E.LAVA: {
              const d = DENS[t]; if (t === E.LAVA && frame % 2) break;
              if (sinkable(x, y + 1, d)) swap(i, below);
              else if (sinkable(x + r, y + 1, d)) swap(i, below + r);
              else if (sinkable(x - r, y + 1, d)) swap(i, below - r);
              else { const spread = t === E.LAVA ? 1 : 3; for (let s = 1; s <= spread; s++) { if (free(x + r * s, y)) { if (s === spread || !free(x + r * (s + 1), y)) { swap(i, i + r * s); break; } } else break; } }
              if (t === E.WATER) { if (near(x, y, E.FIRE)) { const f = near(x, y, E.FIRE); set(f[0], f[1], E.STEAM); } const l = near(x, y, E.LAVA); if (l) { set(l[0], l[1], E.STONE); set(x, y, E.STEAM); } const ic = near(x, y, E.ICE); if (ic && Math.random() < 0.004) set(x, y, E.ICE); const p = near(x, y, E.PLANT); if (p && Math.random() < 0.02) { const [qx, qy] = [x + ((Math.random() * 3) | 0) - 1, y - 1]; if (get(qx, qy) === E.EMPTY) { set(x, y, E.EMPTY); set(qx, qy, E.PLANT); } } }
              if (t === E.LAVA) { for (const [dx, dy] of [[1, 0], [-1, 0], [0, -1], [0, 1]]) { const o = get(x + dx, y + dy); if (flammable(o) && Math.random() < 0.1) set(x + dx, y + dy, E.FIRE); if (o === E.SAND && Math.random() < 0.003) set(x + dx, y + dy, E.GLASS); if (o === E.ICE || o === E.SNOW) set(x + dx, y + dy, E.WATER); } if (Math.random() < 0.002 && get(x, y - 1) === E.EMPTY) set(x, y - 1, E.SMOKE); }
              if (t === E.ACID) { for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) { const o = get(x + dx, y + dy); if (o && o !== E.ACID && o !== E.WALL && o !== E.GLASS && o !== E.CLONE && !isGas(o) && Math.random() < 0.08) { set(x + dx, y + dy, Math.random() < 0.5 ? E.SMOKE : E.EMPTY); if (Math.random() < 0.3) set(x, y, E.EMPTY); break; } } }
              break; }
            case E.FIRE: case E.STEAM: case E.SMOKE: {
              life[i]--; if (life[i] <= 0) { set(x, y, t === E.STEAM && Math.random() < 0.25 ? E.WATER : t === E.FIRE && Math.random() < 0.3 ? E.SMOKE : E.EMPTY); break; }
              if (t === E.FIRE) { for (const [dx, dy] of [[1, 0], [-1, 0], [0, -1], [0, 1], [1, -1], [-1, -1]]) { const o = get(x + dx, y + dy); if (flammable(o) && Math.random() < (o === E.OIL ? 0.35 : o === E.POWDER ? 1 : 0.06)) { if (o === E.POWDER) explode(x + dx, y + dy, 7); else set(x + dx, y + dy, o === E.WOOD && Math.random() < 0.5 ? E.EMBER : E.FIRE); } if (o === E.ICE || o === E.SNOW) set(x + dx, y + dy, E.WATER); } }
              const up = i - W; const rr = r; const nx = x + ((Math.random() * 3) | 0) - 1;
              if (y > 0 && (get(nx, y - 1) === E.EMPTY || (isLiquid(get(nx, y - 1)) && t !== E.FIRE))) swap(i, up + (nx - x));
              else if (free(x + rr, y)) swap(i, i + rr);
              break; }
            case E.EMBER: { life[i]--; if (Math.random() < 0.1) { const a = [[0, -1], [1, -1], [-1, -1]][(Math.random() * 3) | 0]; if (get(x + a[0], y + a[1]) === E.EMPTY) set(x + a[0], y + a[1], E.FIRE); } for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { if (flammable(get(x + dx, y + dy)) && Math.random() < 0.03) set(x + dx, y + dy, E.FIRE); } if (life[i] <= 0) set(x, y, Math.random() < 0.5 ? E.SMOKE : E.EMPTY); else if (free(x, y + 1)) swap(i, below); break; }
            case E.PLANT: { if (Math.random() < 0.0015) { const [dx, dy] = [[0, -1], [1, -1], [-1, -1], [1, 0], [-1, 0]][(Math.random() * 5) | 0]; if (near(x, y, E.WATER) && get(x + dx, y + dy) === E.EMPTY) set(x + dx, y + dy, E.PLANT); } break; }
            case E.ICE: { if (Math.random() < 0.0004) set(x, y, E.WATER); const w = near(x, y, E.WATER); if (w && Math.random() < 0.003) set(w[0], w[1], E.ICE); break; }
            case E.CLONE: { if (!life[i]) { for (const [dx, dy] of [[0, -1], [1, 0], [-1, 0], [0, 1]]) { const o = get(x + dx, y + dy); if (o && o !== E.CLONE && o !== E.WALL) { life[i] = o; break; } } } else if (Math.random() < 0.3) { for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) if (get(x + dx, y + dy) === E.EMPTY) { const v = life[i]; set(x + dx, y + dy, v); break; } } break; }
          }
        }
      }
      function explode(cx, cy, R) { for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const d = dx * dx + dy * dy; if (d > R * R) continue; const o = get(cx + dx, cy + dy); if (o === E.WALL || o === E.CLONE) continue; if (o === E.POWDER && d > 4) { set(cx + dx, cy + dy, E.FIRE); continue; } set(cx + dx, cy + dy, Math.random() < 0.55 ? E.FIRE : Math.random() < 0.5 ? E.SMOKE : E.EMPTY); } }
      function render() {
        const d = img.data; const t0 = frame * 0.15;
        for (let i = 0; i < W * H; i++) { const t = grid[i]; const o = i * 4; if (!t) { d[o] = 11; d[o + 1] = 13; d[o + 2] = 20; d[o + 3] = 255; continue; } let [r, gg, b] = RGB[t]; const s = shade[i] - 20;
          if (t === E.FIRE) { const f = life[i] / 50; r = 255; gg = 80 + f * 170 + Math.random() * 40; b = 20 + Math.random() * 30; }
          else if (t === E.LAVA) { const fl = Math.sin(t0 + (i % W) * 0.2 + ((i / W) | 0) * 0.13) * 30; r = 255; gg = 70 + fl + s; b = 10; }
          else if (t === E.EMBER) { r = 255; gg = 140 + Math.random() * 80; b = 30; }
          else if (t === E.WATER || t === E.ACID) { const w = Math.sin(t0 * 2 + i * 0.37) * 8; r += w; gg += w; b += w; }
          else if (t === E.CLONE && life[i]) { const c = RGB[life[i]]; r = (r + c[0]) / 2; gg = (gg + c[1]) / 2; b = (b + c[2]) / 2; }
          else { r += s; gg += s; b += s; }
          if (t === E.STEAM || t === E.SMOKE) { const a = Math.min(1, life[i] / 100); r = 11 + (r - 11) * a; gg = 13 + (gg - 13) * a; b = 20 + (b - 20) * a; }
          d[o] = r; d[o + 1] = gg; d[o + 2] = b; d[o + 3] = 255; }
        g.putImageData(img, 0, 0);
        if (px >= 0) { g.strokeStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(px + 0.5, py + 0.5, brush + 0.5, 0, 7); g.stroke(); }
      }
      let raf; const counter = h('span.small.muted.mono');
      const loop = () => { raf = requestAnimationFrame(loop); if (painting) line(lastP[0], lastP[1], px, py); if (!paused) for (let s = 0; s < speed; s++) step(); render(); if (frame % 20 === 0) { let n = 0; for (let i = 0; i < W * H; i++) if (grid[i]) n++; counter.textContent = n.toLocaleString() + ' particles'; } };
      let lastP = [0, 0];
      function line(x0, y0, x1, y1) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let k = 0; k <= n; k++) paint(Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n), erasing ? E.EMPTY : cur); lastP = [x1, y1]; }
      const pos = (e) => { const b = cv.getBoundingClientRect(); return [Math.floor((e.clientX - b.left) / b.width * W), Math.floor((e.clientY - b.top) / b.height * H)]; };
      cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); painting = true; erasing = e.button === 2; [px, py] = pos(e); lastP = [px, py]; });
      cv.addEventListener('pointermove', (e) => { [px, py] = pos(e); });
      cv.addEventListener('pointerup', () => (painting = false)); cv.addEventListener('pointerleave', () => { px = -1; });
      cv.addEventListener('contextmenu', (e) => e.preventDefault());
      cv.addEventListener('wheel', (e) => { e.preventDefault(); brush = Math.max(0, Math.min(20, brush + (e.deltaY > 0 ? -1 : 1))); bs.value = brush; }, { passive: false });
      const palette = h('div.row', { style: { flexWrap: 'wrap', gap: '5px', justifyContent: 'center' } });
      const drawPal = () => { palette.innerHTML = ''; INFO.forEach(([id, name, col]) => palette.append(h('button.btn.sm', { class: cur === id ? 'on' : '', style: { gap: '6px' }, on: { click: () => { cur = id; drawPal(); } } }, h('span', { style: { width: '12px', height: '12px', borderRadius: '3px', background: id ? col : 'transparent', border: id ? '1px solid rgba(0,0,0,.3)' : '1px dashed var(--muted)', display: 'inline-block' } }), name))); };
      drawPal();
      const bs = h('input', { type: 'range', min: 0, max: 20, value: brush, on: { input: () => (brush = +bs.value) } });
      const pauseBtn = h('button.btn.sm', { on: { click: () => { paused = !paused; pauseBtn.textContent = paused ? '▶ Play' : '⏸ Pause'; } } }, '⏸ Pause');
      const SCENES = {
        'Volcano': () => { for (let x = 0; x < W; x++) { const hgt = Math.max(0, 90 - Math.abs(x - W / 2) * 0.9); for (let y = H - 1; y > H - hgt; y--) set(x, y, E.STONE); } for (let y = H - 1; y > H - 85; y--) for (let x = W / 2 - 3; x <= W / 2 + 3; x++) set(x, y, E.LAVA); for (let x = W / 2 - 2; x <= W / 2 + 2; x++) { const i = (H - 1) * W + x; grid[i] = E.CLONE; life[i] = E.LAVA; } for (let x = 20; x < 90; x += 9) for (let y = H - 30; y < H - 10; y++) set(x, y, E.WOOD); for (let x = 0; x < 60; x++) for (let y = H - 8; y < H; y++) if (get(x, y) === E.EMPTY) set(x, y, E.WATER); },
        'Hourglass': () => { for (let y = 20; y < H - 20; y++) { const w = Math.abs(y - H / 2) * 0.9 + 4; for (let x = 0; x < W; x++) if (Math.abs(x - W / 2) > w && Math.abs(x - W / 2) < w + 3) set(x, y, E.GLASS); } for (let y = 25; y < 70; y++) for (let x = W / 2 - 60; x < W / 2 + 60; x++) if (get(x, y) === E.EMPTY && Math.abs(x - W / 2) < Math.abs(y - H / 2) * 0.9 + 3) set(x, y, E.SAND); },
        'Oil rig fire': () => { for (let x = 0; x < W; x++) for (let y = H - 50; y < H; y++) set(x, y, y < H - 35 ? E.OIL : E.WATER); for (let x = 120; x < 180; x++) for (let y = H - 70; y < H - 66; y++) set(x, y, E.WOOD); for (let y = H - 66; y < H - 50; y++) { set(125, y, E.WOOD); set(175, y, E.WOOD); } set(150, H - 72, E.FIRE); },
        'Garden': () => { for (let x = 0; x < W; x++) for (let y = H - 20; y < H; y++) set(x, y, E.SAND); for (let x = 30; x < W; x += 40) set(x, H - 21, E.PLANT); for (let x = 0; x < W; x += 2) for (let y = 0; y < 6; y++) if (Math.random() < 0.3) set(x, y, E.WATER); },
        'Demolition': () => { for (let bx = 40; bx < W - 40; bx += 60) for (let y = H - 120; y < H; y++) for (let x = bx; x < bx + 30; x++) set(x, y, (x - bx) % 10 < 2 || y % 15 < 2 ? E.WOOD : E.POWDER); for (let x = 0; x < W; x++) set(x, H - 1, E.WALL); set(45, H - 121, E.FIRE); },
      };
      const sceneSel = h('select.input', { on: { change: () => { if (!sceneSel.value) return; grid.fill(0); life.fill(0); SCENES[sceneSel.value](); sceneSel.value = ''; } } }, h('option', { value: '' }, '🎬 Scenes…'), ...Object.keys(SCENES).map((k) => h('option', k)));
      const wrap = h('div.pad.col', { style: { gap: '10px', maxWidth: '1140px', margin: '0 auto' } }, palette,
        h('div.row', { style: { flexWrap: 'wrap', justifyContent: 'center' } }, h('span.small.muted', 'Brush'), bs, pauseBtn, h('select.input', { on: { change: (e) => (speed = +e.target.value) } }, [1, 2, 3].map((n) => h('option', { value: n }, n + '× speed'))), sceneSel, h('button.btn.sm', { on: { click: () => { grid.fill(0); life.fill(0); } } }, '🧹 Clear'), h('button.btn.sm', { on: { click: () => { const c = document.createElement('canvas'); c.width = W * 4; c.height = H * 4; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(cv, 0, 0, W * 4, H * 4); c.toBlob((b) => MS.download('sand-lab.png', b, 'image/png')); } } }, '📷 PNG'), counter),
        cv, h('div.small.muted', { style: { textAlign: 'center' } }, 'Draw with the mouse or finger · right-click erases · scroll to resize the brush · try lava + water, fire + gunpowder, acid on anything, water near plants & ice'));
      view.append(wrap);
      SCENES.Volcano(); loop();
      return { unmount() { cancelAnimationFrame(raf); } };
    },
  });
})();
