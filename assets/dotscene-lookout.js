// Market watch: a dotted watchtower on a hill sends slow ripples out over the land, with a beam that sweeps like a radar. Along a telegraph wire
// beside it birds arrive one by one from the horizon and settle: each arrival is a change somebody made. One arrival carries the accent dot,
// the change that matters to you. After they settle, now and then one hops and another shuffles along the wire.
DotScene.add('lookout', function (S) {
  var sin = Math.sin, cos = Math.cos, PI = 3.1416, TX = 104, PL = [[238, 0], [326, 0], [414, 0]];
  var ground = function (x) { return 262 - 16 * Math.exp(-((x - 100) * (x - 100)) / 9000) - 6 * sin(x / 40 + 1); };
  var B = [[1, 0, 0.45], [1, 1, 0.55], [2, 0, 0.8], [1, 1, 0.85], [1, 0, 0.15], [1, 1, 0.24]];
  var wire = function (x, u, sag) { return 138 + 6 * sin(x / 50) + sag * 4 * u * (1 - u); };
  return function (t) {
    var i, k, gy = ground(TX), top = gy - 128, cy = top - 10;
    S.hill(ground, 14, 4, 0.5, 1);
    // ripples out from the cabin, upper half only, thinning as they widen
    for (k = 0; k < 4; k++) {
      var p = S.wrap(t * 0.14 + k / 4, 1), rr = 14 + p * 170;
      S.curve(function (u) { var a = PI * (1.04 + 0.92 * u); return [TX + rr * cos(a), cy + rr * 0.92 * sin(a)]; }, Math.round(8 + rr / 5), (1 - p) * 0.6 * S.g(0.2, 1), 1, 1.4);
    }
    // the sweeping beam with a fading trail
    var A = S.el < 90 ? -PI / 2 + 1.25 * sin(t * 0.7) : -PI / 2 + 0.55, dir = cos(t * 0.7) > 0 || S.el > 90 ? 1 : -1;
    for (k = 0; k < 5; k++) S.line(TX, cy, TX + 118 * cos(A - dir * k * 0.07), cy + 118 * sin(A - dir * k * 0.07), 9 + k * 4, 0.55 - k * 0.1, 0, 1.4 - k * 0.1);
    // tower: tapered legs, cross braces, cabin and a small mast
    var g = S.g(0.1, 1.2), h = 128 * g;
    S.line(TX - 20, gy, TX - 8, gy - h, 5, 0.9, 0, 1.7); S.line(TX + 20, gy, TX + 8, gy - h, 5, 0.9, 0, 1.7);
    for (i = 0; i < 4; i++) { var y1 = gy - i * 28 * g, y2 = gy - (i + 1) * 28 * g, w1 = 20 - 12 * i * 28 / 128, w2 = 20 - 12 * (i + 1) * 28 / 128; S.line(TX - w1, y1, TX + w2, y2, 6, 0.45, 0, 1.3); S.line(TX + w1, y1, TX - w2, y2, 6, 0.45, 0, 1.3); }
    S.line(TX - 14, top, TX + 14, top, 4.5, 1, 0, 1.7);
    if (g > 0.9) {
      S.line(TX - 12, top, TX - 12, top - 14, 4.5, 0.9, 0, 1.6); S.line(TX + 12, top, TX + 12, top - 14, 4.5, 0.9, 0, 1.6); S.line(TX - 16, top - 14, TX + 16, top - 14, 4.5, 0.95, 0, 1.7);
      S.line(TX - 14, top - 14, TX, top - 24, 5, 0.9, 0, 1.6); S.line(TX + 14, top - 14, TX, top - 24, 5, 0.9, 0, 1.6);
      S.dot(TX, top - 7, 0.75 + 0.25 * sin(t * 2), 1, 2.4); S.dot(TX, top - 32, 0.9, 0, 1.8);
    }
    // telegraph poles and the wire between them
    PL.forEach(function (pl, j) {
      var b = ground(pl[0]) + 2, pg = S.g(0.3 + j * 0.2, 0.8);
      S.line(pl[0], b, pl[0], b - (b - wire(pl[0], 0, 0) + 12) * pg, 4.5, 0.9, 0, 1.6); S.line(pl[0] - 8, wire(pl[0], 0, 0) - 6, pl[0] + 8, wire(pl[0], 0, 0) - 6, 4.5, 0.8 * pg, 0, 1.5);
    });
    for (i = 0; i < 2; i++) S.curve(function (u) { var x = S.mix(PL[i][0], PL[i + 1][0], u); return [x, wire(x, u, 9)]; }, 22, 0.55, 0, 1.3);
    // arrivals: each flies in from the right horizon on a lazy arc and perches at its place on the wire
    B.forEach(function (b, j) {
      var seg = b[1], u = b[2], px = S.mix(PL[seg][0], PL[seg + 1][0], u), py = wire(px, u, 9) - 4, f = S.g(1.4 + j * 1.5, 2.6), hop = f >= 1 && S.wrap(t * 0.15 + j * 0.37, 1) < 0.03 ? 3 * Math.abs(sin(t * 40)) : 0;
      var bx = S.mix(470 + j * 14, px, f), by = S.mix(60 + j * 9, py, f) - 24 * sin(f * PI);
      if (f < 1) S.bird(bx, by, sin(t * 15 + j), -1, 1, 0); else S.bird(px, py - hop, null, j % 3 ? -1 : 1, 1, 0);
      if (b[0] === 2 && f >= 1) { var q = S.g(1.4 + j * 1.5 + 2.6, 0.6); S.dot(px, py - 15, q, 2, 3.6 + 0.5 * sin(t * 2.4)); }
    });
  };
});
