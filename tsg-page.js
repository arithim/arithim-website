// Page behaviour for technical-sales-guide.html: scene tabs, demo request form, pausing decorative motion off screen.
export function initTsgPage(root) {
  root = root || document;
  const stops = [];

  // ---- tabs ----
  const tabs = [...root.querySelectorAll('[role="tab"][data-tsg-tab]')];
  const panels = tabs.map((t) => root.getElementById ? root.getElementById(t.getAttribute('aria-controls')) : document.getElementById(t.getAttribute('aria-controls')));
  const select = (i, focus) => {
    tabs.forEach((t, k) => { const on = k === i; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; if (panels[k]) panels[k].hidden = !on; });
    if (focus) tabs[i].focus();
  };
  if (tabs.length) {
    const def = Math.max(0, tabs.findIndex((t) => t.hasAttribute('data-default')));
    select(def, false);
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(i, false));
      t.addEventListener('keydown', (e) => {
        let n = -1;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % tabs.length;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = tabs.length - 1;
        if (n >= 0) { e.preventDefault(); select(n, true); }
      });
    });
  }

  // ---- demo form ----
  const form = root.querySelector('[data-demo-form]');
  if (form && !form.__tsg) {
    form.__tsg = true;
    const SITEKEY = '0x4AAAAAAFddwijZvXOLiEH1';
    const slot = form.querySelector('.tsg-ts');
    let wid = null, cancelled = false, timer = 0;
    const renderTs = () => {
      if (cancelled) return;
      if (window.turnstile && slot && !slot.getAttribute('data-rendered')) {
        try { wid = window.turnstile.render(slot, { sitekey: SITEKEY, action: 'contact-form', theme: 'dark' }); slot.setAttribute('data-rendered', '1'); return; } catch (e) { console.error('turnstile render failed', e); }
      }
      timer = setTimeout(renderTs, 200);
    };
    renderTs();
    const err = form.querySelector('[data-demo-err]'), btn = form.querySelector('button[type="submit"]'), done = root.querySelector('[data-demo-done]');
    let sending = false;
    const onSubmit = async (e) => {
      e.preventDefault();
      if (sending) return;
      sending = true; err.textContent = ''; const label = btn.textContent; btn.textContent = 'Sending…'; btn.disabled = true;
      const reset = () => { if (window.turnstile && wid != null) { try { window.turnstile.reset(wid); } catch (_) {} } sending = false; btn.disabled = false; btn.textContent = label; };
      try {
        const res = await fetch('/api/contact', { method: 'POST', body: new FormData(form) });
        if (!res.ok) {
          let msg = 'Something went wrong. Please email hello@arithim.com.';
          try { const j = await res.json(); if (j && j.error) msg = j.error; } catch (_) {}
          err.textContent = msg; reset(); return;
        }
        form.style.display = 'none'; if (done) { done.style.display = 'block'; done.focus(); }
      } catch (x) { err.textContent = 'Network error. Please email hello@arithim.com.'; reset(); }
    };
    form.addEventListener('submit', onSubmit);
    stops.push(() => { cancelled = true; clearTimeout(timer); form.removeEventListener('submit', onSubmit); });
  }

  const firstOpen = root.querySelector('.tsg-acc details'); if (firstOpen) firstOpen.open = true;

  // ---- pause decorative CSS animation when off screen ----
  if (window.IntersectionObserver) {
    const io = new IntersectionObserver((es) => es.forEach((en) => { en.target.style.animationPlayState = en.isIntersecting ? 'running' : 'paused'; }), { rootMargin: '100px' });
    root.querySelectorAll('[style*="animation"]').forEach((n) => io.observe(n));
    stops.push(() => io.disconnect());
  }
  return () => stops.forEach((f) => f());
}
