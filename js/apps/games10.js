/* Arcade 10: Bowling, 8-Ball Pool (vs CPU or hotseat), Sokoban (verified levels), Pinball (full table: flippers, plunger, bumpers, slingshots, drop targets, rollover lanes, multiplier, ball save) */
(function () {
  const { h } = MS; const { GAMES, report, canvasGame, banner } = MS.arcade;

  /* ================= PINBALL ================= */
  GAMES.pinball = { name: 'Pinball', icon: '🪩', desc: 'Classic table: flippers, plunger, pop bumpers, slingshots, drop targets and rollover lanes. ←/Z and →/M flip, hold Space to launch. On touch: tap left/right halves.', run(host) {
    const W = 420, H = 720, R = 9;
    return canvasGame(host, W, H, ({ g, cv, keys, info }) => {
      const sc = h('strong'), bl = h('span'), mu = h('span'), best = h('span.small.muted'); info.append(sc, bl, mu, best);
      // static walls
      const segs = []; const wall = (pts, o = {}) => { for (let i = 0; i < pts.length - 1; i++) segs.push({ a: pts[i], b: pts[i + 1], ...o }); };
      const arc = []; for (let i = 0; i <= 24; i++) { const a = Math.PI + (i / 24) * Math.PI; arc.push([210 + 190 * Math.cos(a), 210 + 190 * Math.sin(a)]); }
      wall([[20, 560], [20, 210], ...arc, [400, 210], [400, 712]]);
      wall([[372, 712], [372, 300]]); wall([[372, 712], [400, 712]]); // plunger lane inner wall
      wall([[20, 560], [128, 636]]); wall([[372, 560], [292, 636]]);
      wall([[60, 470], [60, 548], [112, 584]]); wall([[332, 470], [332, 548], [280, 584]]);
      const slings = [{ a: [60, 470], b: [112, 584], n: [0.91, -0.41], kick: 0 }, { a: [332, 470], b: [280, 584], n: [-0.91, -0.41], kick: 0 }];
      slings.forEach((s) => segs.push({ ...s, sling: s }));
      wall([[96, 180], [96, 230]]); wall([[150, 160], [150, 205]]); wall([[210, 150], [210, 200]]); wall([[270, 160], [270, 205]]); wall([[324, 180], [324, 230]]); // lane guides
      const lanes = [{ x: 123, y: 205 }, { x: 180, y: 190 }, { x: 240, y: 190 }, { x: 297, y: 205 }];
      const bumpers = [{ x: 145, y: 300, r: 26 }, { x: 275, y: 300, r: 26 }, { x: 210, y: 380, r: 26 }].map((b) => ({ ...b, flash: 0 }));
      const targets = [0, 1, 2].map((i) => ({ a: [28, 300 + i * 40], b: [28, 330 + i * 40], down: false, flash: 0 }));
      const posts = [[128, 636], [292, 636], [210, 470]].map(([x, y]) => ({ x, y, r: 6 }));
      const flips = [{ px: 134, py: 642, side: 1, ang: 0.52, w: 0, up: false }, { px: 286, py: 642, side: -1, ang: 0.52, w: 0, up: false }]; const L = 64, REST = 0.52, UP = -0.48;
      const tip = (f, a = f.ang) => [f.px + f.side * L * Math.cos(a), f.py + L * Math.sin(a)];
      let ball, score, balls, mult, over, started, charge, saveT, popups, msg, msgT, lanesLit, bestV = 0, shake = 0;
      MS.arcade.getScores().then((s) => (bestV = s.data.best.Pinball || 0));
      const newBall = () => { ball = { x: 386, y: 690, vx: 0, vy: 0, inLane: true }; charge = 0; saveT = 0; };
      const reset = () => { score = 0; balls = 3; mult = 1; over = false; lanesLit = [0, 0, 0, 0]; targets.forEach((t) => (t.down = false)); popups = []; msg = ''; msgT = 0; newBall(); };
      reset(); started = false;
      const add = (pts, x, y) => { const v = pts * mult; score += v; popups.push({ x, y, t: 0.8, s: '+' + v }); };
      const say = (m) => { msg = m; msgT = 2; };
      const touches = new Map();
      const setTouch = () => { const xs = [...touches.values()]; flips[0].up = xs.some((x) => x < W / 2) || keys.ArrowLeft || keys.z || keys.Z; flips[1].up = xs.some((x) => x >= W / 2) || keys.ArrowRight || keys.m || keys.M || keys['/']; };
      const tx = (e) => { const r = cv.getBoundingClientRect(); return (e.clientX - r.left) * W / r.width; };
      cv.addEventListener('pointerdown', (e) => { e.preventDefault(); cv.setPointerCapture?.(e.pointerId); if (!started || over) { if (over) reset(); started = true; return; } touches.set(e.pointerId, tx(e)); if (ball.inLane) charge = 0.001; });
      const up = (e) => { touches.delete(e.pointerId); if (ball.inLane && charge > 0 && !keys[' ']) launch(Math.max(0.75, charge)); };
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      const launch = (p) => { if (!ball.inLane) return; ball.vy = -(900 + 700 * Math.min(1, p)); ball.inLane = false; charge = 0; saveT = 6; };
      const collideSeg = (a, b, rad, sv) => { const dx = b[0] - a[0], dy = b[1] - a[1]; const l2 = dx * dx + dy * dy; let k = ((ball.x - a[0]) * dx + (ball.y - a[1]) * dy) / l2; k = Math.max(0, Math.min(1, k)); const cx = a[0] + k * dx, cy = a[1] + k * dy; let nx = ball.x - cx, ny = ball.y - cy; const d = Math.hypot(nx, ny); if (d >= rad || d === 0) return false; nx /= d; ny /= d; ball.x = cx + nx * rad; ball.y = cy + ny * rad; const s = sv ? sv(cx, cy) : [0, 0]; const rvx = ball.vx - s[0], rvy = ball.vy - s[1]; const vn = rvx * nx + rvy * ny; if (vn < 0) { const e = sv ? 0.25 : 0.45; ball.vx -= (1 + e) * vn * nx; ball.vy -= (1 + e) * vn * ny; } return [nx, ny]; };
      const collideCirc = (o, rad) => { const nx0 = ball.x - o.x, ny0 = ball.y - o.y; const d = Math.hypot(nx0, ny0); if (d >= rad || d === 0) return false; const nx = nx0 / d, ny = ny0 / d; ball.x = o.x + nx * rad; ball.y = o.y + ny * rad; const vn = ball.vx * nx + ball.vy * ny; if (vn < 0) { ball.vx -= 1.5 * vn * nx; ball.vy -= 1.5 * vn * ny; } return [nx, ny]; };
      function step(dt) {
        flips.forEach((f) => { const target = f.up ? UP : REST; const prev = f.ang; const sp = 26 * dt; f.ang = target < f.ang ? Math.max(target, f.ang - sp) : Math.min(target, f.ang + sp); f.w = (f.ang - prev) / dt; });
        if (ball.inLane) { ball.x = 386; ball.y = 690 + charge * 18; ball.vx = ball.vy = 0; return; }
        ball.vy += 820 * dt; ball.x += ball.vx * dt; ball.y += ball.vy * dt;
        segs.forEach((s) => { const n = collideSeg(s.a, s.b, R); if (n && s.sling && Math.hypot(ball.vx, ball.vy) > 120 && n[0] * s.sling.n[0] + n[1] * s.sling.n[1] > 0.5) { ball.vx += s.sling.n[0] * 380; ball.vy += s.sling.n[1] * 380; s.sling.kick = 0.15; add(10, ball.x, ball.y); MS.sfx?.('blip'); } });
        posts.forEach((p) => collideCirc(p, p.r + R));
        bumpers.forEach((b) => { const n = collideCirc(b, b.r + R); if (n) { ball.vx = n[0] * 620; ball.vy = n[1] * 620; b.flash = 0.18; shake = 0.1; add(100, b.x, b.y - 30); } });
        targets.forEach((t) => { if (t.down) return; const n = collideSeg(t.a, t.b, R + 3); if (n) { t.down = true; t.flash = 0.3; add(250, 50, t.a[1]); if (targets.every((x) => x.down)) { add(2000, 120, 340); say('TARGETS COMPLETE! +2000'); setTimeout(() => targets.forEach((x) => (x.down = false)), 1500); } } });
        lanes.forEach((ln, i) => { if (!lanesLit[i] && Math.abs(ball.x - ln.x) < 18 && Math.abs(ball.y - ln.y) < 12) { lanesLit[i] = 1; add(50, ln.x, ln.y); if (lanesLit.every(Boolean)) { mult = Math.min(5, mult + 1); lanesLit = [0, 0, 0, 0]; say(`MULTIPLIER ×${mult}!`); } } });
        flips.forEach((f) => { const t = tip(f); collideSeg([f.px, f.py], t, R + 6, (cx, cy) => { const rx = cx - f.px, ry = cy - f.py; return [f.side * f.w * -ry, f.side * f.w * rx]; }); });
        const sp = Math.hypot(ball.vx, ball.vy); if (sp > 1600) { ball.vx *= 1600 / sp; ball.vy *= 1600 / sp; }
        if (ball.x > 372 && ball.y > 640 && ball.vy > 0 && Math.abs(ball.vy) < 60) { ball.inLane = true; }
        if (ball.y > H + 30) { if (saveT > 0) { say('BALL SAVED!'); newBall(); return; } balls--; if (balls <= 0) { over = true; report('Pinball', score).then(() => MS.arcade.getScores().then((s) => (bestV = s.data.best.Pinball || 0))); } else { say('BALL ' + (4 - balls)); mult = 1; newBall(); } }
      }
      return {
        key(k) { if ((!started || over) && (k === ' ' || k === 'Enter')) { if (over) reset(); started = true; } },
        update(dt) {
          setTouch(); if (!started || over) return;
          if (ball.inLane && (keys[' '] || keys.ArrowDown)) charge = Math.min(1, (charge || 0) + dt * 1.2); else if (ball.inLane && charge > 0 && !touches.size) launch(charge);
          for (let i = 0; i < 12; i++) step(dt / 12);
          saveT = Math.max(0, saveT - dt); msgT -= dt; shake = Math.max(0, shake - dt); bumpers.forEach((b) => (b.flash = Math.max(0, b.flash - dt))); slings.forEach((s) => (s.kick = Math.max(0, s.kick - dt))); targets.forEach((t) => (t.flash = Math.max(0, t.flash - dt))); popups.forEach((p) => { p.t -= dt; p.y -= 30 * dt; }); popups = popups.filter((p) => p.t > 0);
        },
        draw() {
          sc.textContent = 'Score ' + (score || 0).toLocaleString(); bl.textContent = '⚪'.repeat(Math.max(0, balls)); mu.textContent = '×' + mult; best.textContent = 'Best ' + bestV.toLocaleString();
          g.save(); if (shake) g.translate((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
          const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#1e1b4b'); bg.addColorStop(0.5, '#312e81'); bg.addColorStop(1, '#0f172a'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
          g.globalAlpha = 0.08; g.fillStyle = '#fff'; for (let y = 0; y < H; y += 24) for (let x = (y / 24) % 2 * 12; x < W; x += 24) g.fillRect(x, y, 2, 2); g.globalAlpha = 1;
          g.font = 'bold 30px system-ui'; g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,.07)'; g.fillText('MEGA', 210, 470); g.fillText('PINBALL', 210, 505);
          // multiplier lights
          for (let i = 1; i <= 5; i++) { g.fillStyle = i <= mult ? '#facc15' : 'rgba(255,255,255,.12)'; g.beginPath(); g.arc(150 + (i - 1) * 30, 560, 9, 0, 7); g.fill(); g.fillStyle = i <= mult ? '#111' : 'rgba(255,255,255,.4)'; g.font = 'bold 10px system-ui'; g.fillText('×' + i, 150 + (i - 1) * 30, 564); }
          // lanes
          lanes.forEach((ln, i) => { g.fillStyle = lanesLit[i] ? '#22d3ee' : 'rgba(255,255,255,.15)'; g.shadowColor = '#22d3ee'; g.shadowBlur = lanesLit[i] ? 14 : 0; g.beginPath(); g.arc(ln.x, ln.y + 22, 6, 0, 7); g.fill(); g.shadowBlur = 0; });
          // walls
          g.lineCap = 'round'; g.lineWidth = 5; g.strokeStyle = '#a5b4fc'; g.shadowColor = '#818cf8'; g.shadowBlur = 8; segs.forEach((s) => { if (s.sling) return; g.beginPath(); g.moveTo(...s.a); g.lineTo(...s.b); g.stroke(); }); g.shadowBlur = 0;
          // slingshots
          slings.forEach((s, i) => { g.fillStyle = s.kick ? '#fde047' : '#f472b6'; g.beginPath(); const x0 = i ? 332 : 60; g.moveTo(x0, 470); g.lineTo(x0, 548); g.lineTo(i ? 280 : 112, 584); g.closePath(); g.globalAlpha = 0.85; g.fill(); g.globalAlpha = 1; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(...s.a); g.lineTo(...s.b); g.stroke(); });
          // targets
          targets.forEach((t) => { g.strokeStyle = t.down ? 'rgba(255,255,255,.15)' : t.flash ? '#fff' : '#fb923c'; g.lineWidth = 8; g.beginPath(); g.moveTo(...t.a); g.lineTo(...t.b); g.stroke(); });
          posts.forEach((p) => { g.fillStyle = '#e0e7ff'; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill(); });
          // bumpers
          bumpers.forEach((b) => { const gr = g.createRadialGradient(b.x - 6, b.y - 8, 4, b.x, b.y, b.r); gr.addColorStop(0, b.flash ? '#fff' : '#fca5a5'); gr.addColorStop(1, b.flash ? '#facc15' : '#dc2626'); g.shadowColor = '#f87171'; g.shadowBlur = b.flash ? 30 : 10; g.fillStyle = gr; g.beginPath(); g.arc(b.x, b.y, b.r, 0, 7); g.fill(); g.shadowBlur = 0; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(b.x, b.y, b.r - 7, 0, 7); g.stroke(); g.fillStyle = '#fff'; g.font = 'bold 12px system-ui'; g.fillText('100', b.x, b.y + 4); });
          // flippers
          flips.forEach((f) => { const t = tip(f); g.strokeStyle = '#f8fafc'; g.lineWidth = 16; g.beginPath(); g.moveTo(f.px, f.py); g.lineTo(...t); g.stroke(); g.strokeStyle = '#38bdf8'; g.lineWidth = 9; g.beginPath(); g.moveTo(f.px, f.py); g.lineTo(...t); g.stroke(); g.fillStyle = '#0ea5e9'; g.beginPath(); g.arc(f.px, f.py, 5, 0, 7); g.fill(); });
          // plunger
          g.fillStyle = '#475569'; g.fillRect(377, 700 + (charge || 0) * 18, 18, 30); g.fillStyle = '#ef4444'; g.fillRect(377, 699 + (charge || 0) * 18, 18, 4);
          if (ball.inLane && started && !over) { g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(404, 520, 10, 180); g.fillStyle = '#22c55e'; g.fillRect(404, 700 - 180 * (charge || 0), 10, 180 * (charge || 0)); }
          // ball
          const bgr = g.createRadialGradient(ball.x - 3, ball.y - 3, 1, ball.x, ball.y, R); bgr.addColorStop(0, '#fff'); bgr.addColorStop(1, '#94a3b8'); g.fillStyle = bgr; g.beginPath(); g.arc(ball.x, ball.y, R, 0, 7); g.fill();
          if (saveT > 0 && !ball.inLane) { g.fillStyle = `rgba(34,197,94,${0.4 + 0.4 * Math.sin(performance.now() / 120)})`; g.font = 'bold 12px system-ui'; g.fillText('BALL SAVE', 210, 700); }
          popups.forEach((p) => { g.globalAlpha = Math.min(1, p.t * 2); g.fillStyle = '#fde047'; g.font = 'bold 15px system-ui'; g.fillText(p.s, p.x, p.y); }); g.globalAlpha = 1;
          if (msgT > 0) { g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(60, 420, 300, 40); g.fillStyle = '#facc15'; g.font = 'bold 20px system-ui'; g.fillText(msg, 210, 447); }
          g.textAlign = 'left'; g.restore();
          if (!started) banner(g, W, H, '🪩 Pinball', 'Space / tap to start · hold Space to launch'); else if (over) banner(g, W, H, 'Game over', `Score ${score.toLocaleString()} — Space / tap to play again`);
        },
      };
    });
  } };

  /* ================= SOKOBAN ================= */
  const SOKO = [["########", "#    ###", "#.$ $ ##", "#+#    #", "### ## #", "#    # #", "########"], ["########", "# ### @#", "#    $ #", "##$   .#", "#  # # #", "#   . ##", "########"], ["########", "##  ## #", "#  #.  #", "#  # $ #", "#.   $@#", "##  ####", "########"], ["########", "##.   ##", "#   $  #", "# $   ##", "##@#  ##", "#####.##", "########"], ["##########", "#   ## ###", "#.      ##", "# $ # # ##", "#    #   #", "# .  # # #", "# $ # ## #", "##@$  .# #", "##########"], ["#########", "## # # ##", "#.     ##", "#* #   ##", "## $    #", "# $.    #", "##@# #  #", "#########"], ["#########", "# #. $ ##", "# ##  .##", "#  ##   #", "# .#  # #", "##$ #$ ##", "#  @   ##", "#########"], ["##########", "###   #. #", "#   ##@$##", "### # $  #", "#.$    ###", "# # #    #", "#      ###", "#   #  . #", "##########"], ["#########", "##  ##  #", "##.$.. ##", "#       #", "#     $ #", "##  $   #", "##  @## #", "#########"], ["#########", "##      #", "# $ #   #", "#@$..#$##", "# ###   #", "# ##.   #", "# ##   ##", "#########"], ["##########", "# .##+$  #", "## $ #   #", "#       ##", "#  # $ # #", "#  ## ## #", "#      # #", "# # #.   #", "##########"], ["##########", "#     ## #", "# . # .$ #", "##$##    #", "#  #    .#", "#        #", "# ###$* ##", "#@    ####", "##########"], ["##########", "##.  ##  #", "##$   . ##", "#   ##.$ #", "# #  #   #", "#+$ #  $ #", "#   ##   #", "# #   #  #", "##########"], ["##########", "##   .   #", "#* ##  # #", "#  .  ## #", "###   $ ##", "# ##   $ #", "#      #@#", "# ## ### #", "##########"], ["##########", "# ##  ##*#", "#.    ## #", "#   $  . #", "##  #   ##", "#   #    #", "##$*  #  #", "##@#     #", "##########"], ["##########", "###   # ##", "#@$. $  ##", "#$    #  #", "# ## .#  #", "#  # # # #", "# $  #   #", "#..# #   #", "##########"]];
  GAMES.sokoban = { name: 'Sokoban', icon: '📦', desc: SOKO.length + ' computer-verified crate-pushing puzzles. Push every crate onto a goal. Arrows/WASD to move, Z to undo, R to restart.', run(host) {
    const W = 640, H = 560; let st = null; MS.store('sokoban', { solved: {}, best: {}, level: 0 }).then((s) => { st = s; load(Math.min(s.data.level || 0, SOKO.length - 1)); });
    let cleanupG = null; const wrap = h('div.col', { style: { alignItems: 'center', gap: '8px' } }); host.append(wrap);
    const bar = h('div.row', { style: { flexWrap: 'wrap', justifyContent: 'center' } }); const holder = h('div'); const pad = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3,52px)', gap: '6px', marginTop: '6px' } });
    wrap.append(bar, holder, pad);
    let map, boxes, goals, pl, hist, moves, pushes, won, wonT, lvl, face = 1;
    const L = (i) => SOKO[i];
    function load(i) { lvl = i; const m = L(i); map = []; boxes = []; goals = []; m.forEach((row, y) => { map.push([...row].map((c) => (c === '#' ? 1 : 0))); [...row].forEach((c, x) => { if ('.*+'.includes(c)) goals.push([x, y]); if ('$*'.includes(c)) boxes.push([x, y]); if ('@+'.includes(c)) pl = [x, y]; }); });
      // mark outside floor (unreachable) as void for nicer drawing
      const reach = new Set([pl + '']); const q = [pl]; while (q.length) { const [x, y] = q.pop(); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const k = [x + dx, y + dy] + ''; if (map[y + dy]?.[x + dx] === 0 && !reach.has(k)) { reach.add(k); q.push([x + dx, y + dy]); } }); }
      map.forEach((r, y) => r.forEach((c, x) => { if (c === 0 && !reach.has([x, y] + '')) map[y][x] = 2; }));
      hist = []; moves = 0; pushes = 0; won = false; wonT = 0; if (st) { st.data.level = i; st.touch(); } renderBar(); }
    const isGoal = (x, y) => goals.some((g) => g[0] === x && g[1] === y); const boxAt = (x, y) => boxes.findIndex((b) => b[0] === x && b[1] === y);
    function move(dx, dy) { if (won) return; face = dx > 0 ? 1 : dx < 0 ? -1 : face; const nx = pl[0] + dx, ny = pl[1] + dy; if (map[ny]?.[nx] !== 0) return; const bi = boxAt(nx, ny);
      if (bi >= 0) { const bx = nx + dx, by = ny + dy; if (map[by]?.[bx] !== 0 || boxAt(bx, by) >= 0) return; hist.push([pl.slice(), boxes.map((b) => b.slice()), moves, pushes]); boxes[bi] = [bx, by]; pushes++; } else hist.push([pl.slice(), boxes.map((b) => b.slice()), moves, pushes]);
      pl = [nx, ny]; moves++; if (boxes.every((b) => isGoal(...b))) win(); renderBar(); }
    function undo() { const s = hist.pop(); if (!s) return; [pl, boxes, moves, pushes] = s; won = false; renderBar(); }
    function win() { won = true; wonT = 0; const d = st.data; const prev = d.best[lvl]; if (!prev || moves < prev) d.best[lvl] = moves; d.solved[lvl] = 1; st.touch(); report('Sokoban', Object.keys(d.solved).length); MS.toast(`Level ${lvl + 1} solved in ${moves} moves!`, 'good'); }
    function renderBar() { bar.innerHTML = ''; const d = st?.data || { solved: {}, best: {} }; const sel = h('select.input', { on: { change: (e) => load(+e.target.value) } }, SOKO.map((_, i) => h('option', { value: i, selected: i === lvl }, `${d.solved[i] ? '✅' : '⬜'} Level ${i + 1}`)));
      bar.append(h('button.btn.sm', { on: { click: () => lvl > 0 && load(lvl - 1) } }, '◀'), sel, h('button.btn.sm', { on: { click: () => lvl < SOKO.length - 1 && load(lvl + 1) } }, '▶'), h('strong', `Moves ${moves}`), h('span', `Pushes ${pushes}`), h('span.small.muted', d.best[lvl] ? `Best ${d.best[lvl]}` : ''), h('span.small.muted', `${Object.keys(d.solved).length}/${SOKO.length} solved`), h('button.btn.sm', { on: { click: undo } }, '↶ Undo'), h('button.btn.sm', { on: { click: () => load(lvl) } }, '↺ Restart')); }
    pad.append(...[['', 0, 0], ['▲', 0, -1], ['', 0, 0], ['◀', -1, 0], ['↶', 'u'], ['▶', 1, 0], ['', 0, 0], ['▼', 0, 1], ['', 0, 0]].map(([t, dx, dy]) => t ? h('button.btn', { style: { height: '52px', fontSize: '20px' }, on: { click: () => (dx === 'u' ? undo() : move(dx, dy)) } }, t) : h('div')));
    cleanupG = canvasGame(holder, W, H, ({ g, cv }) => {
      MS.arcade.swipe?.(cv, (k) => { const m = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[k]; if (m) move(...m); });
      return {
        key(k) { const m = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] }[k]; if (m) move(...m); else if (k === 'z' || k === 'Backspace' || k === 'u') undo(); else if (k === 'r') load(lvl); else if ((k === 'Enter' || k === ' ') && won && lvl < SOKO.length - 1) load(lvl + 1); },
        update(dt) { if (won) wonT += dt; },
        draw() {
          g.fillStyle = '#1c1917'; g.fillRect(0, 0, W, H); if (!map) return;
          const cols = Math.max(...map.map((r) => r.length)), rows = map.length; const S = Math.floor(Math.min((W - 20) / cols, (H - 20) / rows)); const ox = (W - S * cols) / 2, oy = (H - S * rows) / 2;
          map.forEach((r, y) => r.forEach((c, x) => { const X = ox + x * S, Y = oy + y * S; if (c === 1) { const near = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([dx, dy]) => map[y + dy]?.[x + dx] === 0); if (!near) return; g.fillStyle = '#7c2d12'; g.fillRect(X, Y, S, S); g.fillStyle = '#9a3412'; for (let i = 0; i < 2; i++) { g.fillRect(X + 2, Y + 2 + i * S / 2, S / 2 - 3, S / 2 - 4); g.fillRect(X + S / 2 + 1, Y + 2 + i * S / 2, S / 2 - 3, S / 2 - 4); } } else if (c === 0) { g.fillStyle = (x + y) % 2 ? '#d6d3d1' : '#e7e5e4'; g.fillRect(X, Y, S, S); } }));
          goals.forEach(([x, y]) => { const X = ox + x * S + S / 2, Y = oy + y * S + S / 2; g.strokeStyle = '#16a34a'; g.lineWidth = Math.max(2, S / 12); g.beginPath(); g.arc(X, Y, S * 0.22, 0, 7); g.stroke(); g.fillStyle = 'rgba(22,163,74,.25)'; g.fill(); });
          boxes.forEach(([x, y]) => { const X = ox + x * S, Y = oy + y * S, on = isGoal(x, y), p = S * 0.08; g.fillStyle = on ? '#15803d' : '#b45309'; g.fillRect(X + p, Y + p, S - 2 * p, S - 2 * p); g.strokeStyle = on ? '#86efac' : '#fbbf24'; g.lineWidth = Math.max(2, S / 14); g.strokeRect(X + p * 1.8, Y + p * 1.8, S - 3.6 * p, S - 3.6 * p); g.beginPath(); g.moveTo(X + p * 1.8, Y + p * 1.8); g.lineTo(X + S - p * 1.8, Y + S - p * 1.8); g.moveTo(X + S - p * 1.8, Y + p * 1.8); g.lineTo(X + p * 1.8, Y + S - p * 1.8); g.stroke(); });
          const px = ox + pl[0] * S + S / 2, py = oy + pl[1] * S + S / 2; g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(px, py + S * 0.3, S * 0.25, S * 0.08, 0, 0, 7); g.fill(); g.fillStyle = '#2563eb'; g.beginPath(); g.arc(px, py, S * 0.3, 0, 7); g.fill(); g.fillStyle = '#fde68a'; g.beginPath(); g.arc(px, py - S * 0.05, S * 0.18, 0, 7); g.fill(); g.fillStyle = '#111'; g.fillRect(px + face * S * 0.04 - S * 0.08, py - S * 0.1, S * 0.05, S * 0.06); g.fillRect(px + face * S * 0.04 + S * 0.04, py - S * 0.1, S * 0.05, S * 0.06);
          g.fillStyle = 'rgba(255,255,255,.6)'; g.font = 'bold 14px system-ui'; g.fillText(`Level ${lvl + 1}`, 12, 22);
          if (won) banner(g, W, H, '🎉 Solved!', lvl < SOKO.length - 1 ? `${moves} moves — Enter / ▶ for the next level` : `${moves} moves — you finished every level!`);
        },
      };
    });
    return () => cleanupG && cleanupG();
  } };

  /* ================= 8-BALL POOL ================= */
  GAMES.pool = { name: '8-Ball Pool', icon: '🎱', desc: 'Real 8-ball rules vs. the CPU or a friend. Drag back from the cue ball to aim and set power, release to shoot. Ball-in-hand after a foul.', run(host) {
    const W = 800, H = 440, M = 40, BR = 10, PR = 19; const TW = W - 2 * M, TH = H - 2 * M;
    const COLS = ['#fff', '#facc15', '#2563eb', '#dc2626', '#7c3aed', '#f97316', '#16a34a', '#7f1d1d', '#111', '#facc15', '#2563eb', '#dc2626', '#7c3aed', '#f97316', '#16a34a', '#7f1d1d'];
    const pockets = [[M, M], [W / 2, M - 4], [W - M, M], [M, H - M], [W / 2, H - M + 4], [W - M, H - M]];
    return canvasGame(host, W, H, ({ g, cv, info }) => {
      const turnEl = h('strong'), groupEl = h('span.small'), modeBtn = h('button.btn.sm'); info.append(turnEl, groupEl, modeBtn);
      let balls, turn, groups, vsCpu = true, state, aim = null, msg, msgT, pottedThisShot, firstHit, foul, winner, cpuT, hand;
      modeBtn.onclick = () => { vsCpu = !vsCpu; reset(); }; 
      function rack() { const b = [{ n: 0, x: M + TW * 0.25, y: H / 2 }]; const order = [1, 9, 2, 10, 8, 3, 11, 4, 12, 5, 13, 6, 14, 7, 15]; const sx = M + TW * 0.72; let k = 0; for (let c = 0; c < 5; c++) for (let r = 0; r <= c; r++) b.push({ n: order[k++], x: sx + c * BR * 1.75, y: H / 2 + (r - c / 2) * BR * 2.02 }); // put 8 in the middle
        const i8 = b.findIndex((q) => q.n === 8), mid = 5; [b[i8].n, b[mid].n] = [b[mid].n, b[i8].n]; b.forEach((q) => { q.vx = 0; q.vy = 0; q.in = false; }); return b; }
      function reset() { balls = rack(); turn = 0; groups = [null, null]; state = 'aim'; msg = 'Break!'; msgT = 2; winner = null; hand = false; modeBtn.textContent = vsCpu ? '🤖 vs CPU' : '👥 2 players'; }
      reset();
      const cue = () => balls[0]; const name = (p) => (vsCpu ? (p ? 'CPU' : 'You') : 'Player ' + (p + 1)); const kind = (n) => (n === 0 ? 'cue' : n === 8 ? 'eight' : n < 8 ? 'solids' : 'stripes');
      const left = (p) => groups[p] ? balls.filter((b) => !b.in && kind(b.n) === groups[p]).length : 7;
      const say = (m) => { msg = m; msgT = 2.2; };
      const ptr = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
      const human = () => !(vsCpu && turn === 1);
      cv.addEventListener('pointerdown', (e) => { if (winner != null) return reset(); if (state !== 'aim' || !human()) return; const [x, y] = ptr(e); if (hand) { if (placeOk(x, y)) { cue().x = x; cue().y = y; cue().in = false; hand = false; } return; } aim = { x, y, sx: x, sy: y }; cv.setPointerCapture?.(e.pointerId); });
      cv.addEventListener('pointermove', (e) => { const [x, y] = ptr(e); if (aim) { aim.x = x; aim.y = y; } else if (hand && human()) { hoverHand = [x, y]; } });
      cv.addEventListener('pointerup', () => { if (!aim) return; const c = cue(); const dx = c.x - aim.x, dy = c.y - aim.y; const d = Math.hypot(dx, dy); const pw = Math.min(1, Math.hypot(aim.x - aim.sx, aim.y - aim.sy) / 180); aim = null; if (pw < 0.03 || d < 1) return; shoot(Math.atan2(dy, dx), pw); });
      let hoverHand = null;
      const placeOk = (x, y) => x > M + BR && x < W - M - BR && y > M + BR && y < H - M - BR && balls.every((b) => b.n === 0 || b.in || Math.hypot(b.x - x, b.y - y) > 2 * BR + 1);
      function shoot(ang, pw) { const c = cue(); c.vx = Math.cos(ang) * pw * 1400; c.vy = Math.sin(ang) * pw * 1400; state = 'moving'; pottedThisShot = []; firstHit = null; foul = null; MS.sfx?.('blip'); }
      function physics(dt) {
        const live = balls.filter((b) => !b.in);
        live.forEach((b) => { b.x += b.vx * dt; b.y += b.vy * dt; const sp = Math.hypot(b.vx, b.vy); if (sp > 0) { const f = Math.max(0, sp - 160 * dt) / sp; b.vx *= f; b.vy *= f; if (sp < 4) b.vx = b.vy = 0; }
          for (const [px, py] of pockets) if (Math.hypot(b.x - px, b.y - py) < PR) { b.in = true; b.vx = b.vy = 0; pottedThisShot.push(b.n); return; }
          const nearPocket = pockets.some(([px, py]) => Math.hypot(b.x - px, b.y - py) < PR * 1.9);
          if (!nearPocket) { if (b.x < M + BR) { b.x = M + BR; b.vx = Math.abs(b.vx) * 0.8; } if (b.x > W - M - BR) { b.x = W - M - BR; b.vx = -Math.abs(b.vx) * 0.8; } if (b.y < M + BR) { b.y = M + BR; b.vy = Math.abs(b.vy) * 0.8; } if (b.y > H - M - BR) { b.y = H - M - BR; b.vy = -Math.abs(b.vy) * 0.8; } }
          else if (b.x < M - 30 || b.x > W - M + 30 || b.y < M - 30 || b.y > H - M + 30) { b.in = true; pottedThisShot.push(b.n); } });
        for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) { const a = live[i], b = live[j]; if (a.in || b.in) continue; const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy); if (d >= 2 * BR || d === 0) continue; const nx = dx / d, ny = dy / d, ov = 2 * BR - d; a.x -= nx * ov / 2; a.y -= ny * ov / 2; b.x += nx * ov / 2; b.y += ny * ov / 2; const rv = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny; if (rv <= 0) continue; const imp = rv * 0.97; a.vx -= imp * nx; a.vy -= imp * ny; b.vx += imp * nx; b.vy += imp * ny; if (firstHit == null && (a.n === 0 || b.n === 0)) firstHit = a.n === 0 ? b.n : a.n; }
      }
      function endShot() {
        const p = turn, o = 1 - p; const pot = pottedThisShot.filter((n) => n !== 0); let keep = false;
        if (pottedThisShot.includes(0)) foul = 'Scratch!'; else if (firstHit == null) foul = 'No ball hit'; else if (groups[p] && kind(firstHit) !== groups[p] && !(left(p) === 0 && firstHit === 8)) foul = 'Hit the wrong group first';
        if (pot.includes(8)) { const cleared = groups[p] && balls.filter((b) => kind(b.n) === groups[p] && !b.in).length === 0; winner = cleared && !foul ? p : o; say(winner === p ? `${name(p)} sank the 8 — wins! 🏆` : `${name(p)} sank the 8 early — ${name(o)} wins!`); state = 'over'; if (vsCpu) report('8-Ball Pool', winner === 0 ? 1 : 0); return; }
        if (!groups[p] && pot.length && !foul) { const k = kind(pot[0]); groups[p] = k; groups[o] = k === 'solids' ? 'stripes' : 'solids'; say(`${name(p)}: ${k}`); }
        if (!foul && groups[p] && pot.some((n) => kind(n) === groups[p])) keep = true;
        if (foul) { say(foul + ` Ball in hand for ${name(o)}`); turn = o; hand = true; if (pottedThisShot.includes(0)) { cue().in = true; } } else if (!keep) { turn = o; if (msgT <= 0) say(`${name(o)}'s turn`); }
        if (hand) { const c = cue(); c.in = false; c.vx = c.vy = 0; if (!placeOk(c.x, c.y) || pottedThisShot.includes(0)) { c.x = M + TW * 0.25; c.y = H / 2; let t = 0; while (!placeOk(c.x, c.y) && t++ < 50) c.y += 3; } }
        state = 'aim'; cpuT = 0.9;
      }
      function cpuShot() {
        // ball in hand: keep current spot. Score every (target ball, pocket) pair by angle and blocking.
        const c = cue(); const mine = balls.filter((b) => !b.in && b.n !== 0 && (groups[1] ? (left(1) === 0 ? b.n === 8 : kind(b.n) === groups[1]) : b.n !== 8));
        const clear = (x1, y1, x2, y2, skip) => balls.every((b) => b.in || skip.includes(b) || (() => { const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy; const t = Math.max(0, Math.min(1, ((b.x - x1) * dx + (b.y - y1) * dy) / l)); return Math.hypot(x1 + t * dx - b.x, y1 + t * dy - b.y) > 2 * BR; })());
        let best = null; mine.forEach((t) => pockets.forEach(([px, py]) => { const a2p = Math.atan2(py - t.y, px - t.x); const gx = t.x - Math.cos(a2p) * 2 * BR, gy = t.y - Math.sin(a2p) * 2 * BR; const aim = Math.atan2(gy - c.y, gx - c.x); let cut = Math.abs(((aim - a2p + Math.PI * 3) % (Math.PI * 2)) - Math.PI); if (cut > 1.25) return; const ok = clear(c.x, c.y, gx, gy, [c, t]) && clear(t.x, t.y, px, py, [t]); const dist = Math.hypot(gx - c.x, gy - c.y) + Math.hypot(px - t.x, py - t.y); const s = (ok ? 0 : 1000) + cut * 300 + dist * 0.3; if (!best || s < best.s) best = { s, aim, dist }; }));
        if (!best) { const t = mine[0] || balls.find((b) => !b.in && b.n !== 0); best = { aim: Math.atan2(t.y - c.y, t.x - c.x), dist: 400 }; }
        const err = (Math.random() - 0.5) * 0.035; shoot(best.aim + err, Math.min(1, 0.35 + best.dist / 1100));
      }
      return {
        update(dt) { msgT -= dt; if (state === 'moving') { for (let i = 0; i < 8; i++) physics(dt / 8); if (balls.every((b) => b.in || (b.vx === 0 && b.vy === 0))) endShot(); }
          else if (state === 'aim' && !human() && winner == null) { cpuT -= dt; if (cpuT <= 0) { hand = false; cpuShot(); } } },
        draw() {
          turnEl.textContent = winner != null ? '🏆 ' + name(winner) + ' wins' : '🎯 ' + name(turn) + (hand ? ' (ball in hand)' : ''); groupEl.textContent = groups[0] ? `${name(0)}: ${groups[0]} (${left(0)} left) · ${name(1)}: ${groups[1]} (${left(1)} left)` : 'Table open';
          g.fillStyle = '#5b3a1e'; g.fillRect(0, 0, W, H); g.fillStyle = '#7c4a22'; g.fillRect(8, 8, W - 16, H - 16);
          const fe = g.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, W / 1.6); fe.addColorStop(0, '#15803d'); fe.addColorStop(1, '#0f5c2c'); g.fillStyle = fe; g.fillRect(M - 14, M - 14, TW + 28, TH + 28);
          g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.arc(M + TW * 0.25, H / 2, 3, 0, 7); g.fill(); g.strokeStyle = 'rgba(255,255,255,.1)'; g.beginPath(); g.moveTo(M + TW * 0.25, M); g.lineTo(M + TW * 0.25, H - M); g.stroke();
          [[M + TW * 0.25], [W / 2], [M + TW * 0.75]].forEach(([x]) => { g.fillStyle = '#f5f5f4'; [[x, 22], [x, H - 22]].forEach(([a, b]) => { g.beginPath(); g.arc(a, b, 3, 0, 7); g.fill(); }); });
          pockets.forEach(([x, y]) => { g.fillStyle = '#0a0a0a'; g.beginPath(); g.arc(x, y, PR, 0, 7); g.fill(); });
          balls.forEach((b) => { if (b.in) return; g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.arc(b.x + 2, b.y + 3, BR, 0, 7); g.fill();
            const col = COLS[b.n]; g.save(); g.beginPath(); g.arc(b.x, b.y, BR, 0, 7); g.clip(); g.fillStyle = b.n > 8 ? '#fafafa' : col; g.fillRect(b.x - BR, b.y - BR, 2 * BR, 2 * BR); if (b.n > 8) { g.fillStyle = col; g.fillRect(b.x - BR, b.y - BR * 0.55, 2 * BR, BR * 1.1); } g.restore();
            if (b.n) { g.fillStyle = '#fff'; g.beginPath(); g.arc(b.x, b.y, BR * 0.45, 0, 7); g.fill(); g.fillStyle = '#111'; g.font = 'bold 8px system-ui'; g.textAlign = 'center'; g.fillText(b.n, b.x, b.y + 3); }
            const sh = g.createRadialGradient(b.x - 3, b.y - 4, 1, b.x, b.y, BR); sh.addColorStop(0, 'rgba(255,255,255,.7)'); sh.addColorStop(0.4, 'rgba(255,255,255,0)'); g.fillStyle = sh; g.beginPath(); g.arc(b.x, b.y, BR, 0, 7); g.fill(); });
          if (hand && human() && hoverHand && state === 'aim') { g.strokeStyle = placeOk(...hoverHand) ? '#fff' : '#ef4444'; g.setLineDash([4, 4]); g.beginPath(); g.arc(hoverHand[0], hoverHand[1], BR, 0, 7); g.stroke(); g.setLineDash([]); }
          if (state === 'aim' && human() && !hand && !cue().in) { const c = cue(); let ang, pw = 0; if (aim) { ang = Math.atan2(c.y - aim.y, c.x - aim.x); pw = Math.min(1, Math.hypot(aim.x - aim.sx, aim.y - aim.sy) / 180); } if (ang != null) {
              // guide line with first-contact ghost ball
              let hitD = 2000, hb = null; balls.forEach((b) => { if (b.in || b.n === 0) return; const dx = b.x - c.x, dy = b.y - c.y; const t = dx * Math.cos(ang) + dy * Math.sin(ang); if (t <= 0) return; const perp = Math.abs(-dx * Math.sin(ang) + dy * Math.cos(ang)); if (perp >= 2 * BR) return; const d = t - Math.sqrt(4 * BR * BR - perp * perp); if (d < hitD) { hitD = d; hb = b; } });
              const ex = c.x + Math.cos(ang) * Math.min(hitD, 900), ey = c.y + Math.sin(ang) * Math.min(hitD, 900); g.strokeStyle = 'rgba(255,255,255,.6)'; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(c.x, c.y); g.lineTo(ex, ey); g.stroke(); g.setLineDash([]);
              if (hb) { g.strokeStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.arc(ex, ey, BR, 0, 7); g.stroke(); const na = Math.atan2(hb.y - ey, hb.x - ex); g.strokeStyle = 'rgba(250,204,21,.8)'; g.beginPath(); g.moveTo(hb.x, hb.y); g.lineTo(hb.x + Math.cos(na) * 60, hb.y + Math.sin(na) * 60); g.stroke(); }
              const back = 14 + pw * 70; g.strokeStyle = '#d6a76a'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(c.x - Math.cos(ang) * back, c.y - Math.sin(ang) * back); g.lineTo(c.x - Math.cos(ang) * (back + 260), c.y - Math.sin(ang) * (back + 260)); g.stroke(); g.lineWidth = 1;
              g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(W / 2 - 80, H - 30, 160, 12); g.fillStyle = `hsl(${120 - pw * 120},80%,50%)`; g.fillRect(W / 2 - 80, H - 30, 160 * pw, 12); } }
          g.textAlign = 'center'; if (msgT > 0) { g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(W / 2 - 200, 14, 400, 24); g.fillStyle = '#fde047'; g.font = 'bold 15px system-ui'; g.fillText(msg, W / 2, 31); }
          if (state === 'aim' && human() && !aim && !hand && msgT <= 0) { g.fillStyle = 'rgba(255,255,255,.55)'; g.font = '13px system-ui'; g.fillText('Drag back from anywhere to aim & power — release to shoot', W / 2, H - 12); }
          if (hand && human() && state === 'aim') { g.fillStyle = 'rgba(255,255,255,.7)'; g.font = '13px system-ui'; g.fillText('Ball in hand — tap the table to place the cue ball', W / 2, H - 12); }
          g.textAlign = 'left'; if (winner != null) banner(g, W, H, '🏆 ' + name(winner) + ' wins!', 'Tap to rack up again');
        },
      };
    });
  } };

  /* ================= BOWLING ================= */
  GAMES.bowling = { name: 'Bowling', icon: '🎳', desc: 'Ten frames of ten-pin with real scoring (strikes, spares, 10th-frame bonus). Move to position, then drag up to throw — curve your swipe for hook spin.', run(host) {
    const W = 360, H = 640, LX = 80, LW = 200, BR = 13, PRd = 8, FOUL = 566;
    return canvasGame(host, W, H, ({ g, cv, info }) => {
      const sc = h('strong'), best = h('span.small.muted'); info.append(sc, best); MS.arcade.getScores().then((s) => (best.textContent = 'Best ' + (s.data.best.Bowling || 0)));
      let frames, fi, roll, pins, ball, state, path, msg, msgT, standingBefore, settleT;
      const PIN_POS = () => { const p = []; const top = 70, gap = 26; for (let r = 0; r < 4; r++) for (let i = 0; i <= r; i++) p.push({ x: W / 2 + (i - r / 2) * gap * 1.15, y: top + (3 - r) * gap, vx: 0, vy: 0, down: false, gone: false }); return p; };
      const reset = () => { frames = Array.from({ length: 10 }, () => []); fi = 0; roll = 0; pins = PIN_POS(); newBall(); msg = 'Drag up to bowl'; msgT = 2; };
      const newBall = () => { ball = { x: W / 2, y: 545, vx: 0, vy: 0, spin: 0, live: false }; state = 'aim'; path = []; };
      reset();
      const standing = () => pins.filter((p) => !p.down).length;
      const scoreOf = () => { const r = []; frames.forEach((f) => r.push(...f)); let total = 0, i = 0; const cum = []; for (let f = 0; f < 10; f++) { if (r[i] == null) break; if (r[i] === 10) { if (r[i + 2] == null) break; total += 10 + r[i + 1] + r[i + 2]; i++; } else { if (r[i + 1] == null) break; if (r[i] + r[i + 1] === 10) { if (r[i + 2] == null) break; total += 10 + r[i + 2]; } else total += r[i] + r[i + 1]; i += 2; } cum[f] = total; } return cum; };
      const ptr = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
      let drag = null;
      cv.addEventListener('pointerdown', (e) => { if (state === 'done') { reset(); return; } if (state !== 'aim') return; const [x, y] = ptr(e); drag = [[x, y, performance.now()]]; cv.setPointerCapture?.(e.pointerId); });
      cv.addEventListener('pointermove', (e) => { if (!drag) { if (state === 'aim') { const [x] = ptr(e); ball.x = Math.max(LX + BR, Math.min(LX + LW - BR, x)); } return; } const [x, y] = ptr(e); drag.push([x, y, performance.now()]); if (drag.length < 3) ball.x = Math.max(LX + BR, Math.min(LX + LW - BR, x)); });
      cv.addEventListener('pointerup', () => { if (!drag) return; const d = drag; drag = null; if (d.length < 3) return; const a = d[0], b = d[d.length - 1]; const dt = Math.max(30, b[2] - a[2]); const dy = a[1] - b[1]; if (dy < 30) return; const dx = b[0] - a[0]; const mid = d[Math.floor(d.length / 2)]; const bow = (mid[0] - (a[0] + b[0]) / 2); const speed = Math.min(900, Math.max(320, (dy / dt) * 1000 * 0.9)); throwBall(Math.atan2(dx, dy) * 0.6, speed, -bow * 2.2); });
      function throwBall(ang, speed, spin) { ball.vx = Math.sin(ang) * speed * 0.35; ball.vy = -Math.cos(ang) * speed; ball.spin = Math.max(-260, Math.min(260, spin)); ball.live = true; state = 'roll'; standingBefore = standing(); settleT = 0; }
      function physics(dt) {
        if (ball.live) { if (ball.y < 380) ball.vx += ball.spin * dt; ball.x += ball.vx * dt; ball.y += ball.vy * dt; path.push([ball.x, ball.y]); if (ball.x < LX + BR - 2 || ball.x > LX + LW - BR + 2) { ball.vx = 0; ball.x = ball.x < W / 2 ? LX - 12 : LX + LW + 12; ball.gutter = true; } if (ball.y < -20) ball.live = false; }
        pins.forEach((p) => { if (p.gone) return; p.x += p.vx * dt; p.y += p.vy * dt; const f = Math.max(0, 1 - 2.2 * dt); p.vx *= f; p.vy *= f; if (p.x < LX - 10 || p.x > LX + LW + 10 || p.y < 10) { p.gone = true; p.down = true; } });
        const hitC = (a, b, ra, rb, ma, mb) => { const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy); if (d >= ra + rb || d === 0) return false; const nx = dx / d, ny = dy / d, ov = ra + rb - d; a.x -= nx * ov * mb / (ma + mb); a.y -= ny * ov * mb / (ma + mb); b.x += nx * ov * ma / (ma + mb); b.y += ny * ov * ma / (ma + mb); const rv = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny; if (rv <= 0) return true; const j = (1.8 * rv) / (1 / ma + 1 / mb); a.vx -= (j / ma) * nx; a.vy -= (j / ma) * ny; b.vx += (j / mb) * nx; b.vy += (j / mb) * ny; return true; };
        if (ball.live && !ball.gutter) pins.forEach((p) => { if (!p.gone && hitC(ball, p, BR, PRd, 6, 1)) { p.down = true; p.vx += (Math.random() - 0.5) * 60; } });
        for (let i = 0; i < pins.length; i++) for (let j = i + 1; j < pins.length; j++) { const a = pins[i], b = pins[j]; if (a.gone || b.gone) continue; if (hitC(a, b, PRd, PRd, 1, 1)) { if (Math.hypot(a.vx, a.vy) > 25) b.down = true; if (Math.hypot(b.vx, b.vy) > 25) a.down = true; } }
      }
      function endRoll() {
        const knocked = standingBefore - standing(); const f = frames[fi]; f.push(knocked); const last = fi === 9; let next = false, resetPins = false;
        if (!last) { if (roll === 0 && knocked === 10) { msg = 'STRIKE! 💥'; next = true; } else if (roll === 1) { msg = f[0] + f[1] === 10 ? 'SPARE! ✨' : `${f[0] + f[1]} pins`; next = true; } else msg = knocked + (knocked === 1 ? ' pin' : ' pins'); }
        else { const f0 = f[0], f1 = f[1];
          if (roll === 0) { if (knocked === 10) { msg = 'STRIKE! 💥'; resetPins = true; } else msg = knocked + ' pins'; }
          else if (roll === 1) { if (f0 === 10) { if (knocked === 10) { msg = 'STRIKE! 💥'; resetPins = true; } else msg = knocked + ' pins'; } else if (f0 + f1 === 10) { msg = 'SPARE! ✨'; resetPins = true; } else { msg = `${f0 + f1} pins`; next = true; } }
          else { msg = knocked === 10 ? 'STRIKE! 💥' : knocked + ' pins'; next = true; } }
        msgT = 1.6; roll++;
        if (next) { fi++; roll = 0; pins = PIN_POS(); if (fi >= 10) { state = 'done'; const s = scoreOf()[9] || 0; msg = `Game over — ${s}${s === 300 ? ' PERFECT GAME!' : ''}`; msgT = 99; report('Bowling', s).then(() => MS.arcade.getScores().then((x) => (best.textContent = 'Best ' + (x.data.best.Bowling || 0)))); return; } }
        else if (resetPins) pins = PIN_POS(); else pins = pins.filter((p) => !p.down);
        newBall();
      }
      return {
        update(dt) { msgT -= dt; if (state === 'roll') { for (let i = 0; i < 6; i++) physics(dt / 6); const moving = pins.some((p) => !p.gone && Math.hypot(p.vx, p.vy) > 8); if (!ball.live || ball.y < -10) { settleT += dt; if (settleT > 1.1 && !moving) endRoll(); } } },
        draw() {
          const cum = scoreOf(); sc.textContent = `Frame ${Math.min(10, fi + 1)} · Score ${cum.filter((x) => x != null).pop() || 0}`;
          g.fillStyle = '#1f2937'; g.fillRect(0, 0, W, H); g.fillStyle = '#374151'; g.fillRect(LX - 22, 0, 22, H); g.fillRect(LX + LW, 0, 22, H);
          const wood = g.createLinearGradient(LX, 0, LX + LW, 0); wood.addColorStop(0, '#d9a066'); wood.addColorStop(0.5, '#f0c38a'); wood.addColorStop(1, '#d9a066'); g.fillStyle = wood; g.fillRect(LX, 0, LW, H);
          g.strokeStyle = 'rgba(120,70,20,.18)'; for (let x = LX; x < LX + LW; x += 10) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
          g.fillStyle = '#7c2d12'; for (let i = 0; i < 7; i++) { const x = LX + 25 + i * 25; g.beginPath(); g.moveTo(x, 430); g.lineTo(x - 5, 442); g.lineTo(x + 5, 442); g.fill(); } g.fillStyle = '#ef4444'; g.fillRect(LX, FOUL, LW, 3);
          if (path.length > 1) { g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 2; g.beginPath(); path.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); }
          pins.forEach((p) => { if (p.gone) return; g.save(); g.translate(p.x, p.y); if (p.down) { g.rotate(Math.atan2(p.vy, p.vx) || 1); g.fillStyle = '#f5f5f4'; g.beginPath(); g.ellipse(0, 0, PRd * 1.6, PRd * 0.7, 0, 0, 7); g.fill(); g.fillStyle = '#dc2626'; g.fillRect(-2, -PRd * 0.7, 3, PRd * 1.4); } else { g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(2, 3, PRd, 0, 7); g.fill(); const gr = g.createRadialGradient(-2, -2, 1, 0, 0, PRd); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#d6d3d1'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, PRd, 0, 7); g.fill(); g.strokeStyle = '#dc2626'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, PRd * 0.55, 0, 7); g.stroke(); } g.restore(); });
          if (ball.y > -20) { const bg = g.createRadialGradient(ball.x - 4, ball.y - 4, 2, ball.x, ball.y, BR); bg.addColorStop(0, '#60a5fa'); bg.addColorStop(1, '#1e3a8a'); g.fillStyle = bg; g.beginPath(); g.arc(ball.x, ball.y, BR, 0, 7); g.fill(); g.fillStyle = '#0f172a'; [[-3, -4], [3, -4], [0, 2]].forEach(([dx, dy]) => { g.beginPath(); g.arc(ball.x + dx, ball.y + dy, 1.8, 0, 7); g.fill(); }); }
          if (drag && drag.length > 1) { g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 3; g.beginPath(); drag.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); }
          // scorecard
          g.fillStyle = 'rgba(15,23,42,.9)'; g.fillRect(0, H - 62, W, 62); const fw = W / 10; frames.forEach((f, i) => { const x = i * fw; g.strokeStyle = i === fi ? '#facc15' : '#475569'; g.lineWidth = 1; g.strokeRect(x + 1, H - 60, fw - 2, 58); g.fillStyle = '#94a3b8'; g.font = '9px system-ui'; g.textAlign = 'center'; g.fillText(i + 1, x + fw / 2, H - 50);
            const marks = f.map((v, k) => { const tenth = i === 9; if (k === 0) return v === 10 ? 'X' : v ? String(v) : '–'; if (k === 1) { if (tenth && f[0] === 10) return v === 10 ? 'X' : v ? String(v) : '–'; return f[0] + v === 10 ? '/' : v ? String(v) : '–'; } const fresh = (f[0] === 10 && f[1] === 10) || (f[0] < 10 && f[0] + f[1] === 10); if (fresh) return v === 10 ? 'X' : v ? String(v) : '–'; return f[1] + v === 10 ? '/' : v ? String(v) : '–'; });
            g.fillStyle = '#f8fafc'; g.font = 'bold 11px system-ui'; g.fillText(marks.join(' '), x + fw / 2, H - 34); if (cum[i] != null) { g.font = 'bold 13px system-ui'; g.fillStyle = '#facc15'; g.fillText(cum[i], x + fw / 2, H - 12); } });
          g.textAlign = 'center'; if (msgT > 0) { g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(40, 250, W - 80, 40); g.fillStyle = '#fde047'; g.font = 'bold 20px system-ui'; g.fillText(msg, W / 2, 277); }
          if (state === 'aim' && msgT <= 0) { g.fillStyle = 'rgba(0,0,0,.55)'; g.font = '12px system-ui'; g.fillText('Slide to position · drag up fast to bowl · curve for hook', W / 2, 505); }
          if (state === 'done') { g.fillStyle = 'rgba(255,255,255,.8)'; g.font = '13px system-ui'; g.fillText('Tap to play again', W / 2, 310); }
          g.textAlign = 'left';
        },
      };
    });
  } };

  Object.entries(GAMES).forEach(([k, gm]) => { if (!MS.commands.some((c) => c.id === 'game-' + k)) MS.command({ id: 'game-' + k, title: 'Play ' + gm.name, icon: gm.icon, group: 'Arcade', run: () => MS.go('arcade', k) }); });
  if (MS.appMap.arcade) MS.appMap.arcade.desc = Object.keys(GAMES).length + ' games with high scores';
})();
