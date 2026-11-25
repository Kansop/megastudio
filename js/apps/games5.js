/* Arcade 5: Tower Defense — 3 maps, 5 tower types with 3 upgrade tiers, 7 enemy types, bosses, targeting modes, speed control */
(function () {
  const { h } = MS; const { GAMES, report, canvasGame, banner } = MS.arcade;
  const CS = 40, COLS = 24, ROWS = 15, W = COLS * CS, H = ROWS * CS;
  const MAPS = {
    'Meadow': { bg: '#2c4a2a', path: '#c9a66b', pts: [[-1, 2], [5, 2], [5, 7], [2, 7], [2, 12], [10, 12], [10, 4], [15, 4], [15, 10], [20, 10], [20, 3], [24, 3]] },
    'Desert': { bg: '#a3834f', path: '#e3cc98', pts: [[-1, 7], [4, 7], [4, 2], [9, 2], [9, 12], [14, 12], [14, 2], [19, 2], [19, 12], [22, 12], [22, 7], [24, 7]] },
    'Volcano': { bg: '#2a1d22', path: '#6b4a3a', pts: [[12, -1], [12, 3], [3, 3], [3, 11], [8, 11], [8, 6], [16, 6], [16, 11], [21, 11], [21, 3], [18, 3], [18, 14], [12, 14], [12, 15]] },
  };
  const TOWERS = {
    arrow: { name: 'Archer', icon: '🏹', color: '#3ddc97', cost: 50, lv: [{ dmg: 9, rate: 2.2, range: 3.2 }, { dmg: 16, rate: 2.6, range: 3.5, cost: 60 }, { dmg: 30, rate: 3.2, range: 4, cost: 120 }], desc: 'Fast single shots. Hits flyers.' },
    cannon: { name: 'Cannon', icon: '💣', color: '#ffb84f', cost: 100, lv: [{ dmg: 22, rate: 0.75, range: 2.8, splash: 1 }, { dmg: 40, rate: 0.85, range: 3, splash: 1.2, cost: 110 }, { dmg: 75, rate: 1, range: 3.3, splash: 1.5, cost: 200 }], desc: 'Splash damage. Ground only.' },
    frost: { name: 'Frost', icon: '❄️', color: '#2fa8ff', cost: 80, lv: [{ dmg: 3, rate: 1.4, range: 2.6, slow: 0.45 }, { dmg: 6, rate: 1.6, range: 2.9, slow: 0.55, cost: 90 }, { dmg: 12, rate: 2, range: 3.2, slow: 0.65, splash: 1, cost: 160 }], desc: 'Slows enemies.' },
    laser: { name: 'Laser', icon: '🔆', color: '#ff4fa3', cost: 150, lv: [{ dps: 22, range: 3.4 }, { dps: 42, range: 3.7, cost: 150 }, { dps: 85, range: 4.1, cost: 260 }], desc: 'Beam that ramps up on one target.' },
    tesla: { name: 'Tesla', icon: '⚡', color: '#c6f26a', cost: 175, lv: [{ dmg: 18, rate: 0.9, range: 2.8, chain: 3 }, { dmg: 30, rate: 1.1, range: 3, chain: 4, cost: 170 }, { dmg: 55, rate: 1.3, range: 3.3, chain: 6, cost: 280 }], desc: 'Chain lightning between enemies.' },
  };
  const ENEMIES = {
    grunt: { hp: 40, speed: 1.6, gold: 5, color: '#e8eaff', r: 10 },
    runner: { hp: 26, speed: 3, gold: 5, color: '#ffd23f', r: 8 },
    tank: { hp: 160, speed: 1, gold: 12, color: '#9097c4', r: 14, armor: 4 },
    swarm: { hp: 12, speed: 2.2, gold: 2, color: '#ff8a3d', r: 6 },
    flyer: { hp: 45, speed: 2, gold: 8, color: '#b07cff', r: 10, fly: true },
    healer: { hp: 70, speed: 1.4, gold: 10, color: '#3ddc97', r: 11, heal: true },
    boss: { hp: 1400, speed: 0.75, gold: 120, color: '#ff5d6c', r: 20, armor: 8, boss: true },
  };
  function waveDef(n) {
    const list = []; const add = (type, count, gap) => list.push({ type, count, gap });
    if (n % 10 === 0) { add('boss', Math.max(1, n / 10), 3); add('grunt', 10 + n, 0.5); }
    else if (n % 5 === 0) add('flyer', 6 + n, 0.7);
    else if (n % 4 === 0) add('swarm', 20 + n * 2, 0.22);
    else if (n % 3 === 0) { add('tank', 2 + Math.floor(n / 2), 1.6); add('healer', 1 + Math.floor(n / 4), 2); }
    else if (n % 2 === 0) add('runner', 8 + n, 0.55);
    else add('grunt', 6 + n * 1.5 | 0, 0.8);
    if (n > 6 && n % 2) add('healer', Math.floor(n / 6), 2.2);
    if (n > 12) add('tank', Math.floor(n / 5), 1.4);
    return list;
  }
  GAMES.towerdef = { name: 'Tower Defense', icon: '🏰', desc: '3 maps, 5 upgradable towers, 30 waves + bosses.', run(host) {
    let mapName = 'Meadow';
    const bar = h('div.row', { style: { justifyContent: 'center', flexWrap: 'wrap', gap: '6px', marginTop: '8px' } });
    const panel = h('div.row', { style: { justifyContent: 'center', flexWrap: 'wrap', gap: '6px', marginTop: '6px', minHeight: '34px' } });
    const stop = canvasGame(host, W, H, ({ cv, g, info }) => {
      const goldEl = h('strong'), livesEl = h('strong'), waveEl = h('strong'), scoreEl = h('span.muted');
      info.append(h('span', '💰 ', goldEl), h('span', '❤️ ', livesEl), h('span', '🌊 ', waveEl), scoreEl);
      let S; const path = [], pathCells = new Set(); let pathLen = 0;
      function buildPath() {
        path.length = 0; pathCells.clear(); const m = MAPS[mapName];
        m.pts.forEach(([c, r]) => path.push([c * CS + CS / 2, r * CS + CS / 2]));
        for (let i = 0; i + 1 < m.pts.length; i++) { const [c1, r1] = m.pts[i], [c2, r2] = m.pts[i + 1]; const n = Math.max(Math.abs(c2 - c1), Math.abs(r2 - r1)); for (let k = 0; k <= n; k++) { const c = c1 + Math.sign(c2 - c1) * k, r = r1 + Math.sign(r2 - r1) * k; pathCells.add(c + ',' + r); } }
        pathLen = 0; for (let i = 1; i < path.length; i++) pathLen += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
      }
      function posAt(d) { for (let i = 1; i < path.length; i++) { const [x1, y1] = path[i - 1], [x2, y2] = path[i]; const L = Math.hypot(x2 - x1, y2 - y1); if (d <= L) return [x1 + ((x2 - x1) * d) / L, y1 + ((y2 - y1) * d) / L]; d -= L; } return path[path.length - 1]; }
      function reset() { buildPath(); S = { gold: 220, lives: 20, wave: 0, score: 0, towers: [], enemies: [], shots: [], fx: [], spawn: [], running: false, over: false, won: false, speed: 1, paused: false, place: null, sel: null, auto: false, t: 0 }; hud(); renderBar(); renderPanel(); }
      const hud = () => { goldEl.textContent = S.gold; livesEl.textContent = S.lives; waveEl.textContent = S.wave + ' / 30'; scoreEl.textContent = 'score ' + S.score; };
      function startWave() { if (S.over || S.spawn.length) return; S.wave++; let t = 0.5; const hpMul = 1 + (S.wave - 1) * 0.16 + Math.pow(Math.max(0, S.wave - 15), 1.5) * 0.05; waveDef(S.wave).forEach((grp) => { for (let i = 0; i < grp.count; i++) { S.spawn.push({ at: t, type: grp.type, hpMul }); t += grp.gap; } t += 1; }); S.spawn.sort((a, b) => a.at - b.at); S.waveT = 0; S.running = true; hud(); renderBar(); }
      function spawn(sp) { const E = ENEMIES[sp.type]; const hp = Math.round(E.hp * sp.hpMul); S.enemies.push({ type: sp.type, E, hp, max: hp, d: 0, slow: 0, slowT: 0, x: path[0][0], y: path[0][1], id: Math.random(), wob: Math.random() * 6 }); }
      function damage(e, amt, kind) { const armor = e.E.armor || 0; const real = kind === 'laser' || kind === 'tesla' ? amt : Math.max(amt * 0.25, amt - armor); e.hp -= real; if (e.hp <= 0 && !e.dead) { e.dead = true; S.gold += e.E.gold; S.score += e.E.gold * 10; for (let i = 0; i < (e.E.boss ? 40 : 10); i++) S.fx.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160, life: 0.6, c: e.E.color, r: 2 + Math.random() * 3 }); S.fx.push({ x: e.x, y: e.y - 10, text: '+' + e.E.gold, life: 0.9, vy: -30, vx: 0, c: '#ffd23f' }); hud(); renderPanel(); } }
      const stats = (t) => TOWERS[t.type].lv[t.lv];
      const inRange = (t, e) => Math.hypot(e.x - t.x, e.y - t.y) <= stats(t).range * CS;
      function pickTarget(t) { const cands = S.enemies.filter((e) => !e.dead && inRange(t, e) && !(e.E.fly && t.type === 'cannon')); if (!cands.length) return null; const m = t.mode; return cands.reduce((a, b) => (m === 'strong' ? (b.hp > a.hp ? b : a) : m === 'close' ? (Math.hypot(b.x - t.x, b.y - t.y) < Math.hypot(a.x - t.x, a.y - t.y) ? b : a) : m === 'last' ? (b.d < a.d ? b : a) : b.d > a.d ? b : a)); }
      function update(dt) {
        if (S.paused || S.over) return; dt *= S.speed;
        for (let step = 0; step < S.speed; step++) tick(dt / S.speed);
      }
      function tick(dt) {
        S.t += dt;
        if (S.running) { S.waveT += dt; while (S.spawn.length && S.spawn[0].at <= S.waveT) spawn(S.spawn.shift()); }
        for (const e of S.enemies) {
          if (e.dead) continue; e.slowT -= dt; const sp = e.E.speed * CS * (e.slowT > 0 ? 1 - e.slow : 1); e.d += sp * dt; [e.x, e.y] = posAt(e.d);
          if (e.E.heal && Math.random() < dt * 0.8) { S.enemies.forEach((o) => { if (!o.dead && Math.hypot(o.x - e.x, o.y - e.y) < 70) o.hp = Math.min(o.max, o.hp + o.max * 0.08); }); S.fx.push({ ring: true, x: e.x, y: e.y, life: 0.5, c: '#3ddc97' }); }
          if (e.d >= pathLen) { e.dead = true; e.leaked = true; S.lives -= e.E.boss ? 5 : 1; hud(); if (S.lives <= 0) { S.lives = 0; S.over = true; report('Tower Defense', S.wave - 1); hud(); renderBar(); } }
        }
        for (const t of S.towers) {
          const st = stats(t); t.cool -= dt;
          if (t.type === 'laser') { if (!t.target || t.target.dead || !inRange(t, t.target)) { t.target = pickTarget(t); t.ramp = 0; } if (t.target) { t.ramp = Math.min(3, t.ramp + dt); damage(t.target, st.dps * (0.5 + t.ramp * 0.5) * dt, 'laser'); t.ang = Math.atan2(t.target.y - t.y, t.target.x - t.x); } continue; }
          if (t.cool > 0) continue; const tg = pickTarget(t); if (!tg) continue; t.cool = 1 / st.rate; t.ang = Math.atan2(tg.y - t.y, tg.x - t.x);
          if (t.type === 'tesla') { let cur = tg; const hit = new Set(); const pts = [[t.x, t.y]]; for (let k = 0; k < st.chain && cur; k++) { hit.add(cur); pts.push([cur.x, cur.y]); damage(cur, st.dmg * Math.pow(0.85, k), 'tesla'); const nxt = S.enemies.filter((o) => !o.dead && !hit.has(o) && Math.hypot(o.x - cur.x, o.y - cur.y) < 90).sort((a, b) => Math.hypot(a.x - cur.x, a.y - cur.y) - Math.hypot(b.x - cur.x, b.y - cur.y))[0]; cur = nxt; } S.fx.push({ bolt: pts, life: 0.15, c: '#e6ff9a' }); continue; }
          S.shots.push({ x: t.x, y: t.y, tg, type: t.type, st, spd: t.type === 'cannon' ? 320 : 520 });
        }
        for (const s of S.shots) {
          if (s.tg.dead && !s.tx) { s.tx = s.tg.x; s.ty = s.tg.y; }
          const tx = s.tx ?? s.tg.x, ty = s.ty ?? s.tg.y; const dx = tx - s.x, dy = ty - s.y, d = Math.hypot(dx, dy);
          if (d < s.spd * dt + 4) { s.done = true; const st = s.st;
            if (st.splash) { S.enemies.forEach((e) => { if (!e.dead && Math.hypot(e.x - tx, e.y - ty) <= st.splash * CS && !(e.E.fly && s.type === 'cannon')) { damage(e, st.dmg, s.type); if (st.slow) { e.slow = st.slow; e.slowT = 1.6; } } }); S.fx.push({ ring: true, x: tx, y: ty, life: 0.35, c: s.type === 'frost' ? '#9fd8ff' : '#ffb84f', R: st.splash * CS }); }
            else if (!s.tg.dead) { damage(s.tg, st.dmg, s.type); if (st.slow) { s.tg.slow = st.slow; s.tg.slowT = 1.6; } }
          } else { s.x += (dx / d) * s.spd * dt; s.y += (dy / d) * s.spd * dt; }
        }
        S.shots = S.shots.filter((s) => !s.done); S.enemies = S.enemies.filter((e) => !e.dead);
        for (const f of S.fx) { f.life -= dt; if (f.vx !== undefined) { f.x += f.vx * dt; f.y += f.vy * dt; } }
        S.fx = S.fx.filter((f) => f.life > 0);
        if (S.running && !S.spawn.length && !S.enemies.length && !S.over) {
          S.running = false; const bonus = 20 + S.wave * 3; S.gold += bonus; S.score += S.wave * 50; S.fx.push({ x: W / 2, y: H / 2, text: `Wave ${S.wave} cleared! +${bonus}💰`, life: 1.6, vx: 0, vy: -10, c: '#fff', big: true });
          if (S.wave >= 30 && !S.won) { S.won = true; report('Tower Defense', S.wave); MS.toast('🏆 You defended all 30 waves! Endless mode continues.', 'good'); }
          hud(); renderBar(); if (S.auto) setTimeout(() => { if (!S.running && !S.over) startWave(); }, 1200);
        }
      }
      // drawing
      function draw() {
        const m = MAPS[mapName]; g.fillStyle = m.bg; g.fillRect(0, 0, W, H);
        g.globalAlpha = 0.08; g.fillStyle = '#fff'; for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) if ((c + r) % 2) g.fillRect(c * CS, r * CS, CS, CS); g.globalAlpha = 1;
        g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = CS * 0.86; g.lineJoin = 'round'; g.lineCap = 'round'; g.beginPath(); path.forEach((p, i) => (i ? g.lineTo(p[0], p[1] + 3) : g.moveTo(p[0], p[1] + 3))); g.stroke();
        g.strokeStyle = m.path; g.lineWidth = CS * 0.8; g.beginPath(); path.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
        g.setLineDash([6, 10]); g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 2; g.lineDashOffset = -S.t * 30; g.beginPath(); path.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); g.setLineDash([]);
        const end = path[path.length - 1]; g.font = '26px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🏰', MS.clamp(end[0], 20, W - 20), MS.clamp(end[1], 20, H - 20));
        // towers
        for (const t of S.towers) {
          const T = TOWERS[t.type];
          if (S.sel === t) { g.fillStyle = 'rgba(255,255,255,.08)'; g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1.5; g.beginPath(); g.arc(t.x, t.y, stats(t).range * CS, 0, 7); g.fill(); g.stroke(); }
          g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(t.x + 2, t.y + 4, 17, 0, 7); g.fill();
          g.fillStyle = '#20243a'; g.beginPath(); g.arc(t.x, t.y, 17, 0, 7); g.fill(); g.strokeStyle = T.color; g.lineWidth = 3; g.stroke();
          g.save(); g.translate(t.x, t.y); g.rotate(t.ang || 0); g.fillStyle = T.color; g.fillRect(4, -4, 14, 8); g.restore();
          g.font = '17px system-ui'; g.fillText(T.icon, t.x, t.y + 1);
          for (let k = 0; k <= t.lv; k++) { g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(t.x - 8 + k * 8, t.y + 21, 2.6, 0, 7); g.fill(); }
          if (t.type === 'laser' && t.target && !t.target.dead) { g.strokeStyle = T.color; g.globalAlpha = 0.5 + 0.5 * Math.random(); g.lineWidth = 2 + t.ramp * 1.6; g.beginPath(); g.moveTo(t.x, t.y); g.lineTo(t.target.x, t.target.y); g.stroke(); g.lineWidth = 1.5; g.strokeStyle = '#fff'; g.stroke(); g.globalAlpha = 1; }
        }
        // enemies
        for (const e of S.enemies) {
          const r = e.E.r; const bob = e.E.fly ? Math.sin(S.t * 8 + e.wob) * 3 - 6 : 0;
          if (e.E.fly) { g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(e.x, e.y + 8, r, r / 2.5, 0, 0, 7); g.fill(); }
          g.fillStyle = e.E.color; g.beginPath(); g.arc(e.x, e.y + bob, r, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 2; g.stroke();
          if (e.E.fly) { g.strokeStyle = e.E.color; g.lineWidth = 3; const f = Math.sin(S.t * 30) * 5; g.beginPath(); g.moveTo(e.x - r, e.y + bob); g.lineTo(e.x - r - 7, e.y + bob - 4 - f); g.moveTo(e.x + r, e.y + bob); g.lineTo(e.x + r + 7, e.y + bob - 4 - f); g.stroke(); }
          if (e.E.armor) { g.strokeStyle = '#d0d4f0'; g.lineWidth = 2; g.beginPath(); g.arc(e.x, e.y + bob, r - 4, 0, 7); g.stroke(); }
          if (e.E.heal) { g.fillStyle = '#fff'; g.fillRect(e.x - 1.5, e.y + bob - 5, 3, 10); g.fillRect(e.x - 5, e.y + bob - 1.5, 10, 3); }
          if (e.E.boss) { g.font = '18px system-ui'; g.fillText('👹', e.x, e.y + bob + 1); }
          else { g.fillStyle = '#111'; g.beginPath(); g.arc(e.x - r * 0.3, e.y + bob - r * 0.15, r * 0.14, 0, 7); g.arc(e.x + r * 0.3, e.y + bob - r * 0.15, r * 0.14, 0, 7); g.fill(); }
          if (e.slowT > 0) { g.strokeStyle = '#9fd8ff'; g.lineWidth = 2; g.beginPath(); g.arc(e.x, e.y + bob, r + 3, 0, 7); g.stroke(); }
          const bw = Math.max(20, r * 2.2); g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(e.x - bw / 2, e.y + bob - r - 9, bw, 4); g.fillStyle = e.hp / e.max > 0.5 ? '#3ddc97' : e.hp / e.max > 0.25 ? '#ffb84f' : '#ff5d6c'; g.fillRect(e.x - bw / 2, e.y + bob - r - 9, (bw * Math.max(0, e.hp)) / e.max, 4);
        }
        for (const s of S.shots) { g.fillStyle = s.type === 'cannon' ? '#2a2a2a' : s.type === 'frost' ? '#9fd8ff' : '#f5f0c8'; g.beginPath(); g.arc(s.x, s.y, s.type === 'cannon' ? 5 : 3, 0, 7); g.fill(); }
        for (const f of S.fx) {
          g.globalAlpha = Math.max(0, Math.min(1, f.life * 2));
          if (f.bolt) { g.strokeStyle = f.c; g.lineWidth = 2.5; g.beginPath(); f.bolt.forEach((p, i) => { if (!i) return g.moveTo(p[0], p[1]); const q = f.bolt[i - 1]; for (let k = 1; k <= 4; k++) g.lineTo(q[0] + ((p[0] - q[0]) * k) / 4 + (k < 4 ? (Math.random() - 0.5) * 14 : 0), q[1] + ((p[1] - q[1]) * k) / 4 + (k < 4 ? (Math.random() - 0.5) * 14 : 0)); }); g.stroke(); }
          else if (f.ring) { g.strokeStyle = f.c; g.lineWidth = 3; g.beginPath(); g.arc(f.x, f.y, (f.R || 30) * (1 - f.life), 0, 7); g.stroke(); }
          else if (f.text) { g.fillStyle = f.c; g.font = f.big ? 'bold 30px system-ui' : 'bold 13px system-ui'; g.fillText(f.text, f.x, f.y); }
          else { g.fillStyle = f.c; g.beginPath(); g.arc(f.x, f.y, f.r, 0, 7); g.fill(); }
        }
        g.globalAlpha = 1;
        // placement ghost
        if (S.place && S.hover) { const [c, r] = S.hover; const ok = canPlace(c, r); const T = TOWERS[S.place]; g.fillStyle = ok ? 'rgba(61,220,151,.18)' : 'rgba(255,93,108,.25)'; g.strokeStyle = ok ? '#3ddc97' : '#ff5d6c'; g.lineWidth = 1.5; g.beginPath(); g.arc(c * CS + CS / 2, r * CS + CS / 2, T.lv[0].range * CS, 0, 7); g.fill(); g.stroke(); g.globalAlpha = 0.7; g.font = '20px system-ui'; g.fillText(T.icon, c * CS + CS / 2, r * CS + CS / 2); g.globalAlpha = 1; }
        g.textAlign = 'left'; g.textBaseline = 'alphabetic';
        if (!S.running && S.wave === 0 && !S.towers.length) banner(g, W, H, '🏰 Tower Defense', 'Pick a tower below, tap the grass to build, then Start wave');
        if (S.over) banner(g, W, H, 'Defeated on wave ' + S.wave, `Score ${S.score} · press R or ↺ to try again`);
        if (S.paused && !S.over) banner(g, W, H, 'Paused', 'Press P or Space to resume');
      }
      const canPlace = (c, r) => c >= 0 && r >= 0 && c < COLS && r < ROWS && !pathCells.has(c + ',' + r) && !S.towers.some((t) => t.c === c && t.r === r) && S.gold >= TOWERS[S.place].cost;
      const cell = (e) => { const b = cv.getBoundingClientRect(); return [Math.floor(((e.clientX - b.left) / b.width) * W / CS), Math.floor(((e.clientY - b.top) / b.height) * H / CS)]; };
      cv.addEventListener('pointermove', (e) => { S.hover = cell(e); });
      cv.addEventListener('pointerleave', () => { S.hover = null; });
      cv.addEventListener('pointerdown', (e) => {
        const [c, r] = cell(e); S.hover = [c, r];
        const t = S.towers.find((x) => x.c === c && x.r === r);
        if (t) { S.sel = t; S.place = null; renderBar(); renderPanel(); return; }
        if (S.place) { if (canPlace(c, r)) { const T = TOWERS[S.place]; S.gold -= T.cost; const nt = { type: S.place, c, r, x: c * CS + CS / 2, y: r * CS + CS / 2, lv: 0, cool: 0, mode: 'first', spent: T.cost }; S.towers.push(nt); S.fx.push({ ring: true, x: nt.x, y: nt.y, life: 0.4, c: T.color, R: 40 }); hud(); if (S.gold < T.cost || !e.shiftKey) { S.place = null; S.sel = nt; } renderBar(); renderPanel(); } else MS.toast(pathCells.has(c + ',' + r) ? "Can't build on the road" : S.gold < TOWERS[S.place].cost ? 'Not enough gold' : 'Spot taken'); return; }
        S.sel = null; renderPanel();
      });
      function renderBar() {
        bar.innerHTML = '';
        Object.entries(TOWERS).forEach(([k, T], i) => bar.append(h('button.btn', { class: S.place === k ? 'on' : '', title: `${T.desc} (key ${i + 1})`, disabled: S.gold < T.cost, style: { opacity: S.gold < T.cost ? 0.5 : 1 }, on: { click: () => { S.place = S.place === k ? null : k; S.sel = null; renderBar(); renderPanel(); cv.focus(); } } }, `${T.icon} ${T.name} · ${T.cost}`)));
        bar.append(h('button.btn.primary', { disabled: S.running || S.over, on: { click: () => { startWave(); cv.focus(); } } }, S.running ? `Wave ${S.wave}…` : `▶ Start wave ${S.wave + 1}`),
          h('button.btn', { class: S.speed > 1 ? 'on' : '', title: 'Game speed (F)', on: { click: () => { S.speed = S.speed === 1 ? 2 : S.speed === 2 ? 3 : 1; renderBar(); } } }, '⏩ ' + S.speed + 'x'),
          h('button.btn', { class: S.auto ? 'on' : '', title: 'Auto-start next wave', on: { click: () => { S.auto = !S.auto; renderBar(); } } }, '🔁 Auto'),
          h('select.input', { on: { change: (e) => { mapName = e.target.value; reset(); } } }, Object.keys(MAPS).map((m) => h('option', { selected: m === mapName }, m))),
          h('button.btn', { title: 'Restart (R)', on: { click: reset } }, '↺'));
      }
      function renderPanel() {
        panel.innerHTML = ''; const t = S.sel; if (!t) { panel.append(h('span.small.muted', S.place ? `Placing ${TOWERS[S.place].name} — Shift-click to place several · Esc to cancel` : 'Tip: click a tower to upgrade, sell or change targeting · keys 1-5 pick towers · Space pauses')); return; }
        const T = TOWERS[t.type], st = stats(t), nx = T.lv[t.lv + 1];
        const desc = (x) => [x.dmg && `dmg ${x.dmg}`, x.dps && `dps ${x.dps}`, x.rate && `${x.rate}/s`, `range ${x.range}`, x.splash && `splash ${x.splash}`, x.slow && `slow ${Math.round(x.slow * 100)}%`, x.chain && `chain ${x.chain}`].filter(Boolean).join(' · ');
        panel.append(h('strong', `${T.icon} ${T.name} L${t.lv + 1}`), h('span.small.muted', desc(st)),
          nx ? h('button.btn.primary', { disabled: S.gold < nx.cost, on: { click: () => { if (S.gold < nx.cost) return; S.gold -= nx.cost; t.spent += nx.cost; t.lv++; S.fx.push({ ring: true, x: t.x, y: t.y, life: 0.5, c: '#ffd23f', R: 50 }); hud(); renderBar(); renderPanel(); } } }, `⬆ Upgrade ${nx.cost} → ${desc(nx)}`) : h('span.tag', 'MAX'),
          t.type !== 'laser' || true ? h('select.input', { title: 'Targeting', on: { change: (e) => { t.mode = e.target.value; } } }, [['first', 'First'], ['last', 'Last'], ['strong', 'Strongest'], ['close', 'Closest']].map(([v, l]) => h('option', { value: v, selected: t.mode === v }, '🎯 ' + l))) : null,
          h('button.btn.danger', { on: { click: () => { const back = Math.floor(t.spent * 0.7); S.gold += back; S.towers = S.towers.filter((x) => x !== t); S.sel = null; hud(); renderBar(); renderPanel(); } } }, `Sell +${Math.floor(t.spent * 0.7)}`));
      }
      reset();
      return { update, draw, key: (k) => {
        if (k === ' ' || k === 'p' || k === 'P') S.paused = !S.paused;
        else if (k === 'r' || k === 'R') reset();
        else if (k === 'f' || k === 'F') { S.speed = S.speed === 3 ? 1 : S.speed + 1; renderBar(); }
        else if (k === 'Escape') { S.place = null; S.sel = null; renderBar(); renderPanel(); }
        else if (k === 'Enter' || k === 'n' || k === 'N') startWave();
        else if (k === 'u' && S.sel) panel.querySelector('.btn.primary')?.click();
        else { const i = '12345'.indexOf(k); if (i >= 0) { S.place = Object.keys(TOWERS)[i]; S.sel = null; renderBar(); renderPanel(); } }
      } };
    });
    host.append(bar, panel);
    return stop;
  } };
  // register palette commands for every game (later game packs load after the Arcade app registers)
  Object.entries(GAMES).forEach(([k, gm]) => { if (!MS.commands.some((c) => c.id === 'game-' + k)) MS.command({ id: 'game-' + k, title: 'Play ' + gm.name, icon: gm.icon, group: 'Arcade', run: () => MS.go('arcade', k) }); });
  if (MS.appMap.arcade) MS.appMap.arcade.desc = Object.keys(GAMES).length + ' games with high scores';
})();
