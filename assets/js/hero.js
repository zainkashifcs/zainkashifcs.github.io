// Homepage hero field: one Canvas 2D layer behind the introduction. No libraries.
// Three variations of one language (graph, surface, direction field). The variation is chosen once per visit in the
// page head (data-hero), so theme switches and page changes never re-roll it.
// Pauses off-screen and in background tabs;
// with reduced motion it draws one still frame. Colours come from CSS tokens, so both themes follow.
(() => {
  const cv = document.querySelector('.hero-bg');
  if (!cv || !cv.getContext) return;
  const ctx = cv.getContext('2d');
  const root = document.documentElement, host = cv.parentElement;
  const mode = root.dataset.hero || 'network';
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  let W = 0, H = 0, dpr = 1, col = {}, scene, raf = 0, visible = true, last = 0, clock = 0;
  const stats = window.__hero = { mode, frames: 0, ms: 0, builds: 0 };

  const readColours = () => {
    const s = getComputedStyle(root), v = n => s.getPropertyValue(n).trim();
    col = { line: v('--hero-line'), dot: v('--hero-dot'), hi: v('--hero-hi'), a: parseFloat(v('--hero-alpha')) || .6 };
  };
  const rgba = (c, a) => `rgb(${c} / ${a})`;

  // pointer: eased towards the cursor; strength fades in and out. Touch and pen never steer the field.
  const P = { x: 0, y: 0, tx: 0, ty: 0, k: 0, tk: 0 };
  host.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const r = cv.getBoundingClientRect(); P.tx = e.clientX - r.left; P.ty = e.clientY - r.top; P.tk = 1;
  });
  host.addEventListener('pointerleave', () => { P.tk = 0; });
  const stepPointer = (dt, t) => {
    if (!fine.matches) { P.tx = W * (.68 + .18 * Math.sin(t * .11)); P.ty = H * (.42 + .22 * Math.sin(t * .07 + 1)); P.tk = .55; } // no cursor: a slow drift
    const e = 1 - Math.exp(-dt * 4);
    P.x += (P.tx - P.x) * e; P.y += (P.ty - P.y) * e; P.k += (P.tk - P.k) * (1 - Math.exp(-dt * 2.5));
  };
  const flow = (x, y, t) => Math.sin(x * .0042 + t * .21) + Math.sin(y * .0057 - t * .16) + Math.sin((x - y) * .0031 + t * .11);

  /* 1. Graph: drifting nodes joined by nearby edges; every few seconds a breadth-first search spreads from one node. */
  const network = () => {
    const n = Math.round(Math.min(110, Math.max(16, W * H / 8500))), reach = W < 700 ? 96 : 132;
    const nodes = Array.from({ length: n }, (_, i) => ({ x: Math.random() * W, y: Math.random() * H, s: 5 + Math.random() * 6, p: i * 1.7 }));
    let tree = null, born = -99;
    const bfs = t => {
      const startPool = nodes.filter(a => a.x > W * (narrow.matches ? .55 : .72)); const s0 = (startPool.length ? startPool : nodes)[Math.floor(Math.random() * (startPool.length || n))];
      const depth = new Map([[s0, 0]]), parent = new Map(), q = [s0];
      while (q.length) { const a = q.shift(), d = depth.get(a); if (d >= 7) continue;
        for (const b of nodes) if (!depth.has(b) && b.x > W * (narrow.matches ? .5 : .66) && Math.hypot(a.x - b.x, a.y - b.y) < reach) /* the search stays clear of the text column */ { depth.set(b, d + 1); parent.set(b, a); q.push(b); } }
      tree = { depth, parent }; born = t;
    };
    return t => {
      for (const a of nodes) {
        const ang = flow(a.x, a.y, t * .6 + a.p) * 1.6;
        a.x += Math.cos(ang) * a.s * DT; a.y += Math.sin(ang) * a.s * DT;
        if (P.k > .01) { const dx = P.x - a.x, dy = P.y - a.y, d = Math.hypot(dx, dy); if (d < 160 && d > 1) { const f = P.k * (1 - d / 160) * 10 * DT; a.x += dx / d * f; a.y += dy / d * f; } }
        if (a.x < -20) a.x += W + 40; if (a.x > W + 20) a.x -= W + 40; if (a.y < -20) a.y += H + 40; if (a.y > H + 20) a.y -= H + 40;
      }
      ctx.lineWidth = 1;
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        const a = nodes[i], b = nodes[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < reach) { ctx.strokeStyle = rgba(col.line, col.a * .62 * (1 - d / reach) ** 1.4); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      }
      if (t - born > 9) bfs(t);
      const age = t - born;
      ctx.lineWidth = 1.5;
      for (const [b, a] of tree.parent) {
        const k = tree.depth.get(b), glow = Math.max(0, 1 - Math.abs(age - .6 - k * .55) / 1.4);
        if (glow > 0 && Math.hypot(a.x - b.x, a.y - b.y) < reach * 1.25) { /* skip edges broken by wrap-around */ ctx.strokeStyle = rgba(col.hi, col.a * glow); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      }
      for (const a of nodes) {
        const k = tree.depth.get(a), lit = k === undefined ? 0 : Math.max(0, 1 - Math.abs(age - .6 - k * .55) / 1.4);
        ctx.fillStyle = rgba(lit ? col.hi : col.dot, col.a * (.55 + .45 * lit)); ctx.beginPath(); ctx.arc(a.x, a.y, 1.6 + lit * 1.2, 0, 6.2832); ctx.fill();
      }
    };
  };

  /* 2. Surface: a slowly evolving function plotted as contour-like profiles, receding towards the top. */
  const mesh = () => {
    const rows = W < 700 ? 18 : 26, step = W < 700 ? 10 : 12;
    return t => {
      ctx.lineWidth = 1;
      for (let i = 0; i < rows; i++) {
        const v = i / (rows - 1), base = H * (.08 + .9 * v ** 1.15), amp = 8 + 34 * v;
        ctx.strokeStyle = rgba(i === Math.round(rows * .62) ? col.hi : col.line, col.a * (.3 + .6 * v));
        ctx.beginPath();
        for (let x = -step; x <= W + step; x += step) {
          let y = base + amp * (Math.sin(x * .0062 + t * .24 + i * .33) * .62 + Math.sin(x * .0115 - t * .17 + i * .21) * .38);
          if (P.k > .01) { const dx = x - P.x, dy = base - P.y; y -= P.k * 26 * v * Math.exp(-(dx * dx + dy * dy) / 26000); }
          x === -step ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    };
  };

  /* 3. Direction field: short strokes along a flowing vector field (a slope-field plot); the cursor bends it into a gentle vortex. */
  const field = () => {
    const gap = W < 700 ? 30 : 26, len = W < 700 ? 8 : 9;
    return t => {
      ctx.lineCap = 'round';
      const buckets = [[], [], []];
      for (let y = gap / 2; y < H; y += gap) for (let x = gap / 2; x < W; x += gap) {
        let a = flow(x, y, t) * 1.1, w = 0;
        if (P.k > .01) { const dx = x - P.x, dy = y - P.y; w = P.k * Math.exp(-(dx * dx + dy * dy) / 28000); a += (Math.atan2(dy, dx) + 1.5708 - a) * w; }
        buckets[w > .5 ? 2 : w > .15 ? 1 : 0].push(x, y, a, len * (1 + .5 * w));
      }
      [[col.line, .42, 1], [col.hi, .65, 1], [col.hi, .95, 1.5]].forEach(([c, al, lw], b) => {
        const L = buckets[b]; if (!L.length) return;
        ctx.strokeStyle = rgba(c, col.a * al); ctx.lineWidth = lw; ctx.beginPath();
        for (let i = 0; i < L.length; i += 4) { const x = L[i], y = L[i + 1], c2 = Math.cos(L[i + 2]) * L[i + 3], s2 = Math.sin(L[i + 2]) * L[i + 3]; ctx.moveTo(x - c2, y - s2); ctx.lineTo(x + c2, y + s2); }
        ctx.stroke();
      });
    };
  };

  let DT = 1 / 60;
  // The canvas only covers the visible part of the hero (CSS height), so no pixels are drawn just to be faded away.
  // The fade (strongest on the right on wide screens; a band behind the headline on phones) is baked into the canvas
  // once per resize and applied with one destination-in draw per frame. A CSS mask over a canvas that changes every
  // frame cost WebKit about a third of its frame rate; this keeps the browser compositing a plain layer.
  const narrow = matchMedia('(max-width: 44rem)');
  let fade = null;
  const buildFade = () => {
    fade = document.createElement('canvas'); fade.width = cv.width; fade.height = cv.height;
    const m = fade.getContext('2d'); m.setTransform(dpr, 0, 0, dpr, 0, 0);
    const ramp = (g, stops) => { stops.forEach(([at, a]) => g.addColorStop(at, `rgb(0 0 0 / ${a})`)); return g; };
    if (narrow.matches) { m.fillStyle = ramp(m.createLinearGradient(0, 0, 0, H), [[0, .62], [.61, .5], [1, 0]]); m.fillRect(0, 0, W, H); return; }
    m.fillStyle = ramp(m.createLinearGradient(0, 0, W, 0), [[0, .1], [.46, .18], [.8, 1]]); m.fillRect(0, 0, W, H);
    m.globalCompositeOperation = 'destination-in';
    m.fillStyle = ramp(m.createLinearGradient(0, 0, 0, H), [[0, 1], [.62, 1], [1, 0]]); m.fillRect(0, 0, W, H);
  };
  const build = () => { scene = ({ network, mesh, field }[mode] || network)(); stats.builds++; };
  const resize = () => {
    const r = cv.getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio || 1);
    W = Math.round(r.width); H = Math.round(r.height); cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!P.x) { P.x = P.tx = W * .7; P.y = P.ty = H * .4; }
    buildFade(); build(); if (still.matches) paintStill();
  };
  const applyFade = () => { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'destination-in'; ctx.drawImage(fade, 0, 0); ctx.restore(); };
  const paint = t => { ctx.clearRect(0, 0, W, H); const s = performance.now(); scene(t); applyFade(); stats.ms = stats.ms * .95 + (performance.now() - s) * .05; stats.frames++; };
  const paintStill = () => { DT = 0; P.k = 0; P.tk = 0; paint(12); }; // a settled frame, no pointer response
  const frame = now => {
    raf = 0; if (!visible || document.hidden || still.matches) return;
    DT = Math.min(.05, last ? (now - last) / 1000 : 1 / 60); last = now; clock += DT;
    stepPointer(DT, clock); paint(clock); raf = requestAnimationFrame(frame);
  };
  const run = () => { if (!raf && visible && !document.hidden && !still.matches) { last = 0; raf = requestAnimationFrame(frame); } };

  readColours(); resize();
  if (!still.matches) { stepPointer(0, 0); paint(0); } // first frame exists before the canvas fades in: no empty flash
  new ResizeObserver(() => resize()).observe(cv);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; run(); }).observe(cv);
  document.addEventListener('visibilitychange', run);
  still.addEventListener('change', () => (still.matches ? paintStill() : run()));
  const recolour = () => { readColours(); if (still.matches) paintStill(); };
  new MutationObserver(recolour).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', recolour);
  requestAnimationFrame(() => cv.classList.add('ready'));
  run();
})();
