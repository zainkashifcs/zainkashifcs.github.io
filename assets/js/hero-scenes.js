// Two more hero scenes, registered for hero.js as window.HeroScenes.<name> = env => (t) => void.
// Same language as the other scenes: thin marks drawn from the CSS colour tokens (env.col), faint most of the time, amber
// only as a thin, brief line where something is being decided. Each run is computed once, up front, with the real algorithm; the frame
// function only replays it. Nothing is allocated per frame except a few paths. hero.js applies the fade that keeps the
// centred headline readable.
(() => {
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const smooth = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };       // slow in, slow out
  const sine = x => .5 - .5 * Math.cos(Math.PI * clamp(x, 0, 1));
  // one run = fade in, play, fade out; the next run is planned the moment this one is gone
  const envelope = (local, cycle) => smooth(local / .9) * (1 - smooth((local - (cycle - 1.1)) / 1.1));

  /* Search grid: breadth-first search on a sparse wall grid. A thin amber wavefront leaves the cell nearest the cursor
     (a drifting point without a fine pointer), visited cells keep a faint tint, and the shortest path to a far target
     traces at the end. Then a pause, and a new layout. */
  const grid = env => {
    const { ctx, rgba, P } = env;
    const cell = env.W < 700 ? 18 : 22, cols = Math.ceil(env.W / cell), rows = Math.ceil(env.H / cell), n = cols * rows;
    const SPREAD = 6.4, TRACE = 1.7, CYCLE = SPREAD + TRACE + 2.4 + 1.1, STILL_AT = 4.6;
    let run = null, born = 0;

    const plan = () => {
      const wall = new Uint8Array(n);
      for (let s = 0, m = Math.round(n * .017); s < m; s++) { // short wall segments: sparse, never a maze
        const horiz = Math.random() < .5, len = 3 + Math.floor(Math.random() * 7);
        let c = Math.floor(Math.random() * cols), r = Math.floor(Math.random() * rows);
        for (let k = 0; k < len && c < cols && r < rows; k++) { wall[r * cols + c] = 1; horiz ? c++ : r++; }
      }
      // from the cursor when it is over the hero; otherwise from a spot in a side margin, where the fade lets the search show
      const side = Math.random() < .5 ? .1 : .9, sx = P.k > .3 ? P.x : env.W * (side + (Math.random() - .5) * .1), sy = P.k > .3 ? P.y : env.H * (.2 + Math.random() * .45);
      const src = clamp(Math.floor(sy / cell), 0, rows - 1) * cols + clamp(Math.floor(sx / cell), 0, cols - 1);
      wall[src] = 0;
      const dist = new Int16Array(n).fill(-1), from = new Int32Array(n).fill(-1), order = new Int32Array(n), rot = Math.floor(Math.random() * 4);
      let head = 0, tail = 0; order[tail++] = src; dist[src] = 0;
      while (head < tail) {
        const a = order[head++], c = a % cols, d = dist[a] + 1;
        const nb = [c < cols - 1 ? a + 1 : -1, c > 0 ? a - 1 : -1, a + cols < n ? a + cols : -1, a >= cols ? a - cols : -1];
        for (let j = 0; j < 4; j++) { const b = nb[(j + rot) & 3]; if (b >= 0 && !wall[b] && dist[b] < 0) { dist[b] = d; from[b] = a; order[tail++] = b; } }
      }
      const maxD = dist[order[tail - 1]], upTo = new Int32Array(maxD + 2); // upTo[d] = cells nearer than d steps
      for (let i = 0; i < tail; i++) upTo[dist[order[i]] + 1]++;
      for (let d = 1; d <= maxD + 1; d++) upTo[d] += upTo[d - 1];
      const lo = upTo[Math.floor(maxD * .8)], tgt = order[lo + Math.floor(Math.random() * (tail - lo))]; // somewhere far away
      const cells = []; for (let c = tgt; c >= 0; c = from[c]) cells.push(c);
      const path = cells.reverse().map(c => [(c % cols + .5) * cell, (Math.floor(c / cols) + .5) * cell]);
      const walls = []; for (let i = 0; i < n; i++) if (wall[i]) walls.push(i);
      return { order, upTo, maxD, path, walls, count: tail };
    };

    const draw = local => {
      const { col } = env, g = envelope(local, CYCLE), q = run;
      const dotsIn = (style, a, b) => { // a 1.5px dot at the centre of each cell in a run of the visit order
        if (b <= a) return;
        ctx.fillStyle = style; ctx.beginPath();
        for (let i = a; i < b; i++) { const c = q.order[i]; ctx.rect((c % cols) * cell + cell / 2 - .75, Math.floor(c / cols) * cell + cell / 2 - .75, 1.5, 1.5); }
        ctx.fill();
      };
      const ringIn = (style, a, b) => { // hairline outlines: the wavefront, never a filled block
        if (b <= a) return;
        ctx.strokeStyle = style; ctx.lineWidth = 1; ctx.beginPath();
        for (let i = a; i < b; i++) { const c = q.order[i]; ctx.rect((c % cols) * cell + 4.5, Math.floor(c / cols) * cell + 4.5, cell - 9, cell - 9); }
        ctx.stroke();
      };
      const lim = d => q.upTo[clamp(d, 0, q.maxD + 1)];
      const p = clamp(local / SPREAD, 0, 1), f = Math.floor((q.maxD + 8) * (p * .8 + smooth(p) * .2));

      ctx.strokeStyle = rgba(col.line, col.a * g * .45); ctx.lineWidth = 1; ctx.beginPath(); // the walls: small hairline squares
      for (const c of q.walls) ctx.rect((c % cols) * cell + 6.5, Math.floor(c / cols) * cell + 6.5, cell - 13, cell - 13);
      ctx.stroke();
      dotsIn(rgba(col.line, col.a * g * .9), 0, lim(f - 2));         // visited: a dot that stays
      ringIn(rgba(col.line, col.a * g * .8), lim(f - 2), lim(f - 1)); // just behind the front: zinc
      ringIn(rgba(col.hi, col.a * g * .9), lim(f - 1), lim(f + 1));   // the front itself: a thin amber ring

      if (!q.path.length) return; // a zero-size canvas plans no path
      const [sx, sy] = q.path[0];
      ctx.fillStyle = rgba(col.dot, col.a * g); ctx.beginPath(); ctx.arc(sx, sy, 2.2, 0, 6.2832); ctx.fill();
      const tr = sine((local - SPREAD) / TRACE), lit = local < SPREAD + TRACE + .6; // the shortest path: amber while it draws, then zinc
      if (tr > 0 && q.path.length > 1) {
        const at = tr * (q.path.length - 1), whole = Math.floor(at), frac = at - whole;
        ctx.strokeStyle = rgba(lit ? col.hi : col.line, col.a * g); ctx.lineWidth = 1.25; ctx.lineJoin = ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sx, sy);
        for (let i = 1; i <= whole; i++) ctx.lineTo(q.path[i][0], q.path[i][1]);
        if (whole < q.path.length - 1) ctx.lineTo(q.path[whole][0] + (q.path[whole + 1][0] - q.path[whole][0]) * frac, q.path[whole][1] + (q.path[whole + 1][1] - q.path[whole][1]) * frac);
        ctx.stroke();
        const [tx, ty] = q.path[q.path.length - 1];
        ctx.lineWidth = 1; ctx.strokeStyle = rgba(col.line, col.a * g * tr); ctx.beginPath(); ctx.arc(tx, ty, 3 + 4 * tr, 0, 6.2832); ctx.stroke();
      }
    };
    return t => {
      if (env.still) { run = run || plan(); return draw(STILL_AT); }
      if (!run || t - born >= CYCLE) { run = plan(); born = t; }
      draw(t - born);
    };
  };

  /* Merge sort: thin bars, a bottom-up merge sort replayed step by step. The two bars being compared turn amber, the
     runs merged in the current pass dim, and the cursor gently lifts the bars near it. A sweep confirms the order. */
  const sort = env => {
    const { ctx, rgba, P } = env;
    const n = clamp(Math.floor(env.W / (env.W < 700 ? 9 : 10)), 24, 150), pitch = env.W / n, barW = Math.max(2, pitch * .34);
    const INTRO = .9, SORT = 8.2, SWEEP = 1.5, CYCLE = INTRO + SORT + SWEEP + 1.8 + 1.1;
    const cy = env.H * .4, maxH = env.H * .6;
    let run = null, born = 0;

    const plan = () => {
      const start = Int16Array.from({ length: n }, (_, i) => i + 1);
      for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)), x = start[i]; start[i] = start[j]; start[j] = x; }
      let cur = start.slice(), nxt = new Int16Array(n);
      const steps = new Int16Array(n * Math.ceil(Math.log2(n)) * 7); let s = 0; // pass, lo, hi, left head, right head, write position, value
      for (let w = 1, pass = 0; w < n; w *= 2, pass++) {
        for (let lo = 0; lo < n; lo += 2 * w) {
          const mid = Math.min(lo + w, n), hi = Math.min(lo + 2 * w, n);
          for (let k = lo, i = lo, j = mid; k < hi; k++) {
            const left = j >= hi || (i < mid && cur[i] <= cur[j]), v = left ? cur[i] : cur[j];
            steps.set([pass, lo, hi, i < mid ? i : -1, j < hi ? j : -1, k, v], s); s += 7; nxt[k] = v;
            left ? i++ : j++;
          }
        }
        [cur, nxt] = [nxt, cur];
      }
      return { steps, total: s / 7, arr: start.slice(), disp: new Float32Array(n), mark: new Uint8Array(n), cls: new Uint8Array(n), done: 0, pass: -1, a: -1, b: -1, k: -1 };
    };
    const advance = (q, to) => { // monotonic: each step is applied once
      for (; q.done < to; q.done++) {
        const o = q.done * 7, S = q.steps;
        if (S[o] !== q.pass) { q.pass = S[o]; q.mark.fill(0); }
        q.arr[S[o + 5]] = S[o + 6]; q.mark[S[o + 5]] = 1; q.a = S[o + 3]; q.b = S[o + 4]; q.k = S[o + 5];
      }
    };

    const draw = local => {
      const { col } = env, g = envelope(local, CYCLE), q = run, sortEnd = INTRO + SORT;
      const lin = clamp((local - INTRO) / SORT, 0, 1);
      advance(q, env.still ? Math.floor(q.total * .58) : Math.floor(q.total * (lin * .7 + sine(lin) * .3)));
      const finished = q.done >= q.total, sweep = finished ? (local - sortEnd) / SWEEP * (n + 10) : -1;
      const ease = env.still ? 1 : 1 - Math.exp(-env.dt * 11), cls = q.cls; // 0 plain, 1 dim, 2 hot, 3 afterglow
      for (let i = 0; i < n; i++) {
        const grow = env.still ? 1 : smooth((local - i / n * .5) / .5); // bars rise left to right as a run begins
        q.disp[i] += (q.arr[i] * grow / n - q.disp[i]) * ease;
        cls[i] = finished ? (sweep < i ? 1 : sweep - i < 3 ? 2 : sweep - i < 7 ? 3 : 0) : i === q.a || i === q.b ? 2 : i <= q.k && i > q.k - 4 ? 3 : q.mark[i] ? 1 : 0; // the last few writes trail behind the head
      }
      ctx.lineCap = 'butt';
      [[col.line, .62, 0, 1], [col.line, .26, 1, 1], [col.hi, .9, 2, 1], [col.line, .95, 3, 1]].forEach(([c, al, kind, wide]) => {
        ctx.strokeStyle = rgba(c, col.a * g * al); ctx.lineWidth = barW * wide; ctx.beginPath();
        for (let i = 0; i < n; i++) {
          if (cls[i] !== kind) continue;
          const x = (i + .5) * pitch, dx = x - P.x, h = q.disp[i] * maxH * (1 + .5 * P.k * Math.exp(-dx * dx / 14450)) * .5; // the cursor lifts nearby bars
          ctx.moveTo(x, cy - h); ctx.lineTo(x, cy + h);
        }
        ctx.stroke();
      });
    };
    return t => {
      if (env.still) { run = run || plan(); return draw(INTRO + SORT * .6); }
      if (!run || t - born >= CYCLE) { run = plan(); born = t; }
      draw(t - born);
    };
  };

  window.HeroScenes = Object.assign(window.HeroScenes || {}, { grid, sort });
})();
