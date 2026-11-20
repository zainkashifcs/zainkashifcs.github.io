// Contribution-style heatmap. Progressive enhancement: the feed and summary are plain HTML; this draws
// the calendar from <script id="activity-data">. Only verified entries (file or post evidence) count.
(() => {
  const root = document.querySelector('[data-heatmap]');
  const src = document.getElementById('activity-data');
  if (!root || !src) return;
  const { start, today, base, pages = {}, ratings = {}, events } = JSON.parse(src.textContent);
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

  // Frosted tooltip "6 Nov 2026 · 3 solved · max 1100": one element that glides from cell to cell, growing out of the
  // cell it describes. Solved = independent solves and upsolves with file or post evidence; max = their hardest rating.
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dmy = s => { const d = day(s); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
  const solvedOn = s => (byDay.get(s) || []).filter(e => (e.type === 'solved' || e.type === 'upsolved') && e.assisted === false && e.verification !== 'message');
  const tipText = s => {
    if (s < start) return `${dmy(s)}: before the log started`;
    const sv = solvedOn(s);
    if (!sv.length) return `${dmy(s)} · ${plural(count(s)).replace(/^No/, 'no')}`;
    const rs = sv.map(e => ratings[e.problem]).filter(Number.isFinite);
    return `${dmy(s)} · ${sv.length} solved${rs.length ? ` · max ${Math.max(...rs)}` : ''}`;
  };
  const tip = root.querySelector('.tip');
  tip.classList.add('z2-tip'); tip.setAttribute('aria-hidden', 'true'); // every day button names its own count
  let tipTimer = 0;
  const show = el => {
    const s = el.dataset.date; if (!s || el.classList.contains('future')) return;
    clearTimeout(tipTimer);
    const was = tip.classList.contains('is-open');
    tip.hidden = false; tip.textContent = tipText(s);
    const r = el.getBoundingClientRect(), w = root.getBoundingClientRect();
    const cx = r.left - w.left + r.width / 2, tw = tip.offsetWidth, th = tip.offsetHeight;
    const tx = Math.max(0, Math.min(w.width - tw, cx - tw / 2)), ty = r.top - w.top - th - 8;
    tip.classList.toggle('z2-snap', !was || still());
    tip.style.setProperty('--tx', tx + 'px'); tip.style.setProperty('--ty', ty + 'px');
    tip.style.setProperty('--origin-x', (cx - tx) + 'px'); tip.style.setProperty('--origin-y', (th + 8) + 'px');
    if (!was) void tip.offsetWidth;
    tip.classList.add('is-open');
  };
  // closed = no .is-open (fades out), then [hidden] once the fade is over
  const shut = () => { tip.classList.remove('is-open'); tipTimer = setTimeout(() => { tip.hidden = true; }, 140); };
  const hide = () => { clearTimeout(tipTimer); tipTimer = setTimeout(shut, 90); };
  grid.addEventListener('mouseover', e => e.target.classList.contains('d') && show(e.target));
  grid.addEventListener('focusin', e => show(e.target));
  grid.addEventListener('mouseleave', hide);
  grid.addEventListener('focusout', hide);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !tip.hidden) { clearTimeout(tipTimer); shut(); } });

  const panel = document.querySelector('[data-dayview]');
  const item = e => {
    const page = e.post || pages[e.problem], href = page ? (base || '') + page : e.source_url;
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
  const press = d => grid.querySelectorAll('button.d').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.date === d)));
  if (panel) { // /activity/: the day panel beside the calendar
    grid.addEventListener('click', e => e.target.matches('button.d') && select(e.target));
    const latest = [...grid.querySelectorAll('button.d')].pop(); if (latest) select(latest);
  } else if (document.querySelector('[data-index]')) {
    // Homepage: a day filters the problem index below to that date (assets/js/index.js); pressing it again clears it.
    root.querySelector('.heat').setAttribute('aria-label', 'Verified activity since the log began. Days with activity are buttons that filter the problem index to that day.');
    grid.addEventListener('click', e => {
      if (!e.target.matches('button.d')) return;
      const date = e.target.getAttribute('aria-pressed') === 'true' ? '' : e.target.dataset.date;
      if (date) document.getElementById('index')?.scrollIntoView({ block: 'start', behavior: still() ? 'auto' : 'smooth' });
      document.dispatchEvent(new CustomEvent('index:date', { detail: { date } }));
    });
    document.addEventListener('index:date', e => press((e.detail && e.detail.date) || ''));
    const q = new URLSearchParams(location.search).get('date');
    if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) press(q);
  }
  const sc = root.querySelector('.heat-scroll'); sc.scrollLeft = sc.scrollWidth; // phones start at the most recent weeks
})();
