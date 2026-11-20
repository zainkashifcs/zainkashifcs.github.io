// Homepage only: the pace simulator under the climb chart and the climb chart's shared, gliding dot tooltip.
// Progressive enhancement: without JavaScript the pace panel stays hidden and each dot keeps its own CSS tooltip.
(() => {
  const MONTHS = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');
  // Monday-based week numbers, the same rule as mastery-data.html: day 0 of the Unix epoch was a Thursday.
  const wk = s => { const [y, m, d] = s.split('-').map(Number); return Math.floor((Date.UTC(y, m - 1, d) / 864e5 + 3) / 7); };
  const dayMon = ms => { const d = new Date(ms); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; };

  // Straight-line projection of the hardest problem solved independently (not a rating) towards target T.
  // data = {built: 'YYYY-MM-DD', peak_id, solves: [[solved_date, rating|null], ...]}.
  const pace = (data, T) => {
    const solves = data.solves || [], rated = solves.filter(s => typeof s[1] === 'number');
    if (!rated.length) return { msg: 'Nothing logged to project from yet.', label: '' };
    const W0 = Math.min(...rated.map(s => wk(s[0])));
    const weeks = wk(data.built) - W0 + 1;
    const firstPeak = Math.max(...rated.filter(s => wk(s[0]) === W0).map(s => s[1]));
    const peak = Math.max(...rated.map(s => s[1]));
    const rate = (solves.length / weeks).toFixed(1);
    const at = rated.filter(s => s[1] >= T).length;
    const label = `Straight-line projection, not a prediction. It assumes the average pace logged from ${dayMon((W0 * 7 - 3) * 864e5)} to ${dayMon(Date.parse(data.built + 'T00:00:00Z'))} ${data.built.slice(0, 4)} (hardest independent solve up ${peak - firstPeak} over ${weeks - 1} weeks, ${rate} solves a week) simply continues.`;
    const out = { weeks, W0, firstPeak, peak, rate, at, label };
    if (weeks < 3) return { ...out, msg: 'Too few weeks logged for a projection.' };
    if (peak >= T) return { ...out, msg: `Reached: hardest solved independently is ${peak} (${data.peak_id}).` };
    if (peak - firstPeak <= 0) return { ...out, msg: "The hardest solve hasn't risen since the first week, so a straight line gives no date." };
    const weeksTo = Math.ceil((T - peak) * (weeks - 1) / (peak - firstPeak));
    return { ...out, weeksTo, problemsTo: Math.ceil(weeksTo * solves.length / weeks) };
  };

  if (typeof document === 'undefined') { module.exports = { pace, wk }; return; }

  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const celebrate = el => {
    el.classList.remove('fx-celebrate'); void el.offsetWidth; el.classList.add('fx-celebrate');
    el.addEventListener('animationend', () => el.classList.remove('fx-celebrate'), { once: true });
  };

  // ---- pace simulator
  const root = document.querySelector('[data-pace-root]'), src = document.getElementById('pace-data');
  if (root && src) {
    let data = null;
    try { data = JSON.parse(src.textContent); } catch (e) { data = null; }
    if (data && Array.isArray(data.solves) && /^\d{4}-\d{2}-\d{2}$/.test(data.built || '')) {
      const out = root.querySelector('[data-pace-out]'), note = root.querySelector('[data-pace-note]');
      const pills = [...root.querySelectorAll('[data-pace]')];
      const NAME = { 1400: 'to 1400 (Specialist)', 1800: 'to 1800 (goal)' };
      const show = T => {
        const r = pace(data, T);
        pills.forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.pace) === T)));
        out.replaceChildren();
        const head = document.createElement('span'); head.className = 'pace-to'; head.textContent = NAME[T];
        const main = document.createElement('b'); main.className = 'pace-main';
        main.textContent = r.msg || `≈${r.weeksTo} week${r.weeksTo === 1 ? '' : 's'} · about ${r.problemsTo} more independent solve${r.problemsTo === 1 ? '' : 's'}`;
        out.append(head, main);
        if (r.label) {
          const so = document.createElement('span'); so.className = 'pace-so'; so.textContent = `Solved at ${T}+ so far: ${r.at}`;
          out.append(so);
        }
        note.textContent = r.label;
      };
      pills.forEach(b => b.addEventListener('click', () => {
        const T = Number(b.dataset.pace);
        show(T);
        if (T === 1800) celebrate(out);
      }));
      show(1400);
      root.hidden = false;
    }
  }

  // ---- the climb chart draws in left to right every time it enters the viewport, scrolling down or back up.
  // Hysteresis: it draws once a quarter is visible and resets only when it is fully out (20px inside each edge).
  // Never unobserved. Without .motion (reduced motion, or the head script did not run) nothing is armed, so the chart
  // simply stays drawn.
  const draw = document.querySelector('.ladder-plot');
  if (draw && document.documentElement.classList.contains('motion') && 'IntersectionObserver' in window) {
    const r = draw.getBoundingClientRect();
    if (r.top < innerHeight && r.bottom > 0) draw.classList.add('is-drawn');   // already on screen: no flash
    draw.classList.add('draw-armed');
    new IntersectionObserver(([e]) => {
      if (e.intersectionRatio >= 0.25) draw.classList.add('is-drawn');
      else if (!e.isIntersecting) draw.classList.remove('is-drawn');
    }, { rootMargin: '-20px 0px -20px 0px', threshold: [0, 0.25] }).observe(draw);
  }

  // ---- the climb chart: one tooltip that glides between dots, origin at the dot; Esc hides it (WCAG 1.4.13)
  // until the pointer or focus leaves that dot. (Moved here from index.js.)
  const plot = document.querySelector('.ladder-plot');
  if (plot) {
    const tip = document.createElement('div');
    tip.className = 'dot-tip z1-tip'; tip.setAttribute('aria-hidden', 'true'); tip.hidden = true;
    plot.append(tip); plot.classList.add('z1-glide');
    let cur = null, timer = 0;
    const open = pt => {
      clearTimeout(timer);
      if (pt.hasAttribute('data-hush') || pt === cur) return;
      const from = pt.querySelector('.dot-tip'); if (!from) return;
      const was = tip.classList.contains('is-open');
      tip.hidden = false; tip.innerHTML = from.innerHTML;
      const p = plot.getBoundingClientRect(), d = pt.getBoundingClientRect();
      const cx = d.left - p.left + d.width / 2, cy = d.top - p.top + d.height / 2;
      const w = tip.offsetWidth, h = tip.offsetHeight;
      const below = cy - h - 14 < 0;
      const tx = Math.max(0, Math.min(p.width - w, cx - w / 2)), ty = below ? cy + 14 : cy - h - 14;
      tip.classList.toggle('z1-snap', !was || still());
      tip.style.setProperty('--tx', tx + 'px'); tip.style.setProperty('--ty', ty + 'px');
      tip.style.setProperty('--origin-x', (cx - tx) + 'px'); tip.style.setProperty('--origin-y', (below ? -14 : h + 14) + 'px');
      if (!was) void tip.offsetWidth;
      tip.classList.add('is-open'); cur = pt;
    };
    // closed = no .is-open (fades out), then [hidden] once the fade is over
    const close = () => { clearTimeout(timer); tip.classList.remove('is-open'); cur = null; timer = setTimeout(() => { tip.hidden = true; }, 140); };
    const later = () => { clearTimeout(timer); timer = setTimeout(close, 120); };
    plot.addEventListener('pointerover', e => { const pt = e.target.closest('.pt'); if (pt) open(pt); });
    plot.addEventListener('pointerout', e => { if (e.target.closest('.pt') && !plot.contains(document.activeElement)) later(); });
    plot.addEventListener('focusin', e => { const pt = e.target.closest('.pt'); if (pt) open(pt); });
    plot.addEventListener('focusout', later);
    const hush = el => {
      el.dataset.hush = '';
      const off = () => { delete el.dataset.hush; el.removeEventListener('pointerleave', off); el.removeEventListener('blur', off); };
      el.addEventListener('pointerleave', off); el.addEventListener('blur', off);
    };
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      const on = cur || plot.querySelector('.pt:focus-visible') || plot.querySelector('.pt:hover');
      if (on) { hush(on); close(); }
    });
  }
})();
