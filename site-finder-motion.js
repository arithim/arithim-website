// Site Finder explainers: short looping scenes drawn in HTML and CSS, driven by one timeline.
// Mount points are <div data-sf-scene="j1|j2|j3|f1|f2|f3|f4">. Same approach as tsg-motion.js.
// All names and figures on screen illustrate the interface on the launch data.
const W = 400, H = 440;
const mk = (s) => s.replace(/\n\s*/g, '');
const A = (x, y, w, h, c, i, at) => `<div class="s-a ${c || ''}" style="left:${x}px;top:${y}px;width:${w}px;${h ? 'height:' + h + 'px' : ''}" ${at || ''}>${i || ''}</div>`;
const lbl = (x, y, t, at) => A(x, y, 376, 0, 's-lbl', t, at);
const row = (x, y, n, name, sub, sc, at, c) => A(x, y, 376, 42, 's-row ' + (c || ''), `<span class="s-rk">${n}</span><div class="s-rn"><b>${name}</b><small>${sub}</small></div><span class="s-sc">${sc}</span>`, at);

// Hex layer: pointy hexes in four score bands, one path per band. Deterministic, so every loop looks the same.
function hexes(w, h, r) {
  const dx = Math.sqrt(3) * r, dy = 1.5 * r, d = ['', '', '', ''];
  for (let j = 0; dy * j < h + r; j++) for (let i = 0; dx * i < w + r; i++) {
    const cx = dx * i + (j % 2 ? dx / 2 : 0), cy = dy * j + r * 0.4;
    const v = (Math.sin(i * 1.3 + j * 0.9) + Math.cos(j * 2.1 - i * 0.5) + 2) / 4;
    let p = '';
    for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; p += (k ? 'L' : 'M') + (cx + (r - 1) * Math.cos(a)).toFixed(1) + ' ' + (cy + (r - 1) * Math.sin(a)).toFixed(1); }
    d[Math.min(3, Math.floor(v * 4))] += p + 'Z';
  }
  const f = ['.07', '.16', '.3', '.5'];
  return `<svg class="s-hex" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">${d.map((p, k) => `<path d="${p}" fill="rgba(232,161,60,${f[k]})"/>`).join('')}</svg>`;
}
const credit = '<em>OpenFreeMap, OpenMapTiles, OpenStreetMap</em>';
const mkr = (x, y, n, at, c) => A(x - 10, y - 10, 20, 20, 's-mk ' + (c || ''), n, at);
const chip = (t, c, at) => `<span class="m-chip ${c || ''}" ${at || ''}>${t}</span>`;
const bars = (items, x, y, t0, gap) => items.map(([n, w], k) => A(x, y + k * 18, 376, 16, 's-wf', `<span>${n}</span><i><u data-grow="${t0 + k * gap},0.8" style="--w:${w}%"></u></i>`)).join('');

const SCENES = {
  j1: { dur: 11, key: 10, label: 'Site Finder · answer', html: mk(`
    ${A(12, 8, 376, 34, 's-q', '<span data-type="0.2,30" data-text="Where should we build next?"></span><b class="m-caret"></b>')}
    ${A(12, 47, 376, 24, 's-chips', chip('50 MWp') + chip('auto connection') + chip('CfD') + chip('6.5% hurdle'), 'data-in="1.2"')}
    ${A(12, 78, 376, 48, 's-verdict', '<b><u data-count="2.4,1.2,8">8</u> of the top 20 sites are deliverable</b><small>Price, red flags and score all pass</small>', 'data-in="2.2"')}
    ${A(12, 134, 376, 120, 's-map', hexes(376, 120, 13) + credit, 'data-in="2.6"')}
    ${mkr(267, 188, 1, 'data-in="4" data-cls="7.5,99,hot"')}
    ${mkr(107, 222, 2, 'data-in="5"')} ${mkr(330, 234, 3, 'data-in="6"')} ${mkr(177, 180, 4, 'data-in="6.6"', 'q')} ${mkr(74, 174, 5, 'data-in="6.9"', 'q')}
    ${row(12, 262, 1, 'Hulcott, Buckinghamshire', 'CfD · needs £57.1 vs £65.23', '0.84', 'data-in="3.6" data-cls="7.5,99,hot"')}
    ${row(12, 308, 2, 'Stone Street, East Suffolk', 'CfD · needs £60.5 vs £65.23', '0.83', 'data-in="4.6"')}
    ${row(12, 354, 3, 'Belchamp St Paul, Braintree', 'CfD · needs £59.7 vs £65.23', '0.82', 'data-in="5.6"')}`) },

  j2: { dur: 12.5, key: 11.5, label: 'Site Finder · evidence', html: mk(`
    ${row(12, 8, 1, 'Hulcott, Buckinghamshire', 'CfD · needs £57.1 vs £65.23', '0.84', 'data-cls="0.4,99,hot"')}
    ${A(0, 58, 400, 350, 's-drawer s-mv', `
      <div class="s-dh"><b>Hulcott, Buckinghamshire</b><span>Score 0.84</span></div>
      <div class="s-sub">SCORE WATERFALL</div>
      ${bars([['Grid', 92], ['Planning', 78], ['Solar and terrain', 84], ['Economics', 88], ['Deliverability', 80], ['Environment', 70]], 12, 50, 1.9, 0.25)}
      ${A(12, 166, 376, 46, 's-card', '<span class="m-dot sage"></span><div class="s-rn"><b>Aylesbury East Grid 33kV</b><small>0.5 km · capacity ok</small></div><span class="s-tag">Substation</span>', 'data-in="4.2"')}
      ${A(12, 218, 376, 40, 's-card', '<span class="m-dot amber"></span><div class="s-rn"><b>Planning record</b><small>Authority decisions and nearby schemes</small></div>', 'data-in="5.4"')}
      ${A(12, 264, 376, 76, 's-card s-eco', `<div class="s-ec"><small>Needs</small><b data-count="6.8,1.2,57.1,0,1" data-pre="£">£0.0</b><small>/MWh</small></div><div class="s-ec"><small>CfD</small><b>£65.23</b><small>/MWh</small></div>
        <div class="s-gap"><i style="width:88%"></i></div><span class="s-ok">Needs £57.1 vs £65.23</span>`, 'data-in="6.4"')}
    `, 'data-mv="0,0,360;0.8,0,0"')}`) },

  j3: { dur: 14, key: 13, label: 'Site Finder · challenge', html: mk(`
    ${lbl(12, 8, 'RANKED LIST')}
    ${[['Hulcott, Buckinghamshire', '£57.1', 0, 3], ['Stone Street, East Suffolk', '£60.5', 1, 0], ['Belchamp St Paul, Braintree', '£59.7', 2, 1], ['Weedon, Buckinghamshire', '£60.9', 3, 2]].map(([n, p, s, to]) =>
      A(12, 28 + s * 42, 376, 38, 's-mv', `<div class="s-row s-r2" ${s === 0 ? 'data-cls="6,99,bad"' : ''}><span class="s-rk" data-sw="0|${s + 1};6|${to + 1}">${s + 1}</span><div class="s-rn"><b>${n}</b></div>${s === 0 ? '<em class="s-flag" data-in="6.4">Full</em>' : ''}<span class="s-sc">${p}</span></div>`,
        `data-mv="5.8,0,${(to - s) * 42}"`)).join('')}
    ${A(12, 198, 376, 42, 's-card', '<span class="m-dot sage"></span><div class="s-rn"><b>Aylesbury East Grid 33kV</b><small>Grid tab · 0.5 km</small></div><span class="s-btn2" data-cls="1.4,99,on">Challenge</span>', 'data-in="0.4"')}
    ${A(12, 248, 376, 156, 's-form', `
      <div class="s-sub">MARK THIS SUBSTATION AS</div>
      <div class="s-chips">${chip('Available')}${chip('Full', '', 'data-cls="2.2,99,a"')}${chip('Tight')}</div>
      <div class="s-sub">NOTE</div>
      <div class="s-note"><span data-type="2.8,26" data-text="Operator says no spare capacity"></span></div>
      <span class="s-btn2 s-go" data-cls="4.8,99,on">Rescore</span>`, 'data-in="1.8,6.2"')}
    ${A(12, 248, 376, 156, 's-wc', `
      <div class="s-dh"><b>What changed</b><span>You marked Aylesbury East full</span></div>
      <p data-in="7.2"><b>Hulcott, Buckinghamshire</b><span>1 to 4</span></p>
      <p data-in="7.8"><b>Stone Street, East Suffolk</b><span>2 to 1</span></p>
      <p data-in="8.4"><b>Belchamp St Paul, Braintree</b><span>3 to 2</span></p>
      <p data-in="9"><b>Weedon, Buckinghamshire</b><span>4 to 3</span></p>`, 'data-in="6.6"')}`) },

  f1: { dur: 12.5, key: 11.5, label: 'Site Finder · Gate 2', html: mk(`
    ${lbl(12, 8, 'GATE 2 ZONE CAPACITY FOR SOLAR')}
    ${A(12, 28, 376, 34, 's-big', '<b data-sw="0|134.6;2.4|94.6;4.2|54.6;6|14.6">134.6</b><span>MW left</span>')}
    ${A(12, 70, 376, 22, 's-track', `
      ${[0, 1, 2].map((k) => `<i class="s-seg" style="left:${k * 111.7}px;width:111.7px" data-grow="${2.2 + k * 1.8},0.6"><b>${k + 1}</b></i>`).join('')}
      <i class="s-over" style="left:335px;width:41px" data-in="7.6"></i>`)}
    ${A(12, 96, 376, 0, 's-cap2', 'Spent in rank order')}
    ${row(12, 126, 1, 'Hulcott, Buckinghamshire', '40 MWac', '<em class="s-fit">Fits</em>', 'data-in="1.6"')}
    ${row(12, 172, 2, 'Stone Street, East Suffolk', '40 MWac', '<em class="s-fit">Fits</em>', 'data-in="3.4"')}
    ${row(12, 218, 3, 'Belchamp St Paul, Braintree', '40 MWac', '<em class="s-fit">Fits</em>', 'data-in="5.2"')}
    ${A(12, 304, 376, 98, 's-next', '<span>NEEDS NEXT WINDOW</span>', 'data-in="8.8"')}
    ${A(12, 264, 376, 42, 's-mv', `<div class="s-row" data-in="6.2" data-cls="7.6,99,nf"><span class="s-rk">4</span><div class="s-rn"><b>Weedon, Buckinghamshire</b><small data-sw="0|40 MWac;7.6|40 MWac, only 14.6 MW left;9|Later energisation year">40 MWac</small></div><em class="s-nf" data-in="7.6">No fit</em></div>`, 'data-mv="9,0,78"')}`) },

  f2: { dur: 13, key: 12, label: 'Site Finder · planning record', html: mk(`
    ${A(12, 8, 376, 22, 's-th', '<span>Local authority</span><span>Share approved</span>')}
    ${[['Wiltshire', 92], ['East Suffolk', 85], ['Buckinghamshire', 78], ['Braintree', 70], ['Horsham', 64], ['Lewes', 58]].map(([n, p], k) =>
      A(12, 32 + k * 27, 376, 25, 's-lg', `<span>${n}</span><i><u data-grow="${0.6 + k * 0.2},0.8" style="--w:${p}%"></u></i>`, `data-in="${0.3 + k * 0.2}" ${k === 0 ? 'data-cls="3,99,sel"' : ''}`)).join('')}
    ${A(12, 198, 376, 206, 's-card s-det', `
      <div class="s-dh"><b>Wiltshire</b><span>Planning record</span></div>
      <p class="s-big2">Approved <b>11 of 12</b> solar schemes since 2019, median <b>9 months</b></p>
      <div class="s-sub">DECISIONS PER YEAR, 2019 TO 2025</div>
      <div class="s-tr">${[18, 26, 22, 30, 34, 28, 36].map((h, k) => `<u data-grow="${5 + k * 0.3},0.5,y" style="height:${h}px"></u>`).join('')}</div>
      <div class="s-warn2">Historic approval rate in this authority, not a prediction for a specific scheme.</div>`, 'data-in="3.4"')}`) },

  f3: { dur: 12, key: 11, label: 'Site Finder · red flags', html: mk(`
    ${[['Score before flags', '0.83', 100, 0], ['× 0.90 refused scheme 1.4 km away', '0.75', 90, 1], ['× 0.94 National Park or AONB setting', '0.70', 84, 2], ['× 0.93 listed building 0 m away', '0.65', 78, 3]].map(([n, v, w, k]) =>
      A(12, 6 + k * 40, 376, 36, 's-fl' + (k === 1 ? ' key' : ''), `<span>${n}</span><b>${v}</b><i><u data-grow="${0.5 + k * 0.7},0.7" style="--w:${w}%"></u></i>`, `data-in="${0.3 + k * 0.7}" ${k === 1 ? 'data-cls="3.6,99,hot"' : ''}`)).join('')}
    ${A(12, 170, 376, 20, 's-sc2', 'Smeeth, Ashford · score after flags <b data-count="3.4,0.8,0.65,0.83,2">0.83</b>', 'data-in="3"')}
    ${A(12, 196, 376, 208, 's-map', hexes(376, 208, 14) + credit, 'data-in="4"')}
    ${A(86, 304, 60, 0, 's-pin', '<b></b>Site', 'data-in="4.4"')}
    ${A(142, 312, 116, 0, 's-line', '', 'data-in="5.2"')}
    ${A(158, 288, 90, 0, 's-dist', '1.4 km', 'data-in="5.8"')}
    ${A(258, 282, 126, 64, 's-bad', '<b>Refused</b><small>East Stour Solar Farm, 49.9 MW</small>', 'data-in="5"')}`) },

  f4: { dur: 13, key: 12, label: 'Site Finder · economics', html: mk(`
    ${lbl(12, 8, 'PROJECT SIZE')}
    ${A(12, 28, 376, 32, 's-big', '<b><u data-count="1,4,110,90">90</u> MWac</b>')}
    ${A(12, 76, 376, 40, 's-slider', '<i></i><span class="s-tick"><em>100 MWac</em></span><b data-lerp="1,4,0,356"></b>')}
    ${A(12, 130, 376, 66, 's-card s-rt', '<small>CONSENT ROUTE</small><b data-sw="0|Local planning authority;3|NSIP, Development Consent Order">Local planning authority</b>')}
    ${A(12, 204, 376, 70, 's-card s-npv', '<small>NPV AT THE HURDLE</small><b data-sw="0|+£8.5m;3|−£0.1m" data-cls="3,99,neg">+£8.5m</b>')}
    ${A(12, 284, 376, 116, 's-thr', '<b>Size threshold</b><p>At 100 MWac the project moves from the local planning route to the NSIP route. NPV changes from <span style="white-space:nowrap">+£8.5m</span> to <span style="white-space:nowrap">−£0.1m</span>.</p>', 'data-in="3.3"')}`) },
};

const el = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; };
const ICON_PAUSE = '<svg viewBox="0 0 14 14" width="12" height="12" aria-hidden="true"><path d="M3 2h3v10H3zM8 2h3v10H8z" fill="currentColor"/></svg>';
const ICON_PLAY = '<svg viewBox="0 0 14 14" width="12" height="12" aria-hidden="true"><path d="M3 1.5l9 5.5-9 5.5z" fill="currentColor"/></svg>';
const nums = (e, n) => e.getAttribute(n).split(',').map((v) => (isNaN(Number(v)) ? v : Number(v)));
const lin = (x) => Math.min(1, Math.max(0, x));

export function initSfMotion(root) {
  root = root || document;
  const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const cleanups = [];

  root.querySelectorAll('[data-sf-scene]').forEach((mount) => {
    const def = SCENES[mount.getAttribute('data-sf-scene')];
    if (!def || mount.__sf) return;
    mount.__sf = true;
    const title = mount.getAttribute('data-title') || 'Animated example';
    mount.innerHTML = '';
    const fig = el(`<div class="tsg-fig sf-sfig" role="img" aria-label="${title}. Animation using illustrative figures; a text description follows."><div class="tsg-stage" aria-hidden="true"><div class="m-win"><div class="m-barx"><i></i><i></i><i></i><span class="m-t">${def.label}</span></div><div class="s-body">${def.html}</div></div></div></div>`);
    const ctl = el(`<div class="tsg-ctl"><button type="button" class="tsg-btn" aria-pressed="false"></button><div class="tsg-prog" aria-hidden="true"><i></i></div><span class="tsg-ill">Illustrative</span></div>`);
    mount.appendChild(fig); mount.appendChild(ctl);
    const stage = fig.firstElementChild;
    const btn = ctl.querySelector('button'), bar = ctl.querySelector('.tsg-prog i');
    const all = (a) => [...stage.querySelectorAll('[' + a + ']')];

    const ins = all('data-in').map((e) => { const [a, b] = nums(e, 'data-in'); return { e, a, b: b === undefined ? 1e9 : b, on: null }; });
    const clss = all('data-cls').map((e) => { const [a, b, c] = nums(e, 'data-cls'); return { e, a, b, c, on: null }; });
    const typers = all('data-type').map((e) => { const [a, cps] = nums(e, 'data-type'); return { e, a, cps, text: e.getAttribute('data-text'), n: -1 }; });
    const counts = all('data-count').map((e) => { const [a, d, to, from, dp] = nums(e, 'data-count'); return { e, a, d, to, from: from || 0, dp: dp || 0, pre: e.getAttribute('data-pre') || '', v: null }; });
    const grows = all('data-grow').map((e) => { const [a, d, ax] = nums(e, 'data-grow'); return { e, a, d, y: ax === 'y', v: -1 }; });
    const lerps = all('data-lerp').map((e) => { const [a, d, x0, x1] = nums(e, 'data-lerp'); return { e, a, d, x0, x1, v: -1 }; });
    const mvs = all('data-mv').map((e) => ({ e, st: e.getAttribute('data-mv').split(';').map((s) => s.split(',').map(Number)), k: -2 }));
    const sws = all('data-sw').map((e) => ({ e, st: e.getAttribute('data-sw').split(';').map((s) => { const i = s.indexOf('|'); return [Number(s.slice(0, i)), s.slice(i + 1)]; }), k: -2 }));

    const render = (t) => {
      for (const i of ins) { const on = t >= i.a && t < i.b; if (on !== i.on) { i.on = on; i.e.classList.toggle('on', on); } }
      for (const c of clss) { const on = t >= c.a && t < c.b; if (on !== c.on) { c.on = on; c.e.classList.toggle(c.c, on); } }
      for (const y of typers) { const n = Math.max(0, Math.min(y.text.length, Math.floor((t - y.a) * y.cps))); if (n !== y.n) { y.n = n; y.e.textContent = y.text.slice(0, n); } }
      for (const c of counts) { const v = (c.from + (c.to - c.from) * lin((t - c.a) / c.d)).toFixed(c.dp); if (v !== c.v) { c.v = v; c.e.textContent = c.pre + v; } }
      for (const g of grows) { const v = lin((t - g.a) / g.d); if (v !== g.v) { g.v = v; g.e.style.transform = (g.y ? 'scaleY(' : 'scaleX(') + v.toFixed(3) + ')'; } }
      for (const l of lerps) { const v = lin((t - l.a) / l.d); if (v !== l.v) { l.v = v; l.e.style.transform = 'translateX(' + (l.x0 + (l.x1 - l.x0) * v).toFixed(1) + 'px)'; } }
      for (const m of mvs) { let k = -1; m.st.forEach((s, j) => { if (t >= s[0]) k = j; }); if (k !== m.k) { m.k = k; m.e.style.transform = k < 0 ? '' : 'translate(' + m.st[k][1] + 'px,' + m.st[k][2] + 'px)'; } }
      for (const w of sws) { let k = 0; w.st.forEach((s, j) => { if (t >= s[0]) k = j; }); if (k !== w.k) { w.k = k; w.e.textContent = w.st[k][1]; } }
      bar.style.transform = 'scaleX(' + Math.min(1, t / def.dur).toFixed(3) + ')';
    };

    const fit = () => {
      stage.style.width = W + 'px'; stage.style.height = H + 'px';
      stage.style.transform = 'scale(' + ((fig.clientWidth || W) / W).toFixed(4) + ')';
    };
    fit();
    let ro; if (window.ResizeObserver) { ro = new ResizeObserver(fit); ro.observe(fig); } else window.addEventListener('resize', fit);

    const p = { t: def.key, inView: false, userPaused: false, started: !mq.matches, raf: 0, last: 0, hold: 0 };
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
      if (p.t >= def.dur) { p.hold += dt; if (p.hold > 1.4) { p.t = 0; p.hold = 0; } }
      else p.t += dt;
      render(Math.min(p.t, def.dur));
      p.raf = requestAnimationFrame(tick);
    };
    const kick = () => { if (!p.raf && playing()) { p.last = performance.now(); p.raf = requestAnimationFrame(tick); } };

    if (mq.matches) stage.classList.add('still');
    render(def.key);
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
  });
  return () => cleanups.forEach((f) => f());
}
