// Arithim shared interaction effects. Call initFx(document) from a DC componentDidMount.
// Returns a cleanup function.
import { initSiteNav } from './site-nav.js';

export function initFx(root) {
  root = root || document;
  const stops = [initSiteNav(root)];

  // ---- live cursor-reactive node canvas ----
  root.querySelectorAll('canvas[data-live-canvas]').forEach((canvas) => {
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0;
    const N = 24;
    let seed = 4127;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const nodes = [];
    for (let i = 0; i < N; i++) nodes.push({ x: 0.04 + rnd() * 0.92, y: 0.06 + rnd() * 0.88, ph: rnd() * 6.28, alt: rnd() < 0.3 });
    const edges = [];
    for (let i = 0; i < N; i++) {
      const d = nodes.map((n, j) => ({ j, dist: (n.x - nodes[i].x) ** 2 + (n.y - nodes[i].y) ** 2 })).filter((o) => o.j !== i).sort((a, b) => a.dist - b.dist);
      for (let k = 0; k < 2; k++) { const j = d[k].j; if (!edges.some((e) => (e.a === j && e.b === i) || (e.a === i && e.b === j))) edges.push({ a: i, b: j }); }
    }
    const signals = [];
    const spawn = () => { if (!edges.length) return; const e = edges[Math.floor(Math.random() * edges.length)]; signals.push({ e, t: 0, sp: 0.004 + Math.random() * 0.008 }); };
    const mouse = { x: -1, y: -1, on: false };
    const resize = () => { const r = canvas.getBoundingClientRect(); w = r.width; h = r.height; canvas.width = Math.max(1, w * dpr); canvas.height = Math.max(1, h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize();
    let ro; if (window.ResizeObserver) { ro = new ResizeObserver(resize); ro.observe(canvas); }
    const onMove = (e) => { const r = canvas.getBoundingClientRect(); mouse.x = (e.clientX - r.left) / r.width * w; mouse.y = (e.clientY - r.top) / r.height * h; mouse.on = true; };
    const onLeave = () => { mouse.on = false; };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);
    const pos = (n, t) => ({ x: (n.x + Math.sin(t * 0.0004 + n.ph) * 0.02) * w, y: (n.y + Math.cos(t * 0.0005 + n.ph) * 0.02) * h });
    let raf;
    const frame = (t) => {
      ctx.clearRect(0, 0, w, h);
      const pts = nodes.map((n) => pos(n, t));
      ctx.lineWidth = 1;
      edges.forEach((e) => {
        const a = pts[e.a], b = pts[e.b];
        let glow = 0;
        if (mouse.on) { const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2; const d = Math.hypot(mx - mouse.x, my - mouse.y); glow = Math.max(0, 1 - d / 220); }
        ctx.strokeStyle = glow > 0 ? 'rgba(232,161,60,' + (0.12 + glow * 0.5) + ')' : 'rgba(245,241,232,0.13)';
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      });
      if (mouse.on) { pts.forEach((p) => { const d = Math.hypot(p.x - mouse.x, p.y - mouse.y); if (d < 190) { ctx.strokeStyle = 'rgba(232,161,60,' + (0.5 * (1 - d / 190)) + ')'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(mouse.x, mouse.y); ctx.lineTo(p.x, p.y); ctx.stroke(); } }); }
      if (Math.random() < 0.06 && signals.length < 14) spawn();
      for (let i = signals.length - 1; i >= 0; i--) { const s = signals[i]; s.t += s.sp; if (s.t >= 1) { signals.splice(i, 1); continue; } const a = pts[s.e.a], b = pts[s.e.b]; ctx.beginPath(); ctx.arc(a.x + (b.x - a.x) * s.t, a.y + (b.y - a.y) * s.t, 2.6, 0, 6.283); ctx.fillStyle = '#E8A13C'; ctx.fill(); }
      pts.forEach((p, i) => {
        const n = nodes[i]; const pulse = (Math.sin(t * 0.002 + n.ph) + 1) / 2;
        let near = 0; if (mouse.on) { const d = Math.hypot(p.x - mouse.x, p.y - mouse.y); near = Math.max(0, 1 - d / 160); }
        if (n.alt || near > 0.3) { ctx.beginPath(); ctx.arc(p.x, p.y, 8 + pulse * 12 + near * 10, 0, 6.283); ctx.strokeStyle = 'rgba(232,161,60,' + (0.3 * (1 - pulse) + near * 0.4) + ')'; ctx.lineWidth = 1; ctx.stroke(); }
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.8 + pulse * 1.2 + near * 3, 0, 6.283);
        ctx.fillStyle = near > 0.4 ? '#E8A13C' : (n.alt ? '#7E9B87' : '#F5F1E8'); ctx.globalAlpha = 0.55 + near * 0.45; ctx.fill(); ctx.globalAlpha = 1;
      });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    stops.push(() => { cancelAnimationFrame(raf); if (ro) ro.disconnect(); canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerleave', onLeave); });
  });

  // ---- pointer glow and magnetic buttons: central, no per-page markup ----
  // Every card-like surface in <main> and every [data-hero] gets a glow that follows the pointer. The look is
  // .ah-fx-glow in site.css. To change what counts as a surface, change isSurface() here.
  const MAGNETIC = '.ah-btn-ring';
  const isSurface = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'inline' || cs.display === 'contents' || cs.display === 'none') return false;
    const r = parseFloat(cs.borderTopLeftRadius);
    if (!(r >= 10 && r < 60) || !(parseFloat(cs.borderTopWidth) > 0) || cs.backgroundColor === 'rgba(0, 0, 0, 0)') return false;
    const b = el.getBoundingClientRect();
    return b.width >= 160 && b.height >= 64 && !el.closest('header, footer, nav, figure, [data-pm-scene], [data-home-scene], [data-sf-scene], [data-tsg-scene]');
  };
  const markGlow = (el, kind) => {
    if (el.hasAttribute('data-fx-glow')) return;
    el.setAttribute('data-fx-glow', kind);
    if (getComputedStyle(el).position === 'static') el.classList.add('ah-fx-rel');
    const layer = document.createElement('span'); layer.className = 'ah-fx-glow'; layer.setAttribute('aria-hidden', 'true');
    el.appendChild(layer);
  };
  const scanGlow = () => {
    root.querySelectorAll('[data-hero]').forEach((el) => markGlow(el, 'hero'));
    root.querySelectorAll('main *').forEach((el) => { if (el.classList.contains('ah-fx-glow') || el.hasAttribute('data-fx-glow')) return; if (isSurface(el)) markGlow(el, 'card'); });
  };
  const track = (e) => {
    const host = e.target.closest && e.target.closest('[data-fx-glow]'); if (!host) return;
    const r = host.getBoundingClientRect();
    host.style.setProperty('--mx', (e.clientX - r.left) + 'px'); host.style.setProperty('--my', (e.clientY - r.top) + 'px');
  };
  let scanTimer = 0;
  const rescan = () => { clearTimeout(scanTimer); scanTimer = setTimeout(scanGlow, 200); };
  const mo = new MutationObserver((muts) => { if (muts.some((m) => [...m.addedNodes].some((n) => n.nodeType === 1 && !n.classList.contains('ah-fx-glow')))) rescan(); });
  setTimeout(scanGlow, 400);
  mo.observe(root.documentElement || root, { childList: true, subtree: true });
  document.addEventListener('pointermove', track, { passive: true });
  stops.push(() => { mo.disconnect(); clearTimeout(scanTimer); document.removeEventListener('pointermove', track); });

  const magnetic = (e) => {
    const el = e.target.closest && e.target.closest(MAGNETIC); if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.transform = 'translate(' + (e.clientX - (r.left + r.width / 2)) * 0.25 + 'px,' + (e.clientY - (r.top + r.height / 2)) * 0.3 + 'px)';
    el.style.transition = 'transform 0.1s ease-out';
  };
  const unmagnet = (e) => {
    const el = e.target.closest && e.target.closest(MAGNETIC); if (!el || el.contains(e.relatedTarget)) return;
    el.style.transform = 'translate(0,0)'; el.style.transition = 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)';
  };
  document.addEventListener('pointermove', magnetic, { passive: true });
  document.addEventListener('pointerout', unmagnet);
  stops.push(() => { document.removeEventListener('pointermove', magnetic); document.removeEventListener('pointerout', unmagnet); });

  // ---- animated nav pill ----
  root.querySelectorAll('[data-nav]').forEach((nav) => {
    const pill = nav.querySelector('[data-nav-pill]'); if (!pill) return;
    [...nav.querySelectorAll('a')].forEach((a) => {
      const enter = () => { const nr = nav.getBoundingClientRect(); const r = a.getBoundingClientRect(); pill.style.width = r.width + 'px'; pill.style.transform = 'translateX(' + (r.left - nr.left) + 'px)'; pill.style.opacity = '1'; };
      a.addEventListener('pointerenter', enter);
      stops.push(() => a.removeEventListener('pointerenter', enter));
    });
    const leave = () => { pill.style.opacity = '0'; };
    nav.addEventListener('pointerleave', leave);
    stops.push(() => nav.removeEventListener('pointerleave', leave));
  });

  // ---- ribbon backgrounds (canvas[data-ribbons]) ----
  if (root.querySelector('canvas[data-ribbons]')) {
    import('./ribbons.js?v=3').then((m) => { stops.push(m.initRibbons(root)); }).catch((e) => console.error('ribbons load failed', e));
  }

  // ---- count ups ----
  setTimeout(() => {
    root.querySelectorAll('[data-countup]').forEach((el) => {
      const to = parseInt(el.dataset.to, 10) || 0; const dur = 1300; const start = performance.now();
      const tick = (now) => { const p = Math.min(1, (now - start) / dur); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
  }, 300);

  return () => stops.forEach((fn) => fn && fn());
}
