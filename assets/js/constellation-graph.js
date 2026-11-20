// The Knowledge Constellation (_includes/constellation.html): every topic hub and problem from the build-time JSON.
// Layout: hubs are anchored around a wide ellipse (64px clear of every edge) and held apart by collision; problems
// spring to their hubs; soft walls rubber-band anything that drifts outside the padding. View: Ctrl/Cmd + scroll or a
// pinch zooms around the pointer, the +/- buttons zoom the centre, dragging the background pans (plain scrolling still
// scrolls the page). Drawing: a faint vignette, decorative orbit rings and twinkling dust, curved filaments with a pulse
// that runs outward from the hovered node, frosted hubs with a solved-ratio arc, jewel nodes for problems solved myself,
// rings for help/redo and an amber beacon for problems not solved yet (the one amber exception here).
// Interaction: drag and flick nodes, hover to spotlight (everything else drops to 12%) with a glass inspector card,
// click a problem to open it, click a hub to pin its cluster, Esc to clear. Hubs and stars cascade in from the centre.
// The loop runs only while the graph is on screen and the tab is visible, slows to half rate once settled, and under
// prefers-reduced-motion the layout is solved off-screen and drawn once. Colours are read from the CSS tokens.
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
  const TAU = Math.PI * 2, PAD = 64, BOTTOM_PAD = 52;   // BOTTOM_PAD: the hard floor keeps node rims this far above the bottom edge
  const hash = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return h; };

  // ---- graph ----
  const hubs = new Map(), nodes = [], edges = [];
  for (const t of data.topics) {
    const hub = { type: 'hub', id: t.id, label: t.label, count: 0, solved: 0, x: 0, y: 0, vx: 0, vy: 0, r: 12, links: [], ax: 0, ay: 0, angle: 0, appear: 0 };
    hubs.set(t.id, hub); nodes.push(hub);
  }
  for (const p of data.problems) {
    const node = { type: 'problem', ...p, x: 0, y: 0, vx: 0, vy: 0, r: 4.5 + clamp(((p.rating || 800) - 800) / 500, 0, 1) * 4.5, links: [], appear: 0 };
    nodes.push(node);
    for (const t of p.topics) {
      const hub = hubs.get(t);
      if (!hub) continue;
      hub.count++; if (p.kind === 'solved') hub.solved++;
      edges.push({ a: hub, b: node, bend: (hash(p.id + t) & 1 ? 1 : -1) * 0.16 });
      hub.links.push(node); node.links.push(hub);
    }
  }
  const hubList = [...hubs.values()];
  for (const h of hubList) h.r = 11 + Math.sqrt(h.solved) * 3;
  const hasOpen = nodes.some(n => n.kind === 'open');

  // ---- state ----
  const R = { w: 0, h: 0, dpr: 1, vw: 0, vh: 0, base: 1 };   // vw/vh: the world the layout lives in; base: its fit-to-screen zoom
  const view = { s: 1, tx: 0, ty: 0 };
  let alpha = 1, raf = 0, onScreen = true, frames = 0, labels = true, tier = null, odd = false;
  let hover = null, pinned = null, drag = null, pan = null, colours = {}, born = 0, pulseAt = 0, pulseFrom = null;
  const pointers = new Map();
  let pinch = null, lastHubLabelOverlaps = 0;
  const dust = Array.from({ length: 70 }, () => ({ u: Math.random(), v: Math.random(), r: Math.random() * 1.2 + 0.4, ph: Math.random() * TAU, sp: 0.6 + Math.random() * 1.4 }));
  const visible = n => n.type === 'hub' || !tier || (n.rating >= tier[0] && n.rating <= tier[1]);

  function readColours() {
    const cs = getComputedStyle(root);
    const v = name => cs.getPropertyValue(name).trim();
    colours = { text: v('--text'), text2: v('--text-2'), text3: v('--text-3'), hair: v('--hair-2'), field: v('--field'), amber: v('--accent-display'), bg: v('--tile-2') };
  }

  // hubs anchored round an ellipse inside the padding; problems start at the centre and cascade outward
  function layout(reseed) {
    const cx = R.vw / 2, cy = R.vh / 2;
    const rx = Math.max(60, R.vw / 2 - PAD - 70), ry = Math.max(50, R.vh / 2 - PAD - 18);
    hubList.forEach((h, i) => {
      h.angle = (i / hubList.length) * TAU - Math.PI / 2;
      h.ax = cx + Math.cos(h.angle) * rx; h.ay = cy + Math.sin(h.angle) * ry;
      if (reseed) { h.x = cx + Math.cos(h.angle) * 20; h.y = cy + Math.sin(h.angle) * 20; h.vx = h.vy = 0; }
    });
    if (reseed) for (const n of nodes) if (n.type === 'problem') { n.x = cx + (Math.random() - 0.5) * 30; n.y = cy + (Math.random() - 0.5) * 30; n.vx = n.vy = 0; }
  }

  // ---- physics ----
  function tick() {
    const k = alpha, span = Math.min(R.vw, R.vh), rest = clamp(span * 0.17, 48, 112);
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        let dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
        if (d2 < 0.01) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d2 = 0.25; }
        const d = Math.sqrt(d2), both = a.type === 'hub' && b.type === 'hub';
        let f = (both ? 5200 : 1500) / d2 * k;
        const gap = a.r + b.r + (both ? 70 : 20);   // collision: hubs keep room for their labels, problems for their IDs
        if (d < gap) f += (gap - d) * 0.22;
        const fx = dx / d * f, fy = dy / d * f;
        a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
      }
    }
    for (const e of edges) {
      const dx = e.b.x - e.a.x, dy = e.b.y - e.a.y, d = Math.hypot(dx, dy) || 1;
      const f = (d - (rest + e.a.r)) * 0.03 * k, fx = dx / d * f, fy = dy / d * f;
      e.a.vx += fx * 0.15; e.a.vy += fy * 0.15; e.b.vx -= fx; e.b.vy -= fy;
    }
    for (const n of nodes) {
      if (n.type === 'hub') { n.vx += (n.ax - n.x) * 0.035; n.vy += (n.ay - n.y) * 0.035; }   // anchor spring
      if (n === drag?.node) { n.vx = n.vy = 0; continue; }
      // soft walls: past the padding a spring pulls back (rubber band); a hard stop only at half the padding
      const lo = PAD * 0.5 + n.r;
      if (n.x < PAD) n.vx += (PAD - n.x) * 0.06; else if (n.x > R.vw - PAD) n.vx -= (n.x - (R.vw - PAD)) * 0.06;
      if (n.y < PAD) n.vy += (PAD - n.y) * 0.06; else if (n.y > R.vh - PAD) n.vy -= (n.y - (R.vh - PAD)) * 0.06;
      n.vx *= 0.8; n.vy *= 0.8;
      if (!Number.isFinite(n.vx) || !Number.isFinite(n.vy)) { n.vx = n.vy = 0; }
      n.x = clamp(n.x + n.vx, lo, R.vw - lo); n.y = clamp(n.y + n.vy, lo, R.vh - BOTTOM_PAD - n.r);
    }
    alpha = Math.max(0.02, alpha * 0.985);   // settles in about 4s
  }

  // ---- drawing helpers ----
  const toScreen = (x, y) => [x * view.s + view.tx, y * view.s + view.ty];
  const toWorld = (x, y) => [(x - view.tx) / view.s, (y - view.ty) / view.s];
  const ctrl = e => {   // quadratic control point: the midpoint pushed sideways, so filaments arc
    const mx = (e.a.x + e.b.x) / 2, my = (e.a.y + e.b.y) / 2, dx = e.b.x - e.a.x, dy = e.b.y - e.a.y;
    return [mx - dy * e.bend, my + dx * e.bend];
  };
  const bez = (e, t) => {
    const [qx, qy] = ctrl(e), u = 1 - t;
    return [u * u * e.a.x + 2 * u * t * qx + t * t * e.b.x, u * u * e.a.y + 2 * u * t * qy + t * t * e.b.y];
  };
  function focusSet() {
    const f = pinned || hover;
    return f ? new Set([f, ...f.links]) : null;
  }
  const ease = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

  function draw(now = performance.now()) {
    const { text, text2, text3, hair, field, amber, bg } = colours, motion = !still.matches;
    ctx.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
    ctx.clearRect(0, 0, R.w, R.h);
    // backdrop: vignette (screen space)
    const vg = ctx.createRadialGradient(R.w / 2, R.h / 2, 0, R.w / 2, R.h / 2, Math.max(R.w, R.h) * 0.7);
    vg.addColorStop(0, text2); vg.addColorStop(1, 'transparent');
    ctx.globalAlpha = 0.07; ctx.fillStyle = vg; ctx.fillRect(0, 0, R.w, R.h);
    // world space from here
    ctx.setTransform(R.dpr * view.s, 0, 0, R.dpr * view.s, R.dpr * view.tx, R.dpr * view.ty);
    const cx = R.vw / 2, cy = R.vh / 2, rx = Math.max(60, R.vw / 2 - PAD - 70), ry = Math.max(50, R.vh / 2 - PAD - 18);
    ctx.strokeStyle = hair; ctx.lineWidth = 1 / view.s; ctx.setLineDash([3 / view.s, 6 / view.s]);
    for (const f of [0.34, 0.64, 1]) { ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.ellipse(cx, cy, rx * f, ry * f, 0, 0, TAU); ctx.stroke(); }
    ctx.setLineDash([]);
    for (const m of dust) {   // twinkling motes
      ctx.globalAlpha = (motion ? 0.18 + 0.22 * (0.5 + 0.5 * Math.sin(now / 1000 * m.sp + m.ph)) : 0.25);
      ctx.fillStyle = text3; ctx.beginPath(); ctx.arc(m.u * R.vw, m.v * R.vh, m.r / view.s, 0, TAU); ctx.fill();
    }
    const lit = focusSet();
    const life = n => (motion ? ease((now - born - n.delay) / 420) : 1);
    const dim = n => (lit && !lit.has(n) ? 0.12 : 1) * (visible(n) ? 1 : 0.12) * life(n);
    // filaments
    for (const e of edges) {
      if (!visible(e.b)) continue;
      const on = lit && lit.has(e.a) && lit.has(e.b), a = Math.min(life(e.a), life(e.b));
      if (a <= 0) continue;
      const g = ctx.createLinearGradient(e.a.x, e.a.y, e.b.x, e.b.y);
      g.addColorStop(0, on ? text : text2); g.addColorStop(1, on ? field : hair);
      ctx.globalAlpha = a * (lit && !on ? 0.12 : on ? 0.95 : 0.6);
      ctx.strokeStyle = g; ctx.lineWidth = (on ? 1.6 : 1) / view.s;
      const [qx, qy] = ctrl(e);
      ctx.beginPath(); ctx.moveTo(e.a.x, e.a.y); ctx.quadraticCurveTo(qx, qy, e.b.x, e.b.y); ctx.stroke();
      if (on && motion && pulseFrom && now - pulseAt < 700) {   // energy pulse running outward from the hovered node
        const t = (now - pulseAt) / 700, [px, py] = bez(e, pulseFrom === e.a ? t : 1 - t);
        ctx.globalAlpha = 1 - t; ctx.fillStyle = text;
        ctx.beginPath(); ctx.arc(px, py, 2.4 / view.s, 0, TAU); ctx.fill();
      }
    }
    // nodes
    for (const n of nodes) {
      const a = dim(n), sc = motion ? 0.4 + 0.6 * life(n) : 1, r = n.r * sc;
      if (a <= 0.001) continue;
      if (n.type === 'hub') {
        const halo = ctx.createRadialGradient(n.x, n.y, r * 0.5, n.x, n.y, r * 2.6);
        halo.addColorStop(0, text2); halo.addColorStop(1, 'transparent');
        ctx.globalAlpha = a * 0.2; ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(n.x, n.y, r * 2.6, 0, TAU); ctx.fill();
        ctx.globalAlpha = a; ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, TAU); ctx.fill();   // opaque base: filaments stop at the rim
        ctx.globalAlpha = a * 0.3; ctx.fillStyle = text2; ctx.fill();   // frosted core
        ctx.globalAlpha = a; ctx.strokeStyle = text; ctx.lineWidth = 1.5 / view.s; ctx.stroke();
        ctx.strokeStyle = hair; ctx.lineWidth = 2.5 / view.s;   // solved-ratio arc
        ctx.beginPath(); ctx.arc(n.x, n.y, r + 4.5, 0, TAU); ctx.stroke();
        if (n.count) { ctx.strokeStyle = text; ctx.beginPath(); ctx.arc(n.x, n.y, r + 4.5, -Math.PI / 2, -Math.PI / 2 + TAU * n.solved / n.count); ctx.stroke(); }
      } else {
        ctx.globalAlpha = a;
        if (n.kind === 'solved') {   // jewel: soft glow, solid body, specular highlight
          const gl = ctx.createRadialGradient(n.x, n.y, r * 0.6, n.x, n.y, r * 2.2);
          gl.addColorStop(0, text); gl.addColorStop(1, 'transparent');
          ctx.globalAlpha = a * 0.22; ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(n.x, n.y, r * 2.2, 0, TAU); ctx.fill();
          ctx.globalAlpha = a; ctx.fillStyle = text; ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, TAU); ctx.fill();
          ctx.globalAlpha = a * 0.55; ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(n.x - r * 0.32, n.y - r * 0.34, r * 0.32, 0, TAU); ctx.fill();
        } else if (n.kind === 'open') {   // boss beacon: amber core, pulsing ring, slow orbit
          const pulse = motion ? (Math.sin(now / 420) + 1) / 2 : 0;
          ctx.fillStyle = amber; ctx.beginPath(); ctx.arc(n.x, n.y, r * 0.55, 0, TAU); ctx.fill();
          ctx.strokeStyle = amber; ctx.lineWidth = 2 / view.s; ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, TAU); ctx.stroke();
          ctx.globalAlpha = a * (0.2 + 0.5 * (1 - pulse)); ctx.beginPath(); ctx.arc(n.x, n.y, r + 3 + pulse * 7, 0, TAU); ctx.stroke();
          ctx.globalAlpha = a * 0.7; ctx.setLineDash([2 / view.s, 4 / view.s]); ctx.lineDashOffset = motion ? -now / 120 : 0;
          ctx.beginPath(); ctx.arc(n.x, n.y, r + 9, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
        } else {   // help: ring; redo: dashed ring
          ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, TAU); ctx.fill();
          ctx.setLineDash(n.kind === 'redo' ? [2.5 / view.s, 2 / view.s] : []);
          ctx.strokeStyle = text; ctx.lineWidth = 1.5 / view.s; ctx.stroke(); ctx.setLineDash([]);
        }
      }
    }
    drawLabels(lit, dim);
    ctx.globalAlpha = 1;
    frames++;
  }

  // labels in screen space: hubs always (pushed outward, nudged apart), problem IDs only where they fit
  function drawLabels(lit, dim) {
    if (!labels && !lit) { lastHubLabelOverlaps = 0; return; }
    ctx.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
    ctx.textBaseline = 'middle';
    // every visible node is an obstacle (beacons include their orbit), so labels never sit on a dot
    const reach = n => n.r + (n.type === 'hub' ? 7 : n.kind === 'open' ? 11 : 2);   // hub: out to the solved-ratio ring
    const boxes = nodes.filter(n => visible(n) && dim(n) >= 0.3).map(n => { const [x, y] = toScreen(n.x, n.y), r = reach(n) * view.s; return { x: x - r, y: y - r, w: 2 * r, h: 2 * r, node: n }; });
    const hits = (b, self) => boxes.some(o => o.node !== self && b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y);
    const fits = b => b.x >= 2 && b.x + b.w <= R.w - 2 && b.y >= 2 && b.y + b.h <= R.h - 2;
    const big = R.w > 560;
    ctx.font = `600 ${big ? 13 : 12}px Geist, system-ui, sans-serif`;
    let overlaps = 0;
    for (const h of hubList) {
      if (dim(h) < 0.3 && !(lit && lit.has(h))) continue;
      const [sx, sy] = toScreen(h.x, h.y), w = ctx.measureText(h.label).width, rr = (h.r + 8) * view.s;
      const right = Math.cos(h.angle) >= 0;
      const side = x => ({ x, y: sy - 8, w, h: 16 }), mid = y => ({ x: clamp(sx - w / 2, 4, R.w - w - 4), y, w, h: 16 });
      // outward side first, then above, the inner side and below: the first spot clear of every node and label wins
      const spots = [side(right ? sx + rr : sx - rr - w), mid(sy - rr - 16), side(right ? sx - rr - w : sx + rr), mid(sy + rr)].filter(fits);
      let b = spots.find(s => !hits(s, h)) || spots[0] || mid(Math.sin(h.angle) < 0 ? sy - rr - 16 : sy + rr), tries = 0;
      while (hits(b, h) && tries++ < 8) b = { ...b, y: b.y + (Math.sin(h.angle) >= 0 ? 12 : -12) };
      if (hits(b, h)) overlaps++;
      boxes.push(b);
      ctx.globalAlpha = Math.max(dim(h), lit && lit.has(h) ? 1 : 0);
      ctx.fillStyle = colours.text; ctx.textAlign = 'left'; ctx.fillText(h.label, b.x, b.y + 8);
    }
    lastHubLabelOverlaps = overlaps;
    if (!labels && !lit) return;
    ctx.font = '500 10px "Geist Mono", ui-monospace, monospace';
    const zoomedOut = view.s < 0.8;   // narrow screens start below this, so only hub labels show until you zoom or hover
    const order = nodes.filter(n => n.type === 'problem' && visible(n)).sort((a, b) => (lit ? (lit.has(b) - lit.has(a)) : 0) || b.r - a.r);
    for (const n of order) {
      const isLit = lit && lit.has(n);
      if (lit && !isLit) continue;
      if (!isLit && (zoomedOut || !labels)) continue;
      const hub = n.links[0];
      const [sx, sy] = toScreen(n.x, n.y);
      let ux = 1, uy = 0;
      if (hub) { const dx = n.x - hub.x, dy = n.y - hub.y, d = Math.hypot(dx, dy) || 1; ux = dx / d; uy = dy / d; }   // away from the parent hub
      const w = ctx.measureText(n.id).width, off = (n.r + (n.kind === 'open' ? 11 : 0)) * view.s + 5;   // clear the boss beacon's orbit
      const box = (x, y) => ({ x: clamp(x, 2, R.w - w - 2), y, w, h: 12 });
      // away from the hub first, then right, left, above and below; a label with no clear spot is left out
      const b = [box(sx + ux * off - (ux < 0 ? w : 0), sy + uy * off - 6), box(sx + off, sy - 6), box(sx - off - w, sy - 6), box(sx - w / 2, sy - off - 12), box(sx - w / 2, sy + off)]
        .find(s => fits(s) && !hits(s, n));
      if (!b) continue;
      boxes.push(b);
      ctx.globalAlpha = dim(n); ctx.fillStyle = colours.text3; ctx.textAlign = 'left'; ctx.fillText(n.id, b.x, b.y + 6);
    }
  }

  // ---- loop ----
  const running = () => onScreen && !document.hidden && !still.matches;
  const animating = now => now - born < 420 + nodes.length * 18 || now - pulseAt < 700;
  function frame(now) {
    raf = 0;
    if (!running()) return;
    const settled = alpha <= 0.021 && !drag && !pan && !pinch && !animating(now);
    if (!settled) { tick(); draw(now); }
    else if ((odd = !odd)) draw(now);   // settled: only the twinkle and the beacon move, at half rate
    raf = requestAnimationFrame(frame);
  }
  const start = () => { if (!raf && running()) raf = requestAnimationFrame(frame); };
  const stopLoop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
  const redraw = () => { if (!raf) draw(); };
  const wake = (a = 0.3) => { alpha = Math.max(alpha, a); if (running()) start(); else draw(); };
  function settleStill() { alpha = 1; for (let i = 0; i < 500; i++) tick(); draw(); }
  function entrance() {   // hubs first, then stars by distance from the centre: 18ms apart
    born = performance.now();
    hubList.forEach((h, i) => { h.delay = i * 18; });
    nodes.filter(n => n.type === 'problem').forEach((n, i) => { n.delay = hubList.length * 18 + i * 18; });
  }

  // ---- size ----
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return false;
    const first = !R.w, base = Math.min(1, w / 640), vw = w / base, vh = h / base;
    const sx = R.vw ? vw / R.vw : 1, sy = R.vh ? vh / R.vh : 1;
    R.w = w; R.h = h; R.vw = vw; R.vh = vh; R.dpr = Math.min(window.devicePixelRatio || 1, 2);
    view.s = (view.s || 1) / R.base * base; view.tx *= sx * (base / R.base); view.ty *= sy * (base / R.base); R.base = base;
    canvas.width = Math.round(w * R.dpr); canvas.height = Math.round(h * R.dpr);
    if (!first) for (const n of nodes) { n.x *= sx; n.y *= sy; }
    layout(first);
    if (first) entrance();
    if (still.matches) settleStill(); else wake(first ? 1 : 0.4);
    return true;
  }

  // ---- inspector card (glass): opens from the node in 200ms, closes in 120ms ----
  const fmt = d => (d ? new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }) : '');
  let tipFor = null, tipLink = false, tipHide = 0;
  function placeTip(n) {
    const [sx, sy] = toScreen(n.x, n.y), w = tip.offsetWidth, h = tip.offsetHeight;
    const left = clamp(sx + 16, 6, R.w - w - 6), top = sy - h - 14 < 6 ? sy + 16 : sy - h - 14;
    tip.style.left = `${left}px`; tip.style.top = `${top}px`;
    tip.style.setProperty('--origin-x', `${sx - left}px`); tip.style.setProperty('--origin-y', `${sy - top}px`);
  }
  function showTip(n, withLink) {
    clearTimeout(tipHide);
    if (!n) {
      tipFor = null;
      tip.classList.remove('is-open');
      tipHide = setTimeout(() => { tip.hidden = true; }, still.matches ? 0 : 120);
      return;
    }
    if (n === tipFor && !!withLink === tipLink && !tip.hidden) { placeTip(n); return; }
    tipFor = n; tipLink = !!withLink;
    tip.replaceChildren();
    const b = document.createElement('b'), meta = document.createElement('span');
    if (n.type === 'hub') {
      b.textContent = n.label;
      meta.textContent = `${n.solved} of ${n.count} solved myself`;
    } else {
      b.textContent = `${n.id} · ${n.name}`;
      meta.textContent = [n.rating, n.label, n.kind === 'solved' || n.kind === 'help' ? fmt(n.date) : `last tried ${fmt(n.date)}`].filter(Boolean).join(' · ');
    }
    tip.append(b, meta);
    if (withLink && n.type === 'problem') { const a = document.createElement('a'); a.href = n.url; a.textContent = 'Open the problem page'; tip.append(a); }
    tip.hidden = false;
    placeTip(n);
    requestAnimationFrame(() => tip.classList.add('is-open'));
  }

  // ---- pointer ----
  const pick = (sx, sy) => {
    const [x, y] = toWorld(sx, sy);
    let best = null, bd = Infinity;
    for (const n of nodes) {
      if (!visible(n)) continue;
      const d = Math.hypot(n.x - x, n.y - y);
      if (d < n.r + (coarse.matches ? 14 : 7) / view.s && d < bd) { bd = d; best = n; }
    }
    return best;
  };
  const local = e => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  function setHover(n) {
    if (n === hover) return;
    hover = n;
    if (n) { pulseAt = performance.now(); pulseFrom = n; }
    canvas.style.cursor = n ? 'pointer' : '';
    showTip(pinned && !n ? pinned : n);
    if (running()) start(); else redraw();
  }
  function zoomAt(sx, sy, factor) {
    const s = clamp(view.s * factor, R.base * 0.6, 3);
    view.tx = sx - (sx - view.tx) * (s / view.s); view.ty = sy - (sy - view.ty) * (s / view.s); view.s = s;
    if (tipFor) placeTip(tipFor);
    redraw();
  }
  canvas.addEventListener('wheel', e => {
    if (!(e.ctrlKey || e.metaKey)) return;   // plain scrolling keeps scrolling the page
    e.preventDefault();
    const [x, y] = local(e);
    zoomAt(x, y, Math.exp(-e.deltaY * 0.0025));
  }, { passive: false });
  canvas.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;   // right/middle click keep their browser meaning
    const [x, y] = local(e);
    pointers.set(e.pointerId, [x, y]);
    if (pointers.size === 2) {   // pinch
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1 };
      drag = null; pan = null;
      return;
    }
    canvas.setPointerCapture(e.pointerId);
    const n = pick(x, y);
    if (n) drag = { node: n, x0: x, y0: y, vx: 0, vy: 0, t: 0, moved: false, touch: e.pointerType === 'touch', newTab: e.ctrlKey || e.metaKey };
    else pan = { x0: x, y0: y, tx: view.tx, ty: view.ty, moved: false };
    canvas.classList.add('is-dragging');
  });
  canvas.addEventListener('pointermove', e => {
    const [x, y] = local(e);
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, [x, y]);
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1;
      zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, d / pinch.d); pinch.d = d;
      return;
    }
    if (drag) {
      if (Math.hypot(x - drag.x0, y - drag.y0) > 4) drag.moved = true;
      const [wx, wy] = toWorld(x, y);
      drag.vx = wx - drag.node.x; drag.vy = wy - drag.node.y; drag.t = performance.now();
      drag.node.x = wx; drag.node.y = wy;
      showTip(drag.node);
      wake(0.3);
      return;
    }
    if (pan) {
      if (Math.hypot(x - pan.x0, y - pan.y0) > 3) pan.moved = true;
      view.tx = pan.tx + (x - pan.x0); view.ty = pan.ty + (y - pan.y0);
      if (tipFor) placeTip(tipFor);
      redraw();
      return;
    }
    if (e.pointerType !== 'touch') setHover(pick(x, y));
  });
  const release = e => {
    pointers.delete(e.pointerId);
    if (pinch) { if (pointers.size < 2) pinch = null; return; }
    canvas.classList.remove('is-dragging');
    if (pan) {
      const moved = pan.moved; pan = null;
      if (!moved && e.type !== 'pointercancel') { pinned = null; hover = null; showTip(null); redraw(); }   // tap on empty space clears
      return;
    }
    if (!drag) return;
    const { node, moved, touch, newTab } = drag;
    if (moved) {   // flick, unless the pointer had stopped before release
      const fresh = performance.now() - drag.t < 60;
      node.vx = fresh ? drag.vx * 0.7 : 0; node.vy = fresh ? drag.vy * 0.7 : 0;
    }
    drag = null;
    if (moved || e.type === 'pointercancel') { wake(0.5); return; }
    if (node.type === 'hub') { pinned = pinned === node ? null : node; pulseAt = performance.now(); pulseFrom = node; showTip(pinned); }
    else if (touch) { hover = node; showTip(node, true); }   // touch: first tap previews; the card links to the page
    else if (newTab) window.open(node.url, '_blank', 'noopener');
    else { location.href = node.url; return; }
    wake(0.03);
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'touch' || drag || pan) return; setHover(null); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && (pinned || hover)) { pinned = hover = null; showTip(null); redraw(); } });

  // ---- controls ----
  bar.hidden = false;
  bar.querySelectorAll('[data-tier]').forEach(b => b.addEventListener('click', () => {
    const t = b.dataset.tier;
    tier = t ? t.split('-').map(Number) : null;
    bar.querySelectorAll('[data-tier]').forEach(o => o.setAttribute('aria-pressed', String(o === b)));
    wake(0.3);
  }));
  const lab = bar.querySelector('[data-cst-labels]');
  lab.addEventListener('click', () => { labels = !labels; lab.setAttribute('aria-pressed', String(labels)); redraw(); });
  const resetView = () => { view.s = R.base; view.tx = 0; view.ty = 0; };
  bar.querySelector('[data-cst="center"]').addEventListener('click', () => {
    pinned = hover = null; showTip(null); resetView(); layout(true); entrance(); alpha = 1;
    if (still.matches) settleStill(); else wake(1);
  });
  bar.querySelector('[data-cst="explode"]').addEventListener('click', () => {
    for (const n of nodes) { const a = Math.random() * TAU, s = 10 + Math.random() * 12; n.vx += Math.cos(a) * s; n.vy += Math.sin(a) * s; }
    if (still.matches) settleStill(); else wake(1);
  });
  bar.querySelectorAll('[data-cst-zoom]').forEach(b => b.addEventListener('click', () => zoomAt(R.w / 2, R.h / 2, Number(b.dataset.cstZoom) > 0 ? 1.25 : 0.8)));

  // ---- lifecycle ----
  readColours();
  new MutationObserver(() => { readColours(); redraw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  new ResizeObserver(() => resize()).observe(canvas);
  new IntersectionObserver(es => { onScreen = es[0].isIntersecting; if (running()) start(); else stopLoop(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (running()) start(); else stopLoop(); });
  still.addEventListener('change', () => { if (still.matches) { stopLoop(); settleStill(); } else wake(0.3); });
  resize();
  // read by the end-to-end tests: counts, frames, the screen-space extent of every node, and hub-label collisions
  window.__constellation = {
    hubs: hubs.size, problems: data.problems.length, edges: edges.length, frames: () => frames,
    bounds: () => {
      const b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity, w: R.w, h: R.h };
      for (const n of nodes) { const [x, y] = toScreen(n.x, n.y), r = n.r * view.s; b.minX = Math.min(b.minX, x - r); b.minY = Math.min(b.minY, y - r); b.maxX = Math.max(b.maxX, x + r); b.maxY = Math.max(b.maxY, y + r); }
      return b;
    },
    hubLabelOverlaps: () => lastHubLabelOverlaps,
  };
})();
