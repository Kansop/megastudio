/* Fractal Explorer: GPU Mandelbrot / Julia / Burning Ship / Tricorn / Newton with palettes, color cycling, bookmarks and PNG export */
(function () {
  const { h } = MS;
  const TYPES = ['Mandelbrot', 'Julia', 'Burning Ship', 'Tricorn', 'Newton', 'Multibrot z⁴'];
  const PALETTES = { Sunset: [[0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [1, 1, 1], [0.0, 0.1, 0.2]], Ocean: [[0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [1, 1, 0.5], [0.8, 0.9, 0.3]], Fire: [[0.5, 0.3, 0.1], [0.5, 0.4, 0.2], [1, 1, 1], [0.0, 0.15, 0.25]], Neon: [[0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [2, 1, 0], [0.5, 0.2, 0.25]], Mono: [[0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [1, 1, 1], [0, 0, 0]], Candy: [[0.8, 0.5, 0.4], [0.2, 0.4, 0.2], [2, 1, 1], [0, 0.25, 0.25]] };
  const SPOTS = [{ n: 'Full set', t: 0, x: -0.6, y: 0, z: 1.4 }, { n: 'Seahorse valley', t: 0, x: -0.7435, y: 0.1314, z: 0.0035 }, { n: 'Elephant valley', t: 0, x: 0.2925, y: 0.0149, z: 0.012 }, { n: 'Spiral', t: 0, x: -0.7615, y: -0.0848, z: 0.0009 }, { n: 'Mini-brot', t: 0, x: -1.7687, y: 0.0017, z: 0.0035 }, { n: 'Julia dendrite', t: 1, x: 0, y: 0, z: 1.6, cx: 0, cy: 1 }, { n: 'Julia rabbit', t: 1, x: 0, y: 0, z: 1.5, cx: -0.123, cy: 0.745 }, { n: 'Julia galaxy', t: 1, x: 0, y: 0, z: 1.5, cx: -0.8, cy: 0.156 }, { n: 'Burning ship armada', t: 2, x: -1.762, y: -0.028, z: 0.04 }, { n: 'Newton star', t: 4, x: 0, y: 0, z: 1.6 }];
  const FS = `precision highp float; uniform vec2 res; uniform vec2 ctr; uniform float zoom; uniform int type; uniform vec2 jc; uniform float maxIt; uniform vec3 pa,pb,pc,pd; uniform float shift; uniform float smoothOn;
  vec3 pal(float t){ return pa + pb*cos(6.28318*(pc*t+pd)); }
  vec2 cmul(vec2 a, vec2 b){ return vec2(a.x*b.x-a.y*b.y, a.x*b.y+a.y*b.x); } vec2 cdiv(vec2 a, vec2 b){ float d=dot(b,b); return vec2(a.x*b.x+a.y*b.y, a.y*b.x-a.x*b.y)/d; }
  void main(){ vec2 uv=(gl_FragCoord.xy-0.5*res)/res.y; vec2 p=ctr+uv*zoom*2.0; vec2 z, c; if(type==1){ z=p; c=jc; } else { z=vec2(0.0); c=p; }
    if(type==4){ z=p; float it=0.0; int root=0; for(int i=0;i<200;i++){ if(float(i)>=min(maxIt,200.0)) break; vec2 z2=cmul(z,z); vec2 z3=cmul(z2,z); vec2 nz=z-cdiv(z3-vec2(1.0,0.0), 3.0*z2); if(length(nz-z)<1e-6){ break; } z=nz; it+=1.0; }
      float a=atan(z.y,z.x); float r = a>1.0?0.0: a<-1.0?0.66:0.33; vec3 col=pal(r+shift)*(1.0-it/40.0*0.8); gl_FragColor=vec4(col,1.0); return; }
    float it=0.0; float m2=0.0; for(int i=0;i<4000;i++){ if(float(i)>=maxIt) break; if(type==2) z=vec2(abs(z.x),abs(z.y)); if(type==3) z.y=-z.y; if(type==5){ vec2 z2=cmul(z,z); z=cmul(z2,z2)+c; } else z=vec2(z.x*z.x-z.y*z.y, 2.0*z.x*z.y)+c; m2=dot(z,z); if(m2>256.0) break; it+=1.0; }
    if(it>=maxIt){ gl_FragColor=vec4(0.02,0.02,0.05,1.0); return; } float sit = smoothOn>0.5 ? it - log2(log2(m2)) + 4.0 : it; gl_FragColor=vec4(pal(sit*0.02+shift),1.0); }`;
  MS.register({
    id: 'fractal', name: 'Fractals', icon: '🌀', group: 'Create', desc: 'Infinite zoom fractal explorer', keywords: 'fractal mandelbrot julia math art zoom generative',
    async mount(view) {
      const s = await MS.store('fractal', () => ({ t: 0, x: -0.6, y: 0, z: 1.4, cx: -0.8, cy: 0.156, it: 300, pal: 'Sunset', smooth: true, saved: [] }));
      const cv = h('canvas', { style: { width: '100%', height: '100%', display: 'block', cursor: 'grab', touchAction: 'none' } });
      const gl = cv.getContext('webgl', { preserveDrawingBuffer: true }); if (!gl) { view.append(h('div.empty', 'WebGL is not available')); return {}; }
      const sh = (t, src) => { const o = gl.createShader(t); gl.shaderSource(o, src); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
      const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, 'attribute vec2 p; void main(){ gl_Position=vec4(p,0.0,1.0); }')); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW); const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const U = {}; ['res', 'ctr', 'zoom', 'type', 'jc', 'maxIt', 'pa', 'pb', 'pc', 'pd', 'shift', 'smoothOn'].forEach((n) => (U[n] = gl.getUniformLocation(pr, n)));
      let shift = 0, cycling = false, raf, dirty = true; const D = s.data;
      const hud = h('div.small.mono', { style: { position: 'absolute', left: '12px', bottom: '10px', background: 'rgba(0,0,0,.55)', color: '#fff', padding: '6px 10px', borderRadius: '8px', pointerEvents: 'none' } });
      function draw() { const r = cv.getBoundingClientRect(); const dpr = Math.min(2, devicePixelRatio || 1); const w = Math.max(1, Math.round(r.width * dpr)), hh = Math.max(1, Math.round(r.height * dpr)); if (cv.width !== w || cv.height !== hh) { cv.width = w; cv.height = hh; } gl.viewport(0, 0, w, hh);
        const P = PALETTES[D.pal] || PALETTES.Sunset; gl.uniform2f(U.res, w, hh); gl.uniform2f(U.ctr, D.x, D.y); gl.uniform1f(U.zoom, D.z); gl.uniform1i(U.type, D.t); gl.uniform2f(U.jc, D.cx, D.cy); gl.uniform1f(U.maxIt, D.it); gl.uniform3fv(U.pa, P[0]); gl.uniform3fv(U.pb, P[1]); gl.uniform3fv(U.pc, P[2]); gl.uniform3fv(U.pd, P[3]); gl.uniform1f(U.shift, shift); gl.uniform1f(U.smoothOn, D.smooth ? 1 : 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        hud.textContent = `${TYPES[D.t]} · center ${D.x.toFixed(8)}, ${D.y.toFixed(8)} · zoom ${1.4 / D.z < 1000 ? (1.4 / D.z).toFixed(2) : (1.4 / D.z).toExponential(2)}× · ${D.it} iter` + (D.t === 1 ? ` · c = ${D.cx.toFixed(4)} ${D.cy >= 0 ? '+' : '−'} ${Math.abs(D.cy).toFixed(4)}i` : '') + (D.z < 2e-5 ? ' · ⚠ float precision limit' : ''); }
      const loop = () => { raf = requestAnimationFrame(loop); if (cycling) { shift += 0.004; dirty = true; } if (dirty) { draw(); dirty = false; } };
      const touch = () => { dirty = true; clearTimeout(touch.t); touch.t = setTimeout(() => s.touch(), 400); };
      const toWorld = (cx, cy) => { const r = cv.getBoundingClientRect(); return [D.x + ((cx - r.left - r.width / 2) / r.height) * D.z * 2, D.y - ((cy - r.top - r.height / 2) / r.height) * D.z * 2]; };
      const zoomAt = (cx, cy, f) => { const [wx, wy] = toWorld(cx, cy); D.z *= f; const [nx, ny] = toWorld(cx, cy); D.x += wx - nx; D.y += wy - ny; touch(); };
      cv.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(e.clientX, e.clientY, Math.exp(e.deltaY * 0.0015)); }, { passive: false });
      cv.addEventListener('dblclick', (e) => zoomAt(e.clientX, e.clientY, e.shiftKey ? 3 : 1 / 3));
      const ptrs = new Map(); let pinch0 = null;
      cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); cv.style.cursor = 'grabbing'; if (e.altKey && D.t !== 1) { const [wx, wy] = toWorld(e.clientX, e.clientY); D.cx = wx; D.cy = wy; D.t = 1; D.x = 0; D.y = 0; D.z = 1.5; buildPanel(); touch(); } });
      cv.addEventListener('pointermove', (e) => { if (!ptrs.has(e.pointerId)) { if (e.shiftKey && D.t === 1) { const r = cv.getBoundingClientRect(); D.cx = ((e.clientX - r.left) / r.width) * 3 - 1.5; D.cy = -(((e.clientY - r.top) / r.height) * 3 - 1.5); touch(); } return; }
        const prev = ptrs.get(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch0) zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, pinch0 / d); pinch0 = d; return; } const r = cv.getBoundingClientRect(); D.x -= ((e.clientX - prev[0]) / r.height) * D.z * 2; D.y += ((e.clientY - prev[1]) / r.height) * D.z * 2; touch(); });
      const up = (e) => { ptrs.delete(e.pointerId); pinch0 = null; cv.style.cursor = 'grab'; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      const panel = h('div.card.float-panel', { style: { position: 'absolute', right: '12px', top: '12px', width: '230px', padding: '12px', maxHeight: 'calc(100% - 24px)', overflow: 'auto' } });
      function buildPanel() { panel.innerHTML = ''; const lab = (t) => h('div.small.muted', { style: { margin: '8px 0 4px' } }, t);
        const typeSel = h('select.input', { on: { change: () => { D.t = +typeSel.value; const sp = SPOTS.find((x) => x.t === D.t) || SPOTS[0]; Object.assign(D, { x: sp.x, y: sp.y, z: sp.z }); buildPanel(); touch(); } } }, ...TYPES.map((t, i) => h('option', { value: i, selected: i === D.t }, t)));
        const it = h('input', { type: 'range', min: 50, max: 4000, step: 50, value: D.it, style: { width: '100%' }, on: { input: () => { D.it = +it.value; itv.textContent = D.it; touch(); } } }); const itv = h('span', D.it);
        const pals = h('div.row', { style: { flexWrap: 'wrap', gap: '4px' } }, ...Object.keys(PALETTES).map((k) => { const P = PALETTES[k]; const grad = [0, 0.25, 0.5, 0.75, 1].map((t) => 'rgb(' + [0, 1, 2].map((j) => Math.round(255 * Math.max(0, Math.min(1, P[0][j] + P[1][j] * Math.cos(6.28318 * (P[2][j] * t + P[3][j])))))).join(',') + ')').join(','); return h('button', { title: k, style: { width: '34px', height: '22px', borderRadius: '6px', border: D.pal === k ? '2px solid var(--text)' : '1px solid var(--line)', background: `linear-gradient(90deg,${grad})`, cursor: 'pointer' }, on: { click: () => { D.pal = k; buildPanel(); touch(); } } }); }));
        const jul = D.t === 1 ? h('div', lab('Julia constant c (or hold Shift and move the mouse)'), h('div.row', ...['cx', 'cy'].map((k) => { const i = h('input.input', { type: 'number', step: 0.001, value: D[k].toFixed(4), style: { width: '50%' }, on: { change: () => { D[k] = +i.value || 0; touch(); } } }); return i; }))) : null;
        const spots = h('div.col', { style: { gap: '2px' } }, ...SPOTS.concat(D.saved).map((sp, i) => h('div.row', h('button.btn.sm.ghost', { style: { flex: 1, justifyContent: 'flex-start' }, on: { click: () => { Object.assign(D, { t: sp.t, x: sp.x, y: sp.y, z: sp.z }); if (sp.cx != null) { D.cx = sp.cx; D.cy = sp.cy; } if (sp.it) D.it = sp.it; buildPanel(); touch(); } } }, (i >= SPOTS.length ? '⭐ ' : '📍 ') + sp.n), i >= SPOTS.length ? h('button.btn.sm.ghost', { title: 'Delete', on: { click: () => { D.saved.splice(i - SPOTS.length, 1); buildPanel(); s.touch(); } } }, '✕') : null)));
        panel.append(h('div.row', h('strong', '🌀 Fractal'), h('div.spacer'), h('button.btn.sm.ghost', { title: 'Collapse', on: { click: () => panel.classList.toggle('collapsed') } }, '▾')), h('div.panel-body', lab('Type'), typeSel, jul, h('div.row', lab('Iterations'), h('div.spacer'), itv), it, lab('Palette'), pals,
          h('label.row.small', { style: { marginTop: '8px' } }, h('input', { type: 'checkbox', checked: D.smooth, on: { change: (e) => { D.smooth = e.target.checked; touch(); } } }), 'Smooth coloring'),
          h('label.row.small', h('input', { type: 'checkbox', checked: cycling, on: { change: (e) => (cycling = e.target.checked) } }), 'Color cycling'),
          lab('Places'), spots, h('div.small.muted', { style: { marginTop: '8px' } }, 'Drag to pan · wheel/pinch to zoom · double-click zooms in (Shift = out) · Alt+click on Mandelbrot opens that point\'s Julia set')));
      }
      buildPanel();
      MS.setActions([h('button.btn.sm', { on: { click: async () => { const n = await MS.prompt('Name this place', 'My spot ' + (D.saved.length + 1)); if (!n) return; D.saved.push({ n, t: D.t, x: D.x, y: D.y, z: D.z, cx: D.cx, cy: D.cy, it: D.it }); s.touch(); buildPanel(); MS.toast('Saved ⭐'); } } }, '⭐ Save place'),
        h('button.btn.sm', { on: { click: () => { Object.assign(D, { x: D.t === 1 || D.t === 4 ? 0 : -0.6, y: 0, z: 1.4 }); touch(); } } }, '⟲ Reset'),
        h('button.btn.sm', { on: { click: () => { draw(); cv.toBlob((b) => MS.download('fractal-' + TYPES[D.t].replace(/\W+/g, '').toLowerCase() + '.png', b)); } } }, '⬇ PNG')]);
      const wrap = h('div', { style: { position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#000' } }, cv, panel, hud); view.append(wrap);
      const ro = new ResizeObserver(() => (dirty = true)); ro.observe(wrap); loop();
      return { unmount() { cancelAnimationFrame(raf); ro.disconnect(); s.touch(); } };
    },
  });
})();
