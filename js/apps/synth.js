/* Synth: polyphonic subtractive synthesizer — 2 oscillators + detune, sub, noise, ADSR, resonant filter with envelope,
   LFO, delay & reverb, arpeggiator, 12 presets, savable patches, computer/MIDI/touch keyboard, live scope + spectrum */
(function () {
  const { h } = MS;
  const DEF = { o1: 'sawtooth', o2: 'square', mix: 0.5, det: 7, oct2: 0, sub: 0.2, noise: 0, a: 0.01, d: 0.3, s: 0.6, r: 0.4, cut: 2400, res: 6, fenv: 2400, fa: 0.01, fd: 0.35, lfoR: 5, lfoAmt: 0, lfoT: 'pitch', dly: 0.25, dlyT: 0.32, dlyF: 0.35, rev: 0.2, vol: 0.6, glide: 0, arp: 'off', arpR: 8, mono: false };
  const PRESETS = {
    'Fat Saw Lead': {}, 'Soft Pad': { o1: 'sawtooth', o2: 'triangle', det: 12, a: 0.8, d: 1, s: 0.8, r: 1.6, cut: 1400, res: 2, fenv: 600, rev: 0.55, dly: 0.2 },
    'Acid Bass': { o1: 'sawtooth', o2: 'square', mix: 0.2, det: 0, oct2: -1, sub: 0.4, a: 0.005, d: 0.2, s: 0.2, r: 0.1, cut: 400, res: 18, fenv: 3200, fd: 0.18, dly: 0, rev: 0, mono: true, glide: 0.06 },
    'Pluck': { o1: 'triangle', o2: 'sawtooth', mix: 0.3, a: 0.002, d: 0.25, s: 0, r: 0.3, cut: 900, res: 8, fenv: 4000, fd: 0.15, dly: 0.35, rev: 0.3 },
    'Chip Square': { o1: 'square', o2: 'square', mix: 0.3, det: 0, oct2: 1, sub: 0, a: 0.001, d: 0.1, s: 0.7, r: 0.05, cut: 9000, res: 0, fenv: 0, dly: 0.15, rev: 0, lfoAmt: 15, lfoR: 7 },
    'Organ': { o1: 'sine', o2: 'sine', mix: 0.5, det: 0, oct2: 1, sub: 0.5, a: 0.01, d: 0.1, s: 1, r: 0.1, cut: 6000, res: 0, fenv: 0, lfoAmt: 8, lfoR: 6, rev: 0.3, dly: 0 },
    'Strings': { o1: 'sawtooth', o2: 'sawtooth', det: 16, a: 0.4, d: 0.5, s: 0.9, r: 0.9, cut: 2600, res: 1, fenv: 300, lfoAmt: 6, lfoR: 5, rev: 0.6, dly: 0.1 },
    'Wobble Bass': { o1: 'sawtooth', o2: 'square', oct2: -1, sub: 0.5, det: 4, a: 0.01, d: 0.2, s: 1, r: 0.2, cut: 500, res: 12, fenv: 200, lfoT: 'filter', lfoAmt: 1800, lfoR: 3, mono: true, dly: 0, rev: 0.1 },
    'Bell': { o1: 'sine', o2: 'triangle', mix: 0.4, oct2: 2, det: 3, a: 0.001, d: 1.2, s: 0, r: 1.5, cut: 7000, res: 0, fenv: 0, rev: 0.5, dly: 0.3 },
    'Arp Sparkle': { o1: 'square', o2: 'sawtooth', mix: 0.4, a: 0.001, d: 0.15, s: 0.1, r: 0.2, cut: 1800, res: 10, fenv: 3000, fd: 0.12, arp: 'up', arpR: 12, dly: 0.45, dlyT: 0.25, rev: 0.3 },
    'Brass': { o1: 'sawtooth', o2: 'sawtooth', det: 5, a: 0.06, d: 0.3, s: 0.7, r: 0.25, cut: 800, res: 3, fenv: 2600, fa: 0.08, fd: 0.4, rev: 0.25 },
    'Noise Sweep': { o1: 'sine', o2: 'sine', mix: 0, sub: 0, noise: 0.8, a: 1.2, d: 1, s: 0.5, r: 2, cut: 300, res: 15, fenv: 5000, fa: 2, fd: 2, rev: 0.6, dly: 0.3 },
  };
  const KEYS = 'awsedftgyhujkolp;'; const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  MS.register({
    id: 'synth', name: 'Synth', icon: '🎛', group: 'Create', desc: 'Polyphonic synthesizer with presets, arpeggiator & effects', keywords: 'synth synthesizer music keyboard oscillator filter adsr arpeggiator midi sound design pad bass lead',
    async mount(view) {
      const st = await MS.store('synth', { p: { ...DEF }, patches: {}, oct: 4, name: 'Fat Saw Lead' }); const P = st.data.p; Object.keys(DEF).forEach((k) => P[k] ??= DEF[k]); const save = () => st.touch();
      let ac = null, out, filt0, dly, dlyFb, dlyWet, rev, revWet, an, noiseBuf, lfo, lfoG;
      function audio() {
        if (ac) return ac; ac = new AudioContext(); out = ac.createGain(); out.gain.value = P.vol; const comp = ac.createDynamicsCompressor(); an = ac.createAnalyser(); an.fftSize = 2048; out.connect(comp).connect(an).connect(ac.destination);
        filt0 = ac.createGain(); filt0.connect(out); dly = ac.createDelay(2); dlyFb = ac.createGain(); dlyWet = ac.createGain(); filt0.connect(dly); dly.connect(dlyFb).connect(dly); dly.connect(dlyWet).connect(out);
        rev = ac.createConvolver(); const len = ac.sampleRate * 2.5, ir = ac.createBuffer(2, len, ac.sampleRate); for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); } rev.buffer = ir; revWet = ac.createGain(); filt0.connect(rev); rev.connect(revWet).connect(out);
        noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
        lfo = ac.createOscillator(); lfoG = ac.createGain(); lfo.connect(lfoG); lfo.start(); fx(); return ac;
      }
      function fx() { if (!ac) return; out.gain.value = P.vol; dly.delayTime.value = P.dlyT; dlyFb.gain.value = P.dlyF; dlyWet.gain.value = P.dly; revWet.gain.value = P.rev * 1.5; lfo.frequency.value = P.lfoR; lfoG.gain.value = P.lfoAmt; }
      const voices = new Map(); let monoV = null;
      function noteOn(m, vel = 1) {
        audio(); if (ac.state === 'suspended') ac.resume(); const t = ac.currentTime;
        if (P.mono && monoV) { const f = mtof(m); [monoV.o1, monoV.o2, monoV.sb].forEach((o, i) => o && o.frequency.setTargetAtTime(f * (i === 1 ? Math.pow(2, P.oct2) : i === 2 ? 0.5 : 1), t, Math.max(0.001, P.glide))); voices.delete(monoV.m); monoV.m = m; voices.set(m, monoV); light(m, true); return; }
        if (voices.has(m)) noteOff(m, true);
        const f = mtof(m); const vca = ac.createGain(); vca.gain.value = 0; const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = P.res; fl.connect(vca).connect(filt0);
        const mk = (type, freq, gain, det = 0) => { const o = ac.createOscillator(); o.type = type; o.frequency.value = freq; o.detune.value = det; const g = ac.createGain(); g.gain.value = gain; o.connect(g).connect(fl); if (P.lfoT === 'pitch') lfoG.connect(o.detune); o.start(t); return o; };
        const o1 = mk(P.o1, f, (1 - P.mix) * 0.5, -P.det / 2), o2 = mk(P.o2, f * Math.pow(2, P.oct2), P.mix * 0.5, P.det / 2), sb = P.sub > 0 ? mk('sine', f / 2, P.sub * 0.5) : null;
        let nz = null; if (P.noise > 0) { nz = ac.createBufferSource(); nz.buffer = noiseBuf; nz.loop = true; const ng = ac.createGain(); ng.gain.value = P.noise * 0.4; nz.connect(ng).connect(fl); nz.start(t); }
        if (P.lfoT === 'filter') lfoG.connect(fl.frequency); if (P.lfoT === 'amp') { const tg = ac.createGain(); tg.gain.value = 0.004; lfoG.connect(tg).connect(vca.gain); }
        const pk = vel * 0.6; vca.gain.setValueAtTime(0, t); vca.gain.linearRampToValueAtTime(pk, t + P.a); vca.gain.setTargetAtTime(pk * P.s, t + P.a, Math.max(0.01, P.d / 3));
        fl.frequency.setValueAtTime(P.cut, t); fl.frequency.linearRampToValueAtTime(Math.min(18000, P.cut + P.fenv), t + P.fa); fl.frequency.setTargetAtTime(P.cut, t + P.fa, Math.max(0.01, P.fd / 3));
        const v = { m, vca, fl, o1, o2, sb, nz }; voices.set(m, v); if (P.mono) monoV = v; light(m, true);
      }
      function noteOff(m, now = false) { const v = voices.get(m); if (!v) return; if (P.mono && held.size && !now) { const last = [...held].pop(); if (last !== m) return noteOn(last); } voices.delete(m); if (v === monoV) monoV = null; light(m, false); const t = ac.currentTime; const r = now ? 0.01 : P.r; v.vca.gain.cancelScheduledValues(t); v.vca.gain.setValueAtTime(v.vca.gain.value, t); v.vca.gain.setTargetAtTime(0, t, Math.max(0.005, r / 4)); [v.o1, v.o2, v.sb, v.nz].forEach((o) => o && o.stop(t + r * 1.5 + 0.05)); }
      // arpeggiator
      const held = new Set(); let arpT = null, arpI = 0, arpNote = null;
      function arpTick() { if (arpNote != null) { noteOff(arpNote, false); arpNote = null; } const ns = [...held].sort((a, b) => a - b); if (!ns.length || P.arp === 'off') { arpT = null; return; } let seq = ns; if (P.arp === 'down') seq = [...ns].reverse(); else if (P.arp === 'updown') seq = ns.concat(ns.slice(1, -1).reverse()); else if (P.arp === 'octaves') seq = ns.concat(ns.map((n) => n + 12)); const n = P.arp === 'random' ? ns[Math.floor(Math.random() * ns.length)] : seq[arpI++ % seq.length]; noteOn(n); arpNote = n; arpT = setTimeout(arpTick, 1000 / P.arpR); }
      function press(m) { if (held.has(m)) return; held.add(m); if (P.arp !== 'off') { light(m, true); if (!arpT) { arpI = 0; arpTick(); } } else noteOn(m); }
      function release(m) { if (!held.has(m)) return; held.delete(m); if (P.arp !== 'off') { light(m, false); if (!held.size && arpNote != null) { clearTimeout(arpT); arpT = null; noteOff(arpNote); arpNote = null; } } else noteOff(m); }
      // UI
      const wrap = h('div.pad.col', { style: { gap: '12px', maxWidth: '1150px', margin: '0 auto' } }); view.append(wrap);
      const scope = h('canvas', { width: 1100, height: 140, style: { width: '100%', height: '120px', background: '#0b1020', borderRadius: '12px' } });
      const presetSel = h('select.input'); const fillPresets = () => { presetSel.innerHTML = ''; presetSel.append(h('optgroup', { label: 'Presets' }, Object.keys(PRESETS).map((n) => h('option', { value: 'p:' + n, selected: st.data.name === n }, n))), h('optgroup', { label: 'My patches' }, Object.keys(st.data.patches).map((n) => h('option', { value: 'u:' + n, selected: st.data.name === n }, n)))); };
      presetSel.onchange = () => { const [k, n] = [presetSel.value.slice(0, 1), presetSel.value.slice(2)]; Object.assign(P, DEF, k === 'p' ? PRESETS[n] : st.data.patches[n]); st.data.name = n; save(); panel(); fx(); };
      const octEl = h('strong');
      wrap.append(h('div.row', { style: { flexWrap: 'wrap' } }, h('span.small.muted', 'Patch'), presetSel, h('button.btn.sm', { on: { click: async () => { const n = await MS.prompt('Save patch as', st.data.name + ' (mine)'); if (!n) return; st.data.patches[n] = { ...P }; st.data.name = n; save(); fillPresets(); MS.toast('Patch saved', 'good'); } } }, '💾 Save'), h('button.btn.sm', { on: { click: () => { const r = (a, b) => a + Math.random() * (b - a); const W = ['sine', 'triangle', 'sawtooth', 'square']; Object.assign(P, { o1: W[(Math.random() * 4) | 0], o2: W[(Math.random() * 4) | 0], mix: r(0, 1), det: r(0, 20), oct2: [-1, 0, 0, 1][(Math.random() * 4) | 0], a: r(0.001, 0.5), d: r(0.05, 1), s: r(0, 1), r: r(0.05, 1.5), cut: r(200, 6000), res: r(0, 15), fenv: r(0, 4000), rev: r(0, 0.6), dly: r(0, 0.5) }); st.data.name = 'Random'; save(); panel(); fx(); } } }, '🎲 Randomize'), h('div.spacer'), h('button.btn.sm', { on: { click: () => { st.data.oct = Math.max(1, st.data.oct - 1); save(); kb(); } } }, 'Oct −'), octEl, h('button.btn.sm', { on: { click: () => { st.data.oct = Math.min(7, st.data.oct + 1); save(); kb(); } } }, 'Oct +'), h('span.small.muted', 'Keys: A W S E D F T G Y H U J K O L P ;')), scope);
      const kbEl = h('div', { style: { position: 'relative', height: '150px', userSelect: 'none', touchAction: 'none' } }); wrap.append(kbEl);
      const panelEl = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: '10px' } }); wrap.append(panelEl);
      const knob = (label, k, min, max, step, fmt = (v) => (+v).toFixed(step < 1 ? 2 : 0)) => { const val = h('span.small.mono', fmt(P[k])); return h('label.col', { style: { gap: '2px' } }, h('div.row', h('span.small', label), h('div.spacer'), val), h('input', { type: 'range', min, max, step, value: P[k], on: { input: (e) => { P[k] = +e.target.value; val.textContent = fmt(P[k]); fx(); save(); } } })); };
      const pick = (label, k, opts) => h('label.row', h('span.small', label), h('div.spacer'), h('select.input', { style: { padding: '2px 6px' }, on: { change: (e) => { P[k] = isNaN(+e.target.value) || e.target.value === '' ? e.target.value : +e.target.value; if (k === 'mono') P.mono = e.target.value === 'true'; save(); fx(); } } }, opts.map((o) => h('option', { value: String(o), selected: String(P[k]) === String(o) }, String(o)))));
      const sec = (t, ...c) => h('div.card.col', { style: { gap: '8px' } }, h('strong', t), ...c);
      const WAVES = ['sine', 'triangle', 'sawtooth', 'square'];
      function panel() { panelEl.innerHTML = ''; fillPresets(); panelEl.append(
        sec('〰 Oscillators', pick('Osc 1', 'o1', WAVES), pick('Osc 2', 'o2', WAVES), pick('Osc 2 octave', 'oct2', [-2, -1, 0, 1, 2]), knob('Mix 1 ↔ 2', 'mix', 0, 1, 0.01), knob('Detune (cents)', 'det', 0, 50, 1), knob('Sub osc', 'sub', 0, 1, 0.01), knob('Noise', 'noise', 0, 1, 0.01)),
        sec('📈 Amp envelope', knob('Attack', 'a', 0.001, 2, 0.001, (v) => (+v).toFixed(3) + 's'), knob('Decay', 'd', 0.01, 2, 0.01, (v) => (+v).toFixed(2) + 's'), knob('Sustain', 's', 0, 1, 0.01), knob('Release', 'r', 0.01, 3, 0.01, (v) => (+v).toFixed(2) + 's'), knob('Volume', 'vol', 0, 1, 0.01)),
        sec('🔊 Filter', knob('Cutoff', 'cut', 60, 12000, 1, (v) => Math.round(v) + ' Hz'), knob('Resonance', 'res', 0, 25, 0.1, (v) => (+v).toFixed(1)), knob('Env amount', 'fenv', 0, 8000, 1, (v) => Math.round(v) + ' Hz'), knob('Env attack', 'fa', 0.001, 2, 0.001, (v) => (+v).toFixed(3) + 's'), knob('Env decay', 'fd', 0.01, 2, 0.01, (v) => (+v).toFixed(2) + 's')),
        sec('🌀 LFO · Voice', pick('LFO target', 'lfoT', ['pitch', 'filter', 'amp']), knob('LFO rate', 'lfoR', 0.1, 20, 0.1, (v) => (+v).toFixed(1) + ' Hz'), knob('LFO amount', 'lfoAmt', 0, P.lfoT === 'filter' ? 3000 : 100, 1), h('label.row', h('span.small', 'Mode'), h('div.spacer'), h('select.input', { style: { padding: '2px 6px' }, on: { change: (e) => { P.mono = e.target.value === 'mono'; save(); } } }, ['poly', 'mono'].map((o) => h('option', { value: o, selected: (o === 'mono') === !!P.mono }, o)))), knob('Glide (mono)', 'glide', 0, 0.5, 0.01, (v) => (+v).toFixed(2) + 's')),
        sec('✨ Effects · Arp', knob('Delay mix', 'dly', 0, 1, 0.01), knob('Delay time', 'dlyT', 0.05, 1, 0.01, (v) => (+v).toFixed(2) + 's'), knob('Feedback', 'dlyF', 0, 0.9, 0.01), knob('Reverb', 'rev', 0, 1, 0.01), pick('Arpeggiator', 'arp', ['off', 'up', 'down', 'updown', 'octaves', 'random']), knob('Arp rate', 'arpR', 1, 24, 1, (v) => v + '/s'))); }
      const keyEls = new Map(); function light(m, on) { const el = keyEls.get(m); if (el) el.style.filter = on ? 'brightness(.75) saturate(2)' : ''; if (el) el.style.background = on ? 'var(--accent)' : el.dataset.bg; }
      function kb() { kbEl.innerHTML = ''; keyEls.clear(); octEl.textContent = 'C' + st.data.oct; const base = 12 * (st.data.oct + 1); const N = 25; const whites = []; for (let i = 0; i < N; i++) if (![1, 3, 6, 8, 10].includes(i % 12)) whites.push(i); const ww = 100 / whites.length;
        for (let i = 0; i < N; i++) { const m = base + i, black = [1, 3, 6, 8, 10].includes(i % 12); const wi = whites.filter((w) => w < i).length; const bg = black ? '#111827' : '#f8fafc'; const el = h('div', { 'data-bg': bg, style: { position: 'absolute', left: (black ? wi * ww - ww * 0.3 : wi * ww) + '%', width: (black ? ww * 0.6 : ww) + '%', height: black ? '60%' : '100%', background: bg, border: '1px solid #64748b', borderRadius: '0 0 8px 8px', zIndex: black ? 2 : 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', fontSize: '10px', color: black ? '#94a3b8' : '#64748b', paddingBottom: '6px', boxSizing: 'border-box', cursor: 'pointer' } }, (KEYS[i] ? KEYS[i].toUpperCase() + ' · ' : '') + (i % 12 === 0 ? NAMES[0] + (st.data.oct + i / 12) : ''));
          el.addEventListener('pointerdown', (e) => { e.preventDefault(); try { el.releasePointerCapture(e.pointerId); } catch (_) {} press(m); }); el.addEventListener('pointerup', () => release(m)); el.addEventListener('pointerleave', () => release(m)); el.addEventListener('pointerenter', (e) => e.buttons && press(m)); keyEls.set(m, el); kbEl.append(el); } }
      const kd = (e) => { if (e.repeat || e.target.matches('input,textarea,select') || e.ctrlKey || e.metaKey) return; const i = KEYS.indexOf(e.key.toLowerCase()); if (i >= 0) { press(12 * (st.data.oct + 1) + i); e.preventDefault(); } else if (e.key === 'z') { st.data.oct = Math.max(1, st.data.oct - 1); save(); kb(); } else if (e.key === 'x') { st.data.oct = Math.min(7, st.data.oct + 1); save(); kb(); } };
      const ku = (e) => { const i = KEYS.indexOf(e.key.toLowerCase()); if (i >= 0) release(12 * (st.data.oct + 1) + i); };
      document.addEventListener('keydown', kd); document.addEventListener('keyup', ku);
      let midi = null; navigator.requestMIDIAccess?.().then((m) => { midi = m; m.inputs.forEach((inp) => (inp.onmidimessage = (ev) => { const [s, n, v] = ev.data; if ((s & 0xf0) === 0x90 && v > 0) press(n); else if ((s & 0xf0) === 0x80 || ((s & 0xf0) === 0x90 && v === 0)) release(n); })); }).catch(() => {});
      let raf; const draw = () => { raf = requestAnimationFrame(draw); const g = scope.getContext('2d'); const Wd = scope.width, Hd = scope.height; g.fillStyle = '#0b1020'; g.fillRect(0, 0, Wd, Hd); if (!an) { g.fillStyle = '#64748b'; g.font = '16px system-ui'; g.fillText('Play a key to wake the synth 🎹', 20, Hd / 2); return; }
        const fd = new Uint8Array(an.frequencyBinCount); an.getByteFrequencyData(fd); const bw = Wd / 160; for (let i = 0; i < 160; i++) { const v = fd[Math.floor(Math.pow(i / 160, 2) * 600)] / 255; g.fillStyle = `hsla(${200 + i},80%,60%,.5)`; g.fillRect(i * bw, Hd - v * Hd, bw - 1, v * Hd); }
        const td = new Uint8Array(an.fftSize); an.getByteTimeDomainData(td); g.strokeStyle = '#38bdf8'; g.lineWidth = 2; g.beginPath(); for (let i = 0; i < 1100; i++) { const y = (td[i] / 255) * Hd; i ? g.lineTo(i, y) : g.moveTo(i, y); } g.stroke(); };
      panel(); kb(); draw();
      return { unmount: () => { cancelAnimationFrame(raf); document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku); clearTimeout(arpT); midi?.inputs.forEach((i) => (i.onmidimessage = null)); ac?.close(); } };
    },
  });
})();
