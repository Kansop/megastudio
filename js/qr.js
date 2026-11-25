/* QR code encoder (byte mode, EC level M, versions 1–10) — returns a boolean matrix */
(function () {
  const EC = [null, [10, [[1, 16]]], [16, [[1, 28]]], [26, [[1, 44]]], [18, [[2, 32]]], [24, [[2, 43]]], [16, [[4, 27]]], [18, [[4, 31]]], [22, [[2, 38], [2, 39]]], [22, [[3, 36], [2, 37]]], [26, [[4, 43], [1, 44]]]];
  const ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
  const mul = (x, y) => { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; } return z & 255; };
  const divisor = (deg) => { const r = Array(deg).fill(0); r[deg - 1] = 1; let root = 1; for (let i = 0; i < deg; i++) { for (let j = 0; j < deg; j++) { r[j] = mul(r[j], root); if (j + 1 < deg) r[j] ^= r[j + 1]; } root = mul(root, 2); } return r; };
  const remainder = (data, div) => { const r = div.map(() => 0); for (const b of data) { const f = b ^ r.shift(); r.push(0); div.forEach((d, i) => (r[i] ^= mul(d, f))); } return r; };
  MS.qr = function (text) {
    const bytes = [...new TextEncoder().encode(text)];
    let ver = 1; for (; ver <= 10; ver++) { const cap = EC[ver][1].reduce((a, [n, k]) => a + n * k, 0); if (4 + (ver < 10 ? 8 : 16) + bytes.length * 8 <= cap * 8) break; }
    if (ver > 10) throw new Error('Text too long for QR (max ~210 bytes)');
    const [ecLen, groups] = EC[ver]; const cap = groups.reduce((a, [n, k]) => a + n * k, 0);
    const bits = []; const put = (v, n) => { for (let i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1); };
    put(4, 4); put(bytes.length, ver < 10 ? 8 : 16); bytes.forEach((b) => put(b, 8)); put(0, Math.min(4, cap * 8 - bits.length)); while (bits.length % 8) bits.push(0);
    const data = []; for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2)); for (let p = 0xec; data.length < cap; p ^= 0xec ^ 0x11) data.push(p);
    const blocks = []; let off = 0; const div = divisor(ecLen); groups.forEach(([n, k]) => { for (let i = 0; i < n; i++) { const d = data.slice(off, off + k); off += k; blocks.push({ d, e: remainder(d, div) }); } });
    const final = []; const maxD = Math.max(...blocks.map((b) => b.d.length)); for (let i = 0; i < maxD; i++) blocks.forEach((b) => i < b.d.length && final.push(b.d[i])); for (let i = 0; i < ecLen; i++) blocks.forEach((b) => final.push(b.e[i]));
    const size = ver * 4 + 17; const M = Array.from({ length: size }, () => Array(size).fill(false)); const F = Array.from({ length: size }, () => Array(size).fill(false));
    const set = (x, y, v) => { M[y][x] = v; F[y][x] = true; };
    for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    const finder = (cx, cy) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= size || y >= size) continue; const d = Math.max(Math.abs(dx), Math.abs(dy)); set(x, y, d !== 2 && d !== 4); } };
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
    const al = ALIGN[ver]; al.forEach((a, i) => al.forEach((b, j) => { if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) return; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(a + dx, b + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1); }));
    const formatBits = (mask) => { const d = (0 << 3) | mask; let r = d; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537); return ((d << 10) | r) ^ 0x5412; };
    const drawFormat = (mask) => { const b = formatBits(mask); const g = (i) => ((b >>> i) & 1) === 1;
      for (let i = 0; i <= 5; i++) set(8, i, g(i)); set(8, 7, g(6)); set(8, 8, g(7)); set(7, 8, g(8)); for (let i = 9; i < 15; i++) set(14 - i, 8, g(i));
      for (let i = 0; i < 8; i++) set(size - 1 - i, 8, g(i)); for (let i = 8; i < 15; i++) set(8, size - 15 + i, g(i)); set(8, size - 8, true); };
    drawFormat(0);
    if (ver >= 7) { let r = ver; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25); const b = (ver << 12) | r; for (let i = 0; i < 18; i++) { const v = ((b >>> i) & 1) === 1; const a = size - 11 + (i % 3), c = Math.floor(i / 3); set(a, c, v); set(c, a, v); } }
    let bi = 0; for (let right = size - 1; right >= 1; right -= 2) { if (right === 6) right = 5; for (let v = 0; v < size; v++) for (let j = 0; j < 2; j++) { const x = right - j; const up = ((right + 1) & 2) === 0; const y = up ? size - 1 - v : v; if (!F[y][x] && bi < final.length * 8) { M[y][x] = ((final[bi >>> 3] >>> (7 - (bi & 7))) & 1) === 1; bi++; } } }
    const MASKS = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0, (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0, (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0];
    const applyMask = (m) => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!F[y][x] && MASKS[m](x, y)) M[y][x] = !M[y][x]; };
    const penalty = () => { let p = 0; for (let k = 0; k < 2; k++) for (let a = 0; a < size; a++) { let run = 1; for (let b = 1; b < size; b++) { const c = k ? M[b][a] : M[a][b], pr = k ? M[b - 1][a] : M[a][b - 1]; if (c === pr) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1; } }
      for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) { const c = M[y][x]; if (c === M[y][x + 1] && c === M[y + 1][x] && c === M[y + 1][x + 1]) p += 3; }
      let dark = 0; M.forEach((r) => r.forEach((v) => v && dark++)); p += Math.floor(Math.abs((dark * 20) / (size * size) - 10)) * 10; return p; };
    let best = 0, bestP = Infinity; for (let m = 0; m < 8; m++) { applyMask(m); drawFormat(m); const p = penalty(); if (p < bestP) { bestP = p; best = m; } applyMask(m); }
    applyMask(best); drawFormat(best); return { size, modules: M, version: ver };
  };
  MS.qrCanvas = function (text, scale = 8, fg = '#000', bg = '#fff') { const q = MS.qr(text); const border = 4; const c = document.createElement('canvas'); c.width = c.height = (q.size + border * 2) * scale; const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); g.fillStyle = fg; q.modules.forEach((row, y) => row.forEach((v, x) => v && g.fillRect((x + border) * scale, (y + border) * scale, scale, scale))); c.qrVersion = q.version; return c; };
})();
