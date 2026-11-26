/* Chess Trainer: mate puzzles with rating & streaks, Puzzle Rush, opening explorer with quiz mode,
   endgame drills against the engine, and an analysis board with FEN import/export */
(function () {
  const { h } = MS;
  const GLYPH = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙', k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  const FILES = 'abcdefgh';
  const sq = (i) => FILES[i & 7] + (8 - (i >> 3));
  const idx = (s) => FILES.indexOf(s[0]) + (8 - +s[1]) * 8;
  function fromFEN(fen) { const [pos, turn, cas, ep] = fen.trim().split(/\s+/); const b = []; for (const ch of pos.replace(/\//g, '')) { if (/\d/.test(ch)) for (let i = 0; i < +ch; i++) b.push(null); else b.push(ch); } if (b.length !== 64) throw new Error('Bad FEN'); const c = cas || '-'; return { b, turn: turn || 'w', castle: { K: c.includes('K'), Q: c.includes('Q'), k: c.includes('k'), q: c.includes('q') }, ep: ep && ep !== '-' ? idx(ep) : -1, half: 0, hist: [] }; }
  function toFEN(st) { let s = ''; for (let r = 0; r < 8; r++) { let e = 0; for (let c = 0; c < 8; c++) { const p = st.b[r * 8 + c]; if (!p) e++; else { if (e) s += e; e = 0; s += p; } } if (e) s += e; if (r < 7) s += '/'; } const cs = ['K', 'Q', 'k', 'q'].filter((k) => st.castle[k]).join('') || '-'; return `${s} ${st.turn} ${cs} ${st.ep >= 0 ? sq(st.ep) : '-'} 0 1`; }
  const E = () => MS.chessEngine;
  const uciOf = (m) => sq(m.f) + sq(m.t);
  const findMove = (st, u) => E().legal(st).find((m) => uciOf(m) === u.slice(0, 4));
  function san(st, m) {
    const p = st.b[m.f]; const k = p.toLowerCase(); let s;
    if (m.castle) s = m.castle === 'K' ? 'O-O' : 'O-O-O';
    else if (k === 'p') s = (st.b[m.t] || m.epCap != null ? FILES[m.f & 7] + 'x' : '') + sq(m.t) + (m.promo ? '=Q' : '');
    else { const others = E().legal(st).filter((o) => o.t === m.t && o.f !== m.f && st.b[o.f] === p); let d = ''; if (others.length) { if (!others.some((o) => (o.f & 7) === (m.f & 7))) d = FILES[m.f & 7]; else if (!others.some((o) => o.f >> 3 === m.f >> 3)) d = sq(m.f)[1]; else d = sq(m.f); } s = k.toUpperCase() + d + (st.b[m.t] ? 'x' : '') + sq(m.t); }
    const n = E().make(st, m); if (E().inCheck(n)) s += E().legal(n).length ? '+' : '#'; return s;
  }
  function mateIn(st, n) { for (const m of E().legal(st)) { const s2 = E().make(st, m); const rs = E().legal(s2); if (!rs.length) { if (E().inCheck(s2)) return m; continue; } if (n > 1 && rs.every((r) => mateIn(E().make(s2, r), n - 1))) return m; } return null; }
  const isMate = (st) => E().inCheck(st) && !E().legal(st).length;

  /* ---------- reusable board ---------- */
  function Board({ onMove, canMove = () => true, size = 'min(11vw, 8.4vh, 62px)' }) {
    const el = h('div', { style: { display: 'grid', gridTemplateColumns: `repeat(8, ${size})`, gridTemplateRows: `repeat(8, ${size})`, border: '6px solid #5b3a1e', borderRadius: '8px', userSelect: 'none', boxShadow: 'var(--shadow)', touchAction: 'manipulation' } });
    const B = { el, st: null, flip: false, sel: -1, last: null, marks: {}, arrows: [], set(st) { B.st = st; B.sel = -1; B.draw(); }, draw };
    function click(i) {
      const st = B.st; if (!st || !canMove()) return;
      if (B.sel >= 0) { const m = E().legal(st).find((x) => x.f === B.sel && x.t === i); if (m) { B.sel = -1; B.draw(); onMove(m); return; } }
      B.sel = st.b[i] && (st.b[i] === st.b[i].toUpperCase() ? 'w' : 'b') === st.turn ? i : -1; B.draw();
    }
    function draw() {
      el.innerHTML = ''; const st = B.st; if (!st) return; const targets = B.sel >= 0 ? E().legal(st).filter((m) => m.f === B.sel).map((m) => m.t) : [];
      const chk = E().inCheck(st) ? st.b.indexOf(st.turn === 'w' ? 'K' : 'k') : -1;
      for (let vi = 0; vi < 64; vi++) {
        const i = B.flip ? 63 - vi : vi; const r = i >> 3, c = i & 7; const light = (r + c) % 2 === 0; const p = st.b[i];
        const last = B.last && (B.last.f === i || B.last.t === i);
        let bg = light ? '#f0d9b5' : '#b58863'; if (last) bg = light ? '#f2e78b' : '#c9b955'; if (B.marks[i]) bg = B.marks[i]; if (i === B.sel) bg = '#f6f669'; if (i === chk) bg = 'radial-gradient(circle, #ff3b3b 0%, #ff6b6b 45%, ' + (light ? '#f0d9b5' : '#b58863') + ' 80%)';
        const cell = h('div', { style: { position: 'relative', display: 'grid', placeItems: 'center', background: bg, cursor: 'pointer', fontSize: `calc(${size} * 0.74)`, lineHeight: 1, color: p && p === p.toUpperCase() ? '#fff' : '#111', textShadow: p && p === p.toUpperCase() ? '0 0 2px #000, 0 0 1px #000' : '0 0 1px #fff' }, on: { click: () => click(i) } }, p ? GLYPH[p] : '');
        if (targets.includes(i)) cell.append(h('div', { style: { position: 'absolute', width: p ? '86%' : '30%', height: p ? '86%' : '30%', borderRadius: '50%', background: p ? 'transparent' : 'rgba(20,85,30,.45)', border: p ? '4px solid rgba(20,85,30,.5)' : '', pointerEvents: 'none' } }));
        if (c === (B.flip ? 7 : 0)) cell.append(h('span', { style: { position: 'absolute', left: '3px', top: '1px', fontSize: '10px', color: light ? '#b58863' : '#f0d9b5', textShadow: 'none' } }, 8 - r));
        if (r === (B.flip ? 0 : 7)) cell.append(h('span', { style: { position: 'absolute', right: '3px', bottom: '0', fontSize: '10px', color: light ? '#b58863' : '#f0d9b5', textShadow: 'none' } }, FILES[c]));
        el.append(cell);
      }
    }
    return B;
  }

  /* ---------- openings ---------- */
  const OPENINGS = [
    ['Italian Game', 'e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 c2c3 g8f6 d2d4', 'Classical development: bishop eyes f7, then c3 & d4 build a centre.'],
    ['Evans Gambit', 'e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 b2b4 c5b4 c2c3', 'White gives a pawn for rapid development and a big centre.'],
    ['Two Knights Defense', 'e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 d2d3', 'Black counterattacks e4 immediately.'],
    ['Fried Liver Attack', 'e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 f3g5 d7d5 e4d5 f6d5 g5f7 e8f7 d1f3', 'A wild knight sacrifice on f7 to drag the king out.'],
    ['Ruy Lopez', 'e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6 e1g1 f8e7 f1e1 b7b5 a4b3 d7d6', 'The "Spanish": pressure on the e5 defender — one of the oldest and deepest openings.'],
    ['Scotch Game', 'e2e4 e7e5 g1f3 b8c6 d2d4 e5d4 f3d4 g8f6 d4c6', 'White opens the centre at once.'],
    ['Petrov Defense', 'e2e4 e7e5 g1f3 g8f6 f3e5 d7d6 e5f3 f6e4 d2d4', 'Black mirrors White — solid and symmetrical.'],
    ['King\'s Gambit', 'e2e4 e7e5 f2f4 e5f4 g1f3 g7g5', 'The romantic era\'s favourite: a pawn for the f-file.'],
    ['Vienna Game', 'e2e4 e7e5 b1c3 g8f6 f2f4', 'Knight first, then a delayed f4 push.'],
    ['Sicilian Najdorf', 'e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6', 'Fischer and Kasparov\'s weapon: flexible and sharp.'],
    ['Sicilian Dragon', 'e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 g7g6 c1e3 f8g7 f2f3', 'Fianchettoed bishop breathes fire down the long diagonal.'],
    ['French Defense', 'e2e4 e7e6 d2d4 d7d5 b1c3 g8f6 c1g5 f8e7', 'Solid pawn chain; Black strikes back with ...c5 later.'],
    ['Caro-Kann Defense', 'e2e4 c7c6 d2d4 d7d5 b1c3 d5e4 c3e4 c8f5 e4g3 f5g6', 'Rock-solid: the light-squared bishop gets out before ...e6.'],
    ['Scandinavian Defense', 'e2e4 d7d5 e4d5 d8d5 b1c3 d5a5 d2d4 g8f6', 'Immediate central challenge; the queen comes out early.'],
    ['Pirc Defense', 'e2e4 d7d6 d2d4 g8f6 b1c3 g7g6 f2f4 f8g7', 'Hypermodern: let White build a centre, then attack it.'],
    ['Alekhine Defense', 'e2e4 g8f6 e4e5 f6d5 d2d4 d7d6 c2c4 d5b6', 'Provoke the pawns forward, then undermine them.'],
    ['Queen\'s Gambit Declined', 'd2d4 d7d5 c2c4 e7e6 b1c3 g8f6 c1g5 f8e7 e2e3 e8g8', 'Classical and resilient — Black keeps a strong point on d5.'],
    ['Queen\'s Gambit Accepted', 'd2d4 d7d5 c2c4 d5c4 g1f3 g8f6 e2e3 e7e6 f1c4', 'Black takes the pawn but returns it for free development.'],
    ['Slav Defense', 'd2d4 d7d5 c2c4 c7c6 g1f3 g8f6 b1c3 d5c4 a2a4 c8f5', 'Supports d5 with c6, keeping the bishop free.'],
    ['King\'s Indian Defense', 'd2d4 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4 d7d6 g1f3 e8g8 f1e2 e7e5', 'Black concedes the centre, then launches a kingside storm.'],
    ['Nimzo-Indian Defense', 'd2d4 g8f6 c2c4 e7e6 b1c3 f8b4 e2e3 e8g8', 'Pin the knight, fight for e4 with pieces.'],
    ['Grünfeld Defense', 'd2d4 g8f6 c2c4 g7g6 b1c3 d7d5 c4d5 f6d5 e2e4 d5c3 b2c3 f8g7', 'Let White build a huge centre, then blast it apart.'],
    ['Queen\'s Indian Defense', 'd2d4 g8f6 c2c4 e7e6 g1f3 b7b6 g2g3 c8b7', 'Control e4 from afar with a fianchetto.'],
    ['Catalan Opening', 'd2d4 g8f6 c2c4 e7e6 g2g3 d7d5 f1g2 f8e7 g1f3 e8g8', 'Queen\'s Gambit meets fianchetto: long-diagonal pressure.'],
    ['Benoni Defense', 'd2d4 g8f6 c2c4 c7c5 d4d5 e7e6 b1c3 e6d5 c4d5 d7d6', 'Imbalanced pawns: Black gets queenside play.'],
    ['Dutch Defense', 'd2d4 f7f5 g2g3 g8f6 f1g2 e7e6 g1f3 f8e7', 'Grabs e4 with the f-pawn — ambitious and unbalanced.'],
    ['London System', 'd2d4 d7d5 c1f4 g8f6 e2e3 e7e6 g1f3 c7c5 c2c3', 'A reliable setup you can play against almost anything.'],
    ['English Opening', 'c2c4 e7e5 b1c3 g8f6 g2g3 d7d5 c4d5 f6d5 f1g2', 'A reversed Sicilian with an extra tempo.'],
    ['Réti Opening', 'g1f3 d7d5 c2c4 e7e6 g2g3 g8f6 f1g2 f8e7', 'Hypermodern flexibility: control the centre from the flanks.'],
    ['Scholar\'s Mate (trap)', 'e2e4 e7e5 f1c4 b8c6 d1h5 g8f6 h5f7', 'The classic beginner trap — learn it so it never happens to you.'],
  ];

  /* ---------- endgames ---------- */
  const ENDGAMES = [
    ['King + Queen vs King', '8/8/8/4k3/8/8/8/4K2Q w - - 0 1', 'mate', 10, 'Use the queen to box the king in (a knight\'s move away), bring your king up, then mate on the edge. Watch out for stalemate!'],
    ['King + Rook vs King', '8/8/8/4k3/8/8/8/R3K3 w - - 0 1', 'mate', 16, 'Cut the king off with the rook, use opposition with your king, and push the box smaller.'],
    ['Two Rooks vs King', '8/8/8/3k4/8/8/8/R3K2R w - - 0 1', 'mate', 7, 'The "lawnmower": rooks take turns cutting off ranks.'],
    ['King + Two Bishops vs King', '8/8/8/4k3/8/8/8/2B1KB2 w - - 0 1', 'mate', 19, 'Bishops side by side form a wall; drive the king to a corner.'],
    ['Pawn promotion (key squares)', '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1', 'promote', 6, 'King in front of the pawn on the 6th always wins. Promote and you\'re done.'],
    ['Queen vs Pawn on the 7th', '7Q/8/8/8/8/2K5/2p5/1k6 w - - 0 1', 'mate', 8, 'Black\'s pawn is about to queen — stop it and mate.'],
  ];

  MS.register({
    id: 'chesstrain', name: 'Chess Trainer', icon: '♞', group: 'Play', desc: 'Puzzles, openings, endgames & analysis', keywords: 'chess puzzles tactics mate openings endgame trainer analysis fen rating rush',
    async mount(view) {
      const st = await MS.store('chesstrain', () => ({ tab: 'puzzles', rating: 1000, solved: 0, failed: 0, streak: 0, bestStreak: 0, rushBest: 0, seen: {}, cat: 'mix', openDone: {}, endDone: {} }));
      const D = st.data; const save = () => st.touch();
      const P = MS.chessPuzzles || { 1: [], 2: [], 3: [] };
      const wrap = h('div.pad.col', { style: { gap: '12px', maxWidth: '1100px', margin: '0 auto' } }); view.append(wrap);
      const tabsEl = h('div.row', { style: { flexWrap: 'wrap' } }); const body = h('div.col', { style: { gap: '12px' } }); wrap.append(tabsEl, body);
      let cleanup = null;
      const TABS = [['puzzles', '🧩 Puzzles'], ['rush', '⚡ Puzzle Rush'], ['openings', '📖 Openings'], ['endgames', '🏁 Endgames'], ['analysis', '🔬 Analysis']];
      function render() { if (cleanup) cleanup(); cleanup = null; tabsEl.innerHTML = ''; TABS.forEach(([k, l]) => tabsEl.append(h('button.btn', { class: D.tab === k ? 'on' : '', on: { click: () => { D.tab = k; save(); render(); } } }, l))); body.innerHTML = ''; ({ puzzles, rush, openings, endgames, analysis })[D.tab](); }
      const layout = (board, side) => h('div.row', { style: { gap: '18px', alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'center' } }, board.el, h('div.col', { style: { gap: '10px', flex: '1', minWidth: '240px', maxWidth: '380px' } }, ...side));
      const prating = (n, fen) => { let hsh = 0; for (const c of fen) hsh = (hsh * 31 + c.charCodeAt(0)) | 0; return [0, 950, 1350, 1750][n] + (Math.abs(hsh) % 300) - 150; };
      function pickPuzzle(cat) { const n = cat === 'mix' ? (D.rating < 1150 ? [1, 1, 2] : D.rating < 1500 ? [1, 2, 2, 3] : [2, 2, 3, 3])[Math.floor(Math.random() * (D.rating < 1150 ? 3 : 4))] : +cat; let pool = (P[n] || []).filter(([f]) => !D.seen[f]); if (!pool.length) pool = P[n] || []; if (!pool.length) return null; const [fen, sol] = pool[Math.floor(Math.random() * pool.length)]; return { fen, sol, n, rating: prating(n, fen) }; }

      /* puzzle engine shared by Puzzles & Rush */
      function puzzleRunner(board, pz, { onSolve, onFail, status }) {
        let s = fromFEN(pz.fen); const side = s.turn; let left = pz.n; let busy = false; let failed = false; const line = [];
        board.flip = side === 'b'; board.last = null; board.marks = {}; board.set(s);
        status(`${side === 'w' ? '⚪ White' : '⚫ Black'} to move — mate in ${pz.n}`);
        board.canMove = () => !busy && !failed && s.turn === side;
        const onMove = (m) => {
          const prev = s; const s2 = E().make(s, m); line.push(san(prev, m)); board.last = m;
          let good;
          if (isMate(s2)) good = 'mate';
          else if (left === 1) good = false;
          else if (left === 3 && line.length === 1) good = uciOf(m) === pz.sol || (mateIn(s2, 1) === null && E().legal(s2).every((r) => mateIn(E().make(s2, r), 1)) ? true : uciOf(m) === pz.sol);
          else good = E().legal(s2).every((r) => mateIn(E().make(s2, r), left - 1));
          s = s2; board.set(s);
          if (good === 'mate') { status('✅ Checkmate! ' + line.join(' ')); onSolve(line, failed); return; }
          if (!good) { failed = true; board.marks = { [m.t]: 'rgba(255,80,80,.65)' }; board.draw(); status('❌ Not quite — ' + line[line.length - 1] + ' doesn\'t force mate.'); onFail(); return; }
          board.marks = { [m.t]: 'rgba(80,200,120,.6)' }; busy = true; status('✔ Good move… opponent replies');
          setTimeout(() => { const rs = E().legal(s); let r = rs.find((x) => !mateIn(E().make(s, x), 1)) || rs[0]; if (left - 1 >= 2) { const hard = rs.filter((x) => !mateIn(E().make(s, x), 1)); if (hard.length) r = hard[Math.floor(Math.random() * hard.length)]; } line.push(san(s, r)); s = E().make(s, r); board.last = r; board.marks = {}; left--; busy = false; board.set(s); status(`Your move — mate in ${left}`); }, 450);
        };
        return { onMove, hint() { const m = mateIn(s, Math.min(left, 2)) || findMove(s, pz.sol); if (m) { board.marks = { [m.f]: 'rgba(80,160,255,.6)' }; board.draw(); } return m; }, solution() { const m = (left <= 2 && mateIn(s, left)) || (s.turn === side && findMove(s, pz.sol)); if (m) { board.marks = { [m.f]: 'rgba(80,160,255,.6)', [m.t]: 'rgba(80,160,255,.6)' }; board.draw(); return san(s, m); } return '—'; }, get failed() { return failed; }, set failed(v) { failed = v; } };
      }

      /* ---------- puzzles ---------- */
      function puzzles() {
        let runner = null, pz = null, done = false;
        const statusEl = h('div', { style: { fontWeight: 700, fontSize: '17px', minHeight: '48px' } });
        const board = Board({ onMove: (m) => runner && runner.onMove(m) });
        const ratingEl = h('div'); const info = h('div.small.muted');
        const showRating = () => { ratingEl.innerHTML = ''; ratingEl.append(h('div', { style: { fontSize: '34px', fontWeight: 800 } }, Math.round(D.rating)), h('div.small.muted', `Your puzzle rating · ✅ ${D.solved} ❌ ${D.failed} · 🔥 streak ${D.streak} (best ${D.bestStreak})`)); };
        const elo = (score) => { const exp = 1 / (1 + 10 ** ((pz.rating - D.rating) / 400)); const d = 24 * (score - exp); D.rating = Math.max(400, D.rating + d); return d; };
        const catSel = h('select.input', { on: { change: () => { D.cat = catSel.value; save(); next(); } } }, [['mix', 'Adaptive mix'], ['1', 'Mate in 1'], ['2', 'Mate in 2'], ['3', 'Mate in 3']].map(([v, l]) => h('option', { value: v, selected: D.cat === v }, l)));
        const nextBtn = h('button.btn.primary', { on: { click: () => next() } }, 'Next puzzle →');
        function next() {
          pz = pickPuzzle(D.cat); done = false; if (!pz) { statusEl.textContent = 'No puzzles available.'; return; }
          info.textContent = `Puzzle rating ≈ ${pz.rating} · ${Object.keys(D.seen).length} seen of ${(P[1] || []).length + (P[2] || []).length + (P[3] || []).length}`;
          runner = puzzleRunner(board, pz, { status: (t) => (statusEl.textContent = t),
            onSolve: (line, failed) => { if (done) return; done = true; D.seen[pz.fen] = 1; if (!failed) { const d = elo(1); D.solved++; D.streak++; D.bestStreak = Math.max(D.bestStreak, D.streak); MS.toast(`+${Math.round(d)} rating`, 'good'); } save(); showRating(); },
            onFail: () => { if (done) return; done = true; D.seen[pz.fen] = 1; const d = elo(0); D.failed++; D.streak = 0; save(); showRating(); MS.toast(`${Math.round(d)} rating`, 'bad'); } });
        }
        showRating(); next();
        body.append(layout(board, [h('div.card.col', { style: { gap: '6px' } }, ratingEl), h('div.card.col', { style: { gap: '8px' } }, statusEl, info,
          h('div.row', { style: { flexWrap: 'wrap' } }, h('button.btn', { on: { click: () => { if (runner && !done) { runner.hint(); } } } }, '💡 Hint'), h('button.btn', { on: { click: () => { if (!runner) return; const s = runner.solution(); statusEl.textContent = '👀 Solution: ' + s; if (!done) { done = true; D.seen[pz.fen] = 1; elo(0); D.failed++; D.streak = 0; save(); showRating(); } } } }, '👀 Solution'), h('button.btn', { on: { click: () => { const p = pz; pz = { ...p }; runner = puzzleRunner(board, pz, { status: (t) => (statusEl.textContent = t), onSolve: () => {}, onFail: () => {} }); done = true; } } }, '↺ Retry'), nextBtn),
          h('div.row', h('span.small.muted', 'Category'), catSel)),
          h('div.small.muted', 'Click a piece, then its destination. Puzzles are generated from engine games and verified with an exhaustive mate search — any move that forces mate counts.')]));
      }

      /* ---------- rush ---------- */
      function rush() {
        let runner, timer, t = 180, score = 0, strikes = 0, running = false, cur = null;
        const statusEl = h('div', { style: { fontWeight: 700, minHeight: '40px' } }); const big = h('div', { style: { fontSize: '44px', fontWeight: 800 } }, '3:00'); const scoreEl = h('div', { style: { fontSize: '22px' } });
        const board = Board({ onMove: (m) => runner && runner.onMove(m) });
        const upd = () => { big.textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; scoreEl.textContent = `✅ ${score}   ${'❌'.repeat(strikes)}${'▫️'.repeat(3 - strikes)}`; };
        const end = () => { running = false; clearInterval(timer); board.canMove = () => false; const best = score > D.rushBest; if (best) { D.rushBest = score; save(); } statusEl.textContent = `⏱ Rush over: ${score} solved${best ? ' — new best! 🏆' : ''}`; startBtn.disabled = false; };
        const next = () => { const n = score < 5 ? 1 : score < 12 ? (Math.random() < 0.5 ? 1 : 2) : 2; cur = pickPuzzle(String(n)); runner = puzzleRunner(board, cur, { status: (s) => (statusEl.textContent = s), onSolve: () => { score++; upd(); setTimeout(() => running && next(), 350); }, onFail: () => { strikes++; upd(); if (strikes >= 3) end(); else setTimeout(() => running && next(), 700); } }); };
        const startBtn = h('button.btn.primary', { on: { click: () => { t = 180; score = 0; strikes = 0; running = true; startBtn.disabled = true; upd(); next(); clearInterval(timer); timer = setInterval(() => { t--; upd(); if (t <= 0) end(); }, 1000); } } }, '▶ Start rush');
        board.set(fromFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')); board.canMove = () => false; upd();
        body.append(layout(board, [h('div.card.col', { style: { gap: '6px', alignItems: 'center', textAlign: 'center' } }, big, scoreEl, startBtn, h('div.small.muted', `Solve as many as you can in 3 minutes. Three mistakes and you\'re out. Best: ${D.rushBest}`)), h('div.card', statusEl)]));
        cleanup = () => clearInterval(timer);
      }

      /* ---------- openings ---------- */
      function openings() {
        let cur = 0, ply = 0, quiz = false, line = [], states = [];
        const board = Board({ onMove: (m) => { if (!quiz) return; const want = line[ply]; if (uciOf(m) === want.u) { ply++; MS.toast('✔ ' + want.s, 'good'); auto(); } else { MS.toast('✘ Book move is ' + want.s, 'bad'); board.marks = { [want.m.f]: 'rgba(80,160,255,.6)', [want.m.t]: 'rgba(80,160,255,.6)' }; board.draw(); } }, canMove: () => quiz && ply < line.length && (ply % 2 === 0) === (userSide === 'w') });
        let userSide = 'w';
        const listEl = h('div.col', { style: { gap: '4px', maxHeight: '40vh', overflow: 'auto' } }); const movesEl = h('div.mono.small', { style: { lineHeight: 1.8 } }); const title = h('h3', { style: { margin: 0 } }); const desc = h('div.small.muted');
        function load(i) {
          cur = i; ply = 0; let s = fromFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'); states = [s]; line = [];
          for (const u of OPENINGS[i][1].split(' ')) { const m = findMove(s, u); if (!m) break; line.push({ u, s: san(s, m), m }); s = E().make(s, m); states.push(s); }
          title.textContent = OPENINGS[i][0]; desc.textContent = OPENINGS[i][2]; [...listEl.children].forEach((c, k) => c.classList.toggle('on', k === i)); show();
        }
        function show() { board.marks = {}; board.last = ply ? line[ply - 1].m : null; board.set(states[ply]); movesEl.innerHTML = ''; line.forEach((x, k) => { if (k % 2 === 0) movesEl.append(h('span.muted', ` ${k / 2 + 1}.`)); movesEl.append(h('span', { style: { cursor: 'pointer', padding: '1px 4px', borderRadius: '4px', background: k === ply - 1 ? 'var(--accent)' : '', color: k === ply - 1 ? '#fff' : '', filter: quiz && k >= ply ? 'blur(4px)' : '' }, on: { click: () => { if (!quiz) { ply = k + 1; show(); } } } }, x.s)); }); }
        function auto() { show(); if (ply >= line.length) { D.openDone[OPENINGS[cur][0]] = 1; save(); MS.toast('🎉 Line complete!', 'good'); renderList(); return; } if ((ply % 2 === 0) !== (userSide === 'w')) setTimeout(() => { ply++; auto(); }, 500); }
        function renderList() { listEl.innerHTML = ''; OPENINGS.forEach(([n], i) => listEl.append(h('button.btn.sm', { class: i === cur ? 'on' : '', style: { justifyContent: 'flex-start' }, on: { click: () => { quiz = false; load(i); } } }, (D.openDone[n] ? '✅ ' : '') + n))); }
        const key = (e) => { if (D.tab !== 'openings' || quiz || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return; if (e.key === 'ArrowRight' && ply < line.length) { ply++; show(); } if (e.key === 'ArrowLeft' && ply > 0) { ply--; show(); } };
        document.addEventListener('keydown', key); cleanup = () => document.removeEventListener('keydown', key);
        renderList(); load(0);
        body.append(layout(board, [h('div.card.col', { style: { gap: '6px' } }, title, desc, movesEl,
          h('div.row', { style: { flexWrap: 'wrap' } }, h('button.btn', { on: { click: () => { quiz = false; ply = 0; show(); } } }, '⏮'), h('button.btn', { on: { click: () => { if (!quiz && ply > 0) { ply--; show(); } } } }, '◀'), h('button.btn', { on: { click: () => { if (!quiz && ply < line.length) { ply++; show(); } } } }, '▶'), h('button.btn', { on: { click: () => { quiz = false; ply = line.length; show(); } } }, '⏭'),
            h('button.btn.primary', { on: { click: () => { quiz = true; ply = 0; userSide = 'w'; board.flip = false; auto(); } } }, '🎯 Quiz as White'), h('button.btn', { on: { click: () => { quiz = true; ply = 0; userSide = 'b'; board.flip = true; auto(); } } }, 'as Black')),
          h('div.small.muted', `${Object.keys(D.openDone).length}/${OPENINGS.length} lines mastered · ← → to step`)), h('div.card.col', h('b', 'Openings'), listEl)]));
      }

      /* ---------- endgames ---------- */
      function endgames() {
        let cur = 0, s, moves = 0, busy = false, over = false;
        const statusEl = h('div', { style: { fontWeight: 700, minHeight: '40px' } }); const tip = h('div.small.muted'); const title = h('h3', { style: { margin: 0 } });
        const board = Board({ canMove: () => !busy && !over && s.turn === 'w', onMove: (m) => {
          const prev = s; s = E().make(s, m); moves++; board.last = m; board.set(s); const goal = ENDGAMES[cur][2];
          if (goal === 'promote' && m.promo) return win();
          if (isMate(s)) return win();
          if (!E().legal(s).length) { over = true; statusEl.textContent = '😬 Stalemate! The king had no moves — draw.'; return; }
          if (s.b.filter((p) => p && p !== 'k' && p !== 'K').every((p) => p === p.toLowerCase())) { over = true; statusEl.textContent = '💥 You lost your material — try again.'; return; }
          busy = true; statusEl.textContent = 'Black is thinking…';
          setTimeout(() => { const r = E().best(s, goal === 'promote' ? 3 : 2); board.last = r; s = E().make(s, r); busy = false; board.set(s); statusEl.textContent = `Move ${moves + 1} · par ${ENDGAMES[cur][3]}`; if (s.b.filter((p) => p && p !== 'k' && p !== 'K').every((p) => p === p.toLowerCase()) && !s.b.some((p) => p === 'p')) { over = true; statusEl.textContent = '💥 Black won your material — draw. Try again.'; } else if (goal === 'mate' && !s.b.some((p) => p && 'QRBNP'.includes(p))) { over = true; statusEl.textContent = 'Draw — not enough material.'; } }, 250);
        } });
        function win() { over = true; const par = ENDGAMES[cur][3]; const stars = moves <= par ? 3 : moves <= par * 1.5 ? 2 : 1; const k = ENDGAMES[cur][0]; D.endDone[k] = Math.max(D.endDone[k] || 0, stars); save(); statusEl.textContent = `🏆 Done in ${moves} moves (par ${par}) ${'⭐'.repeat(stars)}`; renderList(); }
        const listEl = h('div.col', { style: { gap: '4px' } });
        function renderList() { listEl.innerHTML = ''; ENDGAMES.forEach(([n], i) => listEl.append(h('button.btn.sm', { class: i === cur ? 'on' : '', style: { justifyContent: 'flex-start' }, on: { click: () => load(i) } }, n + ' ' + '⭐'.repeat(D.endDone[n] || 0)))); }
        function load(i) { cur = i; moves = 0; over = false; busy = false; s = fromFEN(ENDGAMES[i][1]); board.flip = false; board.last = null; board.set(s); title.textContent = ENDGAMES[i][0]; tip.textContent = '💡 ' + ENDGAMES[i][4]; statusEl.textContent = `Goal: ${ENDGAMES[i][2] === 'mate' ? 'checkmate' : 'promote the pawn'} · par ${ENDGAMES[i][3]} moves`; renderList(); }
        load(0);
        body.append(layout(board, [h('div.card.col', { style: { gap: '8px' } }, title, statusEl, tip, h('button.btn', { on: { click: () => load(cur) } }, '↺ Restart')), h('div.card.col', h('b', 'Drills'), listEl)]));
      }

      /* ---------- analysis ---------- */
      function analysis() {
        let s = fromFEN(D.anFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'); let edit = null; const hist = [];
        const fenIn = h('input.input.mono', { style: { width: '100%', fontSize: '11px' } }); const evalEl = h('div', { style: { minHeight: '44px' } }); const movesEl = h('div.mono.small');
        const board = Board({ canMove: () => !edit, onMove: (m) => { hist.push({ s, san: san(s, m) }); s = E().make(s, m); board.last = m; sync(); } });
        const bclick = board.el; bclick.addEventListener('click', (e) => { if (!edit) return; const cells = [...board.el.children]; const vi = cells.indexOf(cells.find((c) => c.contains(e.target))); if (vi < 0) return; const i = board.flip ? 63 - vi : vi; s.b[i] = edit === 'x' ? null : (s.b[i] === edit ? null : edit); sync(); }, true);
        function sync() { D.anFen = toFEN(s); save(); fenIn.value = D.anFen; board.set(s); movesEl.textContent = hist.map((x, k) => (k % 2 === 0 ? k / 2 + 1 + '. ' : '') + x.san).join(' '); const ls = E().legal(s); evalEl.textContent = isMate(s) ? '♚ Checkmate' : !ls.length ? 'Stalemate' : `${s.turn === 'w' ? 'White' : 'Black'} to move · ${ls.length} legal moves${E().inCheck(s) ? ' · in check' : ''}`; }
        fenIn.onchange = () => { try { s = fromFEN(fenIn.value); hist.length = 0; sync(); } catch { MS.toast('Invalid FEN', 'bad'); } };
        const think = (depth) => { const ls = E().legal(s); if (!ls.length) return; evalEl.textContent = '🤔 Thinking…'; setTimeout(() => { const t0 = performance.now(); const mate = mateIn(s, 2); const m = mate || E().best(s, depth); evalEl.innerHTML = ''; evalEl.append(h('div', { style: { fontSize: '20px', fontWeight: 700 } }, (mate ? '♛ Forced mate: ' : '🤖 Engine: ') + san(s, m)), h('div.small.muted', `depth ${mate ? 'mate search' : depth} · ${Math.round(performance.now() - t0)} ms`)); board.marks = { [m.f]: 'rgba(80,160,255,.55)', [m.t]: 'rgba(80,160,255,.55)' }; board.draw(); }, 30); };
        const palette = h('div.row', { style: { flexWrap: 'wrap', gap: '3px' } }, [...'KQRBNPkqrbnp', 'x'].map((p) => h('button.btn.sm', { style: { fontSize: '20px', padding: '2px 6px' }, on: { click: (e) => { edit = edit === p ? null : p; [...palette.children].forEach((b) => b.classList.toggle('on', b === e.currentTarget && edit)); } } }, p === 'x' ? '🧽' : GLYPH[p])));
        sync();
        body.append(layout(board, [h('div.card.col', { style: { gap: '8px' } }, evalEl, h('div.row', { style: { flexWrap: 'wrap' } }, h('button.btn.primary', { on: { click: () => think(3) } }, '🤖 Best move'), h('button.btn', { on: { click: () => think(4) } }, 'Deeper'), h('button.btn', { on: { click: () => { const x = hist.pop(); if (x) { s = x.s; board.last = null; sync(); } } } }, '↶ Undo'), h('button.btn', { on: { click: () => { board.flip = !board.flip; board.draw(); } } }, '⇅ Flip')), movesEl),
          h('div.card.col', { style: { gap: '8px' } }, h('b', 'Set up a position'), palette, h('div.small.muted', 'Pick a piece then click squares (click again to remove). Pick it again to go back to playing moves.'),
            h('div.row', { style: { flexWrap: 'wrap' } }, h('button.btn.sm', { on: { click: () => { s.turn = s.turn === 'w' ? 'b' : 'w'; sync(); } } }, '⇄ Side to move'), h('button.btn.sm', { on: { click: () => { s = fromFEN('8/8/8/8/8/8/8/8 w - - 0 1'); hist.length = 0; sync(); } } }, 'Clear'), h('button.btn.sm', { on: { click: () => { s = fromFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'); hist.length = 0; board.last = null; sync(); } } }, 'Start position'), h('button.btn.sm', { on: { click: () => { navigator.clipboard?.writeText(fenIn.value); MS.toast('FEN copied'); } } }, '📋 FEN')),
            h('div.small.muted', 'FEN'), fenIn)]));
      }

      render();
      return { unmount() { if (cleanup) cleanup(); } };
    },
  });
})();
