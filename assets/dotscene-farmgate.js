// Landowner check: a field with a farmhouse, a fence and a gate. A letter (an envelope) drifts in on the breeze and lands on the gate, then a tick
// appears above a fence post for each question the check answers (land, grid, developer, consent route, pressure terms). The last tick is the
// accent dot, the one pressure term in the letter. A bird comes in and perches on the gate post.
DotScene.add('farmgate', function (S) {
  var sin = Math.sin, cos = Math.cos, GX = 244, GY = 252, PX = [168, 202, 322, 354, 386];
  var back = function (x) { return 206 - 14 * sin(x / 70 + 0.4) - 5 * sin(x / 23); };
  var rot = function (x, y, a, px, py) { return [x + px * cos(a) - py * sin(a), y + px * sin(a) + py * cos(a)]; };
  var env = function (x, y, a, al) {
    var P = function (px, py, r) { var p = rot(x, y, a, px, py); S.dot(p[0], p[1], al, 0, r); };
    for (var i = -12; i <= 12; i += 4) { P(i, -8, 1.5); P(i, 8, 1.5); }
    for (i = -4; i <= 4; i += 4) { P(-12, i, 1.5); P(12, i, 1.5); }
    for (i = 0; i < 5; i++) P(-11 + i * 5.5, -7 + 8 * Math.min(i, 4 - i) / 2, 1.2);
  };
  var post = function (x, t, ph) {
    var y = 252 + 3 * sin(x / 40);
    S.line(x, y, x, y - 36, 4.5, 0.85, 0, 1.6);
    return y - 36;
  };
  return function (t) {
    var i, y, x;
    S.hill(back, 13, 3, 0.4, 1);
    S.ring(372, 62, 24, 20, 0.5, 1, 1.4, t * 0.1); S.disc(372, 62, 13, 26, function (x, y, k) { S.dot(x, y, 0.7 + 0.25 * sin(t + k), 1, 1.6); });
    [[40, 118, 14], [240, 92, 11]].forEach(function (c, j) { var cx = S.wrap(c[0] + t * (3 + j), S.W + 120) - 60; S.disc(cx, c[1], c[2], 18, function (dx, dy) { S.dot(dx, c[1] + (dy - c[1]) * 0.45, 0.45, 1, 1.5); }); });
    // field furrows with a slow shimmer
    for (y = 262, i = 0; y < 318; y += 9 + i, i++) for (x = (i % 2) * 7; x < 440; x += 14 + i * 1.6) S.dot(x, y, 0.18 + 0.22 * (0.5 + 0.5 * sin(t * 0.9 + x / 40 + i)), 1, 1.3);
    // farmhouse and chimney smoke
    var hx = 70, hy = back(hx) + 14;
    S.line(hx - 30, hy, hx + 30, hy, 5, 0.85, 0, 1.6); S.line(hx - 30, hy, hx - 30, hy - 26, 5, 0.85, 0, 1.6); S.line(hx + 30, hy, hx + 30, hy - 26, 5, 0.85, 0, 1.6);
    S.line(hx - 36, hy - 26, hx, hy - 50, 5, 0.9, 0, 1.7); S.line(hx + 36, hy - 26, hx, hy - 50, 5, 0.9, 0, 1.7);
    S.line(hx - 6, hy, hx - 6, hy - 16, 4.5, 0.7, 0, 1.4); S.line(hx + 6, hy, hx + 6, hy - 16, 4.5, 0.7, 0, 1.4); S.dot(hx + 18, hy - 14, 0.55 + 0.35 * sin(t * 0.7), 1, 2);
    S.line(hx + 16, hy - 40, hx + 16, hy - 52, 4, 0.8, 0, 1.5); S.line(hx + 24, hy - 36, hx + 24, hy - 52, 4, 0.8, 0, 1.5);
    for (i = 0; i < 5; i++) { var u = S.wrap(t * 0.14 + i / 5, 1); S.dot(hx + 20 + 14 * u + 5 * sin(u * 7 + i), hy - 56 - 46 * u, (1 - u) * 0.7, 1, 1.3 + u * 1.2); }
    // fence rails, posts and gate
    [[218, 232], [240, 248]].forEach(function (r) { S.line(150, r[0] + 14, GX - 30, r[0] + 14, 5, 0.6, 0, 1.4); S.line(GX + 28, r[0] + 14, 410, r[0] + 14, 5, 0.6, 0, 1.4); });
    var tops = {};
    [PX[0], PX[1], PX[2], PX[3], PX[4], GX - 30, GX + 28].forEach(function (px) { tops[px] = post(px, t, 0); });
    S.line(GX - 30, 244, GX + 28, 244, 4.5, 0.9, 0, 1.6); S.line(GX - 30, 232, GX + 28, 232, 4.5, 0.9, 0, 1.6); S.line(GX - 30, 244, GX + 28, 232, 4.5, 0.6, 0, 1.4);
    // the letter: drifts in with a wobble, then rests on the gate
    var g = S.g(0.4, 3.2), sw = 1 - g, lx = S.mix(26, GX, g) + 14 * sw * sin(t * 1.6), ly = S.mix(34, 218, g) - 30 * sin(g * 3.1416) + 8 * sw * sin(t * 2.1), la = 0.5 * sw * sin(t * 1.8) - 0.12 * g;
    env(lx, ly, la, 1);
    // one tick per answered question
    PX.forEach(function (px, k) {
      var q = S.g(3.8 + k * 0.55, 0.5), ty = tops[px] - 14 - 6 * (1 - q), c = k === 4 ? 2 : 0, r = k === 4 ? 2.2 + 0.4 * sin(t * 2.4) : 1.8;
      if (k === 4) { var rp = S.wrap(t * 0.5, 1); S.ring(px, ty + 2, 7 + rp * 10, 14, (1 - rp) * 0.7 * q, 2, 1.1); }
      S.dot(px - 5, ty, q, c, r); S.dot(px - 2, ty + 4, q, c, r); S.dot(px + 1, ty, q * 0.9, c, r); S.dot(px + 4, ty - 5, q * 0.9, c, r); S.dot(px + 7, ty - 9, q * 0.8, c, r);
    });
    // a bird arrives for the gate post and settles
    var b = S.g(3.2, 2.2), bx = S.mix(430, GX + 28, b), by = S.mix(60, tops[GX + 28] - 3, b) - 26 * sin(b * 3.1416);
    if (b < 1) S.bird(bx, by, sin(t * 16), -1, 1, 0); else S.bird(bx, by, null, -1, 1, 0);
    // grasses sway in the breeze
    [20, 118, 296, 420].forEach(function (gx, k) { for (i = 0; i < 3; i++) S.curve(function (u) { return [gx + i * 4 + 4 * u * u * sin(t * 1.1 + k + i), 272 + k % 2 * 6 - (14 + i * 3) * u]; }, 5, 0.55, 0, 1.2); });
  };
});
