// Generates mate-in-1/2/3 puzzles by engine self-play, validated with an exhaustive mate search.
import fs from 'node:fs'; import { E, toFEN, mateIn, uci } from './chess-lib.mjs';
const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const mat = (b) => b.reduce((a, p) => a + (p ? (p === p.toUpperCase() ? 1 : -1) * VAL[p.toLowerCase()] : 0), 0);
const out = { 1: new Map(), 2: new Map(), 3: new Map() }; const want = { 1: +process.argv[2] || 120, 2: +process.argv[3] || 120, 3: +process.argv[4] || 30 };
const deadline = Date.now() + (+process.argv[5] || 300) * 1000;
const checks = (st) => E.legal(st).filter((m) => E.inCheck(E.make(st, m)));
function mate3checks(st) { // mate in 3 where every attacking move is a check (keeps search cheap)
  for (const m of checks(st)) { const s2 = E.make(st, m); const rs = E.legal(s2); if (!rs.length) continue; if (rs.every((r) => { const s3 = E.make(s2, r); for (const m2 of checks(s3)) { const s4 = E.make(s3, m2); const r2 = E.legal(s4); if (!r2.length) { if (E.inCheck(s4)) return true; continue; } if (r2.every((x) => { const s5 = E.make(s4, x); return E.legal(s5).some((m3) => { const s6 = E.make(s5, m3); return !E.legal(s6).length && E.inCheck(s6); }); })) return true; } return false; })) return m; }
  return null;
}
let games = 0;
while (Date.now() < deadline && (out[1].size < want[1] || out[2].size < want[2] || out[3].size < want[3])) {
  let st = E.initial(); games++;
  for (let ply = 0; ply < 160; ply++) {
    const ls = E.legal(st); if (!ls.length) break;
    if (ply >= 10 && st.b.filter(Boolean).length >= 7) {
      const fen = toFEN(st); const md = mat(st.b) * (st.turn === 'w' ? 1 : -1);
      if (md <= 6) {
        const m1 = mateIn(st, 1);
        if (m1) { if (out[1].size < want[1]) out[1].set(fen, uci(m1)); }
        else if (out[2].size < want[2] || out[3].size < want[3]) {
          const m2 = mateIn(st, 2);
          if (m2) { if (out[2].size < want[2]) out[2].set(fen, uci(m2)); }
          else if (out[3].size < want[3]) { const m3 = mate3checks(st); if (m3) out[3].set(fen, uci(m3)); }
        }
      }
    }
    const depth = Math.random() < 0.15 ? 1 : 2; let m = E.best(st, depth); if (Math.random() < 0.08) m = ls[Math.floor(Math.random() * ls.length)];
    st = E.make(st, m); if (st.half >= 60) break;
  }
  if (games % 10 === 0) console.error(games, out[1].size, out[2].size, out[3].size);
}
fs.writeFileSync(process.argv[6] || '/tmp/puzzles.json', JSON.stringify({ 1: [...out[1]], 2: [...out[2]], 3: [...out[3]] }));
console.log('games', games, out[1].size, out[2].size, out[3].size);
