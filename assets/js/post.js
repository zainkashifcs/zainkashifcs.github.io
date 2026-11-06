// "Copy code" button for solution code blocks (hidden when the Clipboard API is unavailable).
(() => {
  if (!navigator.clipboard) return;
  document.querySelectorAll('[data-copy]').forEach(btn => {
    const pre = btn.closest('.code-caption').nextElementSibling.querySelector('pre');
    btn.hidden = false;
    btn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(pre.innerText); btn.textContent = 'Copied'; }
      catch { btn.textContent = 'Copy failed'; }
      setTimeout(() => { btn.textContent = 'Copy code'; }, 1500);
    });
  });
})();
