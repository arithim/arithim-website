// Technical Sales Guide explainers: short looping stories drawn in HTML and CSS, driven by one small timeline.
// Mount points are <div data-tsg-scene="a|b|c|d|e|f">. All figures on screen are illustrative.
const W = 440;
const mk = (s) => s.replace(/\n\s*/g, '');
const src = (t, txt) => `<div class="m-src" data-in="${t}"><svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true"><path d="M2 1h5l3 3v7H2z" fill="none" stroke="currentColor" stroke-width="1"/></svg>${txt}</div>`;

const SCENES = {
  // A. Rep at a broiler mill: ranked products from several principals
  a: { dur: 20, key: 17, label: 'Find · Animal nutrition', html: mk(`
    <div class="m-q"><span data-type="0.4,32" data-text="Heat stress in broilers, Saudi Arabia, house at 38°C"></span><b class="m-caret"></b></div>
    <div class="m-chips" data-in="3.2"><span class="m-chip a">Broiler</span><span class="m-chip a">Heat stress</span><span class="m-chip a">Saudi Arabia</span><span class="m-chip">Performance first</span></div>
    <div class="m-res" data-in="4.6"><div class="m-res-h"><span class="m-rk">1</span><span class="m-nm">Betaine-based additive</span><span class="m-pr">Principal A</span></div><div class="m-fit"><i data-grow="4.8,1.2" style="--w:92%"></i></div><div class="m-kv"><span>Dose <b>1,000 g/t</b></span><span>Cost in use <b>$2.10/t feed</b></span><span>Landed <b>$2.10/kg</b></span></div></div>
    <div class="m-res" data-in="6.4"><div class="m-res-h"><span class="m-rk">2</span><span class="m-nm">Osmolyte and vitamin blend</span><span class="m-pr">Principal B</span></div><div class="m-fit"><i data-grow="6.6,1.2" style="--w:86%"></i></div><div class="m-kv"><span>Dose <b>500 g/t</b></span><span>Cost in use <b>$1.80/t feed</b></span><span>Landed <b>$3.60/kg</b></span></div></div>
    <div class="m-res" data-in="8.2"><div class="m-res-h"><span class="m-rk">3</span><span class="m-nm">Betaine HCl, standard grade</span><span class="m-pr">Principal C</span></div><div class="m-fit"><i data-grow="8.4,1.2" style="--w:74%"></i></div><div class="m-kv"><span>Dose <b>2,000 g/t</b></span><span>Cost in use <b>$1.70/t feed</b></span><span>Landed <b>$0.85/kg</b></span></div></div>
    ${src(10, 'Sources: trial summary p.4 · TDS · SFDA list')}
    <div class="m-tags" data-in="12.4"><span class="m-chip g">Competitor equivalent of 1</span><span class="m-chip a">Replace</span></div>`) },

  // B. Technical manager uploads a TDS and gets a cited answer on page 3
  b: { dur: 20, key: 16, label: 'Library', html: mk(`
    <div class="m-upl" data-in="0.3,3.6"><span class="m-file">PDF</span><span>principal-a-tds-v4.pdf</span><span class="m-ok" data-in="2">Added</span></div>
    <div class="m-doc" data-in="3">
      <div class="m-page"><span class="m-pn">p.<u class="m-sw"><b data-in="3,6.6">1</b><b data-in="6.6">3</b></u></span>
        <i class="m-ln w9"></i><i class="m-ln w6"></i><i class="m-ln w8"></i>
        <i class="m-ln w9 hl" data-hl="7.4"></i><i class="m-ln w7 hl" data-hl="7.4"></i><i class="m-ln w5"></i><i class="m-ln w8"></i>
        <span class="m-pgtag" data-in="7.2">Inclusion rates · layers</span>
      </div></div>
    <div class="m-q" data-in="4"><span data-type="4.2,30" data-text="Maximum inclusion rate in layer feed?"></span></div>
    <div class="m-ans" data-in="6.2"><span data-type="6.4,34" data-text="Up to 2,000 g/t of complete feed for layers."></span><span class="m-cite" data-in="8.2">TDS v4 · page 3</span></div>
    <div class="m-note" data-in="11"><span class="m-dot amber"></span>Certificate of analysis expires in 45 days<em>Alert to owner</em></div>
    <div class="m-review" data-in="13">Extracted for review: moisture, particle size, shelf life <em>3 attributes waiting</em></div>`) },

  // C. Principal portal
  c: { dur: 22, key: 19, label: 'Principal portal · Principal A', html: mk(`
    <div class="m-perm" data-in="0.2"><span class="m-dot sage"></span>Showing Principal A products only</div>
    <div class="m-tiles" data-in="0.8">
      <div><small>Proposed</small><b data-count="1,1.4,42">0</b></div>
      <div><small>Won</small><b class="g" data-count="1.6,1.4,17">0</b></div>
      <div><small>Lost</small><b class="r" data-count="2.2,1.4,9">0</b></div>
    </div>
    <div class="m-lbl" data-in="3.6">WINS AND LOSSES BY COUNTRY</div>
    <div class="m-bars" data-in="3.8">
      <div class="m-brow"><span>Saudi Arabia</span><div><i class="w" data-grow="4,1.2" style="--w:78%"></i><i class="l" data-grow="4.2,1.2" style="--w:36%"></i></div></div>
      <div class="m-brow"><span>UAE</span><div><i class="w" data-grow="4.4,1.2" style="--w:50%"></i><i class="l" data-grow="4.6,1.2" style="--w:30%"></i></div></div>
      <div class="m-brow"><span>Egypt</span><div><i class="w" data-grow="4.8,1.2" style="--w:34%"></i><i class="l" data-grow="5,1.2" style="--w:28%"></i></div></div>
    </div>
    <div class="m-lbl" data-in="7.4">WHY DEALS WERE LOST</div>
    <div class="m-bars" data-in="7.6">
      <div class="m-brow"><span>Price against a competitor</span><div><i class="r" data-grow="7.8,1.2" style="--w:80%"></i><b>4</b></div></div>
      <div class="m-brow"><span>Registration pending</span><div><i class="r" data-grow="8.2,1.2" style="--w:40%"></i><b>2</b></div></div>
      <div class="m-brow"><span>No dose trial run</span><div><i class="r" data-grow="8.6,1.2" style="--w:40%"></i><b>2</b></div></div>
      <div class="m-brow"><span>Lead time</span><div><i class="r" data-grow="9,1.2" style="--w:20%"></i><b>1</b></div></div>
    </div>
    ${src(11, 'Source: opportunities logged by your distributor, Q3')}
    <div class="m-note" data-in="13.4"><span class="m-dot amber"></span>Competitor named on 5 of 9 losses<em>Quarterly review pack ready</em></div>`) },

  // D. Registration expiry alert and renewal task
  d: { dur: 18, key: 15, label: 'Registrations · Saudi Arabia', html: mk(`
    <div class="m-tbl">
      <div class="m-tr h"><span>Product</span><span>Country</span><span>Expires</span></div>
      <div class="m-tr"><span>Additive A</span><span>Saudi Arabia</span><span class="ok">Mar 2028</span></div>
      <div class="m-tr x" data-warn="2.4"><span>Additive C</span><span>Saudi Arabia</span><span class="w1">Dec 2026</span><span class="w2" data-in="2.4">60 days</span></div>
    </div>
    <div class="m-toast" data-in="3.6"><span class="m-dot amber"></span><div><b>Registration expiring in 60 days</b><small>Additive C · SFDA · holder: Principal B</small></div></div>
    <div class="m-task" data-in="6"><div class="m-task-h"><span>Renewal task created</span><em>Regulatory team · due in 46 days</em></div>
      <div class="m-ck" data-in="6.8"><i class="y"></i>Certificate of analysis, current</div>
      <div class="m-ck" data-in="7.8"><i class="n"></i>Free sale certificate, request from principal</div>
      <div class="m-ck" data-in="8.8"><i class="y"></i>Halal certificate, current</div></div>
    <div class="m-note" data-in="10.4"><span class="m-dot sage"></span>3 customers buy this product in Saudi Arabia<em>Listed for the sales team</em></div>
    ${src(12, 'Source: registration record · SFDA reference')}`) },

  // E. Concierge, Arabic
  e: { dur: 24, key: 21, label: 'Concierge · arithim-demo.example', html: mk(`
    <div class="m-chat">
      <div class="m-b v" dir="rtl" lang="ar" data-in="0.4"><span data-type="0.6,22" data-text="أحتاج منتجاً لتخفيف الإجهاد الحراري في الدجاج اللاحم"></span></div>
      <div class="m-gl" data-in="3.2">I need a product to reduce heat stress in broilers</div>
      <div class="m-b a" dir="rtl" lang="ar" data-in="4.2"><span data-type="4.4,26" data-text="هناك ثلاثة خيارات من ثلاثة موردين. هل تريد أن يتواصل معك مندوب المنطقة الشرقية؟"></span><span class="m-cite" data-in="7.8">المصدر: ورقة البيانات الفنية</span></div>
      <div class="m-gl" data-in="8.6">Three options from three suppliers. Want the Eastern Province rep to contact you?</div>
      <div class="m-b v" dir="rtl" lang="ar" data-in="10"><span data-type="10.2,22" data-text="نعم، شركتي في الدمام"></span></div>
    </div>
    <div class="m-lead" data-in="13"><div class="m-lead-h"><span class="m-dot sage"></span>Lead routed<em>Eastern Province sales</em></div>
      <div class="m-kv2"><span>Interest <b>Broiler heat stress</b></span><span>Language <b>Arabic</b></span><span>Location <b>Dammam</b></span></div></div>
    <div class="m-note" data-in="16.6"><span class="m-dot amber"></span>Heat stress: 14 questions this week<em>Demand intelligence</em></div>`) },

  // F. Document Studio, co-branded data sheet
  f: { dur: 20, key: 16, label: 'Document Studio', html: mk(`
    <div class="m-opts" data-in="0.3"><span class="m-chip a">Data sheet</span><span class="m-chip">Co-branded</span><span class="m-chip">EN</span><span class="m-chip" data-in="1.4">AR</span></div>
    <div class="m-paper" data-in="1.4">
      <div class="m-ph"><span class="m-logo" data-in="1.8">Principal A</span><span class="m-x" data-in="2.2">×</span><span class="m-logo me" data-in="2.6">Your brand</span></div>
      <div class="m-pt" data-in="3.2">Heat stress solution for broilers</div>
      <div class="m-sp" data-in="4"><span>Dose</span><b>1,000 g/t</b></div>
      <div class="m-sp" data-in="4.8"><span>Form</span><b>Free-flowing powder</b></div>
      <div class="m-sp" data-in="5.6"><span>Shelf life</span><b>24 months</b></div>
      <div class="m-sp" data-in="6.4"><span>Registration</span><b>SFDA, valid to Feb 2029</b></div>
      <i class="m-ln w9" data-in="7.4"></i><i class="m-ln w7" data-in="7.8"></i>
      <div class="m-pf" data-in="8.6">Sources: TDS v4 p.3 · registration record</div>
    </div>
    <div class="m-act" data-in="10.6"><span class="m-btn">Export PDF</span><span class="m-st"><span class="m-dot sage"></span>Draft for review</span></div>`) },
};

const el = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; };
const ICON_PAUSE = '<svg viewBox="0 0 14 14" width="12" height="12" aria-hidden="true"><path d="M3 2h3v10H3zM8 2h3v10H8z" fill="currentColor"/></svg>';
const ICON_PLAY = '<svg viewBox="0 0 14 14" width="12" height="12" aria-hidden="true"><path d="M3 1.5l9 5.5-9 5.5z" fill="currentColor"/></svg>';

export function initTsgMotion(root) {
  root = root || document;
  const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const cleanups = [];
  const players = [];

  root.querySelectorAll('[data-tsg-scene]').forEach((mount) => {
    const def = SCENES[mount.getAttribute('data-tsg-scene')];
    if (!def || mount.__tsg) return;
    mount.__tsg = true;
    const title = mount.getAttribute('data-title') || 'Animated example';
    mount.innerHTML = '';
    const fig = el(`<div class="tsg-fig" role="img" aria-label="${title}. Animation, described in the text below."><div class="tsg-stage" aria-hidden="true"><div class="m-win"><div class="m-barx"><i></i><i></i><i></i><span class="m-t">${def.label}</span></div><div class="m-body">${def.html}</div></div></div></div>`);
    const ctl = el(`<div class="tsg-ctl"><button type="button" class="tsg-btn" aria-pressed="false"></button><div class="tsg-prog" aria-hidden="true"><i></i></div><span class="tsg-ill">Illustrative</span></div>`);
    mount.appendChild(fig); mount.appendChild(ctl);
    const stage = fig.firstElementChild;
    const btn = ctl.querySelector('button'), bar = ctl.querySelector('.tsg-prog i');

    // collect timeline elements
    const items = [];
    stage.querySelectorAll('[data-in]').forEach((e) => { const [a, b] = e.getAttribute('data-in').split(',').map(Number); items.push({ e, a, b: isNaN(b) ? 1e9 : b, on: null }); });
    const typers = [...stage.querySelectorAll('[data-type]')].map((e) => { const [a, cps] = e.getAttribute('data-type').split(',').map(Number); return { e, a, cps, text: e.getAttribute('data-text'), n: -1 }; });
    const counters = [...stage.querySelectorAll('[data-count]')].map((e) => { const [a, d, to] = e.getAttribute('data-count').split(',').map(Number); return { e, a, d, to, v: -1 }; });
    const grows = [...stage.querySelectorAll('[data-grow]')].map((e) => { const [a, d] = e.getAttribute('data-grow').split(',').map(Number); return { e, a, d, v: -1 }; });
    const hls = [...stage.querySelectorAll('[data-hl]')].map((e) => ({ e, a: Number(e.getAttribute('data-hl')), on: null }));
    const warns = [...stage.querySelectorAll('[data-warn]')].map((e) => ({ e, a: Number(e.getAttribute('data-warn')), on: null }));
    const caret = stage.querySelector('.m-caret');

    const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
    const render = (t) => {
      for (const i of items) { const on = t >= i.a && t < i.b; if (on !== i.on) { i.on = on; i.e.classList.toggle('on', on); } }
      for (const y of typers) { const n = Math.max(0, Math.min(y.text.length, Math.floor((t - y.a) * y.cps))); if (n !== y.n) { y.n = n; y.e.textContent = y.text.slice(0, n); } }
      for (const c of counters) { const v = Math.round(c.to * ease((t - c.a) / c.d)); if (v !== c.v) { c.v = v; c.e.textContent = v; } }
      for (const g of grows) { const v = ease((t - g.a) / g.d); if (Math.abs(v - g.v) > 0.01 || v === 0 || v === 1) { g.v = v; g.e.style.transform = 'scaleX(' + v.toFixed(3) + ')'; } }
      for (const h of hls) { const on = t >= h.a; if (on !== h.on) { h.on = on; h.e.classList.toggle('on', on); } }
      for (const w of warns) { const on = t >= w.a; if (on !== w.on) { w.on = on; w.e.classList.toggle('warn', on); } }
      if (caret) caret.style.display = t < 3 ? 'inline-block' : 'none';
      bar.style.transform = 'scaleX(' + Math.min(1, t / def.dur).toFixed(3) + ')';
    };

    // scale 440px design to the figure width
    const fit = () => { const w = fig.clientWidth || W; stage.style.transform = 'scale(' + (w / W).toFixed(4) + ')'; };
    fit();
    let ro; if (window.ResizeObserver) { ro = new ResizeObserver(fit); ro.observe(fig); } else window.addEventListener('resize', fit);

    const p = { t: 0, inView: false, userPaused: false, started: !mq.matches, raf: 0, last: 0, hold: 0 };
    const playing = () => p.started && !p.userPaused && p.inView && !document.hidden;
    const setBtn = () => {
      const running = p.started && !p.userPaused;
      btn.innerHTML = (running ? ICON_PAUSE : ICON_PLAY) + '<span>' + (running ? 'Pause' : (p.started ? 'Play' : 'Play animation')) + '</span>';
      btn.setAttribute('aria-pressed', String(!running));
      btn.setAttribute('aria-label', (running ? 'Pause' : 'Play') + ' animation: ' + title);
    };
    const tick = (now) => {
      p.raf = 0;
      if (!playing()) return;
      const dt = Math.min(0.1, (now - p.last) / 1000); p.last = now;
      if (p.t >= def.dur) { p.hold += dt; if (p.hold > 1.5) { p.t = 0; p.hold = 0; } }
      else p.t += dt;
      render(Math.min(p.t, def.dur));
      p.raf = requestAnimationFrame(tick);
    };
    const kick = () => { if (!p.raf && playing()) { p.last = performance.now(); p.raf = requestAnimationFrame(tick); } };

    if (mq.matches) { stage.classList.add('still'); p.t = def.key; render(def.key); } else { render(0); }
    setBtn();
    btn.addEventListener('click', () => {
      if (!p.started) { p.started = true; p.userPaused = false; stage.classList.remove('still'); p.t = 0; p.hold = 0; render(0); }
      else p.userPaused = !p.userPaused;
      setBtn(); kick();
    });
    const io = new IntersectionObserver((es) => { p.inView = es[0].isIntersecting; kick(); }, { threshold: 0.35 });
    io.observe(fig);
    const vis = () => kick();
    document.addEventListener('visibilitychange', vis);
    cleanups.push(() => { io.disconnect(); if (ro) ro.disconnect(); document.removeEventListener('visibilitychange', vis); cancelAnimationFrame(p.raf); });
    players.push(p);
  });
  return () => cleanups.forEach((f) => f());
}
