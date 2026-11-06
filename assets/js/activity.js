// Contribution-style heatmap. Progressive enhancement: the feed and summary are plain HTML; this draws
// the calendar from <script id="activity-data">. Only verified entries (file or post evidence) count.
(() => {
  const root = document.querySelector('[data-heatmap]');
  const src = document.getElementById('activity-data');
  if (!root || !src) return;
  const { start, today, base, events } = JSON.parse(src.textContent);
  const LABEL = { solved: 'Solved', upsolved: 'Upsolved', redo: 'Redo', attempted: 'Attempted', practice: 'Practice', published: 'Published', milestone: 'Milestone' };
  const MONTHS = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const byDay = new Map();
  for (const e of events) (byDay.get(e.date) || byDay.set(e.date, []).get(e.date)).push(e);
  const verified = e => e.type !== 'milestone' && e.verification !== 'message';
  const count = d => (byDay.get(d) || []).filter(verified).length;
  const level = n => (n === 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : n <= 4 ? 3 : 4);
  const iso = d => d.toISOString().slice(0, 10);
  const day = s => new Date(s + 'T00:00:00Z');
  const fmt = (s, o) => day(s).toLocaleDateString('en-GB', { timeZone: 'UTC', ...o });
  const plural = n => `${n || 'No'} ${n === 1 ? 'activity' : 'activities'}`;

  const end = day(today);
  const weeksBack = Math.min(52, Math.max(19, Math.ceil((end - day(start)) / 6048e5) + 2)); // at least ~20 columns, at most a year
  const first = new Date(end); first.setUTCDate(first.getUTCDate() - 7 * weeksBack - ((end.getUTCDay() + 6) % 7)); // a Monday
  const grid = document.createElement('div'); grid.className = 'grid';
  const months = document.createElement('div'); months.className = 'months'; months.setAttribute('aria-hidden', 'true');
  for (let d = new Date(first), i = 0; d <= end || (d.getUTCDay() + 6) % 7 !== 0; d.setUTCDate(d.getUTCDate() + 1), i++) {
    const s = iso(d), n = count(s);
    if (i % 7 === 0) { const m = document.createElement('span'); if (d.getUTCDate() <= 7) m.textContent = MONTHS[d.getUTCMonth()]; months.append(m); }
    let cell;
    if (byDay.has(s) && d <= end && s >= start) {
      cell = document.createElement('button'); cell.type = 'button'; cell.className = 'd l' + level(n);
      cell.setAttribute('aria-pressed', 'false');
      cell.setAttribute('aria-label', `${fmt(s, { day: 'numeric', month: 'long', year: 'numeric' })}: ${plural(n).toLowerCase()}`);
    } else {
      cell = document.createElement('span'); cell.setAttribute('aria-hidden', 'true');
      cell.className = 'd' + (d > end ? ' future' : s < start ? ' none' : '');
    }
    cell.dataset.date = s; grid.append(cell);
  }
  const days = document.createElement('div'); days.className = 'days'; days.setAttribute('aria-hidden', 'true');
  days.innerHTML = '<span>Mon</span><span></span><span>Wed</span><span></span><span>Fri</span><span></span><span></span>';
  root.querySelector('.heat').append(months, days, grid);

  const tip = root.querySelector('.tip');
  const show = el => {
    const s = el.dataset.date; if (!s || el.classList.contains('future')) return;
    tip.textContent = s < start ? `${fmt(s, { day: 'numeric', month: 'short' })}: before the log started`
      : `${plural(count(s))} on ${fmt(s, { day: 'numeric', month: 'short', year: 'numeric' })}`;
    const r = el.getBoundingClientRect(), w = root.getBoundingClientRect();
    tip.style.left = (r.left - w.left + r.width / 2) + 'px'; tip.style.top = (r.top - w.top) + 'px'; tip.hidden = false;
  };
  grid.addEventListener('mouseover', e => e.target.classList.contains('d') && show(e.target));
  grid.addEventListener('focusin', e => show(e.target));
  grid.addEventListener('mouseleave', () => { tip.hidden = true; });
  grid.addEventListener('focusout', () => { tip.hidden = true; });

  const panel = document.querySelector('[data-dayview]');
  const item = e => {
    const href = e.post ? (base || '') + e.post : e.source_url;
    const name = e.type === 'milestone' ? esc(e.note) : `<span class="vh">${esc(e.problem)} </span>${esc(e.title)}`;
    const rb = e.type === 'milestone' ? '<span class="rb ms" aria-hidden="true"></span>' : `<span class="rb">${esc(e.problem)}</span>`;
    return `<li class="ev ${esc(e.type)}${e.assisted ? ' assisted' : ''}">${rb}`
      + `<span class="what">${href ? `<a href="${esc(href)}">${name}</a>` : name}`
      + `${e.note && e.type !== 'milestone' ? `<span class="note">${esc(e.note)}</span>` : ''}`
      + `${e.verification === 'message' && e.type !== 'milestone' ? '<span class="unverified">Message only, unverified</span>' : ''}</span>`
      + `<span class="type">${LABEL[e.type] || esc(e.type)}${e.assisted ? ', assisted' : ''}</span></li>`;
  };
  const select = btn => {
    grid.querySelectorAll('[aria-pressed="true"]').forEach(b => b.setAttribute('aria-pressed', 'false'));
    btn.setAttribute('aria-pressed', 'true');
    const s = btn.dataset.date;
    panel.querySelector('h3').textContent = fmt(s, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    panel.querySelector('p').textContent = `${plural(count(s))} verified`;
    panel.querySelector('ul').innerHTML = byDay.get(s).slice().reverse().map(item).join(''); // newest first, like the feed
    if (panel.animate && !matchMedia('(prefers-reduced-motion: reduce)').matches && select.ready)
      panel.animate([{ opacity: 0, transform: 'translateY(3px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.22,.61,.36,1)' });
    select.ready = true;
  };
  grid.addEventListener('click', e => e.target.matches('button.d') && select(e.target));
  const latest = [...grid.querySelectorAll('button.d')].pop(); if (latest) select(latest);
  const sc = root.querySelector('.heat-scroll'); sc.scrollLeft = sc.scrollWidth; // phones start at the most recent weeks
})();
