// Dotted nature scenes for the product heroes: a small engine that draws canvas[data-dotscene="name"] as dots in a 440 x 320 space.
// Each scene lives in assets/dotscene-<name>.js and registers itself with DotScene.add(name, function (S) { return function (t) { ... }; }).
// Colours come from --ah-dot (ink), --ah-dot-dim (soft) and --ah-dot-flag (the one accent), set in site.css section 14.
// The drawing is always the same sample: no real figures, only the shapes the product text describes.
(function () {
  var W = 440, H = 320, TAU = 6.2832, GOLD = 2.39996, STILL = 9, SC = {};
  var sin = Math.sin, cos = Math.cos, sqrt = Math.sqrt;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var mix = function (a, b, u) { return a + (b - a) * u; };

  // The drawing kit handed to every scene. Every shape is built from S.dot. Colours: 0 ink, 1 soft, 2 accent.
  function kit(ctx) {
    var cur = -1, S = { col: [], t: 0, el: 99, W: W, H: H, TAU: TAU, mix: mix };
    S.wrap = function (v, m) { return ((v % m) + m) % m; };
    S.reset = function () { cur = -1; };
    S.dot = function (x, y, a, c, r) {
      if (a < 0.03) return;
      if (c !== cur) { ctx.fillStyle = S.col[c]; cur = c; }
      ctx.globalAlpha = a > 1 ? 1 : a;
      ctx.beginPath(); ctx.arc(x, y, (r || 1.6) * 1.15, 0, TAU); ctx.fill();
    };
    // Progress 0 to 1 of an entrance that starts d seconds in and lasts n seconds.
    S.g = function (d, n) { var u = (S.el - d) / n; u = u < 0 ? 0 : u > 1 ? 1 : u; return u * u * (3 - 2 * u); };
    S.line = function (x1, y1, x2, y2, gap, a, c, r) {
      var n = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / gap));
      for (var i = 0; i <= n; i++) S.dot(mix(x1, x2, i / n), mix(y1, y2, i / n), a, c, r);
    };
    S.curve = function (f, n, a, c, r) { for (var i = 0, p; i <= n; i++) { p = f(i / n); S.dot(p[0], p[1], a, c, r); } };
    S.ring = function (x, y, rad, n, a, c, r, rot) { for (var i = 0; i < n; i++) S.dot(x + rad * cos(i * TAU / n + (rot || 0)), y + rad * sin(i * TAU / n + (rot || 0)), a, c, r); };
    // n dots filling a disc, evenly like seeds in a flower; f(x, y, i, q) is called for each, q being 0 at the centre and 1 at the rim.
    S.disc = function (cx, cy, R, n, f) { for (var i = 0, q; i < n; i++) { q = sqrt((i + 0.5) / n); f(cx + R * q * cos(i * GOLD), cy + R * q * sin(i * GOLD), i, q); } };
    // A hill: dots along the ridge h(x), then rows below it that thin out.
    S.hill = function (h, gap, rows, a, c) {
      for (var r = 0, x, y; r < rows; r++) for (x = (r % 2) * gap / 2; x <= W; x += gap) { y = h(x) + r * gap * 0.8; if (y < H + 2) S.dot(x, y, a * (1 - r / rows), c, 1.5); }
    };
    // A bird. f is the wing beat (-1 to 1) or null when perched; s is 1 facing right, -1 facing left.
    S.bird = function (x, y, f, s, a, c) {
      S.dot(x, y, a, c, 2.5); S.dot(x + 4.4 * s, y - 2, a, c, 1.8); S.dot(x - 4.8 * s, y + 1, a, c, 1.4);
      if (f === null) return S.dot(x - 8 * s, y + 2.4, a, c, 1.1);
      S.dot(x - 1 * s, y - 4.5 - f * 4, a, c, 1.6); S.dot(x - 3.6 * s, y - 8 - f * 7, a, c, 1.4); S.dot(x - 6.4 * s, y - 11 - f * 9, a, c, 1.1);
    };
    return S;
  }

  function begin(cv) {
    var ctx = cv.getContext('2d'), S = kit(ctx), draw = SC[cv.dataset.dotscene](S), k = 1, raf = 0, seen = true, t0 = -1;
    function colours() {
      var s = getComputedStyle(cv);
      ['dot', 'dot-dim', 'dot-flag'].forEach(function (n, i) { S.col[i] = s.getPropertyValue('--ah-' + n).trim() || '#888'; });
    }
    function paint(t) {
      ctx.setTransform(k, 0, 0, k, 0, 0); ctx.clearRect(0, 0, W, H); S.reset();
      S.t = reduce.matches ? STILL : t; S.el = reduce.matches ? 99 : t - t0;
      draw(S.t);
      ctx.globalAlpha = 1;
    }
    function size() {
      var r = cv.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2), w = Math.max(1, Math.round(r.width * d)), h = Math.max(1, Math.round(w * H / W));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      k = w / W; colours(); paint(performance.now() / 1000);
    }
    function frame(ms) {
      raf = 0;
      if (!cv.isConnected || !seen || document.hidden || reduce.matches) return;
      paint(ms / 1000); raf = requestAnimationFrame(frame);
    }
    function run() { if (t0 < 0) t0 = performance.now() / 1000; if (!raf && seen && !document.hidden && !reduce.matches) raf = requestAnimationFrame(frame); }
    new ResizeObserver(size).observe(cv);
    // The page framework can strip the canvas size attributes when it re-renders, so redraw when they change.
    new MutationObserver(size).observe(cv, { attributes: true, attributeFilter: ['width', 'height'] });
    new IntersectionObserver(function (e) { seen = e[0].isIntersecting; if (seen) run(); }, { threshold: 0.05 }).observe(cv);
    new MutationObserver(function () { if (cv.isConnected) { colours(); paint(performance.now() / 1000); } }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    document.addEventListener('visibilitychange', run);
    reduce.addEventListener('change', function () { paint(performance.now() / 1000); run(); });
    size(); run();
  }

  // The page framework can rebuild the markup after this script runs, so watch for the canvas as well as looking once.
  function scan() {
    document.querySelectorAll('canvas[data-dotscene]').forEach(function (cv) {
      if (cv.__ds || !SC[cv.dataset.dotscene]) return;
      cv.__ds = 1; begin(cv);
    });
  }
  window.DotScene = { kit: kit, scenes: SC, add: function (name, make) { SC[name] = make; scan(); } };
  scan();
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
})();
