/* MS.ai: real on-device language models via WebLLM (WebGPU). Models download once from Hugging Face,
   are cached by the browser (Cache Storage), and run fully locally afterwards. */
(function () {
  const CDN = 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.89/+esm';
  const MODELS = [
    { key: 'smol', base: 'SmolLM2-360M-Instruct', name: 'SmolLM2 360M', note: 'Tiny & fast — basic chat', mem: [376, 580] },
    { key: 'qwen05', base: 'Qwen2.5-0.5B-Instruct', name: 'Qwen2.5 0.5B', note: 'Small default — quick, decent answers', mem: [945, 1060], def: true },
    { key: 'llama1', base: 'Llama-3.2-1B-Instruct', name: 'Llama 3.2 1B', note: 'Recommended for iPhone / phones', mem: [879, 1129], rec: true },
    { key: 'qwen15', base: 'Qwen2.5-1.5B-Instruct', name: 'Qwen2.5 1.5B', note: 'Smarter — laptops & newer phones', mem: [1630, 1889] },
    { key: 'llama3', base: 'Llama-3.2-3B-Instruct', name: 'Llama 3.2 3B', note: 'Best quality — needs a good GPU (~2 GB+)', mem: [2264, 2952] },
  ];
  const WORKER_URL = new URL('ai-worker.js', (document.currentScript && document.currentScript.src) || location.href);
  let lib = null, engine = null, current = null, loading = null, f16 = null, generating = false;
  async function gpuInfo() {
    if (!('gpu' in navigator)) return { ok: false, why: 'This browser has no WebGPU.' };
    try { const a = await navigator.gpu.requestAdapter(); if (!a) return { ok: false, why: 'WebGPU is present but no GPU adapter is available.' }; f16 = a.features.has('shader-f16'); return { ok: true, f16 }; } catch (e) { return { ok: false, why: 'WebGPU failed: ' + e.message }; }
  }
  const idFor = (m) => `${m.base}-${f16 === false ? 'q4f32_1' : 'q4f16_1'}-MLC`;
  const memFor = (m) => (f16 === false ? m.mem[1] : m.mem[0]);
  async function getLib() { if (!lib) lib = await import(CDN); return lib; }
  async function isCached(m) { try { await gpuInfo(); const L = await getLib(); return await L.hasModelInCache(idFor(m)); } catch { return false; } }
  async function load(m, onProgress = () => {}) {
    if (current === m.key && engine) return engine;
    if (loading) { await loading.catch(() => {}); if (current === m.key && engine) return engine; }
    loading = (async () => {
      const g = await gpuInfo(); if (!g.ok) throw new Error(g.why);
      const L = await getLib(); const id = idFor(m);
      const initProgressCallback = (p) => onProgress(p.progress ?? 0, p.text || '');
      if (engine) { try { await engine.unload(); } catch {} engine = null; current = null; }
      try { engine = await L.CreateWebWorkerMLCEngine(new Worker(WORKER_URL, { type: 'module' }), id, { initProgressCallback }); }
      catch (e) { if (/memory|device (was )?lost|quota/i.test(String(e?.message || e))) throw e; console.warn('WebLLM worker failed, retrying on main thread', e); engine = await L.CreateMLCEngine(id, { initProgressCallback }); }
      current = m.key; return engine;
    })();
    try { return await loading; } finally { loading = null; }
  }
  async function chat(messages, onToken, { temperature = 0.7, max_tokens = 768 } = {}) {
    if (!engine) throw new Error('No model loaded');
    generating = true; let text = '', usage = null;
    try {
      const stream = await engine.chat.completions.create({ messages, stream: true, temperature, max_tokens, stream_options: { include_usage: true } });
      for await (const chunk of stream) { const d = chunk.choices?.[0]?.delta?.content; if (d) { text += d; onToken(text); } if (chunk.usage) usage = chunk.usage; }
    } finally { generating = false; }
    return { text, usage };
  }
  function stop() { try { engine?.interruptGenerate(); } catch {} }
  async function remove(m) { const L = await getLib(); if (current === m.key) { try { await engine.unload(); } catch {} engine = null; current = null; } await L.deleteModelAllInfoInCache(idFor(m)); }
  /* ---------- writing assistant (used by Notes & Writer) ---------- */
  async function pickedModel() { const st = await MS.store('botchat', () => ({ chats: [], active: 'ai', state: {} })); const k = st.data.state?.ai?.model; return MODELS.find((m) => m.key === k) || MODELS.find((m) => m.def); }
  const ACTIONS = [['✨ Improve', 'Rewrite the text to be clearer and more engaging. Keep the meaning and roughly the same length.'], ['✅ Fix grammar', 'Fix spelling, grammar and punctuation. Change nothing else.'], ['📝 Summarize', 'Summarize the text as a few concise bullet points.'], ['✂️ Shorter', 'Make the text about half as long while keeping the key points.'], ['➕ Longer', 'Expand the text with more detail and examples.'], ['👔 Formal', 'Rewrite the text in a professional, formal tone.'], ['😊 Casual', 'Rewrite the text in a friendly, casual tone.'], ['➡️ Continue', 'Continue writing from where the text ends, in the same style. Output only the continuation.'], ['💡 Ideas', 'Brainstorm 5 ideas related to this text as a bulleted list.']];
  function assist({ text, onReplace, onInsert, title = 'AI writing assistant' }) {
    const { h } = MS; const out = h('div.md', { style: { minHeight: '120px', maxHeight: '45vh', overflow: 'auto', padding: '10px 12px', background: 'var(--panel2)', borderRadius: '10px', border: '1px solid var(--line)' } }, h('span.muted', text.trim() ? 'Pick an action — the AI runs on your device.' : 'Write or select some text first, or type an instruction below.'));
    const status = h('div.small.muted'); let result = '', running = false;
    const custom = h('input.input', { placeholder: 'Or type an instruction, e.g. "translate to Spanish"…', style: { flex: 1 }, on: { keydown: (e) => { if (e.key === 'Enter' && custom.value.trim()) run(custom.value.trim()); } } });
    async function run(instr) {
      if (running) return; running = true; result = ''; out.textContent = ''; actRow.style.opacity = 0.5;
      try {
        const g = await gpuInfo(); if (!g.ok) throw new Error(g.why + ' Real AI needs WebGPU (Chrome/Edge, or Safari on iOS/macOS 26+).');
        const m = await pickedModel();
        if (current !== m.key) { if (!(await isCached(m)) && !(await MS.confirm(`Download ${m.name}?`, 'One-time download, cached on this device for offline use. Change models in Bot Chat → Real AI.', 'Download'))) throw new Error('Model not downloaded.'); await load(m, (p, t) => (status.textContent = `${Math.round(p * 100)}% · ${t.replace(/\[.*?\]\s*/, '').slice(0, 90)}`)); }
        status.textContent = `🧠 ${m.name} is writing…`;
        const prompt = 'Instruction: ' + instr + '\n\nText:\n<<<\n' + text.slice(0, 6000) + '\n>>>';
        const r = await chat([{ role: 'system', content: 'You are a precise writing assistant. Follow the instruction and output only the resulting text, without preamble or quotes.' }, { role: 'user', content: prompt }], (t) => { result = t; out.innerHTML = MS.md(t); out.scrollTop = 1e9; }, { temperature: 0.5, max_tokens: 900 });
        result = r.text.trim(); status.textContent = `Done · ${m.name}`;
      } catch (e) { out.textContent = '⚠️ ' + (e.message || e); status.textContent = ''; }
      running = false; actRow.style.opacity = 1;
    }
    const actRow = h('div.row', { style: { flexWrap: 'wrap', gap: '6px' } }, ACTIONS.map(([l, instr]) => h('button.btn.sm', { on: { click: () => run(instr) } }, l)));
    const close = MS.modal(h('div.col.modal-wide', { style: { gap: '10px' } }, h('h2', '🧠 ' + title), actRow, h('div.row', custom, h('button.btn.sm', { on: { click: () => custom.value.trim() && run(custom.value.trim()) } }, 'Run')), out, status,
      h('div.row', { style: { flexWrap: 'wrap' } }, h('button.btn', { on: { click: () => { if (running) stop(); } } }, '■ Stop'), h('div.spacer'), h('button.btn', { on: { click: () => { if (result) { navigator.clipboard?.writeText(result); MS.toast('Copied'); } } } }, '📋 Copy'), onInsert ? h('button.btn', { on: { click: () => { if (result) { onInsert(result); close(); } } } }, '⤵ Insert below') : null, onReplace ? h('button.btn.primary', { on: { click: () => { if (result) { onReplace(result); close(); } } } }, '↺ Replace') : null)), { onClose: () => running && stop() });
  }
  MS.ai = { assist, pickedModel, MODELS, gpuInfo, load, chat, stop, remove, isCached, idFor, memFor, get current() { return current; }, get generating() { return generating; }, get loading() { return !!loading; } };
})();
