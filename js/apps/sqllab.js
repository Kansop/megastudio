/* SQL Lab: real SQLite in the browser (sql.js / WebAssembly). Sample store database, schema browser, multi-statement
   runner, charts, CSV import/export, .sqlite open/save, history & saved queries, and 12 graded SQL challenges */
(function () {
  const { h } = MS;
  const CDN = 'https://cdn.jsdelivr.net/npm/sql.js@1.17.0/dist/';
  let SQLp = null;
  const loadSQL = () => (SQLp = SQLp || new Promise((res, rej) => { if (window.initSqlJs) return res(window.initSqlJs({ locateFile: (f) => CDN + f })); const s = document.createElement('script'); s.src = CDN + 'sql-wasm.js'; s.onload = () => res(window.initSqlJs({ locateFile: (f) => CDN + f })); s.onerror = () => { SQLp = null; rej(new Error('Could not load SQLite (offline?)')); }; document.head.append(s); }));
  function seedSQL() {
    let r = 7; const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647); const pick = (a) => a[Math.floor(rnd() * a.length)];
    const first = ['Ava', 'Liam', 'Mia', 'Noah', 'Zoe', 'Ethan', 'Luca', 'Isla', 'Omar', 'Sofia', 'Kai', 'Priya', 'Leo', 'Nora', 'Jin', 'Maya', 'Eli', 'Aria', 'Diego', 'Hana'], last = ['Smith', 'Garcia', 'Chen', 'Patel', 'Kim', 'Johnson', 'Rossi', 'Nguyen', 'Silva', 'Müller', 'Brown', 'Khan'];
    const cities = [['Detroit', 'US'], ['Chicago', 'US'], ['Toronto', 'CA'], ['New York', 'US'], ['Austin', 'US'], ['London', 'UK'], ['Berlin', 'DE'], ['Lisbon', 'PT'], ['Tokyo', 'JP'], ['Seoul', 'KR']];
    const prods = [['Wireless Mouse', 'Electronics', 24.99], ['Mechanical Keyboard', 'Electronics', 89.0], ['USB-C Hub', 'Electronics', 39.5], ['Noise-Cancel Headphones', 'Electronics', 199.0], ['4K Monitor', 'Electronics', 329.0], ['Desk Lamp', 'Home', 34.0], ['Ergonomic Chair', 'Home', 249.0], ['Standing Desk', 'Home', 419.0], ['Coffee Grinder', 'Kitchen', 59.0], ['French Press', 'Kitchen', 29.0], ['Chef Knife', 'Kitchen', 74.0], ['Cast Iron Pan', 'Kitchen', 45.0], ['Notebook (3-pack)', 'Office', 12.0], ['Gel Pens', 'Office', 8.5], ['Backpack', 'Outdoors', 79.0], ['Water Bottle', 'Outdoors', 22.0], ['Yoga Mat', 'Fitness', 35.0], ['Dumbbell Set', 'Fitness', 129.0], ['Running Shoes', 'Fitness', 110.0], ['Board Game', 'Toys', 39.0]];
    let s = `CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE, city TEXT, country TEXT, joined DATE);
CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT NOT NULL, category TEXT, price REAL, stock INTEGER);
CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER REFERENCES customers(id), order_date DATE, status TEXT);
CREATE TABLE order_items (order_id INTEGER REFERENCES orders(id), product_id INTEGER REFERENCES products(id), quantity INTEGER, unit_price REAL);
`;
    for (let i = 1; i <= 60; i++) { const f = pick(first), l = pick(last), c = pick(cities); s += `INSERT INTO customers VALUES (${i}, '${f} ${l}', '${f.toLowerCase()}.${l.toLowerCase().replace('ü', 'u')}${i}@mail.com', '${c[0]}', '${c[1]}', '2024-${String(1 + Math.floor(rnd() * 12)).padStart(2, '0')}-${String(1 + Math.floor(rnd() * 28)).padStart(2, '0')}');\n`; }
    prods.forEach((p, i) => (s += `INSERT INTO products VALUES (${i + 1}, '${p[0]}', '${p[1]}', ${p[2]}, ${Math.floor(rnd() * 200)});\n`));
    for (let o = 1; o <= 300; o++) { const m = 1 + Math.floor(rnd() * 12), d = 1 + Math.floor(rnd() * 28); s += `INSERT INTO orders VALUES (${o}, ${1 + Math.floor(rnd() * 60)}, '2025-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}', '${pick(['delivered', 'delivered', 'delivered', 'shipped', 'processing', 'cancelled'])}');\n`; const n = 1 + Math.floor(rnd() * 4); const used = new Set(); for (let k = 0; k < n; k++) { const pi = Math.floor(rnd() * prods.length); if (used.has(pi)) continue; used.add(pi); s += `INSERT INTO order_items VALUES (${o}, ${pi + 1}, ${1 + Math.floor(rnd() * 3)}, ${prods[pi][2]});\n`; } }
    return s;
  }
  const CHALLENGES = [
    ['All products', 'List every product name and price, most expensive first.', 'SELECT name, price FROM products ORDER BY price DESC;'],
    ['Kitchen gear', 'Show the names of products in the Kitchen category.', "SELECT name FROM products WHERE category = 'Kitchen';"],
    ['Customers per country', 'Count customers in each country (columns: country, n), largest first.', 'SELECT country, COUNT(*) AS n FROM customers GROUP BY country ORDER BY n DESC, country;'],
    ['Low stock', 'Which products have fewer than 20 units in stock? Show name and stock.', 'SELECT name, stock FROM products WHERE stock < 20;'],
    ['Order statuses', 'How many orders are there in each status?', 'SELECT status, COUNT(*) FROM orders GROUP BY status;'],
    ['Revenue', 'What is the total revenue (quantity × unit_price) of all non-cancelled orders? Return one number.', "SELECT ROUND(SUM(oi.quantity * oi.unit_price), 2) FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.status <> 'cancelled';"],
    ['Best sellers', 'Top 5 products by total quantity sold (name, total).', 'SELECT p.name, SUM(oi.quantity) AS total FROM order_items oi JOIN products p ON p.id = oi.product_id GROUP BY p.id ORDER BY total DESC, p.name LIMIT 5;'],
    ['Monthly sales', 'Revenue per month in 2025 (month as YYYY-MM, revenue), in order.', "SELECT strftime('%Y-%m', o.order_date) AS month, ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue FROM orders o JOIN order_items oi ON oi.order_id = o.id GROUP BY month ORDER BY month;"],
    ['Big spenders', 'Names of customers who spent more than $1,500 in total, highest first (name, spent).', 'SELECT c.name, ROUND(SUM(oi.quantity * oi.unit_price), 2) AS spent FROM customers c JOIN orders o ON o.customer_id = c.id JOIN order_items oi ON oi.order_id = o.id GROUP BY c.id HAVING spent > 1500 ORDER BY spent DESC;'],
    ['Never ordered', 'Customers who have never placed an order (name).', 'SELECT name FROM customers WHERE id NOT IN (SELECT customer_id FROM orders);'],
    ['Category share', 'Revenue per category (category, revenue), highest first.', 'SELECT p.category, ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue FROM order_items oi JOIN products p ON p.id = oi.product_id GROUP BY p.category ORDER BY revenue DESC;'],
    ['Window ranking', 'For each category, the most expensive product (category, name, price) — try a window function!', 'SELECT category, name, price FROM (SELECT category, name, price, RANK() OVER (PARTITION BY category ORDER BY price DESC) AS rk FROM products) WHERE rk = 1 ORDER BY category;'],
  ];
  const EXAMPLES = ['SELECT * FROM customers LIMIT 10;', "SELECT category, COUNT(*) AS products, ROUND(AVG(price), 2) AS avg_price\nFROM products GROUP BY category ORDER BY avg_price DESC;", "SELECT strftime('%m', order_date) AS month, COUNT(*) AS orders\nFROM orders GROUP BY month;", "WITH spend AS (\n  SELECT o.customer_id, SUM(oi.quantity * oi.unit_price) AS total\n  FROM orders o JOIN order_items oi ON oi.order_id = o.id GROUP BY o.customer_id\n)\nSELECT c.name, c.city, ROUND(s.total, 2) AS total\nFROM spend s JOIN customers c ON c.id = s.customer_id\nORDER BY total DESC LIMIT 10;"];

  MS.register({
    id: 'sqllab', name: 'SQL Lab', icon: '🛢', group: 'Develop', desc: 'Real SQLite in your browser + SQL challenges', keywords: 'sql sqlite database query select join wasm learn challenges csv',
    async mount(view) {
      const st = await MS.store('sqllab', () => ({ query: EXAMPLES[1], history: [], saved: [], solved: {}, tab: 'results' }));
      const wrap = h('div', { style: { display: 'flex', height: '100%', minHeight: 0 } }); view.append(wrap);
      const side = h('div.col.sql-side', { style: { width: '230px', flex: 'none', borderRight: '1px solid var(--line)', padding: '10px', gap: '8px', overflow: 'auto' } });
      const main = h('div.col', { style: { flex: 1, minWidth: 0, padding: '12px', gap: '10px', overflow: 'auto' } }); wrap.append(side, main);
      main.append(h('div.empty', '⏳ Loading SQLite (WebAssembly)…'));
      let SQL, db;
      try { SQL = await loadSQL(); } catch (e) { main.innerHTML = ''; main.append(h('div.empty', '⚠️ ' + e.message + ' — SQL Lab needs to download SQLite once (≈1 MB).')); return {}; }
      const saved = await MS.db.get('sqllab:db'); db = saved ? new SQL.Database(new Uint8Array(saved)) : new SQL.Database(); if (!saved) db.run(seedSQL());
      const persist = MS.debounce(() => MS.db.set('sqllab:db', db.export()), 500);
      const ta = h('textarea.input.mono', { spellcheck: false, rows: 8, style: { width: '100%', minHeight: '150px', fontSize: '13px', lineHeight: 1.5, resize: 'vertical', tabSize: 2 } }, st.data.query);
      ta.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); } if (e.key === 'Tab') { e.preventDefault(); ta.setRangeText('  ', ta.selectionStart, ta.selectionEnd, 'end'); } });
      ta.addEventListener('input', () => { st.data.query = ta.value; st.touch(); });
      const out = h('div.col', { style: { gap: '12px' } }); const info = h('span.small.muted');
      let lastRes = null;
      function table(res) {
        const max = 500; const rows = res.values.slice(0, max);
        return h('div', { style: { overflow: 'auto', maxHeight: '50vh', border: '1px solid var(--line)', borderRadius: '10px' } }, h('table', { style: { borderCollapse: 'collapse', fontSize: '13px', width: '100%' } },
          h('thead', h('tr', h('th', { style: th }, '#'), ...res.columns.map((c) => h('th', { style: th }, c)))),
          h('tbody', ...rows.map((r, i) => h('tr', h('td', { style: { ...td, color: 'var(--muted)' } }, i + 1), ...r.map((v) => h('td', { style: { ...td, textAlign: typeof v === 'number' ? 'right' : 'left', color: v == null ? 'var(--muted)' : '' } }, v == null ? 'NULL' : v instanceof Uint8Array ? `<blob ${v.length}B>` : String(v))))))),
          res.values.length > max ? h('div.small.muted', { style: { padding: '6px' } }, `…showing ${max} of ${res.values.length} rows`) : null);
      }
      const th = { position: 'sticky', top: 0, background: 'var(--panel2)', padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--line)', whiteSpace: 'nowrap' }, td = { padding: '4px 10px', borderBottom: '1px solid var(--line)', whiteSpace: 'nowrap', maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis' };
      function chart(res) {
        const cv = h('canvas', { style: { width: '100%', height: '240px' } });
        requestAnimationFrame(() => { const g = cv.getContext('2d'); const W = cv.clientWidth, H = 240; cv.width = W * devicePixelRatio; cv.height = H * devicePixelRatio; g.scale(devicePixelRatio, devicePixelRatio); const css = getComputedStyle(cv); const data = res.values.slice(0, 40).map((r) => [String(r[0]), +r[1] || 0]); const max = Math.max(...data.map((d) => d[1]), 1); const bw = (W - 60) / data.length; g.font = '11px system-ui'; g.fillStyle = css.getPropertyValue('--muted'); g.textAlign = 'right'; for (let k = 0; k <= 4; k++) { const y = H - 30 - (H - 50) * k / 4; g.fillText(+(max * k / 4).toFixed(2), 52, y + 4); g.fillStyle = css.getPropertyValue('--line'); g.fillRect(56, y, W - 56, 1); g.fillStyle = css.getPropertyValue('--muted'); }
          data.forEach(([l, v], i) => { const bh = (H - 50) * v / max; g.fillStyle = `hsl(${250 + i * 9} 70% 60%)`; g.beginPath(); g.roundRect(60 + i * bw + bw * 0.12, H - 30 - bh, bw * 0.76, bh, 4); g.fill(); g.fillStyle = css.getPropertyValue('--muted'); g.save(); g.translate(60 + i * bw + bw / 2, H - 16); if (data.length > 10) g.rotate(-0.5); g.textAlign = 'center'; g.fillText(l.length > 12 ? l.slice(0, 11) + '…' : l, 0, 0); g.restore(); }); });
        return cv;
      }
      function run(sql = ta.value) {
        out.innerHTML = ''; const t0 = performance.now(); let results;
        try { results = db.exec(sql); } catch (e) { out.append(h('div.card', { style: { borderLeft: '4px solid var(--bad)', color: 'var(--bad)' } }, '✕ ' + e.message)); info.textContent = ''; return null; }
        const ms = (performance.now() - t0).toFixed(1); const isRead = /^\s*(select|with|pragma|explain)/i.test(sql) && !/;\s*\S/.test(sql.trim().replace(/;\s*$/, '')); const changes = isRead ? 0 : db.getRowsModified();
        info.textContent = `✓ ${results.length} result set${results.length === 1 ? '' : 's'} · ${ms} ms${changes ? ` · ${changes} row${changes > 1 ? 's' : ''} changed` : ''}`;
        if (!isRead) { persist(); renderSchema(); }
        st.data.history = [sql.trim(), ...st.data.history.filter((x) => x !== sql.trim())].slice(0, 30); st.touch(); renderSide();
        if (!results.length) out.append(h('div.card', '✓ Statement executed.' + (changes ? ` ${changes} row(s) affected.` : '')));
        results.forEach((res) => { lastRes = res; const numeric = res.columns.length >= 2 && res.values.length > 1 && res.values.every((r) => typeof r[1] === 'number'); let showChart = false; const holder = h('div'); const draw = () => { holder.innerHTML = ''; holder.append(showChart ? chart(res) : table(res)); };
          out.append(h('div.col', { style: { gap: '6px' } }, h('div.row', h('span.small.muted', `${res.values.length} row${res.values.length === 1 ? '' : 's'} × ${res.columns.length} col`), h('div.spacer'), numeric ? h('button.btn.sm', { on: { click: (e) => { showChart = !showChart; e.target.textContent = showChart ? '▦ Table' : '📊 Chart'; draw(); } } }, '📊 Chart') : null, h('button.btn.sm', { on: { click: () => MS.download('result.csv', [res.columns, ...res.values].map((r) => r.map((v) => (v == null ? '' : /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v)).join(',')).join('\n'), 'text/csv') } }, '⬇ CSV')), holder)); draw(); });
        return results;
      }
      // ----- side: schema, examples, history -----
      const schemaEl = h('div.col', { style: { gap: '2px' } });
      function renderSchema() {
        schemaEl.innerHTML = ''; let tables = []; try { tables = db.exec("SELECT name, type FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY name")[0]?.values || []; } catch {}
        tables.forEach(([t, type]) => { const cols = db.exec(`PRAGMA table_info("${t}")`)[0]?.values || []; const n = db.exec(`SELECT COUNT(*) FROM "${t}"`)[0].values[0][0]; let open = false; const colsEl = h('div.col', { style: { display: 'none', paddingLeft: '14px', gap: '1px' } }, cols.map((c) => h('div.small', { style: { cursor: 'pointer' }, title: 'Insert column name', on: { click: () => { ta.setRangeText(c[1], ta.selectionStart, ta.selectionEnd, 'end'); ta.focus(); } } }, h('span', c[5] ? '🔑 ' : '· ', c[1]), h('span.muted', ' ' + (c[2] || '').toLowerCase()))));
          schemaEl.append(h('div.row', { style: { gap: '4px', cursor: 'pointer', padding: '3px 4px', borderRadius: '6px' }, on: { click: () => { open = !open; colsEl.style.display = open ? '' : 'none'; } } }, h('span', type === 'view' ? '👁' : '▦'), h('b.small', { style: { flex: 1 } }, t), h('span.small.muted', n), h('button.icon-btn', { title: 'Preview', on: { click: (e) => { e.stopPropagation(); ta.value = `SELECT * FROM ${t} LIMIT 50;`; st.data.query = ta.value; run(); } } }, '▶')), colsEl); });
      }
      const histEl = h('div.col', { style: { gap: '3px' } });
      function renderSide() { histEl.innerHTML = ''; [...st.data.saved.map((q) => ['⭐', q]), ...st.data.history.slice(0, 12).map((q) => ['🕘', q])].forEach(([ic, q]) => histEl.append(h('div.small.mono', { style: { cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '2px 4px', borderRadius: '4px' }, title: q, on: { click: () => { ta.value = q; st.data.query = q; st.touch(); } } }, ic + ' ' + q.replace(/\s+/g, ' ')))); }
      side.append(h('b.small.muted', 'SCHEMA'), schemaEl, h('b.small.muted', { style: { marginTop: '8px' } }, 'EXAMPLES'), ...EXAMPLES.map((q, i) => h('button.btn.sm', { style: { justifyContent: 'flex-start' }, on: { click: () => { ta.value = q; st.data.query = q; run(); } } }, ['Browse customers', 'Category stats', 'Orders by month', 'Top spenders (CTE)'][i])), h('b.small.muted', { style: { marginTop: '8px' } }, 'SAVED & HISTORY'), histEl);
      renderSchema(); renderSide();
      // ----- challenges -----
      const chalEl = h('div.col', { style: { gap: '6px' } });
      const same = (a, b) => a && b && a.values.length === b.values.length && a.values.every((r, i) => r.length === b.values[i].length && r.every((v, j) => (typeof v === 'number' && typeof b.values[i][j] === 'number' ? Math.abs(v - b.values[i][j]) < 0.01 : String(v) === String(b.values[i][j]))));
      function renderChal() {
        chalEl.innerHTML = ''; const n = Object.keys(st.data.solved).length;
        chalEl.append(h('div.row', h('b', `🏆 SQL challenges · ${n}/${CHALLENGES.length} solved`), h('div.spacer'), h('span.small.muted', 'Write a query in the editor, then press Check')));
        CHALLENGES.forEach(([title, task, ans], i) => chalEl.append(h('div.card.row', { style: { gap: '10px', padding: '10px', flexWrap: 'wrap' } }, h('span', st.data.solved[i] ? '✅' : '⬜'), h('div.col', { style: { gap: '2px', flex: 1, minWidth: '200px' } }, h('b.small', `${i + 1}. ${title}`), h('span.small', task)),
          h('button.btn.sm.primary', { on: { click: () => { let mine, want; try { mine = db.exec(ta.value).at(-1); want = db.exec(ans)[0]; } catch (e) { return MS.toast('Query error: ' + e.message, 'bad'); } run(); if (same(mine, want)) { st.data.solved[i] = 1; st.touch(); MS.toast('✅ Correct!', 'good'); renderChal(); } else MS.toast(`Not quite — expected ${want?.values.length ?? 0} row(s) × ${want?.columns.length ?? 0} col(s)`, 'bad'); } } }, 'Check'), h('button.btn.sm', { on: { click: () => { ta.value = '-- ' + title + '\n' + ans; st.data.query = ta.value; st.touch(); MS.toast('Solution loaded into the editor'); } } }, '💡'))));
      }
      renderChal();
      // ----- toolbar -----
      MS.setActions(
        h('button.btn.sm', { on: { click: async () => { const f = await MS.pickFile('.sqlite,.db,.sqlite3,.csv'); if (!f) return; if (/\.csv$/i.test(f.name)) { const txt = await f.text(); const rows = MS.parseCSV ? MS.parseCSV(txt) : txt.trim().split(/\r?\n/).map((l) => l.split(',')); const name = (await MS.prompt('Table name', f.name.replace(/\.csv$/i, '').replace(/\W+/g, '_'))) || 'imported'; const cols = rows[0].map((c, i) => (c || 'col' + i).replace(/\W+/g, '_')); db.run(`DROP TABLE IF EXISTS "${name}"; CREATE TABLE "${name}" (${cols.map((c) => `"${c}"`).join(', ')});`); const stmt = db.prepare(`INSERT INTO "${name}" VALUES (${cols.map(() => '?').join(',')})`); rows.slice(1).forEach((r) => { if (r.length > 1 || r[0]) stmt.run(cols.map((_, i) => (r[i] !== undefined && r[i] !== '' && !isNaN(+r[i]) ? +r[i] : r[i] ?? null))); }); stmt.free(); persist(); renderSchema(); MS.toast(`Imported ${rows.length - 1} rows into ${name}`, 'good'); } else { db = new SQL.Database(new Uint8Array(await f.arrayBuffer())); persist(); renderSchema(); MS.toast('Opened ' + f.name, 'good'); } } } }, '📂 Open / CSV'),
        h('button.btn.sm', { on: { click: () => MS.download('megastudio.sqlite', db.export(), 'application/x-sqlite3') } }, '💾 .sqlite'),
        h('button.btn.sm', { on: { click: async () => { if (await MS.confirm('Reset to the sample database?', 'All your tables and changes will be replaced.')) { db = new SQL.Database(); db.run(seedSQL()); persist(); renderSchema(); MS.toast('Sample database restored'); } } } }, '↺ Reset'));
      main.innerHTML = '';
      main.append(h('div.row', { style: { flexWrap: 'wrap' } }, h('b', '🛢 SQLite ' + (db.exec('select sqlite_version()')[0].values[0][0])), h('span.small.muted', 'Ctrl/⌘ + Enter to run'), h('div.spacer'), h('button.btn.sm', { on: { click: () => { const q = ta.value.trim(); if (q && !st.data.saved.includes(q)) { st.data.saved.unshift(q); st.touch(); renderSide(); MS.toast('Saved query ⭐'); } } } }, '⭐ Save'), h('button.btn.primary', { on: { click: () => run() } }, '▶ Run')), ta, info, out, chalEl);
      run();
      return { unmount() { persist(); } };
    },
  });
})();
