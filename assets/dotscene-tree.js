// UK company check: a tree with a company at its heart, joined by swaying branches to two directors, a person with significant control and a
// controlling company. Fireflies drift between them; the one accent firefly hovers by a director, who is worth a closer look.
DotScene.add('tree', function (S) {
  var sin = Math.sin, cos = Math.cos, C = [220, 202], N = [[94, 160, 13, 0], [346, 168, 13, 0], [130, 80, 13, 0], [294, 58, 20, 1]], F = [];
  for (var i = 0; i < 20; i++) F.push([24 + (i * 97) % 392, 30 + (i * 53) % 230, 10 + (i % 5) * 5, 8 + (i % 3) * 6, 0.2 + (i % 7) * 0.05, 0.25 + (i % 4) * 0.07]);
  var gy = function (x) { return 292 + 4 * sin(x / 45); };
  return function (t) {
    S.hill(gy, 15, 3, 0.4, 1);
    var g = S.g(0.2, 1.6), bz = function (n, u) {
      var mx = (C[0] + n[0]) / 2 + 14 * sin(t * 0.7 + n[0]), my = (C[1] + n[1]) / 2 - 22, v = 1 - u;
      return [v * v * C[0] + 2 * v * u * mx + u * u * n[0], v * v * C[1] + 2 * v * u * my + u * u * n[1]];
    };
    [-2.5, 2.5].forEach(function (o) { S.curve(function (u) { return [220 + o * (1.4 - u) + 2.5 * u * u * sin(t * 0.8), gy(220) - (gy(220) - C[1]) * u]; }, 20, 0.9, 0, 1.6); });
    [[-1, 40], [1, 52], [0, 30]].forEach(function (r) { S.curve(function (u) { return [220 + r[0] * r[1] * u, gy(220) + 4 + 14 * u * (1.2 - u)]; }, 8, 0.35, 1, 1.3); });
    N.forEach(function (n, k) {
      var gn = S.g(0.6 + k * 0.3, 1.2);
      S.curve(function (u) { return bz(n, u * gn); }, 22, 0.75, 0, 1.5);
      S.curve(function (u) { var p = bz(n, u * gn), o = (Math.round(u * 28) % 2 ? 1 : -1) * 5 + sin(u * 20 + t); return [p[0] + o, p[1] + o * 0.6]; }, 28, 0.6, 1, 1.4);
      S.disc(n[0], n[1], n[2] * gn, 22 + n[3] * 24, function (x, y) { S.dot(x, y, 0.9, 0, 1.6); });
      S.ring(n[0], n[1], (n[2] + 7) * gn, 14 + n[3] * 10, 0.4 + 0.3 * sin(t * 1.2 + k), 1, 1.3, t * 0.2);
    });
    S.disc(C[0], C[1], 24 * g, 46, function (x, y, k) { S.dot(x, y, 0.5 + 0.4 * sin(t * 1.2 + k), 0, 1.7); });
    S.ring(C[0], C[1], 34 * g, 30, 0.5 + 0.4 * sin(t * 1.6), 0, 1.5, -t * 0.15);
    F.forEach(function (f, i) {
      var x = f[0] + f[2] * sin(t * f[4] + i), y = f[1] + f[3] * sin(t * f[5] + i * 2), l = Math.pow(Math.max(0, sin(t * 0.9 + i * 2.3)), 3);
      S.dot(x, y, 0.14 * l, 1, 5.5); S.dot(x, y, 0.45 + 0.55 * l, 1, 1.7);
    });
    var fx = N[1][0] + 30 * cos(t * 1.1), fy = N[1][1] - 26 + 14 * sin(t * 1.7), l = 0.6 + 0.4 * sin(t * 3);
    S.dot(fx, fy, 0.25 * l, 2, 6); S.dot(fx, fy, 1, 2, 2.8);
  };
});
