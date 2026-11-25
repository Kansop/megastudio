/* Physics Lab: verlet-integration sandbox — balls, boxes, ropes, cloth, bridges, ragdolls, springs, wind, explosions */
(function () {
  const { h } = MS;
  const TOOLS = [['drag', '✋ Drag'], ['ball', '⚪ Ball'], ['box', '⬜ Box'], ['rope', '🪢 Rope'], ['cloth', '🧣 Cloth'], ['ragdoll', '🕺 Ragdoll'], ['wheel', '🛞 Wheel'], ['pin', '📌 Pin'], ['bomb', '💥 Blast'], ['erase', '🧽 Erase']];
  const PAL = ['#7c5cff', '#ff4fa3', '#3ddc97', '#2fa8ff', '#ffb84f', '#ff5d6c', '#33e0c8', '#c6f26a'];
  MS.register({
    id: 'physics', name: 'Physics Lab', icon: '🧪', group: 'Play', desc: 'Verlet physics sandbox', keywords: 'physics sandbox simulation gravity cloth rope ragdoll verlet science',
    async mount(view) {
      const cv = h('canvas', { style: { width: '100%', height: '100%', display: 'block', touchAction: 'none', cursor: 'crosshair' } });
      const hud = h('div.small.mono', { style: { position: 'absolute', left: '12px', bottom: '10px', color: 'var(--muted)', pointerEvents: 'none' } });
      view.style.position = 'relative'; view.style.overflow = 'hidden'; view.append(cv, hud);
      const g = cv.getContext('2d');
      let W = 800, H = 600, P = [], C = [], tool = 'ball', paused = false, gravity = 900, wind = 0, slow = 1, drag = null, ropeStart = null, iters = 8, colorI = 0, showStress = false, trails = false;
      const col = () => PAL[colorI++ % PAL.length];
      const part = (x, y, r = 6, o = {}) => { const p = { x, y, px: x, py: y, r, pinned: false, color: o.color || '#9097c4', m: o.m || 1, show: o.show !== false, grp: o.grp }; P.push(p); return p; };
      const link = (a, b, o = {}) => { const c = { a, b, len: o.len ?? Math.hypot(a.x - b.x, a.y - b.y), k: o.k ?? 1, show: o.show !== false, color: o.color, w: o.w || 2, tear: o.tear || 0 }; C.push(c); return c; };
      function ball(x, y, r = 10 + Math.random() * 18) { part(x, y, r, { color: col(), m: r * r / 200 }); }
      function box(x, y, s = 40 + Math.random() * 30) { const c = col(), grp = MS.uid(); const ps = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([dx, dy]) => part(x + dx * s / 2, y + dy * s / 2, 5, { color: c, show: false, grp })); for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) link(ps[i], ps[j], { show: false }); ps.box = true; boxes.push({ ps, color: c }); }
      const boxes = [];
      function rope(a, b, n) { const seg = Math.max(4, n || Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 14)); const c = col(); let prev = part(a.x, a.y, 4, { color: c }); prev.pinned = true; for (let i = 1; i <= seg; i++) { const t = i / seg; const p = part(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, 4, { color: c }); link(prev, p, { color: c, w: 3, tear: 4 }); prev = p; } return prev; }
      function cloth(x, y, cols = 22, rows = 14, sp = 14) { const grid = []; const c = col(); for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const p = part(x + i * sp - (cols * sp) / 2, y + j * sp, 2, { color: c, show: false }); if (j === 0 && i % 3 === 0) p.pinned = true; grid.push(p); if (i) link(grid[j * cols + i - 1], p, { color: c, w: 1, tear: 3.2 }); if (j) link(grid[(j - 1) * cols + i], p, { color: c, w: 1, tear: 3.2 }); } }
      function ragdoll(x, y) { const c = col(); const head = part(x, y - 50, 12, { color: c }), neck = part(x, y - 34, 4, { color: c }), hip = part(x, y + 6, 5, { color: c }); const lh = part(x - 26, y - 6, 5, { color: c }), rh = part(x + 26, y - 6, 5, { color: c }), lf = part(x - 12, y + 50, 5, { color: c }), rf = part(x + 12, y + 50, 5, { color: c }); const le = part(x - 14, y - 22, 4, { color: c }), re = part(x + 14, y - 22, 4, { color: c }), lk = part(x - 7, y + 28, 4, { color: c }), rk = part(x + 7, y + 28, 4, { color: c }); [[head, neck], [neck, hip], [neck, le], [le, lh], [neck, re], [re, rh], [hip, lk], [lk, lf], [hip, rk], [rk, rf]].forEach(([a, b]) => link(a, b, { color: c, w: 4 })); link(head, hip, { show: false }); link(le, re, { show: false, k: 0.3 }); link(lk, rk, { show: false, k: 0.1 }); }
      function wheel(x, y, r = 40, n = 12) { const c = col(); const hub = part(x, y, 6, { color: c }); const rim = []; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; rim.push(part(x + Math.cos(a) * r, y + Math.sin(a) * r, 5, { color: c })); } rim.forEach((p, i) => { link(p, rim[(i + 1) % n], { color: c, w: 3 }); link(p, hub, { color: c, w: 1 }); link(p, rim[(i + 2) % n], { show: false }); }); }
      function bridge() { const n = 24, y = H * 0.55, x0 = W * 0.15, x1 = W * 0.85; let prev = null; const c = '#b07a4a'; for (let i = 0; i <= n; i++) { const p = part(x0 + ((x1 - x0) * i) / n, y, 5, { color: c }); if (i === 0 || i === n) p.pinned = true; if (prev) link(prev, p, { color: c, w: 6, tear: 6 }); prev = p; } }
      const presets = {
        'Playground': () => { bridge(); for (let i = 0; i < 6; i++) ball(W * 0.3 + i * 50, 80 + i * 20); box(W * 0.6, 60); ragdoll(W * 0.5, 120); },
        'Cloth': () => { cloth(W / 2, 60, Math.min(36, Math.floor(W / 22)), 20, 16); },
        'Newton cradle': () => { for (let i = 0; i < 5; i++) { const top = part(W / 2 - 80 + i * 40, 120, 3); top.pinned = true; top.show = false; const b = part(W / 2 - 80 + i * 40, 320, 19.5, { color: '#c0c6e0', m: 4 }); link(top, b, { color: '#9097c4', w: 1 }); if (i === 0) { b.x -= 160; b.y -= 120; b.px = b.x; b.py = b.y; } } },
        'Ball pit': () => { for (let i = 0; i < 160; i++) ball(40 + Math.random() * (W - 80), Math.random() * H * 0.6, 8 + Math.random() * 12); },
        'Rope swing': () => { for (let i = 0; i < 5; i++) { const end = rope({ x: W * 0.2 + i * W * 0.15, y: 30 }, { x: W * 0.2 + i * W * 0.15 + 120, y: 200 }); end.r = 16; end.m = 6; end.color = PAL[i]; } },
        'Ragdoll rain': () => { for (let i = 0; i < 8; i++) ragdoll(80 + Math.random() * (W - 160), -i * 120); bridge(); },
        'Tower': () => { for (let j = 0; j < 8; j++) for (let i = 0; i < 3; i++) box(W / 2 - 60 + i * 60, H - 30 - j * 52, 48); },
      };
      function reset(name) { P = []; C = []; boxes.length = 0; (presets[name] || presets.Playground)(); }
      function resize() { const r = view.getBoundingClientRect(); const dpr = devicePixelRatio || 1; W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); }
      function step(dt) {
        const t = Date.now() / 1000;
        for (const p of P) { if (p.pinned || p === drag?.p) { p.px = p.x; p.py = p.y; continue; } const vx = (p.x - p.px) * 0.999, vy = (p.y - p.py) * 0.999; p.px = p.x; p.py = p.y; const wf = wind * (0.6 + 0.4 * Math.sin(t * 2 + p.y * 0.01)); p.x += vx + (wf / p.m) * dt * dt; p.y += vy + gravity * dt * dt; }
        for (let it = 0; it < iters; it++) {
          for (let i = C.length - 1; i >= 0; i--) { const c = C[i]; const dx = c.b.x - c.a.x, dy = c.b.y - c.a.y; const d = Math.hypot(dx, dy) || 1e-6; if (c.tear && d > c.len * c.tear) { C.splice(i, 1); continue; } const diff = ((d - c.len) / d) * c.k; const wa = c.a.pinned ? 0 : c.b.pinned ? 1 : c.b.m / (c.a.m + c.b.m), wb = c.b.pinned ? 0 : c.a.pinned ? 1 : 1 - wa; c.a.x += dx * diff * wa; c.a.y += dy * diff * wa; c.b.x -= dx * diff * wb; c.b.y -= dy * diff * wb; c.stress = Math.abs(d - c.len) / c.len; }
          if (drag) { drag.p.x += (drag.x - drag.p.x) * 0.5; drag.p.y += (drag.y - drag.p.y) * 0.5; }
          // collisions (spatial hash)
          const cell = 48, grid = new Map(); for (let i = 0; i < P.length; i++) { const p = P[i]; if (p.r < 3) continue; const k = ((p.x / cell) | 0) * 7919 + ((p.y / cell) | 0); (grid.get(k) || grid.set(k, []).get(k)).push(i); }
          for (let i = 0; i < P.length; i++) { const a = P[i]; if (a.r < 3) continue; const cx = (a.x / cell) | 0, cy = (a.y / cell) | 0; for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) { const l = grid.get((cx + ox) * 7919 + cy + oy); if (!l) continue; for (const j of l) { if (j <= i) continue; const b = P[j]; if (a.grp && a.grp === b.grp) continue; const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r, d2 = dx * dx + dy * dy; if (d2 < rr * rr && d2 > 1e-9) { const d = Math.sqrt(d2), ov = (rr - d) / d; const wa = a.pinned ? 0 : b.pinned ? 1 : b.m / (a.m + b.m), wb = b.pinned ? 0 : 1 - wa; a.x -= dx * ov * wa; a.y -= dy * ov * wa; b.x += dx * ov * wb; b.y += dy * ov * wb; } } } }
          for (const p of P) { if (p.pinned) continue; if (p.y > H - p.r) { const vx = p.x - p.px; p.y = H - p.r; p.px = p.x - vx * 0.8; } if (p.x < p.r) p.x = p.r; if (p.x > W - p.r) p.x = W - p.r; }
        }
        P = P.filter((p) => p.y < H + 2000);
      }
      function draw() {
        const cs = getComputedStyle(document.documentElement); if (trails) { g.fillStyle = cs.getPropertyValue('--bg') + 'cc'; g.globalAlpha = 0.25; g.fillRect(0, 0, W, H); g.globalAlpha = 1; } else { g.fillStyle = cs.getPropertyValue('--bg'); g.fillRect(0, 0, W, H); }
        g.strokeStyle = cs.getPropertyValue('--line'); g.lineWidth = 1; g.globalAlpha = 0.35; for (let x = 0; x < W; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 0; y < H; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); } g.globalAlpha = 1;
        for (const b of boxes) { if (b.ps.some((p) => !P.includes(p))) continue; g.fillStyle = b.color; g.globalAlpha = 0.85; g.beginPath(); b.ps.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.closePath(); g.fill(); g.globalAlpha = 1; g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2; g.stroke(); }
        g.lineCap = 'round'; for (const c of C) { if (!c.show) continue; g.strokeStyle = showStress ? `hsl(${Math.max(0, 120 - (c.stress || 0) * 2400)},90%,55%)` : c.color || '#9097c4'; g.lineWidth = c.w; g.beginPath(); g.moveTo(c.a.x, c.a.y); g.lineTo(c.b.x, c.b.y); g.stroke(); }
        for (const p of P) { if (!p.show && !p.pinned) continue; g.fillStyle = p.color; g.beginPath(); g.arc(p.x, p.y, p.pinned && !p.show ? 3 : p.r, 0, Math.PI * 2); g.fill(); if (p.r > 8) { g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.arc(p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.35, 0, Math.PI * 2); g.fill(); } if (p.pinned) { g.fillStyle = '#ff5d6c'; g.beginPath(); g.arc(p.x, p.y, 3.5, 0, Math.PI * 2); g.fill(); } }
        if (ropeStart && mouse) { g.setLineDash([6, 6]); g.strokeStyle = 'var(--accent)'; g.strokeStyle = cs.getPropertyValue('--accent'); g.lineWidth = 2; g.beginPath(); g.moveTo(ropeStart.x, ropeStart.y); g.lineTo(mouse.x, mouse.y); g.stroke(); g.setLineDash([]); }
        if (drag) { g.strokeStyle = cs.getPropertyValue('--accent'); g.lineWidth = 1.5; g.beginPath(); g.moveTo(drag.p.x, drag.p.y); g.lineTo(drag.x, drag.y); g.stroke(); }
        hud.textContent = `${P.length} particles · ${C.length} constraints · gravity ${gravity} · ${paused ? 'PAUSED' : slow < 1 ? 'slow-mo' : 'running'}  — tool: ${tool}`;
      }
      let mouse = null, raf = 0, last = performance.now(), acc = 0;
      function loop(now) { raf = requestAnimationFrame(loop); const dt = Math.min(0.05, (now - last) / 1000); last = now; if (!paused) { acc += dt * slow; const h0 = 1 / 120; let n = 0; while (acc >= h0 && n++ < 4) { step(h0); acc -= h0; } if (n >= 4) acc = 0; } draw(); }
      const pos = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
      const nearest = (m, max = 40) => { let best = null, bd = max; for (const p of P) { const d = Math.hypot(p.x - m.x, p.y - m.y) - p.r; if (d < bd) { bd = d; best = p; } } return best; };
      cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); const m = pos(e); mouse = m;
        if (tool === 'drag') { const p = nearest(m); if (p) drag = { p, x: m.x, y: m.y }; }
        else if (tool === 'ball') ball(m.x, m.y); else if (tool === 'box') box(m.x, m.y); else if (tool === 'cloth') cloth(m.x, m.y, 16, 12, 14); else if (tool === 'ragdoll') ragdoll(m.x, m.y); else if (tool === 'wheel') wheel(m.x, m.y);
        else if (tool === 'rope') ropeStart = m; else if (tool === 'pin') { const p = nearest(m, 20); if (p) p.pinned = !p.pinned; else { const q = part(m.x, m.y, 5, { color: '#ff5d6c' }); q.pinned = true; } }
        else if (tool === 'bomb') { for (const p of P) { const dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy) || 1; if (d < 220 && !p.pinned) { const f = (1 - d / 220) * 28; p.px -= (dx / d) * f; p.py -= (dy / d) * f; } } boom = { x: m.x, y: m.y, t: 1 }; }
        else if (tool === 'erase') erase(m); });
      let boom = null;
      function erase(m) { const dead = new Set(P.filter((p) => Math.hypot(p.x - m.x, p.y - m.y) < p.r + 14)); dead.forEach((p) => { if (p.grp) P.filter((q) => q.grp === p.grp).forEach((q) => dead.add(q)); }); P = P.filter((p) => !dead.has(p)); C = C.filter((c) => !dead.has(c.a) && !dead.has(c.b)); for (let i = C.length - 1; i >= 0; i--) { const c = C[i]; const t = ((m.x - c.a.x) * (c.b.x - c.a.x) + (m.y - c.a.y) * (c.b.y - c.a.y)) / ((c.b.x - c.a.x) ** 2 + (c.b.y - c.a.y) ** 2 || 1); const tt = MS.clamp(t, 0, 1); if (Math.hypot(c.a.x + (c.b.x - c.a.x) * tt - m.x, c.a.y + (c.b.y - c.a.y) * tt - m.y) < 8) C.splice(i, 1); } }
      cv.addEventListener('pointermove', (e) => { const m = pos(e); mouse = m; if (drag) { drag.x = m.x; drag.y = m.y; } if (e.buttons && tool === 'erase') erase(m); if (e.buttons && tool === 'ball' && e.shiftKey) ball(m.x, m.y, 8 + Math.random() * 6); });
      cv.addEventListener('pointerup', (e) => { const m = pos(e); if (tool === 'rope' && ropeStart) { if (Math.hypot(m.x - ropeStart.x, m.y - ropeStart.y) > 20) { const end = rope(ropeStart, m); const target = P.find((p) => p !== end && p.r > 6 && Math.hypot(p.x - m.x, p.y - m.y) < p.r + 6); if (target) link(end, target, { show: false, len: 0 }); else { end.r = 12; end.m = 4; } } ropeStart = null; } drag = null; });
      const origDraw = draw; draw = function () { origDraw(); if (boom && boom.t > 0) { g.strokeStyle = `rgba(255,180,80,${boom.t})`; g.lineWidth = 4; g.beginPath(); g.arc(boom.x, boom.y, (1 - boom.t) * 220, 0, Math.PI * 2); g.stroke(); boom.t -= 0.05; } };
      const toolBtns = TOOLS.map(([k, l]) => h('button.btn.sm', { class: k === tool ? 'on' : '', 'data-k': k, on: { click: () => { tool = k; toolBtns.forEach((b) => b.classList.toggle('on', b.dataset.k === k)); } } }, l));
      const pauseBtn = h('button.btn.sm', { on: { click: () => { paused = !paused; pauseBtn.textContent = paused ? '▶ Play' : '⏸ Pause'; } } }, '⏸ Pause');
      const presetSel = h('select.input', { on: { change: () => reset(presetSel.value) } }, Object.keys(presets).map((k) => h('option', k)));
      const panel = h('div.card.float-panel', { style: { position: 'absolute', right: '12px', top: '12px', padding: '12px', width: '210px', display: 'flex', flexDirection: 'column', gap: '8px', background: 'color-mix(in srgb, var(--panel) 92%, transparent)', backdropFilter: 'blur(6px)' } },
        h('strong', 'World'), h('label.small', 'Gravity ', h('input', { type: 'range', min: -600, max: 2000, value: gravity, style: { width: '100%' }, on: { input: (e) => (gravity = +e.target.value) } })), h('label.small', 'Wind ', h('input', { type: 'range', min: -800, max: 800, value: 0, style: { width: '100%' }, on: { input: (e) => (wind = +e.target.value) } })), h('label.small', 'Stiffness (solver iterations) ', h('input', { type: 'range', min: 1, max: 30, value: iters, style: { width: '100%' }, on: { input: (e) => (iters = +e.target.value) } })),
        h('label.row.small', h('input', { type: 'checkbox', on: { change: (e) => (slow = e.target.checked ? 0.25 : 1) } }), 'Slow motion'), h('label.row.small', h('input', { type: 'checkbox', on: { change: (e) => (showStress = e.target.checked) } }), 'Show stress'), h('label.row.small', h('input', { type: 'checkbox', on: { change: (e) => (trails = e.target.checked) } }), 'Motion trails'),
        h('div.small.muted', 'Tip: Shift-drag with Ball to pour. Ropes tear when overstretched; release a rope on a ball to attach.'));
      const hideBtn = h('button.btn.sm', { on: { click: () => { panel.classList.toggle('hidden'); } } }, '⚙ World');
      if (matchMedia('(max-width:560px)').matches) panel.classList.add('hidden');
      view.append(panel, h('div.row', { style: { position: 'absolute', left: '12px', top: '12px', flexWrap: 'wrap', maxWidth: 'calc(100% - 250px)' } }, toolBtns));
      MS.setActions(presetSel, pauseBtn, h('button.btn.sm', { on: { click: () => reset(presetSel.value) } }, '↺ Reset'), h('button.btn.sm', { on: { click: () => { P = []; C = []; boxes.length = 0; } } }, '🗑 Clear'), hideBtn);
      const kd = (e) => { if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return; if (e.key === ' ') { e.preventDefault(); pauseBtn.click(); } const i = '1234567890'.indexOf(e.key); if (i >= 0 && TOOLS[i]) toolBtns[i].click(); };
      document.addEventListener('keydown', kd);
      const ro = new ResizeObserver(resize); ro.observe(view); resize(); reset('Playground'); raf = requestAnimationFrame(loop);
      return { unmount: () => { cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener('keydown', kd); } };
    },
  });
})();
