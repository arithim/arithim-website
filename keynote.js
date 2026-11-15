// Slide deck controller for keynote-*.html pages. Loaded from the page's componentDidMount, like arithim-fx.js.
// Arrow keys, Page Up/Down and space move slides while the deck has focus or is presenting; swipes and taps on
// the left or right of a slide do the same. Each slide has a link (#slide-N). Present fills the screen; Save as
// PDF prints one slide per page (see the keynote section of site.css).
export function initKeynote(root) {
  const stops = [];
  root.querySelectorAll('[data-kn-deck]').forEach((deck) => stops.push(initDeck(deck)));
  root.querySelectorAll('audio[data-kn-audio]').forEach((a) => { a.controls = true; });
  return () => stops.forEach((s) => s());
}

function initDeck(deck) {
  const stage = deck.querySelector('[data-kn-stage]');
  const frame = deck.querySelector('[data-kn-frame]');
  const slides = [...deck.querySelectorAll('[data-kn-slide]')];
  const count = deck.querySelector('[data-kn-count]');
  const bar = deck.querySelector('[data-kn-progress]');
  const presentBtn = deck.querySelector('[data-kn-present]');
  const shareBtn = deck.querySelector('[data-kn-share]');
  const n = slides.length;
  const pad = (x) => String(x).padStart(2, '0');
  const off = [];
  const on = (el, ev, fn, opt) => { el.addEventListener(ev, fn, opt); off.push(() => el.removeEventListener(ev, fn, opt)); };
  let cur = -1;

  deck.tabIndex = 0;
  stage.classList.add('is-ready', 'kn-instant');

  function show(i, opts = {}) {
    const next = Math.max(0, Math.min(n - 1, i));
    if (next === cur && !opts.force) return;
    cur = next;
    slides.forEach((s, k) => {
      s.classList.toggle('is-on', k === cur);
      s.classList.toggle('is-past', k < cur);
      s.setAttribute('aria-hidden', k === cur ? 'false' : 'true');
    });
    count.textContent = `${pad(cur + 1)} / ${pad(n)}`;
    bar.style.width = `${((cur + 1) / n) * 100}%`;
    if (opts.hash !== false) {
      try { history.replaceState(null, '', `#slide-${cur + 1}`); } catch (e) { /* file:// or sandboxed */ }
    }
  }
  const fromHash = () => { const m = /^#slide-(\d+)$/.exec(location.hash); return m ? parseInt(m[1], 10) - 1 : null; };
  const nextSlide = () => show(cur + 1);
  const prevSlide = () => show(cur - 1);

  // Present mode
  const isFull = () => deck.classList.contains('is-full');
  function setFull(want) {
    deck.classList.toggle('is-full', want);
    document.documentElement.classList.toggle('kn-locked', want);
    presentBtn.textContent = want ? 'Exit' : 'Present';
    if (want) {
      deck.focus({ preventScroll: true });
      if (deck.requestFullscreen && !document.fullscreenElement) deck.requestFullscreen().catch(() => {});
    } else if (document.fullscreenElement === deck && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }
  on(document, 'fullscreenchange', () => { if (!document.fullscreenElement && isFull()) setFull(false); });

  // Keys: only while the deck has focus or is presenting, so the page still scrolls normally.
  on(document, 'keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (!isFull() && !deck.contains(document.activeElement)) return;
    if (e.target.closest && e.target.closest('button') && (e.key === ' ' || e.key === 'Enter')) return;
    const k = e.key;
    if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown' || k === ' ') { e.preventDefault(); nextSlide(); }
    else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp') { e.preventDefault(); prevSlide(); }
    else if (k === 'Home') { e.preventDefault(); show(0); }
    else if (k === 'End') { e.preventDefault(); show(n - 1); }
    else if (k === 'f' || k === 'F') { e.preventDefault(); setFull(!isFull()); }
    else if (k === 'Escape' && isFull()) { setFull(false); }
  });

  // Swipe, and tap the left third to go back or the rest to go forward.
  let tx = 0, ty = 0, swiped = false;
  on(frame, 'touchstart', (e) => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; swiped = false; }, { passive: true });
  on(frame, 'touchend', (e) => {
    const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) { swiped = true; dx < 0 ? nextSlide() : prevSlide(); }
  });
  on(frame, 'click', (e) => {
    if (swiped) { swiped = false; return; }
    if (e.target.closest('a,button')) return;
    deck.focus({ preventScroll: true });
    const r = frame.getBoundingClientRect();
    (e.clientX - r.left < r.width / 3) ? prevSlide() : nextSlide();
  });

  on(deck.querySelector('[data-kn-prev]'), 'click', prevSlide);
  on(deck.querySelector('[data-kn-next]'), 'click', nextSlide);
  on(presentBtn, 'click', () => setFull(!isFull()));
  on(deck.querySelector('[data-kn-print]'), 'click', () => window.print());
  on(shareBtn, 'click', async () => {
    const url = location.href.split('#')[0];
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) { await navigator.share({ title: document.title, url }); return; }
      await navigator.clipboard.writeText(url);
      shareBtn.textContent = 'Copied';
    } catch (e) { shareBtn.textContent = 'Copy failed'; }
    setTimeout(() => { shareBtn.textContent = 'Copy link'; }, 1800);
  });

  // "Show slide" links in the notes jump the deck and bring it into view.
  document.querySelectorAll('[data-kn-goto]').forEach((a) => on(a, 'click', (e) => {
    e.preventDefault();
    show(parseInt(a.getAttribute('data-kn-goto'), 10) - 1);
    deck.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    deck.focus({ preventScroll: true });
  }));
  on(window, 'hashchange', () => { const h = fromHash(); if (h !== null) show(h, { hash: false }); });

  const start = fromHash();
  show(start === null ? 0 : start, { hash: false, force: true });
  if (start !== null) deck.scrollIntoView({ block: 'center' });
  requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.remove('kn-instant')));

  return () => { off.forEach((f) => f()); if (isFull()) setFull(false); };
}
