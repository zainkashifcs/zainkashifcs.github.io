// Theme toggle. First visit follows the OS (CSS media query); a manual choice is stored and wins afterwards.
// The switch is one cross-fade of the whole page (view transition). Where that is missing, or while it runs, colour
// transitions are switched off for the swap so no element fades its colours on its own and the page never smears.
(() => {
  const root = document.documentElement, btn = document.querySelector('.theme-toggle');
  if (!btn) return;
  const mq = matchMedia('(prefers-color-scheme: dark)'), still = matchMedia('(prefers-reduced-motion: reduce)');
  const current = () => root.dataset.theme || (mq.matches ? 'dark' : 'light');
  const sync = () => btn.setAttribute('aria-pressed', String(current() === 'dark'));
  btn.hidden = false; sync(); mq.addEventListener('change', sync);

  // Turns transitions off, runs the change, forces a style flush, and restores them after the next frame.
  const withoutTransitions = change => {
    const off = document.createElement('style');
    off.textContent = '*,*::before,*::after{transition:none!important}';
    document.head.append(off);
    change();
    getComputedStyle(root).opacity; // flush: the new colours apply with no transition running
    requestAnimationFrame(() => requestAnimationFrame(() => off.remove()));
  };

  btn.addEventListener('click', () => {
    const next = current() === 'dark' ? 'light' : 'dark';
    const apply = () => withoutTransitions(() => { root.dataset.theme = next; sync(); });
    if (document.startViewTransition && !still.matches) {
      root.classList.add('theme-swap');
      const t = document.startViewTransition(apply);
      t.ready.catch(() => {}); // rapid toggles can skip a transition; the theme still applies
      t.finished.finally(() => root.classList.remove('theme-swap'));
    } else apply();
    try { localStorage.setItem('theme', next); } catch (e) { /* private mode: the choice lasts for this page only */ }
  });
})();
