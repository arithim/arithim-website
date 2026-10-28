// Site feasibility report: a plot of land seen from above and slightly aside. Survey stakes rise at its four corners and a string line joins them,
// contour rings settle inward over the ground, and four dotted gauges fill for grid, planning, land and economics. One stake carries a pennant,
// the accent dot, for the one thing the verdict turns on. A bird drifts over, calm and unhurried.
DotScene.add('plotsurvey', function (S) {
  var sin = Math.sin, cos = Math.cos, PI = 3.1416, Q = [[92, 226], [210, 176], [356, 208], [238, 276]], V = [0.82, 0.38, 0.66, 0.9], R = [74, 54, 36, 20, 7];
  var back = function (x) { return 150 - 16 * sin(x / 64 + 1) - 6 * sin(x / 19); };
  return function (t) {
    var i, k;
    S.hill(back, 14, 2, 0.35, 1);
    // gauges: a faint half dial each, filled in ink up to its value, with a needle that settles
    V.forEach(function (v, j) {
      var cx = 62 + j * 105, cy = 100, g = S.g(1.6 + j * 0.45, 1.6), n = 24, a;
      for (i = 0; i <= n; i++) {
        a = PI + PI * i / n;
        S.dot(cx + 32 * cos(a), cy + 32 * sin(a), 0.3, 1, 1.3);
        if (i / n <= v * g) S.dot(cx + 32 * cos(a), cy + 32 * sin(a), 0.95, 0, 1.8);
      }
      a = PI + PI * v * g + 0.04 * sin(t * 1.2 + j);
      S.line(cx, cy, cx + 20 * cos(a), cy + 20 * sin(a), 4.5, 0.75, 0, 1.3); S.dot(cx, cy, 1, 0, 2.4);
      S.dot(cx - 32, cy + 7, 0.4, 1, 1.2); S.dot(cx + 32, cy + 7, 0.4, 1, 1.2);
    });
    // the ground, a faint lattice inside the plot, then contour rings that tighten into place
    var cx = 224, cy = 226, e = S.g(0.2, 1.8);
    S.disc(cx, cy + 4, 84, 120, function (x, y, k) { var dy = (y - cy - 4) * 0.42; S.dot(x, cy + 4 + dy, 0.2, 1, 1.2); });
    R.forEach(function (r, j) {
      var g = S.g(0.4 + j * 0.3, 1.8), rr = r * (1 + 0.7 * (1 - g)) * (1 + 0.025 * sin(t * 0.8 + j));
      S.curve(function (u) { var a = u * 2 * PI, w = 1 + 0.07 * sin(a * 3 + j * 2); return [cx + rr * w * cos(a), cy + rr * w * 0.42 * sin(a)]; }, Math.round(8 + r * 0.7), 0.85 * g * (j % 2 ? 0.7 : 1), 0, 1.5);
    });
    // string line along the plot edge, then the stakes
    Q.forEach(function (p, j) {
      var n = Q[(j + 1) % 4], g = S.g(0.5 + j * 0.4, 1.0), g2 = S.g(2.2 + j * 0.2, 1);
      S.line(p[0], p[1], S.mix(p[0], n[0], g), S.mix(p[1], n[1], g), 6, 0.8, 0, 1.4);
      S.line(p[0], p[1] - 22 * g, S.mix(p[0], n[0], g2), S.mix(p[1] - 22 * g, n[1] - 22 * g, g2), 7, 0.6, 1, 1.3);
    });
    Q.forEach(function (p, j) {
      var g = S.g(0.3 + j * 0.4, 0.7), top = p[1] - 22 * g;
      S.line(p[0], p[1], p[0], top, 4.5, 0.95, 0, 1.6); S.dot(p[0], top - 3, g, 0, 2.6);
      if (j === 2) {
        var f = S.g(2.4, 0.8);
        S.line(p[0], top - 4, p[0], top - 34 * f, 4.5, 0.9, 0, 1.4);
        for (i = 0; i < 4; i++) S.dot(p[0] + 4 + i * 5, top - 32 * f + i * 2.4 + 2.6 * sin(t * 3 - i * 0.9) * (i / 3), f, 2, 3.6 - i * 0.55);
        S.dot(p[0], top - 35 * f, f, 2, 2.4);
      }
    });
    var bx = S.wrap(60 + t * 11, S.W + 100) - 50, by = 48 + 8 * sin(t * 0.6);
    S.bird(bx, by, sin(t * 11), 1, 0.85, 0);
  };
});
