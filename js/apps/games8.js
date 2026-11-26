/* Arcade 8: Stack Tower (isometric timing stacker), Sky Hopper (endless vertical jumper), Picross (nonogram puzzles) */
(function () {
  const { h } = MS; const { GAMES, report, canvasGame, banner } = MS.arcade;

  /* ================= STACK TOWER ================= */
  GAMES.stack = { name: 'Stack Tower', icon: '🧱', desc: 'Drop sliding slabs onto the tower. Overhangs get sliced off — perfect drops grow it back.', run(host) {
    const W = 480, H = 640;
    return canvasGame(host, W, H, ({ g, cv, info }) => {
      const scoreEl = h('strong'), bestEl = h('span.small.muted'); info.append(h('span', 'Height ', scoreEl), bestEl, h('span.small.muted', 'click / tap / Space to drop'));
      let blocks, cur, dir, speed, score, over, camY, chips, perfect, hue0;
      const TH = 22; // slab thickness
      function reset() { hue0 = Math.random() * 360; blocks = [{ x: 0, z: 0, w: 160, d: 160, y: 0 }]; score = 0; over = false; camY = 0; chips = []; perfect = 0; spawn(); MS.arcade.getScores().then((s) => (bestEl.textContent = 'Best ' + (s.data.best['Stack Tower'] || 0))); }
      function spawn() { const top = blocks[blocks.length - 1]; dir = blocks.length % 2 ? 'x' : 'z'; speed = Math.min(5.2, 2.2 + score * 0.06); cur = { ...top, y: top.y + TH, t: 0 }; cur[dir] = -220; }
      reset();
      const iso = (x, y, z) => [W / 2 + (x - z) * 0.866, H * 0.62 + (x + z) * 0.5 - y + camY];
      const col = (i, l) => `hsl(${(hue0 + i * 9) % 360} 65% ${l}%)`;
      function slab(b, i, alpha = 1) {
        const { x, z, w, d, y } = b; const p = (a, bb, c) => iso(a, bb, c); g.globalAlpha = alpha;
        const top = [p(x - w / 2, y, z - d / 2), p(x + w / 2, y, z - d / 2), p(x + w / 2, y, z + d / 2), p(x - w / 2, y, z + d / 2)];
        const poly = (pts, c) => { g.fillStyle = c; g.beginPath(); pts.forEach(([a, bb], k) => (k ? g.lineTo(a, bb) : g.moveTo(a, bb))); g.closePath(); g.fill(); };
        poly([top[3], top[2], [top[2][0], top[2][1] + TH], [top[3][0], top[3][1] + TH]], col(i, 42));
        poly([top[2], top[1], [top[1][0], top[1][1] + TH], [top[2][0], top[2][1] + TH]], col(i, 32));
        poly(top, col(i, 58)); g.globalAlpha = 1;
      }
      function drop() {
        if (over) return reset();
        const top = blocks[blocks.length - 1]; const k = dir, size = k === 'x' ? 'w' : 'd'; const delta = cur[k] - top[k]; const overlap = top[size] - Math.abs(delta);
        if (overlap <= 0) { over = true; chips.push({ ...cur, vy: 0, i: blocks.length }); report('Stack Tower', score); return; }
        if (Math.abs(delta) < 4) { cur[k] = top[k]; perfect++; if (perfect >= 3) { cur[size] = Math.min(160, cur[size] + 8); } }
        else { perfect = 0; const cut = { ...cur }; cut[size] = Math.abs(delta); cut[k] = top[k] + Math.sign(delta) * (top[size] / 2 + Math.abs(delta) / 2); cut.vy = 0; cut.i = blocks.length; chips.push(cut); cur[size] = overlap; cur[k] = top[k] + delta / 2; }
        blocks.push({ x: cur.x, z: cur.z, w: cur.w, d: cur.d, y: cur.y }); score++; spawn();
      }
      function update(dt) {
        if (!over) { cur.t += dt * speed; cur[dir] = Math.sin(cur.t - Math.PI / 2) * 220; }
        const target = Math.max(0, (blocks.length - 8) * TH); camY += (target - camY) * Math.min(1, dt * 4);
        chips.forEach((c) => { c.vy += 900 * dt; c.y -= c.vy * dt; }); chips = chips.filter((c) => c.y > -800);
      }
      function draw() {
        const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, `hsl(${(hue0 + score * 9) % 360} 50% 22%)`); grd.addColorStop(1, `hsl(${(hue0 + score * 9 + 40) % 360} 45% 10%)`); g.fillStyle = grd; g.fillRect(0, 0, W, H);
        blocks.forEach((b, i) => slab(b, i)); chips.forEach((c) => slab(c, c.i, 0.8)); if (!over) slab(cur, blocks.length);
        g.fillStyle = '#fff'; g.font = 'bold 54px system-ui'; g.textAlign = 'center'; g.fillText(score, W / 2, 90);
        if (perfect >= 2 && !over) { g.font = 'bold 16px system-ui'; g.fillStyle = '#ffe14f'; g.fillText(`PERFECT ×${perfect}`, W / 2, 120); }
        scoreEl.textContent = score;
        if (over) banner(g, W, H, `Tower: ${score}`, 'Tap to build again');
      }
      cv.addEventListener('pointerdown', drop);
      return { update, draw, key(k) { if (k === ' ' || k === 'Enter') drop(); } };
    });
  } };

  /* ================= SKY HOPPER ================= */
  GAMES.hopper = { name: 'Sky Hopper', icon: '🐸', desc: 'Bounce ever upward on platforms — springs, moving & crumbling ledges. Wrap around the screen edges.', run(host) {
    const W = 400, H = 640;
    return canvasGame(host, W, H, ({ g, cv, keys, info }) => {
      const scoreEl = h('strong'); info.append(h('span', 'Height ', scoreEl), h('span.small.muted', '← → or tilt / touch sides'));
      let P, plats, camY, score, over, maxY, tilt = 0, touchX = null, stars;
      function reset() { P = { x: W / 2, y: H - 80, vx: 0, vy: -620 }; plats = [{ x: W / 2 - 35, y: H - 40, w: 70, type: 'n' }]; camY = 0; score = 0; over = false; maxY = H - 80; stars = Array.from({ length: 50 }, () => [Math.random() * W, Math.random() * H, Math.random()]); while (plats.length < 14) addPlat(); }
      function addPlat() { const top = Math.min(...plats.map((p) => p.y)); const diff = Math.min(1, score / 4000); const gap = 50 + Math.random() * (40 + diff * 55); const r = Math.random(); const type = r < 0.1 + diff * 0.15 ? 'm' : r < 0.18 + diff * 0.25 ? 'c' : 'n'; plats.push({ x: Math.random() * (W - 70), y: top - gap, w: 70 - diff * 14, type, spring: type === 'n' && Math.random() < 0.08, vx: type === 'm' ? (Math.random() < 0.5 ? -1 : 1) * (50 + diff * 90) : 0, gone: false }); }
      reset();
      addEventListener('deviceorientation', (e) => { if (e.gamma != null) tilt = Math.max(-1, Math.min(1, e.gamma / 25)); });
      cv.addEventListener('pointerdown', (e) => { if (over) return reset(); const b = cv.getBoundingClientRect(); touchX = (e.clientX - b.left) / b.width < 0.5 ? -1 : 1; });
      addEventListener('pointerup', () => (touchX = null));
      function update(dt) {
        if (over) return;
        const inp = (keys.ArrowLeft || keys.a ? -1 : 0) + (keys.ArrowRight || keys.d ? 1 : 0) || touchX || tilt;
        P.vx += (inp * 900 - P.vx * 4) * dt; P.x += P.vx * dt; if (P.x < -15) P.x += W + 30; if (P.x > W + 15) P.x -= W + 30;
        P.vy += 1250 * dt; const oy = P.y; P.y += P.vy * dt;
        plats.forEach((p) => { if (p.type === 'm') { p.x += p.vx * dt; if (p.x < 0 || p.x + p.w > W) p.vx *= -1; } if (p.gone) p.y += 300 * dt; });
        if (P.vy > 0) for (const p of plats) { if (!p.gone && oy + 14 <= p.y && P.y + 14 >= p.y && P.x > p.x - 10 && P.x < p.x + p.w + 10) { if (p.type === 'c') { p.gone = true; continue; } P.y = p.y - 14; P.vy = p.spring ? -1050 : -620; break; } }
        if (P.y < maxY) { maxY = P.y; score = Math.max(score, Math.round((H - 80 - maxY) / 3)); }
        const target = Math.min(camY, P.y - H * 0.4); camY = target;
        plats = plats.filter((p) => p.y - camY < H + 60); while (plats.length < 14) addPlat();
        if (P.y - camY > H + 40) { over = true; report('Sky Hopper', score); }
      }
      function draw() {
        const grd = g.createLinearGradient(0, 0, 0, H); const t = Math.min(1, score / 5000); grd.addColorStop(0, `rgb(${20 + 60 * (1 - t)},${40 + 120 * (1 - t)},${90 + 140 * (1 - t)})`); grd.addColorStop(1, `rgb(${120 * (1 - t) + 10},${190 * (1 - t) + 20},${255 * (1 - t) + 50})`); g.fillStyle = grd; g.fillRect(0, 0, W, H);
        g.fillStyle = `rgba(255,255,255,${t})`; stars.forEach(([x, y, s]) => { const yy = ((y - camY * 0.2 * s) % H + H) % H; g.fillRect(x, yy, 2, 2); });
        plats.forEach((p) => { const y = p.y - camY; g.fillStyle = p.type === 'm' ? '#4fc3ff' : p.type === 'c' ? '#b08155' : '#5ee27a'; g.globalAlpha = p.gone ? 0.5 : 1; g.beginPath(); g.roundRect(p.x, y, p.w, 12, 6); g.fill(); if (p.type === 'c') { g.strokeStyle = '#6d4c33'; g.beginPath(); g.moveTo(p.x + p.w * 0.3, y); g.lineTo(p.x + p.w * 0.45, y + 12); g.moveTo(p.x + p.w * 0.7, y); g.lineTo(p.x + p.w * 0.55, y + 12); g.stroke(); } if (p.spring) { g.fillStyle = '#ffd34f'; g.fillRect(p.x + p.w / 2 - 8, y - 9, 16, 9); g.strokeStyle = '#a77'; g.strokeRect(p.x + p.w / 2 - 8, y - 9, 16, 9); } g.globalAlpha = 1; });
        const x = P.x, y = P.y - camY; const squash = P.vy < -500 ? 1.15 : 1;
        g.fillStyle = '#3ddc68'; g.beginPath(); g.ellipse(x, y, 16 / squash, 14 * squash, 0, 0, 7); g.fill();
        [-6, 6].forEach((o) => { g.fillStyle = '#fff'; g.beginPath(); g.arc(x + o, y - 10 * squash, 5, 0, 7); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(x + o + Math.sign(P.vx) * 1.5, y - 10 * squash, 2.3, 0, 7); g.fill(); });
        g.strokeStyle = '#155f2a'; g.lineWidth = 2; g.beginPath(); g.arc(x, y - 1, 6, 0.2, Math.PI - 0.2); g.stroke(); g.lineWidth = 1;
        g.fillStyle = '#fff'; g.font = 'bold 22px system-ui'; g.textAlign = 'left'; g.fillText(score, 12, 30);
        scoreEl.textContent = score; if (over) banner(g, W, H, 'You fell!', `Height ${score} · tap or Space`);
      }
      return { update, draw, key(k) { if (over && (k === ' ' || k === 'Enter')) reset(); } };
    });
  } };

  /* ================= PICROSS ================= */
  const PICS = [
    ['Heart', ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000', '0000000']],
    ['Mushroom', ['0011100', '0111110', '1101011', '1111111', '0010100', '0011100', '0011100']],
    ['Cat', ['1000001', '1100011', '1111111', '1010101', '1111111', '0111110', '0011100']],
    ['House', ['0001000', '0011100', '0111110', '1111111', '0100010', '0101010', '0111110']],
    ['Tree', ['0001000', '0011100', '0111110', '0011100', '0111110', '1111111', '0001000']],
    ['Space invader', ['0010100', '0111110', '1101011', '1111111', '1011101', '1000001', '0100010']],
    ['Smiley', ['0011100', '0100010', '1010101', '1000001', '1010101', '0100110', '0011100']],
    ['Anchor', ['0011100', '0001000', '0111110', '0001000', '1001001', '0101010', '0011100']],
    ['Duck', ['00110000', '01111000', '11110000', '00111110', '01111111', '01111110', '00111100', '00000000']],
    ['Rocket', ['00011000', '00111100', '00111100', '00100100', '00111100', '01111110', '11011011', '10000001']],
    ['Key', ['01110000', '10001000', '10001000', '01111111', '00000101', '00000101', '00000000', '00000000']],
    ['Note', ['00011111', '00010001', '00010001', '00010001', '01110011', '11110111', '01100110', '00000000']],
    ['Skull', ['0011111100', '0111111110', '1111111111', '1100110011', '1100110011', '1111111111', '0111001110', '0011111100', '0010101100', '0011111100']],
    ['Umbrella', ['0000110000', '0011111100', '0111111110', '1111111111', '1001001001', '0000100000', '0000100000', '0000100000', '0010100000', '0001000000']],
    ['Robot', ['0001111000', '0001001000', '1111111111', '1010000101', '1011001101', '1010000101', '1001111001', '1111111111', '0011001100', '0111001110']],
  ];
  GAMES.picross = { name: 'Picross', icon: '🖼', desc: 'Nonogram logic puzzles: use the number clues to reveal 15 hidden pictures.', run(host) {
    const wrap = h('div.col', { style: { alignItems: 'center', gap: '10px', padding: '10px' } }); host.append(wrap);
    let idx = 0, grid, mode = 'fill', t0, timer, mistakes, done, down = null;
    MS.arcade.getScores().then((s) => { s.data.picross = s.data.picross || {}; start(Math.max(0, PICS.findIndex((_, i) => !s.data.picross[i]))); });
    const clues = (line) => { const r = []; let n = 0; for (const c of line) { if (c === '1') n++; else if (n) { r.push(n); n = 0; } } if (n) r.push(n); return r.length ? r : [0]; };
    function start(i) { idx = i < 0 ? 0 : i; const sol = PICS[idx][1]; grid = sol.map((r) => [...r].map(() => 0)); mistakes = 0; done = false; t0 = Date.now(); clearInterval(timer); timer = setInterval(() => { if (!done && document.body.contains(wrap)) hud(); }, 1000); render(); }
    const timeEl = h('span.mono'); const mistEl = h('span');
    function hud() { const s = Math.floor((Date.now() - t0) / 1000); timeEl.textContent = `⏱ ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; mistEl.textContent = '❌ ' + mistakes; }
    function setCell(r, c, v) {
      if (done) return; const sol = PICS[idx][1]; if (grid[r][c] === v) return;
      if (v === 1 && sol[r][c] !== '1') { mistakes++; grid[r][c] = 2; MS.toast('Not part of the picture', 'bad'); }
      else grid[r][c] = v;
      // auto-cross completed lines
      const N = sol.length, M = sol[0].length; const rowDone = (rr) => [...sol[rr]].every((x, cc) => (x === '1') === (grid[rr][cc] === 1)); const colDone = (cc) => sol.every((row, rr) => (row[cc] === '1') === (grid[rr][cc] === 1));
      if (rowDone(r)) for (let cc = 0; cc < M; cc++) if (grid[r][cc] === 0) grid[r][cc] = 2; if (colDone(c)) for (let rr = 0; rr < N; rr++) if (grid[rr][c] === 0) grid[rr][c] = 2;
      if (sol.every((row, rr) => [...row].every((x, cc) => (x === '1') === (grid[rr][cc] === 1)))) { done = true; const secs = Math.round((Date.now() - t0) / 1000); MS.arcade.getScores().then((s) => { s.data.picross = s.data.picross || {}; const prev = s.data.picross[idx]; if (!prev || secs < prev) s.data.picross[idx] = secs; s.touch(); report('Picross solved', Object.keys(s.data.picross).length); }); MS.toast(`🎉 ${PICS[idx][0]}! Solved in ${secs}s`, 'good'); }
      render();
    }
    function render() {
      const sol = PICS[idx][1]; const N = sol.length, M = sol[0].length; const cs = `min(${Math.floor(300 / Math.max(N, M))}px, ${(64 / Math.max(N, M)).toFixed(1)}vw)`;
      const colClues = Array.from({ length: M }, (_, c) => clues(sol.map((r) => r[c]).join(''))); const rowClues = sol.map((r) => clues(r));
      const cDone = (c) => sol.every((row, r) => (row[c] === '1') === (grid[r][c] === 1)); const rDone = (r) => [...sol[r]].every((x, c) => (x === '1') === (grid[r][c] === 1));
      const tbl = h('div', { style: { display: 'grid', gridTemplateColumns: `auto repeat(${M}, ${cs})`, gap: '0', userSelect: 'none', touchAction: 'none' } });
      tbl.append(h('div'));
      colClues.forEach((cl, c) => tbl.append(h('div', { style: { display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', fontSize: '12px', fontWeight: 700, paddingBottom: '4px', color: cDone(c) ? 'var(--muted)' : 'var(--text)', opacity: cDone(c) ? 0.5 : 1, background: c % 2 ? 'transparent' : 'var(--panel2)', borderRadius: '6px 6px 0 0' } }, ...cl.map((n) => h('div', String(n))))));
      for (let r = 0; r < N; r++) {
        tbl.append(h('div', { style: { display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center', paddingRight: '6px', fontSize: '12px', fontWeight: 700, opacity: rDone(r) ? 0.45 : 1, background: r % 2 ? 'transparent' : 'var(--panel2)', borderRadius: '6px 0 0 6px' } }, ...rowClues[r].map((n) => h('span', String(n)))));
        for (let c = 0; c < M; c++) {
          const v = grid[r][c]; const fin = done && sol[r][c] === '1';
          const cell = h('div', { style: { width: cs, height: cs, boxSizing: 'border-box', border: '1px solid var(--line)', borderRight: (c + 1) % 5 === 0 && c < M - 1 ? '2px solid var(--muted)' : '1px solid var(--line)', borderBottom: (r + 1) % 5 === 0 && r < N - 1 ? '2px solid var(--muted)' : '1px solid var(--line)', background: v === 1 ? (fin ? `hsl(${(r * 30 + c * 20) % 360} 70% 55%)` : 'var(--text)') : 'var(--panel)', display: 'grid', placeItems: 'center', color: v === 2 ? 'var(--bad)' : 'inherit', fontSize: '14px', cursor: 'pointer', transition: 'background .2s' } }, v === 2 ? '✕' : '');
          const act = (e) => { const want = e.button === 2 || mode === 'cross' ? (grid[r][c] === 2 ? 0 : 2) : grid[r][c] === 1 ? 0 : 1; down = want; setCell(r, c, want); };
          cell.addEventListener('pointerdown', (e) => { e.preventDefault(); act(e); });
          cell.addEventListener('pointerenter', () => { if (down != null && grid[r][c] !== down && !(down === 1 && grid[r][c] === 2)) setCell(r, c, down); });
          cell.addEventListener('contextmenu', (e) => e.preventDefault());
          tbl.append(cell);
        }
      }
      wrap.innerHTML = ''; hud();
      wrap.append(h('div.row', { style: { flexWrap: 'wrap', justifyContent: 'center' } }, h('select.input', { on: { change: (e) => start(+e.target.value) } }, PICS.map(([n, s], i) => h('option', { value: i, selected: i === idx }, `#${i + 1} ${s.length}×${s[0].length}`))), h('button.btn.sm', { class: mode === 'fill' ? 'on' : '', on: { click: () => { mode = 'fill'; render(); } } }, '⬛ Fill'), h('button.btn.sm', { class: mode === 'cross' ? 'on' : '', on: { click: () => { mode = 'cross'; render(); } } }, '✕ Mark'), timeEl, mistEl, h('button.btn.sm', { on: { click: () => start(idx) } }, '↺')),
        tbl, done ? h('div.col', { style: { alignItems: 'center' } }, h('h3', { style: { margin: '6px 0' } }, `🎉 It's a ${PICS[idx][0]}!`), idx < PICS.length - 1 ? h('button.btn.primary', { on: { click: () => start(idx + 1) } }, 'Next puzzle →') : h('div', '🏆 You solved them all!')) : h('div.small.muted', 'Click/drag to fill · right-click or ✕ mode to mark empty · numbers show runs of filled cells in order'));
    }
    const up = () => (down = null); addEventListener('pointerup', up);
    return () => { clearInterval(timer); removeEventListener('pointerup', up); };
  } };

  Object.entries(GAMES).forEach(([k, gm]) => { if (!MS.commands.some((c) => c.id === 'game-' + k)) MS.command({ id: 'game-' + k, title: 'Play ' + gm.name, icon: gm.icon, group: 'Arcade', run: () => MS.go('arcade', k) }); });
  if (MS.appMap.arcade) MS.appMap.arcade.desc = Object.keys(GAMES).length + ' games with high scores';
})();
