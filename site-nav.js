// Shared mobile menu for the Arithim header. initFx in arithim-fx.js calls initSiteNav for every page.
// Under 900px the nav links collapse behind a menu button; above it nothing changes. Styles are in site.css.
export function initSiteNav(root) {
  root = root || document;
  const nav = root.querySelector('[data-nav]');
  if (!nav || nav.__sn) return () => {};
  nav.__sn = true;
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'sn-btn';
  nav.id = nav.id || 'sn-nav';
  btn.setAttribute('aria-controls', nav.id); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-label', 'Menu');
  btn.innerHTML = '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  nav.parentNode.insertBefore(btn, nav.nextSibling);
  // Each menu with a drop-down gets its own small toggle on phones, so the link goes to the page and the arrow opens the list.
  nav.querySelectorAll('.ah-nav-item').forEach((item) => {
    const menu = item.querySelector('.ah-menu'), link = item.querySelector(':scope > a');
    if (!menu || !link) return;
    const t = document.createElement('button');
    t.type = 'button'; t.className = 'sn-sub'; t.setAttribute('aria-expanded', 'false');
    t.setAttribute('aria-label', 'Show the ' + link.textContent.trim() + ' menu');
    t.innerHTML = '<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    t.addEventListener('click', (e) => { e.stopPropagation(); const open = !item.classList.contains('sn-sub-open'); item.classList.toggle('sn-sub-open', open); t.setAttribute('aria-expanded', String(open)); });
    link.after(t);
  });
  const header = nav.closest('header') || nav.parentNode;
  const set = (open) => {
    if (open) nav.style.setProperty('--sn-top', Math.round(header.getBoundingClientRect().bottom) + 'px');
    nav.classList.toggle('sn-open', open);
    btn.setAttribute('aria-expanded', String(open));
  };
  const onClick = () => set(!nav.classList.contains('sn-open'));
  const onKey = (e) => { if (e.key === 'Escape') set(false); };
  const onNav = (e) => { if (e.target.closest('a')) set(false); };
  btn.addEventListener('click', onClick); document.addEventListener('keydown', onKey); nav.addEventListener('click', onNav);
  return () => { btn.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey); nav.removeEventListener('click', onNav); btn.remove(); };
}
