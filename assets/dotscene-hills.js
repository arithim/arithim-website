// Grid pre-screen: dotted hills with pylons whose wires sway. In the foreground a gauge holds a river at 20 of a 38 unit rim (the amber buoy is
// the request), and a bird glides in the room above the water: that room is the headroom.
DotScene.add('hills', function (S) {
  var sin = Math.sin, cos = Math.cos, PX = [34, 130, 226, 322];
  var back = function (x) { return 176 - 22 * sin(x / 60 + 0.6) - 8 * sin(x / 21); };
  var tower = function (x) {
    var y = back(x), top = y - 62;
    S.line(x - 11, y, x - 3, top, 5, 0.9, 0, 1.7); S.line(x + 11, y, x + 3, top, 5, 0.9, 0, 1.7);
    S.line(x - 8, y - 15, x + 7, y - 36, 6, 0.5, 0, 1.3); S.line(x + 8, y - 15, x - 7, y - 36, 6, 0.5, 0, 1.3);
    S.line(x - 14, top + 9, x + 14, top + 9, 4.5, 0.9, 0, 1.7); S.line(x - 9, top + 24, x + 9, top + 24, 4.5, 0.9, 0, 1.7);
  };
  var wire = function (x1, y1, x2, y2, t, ph, pulse) {
    var sag = function (u) { return 11 * 4 * u * (1 - u) * (1 + 0.12 * sin(t * 1.3 + ph)) + 1.6 * sin(t * 2 + u * 7 + ph) * sin(u * 3.1416); };
    S.curve(function (u) { return [S.mix(x1, x2, u), S.mix(y1, y2, u) + sag(u)]; }, 20, 0.5, 0, 1.3);
    if (pulse) { var u = S.wrap(t * 0.22 + ph * 0.3, 1); S.dot(S.mix(x1, x2, u), S.mix(y1, y2, u) + sag(u), 1, 0, 2.6); }
  };
  return function (t) {
    S.hill(back, 13, 4, 0.45, 1);
    S.ring(388, 58, 22, 18, 0.55, 1, 1.4, t * 0.1); S.disc(388, 58, 12, 24, function (x, y, k) { S.dot(x, y, 0.7 + 0.25 * sin(t + k), 1, 1.6); });
    [[70, 46, 15], [292, 38, 12]].forEach(function (c, j) {
      var x = S.wrap(c[0] + t * (3 + j), S.W + 120) - 60;
      S.disc(x, c[1], c[2], 20, function (dx, dy) { S.dot(dx, c[1] + (dy - c[1]) * 0.45, 0.5, 1, 1.5); });
    });
    PX.forEach(function (x, i) {
      var y = back(x) - 62, ny = back(PX[i + 1] || 0) - 62;
      if (S.g(i * 0.2, 1) > 0.4) tower(x);
      if (i < 3) { wire(x + 14, y + 9, PX[i + 1] - 14, ny + 9, t, i, true); wire(x + 9, y + 24, PX[i + 1] - 9, ny + 24, t, i + 2, false); }
    });
    var g = S.g(0.5, 1.4), sx = 402, sy = back(sx) + 3;
    wire(336, back(322) - 38, sx, sy - 24, t, 5, true);
    S.line(sx - 9, sy, sx + 9, sy, 4, 0.9, 0, 1.7); S.line(sx - 9, sy, sx - 9, sy - 10, 3.5, 0.9, 0, 1.7); S.line(sx + 9, sy, sx + 9, sy - 10, 3.5, 0.9, 0, 1.7);
    S.line(sx - 12, sy - 10, sx, sy - 20, 4, 0.9, 0, 1.7); S.line(sx + 12, sy - 10, sx, sy - 20, 4, 0.9, 0, 1.7);
    var rp = (t * 0.45) % 1; S.ring(sx, sy - 34, 4 + rp * 14, 14, (1 - rp) * 0.8 * g, 2, 1.1); S.dot(sx, sy - 34 + 2 * sin(t * 1.6), g, 2, 3.4);
    // the gauge: rim at 38, river at 20
    var L = 112, R = 332, rim = 232, fl = 306, wl = fl - (fl - rim) * 20 / 38, w = S.g(1.2, 1.6), x, r, wv = function (x, r) { return wl + r * 11 + 2 * sin(x / 11 - t * 1.8 + r); };
    S.line(L, rim, L, fl, 5, 0.8 * w, 0, 1.7); S.line(R, rim, R, fl, 5, 0.8 * w, 0, 1.7); S.line(L, fl, R, fl, 6, 0.45 * w, 1, 1.4);
    for (x = L + 8; x < R - 4; x += 11) S.dot(x, rim, 0.6 * w, 1, 1.2);
    for (r = 0; r < 4; r++) for (x = L + 6 + (r % 2) * 4; x < R - 2; x += 8) S.dot(x, wv(x, r), (r ? 0.5 - r * 0.1 : 0.95) * w, r ? 1 : 0, r ? 1.3 : 1.7);
    S.dot(R - 40, wv(R - 40, 0) - 6, w, 2, 3.6);
    S.bird(222 + 66 * sin(t * 0.5), 252 + 4 * sin(t * 1.1), sin(t * 3.2), cos(t * 0.5) > 0 ? 1 : -1, w, 0);
  };
});
