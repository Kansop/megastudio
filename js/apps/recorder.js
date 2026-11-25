/* Recorder: voice memos with live waveform, playback speed, trimming-free simple library, saved to Files */
(function () {
  const { h } = MS;
  MS.register({
    id: 'recorder', name: 'Recorder', icon: '🎙', group: 'Create', desc: 'Voice memos & audio notes', keywords: 'voice memo record audio microphone dictation podcast',
    async mount(view) {
      let rec = null, stream = null, chunks = [], ac = null, an = null, raf = null, t0 = 0;
      const wave = h('canvas', { width: 900, height: 160, style: { width: '100%', height: '160px', background: 'var(--panel2)', borderRadius: '14px' } });
      const timer = h('div', { style: { fontSize: '40px', fontWeight: 800, fontVariantNumeric: 'tabular-nums' } }, '00:00');
      const btn = h('button', { title: 'Record', style: { width: '84px', height: '84px', borderRadius: '50%', border: '6px solid var(--panel2)', background: '#ff3b5c', cursor: 'pointer', boxShadow: '0 0 0 2px #ff3b5c', fontSize: '28px', color: '#fff' }, on: { click: () => (rec ? stop() : start()) } }, '●');
      const list = h('div.col', { style: { gap: '8px' } });
      const supported = !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
      view.append(h('div.pad', { style: { maxWidth: '900px', margin: '0 auto' } }, h('div.card.col', { style: { alignItems: 'center', gap: '14px' } }, wave, timer, btn, h('div.small.muted', supported ? 'Click to start recording. Recordings are saved to Files › /Music.' : 'Recording is not supported in this browser.')), h('h3', 'Recordings'), list));
      const draw = () => { raf = requestAnimationFrame(draw); const g = wave.getContext('2d'); const W = wave.width, H = wave.height; g.clearRect(0, 0, W, H); const css = getComputedStyle(document.documentElement);
        if (!an) { g.strokeStyle = css.getPropertyValue('--line'); g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke(); return; }
        const d = new Uint8Array(an.fftSize); an.getByteTimeDomainData(d); g.lineWidth = 3; g.strokeStyle = '#ff3b5c'; g.beginPath(); d.forEach((v, i) => { const x = (i / d.length) * W, y = (v / 255) * H; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
        const s = Math.floor((Date.now() - t0) / 1000); timer.textContent = `${MS.pad(Math.floor(s / 60))}:${MS.pad(s % 60)}`; };
      async function start() {
        if (!supported) return MS.toast('Recording not supported here', 'bad');
        try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { return MS.toast('Microphone permission denied', 'bad'); }
        ac = new AudioContext(); an = ac.createAnalyser(); an.fftSize = 2048; ac.createMediaStreamSource(stream).connect(an);
        chunks = []; rec = new MediaRecorder(stream); rec.ondataavailable = (e) => e.data.size && chunks.push(e.data); rec.onstop = save; rec.start(); t0 = Date.now(); btn.textContent = '■'; btn.style.borderRadius = '22px';
      }
      function stop() { rec.stop(); stream.getTracks().forEach((t) => t.stop()); ac.close(); an = null; rec = null; btn.textContent = '●'; btn.style.borderRadius = '50%'; }
      async function save() { const blob = new Blob(chunks, { type: chunks[0]?.type || 'audio/webm' }); const dur = Math.round((Date.now() - t0) / 1000); const url = await MS.readDataURL(blob); const ext = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm';
        await MS.db.files.put({ id: MS.uid('f'), name: `Memo ${new Date().toLocaleString().replace(/[/:]/g, '-')}.${ext}`, type: blob.type.split(';')[0], folder: '/Music', size: blob.size, data: url, duration: dur, created: Date.now(), updated: Date.now() }); MS.toast(`Saved ${dur}s memo`, 'good'); timer.textContent = '00:00'; renderList(); }
      async function renderList() { const files = (await MS.db.files.all()).filter((f) => f.folder === '/Music' && f.type.startsWith('audio/')).sort((a, b) => b.created - a.created); list.innerHTML = '';
        if (!files.length) list.append(h('div.muted.small', 'No recordings yet.'));
        files.forEach((f) => { const audio = h('audio', { controls: true, src: URL.createObjectURL(MS.filesApi.dataToBlob(f)), style: { flex: 1, minWidth: '220px' } }); const speed = h('select.input', { on: { change: () => (audio.playbackRate = +speed.value) } }, [0.75, 1, 1.25, 1.5, 2].map((r) => h('option', { value: r, selected: r === 1 }, r + '×')));
          list.append(h('div.card.row', { style: { flexWrap: 'wrap' } }, h('div', { style: { minWidth: '180px' } }, h('strong', { style: { cursor: 'pointer' }, title: 'Rename', on: { click: async () => { const n = await MS.prompt('Rename', f.name); if (n) { f.name = n; await MS.db.files.put(f); renderList(); } } } }, f.name), h('div.small.muted', `${f.duration ? f.duration + 's · ' : ''}${(f.size / 1024).toFixed(0)} KB · ${MS.ago(f.created)}`)), audio, speed, h('button.btn.sm', { on: { click: () => MS.download(f.name, MS.filesApi.dataToBlob(f)) } }, '⬇'), h('button.btn.sm.danger', { on: { click: async () => { if (await MS.confirm('Delete recording?', f.name, 'Delete')) { await MS.db.files.del(f.id); renderList(); } } } }, '🗑'))); }); }
      draw(); renderList();
      return { unmount: () => { cancelAnimationFrame(raf); if (rec) stop(); } };
    },
  });
})();
