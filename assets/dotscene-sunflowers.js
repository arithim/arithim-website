// Solar suitability: a field of sunflowers turns to follow the sun across the sky towards a roof. The panels on the roof brighten as the sun
// reaches them.
DotScene.add('sunflowers', function (S) {
  var sin = Math.sin, cos = Math.cos, PI = 3.1416, rows = [[268, 0.5, 52, 30, 1], [310, 1, 74, 36, 0]];
  var sunAt = function (t) { var p = PI * (0.5 + 0.28 * sin(t * 0.3)); return [214 - 190 * cos(p), 250 - 196 * sin(p)]; };
  return function (t) {
    var sun = sunAt(t), sx = sun[0], sy = sun[1], g = S.g(0.3, 1.6), i, j;
    S.curve(function (u) { var p = PI * (0.22 + 0.56 * u); return [214 - 190 * cos(p), 250 - 196 * sin(p)]; }, 36, 0.35, 1, 1.2);
    S.disc(sx, sy, 11, 30, function (x, y) { S.dot(x, y, 1, 2, 1.7); });
    S.ring(sx, sy, 19, 14, 0.75, 2, 1.4, t * 0.3);
    // the house: walls, a hipped roof and two rows of panels that glow as the sun nears
    var rf = function (u, v) { return [S.mix(S.mix(288, 322, v), S.mix(424, 390, v), u), S.mix(190, 146, v)]; };
    S.line(300, 190, 300, 234, 4, 0.8 * g, 0, 1.6); S.line(412, 190, 412, 234, 4, 0.8 * g, 0, 1.6); S.line(300, 234, 412, 234, 4, 0.5 * g, 1, 1.4);
    [[0, 0, 1, 0], [0, 1, 1, 1], [0, 0, 0, 1], [1, 0, 1, 1]].forEach(function (e) { var a = rf(e[0], e[1]), b = rf(e[2], e[3]); S.line(a[0], a[1], b[0], b[1], 4, 0.9 * g, 0, 1.6); });
    for (i = 0; i < 3; i++) for (j = 0; j < 2; j++) {
      var lit = 0.25 + 0.75 * Math.exp(-Math.pow((sx - rf((i + 0.5) / 3, 0.5)[0]) / 100, 2)) * (0.85 + 0.15 * sin(t * 2 + i));
      [[0.1, 0.1, 0.9, 0.1], [0.1, 0.9, 0.9, 0.9], [0.1, 0.1, 0.1, 0.9], [0.9, 0.1, 0.9, 0.9]].forEach(function (e) {
        var a = rf((i + e[0]) / 3, (j + e[1]) / 2), b = rf((i + e[2]) / 3, (j + e[3]) / 2); S.line(a[0], a[1], b[0], b[1], 4.5, lit * g, 0, 1.4);
      });
    }
    rows.forEach(function (r, ri) {
      var s = r[1], c = r[4];
      for (var x = r[3], k = 0; x < S.W + 20; x += r[2], k++) {
        var h = 92 * s * (0.88 + 0.2 * sin(k * 2.3 + ri)) * S.g(0.2 + ri * 0.2 + k * 0.1, 1.5), R = 13 * s, y = r[0];
        var lean = 9 * s * Math.max(-1, Math.min(1, (sx - x) / 200)), sw = 0.9 * sin(t * 1.1 + x), hx = x + lean + sw, hy = y - h, dx = sx - hx, dy = sy - hy, dd = Math.hypot(dx, dy);
        S.curve(function (u) { return [x + (lean + sw) * u * u, y - h * u]; }, Math.round(h / 5) + 2, 0.9, c, 1.5);
        [[-7, 0.38], [7, 0.58], [-6, 0.74]].forEach(function (l) { S.dot(x + l[0] * s + lean * 0.2, y - h * l[1], 0.65, 1, 2.3 * s + 0.4); S.dot(x + l[0] * s * 1.8 + lean * 0.2, y - h * l[1] - 2, 0.45, 1, 1.8 * s + 0.3); });
        S.ring(hx, hy, R * 1.45, 14, 0.9, 1, 1.7 * s + 0.2, 0.3 * k); S.ring(hx, hy, R * 1.85, 14, 0.65, 1, 1.5 * s + 0.2, 0.3 * k + 0.22);
        S.disc(hx + 0.3 * R * dx / dd, hy + 0.3 * R * dy / dd, R * 0.95, 26, function (px, py) { S.dot(px, py, 0.95, c, 1.5 * s + 0.1); });
      }
    });
  };
});
