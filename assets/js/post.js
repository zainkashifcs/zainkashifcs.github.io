// Write-up and problem pages: code-window line counts and "Copy code" buttons (hidden when the Clipboard API is
// unavailable), the rail's contest timer (memory only) and scratchpad (localStorage "scratch:<slug>"), the table of
// contents' current section, and a thin reading-progress bar (only with motion allowed: the head script adds .motion
// unless reduced motion is requested).
(() => {
  const celebrate = el => {
    el.classList.remove('fx-celebrate'); void el.offsetWidth; el.classList.add('fx-celebrate');
    el.addEventListener('animationend', () => el.classList.remove('fx-celebrate'), { once: true });
  };
  const TICK = '<svg class="copy-tick" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3.5 8.5l3 3 6-7"/></svg>';

  document.querySelectorAll('.code-caption').forEach(cap => {
    const pre = cap.nextElementSibling && cap.nextElementSibling.querySelector('pre');
    if (!pre) return;
    const lines = cap.querySelector('[data-lines]');
    if (lines) { const n = pre.innerText.replace(/\n+$/, '').split('\n').length; lines.textContent = `${n} line${n === 1 ? '' : 's'}`; }
    const btn = cap.querySelector('[data-copy]');
    if (!btn || !navigator.clipboard) return;
    btn.hidden = false;
    let timer;
    btn.addEventListener('click', async () => {
      clearTimeout(timer);
      try { await navigator.clipboard.writeText(pre.innerText); btn.innerHTML = 'Copied' + TICK; celebrate(btn); }
      catch { btn.textContent = 'Copy failed'; }
      timer = setTimeout(() => { btn.textContent = 'Copy code'; }, 1500);
    });
  });

  timerInit(document.querySelector('[data-timer]'));
  scratchInit(document.querySelector('[data-scratch]'));
  tocInit([...document.querySelectorAll('.rd-toc a[data-toc]')]);
  progressInit();

  // Contest timer: 35:00 countdown or a stopwatch. State lives in memory only; nothing is stored.
  function timerInit(box) {
    if (!box) return;
    const LIMIT = 2100, CAP = 99 * 60 + 59;
    const face = box.querySelector('[data-timer-face]'), toggle = box.querySelector('[data-timer-toggle]');
    const say = box.querySelector('[data-timer-say]'), modes = [...box.querySelectorAll('[data-timer-mode]')];
    let mode = 'down', running = false, base = 0, startedAt = 0, tick = 0, ended = false;
    const elapsed = () => base + (running ? (performance.now() - startedAt) / 1000 : 0);
    const fmt = s => { s = Math.floor(s); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
    const stop = () => { if (running) { base = elapsed(); running = false; } clearInterval(tick); toggle.textContent = 'Start'; };
    const draw = () => {
      const e = elapsed();
      if (mode === 'down') {
        const left = Math.max(0, LIMIT - e);
        face.textContent = fmt(Math.ceil(left));
        if (left <= 0 && !ended) { ended = true; stop(); base = LIMIT; box.classList.add('is-up'); say.textContent = 'Time is up'; }
      } else {
        if (e >= CAP) { stop(); base = CAP; }
        face.textContent = fmt(Math.min(e, CAP));
      }
    };
    const reset = announce => {
      stop(); base = 0; ended = false; box.classList.remove('is-up'); draw();
      if (announce) say.textContent = 'Timer reset';
    };
    toggle.addEventListener('click', () => {
      if (running) { stop(); draw(); say.textContent = 'Paused'; return; }
      if (mode === 'down' && ended) reset(false);
      running = true; startedAt = performance.now(); toggle.textContent = 'Pause';
      tick = setInterval(draw, 250); say.textContent = 'Started';
    });
    box.querySelector('[data-timer-reset]').addEventListener('click', () => reset(true));
    modes.forEach(b => b.addEventListener('click', () => {
      if (b.dataset.timerMode === mode) return;
      mode = b.dataset.timerMode;
      modes.forEach(m => m.setAttribute('aria-pressed', String(m === b)));
      reset(false);
    }));
    draw();
    box.hidden = false;
  }

  // Scratchpad: notes for this problem, kept in this browser only. Emptying it removes the key.
  function scratchInit(box) {
    if (!box || !/^[a-z0-9-]+$/.test(box.dataset.scratch || '')) return;
    const key = 'scratch:' + box.dataset.scratch, MAX = 4000;
    const area = box.querySelector('textarea'), note = box.querySelector('[data-scratch-note]');
    const blocked = () => { note.textContent = 'Not saved: this browser blocks storage.'; };
    try { const v = localStorage.getItem(key); if (v) { area.value = v.slice(0, MAX); box.open = true; } } catch { blocked(); }
    let wait;
    const save = () => {
      clearTimeout(wait); wait = 0;
      const v = area.value.slice(0, MAX);
      try { if (v) localStorage.setItem(key, v); else localStorage.removeItem(key); note.textContent = ''; } catch { blocked(); }
    };
    area.addEventListener('input', () => { clearTimeout(wait); wait = setTimeout(save, 400); });
    addEventListener('pagehide', () => { if (wait) save(); }); // a link clicked within 400ms of typing still saves
    box.hidden = false;
  }

  // Marks the table-of-contents link of the section being read with aria-current="location".
  function tocInit(links) {
    if (links.length < 2) return;
    const heads = links.map(a => document.getElementById(decodeURIComponent(a.hash.slice(1))));
    if (heads.some(h => !h)) return;
    let queued = false;
    const mark = () => {
      queued = false;
      const line = innerHeight * 0.3;
      let cur = 0;
      heads.forEach((h, i) => { if (h.getBoundingClientRect().top < line) cur = i; });
      links.forEach((a, i) => (i === cur ? a.setAttribute('aria-current', 'location') : a.removeAttribute('aria-current')));
    };
    addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(mark); } }, { passive: true });
    mark();
  }

  function progressInit() {
    const main = document.getElementById('main');
    if (!main || !document.documentElement.classList.contains('motion')) return;
    const bar = document.createElement('div');
    bar.className = 'read-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.append(bar);
    let queued = false;
    const draw = () => {
      queued = false;
      const room = main.offsetHeight - innerHeight; // scrollable length of the write-up
      const done = room > 0 ? (scrollY - (main.getBoundingClientRect().top + scrollY)) / room : 0;
      bar.style.transform = 'scaleX(' + Math.min(1, Math.max(0, done)).toFixed(4) + ')';
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(draw); } };
    addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', queue);
    draw();
  }
})();
