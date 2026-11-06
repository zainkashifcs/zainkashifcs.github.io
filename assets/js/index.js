// Problem index search, topic and status filters, and sort. Without JS the full list shows and the toolbar stays hidden.
(() => {
  const box = document.querySelector('[data-index]'); if (!box) return;
  const bar = box.querySelector('.toolbar'), list = box.querySelector('.index'), count = box.querySelector('.count'), empty = box.querySelector('.empty');
  const rows = [...list.children];
  rows.forEach(li => { li.style.viewTransitionName = 'row-' + li.dataset.id.replace(/[^\w-]/g, ''); });
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const q = bar.querySelector('input'), topic = bar.querySelector('[name=topic]'), status = bar.querySelector('[name=status]'), sort = bar.querySelector('[name=sort]');
  bar.hidden = false;
  const key = { newest: li => -Number(li.dataset.date.replaceAll('-', '')), rating: li => -(Number(li.dataset.rating) || 0), id: li => li.dataset.id };
  const apply = () => {
    const words = q.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    let shown = 0;
    for (const li of rows) {
      const ok = words.every(w => li.dataset.search.includes(w)) && (!topic.value || li.dataset.topics.split('|').includes(topic.value)) && (!status || !status.value || li.dataset.status === status.value);
      li.hidden = !ok; shown += ok;
    }
    const k = key[sort.value];
    rows.slice().sort((a, b) => { const x = k(a), y = k(b); return x < y ? -1 : x > y ? 1 : 0; }).forEach(li => list.append(li));
    count.textContent = `Showing ${shown} of ${rows.length} problem${rows.length === 1 ? '' : 's'}`;
    empty.hidden = shown > 0;
    empty.querySelector('span').textContent = q.value || topic.value || (status && status.selectedOptions[0].text) || '';
  };
  const smooth = () => {
    if (!document.startViewTransition || still.matches) return apply();
    document.startViewTransition(apply).ready.catch(() => {}); // a newer change can skip this transition; expected, not an error
  };
  [q, topic, status, sort].filter(Boolean).forEach(el => el.addEventListener('input', smooth));
  empty.querySelector('button').addEventListener('click', () => { q.value = ''; topic.value = ''; if (status) status.value = ''; apply(); q.focus(); });
  apply();
})();
