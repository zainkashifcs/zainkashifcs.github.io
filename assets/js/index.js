// Problem index: search, status, rating range, topics and sort, combined with AND (topics match if any chosen topic
// applies). Topic counts show how many problems each topic would give with the other filters as they are.
// The optional [data-random] button opens a random problem among the rows the filters show.
// The view is mirrored in the URL (q, status, min, max, sort, topics) so it can be linked and survives reload.
// Without JS the full list shows and the toolbar stays hidden.
(() => {
  const box = document.querySelector('[data-index]'); if (!box) return;
  const bar = box.querySelector('.toolbar'), list = box.querySelector('.index'), count = box.querySelector('.count'), empty = box.querySelector('.empty');
  const rows = [...list.children];
  rows.forEach(li => { li.style.viewTransitionName = 'row-' + li.dataset.id.replace(/[^\w-]/g, ''); });
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const q = bar.querySelector('input'), status = bar.querySelector('[name=status]'), sort = bar.querySelector('[name=sort]');
  const lo = bar.querySelector('[name=min]'), hi = bar.querySelector('[name=max]');
  const chips = [...bar.querySelectorAll('.chip')], chosen = new Set();
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
      && (!status.value || li.dataset.status === status.value)
      && ((!a && !b) || (r > 0 && (!a || r >= a) && (!b || r <= b)))
      && (skipTopics || !chosen.size || topicsOf(li).some(t => chosen.has(t)));
  };
  const key = { newest: li => -Number(li.dataset.date.replaceAll('-', '')), rating: li => -(Number(li.dataset.rating) || 0),
    easiest: li => Number(li.dataset.rating) || 99999, id: li => li.dataset.id };
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
    count.textContent = `Showing ${shown} of ${rows.length} problem${rows.length === 1 ? '' : 's'}`;
    empty.hidden = shown > 0;
    if (rand) rand.disabled = shown === 0;
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
  if (rand) rand.addEventListener('click', () => {
    const shown = rows.filter(li => !li.hidden);
    if (shown.length) location.assign(shown[Math.floor(Math.random() * shown.length)].querySelector('a.row').href);
  });
  empty.querySelector('button').addEventListener('click', () => {
    q.value = ''; status.value = ''; lo.value = ''; hi.value = ''; chosen.clear();
    chips.forEach(c => c.setAttribute('aria-pressed', 'false')); apply(); sync(); q.focus();
  });
  apply();
})();
