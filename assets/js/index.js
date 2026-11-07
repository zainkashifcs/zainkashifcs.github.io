// Problem index: search, status, rating range, topics and sort, combined with AND (topics match if any chosen topic
// applies). Topic counts show how many problems each topic would give with the other filters as they are.
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
  const ratings = [...new Set(rows.map(li => Number(li.dataset.rating)).filter(Boolean))].sort((a, b) => a - b);
  for (const s of [lo, hi]) s.insertAdjacentHTML('beforeend', ratings.map(r => `<option value="${r}">${r}</option>`).join(''));
  bar.hidden = false;

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
      c.setAttribute('aria-label', `${c.firstChild.textContent.trim()}, ${n} problem${n === 1 ? '' : 's'}`);
    }
    count.textContent = `Showing ${shown} of ${rows.length} problem${rows.length === 1 ? '' : 's'}`;
    empty.hidden = shown > 0;
  };
  const smooth = () => {
    if (!document.startViewTransition || still.matches) return apply();
    document.startViewTransition(apply).ready.catch(() => {}); // a newer change can skip this transition; expected, not an error
  };
  [q, status, sort, lo, hi].forEach(el => el.addEventListener('input', () => {
    if (lo.value && hi.value && Number(lo.value) > Number(hi.value)) (el === lo ? hi : lo).value = el.value;
    smooth();
  }));
  chips.forEach(c => c.addEventListener('click', () => {
    const on = c.getAttribute('aria-pressed') !== 'true'; c.setAttribute('aria-pressed', String(on));
    if (on) chosen.add(c.dataset.tag); else chosen.delete(c.dataset.tag);
    smooth();
  }));
  empty.querySelector('button').addEventListener('click', () => {
    q.value = ''; status.value = ''; lo.value = ''; hi.value = ''; chosen.clear();
    chips.forEach(c => c.setAttribute('aria-pressed', 'false')); apply(); q.focus();
  });
  apply();
})();
