// Page behaviour for technical-sales-guide.html: scene tabs, demo request form, pausing decorative motion off screen.
export function initTsgPage(root) {
  root = root || document;
  const stops = [];

  // ---- tabs ----
  const tabs = [...root.querySelectorAll('[role="tab"][data-tsg-tab]')];
  const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
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
    const FALLBACK = ' You can also email hello@arithim.com.';
    const slot = form.querySelector('.tsg-ts');
    const err = form.querySelector('[data-demo-err]'), btn = form.querySelector('button[type="submit"]'), hint = form.querySelector('[data-demo-hint]'), done = root.querySelector('[data-demo-done]');
    let wid = null, token = '', cancelled = false, timer = 0, loadTimer = 0, sending = false;
    const label = btn.textContent;
    const setReady = (ok) => { token = ok ? token : ''; btn.disabled = !ok || sending; if (hint) hint.style.display = ok ? 'none' : ''; };
    setReady(false);

    // Load Cloudflare Turnstile only when the form is near the screen or touched.
    const loadTs = () => {
      if (window.turnstile || document.getElementById('cf-ts-api')) return;
      const s = document.createElement('script');
      s.id = 'cf-ts-api'; s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'; s.async = true; s.defer = true;
      document.head.appendChild(s);
      loadTimer = setTimeout(() => { if (!token) err.textContent = 'The human check did not load.' + FALLBACK; }, 12000);
    };
    const renderTs = () => {
      if (cancelled) return;
      if (window.turnstile && slot && !slot.getAttribute('data-rendered')) {
        try {
          wid = window.turnstile.render(slot, {
            sitekey: SITEKEY, action: 'contact-form', theme: 'dark',
            callback: (t) => { token = t; err.textContent = ''; setReady(true); },
            'expired-callback': () => setReady(false),
            'error-callback': () => { setReady(false); err.textContent = 'The human check could not run in this browser.' + FALLBACK; },
          });
          slot.setAttribute('data-rendered', '1'); return;
        } catch (e) { console.error('turnstile render failed', e); }
      }
      timer = setTimeout(renderTs, 250);
    };
    const start = () => { loadTs(); renderTs(); };
    let io;
    if (window.IntersectionObserver) { io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { io.disconnect(); start(); } }, { rootMargin: '800px' }); io.observe(form); }
    else start();
    form.addEventListener('focusin', start, { once: true });

    const friendly = (status, serverMsg) => {
      if (status === 400) return 'Please check that name, work email, company, country and role are filled in.';
      if (status === 403) return 'The human check did not pass. Please tick it again and resubmit.';
      if (status === 413 || status === 429) return 'Too many requests just now. Please try again in a few minutes.';
      if (status >= 500) return 'We could not send your request just now.';
      return serverMsg || 'Something went wrong.';
    };
    const onSubmit = async (e) => {
      e.preventDefault();
      if (sending) return;
      if (!token) { err.textContent = 'Please complete the human check first.'; return; }
      sending = true; err.textContent = ''; btn.textContent = 'Sending…'; btn.disabled = true;
      const reset = () => { if (window.turnstile && wid != null) { try { window.turnstile.reset(wid); } catch (_) {} } token = ''; sending = false; btn.textContent = label; setReady(false); };
      try {
        const res = await fetch('/api/contact', { method: 'POST', body: new FormData(form) });
        if (!res.ok) {
          let m = ''; try { const j = await res.json(); m = j && j.error ? '' : ''; } catch (_) {}
          err.textContent = friendly(res.status, m) + FALLBACK; reset(); return;
        }
        form.style.display = 'none'; if (done) { done.style.display = 'block'; done.focus(); }
      } catch (x) { err.textContent = 'We could not reach the server. Check your connection.' + FALLBACK; reset(); }
    };
    form.addEventListener('submit', onSubmit);
    stops.push(() => { cancelled = true; clearTimeout(timer); clearTimeout(loadTimer); if (io) io.disconnect(); form.removeEventListener('submit', onSubmit); });
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
