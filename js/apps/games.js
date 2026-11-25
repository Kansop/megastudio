/* Arcade: Snake, 2048, Blocks (Tetris), Minesweeper, Breakout, Memory, Flappy, Pong — with high scores */
(function () {
  const { h } = MS;
  let scores;
  const getScores = async () => (scores = scores || (await MS.store('arcade', () => ({ best: {} }))));
  const css = () => getComputedStyle(document.documentElement);
  const C = (v) => css().getPropertyValue(v).trim();
  async function report(game, score, lowerIsBetter = false) {
    const s = await getScores(); const prev = s.data.best[game];
    if (prev == null || (lowerIsBetter ? score < prev : score > prev)) { s.data.best[game] = score; s.touch(); if (score) MS.toast(`🏆 New best in ${game}: ${score}`, 'good'); return true; }
    return false;
  }
  // a canvas game harness with key handling + loop
  function canvasGame(host, w, hgt, setup) {
    const cv = h('canvas', { width: w, height: hgt, tabIndex: 0, style: { maxWidth: '100%', maxHeight: 'calc(100vh - 220px)', aspectRatio: `${w}/${hgt}`, background: C('--panel2'), borderRadius: '14px', boxShadow: 'var(--shadow)', outline: 'none', touchAction: 'none' } });
    const info = h('div.row', { style: { justifyContent: 'center', gap: '18px', margin: '8px 0' } });
    host.append(info, cv); cv.focus();
    const g = cv.getContext('2d'); const keys = {};
    const api = setup({ cv, g, keys, info });
    const kd = (e) => { if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault(); keys[e.key] = true; api.key && api.key(e.key); };
    const ku = (e) => (keys[e.key] = false);
    document.addEventListener('keydown', kd); document.addEventListener('keyup', ku);
    let raf, last = performance.now(); const loop = (t) => { raf = requestAnimationFrame(loop); const dt = Math.max(0, Math.min(0.05, (t - last) / 1000)); last = t; api.update && api.update(dt); api.draw && api.draw(); };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku); };
  }
  const banner = (g, w, hgt, title, sub) => { g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 0, w, hgt); g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = 'bold 34px system-ui'; g.fillText(title, w / 2, hgt / 2 - 8); g.font = '16px system-ui'; g.fillText(sub, w / 2, hgt / 2 + 24); g.textAlign = 'left'; };
  // swipe support
  const swipe = (el, fn) => { let sx, sy; el.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true }); el.addEventListener('touchend', (e) => { const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return fn('tap'); fn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft') : dy > 0 ? 'ArrowDown' : 'ArrowUp'); }); };

  const GAMES = {
    snake: { name: 'Snake', icon: '🐍', desc: 'Eat, grow, don\'t bite yourself.', run(host) {
      return canvasGame(host, 480, 480, ({ cv, g, info }) => {
        const N = 24, S = 20; let snake, dir, nd, food, t, dead, score, speed, started; const sc = h('strong'), best = h('span.muted'); info.append(sc, best);
        const reset = () => { snake = [{ x: 10, y: 12 }, { x: 9, y: 12 }, { x: 8, y: 12 }]; dir = nd = { x: 1, y: 0 }; place(); t = 0; dead = false; score = 0; speed = 0.11; started = false; upd(); };
        const place = () => { do food = { x: (Math.random() * N) | 0, y: (Math.random() * N) | 0 }; while (snake.some((p) => p.x === food.x && p.y === food.y)); };
        const upd = async () => { sc.textContent = 'Score ' + score; best.textContent = 'Best ' + ((await getScores()).data.best.Snake || 0); };
        reset(); swipe(cv, (k) => key(k === 'tap' ? ' ' : k));
        const key = (k) => { const m = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] }[k]; if (dead && k === ' ') return reset(); if (m && (m[0] !== -dir.x || m[1] !== -dir.y)) { nd = { x: m[0], y: m[1] }; started = true; } if (k === ' ' && !dead) started = !started; };
        return { key, update(dt) { if (dead || !started) return; t += dt; if (t < speed) return; t = 0; dir = nd; const hd = { x: (snake[0].x + dir.x + N) % N, y: (snake[0].y + dir.y + N) % N }; if (snake.some((p) => p.x === hd.x && p.y === hd.y)) { dead = true; report('Snake', score).then(upd); return; } snake.unshift(hd); if (hd.x === food.x && hd.y === food.y) { score += 10; speed = Math.max(0.05, speed - 0.003); place(); upd(); } else snake.pop(); },
          draw() { g.fillStyle = C('--panel2'); g.fillRect(0, 0, 480, 480); g.fillStyle = C('--accent2'); g.beginPath(); g.arc(food.x * S + 10, food.y * S + 10, 8, 0, 7); g.fill(); snake.forEach((p, i) => { g.fillStyle = i ? C('--accent') : C('--good'); g.beginPath(); g.roundRect(p.x * S + 1, p.y * S + 1, S - 2, S - 2, 5); g.fill(); }); if (!started && !dead) banner(g, 480, 480, 'Snake', 'Arrow keys / WASD / swipe to start'); if (dead) banner(g, 480, 480, 'Game over', `Score ${score} — Space to retry`); } };
      }); } },
    g2048: { name: '2048', icon: '🔢', desc: 'Slide tiles, merge to 2048.', run(host) {
      let board, score, over; const wrapEl = h('div', { tabIndex: 0, style: { display: 'grid', gridTemplateColumns: 'repeat(4, 90px)', gap: '10px', padding: '10px', background: 'var(--panel2)', borderRadius: '14px', margin: 'auto', width: 'max-content', outline: 'none', touchAction: 'none' } });
      const sc = h('strong'), best = h('span.muted'); host.append(h('div.row', { style: { justifyContent: 'center', gap: '18px', margin: '8px 0' } }, sc, best, h('button.btn.sm', { on: { click: () => reset() } }, 'New game')), wrapEl); wrapEl.focus();
      const COL = { 2: '#eee4da', 4: '#ede0c8', 8: '#f2b179', 16: '#f59563', 32: '#f67c5f', 64: '#f65e3b', 128: '#edcf72', 256: '#edcc61', 512: '#edc850', 1024: '#edc53f', 2048: '#edc22e' };
      const add = () => { const e = []; board.forEach((v, i) => !v && e.push(i)); if (e.length) board[e[(Math.random() * e.length) | 0]] = Math.random() < 0.9 ? 2 : 4; };
      const reset = () => { board = Array(16).fill(0); score = 0; over = false; add(); add(); draw(); };
      const draw = async () => { wrapEl.innerHTML = ''; board.forEach((v) => wrapEl.append(h('div', { style: { width: '90px', height: '90px', borderRadius: '10px', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: v > 512 ? '28px' : '34px', background: v ? COL[v] || '#3c3a32' : 'var(--panel)', color: v > 4 ? '#fff' : '#776e65', transition: 'background .1s' } }, v || ''))); sc.textContent = 'Score ' + score; best.textContent = 'Best ' + ((await getScores()).data.best['2048'] || 0); if (over) wrapEl.append(h('div', { style: { gridColumn: '1/-1', textAlign: 'center', fontWeight: 700 } }, 'No moves left — New game?')); };
      const slide = (row) => { const a = row.filter(Boolean); for (let i = 0; i < a.length - 1; i++) if (a[i] === a[i + 1]) { a[i] *= 2; score += a[i]; if (a[i] === 2048) MS.toast('🎉 2048!', 'good'); a.splice(i + 1, 1); } while (a.length < 4) a.push(0); return a; };
      const move = (k) => { if (over) return; const before = board.join(); const idx = (r, c) => ({ ArrowLeft: r * 4 + c, ArrowRight: r * 4 + 3 - c, ArrowUp: c * 4 + r, ArrowDown: (3 - c) * 4 + r }[k]); if (idx(0, 0) == null) return;
        for (let r = 0; r < 4; r++) { const row = [0, 1, 2, 3].map((c) => board[idx(r, c)]); slide(row).forEach((v, c) => (board[idx(r, c)] = v)); }
        if (board.join() !== before) { add(); const can = board.some((v, i) => !v || (i % 4 < 3 && v === board[i + 1]) || (i < 12 && v === board[i + 4])); if (!can) { over = true; report('2048', score); } draw(); } };
      const kd = (e) => { const k = { w: 'ArrowUp', a: 'ArrowLeft', s: 'ArrowDown', d: 'ArrowRight' }[e.key] || e.key; if (k.startsWith('Arrow')) { e.preventDefault(); move(k); } };
      document.addEventListener('keydown', kd); swipe(wrapEl, (k) => k !== 'tap' && move(k)); reset();
      return () => { report('2048', score); document.removeEventListener('keydown', kd); };
    } },
    blocks: { name: 'Blocks', icon: '🧱', desc: 'Falling-block puzzle. Clear lines!', run(host) {
      return canvasGame(host, 300 + 140, 600, ({ g, info, cv }) => {
        const W = 10, Hh = 20, S = 30; const P = { I: [[1, 1, 1, 1]], O: [[1, 1], [1, 1]], T: [[0, 1, 0], [1, 1, 1]], S: [[0, 1, 1], [1, 1, 0]], Z: [[1, 1, 0], [0, 1, 1]], J: [[1, 0, 0], [1, 1, 1]], L: [[0, 0, 1], [1, 1, 1]] };
        const COLS = { I: '#2fa8ff', O: '#ffd23f', T: '#a77bff', S: '#3ddc97', Z: '#ff5d6c', J: '#3d5afe', L: '#ffb84f' };
        let grid, cur, nxt, t, score, lines, level, over, paused, bag = [];
        const sc = h('strong'); info.append(sc, h('span.muted', '←→ move · ↑ rotate · ↓ soft drop · Space hard drop · P pause'));
        const draw7 = () => { if (!bag.length) bag = Object.keys(P).sort(() => Math.random() - 0.5); return bag.pop(); };
        const spawn = () => { const k = nxt || draw7(); nxt = draw7(); cur = { k, m: P[k].map((r) => r.slice()), x: 3, y: 0 }; if (hit(cur.m, cur.x, cur.y)) { over = true; report('Blocks', score); } };
        const hit = (m, x, y) => m.some((r, i) => r.some((v, j) => v && (x + j < 0 || x + j >= W || y + i >= Hh || (y + i >= 0 && grid[y + i][x + j]))));
        const rot = (m) => m[0].map((_, i) => m.map((r) => r[i]).reverse());
        const lock = () => { cur.m.forEach((r, i) => r.forEach((v, j) => { if (v && cur.y + i >= 0) grid[cur.y + i][cur.x + j] = cur.k; })); let n = 0; for (let y = Hh - 1; y >= 0; y--) if (grid[y].every(Boolean)) { grid.splice(y, 1); grid.unshift(Array(W).fill(0)); n++; y++; } lines += n; score += [0, 100, 300, 500, 800][n] * level; level = 1 + Math.floor(lines / 10); spawn(); };
        const reset = () => { grid = Array.from({ length: Hh }, () => Array(W).fill(0)); score = lines = 0; level = 1; t = 0; over = false; paused = false; nxt = null; spawn(); };
        reset();
        const key = (k) => { if (over) { if (k === ' ' || k === 'Enter') reset(); return; } if (k === 'p' || k === 'P') paused = !paused; if (paused) return;
          if (k === 'ArrowLeft' && !hit(cur.m, cur.x - 1, cur.y)) cur.x--; if (k === 'ArrowRight' && !hit(cur.m, cur.x + 1, cur.y)) cur.x++; if (k === 'ArrowDown') { if (!hit(cur.m, cur.x, cur.y + 1)) { cur.y++; score += 1; } }
          if (k === 'ArrowUp' || k === 'x') { const r = rot(cur.m); for (const dx of [0, -1, 1, -2, 2]) if (!hit(r, cur.x + dx, cur.y)) { cur.m = r; cur.x += dx; break; } }
          if (k === ' ') { while (!hit(cur.m, cur.x, cur.y + 1)) { cur.y++; score += 2; } lock(); } };
        swipe(cv, (k) => key(k === 'tap' ? 'ArrowUp' : k === 'ArrowUp' ? ' ' : k));
        const cell = (x, y, c, a = 1) => { g.globalAlpha = a; g.fillStyle = c; g.fillRect(x * S + 1, y * S + 1, S - 2, S - 2); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x * S + 1, y * S + 1, S - 2, 5); g.globalAlpha = 1; };
        return { key, update(dt) { if (over || paused) return; t += dt; if (t > Math.max(0.08, 0.8 - level * 0.07)) { t = 0; if (!hit(cur.m, cur.x, cur.y + 1)) cur.y++; else lock(); } sc.textContent = `Score ${score} · Lines ${lines} · Level ${level}`; },
          draw() { g.fillStyle = C('--panel2'); g.fillRect(0, 0, 440, 600); g.fillStyle = C('--bg'); g.fillRect(0, 0, 300, 600); grid.forEach((r, y) => r.forEach((v, x) => v && cell(x, y, COLS[v])));
            let gy = cur.y; while (!hit(cur.m, cur.x, gy + 1)) gy++; cur.m.forEach((r, i) => r.forEach((v, j) => v && cell(cur.x + j, gy + i, COLS[cur.k], 0.25))); cur.m.forEach((r, i) => r.forEach((v, j) => v && cell(cur.x + j, cur.y + i, COLS[cur.k])));
            g.fillStyle = C('--text'); g.font = 'bold 16px system-ui'; g.fillText('NEXT', 330, 40); P[nxt].forEach((r, i) => r.forEach((v, j) => { if (v) { g.fillStyle = COLS[nxt]; g.fillRect(330 + j * 24, 60 + i * 24, 22, 22); } })); g.fillStyle = C('--text'); g.fillText('SCORE', 330, 170); g.font = '22px system-ui'; g.fillText(score, 330, 198); g.font = 'bold 16px system-ui'; g.fillText('LEVEL ' + level, 330, 240); g.fillText('LINES ' + lines, 330, 270);
            if (paused) banner(g, 300, 600, 'Paused', 'Press P'); if (over) banner(g, 300, 600, 'Game over', 'Space to play again'); } };
      }); } },
    mines: { name: 'Minesweeper', icon: '💣', desc: 'Clear the field without hitting a mine.', run(host) {
      let W = 16, Hh = 16, M = 40, cells, first, over, flags, start, timerI; const diffs = { Easy: [9, 9, 10], Medium: [16, 16, 40], Hard: [24, 16, 75] };
      const status = h('strong'); const gridEl = h('div', { style: { display: 'grid', gap: '2px', margin: 'auto', width: 'max-content', userSelect: 'none' } });
      host.append(h('div.row', { style: { justifyContent: 'center', gap: '10px', margin: '8px 0' } }, status, ...Object.keys(diffs).map((d) => h('button.btn.sm', { on: { click: () => { [W, Hh, M] = diffs[d]; reset(); } } }, d)), h('span.small.muted', 'Right-click / long-press to flag')), gridEl);
      const reset = () => { cells = Array.from({ length: W * Hh }, () => ({ m: 0, o: 0, f: 0, n: 0 })); first = true; over = false; flags = 0; clearInterval(timerI); start = 0; draw(); };
      const nb = (i) => { const x = i % W, y = (i / W) | 0, out = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if ((dx || dy) && nx >= 0 && ny >= 0 && nx < W && ny < Hh) out.push(ny * W + nx); } return out; };
      const plant = (safe) => { const avoid = new Set([safe, ...nb(safe)]); let k = 0; while (k < M) { const i = (Math.random() * W * Hh) | 0; if (!cells[i].m && !avoid.has(i)) { cells[i].m = 1; k++; } } cells.forEach((c, i) => (c.n = nb(i).filter((j) => cells[j].m).length)); start = Date.now(); timerI = setInterval(updStatus, 1000); };
      const openC = (i) => { const c = cells[i]; if (c.o || c.f) return; c.o = 1; if (c.m) { over = 'lose'; cells.forEach((x) => x.m && (x.o = 1)); clearInterval(timerI); return; } if (!c.n) nb(i).forEach(openC); };
      const click = (i, flag) => { if (over) return; const c = cells[i]; if (flag) { if (!c.o) { c.f ^= 1; flags += c.f ? 1 : -1; } draw(); return; } if (first) { plant(i); first = false; }
        if (c.o && c.n) { const f = nb(i).filter((j) => cells[j].f).length; if (f === c.n) nb(i).forEach(openC); } else openC(i);
        if (!over && cells.every((x) => x.m || x.o)) { over = 'win'; clearInterval(timerI); report('Minesweeper ' + W + 'x' + Hh, Math.round((Date.now() - start) / 1000), true); } draw(); };
      const updStatus = () => { status.textContent = (over === 'win' ? '😎 You win! ' : over === 'lose' ? '💥 Boom! ' : '🙂 ') + `💣 ${M - flags}  ⏱ ${start ? Math.round((Date.now() - start) / 1000) : 0}s`; };
      const NC = ['', '#2fa8ff', '#3ddc97', '#ff5d6c', '#a77bff', '#ffb84f', '#33e0c8', '#fff', '#999'];
      const draw = () => { gridEl.style.gridTemplateColumns = `repeat(${W}, 28px)`; gridEl.innerHTML = ''; cells.forEach((c, i) => { let lt; const el = h('button', { style: { width: '28px', height: '28px', border: 0, borderRadius: '5px', fontWeight: 800, cursor: 'pointer', background: c.o ? (c.m ? 'var(--bad)' : 'var(--panel)') : 'var(--panel2)', color: NC[c.n], boxShadow: c.o ? '' : 'inset 0 -3px 0 rgba(0,0,0,.25)' }, on: { click: () => click(i), contextmenu: (e) => { e.preventDefault(); click(i, true); }, touchstart: () => (lt = setTimeout(() => { click(i, true); lt = 'done'; }, 400)), touchend: (e) => { if (lt === 'done') e.preventDefault(); clearTimeout(lt); } } }, c.o ? (c.m ? '💣' : c.n || '') : c.f ? '🚩' : ''); gridEl.append(el); }); updStatus(); };
      reset(); return () => clearInterval(timerI);
    } },
    breakout: { name: 'Breakout', icon: '🧨', desc: 'Smash every brick.', run(host) {
      return canvasGame(host, 640, 480, ({ g, keys, info, cv }) => {
        let pad, ball, bricks, score, lives, state, level; const sc = h('strong'); info.append(sc, h('span.muted', '←→ or mouse · Space to launch'));
        const build = () => { bricks = []; const rows = 4 + Math.min(level, 4); for (let r = 0; r < rows; r++) for (let c = 0; c < 10; c++) bricks.push({ x: 20 + c * 60, y: 50 + r * 24, w: 56, h: 20, hp: r < level - 1 ? 2 : 1, c: `hsl(${(r * 40 + level * 30) % 360},80%,62%)` }); };
        const resetBall = () => { ball = { x: pad.x + pad.w / 2, y: 440, vx: 0, vy: 0, r: 7 }; state = 'ready'; };
        const reset = () => { pad = { x: 270, w: 100 }; score = 0; lives = 3; level = 1; build(); resetBall(); };
        reset();
        cv.addEventListener('mousemove', (e) => { const r = cv.getBoundingClientRect(); pad.x = MS.clamp(((e.clientX - r.left) / r.width) * 640 - pad.w / 2, 0, 640 - pad.w); });
        cv.addEventListener('touchmove', (e) => { const r = cv.getBoundingClientRect(); pad.x = MS.clamp(((e.touches[0].clientX - r.left) / r.width) * 640 - pad.w / 2, 0, 640 - pad.w); e.preventDefault(); }, { passive: false });
        const launch = () => { if (state === 'ready') { ball.vx = (Math.random() - 0.5) * 300; ball.vy = -(330 + level * 30); state = 'play'; } else if (state === 'over' || state === 'won') reset(); };
        cv.addEventListener('click', launch); cv.addEventListener('touchend', launch);
        return { key: (k) => k === ' ' && launch(), update(dt) {
          if (keys.ArrowLeft) pad.x = Math.max(0, pad.x - 520 * dt); if (keys.ArrowRight) pad.x = Math.min(640 - pad.w, pad.x + 520 * dt);
          if (state === 'ready') { ball.x = pad.x + pad.w / 2; return; } if (state !== 'play') return;
          ball.x += ball.vx * dt; ball.y += ball.vy * dt; if (ball.x < ball.r || ball.x > 640 - ball.r) { ball.vx *= -1; ball.x = MS.clamp(ball.x, ball.r, 640 - ball.r); } if (ball.y < ball.r) { ball.vy = Math.abs(ball.vy); }
          if (ball.y > 450 - ball.r && ball.y < 466 && ball.x > pad.x - 4 && ball.x < pad.x + pad.w + 4 && ball.vy > 0) { const off = (ball.x - (pad.x + pad.w / 2)) / (pad.w / 2); const sp = Math.hypot(ball.vx, ball.vy) * 1.01; ball.vx = sp * Math.sin(off * 1.05); ball.vy = -Math.abs(sp * Math.cos(off * 1.05)); }
          if (ball.y > 490) { lives--; if (lives <= 0) { state = 'over'; report('Breakout', score); } else resetBall(); }
          for (const b of bricks) if (b.hp && ball.x > b.x - ball.r && ball.x < b.x + b.w + ball.r && ball.y > b.y - ball.r && ball.y < b.y + b.h + ball.r) { b.hp--; score += 10 * level; const ox = Math.min(ball.x - b.x, b.x + b.w - ball.x), oy = Math.min(ball.y - b.y, b.y + b.h - ball.y); if (ox < oy) ball.vx *= -1; else ball.vy *= -1; break; }
          if (bricks.every((b) => !b.hp)) { level++; if (level > 6) { state = 'won'; report('Breakout', score); } else { build(); resetBall(); } }
          sc.textContent = `Score ${score} · Lives ${'❤'.repeat(lives)} · Level ${level}`; },
          draw() { g.fillStyle = C('--panel2'); g.fillRect(0, 0, 640, 480); bricks.forEach((b) => { if (!b.hp) return; g.fillStyle = b.c; g.globalAlpha = b.hp > 1 ? 1 : 0.85; g.beginPath(); g.roundRect(b.x, b.y, b.w, b.h, 5); g.fill(); if (b.hp > 1) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); } }); g.globalAlpha = 1;
            g.fillStyle = C('--accent'); g.beginPath(); g.roundRect(pad.x, 452, pad.w, 12, 6); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(ball.x, ball.y, ball.r, 0, 7); g.fill();
            if (state === 'ready') banner(g, 640, 480, 'Level ' + level, 'Space / click to launch'); if (state === 'over') banner(g, 640, 480, 'Game over', `Score ${score} — click to restart`); if (state === 'won') banner(g, 640, 480, 'You beat Breakout! 🏆', `Score ${score}`); } };
      }); } },
    memory: { name: 'Memory', icon: '🃏', desc: 'Flip cards and find pairs.', run(host) {
      const EM = ['🦊', '🐼', '🐸', '🦄', '🐙', '🦋', '🍉', '🚀', '🎸', '🌈', '🍩', '⚡'];
      let cards, open, moves, matched, lock, startT; const st = h('strong'); const gridEl = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(6, 80px)', gap: '10px', margin: 'auto', width: 'max-content', perspective: '800px' } });
      host.append(h('div.row', { style: { justifyContent: 'center', gap: '14px', margin: '8px 0' } }, st, h('button.btn.sm', { on: { click: () => reset() } }, 'Shuffle')), gridEl);
      const reset = () => { cards = [...EM, ...EM].sort(() => Math.random() - 0.5).map((e) => ({ e, up: false, done: false })); open = []; moves = 0; matched = 0; lock = false; startT = 0; draw(); };
      const draw = () => { gridEl.innerHTML = ''; st.textContent = `Moves ${moves} · Pairs ${matched}/${EM.length}`; cards.forEach((c, i) => gridEl.append(h('button', { style: { width: '80px', height: '96px', fontSize: '40px', borderRadius: '12px', border: '1px solid var(--line)', cursor: 'pointer', background: c.up || c.done ? 'var(--panel)' : 'linear-gradient(135deg,var(--accent),var(--accent2))', transform: c.up || c.done ? 'rotateY(0)' : 'rotateY(180deg)', transition: 'transform .25s', opacity: c.done ? 0.5 : 1 }, on: { click: () => flip(i) } }, c.up || c.done ? c.e : ''))); };
      const flip = (i) => { const c = cards[i]; if (lock || c.up || c.done) return; if (!startT) startT = Date.now(); c.up = true; open.push(c); if (open.length === 2) { moves++; lock = true; const [a, b] = open; if (a.e === b.e) { a.done = b.done = true; matched++; open = []; lock = false; if (matched === EM.length) { MS.toast(`🎉 Solved in ${moves} moves!`, 'good'); report('Memory (moves)', moves, true); } } else setTimeout(() => { a.up = b.up = false; open = []; lock = false; draw(); }, 750); } draw(); };
      reset(); return () => {};
    } },
    flappy: { name: 'Flappy', icon: '🐤', desc: 'Tap to fly through the pipes.', run(host) {
      return canvasGame(host, 400, 600, ({ g, info, cv }) => {
        let bird, pipes, score, state, t; const sc = h('strong'); info.append(sc, h('span.muted', 'Space / click / tap to flap'));
        const reset = () => { bird = { y: 280, v: 0 }; pipes = []; score = 0; state = 'ready'; t = 0; };
        reset(); const flap = () => { if (state === 'over') { if (t > 0.6) reset(); return; } state = 'play'; bird.v = -330; };
        cv.addEventListener('pointerdown', flap);
        return { key: (k) => (k === ' ' || k === 'ArrowUp') && flap(), update(dt) { t += dt; if (state !== 'play') { if (state === 'ready') bird.y = 280 + Math.sin(t * 4) * 8; else bird.y = Math.min(580, bird.y + 400 * dt); return; }
          bird.v += 1000 * dt; bird.y += bird.v * dt; if (!pipes.length || pipes[pipes.length - 1].x < 180) pipes.push({ x: 420, gap: 120 + Math.random() * 300, passed: false });
          pipes.forEach((p) => { p.x -= 160 * dt; if (!p.passed && p.x + 60 < 100) { p.passed = true; score++; } if (100 + 14 > p.x && 100 - 14 < p.x + 60 && (bird.y - 14 < p.gap - 75 || bird.y + 14 > p.gap + 75)) { state = 'over'; t = 0; report('Flappy', score); } });
          pipes = pipes.filter((p) => p.x > -70); if (bird.y > 586 || bird.y < 0) { state = 'over'; t = 0; report('Flappy', score); } sc.textContent = 'Score ' + score; },
          draw() { const sky = g.createLinearGradient(0, 0, 0, 600); sky.addColorStop(0, '#4fc3f7'); sky.addColorStop(1, '#b3e5fc'); g.fillStyle = sky; g.fillRect(0, 0, 400, 600);
            pipes.forEach((p) => { g.fillStyle = '#43a047'; g.fillRect(p.x, 0, 60, p.gap - 75); g.fillRect(p.x, p.gap + 75, 60, 600); g.fillStyle = '#2e7d32'; g.fillRect(p.x - 4, p.gap - 95, 68, 20); g.fillRect(p.x - 4, p.gap + 75, 68, 20); });
            g.save(); g.translate(100, bird.y); g.rotate(MS.clamp(bird.v / 600, -0.5, 1.2)); g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(0, 0, 14, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(5, -4, 5, 0, 7); g.fill(); g.fillStyle = '#000'; g.beginPath(); g.arc(7, -4, 2, 0, 7); g.fill(); g.fillStyle = '#ff7043'; g.fillRect(10, 1, 9, 5); g.restore();
            g.fillStyle = '#fff'; g.font = 'bold 44px system-ui'; g.textAlign = 'center'; g.fillText(score, 200, 70); g.textAlign = 'left';
            if (state === 'ready') banner(g, 400, 600, 'Flappy', 'Tap / Space to start'); if (state === 'over') banner(g, 400, 600, 'Ouch!', `Score ${score} — tap to retry`); } };
      }); } },
    pong: { name: 'Pong', icon: '🏓', desc: 'Classic paddle duel vs. the CPU.', run(host) {
      return canvasGame(host, 640, 400, ({ g, keys, info, cv }) => {
        let p1, p2, ball, s1, s2, state; const sc = h('strong'); info.append(sc, h('span.muted', 'W/S or ↑↓ or mouse · first to 7'));
        const serve = (d = 1) => { ball = { x: 320, y: 200, vx: 300 * d, vy: (Math.random() - 0.5) * 300 }; };
        const reset = () => { p1 = 160; p2 = 160; s1 = s2 = 0; state = 'play'; serve(); };
        reset(); cv.addEventListener('mousemove', (e) => { const r = cv.getBoundingClientRect(); p1 = MS.clamp(((e.clientY - r.top) / r.height) * 400 - 40, 0, 320); });
        cv.addEventListener('click', () => state !== 'play' && reset());
        return { key: (k) => k === ' ' && state !== 'play' && reset(), update(dt) { if (state !== 'play') return; if (keys.w || keys.ArrowUp) p1 -= 400 * dt; if (keys.s || keys.ArrowDown) p1 += 400 * dt; p1 = MS.clamp(p1, 0, 320);
          const target = ball.y - 40; p2 += MS.clamp(target - p2, -260 * dt, 260 * dt); p2 = MS.clamp(p2, 0, 320);
          ball.x += ball.vx * dt; ball.y += ball.vy * dt; if (ball.y < 6 || ball.y > 394) ball.vy *= -1;
          if (ball.x < 26 && ball.x > 14 && ball.y > p1 && ball.y < p1 + 80 && ball.vx < 0) { ball.vx = -ball.vx * 1.06; ball.vy += (ball.y - (p1 + 40)) * 5; }
          if (ball.x > 614 && ball.x < 626 && ball.y > p2 && ball.y < p2 + 80 && ball.vx > 0) { ball.vx = -ball.vx * 1.06; ball.vy += (ball.y - (p2 + 40)) * 5; }
          if (ball.x < -10) { s2++; serve(1); } if (ball.x > 650) { s1++; serve(-1); } if (s1 >= 7 || s2 >= 7) { state = s1 > s2 ? 'win' : 'lose'; if (s1 > s2) report('Pong wins', ((scores && scores.data.best['Pong wins']) || 0) + 1); }
          sc.textContent = `You ${s1} — ${s2} CPU`; },
          draw() { g.fillStyle = C('--panel2'); g.fillRect(0, 0, 640, 400); g.setLineDash([8, 10]); g.strokeStyle = C('--line'); g.beginPath(); g.moveTo(320, 0); g.lineTo(320, 400); g.stroke(); g.setLineDash([]);
            g.fillStyle = C('--accent'); g.fillRect(14, p1, 12, 80); g.fillStyle = C('--accent2'); g.fillRect(614, p2, 12, 80); g.fillStyle = C('--text'); g.beginPath(); g.arc(ball.x, ball.y, 7, 0, 7); g.fill();
            g.font = 'bold 48px system-ui'; g.globalAlpha = 0.3; g.fillText(s1, 250, 60); g.fillText(s2, 360, 60); g.globalAlpha = 1; if (state !== 'play') banner(g, 640, 400, state === 'win' ? 'You win! 🏆' : 'CPU wins', 'Click or Space for a rematch'); } };
      }); } },
  };
  MS.arcade = { GAMES, report, getScores, canvasGame, banner, swipe };
  MS.register({
    id: 'arcade', name: 'Arcade', icon: '🕹', group: 'Play', desc: '12 games with high scores', keywords: 'games snake tetris 2048 minesweeper breakout memory flappy pong play',
    commands: Object.entries(GAMES).map(([k, gm]) => ({ id: 'game-' + k, title: 'Play ' + gm.name, icon: gm.icon, run: () => MS.go('arcade', k) })),
    async mount(view) {
      let cleanup = null; const host = h('div.pad', { style: { textAlign: 'center' } }); view.append(host);
      const menu = async () => {
        if (cleanup) { cleanup(); cleanup = null; } MS.setActions(); host.innerHTML = ''; const best = (await getScores()).data.best;
        host.append(h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: '14px', textAlign: 'left', maxWidth: '1000px', margin: 'auto' } },
          Object.entries(GAMES).map(([k, gm]) => h('button.card', { style: { cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '6px' }, on: { click: () => MS.go('arcade', k) } }, h('div', { style: { fontSize: '44px' } }, gm.icon), h('strong', { style: { fontSize: '17px' } }, gm.name), h('span.small.muted', gm.desc)))),
          h('div.card', { style: { maxWidth: '1000px', margin: '18px auto', textAlign: 'left' } }, h('strong', '🏆 Best scores'), h('div.row', { style: { flexWrap: 'wrap', gap: '8px', marginTop: '8px' } }, Object.keys(best).length ? Object.entries(best).map(([k, v]) => h('span.tag', `${k}: ${v}`)) : h('span.muted.small', 'Play something to set a record!'))));
      };
      const start = (k) => { if (cleanup) cleanup(); host.innerHTML = ''; const gm = GAMES[k]; MS.setActions(h('button.btn', { on: { click: () => MS.go('arcade') } }, '‹ All games'), h('strong', gm.icon + ' ' + gm.name)); cleanup = gm.run(host) || null; };
      return { route(args) { if (args[0] && GAMES[args[0]]) start(args[0]); else menu(); }, unmount: () => cleanup && cleanup() };
    },
  });
})();
