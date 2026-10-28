// AI model inventory: one tree per model. Steady trees carry a perched bird (approved), a bird circles the undecided one (in review),
// and one tree wilts and carries the single accent dot (flagged).
DotScene.add('grove', function (S) {
  var sin = Math.sin, cos = Math.cos, X = [58, 139, 220, 301, 382], HT = [150, 172, 136, 160, 142], ST = [0, 0, 1, 2, 0];
  var gy = function (x) { return 262 + 5 * sin(x / 50); };
  return function (t) {
    S.hill(gy, 14, 4, 0.5, 1);
    X.forEach(function (x, i) {
      var b = gy(x), st = ST[i], ph = i * 1.7, gr = S.g(0.1 + i * 0.25, 1.6), R = (40 + (i % 2) * 6) * gr, th = HT[i] * 0.5 * gr;
      var amp = st === 2 ? 1 : 3, sw = function (f) { return f * f * amp * sin(t * 0.8 + ph); };
      S.curve(function (u) { return [x + sw(u * 0.5), b - th * u]; }, 16, 0.9, 0, 1.7);
      var cx = x + sw(0.6), cy = b - th - R * 0.62, tx = x + sw(0.5), ty = b - th;
      S.line(tx, ty, cx - R * 0.55, cy + R * 0.35 + (st === 2 ? 10 : 0), 5, 0.7, 0, 1.4); S.line(tx, ty, cx + R * 0.55, cy + R * 0.35 + (st === 2 ? 10 : 0), 5, 0.7, 0, 1.4);
      S.disc(cx, cy, R, st === 2 ? 44 : 74, function (dx, dy, k, q) {
        var a = 0.5 + 0.4 * sin(t * 1.1 + k * 1.3);
        if (st === 1 && k % 3 === 0) return;
        if (st === 2) { dy = cy + (dy - cy) * 0.75 + q * 12; a *= 0.45; }
        S.dot(dx + sw(0.4) * q, dy, a, 0, 1.6);
      });
      if (st === 2) {
        [0, 0.5].forEach(function (o) { var u = (t * 0.3 + o) % 1; S.dot(cx - 16 + o * 30 + 6 * sin(u * 9), cy + 10 + u * (b - cy - 10), 0.7 * (1 - u * u) * gr, 1, 1.5); });
        S.dot(cx, cy, 1, 2, 3.6 + 0.5 * sin(t * 2.4));
        var rp = (t * 0.5) % 1; S.ring(cx, cy, 6 + rp * 14, 14, (1 - rp) * 0.8, 2, 1.1);
      } else if (st === 1) {
        S.bird(cx + 46 * cos(t * 0.8), cy - R - 12 + 8 * sin(t * 0.8), sin(t * 14), sin(t * 0.8) < 0 ? 1 : -1, gr, 0);
      } else {
        var u = S.g(1.3 + i * 0.4, 1.5), hop = (t + i * 2) % 6 < 0.35 ? 2.5 * Math.abs(sin(t * 9)) : 0, bx = cx + 8, by = cy - R * 0.92 - hop;
        if (u < 1) S.bird(S.mix(bx - 150, bx, u), S.mix(by - 70, by, u) - 30 * sin(u * 3.1416), sin(t * 16), 1, 0);
        else S.bird(bx, by, null, i % 2 ? -1 : 1, 1, 0);
      }
    });
  };
});
