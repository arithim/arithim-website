// Battery siting report: a pond with ripples and a lily pad that marks the site. Four petals grow for grid, planning, land and returns, each
// inside a faint outline of a full score; the shortest (planning) is tipped with the accent dot, which is what could end the site.
DotScene.add('pond', function (S) {
  var sin = Math.sin, cos = Math.cos, PI = 3.1416, CX = 220, CY = 208, RX = 208, RY = 82, PY = 198;
  var P = [[CX, PY + 6, 3.6, 0], [112, 236, 4.6, 0.5], [336, 190, 5.4, 0.25]], V = [72, 48, 66, 56], A = [-46, -16, 16, 46];
  var petal = function (L, ang, a, c, r, n) {
    var dx = sin(ang), dy = -cos(ang), w = 0.22 * L;
    [-1, 0, 1].forEach(function (s, k) {
      if (!s && c) return;
      S.curve(function (u) { var o = s * w * sin(u * PI); return [CX + dx * L * u - dy * o, PY + dy * L * u + dx * o]; }, n, a * (s ? 1 : 0.55), c, r);
    });
  };
  return function (t) {
    var y, x, i, r = 0;
    for (y = CY - RY + 6; y < CY + RY - 3; y += 8.5, r++) {
      var q = (y - CY) / RY, hw = RX * Math.sqrt(1 - q * q);
      for (x = CX - hw + 8 + (r % 2) * 6; x < CX + hw - 6; x += 12) {
        var w = 0, d, rr;
        for (i = 0; i < 3; i++) { d = Math.hypot(x - P[i][0], (y - P[i][1]) / 0.42); rr = S.wrap(t / P[i][2] + P[i][3], 1) * 190; w += Math.exp(-(d - rr) * (d - rr) / 100) * (1 - rr / 190); }
        S.dot(x, y - 1.8 * w, 0.32, 1, 1.5);
        if (w > 0.06) S.dot(x, y - 1.8 * w, Math.min(w, 1) * 0.95, 0, 1.7);
      }
    }
    S.disc(CX, PY + 6, 46, 80, function (px, py) { var dx = px - CX, dy = py - PY - 6; if (dx > 0 && Math.abs(dy) < dx * 0.22) return; S.dot(px, PY + 6 + dy * 0.42, 0.75, 0, 1.6); });
    A.forEach(function (a, i) {
      var g = S.g(0.4 + i * 0.3, 1.8), sway = 0.03 * sin(t * 0.7 + i), ang = (a / 180) * PI + sway;
      petal(122 * g, ang, 0.3, 1, 1.2, 22);
      petal(V[i] * 1.22 * g * (1 + 0.025 * sin(t * 0.9 + i)), ang, 0.95, 0, 1.6, 20);
      if (i === 1) { var L = V[i] * 1.22 * g; S.dot(CX + sin(ang) * L, PY - cos(ang) * L, g, 2, 3.8 + 0.5 * sin(t * 2.4)); }
    });
    [[34, 0], [50, 1.3], [398, 2.1], [414, 0.7]].forEach(function (rd, i) {
      var h = 72 + (i % 3) * 14, b = CY + 14 - (i % 2) * 6;
      S.curve(function (u) { return [rd[0] + 5 * u * u * sin(t * 0.9 + rd[1]), b - h * u]; }, 13, 0.8, 0, 1.5);
      var tx = rd[0] + 5 * sin(t * 0.9 + rd[1]); S.dot(tx, b - h - 2, 1, 0, 2.6); S.dot(tx, b - h - 6, 1, 0, 2.4); S.dot(tx, b - h - 10, 1, 0, 2.1);
    });
    var fx = 90 + 260 * (0.5 + 0.5 * sin(t * 0.23)), fy = 66 + 22 * sin(t * 0.7 + 1), s = cos(t * 0.23) > 0 ? 1 : -1, fl = Math.abs(sin(t * 26));
    S.dot(fx, fy, 1, 0, 2.2);
    for (i = 1; i < 5; i++) S.dot(fx - s * (3 + i * 3.6), fy + 0.4 * i, 0.9, 0, 1.6 - i * 0.2);
    [-1, 1].forEach(function (k) { S.dot(fx - s * 3, fy + k * (4 + 2 * fl), 0.6, 1, 1.4); S.dot(fx - s * 8, fy + k * (6 + 3 * fl), 0.5, 1, 1.3); });
  };
});
