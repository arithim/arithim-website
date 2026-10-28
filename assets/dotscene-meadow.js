// Planning risk screen: a small house marks the site in a dotted meadow. Bands of cloud roll in above it, thin for low risk, thicker for
// medium and dense with falling rain for high. A wave of wind passes through the grass.
DotScene.add('meadow', function (S) {
  var sin = Math.sin, B = [{ y: 52, n: 12, R: 17, c: 3, v: 5, a: 0.55, k: 1 }, { y: 102, n: 28, R: 24, c: 4, v: 8, a: 0.6, k: 0 }, { y: 154, n: 48, R: 32, c: 4, v: 12, a: 0.9, k: 0, rain: 1 }];
  var gy = function (x) { return 252 + 8 * sin(x / 64 + 1); };
  return function (t) {
    B.forEach(function (b, bi) {
      var span = S.W + 2 * b.R + 60, gr = S.g(0.2 + bi * 0.4, 1.6);
      for (var i = 0; i < b.c; i++) {
        var px = S.wrap(i * span / b.c + 70 * bi - t * b.v, span) - b.R - 30, py = b.y + 3 * sin(t * 0.4 + i + bi);
        S.disc(px, py, b.R, b.n, function (x, y, k) { S.dot(x, py + (y - py) * 0.52, b.a * gr * (0.6 + 0.4 * sin(t * 0.9 + k)), b.k, 1.6); });
        if (b.rain) for (var j = 0; j < 5; j++) {
          var p = S.wrap(t * 0.8 + j * 0.37 + i * 0.21, 1), sx = px + (j - 2) * b.R * 0.4, y0 = py + b.R * 0.3 + p * (gy(sx) - py - b.R * 0.3 - 8);
          S.dot(sx - p * 3, y0, 0.8 * (1 - p * 0.4) * gr, 0, 1.2); S.dot(sx - p * 3 - 1, y0 - 5, 0.45 * gr, 0, 1.1);
        }
      }
    });
    [0, 17, 34].forEach(function (off, r) {
      var gap = 12 + r * 2, al = 0.5 + 0.15 * r, n = 0;
      for (var x = r * 5; x < S.W + 10; x += gap, n++) {
        var jx = x + ((n * 53 + r * 29) % 7) - 3, tall = (n + r) % 6 === 0, y = gy(x) + off + ((n * 31) % 5) - 2, w = 2.6 * sin(t * 1.4 - x / 34 + r) + 0.6 * sin(t * 2.3 + x), gg = S.g(1 + x / 300, 1.2), m = tall ? 7 : 3 + ((n * 17 + r) % 3);
        for (var k = 0; k < m; k++) S.dot(jx + w * k * k * 0.08 * gg, y - k * 3.8 * gg, al, r < 2 ? 1 : 0, 1.4);
        if (tall) { var fx = jx + w * 0.08 * m * m * gg, fy = y - m * 3.8 * gg - 2; S.ring(fx, fy, 4.4, 6, 0.9 * gg, 1, 1.5, t * 0.3); S.dot(fx, fy, gg, 0, 1.8); }
      }
    });
    var hx = 220, hy = gy(hx) + 10, g = S.g(0.8, 1.4), z = 1.35;
    S.line(hx - 15 * z, hy, hx + 15 * z, hy, 4, g, 0, 1.7); S.line(hx - 15 * z, hy, hx - 15 * z, hy - 17 * z, 4, g, 0, 1.7); S.line(hx + 15 * z, hy, hx + 15 * z, hy - 17 * z, 4, g, 0, 1.7);
    S.line(hx - 19 * z, hy - 17 * z, hx, hy - 33 * z, 4, g, 0, 1.7); S.line(hx + 19 * z, hy - 17 * z, hx, hy - 33 * z, 4, g, 0, 1.7); S.dot(hx, hy - 5, g, 1, 2.4);
    var rp = (t * 0.45) % 1, fy = hy - 62 + 2 * sin(t * 1.6); S.ring(hx, fy, 4 + rp * 14, 14, (1 - rp) * 0.8 * g, 2, 1.1); S.dot(hx, fy, g, 2, 3.6);
    [150, 292].forEach(function (x) { S.disc(x, gy(x) + 4, 8, 12, function (dx, dy) { S.dot(dx, gy(x) + 4 + (dy - gy(x) - 4) * 0.7, 0.8 * g, 0, 1.5); }); });
  };
});
