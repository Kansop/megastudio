// Loads the app's chess engine in Node (for puzzle generation / validation)
import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url';
const root = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(root, 'js/apps/chess.js'), 'utf8');
const MS = { h: () => ({}), arcade: { GAMES: {}, report() {} }, command() {} };
new Function('MS', src)(MS);
export const E = MS.chessEngine;
export function fromFEN(fen) { const [pos, turn, cas, ep] = fen.split(' '); const b = []; for (const ch of pos.replace(/\//g, '')) { if (/\d/.test(ch)) for (let i = 0; i < +ch; i++) b.push(null); else b.push(ch); } const c = cas || '-'; return { b, turn: turn || 'w', castle: { K: c.includes('K'), Q: c.includes('Q'), k: c.includes('k'), q: c.includes('q') }, ep: ep && ep !== '-' ? ('abcdefgh'.indexOf(ep[0]) + (8 - +ep[1]) * 8) : -1, half: 0, hist: [] }; }
export function toFEN(st) { let s = ''; for (let r = 0; r < 8; r++) { let e = 0; for (let c = 0; c < 8; c++) { const p = st.b[r * 8 + c]; if (!p) e++; else { if (e) s += e; e = 0; s += p; } } if (e) s += e; if (r < 7) s += '/'; } const cs = ['K', 'Q', 'k', 'q'].filter((k) => st.castle[k]).join('') || '-'; return `${s} ${st.turn} ${cs} -`; }
export function mateIn(st, n) { // can side to move force mate within n moves?
  for (const m of E.legal(st)) { const s2 = E.make(st, m); const replies = E.legal(s2); if (!replies.length) { if (E.inCheck(s2)) return m; continue; } if (n > 1 && replies.every((r) => mateIn(E.make(s2, r), n - 1))) return m; }
  return null;
}
export const uci = (m) => 'abcdefgh'[m.f & 7] + (8 - (m.f >> 3)) + 'abcdefgh'[m.t & 7] + (8 - (m.t >> 3));
