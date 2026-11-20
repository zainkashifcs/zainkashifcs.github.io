// Interactive dry-runs on problem pages (_includes/visualizer.html, picked by _data/visualizers.json).
// One small player (play/pause, step, reset, timeline, 1x/2x) drives a demo module. A demo has `code` (the key lines),
// `setup(api)` that builds its inputs and drawing, `build()` that turns the current inputs into steps
// ({ line, text, ...state }) and `draw(step)`. The player highlights the step's line and announces its text.
// No autoplay; under prefers-reduced-motion steps jump without tweening (the CSS transitions are off).
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.append(e);
    return e;
  };
  const htmlEl = (tag, attrs = {}, parent, text) => {
    const e = document.createElement(tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    if (parent) parent.append(e);
    return e;
  };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const still = matchMedia('(prefers-reduced-motion: reduce)');

  // A labelled range slider with its value shown next to it; calls onInput with the new number.
  function slider(parent, label, min, max, value, onInput) {
    const wrap = htmlEl('label', { class: 'viz-field' }, parent);
    htmlEl('span', {}, wrap, label);
    const input = htmlEl('input', { type: 'range', min, max, value, step: 1 }, wrap);
    const out = htmlEl('output', {}, wrap, String(value));
    input.addEventListener('input', () => { out.textContent = input.value; onInput(Number(input.value)); });
    return input;
  }

  const DEMOS = {
    // 1A Theatre Square: an n x m plaza (n rows down, m across) covered by a x a flagstones.
    'theatre-square': {
      code: [
        'cin >> n >> m >> a;',
        'long long tilesN = n / a + (n % a != 0);',
        'long long tilesM = m / a + (m % a != 0);',
        '// lay tilesN rows of tilesM flagstones',
        'cout << tilesN * tilesM;',
      ],
      setup(api) {
        const p = { n: 6, m: 6, a: 4 };
        slider(api.inputs, 'n', 1, 12, p.n, v => { p.n = v; api.rebuild(); });
        slider(api.inputs, 'm', 1, 12, p.m, v => { p.m = v; api.rebuild(); });
        slider(api.inputs, 'a', 1, 6, p.a, v => { p.a = v; api.rebuild(); });
        const svg = svgEl('svg', { class: 'viz-svg', role: 'img', 'aria-label': 'Plaza and flagstones' }, api.canvas);
        const up = (x, a) => Math.floor(x / a) + (x % a !== 0 ? 1 : 0);
        return {
          build() {
            const { n, m, a } = p, rows = up(n, a), cols = up(m, a), steps = [];
            steps.push({ line: 0, text: `Plaza ${n} × ${m}, flagstones ${a} × ${a}.`, laid: 0, guide: 0 });
            const why = (x, t) => x % a ? `${x} / ${a} = ${Math.floor(x / a)} remainder ${x % a}, so round up to ${t}` : `${x} / ${a} = ${t} exactly`;
            steps.push({ line: 1, text: `Down the n side: ${why(n, rows)}.`, laid: 0, guide: 1 });
            steps.push({ line: 2, text: `Across the m side: ${why(m, cols)}.`, laid: 0, guide: 2 });
            for (let r = 1; r <= rows; r++) steps.push({ line: 3, text: `Row ${r} of ${rows}: ${cols} flagstone${cols === 1 ? '' : 's'}, ${r * cols} so far.`, laid: r, guide: 2 });
            const over = rows * a > n || cols * a > m;
            steps.push({ line: 4, text: `Answer: ${rows} × ${cols} = ${rows * cols}${over ? '; the hatched strip hangs over the edge' : '; nothing hangs over'}.`, laid: rows, guide: 2, done: true });
            return steps;
          },
          draw(s) {
            const { n, m, a } = p, rows = up(n, a), cols = up(m, a);
            const W = Math.max(m, cols * a), H = Math.max(n, rows * a);
            svg.setAttribute('viewBox', `-0.6 -0.6 ${W + 1.2} ${H + 1.2}`);
            svg.replaceChildren();
            const defs = svgEl('defs', {}, svg);
            const pat = svgEl('pattern', { id: 'viz-hatch', width: 0.35, height: 0.35, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
            svgEl('line', { x1: 0, y1: 0, x2: 0, y2: 0.35, class: 'viz-hatch-line' }, pat);
            for (let y = 0; y < n; y++) for (let x = 0; x < m; x++) svgEl('rect', { x, y, width: 1, height: 1, class: 'viz-cell' }, svg);
            for (let r = 0; r < s.laid; r++) for (let c = 0; c < cols; c++) {
              svgEl('rect', { x: c * a + 0.08, y: r * a + 0.08, width: a - 0.16, height: a - 0.16, rx: 0.12, class: `viz-stone${r === s.laid - 1 && !s.done ? ' viz-new' : ''}` }, svg);
            }
            if (s.done) {   // the part of the flagstones outside the plaza
              if (cols * a > m) svgEl('rect', { x: m, y: 0, width: cols * a - m, height: rows * a, fill: 'url(#viz-hatch)', class: 'viz-over' }, svg);
              if (rows * a > n) svgEl('rect', { x: 0, y: n, width: Math.min(m, cols * a), height: rows * a - n, fill: 'url(#viz-hatch)', class: 'viz-over' }, svg);
            }
            svgEl('rect', { x: 0, y: 0, width: m, height: n, class: 'viz-plaza' }, svg);
            if (s.guide >= 1) for (let r = 1; r < rows; r++) svgEl('line', { x1: -0.4, x2: 0, y1: r * a, y2: r * a, class: 'viz-guide' }, svg);
            if (s.guide >= 2) for (let c = 1; c < cols; c++) svgEl('line', { x1: c * a, x2: c * a, y1: -0.4, y2: 0, class: 'viz-guide' }, svg);
          },
        };
      },
    },

    // 263A Beautiful Matrix: move the single 1 to the centre of a 5 x 5 grid with neighbouring row/column swaps.
    'beautiful-matrix': {
      code: [
        'for i, j in 0..4: if (a[i][j] == 1) r = i, c = j;',
        '// swap neighbouring rows: |r - 2| moves',
        '// swap neighbouring columns: |c - 2| moves',
        'cout << abs(r - 2) + abs(c - 2);',
      ],
      setup(api) {
        const start = { r: 0, c: 0 };
        const grid = htmlEl('div', { class: 'viz-matrix', role: 'group', 'aria-label': 'Five by five matrix: choose a cell to start the 1 there; arrow keys move between cells' }, api.canvas);
        const cells = [];
        for (let r = 0; r < 5; r++) {
          const row = htmlEl('div', { class: 'viz-mrow' }, grid);
          for (let c = 0; c < 5; c++) {
            const b = htmlEl('button', { type: 'button', class: 'viz-mcell', tabindex: '-1', 'aria-pressed': 'false' }, row, '0');
            b.addEventListener('click', () => { start.r = r; start.c = c; api.rebuild(); focusCell(r, c); });
            cells.push(b);
          }
        }
        let focusAt = 0;
        const focusCell = (r, c) => { cells[focusAt].tabIndex = -1; focusAt = r * 5 + c; cells[focusAt].tabIndex = 0; cells[focusAt].focus(); };
        cells[0].tabIndex = 0;
        // arrow keys move between cells only while a cell has focus (one tab stop for the whole grid)
        grid.addEventListener('keydown', e => {
          const d = { ArrowUp: -5, ArrowDown: 5, ArrowLeft: -1, ArrowRight: 1 }[e.key];
          if (d == null) return;
          const r = Math.floor(focusAt / 5), c = focusAt % 5;
          const nr = clamp(r + (Math.abs(d) === 5 ? Math.sign(d) : 0), 0, 4), nc = clamp(c + (Math.abs(d) === 1 ? d : 0), 0, 4);
          e.preventDefault(); focusCell(nr, nc);
        });
        return {
          build() {
            let { r, c } = start, moves = 0;
            const steps = [{ line: 0, text: `The 1 is at (${r}, ${c}); the centre is (2, 2).`, r, c, moves, hl: null }];
            while (r !== 2) { const nr = r + Math.sign(2 - r); moves++; steps.push({ line: 1, text: `Swap rows ${r} and ${nr}: the 1 moves to (${nr}, ${c}). Moves = ${moves}.`, r: nr, c, moves, hl: ['row', r, nr] }); r = nr; }
            while (c !== 2) { const nc = c + Math.sign(2 - c); moves++; steps.push({ line: 2, text: `Swap columns ${c} and ${nc}: the 1 moves to (${r}, ${nc}). Moves = ${moves}.`, r, c: nc, moves, hl: ['col', c, nc] }); c = nc; }
            steps.push({ line: 3, text: `Answer: |${start.r} − 2| + |${start.c} − 2| = ${moves} move${moves === 1 ? '' : 's'}.`, r, c, moves, hl: null, done: true });
            return steps;
          },
          draw(s) {
            cells.forEach((b, k) => {
              const r = Math.floor(k / 5), c = k % 5, one = r === s.r && c === s.c;
              b.textContent = one ? '1' : '0';
              b.setAttribute('aria-label', `Row ${r}, column ${c}: ${one ? 1 : 0}`);
              b.setAttribute('aria-pressed', String(r === start.r && c === start.c));
              b.classList.toggle('is-one', one);
              b.classList.toggle('is-centre', r === 2 && c === 2);
              b.classList.toggle('is-swap', !!s.hl && (s.hl[0] === 'row' ? (r === s.hl[1] || r === s.hl[2]) : (c === s.hl[1] || c === s.hl[2])));
            });
          },
        };
      },
    },

    // 405A Gravity Flip: gravity turns to the right, every layer of cubes slides to the right wall = the columns sorted.
    'gravity-flip': {
      code: [
        'cin >> n; for (int &x : a) cin >> x;',
        '// gravity pulls right: each layer slides to the right wall',
        'sort(a.begin(), a.end());',
        'for (int x : a) cout << x << " ";',
      ],
      setup(api) {
        let cols = [3, 2, 1, 2];
        const shuffle = htmlEl('button', { type: 'button', class: 'glass-chip glass-chip--interactive viz-btn viz-text-btn' }, api.inputs, 'Shuffle columns');
        shuffle.addEventListener('click', () => {
          const n = 4 + Math.floor(Math.random() * 3);
          cols = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 5));
          api.rebuild();
        });
        const svg = svgEl('svg', { class: 'viz-svg', role: 'img', 'aria-label': 'Columns of cubes' }, api.canvas);
        let cubes = [];
        // where each cube sits once the layers in `moved` have slid right
        const place = (moved) => {
          const n = cols.length, out = [];
          const top = Math.max(...cols);
          for (let L = 1; L <= top; L++) {
            const at = cols.map((h, j) => (h >= L ? j : -1)).filter(j => j >= 0);
            at.forEach((j, rank) => out.push({ id: `${j}-${L}`, x: moved.has(L) ? n - at.length + rank : j, L }));
          }
          return out;
        };
        return {
          build() {
            const top = Math.max(...cols), moved = new Set(), steps = [];
            steps.push({ line: 0, text: `Columns ${cols.join(' ')}. Gravity is about to switch to the right.`, pos: place(moved) });
            for (let L = top; L >= 1; L--) {
              moved.add(L);
              const at = cols.map((h, j) => (h >= L ? j : -1)).filter(j => j >= 0);
              const k = at.filter((j, rank) => j !== cols.length - at.length + rank).length;   // cubes that actually move
              steps.push({ line: 1, text: k ? `Layer ${L}: ${k} cube${k === 1 ? '' : 's'} slide${k === 1 ? 's' : ''} to the right wall.` : `Layer ${L}: already against the right wall.`, pos: place(moved) });
            }
            const sorted = [...cols].sort((x, y) => x - y);
            steps.push({ line: 2, text: `That is the columns sorted: ${sorted.join(' ')}.`, pos: place(moved) });
            steps.push({ line: 3, text: `Output: ${sorted.join(' ')}`, pos: place(moved), done: true });
            // fresh cube elements for these columns
            const n = cols.length;
            svg.setAttribute('viewBox', `-0.3 -0.3 ${n + 0.6} ${top + 0.6}`);
            svg.replaceChildren();
            svgEl('line', { x1: n, x2: n, y1: 0, y2: top, class: 'viz-wall' }, svg);
            svgEl('line', { x1: 0, x2: n, y1: top, y2: top, class: 'viz-floor' }, svg);
            cubes = steps[0].pos.map(c => ({ ...c, el: svgEl('rect', { x: 0.06, y: 0.06, width: 0.88, height: 0.88, rx: 0.1, class: 'viz-cube' }, svg) }));
            this.top = top;
            return steps;
          },
          draw(s) {
            const byId = new Map(s.pos.map(c => [c.id, c]));
            for (const c of cubes) {
              const p = byId.get(c.id);
              c.el.style.transform = `translate(${p.x}px, ${this.top - p.L}px)`;
              c.el.classList.toggle('is-moved', p.x !== Number(c.id.split('-')[0]));
            }
          },
        };
      },
    },

    // 1791D Distinct Split: f(x) = distinct letters in x; maximise f(a) + f(b) over every split of s into non-empty a, b.
    'distinct-split': {
      code: [
        'for i in 0..n-1: pre[i+1] = pre[i] + (s[i] not seen before);',
        'for i in n-1..0: suf[i] = suf[i+1] + (s[i] not seen after);',
        'for i in 1..n-1: best = max(best, pre[i] + suf[i]);',
        'cout << best;',
      ],
      setup(api) {
        let s = 'abacaba';
        const box = htmlEl('div', { class: 'viz-field viz-field-wide' }, api.inputs);
        const wrap = htmlEl('label', { class: 'viz-field' }, box);
        htmlEl('span', {}, wrap, 's');
        const input = htmlEl('input', { type: 'text', value: s, maxlength: 16, spellcheck: 'false', autocomplete: 'off', 'aria-describedby': 'viz-s-hint' }, wrap);
        const hint = htmlEl('small', { id: 'viz-s-hint' }, box, '2 to 16 lowercase letters');
        input.addEventListener('input', () => {
          const raw = input.value, v = raw.toLowerCase().replace(/[^a-z]/g, '').slice(0, 16);
          if (v !== raw) { const pos = Math.max(0, (input.selectionStart || 0) - (raw.length - v.length)); input.value = v; input.setSelectionRange(pos, pos); }
          const ok = v.length >= 2;
          input.setAttribute('aria-invalid', String(!ok));
          hint.textContent = ok ? '2 to 16 lowercase letters' : 'Type at least 2 letters; the run below still shows the last word.';
          if (ok) { s = v; api.rebuild(); }
        });
        const word = htmlEl('div', { class: 'viz-word', 'aria-hidden': 'true' }, api.canvas);
        const chart = svgEl('svg', { class: 'viz-svg viz-chart', 'aria-hidden': 'true' }, api.canvas);
        return {
          build() {
            const n = s.length, pre = [0], suf = Array(n + 1).fill(0);
            const seen = new Set();
            for (let i = 0; i < n; i++) { pre.push(pre[i] + (seen.has(s[i]) ? 0 : 1)); seen.add(s[i]); }
            seen.clear();
            for (let i = n - 1; i >= 0; i--) { suf[i] = suf[i + 1] + (seen.has(s[i]) ? 0 : 1); seen.add(s[i]); }
            let best = 0, at = 1;
            for (let i = 1; i < n; i++) if (pre[i] + suf[i] > best) { best = pre[i] + suf[i]; at = i; }
            this.data = { n, pre, suf, best, at };
            const steps = [
              { line: 0, text: `Distinct letters from the left: pre = ${pre.slice(1).join(' ')}.`, i: 0 },
              { line: 1, text: `Distinct letters from the right: suf = ${suf.slice(0, n).join(' ')}.`, i: 0 },
            ];
            for (let i = 1; i < n; i++) steps.push({ line: 2, i, text: `Split at ${i}: "${s.slice(0, i)}" | "${s.slice(i)}" gives ${pre[i]} + ${suf[i]} = ${pre[i] + suf[i]}.` });
            steps.push({ line: 3, i: at, text: `Answer: ${best}, first reached by splitting at ${at} ("${s.slice(0, at)}" | "${s.slice(at)}").`, done: true });
            // the word: one cell per letter
            word.replaceChildren();
            [...s].forEach(ch => htmlEl('span', { class: 'viz-ch' }, word, ch));
            // the chart: one bar per split
            const { pre: P, suf: S } = this.data;
            chart.setAttribute('viewBox', `0 0 ${n - 1} ${best + 1}`);
            chart.setAttribute('preserveAspectRatio', 'none');
            chart.replaceChildren();
            this.bars = [];
            for (let i = 1; i < n; i++) {
              const v = P[i] + S[i];
              this.bars.push(svgEl('rect', { x: i - 1 + 0.15, y: best + 1 - v, width: 0.7, height: v, class: `viz-bar${v === best ? ' is-best' : ''}` }, chart));
            }
            return steps;
          },
          draw(st) {
            const chars = word.children, i = st.i;
            const lit = new Set(), firstL = new Set(), firstR = new Set();
            if (i > 0) {
              for (let k = 0; k < i; k++) if (!firstL.has(s[k])) { firstL.add(s[k]); lit.add(k); }
              for (let k = i; k < s.length; k++) if (!firstR.has(s[k])) { firstR.add(s[k]); lit.add(k); }
            }
            for (let k = 0; k < chars.length; k++) {
              chars[k].classList.toggle('is-lit', lit.has(k));
              chars[k].classList.toggle('is-right', i > 0 && k >= i);
              chars[k].classList.toggle('is-split', i > 0 && k === i);
            }
            this.bars.forEach((b, k) => b.classList.toggle('is-now', k + 1 === i));
          },
        };
      },
    },
  };

  document.querySelectorAll('[data-visualizer]').forEach(root => {
    const demo = DEMOS[root.dataset.visualizer];
    if (!demo) return;
    const q = sel => root.querySelector(sel);
    const canvas = q('[data-viz-canvas]'), code = q('[data-viz-code]'), say = q('[data-viz-say]'), controls = q('[data-viz-controls]');
    const inputs = q('[data-viz-inputs]'), scrub = q('[data-viz-scrub]'), count = q('[data-viz-count]');
    const playBtn = q('[data-viz="play"]'), playLabel = q('[data-viz-play-label]');
    const lines = demo.code.map(t => htmlEl('code', {}, htmlEl('li', {}, code), t).parentElement);
    let steps = [], at = 0, timer = 0, speed = 1, impl;

    const api = { canvas, inputs, rebuild: () => { stop(); steps = impl.build(); scrub.max = String(steps.length - 1); go(0); } };

    function go(n) {
      at = clamp(n, 0, steps.length - 1);
      const s = steps[at];
      impl.draw(s);
      lines.forEach((li, k) => { li.classList.toggle('is-now', k === s.line); if (k === s.line) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current'); });
      say.textContent = `Step ${at + 1}: ${s.text}`;
      scrub.value = String(at);
      scrub.setAttribute('aria-valuetext', `Step ${at + 1} of ${steps.length}`);
      count.textContent = `${at + 1} / ${steps.length}`;
      q('[data-viz="back"]').setAttribute('aria-disabled', String(at === 0));   // aria-disabled, so focus stays on the button
      q('[data-viz="fwd"]').setAttribute('aria-disabled', String(at === steps.length - 1));
    }
    function stop() {
      const was = !!timer;
      clearTimeout(timer); timer = 0;
      playBtn.removeAttribute('data-playing'); playLabel.textContent = 'Play';
      if (was) {   // re-insert the text so the step it stopped on (often the answer) is announced
        const t = say.textContent; say.textContent = ''; say.setAttribute('aria-live', 'polite');
        requestAnimationFrame(() => { say.textContent = t; });
      }
    }
    function tick() {
      if (at >= steps.length - 1) return stop();
      go(at + 1);
      timer = setTimeout(tick, 1100 / speed);
    }
    function play() {
      if (at >= steps.length - 1) go(0);
      playBtn.setAttribute('data-playing', ''); playLabel.textContent = 'Pause';
      say.setAttribute('aria-live', 'off');   // no announcement per step while it plays; stop() announces where it ended
      timer = setTimeout(tick, 600 / speed);
    }

    impl = demo.setup(api);
    if (inputs.childElementCount) inputs.hidden = false;
    controls.hidden = false;
    playBtn.addEventListener('click', () => (timer ? stop() : play()));
    q('[data-viz="back"]').addEventListener('click', () => { if (at > 0) { stop(); go(at - 1); } });
    q('[data-viz="fwd"]').addEventListener('click', () => { if (at < steps.length - 1) { stop(); go(at + 1); } });
    q('[data-viz="reset"]').addEventListener('click', () => { stop(); go(0); });
    scrub.addEventListener('input', () => { stop(); go(Number(scrub.value)); });
    root.querySelectorAll('[data-viz-speed]').forEach(b => b.addEventListener('click', () => {
      speed = Number(b.dataset.vizSpeed);
      root.querySelectorAll('[data-viz-speed]').forEach(o => o.setAttribute('aria-pressed', String(o === b)));
    }));
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
    still.addEventListener('change', () => { if (still.matches) stop(); });
    api.rebuild();
    window.__viz = { demo: root.dataset.visualizer, steps: () => steps.length, at: () => at };   // read by the end-to-end tests
  });
})();
