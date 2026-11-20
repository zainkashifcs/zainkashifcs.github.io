// Roadmap: for each stage with quiz history in this browser, show how many of the stage's quiz answers were right.
// Reads the history quiz.js keeps in localStorage ('quiz-progress': { questionId: { right, wrong, ... } }) and never
// writes it. Stages with no history stay exactly as the server rendered them.
(() => {
  let h;
  try { h = JSON.parse(localStorage.getItem('quiz-progress')) || {}; } catch (e) { return; }
  const n = v => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
  document.querySelectorAll('.rm-stage[data-qids]').forEach(st => {
    const ids = st.dataset.qids.split(' ').filter(Boolean);
    let right = 0, total = 0, tried = 0;
    ids.forEach(id => {
      const r = h[id]; if (!r || typeof r !== 'object') return;
      const ok = n(r.right), all = ok + n(r.wrong);
      if (all) { right += ok; total += all; tried++; }
    });
    if (!total) return;
    const box = document.createElement('div'); box.className = 'rm-acc';
    const p = document.createElement('p');
    p.textContent = `You answered ${right} of ${total} right`;
    const sub = document.createElement('span'); sub.className = 'muted';
    sub.textContent = ` on ${tried} of ${ids.length} question${ids.length === 1 ? '' : 's'} in this stage, in this browser.`;
    p.append(sub);
    // The bar repeats the sentence above for sighted readers, so it is hidden from screen readers.
    const bar = document.createElement('span'); bar.className = 'rm-acc-bar'; bar.setAttribute('aria-hidden', 'true');
    const fill = document.createElement('i'); fill.style.width = (100 * right / total) + '%';
    bar.append(fill);
    box.append(p, bar);
    (st.querySelector('.stage-work') || st).append(box);
  });
})();
