/* Arcade 6: Gem Swap (match-3 with specials & levels), Mini Golf (9 holes), Battleship (hunt/target AI) */
(function () {
  const { h } = MS; const { GAMES, report, canvasGame, banner } = MS.arcade;

  /* ================= GEM SWAP ================= */
  GAMES.gems = { name: 'Gem Swap', icon: '💎', desc: 'Match-3 with cascades, line blasters & color bombs.', run(host) {
    const N = 8, CS = 64, W = N * CS, H = N * CS + 60;
    const COLORS = ['#ff5d6c', '#ffb84f', '#ffe14f', '#3ddc97', '#2fa8ff', '#b07cff'];
    return canvasGame(host, W, H, ({ g, cv, info }) => {
      const scoreEl = h('strong'), movesEl = h('strong'), lvlEl = h('strong'); info.append(h('span', 'Level ', lvlEl), h('span', '⭐ ', scoreEl), h('span', 'Moves ', movesEl), h('span.small.muted', 'swap gems: click two, or drag'));
      let B, score, moves, level, target, sel = null, anim = [], busy = false, over = false, idle = 0, hint = null, combo = 0, pops = [], won = false;
      const rnd = () => Math.floor(Math.random() * COLORS.length);
      const mk = (c, r) => ({ c: rnd(), x: c, y: r, dy: r, sp: null, scale: 1 });
      function newBoard() { B = []; for (let r = 0; r < N; r++) { B[r] = []; for (let c = 0; c < N; c++) { let gm; do { gm = mk(c, r); } while ((c > 1 && B[r][c - 1].c === gm.c && B[r][c - 2].c === gm.c) || (r > 1 && B[r - 1][c].c === gm.c && B[r - 2][c].c === gm.c)); gm.dy = r - N - 2; B[r][c] = gm; } } if (!findMove()) newBoard(); }
      function start(l = 1) { level = l; score = l === 1 ? 0 : score; moves = 22 + Math.min(10, l * 2); target = (score || 0) + 1500 + l * 900; over = false; won = false; newBoard(); hud(); }
      const hud = () => { scoreEl.textContent = score + ' / ' + target; movesEl.textContent = moves; lvlEl.textContent = level; };
      function matches() { const out = []; for (let r = 0; r < N; r++) for (let c = 0; c < N; ) { const k = B[r][c].c; let e = c; while (e + 1 < N && B[r][e + 1].c === k && k >= 0) e++; if (e - c >= 2 && k >= 0) out.push({ cells: Array.from({ length: e - c + 1 }, (_, i) => [r, c + i]), dir: 'h' }); c = e + 1; }
        for (let c = 0; c < N; c++) for (let r = 0; r < N; ) { const k = B[r][c].c; let e = r; while (e + 1 < N && B[e + 1][c].c === k && k >= 0) e++; if (e - r >= 2 && k >= 0) out.push({ cells: Array.from({ length: e - r + 1 }, (_, i) => [r + i, c]), dir: 'v' }); r = e + 1; } return out; }
      function swap(a, b) { const t = B[a[0]][a[1]]; B[a[0]][a[1]] = B[b[0]][b[1]]; B[b[0]][b[1]] = t; }
      function findMove() { for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) for (const [dr, dc] of [[0, 1], [1, 0]]) { const r2 = r + dr, c2 = c + dc; if (r2 >= N || c2 >= N) continue; if (B[r][c].sp === 'bomb' || B[r2][c2].sp === 'bomb') return [[r, c], [r2, c2]]; swap([r, c], [r2, c2]); const m = matches().length; swap([r, c], [r2, c2]); if (m) return [[r, c], [r2, c2]]; } return null; }
      const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
      async function tryMove(a, b) {
        if (busy || over) return; busy = true; hint = null; idle = 0; swap(a, b); await animSwap(a, b);
        const A = B[a[0]][a[1]], Bb = B[b[0]][b[1]];
        if (A.sp === 'bomb' || Bb.sp === 'bomb') { const bomb = A.sp === 'bomb' ? A : Bb, other = bomb === A ? Bb : A; const kill = new Set(); for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (B[r][c].c === other.c || B[r][c] === bomb) kill.add(r + ',' + c); moves--; await resolve(kill); }
        else if (!matches().length) { swap(a, b); await animSwap(a, b); busy = false; return; }
        else { moves--; combo = 0; await cascade(b); }
        hud(); busy = false; endCheck();
      }
      function endCheck() { if (score >= target) { won = true; over = true; report('Gem Swap', score); setTimeout(() => { if (won) start(level + 1); }, 2200); } else if (moves <= 0) { over = true; report('Gem Swap', score); } else if (!findMove()) { pops.push({ text: 'No moves — shuffling', x: W / 2, y: H / 2, t: 1.4 }); newBoard(); } }
      async function animSwap(a, b) { const ga = B[a[0]][a[1]], gb = B[b[0]][b[1]]; const fa = { x: gb.x, y: gb.y }, fb = { x: ga.x, y: ga.y }; const t0 = performance.now(); while (true) { const t = Math.min(1, (performance.now() - t0) / 140); ga.x = fb.x + (a[1] - fb.x) * t; ga.y = ga.dy = fb.y + (a[0] - fb.y) * t; gb.x = fa.x + (b[1] - fa.x) * t; gb.y = gb.dy = fa.y + (b[0] - fa.y) * t; if (t >= 1) break; await sleep(16); } ga.x = a[1]; ga.y = ga.dy = a[0]; gb.x = b[1]; gb.y = gb.dy = b[0]; }
      async function cascade(focus) {
        for (;;) {
          const ms = matches(); if (!ms.length) break; combo++;
          const kill = new Set(); let spawnSp = [];
          ms.forEach((m) => { m.cells.forEach(([r, c]) => kill.add(r + ',' + c)); if (m.cells.length >= 4) { const at = m.cells.find(([r, c]) => focus && r === focus[0] && c === focus[1]) || m.cells[Math.floor(m.cells.length / 2)]; spawnSp.push({ at, sp: m.cells.length >= 5 ? 'bomb' : m.dir === 'h' ? 'row' : 'col', c: B[at[0]][at[1]].c }); } });
          // L/T shapes → bomb-lite (area)
          await resolve(kill, spawnSp); focus = null;
        }
      }
      async function resolve(kill, spawnSp = []) {
        // expand specials
        let grew = true; while (grew) { grew = false; for (const k of [...kill]) { const [r, c] = k.split(',').map(Number); const gm = B[r][c]; if (gm.sp === 'row' || gm.sp === 'col') { gm.sp2 = gm.sp; gm.sp = null; for (let i = 0; i < N; i++) { const kk = gm.sp2 === 'row' ? r + ',' + i : i + ',' + c; if (!kill.has(kk)) { kill.add(kk); grew = true; } } pops.push({ beam: gm.sp2, r, c, t: 0.35 }); } } }
        const pts = kill.size * 20 * combo || kill.size * 20; score += pts; if (combo > 1) pops.push({ text: `Combo x${combo}!`, x: W / 2, y: 40, t: 1 });
        kill.forEach((k) => { const [r, c] = k.split(',').map(Number); pops.push({ burst: true, x: c * CS + CS / 2, y: r * CS + CS / 2, col: COLORS[B[r][c].c] || '#fff', t: 0.45 }); B[r][c].dead = true; });
        const t0 = performance.now(); while (performance.now() - t0 < 160) { kill.forEach((k) => { const [r, c] = k.split(',').map(Number); B[r][c].scale = 1 - (performance.now() - t0) / 160; }); await sleep(16); }
        spawnSp.forEach((s) => { const [r, c] = s.at; B[r][c] = { c: s.sp === 'bomb' ? -1 : s.c, x: c, y: r, dy: r, sp: s.sp, scale: 1 }; });
        // gravity
        for (let c = 0; c < N; c++) { const col = []; for (let r = N - 1; r >= 0; r--) if (!B[r][c].dead) col.push(B[r][c]); let r = N - 1; for (const gm of col) { gm.y = r; B[r][c] = gm; r--; } let k = 1; while (r >= 0) { const gm = mk(c, r); gm.dy = -k++; B[r][c] = gm; r--; } }
        await settle(); hud();
      }
      async function settle() { for (;;) { let moving = false; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const gm = B[r][c]; gm.x = c; if (gm.dy < r) { gm.dy = Math.min(r, gm.dy + 0.35); moving = true; } else gm.dy = r; } if (!moving) break; await sleep(16); } }
      const cellAt = (e) => { const b = cv.getBoundingClientRect(); const x = ((e.clientX - b.left) / b.width) * W, y = ((e.clientY - b.top) / b.height) * H - 60; const c = Math.floor(x / CS), r = Math.floor(y / CS); return r >= 0 && r < N && c >= 0 && c < N ? [r, c] : null; };
      let down = null;
      cv.addEventListener('pointerdown', (e) => { if (over && !won) { start(1); return; } const p = cellAt(e); if (!p) return; down = { p, x: e.clientX, y: e.clientY }; });
      cv.addEventListener('pointermove', (e) => { if (!down) return; const dx = e.clientX - down.x, dy = e.clientY - down.y; if (Math.hypot(dx, dy) > 22) { const [r, c] = down.p; const t = Math.abs(dx) > Math.abs(dy) ? [r, c + Math.sign(dx)] : [r + Math.sign(dy), c]; down = null; sel = null; if (t[0] >= 0 && t[0] < N && t[1] >= 0 && t[1] < N) tryMove([r, c], t); } });
      cv.addEventListener('pointerup', () => { if (!down) return; const p = down.p; down = null; if (sel && Math.abs(sel[0] - p[0]) + Math.abs(sel[1] - p[1]) === 1) { const a = sel; sel = null; tryMove(a, p); } else sel = sel && sel[0] === p[0] && sel[1] === p[1] ? null : p; });
      function gem(x, y, k, s, sp, glow) {
        const r = CS * 0.36 * s; g.save(); g.translate(x, y);
        if (sp === 'bomb') { const gr = g.createRadialGradient(0, 0, 2, 0, 0, r); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#333'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); COLORS.forEach((cc, i) => { g.fillStyle = cc; g.beginPath(); g.arc(Math.cos(i + performance.now() / 500) * r * 0.6, Math.sin(i + performance.now() / 500) * r * 0.6, 4, 0, 7); g.fill(); }); g.restore(); return; }
        const col = COLORS[k]; g.fillStyle = col; g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2; g.beginPath();
        if (k === 0) { for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } }
        else if (k === 1) { for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 3; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } }
        else if (k === 2) { for (let i = 0; i < 10; i++) { const a = (i * Math.PI) / 5 - Math.PI / 2, rr = i % 2 ? r * 0.5 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } }
        else if (k === 3) g.arc(0, 0, r * 0.9, 0, 7);
        else if (k === 4) { g.moveTo(0, -r); g.lineTo(r * 0.85, r * 0.7); g.lineTo(-r * 0.85, r * 0.7); }
        else { g.rect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6); }
        g.closePath(); g.fill(); g.stroke(); g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(-r * 0.25, -r * 0.3, r * 0.28, r * 0.16, -0.6, 0, 7); g.fill();
        if (sp === 'row' || sp === 'col') { g.strokeStyle = '#fff'; g.lineWidth = 3; for (let i = -1; i <= 1; i++) { g.beginPath(); if (sp === 'row') { g.moveTo(-r * 0.7, i * 7); g.lineTo(r * 0.7, i * 7); } else { g.moveTo(i * 7, -r * 0.7); g.lineTo(i * 7, r * 0.7); } g.stroke(); } }
        if (glow) { g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, r + 6, 0, 7); g.stroke(); }
        g.restore();
      }
      return {
        update(dt) { if (B && !busy) for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const gm = B[r][c]; if (gm.dy < r) gm.dy = Math.min(r, gm.dy + dt * 14); } idle += dt; if (idle > 6 && !hint && !busy && !over) hint = findMove(); pops.forEach((p) => (p.t -= dt)); pops = pops.filter((p) => p.t > 0); },
        draw() {
          if (!B) start(1);
          g.fillStyle = '#141833'; g.fillRect(0, 0, W, H); g.fillStyle = '#fff'; g.font = 'bold 18px system-ui'; g.textAlign = 'left'; g.fillText(`Level ${level}`, 14, 26); g.textAlign = 'right'; g.fillText(`${moves} moves`, W - 14, 26);
          const pct = Math.min(1, score / target); g.fillStyle = '#2a3060'; g.fillRect(14, 38, W - 28, 10); g.fillStyle = '#3ddc97'; g.fillRect(14, 38, (W - 28) * pct, 10);
          g.save(); g.translate(0, 60);
          for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { g.fillStyle = (r + c) % 2 ? '#1c2145' : '#20264f'; g.fillRect(c * CS, r * CS, CS, CS); }
          const wob = Math.sin(performance.now() / 150) * 0.06;
          for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const gm = B[r][c]; if (gm.dy < -0.5) continue; const isSel = sel && sel[0] === r && sel[1] === c; const isHint = hint && ((hint[0][0] === r && hint[0][1] === c) || (hint[1][0] === r && hint[1][1] === c)); gem(gm.x * CS + CS / 2, gm.dy * CS + CS / 2, gm.c, gm.scale * (isSel || isHint ? 1.08 + wob : 1), gm.sp, isSel); }
          for (const p of pops) { if (p.burst) { g.globalAlpha = p.t * 2; g.strokeStyle = p.col; g.lineWidth = 3; g.beginPath(); g.arc(p.x, p.y, (0.45 - p.t) * 90, 0, 7); g.stroke(); g.globalAlpha = 1; } if (p.beam) { g.globalAlpha = p.t * 2.5; g.fillStyle = '#fff'; if (p.beam === 'row') g.fillRect(0, p.r * CS + CS / 2 - 6, W, 12); else g.fillRect(p.c * CS + CS / 2 - 6, 0, 12, N * CS); g.globalAlpha = 1; } }
          g.restore();
          for (const p of pops) if (p.text) { g.globalAlpha = Math.min(1, p.t * 2); g.fillStyle = '#ffe14f'; g.font = 'bold 28px system-ui'; g.textAlign = 'center'; g.fillText(p.text, p.x, p.y + 60); g.globalAlpha = 1; }
          g.textAlign = 'left';
          if (over) banner(g, W, H, won ? `Level ${level} complete! 🎉` : 'Out of moves', won ? 'Next level loading…' : `Score ${score} · tap to play again`);
        },
        key: (k) => { if ((k === ' ' || k === 'Enter') && over && !won) start(1); },
      };
    });
  } };

  /* ================= MINI GOLF ================= */
  const HOLES = [
    { par: 2, ball: [120, 300], cup: [700, 300], walls: [], sand: [], water: [] },
    { par: 3, ball: [100, 480], cup: [700, 120], walls: [[[300, 0], [300, 380]], [[520, 220], [520, 600]]], sand: [], water: [] },
    { par: 3, ball: [100, 300], cup: [700, 300], walls: [], sand: [[330, 200, 140, 200]], water: [], bumpers: [[400, 150, 30], [400, 450, 30]] },
    { par: 3, ball: [90, 520], cup: [710, 80], walls: [[[200, 600], [200, 200]], [[200, 200], [600, 200]], [[400, 400], [800, 400]]], sand: [], water: [[230, 230, 150, 140]] },
    { par: 4, ball: [400, 540], cup: [400, 70], walls: [], sand: [], water: [[250, 250, 300, 90]], bumpers: [[300, 180, 22], [500, 180, 22], [400, 400, 30]], windmill: [400, 160, 120] },
    { par: 3, ball: [100, 100], cup: [700, 500], walls: [[[0, 200], [550, 200]], [[250, 400], [800, 400]]], sand: [[580, 220, 200, 160]], water: [] },
    { par: 4, ball: [80, 300], cup: [720, 300], walls: [[[240, 0], [240, 250]], [[240, 350], [240, 600]], [[560, 0], [560, 250]], [[560, 350], [560, 600]]], sand: [[300, 120, 200, 360]], water: [], bumpers: [[400, 300, 26]] },
    { par: 3, ball: [120, 500], cup: [680, 100], walls: [[[400, 100], [400, 500]]], sand: [], water: [[0, 0, 300, 120], [500, 480, 300, 120]], windmill: [400, 300, 150] },
    { par: 5, ball: [60, 540], cup: [400, 300], walls: [[[150, 150], [650, 150]], [[650, 150], [650, 450]], [[650, 450], [150, 450]], [[150, 450], [150, 230]], [[260, 250], [540, 250]], [[540, 250], [540, 350]], [[540, 350], [300, 350]]], sand: [[160, 160, 120, 80]], water: [], bumpers: [[100, 100, 20], [720, 520, 20]] },
  ];
  GAMES.golf = { name: 'Mini Golf', icon: '⛳', desc: '9 holes of pull-and-putt with sand, water, bumpers & windmills.', run(host) {
    const W = 800, H = 600;
    return canvasGame(host, W, H, ({ g, cv, info }) => {
      const holeEl = h('strong'), strokeEl = h('strong'), totalEl = h('strong'); info.append(h('span', 'Hole ', holeEl), h('span', 'Strokes ', strokeEl), h('span', 'Total ', totalEl), h('span.small.muted', 'drag back from the ball to aim, release to putt'));
      let hole = 0, ball, strokes = 0, card = [], aim = null, sunk = 0, last, wmA = 0, over = false;
      const HL = () => HOLES[hole];
      function load(i) { hole = i; const H0 = HL(); ball = { x: H0.ball[0], y: H0.ball[1], vx: 0, vy: 0 }; last = { ...ball }; strokes = 0; sunk = 0; hud(); }
      const hud = () => { holeEl.textContent = `${hole + 1}/9 (par ${HL().par})`; strokeEl.textContent = strokes; const tot = card.reduce((s, c) => s + c, 0), par = HOLES.slice(0, card.length).reduce((s, c) => s + c.par, 0); totalEl.textContent = card.length ? `${tot} (${tot - par >= 0 ? '+' : ''}${tot - par})` : '0'; };
      const segs = () => { const s = HL().walls.slice(); s.push([[0, 0], [W, 0]], [[W, 0], [W, H]], [[W, H], [0, H]], [[0, H], [0, 0]]); if (HL().windmill) { const [x, y, L] = HL().windmill; for (let k = 0; k < 2; k++) { const a = wmA + (k * Math.PI) / 2; s.push([[x - Math.cos(a) * L / 2, y - Math.sin(a) * L / 2], [x + Math.cos(a) * L / 2, y + Math.sin(a) * L / 2]]); } } return s; };
      const inRect = (x, y, r) => x > r[0] && x < r[0] + r[2] && y > r[1] && y < r[1] + r[3];
      const R = 9;
      function physics(dt) {
        if (sunk) return; const sp = Math.hypot(ball.vx, ball.vy); if (!sp) return;
        const steps = Math.ceil((sp * dt) / 4) || 1;
        for (let k = 0; k < steps; k++) {
          const sdt = dt / steps; ball.x += ball.vx * sdt; ball.y += ball.vy * sdt;
          for (const [a, b] of segs()) { const dx = b[0] - a[0], dy = b[1] - a[1]; const L2 = dx * dx + dy * dy; let t = ((ball.x - a[0]) * dx + (ball.y - a[1]) * dy) / L2; t = Math.max(0, Math.min(1, t)); const px = a[0] + dx * t, py = a[1] + dy * t; const ex = ball.x - px, ey = ball.y - py, d = Math.hypot(ex, ey); if (d < R + 3) { const nx = ex / (d || 1), ny = ey / (d || 1); ball.x = px + nx * (R + 3); ball.y = py + ny * (R + 3); const dot = ball.vx * nx + ball.vy * ny; if (dot < 0) { ball.vx -= 1.8 * dot * nx; ball.vy -= 1.8 * dot * ny; } } }
          for (const [bx, by, br] of HL().bumpers || []) { const ex = ball.x - bx, ey = ball.y - by, d = Math.hypot(ex, ey); if (d < br + R) { const nx = ex / d, ny = ey / d; ball.x = bx + nx * (br + R); ball.y = by + ny * (br + R); const dot = ball.vx * nx + ball.vy * ny; if (dot < 0) { ball.vx -= 2.2 * dot * nx; ball.vy -= 2.2 * dot * ny; } } }
        }
        const sand = (HL().sand || []).some((r) => inRect(ball.x, ball.y, r));
        const fr = Math.pow(sand ? 0.18 : 0.62, dt); ball.vx *= fr; ball.vy *= fr; const s2 = Math.hypot(ball.vx, ball.vy); if (s2 < 8) { ball.vx = ball.vy = 0; }
        if ((HL().water || []).some((r) => inRect(ball.x, ball.y, r))) { MS.toast('💦 Splash! +1 stroke'); strokes++; ball = { ...last, vx: 0, vy: 0 }; hud(); }
        const [cx, cy] = HL().cup; const dc = Math.hypot(ball.x - cx, ball.y - cy);
        if (dc < 12 && s2 < 420) { ball.x = cx; ball.y = cy; ball.vx = ball.vy = 0; sunk = 1; card.push(strokes); hud(); setTimeout(() => { if (hole < 8) load(hole + 1); else { over = true; const tot = card.reduce((s, c) => s + c, 0); report('Mini Golf', tot, true); } }, 1300); }
        else if (dc < 30 && s2 < 260) { ball.vx += ((cx - ball.x) / dc) * 120 * dt; ball.vy += ((cy - ball.y) / dc) * 120 * dt; }
      }
      const pt = (e) => { const b = cv.getBoundingClientRect(); return [((e.clientX - b.left) / b.width) * W, ((e.clientY - b.top) / b.height) * H]; };
      cv.addEventListener('pointerdown', (e) => { if (over) { card = []; over = false; load(0); return; } if (sunk || Math.hypot(ball.vx, ball.vy)) return; aim = { s: pt(e), p: pt(e) }; });
      cv.addEventListener('pointermove', (e) => { if (aim) aim.p = pt(e); });
      cv.addEventListener('pointerup', () => { if (!aim) return; const dx = aim.s[0] - aim.p[0], dy = aim.s[1] - aim.p[1]; const pw = Math.min(200, Math.hypot(dx, dy)); if (pw > 6) { last = { x: ball.x, y: ball.y }; const k = (pw / Math.hypot(dx, dy)) * 5.2; ball.vx = dx * k; ball.vy = dy * k; strokes++; hud(); } aim = null; });
      load(0);
      return {
        update(dt) { wmA += dt * 1.2; physics(dt); },
        draw() {
          const L = HL(); g.fillStyle = '#2f9e44'; g.fillRect(0, 0, W, H); g.globalAlpha = 0.07; g.fillStyle = '#fff'; for (let i = 0; i < W; i += 40) g.fillRect(i, 0, 20, H); g.globalAlpha = 1;
          (L.water || []).forEach((r) => { g.fillStyle = '#1c7ed6'; g.fillRect(...r); g.strokeStyle = 'rgba(255,255,255,.35)'; for (let k = 0; k < 4; k++) { g.beginPath(); for (let x = r[0]; x < r[0] + r[2]; x += 8) g.lineTo(x, r[1] + 15 + k * (r[3] / 4) + Math.sin(x / 15 + performance.now() / 400) * 3); g.stroke(); } });
          (L.sand || []).forEach((r) => { g.fillStyle = '#e9d8a6'; g.beginPath(); g.roundRect ? g.roundRect(...r, 30) : g.rect(...r); g.fill(); });
          g.fillStyle = '#111'; g.beginPath(); g.arc(L.cup[0], L.cup[1], 13, 0, 7); g.fill(); g.strokeStyle = '#ddd'; g.lineWidth = 2; g.beginPath(); g.moveTo(L.cup[0], L.cup[1]); g.lineTo(L.cup[0], L.cup[1] - 50); g.stroke(); g.fillStyle = '#ff5d6c'; g.beginPath(); g.moveTo(L.cup[0], L.cup[1] - 50); g.lineTo(L.cup[0] + 24, L.cup[1] - 42); g.lineTo(L.cup[0], L.cup[1] - 34); g.fill();
          g.strokeStyle = '#8d5524'; g.lineWidth = 8; g.lineCap = 'round'; for (const [a, b] of L.walls) { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
          if (L.windmill) { const [x, y, Ln] = L.windmill; g.strokeStyle = '#f1f3f5'; g.lineWidth = 7; for (let k = 0; k < 2; k++) { const a = wmA + (k * Math.PI) / 2; g.beginPath(); g.moveTo(x - Math.cos(a) * Ln / 2, y - Math.sin(a) * Ln / 2); g.lineTo(x + Math.cos(a) * Ln / 2, y + Math.sin(a) * Ln / 2); g.stroke(); } g.fillStyle = '#c92a2a'; g.beginPath(); g.arc(x, y, 10, 0, 7); g.fill(); }
          (L.bumpers || []).forEach(([x, y, r]) => { const gr = g.createRadialGradient(x - r / 3, y - r / 3, 2, x, y, r); gr.addColorStop(0, '#ffc9c9'); gr.addColorStop(1, '#e03131'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); });
          g.lineCap = 'butt';
          if (aim) { const dx = aim.s[0] - aim.p[0], dy = aim.s[1] - aim.p[1]; const pw = Math.min(200, Math.hypot(dx, dy)); const a = Math.atan2(dy, dx); g.setLineDash([8, 8]); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 3; g.beginPath(); g.moveTo(ball.x, ball.y); g.lineTo(ball.x + Math.cos(a) * pw * 1.4, ball.y + Math.sin(a) * pw * 1.4); g.stroke(); g.setLineDash([]); g.fillStyle = `hsl(${120 - pw * 0.6},90%,55%)`; g.fillRect(20, H - 30, pw * 2, 12); g.strokeStyle = '#fff'; g.strokeRect(20, H - 30, 400, 12); }
          if (!sunk) { g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.arc(ball.x + 3, ball.y + 4, R, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(ball.x, ball.y, R, 0, 7); g.fill(); }
          g.fillStyle = '#fff'; g.font = 'bold 16px system-ui'; g.fillText(`Hole ${hole + 1} · Par ${L.par} · Stroke ${strokes}`, 14, 24);
          if (sunk) { const d = strokes - L.par; const name = strokes === 1 ? 'HOLE IN ONE! 🎉' : { '-3': 'Albatross!', '-2': 'Eagle!', '-1': 'Birdie!', 0: 'Par', 1: 'Bogey', 2: 'Double bogey' }[d] || `+${d}`; banner(g, W, H, name, `${strokes} stroke${strokes > 1 ? 's' : ''}`); }
          if (over) { const tot = card.reduce((s, c) => s + c, 0), par = HOLES.reduce((s, c) => s + c.par, 0); banner(g, W, H, `Round complete: ${tot} (${tot - par >= 0 ? '+' : ''}${tot - par})`, card.map((c, i) => `${i + 1}:${c}`).join('  ') + ' · tap to replay'); }
        },
      };
    });
  } };

  /* ================= BATTLESHIP ================= */
  GAMES.battleship = { name: 'Battleship', icon: '🚢', desc: 'Sink the fleet before the AI sinks yours.', run(host) {
    const N = 10, SHIPS = [['Carrier', 5], ['Battleship', 4], ['Cruiser', 3], ['Submarine', 3], ['Destroyer', 2]];
    const wrap = h('div.col', { style: { alignItems: 'center', gap: '12px', padding: '10px' } }); host.append(wrap);
    let me, ai, phase, msg, aiQ, aiShots, horiz = true;
    function fleet() { const grid = Array.from({ length: N }, () => Array(N).fill(null)); const ships = []; for (const [name, len] of SHIPS) { for (;;) { const hz = Math.random() < 0.5; const r = Math.floor(Math.random() * (hz ? N : N - len + 1)), c = Math.floor(Math.random() * (hz ? N - len + 1 : N)); const cells = Array.from({ length: len }, (_, i) => (hz ? [r, c + i] : [r + i, c])); if (cells.every(([y, x]) => !grid[y][x])) { const s = { name, len, cells, hits: 0 }; cells.forEach(([y, x]) => (grid[y][x] = s)); ships.push(s); break; } } } return { grid, ships, shots: Array.from({ length: N }, () => Array(N).fill(0)) }; }
    function reset() { me = fleet(); ai = fleet(); phase = 'place'; msg = 'Your fleet is placed. Shuffle it or press Start.'; aiQ = []; aiShots = 0; render(); }
    const sunkAll = (p) => p.ships.every((s) => s.hits >= s.len);
    function fire(p, r, c) { if (p.shots[r][c]) return null; const s = p.grid[r][c]; if (s) { s.hits++; p.shots[r][c] = 2; return s.hits >= s.len ? { hit: true, sunk: s } : { hit: true }; } p.shots[r][c] = 1; return { hit: false }; }
    function aiTurn() {
      let r, c; aiQ = aiQ.filter(([y, x]) => y >= 0 && y < N && x >= 0 && x < N && !me.shots[y][x]);
      if (aiQ.length) [r, c] = aiQ.shift(); else { const cand = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!me.shots[y][x] && (y + x) % 2 === 0) cand.push([y, x]); const all = cand.length ? cand : [].concat(...me.shots.map((row, y) => row.map((v, x) => (!v ? [y, x] : null)))).filter(Boolean); [r, c] = all[Math.floor(Math.random() * all.length)]; }
      const res = fire(me, r, c); aiShots++;
      if (res.hit && !res.sunk) { const hits = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (me.shots[y][x] === 2 && !(me.grid[y][x].hits >= me.grid[y][x].len)) hits.push([y, x]); const line = hits.filter(([y, x]) => (y === r && x !== c) || (x === c && y !== r)); const nb = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]; if (line.length) { const hz = line[0][0] === r; const xs = hits.filter(([y, x]) => (hz ? y === r : x === c)).map(([y, x]) => (hz ? x : y)); const lo = Math.min(...xs), hi = Math.max(...xs); aiQ = (hz ? [[r, lo - 1], [r, hi + 1]] : [[lo - 1, c], [hi + 1, c]]).concat(aiQ); } else aiQ = nb.concat(aiQ); }
      if (res.sunk) { aiQ = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (me.shots[y][x] === 2 && !(me.grid[y][x].hits >= me.grid[y][x].len)) aiQ.push([y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]); }
      msg = res.sunk ? `💥 The AI sank your ${res.sunk.name}!` : res.hit ? '🔥 The AI hit your ship!' : 'The AI missed. Your turn.';
      if (sunkAll(me)) { phase = 'over'; msg = '☠️ Your fleet was sunk. The AI wins.'; }
      else phase = 'play';
      render();
    }
    function cellBtn(p, r, c, enemy) {
      const shot = p.shots[r][c], ship = p.grid[r][c]; const sunk = ship && ship.hits >= ship.len;
      const showShip = !enemy || phase === 'over' || sunk;
      const bg = shot === 2 ? (sunk ? '#c92a2a' : '#ff8a3d') : shot === 1 ? 'color-mix(in srgb, var(--accent) 18%, var(--panel2))' : showShip && ship ? '#7d8597' : 'color-mix(in srgb, #2fa8ff 22%, var(--panel2))';
      return h('button', { style: { width: 'min(32px, 7.4vw)', height: 'min(32px, 7.4vw)', border: '1px solid var(--line)', background: bg, borderRadius: '4px', cursor: enemy && phase === 'play' && !shot ? 'crosshair' : 'default', fontSize: '13px', padding: 0, color: '#fff' }, on: { click: () => { if (!enemy || phase !== 'play' || shot) return; const res = fire(ai, r, c); msg = res.sunk ? `🎯 You sank their ${res.sunk.name}!` : res.hit ? '🔥 Hit!' : '💨 Miss.'; if (sunkAll(ai)) { phase = 'over'; const shots = ai.shots.flat().filter(Boolean).length; msg = `🏆 Victory in ${shots} shots!`; report('Battleship', shots, true); render(); return; } phase = 'ai'; render(); setTimeout(aiTurn, 550); } } }, shot === 2 ? '✕' : shot === 1 ? '•' : '');
    }
    function board(p, enemy, title) { const left = p.ships.filter((s) => s.hits < s.len).length; return h('div.card.col', { style: { gap: '6px', padding: '10px' } }, h('div.row', h('strong', title), h('div.spacer'), h('span.small.muted', `${left} ship${left === 1 ? '' : 's'} afloat`)), h('div', { style: { display: 'grid', gridTemplateColumns: `repeat(${N}, auto)`, gap: '2px' } }, p.grid.flatMap((row, r) => row.map((_, c) => cellBtn(p, r, c, enemy)))), h('div.row', { style: { flexWrap: 'wrap', gap: '4px' } }, p.ships.map((s) => h('span.tag', { style: { textDecoration: s.hits >= s.len ? 'line-through' : '', opacity: s.hits >= s.len ? 0.5 : 1 } }, `${s.name} (${s.len})`)))); }
    function render() {
      wrap.innerHTML = '';
      wrap.append(h('div', { style: { fontSize: '17px', fontWeight: 700, minHeight: '24px' } }, msg));
      if (phase === 'place') wrap.append(h('div.row', h('button.btn', { on: { click: () => { me = fleet(); render(); } } }, '🔀 Shuffle my fleet'), h('button.btn.primary', { on: { click: () => { phase = 'play'; msg = 'Fire at the enemy waters!'; render(); } } }, '▶ Start battle')));
      if (phase === 'over') wrap.append(h('button.btn.primary', { on: { click: reset } }, '↻ New game'));
      wrap.append(h('div.row', { style: { flexWrap: 'wrap', justifyContent: 'center', gap: '16px', alignItems: 'flex-start' } }, board(ai, true, '🎯 Enemy waters'), board(me, false, '🚢 Your fleet')));
    }
    reset();
    return () => {};
  } };

  Object.entries(GAMES).forEach(([k, gm]) => { if (!MS.commands.some((c) => c.id === 'game-' + k)) MS.command({ id: 'game-' + k, title: 'Play ' + gm.name, icon: gm.icon, group: 'Arcade', run: () => MS.go('arcade', k) }); });
  if (MS.appMap.arcade) MS.appMap.arcade.desc = Object.keys(GAMES).length + ' games with high scores';
})();
