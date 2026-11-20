// Problem index: search, status, rating range, topics, day and sort, combined with AND (topics match if any chosen
// topic applies). Topic counts show how many problems each topic would give with the other filters as they are.
// The optional [data-random] button opens a random problem among the rows the filters show.
// The view is mirrored in the URL (q, status, min, max, sort, topics, date) so it can be linked and survives reload.
// The status tabs (.segmented) drive the visually hidden status select, which stays the single source of truth.
// The rating bands ([data-band]) only set the min/max selects. A heatmap day click (document event 'index:date')
// filters to that day. "Needs review" = only a redo logged, or an approved quiz question due today in this browser.
// Without JS the full list shows and the filter rail stays hidden.
// Keyboard: while a row has focus, the arrow keys, J/K, Home and End move between the visible rows (no global shortcuts).
// The active filters show as removable chips above the count, and "Copy link to this view" copies the mirrored URL.
(() => {
  const box = document.querySelector('[data-index]'); if (!box) return;
  const bar = box.querySelector('.toolbar'), list = box.querySelector('.index'), count = box.querySelector('.count'), empty = box.querySelector('.empty');
  const rows = [...list.children];
  rows.forEach(li => { li.style.viewTransitionName = 'row-' + li.dataset.id.replace(/[^\w-]/g, ''); });
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const q = bar.querySelector('input'), status = bar.querySelector('[name=status]'), sort = bar.querySelector('[name=sort]');
  const lo = bar.querySelector('[name=min]'), hi = bar.querySelector('[name=max]');
  const chips = [...bar.querySelectorAll('.chip[data-tag]')], chosen = new Set();
  const bands = [...bar.querySelectorAll('[data-band]')];
  const tabs = [...bar.querySelectorAll('[data-seg]')], reviewTab = tabs.find(t => t.dataset.seg === 'review');
  const rand = bar.querySelector('[data-random]'); // "Random problem": opens one of the rows the filters currently show
  // every rating in the log plus each band's ends, so a band can always be shown in the selects
  const ratings = [...new Set([...rows.map(li => Number(li.dataset.rating)).filter(Boolean), 800, 1000, 1100, 1300, 1400])].sort((a, b) => a - b);
  for (const s of [lo, hi]) s.insertAdjacentHTML('beforeend', ratings.map(r => `<option value="${r}">${r}</option>`).join(''));
  const DATE = /^\d{4}-\d{2}-\d{2}$/;
  let date = '';

  // "Needs review". Copied from quiz.js (INTERVALS, review, isDue, localDay, addDays), which stays the source of truth
  // for the schedule; read only. Never-answered questions are never due. Blocked storage or bad JSON: only redos count.
  const INTERVALS = [1, 3, 7, 14, 30];
  const pad = n => String(n).padStart(2, '0');
  const localDay = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = (day, n) => { const [y, m, d] = day.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
  const isRecord = r => !!r && typeof r === 'object' && !Array.isArray(r);
  const review = r => {
    if (!isRecord(r)) return null;
    if (Number.isInteger(r.box) && DATE.test(r.due)) return { box: Math.min(Math.max(r.box, 0), INTERVALS.length - 1), due: r.due };
    const box = r.last === 'right' ? 1 : 0;
    return { box, due: DATE.test(r.at) ? addDays(r.at, INTERVALS[box]) : '0000-00-00' };
  };
  const isDue = (r, today) => { const s = review(r); return !!s && s.due <= today; };
  const quizHistory = () => { try { const h = JSON.parse(localStorage.getItem('quiz-progress')); return isRecord(h) ? h : {}; } catch { return {}; } };
  const setCount = (b, n) => { b.querySelector('.n').textContent = n; b.querySelector('.vh').textContent = n === 1 ? ' problem' : ' problems'; };
  const recount = () => { // returns true when an active "Needs review" filter had to fall back to All
    const h = quizHistory(), today = localDay();
    let n = 0;
    for (const li of rows) {
      const due = li.dataset.status === 'redo' || (li.dataset.qids || '').split(' ').some(id => id && isDue(h[id], today));
      li.dataset.review = due ? '1' : ''; n += due;
    }
    setCount(reviewTab, n); reviewTab.hidden = !n;
    if (!n && status.value === 'review') { status.value = ''; return true; }
    return false;
  };
  for (const t of tabs) if (t !== reviewTab) setCount(t, t.dataset.seg ? rows.filter(li => li.dataset.status === t.dataset.seg).length : rows.length);
  recount();
  bar.hidden = false;

  // ?q=&status=&min=&max=&sort=&topics=greedy,sorting&date=YYYY-MM-DD restores a shared view (the roadmap links use topics); invalid values are ignored
  const params = new URLSearchParams(location.search);
  q.value = params.get('q') || '';
  for (const [el, k] of [[status, 'status'], [lo, 'min'], [hi, 'max'], [sort, 'sort']]) {
    const v = params.get(k); if ([...el.options].some(o => o.value === v)) el.value = v;
  }
  if (status.value === 'review' && reviewTab.hidden) status.value = '';
  if (DATE.test(params.get('date') || '')) date = params.get('date');
  const order = el => { if (lo.value && hi.value && Number(lo.value) > Number(hi.value)) (el === lo ? hi : lo).value = el.value; };
  order(lo);
  (params.get('topics') || '').split(',').forEach(t => {
    const c = chips.find(c => c.dataset.tag === t); if (c) { chosen.add(t); c.setAttribute('aria-pressed', 'true'); }
  });

  const topicsOf = li => (li.dataset.topics || '').split(' ').filter(Boolean);
  const statusOk = li => !status.value || (status.value === 'upsolved' ? li.dataset.upsolve === '1'
    : status.value === 'review' ? li.dataset.review === '1' : li.dataset.status === status.value);
  const passes = (li, skipTopics) => {
    const words = q.value.toLowerCase().trim().split(/\s+/).filter(Boolean), r = Number(li.dataset.rating) || 0;
    const a = Number(lo.value) || 0, b = Number(hi.value) || 0;
    return words.every(w => li.dataset.search.includes(w))
      && statusOk(li)
      && ((!a && !b) || (r > 0 && (!a || r >= a) && (!b || r <= b)))
      && (!date || (li.dataset.dates || '').split(' ').includes(date))
      && (skipTopics || !chosen.size || topicsOf(li).some(t => chosen.has(t)));
  };
  const key = { newest: li => -Number(li.dataset.date.replaceAll('-', '')), rating: li => -(Number(li.dataset.rating) || 0),
    easiest: li => Number(li.dataset.rating) || 99999, id: li => li.dataset.id };
  const bandOf = b => b.dataset.band.split('-'); // "1400-" -> ['1400', ''] (open end)
  const MON = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' '); // same short months as the server-rendered dates
  const dayLabel = d => { const [y, m, dd] = d.split('-'); return `On ${+dd} ${MON[m - 1]} ${y}`; };
  // Active filter chips: search, status, day, rating range, then each chosen topic. Sort is not a filter, so it has none.
  const active = box.querySelector('.idx-active');
  const labelOf = c => c.firstChild.textContent.trim();
  const filters = () => {
    const f = [], words = q.value.trim(), a = lo.value, b = hi.value;
    if (words) f.push(['q', `“${words}”`]);
    if (status.value) { const t = tabs.find(t => t.dataset.seg === status.value); f.push(['status', t ? labelOf(t) : status.selectedOptions[0].text]); }
    if (date) f.push(['date', dayLabel(date)]);
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
    const arriving = new Set();
    for (const li of rows) { const ok = passes(li, false); if (ok && li.hidden) arriving.add(li); li.hidden = !ok; shown += ok; }
    const k = key[sort.value];
    rows.slice().sort((a, b) => { const x = k(a), y = k(b); return x < y ? -1 : x > y ? 1 : 0; }).forEach(li => list.append(li));
    // rows that come back cascade in, 20ms apart in their new order (capped, so long lists settle quickly)
    if (arriving.size && !still.matches) {
      let i = 0;
      for (const li of list.children) {
        if (!arriving.has(li)) continue;
        li.style.setProperty('--i', Math.min(i++, 12));
        li.classList.remove('is-arriving'); void li.offsetWidth; li.classList.add('is-arriving');
        li.addEventListener('animationend', () => li.classList.remove('is-arriving'), { once: true });
      }
    }
    for (const c of chips) setCount(c, rows.filter(li => passes(li, true) && topicsOf(li).includes(c.dataset.tag)).length); // accessible name: "Greedy 9 problems"
    for (const b of tabs) b.setAttribute('aria-pressed', String(b.dataset.seg === status.value));
    for (const b of bands) { const [a, z] = bandOf(b); b.setAttribute('aria-pressed', String(lo.value === a && hi.value === z)); }
    count.textContent = `Showing ${shown} of ${rows.length} problem${rows.length === 1 ? '' : 's'}`;
    empty.hidden = shown > 0;
    if (rand) rand.disabled = shown === 0;
    showActive();
    // the arrow-key hint is read once, on the first row a screen reader reaches (a list can't take focus)
    rows.forEach(li => li.querySelector('a.row').removeAttribute('aria-describedby'));
    [...list.children].find(li => !li.hidden)?.querySelector('a.row').setAttribute('aria-describedby', 'idx-hint');
  };
  // resolves once the filter result is in the DOM (also when a view transition is skipped)
  const smooth = () => {
    if (!document.startViewTransition || still.matches) return Promise.resolve(apply());
    // a newer change, or a page transition still revealing the page, can skip this one; the filter result still applies
    let t; try { t = document.startViewTransition(apply); } catch { return Promise.resolve(apply()); }
    for (const p of [t.ready, t.finished]) p.catch(() => {});
    return t.updateCallbackDone.catch(() => {});
  };
  // Mirror the view in the URL. replaceState, never pushState, so filtering does not fill the back button; the hash and other params stay.
  const sync = () => {
    try {
      const u = new URL(location.href), p = u.searchParams, put = (k, v) => v ? p.set(k, v) : p.delete(k);
      put('q', q.value.trim()); put('status', status.value); put('min', lo.value); put('max', hi.value);
      put('sort', sort.value === 'newest' ? '' : sort.value); put('topics', [...chosen].join(',')); put('date', date);
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
  bands.forEach(b => b.addEventListener('click', () => {
    const [a, z] = b.getAttribute('aria-pressed') === 'true' ? ['', ''] : bandOf(b);
    lo.value = a; hi.value = z; smooth(); sync();
  }));
  tabs.forEach(b => b.addEventListener('click', () => {
    status.value = b.dataset.seg; status.dispatchEvent(new Event('input'));
  }));
  // Random Vault pick: a short shuffle across the visible rows (anticipation), then the pick is highlighted, scrolled
  // into view, focused and announced; Enter (or a click) opens it. Reduced motion skips the shuffle.
  let shuffling = 0;
  if (rand) rand.addEventListener('click', () => {
    const shown = rows.filter(li => !li.hidden);
    if (!shown.length || shuffling) return;
    rows.forEach(li => li.classList.remove('is-picked', 'is-shuffle'));
    const pick = shown[Math.floor(Math.random() * shown.length)];
    const land = () => {
      shuffling = 0;
      rows.forEach(li => li.classList.remove('is-shuffle'));
      pick.classList.add('is-picked');
      const a = pick.querySelector('a.row');
      a.scrollIntoView({ block: 'center', behavior: still.matches ? 'auto' : 'smooth' });
      a.focus({ preventScroll: true });
      const say = bar.querySelector('[data-copy-say]');
      if (say) say.textContent = `Picked ${pick.dataset.id} ${a.querySelector('.name')?.textContent || ''}. Press Enter to open it.`;
      a.addEventListener('blur', () => pick.classList.remove('is-picked'), { once: true });
    };
    if (still.matches || shown.length < 2) return land();
    rand.classList.add('is-spinning');
    let hops = 0;
    const hop = () => {
      rows.forEach(li => li.classList.remove('is-shuffle'));
      if (hops++ >= 6) { rand.classList.remove('is-spinning'); return land(); }
      shown[Math.floor(Math.random() * shown.length)].classList.add('is-shuffle');
      shuffling = setTimeout(hop, 70 + hops * 12);   // slowing down, like a wheel settling
    };
    hop();
  });
  // tell the heatmap the day filter is gone, so it can clear its pressed day
  const dropDate = () => { if (!date) return; date = ''; document.dispatchEvent(new CustomEvent('index:date', { detail: { date: '' } })); };
  const clearAll = () => { q.value = ''; status.value = ''; lo.value = ''; hi.value = ''; chosen.clear(); chips.forEach(c => c.setAttribute('aria-pressed', 'false')); };
  const reset = () => { clearAll(); dropDate(); apply(); sync(); q.focus(); };
  empty.querySelector('button').addEventListener('click', reset);
  if (active) active.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.classList.contains('idx-clear')) return reset();
    const at = [...active.querySelectorAll('.idx-x')].indexOf(b), x = b.dataset.x;
    if (x === 'q') q.value = '';
    else if (x === 'status') status.value = '';
    else if (x === 'date') dropDate();
    else if (x === 'range') { lo.value = ''; hi.value = ''; }
    else { const t = x.slice(6); chosen.delete(t); chips.find(c => c.dataset.tag === t)?.setAttribute('aria-pressed', 'false'); }
    apply(); sync();
    const left = active.querySelectorAll('.idx-x'); // focus the chip now in the same place, else the one before, else search
    (left[at] || left[at - 1] || q).focus();
  });
  // A heatmap day click (activity.js) shows only that day: other filters reset, then the list scrolls into view and the
  // day chip takes focus so it can be removed at once. {date: ''} (sent when the chip goes) just drops the day.
  document.addEventListener('index:date', e => {
    const d = e.detail && e.detail.date;
    if (!d) { if (date) { date = ''; smooth(); sync(); } return; }
    if (!DATE.test(d)) return;
    clearTimeout(timer); clearAll(); date = d;
    smooth().then(() => active.querySelector('.idx-x[data-x="date"]')?.focus({ preventScroll: true }));
    sync();
    box.scrollIntoView({ block: 'start', behavior: still.matches ? 'auto' : 'smooth' });
  });
  // A quiz answer elsewhere on the page can make a question due or not: recount "Needs review".
  document.addEventListener('quiz:recorded', () => { const fell = recount(); apply(); if (fell) sync(); });

  // Arrow keys and J/K move between the rows the filters show, in the current sort order, only while a row has focus.
  list.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey || !e.target.matches('a.row')) return;
    const vis = [...list.children].filter(li => !li.hidden).map(li => li.querySelector('a.row'));
    const i = vis.indexOf(e.target), down = vis[Math.min(i + 1, vis.length - 1)], up = vis[Math.max(i - 1, 0)];
    const to = { ArrowDown: down, j: down, ArrowUp: up, k: up, Home: vis[0], End: vis.at(-1) }[e.key];
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
  if (params.get('status') === 'review' && !status.value) sync(); // a stale review link with nothing due: drop it from the URL
})();
