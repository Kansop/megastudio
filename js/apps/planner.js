/* Finance Planner: savings goals with deposits & projections, debt payoff (snowball vs avalanche),
   compound-growth calculator, and a loan/mortgage amortization schedule */
(function () {
  const { h } = MS;
  const uid = () => Math.random().toString(36).slice(2, 9);
  const money = (v, d = 0) => (v < 0 ? '-' : '') + '$' + Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
  const addMonths = (d, n) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
  const monthLabel = (d) => d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  function chart(cv, series, { stacked = false, fmt = money, xLabels = [] } = {}) {
    const g = cv.getContext('2d'); const dpr = devicePixelRatio || 1; const W = cv.clientWidth || 600, H = cv.clientHeight || 220; cv.width = W * dpr; cv.height = H * dpr; g.scale(dpr, dpr);
    const css = getComputedStyle(cv); const P = { l: 64, r: 12, t: 12, b: 24 }; const n = Math.max(...series.map((s) => s.data.length)); if (n < 2) return;
    const sums = Array.from({ length: n }, (_, i) => series.reduce((a, s) => a + (s.data[i] || 0), 0)); const max = Math.max(1, ...(stacked ? sums : series.flatMap((s) => s.data))) * 1.05;
    const X = (i) => P.l + (i / (n - 1)) * (W - P.l - P.r), Y = (v) => H - P.b - (v / max) * (H - P.t - P.b);
    g.font = '11px system-ui'; g.fillStyle = css.getPropertyValue('--muted'); g.strokeStyle = css.getPropertyValue('--line'); g.textAlign = 'right'; g.textBaseline = 'middle';
    for (let k = 0; k <= 4; k++) { const v = (max / 4) * k; g.beginPath(); g.moveTo(P.l, Y(v)); g.lineTo(W - P.r, Y(v)); g.stroke(); g.fillText(fmt(v), P.l - 6, Y(v)); }
    g.textAlign = 'center'; const step = Math.ceil(n / 8); xLabels.forEach((l, i) => { if (i % step === 0) g.fillText(l, X(i), H - 10); });
    const base = Array(n).fill(0);
    series.forEach((s) => { g.beginPath(); for (let i = 0; i < n; i++) { const v = (s.data[i] || 0) + (stacked ? base[i] : 0); i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v)); } if (s.fill) { for (let i = n - 1; i >= 0; i--) g.lineTo(X(i), Y(stacked ? base[i] : 0)); g.closePath(); g.globalAlpha = 0.35; g.fillStyle = s.color; g.fill(); g.globalAlpha = 1; } else { g.strokeStyle = s.color; g.lineWidth = 2.5; g.stroke(); g.lineWidth = 1; } if (stacked) for (let i = 0; i < n; i++) base[i] += s.data[i] || 0; });
  }
  const legend = (items) => h('div.row', { style: { flexWrap: 'wrap', gap: '12px' } }, items.map(([c, l]) => h('span.small', h('span', { style: { display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', background: c, marginRight: '5px' } }), l)));
  const num = (label, value, on, { step = 1, min = 0, suffix = '' } = {}) => { const i = h('input.input', { type: 'number', value, step, min, style: { width: '110px' }, on: { input: () => on(+i.value || 0) } }); return h('label.col', { style: { gap: '2px' } }, h('span.small.muted', label + (suffix ? ` (${suffix})` : '')), i); };

  MS.register({
    id: 'planner', name: 'Finance Planner', icon: '🎯', group: 'Productivity', desc: 'Savings goals, debt payoff & growth calculators', keywords: 'budget goals savings debt payoff snowball avalanche compound interest retirement loan mortgage amortization finance',
    async mount(view) {
      const st = await MS.store('planner', () => ({ tab: 'goals', goals: [
        { id: uid(), name: 'Emergency fund', icon: '🛟', target: 6000, saved: 1850, monthly: 300, deadline: '', color: '#22c55e', log: [] },
        { id: uid(), name: 'New laptop', icon: '💻', target: 1800, saved: 640, monthly: 150, deadline: '', color: '#6366f1', log: [] },
        { id: uid(), name: 'Summer trip', icon: '✈️', target: 2500, saved: 300, monthly: 250, deadline: '', color: '#f59e0b', log: [] }],
        debts: [{ id: uid(), name: 'Credit card', bal: 4200, apr: 24.9, min: 120 }, { id: uid(), name: 'Car loan', bal: 9800, apr: 6.5, min: 260 }, { id: uid(), name: 'Student loan', bal: 15500, apr: 4.8, min: 170 }], extra: 200,
        grow: { start: 5000, monthly: 400, rate: 7, years: 25, inflation: 2.5 }, loan: { amount: 300000, rate: 6.5, years: 30, extra: 0, tax: 3600, ins: 1500 } }));
      const D = st.data; const save = () => st.touch();
      const wrap = h('div.pad.col', { style: { gap: '14px', maxWidth: '1100px', margin: '0 auto' } }); view.append(wrap);
      const tabsEl = h('div.row', { style: { flexWrap: 'wrap' } }); const body = h('div.col', { style: { gap: '14px' } }); wrap.append(tabsEl, body);
      const TABS = [['goals', '🎯 Savings goals'], ['debt', '💳 Debt payoff'], ['grow', '📈 Compound growth'], ['loan', '🏠 Loan calculator']];
      let ro = null;
      function render() { ro?.disconnect(); tabsEl.innerHTML = ''; TABS.forEach(([k, l]) => tabsEl.append(h('button.btn', { class: D.tab === k ? 'on' : '', on: { click: () => { D.tab = k; save(); render(); } } }, l))); body.innerHTML = ''; ({ goals, debt, grow, loan })[D.tab](); }
      const watch = (cv, fn) => { ro = new ResizeObserver(() => fn()); ro.observe(cv); };

      /* ---------- goals ---------- */
      function goals() {
        const total = D.goals.reduce((a, g) => a + g.target, 0), saved = D.goals.reduce((a, g) => a + Math.min(g.saved, g.target), 0), monthly = D.goals.reduce((a, g) => a + (g.saved < g.target ? g.monthly : 0), 0);
        body.append(h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: '10px' } }, [['Saved so far', money(saved)], ['Total targets', money(total)], ['Overall progress', total ? Math.round(saved / total * 100) + '%' : '—'], ['Monthly contributions', money(monthly)]].map(([l, v]) => h('div.card', h('div.small.muted', l), h('div', { style: { fontSize: '22px', fontWeight: 700 } }, v)))));
        const grid = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '12px' } });
        D.goals.forEach((gl) => {
          const pct = Math.min(1, gl.saved / gl.target); const left = Math.max(0, gl.target - gl.saved); const months = gl.monthly > 0 ? Math.ceil(left / gl.monthly) : Infinity; const eta = isFinite(months) ? addMonths(new Date(), months) : null;
          let deadlineNote = null; if (gl.deadline && left > 0) { const dl = new Date(gl.deadline + 'T12:00'); const mLeft = Math.max(1, (dl.getFullYear() - new Date().getFullYear()) * 12 + dl.getMonth() - new Date().getMonth()); const need = left / mLeft; deadlineNote = h('div.small', { style: { color: need > gl.monthly ? 'var(--bad)' : 'var(--good)' } }, need > gl.monthly ? `⚠ Need ${money(need)}/mo to hit ${monthLabel(dl)}` : `✔ On track for ${monthLabel(dl)}`); }
          const ring = h('canvas', { width: 120, height: 120, style: { width: '84px', height: '84px', flexShrink: 0 } }); { const g = ring.getContext('2d'); g.lineWidth = 12; g.strokeStyle = 'rgba(128,128,128,.2)'; g.beginPath(); g.arc(60, 60, 50, 0, 7); g.stroke(); g.strokeStyle = gl.color; g.lineCap = 'round'; g.beginPath(); g.arc(60, 60, 50, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2); g.stroke(); g.font = '28px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(pct >= 1 ? '🏆' : gl.icon, 60, 62); }
          const amt = (sign) => async () => { const v = parseFloat(await MS.prompt(sign > 0 ? 'Add to ' + gl.name : 'Withdraw from ' + gl.name, String(gl.monthly))); if (!v) return; gl.saved = Math.max(0, gl.saved + sign * v); gl.log.unshift({ d: new Date().toISOString().slice(0, 10), v: sign * v }); save(); if (gl.saved >= gl.target && sign > 0) MS.toast('🎉 Goal reached: ' + gl.name + '!', 'good'); render(); };
          grid.append(h('div.card.col', { style: { gap: '8px', borderTop: `4px solid ${gl.color}` } },
            h('div.row', { style: { gap: '12px' } }, ring, h('div.col', { style: { gap: '2px', flex: 1 } }, h('b', gl.name), h('div', { style: { fontSize: '20px', fontWeight: 700 } }, money(gl.saved), h('span.small.muted', ' / ' + money(gl.target))), h('div.small.muted', `${Math.round(pct * 100)}% · ${left ? money(left) + ' to go' : 'complete!'}`))),
            left ? h('div.small', eta ? `At ${money(gl.monthly)}/mo → ${monthLabel(eta)} (${months} mo)` : 'Set a monthly amount to see a finish date') : null, deadlineNote,
            h('div.row', { style: { flexWrap: 'wrap' } }, h('button.btn.sm.primary', { on: { click: amt(1) } }, '＋ Deposit'), h('button.btn.sm', { on: { click: amt(-1) } }, '− Withdraw'), h('button.btn.sm', { on: { click: () => editGoal(gl) } }, '✏️'), h('button.btn.sm', { on: { click: async () => { if (await MS.confirm('Delete goal "' + gl.name + '"?')) { D.goals = D.goals.filter((x) => x !== gl); save(); render(); } } } }, '🗑')),
            gl.log.length ? h('div.small.muted', 'Recent: ' + gl.log.slice(0, 3).map((x) => `${x.v > 0 ? '+' : ''}${money(x.v)} (${x.d.slice(5)})`).join(' · ')) : null));
        });
        grid.append(h('button.card', { style: { border: '2px dashed var(--line)', background: 'transparent', minHeight: '150px', cursor: 'pointer', fontSize: '16px', color: 'var(--muted)' }, on: { click: () => editGoal() } }, '＋ New goal'));
        // projection chart
        const cv = h('canvas', { style: { width: '100%', height: '220px' } }); const months = Math.min(60, Math.max(6, ...D.goals.map((g) => (g.monthly > 0 ? Math.ceil(Math.max(0, g.target - g.saved) / g.monthly) : 0)))) + 1;
        const series = D.goals.map((g) => ({ color: g.color, fill: true, data: Array.from({ length: months }, (_, i) => Math.min(g.target, g.saved + g.monthly * i)) }));
        const labels = Array.from({ length: months }, (_, i) => monthLabel(addMonths(new Date(), i)));
        body.append(grid, h('div.card.col', { style: { gap: '8px' } }, h('b', 'Projected savings'), legend(D.goals.map((g) => [g.color, g.name])), cv));
        const draw = () => chart(cv, series, { stacked: true, xLabels: labels }); requestAnimationFrame(draw); watch(cv, draw);
      }
      function editGoal(gl) {
        const isNew = !gl; gl = gl || { id: uid(), name: '', icon: '🎯', target: 1000, saved: 0, monthly: 100, deadline: '', color: ['#22c55e', '#6366f1', '#f59e0b', '#ec4899', '#06b6d4', '#ef4444'][D.goals.length % 6], log: [] };
        const f = (ph, v, type = 'text') => h('input.input', { placeholder: ph, value: v, type });
        const name = f('Goal name', gl.name), icon = f('Emoji', gl.icon), target = f('Target', gl.target, 'number'), saved = f('Saved', gl.saved, 'number'), monthly = f('Monthly', gl.monthly, 'number'), deadline = f('', gl.deadline, 'date'), color = h('input', { type: 'color', value: gl.color });
        icon.style.width = '64px';
        const row = (l, el) => h('label.row', h('span.small.muted', { style: { width: '110px' } }, l), el);
        const close = MS.modal(h('div.col', { style: { gap: '8px', minWidth: 'min(380px, 80vw)' } }, h('h2', isNew ? 'New savings goal' : 'Edit goal'), h('div.row', icon, name), row('Target $', target), row('Saved so far $', saved), row('Monthly $', monthly), row('Deadline (opt.)', deadline), row('Color', color),
          h('div.row', h('div.spacer'), h('button.btn', { on: { click: () => close() } }, 'Cancel'), h('button.btn.primary', { on: { click: () => { if (!name.value.trim()) return MS.toast('Name it', 'bad'); Object.assign(gl, { name: name.value.trim(), icon: icon.value || '🎯', target: Math.max(1, +target.value), saved: Math.max(0, +saved.value), monthly: Math.max(0, +monthly.value), deadline: deadline.value, color: color.value }); if (isNew) D.goals.push(gl); save(); close(); render(); } } }, 'Save'))));
      }

      /* ---------- debt ---------- */
      function simulate(debts, extra, order) {
        let ds = debts.map((d) => ({ ...d })); const hist = []; let month = 0, interest = 0; const paidOff = {};
        const budget = ds.reduce((a, d) => a + d.min, 0) + extra;
        while (ds.some((d) => d.bal > 0.005) && month < 600) {
          month++; ds.forEach((d) => { if (d.bal > 0) { const i = d.bal * d.apr / 1200; d.bal += i; interest += i; } });
          let pool = budget; ds.forEach((d) => { if (d.bal > 0) { const p = Math.min(d.min, d.bal); d.bal -= p; pool -= p; } });
          const targets = ds.filter((d) => d.bal > 0.005).sort(order === 'avalanche' ? (a, b) => b.apr - a.apr : (a, b) => a.bal - b.bal);
          for (const d of targets) { if (pool <= 0) break; const p = Math.min(pool, d.bal); d.bal -= p; pool -= p; }
          ds.forEach((d) => { if (d.bal <= 0.005 && !paidOff[d.id]) { d.bal = 0; paidOff[d.id] = month; } });
          hist.push(ds.map((d) => d.bal));
        }
        return { months: month, interest, hist, paidOff, stuck: month >= 600 };
      }
      function debt() {
        const list = h('div.col', { style: { gap: '6px' } });
        D.debts.forEach((d) => { const inp = (k, w, step = 1) => h('input.input', { type: k === 'name' ? 'text' : 'number', value: d[k], step, style: { width: w }, on: { change: (e) => { d[k] = k === 'name' ? e.target.value : +e.target.value || 0; save(); render(); } } });
          list.append(h('div.row', { style: { flexWrap: 'wrap', gap: '6px' } }, inp('name', '150px'), h('span.small.muted', '$'), inp('bal', '100px', 100), h('span.small.muted', 'APR %'), inp('apr', '70px', 0.1), h('span.small.muted', 'min $'), inp('min', '80px', 10), h('button.icon-btn', { on: { click: () => { D.debts = D.debts.filter((x) => x !== d); save(); render(); } } }, '✕'))); });
        const extra = h('input.input', { type: 'number', value: D.extra, step: 25, style: { width: '100px' }, on: { change: () => { D.extra = +extra.value || 0; save(); render(); } } });
        body.append(h('div.card.col', { style: { gap: '8px' } }, h('b', 'Your debts'), list, h('div.row', { style: { flexWrap: 'wrap' } }, h('button.btn.sm', { on: { click: () => { D.debts.push({ id: uid(), name: 'New debt', bal: 1000, apr: 10, min: 50 }); save(); render(); } } }, '＋ Add debt'), h('div.spacer'), h('span.small.muted', 'Extra payment / month $'), extra)));
        if (!D.debts.length) return body.append(h('div.empty', 'Add a debt to build a payoff plan. 🎉 Or celebrate being debt-free!'));
        const base = simulate(D.debts, 0, 'avalanche'), snow = simulate(D.debts, D.extra, 'snowball'), aval = simulate(D.debts, D.extra, 'avalanche');
        const free = (s) => (s.stuck ? 'Never (payments too low)' : monthLabel(addMonths(new Date(), s.months)) + ` (${Math.floor(s.months / 12)}y ${s.months % 12}m)`);
        const card = (title, s, sub, hi) => h('div.card.col', { style: { gap: '4px', outline: hi ? '2px solid var(--good)' : '' } }, h('b', title), h('div.small.muted', sub), h('div', { style: { fontSize: '18px', fontWeight: 700 } }, free(s)), h('div.small', 'Interest paid: ' + money(s.interest)), s !== base && !base.stuck ? h('div.small', { style: { color: 'var(--good)' } }, `Saves ${money(base.interest - s.interest)} & ${base.months - s.months} months vs. minimums`) : null);
        const best = aval.interest <= snow.interest ? aval : snow;
        body.append(h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: '10px' } }, card('Minimum payments only', base, 'No extra money'), card('❄️ Snowball', snow, 'Smallest balance first — quick wins', best === snow), card('🏔 Avalanche', aval, 'Highest APR first — least interest', best === aval)));
        const COLORS = ['#ef4444', '#f59e0b', '#6366f1', '#22c55e', '#06b6d4', '#ec4899', '#84cc16'];
        const method = h('select.input', h('option', { value: 'aval' }, 'Avalanche plan'), h('option', { value: 'snow' }, 'Snowball plan'));
        const cv = h('canvas', { style: { width: '100%', height: '240px' } }); const order = h('div.small');
        const draw = () => { const s = method.value === 'aval' ? aval : snow; const hist = [D.debts.map((d) => d.bal), ...s.hist]; chart(cv, D.debts.map((d, i) => ({ color: COLORS[i % 7], fill: true, data: hist.map((r) => r[i]) })), { stacked: true, xLabels: hist.map((_, i) => monthLabel(addMonths(new Date(), i))) }); order.textContent = 'Payoff order: ' + D.debts.map((d) => [d.name, s.paidOff[d.id]]).sort((a, b) => (a[1] || 1e9) - (b[1] || 1e9)).map(([n, m]) => `${n} (${m ? monthLabel(addMonths(new Date(), m)) : '—'})`).join(' → '); };
        method.onchange = draw;
        body.append(h('div.card.col', { style: { gap: '8px' } }, h('div.row', h('b', 'Balance over time'), h('div.spacer'), method), legend(D.debts.map((d, i) => [COLORS[i % 7], d.name])), cv, order));
        requestAnimationFrame(draw); watch(cv, draw);
      }

      /* ---------- growth ---------- */
      function grow() {
        const G = D.grow; const cv = h('canvas', { style: { width: '100%', height: '260px' } }); const out = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: '10px' } }); const table = h('div', { style: { maxHeight: '260px', overflow: 'auto' } });
        const calc = () => {
          const contrib = [], interest = [], labels = []; let bal = G.start, paid = G.start; const r = G.rate / 1200;
          for (let y = 0; y <= G.years; y++) { contrib.push(paid); interest.push(Math.max(0, bal - paid)); labels.push(String(new Date().getFullYear() + y)); if (y < G.years) for (let m = 0; m < 12; m++) { bal = bal * (1 + r) + G.monthly; paid += G.monthly; } }
          const real = bal / Math.pow(1 + G.inflation / 100, G.years); const rule72 = G.rate > 0 ? 72 / G.rate : Infinity;
          out.innerHTML = ''; [['Final balance', money(bal)], ['You contributed', money(paid)], ['Growth earned', money(bal - paid)], ["In today's dollars", money(real)], ['Doubles every', isFinite(rule72) ? rule72.toFixed(1) + ' yrs' : '—'], ['4% rule income', money(bal * 0.04 / 12) + '/mo']].forEach(([l, v]) => out.append(h('div.card', h('div.small.muted', l), h('div', { style: { fontSize: '20px', fontWeight: 700 } }, v))));
          table.innerHTML = ''; table.append(h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' } }, h('tr', ['Year', 'Contributed', 'Growth', 'Balance'].map((t) => h('th', { style: { textAlign: 'right', padding: '4px 8px', position: 'sticky', top: 0, background: 'var(--panel)' } }, t))), ...contrib.map((c, i) => h('tr', [labels[i], money(c), money(interest[i]), money(c + interest[i])].map((t) => h('td', { style: { textAlign: 'right', padding: '3px 8px', borderTop: '1px solid var(--line)' } }, t))))));
          chart(cv, [{ color: '#6366f1', fill: true, data: contrib }, { color: '#22c55e', fill: true, data: interest }], { stacked: true, xLabels: labels });
        };
        const set = (k) => (v) => { G[k] = v; save(); calc(); };
        body.append(h('div.card.row', { style: { flexWrap: 'wrap', gap: '14px' } }, num('Starting amount', G.start, set('start'), { step: 500, suffix: '$' }), num('Monthly contribution', G.monthly, set('monthly'), { step: 50, suffix: '$' }), num('Annual return', G.rate, set('rate'), { step: 0.5, suffix: '%' }), num('Years', G.years, set('years'), { min: 1 }), num('Inflation', G.inflation, set('inflation'), { step: 0.5, suffix: '%' })),
          out, h('div.card.col', { style: { gap: '8px' } }, legend([['#6366f1', 'Contributions'], ['#22c55e', 'Compound growth']]), cv), h('div.card', table));
        requestAnimationFrame(calc); watch(cv, calc);
      }

      /* ---------- loan ---------- */
      function loan() {
        const L = D.loan; const cv = h('canvas', { style: { width: '100%', height: '240px' } }); const out = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: '10px' } }); const table = h('div', { style: { maxHeight: '300px', overflow: 'auto' } });
        const calc = () => {
          const r = L.rate / 1200, n = L.years * 12; const pmt = r ? L.amount * r / (1 - Math.pow(1 + r, -n)) : L.amount / n;
          let bal = L.amount, totI = 0, m = 0; const rows = [], bals = [L.amount], intC = [0], prinC = [0];
          while (bal > 0.01 && m < n) { m++; const i = bal * r; let p = Math.min(bal, pmt - i + L.extra); bal -= p; totI += i; rows.push([m, i, p, bal]); if (m % 12 === 0 || bal <= 0.01) { bals.push(bal); intC.push(totI); prinC.push(L.amount - bal); } }
          const baseI = r ? pmt * n - L.amount : 0; const monthlyAll = pmt + (L.tax + L.ins) / 12;
          out.innerHTML = ''; [['Monthly payment (P&I)', money(pmt, 2)], ['With tax & insurance', money(monthlyAll, 2)], ['Total interest', money(totI)], ['Paid off', `${monthLabel(addMonths(new Date(), m))} (${(m / 12).toFixed(1)} yrs)`], ...(L.extra > 0 ? [['Extra payments save', money(baseI - totI) + ` & ${n - m} mo`]] : [])].forEach(([l, v]) => out.append(h('div.card', h('div.small.muted', l), h('div', { style: { fontSize: '19px', fontWeight: 700 } }, v))));
          table.innerHTML = ''; table.append(h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' } }, h('tr', ['Month', 'Interest', 'Principal', 'Balance'].map((t) => h('th', { style: { textAlign: 'right', padding: '4px 8px', position: 'sticky', top: 0, background: 'var(--panel)' } }, t))), ...rows.slice(0, 600).map(([mm, i, p, b]) => h('tr', { style: { background: mm % 12 === 0 ? 'var(--panel2)' : '' } }, [mm, money(i, 2), money(p, 2), money(b, 2)].map((t) => h('td', { style: { textAlign: 'right', padding: '2px 8px', borderTop: '1px solid var(--line)' } }, String(t)))))));
          chart(cv, [{ color: '#ef4444', data: bals }, { color: '#f59e0b', data: intC }, { color: '#22c55e', data: prinC }], { xLabels: bals.map((_, i) => 'Y' + i) });
        };
        const set = (k) => (v) => { L[k] = v; save(); calc(); };
        body.append(h('div.card.row', { style: { flexWrap: 'wrap', gap: '14px' } }, num('Loan amount', L.amount, set('amount'), { step: 1000, suffix: '$' }), num('Interest rate', L.rate, set('rate'), { step: 0.125, suffix: '%' }), num('Term', L.years, set('years'), { min: 1, suffix: 'years' }), num('Extra / month', L.extra, set('extra'), { step: 50, suffix: '$' }), num('Property tax / yr', L.tax, set('tax'), { step: 100, suffix: '$' }), num('Insurance / yr', L.ins, set('ins'), { step: 100, suffix: '$' })),
          out, h('div.card.col', { style: { gap: '8px' } }, legend([['#ef4444', 'Balance'], ['#f59e0b', 'Interest paid'], ['#22c55e', 'Principal paid']]), cv), h('div.card', h('b', 'Amortization schedule'), table));
        requestAnimationFrame(calc); watch(cv, calc);
      }

      render();
      return { unmount() { ro?.disconnect(); } };
    },
  });
})();
