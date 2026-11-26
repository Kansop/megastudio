/* Piano: playable 3-octave keyboard (mouse, touch, computer keys, Web MIDI), song tutor with falling notes
   (wait/play modes, accuracy scoring), recording & playback, sustain and 4 instrument voices */
(function () {
  const { h } = MS;
  const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const isBlack = (m) => [1, 3, 6, 8, 10].includes(m % 12);
  const nm = (m) => NAMES[m % 12] + (Math.floor(m / 12) - 1);
  const parseN = (s) => { const m = s.match(/^([A-G]#?)(\d)$/); return NAMES.indexOf(m[1]) + (+m[2] + 1) * 12; };
  // songs: "note:beats" tokens, R = rest
  const SONGS = [
    ['Twinkle Twinkle Little Star', 100, 'C4 C4 G4 G4 A4 A4 G4:2 F4 F4 E4 E4 D4 D4 C4:2 G4 G4 F4 F4 E4 E4 D4:2 G4 G4 F4 F4 E4 E4 D4:2 C4 C4 G4 G4 A4 A4 G4:2 F4 F4 E4 E4 D4 D4 C4:2'],
    ['Ode to Joy (Beethoven)', 110, 'E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4:1.5 D4:0.5 D4:2 E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 D4:1.5 C4:0.5 C4:2'],
    ['Mary Had a Little Lamb', 110, 'E4 D4 C4 D4 E4 E4 E4:2 D4 D4 D4:2 E4 G4 G4:2 E4 D4 C4 D4 E4 E4 E4 E4 D4 D4 E4 D4 C4:4'],
    ['Happy Birthday', 100, 'C4:0.75 C4:0.25 D4 C4 F4 E4:2 C4:0.75 C4:0.25 D4 C4 G4 F4:2 C4:0.75 C4:0.25 C5 A4 F4 E4 D4:2 A#4:0.75 A#4:0.25 A4 F4 G4 F4:2'],
    ['Jingle Bells', 140, 'E4 E4 E4:2 E4 E4 E4:2 E4 G4 C4:1.5 D4:0.5 E4:4 F4 F4 F4:1.5 F4:0.5 F4 E4 E4 E4:0.5 E4:0.5 E4 D4 D4 E4 D4:2 G4:2'],
    ['Für Elise (opening)', 120, 'E5:0.5 D#5:0.5 E5:0.5 D#5:0.5 E5:0.5 B4:0.5 D5:0.5 C5:0.5 A4 R:0.5 C4:0.5 E4:0.5 A4:0.5 B4 R:0.5 E4:0.5 G#4:0.5 B4:0.5 C5 R:0.5 E4:0.5 E5:0.5 D#5:0.5 E5:0.5 D#5:0.5 E5:0.5 B4:0.5 D5:0.5 C5:0.5 A4:2'],
    ['C major scale', 120, 'C4 D4 E4 F4 G4 A4 B4 C5 C5 B4 A4 G4 F4 E4 D4 C4:2'],
    ['Canon in D (melody)', 80, 'F#5:2 E5:2 D5:2 C#5:2 B4:2 A4:2 B4:2 C#5:2 D5:2 C#5:2 B4:2 A4:2 G4:2 F#4:2 G4:2 E4:2'],
  ];
  const parseSong = (s) => { let t = 0; return s.split(/\s+/).map((tok) => { const [n, b] = tok.split(':'); const d = +(b || 1); const o = { m: n === 'R' ? null : parseN(n), t, d }; t += d; return o; }).filter((o) => o.m != null); };
  const KEYMAP = 'awsedftgyhujkolp;\''; // from C4
  const VOICES = { Piano: { type: 'triangle', a: 0.005, d: 1.6, harm: [[2, 0.35], [3, 0.12], [4, 0.06]] }, 'E-Piano': { type: 'sine', a: 0.005, d: 1.2, harm: [[2, 0.5], [7, 0.04]] }, Organ: { type: 'sine', a: 0.02, d: 0, harm: [[2, 0.6], [3, 0.4], [4, 0.25], [8, 0.15]] }, Synth: { type: 'sawtooth', a: 0.01, d: 0.8, harm: [[1.005, 0.6]] } };

  MS.register({
    id: 'piano', name: 'Piano', icon: '🎹', group: 'Create', desc: 'Playable piano with falling-notes song tutor', keywords: 'piano keyboard music learn songs midi synthesia tutor play notes record',
    async mount(view) {
      const st = await MS.store('piano', () => ({ voice: 'Piano', labels: true, best: {}, recs: [] }));
      let AC, master; const ac = () => { if (!AC) { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = 0.5; const comp = AC.createDynamicsCompressor(); master.connect(comp).connect(AC.destination); } if (AC.state === 'suspended') AC.resume(); return AC; };
      const live = {}; let sustain = false; const sustained = new Set();
      function noteOn(m, vel = 0.8, fromSong = false) {
        const a = ac(); if (live[m]) noteOff(m, true); const v = VOICES[st.data.voice]; const f = 440 * 2 ** ((m - 69) / 12); const t = a.currentTime;
        const g = a.createGain(); g.connect(master); const oscs = [];
        [[1, 1], ...v.harm].forEach(([mul, amp]) => { const o = a.createOscillator(); o.type = mul === 1 ? v.type : 'sine'; o.frequency.value = f * mul; const og = a.createGain(); og.gain.value = amp * 0.3 * vel; o.connect(og).connect(g); o.start(t); oscs.push(o); });
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + v.a); if (v.d) g.gain.exponentialRampToValueAtTime(0.05, t + v.a + v.d * (1 - (m - 48) / 80));
        live[m] = { g, oscs }; keyEl(m)?.classList.add('pk-down'); if (!fromSong) onUserNote(m); if (recording) recBuf.push({ m, t: performance.now() - recStart, on: true });
      }
      function noteOff(m, force) {
        if (!live[m]) return; if (sustain && !force) { sustained.add(m); return; } const a = ac(); const { g, oscs } = live[m]; const t = a.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25); oscs.forEach((o) => o.stop(t + 0.3)); delete live[m]; keyEl(m)?.classList.remove('pk-down'); if (recording) recBuf.push({ m, t: performance.now() - recStart, on: false });
      }
      // ----- layout -----
      const LO = 48, HI = 84; // C3..C6
      const kb = h('div', { style: { position: 'relative', height: '170px', userSelect: 'none', touchAction: 'none', margin: '0 auto', width: '100%', maxWidth: '1000px' } });
      const whites = []; for (let m = LO; m <= HI; m++) if (!isBlack(m)) whites.push(m); const ww = 100 / whites.length;
      const keyEls = {}; const keyEl = (m) => keyEls[m];
      whites.forEach((m, i) => { const el = h('div.pk.pk-w', { style: { left: i * ww + '%', width: ww + '%' } }, h('span.pk-l', nm(m).replace(/\d/, (d) => (m % 12 === 0 ? d : '')))); el.dataset.m = m; keyEls[m] = el; kb.append(el); });
      for (let m = LO; m <= HI; m++) if (isBlack(m)) { const i = whites.indexOf(m - 1); const el = h('div.pk.pk-b', { style: { left: (i + 1) * ww - ww * 0.32 + '%', width: ww * 0.64 + '%' } }); el.dataset.m = m; keyEls[m] = el; kb.append(el); }
      const pointers = {};
      const at = (e) => { const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('.pk'); return el ? +el.dataset.m : null; };
      kb.addEventListener('pointerdown', (e) => { e.preventDefault(); kb.setPointerCapture(e.pointerId); const m = at(e); if (m != null) { pointers[e.pointerId] = m; noteOn(m); } });
      kb.addEventListener('pointermove', (e) => { if (!(e.pointerId in pointers)) return; const m = at(e); if (m !== pointers[e.pointerId]) { noteOff(pointers[e.pointerId]); pointers[e.pointerId] = m; if (m != null) noteOn(m); } });
      const up = (e) => { if (e.pointerId in pointers) { noteOff(pointers[e.pointerId]); delete pointers[e.pointerId]; } }; kb.addEventListener('pointerup', up); kb.addEventListener('pointercancel', up);
      let octShift = 0; const held = {};
      const kd = (e) => { if (e.repeat || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return; if (e.key === ' ') { e.preventDefault(); sustain = true; return; } if (e.key === 'z') { octShift = Math.max(-12, octShift - 12); return; } if (e.key === 'x') { octShift = Math.min(12, octShift + 12); return; } const i = KEYMAP.indexOf(e.key.toLowerCase()); if (i < 0) return; const m = 60 + i + octShift; held[e.key.toLowerCase()] = m; noteOn(m); };
      const ku = (e) => { if (e.key === ' ') { sustain = false; sustained.forEach((m) => noteOff(m, true)); sustained.clear(); return; } const m = held[e.key.toLowerCase()]; if (m != null) { delete held[e.key.toLowerCase()]; noteOff(m); } };
      document.addEventListener('keydown', kd); document.addEventListener('keyup', ku);
      let midi = null; const midiEl = h('span.small.muted');
      navigator.requestMIDIAccess?.().then((acc) => { midi = acc; const hook = () => { let n = 0; acc.inputs.forEach((inp) => { n++; inp.onmidimessage = (ev) => { const [s, d1, d2] = ev.data; const cmd = s & 0xf0; if (cmd === 0x90 && d2) noteOn(d1, d2 / 127); else if (cmd === 0x80 || (cmd === 0x90 && !d2)) noteOff(d1); else if (cmd === 0xb0 && d1 === 64) { sustain = d2 >= 64; if (!sustain) { sustained.forEach((m) => noteOff(m, true)); sustained.clear(); } } }; }); midiEl.textContent = n ? `🎛 ${n} MIDI device${n > 1 ? 's' : ''}` : ''; }; hook(); acc.onstatechange = hook; }).catch(() => {});

      // ----- song tutor -----
      const roll = h('canvas', { style: { width: '100%', height: '260px', display: 'block', borderRadius: '12px 12px 0 0', background: '#0e1020' } }); const rg = roll.getContext('2d');
      let song = null, notes = [], mode = 'wait', tempo = 1, songT = 0, playing = false, hits = 0, misses = 0, waitingIdx = -1, lastFrame = 0, combo = 0, autoplay = false, raf;
      const statEl = h('span.small'); const songSel = h('select.input', h('option', { value: '' }, '🎵 Pick a song to learn…'), ...SONGS.map(([n], i) => h('option', { value: i }, n)));
      function loadSong(i) { song = SONGS[i]; notes = parseSong(song[2]).map((n) => ({ ...n, hit: false, missed: false, played: false })); songT = -2; hits = misses = combo = 0; playing = false; waitingIdx = -1; updStat(); }
      songSel.onchange = () => { if (songSel.value !== '') { loadSong(+songSel.value); playBtn.textContent = '▶ Start'; } };
      const beatSec = () => 60 / (song ? song[1] : 100) / tempo;
      function onUserNote(m) {
        if (!song || !playing) return;
        if (mode === 'wait') { const n = notes[waitingIdx]; if (n && n.m === m) { n.hit = true; hits++; combo++; waitingIdx = -1; } else if (n) { misses++; combo = 0; flash(m); } }
        else { const now = songT; const n = notes.find((x) => !x.hit && !x.missed && x.m === m && Math.abs(x.t - now) * beatSec() < 0.25); if (n) { n.hit = true; hits++; combo++; } else { misses++; combo = 0; flash(m); } }
        updStat();
      }
      const flash = (m) => { const el = keyEl(m); if (!el) return; el.classList.add('pk-bad'); setTimeout(() => el.classList.remove('pk-bad'), 250); };
      function updStat() { if (!song) { statEl.textContent = 'Play freely, or pick a song.'; return; } const acc = hits + misses ? Math.round(hits / (hits + misses) * 100) : 100; statEl.textContent = `✅ ${hits}/${notes.length} · 🎯 ${acc}% accuracy · 🔥 ${combo}`; }
      function frame(ts) {
        raf = requestAnimationFrame(frame); const dt = Math.min(0.05, (ts - (lastFrame || ts)) / 1000); lastFrame = ts;
        const W = roll.clientWidth, H = roll.clientHeight; if (roll.width !== W * devicePixelRatio) { roll.width = W * devicePixelRatio; roll.height = H * devicePixelRatio; } rg.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0); rg.clearRect(0, 0, W, H);
        const xOf = (m) => { const el = keyEls[m]; if (!el) return null; const kbR = kb.getBoundingClientRect(), r = el.getBoundingClientRect(), rr = roll.getBoundingClientRect(); return [r.left - rr.left, r.width]; };
        // lane guides
        rg.fillStyle = 'rgba(255,255,255,.03)'; whites.forEach((m, i) => { if (i % 2) { const x = xOf(m); if (x) rg.fillRect(x[0], 0, x[1], H); } });
        if (song && playing) {
          if (mode === 'wait') { const next = notes.find((n) => !n.hit); if (!next) finish(); else { if (songT < next.t || autoplay) songT += dt / beatSec(); if (songT >= next.t) { songT = next.t; waitingIdx = notes.indexOf(next); if (autoplay && !next.played) { next.played = true; noteOn(next.m, 0.8, true); setTimeout(() => noteOff(next.m), next.d * beatSec() * 900); next.hit = true; hits++; waitingIdx = -1; updStat(); } } } }
          else { songT += dt / beatSec(); notes.forEach((n) => { if (!n.hit && !n.missed && (songT - n.t) * beatSec() > 0.3) { n.missed = true; misses++; combo = 0; updStat(); } if (autoplay && !n.played && songT >= n.t) { n.played = true; noteOn(n.m, 0.8, true); setTimeout(() => noteOff(n.m), n.d * beatSec() * 900); n.hit = true; hits++; updStat(); } }); if (notes.every((n) => n.hit || n.missed)) finish(); }
        }
        const pxPerBeat = 70; const hitY = H - 6;
        if (song) notes.forEach((n) => { const x = xOf(n.m); if (!x) return; const y1 = hitY - (n.t - songT) * pxPerBeat, y0 = y1 - n.d * pxPerBeat + 3; if (y1 < -10 || y0 > H) return; const blk = isBlack(n.m); rg.fillStyle = n.hit ? '#22c55e' : n.missed ? '#ef4444' : blk ? '#a78bfa' : '#60a5fa'; rg.globalAlpha = n.hit ? 0.45 : 1; rg.beginPath(); rg.roundRect(x[0] + 2, y0, x[1] - 4, Math.max(6, y1 - y0), 6); rg.fill(); rg.globalAlpha = 1; if (st.data.labels && y1 - y0 > 16) { rg.fillStyle = '#fff'; rg.font = 'bold 11px system-ui'; rg.textAlign = 'center'; rg.fillText(NAMES[n.m % 12], x[0] + x[1] / 2, y1 - 6); } });
        rg.fillStyle = 'rgba(255,255,255,.5)'; rg.fillRect(0, hitY, W, 2);
        if (song && mode === 'wait' && waitingIdx >= 0) { const x = xOf(notes[waitingIdx].m); if (x) { rg.fillStyle = `rgba(250,204,21,${0.4 + Math.sin(ts / 150) * 0.3})`; rg.fillRect(x[0], hitY - 4, x[1], 8); } }
        if (!song) { rg.fillStyle = 'rgba(255,255,255,.55)'; rg.font = '15px system-ui'; rg.textAlign = 'center'; rg.fillText('Pick a song — notes fall onto the keys to play', Math.min(W, (roll.parentElement.parentElement.clientWidth || W)) / 2 + (roll.parentElement.parentElement.scrollLeft || 0), H / 2); }
        // live key glow
        Object.keys(live).forEach((m) => { const x = xOf(+m); if (x) { const gr = rg.createLinearGradient(0, H - 60, 0, H); gr.addColorStop(0, 'rgba(124,92,255,0)'); gr.addColorStop(1, 'rgba(124,92,255,.6)'); rg.fillStyle = gr; rg.fillRect(x[0], H - 60, x[1], 60); } });
      }
      function finish() { if (!playing) return; playing = false; const acc = Math.round(hits / Math.max(1, hits + misses) * 100); const stars = acc >= 95 ? 3 : acc >= 80 ? 2 : 1; if (!autoplay) { const k = song[0] + '|' + mode; st.data.best[k] = Math.max(st.data.best[k] || 0, acc); st.touch(); } MS.toast(`${autoplay ? '🎧 Demo finished' : `🎉 ${'⭐'.repeat(stars)} ${acc}% accuracy`}`, 'good'); playBtn.textContent = '↺ Again'; updStat(); }
      const playBtn = h('button.btn.primary', { on: { click: () => { if (!song) return MS.toast('Pick a song first'); if (playing) { playing = false; playBtn.textContent = '▶ Resume'; return; } if (notes.every((n) => n.hit || n.missed)) loadSong(SONGS.indexOf(song)); ac(); autoplay = false; playing = true; playBtn.textContent = '⏸ Pause'; } } }, '▶ Start');
      const demoBtn = h('button.btn', { on: { click: () => { if (!song) return MS.toast('Pick a song first'); loadSong(SONGS.indexOf(song)); ac(); autoplay = true; playing = true; playBtn.textContent = '⏸ Pause'; } } }, '🎧 Listen');
      const modeSel = h('select.input', { style: { width: 'auto' }, on: { change: () => (mode = modeSel.value) } }, h('option', { value: 'wait' }, '⏳ Wait for me'), h('option', { value: 'play' }, '⏱ Real time'));
      const tempoSel = h('select.input', { style: { width: 'auto' }, on: { change: () => (tempo = +tempoSel.value) } }, [[0.5, '50%'], [0.75, '75%'], [1, '100%'], [1.25, '125%']].map(([v, l]) => h('option', { value: v, selected: v === 1 }, '🐢 ' + l)));
      // ----- recorder -----
      let recording = false, recStart = 0, recBuf = [];
      const recBtn = h('button.btn', { on: { click: () => { if (!recording) { recording = true; recBuf = []; recStart = performance.now(); recBtn.textContent = '⏹ Stop'; recBtn.style.color = 'var(--bad)'; } else { recording = false; recBtn.textContent = '⏺ Record'; recBtn.style.color = ''; if (recBuf.length) { st.data.recs.unshift({ id: MS.uid('r'), name: 'Take ' + (st.data.recs.length + 1), ev: recBuf, d: new Date().toLocaleString() }); st.data.recs = st.data.recs.slice(0, 12); st.touch(); renderRecs(); MS.toast('Saved recording'); } } } } }, '⏺ Record');
      const recList = h('div.row', { style: { flexWrap: 'wrap', gap: '6px' } });
      function renderRecs() { recList.innerHTML = ''; st.data.recs.forEach((r) => recList.append(h('span.tag', { style: { display: 'inline-flex', gap: '6px', alignItems: 'center' } }, h('span', { style: { cursor: 'pointer' }, on: { click: () => { ac(); r.ev.forEach((e) => setTimeout(() => (e.on ? noteOn(e.m, 0.8, true) : noteOff(e.m)), e.t)); } } }, '▶ ' + r.name), h('span', { style: { cursor: 'pointer' }, title: 'Download MIDI', on: { click: () => MS.download(r.name + '.mid', toMidi(r.ev), 'audio/midi') } }, '⬇'), h('span', { style: { cursor: 'pointer' }, on: { click: () => { st.data.recs = st.data.recs.filter((x) => x !== r); st.touch(); renderRecs(); } } }, '✕')))); }
      function toMidi(ev) { const bytes = []; const vlq = (n) => { const out = [n & 0x7f]; while ((n >>= 7)) out.unshift((n & 0x7f) | 0x80); return out; }; let last = 0; ev.forEach((e) => { const tick = Math.round(e.t * 0.96); bytes.push(...vlq(Math.max(0, tick - last)), e.on ? 0x90 : 0x80, e.m, e.on ? 90 : 0); last = tick; }); bytes.push(0, 0xff, 0x2f, 0); const head = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 1, 0xe0]; const len = bytes.length; return new Uint8Array([...head, 0x4d, 0x54, 0x72, 0x6b, (len >>> 24) & 255, (len >>> 16) & 255, (len >>> 8) & 255, len & 255, ...bytes]); }
      const voiceSel = h('select.input', { style: { width: 'auto' }, on: { change: () => { st.data.voice = voiceSel.value; st.touch(); } } }, Object.keys(VOICES).map((v) => h('option', { selected: v === st.data.voice }, v)));
      const sus = h('button.btn', { on: { click: () => { sustain = !sustain; sus.classList.toggle('on', sustain); if (!sustain) { sustained.forEach((m) => noteOff(m, true)); sustained.clear(); } } } }, '🦶 Sustain');
      view.append(h('div.pad.col', { style: { gap: '10px', maxWidth: '1040px', margin: '0 auto' } },
        h('div.row', { style: { flexWrap: 'wrap' } }, songSel, modeSel, tempoSel, playBtn, demoBtn, h('div.spacer'), statEl),
        h('div', { style: { borderRadius: '12px', overflowX: 'auto', overflowY: 'hidden', boxShadow: 'var(--shadow)', background: '#0e1020' } }, h('div', { style: { minWidth: '640px' } }, roll, h('div', { style: { padding: '0 0 8px' } }, kb))),
        h('div.row', { style: { flexWrap: 'wrap' } }, voiceSel, sus, recBtn, h('label.row', { style: { gap: '6px' } }, h('input', { type: 'checkbox', checked: st.data.labels, on: { change: (e) => { st.data.labels = e.target.checked; st.touch(); kb.classList.toggle('pk-nolabel', !e.target.checked); } } }), 'Note names'), midiEl, h('div.spacer'), h('span.small.muted', 'Keys: A W S E D F T G Y H U J K = C4…C5 · Z/X octave · Space = sustain')), recList));
      kb.classList.toggle('pk-nolabel', !st.data.labels);
      renderRecs(); updStat(); raf = requestAnimationFrame(frame);
      return { unmount() { cancelAnimationFrame(raf); document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku); Object.keys(live).forEach((m) => noteOff(+m, true)); midi && midi.inputs.forEach((i) => (i.onmidimessage = null)); AC && AC.close(); } };
    },
  });
})();
