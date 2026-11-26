// Generate solvable Sokoban levels: random rooms, reverse "pull" boxes from goals, verify with BFS push-solver.
let seed = +process.argv[2] || 7; const DENS = 0.2; const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const ri = (n) => Math.floor(rand() * n);
function room(w, hh) { const g = Array.from({ length: hh }, (_, y) => Array.from({ length: w }, (_, x) => (x === 0 || y === 0 || x === w - 1 || y === hh - 1 ? '#' : ' '))); const n = Math.floor(w * hh * DENS); for (let i = 0; i < n; i++) { const x = 1 + ri(w - 2), y = 1 + ri(hh - 2); g[y][x] = '#'; } return g; }
const D = [[1, 0], [-1, 0], [0, 1], [0, -1]];
function connected(g) { let s = null, cnt = 0; g.forEach((r, y) => r.forEach((c, x) => { if (c !== '#') { cnt++; s = s || [x, y]; } })); if (!s) return false; const seen = new Set([s + '']); const q = [s]; while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of D) { const k = [x + dx, y + dy] + ''; if (g[y + dy][x + dx] !== '#' && !seen.has(k)) { seen.add(k); q.push([x + dx, y + dy]); } } } return seen.size === cnt; }
function solve(g, boxes, player, goals, limit = 120000) {
  const W = g[0].length; const wall = (x, y) => g[y][x] === '#'; const gs = new Set(goals.map((p) => p + ''));
  // dead squares: non-goal corners
  const dead = new Set(); g.forEach((r, y) => r.forEach((c, x) => { if (c === '#' || gs.has([x, y] + '')) return; const h = wall(x - 1, y) || wall(x + 1, y), v = wall(x, y - 1) || wall(x, y + 1); if (h && v) dead.add([x, y] + ''); }));
  const key = (bx, p) => { const s = bx.map((b) => b[1] * W + b[0]).sort((a, b) => a - b).join(','); return s + '|' + p; };
  const reach = (bx, p) => { const bs = new Set(bx.map((b) => b + '')); const seen = new Set([p + '']); const q = [p]; let mn = p[1] * W + p[0]; while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of D) { const nx = x + dx, ny = y + dy, k = [nx, ny] + ''; if (!wall(nx, ny) && !bs.has(k) && !seen.has(k)) { seen.add(k); q.push([nx, ny]); mn = Math.min(mn, ny * W + nx); } } } return [seen, mn]; };
  const start = reach(boxes, player); const q = [[boxes, start[1], 0]]; const seen = new Set([key(boxes, start[1])]); let qi = 0;
  while (qi < q.length) { const [bx, pm, d] = q[qi++]; if (bx.every((b) => gs.has(b + ''))) return d; if (seen.size > limit) return -1; const p = [pm % W, Math.floor(pm / W)]; const [R] = reach(bx, p); const bs = new Set(bx.map((b) => b + ''));
    for (let i = 0; i < bx.length; i++) for (const [dx, dy] of D) { const [x, y] = bx[i]; if (!R.has([x - dx, y - dy] + '')) continue; const nx = x + dx, ny = y + dy; if (wall(nx, ny) || bs.has([nx, ny] + '') || dead.has([nx, ny] + '')) continue; const nb = bx.slice(); nb[i] = [nx, ny]; const nr = reach(nb, [x, y]); const k = key(nb, nr[1]); if (!seen.has(k)) { seen.add(k); q.push([nb, nr[1], d + 1]); } } }
  return -1;
}
function gen(w, hh, nb, pulls) {
  for (let tries = 0; tries < 400; tries++) {
    const g = room(w, hh); if (!connected(g)) continue; const free = []; g.forEach((r, y) => r.forEach((c, x) => c === ' ' && free.push([x, y]))); if (free.length < nb + 4) continue;
    const goals = []; while (goals.length < nb) { const f = free[ri(free.length)]; if (!goals.some((q) => q + '' === f + '')) goals.push(f); }
    let boxes = goals.map((p) => p.slice()); let pl = free[ri(free.length)]; if (boxes.some((b) => b + '' === pl + '')) continue;
    const occ = (x, y) => g[y][x] === '#' || boxes.some((b) => b[0] === x && b[1] === y);
    for (let i = 0; i < pulls; i++) { // random walk with pulls
      const [dx, dy] = D[ri(4)]; const nx = pl[0] + dx, ny = pl[1] + dy; if (occ(nx, ny)) continue; const bi = boxes.findIndex((b) => b[0] === pl[0] - dx && b[1] === pl[1] - dy); if (bi >= 0 && rand() < 0.6) boxes[bi] = [pl[0], pl[1]]; pl = [nx, ny]; }
    if (boxes.filter((b) => goals.some((q) => q + '' === b + '')).length > 0 && nb > 1 && rand() < 0.7) continue;
    if (boxes.every((b) => goals.some((q) => q + '' === b + ''))) continue;
    const d = solve(g, boxes, pl, goals); if (d < 0) continue;
    const out = g.map((r) => r.slice()); goals.forEach(([x, y]) => (out[y][x] = '.')); boxes.forEach(([x, y]) => (out[y][x] = out[y][x] === '.' ? '*' : '$')); out[pl[1]][pl[0]] = out[pl[1]][pl[0]] === '.' ? '+' : '@';
    return { map: out.map((r) => r.join('')), pushes: d };
  }
}
const specs = JSON.parse(process.argv[3]); const tries = +process.argv[4] || 12; const t0 = Date.now();
for (const [w, hh, nb, p] of specs) { let best = null; for (let k = 0; k < tries && Date.now() - t0 < 100000 * specs.length; k++) { const L = gen(w, hh, nb, p); if (L && (!best || L.pushes > best.pushes)) best = L; } if (best) console.log(JSON.stringify(best)); }
