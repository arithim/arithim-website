// Shared mobile menu for the Arithim header. Any page with <nav data-nav> inside its header can call
// initSiteNav(document). Under 900px the nav links collapse behind a menu button; above it nothing changes.
export function initSiteNav(root) {
  root = root || document;
  const nav = root.querySelector('[data-nav]');
  if (!nav || nav.__sn) return () => {};
  nav.__sn = true;
  if (!document.getElementById('sn-style')) {
    const st = document.createElement('style');
    st.id = 'sn-style';
    st.textContent = `
.sn-btn{display:none;align-items:center;justify-content:center;width:44px;height:44px;margin-left:auto;background:transparent;color:#F5F1E8;border:1px solid rgba(245,241,232,.22);border-radius:999px;cursor:pointer;padding:0}
.sn-btn:focus-visible{outline:2px solid #E8A13C;outline-offset:3px}
@media (max-width:900px){
  .sn-btn{display:inline-flex}
  [data-nav]{display:none !important}
  [data-nav].sn-open{display:flex !important;flex-direction:column;align-items:stretch;gap:0 !important;position:fixed;left:0;right:0;top:var(--sn-top,72px);background:#0B1220;border-bottom:1px solid rgba(245,241,232,.12);padding:6px 20px 14px;z-index:60}
  [data-nav].sn-open a{padding:14px 2px !important;font-size:17px !important;border-bottom:1px solid rgba(245,241,232,.07)}
  [data-nav] [data-nav-pill]{display:none !important}
}`;
    document.head.appendChild(st);
  }
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'sn-btn';
  nav.id = nav.id || 'sn-nav';
  btn.setAttribute('aria-controls', nav.id); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-label', 'Menu');
  btn.innerHTML = '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  nav.parentNode.insertBefore(btn, nav.nextSibling);
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
