// Dotted globe. Finds canvas[data-dotmap]; data-src points at assets/dotmap-data.json (built by tools/build_dotmap.py).
// Colours come from the CSS custom properties --ah-globe-land, --ah-globe-line, --ah-globe-arc and --ah-globe-node.
(function () {
  var PLACES = [[51.5, -0.1], [40.7, -74], [-23.5, -46.6], [6.5, 3.4], [25.2, 55.3], [19.1, 72.9], [1.35, 103.8], [35.7, 139.7], [-33.9, 151.2], [-26.2, 28]];
  var ARCS = [[0, 1], [0, 5], [1, 2], [0, 3], [5, 6], [6, 8], [7, 1], [4, 9], [3, 2]];
  var RAD = Math.PI / 180, TILT = 20 * RAD, REACH = 0.26;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  function vec(lat, lon) { var a = lat * RAD, o = lon * RAD; return [Math.cos(a) * Math.sin(o), Math.sin(a), Math.cos(a) * Math.cos(o)]; }

  function start(cv) {
    var ctx = cv.getContext('2d'), dots = [], rot = -0.3, raf = 0, seen = true, W = 0, H = 0, dpr = 1, last = 0, col = {};
    var nodes = PLACES.map(function (p) { return vec(p[0], p[1]); });
    var root = document.documentElement;

    function colours() {
      var s = getComputedStyle(cv);
      ['land', 'line', 'arc', 'node'].forEach(function (k) { col[k] = s.getPropertyValue('--ah-globe-' + k).trim() || '#888'; });
    }
    function size() {
      var r = cv.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      cv.width = Math.max(1, Math.round(W * dpr)); cv.height = Math.max(1, Math.round(H * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(performance.now());
    }
    // Spin about the vertical axis, then tilt towards the viewer. Returns [x, y, depth]; depth > 0 faces us.
    function turn(v, r) {
      var c = Math.cos(r), s = Math.sin(r), x = v[0] * c + v[2] * s, z = -v[0] * s + v[2] * c;
      var ct = Math.cos(TILT), st = Math.sin(TILT);
      return [x, v[1] * ct - z * st, v[1] * st + z * ct];
    }
    function draw(t) {
      var R = Math.min(W, H) * 0.46, cx = W / 2, cy = H / 2, i, p, k;
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = col.line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.stroke();
      ctx.fillStyle = col.land;
      var d = Math.max(1.2, R / 105);
      for (i = 0; i < dots.length; i++) {
        p = turn(dots[i], rot);
        if (p[2] <= 0) continue;
        ctx.globalAlpha = 0.25 + 0.75 * p[2];
        ctx.fillRect(cx + p[0] * R - d / 2, cy - p[1] * R - d / 2, d, d);
      }
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1.4; ctx.strokeStyle = col.arc; ctx.lineCap = 'round';
      for (k = 0; k < ARCS.length; k++) arc(ARCS[k], k, t, R, cx, cy);
      ctx.fillStyle = col.node;
      for (i = 0; i < nodes.length; i++) {
        p = turn(nodes[i], rot);
        if (p[2] <= 0.05) continue;
        ctx.beginPath(); ctx.arc(cx + p[0] * R, cy - p[1] * R, 2.4, 0, 6.2832); ctx.fill();
      }
    }
    // Great circle between two places, lifted off the surface in the middle. The head travels along it and the tail fades.
    function arc(pair, k, t, R, cx, cy) {
      var a = nodes[pair[0]], b = nodes[pair[1]], dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
      var om = Math.acos(Math.max(-1, Math.min(1, dot))), so = Math.sin(om), N = 28, head, tail, j, u, f, g, h, v, q, prev = null;
      if (reduce.matches) { head = 1; tail = 0; }
      else { var ph = ((t / 5200) + k * 0.37) % 1.6; head = Math.min(ph / 0.9, 1); tail = Math.max(0, (ph - 0.6) / 1); tail = Math.min(tail, head); }
      for (j = 0; j <= N; j++) {
        u = j / N;
        if (u < tail || u > head) { prev = null; continue; }
        f = Math.sin((1 - u) * om) / so; g = Math.sin(u * om) / so; h = 1 + REACH * Math.sin(u * Math.PI) * om / 3.14;
        v = [(a[0] * f + b[0] * g) * h, (a[1] * f + b[1] * g) * h, (a[2] * f + b[2] * g) * h];
        q = turn(v, rot);
        if (q[2] <= 0) { prev = null; continue; }
        ctx.globalAlpha = reduce.matches ? 0.7 : 0.25 + 0.75 * ((u - tail) / Math.max(0.001, head - tail));
        if (prev) { ctx.beginPath(); ctx.moveTo(cx + prev[0] * R, cy - prev[1] * R); ctx.lineTo(cx + q[0] * R, cy - q[1] * R); ctx.stroke(); }
        prev = q;
      }
      ctx.globalAlpha = 1;
    }
    function frame(t) {
      raf = 0;
      if (!cv.isConnected) return;
      if (!seen || document.hidden || reduce.matches) return;
      rot += last ? Math.min(t - last, 60) * 0.00008 : 0;
      last = t;
      draw(t);
      raf = requestAnimationFrame(frame);
    }
    function run() { if (!raf && seen && !document.hidden && !reduce.matches) { last = 0; raf = requestAnimationFrame(frame); } }

    fetch(cv.dataset.src).then(function (r) { return r.json(); }).then(function (m) {
      m.rows.forEach(function (row) {
        for (var i = 2; i < row.length; i += 2) for (var n = 0; n < row[i + 1]; n++) dots.push(vec(row[0], -180 + (row[i] + n + 0.5) * 360 / row[1]));
      });
      colours(); size(); run();
    }).catch(function () {});

    new ResizeObserver(size).observe(cv);
    new IntersectionObserver(function (e) { seen = e[0].isIntersecting; if (seen) run(); }, { threshold: 0.05 }).observe(cv);
    new MutationObserver(function () { colours(); draw(performance.now()); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    document.addEventListener('visibilitychange', run);
    reduce.addEventListener('change', function () { reduce.matches ? draw(0) : run(); });
  }

  // The page framework can rebuild the markup after this script runs, so watch for the canvas as well as looking once.
  function scan() { document.querySelectorAll('canvas[data-dotmap]').forEach(function (cv) { if (!cv.__dm) { cv.__dm = 1; start(cv); } }); }
  scan();
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
})();
