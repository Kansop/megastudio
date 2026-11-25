/* Music Studio: drum machine + melodic step sequencer + live keyboard synth, WebAudio, WAV export */
(function () {
  const { h } = MS;
  const STEPS = 16;
  const DRUMS = ['Kick', 'Snare', 'Clap', 'Hi-hat', 'Open hat', 'Tom', 'Rim', 'Cowbell'];
  const SCALES = { 'Minor pent.': [0, 3, 5, 7, 10], 'Major pent.': [0, 2, 4, 7, 9], Major: [0, 2, 4, 5, 7, 9, 11], Minor: [0, 2, 3, 5, 7, 8, 10], Blues: [0, 3, 5, 6, 7, 10], Dorian: [0, 2, 3, 5, 7, 9, 10], Chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] };
  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const ROWS_MEL = 12;
  const blank = () => ({ drums: DRUMS.map(() => Array(STEPS).fill(0)), mel: Array.from({ length: ROWS_MEL }, () => Array(STEPS).fill(0)), bass: Array.from({ length: ROWS_MEL }, () => Array(STEPS).fill(0)) });
  const demoPattern = () => { const p = blank(); [0, 4, 8, 12].forEach((i) => (p.drums[0][i] = 1)); [4, 12].forEach((i) => (p.drums[1][i] = 1)); for (let i = 0; i < 16; i += 2) p.drums[3][i] = 1; p.drums[4][14] = 1; p.drums[2][12] = 1;
    [[0, 4], [3, 7], [6, 5], [8, 4], [10, 6], [12, 8], [14, 7]].forEach(([s, n]) => (p.mel[n][s] = 1)); [[0, 0], [3, 0], [6, 2], [8, 3], [11, 3], [14, 1]].forEach(([s, n]) => (p.bass[n][s] = 1)); return p; };
  let store;
  const getStore = async () => (store = store || (await MS.store('music', () => ({ bpm: 110, swing: 0, scale: 'Minor pent.', root: 9, wave: 'sawtooth', cutoff: 2400, delay: 0.25, volume: 0.8, patterns: { A: demoPattern(), B: blank(), C: blank(), D: blank() }, current: 'A', chain: '' }))));

  function voices(ac, out) {
    const noiseBuf = (() => { const b = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; })();
    const env = (g, t, a, peak, dec) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); };
    const noise = (t, dur, type, freq, peak, q = 1) => { const s = ac.createBufferSource(); s.buffer = noiseBuf; const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = ac.createGain(); env(g, t, 0.001, peak, dur); s.connect(f).connect(g).connect(out); s.start(t); s.stop(t + dur + 0.05); };
    const tone = (t, f0, f1, dur, peak, type = 'sine') => { const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur); const g = ac.createGain(); env(g, t, 0.002, peak, dur); o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.05); };
    return {
      drum(i, t) {
        switch (i) {
          case 0: tone(t, 150, 40, 0.45, 1); break;
          case 1: tone(t, 220, 120, 0.12, 0.5, 'triangle'); noise(t, 0.18, 'highpass', 1500, 0.5); break;
          case 2: [0, 0.012, 0.024].forEach((d) => noise(t + d, 0.09, 'bandpass', 1200, 0.6, 2)); break;
          case 3: noise(t, 0.04, 'highpass', 8000, 0.35); break;
          case 4: noise(t, 0.28, 'highpass', 7000, 0.3); break;
          case 5: tone(t, 180, 90, 0.3, 0.7); break;
          case 6: tone(t, 1700, 1600, 0.03, 0.4, 'square'); break;
          case 7: tone(t, 560, 540, 0.25, 0.25, 'square'); tone(t, 845, 830, 0.25, 0.2, 'square'); break;
        }
      },
    };
  }
  function synthNote(ac, out, freq, t, dur, st, isBass) {
    const o = ac.createOscillator(); o.type = isBass ? 'square' : st.wave; o.frequency.value = freq;
    const o2 = ac.createOscillator(); o2.type = o.type; o2.frequency.value = freq; o2.detune.value = isBass ? 0 : 9;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(isBass ? 600 : st.cutoff * 1.6, t); f.frequency.exponentialRampToValueAtTime(isBass ? 220 : Math.max(200, st.cutoff * 0.5), t + dur); f.Q.value = 4;
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(isBass ? 0.35 : 0.22, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); o2.connect(f); f.connect(g).connect(out); o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }
  const midiFreq = (m) => 440 * 2 ** ((m - 69) / 12);
  function rowMidi(st, row, octave) { const sc = SCALES[st.scale]; const idx = ROWS_MEL - 1 - row; return 12 * octave + st.root + sc[idx % sc.length] + 12 * Math.floor(idx / sc.length); }
  function buildBus(ac, st) {
    const master = ac.createGain(); master.gain.value = st.volume;
    const comp = ac.createDynamicsCompressor(); master.connect(comp).connect(ac.destination);
    const dl = ac.createDelay(1); dl.delayTime.value = (60 / st.bpm) * 0.75; const fb = ac.createGain(); fb.gain.value = st.delay; const wet = ac.createGain(); wet.gain.value = st.delay ? 0.5 : 0;
    const synthBus = ac.createGain(); synthBus.connect(master); synthBus.connect(dl); dl.connect(fb).connect(dl); dl.connect(wet).connect(master);
    return { master, synthBus, comp };
  }
  function schedulePattern(ac, bus, st, pat, t0) {
    const v = voices(ac, bus.master); const sd = 60 / st.bpm / 4;
    for (let s = 0; s < STEPS; s++) { const t = t0 + s * sd + (s % 2 ? st.swing * sd * 0.5 : 0);
      pat.drums.forEach((row, i) => row[s] && v.drum(i, t)); pat.mel.forEach((row, r) => row[s] && synthNote(ac, bus.synthBus, midiFreq(rowMidi(st, r, 5)), t, sd * 1.8, st)); pat.bass.forEach((row, r) => row[s] && synthNote(ac, bus.synthBus, midiFreq(rowMidi(st, r, 3)), t, sd * 1.5, st, true)); }
    return STEPS * sd;
  }
  function wav(buf) {
    const ch = buf.numberOfChannels, len = buf.length * ch * 2 + 44; const ab = new ArrayBuffer(len); const v = new DataView(ab); let p = 0;
    const w = (s) => { for (const c of s) v.setUint8(p++, c.charCodeAt(0)); }; const u32 = (x) => { v.setUint32(p, x, true); p += 4; }; const u16 = (x) => { v.setUint16(p, x, true); p += 2; };
    w('RIFF'); u32(len - 8); w('WAVE'); w('fmt '); u32(16); u16(1); u16(ch); u32(buf.sampleRate); u32(buf.sampleRate * ch * 2); u16(ch * 2); u16(16); w('data'); u32(buf.length * ch * 2);
    const chans = [...Array(ch)].map((_, i) => buf.getChannelData(i));
    for (let i = 0; i < buf.length; i++) for (let c = 0; c < ch; c++) { const s = Math.max(-1, Math.min(1, chans[c][i])); v.setInt16(p, s < 0 ? s * 0x8000 : s * 0x7fff, true); p += 2; }
    return new Blob([ab], { type: 'audio/wav' });
  }
  MS.register({
    id: 'music', name: 'Music Studio', icon: '🎹', group: 'Create', desc: 'Drum machine, sequencer & synth', keywords: 'beat drum sequencer synth audio song daw piano',
    async mount(view) {
      const s = await getStore(); const st = s.data; let ac = null, bus = null, playing = false, step = 0, nextT = 0, timer = null, chainIdx = 0;
      const pat = () => st.patterns[st.current];
      const ensureAC = () => { if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); bus = buildBus(ac, st); analyser = ac.createAnalyser(); analyser.fftSize = 1024; bus.comp.disconnect(); bus.comp.connect(analyser).connect(ac.destination); } if (ac.state === 'suspended') ac.resume(); return ac; };
      let analyser = null;
      const rebuildBus = () => { if (!ac) return; bus.master.disconnect(); bus = buildBus(ac, st); bus.comp.disconnect(); bus.comp.connect(analyser); };
      const cells = { drums: [], mel: [], bass: [] };
      const mkGrid = (kind, rows, labelFn, color) => {
        const g = h('div', { style: { display: 'grid', gridTemplateColumns: `110px repeat(${STEPS}, minmax(22px, 1fr))`, gap: '3px' } });
        cells[kind] = [];
        for (let r = 0; r < rows; r++) {
          const lbl = h('div.small', { style: { alignSelf: 'center', whiteSpace: 'nowrap', overflow: 'hidden', cursor: kind === 'drums' ? 'pointer' : '' }, on: { click: () => { if (kind === 'drums') { ensureAC(); voices(ac, bus.master).drum(r, ac.currentTime); } else { ensureAC(); synthNote(ac, bus.synthBus, midiFreq(rowMidi(st, r, kind === 'mel' ? 5 : 3)), ac.currentTime, 0.4, st, kind === 'bass'); } } } }, labelFn(r));
          g.append(lbl); cells[kind][r] = [];
          for (let c = 0; c < STEPS; c++) { const b = h('button', { 'aria-label': `${kind} ${r} step ${c + 1}`, style: { height: kind === 'drums' ? '28px' : '20px', borderRadius: '5px', border: '1px solid var(--line)', cursor: 'pointer', background: c % 4 === 0 ? 'var(--panel2)' : 'var(--panel)' }, on: { mousedown: (e) => { e.preventDefault(); toggle(kind, r, c); paintMode = pat()[kind][r][c]; } , mouseenter: (e) => { if (e.buttons === 1 && paintMode !== null && pat()[kind][r][c] !== paintMode) toggle(kind, r, c); } } }); b.dataset.color = color; cells[kind][r][c] = b; g.append(b); }
        }
        return g;
      };
      let paintMode = null; const mu = () => (paintMode = null); addEventListener('mouseup', mu);
      const toggle = (kind, r, c) => { pat()[kind][r][c] = pat()[kind][r][c] ? 0 : 1; s.touch(); paintCell(kind, r, c); if (pat()[kind][r][c] && !playing) { ensureAC(); if (kind === 'drums') voices(ac, bus.master).drum(r, ac.currentTime); else synthNote(ac, bus.synthBus, midiFreq(rowMidi(st, r, kind === 'mel' ? 5 : 3)), ac.currentTime, 0.3, st, kind === 'bass'); } };
      const paintCell = (kind, r, c) => { const b = cells[kind][r][c]; const on = pat()[kind][r][c]; b.style.background = on ? b.dataset.color : c % 4 === 0 ? 'var(--panel2)' : 'var(--panel)'; b.style.boxShadow = on ? `0 0 10px ${b.dataset.color}88` : ''; };
      const paintAll = () => ['drums', 'mel', 'bass'].forEach((k) => cells[k].forEach((row, r) => row.forEach((_, c) => paintCell(k, r, c))));
      const noteLabel = (r, oct) => { const m = rowMidi(st, r, oct); return NOTE_NAMES[m % 12] + (Math.floor(m / 12) - 1); };
      const gridsWrap = h('div.col', { style: { gap: '16px' } });
      const buildGrids = () => { gridsWrap.innerHTML = ''; gridsWrap.append(
        h('div.card', h('div.row', { style: { marginBottom: '8px' } }, h('strong', '🥁 Drums'), h('span.small.muted', 'click labels to preview · drag to paint')), mkGrid('drums', DRUMS.length, (r) => DRUMS[r], '#ff4fa3')),
        h('div.card', h('div.row', { style: { marginBottom: '8px' } }, h('strong', '🎹 Lead synth'), h('span.small.muted', st.scale + ' in ' + NOTE_NAMES[st.root])), mkGrid('mel', ROWS_MEL, (r) => noteLabel(r, 5), '#7c5cff')),
        h('div.card', h('div.row', { style: { marginBottom: '8px' } }, h('strong', '🎸 Bass')), mkGrid('bass', ROWS_MEL, (r) => noteLabel(r, 3), '#3ddc97'))); paintAll(); };
      const ctl = (label, el) => h('label.col', { style: { gap: '2px', fontSize: '12px' } }, h('span.muted', label), el);
      const bpm = h('input.input', { type: 'number', min: 40, max: 240, value: st.bpm, style: { width: '74px' }, on: { change: () => { st.bpm = MS.clamp(+bpm.value || 110, 40, 240); s.touch(); rebuildBus(); } } });
      const swing = h('input', { type: 'range', min: 0, max: 0.6, step: 0.05, value: st.swing, on: { input: () => { st.swing = +swing.value; s.touch(); } } });
      const scale = h('select.input', { on: { change: () => { st.scale = scale.value; s.touch(); buildGrids(); } } }, Object.keys(SCALES).map((k) => h('option', { selected: k === st.scale }, k)));
      const root = h('select.input', { on: { change: () => { st.root = +root.value; s.touch(); buildGrids(); } } }, NOTE_NAMES.map((n, i) => h('option', { value: i, selected: i === st.root }, n)));
      const wave = h('select.input', { on: { change: () => { st.wave = wave.value; s.touch(); } } }, ['sawtooth', 'square', 'triangle', 'sine'].map((w) => h('option', { selected: w === st.wave }, w)));
      const cutoff = h('input', { type: 'range', min: 200, max: 8000, value: st.cutoff, on: { input: () => { st.cutoff = +cutoff.value; s.touch(); } } });
      const delay = h('input', { type: 'range', min: 0, max: 0.7, step: 0.05, value: st.delay, on: { input: () => { st.delay = +delay.value; s.touch(); rebuildBus(); } } });
      const vol = h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: st.volume, on: { input: () => { st.volume = +vol.value; s.touch(); if (bus) bus.master.gain.value = st.volume; } } });
      const patBtns = Object.keys(st.patterns).map((k) => h('button.btn', { on: { click: () => { st.current = k; s.touch(); patBtns.forEach((b) => b.classList.toggle('on', b.textContent === k)); paintAll(); } } }, k));
      patBtns.forEach((b) => b.classList.toggle('on', b.textContent === st.current));
      const chain = h('input.input.mono', { value: st.chain, placeholder: 'Song chain e.g. AABA', style: { width: '150px' }, on: { input: () => { st.chain = chain.value.toUpperCase().replace(/[^ABCD]/g, ''); s.touch(); } } });
      const playBtn = h('button.btn.primary', { style: { minWidth: '90px' }, on: { click: () => (playing ? stop() : play()) } }, '▶ Play');
      const viz = h('canvas', { width: 900, height: 70, style: { width: '100%', height: '70px', background: 'var(--panel2)', borderRadius: '10px' } });
      const kb = h('div', { style: { display: 'flex', height: '110px', position: 'relative', userSelect: 'none' } });
      const KEYMAP = 'awsedftgyhujkolp;'; const pressed = new Set();
      for (let i = 0; i < 17; i++) { const isBlack = [1, 3, 6, 8, 10].includes(i % 12); const k = h('div', { 'data-i': i, style: isBlack ? { width: '26px', height: '66px', background: '#111', marginLeft: '-13px', marginRight: '-13px', zIndex: 2, borderRadius: '0 0 5px 5px', cursor: 'pointer', position: 'relative', color: '#aaa', fontSize: '10px', textAlign: 'center' } : { flex: 1, background: '#f6f6f6', border: '1px solid #bbb', borderRadius: '0 0 7px 7px', cursor: 'pointer', color: '#888', fontSize: '11px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '4px' }, on: { pointerdown: () => keyNote(i) } }, KEYMAP[i].toUpperCase()); kb.append(k); }
      const keyNote = (i) => { ensureAC(); synthNote(ac, bus.synthBus, midiFreq(60 + st.root + i), ac.currentTime, 0.6, st); const el = kb.children[i]; el.style.filter = 'brightness(.7)'; setTimeout(() => (el.style.filter = ''), 150); };
      const onKey = (e) => { if (/^(input|textarea|select)$/i.test(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey) return; if (e.code === 'Space') { e.preventDefault(); playing ? stop() : play(); return; } const i = KEYMAP.indexOf(e.key.toLowerCase()); if (i >= 0 && !pressed.has(i)) { pressed.add(i); keyNote(i); } };
      const onKeyUp = (e) => pressed.delete(KEYMAP.indexOf(e.key.toLowerCase()));
      document.addEventListener('keydown', onKey); document.addEventListener('keyup', onKeyUp);
      view.append(h('div.pad.col', { style: { gap: '14px', maxWidth: '1200px' } },
        h('div.card.row', { style: { flexWrap: 'wrap', gap: '14px', alignItems: 'flex-end' } }, playBtn, ctl('BPM', bpm), ctl('Swing', swing), ctl('Scale', scale), ctl('Key', root), ctl('Wave', wave), ctl('Filter', cutoff), ctl('Delay', delay), ctl('Volume', vol), ctl('Pattern', h('div.row', patBtns)), ctl('Song chain', chain)),
        viz, gridsWrap, h('div.card', h('div.row', { style: { marginBottom: '8px' } }, h('strong', '🎼 Live keyboard'), h('span.small.muted', 'play with A W S E D F T G Y H U J K O L P ; · Space = play/stop')), kb)));
      MS.setActions(h('button.btn', { on: { click: () => { const k = st.current; st.patterns[k] = blank(); s.touch(); paintAll(); } } }, 'Clear pattern'),
        h('button.btn', { on: { click: () => { const p = pat(); p.drums.forEach((r) => r.forEach((_, i) => (r[i] = Math.random() < [0.3, 0.15, 0.08, 0.5, 0.06, 0.08, 0.1, 0.05][p.drums.indexOf(r)] ? 1 : 0))); p.drums[0][0] = 1; p.mel.forEach((r) => r.fill(0)); for (let i = 0; i < STEPS; i++) if (Math.random() < 0.45) p.mel[(Math.random() * ROWS_MEL) | 0][i] = 1; p.bass.forEach((r) => r.fill(0)); for (let i = 0; i < STEPS; i += 2) if (Math.random() < 0.5) p.bass[ROWS_MEL - 1 - ((Math.random() * 5) | 0)][i] = 1; s.touch(); paintAll(); } } }, '🎲 Randomize'),
        h('button.btn', { title: 'Copy pattern to next slot', on: { click: () => { const keys = Object.keys(st.patterns); const n = keys[(keys.indexOf(st.current) + 1) % keys.length]; st.patterns[n] = structuredClone(pat()); s.touch(); MS.toast(`Copied ${st.current} → ${n}`); } } }, '⧉ Copy →'),
        h('button.btn.primary', { on: { click: exportWav } }, '⬇ Export WAV'));
      function tick() {
        while (nextT < ac.currentTime + 0.12) {
          const seq = st.chain || st.current; const pk = seq[chainIdx % seq.length]; const p = st.patterns[pk] || pat(); const sd = 60 / st.bpm / 4; const t = nextT + (step % 2 ? st.swing * sd * 0.5 : 0);
          const v = voices(ac, bus.master); p.drums.forEach((row, i) => row[step] && v.drum(i, t)); p.mel.forEach((row, r) => row[step] && synthNote(ac, bus.synthBus, midiFreq(rowMidi(st, r, 5)), t, sd * 1.8, st)); p.bass.forEach((row, r) => row[step] && synthNote(ac, bus.synthBus, midiFreq(rowMidi(st, r, 3)), t, sd * 1.5, st, true));
          const thisStep = step, thisPk = pk; setTimeout(() => highlight(thisStep, thisPk), Math.max(0, (t - ac.currentTime) * 1000));
          nextT += sd; step = (step + 1) % STEPS; if (step === 0) chainIdx++;
        }
      }
      let lastHL = -1;
      function highlight(c, pk) { if (!playing) return; if (st.chain && pk !== st.current) { st.current = pk; patBtns.forEach((b) => b.classList.toggle('on', b.textContent === pk)); paintAll(); } ['drums', 'mel', 'bass'].forEach((k) => cells[k].forEach((row) => { if (row[lastHL]) row[lastHL].style.outline = ''; if (row[c]) row[c].style.outline = '2px solid var(--text)'; })); lastHL = c; }
      function play() { ensureAC(); playing = true; step = 0; chainIdx = 0; nextT = ac.currentTime + 0.05; timer = setInterval(tick, 25); playBtn.textContent = '■ Stop'; }
      function stop() { playing = false; clearInterval(timer); playBtn.textContent = '▶ Play'; ['drums', 'mel', 'bass'].forEach((k) => cells[k].forEach((row) => row.forEach((b) => (b.style.outline = '')))); }
      async function exportWav() {
        const seq = st.chain || st.current; const sd = 60 / st.bpm / 4; const loops = st.chain ? 1 : 2; const dur = seq.length * STEPS * sd * loops + 2;
        const oc = new OfflineAudioContext(2, Math.ceil(44100 * dur), 44100); const b = buildBus(oc, st); let t = 0.05;
        for (let l = 0; l < loops; l++) for (const k of seq) t += schedulePattern(oc, b, st, st.patterns[k], t);
        MS.toast('Rendering…'); const buf = await oc.startRendering(); MS.download('megastudio-beat.wav', wav(buf)); MS.toast('Exported WAV', 'good');
      }
      let raf; const drawViz = () => { raf = requestAnimationFrame(drawViz); const g = viz.getContext('2d'); g.clearRect(0, 0, viz.width, viz.height); if (!analyser) { g.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--muted'); g.font = '14px system-ui'; g.fillText('Press Play or a key to start audio', 20, 40); return; } const d = new Uint8Array(analyser.frequencyBinCount); analyser.getByteFrequencyData(d); const n = 96; const bw = viz.width / n; for (let i = 0; i < n; i++) { const v = d[Math.floor((i / n) ** 1.6 * d.length * 0.7)] / 255; const grad = g.createLinearGradient(0, viz.height, 0, 0); grad.addColorStop(0, '#7c5cff'); grad.addColorStop(1, '#ff4fa3'); g.fillStyle = grad; g.fillRect(i * bw + 1, viz.height - v * viz.height, bw - 2, v * viz.height); } };
      buildGrids(); drawViz();
      return { unmount: () => { stop(); cancelAnimationFrame(raf); removeEventListener('mouseup', mu); document.removeEventListener('keydown', onKey); document.removeEventListener('keyup', onKeyUp); if (ac) ac.close(); } };
    },
  });
})();
