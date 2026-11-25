/* Solar System: real-time 3D orrery from JPL Keplerian elements — planets, Moon, Pluto, Halley's comet, asteroid belt,
   time travel, follow camera, facts, distances & light-time */
(function () {
  const { h } = MS;
  const D2R = Math.PI / 180;
  // a, e, I, L, varpi, Omega  (+ rates per century)  — JPL "Approximate Positions of the Planets"
  const EL = {
    Mercury: [[0.38709927, 0.20563593, 7.00497902, 252.2503235, 77.45779628, 48.33076593], [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081]],
    Venus: [[0.72333566, 0.00677672, 3.39467605, 181.9790995, 131.60246718, 76.67984255], [0.0000039, -0.00004107, -0.0007889, 58517.81538729, 0.00268329, -0.27769418]],
    Earth: [[1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0], [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0]],
    Mars: [[1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891], [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343]],
    Jupiter: [[5.202887, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909], [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106]],
    Saturn: [[9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448], [-0.0012506, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794]],
    Uranus: [[19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.9542763, 74.01692503], [-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589]],
    Neptune: [[30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574], [0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664]],
    Pluto: [[39.48211675, 0.2488273, 17.14001206, 238.92903833, 224.06891629, 110.30393684], [-0.00031596, 0.0000517, 0.00004818, 145.20780515, -0.04062942, -0.01183482]],
  };
  const INFO = {
    Sun: { c: ['#fff6c0', '#ffb300'], r: 696340, d: 'G2V yellow dwarf star', day: '25–35 days', moons: '8 planets', fact: 'Holds 99.86% of the Solar System’s mass. Light takes ~8.3 minutes to reach Earth.' },
    Mercury: { c: ['#d9d4cf', '#8c8580'], r: 2440, day: '58.6 days', year: '88 days', moons: 0, fact: 'Smallest planet; temperatures swing from −180 °C to 430 °C.' },
    Venus: { c: ['#fff1c9', '#d8a657'], r: 6052, day: '243 days (retrograde)', year: '225 days', moons: 0, fact: 'Hottest planet (465 °C) thanks to a runaway greenhouse effect. A day is longer than its year.' },
    Earth: { c: ['#8fd3ff', '#1d5fb8'], r: 6371, day: '23 h 56 m', year: '365.25 days', moons: 1, fact: 'The only known world with liquid surface oceans — and life.' },
    Mars: { c: ['#ffb38a', '#c1440e'], r: 3390, day: '24 h 37 m', year: '687 days', moons: 2, fact: 'Home to Olympus Mons, a volcano nearly 3× the height of Everest.' },
    Jupiter: { c: ['#f3e0c2', '#c08a5a'], r: 69911, day: '9 h 56 m', year: '11.9 years', moons: 95, fact: 'More than twice as massive as all other planets combined. The Great Red Spot is a storm bigger than Earth.' },
    Saturn: { c: ['#fbe9b7', '#d1a85e'], r: 58232, day: '10 h 33 m', year: '29.4 years', moons: 146, fact: 'Its rings are mostly ice and span ~280,000 km but are often only ~10 m thick.' },
    Uranus: { c: ['#d6fbff', '#5fc3d6'], r: 25362, day: '17 h 14 m', year: '84 years', moons: 28, fact: 'Rotates on its side with an axial tilt of 98°.' },
    Neptune: { c: ['#a9c6ff', '#2f55d4'], r: 24622, day: '16 h 6 m', year: '165 years', moons: 16, fact: 'Fastest winds in the Solar System — up to 2,100 km/h.' },
    Pluto: { c: ['#f0dcc8', '#a07e64'], r: 1188, day: '6.4 days', year: '248 years', moons: 5, fact: 'Dwarf planet with a heart-shaped nitrogen-ice plain, Tombaugh Regio.' },
    Moon: { c: ['#f2f2f2', '#9a9a9a'], r: 1737, day: '27.3 days', year: '27.3 days (orbit)', moons: 0, fact: 'Tidally locked — we always see the same face. Moving away ~3.8 cm per year.' },
    'Halley’s Comet': { c: ['#e8fbff', '#8ad6ff'], r: 5.5, day: '2.2 days', year: '~76 years', moons: 0, fact: 'Last seen in 1986; returns in mid-2061.' },
  };
  const AU = 149597870.7;
  const jd = (t) => t / 864e5 + 2440587.5;
  function kepler(M, e) { let E = M + e * Math.sin(M); for (let i = 0; i < 12; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); return E; }
  function orbitXYZ(a, e, I, w, O, M) { const E = kepler(M, e); const xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E); const cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(O), sO = Math.sin(O), cI = Math.cos(I), sI = Math.sin(I); return [(cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp, (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp, sw * sI * xp + cw * sI * yp]; }
  function elems(name, T) { const [b, r] = EL[name]; const v = b.map((x, i) => x + r[i] * T); const [a, e, I, L, wp, O] = v; return { a, e, I: I * D2R, w: (wp - O) * D2R, O: O * D2R, M: ((L - wp) % 360) * D2R }; }
  function planetPos(name, t) { const T = (jd(t) - 2451545) / 36525; const k = elems(name, T); return orbitXYZ(k.a, k.e, k.I, k.w, k.O, k.M); }
  const HALLEY = { a: 17.834, e: 0.96714, I: 162.26 * D2R, w: 111.33 * D2R, O: 58.42 * D2R, tp: 2446467.4, P: 75.32 * 365.25 };
  const halleyPos = (t) => { const M = (2 * Math.PI * (jd(t) - HALLEY.tp)) / HALLEY.P; return orbitXYZ(HALLEY.a, HALLEY.e, HALLEY.I, HALLEY.w, HALLEY.O, M); };
  const moonPos = (t, earth) => { const d = jd(t) - 2451545; const L = (218.316 + 13.176396 * d) * D2R; const r = 384400 / AU; return [earth[0] + r * Math.cos(L), earth[1] + r * Math.sin(L), earth[2] + r * Math.sin(L) * 0.0898]; };

  MS.register({
    id: 'space', name: 'Solar System', icon: '🪐', group: 'Tools', desc: '3D orrery with real planet positions', keywords: 'space solar system planets orbit astronomy science sun moon comet orrery 3d',
    async mount(view) {
      const st = await MS.store('space', () => ({ scale: 'compressed', labels: true, orbits: true, belt: true }));
      const cv = h('canvas', { style: { width: '100%', height: '100%', display: 'block', touchAction: 'none', cursor: 'grab' } });
      const g = cv.getContext('2d');
      const card = h('div.card', { style: { position: 'absolute', right: '12px', top: '12px', width: 'min(300px, 70vw)', padding: '14px', display: 'none', boxShadow: 'var(--shadow)' } });
      const dateEl = h('div.mono', { style: { fontSize: '18px', fontWeight: 700 } }); const rateEl = h('div.small.muted');
      const hud = h('div', { style: { position: 'absolute', left: '12px', bottom: '12px', color: '#fff', textShadow: '0 1px 3px #000' } }, dateEl, rateEl);
      const listEl = h('div.row', { style: { position: 'absolute', left: '12px', top: '12px', flexWrap: 'wrap', gap: '4px', maxWidth: 'calc(100% - 340px)' } });
      view.style.position = 'relative'; view.style.overflow = 'hidden'; view.style.background = '#03040a';
      view.append(cv, listEl, card, hud);
      const RATES = [['⏸', 0], ['1×', 1 / 86400], ['1 h/s', 1 / 24], ['1 day/s', 1], ['1 wk/s', 7], ['1 mo/s', 30], ['1 yr/s', 365.25], ['10 yr/s', 3652.5]];
      let rateI = 4, dir = 1, t = Date.now();
      const rateSel = h('select.input', { on: { change: () => { rateI = +rateSel.value; } } }, RATES.map(([l], i) => h('option', { value: i, selected: i === rateI }, l)));
      const dateIn = h('input.input', { type: 'date', style: { width: '140px' }, on: { change: () => { if (dateIn.value) t = new Date(dateIn.value + 'T12:00:00').getTime(); } } });
      const tog = (k, label) => { const b = h('button.btn.sm', { class: st.data[k] ? 'on' : '', on: { click: () => { st.data[k] = !st.data[k]; b.classList.toggle('on', st.data[k]); st.touch(); buildOrbits(); } } }, label); return b; };
      const scaleBtn = h('button.btn.sm', { title: 'Distance scale', on: { click: () => { st.data.scale = st.data.scale === 'true' ? 'compressed' : 'true'; scaleBtn.textContent = st.data.scale === 'true' ? '📏 True scale' : '📏 Compressed'; st.touch(); buildOrbits(); } } }, st.data.scale === 'true' ? '📏 True scale' : '📏 Compressed');
      MS.setActions(h('button.btn.sm', { title: 'Reverse time', on: { click: (e) => { dir = -dir; e.target.textContent = dir > 0 ? '⏩' : '⏪'; } } }, '⏩'), rateSel, dateIn, h('button.btn.sm', { on: { click: () => { t = Date.now(); rateI = 1; rateSel.value = 1; } } }, 'Now'), scaleBtn, tog('orbits', '◯ Orbits'), tog('labels', '🏷 Labels'), tog('belt', '✨ Belt'));
      const bodies = ['Sun', ...Object.keys(EL).slice(0, 3), 'Moon', ...Object.keys(EL).slice(3), 'Halley’s Comet'];
      let focus = 'Sun', followPos = [0, 0, 0];
      bodies.forEach((b) => listEl.append(h('button.btn.sm', { 'data-b': b, style: { background: 'rgba(20,24,48,.7)', color: '#fff', borderColor: 'rgba(255,255,255,.15)' }, on: { click: () => select(b) } }, b === 'Halley’s Comet' ? '☄️ Halley' : b)));
      // camera
      const cam = { yaw: -0.6, pitch: 0.75, dist: 75 }; let W = 800, H = 600, dpr = 1;
      const S = (r) => (st.data.scale === 'true' ? r * 10 : Math.pow(r, 0.55) * 12); // AU -> world units
      const sc = (p) => { const r = Math.hypot(p[0], p[1], p[2]); if (!r) return [0, 0, 0]; const k = S(r) / r; return [p[0] * k, p[1] * k, p[2] * k]; };
      function project(p) {
        const x = p[0] - followPos[0], y = p[1] - followPos[1], z = p[2] - followPos[2];
        const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
        const x1 = x * cy - y * sy, y1 = x * sy + y * cy; // yaw around z
        const y2 = y1 * cp - z * sp, z2 = y1 * sp + z * cp; // pitch
        const depth = cam.dist + y2; if (depth <= 0.5) return null; const f = (Math.min(W, H) * 0.9) / depth;
        return [W / 2 + x1 * f, H / 2 - z2 * f, depth, f];
      }
      // stars & asteroid belt
      const stars = Array.from({ length: 900 }, () => { const u = Math.random() * 2 - 1, th = Math.random() * 6.283; const s = Math.sqrt(1 - u * u); return [s * Math.cos(th), s * Math.sin(th), u, Math.random() ** 3]; });
      const belt = Array.from({ length: 1400 }, () => ({ a: 2.1 + Math.random() * 1.2 + (Math.random() < 0.15 ? 2.1 : 0) * 0, e: Math.random() * 0.15, I: (Math.random() - 0.5) * 0.25, w: Math.random() * 6.283, O: Math.random() * 6.283, M0: Math.random() * 6.283 }));
      let orbits = {};
      function buildOrbits() {
        orbits = {}; const T = (jd(t) - 2451545) / 36525;
        Object.keys(EL).forEach((n) => { const k = elems(n, T); const pts = []; for (let i = 0; i <= 256; i++) { const E = (i / 256) * 2 * Math.PI; const M = E - k.e * Math.sin(E); pts.push(sc(orbitXYZ(k.a, k.e, k.I, k.w, k.O, M))); } orbits[n] = pts; });
        const hp = []; for (let i = 0; i <= 600; i++) { const E = (i / 600) * 2 * Math.PI; const M = E - HALLEY.e * Math.sin(E); hp.push(sc(orbitXYZ(HALLEY.a, HALLEY.e, HALLEY.I, HALLEY.w, HALLEY.O, M))); } orbits['Halley’s Comet'] = hp;
      }
      buildOrbits();
      let P = {};
      function positions() {
        P = { Sun: [0, 0, 0] }; Object.keys(EL).forEach((n) => (P[n] = planetPos(n, t)));
        P.Moon = moonPos(t, P.Earth); P['Halley’s Comet'] = halleyPos(t);
      }
      const worldPos = (n) => { if (n === 'Moon') { const e = sc(P.Earth); const d = [P.Moon[0] - P.Earth[0], P.Moon[1] - P.Earth[1], P.Moon[2] - P.Earth[2]]; const k = (st.data.scale === 'true' ? 10 : 1.4) / Math.hypot(...d) * (st.data.scale === 'true' ? Math.hypot(...d) * 30 : 1); return [e[0] + d[0] * k, e[1] + d[1] * k, e[2] + d[2] * k]; } return sc(P[n]); };
      const radiusPx = (n, f) => { const r = INFO[n].r; const base = n === 'Sun' ? 2.2 : n === 'Halley’s Comet' ? 0.12 : Math.max(0.18, Math.log10(r / 400) * 0.32); return Math.max(n === 'Sun' ? 7 : n === 'Halley’s Comet' ? 2 : 3, base * f * 0.6); };
      let screen = [];
      function draw() {
        g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = '#03040a'; g.fillRect(0, 0, W, H);
        // stars (direction only)
        const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
        for (const s of stars) { const x1 = s[0] * cy - s[1] * sy, y1 = s[0] * sy + s[1] * cy; const y2 = y1 * cp - s[2] * sp, z2 = y1 * sp + s[2] * cp; if (y2 < 0.05) continue; const f = (Math.min(W, H) * 0.9) / y2 * 0.6; const px = W / 2 + x1 * f, py = H / 2 - z2 * f; if (px < 0 || py < 0 || px > W || py > H) continue; g.fillStyle = `rgba(255,255,255,${0.25 + s[3] * 0.75})`; g.fillRect(px, py, 1 + s[3] * 1.2, 1 + s[3] * 1.2); }
        if (focus !== 'Sun') followPos = worldPos(focus); else followPos = [0, 0, 0];
        // orbits
        if (st.data.orbits) for (const [n, pts] of Object.entries(orbits)) { g.strokeStyle = n === focus ? 'rgba(124,92,255,.85)' : n === 'Halley’s Comet' ? 'rgba(138,214,255,.25)' : 'rgba(150,160,220,.28)'; g.lineWidth = n === focus ? 1.6 : 1; g.beginPath(); let pen = false; for (const p of pts) { const q = project(p); if (!q) { pen = false; continue; } if (!pen) { g.moveTo(q[0], q[1]); pen = true; } else g.lineTo(q[0], q[1]); } g.stroke(); }
        // belt
        if (st.data.belt) { const d = jd(t) - 2451545; g.fillStyle = 'rgba(200,190,170,.55)'; for (const b of belt) { const n = (2 * Math.PI) / (365.25 * Math.pow(b.a, 1.5)); const p = sc(orbitXYZ(b.a, b.e, b.I, b.w, b.O, b.M0 + n * d)); const q = project(p); if (q) g.fillRect(q[0], q[1], 1.2, 1.2); } }
        // bodies sorted by depth
        screen = bodies.map((n) => { const wp = worldPos(n); const q = project(wp); return q && { n, q, wp }; }).filter(Boolean).sort((a, b) => b.q[2] - a.q[2]);
        for (const { n, q } of screen) {
          const [x, y, , f] = q; const r = radiusPx(n, f); const I = INFO[n];
          if (n === 'Sun') { const gr = g.createRadialGradient(x, y, 0, x, y, r * 5); gr.addColorStop(0, 'rgba(255,220,120,.9)'); gr.addColorStop(0.2, 'rgba(255,170,40,.35)'); gr.addColorStop(1, 'rgba(255,120,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 5, 0, 7); g.fill(); }
          if (n === 'Halley’s Comet') { const sp2 = project([0, 0, 0]); if (sp2) { const dx = x - sp2[0], dy = y - sp2[1], L = Math.hypot(dx, dy) || 1; const dist = Math.hypot(...P[n]); const tl = MS.clamp(120 / dist, 4, 90); const gr = g.createLinearGradient(x, y, x + (dx / L) * tl, y + (dy / L) * tl); gr.addColorStop(0, 'rgba(180,235,255,.8)'); gr.addColorStop(1, 'rgba(180,235,255,0)'); g.strokeStyle = gr; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (dx / L) * tl, y + (dy / L) * tl); g.stroke(); } }
          if (n === 'Saturn') { g.strokeStyle = 'rgba(230,210,160,.75)'; g.lineWidth = Math.max(1, r * 0.35); g.beginPath(); g.ellipse(x, y, r * 2.1, r * 2.1 * Math.max(0.12, Math.abs(Math.sin(cam.pitch)) * 0.5), -0.3, Math.PI, 2 * Math.PI); g.stroke(); }
          const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r); gr.addColorStop(0, I.c[0]); gr.addColorStop(1, I.c[1]); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
          if (n === 'Jupiter' && r > 6) { g.save(); g.beginPath(); g.arc(x, y, r, 0, 7); g.clip(); g.strokeStyle = 'rgba(150,90,50,.35)'; g.lineWidth = r * 0.12; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(x - r, y + k * r * 0.33); g.lineTo(x + r, y + k * r * 0.33); g.stroke(); } g.restore(); }
          if (n === 'Saturn') { g.strokeStyle = 'rgba(230,210,160,.75)'; g.lineWidth = Math.max(1, r * 0.35); g.beginPath(); g.ellipse(x, y, r * 2.1, r * 2.1 * Math.max(0.12, Math.abs(Math.sin(cam.pitch)) * 0.5), -0.3, 0, Math.PI); g.stroke(); }
          if (n === focus) { g.strokeStyle = '#7c5cff'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r + 6, 0, 7); g.stroke(); }
          if (st.data.labels && (n !== 'Moon' || cam.dist < 25 || focus === 'Earth' || focus === 'Moon')) { g.fillStyle = 'rgba(230,235,255,.9)'; g.font = '12px system-ui'; g.textAlign = 'left'; g.fillText(n === 'Halley’s Comet' ? '☄ Halley' : n, x + r + 5, y - r - 2); }
        }
        const dd = new Date(t); dateEl.textContent = dd.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) + '  ' + dd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        rateEl.textContent = (RATES[rateI][1] ? (dir > 0 ? 'forward ' : 'reverse ') + RATES[rateI][0] : 'paused') + ' · drag to orbit · scroll to zoom · click a planet';
      }
      function select(n) { focus = n; listEl.querySelectorAll('button').forEach((b) => (b.style.borderColor = b.dataset.b === n ? '#7c5cff' : 'rgba(255,255,255,.15)')); const target = n === 'Sun' ? 60 : n === 'Moon' || n === 'Earth' ? 8 : ['Jupiter', 'Saturn', 'Uranus', 'Neptune'].includes(n) ? 14 : 10; zoomTo = target; renderCard(); }
      let zoomTo = null;
      function renderCard() {
        const n = focus; const I = INFO[n]; card.style.display = 'block'; card.innerHTML = '';
        const sun = n === 'Sun' ? 0 : Math.hypot(...P[n]); const ed = n === 'Earth' ? 0 : Math.hypot(P[n][0] - P.Earth[0], P[n][1] - P.Earth[1], P[n][2] - P.Earth[2]);
        const lt = (au) => { const s = (au * AU) / 299792.458; return s < 120 ? s.toFixed(1) + ' s' : s < 7200 ? (s / 60).toFixed(1) + ' min' : (s / 3600).toFixed(2) + ' h'; };
        const row = (k, v) => h('div.row', { style: { justifyContent: 'space-between', borderTop: '1px solid var(--line)', padding: '4px 0' } }, h('span.muted', k), h('strong', { style: { textAlign: 'right' } }, String(v)));
        card.append(...[h('div.row', h('div', { style: { width: '34px', height: '34px', borderRadius: '50%', background: `radial-gradient(circle at 35% 35%, ${I.c[0]}, ${I.c[1]})`, flex: 'none' } }), h('strong', { style: { fontSize: '18px' } }, n), h('div.spacer'), h('button.icon-btn', { on: { click: () => { card.style.display = 'none'; } } }, '✕')),
          h('p.small', { style: { margin: '8px 0' } }, I.fact),
          row('Diameter', Math.round(I.r * 2).toLocaleString() + ' km'), row('Day length', I.day), I.year ? row('Orbit', I.year) : null, row('Moons', I.moons),
          n !== 'Sun' ? row('From Sun now', sun.toFixed(3) + ' AU') : null, n !== 'Earth' ? row('From Earth now', ed.toFixed(3) + ' AU (' + Math.round(ed * AU).toLocaleString() + ' km)') : null, n !== 'Earth' ? row('Light time from Earth', lt(ed)) : null].filter(Boolean));
      }
      // interaction
      const ptrs = new Map(); let dragS = null, pinch = null;
      cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), dist: cam.dist }; dragS = null; return; } dragS = { x: e.clientX, y: e.clientY, yaw: cam.yaw, pitch: cam.pitch, moved: false }; cv.style.cursor = 'grabbing'; });
      cv.addEventListener('pointermove', (e) => { if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, [e.clientX, e.clientY]); if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()]; cam.dist = MS.clamp((pinch.dist * pinch.d) / Math.hypot(a[0] - b[0], a[1] - b[1]), 2, 900); zoomTo = null; return; } if (!dragS) return; const dx = e.clientX - dragS.x, dy = e.clientY - dragS.y; if (Math.abs(dx) + Math.abs(dy) > 3) dragS.moved = true; cam.yaw = dragS.yaw + dx * 0.006; cam.pitch = MS.clamp(dragS.pitch + dy * 0.006, -1.5, 1.5); });
      const up = (e) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (dragS && !dragS.moved) { const r = cv.getBoundingClientRect(); const px = e.clientX - r.left, py = e.clientY - r.top; let best = null; for (const s of screen) { const d = Math.hypot(s.q[0] - px, s.q[1] - py) - radiusPx(s.n, s.q[3]); if (d < 14 && (!best || d < best.d)) best = { d, n: s.n }; } if (best) select(best.n); } dragS = null; cv.style.cursor = 'grab'; };
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      cv.addEventListener('wheel', (e) => { e.preventDefault(); cam.dist = MS.clamp(cam.dist * Math.exp(e.deltaY * 0.0012), 2, 900); zoomTo = null; }, { passive: false });
      function resize() { const r = view.getBoundingClientRect(); dpr = devicePixelRatio || 1; W = Math.max(50, r.width); H = Math.max(50, r.height); cv.width = W * dpr; cv.height = H * dpr; }
      let raf, last = performance.now(), cardT = 0, orbT = 0;
      const loop = (now) => { const dt = Math.min(0.1, (now - last) / 1000); last = now; t += dir * RATES[rateI][1] * 864e5 * dt; if (zoomTo) { cam.dist += (zoomTo - cam.dist) * Math.min(1, dt * 4); if (Math.abs(zoomTo - cam.dist) < 0.05) zoomTo = null; } positions(); draw(); cardT += dt; if (cardT > 0.5 && card.style.display === 'block') { cardT = 0; renderCard(); } orbT += Math.abs(RATES[rateI][1]) * dt; if (orbT > 3650) { orbT = 0; buildOrbits(); } if (document.activeElement !== dateIn) dateIn.value = MS.isoDate(new Date(t)); raf = requestAnimationFrame(loop); };
      const ro = new ResizeObserver(resize); ro.observe(view); resize(); positions(); raf = requestAnimationFrame(loop);
      return { unmount: () => { cancelAnimationFrame(raf); ro.disconnect(); } };
    },
  });
})();
