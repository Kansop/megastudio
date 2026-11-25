/* Small, safe Markdown renderer (escapes HTML first). Supports GFM-ish syntax + [[wikilinks]] + ==highlight== */
(function () {
  const esc = MS.esc;
  const safeUrl = (u) => (/^(https?:|mailto:|#|data:image\/|\.?\/|[\w-]+\.)/i.test(u.trim()) && !/^javascript:/i.test(u.trim()) ? u : '#');
  function inline(s) {
    const codes = [];
    s = s.replace(/`([^`]+)`/g, (_, c) => (codes.push(c), `\u0000${codes.length - 1}\u0000`));
    s = esc(s);
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (_, a, u, t) => `<img alt="${a}" src="${safeUrl(u)}"${t ? ` title="${t}"` : ''}>`);
    s = s.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, n, l) => `<a href="#" class="wikilink" data-note="${n.trim()}">${l || n}</a>`);
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => `<a href="${safeUrl(u)}" target="_blank" rel="noopener">${t}</a>`);
    s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
    s = s.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    s = s.replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, (_, a, b) => `<strong>${a || b}</strong>`);
    s = s.replace(/(^|[^*\w])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>').replace(/(^|[^\w])_([^_\s][^_]*)_(?!\w)/g, '$1<em>$2</em>');
    s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>').replace(/==([^=]+)==/g, '<mark>$1</mark>');
    s = s.replace(/(^|\s)#([a-z][\w-]*)/gi, '$1<span class="tag">#$2</span>');
    s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${esc(codes[i])}</code>`);
    return s;
  }
  function render(src) {
    const lines = String(src || '').replace(/\r\n?/g, '\n').split('\n');
    let out = ''; let i = 0;
    const listStack = [];
    const closeLists = (depth = 0) => { while (listStack.length > depth) out += `</${listStack.pop().tag}>`; };
    while (i < lines.length) {
      let line = lines[i];
      const fence = line.match(/^\s*(```|~~~)\s*([\w+-]*)/);
      if (fence) {
        closeLists(); const buf = []; i++;
        while (i < lines.length && !lines[i].trim().startsWith(fence[1])) buf.push(lines[i++]);
        i++; out += `<pre><code class="lang-${esc(fence[2])}">${esc(buf.join('\n'))}</code></pre>`; continue;
      }
      if (/^\s*$/.test(line)) { closeLists(); i++; continue; }
      const hd = line.match(/^(#{1,6})\s+(.*)$/);
      if (hd) { closeLists(); const id = hd[2].toLowerCase().replace(/[^\w]+/g, '-'); out += `<h${hd[1].length} id="${esc(id)}">${inline(hd[2])}</h${hd[1].length}>`; i++; continue; }
      if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { closeLists(); out += '<hr>'; i++; continue; }
      if (/^\s*>/.test(line)) { closeLists(); const buf = []; while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, '')); out += `<blockquote>${render(buf.join('\n'))}</blockquote>`; continue; }
      if (line.includes('|') && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(lines[i + 1])) {
        closeLists();
        const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
        const head = cells(line); const al = cells(lines[i + 1]).map((c) => (c.endsWith(':') ? (c.startsWith(':') ? 'center' : 'right') : 'left'));
        i += 2; out += '<table><thead><tr>' + head.map((c, j) => `<th style="text-align:${al[j]}">${inline(c)}</th>`).join('') + '</tr></thead><tbody>';
        while (i < lines.length && lines[i].includes('|') && lines[i].trim()) { out += '<tr>' + cells(lines[i]).map((c, j) => `<td style="text-align:${al[j] || 'left'}">${inline(c)}</td>`).join('') + '</tr>'; i++; }
        out += '</tbody></table>'; continue;
      }
      const li = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
      if (li) {
        const depth = Math.floor(li[1].replace(/\t/g, '  ').length / 2) + 1; const tag = /\d/.test(li[2]) ? 'ol' : 'ul';
        while (listStack.length > depth) out += `</${listStack.pop().tag}>`;
        while (listStack.length < depth) { listStack.push({ tag }); out += `<${tag}>`; }
        if (listStack[depth - 1].tag !== tag) { out += `</${listStack.pop().tag}><${tag}>`; listStack.push({ tag }); }
        const task = li[3].match(/^\[([ xX])\]\s+(.*)$/);
        if (task) out += `<li class="task"><input type="checkbox" data-line="${i}" ${task[1] !== ' ' ? 'checked' : ''}> ${inline(task[2])}</li>`;
        else out += `<li>${inline(li[3])}</li>`;
        i++; continue;
      }
      closeLists();
      const buf = [];
      while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|\s*```|\s*>|\s*([-*+]|\d+[.)])\s)/.test(lines[i])) buf.push(lines[i++]);
      if (!buf.length) { buf.push(lines[i++]); }
      out += `<p>${buf.map(inline).join('<br>')}</p>`;
    }
    closeLists();
    return out;
  }
  MS.md = render;
  MS.mdInline = inline;
})();
