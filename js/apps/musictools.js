/* Music Tools: chromatic tuner (mic pitch detection), metronome with tap tempo, piano chord & scale explorer,
   guitar chord library, circle of fifths, and interval ear training */
(function () {
  const { h } = MS;
  const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const freq = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
  const CHORDS = { 'Major': [0, 4, 7], 'Minor': [0, 3, 7], '7': [0, 4, 7, 10], 'maj7': [0, 4, 7, 11], 'm7': [0, 3, 7, 10], 'sus2': [0, 2, 7], 'sus4': [0, 5, 7], 'dim': [0, 3, 6], 'aug': [0, 4, 8], 'add9': [0, 4, 7, 14], '6': [0, 4, 7, 9], 'm6': [0, 3, 7, 9], '9': [0, 4, 7, 10, 14], 'dim7': [0, 3, 6, 9], 'm7♭5': [0, 3, 6, 10] };
  const SCALES = { 'Major': [0, 2, 4, 5, 7, 9, 11], 'Natural minor': [0, 2, 3, 5, 7, 8, 10], 'Harmonic minor': [0, 2, 3, 5, 7, 8, 11], 'Major pentatonic': [0, 2, 4, 7, 9], 'Minor pentatonic': [0, 3, 5, 7, 10], 'Blues': [0, 3, 5, 6, 7, 10], 'Dorian': [0, 2, 3, 5, 7, 9, 10], 'Mixolydian': [0, 2, 4, 5, 7, 9, 10], 'Lydian': [0, 2, 4, 6, 7, 9, 11], 'Phrygian': [0, 1, 3, 5, 7, 8, 10], 'Chromatic': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] };
  // guitar shapes: strings low E→high e, -1 = muted, numbers = fret; f = fingers
  const GUITAR = { C: 'x32010', D: 'xx0232', E: '022100', F: '133211', G: '320003', A: 'x02220', B: 'x24442', Am: 'x02210', Bm: 'x24432', Cm: 'x35543', Dm: 'xx0231', Em: '022000', Fm: '133111', Gm: '355333', C7: 'x32310', D7: 'xx0212', E7: '020100', G7: '320001', A7: 'x02020', B7: 'x21202', Cmaj7: 'x32000', Dmaj7: 'xx0222', Fmaj7: 'xx3210', Gmaj7: '320002', Amaj7: 'x02120', Am7: 'x02010', Dm7: 'xx0211', Em7: '020000', Dsus2: 'xx0230', Dsus4: 'xx0233', Asus2: 'x02200', Asus4: 'x02230', Esus4: '022200', Cadd9: 'x32033', 'F#m': '244222', 'C#m': 'x46654', 'G#m': '466444', Bb: 'x13331', Eb: 'x68886' };
  const INTERVALS = ['Unison', 'Minor 2nd', 'Major 2nd', 'Minor 3rd', 'Major 3rd', 'Perfect 4th', 'Tritone', 'Perfect 5th', 'Minor 6th', 'Major 6th', 'Minor 7th', 'Major 7th', 'Octave'];
  let AC = null; const ac = () => (AC = AC || new (window.AudioContext || window.webkitAudioContext)());
  function pluck(f, t = 0, dur = 1.2, type = 'triangle', vol = 0.25) { const a = ac(); const t0 = a.currentTime + t; const o = a.createOscillator(), g = a.createGain(), lp = a.createBiquadFilter(); o.type = type; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.setValueAtTime(f * 6, t0); lp.frequency.exponentialRampToValueAtTime(f * 1.5, t0 + dur); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); o.connect(lp).connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.05); }

  MS.register({
    id: 'musictools', name: 'Music Tools', icon: '🎸', group: 'Create', desc: 'Tuner, metronome, chords, scales & ear training', keywords: 'tuner metronome chords guitar piano scales music theory ear training circle of fifths bpm pitch',
    async mount(view) {
      const st = await MS.store('musictools', () => ({ tab: 'tuner', bpm: 100, beats: 4, sub: 1, root: 0, chord: 'Major', scale: 'Major', ear: { right: 0, total: 0, best: 0 }, a4: 440 }));
      const wrap = h('div.pad.col', { style: { gap: '14px', maxWidth: '1000px', margin: '0 auto' } }); view.append(wrap);
      const tabsEl = h('div.row', { style: { flexWrap: 'wrap' } }); const body = h('div.col', { style: { gap: '14px' } }); wrap.append(tabsEl, body);
      let cleanup = null;
      const TABS = [['tuner', '🎤 Tuner'], ['metro', '🥁 Metronome'], ['piano', '🎹 Chords & scales'], ['guitar', '🎸 Guitar chords'], ['circle', '⭕ Circle of fifths'], ['ear', '👂 Ear training']];
      function render() { if (cleanup) cleanup(); cleanup = null; tabsEl.innerHTML = ''; TABS.forEach(([k, l]) => tabsEl.append(h('button.btn', { class: st.data.tab === k ? 'on' : '', on: { click: () => { st.data.tab = k; st.touch(); render(); } } }, l))); body.innerHTML = ''; ({ tuner, metro, piano, guitar, circle, ear })[st.data.tab](); }

      /* ---------- tuner ---------- */
      function tuner() {
        const noteEl = h('div', { style: { fontSize: '84px', fontWeight: 800, lineHeight: 1 } }, '–'); const centsEl = h('div.mono', '—'); const hzEl = h('div.muted.mono', 'Tap start and play a note');
        const cv = h('canvas', { width: 600, height: 170, style: { width: '100%', maxWidth: '600px', height: '170px' } }); const g = cv.getContext('2d');
        let stream, an, raf, buf, smooth = null, cents = 0;
        const startBtn = h('button.btn.primary', { on: { click: async () => { if (stream) return stop(); try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }); const a = ac(); await a.resume(); const src = a.createMediaStreamSource(stream); an = a.createAnalyser(); an.fftSize = 4096; src.connect(an); buf = new Float32Array(an.fftSize); startBtn.textContent = '⏹ Stop'; loop(); } catch (e) { MS.toast('Microphone unavailable: ' + e.message, 'bad'); } } } }, '🎤 Start tuner');
        const stop = () => { cancelAnimationFrame(raf); stream && stream.getTracks().forEach((t) => t.stop()); stream = null; startBtn.textContent = '🎤 Start tuner'; };
        function detect(b, sr) { let rms = 0; for (const v of b) rms += v * v; rms = Math.sqrt(rms / b.length); if (rms < 0.01) return -1; let r1 = 0, r2 = b.length - 1; const th = 0.2; for (let i = 0; i < b.length / 2; i++) if (Math.abs(b[i]) < th) { r1 = i; break; } for (let i = 1; i < b.length / 2; i++) if (Math.abs(b[b.length - i]) < th) { r2 = b.length - i; break; } const x = b.slice(r1, r2); const n = x.length; const c = new Float32Array(n); for (let i = 0; i < n; i++) for (let j = 0; j < n - i; j++) c[i] += x[j] * x[j + i]; let d = 0; while (d < n - 1 && c[d] > c[d + 1]) d++; let mx = -1, mp = -1; for (let i = d; i < n; i++) if (c[i] > mx) { mx = c[i]; mp = i; } let T0 = mp; const y1 = c[T0 - 1], y2 = c[T0], y3 = c[T0 + 1]; const a2 = (y1 + y3 - 2 * y2) / 2, b2 = (y3 - y1) / 2; if (a2) T0 -= b2 / (2 * a2); return sr / T0; }
        function loop() { raf = requestAnimationFrame(loop); an.getFloatTimeDomainData(buf); const f = detect(buf.subarray(0, 2048), ac().sampleRate); if (f > 30 && f < 2000) { smooth = smooth ? smooth * 0.7 + f * 0.3 : f; const m = 69 + 12 * Math.log2(smooth / st.data.a4); const n = Math.round(m); cents = Math.round((m - n) * 100); noteEl.textContent = NOTES[((n % 12) + 12) % 12] + Math.floor(n / 12 - 1); centsEl.textContent = (cents > 0 ? '+' : '') + cents + ' cents'; hzEl.textContent = smooth.toFixed(1) + ' Hz'; noteEl.style.color = Math.abs(cents) < 5 ? 'var(--good)' : Math.abs(cents) < 15 ? 'var(--warn)' : 'var(--bad)'; } drawNeedle(); }
        function drawNeedle() { const W = 600, H = 170; g.clearRect(0, 0, W, H); const css = getComputedStyle(view); g.strokeStyle = css.getPropertyValue('--line'); g.lineWidth = 2; g.beginPath(); g.arc(W / 2, H - 10, 140, Math.PI, 2 * Math.PI); g.stroke(); for (let c = -50; c <= 50; c += 10) { const a = Math.PI * 1.5 + (c / 50) * (Math.PI / 2.4); g.strokeStyle = c === 0 ? css.getPropertyValue('--good') : css.getPropertyValue('--muted'); g.lineWidth = c === 0 ? 4 : 2; g.beginPath(); g.moveTo(W / 2 + Math.cos(a) * 128, H - 10 + Math.sin(a) * 128); g.lineTo(W / 2 + Math.cos(a) * 146, H - 10 + Math.sin(a) * 146); g.stroke(); } const a = Math.PI * 1.5 + (MS.clamp(cents, -50, 50) / 50) * (Math.PI / 2.4); g.strokeStyle = Math.abs(cents) < 5 ? css.getPropertyValue('--good') : css.getPropertyValue('--accent'); g.lineWidth = 4; g.beginPath(); g.moveTo(W / 2, H - 10); g.lineTo(W / 2 + Math.cos(a) * 130, H - 10 + Math.sin(a) * 130); g.stroke(); g.fillStyle = css.getPropertyValue('--text'); g.beginPath(); g.arc(W / 2, H - 10, 7, 0, 7); g.fill(); }
        const ref = h('div.row', { style: { flexWrap: 'wrap', justifyContent: 'center' } }, h('span.small.muted', 'Reference tones (guitar):'), [['E2', 40], ['A2', 45], ['D3', 50], ['G3', 55], ['B3', 59], ['E4', 64]].map(([n, m]) => h('button.btn.sm', { on: { click: () => pluck(freq(m) * st.data.a4 / 440, 0, 2.2) } }, n)));
        const a4 = h('input.input', { type: 'number', value: st.data.a4, min: 415, max: 466, style: { width: '72px' }, on: { change: () => { st.data.a4 = +a4.value || 440; st.touch(); } } });
        body.append(h('div.card.col', { style: { alignItems: 'center', gap: '8px', textAlign: 'center' } }, noteEl, centsEl, cv, hzEl, h('div.row', startBtn, h('span.small.muted', 'A4 ='), a4, h('span.small.muted', 'Hz')), ref));
        drawNeedle(); cleanup = stop;
      }
      /* ---------- metronome ---------- */
      function metro() {
        let playing = false, timer = 0, nextT = 0, beat = 0, taps = [];
        const bpmEl = h('div', { style: { fontSize: '72px', fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' } }, st.data.bpm);
        const tempoName = (b) => (b < 60 ? 'Largo' : b < 76 ? 'Adagio' : b < 108 ? 'Andante' : b < 120 ? 'Moderato' : b < 156 ? 'Allegro' : b < 176 ? 'Vivace' : 'Presto');
        const nameEl = h('div.muted', tempoName(st.data.bpm));
        const dots = h('div.row', { style: { gap: '10px', justifyContent: 'center' } });
        const drawDots = () => { dots.innerHTML = ''; for (let i = 0; i < st.data.beats; i++) dots.append(h('div', { style: { width: '26px', height: '26px', borderRadius: '50%', background: 'var(--panel2)', border: '2px solid ' + (i === 0 ? 'var(--accent)' : 'var(--line)'), transition: 'background .05s' } })); };
        const setBpm = (b) => { st.data.bpm = MS.clamp(Math.round(b), 30, 300); bpmEl.textContent = st.data.bpm; nameEl.textContent = tempoName(st.data.bpm); slider.value = st.data.bpm; st.touch(); };
        const slider = h('input', { type: 'range', min: 30, max: 300, value: st.data.bpm, style: { width: '100%' }, on: { input: () => setBpm(+slider.value) } });
        function click(t, accent, sub) { const a = ac(); const o = a.createOscillator(), g = a.createGain(); o.frequency.value = accent ? 1600 : sub ? 800 : 1100; g.gain.setValueAtTime(sub ? 0.25 : 0.6, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05); o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.06); }
        function sched() { const a = ac(); while (nextT < a.currentTime + 0.12) { const per = 60 / st.data.bpm / st.data.sub; const b = Math.floor(beat / st.data.sub) % st.data.beats, isMain = beat % st.data.sub === 0; click(nextT, isMain && b === 0, !isMain); if (isMain) { const delay = (nextT - a.currentTime) * 1000; setTimeout(() => { [...dots.children].forEach((d, i) => (d.style.background = i === b ? (b === 0 ? 'var(--accent)' : 'var(--text)') : 'var(--panel2)')); }, Math.max(0, delay)); } nextT += per; beat++; } }
        const playBtn = h('button.btn.primary', { style: { fontSize: '18px', padding: '10px 24px' }, on: { click: () => { playing = !playing; playBtn.textContent = playing ? '⏹ Stop' : '▶ Start'; if (playing) { ac().resume(); nextT = ac().currentTime + 0.05; beat = 0; timer = setInterval(sched, 25); } else clearInterval(timer); } } }, '▶ Start');
        const sel = (k, opts, lbl) => h('label.row', h('span.small.muted', lbl), h('select.input', { on: { change: (e) => { st.data[k] = +e.target.value; st.touch(); drawDots(); } } }, opts.map(([v, l]) => h('option', { value: v, selected: st.data[k] === v }, l))));
        const tap = h('button.btn', { on: { click: () => { const now = performance.now(); taps = taps.filter((t) => now - t < 3000); taps.push(now); if (taps.length > 1) { const iv = (taps[taps.length - 1] - taps[0]) / (taps.length - 1); setBpm(60000 / iv); } } } }, '👆 Tap tempo');
        drawDots();
        body.append(h('div.card.col', { style: { alignItems: 'center', gap: '14px', textAlign: 'center' } }, bpmEl, nameEl, dots, slider, h('div.row', { style: { flexWrap: 'wrap', justifyContent: 'center' } }, h('button.btn', { on: { click: () => setBpm(st.data.bpm - 5) } }, '−5'), h('button.btn', { on: { click: () => setBpm(st.data.bpm - 1) } }, '−1'), playBtn, h('button.btn', { on: { click: () => setBpm(st.data.bpm + 1) } }, '+1'), h('button.btn', { on: { click: () => setBpm(st.data.bpm + 5) } }, '+5')),
          h('div.row', { style: { flexWrap: 'wrap', justifyContent: 'center' } }, sel('beats', [[2, '2/4'], [3, '3/4'], [4, '4/4'], [5, '5/4'], [6, '6/8'], [7, '7/8']], 'Time'), sel('sub', [[1, '♩ quarter'], [2, '♪ eighths'], [3, 'triplets'], [4, '16ths']], 'Subdivide'), tap)));
        const kd = (e) => { if (e.key === ' ' && e.target === document.body) { e.preventDefault(); playBtn.click(); } }; document.addEventListener('keydown', kd);
        cleanup = () => { clearInterval(timer); document.removeEventListener('keydown', kd); };
      }
      /* ---------- piano chords & scales ---------- */
      function pianoKeys(highlight, rootPc, onKey) {
        const el = h('div', { style: { position: 'relative', height: '150px', width: '100%', maxWidth: '760px', userSelect: 'none' } }); const whites = []; for (let m = 48; m < 84; m++) if (![1, 3, 6, 8, 10].includes(m % 12)) whites.push(m);
        const ww = 100 / whites.length;
        whites.forEach((m, i) => { const on = highlight.has(m); el.append(h('div', { style: { position: 'absolute', left: i * ww + '%', width: ww + '%', top: 0, bottom: 0, background: on ? (m % 12 === rootPc ? 'var(--accent)' : 'color-mix(in srgb, var(--accent) 45%, #fff)') : '#fff', border: '1px solid #999', borderRadius: '0 0 6px 6px', cursor: 'pointer', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', fontSize: '10px', color: on ? '#fff' : '#888', paddingBottom: '4px' }, on: { pointerdown: () => onKey(m) } }, m % 12 === 0 ? 'C' + (m / 12 - 1) : on ? NOTES[m % 12] : '')); });
        whites.forEach((m, i) => { if ([0, 2, 5, 7, 9].includes(m % 12) && m + 1 < 84) { const b = m + 1; const on = highlight.has(b); el.append(h('div', { style: { position: 'absolute', left: (i + 0.68) * ww + '%', width: ww * 0.64 + '%', top: 0, height: '60%', background: on ? (b % 12 === rootPc ? 'var(--accent)' : 'color-mix(in srgb, var(--accent) 70%, #000)') : '#1a1a1a', borderRadius: '0 0 4px 4px', zIndex: 1, cursor: 'pointer' }, on: { pointerdown: () => onKey(b) } })); } });
        return el;
      }
      function piano() {
        const root = st.data.root; const rootSel = h('div.row', { style: { flexWrap: 'wrap', gap: '4px' } }, NOTES.map((n, i) => h('button.btn.sm', { class: i === root ? 'on' : '', on: { click: () => { st.data.root = i; st.touch(); render(); } } }, n)));
        const ch = CHORDS[st.data.chord]; const base = 60 + root; const chordNotes = ch.map((x) => base + x);
        const sc = SCALES[st.data.scale]; const scaleNotes = new Set(); for (let o = 48; o < 84; o += 12) sc.forEach((x) => { const m = o + ((root + x) % 12) + (root + x >= 12 ? 0 : 0); if (m < 84) scaleNotes.add(o + ((root + x) % 12)); });
        const playChord = (arp) => chordNotes.forEach((m, i) => pluck(freq(m), arp ? i * 0.12 : 0, 1.8, 'triangle', 0.18));
        const playScale = () => [...sc, 12].forEach((x, i) => pluck(freq(60 + root + x), i * 0.22, 0.5, 'triangle', 0.22));
        // diatonic chords for major/minor
        const diat = st.data.scale === 'Major' || st.data.scale === 'Natural minor' ? sc.map((x, i) => { const third = (sc[(i + 2) % 7] - x + 12) % 12, fifth = (sc[(i + 4) % 7] - x + 12) % 12; const q = third === 4 && fifth === 7 ? '' : third === 3 && fifth === 7 ? 'm' : 'dim'; const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][i]; return { name: NOTES[(root + x) % 12] + q, roman: q === '' ? roman : q === 'm' ? roman.toLowerCase() : roman.toLowerCase() + '°', notes: [x, x + third, x + third + fifth].map((y) => 60 + root + y) }; }) : [];
        body.append(h('div.card.col', { style: { gap: '10px' } }, h('strong', 'Root'), rootSel,
          h('div.row', { style: { flexWrap: 'wrap' } }, h('strong', 'Chord'), h('select.input', { on: { change: (e) => { st.data.chord = e.target.value; st.touch(); render(); } } }, Object.keys(CHORDS).map((k) => h('option', { selected: k === st.data.chord }, k))), h('span', { style: { fontSize: '20px', fontWeight: 700 } }, NOTES[root] + (st.data.chord === 'Major' ? '' : st.data.chord === 'Minor' ? 'm' : st.data.chord)), h('span.muted', chordNotes.map((m) => NOTES[m % 12]).join(' – ')), h('button.btn.sm', { on: { click: () => playChord(false) } }, '▶ Play'), h('button.btn.sm', { on: { click: () => playChord(true) } }, '▶ Arpeggio')),
          pianoKeys(new Set(chordNotes), root, (m) => pluck(freq(m), 0, 1.2))),
          h('div.card.col', { style: { gap: '10px' } }, h('div.row', { style: { flexWrap: 'wrap' } }, h('strong', 'Scale'), h('select.input', { on: { change: (e) => { st.data.scale = e.target.value; st.touch(); render(); } } }, Object.keys(SCALES).map((k) => h('option', { selected: k === st.data.scale }, k))), h('span.muted', sc.map((x) => NOTES[(root + x) % 12]).join(' ')), h('button.btn.sm', { on: { click: playScale } }, '▶ Play scale')),
            pianoKeys(scaleNotes, root, (m) => pluck(freq(m), 0, 1.2)),
            diat.length ? h('div.col', { style: { gap: '6px' } }, h('span.small.muted', 'Chords in this key (click to hear):'), h('div.row', { style: { flexWrap: 'wrap', gap: '6px' } }, diat.map((d) => h('button.btn', { on: { click: () => d.notes.forEach((m) => pluck(freq(m), 0, 1.5, 'triangle', 0.18)) } }, h('span.muted.small', d.roman + ' '), d.name))), h('div.small.muted', 'Try I – V – vi – IV for a million pop songs.')) : null));
      }
      /* ---------- guitar ---------- */
      function guitar() {
        const grid = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' } });
        const OPEN = [40, 45, 50, 55, 59, 64];
        Object.entries(GUITAR).forEach(([name, shape]) => {
          const frets = [...shape].map((c) => (c === 'x' ? -1 : +c)); const minF = Math.min(...frets.filter((f) => f > 0)); const start = Math.max(...frets) > 4 ? minF : 1;
          const cv = h('canvas', { width: 130, height: 150, style: { width: '120px', height: '138px' } }); const g = cv.getContext('2d'); const css = getComputedStyle(document.documentElement);
          const X = (s) => 20 + s * 18, Y = (f) => 30 + f * 24;
          g.strokeStyle = css.getPropertyValue('--text') || '#888'; g.fillStyle = g.strokeStyle; g.lineWidth = 1;
          for (let s = 0; s < 6; s++) { g.beginPath(); g.moveTo(X(s), Y(0)); g.lineTo(X(s), Y(5)); g.stroke(); }
          for (let f = 0; f <= 5; f++) { g.lineWidth = f === 0 && start === 1 ? 4 : 1; g.beginPath(); g.moveTo(X(0), Y(f)); g.lineTo(X(5), Y(f)); g.stroke(); }
          if (start > 1) { g.font = '11px system-ui'; g.fillText(start + 'fr', X(5) + 6, Y(0.6)); }
          frets.forEach((f, s) => { g.font = '12px system-ui'; g.textAlign = 'center'; if (f < 0) g.fillText('×', X(s), 22); else if (f === 0) { g.beginPath(); g.arc(X(s), 17, 4, 0, 7); g.stroke(); } else { g.fillStyle = '#7c5cff'; g.beginPath(); g.arc(X(s), Y(f - start + 0.5), 7, 0, 7); g.fill(); g.fillStyle = g.strokeStyle; } });
          const strum = () => frets.forEach((f, s) => { if (f >= 0) pluck(freq(OPEN[s] + f), s * 0.035, 2, 'sawtooth', 0.07); });
          grid.append(h('button.card.col', { style: { alignItems: 'center', gap: '2px', cursor: 'pointer', padding: '8px' }, on: { click: strum } }, h('strong', { style: { fontSize: '17px' } }, name), cv, h('span.small.muted', '▶ strum')));
        });
        body.append(h('div.small.muted', 'Click a chord to hear it strummed. × = don’t play the string, ○ = open string.'), grid);
      }
      /* ---------- circle of fifths ---------- */
      function circle() {
        const cv = h('canvas', { width: 520, height: 520, style: { width: 'min(520px, 100%)', aspectRatio: '1', cursor: 'pointer', alignSelf: 'center' } }); const g = cv.getContext('2d');
        const MAJ = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'D♭', 'A♭', 'E♭', 'B♭', 'F'], MIN = ['Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m', 'B♭m', 'Fm', 'Cm', 'Gm', 'Dm'], SIG = ['', '1♯', '2♯', '3♯', '4♯', '5♯', '6♯/6♭', '5♭', '4♭', '3♭', '2♭', '1♭'];
        let selI = 0; const info = h('div.card.col', { style: { gap: '6px' } });
        function draw() { const css = getComputedStyle(view); const c = 260; g.clearRect(0, 0, 520, 520); for (let i = 0; i < 12; i++) { const a0 = ((i - 0.5) / 12) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 0.5) / 12) * Math.PI * 2 - Math.PI / 2; const near = [(selI + 11) % 12, selI, (selI + 1) % 12].includes(i); [[250, 175, MAJ[i], 20], [175, 110, MIN[i], 14]].forEach(([ro, ri, label, fs], k) => { g.beginPath(); g.arc(c, c, ro, a0, a1); g.arc(c, c, ri, a1, a0, true); g.closePath(); g.fillStyle = i === selI ? css.getPropertyValue('--accent') : near ? 'color-mix(in srgb, ' + css.getPropertyValue('--accent') + ' 35%, ' + css.getPropertyValue('--panel2') + ')' : css.getPropertyValue('--panel2'); g.fill(); g.strokeStyle = css.getPropertyValue('--line'); g.stroke(); const am = (i / 12) * Math.PI * 2 - Math.PI / 2, rm = (ro + ri) / 2; g.fillStyle = i === selI ? '#fff' : css.getPropertyValue('--text'); g.font = `bold ${fs}px system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, c + Math.cos(am) * rm, c + Math.sin(am) * rm); if (k === 0) { g.font = '10px system-ui'; g.fillStyle = css.getPropertyValue('--muted'); g.fillText(SIG[i], c + Math.cos(am) * 265 * 0.97, c + Math.sin(am) * 265 * 0.97 + (Math.sin(am) > 0.9 ? -6 : 0)); } }); } g.fillStyle = css.getPropertyValue('--text'); g.font = 'bold 26px system-ui'; g.fillText(MAJ[selI], c, c - 10); g.font = '13px system-ui'; g.fillStyle = css.getPropertyValue('--muted'); g.fillText('relative minor ' + MIN[selI], c, c + 16);
          info.innerHTML = ''; info.append(h('strong', `${MAJ[selI]} major · ${SIG[selI] || 'no sharps/flats'}`), h('div.small', `Neighbours (closely related keys): ${MAJ[(selI + 11) % 12]}, ${MAJ[(selI + 1) % 12]}, and minors ${MIN[(selI + 11) % 12]}, ${MIN[selI]}, ${MIN[(selI + 1) % 12]}.`), h('div.small.muted', 'Primary chords: I = ' + MAJ[selI] + ', IV = ' + MAJ[(selI + 11) % 12] + ', V = ' + MAJ[(selI + 1) % 12] + '. Moving clockwise adds a sharp; counter-clockwise adds a flat.')); }
        cv.addEventListener('click', (e) => { const b = cv.getBoundingClientRect(); const x = ((e.clientX - b.left) / b.width) * 520 - 260, y = ((e.clientY - b.top) / b.height) * 520 - 260; if (Math.hypot(x, y) < 110) return; selI = ((Math.round(((Math.atan2(y, x) + Math.PI / 2) / (Math.PI * 2)) * 12) % 12) + 12) % 12; const pc = NOTES.indexOf(MAJ[selI].replace('D♭', 'C#').replace('A♭', 'G#').replace('E♭', 'D#').replace('B♭', 'A#')); [0, 4, 7].forEach((x) => pluck(freq(60 + pc + x), 0, 1.4, 'triangle', 0.16)); draw(); });
        body.append(cv, info); draw();
      }
      /* ---------- ear training ---------- */
      function ear() {
        let cur = null, answered = false; const allowed = st.data.earSet || [0, 3, 4, 5, 7, 12];
        const msg = h('div', { style: { fontSize: '18px', fontWeight: 700, minHeight: '26px', textAlign: 'center' } }, 'Press ▶ to hear an interval');
        const score = h('div.muted', { style: { textAlign: 'center' } });
        const upd = () => { const e = st.data.ear; score.textContent = `Score ${e.right}/${e.total}${e.total ? ' (' + Math.round((e.right / e.total) * 100) + '%)' : ''} · streak ${e.streak || 0} · best streak ${e.best}`; };
        const play = () => { if (!cur) { const iv = allowed[Math.floor(Math.random() * allowed.length)]; const lo = 55 + Math.floor(Math.random() * 10); cur = { iv, lo, up: Math.random() < 0.8 }; answered = false; msg.textContent = 'Which interval is this?'; } const a = cur.up ? cur.lo : cur.lo + cur.iv, b = cur.up ? cur.lo + cur.iv : cur.lo; pluck(freq(a), 0, 0.9); pluck(freq(b), 0.7, 1.2); };
        const btns = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' } }, INTERVALS.map((n, i) => h('button.btn', { style: { padding: '10px', opacity: allowed.includes(i) ? 1 : 0.35 }, on: { click: (e) => { if (!cur || answered) return; answered = true; const ok = i === cur.iv; const E = st.data.ear; E.total++; if (ok) { E.right++; E.streak = (E.streak || 0) + 1; E.best = Math.max(E.best, E.streak); } else E.streak = 0; st.touch(); msg.textContent = ok ? '✅ Correct — ' + INTERVALS[cur.iv] : '❌ It was a ' + INTERVALS[cur.iv]; msg.style.color = ok ? 'var(--good)' : 'var(--bad)'; upd(); cur = null; setTimeout(() => { msg.style.color = ''; play(); }, ok ? 900 : 1800); } } }, n)));
        const setSel = h('div.row', { style: { flexWrap: 'wrap', gap: '4px' } }, h('span.small.muted', 'Practice set:'), [['Easy', [0, 3, 4, 5, 7, 12]], ['Medium', [2, 3, 4, 5, 7, 9, 12]], ['All', [...Array(13).keys()]]].map(([l, s]) => h('button.btn.sm', { on: { click: () => { st.data.earSet = s; st.touch(); render(); } } }, l)));
        body.append(h('div.card.col', { style: { gap: '12px' } }, msg, h('div.row', { style: { justifyContent: 'center' } }, h('button.btn.primary', { on: { click: play } }, '▶ Play / repeat')), btns, score, setSel)); upd();
      }
      render();
      return { unmount: () => cleanup && cleanup() };
    },
  });
})();
