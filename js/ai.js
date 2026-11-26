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
      catch (e) { if (/worker/i.test(String(e))) engine = await L.CreateMLCEngine(id, { initProgressCallback }); else throw e; }
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
  MS.ai = { MODELS, gpuInfo, load, chat, stop, remove, isCached, idFor, memFor, get current() { return current; }, get generating() { return generating; }, get loading() { return !!loading; } };
})();
