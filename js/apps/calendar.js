/* Calendar: month / week / agenda views, recurring events, kanban due dates, .ics import/export */
(function () {
  const { h } = MS;
  const COLORS = ['#7c5cff', '#ff4fa3', '#3ddc97', '#2fa8ff', '#ffb84f', '#ff5d6c'];
  let store;
  const getStore = async () => (store = store || (await MS.store('calendar', () => ({ events: [{ id: 'e1', title: 'Explore MegaStudio', date: MS.isoDate(), time: '10:00', end: '11:00', color: COLORS[0], repeat: 'none', notes: '' }] }))));
  const parse = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
  function occursOn(e, iso) {
    if (e.date === iso) return true; if (!e.repeat || e.repeat === 'none' || iso < e.date) return false;
    if (e.until && iso > e.until) return false;
    const a = parse(e.date), b = parse(iso);
    switch (e.repeat) {
      case 'daily': return true;
      case 'weekdays': return b.getDay() > 0 && b.getDay() < 6;
      case 'weekly': return a.getDay() === b.getDay();
      case 'biweekly': return a.getDay() === b.getDay() && Math.round((b - a) / 864e5 / 7) % 2 === 0;
      case 'monthly': return a.getDate() === b.getDate();
      case 'yearly': return a.getDate() === b.getDate() && a.getMonth() === b.getMonth();
    }
    return false;
  }
  async function eventsOn(iso) {
    const s = await getStore(); const out = s.data.events.filter((e) => occursOn(e, iso)).map((e) => ({ ...e, src: e }));
    try { const k = await MS.kanbanApi.getStore(); k.data.boards.forEach((b) => b.columns.forEach((c) => c.cards.forEach((card) => { if (card.due === iso) out.push({ id: card.id, title: '📋 ' + card.title, time: '', color: '#ffb84f', kanban: { board: b.id, card: card.id } }); }))); } catch (e) {}
    return out.sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
  }
  MS.calendarApi = { eventsOn, getStore };
  MS.searchProviders.push(async (q) => (await getStore()).data.events.map((e) => ({ icon: '📅', title: e.title, sub: 'Event · ' + e.date + (e.time ? ' ' + e.time : ''), run: () => MS.go('calendar', e.date), score: MS.fuzzy(q, e.title) })));
  const icsDate = (d, t) => d.replace(/-/g, '') + (t ? 'T' + t.replace(':', '') + '00' : '');
  function toICS(events) {
    const rr = { daily: 'FREQ=DAILY', weekly: 'FREQ=WEEKLY', biweekly: 'FREQ=WEEKLY;INTERVAL=2', monthly: 'FREQ=MONTHLY', yearly: 'FREQ=YEARLY', weekdays: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR' };
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MegaStudio//EN'];
    events.forEach((e) => { lines.push('BEGIN:VEVENT', 'UID:' + e.id + '@megastudio', 'SUMMARY:' + e.title.replace(/[,;]/g, '\\$&'), e.time ? 'DTSTART:' + icsDate(e.date, e.time) : 'DTSTART;VALUE=DATE:' + icsDate(e.date)); if (e.time && e.end) lines.push('DTEND:' + icsDate(e.date, e.end)); if (rr[e.repeat]) lines.push('RRULE:' + rr[e.repeat]); if (e.notes) lines.push('DESCRIPTION:' + e.notes.replace(/\n/g, '\\n')); lines.push('END:VEVENT'); });
    lines.push('END:VCALENDAR'); return lines.join('\r\n');
  }
  function fromICS(text) {
    const out = []; let cur = null; text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/).forEach((l) => {
      if (l === 'BEGIN:VEVENT') cur = { id: MS.uid('e'), title: 'Event', color: COLORS[3], repeat: 'none', notes: '', time: '', end: '' };
      else if (l === 'END:VEVENT' && cur) { if (cur.date) out.push(cur); cur = null; }
      else if (cur) { const [k, ...v] = l.split(':'); const val = v.join(':'); const key = k.split(';')[0];
        if (key === 'SUMMARY') cur.title = val.replace(/\\(.)/g, '$1');
        if (key === 'DESCRIPTION') cur.notes = val.replace(/\\n/g, '\n');
        if (key === 'DTSTART' || key === 'DTEND') { const m = val.match(/(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/); if (m) { if (key === 'DTSTART') { cur.date = `${m[1]}-${m[2]}-${m[3]}`; if (m[4]) cur.time = `${m[4]}:${m[5]}`; } else if (m[4]) cur.end = `${m[4]}:${m[5]}`; } }
        if (key === 'RRULE') cur.repeat = /INTERVAL=2/.test(val) ? 'biweekly' : /BYDAY=MO,TU,WE,TH,FR/.test(val) ? 'weekdays' : (val.match(/FREQ=(\w+)/) || [])[1]?.toLowerCase() || 'none'; }
    }); return out;
  }
  MS.register({
    id: 'calendar', name: 'Calendar', icon: '📅', group: 'Productivity', desc: 'Month, week & agenda views', keywords: 'events schedule agenda dates',
    commands: [{ id: 'cal-new', title: 'New calendar event', icon: '📅', key: 'alt+e', run: () => { MS.go('calendar'); setTimeout(() => MS.emit('cal:new'), 60); } }],
    async mount(view) {
      const s = await getStore(); let cursor = new Date(); let viewMode = localStorage.getItem('ms-cal-view') || 'month';
      const body = h('div', { style: { padding: '14px', height: '100%', display: 'flex', flexDirection: 'column' } }); view.append(body);
      const label = h('strong', { style: { minWidth: '170px', textAlign: 'center' } });
      const vbtns = ['month', 'week', 'agenda'].map((v) => h('button.btn', { on: { click: () => { viewMode = v; localStorage.setItem('ms-cal-view', v); render(); } } }, v[0].toUpperCase() + v.slice(1)));
      const step = (n) => { if (viewMode === 'month') cursor = new Date(cursor.getFullYear(), cursor.getMonth() + n, 1); else cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7 * n); render(); };
      MS.setActions(h('button.btn', { on: { click: () => step(-1) } }, '‹'), label, h('button.btn', { on: { click: () => step(1) } }, '›'), h('button.btn', { on: { click: () => { cursor = new Date(); render(); } } }, 'Today'), ...vbtns,
        h('button.btn.primary', { on: { click: () => edit(null, MS.isoDate()) } }, '+ Event'),
        h('button.btn', { title: 'Export .ics', on: { click: () => MS.download('megastudio-calendar.ics', toICS(s.data.events), 'text/calendar') } }, '⬇ .ics'),
        h('button.btn', { title: 'Import .ics', on: { click: async () => { const f = await MS.pickFile('.ics,text/calendar'); if (!f) return; const ev = fromICS(await MS.readText(f)); s.data.events.push(...ev); s.touch(); render(); MS.toast(`Imported ${ev.length} events`); } } }, '⬆ .ics'));
      const off = MS.on('cal:new', () => edit(null, MS.isoDate()));
      const chip = (e) => h('div', { style: { fontSize: '12px', padding: '2px 6px', borderRadius: '6px', background: `color-mix(in srgb, ${e.color} 30%, transparent)`, borderLeft: `3px solid ${e.color}`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }, title: e.title, on: { click: (ev) => { ev.stopPropagation(); e.kanban ? MS.go('kanban', e.kanban.board, e.kanban.card) : edit(e.src); } } }, (e.time ? e.time + ' ' : '') + e.title);
      let tok = 0;
      async function render() {
        const my = ++tok;
        vbtns.forEach((b) => b.classList.toggle('on', b.textContent.toLowerCase() === viewMode));
        body.innerHTML = ''; const today = MS.isoDate();
        if (viewMode === 'month') {
          label.textContent = cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' });
          const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1); const start = new Date(first); start.setDate(1 - first.getDay());
          const grid = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gridAutoRows: 'minmax(96px,1fr)', gap: '6px', flex: 1 } });
          body.append(h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '6px', marginBottom: '6px' } }, ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => h('div.small.muted', { style: { textAlign: 'center' } }, d))), grid);
          for (let i = 0; i < 42; i++) {
            const d = new Date(start); d.setDate(start.getDate() + i); const iso = MS.isoDate(d); const ev = await eventsOn(iso); if (my !== tok) return;
            const cell = h('div', { style: { background: 'var(--panel)', border: '1px solid ' + (iso === today ? 'var(--accent)' : 'var(--line)'), borderRadius: '10px', padding: '6px', opacity: d.getMonth() === cursor.getMonth() ? 1 : 0.45, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '3px', cursor: 'pointer' }, on: { click: () => edit(null, iso) } },
              h('div.small', { style: { fontWeight: iso === today ? 800 : 500, color: iso === today ? 'var(--accent)' : '' } }, d.getDate()), ev.slice(0, 4).map(chip), ev.length > 4 ? h('div.small.muted', `+${ev.length - 4} more`) : null);
            grid.append(cell);
          }
        } else if (viewMode === 'week') {
          const start = new Date(cursor); start.setDate(cursor.getDate() - cursor.getDay());
          const end = new Date(start); end.setDate(start.getDate() + 6);
          label.textContent = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' – ' + end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
          const grid = h('div', { style: { display: 'grid', gridTemplateColumns: '50px repeat(7,1fr)', position: 'relative', overflow: 'auto', flex: 1, border: '1px solid var(--line)', borderRadius: '12px', background: 'var(--panel)' } });
          grid.append(h('div'));
          const days = [...Array(7)].map((_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
          days.forEach((d) => grid.append(h('div.small', { style: { textAlign: 'center', padding: '6px', borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, background: 'var(--panel)', zIndex: 2, fontWeight: MS.isoDate(d) === today ? 800 : 500, color: MS.isoDate(d) === today ? 'var(--accent)' : '' } }, d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }))));
          const HOUR = 44;
          grid.append(h('div', { style: { gridColumn: 1 } }, [...Array(24)].map((_, hr) => h('div.small.muted', { style: { height: HOUR + 'px', textAlign: 'right', paddingRight: '6px', borderTop: '1px solid var(--line)' } }, hr ? `${(hr + 11) % 12 + 1}${hr < 12 ? 'a' : 'p'}` : ''))));
          for (const d of days) {
            const iso = MS.isoDate(d); const ev = await eventsOn(iso); if (my !== tok) return;
            const col = h('div', { style: { position: 'relative', borderLeft: '1px solid var(--line)', height: 24 * HOUR + 'px', backgroundImage: `repeating-linear-gradient(to bottom, var(--line) 0 1px, transparent 1px ${HOUR}px)` }, on: { click: (e) => { const hr = Math.floor((e.offsetY) / HOUR); edit(null, iso, MS.pad(hr) + ':00'); } } });
            ev.forEach((e) => { const [hh, mm] = (e.time || '00:00').split(':').map(Number); const [eh, em] = (e.end || `${hh + 1}:${mm}`).split(':').map(Number); const top = (hh + mm / 60) * HOUR; const ht = Math.max(20, ((eh + em / 60) - (hh + mm / 60)) * HOUR); const c = chip(e); Object.assign(c.style, { position: 'absolute', left: '3px', right: '3px', top: (e.time ? top : 2) + 'px', height: (e.time ? ht : 20) + 'px', whiteSpace: 'normal' }); col.append(c); });
            if (iso === today) { const n = new Date(); col.append(h('div', { style: { position: 'absolute', left: 0, right: 0, top: (n.getHours() + n.getMinutes() / 60) * HOUR + 'px', height: '2px', background: 'var(--bad)' } })); }
            grid.append(col);
          }
          body.append(grid); setTimeout(() => (grid.scrollTop = 7 * HOUR), 0);
        } else {
          label.textContent = 'Next 60 days';
          const listEl = h('div.col', { style: { maxWidth: '760px' } }); body.append(listEl); let any = false;
          for (let i = 0; i < 60; i++) { const d = new Date(); d.setDate(d.getDate() + i); const iso = MS.isoDate(d); const ev = await eventsOn(iso); if (my !== tok) return; if (!ev.length) continue; any = true;
            listEl.append(h('div.card', h('div', { style: { fontWeight: 700, marginBottom: '6px' } }, i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })), h('div.col', { style: { gap: '4px' } }, ev.map(chip)))); }
          if (!any) listEl.append(h('div.empty', h('div.big', '🌤'), 'Nothing scheduled in the next 60 days.'));
        }
      }
      function edit(ev, date, time = '') {
        const e = ev || { id: MS.uid('e'), title: '', date, time, end: time ? MS.pad((+time.split(':')[0] + 1) % 24) + ':00' : '', color: COLORS[0], repeat: 'none', notes: '' };
        const f = { title: h('input.input', { value: e.title, placeholder: 'Event title', style: { width: '100%', fontSize: '16px' } }), date: h('input.input', { type: 'date', value: e.date }), time: h('input.input', { type: 'time', value: e.time }), end: h('input.input', { type: 'time', value: e.end }),
          repeat: h('select.input', ['none', 'daily', 'weekdays', 'weekly', 'biweekly', 'monthly', 'yearly'].map((r) => h('option', { value: r, selected: r === e.repeat }, r === 'none' ? 'Does not repeat' : r))), notes: h('textarea.input', { value: e.notes, placeholder: 'Notes', style: { width: '100%' } }) };
        let color = e.color;
        const sw = h('div.row', COLORS.map((c) => h('button', { style: { width: '26px', height: '26px', borderRadius: '50%', background: c, border: c === color ? '3px solid var(--text)' : '0', cursor: 'pointer' }, on: { click: (x) => { color = c; [...sw.children].forEach((b) => (b.style.border = '0')); x.target.style.border = '3px solid var(--text)'; } } })));
        const save = () => { if (!f.title.value.trim()) return MS.toast('Give it a title'); Object.assign(e, { title: f.title.value.trim(), date: f.date.value, time: f.time.value, end: f.end.value, repeat: f.repeat.value, notes: f.notes.value, color }); if (!ev) s.data.events.push(e); s.touch(); close(); render(); };
        const close = MS.modal(h('div.col', h('h2', ev ? 'Edit event' : 'New event'), f.title, h('div.row', f.date, f.time, '→', f.end), f.repeat, sw, f.notes,
          h('div.row', ev ? h('button.btn.danger', { on: { click: () => { s.data.events = s.data.events.filter((x) => x !== ev); s.touch(); close(); render(); } } }, 'Delete') : null, h('div.spacer'), h('button.btn', { on: { click: () => close() } }, 'Cancel'), h('button.btn.primary', { on: { click: save } }, 'Save'))));
        f.title.addEventListener('keydown', (x) => x.key === 'Enter' && save()); setTimeout(() => f.title.focus(), 30);
      }
      render();
      return { unmount: off, route(args) { if (args[0]) { cursor = parse(args[0]); render(); } } };
    },
  });
})();
