/* Pocket Pet: a virtual pet that lives in real time — hunger, fun, energy and hygiene drift even while the app is closed.
   Feed, play (catch-the-star mini-game), sleep, wash; earns coins, grows through 4 life stages, mood-driven canvas animation */
(function () {
  const { h } = MS;
  const SPECIES = [['blob', '🟣 Blob', '#a78bfa'], ['cat', '🐱 Cat', '#fbbf24'], ['dino', '🦖 Dino', '#4ade80'], ['ghost', '👻 Ghost', '#e5e7eb']];
  const FOODS = [['🍎', 'Apple', 2, 18, 0], ['🍕', 'Pizza', 5, 35, 5], ['🍰', 'Cake', 8, 25, 20], ['🥦', 'Broccoli', 3, 22, -5]];
  const STAGES = [[0, 'Egg 🥚'], [0.02, 'Baby'], [1, 'Kid'], [3, 'Teen'], [7, 'Adult']];
  const RATE = { food: 4, fun: 5, energy: 3, clean: 2.5 }; // points lost per hour
  const clamp = (v) => Math.max(0, Math.min(100, v));
  MS.register({
    id: 'pet', name: 'Pocket Pet', icon: '🐣', group: 'Play', desc: 'A virtual pet that lives in real time', keywords: 'pet tamagotchi virtual pet care feed play cute game companion',
    async mount(view) {
      const st = await MS.store('pet', { pet: null, coins: 20 }); const D = st.data; const save = () => st.touch();
      const wrap = h('div.pad.col', { style: { gap: '12px', maxWidth: '760px', margin: '0 auto' } }); view.append(wrap);
      let raf = null, game = null; const stopAll = () => { cancelAnimationFrame(raf); raf = null; game?.cleanup?.(); game = null; };
      function tick() { const p = D.pet; if (!p) return; const now = Date.now(); const hrs = (now - p.last) / 3.6e6; if (hrs <= 0) return; p.last = now; const m = p.sleeping ? 0.4 : 1;
        p.food = clamp(p.food - RATE.food * hrs * m); p.fun = clamp(p.fun - RATE.fun * hrs * m); p.clean = clamp(p.clean - RATE.clean * hrs); p.energy = clamp(p.energy + (p.sleeping ? 25 : -RATE.energy) * hrs);
        if (p.sleeping && p.energy >= 100) p.sleeping = false; p.poops = Math.min(4, (p.poops || 0) + (Math.random() < hrs * 0.25 ? 1 : 0)); if (p.poops) p.clean = clamp(p.clean - hrs * 3 * p.poops);
        const low = ['food', 'fun', 'clean', 'energy'].filter((k) => p[k] < 15).length; p.health = clamp((p.health ?? 100) + (low >= 2 ? -6 : 3) * hrs); }
      const age = (p) => (Date.now() - p.born) / 864e5; const stage = (p) => { const a = age(p) + (p.xp || 0) / 100; let s = STAGES[0][1]; STAGES.forEach(([d, n]) => { if (a >= d) s = n; }); return s; };
      const mood = (p) => { if (p.sleeping) return 'sleep'; const avg = (p.food + p.fun + p.clean + p.energy) / 4; if (p.health < 30) return 'sick'; if (avg > 70) return 'happy'; if (avg > 40) return 'ok'; return 'sad'; };
      function adopt() { stopAll(); wrap.innerHTML = ''; let sp = 'blob'; const nameIn = h('input.input', { placeholder: 'Name your pet', value: 'Mochi' }); const row = h('div.row', { style: { flexWrap: 'wrap', justifyContent: 'center' } });
        const draw = () => { row.innerHTML = ''; SPECIES.forEach(([k, n]) => row.append(h('button.btn', { class: sp === k ? 'on' : '', on: { click: () => { sp = k; draw(); } } }, n))); }; draw();
        wrap.append(h('div.card.col', { style: { alignItems: 'center', gap: '14px', padding: '30px' } }, h('div', { style: { fontSize: '64px' } }, '🥚'), h('h2', { style: { margin: 0 } }, 'Adopt a pet'), h('div.muted', { style: { textAlign: 'center' } }, 'Your pet lives in real time — its needs change even while MegaStudio is closed. Check in a few times a day!'), row, nameIn, h('button.btn.primary', { on: { click: () => { D.pet = { name: nameIn.value.trim() || 'Mochi', sp, born: Date.now(), last: Date.now(), food: 80, fun: 80, energy: 90, clean: 90, health: 100, xp: 0, poops: 0, sleeping: false }; save(); home(); } } }, '🐣 Hatch!'))); }
      function home() {
        stopAll(); tick(); save(); const p = D.pet; if (!p) return adopt(); wrap.innerHTML = '';
        const cv = h('canvas', { width: 640, height: 340, style: { width: '100%', borderRadius: '16px', cursor: 'pointer' } }); const bars = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '8px' } }); const say = h('div.small.muted', { style: { textAlign: 'center', minHeight: '18px' } });
        const bar = (icon, label, v, col) => h('div.card.col', { style: { gap: '4px', padding: '8px 10px' } }, h('div.row', h('span.small', icon + ' ' + label), h('div.spacer'), h('span.small.mono', Math.round(v))), h('div', { style: { height: '8px', background: 'var(--panel2)', borderRadius: '4px' } }, h('div', { style: { height: '100%', width: v + '%', background: v < 25 ? '#ef4444' : col, borderRadius: '4px', transition: 'width .3s' } })));
        const drawBars = () => { bars.innerHTML = ''; bars.append(bar('🍽', 'Food', p.food, '#f59e0b'), bar('🎈', 'Fun', p.fun, '#ec4899'), bar('⚡', 'Energy', p.energy, '#3b82f6'), bar('🛁', 'Hygiene', p.clean, '#14b8a6'), bar('❤️', 'Health', p.health, '#22c55e')); };
        let bounce = 0, hearts = [], bubbles = [], eat = null; const act = (fn, msg) => { if (p.sleeping && fn !== wake) { say.textContent = `💤 ${p.name} is sleeping…`; return; } fn(); p.xp = (p.xp || 0) + 2; save(); drawBars(); say.textContent = msg; bounce = 1; };
        const wake = () => { p.sleeping = false; };
        const foodBar = h('div.row', { style: { flexWrap: 'wrap', justifyContent: 'center' } }, FOODS.map(([e, n, cost, food, fun]) => h('button.btn', { title: `${n}: +${food} food${fun ? `, ${fun > 0 ? '+' : ''}${fun} fun` : ''}`, on: { click: () => { if (D.coins < cost) return MS.toast('Not enough coins — play a game to earn some!', 'bad'); if (p.food > 95) { say.textContent = `${p.name} is full! 😮‍💨`; return; } act(() => { D.coins -= cost; p.food = clamp(p.food + food); p.fun = clamp(p.fun + fun); if (n === 'Broccoli') p.health = clamp(p.health + 8); eat = { e, t: 1 }; }, `${p.name} ate the ${n.toLowerCase()}! 😋`); top(); } } }, `${e} ${cost}🪙`)));
        const coinsEl = h('strong'); const top = () => (coinsEl.textContent = '🪙 ' + D.coins);
        wrap.append(h('div.row', { style: { flexWrap: 'wrap' } }, h('h2', { style: { margin: 0 } }, p.name), h('span.tag', stage(p)), h('span.small.muted', `${age(p) < 1 ? Math.round(age(p) * 24) + ' hours' : Math.floor(age(p)) + (Math.floor(age(p)) === 1 ? ' day' : ' days')} old · ${p.xp || 0} XP`), h('div.spacer'), coinsEl), cv, say, bars, foodBar,
          h('div.row', { style: { flexWrap: 'wrap', justifyContent: 'center' } },
            h('button.btn.primary', { on: { click: () => (p.sleeping ? (say.textContent = '💤 Shh… sleeping') : minigame()) } }, '⭐ Play catch'),
            h('button.btn', { on: { click: () => act(() => { p.fun = clamp(p.fun + 6); hearts.push(...Array.from({ length: 5 }, () => ({ x: 320 + (Math.random() - 0.5) * 80, y: 180, t: 1 }))); }, `${p.name} loves pets! 💕`) } }, '🤚 Pet'),
            h('button.btn', { on: { click: () => act(() => { p.clean = 100; p.poops = 0; bubbles.push(...Array.from({ length: 14 }, () => ({ x: 260 + Math.random() * 120, y: 260, r: 4 + Math.random() * 8, t: 1.4 }))); }, 'Squeaky clean! 🫧') } }, '🛁 Wash'),
            h('button.btn', { on: { click: () => { if (p.sleeping) { p.sleeping = false; say.textContent = `${p.name} woke up! ☀️`; } else { if (p.energy > 90) { say.textContent = `${p.name} isn't sleepy`; return; } p.sleeping = true; } save(); home(); } } }, p.sleeping ? '☀️ Wake' : '🌙 Sleep'),
            h('button.btn', { on: { click: () => { p.health = clamp(p.health + 30); D.coins = Math.max(0, D.coins - 6); save(); drawBars(); top(); say.textContent = '💊 Feeling better!'; } } }, '💊 Medicine 6🪙'),
            h('button.btn.sm', { on: { click: async () => { if (await MS.confirm('Release pet?', `${p.name} will go live in the wild. This starts over with a new egg.`, 'Release')) { D.pet = null; save(); adopt(); } } } }, '🍃 Release')));
        top(); drawBars(); cv.onclick = () => act(() => { p.fun = clamp(p.fun + 2); hearts.push({ x: 320, y: 170, t: 1 }); }, ['Hehe! 😊', 'Boop!', '✨', `${p.name} wiggles`][Math.floor(Math.random() * 4)]);
        const g = cv.getContext('2d'); const col = SPECIES.find((s) => s[0] === p.sp)?.[2] || '#a78bfa'; let t = 0, last = performance.now(), lastTick = 0;
        const loop = (now) => { raf = requestAnimationFrame(loop); const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt; if (now - lastTick > 10000) { lastTick = now; tick(); save(); drawBars(); }
          const m = mood(p); const night = p.sleeping; const sky = g.createLinearGradient(0, 0, 0, 340); sky.addColorStop(0, night ? '#1e1b4b' : '#bae6fd'); sky.addColorStop(1, night ? '#312e81' : '#e0f2fe'); g.fillStyle = sky; g.fillRect(0, 0, 640, 340);
          if (night) { g.fillStyle = '#fef9c3'; g.beginPath(); g.arc(540, 60, 26, 0, 7); g.fill(); g.fillStyle = '#1e1b4b'; g.beginPath(); g.arc(552, 52, 24, 0, 7); g.fill(); for (let i = 0; i < 20; i++) { g.fillStyle = `rgba(255,255,255,${0.4 + 0.4 * Math.sin(t * 2 + i)})`; g.fillRect((i * 97) % 640, (i * 53) % 160, 2, 2); } }
          else { g.fillStyle = '#fde047'; g.beginPath(); g.arc(560, 60, 28, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.9)'; [[100 + (t * 8) % 700 - 60, 60], [380 + (t * 5) % 700 - 60, 90]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 20, 0, 7); g.arc(x + 22, y - 8, 24, 0, 7); g.arc(x + 46, y, 18, 0, 7); g.fill(); }); }
          g.fillStyle = night ? '#166534' : '#86efac'; g.fillRect(0, 270, 640, 70); g.fillStyle = night ? '#14532d' : '#4ade80'; for (let x = 0; x < 640; x += 14) g.fillRect(x, 268, 3, 8);
          for (let i = 0; i < (p.poops || 0); i++) { g.font = '26px system-ui'; g.fillText('💩', 90 + i * 120, 300); }
          // pet body
          bounce = Math.max(0, bounce - dt * 2); const hop = m === 'happy' ? Math.abs(Math.sin(t * 4)) * 10 : m === 'sleep' ? 0 : Math.abs(Math.sin(t * 2)) * 4; const by = 220 - hop - bounce * 30; const breathe = 1 + Math.sin(t * (m === 'sleep' ? 1.5 : 3)) * 0.03; const isEgg = stage(p).startsWith('Egg'); const sz = isEgg ? 55 : { Baby: 50, Kid: 60, Teen: 68, Adult: 76 }[stage(p)] || 60;
          g.fillStyle = 'rgba(0,0,0,.15)'; g.beginPath(); g.ellipse(320, 275, sz * 0.9, 10, 0, 0, 7); g.fill();
          g.save(); g.translate(320, by); g.scale(1 / breathe, breathe);
          if (isEgg) { g.fillStyle = '#fef3c7'; g.beginPath(); g.ellipse(0, 0, sz * 0.75, sz, Math.sin(t * 3) * 0.08, 0, 7); g.fill(); g.fillStyle = col; [[-15, -10], [12, 15], [-5, 30]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 8, 0, 7); g.fill(); }); g.restore(); }
          else {
            g.fillStyle = col; if (p.sp === 'ghost') { g.beginPath(); g.arc(0, 0, sz, Math.PI, 0); for (let i = 0; i <= 6; i++) g.lineTo(sz - (i * sz * 2) / 6, sz * 0.8 + (i % 2 ? -10 : 0) + Math.sin(t * 4 + i) * 3); g.closePath(); g.fill(); }
            else { g.beginPath(); g.ellipse(0, 0, sz, sz * 0.85, 0, 0, 7); g.fill(); }
            if (p.sp === 'cat') { [[-1], [1]].forEach(([s]) => { g.beginPath(); g.moveTo(s * sz * 0.75, -sz * 0.45); g.lineTo(s * sz * 0.5, -sz * 1.05); g.lineTo(s * sz * 0.2, -sz * 0.75); g.fill(); }); g.strokeStyle = '#78350f'; g.lineWidth = 2; [-1, 1].forEach((s) => [0, 8].forEach((o) => { g.beginPath(); g.moveTo(s * sz * 0.35, sz * 0.1 + o); g.lineTo(s * sz * 0.8, o); g.stroke(); })); }
            if (p.sp === 'dino') { g.fillStyle = '#16a34a'; for (let i = 0; i < 4; i++) { g.beginPath(); const x = -sz * 0.5 + i * sz * 0.33; g.moveTo(x - 10, -sz * 0.75); g.lineTo(x, -sz * 1.05); g.lineTo(x + 10, -sz * 0.75); g.fill(); } }
            const eyeY = -sz * 0.15; g.fillStyle = '#111';
            if (m === 'sleep') { g.strokeStyle = '#111'; g.lineWidth = 3; [-1, 1].forEach((s) => { g.beginPath(); g.arc(s * sz * 0.3, eyeY, 8, 0.1, Math.PI - 0.1); g.stroke(); }); g.fillStyle = '#fff'; g.font = 'bold 22px system-ui'; g.fillText('z', sz * 0.7, -sz + Math.sin(t * 2) * 6); g.font = 'bold 16px system-ui'; g.fillText('z', sz * 0.9, -sz - 22 + Math.sin(t * 2 + 1) * 6); }
            else { const blink = (t % 4) < 0.12; [-1, 1].forEach((s) => { if (blink) g.fillRect(s * sz * 0.3 - 8, eyeY, 16, 3); else { g.beginPath(); g.arc(s * sz * 0.3, eyeY, m === 'sick' ? 6 : 9, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(s * sz * 0.3 + 3, eyeY - 3, 3, 0, 7); g.fill(); g.fillStyle = '#111'; } });
              g.strokeStyle = '#111'; g.lineWidth = 3; g.beginPath(); if (m === 'happy') g.arc(0, sz * 0.15, 14, 0.1, Math.PI - 0.1); else if (m === 'ok') { g.moveTo(-10, sz * 0.25); g.lineTo(10, sz * 0.25); } else g.arc(0, sz * 0.38, 12, Math.PI + 0.3, -0.3); g.stroke();
              if (m === 'happy') { g.fillStyle = 'rgba(244,114,182,.5)'; [-1, 1].forEach((s) => { g.beginPath(); g.arc(s * sz * 0.55, sz * 0.12, 9, 0, 7); g.fill(); }); }
              if (m === 'sick') { g.fillStyle = 'rgba(132,204,22,.35)'; g.beginPath(); g.ellipse(0, 0, sz, sz * 0.85, 0, 0, 7); g.fill(); }
              if (m === 'sad') { g.fillStyle = '#60a5fa'; g.beginPath(); g.arc(-sz * 0.3, eyeY + 16 + (t * 30) % 20, 4, 0, 7); g.fill(); } }
            g.restore(); }
          if (eat) { eat.t -= dt; g.font = '40px system-ui'; g.globalAlpha = Math.max(0, eat.t); g.fillText(eat.e, 330 + 40 * eat.t, by + 10 - 30 * eat.t); g.globalAlpha = 1; if (eat.t <= 0) eat = null; }
          hearts.forEach((q) => { q.t -= dt * 0.7; q.y -= 50 * dt; q.x += Math.sin(q.t * 10) * 0.5; g.globalAlpha = Math.max(0, q.t); g.font = '22px system-ui'; g.fillText('💖', q.x, q.y); }); hearts = hearts.filter((q) => q.t > 0);
          bubbles.forEach((q) => { q.t -= dt; q.y -= 60 * dt; g.globalAlpha = Math.max(0, q.t / 1.4); g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(q.x + Math.sin(q.t * 6) * 6, q.y, q.r, 0, 7); g.stroke(); }); bubbles = bubbles.filter((q) => q.t > 0); g.globalAlpha = 1;
          const need = p.sleeping ? null : p.food < 30 ? '🍽' : p.fun < 30 ? '🎈' : p.clean < 30 ? '🛁' : p.energy < 25 ? '😴' : null;
          if (need) { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(410, 120, 30, 24, 0, 0, 7); g.fill(); g.beginPath(); g.arc(385, 148, 6, 0, 7); g.fill(); g.font = '26px system-ui'; g.fillText(need, 396, 130); }
        };
        raf = requestAnimationFrame(loop);
      }
      function minigame() {
        stopAll(); const p = D.pet; wrap.innerHTML = ''; const cv = h('canvas', { width: 640, height: 400, style: { width: '100%', borderRadius: '16px', touchAction: 'none' } }); const info = h('strong');
        wrap.append(h('div.row', h('button.btn.sm', { on: { click: () => { stopAll(); home(); } } }, '← Back'), info, h('div.spacer'), h('span.small.muted', 'Move with mouse / touch / ← →. Catch ⭐, dodge 💣')), cv);
        const g = cv.getContext('2d'); const col = SPECIES.find((s) => s[0] === p.sp)?.[2]; let x = 320, items = [], score = 0, left = 30, spawn = 0, last = performance.now(), over = false; const keys = {};
        const kd = (e) => (keys[e.key] = true), ku = (e) => (keys[e.key] = false); document.addEventListener('keydown', kd); document.addEventListener('keyup', ku);
        cv.addEventListener('pointermove', (e) => { const r = cv.getBoundingClientRect(); x = ((e.clientX - r.left) / r.width) * 640; }); cv.addEventListener('pointerdown', (e) => { const r = cv.getBoundingClientRect(); x = ((e.clientX - r.left) / r.width) * 640; });
        game = { cleanup: () => { document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku); } };
        const loop = (now) => { raf = requestAnimationFrame(loop); const dt = Math.min(0.05, (now - last) / 1000); last = now; if (!over) { left -= dt; if (keys.ArrowLeft) x -= 420 * dt; if (keys.ArrowRight) x += 420 * dt; x = Math.max(30, Math.min(610, x)); spawn -= dt; if (spawn <= 0) { spawn = 0.45; items.push({ x: 20 + Math.random() * 600, y: -20, v: 160 + Math.random() * 140 + (30 - left) * 6, bomb: Math.random() < 0.22 }); }
            items.forEach((it) => { it.y += it.v * dt; if (!it.hit && it.y > 330 && it.y < 370 && Math.abs(it.x - x) < 40) { it.hit = true; if (it.bomb) { score = Math.max(0, score - 3); } else score++; } }); items = items.filter((it) => !it.hit && it.y < 420);
            if (left <= 0) { over = true; game.cleanup(); const coins = score; D.coins += coins; p.fun = clamp(p.fun + 10 + score); p.energy = clamp(p.energy - 10); p.xp = (p.xp || 0) + score; tick(); save(); report?.(score); } }
          g.fillStyle = '#e0f2fe'; g.fillRect(0, 0, 640, 400); g.fillStyle = '#86efac'; g.fillRect(0, 370, 640, 30);
          items.forEach((it) => { g.font = '30px system-ui'; g.fillText(it.bomb ? '💣' : '⭐', it.x - 15, it.y); });
          g.fillStyle = col; g.beginPath(); g.ellipse(x, 345, 36, 28, 0, 0, 7); g.fill(); g.fillStyle = '#111'; [-1, 1].forEach((s) => { g.beginPath(); g.arc(x + s * 12, 338, 5, 0, 7); g.fill(); }); g.strokeStyle = '#111'; g.lineWidth = 3; g.beginPath(); g.arc(x, 348, 8, 0.2, Math.PI - 0.2); g.stroke();
          info.textContent = `⭐ ${score}   ⏱ ${Math.max(0, Math.ceil(left))}s`;
          if (over) { g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 0, 640, 400); g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = 'bold 32px system-ui'; g.fillText(`${score} stars!`, 320, 180); g.font = '18px system-ui'; g.fillText(`+${score} 🪙 coins · ${p.name} had fun!`, 320, 215); g.fillText('Tap to go back', 320, 250); g.textAlign = 'left'; cv.onclick = () => { stopAll(); home(); }; } };
        raf = requestAnimationFrame(loop);
      }
      const report = (s) => MS.arcade?.report?.('Pet Catch', s);
      D.pet ? home() : adopt();
      return { unmount: () => { game?.cleanup?.(); stopAll(); if (D.pet) { tick(); save(); } } };
    },
  });
})();
