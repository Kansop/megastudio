/* Minimal animated GIF encoder (LZW, global 256-colour palette via popularity + nearest match) */
(function () {
  function lzw(indices, minCode) {
    const out = []; let cur = 0, bits = 0; const write = (code, size) => { cur |= code << bits; bits += size; while (bits >= 8) { out.push(cur & 255); cur >>= 8; bits -= 8; } };
    const clear = 1 << minCode, eoi = clear + 1; let size = minCode + 1, next = eoi + 1; let dict = new Map();
    write(clear, size); let prefix = indices[0];
    for (let i = 1; i < indices.length; i++) { const k = indices[i]; const key = prefix * 4096 + k; const hit = dict.get(key);
      if (hit !== undefined) { prefix = hit; continue; }
      write(prefix, size); if (next < 4096) { dict.set(key, next++); if (next > 1 << size && size < 12) size++; } else { write(clear, size); dict = new Map(); size = minCode + 1; next = eoi + 1; }
      prefix = k; }
    write(prefix, size); write(eoi, size); if (bits > 0) out.push(cur & 255); return out;
  }
  /** frames: array of ImageData (same size). delay in ms. Transparent pixels (alpha<128) map to index 0. */
  MS.encodeGIF = function (frames, delay = 100, scale = 1) {
    const w0 = frames[0].width, h0 = frames[0].height, W = w0 * scale, H = h0 * scale;
    const counts = new Map(); frames.forEach((f) => { for (let i = 0; i < f.data.length; i += 4) if (f.data[i + 3] >= 128) { const c = ((f.data[i] >> 3) << 10) | ((f.data[i + 1] >> 3) << 5) | (f.data[i + 2] >> 3); counts.set(c, (counts.get(c) || 0) + 1); } });
    const pal = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 255).map(([c]) => [((c >> 10) & 31) << 3, ((c >> 5) & 31) << 3, (c & 31) << 3]);
    const palette = [[0, 0, 0], ...pal]; while (palette.length < 256) palette.push([0, 0, 0]);
    const cache = new Map(); const nearest = (r, g, b) => { const k = (r << 16) | (g << 8) | b; if (cache.has(k)) return cache.get(k); let best = 1, bd = 1e9; for (let i = 1; i <= pal.length; i++) { const p = palette[i]; const d = (p[0] - r) ** 2 + (p[1] - g) ** 2 + (p[2] - b) ** 2; if (d < bd) { bd = d; best = i; } } cache.set(k, best); return best; };
    const bytes = []; const u16 = (v) => bytes.push(v & 255, (v >> 8) & 255); const str = (s) => [...s].forEach((c) => bytes.push(c.charCodeAt(0)));
    str('GIF89a'); u16(W); u16(H); bytes.push(0xf7, 0, 0); palette.forEach((p) => bytes.push(...p));
    bytes.push(0x21, 0xff, 11); str('NETSCAPE2.0'); bytes.push(3, 1); u16(0); bytes.push(0);
    frames.forEach((f) => {
      bytes.push(0x21, 0xf9, 4, 0x09, 0, 0, 0, 0); bytes[bytes.length - 4] = Math.round(delay / 10) & 255; bytes[bytes.length - 3] = (Math.round(delay / 10) >> 8) & 255; bytes[bytes.length - 2] = 0;
      bytes.push(0x2c); u16(0); u16(0); u16(W); u16(H); bytes.push(0);
      const idx = new Uint8Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = ((((y / scale) | 0) * w0) + ((x / scale) | 0)) * 4; idx[y * W + x] = f.data[i + 3] < 128 ? 0 : nearest(f.data[i], f.data[i + 1], f.data[i + 2]); }
      bytes.push(8); const data = lzw(idx, 8); for (let i = 0; i < data.length; i += 255) { const chunk = data.slice(i, i + 255); bytes.push(chunk.length, ...chunk); } bytes.push(0);
    });
    bytes.push(0x3b); return new Blob([new Uint8Array(bytes)], { type: 'image/gif' });
  };
})();
