// Hero background: procedural pixel/ASCII koi, jellyfish or cranes on a character grid. Zero dependencies.
// Solid body cells go into a one-pixel-per-cell buffer that is scaled up with smoothing off; trails, tentacles and
// ripples are drawn as characters on top. Clicking empty hero space drops food for the koi, or startles the
// jellyfish and cranes. Each page load picks one animal at random, never the one shown last time (localStorage
// 'heroLastAnimal'); ?hero=koi|jelly|cranes forces one for a visit. Creatures start spread over a 2-row grid of the
// full-bleed canvas and keep apart with a soft separation force. The loop runs only while the hero is on screen and
// the tab is visible; with prefers-reduced-motion a single still frame is drawn. window.__hero reports the animal,
// the frame count and positions (tests).
//
// The koi, jellyfish and crane shape functions, swim, pulse and flight maths are adapted from "ASCII Animals"
// (https://github.com/Pawan-webdeveloper/Ascii-Animals-extension) under the MIT License:
//   Copyright (c) 2026 Pawan-webdeveloper
//   Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
//   documentation files (the "Software"), to deal in the Software without restriction, including without limitation
//   the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
//   permit persons to whom the Software is furnished to do so, subject to the following conditions: The above
//   copyright notice and this permission notice shall be included in all copies or substantial portions of the
//   Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT
//   LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT
//   SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
//   OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
//   DEALINGS IN THE SOFTWARE.
(() => {
  const canvas = document.querySelector('.hero .hero-bg');
  const ctx = canvas && canvas.getContext('2d');
  if (!ctx) return;
  const hero = canvas.closest('.hero');
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const KEY = 'heroLastAnimal', ANIMALS = ['koi', 'jelly', 'cranes'];
  const TAU = Math.PI * 2, CELL_CSS = 9;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const sq = x => x * x;
  const ell = (u, v, cu, cv, ru, rv) => sq((u - cu) / ru) + sq((v - cv) / rv);
  const hash2 = (i, j, s) => { const h = Math.sin(i * 127.1 + j * 311.7 + s * 74.7) * 43758.5453; return h - Math.floor(h); };
  const smooth = t => t * t * (3 - 2 * t);
  function vnoise(x, y, s) {   // value noise for the koi patches
    const xi = Math.floor(x), yi = Math.floor(y), xf = smooth(x - xi), yf = smooth(y - yi);
    const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
    return lerp(lerp(a, b, xf), lerp(c, d, xf), yf);
  }
  const keep = (arr, ok) => { let w = 0; for (const x of arr) if (ok(x)) arr[w++] = x; arr.length = w; };
  const angleTo = (from, to) => { let d = (to - from) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

  // one reused result object: sampling allocates nothing
  const H = { glyph: null, c: null, a: 0, b: 1 };
  let ci = 0, cj = 0, tick = 0;   // the cell being sampled and the glyph re-roll clock
  const hit = (c, a = 1, b = 1) => { H.glyph = null; H.c = c; H.a = a; H.b = b * (0.86 + 0.28 * hash2(ci, cj, 3)); return H; };
  const glyph = (set, c, a) => { H.glyph = set.length > 1 ? set[(hash2(ci, cj, tick) * set.length) | 0] : set; H.c = c; H.a = a; H.b = 1; return H; };
  const mix = (p, q, t) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t), lerp(p[2], q[2], t)];
  const WHITE = [240, 244, 255], FOOD = [204, 126, 58];

  const KINDS = {
    koi: {
      radius: 13, speed: 4.4, turn: 1.1, phaseRate: 5,
      trail: { chars: '~-~=', color: [150, 175, 210], at: -10 },
      palettes: [
        { base: [236, 232, 226], patch: [214, 48, 36], thr: 0.5 },
        { base: [236, 232, 226], patch: [205, 45, 35], thr: 0.55, dark: [30, 30, 34] },
        { base: [244, 196, 44], patch: [250, 150, 30], thr: 0.72 },
        { base: [240, 118, 38], patch: [255, 172, 72], thr: 0.68 },
        { base: [214, 220, 228], patch: [176, 186, 202], thr: 0.6 },
      ],
      prep() {},
      sample(u, v, e) {
        if (u < -12.6 || u > 8.4) return null;
        const P = e.pal;
        const tw = clamp((8 - u) / 20, 0, 1);
        const vv = v - e.amp * Math.sin(e.phase - u * 0.34) * tw * tw * 1.6;   // the swim wave grows toward the tail
        const av = Math.abs(vv);
        let hw = 0;
        if (u > 3.6) hw = 3.0 * Math.sqrt(Math.max(0, 1 - sq((u - 3.6) / 4.7)));
        else if (u > -8) hw = 0.75 + 2.25 * Math.pow((u + 8) / 11.6, 1.25);
        if (av < hw) {
          if (u > 5.5 && u < 6.9 && av > hw - 1.15 && av < hw - 0.2) return hit([22, 22, 26]);   // eyes
          let c = vnoise(u * 0.3 + e.seed * 7, vv * 0.42, e.seed) > P.thr ? P.patch : P.base;
          if (P.dark && vnoise(u * 0.45, vv * 0.5 + 9, e.seed + 3) > 0.68) c = P.dark;
          return hit(c, 1, hw - av < 0.65 ? 0.78 : av < 0.5 ? 1.05 : 1);
        }
        const fin = e.fin;
        if (u > 0.2 && u < 3.4 && sq((u + (av - hw) * 0.45 - 1.6) / 1.3) + sq((av - hw - 1.1) / 1.3) < 1) return hit(fin, 0.55);   // pectorals
        if (u <= -7.4) {   // forked tail
          const t = -7.4 - u, fw = 0.55 + t * 0.72;
          if (av < fw && !(t > 3.7 && av < (t - 3.7) * 1.1)) return hit(fin, 0.62);
        }
        return null;
      },
    },
    jelly: {
      radius: 17, scale: 1.35, speed: 3.2, turn: 0.6, phaseRate: 2.6,
      trail: { chars: '°.o', color: [220, 120, 210], at: -15 },
      palettes: [
        { bell: [232, 56, 182], core: [255, 172, 230], arm: [240, 112, 202] },
        { bell: [168, 78, 240], core: [226, 182, 255], arm: [190, 122, 250] },
        { bell: [255, 96, 142], core: [255, 192, 208], arm: [255, 132, 172] },
      ],
      prep(e) {   // contracts half the cycle, rests the other half; thrust only while contracting
        const c = sq(Math.max(0, Math.sin(e.phase)));
        e.c = c; e.Rw = 5.4 * (1 - 0.2 * c); e.H = 4.6 * (1 + 0.18 * c); e.speedMod = 0.35 + 1.4 * c;
      },
      sample(u, v, e) {
        const P = e.pal, av = Math.abs(v);
        if (u >= -0.5) {
          const d = sq(Math.max(u, 0) / e.H) + sq(v / e.Rw);
          if (d >= 1) return null;
          if (u < 0 && (Math.floor((v + 40) * 0.8) & 1) === 1) return null;   // scalloped rim
          const glow = 1 + 0.35 * e.c;
          if (d < 0.32) return hit(P.core, 0.95, glow);
          return hit(P.bell, 0.95, (d > 0.78 ? 0.72 : 1) * glow);
        }
        const depth = -u;
        if (depth > 16) return null;
        const armW = 1.5 + 0.5 * Math.sin(e.phase * 0.8 + depth * 0.6);   // oral arms
        if (depth < 8.5 && av < armW * (1 - depth / 12)) return glyph('$§%&', P.arm, 0.95 - depth * 0.05);
        const pull = 1 - 0.12 * e.c;   // tentacles draw in on contraction
        for (let k = -4.3; k <= 4.4; k += 2.15) {
          if (Math.abs(k) < 1) continue;
          const cx = k * pull + 0.9 * Math.sin(e.phase * 0.7 + depth * 0.42 + k) * (depth / 12);
          if (Math.abs(v - cx) < 0.6) return glyph('()|:', P.arm, 0.85 * (1 - depth / 16));
        }
        return null;
      },
    },
    cranes: {
      radius: 15, scale: 1.15, speed: 5.5, turn: 0.5, phaseRate: 3.4,
      trail: { chars: "'`.", color: [190, 200, 225], at: -9 },
      palettes: [
        { white: [226, 230, 240], black: [44, 46, 54], feather: [78, 82, 96], crown: [222, 42, 42] },
        { white: [214, 220, 238], black: [50, 54, 62], feather: [88, 92, 106], crown: [210, 52, 52] },
        { white: [172, 180, 196], black: [64, 68, 78], feather: [98, 104, 120], crown: [200, 56, 56] },
      ],
      prep(e) { e.f = 0.55 + 0.45 * Math.cos(e.phase); e.span = 3.5 + 9.5 * e.f; },   // wing beat
      sample(u, v, e) {
        const av = Math.abs(v), P = e.pal;
        if (u > 9.0 && u < 10.8 && av < 0.34) return hit([196, 186, 136]);   // beak
        if (ell(u, v, 8.3, 0, 0.95, 0.78) < 1) return u > 8.3 && av < 0.42 ? hit(P.crown) : hit(P.black);   // head
        if (u > 2.3 && u <= 8.3 && av < 0.5) return hit(u > 4.6 ? P.black : P.white);   // neck
        if (ell(u, v, -1, 0, 3.8, 1.45) < 1) return hit(P.white);   // body
        if (u < -4.4 && u > -6.0 && av < 0.9) return hit(P.black);   // tail
        if (u <= -5.6 && u > -10.5 && Math.abs(av - 0.45) < 0.32) return glyph(':|', [130, 130, 136], 0.8);   // legs
        if (av >= 1.1 && av < 1.1 + e.span) {   // wings
          const w = av - 1.1, q = w / e.span;
          const uf = 1.5 - 1.7 * q - (q > 0.82 ? sq((q - 0.82) * 9) * 0.5 : 0);
          const ub = -2.5 - 1.0 * q + (q > 0.74 ? sq((q - 0.74) * 6.5) : 0);
          if (u < uf && u > ub) {
            if (u - ub < 0.55 && ((w * 1.4) | 0) & 1) return null;
            const shade = 0.72 + 0.28 * e.f;
            if (q > 0.84 || (q < 0.74 && u - ub < (uf - ub) * 0.4)) return hit(P.feather, 1, shade);
            return hit(P.white, 1, shade);
          }
        }
        return null;
      },
    },
  };
  const FLIGHT = -Math.PI / 4;   // the cranes' flow: up and to the right

  // ---- state ----
  const R = { dpr: 1, W: 0, H: 0, cell: 9, cols: 0, rows: 0, lo: document.createElement('canvas'), img: null, font: '' };
  const loCtx = R.lo.getContext('2d');
  let animals = [];
  const foods = [], trails = [], ripples = [];
  let species = 'koi', simTime = 0, frames = 0, raf = 0, last = 0, onScreen = true;
  const status = window.__hero = { mode: species, frames: 0, positions: () => animals.map(e => [e.x / (R.W || 1), e.y / (R.H || 1)]) };

  function spawn(kindName, i, n, cx, cy) {
    const A = KINDS[kindName], z = Math.pow(Math.random(), 0.85);
    const base = R.W / R.dpr < 640 ? 0.72 : 1;
    const e = {
      kind: A, z, seed: Math.random() * 100, pal: A.palettes[i % A.palettes.length],
      k: base * (A.scale || 1) * lerp(0.62, 1.05, z),
      x: cx * R.W, y: cy * R.H, baseOff: rand(-1, 1),
      phase: rand(0, TAU), rateMul: rand(0.85, 1.15), speedMul: rand(0.8, 1.15),
      heading: kindName === 'jelly' ? -Math.PI / 2 + rand(-0.4, 0.4) : kindName === 'cranes' ? FLIGHT + rand(-0.3, 0.3) : rand(0, TAU),
      retargetAt: 0, scared: 0, sx: 0, sy: 0, fade: 0, lastCell: -1, speedMod: 1, amp: 1.3 * 0.85, c: 0,
    };
    e.target = e.heading;
    if (e.pal.base) e.fin = mix(e.pal.base, WHITE, 0.25);
    return e;
  }

  function populate(kindName) {
    species = kindName;
    const w = R.W / R.dpr;
    const n = ({ koi: 6, jelly: 5, cranes: 6 })[kindName] - (w < 640 ? 1 : 0);
    const cols = Math.ceil(n / 2), cells = [];   // a cols x 2 grid over the whole canvas, one creature per cell
    for (let r = 0; r < 2; r++) for (let c = 0; c < cols; c++) cells.push([(c + rand(0.2, 0.8)) / cols, 0.12 + (r + rand(0.15, 0.85)) * 0.76 / 2]);
    for (let i = cells.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [cells[i], cells[j]] = [cells[j], cells[i]]; }
    animals = Array.from({ length: n }, (_, i) => spawn(kindName, i, n, cells[i][0], cells[i][1])).sort((a, b) => a.z - b.z);
    foods.length = 0; trails.length = 0; ripples.length = 0;
  }

  function resize() {
    R.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return false;
    R.W = Math.round(w * R.dpr); R.H = Math.round(h * R.dpr);
    canvas.width = R.W; canvas.height = R.H;
    R.cell = Math.max(4, Math.round(CELL_CSS * R.dpr));
    R.cols = Math.ceil(R.W / R.cell) + 1; R.rows = Math.ceil(R.H / R.cell) + 1;
    R.lo.width = R.cols; R.lo.height = R.rows;
    R.img = loCtx.createImageData(R.cols, R.rows);
    R.font = `600 ${Math.round(R.cell * 1.02)}px "Mona Sans Mono", ui-monospace, monospace`;
    atlas.clear();
    return true;
  }

  // ---- simulation ----
  function step(dt) {
    simTime += dt;
    const t = simTime, reach = 220 * R.dpr;
    for (const f of foods) { f.age += dt; f.x += f.vx * dt; f.y += f.vy * dt; const d = Math.pow(0.12, dt); f.vx *= d; f.vy *= d; }
    keep(foods, f => !f.eaten && f.age < f.life);
    for (const e of animals) {
      const A = e.kind;
      e.fade = Math.min(1, e.fade + dt / 0.9);
      A.prep(e);
      let boost = 1, turnMul = 1;
      if (species === 'koi' && foods.length) {   // swim toward the nearest pellet, ahead of the head
        const hx = e.x + Math.cos(e.heading) * 6.5 * e.k * R.cell, hy = e.y + Math.sin(e.heading) * 6.5 * e.k * R.cell;
        let best = null, bestD = Infinity;
        for (const f of foods) { const d = Math.hypot(f.x - hx, f.y - hy); if (d < bestD) { bestD = d; best = f; } }
        if (best && bestD < reach * 2.6) {
          const close = clamp(1 - bestD / reach, 0, 1), far = bestD > reach;
          e.target = Math.atan2(best.y - hy, best.x - hx);
          boost = far ? 2.2 : 2.6 + 2.4 * close; turnMul = far ? 2.2 : 2.6 + 3.5 * close;
          if (bestD < 3.5 * e.k * R.cell) boost *= 0.45;
          if (bestD < (1.3 * e.k + 0.8) * R.cell && best.age > 0.4 && t >= (e.nextBite || 0)) {
            best.eaten = true; e.nextBite = t + rand(0.5, 0.9); e.retargetAt = t + rand(0.4, 1.4);
            ripples.push({ x: best.x, y: best.y, t0: t, dur: 0.7, maxR: 2.5, chars: '°', color: [170, 200, 230] });
          }
        } else if (t > e.retargetAt) wander(e, t);
      } else if (t > e.retargetAt) wander(e, t);
      let steer = separate(e, foods.length && species === 'koi' ? 0.5 : 1);
      if (e.scared > 0) {   // startled: steer away, pulse faster
        e.target = steer = Math.atan2(e.sy, e.sx); boost *= 1 + 2.2 * e.scared; turnMul *= 1 + 4 * e.scared;
        e.speedMod = Math.max(e.speedMod, 0.9);
        e.scared = Math.max(0, e.scared - dt / 1.4);
      }
      e.heading += clamp(angleTo(e.heading, steer), -A.turn * turnMul * dt, A.turn * turnMul * dt);
      const sp = A.speed * e.speedMul * (e.speedMod || 1) * boost * R.cell * e.k * 0.6 * (0.55 + 0.45 * e.z);
      e.x += Math.cos(e.heading) * sp * dt; e.y += Math.sin(e.heading) * sp * dt;
      e.phase += dt * A.phaseRate * e.rateMul * (1 + e.scared * 1.6) * (0.55 + 0.45 * Math.min(boost, 2) / 2);
      const m = (A.radius + 0.5) * e.k * R.cell;   // wrap just past the body's edge, re-entering anywhere along the far side
      if (e.x < -m) { e.x = R.W + m; e.y = rand(0, R.H); } else if (e.x > R.W + m) { e.x = -m; e.y = rand(0, R.H); }
      if (e.y < -m) { e.y = R.H + m; e.x = rand(0, R.W); } else if (e.y > R.H + m) { e.y = -m; e.x = rand(0, R.W); }
      emitTrail(e);
    }
    for (const tr of trails) tr.life -= dt / 1.6;
    keep(trails, tr => tr.life > 0);
    keep(ripples, r => t - r.t0 < r.dur);
  }

  function wander(e, t) {
    if (species === 'jelly') e.target = -Math.PI / 2 + rand(-0.35, 0.35) + 0.18 * Math.sin(t * 0.4 + e.seed * 3);
    else if (species === 'cranes') e.target = FLIGHT + e.baseOff * 0.13 + 0.08 * Math.sin(t * 0.5 + e.seed * 2);
    else e.target = e.heading + rand(-1, 1) * Math.PI * 0.9;
    e.retargetAt = t + (species === 'cranes' ? rand(0.8, 1.6) : rand(2.5, 6));
  }

  // Boids-style separation: the heading to steer for this frame (e.target itself is left alone, so the push stays soft).
  function separate(e, weight) {
    const minD = 165 * R.dpr * (R.W / R.dpr < 640 ? 0.72 : 1);
    let sx = 0, sy = 0;
    for (const o of animals) {
      if (o === e) continue;
      const dx = e.x - o.x, dy = e.y - o.y, d = Math.hypot(dx, dy);
      if (d > 0 && d < minD) { const f = (1 - d / minD) / d; sx += dx * f; sy += dy * f; }
    }
    if (!sx && !sy) return e.target;
    const w = 1.6 * weight;
    return Math.atan2(Math.sin(e.target) + sy * w, Math.cos(e.target) + sx * w);
  }

  function emitTrail(e) {
    const A = e.kind, u = A.trail.at, ang = e.heading;
    const i = Math.floor((e.x + Math.cos(ang) * u * e.k * R.cell) / R.cell), j = Math.floor((e.y + Math.sin(ang) * u * e.k * R.cell) / R.cell);
    const id = j * R.cols + i;
    if (id === e.lastCell || Math.random() < 0.25) return;
    e.lastCell = id;
    trails.push({ i, j, ch: A.trail.chars[(Math.random() * A.trail.chars.length) | 0], life: lerp(0.35, 0.9, e.z), color: A.trail.color });
    if (trails.length > 500) trails.shift();
  }

  // ---- interaction ----
  function dropFood(x, y) {
    const n = 6 + ((Math.random() * 4) | 0);
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), r = Math.sqrt(Math.random()) * 2.6 * R.cell, s = rand(0.3, 1.2) * R.cell;
      foods.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, vx: Math.cos(a) * s, vy: Math.sin(a) * s, age: 0, life: rand(14, 18), tint: rand(0.85, 1.12) });
    }
    if (foods.length > 60) foods.splice(0, foods.length - 60);
    ripples.push({ x, y, t0: simTime, dur: 1.3, maxR: 7, chars: '~', color: [150, 185, 220] });
  }

  function startle(x, y) {
    for (const e of animals) {
      const lim = 220 * R.dpr + e.kind.radius * e.k * R.cell, d = Math.hypot(e.x - x, e.y - y);
      if (d >= lim) continue;
      e.scared = Math.max(e.scared, 0.45 + 0.55 * (1 - d / lim));
      e.sx = (e.x - x) / (d || 1); e.sy = (e.y - y) / (d || 1);
      e.phase = Math.floor(e.phase / TAU) * TAU + TAU + 0.1;   // start a fresh contraction
    }
    ripples.push({ x, y, t0: simTime, dur: 1.1, maxR: 6, chars: '°', color: [220, 140, 220] });
  }

  // ---- rendering ----
  const glyphs = [];
  function render() {
    const { cols, rows, cell } = R, data = R.img.data;
    data.fill(0);
    glyphs.length = 0;
    tick = (simTime * 5) | 0;
    for (const e of animals) rasterize(e, data);
    for (const f of foods) {   // pellets: one solid cell each, above the koi
      const i = Math.floor(f.x / cell), j = Math.floor(f.y / cell);
      if (i < 0 || j < 0 || i >= cols || j >= rows) continue;
      const a = clamp(f.age / 0.18, 0, 1) * clamp((f.life - f.age) / 2.5, 0, 1), p = (j * cols + i) * 4;
      data[p] = FOOD[0] * f.tint; data[p + 1] = FOOD[1] * f.tint; data[p + 2] = FOOD[2] * f.tint; data[p + 3] = 255 * a;
    }
    loCtx.putImageData(R.img, 0, 0);
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, R.W, R.H);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(R.lo, 0, 0, cols * cell, rows * cell);
    const covered = (i, j) => i >= 0 && j >= 0 && i < cols && j < rows && data[(j * cols + i) * 4 + 3] > 128;
    for (const tr of trails) if (!covered(tr.i, tr.j)) text(tr.ch, tr.i, tr.j, tr.color, tr.life * 0.55);
    for (const g of glyphs) if (!covered(g.i, g.j)) text(g.ch, g.i, g.j, g.c, g.a);
    for (const r of ripples) {
      const p = (simTime - r.t0) / r.dur, rad = 0.6 + r.maxR * (1 - Math.pow(1 - p, 2.2)), a = Math.pow(1 - p, 1.3) * 0.8;
      const n = Math.max(8, Math.ceil(TAU * rad * 1.15)), seen = new Set();
      for (let s = 0; s < n; s++) {
        const i = Math.floor(r.x / cell + Math.cos(s / n * TAU) * rad), j = Math.floor(r.y / cell + Math.sin(s / n * TAU) * rad);
        const id = j * cols + i;
        if (!seen.has(id)) { seen.add(id); text(r.chars, i, j, r.color, a); }
      }
    }
    if (!canvas.classList.contains('ready')) canvas.classList.add('ready');
    frames++;
    status.mode = species; status.frames = frames;
  }

  // Glyph atlas: each character/colour pair is drawn once to a small canvas and then stamped with drawImage and a
  // per-glyph globalAlpha, which is far cheaper than shaping text with fillText for every cell on every frame.
  // Bounded: about 15 characters x 12 colours. Cleared when the font size changes (resize) or the font loads.
  const rgb = new WeakMap(), atlas = new Map();
  function text(ch, i, j, c, a) {
    let css = rgb.get(c);
    if (!css) { css = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`; rgb.set(c, css); }
    const key = ch + css;
    let g = atlas.get(key);
    if (!g) {
      g = document.createElement('canvas');
      g.width = g.height = Math.ceil(R.cell * 1.5);
      const x = g.getContext('2d');
      x.font = R.font; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = css;
      x.fillText(ch, g.width / 2, g.height / 2);
      atlas.set(key, g);
    }
    ctx.globalAlpha = a;
    ctx.drawImage(g, i * R.cell + (R.cell - g.width) / 2, j * R.cell + (R.cell - g.height) / 2);
  }

  function rasterize(e, data) {
    const A = e.kind, k = e.k, cs = Math.cos(e.heading) / k, sn = Math.sin(e.heading) / k;
    const cx = e.x / R.cell, cy = e.y / R.cell, rad = (A.radius + 1) * k;
    const dim = lerp(0.55, 1, e.z) * e.fade;
    const i0 = Math.max(0, Math.floor(cx - rad)), i1 = Math.min(R.cols - 1, Math.ceil(cx + rad));
    const j0 = Math.max(0, Math.floor(cy - rad)), j1 = Math.min(R.rows - 1, Math.ceil(cy + rad));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const dx = i + 0.5 - cx, dy = j + 0.5 - cy;
      ci = i; cj = j;
      const h = A.sample(dx * cs + dy * sn, -dx * sn + dy * cs, e);   // k already includes the kind's scale
      if (!h) continue;
      if (h.glyph) { glyphs.push({ ch: h.glyph, i, j, c: h.c, a: h.a * dim }); continue; }
      const p = (j * R.cols + i) * 4, a = h.a * dim, da = data[p + 3] / 255, oa = a + da * (1 - a);
      if (oa <= 0) continue;
      for (let q = 0; q < 3; q++) data[p + q] = (Math.min(255, h.c[q] * h.b) * a + data[p + q] * da * (1 - a)) / oa;
      data[p + 3] = oa * 255;
    }
  }

  // ---- loop and controls ----
  const running = () => !document.hidden && onScreen && !still.matches;
  function frame(now) {
    raf = 0;
    if (!running()) return;
    const dt = last ? clamp((now - last) / 1000, 0, 0.05) : 0.016;
    last = now;
    step(dt); render();
    raf = requestAnimationFrame(frame);
  }
  const start = () => { if (!raf && running()) { last = 0; raf = requestAnimationFrame(frame); } };
  const stopLoop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
  const drawStill = () => { if (R.W) { for (const e of animals) e.fade = 1; step(0); render(); } };

  // one animal per page load, never the same as last time; ?hero=koi|jelly|cranes forces one (not saved)
  let pick = (/[?&]hero=(\w+)/.exec(location.search) || [])[1];
  if (!ANIMALS.includes(pick)) {
    let prev = null;
    try { prev = localStorage.getItem(KEY); } catch (err) { /* storage blocked: any animal */ }
    const choices = ANIMALS.filter(a => a !== prev);
    pick = choices[(Math.random() * choices.length) | 0];
    try { localStorage.setItem(KEY, pick); localStorage.removeItem('hero-scene'); } catch (err) { /* storage blocked: no memory of the last animal */ }   // hero-scene: retired switcher key
  }

  let ready = false;
  function init() {   // runs the first time the canvas has a size (normally at once)
    ready = true;
    populate(pick);
    if (running()) start(); else drawStill();
  }
  const onResize = () => { if (!resize()) return; if (!ready) init(); else if (!running()) drawStill(); };
  (function watchDensity() {   // moving to a screen with another pixel density re-sizes the buffer
    const mq = matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    mq.addEventListener('change', () => { onResize(); watchDensity(); }, { once: true });
  })();
  new ResizeObserver(onResize).observe(canvas);
  onResize();

  // Clicks anywhere over the canvas (it spans the full width) feed or startle, except on controls, text and the card.
  document.addEventListener('pointerdown', ev => {
    if (!ready || ev.button !== 0 || !running()) return;
    if (ev.target.closest('header, a, button, input, select, textarea, label, summary, .focus, .lede, #intro-h')) return;
    const r = canvas.getBoundingClientRect();
    if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) return;
    const x = (ev.clientX - r.left) * R.dpr, y = (ev.clientY - r.top) * R.dpr;
    if (species === 'koi') dropFood(x, y); else startle(x, y);
  });
  new IntersectionObserver(es => { onScreen = es[0].isIntersecting; if (running()) start(); else stopLoop(); }).observe(hero);
  document.addEventListener('visibilitychange', () => { if (running()) start(); else stopLoop(); });
  still.addEventListener('change', () => { if (running()) start(); else { stopLoop(); drawStill(); } });
  if (document.fonts) document.fonts.ready.then(() => { atlas.clear(); if (ready && !running()) drawStill(); });
})();
