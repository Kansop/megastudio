/* Recipes: recipe box with servings scaling, cook mode with step timers, weekly meal planner and
   an auto-built shopping list grouped by aisle */
(function () {
  const { h } = MS;
  const uid = () => Math.random().toString(36).slice(2, 9);
  const UNITS = { cup: 'cup', cups: 'cup', c: 'cup', tbsp: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp', tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp', g: 'g', gram: 'g', grams: 'g', kg: 'kg', ml: 'ml', l: 'l', oz: 'oz', ounce: 'oz', ounces: 'oz', lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb', clove: 'clove', cloves: 'clove', can: 'can', cans: 'can', pinch: 'pinch', slice: 'slice', slices: 'slice', bunch: 'bunch', stick: 'stick', sticks: 'stick', package: 'pkg', pkg: 'pkg' };
  const FR = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125 };
  function parseQty(s) { s = s.trim(); if (!s) return null; let t = 0; for (const part of s.split(/\s+/)) { if (FR[part]) t += FR[part]; else if (/^\d+\/\d+$/.test(part)) { const [a, b] = part.split('/'); t += a / b; } else if (/^\d+[½¼¾⅓⅔⅛]$/.test(part)) t += +part.slice(0, -1) + FR[part.slice(-1)]; else if (!isNaN(+part)) t += +part; else return null; } return t; }
  function parseIng(line) {
    const m = line.trim().match(/^((?:\d+\s+)?\d*[\d./]*[½¼¾⅓⅔⅛]?)\s*(?:([a-zA-Z]+)\.?\s+)?(.*)$/);
    if (!m || !m[1]) return { q: null, u: '', n: line.trim() };
    const q = parseQty(m[1]); let u = m[2] ? UNITS[m[2].toLowerCase()] : ''; let n = m[3];
    if (m[2] && !u) n = m[2] + ' ' + n; return { q, u: u || '', n: n.trim() };
  }
  function fmtQty(q) {
    if (q == null) return ''; if (q >= 20) return String(Math.round(q)); if (q >= 10) return String(Math.round(q * 2) / 2).replace('.5', ' ½');
    const w = Math.floor(q + 1e-6), f = q - w; const opts = [[0, ''], [0.125, '⅛'], [0.25, '¼'], [1 / 3, '⅓'], [0.5, '½'], [2 / 3, '⅔'], [0.75, '¾'], [1, '']];
    let best = opts[0]; for (const o of opts) if (Math.abs(o[0] - f) < Math.abs(best[0] - f)) best = o;
    const W = best[0] === 1 ? w + 1 : w; const out = (W ? String(W) : '') + (W && best[1] ? ' ' : '') + best[1]; return out || (q > 0 ? '⅛' : '0');
  }
  const PL = { cup: 'cups', can: 'cans', clove: 'cloves', slice: 'slices', stick: 'sticks', bunch: 'bunches' };
  const unitFor = (u, q) => (q > 1 && PL[u]) || u;
  const fmtIng = (i, k = 1) => { const q = i.q == null ? null : i.q * k; return [fmtQty(q), unitFor(i.u, q), i.n].filter(Boolean).join(' '); };
  const TSP = { tsp: 1, tbsp: 3, cup: 48 };
  function fmtVol(t) { if (t >= 12) return [Math.round(t / 12) / 4, 'cup']; if (t >= 3) return [Math.round(t / 1.5) / 2, 'tbsp']; return [Math.round(t * 4) / 4, 'tsp']; }
  const AISLES = [['🧂 Spices', /\bsalt\b|pepper flakes|black pepper|cumin|paprika|oregano|cinnamon|nutmeg|chili powder|turmeric|spice|garam|bay leaf|dill|\bdried\b/i], ['🥫 Pantry', /tomato paste|crushed tomatoes|whole tomatoes|broth|stock|olive|beans|chia|baking/i], ['🧀 Dairy & eggs', /tofu|milk|butter|cheese|cream|yogurt|egg|parmesan|mozzarella|feta|cheddar/i], ['🥬 Produce', /onion|garlic|tomato|lettuce|spinach|pepper(?!corn)|carrot|celery|potato|lemon|lime|apple|banana|berr|avocado|herb|basil|cilantro|parsley|ginger|mushroom|zucchini|cucumber|scallion|kale|broccoli|cabbage|chili|mint|thyme|rosemary|asparagus|jalape|onion|squash|corn\b/i], ['🥩 Meat & fish', /chicken|beef|pork|bacon|sausage|salmon|shrimp|fish|turkey|lamb|tuna|ham/i], ['🧀 Dairy & eggs', /milk|butter|cheese|cream|yogurt|egg|parmesan|mozzarella|feta/i], ['🍞 Bakery', /bread|tortilla|bun|pita|baguette/i], ['🥫 Pantry', /flour|sugar|rice|pasta|spaghetti|oil|vinegar|sauce|stock|broth|beans|lentil|oats|honey|syrup|baking|yeast|chocolate|vanilla|cocoa|noodle|coconut|nut|peanut|tomato paste|can|chickpea|quinoa|soy|mustard|ketchup|mayo|salsa|curry/i], ['🧂 Spices', /salt|pepper|cumin|paprika|oregano|cinnamon|nutmeg|chili powder|turmeric|spice|garam|bay/i]];
  const aisleOf = (n) => (AISLES.find(([, re]) => re.test(n)) || ['🛒 Other'])[0];
  const R = (name, emoji, tags, servings, time, ing, steps, notes = '') => ({ id: uid(), name, emoji, tags, servings, time, ing: ing.split('\n'), steps: steps.split('\n'), notes, fav: false, rating: 0, made: 0 });
  const SEED = () => [
    R('Spaghetti Aglio e Olio', '🍝', ['pasta', 'quick', 'vegetarian'], 2, 20, '200 g spaghetti\n4 cloves garlic, thinly sliced\n1/3 cup olive oil\n1/2 tsp red pepper flakes\n1/4 cup parsley, chopped\n1/2 cup parmesan, grated\nsalt', 'Boil the spaghetti in well-salted water for 9 minutes until al dente. Save 1 cup of pasta water.\nMeanwhile warm the olive oil over low heat and gently cook the garlic for 4 minutes until golden.\nAdd the pepper flakes, then toss in the drained pasta with a splash of pasta water.\nToss for 1 minute until glossy, then finish with parsley and parmesan.'),
    R('Fluffy Pancakes', '🥞', ['breakfast', 'sweet'], 4, 25, '1 1/2 cups flour\n3 1/2 tsp baking powder\n1 tbsp sugar\n1/4 tsp salt\n1 1/4 cups milk\n1 egg\n3 tbsp butter, melted\nmaple syrup, to serve', 'Whisk the flour, baking powder, sugar and salt together.\nMake a well and pour in the milk, egg and melted butter; mix until just smooth.\nRest the batter for 5 minutes.\nHeat a lightly oiled pan over medium heat and pour 1/4 cup batter per pancake.\nCook for 2 minutes until bubbles form, flip and cook 1 minute more.\nServe stacked with maple syrup.'),
    R('Chicken Tikka Masala', '🍛', ['dinner', 'spicy', 'curry'], 4, 50, '1 1/2 lb chicken thighs, cubed\n1 cup yogurt\n2 tbsp garam masala\n1 tbsp cumin\n2 tsp paprika\n1 onion, diced\n4 cloves garlic\n1 tbsp ginger, grated\n1 can crushed tomatoes\n1 cup cream\n2 tbsp butter\n1 1/2 cups basmati rice\ncilantro, to serve', 'Marinate the chicken in yogurt, half the garam masala, cumin and paprika for at least 20 minutes.\nSear the chicken in a hot pan for 5 minutes until charred; set aside.\nMelt the butter and soften the onion for 8 minutes, then add garlic and ginger for 1 minute.\nStir in the remaining spices and the tomatoes; simmer for 15 minutes.\nAdd the cream and chicken and simmer 10 minutes more.\nCook the rice meanwhile and serve with cilantro.'),
    R('Greek Salad', '🥗', ['salad', 'vegetarian', 'quick'], 2, 10, '2 tomatoes, chopped\n1 cucumber, sliced\n1/2 red onion, sliced\n1/2 cup kalamata olives\n150 g feta\n3 tbsp olive oil\n1 tbsp red wine vinegar\n1 tsp oregano', 'Combine tomatoes, cucumber, onion and olives in a bowl.\nWhisk oil, vinegar and oregano with a pinch of salt.\nDress the salad and top with a slab of feta.'),
    R('Classic Beef Chili', '🌶️', ['dinner', 'spicy', 'batch'], 6, 75, '2 lb ground beef\n1 onion, diced\n1 red bell pepper, diced\n4 cloves garlic\n3 tbsp chili powder\n1 tbsp cumin\n1 tsp oregano\n2 cans kidney beans\n1 can crushed tomatoes\n2 cups beef broth\n1 tbsp tomato paste\ncheddar cheese, to serve', 'Brown the beef in a large pot for 8 minutes, breaking it up; drain excess fat.\nAdd onion and pepper and cook for 6 minutes, then the garlic for 1 minute.\nStir in chili powder, cumin, oregano and tomato paste for 1 minute.\nAdd tomatoes, beans and broth. Simmer uncovered for 45 minutes, stirring occasionally.\nSeason and serve topped with cheddar.'),
    R('Overnight Oats', '🥣', ['breakfast', 'make-ahead', 'vegetarian'], 1, 5, '1/2 cup oats\n1/2 cup milk\n1/4 cup yogurt\n1 tbsp chia seeds\n1 tsp honey\n1/2 cup berries', 'Stir oats, milk, yogurt, chia and honey together in a jar.\nCover and refrigerate overnight.\nTop with berries in the morning.'),
    R('Sheet-Pan Salmon & Veg', '🐟', ['dinner', 'healthy', 'quick'], 2, 30, '2 salmon fillets\n1 bunch asparagus\n1 cup cherry tomatoes\n2 tbsp olive oil\n1 lemon\n2 cloves garlic, minced\n1 tsp dill\nsalt and pepper', 'Heat the oven to 425°F.\nToss asparagus and tomatoes with half the oil, salt and pepper on a sheet pan.\nNestle in the salmon, brush with remaining oil, garlic and dill, and add lemon slices.\nRoast for 12 minutes until the salmon flakes.'),
    R('Chocolate Chip Cookies', '🍪', ['dessert', 'baking', 'sweet'], 24, 35, '2 1/4 cups flour\n1 tsp baking soda\n1 tsp salt\n1 cup butter, softened\n3/4 cup sugar\n3/4 cup brown sugar\n2 eggs\n2 tsp vanilla\n2 cups chocolate chips', 'Heat the oven to 375°F.\nWhisk flour, baking soda and salt.\nBeat butter and both sugars for 3 minutes until fluffy; beat in eggs and vanilla.\nMix in the flour, then fold in the chocolate chips.\nScoop onto lined trays and bake for 10 minutes until golden at the edges.\nCool on the tray for 5 minutes.'),
    R('Veggie Stir-Fry', '🥦', ['dinner', 'vegetarian', 'quick'], 3, 25, '1 block tofu, cubed\n2 cups broccoli florets\n1 red bell pepper, sliced\n1 carrot, sliced\n3 tbsp soy sauce\n1 tbsp honey\n1 tbsp ginger, grated\n2 cloves garlic\n1 tbsp sesame oil\n200 g rice noodles\nscallions, to serve', 'Soak or boil the noodles according to the package.\nFry the tofu in sesame oil for 6 minutes until golden; set aside.\nStir-fry broccoli, pepper and carrot for 4 minutes.\nAdd garlic and ginger, then soy and honey; return the tofu and noodles and toss for 2 minutes.\nTop with scallions.'),
    R('Guacamole', '🥑', ['snack', 'vegetarian', 'quick'], 4, 10, '3 avocados\n1 lime\n1/2 red onion, finely diced\n1 tomato, diced\n2 tbsp cilantro, chopped\n1 jalapeño chili, minced\n1/2 tsp salt', 'Mash the avocados with lime juice and salt.\nFold in onion, tomato, cilantro and chili.\nTaste, adjust and serve right away with chips.'),
    R('Tomato Basil Soup', '🍅', ['soup', 'vegetarian'], 4, 40, '2 tbsp butter\n1 onion, diced\n3 cloves garlic\n2 cans whole tomatoes\n2 cups vegetable broth\n1/2 cup cream\n1 bunch basil\n1 tsp sugar', 'Melt butter and soften the onion for 7 minutes; add garlic for 1 minute.\nAdd tomatoes, broth and sugar; simmer for 20 minutes.\nBlend until smooth with the basil, then stir in cream and season.'),
    R('Banana Bread', '🍌', ['baking', 'sweet', 'breakfast'], 10, 70, '3 ripe bananas\n1/3 cup butter, melted\n3/4 cup sugar\n1 egg\n1 tsp vanilla\n1 tsp baking soda\n1 pinch salt\n1 1/2 cups flour', 'Heat the oven to 350°F and grease a loaf pan.\nMash bananas and stir in the butter, sugar, egg and vanilla.\nMix in baking soda and salt, then the flour until just combined.\nBake for 55 minutes until a skewer comes out clean.\nCool for 10 minutes before slicing.'),
  ];
  const MEALS = ['Breakfast', 'Lunch', 'Dinner'];
  const dkey = (d) => d.toISOString().slice(0, 10);
  const weekStart = (off) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + off * 7); return d; };
  const findTimers = (s) => [...s.matchAll(/(\d+)(?:\s*(?:-|to)\s*(\d+))?\s*(minutes?|mins?|hours?|hrs?|seconds?|secs?)/gi)].map((m) => { const n = +(m[2] || m[1]); const u = m[3][0].toLowerCase(); return { label: m[0], secs: u === 'h' ? n * 3600 : u === 's' ? n : n * 60 }; });

  MS.register({
    id: 'recipes', name: 'Recipes', icon: '🍳', group: 'Productivity', desc: 'Recipe box, meal planner & shopping list', keywords: 'recipes cooking meal plan food grocery shopping list kitchen cook timer ingredients',
    async mount(view, args) {
      const st = await MS.store('recipes', () => ({ tab: 'library', recipes: SEED(), plan: {}, checked: {}, extra: [], week: 0 }));
      const D = st.data; const save = () => st.touch();
      const wrap = h('div.pad.col', { style: { gap: '14px', maxWidth: '1100px', margin: '0 auto' } }); view.append(wrap);
      const tabsEl = h('div.row', { style: { flexWrap: 'wrap' } }); const body = h('div.col', { style: { gap: '14px' } }); wrap.append(tabsEl, body);
      let q = '', tagF = '', current = null, scale = null; const timers = []; let cookEl = null;
      const TABS = [['library', '📚 Recipes'], ['plan', '🗓 Meal plan'], ['shop', '🛒 Shopping list']];
      const byId = (id) => D.recipes.find((r) => r.id === id);
      function render() { tabsEl.innerHTML = ''; TABS.forEach(([k, l]) => tabsEl.append(h('button.btn', { class: D.tab === k && !current ? 'on' : '', on: { click: () => { current = null; D.tab = k; save(); render(); } } }, l))); body.innerHTML = ''; if (current) return recipeView(byId(current)); ({ library, plan, shop })[D.tab](); }
      MS.setActions(h('button.btn.sm', { on: { click: () => edit() } }, '＋ New recipe'), h('button.btn.sm', { on: { click: importText } }, '📥 Import'));

      /* ---------- library ---------- */
      function library() {
        const tags = [...new Set(D.recipes.flatMap((r) => r.tags))].sort();
        const search = h('input.input', { placeholder: 'Search recipes or ingredients…', value: q, style: { flex: '1', minWidth: '180px' }, on: { input: () => { q = search.value; grid(); } } });
        const sortSel = h('select.input', { on: { change: grid } }, ['Name', 'Quickest', 'Favorites', 'Most made', 'Rating'].map((s) => h('option', s)));
        const tagRow = h('div.row', { style: { flexWrap: 'wrap', gap: '6px' } }, h('button.btn.sm', { class: !tagF ? 'on' : '', on: { click: () => { tagF = ''; render(); } } }, 'All'), h('button.btn.sm', { class: tagF === '★' ? 'on' : '', on: { click: () => { tagF = '★'; render(); } } }, '★ Favorites'), ...tags.map((t) => h('button.btn.sm', { class: tagF === t ? 'on' : '', on: { click: () => { tagF = t; render(); } } }, '#' + t)));
        const g = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: '12px' } });
        function grid() {
          const s = q.toLowerCase(); let list = D.recipes.filter((r) => (!tagF || (tagF === '★' ? r.fav : r.tags.includes(tagF))) && (!s || (r.name + ' ' + r.tags.join(' ') + ' ' + r.ing.join(' ')).toLowerCase().includes(s)));
          const k = sortSel.value; list.sort(k === 'Quickest' ? (a, b) => a.time - b.time : k === 'Favorites' ? (a, b) => b.fav - a.fav || a.name.localeCompare(b.name) : k === 'Most made' ? (a, b) => b.made - a.made : k === 'Rating' ? (a, b) => b.rating - a.rating : (a, b) => a.name.localeCompare(b.name));
          g.innerHTML = ''; if (!list.length) g.append(h('div.empty', 'No recipes match.'));
          list.forEach((r) => g.append(h('div.card.col', { style: { cursor: 'pointer', gap: '6px' }, on: { click: () => { current = r.id; scale = r.servings; render(); } } },
            h('div.row', h('div', { style: { fontSize: '40px', lineHeight: 1 } }, r.emoji || '🍽'), h('div.spacer'), h('span', { style: { color: 'var(--warn)' } }, r.fav ? '★' : ''), h('span.small.muted', '★'.repeat(r.rating))),
            h('b', r.name), h('div.small.muted', `⏱ ${r.time} min · 🍽 ${r.servings} · ${r.ing.length} ingredients${r.made ? ' · made ' + r.made + '×' : ''}`),
            h('div.row', { style: { flexWrap: 'wrap', gap: '4px' } }, ...r.tags.map((t) => h('span.tag', t))))));
        }
        body.append(h('div.row', { style: { flexWrap: 'wrap' } }, search, sortSel, h('button.btn', { on: { click: () => { const r = D.recipes[Math.floor(Math.random() * D.recipes.length)]; if (r) { current = r.id; scale = r.servings; render(); } } } }, '🎲 Surprise me')), tagRow, g); grid();
      }

      /* ---------- recipe view ---------- */
      function recipeView(r) {
        if (!r) { current = null; return render(); }
        const k = scale / r.servings; const ings = r.ing.filter((l) => l.trim()).map(parseIng);
        const sv = h('b', String(scale));
        const ingList = h('div.col', { style: { gap: '4px' } }, ings.map((i) => { const cb = h('input', { type: 'checkbox' }); const lab = h('label.row', { style: { gap: '8px', alignItems: 'flex-start', cursor: 'pointer' } }, cb, h('span', fmtIng(i, k))); cb.onchange = () => { lab.style.opacity = cb.checked ? 0.45 : 1; lab.style.textDecoration = cb.checked ? 'line-through' : ''; }; return lab; }));
        const stepList = h('ol', { style: { paddingLeft: '22px', margin: 0, lineHeight: 1.6 } }, r.steps.filter((s) => s.trim()).map((s) => h('li', { style: { marginBottom: '8px' } }, s, ...findTimers(s).map((t) => h('button.btn.sm', { style: { marginLeft: '6px' }, on: { click: () => startTimer(r.name + ': ' + t.label, t.secs) } }, '⏲ ' + t.label)))));
        const stars = h('span', [1, 2, 3, 4, 5].map((n) => h('span', { style: { cursor: 'pointer', fontSize: '20px', color: n <= r.rating ? 'var(--warn)' : 'var(--line)' }, on: { click: () => { r.rating = r.rating === n ? 0 : n; save(); render(); } } }, '★')));
        const setScale = (v) => { scale = Math.max(1, v); render(); };
        body.append(
          h('div.row', { style: { flexWrap: 'wrap' } }, h('button.btn', { on: { click: () => { current = null; render(); } } }, '← All recipes'), h('div.spacer'),
            h('button.btn.primary', { on: { click: () => cook(r, k) } }, '👩‍🍳 Cook mode'), h('button.btn', { on: { click: () => addToPlan(r) } }, '🗓 Plan'), h('button.btn', { on: { click: () => { r.fav = !r.fav; save(); render(); } } }, r.fav ? '★ Favorite' : '☆ Favorite'),
            h('button.btn', { on: { click: () => edit(r) } }, '✏️ Edit'), h('button.btn', { on: { click: () => MS.download(r.name.replace(/\W+/g, '-') + '.txt', recipeText(r, k), 'text/plain') } }, '⬇'), h('button.btn', { on: { click: () => window.print() } }, '🖨'),
            h('button.btn', { on: { click: async () => { if (await MS.confirm('Delete "' + r.name + '"?', 'This cannot be undone.', 'Delete')) { D.recipes = D.recipes.filter((x) => x !== r); current = null; save(); render(); } } } }, '🗑')),
          h('div.card.row', { style: { gap: '18px', flexWrap: 'wrap', alignItems: 'center' } }, h('div', { style: { fontSize: '64px', lineHeight: 1 } }, r.emoji || '🍽'),
            h('div.col', { style: { gap: '4px', flex: '1', minWidth: '200px' } }, h('h2', { style: { margin: 0 } }, r.name), h('div.muted', `⏱ ${r.time} min · made ${r.made}×`), h('div.row', { style: { flexWrap: 'wrap', gap: '4px' } }, ...r.tags.map((t) => h('span.tag', t))), stars),
            h('div.col', { style: { alignItems: 'center', gap: '4px' } }, h('span.small.muted', 'Servings'), h('div.row', h('button.btn.sm', { on: { click: () => setScale(scale - 1) } }, '−'), sv, h('button.btn.sm', { on: { click: () => setScale(scale + 1) } }, '＋')), h('div.row', { style: { gap: '4px' } }, ...[0.5, 2, 3].map((m) => h('button.btn.sm', { on: { click: () => setScale(Math.max(1, Math.round(r.servings * m))) } }, '×' + m))))),
          h('div.rec-cols', { style: { display: 'grid', gridTemplateColumns: 'minmax(220px,1fr) 2fr', gap: '14px' } },
            h('div.card.col', { style: { gap: '8px', alignSelf: 'start' } }, h('b', 'Ingredients'), ingList, h('button.btn.sm', { on: { click: () => { ings.forEach((i) => D.extra.push({ id: uid(), text: fmtIng(i, k) })); save(); MS.toast('Added ' + ings.length + ' items to the shopping list'); } } }, '🛒 Add to shopping list')),
            h('div.card.col', { style: { gap: '8px' } }, h('b', 'Method'), stepList, r.notes ? h('div.small.muted', '📝 ' + r.notes) : null, h('button.btn.sm', { style: { alignSelf: 'flex-start' }, on: { click: () => { r.made++; save(); MS.toast('Nice! Logged as made 🎉', 'good'); render(); } } }, '✅ I made this'))));
      }
      const recipeText = (r, k = 1) => `${r.name}\nServes ${Math.round(r.servings * k)} · ${r.time} min · ${r.tags.map((t) => '#' + t).join(' ')}\n\nIngredients\n${r.ing.filter(Boolean).map((l) => '- ' + fmtIng(parseIng(l), k)).join('\n')}\n\nMethod\n${r.steps.filter(Boolean).map((s, i) => i + 1 + '. ' + s).join('\n')}${r.notes ? '\n\nNotes: ' + r.notes : ''}\n`;

      /* ---------- editor ---------- */
      function edit(r) {
        const isNew = !r; r = r || { id: uid(), name: '', emoji: '🍽', tags: [], servings: 4, time: 30, ing: [], steps: [], notes: '', fav: false, rating: 0, made: 0 };
        const f = (ph, v, type = 'text') => h('input.input', { placeholder: ph, value: v, type });
        const name = f('Recipe name', r.name), emoji = f('Emoji', r.emoji), tags = f('Tags (comma separated)', r.tags.join(', ')), serv = f('Servings', r.servings, 'number'), time = f('Minutes', r.time, 'number');
        const ta = (ph, v, rows) => h('textarea.input', { placeholder: ph, rows, style: { width: '100%', fontFamily: 'inherit' } }, v);
        const ing = ta('One ingredient per line, e.g. 2 cups flour', r.ing.join('\n'), 8), steps = ta('One step per line. Mention times like "10 minutes" to get timer buttons.', r.steps.join('\n'), 8), notes = ta('Notes (optional)', r.notes, 2);
        emoji.style.width = '70px'; serv.style.width = time.style.width = '90px';
        const close = MS.modal(h('div.col.modal-wide', { style: { gap: '10px' } }, h('h2', isNew ? 'New recipe' : 'Edit recipe'), h('div.row', emoji, name), h('div.row', { style: { flexWrap: 'wrap' } }, h('span.small.muted', 'Serves'), serv, h('span.small.muted', 'Minutes'), time, tags), h('b.small', 'Ingredients'), ing, h('b.small', 'Method'), steps, notes,
          h('div.row', h('div.spacer'), h('button.btn', { on: { click: () => close() } }, 'Cancel'), h('button.btn.primary', { on: { click: () => {
            if (!name.value.trim()) return MS.toast('Give it a name', 'bad');
            Object.assign(r, { name: name.value.trim(), emoji: emoji.value.trim() || '🍽', tags: tags.value.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean), servings: Math.max(1, +serv.value || 1), time: Math.max(0, +time.value || 0), ing: ing.value.split('\n').map((s) => s.trim()).filter(Boolean), steps: steps.value.split('\n').map((s) => s.trim()).filter(Boolean), notes: notes.value.trim() });
            if (isNew) D.recipes.push(r); save(); close(); current = r.id; scale = r.servings; render();
          } } }, 'Save'))));
        setTimeout(() => name.focus(), 30);
      }
      async function importText() {
        const t = await MS.prompt('Paste a recipe (title on the first line, then ingredients and method)', '', { multiline: true, placeholder: 'Lemon bars\nIngredients\n1 cup flour\n…\nMethod\nBake for 20 minutes…' }); if (!t) return;
        const lines = t.split('\n').map((s) => s.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim()).filter(Boolean); const name = lines.shift() || 'Imported recipe';
        let mode = 'ing'; const ing = [], steps = []; for (const l of lines) { if (/^ingredients?:?$/i.test(l)) { mode = 'ing'; continue; } if (/^(method|directions|instructions|steps|preparation):?$/i.test(l)) { mode = 'steps'; continue; } (mode === 'ing' && l.length < 70 ? ing : (mode = 'steps', steps)).push(l); }
        const r = { id: uid(), name, emoji: '🍽', tags: ['imported'], servings: +((t.match(/serves\s*(\d+)/i) || [])[1] || 4), time: steps.reduce((a, s) => a + findTimers(s).reduce((b, x) => b + x.secs / 60, 0), 0) | 0 || 30, ing, steps, notes: '', fav: false, rating: 0, made: 0 };
        D.recipes.push(r); save(); current = r.id; scale = r.servings; render(); MS.toast('Imported ' + ing.length + ' ingredients, ' + steps.length + ' steps');
      }

      /* ---------- timers & cook mode ---------- */
      const timerBox = h('div', { style: { position: 'fixed', right: '16px', bottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 60 } }); document.body.append(timerBox);
      function beep() { try { const a = new (window.AudioContext || window.webkitAudioContext)(); [0, 0.35, 0.7].forEach((t) => { const o = a.createOscillator(), g = a.createGain(); o.frequency.value = 880; g.gain.setValueAtTime(0.25, a.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + t + 0.3); o.connect(g).connect(a.destination); o.start(a.currentTime + t); o.stop(a.currentTime + t + 0.3); }); setTimeout(() => a.close(), 1500); } catch {} }
      function startTimer(label, secs) {
        const t = { label, end: Date.now() + secs * 1000, done: false }; const txt = h('span.mono'); const el = h('div.card.row', { style: { gap: '8px', padding: '8px 12px', boxShadow: '0 6px 20px rgba(0,0,0,.25)' } }, h('span', '⏲'), h('span.small', label), txt, h('button.icon-btn', { on: { click: () => { el.remove(); timers.splice(timers.indexOf(t), 1); } } }, '✕'));
        t.tick = () => { const left = Math.max(0, Math.round((t.end - Date.now()) / 1000)); txt.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`; if (!left && !t.done) { t.done = true; el.style.background = 'var(--accent)'; el.style.color = '#fff'; beep(); MS.toast('⏰ ' + label + ' is done!', 'good'); } };
        t.tick(); timers.push(t); timerBox.append(el);
      }
      const tickIv = setInterval(() => timers.forEach((t) => t.tick()), 500);
      async function cook(r, k) {
        const steps = r.steps.filter((s) => s.trim()); let i = -1; let lock = null; try { lock = await navigator.wakeLock?.request('screen'); } catch {}
        const content = h('div.col', { style: { gap: '18px', maxWidth: '820px', width: '100%', alignItems: 'center', textAlign: 'center' } });
        const close = () => { cookEl.remove(); cookEl = null; lock?.release?.(); document.removeEventListener('keydown', kd); };
        cookEl = h('div', { style: { position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 55, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', overflow: 'auto' } },
          h('button.btn', { style: { position: 'absolute', top: '14px', right: '14px' }, on: { click: close } }, '✕ Exit cook mode'), content);
        document.body.append(cookEl);
        const show = () => {
          content.innerHTML = ''; const bar = h('div', { style: { width: '100%', height: '6px', background: 'var(--panel2)', borderRadius: '3px', overflow: 'hidden' } }, h('div', { style: { width: ((i + 1) / (steps.length + 1)) * 100 + '%', height: '100%', background: 'var(--accent)', transition: 'width .3s' } }));
          const nav = h('div.row', { style: { justifyContent: 'center' } }, h('button.btn', { disabled: i < 0, on: { click: () => { i--; show(); } } }, '← Back'), i < steps.length - 1 ? h('button.btn.primary', { on: { click: () => { i++; show(); } } }, i < 0 ? 'Start cooking →' : 'Next step →') : h('button.btn.primary', { on: { click: () => { r.made++; save(); close(); MS.toast('Bon appétit! 🍽', 'good'); render(); } } }, '✅ Done — bon appétit'));
          if (i < 0) content.append(bar, h('div', { style: { fontSize: '64px' } }, r.emoji), h('h1', { style: { margin: 0 } }, r.name), h('div.muted', 'Gather your ingredients' + (k !== 1 ? ` (scaled ×${+k.toFixed(2)})` : '')), h('div', { style: { columns: '2 220px', textAlign: 'left', fontSize: '18px', lineHeight: 1.8, width: '100%' } }, r.ing.filter(Boolean).map((l) => h('label', { style: { display: 'block' } }, h('input', { type: 'checkbox', style: { marginRight: '8px' } }), fmtIng(parseIng(l), k)))), nav);
          else content.append(bar, h('div.muted', `Step ${i + 1} of ${steps.length}`), h('div', { style: { fontSize: 'clamp(22px, 3.4vw, 34px)', lineHeight: 1.45, fontWeight: 500 } }, steps[i]), h('div.row', { style: { justifyContent: 'center', flexWrap: 'wrap' } }, ...findTimers(steps[i]).map((t) => h('button.btn', { on: { click: () => startTimer(t.label + ' (step ' + (i + 1) + ')', t.secs) } }, '⏲ Start ' + t.label + ' timer'))), nav, h('div.small.muted', '← → arrow keys to navigate · Esc to exit'));
        };
        const kd = (e) => { if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight' && i < steps.length - 1) { i++; show(); } else if (e.key === 'ArrowLeft' && i > -1) { i--; show(); } };
        document.addEventListener('keydown', kd); show();
      }

      /* ---------- meal plan ---------- */
      function addToPlan(r) {
        const ws = weekStart(0); const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(ws); d.setDate(d.getDate() + i); return d; });
        const daySel = h('select.input', days.map((d) => h('option', { value: dkey(d) }, d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })))); daySel.value = dkey(new Date(new Date().setHours(12)));
        const mealSel = h('select.input', MEALS.map((m) => h('option', m))); mealSel.value = /breakfast/.test(r.tags.join()) ? 'Breakfast' : 'Dinner';
        const close = MS.modal(h('div.col', { style: { gap: '10px' } }, h('h2', 'Add ' + r.name + ' to plan'), daySel, mealSel, h('div.row', h('div.spacer'), h('button.btn.primary', { on: { click: () => { (D.plan[daySel.value] = D.plan[daySel.value] || {})[mealSel.value] = r.id; save(); close(); MS.toast('Planned for ' + mealSel.value.toLowerCase()); } } }, 'Add'))));
      }
      function plan() {
        const ws = weekStart(D.week); const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(ws); d.setDate(d.getDate() + i); return d; }); const today = dkey(new Date(new Date().setHours(12)));
        const label = `${days[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${days[6].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
        const wk = (o) => { D.week = o; save(); render(); };
        const autofill = () => { const pick = (m) => { const pool = D.recipes.filter((r) => m === 'Breakfast' ? r.tags.includes('breakfast') : !r.tags.some((t) => ['breakfast', 'dessert', 'snack'].includes(t))); return pool.length ? pool[Math.floor(Math.random() * pool.length)].id : null; }; days.forEach((d) => { const p = (D.plan[dkey(d)] = D.plan[dkey(d)] || {}); MEALS.forEach((m) => { if (!p[m]) p[m] = pick(m); }); }); save(); render(); };
        const head = h('div.row', { style: { flexWrap: 'wrap' } }, h('button.btn', { on: { click: () => wk(D.week - 1) } }, '‹'), h('b', { style: { minWidth: '150px', textAlign: 'center' } }, label), h('button.btn', { on: { click: () => wk(D.week + 1) } }, '›'), D.week ? h('button.btn.sm', { on: { click: () => wk(0) } }, 'This week') : null, h('div.spacer'),
          h('button.btn', { on: { click: autofill } }, '🎲 Fill empty slots'), h('button.btn', { on: { click: async () => { if (await MS.confirm('Clear this week?')) { days.forEach((d) => delete D.plan[dkey(d)]); save(); render(); } } } }, 'Clear week'), h('button.btn.primary', { on: { click: () => { D.tab = 'shop'; save(); render(); } } }, '🛒 Shopping list'));
        const grid = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: '10px' } });
        let total = 0;
        days.forEach((d) => {
          const k = dkey(d); const p = D.plan[k] || {};
          const col = h('div.card.col', { style: { gap: '8px', padding: '10px', outline: k === today ? '2px solid var(--accent)' : '' } }, h('div', h('b', d.toLocaleDateString(undefined, { weekday: 'long' })), h('div.small.muted', d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))));
          MEALS.forEach((m) => {
            const r = byId(p[m]); if (r) total += r.time;
            const sel = h('select.input', { style: { width: '100%', fontSize: '12px' }, on: { change: () => { (D.plan[k] = D.plan[k] || {})[m] = sel.value || null; save(); render(); } } }, h('option', { value: '' }, '—'), ...D.recipes.map((x) => h('option', { value: x.id }, x.emoji + ' ' + x.name))); sel.value = r ? r.id : '';
            col.append(h('div.col', { style: { gap: '3px' } }, h('div.small.muted', m), r ? h('div.row', { style: { gap: '6px', cursor: 'pointer' }, on: { click: () => { current = r.id; scale = r.servings; render(); } } }, h('span', { style: { fontSize: '22px' } }, r.emoji), h('span.small', { style: { fontWeight: 600 } }, r.name)) : null, sel));
          });
          grid.append(col);
        });
        const planned = days.reduce((a, d) => a + MEALS.filter((m) => byId((D.plan[dkey(d)] || {})[m])).length, 0);
        body.append(head, h('div.small.muted', `${planned}/21 meals planned · about ${Math.round(total / 60 * 10) / 10} h of cooking`), grid);
      }

      /* ---------- shopping list ---------- */
      function buildList() {
        const ws = weekStart(D.week); const items = {}; const from = {};
        for (let i = 0; i < 7; i++) { const d = new Date(ws); d.setDate(d.getDate() + i); const p = D.plan[dkey(d)] || {}; MEALS.forEach((m) => { const r = byId(p[m]); if (!r) return; r.ing.filter(Boolean).forEach((l) => { const ig = parseIng(l); const base = ig.n.split(',')[0].replace(/\(.*?\)/g, '').trim().toLowerCase(); if (/^salt( and pepper)?$|^water$/.test(base)) return; const vol = TSP[ig.u]; const key = base + '|' + (vol ? 'vol' : ig.u); const it = (items[key] = items[key] || { n: base, u: vol ? 'vol' : ig.u, q: 0, hasQ: false }); if (ig.q != null) { it.q += vol ? ig.q * vol : ig.q; it.hasQ = true; } (from[key] = from[key] || new Set()).add(r.name); }); }); }
        return Object.entries(items).map(([key, it]) => { let { q, u } = it; if (u === 'vol') [q, u] = it.hasQ ? fmtVol(q) : [q, '']; return { key, text: (it.hasQ ? fmtQty(q) + ' ' : '') + (u ? unitFor(u, q) + ' ' : '') + it.n, from: [...from[key]], aisle: aisleOf(it.n) }; });
      }
      function shop() {
        const list = buildList(); D.extra.forEach((e) => list.push({ key: 'x:' + e.id, text: e.text, from: [], aisle: aisleOf(e.text), extra: e.id }));
        const add = h('input.input', { placeholder: 'Add an item…', style: { flex: '1' }, on: { keydown: (e) => { if (e.key === 'Enter' && add.value.trim()) { D.extra.push({ id: uid(), text: add.value.trim() }); save(); render(); } } } });
        const groups = {}; list.forEach((it) => (groups[it.aisle] = groups[it.aisle] || []).push(it));
        const done = list.filter((it) => D.checked[it.key]).length;
        const asText = () => Object.entries(groups).map(([a, its]) => a + '\n' + its.map((it) => (D.checked[it.key] ? '☑ ' : '☐ ') + it.text).join('\n')).join('\n\n');
        body.append(h('div.row', { style: { flexWrap: 'wrap' } }, add, h('button.btn', { on: { click: () => { navigator.clipboard?.writeText(asText()); MS.toast('Copied list'); } } }, '📋 Copy'), h('button.btn', { on: { click: () => MS.download('shopping-list.txt', asText(), 'text/plain') } }, '⬇'), h('button.btn', { on: { click: () => { list.forEach((it) => delete D.checked[it.key]); D.extra = D.extra.filter((e) => !list.some((it) => it.extra === e.id && D.checked['x:' + e.id])); save(); render(); } } }, 'Uncheck all'), h('button.btn', { on: { click: () => { D.extra = D.extra.filter((e) => !D.checked['x:' + e.id]); save(); render(); } } }, 'Remove checked extras')),
          h('div.small.muted', `${list.length} items from week of ${weekStart(D.week).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${done} in the cart`),
          list.length ? h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '12px', alignItems: 'start' } }, Object.keys(groups).sort().map((a) => h('div.card.col', { style: { gap: '6px' } }, h('b', a), groups[a].sort((x, y) => x.text.localeCompare(y.text)).map((it) => {
            const cb = h('input', { type: 'checkbox', checked: !!D.checked[it.key], on: { change: () => { if (cb.checked) D.checked[it.key] = 1; else delete D.checked[it.key]; save(); render(); } } });
            return h('label.row', { style: { gap: '8px', alignItems: 'flex-start', cursor: 'pointer', opacity: D.checked[it.key] ? 0.45 : 1, textDecoration: D.checked[it.key] ? 'line-through' : '' } }, cb, h('div.col', { style: { gap: 0, flex: 1 } }, h('span', it.text), it.from.length ? h('span.small.muted', it.from.join(', ')) : null), it.extra ? h('button.icon-btn', { on: { click: (e) => { e.preventDefault(); D.extra = D.extra.filter((x) => x.id !== it.extra); save(); render(); } } }, '✕') : null);
          })))) : h('div.empty', 'Plan some meals for this week (or add items above) and your list builds itself.'));
      }

      if (args && args[0] && byId(args[0])) { current = args[0]; scale = byId(current).servings; }
      render();
      return { unmount() { clearInterval(tickIv); timerBox.remove(); cookEl?.remove(); } };
    },
  });
})();
