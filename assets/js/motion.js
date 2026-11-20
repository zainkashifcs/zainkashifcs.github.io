// Motion layer. Lenis smooths wheel scrolling on every page; the header gains its hairline once the page scrolls.
// On the homepage GSAP plays the hero entrance once per tab, reveals the bento tiles and section titles as they scroll
// in, counts the stat numbers up once, fades the hero canvas out as the hero scrolls away, draws the climb chart and
// replays the activity calendar once in view. The Road to 1800 card tilts toward a fine pointer. Nothing here runs under prefers-reduced-motion (the head
// script then never adds .motion), and without JS every element stays visible. style.css holds the hero chunks back
// until .motion-ready is set, with a 2.5 s CSS fallback.
(() => {
  const root = document.documentElement;
  if (!root.classList.contains('motion')) return;
  const ready = () => root.classList.add('motion-ready');

  const gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
  let lenis = null;
  if (window.Lenis) {
    // Touch keeps native scrolling (Lenis default); in-page links keep native jumps so focus moves with them.
    lenis = new window.Lenis({ autoRaf: !gsap, lerp: 0.12, stopInertiaOnNavigate: true });
    if (gsap) { gsap.ticker.add(time => lenis && lenis.raf(time * 1000)); gsap.ticker.lagSmoothing(0); }
    // reduce motion switched on mid-visit: back to native scrolling (GSAP effects revert through matchMedia)
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', e => { if (e.matches && lenis) { lenis.destroy(); lenis = null; } });
  }
  watchHeader();
  if (!gsap) return ready();
  if (ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    if (lenis) lenis.on('scroll', ScrollTrigger.update);
  }

  const EASE = 'expo.out'; // the site's --ease, cubic-bezier(.16, 1, .3, 1), is this curve
  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    if (firstLookThisTab()) playEntrance(gsap);
    if (ScrollTrigger) {
      revealTiles(gsap);
      revealHeads(gsap);
      drawClimb(gsap);
      replayCalendar(gsap);
      const undo = [countUp(gsap), scrubHero(), tilt()];
      const refresh = () => ScrollTrigger.refresh();
      if (document.fonts) document.fonts.ready.then(refresh);
      return () => undo.forEach(fn => fn());
    }
  });
  ready();

  // header[data-scrolled]: the bottom hairline only shows once the page has moved (style: fragments/C.css)
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

  // The lede and the links rise in; the headline is never hidden.
  function playEntrance(g) {
    const chunks = g.utils.toArray('.hero [data-enter]');
    if (!chunks.length) return;
    g.fromTo(chunks, { opacity: 0, y: 16 }, {
      opacity: 1, y: 0, duration: 0.6, ease: EASE, stagger: 0.09,
      onComplete: () => g.set(chunks, { clearProps: 'opacity,transform' }),
    });
  }

  // Tiles that start below the fold fade up as they arrive. Opacity only, so the content stays in the accessibility
  // tree and in find-in-page. Anything already visible at load is left alone, so nothing above the fold flashes.
  // 12px rise over 480ms, once, when 12% of the element is in view; 50ms between siblings. Transform and opacity only.
  function revealTiles(g) {
    const below = g.utils.toArray('[data-reveal]').filter(el => el.getBoundingClientRect().top > innerHeight * 0.95);
    if (!below.length) return;
    g.set(below, { opacity: 0, y: 12 });
    ScrollTrigger.batch(below, {
      start: 'top 88%', once: true, interval: 0.1,
      onEnter: els => g.to(els, { opacity: 1, y: 0, duration: 0.48, ease: EASE, stagger: 0.05, overwrite: true, clearProps: 'opacity,transform' }),
    });
  }

  // Section titles and their lines rise in one after another as they arrive (same rule as the tiles: opacity and a short
  // rise, only for what starts below the fold). Chips are left alone: they are filter controls, not decoration.
  function revealHeads(g) {
    const below = g.utils.toArray('.section-head > *').filter(el => el.getBoundingClientRect().top > innerHeight * 0.95);
    if (!below.length) return;
    g.set(below, { opacity: 0, y: 12 });
    ScrollTrigger.batch(below, {
      start: 'top 88%', once: true, interval: 0.1,
      onEnter: els => g.to(els, { opacity: 1, y: 0, duration: 0.48, ease: EASE, stagger: 0.05, overwrite: true, clearProps: 'opacity,transform' }),
    });
  }

  // The stat numbers count up from 0 the first time their tile arrives. The real number is in the HTML and is put back
  // when the count ends (or if the effect is torn down); only the leading digits change, tabular numerals keep the width
  // steady. The goal tile is a target, not a count, so it stays as written.
  function countUp(g) {
    const saved = [];
    g.utils.toArray('.stat:not(.stat-goal) dd, .tile-quiz .big').forEach(el => {
      const node = [...el.childNodes].find(n => n.nodeType === 3 && /\d/.test(n.nodeValue));
      const m = node && /^(\s*)(\d+)/.exec(node.nodeValue);
      if (!m) return;
      const full = node.nodeValue, to = +m[2], rest = full.slice(m[0].length), o = { v: 0 };
      const tail = n => (n === 1 && rest === ' days' ? ' day' : rest); // "1 day", not "1 days", on the way up
      saved.push([node, full]);
      ScrollTrigger.create({
        trigger: el.closest('.tile') || el, start: 'top 90%', once: true,
        onEnter: () => {
          node.nodeValue = m[1] + '0' + tail(0);
          g.to(o, {
            v: to, duration: to > 20 ? 1.3 : 0.9, delay: 0.12, ease: 'power3.out',
            onUpdate: () => { const n = Math.round(o.v); node.nodeValue = m[1] + n + tail(n); },
            onComplete: () => { node.nodeValue = full; },
          });
        },
      });
    });
    return () => saved.forEach(([node, full]) => { node.nodeValue = full; });
  }

  // As the hero scrolls away its canvas drifts down a little slower than the text and fades out. --hero-out (0 to 1)
  // is read by fragments/A.css; the canvas moves with transform and opacity only.
  function scrubHero() {
    const hero = document.querySelector('.hero');
    if (!hero || !hero.querySelector('.hero-bg')) return () => {};
    const st = ScrollTrigger.create({
      trigger: hero, start: 'top top', end: 'bottom top',
      onUpdate: self => { hero.dataset.scrub = ''; hero.style.setProperty('--hero-out', self.progress.toFixed(3)); },
    });
    return () => { st.kill(); hero.removeAttribute('data-scrub'); hero.style.removeProperty('--hero-out'); };
  }

  // The climb chart: marks scale in, the "hardest solved" line and its wash wipe across, the goal rule draws. Once, when it arrives.
  function drawClimb(g) {
    const chart = document.querySelector('.ladder-plot');
    if (!chart) return;
    const points = g.utils.toArray('.pt', chart), best = chart.querySelector('.best'), goal = chart.querySelector('.goal');
    const tl = g.timeline({
      defaults: { ease: EASE },
      scrollTrigger: { trigger: chart, start: 'top 85%', once: true },
      // clear only what was animated: the marks keep their inline left/top
      onComplete: () => { g.set([...points, goal], { clearProps: 'opacity,transform' }); g.set(best, { clearProps: 'clipPath' }); },
    });
    if (points.length) tl.from(points, { scale: 0, opacity: 0, duration: 0.4, stagger: { amount: 0.6 } }, 0);
    if (best) tl.fromTo(best, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'power1.inOut' }, 0.1);
    if (goal) tl.from(goal, { scaleX: 0, transformOrigin: '0% 50%', duration: 0.6 }, 0.3);
  }

  // The Road to 1800 card leans up to 6 degrees toward a fine pointer and its specular follows; it settles back on leave.
  // Eased with a 0.12 lerp in rAF, idle when still. Touch, coarse pointers and reduced motion keep it flat.
  function tilt() {
    const card = document.querySelector('[data-tilt]');
    if (!card || !matchMedia('(hover: hover) and (pointer: fine)').matches) return () => {};
    let x = 0, y = 0, tx = 0, ty = 0, raf = 0;
    const step = () => {
      x += (tx - x) * 0.12; y += (ty - y) * 0.12;
      card.style.transform = `perspective(900px) rotateX(${y.toFixed(2)}deg) rotateY(${x.toFixed(2)}deg)`;
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.01 ? requestAnimationFrame(step) : 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(step); };
    const move = e => {
      const r = card.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      tx = (px - 0.5) * 12; ty = (0.5 - py) * 12;
      card.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`); card.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
      card.classList.add('lit'); kick();
    };
    const leave = () => { tx = 0; ty = 0; card.classList.remove('lit'); kick(); };
    card.addEventListener('pointermove', move); card.addEventListener('pointerleave', leave);
    return () => {
      card.removeEventListener('pointermove', move); card.removeEventListener('pointerleave', leave);
      cancelAnimationFrame(raf); card.classList.remove('lit'); card.style.transform = '';
    };
  }

  function replayCalendar(g) {
    const grid = document.querySelector('[data-heatmap] .grid'); // built by activity.js, which runs before this script
    if (!grid) return;
    g.from(grid.querySelectorAll('.d:not(.future)'), {
      opacity: 0, scale: 0.5, duration: 0.35, ease: 'power2.out',
      stagger: { amount: 0.7, grid: 'auto', axis: 'x', from: 'start' },
      clearProps: 'opacity,transform',
      scrollTrigger: { trigger: grid, start: 'top 85%', once: true },
    });
  }
})();
