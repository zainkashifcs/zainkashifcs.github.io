// Problem index: search, status, rating range, topics and sort, combined with AND (topics match if any chosen topic
// applies). Topic counts show how many problems each topic would give with the other filters as they are.
// The optional [data-random] button opens a random problem among the rows the filters show.
// The view is mirrored in the URL (q, status, min, max, sort, topics) so it can be linked and survives reload.
// The status tabs (.segmented) drive the visually hidden status select, which stays the single source of truth.
// Without JS the full list shows and the toolbar stays hidden.
// Keyboard: while a row has focus, the arrow keys, Home and End move between the visible rows (no global shortcuts).
// The active filters show as removable chips above the count, and "Copy link to this view" copies the mirrored URL.
(() => {
  const box = document.querySelector('[data-index]'); if (!box) return;
  const bar = box.querySelector('.toolbar'), list = box.querySelector('.index'), count = box.querySelector('.count'), empty = box.querySelector('.empty');
  const rows = [...list.children];
  rows.forEach(li => { li.style.viewTransitionName = 'row-' + li.dataset.id.replace(/[^\w-]/g, ''); });
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const q = bar.querySelector('input'), status = bar.querySelector('[name=status]'), sort = bar.querySelector('[name=sort]');
  const lo = bar.querySelector('[name=min]'), hi = bar.querySelector('[name=max]');
  const chips = [...bar.querySelectorAll('.chip')], chosen = new Set();
  const tabs = [...bar.querySelectorAll('[data-seg]')];
  const rand = bar.querySelector('[data-random]'); // "Random problem": opens one of the rows the filters currently show
  const ratings = [...new Set(rows.map(li => Number(li.dataset.rating)).filter(Boolean))].sort((a, b) => a - b);
  for (const s of [lo, hi]) s.insertAdjacentHTML('beforeend', ratings.map(r => `<option value="${r}">${r}</option>`).join(''));
  bar.hidden = false;
  // ?q=&status=&min=&max=&sort=&topics=greedy,sorting restores a shared view (the roadmap links use topics); invalid values are ignored
  const params = new URLSearchParams(location.search);
  q.value = params.get('q') || '';
  for (const [el, k] of [[status, 'status'], [lo, 'min'], [hi, 'max'], [sort, 'sort']]) {
    const v = params.get(k); if ([...el.options].some(o => o.value === v)) el.value = v;
  }
  const order = el => { if (lo.value && hi.value && Number(lo.value) > Number(hi.value)) (el === lo ? hi : lo).value = el.value; };
  order(lo);
  (params.get('topics') || '').split(',').forEach(t => {
    const c = chips.find(c => c.dataset.tag === t); if (c) { chosen.add(t); c.setAttribute('aria-pressed', 'true'); }
  });

  const topicsOf = li => (li.dataset.topics || '').split(' ').filter(Boolean);
  const passes = (li, skipTopics) => {
    const words = q.value.toLowerCase().trim().split(/\s+/).filter(Boolean), r = Number(li.dataset.rating) || 0;
    const a = Number(lo.value) || 0, b = Number(hi.value) || 0;
    return words.every(w => li.dataset.search.includes(w))
      && (!status.value || (status.value === 'upsolved' ? li.dataset.upsolve === '1' : li.dataset.status === status.value))
      && ((!a && !b) || (r > 0 && (!a || r >= a) && (!b || r <= b)))
      && (skipTopics || !chosen.size || topicsOf(li).some(t => chosen.has(t)));
  };
  const key = { newest: li => -Number(li.dataset.date.replaceAll('-', '')), rating: li => -(Number(li.dataset.rating) || 0),
    easiest: li => Number(li.dataset.rating) || 99999, id: li => li.dataset.id };
  // Active filter chips: search, status, rating range, then each chosen topic. Sort is not a filter, so it has none.
  const active = box.querySelector('.idx-active');
  const labelOf = c => c.firstChild.textContent.trim();
  const filters = () => {
    const f = [], words = q.value.trim(), a = lo.value, b = hi.value;
    if (words) f.push(['q', `“${words}”`]);
    if (status.value) f.push(['status', tabs.find(t => t.dataset.seg === status.value)?.textContent.trim() || status.value]);
    if (a || b) f.push(['range', a && b ? `Rated ${a}–${b}` : a ? `Rated from ${a}` : `Rated up to ${b}`]);
    for (const c of chips) if (chosen.has(c.dataset.tag)) f.push(['topic:' + c.dataset.tag, labelOf(c)]);
    return f;
  };
  const showActive = () => {
    if (!active) return;
    const f = filters();
    active.replaceChildren(...f.map(([x, label]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip idx-x'; b.dataset.x = x; b.setAttribute('aria-label', `Remove filter: ${label}`);
      const t = document.createElement('span'); t.textContent = label;
      b.append(t); b.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m5 5 6 6m0-6-6 6"/></svg>');
      return b;
    }));
    if (f.length > 1) active.insertAdjacentHTML('beforeend', '<button type="button" class="linkish idx-clear">Clear all</button>');
    active.hidden = !f.length;
  };
  const apply = () => {
    let shown = 0;
    for (const li of rows) { const ok = passes(li, false); li.hidden = !ok; shown += ok; }
    const k = key[sort.value];
    rows.slice().sort((a, b) => { const x = k(a), y = k(b); return x < y ? -1 : x > y ? 1 : 0; }).forEach(li => list.append(li));
    for (const c of chips) {
      const n = rows.filter(li => passes(li, true) && topicsOf(li).includes(c.dataset.tag)).length;
      c.querySelector('.n').textContent = n;
      c.querySelector('.vh').textContent = n === 1 ? ' problem' : ' problems'; // accessible name: "Greedy 9 problems"
    }
    for (const b of tabs) b.setAttribute('aria-pressed', String(b.dataset.seg === status.value));
    count.textContent = `Showing ${shown} of ${rows.length} problem${rows.length === 1 ? '' : 's'}`;
    empty.hidden = shown > 0;
    if (rand) rand.disabled = shown === 0;
    showActive();
    // the arrow-key hint is read once, on the first row a screen reader reaches (a list can't take focus)
    rows.forEach(li => li.querySelector('a.row').removeAttribute('aria-describedby'));
    [...list.children].find(li => !li.hidden)?.querySelector('a.row').setAttribute('aria-describedby', 'idx-hint');
  };
  const smooth = () => {
    if (!document.startViewTransition || still.matches) return apply();
    // a newer change, or a page transition still revealing the page, can skip this one; the filter result still applies
    let t; try { t = document.startViewTransition(apply); } catch { return apply(); }
    for (const p of [t.ready, t.finished, t.updateCallbackDone]) p.catch(() => {});
  };
  // Mirror the view in the URL. replaceState, never pushState, so filtering does not fill the back button; the hash and other params stay.
  const sync = () => {
    try {
      const u = new URL(location.href), p = u.searchParams, put = (k, v) => v ? p.set(k, v) : p.delete(k);
      put('q', q.value.trim()); put('status', status.value); put('min', lo.value); put('max', hi.value);
      put('sort', sort.value === 'newest' ? '' : sort.value); put('topics', [...chosen].join(','));
      u.search = p.toString().replaceAll('%2C', ','); // keep ?topics=a,b readable
      history.replaceState(history.state, '', u);
    } catch {} // Safari throttles replaceState; filtering works without the URL
  };
  let timer; const syncSoon = () => { clearTimeout(timer); timer = setTimeout(sync, 300); }; // while typing
  [q, status, sort, lo, hi].forEach(el => el.addEventListener('input', () => {
    order(el); smooth(); el === q ? syncSoon() : sync();
  }));
  chips.forEach(c => c.addEventListener('click', () => {
    const on = c.getAttribute('aria-pressed') !== 'true'; c.setAttribute('aria-pressed', String(on));
    if (on) chosen.add(c.dataset.tag); else chosen.delete(c.dataset.tag);
    smooth(); sync();
  }));
  tabs.forEach(b => b.addEventListener('click', () => {
    status.value = b.dataset.seg; status.dispatchEvent(new Event('input'));
  }));
  if (rand) rand.addEventListener('click', () => {
    const shown = rows.filter(li => !li.hidden);
    if (shown.length) location.assign(shown[Math.floor(Math.random() * shown.length)].querySelector('a.row').href);
  });
  const reset = () => {
    q.value = ''; status.value = ''; lo.value = ''; hi.value = ''; chosen.clear();
    chips.forEach(c => c.setAttribute('aria-pressed', 'false')); apply(); sync(); q.focus();
  };
  empty.querySelector('button').addEventListener('click', reset);
  if (active) active.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.classList.contains('idx-clear')) return reset();
    const at = [...active.querySelectorAll('.idx-x')].indexOf(b), x = b.dataset.x;
    if (x === 'q') q.value = '';
    else if (x === 'status') status.value = '';
    else if (x === 'range') { lo.value = ''; hi.value = ''; }
    else { const t = x.slice(6); chosen.delete(t); chips.find(c => c.dataset.tag === t)?.setAttribute('aria-pressed', 'false'); }
    apply(); sync();
    const left = active.querySelectorAll('.idx-x'); // focus the chip now in the same place, else the one before, else search
    (left[at] || left[at - 1] || q).focus();
  });

  // Arrow keys move between the rows the filters show, in the current sort order, only while a row has focus.
  list.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey || !e.target.matches('a.row')) return;
    const vis = [...list.children].filter(li => !li.hidden).map(li => li.querySelector('a.row'));
    const i = vis.indexOf(e.target);
    const to = { ArrowDown: vis[Math.min(i + 1, vis.length - 1)], ArrowUp: vis[Math.max(i - 1, 0)], Home: vis[0], End: vis.at(-1) }[e.key];
    if (!to) return;
    e.preventDefault();
    to.focus({ preventScroll: true });
    to.scrollIntoView({ block: 'nearest', behavior: still.matches ? 'auto' : 'smooth' });
  });

  // "Copy link to this view": the URL already mirrors the filters, so flush a pending search update first.
  const copyBtn = bar.querySelector('[data-copy-view]'), say = bar.querySelector('[data-copy-say]');
  let copyTimer;
  const idle = copyBtn ? copyBtn.innerHTML : ''; // "Copy link" plus a visually hidden " to this view"
  if (copyBtn) copyBtn.addEventListener('click', async () => {
    clearTimeout(timer); sync();
    let ok = true;
    try { await navigator.clipboard.writeText(new URL('#index', location.href).href); } catch { ok = false; } // also when the Clipboard API is missing
    if (ok) copyBtn.textContent = 'Link copied';
    if (say) say.textContent = ok ? 'Link copied' : 'Couldn’t copy. The address bar has the link.';
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => { copyBtn.innerHTML = idle; if (say) say.textContent = ''; }, 2000);
  });
  apply();

  // The climb chart's dot tooltips: Esc hides the one being shown (WCAG 1.4.13) until the pointer or focus leaves that dot.
  const plot = document.querySelector('.ladder-plot');
  if (plot) {
    const hush = el => { el.dataset.hush = ''; const off = () => { delete el.dataset.hush; el.removeEventListener('pointerleave', off); el.removeEventListener('blur', off); };
      el.addEventListener('pointerleave', off); el.addEventListener('blur', off); };
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      const on = plot.querySelector('.pt:focus-visible') || plot.querySelector('.pt:hover');
      if (on) hush(on);
    });
  }
})();
