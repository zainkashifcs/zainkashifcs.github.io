// Quiz: questions are server-rendered fieldsets with a "Show answer" fallback. With JS each becomes
// choose, check and explain. The quiz page deals up to five at a time, spread across problems, from the
// questions matching the chosen topics (any of them) and rating range. Topics and ratings come from each
// question's own data-tags and its problem's rating, so new approved questions appear automatically.
(() => {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ROUND = 5;
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // Revision history, kept in this browser only:
  // { questionId: { right, wrong, last: 'right' | 'wrong', at, box: 0-4, due } }, dates as local YYYY-MM-DD.
  // Spaced repetition (Leitner boxes): a right answer moves the question up one box, a wrong one sends it back to
  // box 0. Box n comes due INTERVALS[n] days after the answer, so a mistake is due again tomorrow (the Missed recently
  // mode is there for a same-day retry). Records saved before boxes existed get theirs from `last` and `at`.
  const INTERVALS = [1, 3, 7, 14, 30];
  const DAY = /^\d{4}-\d{2}-\d{2}$/;
  const pad = n => String(n).padStart(2, '0');
  const localDay = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = (day, n) => { const [y, m, d] = day.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
  const isRecord = r => !!r && typeof r === 'object' && !Array.isArray(r);
  const review = r => {
    if (!isRecord(r)) return null;
    if (Number.isInteger(r.box) && DAY.test(r.due)) return { box: Math.min(Math.max(r.box, 0), INTERVALS.length - 1), due: r.due };
    const box = r.last === 'right' ? 1 : 0;
    return { box, due: DAY.test(r.at) ? addDays(r.at, INTERVALS[box]) : '0000-00-00' }; // no usable date: due now
  };
  const isDue = (r, today) => { const s = review(r); return !!s && s.due <= today; };
  const answer = (old, ok, today) => {
    const r = isRecord(old) ? old : {}, prev = review(old);
    const box = ok ? Math.min((prev ? prev.box : 0) + 1, INTERVALS.length - 1) : 0; // unseen counts as box 0
    return { ...r, right: (Number(r.right) || 0) + (ok ? 1 : 0), wrong: (Number(r.wrong) || 0) + (ok ? 0 : 1),
      last: ok ? 'right' : 'wrong', at: today, box, due: addDays(today, INTERVALS[box]) };
  };
  const parseHistory = s => { try { const h = JSON.parse(s); return isRecord(h) ? h : {}; } catch (e) { return {}; } };
  if (typeof document === 'undefined') { module.exports = { INTERVALS, localDay, addDays, review, isDue, answer, parseHistory }; return; } // Node unit tests

  const STORE = 'quiz-progress';
  const history = () => { try { return parseHistory(localStorage.getItem(STORE)); } catch (e) { return {}; } };
  const record = (qid, ok) => {
    if (!qid) return;
    const h = history();
    h[qid] = answer(h[qid], ok, localDay());
    try { localStorage.setItem(STORE, JSON.stringify(h)); } catch (e) { /* storage unavailable: the quiz still works */ }
    document.dispatchEvent(new CustomEvent('quiz:recorded'));
  };
  const celebrate = el => { // shared .fx-celebrate one-liner (motion CSS does nothing under reduced motion)
    el.classList.remove('fx-celebrate'); void el.offsetWidth;
    el.classList.add('fx-celebrate'); el.addEventListener('animationend', () => el.classList.remove('fx-celebrate'), { once: true });
  };
  // Homepage recall card: after the check, offer the deck and how many more of its questions are due today.
  const recalled = (form, fs, ok) => {
    if (ok) celebrate(fs);
    const card = form.closest('[data-recall]') || document;
    const after = card.querySelector('[data-recall-after]'); if (after) after.hidden = false;
    const dueLink = card.querySelector('[data-recall-due]'), h = history(), today = localDay();
    const m = (card.dataset?.qids || '').split(' ').filter(id => id && isDue(h[id], today)).length;
    if (dueLink && m > 0) { dueLink.textContent = `Review ${m} more due today`; dueLink.hidden = false; }
  };

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
      const n = fs.querySelectorAll('.choice').length;
      actions.innerHTML = '<button type="button" class="btn quiet">Check answer</button>'
        + `<span class="q-keys" aria-hidden="true"><kbd>1</kbd>–<kbd>${n}</kbd> to choose, <kbd>Enter</kbd> to check</span>` // see the keydown handler below
        + '<p class="q-hint" aria-live="polite"></p>';
      const fb = document.createElement('div'); fb.className = 'feedback'; fb.hidden = true; fb.setAttribute('role', 'status');
      fs.append(actions, fb);
      actions.querySelector('button').addEventListener('click', ev => {
        const picked = fs.querySelector('input:checked');
        if (!picked) { actions.querySelector('.q-hint').textContent = 'Choose an answer first.'; return; }
        const a = Number(fs.dataset.answer), ok = Number(picked.value) === a, hadFocus = fs.contains(document.activeElement);
        fs.classList.add('locked');
        fs.querySelectorAll('input').forEach(i => { i.disabled = true; });
        const labels = fs.querySelectorAll('.choice');
        const answerText = labels[a].querySelector('span').textContent.trim();
        labels[a].classList.add('correct'); labels[a].querySelector('.mark').textContent = 'Correct answer';
        if (!ok) { labels[Number(picked.value)].classList.add('wrong'); labels[Number(picked.value)].querySelector('.mark').textContent = 'Your answer'; }
        fb.className = 'feedback ' + (ok ? 'ok' : 'no');
        fb.innerHTML = `<strong>${ok ? 'Correct.' : `Not quite. The answer is “${esc(answerText)}”.`}</strong>` + fs.querySelector('.explain').innerHTML;
        fb.hidden = false; ev.currentTarget.remove(); actions.querySelector('.q-keys').remove(); actions.querySelector('.q-hint').textContent = '';
        if (hadFocus) { fs.tabIndex = -1; fs.focus({ preventScroll: true }); } // the focused radio or button is gone; keep focus on this question
        done++; if (ok) right++;
        record(fs.dataset.qid, ok);
        progress();
        if (form.matches('[data-instant]')) recalled(form, fs, ok);
        if (score && done === qs.length) {
          score.querySelector('h2, h3').textContent = `You got ${right} of ${qs.length}`;
          const list = score.querySelector('ul');
          if (list) {
            const missed = new Map(qs.filter(q => q.querySelector('.wrong')).map(q => q.querySelector('.from a')).filter(Boolean).map(a => [a.textContent, a.getAttribute('href')]));
            list.innerHTML = missed.size ? [...missed].map(([t, h]) => `<li><a href="${esc(h)}">${esc(t)}</a></li>`).join('') : '<li>Nothing to revisit this round.</li>';
          }
          score.hidden = false; score.focus(); celebrate(score);
        }
      });
    });
    progress();
  }

  // Homepage: one approved question. Due today first (earliest review date), then one never tried, then any.
  const tryOne = document.querySelector('[data-try]');
  if (tryOne) {
    const all = [...tryOne.querySelectorAll('.try')], h = history(), today = localDay();
    const rec = t => h[t.querySelector('.q')?.dataset.qid];
    const pickOf = list => list[Math.floor(Math.random() * list.length)];
    const due = all.filter(t => isDue(rec(t), today)), soonest = due.map(t => review(rec(t)).due).sort()[0];
    const unseen = all.filter(t => !review(rec(t)));
    const [keep, why] = due.length ? [pickOf(due.filter(t => review(rec(t)).due === soonest)), 'Due for review today']
      : unseen.length ? [pickOf(unseen), 'A question you haven’t tried yet'] : [pickOf(all), 'A question you’ve answered before'];
    all.forEach(t => { if (t !== keep) t.remove(); });
    if (keep) keep.hidden = false;
    const whyEl = tryOne.closest('[data-recall]')?.querySelector('[data-recall-why]'); if (whyEl && keep) whyEl.textContent = why;
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
    // Which questions to deal: all, the ones answered wrong last time, or the ones due for review today.
    const modeOf = () => panel?.querySelector('[name=mode]:checked')?.value || 'all';
    const setMode = v => { const r = panel?.querySelector(`[name=mode][value="${v}"]`); if (r) r.checked = true; };
    const restrict = (mode = modeOf()) => {
      if (mode === 'all') return null;
      const h = history(), today = localDay();
      return new Set(Object.keys(h).filter(k => mode === 'wrong' ? review(h[k]) && h[k].last === 'wrong' : isDue(h[k], today)));
    };
    const picked = q => (!chosen.size || tagsOf(q).some(t => chosen.has(t))) && inRange(q);
    const matching = () => { const only = restrict(); return bank.filter(q => picked(q) && (!only || only.has(q.dataset.qid))); };

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
      else { const s = document.querySelector('[data-progress]'); if (s) s.textContent = modeOf() === 'due' ? 'Nothing else is due today.' : 'No questions match these choices yet.'; }
    };

    if (panel && bank.length) {
      const chips = [...panel.querySelectorAll('.chip')], match = panel.querySelector('[data-match]'), start = panel.querySelector('[data-start]');
      const ratings = [...new Set(bank.map(q => Number(q.dataset.rating)).filter(Boolean))].sort((a, b) => a - b);
      if (ratings.length) {
        for (const s of [sel.min, sel.max]) s.insertAdjacentHTML('beforeend', ratings.map(r => `<option value="${r}">${r}</option>`).join(''));
        panel.querySelector('[data-diff]').hidden = false;
      }
      const allBtn = panel.querySelector('[data-mode-all]');
      const nextDue = () => { // "tomorrow" or "on Friday 21 November": the earliest review date among the chosen questions
        const h = history(), today = localDay();
        const day = bank.filter(picked).map(q => review(h[q.dataset.qid])?.due).filter(d => d && d > today).sort()[0];
        if (!day) return '';
        if (day === addDays(today, 1)) return 'tomorrow';
        const [y, m, d] = day.split('-').map(Number);
        return 'on ' + new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(y, m - 1, d));
      };
      const refresh = () => {
        const only = restrict(), mode = modeOf();
        for (const c of chips) {
          const n = bank.filter(q => tagsOf(q).includes(c.dataset.tag) && inRange(q) && (!only || only.has(q.dataset.qid))).length;
          c.hidden = !bank.some(q => tagsOf(q).includes(c.dataset.tag)); // topics with no questions yet stay out of the way
          c.querySelector('.n').textContent = n;
          c.querySelector('.vh').textContent = n === 1 ? ' question' : ' questions'; // accessible name: "Greedy 9 questions"
        }
        panel.querySelectorAll('[data-group]').forEach(g => { g.hidden = !g.querySelector('.chip:not([hidden])'); });
        const n = matching().length, what = (chosen.size ? 'on the chosen topics' : 'across all topics')
          + ({ wrong: ' that you got wrong last time', due: ' due for review today' }[mode] || '');
        const next = mode === 'due' && !n ? nextDue() : '';
        match.textContent = n ? `${n} question${n === 1 ? '' : 's'} ${what}. Each quiz deals up to ${ROUND}, spread across problems.`
          : mode === 'due' ? `Nothing ${chosen.size ? 'on the chosen topics ' : ''}is due today.${next ? ` The next review is ${next}.` : ''}`
          : 'No questions match these choices yet.';
        allBtn.hidden = n || mode === 'all';
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
      // Progress panel: what this browser remembers, the weakest topics, and the All / Missed recently / Due today modes.
      const revise = panel.querySelector('[data-revise]'), label = Object.fromEntries(chips.map(c => [c.dataset.tag, c.firstChild.textContent.trim()]));
      const showProgress = () => {
        const h = history(), seen = bank.filter(q => review(h[q.dataset.qid]));
        revise.hidden = !seen.length;
        if (!seen.length) { if (modeOf() !== 'all') { setMode('all'); refresh(); } return; }
        const wrong = seen.filter(q => h[q.dataset.qid].last === 'wrong'), per = {};
        for (const q of seen) for (const t of tagsOf(q)) { per[t] = per[t] || [0, 0]; per[t][1]++; if (h[q.dataset.qid].last === 'wrong') per[t][0]++; }
        revise.querySelector('[data-stats]').textContent = `You've answered ${seen.length} of ${bank.length} questions. ${seen.length - wrong.length} ${seen.length - wrong.length === 1 ? 'was' : 'were'} right on your latest try.`;
        const weak = Object.entries(per).filter(([, [w]]) => w).sort((a, b) => b[1][0] / b[1][1] - a[1][0] / a[1][1]).slice(0, 3);
        const weakEl = revise.querySelector('[data-weak]');
        weakEl.hidden = !weak.length;
        weakEl.textContent = weak.length ? 'Worth revisiting: ' + weak.map(([t, [w, n]]) => `${label[t] || t} (${w} of ${n} wrong last time)`).join(', ') + '.' : '';
        revise.querySelector('[data-wrong-n]').textContent = wrong.length;
        const due = restrict('due');
        revise.querySelector('[data-due-n]').textContent = seen.filter(q => due.has(q.dataset.qid)).length;
        revise.querySelector('[name=mode][value=wrong]').disabled = !wrong.length;
        if (!wrong.length && modeOf() === 'wrong') { setMode('all'); refresh(); }
      };
      panel.querySelectorAll('[name=mode]').forEach(r => r.addEventListener('change', refresh));
      allBtn.addEventListener('click', () => { setMode('all'); refresh(); panel.querySelector('[name=mode][value=all]').focus(); });
      document.addEventListener('quiz:recorded', () => { showProgress(); refresh(); });
      const confirmEl = revise.querySelector('[data-confirm]');
      revise.querySelector('[data-clear]').addEventListener('click', () => { confirmEl.hidden = false; revise.querySelector('[data-clear-no]').focus(); });
      revise.querySelector('[data-clear-no]').addEventListener('click', () => { confirmEl.hidden = true; revise.querySelector('[data-clear]').focus(); });
      revise.querySelector('[data-clear-yes]').addEventListener('click', () => {
        try { localStorage.removeItem(STORE); } catch (e) { /* nothing stored */ }
        confirmEl.hidden = true; setMode('all'); showProgress(); refresh();
      });
      showProgress();
      (new URLSearchParams(location.search).get('topics') || '').split(',').forEach(t => { // ?topics=a,b from the roadmap
        const c = chips.find(c => c.dataset.tag === t && bank.some(q => tagsOf(q).includes(t)));
        if (c) { chosen.add(t); c.setAttribute('aria-pressed', 'true'); }
      });
      const m = new URLSearchParams(location.search).get('mode'); // ?mode=due from the homepage "Next up" queue
      if ((m === 'due' || m === 'wrong') && !revise.hidden && !panel.querySelector(`[name=mode][value=${m}]`).disabled) setMode(m);
      panel.hidden = false; refresh();
    }
    document.querySelectorAll('[data-deal]').forEach(b => b.addEventListener('click', deal));
    if (bank.length) deal();
    document.querySelector('.quizpage')?.classList.add('quiz-ready'); // style.css keeps the quiz invisible (but in place) until now
  }
  document.querySelectorAll('[data-quiz]').forEach(enhance);

  // Shortcuts while focus is inside an open question: 1-9 picks that choice, Enter checks the answer.
  // Text fields and the search dialog keep their keys.
  document.addEventListener('keydown', e => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
    const t = e.target, fs = t.closest?.('fieldset.q');
    if (!fs || fs.classList.contains('locked') || t.closest('dialog') || t.isContentEditable
      || /^(TEXTAREA|SELECT)$/.test(t.tagName) || (t.tagName === 'INPUT' && !/^(radio|checkbox)$/.test(t.type))) return;
    const check = fs.querySelector('.q-actions button');
    if (!check) return; // not enhanced (no JS run for this question)
    if (e.key === 'Enter') { if (t.closest('a, button, summary')) return; e.preventDefault(); check.click(); return; } // links and buttons keep Enter
    const input = /^[1-9]$/.test(e.key) && fs.querySelectorAll('.choice input')[Number(e.key) - 1];
    if (input && !input.disabled) {
      e.preventDefault(); input.checked = true; input.focus(); input.dispatchEvent(new Event('change', { bubbles: true }));
      if (fs.closest('[data-instant]')) check.click();
    }
  });
  // Instant check (homepage recall): a real pointer click on a choice checks it at once. Arrow keys and Space fire
  // click with detail 0, so they only select; Enter or a number key checks.
  document.querySelectorAll('form[data-instant]').forEach(form => form.addEventListener('click', e => {
    const choice = e.detail > 0 ? e.target.closest('.choice') : null, fs = choice?.closest('fieldset.q');
    const input = choice?.querySelector('input'), check = fs?.querySelector('.q-actions button');
    if (!check || fs.classList.contains('locked') || input.disabled) return;
    input.checked = true; input.focus({ preventScroll: true }); check.click();
  }));
})();
