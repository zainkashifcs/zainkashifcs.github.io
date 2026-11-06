// Quiz: questions are server-rendered fieldsets with a "Show answer" fallback. With JS each becomes
// choose, check and explain. The quiz page deals up to five at a time, spread across problems, from the
// questions matching the chosen topics (any of them) and rating range. Topics and ratings come from each
// question's own data-tags and its problem's rating, so new approved questions appear automatically.
(() => {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ROUND = 5;
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function enhance(form) {
    const qs = [...form.querySelectorAll('.q')].filter(q => !q.hidden);
    const score = form.querySelector('.score');
    let done = 0, right = 0;
    const progress = () => {
      const meter = document.querySelector('.meter i'); if (meter) meter.style.width = (100 * done / qs.length) + '%';
      const status = document.querySelector('[data-progress]'); if (status) status.textContent = `${done} of ${qs.length} answered, ${right} correct`;
    };
    qs.forEach(fs => {
      fs.querySelector('.reveal').hidden = true;
      const actions = document.createElement('div'); actions.className = 'q-actions';
      actions.innerHTML = '<button type="button" class="btn quiet">Check answer</button><p class="q-hint" aria-live="polite"></p>';
      const fb = document.createElement('div'); fb.className = 'feedback'; fb.hidden = true; fb.setAttribute('role', 'status');
      fs.append(actions, fb);
      actions.querySelector('button').addEventListener('click', ev => {
        const picked = fs.querySelector('input:checked');
        if (!picked) { actions.querySelector('.q-hint').textContent = 'Choose an answer first.'; return; }
        const a = Number(fs.dataset.answer), ok = Number(picked.value) === a;
        fs.classList.add('locked');
        fs.querySelectorAll('input').forEach(i => { i.disabled = true; });
        const labels = fs.querySelectorAll('.choice');
        const answerText = labels[a].querySelector('span').textContent.trim();
        labels[a].classList.add('correct'); labels[a].querySelector('.mark').textContent = 'Correct answer';
        if (!ok) { labels[Number(picked.value)].classList.add('wrong'); labels[Number(picked.value)].querySelector('.mark').textContent = 'Your answer'; }
        fb.className = 'feedback ' + (ok ? 'ok' : 'no');
        fb.innerHTML = `<strong>${ok ? 'Correct.' : `Not quite. The answer is “${esc(answerText)}”.`}</strong>` + fs.querySelector('.explain').innerHTML;
        fb.hidden = false; ev.currentTarget.remove(); actions.querySelector('.q-hint').textContent = '';
        done++; if (ok) right++;
        progress();
        if (score && done === qs.length) {
          score.querySelector('h2, h3').textContent = `You got ${right} of ${qs.length}`;
          const list = score.querySelector('ul');
          if (list) {
            const missed = new Map(qs.filter(q => q.querySelector('.wrong')).map(q => q.querySelector('.from a')).filter(Boolean).map(a => [a.textContent, a.getAttribute('href')]));
            list.innerHTML = missed.size ? [...missed].map(([t, h]) => `<li><a href="${esc(h)}">${esc(t)}</a></li>`).join('') : '<li>Nothing to revisit this round.</li>';
          }
          score.hidden = false; score.focus();
        }
      });
    });
    progress();
  }

  // Homepage: one random approved question from any write-up.
  const tryOne = document.querySelector('[data-try]');
  if (tryOne) {
    const all = [...tryOne.querySelectorAll('.try')], keep = all[Math.floor(Math.random() * all.length)];
    all.forEach(t => { if (t !== keep) t.remove(); });
    if (keep) keep.hidden = false;
  }

  const mixed = document.querySelector('[data-mixed]');
  if (mixed) {
    const score = mixed.querySelector('.score');
    const bank = [...mixed.querySelectorAll('.q')].map(q => q.cloneNode(true)); // untouched copies to deal from
    mixed.querySelectorAll('.q').forEach(q => q.remove());
    const panel = document.querySelector('[data-filter]');
    const chosen = new Set(), sel = { min: panel?.querySelector('[name=min]'), max: panel?.querySelector('[name=max]') };
    const tagsOf = q => (q.dataset.tags || '').split(' ').filter(Boolean);
    const inRange = q => {
      const lo = Number(sel.min?.value) || 0, hi = Number(sel.max?.value) || 0, r = Number(q.dataset.rating) || 0;
      if (!lo && !hi) return true;          // no rating chosen: rated and unrated questions alike
      return r > 0 && (!lo || r >= lo) && (!hi || r <= hi);
    };
    const matching = () => bank.filter(q => (!chosen.size || tagsOf(q).some(t => chosen.has(t))) && inRange(q));

    const deal = () => {
      mixed.querySelectorAll('.q').forEach(q => q.remove());
      score.hidden = true; score.querySelector('h2').textContent = ''; score.querySelector('ul').innerHTML = '';
      const byProblem = new Map();
      for (const q of shuffle(matching().map(q => q.cloneNode(true)))) { const k = q.dataset.problem || ''; (byProblem.get(k) || byProblem.set(k, []).get(k)).push(q); }
      const groups = shuffle([...byProblem.values()]), pick = [];
      while (pick.length < ROUND && groups.some(g => g.length)) for (const g of groups) if (g.length && pick.length < ROUND) pick.push(g.shift());
      pick.forEach((q, i) => { mixed.insertBefore(q, score); q.querySelector('.qn').textContent = `Question ${i + 1} of ${pick.length}`; });
      document.querySelectorAll('.quizbar [data-deal]').forEach(b => { b.hidden = matching().length <= ROUND; });
      if (pick.length) enhance(mixed);
      else { const s = document.querySelector('[data-progress]'); if (s) s.textContent = 'No questions match these choices yet.'; }
    };

    if (panel && bank.length) {
      const chips = [...panel.querySelectorAll('.chip')], match = panel.querySelector('[data-match]'), start = panel.querySelector('[data-start]');
      const ratings = [...new Set(bank.map(q => Number(q.dataset.rating)).filter(Boolean))].sort((a, b) => a - b);
      if (ratings.length) {
        for (const s of [sel.min, sel.max]) s.insertAdjacentHTML('beforeend', ratings.map(r => `<option value="${r}">${r}</option>`).join(''));
        panel.querySelector('[data-diff]').hidden = false;
      }
      const refresh = () => {
        for (const c of chips) {
          const n = bank.filter(q => tagsOf(q).includes(c.dataset.tag) && inRange(q)).length;
          c.hidden = !bank.some(q => tagsOf(q).includes(c.dataset.tag)); // topics with no questions yet stay out of the way
          c.querySelector('.n').textContent = n;
          c.setAttribute('aria-label', `${c.firstChild.textContent.trim()}, ${n} question${n === 1 ? '' : 's'}`);
        }
        panel.querySelectorAll('[data-group]').forEach(g => { g.hidden = !g.querySelector('.chip:not([hidden])'); });
        const n = matching().length, what = chosen.size ? 'on the chosen topics' : 'across all topics';
        match.textContent = n ? `${n} question${n === 1 ? '' : 's'} ${what}. Each quiz deals up to ${ROUND}, spread across problems.` : 'No questions match these choices yet.';
        start.disabled = !n;
      };
      chips.forEach(c => c.addEventListener('click', () => {
        const on = c.getAttribute('aria-pressed') !== 'true'; c.setAttribute('aria-pressed', String(on));
        if (on) chosen.add(c.dataset.tag); else chosen.delete(c.dataset.tag);
        refresh();
      }));
      [sel.min, sel.max].forEach(s => s.addEventListener('change', () => {
        if (sel.min.value && sel.max.value && Number(sel.min.value) > Number(sel.max.value)) (s === sel.min ? sel.max : sel.min).value = s.value;
        refresh();
      }));
      start.addEventListener('click', () => {
        deal();
        mixed.querySelector('.q')?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      });
      panel.hidden = false; refresh();
    }
    document.querySelectorAll('[data-deal]').forEach(b => b.addEventListener('click', deal));
    if (bank.length) deal();
  }
  document.querySelectorAll('[data-quiz]').forEach(enhance);
})();
