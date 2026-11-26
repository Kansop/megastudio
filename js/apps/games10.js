/* Arcade 10: Pinball (full table: flippers, plunger, bumpers, slingshots, drop targets, rollover lanes, multiplier, ball save) */
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

  Object.entries(GAMES).forEach(([k, gm]) => { if (!MS.commands.some((c) => c.id === 'game-' + k)) MS.command({ id: 'game-' + k, title: 'Play ' + gm.name, icon: gm.icon, group: 'Arcade', run: () => MS.go('arcade', k) }); });
  if (MS.appMap.arcade) MS.appMap.arcade.desc = Object.keys(GAMES).length + ' games with high scores';
})();
