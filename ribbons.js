// Arithim ribbon hero. Call initRibbons(document); returns a cleanup function.
// Draws layered sine ribbons on canvas[data-ribbons]. Brand colours only.
const RIBBONS = [
  { c: [126, 155, 135], hi: [200, 225, 208], y: 0.62, amp: 0.2, w: 120, f: 1.1, s: 0.22, ph: 0 },
  { c: [126, 155, 135], hi: [190, 220, 200], y: 0.55, amp: 0.24, w: 90, f: 1.4, s: 0.3, ph: 1.7 },
  { c: [59, 111, 212], hi: [174, 194, 224], y: 0.7, amp: 0.16, w: 70, f: 0.9, s: 0.18, ph: 3.1 },
  { c: [232, 161, 60], hi: [246, 206, 140], y: 0.48, amp: 0.22, w: 46, f: 1.7, s: 0.38, ph: 4.4 },
  { c: [126, 155, 135], hi: [245, 241, 232], y: 0.58, amp: 0.14, w: 30, f: 2.1, s: 0.46, ph: 5.6 },
];

export function initRibbons(root) {
  root = root || document;
  const stops = [];
  root.querySelectorAll('canvas[data-ribbons]').forEach((cv) => {
    if (cv.__rb) return;
    cv.__rb = true;
    // data-ribbons="soft" is for sub-page heroes and call-to-action bands: slimmer, quieter ribbons.
    const soft = cv.dataset.ribbons === 'soft';
    const ctx = cv.getContext('2d');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0, raf = 0, visible = true;
    const size = () => {
      const r = cv.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width = Math.max(1, W * dpr); cv.height = Math.max(1, H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduce) draw(6);
    };
    // Narrow screens get slimmer ribbons so the headline stays readable.
    const scale = () => (W < 640 ? 0.6 : 1) * (soft ? 0.55 : 1);
    const centre = (r, x, t) => {
      const u = (x / W) * Math.PI * 2 * r.f;
      return H * r.y + H * r.amp * (Math.sin(u + t * r.s + r.ph) * 0.6 + Math.sin(u * 0.53 - t * r.s * 1.3 + r.ph * 2) * 0.4);
    };
    const width = (r, x, t) => {
      const u = (x / W) * Math.PI * 2 * r.f * 0.8;
      return r.w * scale() * (0.15 + 0.85 * Math.abs(Math.sin(u + t * r.s * 0.7 + r.ph * 1.5)));
    };
    function draw(t) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, W, H);
      if (!soft) {
        const bg = ctx.createLinearGradient(0, 0, W, H);
        bg.addColorStop(0, '#070C16'); bg.addColorStop(1, '#0A1424');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      }
      const step = W < 640 ? 12 : 8;
      for (const r of RIBBONS) {
        const top = [], bot = [];
        for (let x = -step; x <= W + step; x += step) {
          const y = centre(r, x, t), h = width(r, x, t) / 2;
          top.push([x, y - h]); bot.push([x, y + h]);
        }
        const yMin = H * (r.y - r.amp) - r.w, yMax = H * (r.y + r.amp) + r.w;
        const g = ctx.createLinearGradient(0, yMin, 0, yMax);
        const [R, G, B] = r.c, [hr, hg, hb] = r.hi;
        g.addColorStop(0, `rgba(${R},${G},${B},0.04)`);
        g.addColorStop(0.42, `rgba(${R},${G},${B},0.55)`);
        g.addColorStop(0.5, `rgba(${hr},${hg},${hb},0.9)`);
        g.addColorStop(0.58, `rgba(${R},${G},${B},0.45)`);
        g.addColorStop(1, `rgba(${R},${G},${B},0.03)`);
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath();
        top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
        ctx.closePath();
        ctx.fillStyle = g; ctx.globalAlpha = soft ? 0.4 : 0.55; ctx.fill();
        ctx.globalAlpha = soft ? 0.6 : 0.9; ctx.lineWidth = 1.5; ctx.strokeStyle = `rgba(${hr},${hg},${hb},0.75)`;
        ctx.beginPath(); top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
        ctx.globalAlpha = soft ? 0.25 : 0.35; ctx.lineWidth = 1;
        ctx.beginPath(); bot.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    const t0 = performance.now();
    const loop = (now) => { if (visible && !document.hidden) draw((now - t0) / 1000 + 6); raf = requestAnimationFrame(loop); };
    size();
    let ro; if (window.ResizeObserver) { ro = new ResizeObserver(size); ro.observe(cv); } else window.addEventListener('resize', size);
    let io; if (window.IntersectionObserver) { io = new IntersectionObserver((e) => { visible = e[0].isIntersecting; }); io.observe(cv); }
    if (!reduce) raf = requestAnimationFrame(loop);
    stops.push(() => { cancelAnimationFrame(raf); if (ro) ro.disconnect(); if (io) io.disconnect(); window.removeEventListener('resize', size); });
  });
  return () => stops.forEach((s) => s());
}
