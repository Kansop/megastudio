/* Arcade 9: Fruit Slice (swipe to slice, dodge bombs), Air Hockey (vs. AI, first to 7), Hop Road (endless road/river crosser) */
(function () {
  const { h } = MS; const { GAMES, report, canvasGame, banner, swipe } = MS.arcade;
  const ptr = (cv, e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };

  /* ================= FRUIT SLICE ================= */
  GAMES.fruit = { name: 'Fruit Slice', icon: '🍉', desc: 'Swipe through flying fruit. Combos score extra — slice a bomb and it\'s over. Miss 3 fruit and you\'re out.', run(host) {
    const W = 640, H = 480; const FRUITS = [['🍉', '#22c55e', '#ef4444', 34], ['🍊', '#f97316', '#fdba74', 26], ['🍎', '#dc2626', '#fef3c7', 26], ['🍋', '#eab308', '#fef08a', 24], ['🍇', '#7c3aed', '#c4b5fd', 24], ['🥝', '#65a30d', '#bef264', 24], ['🍍', '#ca8a04', '#fde047', 30], ['🍑', '#fb923c', '#fed7aa', 26]];
    return canvasGame(host, W, H, ({ g, cv, info }) => {
      const sc = h('strong'), lv = h('span'), best = h('span.small.muted'); info.append(sc, lv, best, h('span.small.muted', 'drag / swipe to slice'));
      let items, halves, splats, trail, score, lives, over, t, next, combo, pops, started;
      const reset = () => { items = []; halves = []; splats = []; trail = []; score = 0; lives = 3; over = false; t = 0; next = 0.8; pops = []; started = true; MS.arcade.getScores().then((s) => (best.textContent = 'Best ' + (s.data.best['Fruit Slice'] || 0))); };
      reset(); started = false;
      const launch = () => { const n = 1 + Math.floor(Math.random() * Math.min(5, 1 + t / 15)); for (let i = 0; i < n; i++) { const bomb = Math.random() < Math.min(0.22, 0.06 + t / 300); const x = 80 + Math.random() * (W - 160); items.push({ x, y: H + 40, vx: (W / 2 - x) * (0.3 + Math.random() * 0.5) + (Math.random() - 0.5) * 80, vy: -(560 + Math.random() * 160), r: bomb ? 24 : 0, rot: 0, vr: (Math.random() - 0.5) * 6, bomb, f: FRUITS[(Math.random() * FRUITS.length) | 0] }); items[items.length - 1].r = bomb ? 24 : items[items.length - 1].f[3]; } };
      let down = false;
      const segHit = (ax, ay, bx, by, o) => { const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1; const k = Math.max(0, Math.min(1, ((o.x - ax) * dx + (o.y - ay) * dy) / L)); const px = ax + k * dx - o.x, py = ay + k * dy - o.y; return px * px + py * py < o.r * o.r; };
      const move = (e) => { if (!down) return; const [x, y] = ptr(cv, e); const p = trail[trail.length - 1]; trail.push({ x, y, t: performance.now() }); if (!p || over) return; let cut = 0; items = items.filter((o) => { if (!segHit(p.x, p.y, x, y, o)) return true; if (o.bomb) { over = true; splats.push({ x: o.x, y: o.y, c: '#fff', r: 300, a: 1 }); report('Fruit Slice', score); return false; } cut++; const ang = Math.atan2(y - p.y, x - p.x); [-1, 1].forEach((s) => halves.push({ ...o, vx: o.vx + Math.cos(ang + s * Math.PI / 2) * 90, vy: o.vy * 0.4 + Math.sin(ang + s * Math.PI / 2) * 90, side: s, ang })); splats.push({ x: o.x, y: o.y, c: o.f[2], r: o.r * 1.6, a: 0.6 }); return false; }); if (cut) { const pts = cut >= 3 ? cut * 2 : cut; score += pts; if (cut >= 3) pops.push({ x, y, txt: `${cut}× combo +${pts}`, a: 1 }); } };
      cv.addEventListener('pointerdown', (e) => { if (over || !started) { reset(); return; } down = true; trail = []; move(e); cv.setPointerCapture(e.pointerId); }); cv.addEventListener('pointermove', move); cv.addEventListener('pointerup', () => (down = false));
      return {
        key(k) { if (k === ' ' && (over || !started)) reset(); },
        update(dt) { if (!started || over) { halves.forEach((o) => { o.vy += 900 * dt; o.x += o.vx * dt; o.y += o.vy * dt; }); return; } t += dt; next -= dt; if (next <= 0) { launch(); next = Math.max(0.7, 1.9 - t / 60) + Math.random() * 0.6; } [items, halves].forEach((arr) => arr.forEach((o) => { o.vy += 900 * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.rot += o.vr * dt; })); items = items.filter((o) => { if (o.y > H + 60 && o.vy > 0) { if (!o.bomb) { lives--; if (lives <= 0) { over = true; report('Fruit Slice', score); } } return false; } return true; }); halves = halves.filter((o) => o.y < H + 80); splats.forEach((s) => (s.a -= dt * 0.25)); splats = splats.filter((s) => s.a > 0); pops.forEach((p) => { p.a -= dt; p.y -= 30 * dt; }); pops = pops.filter((p) => p.a > 0); const now = performance.now(); trail = trail.filter((p) => now - p.t < 140); },
        draw() {
          const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#5b3a1e'); gr.addColorStop(1, '#3b2412'); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2; for (let x = 0; x < W; x += 80) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
          splats.forEach((s) => { g.globalAlpha = Math.max(0, s.a); g.fillStyle = s.c; g.beginPath(); g.arc(s.x, s.y, s.r, 0, 7); g.fill(); }); g.globalAlpha = 1;
          g.textAlign = 'center'; g.textBaseline = 'middle';
          items.forEach((o) => { g.save(); g.translate(o.x, o.y); g.rotate(o.rot); if (o.bomb) { g.fillStyle = '#111'; g.beginPath(); g.arc(0, 0, o.r, 0, 7); g.fill(); g.strokeStyle = '#ef4444'; g.lineWidth = 3; g.stroke(); g.font = '28px system-ui'; g.fillText('💣', 0, 2); g.fillStyle = Math.random() < 0.5 ? '#fde047' : '#f97316'; g.beginPath(); g.arc(o.r * 0.6, -o.r * 0.9, 5, 0, 7); g.fill(); } else { g.font = o.r * 2 + 'px system-ui'; g.fillText(o.f[0], 0, 2); } g.restore(); });
          halves.forEach((o) => { if (o.bomb) return; g.save(); g.translate(o.x, o.y); g.rotate(o.ang); g.beginPath(); g.rect(-o.r * 1.3, o.side < 0 ? -o.r * 1.3 : 0, o.r * 2.6, o.r * 1.3); g.clip(); g.rotate(-o.ang + o.rot); g.font = o.r * 2 + 'px system-ui'; g.fillText(o.f[0], 0, 2); g.restore(); });
          if (trail.length > 1) { g.lineCap = 'round'; for (let i = 1; i < trail.length; i++) { g.strokeStyle = `rgba(255,255,255,${i / trail.length})`; g.lineWidth = 2 + 8 * i / trail.length; g.beginPath(); g.moveTo(trail[i - 1].x, trail[i - 1].y); g.lineTo(trail[i].x, trail[i].y); g.stroke(); } }
          pops.forEach((p) => { g.globalAlpha = Math.max(0, p.a); g.fillStyle = '#fde047'; g.font = 'bold 26px system-ui'; g.fillText(p.txt, p.x, p.y); }); g.globalAlpha = 1;
          g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = 'bold 30px system-ui'; g.fillText(score, 16, 30); g.textAlign = 'right'; g.font = '24px system-ui'; g.fillText('❌'.repeat(3 - Math.max(0, lives)) + '⚪'.repeat(Math.max(0, lives)), W - 14, 28); g.textBaseline = 'alphabetic'; g.textAlign = 'left';
          sc.textContent = 'Score ' + score; lv.textContent = '❤️'.repeat(Math.max(0, lives));
          if (!started) banner(g, W, H, '🍉 Fruit Slice', 'Click or press Space to start'); else if (over) banner(g, W, H, lives <= 0 ? 'Out of lives!' : '💥 Bomb!', `Score ${score} — click to play again`);
        },
      };
    });
  } };

  /* ================= AIR HOCKEY ================= */
  GAMES.hockey = { name: 'Air Hockey', icon: '🏒', desc: 'Drag your mallet to smash the puck past the AI. First to 7 wins. Pick a difficulty.', run(host) {
    const W = 400, H = 640, GOAL = 130, PR = 16, MR = 30;
    const diffs = [['Easy', 280, 0.25], ['Normal', 420, 0.12], ['Hard', 620, 0.04]]; let diff = 1;
    const bar = h('div.row', { style: { justifyContent: 'center', gap: '6px' } }); host.append(bar);
    const drawBar = () => { bar.innerHTML = ''; diffs.forEach(([n], i) => bar.append(h('button.btn.sm', { class: i === diff ? 'on' : '', on: { click: () => { diff = i; drawBar(); api && api.restart(); } } }, n))); }; drawBar();
    let api;
    const stop = canvasGame(host, W, H, ({ g, cv, info }) => {
      const sc = h('strong'); info.append(sc, h('span.small.muted', 'drag your mallet (bottom) · first to 7'));
      let puck, me, ai, sMe, sAi, over, serve, flash, target = null, prev;
      const restart = () => { sMe = sAi = 0; over = false; me = { x: W / 2, y: H - 80, vx: 0, vy: 0 }; ai = { x: W / 2, y: 80, vx: 0, vy: 0 }; place(1); };
      const place = (toward) => { puck = { x: W / 2, y: H / 2 + toward * 60, vx: 0, vy: 0 }; serve = 0.8; };
      restart(); api = { restart };
      cv.addEventListener('pointerdown', (e) => { if (over) { restart(); return; } target = ptr(cv, e); cv.setPointerCapture(e.pointerId); });
      cv.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' || target) target = ptr(cv, e); });
      cv.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') target = null; });
      const collide = (m) => { const dx = puck.x - m.x, dy = puck.y - m.y, d = Math.hypot(dx, dy); if (d < PR + MR && d > 0) { const nx = dx / d, ny = dy / d; puck.x = m.x + nx * (PR + MR); puck.y = m.y + ny * (PR + MR); const rv = (puck.vx - m.vx) * nx + (puck.vy - m.vy) * ny; if (rv < 0) { puck.vx -= 1.9 * rv * nx; puck.vy -= 1.9 * rv * ny; } const sp = Math.hypot(puck.vx, puck.vy); if (sp > 1400) { puck.vx *= 1400 / sp; puck.vy *= 1400 / sp; } MS.arcade._clack && MS.arcade._clack(); } };
      const moveMallet = (m, tx, ty, maxV, dt, top) => { const ox = m.x, oy = m.y; let dx = tx - m.x, dy = ty - m.y; const d = Math.hypot(dx, dy), step = maxV * dt; if (d > step) { dx *= step / d; dy *= step / d; } m.x = Math.max(MR, Math.min(W - MR, m.x + dx)); m.y = top ? Math.max(MR, Math.min(H / 2 - MR, m.y + dy)) : Math.max(H / 2 + MR, Math.min(H - MR, m.y + dy)); m.vx = (m.x - ox) / dt; m.vy = (m.y - oy) / dt; };
      return {
        key(k) { if (k === ' ' && over) restart(); },
        update(dt) {
          if (over) return; if (target) moveMallet(me, target[0], target[1], 4000, dt, false); else { me.vx = me.vy = 0; }
          // AI
          const [, spd, err] = diffs[diff]; let tx, ty; if (puck.y < H / 2 + 20 && (puck.vy < 120 || puck.y < ai.y)) { if (puck.y < ai.y) { tx = puck.x + (puck.x < W / 2 ? 40 : -40); ty = puck.y - 50; } else { tx = puck.x + (Math.random() - 0.5) * err * 200; ty = puck.y - 10; } } else { tx = W / 2 + (puck.x - W / 2) * 0.4; ty = 70; }
          moveMallet(ai, tx, ty, spd, dt, true);
          if (serve > 0) { serve -= dt; } else { const sub = 4; for (let i = 0; i < sub; i++) { puck.x += puck.vx * dt / sub; puck.y += puck.vy * dt / sub; if (puck.x < PR) { puck.x = PR; puck.vx = Math.abs(puck.vx) * 0.9; } if (puck.x > W - PR) { puck.x = W - PR; puck.vx = -Math.abs(puck.vx) * 0.9; } const inGoal = Math.abs(puck.x - W / 2) < GOAL / 2; if (puck.y < PR && !inGoal) { puck.y = PR; puck.vy = Math.abs(puck.vy) * 0.9; } if (puck.y > H - PR && !inGoal) { puck.y = H - PR; puck.vy = -Math.abs(puck.vy) * 0.9; } collide(me); collide(ai); } puck.vx *= 1 - 0.25 * dt; puck.vy *= 1 - 0.25 * dt; }
          if (puck.y < -PR) { sMe++; flash = { t: 1, txt: 'GOAL! 🎉' }; place(-1); } else if (puck.y > H + PR) { sAi++; flash = { t: 1, txt: 'AI scores' }; place(1); }
          if (sMe >= 7 || sAi >= 7) { over = true; report('Air Hockey', sMe >= 7 ? (diff + 1) * 100 - sAi * 10 : sMe * 5); }
          if (flash) flash.t -= dt;
        },
        draw() {
          g.fillStyle = '#e0f2fe'; g.fillRect(0, 0, W, H); g.strokeStyle = '#ef4444'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke(); g.beginPath(); g.arc(W / 2, H / 2, 60, 0, 7); g.stroke(); g.strokeStyle = '#3b82f6'; [0, H].forEach((y) => { g.beginPath(); g.arc(W / 2, y, 90, 0, 7); g.stroke(); });
          g.fillStyle = '#0f172a'; g.fillRect(W / 2 - GOAL / 2, 0, GOAL, 6); g.fillRect(W / 2 - GOAL / 2, H - 6, GOAL, 6);
          g.fillStyle = 'rgba(0,0,0,.12)'; g.font = 'bold 120px system-ui'; g.textAlign = 'center'; g.fillText(sAi, W / 2, H / 4 + 40); g.fillText(sMe, W / 2, H * 3 / 4 + 40);
          const mallet = (m, c) => { g.fillStyle = 'rgba(0,0,0,.15)'; g.beginPath(); g.arc(m.x + 3, m.y + 4, MR, 0, 7); g.fill(); g.fillStyle = c; g.beginPath(); g.arc(m.x, m.y, MR, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(m.x, m.y, MR * 0.5, 0, 7); g.fill(); };
          mallet(ai, '#dc2626'); mallet(me, '#2563eb');
          g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.arc(puck.x + 2, puck.y + 3, PR, 0, 7); g.fill(); g.fillStyle = '#111827'; g.beginPath(); g.arc(puck.x, puck.y, PR, 0, 7); g.fill(); g.strokeStyle = '#fbbf24'; g.lineWidth = 2; g.beginPath(); g.arc(puck.x, puck.y, PR - 5, 0, 7); g.stroke();
          if (flash && flash.t > 0) { g.globalAlpha = flash.t; g.fillStyle = '#0f172a'; g.font = 'bold 40px system-ui'; g.fillText(flash.txt, W / 2, H / 2 - 20); g.globalAlpha = 1; }
          g.textAlign = 'left'; sc.textContent = `You ${sMe} : ${sAi} AI`;
          if (over) banner(g, W, H, sMe >= 7 ? '🏆 You win!' : 'AI wins', `${sMe} : ${sAi} — click to play again`);
        },
      };
    });
    return stop;
  } };

  /* ================= HOP ROAD ================= */
  GAMES.hop = { name: 'Hop Road', icon: '🐔', desc: 'Hop forward across endless roads, rails and rivers. Ride the logs, dodge the traffic, don\'t dawdle.', run(host) {
    const COLS = 11, S = 44, W = COLS * S, H = 640, VIS = Math.ceil(H / S) + 2;
    return canvasGame(host, W, H, ({ g, cv, info }) => {
      const sc = h('strong'), best = h('span.small.muted'); info.append(sc, best, h('span.small.muted', 'arrows / WASD / swipe · tap = hop'));
      let rows, p, score, over, camY, idle, deathMsg, started, hopT;
      const rowAt = (i) => { while (rows.length <= i + VIS) genRow(rows.length); return rows[i]; };
      function genRow(i) {
        if (i < 4) { rows.push({ type: 'grass', trees: i === 0 ? [] : [0, COLS - 1] }); return; }
        const prev = rows[i - 1].type; const dif = Math.min(1, i / 150); const r = Math.random(); let type = r < 0.28 ? 'grass' : r < 0.62 ? 'road' : r < 0.74 ? 'rail' : 'water'; if (prev === 'water' && type === 'water' && rows[i - 2]?.type === 'water') type = 'grass';
        const dir = Math.random() < 0.5 ? 1 : -1;
        if (type === 'grass') { const trees = []; for (let c = 0; c < COLS; c++) if (Math.random() < 0.18 + dif * 0.1) trees.push(c); rows.push({ type, trees: trees.filter((c) => c !== 5 || Math.random() < 0.3) }); }
        else if (type === 'road') { const speed = (60 + Math.random() * 90 + dif * 100) * dir; const len = Math.random() < 0.25 ? 2.2 : 1.2; const gap = 2.5 + Math.random() * 3; const objs = []; for (let x = Math.random() * 4; x < COLS + 4; x += len + gap) objs.push({ x, len, color: ['#ef4444', '#3b82f6', '#f59e0b', '#a855f7', '#10b981', '#f97316'][(Math.random() * 6) | 0] }); rows.push({ type, speed, objs, span: COLS + 4 }); }
        else if (type === 'rail') rows.push({ type, speed: 900 * dir, objs: [], warn: 0, cd: 2 + Math.random() * 4 });
        else { const speed = (40 + Math.random() * 60 + dif * 40) * dir; const len = 2 + Math.floor(Math.random() * 2) + (dif < 0.5 ? 1 : 0); const objs = []; for (let x = Math.random() * 2; x < COLS + 4; x += len + 1.6 + Math.random() * 1.8) objs.push({ x, len, lily: Math.random() < 0.15 }); rows.push({ type, speed, objs, span: COLS + 4 }); }
      }
      const reset = () => { rows = []; for (let i = 0; i < VIS; i++) genRow(i); p = { c: 5, r: 1, x: 5, face: 0 }; score = 0; over = false; camY = 0; idle = 0; deathMsg = ''; hopT = 0; MS.arcade.getScores().then((s) => (best.textContent = 'Best ' + (s.data.best['Hop Road'] || 0))); };
      reset(); started = false;
      const die = (m) => { if (over) return; over = true; deathMsg = m; report('Hop Road', score); };
      const blocked = (c, r) => { const row = rowAt(r); return c < 0 || c >= COLS || r < 0 || (row.type === 'grass' && row.trees.includes(c)); };
      const hop = (dc, dr) => { if (over) { if (dr || dc) { reset(); started = true; } return; } started = true; const nc = Math.round(p.x) + dc, nr = p.r + dr; if (blocked(nc, nr)) return; p.c = nc; p.x = nc; p.r = nr; hopT = 0.12; idle = 0; p.face = dc ? (dc > 0 ? 1 : 3) : dr > 0 ? 0 : 2; if (p.r > score) score = p.r; };
      swipe(cv, (k) => key(k === 'tap' ? 'ArrowUp' : k));
      const key = (k) => { const m = { ArrowUp: [0, 1], w: [0, 1], ArrowDown: [0, -1], s: [0, -1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0], ' ': [0, 1] }[k]; if (m) hop(m[0], m[1]); };
      const yOf = (r) => H - (r + 1) * S + camY;
      return {
        key,
        update(dt) {
          rowAt(p.r + VIS);
          rows.forEach((row, i) => { if (i < p.r - 6 || i > p.r + VIS) return; if (row.type === 'road' || row.type === 'water') row.objs.forEach((o) => { o.x += row.speed * dt / S; if (row.speed > 0 && o.x > COLS + 1) o.x -= row.span + 1; if (row.speed < 0 && o.x + o.len < -1) o.x += row.span + 1; }); if (row.type === 'rail') { row.cd -= dt; if (!row.train && row.cd < 1.2) row.warn = 1; if (!row.train && row.cd <= 0) { row.train = { x: row.speed > 0 ? -12 : COLS + 1, len: 11 }; } if (row.train) { row.train.x += row.speed * dt / S; if (row.train.x > COLS + 14 || row.train.x < -26) { row.train = null; row.warn = 0; row.cd = 3 + Math.random() * 5; } } } });
          if (hopT > 0) hopT -= dt;
          const tgt = Math.max(0, (p.r - 4) * S); camY += (tgt - camY) * Math.min(1, dt * 4);
          if (!started || over) return;
          idle += dt; if (yOf(p.r) > H + 4) die('🦅 Too slow — swooped up!'); if (idle > 9) die('🦅 Too slow — swooped up!');
          const row = rowAt(p.r);
          if (row.type === 'road') { if (row.objs.some((o) => p.x + 0.8 > o.x + 0.07 && p.x + 0.2 < o.x + o.len - 0.07)) die('🚗 Splat!'); }
          if (row.type === 'rail' && row.train && p.x + 0.8 > row.train.x && p.x + 0.2 < row.train.x + row.train.len) die('🚆 Hit by a train!');
          if (row.type === 'water' && hopT <= 0) { const log = row.objs.find((o) => p.x + 0.5 > o.x && p.x + 0.5 < o.x + o.len); if (!log) die('💦 Fell in the river!'); else { p.x += row.speed * dt / S; if (p.x < -0.5 || p.x > COLS - 0.5) die('🌊 Swept away!'); } }
          else if (row.type !== 'water') p.x += (Math.round(p.x) - p.x) * Math.min(1, dt * 20);
        },
        draw() {
          const r0 = Math.max(0, Math.floor(camY / S) - 1);
          for (let r = r0; r < r0 + VIS + 1; r++) {
            const row = rowAt(r), y = yOf(r);
            if (row.type === 'grass') { g.fillStyle = r % 2 ? '#86efac' : '#7ddc9c'; g.fillRect(0, y, W, S); row.trees.forEach((c) => { g.fillStyle = '#7c4a1e'; g.fillRect(c * S + S / 2 - 4, y + S - 14, 8, 10); g.fillStyle = '#15803d'; g.beginPath(); g.arc(c * S + S / 2, y + S / 2 - 2, 15, 0, 7); g.fill(); g.fillStyle = '#22c55e'; g.beginPath(); g.arc(c * S + S / 2 - 4, y + S / 2 - 6, 8, 0, 7); g.fill(); }); }
            else if (row.type === 'road') { g.fillStyle = '#374151'; g.fillRect(0, y, W, S); g.fillStyle = '#9ca3af'; for (let x = 0; x < W; x += 40) g.fillRect(x + 8, y + S / 2 - 1, 20, 2); row.objs.forEach((o) => { const x = o.x * S, w = o.len * S - 6; g.fillStyle = o.color; g.fillRect(x + 3, y + 7, w, S - 14); g.fillStyle = 'rgba(255,255,255,.6)'; const fx = row.speed > 0 ? x + w - 10 : x + 6; g.fillRect(fx, y + 10, 7, S - 20); g.fillStyle = '#111'; [x + 8, x + w - 10].forEach((wx) => { g.fillRect(wx, y + 4, 8, 4); g.fillRect(wx, y + S - 8, 8, 4); }); }); }
            else if (row.type === 'rail') { g.fillStyle = '#a8a29e'; g.fillRect(0, y, W, S); g.fillStyle = '#78350f'; for (let x = 0; x < W; x += 14) g.fillRect(x, y + 6, 6, S - 12); g.fillStyle = '#d6d3d1'; g.fillRect(0, y + 12, W, 3); g.fillRect(0, y + S - 15, W, 3); if (row.warn && !row.train && (performance.now() / 200 | 0) % 2) { g.fillStyle = '#ef4444'; g.beginPath(); g.arc(W - 14, y + 10, 6, 0, 7); g.fill(); } if (row.train) { const x = row.train.x * S; g.fillStyle = '#1d4ed8'; g.fillRect(x, y + 4, row.train.len * S, S - 8); g.fillStyle = '#bfdbfe'; for (let k = 0; k < row.train.len; k++) g.fillRect(x + k * S + 8, y + 10, S - 16, 10); } }
            else { g.fillStyle = '#38bdf8'; g.fillRect(0, y, W, S); g.fillStyle = 'rgba(255,255,255,.25)'; for (let x = ((performance.now() / 40) % 30) - 30; x < W; x += 30) g.fillRect(x, y + S / 2, 12, 2); row.objs.forEach((o) => { if (o.lily) { g.fillStyle = '#16a34a'; for (let k = 0; k < o.len; k++) { g.beginPath(); g.arc((o.x + k + 0.5) * S, y + S / 2, S / 2 - 4, 0.3, Math.PI * 2 - 0.3); g.lineTo((o.x + k + 0.5) * S, y + S / 2); g.fill(); } } else { g.fillStyle = '#92400e'; g.fillRect(o.x * S + 2, y + 6, o.len * S - 4, S - 12); g.fillStyle = '#b45309'; g.fillRect(o.x * S + 2, y + 10, o.len * S - 4, 4); g.fillStyle = '#78350f'; g.beginPath(); g.ellipse(o.x * S + 4, y + S / 2, 4, S / 2 - 6, 0, 0, 7); g.fill(); } }); }
          }
          const lift = hopT > 0 ? Math.sin(hopT / 0.12 * Math.PI) * 10 : 0; const px = p.x * S + S / 2, py = yOf(p.r) + S / 2 - lift;
          g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(px, yOf(p.r) + S - 8, 13, 5, 0, 0, 7); g.fill();
          g.fillStyle = '#fff'; g.fillRect(px - 13, py - 12, 26, 24); g.fillStyle = '#ef4444'; g.fillRect(px - 4, py - 18, 8, 7); g.fillStyle = '#f59e0b'; const bx = [0, 1, 0, -1][p.face] * 14, by = [-1, 0, 1, 0][p.face] * 14; g.fillRect(px + bx - 3, py + by * 0.5 - 3, 6, 6); g.fillStyle = '#111'; g.fillRect(px - 7, py - 6, 4, 4); g.fillRect(px + 3, py - 6, 4, 4);
          g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 4; g.font = 'bold 36px system-ui'; g.textAlign = 'left'; g.strokeText(score, 14, 44); g.fillText(score, 14, 44); sc.textContent = 'Score ' + score;
          if (!started) banner(g, W, H, '🐔 Hop Road', 'Press ↑ or tap to hop'); else if (over) banner(g, W, H, deathMsg, `Score ${score} — hop to retry`);
        },
      };
    });
  } };

  Object.entries(GAMES).forEach(([k, gm]) => { if (!MS.commands.some((c) => c.id === 'game-' + k)) MS.command({ id: 'game-' + k, title: 'Play ' + gm.name, icon: gm.icon, group: 'Arcade', run: () => MS.go('arcade', k) }); });
  if (MS.appMap.arcade) MS.appMap.arcade.desc = Object.keys(GAMES).length + ' games with high scores';
})();
