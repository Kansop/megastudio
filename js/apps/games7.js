/* Arcade 7: Maze Muncher (pellet maze chase with 4 ghost personalities) and Bubble Shooter */
(function () {
  const { h } = MS; const { GAMES, report, canvasGame, banner } = MS.arcade;

  /* ================= MAZE MUNCHER ================= */
  const MAZE = ['###################', '#........#........#', '#o##.###.#.###.##o#', '#.................#', '#.##.#.#####.#.##.#', '#....#...#...#....#', '####.### # ###.####', '   #.#       #.#   ', '####.# ##-## #.####', '    .  #GGG#  .    ', '####.# ##### #.####', '   #.#       #.#   ', '####.# ##### #.####', '#........#........#', '#.##.###.#.###.##.#', '#o.#.....P.....#.o#', '##.#.#.#####.#.#.##', '#....#...#...#....#', '#.######.#.######.#', '#.................#', '###################'];
  GAMES.muncher = { name: 'Maze Muncher', icon: '🟡', desc: 'Eat every pellet, dodge four ghosts with their own personalities, grab power pellets to turn the tables.', run(host) {
    const COLS = 19, ROWS = MAZE.length, T = 28, W = COLS * T, H = ROWS * T + 34;
    const DIRS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };
    return canvasGame(host, W, H, ({ g, cv, info }) => {
      const scoreEl = h('strong'), livesEl = h('strong'), lvlEl = h('strong'); info.append(h('span', 'Score ', scoreEl), h('span', 'Lives ', livesEl), h('span', 'Level ', lvlEl), h('span.small.muted', 'arrows / WASD / swipe'));
      let grid, pellets, P, ghosts, score = 0, lives = 3, level = 1, fright = 0, eatChain = 0, state = 'ready', stateT = 2, modeT = 0, popups = [], mouth = 0, over = false;
      const wall = (x, y) => { if (y < 0 || y >= ROWS) return true; x = (x + COLS) % COLS; const c = grid[y][x]; return c === '#' || c === '-' || c === 'G'; };
      const GH = [['Blinky', '#ff4b4b', [COLS - 2, 0]], ['Pinky', '#ffa1e6', [1, 0]], ['Inky', '#3ee0ff', [COLS - 2, ROWS - 1]], ['Clyde', '#ffb347', [1, ROWS - 1]]];
      function resetPositions() {
        P = { x: 9, y: 15, dir: [0, 0], next: [-1, 0], t: 0 };
        ghosts = GH.map(([name, col, corner], i) => ({ name, col, corner, x: 8 + (i % 3), y: 9, dir: [0, -1], t: 0, home: true, release: i * 3.5 + (i ? 1 : 0), eaten: false }));
        ghosts[0].home = false; ghosts[0].x = 9; ghosts[0].y = 7; ghosts[0].dir = [-1, 0];
        fright = 0; state = 'ready'; stateT = 1.8;
      }
      function newLevel() { grid = MAZE.map((r) => r.padEnd(COLS).split('')); pellets = 0; grid.forEach((r) => r.forEach((c) => { if (c === '.' || c === 'o') pellets++; })); resetPositions(); }
      function newGame() { score = 0; lives = 3; level = 1; over = false; newLevel(); }
      newGame();
      const speed = (base) => base * (1 + (level - 1) * 0.07);
      function step(e, sp, dt, choose) {
        if (e.dir[0] === 0 && e.dir[1] === 0) { choose(e); return; }
        e.t += sp * dt;
        while (e.t >= 1) { e.t -= 1; e.x = (e.x + e.dir[0] + COLS) % COLS; e.y += e.dir[1]; choose(e); if (e.dir[0] === 0 && e.dir[1] === 0) { e.t = 0; break; } }
      }
      const open = (e, d) => !wall(e.x + d[0], e.y + d[1]);
      function playerChoose(e) {
        if (open(e, e.next)) e.dir = e.next; else if (!open(e, e.dir)) e.dir = [0, 0];
        const c = grid[e.y][e.x];
        if (c === '.' || c === 'o') { grid[e.y][e.x] = ' '; pellets--; score += c === 'o' ? 50 : 10; if (c === 'o') { fright = Math.max(2, 7 - level * 0.6); eatChain = 0; ghosts.forEach((gh) => { if (!gh.home && !gh.eaten) { gh.dir = [-gh.dir[0], -gh.dir[1]]; gh.t = 1 - gh.t; gh.x -= gh.dir[0]; gh.y -= gh.dir[1]; gh.x = (gh.x + COLS) % COLS; } }); } }
      }
      function target(gh) {
        const scatter = modeT % 27 < 7; const pd = P.dir[0] || P.dir[1] ? P.dir : P.next;
        if (scatter) return gh.corner;
        if (gh.name === 'Blinky') return [P.x, P.y];
        if (gh.name === 'Pinky') return [P.x + pd[0] * 4, P.y + pd[1] * 4];
        if (gh.name === 'Inky') { const b = ghosts[0]; const ax = P.x + pd[0] * 2, ay = P.y + pd[1] * 2; return [2 * ax - b.x, 2 * ay - b.y]; }
        return Math.hypot(gh.x - P.x, gh.y - P.y) > 8 ? [P.x, P.y] : gh.corner;
      }
      function ghostChoose(gh) {
        if (gh.eaten && gh.x === 9 && gh.y === 7) { gh.eaten = false; }
        const opts = [[0, -1], [-1, 0], [0, 1], [1, 0]].filter((d) => !(d[0] === -gh.dir[0] && d[1] === -gh.dir[1]) && open(gh, d));
        if (!opts.length) { gh.dir = [-gh.dir[0], -gh.dir[1]]; return; }
        if (fright > 0 && !gh.eaten) { gh.dir = opts[Math.floor(Math.random() * opts.length)]; return; }
        const tg = gh.eaten ? [9, 7] : target(gh);
        opts.sort((a, b) => Math.hypot(gh.x + a[0] - tg[0], gh.y + a[1] - tg[1]) - Math.hypot(gh.x + b[0] - tg[0], gh.y + b[1] - tg[1])); gh.dir = opts[0];
      }
      const pos = (e) => { let x = e.x + e.dir[0] * e.t, y = e.y + e.dir[1] * e.t; return [x, y]; };
      function update(dt) {
        mouth += dt * 12; popups = popups.filter((p) => (p.t -= dt) > 0);
        if (over) return;
        if (state !== 'play') { stateT -= dt; if (stateT <= 0) { if (state === 'dead') { if (lives <= 0) { over = true; report('Maze Muncher', score); return; } resetPositions(); } else if (state === 'clear') { level++; newLevel(); } else state = 'play'; } return; }
        modeT += dt; if (fright > 0) fright -= dt;
        step(P, speed(7.2), dt, playerChoose);
        ghosts.forEach((gh) => {
          if (gh.home) { gh.release -= dt; if (gh.release <= 0) { gh.home = false; gh.x = 9; gh.y = 7; gh.t = 0; gh.dir = [Math.random() < 0.5 ? -1 : 1, 0]; } return; }
          const inTunnel = gh.y === 9 && (gh.x < 4 || gh.x > 14);
          step(gh, gh.eaten ? 14 : fright > 0 ? speed(3.8) : inTunnel ? speed(3.6) : speed(6.6), dt, ghostChoose);
          const [px, py] = pos(P), [gx, gy] = pos(gh); const dx = Math.min(Math.abs(px - gx), COLS - Math.abs(px - gx));
          if (!gh.eaten && dx < 0.6 && Math.abs(py - gy) < 0.6) {
            if (fright > 0) { gh.eaten = true; eatChain++; const pts = 200 * 2 ** (eatChain - 1); score += pts; popups.push({ x: gx, y: gy, s: pts, t: 1 }); }
            else { lives--; state = 'dead'; stateT = 1.6; }
          }
        });
        if (pellets <= 0) { state = 'clear'; stateT = 2; score += 500; }
      }
      function draw() {
        const css = getComputedStyle(cv); g.fillStyle = '#05060f'; g.fillRect(0, 0, W, H);
        const flash = state === 'clear' && Math.floor(stateT * 5) % 2;
        g.strokeStyle = flash ? '#fff' : '#3a5bff'; g.lineWidth = 3; g.lineCap = 'round';
        for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
          const c = grid[y][x], cx = x * T + T / 2, cy = y * T + T / 2;
          if (c === '#') { const isW = (xx, yy) => xx >= 0 && yy >= 0 && xx < COLS && yy < ROWS && grid[yy][xx] === '#'; g.beginPath(); if (isW(x + 1, y)) { g.moveTo(cx, cy); g.lineTo(cx + T / 2, cy); } if (isW(x - 1, y)) { g.moveTo(cx, cy); g.lineTo(cx - T / 2, cy); } if (isW(x, y + 1)) { g.moveTo(cx, cy); g.lineTo(cx, cy + T / 2); } if (isW(x, y - 1)) { g.moveTo(cx, cy); g.lineTo(cx, cy - T / 2); } if (!isW(x + 1, y) && !isW(x - 1, y) && !isW(x, y + 1) && !isW(x, y - 1)) { g.moveTo(cx - 3, cy); g.lineTo(cx + 3, cy); } g.stroke(); }
          else if (c === '-') { g.fillStyle = '#ffa1e6'; g.fillRect(x * T, cy - 2, T, 4); }
          else if (c === '.') { g.fillStyle = '#ffd9b3'; g.fillRect(cx - 2.5, cy - 2.5, 5, 5); }
          else if (c === 'o' && Math.floor(mouth / 3) % 2) { g.fillStyle = '#ffd9b3'; g.beginPath(); g.arc(cx, cy, 7, 0, 7); g.fill(); }
        }
        // player
        const [px, py] = pos(P); const ang = Math.atan2(P.dir[1] || P.next[1], P.dir[0] || P.next[0]);
        let m = state === 'dead' ? Math.min(Math.PI, (1.6 - stateT) * 2.4) : (P.dir[0] || P.dir[1] ? Math.abs(Math.sin(mouth)) * 0.7 : 0.35);
        if (!(state === 'dead' && stateT < 0.3)) { g.fillStyle = '#ffe14f'; g.beginPath(); g.moveTo(px * T + T / 2, py * T + T / 2); g.arc(px * T + T / 2, py * T + T / 2, T * 0.46, ang + m / 1, ang - m / 1 + Math.PI * 2); g.closePath(); g.fill(); }
        // ghosts
        if (state !== 'dead' && state !== 'clear') ghosts.forEach((gh, i) => {
          let [gx, gy] = gh.home ? [8 + (i % 3), 9 + Math.sin(mouth / 3 + i) * 0.15] : pos(gh); const X = gx * T + T / 2, Y = gy * T + T / 2, R = T * 0.45;
          if (!gh.eaten) { const scared = fright > 0; g.fillStyle = scared ? (fright < 2 && Math.floor(fright * 5) % 2 ? '#fff' : '#2233ee') : gh.col; g.beginPath(); g.arc(X, Y - 2, R, Math.PI, 0); g.lineTo(X + R, Y + R); for (let k = 0; k < 4; k++) g.lineTo(X + R - (k + 0.5) * R / 2, Y + R - (k % 2 ? 0 : 5) * (1 + Math.sin(mouth) * 0.2)); g.lineTo(X - R, Y + R); g.closePath(); g.fill(); if (scared) { g.fillStyle = '#ffd9b3'; g.fillRect(X - 6, Y - 4, 3, 3); g.fillRect(X + 3, Y - 4, 3, 3); return; } }
          const d = gh.dir; [-5, 5].forEach((o) => { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(X + o, Y - 3, 4, 5, 0, 0, 7); g.fill(); g.fillStyle = '#1a3bff'; g.beginPath(); g.arc(X + o + d[0] * 2, Y - 3 + d[1] * 2, 2.2, 0, 7); g.fill(); });
        });
        popups.forEach((p) => { g.fillStyle = '#3ee0ff'; g.font = 'bold 14px system-ui'; g.textAlign = 'center'; g.fillText(p.s, p.x * T + T / 2, p.y * T + T / 2 - (1 - p.t) * 12); });
        // footer
        g.fillStyle = '#ffe14f'; for (let i = 0; i < lives; i++) { g.beginPath(); g.moveTo(16 + i * 26, ROWS * T + 17); g.arc(16 + i * 26, ROWS * T + 17, 9, 0.6, Math.PI * 2 - 0.6); g.fill(); }
        g.fillStyle = '#fff'; g.font = 'bold 15px system-ui'; g.textAlign = 'right'; g.fillText('SCORE ' + score, W - 10, ROWS * T + 22); g.textAlign = 'center';
        if (state === 'ready') { g.fillStyle = '#ffe14f'; g.font = 'bold 20px system-ui'; g.fillText('READY!', W / 2, 11 * T + T * 0.75); }
        scoreEl.textContent = score; livesEl.textContent = lives; lvlEl.textContent = level;
        if (over) banner(g, W, H, 'Game over', `Score ${score} · tap or press Space`);
      }
      let sx = 0, sy = 0;
      cv.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; if (over) newGame(); });
      cv.addEventListener('pointerup', (e) => { const dx = e.clientX - sx, dy = e.clientY - sy; if (Math.hypot(dx, dy) < 18) return; P.next = Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]; tryReverse(); });
      function tryReverse() { if (P.dir[0] === -P.next[0] && P.dir[1] === -P.next[1] && (P.dir[0] || P.dir[1])) { P.x = (P.x + P.dir[0] + COLS) % COLS; P.y += P.dir[1]; P.dir = P.next; P.t = 1 - P.t; } }
      return { update, draw, key(k) { if (over && (k === ' ' || k === 'Enter')) return newGame(); const d = DIRS[k] || DIRS[k.toLowerCase?.()]; if (d) { P.next = d; tryReverse(); } } };
    });
  } };

  /* ================= BUBBLE SHOOTER ================= */
  GAMES.bubbles = { name: 'Bubble Shooter', icon: '🫧', desc: 'Aim, bank off the walls and pop groups of three. Drop whole clusters for big points.', run(host) {
    const R = 18, COLS = 13, W = COLS * R * 2 + R, ROWH = R * Math.sqrt(3), MAXR = 15, H = Math.round(MAXR * ROWH + R * 6);
    const COLORS = ['#ff5d6c', '#ffb84f', '#ffe14f', '#3ddc97', '#2fa8ff', '#b07cff'];
    return canvasGame(host, W, H, ({ g, cv, info }) => {
      const scoreEl = h('strong'), lvlEl = h('strong'), shotsEl = h('strong'); info.append(h('span', 'Score ', scoreEl), h('span', 'Level ', lvlEl), h('span', 'New row in ', shotsEl), h('span.small.muted', 'aim with mouse/touch, click to fire · Space swaps'));
      let grid, parity, shot, cur, nxt, aim = -Math.PI / 2, score, level, shotsLeft, falling, pops, over, won, nColors;
      const odd = (r) => (r + parity) % 2 === 1; const cols = (r) => (odd(r) ? COLS - 1 : COLS);
      const cx = (r, c) => R + c * 2 * R + (odd(r) ? R : 0), cy = (r) => R + r * ROWH;
      const SX = W / 2, SY = H - R * 2.2, LINE = MAXR * ROWH - R * 0.2;
      function colorsLeft() { const s = new Set(); grid.forEach((row) => row.forEach((b) => b != null && s.add(b))); return [...s]; }
      function pick() { const cl = colorsLeft(); return cl.length ? cl[Math.floor(Math.random() * cl.length)] : Math.floor(Math.random() * nColors); }
      function addRow() { parity ^= 1; const row = []; for (let c = 0; c < (parity % 2 === 1 ? COLS - 1 : COLS); c++) row.push(Math.floor(Math.random() * nColors)); grid.unshift(row); grid.forEach((rw, r) => { while (rw.length > cols(r)) rw.pop(); while (rw.length < cols(r)) rw.push(null); }); checkLose(); }
      function start(l = 1) { level = l; if (l === 1) score = 0; nColors = Math.min(6, 3 + l); parity = 0; grid = []; for (let r = 0; r < 4 + Math.min(4, l); r++) { const row = []; for (let c = 0; c < cols(r); c++) row.push(Math.floor(Math.random() * nColors)); grid.push(row); } shot = null; cur = pick(); nxt = pick(); shotsLeft = Math.max(4, 8 - l); falling = []; pops = []; over = won = false; }
      start();
      const nbrs = (r, c) => { const o = odd(r); return [[r, c - 1], [r, c + 1], [r - 1, o ? c : c - 1], [r - 1, o ? c + 1 : c], [r + 1, o ? c : c - 1], [r + 1, o ? c + 1 : c]].filter(([rr, cc]) => rr >= 0 && cc >= 0 && cc < cols(rr)); };
      const get = (r, c) => (grid[r] ? grid[r][c] : null);
      function checkLose() { grid.forEach((row, r) => row.forEach((b) => { if (b != null && cy(r) + R > LINE) over = true; })); if (over) report('Bubble Shooter', score); }
      function land(x, y, col) {
        let best = null, bd = 1e9;
        for (let r = 0; r <= Math.min(MAXR, grid.length); r++) for (let c = 0; c < cols(r); c++) { if (get(r, c) != null) continue; if (r > 0 && !nbrs(r, c).some(([a, b]) => get(a, b) != null)) continue; const d = Math.hypot(cx(r, c) - x, cy(r) - y); if (d < bd) { bd = d; best = [r, c]; } }
        if (!best) return;
        const [r, c] = best; while (grid.length <= r) grid.push(Array(cols(grid.length)).fill(null)); grid[r][c] = col;
        const grp = [[r, c]], seen = new Set([r + ',' + c]); for (let i = 0; i < grp.length; i++) for (const [a, b] of nbrs(...grp[i])) if (!seen.has(a + ',' + b) && get(a, b) === col) { seen.add(a + ',' + b); grp.push([a, b]); }
        if (grp.length >= 3) {
          grp.forEach(([a, b]) => { pops.push({ x: cx(a, b), y: cy(a), col, t: 0.3 }); grid[a][b] = null; }); score += grp.length * 10;
          const conn = new Set(); const q = []; (grid[0] || []).forEach((b, c2) => { if (b != null) { conn.add('0,' + c2); q.push([0, c2]); } });
          while (q.length) { const [a, b] = q.pop(); for (const [a2, b2] of nbrs(a, b)) if (get(a2, b2) != null && !conn.has(a2 + ',' + b2)) { conn.add(a2 + ',' + b2); q.push([a2, b2]); } }
          let dropped = 0; grid.forEach((row, a) => row.forEach((b, c2) => { if (b != null && !conn.has(a + ',' + c2)) { falling.push({ x: cx(a, c2), y: cy(a), vy: -60 - Math.random() * 80, vx: (Math.random() - 0.5) * 120, col: b }); grid[a][c2] = null; dropped++; } }));
          if (dropped) score += dropped * 20 * Math.min(dropped, 10);
        } else if (--shotsLeft <= 0) { addRow(); shotsLeft = Math.max(4, 8 - level); }
        while (grid.length && grid[grid.length - 1].every((b) => b == null)) grid.pop();
        if (!grid.length) { won = true; score += 1000 * level; report('Bubble Shooter', score); return; }
        checkLose(); cur = nxt; if (!colorsLeft().includes(cur)) cur = pick(); nxt = pick();
      }
      function fire() { if (shot || over || won) return; shot = { x: SX, y: SY, vx: Math.cos(aim) * 900, vy: Math.sin(aim) * 900, col: cur }; }
      function update(dt) {
        pops = pops.filter((p) => (p.t -= dt) > 0); falling.forEach((f) => { f.vy += 1400 * dt; f.x += f.vx * dt; f.y += f.vy * dt; }); falling = falling.filter((f) => f.y < H + R);
        if (!shot) return;
        for (let s = 0; s < 4 && shot; s++) {
          shot.x += shot.vx * dt / 4; shot.y += shot.vy * dt / 4;
          if (shot.x < R) { shot.x = R; shot.vx *= -1; } if (shot.x > W - R) { shot.x = W - R; shot.vx *= -1; }
          let hit = shot.y < R; if (!hit) for (let r = 0; r < grid.length && !hit; r++) for (let c = 0; c < grid[r].length; c++) if (grid[r][c] != null && Math.hypot(cx(r, c) - shot.x, cy(r) - shot.y) < R * 1.7) { hit = true; break; }
          if (hit) { const s2 = shot; shot = null; land(s2.x, s2.y, s2.col); }
        }
      }
      const ball = (x, y, col, r = R - 1) => { const gr = g.createRadialGradient(x - r / 3, y - r / 3, r / 6, x, y, r); gr.addColorStop(0, '#fff'); gr.addColorStop(0.25, COLORS[col]); gr.addColorStop(1, shade(COLORS[col])); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
      const shade = (hex) => '#' + [1, 3, 5].map((i) => Math.floor(parseInt(hex.slice(i, i + 2), 16) * 0.55).toString(16).padStart(2, '0')).join('');
      function draw() {
        const css = getComputedStyle(cv); g.fillStyle = '#121428'; g.fillRect(0, 0, W, H);
        g.strokeStyle = 'rgba(255,93,108,.5)'; g.setLineDash([8, 6]); g.beginPath(); g.moveTo(0, LINE); g.lineTo(W, LINE); g.stroke(); g.setLineDash([]);
        grid.forEach((row, r) => row.forEach((b, c) => b != null && ball(cx(r, c), cy(r), b)));
        pops.forEach((p) => { g.globalAlpha = p.t / 0.3; ball(p.x, p.y, p.col, R * (1.6 - p.t * 2)); g.globalAlpha = 1; });
        falling.forEach((f) => ball(f.x, f.y, f.col));
        // aim guide with one bounce preview
        if (!over && !won) { g.strokeStyle = 'rgba(255,255,255,.35)'; g.setLineDash([2, 8]); g.lineWidth = 3; g.beginPath(); let x = SX, y = SY, vx = Math.cos(aim), vy = Math.sin(aim); g.moveTo(x, y); for (let i = 0; i < 90; i++) { x += vx * 8; y += vy * 8; if (x < R || x > W - R) { vx = -vx; } if (y < R) break; let hit = false; for (let r = 0; r < grid.length && !hit; r++) for (let c = 0; c < grid[r].length; c++) if (grid[r][c] != null && Math.hypot(cx(r, c) - x, cy(r) - y) < R * 1.7) { hit = true; break; } g.lineTo(x, y); if (hit) break; } g.stroke(); g.setLineDash([]); g.lineWidth = 1; }
        if (shot) ball(shot.x, shot.y, shot.col); else ball(SX, SY, cur);
        ball(SX - 70, SY + 10, nxt, R * 0.7); g.fillStyle = '#aab'; g.font = '12px system-ui'; g.textAlign = 'center'; g.fillText('next', SX - 70, SY + 36);
        g.fillStyle = '#fff'; g.font = 'bold 15px system-ui'; g.textAlign = 'right'; g.fillText('' + score, W - 12, H - 14);
        scoreEl.textContent = score; lvlEl.textContent = level; shotsEl.textContent = shotsLeft;
        if (over) banner(g, W, H, 'Game over', `Score ${score} · click to retry`);
        if (won) banner(g, W, H, `Level ${level} cleared! 🎉`, 'Click for the next level');
      }
      const toLocal = (e) => { const b = cv.getBoundingClientRect(); return [(e.clientX - b.left) * W / b.width, (e.clientY - b.top) * H / b.height]; };
      const setAim = (e) => { const [x, y] = toLocal(e); aim = Math.max(-Math.PI + 0.12, Math.min(-0.12, Math.atan2(y - SY, x - SX))); };
      cv.addEventListener('pointermove', setAim);
      cv.addEventListener('pointerup', (e) => { if (over) return start(1); if (won) return start(level + 1); setAim(e); fire(); });
      return { update, draw, key(k) { if (k === ' ') { if (!shot) [cur, nxt] = [nxt, cur]; } else if (k === 'ArrowLeft') aim = Math.max(-Math.PI + 0.12, aim - 0.05); else if (k === 'ArrowRight') aim = Math.min(-0.12, aim + 0.05); else if (k === 'ArrowUp' || k === 'Enter') { if (over) start(1); else if (won) start(level + 1); else fire(); } } };
    });
  } };

  Object.entries(GAMES).forEach(([k, gm]) => { if (!MS.commands.some((c) => c.id === 'game-' + k)) MS.command({ id: 'game-' + k, title: 'Play ' + gm.name, icon: gm.icon, group: 'Arcade', run: () => MS.go('arcade', k) }); });
  if (MS.appMap.arcade) MS.appMap.arcade.desc = Object.keys(GAMES).length + ' games with high scores';
})();
