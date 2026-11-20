// Shared motion layer, loaded on every page after motion.js. Three pieces:
// 1. Spring: a semi-implicit Euler spring (stiffness, damping, mass) that retargets mid-flight, so rapid clicks never
//    snap or queue. window.MotionSpring is exported for the other scripts.
// 2. Glide pills: one glass pill per segmented group that slides from the previously active option to the new one
//    (groups are found by selector; the active option is the one with aria-pressed="true"). The header nav gets a
//    hover pill that follows the pointer and settles back on the current page.
// 3. Rubber banding: horizontal scrollers stretch a little past their edges on wheel/touch and spring back.
// Under prefers-reduced-motion everything jumps straight to its end state.
(() => {
  const still = matchMedia('(prefers-reduced-motion: reduce)');

  // ---------- 1. spring ----------
  class Spring {
    constructor({ stiffness = 380, damping = 32, mass = 1, value = 0, onUpdate = () => {}, precision = 0.01 } = {}) {
      Object.assign(this, { stiffness, damping, mass, value, target: value, velocity: 0, onUpdate, precision, raf: 0 });
    }
    set(v) { this.value = this.target = v; this.velocity = 0; this.stop(); this.onUpdate(v); }
    to(target) {
      this.target = target;
      if (still.matches) return this.set(target);
      if (!this.raf) { this.last = 0; this.raf = requestAnimationFrame(t => this.step(t)); }
    }
    step(now) {
      const dt = this.last ? Math.min((now - this.last) / 1000, 1 / 30) : 1 / 60;
      this.last = now;
      const force = -this.stiffness * (this.value - this.target) - this.damping * this.velocity;
      this.velocity += (force / this.mass) * dt;   // semi-implicit Euler: velocity first, then position
      this.value += this.velocity * dt;
      const done = Math.abs(this.velocity) < this.precision && Math.abs(this.value - this.target) < this.precision;
      if (done) { this.value = this.target; this.velocity = 0; this.raf = 0; }
      else this.raf = requestAnimationFrame(t => this.step(t));
      this.onUpdate(this.value);
    }
    stop() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; }
  }
  window.MotionSpring = Spring;

  // ---------- 2. glide pills ----------
  const GROUPS = ['.idx-tabs', '.idx-bands', '.cst-bar .chips', '.viz-speed', '.pace-pills', '.rd-seg'];
  function glide(group) {
    if (group.dataset.glide) return;
    group.dataset.glide = '1';   // a non-empty flag: '' is falsy and would re-glide the group on every scan
    group.classList.add('has-glide');
    const pill = document.createElement('span');
    pill.className = 'glide-pill';
    pill.setAttribute('aria-hidden', 'true');
    group.prepend(pill);
    const box = { x: 0, y: 0, w: 0, h: 0 };
    const paint = () => { pill.style.transform = `translate(${box.x}px, ${box.y}px)`; pill.style.width = `${box.w}px`; pill.style.height = `${box.h}px`; };
    const springs = ['x', 'y', 'w', 'h'].map(k => new Spring({ stiffness: 420, damping: 36, onUpdate: v => { box[k] = v; paint(); } }));
    let shown = false;
    function place(jump) {
      const on = group.querySelector('[aria-pressed="true"]:not([hidden])');
      // hidden, not transparent: nothing invisible keeps a box. Only write when it changes: the observer above
      // watches `hidden`, and even a same-value write queues a mutation (an endless loop otherwise).
      if (!on) { if (!pill.hidden) pill.hidden = true; shown = false; return; }
      const target = [on.offsetLeft, on.offsetTop, on.offsetWidth, on.offsetHeight];
      if (jump || !shown) springs.forEach((s, i) => s.set(target[i]));
      else springs.forEach((s, i) => s.to(target[i]));
      pill.style.borderRadius = getComputedStyle(on).borderRadius;
      if (pill.hidden) pill.hidden = false;
      shown = true;
    }
    new MutationObserver(() => place(false)).observe(group, { subtree: true, attributes: true, attributeFilter: ['aria-pressed', 'hidden'] });
    new ResizeObserver(() => place(true)).observe(group);
    place(true);
  }
  const scan = () => GROUPS.forEach(sel => document.querySelectorAll(sel).forEach(glide));
  scan();
  // groups that scripts reveal later (rails and toolbars are hidden until their script runs)
  new MutationObserver(scan).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['hidden'] });

  // header nav: a pill under the hovered link that settles back on the current page
  const nav = document.querySelector('header.site nav');
  if (nav && matchMedia('(hover: hover)').matches) {
    const pill = document.createElement('span');
    pill.className = 'nav-pill';
    pill.setAttribute('aria-hidden', 'true');
    nav.prepend(pill);
    const box = { x: 0, w: 0 };
    const paint = () => { pill.style.transform = `translateX(${box.x}px)`; pill.style.width = `${box.w}px`; };
    const sx = new Spring({ stiffness: 460, damping: 38, onUpdate: v => { box.x = v; paint(); } });
    const sw = new Spring({ stiffness: 460, damping: 38, onUpdate: v => { box.w = v; paint(); } });
    const current = () => nav.querySelector('a[aria-current="page"]');
    const goTo = (a, jump) => {
      if (!a) { if (!pill.hidden) pill.hidden = true; return; }
      if (pill.hidden) pill.hidden = false;
      if (jump) { sx.set(a.offsetLeft); sw.set(a.offsetWidth); } else { sx.to(a.offsetLeft); sw.to(a.offsetWidth); }
    };
    goTo(current(), true);
    nav.addEventListener('pointerover', e => { const a = e.target.closest('a'); if (a) goTo(a, false); });
    nav.addEventListener('pointerleave', () => goTo(current(), false));
    nav.addEventListener('focusin', e => { const a = e.target.closest('a'); if (a) goTo(a, false); });
    nav.addEventListener('focusout', () => goTo(current(), false));
    new ResizeObserver(() => goTo(current(), true)).observe(nav);
  }

  // ---------- 3. rubber banding ----------
  const SCROLLERS = ['.heat-scroll', 'header.site nav', '.idx-tabs'];
  function rubber(el) {
    if (el.dataset.rubber) return;
    el.dataset.rubber = '1';
    const s = new Spring({ stiffness: 300, damping: 26, onUpdate: v => el.style.setProperty('--rb', `${v.toFixed(2)}px`) });
    let idle = 0, pull = 0, tx = null;
    const atStart = () => el.scrollLeft <= 0, atEnd = () => el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
    const stretch = d => {   // d > 0 pulls past the end, d < 0 past the start; resistance grows with the pull
      if (el.scrollWidth <= el.clientWidth || still.matches) return;
      if ((d < 0 && !atStart()) || (d > 0 && !atEnd())) return;
      pull = Math.max(-28, Math.min(28, pull - d * 0.25 * (1 - Math.abs(pull) / 32)));
      s.set(pull);
      clearTimeout(idle);
      idle = setTimeout(() => { pull = 0; s.to(0); }, 90);
    };
    el.addEventListener('wheel', e => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) stretch(e.deltaX); }, { passive: true });
    el.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
    el.addEventListener('touchmove', e => { if (tx == null) return; const x = e.touches[0].clientX; stretch(tx - x); tx = x; }, { passive: true });
    el.addEventListener('touchend', () => { tx = null; pull = 0; s.to(0); }, { passive: true });
  }
  SCROLLERS.forEach(sel => document.querySelectorAll(sel).forEach(rubber));
})();
