// Theme toggle. First visit follows the OS (CSS media query); a manual choice is stored and wins afterwards.
// The switch is one cross-fade of the whole page (view transition), so no element animates its colours separately.
(() => {
  const root = document.documentElement, btn = document.querySelector('.theme-toggle');
  if (!btn) return;
  const mq = matchMedia('(prefers-color-scheme: dark)'), still = matchMedia('(prefers-reduced-motion: reduce)');
  const current = () => root.dataset.theme || (mq.matches ? 'dark' : 'light');
  const sync = () => btn.setAttribute('aria-pressed', String(current() === 'dark'));
  btn.hidden = false; sync(); mq.addEventListener('change', sync);
  btn.addEventListener('click', () => {
    const next = current() === 'dark' ? 'light' : 'dark';
    const apply = () => { root.dataset.theme = next; sync(); };
    if (document.startViewTransition && !still.matches) {
      root.classList.add('theme-swap');
      const t = document.startViewTransition(apply);
      t.ready.catch(() => {}); // rapid toggles can skip a transition; the theme still applies
      t.finished.finally(() => root.classList.remove('theme-swap'));
    } else apply();
    try { localStorage.setItem('theme', next); } catch (e) { /* private mode: the choice lasts for this page only */ }
  });
})();
