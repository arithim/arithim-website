// Portfolio screen: an orchard of 50 small trees, one per site on a seller's list. A gust of wind runs along the rows and each tree settles into
// the state its claim earned: steady and dark (confirmed against the public record), a single accent dot in the crown (contradicted), faint
// (not verifiable), or leaning (supplied by the seller). A bird walks the rows one at a time, looking each over.
DotScene.add('orchard', function (S) {
  var sin = Math.sin, ROWS = 5, COLS = 10;
  var state = function (r, c) { var h = (r * 7 + c * 13 + r * c * 5) % 17; return (r === 1 && c === 3) || (r === 3 && c === 7) ? 1 : h < 3 ? 2 : h < 6 ? 3 : 0; };
  var back = function (x) { return 82 - 10 * sin(x / 70 + 1) - 4 * sin(x / 21); };
  return function (t) {
    var r, c, i;
    S.hill(back, 15, 3, 0.35, 1);
    S.ring(380, 42, 18, 16, 0.5, 1, 1.4, t * 0.1); S.disc(380, 42, 9, 18, function (x, y, k) { S.dot(x, y, 0.65 + 0.25 * sin(t + k), 1, 1.5); });
    var gust = S.el < 90 ? S.wrap(t * 46, 760) - 150 : -999;
    for (r = 0; r < ROWS; r++) {
      var y = 138 + r * 38, s = 0.75 + r * 0.13, row = [];
      for (c = 0; c < COLS; c++) {
        var x = 36 + c * 41 + (r % 2) * 14, st = state(r, c), u = S.g(0.3 + c * 0.15 + r * 0.1, 1.2), wind = Math.exp(-((x + r * 20 - gust) * (x + r * 20 - gust)) / 3600);
        var lean = (st === 3 ? 7 * s : 0) + (1 + 2.5 * wind) * sin(t * 1.7 + c + r) * s * 0.5 + 2 * wind * s, h = 11 * s * u, R = 12 * s * u;
        var cx = x + lean, cy = y - h - R * 0.75, tr = st === 0 || st === 1 ? 0 : 1, a = (st === 2 ? 0.45 : st === 3 ? 0.8 : 1) * (0.25 + 0.75 * u);
        S.dot(x, y + 2, 0.4, 1, 1.2);
        S.curve(function (v) { return [x + lean * v * v * 0.5, y - h * v]; }, 3, a, st === 2 ? 1 : 0, 1.5 * s);
        S.disc(cx, cy, R, 17, function (dx, dy, k, q) { S.dot(dx + 0.8 * wind * sin(t * 4 + k), dy, a * (0.7 + 0.25 * sin(t * 0.9 + k * 2 + c)), st === 2 ? 1 : 0, 1.45 * s); });
        if (st === 1) { S.dot(cx, cy - R * 0.1, u, 2, 3.4 * s + 0.4 * sin(t * 2.4 + c)); }
        if (st === 3) S.dot(x - 6 * s, y + 4, 0.35 * u, 1, 1.1);
      }
    }
    // the inspector: one row at a time, left to right, with a pause at each tree
    var T = 12, k = Math.floor(t / T) % ROWS, p = (t % T) / T, bx = S.mix(-10, 450, p), by = 138 + k * 38 - 30 - 5 * sin(p * 60);
    S.bird(bx, by, sin(t * 14), 1, 0.9, 0);
  };
});
