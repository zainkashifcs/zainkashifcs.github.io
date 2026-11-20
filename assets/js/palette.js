// Command palette. Ctrl/Cmd+K or the header button [data-palette] opens a search over problems, topics, pages and
// journal notes in a native <dialog>. The index (search.json, URL from the button's data-src) is fetched on first open.
// The input is a combobox over a listbox: focus stays in the input and aria-activedescendant names the selected result.
// Tokens like topic:dp, status:unsolved (or is:help) and rating:1000-1200 narrow the search to problems.
// Nothing is stored. Without JS the button stays hidden and the dialog is never created.
(() => {
  const opener = document.querySelector('[data-palette]');
  if (!opener || typeof document.createElement('dialog').showModal !== 'function') return;

  const mac = /mac|iphone|ipad/i.test((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '');
  const mod = mac ? '⌘' : 'Ctrl';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const subseq = (needle, hay) => { let i = 0; for (const c of hay) if (c === needle[i] && ++i === needle.length) return true; return false; };
  const root = new URL('./', new URL(opener.dataset.src || '/search.json', location.href));
  const STATUS = { solved: 'Solved', help: 'Solved with help', unsolved: 'Not solved' };
  const GROUPS = [['problem', 'Problems', 10], ['topic', 'Topics', 4], ['page', 'Pages', 4], ['journal', 'Journal', 3]];

  const dlg = document.createElement('dialog');
  dlg.className = 'cmdk'; dlg.setAttribute('aria-label', 'Search'); dlg.setAttribute('data-lenis-prevent', '');
  dlg.innerHTML = `
    <div class="cmdk-panel">
      <div class="cmdk-bar">
        <svg class="cmdk-ico" viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m12.8 12.8 4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
        <input type="text" role="combobox" aria-label="Search problems, topics and pages" aria-controls="cmdk-list" aria-expanded="false" aria-autocomplete="list" placeholder="Search by ID, title or topic" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="go">
        <button class="cmdk-x" type="button">Close</button>
      </div>
      <p class="cmdk-msg" hidden></p>
      <div class="cmdk-list" id="cmdk-list" role="listbox" aria-label="Results" tabindex="-1" data-lenis-prevent></div>
      <div class="cmdk-help" hidden>
        <h2 class="cmdk-gh">Keyboard shortcuts</h2>
        <dl>
          <div><dt><kbd>${mod}</kbd><kbd>K</kbd></dt><dd>Open or close search</dd></div>
          <div><dt><kbd>↑</kbd><kbd>↓</kbd></dt><dd>Move through the results</dd></div>
          <div><dt><kbd>Enter</kbd></dt><dd>Open the selected result</dd></div>
          <div><dt><kbd>Esc</kbd></dt><dd>Close search, or leave this list</dd></div>
          <div><dt><kbd>?</kbd></dt><dd>Show or hide this list</dd></div>
        </dl>
        <h2 class="cmdk-gh">Search filters</h2>
        <dl class="cmdk-fl">
          <div><dt><kbd>topic:dp</kbd></dt><dd>Problems in one topic. Use its ID or the start of its name</dd></div>
          <div><dt><kbd>status:solved</kbd></dt><dd>Use solved, help or unsolved. <kbd>is:</kbd> works too</dd></div>
          <div><dt><kbd>rating:1000-1500</kbd></dt><dd>Ratings from 1000 to 1500. Also 1200, 1200- or -1500</dd></div>
          <div><dt><kbd>topic:dp tree</kbd></dt><dd>Filters and plain words work together</dd></div>
        </dl>
      </div>
      <p class="cmdk-keys" aria-hidden="true"><span><kbd>↑</kbd><kbd>↓</kbd> Move</span><span><kbd>↵</kbd> Open</span><span><kbd>esc</kbd> Close</span><span><kbd>?</kbd> Shortcuts</span></p>
      <p class="vh" role="status" aria-live="polite"></p>
    </div>`;
  document.body.append(dlg);
  const $ = s => dlg.querySelector(s);
  const input = $('input'), list = $('.cmdk-list'), msg = $('.cmdk-msg'), help = $('.cmdk-help'), say = $('[role=status]');

  let rows = [], state = 'idle', opts = [], active = -1, helpOn = false, returnTo = null, randomUrl = '', nextUrl = '';

  const load = () => {
    state = 'loading';
    fetch(opener.dataset.src, { credentials: 'same-origin' })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => {
        if (!Array.isArray(data)) throw new Error('bad index');
        const label = new Map(data.filter(r => r.t === 'topic').map(r => [r.id, r.title]));
        rows = data.map(r => {
          const title = norm(r.title || '');
          return { r, id: norm(r.id || ''), title, words: title.split(/[^a-z0-9]+/).filter(Boolean),
            topics: norm((r.topics || []).map(t => `${label.get(t) || t} ${t}`).join(' ')) }; // label and id, so "dp" finds Dynamic Programming problems
        });
        state = 'ready'; pickRandom(); pickNext();
      })
      .catch(() => { state = 'idle'; }) // idle after a load means it failed; the next open tries again
      .finally(() => { if (dlg.open && !helpOn) render(); });
  };

  const pickRandom = () => {
    const here = location.pathname, pool = rows.filter(x => x.r.t === 'problem' && new URL(x.r.url, location.href).pathname !== here);
    randomUrl = pool.length ? pool[Math.floor(Math.random() * pool.length)].r.url : '';
  };

  // Same order as the "Next unsolved problem" link on problem pages: first-attempt date, then ID (the index's `date` field).
  // From the current page, wrap round and skip the page itself. Without `date` in the index there is no action.
  const pickNext = () => {
    const isHere = x => new URL(x.r.url, location.href).pathname === location.pathname, key = x => `${x.r.date}|${x.r.id}`;
    const seq = rows.filter(x => x.r.t === 'problem' && x.r.date).sort((a, b) => (key(a) < key(b) ? -1 : 1)), i = seq.findIndex(isHere);
    const hit = [...seq.slice(i + 1), ...seq.slice(0, i + 1)].find(x => x.r.status === 'unsolved' && !isHere(x));
    nextUrl = hit ? hit.r.url : '';
  };

  // Best single-field match per word, summed. A word that matches nothing rules the row out.
  const score = (x, words) => {
    let total = 0;
    for (const w of words) {
      const s = x.id === w ? 100 : x.id && x.id.startsWith(w) ? 80 : x.title.startsWith(w) ? 70 : x.words.some(v => v.startsWith(w)) ? 60
        : x.title.includes(w) ? 40 : x.topics.includes(w) ? 30 : x.id && x.id.includes(w) ? 20 : w.length > 2 && subseq(w, x.title) ? 10 : 0;
      if (!s) return 0;
      total += s;
    }
    return total;
  };

  // Splits the query into plain words and key:value filters. An empty value ("topic:") is ignored until the person types one.
  const split = q => {
    const words = [], specs = [];
    for (const tok of q.split(/\s+/).filter(Boolean)) {
      const m = norm(tok).match(/^(topic|status|is|rating):(.*)$/);
      if (!m) words.push(norm(tok)); else if (m[2]) specs.push({ key: m[1], v: m[2], raw: tok.slice(tok.indexOf(':') + 1) });
    }
    return { words: words.filter(Boolean), specs };
  };
  // Each builder returns { test(row), text } for a valid value, or 0. `text` completes "Problems ...".
  const either = new Intl.ListFormat('en', { type: 'disjunction' });
  const topicFilter = v => {
    const hit = rows.filter(x => x.r.t === 'topic' && (x.id.startsWith(v) || x.title.startsWith(v)));
    return hit.length && { test: r => hit.some(x => (r.topics || []).includes(x.r.id)), text: `tagged ${either.format(hit.map(x => x.r.title))}` };
  };
  const statusFilter = v => {
    const k = Object.keys(STATUS).find(s => s.startsWith(v));
    return k && { test: r => r.status === k, text: STATUS[k].toLowerCase() };
  };
  const ratingFilter = v => { // N, A-B, A- or -B. Unrated problems (0) never match.
    const m = v.match(/^(\d*)(-?)(\d*)$/);
    if (!m || !(m[1] || m[3])) return 0;
    let lo = +m[1], hi = m[2] ? (m[3] ? +m[3] : Infinity) : lo;
    if (lo > hi) [lo, hi] = [hi, lo];
    return { test: r => r.rating > 0 && r.rating >= lo && r.rating <= hi,
      text: !m[2] ? `rated ${lo}` : !m[1] ? `rated ${hi} or lower` : hi === Infinity ? `rated ${lo} or higher` : `rated ${lo} to ${hi}` };
  };
  const BUILD = { topic: topicFilter, status: statusFilter, is: statusFilter, rating: ratingFilter };
  const BAD = {
    topic: v => `No topic matches “${v}”. Use a topic ID such as dp, or the start of a topic name.`,
    status: v => `“${v}” is not a status. Use solved, help or unsolved.`,
    rating: v => `“${v}” is not a rating. Use a number such as 1200, or a range such as 1000-1500.` };
  BAD.is = BAD.status;

  // Wraps the part of the title each plain word matched in <mark>. Matches are found on a folded copy (lower case, no accents),
  // mapped back to the original title, and every slice of the original is escaped on its own. Subsequence-only matches get no mark.
  const mark = (title, words) => {
    let flat = '', src = [];
    for (let i = 0; i < title.length; i++) { const f = norm(title[i]); flat += f; for (let k = 0; k < f.length; k++) src.push(i); }
    const spans = words.map(w => {
      const i = flat.startsWith(w) ? 0 : [...flat.matchAll(/[a-z0-9]+/g)].find(m => m[0].startsWith(w))?.index ?? flat.indexOf(w);
      return i < 0 ? null : [src[i], src[i + w.length - 1] + 1];
    }).filter(Boolean).sort((a, b) => a[0] - b[0]);
    let out = '', pos = 0;
    for (const [s, e] of spans) {
      if (e <= pos) continue;
      const from = Math.max(s, pos);
      out += `${esc(title.slice(pos, from))}<mark>${esc(title.slice(from, e))}</mark>`; pos = e;
    }
    return out + esc(title.slice(pos));
  };

  const actions = () => ({ key: 'actions', label: 'Actions', items: [
    ...(randomUrl ? [{ href: randomUrl, main: 'Random problem' }] : []),
    ...(nextUrl ? [{ href: nextUrl, main: 'Next unsolved problem' }] : []),
    { href: new URL('quiz/', root).pathname, main: 'Go to the quiz' },
    { href: new URL('roadmap/', root).pathname, main: 'Roadmap' }] });

  const item = r => r.t === 'problem'
    ? { href: r.url, badge: `<span class="rb${r.status === 'help' ? ' help' : r.status === 'unsolved' ? ' open' : ''}">${esc(r.id)}</span>`, main: r.title,
        meta: [r.rating ? r.rating : '', STATUS[r.status] || ''].filter(Boolean).join(' · ') }
    : { href: r.url, main: r.title, meta: r.t === 'topic' ? `${r.n} problem${r.n === 1 ? '' : 's'}` : '' };

  const render = () => {
    const q = input.value.trim(), { words, specs } = split(q);
    let groups = [], note = '', cut = 0, total = 0, found = false;
    if (state === 'idle') note = 'The search index could not load. Check your connection and reopen search.';
    if (!words.length && !specs.length) groups = [actions()];
    else if (state !== 'ready') { if (state === 'loading') note = 'Loading the index…'; else groups = [actions()]; } // while loading there is nothing to pick, so Enter cannot open the wrong thing
    else {
      const built = specs.map(s => ({ s, f: BUILD[s.key](s.v) })), bad = built.find(b => !b.f);
      if (bad) { note = BAD[bad.s.key](bad.s.raw); groups = [actions()]; }
      else {
        const tests = built.map(b => b.f.test);
        const what = built.map(b => b.f.text).join(', ') + (words.length ? ` matching “${words.join(' ')}”` : '');
        groups = GROUPS.filter(([t]) => !tests.length || t === 'problem').map(([t, label, cap]) => {
          const hits = rows.filter(x => x.r.t === t && tests.every(f => f(x.r))).map(x => ({ x, s: words.length ? score(x, words) : 1 })).filter(h => h.s).sort((a, b) => b.s - a.s);
          cut += Math.max(0, hits.length - cap); total += hits.length;
          return { key: t, label, top: hits.length ? hits[0].s : 0, items: hits.slice(0, cap).map(h => item(h.x.r)) };
        }).filter(g => g.items.length).sort((a, b) => b.top - a.top);
        if (!groups.length) { note = tests.length ? `No problems ${what}. Remove a filter, or go to:` : `Nothing matches “${q}”. Try a problem ID, a title or a topic, or go to:`; groups = [actions()]; }
        else {
          found = true;
          note = [tests.length ? `Problems ${what}.` : '', cut ? (words.length ? `Showing the closest ${total - cut} of ${total} matches. Type more to narrow them.` : `Showing ${total - cut} of ${total}. Add a word or another filter to narrow them.`) : ''].filter(Boolean).join(' ');
        }
      }
    }
    let n = 0;
    list.innerHTML = groups.map(g => `<div class="cmdk-g" role="group" aria-labelledby="cmdk-g-${g.key}"><div class="cmdk-gh" id="cmdk-g-${g.key}">${g.label}</div>${g.items.map(i =>
      `<a class="cmdk-o" role="option" id="cmdk-o-${n++}" tabindex="-1" aria-selected="false" href="${esc(i.href)}">${i.badge || ''}<span class="cmdk-t">${g.key === 'actions' ? esc(i.main) : mark(i.main, words)}</span>${i.meta ? `<span class="cmdk-m">${esc(i.meta)}</span>` : ''}</a>`).join('')}</div>`).join('');
    opts = [...list.querySelectorAll('[role=option]')];
    msg.textContent = note; msg.hidden = !note;
    input.setAttribute('aria-expanded', String(opts.length > 0 && !helpOn));
    setActive(opts.length ? 0 : -1, false);
    say.textContent = found ? `${opts.length} result${opts.length === 1 ? '' : 's'}${note ? `. ${note}` : ''}` : note;
  };

  const setActive = (i, scroll = true) => {
    if (opts[active]) opts[active].setAttribute('aria-selected', 'false');
    active = i;
    const o = opts[i];
    if (!o) return input.removeAttribute('aria-activedescendant');
    o.setAttribute('aria-selected', 'true'); input.setAttribute('aria-activedescendant', o.id);
    if (scroll) { if (i === 0) list.scrollTop = 0; else o.scrollIntoView({ block: 'nearest' }); }
  };

  const showHelp = on => {
    helpOn = on; help.hidden = !on; list.hidden = on; if (on) { msg.hidden = true; input.removeAttribute('aria-activedescendant'); }
    input.setAttribute('aria-expanded', String(!on && opts.length > 0));
    if (on) say.textContent = 'Keyboard shortcuts and search filters shown. Press Escape to go back to the results.'; else render();
  };

  const open = (withHelp, from) => {
    if (dlg.open) return;
    // Safari does not focus a clicked button, so the opener passes itself
    returnTo = from || document.activeElement; input.value = ''; pickRandom();
    helpOn = false; help.hidden = true; list.hidden = false;
    dlg.showModal(); input.focus();
    if (state === 'idle') load();
    if (withHelp) showHelp(true); else render();
  };

  dlg.addEventListener('close', () => { if (returnTo && returnTo.isConnected && returnTo !== document.body) returnTo.focus({ preventScroll: true }); });
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); }); // the backdrop is the dialog element itself
  // Keep the page from scrolling behind the dialog. (Locking html's overflow instead crashes WebKit when a view transition is running.)
  // The results and the help list keep their own scrolling, and a two-finger pinch still zooms.
  for (const ev of ['wheel', 'touchmove']) dlg.addEventListener(ev, e => { if (!e.target.closest('.cmdk-list, .cmdk-help') && !(e.touches && e.touches.length > 1)) e.preventDefault(); }, { passive: false });
  $('.cmdk-x').addEventListener('click', () => dlg.close());
  input.addEventListener('input', () => { helpOn = false; help.hidden = true; list.hidden = false; render(); });
  list.addEventListener('click', e => { if (e.target.closest('a')) dlg.close(); });
  list.addEventListener('mousemove', e => { const o = e.target.closest('[role=option]'), i = opts.indexOf(o); if (o && i !== active) setActive(i, false); });
  dlg.addEventListener('keydown', e => {
    if (e.isComposing || e.keyCode === 229) return; // 229: Safari's Enter that ends an IME composition
    if (e.key === 'Tab') { // a native modal lets Tab escape to the browser; keep it on the field and Close
      const stops = [input, $('.cmdk-x')], i = Math.max(0, stops.indexOf(document.activeElement));
      e.preventDefault(); stops[(i + (e.shiftKey ? stops.length - 1 : 1)) % stops.length].focus(); return;
    }
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && helpOn) { e.preventDefault(); help.scrollBy(0, e.key === 'ArrowDown' ? 40 : -40); } // help can be taller than a zoomed screen
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (opts.length) setActive((active + (e.key === 'ArrowDown' ? 1 : -1) + opts.length) % opts.length); }
    else if (e.key === 'Enter' && e.target === input && opts[active]) {
      e.preventDefault();
      opts[active].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: e.ctrlKey, metaKey: e.metaKey, shiftKey: e.shiftKey }));
    } else if (e.key === 'Escape' && helpOn) { e.preventDefault(); showHelp(false); }
    else if (e.key === '?' && e.target === input && !input.value) { e.preventDefault(); showHelp(!helpOn); }
  });

  document.addEventListener('keydown', e => {
    if (e.defaultPrevented || e.isComposing) return;
    if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k') { e.preventDefault(); if (dlg.open) dlg.close(); else open(false); }
  });

  opener.addEventListener('click', () => open(false, opener));
  for (const ev of ['pointerenter', 'focus']) opener.addEventListener(ev, () => { if (state === 'idle') load(); }, { once: true }); // warm the index before the first open
  opener.setAttribute('aria-keyshortcuts', 'Control+K Meta+K');
  const hint = opener.querySelector('.palette-kbd'); if (hint) hint.textContent = mac ? '⌘K' : 'Ctrl K';
  opener.hidden = false;
})();
