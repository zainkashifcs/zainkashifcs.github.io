// Motion layer, no animation library. Lenis smooths wheel scrolling; the header gains its hairline once the page scrolls.
// Reveals: [data-reveal] and section titles fade up each time they enter the viewport, scrolling down or up, and reset
// only after they have left it completely (plus 48px), so nothing flickers at the edge. The climb chart line and
// the activity calendar wipe in on every entry. The homepage hero rises in once per tab (CSS, html.intro), its
// canvas fades as it scrolls away, and the Road to 1800 card tilts toward a fine pointer, drifts a few pixels with the
// scroll and catches a light along its border. All styling is in style.css (motion section). Nothing here runs under
// prefers-reduced-motion (the head script then never adds .motion); without JS, in print or with reduced motion every
// element stays visible.
(() => {
  const root = document.documentElement;
  if (!root.classList.contains('motion')) return;

  let lenis = null;
  if (window.Lenis) {
    // Touch keeps native scrolling (Lenis default); in-page links keep native jumps so focus moves with them.
    lenis = new window.Lenis({ autoRaf: true, lerp: 0.12, stopInertiaOnNavigate: true });
    // reduce motion switched on mid-visit: back to native scrolling (the CSS media queries stop matching on their own)
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', e => { if (e.matches && lenis) { lenis.destroy(); lenis = null; } });
  }

  watchHeader();
  reveal();
  heroScroll();
  tilt();
  if (document.querySelector('.hero [data-enter]') && firstLookThisTab()) root.classList.add('intro');
  root.classList.add('motion-ready');

  // header[data-scrolled]: the bottom hairline only shows once the page has moved
  function watchHeader() {
    const header = document.querySelector('header.site');
    if (!header) return;
    const sync = () => header.toggleAttribute('data-scrolled', window.scrollY > 8);
    addEventListener('scroll', sync, { passive: true });
    sync();
  }

  function firstLookThisTab() {
    try {
      if (sessionStorage.getItem('intro')) return false;
      sessionStorage.setItem('intro', '1');
    } catch (e) { /* storage blocked: play it, it is only an animation */ }
    return true;
  }

  // Bidirectional reveal engine. Two observers give hysteresis: one adds .is-in when 12% is visible, the other removes it
  // only once the element is fully outside the viewport grown by 48px. Elements on screen at start get .is-in before
  // html.reveal-on arms the hiding rule, so nothing visible flashes. The chart and the calendar grid are watched as
  // single blocks (never their hundreds of cells).
  function reveal() {
    // The calendar grid is built by activity.js, which runs before this script. Its parent is watched and the grid is
    // clipped: IntersectionObserver counts a target's own clip-path (Chromium), so a clipped target would never enter.
    const grid = document.querySelector('[data-heatmap] .grid');
    if (grid && grid.parentElement) grid.parentElement.classList.add('mo-wipe');
    const SEL = '[data-reveal], .section-head > *';
    const els = [...document.querySelectorAll(`${SEL}, .ladder-plot, .mo-wipe`)];
    if (!els.length) return;
    document.querySelectorAll('[data-reveal-group], .section-head').forEach(g =>
      [...g.children].filter(c => c.matches(SEL)).forEach((el, i) => el.style.setProperty('--index', Math.min(i, 10))));
    const onScreen = el => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.height > 0; };
    els.forEach(el => onScreen(el) && el.classList.add('is-in'));
    root.classList.add('reveal-on');
    if (!('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('is-in')); return; }
    const set = (el, on) => { if (el.classList.contains('is-in') !== on) el.classList.toggle('is-in', on); }; // no-op writes still restyle
    const enter = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && set(e.target, true)), { threshold: 0.12 });
    const exit = new IntersectionObserver(es => es.forEach(e => !e.isIntersecting && set(e.target, false)), { rootMargin: '48px 0px', threshold: 0 });
    els.forEach(el => { enter.observe(el); exit.observe(el); });
  }

  // One rAF-throttled passive scroll listener for the hero. --hero-out (0 to 1) on .hero fades and drifts the canvas as
  // the hero scrolls away. On the card: --par (-1 to 1, card centre against viewport centre) drives a ±8px parallax and
  // --sweep (0 to 1, the card's trip through the viewport) moves the light along its border. Both directions, live.
  function heroScroll() {
    const hero = document.querySelector('.hero'), card = document.querySelector('[data-tilt]');
    const bg = hero && hero.querySelector('.hero-bg');
    if (!bg && !card) return;
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    let raf = 0;
    const last = {};
    const put = (el, prop, v) => { if (last[prop] !== v) { last[prop] = v; el.style.setProperty(prop, v); } };
    if (bg) hero.dataset.scrub = '';
    const update = () => {
      raf = 0;
      if (bg) {
        const r = hero.getBoundingClientRect();
        put(hero, '--hero-out', clamp(-r.top / (r.height || 1), 0, 1).toFixed(3));
      }
      if (card) {
        const r = card.getBoundingClientRect();
        put(card, '--par', clamp((r.top + r.height / 2 - innerHeight / 2) / innerHeight, -1, 1).toFixed(3));
        put(card, '--sweep', clamp((innerHeight - r.top) / (innerHeight + r.height), 0, 1).toFixed(3));
      }
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(update); };
    addEventListener('scroll', kick, { passive: true });
    addEventListener('resize', kick, { passive: true });
    update();
  }

  // The Road to 1800 card leans up to 6 degrees toward a fine pointer and its specular follows; it settles back on leave.
  // Eased with a 0.12 lerp in rAF, idle when still. Touch and coarse pointers keep it flat. The scroll parallax uses the
  // separate `translate` property, so the two never fight over the inline transform.
  function tilt() {
    const card = document.querySelector('[data-tilt]');
    if (!card || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    let x = 0, y = 0, tx = 0, ty = 0, raf = 0;
    const step = () => {
      x += (tx - x) * 0.12; y += (ty - y) * 0.12;
      card.style.transform = `perspective(900px) rotateX(${y.toFixed(2)}deg) rotateY(${x.toFixed(2)}deg)`;
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.01 ? requestAnimationFrame(step) : 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(step); };
    const still = matchMedia('(prefers-reduced-motion: reduce)');
    still.addEventListener('change', () => { if (still.matches) { cancelAnimationFrame(raf); raf = 0; x = y = tx = ty = 0; card.style.transform = ''; card.classList.remove('lit'); } });
    card.addEventListener('pointermove', e => {
      if (still.matches) return;
      const r = card.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      tx = (px - 0.5) * 12; ty = (0.5 - py) * 12;
      card.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`); card.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
      card.classList.add('lit'); kick();
    });
    card.addEventListener('pointerleave', () => { tx = 0; ty = 0; card.classList.remove('lit'); kick(); });
  }
})();
