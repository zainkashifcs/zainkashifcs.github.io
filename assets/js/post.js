// Write-up pages: "Copy code" buttons (hidden when the Clipboard API is unavailable) and a thin reading-progress bar
// (decorative; only with motion allowed, since the head script adds .motion unless reduced motion is requested).
(() => {
  if (navigator.clipboard) {
    document.querySelectorAll('[data-copy]').forEach(btn => {
      const pre = btn.closest('.code-caption').nextElementSibling.querySelector('pre');
      btn.hidden = false;
      btn.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(pre.innerText); btn.textContent = 'Copied'; }
        catch { btn.textContent = 'Copy failed'; }
        setTimeout(() => { btn.textContent = 'Copy code'; }, 1500);
      });
    });
  }

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
})();
