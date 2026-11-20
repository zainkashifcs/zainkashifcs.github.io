// Topic mastery and the "Next up" queue: read-only use of the quiz history quiz.js keeps in localStorage
// ('quiz-progress': { questionId: { right, wrong, last, at, box, due } }). Nothing here writes storage.
// Every [data-qids] quiz cell gets that topic's recall (right answers over all answers, the roadmap.js formula), and
// the queue gets one "due for review today" item when any approved question is due. Without history, storage or JS
// the server-rendered text stays as it is.
(() => {
  let h;
  try { h = JSON.parse(localStorage.getItem('quiz-progress')); } catch (e) { return; }
  if (!h || typeof h !== 'object' || Array.isArray(h)) return;

  // Copied from quiz.js (review, isDue, localDay, addDays), which stays the source of truth for the schedule.
  const INTERVALS = [1, 3, 7, 14, 30], DAY = /^\d{4}-\d{2}-\d{2}$/;
  const pad = n => String(n).padStart(2, '0');
  const localDay = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = (day, n) => { const [y, m, d] = day.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
  const isRecord = r => !!r && typeof r === 'object' && !Array.isArray(r);
  const review = r => {
    if (!isRecord(r)) return null;
    if (Number.isInteger(r.box) && DAY.test(r.due)) return { box: Math.min(Math.max(r.box, 0), INTERVALS.length - 1), due: r.due };
    const box = r.last === 'right' ? 1 : 0;
    return { box, due: DAY.test(r.at) ? addDays(r.at, INTERVALS[box]) : '0000-00-00' };
  };
  const isDue = (r, today) => { const s = review(r); return !!s && s.due <= today; };

  const n = v => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
  const ids = el => (el.dataset.qids || '').split(' ').filter(Boolean);

  document.querySelectorAll('.mx-quiz[data-qids]').forEach(cell => {
    let right = 0, all = 0;
    for (const id of ids(cell)) {
      const r = h[id]; if (!isRecord(r)) continue;
      right += n(r.right); all += n(r.right) + n(r.wrong);
    }
    if (!all) return;
    const pct = Math.round(100 * right / all);
    if (cell.hasAttribute('data-short')) { cell.textContent = `Quiz ${pct}%`; return; }
    const q = document.createElement('span'); q.className = 'mx-q mx-pct'; q.textContent = `${pct}%`;
    const sub = document.createElement('span'); sub.className = 'mx-sub'; sub.textContent = `${right} of ${all} right`;
    cell.replaceChildren(q, sub);
  });

  const queue = document.querySelector('.nu[data-qids]');
  if (!queue) return;
  const today = localDay(), due = ids(queue).filter(id => isDue(h[id], today)).length;
  if (!due) return;
  const li = document.createElement('li'); li.className = 'nu-item nu-quiz';
  const a = document.createElement('a'); a.href = queue.dataset.quizHref;
  a.innerHTML = '<svg class="nu-icon" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.25"/><path d="M8 4.75V8l2.25 1.5"/></svg>';
  const name = document.createElement('span'); name.className = 'nu-name';
  name.textContent = `${due} quiz question${due === 1 ? '' : 's'} due for review today`;
  const why = document.createElement('span'); why.className = 'nu-why'; why.textContent = 'Spaced repetition, saved in this browser.';
  a.append(name, why); li.append(a); queue.prepend(li);
  queue.parentElement.querySelector('.nu-empty')?.remove();
})();
