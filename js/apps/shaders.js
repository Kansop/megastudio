/* Shader Lab: live GLSL fragment-shader playground (Shadertoy-style uniforms), presets incl. raymarching,
   error markers, auto-generated uniform sliders, PNG snapshot, WebM recording, saved shaders */
(function () {
  const { h } = MS;
  const HEAD = `#version 300 es
precision highp float;
uniform vec3 iResolution; uniform float iTime; uniform float iTimeDelta; uniform int iFrame; uniform vec4 iMouse; uniform vec4 iDate;
out vec4 _fragColor;
`;
  const TAIL = `
void main(){ vec4 c = vec4(0.0,0.0,0.0,1.0); mainImage(c, gl_FragCoord.xy); _fragColor = vec4(c.rgb, 1.0); }`;
  const HEAD_LINES = HEAD.split('\n').length - 1;
  const P = {
    'Rainbow plasma': `// Classic plasma — edit anything and watch it update live
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
  float t = iTime * 0.6;
  float v = sin(uv.x * 10.0 + t) + sin(uv.y * 10.0 + t * 1.3)
          + sin((uv.x + uv.y) * 8.0 + t * 0.7) + sin(length(uv * 12.0) - t * 2.0);
  vec3 col = 0.5 + 0.5 * cos(v + vec3(0.0, 2.1, 4.2) + t);
  fragColor = vec4(col, 1.0);
}`,
    'Raymarched spheres': `// Raymarching signed distance fields: soft shadows, AO, reflections-ish fresnel
float sdSphere(vec3 p, float r) { return length(p) - r; }
float sdBox(vec3 p, vec3 b) { vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0); }
float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
vec2 map(vec3 p) {
  float t = iTime;
  float s1 = sdSphere(p - vec3(sin(t) * 1.2, 0.6 + 0.3 * sin(t * 2.0), 0.0), 0.6);
  float s2 = sdSphere(p - vec3(-sin(t) * 1.2, 0.6, cos(t) * 0.8), 0.5);
  float b = sdBox(p - vec3(0.0, 0.5, 0.0), vec3(0.35)) - 0.08;
  float blob = smin(smin(s1, s2, 0.5), b, 0.4);
  float ground = p.y;
  return blob < ground ? vec2(blob, 1.0) : vec2(ground, 2.0);
}
vec3 normal(vec3 p) { vec2 e = vec2(0.001, 0.0); return normalize(vec3(map(p + e.xyy).x - map(p - e.xyy).x, map(p + e.yxy).x - map(p - e.yxy).x, map(p + e.yyx).x - map(p - e.yyx).x)); }
float shadow(vec3 ro, vec3 rd) { float res = 1.0, t = 0.02; for (int i = 0; i < 48; i++) { float h = map(ro + rd * t).x; res = min(res, 10.0 * h / t); t += clamp(h, 0.02, 0.3); if (h < 0.001 || t > 8.0) break; } return clamp(res, 0.0, 1.0); }
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
  float a = iMouse.z > 0.0 ? iMouse.x / iResolution.x * 6.28 : iTime * 0.2;
  vec3 ro = vec3(5.5 * sin(a), 2.4, 5.5 * cos(a)), ta = vec3(0.0, 0.5, 0.0);
  vec3 f = normalize(ta - ro), r = normalize(cross(f, vec3(0, 1, 0))), u = cross(r, f);
  vec3 rd = normalize(uv.x * r + uv.y * u + 1.6 * f);
  float t = 0.0; vec2 h;
  for (int i = 0; i < 120; i++) { h = map(ro + rd * t); if (h.x < 0.001 || t > 20.0) break; t += h.x; }
  vec3 sky = mix(vec3(0.5, 0.7, 1.0), vec3(0.1, 0.2, 0.5), uv.y + 0.5);
  vec3 col = sky;
  if (t < 20.0) {
    vec3 p = ro + rd * t, n = normal(p), l = normalize(vec3(0.6, 0.8, 0.4));
    vec3 mat = h.y < 1.5 ? 0.5 + 0.5 * cos(vec3(0, 2, 4) + p.y * 2.0 + iTime) : vec3(0.3 + 0.2 * mod(floor(p.x) + floor(p.z), 2.0));
    float dif = max(dot(n, l), 0.0) * shadow(p + n * 0.01, l);
    float ao = clamp(map(p + n * 0.15).x / 0.15, 0.0, 1.0);
    float spe = pow(max(dot(reflect(rd, n), l), 0.0), 32.0);
    float fre = pow(1.0 - max(dot(-rd, n), 0.0), 3.0);
    col = mat * (0.15 * ao + dif) + spe * dif + fre * sky * 0.4;
    col = mix(col, sky, 1.0 - exp(-0.004 * t * t));
  }
  fragColor = vec4(pow(col, vec3(0.4545)), 1.0);
}`,
    'Mandelbrot zoom': `// Smooth-coloured Mandelbrot with an endless zoom into Seahorse Valley
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
  float zoom = pow(0.5, mod(iTime * 0.6, 30.0));
  vec2 c = vec2(-0.743643887037151, 0.131825904205330) + uv * 3.0 * zoom;
  vec2 z = vec2(0.0); float n = 0.0;
  for (int i = 0; i < 512; i++) { z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c; if (dot(z, z) > 256.0) break; n += 1.0; }
  float sn = n - log2(log2(dot(z, z))) + 4.0;
  vec3 col = n >= 511.0 ? vec3(0.0) : 0.5 + 0.5 * cos(3.0 + sn * 0.08 + vec3(0.0, 0.6, 1.0));
  fragColor = vec4(col, 1.0);
}`,
    'Tunnel': `// Infinite procedural tunnel
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
  float a = atan(uv.y, uv.x), r = length(uv);
  vec2 st = vec2(a / 3.14159, 0.3 / r + iTime * 0.8);
  float checker = mod(floor(st.x * 8.0) + floor(st.y * 4.0), 2.0);
  vec3 col = mix(vec3(0.1, 0.0, 0.3), vec3(1.0, 0.3, 0.7), checker);
  col *= smoothstep(0.0, 0.6, r) * (0.6 + 0.4 * sin(st.y * 6.28));
  col += vec3(0.2, 0.5, 1.0) * 0.02 / r;
  fragColor = vec4(col, 1.0);
}`,
    'Ocean sunset': `// Layered sine waves with a sun and stars
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy; vec2 p = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
  vec3 col = mix(vec3(1.0, 0.45, 0.2), vec3(0.15, 0.05, 0.35), smoothstep(0.35, 1.0, uv.y));
  col += step(0.998, hash(floor(fragCoord / 2.0))) * smoothstep(0.6, 1.0, uv.y);
  float sun = length(p - vec2(0.0, 0.05)); col = mix(col, vec3(1.0, 0.85, 0.4), smoothstep(0.16, 0.15, sun)); col += vec3(1.0, 0.5, 0.2) * 0.04 / (sun + 0.02) * 0.3;
  for (float i = 0.0; i < 6.0; i++) {
    float y = 0.42 - i * 0.07 + 0.02 * sin(p.x * (6.0 + i * 3.0) + iTime * (0.5 + i * 0.3)) + 0.01 * sin(p.x * 23.0 - iTime * 2.0);
    if (uv.y < y) col = mix(vec3(0.05, 0.1, 0.3), vec3(0.6, 0.2, 0.3), 0.6 - i * 0.1) + 0.15 * smoothstep(0.02, 0.0, abs(p.x)) * (1.0 - i / 6.0);
  }
  fragColor = vec4(col, 1.0);
}`,
    'Voronoi cells': `// Animated Worley noise / Voronoi with cell borders
vec2 hash2(vec2 p) { p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.y * 6.0; vec2 g = floor(uv), f = fract(uv);
  float d1 = 8.0, d2 = 8.0; vec2 id;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 o = vec2(x, y); vec2 r = hash2(g + o); r = 0.5 + 0.4 * sin(iTime + 6.28 * r);
    float d = length(o + r - f); if (d < d1) { d2 = d1; d1 = d; id = g + o; } else if (d < d2) d2 = d;
  }
  vec3 col = 0.5 + 0.5 * cos(6.28 * hash2(id).x + vec3(0, 2, 4));
  col *= 0.6 + 0.4 * (1.0 - d1); col = mix(vec3(0.05), col, smoothstep(0.02, 0.06, d2 - d1));
  fragColor = vec4(col, 1.0);
}`,
    'Mouse metaballs': `// Click/drag on the canvas — the mouse is a metaball too
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 p = fragCoord / iResolution.y; float v = 0.0;
  for (float i = 0.0; i < 7.0; i++) { vec2 c = vec2(0.5 * iResolution.x / iResolution.y + 0.5 * sin(iTime * (0.3 + i * 0.13) + i * 2.0), 0.5 + 0.35 * cos(iTime * (0.4 + i * 0.11) + i)); v += 0.012 / dot(p - c, p - c); }
  vec2 m = iMouse.xy / iResolution.y; v += 0.02 / dot(p - m, p - m);
  vec3 col = v > 1.0 ? mix(vec3(0.1, 0.6, 1.0), vec3(1.0, 0.2, 0.6), clamp(v - 1.0, 0.0, 1.0)) : vec3(0.02, 0.02, 0.08) + v * 0.15;
  col += smoothstep(0.06, 0.0, abs(v - 1.0)) * 0.8;
  fragColor = vec4(col, 1.0);
}`,
    'Fire': `// Domain-warped fbm fire
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 6; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; } return v; }
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy; vec2 p = uv * vec2(iResolution.x / iResolution.y, 1.0) * 3.0;
  float n = fbm(p + vec2(fbm(p - vec2(0.0, iTime * 1.5)), fbm(p + vec2(3.1, -iTime * 1.2))) - vec2(0.0, iTime * 2.0));
  float f = n * (1.2 - uv.y * 1.3) * 1.6; f = clamp(f, 0.0, 1.0);
  vec3 col = vec3(1.5 * f, 1.5 * f * f * f, f * f * f * f * f * f);
  fragColor = vec4(col, 1.0);
}`,
    'Blank template': `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  vec3 col = 0.5 + 0.5 * cos(iTime + uv.xyx + vec3(0, 2, 4));
  fragColor = vec4(col, 1.0);
}`,
  };

  MS.register({
    id: 'shaders', name: 'Shader Lab', icon: '🌈', group: 'Develop', desc: 'Live GLSL shader playground (WebGL2)', keywords: 'shader glsl webgl gpu shadertoy raymarching graphics fragment creative coding',
    async mount(view) {
      const st = await MS.store('shaders', () => ({ cur: 'Raymarched spheres', saved: {}, code: null, scale: 1 }));
      const D = st.data; const save = MS.debounce(() => st.touch(), 400);
      const all = () => ({ ...P, ...D.saved });
      const cv = h('canvas', { style: { width: '100%', height: '100%', display: 'block', background: '#000', borderRadius: '12px', touchAction: 'none' } });
      const gl = cv.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false });
      const ed = h('textarea.input.mono', { spellcheck: false, style: { flex: 1, minHeight: '260px', fontSize: '12.5px', lineHeight: 1.5, resize: 'none', tabSize: 2, whiteSpace: 'pre', overflow: 'auto' } });
      const err = h('pre.small', { style: { color: '#ef4444', margin: 0, whiteSpace: 'pre-wrap', maxHeight: '110px', overflow: 'auto' } });
      const stat = h('span.small.muted.mono');
      const sel = h('select.input', { style: { width: 'auto' } });
      const fillSel = () => { sel.innerHTML = ''; sel.append(h('optgroup', { label: 'Examples' }, Object.keys(P).map((k) => h('option', { value: k, selected: k === D.cur }, k)))); if (Object.keys(D.saved).length) sel.append(h('optgroup', { label: 'My shaders' }, Object.keys(D.saved).map((k) => h('option', { value: k, selected: k === D.cur }, '★ ' + k)))); };
      fillSel();
      let paused = false, t0 = performance.now(), tPause = 0, frame = 0, last = 0, mouse = [0, 0, 0, 0], prog = null, U = {}, rec = null;
      const playB = h('button.btn.sm', { on: { click: () => { paused = !paused; if (paused) tPause = performance.now(); else t0 += performance.now() - tPause; playB.textContent = paused ? '▶' : '⏸'; } } }, '⏸');
      const scaleSel = h('select.input', { style: { width: 'auto' }, title: 'Render resolution', on: { change: (e) => { D.scale = +e.target.value; save(); resize(); } } }, [[0.5, '½ res'], [1, '1× res'], [1.5, '1.5×'], [2, '2× (HiDPI)']].map(([v, l]) => h('option', { value: v, selected: D.scale === v }, l)));
      const stage = h('div', { style: { position: 'relative', flex: 1, minHeight: '280px' } }, cv, h('div.row', { style: { position: 'absolute', left: '8px', bottom: '8px', gap: '6px' } }, playB, h('button.btn.sm', { title: 'Restart time', on: { click: () => { t0 = performance.now(); tPause = t0; frame = 0; } } }, '⏮'), stat));
      sel.onchange = () => { if (D.code != null && D.code !== all()[D.cur] && !confirm('Discard unsaved edits?')) { sel.value = D.cur; return; } D.cur = sel.value; D.code = null; ed.value = all()[D.cur]; compile(); save(); };
      const recB = h('button.btn.sm', { on: { click: toggleRec } }, '⏺ Record');
      MS.setActions(h('div.row', { style: { gap: '6px' } }, h('button.btn.sm', { on: { click: () => { cv.toBlob((b) => MS.download('shader.png', b, 'image/png')); } } }, '📷 PNG'), recB, h('button.btn.sm', { on: { click: () => (stage.requestFullscreen ? stage.requestFullscreen() : null) } }, '⛶')));
      const help = h('details.small.muted', h('summary', 'Uniforms & tips'), h('div.mono', { style: { marginTop: '6px', lineHeight: 1.6 } }, 'iResolution (vec3) · iTime · iTimeDelta · iFrame · iMouse (xy = pos, z>0 while pressed) · iDate (y, m, d, seconds)', h('br'), 'Write void mainImage(out vec4 fragColor, in vec2 fragCoord) — Shadertoy-compatible.', h('br'), 'Add "uniform float name; // slider 0 10 1" to get a live slider (min max default).', h('br'), 'Ctrl/⌘+S saves · Ctrl/⌘+Enter recompiles · edits recompile automatically.'));
      const sliders = h('div.col', { style: { gap: '4px' } });
      const left = h('div.col', { style: { gap: '8px', flex: '1 1 420px', minWidth: 0 } }, h('div.row', { style: { flexWrap: 'wrap', gap: '6px' } }, sel, h('button.btn.sm', { on: { click: saveAs } }, '💾 Save as…'), h('button.btn.sm', { on: { click: () => { if (!D.saved[D.cur]) return MS.toast('Only your saved shaders can be deleted'); MS.confirm('Delete shader?', D.cur, 'Delete').then((ok) => { if (!ok) return; delete D.saved[D.cur]; D.cur = 'Raymarched spheres'; D.code = null; ed.value = all()[D.cur]; fillSel(); compile(); save(); }); } } }, '🗑'), h('div.spacer'), scaleSel), ed, err, sliders, help);
      const wrap = h('div.pad', { style: { display: 'flex', gap: '14px', flexWrap: 'wrap-reverse', height: '100%', boxSizing: 'border-box', alignItems: 'stretch' } }, left, h('div.col', { style: { flex: '1 1 420px', minHeight: '320px' } }, stage));
      view.append(wrap);
      if (!gl) { stage.innerHTML = ''; stage.append(h('div.empty', 'WebGL2 is not available in this browser.')); }
      ed.value = D.code ?? all()[D.cur];
      async function saveAs() { const n = await MS.prompt('Save shader as', D.saved[D.cur] ? D.cur : 'My shader'); if (!n) return; D.saved[n] = ed.value; D.cur = n; D.code = null; fillSel(); save(); MS.toast('Saved ★ ' + n); }
      ed.addEventListener('keydown', (e) => { if (e.key === 'Tab') { e.preventDefault(); const s = ed.selectionStart; ed.setRangeText('  ', s, ed.selectionEnd, 'end'); ed.dispatchEvent(new Event('input')); } if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); if (D.saved[D.cur]) { D.saved[D.cur] = ed.value; D.code = null; save(); MS.toast('Saved'); } else saveAs(); } if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); compile(); } });
      const recompile = MS.debounce(compile, 350); ed.addEventListener('input', () => { D.code = ed.value; save(); recompile(); });
      const vbuf = gl && gl.createBuffer(); if (gl) { gl.bindBuffer(gl.ARRAY_BUFFER, vbuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); }
      const sliderVals = {};
      function compile() {
        if (!gl) return; const src = ed.value;
        const mk = (type, s) => { const sh = gl.createShader(type); gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { const log = gl.getShaderInfoLog(sh); gl.deleteShader(sh); throw log; } return sh; };
        try {
          const vs = mk(gl.VERTEX_SHADER, '#version 300 es\nin vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }');
          const fs = mk(gl.FRAGMENT_SHADER, HEAD + src + TAIL);
          const pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.bindAttribLocation(pr, 0, 'p'); gl.linkProgram(pr); if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw gl.getProgramInfoLog(pr);
          if (prog) gl.deleteProgram(prog); prog = pr; U = {}; ['iResolution', 'iTime', 'iTimeDelta', 'iFrame', 'iMouse', 'iDate'].forEach((n) => (U[n] = gl.getUniformLocation(pr, n)));
          err.textContent = ''; ed.style.outline = '';
          // sliders
          sliders.innerHTML = ''; const re = /uniform\s+float\s+(\w+)\s*;\s*\/\/\s*slider\s+(-?[\d.]+)\s+(-?[\d.]+)\s*(-?[\d.]+)?/g; let m;
          while ((m = re.exec(src))) { const [, name, mn, mx, def] = m; U[name] = gl.getUniformLocation(pr, name); if (sliderVals[name] == null) sliderVals[name] = def != null ? +def : (+mn + +mx) / 2; const val = h('span.mono.small', { style: { width: '48px' } }, (+sliderVals[name]).toFixed(2)); const inp = h('input', { type: 'range', min: mn, max: mx, step: (mx - mn) / 200, value: sliderVals[name], style: { flex: 1 } }); inp.oninput = () => { sliderVals[name] = +inp.value; val.textContent = (+inp.value).toFixed(2); }; sliders.append(h('div.row', { style: { gap: '8px' } }, h('span.mono.small', { style: { minWidth: '80px' } }, name), inp, val)); U[name].slider = name; }
        } catch (e) {
          const msg = String(e).replace(/ERROR: 0:(\d+):/g, (_, l) => `Line ${Math.max(1, +l - HEAD_LINES)}:`).trim();
          err.textContent = '⚠ ' + msg; ed.style.outline = '2px solid #ef4444';
        }
      }
      function resize() { const r = cv.getBoundingClientRect(); const s = D.scale || 1; cv.width = Math.max(2, Math.round(r.width * s)); cv.height = Math.max(2, Math.round(r.height * s)); }
      const ro = new ResizeObserver(resize); ro.observe(stage);
      const mpos = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * cv.width, (1 - (e.clientY - r.top) / r.height) * cv.height]; };
      cv.addEventListener('pointerdown', (e) => { const [x, y] = mpos(e); mouse = [x, y, x, y]; cv.setPointerCapture(e.pointerId); });
      cv.addEventListener('pointermove', (e) => { const [x, y] = mpos(e); if (mouse[2] > 0) { mouse[0] = x; mouse[1] = y; } else if (e.pointerType === 'mouse') { mouse[0] = x; mouse[1] = y; } });
      cv.addEventListener('pointerup', () => { mouse[2] = -Math.abs(mouse[2]); mouse[3] = -Math.abs(mouse[3]); });
      let raf, fpsT = performance.now(), fpsN = 0, fps = 0;
      function draw(now) {
        raf = requestAnimationFrame(draw); if (!gl || !prog || document.hidden) return;
        const t = ((paused ? tPause : now) - t0) / 1000; const dt = (now - last) / 1000; last = now; if (paused && frame > 0) { stat.textContent = `${t.toFixed(2)}s · paused`; return; }
        gl.viewport(0, 0, cv.width, cv.height); gl.useProgram(prog); gl.bindBuffer(gl.ARRAY_BUFFER, vbuf); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.uniform3f(U.iResolution, cv.width, cv.height, 1); gl.uniform1f(U.iTime, t); gl.uniform1f(U.iTimeDelta, dt); gl.uniform1i(U.iFrame, frame++); gl.uniform4f(U.iMouse, ...mouse); const d = new Date(); gl.uniform4f(U.iDate, d.getFullYear(), d.getMonth(), d.getDate(), d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1000);
        Object.values(U).forEach((u) => { if (u && u.slider) gl.uniform1f(u, sliderVals[u.slider]); });
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        fpsN++; if (now - fpsT > 500) { fps = fpsN * 1000 / (now - fpsT); fpsN = 0; fpsT = now; } stat.textContent = `${t.toFixed(2)}s · ${fps.toFixed(0)} fps · ${cv.width}×${cv.height}`;
      }
      function toggleRec() {
        if (rec) { rec.stop(); return; } if (!cv.captureStream || !window.MediaRecorder) return MS.toast('Recording is not supported in this browser');
        const chunks = []; const mime = ['video/webm;codecs=vp9', 'video/webm', 'video/mp4'].find((m) => MediaRecorder.isTypeSupported(m)) || ''; rec = new MediaRecorder(cv.captureStream(60), { mimeType: mime, videoBitsPerSecond: 8e6 });
        rec.ondataavailable = (e) => e.data.size && chunks.push(e.data); rec.onstop = () => { MS.download('shader.' + (mime.includes('mp4') ? 'mp4' : 'webm'), new Blob(chunks, { type: mime || 'video/webm' })); rec = null; recB.textContent = '⏺ Record'; recB.classList.remove('danger'); };
        rec.start(); recB.textContent = '⏹ Stop'; recB.classList.add('danger'); setTimeout(() => rec && rec.state === 'recording' && rec.stop(), 30000); MS.toast('Recording (max 30 s)…');
      }
      requestAnimationFrame(() => { resize(); compile(); raf = requestAnimationFrame(draw); });
      return { unmount() { cancelAnimationFrame(raf); ro.disconnect(); if (rec) rec.stop(); const ext = gl && gl.getExtension('WEBGL_lose_context'); ext && ext.loseContext(); } };
    },
  });
})();
