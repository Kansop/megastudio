/* Chess: full rules (castling, en passant, promotion, check/mate/stalemate) + alpha-beta AI */
(function () {
  const { h } = MS; const { GAMES, report } = MS.arcade;
  const GLYPH = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙', k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
  const PST_P = [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0];
  const PST_N = [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50];
  const isW = (p) => p && p === p.toUpperCase();
  const side = (p) => (p ? (isW(p) ? 'w' : 'b') : null);
  function initial() { const b = Array(64).fill(null); 'rnbqkbnr'.split('').forEach((p, i) => { b[i] = p; b[56 + i] = p.toUpperCase(); b[8 + i] = 'p'; b[48 + i] = 'P'; }); return { b, turn: 'w', castle: { K: true, Q: true, k: true, q: true }, ep: -1, half: 0, hist: [] }; }
  function attacked(b, sq, by) {
    const r = sq >> 3, c = sq & 7; const at = (rr, cc) => (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 ? b[rr * 8 + cc] : undefined);
    const pd = by === 'w' ? 1 : -1; for (const dc of [-1, 1]) { const p = at(r + pd, c + dc); if (p === (by === 'w' ? 'P' : 'p')) return true; }
    for (const [dr, dc] of [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]) { const p = at(r + dr, c + dc); if (p === (by === 'w' ? 'N' : 'n')) return true; }
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { const p = at(r + dr, c + dc); if (p === (by === 'w' ? 'K' : 'k')) return true; }
    for (const [dr, dc, kinds] of [[1, 0, 'rq'], [-1, 0, 'rq'], [0, 1, 'rq'], [0, -1, 'rq'], [1, 1, 'bq'], [1, -1, 'bq'], [-1, 1, 'bq'], [-1, -1, 'bq']]) { let rr = r + dr, cc = c + dc; while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) { const p = b[rr * 8 + cc]; if (p) { if (side(p) === by && kinds.includes(p.toLowerCase())) return true; break; } rr += dr; cc += dc; } }
    return false;
  }
  function pseudo(st) {
    const { b, turn } = st; const mv = []; const push = (f, t, extra = {}) => mv.push({ f, t, ...extra });
    for (let sq = 0; sq < 64; sq++) { const p = b[sq]; if (!p || side(p) !== turn) continue; const r = sq >> 3, c = sq & 7; const k = p.toLowerCase();
      const slide = (dirs, one) => { for (const [dr, dc] of dirs) { let rr = r + dr, cc = c + dc; while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) { const t = rr * 8 + cc; if (b[t]) { if (side(b[t]) !== turn) push(sq, t); break; } push(sq, t); if (one) break; rr += dr; cc += dc; } } };
      if (k === 'p') { const d = turn === 'w' ? -1 : 1, start = turn === 'w' ? 6 : 1, last = turn === 'w' ? 0 : 7; const t1 = sq + d * 8;
        if (r + d >= 0 && r + d < 8 && !b[t1]) { push(sq, t1, r + d === last ? { promo: 'q' } : {}); if (r === start && !b[t1 + d * 8]) push(sq, t1 + d * 8, { double: true }); }
        for (const dc of [-1, 1]) { const cc = c + dc; if (cc < 0 || cc > 7 || r + d < 0 || r + d > 7) continue; const t = (r + d) * 8 + cc; if (b[t] && side(b[t]) !== turn) push(sq, t, r + d === last ? { promo: 'q' } : {}); else if (t === st.ep) push(sq, t, { epCap: t - d * 8 }); } }
      else if (k === 'n') slide([[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]], true);
      else if (k === 'b') slide([[1, 1], [1, -1], [-1, 1], [-1, -1]]);
      else if (k === 'r') slide([[1, 0], [-1, 0], [0, 1], [0, -1]]);
      else if (k === 'q') slide([[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]);
      else if (k === 'k') { slide([[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]], true); const opp = turn === 'w' ? 'b' : 'w'; const home = turn === 'w' ? 60 : 4;
        if (sq === home && !attacked(b, home, opp)) { const [KS, QS] = turn === 'w' ? ['K', 'Q'] : ['k', 'q'];
          if (st.castle[KS] && !b[home + 1] && !b[home + 2] && !attacked(b, home + 1, opp) && !attacked(b, home + 2, opp)) push(sq, home + 2, { castle: 'K' });
          if (st.castle[QS] && !b[home - 1] && !b[home - 2] && !b[home - 3] && !attacked(b, home - 1, opp) && !attacked(b, home - 2, opp)) push(sq, home - 2, { castle: 'Q' }); } } }
    return mv;
  }
  function make(st, m) {
    const b = st.b.slice(); const p = b[m.f]; const cap = m.epCap != null ? b[m.epCap] : b[m.t]; const castle = { ...st.castle };
    b[m.t] = m.promo ? (isW(p) ? m.promo.toUpperCase() : m.promo) : p; b[m.f] = null; if (m.epCap != null) b[m.epCap] = null;
    if (m.castle) { const home = m.f; if (m.castle === 'K') { b[home + 1] = b[home + 3]; b[home + 3] = null; } else { b[home - 1] = b[home - 4]; b[home - 4] = null; } }
    if (p === 'K') castle.K = castle.Q = false; if (p === 'k') castle.k = castle.q = false;
    [[63, 'K'], [56, 'Q'], [7, 'k'], [0, 'q']].forEach(([sq, k]) => { if (m.f === sq || m.t === sq) castle[k] = false; });
    return { b, turn: st.turn === 'w' ? 'b' : 'w', castle, ep: m.double ? (m.f + m.t) / 2 : -1, half: p.toLowerCase() === 'p' || cap ? 0 : st.half + 1, hist: st.hist, cap };
  }
  const kingSq = (b, s) => b.indexOf(s === 'w' ? 'K' : 'k');
  const inCheck = (st, s = st.turn) => attacked(st.b, kingSq(st.b, s), s === 'w' ? 'b' : 'w');
  const legal = (st) => pseudo(st).filter((m) => { const n = make(st, m); return !attacked(n.b, kingSq(n.b, st.turn), n.turn); });
  function evaluate(b) { let s = 0; for (let i = 0; i < 64; i++) { const p = b[i]; if (!p) continue; const k = p.toLowerCase(); const w = isW(p); const idx = w ? i : (7 - (i >> 3)) * 8 + (i & 7); let v = VAL[k] + (k === 'p' ? PST_P[idx] : k === 'n' ? PST_N[idx] : k === 'b' || k === 'q' ? (PST_N[idx] >> 2) + 10 : 0); s += w ? v : -v; } return s; }
  function search(st, depth, alpha, beta, ply = 0) {
    const moves = legal(st); if (!moves.length) return inCheck(st) ? -100000 + ply : 0; if (depth === 0) return (st.turn === 'w' ? 1 : -1) * evaluate(st.b);
    moves.sort((a, b) => (st.b[b.t] ? VAL[st.b[b.t].toLowerCase()] : 0) - (st.b[a.t] ? VAL[st.b[a.t].toLowerCase()] : 0));
    for (const m of moves) { const v = -search(make(st, m), depth - 1, -beta, -alpha, ply + 1); if (v >= beta) return beta; if (v > alpha) alpha = v; }
    return alpha;
  }
  function best(st, depth) { const moves = legal(st).sort(() => Math.random() - 0.5); let bm = moves[0], bv = -Infinity; for (const m of moves) { const v = -search(make(st, m), depth - 1, -Infinity, -bv); if (v > bv) { bv = v; bm = m; } } return bm; }
  const sqName = (i) => 'abcdefgh'[i & 7] + (8 - (i >> 3));
  MS.chessEngine = { initial, legal, make, inCheck, best };
  GAMES.chess = { name: 'Chess', icon: '♟️', desc: 'Full chess rules vs. an alpha-beta AI.', run(host) {
    let st = initial(), sel = -1, targets = [], over = false, depth = 3, flip = false, lastMove = null, thinking = false; const moves = []; const history = [];
    const status = h('strong'); const boardEl = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(8, min(9vh, 64px))', gridTemplateRows: 'repeat(8, min(9vh, 64px))', border: '6px solid #5b3a1e', borderRadius: '8px', margin: 'auto', width: 'max-content', boxShadow: 'var(--shadow)', userSelect: 'none' } });
    const movesEl = h('div.small.mono', { style: { maxHeight: '420px', overflow: 'auto', minWidth: '160px', textAlign: 'left' } }); const capEl = h('div', { style: { fontSize: '22px', minHeight: '30px' } });
    host.append(h('div.row', { style: { justifyContent: 'center', gap: '8px', margin: '8px 0', flexWrap: 'wrap' } }, status, h('select.input', { on: { change: (e) => (depth = +e.target.value) } }, [[1, 'Beginner'], [2, 'Casual'], [3, 'Club'], [4, 'Strong (slow)']].map(([v, l]) => h('option', { value: v, selected: v === 3 }, l))), h('button.btn.sm', { on: { click: () => { st = initial(); sel = -1; targets = []; over = false; moves.length = 0; history.length = 0; lastMove = null; draw(); } } }, 'New game'), h('button.btn.sm', { on: { click: undo } }, '↶ Undo'), h('button.btn.sm', { on: { click: () => { flip = !flip; draw(); } } }, '⇅ Flip')),
      h('div.row', { style: { justifyContent: 'center', alignItems: 'flex-start', gap: '18px', flexWrap: 'wrap' } }, h('div', boardEl, capEl), h('div.card', h('strong', 'Moves'), movesEl)));
    function undo() { if (thinking || history.length < 2) return; history.pop(); st = history.pop(); moves.splice(-2); over = false; lastMove = null; sel = -1; targets = []; draw(); }
    function play(m) { history.push(st); const san = (st.b[m.f].toLowerCase() === 'p' ? '' : st.b[m.f].toUpperCase()) + (st.b[m.t] || m.epCap != null ? 'x' : '') + sqName(m.t) + (m.promo ? '=Q' : ''); st = make(st, m); lastMove = m; const ls = legal(st); const chk = inCheck(st); moves.push(m.castle === 'K' ? 'O-O' : m.castle === 'Q' ? 'O-O-O' : san + (chk ? (ls.length ? '+' : '#') : ''));
      if (!ls.length) { over = true; if (chk) { const youWon = st.turn === 'b'; status.textContent = youWon ? '🏆 Checkmate — you win!' : '🤖 Checkmate — AI wins'; if (youWon) MS.arcade.getScores().then((s) => report('Chess wins', (s.data.best['Chess wins'] || 0) + 1)); } else status.textContent = '🤝 Stalemate'; }
      else if (st.half >= 100) { over = true; status.textContent = '🤝 Draw (50-move rule)'; } else if (st.b.filter(Boolean).length === 2) { over = true; status.textContent = '🤝 Draw (insufficient material)'; } }
    function click(i) { if (over || thinking || st.turn !== 'w') return; if (sel >= 0 && targets.some((m) => m.t === i)) { play(targets.find((m) => m.t === i)); sel = -1; targets = []; draw(); if (!over) { thinking = true; status.textContent = '🤖 Thinking…'; setTimeout(() => { const m = best(st, depth); thinking = false; if (m) play(m); draw(); }, 60); } return; }
      if (st.b[i] && side(st.b[i]) === 'w') { sel = i; targets = legal(st).filter((m) => m.f === i); } else { sel = -1; targets = []; } draw(); }
    function draw() { boardEl.innerHTML = ''; const chkSq = inCheck(st) ? kingSq(st.b, st.turn) : -1;
      for (let vi = 0; vi < 64; vi++) { const i = flip ? 63 - vi : vi; const r = i >> 3, c = i & 7; const light = (r + c) % 2 === 0; const p = st.b[i]; const isT = targets.some((m) => m.t === i); const isLast = lastMove && (lastMove.f === i || lastMove.t === i);
        boardEl.append(h('div', { style: { display: 'grid', placeItems: 'center', fontSize: 'min(6.4vh, 46px)', cursor: 'pointer', position: 'relative', background: i === sel ? '#f6f669' : i === chkSq ? '#ff6b6b' : isLast ? (light ? '#f2e78b' : '#c9b955') : light ? '#f0d9b5' : '#b58863', color: isW(p) ? '#fff' : '#111', textShadow: isW(p) ? '0 0 2px #000, 0 1px 2px #000' : '0 0 1px #fff8', lineHeight: 1 }, on: { click: () => click(i) } }, p ? GLYPH[p.toUpperCase() === p ? p : p] : '', isT ? h('span', { style: { position: 'absolute', width: p ? '86%' : '28%', height: p ? '86%' : '28%', borderRadius: '50%', background: p ? 'transparent' : 'rgba(0,0,0,.22)', border: p ? '4px solid rgba(0,0,0,.25)' : '0' } }) : null,
          c === (flip ? 7 : 0) ? h('span', { style: { position: 'absolute', left: '3px', top: '1px', fontSize: '11px', color: light ? '#b58863' : '#f0d9b5', textShadow: 'none' } }, 8 - r) : null, r === (flip ? 0 : 7) ? h('span', { style: { position: 'absolute', right: '3px', bottom: '1px', fontSize: '11px', color: light ? '#b58863' : '#f0d9b5', textShadow: 'none' } }, 'abcdefgh'[c]) : null)); }
      movesEl.innerHTML = ''; for (let k = 0; k < moves.length; k += 2) movesEl.append(h('div', `${k / 2 + 1}. ${moves[k]} ${moves[k + 1] || ''}`)); movesEl.scrollTop = 1e6;
      const caps = history.map((x, idx) => history[idx + 1] ? null : null); capEl.textContent = ''; const count = {}; st.b.forEach((p) => p && (count[p] = (count[p] || 0) + 1)); const full = { P: 8, N: 2, B: 2, R: 2, Q: 1, p: 8, n: 2, b: 2, r: 2, q: 1 }; let txt = ''; for (const k of 'qrbnp') txt += GLYPH[k].repeat(Math.max(0, full[k] - (count[k] || 0))); txt += '  '; for (const k of 'QRBNP') txt += GLYPH[k].repeat(Math.max(0, full[k] - (count[k] || 0))); capEl.textContent = txt.trim() ? 'Captured: ' + txt : '';
      if (!over && !thinking) status.textContent = st.turn === 'w' ? (inCheck(st) ? '⚠️ Check! Your move (white)' : 'Your move (white)') : '…'; }
    draw(); return () => {};
  } };
  MS.command({ id: 'game-chess', title: 'Play Chess', icon: '♟️', group: 'Arcade', run: () => MS.go('arcade', 'chess') });
})();
