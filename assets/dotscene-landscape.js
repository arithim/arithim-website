// Site finder: a dotted rolling landscape of hex cells under a sun, a wind turbine and a battery shed. A breeze sweeps across the cells and
// three sites settle as ranked plots with dot numerals 1 2 3, each on a thin dotted grid line from a pylon. One cell is fenced off, ruled
// out, and carries the accent dot. A bird circles the winner.
DotScene.add('landscape', function (S) {
  var sin = Math.sin, cos = Math.cos, PI = 3.1416, R = 19, DX = 32.9, O = [24, 158];
  var G = { 1: [4, 12, 4, 4, 4, 4, 14], 2: [14, 17, 1, 6, 8, 16, 31], 3: [30, 1, 1, 14, 1, 1, 30] };
  var SITE = [[7, 1, 34], [3, 3, 24], [10, 2, 16]], FENCE = [5, 2];
  var roll = function (x) { return 8 * sin(x / 55) + 4 * sin(x / 23 + 1); };
  var cell = function (c, r) { var x = 18 + c * DX + (r % 2) * DX / 2; return [x, 168 + r * 28.5 + roll(x)]; };
  var vert = function (c, r, k) { var m = cell(c, r), x = m[0] + R * cos(-PI / 2 + k * PI / 3); return [x, m[1] - roll(m[0]) + roll(x) + R * sin(-PI / 2 + k * PI / 3)]; };
  return function (t) {
    var c, r, k, i, xb = S.wrap(t * 38, S.W + 160) - 80;
    // the cells, lifted a little where the breeze passes
    var lift = function (v) { var w = Math.exp(-(v[0] - xb) * (v[0] - xb) / 1800); return [v[0], v[1] - 3 * w, w]; };
    for (r = 0; r < 6; r++) for (c = 0; c < 14; c++) for (k = 0; k < (c && r ? 3 : 6); k++) {
      var p = lift(vert(c, r, k)), q = lift(vert(c, r, (k + 1) % 6));
      S.line(p[0], p[1], q[0], q[1], 6, (0.3 + 0.5 * (p[2] + q[2]) / 2) * S.g(0.05 * c, 1), 1, 1.1);
    }
    for (k = 0; k < 3; k++) for (i = 0; i < 9; i++) S.dot(xb - 4 - i * 5.5 - k * 9, 92 + k * 16 + 4 * sin(i * 0.8 + t * 2 + k), 0.55 * (1 - i / 9), 1, 1.2);
    // sun, turbine and battery shed
    var sg = S.g(0.2, 1.2);
    S.disc(76, 58, 11, 28, function (x, y) { S.dot(x, y, 0.9 * sg, 0, 1.3); }); S.ring(76, 58, 17, 12, 0.6 * sg, 0, 1.4, t * 0.2); S.ring(76, 58, 25, 18, 0.35 * sg, 1, 1.2, -t * 0.1);
    var wg = S.g(0.5, 1.2);
    S.line(340, 156, 340, 156 - 56 * wg, 4.5, 0.9 * wg, 0, 1.6);
    for (i = 0; i < 3; i++) S.line(340, 100, 340 + 27 * cos(t * 0.9 + i * 2.0944) * wg, 100 + 27 * sin(t * 0.9 + i * 2.0944) * wg, 5, 0.85 * wg, 0, 1.4);
    S.dot(340, 100, wg, 0, 2.4);
    var bg = S.g(0.8, 1);
    S.line(386, 156, 418, 156, 4.5, 0.9 * bg, 0, 1.6); S.line(386, 156, 386, 138, 4.5, 0.9 * bg, 0, 1.6); S.line(418, 156, 418, 138, 4.5, 0.9 * bg, 0, 1.6); S.line(386, 138, 418, 138, 4.5, 0.9 * bg, 0, 1.6);
    for (i = 0; i < 3; i++) S.line(393 + i * 8, 152, 393 + i * 8, 152 - 10 * (0.5 + 0.5 * sin(t * 0.8 + i * 1.3)), 3.5, 0.8 * bg, 1, 1.3);
    // pylon at the left and a thin dotted line to each ranked site
    var pg = S.g(1, 1);
    S.line(14, 188, O[0], O[1] - 6, 4.5, 0.9 * pg, 0, 1.5); S.line(34, 188, O[0], O[1] - 6, 4.5, 0.9 * pg, 0, 1.5); S.line(16, 176, 32, 176, 4.5, 0.7 * pg, 0, 1.3); S.line(18, 166, 30, 166, 4.5, 0.7 * pg, 0, 1.3);
    SITE.forEach(function (s, j) {
      var m = cell(s[0], s[1]), gl = S.g(1.6 + j * 0.8, 1.4), e = S.g(2.6 + j * 0.9, 1.2), nr = S.g(3.4 + j * 0.9, 0.8), pt = function (u) { return [S.mix(O[0], m[0], u), S.mix(O[1], m[1], u) + 7 * sin(u * PI)]; };
      S.curve(function (u) { return pt(u * gl); }, 36, 0.6, 1, 1.2);
      [0.25, 0.5, 0.75].forEach(function (u) { var p = pt(u); if (gl > u) { S.dot(p[0], p[1] - 4, 0.9, 0, 1.3); S.dot(p[0] - 3, p[1] + 3, 0.9, 0, 1.2); S.dot(p[0] + 3, p[1] + 3, 0.9, 0, 1.2); S.dot(p[0], p[1] + 1, 0.8, 0, 1.2); } });
      var dy = -18 * (1 - e);
      for (k = 0; k < 6; k++) { var vv = vert(s[0], s[1], k); S.dot(vv[0], vv[1] + dy, e, 0, 2); }
      S.disc(m[0], m[1] + dy, R * 0.8, s[2], function (x, y, n) { S.dot(x, y, e * (0.55 + 0.35 * sin(t * 1.2 + n)), 0, 1.3); });
      for (var y = 0, x; y < 7; y++) for (x = 0; x < 5; x++) if (G[j + 1][y] >> (4 - x) & 1) S.dot(m[0] + (x - 2) * 2.8, m[1] - R - 16 + (y - 3) * 2.8 + 6 * (1 - nr), nr, 0, 1.4);
    });
    // the cell that is ruled out: fence posts, rails and the one accent dot
    var f = cell(FENCE[0], FENCE[1]), fg = S.g(3.8, 1);
    for (k = 0; k < 6; k++) { var a1 = vert(FENCE[0], FENCE[1], k), a2 = vert(FENCE[0], FENCE[1], (k + 1) % 6); S.line(a1[0], a1[1], a2[0], a2[1], 4.5, 0.7 * fg, 0, 1.1); S.dot(a1[0], a1[1], fg, 0, 2.2); }
    S.dot(f[0], f[1], fg, 2, 3.6 + 0.5 * sin(t * 2.4)); var rp = (t * 0.5) % 1; S.ring(f[0], f[1], 6 + rp * 14, 14, (1 - rp) * 0.8 * fg, 2, 1.1);
    // a bird circles the winner
    var w = cell(SITE[0][0], SITE[0][1]), ba = t * 0.8;
    S.bird(w[0] + 46 * cos(ba), w[1] - 40 + 11 * sin(ba), sin(t * 14), sin(ba) < 0 ? 1 : -1, S.g(5, 0.8), 0);
  };
});
