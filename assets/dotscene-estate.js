// Arithim Estate: a technology estate seen as a small city at dusk. A scan line sweeps across and the towers appear, each window a dot:
// bright where an application is in use, faint where it is hardly used. Light packets travel along the road at the foot, the feeds
// that keep the picture current. Late in the sweep one window in the tallest tower starts to flicker in the accent colour, something nobody
// registered, and a small drone drifting in the sky is ringed in the accent colour for the same reason.
DotScene.add('estate', function (S) {
  var sin = Math.sin, cos = Math.cos, W = 440, GY = 276;
  var T = [[22, 44, 104], [74, 38, 152], [120, 50, 124], [180, 40, 196], [230, 46, 142], [284, 38, 172], [330, 52, 112], [392, 34, 150]];
  var sm = function (u) { u = u < 0 ? 0 : u > 1 ? 1 : u; return u * u * (3 - 2 * u); };
  return function (t) {
    var i, j, c, r, u = S.g(0.2, 3.6), bx = -30 + u * (W + 60), rep = S.el > 90 ? -999 : S.wrap(t * 0.11, 1) * (W + 120) - 60;
    // faint stars
    for (i = 0; i < 26; i++) S.dot(S.wrap(i * 97.3, W), S.wrap(i * 53.7, 96) + 4, (0.16 + 0.14 * sin(t * 0.8 + i * 2.1)) * S.g(0.2, 1.6), 1, 1.1);
    // the road at the foot, and the light packets on it
    S.line(0, GY + 4, W, GY + 4, 7, 0.5 * S.g(0.1, 1.2), 1, 1.2);
    S.line(0, GY + 12, W, GY + 12, 11, 0.25 * S.g(0.2, 1.2), 1, 1.1);
    for (j = 0; j < 6; j++) { var px = S.wrap(t * 0.07 + j / 6, 1) * W; S.dot(px, GY + 8, 0.9 * S.g(1.6, 1), 1, 1.9); S.dot(px - 5, GY + 8, 0.4 * S.g(1.6, 1), 1, 1.4); }
    // towers
    T.forEach(function (b, ti) {
      var x0 = b[0], w = b[1], h = b[2], top = GY - h, a = sm((bx - x0 - w / 2) / 40), cols = Math.floor((w - 8) / 9), rows = Math.floor((h - 10) / 14);
      if (a <= 0) return;
      S.line(x0, GY, x0, top, 6, 0.85 * a, 0, 1.6); S.line(x0 + w, GY, x0 + w, top, 6, 0.85 * a, 0, 1.6); S.line(x0, top, x0 + w, top, 6, 0.9 * a, 0, 1.6);
      if (ti % 3 === 0) { S.line(x0 + w / 2, top, x0 + w / 2, top - 14, 4.5, 0.8 * a, 0, 1.4); S.dot(x0 + w / 2, top - 16, (0.6 + 0.4 * sin(t * 2 + ti)) * a, 1, 1.7); }
      for (c = 0; c < cols; c++) for (r = 0; r < rows; r++) {
        var hsh = (c * 7 + r * 13 + ti * 29) % 10, wx = x0 + 8 + c * 9, wy = top + 12 + r * 14, tw = 0.82 + 0.18 * sin(t * 1.3 + c * 1.7 + r * 0.9 + ti);
        var pulse = 1 + 0.5 * Math.max(0, 1 - Math.abs(wx - rep) / 26);
        if (hsh < 5) S.dot(wx, wy, 0.95 * a * tw * Math.min(1.2, pulse), 0, 1.7);
        else if (hsh < 8) S.dot(wx, wy, 0.32 * a * tw, 1, 1.5);
      }
    });
    // the unregistered window, flickering in the accent colour with a slow ring
    var f = S.g(4.2, 0.8), fx = 180 + 8 + 2 * 9, fy = GY - 196 + 12 + 3 * 14;
    if (f > 0) {
      S.dot(fx, fy, f * (0.6 + 0.4 * sin(t * 9) * sin(t * 4.3)), 2, 2.8);
      var p = S.wrap(t * 0.5, 1); S.ring(fx, fy, 4 + p * 16, 14, (1 - p) * 0.6 * f, 2, 1.3);
    }
    // a drone in the sky, found and ringed
    var dq = S.g(2.6, 1.4), dx = 318 + 46 * sin(t * 0.45), dy = 58 + 7 * cos(t * 0.8) - (1 - dq) * 30;
    if (dq > 0) {
      S.dot(dx, dy, dq, 0, 2.6); S.line(dx - 7, dy - 3, dx + 7, dy - 3, 3.5, 0.8 * dq, 0, 1.3);
      for (i = 0; i < 2; i++) S.ring(dx + (i ? 7 : -7), dy - 5, 3.2, 6, 0.55 * dq, 1, 1, t * 14 + i);
      var q = S.g(5.2, 0.8); if (q > 0) S.ring(dx, dy - 2, 14 + 1.6 * sin(t * 3), 16, 0.9 * q, 2, 1.5, t * 0.6);
    }
    // the scan line itself, while it sweeps
    if (u < 1) for (i = 0; i < 12; i++) S.dot(bx, 14 + i * 22, 0.45 * (1 - u), 2, 1.5);
  };
});
