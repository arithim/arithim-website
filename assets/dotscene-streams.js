// Data API and MCP: a mountain spring feeds one stream that forks into three channels, each running to a small dotted consumer (a house, a
// windmill, a second house: your own tools and AI assistants). Droplets flow down the channels and a small dotted tag trails some of them,
// the source and date each fact carries with it. One window is lit in the accent colour: a tool that is reading right now.
DotScene.add('streams', function (S) {
  var sin = Math.sin, cos = Math.cos, PI = 3.1416, F = [170, 152];
  var back = function (x) { return x < 70 ? 24 + (70 - x) * 0.55 : 24 + 150 * (1 - Math.exp(-(x - 70) / 90)) + 3 * sin(x / 17); };
  var bz = function (p, u) { var m = 1 - u, a = m * m * m, b = 3 * m * m * u, c = 3 * m * u * u, d = u * u * u; return [a * p[0] + b * p[2] + c * p[4] + d * p[6], a * p[1] + b * p[3] + c * p[5] + d * p[7]]; };
  var MAIN = [88, 62, 92, 128, 120, 152, F[0], F[1]];
  var BR = [[F[0], F[1], 205, 152, 252, 196, 256, 236], [F[0], F[1], 240, 160, 330, 182, 344, 232], [F[0], F[1], 260, 138, 396, 146, 408, 236]];
  var pos = function (b, v) { return v < 0.3 ? bz(MAIN, v / 0.3) : bz(BR[b], (v - 0.3) / 0.7); };
  var house = function (x, y, lit, t) {
    S.line(x - 16, y, x + 16, y, 5, 0.9, 0, 1.6); S.line(x - 16, y, x - 16, y - 18, 5, 0.9, 0, 1.6); S.line(x + 16, y, x + 16, y - 18, 5, 0.9, 0, 1.6);
    S.line(x - 20, y - 18, x, y - 32, 5, 0.9, 0, 1.6); S.line(x + 20, y - 18, x, y - 32, 5, 0.9, 0, 1.6);
    S.dot(x, y - 9, lit ? 1 : 0.5, lit ? 2 : 1, lit ? 3.4 + 0.5 * sin(t * 2.4) : 2.4);
  };
  return function (t) {
    var i, b, u;
    S.hill(back, 13, 2, 0.4, 1);
    S.dot(86, 56, 1, 0, 3); S.ring(86, 58, 6 + S.wrap(t * 0.6, 1) * 12, 12, 0.7 * (1 - S.wrap(t * 0.6, 1)), 0, 1.2);
    // channel beds, faint, drawn in as the water arrives
    S.curve(function (v) { return bz(MAIN, v); }, 22, 0.75 * S.g(0.2, 1), 0, 1.3);
    BR.forEach(function (p, j) { S.curve(function (v) { return bz(p, v); }, 30, 0.75 * S.g(0.8 + j * 0.3, 1), 0, 1.3); });
    // consumers: a house, a windmill, a house
    var gy = 262; house(256, gy, 1, t); house(408, gy, 0, t);
    var wg = S.g(1.4, 1.2); S.line(344, gy, 344, gy - 44 * wg, 4.5, 0.9, 0, 1.6);
    for (i = 0; i < 4; i++) { var a = t * 0.7 + 0.5 + i * PI / 2; S.line(344, gy - 44, 344 + 22 * cos(a) * wg, gy - 44 + 22 * sin(a) * wg, 5, 0.85, 0, 1.4); }
    S.dot(344, gy - 44, wg, 0, 2.6);
    // droplets with trailing source tags
    for (b = 0; b < 3; b++) for (i = 0; i < 6; i++) {
      var v = S.wrap(t * 0.09 + i / 6 + b * 0.13, 1), q = pos(b, v), e = S.g(1.0 + b * 0.4, 1) * Math.min(1, (1 - v) * 7), p = pos(b, Math.max(0, v - 0.045));
      S.dot(q[0], q[1], e, 0, 2.3);
      if (i % 2 === 0) {
        var dx = p[0] - q[0], dy = p[1] - q[1], n = Math.hypot(dx, dy) || 1, ux = dx / n, uy = dy / n, ox = p[0] - uy * 8, oy = p[1] + ux * 8;
        S.dot(q[0] - uy * 4, q[1] + ux * 4, e * 0.5, 0, 0.9);
        [0, 1, 2].forEach(function (k) { S.dot(ox + ux * 3.4 * k, oy + uy * 3.4 * k, e * 0.9, 1, 1.2); S.dot(ox + ux * 3.4 * k - uy * 3.4, oy + uy * 3.4 * k + ux * 3.4, e * 0.9, 1, 1.2); });
      }
    }
    S.bird(S.wrap(40 + t * 9, S.W + 80) - 40, 44 + 8 * sin(t * 0.6), sin(t * 12), 1, 0.7, 0);
  };
});
