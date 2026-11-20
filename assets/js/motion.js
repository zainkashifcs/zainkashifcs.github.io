// Motion layer, no animation library. Lenis smooths wheel scrolling; the header gains its hairline once the page scrolls.
// Reveals: [data-reveal] and section titles fade up each time they enter the viewport, scrolling down or up, and reset
// only after they have left it completely (plus 48px), so nothing flickers at the edge. The climb chart line and
// the activity calendar wipe in on every entry. The homepage hero rises in once per tab (CSS, html.intro), its
// animals canvas fades and drifts as it scrolls away. All styling is in style.css (motion section). Nothing here runs under
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
    // remember which edge an element left by, so it glides back in from that side (from above when scrolling back up)
    const exit = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) return;
      e.target.dataset.from = e.boundingClientRect.top < 0 ? 'above' : 'below';
      set(e.target, false);
    }), { rootMargin: '48px 0px', threshold: 0 });
    els.forEach(el => { enter.observe(el); exit.observe(el); });
  }

  // One rAF-throttled passive scroll listener for the hero: --hero-out (0 to 1) on .hero fades and drifts the canvas as
  // the hero scrolls away, in both directions. Styles are written only when the value changes.
  function heroScroll() {
    const hero = document.querySelector('.hero');
    if (!hero || !hero.querySelector('.hero-bg')) return;
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    let raf = 0, last = '';
    hero.dataset.scrub = '';
    const update = () => {
      raf = 0;
      const r = hero.getBoundingClientRect();
      const v = clamp(-r.top / (r.height || 1), 0, 1).toFixed(3);
      if (v !== last) { last = v; hero.style.setProperty('--hero-out', v); }
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(update); };
    addEventListener('scroll', kick, { passive: true });
    addEventListener('resize', kick, { passive: true });
    update();
  }
})();
