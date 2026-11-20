// Topic constellation (_includes/constellation.html): topic hubs and problem nodes from the build-time JSON, laid out
// by a small force simulation (node repulsion, spring edges, gentle centre gravity, damping and a cooling factor that
// reheats on interaction). Drag and throw nodes; hover (or tap) to spotlight a node and its neighbours; click a problem
// to open it, click a topic to pin its cluster. Rating filters, labels on/off, re-center and explode.
// Colours come from the CSS tokens and are re-read when the theme changes. The loop runs only while the graph is on
// screen and the tab is visible; under prefers-reduced-motion it settles off-screen and draws one still frame.
(() => {
  const root = document.querySelector('[data-constellation]');
  const canvas = root && root.querySelector('.cst-canvas');
  const ctx = canvas && canvas.getContext('2d');
  const json = root && root.querySelector('[data-cst-data]');
  if (!ctx || !json) return;
  let data;
  try { data = JSON.parse(json.textContent); } catch (err) { return; }
  const tip = root.querySelector('.cst-tip'), bar = root.querySelector('.cst-bar');
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = matchMedia('(pointer: coarse)');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  // ---- graph ----
  const hubs = new Map(), nodes = [], edges = [];
  for (const t of data.topics) {
    const hub = { type: 'hub', id: t.id, label: t.label, count: 0, solved: 0, x: 0, y: 0, vx: 0, vy: 0, r: 10, links: [] };
    hubs.set(t.id, hub); nodes.push(hub);
  }
  for (const p of data.problems) {
    const node = { type: 'problem', ...p, x: 0, y: 0, vx: 0, vy: 0, r: 4 + clamp(((p.rating || 800) - 800) / 500, 0, 1) * 5, links: [] };
    nodes.push(node);
    for (const t of p.topics) {
      const hub = hubs.get(t);
      if (!hub) continue;
      hub.count++; if (p.kind === 'solved') hub.solved++;
      edges.push({ a: hub, b: node });
      hub.links.push(node); node.links.push(hub);
    }
  }
  for (const h of hubs.values()) h.r = 9 + Math.sqrt(h.solved) * 3.2;

  // ---- view state ----
  const R = { w: 0, h: 0, dpr: 1 };
  let alpha = 1, raf = 0, onScreen = true, frames = 0, labels = true, tier = null;
  let hover = null, pinned = null, drag = null, colours = {};
  const visible = n => n.type === 'hub' || !tier || (n.rating >= tier[0] && n.rating <= tier[1]);

  function readColours() {
    const cs = getComputedStyle(root);
    const v = name => cs.getPropertyValue(name).trim();
    colours = { text: v('--text'), text2: v('--text-2'), text3: v('--text-3'), hair: v('--hair-2'), field: v('--field'), amber: v('--accent-display'), bg: v('--tile-2') };
  }

  function seed() {   // hubs on a ring, each problem near its first hub
    const list = [...hubs.values()], cx = R.w / 2, cy = R.h / 2, rad = Math.min(R.w, R.h) * 0.3;
    list.forEach((h, i) => { const a = (i / list.length) * Math.PI * 2; h.x = cx + Math.cos(a) * rad; h.y = cy + Math.sin(a) * rad; });
    for (const n of nodes) if (n.type === 'problem') {
      const h = n.links[0] || { x: cx, y: cy };
      n.x = h.x + (Math.random() - 0.5) * 60; n.y = h.y + (Math.random() - 0.5) * 60;
    }
  }

  // ---- physics ----
  function tick() {
    const cx = R.w / 2, cy = R.h / 2, k = alpha, span = Math.min(R.w, R.h);
    const rep = 900 * (span / 600), springLen = span < 500 ? 44 : 62;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        let dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
        if (d2 < 1) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d2 = 1; }
        const f = (rep * (a.type === 'hub' && b.type === 'hub' ? 2.2 : 1)) / d2 * k;
        const d = Math.sqrt(d2), fx = dx / d * f, fy = dy / d * f;
        a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
      }
    }
    for (const e of edges) {
      const dx = e.b.x - e.a.x, dy = e.b.y - e.a.y, d = Math.hypot(dx, dy) || 1;
      const f = (d - (springLen + e.a.r)) * 0.02 * k, fx = dx / d * f, fy = dy / d * f;
      e.a.vx += fx * 0.4; e.a.vy += fy * 0.4; e.b.vx -= fx; e.b.vy -= fy;
    }
    for (const n of nodes) {
      n.vx += (cx - n.x) * 0.004 * k; n.vy += (cy - n.y) * 0.004 * k;
      if (n === drag?.node) { n.vx = n.vy = 0; continue; }
      n.vx *= 0.82; n.vy *= 0.82;
      n.x = clamp(n.x + n.vx, n.r + 4, R.w - n.r - 4); n.y = clamp(n.y + n.vy, n.r + 4, R.h - n.r - 4);
    }
    alpha = Math.max(0.025, alpha * 0.992);
  }

  // ---- drawing ----
  function focusSet() {
    const f = pinned || hover;
    if (!f) return null;
    return new Set([f, ...f.links]);
  }
  function draw(now = 0) {
    const { text, text2, text3, hair, field, amber } = colours;
    ctx.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
    ctx.clearRect(0, 0, R.w, R.h);
    const lit = focusSet();
    const dim = n => (lit && !lit.has(n) ? 0.15 : 1) * (visible(n) ? 1 : 0.15);
    for (const e of edges) {
      if (!visible(e.b)) continue;
      const on = lit && lit.has(e.a) && lit.has(e.b);
      ctx.globalAlpha = lit && !on ? 0.15 : on ? 1 : 0.55;
      ctx.strokeStyle = field; ctx.lineWidth = on ? 1.5 : 1;
      ctx.beginPath(); ctx.moveTo(e.a.x, e.a.y); ctx.lineTo(e.b.x, e.b.y); ctx.stroke();
    }
    const pulse = still.matches ? 0 : (Math.sin(now / 420) + 1) / 2;
    for (const n of nodes) {
      ctx.globalAlpha = dim(n);
      if (n.type === 'hub') {
        const g = ctx.createRadialGradient(n.x, n.y, n.r * 0.4, n.x, n.y, n.r * 2.4);   // a soft halo behind the core
        g.addColorStop(0, text2); g.addColorStop(1, 'transparent');
        ctx.globalAlpha = dim(n) * 0.22; ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r * 2.4, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = dim(n); ctx.fillStyle = text2;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = text; ctx.lineWidth = 1.5; ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.setLineDash(n.kind === 'redo' ? [2.5, 2] : []);
        if (n.kind === 'solved') { ctx.fillStyle = text; ctx.fill(); }
        else if (n.kind === 'open') {
          ctx.strokeStyle = amber; ctx.lineWidth = 2; ctx.stroke();
          ctx.globalAlpha = dim(n) * (0.25 + 0.5 * (1 - pulse));
          ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 3 + pulse * 6, 0, Math.PI * 2); ctx.stroke();
        } else { ctx.fillStyle = colours.bg; ctx.fill(); ctx.strokeStyle = text; ctx.lineWidth = 1.5; ctx.stroke(); }
        ctx.setLineDash([]);
      }
    }
    if (labels) {
      ctx.textBaseline = 'middle';
      for (const n of nodes) {
        const a = dim(n);
        if (a < 0.5 && !(lit && lit.has(n))) continue;
        ctx.globalAlpha = a;
        const hub = n.type === 'hub';
        if (!hub && lit && !lit.has(n)) continue;
        ctx.font = hub ? '600 12px Geist, system-ui, sans-serif' : '500 10px "Geist Mono", ui-monospace, monospace';
        ctx.fillStyle = hub ? text : text3;
        const t = hub ? n.label : n.id, gap = n.r + (hub ? 6 : 4), right = n.x + gap + ctx.measureText(t).width > R.w - 4;
        ctx.textAlign = right ? 'right' : 'left';   // flip to the left of the node near the right edge
        ctx.fillText(t, right ? n.x - gap : n.x + gap, n.y);
      }
    }
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
    frames++;
  }

  // ---- loop ----
  const running = () => onScreen && !document.hidden && !still.matches;
  const hasOpen = nodes.some(n => n.kind === 'open');
  let odd = false;
  function frame(now) {
    raf = 0;
    if (!running()) return;
    const settled = alpha <= 0.026 && !drag;
    if (!settled) { tick(); draw(now); }
    else if (!hasOpen) { draw(now); return; }   // nothing moves or pulses: stop until the next interaction
    else if ((odd = !odd)) draw(now);   // settled: redraw only the pulse, at half rate
    raf = requestAnimationFrame(frame);
  }
  const redraw = () => { if (!raf) draw(); };
  const start = () => { if (!raf && running()) raf = requestAnimationFrame(frame); };
  const stopLoop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
  function settleStill() {   // reduced motion: run the simulation to rest without animating, then draw once
    alpha = 1;
    for (let i = 0; i < 400; i++) tick();
    draw();
  }
  const refresh = () => { if (running()) { alpha = Math.max(alpha, 0.03); start(); } else draw(); };

  // ---- size ----
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return false;
    const first = !R.w;
    const sx = R.w ? w / R.w : 1, sy = R.h ? h / R.h : 1;
    R.w = w; R.h = h; R.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * R.dpr); canvas.height = Math.round(h * R.dpr);
    if (first) seed(); else for (const n of nodes) { n.x *= sx; n.y *= sy; }
    alpha = Math.max(alpha, 0.4);
    if (still.matches) settleStill(); else refresh();
    return true;
  }

  // ---- tooltip ----
  const fmt = d => (d ? new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }) : '');
  let tipFor = null, tipLink = false;
  function placeTip(n) {
    const w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = `${clamp(n.x + 14, 6, R.w - w - 6)}px`;
    tip.style.top = `${n.y - h - 12 < 6 ? n.y + 14 : n.y - h - 12}px`;
  }
  function showTip(n, withLink) {
    if (!n) { tip.hidden = true; tipFor = null; return; }
    if (n === tipFor && !!withLink === tipLink && !tip.hidden) { placeTip(n); return; }
    tipFor = n; tipLink = !!withLink;
    tip.replaceChildren();
    const b = document.createElement('b'), meta = document.createElement('span');
    if (n.type === 'hub') {
      b.textContent = n.label;
      meta.textContent = `${n.count} problem${n.count === 1 ? '' : 's'} · ${n.solved} solved myself`;
    } else {
      b.textContent = `${n.id} · ${n.name}`;
      meta.textContent = [n.rating, n.label, n.kind === 'solved' || n.kind === 'help' ? fmt(n.date) : `last tried ${fmt(n.date)}`].filter(Boolean).join(' · ');
    }
    tip.append(b, meta);
    if (withLink && n.type === 'problem') {
      const a = document.createElement('a'); a.href = n.url; a.textContent = 'Open the problem page';
      tip.append(a);
    }
    tip.hidden = false;
    placeTip(n);
  }

  // ---- pointer ----
  const pick = (x, y) => {
    let best = null, bd = Infinity;
    for (const n of nodes) {
      if (!visible(n)) continue;
      const d = Math.hypot(n.x - x, n.y - y);
      if (d < n.r + (coarse.matches ? 12 : 6) && d < bd) { bd = d; best = n; }
    }
    return best;
  };
  const local = e => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  canvas.addEventListener('pointermove', e => {
    const [x, y] = local(e);
    if (drag) {
      if (Math.hypot(x - drag.x0, y - drag.y0) > 4) drag.moved = true;
      drag.vx = x - drag.node.x; drag.vy = y - drag.node.y; drag.t = performance.now();
      drag.node.x = x; drag.node.y = y;
      alpha = Math.max(alpha, 0.3);
      showTip(drag.node);
      if (running()) start(); else draw();
      return;
    }
    if (e.pointerType === 'touch') return;
    const n = pick(x, y);
    if (n !== hover) { hover = n; canvas.style.cursor = n ? 'pointer' : ''; showTip(pinned && !n ? pinned : n); redraw(); }
  });
  canvas.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;   // right/middle click keep their browser meaning
    const [x, y] = local(e), n = pick(x, y);
    if (!n) return;
    drag = { node: n, x0: x, y0: y, vx: 0, vy: 0, t: 0, moved: false, touch: e.pointerType === 'touch', newTab: e.ctrlKey || e.metaKey };
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('is-dragging');
  });
  const release = e => {
    if (!drag) return;
    const { node, moved, touch, newTab } = drag;
    canvas.classList.remove('is-dragging');
    if (moved) {   // throw, unless the pointer had stopped before release
      const fresh = performance.now() - drag.t < 60;
      node.vx = fresh ? drag.vx * 0.6 : 0; node.vy = fresh ? drag.vy * 0.6 : 0; alpha = Math.max(alpha, 0.5);
    }
    drag = null;
    if (moved || e.type === 'pointercancel') { refresh(); return; }
    if (node.type === 'hub') { pinned = pinned === node ? null : node; showTip(pinned); }
    else if (touch) { hover = node; showTip(node, true); }   // touch: first tap previews, the tooltip links to the page
    else if (newTab) window.open(node.url, '_blank', 'noopener');
    else { location.href = node.url; return; }
    refresh();
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'touch') return; if (!drag && hover) { hover = null; showTip(pinned); redraw(); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && (pinned || hover)) { pinned = hover = null; showTip(null); refresh(); } });

  // ---- controls ----
  bar.hidden = false;
  bar.querySelectorAll('[data-tier]').forEach(b => b.addEventListener('click', () => {
    const t = b.dataset.tier;
    tier = t ? t.split('-').map(Number) : null;
    bar.querySelectorAll('[data-tier]').forEach(o => o.setAttribute('aria-pressed', String(o === b)));
    alpha = Math.max(alpha, 0.3); refresh();
  }));
  const lab = bar.querySelector('[data-cst-labels]');
  lab.addEventListener('click', () => { labels = !labels; lab.setAttribute('aria-pressed', String(labels)); refresh(); });
  bar.querySelector('[data-cst="center"]').addEventListener('click', () => {
    pinned = hover = null; showTip(null); seed(); alpha = 1;
    if (still.matches) settleStill(); else refresh();
  });
  bar.querySelector('[data-cst="explode"]').addEventListener('click', () => {
    for (const n of nodes) { const a = Math.random() * Math.PI * 2, s = 8 + Math.random() * 10; n.vx += Math.cos(a) * s; n.vy += Math.sin(a) * s; }
    alpha = 1;
    if (still.matches) settleStill(); else refresh();
  });

  // ---- lifecycle ----
  readColours();
  new MutationObserver(() => { readColours(); refresh(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  new ResizeObserver(() => resize()).observe(canvas);
  new IntersectionObserver(es => { onScreen = es[0].isIntersecting; if (running()) start(); else stopLoop(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (running()) start(); else stopLoop(); });
  still.addEventListener('change', () => { if (still.matches) { stopLoop(); settleStill(); } else start(); });
  resize();
  window.__constellation = { hubs: hubs.size, problems: data.problems.length, edges: edges.length, frames: () => frames };   // read by the end-to-end tests
})();
