// Short looping feature animations. Each svg[data-fanim] holds elements with data-t (seconds in when they appear) and optional data-off
// (seconds when they leave). The loop is data-cycle seconds long; the scene fades out for the last 0.7 s, so every element can reset unseen.
// Numbers that count up carry data-count="from,to,start,end". The scenes are written by tools/feature_anim.py and styled in site.css.
// Without script, or with reduced motion, the scene shows the frame at data-freeze, so it always reads as a finished picture.
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var fmt = function (v, dec) { return v.toLocaleString('en-GB', { minimumFractionDigits: dec, maximumFractionDigits: dec }); };

  function mount(svg) {
    if (svg.__fa) return;
    svg.__fa = 1;
    
    var stage = svg.querySelector('.fa-stage');
    if (stage) stage.classList.add('fa-live');
    [].forEach.call(svg.querySelectorAll('[data-dx]'), function (el) {
      el.style.setProperty('--dx', el.dataset.dx + 'px'); el.style.setProperty('--dy', el.dataset.dy + 'px');
      if (el.dataset.dl) { el.style.setProperty('--dl', el.dataset.dl + 's'); el.style.setProperty('--du', el.dataset.du + 's'); }
    });
    var items = [].slice.call(svg.querySelectorAll('[data-t]')).map(function (el) {
      return { el: el, on: +el.dataset.t, off: el.dataset.off ? +el.dataset.off : 1e9 };
    });
    var counts = [].slice.call(svg.querySelectorAll('[data-count]')).map(function (el) {
      var a = el.dataset.count.split(',').map(Number);
      return { el: el, from: a[0], to: a[1], t0: a[2], t1: a[3], dec: +el.dataset.dec || 0, pre: el.dataset.pre || '', suf: el.dataset.suf || '' };
    });
    var cycle = +svg.dataset.cycle || 9, freeze = +svg.dataset.freeze || cycle - 1.6, timer = 0, t0 = 0;

    function paint(t) {
      items.forEach(function (i) { i.el.classList.toggle('on', t >= i.on && t < i.off); });
      counts.forEach(function (c) {
        var u = (t - c.t0) / (c.t1 - c.t0); u = u < 0 ? 0 : u > 1 ? 1 : u; u = 1 - Math.pow(1 - u, 3);
        c.el.textContent = c.pre + fmt(c.from + (c.to - c.from) * u, c.dec) + c.suf;
      });
    }
    function tick() {
      var t = ((performance.now() - t0) / 1000) % cycle;
      if (stage) stage.classList.toggle('fa-fade', t > cycle - 0.7);
      paint(t);
    }
    function play() { if (timer) return; t0 = performance.now(); timer = setInterval(tick, 80); tick(); }
    function stop() { clearInterval(timer); timer = 0; }
    function still() { stop(); if (stage) stage.classList.remove('fa-fade'); paint(freeze); }

    if (reduce.matches || !('IntersectionObserver' in window)) { still(); }
    else {
      new IntersectionObserver(function (es) { es[0].isIntersecting ? play() : stop(); }, { threshold: 0.25 }).observe(svg);
      paint(freeze);
    }
    reduce.addEventListener && reduce.addEventListener('change', function () { reduce.matches ? still() : play(); });
  }

  function scan() { [].forEach.call(document.querySelectorAll('svg[data-fanim]'), mount); }
  scan();
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
})();
