// Technical sales guide: a dotted greenhouse with three potted plants on a shelf. A small cloud with a question mark drifts in and rains
// a few drops, then the plants rise and flower in rank order with dot numerals 1 2 3. Tiny pennant tags (the countries) hang from each
// pot; one tag carries the accent dot, a registration that is running out. A bird, the salesperson, hops along the shelf.
DotScene.add('greenhouse', function (S) {
  var sin = Math.sin, cos = Math.cos, PI = 3.1416, GY = 284, PX = [130, 220, 310], FH = [78, 62, 46], FR = [9, 8, 7];
  var G = { '?': [14, 17, 1, 6, 4, 0, 4], 1: [4, 12, 4, 4, 4, 4, 14], 2: [14, 17, 1, 6, 8, 16, 31], 3: [30, 1, 1, 14, 1, 1, 30] };
  var BS = [82, 175, 265, 355, 265, 175];
  var glyph = function (ch, cx, cy, sp, a, r) {
    for (var y = 0, x; y < 7; y++) for (x = 0; x < 5; x++) if (G[ch][y] >> (4 - x) & 1) S.dot(cx + (x - 2) * sp, cy + (y - 3) * sp, a, 0, r);
  };
  return function (t) {
    var i, j, k, gf = S.g(0, 1.4), hz = 156 * gf;
    S.hill(function (x) { return GY + 4 + 3 * sin(x / 45); }, 14, 3, 0.45, 1);
    // glass house: walls, roof and floor
    S.line(50, GY, 50, GY - hz, 6, 0.55, 1, 1.4); S.line(390, GY, 390, GY - hz, 6, 0.55, 1, 1.4); S.line(50, GY, 390, GY, 6, 0.55 * gf, 1, 1.4);
    S.line(50, 128, 50 + 170 * gf, 128 - 54 * gf, 6, 0.55 * gf, 1, 1.4); S.line(390, 128, 390 - 170 * gf, 128 - 54 * gf, 6, 0.55 * gf, 1, 1.4);
    S.line(220, 74, 220, 74 + 14 * gf, 5, 0.4 * gf, 1, 1.2);
    // shelf
    S.line(60, 252, 380, 252, 5, 0.9 * gf, 0, 1.5); S.line(66, 252, 66, GY, 5, 0.6 * gf, 1, 1.4); S.line(374, 252, 374, GY, 5, 0.6 * gf, 1, 1.4);
    for (i = 0; i < 3; i++) {
      var x = PX[i], T = 3 + i * 1.3, gr = S.g(T, 1.8), sw = 2.2 * sin(t * 0.7 + i * 1.9), fg = S.g(T + 1.6, 1), fx = x + sw, fy = 230 - FH[i];
      for (k = 0; k < 5; k++) S.line(x - 14 + k * 1.2, 232 + k * 4, x + 14 - k * 1.2, 232 + k * 4, 5, 0.85, k ? 1 : 0, 1.5);
      S.curve(function (u) { return [x + sw * u * u, 230 - FH[i] * gr * u]; }, 14, 0.9, 0, 1.6);
      for (k = 0; k < 4; k++) { var u = 0.2 + k * 0.2, sx = x + sw * u * u, sy = 230 - FH[i] * gr * u, d = k % 2 ? 1 : -1; S.line(sx, sy, sx + d * 10 * gr, sy - 5 * gr, 4, 0.8, 0, 1.3); }
      S.ring(fx, fy, FR[i] * fg, 7, fg, 0, 1.7, t * 0.15); S.ring(fx, fy, (FR[i] + 5) * fg, 12, fg * 0.5, 1, 1.3, -t * 0.1); S.dot(fx, fy, fg, 1, 2.4);
      glyph(String(i + 1), fx, fy - FR[i] - 19 + 6 * (1 - S.g(T + 2.4, 0.8)), 3, S.g(T + 2.4, 0.8), 1.5);
      // country tags hanging from the shelf
      for (j = 0; j < 2; j++) {
        var tx = x - 9 + j * 18, len = 8 + j * 6 + i * 2, e = S.g(T + 2.8, 0.8), tw = 1.5 * sin(t * 1.1 + i + j * 2), hot = i === 2 && j === 1, c = hot ? 2 : 0;
        S.line(tx, 254, tx + tw * 0.4, 254 + len, 3.6, 0.6 * e, 1, 1.1);
        [[2, 0], [2, 3.4], [2, 6.8], [5.4, 3.4]].forEach(function (o) { S.dot(tx + tw + o[0], 254 + len + o[1], e * 0.9, c, hot ? 1.6 : 1.3); });
        if (hot) { var rp = (t * 0.5) % 1; S.ring(tx + tw + 3, 254 + len + 3.4, 5 + rp * 12, 12, (1 - rp) * 0.8 * e, 2, 1.1); }
      }
    }
    // the question: a cloud drifts in, sways over the plants and rains
    var cx = 220 + 85 * sin(t * 0.22 - 1) - 240 * (1 - S.g(0.2, 2.6)), cy = 34 + 2 * sin(t * 0.5), ca = S.g(0.2, 1), ri = Math.max(0, Math.min(1, 1.5 * sin(t * 0.6 - 3.2) + 0.2)) * S.g(2, 1);
    S.disc(cx - 24, cy + 6, 15, 30, function (a, b) { S.dot(a, b, 0.75 * ca, 1, 1.6); });
    S.disc(cx, cy - 4, 21, 48, function (a, b) { S.dot(a, b, 0.75 * ca, 1, 1.6); });
    S.disc(cx + 24, cy + 6, 14, 28, function (a, b) { S.dot(a, b, 0.75 * ca, 1, 1.6); });
    S.line(cx - 36, cy + 20, cx + 36, cy + 20, 4.5, 0.8 * ca, 1, 1.5); glyph('?', cx, cy + 2, 3, ca, 1.6);
    for (k = 0; k < 8; k++) { var v = S.wrap(t * 0.55 + k * 0.125, 1); S.dot(cx - 28 + k * 8 + 3 * sin(k * 5), cy + 25 + v * 150, ri * (1 - v * v), 1, 1.7); S.dot(cx - 24 + k * 7 + 3 * sin(k * 5), cy + 20 + v * 150, ri * (1 - v * v) * 0.5, 1, 1.1); }
    // the salesperson hops from tag to tag along the shelf
    var q = t / 2.4, n = Math.floor(q) % 6, a = BS[n], b = BS[(n + 1) % 6], p = Math.min(1, S.wrap(q, 1) / 0.3), bx = S.mix(a, b, p), hop = p > 0 && p < 1;
    S.bird(bx, 247 - (hop ? 11 * sin(p * PI) : 0), hop ? sin(t * 22) : null, b > a ? 1 : -1, S.g(4, 0.8), 0);
  };
});
